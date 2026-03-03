import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  ChefHat, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Play,
  Square,
  RefreshCw,
  Download,
  Info
} from 'lucide-react';
import { Textarea } from '../components/ui/textarea';

interface GenerationProgress {
  phase: string;
  percentage: number;
  currentChunk: number;
  totalChunks: number;
  recipesCompleted: number;
  totalRecipes: number;
  estimatedTimeRemaining: number;
  errors: string[];
  warnings: string[];
}

interface GenerationStats {
  totalRecipes: number;
  successful: number;
  failed: number;
  imagesGenerated: number;
  imagesUploaded: number;
  totalTime: number;
  averageTimePerRecipe: number;
}

const BULK_SIZES = [
  { value: 100, label: '100 Recipes' },
  { value: 500, label: '500 Recipes' },
  { value: 1000, label: '1,000 Recipes' },
  { value: 2000, label: '2,000 Recipes' },
  { value: 4000, label: '4,000 Recipes' },
  { value: 5000, label: '5,000 Recipes' },
];

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'];
const DIETARY_RESTRICTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Nut-Free',
  'Keto',
  'Paleo',
  'Low-Carb',
  'High-Protein',
  'Low-Fat',
];

const FITNESS_GOALS = [
  'Muscle Gain',
  'Weight Loss',
  'Maintenance',
  'Endurance',
  'General Health',
];

const TIER_LEVELS = [
  { value: 'starter', label: 'Starter' },
  { value: 'professional', label: 'Professional' },
  { value: 'enterprise', label: 'Enterprise' },
];

export default function BulkRecipeGeneration() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Form state
  const [batchSize, setBatchSize] = useState<number>(100);
  const [customBatchSize, setCustomBatchSize] = useState<string>('');
  const [mealTypes, setMealTypes] = useState<string[]>([]);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [fitnessGoal, setFitnessGoal] = useState<string>('');
  const [mainIngredient, setMainIngredient] = useState<string>('');
  const [targetCalories, setTargetCalories] = useState<string>('');
  const [maxCalories, setMaxCalories] = useState<string>('');
  const [minProtein, setMinProtein] = useState<string>('');
  const [maxProtein, setMaxProtein] = useState<string>('');
  const [minCarbs, setMinCarbs] = useState<string>('');
  const [maxCarbs, setMaxCarbs] = useState<string>('');
  const [minFat, setMinFat] = useState<string>('');
  const [maxFat, setMaxFat] = useState<string>('');
  const [maxPrepTime, setMaxPrepTime] = useState<string>('');
  const [naturalLanguagePrompt, setNaturalLanguagePrompt] = useState<string>('');
  const [enableImages, setEnableImages] = useState(true);
  const [enableS3Upload, setEnableS3Upload] = useState(true);
  const [enableNutritionValidation, setEnableNutritionValidation] = useState(true);
  const [selectedTiers, setSelectedTiers] = useState<string[]>([]);
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [stats, setStats] = useState<GenerationStats | null>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [isTabVisible, setIsTabVisible] = useState<boolean>(!document.hidden);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Monitor tab visibility to switch between SSE and polling
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsTabVisible(visible);
      
      // If tab becomes visible and we have a batchId, reconnect SSE if not already connected
      if (visible && batchId && isGenerating && !eventSource) {
        connectToSSE(batchId);
      }
      // Note: We keep both SSE and polling running simultaneously
      // Polling works even when tab is hidden, so generation continues
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [batchId, isGenerating, eventSource]);

  // Check for active batch on mount and restore progress
  useEffect(() => {
    const savedBatchId = localStorage.getItem('bulk-generation-batch-id');
    if (savedBatchId && !batchId) {
      // Try to reconnect to existing batch
      checkBatchStatus(savedBatchId);
    }
  }, []);

  // Save batch ID to localStorage when it changes
  useEffect(() => {
    if (batchId) {
      localStorage.setItem('bulk-generation-batch-id', batchId);
    } else {
      localStorage.removeItem('bulk-generation-batch-id');
    }
  }, [batchId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [eventSource, pollingInterval]);

  const checkBatchStatus = async (batchIdToCheck: string) => {
    try {
      const response = await fetch(`/api/admin/generate-bulk/status/${batchIdToCheck}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'active') {
          // Batch is still active, reconnect
          setBatchId(batchIdToCheck);
          setIsGenerating(true);
          connectToSSE(batchIdToCheck);
          toast({
            title: 'Reconnected to Generation',
            description: 'Resumed tracking your batch generation progress',
          });
        } else {
          // Batch is complete or failed, clean up
          localStorage.removeItem('bulk-generation-batch-id');
        }
      } else {
        // Batch not found, clean up
        localStorage.removeItem('bulk-generation-batch-id');
      }
    } catch (error) {
      console.error('Failed to check batch status:', error);
      localStorage.removeItem('bulk-generation-batch-id');
    }
  };

  const handleMealTypeToggle = (mealType: string) => {
    setMealTypes(prev => 
      prev.includes(mealType)
        ? prev.filter(m => m !== mealType)
        : [...prev, mealType]
    );
  };

  const handleDietaryToggle = (diet: string) => {
    setDietaryRestrictions(prev => 
      prev.includes(diet)
        ? prev.filter(d => d !== diet)
        : [...prev, diet]
    );
  };

  const handleTierToggle = (tier: string) => {
    setSelectedTiers(prev => 
      prev.includes(tier)
        ? prev.filter(t => t !== tier)
        : [...prev, tier]
    );
  };

  const handleStartGeneration = async () => {
    const finalBatchSize = customBatchSize 
      ? parseInt(customBatchSize, 10) 
      : batchSize;

    if (!finalBatchSize || finalBatchSize < 1) {
      toast({
        title: 'Invalid Batch Size',
        description: 'Please enter a valid batch size',
        variant: 'destructive',
      });
      return;
    }

    if (finalBatchSize > 10000) {
      toast({
        title: 'Batch Size Too Large',
        description: 'Maximum batch size is 10,000 recipes',
        variant: 'destructive',
      });
      return;
    }

    if (selectedTiers.length === 0) {
      toast({
        title: 'Tier Selection Required',
        description: 'Please select at least one tier for recipe access',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setErrors([]);
    setWarnings([]);
    setProgress(null);
    setStats(null);

    try {
      const requestBody = {
        count: finalBatchSize,
        mealTypes: mealTypes.length > 0 ? mealTypes : undefined,
        dietaryRestrictions: dietaryRestrictions.length > 0 ? dietaryRestrictions : undefined,
        fitnessGoal: fitnessGoal || undefined,
        mainIngredient: mainIngredient || undefined,
        targetCalories: targetCalories ? parseInt(targetCalories, 10) : undefined,
        maxCalories: maxCalories ? parseInt(maxCalories, 10) : undefined,
        minProtein: minProtein ? parseFloat(minProtein) : undefined,
        maxProtein: maxProtein ? parseFloat(maxProtein) : undefined,
        minCarbs: minCarbs ? parseFloat(minCarbs) : undefined,
        maxCarbs: maxCarbs ? parseFloat(maxCarbs) : undefined,
        minFat: minFat ? parseFloat(minFat) : undefined,
        maxFat: maxFat ? parseFloat(maxFat) : undefined,
        maxPrepTime: maxPrepTime ? parseInt(maxPrepTime, 10) : undefined,
        naturalLanguagePrompt: naturalLanguagePrompt || undefined,
        enableImageGeneration: enableImages,
        enableS3Upload: enableS3Upload,
        enableNutritionValidation: enableNutritionValidation,
        tierLevels: selectedTiers.length > 0 ? selectedTiers : undefined,
      };

      const response = await fetch('/api/admin/generate-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start generation');
      }

      const data = await response.json();
      const newBatchId = data.batchId;

      setBatchId(newBatchId);
      
      toast({
        title: 'Generation Started',
        description: `Started generating ${finalBatchSize} recipes. Progress will be shown below.`,
      });

      // Connect to SSE for progress updates (with polling fallback)
      connectToSSE(newBatchId);

    } catch (error) {
      console.error('Failed to start generation:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to start generation',
        variant: 'destructive',
      });
      setIsGenerating(false);
    }
  };

  // Polling function that works even when tab is hidden
  const startPolling = (batchIdToPoll: string) => {
    // Clear existing polling interval
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    // Poll every 3 seconds (adjust as needed)
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/admin/generate-bulk/status/${batchIdToPoll}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.status === 'active' && data.progress) {
            // Update progress from polling
            const progressData = data.progress;
            setProgress({
              phase: progressData.phase || progressData.currentStep || 'generating',
              percentage: progressData.percentage || progressData.progress || 0,
              currentChunk: progressData.currentChunk || 0,
              totalChunks: progressData.totalChunks || 0,
              recipesCompleted: progressData.recipesCompleted || progressData.completed || 0,
              totalRecipes: progressData.totalRecipes || progressData.total || 0,
              estimatedTimeRemaining: progressData.estimatedTimeRemaining || 0,
              errors: progressData.errors || [],
              warnings: progressData.warnings || [],
            });

            if (progressData.errors) {
              setErrors(prev => [...new Set([...prev, ...(Array.isArray(progressData.errors) ? progressData.errors : [progressData.errors])])]);
            }
            if (progressData.warnings) {
              setWarnings(prev => [...new Set([...prev, ...(Array.isArray(progressData.warnings) ? progressData.warnings : [progressData.warnings])])]);
            }
          } else if (data.status === 'complete' && data.progress) {
            // Generation complete - stats are in the progress object
            const progressData = data.progress;
            setStats({
              totalRecipes: progressData.totalRecipes || progressData.total || 0,
              successful: progressData.successful || progressData.recipesCompleted || 0,
              failed: progressData.failed || progressData.errors?.length || 0,
              imagesGenerated: progressData.imagesGenerated || 0,
              imagesUploaded: progressData.imagesUploaded || 0,
              totalTime: progressData.totalTime || 0,
              averageTimePerRecipe: progressData.averageTimePerRecipe || 0,
            });
            setIsGenerating(false);
            clearInterval(interval);
            setPollingInterval(null);
            localStorage.removeItem('bulk-generation-batch-id');
            setBatchId(null);

            const successful = progressData.successful || progressData.recipesCompleted || 0;
            const total = progressData.totalRecipes || progressData.total || 0;
            toast({
              title: 'Generation Complete',
              description: `Successfully generated ${successful}/${total} recipes`,
            });
          } else if (data.status === 'failed' || data.status === 'error') {
            setErrors(prev => [...prev, data.message || 'Generation failed']);
            setIsGenerating(false);
            clearInterval(interval);
            setPollingInterval(null);
            localStorage.removeItem('bulk-generation-batch-id');
            setBatchId(null);

            toast({
              title: 'Generation Failed',
              description: data.message || 'Generation failed',
              variant: 'destructive',
            });
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000); // Poll every 3 seconds

    setPollingInterval(interval);
  };

  const connectToSSE = (batchIdToConnect: string) => {
    // Close existing connection
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }

    // Stop polling if SSE is available (tab is visible)
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }

    const sse = new EventSource(`/api/admin/generate-bulk/progress/${batchIdToConnect}`);
    
    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'progress') {
          setProgress({
            phase: data.phase || 'starting',
            percentage: data.percentage || 0,
            currentChunk: data.currentChunk || 0,
            totalChunks: data.totalChunks || 0,
            recipesCompleted: data.recipesCompleted || 0,
            totalRecipes: data.totalRecipes || 0,
            estimatedTimeRemaining: data.estimatedTimeRemaining || 0,
            errors: data.errors || [],
            warnings: data.warnings || [],
          });

          // Update errors and warnings
          if (data.errors) {
            setErrors(prev => [...new Set([...prev, ...data.errors])]);
          }
          if (data.warnings) {
            setWarnings(prev => [...new Set([...prev, ...data.warnings])]);
          }
        } else if (data.type === 'complete') {
          setStats({
            totalRecipes: data.totalRecipes || 0,
            successful: data.successful || 0,
            failed: data.failed || 0,
            imagesGenerated: data.imagesGenerated || 0,
            imagesUploaded: data.imagesUploaded || 0,
            totalTime: data.totalTime || 0,
            averageTimePerRecipe: data.averageTimePerRecipe || 0,
          });
        setIsGenerating(false);
        sse.close();
        setEventSource(null);
        
        // Stop polling if active
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        
        // Clear saved batch ID on completion
        localStorage.removeItem('bulk-generation-batch-id');
        setBatchId(null);

        toast({
          title: 'Generation Complete',
          description: `Successfully generated ${data.successful}/${data.totalRecipes} recipes`,
        });
        } else if (data.type === 'error') {
        setErrors(prev => [...prev, data.message || 'Unknown error']);
        setIsGenerating(false);
        sse.close();
        setEventSource(null);
        
        // Stop polling if active
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        
        // Clear saved batch ID on error
        localStorage.removeItem('bulk-generation-batch-id');
        setBatchId(null);

        toast({
          title: 'Generation Failed',
          description: data.message || 'Generation failed',
          variant: 'destructive',
        });
        }
      } catch (error) {
        console.error('Failed to parse SSE data:', error);
      }
    };

    sse.onerror = (error) => {
      console.error('SSE connection error:', error);
      // If SSE fails, fall back to polling
      if (batchIdToConnect && isGenerating) {
        console.log('Falling back to polling due to SSE error');
        startPolling(batchIdToConnect);
      }
      sse.close();
      setEventSource(null);
    };

    setEventSource(sse);
    
    // Also start polling as a backup (works even when tab is hidden)
    // This ensures progress continues even if SSE is throttled
    startPolling(batchIdToConnect);
  };

  const handleStopGeneration = async () => {
    if (!batchId) return;

    try {
      await fetch(`/api/admin/generate-bulk/stop/${batchId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (eventSource) {
        eventSource.close();
        setEventSource(null);
      }
      
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }

      setIsGenerating(false);
      localStorage.removeItem('bulk-generation-batch-id');
      setBatchId(null);
      toast({
        title: 'Generation Stopped',
        description: 'Recipe generation has been stopped',
      });
    } catch (error) {
      console.error('Failed to stop generation:', error);
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (mins < 60) return `${mins}m ${secs}s`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  };

  const formatDuration = (ms: number) => {
    return formatTime(ms / 1000);
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You must be an admin to access bulk recipe generation.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ChefHat className="h-8 w-8" />
          Bulk Recipe Generation
        </h1>
        <p className="text-muted-foreground mt-2">
          Generate recipes in bulk (100-5,000+) with advanced options and real-time progress tracking
        </p>
      </div>

      <Tabs defaultValue="form" className="space-y-6">
        <TabsList>
          <TabsTrigger value="form">Generation Form</TabsTrigger>
          <TabsTrigger value="progress" disabled={!progress && !stats}>
            Progress & Results
          </TabsTrigger>
        </TabsList>

        <TabsContent value="form" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generation Settings</CardTitle>
              <CardDescription>
                Configure batch size and generation options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Batch Size */}
              <div className="space-y-2">
                <Label>Batch Size *</Label>
                <div className="grid grid-cols-3 gap-2">
                  {BULK_SIZES.map(size => (
                    <Button
                      key={size.value}
                      type="button"
                      variant={batchSize === size.value ? 'default' : 'outline'}
                      onClick={() => {
                        setBatchSize(size.value);
                        setCustomBatchSize('');
                      }}
                      disabled={isGenerating}
                    >
                      {size.label}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Custom size (max 10,000)"
                    value={customBatchSize}
                    onChange={(e) => {
                      setCustomBatchSize(e.target.value);
                      if (e.target.value) {
                        setBatchSize(0);
                      }
                    }}
                    disabled={isGenerating}
                    min={1}
                    max={10000}
                    className="max-w-xs"
                  />
                  {customBatchSize && (
                    <span className="text-sm text-muted-foreground">
                      = {parseInt(customBatchSize, 10).toLocaleString()} recipes
                    </span>
                  )}
                </div>
              </div>

              {/* Meal Types */}
              <div className="space-y-2">
                <Label>Meal Types</Label>
                <div className="flex flex-wrap gap-2">
                  {MEAL_TYPES.map(type => (
                    <Badge
                      key={type}
                      variant={mealTypes.includes(type) ? 'default' : 'outline'}
                      className="cursor-pointer px-3 py-1"
                      onClick={() => !isGenerating && handleMealTypeToggle(type)}
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Dietary Restrictions */}
              <div className="space-y-2">
                <Label>Dietary Restrictions</Label>
                <div className="flex flex-wrap gap-2">
                  {DIETARY_RESTRICTIONS.map(diet => (
                    <Badge
                      key={diet}
                      variant={dietaryRestrictions.includes(diet) ? 'default' : 'outline'}
                      className="cursor-pointer px-3 py-1"
                      onClick={() => !isGenerating && handleDietaryToggle(diet)}
                    >
                      {diet}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Tier Selection */}
              <div className="space-y-2">
                <Label>Tier Access *</Label>
                <p className="text-sm text-muted-foreground">
                  Select which tier(s) should have access to these recipes. 
                  Recipes will be assigned to all selected tiers via progressive access 
                  (recipes assigned to lower tiers are accessible by higher tiers).
                </p>
                <div className="flex flex-wrap gap-2">
                  {TIER_LEVELS.map(tier => (
                    <Badge
                      key={tier.value}
                      variant={selectedTiers.includes(tier.value) ? 'default' : 'outline'}
                      className="cursor-pointer px-3 py-1"
                      onClick={() => !isGenerating && handleTierToggle(tier.value)}
                    >
                      {tier.label}
                    </Badge>
                  ))}
                </div>
                {selectedTiers.length === 0 && (
                  <p className="text-sm text-amber-600">
                    Please select at least one tier for recipe access.
                  </p>
                )}
                {selectedTiers.length > 0 && (
                  <p className="text-sm text-blue-600">
                    ✓ Recipes will be accessible to: {selectedTiers.map(t => 
                      TIER_LEVELS.find(tier => tier.value === t)?.label || t
                    ).join(', ')}
                  </p>
                )}
              </div>

              {/* Basic Options */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fitness Goal</Label>
                  <Select
                    value={fitnessGoal || undefined}
                    onValueChange={(value) => setFitnessGoal(value || '')}
                    disabled={isGenerating}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select fitness goal (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {FITNESS_GOALS.map(goal => (
                        <SelectItem key={goal} value={goal.toLowerCase().replace(' ', '_')}>
                          {goal}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Main Ingredient</Label>
                  <Input
                    placeholder="e.g., Chicken, Salmon, Tofu"
                    value={mainIngredient}
                    onChange={(e) => setMainIngredient(e.target.value)}
                    disabled={isGenerating}
                  />
                </div>
              </div>

              {/* Nutritional Constraints */}
              <div className="space-y-4">
                <Label>Nutritional Constraints</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Target Calories</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 500"
                      value={targetCalories}
                      onChange={(e) => setTargetCalories(e.target.value)}
                      disabled={isGenerating}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Max Calories</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 600"
                      value={maxCalories}
                      onChange={(e) => setMaxCalories(e.target.value)}
                      disabled={isGenerating}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Min Protein (g)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="e.g., 20"
                      value={minProtein}
                      onChange={(e) => setMinProtein(e.target.value)}
                      disabled={isGenerating}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Max Protein (g)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="e.g., 50"
                      value={maxProtein}
                      onChange={(e) => setMaxProtein(e.target.value)}
                      disabled={isGenerating}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Min Carbs (g)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="e.g., 30"
                      value={minCarbs}
                      onChange={(e) => setMinCarbs(e.target.value)}
                      disabled={isGenerating}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Max Carbs (g)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="e.g., 60"
                      value={maxCarbs}
                      onChange={(e) => setMaxCarbs(e.target.value)}
                      disabled={isGenerating}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Min Fat (g)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="e.g., 10"
                      value={minFat}
                      onChange={(e) => setMinFat(e.target.value)}
                      disabled={isGenerating}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Max Fat (g)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="e.g., 25"
                      value={maxFat}
                      onChange={(e) => setMaxFat(e.target.value)}
                      disabled={isGenerating}
                    />
                  </div>
                </div>
              </div>

              {/* Advanced Options */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Max Prep Time (minutes)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 30"
                    value={maxPrepTime}
                    onChange={(e) => setMaxPrepTime(e.target.value)}
                    disabled={isGenerating}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Natural Language Prompt</Label>
                  <Textarea
                    placeholder="e.g., High-protein breakfast recipes for athletes..."
                    value={naturalLanguagePrompt}
                    onChange={(e) => setNaturalLanguagePrompt(e.target.value)}
                    disabled={isGenerating}
                    rows={3}
                  />
                </div>
              </div>

              {/* Generation Options */}
              <div className="space-y-4 border-t pt-4">
                <Label>Generation Options</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enableImages"
                      checked={enableImages}
                      onCheckedChange={(checked) => setEnableImages(checked === true)}
                      disabled={isGenerating}
                    />
                    <Label htmlFor="enableImages" className="cursor-pointer">
                      Generate Images (DALL-E 3)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enableS3Upload"
                      checked={enableS3Upload}
                      onCheckedChange={(checked) => setEnableS3Upload(checked === true)}
                      disabled={isGenerating || !enableImages}
                    />
                    <Label htmlFor="enableS3Upload" className="cursor-pointer">
                      Upload Images to S3
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enableNutritionValidation"
                      checked={enableNutritionValidation}
                      onCheckedChange={(checked) => setEnableNutritionValidation(checked === true)}
                      disabled={isGenerating}
                    />
                    <Label htmlFor="enableNutritionValidation" className="cursor-pointer">
                      Enable Nutrition Validation
                    </Label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <Button
                  onClick={handleStartGeneration}
                  disabled={isGenerating}
                  size="lg"
                  className="flex-1"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Start Generation
                    </>
                  )}
                </Button>
                {isGenerating && (
                  <Button
                    onClick={handleStopGeneration}
                    variant="destructive"
                    size="lg"
                  >
                    <Square className="mr-2 h-4 w-4" />
                    Stop
                  </Button>
                )}
              </div>

              {/* Info Alert */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Large batches (1000+ recipes):</strong> Generation can take 1-2 hours. 
                  Progress is tracked in real-time. You can safely close this page and check back later.
                  All recipes are saved incrementally, so partial progress is preserved.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="space-y-6">
          {progress && (
            <Card>
              <CardHeader>
                <CardTitle>Generation Progress</CardTitle>
                <CardDescription>
                  Current phase: {progress.phase}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Overall Progress</span>
                    <span>{progress.percentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={progress.percentage} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Recipes Completed</div>
                    <div className="text-2xl font-bold">
                      {progress.recipesCompleted.toLocaleString()} / {progress.totalRecipes.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Chunks</div>
                    <div className="text-2xl font-bold">
                      {progress.currentChunk} / {progress.totalChunks}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Estimated Time Remaining</div>
                    <div className="text-2xl font-bold">
                      {formatTime(progress.estimatedTimeRemaining)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Batch ID</div>
                    <div className="text-sm font-mono">{batchId}</div>
                  </div>
                </div>

                {warnings.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-semibold mb-2">Warnings:</div>
                      <ul className="list-disc list-inside space-y-1">
                        {warnings.map((warning, idx) => (
                          <li key={idx} className="text-sm">{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {stats && (
            <Card>
              <CardHeader>
                <CardTitle>Generation Complete</CardTitle>
                <CardDescription>
                  Final statistics for batch {batchId}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Total Recipes</div>
                    <div className="text-3xl font-bold">{stats.totalRecipes.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Successful</div>
                    <div className="text-3xl font-bold text-green-600">
                      {stats.successful.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                    <div className="text-3xl font-bold text-red-600">
                      {stats.failed.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Success Rate</div>
                    <div className="text-3xl font-bold">
                      {((stats.successful / stats.totalRecipes) * 100).toFixed(1)}%
                    </div>
                  </div>
                  {enableImages && (
                    <>
                      <div>
                        <div className="text-sm text-muted-foreground">Images Generated</div>
                        <div className="text-2xl font-bold">{stats.imagesGenerated.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Images Uploaded</div>
                        <div className="text-2xl font-bold">{stats.imagesUploaded.toLocaleString()}</div>
                      </div>
                    </>
                  )}
                  <div>
                    <div className="text-sm text-muted-foreground">Total Time</div>
                    <div className="text-2xl font-bold">{formatDuration(stats.totalTime)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Avg Time/Recipe</div>
                    <div className="text-2xl font-bold">{formatDuration(stats.averageTimePerRecipe)}</div>
                  </div>
                </div>

                {errors.length > 0 && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-semibold mb-2">Errors:</div>
                      <ul className="list-disc list-inside space-y-1 max-h-48 overflow-y-auto">
                        {errors.map((error, idx) => (
                          <li key={idx} className="text-sm">{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-4">
                  <Button
                    onClick={() => window.location.href = '/admin'}
                    variant="outline"
                  >
                    View Recipes
                  </Button>
                  <Button
                    onClick={() => {
                      setProgress(null);
                      setStats(null);
                      setErrors([]);
                      setWarnings([]);
                      setBatchId(null);
                    }}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    New Generation
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

