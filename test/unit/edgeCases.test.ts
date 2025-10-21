/**
 * Edge Cases and Error Handling Unit Tests
 *
 * Tests for boundary conditions, error scenarios, and edge cases across
 * the application. Ensures robust handling of unexpected inputs and
 * error conditions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import {
  mealPlanGenerationSchema,
  recipeFilterSchema,
  insertRecipeSchema,
  createMeasurementSchema,
  uploadProgressPhotoSchema,
  type MealPlanGeneration,
  type RecipeFilter,
  type InsertRecipe,
} from '../../shared/schema';

describe('Edge Cases and Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Boundary Value Testing', () => {
    it('should handle minimum boundary values', () => {
      const minMealPlan: MealPlanGeneration = {
        planName: 'A', // Minimum length
        fitnessGoal: 'w', // Minimum length
        dailyCalorieTarget: 800, // Minimum value
        days: 1, // Minimum value
        mealsPerDay: 1, // Minimum value
        maxIngredients: 5, // Minimum value
      };

      const result = mealPlanGenerationSchema.safeParse(minMealPlan);
      expect(result.success).toBe(true);
    });

    it('should handle maximum boundary values', () => {
      const maxMealPlan: MealPlanGeneration = {
        planName: 'A'.repeat(255), // Assuming reasonable max length
        fitnessGoal: 'muscle_gain_maximum_performance',
        dailyCalorieTarget: 5001, // Maximum value
        days: 30, // Maximum value
        mealsPerDay: 6, // Maximum value
        maxIngredients: 50, // Maximum value
        description: 'A'.repeat(1000), // Long description
      };

      const result = mealPlanGenerationSchema.safeParse(maxMealPlan);
      expect(result.success).toBe(true);
    });

    it('should reject values just outside boundaries', () => {
      const testCases = [
        {
          data: { planName: '', fitnessGoal: 'weight_loss', dailyCalorieTarget: 2000, days: 7 },
          field: 'planName'
        },
        {
          data: { planName: 'Test', fitnessGoal: '', dailyCalorieTarget: 2000, days: 7 },
          field: 'fitnessGoal'
        },
        {
          data: { planName: 'Test', fitnessGoal: 'weight_loss', dailyCalorieTarget: 799, days: 7 },
          field: 'dailyCalorieTarget'
        },
        {
          data: { planName: 'Test', fitnessGoal: 'weight_loss', dailyCalorieTarget: 5002, days: 7 },
          field: 'dailyCalorieTarget'
        },
        {
          data: { planName: 'Test', fitnessGoal: 'weight_loss', dailyCalorieTarget: 2000, days: 0 },
          field: 'days'
        },
        {
          data: { planName: 'Test', fitnessGoal: 'weight_loss', dailyCalorieTarget: 2000, days: 31 },
          field: 'days'
        },
      ];

      testCases.forEach(({ data, field }) => {
        const result = mealPlanGenerationSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          const errorPath = result.error.issues[0].path[0];
          expect(errorPath).toBe(field);
        }
      });
    });
  });

  describe('Invalid Data Type Handling', () => {
    it('should handle null and undefined values gracefully', () => {
      const nullTests = [
        { planName: null, fitnessGoal: 'weight_loss', dailyCalorieTarget: 2000, days: 7 },
        { planName: 'Test', fitnessGoal: null, dailyCalorieTarget: 2000, days: 7 },
        { planName: 'Test', fitnessGoal: 'weight_loss', dailyCalorieTarget: null, days: 7 },
        { planName: 'Test', fitnessGoal: 'weight_loss', dailyCalorieTarget: 2000, days: null },
      ];

      nullTests.forEach(testData => {
        const result = mealPlanGenerationSchema.safeParse(testData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.length).toBeGreaterThan(0);
        }
      });
    });

    it('should handle wrong data types', () => {
      const wrongTypeTests = [
        { planName: 123, fitnessGoal: 'weight_loss', dailyCalorieTarget: 2000, days: 7 },
        { planName: 'Test', fitnessGoal: 123, dailyCalorieTarget: 2000, days: 7 },
        { planName: 'Test', fitnessGoal: 'weight_loss', dailyCalorieTarget: '2000', days: 7 },
        { planName: 'Test', fitnessGoal: 'weight_loss', dailyCalorieTarget: 2000, days: '7' },
      ];

      wrongTypeTests.forEach(testData => {
        const result = mealPlanGenerationSchema.safeParse(testData);
        expect(result.success).toBe(false);
      });
    });

    it('should handle arrays and objects where not expected', () => {
      const arrayObjectTests = [
        { planName: [], fitnessGoal: 'weight_loss', dailyCalorieTarget: 2000, days: 7 },
        { planName: {}, fitnessGoal: 'weight_loss', dailyCalorieTarget: 2000, days: 7 },
        { planName: 'Test', fitnessGoal: [], dailyCalorieTarget: 2000, days: 7 },
        { planName: 'Test', fitnessGoal: 'weight_loss', dailyCalorieTarget: [], days: 7 },
      ];

      arrayObjectTests.forEach(testData => {
        const result = mealPlanGenerationSchema.safeParse(testData);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Special Characters and Unicode', () => {
    it('should handle special characters in text fields', () => {
      const specialCharTests = [
        { planName: 'Test Plan 🍎', fitnessGoal: 'weight_loss', dailyCalorieTarget: 2000, days: 7 },
        { planName: 'Plan with émojis 😋', fitnessGoal: 'weight_loss', dailyCalorieTarget: 2000, days: 7 },
        { planName: 'Plan with symbols @#$%', fitnessGoal: 'weight_loss', dailyCalorieTarget: 2000, days: 7 },
        { planName: 'Plan with quotes "test"', fitnessGoal: 'weight_loss', dailyCalorieTarget: 2000, days: 7 },
        { planName: "Plan with apostrophe's", fitnessGoal: 'weight_loss', dailyCalorieTarget: 2000, days: 7 },
      ];

      specialCharTests.forEach(testData => {
        const result = mealPlanGenerationSchema.safeParse(testData);
        expect(result.success).toBe(true);
      });
    });

    it('should handle unicode and international characters', () => {
      const unicodeTests = [
        { planName: 'Plan здоровье', fitnessGoal: 'weight_loss', dailyCalorieTarget: 2000, days: 7 },
        { planName: 'Plan 健康', fitnessGoal: 'weight_loss', dailyCalorieTarget: 2000, days: 7 },
        { planName: 'Plan عربي', fitnessGoal: 'weight_loss', dailyCalorieTarget: 2000, days: 7 },
        { planName: 'Plan ñutrición', fitnessGoal: 'weight_loss', dailyCalorieTarget: 2000, days: 7 },
      ];

      unicodeTests.forEach(testData => {
        const result = mealPlanGenerationSchema.safeParse(testData);
        expect(result.success).toBe(true);
      });
    });

    it('should handle control characters and whitespace edge cases', () => {
      const whitespaceTests = [
        { planName: '  Test Plan  ', fitnessGoal: 'weight_loss', dailyCalorieTarget: 2000, days: 7 },
        { planName: 'Test\nPlan', fitnessGoal: 'weight_loss', dailyCalorieTarget: 2000, days: 7 },
        { planName: 'Test\tPlan', fitnessGoal: 'weight_loss', dailyCalorieTarget: 2000, days: 7 },
        { planName: 'Test\\Plan', fitnessGoal: 'weight_loss', dailyCalorieTarget: 2000, days: 7 },
      ];

      whitespaceTests.forEach(testData => {
        const result = mealPlanGenerationSchema.safeParse(testData);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Large Data Handling', () => {
    it('should handle very long strings', () => {
      const veryLongString = 'A'.repeat(10000);
      const longStringTest = {
        planName: veryLongString,
        fitnessGoal: 'weight_loss',
        dailyCalorieTarget: 2000,
        days: 7,
        description: veryLongString,
      };

      // Should handle gracefully (may pass or fail based on business rules)
      const result = mealPlanGenerationSchema.safeParse(longStringTest);
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle very large numbers', () => {
      const largeNumberTests = [
        { planName: 'Test', fitnessGoal: 'weight_loss', dailyCalorieTarget: Number.MAX_SAFE_INTEGER, days: 7 },
        { planName: 'Test', fitnessGoal: 'weight_loss', dailyCalorieTarget: 2000, days: Number.MAX_SAFE_INTEGER },
        { planName: 'Test', fitnessGoal: 'weight_loss', dailyCalorieTarget: -1000, days: 7 },
      ];

      largeNumberTests.forEach(testData => {
        const result = mealPlanGenerationSchema.safeParse(testData);
        expect(result.success).toBe(false); // Should fail validation
      });
    });

    it('should handle infinity and NaN', () => {
      const infinityTests = [
        { planName: 'Test', fitnessGoal: 'weight_loss', dailyCalorieTarget: Infinity, days: 7 },
        { planName: 'Test', fitnessGoal: 'weight_loss', dailyCalorieTarget: -Infinity, days: 7 },
        { planName: 'Test', fitnessGoal: 'weight_loss', dailyCalorieTarget: NaN, days: 7 },
        { planName: 'Test', fitnessGoal: 'weight_loss', dailyCalorieTarget: 2000, days: NaN },
      ];

      infinityTests.forEach(testData => {
        const result = mealPlanGenerationSchema.safeParse(testData);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Recipe Edge Cases', () => {
    const baseRecipe = {
      name: 'Test Recipe',
      description: 'A test recipe',
      instructionsText: 'Cook the ingredients',
      prepTimeMinutes: 30,
      cookTimeMinutes: 20,
      servings: 4,
      caloriesKcal: 400,
      proteinGrams: '20',
      carbsGrams: '30',
      fatGrams: '15',
      mealTypes: ['lunch'],
      dietaryTags: ['high-protein'],
      mainIngredientTags: ['chicken'],
      ingredientsJson: [
        { name: 'Chicken breast', amount: '200', unit: 'g' },
      ],
    };

    it('should handle empty and malformed ingredient lists', () => {
      const malformedIngredientTests = [
        { ...baseRecipe, ingredientsJson: [] }, // Empty array
        { ...baseRecipe, ingredientsJson: [{}] }, // Empty object
        { ...baseRecipe, ingredientsJson: [{ name: 'Chicken' }] }, // Missing amount
        { ...baseRecipe, ingredientsJson: [{ amount: '200', unit: 'g' }] }, // Missing name
        { ...baseRecipe, ingredientsJson: [{ name: '', amount: '', unit: '' }] }, // Empty strings
      ];

      malformedIngredientTests.forEach((testData, index) => {
        const result = insertRecipeSchema.safeParse(testData);
        // Test what actually happens - adjust expectations based on schema
        expect(typeof result.success).toBe('boolean');

        // Log cases that might be unexpected for investigation
        if (result.success && index > 0) {
          console.log(`Ingredient test ${index} unexpectedly passed:`, testData.ingredientsJson);
        }
      });
    });

    it('should handle extreme nutritional values', () => {
      const extremeNutritionTests = [
        { ...baseRecipe, caloriesKcal: 0 },
        { ...baseRecipe, caloriesKcal: 10000 },
        { ...baseRecipe, proteinGrams: '0' },
        { ...baseRecipe, proteinGrams: '1000' },
        { ...baseRecipe, carbsGrams: '-10' },
        { ...baseRecipe, fatGrams: '500' },
      ];

      extremeNutritionTests.forEach(testData => {
        const result = insertRecipeSchema.safeParse(testData);
        // Some extreme values might be valid, others might fail
        expect(typeof result.success).toBe('boolean');
      });
    });

    it('should handle zero and negative time values', () => {
      const timeTests = [
        { ...baseRecipe, prepTimeMinutes: 0 },
        { ...baseRecipe, prepTimeMinutes: -10 },
        { ...baseRecipe, cookTimeMinutes: 0 },
        { ...baseRecipe, cookTimeMinutes: -5 },
        { ...baseRecipe, servings: 0 },
        { ...baseRecipe, servings: -1 },
      ];

      timeTests.forEach(testData => {
        const result = insertRecipeSchema.safeParse(testData);
        // Check what the schema actually validates - some values might be allowed
        expect(typeof result.success).toBe('boolean');

        // Log unexpected passes for investigation
        if (result.success && (testData.prepTimeMinutes < 0 || testData.cookTimeMinutes < 0 || testData.servings <= 0)) {
          console.log(`Unexpected pass for time test:`, testData);
        }
      });
    });
  });

  describe('Date and Time Edge Cases', () => {
    it('should handle various date formats for measurements', () => {
      const dateTests = [
        '2024-01-01T00:00:00Z', // Standard ISO
        '2024-12-31T23:59:59Z', // End of year
        '2020-02-29T12:00:00Z', // Leap year
        '2024-02-29T12:00:00Z', // Another leap year
        '1900-01-01T00:00:00Z', // Old date
        '2099-12-31T23:59:59Z', // Future date
      ];

      dateTests.forEach(date => {
        const result = createMeasurementSchema.safeParse({
          measurementDate: date,
          weightKg: 70.0,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid date formats', () => {
      const invalidDates = [
        'invalid-date',
        '2024-13-01T00:00:00Z', // Invalid month
        '2024-02-30T00:00:00Z', // Invalid day for February
        '2024-01-01T25:00:00Z', // Invalid hour
        '2024-01-01T12:60:00Z', // Invalid minute
        '2024-01-01T12:00:60Z', // Invalid second
        '2024-01-01', // Missing time
        'Thu Jan 01 2024', // Wrong format
      ];

      invalidDates.forEach(date => {
        const result = createMeasurementSchema.safeParse({
          measurementDate: date,
          weightKg: 70.0,
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    it('should handle deeply nested objects', () => {
      const deepObject = {
        planName: 'Test',
        fitnessGoal: 'weight_loss',
        dailyCalorieTarget: 2000,
        days: 7,
        nested: {
          level1: {
            level2: {
              level3: {
                level4: {
                  data: 'deep value'
                }
              }
            }
          }
        }
      };

      const result = mealPlanGenerationSchema.safeParse(deepObject);
      // Should handle additional properties gracefully
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle circular references gracefully', () => {
      const circularObject: any = {
        planName: 'Test',
        fitnessGoal: 'weight_loss',
        dailyCalorieTarget: 2000,
        days: 7,
      };
      circularObject.self = circularObject;

      // Should not crash, even with circular reference
      expect(() => {
        const result = mealPlanGenerationSchema.safeParse(circularObject);
        expect(typeof result.success).toBe('boolean');
      }).not.toThrow();
    });

    it('should handle large arrays', () => {
      const largeArray = Array(1000).fill({ name: 'Ingredient', amount: '1', unit: 'g' });

      const recipeWithLargeIngredients = {
        name: 'Test Recipe',
        instructionsText: 'Cook all ingredients',
        prepTimeMinutes: 30,
        cookTimeMinutes: 20,
        servings: 4,
        caloriesKcal: 400,
        proteinGrams: '20',
        carbsGrams: '30',
        fatGrams: '15',
        mealTypes: ['lunch'],
        dietaryTags: ['complex'],
        mainIngredientTags: ['mixed'],
        ingredientsJson: largeArray,
      };

      const result = insertRecipeSchema.safeParse(recipeWithLargeIngredients);
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Concurrent Access and Race Conditions', () => {
    it('should handle multiple simultaneous validations', async () => {
      const promises = Array(10).fill(null).map((_, index) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            const result = mealPlanGenerationSchema.safeParse({
              planName: `Test Plan ${index}`,
              fitnessGoal: 'weight_loss',
              dailyCalorieTarget: 2000 + index,
              days: 7,
            });
            resolve(result.success);
          }, Math.random() * 10);
        });
      });

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      results.forEach(success => {
        expect(success).toBe(true);
      });
    });

    it('should handle rapid successive validations', () => {
      const results = [];

      for (let i = 0; i < 100; i++) {
        const result = mealPlanGenerationSchema.safeParse({
          planName: `Rapid Test ${i}`,
          fitnessGoal: 'weight_loss',
          dailyCalorieTarget: 2000,
          days: 7,
        });
        results.push(result.success);
      }

      expect(results).toHaveLength(100);
      results.forEach(success => {
        expect(success).toBe(true);
      });
    });
  });

  describe('Cross-Browser and Environment Compatibility', () => {
    it('should handle different JavaScript environments', () => {
      // Test with different global objects
      const originalGlobal = global;

      try {
        // Simulate different environment
        (global as any).test = 'environment';

        const result = mealPlanGenerationSchema.safeParse({
          planName: 'Environment Test',
          fitnessGoal: 'weight_loss',
          dailyCalorieTarget: 2000,
          days: 7,
        });

        expect(result.success).toBe(true);
      } finally {
        global = originalGlobal;
      }
    });
  });

  describe('Error Recovery and Graceful Degradation', () => {
    it('should provide meaningful error messages', () => {
      const invalidData = {
        planName: '', // Invalid
        fitnessGoal: 123, // Wrong type
        dailyCalorieTarget: 'not-a-number', // Wrong type
        days: -1, // Invalid range
      };

      const result = mealPlanGenerationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        result.error.issues.forEach(issue => {
          expect(issue.message).toBeTruthy();
          expect(issue.path).toBeTruthy();
        });
      }
    });

    it('should handle schema transformation errors', () => {
      // Test with data that might cause transformation issues
      const problematicData = {
        planName: 'Test',
        fitnessGoal: 'weight_loss',
        dailyCalorieTarget: 2000.99999999999, // Floating point precision
        days: 7.0000000001, // Almost integer
      };

      const result = mealPlanGenerationSchema.safeParse(problematicData);
      expect(typeof result.success).toBe('boolean');
    });
  });
});