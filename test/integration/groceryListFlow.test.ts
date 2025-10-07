/**
 * Integration Tests for Complete Grocery List Flows
 *
 * End-to-end testing of grocery list functionality including:
 * - Complete user flows (create list, add items, generate from meal plan)
 * - Data persistence and synchronization
 * - Error handling across the full stack
 * - Authentication and authorization flows
 * - Real API interactions with mock database
 *
 * @author FitnessMealPlanner Team - Unit Tests Bot
 * @since 1.0.0
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { groceryListsRouter } from '../../server/routes/groceryLists';
import { requireAuth, requireRole } from '../../server/middleware/auth';

// Mock database for integration testing
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  $count: vi.fn(),
};

vi.mock('../../server/db', () => ({
  db: mockDb,
}));

// Mock schema validation
vi.mock('@shared/schema', () => ({
  groceryLists: {},
  groceryListItems: {},
  recipes: {},
  personalizedMealPlans: {},
  groceryListSchema: {
    safeParse: vi.fn(),
  },
  updateGroceryListSchema: {
    safeParse: vi.fn(),
  },
  groceryListItemSchema: {
    safeParse: vi.fn(),
  },
  updateGroceryListItemSchema: {
    safeParse: vi.fn(),
  },
}));

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
}));

// Test data
const testUser = {
  id: 'user-123',
  role: 'customer',
  email: 'test@example.com',
};

const testTrainer = {
  id: 'trainer-123',
  role: 'trainer',
  email: 'trainer@example.com',
};

const mockGroceryList = {
  id: 'list-123',
  customerId: 'user-123',
  name: 'Weekly Grocery List',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockGroceryListItems = [
  {
    id: 'item-123',
    groceryListId: 'list-123',
    name: 'Apples',
    category: 'produce',
    quantity: 5,
    unit: 'pcs',
    isChecked: false,
    priority: 'medium',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item-124',
    groceryListId: 'list-123',
    name: 'Chicken Breast',
    category: 'meat',
    quantity: 2,
    unit: 'lbs',
    isChecked: false,
    priority: 'high',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockMealPlan = {
  id: 'plan-123',
  customerId: 'user-123',
  mealPlanData: {
    days: [
      {
        meals: [
          {
            recipe: {
              name: 'Apple Chicken Salad',
              ingredients: [
                { name: 'apple', amount: '2', unit: 'pcs' },
                { name: 'chicken breast', amount: '1', unit: 'lb' },
                { name: 'lettuce', amount: '2', unit: 'cups' },
                { name: 'olive oil', amount: '2', unit: 'tbsp' },
              ],
            },
          },
          {
            recipe: {
              name: 'Chicken Rice Bowl',
              ingredients: [
                { name: 'chicken breast', amount: '1', unit: 'lb' },
                { name: 'brown rice', amount: '1', unit: 'cup' },
                { name: 'broccoli', amount: '2', unit: 'cups' },
              ],
            },
          },
        ],
      },
    ],
  },
};

// Setup Express app for testing
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Mock authentication middleware
  app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.decode(token) as any;
        req.user = decoded;
      } catch (error) {
        req.user = null;
      }
    }
    next();
  });

  app.use('/api/grocery-lists', groceryListsRouter);

  return app;
};

// Helper function to create JWT token
const createToken = (user: typeof testUser) => {
  return jwt.sign(user, 'test-secret');
};

describe('Grocery List Integration Tests', () => {
  let app: express.Application;
  let userToken: string;
  let trainerToken: string;

  beforeAll(() => {
    app = createTestApp();
    userToken = createToken(testUser);
    trainerToken = createToken(testTrainer);
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default validation responses
    const {
      groceryListSchema,
      updateGroceryListSchema,
      groceryListItemSchema,
      updateGroceryListItemSchema
    } = require('@shared/schema');

    groceryListSchema.safeParse.mockReturnValue({
      success: true,
      data: { name: 'Test List' },
    });

    updateGroceryListSchema.safeParse.mockReturnValue({
      success: true,
      data: { name: 'Updated List' },
    });

    groceryListItemSchema.safeParse.mockReturnValue({
      success: true,
      data: mockGroceryListItems[0],
    });

    updateGroceryListItemSchema.safeParse.mockReturnValue({
      success: true,
      data: { isChecked: true },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Grocery List Lifecycle', () => {
    it('should handle complete grocery list creation and management flow', async () => {
      // Step 1: Create grocery list
      mockDb.returning.mockResolvedValueOnce([mockGroceryList]);

      const createResponse = await request(app)
        .post('/api/grocery-lists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Weekly Grocery List' })
        .expect(201);

      expect(createResponse.body).toMatchObject({
        id: 'list-123',
        name: 'Weekly Grocery List',
        items: [],
      });

      // Step 2: Add items to the list
      mockDb.returning
        .mockResolvedValueOnce([mockGroceryList]) // verify list exists
        .mockResolvedValueOnce([mockGroceryListItems[0]]); // add item

      const addItemResponse = await request(app)
        .post('/api/grocery-lists/list-123/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Apples',
          category: 'produce',
          quantity: 5,
          unit: 'pcs',
          priority: 'medium',
        })
        .expect(201);

      expect(addItemResponse.body).toMatchObject({
        id: 'item-123',
        name: 'Apples',
        category: 'produce',
      });

      // Step 3: Add second item
      mockDb.returning
        .mockResolvedValueOnce([mockGroceryList]) // verify list exists
        .mockResolvedValueOnce([mockGroceryListItems[1]]); // add item

      await request(app)
        .post('/api/grocery-lists/list-123/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Chicken Breast',
          category: 'meat',
          quantity: 2,
          unit: 'lbs',
          priority: 'high',
        })
        .expect(201);

      // Step 4: Update item (mark as checked)
      mockDb.returning
        .mockResolvedValueOnce([mockGroceryList]) // verify list exists
        .mockResolvedValueOnce([{ ...mockGroceryListItems[0], isChecked: true }]); // update item

      const updateResponse = await request(app)
        .put('/api/grocery-lists/list-123/items/item-123')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ isChecked: true })
        .expect(200);

      expect(updateResponse.body.isChecked).toBe(true);

      // Step 5: Get list with items
      mockDb.returning
        .mockResolvedValueOnce([mockGroceryList]) // get list
        .mockResolvedValueOnce(mockGroceryListItems); // get items

      const getResponse = await request(app)
        .get('/api/grocery-lists/list-123')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(getResponse.body).toMatchObject({
        id: 'list-123',
        name: 'Weekly Grocery List',
        items: mockGroceryListItems,
      });

      // Step 6: Delete an item
      mockDb.returning
        .mockResolvedValueOnce([mockGroceryList]) // verify list exists
        .mockResolvedValueOnce([mockGroceryListItems[0]]); // delete item

      await request(app)
        .delete('/api/grocery-lists/list-123/items/item-123')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Step 7: Update list name
      mockDb.returning.mockResolvedValueOnce([
        { ...mockGroceryList, name: 'Updated List' },
      ]);

      const updateListResponse = await request(app)
        .put('/api/grocery-lists/list-123')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Updated List' })
        .expect(200);

      expect(updateListResponse.body.name).toBe('Updated List');

      // Step 8: Delete the entire list
      mockDb.returning.mockResolvedValueOnce([mockGroceryList]);

      await request(app)
        .delete('/api/grocery-lists/list-123')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
    });

    it('should handle meal plan to grocery list generation flow', async () => {
      // Step 1: Generate grocery list from meal plan
      mockDb.returning
        .mockResolvedValueOnce([mockMealPlan]) // get meal plan
        .mockResolvedValueOnce([{ ...mockGroceryList, name: 'Generated List' }]) // create list
        .mockResolvedValueOnce([ // create aggregated items
          {
            id: 'item-generated-1',
            groceryListId: 'list-123',
            name: 'apple',
            category: 'produce',
            quantity: 2,
            unit: 'pcs',
            isChecked: false,
            priority: 'medium',
            notes: 'Used in: Apple Chicken Salad',
          },
          {
            id: 'item-generated-2',
            groceryListId: 'list-123',
            name: 'chicken breast',
            category: 'meat',
            quantity: 2, // 1 + 1 from both recipes
            unit: 'lbs',
            isChecked: false,
            priority: 'medium',
            notes: 'Used in: Apple Chicken Salad, Chicken Rice Bowl',
          },
          {
            id: 'item-generated-3',
            groceryListId: 'list-123',
            name: 'lettuce',
            category: 'produce',
            quantity: 2,
            unit: 'cups',
            isChecked: false,
            priority: 'medium',
            notes: 'Used in: Apple Chicken Salad',
          },
          {
            id: 'item-generated-4',
            groceryListId: 'list-123',
            name: 'olive oil',
            category: 'pantry',
            quantity: 2,
            unit: 'tbsp',
            isChecked: false,
            priority: 'medium',
            notes: 'Used in: Apple Chicken Salad',
          },
          {
            id: 'item-generated-5',
            groceryListId: 'list-123',
            name: 'brown rice',
            category: 'pantry',
            quantity: 1,
            unit: 'cups',
            isChecked: false,
            priority: 'medium',
            notes: 'Used in: Chicken Rice Bowl',
          },
          {
            id: 'item-generated-6',
            groceryListId: 'list-123',
            name: 'broccoli',
            category: 'produce',
            quantity: 2,
            unit: 'cups',
            isChecked: false,
            priority: 'medium',
            notes: 'Used in: Chicken Rice Bowl',
          },
        ]);

      const generateResponse = await request(app)
        .post('/api/grocery-lists/from-meal-plan')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          mealPlanId: 'plan-123',
          listName: 'Generated List',
        })
        .expect(201);

      expect(generateResponse.body).toMatchObject({
        groceryList: {
          id: 'list-123',
          name: 'Generated List',
          items: expect.arrayContaining([
            expect.objectContaining({
              name: 'apple',
              category: 'produce',
              quantity: 2,
            }),
            expect.objectContaining({
              name: 'chicken breast',
              category: 'meat',
              quantity: 2, // aggregated quantity
            }),
          ]),
        },
        summary: {
          totalItems: 6,
          categoriesCount: 3, // produce, meat, pantry
          sourceRecipes: 2,
        },
      });

      // Verify ingredient aggregation worked correctly
      const chickenItem = generateResponse.body.groceryList.items.find(
        (item: any) => item.name === 'chicken breast'
      );
      expect(chickenItem.quantity).toBe(2); // 1 + 1 from both recipes
      expect(chickenItem.notes).toContain('Apple Chicken Salad');
      expect(chickenItem.notes).toContain('Chicken Rice Bowl');

      // Step 2: Verify generated items are properly categorized
      const categoryCounts = generateResponse.body.groceryList.items.reduce(
        (acc: any, item: any) => {
          acc[item.category] = (acc[item.category] || 0) + 1;
          return acc;
        },
        {}
      );

      expect(categoryCounts).toMatchObject({
        produce: 3, // apple, lettuce, broccoli
        meat: 1,    // chicken breast
        pantry: 2,  // olive oil, brown rice
      });
    });

    it('should handle multiple users with isolated data', async () => {
      const otherUser = {
        id: 'user-456',
        role: 'customer',
        email: 'other@example.com',
      };
      const otherUserToken = createToken(otherUser);

      // User 1 creates a list
      mockDb.returning.mockResolvedValueOnce([mockGroceryList]);

      await request(app)
        .post('/api/grocery-lists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'User 1 List' })
        .expect(201);

      // User 2 creates a list
      const otherUserList = { ...mockGroceryList, id: 'list-456', customerId: 'user-456' };
      mockDb.returning.mockResolvedValueOnce([otherUserList]);

      await request(app)
        .post('/api/grocery-lists')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ name: 'User 2 List' })
        .expect(201);

      // User 1 tries to access User 2's list (should fail)
      mockDb.returning.mockResolvedValueOnce([]); // no list found for user 1

      await request(app)
        .get('/api/grocery-lists/list-456')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      // User 2 can access their own list
      mockDb.returning
        .mockResolvedValueOnce([otherUserList]) // get list
        .mockResolvedValueOnce([]); // get items (empty)

      const response = await request(app)
        .get('/api/grocery-lists/list-456')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(200);

      expect(response.body.id).toBe('list-456');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection errors gracefully', async () => {
      mockDb.returning.mockRejectedValue(new Error('Database connection failed'));

      await request(app)
        .get('/api/grocery-lists')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(500);
    });

    it('should handle invalid meal plan data during generation', async () => {
      // Meal plan with malformed data
      const invalidMealPlan = {
        ...mockMealPlan,
        mealPlanData: {
          days: [
            {
              meals: [
                {
                  recipe: null, // invalid recipe
                },
                {
                  recipe: {
                    name: 'Valid Recipe',
                    ingredients: null, // invalid ingredients
                  },
                },
              ],
            },
          ],
        },
      };

      mockDb.returning
        .mockResolvedValueOnce([invalidMealPlan]) // get invalid meal plan
        .mockResolvedValueOnce([mockGroceryList]) // create list anyway
        .mockResolvedValueOnce([]); // no items generated

      const response = await request(app)
        .post('/api/grocery-lists/from-meal-plan')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          mealPlanId: 'plan-invalid',
          listName: 'Generated from Invalid',
        })
        .expect(201);

      expect(response.body.summary.totalItems).toBe(0);
      expect(response.body.summary.sourceRecipes).toBe(0);
    });

    it('should handle concurrent modifications to the same list', async () => {
      // Simulate two users trying to modify the same item simultaneously
      const item1Update = { isChecked: true };
      const item2Update = { quantity: 10 };

      mockDb.returning
        .mockResolvedValueOnce([mockGroceryList]) // verify list exists for first update
        .mockResolvedValueOnce([{ ...mockGroceryListItems[0], ...item1Update }]) // first update
        .mockResolvedValueOnce([mockGroceryList]) // verify list exists for second update
        .mockResolvedValueOnce([{ ...mockGroceryListItems[0], ...item2Update }]); // second update

      // First update
      const response1 = await request(app)
        .put('/api/grocery-lists/list-123/items/item-123')
        .set('Authorization', `Bearer ${userToken}`)
        .send(item1Update)
        .expect(200);

      // Second update (should overwrite first)
      const response2 = await request(app)
        .put('/api/grocery-lists/list-123/items/item-123')
        .set('Authorization', `Bearer ${userToken}`)
        .send(item2Update)
        .expect(200);

      expect(response1.body.isChecked).toBe(true);
      expect(response2.body.quantity).toBe(10);
    });

    it('should handle validation errors consistently', async () => {
      const { groceryListSchema } = require('@shared/schema');
      groceryListSchema.safeParse.mockReturnValue({
        success: false,
        error: {
          errors: [
            { message: 'Name is required', path: ['name'] },
            { message: 'Name must be at least 3 characters', path: ['name'] },
          ],
        },
      });

      const response = await request(app)
        .post('/api/grocery-lists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({}) // empty data
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Invalid grocery list data',
        details: [
          { message: 'Name is required', path: ['name'] },
          { message: 'Name must be at least 3 characters', path: ['name'] },
        ],
      });
    });

    it('should handle large meal plans with many ingredients', async () => {
      // Create a meal plan with many recipes and ingredients
      const largeMealPlan = {
        ...mockMealPlan,
        mealPlanData: {
          days: Array.from({ length: 7 }, (_, dayIndex) => ({
            meals: Array.from({ length: 3 }, (_, mealIndex) => ({
              recipe: {
                name: `Recipe ${dayIndex}-${mealIndex}`,
                ingredients: Array.from({ length: 10 }, (_, ingredientIndex) => ({
                  name: `ingredient-${dayIndex}-${mealIndex}-${ingredientIndex}`,
                  amount: '1',
                  unit: 'pcs',
                })),
              },
            })),
          })),
        },
      };

      // Should generate 7 days * 3 meals * 10 ingredients = 210 potential items
      // But with aggregation, many will be combined
      const aggregatedItems = Array.from({ length: 50 }, (_, index) => ({
        id: `item-${index}`,
        groceryListId: 'list-123',
        name: `ingredient-${index}`,
        category: 'produce',
        quantity: Math.floor(Math.random() * 10) + 1,
        unit: 'pcs',
        isChecked: false,
        priority: 'medium',
        notes: 'Used in multiple recipes',
      }));

      mockDb.returning
        .mockResolvedValueOnce([largeMealPlan])
        .mockResolvedValueOnce([mockGroceryList])
        .mockResolvedValueOnce(aggregatedItems);

      const response = await request(app)
        .post('/api/grocery-lists/from-meal-plan')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          mealPlanId: 'plan-large',
          listName: 'Large Generated List',
        })
        .expect(201);

      expect(response.body.summary.totalItems).toBe(50);
      expect(response.body.summary.sourceRecipes).toBe(21); // 7 * 3
    });
  });

  describe('Authentication and Authorization Integration', () => {
    it('should reject requests without authentication', async () => {
      await request(app)
        .get('/api/grocery-lists')
        .expect(401);
    });

    it('should reject non-customer users from all endpoints', async () => {
      // Test all endpoints with trainer token
      await request(app)
        .get('/api/grocery-lists')
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(403);

      await request(app)
        .post('/api/grocery-lists')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ name: 'Test List' })
        .expect(403);

      await request(app)
        .get('/api/grocery-lists/list-123')
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(403);

      await request(app)
        .put('/api/grocery-lists/list-123')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ name: 'Updated' })
        .expect(403);

      await request(app)
        .delete('/api/grocery-lists/list-123')
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(403);

      await request(app)
        .post('/api/grocery-lists/list-123/items')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ name: 'Test Item' })
        .expect(403);

      await request(app)
        .post('/api/grocery-lists/from-meal-plan')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ mealPlanId: 'plan-123' })
        .expect(403);
    });

    it('should handle expired or invalid tokens', async () => {
      const invalidToken = 'invalid.token.here';

      await request(app)
        .get('/api/grocery-lists')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);
    });

    it('should handle missing authorization header', async () => {
      await request(app)
        .get('/api/grocery-lists')
        .expect(401);
    });

    it('should handle malformed authorization header', async () => {
      await request(app)
        .get('/api/grocery-lists')
        .set('Authorization', 'InvalidFormat')
        .expect(401);
    });
  });

  describe('Data Persistence and Consistency', () => {
    it('should maintain data consistency across operations', async () => {
      // Create list
      mockDb.returning.mockResolvedValueOnce([mockGroceryList]);

      await request(app)
        .post('/api/grocery-lists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Consistency Test' })
        .expect(201);

      // Add item
      mockDb.returning
        .mockResolvedValueOnce([mockGroceryList])
        .mockResolvedValueOnce([mockGroceryListItems[0]]);

      await request(app)
        .post('/api/grocery-lists/list-123/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Test Item',
          category: 'produce',
          quantity: 1,
          unit: 'pcs',
          priority: 'medium',
        })
        .expect(201);

      // Verify item exists in list
      mockDb.returning
        .mockResolvedValueOnce([mockGroceryList])
        .mockResolvedValueOnce([mockGroceryListItems[0]]);

      const getResponse = await request(app)
        .get('/api/grocery-lists/list-123')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(getResponse.body.items).toHaveLength(1);
      expect(getResponse.body.items[0].groceryListId).toBe('list-123');
    });

    it('should handle cascading deletes properly', async () => {
      // Delete list should also delete all items
      mockDb.returning.mockResolvedValueOnce([mockGroceryList]);

      const response = await request(app)
        .delete('/api/grocery-lists/list-123')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Grocery list deleted successfully',
        deletedListId: 'list-123',
      });

      // Verify list no longer exists
      mockDb.returning.mockResolvedValueOnce([]);

      await request(app)
        .get('/api/grocery-lists/list-123')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('should handle database transaction failures', async () => {
      // Simulate transaction failure during list creation
      mockDb.returning.mockRejectedValue(new Error('Transaction failed'));

      await request(app)
        .post('/api/grocery-lists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Transaction Test' })
        .expect(500);

      // Verify no partial data was created
      mockDb.returning.mockResolvedValueOnce([]);

      await request(app)
        .get('/api/grocery-lists')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, (_, index) => {
        mockDb.returning.mockResolvedValueOnce([
          { ...mockGroceryList, id: `list-${index}`, name: `List ${index}` },
        ]);

        return request(app)
          .post('/api/grocery-lists')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ name: `Concurrent List ${index}` });
      });

      const responses = await Promise.all(requests);

      responses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.name).toBe(`Concurrent List ${index}`);
      });
    });

    it('should handle large payloads efficiently', async () => {
      const largeItem = {
        name: 'A'.repeat(1000), // Very long name
        category: 'produce',
        quantity: 999999,
        unit: 'pcs',
        priority: 'medium',
        notes: 'B'.repeat(2000), // Very long notes
      };

      mockDb.returning
        .mockResolvedValueOnce([mockGroceryList])
        .mockResolvedValueOnce([{ ...mockGroceryListItems[0], ...largeItem }]);

      const start = Date.now();

      await request(app)
        .post('/api/grocery-lists/list-123/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send(largeItem)
        .expect(201);

      const duration = Date.now() - start;

      // Should complete within reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
    });

    it('should handle rapid sequential requests', async () => {
      // Rapid fire requests to test rate limiting and resource management
      const rapidRequests = [];

      for (let i = 0; i < 20; i++) {
        mockDb.returning.mockResolvedValueOnce([mockGroceryLists]);

        rapidRequests.push(
          request(app)
            .get('/api/grocery-lists')
            .set('Authorization', `Bearer ${userToken}`)
        );
      }

      const responses = await Promise.all(rapidRequests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Complex Scenario Testing', () => {
    it('should handle a complete weekly meal planning scenario', async () => {
      // Scenario: User creates multiple lists for different purposes

      // 1. Create weekly grocery list
      mockDb.returning.mockResolvedValueOnce([
        { ...mockGroceryList, name: 'Weekly Groceries' },
      ]);

      await request(app)
        .post('/api/grocery-lists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Weekly Groceries' })
        .expect(201);

      // 2. Generate list from meal plan
      mockDb.returning
        .mockResolvedValueOnce([mockMealPlan])
        .mockResolvedValueOnce([{ ...mockGroceryList, id: 'list-generated', name: 'From Meal Plan' }])
        .mockResolvedValueOnce([
          { ...mockGroceryListItems[0], groceryListId: 'list-generated' },
          { ...mockGroceryListItems[1], groceryListId: 'list-generated' },
        ]);

      const generateResponse = await request(app)
        .post('/api/grocery-lists/from-meal-plan')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ mealPlanId: 'plan-123', listName: 'From Meal Plan' })
        .expect(201);

      // 3. Create emergency shopping list
      mockDb.returning.mockResolvedValueOnce([
        { ...mockGroceryList, id: 'list-emergency', name: 'Emergency Items' },
      ]);

      await request(app)
        .post('/api/grocery-lists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Emergency Items' })
        .expect(201);

      // 4. Add urgent items to emergency list
      mockDb.returning
        .mockResolvedValueOnce([{ ...mockGroceryList, id: 'list-emergency' }])
        .mockResolvedValueOnce([{
          ...mockGroceryListItems[0],
          id: 'emergency-item',
          groceryListId: 'list-emergency',
          name: 'Milk',
          priority: 'high',
        }]);

      await request(app)
        .post('/api/grocery-lists/list-emergency/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Milk',
          category: 'dairy',
          quantity: 1,
          unit: 'cartons',
          priority: 'high',
        })
        .expect(201);

      // 5. Get all lists to verify they exist
      mockDb.returning.mockResolvedValueOnce([
        { ...mockGroceryList, name: 'Weekly Groceries', itemCount: 0, checkedCount: 0 },
        { ...mockGroceryList, id: 'list-generated', name: 'From Meal Plan', itemCount: 2, checkedCount: 0 },
        { ...mockGroceryList, id: 'list-emergency', name: 'Emergency Items', itemCount: 1, checkedCount: 0 },
      ]);

      const allListsResponse = await request(app)
        .get('/api/grocery-lists')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(allListsResponse.body.groceryLists).toHaveLength(3);
      expect(allListsResponse.body.total).toBe(3);

      // Verify list names and item counts
      const listNames = allListsResponse.body.groceryLists.map((list: any) => list.name);
      expect(listNames).toContain('Weekly Groceries');
      expect(listNames).toContain('From Meal Plan');
      expect(listNames).toContain('Emergency Items');
    });

    it('should handle ingredient aggregation edge cases', async () => {
      // Test meal plan with duplicate ingredients with different units
      const complexMealPlan = {
        ...mockMealPlan,
        mealPlanData: {
          days: [
            {
              meals: [
                {
                  recipe: {
                    name: 'Recipe 1',
                    ingredients: [
                      { name: 'chicken breast', amount: '1', unit: 'lb' },
                      { name: 'olive oil', amount: '2', unit: 'tbsp' },
                    ],
                  },
                },
                {
                  recipe: {
                    name: 'Recipe 2',
                    ingredients: [
                      { name: 'chicken breast', amount: '500', unit: 'g' }, // Different unit
                      { name: 'olive oil', amount: '1', unit: 'tbsp' },
                    ],
                  },
                },
              ],
            },
          ],
        },
      };

      // Mock aggregated results (different units should not be combined)
      mockDb.returning
        .mockResolvedValueOnce([complexMealPlan])
        .mockResolvedValueOnce([mockGroceryList])
        .mockResolvedValueOnce([
          {
            id: 'item-1',
            groceryListId: 'list-123',
            name: 'chicken breast',
            category: 'meat',
            quantity: 1,
            unit: 'lbs',
            isChecked: false,
            priority: 'medium',
            notes: 'Used in: Recipe 1',
          },
          {
            id: 'item-2',
            groceryListId: 'list-123',
            name: 'chicken breast',
            category: 'meat',
            quantity: 500,
            unit: 'g',
            isChecked: false,
            priority: 'medium',
            notes: 'Used in: Recipe 2',
          },
          {
            id: 'item-3',
            groceryListId: 'list-123',
            name: 'olive oil',
            category: 'pantry',
            quantity: 3, // 2 + 1 (same unit, can be combined)
            unit: 'tbsp',
            isChecked: false,
            priority: 'medium',
            notes: 'Used in: Recipe 1, Recipe 2',
          },
        ]);

      const response = await request(app)
        .post('/api/grocery-lists/from-meal-plan')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ mealPlanId: 'plan-complex' })
        .expect(201);

      // Should have separate entries for different units but combined for same units
      const items = response.body.groceryList.items;
      const chickenItems = items.filter((item: any) => item.name === 'chicken breast');
      const oilItems = items.filter((item: any) => item.name === 'olive oil');

      expect(chickenItems).toHaveLength(2); // Different units, not combined
      expect(oilItems).toHaveLength(1); // Same unit, combined
      expect(oilItems[0].quantity).toBe(3);
    });
  });
});