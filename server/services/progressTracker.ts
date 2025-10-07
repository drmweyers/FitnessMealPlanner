import { EventEmitter } from 'events';

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

interface JobOptions {
  totalRecipes: number;
  metadata?: Record<string, any>;
}

export class ProgressTracker extends EventEmitter {
  private jobs = new Map<string, GenerationProgress>();
  private cleanupTimeouts = new Map<string, NodeJS.Timeout>();

  // Cleanup completed jobs after 30 minutes
  private static readonly CLEANUP_DELAY = 30 * 60 * 1000;

  createJob(options: JobOptions): string {
    const jobId = this.generateJobId();
    const progress: GenerationProgress = {
      jobId,
      totalRecipes: options.totalRecipes,
      completed: 0,
      failed: 0,
      currentStep: 'starting',
      percentage: 0,
      startTime: Date.now(),
      errors: [],
    };

    this.jobs.set(jobId, progress);
    
    // Schedule cleanup
    const cleanupTimeout = setTimeout(() => {
      this.jobs.delete(jobId);
      this.cleanupTimeouts.delete(jobId);
    }, ProgressTracker.CLEANUP_DELAY);
    
    this.cleanupTimeouts.set(jobId, cleanupTimeout);

    console.log(`[ProgressTracker] Created job ${jobId} for ${options.totalRecipes} recipes`);
    return jobId;
  }

  updateProgress(jobId: string, updates: Partial<GenerationProgress>): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      console.warn(`[ProgressTracker] Job ${jobId} not found`);
      return;
    }

    // Update the progress
    Object.assign(job, updates);

    // Calculate percentage based on step and completion
    this.calculatePercentage(job);

    // Calculate ETA if we have some progress
    if (job.completed > 0 && job.currentStep !== 'complete') {
      this.calculateETA(job);
    }

    // Emit progress event
    this.emit('progress', { ...job });

    console.log(`[ProgressTracker] Job ${jobId}: ${job.currentStep} - ${job.percentage}% (${job.completed}/${job.totalRecipes})`);
  }

  markStepComplete(jobId: string, step: GenerationProgress['currentStep']): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    this.updateProgress(jobId, { currentStep: step });
  }

  recordSuccess(jobId: string, recipeName?: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const newCompleted = job.completed + 1;
    const isComplete = newCompleted >= job.totalRecipes;

    this.updateProgress(jobId, {
      completed: newCompleted,
      currentRecipeName: recipeName,
      currentStep: isComplete ? 'complete' : job.currentStep,
    });
  }

  recordFailure(jobId: string, error: string, recipeName?: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const newFailed = job.failed + 1;
    const newErrors = [...job.errors, error];
    const totalProcessed = job.completed + newFailed;
    const isComplete = totalProcessed >= job.totalRecipes;

    this.updateProgress(jobId, {
      failed: newFailed,
      errors: newErrors,
      currentRecipeName: recipeName,
      currentStep: isComplete ? (job.completed > 0 ? 'complete' : 'failed') : job.currentStep,
    });
  }

  recordStepProgress(jobId: string, stepIndex: number, stepName: string, itemsProcessed: number, totalItems: number): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    this.updateProgress(jobId, {
      stepProgress: {
        stepIndex,
        stepName,
        itemsProcessed,
        totalItems
      }
    });
  }

  markJobFailed(jobId: string, error: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    this.updateProgress(jobId, {
      currentStep: 'failed',
      errors: [...job.errors, error],
    });
  }

  getProgress(jobId: string): GenerationProgress | undefined {
    return this.jobs.get(jobId);
  }

  getAllJobs(): GenerationProgress[] {
    return Array.from(this.jobs.values());
  }

  deleteJob(jobId: string): boolean {
    const timeout = this.cleanupTimeouts.get(jobId);
    if (timeout) {
      clearTimeout(timeout);
      this.cleanupTimeouts.delete(jobId);
    }
    return this.jobs.delete(jobId);
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculatePercentage(job: GenerationProgress): void {
    // Handle edge case of zero total recipes
    if (job.totalRecipes === 0) {
      job.percentage = 100; // Consider 0 recipes as 100% complete
      return;
    }

    // Base progress on completed and failed items
    const totalProcessed = job.completed + job.failed;
    let basePercentage = (totalProcessed / job.totalRecipes) * 100;

    // Add weight for current step if we're processing
    if (job.stepProgress && totalProcessed < job.totalRecipes) {
      const stepWeight = 1 / job.totalRecipes; // Each recipe represents ~1/total of progress
      const stepProgress = (job.stepProgress.itemsProcessed / job.stepProgress.totalItems) * stepWeight * 100;
      basePercentage += stepProgress;
    }

    job.percentage = Math.min(100, Math.round(basePercentage * 100) / 100);
  }

  private calculateETA(job: GenerationProgress): void {
    const elapsed = Date.now() - job.startTime;
    const totalProcessed = job.completed + job.failed;
    
    if (totalProcessed === 0) return;

    const avgTimePerRecipe = elapsed / totalProcessed;
    const remaining = job.totalRecipes - totalProcessed;
    
    job.estimatedCompletion = Date.now() + (remaining * avgTimePerRecipe);
  }
}

// Singleton instance
export const progressTracker = new ProgressTracker();

// Helper function to get step display names
export function getStepDisplayName(step: GenerationProgress['currentStep']): string {
  const stepNames = {
    starting: 'Initializing...',
    generating: 'Generating recipes with AI...',
    validating: 'Validating recipe data...',
    images: 'Generating recipe images...',
    storing: 'Saving to database...',
    complete: 'Generation complete!',
    failed: 'Generation failed',
  };
  
  return stepNames[step] || step;
}

// Helper function to get step order for progress calculation
export function getStepWeight(step: GenerationProgress['currentStep']): number {
  const stepWeights = {
    starting: 0,
    generating: 20,
    validating: 40,
    images: 70,
    storing: 90,
    complete: 100,
    failed: 0,
  };
  
  return stepWeights[step] || 0;
}