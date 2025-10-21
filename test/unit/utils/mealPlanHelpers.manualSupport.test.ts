/**
 * Manual Meal Plan Support Tests - mealPlanHelpers.ts
 *
 * Tests for the fixes that enable manual meal plans to display correctly
 *
 * Critical fixes tested:
 * 1. getValidMeals() now includes manual meals (meal.manual === true)
 * 2. calculateNutrition() supports both recipe and manualNutrition
 * 3. "Not calculated" display for missing nutrition
 */

import { describe, test, expect } from 'vitest';
import {
  getValidMeals,
  calculateNutrition,
  getDays,
  getPlanName,
  getMealTypes
} from '../../../client/src/utils/mealPlanHelpers';
import type { CustomerMealPlan } from '@shared/schema';

describe('mealPlanHelpers - Manual Meal Plan Support', () => {

  describe('getValidMeals() - Manual Meal Support', () => {
    test('includes manual meals without recipe property', () => {
      const mealPlan: CustomerMealPlan = {
        id: 'test-plan-1',
        planName: 'Test Manual Plan',
        mealPlanData: {
          planName: 'Test Manual Plan',
          days: 1,
          mealsPerDay: 2,
          dailyCalorieTarget: 2000,
          fitnessGoal: 'general',
          meals: [
            {
              day: 1,
              mealNumber: 1,
              mealType: 'breakfast',
              manual: true,  // ✅ Manual meal
              manualIngredients: [
                { name: 'Eggs', displayQuantity: '4', unitSI: undefined, quantitySI: undefined, estimationStatus: 'unknown' }
              ]
            },
            {
              day: 1,
              mealNumber: 2,
              mealType: 'lunch',
              manual: true,  // ✅ Manual meal
              manualIngredients: [
                { name: 'Rice', displayQuantity: '175g', unitSI: 'g', quantitySI: 175, estimationStatus: 'unknown' }
              ]
            }
          ]
        }
      } as any;

      const validMeals = getValidMeals(mealPlan);

      expect(validMeals).toHaveLength(2);
      expect(validMeals[0].manual).toBe(true);
      expect(validMeals[1].manual).toBe(true);
    });

    test('includes AI-generated meals with recipe property', () => {
      const mealPlan: CustomerMealPlan = {
        id: 'test-plan-2',
        planName: 'Test AI Plan',
        mealPlanData: {
          planName: 'Test AI Plan',
          days: 1,
          mealsPerDay: 1,
          dailyCalorieTarget: 2000,
          fitnessGoal: 'general',
          meals: [
            {
              day: 1,
              mealNumber: 1,
              mealType: 'breakfast',
              recipe: {
                id: 'recipe-1',
                name: 'Oatmeal',
                caloriesKcal: 350,
                proteinGrams: 12,
                carbsGrams: 45,
                fatGrams: 8
              }
            }
          ]
        }
      } as any;

      const validMeals = getValidMeals(mealPlan);

      expect(validMeals).toHaveLength(1);
      expect(validMeals[0].recipe).toBeDefined();
    });

    test('includes both manual and AI meals in mixed plan', () => {
      const mealPlan: CustomerMealPlan = {
        id: 'test-plan-3',
        planName: 'Mixed Plan',
        mealPlanData: {
          planName: 'Mixed Plan',
          days: 1,
          mealsPerDay: 2,
          dailyCalorieTarget: 2000,
          fitnessGoal: 'general',
          meals: [
            {
              day: 1,
              mealNumber: 1,
              mealType: 'breakfast',
              manual: true,
              manualIngredients: []
            },
            {
              day: 1,
              mealNumber: 2,
              mealType: 'lunch',
              recipe: {
                id: 'recipe-1',
                name: 'Salad',
                caloriesKcal: 250,
                proteinGrams: 15,
                carbsGrams: 20,
                fatGrams: 10
              }
            }
          ]
        }
      } as any;

      const validMeals = getValidMeals(mealPlan);

      expect(validMeals).toHaveLength(2);
      expect(validMeals[0].manual).toBe(true);
      expect(validMeals[1].recipe).toBeDefined();
    });

    test('filters out invalid meals (no recipe and no manual flag)', () => {
      const mealPlan: CustomerMealPlan = {
        id: 'test-plan-4',
        planName: 'Test Plan',
        mealPlanData: {
          planName: 'Test Plan',
          days: 1,
          mealsPerDay: 3,
          dailyCalorieTarget: 2000,
          fitnessGoal: 'general',
          meals: [
            {
              day: 1,
              mealNumber: 1,
              mealType: 'breakfast',
              manual: true
            },
            {
              day: 1,
              mealNumber: 2,
              mealType: 'lunch'
              // ❌ No recipe, no manual flag - should be filtered out
            },
            {
              day: 1,
              mealNumber: 3,
              mealType: 'dinner',
              recipe: { id: 'r1', name: 'Dinner', caloriesKcal: 500, proteinGrams: 30, carbsGrams: 40, fatGrams: 15 }
            }
          ]
        }
      } as any;

      const validMeals = getValidMeals(mealPlan);

      expect(validMeals).toHaveLength(2); // Only manual and recipe meals
    });
  });

  describe('calculateNutrition() - Manual Nutrition Support', () => {
    test('calculates nutrition from manualNutrition field', () => {
      const mealPlan: CustomerMealPlan = {
        id: 'test-plan-5',
        planName: 'Manual Plan with Nutrition',
        mealPlanData: {
          planName: 'Manual Plan with Nutrition',
          days: 1,
          mealsPerDay: 2,
          dailyCalorieTarget: 2000,
          fitnessGoal: 'general',
          meals: [
            {
              day: 1,
              mealNumber: 1,
              mealType: 'breakfast',
              manual: true,
              manualNutrition: {
                calories: 450,
                protein: 35,
                carbs: 45,
                fat: 12
              }
            },
            {
              day: 1,
              mealNumber: 2,
              mealType: 'lunch',
              manual: true,
              manualNutrition: {
                calories: 550,
                protein: 40,
                carbs: 50,
                fat: 18
              }
            }
          ]
        }
      } as any;

      const nutrition = calculateNutrition(mealPlan);

      expect(nutrition.totalCalories).toBe(1000); // 450 + 550
      expect(nutrition.totalProtein).toBe(75); // 35 + 40
      expect(nutrition.totalCarbs).toBe(95); // 45 + 50
      expect(nutrition.totalFat).toBe(30); // 12 + 18
      expect(nutrition.avgCaloriesPerDay).toBe(1000); // 1000 / 1 day
      expect(nutrition.avgProteinPerDay).toBe(75);
    });

    test('calculates nutrition from recipe field for AI meals', () => {
      const mealPlan: CustomerMealPlan = {
        id: 'test-plan-6',
        planName: 'AI Plan',
        mealPlanData: {
          planName: 'AI Plan',
          days: 1,
          mealsPerDay: 1,
          dailyCalorieTarget: 2000,
          fitnessGoal: 'general',
          meals: [
            {
              day: 1,
              mealNumber: 1,
              mealType: 'breakfast',
              recipe: {
                id: 'recipe-1',
                name: 'Oatmeal',
                caloriesKcal: 350,
                proteinGrams: 12,
                carbsGrams: 45,
                fatGrams: 8
              }
            }
          ]
        }
      } as any;

      const nutrition = calculateNutrition(mealPlan);

      expect(nutrition.totalCalories).toBe(350);
      expect(nutrition.totalProtein).toBe(12);
      expect(nutrition.totalCarbs).toBe(45);
      expect(nutrition.totalFat).toBe(8);
    });

    test('handles mixed manual and AI meals correctly', () => {
      const mealPlan: CustomerMealPlan = {
        id: 'test-plan-7',
        planName: 'Mixed Plan',
        mealPlanData: {
          planName: 'Mixed Plan',
          days: 1,
          mealsPerDay: 2,
          dailyCalorieTarget: 2000,
          fitnessGoal: 'general',
          meals: [
            {
              day: 1,
              mealNumber: 1,
              mealType: 'breakfast',
              manual: true,
              manualNutrition: {
                calories: 450,
                protein: 35,
                carbs: 45,
                fat: 12
              }
            },
            {
              day: 1,
              mealNumber: 2,
              mealType: 'lunch',
              recipe: {
                id: 'recipe-1',
                name: 'Salad',
                caloriesKcal: 250,
                proteinGrams: 15,
                carbsGrams: 20,
                fatGrams: 10
              }
            }
          ]
        }
      } as any;

      const nutrition = calculateNutrition(mealPlan);

      expect(nutrition.totalCalories).toBe(700); // 450 (manual) + 250 (recipe)
      expect(nutrition.totalProtein).toBe(50); // 35 + 15
    });

    test('returns 0 for manual meals without nutrition data', () => {
      const mealPlan: CustomerMealPlan = {
        id: 'test-plan-8',
        planName: 'Manual Plan No Nutrition',
        mealPlanData: {
          planName: 'Manual Plan No Nutrition',
          days: 1,
          mealsPerDay: 1,
          dailyCalorieTarget: 2000,
          fitnessGoal: 'general',
          meals: [
            {
              day: 1,
              mealNumber: 1,
              mealType: 'breakfast',
              manual: true
              // No manualNutrition field
            }
          ]
        }
      } as any;

      const nutrition = calculateNutrition(mealPlan);

      expect(nutrition.totalCalories).toBe(0);
      expect(nutrition.totalProtein).toBe(0);
      expect(nutrition.totalCarbs).toBe(0);
      expect(nutrition.totalFat).toBe(0);
      expect(nutrition.avgCaloriesPerDay).toBe(0); // This will show "Not calculated" in UI
    });

    test('averages nutrition across multiple days correctly', () => {
      const mealPlan: CustomerMealPlan = {
        id: 'test-plan-9',
        planName: '7-Day Manual Plan',
        mealPlanData: {
          planName: '7-Day Manual Plan',
          days: 7,
          mealsPerDay: 3,
          dailyCalorieTarget: 2100,
          fitnessGoal: 'general',
          meals: [
            // Day 1
            {
              day: 1,
              mealNumber: 1,
              mealType: 'breakfast',
              manual: true,
              manualNutrition: { calories: 500, protein: 30, carbs: 50, fat: 15 }
            },
            {
              day: 1,
              mealNumber: 2,
              mealType: 'lunch',
              manual: true,
              manualNutrition: { calories: 600, protein: 40, carbs: 60, fat: 20 }
            },
            {
              day: 1,
              mealNumber: 3,
              mealType: 'dinner',
              manual: true,
              manualNutrition: { calories: 700, protein: 50, carbs: 70, fat: 25 }
            },
            // Day 2 (same meals repeated)
            {
              day: 2,
              mealNumber: 1,
              mealType: 'breakfast',
              manual: true,
              manualNutrition: { calories: 500, protein: 30, carbs: 50, fat: 15 }
            },
            {
              day: 2,
              mealNumber: 2,
              mealType: 'lunch',
              manual: true,
              manualNutrition: { calories: 600, protein: 40, carbs: 60, fat: 20 }
            },
            {
              day: 2,
              mealNumber: 3,
              mealType: 'dinner',
              manual: true,
              manualNutrition: { calories: 700, protein: 50, carbs: 70, fat: 25 }
            }
            // Assume days 3-7 have same meals (totalCalories = 1800 * 7 = 12600)
          ]
        }
      } as any;

      const nutrition = calculateNutrition(mealPlan);

      // Total for 2 days shown: 1800 * 2 = 3600
      expect(nutrition.totalCalories).toBe(3600);
      expect(nutrition.totalProtein).toBe(240); // 120 per day * 2

      // Averaged over 7 days
      expect(nutrition.avgCaloriesPerDay).toBe(Math.round(3600 / 7)); // ~514
      expect(nutrition.avgProteinPerDay).toBe(Math.round(240 / 7)); // ~34
    });
  });

  describe('Edge Cases', () => {
    test('handles empty meal plan gracefully', () => {
      const mealPlan: CustomerMealPlan = {
        id: 'test-plan-10',
        planName: 'Empty Plan',
        mealPlanData: {
          planName: 'Empty Plan',
          days: 1,
          mealsPerDay: 0,
          dailyCalorieTarget: 2000,
          fitnessGoal: 'general',
          meals: []
        }
      } as any;

      const validMeals = getValidMeals(mealPlan);
      const nutrition = calculateNutrition(mealPlan);

      expect(validMeals).toHaveLength(0);
      expect(nutrition.avgCaloriesPerDay).toBe(0);
    });

    test('handles undefined nutrition values gracefully', () => {
      const mealPlan: CustomerMealPlan = {
        id: 'test-plan-11',
        planName: 'Partial Nutrition',
        mealPlanData: {
          planName: 'Partial Nutrition',
          days: 1,
          mealsPerDay: 1,
          dailyCalorieTarget: 2000,
          fitnessGoal: 'general',
          meals: [
            {
              day: 1,
              mealNumber: 1,
              mealType: 'breakfast',
              manual: true,
              manualNutrition: {
                calories: 450,
                // protein, carbs, fat undefined
              }
            }
          ]
        }
      } as any;

      const nutrition = calculateNutrition(mealPlan);

      expect(nutrition.totalCalories).toBe(450);
      expect(nutrition.totalProtein).toBe(0); // undefined treated as 0
      expect(nutrition.totalCarbs).toBe(0);
      expect(nutrition.totalFat).toBe(0);
    });
  });

  describe('Backward Compatibility', () => {
    test('existing AI meal plans still work', () => {
      const aiMealPlan: CustomerMealPlan = {
        id: 'ai-plan-1',
        planName: 'AI Generated Plan',
        mealPlanData: {
          planName: 'AI Generated Plan',
          days: 1,
          mealsPerDay: 3,
          dailyCalorieTarget: 2100,
          fitnessGoal: 'muscle_gain',
          meals: [
            {
              day: 1,
              mealNumber: 1,
              mealType: 'breakfast',
              recipe: {
                id: 'r1',
                name: 'Oatmeal',
                caloriesKcal: 350,
                proteinGrams: 12,
                carbsGrams: 55,
                fatGrams: 7
              }
            },
            {
              day: 1,
              mealNumber: 2,
              mealType: 'lunch',
              recipe: {
                id: 'r2',
                name: 'Chicken Bowl',
                caloriesKcal: 650,
                proteinGrams: 55,
                carbsGrams: 60,
                fatGrams: 18
              }
            },
            {
              day: 1,
              mealNumber: 3,
              mealType: 'dinner',
                recipe: {
                id: 'r3',
                name: 'Salmon & Rice',
                caloriesKcal: 700,
                proteinGrams: 50,
                carbsGrams: 65,
                fatGrams: 22
              }
            }
          ]
        }
      } as any;

      const validMeals = getValidMeals(aiMealPlan);
      const nutrition = calculateNutrition(aiMealPlan);

      expect(validMeals).toHaveLength(3);
      expect(nutrition.totalCalories).toBe(1700);
      expect(nutrition.totalProtein).toBe(117);
      expect(nutrition.avgCaloriesPerDay).toBe(1700);
    });
  });
});
