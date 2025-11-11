/**
 * Meal Type Service
 *
 * Story 2.15: Meal Type Tier Enforcement
 *
 * Handles tier-based meal type filtering for:
 * - Starter: 5 basic types
 * - Professional: 10 types (starter + 5 additional)
 * - Enterprise: 17 types (all types)
 *
 * Progressive access model: Higher tiers access all lower tier meal types.
 */

import { db } from '../db';
import { recipeTypeCategories } from '@shared/schema';
import { sql, and, lte } from 'drizzle-orm';

export type TierLevel = 'starter' | 'professional' | 'enterprise';

export interface MealType {
  id: string;
  name: string;
  displayName: string;
  tierLevel: TierLevel;
  isSeasonal: boolean;
  sortOrder: number;
  isAccessible?: boolean; // For UI display
  requiresUpgrade?: boolean; // For UI display
}

const tierHierarchy: Record<TierLevel, number> = {
  starter: 1,
  professional: 2,
  enterprise: 3,
};

class MealTypeService {
  /**
   * Get meal types accessible by the given tier level
   * Progressive access: Higher tiers can access all lower tier types
   */
  async getAccessibleMealTypes(userTier: TierLevel): Promise<MealType[]> {
    const userTierLevel = tierHierarchy[userTier];

    // Get all meal types where tier_level <= user's tier
    const mealTypes = await db
      .select()
      .from(recipeTypeCategories)
      .where(
        sql`
          CASE ${recipeTypeCategories.tierLevel}
            WHEN 'starter' THEN 1
            WHEN 'professional' THEN 2
            WHEN 'enterprise' THEN 3
          END <= ${userTierLevel}
        `
      )
      .orderBy(recipeTypeCategories.sortOrder);

    return mealTypes.map(mt => ({
      id: mt.id,
      name: mt.name,
      displayName: mt.displayName,
      tierLevel: mt.tierLevel,
      isSeasonal: mt.isSeasonal,
      sortOrder: mt.sortOrder,
      isAccessible: true,
    }));
  }

  /**
   * Get all meal types with accessibility status for UI display
   * Shows locked meal types with upgrade prompts
   */
  async getAllMealTypesWithStatus(userTier: TierLevel): Promise<MealType[]> {
    const userTierLevel = tierHierarchy[userTier];

    const allMealTypes = await db
      .select()
      .from(recipeTypeCategories)
      .orderBy(recipeTypeCategories.sortOrder);

    return allMealTypes.map(mt => {
      const requiredTierLevel = tierHierarchy[mt.tierLevel];
      const isAccessible = requiredTierLevel <= userTierLevel;

      return {
        id: mt.id,
        name: mt.name,
        displayName: mt.displayName,
        tierLevel: mt.tierLevel,
        isSeasonal: mt.isSeasonal,
        sortOrder: mt.sortOrder,
        isAccessible,
        requiresUpgrade: !isAccessible,
      };
    });
  }

  /**
   * Check if a specific meal type is accessible for the given tier
   */
  async isMealTypeAccessible(mealTypeName: string, userTier: TierLevel): Promise<boolean> {
    const mealType = await db
      .select()
      .from(recipeTypeCategories)
      .where(sql`${recipeTypeCategories.name} = ${mealTypeName}`)
      .limit(1);

    if (mealType.length === 0) {
      return false; // Unknown meal type
    }

    const requiredTierLevel = tierHierarchy[mealType[0].tierLevel];
    const userTierLevel = tierHierarchy[userTier];

    return userTierLevel >= requiredTierLevel;
  }

  /**
   * Get meal type names accessible by tier (for filtering recipes)
   */
  async getAccessibleMealTypeNames(userTier: TierLevel): Promise<string[]> {
    const mealTypes = await this.getAccessibleMealTypes(userTier);
    return mealTypes.map(mt => mt.name);
  }

  /**
   * Get tier requirement for a meal type
   */
  async getMealTypeTierRequirement(mealTypeName: string): Promise<TierLevel | null> {
    const mealType = await db
      .select()
      .from(recipeTypeCategories)
      .where(sql`${recipeTypeCategories.name} = ${mealTypeName}`)
      .limit(1);

    if (mealType.length === 0) {
      return null;
    }

    return mealType[0].tierLevel;
  }

  /**
   * Filter seasonal meal types (Professional+ only)
   */
  async getSeasonalMealTypes(userTier: TierLevel): Promise<MealType[]> {
    // Seasonal recipes are Professional+ only
    if (userTier === 'starter') {
      return [];
    }

    const userTierLevel = tierHierarchy[userTier];

    const seasonalTypes = await db
      .select()
      .from(recipeTypeCategories)
      .where(
        and(
          sql`${recipeTypeCategories.isSeasonal} = true`,
          sql`
            CASE ${recipeTypeCategories.tierLevel}
              WHEN 'starter' THEN 1
              WHEN 'professional' THEN 2
              WHEN 'enterprise' THEN 3
            END <= ${userTierLevel}
          `
        )
      )
      .orderBy(recipeTypeCategories.sortOrder);

    return seasonalTypes.map(mt => ({
      id: mt.id,
      name: mt.name,
      displayName: mt.displayName,
      tierLevel: mt.tierLevel,
      isSeasonal: mt.isSeasonal,
      sortOrder: mt.sortOrder,
      isAccessible: true,
    }));
  }

  /**
   * Get tier distribution summary
   */
  async getTierDistribution(): Promise<{
    starter: number;
    professional: number;
    enterprise: number;
    total: number;
  }> {
    const distribution = await db
      .select({
        tierLevel: recipeTypeCategories.tierLevel,
        count: sql<number>`count(*)`,
      })
      .from(recipeTypeCategories)
      .groupBy(recipeTypeCategories.tierLevel);

    const result = {
      starter: 0,
      professional: 0,
      enterprise: 0,
      total: 0,
    };

    distribution.forEach(item => {
      const tier = item.tierLevel as TierLevel;
      const count = Number(item.count);
      result[tier] = count;
      result.total += count;
    });

    return result;
  }
}

export const mealTypeService = new MealTypeService();
