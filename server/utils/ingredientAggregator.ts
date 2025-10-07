/**
 * Ingredient Aggregation Utility
 *
 * Provides sophisticated ingredient matching and aggregation for grocery list
 * generation. Handles ingredient name variations, smart quantity combining,
 * and category organization.
 *
 * Features:
 * - Fuzzy ingredient name matching
 * - Plural/singular normalization
 * - Brand and descriptor handling
 * - Smart quantity aggregation with unit conversion
 * - Category assignment with fallback logic
 * - Ingredient deduplication
 *
 * @author FitnessMealPlanner Team
 * @since 1.0.0
 */

import {
  parseQuantityAndUnit,
  aggregateQuantities,
  formatQuantity,
  areUnitsCompatible,
  type ParsedQuantity,
  UnitCategory
} from './unitConverter';

/**
 * Normalized ingredient for aggregation
 */
export interface AggregatedIngredient {
  originalNames: string[]; // All original names found
  normalizedName: string; // Standardized name for display
  category: string;
  parsedQuantity: ParsedQuantity;
  formattedQuantity: string;
  recipeNames: string[];
  priority: 'high' | 'medium' | 'low';
  notes?: string;
}

/**
 * Input ingredient from recipe
 */
export interface RecipeIngredient {
  name: string;
  amount: string;
  unit?: string;
  recipeName: string;
}

/**
 * Enhanced ingredient categories with better coverage
 */
const INGREDIENT_CATEGORIES: Record<string, string> = {
  // Produce
  'onion': 'produce', 'onions': 'produce',
  'garlic': 'produce', 'clove': 'produce', 'cloves': 'produce',
  'tomato': 'produce', 'tomatoes': 'produce',
  'bell pepper': 'produce', 'peppers': 'produce',
  'broccoli': 'produce', 'spinach': 'produce', 'lettuce': 'produce',
  'carrot': 'produce', 'carrots': 'produce',
  'celery': 'produce', 'potato': 'produce', 'potatoes': 'produce',
  'sweet potato': 'produce', 'sweet potatoes': 'produce',
  'avocado': 'produce', 'avocados': 'produce',
  'lime': 'produce', 'limes': 'produce',
  'lemon': 'produce', 'lemons': 'produce',
  'apple': 'produce', 'apples': 'produce',
  'banana': 'produce', 'bananas': 'produce',
  'mushroom': 'produce', 'mushrooms': 'produce',
  'cilantro': 'produce', 'parsley': 'produce', 'basil': 'produce',
  'ginger': 'produce', 'cucumber': 'produce', 'cucumbers': 'produce',
  'zucchini': 'produce', 'squash': 'produce',
  'corn': 'produce', 'cabbage': 'produce',
  'cauliflower': 'produce', 'asparagus': 'produce',
  'green beans': 'produce', 'beans': 'produce',

  // Meat & Seafood
  'chicken': 'meat', 'chicken breast': 'meat', 'chicken thigh': 'meat',
  'beef': 'meat', 'ground beef': 'meat', 'steak': 'meat',
  'pork': 'meat', 'pork chop': 'meat', 'pork tenderloin': 'meat',
  'turkey': 'meat', 'ground turkey': 'meat',
  'salmon': 'meat', 'tuna': 'meat', 'shrimp': 'meat',
  'bacon': 'meat', 'sausage': 'meat', 'ham': 'meat',
  'fish': 'meat', 'cod': 'meat', 'tilapia': 'meat',
  'lamb': 'meat', 'veal': 'meat',

  // Dairy & Eggs
  'milk': 'dairy', 'whole milk': 'dairy', 'skim milk': 'dairy',
  'cheese': 'dairy', 'cheddar': 'dairy', 'mozzarella': 'dairy',
  'parmesan': 'dairy', 'swiss': 'dairy',
  'yogurt': 'dairy', 'greek yogurt': 'dairy', 'plain yogurt': 'dairy',
  'butter': 'dairy', 'unsalted butter': 'dairy', 'salted butter': 'dairy',
  'cream': 'dairy', 'heavy cream': 'dairy', 'sour cream': 'dairy',
  'cream cheese': 'dairy', 'cottage cheese': 'dairy',
  'egg': 'dairy', 'eggs': 'dairy', 'egg whites': 'dairy',

  // Pantry Staples
  'rice': 'pantry', 'brown rice': 'pantry', 'white rice': 'pantry',
  'pasta': 'pantry', 'spaghetti': 'pantry', 'penne': 'pantry',
  'flour': 'pantry', 'all-purpose flour': 'pantry', 'wheat flour': 'pantry',
  'sugar': 'pantry', 'brown sugar': 'pantry', 'white sugar': 'pantry',
  'salt': 'pantry', 'pepper': 'pantry', 'black pepper': 'pantry',
  'olive oil': 'pantry', 'vegetable oil': 'pantry', 'coconut oil': 'pantry',
  'vinegar': 'pantry', 'balsamic vinegar': 'pantry', 'apple cider vinegar': 'pantry',
  'soy sauce': 'pantry', 'honey': 'pantry', 'vanilla': 'pantry',
  'baking powder': 'pantry', 'baking soda': 'pantry',
  'breadcrumbs': 'pantry', 'panko': 'pantry',
  'quinoa': 'pantry', 'oats': 'pantry', 'rolled oats': 'pantry',
  'bread': 'pantry', 'whole wheat bread': 'pantry',
  'tortilla': 'pantry', 'tortillas': 'pantry',
  'canned tomatoes': 'pantry', 'tomato sauce': 'pantry',
  'pasta sauce': 'pantry', 'marinara': 'pantry',

  // Spices & Herbs
  'oregano': 'spices', 'thyme': 'spices', 'rosemary': 'spices',
  'cumin': 'spices', 'paprika': 'spices', 'chili powder': 'spices',
  'garlic powder': 'spices', 'onion powder': 'spices',
  'italian seasoning': 'spices', 'bay leaves': 'spices',
  'cinnamon': 'spices', 'nutmeg': 'spices',

  // Beverages
  'water': 'beverages', 'juice': 'beverages', 'orange juice': 'beverages',
  'coffee': 'beverages', 'tea': 'beverages',
  'almond milk': 'beverages', 'coconut milk': 'beverages',
  'soy milk': 'beverages', 'oat milk': 'beverages',

  // Frozen
  'frozen vegetables': 'frozen', 'frozen fruit': 'frozen',
  'frozen berries': 'frozen', 'ice cream': 'frozen',

  // Snacks
  'nuts': 'snacks', 'almonds': 'snacks', 'walnuts': 'snacks',
  'peanuts': 'snacks', 'cashews': 'snacks',
  'chips': 'snacks', 'crackers': 'snacks',
  'granola': 'snacks', 'trail mix': 'snacks',
};

/**
 * Common ingredient name variations for normalization
 */
const INGREDIENT_VARIATIONS: Record<string, string> = {
  // Pluralization normalization
  'tomatoes': 'tomato',
  'onions': 'onion',
  'carrots': 'carrot',
  'peppers': 'pepper',
  'potatoes': 'potato',
  'eggs': 'egg',
  'cloves': 'clove',

  // Common brand/type variations
  'chicken breast': 'chicken breast',
  'chicken breasts': 'chicken breast',
  'ground beef': 'ground beef',
  'lean ground beef': 'ground beef',
  'extra lean ground beef': 'ground beef',

  // Size/type descriptors that should be normalized
  'large egg': 'egg',
  'large eggs': 'egg',
  'medium onion': 'onion',
  'large onion': 'onion',
  'small onion': 'onion',

  // Oil variations
  'extra virgin olive oil': 'olive oil',
  'evoo': 'olive oil',

  // Milk variations
  '2% milk': 'milk',
  'whole milk': 'milk',
  'skim milk': 'milk',
  '1% milk': 'milk',
};

/**
 * Words to ignore when matching ingredient names
 */
const IGNORE_WORDS = new Set([
  'fresh', 'dried', 'frozen', 'canned', 'organic', 'free-range',
  'large', 'medium', 'small', 'extra', 'lean', 'fat-free',
  'low-fat', 'unsalted', 'salted', 'raw', 'cooked',
  'chopped', 'diced', 'sliced', 'minced', 'crushed',
  'ground', 'grated', 'shredded', 'whole', 'half',
  'boneless', 'skinless', 'trimmed'
]);

/**
 * Normalize ingredient name for better matching
 */
function normalizeIngredientName(name: string): string {
  let normalized = name.toLowerCase().trim();

  // Check for direct variations first
  if (INGREDIENT_VARIATIONS[normalized]) {
    return INGREDIENT_VARIATIONS[normalized];
  }

  // Remove parenthetical information
  normalized = normalized.replace(/\([^)]*\)/g, '').trim();

  // Remove common descriptors
  const words = normalized.split(/\s+/);
  const filteredWords = words.filter(word => !IGNORE_WORDS.has(word));
  normalized = filteredWords.join(' ');

  // Handle common patterns
  normalized = normalized
    .replace(/\bs\b/g, '') // Remove standalone 's'
    .replace(/\bof\b/g, '') // Remove 'of'
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  return normalized || name.toLowerCase(); // Fallback to original if empty
}

/**
 * Calculate similarity score between two ingredient names
 */
function calculateSimilarity(name1: string, name2: string): number {
  const norm1 = normalizeIngredientName(name1);
  const norm2 = normalizeIngredientName(name2);

  // Exact match
  if (norm1 === norm2) return 1.0;

  // Check if one contains the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return 0.9;
  }

  // Word overlap score
  const words1 = new Set(norm1.split(/\s+/));
  const words2 = new Set(norm2.split(/\s+/));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  if (union.size === 0) return 0;

  return intersection.size / union.size;
}

/**
 * Categorize ingredient based on name with enhanced logic
 */
function categorizeIngredient(ingredientName: string): string {
  const normalized = normalizeIngredientName(ingredientName);

  // Check exact matches first
  if (INGREDIENT_CATEGORIES[normalized]) {
    return INGREDIENT_CATEGORIES[normalized];
  }

  // Check for partial matches with high confidence
  for (const [key, category] of Object.entries(INGREDIENT_CATEGORIES)) {
    if (calculateSimilarity(normalized, key) >= 0.8) {
      return category;
    }
  }

  // Fallback categorization by keywords
  if (normalized.includes('oil') || normalized.includes('vinegar')) return 'pantry';
  if (normalized.includes('cheese') || normalized.includes('milk')) return 'dairy';
  if (normalized.includes('chicken') || normalized.includes('beef') ||
      normalized.includes('fish') || normalized.includes('meat')) return 'meat';
  if (normalized.includes('spice') || normalized.includes('seasoning')) return 'spices';
  if (normalized.includes('frozen')) return 'frozen';
  if (normalized.includes('juice') || normalized.includes('drink')) return 'beverages';

  // Default to produce
  return 'produce';
}

/**
 * Determine priority based on ingredient type and category
 */
function determinePriority(category: string, quantity: ParsedQuantity): 'high' | 'medium' | 'low' {
  // High priority for perishables and essentials
  if (category === 'meat' || category === 'dairy') return 'high';
  if (category === 'produce' && quantity.category === UnitCategory.COUNT && quantity.quantity <= 2) {
    return 'high'; // Small quantities of fresh produce
  }

  // Low priority for spices and small amounts
  if (category === 'spices' || category === 'pantry') return 'low';

  return 'medium';
}

/**
 * Aggregate ingredients from multiple recipes into a consolidated grocery list
 */
export function aggregateIngredients(ingredients: RecipeIngredient[]): AggregatedIngredient[] {
  const aggregationMap = new Map<string, AggregatedIngredient>();

  for (const ingredient of ingredients) {
    const parsedQty = parseQuantityAndUnit(ingredient.amount, ingredient.unit);
    const normalizedName = normalizeIngredientName(ingredient.name);
    const category = categorizeIngredient(ingredient.name);

    // Find existing similar ingredient
    let existingKey: string | null = null;
    let bestSimilarity = 0;

    for (const [key, existing] of aggregationMap.entries()) {
      const similarity = calculateSimilarity(normalizedName, existing.normalizedName);
      if (similarity >= 0.8 && similarity > bestSimilarity) {
        // Check if units are compatible for aggregation
        if (areUnitsCompatible(parsedQty.unit, existing.parsedQuantity.unit)) {
          existingKey = key;
          bestSimilarity = similarity;
        }
      }
    }

    if (existingKey && aggregationMap.has(existingKey)) {
      // Aggregate with existing ingredient
      const existing = aggregationMap.get(existingKey)!;
      const aggregatedQty = aggregateQuantities(existing.parsedQuantity, parsedQty);

      if (aggregatedQty) {
        existing.parsedQuantity = aggregatedQty;
        existing.formattedQuantity = formatQuantity(aggregatedQty);
        existing.originalNames.push(ingredient.name);
        existing.recipeNames.push(ingredient.recipeName);

        // Update priority if needed
        const newPriority = determinePriority(category, aggregatedQty);
        if (newPriority === 'high' || (newPriority === 'medium' && existing.priority === 'low')) {
          existing.priority = newPriority;
        }
      }
    } else {
      // Create new aggregated ingredient
      const key = `${normalizedName}-${parsedQty.unit}`;
      aggregationMap.set(key, {
        originalNames: [ingredient.name],
        normalizedName: ingredient.name, // Use original for display
        category,
        parsedQuantity: parsedQty,
        formattedQuantity: formatQuantity(parsedQty),
        recipeNames: [ingredient.recipeName],
        priority: determinePriority(category, parsedQty)
      });
    }
  }

  // Convert to array and sort by category and priority
  const result = Array.from(aggregationMap.values());

  // Add notes for ingredients used in multiple recipes
  result.forEach(ingredient => {
    const uniqueRecipes = [...new Set(ingredient.recipeNames)];
    if (uniqueRecipes.length > 1) {
      ingredient.notes = `Used in: ${uniqueRecipes.slice(0, 3).join(', ')}${
        uniqueRecipes.length > 3 ? ` and ${uniqueRecipes.length - 3} more` : ''
      }`;
    }
  });

  // Sort by category, then priority, then name
  const categoryOrder = ['meat', 'dairy', 'produce', 'frozen', 'pantry', 'spices', 'beverages', 'snacks'];
  const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };

  result.sort((a, b) => {
    const categoryComparison = categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
    if (categoryComparison !== 0) return categoryComparison;

    const priorityComparison = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityComparison !== 0) return priorityComparison;

    return a.normalizedName.localeCompare(b.normalizedName);
  });

  return result;
}

/**
 * Extract ingredients from meal plan data structure
 */
export function extractIngredientsFromMealPlan(mealPlanData: any): RecipeIngredient[] {
  const ingredients: RecipeIngredient[] = [];

  if (mealPlanData && mealPlanData.days) {
    for (const day of mealPlanData.days) {
      if (day.meals) {
        for (const meal of day.meals) {
          if (meal.recipe && meal.recipe.ingredientsJson) {
            for (const ingredient of meal.recipe.ingredientsJson) {
              ingredients.push({
                name: ingredient.name,
                amount: ingredient.amount,
                unit: ingredient.unit,
                recipeName: meal.recipe.name || 'Unknown Recipe'
              });
            }
          }
        }
      }
    }
  }

  return ingredients;
}

/**
 * Generate grocery list items from aggregated ingredients
 */
export function generateGroceryListItems(
  aggregatedIngredients: AggregatedIngredient[],
  groceryListId: string
) {
  return aggregatedIngredients.map(ingredient => ({
    groceryListId,
    name: ingredient.normalizedName,
    category: ingredient.category,
    quantity: Math.ceil(ingredient.parsedQuantity.quantity), // Round up for shopping
    unit: ingredient.parsedQuantity.displayUnit,
    priority: ingredient.priority,
    notes: ingredient.notes,
    isChecked: false,
  }));
}