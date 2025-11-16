/**
 * Meal Type Routes
 *
 * Story 2.15: Meal Type Tier Enforcement
 *
 * Provides tier-filtered meal type endpoints for:
 * - Recipe search dropdowns
 * - Meal plan generation
 * - Admin/trainer interfaces
 */

import { Router } from 'express';
import { mealTypeService } from '../services/MealTypeService';
import { attachRecipeTierFilter, getUserTierLevel } from '../middleware/tierEnforcement';

export const mealTypeRouter = Router();

/**
 * GET /api/meal-types
 *
 * Get meal types accessible by the current user's tier.
 * Public endpoint with tier filtering based on authentication.
 *
 * Returns:
 * - Starter: 5 meal types
 * - Professional: 10 meal types (starter + professional)
 * - Enterprise: 17 meal types (all)
 */
mealTypeRouter.get('/', attachRecipeTierFilter, async (req, res) => {
  try {
    const userTier = getUserTierLevel(req);
    const mealTypes = await mealTypeService.getAccessibleMealTypes(userTier);

    res.json({
      success: true,
      data: {
        mealTypes,
        userTier,
        count: mealTypes.length,
      },
    });
  } catch (error) {
    console.error('[Meal Types API] Failed to fetch meal types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch meal types',
    });
  }
});

/**
 * GET /api/meal-types/all
 *
 * Get ALL meal types with accessibility status.
 * Used for UI to show locked meal types with upgrade prompts.
 */
mealTypeRouter.get('/all', attachRecipeTierFilter, async (req, res) => {
  try {
    const userTier = getUserTierLevel(req);
    const mealTypes = await mealTypeService.getAllMealTypesWithStatus(userTier);

    const accessible = mealTypes.filter(mt => mt.isAccessible);
    const locked = mealTypes.filter(mt => !mt.isAccessible);

    res.json({
      success: true,
      data: {
        mealTypes,
        userTier,
        accessible: accessible.length,
        locked: locked.length,
        total: mealTypes.length,
      },
    });
  } catch (error) {
    console.error('[Meal Types API] Failed to fetch all meal types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch all meal types',
    });
  }
});

/**
 * GET /api/meal-types/seasonal
 *
 * Get seasonal meal types (Professional+ only).
 * Starter tier users get empty array.
 */
mealTypeRouter.get('/seasonal', attachRecipeTierFilter, async (req, res) => {
  try {
    const userTier = getUserTierLevel(req);
    const seasonalTypes = await mealTypeService.getSeasonalMealTypes(userTier);

    res.json({
      success: true,
      data: {
        mealTypes: seasonalTypes,
        userTier,
        count: seasonalTypes.length,
        requiresUpgrade: userTier === 'starter',
      },
    });
  } catch (error) {
    console.error('[Meal Types API] Failed to fetch seasonal meal types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch seasonal meal types',
    });
  }
});

/**
 * GET /api/meal-types/distribution
 *
 * Get meal type distribution by tier.
 * Useful for admin dashboards and analytics.
 */
mealTypeRouter.get('/distribution', async (req, res) => {
  try {
    const distribution = await mealTypeService.getTierDistribution();

    res.json({
      success: true,
      data: distribution,
    });
  } catch (error) {
    console.error('[Meal Types API] Failed to fetch distribution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch meal type distribution',
    });
  }
});

/**
 * GET /api/meal-types/check/:mealTypeName
 *
 * Check if a specific meal type is accessible.
 * Used for validation before creating recipes or meal plans.
 */
mealTypeRouter.get('/check/:mealTypeName', attachRecipeTierFilter, async (req, res) => {
  try {
    const { mealTypeName } = req.params;
    const userTier = getUserTierLevel(req);

    const isAccessible = await mealTypeService.isMealTypeAccessible(mealTypeName, userTier);
    const requiredTier = await mealTypeService.getMealTypeTierRequirement(mealTypeName);

    res.json({
      success: true,
      data: {
        mealTypeName,
        isAccessible,
        userTier,
        requiredTier,
        requiresUpgrade: !isAccessible,
      },
    });
  } catch (error) {
    console.error('[Meal Types API] Failed to check meal type:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check meal type accessibility',
    });
  }
});
