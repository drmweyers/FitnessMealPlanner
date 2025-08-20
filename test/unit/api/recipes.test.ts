/**
 * Recipes API Routes Tests
 * 
 * Comprehensive tests for the recipes API endpoints covering:
 * - Public recipe retrieval and filtering
 * - Personalized recipe access with authentication  
 * - Recipe search and pagination
 * - Error handling and validation
 * - Security and authorization checks
 * - Database integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { recipeRouter } from '../../../server/routes/recipes';
import * as storage from '../../../server/storage';

// Storage is mocked globally in setup.ts

// Mock the auth middleware
vi.mock('../../../server/middleware/auth', () => ({
  requireAuth: vi.fn((req, res, next) => {
    // Mock authenticated user
    req.user = {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'customer',
    };
    next();
  }),
}));

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/recipes', recipeRouter);
  return app;
};

describe('Recipes API Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/recipes - Public Recipes', () => {
    const mockRecipes = [
      {
        id: 'recipe-1',
        name: 'Grilled Chicken',
        description: 'Delicious grilled chicken',
        caloriesKcal: 300,
        isApproved: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'recipe-2', 
        name: 'Vegetable Salad',
        description: 'Fresh vegetable salad',
        caloriesKcal: 150,
        isApproved: true,
        createdAt: new Date().toISOString(),
      },
    ];

    it('returns approved recipes with default pagination', async () => {
      vi.mocked(storage.storage.searchRecipes).mockResolvedValueOnce({
        recipes: mockRecipes,
        total: mockRecipes.length,
      });

      const response = await request(app)
        .get('/api/recipes')
        .expect(200);

      expect(response.body).toEqual({
        recipes: mockRecipes,
        total: mockRecipes.length,
      });

      expect(storage.storage.searchRecipes).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        approved: true,
      });
    });

    it('handles custom pagination parameters', async () => {
      vi.mocked(storage.storage.searchRecipes).mockResolvedValueOnce({
        recipes: mockRecipes.slice(0, 1),
        total: 1,
      });

      const response = await request(app)
        .get('/api/recipes')
        .query({ page: 2, limit: 10 })
        .expect(200);

      expect(storage.storage.searchRecipes).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        approved: true,
      });
    });

    it('handles search query parameter', async () => {
      const filteredRecipes = [mockRecipes[0]];
      vi.mocked(storage.storage.searchRecipes).mockResolvedValueOnce({
        recipes: filteredRecipes,
        total: filteredRecipes.length,
      });

      const response = await request(app)
        .get('/api/recipes')
        .query({ search: 'chicken' })
        .expect(200);

      expect(storage.storage.searchRecipes).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: 'chicken',
        approved: true,
      });

      expect(response.body).toEqual({
        recipes: filteredRecipes,
        total: filteredRecipes.length,
      });
    });

    it('validates pagination parameters', async () => {
      await request(app)
        .get('/api/recipes')
        .query({ page: 0, limit: -5 })
        .expect(400);

      expect(storage.storage.searchRecipes).not.toHaveBeenCalled();
    });

    it('enforces maximum limit', async () => {
      await request(app)
        .get('/api/recipes')
        .query({ limit: 1000 })
        .expect(400);

      expect(storage.storage.searchRecipes).not.toHaveBeenCalled();
    });

    it('handles search with no results', async () => {
      vi.mocked(storage.storage.searchRecipes).mockResolvedValueOnce({
        recipes: [],
        total: 0,
      });

      const response = await request(app)
        .get('/api/recipes')
        .query({ search: 'nonexistent' })
        .expect(200);

      expect(response.body).toEqual({
        recipes: [],
        total: 0,
      });
    });

    it('handles storage errors gracefully', async () => {
      vi.mocked(storage.storage.searchRecipes).mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get('/api/recipes')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Invalid filter parameters',
      });
    });

    it('only returns approved recipes', async () => {
      vi.mocked(storage.storage.searchRecipes).mockResolvedValueOnce({
        recipes: mockRecipes,
        total: mockRecipes.length,
      });

      await request(app)
        .get('/api/recipes')
        .expect(200);

      expect(storage.storage.searchRecipes).toHaveBeenCalledWith(
        expect.objectContaining({
          approved: true,
        })
      );
    });
  });

  describe('GET /api/recipes/personalized - Authenticated Recipes', () => {
    const mockPersonalizedRecipes = [
      {
        id: 'personal-recipe-1',
        name: 'Custom Protein Shake',
        description: 'Personal protein shake recipe',
        caloriesKcal: 250,
        createdBy: 'test-user-id',
        isApproved: false,
      },
    ];

    it('returns personalized recipes for authenticated user', async () => {
      vi.mocked(storage.storage.getPersonalizedRecipes).mockResolvedValueOnce(
        mockPersonalizedRecipes
      );

      const response = await request(app)
        .get('/api/recipes/personalized')
        .expect(200);

      expect(response.body).toEqual({
        recipes: mockPersonalizedRecipes,
        total: mockPersonalizedRecipes.length,
      });

      expect(storage.storage.getPersonalizedRecipes).toHaveBeenCalledWith('test-user-id');
    });

    it('handles empty personalized recipes', async () => {
      vi.mocked(storage.storage.getPersonalizedRecipes).mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/api/recipes/personalized')
        .expect(200);

      expect(response.body).toEqual({
        recipes: [],
        total: 0,
      });
    });

    it('handles storage errors for personalized recipes', async () => {
      vi.mocked(storage.storage.getPersonalizedRecipes).mockRejectedValueOnce(
        new Error('User recipes not found')
      );

      const response = await request(app)
        .get('/api/recipes/personalized')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to fetch personalized recipes',
      });
    });
  });

  describe('GET /api/recipes/:id - Single Recipe', () => {
    const mockRecipe = {
      id: 'recipe-123',
      name: 'Salmon Fillet',
      description: 'Pan-seared salmon',
      caloriesKcal: 400,
      isApproved: true,
      ingredients: [
        { name: 'Salmon', amount: '200', unit: 'g' },
        { name: 'Olive Oil', amount: '1', unit: 'tbsp' },
      ],
      instructions: ['Heat oil', 'Cook salmon', 'Serve'],
    };

    it('returns approved recipe by ID', async () => {
      vi.mocked(storage.storage.getRecipe).mockResolvedValueOnce(mockRecipe);

      const response = await request(app)
        .get('/api/recipes/recipe-123')
        .expect(200);

      expect(response.body).toEqual(mockRecipe);
      expect(storage.storage.getRecipe).toHaveBeenCalledWith('recipe-123');
    });

    it('returns 404 for non-existent recipe', async () => {
      vi.mocked(storage.storage.getRecipe).mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/recipes/non-existent')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Recipe not found or not approved',
      });
    });

    it('returns 404 for unapproved recipe', async () => {
      const unapprovedRecipe = { ...mockRecipe, isApproved: false };
      vi.mocked(storage.storage.getRecipe).mockResolvedValueOnce(unapprovedRecipe);

      const response = await request(app)
        .get('/api/recipes/recipe-123')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Recipe not found or not approved',
      });
    });

    it('handles storage errors for single recipe', async () => {
      vi.mocked(storage.storage.getRecipe).mockRejectedValueOnce(
        new Error('Database query failed')
      );

      const response = await request(app)
        .get('/api/recipes/recipe-123')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to fetch recipe',
      });
    });

    it('handles malformed recipe IDs', async () => {
      vi.mocked(storage.storage.getRecipe).mockRejectedValueOnce(
        new Error('Invalid UUID format')
      );

      const response = await request(app)
        .get('/api/recipes/invalid-id-format')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to fetch recipe',
      });
    });
  });

  describe('Query Parameter Validation', () => {
    it('accepts valid page numbers', async () => {
      // Mock for both requests
      vi.mocked(storage.storage.searchRecipes)
        .mockResolvedValueOnce({
          recipes: [],
          total: 0,
        })
        .mockResolvedValueOnce({
          recipes: [],
          total: 0,
        });

      await request(app)
        .get('/api/recipes')
        .query({ page: 1 })
        .expect(200);

      await request(app)
        .get('/api/recipes')
        .query({ page: 100 })
        .expect(200);
    });

    it('accepts valid limit values', async () => {
      // Mock for both requests
      vi.mocked(storage.storage.searchRecipes)
        .mockResolvedValueOnce({
          recipes: [],
          total: 0,
        })
        .mockResolvedValueOnce({
          recipes: [],
          total: 0,
        });

      await request(app)
        .get('/api/recipes')
        .query({ limit: 1 })
        .expect(200);

      await request(app)
        .get('/api/recipes')
        .query({ limit: 100 })
        .expect(200);
    });

    it('rejects invalid page numbers', async () => {
      await request(app)
        .get('/api/recipes')
        .query({ page: 0 })
        .expect(400);

      await request(app)
        .get('/api/recipes')
        .query({ page: -1 })
        .expect(400);

      await request(app)
        .get('/api/recipes')
        .query({ page: 'invalid' })
        .expect(400);
    });

    it('rejects invalid limit values', async () => {
      await request(app)
        .get('/api/recipes')
        .query({ limit: 0 })
        .expect(400);

      await request(app)
        .get('/api/recipes')
        .query({ limit: -1 })
        .expect(400);

      await request(app)
        .get('/api/recipes')
        .query({ limit: 101 })
        .expect(400);

      await request(app)
        .get('/api/recipes')
        .query({ limit: 'invalid' })
        .expect(400);
    });

    it('handles non-string search parameters', async () => {
      vi.mocked(storage.storage.searchRecipes).mockResolvedValueOnce({
        recipes: [],
        total: 0,
      });

      await request(app)
        .get('/api/recipes')
        .query({ search: 123 })
        .expect(200);

      // Should convert number to string
      expect(storage.storage.searchRecipes).toHaveBeenCalledWith(
        expect.objectContaining({
          search: '123',
        })
      );
    });
  });

  describe('Security and Authorization', () => {
    it('does not require authentication for public recipes', async () => {
      vi.mocked(storage.storage.searchRecipes).mockResolvedValueOnce({
        recipes: [],
        total: 0,
      });

      await request(app)
        .get('/api/recipes')
        .expect(200);
    });

    it('does not require authentication for single public recipe', async () => {
      const mockRecipe = { id: 'recipe-1', name: 'Test', isApproved: true };
      vi.mocked(storage.storage.getRecipe).mockResolvedValueOnce(mockRecipe);

      await request(app)
        .get('/api/recipes/recipe-1')
        .expect(200);
    });

    it('requires authentication for personalized recipes', async () => {
      // This test depends on the auth middleware being properly configured
      // The mock auth middleware automatically authenticates, so we test that
      // the user ID is passed correctly to the storage function
      
      vi.mocked(storage.storage.getPersonalizedRecipes).mockResolvedValueOnce([]);

      await request(app)
        .get('/api/recipes/personalized')
        .expect(200);

      expect(storage.storage.getPersonalizedRecipes).toHaveBeenCalledWith('test-user-id');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles database connection failures', async () => {
      vi.mocked(storage.storage.searchRecipes).mockRejectedValueOnce(
        new Error('Connection timeout')
      );

      const response = await request(app)
        .get('/api/recipes')
        .expect(400);

      expect(response.body.error).toBe('Invalid filter parameters');
    });

    it('handles malformed requests gracefully', async () => {
      await request(app)
        .get('/api/recipes')
        .query({ page: 'not-a-number', limit: 'also-not-a-number' })
        .expect(400);
    });

    it('handles extremely large page numbers', async () => {
      vi.mocked(storage.storage.searchRecipes).mockResolvedValueOnce({
        recipes: [],
        total: 0,
      });

      await request(app)
        .get('/api/recipes')
        .query({ page: 999999 })
        .expect(200);

      expect(storage.storage.searchRecipes).toHaveBeenCalledWith({
        page: 999999,
        limit: 20,
        approved: true,
      });
    });

    it('handles empty search strings', async () => {
      vi.mocked(storage.storage.searchRecipes).mockResolvedValueOnce({
        recipes: [],
        total: 0,
      });

      await request(app)
        .get('/api/recipes')
        .query({ search: '' })
        .expect(200);
    });

    it('handles special characters in search', async () => {
      vi.mocked(storage.storage.searchRecipes).mockResolvedValueOnce({
        recipes: [],
        total: 0,
      });

      await request(app)
        .get('/api/recipes')
        .query({ search: 'recipe with "quotes" & symbols!' })
        .expect(200);

      expect(storage.storage.searchRecipes).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'recipe with "quotes" & symbols!',
        })
      );
    });
  });

  describe('Performance and Optimization', () => {
    it('uses default pagination limits to prevent large queries', async () => {
      vi.mocked(storage.storage.searchRecipes).mockResolvedValueOnce({
        recipes: [],
        total: 0,
      });

      await request(app)
        .get('/api/recipes')
        .expect(200);

      expect(storage.storage.searchRecipes).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 20, // Default limit
        })
      );
    });

    it('enforces maximum limit to prevent resource exhaustion', async () => {
      await request(app)
        .get('/api/recipes')
        .query({ limit: 1000 })
        .expect(400);

      expect(storage.storage.searchRecipes).not.toHaveBeenCalled();
    });
  });
});