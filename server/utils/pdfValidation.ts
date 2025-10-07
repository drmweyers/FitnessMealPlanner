/**
 * PDF Validation Utilities
 * 
 * Validates and sanitizes meal plan data for PDF generation
 */

import { z } from 'zod';
import { storage } from '../storage';
import { mealPlanSchema as sharedMealPlanSchema } from '@shared/schema';

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
 * Transform frontend meal plan data to PDF-compatible format
 */
function transformMealPlanData(data: any): any {
  // Handle different data structures that might come from the frontend
  let mealPlanData = data;
  
  // If data is wrapped in mealPlanData property
  if (data.mealPlanData) {
    mealPlanData = data.mealPlanData;
  }
  
  // If this looks like a frontend meal plan object, transform it
  if (data.name && !data.planName) {
    mealPlanData = {
      ...mealPlanData,
      planName: data.name,
      fitnessGoal: data.fitnessGoal || data.description || 'General Fitness',
      dailyCalorieTarget: data.dailyCalorieTarget || calculateDailyCalories(data.meals),
      days: data.days || calculateDays(data.meals),
      mealsPerDay: data.mealsPerDay || calculateMealsPerDay(data.meals)
    };
  }
  
  // Transform meals structure if needed
  if (data.meals) {
    if (Array.isArray(data.meals)) {
      // If meals are already in the correct format, use them
      if (data.meals[0]?.day && data.meals[0]?.mealNumber) {
        mealPlanData.meals = data.meals;
      } else {
        // Transform from array-based meals to correct format
        mealPlanData.meals = transformMealsStructure(data.meals);
      }
    } else if (typeof data.meals === 'object') {
      // Transform object-based meals structure (Monday: {...}) to array
      mealPlanData.meals = transformMealsFromObject(data.meals);
    }
  }
  
  return mealPlanData;
}

/**
 * Transform meals from object structure (Monday: {breakfast: ...}) to array format
 */
function transformMealsFromObject(mealsObj: any): any[] {
  const meals: any[] = [];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  Object.entries(mealsObj).forEach(([dayName, dayMeals]: [string, any]) => {
    const dayNumber = dayNames.indexOf(dayName) + 1;
    if (dayNumber === 0) return; // Skip invalid day names
    
    Object.entries(dayMeals).forEach(([mealType, mealData]: [string, any], mealIndex) => {
      if (mealData && mealData.recipeId) {
        meals.push({
          day: dayNumber,
          mealNumber: mealIndex + 1,
          mealType: mealType,
          recipe: {
            id: mealData.recipeId,
            name: mealData.name || `${mealType} recipe`,
            description: mealData.description || '',
            caloriesKcal: mealData.calories || 400,
            proteinGrams: String(mealData.protein || 20),
            carbsGrams: String(mealData.carbs || 40),
            fatGrams: String(mealData.fat || 15),
            prepTimeMinutes: mealData.prepTime || 15,
            cookTimeMinutes: mealData.cookTime || 20,
            servings: mealData.portions || 1,
            mealTypes: [mealType],
            dietaryTags: mealData.tags || [],
            mainIngredientTags: [],
            ingredientsJson: mealData.ingredients || [],
            instructionsText: mealData.instructions || 'No instructions provided.',
            imageUrl: mealData.imageUrl
          }
        });
      }
    });
  });
  
  return meals;
}

/**
 * Transform meals structure to required format
 */
function transformMealsStructure(meals: any[]): any[] {
  return meals.map((meal, index) => ({
    day: meal.day || Math.floor(index / 3) + 1,
    mealNumber: meal.mealNumber || (index % 3) + 1,
    mealType: meal.mealType || 'meal',
    recipe: meal.recipe || meal
  }));
}

/**
 * Calculate daily calories from meals
 */
function calculateDailyCalories(meals: any[]): number {
  if (!meals || meals.length === 0) return 2000;
  
  const totalCalories = meals.reduce((sum, meal) => {
    const calories = meal.recipe?.caloriesKcal || meal.caloriesKcal || meal.calories || 400;
    return sum + calories;
  }, 0);
  
  const uniqueDays = new Set(meals.map(meal => meal.day || 1)).size;
  return Math.round(totalCalories / Math.max(uniqueDays, 1));
}

/**
 * Calculate number of days from meals
 */
function calculateDays(meals: any[]): number {
  if (!meals || meals.length === 0) return 7;
  
  const uniqueDays = new Set(meals.map(meal => meal.day || 1)).size;
  return Math.max(uniqueDays, 1);
}

/**
 * Calculate meals per day from meals
 */
function calculateMealsPerDay(meals: any[]): number {
  if (!meals || meals.length === 0) return 3;
  
  const mealsByDay: { [key: number]: number } = {};
  meals.forEach(meal => {
    const day = meal.day || 1;
    mealsByDay[day] = (mealsByDay[day] || 0) + 1;
  });
  
  return Math.max(...Object.values(mealsByDay), 3);
}

/**
 * Enrich meal plan data by fetching full recipe information
 */
async function enrichMealPlanWithRecipes(mealPlanData: any): Promise<any> {
  if (!mealPlanData.meals || !Array.isArray(mealPlanData.meals)) {
    return mealPlanData;
  }

  const enrichedMeals = await Promise.all(
    mealPlanData.meals.map(async (meal: any) => {
      // If meal already has complete recipe data, ensure all fields have defaults
      if (meal.recipe && meal.recipe.name && meal.recipe.ingredientsJson) {
        return {
          ...meal,
          recipe: {
            ...meal.recipe,
            dietaryTags: meal.recipe.dietaryTags || [],
            mealTypes: meal.recipe.mealTypes || [],
            ingredientsJson: meal.recipe.ingredientsJson || [],
            instructionsText: meal.recipe.instructionsText || '',
            description: meal.recipe.description || ''
          }
        };
      }

      // If we have a recipeId, fetch the full recipe
      if (meal.recipeId || meal.recipe?.id) {
        const recipeId = meal.recipeId || meal.recipe.id;
        try {
          const fullRecipe = await storage.getRecipe(recipeId);
          if (fullRecipe) {
            return {
              ...meal,
              recipe: {
                ...fullRecipe,
                dietaryTags: fullRecipe.dietaryTags || [],
                mealTypes: fullRecipe.mealTypes || [],
                ingredientsJson: fullRecipe.ingredientsJson || [],
                instructionsText: fullRecipe.instructionsText || '',
                description: fullRecipe.description || ''
              }
            };
          }
        } catch (error) {
          console.warn(`Failed to fetch recipe ${recipeId}:`, error);
        }
      }

      // Return meal with default recipe fields if we can't enrich it
      if (meal.recipe) {
        return {
          ...meal,
          recipe: {
            ...meal.recipe,
            dietaryTags: meal.recipe.dietaryTags || [],
            mealTypes: meal.recipe.mealTypes || [],
            ingredientsJson: meal.recipe.ingredientsJson || [],
            instructionsText: meal.recipe.instructionsText || '',
            description: meal.recipe.description || ''
          }
        };
      }
      return meal;
    })
  );

  return {
    ...mealPlanData,
    meals: enrichedMeals
  };
}

/**
 * Validate and sanitize meal plan data for PDF generation
 */
export async function validateMealPlanData(data: any): Promise<MealPlanPdfData> {
  try {
    // Transform the data to the expected format
    const transformedData = transformMealPlanData(data);
    
    // Enrich with full recipe data if needed
    const enrichedData = await enrichMealPlanWithRecipes(transformedData);
    
    // Provide defaults for required fields
    const dataWithDefaults = {
      id: enrichedData.id || 'generated-plan',
      planName: enrichedData.planName || enrichedData.name || 'Meal Plan',
      fitnessGoal: enrichedData.fitnessGoal || 'General Fitness',
      description: enrichedData.description || '',
      dailyCalorieTarget: enrichedData.dailyCalorieTarget || 2000,
      days: enrichedData.days || 7,
      mealsPerDay: enrichedData.mealsPerDay || 3,
      meals: enrichedData.meals || [],
      ...enrichedData
    };

    // Try to use the shared schema first, fallback to our internal schema
    let validated;
    try {
      validated = sharedMealPlanSchema.parse(dataWithDefaults);
    } catch (sharedError) {
      // If shared schema fails, try our internal schema
      validated = mealPlanSchema.parse(dataWithDefaults);
    }
    
    // Convert to our internal PDF format
    const pdfData: MealPlanPdfData = {
      id: validated.id || 'generated-plan',
      planName: validated.planName,
      fitnessGoal: validated.fitnessGoal,
      description: validated.description || 'No description provided',
      dailyCalorieTarget: validated.dailyCalorieTarget,
      days: validated.days,
      mealsPerDay: validated.mealsPerDay,
      meals: validated.meals.map((meal: any) => ({
        day: meal.day,
        mealNumber: meal.mealNumber,
        mealType: meal.mealType,
        recipe: {
          id: meal.recipe.id,
          name: meal.recipe.name,
          description: meal.recipe.description || '',
          caloriesKcal: meal.recipe.caloriesKcal,
          proteinGrams: meal.recipe.proteinGrams,
          carbsGrams: meal.recipe.carbsGrams,
          fatGrams: meal.recipe.fatGrams,
          prepTimeMinutes: meal.recipe.prepTimeMinutes,
          servings: meal.recipe.servings,
          mealTypes: meal.recipe.mealTypes || [],
          dietaryTags: meal.recipe.dietaryTags || [],
          ingredientsJson: meal.recipe.ingredientsJson || [],
          instructionsText: meal.recipe.instructionsText || ''
        }
      }))
    };
    
    // Additional validation logic
    validateMealPlanLogic(pdfData);
    
    return pdfData;
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