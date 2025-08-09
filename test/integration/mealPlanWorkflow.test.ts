/**
 * Meal Plan Workflow Integration Tests
 * 
 * End-to-end integration tests for complete meal planning workflows:
 * - Full meal plan generation workflow (trainer creates, customer views)
 * - Recipe browsing and selection
 * - PDF export and download
 * - Multi-user interactions
 * - Real database operations
 * - API integration with OpenAI service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../test-setup';
import { setupTestDatabase, cleanupTestDatabase, createTestUsers } from '../helpers/database-helpers';
import { mockOpenAIResponses } from '../helpers/openai-mocks';

describe('Meal Plan Workflow Integration', () => {
  let app: any;
  let testUsers: any;
  let trainerToken: string;
  let customerToken: string;

  beforeEach(async () => {
    app = await createTestApp();
    await setupTestDatabase();
    
    // Create test users and get authentication tokens
    testUsers = await createTestUsers();
    trainerToken = testUsers.trainer.accessToken;
    customerToken = testUsers.customer.accessToken;
    
    // Mock OpenAI service
    mockOpenAIResponses();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
    vi.clearAllMocks();
  });

  describe('Complete Meal Plan Generation Workflow', () => {
    it('should allow trainer to generate and assign meal plan to customer', async () => {
      const mealPlanRequest = {
        name: 'Weight Loss Plan for Customer',
        days: 7,
        mealsPerDay: 3,
        targetCalories: 1800,
        targetProtein: 135,
        targetCarbs: 180,
        targetFat: 60,
        dietaryTags: ['vegetarian', 'gluten-free'],
        mealTypes: ['breakfast', 'lunch', 'dinner'],
        activityLevel: 'moderately_active',
        fitnessGoal: 'weight_loss',
        customerEmail: testUsers.customer.email,
      };

      // 1. Trainer generates meal plan
      const generateResponse = await request(app)
        .post('/api/meal-plans/generate')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send(mealPlanRequest)
        .expect(200);

      expect(generateResponse.body.mealPlan).toBeDefined();
      expect(generateResponse.body.mealPlan.name).toBe(mealPlanRequest.name);
      expect(generateResponse.body.nutrition).toBeDefined();

      const mealPlanId = generateResponse.body.mealPlan.id;

      // 2. Trainer assigns meal plan to customer
      const assignResponse = await request(app)
        .post(`/api/meal-plans/${mealPlanId}/assign`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ customerEmail: testUsers.customer.email })
        .expect(200);

      expect(assignResponse.body.message).toBe('Meal plan assigned successfully');

      // 3. Customer views assigned meal plans
      const customerMealPlansResponse = await request(app)
        .get('/api/customers/meal-plans')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(customerMealPlansResponse.body.mealPlans).toHaveLength(1);
      expect(customerMealPlansResponse.body.mealPlans[0].id).toBe(mealPlanId);

      // 4. Customer views detailed meal plan
      const detailResponse = await request(app)
        .get(`/api/meal-plans/${mealPlanId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(detailResponse.body.meals).toBeDefined();
      expect(detailResponse.body.meals.length).toBeGreaterThan(0);
    });

    it('should handle meal plan modification workflow', async () => {
      // 1. Generate initial meal plan
      const initialRequest = {
        name: 'Initial Plan',
        days: 5,
        mealsPerDay: 3,
        targetCalories: 2000,
        targetProtein: 150,
      };

      const createResponse = await request(app)
        .post('/api/meal-plans/generate')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send(initialRequest)
        .expect(200);

      const mealPlanId = createResponse.body.mealPlan.id;

      // 2. Trainer modifies the meal plan
      const updateData = {
        name: 'Updated Meal Plan',
        targetCalories: 2200,
        targetProtein: 165,
      };

      const updateResponse = await request(app)
        .put(`/api/meal-plans/${mealPlanId}`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.name).toBe(updateData.name);
      expect(updateResponse.body.targetCalories).toBe(updateData.targetCalories);

      // 3. Verify changes are persisted
      const getResponse = await request(app)
        .get(`/api/meal-plans/${mealPlanId}`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(200);

      expect(getResponse.body.name).toBe(updateData.name);
      expect(getResponse.body.targetCalories).toBe(updateData.targetCalories);
    });
  });

  describe('Recipe Discovery and Selection Workflow', () => {
    it('should allow browsing and filtering recipes for meal plans', async () => {
      // 1. Browse public recipes
      const recipesResponse = await request(app)
        .get('/api/recipes')
        .query({ 
          page: 1, 
          limit: 10,
          search: 'chicken' 
        })
        .expect(200);

      expect(recipesResponse.body.recipes).toBeDefined();
      expect(recipesResponse.body.total).toBeGreaterThanOrEqual(0);

      if (recipesResponse.body.recipes.length > 0) {
        const recipeId = recipesResponse.body.recipes[0].id;

        // 2. View detailed recipe information
        const recipeDetailResponse = await request(app)
          .get(`/api/recipes/${recipeId}`)
          .expect(200);

        expect(recipeDetailResponse.body.name).toBeDefined();
        expect(recipeDetailResponse.body.ingredients).toBeDefined();
        expect(recipeDetailResponse.body.instructions).toBeDefined();
      }
    });

    it('should support personalized recipe access for authenticated users', async () => {
      // 1. Access personalized recipes as trainer
      const personalizedResponse = await request(app)
        .get('/api/recipes/personalized')
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(200);

      expect(personalizedResponse.body.recipes).toBeDefined();

      // 2. Generate custom meal plan using personalized recipes
      const customMealPlanRequest = {
        name: 'Custom Recipe Plan',
        days: 3,
        mealsPerDay: 2,
        targetCalories: 1600,
        usePersonalizedRecipes: true,
      };

      const customPlanResponse = await request(app)
        .post('/api/meal-plans/generate')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send(customMealPlanRequest)
        .expect(200);

      expect(customPlanResponse.body.mealPlan).toBeDefined();
    });
  });

  describe('PDF Export Integration Workflow', () => {
    it('should generate and download PDF for meal plan', async () => {
      // 1. Create meal plan
      const mealPlanRequest = {
        name: 'PDF Export Test Plan',
        days: 3,
        mealsPerDay: 2,
        targetCalories: 1500,
      };

      const createResponse = await request(app)
        .post('/api/meal-plans/generate')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send(mealPlanRequest)
        .expect(200);

      const mealPlanId = createResponse.body.mealPlan.id;

      // 2. Request PDF export
      const pdfResponse = await request(app)
        .post(`/api/pdf/export/meal-plan/${mealPlanId}`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(200);

      expect(pdfResponse.body.success).toBe(true);
      expect(pdfResponse.body.pdfUrl).toBeDefined();

      // 3. Download the PDF
      const downloadResponse = await request(app)
        .get(pdfResponse.body.pdfUrl.replace('http://localhost:3000', ''))
        .expect(200);

      expect(downloadResponse.headers['content-type']).toContain('application/pdf');
      expect(downloadResponse.body).toBeDefined();
    });

    it('should handle PDF export errors gracefully', async () => {
      const nonExistentMealPlanId = 'non-existent-id';

      const pdfResponse = await request(app)
        .post(`/api/pdf/export/meal-plan/${nonExistentMealPlanId}`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(404);

      expect(pdfResponse.body.error).toBe('Meal plan not found');
    });
  });

  describe('Multi-User Collaboration Workflow', () => {
    it('should support trainer-customer meal plan collaboration', async () => {
      // 1. Trainer creates meal plan
      const mealPlanRequest = {
        name: 'Collaboration Test Plan',
        days: 7,
        mealsPerDay: 3,
        targetCalories: 1900,
      };

      const createResponse = await request(app)
        .post('/api/meal-plans/generate')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send(mealPlanRequest)
        .expect(200);

      const mealPlanId = createResponse.body.mealPlan.id;

      // 2. Assign to customer
      await request(app)
        .post(`/api/meal-plans/${mealPlanId}/assign`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ customerEmail: testUsers.customer.email })
        .expect(200);

      // 3. Customer provides feedback
      const feedbackData = {
        rating: 4,
        comments: 'Great plan, but need more variety in breakfast options',
        preferredMealTypes: ['breakfast', 'lunch'],
      };

      const feedbackResponse = await request(app)
        .post(`/api/meal-plans/${mealPlanId}/feedback`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send(feedbackData)
        .expect(200);

      expect(feedbackResponse.body.message).toBe('Feedback submitted successfully');

      // 4. Trainer views customer feedback
      const feedbackViewResponse = await request(app)
        .get(`/api/meal-plans/${mealPlanId}/feedback`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(200);

      expect(feedbackViewResponse.body.feedback).toBeDefined();
      expect(feedbackViewResponse.body.feedback.rating).toBe(4);
    });

    it('should handle multiple customer assignments', async () => {
      // Create additional customer for testing
      const additionalCustomer = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'customer2@test.com',
          password: 'SecurePass123!',
          name: 'Customer Two',
          role: 'customer',
        })
        .expect(201);

      const customer2Token = additionalCustomer.body.accessToken;

      // 1. Create meal plan
      const mealPlanRequest = {
        name: 'Multi-Customer Plan',
        days: 5,
        mealsPerDay: 3,
        targetCalories: 2000,
      };

      const createResponse = await request(app)
        .post('/api/meal-plans/generate')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send(mealPlanRequest)
        .expect(200);

      const mealPlanId = createResponse.body.mealPlan.id;

      // 2. Assign to multiple customers
      await request(app)
        .post(`/api/meal-plans/${mealPlanId}/assign`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ customerEmail: testUsers.customer.email })
        .expect(200);

      await request(app)
        .post(`/api/meal-plans/${mealPlanId}/assign`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ customerEmail: 'customer2@test.com' })
        .expect(200);

      // 3. Verify both customers can access the meal plan
      const customer1Response = await request(app)
        .get(`/api/meal-plans/${mealPlanId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      const customer2Response = await request(app)
        .get(`/api/meal-plans/${mealPlanId}`)
        .set('Authorization', `Bearer ${customer2Token}`)
        .expect(200);

      expect(customer1Response.body.id).toBe(mealPlanId);
      expect(customer2Response.body.id).toBe(mealPlanId);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle authentication failures gracefully', async () => {
      const invalidToken = 'invalid-jwt-token';

      const response = await request(app)
        .post('/api/meal-plans/generate')
        .set('Authorization', `Bearer ${invalidToken}`)
        .send({
          name: 'Test Plan',
          days: 7,
          mealsPerDay: 3,
          targetCalories: 2000,
        })
        .expect(401);

      expect(response.body.error).toContain('authentication');
    });

    it('should handle authorization failures for cross-user access', async () => {
      // 1. Trainer creates meal plan
      const createResponse = await request(app)
        .post('/api/meal-plans/generate')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({
          name: 'Private Plan',
          days: 5,
          mealsPerDay: 3,
          targetCalories: 1800,
        })
        .expect(200);

      const mealPlanId = createResponse.body.mealPlan.id;

      // 2. Different customer tries to access (should fail)
      const unauthorizedResponse = await request(app)
        .get(`/api/meal-plans/${mealPlanId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(unauthorizedResponse.body.error).toContain('access');
    });

    it('should handle OpenAI service failures with fallback', async () => {
      // Mock OpenAI service failure
      vi.mocked(require('../../../server/services/openai').generateMealPlan)
        .mockRejectedValueOnce(new Error('OpenAI service unavailable'));

      const mealPlanRequest = {
        name: 'Fallback Test Plan',
        days: 3,
        mealsPerDay: 3,
        targetCalories: 1800,
      };

      const response = await request(app)
        .post('/api/meal-plans/generate')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send(mealPlanRequest)
        .expect(500);

      expect(response.body.error).toBe('Failed to generate meal plan');
    });

    it('should handle database connectivity issues', async () => {
      // This test would require mocking database disconnection
      // Implementation depends on specific database setup
      
      // Mock database connection failure
      const originalMethod = require('../../../server/storage').storage.saveMealPlan;
      vi.mocked(originalMethod).mockRejectedValueOnce(
        new Error('Database connection lost')
      );

      const mealPlanRequest = {
        name: 'DB Error Test',
        days: 3,
        mealsPerDay: 2,
        targetCalories: 1600,
      };

      const response = await request(app)
        .post('/api/meal-plans/generate')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send(mealPlanRequest)
        .expect(500);

      expect(response.body.error).toBe('Failed to save meal plan');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent meal plan generation requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post('/api/meal-plans/generate')
          .set('Authorization', `Bearer ${trainerToken}`)
          .send({
            name: `Concurrent Plan ${i}`,
            days: 3,
            mealsPerDay: 2,
            targetCalories: 1500 + (i * 100),
          })
      );

      const responses = await Promise.all(requests);

      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.mealPlan.name).toBe(`Concurrent Plan ${index}`);
      });
    });

    it('should handle large meal plans efficiently', async () => {
      const largeMealPlanRequest = {
        name: 'Large Meal Plan Test',
        days: 30,
        mealsPerDay: 6,
        targetCalories: 2500,
      };

      const startTime = Date.now();

      const response = await request(app)
        .post('/api/meal-plans/generate')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send(largeMealPlanRequest)
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body.mealPlan).toBeDefined();
      expect(response.body.mealPlan.meals.length).toBe(180); // 30 days * 6 meals
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
});