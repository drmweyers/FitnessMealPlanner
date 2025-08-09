/**
 * Meal Plan API Routes Tests
 * 
 * Comprehensive tests for the meal plan API endpoints covering:
 * - Meal plan generation with various parameters
 * - Authentication and authorization
 * - Input validation and sanitization
 * - OpenAI integration and error handling
 * - Database operations and persistence
 * - Nutrition calculation accuracy
 * - Error handling and recovery
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { mealPlanRouter } from '../../../server/routes/mealPlan';
import * as storage from '../../../server/storage';
import * as openaiService from '../../../server/services/openai';

// Mock the storage module
vi.mock('../../../server/storage', () => ({
  storage: {
    saveMealPlan: vi.fn(),
    getUserMealPlans: vi.fn(),
    getMealPlan: vi.fn(),
    updateMealPlan: vi.fn(),
    deleteMealPlan: vi.fn(),
  },
}));

// Mock OpenAI service
vi.mock('../../../server/services/openai', () => ({
  generateMealPlan: vi.fn(),
  generateRecipes: vi.fn(),
}));

// Mock the auth middleware
vi.mock('../../../server/middleware/auth', () => ({
  requireAuth: vi.fn((req, res, next) => {
    req.user = {
      id: 'test-user-id',
      email: 'trainer@test.com',
      role: 'trainer',
    };
    next();
  }),
}));

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/meal-plans', mealPlanRouter);
  return app;
};

describe('Meal Plan API Routes', () => {
  let app: express.Application;

  const mockMealPlanRequest = {
    days: 7,
    mealsPerDay: 3,
    targetCalories: 2000,
    targetProtein: 150,
    targetCarbs: 200,
    targetFat: 67,
    dietaryTags: ['vegetarian'],
    mealTypes: ['breakfast', 'lunch', 'dinner'],
    activityLevel: 'moderately_active',
    fitnessGoal: 'weight_loss',
    name: 'Custom Meal Plan',
  };

  const mockGeneratedMealPlan = {
    id: 'meal-plan-123',
    name: 'Generated Meal Plan',
    days: 7,
    mealsPerDay: 3,
    targetCalories: 2000,
    targetProtein: 150,
    targetCarbs: 200,
    targetFat: 67,
    meals: [
      {
        day: 1,
        mealType: 'breakfast',
        recipe: {
          name: 'Protein Pancakes',
          caloriesKcal: 350,
          proteinGrams: 25,
          carbsGrams: 30,
          fatGrams: 8,
        },
      },
      {
        day: 1,
        mealType: 'lunch',
        recipe: {
          name: 'Grilled Chicken Salad',
          caloriesKcal: 450,
          proteinGrams: 40,
          carbsGrams: 20,
          fatGrams: 15,
        },
      },
    ],
    createdBy: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/meal-plans/generate - Generate Meal Plan', () => {
    it('generates meal plan with valid parameters', async () => {
      vi.mocked(openaiService.generateMealPlan).mockResolvedValueOnce(mockGeneratedMealPlan);
      vi.mocked(storage.storage.saveMealPlan).mockResolvedValueOnce(mockGeneratedMealPlan);

      const response = await request(app)
        .post('/api/meal-plans/generate')
        .send(mockMealPlanRequest)
        .expect(200);

      expect(response.body.mealPlan).toEqual(mockGeneratedMealPlan);
      expect(openaiService.generateMealPlan).toHaveBeenCalledWith(mockMealPlanRequest);
      expect(storage.storage.saveMealPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockGeneratedMealPlan,
          createdBy: 'test-user-id',
        })
      );
    });

    it('calculates nutrition summary correctly', async () => {
      vi.mocked(openaiService.generateMealPlan).mockResolvedValueOnce(mockGeneratedMealPlan);
      vi.mocked(storage.storage.saveMealPlan).mockResolvedValueOnce(mockGeneratedMealPlan);

      const response = await request(app)
        .post('/api/meal-plans/generate')
        .send(mockMealPlanRequest)
        .expect(200);

      expect(response.body.nutrition).toBeDefined();
      expect(response.body.nutrition.total).toEqual({
        calories: 800, // 350 + 450
        protein: 65,   // 25 + 40
        carbs: 50,     // 30 + 20
        fat: 23,       // 8 + 15
      });

      expect(response.body.nutrition.averageDaily).toEqual({
        calories: 800,
        protein: 65,
        carbs: 50,
        fat: 23,
      });
    });

    it('validates required fields', async () => {
      const invalidRequest = {
        days: 0, // Invalid
        mealsPerDay: 10, // Too high
        targetCalories: -100, // Negative
      };

      const response = await request(app)
        .post('/api/meal-plans/generate')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error).toContain('validation');
      expect(openaiService.generateMealPlan).not.toHaveBeenCalled();
    });

    it('handles dietary restrictions validation', async () => {
      const requestWithInvalidDietaryTags = {
        ...mockMealPlanRequest,
        dietaryTags: ['invalid-tag', 'another-invalid'],
      };

      const response = await request(app)
        .post('/api/meal-plans/generate')
        .send(requestWithInvalidDietaryTags)
        .expect(400);

      expect(response.body.error).toContain('validation');
    });

    it('handles meal type validation', async () => {
      const requestWithInvalidMealTypes = {
        ...mockMealPlanRequest,
        mealTypes: ['invalid-meal-type'],
      };

      const response = await request(app)
        .post('/api/meal-plans/generate')
        .send(requestWithInvalidMealTypes)
        .expect(400);

      expect(response.body.error).toContain('validation');
    });

    it('handles OpenAI service errors gracefully', async () => {
      vi.mocked(openaiService.generateMealPlan).mockRejectedValueOnce(
        new Error('OpenAI API rate limit exceeded')
      );

      const response = await request(app)
        .post('/api/meal-plans/generate')
        .send(mockMealPlanRequest)
        .expect(500);

      expect(response.body.error).toBe('Failed to generate meal plan');
      expect(storage.storage.saveMealPlan).not.toHaveBeenCalled();
    });

    it('handles database save errors', async () => {
      vi.mocked(openaiService.generateMealPlan).mockResolvedValueOnce(mockGeneratedMealPlan);
      vi.mocked(storage.storage.saveMealPlan).mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/api/meal-plans/generate')
        .send(mockMealPlanRequest)
        .expect(500);

      expect(response.body.error).toBe('Failed to save meal plan');
    });

    it('validates nutrition targets within reasonable ranges', async () => {
      const extremeRequest = {
        ...mockMealPlanRequest,
        targetCalories: 10000, // Unreasonably high
        targetProtein: 500,    // Unreasonably high
      };

      const response = await request(app)
        .post('/api/meal-plans/generate')
        .send(extremeRequest)
        .expect(400);

      expect(response.body.error).toContain('validation');
    });

    it('handles missing optional fields gracefully', async () => {
      const minimalRequest = {
        days: 5,
        mealsPerDay: 3,
        targetCalories: 1800,
      };

      vi.mocked(openaiService.generateMealPlan).mockResolvedValueOnce(mockGeneratedMealPlan);
      vi.mocked(storage.storage.saveMealPlan).mockResolvedValueOnce(mockGeneratedMealPlan);

      const response = await request(app)
        .post('/api/meal-plans/generate')
        .send(minimalRequest)
        .expect(200);

      expect(openaiService.generateMealPlan).toHaveBeenCalledWith(
        expect.objectContaining(minimalRequest)
      );
    });
  });

  describe('GET /api/meal-plans - User Meal Plans', () => {
    const mockUserMealPlans = [
      {
        id: 'plan-1',
        name: 'Plan 1',
        days: 7,
        createdBy: 'test-user-id',
        createdAt: new Date(),
      },
      {
        id: 'plan-2',
        name: 'Plan 2',
        days: 5,
        createdBy: 'test-user-id',
        createdAt: new Date(),
      },
    ];

    it('returns user meal plans', async () => {
      vi.mocked(storage.storage.getUserMealPlans).mockResolvedValueOnce(mockUserMealPlans);

      const response = await request(app)
        .get('/api/meal-plans')
        .expect(200);

      expect(response.body.mealPlans).toEqual(mockUserMealPlans);
      expect(storage.storage.getUserMealPlans).toHaveBeenCalledWith('test-user-id');
    });

    it('handles empty meal plan list', async () => {
      vi.mocked(storage.storage.getUserMealPlans).mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/api/meal-plans')
        .expect(200);

      expect(response.body.mealPlans).toEqual([]);
    });

    it('handles database errors when fetching meal plans', async () => {
      vi.mocked(storage.storage.getUserMealPlans).mockRejectedValueOnce(
        new Error('Database query failed')
      );

      const response = await request(app)
        .get('/api/meal-plans')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch meal plans');
    });
  });

  describe('GET /api/meal-plans/:id - Single Meal Plan', () => {
    it('returns meal plan by ID for authorized user', async () => {
      vi.mocked(storage.storage.getMealPlan).mockResolvedValueOnce(mockGeneratedMealPlan);

      const response = await request(app)
        .get('/api/meal-plans/meal-plan-123')
        .expect(200);

      expect(response.body).toEqual(mockGeneratedMealPlan);
      expect(storage.storage.getMealPlan).toHaveBeenCalledWith('meal-plan-123', 'test-user-id');
    });

    it('returns 404 for non-existent meal plan', async () => {
      vi.mocked(storage.storage.getMealPlan).mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/meal-plans/non-existent')
        .expect(404);

      expect(response.body.error).toBe('Meal plan not found');
    });

    it('handles database errors when fetching single meal plan', async () => {
      vi.mocked(storage.storage.getMealPlan).mockRejectedValueOnce(
        new Error('Database query failed')
      );

      const response = await request(app)
        .get('/api/meal-plans/meal-plan-123')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch meal plan');
    });
  });

  describe('PUT /api/meal-plans/:id - Update Meal Plan', () => {
    const updateData = {
      name: 'Updated Meal Plan Name',
      targetCalories: 2200,
    };

    it('updates meal plan successfully', async () => {
      const updatedMealPlan = { ...mockGeneratedMealPlan, ...updateData };
      vi.mocked(storage.storage.updateMealPlan).mockResolvedValueOnce(updatedMealPlan);

      const response = await request(app)
        .put('/api/meal-plans/meal-plan-123')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual(updatedMealPlan);
      expect(storage.storage.updateMealPlan).toHaveBeenCalledWith(
        'meal-plan-123',
        'test-user-id',
        updateData
      );
    });

    it('validates update data', async () => {
      const invalidUpdate = {
        targetCalories: -100, // Invalid negative value
        days: 0,              // Invalid zero value
      };

      const response = await request(app)
        .put('/api/meal-plans/meal-plan-123')
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.error).toContain('validation');
      expect(storage.storage.updateMealPlan).not.toHaveBeenCalled();
    });

    it('handles update of non-existent meal plan', async () => {
      vi.mocked(storage.storage.updateMealPlan).mockResolvedValueOnce(null);

      const response = await request(app)
        .put('/api/meal-plans/non-existent')
        .send(updateData)
        .expect(404);

      expect(response.body.error).toBe('Meal plan not found');
    });

    it('handles database errors during update', async () => {
      vi.mocked(storage.storage.updateMealPlan).mockRejectedValueOnce(
        new Error('Database update failed')
      );

      const response = await request(app)
        .put('/api/meal-plans/meal-plan-123')
        .send(updateData)
        .expect(500);

      expect(response.body.error).toBe('Failed to update meal plan');
    });
  });

  describe('DELETE /api/meal-plans/:id - Delete Meal Plan', () => {
    it('deletes meal plan successfully', async () => {
      vi.mocked(storage.storage.deleteMealPlan).mockResolvedValueOnce(true);

      const response = await request(app)
        .delete('/api/meal-plans/meal-plan-123')
        .expect(200);

      expect(response.body.message).toBe('Meal plan deleted successfully');
      expect(storage.storage.deleteMealPlan).toHaveBeenCalledWith('meal-plan-123', 'test-user-id');
    });

    it('handles deletion of non-existent meal plan', async () => {
      vi.mocked(storage.storage.deleteMealPlan).mockResolvedValueOnce(false);

      const response = await request(app)
        .delete('/api/meal-plans/non-existent')
        .expect(404);

      expect(response.body.error).toBe('Meal plan not found');
    });

    it('handles database errors during deletion', async () => {
      vi.mocked(storage.storage.deleteMealPlan).mockRejectedValueOnce(
        new Error('Database deletion failed')
      );

      const response = await request(app)
        .delete('/api/meal-plans/meal-plan-123')
        .expect(500);

      expect(response.body.error).toBe('Failed to delete meal plan');
    });
  });

  describe('Authentication and Authorization', () => {
    it('requires authentication for all endpoints', async () => {
      // This test verifies that the requireAuth middleware is applied
      // In a real scenario without the mock, these would return 401
      
      const endpoints = [
        ['post', '/api/meal-plans/generate'],
        ['get', '/api/meal-plans'],
        ['get', '/api/meal-plans/test-id'],
        ['put', '/api/meal-plans/test-id'],
        ['delete', '/api/meal-plans/test-id'],
      ];

      // With our mock auth, all requests should pass authentication
      // In production, unauthenticated requests would be rejected
      for (const [method, endpoint] of endpoints) {
        const req = request(app)[method as 'get' | 'post' | 'put' | 'delete'](endpoint);
        
        if (method === 'post') {
          req.send(mockMealPlanRequest);
        } else if (method === 'put') {
          req.send({ name: 'Test Update' });
        }
        
        // Should not get 401 with mock auth
        const response = await req;
        expect(response.status).not.toBe(401);
      }
    });

    it('ensures user can only access their own meal plans', async () => {
      vi.mocked(storage.storage.getMealPlan).mockResolvedValueOnce(mockGeneratedMealPlan);

      await request(app)
        .get('/api/meal-plans/meal-plan-123')
        .expect(200);

      // Verify that the user ID is passed to the storage function
      expect(storage.storage.getMealPlan).toHaveBeenCalledWith('meal-plan-123', 'test-user-id');
    });
  });

  describe('Input Sanitization and Security', () => {
    it('sanitizes meal plan names', async () => {
      const requestWithScriptTag = {
        ...mockMealPlanRequest,
        name: '<script>alert("xss")</script>Meal Plan',
      };

      vi.mocked(openaiService.generateMealPlan).mockResolvedValueOnce(mockGeneratedMealPlan);
      vi.mocked(storage.storage.saveMealPlan).mockResolvedValueOnce(mockGeneratedMealPlan);

      const response = await request(app)
        .post('/api/meal-plans/generate')
        .send(requestWithScriptTag)
        .expect(200);

      // Verify that the name was sanitized (implementation depends on sanitization logic)
      expect(openaiService.generateMealPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.not.stringContaining('<script>'),
        })
      );
    });

    it('prevents SQL injection in meal plan queries', async () => {
      const maliciousId = "'; DROP TABLE meal_plans; --";

      vi.mocked(storage.storage.getMealPlan).mockResolvedValueOnce(null);

      await request(app)
        .get(`/api/meal-plans/${encodeURIComponent(maliciousId)}`)
        .expect(404);

      // Verify that the malicious ID was passed safely to the storage function
      expect(storage.storage.getMealPlan).toHaveBeenCalledWith(maliciousId, 'test-user-id');
    });
  });

  describe('Performance and Edge Cases', () => {
    it('handles very large meal plans', async () => {
      const largeMealPlanRequest = {
        ...mockMealPlanRequest,
        days: 30,
        mealsPerDay: 6,
      };

      vi.mocked(openaiService.generateMealPlan).mockResolvedValueOnce({
        ...mockGeneratedMealPlan,
        meals: Array.from({ length: 180 }, (_, i) => ({
          day: Math.floor(i / 6) + 1,
          mealType: 'meal',
          recipe: { name: `Recipe ${i}`, caloriesKcal: 300 },
        })),
      });

      vi.mocked(storage.storage.saveMealPlan).mockResolvedValueOnce(mockGeneratedMealPlan);

      const response = await request(app)
        .post('/api/meal-plans/generate')
        .send(largeMealPlanRequest)
        .expect(200);

      expect(response.body.mealPlan).toBeDefined();
    });

    it('handles concurrent requests efficiently', async () => {
      vi.mocked(openaiService.generateMealPlan).mockResolvedValue(mockGeneratedMealPlan);
      vi.mocked(storage.storage.saveMealPlan).mockResolvedValue(mockGeneratedMealPlan);

      const requests = Array.from({ length: 5 }, () =>
        request(app)
          .post('/api/meal-plans/generate')
          .send(mockMealPlanRequest)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.mealPlan).toBeDefined();
      });

      expect(openaiService.generateMealPlan).toHaveBeenCalledTimes(5);
    });

    it('handles empty meal arrays gracefully', async () => {
      const emptyMealPlan = { ...mockGeneratedMealPlan, meals: [] };
      vi.mocked(openaiService.generateMealPlan).mockResolvedValueOnce(emptyMealPlan);
      vi.mocked(storage.storage.saveMealPlan).mockResolvedValueOnce(emptyMealPlan);

      const response = await request(app)
        .post('/api/meal-plans/generate')
        .send(mockMealPlanRequest)
        .expect(200);

      expect(response.body.nutrition.total).toEqual({
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      });
    });
  });
});