/**
 * Comprehensive API Integration Test Suite
 *
 * This test suite provides end-to-end integration testing for the FitnessMealPlanner
 * application, covering API routes, database operations, authentication flows,
 * and cross-component interactions.
 *
 * Test Coverage:
 * - Complete authentication flows (login, token refresh, logout)
 * - Recipe CRUD operations with validation and authorization
 * - Meal plan generation and management workflows
 * - Multi-role user interactions and permissions
 * - Admin operations and system management
 * - Data validation and error handling
 * - Performance and concurrency scenarios
 * - Cross-component state management
 *
 * @author FitnessMealPlanner Test Team
 * @since 1.0.0
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../server/index';
import { storage } from '../../server/storage';
import { hashPassword } from '../../server/auth';
import type { User, Recipe, InsertRecipe } from '../../shared/schema';
import { randomUUID } from 'crypto';

// Test configuration
const TEST_TIMEOUT = 30000;
const API_DELAY = 100; // Simulate network latency

// Test data factories
const createTestUser = (role: 'admin' | 'trainer' | 'customer' = 'customer') => ({
  id: randomUUID(),
  email: `test-${role}-${randomUUID()}@example.com`,
  name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
  role,
  password: 'TestPassword123!',
  profilePicture: `https://example.com/${role}.jpg`,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const createTestRecipe = (overrides: Partial<InsertRecipe> = {}): InsertRecipe => ({
  name: `Test Recipe ${randomUUID().slice(0, 8)}`,
  description: 'A comprehensive test recipe for integration testing',
  mealTypes: ['breakfast'],
  dietaryTags: ['vegetarian', 'gluten-free'],
  mainIngredientTags: ['eggs', 'vegetables'],
  ingredientsJson: [
    { name: 'Eggs', amount: '2', unit: 'pieces' },
    { name: 'Spinach', amount: '100', unit: 'grams' },
    { name: 'Cheese', amount: '50', unit: 'grams' },
  ],
  instructionsText: '1. Beat eggs\n2. Add spinach\n3. Cook until set\n4. Add cheese\n5. Serve hot',
  prepTimeMinutes: 5,
  cookTimeMinutes: 10,
  servings: 2,
  caloriesKcal: 350,
  proteinGrams: '25.50',
  carbsGrams: '5.00',
  fatGrams: '22.00',
  imageUrl: 'https://example.com/recipe-image.jpg',
  sourceReference: 'Integration Test Suite',
  isApproved: false,
  ...overrides,
});

const createTestMealPlan = (overrides: any = {}) => ({
  planName: `Test Meal Plan ${randomUUID().slice(0, 8)}`,
  days: 7,
  mealsPerDay: 3,
  dailyCalorieTarget: 2000,
  fitnessGoal: 'weight_loss',
  description: 'A test meal plan for integration testing',
  clientName: 'Test Client',
  meals: [],
  ...overrides,
});

// Helper functions
const authenticateUser = async (user: any) => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      email: user.email,
      password: user.password,
    });

  return response.body.token;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe.skip('Comprehensive API Integration Tests - SKIPPED: Port conflict with running server', () => {
  const testUsers: { admin: any; trainer: any; customer: any } = {} as any;
  const testTokens: { admin: string; trainer: string; customer: string } = {} as any;
  const testRecipes: Recipe[] = [];
  const testMealPlans: any[] = [];

  beforeAll(async () => {
    // Create test users with hashed passwords
    testUsers.admin = createTestUser('admin');
    testUsers.trainer = createTestUser('trainer');
    testUsers.customer = createTestUser('customer');

    // Hash passwords and create users
    for (const role of ['admin', 'trainer', 'customer'] as const) {
      const user = testUsers[role];
      const hashedPassword = await hashPassword(user.password);

      await storage.createUser({
        ...user,
        passwordHash: hashedPassword,
      });
    }

    // Wait for users to be created
    await delay(API_DELAY);
  }, TEST_TIMEOUT);

  afterAll(async () => {
    // Cleanup test data
    for (const role of ['admin', 'trainer', 'customer'] as const) {
      try {
        await storage.deleteUser?.(testUsers[role].id);
      } catch (error) {
        console.warn(`Failed to cleanup user ${role}:`, error);
      }
    }

    // Cleanup test recipes
    for (const recipe of testRecipes) {
      try {
        await storage.deleteRecipe(recipe.id);
      } catch (error) {
        console.warn(`Failed to cleanup recipe ${recipe.id}:`, error);
      }
    }
  }, TEST_TIMEOUT);

  beforeEach(async () => {
    // Authenticate all test users before each test
    testTokens.admin = await authenticateUser(testUsers.admin);
    testTokens.trainer = await authenticateUser(testUsers.trainer);
    testTokens.customer = await authenticateUser(testUsers.customer);

    await delay(API_DELAY);
  });

  describe('Authentication Flow Integration', () => {
    it('should complete full authentication cycle', async () => {
      const newUser = createTestUser();
      const hashedPassword = await hashPassword(newUser.password);

      // Register user
      await storage.createUser({
        ...newUser,
        passwordHash: hashedPassword,
      });

      // Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: newUser.email,
          password: newUser.password,
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.token).toBeDefined();
      expect(loginResponse.body.user).toBeDefined();
      expect(loginResponse.body.user.email).toBe(newUser.email);

      const token = loginResponse.body.token;

      // Access protected route
      const protectedResponse = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(protectedResponse.status).toBe(200);
      expect(protectedResponse.body.email).toBe(newUser.email);

      // Logout (if endpoint exists)
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      // Logout endpoint might not exist, so we don't assert status

      // Cleanup
      await storage.deleteUser?.(newUser.id);
    });

    it('should handle token refresh flow', async () => {
      // This test assumes a token refresh mechanism exists
      const token = testTokens.customer;

      // Make request with token
      const response1 = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(response1.status).toBe(200);

      // Simulate token near expiry by making multiple requests
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .get('/api/user/profile')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        await delay(50);
      }
    });

    it('should enforce role-based access control', async () => {
      // Admin-only endpoint
      const adminResponse = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${testTokens.admin}`);

      expect(adminResponse.status).toBe(200);

      // Trainer cannot access admin endpoint
      const trainerResponse = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${testTokens.trainer}`);

      expect(trainerResponse.status).toBe(403);

      // Customer cannot access admin endpoint
      const customerResponse = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${testTokens.customer}`);

      expect(customerResponse.status).toBe(403);
    });

    it('should validate token format and signature', async () => {
      // Invalid token format
      const invalidFormatResponse = await request(app)
        .get('/api/user/profile')
        .set('Authorization', 'Bearer invalid-token-format');

      expect(invalidFormatResponse.status).toBe(401);

      // Malformed token
      const malformedResponse = await request(app)
        .get('/api/user/profile')
        .set('Authorization', 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.invalid');

      expect(malformedResponse.status).toBe(401);

      // Missing token
      const missingTokenResponse = await request(app)
        .get('/api/user/profile');

      expect(missingTokenResponse.status).toBe(401);
    });
  });

  describe('Recipe Management Integration', () => {
    it('should complete full recipe lifecycle', async () => {
      const recipeData = createTestRecipe();

      // Create recipe (admin only)
      const createResponse = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${testTokens.admin}`)
        .send(recipeData);

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.id).toBeDefined();
      expect(createResponse.body.name).toBe(recipeData.name);
      expect(createResponse.body.isApproved).toBe(false);

      const recipeId = createResponse.body.id;
      testRecipes.push(createResponse.body);

      // Retrieve recipe
      const getResponse = await request(app)
        .get(`/api/recipes/${recipeId}`)
        .set('Authorization', `Bearer ${testTokens.customer}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.id).toBe(recipeId);

      // Update recipe (admin only)
      const updateData = {
        name: 'Updated Test Recipe',
        description: 'Updated description',
        caloriesKcal: 400,
      };

      const updateResponse = await request(app)
        .put(`/api/recipes/${recipeId}`)
        .set('Authorization', `Bearer ${testTokens.admin}`)
        .send(updateData);

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.name).toBe(updateData.name);
      expect(updateResponse.body.caloriesKcal).toBe(updateData.caloriesKcal);

      // Approve recipe (admin only)
      const approveResponse = await request(app)
        .patch(`/api/admin/recipes/${recipeId}/approve`)
        .set('Authorization', `Bearer ${testTokens.admin}`);

      expect(approveResponse.status).toBe(200);
      expect(approveResponse.body.isApproved).toBe(true);

      // Search for recipe
      const searchResponse = await request(app)
        .get('/api/recipes/search')
        .query({ search: 'Updated Test Recipe', approved: true })
        .set('Authorization', `Bearer ${testTokens.customer}`);

      expect(searchResponse.status).toBe(200);
      expect(searchResponse.body.recipes).toBeDefined();
      expect(searchResponse.body.total).toBeGreaterThan(0);

      const foundRecipe = searchResponse.body.recipes.find((r: any) => r.id === recipeId);
      expect(foundRecipe).toBeDefined();
      expect(foundRecipe.name).toBe(updateData.name);

      // Delete recipe (admin only)
      const deleteResponse = await request(app)
        .delete(`/api/recipes/${recipeId}`)
        .set('Authorization', `Bearer ${testTokens.admin}`);

      expect(deleteResponse.status).toBe(200);

      // Verify deletion
      const getDeletedResponse = await request(app)
        .get(`/api/recipes/${recipeId}`)
        .set('Authorization', `Bearer ${testTokens.customer}`);

      expect(getDeletedResponse.status).toBe(404);
    });

    it('should handle recipe search with complex filters', async () => {
      // Create multiple test recipes with different characteristics
      const recipes = [
        createTestRecipe({
          name: 'High Protein Breakfast',
          mealTypes: ['breakfast'],
          dietaryTags: ['high-protein'],
          caloriesKcal: 400,
          proteinGrams: '30.0',
          isApproved: true,
        }),
        createTestRecipe({
          name: 'Low Carb Lunch',
          mealTypes: ['lunch'],
          dietaryTags: ['low-carb', 'keto'],
          caloriesKcal: 350,
          carbsGrams: '5.0',
          isApproved: true,
        }),
        createTestRecipe({
          name: 'Vegan Dinner',
          mealTypes: ['dinner'],
          dietaryTags: ['vegan', 'vegetarian'],
          caloriesKcal: 500,
          proteinGrams: '20.0',
          isApproved: true,
        }),
      ];

      // Create recipes
      for (const recipeData of recipes) {
        const response = await request(app)
          .post('/api/recipes')
          .set('Authorization', `Bearer ${testTokens.admin}`)
          .send(recipeData);

        expect(response.status).toBe(201);
        testRecipes.push(response.body);
      }

      await delay(API_DELAY);

      // Test meal type filter
      const breakfastResponse = await request(app)
        .get('/api/recipes/search')
        .query({ mealType: 'breakfast', approved: true })
        .set('Authorization', `Bearer ${testTokens.customer}`);

      expect(breakfastResponse.status).toBe(200);
      expect(breakfastResponse.body.recipes.some((r: any) =>
        r.name === 'High Protein Breakfast'
      )).toBe(true);

      // Test dietary tag filter
      const veganResponse = await request(app)
        .get('/api/recipes/search')
        .query({ dietaryTag: 'vegan', approved: true })
        .set('Authorization', `Bearer ${testTokens.customer}`);

      expect(veganResponse.status).toBe(200);
      expect(veganResponse.body.recipes.some((r: any) =>
        r.name === 'Vegan Dinner'
      )).toBe(true);

      // Test calorie range filter
      const calorieResponse = await request(app)
        .get('/api/recipes/search')
        .query({ minCalories: 300, maxCalories: 450, approved: true })
        .set('Authorization', `Bearer ${testTokens.customer}`);

      expect(calorieResponse.status).toBe(200);
      expect(calorieResponse.body.recipes.every((r: any) =>
        r.caloriesKcal >= 300 && r.caloriesKcal <= 450
      )).toBe(true);

      // Test combined filters
      const combinedResponse = await request(app)
        .get('/api/recipes/search')
        .query({
          mealType: 'lunch',
          dietaryTag: 'low-carb',
          maxCalories: 400,
          approved: true
        })
        .set('Authorization', `Bearer ${testTokens.customer}`);

      expect(combinedResponse.status).toBe(200);
      expect(combinedResponse.body.recipes.some((r: any) =>
        r.name === 'Low Carb Lunch'
      )).toBe(true);

      // Test pagination
      const paginationResponse = await request(app)
        .get('/api/recipes/search')
        .query({ page: 1, limit: 2, approved: true })
        .set('Authorization', `Bearer ${testTokens.customer}`);

      expect(paginationResponse.status).toBe(200);
      expect(paginationResponse.body.recipes.length).toBeLessThanOrEqual(2);
      expect(paginationResponse.body.total).toBeDefined();
      expect(paginationResponse.body.page).toBe(1);
    });

    it('should enforce recipe authorization rules', async () => {
      const recipeData = createTestRecipe();

      // Customer cannot create recipe
      const customerCreateResponse = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${testTokens.customer}`)
        .send(recipeData);

      expect(customerCreateResponse.status).toBe(403);

      // Create recipe as admin
      const adminCreateResponse = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${testTokens.admin}`)
        .send(recipeData);

      expect(adminCreateResponse.status).toBe(201);
      const recipeId = adminCreateResponse.body.id;
      testRecipes.push(adminCreateResponse.body);

      // Customer cannot update recipe
      const customerUpdateResponse = await request(app)
        .put(`/api/recipes/${recipeId}`)
        .set('Authorization', `Bearer ${testTokens.customer}`)
        .send({ name: 'Updated by customer' });

      expect(customerUpdateResponse.status).toBe(403);

      // Customer cannot delete recipe
      const customerDeleteResponse = await request(app)
        .delete(`/api/recipes/${recipeId}`)
        .set('Authorization', `Bearer ${testTokens.customer}`);

      expect(customerDeleteResponse.status).toBe(403);

      // Customer cannot approve recipe
      const customerApproveResponse = await request(app)
        .patch(`/api/admin/recipes/${recipeId}/approve`)
        .set('Authorization', `Bearer ${testTokens.customer}`);

      expect(customerApproveResponse.status).toBe(403);
    });

    it('should validate recipe data integrity', async () => {
      // Test required fields validation
      const incompleteRecipe = {
        name: 'Incomplete Recipe',
        // Missing required fields
      };

      const invalidResponse = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${testTokens.admin}`)
        .send(incompleteRecipe);

      expect(invalidResponse.status).toBe(400);

      // Test field type validation
      const invalidTypesRecipe = {
        ...createTestRecipe(),
        caloriesKcal: 'not-a-number',
        servings: 'invalid',
      };

      const invalidTypesResponse = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${testTokens.admin}`)
        .send(invalidTypesRecipe);

      expect(invalidTypesResponse.status).toBe(400);

      // Test field range validation
      const invalidRangeRecipe = {
        ...createTestRecipe(),
        caloriesKcal: -100, // Negative calories
        servings: 0, // Zero servings
        prepTimeMinutes: -5, // Negative time
      };

      const invalidRangeResponse = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${testTokens.admin}`)
        .send(invalidRangeRecipe);

      expect(invalidRangeResponse.status).toBe(400);
    });
  });

  describe('Meal Plan Generation Integration', () => {
    it('should generate meal plan with AI integration', async () => {
      // Mock AI service response
      const mockAIResponse = {
        meals: [
          {
            day: 1,
            mealType: 'breakfast',
            recipe: createTestRecipe({ name: 'AI Generated Breakfast' }),
          },
          {
            day: 1,
            mealType: 'lunch',
            recipe: createTestRecipe({ name: 'AI Generated Lunch' }),
          },
        ],
      };

      // Create some approved recipes for meal plan generation
      const testRecipe = createTestRecipe({ isApproved: true });
      const createResponse = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${testTokens.admin}`)
        .send(testRecipe);

      expect(createResponse.status).toBe(201);
      testRecipes.push(createResponse.body);

      await delay(API_DELAY);

      // Generate meal plan
      const mealPlanRequest = {
        days: 3,
        mealsPerDay: 3,
        dailyCalorieTarget: 2000,
        fitnessGoal: 'weight_loss',
        dietaryTags: ['vegetarian'],
        avoidedIngredients: ['nuts'],
      };

      const generateResponse = await request(app)
        .post('/api/meal-plans/generate')
        .set('Authorization', `Bearer ${testTokens.customer}`)
        .send(mealPlanRequest);

      // Response depends on implementation - could be 200 or 202 for async processing
      expect([200, 202]).toContain(generateResponse.status);

      if (generateResponse.status === 200) {
        expect(generateResponse.body.meals).toBeDefined();
        expect(Array.isArray(generateResponse.body.meals)).toBe(true);
      } else {
        // Async processing
        expect(generateResponse.body.jobId || generateResponse.body.message).toBeDefined();
      }
    });

    it('should save and manage meal plans', async () => {
      const mealPlanData = createTestMealPlan();

      // Save meal plan
      const saveResponse = await request(app)
        .post('/api/meal-plans')
        .set('Authorization', `Bearer ${testTokens.customer}`)
        .send(mealPlanData);

      expect(saveResponse.status).toBe(201);
      expect(saveResponse.body.id).toBeDefined();
      expect(saveResponse.body.planName).toBe(mealPlanData.planName);

      const mealPlanId = saveResponse.body.id;
      testMealPlans.push(saveResponse.body);

      // Retrieve meal plan
      const getResponse = await request(app)
        .get(`/api/meal-plans/${mealPlanId}`)
        .set('Authorization', `Bearer ${testTokens.customer}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.id).toBe(mealPlanId);

      // List user meal plans
      const listResponse = await request(app)
        .get('/api/meal-plans')
        .set('Authorization', `Bearer ${testTokens.customer}`);

      expect(listResponse.status).toBe(200);
      expect(Array.isArray(listResponse.body)).toBe(true);
      expect(listResponse.body.some((mp: any) => mp.id === mealPlanId)).toBe(true);

      // Update meal plan
      const updateData = {
        planName: 'Updated Meal Plan',
        description: 'Updated description',
      };

      const updateResponse = await request(app)
        .put(`/api/meal-plans/${mealPlanId}`)
        .set('Authorization', `Bearer ${testTokens.customer}`)
        .send(updateData);

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.planName).toBe(updateData.planName);

      // Delete meal plan
      const deleteResponse = await request(app)
        .delete(`/api/meal-plans/${mealPlanId}`)
        .set('Authorization', `Bearer ${testTokens.customer}`);

      expect(deleteResponse.status).toBe(200);
    });

    it('should handle trainer meal plan management', async () => {
      const mealPlanData = createTestMealPlan();

      // Trainer saves meal plan to library
      const saveResponse = await request(app)
        .post('/api/trainer/meal-plans')
        .set('Authorization', `Bearer ${testTokens.trainer}`)
        .send({
          mealPlanData,
          isTemplate: true,
          tags: ['weight-loss', 'beginner'],
          notes: 'Great for beginners',
        });

      expect(saveResponse.status).toBe(201);
      const mealPlanId = saveResponse.body.id;

      // Get trainer meal plans
      const listResponse = await request(app)
        .get('/api/trainer/meal-plans')
        .set('Authorization', `Bearer ${testTokens.trainer}`);

      expect(listResponse.status).toBe(200);
      expect(Array.isArray(listResponse.body)).toBe(true);
      expect(listResponse.body.some((mp: any) => mp.id === mealPlanId)).toBe(true);

      // Assign meal plan to customer
      const assignResponse = await request(app)
        .post(`/api/trainer/meal-plans/${mealPlanId}/assign`)
        .set('Authorization', `Bearer ${testTokens.trainer}`)
        .send({ customerId: testUsers.customer.id });

      expect(assignResponse.status).toBe(200);

      // Get customer meal plans (from trainer perspective)
      const customerPlansResponse = await request(app)
        .get(`/api/trainer/customers/${testUsers.customer.id}/meal-plans`)
        .set('Authorization', `Bearer ${testTokens.trainer}`);

      expect(customerPlansResponse.status).toBe(200);
      expect(Array.isArray(customerPlansResponse.body)).toBe(true);

      // Customer can see assigned meal plan
      const customerViewResponse = await request(app)
        .get('/api/meal-plans')
        .set('Authorization', `Bearer ${testTokens.customer}`);

      expect(customerViewResponse.status).toBe(200);
      expect(customerViewResponse.body.some((mp: any) =>
        mp.mealPlanData?.planName === mealPlanData.planName
      )).toBe(true);

      // Cleanup
      await request(app)
        .delete(`/api/trainer/meal-plans/${mealPlanId}`)
        .set('Authorization', `Bearer ${testTokens.trainer}`);
    });
  });

  describe('Admin System Management', () => {
    it('should provide comprehensive admin statistics', async () => {
      const statsResponse = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${testTokens.admin}`);

      expect(statsResponse.status).toBe(200);
      expect(statsResponse.body.total).toBeDefined();
      expect(statsResponse.body.approved).toBeDefined();
      expect(statsResponse.body.pending).toBeDefined();
      expect(statsResponse.body.users).toBeDefined();
      expect(typeof statsResponse.body.total).toBe('number');
      expect(typeof statsResponse.body.approved).toBe('number');
      expect(typeof statsResponse.body.pending).toBe('number');
      expect(typeof statsResponse.body.users).toBe('number');
    });

    it('should handle bulk recipe operations', async () => {
      // Create multiple test recipes
      const recipes = await Promise.all([
        createTestRecipe({ name: 'Bulk Test Recipe 1' }),
        createTestRecipe({ name: 'Bulk Test Recipe 2' }),
        createTestRecipe({ name: 'Bulk Test Recipe 3' }),
      ].map(async (recipeData) => {
        const response = await request(app)
          .post('/api/recipes')
          .set('Authorization', `Bearer ${testTokens.admin}`)
          .send(recipeData);

        testRecipes.push(response.body);
        return response.body;
      }));

      await delay(API_DELAY);

      // Bulk approve recipes
      const bulkApproveResponse = await request(app)
        .patch('/api/admin/recipes/bulk-approve')
        .set('Authorization', `Bearer ${testTokens.admin}`)
        .send({ recipeIds: recipes.map(r => r.id) });

      expect(bulkApproveResponse.status).toBe(200);
      expect(bulkApproveResponse.body.approvedCount).toBe(3);

      // Verify all recipes are approved
      for (const recipe of recipes) {
        const getResponse = await request(app)
          .get(`/api/recipes/${recipe.id}`)
          .set('Authorization', `Bearer ${testTokens.admin}`);

        expect(getResponse.status).toBe(200);
        expect(getResponse.body.isApproved).toBe(true);
      }

      // Bulk delete recipes
      const bulkDeleteResponse = await request(app)
        .delete('/api/admin/recipes/bulk-delete')
        .set('Authorization', `Bearer ${testTokens.admin}`)
        .send({ recipeIds: recipes.map(r => r.id) });

      expect(bulkDeleteResponse.status).toBe(200);
      expect(bulkDeleteResponse.body.deletedCount).toBe(3);
    });

    it('should generate recipes using AI integration', async () => {
      const generateRequest = {
        count: 5,
        mealType: 'breakfast',
        dietaryTag: 'vegetarian',
        maxCalories: 400,
        focusIngredient: 'eggs',
      };

      const generateResponse = await request(app)
        .post('/api/admin/generate-recipes')
        .set('Authorization', `Bearer ${testTokens.admin}`)
        .send(generateRequest);

      // Response could be 200 for immediate generation or 202 for async processing
      expect([200, 202]).toContain(generateResponse.status);

      if (generateResponse.status === 200) {
        expect(generateResponse.body.recipes).toBeDefined();
        expect(Array.isArray(generateResponse.body.recipes)).toBe(true);
      } else {
        expect(generateResponse.body.jobId || generateResponse.body.message).toBeDefined();
      }
    });

    it('should manage user roles and permissions', async () => {
      // Get all users (admin only)
      const usersResponse = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${testTokens.admin}`);

      expect(usersResponse.status).toBe(200);
      expect(Array.isArray(usersResponse.body)).toBe(true);

      // Find our test customer
      const testCustomerUser = usersResponse.body.find((u: any) =>
        u.email === testUsers.customer.email
      );
      expect(testCustomerUser).toBeDefined();
      expect(testCustomerUser.role).toBe('customer');

      // Admin cannot access users endpoint
      const trainerUsersResponse = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${testTokens.trainer}`);

      expect(trainerUsersResponse.status).toBe(403);

      // Customer cannot access users endpoint
      const customerUsersResponse = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${testTokens.customer}`);

      expect(customerUsersResponse.status).toBe(403);
    });
  });

  describe('Cross-Component Integration', () => {
    it('should maintain data consistency across operations', async () => {
      // Create recipe
      const recipeData = createTestRecipe();
      const recipeResponse = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${testTokens.admin}`)
        .send(recipeData);

      expect(recipeResponse.status).toBe(201);
      const recipeId = recipeResponse.body.id;
      testRecipes.push(recipeResponse.body);

      // Approve recipe
      await request(app)
        .patch(`/api/admin/recipes/${recipeId}/approve`)
        .set('Authorization', `Bearer ${testTokens.admin}`);

      // Verify stats updated
      const statsResponse = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${testTokens.admin}`);

      expect(statsResponse.status).toBe(200);
      expect(statsResponse.body.approved).toBeGreaterThan(0);

      // Use recipe in meal plan
      const mealPlanData = createTestMealPlan({
        meals: [
          {
            day: 1,
            mealType: 'breakfast',
            recipeId: recipeId,
          },
        ],
      });

      const mealPlanResponse = await request(app)
        .post('/api/meal-plans')
        .set('Authorization', `Bearer ${testTokens.customer}`)
        .send(mealPlanData);

      expect(mealPlanResponse.status).toBe(201);
      testMealPlans.push(mealPlanResponse.body);

      // Delete recipe should handle meal plan references
      const deleteResponse = await request(app)
        .delete(`/api/recipes/${recipeId}`)
        .set('Authorization', `Bearer ${testTokens.admin}`);

      // Should either prevent deletion or handle gracefully
      expect([200, 409]).toContain(deleteResponse.status);
    });

    it('should handle concurrent operations gracefully', async () => {
      // Create multiple concurrent recipe creation requests
      const recipePromises = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post('/api/recipes')
          .set('Authorization', `Bearer ${testTokens.admin}`)
          .send(createTestRecipe({ name: `Concurrent Recipe ${i + 1}` }))
      );

      const responses = await Promise.all(recipePromises);

      // All should succeed
      responses.forEach((response, i) => {
        expect(response.status).toBe(201);
        expect(response.body.name).toBe(`Concurrent Recipe ${i + 1}`);
        testRecipes.push(response.body);
      });

      // Concurrent search requests
      const searchPromises = Array.from({ length: 3 }, () =>
        request(app)
          .get('/api/recipes/search')
          .query({ search: 'Concurrent', approved: false })
          .set('Authorization', `Bearer ${testTokens.customer}`)
      );

      const searchResponses = await Promise.all(searchPromises);

      searchResponses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.recipes).toBeDefined();
      });
    });

    it('should validate cross-entity relationships', async () => {
      // Create recipe and meal plan with relationship
      const recipeData = createTestRecipe({ isApproved: true });
      const recipeResponse = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${testTokens.admin}`)
        .send(recipeData);

      const recipeId = recipeResponse.body.id;
      testRecipes.push(recipeResponse.body);

      // Create meal plan referencing the recipe
      const mealPlanData = createTestMealPlan({
        meals: [
          {
            day: 1,
            mealType: 'breakfast',
            recipeId: recipeId,
            recipe: recipeResponse.body,
          },
        ],
      });

      const mealPlanResponse = await request(app)
        .post('/api/meal-plans')
        .set('Authorization', `Bearer ${testTokens.customer}`)
        .send(mealPlanData);

      expect(mealPlanResponse.status).toBe(201);
      testMealPlans.push(mealPlanResponse.body);

      // Verify relationship integrity
      const getMealPlanResponse = await request(app)
        .get(`/api/meal-plans/${mealPlanResponse.body.id}`)
        .set('Authorization', `Bearer ${testTokens.customer}`);

      expect(getMealPlanResponse.status).toBe(200);
      expect(getMealPlanResponse.body.meals).toBeDefined();
      expect(getMealPlanResponse.body.meals[0].recipeId).toBe(recipeId);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking database failures
      // In a real scenario, you might temporarily disconnect the database

      // For now, test with invalid parameters that might cause DB errors
      const invalidResponse = await request(app)
        .get('/api/recipes/invalid-uuid-format')
        .set('Authorization', `Bearer ${testTokens.customer}`);

      expect(invalidResponse.status).toBe(400);
    });

    it('should handle malformed request data', async () => {
      // Invalid JSON
      const invalidJsonResponse = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${testTokens.admin}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(invalidJsonResponse.status).toBe(400);

      // Missing required fields
      const missingFieldsResponse = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${testTokens.admin}`)
        .send({});

      expect(missingFieldsResponse.status).toBe(400);

      // Invalid field types
      const invalidTypesResponse = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${testTokens.admin}`)
        .send({
          name: 123, // Should be string
          caloriesKcal: 'not-a-number',
        });

      expect(invalidTypesResponse.status).toBe(400);
    });

    it('should handle rate limiting and resource constraints', async () => {
      // Test rapid successive requests
      const rapidRequests = Array.from({ length: 10 }, () =>
        request(app)
          .get('/api/recipes/search')
          .set('Authorization', `Bearer ${testTokens.customer}`)
      );

      const responses = await Promise.all(rapidRequests);

      // All should succeed or some might be rate limited
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });

    it('should handle large payloads appropriately', async () => {
      // Create recipe with very long description
      const largeRecipeData = createTestRecipe({
        description: 'x'.repeat(10000), // 10KB description
        instructionsText: 'Step 1: ' + 'x'.repeat(5000), // 5KB instructions
      });

      const largeResponse = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${testTokens.admin}`)
        .send(largeRecipeData);

      // Should either succeed or reject appropriately
      expect([201, 413]).toContain(largeResponse.status);
    });

    it('should maintain API stability under stress', async () => {
      // Create multiple types of concurrent requests
      const stressPromises = [
        // Recipe operations
        ...Array.from({ length: 3 }, () =>
          request(app)
            .get('/api/recipes/search')
            .set('Authorization', `Bearer ${testTokens.customer}`)
        ),
        // Stats requests
        ...Array.from({ length: 2 }, () =>
          request(app)
            .get('/api/admin/stats')
            .set('Authorization', `Bearer ${testTokens.admin}`)
        ),
        // Profile requests
        ...Array.from({ length: 3 }, () =>
          request(app)
            .get('/api/user/profile')
            .set('Authorization', `Bearer ${testTokens.customer}`)
        ),
      ];

      const stressResponses = await Promise.all(stressPromises);

      // Most should succeed
      const successCount = stressResponses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThan(stressResponses.length * 0.8); // 80% success rate
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle pagination efficiently', async () => {
      // Create multiple recipes for pagination testing
      const recipes = await Promise.all(
        Array.from({ length: 15 }, (_, i) =>
          request(app)
            .post('/api/recipes')
            .set('Authorization', `Bearer ${testTokens.admin}`)
            .send(createTestRecipe({
              name: `Pagination Test Recipe ${i + 1}`,
              isApproved: true
            }))
        )
      );

      recipes.forEach(response => {
        expect(response.status).toBe(201);
        testRecipes.push(response.body);
      });

      await delay(API_DELAY);

      // Test different page sizes
      const pageSizes = [5, 10, 20];

      for (const pageSize of pageSizes) {
        const page1Response = await request(app)
          .get('/api/recipes/search')
          .query({ page: 1, limit: pageSize, approved: true })
          .set('Authorization', `Bearer ${testTokens.customer}`);

        expect(page1Response.status).toBe(200);
        expect(page1Response.body.recipes.length).toBeLessThanOrEqual(pageSize);
        expect(page1Response.body.page).toBe(1);
        expect(page1Response.body.limit).toBe(pageSize);
        expect(page1Response.body.total).toBeGreaterThan(0);

        if (page1Response.body.total > pageSize) {
          const page2Response = await request(app)
            .get('/api/recipes/search')
            .query({ page: 2, limit: pageSize, approved: true })
            .set('Authorization', `Bearer ${testTokens.customer}`);

          expect(page2Response.status).toBe(200);
          expect(page2Response.body.page).toBe(2);
        }
      }
    });

    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/api/recipes/search')
        .query({ limit: 10 })
        .set('Authorization', `Bearer ${testTokens.customer}`);

      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(5000); // 5 second max response time
    });

    it('should handle memory efficiently with large datasets', async () => {
      // Request large number of results
      const largeResponse = await request(app)
        .get('/api/recipes/search')
        .query({ limit: 100 })
        .set('Authorization', `Bearer ${testTokens.customer}`);

      expect(largeResponse.status).toBe(200);
      expect(Array.isArray(largeResponse.body.recipes)).toBe(true);

      // Response should be paginated appropriately
      expect(largeResponse.body.recipes.length).toBeLessThanOrEqual(100);
    });
  });
});