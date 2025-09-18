/**
 * Meal Plan Event Handlers
 *
 * Utility functions for handling meal plan lifecycle events.
 * Supports automatic grocery list generation when meal plans are created,
 * assigned, or updated.
 *
 * Features:
 * - Automatic grocery list generation
 * - Duplicate prevention
 * - Feature flag support
 * - Error handling and logging
 * - Event tracking and analytics
 *
 * @author FitnessMealPlanner Team
 * @since 1.0.0
 */

import { db } from '../db';
import {
  groceryLists,
  groceryListItems,
  personalizedMealPlans,
  type InsertGroceryList,
  type InsertGroceryListItem,
  type GroceryListWithItems
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import {
  extractIngredientsFromMealPlan,
  aggregateIngredients,
  generateGroceryListItems,
  type RecipeIngredient
} from './ingredientAggregator';
import { getFeatureConfig } from '../config/features';

/**
 * Event types for meal plan operations
 */
export enum MealPlanEventType {
  CREATED = 'created',
  ASSIGNED = 'assigned',
  UPDATED = 'updated',
  DELETED = 'deleted'
}

/**
 * Meal plan event data interface
 */
export interface MealPlanEvent {
  eventType: MealPlanEventType;
  mealPlanId: string;
  customerId: string;
  mealPlanData: any;
  metadata?: {
    assignedBy?: string;
    planName?: string;
    fitnessGoal?: string;
    previousListId?: string;
  };
}

/**
 * Grocery list generation result
 */
export interface GroceryListGenerationResult {
  success: boolean;
  groceryList?: GroceryListWithItems;
  action: 'created' | 'updated' | 'skipped' | 'error';
  reason?: string;
  error?: string;
  itemCount?: number;
  originalIngredientCount?: number;
}

/**
 * Generate grocery list name based on meal plan data
 */
function generateGroceryListName(mealPlanData: any, metadata?: any): string {
  const planName = metadata?.planName || mealPlanData?.planName || 'Meal Plan';
  const dateRange = generateDateRange(mealPlanData);
  return `Grocery List - ${planName}${dateRange ? ` - ${dateRange}` : ''}`;
}

/**
 * Generate date range string from meal plan data
 */
function generateDateRange(mealPlanData: any): string {
  if (!mealPlanData?.days || mealPlanData.days.length === 0) {
    return '';
  }

  const dayCount = mealPlanData.days.length;
  if (dayCount === 1) {
    return '1 Day';
  } else if (dayCount === 7) {
    return '1 Week';
  } else if (dayCount === 14) {
    return '2 Weeks';
  } else {
    return `${dayCount} Days`;
  }
}

/**
 * Check if grocery list already exists for meal plan
 */
async function findExistingGroceryList(mealPlanId: string, customerId: string): Promise<string | null> {
  try {
    const existingLists = await db
      .select({ id: groceryLists.id })
      .from(groceryLists)
      .where(
        and(
          eq(groceryLists.mealPlanId, mealPlanId),
          eq(groceryLists.customerId, customerId)
        )
      )
      .limit(1);

    return existingLists.length > 0 ? existingLists[0].id : null;
  } catch (error) {
    console.error('Error checking for existing grocery list:', error);
    return null;
  }
}

/**
 * Generate grocery list from meal plan data
 */
async function generateGroceryListFromMealPlan(
  mealPlanId: string,
  customerId: string,
  mealPlanData: any,
  metadata?: any
): Promise<GroceryListGenerationResult> {
  try {
    const config = getFeatureConfig();

    if (!config.AUTO_GENERATE_GROCERY_LISTS) {
      return {
        success: true,
        action: 'skipped',
        reason: 'Auto-generation is disabled'
      };
    }

    // Check if grocery list already exists
    const existingListId = await findExistingGroceryList(mealPlanId, customerId);

    if (existingListId && !config.UPDATE_EXISTING_LISTS) {
      return {
        success: true,
        action: 'skipped',
        reason: 'Grocery list already exists and updates are disabled'
      };
    }

    // Extract ingredients from meal plan
    const rawIngredients = extractIngredientsFromMealPlan(mealPlanData);

    if (rawIngredients.length === 0) {
      return {
        success: true,
        action: 'skipped',
        reason: 'No ingredients found in meal plan'
      };
    }

    // Generate grocery list name
    const listName = generateGroceryListName(mealPlanData, metadata);

    let groceryList: any;
    let action: 'created' | 'updated' = 'created';

    if (existingListId && config.UPDATE_EXISTING_LISTS) {
      // Update existing grocery list
      const [updatedList] = await db
        .update(groceryLists)
        .set({
          name: listName,
          updatedAt: new Date()
        })
        .where(eq(groceryLists.id, existingListId))
        .returning();

      groceryList = updatedList;
      action = 'updated';

      // Delete existing items to replace them
      await db
        .delete(groceryListItems)
        .where(eq(groceryListItems.groceryListId, existingListId));

    } else {
      // Create new grocery list
      const newList: InsertGroceryList = {
        customerId,
        mealPlanId,
        name: listName,
      };

      const [createdList] = await db
        .insert(groceryLists)
        .values(newList)
        .returning();

      groceryList = createdList;
    }

    // Generate grocery list items with smart aggregation
    const aggregatedIngredients = aggregateIngredients(rawIngredients);
    const groceryItems = generateGroceryListItems(aggregatedIngredients, groceryList.id);

    // Round up quantities as specified in requirements
    const finalItems = groceryItems.map(item => ({
      ...item,
      quantity: Math.ceil(item.quantity)
    }));

    // Insert grocery list items
    const createdItems = await db
      .insert(groceryListItems)
      .values(finalItems)
      .returning();

    const result: GroceryListWithItems = {
      ...groceryList,
      items: createdItems,
    };

    console.log(`[MealPlanEvents] ${action === 'created' ? 'Created' : 'Updated'} grocery list "${listName}" with ${createdItems.length} items from meal plan ${mealPlanId}`);

    return {
      success: true,
      groceryList: result,
      action,
      itemCount: createdItems.length,
      originalIngredientCount: rawIngredients.length
    };

  } catch (error) {
    console.error('[MealPlanEvents] Error generating grocery list from meal plan:', error);
    return {
      success: false,
      action: 'error',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Handle meal plan created event
 */
export async function onMealPlanCreated(event: MealPlanEvent): Promise<GroceryListGenerationResult> {
  console.log(`[MealPlanEvents] Handling meal plan created event for plan ${event.mealPlanId}`);

  return await generateGroceryListFromMealPlan(
    event.mealPlanId,
    event.customerId,
    event.mealPlanData,
    event.metadata
  );
}

/**
 * Handle meal plan assigned event
 */
export async function onMealPlanAssigned(event: MealPlanEvent): Promise<GroceryListGenerationResult> {
  console.log(`[MealPlanEvents] Handling meal plan assigned event for plan ${event.mealPlanId} to customer ${event.customerId}`);

  return await generateGroceryListFromMealPlan(
    event.mealPlanId,
    event.customerId,
    event.mealPlanData,
    {
      ...event.metadata,
      planName: event.metadata?.planName || 'Assigned Meal Plan'
    }
  );
}

/**
 * Handle meal plan updated event
 */
export async function onMealPlanUpdated(event: MealPlanEvent): Promise<GroceryListGenerationResult> {
  console.log(`[MealPlanEvents] Handling meal plan updated event for plan ${event.mealPlanId}`);

  const config = getFeatureConfig();

  if (!config.UPDATE_EXISTING_LISTS) {
    return {
      success: true,
      action: 'skipped',
      reason: 'Update existing lists is disabled'
    };
  }

  return await generateGroceryListFromMealPlan(
    event.mealPlanId,
    event.customerId,
    event.mealPlanData,
    event.metadata
  );
}

/**
 * Handle meal plan deleted event
 */
export async function onMealPlanDeleted(event: MealPlanEvent): Promise<GroceryListGenerationResult> {
  console.log(`[MealPlanEvents] Handling meal plan deleted event for plan ${event.mealPlanId}`);

  const config = getFeatureConfig();

  if (!config.DELETE_ORPHANED_LISTS) {
    return {
      success: true,
      action: 'skipped',
      reason: 'Delete orphaned lists is disabled'
    };
  }

  try {
    // Find and delete grocery lists associated with this meal plan
    const deletedLists = await db
      .delete(groceryLists)
      .where(
        and(
          eq(groceryLists.mealPlanId, event.mealPlanId),
          eq(groceryLists.customerId, event.customerId)
        )
      )
      .returning();

    console.log(`[MealPlanEvents] Deleted ${deletedLists.length} orphaned grocery lists for meal plan ${event.mealPlanId}`);

    return {
      success: true,
      action: deletedLists.length > 0 ? 'updated' : 'skipped',
      itemCount: deletedLists.length
    };

  } catch (error) {
    console.error('[MealPlanEvents] Error deleting orphaned grocery lists:', error);
    return {
      success: false,
      action: 'error',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Main event dispatcher
 */
export async function handleMealPlanEvent(event: MealPlanEvent): Promise<GroceryListGenerationResult> {
  try {
    switch (event.eventType) {
      case MealPlanEventType.CREATED:
        return await onMealPlanCreated(event);

      case MealPlanEventType.ASSIGNED:
        return await onMealPlanAssigned(event);

      case MealPlanEventType.UPDATED:
        return await onMealPlanUpdated(event);

      case MealPlanEventType.DELETED:
        return await onMealPlanDeleted(event);

      default:
        return {
          success: false,
          action: 'error',
          error: `Unknown event type: ${event.eventType}`
        };
    }
  } catch (error) {
    console.error('[MealPlanEvents] Error handling meal plan event:', error);
    return {
      success: false,
      action: 'error',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Utility function to create meal plan event
 */
export function createMealPlanEvent(
  eventType: MealPlanEventType,
  mealPlanId: string,
  customerId: string,
  mealPlanData: any,
  metadata?: any
): MealPlanEvent {
  return {
    eventType,
    mealPlanId,
    customerId,
    mealPlanData,
    metadata
  };
}

/**
 * Get grocery lists for meal plan (utility function)
 */
export async function getGroceryListsForMealPlan(mealPlanId: string, customerId: string): Promise<any[]> {
  try {
    const lists = await db
      .select()
      .from(groceryLists)
      .where(
        and(
          eq(groceryLists.mealPlanId, mealPlanId),
          eq(groceryLists.customerId, customerId)
        )
      );

    return lists;
  } catch (error) {
    console.error('Error fetching grocery lists for meal plan:', error);
    return [];
  }
}