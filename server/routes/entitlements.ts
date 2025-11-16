/**
 * Entitlements Routes
 *
 * Provides tier information and feature access for authenticated users
 */

import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { db } from '../db';
import { eq, sql } from 'drizzle-orm';
import { trainerSubscriptions, mealPlanAssignments, trainerMealPlans } from '../../shared/schema';

export const entitlementsRouter = Router();

/**
 * GET /api/entitlements
 * Get current user's tier and entitlements
 */
entitlementsRouter.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Tier limits configuration
    const tierLimits = {
      starter: { customers: 9, mealPlans: 50 },
      professional: { customers: 20, mealPlans: 200 },
      enterprise: { customers: -1, mealPlans: -1 }, // -1 means unlimited
    };

    // Only trainers have tiers
    if (userRole !== 'trainer') {
      return res.json({
        success: true,
        tier: 'starter', // Default for non-trainers
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        cancelAtPeriodEnd: false,
        features: {
          recipeCount: 1000,
          mealTypeCount: 5,
          canUploadLogo: false,
          canCustomizeColors: false,
          canEnableWhiteLabel: false,
          canSetCustomDomain: false,
        },
        limits: {
          customers: { max: 0, used: 0, percentage: 0 },
          mealPlans: { max: 0, used: 0, percentage: 0 },
        },
      });
    }

    // Fetch trainer subscription
    const subscription = await db.query.trainerSubscriptions.findFirst({
      where: eq(trainerSubscriptions.trainerId, userId),
      orderBy: (subs, { desc }) => [desc(subs.createdAt)],
    });

    // Fetch actual usage counts
    const [customersResult, mealPlansResult] = await Promise.all([
      // Count unique customers assigned meal plans by this trainer
      db.select({ count: sql<number>`count(distinct ${mealPlanAssignments.customerId})` })
        .from(mealPlanAssignments)
        .where(eq(mealPlanAssignments.assignedBy, userId)),
      // Count meal plans created by this trainer
      db.select({ count: sql<number>`count(*)` })
        .from(trainerMealPlans)
        .where(eq(trainerMealPlans.trainerId, userId)),
    ]);

    const customersUsed = Number(customersResult[0]?.count ?? 0);
    const mealPlansUsed = Number(mealPlansResult[0]?.count ?? 0);

    // Get tier (default to starter)
    const tier = subscription?.status === 'active' ? subscription.tier : 'starter';
    const limits = tierLimits[tier];

    // Calculate percentages
    const customersPercentage = limits.customers === -1
      ? 0
      : (customersUsed / limits.customers) * 100;
    const mealPlansPercentage = limits.mealPlans === -1
      ? 0
      : (mealPlansUsed / limits.mealPlans) * 100;

    // Default to starter if no subscription found
    if (!subscription || subscription.status !== 'active') {
      return res.json({
        success: true,
        tier: 'starter',
        status: subscription?.status || 'none',
        currentPeriodEnd: subscription?.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
        features: {
          recipeCount: 1000,
          mealTypeCount: 5,
          canUploadLogo: false,
          canCustomizeColors: false,
          canEnableWhiteLabel: false,
          canSetCustomDomain: false,
        },
        limits: {
          customers: {
            max: tierLimits.starter.customers,
            used: customersUsed,
            percentage: customersPercentage
          },
          mealPlans: {
            max: tierLimits.starter.mealPlans,
            used: mealPlansUsed,
            percentage: mealPlansPercentage
          },
        },
      });
    }

    // Return actual tier and features
    const tierFeatures = {
      starter: {
        recipeCount: 1000,
        mealTypeCount: 5,
        canUploadLogo: false,
        canCustomizeColors: false,
        canEnableWhiteLabel: false,
        canSetCustomDomain: false,
      },
      professional: {
        recipeCount: 2500,
        mealTypeCount: 10,
        canUploadLogo: true,
        canCustomizeColors: true,
        canEnableWhiteLabel: false,
        canSetCustomDomain: false,
      },
      enterprise: {
        recipeCount: 4000,
        mealTypeCount: 17,
        canUploadLogo: true,
        canCustomizeColors: true,
        canEnableWhiteLabel: true,
        canSetCustomDomain: true,
      },
    };

    const tierLimit = tierLimits[subscription.tier];
    const customersPct = tierLimit.customers === -1
      ? 0
      : (customersUsed / tierLimit.customers) * 100;
    const mealPlansPct = tierLimit.mealPlans === -1
      ? 0
      : (mealPlansUsed / tierLimit.mealPlans) * 100;

    res.json({
      success: true,
      tier: subscription.tier,
      status: subscription.status,
      features: tierFeatures[subscription.tier],
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      limits: {
        customers: {
          max: tierLimit.customers,
          used: customersUsed,
          percentage: customersPct
        },
        mealPlans: {
          max: tierLimit.mealPlans,
          used: mealPlansUsed,
          percentage: mealPlansPct
        },
      },
    });
  } catch (error) {
    console.error('[Entitlements API] Failed to fetch entitlements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch entitlements',
    });
  }
});
