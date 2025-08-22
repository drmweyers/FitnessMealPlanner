import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { RedisService } from '../../../server/services/RedisService';
import app from '../../../server/index';
import { setupTestDb, cleanupTestDb, createTestUser } from '../../helpers/testHelpers';

describe('Recipe Caching Integration Tests', () => {
  let redisService: RedisService;
  let testAdmin: any;
  let adminToken: string;

  beforeAll(async () => {
    await setupTestDb();
    
    // Setup Redis service for testing
    redisService = new RedisService({
      host: 'localhost',
      port: 6380,
      database: 1 // Use separate test database
    });
    
    await redisService.connect();
    await redisService.flushAll(); // Start with clean cache

    // Create test admin user
    testAdmin = await createTestUser('admin', 'test-admin@example.com');
    
    // Get admin token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testAdmin.email,
        password: 'testpassword123'
      });
    
    adminToken = loginResponse.body.data.accessToken;
  });

  afterAll(async () => {
    await redisService?.disconnect();
    await cleanupTestDb();
  });

  beforeEach(async () => {
    // Clear cache before each test
    await redisService.flushAll();
    redisService.clearMetrics();
  });

  describe('Recipe Retrieval Caching', () => {
    it('should cache recipe search results', async () => {
      const searchTerm = 'chicken';
      const cacheKey = `search:recipes:${Buffer.from(JSON.stringify({ search: searchTerm })).toString('base64')}`;

      // First request - should hit database
      const response1 = await request(app)
        .get(`/api/recipes?search=${searchTerm}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response1.body.recipes).toBeDefined();
      
      // Verify cache was populated
      const cachedResult = await redisService.get(cacheKey);
      expect(cachedResult).toBeTruthy();

      // Second request - should hit cache
      const response2 = await request(app)
        .get(`/api/recipes?search=${searchTerm}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response2.body).toEqual(response1.body);

      // Verify cache metrics
      const metrics = redisService.getMetrics();
      expect(metrics.hitCount).toBeGreaterThan(0);
    });

    it('should cache individual recipe fetches', async () => {
      // First create a test recipe
      const recipeData = {
        name: 'Test Chicken Recipe',
        description: 'A delicious test recipe',
        ingredients: [{ name: 'Chicken', amount: '2 lbs', unit: 'pounds' }],
        instructions: ['Cook the chicken', 'Season to taste'],
        prepTime: 15,
        cookTime: 30,
        servings: 4,
        nutrition: {
          calories: 300,
          protein: 25,
          carbs: 10,
          fat: 15,
          fiber: 2,
          sugar: 5,
          sodium: 500
        },
        mainIngredients: ['chicken'],
        mealType: ['dinner'],
        dietaryTags: ['high-protein']
      };

      const createResponse = await request(app)
        .post('/api/recipes/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(recipeData)
        .expect(200);

      const recipeId = createResponse.body.recipe.id;
      const cacheKey = `recipe:${recipeId}`;

      // First fetch - should hit database
      const response1 = await request(app)
        .get(`/api/recipes/${recipeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify cache was populated
      const cachedRecipe = await redisService.get(cacheKey);
      expect(cachedRecipe).toBeTruthy();
      expect(cachedRecipe.id).toBe(recipeId);

      // Second fetch - should hit cache
      const response2 = await request(app)
        .get(`/api/recipes/${recipeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response2.body).toEqual(response1.body);
    });

    it('should handle cache misses gracefully', async () => {
      const nonExistentId = 'non-existent-recipe-id';

      const response = await request(app)
        .get(`/api/recipes/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.error).toContain('not found');

      // Verify no cache pollution
      const cachedResult = await redisService.get(`recipe:${nonExistentId}`);
      expect(cachedResult).toBeNull();
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate recipe cache when recipe is updated', async () => {
      // Create test recipe
      const recipeData = {
        name: 'Original Recipe',
        description: 'Original description',
        ingredients: [{ name: 'Chicken', amount: '1 lb', unit: 'pound' }],
        instructions: ['Cook chicken'],
        prepTime: 10,
        cookTime: 20,
        servings: 2,
        nutrition: { calories: 200, protein: 20, carbs: 5, fat: 10, fiber: 1, sugar: 2, sodium: 300 },
        mainIngredients: ['chicken'],
        mealType: ['dinner'],
        dietaryTags: []
      };

      const createResponse = await request(app)
        .post('/api/recipes/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(recipeData)
        .expect(200);

      const recipeId = createResponse.body.recipe.id;

      // Cache the recipe
      await request(app)
        .get(`/api/recipes/${recipeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify it's cached
      let cachedRecipe = await redisService.get(`recipe:${recipeId}`);
      expect(cachedRecipe).toBeTruthy();
      expect(cachedRecipe.name).toBe('Original Recipe');

      // Update the recipe
      const updateResponse = await request(app)
        .put(`/api/recipes/${recipeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...recipeData,
          name: 'Updated Recipe'
        })
        .expect(200);

      // Verify cache was invalidated
      cachedRecipe = await redisService.get(`recipe:${recipeId}`);
      expect(cachedRecipe).toBeNull();

      // Next fetch should get updated version
      const fetchResponse = await request(app)
        .get(`/api/recipes/${recipeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(fetchResponse.body.recipe.name).toBe('Updated Recipe');
    });

    it('should invalidate search cache when recipes are modified', async () => {
      const searchTerm = 'unique-test-recipe';
      
      // Initial search - should return empty
      const initialSearch = await request(app)
        .get(`/api/recipes?search=${searchTerm}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(initialSearch.body.recipes.length).toBe(0);

      // Create a recipe matching the search term
      const recipeData = {
        name: `Unique Test Recipe for ${searchTerm}`,
        description: 'A unique recipe for testing cache invalidation',
        ingredients: [{ name: 'Test Ingredient', amount: '1', unit: 'cup' }],
        instructions: ['Test instruction'],
        prepTime: 5,
        cookTime: 10,
        servings: 1,
        nutrition: { calories: 100, protein: 10, carbs: 5, fat: 5, fiber: 1, sugar: 1, sodium: 100 },
        mainIngredients: ['test'],
        mealType: ['snack'],
        dietaryTags: []
      };

      await request(app)
        .post('/api/recipes/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(recipeData)
        .expect(200);

      // Search cache should be invalidated, new search should find the recipe
      const updatedSearch = await request(app)
        .get(`/api/recipes?search=${searchTerm}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(updatedSearch.body.recipes.length).toBeGreaterThan(0);
      expect(updatedSearch.body.recipes[0].name).toContain(searchTerm);
    });
  });

  describe('Performance Optimization', () => {
    it('should batch fetch multiple recipes efficiently', async () => {
      // Create multiple test recipes
      const recipeIds: string[] = [];
      
      for (let i = 0; i < 5; i++) {
        const recipeData = {
          name: `Batch Recipe ${i}`,
          description: `Recipe number ${i}`,
          ingredients: [{ name: 'Ingredient', amount: '1', unit: 'cup' }],
          instructions: ['Cook it'],
          prepTime: 5,
          cookTime: 10,
          servings: 1,
          nutrition: { calories: 100, protein: 10, carbs: 5, fat: 5, fiber: 1, sugar: 1, sodium: 100 },
          mainIngredients: ['test'],
          mealType: ['snack'],
          dietaryTags: []
        };

        const response = await request(app)
          .post('/api/recipes/generate')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(recipeData)
          .expect(200);
        
        recipeIds.push(response.body.recipe.id);
      }

      // Measure time for individual fetches (without cache)
      const startTime = Date.now();
      
      for (const id of recipeIds) {
        await request(app)
          .get(`/api/recipes/${id}`)
          .set('Authorization', `Bearer ${adminToken}`);
      }
      
      const individualFetchTime = Date.now() - startTime;

      // Clear cache and measure batch fetch
      await redisService.flushAll();

      const batchStartTime = Date.now();
      
      // Simulate batch recipe fetch (this would be implemented in the actual API)
      const batchResponse = await request(app)
        .post('/api/recipes/batch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: recipeIds })
        .expect(200);

      const batchFetchTime = Date.now() - batchStartTime;

      expect(batchResponse.body.recipes.length).toBe(5);
      
      // Batch fetch should be more efficient
      expect(batchFetchTime).toBeLessThan(individualFetchTime);

      // Verify cache metrics show efficient batch operations
      const metrics = redisService.getMetrics();
      expect(metrics.setCount).toBeGreaterThan(0);
    });

    it('should demonstrate cache warming strategy', async () => {
      // Create popular recipes that should be pre-cached
      const popularRecipeIds: string[] = [];
      
      for (let i = 0; i < 3; i++) {
        const recipeData = {
          name: `Popular Recipe ${i}`,
          description: `A popular recipe ${i}`,
          ingredients: [{ name: 'Popular Ingredient', amount: '1', unit: 'cup' }],
          instructions: ['Popular cooking method'],
          prepTime: 5,
          cookTime: 15,
          servings: 2,
          nutrition: { calories: 150, protein: 12, carbs: 8, fat: 7, fiber: 2, sugar: 3, sodium: 200 },
          mainIngredients: ['popular'],
          mealType: ['dinner'],
          dietaryTags: ['popular']
        };

        const response = await request(app)
          .post('/api/recipes/generate')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(recipeData)
          .expect(200);
        
        popularRecipeIds.push(response.body.recipe.id);
      }

      // Implement cache warming
      const warmupStartTime = Date.now();
      
      await request(app)
        .post('/api/recipes/warmup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ strategy: 'popular', limit: 10 })
        .expect(200);

      const warmupTime = Date.now() - warmupStartTime;

      // Verify recipes are now cached
      for (const id of popularRecipeIds) {
        const cachedRecipe = await redisService.get(`recipe:${id}`);
        expect(cachedRecipe).toBeTruthy();
      }

      // Subsequent fetches should be very fast
      const cachedFetchStartTime = Date.now();
      
      for (const id of popularRecipeIds) {
        await request(app)
          .get(`/api/recipes/${id}`)
          .set('Authorization', `Bearer ${adminToken}`);
      }
      
      const cachedFetchTime = Date.now() - cachedFetchStartTime;

      // Cached fetches should be significantly faster
      expect(cachedFetchTime).toBeLessThan(warmupTime / 2);

      // Verify high cache hit ratio
      const metrics = redisService.getMetrics();
      const hitRatio = metrics.hitCount / (metrics.hitCount + metrics.missCount);
      expect(hitRatio).toBeGreaterThan(0.8); // >80% hit ratio
    });
  });

  describe('Cache TTL and Expiration', () => {
    it('should respect custom TTL values', async () => {
      const shortTtlKey = 'test:short-ttl';
      const testValue = { id: 'test', name: 'Short TTL Test' };

      // Set value with 2 second TTL
      await redisService.set(shortTtlKey, testValue, 2);

      // Should be available immediately
      let cachedValue = await redisService.get(shortTtlKey);
      expect(cachedValue).toEqual(testValue);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Should be expired
      cachedValue = await redisService.get(shortTtlKey);
      expect(cachedValue).toBeNull();
    });

    it('should handle different TTL for different data types', async () => {
      // Recipe cache - long TTL (1 hour)
      await redisService.set('recipe:long-ttl', { id: 'recipe' }, 3600);
      
      // Search results - medium TTL (15 minutes)
      await redisService.set('search:medium-ttl', { results: [] }, 900);
      
      // Session data - short TTL (5 minutes)
      await redisService.set('session:short-ttl', { userId: 'test' }, 300);

      // All should be available
      expect(await redisService.get('recipe:long-ttl')).toBeTruthy();
      expect(await redisService.get('search:medium-ttl')).toBeTruthy();
      expect(await redisService.get('session:short-ttl')).toBeTruthy();
      
      // Verify TTL is set correctly in Redis
      // (In a real test, you might check the TTL using Redis commands)
    });
  });

  describe('Concurrent Access', () => {
    it('should handle concurrent cache access correctly', async () => {
      const cacheKey = 'concurrent:test';
      let fetcherCallCount = 0;

      const fetcher = async () => {
        fetcherCallCount++;
        // Simulate database fetch delay
        await new Promise(resolve => setTimeout(resolve, 100));
        return { id: 'concurrent', callCount: fetcherCallCount };
      };

      // Launch 10 concurrent requests for the same data
      const promises = Array.from({ length: 10 }, () => 
        redisService.getOrSet(cacheKey, fetcher)
      );

      const results = await Promise.all(promises);

      // All results should be the same
      const firstResult = results[0];
      results.forEach(result => {
        expect(result).toEqual(firstResult);
      });

      // Fetcher should only be called once (cache stampede prevention)
      expect(fetcherCallCount).toBe(1);
    });
  });
});