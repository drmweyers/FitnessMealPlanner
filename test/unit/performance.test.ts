/**
 * Performance Validation Tests
 *
 * Tests for performance characteristics, memory usage, and efficiency
 * across the application. Ensures the application performs well under
 * various load conditions and data sizes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  mealPlanGenerationSchema,
  recipeFilterSchema,
  insertRecipeSchema,
  createMeasurementSchema,
  type MealPlanGeneration,
  type RecipeFilter,
  type InsertRecipe,
} from '../../shared/schema';

describe('Performance Validation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Schema Validation Performance', () => {
    it('should validate meal plans efficiently', () => {
      const startTime = performance.now();
      const iterations = 1000;

      const validMealPlan: MealPlanGeneration = {
        planName: 'Performance Test Plan',
        fitnessGoal: 'weight_loss',
        dailyCalorieTarget: 2000,
        days: 7,
        mealsPerDay: 3,
        maxIngredients: 20,
        description: 'A test meal plan for performance validation',
      };

      for (let i = 0; i < iterations; i++) {
        const result = mealPlanGenerationSchema.safeParse({
          ...validMealPlan,
          planName: `Performance Test Plan ${i}`,
          dailyCalorieTarget: 1800 + (i % 400), // Vary the target
        });
        expect(result.success).toBe(true);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;
      const avgPerValidation = duration / iterations;

      console.log(`${iterations} meal plan validations took ${duration.toFixed(2)}ms`);
      console.log(`Average per validation: ${avgPerValidation.toFixed(3)}ms`);

      // Should complete 1000 validations in under 100ms (0.1ms per validation)
      expect(duration).toBeLessThan(100);
      expect(avgPerValidation).toBeLessThan(0.1);
    });

    it('should validate complex recipes efficiently', () => {
      const startTime = performance.now();
      const iterations = 500;

      const complexRecipe: InsertRecipe = {
        name: 'Complex Performance Test Recipe',
        description: 'A recipe with many ingredients for performance testing',
        instructionsText: 'Mix all ingredients and cook for the specified time',
        prepTimeMinutes: 30,
        cookTimeMinutes: 45,
        servings: 4,
        caloriesKcal: 450,
        proteinGrams: '25',
        carbsGrams: '35',
        fatGrams: '18',
        mealTypes: ['lunch', 'dinner'],
        dietaryTags: ['high-protein', 'balanced'],
        mainIngredientTags: ['chicken', 'vegetables'],
        ingredientsJson: Array(20).fill(null).map((_, i) => ({
          name: `Ingredient ${i + 1}`,
          amount: `${50 + i * 10}`,
          unit: i % 2 === 0 ? 'g' : 'ml',
        })),
      };

      for (let i = 0; i < iterations; i++) {
        const result = insertRecipeSchema.safeParse({
          ...complexRecipe,
          name: `Complex Performance Test Recipe ${i}`,
          caloriesKcal: 400 + (i % 100),
        });
        expect(result.success).toBe(true);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;
      const avgPerValidation = duration / iterations;

      console.log(`${iterations} complex recipe validations took ${duration.toFixed(2)}ms`);
      console.log(`Average per validation: ${avgPerValidation.toFixed(3)}ms`);

      // Should complete 500 complex validations in under 1000ms (2ms per validation)
      expect(duration).toBeLessThan(1000);
      expect(avgPerValidation).toBeLessThan(2.0);
    });

    it('should handle large datasets efficiently', () => {
      const startTime = performance.now();
      const batchSize = 100;

      // Create a large batch of meal plans
      const mealPlans = Array(batchSize).fill(null).map((_, i) => ({
        planName: `Batch Test Plan ${i}`,
        fitnessGoal: i % 2 === 0 ? 'weight_loss' : 'muscle_gain',
        dailyCalorieTarget: 1800 + (i * 10),
        days: 7 + (i % 7),
        mealsPerDay: 3 + (i % 3),
        maxIngredients: 10 + (i % 20),
        description: `Description for meal plan ${i}`.repeat(i % 3 + 1),
      }));

      // Validate all plans
      const results = mealPlans.map(plan =>
        mealPlanGenerationSchema.safeParse(plan)
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`Batch validation of ${batchSize} meal plans took ${duration.toFixed(2)}ms`);

      // All should be valid
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Should complete batch in under 50ms
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Memory Usage Performance', () => {
    it('should not leak memory during repeated validations', () => {
      const memBefore = process.memoryUsage();
      const iterations = 2000;

      const testData = {
        planName: 'Memory Test Plan',
        fitnessGoal: 'weight_loss',
        dailyCalorieTarget: 2000,
        days: 7,
        mealsPerDay: 3,
      };

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      for (let i = 0; i < iterations; i++) {
        const result = mealPlanGenerationSchema.safeParse({
          ...testData,
          planName: `Memory Test Plan ${i}`,
        });
        expect(result.success).toBe(true);

        // Occasionally force garbage collection
        if (i % 500 === 0 && global.gc) {
          global.gc();
        }
      }

      // Force final garbage collection
      if (global.gc) {
        global.gc();
      }

      const memAfter = process.memoryUsage();
      const heapUsedDiff = memAfter.heapUsed - memBefore.heapUsed;
      const heapUsedDiffMB = heapUsedDiff / (1024 * 1024);

      console.log(`Memory used before: ${(memBefore.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Memory used after: ${(memAfter.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Memory difference: ${heapUsedDiffMB.toFixed(2)}MB`);

      // Should not use more than 10MB additional memory for 2000 validations
      expect(heapUsedDiffMB).toBeLessThan(10);
    });

    it('should handle large objects without excessive memory usage', () => {
      const memBefore = process.memoryUsage();

      // Create a very large recipe with many ingredients
      const largeRecipe = {
        name: 'Very Large Recipe',
        description: 'A'.repeat(1000), // Large description
        instructionsText: 'Step '.repeat(500), // Large instructions
        prepTimeMinutes: 60,
        cookTimeMinutes: 120,
        servings: 8,
        caloriesKcal: 1200,
        proteinGrams: '80',
        carbsGrams: '100',
        fatGrams: '45',
        mealTypes: ['lunch', 'dinner'],
        dietaryTags: ['high-protein', 'complex', 'gourmet'],
        mainIngredientTags: ['meat', 'vegetables', 'grains'],
        ingredientsJson: Array(100).fill(null).map((_, i) => ({
          name: `Very Long Ingredient Name ${i}`.repeat(3),
          amount: `${i + 1}`,
          unit: i % 4 === 0 ? 'cups' : i % 4 === 1 ? 'grams' : i % 4 === 2 ? 'ml' : 'pieces',
        })),
      };

      const iterations = 50;
      for (let i = 0; i < iterations; i++) {
        const result = insertRecipeSchema.safeParse(largeRecipe);
        expect(result.success).toBe(true);
      }

      const memAfter = process.memoryUsage();
      const heapUsedDiff = memAfter.heapUsed - memBefore.heapUsed;
      const heapUsedDiffMB = heapUsedDiff / (1024 * 1024);

      console.log(`Large object memory difference: ${heapUsedDiffMB.toFixed(2)}MB`);

      // Should not use more than 50MB for large object validations
      expect(heapUsedDiffMB).toBeLessThan(50);
    });
  });

  describe('Concurrent Performance', () => {
    it('should handle concurrent validations efficiently', async () => {
      const startTime = performance.now();
      const concurrentRequests = 20;
      const validationsPerRequest = 100;

      const promises = Array(concurrentRequests).fill(null).map(async (_, requestIndex) => {
        const results = [];
        for (let i = 0; i < validationsPerRequest; i++) {
          const result = mealPlanGenerationSchema.safeParse({
            planName: `Concurrent Test ${requestIndex}-${i}`,
            fitnessGoal: 'weight_loss',
            dailyCalorieTarget: 2000 + requestIndex,
            days: 7,
            mealsPerDay: 3,
          });
          results.push(result.success);
        }
        return results;
      });

      const allResults = await Promise.all(promises);
      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`${concurrentRequests} concurrent requests with ${validationsPerRequest} validations each took ${duration.toFixed(2)}ms`);

      // All results should be successful
      allResults.forEach(results => {
        results.forEach(success => {
          expect(success).toBe(true);
        });
      });

      // Should complete concurrent operations efficiently
      expect(duration).toBeLessThan(500);
    });

    it('should maintain performance under rapid sequential calls', () => {
      const startTime = performance.now();
      const rapidCalls = 5000;

      const results = [];
      for (let i = 0; i < rapidCalls; i++) {
        const result = mealPlanGenerationSchema.safeParse({
          planName: `Rapid Test ${i}`,
          fitnessGoal: 'weight_loss',
          dailyCalorieTarget: 2000,
          days: 7,
          mealsPerDay: 3,
        });
        results.push(result.success);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;
      const avgPerCall = duration / rapidCalls;

      console.log(`${rapidCalls} rapid calls took ${duration.toFixed(2)}ms`);
      console.log(`Average per call: ${avgPerCall.toFixed(4)}ms`);

      // All should succeed
      results.forEach(success => {
        expect(success).toBe(true);
      });

      // Should maintain sub-millisecond average
      expect(avgPerCall).toBeLessThan(0.05);
      expect(duration).toBeLessThan(250);
    });
  });

  describe('Complex Data Structure Performance', () => {
    it('should efficiently validate nested meal plan structures', () => {
      const startTime = performance.now();
      const iterations = 200;

      const complexMealPlan = {
        planName: 'Complex Nested Plan',
        fitnessGoal: 'muscle_gain',
        dailyCalorieTarget: 3000,
        days: 14,
        mealsPerDay: 6,
        maxIngredients: 50,
        description: 'A complex meal plan with detailed specifications',
        dietaryTag: 'high-protein',
        mealType: 'all',
        maxPrepTime: 45,
        maxCalories: 800,
        minCalories: 200,
        minProtein: 25,
        maxProtein: 50,
        minCarbs: 30,
        maxCarbs: 80,
        minFat: 10,
        maxFat: 25,
      };

      for (let i = 0; i < iterations; i++) {
        const result = mealPlanGenerationSchema.safeParse({
          ...complexMealPlan,
          planName: `Complex Nested Plan ${i}`,
          dailyCalorieTarget: 2800 + (i % 400),
        });
        expect(result.success).toBe(true);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`${iterations} complex nested validations took ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(100);
    });

    it('should handle filter objects with many parameters efficiently', () => {
      const startTime = performance.now();
      const iterations = 1000;

      const complexFilter: RecipeFilter = {
        search: 'chicken protein high-nutrition delicious',
        mealType: 'lunch',
        dietaryTag: 'high-protein',
        maxPrepTime: 45,
        maxCalories: 600,
        minCalories: 300,
        minProtein: 25,
        maxProtein: 50,
        minCarbs: 20,
        maxCarbs: 40,
        minFat: 10,
        maxFat: 20,
        includeIngredients: ['chicken', 'rice', 'vegetables'],
        excludeIngredients: ['nuts', 'dairy'],
        page: 1,
        limit: 20,
        approved: true,
      };

      for (let i = 0; i < iterations; i++) {
        const result = recipeFilterSchema.safeParse({
          ...complexFilter,
          search: `${complexFilter.search} ${i}`,
          page: 1 + (i % 10),
        });
        expect(result.success).toBe(true);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`${iterations} complex filter validations took ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Error Handling Performance', () => {
    it('should fail fast on invalid data', () => {
      const startTime = performance.now();
      const iterations = 1000;

      const invalidData = {
        planName: '', // Invalid
        fitnessGoal: 123, // Wrong type
        dailyCalorieTarget: 'not-a-number', // Wrong type
        days: -1, // Invalid range
      };

      for (let i = 0; i < iterations; i++) {
        const result = mealPlanGenerationSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`${iterations} validation failures took ${duration.toFixed(2)}ms`);

      // Should fail reasonably fast - error handling is still efficient
      expect(duration).toBeLessThan(200);
    });

    it('should handle partial validation failures efficiently', () => {
      const startTime = performance.now();
      const iterations = 500;

      const partiallyInvalidData = {
        planName: 'Valid Plan Name',
        fitnessGoal: 'weight_loss', // Valid
        dailyCalorieTarget: 2000, // Valid
        days: 'invalid', // Invalid type
        mealsPerDay: 3, // Valid
      };

      for (let i = 0; i < iterations; i++) {
        const result = mealPlanGenerationSchema.safeParse(partiallyInvalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.length).toBeGreaterThan(0);
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`${iterations} partial validation failures took ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Stress Testing', () => {
    it('should maintain performance under high load', () => {
      const startTime = performance.now();
      const highLoadIterations = 10000;

      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < highLoadIterations; i++) {
        const isValid = i % 10 !== 0; // 90% valid, 10% invalid

        const testData = isValid ? {
          planName: `High Load Test ${i}`,
          fitnessGoal: 'weight_loss',
          dailyCalorieTarget: 2000,
          days: 7,
          mealsPerDay: 3,
        } : {
          planName: '', // Invalid
          fitnessGoal: 'weight_loss',
          dailyCalorieTarget: 2000,
          days: 7,
        };

        const result = mealPlanGenerationSchema.safeParse(testData);
        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;
      const avgPerValidation = duration / highLoadIterations;

      console.log(`High load test: ${highLoadIterations} validations took ${duration.toFixed(2)}ms`);
      console.log(`Average per validation: ${avgPerValidation.toFixed(4)}ms`);
      console.log(`Success: ${successCount}, Failures: ${failureCount}`);

      // Should complete high load in reasonable time
      expect(duration).toBeLessThan(1000); // Under 1 second
      expect(avgPerValidation).toBeLessThan(0.1); // Under 0.1ms average

      // Should have roughly 90% success rate
      expect(successCount).toBeGreaterThan(highLoadIterations * 0.85);
      expect(failureCount).toBeGreaterThan(highLoadIterations * 0.05);
    });
  });

  describe('Memory Leak Detection', () => {
    it('should not accumulate memory over time', () => {
      const measurements: number[] = [];
      const iterations = 100;
      const cycleSize = 100;

      for (let cycle = 0; cycle < iterations; cycle++) {
        // Perform validations
        for (let i = 0; i < cycleSize; i++) {
          const result = mealPlanGenerationSchema.safeParse({
            planName: `Leak Test ${cycle}-${i}`,
            fitnessGoal: 'weight_loss',
            dailyCalorieTarget: 2000,
            days: 7,
            mealsPerDay: 3,
          });
          expect(result.success).toBe(true);
        }

        // Measure memory every 10 cycles
        if (cycle % 10 === 0) {
          if (global.gc) global.gc(); // Force garbage collection
          measurements.push(process.memoryUsage().heapUsed);
        }
      }

      // Check that memory isn't consistently growing
      const firstMeasurement = measurements[0];
      const lastMeasurement = measurements[measurements.length - 1];
      const memoryGrowth = lastMeasurement - firstMeasurement;
      const memoryGrowthMB = memoryGrowth / (1024 * 1024);

      console.log(`Memory measurements:`, measurements.map(m => (m / 1024 / 1024).toFixed(2)));
      console.log(`Memory growth: ${memoryGrowthMB.toFixed(2)}MB`);

      // Should not grow more than 5MB over the test
      expect(memoryGrowthMB).toBeLessThan(5);
    });
  });
});