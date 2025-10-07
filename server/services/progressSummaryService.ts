import { db } from '../db';
import { 
  users,
  progressMeasurements,
  customerGoals,
  recipeFavorites,
  recipeInteractions,
  recipeRatings,
  personalizedMealPlans,
  userActivitySessions,
  emailPreferences
} from '@shared/schema';
import { emailService, type ProgressSummaryEmailData } from './emailService';
import { eq, and, gte, lte, count, desc, sql } from 'drizzle-orm';

export interface WeeklyProgressData {
  customerId: string;
  customerName: string;
  customerEmail: string;
  trainerId: string;
  trainerName: string;
  trainerEmail: string;
  weekStartDate: Date;
  weekEndDate: Date;
  progressData: {
    measurementChanges?: {
      weightChange?: { previous: number; current: number; unit: string };
      bodyFatChange?: { previous: number; current: number };
      measurements?: Array<{ name: string; change: number; unit: string }>;
    };
    goalsProgress?: Array<{
      goalName: string;
      progressPercentage: number;
      targetValue: number;
      currentValue: number;
      unit: string;
      status: string;
    }>;
    mealPlanCompliance?: {
      assignedMealPlans: number;
      completedMealPlans: number;
      favoriteRecipes: string[];
    };
    engagementStats?: {
      recipesViewed: number;
      favoritesAdded: number;
      ratingsGiven: number;
    };
  };
  nextSteps?: string[];
  motivationalMessage?: string;
}

export class ProgressSummaryService {
  private static instance: ProgressSummaryService;

  public static getInstance(): ProgressSummaryService {
    if (!ProgressSummaryService.instance) {
      ProgressSummaryService.instance = new ProgressSummaryService();
    }
    return ProgressSummaryService.instance;
  }

  /**
   * Generate weekly progress summary data for a customer
   */
  async generateWeeklyProgressSummary(customerId: string, weekStartDate: Date, weekEndDate: Date): Promise<WeeklyProgressData | null> {
    try {
      // Get customer and trainer information
      const customerData = await this.getCustomerAndTrainerInfo(customerId);
      if (!customerData) {
        console.log(`Customer ${customerId} not found or has no trainer assigned`);
        return null;
      }

      // Collect all progress data
      const measurementChanges = await this.getMeasurementChanges(customerId, weekStartDate, weekEndDate);
      const goalsProgress = await this.getGoalsProgress(customerId);
      const mealPlanCompliance = await this.getMealPlanCompliance(customerId, weekStartDate, weekEndDate);
      const engagementStats = await this.getEngagementStats(customerId, weekStartDate, weekEndDate);
      
      // Generate next steps and motivational message based on progress
      const nextSteps = this.generateNextSteps(measurementChanges, goalsProgress, engagementStats);
      const motivationalMessage = this.generateMotivationalMessage(measurementChanges, goalsProgress);

      return {
        customerId: customerData.customerId,
        customerName: customerData.customerName,
        customerEmail: customerData.customerEmail,
        trainerId: customerData.trainerId,
        trainerName: customerData.trainerName,
        trainerEmail: customerData.trainerEmail,
        weekStartDate,
        weekEndDate,
        progressData: {
          measurementChanges,
          goalsProgress,
          mealPlanCompliance,
          engagementStats
        },
        nextSteps,
        motivationalMessage
      };

    } catch (error) {
      console.error('Error generating weekly progress summary:', error);
      return null;
    }
  }

  /**
   * Send weekly progress summary email for all customers
   */
  async sendWeeklyProgressSummariesForAllCustomers(): Promise<{ sent: number; errors: number; results: Array<{ customerId: string; success: boolean; error?: string }> }> {
    const results: Array<{ customerId: string; success: boolean; error?: string }> = [];
    let sent = 0;
    let errors = 0;

    try {
      // Get all customers who have trainers
      const customersWithTrainers = await db
        .select({
          customerId: personalizedMealPlans.customerId
        })
        .from(personalizedMealPlans)
        .groupBy(personalizedMealPlans.customerId);

      // Calculate week range (previous Monday to Sunday)
      const today = new Date();
      const lastMonday = new Date(today);
      lastMonday.setDate(today.getDate() - today.getDay() - 6); // Previous Monday
      lastMonday.setHours(0, 0, 0, 0);

      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastMonday.getDate() + 6);
      lastSunday.setHours(23, 59, 59, 999);

      console.log(`Generating progress summaries for week: ${lastMonday.toDateString()} to ${lastSunday.toDateString()}`);

      // Process each customer
      for (const { customerId } of customersWithTrainers) {
        try {
          // Check email preferences first
          const [emailPref] = await db
            .select()
            .from(emailPreferences)
            .where(eq(emailPreferences.userId, customerId))
            .limit(1);

          // Skip if user has disabled progress summaries
          if (emailPref && !emailPref.weeklyProgressSummaries) {
            console.log(`Skipping progress summary for customer ${customerId} - disabled in preferences`);
            results.push({ customerId, success: true, error: 'Progress summaries disabled in user preferences' });
            continue;
          }

          const progressData = await this.generateWeeklyProgressSummary(customerId, lastMonday, lastSunday);
          
          if (progressData) {
            const emailResult = await emailService.sendProgressSummaryEmail(progressData);
            
            if (emailResult.success) {
              sent++;
              results.push({ customerId, success: true });
              console.log(`Progress summary sent successfully to customer ${customerId}`);
            } else {
              errors++;
              results.push({ customerId, success: false, error: emailResult.error });
              console.error(`Failed to send progress summary to customer ${customerId}: ${emailResult.error}`);
            }
          } else {
            errors++;
            results.push({ customerId, success: false, error: 'Failed to generate progress data' });
            console.warn(`No progress data generated for customer ${customerId}`);
          }

          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          errors++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.push({ customerId, success: false, error: errorMessage });
          console.error(`Error processing customer ${customerId}:`, error);
        }
      }

      console.log(`Weekly progress summaries completed: ${sent} sent, ${errors} errors`);
      return { sent, errors, results };

    } catch (error) {
      console.error('Error sending weekly progress summaries:', error);
      return { sent: 0, errors: 1, results: [{ customerId: 'all', success: false, error: error instanceof Error ? error.message : 'Unknown error' }] };
    }
  }

  /**
   * Get customer and their trainer information
   */
  private async getCustomerAndTrainerInfo(customerId: string) {
    const [customerWithTrainer] = await db
      .select({
        customerId: users.id,
        customerName: users.name,
        customerEmail: users.email,
        trainerId: personalizedMealPlans.trainerId
      })
      .from(users)
      .innerJoin(personalizedMealPlans, eq(personalizedMealPlans.customerId, users.id))
      .where(eq(users.id, customerId))
      .limit(1);

    if (!customerWithTrainer) {
      return null;
    }

    const [trainerInfo] = await db
      .select({
        trainerName: users.name,
        trainerEmail: users.email
      })
      .from(users)
      .where(eq(users.id, customerWithTrainer.trainerId))
      .limit(1);

    if (!trainerInfo) {
      return null;
    }

    return {
      customerId: customerWithTrainer.customerId,
      customerName: customerWithTrainer.customerName || 'Customer',
      customerEmail: customerWithTrainer.customerEmail,
      trainerId: customerWithTrainer.trainerId,
      trainerName: trainerInfo.trainerName || 'Your Trainer',
      trainerEmail: trainerInfo.trainerEmail
    };
  }

  /**
   * Get measurement changes for the week
   */
  private async getMeasurementChanges(customerId: string, weekStartDate: Date, weekEndDate: Date) {
    try {
      // Get measurements from this week
      const thisWeekMeasurements = await db
        .select()
        .from(progressMeasurements)
        .where(
          and(
            eq(progressMeasurements.customerId, customerId),
            gte(progressMeasurements.measurementDate, weekStartDate),
            lte(progressMeasurements.measurementDate, weekEndDate)
          )
        )
        .orderBy(desc(progressMeasurements.measurementDate))
        .limit(1);

      // Get most recent measurement before this week
      const previousMeasurements = await db
        .select()
        .from(progressMeasurements)
        .where(
          and(
            eq(progressMeasurements.customerId, customerId),
            lte(progressMeasurements.measurementDate, weekStartDate)
          )
        )
        .orderBy(desc(progressMeasurements.measurementDate))
        .limit(1);

      if (thisWeekMeasurements.length === 0 || previousMeasurements.length === 0) {
        return undefined;
      }

      const current = thisWeekMeasurements[0];
      const previous = previousMeasurements[0];

      const changes: any = {};

      // Weight change
      if (current.weightKg && previous.weightKg) {
        changes.weightChange = {
          previous: parseFloat(previous.weightKg.toString()),
          current: parseFloat(current.weightKg.toString()),
          unit: 'kg'
        };
      } else if (current.weightLbs && previous.weightLbs) {
        changes.weightChange = {
          previous: parseFloat(previous.weightLbs.toString()),
          current: parseFloat(current.weightLbs.toString()),
          unit: 'lbs'
        };
      }

      // Body fat change
      if (current.bodyFatPercentage && previous.bodyFatPercentage) {
        changes.bodyFatChange = {
          previous: parseFloat(previous.bodyFatPercentage.toString()),
          current: parseFloat(current.bodyFatPercentage.toString())
        };
      }

      return Object.keys(changes).length > 0 ? changes : undefined;

    } catch (error) {
      console.error('Error getting measurement changes:', error);
      return undefined;
    }
  }

  /**
   * Get goals progress
   */
  private async getGoalsProgress(customerId: string) {
    try {
      const goals = await db
        .select()
        .from(customerGoals)
        .where(eq(customerGoals.customerId, customerId))
        .orderBy(desc(customerGoals.createdAt));

      return goals.map(goal => ({
        goalName: goal.goalName,
        progressPercentage: goal.progressPercentage || 0,
        targetValue: parseFloat(goal.targetValue?.toString() || '0'),
        currentValue: parseFloat(goal.currentValue?.toString() || '0'),
        unit: goal.targetUnit || '',
        status: goal.status || 'active'
      }));

    } catch (error) {
      console.error('Error getting goals progress:', error);
      return undefined;
    }
  }

  /**
   * Get meal plan compliance data
   */
  private async getMealPlanCompliance(customerId: string, weekStartDate: Date, weekEndDate: Date) {
    try {
      // Count assigned meal plans
      const assignedCount = await db
        .select({ count: count() })
        .from(personalizedMealPlans)
        .where(eq(personalizedMealPlans.customerId, customerId));

      // Get favorite recipes added this week
      const weeklyFavorites = await db
        .select({
          recipeName: sql`'Recipe'`
        })
        .from(recipeFavorites)
        .where(
          and(
            eq(recipeFavorites.userId, customerId),
            gte(recipeFavorites.favoriteDate, weekStartDate),
            lte(recipeFavorites.favoriteDate, weekEndDate)
          )
        );

      return {
        assignedMealPlans: assignedCount[0]?.count || 0,
        completedMealPlans: assignedCount[0]?.count || 0, // Simplification - assume all assigned are completed
        favoriteRecipes: weeklyFavorites.map(f => f.recipeName)
      };

    } catch (error) {
      console.error('Error getting meal plan compliance:', error);
      return undefined;
    }
  }

  /**
   * Get engagement statistics for the week
   */
  private async getEngagementStats(customerId: string, weekStartDate: Date, weekEndDate: Date) {
    try {
      // Get recipe views this week
      const recipeViews = await db
        .select({ count: count() })
        .from(recipeInteractions)
        .where(
          and(
            eq(recipeInteractions.userId, customerId),
            eq(recipeInteractions.interactionType, 'view'),
            gte(recipeInteractions.interactionDate, weekStartDate),
            lte(recipeInteractions.interactionDate, weekEndDate)
          )
        );

      // Get favorites added this week
      const favoritesAdded = await db
        .select({ count: count() })
        .from(recipeFavorites)
        .where(
          and(
            eq(recipeFavorites.userId, customerId),
            gte(recipeFavorites.favoriteDate, weekStartDate),
            lte(recipeFavorites.favoriteDate, weekEndDate)
          )
        );

      // Get ratings given this week
      const ratingsGiven = await db
        .select({ count: count() })
        .from(recipeRatings)
        .where(
          and(
            eq(recipeRatings.userId, customerId),
            gte(recipeRatings.createdAt, weekStartDate),
            lte(recipeRatings.createdAt, weekEndDate)
          )
        );

      return {
        recipesViewed: Number(recipeViews[0]?.count || 0),
        favoritesAdded: Number(favoritesAdded[0]?.count || 0),
        ratingsGiven: Number(ratingsGiven[0]?.count || 0)
      };

    } catch (error) {
      console.error('Error getting engagement stats:', error);
      return undefined;
    }
  }

  /**
   * Generate next steps based on progress data
   */
  private generateNextSteps(measurementChanges: any, goalsProgress: any, engagementStats: any): string[] {
    const steps: string[] = [];

    // Weight-based recommendations
    if (measurementChanges?.weightChange) {
      const change = measurementChanges.weightChange.current - measurementChanges.weightChange.previous;
      if (Math.abs(change) < 0.5) {
        steps.push("Continue with your current meal plan - you're maintaining steady progress!");
      } else if (change > 2) {
        steps.push("Consider reviewing portion sizes with your trainer to optimize your weight goals.");
      }
    }

    // Goals-based recommendations
    if (goalsProgress && goalsProgress.length > 0) {
      const activeGoals = goalsProgress.filter((g: any) => g.status === 'active');
      const nearCompletionGoals = activeGoals.filter((g: any) => g.progressPercentage > 80);
      
      if (nearCompletionGoals.length > 0) {
        steps.push(`You're close to achieving ${nearCompletionGoals.length} goal(s)! Keep pushing forward.`);
      }
      
      const stalledGoals = activeGoals.filter((g: any) => g.progressPercentage < 25);
      if (stalledGoals.length > 0) {
        steps.push("Consider discussing goal adjustments with your trainer for better success.");
      }
    }

    // Engagement-based recommendations
    if (engagementStats) {
      if (engagementStats.recipesViewed < 5) {
        steps.push("Try exploring more recipes to discover new favorites and maintain variety in your diet.");
      }
      
      if (engagementStats.ratingsGiven === 0) {
        steps.push("Share feedback by rating recipes you've tried - it helps improve your recommendations!");
      }
    }

    // Default recommendations if no specific data
    if (steps.length === 0) {
      steps.push("Keep logging your progress regularly for better insights.");
      steps.push("Stay consistent with your meal plans and track your favorite recipes.");
      steps.push("Reach out to your trainer if you have questions or need guidance.");
    }

    return steps.slice(0, 4); // Limit to 4 steps
  }

  /**
   * Generate motivational message based on progress
   */
  private generateMotivationalMessage(measurementChanges: any, goalsProgress: any): string {
    const messages = [
      "Progress isn't always linear, but every step forward counts! 🌟",
      "Your dedication to your health journey is inspiring. Keep it up! 💪",
      "Small consistent actions lead to big results. You're doing great! ✨",
      "Every healthy choice you make is an investment in your future self! 🚀",
      "Remember: progress over perfection. You're exactly where you need to be! 💫"
    ];

    // Customize message based on progress
    if (measurementChanges?.weightChange) {
      const change = measurementChanges.weightChange.current - measurementChanges.weightChange.previous;
      if (change < 0) {
        return "Excellent work this week! Your commitment is showing real results. Keep up the fantastic progress! 🎉";
      } else if (Math.abs(change) < 0.5) {
        return "Steady as you go! Consistency is key, and you're demonstrating it beautifully. Trust the process! 🌱";
      }
    }

    if (goalsProgress && goalsProgress.length > 0) {
      const avgProgress = goalsProgress.reduce((sum: number, goal: any) => sum + goal.progressPercentage, 0) / goalsProgress.length;
      if (avgProgress > 70) {
        return "You're crushing your goals! Your hard work and dedication are truly paying off. Amazing job! 🏆";
      }
    }

    // Return a random motivational message
    return messages[Math.floor(Math.random() * messages.length)];
  }
}

// Export singleton instance
export const progressSummaryService = ProgressSummaryService.getInstance();