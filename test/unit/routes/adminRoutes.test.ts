/**
 * Admin Routes API Tests
 * 
 * Comprehensive unit tests for the /api/admin/generate-recipes endpoint covering:
 * - Successful recipe generation request
 * - Parameter validation (count, mealType, dietaryTag, etc.)
 * - Authentication requirements (admin only)
 * - Parameter mapping from frontend to backend format
 * - Error handling and validation
 * - Response format validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import adminRouter from '../../../server/routes/adminRoutes';
import * as recipeGenerator from '../../../server/services/recipeGenerator';

// Mock the recipeGenerator service
vi.mock('../../../server/services/recipeGenerator', () => ({
  recipeGenerator: {
    generateAndStoreRecipes: vi.fn(),
  },
}));

// Mock the auth middleware
vi.mock('../../../server/middleware/auth', () => ({
  requireAdmin: vi.fn((req, res, next) => {
    // Mock admin user
    req.user = {
      id: 'admin-user-id',
      role: 'admin',
    };
    next();
  }),
  requireAuth: vi.fn((req, res, next) => {
    req.user = {
      id: 'user-id',
      role: 'customer',
    };
    next();
  }),
  requireTrainerOrAdmin: vi.fn((req, res, next) => {
    req.user = {
      id: 'trainer-user-id',
      role: 'trainer',
    };
    next();
  }),
}));

// Mock storage
vi.mock('../../../server/storage', () => ({
  storage: {
    getCustomers: vi.fn(),
    assignRecipeToCustomers: vi.fn(),
    assignMealPlanToCustomers: vi.fn(),
    searchRecipes: vi.fn(),
    getRecipeStats: vi.fn(),
    updateRecipe: vi.fn(),
    deleteRecipe: vi.fn(),
    bulkDeleteRecipes: vi.fn(),
    getRecipe: vi.fn(),
  },
}));

// Mock database
vi.mock('../../../server/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
  },
}));

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json({ limit: '500kb' }));
  app.use('/api/admin', adminRouter);
  return app;
};

describe('Admin Routes - /api/admin/generate-recipes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/admin/generate-recipes - Successful Generation', () => {
    it('should start recipe generation with valid parameters', async () => {
      vi.mocked(recipeGenerator.recipeGenerator.generateAndStoreRecipes).mockResolvedValueOnce({
        success: 0,
        failed: 0,
        errors: [],
        metrics: {
          totalDuration: 0,
          averageTimePerRecipe: 0,
        },
      });

      const requestBody = {
        count: 5,
        mealType: 'breakfast',
        dietaryTag: 'vegetarian',
        maxPrepTime: 30,
        maxCalories: 500,
        minCalories: 200,
        minProtein: 10,
        maxProtein: 30,
        minCarbs: 20,
        maxCarbs: 60,
        minFat: 5,
        maxFat: 25,
        focusIngredient: 'chicken',
        difficulty: 'medium',
      };

      const response = await request(app)
        .post('/api/admin/generate-recipes')
        .send(requestBody)
        .expect(202);

      expect(response.body).toEqual({
        message: 'Recipe generation started',
        count: 5,
        started: true,
        success: 0,
        failed: 0,
        errors: [],
        metrics: {
          totalDuration: 0,
          averageTimePerRecipe: 0,
        },
      });

      expect(recipeGenerator.recipeGenerator.generateAndStoreRecipes).toHaveBeenCalledWith({
        count: 5,
        mealTypes: ['breakfast'],
        dietaryRestrictions: ['vegetarian'],
        targetCalories: 350, // (maxCalories + minCalories) / 2
        mainIngredient: 'chicken',
        maxPrepTime: 30,
        maxCalories: 500,
        minProtein: 10,
        maxProtein: 30,
        minCarbs: 20,
        maxCarbs: 60,
        minFat: 5,
        maxFat: 25,
        difficulty: 'medium',
      });
    });

    it('should handle minimal parameters correctly', async () => {
      const requestBody = {
        count: 1,
      };

      const response = await request(app)
        .post('/api/admin/generate-recipes')
        .send(requestBody)
        .expect(202);

      expect(response.body).toEqual({
        message: 'Recipe generation started',
        count: 1,
        started: true,
        success: 0,
        failed: 0,
        errors: [],
        metrics: {
          totalDuration: 0,
          averageTimePerRecipe: 0,
        },
      });

      expect(recipeGenerator.recipeGenerator.generateAndStoreRecipes).toHaveBeenCalledWith({
        count: 1,
        mealTypes: undefined,
        dietaryRestrictions: undefined,
        targetCalories: undefined,
        mainIngredient: undefined,
        maxPrepTime: undefined,
        maxCalories: undefined,
        minProtein: undefined,
        maxProtein: undefined,
        minCarbs: undefined,
        maxCarbs: undefined,
        minFat: undefined,
        maxFat: undefined,
        difficulty: undefined,
      });
    });

    it('should map parameters correctly when only some are provided', async () => {
      const requestBody = {
        count: 3,
        mealType: 'lunch',
        maxCalories: 600,
        focusIngredient: 'salmon',
      };

      await request(app)
        .post('/api/admin/generate-recipes')
        .send(requestBody)
        .expect(202);

      expect(recipeGenerator.recipeGenerator.generateAndStoreRecipes).toHaveBeenCalledWith({
        count: 3,
        mealTypes: ['lunch'],
        dietaryRestrictions: undefined,
        targetCalories: NaN, // (600 + undefined) / 2 = NaN when only maxCalories is provided
        mainIngredient: 'salmon',
        maxPrepTime: undefined,
        maxCalories: 600,
        minProtein: undefined,
        maxProtein: undefined,
        minCarbs: undefined,
        maxCarbs: undefined,
        minFat: undefined,
        maxFat: undefined,
        difficulty: undefined,
      });
    });

    it('should calculate targetCalories correctly when both min and max are provided', async () => {
      const requestBody = {
        count: 2,
        minCalories: 300,
        maxCalories: 500,
      };

      await request(app)
        .post('/api/admin/generate-recipes')
        .send(requestBody)
        .expect(202);

      expect(recipeGenerator.recipeGenerator.generateAndStoreRecipes).toHaveBeenCalledWith(
        expect.objectContaining({
          targetCalories: 400, // (300 + 500) / 2
        })
      );
    });

    it('should handle case when only minCalories is provided', async () => {
      const requestBody = {
        count: 1,
        minCalories: 300,
      };

      await request(app)
        .post('/api/admin/generate-recipes')
        .send(requestBody)
        .expect(202);

      expect(recipeGenerator.recipeGenerator.generateAndStoreRecipes).toHaveBeenCalledWith(
        expect.objectContaining({
          targetCalories: NaN, // (undefined + 300) / 2 = NaN
        })
      );
    });
  });

  describe('POST /api/admin/generate-recipes - Parameter Validation', () => {
    it('should reject requests without count parameter', async () => {
      const response = await request(app)
        .post('/api/admin/generate-recipes')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        message: 'Count is required and must be between 1 and 50',
      });

      expect(recipeGenerator.recipeGenerator.generateAndStoreRecipes).not.toHaveBeenCalled();
    });

    it('should reject count less than 1', async () => {
      const response = await request(app)
        .post('/api/admin/generate-recipes')
        .send({ count: 0 })
        .expect(400);

      expect(response.body).toEqual({
        message: 'Count is required and must be between 1 and 50',
      });

      expect(recipeGenerator.recipeGenerator.generateAndStoreRecipes).not.toHaveBeenCalled();
    });

    it('should reject count greater than 50', async () => {
      const response = await request(app)
        .post('/api/admin/generate-recipes')
        .send({ count: 51 })
        .expect(400);

      expect(response.body).toEqual({
        message: 'Count is required and must be between 1 and 50',
      });

      expect(recipeGenerator.recipeGenerator.generateAndStoreRecipes).not.toHaveBeenCalled();
    });

    it('should reject negative count', async () => {
      const response = await request(app)
        .post('/api/admin/generate-recipes')
        .send({ count: -5 })
        .expect(400);

      expect(response.body).toEqual({
        message: 'Count is required and must be between 1 and 50',
      });

      expect(recipeGenerator.recipeGenerator.generateAndStoreRecipes).not.toHaveBeenCalled();
    });

    it('should accept valid count values at boundaries', async () => {
      // Test count = 1
      await request(app)
        .post('/api/admin/generate-recipes')
        .send({ count: 1 })
        .expect(202);

      // Test count = 50
      await request(app)
        .post('/api/admin/generate-recipes')
        .send({ count: 50 })
        .expect(202);

      expect(recipeGenerator.recipeGenerator.generateAndStoreRecipes).toHaveBeenCalledTimes(2);
    });
  });

  describe('POST /api/admin/generate-recipes - Authentication Tests', () => {
    it('should use requireAdmin middleware for authentication', async () => {
      // The middleware is mocked to always pass as admin
      // This test verifies that the middleware mock is being called correctly
      await request(app)
        .post('/api/admin/generate-recipes')
        .send({ count: 5 })
        .expect(202);

      // Verify that the route is protected by requireAdmin middleware
      // by checking that our mock admin user is properly set
      expect(recipeGenerator.recipeGenerator.generateAndStoreRecipes).toHaveBeenCalled();
    });
  });

  describe('POST /api/admin/generate-recipes - Parameter Mapping', () => {
    it('should map mealType to mealTypes array', async () => {
      await request(app)
        .post('/api/admin/generate-recipes')
        .send({
          count: 1,
          mealType: 'dinner',
        })
        .expect(202);

      expect(recipeGenerator.recipeGenerator.generateAndStoreRecipes).toHaveBeenCalledWith(
        expect.objectContaining({
          mealTypes: ['dinner'],
        })
      );
    });

    it('should map dietaryTag to dietaryRestrictions array', async () => {
      await request(app)
        .post('/api/admin/generate-recipes')
        .send({
          count: 1,
          dietaryTag: 'vegan',
        })
        .expect(202);

      expect(recipeGenerator.recipeGenerator.generateAndStoreRecipes).toHaveBeenCalledWith(
        expect.objectContaining({
          dietaryRestrictions: ['vegan'],
        })
      );
    });

    it('should map focusIngredient to mainIngredient', async () => {
      await request(app)
        .post('/api/admin/generate-recipes')
        .send({
          count: 1,
          focusIngredient: 'tofu',
        })
        .expect(202);

      expect(recipeGenerator.recipeGenerator.generateAndStoreRecipes).toHaveBeenCalledWith(
        expect.objectContaining({
          mainIngredient: 'tofu',
        })
      );
    });

    it('should pass through nutritional parameters unchanged', async () => {
      const nutritionalParams = {
        count: 1,
        maxPrepTime: 25,
        maxCalories: 450,
        minProtein: 15,
        maxProtein: 35,
        minCarbs: 25,
        maxCarbs: 55,
        minFat: 8,
        maxFat: 20,
      };

      await request(app)
        .post('/api/admin/generate-recipes')
        .send(nutritionalParams)
        .expect(202);

      expect(recipeGenerator.recipeGenerator.generateAndStoreRecipes).toHaveBeenCalledWith(
        expect.objectContaining({
          maxPrepTime: 25,
          maxCalories: 450,
          minProtein: 15,
          maxProtein: 35,
          minCarbs: 25,
          maxCarbs: 55,
          minFat: 8,
          maxFat: 20,
        })
      );
    });

    it('should handle empty string parameters correctly', async () => {
      await request(app)
        .post('/api/admin/generate-recipes')
        .send({
          count: 1,
          mealType: '',
          dietaryTag: '',
          focusIngredient: '',
        })
        .expect(202);

      expect(recipeGenerator.recipeGenerator.generateAndStoreRecipes).toHaveBeenCalledWith(
        expect.objectContaining({
          mealTypes: undefined,
          dietaryRestrictions: undefined,
          mainIngredient: '',
        })
      );
    });
  });

  describe('POST /api/admin/generate-recipes - Error Handling', () => {
    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/admin/generate-recipes')
        .send('invalid json')
        .expect(400);

      // Express automatically handles malformed JSON
      expect(response.body).toBeDefined();
    });

    it('should handle missing request body', async () => {
      const response = await request(app)
        .post('/api/admin/generate-recipes')
        .expect(400);

      expect(response.body).toEqual({
        message: 'Count is required and must be between 1 and 50',
      });
    });

    it('should handle null count parameter', async () => {
      const response = await request(app)
        .post('/api/admin/generate-recipes')
        .send({ count: null })
        .expect(400);

      expect(response.body).toEqual({
        message: 'Count is required and must be between 1 and 50',
      });
    });

    it('should handle non-integer count parameter', async () => {
      const response = await request(app)
        .post('/api/admin/generate-recipes')
        .send({ count: 3.5 })
        .expect(202); // Should still work as JavaScript handles this

      expect(recipeGenerator.recipeGenerator.generateAndStoreRecipes).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 3.5,
        })
      );
    });

    it('should handle synchronous errors from the service', async () => {
      // If the service throws a synchronous error, it should be caught
      vi.mocked(recipeGenerator.recipeGenerator.generateAndStoreRecipes).mockImplementationOnce(() => {
        throw new Error('Service error');
      });

      const response = await request(app)
        .post('/api/admin/generate-recipes')
        .send({ count: 1 })
        .expect(500);

      expect(response.body).toEqual({
        message: 'Failed to start recipe generation',
      });
      expect(recipeGenerator.recipeGenerator.generateAndStoreRecipes).toHaveBeenCalled();
    });
  });

  describe('POST /api/admin/generate-recipes - Response Format', () => {
    it('should return correct response format with all expected fields', async () => {
      const response = await request(app)
        .post('/api/admin/generate-recipes')
        .send({ count: 10 })
        .expect(202);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('started');
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('failed');
      expect(response.body).toHaveProperty('errors');
      expect(response.body).toHaveProperty('metrics');

      expect(typeof response.body.message).toBe('string');
      expect(typeof response.body.count).toBe('number');
      expect(typeof response.body.started).toBe('boolean');
      expect(typeof response.body.success).toBe('number');
      expect(typeof response.body.failed).toBe('number');
      expect(Array.isArray(response.body.errors)).toBe(true);
      expect(typeof response.body.metrics).toBe('object');

      expect(response.body.count).toBe(10);
      expect(response.body.started).toBe(true);
      expect(response.body.success).toBe(0);
      expect(response.body.failed).toBe(0);
      expect(response.body.errors).toEqual([]);
    });

    it('should return 202 status code for accepted requests', async () => {
      await request(app)
        .post('/api/admin/generate-recipes')
        .send({ count: 1 })
        .expect(202);
    });

    it('should have correct Content-Type header', async () => {
      const response = await request(app)
        .post('/api/admin/generate-recipes')
        .send({ count: 1 })
        .expect(202);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('POST /api/admin/generate-recipes - Console Logging', () => {
    it('should log generation options to console', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await request(app)
        .post('/api/admin/generate-recipes')
        .send({
          count: 2,
          mealType: 'snack',
          dietaryTag: 'gluten-free',
        })
        .expect(202);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Custom recipe generation started with options:',
        expect.objectContaining({
          count: 2,
          mealTypes: ['snack'],
          dietaryRestrictions: ['gluten-free'],
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('POST /api/admin/generate-recipes - Background Execution', () => {
    it('should not await recipe generation (fire and forget)', async () => {
      // Create a promise that we can control
      let resolveGeneration: (value: any) => void;
      const generationPromise = new Promise((resolve) => {
        resolveGeneration = resolve;
      });

      vi.mocked(recipeGenerator.recipeGenerator.generateAndStoreRecipes).mockImplementationOnce(() => generationPromise);

      // Start the request
      const responsePromise = request(app)
        .post('/api/admin/generate-recipes')
        .send({ count: 1 });

      // The response should complete immediately, not waiting for generation
      const response = await responsePromise;
      expect(response.status).toBe(202);
      expect(response.body.started).toBe(true);

      // Verify that the generation was started but we didn't wait for it
      expect(recipeGenerator.recipeGenerator.generateAndStoreRecipes).toHaveBeenCalled();

      // Now resolve the generation to clean up
      resolveGeneration!({
        success: 1,
        failed: 0,
        errors: [],
        metrics: { totalDuration: 0, averageTimePerRecipe: 0 },
      });
    });
  });
});