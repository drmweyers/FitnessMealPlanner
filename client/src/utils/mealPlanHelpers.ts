/**
 * Meal Plan Data Access Helpers
 * 
 * These functions provide safe, consistent access to meal plan data
 * regardless of the nested structure. They prevent the runtime errors
 * we experienced by providing fallbacks and validation.
 */

import type { CustomerMealPlan, MealPlan } from "@shared/schema";

/**
 * Safely extracts meals array from a customer meal plan
 */
export function getMeals(customerMealPlan: CustomerMealPlan): MealPlan['meals'] {
  const meals = customerMealPlan.mealPlanData?.meals;
  return Array.isArray(meals) ? meals : [];
}

/**
 * Safely gets meals with valid recipe data
 */
export function getValidMeals(customerMealPlan: CustomerMealPlan): NonNullable<MealPlan['meals']> {
  const meals = getMeals(customerMealPlan);
  return meals.filter(meal => meal && meal.recipe);
}

/**
 * Safely gets the number of days in the meal plan
 */
export function getDays(customerMealPlan: CustomerMealPlan): number {
  return customerMealPlan.totalDays || 
         customerMealPlan.mealPlanData?.days || 
         1;
}

/**
 * Safely gets the plan name
 */
export function getPlanName(customerMealPlan: CustomerMealPlan): string {
  return customerMealPlan.planName || 
         customerMealPlan.mealPlanData?.planName || 
         'Untitled Plan';
}

/**
 * Safely gets the fitness goal
 */
export function getFitnessGoal(customerMealPlan: CustomerMealPlan): string {
  const goal = customerMealPlan.fitnessGoal || 
               customerMealPlan.mealPlanData?.fitnessGoal;
  return goal?.replace('_', ' ') || 'General';
}

/**
 * Safely gets the client name
 */
export function getClientName(customerMealPlan: CustomerMealPlan): string | undefined {
  return customerMealPlan.mealPlanData?.clientName;
}

/**
 * Safely gets daily calorie target
 */
export function getDailyCalorieTarget(customerMealPlan: CustomerMealPlan): number {
  return customerMealPlan.dailyCalorieTarget || 
         customerMealPlan.mealPlanData?.dailyCalorieTarget || 
         2000;
}

/**
 * Calculates nutrition totals with safety checks
 */
export function calculateNutrition(customerMealPlan: CustomerMealPlan) {
  const validMeals = getValidMeals(customerMealPlan);
  const days = getDays(customerMealPlan);
  
  const totalCalories = validMeals.reduce((sum, meal) => sum + (meal.recipe.caloriesKcal || 0), 0);
  const totalProtein = validMeals.reduce((sum, meal) => sum + Number(meal.recipe.proteinGrams || 0), 0);
  const totalCarbs = validMeals.reduce((sum, meal) => sum + Number(meal.recipe.carbsGrams || 0), 0);
  const totalFat = validMeals.reduce((sum, meal) => sum + Number(meal.recipe.fatGrams || 0), 0);

  return {
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    avgCaloriesPerDay: Math.round(totalCalories / days),
    avgProteinPerDay: Math.round(totalProtein / days),
    avgCarbsPerDay: Math.round(totalCarbs / days),
    avgFatPerDay: Math.round(totalFat / days),
  };
}

/**
 * Gets unique meal types from the meal plan
 */
export function getMealTypes(customerMealPlan: CustomerMealPlan): string[] {
  const validMeals = getValidMeals(customerMealPlan);
  return validMeals
    .map(meal => meal.mealType)
    .filter((type, index, array) => array.indexOf(type) === index);
}

/**
 * Type guard to check if a meal plan has valid data
 */
export function isValidMealPlan(customerMealPlan: any): customerMealPlan is CustomerMealPlan {
  return !!(customerMealPlan && 
           customerMealPlan.mealPlanData &&
           Array.isArray(customerMealPlan.mealPlanData.meals));
}