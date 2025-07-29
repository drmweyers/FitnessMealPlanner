/**
 * Safe Meal Plan Hook
 * 
 * This hook provides safe access to meal plan data with runtime validation
 * and error boundaries. It prevents the runtime errors we experienced by
 * validating data structure and providing fallbacks.
 */

import { useMemo } from 'react';
import type { CustomerMealPlan } from '@shared/schema';
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
} from '../utils/mealPlanHelpers';

export interface UseSafeMealPlanResult {
  // Raw data
  isValid: boolean;
  mealPlan: CustomerMealPlan | null;
  
  // Safe accessors
  meals: ReturnType<typeof getMeals>;
  validMeals: ReturnType<typeof getValidMeals>;
  days: number;
  planName: string;
  fitnessGoal: string;
  clientName: string | undefined;
  dailyCalorieTarget: number;
  mealTypes: string[];
  
  // Calculated values
  nutrition: ReturnType<typeof calculateNutrition>;
  
  // Utility functions
  getMealsForDay: (day: number) => ReturnType<typeof getValidMeals>;
  hasMeals: boolean;
  hasValidData: boolean;
}

/**
 * Hook that provides safe access to meal plan data
 */
export function useSafeMealPlan(mealPlan: CustomerMealPlan | null | undefined): UseSafeMealPlanResult {
  return useMemo(() => {
    // Early validation
    const isValid = isValidMealPlan(mealPlan);
    const safeMealPlan = mealPlan || null;
    
    if (!isValid || !safeMealPlan) {
      // Return safe defaults for invalid/missing data
      return {
        isValid: false,
        mealPlan: safeMealPlan,
        meals: [],
        validMeals: [],
        days: 1,
        planName: 'Untitled Plan',
        fitnessGoal: 'General',
        clientName: undefined,
        dailyCalorieTarget: 2000,
        mealTypes: [],
        nutrition: {
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0,
          avgCaloriesPerDay: 0,
          avgProteinPerDay: 0,
          avgCarbsPerDay: 0,
          avgFatPerDay: 0,
        },
        getMealsForDay: () => [],
        hasMeals: false,
        hasValidData: false,
      };
    }

    // Extract safe data
    const meals = getMeals(safeMealPlan);
    const validMeals = getValidMeals(safeMealPlan);
    const days = getDays(safeMealPlan);
    const planName = getPlanName(safeMealPlan);
    const fitnessGoal = getFitnessGoal(safeMealPlan);
    const clientName = getClientName(safeMealPlan);
    const dailyCalorieTarget = getDailyCalorieTarget(safeMealPlan);
    const mealTypes = getMealTypes(safeMealPlan);
    const nutrition = calculateNutrition(safeMealPlan);

    // Utility function to get meals for a specific day
    const getMealsForDay = (day: number) => {
      return validMeals.filter(meal => meal.day === day);
    };

    return {
      isValid: true,
      mealPlan: safeMealPlan,
      meals,
      validMeals,
      days,
      planName,
      fitnessGoal,
      clientName,
      dailyCalorieTarget,
      mealTypes,
      nutrition,
      getMealsForDay,
      hasMeals: validMeals.length > 0,
      hasValidData: true,
    };
  }, [mealPlan]);
}

/**
 * Hook for components that require valid meal plan data
 * Throws an error if the meal plan is invalid, forcing proper error handling
 */
export function useValidMealPlan(mealPlan: CustomerMealPlan | null | undefined): Exclude<UseSafeMealPlanResult, { isValid: false }> {
  const result = useSafeMealPlan(mealPlan);
  
  if (!result.isValid) {
    throw new Error('Invalid meal plan data provided to component requiring valid data');
  }
  
  return result as Exclude<UseSafeMealPlanResult, { isValid: false }>;
}