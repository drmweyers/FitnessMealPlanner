/**
 * Entitlements Routes
 *
 * Provides tier information and feature access for authenticated users
 */

import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { trainerSubscriptions } from '../../shared/schema';

export const entitlementsRouter = Router();

/**
 * GET /api/entitlements
 * Get current user's tier and entitlements
 */
entitlementsRouter.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Only trainers have tiers
    if (userRole !== 'trainer') {
      return res.json({
        success: true,
        tier: 'starter', // Default for non-trainers
        features: {
          recipeCount: 1000,
          mealTypeCount: 5,
          canUploadLogo: false,
          canCustomizeColors: false,
          canEnableWhiteLabel: false,
          canSetCustomDomain: false,
        },
      });
    }

    // Fetch trainer subscription
    const subscription = await db.query.trainerSubscriptions.findFirst({
      where: eq(trainerSubscriptions.trainerId, userId),
      orderBy: (subs, { desc }) => [desc(subs.createdAt)],
    });

    // Default to starter if no subscription found
    if (!subscription || subscription.status !== 'active') {
      return res.json({
        success: true,
        tier: 'starter',
        status: subscription?.status || 'none',
        features: {
          recipeCount: 1000,
          mealTypeCount: 5,
          canUploadLogo: false,
          canCustomizeColors: false,
          canEnableWhiteLabel: false,
          canSetCustomDomain: false,
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

    res.json({
      success: true,
      tier: subscription.tier,
      status: subscription.status,
      features: tierFeatures[subscription.tier],
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    });
  } catch (error) {
    console.error('[Entitlements API] Failed to fetch entitlements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch entitlements',
    });
  }
});
