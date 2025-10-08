import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Progress } from "./ui/progress";
import { useToast } from "../hooks/use-toast";
import { Checkbox } from "./ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  Sparkles,
  Zap,
  CheckCircle2,
  Circle,
  Loader2,
  Image as ImageIcon,
  Database,
  Shield,
  Activity
} from "lucide-react";
import { z } from "zod";

const bmadGenerationSchema = z.object({
  count: z.number().min(1).max(100).default(10),
  mealTypes: z.array(z.string()).optional(),
  fitnessGoal: z.string().optional(),
  targetCalories: z.number().optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
  mainIngredient: z.string().optional(),
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

const mealTypeOptions = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

const fitnessGoalOptions = [
  { value: "weight_loss", label: "Weight Loss" },
  { value: "muscle_gain", label: "Muscle Gain" },
  { value: "maintenance", label: "Maintenance" },
  { value: "endurance", label: "Endurance" },
];

export default function BMADRecipeGenerator() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const form = useForm<BMADGeneration>({
    resolver: zodResolver(bmadGenerationSchema),
    defaultValues: {
      count: 10,
      enableImageGeneration: true,
      enableS3Upload: true,
      enableNutritionValidation: true,
    },
  });

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  const connectToSSE = (batchId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(
      `/api/admin/bmad-progress-stream/${batchId}`
    );

    eventSource.addEventListener('connected', (event) => {
      const data = JSON.parse(event.data);
      console.log('[BMAD SSE] Connected:', data);
    });

    eventSource.addEventListener('progress', (event) => {
      const progressData: ProgressState = JSON.parse(event.data);
      console.log('[BMAD SSE] Progress:', progressData);
      setProgress(progressData);
      setError(null);
    });

    eventSource.addEventListener('complete', (event) => {
      const result = JSON.parse(event.data);
      console.log('[BMAD SSE] Complete:', result);

      setIsGenerating(false);

      toast({
        title: "Generation Complete!",
        description: `Successfully generated ${result.savedRecipes?.length || 0} recipes`,
      });

      // Close SSE connection
      eventSource.close();
      eventSourceRef.current = null;
    });

    eventSource.addEventListener('error', (event: any) => {
      if (event.data) {
        const errorData = JSON.parse(event.data);
        console.error('[BMAD SSE] Error:', errorData);
        setError(errorData.error);

        toast({
          variant: "destructive",
          title: "Generation Failed",
          description: errorData.error,
        });
      }

      setIsGenerating(false);
      eventSource.close();
      eventSourceRef.current = null;
    });

    eventSource.onerror = (error) => {
      console.error('[BMAD SSE] Connection error:', error);
      setError("SSE connection lost");
      setIsGenerating(false);
      eventSource.close();
      eventSourceRef.current = null;
    };

    eventSourceRef.current = eventSource;
  };

  const onSubmit = async (data: BMADGeneration) => {
    setIsGenerating(true);
    setProgress(null);
    setError(null);

    try {
      const response = await fetch('/api/admin/generate-bmad', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start BMAD generation');
      }

      const result: BMADGenerationResult = await response.json();

      // Connect to SSE stream with returned batchId
      connectToSSE(result.batchId);

      toast({
        title: "BMAD Generation Started",
        description: `Generating ${result.count} recipes with multi-agent workflow`,
      });

    } catch (error) {
      setIsGenerating(false);
      setError(error instanceof Error ? error.message : 'Unknown error');

      toast({
        variant: "destructive",
        title: "Failed to Start Generation",
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'planning':
        return <Circle className="h-4 w-4 text-blue-500" />;
      case 'generating':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'validating':
        return <Shield className="h-4 w-4 text-yellow-500" />;
      case 'saving':
        return <Database className="h-4 w-4 text-green-500" />;
      case 'imaging':
        return <ImageIcon className="h-4 w-4 text-purple-500" />;
      case 'complete':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const getAgentStatusBadge = (status: string | undefined) => {
    if (!status) return null;

    const variant =
      status === 'complete' ? 'default' :
      status === 'working' ? 'secondary' :
      'outline';

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
          <Sparkles className="h-6 w-6 text-purple-600" />
          <CardTitle>BMAD Multi-Agent Recipe Generator</CardTitle>
        </div>
        <CardDescription>
          Bulk recipe generation with multi-agent AI workflow, nutrition validation, and image generation
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Recipe Count */}
            <FormField
              control={form.control}
              name="count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Recipes</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
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

            {/* Meal Types */}
            <FormField
              control={form.control}
              name="mealTypes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meal Types</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {mealTypeOptions.map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          checked={field.value?.includes(option.value)}
                          onCheckedChange={(checked) => {
                            const current = field.value || [];
                            if (checked) {
                              field.onChange([...current, option.value]);
                            } else {
                              field.onChange(current.filter((v) => v !== option.value));
                            }
                          }}
                          disabled={isGenerating}
                        />
                        <Label className="text-sm font-normal">{option.label}</Label>
                      </div>
                    ))}
                  </div>
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
                  <FormLabel>Fitness Goal (Optional)</FormLabel>
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

            {/* Target Calories */}
            <FormField
              control={form.control}
              name="targetCalories"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Calories (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g., 500"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      disabled={isGenerating}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      <FormLabel>
                        Generate Images (DALL-E 3)
                      </FormLabel>
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
                      <FormLabel>
                        Upload to S3 Storage
                      </FormLabel>
                      <FormDescription>
                        Upload images to DigitalOcean Spaces for permanent storage
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
                      <FormLabel>
                        Nutrition Validation
                      </FormLabel>
                      <FormDescription>
                        Validate and auto-fix nutritional data
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Recipes...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Start BMAD Generation
                </>
              )}
            </Button>
          </form>
        </Form>

        {/* Progress Display */}
        {(isGenerating || progress) && (
          <div className="mt-6 space-y-4">
            <Separator />

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getPhaseIcon(progress?.phase || 'planning')}
                  <span className="text-sm font-medium capitalize">
                    {progress?.phase || 'Initializing'}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {progress ? `${progress.recipesCompleted}/${progress.totalRecipes}` : '0/0'} recipes
                </span>
              </div>

              <Progress value={progressPercentage} className="h-2" />

              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {progress ? `Chunk ${progress.currentChunk}/${progress.totalChunks}` : 'Starting...'}
                </span>
                {progress?.estimatedTimeRemaining && (
                  <span>
                    ~{Math.round(progress.estimatedTimeRemaining / 1000)}s remaining
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
                <ImageIcon className="h-4 w-4 text-purple-500" />
                <span>
                  {progress.imagesGenerated} images generated
                </span>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive rounded-md">
                <p className="text-sm text-destructive font-medium">
                  {error}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
