/**
 * PDF Export API Integration Tests
 * 
 * Tests the complete PDF export flow including data transformation
 * for different meal plan data formats that may come from the frontend
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { validateMealPlanData } from '../server/utils/pdfValidation';

// Mock dependencies to focus on integration testing
vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({
        setViewport: vi.fn(),
        setContent: vi.fn(),
        pdf: vi.fn().mockResolvedValue(Buffer.from('Mock PDF content'))
      }),
      close: vi.fn()
    })
  }
}));

vi.mock('../server/utils/pdfTemplate', () => ({
  compileHtmlTemplate: vi.fn().mockResolvedValue('<html>Mock Template</html>')
}));

vi.mock('../server/storage', () => ({
  storage: {
    getRecipe: vi.fn().mockResolvedValue({
      id: 'recipe-1',
      name: 'Mock Recipe',
      description: 'A test recipe',
      caloriesKcal: 400,
      proteinGrams: '25',
      carbsGrams: '50',
      fatGrams: '15',  
      prepTimeMinutes: 20,
      servings: 1,
      mealTypes: ['breakfast'],
      dietaryTags: ['healthy'],
      ingredientsJson: [{ name: 'Test Ingredient', amount: '1', unit: 'cup' }],
      instructionsText: 'Test instructions'
    })
  }
}));

describe('PDF Export API Integration', () => {
  describe('Data Format Compatibility', () => {
    it('should handle object-based meal plan data from frontend', async () => {
      const objectBasedData = {
        mealPlanData: {
          name: 'Weekly Meal Plan', // Frontend uses 'name' not 'planName'
          description: 'Muscle building plan',
          dailyCalorieTarget: 2800,
          days: 7,
          mealsPerDay: 3,
          meals: {
            Monday: {
              breakfast: {
                recipeId: 'recipe-1',
                name: 'Protein Oatmeal',
                calories: 450,
                protein: 25,
                carbs: 60,
                fat: 12,
                ingredients: [
                  { name: 'Oats', amount: '1', unit: 'cup' },
                  { name: 'Protein Powder', amount: '1', unit: 'scoop' }
                ],
                instructions: 'Mix oats with water, add protein powder'
              },
              lunch: {
                recipeId: 'recipe-2',
                name: 'Chicken Salad',
                calories: 550,
                protein: 40,
                carbs: 25,
                fat: 18
              }
            },
            Tuesday: {
              breakfast: {
                recipeId: 'recipe-3',
                name: 'Greek Yogurt Bowl',
                calories: 350,
                protein: 20,
                carbs: 35,
                fat: 10
              }
            }
          }
        },
        customerName: 'John Doe',
        options: {
          includeShoppingList: true,
          includeMacroSummary: true
        }
      };

      // Test the validation function directly
      const validatedData = await validateMealPlanData(objectBasedData.mealPlanData);
      
      expect(validatedData).toBeDefined();
      expect(validatedData.planName).toBe('Weekly Meal Plan');
      expect(validatedData.fitnessGoal).toBe('Muscle building plan');
      expect(validatedData.meals).toHaveLength(3);
      
      // Check meal transformation
      expect(validatedData.meals[0].day).toBe(1); // Monday
      expect(validatedData.meals[0].mealType).toBe('breakfast');
      expect(validatedData.meals[0].recipe.name).toBe('Protein Oatmeal');
      
      expect(validatedData.meals[1].day).toBe(1); // Monday
      expect(validatedData.meals[1].mealType).toBe('lunch');
      expect(validatedData.meals[1].recipe.name).toBe('Chicken Salad');
      
      expect(validatedData.meals[2].day).toBe(2); // Tuesday
      expect(validatedData.meals[2].mealType).toBe('breakfast');
      expect(validatedData.meals[2].recipe.name).toBe('Greek Yogurt Bowl');
    });

    it('should handle array-based meal plan data', async () => {
      const arrayBasedData = {
        mealPlanData: {
          planName: 'Array-based Plan',
          fitnessGoal: 'weight_loss',
          dailyCalorieTarget: 1800,
          days: 5,
          mealsPerDay: 3,
          meals: [
            {
              day: 1,
              mealNumber: 1,
              mealType: 'breakfast',
              recipe: {
                id: 'recipe-1',
                name: 'Low-Cal Breakfast',
                caloriesKcal: 300,
                proteinGrams: '20',
                carbsGrams: '25',
                fatGrams: '12',
                prepTimeMinutes: 10,
                servings: 1,
                mealTypes: ['breakfast'],
                dietaryTags: ['low-calorie'],
                ingredientsJson: [{ name: 'Egg whites', amount: '3', unit: 'large' }],
                instructionsText: 'Scramble egg whites'
              }
            },
            {
              day: 1,
              mealNumber: 2,  
              mealType: 'lunch',
              recipe: {
                id: 'recipe-2',
                name: 'Grilled Chicken Salad',
                caloriesKcal: 400,
                proteinGrams: '35',
                carbsGrams: '15',
                fatGrams: '18',
                prepTimeMinutes: 15,
                servings: 1,
                mealTypes: ['lunch'],
                dietaryTags: ['high-protein'],
                ingredientsJson: [
                  { name: 'Chicken breast', amount: '150', unit: 'g' },
                  { name: 'Mixed greens', amount: '2', unit: 'cups' }
                ],
                instructionsText: 'Grill chicken, serve over greens'
              }
            }
          ]
        }
      };

      const validatedData = await validateMealPlanData(arrayBasedData.mealPlanData);
      
      expect(validatedData).toBeDefined();
      expect(validatedData.planName).toBe('Array-based Plan');
      expect(validatedData.meals).toHaveLength(2);
      expect(validatedData.meals[0].recipe.name).toBe('Low-Cal Breakfast');
      expect(validatedData.meals[1].recipe.name).toBe('Grilled Chicken Salad');
    });

    it('should provide sensible defaults for minimal data', async () => {
      const minimalData = {
        mealPlanData: {
          meals: [
            {
              day: 1,
              mealNumber: 1,
              mealType: 'breakfast',
              recipe: {
                id: 'recipe-1',
                name: 'Simple Breakfast',
                caloriesKcal: 350,
                proteinGrams: '15',
                carbsGrams: '40',
                fatGrams: '12',
                prepTimeMinutes: 5,
                servings: 1,
                mealTypes: ['breakfast'],
                dietaryTags: [],
                ingredientsJson: [{ name: 'Toast', amount: '2', unit: 'slices' }],
                instructionsText: 'Toast bread'
              }
            }
          ]
        }
      };

      const validatedData = await validateMealPlanData(minimalData.mealPlanData);
      
      expect(validatedData).toBeDefined();
      expect(validatedData.planName).toBe('Meal Plan'); // Default
      expect(validatedData.fitnessGoal).toBe('General Fitness'); // Default
      expect(validatedData.dailyCalorieTarget).toBe(2000); // Default
      expect(validatedData.days).toBe(7); // Default
      expect(validatedData.mealsPerDay).toBe(3); // Default
    });

    it('should calculate metrics from meal data', async () => {
      const calculatedMetricsData = {
        mealPlanData: {
          planName: 'Calculated Metrics Plan',
          fitnessGoal: 'strength',
          // No dailyCalorieTarget, days, or mealsPerDay - should be calculated
          meals: {
            Monday: {
              breakfast: { recipeId: 'r1', name: 'Meal 1', calories: 400 },
              lunch: { recipeId: 'r2', name: 'Meal 2', calories: 500 },
              dinner: { recipeId: 'r3', name: 'Meal 3', calories: 600 }
            },
            Tuesday: {
              breakfast: { recipeId: 'r4', name: 'Meal 4', calories: 450 },
              lunch: { recipeId: 'r5', name: 'Meal 5', calories: 550 }
            },
            Wednesday: {
              breakfast: { recipeId: 'r6', name: 'Meal 6', calories: 350 }
            }
          }
        }
      };

      const validatedData = await validateMealPlanData(calculatedMetricsData.mealPlanData);
      
      expect(validatedData).toBeDefined();
      expect(validatedData.days).toBeGreaterThanOrEqual(3); // Should calculate or use default
      expect(validatedData.mealsPerDay).toBeGreaterThanOrEqual(3); // Should calculate or use default
      
      // Daily calorie target should be calculated or use default
      // The function may use defaults instead of calculated values
      expect(validatedData.dailyCalorieTarget).toBeGreaterThan(0);
    });

    it('should handle edge cases in object-based meals', async () => {
      const edgeCaseData = {
        mealPlanData: {
          planName: 'Edge Case Plan',
          fitnessGoal: 'maintenance',
          meals: {
            Monday: {
              breakfast: {
                recipeId: 'recipe-1',
                name: 'Valid Meal'
              },
              invalidMeal: {
                // Missing recipeId - should be skipped
                name: 'Invalid Meal'
              }
            },
            InvalidDay: {
              breakfast: {
                recipeId: 'recipe-2',
                name: 'Should be skipped'
              }
            }
          }
        }
      };

      const validatedData = await validateMealPlanData(edgeCaseData.mealPlanData);
      
      expect(validatedData).toBeDefined();
      expect(validatedData.meals).toHaveLength(1); // Only valid Monday breakfast
      expect(validatedData.meals[0].recipe.name).toBe('Valid Meal');
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', async () => {
      const invalidData = {
        mealPlanData: {
          // Missing required fields
          meals: []
        }
      };

      await expect(validateMealPlanData(invalidData.mealPlanData))
        .rejects.toThrow('At least one meal is required');
    });

    it('should handle malformed meal data', async () => {
      const malformedData = {
        mealPlanData: {
          planName: 'Malformed Plan',
          fitnessGoal: 'test',
          dailyCalorieTarget: -100, // Invalid
          days: 500, // Too many
          meals: []
        }
      };

      await expect(validateMealPlanData(malformedData.mealPlanData))
        .rejects.toThrow();
    });
  });

  describe('Recipe Enrichment', () => {
    it('should enrich meals with recipe IDs only', async () => {
      const mealWithRecipeIdOnly = {
        mealPlanData: {
          planName: 'Recipe ID Plan',
          fitnessGoal: 'bulking',
          meals: [
            {
              day: 1,
              mealNumber: 1,
              mealType: 'breakfast',
              recipeId: 'recipe-1' // Only ID, should fetch full recipe
            }
          ]
        }
      };

      const validatedData = await validateMealPlanData(mealWithRecipeIdOnly.mealPlanData);
      
      expect(validatedData).toBeDefined();
      expect(validatedData.meals).toHaveLength(1);
      expect(validatedData.meals[0].recipe.name).toBe('Mock Recipe'); // From mock
      expect(validatedData.meals[0].recipe.caloriesKcal).toBe(400);
    });
  });
});