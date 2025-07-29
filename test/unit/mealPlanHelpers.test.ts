/**
 * Tests for Meal Plan Helper Functions
 * 
 * These tests ensure that our helper functions handle all edge cases
 * and data structure variations correctly, preventing runtime errors.
 */

import { describe, test, expect } from 'vitest';
import {
  getMeals,
  getValidMeals,
  getDays,
  getPlanName,
  getFitnessGoal,
  getClientName,
  getDailyCalorieTarget,
  calculateNutrition,
  getMealTypes,
  isValidMealPlan,
} from '../../client/src/utils/mealPlanHelpers';
import type { CustomerMealPlan } from '@shared/schema';

// Test data factories
const createValidMealPlan = (overrides = {}): CustomerMealPlan => ({
  id: 'test-id',
  customerId: 'customer-id',
  trainerId: 'trainer-id',
  assignedAt: new Date(),
  mealPlanData: {
    id: 'plan-id',
    planName: 'Test Plan',
    fitnessGoal: 'weight_loss',
    description: 'Test description',
    dailyCalorieTarget: 2000,
    clientName: 'Test Client',
    days: 3,
    mealsPerDay: 3,
    generatedBy: 'trainer-id',
    createdAt: new Date(),
    meals: [
      {
        day: 1,
        mealNumber: 1,
        mealType: 'breakfast',
        recipe: {
          id: 'recipe-1',
          name: 'Test Recipe',
          description: 'Test description',
          caloriesKcal: 300,
          proteinGrams: '20',
          carbsGrams: '30',
          fatGrams: '10',
          servings: 2,
          prepTimeMinutes: 15,
          cookTimeMinutes: 20,
          ingredientsJson: [],
          instructionsText: 'Test instructions',
          imageUrl: 'test-image.jpg',
          mealTypes: ['breakfast'],
          dietaryTags: [],
          mainIngredientTags: ['test'],
        },
      },
    ],
  },
  ...overrides,
});

describe('mealPlanHelpers', () => {
  describe('getMeals', () => {
    test('returns meals array when valid', () => {
      const mealPlan = createValidMealPlan();
      const meals = getMeals(mealPlan);
      expect(meals).toHaveLength(1);
      expect(meals[0].recipe.name).toBe('Test Recipe');
    });

    test('returns empty array when mealPlanData is null', () => {
      const mealPlan = createValidMealPlan({ mealPlanData: null });
      const meals = getMeals(mealPlan);
      expect(meals).toEqual([]);
    });

    test('returns empty array when meals is undefined', () => {
      const mealPlan = createValidMealPlan({
        mealPlanData: { ...createValidMealPlan().mealPlanData!, meals: undefined },
      });
      const meals = getMeals(mealPlan);
      expect(meals).toEqual([]);
    });

    test('returns empty array when meals is not an array', () => {
      const mealPlan = createValidMealPlan({
        mealPlanData: { ...createValidMealPlan().mealPlanData!, meals: 'not-an-array' as any },
      });
      const meals = getMeals(mealPlan);
      expect(meals).toEqual([]);
    });
  });

  describe('getValidMeals', () => {
    test('filters out meals without recipes', () => {
      const mealPlan = createValidMealPlan({
        mealPlanData: {
          ...createValidMealPlan().mealPlanData!,
          meals: [
            createValidMealPlan().mealPlanData!.meals[0],
            { day: 2, mealNumber: 1, mealType: 'lunch', recipe: null } as any,
            { day: 3, mealNumber: 1, mealType: 'dinner' } as any, // missing recipe
          ],
        },
      });
      
      const validMeals = getValidMeals(mealPlan);
      expect(validMeals).toHaveLength(1);
      expect(validMeals[0].recipe.name).toBe('Test Recipe');
    });
  });

  describe('getDays', () => {
    test('returns totalDays when available', () => {
      const mealPlan = createValidMealPlan({ totalDays: 5 });
      expect(getDays(mealPlan)).toBe(5);
    });

    test('falls back to mealPlanData.days', () => {
      const mealPlan = createValidMealPlan();
      expect(getDays(mealPlan)).toBe(3);
    });

    test('returns 1 when no days specified', () => {
      const mealPlan = createValidMealPlan({
        totalDays: undefined,
        mealPlanData: { ...createValidMealPlan().mealPlanData!, days: undefined },
      });
      expect(getDays(mealPlan)).toBe(1);
    });
  });

  describe('getPlanName', () => {
    test('returns planName when available at top level', () => {
      const mealPlan = createValidMealPlan({ planName: 'Top Level Plan' });
      expect(getPlanName(mealPlan)).toBe('Top Level Plan');
    });

    test('falls back to mealPlanData.planName', () => {
      const mealPlan = createValidMealPlan();
      expect(getPlanName(mealPlan)).toBe('Test Plan');
    });

    test('returns default when no plan name', () => {
      const mealPlan = createValidMealPlan({
        planName: undefined,
        mealPlanData: { ...createValidMealPlan().mealPlanData!, planName: undefined },
      });
      expect(getPlanName(mealPlan)).toBe('Untitled Plan');
    });
  });

  describe('getFitnessGoal', () => {
    test('formats fitness goal correctly', () => {
      const mealPlan = createValidMealPlan({ fitnessGoal: 'muscle_gain' });
      expect(getFitnessGoal(mealPlan)).toBe('muscle gain');
    });

    test('returns default when no fitness goal', () => {
      const mealPlan = createValidMealPlan({
        fitnessGoal: undefined,
        mealPlanData: { ...createValidMealPlan().mealPlanData!, fitnessGoal: undefined },
      });
      expect(getFitnessGoal(mealPlan)).toBe('General');
    });
  });

  describe('calculateNutrition', () => {
    test('calculates nutrition correctly with valid meals', () => {
      const mealPlan = createValidMealPlan({
        mealPlanData: {
          ...createValidMealPlan().mealPlanData!,
          days: 2,
          meals: [
            {
              ...createValidMealPlan().mealPlanData!.meals[0],
              recipe: {
                ...createValidMealPlan().mealPlanData!.meals[0].recipe,
                caloriesKcal: 400,
                proteinGrams: '30',
                carbsGrams: '50',
                fatGrams: '15',
              },
            },
            {
              ...createValidMealPlan().mealPlanData!.meals[0],
              day: 2,
              recipe: {
                ...createValidMealPlan().mealPlanData!.meals[0].recipe,
                caloriesKcal: 600,
                proteinGrams: '40',
                carbsGrams: '60',
                fatGrams: '20',
              },
            },
          ],
        },
      });

      const nutrition = calculateNutrition(mealPlan);
      
      expect(nutrition.totalCalories).toBe(1000);
      expect(nutrition.totalProtein).toBe(70);
      expect(nutrition.totalCarbs).toBe(110);
      expect(nutrition.totalFat).toBe(35);
      expect(nutrition.avgCaloriesPerDay).toBe(500);
      expect(nutrition.avgProteinPerDay).toBe(35);
    });

    test('handles empty meals gracefully', () => {
      const mealPlan = createValidMealPlan({
        mealPlanData: { ...createValidMealPlan().mealPlanData!, meals: [] },
      });

      const nutrition = calculateNutrition(mealPlan);
      
      expect(nutrition.totalCalories).toBe(0);
      expect(nutrition.avgCaloriesPerDay).toBe(0);
    });
  });

  describe('isValidMealPlan', () => {
    test('returns true for valid meal plan', () => {
      const mealPlan = createValidMealPlan();
      expect(isValidMealPlan(mealPlan)).toBe(true);
    });

    test('returns false for null/undefined', () => {
      expect(isValidMealPlan(null)).toBe(false);
      expect(isValidMealPlan(undefined)).toBe(false);
    });

    test('returns false when mealPlanData is missing', () => {
      const mealPlan = { id: 'test' };
      expect(isValidMealPlan(mealPlan)).toBe(false);
    });

    test('returns false when meals is not an array', () => {
      const mealPlan = createValidMealPlan({
        mealPlanData: { ...createValidMealPlan().mealPlanData!, meals: 'not-array' as any },
      });
      expect(isValidMealPlan(mealPlan)).toBe(false);
    });
  });
});