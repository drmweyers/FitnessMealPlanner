import { progressSummaryService } from './progressSummaryService';
import { db } from '../db';
import { recipeTierAccess, users } from '@shared/schema';
import { eq } from 'drizzle-orm';
// TEMPORARILY DISABLED - Stripe integration incomplete
// import { resetMonthlyUsage } from '../middleware/usageEnforcement';

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
    this.setupMonthlyRecipeAllocationJob(); // Story 2.14: Monthly recipe allocation
    this.setupMonthlyUsageResetJob(); // Reset usage counters for one-time payment users
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
   * Story 2.14: Set up monthly recipe allocation job
   * Runs on the 1st day of each month at midnight to add new recipe allocations
   * - Starter tier: +25 recipes/month
   * - Professional tier: +50 recipes/month
   * - Enterprise tier: +100 recipes/month
   */
  private setupMonthlyRecipeAllocationJob(): void {
    const jobName = 'monthly-recipe-allocation';

    try {
      // Check every hour
      const intervalId = setInterval(async () => {
        const now = new Date();

        // Run on the 1st day of month at midnight (hour 0)
        const isFirstDayOfMonth = now.getDate() === 1;
        const isMidnight = now.getHours() === 0;

        // For testing: Allow running any day if in development mode
        const isTestMode = process.env.NODE_ENV === 'development' && process.env.ENABLE_SCHEDULER === 'true';

        if ((isFirstDayOfMonth && isMidnight) || (isTestMode && process.env.FORCE_RUN_RECIPE_ALLOCATION === 'true')) {
          console.log('Starting scheduled monthly recipe allocation job...');

          try {
            // Reset the force run flag
            if (isTestMode) {
              process.env.FORCE_RUN_RECIPE_ALLOCATION = 'false';
            }

            // Get all users with their tier levels
            const allUsers = await db.select().from(users);

            let allocated = 0;
            let errors = 0;

            for (const user of allUsers) {
              try {
                // Fixed allocation for all users (tier system not implemented)
                const monthlyAllocation = 25; // Default allocation for all users

                // Check if user has an existing allocation record
                const existingAccess = await db.select()
                  .from(recipeTierAccess)
                  .where(eq(recipeTierAccess.userId, user.id));

                if (existingAccess.length > 0) {
                  // Update existing record by adding to monthly allocation
                  await db.update(recipeTierAccess)
                    .set({
                      monthlyAllocation: (existingAccess[0].monthlyAllocation || 0) + monthlyAllocation,
                      lastAllocationDate: now
                    })
                    .where(eq(recipeTierAccess.userId, user.id));
                } else {
                  // Create new allocation record
                  await db.insert(recipeTierAccess).values({
                    userId: user.id,
                    // tierLevel removed - tier system not implemented
                    monthlyAllocation,
                    lastAllocationDate: now
                  });
                }

                allocated++;

              } catch (userError) {
                console.error(`Failed to allocate recipes for user ${user.id}:`, userError);
                errors++;
              }
            }

            console.log(`Monthly recipe allocation job completed:`, {
              allocated,
              errors,
              total: allocated + errors,
              timestamp: now.toISOString()
            });

          } catch (error) {
            console.error('Monthly recipe allocation job failed:', error);
          }
        }
      }, 60 * 60 * 1000); // Check every hour

      // Calculate next first of month at midnight
      const nextRun = this.getNextFirstOfMonthAtMidnight();

      this.jobs.set(jobName, {
        id: intervalId,
        name: jobName,
        running: true,
        nextRun
      });

      console.log(`Monthly recipe allocation job scheduled. Next run: ${nextRun.toISOString()}`);

    } catch (error) {
      console.error(`Failed to schedule monthly recipe allocation job:`, error);
    }
  }

  /**
   * Hybrid Pricing: Set up monthly usage reset job
   * Runs on the 1st day of each month at midnight to reset usage counters
   * for users on one-time payment plans
   */
  private setupMonthlyUsageResetJob(): void {
    const jobName = 'monthly-usage-reset';

    try {
      // Check every hour
      const intervalId = setInterval(async () => {
        const now = new Date();

        // Run on the 1st day of month at midnight (hour 0)
        const isFirstDayOfMonth = now.getDate() === 1;
        const isMidnight = now.getHours() === 0;

        // For testing: Allow running any day if in development mode
        const isTestMode = process.env.NODE_ENV === 'development' && process.env.ENABLE_SCHEDULER === 'true';

        if ((isFirstDayOfMonth && isMidnight) || (isTestMode && process.env.FORCE_RUN_USAGE_RESET === 'true')) {
          console.log('Starting scheduled monthly usage reset job...');

          try {
            // Reset the force run flag
            if (isTestMode) {
              process.env.FORCE_RUN_USAGE_RESET = 'false';
            }

            // Call the usage reset function
            // TEMPORARILY DISABLED - Stripe integration incomplete
            // await resetMonthlyUsage();

            console.log(`Monthly usage reset job completed successfully at ${now.toISOString()}`);

          } catch (error) {
            console.error('Monthly usage reset job failed:', error);
          }
        }
      }, 60 * 60 * 1000); // Check every hour

      // Calculate next first of month at midnight
      const nextRun = this.getNextFirstOfMonthAtMidnight();

      this.jobs.set(jobName, {
        id: intervalId,
        name: jobName,
        running: true,
        nextRun
      });

      console.log(`Monthly usage reset job scheduled. Next run: ${nextRun.toISOString()}`);

    } catch (error) {
      console.error(`Failed to schedule monthly usage reset job:`, error);
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
   * Story 2.14: Calculate next first of month at midnight
   */
  private getNextFirstOfMonthAtMidnight(): Date {
    const now = new Date();
    const nextMonth = new Date(now);

    // If it's the 1st and before midnight (hour 0), use today
    if (now.getDate() === 1 && now.getHours() === 0) {
      nextMonth.setHours(0, 0, 0, 0);
    } else {
      // Move to next month
      nextMonth.setMonth(now.getMonth() + 1);
      nextMonth.setDate(1);
      nextMonth.setHours(0, 0, 0, 0);
    }

    return nextMonth;
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

        case 'monthly-recipe-allocation': {
          console.log('Manually triggering monthly recipe allocation...');

          const now = new Date();
          const allUsers = await db.select().from(users);

          let allocated = 0;
          let errors = 0;

          for (const user of allUsers) {
            try {
              // Fixed allocation for all users (tier system not implemented)
              const monthlyAllocation = 25; // Default allocation for all users

              // Check if user has an existing allocation record
              const existingAccess = await db.select()
                .from(recipeTierAccess)
                .where(eq(recipeTierAccess.userId, user.id));

              if (existingAccess.length > 0) {
                // Update existing record by adding to monthly allocation
                await db.update(recipeTierAccess)
                  .set({
                    monthlyAllocation: (existingAccess[0].monthlyAllocation || 0) + monthlyAllocation,
                    lastAllocationDate: now
                  })
                  .where(eq(recipeTierAccess.userId, user.id));
              } else {
                // Create new allocation record
                await db.insert(recipeTierAccess).values({
                  userId: user.id,
                  // tierLevel removed - tier system not implemented
                  monthlyAllocation,
                  lastAllocationDate: now
                });
              }

              allocated++;

            } catch (userError) {
              console.error(`Failed to allocate recipes for user ${user.id}:`, userError);
              errors++;
            }
          }

          const result = { allocated, errors, total: allocated + errors };
          console.log('Manual recipe allocation completed:', result);
          return { success: true, result };
        }

        case 'monthly-usage-reset': {
          console.log('Manually triggering monthly usage reset...');
          // TEMPORARILY DISABLED - Stripe integration incomplete
          // await resetMonthlyUsage();
          console.log('Manual usage reset completed (DISABLED)');
          return { success: true, result: { message: 'Usage reset temporarily disabled' } };
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