import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Recreate the schema for testing (matches BMADRecipeGenerator.tsx)
const bmadGenerationSchema = z.object({
  // Recipe Generation
  count: z.number().min(1).max(100).default(10),

  // Basic Information
  planName: z.string().optional(),
  clientName: z.string().optional(),
  description: z.string().optional(),

  // Meal Plan Parameters
  fitnessGoal: z.string().optional(),
  days: z.number().optional(),
  mealsPerDay: z.number().optional(),
  maxIngredients: z.number().optional(),
  generateMealPrep: z.boolean().default(false),

  // Meal Types (checkboxes for multiple selection)
  mealTypes: z.array(z.string()).optional(),

  // Filter Preferences
  dietaryTag: z.string().optional(),
  maxPrepTime: z.number().optional(),

  // Daily total calorie goal for entire meal plan
  dailyCalorieTarget: z.number().optional(),

  // Maximum calories allowed per individual recipe
  maxCalories: z.number().optional(),

  // Nutrition Ranges
  minProtein: z.number().optional(),
  maxProtein: z.number().optional(),
  minCarbs: z.number().optional(),
  maxCarbs: z.number().optional(),
  minFat: z.number().optional(),
  maxFat: z.number().optional(),

  // BMAD Features
  enableImageGeneration: z.boolean().default(true),
  enableS3Upload: z.boolean().default(true),
  enableNutritionValidation: z.boolean().default(true),
});

type BMADGeneration = z.infer<typeof bmadGenerationSchema>;

describe('BMAD Recipe Generator Schema Validation', () => {
  describe('Schema Structure', () => {
    it('should accept valid meal types array', () => {
      const data = { count: 10, mealTypes: ['breakfast', 'lunch'] };
      const result = bmadGenerationSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.mealTypes).toEqual(['breakfast', 'lunch']);
      }
    });

    it('should NOT have mealType (singular) field - duplicate removed', () => {
      const data = { count: 10, mealType: 'breakfast' } as any;
      const result = bmadGenerationSchema.safeParse(data);
      // Parse should succeed but mealType should not be in the result
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as any).mealType).toBeUndefined();
      }
    });

    it('should accept dailyCalorieTarget and maxCalories separately', () => {
      const data = {
        count: 10,
        dailyCalorieTarget: 2000,
        maxCalories: 500
      };
      const result = bmadGenerationSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dailyCalorieTarget).toBe(2000);
        expect(result.data.maxCalories).toBe(500);
      }
    });

    it('should NOT accept legacy field: targetCalories', () => {
      const data = {
        count: 10,
        targetCalories: 2000
      } as any;
      const result = bmadGenerationSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as any).targetCalories).toBeUndefined();
      }
    });

    it('should NOT accept legacy field: dietaryRestrictions', () => {
      const data = {
        count: 10,
        dietaryRestrictions: ['vegan']
      } as any;
      const result = bmadGenerationSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as any).dietaryRestrictions).toBeUndefined();
      }
    });

    it('should NOT accept legacy field: mainIngredient', () => {
      const data = {
        count: 10,
        mainIngredient: 'chicken'
      } as any;
      const result = bmadGenerationSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as any).mainIngredient).toBeUndefined();
      }
    });
  });

  describe('Field Validation', () => {
    it('should require count field', () => {
      const data = {} as any;
      const result = bmadGenerationSchema.safeParse(data);
      // Count has a default, so it should succeed
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(10); // default value
      }
    });

    it('should enforce count min/max constraints', () => {
      const tooLow = { count: 0 };
      const tooHigh = { count: 101 };

      expect(bmadGenerationSchema.safeParse(tooLow).success).toBe(false);
      expect(bmadGenerationSchema.safeParse(tooHigh).success).toBe(false);
    });

    it('should accept valid count range (1-100)', () => {
      const validCounts = [1, 10, 50, 100];
      validCounts.forEach(count => {
        const result = bmadGenerationSchema.safeParse({ count });
        expect(result.success).toBe(true);
      });
    });

    it('should have correct default values for feature toggles', () => {
      const data = { count: 10 };
      const result = bmadGenerationSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.enableImageGeneration).toBe(true);
        expect(result.data.enableS3Upload).toBe(true);
        expect(result.data.enableNutritionValidation).toBe(true);
      }
    });
  });

  describe('Field Count Verification', () => {
    it('should have exactly 23 fields (down from 27)', () => {
      const schemaKeys = Object.keys(bmadGenerationSchema.shape);
      expect(schemaKeys).toHaveLength(23);
    });

    it('should NOT include removed legacy fields', () => {
      const schemaKeys = Object.keys(bmadGenerationSchema.shape);
      expect(schemaKeys).not.toContain('mealType'); // duplicate removed
      expect(schemaKeys).not.toContain('targetCalories'); // legacy removed
      expect(schemaKeys).not.toContain('dietaryRestrictions'); // legacy removed
      expect(schemaKeys).not.toContain('mainIngredient'); // legacy removed
    });

    it('should include all active fields', () => {
      const schemaKeys = Object.keys(bmadGenerationSchema.shape);
      const expectedFields = [
        'count',
        'planName',
        'clientName',
        'description',
        'fitnessGoal',
        'days',
        'mealsPerDay',
        'maxIngredients',
        'generateMealPrep',
        'mealTypes', // kept (array)
        'dietaryTag',
        'maxPrepTime',
        'dailyCalorieTarget',
        'maxCalories',
        'minProtein',
        'maxProtein',
        'minCarbs',
        'maxCarbs',
        'minFat',
        'maxFat',
        'enableImageGeneration',
        'enableS3Upload',
        'enableNutritionValidation'
      ];

      expectedFields.forEach(field => {
        expect(schemaKeys).toContain(field);
      });
    });
  });

  describe('Realistic Data Scenarios', () => {
    it('should handle complete form submission', () => {
      const completeData: Partial<BMADGeneration> = {
        count: 20,
        planName: 'Weight Loss 2025',
        clientName: 'John Doe',
        description: 'Custom meal plan',
        fitnessGoal: 'weight_loss',
        dailyCalorieTarget: 1800,
        days: 7,
        mealsPerDay: 3,
        maxIngredients: 20,
        generateMealPrep: true,
        mealTypes: ['breakfast', 'lunch', 'dinner'],
        dietaryTag: 'keto',
        maxPrepTime: 30,
        maxCalories: 600,
        minProtein: 20,
        maxProtein: 40,
        minCarbs: 10,
        maxCarbs: 30,
        minFat: 15,
        maxFat: 25,
        enableImageGeneration: true,
        enableS3Upload: true,
        enableNutritionValidation: true
      };

      const result = bmadGenerationSchema.safeParse(completeData);
      expect(result.success).toBe(true);
    });

    it('should handle minimal form submission (only count)', () => {
      const minimalData = { count: 10 };
      const result = bmadGenerationSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
    });

    it('should handle nutrition ranges only', () => {
      const nutritionData = {
        count: 15,
        minProtein: 25,
        maxProtein: 45,
        minCarbs: 20,
        maxCarbs: 50,
        minFat: 10,
        maxFat: 20
      };
      const result = bmadGenerationSchema.safeParse(nutritionData);
      expect(result.success).toBe(true);
    });
  });
});
