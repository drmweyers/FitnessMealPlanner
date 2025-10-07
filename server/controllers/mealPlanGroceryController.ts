/**
 * Meal Plan Grocery List Controller
 *
 * Manages the automatic generation and maintenance of grocery lists
 * tied to meal plans. Each meal plan has exactly one grocery list.
 */

import { Request, Response } from 'express';
import { db } from '../db';
import {
  groceryLists,
  groceryListItems,
  personalizedMealPlans,
  users
} from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { aggregateIngredients } from '../utils/ingredientAggregator';

/**
 * Get grocery list for a specific meal plan
 */
export const getGroceryListByMealPlan = async (req: Request, res: Response) => {
  try {
    const { mealPlanId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Verify the meal plan belongs to the customer
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

    // Get the grocery list for this meal plan
    const groceryList = await db
      .select({
        id: groceryLists.id,
        name: groceryLists.name,
        mealPlanId: groceryLists.mealPlanId,
        customerId: groceryLists.customerId,
        isActive: groceryLists.isActive,
        createdAt: groceryLists.createdAt,
        updatedAt: groceryLists.updatedAt,
      })
      .from(groceryLists)
      .where(eq(groceryLists.mealPlanId, mealPlanId))
      .limit(1);

    if (groceryList.length === 0) {
      // Auto-create grocery list if it doesn't exist (shouldn't happen with trigger)
      const newList = await createGroceryListForMealPlan(mealPlanId, userId, mealPlan[0]);
      return res.json({
        groceryList: newList,
        items: []
      });
    }

    // Get all items for this grocery list
    const items = await db
      .select()
      .from(groceryListItems)
      .where(eq(groceryListItems.groceryListId, groceryList[0].id))
      .orderBy(groceryListItems.category, groceryListItems.name);

    res.json({
      groceryList: groceryList[0],
      items
    });
  } catch (error) {
    console.error('Error fetching grocery list by meal plan:', error);
    res.status(500).json({ error: 'Failed to fetch grocery list' });
  }
};

/**
 * Get all grocery lists for customer (tied to their meal plans)
 */
export const getCustomerGroceryLists = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get all meal plans and their grocery lists
    const listsWithMealPlans = await db
      .select({
        id: groceryLists.id,
        name: groceryLists.name,
        mealPlanId: groceryLists.mealPlanId,
        customerId: groceryLists.customerId,
        isActive: groceryLists.isActive,
        createdAt: groceryLists.createdAt,
        updatedAt: groceryLists.updatedAt,
        mealPlanData: personalizedMealPlans.mealPlanData,
        assignedAt: personalizedMealPlans.assignedAt,
        itemCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM ${groceryListItems}
          WHERE ${groceryListItems.groceryListId} = ${groceryLists.id}
        )`,
        checkedCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM ${groceryListItems}
          WHERE ${groceryListItems.groceryListId} = ${groceryLists.id}
            AND ${groceryListItems.isChecked} = true
        )`,
      })
      .from(groceryLists)
      .innerJoin(
        personalizedMealPlans,
        eq(groceryLists.mealPlanId, personalizedMealPlans.id)
      )
      .where(eq(groceryLists.customerId, userId))
      .orderBy(personalizedMealPlans.assignedAt);

    // Extract meal plan names from the JSON data
    const listsWithNames = listsWithMealPlans.map(list => ({
      ...list,
      mealPlanName: (list.mealPlanData as any)?.planName || 'Unnamed Meal Plan',
      name: `${(list.mealPlanData as any)?.planName || 'Meal Plan'} - Grocery List`
    }));

    res.json({
      groceryLists: listsWithNames,
      total: listsWithNames.length
    });
  } catch (error) {
    console.error('Error fetching customer grocery lists:', error);
    res.status(500).json({ error: 'Failed to fetch grocery lists' });
  }
};

/**
 * Generate grocery list items from meal plan recipes
 */
export const generateGroceryItemsFromMealPlan = async (req: Request, res: Response) => {
  try {
    const { mealPlanId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get the meal plan and verify ownership
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

    // Get the grocery list for this meal plan
    const groceryList = await db
      .select()
      .from(groceryLists)
      .where(eq(groceryLists.mealPlanId, mealPlanId))
      .limit(1);

    if (groceryList.length === 0) {
      return res.status(404).json({ error: 'Grocery list not found for this meal plan' });
    }

    const groceryListId = groceryList[0].id;
    const mealPlanData = mealPlan[0].mealPlanData as any;

    // Clear existing items if requested
    if (req.body.clearExisting) {
      await db
        .delete(groceryListItems)
        .where(eq(groceryListItems.groceryListId, groceryListId));
    }

    // Extract all ingredients from the meal plan
    const allIngredients: any[] = [];

    if (mealPlanData?.weeks) {
      mealPlanData.weeks.forEach((week: any) => {
        week.days?.forEach((day: any) => {
          day.meals?.forEach((meal: any) => {
            if (meal.recipe?.ingredients) {
              meal.recipe.ingredients.forEach((ingredient: any) => {
                allIngredients.push({
                  name: ingredient.name || ingredient.item,
                  quantity: parseFloat(ingredient.quantity || ingredient.amount || '1'),
                  unit: ingredient.unit || 'unit',
                  category: ingredient.category || categorizeIngredient(ingredient.name || ingredient.item),
                  recipeId: meal.recipe.id,
                  recipeName: meal.recipe.name || meal.recipe.title
                });
              });
            }
          });
        });
      });
    }

    // Aggregate similar ingredients
    const aggregatedIngredients = aggregateIngredients(allIngredients);

    // Insert aggregated ingredients as grocery list items
    const insertedItems = await Promise.all(
      aggregatedIngredients.map(async (ingredient) => {
        const item = await db
          .insert(groceryListItems)
          .values({
            groceryListId,
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            category: ingredient.category as any,
            isChecked: false,
            priority: 'medium' as any,
            notes: ingredient.recipes ? `For: ${ingredient.recipes.join(', ')}` : undefined,
            recipeId: ingredient.recipeId,
            recipeName: ingredient.recipeName
          })
          .returning()
          .onConflictDoNothing();

        return item[0];
      })
    );

    // Update the grocery list's updated timestamp
    await db
      .update(groceryLists)
      .set({ updatedAt: new Date() })
      .where(eq(groceryLists.id, groceryListId));

    res.json({
      message: 'Grocery list items generated successfully',
      groceryListId,
      itemsAdded: insertedItems.filter(Boolean).length,
      items: insertedItems.filter(Boolean)
    });
  } catch (error) {
    console.error('Error generating grocery items:', error);
    res.status(500).json({ error: 'Failed to generate grocery items' });
  }
};

/**
 * Helper function to create a grocery list for a meal plan
 */
async function createGroceryListForMealPlan(
  mealPlanId: string,
  customerId: string,
  mealPlan: any
) {
  const mealPlanData = mealPlan.mealPlanData as any;
  const planName = mealPlanData?.planName || 'Meal Plan';

  const newList = await db
    .insert(groceryLists)
    .values({
      customerId,
      mealPlanId,
      name: `${planName} - Grocery List`,
      isActive: true
    })
    .returning();

  return newList[0];
}

/**
 * Helper function to categorize ingredients
 */
function categorizeIngredient(name: string): string {
  const lowerName = name.toLowerCase();

  if (lowerName.match(/chicken|beef|pork|fish|salmon|tuna|turkey|lamb|shrimp/)) {
    return 'meat';
  }
  if (lowerName.match(/milk|cheese|yogurt|butter|cream/)) {
    return 'dairy';
  }
  if (lowerName.match(/apple|banana|orange|berry|fruit|lemon|lime/)) {
    return 'produce';
  }
  if (lowerName.match(/carrot|potato|onion|garlic|tomato|lettuce|spinach|vegetable/)) {
    return 'produce';
  }
  if (lowerName.match(/bread|flour|pasta|rice|cereal|oats/)) {
    return 'bakery';
  }
  if (lowerName.match(/frozen|ice/)) {
    return 'frozen';
  }
  if (lowerName.match(/water|juice|soda|coffee|tea/)) {
    return 'beverages';
  }

  return 'pantry';
}

/**
 * Delete grocery list (only if meal plan is deleted - handled by CASCADE)
 */
export const deleteGroceryListByMealPlan = async (req: Request, res: Response) => {
  try {
    const { mealPlanId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Note: This is typically not called directly as the CASCADE delete handles it
    // But provided for completeness

    const result = await db
      .delete(groceryLists)
      .where(
        and(
          eq(groceryLists.mealPlanId, mealPlanId),
          eq(groceryLists.customerId, userId)
        )
      )
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: 'Grocery list not found' });
    }

    res.json({
      message: 'Grocery list deleted successfully',
      deletedList: result[0]
    });
  } catch (error) {
    console.error('Error deleting grocery list:', error);
    res.status(500).json({ error: 'Failed to delete grocery list' });
  }
};