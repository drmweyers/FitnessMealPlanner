import { useTier } from './useTier';

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
  const { tier } = useTier();
  
  // Ensure tier is valid, default to 'starter' if undefined
  const tierLevel: 'starter' | 'professional' | 'enterprise' = tier || 'starter';

  // Define tier-based recipe limits
  const tierLimits: Record<'starter' | 'professional' | 'enterprise', number> = {
    starter: 1000,
    professional: 2500,
    enterprise: 4000
  };

  // Define monthly allocations
  const monthlyAllocations: Record<'starter' | 'professional' | 'enterprise', number> = {
    starter: 25,
    professional: 50,
    enterprise: 100
  };

  // Define tier names for display
  const tierNames: Record<'starter' | 'professional' | 'enterprise', string> = {
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
