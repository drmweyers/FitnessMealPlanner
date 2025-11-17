/**
 * Manual Meal Plan Service
 *
 * Enables trainers to create custom meal plans manually without using AI.
 * Uses pre-configured category-based images to eliminate OpenAI API costs.
 *
 * Features:
 * - Free-form text parsing
 * - Automatic category detection
 * - Random category image assignment
 * - Zero AI API costs
 * - Instant meal plan creation
 */

import { getRandomImageForCategory, getCategoryImagePoolHealth, type MealCategory } from '../config/categoryImages';

/**
 * Manual meal entry interface
 */
export interface ManualMealEntry {
  mealName: string;
  category: MealCategory;
  description?: string;
  ingredients?: Array<{
    ingredient: string;
    amount: string;
    unit: string;
  }>;
  instructions?: string;
  manualNutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

/**
 * Manual meal plan structure
 * Compatible with AI-generated meal plan display format
 */
export interface ManualMealPlan {
  planName: string;
  days: number;
  mealsPerDay: number;
  dailyCalorieTarget: number;
  fitnessGoal: string;
  meals: Array<ManualMealEntry & {
    id: string;
    imageUrl: string;
    servings: number;
    prepTime: number;
    cookTime: number;
    difficulty: 'easy' | 'medium' | 'hard';
    instructions: string;
    nutrition: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber: number;
    };
  }>;
  createdBy: string;
  creationMethod: 'manual';
  isManual: true;
  createdAt: string;
  assignedAt?: string;
}

/**
 * Image pool health statistics
 */
export interface ImagePoolHealth {
  healthy: boolean;
  totalImages: number;
  categories: Record<MealCategory, number>;
}

/**
 * Manual Meal Plan Service Class
 */
export class ManualMealPlanService {
  /**
   * Parse free-form meal entry text into structured meals
   *
   * Supports multiple formats:
   * 1. "Category: Meal Name" (explicit category)
   * 2. "Meal Name" (auto-detect category)
   * 3. Structured format with "Meal 1" headers and ingredient lists
   * 4. Multiline entries
   *
   * @param text - Free-form meal entry text
   * @returns Array of parsed manual meal entries
   */
  parseMealEntries(text: string): ManualMealEntry[] {
    if (!text || !text.trim()) {
      return [];
    }

    // Detect format type
    const format = this.detectFormat(text);

    if (format === 'structured') {
      return this.parseStructuredFormat(text);
    }

    // Simple format (existing logic)
    return this.parseSimpleFormat(text);
  }

  /**
   * Detect format type from text
   */
  private detectFormat(text: string): 'simple' | 'structured' {
    const hasMealHeaders = /Meal\s+\d+/i.test(text);
    const hasBulletPoints = /^[\-•]/m.test(text);
    const hasMeasurements = /\d+\s*(g|kg|ml|l|oz|lb|cup|tbsp|tsp|piece|pieces)/i.test(text);

    // If we have meal headers AND (bullet points OR measurements), it's structured
    if (hasMealHeaders && (hasBulletPoints || hasMeasurements)) {
      return 'structured';
    }

    return 'simple';
  }

  /**
   * Parse simple format (existing logic)
   */
  private parseSimpleFormat(text: string): ManualMealEntry[] {
    // Split by newlines and filter empty lines
    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    return lines.map(line => {
      // Try to match "Category: Meal Name" pattern
      const explicitCategoryMatch = line.match(/^(breakfast|lunch|dinner|snack):\s*(.+)$/i);

      if (explicitCategoryMatch) {
        return {
          category: explicitCategoryMatch[1].toLowerCase() as MealCategory,
          mealName: explicitCategoryMatch[2].trim()
        };
      }

      // Fallback: Auto-detect category from meal name
      const category = this.detectCategory(line);
      return {
        mealName: line,
        category
      };
    });
  }

  /**
   * Parse structured format with "Meal 1" headers and ingredient lists
   *
   * Example:
   * Meal 1
   * -175g of Jasmine Rice
   * -150g of Lean ground beef
   * -100g of cooked broccoli
   */
  private parseStructuredFormat(text: string): ManualMealEntry[] {
    const meals: ManualMealEntry[] = [];

    // Split by "Meal X" headers
    const mealBlocks = text.split(/Meal\s+\d+/i).filter(block => block.trim().length > 0);

    for (const block of mealBlocks) {
      const lines = block.split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('-') || line.startsWith('•'));

      if (lines.length === 0) continue;

      // Parse each ingredient line
      const ingredients = lines.map(line => this.parseIngredientLine(line));

      // Generate meal name from ingredients
      const mealName = this.generateMealName(ingredients);

      // Detect category from ingredients
      const category = this.detectCategoryFromIngredients(ingredients);

      meals.push({
        mealName,
        category,
        ingredients
      });
    }

    return meals;
  }

  /**
   * Parse a single ingredient line
   * Examples:
   * "-175g of Jasmine Rice" → {amount: "175", unit: "g", ingredient: "Jasmine Rice"}
   * "-4 eggs" → {amount: "4", unit: "unit", ingredient: "eggs"}
   * "-2 pieces of sourdough bread" → {amount: "2", unit: "pieces", ingredient: "sourdough bread"}
   */
  private parseIngredientLine(line: string): {ingredient: string; amount: string; unit: string} {
    // Remove bullet point
    line = line.replace(/^[\-•]\s*/, '');

    // Try to match measurement patterns
    // Pattern 1: "175g of Jasmine Rice" or "175g Jasmine Rice"
    const measurementMatch = line.match(/^(\d+(?:\.\d+)?)\s*(g|kg|ml|l|oz|lb|cup|tbsp|tsp)\s*(?:of\s+)?(.+)$/i);
    if (measurementMatch) {
      return {
        amount: measurementMatch[1],
        unit: measurementMatch[2].toLowerCase(),
        ingredient: measurementMatch[3].trim()
      };
    }

    // Pattern 2: "4 eggs" or "2 pieces of bread"
    const countMatch = line.match(/^(\d+(?:\.\d+)?)\s+(pieces?|slices?|cups?|tbsp|tsp)\s+(?:of\s+)?(.+)$/i);
    if (countMatch) {
      return {
        amount: countMatch[1],
        unit: countMatch[2].toLowerCase(),
        ingredient: countMatch[3].trim()
      };
    }

    // Pattern 3: "4 eggs" (number + item without unit)
    const simpleCountMatch = line.match(/^(\d+(?:\.\d+)?)\s+(.+)$/i);
    if (simpleCountMatch) {
      return {
        amount: simpleCountMatch[1],
        unit: 'unit',
        ingredient: simpleCountMatch[2].trim()
      };
    }

    // Fallback: plain ingredient without measurement
    return {
      amount: '1',
      unit: 'serving',
      ingredient: line
    };
  }

  /**
   * Generate descriptive meal name from ingredients
   */
  private generateMealName(ingredients: Array<{ingredient: string}>): string {
    if (ingredients.length === 0) return 'Custom Meal';

    // Take first 2-3 main ingredients
    const mainIngredients = ingredients.slice(0, 3).map(i => {
      // Capitalize first letter
      return i.ingredient.charAt(0).toUpperCase() + i.ingredient.slice(1);
    });

    if (mainIngredients.length === 1) {
      return mainIngredients[0];
    }

    if (mainIngredients.length === 2) {
      return `${mainIngredients[0]} and ${mainIngredients[1]}`;
    }

    // 3 ingredients: "A, B, and C"
    return `${mainIngredients[0]}, ${mainIngredients[1]}, and ${mainIngredients[2]}`;
  }

  /**
   * Detect category from ingredient types
   */
  private detectCategoryFromIngredients(
    ingredients: Array<{ingredient: string}>
  ): MealCategory {
    // Combine all ingredient names
    const allIngredients = ingredients.map(i => i.ingredient.toLowerCase()).join(' ');

    // Use existing detectCategory logic
    return this.detectCategory(allIngredients);
  }

  /**
   * Auto-detect meal category from meal name using keyword matching
   *
   * Uses fuzzy matching to identify meal categories based on common food keywords.
   * Defaults to 'snack' if category cannot be determined.
   *
   * @param mealName - The meal name to analyze
   * @returns Detected meal category
   */
  private detectCategory(mealName: string): MealCategory {
    const lowerName = mealName.toLowerCase();

    // Breakfast indicators
    const breakfastKeywords = [
      'breakfast', 'morning', 'am',
      'scrambled', 'fried egg', 'boiled egg', 'omelette', 'omelet',
      'oatmeal', 'cereal', 'granola',
      'pancake', 'waffle', 'french toast',
      'bagel', 'muffin', 'croissant',
      'bacon', 'sausage',
      'coffee', 'latte', 'cappuccino',
      'smoothie bowl', 'acai bowl',
      'avocado toast', 'toast'
    ];

    if (breakfastKeywords.some(keyword => lowerName.includes(keyword))) {
      return 'breakfast';
    }

    // Lunch indicators
    const lunchKeywords = [
      'lunch', 'noon', 'midday',
      'sandwich', 'wrap', 'sub', 'hoagie',
      'salad', 'caesar', 'cobb',
      'soup', 'bisque', 'chowder',
      'burger', 'cheeseburger',
      'taco', 'burrito', 'quesadilla',
      'pizza', 'slice',
      'bowl', 'poke', 'buddha',
      'pasta salad'
    ];

    if (lunchKeywords.some(keyword => lowerName.includes(keyword))) {
      return 'lunch';
    }

    // Dinner indicators
    const dinnerKeywords = [
      'dinner', 'supper', 'evening', 'pm',
      'steak', 'ribeye', 'sirloin', 'filet',
      'chicken breast', 'grilled chicken', 'roast chicken', 'fried chicken',
      'salmon', 'tuna', 'cod', 'halibut', 'trout',
      'pasta', 'spaghetti', 'fettuccine', 'penne', 'linguine',
      'rice', 'risotto', 'pilaf',
      'roast', 'baked', 'grilled',
      'casserole', 'lasagna',
      'curry', 'stir fry', 'stir-fry',
      'pot roast', 'meatloaf'
    ];

    if (dinnerKeywords.some(keyword => lowerName.includes(keyword))) {
      return 'dinner';
    }

    // Snack indicators
    const snackKeywords = [
      'snack', 'treat',
      'protein bar', 'energy bar', 'granola bar',
      'nuts', 'almonds', 'cashews', 'peanuts',
      'fruit', 'apple', 'banana', 'orange', 'berries',
      'yogurt', 'greek yogurt',
      'shake', 'protein shake', 'smoothie',
      'hummus', 'guacamole',
      'veggies', 'vegetables', 'celery', 'carrot',
      'trail mix', 'dried fruit',
      'rice cake', 'cracker', 'cheese',
      'chips'
    ];

    if (snackKeywords.some(keyword => lowerName.includes(keyword))) {
      return 'snack';
    }

    // Default to snack if unable to determine
    return 'snack';
  }

  /**
   * Create a complete manual meal plan with category images
   *
   * @param meals - Array of manual meal entries
   * @param trainerId - ID of the trainer creating the plan
   * @param planName - Name of the meal plan
   * @returns Complete manual meal plan with images
   */
  async createManualMealPlan(
    meals: ManualMealEntry[],
    trainerId: string,
    planName: string
  ): Promise<ManualMealPlan> {
    if (!meals || meals.length === 0) {
      throw new Error('Cannot create meal plan with zero meals');
    }

    if (!planName || !planName.trim()) {
      throw new Error('Meal plan name is required');
    }

    if (!trainerId || !trainerId.trim()) {
      throw new Error('Trainer ID is required');
    }

    // Assign random category images to each meal and structure for frontend
    const mealsWithImages = meals.map((meal, index) => ({
      // Required schema fields
      day: 1,
      mealNumber: index + 1,
      mealType: meal.category,

      // Manual meal marker (required for getValidMeals to work)
      manual: meal.mealName,

      // Optional nutrition data
      manualNutrition: meal.manualNutrition,

      // Required nutrition object for ManualMealPlan interface
      nutrition: {
        calories: meal.manualNutrition?.calories ?? 0,
        protein: meal.manualNutrition?.protein ?? 0,
        carbs: meal.manualNutrition?.carbs ?? 0,
        fat: meal.manualNutrition?.fat ?? 0,
        fiber: 0, // Default fiber value
      },

      // Legacy fields for compatibility
      ...meal,
      id: `manual-meal-${index}`,
      imageUrl: getRandomImageForCategory(meal.category),
      servings: 1,
      prepTime: 15,
      cookTime: 30,
      difficulty: 'medium' as const,
      instructions: meal.instructions || 'Prepare ingredients as listed.',
    }));

    const now = new Date().toISOString();

    return {
      planName: planName.trim(),
      days: 1,
      mealsPerDay: meals.length,
      dailyCalorieTarget: 0,
      fitnessGoal: 'general',
      meals: mealsWithImages,
      createdBy: trainerId,
      creationMethod: 'manual',
      isManual: true,
      createdAt: now,
      assignedAt: now  // ✅ FIX: Add assignedAt for meal card display
    };
  }

  /**
   * Validate category image pool health
   *
   * Checks that all category pools have sufficient images (>= 10 per category)
   *
   * @returns Image pool health statistics
   */
  async validateCategoryImagePool(): Promise<ImagePoolHealth> {
    const health = getCategoryImagePoolHealth();

    return {
      healthy: health.healthy,
      totalImages: health.total,
      categories: {
        breakfast: health.breakfast,
        lunch: health.lunch,
        dinner: health.dinner,
        snack: health.snack
      }
    };
  }

  /**
   * Get parser accuracy for a set of test meals
   * Useful for monitoring and quality assurance
   *
   * @param testMeals - Array of {mealName, expectedCategory} for testing
   * @returns Accuracy percentage (0-1)
   */
  getParserAccuracy(testMeals: Array<{ mealName: string; expectedCategory: MealCategory }>): number {
    if (!testMeals || testMeals.length === 0) {
      return 0;
    }

    const correctCount = testMeals.filter(test => {
      const detected = this.detectCategory(test.mealName);
      return detected === test.expectedCategory;
    }).length;

    return correctCount / testMeals.length;
  }
}

/**
 * Singleton instance for easy importing
 */
export const manualMealPlanService = new ManualMealPlanService();
