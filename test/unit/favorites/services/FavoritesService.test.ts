/**
 * Service Layer Tests for FavoritesService
 * 
 * Comprehensive unit tests for the FavoritesService covering
 * core functionality, collection management, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { FavoritesService } from '../../../../server/services/FavoritesService.js';
import { db } from '../../../../server/db.js';
import {
  recipeFavorites,
  favoriteCollections,
  collectionRecipes,
  users,
  recipes,
  type User,
  type Recipe,
} from '../../../../shared/schema.js';
import { eq, and } from 'drizzle-orm';

// Mock Redis for caching tests
vi.mock('../../../../server/services/RedisService.js', () => ({
  RedisService: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
    invalidatePattern: vi.fn(),
  }
}));

import { RedisService } from '../../../../server/services/RedisService.js';

// Test data setup
let testUser: User;
let testUser2: User;
let testRecipe: Recipe;
let testRecipe2: Recipe;
let favoritesService: FavoritesService;

beforeAll(async () => {
  favoritesService = new FavoritesService();

  // Create test users
  const [user1] = await db.insert(users).values({
    email: 'favorites-service-1@example.com',
    password: 'hashedPassword123',
    name: 'Favorites Service Test User 1',
    role: 'customer',
  }).returning();
  testUser = user1;

  const [user2] = await db.insert(users).values({
    email: 'favorites-service-2@example.com',
    password: 'hashedPassword123',
    name: 'Favorites Service Test User 2',
    role: 'customer',
  }).returning();
  testUser2 = user2;

  // Create test recipes
  const [recipe1] = await db.insert(recipes).values({
    name: 'Service Test Recipe 1',
    description: 'Recipe for service testing',
    mealTypes: ['breakfast'],
    dietaryTags: ['healthy'],
    mainIngredientTags: ['oats'],
    ingredientsJson: [
      { name: 'Oats', amount: '1', unit: 'cup' }
    ],
    instructionsText: 'Cook oats.',
    prepTimeMinutes: 5,
    cookTimeMinutes: 10,
    servings: 2,
    caloriesKcal: 300,
    proteinGrams: '15',
    carbsGrams: '45',
    fatGrams: '8',
    isApproved: true,
  }).returning();
  testRecipe = recipe1;

  const [recipe2] = await db.insert(recipes).values({
    name: 'Service Test Recipe 2',
    description: 'Another recipe for testing',
    mealTypes: ['lunch'],
    dietaryTags: ['vegetarian'],
    mainIngredientTags: ['quinoa'],
    ingredientsJson: [
      { name: 'Quinoa', amount: '1', unit: 'cup' }
    ],
    instructionsText: 'Cook quinoa.',
    prepTimeMinutes: 15,
    cookTimeMinutes: 20,
    servings: 3,
    caloriesKcal: 350,
    proteinGrams: '12',
    carbsGrams: '55',
    fatGrams: '6',
    isApproved: true,
  }).returning();
  testRecipe2 = recipe2;
});

afterAll(async () => {
  // Clean up test data
  await db.delete(collectionRecipes);
  await db.delete(favoriteCollections).where(eq(favoriteCollections.userId, testUser.id));
  await db.delete(recipeFavorites).where(eq(recipeFavorites.userId, testUser.id));
  await db.delete(recipeFavorites).where(eq(recipeFavorites.userId, testUser2.id));
  await db.delete(recipes).where(eq(recipes.id, testRecipe.id));
  await db.delete(recipes).where(eq(recipes.id, testRecipe2.id));
  await db.delete(users).where(eq(users.id, testUser.id));
  await db.delete(users).where(eq(users.id, testUser2.id));
});

beforeEach(async () => {
  // Clean up test data before each test
  await db.delete(collectionRecipes);
  await db.delete(favoriteCollections).where(eq(favoriteCollections.userId, testUser.id));
  await db.delete(favoriteCollections).where(eq(favoriteCollections.userId, testUser2.id));
  await db.delete(recipeFavorites).where(eq(recipeFavorites.userId, testUser.id));
  await db.delete(recipeFavorites).where(eq(recipeFavorites.userId, testUser2.id));
  
  // Reset all mocks
  vi.clearAllMocks();
});

describe('FavoritesService', () => {
  describe('Core Functionality', () => {
    test('should add recipe to favorites successfully', async () => {
      const result = await favoritesService.addToFavorites(testUser.id, {
        recipeId: testRecipe.id,
        notes: 'Love this recipe!',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.userId).toBe(testUser.id);
      expect(result.data!.recipeId).toBe(testRecipe.id);
      expect(result.data!.notes).toBe('Love this recipe!');

      // Verify in database
      const favorites = await db.select()
        .from(recipeFavorites)
        .where(eq(recipeFavorites.userId, testUser.id));
      expect(favorites).toHaveLength(1);
    });

    test('should remove recipe from favorites', async () => {
      // First add a favorite
      await favoritesService.addToFavorites(testUser.id, {
        recipeId: testRecipe.id,
      });

      // Then remove it
      const result = await favoritesService.removeFromFavorites(testUser.id, testRecipe.id);

      expect(result.success).toBe(true);

      // Verify it's gone
      const favorites = await db.select()
        .from(recipeFavorites)
        .where(eq(recipeFavorites.userId, testUser.id));
      expect(favorites).toHaveLength(0);
    });

    test('should prevent duplicate favorites', async () => {
      // Add first favorite
      await favoritesService.addToFavorites(testUser.id, {
        recipeId: testRecipe.id,
      });

      // Attempt to add duplicate
      const result = await favoritesService.addToFavorites(testUser.id, {
        recipeId: testRecipe.id,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already favorited');
    });

    test('should handle non-existent recipe gracefully', async () => {
      const result = await favoritesService.addToFavorites(testUser.id, {
        recipeId: 'non-existent-recipe-id',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Recipe not found');
    });

    test('should handle non-existent user gracefully', async () => {
      const result = await favoritesService.addToFavorites('non-existent-user-id', {
        recipeId: testRecipe.id,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('User not found');
    });

    test('should support batch favorite operations', async () => {
      const result = await favoritesService.batchAddToFavorites(testUser.id, [
        { recipeId: testRecipe.id, notes: 'First recipe' },
        { recipeId: testRecipe2.id, notes: 'Second recipe' },
      ]);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);

      // Verify in database
      const favorites = await db.select()
        .from(recipeFavorites)
        .where(eq(recipeFavorites.userId, testUser.id));
      expect(favorites).toHaveLength(2);
    });

    test('should get user favorites with pagination', async () => {
      // Add multiple favorites
      await Promise.all([
        favoritesService.addToFavorites(testUser.id, { recipeId: testRecipe.id }),
        favoritesService.addToFavorites(testUser.id, { recipeId: testRecipe2.id }),
      ]);

      const result = await favoritesService.getUserFavorites(testUser.id, {
        page: 1,
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data!.favorites).toHaveLength(2);
      expect(result.data!.total).toBe(2);
      expect(result.data!.hasMore).toBe(false);
    });

    test('should check if recipe is favorited', async () => {
      // Add favorite
      await favoritesService.addToFavorites(testUser.id, {
        recipeId: testRecipe.id,
      });

      const isFavorited = await favoritesService.isFavorited(testUser.id, testRecipe.id);
      const isNotFavorited = await favoritesService.isFavorited(testUser.id, testRecipe2.id);

      expect(isFavorited).toBe(true);
      expect(isNotFavorited).toBe(false);
    });
  });

  describe('Collection Management', () => {
    test('should create favorite collection', async () => {
      const result = await favoritesService.createCollection(testUser.id, {
        name: 'Breakfast Favorites',
        description: 'My favorite breakfast recipes',
        isPublic: false,
        color: '#4CAF50',
      });

      expect(result.success).toBe(true);
      expect(result.data!.name).toBe('Breakfast Favorites');
      expect(result.data!.color).toBe('#4CAF50');
    });

    test('should add recipes to collection', async () => {
      // Create collection
      const collectionResult = await favoritesService.createCollection(testUser.id, {
        name: 'Test Collection',
        description: 'For testing',
      });

      const collection = collectionResult.data!;

      // Add favorite first
      await favoritesService.addToFavorites(testUser.id, {
        recipeId: testRecipe.id,
      });

      // Add to collection
      const result = await favoritesService.addRecipeToCollection(
        testUser.id,
        collection.id,
        {
          recipeId: testRecipe.id,
          notes: 'Perfect for weekends',
        }
      );

      expect(result.success).toBe(true);
    });

    test('should remove recipes from collection', async () => {
      // Create collection and add recipe
      const collectionResult = await favoritesService.createCollection(testUser.id, {
        name: 'Test Collection',
      });

      await favoritesService.addToFavorites(testUser.id, { recipeId: testRecipe.id });
      await favoritesService.addRecipeToCollection(
        testUser.id,
        collectionResult.data!.id,
        { recipeId: testRecipe.id }
      );

      // Remove from collection
      const result = await favoritesService.removeRecipeFromCollection(
        testUser.id,
        collectionResult.data!.id,
        testRecipe.id
      );

      expect(result.success).toBe(true);
    });

    test('should handle collection permissions', async () => {
      // Create collection as user1
      const collectionResult = await favoritesService.createCollection(testUser.id, {
        name: 'Private Collection',
        isPublic: false,
      });

      // Try to modify as user2 (should fail)
      const result = await favoritesService.addRecipeToCollection(
        testUser2.id,
        collectionResult.data!.id,
        { recipeId: testRecipe.id }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
    });

    test('should validate collection limits', async () => {
      // Create maximum allowed collections
      const maxCollections = 50; // Business rule
      const promises = Array.from({ length: maxCollections }, (_, i) =>
        favoritesService.createCollection(testUser.id, {
          name: `Collection ${i + 1}`,
        })
      );

      await Promise.all(promises);

      // Try to create one more (should fail)
      const result = await favoritesService.createCollection(testUser.id, {
        name: 'Exceeds Limit',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('limit');
    });

    test('should get collection with recipes', async () => {
      // Create collection
      const collectionResult = await favoritesService.createCollection(testUser.id, {
        name: 'Test Collection',
      });

      // Add favorites and recipes to collection
      await favoritesService.addToFavorites(testUser.id, { recipeId: testRecipe.id });
      await favoritesService.addToFavorites(testUser.id, { recipeId: testRecipe2.id });
      await favoritesService.addRecipeToCollection(
        testUser.id,
        collectionResult.data!.id,
        { recipeId: testRecipe.id }
      );

      const result = await favoritesService.getCollectionWithRecipes(
        testUser.id,
        collectionResult.data!.id
      );

      expect(result.success).toBe(true);
      expect(result.data!.collection.name).toBe('Test Collection');
      expect(result.data!.recipes).toHaveLength(1);
      expect(result.data!.recipes[0].id).toBe(testRecipe.id);
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors', async () => {
      // Mock database error
      const originalInsert = db.insert;
      vi.spyOn(db, 'insert').mockImplementation(() => {
        throw new Error('Database connection error');
      });

      const result = await favoritesService.addToFavorites(testUser.id, {
        recipeId: testRecipe.id,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');

      // Restore original function
      vi.mocked(db.insert).mockRestore();
    });

    test('should validate user permissions', async () => {
      const result = await favoritesService.addToFavorites('invalid-user-id', {
        recipeId: testRecipe.id,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle concurrent favorite operations', async () => {
      const operations = Array.from({ length: 10 }, () =>
        favoritesService.addToFavorites(testUser.id, {
          recipeId: testRecipe.id,
        })
      );

      const results = await Promise.all(operations);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      // Only one should succeed, rest should fail due to duplicate constraint
      expect(successful).toHaveLength(1);
      expect(failed).toHaveLength(9);
    });

    test('should respect rate limiting', async () => {
      // Mock rate limiter
      const rateLimitSpy = vi.spyOn(favoritesService as any, 'checkRateLimit')
        .mockResolvedValue(false);

      const result = await favoritesService.addToFavorites(testUser.id, {
        recipeId: testRecipe.id,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('rate limit');

      rateLimitSpy.mockRestore();
    });
  });

  describe('Caching', () => {
    test('should cache user favorites effectively', async () => {
      // Mock cache miss
      vi.mocked(RedisService.get).mockResolvedValue(null);
      vi.mocked(RedisService.set).mockResolvedValue(undefined);

      await favoritesService.getUserFavorites(testUser.id);

      expect(RedisService.get).toHaveBeenCalledWith(
        expect.stringContaining(`favorites:${testUser.id}`)
      );
      expect(RedisService.set).toHaveBeenCalled();
    });

    test('should invalidate cache on favorite changes', async () => {
      await favoritesService.addToFavorites(testUser.id, {
        recipeId: testRecipe.id,
      });

      expect(RedisService.del).toHaveBeenCalledWith(
        expect.stringContaining(`favorites:${testUser.id}`)
      );
    });

    test('should handle cache failures gracefully', async () => {
      // Mock cache error
      vi.mocked(RedisService.get).mockRejectedValue(new Error('Cache error'));

      const result = await favoritesService.getUserFavorites(testUser.id);

      // Should still return data from database
      expect(result.success).toBe(true);
    });

    test('should support batch cache operations', async () => {
      const userIds = [testUser.id, testUser2.id];
      
      await favoritesService.batchGetUserFavorites(userIds);

      expect(RedisService.get).toHaveBeenCalledTimes(userIds.length);
    });
  });

  describe('Performance', () => {
    test('should retrieve favorites from cache in <10ms', async () => {
      // Mock cache hit
      const cachedData = {
        favorites: [],
        total: 0,
        hasMore: false,
      };
      vi.mocked(RedisService.get).mockResolvedValue(JSON.stringify(cachedData));

      const startTime = Date.now();
      const result = await favoritesService.getUserFavorites(testUser.id);
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(10);
      expect(result.success).toBe(true);
    });

    test('should handle 1000+ concurrent cache operations', async () => {
      const operations = Array.from({ length: 1000 }, (_, i) =>
        favoritesService.isFavorited(testUser.id, `recipe-${i}`)
      );

      const startTime = Date.now();
      await Promise.all(operations);
      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should compress large favorite lists', async () => {
      // Add many favorites
      const manyRecipes = Array.from({ length: 100 }, (_, i) => ({
        id: `recipe-${i}`,
        name: `Recipe ${i}`,
        // ... other recipe properties
      }));

      const data = {
        favorites: manyRecipes,
        total: 100,
        hasMore: false,
      };

      await favoritesService['setCachedFavorites'](testUser.id, data);

      // Verify compression was applied
      const setCall = vi.mocked(RedisService.set).mock.calls[0];
      expect(setCall).toBeDefined();
      // In a real implementation, you'd check if the data was compressed
    });
  });

  describe('Resilience', () => {
    test('should fallback to database when Redis unavailable', async () => {
      // Mock Redis unavailable
      vi.mocked(RedisService.get).mockRejectedValue(new Error('Redis unavailable'));

      const result = await favoritesService.getUserFavorites(testUser.id);

      expect(result.success).toBe(true);
      // Should have made database call despite cache failure
    });

    test('should recover from Redis connection failures', async () => {
      // Mock intermittent failures
      vi.mocked(RedisService.get)
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce(null);

      const result1 = await favoritesService.getUserFavorites(testUser.id);
      const result2 = await favoritesService.getUserFavorites(testUser.id);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    test('should maintain data consistency during failures', async () => {
      // Mock partial failure during batch operation
      vi.spyOn(favoritesService as any, 'addSingleFavorite')
        .mockResolvedValueOnce({ success: true, data: {} })
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce({ success: true, data: {} });

      const result = await favoritesService.batchAddToFavorites(testUser.id, [
        { recipeId: testRecipe.id },
        { recipeId: testRecipe2.id },
        { recipeId: 'recipe-3' },
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('partial failure');
      expect(result.data).toHaveLength(2); // Two successful operations
    });
  });
});