import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { CheckCircle, XCircle, Clock, Zap, TrendingUp, AlertCircle } from 'lucide-react';

interface GenerationProgress {
  jobId: string;
  totalRecipes: number;
  completed: number;
  failed: number;
  currentStep: 'starting' | 'generating' | 'validating' | 'images' | 'storing' | 'complete' | 'failed';
  percentage: number;
  startTime: number;
  estimatedCompletion?: number;
  errors: string[];
  currentRecipeName?: string;
  stepProgress?: {
    stepIndex: number;
    stepName: string;
    itemsProcessed: number;
    totalItems: number;
  };
}

interface GenerationResult {
  success: number;
  failed: number;
  errors: string[];
  metrics?: {
    totalDuration: number;
    averageTimePerRecipe: number;
  };
}

interface RecipeGenerationProgressProps {
  jobId: string;
  totalRecipes: number;
  onComplete: (results: GenerationResult) => void;
  onError: (error: string) => void;
}

const stepDisplayNames = {
  starting: 'Initializing...',
  generating: 'Generating recipes with AI...',
  validating: 'Validating recipe data...',
  images: 'Generating recipe images...',
  storing: 'Saving to database...',
  complete: 'Generation complete!',
  failed: 'Generation failed',
};

const stepIcons = {
  starting: Clock,
  generating: Zap,
  validating: CheckCircle,
  images: TrendingUp,
  storing: CheckCircle,
  complete: CheckCircle,
  failed: XCircle,
};

export default function RecipeGenerationProgress({
  jobId,
  totalRecipes,
  onComplete,
  onError,
}: RecipeGenerationProgressProps) {
  const [hasCompleted, setHasCompleted] = useState(false);
  const completedRef = useRef(false);

  // Poll for progress updates
  const { data: progress, error, isError } = useQuery<GenerationProgress>({
    queryKey: ['generation-progress', jobId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/admin/generation-progress/${jobId}`);
      return response.json();
    },
    refetchInterval: () => {
      // Stop polling if already completed
      if (completedRef.current || hasCompleted) {
        return false;
      }
      return 2000; // Poll every 2 seconds
    },
    enabled: !hasCompleted && !!jobId,
  });

  // Handle completion
  useEffect(() => {
    if (progress && !completedRef.current) {
      if (progress.currentStep === 'complete') {
        completedRef.current = true;
        setHasCompleted(true);
        
        const results: GenerationResult = {
          success: progress.completed,
          failed: progress.failed,
          errors: progress.errors,
          metrics: {
            totalDuration: Date.now() - progress.startTime,
            averageTimePerRecipe: (Date.now() - progress.startTime) / progress.totalRecipes,
          }
        };
        
        onComplete(results);
      } else if (progress.currentStep === 'failed') {
        completedRef.current = true;
        setHasCompleted(true);
        onError(progress.errors.join(', ') || 'Recipe generation failed');
      }
    }
  }, [progress, onComplete, onError]);

  // Handle query errors
  useEffect(() => {
    if (isError && error) {
      onError(`Failed to track progress: ${error.message}`);
    }
  }, [isError, error, onError]);

  if (!progress) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 animate-spin" />
            Connecting to progress tracker...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Progress value={0} className="h-2" />
            <p className="text-sm text-muted-foreground">
              Setting up progress tracking for {totalRecipes} recipes...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const StepIcon = stepIcons[progress.currentStep];
  const isActive = progress.currentStep !== 'complete' && progress.currentStep !== 'failed';
  const totalProcessed = progress.completed + progress.failed;
  
  // Calculate ETA
  const getETA = () => {
    if (!progress.estimatedCompletion) return null;
    
    const remaining = Math.max(0, progress.estimatedCompletion - Date.now());
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  // Calculate elapsed time
  const getElapsedTime = () => {
    const elapsed = Date.now() - progress.startTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StepIcon 
            className={`h-5 w-5 ${
              isActive ? 'animate-pulse text-blue-500' : 
              progress.currentStep === 'complete' ? 'text-green-500' : 
              progress.currentStep === 'failed' ? 'text-red-500' : 'text-gray-500'
            }`} 
          />
          {stepDisplayNames[progress.currentStep]}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">
              Overall Progress ({totalProcessed}/{progress.totalRecipes})
            </span>
            <span className="text-sm text-muted-foreground">
              {progress.percentage.toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={progress.percentage} 
            className="h-3"
          />
        </div>

        {/* Current Recipe Info */}
        {progress.currentRecipeName && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Current:</span> {progress.currentRecipeName}
          </div>
        )}

        {/* Step Progress */}
        {progress.stepProgress && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {progress.stepProgress.stepName}
              </span>
              <span className="text-xs text-muted-foreground">
                {progress.stepProgress.itemsProcessed}/{progress.stepProgress.totalItems}
              </span>
            </div>
            <Progress 
              value={(progress.stepProgress.itemsProcessed / progress.stepProgress.totalItems) * 100}
              className="h-1"
            />
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-lg font-bold text-green-600">{progress.completed}</span>
            </div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-lg font-bold text-red-600">{progress.failed}</span>
            </div>
            <p className="text-xs text-muted-foreground">Failed</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-lg font-bold text-blue-600">{getElapsedTime()}</span>
            </div>
            <p className="text-xs text-muted-foreground">Elapsed</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span className="text-lg font-bold text-purple-600">
                {getETA() || '--'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">ETA</p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center">
          <Badge 
            variant={
              progress.currentStep === 'complete' ? 'default' :
              progress.currentStep === 'failed' ? 'destructive' :
              'secondary'
            }
            className="px-3 py-1"
          >
            {progress.currentStep === 'complete' && '✓ '}
            {progress.currentStep === 'failed' && '✗ '}
            {stepDisplayNames[progress.currentStep]}
          </Badge>
        </div>

        {/* Error Display */}
        {progress.errors.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-700">
                {progress.errors.length} Error{progress.errors.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="text-xs text-red-600 space-y-1 max-h-20 overflow-y-auto">
              {progress.errors.slice(0, 3).map((error, index) => (
                <div key={index}>{error}</div>
              ))}
              {progress.errors.length > 3 && (
                <div className="text-red-500">
                  ... and {progress.errors.length - 3} more errors
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}