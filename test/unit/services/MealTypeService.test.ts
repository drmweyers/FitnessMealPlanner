/**
 * Unit Tests: MealTypeService
 *
 * Comprehensive tests for Story 2.15: Meal Type Enforcement
 * Tests progressive meal type access (5 → 10 → 17) across tiers
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../../../server/db';

// Mock database
vi.mock('../../../server/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
  },
}));

// Import service after mocking dependencies
let mealTypeService: any;

describe('MealTypeService - Story 2.15', () => {
  let service: any;

  // Mock meal types data (17 total: 5 starter + 5 professional + 7 enterprise)
  const mockMealTypes = [
    // Starter tier (5)
    { id: '1', name: 'breakfast', displayName: 'Breakfast', tierLevel: 'starter', isSeasonal: false, sortOrder: 1 },
    { id: '2', name: 'lunch', displayName: 'Lunch', tierLevel: 'starter', isSeasonal: false, sortOrder: 2 },
    { id: '3', name: 'dinner', displayName: 'Dinner', tierLevel: 'starter', isSeasonal: false, sortOrder: 3 },
    { id: '4', name: 'snack', displayName: 'Snack', tierLevel: 'starter', isSeasonal: false, sortOrder: 4 },
    { id: '5', name: 'post-workout', displayName: 'Post-Workout', tierLevel: 'starter', isSeasonal: false, sortOrder: 5 },

    // Professional tier (5 additional)
    { id: '6', name: 'keto', displayName: 'Keto', tierLevel: 'professional', isSeasonal: false, sortOrder: 6 },
    { id: '7', name: 'vegan', displayName: 'Vegan', tierLevel: 'professional', isSeasonal: false, sortOrder: 7 },
    { id: '8', name: 'paleo', displayName: 'Paleo', tierLevel: 'professional', isSeasonal: false, sortOrder: 8 },
    { id: '9', name: 'pre-workout', displayName: 'Pre-Workout', tierLevel: 'professional', isSeasonal: false, sortOrder: 9 },
    { id: '10', name: 'high-protein', displayName: 'High Protein', tierLevel: 'professional', isSeasonal: false, sortOrder: 10 },

    // Enterprise tier (7 additional)
    { id: '11', name: 'low-carb', displayName: 'Low Carb', tierLevel: 'enterprise', isSeasonal: false, sortOrder: 11 },
    { id: '12', name: 'mediterranean', displayName: 'Mediterranean', tierLevel: 'enterprise', isSeasonal: false, sortOrder: 12 },
    { id: '13', name: 'diabetic-friendly', displayName: 'Diabetic Friendly', tierLevel: 'enterprise', isSeasonal: false, sortOrder: 13 },
    { id: '14', name: 'gluten-free', displayName: 'Gluten Free', tierLevel: 'enterprise', isSeasonal: false, sortOrder: 14 },
    { id: '15', name: 'bulking', displayName: 'Bulking', tierLevel: 'enterprise', isSeasonal: false, sortOrder: 15 },
    { id: '16', name: 'cutting', displayName: 'Cutting', tierLevel: 'enterprise', isSeasonal: false, sortOrder: 16 },
    { id: '17', name: 'seasonal-special', displayName: 'Seasonal Special', tierLevel: 'enterprise', isSeasonal: true, sortOrder: 17 },
  ];

  beforeEach(async () => {
    vi.clearAllMocks();
    // Import service after mocks are set up
    const module = await import('../../../server/services/MealTypeService');
    service = module.mealTypeService;
  });

  describe('getAccessibleMealTypes', () => {
    it('should return 5 meal types for Starter tier', async () => {
      // Mock database to return only starter tier meal types
      const starterMealTypes = mockMealTypes.filter(mt => mt.tierLevel === 'starter');
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(starterMealTypes),
          }),
        }),
      } as any);

      const result = await service.getAccessibleMealTypes('starter');

      expect(result).toHaveLength(5);
      expect(result.every(mt => mt.isAccessible)).toBe(true);
      expect(result.map(mt => mt.name)).toEqual([
        'breakfast', 'lunch', 'dinner', 'snack', 'post-workout'
      ]);
    });

    it('should return 10 meal types for Professional tier (5 starter + 5 professional)', async () => {
      // Mock database to return starter + professional meal types
      const professionalMealTypes = mockMealTypes.filter(
        mt => mt.tierLevel === 'starter' || mt.tierLevel === 'professional'
      );
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(professionalMealTypes),
          }),
        }),
      } as any);

      const result = await service.getAccessibleMealTypes('professional');

      expect(result).toHaveLength(10);
      expect(result.every(mt => mt.isAccessible)).toBe(true);

      // Verify includes starter types
      expect(result.some(mt => mt.name === 'breakfast')).toBe(true);
      expect(result.some(mt => mt.name === 'dinner')).toBe(true);

      // Verify includes professional types
      expect(result.some(mt => mt.name === 'keto')).toBe(true);
      expect(result.some(mt => mt.name === 'vegan')).toBe(true);
    });

    it('should return all 17 meal types for Enterprise tier', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockMealTypes),
          }),
        }),
      } as any);

      const result = await service.getAccessibleMealTypes('enterprise');

      expect(result).toHaveLength(17);
      expect(result.every(mt => mt.isAccessible)).toBe(true);

      // Verify includes all tiers
      expect(result.some(mt => mt.name === 'breakfast')).toBe(true); // Starter
      expect(result.some(mt => mt.name === 'keto')).toBe(true); // Professional
      expect(result.some(mt => mt.name === 'mediterranean')).toBe(true); // Enterprise
      expect(result.some(mt => mt.name === 'seasonal-special')).toBe(true); // Enterprise seasonal
    });

    it('should maintain correct sort order', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockMealTypes.slice(0, 5)), // Starter only
          }),
        }),
      } as any);

      const result = await service.getAccessibleMealTypes('starter');

      expect(result[0].sortOrder).toBe(1);
      expect(result[1].sortOrder).toBe(2);
      expect(result[4].sortOrder).toBe(5);
    });
  });

  describe('getAllMealTypesWithStatus', () => {
    it('should mark inaccessible meal types for Starter tier', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(mockMealTypes),
        }),
      } as any);

      const result = await service.getAllMealTypesWithStatus('starter');

      expect(result).toHaveLength(17);

      // First 5 should be accessible
      const accessible = result.filter(mt => mt.isAccessible);
      expect(accessible).toHaveLength(5);

      // Remaining 12 should be locked
      const locked = result.filter(mt => !mt.isAccessible);
      expect(locked).toHaveLength(12);

      // Verify correct items are locked
      expect(result.find(mt => mt.name === 'breakfast')?.isAccessible).toBe(true);
      expect(result.find(mt => mt.name === 'keto')?.isAccessible).toBe(false);
      expect(result.find(mt => mt.name === 'mediterranean')?.isAccessible).toBe(false);
    });

    it('should mark inaccessible meal types for Professional tier', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(mockMealTypes),
        }),
      } as any);

      const result = await service.getAllMealTypesWithStatus('professional');

      expect(result).toHaveLength(17);

      // First 10 should be accessible
      const accessible = result.filter(mt => mt.isAccessible);
      expect(accessible).toHaveLength(10);

      // Remaining 7 should be locked
      const locked = result.filter(mt => !mt.isAccessible);
      expect(locked).toHaveLength(7);

      // Verify correct items are accessible/locked
      expect(result.find(mt => mt.name === 'breakfast')?.isAccessible).toBe(true);
      expect(result.find(mt => mt.name === 'keto')?.isAccessible).toBe(true);
      expect(result.find(mt => mt.name === 'mediterranean')?.isAccessible).toBe(false);
    });

    it('should mark all meal types as accessible for Enterprise tier', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(mockMealTypes),
        }),
      } as any);

      const result = await service.getAllMealTypesWithStatus('enterprise');

      expect(result).toHaveLength(17);
      expect(result.every(mt => mt.isAccessible)).toBe(true);
    });

    it('should include seasonal flag in results', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(mockMealTypes),
        }),
      } as any);

      const result = await service.getAllMealTypesWithStatus('enterprise');

      const seasonal = result.find(mt => mt.name === 'seasonal-special');
      expect(seasonal?.isSeasonal).toBe(true);

      const nonSeasonal = result.find(mt => mt.name === 'breakfast');
      expect(nonSeasonal?.isSeasonal).toBe(false);
    });
  });

  describe('isMealTypeAccessible', () => {
    beforeEach(() => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockMealTypes[0]]), // breakfast (starter tier)
          }),
        }),
      } as any);
    });

    it('should allow Starter tier to access starter meal types', async () => {
      const result = await service.isMealTypeAccessible('breakfast', 'starter');
      expect(result).toBe(true);
    });

    it('should deny Starter tier access to professional meal types', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockMealTypes[5]]), // keto (professional tier)
          }),
        }),
      } as any);

      const result = await service.isMealTypeAccessible('keto', 'starter');
      expect(result).toBe(false);
    });

    it('should deny Starter tier access to enterprise meal types', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockMealTypes[11]]), // mediterranean (enterprise tier)
          }),
        }),
      } as any);

      const result = await service.isMealTypeAccessible('mediterranean', 'starter');
      expect(result).toBe(false);
    });

    it('should allow Professional tier to access starter and professional meal types', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockMealTypes[5]]), // keto (professional tier)
          }),
        }),
      } as any);

      const result = await service.isMealTypeAccessible('keto', 'professional');
      expect(result).toBe(true);
    });

    it('should deny Professional tier access to enterprise meal types', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockMealTypes[11]]), // mediterranean (enterprise tier)
          }),
        }),
      } as any);

      const result = await service.isMealTypeAccessible('mediterranean', 'professional');
      expect(result).toBe(false);
    });

    it('should allow Enterprise tier to access all meal types', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockMealTypes[11]]), // mediterranean (enterprise tier)
          }),
        }),
      } as any);

      const result = await service.isMealTypeAccessible('mediterranean', 'enterprise');
      expect(result).toBe(true);
    });

    it('should return false for non-existent meal types', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // Not found
          }),
        }),
      } as any);

      const result = await service.isMealTypeAccessible('invalid-type', 'starter');
      expect(result).toBe(false);
    });
  });

  describe('getSeasonalMealTypes', () => {
    it('should return only seasonal meal types', async () => {
      const seasonalTypes = mockMealTypes.filter(mt => mt.isSeasonal);
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(seasonalTypes),
          }),
        }),
      } as any);

      const result = await service.getSeasonalMealTypes('enterprise');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('seasonal-special');
      expect(result[0].isSeasonal).toBe(true);
    });

    it('should filter seasonal types by tier access', async () => {
      const seasonalTypes = mockMealTypes.filter(mt => mt.isSeasonal);

      // Mock for starter tier - should return empty because seasonal is enterprise-only
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]), // No seasonal types for starter
          }),
        }),
      } as any);

      // Starter tier should not have access to enterprise seasonal types
      const starterResult = await service.getSeasonalMealTypes('starter');
      expect(starterResult).toHaveLength(0);

      // Mock for enterprise tier - should return seasonal types
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(seasonalTypes),
          }),
        }),
      } as any);

      // Enterprise tier should have access
      const enterpriseResult = await service.getSeasonalMealTypes('enterprise');
      expect(enterpriseResult).toHaveLength(1);
    });
  });

  describe('getMealTypeDistribution', () => {
    it.skip('should return correct distribution of meal types by tier (method not implemented yet)', async () => {
      // This method doesn't exist in the current implementation
      // Skipping until method is added to service
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockResolvedValue(mockMealTypes),
      } as any);

      const result = await (service as any).getMealTypeDistribution?.();

      expect(result).toEqual({
        starter: 5,
        professional: 5,
        enterprise: 7,
        total: 17,
      });
    });
  });

  describe('Progressive Access Validation', () => {
    it('should enforce progressive access hierarchy', async () => {
      // Mock all meal types
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(mockMealTypes),
        }),
      } as any);

      const starterTypes = await service.getAllMealTypesWithStatus('starter');
      const professionalTypes = await service.getAllMealTypesWithStatus('professional');
      const enterpriseTypes = await service.getAllMealTypesWithStatus('enterprise');

      // Starter: 5 accessible
      expect(starterTypes.filter(mt => mt.isAccessible)).toHaveLength(5);

      // Professional: 10 accessible (5 starter + 5 professional)
      expect(professionalTypes.filter(mt => mt.isAccessible)).toHaveLength(10);

      // Enterprise: 17 accessible (all)
      expect(enterpriseTypes.filter(mt => mt.isAccessible)).toHaveLength(17);

      // Progressive hierarchy: Professional includes all Starter
      const professionalNames = professionalTypes.filter(mt => mt.isAccessible).map(mt => mt.name);
      const starterNames = starterTypes.filter(mt => mt.isAccessible).map(mt => mt.name);
      expect(professionalNames).toEqual(expect.arrayContaining(starterNames));

      // Progressive hierarchy: Enterprise includes all Professional
      const enterpriseNames = enterpriseTypes.filter(mt => mt.isAccessible).map(mt => mt.name);
      expect(enterpriseNames).toEqual(expect.arrayContaining(professionalNames));
    });

    it('should maintain tier level consistency', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(mockMealTypes),
        }),
      } as any);

      const allTypes = await service.getAllMealTypesWithStatus('enterprise');

      // Verify each meal type has correct tier level
      expect(allTypes.filter(mt => mt.tierLevel === 'starter')).toHaveLength(5);
      expect(allTypes.filter(mt => mt.tierLevel === 'professional')).toHaveLength(5);
      expect(allTypes.filter(mt => mt.tierLevel === 'enterprise')).toHaveLength(7);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty database gracefully', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const result = await service.getAccessibleMealTypes('starter');
      expect(result).toEqual([]);
    });

    it('should handle invalid tier level gracefully', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      // TypeScript prevents this, but test runtime behavior
      const result = await service.getAccessibleMealTypes('invalid' as any);
      expect(result).toEqual([]);
    });

    it('should handle case-insensitive meal type names', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockMealTypes[0]]),
          }),
        }),
      } as any);

      const result1 = await service.isMealTypeAccessible('BREAKFAST', 'starter');
      const result2 = await service.isMealTypeAccessible('breakfast', 'starter');
      const result3 = await service.isMealTypeAccessible('Breakfast', 'starter');

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });
  });
});
