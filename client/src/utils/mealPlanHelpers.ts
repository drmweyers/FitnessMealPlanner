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
 * Safely gets meals with valid recipe data OR manual meals
 * Supports both AI-generated meals (with recipe) and manual meals (without recipe)
 */
export function getValidMeals(customerMealPlan: CustomerMealPlan): NonNullable<MealPlan['meals']> {
  const meals = getMeals(customerMealPlan);
  return meals.filter(meal => meal && (meal.recipe || meal.manual));
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
 * Supports both AI-generated meals (with recipe) and manual meals (with optional nutrition)
 */
export function calculateNutrition(customerMealPlan: CustomerMealPlan) {
  const validMeals = getValidMeals(customerMealPlan);
  const days = getDays(customerMealPlan);

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  for (const meal of validMeals) {
    if (meal.recipe) {
      // AI-generated meal with recipe
      totalCalories += meal.recipe.caloriesKcal || 0;
      totalProtein += Number(meal.recipe.proteinGrams || 0);
      totalCarbs += Number(meal.recipe.carbsGrams || 0);
      totalFat += Number(meal.recipe.fatGrams || 0);
    } else if (meal.manual && meal.manualNutrition) {
      // Manual meal with nutrition data
      totalCalories += meal.manualNutrition.calories || 0;
      totalProtein += meal.manualNutrition.protein || 0;
      totalCarbs += meal.manualNutrition.carbs || 0;
      totalFat += meal.manualNutrition.fat || 0;
    }
    // If manual meal without nutrition, contribute 0 (will show "Not calculated")
  }

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