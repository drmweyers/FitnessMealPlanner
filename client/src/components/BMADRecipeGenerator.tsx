import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Progress } from "./ui/progress";
import { useToast } from "../hooks/use-toast";
import { Checkbox } from "./ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { invalidateRecipeQueries } from "../lib/recipeQueryInvalidation";
import {
  Sparkles,
  Zap,
  CheckCircle2,
  Circle,
  Loader2,
  Image as ImageIcon,
  Database,
  Shield,
  Activity,
  Wand2,
  ChefHat,
  Target,
  Utensils,
  Clock,
} from "lucide-react";
import { z } from "zod";

const bmadGenerationSchema = z.object({
  // Recipe Generation
  count: z.number().min(1).max(100).default(10),

  // Focus Ingredient
  focusIngredient: z.string().optional(),

  // Difficulty Level
  difficultyLevel: z.string().optional(),

  // Recipe Preferences
  recipePreferences: z.string().optional(),

  // Meal Plan Parameters
  fitnessGoal: z.string().optional(),
  dailyCalorieTarget: z.number().optional(),
  days: z.number().optional(),
  mealsPerDay: z.number().optional(),
  maxIngredients: z.number().optional(),
  generateMealPrep: z.boolean().default(false),

  // Meal Types (checkboxes for multiple selection)
  mealTypes: z.array(z.string()).optional(),

  // Filter Preferences
  dietaryTag: z.string().optional(),
  maxPrepTime: z.number().optional(),

  // Maximum calories allowed per individual recipe
  maxCalories: z.number().optional(),

  // Nutrition Ranges
  minProtein: z.number().optional(),
  maxProtein: z.number().optional(),
  minCarbs: z.number().optional(),
  maxCarbs: z.number().optional(),
  minFat: z.number().optional(),
  maxFat: z.number().optional(),

  // BMAD Features
  enableImageGeneration: z.boolean().default(true),
  enableS3Upload: z.boolean().default(true),
  enableNutritionValidation: z.boolean().default(true),
});

type BMADGeneration = z.infer<typeof bmadGenerationSchema>;

interface ProgressState {
  batchId: string;
  phase: string;
  currentChunk: number;
  totalChunks: number;
  recipesCompleted: number;
  totalRecipes: number;
  imagesGenerated: number;
  estimatedTimeRemaining?: number;
  agentStatus?: {
    concept: string;
    validator: string;
    artist: string;
    coordinator: string;
    monitor: string;
    storage: string;
  };
}

interface BMADGenerationResult {
  message: string;
  batchId: string;
  count: number;
  started: boolean;
  features: {
    nutritionValidation: boolean;
    imageGeneration: boolean;
    s3Upload: boolean;
  };
}

const fitnessGoalOptions = [
  { value: "weight_loss", label: "Weight Loss" },
  { value: "muscle_gain", label: "Muscle Gain" },
  { value: "maintenance", label: "Maintenance" },
  { value: "endurance", label: "Endurance" },
];

export default function BMADRecipeGenerator() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [naturalLanguageInput, setNaturalLanguageInput] = useState("");
  const [showAdvancedForm, setShowAdvancedForm] = useState(true);
  const [isParsing, setIsParsing] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // 2026-04-23: polling fallback when SSE fails (safety net behind Cloudflare / DO proxy)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = 5;
  const reconnectDelayMs = 3000; // 3 seconds
  const pollingIntervalMs = 2000;

  const form = useForm<BMADGeneration>({
    resolver: zodResolver(bmadGenerationSchema),
    defaultValues: {
      count: 10,
      enableImageGeneration: true,
      enableS3Upload: true,
      enableNutritionValidation: true,
    },
  });

  // Check for active batch on mount and reconnect if found
  useEffect(() => {
    const activeBatchId = localStorage.getItem("bmad-active-batch");
    if (activeBatchId) {
      console.log("[BMAD] Found active batch on mount:", activeBatchId);
      setIsGenerating(true);

      // Reset reconnection attempts
      reconnectAttemptsRef.current = 0;

      // Fetch current progress first, then connect to SSE
      fetchCurrentProgress(activeBatchId).then(() => {
        connectToSSE(activeBatchId);
      });

      toast({
        title: "Reconnecting to Generation",
        description: "Resuming progress tracking for ongoing batch",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // connectToSSE, fetchCurrentProgress and toast are stable, safe to omit from deps

  // Cleanup EventSource on unmount (but DON'T clear localStorage)
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        console.log(
          "[BMAD] Component unmounting, closing SSE (server continues)",
        );
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      // Clear any pending reconnection attempts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Clear polling fallback
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      // Note: We DON'T clear localStorage here - batch may still be running
    };
  }, []);

  // Fetch current progress from API (useful for reconnection)
  const fetchCurrentProgress = async (batchId: string) => {
    try {
      const response = await fetch(`/api/admin/bmad-progress/${batchId}`, {
        credentials: "include",
      });

      if (response.ok) {
        const progressData = await response.json();
        console.log("[BMAD] Fetched current progress:", progressData);
        setProgress(progressData);

        // If generation is complete, handle it
        if (
          progressData.phase === "complete" ||
          progressData.phase === "error"
        ) {
          setIsGenerating(false);
          localStorage.removeItem("bmad-active-batch");
          // Stop polling — nothing left to poll
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        } else {
          setIsGenerating(true);
        }
      }
    } catch (error) {
      console.error("[BMAD] Failed to fetch current progress:", error);
    }
  };

  const connectToSSE = (batchId: string) => {
    // Clear any pending reconnection attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Store active batchId in localStorage for reconnection
    localStorage.setItem("bmad-active-batch", batchId);
    console.log("[BMAD] Stored active batch in localStorage:", batchId);

    // 2026-04-23: pass withCredentials so browser sends the httpOnly `token`
    // cookie set on login. Without this, EventSource sometimes drops the cookie
    // at the CDN/proxy layer and the server returns 401, triggering the
    // "SSE connection error: Event" observed in prod.
    const eventSource = new EventSource(
      `/api/admin/bmad-progress-stream/${batchId}`,
      { withCredentials: true },
    );

    // Start a 2s polling fallback in parallel. If SSE delivers updates, we
    // just overwrite with the same state. If SSE fails silently (Cloudflare
    // buffering, connection drops), polling still updates the UI.
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    pollingIntervalRef.current = setInterval(() => {
      fetchCurrentProgress(batchId);
    }, pollingIntervalMs);

    eventSource.addEventListener("connected", (event) => {
      const data = JSON.parse(event.data);
      console.log("[BMAD SSE] Connected:", data);

      // Reset reconnection attempts on successful connection
      reconnectAttemptsRef.current = 0;
      setError(null);

      // Fetch current progress to sync state
      fetchCurrentProgress(batchId);
    });

    eventSource.addEventListener("progress", (event) => {
      const progressData: ProgressState = JSON.parse(event.data);
      console.log("[BMAD SSE] Progress:", progressData);
      setProgress(progressData);
      setError(null);

      // Reset reconnection attempts on successful progress update
      reconnectAttemptsRef.current = 0;
    });

    eventSource.addEventListener("complete", (event) => {
      const result = JSON.parse(event.data);
      console.log("[BMAD SSE] Complete:", result);

      setIsGenerating(false);

      // Clear active batch from localStorage
      localStorage.removeItem("bmad-active-batch");
      console.log("[BMAD] Cleared active batch from localStorage");

      // Stop polling fallback — generation is done
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      // CRITICAL FIX: Invalidate ALL recipe queries to refresh UI
      invalidateRecipeQueries(queryClient, "BMAD-Generation-Complete");

      toast({
        title: "Generation Complete!",
        description: `Successfully generated ${result.savedRecipes?.length || 0} recipes`,
      });

      // Close SSE connection
      eventSource.close();
      eventSourceRef.current = null;
    });

    eventSource.addEventListener("error", (event: any) => {
      if (event.data) {
        const errorData = JSON.parse(event.data);
        console.error("[BMAD SSE] Error:", errorData);
        setError(errorData.error);

        toast({
          variant: "destructive",
          title: "Generation Failed",
          description: errorData.error,
        });
      }

      setIsGenerating(false);

      // Clear active batch from localStorage on error
      localStorage.removeItem("bmad-active-batch");
      console.log("[BMAD] Cleared active batch from localStorage (error)");

      eventSource.close();
      eventSourceRef.current = null;
    });

    eventSource.onerror = (error) => {
      console.error("[BMAD SSE] Connection error:", error);

      // Check if connection is in a reconnectable state
      const readyState = eventSource.readyState;
      console.log("[BMAD SSE] EventSource readyState:", readyState);

      // EventSource.CONNECTING = 0, EventSource.OPEN = 1, EventSource.CLOSED = 2
      if (readyState === EventSource.CLOSED) {
        // Connection closed - attempt to reconnect
        eventSource.close();
        eventSourceRef.current = null;

        // Only attempt reconnection if we haven't exceeded max attempts
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          console.log(
            `[BMAD SSE] Attempting to reconnect (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`,
          );

          setError(
            `Connection lost. Reconnecting... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`,
          );

          // Attempt reconnection after delay
          reconnectTimeoutRef.current = setTimeout(() => {
            connectToSSE(batchId);
          }, reconnectDelayMs);
        } else {
          // Max reconnection attempts exceeded
          console.error("[BMAD SSE] Max reconnection attempts exceeded");
          setError(
            "SSE connection lost. Please refresh the page to check progress.",
          );
          setIsGenerating(false);

          // Clear active batch from localStorage
          localStorage.removeItem("bmad-active-batch");
          console.log(
            "[BMAD] Cleared active batch from localStorage (max reconnection attempts exceeded)",
          );

          toast({
            variant: "destructive",
            title: "Connection Lost",
            description:
              "Unable to reconnect. The generation may still be running. Please refresh the page.",
          });
        }
      } else {
        // Connection is still trying to connect or is open - don't treat as fatal error yet
        console.warn(
          "[BMAD SSE] Connection error but readyState is not CLOSED, waiting...",
        );
      }
    };

    eventSourceRef.current = eventSource;
  };

  const onSubmit = async (data: BMADGeneration) => {
    setIsGenerating(true);
    setProgress(null);
    setError(null);

    try {
      // Map frontend fields to backend's expected field names
      const backendPayload = {
        ...data,
        // Backend expects dietaryRestrictions (array), we send dietaryTag (string)
        dietaryRestrictions: data.dietaryTag ? [data.dietaryTag] : undefined,
        // Backend expects targetCalories, we send dailyCalorieTarget
        targetCalories: data.dailyCalorieTarget,
        // Use focusIngredient if provided, otherwise undefined (don't use mainIngredient)
        focusIngredient: data.focusIngredient || undefined,
        mainIngredient: undefined, // Legacy field, prefer focusIngredient
      };

      const response = await fetch("/api/admin/generate-bmad", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(backendPayload),
      });

      if (!response.ok) {
        // Try to extract user-friendly error message from JSON response
        let errorMessage = `Failed to start bulk generation (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          console.error("[BMAD] Error response:", errorData);
        } catch {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result: BMADGenerationResult = await response.json();

      // Reset reconnection attempts for new generation
      reconnectAttemptsRef.current = 0;

      // Connect to SSE stream with returned batchId
      connectToSSE(result.batchId);

      toast({
        title: "Bulk Generation Started",
        description: `Generating ${result.count} recipes with AI-powered workflow`,
      });
    } catch (error) {
      setIsGenerating(false);
      setError(error instanceof Error ? error.message : "Unknown error");

      toast({
        variant: "destructive",
        title: "Failed to Start Generation",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleQuickGenerate = (count: number) => {
    // Clear all form fields first to ensure no stale values that could cause duplicate images
    // Quick generators are designed for rapid, diverse recipe generation without restrictions
    // Each count serves a specific purpose:
    // - 10: Quick test batch, fast validation
    // - 20: Medium batch for content creation
    // - 30: Standard production batch
    // - 50: Large production batch for comprehensive libraries

    form.reset({
      count: count,
      // Leave all parameters undefined to maximize variety and ensure unique recipes/images
      // This allows the AI to generate diverse recipes across all categories
      focusIngredient: undefined,
      difficultyLevel: undefined,
      recipePreferences: undefined,
      fitnessGoal: undefined, // Variety across all fitness goals
      dailyCalorieTarget: undefined,
      days: undefined,
      mealsPerDay: undefined,
      maxIngredients: undefined,
      generateMealPrep: false,
      mealTypes: undefined, // All meal types = maximum variety
      dietaryTag: undefined, // No dietary restrictions = variety
      maxPrepTime: undefined, // No time restrictions = variety
      maxCalories: undefined, // No calorie restrictions = variety
      minProtein: undefined, // No protein restrictions = variety
      maxProtein: undefined,
      minCarbs: undefined,
      maxCarbs: undefined,
      minFat: undefined,
      maxFat: undefined,
      // Enable all features for best results
      enableImageGeneration: true,
      enableS3Upload: true,
      enableNutritionValidation: true,
    });

    // Submit form immediately with clean default values
    form.handleSubmit(onSubmit)();

    const purposeDescriptions: Record<number, string> = {
      10: "Quick test batch - Fast validation and testing",
      20: "Medium batch - Content creation and variety",
      30: "Standard batch - Production-ready recipes",
      50: "Large batch - Comprehensive recipe library",
    };

    toast({
      title: "Quick Generation Started",
      description: `Generating ${count} diverse fitness-focused recipes: ${purposeDescriptions[count] || "Production batch"}`,
    });
  };

  const handleParseAI = async () => {
    // Validate input
    if (!naturalLanguageInput || naturalLanguageInput.trim().length === 0) {
      toast({
        title: "Input Required",
        description:
          "Please enter a recipe generation prompt in natural language",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsParsing(true);
      setError(null);

      // Call parse endpoint to extract parameters
      const response = await fetch("/api/admin/parse-recipe-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ prompt: naturalLanguageInput }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to parse prompt");
      }

      const result = await response.json();
      const parsedParams = result.parsedParameters || {};

      // Map parsed parameters to form fields
      // Handle count
      if (parsedParams.count) {
        form.setValue("count", parsedParams.count);
      }

      // Handle focus ingredient (prefer focusIngredient, fallback to mainIngredientTags)
      const focusIngredient =
        parsedParams.focusIngredient ||
        (parsedParams.mainIngredientTags &&
        Array.isArray(parsedParams.mainIngredientTags)
          ? parsedParams.mainIngredientTags.join(", ")
          : undefined);
      if (focusIngredient) {
        form.setValue("focusIngredient", focusIngredient);
      }

      // Handle difficulty (map 'difficulty' to 'difficultyLevel')
      if (parsedParams.difficulty) {
        form.setValue("difficultyLevel", parsedParams.difficulty);
      }

      // Handle recipe preferences/description
      if (parsedParams.description || parsedParams.recipePreferences) {
        form.setValue(
          "recipePreferences",
          parsedParams.description || parsedParams.recipePreferences,
        );
      }

      // Handle fitness goal
      if (parsedParams.fitnessGoal) {
        // Map common variations to form values
        const fitnessGoalLower = parsedParams.fitnessGoal.toLowerCase();
        const fitnessGoalMap: Record<string, string> = {
          muscle_gain: "muscle_gain",
          "muscle gain": "muscle_gain",
          "build muscle": "muscle_gain",
          "build muscles": "muscle_gain",
          "muscle building": "muscle_gain",
          "gain muscle": "muscle_gain",
          weight_loss: "weight_loss",
          "weight loss": "weight_loss",
          "lose weight": "weight_loss",
          maintenance: "maintenance",
          endurance: "endurance",
        };

        // Check for partial matches (e.g., "build muscles" contains "build")
        let mappedGoal = fitnessGoalMap[fitnessGoalLower];
        if (!mappedGoal) {
          // Try to find a partial match
          if (
            fitnessGoalLower.includes("muscle") ||
            fitnessGoalLower.includes("build") ||
            fitnessGoalLower.includes("gain")
          ) {
            mappedGoal = "muscle_gain";
          } else if (
            fitnessGoalLower.includes("weight") ||
            fitnessGoalLower.includes("lose")
          ) {
            mappedGoal = "weight_loss";
          } else {
            mappedGoal = parsedParams.fitnessGoal;
          }
        }

        form.setValue("fitnessGoal", mappedGoal);
      }

      // Handle calorie targets
      if (parsedParams.dailyCalorieTarget) {
        form.setValue("dailyCalorieTarget", parsedParams.dailyCalorieTarget);
      }
      if (parsedParams.maxCalories) {
        form.setValue("maxCalories", parsedParams.maxCalories);
      }
      if (parsedParams.minCalories) {
        // Note: form doesn't have minCalories, but we can use maxCalories as a range hint
        // This is handled by the backend
      }

      // Handle other parameters
      if (parsedParams.maxIngredients) {
        form.setValue("maxIngredients", parsedParams.maxIngredients);
      }
      if (
        parsedParams.mealTypes &&
        Array.isArray(parsedParams.mealTypes) &&
        parsedParams.mealTypes.length > 0
      ) {
        form.setValue("mealTypes", parsedParams.mealTypes);
      }
      if (
        parsedParams.dietaryTags &&
        Array.isArray(parsedParams.dietaryTags) &&
        parsedParams.dietaryTags.length > 0
      ) {
        // Map dietary tags to form values (handle both normalized and raw values)
        const dietaryTagMap: Record<string, string> = {
          high_carb: "high_carb",
          "high carb": "high_carb",
          "high-carb": "high_carb",
          "carb diet": "high_carb",
          low_carb: "low_carb",
          "low carb": "low_carb",
          "low-carb": "low_carb",
          high_protein: "high_protein",
          "high protein": "high_protein",
          "high-protein": "high_protein",
          gluten_free: "gluten_free",
          "gluten-free": "gluten_free",
          "gluten free": "gluten_free",
          dairy_free: "dairy_free",
          "dairy-free": "dairy_free",
          "dairy free": "dairy_free",
        };

        const firstTag = parsedParams.dietaryTags[0];
        const mappedTag = dietaryTagMap[firstTag.toLowerCase()] || firstTag;

        // Only set if it's a valid form value
        const validTags = [
          "vegetarian",
          "vegan",
          "keto",
          "paleo",
          "gluten_free",
          "low_carb",
          "high_carb",
          "high_protein",
          "mediterranean",
          "pescatarian",
          "dairy_free",
        ];

        if (validTags.includes(mappedTag)) {
          form.setValue("dietaryTag", mappedTag);
        } else {
          // Try to find a matching tag
          const matchingTag = validTags.find(
            (tag) =>
              firstTag.toLowerCase().includes(tag.replace("_", " ")) ||
              tag.replace("_", " ").includes(firstTag.toLowerCase()),
          );
          if (matchingTag) {
            form.setValue("dietaryTag", matchingTag);
          }
        }
      }
      if (parsedParams.maxPrepTime) {
        form.setValue("maxPrepTime", parsedParams.maxPrepTime);
      }
      if (parsedParams.minProtein) {
        form.setValue("minProtein", parsedParams.minProtein);
      }
      if (parsedParams.maxProtein) {
        form.setValue("maxProtein", parsedParams.maxProtein);
      }
      if (parsedParams.minCarbs) {
        form.setValue("minCarbs", parsedParams.minCarbs);
      }
      if (parsedParams.maxCarbs) {
        form.setValue("maxCarbs", parsedParams.maxCarbs);
      }
      if (parsedParams.minFat) {
        form.setValue("minFat", parsedParams.minFat);
      }
      if (parsedParams.maxFat) {
        form.setValue("maxFat", parsedParams.maxFat);
      }

      // Show advanced form if any advanced fields were parsed
      if (
        parsedParams.minProtein ||
        parsedParams.maxProtein ||
        parsedParams.minCarbs ||
        parsedParams.maxCarbs ||
        parsedParams.minFat ||
        parsedParams.maxFat
      ) {
        setShowAdvancedForm(true);
      }

      toast({
        title: "Form Prefilled Successfully",
        description: `Parsed ${Object.keys(parsedParams).length} parameters from your description. Review and adjust as needed, then click "Start Bulk Generation".`,
      });

      console.log("[Parse AI] Parsed parameters:", parsedParams);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");

      toast({
        variant: "destructive",
        title: "Parse Failed",
        description: error instanceof Error ? error.message : "Unknown error",
      });

      console.error("[Parse AI] Error:", error);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDirectGeneration = async () => {
    // Validate input
    if (!naturalLanguageInput || naturalLanguageInput.trim().length === 0) {
      toast({
        title: "Input Required",
        description:
          "Please enter a recipe generation prompt in natural language",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGenerating(true);
      setProgress(null);
      setError(null);

      // Parse the prompt first to get parameters
      const parseResponse = await fetch("/api/admin/parse-recipe-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ prompt: naturalLanguageInput }),
      });

      if (!parseResponse.ok) {
        const errorData = await parseResponse.json();
        throw new Error(errorData.message || "Failed to parse prompt");
      }

      const parseResult = await parseResponse.json();
      const parsedParams = parseResult.parsedParameters || {};

      // Map parsed parameters to BMAD generation options (same mapping as Parse AI)
      const focusIngredient =
        parsedParams.focusIngredient ||
        (parsedParams.mainIngredientTags &&
        Array.isArray(parsedParams.mainIngredientTags)
          ? parsedParams.mainIngredientTags.join(", ")
          : undefined);

      // Map fitness goal variations (same logic as Parse AI)
      const fitnessGoalLower = parsedParams.fitnessGoal?.toLowerCase() || "";
      const fitnessGoalMap: Record<string, string> = {
        muscle_gain: "muscle_gain",
        "muscle gain": "muscle_gain",
        "build muscle": "muscle_gain",
        "build muscles": "muscle_gain",
        "muscle building": "muscle_gain",
        "gain muscle": "muscle_gain",
        weight_loss: "weight_loss",
        "weight loss": "weight_loss",
        "lose weight": "weight_loss",
        maintenance: "maintenance",
        endurance: "endurance",
      };

      let mappedFitnessGoal = parsedParams.fitnessGoal
        ? fitnessGoalMap[fitnessGoalLower]
        : undefined;
      if (!mappedFitnessGoal && parsedParams.fitnessGoal) {
        // Try to find a partial match
        if (
          fitnessGoalLower.includes("muscle") ||
          fitnessGoalLower.includes("build") ||
          fitnessGoalLower.includes("gain")
        ) {
          mappedFitnessGoal = "muscle_gain";
        } else if (
          fitnessGoalLower.includes("weight") ||
          fitnessGoalLower.includes("lose")
        ) {
          mappedFitnessGoal = "weight_loss";
        } else {
          mappedFitnessGoal = parsedParams.fitnessGoal;
        }
      }

      const backendPayload = {
        count: parsedParams.count || 10,
        mealTypes: parsedParams.mealTypes,
        dietaryRestrictions: parsedParams.dietaryTags,
        targetCalories:
          parsedParams.dailyCalorieTarget || parsedParams.maxCalories,
        focusIngredient: focusIngredient,
        difficultyLevel: parsedParams.difficulty,
        recipePreferences:
          parsedParams.description || parsedParams.recipePreferences,
        fitnessGoal: mappedFitnessGoal,
        maxIngredients: parsedParams.maxIngredients,
        naturalLanguagePrompt: naturalLanguageInput,
        maxPrepTime: parsedParams.maxPrepTime,
        maxCalories: parsedParams.maxCalories,
        minProtein: parsedParams.minProtein,
        maxProtein: parsedParams.maxProtein,
        minCarbs: parsedParams.minCarbs,
        maxCarbs: parsedParams.maxCarbs,
        minFat: parsedParams.minFat,
        maxFat: parsedParams.maxFat,
        enableImageGeneration: true,
        enableS3Upload: true,
        enableNutritionValidation: true,
      };

      // Call BMAD generation endpoint
      const response = await fetch("/api/admin/generate-bmad", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(backendPayload),
      });

      if (!response.ok) {
        let errorMessage = `Failed to start generation (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result: BMADGenerationResult = await response.json();

      // Reset reconnection attempts for new generation
      reconnectAttemptsRef.current = 0;

      // Connect to SSE stream with returned batchId
      connectToSSE(result.batchId);

      toast({
        title: "Generation Started",
        description: `Generating ${result.count} recipes from your natural language prompt`,
      });

      console.log("[Direct Generation] Started BMAD batch:", result);
      console.log("[Direct Generation] Parsed parameters:", parsedParams);
    } catch (error) {
      setIsGenerating(false);
      setError(error instanceof Error ? error.message : "Unknown error");

      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Unknown error",
      });

      console.error("[Direct Generation] Error:", error);
    }
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case "planning":
        return <Circle className="h-4 w-4 text-blue-500" />;
      case "generating":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case "validating":
        return <Shield className="h-4 w-4 text-yellow-500" />;
      case "saving":
        return <Database className="h-4 w-4 text-green-500" />;
      case "imaging":
        return <ImageIcon className="h-4 w-4 text-orange-500" />;
      case "complete":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const getAgentStatusBadge = (status: string | undefined) => {
    if (!status) return null;

    const variant =
      status === "complete"
        ? "default"
        : status === "working"
          ? "secondary"
          : "outline";

    return (
      <Badge variant={variant} className="text-xs">
        {status}
      </Badge>
    );
  };

  const progressPercentage = progress
    ? (progress.recipesCompleted / progress.totalRecipes) * 100
    : 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-orange-600" />
          <CardTitle>Bulk Recipe Generator</CardTitle>
        </div>
        <CardDescription>
          Bulk recipe generation with AI-powered workflow, nutrition validation,
          and image generation
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* AI Natural Language Interface */}
        <Card className="mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Wand2 className="h-5 w-5" />
              AI-Powered Natural Language Generator
            </CardTitle>
            <CardDescription className="text-blue-600">
              Describe your recipe requirements in plain English and let AI
              automatically fill the form below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label
                htmlFor="natural-language"
                className="text-blue-700 font-medium"
              >
                Describe Your Recipe Requirements
              </Label>
              <Textarea
                id="natural-language"
                placeholder="Example: Generate 20 weight loss recipes with chicken, salmon, and vegetables. Target 400-500 calories each, high protein, low carb. Include breakfast, lunch, and dinner options..."
                value={naturalLanguageInput}
                onChange={(e) => setNaturalLanguageInput(e.target.value)}
                className="min-h-[100px] border-blue-200 focus:border-blue-400 resize-none"
                disabled={isGenerating}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={handleParseAI}
                  disabled={
                    !naturalLanguageInput.trim() || isGenerating || isParsing
                  }
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Parsing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Parse with AI
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={handleDirectGeneration}
                  disabled={!naturalLanguageInput.trim() || isGenerating}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate Directly
                </Button>
              </div>
              <div className="flex gap-3">
                {showAdvancedForm && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAdvancedForm(false)}
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    Hide Advanced Form
                  </Button>
                )}
                {!showAdvancedForm && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAdvancedForm(true)}
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    Show Advanced Form
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Bulk Generation */}
        <Card className="mb-6 border-orange-200 bg-gradient-to-r from-orange-50 to-pink-50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Zap className="h-5 w-5" />
              Quick Bulk Generation
            </CardTitle>
            <CardDescription className="text-orange-600">
              Generate multiple recipes quickly with default fitness-focused
              parameters.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { count: 10, label: "Quick Test", desc: "Fast validation" },
                { count: 20, label: "Medium Batch", desc: "Content creation" },
                {
                  count: 30,
                  label: "Standard Batch",
                  desc: "Production ready",
                },
                { count: 50, label: "Large Batch", desc: "Full library" },
              ].map(({ count, label, desc }) => (
                <Button
                  key={count}
                  variant="outline"
                  onClick={() => handleQuickGenerate(count)}
                  disabled={isGenerating}
                  className="h-24 flex flex-col items-center justify-center border-orange-300 hover:bg-orange-100 hover:border-orange-400 transition-all"
                >
                  <span className="text-2xl font-bold text-orange-700">
                    {count}
                  </span>
                  <span className="text-xs font-medium text-orange-600">
                    {label}
                  </span>
                  <span className="text-[10px] text-orange-500 mt-0.5">
                    {desc}
                  </span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {showAdvancedForm && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Recipe Count */}
              <FormField
                control={form.control}
                name="count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Number of Recipes
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value))
                        }
                        disabled={isGenerating}
                      />
                    </FormControl>
                    <FormDescription>
                      Generate 1-100 recipes in a single batch
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Focus Ingredient */}
              <FormField
                control={form.control}
                name="focusIngredient"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <ChefHat className="h-4 w-4" />
                      Focus Ingredient (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="e.g., chicken, salmon, tofu"
                        {...field}
                        disabled={isGenerating}
                      />
                    </FormControl>
                    <FormDescription>
                      Main ingredient to feature in recipes
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Difficulty Level */}
              <FormField
                control={form.control}
                name="difficultyLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Difficulty Level (Optional)
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isGenerating}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Any Difficulty" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="any">Any Difficulty</SelectItem>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Recipe complexity and cooking skill required
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Recipe Preferences */}
              <FormField
                control={form.control}
                name="recipePreferences"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Wand2 className="h-4 w-4" />
                      Recipe Preferences (Optional)
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., quick meals, family-friendly, budget-conscious, one-pot dishes"
                        {...field}
                        disabled={isGenerating}
                        className="min-h-[80px]"
                      />
                    </FormControl>
                    <FormDescription>
                      Additional preferences or requirements for recipe
                      generation
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Fitness Goal */}
              <FormField
                control={form.control}
                name="fitnessGoal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Fitness Goal (Optional)
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isGenerating}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select fitness goal" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {fitnessGoalOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Maximum Number of Ingredients */}
              <FormField
                control={form.control}
                name="maxIngredients"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <ChefHat className="h-4 w-4" />
                      Maximum Number of Ingredients (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 20"
                        min={5}
                        max={50}
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          )
                        }
                        disabled={isGenerating}
                      />
                    </FormControl>
                    <FormDescription>
                      Limit total ingredient variety to simplify shopping
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Meal Prep Options */}
              <FormField
                control={form.control}
                name="generateMealPrep"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isGenerating}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Generate Start-of-Week Meal Prep Instructions
                      </FormLabel>
                      <FormDescription>
                        Include bulk preparation and storage guidance
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <Separator />

              {/* Filter Preferences Section */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  Filter Preferences
                </Label>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Meal Type - moved from checkboxes to here */}
                  <FormField
                    control={form.control}
                    name="mealTypes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meal Type</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            if (value === "all") {
                              field.onChange([]);
                            } else {
                              field.onChange([value]);
                            }
                          }}
                          value={field.value?.[0] || "all"}
                          disabled={isGenerating}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="All Meals" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="all">All Meals</SelectItem>
                            <SelectItem value="breakfast">Breakfast</SelectItem>
                            <SelectItem value="lunch">Lunch</SelectItem>
                            <SelectItem value="dinner">Dinner</SelectItem>
                            <SelectItem value="snack">Snack</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Dietary Focus */}
                  <FormField
                    control={form.control}
                    name="dietaryTag"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dietary Focus</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || "all"}
                          disabled={isGenerating}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="All Diets" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="all">All Diets</SelectItem>
                            <SelectItem value="vegetarian">
                              Vegetarian
                            </SelectItem>
                            <SelectItem value="vegan">Vegan</SelectItem>
                            <SelectItem value="keto">Keto</SelectItem>
                            <SelectItem value="paleo">Paleo</SelectItem>
                            <SelectItem value="gluten_free">
                              Gluten Free
                            </SelectItem>
                            <SelectItem value="low_carb">Low Carb</SelectItem>
                            <SelectItem value="high_carb">High Carb</SelectItem>
                            <SelectItem value="high_protein">
                              High Protein
                            </SelectItem>
                            <SelectItem value="mediterranean">
                              Mediterranean
                            </SelectItem>
                            <SelectItem value="pescatarian">
                              Pescatarian
                            </SelectItem>
                            <SelectItem value="dairy_free">
                              Dairy Free
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Max Prep Time */}
                  <FormField
                    control={form.control}
                    name="maxPrepTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Prep Time</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(
                              value === "any" ? undefined : parseInt(value),
                            )
                          }
                          value={field.value?.toString() || "any"}
                          disabled={isGenerating}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Any Time" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="any">Any Time</SelectItem>
                            <SelectItem value="15">15 min</SelectItem>
                            <SelectItem value="30">30 min</SelectItem>
                            <SelectItem value="45">45 min</SelectItem>
                            <SelectItem value="60">60 min</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Max Calories */}
                  <FormField
                    control={form.control}
                    name="maxCalories"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Calories</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(
                              value === "any" ? undefined : parseInt(value),
                            )
                          }
                          value={field.value?.toString() || "any"}
                          disabled={isGenerating}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Any Amount" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="any">Any Amount</SelectItem>
                            <SelectItem value="300">300 cal</SelectItem>
                            <SelectItem value="500">500 cal</SelectItem>
                            <SelectItem value="700">700 cal</SelectItem>
                            <SelectItem value="1000">1000 cal</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Nutrition Ranges Section */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  Nutrition Ranges (Optional)
                </Label>

                {/* Protein Range */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Protein (g)</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="minProtein"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Min</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="e.g., 20"
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value
                                    ? parseInt(e.target.value)
                                    : undefined,
                                )
                              }
                              disabled={isGenerating}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="maxProtein"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Max</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="e.g., 40"
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value
                                    ? parseInt(e.target.value)
                                    : undefined,
                                )
                              }
                              disabled={isGenerating}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Carbs Range */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Carbohydrates (g)
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="minCarbs"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Min</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="e.g., 30"
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value
                                    ? parseInt(e.target.value)
                                    : undefined,
                                )
                              }
                              disabled={isGenerating}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="maxCarbs"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Max</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="e.g., 60"
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value
                                    ? parseInt(e.target.value)
                                    : undefined,
                                )
                              }
                              disabled={isGenerating}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Fat Range */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Fat (g)</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="minFat"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Min</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="e.g., 10"
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value
                                    ? parseInt(e.target.value)
                                    : undefined,
                                )
                              }
                              disabled={isGenerating}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="maxFat"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Max</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="e.g., 25"
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value
                                    ? parseInt(e.target.value)
                                    : undefined,
                                )
                              }
                              disabled={isGenerating}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Feature Toggles */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Features</Label>

                <FormField
                  control={form.control}
                  name="enableImageGeneration"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isGenerating}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Generate Images (DALL-E 3)</FormLabel>
                        <FormDescription>
                          Create unique AI-generated images for each recipe
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="enableS3Upload"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isGenerating}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Upload to S3 Storage</FormLabel>
                        <FormDescription>
                          Upload images to DigitalOcean Spaces for permanent
                          storage
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="enableNutritionValidation"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isGenerating}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Nutrition Validation</FormLabel>
                        <FormDescription>
                          Validate and auto-fix nutritional data
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Recipes...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Start Bulk Generation
                  </>
                )}
              </Button>
            </form>
          </Form>
        )}

        {/* Progress Display */}
        {(isGenerating || progress) && (
          <div className="mt-6 space-y-4">
            <Separator />

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getPhaseIcon(progress?.phase || "planning")}
                  <span className="text-sm font-medium capitalize">
                    {progress?.phase || "Initializing"}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {progress
                    ? `${progress.recipesCompleted}/${progress.totalRecipes}`
                    : "0/0"}{" "}
                  recipes
                </span>
              </div>

              <Progress value={progressPercentage} className="h-2" />

              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {progress
                    ? `Chunk ${progress.currentChunk}/${progress.totalChunks}`
                    : "Starting..."}
                </span>
                {progress?.estimatedTimeRemaining && (
                  <span>
                    ~{Math.round(progress.estimatedTimeRemaining / 1000)}s
                    remaining
                  </span>
                )}
              </div>
            </div>

            {/* Agent Status */}
            {progress?.agentStatus && (
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Concept Agent:</span>
                  {getAgentStatusBadge(progress.agentStatus.concept)}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Validator:</span>
                  {getAgentStatusBadge(progress.agentStatus.validator)}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Image Artist:</span>
                  {getAgentStatusBadge(progress.agentStatus.artist)}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Storage:</span>
                  {getAgentStatusBadge(progress.agentStatus.storage)}
                </div>
              </div>
            )}

            {/* Images Generated */}
            {progress && progress.imagesGenerated > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <ImageIcon className="h-4 w-4 text-orange-500" />
                <span>{progress.imagesGenerated} images generated</span>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive rounded-md">
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
