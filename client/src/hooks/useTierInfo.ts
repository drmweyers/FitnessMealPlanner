import { useAuth } from '@/contexts/AuthContext';

/**
 * Story 2.14: Hook for tier-based recipe access information
 *
 * Returns tier information and accessible recipe counts based on user's tier level
 * Progressive access model:
 * - Starter: 1,000 recipes
 * - Professional: 2,500 recipes (includes starter)
 * - Enterprise: 4,000 recipes (includes professional and starter)
 */
export function useTierInfo() {
  const { user } = useAuth();

  const tierLevel = user?.tierLevel || 'starter';

  // Define tier-based recipe limits
  const tierLimits = {
    starter: 1000,
    professional: 2500,
    enterprise: 4000
  };

  // Define monthly allocations
  const monthlyAllocations = {
    starter: 25,
    professional: 50,
    enterprise: 100
  };

  // Define tier names for display
  const tierNames = {
    starter: 'Starter',
    professional: 'Professional',
    enterprise: 'Enterprise'
  };

  const accessibleRecipeCount = tierLimits[tierLevel];
  const monthlyAllocation = monthlyAllocations[tierLevel];
  const tierName = tierNames[tierLevel];

  return {
    tierLevel,
    tierName,
    accessibleRecipeCount,
    monthlyAllocation,
    tierLimits,
    monthlyAllocations
  };
}
