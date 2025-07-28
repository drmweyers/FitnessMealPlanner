/**
 * PDF Validation Utilities
 * 
 * Validates and sanitizes meal plan data for PDF generation
 */

import { z } from 'zod';

// Recipe validation schema
const recipeSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Recipe name is required'),
  description: z.string().optional().default(''),
  caloriesKcal: z.number().min(0).max(5000),
  proteinGrams: z.string().refine(val => !isNaN(parseFloat(val)), 'Invalid protein value'),
  carbsGrams: z.string().refine(val => !isNaN(parseFloat(val)), 'Invalid carbs value'),
  fatGrams: z.string().refine(val => !isNaN(parseFloat(val)), 'Invalid fat value'),
  prepTimeMinutes: z.number().min(0).max(480), // Max 8 hours
  servings: z.number().min(1).max(20),
  mealTypes: z.array(z.string()).default([]),
  dietaryTags: z.array(z.string()).default([]),
  ingredientsJson: z.array(z.object({
    name: z.string().min(1),
    amount: z.string().min(1),
    unit: z.string().min(1)
  })).default([]),
  instructionsText: z.string().default('')
});

// Meal validation schema
const mealSchema = z.object({
  day: z.number().min(1).max(365), // Max 1 year plan
  mealNumber: z.number().min(1).max(10), // Max 10 meals per day
  mealType: z.string().min(1),
  recipe: recipeSchema
});

// Meal plan validation schema
const mealPlanSchema = z.object({
  id: z.string().optional().default('generated-plan'),
  planName: z.string().min(1, 'Plan name is required').max(100),
  fitnessGoal: z.string().min(1, 'Fitness goal is required'),
  description: z.string().optional().default(''),
  dailyCalorieTarget: z.number().min(500).max(10000),
  days: z.number().min(1).max(365),
  mealsPerDay: z.number().min(1).max(10),
  meals: z.array(mealSchema).min(1, 'At least one meal is required')
});

export type MealPlanPdfData = z.infer<typeof mealPlanSchema>;

/**
 * Validate and sanitize meal plan data for PDF generation
 */
export function validateMealPlanData(data: any): MealPlanPdfData {
  try {
    // Handle different data structures that might come from the frontend
    let mealPlanData = data;
    
    // If data is wrapped in mealPlanData property
    if (data.mealPlanData) {
      mealPlanData = data.mealPlanData;
    }
    
    // If data has meals in the root, use it directly
    if (data.meals && !mealPlanData.meals) {
      mealPlanData = { ...mealPlanData, meals: data.meals };
    }

    // Sanitize and validate the data
    const validated = mealPlanSchema.parse(mealPlanData);
    
    // Additional validation logic
    validateMealPlanLogic(validated);
    
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join('; ');
      throw new Error(`Meal plan validation failed: ${errorMessage}`);
    }
    throw new Error(`Meal plan validation failed: ${(error as Error).message}`);
  }
}

/**
 * Additional business logic validation
 */
function validateMealPlanLogic(mealPlan: MealPlanPdfData): void {
  // Check that meal days are within the plan duration
  const invalidDays = mealPlan.meals.filter(meal => meal.day > mealPlan.days);
  if (invalidDays.length > 0) {
    throw new Error(`Meals found for days beyond plan duration: ${invalidDays.map(m => m.day).join(', ')}`);
  }

  // Check for reasonable calorie distribution
  const mealsByDay = groupMealsByDay(mealPlan.meals);
  Object.entries(mealsByDay).forEach(([day, meals]) => {
    const dayCalories = meals.reduce((sum, meal) => sum + meal.recipe.caloriesKcal, 0);
    
    // Warning for extreme calorie days (but don't fail)
    if (dayCalories < 800 || dayCalories > 6000) {
      console.warn(`Day ${day} has extreme calorie count: ${dayCalories}`);
    }
  });

  // Validate meal types are reasonable
  const validMealTypes = [
    'breakfast', 'lunch', 'dinner', 'snack', 'pre-workout', 'post-workout',
    'brunch', 'supper', 'dessert', 'appetizer'
  ];
  
  const invalidMealTypes = mealPlan.meals.filter(meal => 
    !validMealTypes.includes(meal.mealType.toLowerCase())
  );
  
  if (invalidMealTypes.length > 0) {
    console.warn(`Unusual meal types found: ${invalidMealTypes.map(m => m.mealType).join(', ')}`);
  }
}

/**
 * Group meals by day (helper function)
 */
function groupMealsByDay(meals: MealPlanPdfData['meals']) {
  const mealsByDay: { [day: string]: typeof meals } = {};
  
  meals.forEach(meal => {
    const dayKey = meal.day.toString();
    if (!mealsByDay[dayKey]) {
      mealsByDay[dayKey] = [];
    }
    mealsByDay[dayKey].push(meal);
  });

  return mealsByDay;
}

/**
 * Sanitize text content for PDF output
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/[^\w\s\-.,!?():;"'/]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .substring(0, 500); // Limit length
}

/**
 * Sanitize HTML content for PDF output
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  
  // Basic HTML sanitization - remove script tags and dangerous attributes
  return html
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
}

/**
 * Validate and format ingredient amounts
 */
export function formatIngredientAmount(amount: string, unit: string): string {
  const numericAmount = parseFloat(amount);
  
  if (isNaN(numericAmount)) {
    return amount; // Return original if not numeric
  }
  
  // Format based on unit type
  const volumeUnits = ['cup', 'cups', 'ml', 'l', 'tsp', 'tbsp', 'fl oz'];
  const weightUnits = ['g', 'kg', 'oz', 'lb', 'lbs'];
  
  if (volumeUnits.includes(unit.toLowerCase())) {
    // Format fractions for volume measurements
    return formatFraction(numericAmount);
  } else if (weightUnits.includes(unit.toLowerCase())) {
    // Format decimals for weight measurements
    return numericAmount % 1 === 0 ? numericAmount.toString() : numericAmount.toFixed(1);
  } else {
    // Default formatting
    return numericAmount % 1 === 0 ? numericAmount.toString() : numericAmount.toFixed(2);
  }
}

/**
 * Format decimal numbers as fractions for cooking measurements
 */
function formatFraction(decimal: number): string {
  if (decimal % 1 === 0) {
    return decimal.toString();
  }
  
  // Common cooking fractions
  const fractions = [
    { decimal: 0.125, fraction: '1/8' },
    { decimal: 0.25, fraction: '1/4' },
    { decimal: 0.333, fraction: '1/3' },
    { decimal: 0.5, fraction: '1/2' },
    { decimal: 0.667, fraction: '2/3' },
    { decimal: 0.75, fraction: '3/4' }
  ];
  
  const whole = Math.floor(decimal);
  const fractional = decimal - whole;
  
  // Find closest fraction
  const closestFraction = fractions.reduce((prev, curr) => 
    Math.abs(curr.decimal - fractional) < Math.abs(prev.decimal - fractional) ? curr : prev
  );
  
  if (Math.abs(closestFraction.decimal - fractional) < 0.05) {
    return whole > 0 ? `${whole} ${closestFraction.fraction}` : closestFraction.fraction;
  }
  
  // If no close fraction match, use decimal
  return decimal.toFixed(2);
}