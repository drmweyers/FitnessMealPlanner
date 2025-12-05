/**
 * Usage Tracking Service
 *
 * Tracks detailed usage events for analytics and reporting:
 * - Meal plan generation events
 * - Recipe creation events
 * - Customer invitation events
 * - PDF export events
 *
 * Stores data in usage_tracking table for:
 * - Usage analytics dashboard
 * - Billing verification
 * - Abuse detection
 * - Feature usage insights
 */

import { db } from '../db';
import { users } from '@shared/schema';
// Import specific tables needed for usage tracking if they exist, otherwise rely on dynamic inserts or correct table names
import { tierUsageTracking } from '@shared/schema';
import { eq, gte, lte, desc } from 'drizzle-orm';

export type UsageAction =
  | 'meal_plan_generated'
  | 'meal_plan_assigned'
  | 'recipe_created'
  | 'recipe_approved'
  | 'customer_invited'
  | 'pdf_exported'
  | 'progress_updated'
  | 'usage_limit_warning'
  | 'usage_limit_exceeded';

interface TrackUsageParams {
  userId: string;
  action: UsageAction;
  resourceId?: string;
  metadata?: Record<string, any>;
}

/**
 * Track a usage event
 * Note: usageTracking table seems missing from schema, falling back to console log or tierUsageTracking if applicable
 * For now, we'll log to console as the schema doesn't have a generic 'usage_tracking' table
 */
export async function trackUsage({
  userId,
  action,
  resourceId,
  metadata = {},
}: TrackUsageParams): Promise<void> {
  try {
    // Schema check: usageTracking table is missing in shared/schema.ts
    // We will log to console for now to avoid runtime errors
    console.log(`[Usage Tracking] User: ${userId}, Action: ${action}, Resource: ${resourceId}`, metadata);
    
    // If we had a generic usage_tracking table, we would insert here.
    // Since we only have tierUsageTracking (which is aggregated counts), we might update that if relevant.
    
  } catch (error) {
    // Log error but don't throw - tracking failures shouldn't break functionality
    console.error('Usage tracking error:', error);
  }
}

/**
 * Get usage summary for a user
 */
export async function getUserUsageSummary(userId: string, days: number = 30) {
  // Implementation stubbed as table is missing
  return {
    totalEvents: 0,
    period: `${days} days`,
    summary: {},
    recentEvents: [], 
  };
}

/**
 * Get usage analytics for admin dashboard
 */
export async function getUsageAnalytics(startDate: Date, endDate: Date) {
   // Implementation stubbed as table is missing
    return {
      totalEvents: 0,
      period: {
        start: startDate,
        end: endDate,
      },
      byAction: [],
      topUsers: [],
      dailyAverage: 0,
    };
}

/**
 * Track meal plan generation with detailed metadata
 */
export async function trackMealPlanGeneration(
  userId: string,
  mealPlanId: string,
  metadata: {
    customerId?: string;
    planName?: string;
    daysCount?: number;
    recipesCount?: number;
    generationMethod?: 'ai' | 'manual';
  }
): Promise<void> {
  await trackUsage({
    userId,
    action: 'meal_plan_generated',
    resourceId: mealPlanId,
    metadata,
  });
}

/**
 * Track when user approaches usage limit (80% threshold)
 */
export async function trackUsageLimitWarning(
  userId: string,
  currentUsage: number,
  limit: number
): Promise<void> {
  await trackUsage({
    userId,
    action: 'usage_limit_warning',
    metadata: {
      currentUsage,
      limit,
      percentage: Math.round((currentUsage / limit) * 100),
    },
  });
}

/**
 * Track when user exceeds usage limit
 */
export async function trackUsageLimitExceeded(
  userId: string,
  currentUsage: number,
  limit: number
): Promise<void> {
  await trackUsage({
    userId,
    action: 'usage_limit_exceeded',
    metadata: {
      currentUsage,
      limit,
      exceededBy: currentUsage - limit,
    },
  });
}

/**
 * Detect potential abuse (unusually high usage in short period)
 */
export async function detectAbusePattern(userId: string): Promise<boolean> {
  // Implementation stubbed as table is missing
  return false;
}
