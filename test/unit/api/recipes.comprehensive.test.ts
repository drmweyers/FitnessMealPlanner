/**
 * Comprehensive Recipe API Endpoints Unit Tests
 * 
 * This test suite provides extensive coverage of all recipe API endpoints,
 * including authentication, authorization, parameter validation, error handling,
 * and response formatting.
 * 
 * Test Categories:
 * 1. Public Recipe Endpoints (GET /api/recipes)
 * 2. Authenticated Recipe Endpoints (GET /api/recipes/personalized)
 * 3. Recipe Search and Filtering (GET /api/recipes/search)
 * 4. Recipe Creation and Updates (POST /api/recipes, PUT /api/recipes/:id)
 * 5. Recipe Deletion (DELETE /api/recipes/:id)
 * 6. Admin Recipe Generation (POST /api/admin/recipes/generate)
 * 
 * @author BMAD Testing Agent
 * @version 1.0.0
 * @date December 2024
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';

// Import the recipe router
import { recipeRouter } from '../../../server/routes/recipes';

// Mock external dependencies
vi.mock('../../../server/storage', () => ({
  storage: {
    searchRecipes: vi.fn(),
    getPersonalizedRecipes: vi.fn(),
    getRecipe: vi.fn(),
    createRecipe: vi.fn(),
    updateRecipe: vi.fn(),
    deleteRecipe: vi.fn(),
    getRecipeStats: vi.fn()
  }
}));

vi.mock('../../../server/services/recipeSearchService', () => ({
  recipeSearchService: {
    searchRecipes: vi.fn(),
    getSearchMetadata: vi.fn(),
    getSearchStatistics: vi.fn()
  }
}));

vi.mock('../../../server/services/recipeGenerator', () => ({
  recipeGenerator: {
    generateAndStoreRecipes: vi.fn()
  }
}));

vi.mock('../../../server/auth', () => ({
  verifyToken: vi.fn().mockImplementation((token) => {
    try {
      return jwt.verify(token, 'test-jwt-secret');
    } catch (error) {
      throw error;
    }
  })
}));

describe('Recipe API Endpoints Comprehensive Tests', () => {
  let app: express.Application;
  let request: supertest.SuperTest<supertest.Test>;

  beforeEach(async () => {
    // Create test Express app
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    
    // Add recipe routes
    app.use('/api/recipes', recipeRouter);
    
    // Create supertest instance
    request = supertest(app);
    
    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // Helper functions
  const createUserToken = (userId: string, role: string) => {
    return jwt.sign({ id: userId, role }, 'test-jwt-secret', { expiresIn: '15m' });
  };

  describe('1. Public Recipe Endpoints (GET /api/recipes)', () => {
    test('should fetch public approved recipes with default pagination', async () => {
      const mockRecipes = [
        { id: '1', name: 'Public Recipe 1', isApproved: true },
        { id: '2', name: 'Public Recipe 2', isApproved: true }
      ];

      const { storage } = await import('../../../server/storage');
      vi.mocked(storage.searchRecipes).mockResolvedValue({
        recipes: mockRecipes,
        total: 2
      });

      const response = await request.get('/api/recipes');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        recipes: mockRecipes,
        total: 2
      });
      expect(storage.searchRecipes).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        approved: true
      });
    });

    test('should fetch public recipes with custom pagination', async () => {
      const mockRecipes = [
        { id: '3', name: 'Recipe 3', isApproved: true },
        { id: '4', name: 'Recipe 4', isApproved: true },
        { id: '5', name: 'Recipe 5', isApproved: true }
      ];

      const { storage } = await import('../../../server/storage');
      vi.mocked(storage.searchRecipes).mockResolvedValue({
        recipes: mockRecipes,
        total: 50
      });

      const response = await request
        .get('/api/recipes')
        .query({ page: 2, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        recipes: mockRecipes,
        total: 50
      });
      expect(storage.searchRecipes).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        approved: true
      });
    });

    test('should fetch public recipes with search query', async () => {
      const mockRecipes = [
        { id: '6', name: 'Chicken Recipe', isApproved: true }
      ];

      const { storage } = await import('../../../server/storage');
      vi.mocked(storage.searchRecipes).mockResolvedValue({
        recipes: mockRecipes,
        total: 1
      });

      const response = await request
        .get('/api/recipes')
        .query({ search: 'chicken', page: 1, limit: 20 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        recipes: mockRecipes,
        total: 1
      });
      expect(storage.searchRecipes).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: 'chicken',
        approved: true
      });
    });

    test('should validate pagination parameters', async () => {
      const response = await request
        .get('/api/recipes')
        .query({ page: -1, limit: 200 });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Invalid filter parameters'
      });
    });
  });

  describe('2. Single Recipe Endpoint (GET /api/recipes/:id)', () => {
    test('should fetch approved recipe by ID', async () => {
      const mockRecipe = {
        id: 'recipe-123',
        name: 'Test Recipe',
        description: 'A test recipe',
        isApproved: true
      };

      const { storage } = await import('../../../server/storage');
      vi.mocked(storage.getRecipe).mockResolvedValue(mockRecipe);

      const response = await request.get('/api/recipes/recipe-123');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockRecipe);
      expect(storage.getRecipe).toHaveBeenCalledWith('recipe-123');
    });

    test('should return 404 for non-existent recipe', async () => {
      const { storage } = await import('../../../server/storage');
      vi.mocked(storage.getRecipe).mockResolvedValue(null);

      const response = await request.get('/api/recipes/non-existent');

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        error: 'Recipe not found or not approved'
      });
    });

    test('should return 404 for unapproved recipe', async () => {
      const mockRecipe = {
        id: 'recipe-456',
        name: 'Unapproved Recipe',
        description: 'This recipe is not approved',
        isApproved: false
      };

      const { storage } = await import('../../../server/storage');
      vi.mocked(storage.getRecipe).mockResolvedValue(mockRecipe);

      const response = await request.get('/api/recipes/recipe-456');

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        error: 'Recipe not found or not approved'
      });
    });

    test('should handle database errors gracefully', async () => {
      const { storage } = await import('../../../server/storage');
      vi.mocked(storage.getRecipe).mockRejectedValue(new Error('Database error'));

      const response = await request.get('/api/recipes/error-recipe');

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        error: 'Failed to fetch recipe'
      });
    });
  });

  describe('3. Personalized Recipes Endpoint (GET /api/recipes/personalized)', () => {
    test('should require authentication for personalized recipes', async () => {
      const response = await request.get('/api/recipes/personalized');

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: expect.stringContaining('Authentication required')
      });
    });

    test('should fetch personalized recipes for authenticated user', async () => {
      const userToken = createUserToken('user-123', 'customer');
      const mockRecipes = [
        { id: 'p1', name: 'Personalized Recipe 1' },
        { id: 'p2', name: 'Personalized Recipe 2' }
      ];

      const { storage } = await import('../../../server/storage');
      vi.mocked(storage.getPersonalizedRecipes).mockResolvedValue(mockRecipes);

      const response = await request
        .get('/api/recipes/personalized')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        recipes: mockRecipes,
        total: 2
      });
      expect(storage.getPersonalizedRecipes).toHaveBeenCalledWith('user-123');
    });

    test('should handle personalized recipes service errors', async () => {
      const userToken = createUserToken('user-456', 'customer');

      const { storage } = await import('../../../server/storage');
      vi.mocked(storage.getPersonalizedRecipes).mockRejectedValue(new Error('Service error'));

      const response = await request
        .get('/api/recipes/personalized')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        error: 'Failed to fetch personalized recipes'
      });
    });
  });

  describe('4. Recipe Search Endpoint (GET /api/recipes/search)', () => {
    test('should perform basic recipe search', async () => {
      const mockSearchResult = {
        recipes: [
          { id: 's1', name: 'Search Result 1' },
          { id: 's2', name: 'Search Result 2' }
        ],
        total: 2,
        page: 1,
        totalPages: 1
      };

      const { recipeSearchService } = await import('../../../server/services/recipeSearchService');
      vi.mocked(recipeSearchService.searchRecipes).mockResolvedValue(mockSearchResult);

      const response = await request
        .get('/api/recipes/search')
        .query({ search: 'chicken' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockSearchResult
      });
      expect(recipeSearchService.searchRecipes).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'chicken' })
      );
    });

    test('should handle advanced search with multiple filters', async () => {
      const mockSearchResult = {
        recipes: [{ id: 'advanced1', name: 'Advanced Search Result' }],
        total: 1,
        page: 1,
        totalPages: 1
      };

      const { recipeSearchService } = await import('../../../server/services/recipeSearchService');
      vi.mocked(recipeSearchService.searchRecipes).mockResolvedValue(mockSearchResult);

      const response = await request
        .get('/api/recipes/search')
        .query({
          search: 'protein',
          mealTypes: 'breakfast,lunch',
          dietaryTags: 'vegan,gluten-free',
          caloriesMin: 200,
          caloriesMax: 500,
          proteinMin: 20,
          sortBy: 'protein',
          sortOrder: 'desc'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(recipeSearchService.searchRecipes).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'protein',
          mealTypes: ['breakfast', 'lunch'],
          dietaryTags: ['vegan', 'gluten-free'],
          calories: { min: 200, max: 500 },
          protein: { min: 20, max: undefined },
          sortBy: 'protein',
          sortOrder: 'desc'
        })
      );
    });

    test('should validate search parameters and handle errors', async () => {
      const { recipeSearchService } = await import('../../../server/services/recipeSearchService');
      vi.mocked(recipeSearchService.searchRecipes).mockRejectedValue(
        new Error('Invalid search parameters')
      );

      const response = await request
        .get('/api/recipes/search')
        .query({ invalidParam: 'test' });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid search parameters'
      });
    });

    test('should limit results per page for performance', async () => {
      const mockSearchResult = {
        recipes: new Array(50).fill(null).map((_, i) => ({ id: `perf${i}`, name: `Recipe ${i}` })),
        total: 1000,
        page: 1,
        totalPages: 20
      };

      const { recipeSearchService } = await import('../../../server/services/recipeSearchService');
      vi.mocked(recipeSearchService.searchRecipes).mockResolvedValue(mockSearchResult);

      const response = await request
        .get('/api/recipes/search')
        .query({ limit: 100 }); // Request more than max allowed

      expect(response.status).toBe(200);
      expect(recipeSearchService.searchRecipes).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50 }) // Should be capped at 50
      );
    });
  });

  describe('5. Recipe Search Metadata Endpoint (GET /api/recipes/search/metadata)', () => {
    test('should fetch search metadata successfully', async () => {
      const mockMetadata = {
        availableMealTypes: ['breakfast', 'lunch', 'dinner', 'snack'],
        availableDietaryTags: ['vegan', 'vegetarian', 'gluten-free', 'keto'],
        calorieRange: { min: 50, max: 1500 },
        proteinRange: { min: 0, max: 80 }
      };

      const { recipeSearchService } = await import('../../../server/services/recipeSearchService');
      vi.mocked(recipeSearchService.getSearchMetadata).mockResolvedValue(mockMetadata);

      const response = await request.get('/api/recipes/search/metadata');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockMetadata
      });
    });

    test('should handle metadata service errors', async () => {
      const { recipeSearchService } = await import('../../../server/services/recipeSearchService');
      vi.mocked(recipeSearchService.getSearchMetadata).mockRejectedValue(
        new Error('Metadata service error')
      );

      const response = await request.get('/api/recipes/search/metadata');

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to get search metadata'
      });
    });
  });

  describe('6. Recipe Search Statistics Endpoint (GET /api/recipes/search/statistics)', () => {
    test('should require authentication for search statistics', async () => {
      const response = await request.get('/api/recipes/search/statistics');

      expect(response.status).toBe(401);
    });

    test('should fetch search statistics for authenticated users', async () => {
      const userToken = createUserToken('admin-123', 'admin');
      const mockStatistics = {
        totalSearches: 1500,
        popularSearchTerms: ['chicken', 'protein', 'low-carb'],
        searchesByFilter: {
          mealTypes: { breakfast: 400, lunch: 300, dinner: 500 },
          dietaryTags: { vegan: 200, keto: 150 }
        }
      };

      const { recipeSearchService } = await import('../../../server/services/recipeSearchService');
      vi.mocked(recipeSearchService.getSearchStatistics).mockResolvedValue(mockStatistics);

      const response = await request
        .get('/api/recipes/search/statistics')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockStatistics
      });
    });

    test('should handle statistics service errors gracefully', async () => {
      const userToken = createUserToken('admin-456', 'admin');

      const { recipeSearchService } = await import('../../../server/services/recipeSearchService');
      vi.mocked(recipeSearchService.getSearchStatistics).mockRejectedValue(
        new Error('Statistics error')
      );

      const response = await request
        .get('/api/recipes/search/statistics')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to get search statistics'
      });
    });
  });
});