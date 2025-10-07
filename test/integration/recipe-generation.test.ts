/**
 * Recipe Generation Integration Tests
 * 
 * Comprehensive end-to-end testing for the recipe generation workflow
 * Tests the complete flow from frontend request to backend response
 * with real HTTP calls but mocked external dependencies.
 * 
 * @author Integration Testing Specialist
 * @version 1.0.0
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import supertest from 'supertest';

// Setup test environment
import './setup-test-env';

// Import server components
import adminRouter from '../../server/routes/adminRoutes';

// Mock external dependencies
vi.mock('../../server/services/recipeGenerator', () => ({
  recipeGenerator: {
    generateAndStoreRecipes: vi.fn().mockImplementation((options) => {
      console.log('Mock generateAndStoreRecipes called with:', options);
      return Promise.resolve({
        count: options.count,
        success: options.count,
        failed: 0,
        errors: [],
        metrics: {
          totalDuration: 5000,
          averageTimePerRecipe: 5000 / options.count
        }
      });
    })
  }
}));

vi.mock('../../server/storage', () => ({
  storage: {
    getUser: vi.fn().mockImplementation((id) => {
      if (id === 'admin-user-id') {
        return Promise.resolve({
          id: 'admin-user-id',
          email: 'admin@test.com',
          role: 'admin',
          firstName: 'Test',
          lastName: 'Admin'
        });
      }
      if (id === 'trainer-user-id') {
        return Promise.resolve({
          id: 'trainer-user-id',
          email: 'trainer@test.com',
          role: 'trainer',
          firstName: 'Test',
          lastName: 'Trainer'
        });
      }
      return Promise.resolve(null);
    }),
    getRefreshToken: vi.fn().mockResolvedValue(null),
    createRefreshToken: vi.fn().mockResolvedValue(undefined),
    deleteRefreshToken: vi.fn().mockResolvedValue(undefined),
    searchRecipes: vi.fn().mockResolvedValue({ recipes: [], total: 0 }),
    getRecipeStats: vi.fn().mockResolvedValue({ total: 100, pending: 10, approved: 90 })
  }
}));

vi.mock('../../server/auth', () => ({
  verifyToken: vi.fn().mockImplementation((token) => {
    try {
      return jwt.verify(token, 'test-jwt-secret');
    } catch (error) {
      throw error;
    }
  }),
  generateTokens: vi.fn().mockImplementation((user) => ({
    accessToken: jwt.sign({ id: user.id, role: user.role }, 'test-jwt-secret', { expiresIn: '15m' }),
    refreshToken: jwt.sign({ id: user.id }, 'test-jwt-secret', { expiresIn: '30d' })
  }))
}));

// Test server setup
describe('Recipe Generation Integration Tests', () => {
  let app: express.Application;
  let request: supertest.SuperTest<supertest.Test>;

  beforeAll(async () => {
    // Create test Express app
    app = express();
    app.use(express.json({ limit: '500kb' }));
    app.use(cookieParser());
    
    // Add admin routes
    app.use('/api/admin', adminRouter);
    
    // Create supertest instance
    request = supertest(app);
    
    console.log('Test app configured with admin routes');
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper functions
  const createToken = (userId: string, role: string) => {
    return jwt.sign({ id: userId, role }, 'test-jwt-secret', { expiresIn: '15m' });
  };

  describe('1. Authentication Tests (5 tests)', () => {
    it('should reject unauthenticated requests to generate-recipes', async () => {
      const response = await request
        .post('/api/admin/generate-recipes')
        .send({ count: 5 });

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: 'Authentication required. Please provide a valid token.',
        code: 'NO_TOKEN'
      });
    });

    it('should reject non-admin requests to generate-recipes', async () => {
      const trainerToken = createToken('trainer-user-id', 'trainer');
      
      const response = await request
        .post('/api/admin/generate-recipes')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ count: 5 });

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        error: 'Admin access required',
        code: 'ADMIN_REQUIRED'
      });
    });

    it('should accept valid admin token for generate-recipes', async () => {
      const adminToken = createToken('admin-user-id', 'admin');
      
      const response = await request
        .post('/api/admin/generate-recipes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ count: 5 });

      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('count', 5);
    });

    it('should handle invalid JWT tokens gracefully', async () => {
      const response = await request
        .post('/api/admin/generate-recipes')
        .set('Authorization', 'Bearer invalid-token')
        .send({ count: 5 });

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    });

    it('should handle expired JWT tokens', async () => {
      const expiredToken = jwt.sign({ id: 'admin-user-id', role: 'admin' }, 'test-jwt-secret', { expiresIn: '-1h' });
      
      const response = await request
        .post('/api/admin/generate-recipes')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({ count: 5 });

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('SESSION_EXPIRED');
    });
  });

  describe('2. Recipe Generation Endpoint Tests (5 tests)', () => {
    const adminToken = createToken('admin-user-id', 'admin');

    it('should generate recipes with minimal parameters', async () => {
      const response = await request
        .post('/api/admin/generate-recipes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ count: 3 });

      expect(response.status).toBe(202);
      expect(response.body).toMatchObject({
        message: 'Recipe generation started',
        count: 3,
        started: true,
        success: 0,
        failed: 0,
        errors: []
      });
    });

    it('should generate recipes with full parameter set', async () => {
      const fullParams = {
        count: 10,
        mealType: 'breakfast',
        dietaryTag: 'keto',
        maxPrepTime: 30,
        maxCalories: 600,
        minCalories: 400,
        minProtein: 20,
        maxProtein: 40,
        minCarbs: 5,
        maxCarbs: 15,
        minFat: 15,
        maxFat: 35,
        focusIngredient: 'eggs',
        difficulty: 'intermediate'
      };

      const response = await request
        .post('/api/admin/generate-recipes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(fullParams);

      expect(response.status).toBe(202);
      expect(response.body).toMatchObject({
        message: 'Recipe generation started',
        count: 10,
        started: true
      });
    });

    it('should validate count parameter bounds - too low', async () => {
      const response = await request
        .post('/api/admin/generate-recipes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ count: 0 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('between 1 and 50');
    });

    it('should validate count parameter bounds - too high', async () => {
      const response = await request
        .post('/api/admin/generate-recipes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ count: 100 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('between 1 and 50');
    });

    it('should handle missing count parameter', async () => {
      const response = await request
        .post('/api/admin/generate-recipes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ mealType: 'breakfast' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Count is required');
    });
  });

  describe('3. Bulk Generation Endpoint Tests (3 tests)', () => {
    const adminToken = createToken('admin-user-id', 'admin');

    it('should handle bulk generation with default parameters', async () => {
      const response = await request
        .post('/api/admin/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ count: 25 });

      expect(response.status).toBe(202);
      expect(response.body.message).toContain('25 recipes');
    });

    it('should validate bulk generation count limits', async () => {
      const response = await request
        .post('/api/admin/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ count: 1000 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('between 1 and 500');
    });

    it('should handle bulk generation with context parameters', async () => {
      const contextParams = {
        count: 15,
        mealTypes: ['breakfast', 'lunch'],
        dietaryRestrictions: ['vegetarian'],
        fitnessGoal: 'muscle-gain',
        naturalLanguagePrompt: 'High protein breakfast recipes for muscle building'
      };

      const response = await request
        .post('/api/admin/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(contextParams);

      expect(response.status).toBe(202);
      expect(response.body.message).toContain('with context-based targeting');
    });
  });

  describe('4. Error Handling Tests (3 tests)', () => {
    const adminToken = createToken('admin-user-id', 'admin');

    it('should handle server errors gracefully', async () => {
      // Clear any existing mocks and set up error mock
      vi.clearAllMocks();
      
      // Mock the recipe generator to throw an error
      const { recipeGenerator } = await import('../../server/services/recipeGenerator');
      vi.mocked(recipeGenerator.generateAndStoreRecipes).mockImplementationOnce(() => {
        throw new Error('OpenAI service unavailable');
      });

      const response = await request
        .post('/api/admin/generate-recipes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ count: 5 });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Failed to start recipe generation');
    });

    it('should handle malformed request bodies', async () => {
      // Send a raw string that will cause JSON parse error
      const response = await request
        .post('/api/admin/generate-recipes')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send('{ "invalid": json }'); // This will fail JSON parsing

      expect(response.status).toBe(400);
    });

    it('should validate edge case parameter combinations', async () => {
      const response = await request
        .post('/api/admin/generate-recipes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          count: 1, // Minimum valid count
          minCalories: 2000,
          maxCalories: 500, // Max less than min - invalid but should be handled
          difficulty: ''
        });

      expect(response.status).toBe(202);
    });
  });

  describe('5. Integration with Recipe Service Tests (2 tests)', () => {
    const adminToken = createToken('admin-user-id', 'admin');

    it('should call recipe generator service with correct parameters', async () => {
      const { recipeGenerator } = await import('../../server/services/recipeGenerator');
      
      const testParams = {
        count: 7,
        mealType: 'dinner',
        dietaryTag: 'paleo',
        maxPrepTime: 45,
        focusIngredient: 'salmon'
      };

      await request
        .post('/api/admin/generate-recipes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testParams);

      expect(recipeGenerator.generateAndStoreRecipes).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 7,
          mealTypes: ['dinner'],
          dietaryRestrictions: ['paleo'],
          maxPrepTime: 45,
          mainIngredient: 'salmon'
        })
      );
    });

    it('should not wait for recipe generation completion (async operation)', async () => {
      const startTime = Date.now();
      
      const response = await request
        .post('/api/admin/generate-recipes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ count: 10 });

      const endTime = Date.now();
      const requestDuration = endTime - startTime;

      expect(response.status).toBe(202);
      expect(requestDuration).toBeLessThan(1000); // Should return quickly
      expect(response.body.started).toBe(true);
    });
  });

  describe('6. Response Format and Headers Tests (2 tests)', () => {
    const adminToken = createToken('admin-user-id', 'admin');

    it('should return proper response format for successful generation', async () => {
      const response = await request
        .post('/api/admin/generate-recipes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ count: 3 });

      expect(response.status).toBe(202);
      expect(response.body).toMatchObject({
        message: expect.any(String),
        count: expect.any(Number),
        started: expect.any(Boolean),
        success: expect.any(Number),
        failed: expect.any(Number),
        errors: expect.any(Array),
        metrics: expect.objectContaining({
          totalDuration: expect.any(Number),
          averageTimePerRecipe: expect.any(Number)
        })
      });
    });

    it('should include proper Content-Type headers', async () => {
      const response = await request
        .post('/api/admin/generate-recipes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ count: 3 });

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.status).toBe(202);
    });
  });
});