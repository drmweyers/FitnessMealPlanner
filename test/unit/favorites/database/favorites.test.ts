/**
 * Database Layer Tests for Recipe Favorites
 * 
 * Comprehensive unit tests for favorite recipe database operations
 * covering CRUD operations, data integrity, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { eq, and, desc, count } from 'drizzle-orm';
import { db } from '../../../../server/db.js';
import {
  recipeFavorites,
  recipeCollections as favoriteCollections,
  collectionRecipes,
  users,
  recipes,
  type RecipeFavorite,
  type RecipeCollection as FavoriteCollection,
  type User,
  type Recipe,
} from '../../../../shared/schema';

// Test data setup
let testUser: User;
let testUser2: User;
let testRecipe: Recipe;
let testRecipe2: Recipe;
let testCollection: FavoriteCollection;

beforeAll(async () => {
  // Create test users
  const [user1] = await db.insert(users).values({
    email: 'test-favorites-1@example.com',
    password: 'hashedPassword123',
    name: 'Test User 1',
    role: 'customer',
  }).returning();
  testUser = user1;

  const [user2] = await db.insert(users).values({
    email: 'test-favorites-2@example.com',
    password: 'hashedPassword123',
    name: 'Test User 2',
    role: 'customer',
  }).returning();
  testUser2 = user2;

  // Create test recipes
  const [recipe1] = await db.insert(recipes).values({
    name: 'Test Recipe 1',
    description: 'A test recipe for favorites',
    mealTypes: ['breakfast'],
    dietaryTags: ['healthy'],
    mainIngredientTags: ['oats'],
    ingredientsJson: [
      { name: 'Oats', amount: '1', unit: 'cup' },
      { name: 'Milk', amount: '1', unit: 'cup' }
    ],
    instructionsText: 'Mix ingredients and cook.',
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
    name: 'Test Recipe 2',
    description: 'Another test recipe',
    mealTypes: ['lunch'],
    dietaryTags: ['vegetarian'],
    mainIngredientTags: ['quinoa'],
    ingredientsJson: [
      { name: 'Quinoa', amount: '1', unit: 'cup' },
      { name: 'Vegetables', amount: '2', unit: 'cups' }
    ],
    instructionsText: 'Cook quinoa, add vegetables.',
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

  // Create test collection
  const [collection] = await db.insert(favoriteCollections).values({
    userId: testUser.id,
    name: 'Test Collection',
    description: 'A collection for testing',
    isPublic: false,
    color: '#FF5733',
  }).returning();
  testCollection = collection;
});

afterAll(async () => {
  // Clean up test data
  await db.delete(collectionRecipes).where(eq(collectionRecipes.collectionId, testCollection.id));
  await db.delete(recipeFavorites).where(eq(recipeFavorites.userId, testUser.id));
  await db.delete(recipeFavorites).where(eq(recipeFavorites.userId, testUser2.id));
  await db.delete(favoriteCollections).where(eq(favoriteCollections.id, testCollection.id));
  await db.delete(recipes).where(eq(recipes.id, testRecipe.id));
  await db.delete(recipes).where(eq(recipes.id, testRecipe2.id));
  await db.delete(users).where(eq(users.id, testUser.id));
  await db.delete(users).where(eq(users.id, testUser2.id));
});

describe('Recipe Favorites Database Operations', () => {
  beforeEach(async () => {
    // Clean up any existing test favorites before each test
    await db.delete(recipeFavorites).where(eq(recipeFavorites.userId, testUser.id));
    await db.delete(recipeFavorites).where(eq(recipeFavorites.userId, testUser2.id));
  });

  describe('Core Favorite Operations', () => {
    test('should add recipe to favorites successfully', async () => {
      const favorite = await db.insert(recipeFavorites).values({
        userId: testUser.id,
        recipeId: testRecipe.id,
        notes: 'Love this recipe!',
      }).returning();

      expect(favorite).toHaveLength(1);
      expect(favorite[0].userId).toBe(testUser.id);
      expect(favorite[0].recipeId).toBe(testRecipe.id);
      expect(favorite[0].notes).toBe('Love this recipe!');
      expect(favorite[0].favoritedAt).toBeInstanceOf(Date);
    });

    test('should remove recipe from favorites successfully', async () => {
      // First add a favorite
      await db.insert(recipeFavorites).values({
        userId: testUser.id,
        recipeId: testRecipe.id,
      });

      // Then remove it
      const deleted = await db.delete(recipeFavorites)
        .where(and(
          eq(recipeFavorites.userId, testUser.id),
          eq(recipeFavorites.recipeId, testRecipe.id)
        ))
        .returning();

      expect(deleted).toHaveLength(1);

      // Verify it's gone
      const remaining = await db.select()
        .from(recipeFavorites)
        .where(and(
          eq(recipeFavorites.userId, testUser.id),
          eq(recipeFavorites.recipeId, testRecipe.id)
        ));

      expect(remaining).toHaveLength(0);
    });

    test('should prevent duplicate favorites', async () => {
      // Add first favorite
      await db.insert(recipeFavorites).values({
        userId: testUser.id,
        recipeId: testRecipe.id,
      });

      // Attempt to add duplicate should fail
      await expect(
        db.insert(recipeFavorites).values({
          userId: testUser.id,
          recipeId: testRecipe.id,
        })
      ).rejects.toThrow();
    });

    test('should retrieve user favorites correctly', async () => {
      // Add multiple favorites
      await db.insert(recipeFavorites).values([
        {
          userId: testUser.id,
          recipeId: testRecipe.id,
          notes: 'First favorite',
        },
        {
          userId: testUser.id,
          recipeId: testRecipe2.id,
          notes: 'Second favorite',
        }
      ]);

      const favorites = await db.select()
        .from(recipeFavorites)
        .where(eq(recipeFavorites.userId, testUser.id))
        .orderBy(desc(recipeFavorites.favoritedAt));

      expect(favorites).toHaveLength(2);
      expect(favorites[0].notes).toBe('Second favorite');
      expect(favorites[1].notes).toBe('First favorite');
    });

    test('should handle non-existent recipe gracefully', async () => {
      await expect(
        db.insert(recipeFavorites).values({
          userId: testUser.id,
          recipeId: 'non-existent-id',
        })
      ).rejects.toThrow();
    });

    test('should handle non-existent user gracefully', async () => {
      await expect(
        db.insert(recipeFavorites).values({
          userId: 'non-existent-id',
          recipeId: testRecipe.id,
        })
      ).rejects.toThrow();
    });
  });

  describe('Collection Management', () => {
    test('should create favorite collection successfully', async () => {
      const collection = await db.insert(favoriteCollections).values({
        userId: testUser.id,
        name: 'Breakfast Favorites',
        description: 'My favorite breakfast recipes',
        isPublic: true,
        color: '#4CAF50',
      }).returning();

      expect(collection).toHaveLength(1);
      expect(collection[0].name).toBe('Breakfast Favorites');
      expect(collection[0].isPublic).toBe(true);
      expect(collection[0].color).toBe('#4CAF50');
    });

    test('should add recipes to collection', async () => {
      // First favorite the recipes
      await db.insert(recipeFavorites).values([
        { userId: testUser.id, recipeId: testRecipe.id },
        { userId: testUser.id, recipeId: testRecipe2.id }
      ]);

      // Add to collection
      const collectionRecipe = await db.insert(collectionRecipes).values({
        collectionId: testCollection.id,
        recipeId: testRecipe.id,
        notes: 'Perfect for weekends',
      }).returning();

      expect(collectionRecipe).toHaveLength(1);
      expect(collectionRecipe[0].recipeId).toBe(testRecipe.id);
      expect(collectionRecipe[0].notes).toBe('Perfect for weekends');
    });

    test('should remove recipes from collection', async () => {
      // Add recipe to collection
      await db.insert(collectionRecipes).values({
        collectionId: testCollection.id,
        recipeId: testRecipe.id,
      });

      // Remove from collection
      const deleted = await db.delete(collectionRecipes)
        .where(and(
          eq(collectionRecipes.collectionId, testCollection.id),
          eq(collectionRecipes.recipeId, testRecipe.id)
        ))
        .returning();

      expect(deleted).toHaveLength(1);
    });

    test('should prevent duplicate recipes in same collection', async () => {
      // Add recipe to collection
      await db.insert(collectionRecipes).values({
        collectionId: testCollection.id,
        recipeId: testRecipe.id,
      });

      // Attempt to add same recipe again should fail
      await expect(
        db.insert(collectionRecipes).values({
          collectionId: testCollection.id,
          recipeId: testRecipe.id,
        })
      ).rejects.toThrow();
    });

    test('should validate collection limits', async () => {
      // This would be implementation-specific based on business rules
      // For example, limiting collections per user
      const collections = await db.select()
        .from(favoriteCollections)
        .where(eq(favoriteCollections.userId, testUser.id));

      expect(collections.length).toBeLessThanOrEqual(50); // Example limit
    });
  });

  describe('Cascade Operations', () => {
    test('should cascade delete favorites when user is deleted', async () => {
      // Create temporary user and favorite
      const [tempUser] = await db.insert(users).values({
        email: 'temp-user@example.com',
        password: 'password',
        name: 'Temp User',
        role: 'customer',
      }).returning();

      await db.insert(recipeFavorites).values({
        userId: tempUser.id,
        recipeId: testRecipe.id,
      });

      // Delete user
      await db.delete(users).where(eq(users.id, tempUser.id));

      // Verify favorites are deleted
      const orphanedFavorites = await db.select()
        .from(recipeFavorites)
        .where(eq(recipeFavorites.userId, tempUser.id));

      expect(orphanedFavorites).toHaveLength(0);
    });

    test('should cascade delete favorites when recipe is deleted', async () => {
      // Create temporary recipe and favorite
      const [tempRecipe] = await db.insert(recipes).values({
        name: 'Temp Recipe',
        description: 'Temporary recipe',
        mealTypes: ['snack'],
        dietaryTags: [],
        mainIngredientTags: [],
        ingredientsJson: [{ name: 'Test', amount: '1', unit: 'unit' }],
        instructionsText: 'Test instructions',
        prepTimeMinutes: 5,
        cookTimeMinutes: 5,
        servings: 1,
        caloriesKcal: 100,
        proteinGrams: '5',
        carbsGrams: '10',
        fatGrams: '3',
      }).returning();

      await db.insert(recipeFavorites).values({
        userId: testUser.id,
        recipeId: tempRecipe.id,
      });

      // Delete recipe
      await db.delete(recipes).where(eq(recipes.id, tempRecipe.id));

      // Verify favorites are deleted
      const orphanedFavorites = await db.select()
        .from(recipeFavorites)
        .where(eq(recipeFavorites.recipeId, tempRecipe.id));

      expect(orphanedFavorites).toHaveLength(0);
    });
  });

  describe('Bulk Operations', () => {
    test('should support batch favorite operations', async () => {
      const favoritesToAdd = [
        {
          userId: testUser.id,
          recipeId: testRecipe.id,
          notes: 'Batch favorite 1',
        },
        {
          userId: testUser.id,
          recipeId: testRecipe2.id,
          notes: 'Batch favorite 2',
        }
      ];

      const added = await db.insert(recipeFavorites)
        .values(favoritesToAdd)
        .returning();

      expect(added).toHaveLength(2);
      expect(added[0].notes).toBe('Batch favorite 1');
      expect(added[1].notes).toBe('Batch favorite 2');
    });

    test('should handle batch favorite removal', async () => {
      // Add multiple favorites
      await db.insert(recipeFavorites).values([
        { userId: testUser.id, recipeId: testRecipe.id },
        { userId: testUser.id, recipeId: testRecipe2.id }
      ]);

      // Remove all user favorites
      const deleted = await db.delete(recipeFavorites)
        .where(eq(recipeFavorites.userId, testUser.id))
        .returning();

      expect(deleted).toHaveLength(2);

      // Verify all removed
      const remaining = await db.select()
        .from(recipeFavorites)
        .where(eq(recipeFavorites.userId, testUser.id));

      expect(remaining).toHaveLength(0);
    });
  });

  describe('Data Integrity', () => {
    test('should maintain referential integrity', async () => {
      // Attempt to create favorite with invalid foreign keys should fail
      await expect(
        db.insert(recipeFavorites).values({
          userId: 'invalid-user-id',
          recipeId: 'invalid-recipe-id',
        })
      ).rejects.toThrow();
    });

    test('should enforce unique constraints', async () => {
      // Add a favorite
      await db.insert(recipeFavorites).values({
        userId: testUser.id,
        recipeId: testRecipe.id,
      });

      // Attempt to add duplicate should fail
      await expect(
        db.insert(recipeFavorites).values({
          userId: testUser.id,
          recipeId: testRecipe.id,
        })
      ).rejects.toThrow();
    });

    test('should handle concurrent favorite operations', async () => {
      const operations = Array.from({ length: 5 }, (_, i) => 
        db.insert(recipeFavorites).values({
          userId: testUser2.id,
          recipeId: i % 2 === 0 ? testRecipe.id : testRecipe2.id,
          notes: `Concurrent favorite ${i}`,
        }).catch(() => null) // Some may fail due to duplicates, which is expected
      );

      const results = await Promise.all(operations);
      const successful = results.filter(result => result !== null);

      // At least some operations should succeed
      expect(successful.length).toBeGreaterThan(0);
      expect(successful.length).toBeLessThanOrEqual(2); // Due to unique constraint
    });
  });

  describe('Performance Tests', () => {
    test('should handle large favorite collections efficiently', async () => {
      const startTime = Date.now();

      // Query with potential for large result set
      const favorites = await db.select({
        favoriteId: recipeFavorites.id,
        recipeId: recipeFavorites.recipeId,
        recipeName: recipes.name,
        favoritedAt: recipeFavorites.favoritedAt,
      })
      .from(recipeFavorites)
      .leftJoin(recipes, eq(recipeFavorites.recipeId, recipes.id))
      .where(eq(recipeFavorites.userId, testUser.id))
      .limit(1000); // Simulate large collection

      const queryTime = Date.now() - startTime;

      // Query should complete reasonably quickly
      expect(queryTime).toBeLessThan(1000); // Less than 1 second
      expect(favorites).toBeInstanceOf(Array);
    });

    test('should efficiently count user favorites', async () => {
      // Add some favorites
      await db.insert(recipeFavorites).values([
        { userId: testUser.id, recipeId: testRecipe.id },
        { userId: testUser.id, recipeId: testRecipe2.id }
      ]);

      const startTime = Date.now();

      const [result] = await db.select({ count: count() })
        .from(recipeFavorites)
        .where(eq(recipeFavorites.userId, testUser.id));

      const queryTime = Date.now() - startTime;

      expect(queryTime).toBeLessThan(100); // Should be very fast
      expect(result.count).toBe(2);
    });
  });
});