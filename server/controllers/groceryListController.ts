/**
 * Grocery List Controller
 *
 * Handles all HTTP operations for grocery lists and grocery list items.
 * Provides CRUD operations with proper authentication and authorization.
 * Supports meal plan integration for automatic grocery list generation.
 *
 * Features:
 * - Customer-only access control
 * - Complete CRUD operations for lists and items
 * - Meal plan to grocery list conversion
 * - Ingredient extraction from recipes
 * - Category-based organization
 * - Item prioritization and checking
 *
 * @author FitnessMealPlanner Team
 * @since 1.0.0
 */

import { Request, Response } from 'express';
import { db } from '../db';
import {
  groceryLists,
  groceryListItems,
  recipes,
  personalizedMealPlans,
  type GroceryList,
  type GroceryListItem,
  type InsertGroceryList,
  type InsertGroceryListItem,
  type GroceryListWithItems,
  groceryListSchema,
  updateGroceryListSchema,
  groceryListItemSchema,
  updateGroceryListItemSchema,
  generateGroceryListFromMealPlanSchema,
  type GenerateGroceryListFromMealPlanInput
} from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  aggregateIngredients,
  extractIngredientsFromMealPlan,
  generateGroceryListItems,
  type RecipeIngredient
} from '../utils/ingredientAggregator';
import { parseQuantityAndUnit as parseQuantityAndUnitEnhanced, formatQuantity } from '../utils/unitConverter';

/**
 * Ingredient Categories Mapping
 * Maps common ingredients to grocery store categories
 */
const INGREDIENT_CATEGORIES: Record<string, string> = {
  // Produce
  'onion': 'produce',
  'garlic': 'produce',
  'tomato': 'produce',
  'bell pepper': 'produce',
  'broccoli': 'produce',
  'spinach': 'produce',
  'lettuce': 'produce',
  'carrot': 'produce',
  'celery': 'produce',
  'potato': 'produce',
  'sweet potato': 'produce',
  'avocado': 'produce',
  'lime': 'produce',
  'lemon': 'produce',
  'apple': 'produce',
  'banana': 'produce',
  'mushroom': 'produce',
  'cilantro': 'produce',
  'parsley': 'produce',
  'basil': 'produce',

  // Meat & Seafood
  'chicken': 'meat',
  'beef': 'meat',
  'pork': 'meat',
  'turkey': 'meat',
  'salmon': 'meat',
  'tuna': 'meat',
  'shrimp': 'meat',
  'ground beef': 'meat',
  'chicken breast': 'meat',
  'chicken thigh': 'meat',
  'pork chop': 'meat',
  'bacon': 'meat',
  'sausage': 'meat',

  // Dairy & Eggs
  'milk': 'dairy',
  'cheese': 'dairy',
  'yogurt': 'dairy',
  'butter': 'dairy',
  'cream': 'dairy',
  'sour cream': 'dairy',
  'egg': 'dairy',
  'eggs': 'dairy',
  'mozzarella': 'dairy',
  'cheddar': 'dairy',
  'parmesan': 'dairy',
  'cream cheese': 'dairy',
  'greek yogurt': 'dairy',

  // Pantry
  'rice': 'pantry',
  'pasta': 'pantry',
  'flour': 'pantry',
  'sugar': 'pantry',
  'salt': 'pantry',
  'pepper': 'pantry',
  'olive oil': 'pantry',
  'vegetable oil': 'pantry',
  'vinegar': 'pantry',
  'soy sauce': 'pantry',
  'honey': 'pantry',
  'vanilla': 'pantry',
  'baking powder': 'pantry',
  'baking soda': 'pantry',
  'breadcrumbs': 'pantry',
  'beans': 'pantry',
  'lentils': 'pantry',
  'quinoa': 'pantry',
  'oats': 'pantry',
  'bread': 'pantry',
  'tortilla': 'pantry',
  'coconut oil': 'pantry',
  'sesame oil': 'pantry',
  'spices': 'pantry',
  'herbs': 'pantry',

  // Beverages
  'water': 'beverages',
  'juice': 'beverages',
  'coffee': 'beverages',
  'tea': 'beverages',
  'soda': 'beverages',
  'wine': 'beverages',
  'beer': 'beverages',
  'almond milk': 'beverages',
  'coconut milk': 'beverages',
  'soy milk': 'beverages',

  // Snacks
  'nuts': 'snacks',
  'chips': 'snacks',
  'crackers': 'snacks',
  'granola': 'snacks',
  'trail mix': 'snacks',
  'dried fruit': 'snacks',
  'popcorn': 'snacks',
  'almonds': 'snacks',
  'walnuts': 'snacks',
  'peanuts': 'snacks',
};

/**
 * Categorize ingredient based on name
 */
function categorizeIngredient(ingredientName: string): string {
  const lower = ingredientName.toLowerCase();

  // Check for exact matches first
  if (INGREDIENT_CATEGORIES[lower]) {
    return INGREDIENT_CATEGORIES[lower];
  }

  // Check for partial matches
  for (const [key, category] of Object.entries(INGREDIENT_CATEGORIES)) {
    if (lower.includes(key) || key.includes(lower)) {
      return category;
    }
  }

  // Default to produce for unknown ingredients
  return 'produce';
}

/**
 * Parse quantity from ingredient amount string
 */
function parseQuantityAndUnit(amount: string, unit?: string): { quantity: number; unit: string } {
  // Clean the amount string
  const cleanAmount = amount.trim().toLowerCase();

  // Try to extract number from amount
  const numberMatch = cleanAmount.match(/(\d+(?:\.\d+)?)/);
  const quantity = numberMatch ? parseFloat(numberMatch[1]) : 1;

  // Determine unit
  let parsedUnit = unit || 'pcs';

  // Extract unit from amount if not provided
  if (!unit) {
    if (cleanAmount.includes('cup')) parsedUnit = 'cups';
    else if (cleanAmount.includes('tbsp') || cleanAmount.includes('tablespoon')) parsedUnit = 'tbsp';
    else if (cleanAmount.includes('tsp') || cleanAmount.includes('teaspoon')) parsedUnit = 'tsp';
    else if (cleanAmount.includes('lb') || cleanAmount.includes('pound')) parsedUnit = 'lbs';
    else if (cleanAmount.includes('oz') || cleanAmount.includes('ounce')) parsedUnit = 'oz';
    else if (cleanAmount.includes('clove')) parsedUnit = 'cloves';
    else if (cleanAmount.includes('bunch')) parsedUnit = 'bunches';
    else if (cleanAmount.includes('package') || cleanAmount.includes('pkg')) parsedUnit = 'packages';
    else if (cleanAmount.includes('can')) parsedUnit = 'cans';
    else if (cleanAmount.includes('bottle')) parsedUnit = 'bottles';
    else if (cleanAmount.includes('piece') || cleanAmount.includes('pc')) parsedUnit = 'pcs';
    else parsedUnit = 'pcs';
  }

  return { quantity, unit: parsedUnit };
}

/**
 * GET /api/grocery-lists
 * Get all grocery lists for the authenticated customer
 */
export const getGroceryLists = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (userRole !== 'customer') {
      return res.status(403).json({ error: 'Only customers can access grocery lists' });
    }

    // Get grocery lists (without meal plan join for now to debug)
    console.log('GROCERY DEBUG: About to execute query for user:', userId);
    console.log('GROCERY DEBUG: Database connection string:', process.env.DATABASE_URL || 'NO DATABASE_URL');

    // Test with a direct count query first
    const totalCount = await db.select({ count: sql`count(*)` }).from(groceryLists);
    console.log('GROCERY DEBUG: Total grocery lists in database:', totalCount[0]?.count);

    const customerGroceryLists = await db
      .select()
      .from(groceryLists)
      .where(eq(groceryLists.customerId, userId))
      .orderBy(desc(groceryLists.updatedAt));
    console.log('GROCERY DEBUG: Query returned', customerGroceryLists.length, 'results');

    // Get item counts for each list
    const listsWithCounts = await Promise.all(
      customerGroceryLists.map(async (list) => {
        const itemCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(groceryListItems)
          .where(eq(groceryListItems.groceryListId, list.id));

        const checkedCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(groceryListItems)
          .where(
            and(
              eq(groceryListItems.groceryListId, list.id),
              eq(groceryListItems.isChecked, true)
            )
          );

        // For now, just return the basic list info (no meal plan data)
        return {
          ...list,
          mealPlanName: null, // Will add meal plan lookup later
          itemCount: itemCount[0]?.count || 0,
          checkedCount: checkedCount[0]?.count || 0,
          isStandalone: !list.mealPlanId, // Flag to indicate if it's a standalone list
        };
      })
    );

    console.log(`Found ${listsWithCounts.length} grocery lists for customer ${userId}`);
    console.log('Raw grocery lists:', JSON.stringify(customerGroceryLists, null, 2));
    console.log('Lists with counts:', JSON.stringify(listsWithCounts, null, 2));

    res.json({
      groceryLists: listsWithCounts,
      total: listsWithCounts.length,
    });
  } catch (error) {
    console.error('Error fetching grocery lists:', error);
    res.status(500).json({ error: 'Failed to fetch grocery lists' });
  }
};

/**
 * GET /api/grocery-lists/:id
 * Get a specific grocery list with its items
 */
export const getGroceryList = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (userRole !== 'customer') {
      return res.status(403).json({ error: 'Only customers can access grocery lists' });
    }

    // Get grocery list
    const groceryList = await db
      .select({
        id: groceryLists.id,
        customerId: groceryLists.customerId,
        mealPlanId: groceryLists.mealPlanId,
        name: groceryLists.name,
        createdAt: groceryLists.createdAt,
        updatedAt: groceryLists.updatedAt,
      })
      .from(groceryLists)
      .where(
        and(
          eq(groceryLists.id, id),
          eq(groceryLists.customerId, userId)
        )
      )
      .limit(1);

    if (groceryList.length === 0) {
      return res.status(404).json({ error: 'Grocery list not found' });
    }

    // Get grocery list items
    const items = await db
      .select()
      .from(groceryListItems)
      .where(eq(groceryListItems.groceryListId, id))
      .orderBy(
        groceryListItems.isChecked,
        groceryListItems.category,
        groceryListItems.name
      );

    const listWithItems: GroceryListWithItems = {
      ...groceryList[0],
      items,
    };

    res.json(listWithItems);
  } catch (error) {
    console.error('Error fetching grocery list:', error);
    res.status(500).json({ error: 'Failed to fetch grocery list' });
  }
};

/**
 * POST /api/grocery-lists
 * Create a new grocery list
 */
export const createGroceryList = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (userRole !== 'customer') {
      return res.status(403).json({ error: 'Only customers can create grocery lists' });
    }

    // Validate request body
    const validation = groceryListSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid grocery list data',
        details: validation.error.errors
      });
    }

    const { name } = validation.data;

    const newList: InsertGroceryList = {
      customerId: userId,
      name,
    };

    const [createdList] = await db
      .insert(groceryLists)
      .values(newList)
      .returning();

    const listWithItems: GroceryListWithItems = {
      ...createdList,
      items: [],
    };

    res.status(201).json(listWithItems);
  } catch (error) {
    console.error('Error creating grocery list:', error);
    res.status(500).json({ error: 'Failed to create grocery list' });
  }
};

/**
 * PUT /api/grocery-lists/:id
 * Update a grocery list
 */
export const updateGroceryList = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (userRole !== 'customer') {
      return res.status(403).json({ error: 'Only customers can update grocery lists' });
    }

    // Validate request body
    const validation = updateGroceryListSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid grocery list data',
        details: validation.error.errors
      });
    }

    const [updatedList] = await db
      .update(groceryLists)
      .set(validation.data)
      .where(
        and(
          eq(groceryLists.id, id),
          eq(groceryLists.customerId, userId)
        )
      )
      .returning();

    if (!updatedList) {
      return res.status(404).json({ error: 'Grocery list not found' });
    }

    res.json(updatedList);
  } catch (error) {
    console.error('Error updating grocery list:', error);
    res.status(500).json({ error: 'Failed to update grocery list' });
  }
};

/**
 * DELETE /api/grocery-lists/:id
 * Delete a grocery list and all its items
 */
export const deleteGroceryList = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (userRole !== 'customer') {
      return res.status(403).json({ error: 'Only customers can delete grocery lists' });
    }

    const deletedList = await db
      .delete(groceryLists)
      .where(
        and(
          eq(groceryLists.id, id),
          eq(groceryLists.customerId, userId)
        )
      )
      .returning();

    if (deletedList.length === 0) {
      return res.status(404).json({ error: 'Grocery list not found' });
    }

    res.json({
      success: true,
      message: 'Grocery list deleted successfully',
      deletedListId: id
    });
  } catch (error) {
    console.error('Error deleting grocery list:', error);
    res.status(500).json({ error: 'Failed to delete grocery list' });
  }
};

/**
 * POST /api/grocery-lists/:id/items
 * Add an item to a grocery list
 */
export const addGroceryListItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (userRole !== 'customer') {
      return res.status(403).json({ error: 'Only customers can add grocery list items' });
    }

    // Verify grocery list exists and belongs to user
    const groceryList = await db
      .select()
      .from(groceryLists)
      .where(
        and(
          eq(groceryLists.id, id),
          eq(groceryLists.customerId, userId)
        )
      )
      .limit(1);

    if (groceryList.length === 0) {
      return res.status(404).json({ error: 'Grocery list not found' });
    }

    // Validate request body
    const validation = groceryListItemSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid grocery list item data',
        details: validation.error.errors
      });
    }

    const newItem: InsertGroceryListItem = {
      groceryListId: id,
      ...validation.data,
      // Convert estimatedPrice from number to string for database
      estimatedPrice: validation.data.estimatedPrice !== undefined
        ? validation.data.estimatedPrice.toFixed(2)
        : undefined,
    };

    const [createdItem] = await db
      .insert(groceryListItems)
      .values(newItem)
      .returning();

    res.status(201).json(createdItem);
  } catch (error) {
    console.error('Error adding grocery list item:', error);
    res.status(500).json({ error: 'Failed to add grocery list item' });
  }
};

/**
 * PUT /api/grocery-lists/:id/items/:itemId
 * Update a grocery list item
 */
export const updateGroceryListItem = async (req: Request, res: Response) => {
  try {
    const { id, itemId } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (userRole !== 'customer') {
      return res.status(403).json({ error: 'Only customers can update grocery list items' });
    }

    // Verify grocery list exists and belongs to user
    const groceryList = await db
      .select()
      .from(groceryLists)
      .where(
        and(
          eq(groceryLists.id, id),
          eq(groceryLists.customerId, userId)
        )
      )
      .limit(1);

    if (groceryList.length === 0) {
      return res.status(404).json({ error: 'Grocery list not found' });
    }

    // Validate request body
    const validation = updateGroceryListItemSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid grocery list item data',
        details: validation.error.errors
      });
    }

    // Convert estimatedPrice from number to string for database
    const updateData = {
      ...validation.data,
      estimatedPrice: validation.data.estimatedPrice !== undefined
        ? validation.data.estimatedPrice.toFixed(2)
        : undefined,
    };

    const [updatedItem] = await db
      .update(groceryListItems)
      .set(updateData)
      .where(
        and(
          eq(groceryListItems.id, itemId),
          eq(groceryListItems.groceryListId, id)
        )
      )
      .returning();

    if (!updatedItem) {
      return res.status(404).json({ error: 'Grocery list item not found' });
    }

    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating grocery list item:', error);
    res.status(500).json({ error: 'Failed to update grocery list item' });
  }
};

/**
 * DELETE /api/grocery-lists/:id/items/:itemId
 * Delete a grocery list item
 */
export const deleteGroceryListItem = async (req: Request, res: Response) => {
  try {
    const { id, itemId } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (userRole !== 'customer') {
      return res.status(403).json({ error: 'Only customers can delete grocery list items' });
    }

    // Verify grocery list exists and belongs to user
    const groceryList = await db
      .select()
      .from(groceryLists)
      .where(
        and(
          eq(groceryLists.id, id),
          eq(groceryLists.customerId, userId)
        )
      )
      .limit(1);

    if (groceryList.length === 0) {
      return res.status(404).json({ error: 'Grocery list not found' });
    }

    const deletedItem = await db
      .delete(groceryListItems)
      .where(
        and(
          eq(groceryListItems.id, itemId),
          eq(groceryListItems.groceryListId, id)
        )
      )
      .returning();

    if (deletedItem.length === 0) {
      return res.status(404).json({ error: 'Grocery list item not found' });
    }

    res.json({
      success: true,
      message: 'Grocery list item deleted successfully',
      deletedItemId: itemId
    });
  } catch (error) {
    console.error('Error deleting grocery list item:', error);
    res.status(500).json({ error: 'Failed to delete grocery list item' });
  }
};

/**
 * POST /api/grocery-lists/from-meal-plan
 * Generate a grocery list from a meal plan (legacy endpoint)
 */
export const generateGroceryListFromMealPlan = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (userRole !== 'customer') {
      return res.status(403).json({ error: 'Only customers can generate grocery lists' });
    }

    const { mealPlanId, listName = 'Meal Plan Grocery List' } = req.body;

    if (!mealPlanId) {
      return res.status(400).json({ error: 'Meal plan ID is required' });
    }

    // Get meal plan
    const mealPlan = await db
      .select()
      .from(personalizedMealPlans)
      .where(
        and(
          eq(personalizedMealPlans.id, mealPlanId),
          eq(personalizedMealPlans.customerId, userId)
        )
      )
      .limit(1);

    if (mealPlan.length === 0) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    // Create grocery list
    const newList: InsertGroceryList = {
      customerId: userId,
      mealPlanId,
      name: listName,
    };

    const [createdList] = await db
      .insert(groceryLists)
      .values(newList)
      .returning();

    // Extract ingredients from meal plan
    const mealPlanData = mealPlan[0].mealPlanData as any;
    const ingredientMap = new Map<string, {
      name: string;
      category: string;
      totalQuantity: number;
      unit: string;
      recipeNames: string[];
    }>();

    // Process each day and meal
    if (mealPlanData.days) {
      for (const day of mealPlanData.days) {
        if (day.meals) {
          for (const meal of day.meals) {
            if (meal.recipe && meal.recipe.ingredients) {
              for (const ingredient of meal.recipe.ingredients) {
                const { quantity, unit } = parseQuantityAndUnit(ingredient.amount, ingredient.unit);
                const category = categorizeIngredient(ingredient.name);
                const key = `${ingredient.name.toLowerCase()}-${unit}`;

                if (ingredientMap.has(key)) {
                  const existing = ingredientMap.get(key)!;
                  existing.totalQuantity += quantity;
                  existing.recipeNames.push(meal.recipe.name);
                } else {
                  ingredientMap.set(key, {
                    name: ingredient.name,
                    category,
                    totalQuantity: quantity,
                    unit,
                    recipeNames: [meal.recipe.name],
                  });
                }
              }
            }
          }
        }
      }
    }

    // Create grocery list items from aggregated ingredients
    const groceryItems: InsertGroceryListItem[] = Array.from(ingredientMap.values()).map(item => ({
      groceryListId: createdList.id,
      name: item.name,
      category: item.category,
      quantity: Math.ceil(item.totalQuantity), // Round up quantities
      unit: item.unit,
      priority: 'medium' as const,
      notes: `Used in: ${item.recipeNames.slice(0, 3).join(', ')}${item.recipeNames.length > 3 ? ` and ${item.recipeNames.length - 3} more` : ''}`,
      isChecked: false,
    }));

    // Insert all items
    const createdItems = await db
      .insert(groceryListItems)
      .values(groceryItems)
      .returning();

    const listWithItems: GroceryListWithItems = {
      ...createdList,
      items: createdItems,
    };

    res.status(201).json({
      groceryList: listWithItems,
      summary: {
        totalItems: createdItems.length,
        categoriesCount: new Set(createdItems.map(item => item.category)).size,
        sourceRecipes: Array.from(new Set(
          Array.from(ingredientMap.values()).flatMap(item => item.recipeNames)
        )).length,
      },
      message: 'Grocery list generated successfully from meal plan',
    });
  } catch (error) {
    console.error('Error generating grocery list from meal plan:', error);
    res.status(500).json({ error: 'Failed to generate grocery list from meal plan' });
  }
};

/**
 * POST /api/grocery-lists/generate-from-meal-plan
 * Enhanced grocery list generation from meal plan with advanced aggregation
 */
export const generateEnhancedGroceryListFromMealPlan = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (userRole !== 'customer') {
      return res.status(403).json({ error: 'Only customers can generate grocery lists' });
    }

    // Validate request body
    const validation = generateGroceryListFromMealPlanSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: validation.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }

    const {
      mealPlanId,
      listName,
      includeAllIngredients,
      aggregateQuantities,
      roundUpQuantities
    } = validation.data;

    // Get meal plan
    const mealPlan = await db
      .select()
      .from(personalizedMealPlans)
      .where(
        and(
          eq(personalizedMealPlans.id, mealPlanId),
          eq(personalizedMealPlans.customerId, userId)
        )
      )
      .limit(1);

    if (mealPlan.length === 0) {
      return res.status(404).json({ error: 'Meal plan not found or does not belong to user' });
    }

    const mealPlanData = mealPlan[0].mealPlanData as any;

    // Extract ingredients using enhanced utility
    const rawIngredients = extractIngredientsFromMealPlan(mealPlanData);

    if (rawIngredients.length === 0) {
      return res.status(400).json({
        error: 'No ingredients found in meal plan',
        details: 'The meal plan appears to be empty or malformed'
      });
    }

    // Create grocery list
    const newList: InsertGroceryList = {
      customerId: userId,
      mealPlanId,
      name: listName,
    };

    const [createdList] = await db
      .insert(groceryLists)
      .values(newList)
      .returning();

    let groceryItems: InsertGroceryListItem[];

    if (aggregateQuantities) {
      // Use enhanced aggregation
      const aggregatedIngredients = aggregateIngredients(rawIngredients);
      groceryItems = generateGroceryListItems(aggregatedIngredients, createdList.id);

      // Apply quantity rounding if requested
      if (roundUpQuantities) {
        groceryItems = groceryItems.map(item => ({
          ...item,
          quantity: Math.ceil(item.quantity ?? 1)
        }));
      }
    } else {
      // Simple conversion without aggregation
      groceryItems = rawIngredients.map(ingredient => {
        const parsedQty = parseQuantityAndUnitEnhanced(ingredient.amount, ingredient.unit);
        const category = categorizeIngredient(ingredient.name);

        return {
          groceryListId: createdList.id,
          name: ingredient.name,
          category,
          quantity: roundUpQuantities ? Math.ceil(parsedQty.quantity) : Math.round(parsedQty.quantity * 100) / 100,
          unit: parsedQty.displayUnit,
          priority: 'medium' as const,
          notes: `From recipe: ${ingredient.recipeName}`,
          isChecked: false,
        };
      });
    }

    // Insert all items
    const createdItems = await db
      .insert(groceryListItems)
      .values(groceryItems)
      .returning();

    // Calculate summary statistics
    const categories = new Set(createdItems.map(item => item.category));
    const recipes = new Set(rawIngredients.map(ingredient => ingredient.recipeName));
    const totalOriginalIngredients = rawIngredients.length;
    const aggregationRatio = aggregateQuantities ?
      Math.round((1 - (createdItems.length / totalOriginalIngredients)) * 100) : 0;

    const listWithItems: GroceryListWithItems = {
      ...createdList,
      items: createdItems,
    };

    res.status(201).json({
      success: true,
      groceryList: listWithItems,
      summary: {
        totalItems: createdItems.length,
        originalIngredientCount: totalOriginalIngredients,
        aggregationRatio: `${aggregationRatio}%`,
        categoriesCount: categories.size,
        categories: Array.from(categories).sort(),
        sourceRecipes: recipes.size,
        recipes: Array.from(recipes).sort(),
        processingOptions: {
          aggregated: aggregateQuantities,
          roundedUp: roundUpQuantities,
          includeAll: includeAllIngredients
        }
      },
      message: `Grocery list generated successfully with ${aggregateQuantities ? 'smart aggregation' : 'individual items'}`,
    });
  } catch (error) {
    console.error('Error generating enhanced grocery list from meal plan:', error);
    res.status(500).json({
      error: 'Failed to generate grocery list from meal plan',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
};