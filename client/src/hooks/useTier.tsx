/**
 * useTier Hook
 *
 * Fetches and manages user's tier information for UI components
 * Used by TierBadge, MealTypeDropdown, RecipeCount, etc.
 */

import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/hooks/use-user';

export type TierLevel = 'starter' | 'professional' | 'enterprise';

export interface TierInfo {
  tier: TierLevel;
  features: {
    recipeCount: number;
    mealTypeCount: number;
    canUploadLogo: boolean;
    canCustomizeColors: boolean;
    canEnableWhiteLabel: boolean;
    canSetCustomDomain: boolean;
  };
}

const TIER_FEATURES: Record<TierLevel, TierInfo['features']> = {
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

export function useTier() {
  const { user } = useUser();

  // Fetch tier from subscription API (only for trainers)
  const { data: tierData, isLoading } = useQuery({
    queryKey: ['user-tier', user?.id],
    queryFn: async () => {
      // Only fetch for trainers
      if (user?.role !== 'trainer') {
        return { tier: 'starter' as TierLevel };
      }

      const response = await fetch('/api/entitlements');
      if (!response.ok) {
        // Default to starter if API fails
        return { tier: 'starter' as TierLevel };
      }
      const data = await response.json();
      return { tier: (data.tier || 'starter') as TierLevel };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const tier: TierLevel = tierData?.tier || 'starter';

  return {
    tier,
    features: TIER_FEATURES[tier],
    isStarter: tier === 'starter',
    isProfessional: tier === 'professional',
    isEnterprise: tier === 'enterprise',
    isLoading,
    canAccess: (requiredTier: TierLevel) => {
      const tierOrder: Record<TierLevel, number> = {
        starter: 1,
        professional: 2,
        enterprise: 3,
      };
      return tierOrder[tier] >= tierOrder[requiredTier];
    },
  };
}

/**
 * useMealTypes Hook
 *
 * Fetches meal types with tier filtering
 */
export function useMealTypes() {
  return useQuery({
    queryKey: ['meal-types', 'all'],
    queryFn: async () => {
      const response = await fetch('/api/meal-types/all');
      if (!response.ok) {
        throw new Error('Failed to fetch meal types');
      }
      return response.json();
    },
  });
}

/**
 * useRecipeCount Hook
 *
 * Fetches actual recipe count for user's tier
 */
export function useRecipeCount() {
  const { tier } = useTier();

  return useQuery({
    queryKey: ['recipes', 'count', tier],
    queryFn: async () => {
      const response = await fetch(`/api/recipes?limit=1&page=1`);
      if (!response.ok) {
        throw new Error('Failed to fetch recipe count');
      }
      const data = await response.json();
      return data.total || 0;
    },
  });
}
