import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { useToast } from "../hooks/use-toast";
import { createCacheManager } from "../lib/cacheUtils";
import { invalidateRecipeQueries } from "../lib/recipeQueryInvalidation";
import { Sparkles, Database, Target, Zap, Clock, ChevronUp, ChevronDown, Wand2, CheckCircle, Circle } from "lucide-react";
import { z } from "zod";
import { Textarea } from "./ui/textarea";

const adminRecipeGenerationSchema = z.object({
  count: z.number().min(1).max(50).default(10),
  mealType: z.string().optional(),
  dietaryTag: z.string().optional(),
  maxPrepTime: z.number().optional(),
  maxCalories: z.number().optional(),
  minCalories: z.number().optional(),
  minProtein: z.number().optional(),
  maxProtein: z.number().optional(),
  minCarbs: z.number().optional(),
  maxCarbs: z.number().optional(),
  minFat: z.number().optional(),
  maxFat: z.number().optional(),
  focusIngredient: z.string().optional(),
  difficulty: z.string().optional(),
});

type AdminRecipeGeneration = z.infer<typeof adminRecipeGenerationSchema>;

interface GenerationResult {
  message: string;
  count: number;
  started: boolean;
  success: number;
  failed: number;
  errors: string[];
  metrics?: {
    totalDuration: number;
    averageTimePerRecipe: number;
  };
}

export default function AdminRecipeGenerator() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const cacheManager = createCacheManager(queryClient);
  const [lastGeneration, setLastGeneration] = useState<GenerationResult | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false); // Always start expanded
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>("");
  const [naturalLanguageInput, setNaturalLanguageInput] = useState<string>("");
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [_currentRecipe, setCurrentRecipe] = useState<string>("");
  const [_recipesCompleted, setRecipesCompleted] = useState<number>(0);
  const [_recipesFailed, setRecipesFailed] = useState<number>(0);
  const [_totalRecipes, setTotalRecipes] = useState<number>(0);
  const [statusSteps, setStatusSteps] = useState<Array<{text: string; completed: boolean}>>([
    { text: "Initializing AI models...", completed: false },
    { text: "Generating recipe concepts...", completed: false },
    { text: "Calculating nutritional data...", completed: false },
    { text: "Validating recipes...", completed: false },
    { text: "Saving to database...", completed: false }
  ]);

  // EventSource ref for SSE connection
  const eventSourceRef = useRef<EventSource | null>(null);
  const currentJobIdRef = useRef<string | null>(null);

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  // Connect to SSE for real-time progress updates
  const connectToProgressStream = (jobId: string) => {
    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    currentJobIdRef.current = jobId;

    // Store jobId in localStorage for reconnection
    localStorage.setItem('currentJobId', jobId);
    localStorage.setItem('jobStartTime', Date.now().toString());

    console.log(`[SSE] Connecting to BMAD progress stream for batch ${jobId}`);

    const eventSource = new EventSource(`/api/admin/bmad-progress-stream/${jobId}`);
    eventSourceRef.current = eventSource;

    // 🔧 FIX: Listen for typed 'progress' events, not just default messages
    eventSource.addEventListener('progress', (event) => {
      try {
        const progress = JSON.parse(event.data);
        console.log('[SSE] Progress update:', progress);

        // Update UI based on progress data
        if (progress.error) {
          console.error('[SSE] Error in progress:', progress.error);
          setIsGenerating(false);
          toast({
            title: "Generation Error",
            description: progress.error,
            variant: "destructive",
          });
          eventSource.close();
          return;
        }

        // 🎯 UX FIX: Handle validation warnings
        if (progress.warning) {
          console.warn('[SSE] Validation warning:', progress.warning);
          toast({
            title: "⚠️ Validation Issue",
            description: progress.warning,
            variant: "destructive",
            duration: 10000, // Show for 10 seconds so user can read
          });
        }

        // Update progress percentage
        setProgressPercentage(progress.percentage || 0);

        // Update step progress
        const stepMap: Record<string, number> = {
          'starting': 0,
          'generating': 1,
          'validating': 2,
          'images': 3,
          'storing': 3,
          'complete': 4,
          'failed': 4
        };

        const currentStepIndex = stepMap[progress.currentStep] || 0;
        setStatusSteps(steps => steps.map((step, i) => ({
          ...step,
          completed: i <= currentStepIndex
        })));

        // Update current recipe name
        if (progress.currentRecipeName) {
          setCurrentRecipe(progress.currentRecipeName);
        }

        // Update counts
        setRecipesCompleted(progress.completed || 0);
        setRecipesFailed(progress.failed || 0);
        setTotalRecipes(progress.totalRecipes || 0);

        // Update progress message
        const stepNames: Record<string, string> = {
          'starting': 'Initializing...',
          'generating': 'Generating recipes with AI...',
          'validating': 'Validating recipe data...',
          'images': 'Generating recipe images...',
          'storing': 'Saving to database...',
          'complete': 'Generation complete!',
          'failed': 'Generation failed'
        };
        setGenerationProgress(stepNames[progress.currentStep] || progress.currentStep);

        // Handle completion
        if (progress.currentStep === 'complete' || progress.currentStep === 'failed') {
          setIsGenerating(false);
          setProgressPercentage(100);

          // Clear localStorage
          localStorage.removeItem('currentJobId');
          localStorage.removeItem('jobStartTime');

          // Show completion toast
          if (progress.currentStep === 'complete') {
            // 🎯 UX FIX: Show warnings if any recipes failed
            if (progress.failed > 0 && progress.errors && progress.errors.length > 0) {
              toast({
                title: `⚠️ ${progress.completed} Recipes Generated (${progress.failed} Failed)`,
                description: progress.errors[0], // Show first error
                variant: "default",
                duration: 10000,
              });
            } else {
              toast({
                title: "Generation Complete",
                description: `Successfully generated ${progress.completed} recipes`,
              });
            }

            // CRITICAL FIX: Invalidate ALL recipe queries to refresh UI
            invalidateRecipeQueries(queryClient, 'AdminRecipe-Generation-Complete');
          } else {
            // 🎯 UX FIX: Show detailed error message
            const errorMessage = progress.errors && progress.errors.length > 0 
              ? progress.errors[0] 
              : `Failed after ${progress.completed} recipes`;
            
            toast({
              title: "❌ Generation Failed",
              description: errorMessage,
              variant: "destructive",
              duration: 15000, // 15 seconds to read error
            });
          }

          // Close the EventSource
          eventSource.close();
          eventSourceRef.current = null;
        }
      } catch (error) {
        console.error('[SSE] Failed to parse progress update:', error);
      }
    });

    // 🔧 FIX: Listen for 'error' events
    eventSource.addEventListener('error', (event: any) => {
      try {
        if (event.data) {
          const errorData = JSON.parse(event.data);
          console.error('[SSE] Error event:', errorData);
          setIsGenerating(false);
          toast({
            title: "Generation Error",
            description: errorData.error || "An error occurred",
            variant: "destructive",
            duration: 15000,
          });
          eventSource.close();
          eventSourceRef.current = null;
        }
      } catch (e) {
        console.error('[SSE] Failed to parse error event:', e);
      }
    });

    // 🔧 FIX: Listen for 'complete' events
    eventSource.addEventListener('complete', (event: any) => {
      try {
        const result = JSON.parse(event.data);
        console.log('[SSE] Complete event:', result);
        setIsGenerating(false);
        setProgressPercentage(100);
        
        toast({
          title: "Generation Complete",
          description: `Generated ${result.totalRecipes || 0} recipes`,
        });
        
        invalidateRecipeQueries(queryClient, 'AdminRecipe-Generation-Complete');
        eventSource.close();
        eventSourceRef.current = null;
      } catch (e) {
        console.error('[SSE] Failed to parse complete event:', e);
      }
    });

    // 🔧 FIX: Listen for 'connected' events
    eventSource.addEventListener('connected', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Connected:', data);
      } catch (e) {
        console.error('[SSE] Failed to parse connected event:', e);
      }
    });

    // Handle connection errors
    eventSource.onerror = (error) => {
      console.error('[SSE] Connection error:', error);
      setIsGenerating(false);
      eventSource.close();
      eventSourceRef.current = null;

      toast({
        title: "Connection Lost",
        description: "Lost connection to progress updates. Refresh to see final results.",
        variant: "destructive",
      });
    };
  };

  // Check for existing job in localStorage on mount
  useEffect(() => {
    const storedJobId = localStorage.getItem('currentJobId');
    const jobStartTime = localStorage.getItem('jobStartTime');

    if (storedJobId && jobStartTime) {
      const elapsed = Date.now() - parseInt(jobStartTime);
      // Only reconnect if less than 5 minutes old
      if (elapsed < 5 * 60 * 1000) {
        console.log('[SSE] Reconnecting to existing job:', storedJobId);
        setIsGenerating(true);
        connectToProgressStream(storedJobId);
      } else {
        // Job too old, clear it
        localStorage.removeItem('currentJobId');
        localStorage.removeItem('jobStartTime');
      }
    }
  }, []);

  const form = useForm<AdminRecipeGeneration>({
    resolver: zodResolver(adminRecipeGenerationSchema),
    defaultValues: {
      count: 10,
    },
  });

  const generateRecipes = useMutation({
    mutationFn: async (data: AdminRecipeGeneration): Promise<GenerationResult> => {
      // Transform request to BMAD format
      const bmadRequest = {
        count: data.count,
        mealTypes: data.mealType ? [data.mealType] : undefined,
        dietaryTags: data.dietaryTag ? [data.dietaryTag] : undefined,
        fitnessGoals: ['muscle_gain'], // Default fitness goal
        maxPrepTime: data.maxPrepTime,
        maxCalories: data.maxCalories,
        minCalories: data.minCalories,
        minProtein: data.minProtein,
        maxProtein: data.maxProtein,
        minCarbs: data.minCarbs,
        maxCarbs: data.maxCarbs,
        minFat: data.minFat,
        maxFat: data.maxFat,
        difficulty: data.difficulty,
        enableImageGeneration: true,  // CRITICAL: Enable AI image generation
        enableS3Upload: true,          // CRITICAL: Enable S3 upload for permanent images
      };

      const response = await fetch('/api/admin/generate-bmad', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(bmadRequest),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start recipe generation');
      }

      return response.json();
    },
    onSuccess: (data: any) => {
      setLastGeneration(data);
      setIsGenerating(true);
      setProgressPercentage(0);
      setTotalRecipes(data.count || 0);

      // Reset status steps
      setStatusSteps(steps => steps.map(step => ({ ...step, completed: false })));

      toast({
        title: "Recipe Generation Started",
        description: `${data.message} - Generating ${data.count || 0} recipes...`,
      });

      // Use smart cache management for recipe generation
      cacheManager.handleRecipeGeneration(data.count || 0);

      // Connect to SSE for real-time progress (BMAD uses batchId)
      if (data.batchId) {
        console.log('[BMAD Recipe Generation] Connecting to SSE with batchId:', data.batchId);
        connectToProgressStream(data.batchId);
      } else {
        console.warn('[BMAD Recipe Generation] No batchId received, cannot track progress');
        // Fallback: show generic progress message
        setGenerationProgress("Recipe generation in progress...");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkGenerate = useMutation({
    mutationFn: async (count: number): Promise<GenerationResult> => {
      const response = await fetch('/api/admin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start bulk generation');
      }

      return response.json();
    },
    onSuccess: (data: GenerationResult) => {
      setLastGeneration(data);
      toast({
        title: "Bulk Generation Started",
        description: data.message,
      });

      // Use smart cache management for bulk generation
      cacheManager.handleRecipeGeneration(data.count);
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

    const parseNaturalLanguage = useMutation({
        mutationFn: async (input: string) => {
            console.log('[Parse Button] Starting natural language parsing...');
            console.log('[Parse Button] Input:', input);

            // Call real parsing endpoint (Fix #6)
            const response = await fetch('/api/admin/parse-recipe-prompt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ prompt: input }),
            });

            console.log('[Parse Button] Response status:', response.status);

            if (!response.ok) {
                const error = await response.json();
                console.error('[Parse Button] Error response:', error);
                throw new Error(error.message || error.error || 'Failed to parse natural language prompt');
            }

            const data = await response.json();
            console.log('[Parse Button] Success response:', data);
            return data;
        },
        onSuccess: (data) => {
            console.log('[Parse Button] Mutation success, populating form fields...');
            const params = data.parsedParameters;
            console.log('[Parse Button] Parsed parameters:', params);

            let fieldsPopulated = 0;

            // Map parsed parameters to form fields
            if (params.count) {
                form.setValue("count", params.count);
                fieldsPopulated++;
                console.log('[Parse Button] Set count:', params.count);
            }
            if (params.mealTypes && params.mealTypes[0]) {
                form.setValue("mealType", params.mealTypes[0]);
                fieldsPopulated++;
                console.log('[Parse Button] Set mealType:', params.mealTypes[0]);
            }
            if (params.dietaryTags && params.dietaryTags[0]) {
                form.setValue("dietaryTag", params.dietaryTags[0]);
                fieldsPopulated++;
                console.log('[Parse Button] Set dietaryTag:', params.dietaryTags[0]);
            }
            if (params.maxPrepTime) {
                form.setValue("maxPrepTime", params.maxPrepTime);
                fieldsPopulated++;
                console.log('[Parse Button] Set maxPrepTime:', params.maxPrepTime);
            }
            if (params.maxCalories) {
                form.setValue("maxCalories", params.maxCalories);
                fieldsPopulated++;
                console.log('[Parse Button] Set maxCalories:', params.maxCalories);
            }
            if (params.minProtein) {
                form.setValue("minProtein", params.minProtein);
                fieldsPopulated++;
                console.log('[Parse Button] Set minProtein:', params.minProtein);
            }
            if (params.maxProtein) {
                form.setValue("maxProtein", params.maxProtein);
                fieldsPopulated++;
                console.log('[Parse Button] Set maxProtein:', params.maxProtein);
            }
            if (params.minCarbs) {
                form.setValue("minCarbs", params.minCarbs);
                fieldsPopulated++;
                console.log('[Parse Button] Set minCarbs:', params.minCarbs);
            }
            if (params.maxCarbs) {
                form.setValue("maxCarbs", params.maxCarbs);
                fieldsPopulated++;
                console.log('[Parse Button] Set maxCarbs:', params.maxCarbs);
            }
            if (params.minFat) {
                form.setValue("minFat", params.minFat);
                fieldsPopulated++;
                console.log('[Parse Button] Set minFat:', params.minFat);
            }
            if (params.maxFat) {
                form.setValue("maxFat", params.maxFat);
                fieldsPopulated++;
                console.log('[Parse Button] Set maxFat:', params.maxFat);
            }

            console.log(`[Parse Button] ✅ Successfully populated ${fieldsPopulated} form fields`);

            toast({
                title: "AI Parsing Complete",
                description: `Automatically populated ${fieldsPopulated} form fields from your prompt.`,
            });
        },
        onError: (error: Error) => {
            console.error('[Parse Button] Mutation error:', error);
            console.error('[Parse Button] Error message:', error.message);
            console.error('[Parse Button] Error stack:', error.stack);

            toast({
                title: "Parsing Failed",
                description: error.message || "Failed to parse prompt. Check console for details.",
                variant: "destructive",
            });
        },
    });

    const handleNaturalLanguageParse = () => {
        // Show immediate feedback to user
        toast({
            title: "🤖 AI Parser Working...",
            description: "Analyzing your prompt with AI. This may take a few seconds.",
        });

        parseNaturalLanguage.mutate(naturalLanguageInput);
    };

    const handleDirectGeneration = async () => {
        // Validate input
        if (!naturalLanguageInput || naturalLanguageInput.trim().length === 0) {
            toast({
                title: "Input Required",
                description: "Please enter a recipe generation prompt in natural language",
                variant: "destructive",
            });
            return;
        }

        try {
            setIsGenerating(true);
            setProgressPercentage(0);
            setGenerationProgress("Parsing natural language prompt...");

            // Reset status steps
            setStatusSteps(steps => steps.map(step => ({ ...step, completed: false })));

            // Call RECIPE generation endpoint (Fix #6)
            const response = await fetch('/api/admin/generate-recipes-from-prompt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ prompt: naturalLanguageInput }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to start natural language generation');
            }

            const result = await response.json();

            toast({
                title: "Natural Language Generation Started",
                description: `Generating ${result.count || 10} recipes from your prompt with real-time progress tracking.`,
            });

            // Connect to SSE for real-time progress
            if (result.jobId) {
                console.log('[Natural Language Generation] Connecting to SSE with jobId:', result.jobId);
                connectToProgressStream(result.jobId);
            }

            console.log('[Natural Language Generation] Started recipe generation:', result);
            console.log('[Natural Language Generation] Parsed parameters:', result.parsedParameters);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            toast({
                title: "Generation Failed",
                description: errorMessage,
                variant: "destructive",
            });
            console.error('[Natural Language Generation] Error:', error);
            setIsGenerating(false);
        }
    };

  const onSubmit = (data: AdminRecipeGeneration) => {
    generateRecipes.mutate(data);
  };

  const _handleBulkGenerate = (count: number) => {
    bulkGenerate.mutate(count);
  };

  const handleRefreshStats = () => {
    // Force immediate refresh of all recipe data
    queryClient.refetchQueries({ predicate: (query) => query.queryKey[0] === '/api/recipes' });
    queryClient.refetchQueries({ predicate: (query) => query.queryKey[0] === '/api/admin/stats' });
    toast({
      title: "Recipes Refreshed",
      description: "Recipe database has been updated with new recipes",
    });
  };

  const handleRefreshPendingRecipes = () => {
    // Force immediate refresh of pending recipes list
    queryClient.refetchQueries({ predicate: (query) => query.queryKey[0] === '/api/admin/recipes' });
    queryClient.refetchQueries({ predicate: (query) => query.queryKey[0] === '/api/admin/stats' });
    toast({
      title: "Pending Recipes Refreshed",
      description: "Pending recipe list has been updated",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <CardTitle>AI Recipe Generator</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 w-8 p-0"
            >
              {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
          {!isCollapsed && (
            <CardDescription>
              Generate custom recipes using AI based on specific dietary requirements and nutritional targets.
            </CardDescription>
          )}
        </CardHeader>
        {!isCollapsed && (
          <CardContent>
            {/* Natural Language AI Interface */}
            <Card className="mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <Wand2 className="h-5 w-5" />
                  AI-Powered Natural Language Generator
                </CardTitle>
                <CardDescription className="text-blue-600">
                  Describe your recipe generation requirements in plain English and let AI automatically fill the form below.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label htmlFor="natural-language" className="text-blue-700 font-medium">
                    Describe Your Recipe Generation Requirements
                  </Label>
                  <Textarea
                    id="natural-language"
                    placeholder="Example: Generate 15 high-protein breakfast recipes under 20 minutes prep time, focusing on eggs and Greek yogurt, suitable for keto diet, with 400-600 calories per serving..."
                    value={naturalLanguageInput}
                    onChange={(e) => setNaturalLanguageInput(e.target.value)}
                    className="min-h-[100px] border-blue-200 focus:border-blue-400"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={handleDirectGeneration}
                    disabled={generateRecipes.isPending || isGenerating || !naturalLanguageInput.trim()}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {generateRecipes.isPending || isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Generate Directly
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              {/* Generation Settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Number of Recipes
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="50"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>Generate 1-50 recipes per batch</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="focusIngredient"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Focus Ingredient</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., chicken, salmon, quinoa" {...field} />
                      </FormControl>
                      <FormDescription>Optional main ingredient to focus on</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="difficulty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Difficulty Level</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value || 'all'}
                          onValueChange={(value) => field.onChange(value === 'all' ? undefined : value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Any Difficulty" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Any Difficulty</SelectItem>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Recipe Type Filters */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-4">Recipe Preferences</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                  <FormField
                    control={form.control}
                    name="mealType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meal Type</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value || 'all'}
                            onValueChange={(value) => field.onChange(value === 'all' ? undefined : value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="All Meals" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Meals</SelectItem>
                              <SelectItem value="breakfast">Breakfast</SelectItem>
                              <SelectItem value="lunch">Lunch</SelectItem>
                              <SelectItem value="dinner">Dinner</SelectItem>
                              <SelectItem value="snack">Snack</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dietaryTag"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dietary Focus</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value || 'all'}
                            onValueChange={(value) => field.onChange(value === 'all' ? undefined : value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="All Diets" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Diets</SelectItem>
                              <SelectItem value="vegetarian">Vegetarian</SelectItem>
                              <SelectItem value="vegan">Vegan</SelectItem>
                              <SelectItem value="keto">Keto</SelectItem>
                              <SelectItem value="paleo">Paleo</SelectItem>
                              <SelectItem value="gluten-free">Gluten Free</SelectItem>
                              <SelectItem value="low-carb">Low Carb</SelectItem>
                              <SelectItem value="high-protein">High Protein</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxPrepTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Max Prep Time
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={field.value?.toString() || 'all'}
                            onValueChange={(value) => field.onChange(value === 'all' ? undefined : parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Any Time" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Any Time</SelectItem>
                              <SelectItem value="15">15 minutes</SelectItem>
                              <SelectItem value="30">30 minutes</SelectItem>
                              <SelectItem value="60">1 hour</SelectItem>
                              <SelectItem value="120">2 hours</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxCalories"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          Max Calories
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={field.value?.toString() || 'all'}
                            onValueChange={(value) => field.onChange(value === 'all' ? undefined : parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Any Amount" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Any Amount</SelectItem>
                              <SelectItem value="300">Under 300</SelectItem>
                              <SelectItem value="500">Under 500</SelectItem>
                              <SelectItem value="800">Under 800</SelectItem>
                              <SelectItem value="1200">Under 1200</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Macro Nutrient Targets */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-4 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Nutritional Targets (per serving)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                  {/* Protein */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-slate-600">Protein (g)</h5>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="minProtein"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Min</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
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
                                placeholder="∞"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Carbohydrates */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-slate-600">Carbohydrates (g)</h5>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="minCarbs"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Min</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
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
                                placeholder="∞"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Fat */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-slate-600">Fat (g)</h5>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="minFat"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Min</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
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
                                placeholder="∞"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={generateRecipes.isPending || isGenerating}
                size="lg"
              >
                {generateRecipes.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Starting Generation...
                  </>
                ) : isGenerating ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-pulse" />
                    {generationProgress || "Generating Recipes..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Custom Recipes
                  </>
                )}
              </Button>
            </form>
          </Form>
          </CardContent>
        )}
      </Card>

      {/* Quick Bulk Generation */}
      {!isCollapsed && (
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Quick Bulk Generation
          </CardTitle>
          <CardDescription>
            Generate multiple recipes quickly with default fitness-focused parameters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[10, 20, 30, 50].map((count) => (
              <Button
                key={count}
                variant="outline"
                onClick={() => {
                  // Set count and submit with fitness-focused defaults
                  form.setValue('count', count);
                  form.handleSubmit((data) => {
                    generateRecipes.mutate({
                      ...data,
                      count,
                      // Default fitness-focused parameters
                      minProtein: 20,
                      maxCalories: 800,
                    });
                  })();
                }}
                disabled={generateRecipes.isPending || isGenerating}
                className="h-16 flex flex-col items-center justify-center"
              >
                <span className="text-lg font-bold">{count}</span>
                <span className="text-xs text-slate-600">recipes</span>
              </Button>
            ))}
          </div>
        </CardContent>
        </Card>
      )}

      {/* Generation Status */}
      {(lastGeneration || isGenerating) && (
        <Card className={isGenerating ? "border-blue-200 bg-blue-50" : "border-green-200 bg-green-50"}>
          <CardContent className="pt-6">
            <div className={`flex items-center gap-2 ${isGenerating ? "text-blue-700" : "text-green-700"}`}>
              {isGenerating ? (
                <Clock className="h-5 w-5 animate-pulse" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
              <span className="font-medium">
                {isGenerating ? "Generation In Progress" : "Generation Complete"}
              </span>
            </div>

            {isGenerating && (
              <div className="mt-4 space-y-4">
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-in-out" 
                    style={{width: `${progressPercentage}%`}}
                  ></div>
                </div>
                
                <div className="space-y-2">
                  {statusSteps.map((step, index) => (
                    <div 
                      key={`step-${index}-${step.text}`} 
                      className={`flex items-center gap-2 text-sm ${
                        step.completed ? 'text-blue-700' : 'text-slate-500'
                      }`}
                    >
                      {step.completed ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : index === statusSteps.findIndex(s => !s.completed) ? (
                        <Circle className="h-4 w-4 animate-pulse text-blue-500" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                      <span className={step.completed ? 'text-slate-700' : ''}>
                        {step.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {lastGeneration && (
              <>
                <p className={`${isGenerating ? "text-blue-600" : "text-green-600"} mt-4`}>
                  {lastGeneration.message}
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <Badge variant="secondary">
                    {lastGeneration.count} recipes {isGenerating ? "generating" : "generated"}
                  </Badge>
                  {!isGenerating && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshStats}
                        className="text-xs"
                      >
                        Refresh Stats
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshPendingRecipes}
                        className="text-xs bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200"
                      >
                        Refresh Pending Recipe List
                      </Button>
                    </>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}