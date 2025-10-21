import { progressSummaryService } from './progressSummaryService';

type ScheduledJob = {
  id: NodeJS.Timeout;
  name: string;
  running: boolean;
  nextRun?: Date;
}

export class SchedulerService {
  private static instance: SchedulerService;
  private jobs: Map<string, ScheduledJob> = new Map();
  private checkInterval?: NodeJS.Timeout;

  public static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  /**
   * Initialize all scheduled jobs
   */
  public initialize(): void {
    console.log('Initializing scheduler service...');
    
    // Only set up jobs in production or when explicitly enabled
    const enableScheduler = process.env.ENABLE_SCHEDULER === 'true' || process.env.NODE_ENV === 'production';
    
    if (!enableScheduler) {
      console.log('Scheduler disabled in development environment. Set ENABLE_SCHEDULER=true to enable.');
      return;
    }

    this.setupWeeklyProgressSummaryJob();
    console.log('Scheduler service initialized successfully.');
  }

  /**
   * Set up weekly progress summary email job
   * Checks every hour and runs on Monday at 9:00 AM
   */
  private setupWeeklyProgressSummaryJob(): void {
    const jobName = 'weekly-progress-summaries';
    
    try {
      // Check every hour
      const intervalId = setInterval(async () => {
        const now = new Date();
        
        // Only run on Mondays at 9:00 AM (hour 9, any minute)
        const isMonday = now.getDay() === 1;
        const isNineAM = now.getHours() === 9;
        
        // For testing: Allow running any day if in development mode
        const isTestMode = process.env.NODE_ENV === 'development' && process.env.ENABLE_SCHEDULER === 'true';
        
        if ((isMonday && isNineAM) || (isTestMode && process.env.FORCE_RUN_PROGRESS_SUMMARIES === 'true')) {
          console.log('Starting scheduled weekly progress summary job...');
          
          try {
            // Reset the force run flag
            if (isTestMode) {
              process.env.FORCE_RUN_PROGRESS_SUMMARIES = 'false';
            }
            
            const result = await progressSummaryService.sendWeeklyProgressSummariesForAllCustomers();
            
            console.log(`Weekly progress summary job completed:`, {
              sent: result.sent,
              errors: result.errors,
              total: result.sent + result.errors,
              timestamp: now.toISOString()
            });
            
            // Log any errors for monitoring
            if (result.errors > 0) {
              console.warn('Some progress summaries failed to send:', {
                failedCustomers: result.results.filter(r => !r.success),
                totalErrors: result.errors
              });
            }
            
          } catch (error) {
            console.error('Weekly progress summary job failed:', error);
          }
        }
      }, 60 * 60 * 1000); // Check every hour (60 minutes * 60 seconds * 1000 ms)

      // Calculate next Monday 9 AM
      const nextRun = this.getNextMondayAt9AM();

      this.jobs.set(jobName, {
        id: intervalId,
        name: jobName,
        running: true,
        nextRun
      });
      
      console.log(`Weekly progress summary job scheduled. Next run: ${nextRun.toISOString()}`);
      
    } catch (error) {
      console.error(`Failed to schedule weekly progress summary job:`, error);
    }
  }

  /**
   * Calculate next Monday at 9:00 AM
   */
  private getNextMondayAt9AM(): Date {
    const now = new Date();
    const nextMonday = new Date(now);
    
    // If it's Monday and before 9 AM, use today
    if (now.getDay() === 1 && now.getHours() < 9) {
      nextMonday.setHours(9, 0, 0, 0);
    } else {
      // Calculate days until next Monday
      const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
      nextMonday.setDate(now.getDate() + daysUntilMonday);
      nextMonday.setHours(9, 0, 0, 0);
    }
    
    return nextMonday;
  }

  /**
   * Start all scheduled jobs
   */
  public startAllJobs(): void {
    console.log('All jobs are already started during initialization');
  }

  /**
   * Stop all scheduled jobs
   */
  public stopAllJobs(): void {
    console.log('Stopping all scheduled jobs...');
    
    this.jobs.forEach((job, name) => {
      clearInterval(job.id);
      job.running = false;
      console.log(`Stopped job: ${name}`);
    });
  }

  /**
   * Get status of all jobs
   */
  public getJobsStatus(): Array<{ name: string; running: boolean; nextRun?: string }> {
    const status: Array<{ name: string; running: boolean; nextRun?: string }> = [];
    
    this.jobs.forEach((job, name) => {
      status.push({
        name,
        running: job.running,
        nextRun: job.nextRun?.toISOString()
      });
    });
    
    return status;
  }

  /**
   * Manually trigger a specific job (for testing)
   */
  public async triggerJob(jobName: string): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      switch (jobName) {
        case 'weekly-progress-summaries': {
          console.log('Manually triggering weekly progress summaries...');
          const result = await progressSummaryService.sendWeeklyProgressSummariesForAllCustomers();
          return { success: true, result };
        }

        default:
          return { success: false, error: `Unknown job: ${jobName}` };
      }
    } catch (error) {
      console.error(`Failed to trigger job ${jobName}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Shutdown the scheduler gracefully
   */
  public shutdown(): void {
    console.log('Shutting down scheduler service...');
    
    this.jobs.forEach((job, name) => {
      job.destroy();
      console.log(`Destroyed job: ${name}`);
    });
    
    this.jobs.clear();
    console.log('Scheduler service shut down successfully.');
  }
}

// Export singleton instance
export const schedulerService = SchedulerService.getInstance();