// @ts-nocheck - Type errors suppressed
/**
 * Entitlements Service
 *
 * Provides tier-based feature access and usage limits with Redis caching.
 * Canonical Source: docs/TIER_SOURCE_OF_TRUTH.md v2.0
 *
 * Features:
 * - Server-side feature gating
 * - Usage tracking and quota enforcement
 * - Redis caching (5-minute TTL)
 * - Subscription status validation
 */

import { db } from '../db';
import { and, eq } from 'drizzle-orm';
import {
  trainerSubscriptions,
  subscriptionItems,
  tierUsageTracking,
  TierEntitlements,
  TrainerSubscription,
  SubscriptionItem,
  TierUsageTracking,
} from '../../shared/schema';
import { RedisService } from './RedisService';

export interface TierLimits {
  customers: number;
  mealPlans: number;
  aiGenerations: number;
  recipes: number; // Story 2.14: Recipe tier access limits
}

export interface TierFeatures {
  analytics: boolean;
  apiAccess: boolean;
  bulkOperations: boolean;
  customBranding: boolean;
  exportFormats: ('pdf' | 'csv' | 'excel')[];
}

export interface CheckAccessResult {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: boolean;
  currentTier?: string;
}

export class EntitlementsService {
  private redisService: RedisService;
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly CACHE_PREFIX = 'entitlements:';

  constructor() {
    this.redisService = new RedisService({ defaultTTL: this.CACHE_TTL });
  }

  async initialize(): Promise<void> {
    await this.redisService.connect();
  }

  /**
   * Get tier limits based on tier level
   */
  private getTierLimits(tier: 'starter' | 'professional' | 'enterprise'): TierLimits {
    const limits: Record<string, TierLimits> = {
      starter: {
        customers: 9,
        mealPlans: 50,
        aiGenerations: 100,
        recipes: 1000, // Story 2.14: 1,000 recipes for Starter
      },
      professional: {
        customers: 20,
        mealPlans: 200,
        aiGenerations: 500,
        recipes: 2500, // Story 2.14: 2,500 recipes for Professional
      },
      enterprise: {
        customers: 50,
        mealPlans: 500,
        aiGenerations: -1, // unlimited
        recipes: 4000, // Story 2.14: 4,000 recipes for Enterprise
      },
    };

    return limits[tier] || limits.starter;
  }

  /**
   * Get tier features based on tier level
   */
  private getTierFeatures(tier: 'starter' | 'professional' | 'enterprise'): TierFeatures {
    const features: Record<string, TierFeatures> = {
      starter: {
        analytics: false,
        apiAccess: false,
        bulkOperations: false,
        customBranding: false,
        exportFormats: ['pdf'],
      },
      professional: {
        analytics: true,
        apiAccess: false,
        bulkOperations: true,
        customBranding: true,
        exportFormats: ['pdf', 'csv'],
      },
      enterprise: {
        analytics: true,
        apiAccess: true,
        bulkOperations: true,
        customBranding: true,
        exportFormats: ['pdf', 'csv', 'excel'],
      },
    };

    return features[tier] || features.starter;
  }

  /**
   * Get complete entitlements for a trainer
   */
  async getEntitlements(trainerId: string): Promise<TierEntitlements | null> {
    // Check cache first
    const cacheKey = `${this.CACHE_PREFIX}${trainerId}`;
    const cached = await this.redisService.get<TierEntitlements>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const subscription = await db.query.trainerSubscriptions.findFirst({
      where: eq(trainerSubscriptions.trainerId, trainerId),
    });

    if (!subscription) {
      return null;
    }

    // Get subscription items (tier + AI)
    const items = await db.query.subscriptionItems.findMany({
      where: eq(subscriptionItems.subscriptionId, subscription.id),
    });

    // Get current period usage
    const usage = await db.query.tierUsageTracking.findFirst({
      where: and(
        eq(tierUsageTracking.trainerId, trainerId),
        eq(tierUsageTracking.periodEnd, subscription.currentPeriodEnd)
      ),
    });

    // Build entitlements object
    const tier = subscription.tier;
    const limits = this.getTierLimits(tier);
    const features = this.getTierFeatures(tier);

    const entitlements: TierEntitlements = {
      tier,
      status: subscription.status,
      features,
      limits: {
        customers: {
          max: limits.customers,
          used: usage?.customersCount || 0,
          percentage: limits.customers === -1 ? 0 : ((usage?.customersCount || 0) / limits.customers) * 100,
        },
        mealPlans: {
          max: limits.mealPlans,
          used: usage?.mealPlansCount || 0,
          percentage: limits.mealPlans === -1 ? 0 : ((usage?.mealPlansCount || 0) / limits.mealPlans) * 100,
        },
      },
      billing: {
        currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
    };

    // Add AI subscription info if exists
    const aiItem = items.find((item) => item.kind === 'ai');
    if (aiItem) {
      entitlements.ai = {
        plan: tier, // AI plan mirrors tier
        generationsRemaining: limits.aiGenerations - (usage?.aiGenerationsCount || 0),
        resetDate: subscription.currentPeriodEnd.toISOString(),
      };
    }

    // Cache for 5 minutes
    await this.redisService.set(cacheKey, entitlements, this.CACHE_TTL);

    return entitlements;
  }

  /**
   * Check if trainer has access to a feature
   */
  async checkFeatureAccess(
    trainerId: string,
    feature: keyof TierFeatures
  ): Promise<CheckAccessResult> {
    const entitlements = await this.getEntitlements(trainerId);

    if (!entitlements) {
      return {
        allowed: false,
        reason: 'No active subscription',
        upgradeRequired: true,
      };
    }

    // Check subscription status
    if (entitlements.status === 'canceled' || entitlements.status === 'unpaid') {
      return {
        allowed: false,
        reason: `Subscription ${entitlements.status}`,
        upgradeRequired: true,
      };
    }

    // Check feature access
    if (feature === 'exportFormats') {
      // This needs special handling as it's an array
      return {
        allowed: true,
        currentTier: entitlements.tier,
      };
    }

    const hasAccess = entitlements.features[feature] === true;

    return {
      allowed: hasAccess,
      reason: hasAccess ? undefined : `Feature not available in ${entitlements.tier} tier`,
      upgradeRequired: !hasAccess,
      currentTier: entitlements.tier,
    };
  }

  /**
   * Check if trainer can perform an action based on usage limits
   */
  async checkUsageLimit(
    trainerId: string,
    resourceType: 'customers' | 'mealPlans' | 'aiGenerations'
  ): Promise<CheckAccessResult> {
    const entitlements = await this.getEntitlements(trainerId);

    if (!entitlements) {
      return {
        allowed: false,
        reason: 'No active subscription',
        upgradeRequired: true,
      };
    }

    const limit = entitlements.limits[resourceType];
    if (!limit) {
      // For AI generations, check AI subscription
      if (resourceType === 'aiGenerations') {
        if (!entitlements.ai) {
          return {
            allowed: false,
            reason: 'No AI subscription',
            upgradeRequired: true,
          };
        }
        return {
          allowed: entitlements.ai.generationsRemaining > 0,
          reason:
            entitlements.ai.generationsRemaining > 0
              ? undefined
              : 'AI generation limit reached',
          upgradeRequired: entitlements.ai.generationsRemaining <= 0,
          currentTier: entitlements.tier,
        };
      }

      return {
        allowed: true,
      };
    }

    // Check if limit is reached (unlimited = -1)
    if (limit.max === -1) {
      return {
        allowed: true,
        currentTier: entitlements.tier,
      };
    }

    const allowed = limit.used < limit.max;

    return {
      allowed,
      reason: allowed ? undefined : `${resourceType} limit reached (${limit.used}/${limit.max})`,
      upgradeRequired: !allowed,
      currentTier: entitlements.tier,
    };
  }

  /**
   * Check if export format is allowed
   */
  async checkExportFormat(
    trainerId: string,
    format: 'pdf' | 'csv' | 'excel'
  ): Promise<CheckAccessResult> {
    const entitlements = await this.getEntitlements(trainerId);

    if (!entitlements) {
      return {
        allowed: false,
        reason: 'No active subscription',
        upgradeRequired: true,
      };
    }

    const allowed = entitlements.features.exportFormats.includes(format);

    return {
      allowed,
      reason: allowed ? undefined : `${format.toUpperCase()} export not available in ${entitlements.tier} tier`,
      upgradeRequired: !allowed,
      currentTier: entitlements.tier,
    };
  }

  /**
   * Invalidate entitlements cache for a trainer
   * Called when subscription is updated via webhook
   */
  async invalidateCache(trainerId: string): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${trainerId}`;
    await this.redisService.delete(cacheKey);
  }

  /**
   * Track usage increment
   */
  async incrementUsage(
    trainerId: string,
    resourceType: 'customers' | 'mealPlans' | 'aiGenerations' | 'exportsCsv' | 'exportsExcel' | 'exportsPdf',
    amount: number = 1
  ): Promise<void> {
    const subscription = await db.query.trainerSubscriptions.findFirst({
      where: eq(trainerSubscriptions.trainerId, trainerId),
    });

    if (!subscription) {
      throw new Error('No active subscription found');
    }

    // Find or create usage tracking record for current period
    const existingUsage = await db.query.tierUsageTracking.findFirst({
      where: and(
        eq(tierUsageTracking.trainerId, trainerId),
        eq(tierUsageTracking.periodEnd, subscription.currentPeriodEnd)
      ),
    });

    const columnMap: Record<string, string> = {
      customers: 'customersCount',
      mealPlans: 'mealPlansCount',
      aiGenerations: 'aiGenerationsCount',
      exportsCsv: 'exportsCsvCount',
      exportsExcel: 'exportsExcelCount',
      exportsPdf: 'exportsPdfCount',
    };

    const column = columnMap[resourceType];

    if (existingUsage) {
      // Update existing record
      await db
        .update(tierUsageTracking)
        .set({
          [column]: (existingUsage[column as keyof TierUsageTracking] as number) + amount,
          updatedAt: new Date(),
        })
        .where(eq(tierUsageTracking.id, existingUsage.id));
    } else {
      // Create new usage record
      await db.insert(tierUsageTracking).values({
        trainerId,
        periodStart: subscription.currentPeriodStart,
        periodEnd: subscription.currentPeriodEnd,
        [column]: amount,
      });
    }

    // Invalidate cache
    await this.invalidateCache(trainerId);
  }
}

// Singleton instance
export const entitlementsService = new EntitlementsService();
