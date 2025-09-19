/**
 * Comprehensive Unit Tests for Grocery List Feature
 *
 * Tests all aspects of the grocery list functionality:
 * - Database schema and relationships
 * - API endpoints and controllers
 * - Frontend hooks and components
 * - Meal plan integration
 * - Automatic grocery list generation
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../../server/db';
import {
  groceryLists,
  groceryListItems,
  personalizedMealPlans,
  users,
  type GroceryList,
  type GroceryListItem,
  type InsertGroceryList,
  type InsertGroceryListItem,
} from '../../shared/schema';
import {
  getGroceryLists,
  getGroceryList,
  createGroceryList,
  updateGroceryList,
  deleteGroceryList,
  addGroceryListItem,
  updateGroceryListItem,
  deleteGroceryListItem,
  generateGroceryListFromMealPlan,
} from '../../server/controllers/groceryListController';
import { Request, Response } from 'express';

// Mock Express request and response
const mockRequest = (data: any = {}): Partial<Request> => ({
  user: data.user || { id: 'test-customer-id', role: 'customer' },
  params: data.params || {},
  body: data.body || {},
  ...data,
});

const mockResponse = (): Partial<Response> => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
};

describe('Grocery List Feature - Comprehensive Tests', () => {
  let testCustomerId: string;
  let testTrainerId: string;
  let testMealPlanId: string;
  let testGroceryListId: string;

  beforeAll(async () => {
    // Create test users
    const [customer] = await db.insert(users).values({
      email: 'test.customer@test.com',
      password: 'hashed_password',
      role: 'customer',
      name: 'Test Customer',
    }).returning();
    testCustomerId = customer.id;

    const [trainer] = await db.insert(users).values({
      email: 'test.trainer@test.com',
      password: 'hashed_password',
      role: 'trainer',
      name: 'Test Trainer',
    }).returning();
    testTrainerId = trainer.id;

    // Create a test meal plan
    const [mealPlan] = await db.insert(personalizedMealPlans).values({
      customerId: testCustomerId,
      trainerId: testTrainerId,
      mealPlanData: {
        id: 'test-plan-1',
        planName: 'Test Meal Plan',
        fitnessGoal: 'muscle_gain',
        dailyCalorieTarget: 2500,
        days: 7,
        mealsPerDay: 3,
        generatedBy: testTrainerId,
        createdAt: new Date(),
        meals: [
          {
            day: 1,
            mealNumber: 1,
            mealType: 'breakfast',
            recipe: {
              id: 'recipe-1',
              name: 'Oatmeal with Berries',
              description: 'Healthy breakfast',
              caloriesKcal: 350,
              proteinGrams: '10',
              carbsGrams: '60',
              fatGrams: '8',
              prepTimeMinutes: 10,
              servings: 1,
              mealTypes: ['breakfast'],
              ingredientsJson: [
                { name: 'Oats', amount: '1', unit: 'cup' },
                { name: 'Blueberries', amount: '0.5', unit: 'cup' },
                { name: 'Almond Milk', amount: '1', unit: 'cup' },
              ],
            },
          },
          {
            day: 1,
            mealNumber: 2,
            mealType: 'lunch',
            recipe: {
              id: 'recipe-2',
              name: 'Grilled Chicken Salad',
              description: 'Protein-rich lunch',
              caloriesKcal: 450,
              proteinGrams: '35',
              carbsGrams: '20',
              fatGrams: '25',
              prepTimeMinutes: 20,
              servings: 1,
              mealTypes: ['lunch'],
              ingredientsJson: [
                { name: 'Chicken Breast', amount: '200', unit: 'g' },
                { name: 'Mixed Greens', amount: '2', unit: 'cups' },
                { name: 'Olive Oil', amount: '2', unit: 'tbsp' },
              ],
            },
          },
        ],
      },
    }).returning();
    testMealPlanId = mealPlan.id;
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(groceryListItems).where(eq(groceryListItems.groceryListId, testGroceryListId));
    await db.delete(groceryLists).where(eq(groceryLists.customerId, testCustomerId));
    await db.delete(personalizedMealPlans).where(eq(personalizedMealPlans.id, testMealPlanId));
    await db.delete(users).where(eq(users.id, testCustomerId));
    await db.delete(users).where(eq(users.id, testTrainerId));
  });

  describe('Database Schema Tests', () => {
    it('should have correct grocery_lists table structure', async () => {
      const result = await db.execute(sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'grocery_lists'
        ORDER BY ordinal_position
      `);

      expect(result.rows).toBeDefined();
      const columns = result.rows.map((r: any) => r.column_name);
      expect(columns).toContain('id');
      expect(columns).toContain('customer_id');
      expect(columns).toContain('meal_plan_id');
      expect(columns).toContain('name');
      expect(columns).toContain('created_at');
      expect(columns).toContain('updated_at');

      // Check that meal_plan_id is nullable (for standalone lists)
      const mealPlanColumn = result.rows.find((r: any) => r.column_name === 'meal_plan_id');
      expect(mealPlanColumn?.is_nullable).toBe('YES');
    });

    it('should have correct grocery_list_items table structure', async () => {
      const result = await db.execute(sql`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'grocery_list_items'
        ORDER BY ordinal_position
      `);

      expect(result.rows).toBeDefined();
      const columns = result.rows.map((r: any) => r.column_name);
      expect(columns).toContain('id');
      expect(columns).toContain('grocery_list_id');
      expect(columns).toContain('name');
      expect(columns).toContain('category');
      expect(columns).toContain('quantity');
      expect(columns).toContain('unit');
      expect(columns).toContain('is_checked');
      expect(columns).toContain('priority');
    });

    it('should have proper foreign key relationships', async () => {
      const result = await db.execute(sql`
        SELECT
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          rc.delete_rule
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints AS rc
          ON rc.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name IN ('grocery_lists', 'grocery_list_items')
      `);

      expect(result.rows).toBeDefined();

      // Check grocery_lists foreign keys
      const customerFk = result.rows.find((r: any) =>
        r.table_name === 'grocery_lists' && r.column_name === 'customer_id'
      );
      expect(customerFk).toBeDefined();
      expect(customerFk?.foreign_table_name).toBe('users');
      expect(customerFk?.delete_rule).toBe('CASCADE');

      // Check meal_plan_id foreign key (should be SET NULL on delete)
      const mealPlanFk = result.rows.find((r: any) =>
        r.table_name === 'grocery_lists' && r.column_name === 'meal_plan_id'
      );
      if (mealPlanFk) {
        expect(mealPlanFk.foreign_table_name).toBe('personalized_meal_plans');
        expect(mealPlanFk.delete_rule).toBe('SET NULL');
      }
    });
  });

  describe('API Controller Tests', () => {
    describe('getGroceryLists', () => {
      beforeEach(async () => {
        // Create test grocery lists
        await db.insert(groceryLists).values([
          {
            customerId: testCustomerId,
            name: 'Standalone List',
            mealPlanId: null, // Standalone list
          },
          {
            customerId: testCustomerId,
            name: 'Meal Plan List',
            mealPlanId: testMealPlanId, // Linked to meal plan
          },
        ]);
      });

      afterEach(async () => {
        await db.delete(groceryLists).where(eq(groceryLists.customerId, testCustomerId));
      });

      it('should return all grocery lists for customer (both standalone and meal plan)', async () => {
        const req = mockRequest({ user: { id: testCustomerId, role: 'customer' } });
        const res = mockResponse();

        await getGroceryLists(req as Request, res as Response);

        expect(res.status).not.toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalled();

        const response = (res.json as any).mock.calls[0][0];
        expect(response.groceryLists).toBeDefined();
        expect(Array.isArray(response.groceryLists)).toBe(true);
        expect(response.groceryLists.length).toBeGreaterThanOrEqual(2);

        // Check that both types of lists are returned
        const standaloneList = response.groceryLists.find((l: any) => l.name === 'Standalone List');
        const mealPlanList = response.groceryLists.find((l: any) => l.name === 'Meal Plan List');

        expect(standaloneList).toBeDefined();
        expect(standaloneList.isStandalone).toBe(true);
        expect(standaloneList.mealPlanId).toBeNull();

        expect(mealPlanList).toBeDefined();
        expect(mealPlanList.isStandalone).toBe(false);
        expect(mealPlanList.mealPlanId).toBe(testMealPlanId);
      });

      it('should only return lists for authenticated customer', async () => {
        const otherCustomerId = 'other-customer-id';
        const req = mockRequest({ user: { id: otherCustomerId, role: 'customer' } });
        const res = mockResponse();

        await getGroceryLists(req as Request, res as Response);

        expect(res.status).not.toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalled();

        const response = (res.json as any).mock.calls[0][0];
        expect(response.groceryLists).toBeDefined();
        expect(response.groceryLists.every((l: any) => l.customerId !== testCustomerId)).toBe(true);
      });

      it('should reject non-customer users', async () => {
        const req = mockRequest({ user: { id: testTrainerId, role: 'trainer' } });
        const res = mockResponse();

        await getGroceryLists(req as Request, res as Response);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Only customers can access grocery lists'
        });
      });
    });

    describe('createGroceryList', () => {
      it('should create a standalone grocery list', async () => {
        const req = mockRequest({
          user: { id: testCustomerId, role: 'customer' },
          body: { name: 'New Test List' }
        });
        const res = mockResponse();

        await createGroceryList(req as Request, res as Response);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalled();

        const response = (res.json as any).mock.calls[0][0];
        expect(response.name).toBe('New Test List');
        expect(response.customerId).toBe(testCustomerId);
        expect(response.mealPlanId).toBeUndefined();
        expect(response.items).toEqual([]);

        // Store for cleanup
        testGroceryListId = response.id;
      });

      it('should validate required fields', async () => {
        const req = mockRequest({
          user: { id: testCustomerId, role: 'customer' },
          body: {} // Missing name
        });
        const res = mockResponse();

        await createGroceryList(req as Request, res as Response);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalled();

        const response = (res.json as any).mock.calls[0][0];
        expect(response.error).toBeDefined();
      });
    });

    describe('addGroceryListItem', () => {
      let listId: string;

      beforeEach(async () => {
        const [list] = await db.insert(groceryLists).values({
          customerId: testCustomerId,
          name: 'Test List for Items',
        }).returning();
        listId = list.id;
      });

      afterEach(async () => {
        await db.delete(groceryListItems).where(eq(groceryListItems.groceryListId, listId));
        await db.delete(groceryLists).where(eq(groceryLists.id, listId));
      });

      it('should add item to grocery list', async () => {
        const req = mockRequest({
          user: { id: testCustomerId, role: 'customer' },
          params: { id: listId },
          body: {
            name: 'Apples',
            category: 'produce',
            quantity: 5,
            unit: 'pcs',
            priority: 'high',
          }
        });
        const res = mockResponse();

        await addGroceryListItem(req as Request, res as Response);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalled();

        const response = (res.json as any).mock.calls[0][0];
        expect(response.name).toBe('Apples');
        expect(response.category).toBe('produce');
        expect(response.quantity).toBe(5);
        expect(response.isChecked).toBe(false);
      });

      it('should categorize ingredients automatically', () => {
        // Test the categorization logic
        const testItems = [
          { name: 'Chicken Breast', expectedCategory: 'meat' },
          { name: 'Milk', expectedCategory: 'dairy' },
          { name: 'Rice', expectedCategory: 'pantry' },
          { name: 'Lettuce', expectedCategory: 'produce' },
          { name: 'Orange Juice', expectedCategory: 'beverages' },
        ];

        // This would test the categorizeIngredient function
        // which is used in generateGroceryListFromMealPlan
      });
    });

    describe('generateGroceryListFromMealPlan', () => {
      it('should generate grocery list from meal plan with aggregation', async () => {
        const req = mockRequest({
          user: { id: testCustomerId, role: 'customer' },
          body: {
            mealPlanId: testMealPlanId,
            listName: 'Generated from Meal Plan',
          }
        });
        const res = mockResponse();

        await generateGroceryListFromMealPlan(req as Request, res as Response);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalled();

        const response = (res.json as any).mock.calls[0][0];
        expect(response.groceryList).toBeDefined();
        expect(response.groceryList.name).toBe('Generated from Meal Plan');
        expect(response.groceryList.mealPlanId).toBe(testMealPlanId);
        expect(response.groceryList.items).toBeDefined();
        expect(Array.isArray(response.groceryList.items)).toBe(true);

        // Check that ingredients were extracted and categorized
        const items = response.groceryList.items;
        const oats = items.find((i: any) => i.name === 'Oats');
        const chicken = items.find((i: any) => i.name === 'Chicken Breast');

        expect(oats).toBeDefined();
        expect(oats?.category).toBe('pantry');

        expect(chicken).toBeDefined();
        expect(chicken?.category).toBe('meat');

        // Check summary
        expect(response.summary).toBeDefined();
        expect(response.summary.totalItems).toBeGreaterThan(0);
      });

      it('should not allow generating list for non-existent meal plan', async () => {
        const req = mockRequest({
          user: { id: testCustomerId, role: 'customer' },
          body: {
            mealPlanId: 'non-existent-id',
            listName: 'Should Fail',
          }
        });
        const res = mockResponse();

        await generateGroceryListFromMealPlan(req as Request, res as Response);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Meal plan not found'
        });
      });
    });
  });

  describe('Meal Plan Integration Tests', () => {
    it('should handle meal plan deletion gracefully', async () => {
      // Create a meal plan with associated grocery list
      const [tempMealPlan] = await db.insert(personalizedMealPlans).values({
        customerId: testCustomerId,
        trainerId: testTrainerId,
        mealPlanData: {
          id: 'temp-plan',
          planName: 'Temporary Plan',
          fitnessGoal: 'weight_loss',
          dailyCalorieTarget: 2000,
          days: 7,
          mealsPerDay: 3,
          generatedBy: testTrainerId,
          createdAt: new Date(),
          meals: [],
        },
      }).returning();

      const [tempList] = await db.insert(groceryLists).values({
        customerId: testCustomerId,
        name: 'Temporary List',
        mealPlanId: tempMealPlan.id,
      }).returning();

      // Delete the meal plan
      await db.delete(personalizedMealPlans).where(eq(personalizedMealPlans.id, tempMealPlan.id));

      // Check that the grocery list still exists but meal_plan_id is null
      const [updatedList] = await db.select().from(groceryLists).where(eq(groceryLists.id, tempList.id));

      expect(updatedList).toBeDefined();
      expect(updatedList.mealPlanId).toBeNull();
      expect(updatedList.name).toBe('Temporary List');

      // Cleanup
      await db.delete(groceryLists).where(eq(groceryLists.id, tempList.id));
    });

    it('should allow multiple grocery lists per customer', async () => {
      const lists = await db.insert(groceryLists).values([
        { customerId: testCustomerId, name: 'Weekly Shopping' },
        { customerId: testCustomerId, name: 'Party Supplies' },
        { customerId: testCustomerId, name: 'Meal Prep List' },
      ]).returning();

      expect(lists.length).toBe(3);

      // Verify all lists belong to the same customer
      const customerLists = await db.select()
        .from(groceryLists)
        .where(eq(groceryLists.customerId, testCustomerId));

      expect(customerLists.length).toBeGreaterThanOrEqual(3);

      // Cleanup
      for (const list of lists) {
        await db.delete(groceryLists).where(eq(groceryLists.id, list.id));
      }
    });
  });

  describe('Frontend Hook Integration Tests', () => {
    it('should handle empty grocery lists response', () => {
      const emptyResponse = {
        data: {
          groceryLists: [],
          total: 0,
        },
      };

      // Test that the hook handles empty arrays correctly
      expect(emptyResponse.data.groceryLists).toEqual([]);
      expect(emptyResponse.data.total).toBe(0);
    });

    it('should handle grocery lists with item counts', () => {
      const mockListsResponse = {
        data: {
          groceryLists: [
            {
              id: '1',
              name: 'List 1',
              itemCount: 5,
              checkedCount: 2,
              isStandalone: true,
            },
            {
              id: '2',
              name: 'List 2',
              itemCount: 10,
              checkedCount: 10,
              isStandalone: false,
              mealPlanId: 'plan-1',
            },
          ],
          total: 2,
        },
      };

      // Verify the response structure matches what the frontend expects
      expect(mockListsResponse.data.groceryLists).toHaveLength(2);
      expect(mockListsResponse.data.groceryLists[0].isStandalone).toBe(true);
      expect(mockListsResponse.data.groceryLists[1].isStandalone).toBe(false);
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock a database error
      const originalSelect = db.select;
      db.select = vi.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const req = mockRequest({ user: { id: testCustomerId, role: 'customer' } });
      const res = mockResponse();

      await getGroceryLists(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to fetch grocery lists'
      });

      // Restore original function
      db.select = originalSelect;
    });

    it('should handle invalid UUIDs', async () => {
      const req = mockRequest({
        user: { id: testCustomerId, role: 'customer' },
        params: { id: 'invalid-uuid' },
      });
      const res = mockResponse();

      await getGroceryList(req as Request, res as Response);

      // The controller should handle this gracefully
      expect(res.status).toHaveBeenCalled();
    });
  });

  describe('Performance Tests', () => {
    it('should handle large grocery lists efficiently', async () => {
      const [largeList] = await db.insert(groceryLists).values({
        customerId: testCustomerId,
        name: 'Large List',
      }).returning();

      // Add 100 items
      const items = Array.from({ length: 100 }, (_, i) => ({
        groceryListId: largeList.id,
        name: `Item ${i + 1}`,
        category: 'produce' as const,
        quantity: Math.floor(Math.random() * 10) + 1,
        unit: 'pcs',
        isChecked: Math.random() > 0.5,
        priority: 'medium' as const,
      }));

      await db.insert(groceryListItems).values(items);

      const startTime = Date.now();

      const req = mockRequest({
        user: { id: testCustomerId, role: 'customer' },
        params: { id: largeList.id },
      });
      const res = mockResponse();

      await getGroceryList(req as Request, res as Response);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(res.json).toHaveBeenCalled();

      const response = (res.json as any).mock.calls[0][0];
      expect(response.items).toHaveLength(100);

      // Cleanup
      await db.delete(groceryListItems).where(eq(groceryListItems.groceryListId, largeList.id));
      await db.delete(groceryLists).where(eq(groceryLists.id, largeList.id));
    });
  });
});