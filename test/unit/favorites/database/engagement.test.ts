/**
 * Database Layer Tests for Recipe Engagement Analytics
 * 
 * Comprehensive unit tests for recipe engagement tracking,
 * analytics operations, and trending calculations.
 */

import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { eq, and, desc, count, sum, avg, gte, lte, sql } from 'drizzle-orm';
import { db } from '../../../../server/db';
import {
  recipeInteractions,
  recipeRecommendations,
  userActivitySessions,
  users,
  recipes,
  type RecipeInteraction,
  type RecipeRecommendation,
  type UserActivitySession,
  type User,
  type Recipe,
} from '../../../../shared/schema';

// Test data setup
let testUser: User;
let testUser2: User;
let testRecipe: Recipe;
let testRecipe2: Recipe;

beforeAll(async () => {
  // Create test users
  const [user1] = await db.insert(users).values({
    email: 'test-engagement-1@example.com',
    password: 'hashedPassword123',
    name: 'Engagement Test User 1',
    role: 'customer',
  }).returning();
  testUser = user1;

  const [user2] = await db.insert(users).values({
    email: 'test-engagement-2@example.com',
    password: 'hashedPassword123',
    name: 'Engagement Test User 2',
    role: 'customer',
  }).returning();
  testUser2 = user2;

  // Create test recipes
  const [recipe1] = await db.insert(recipes).values({
    name: 'Engagement Test Recipe 1',
    description: 'Recipe for engagement testing',
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
    name: 'Engagement Test Recipe 2',
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
  await db.delete(recipeViews).where(eq(recipeViews.recipeId, testRecipe.id));
  await db.delete(recipeViews).where(eq(recipeViews.recipeId, testRecipe2.id));
  await db.delete(recipeRatings).where(eq(recipeRatings.recipeId, testRecipe.id));
  await db.delete(recipeRatings).where(eq(recipeRatings.recipeId, testRecipe2.id));
  await db.delete(userInteractions).where(eq(userInteractions.userId, testUser.id));
  await db.delete(userInteractions).where(eq(userInteractions.userId, testUser2.id));
  await db.delete(recipeShares).where(eq(recipeShares.recipeId, testRecipe.id));
  await db.delete(recipeShares).where(eq(recipeShares.recipeId, testRecipe2.id));
  await db.delete(recipes).where(eq(recipes.id, testRecipe.id));
  await db.delete(recipes).where(eq(recipes.id, testRecipe2.id));
  await db.delete(users).where(eq(users.id, testUser.id));
  await db.delete(users).where(eq(users.id, testUser2.id));
});

beforeEach(async () => {
  // Clean up engagement data before each test
  await db.delete(recipeViews).where(eq(recipeViews.recipeId, testRecipe.id));
  await db.delete(recipeViews).where(eq(recipeViews.recipeId, testRecipe2.id));
  await db.delete(recipeRatings).where(eq(recipeRatings.recipeId, testRecipe.id));
  await db.delete(recipeRatings).where(eq(recipeRatings.recipeId, testRecipe2.id));
  await db.delete(userInteractions).where(eq(userInteractions.userId, testUser.id));
  await db.delete(userInteractions).where(eq(userInteractions.userId, testUser2.id));
  await db.delete(recipeShares).where(eq(recipeShares.recipeId, testRecipe.id));
  await db.delete(recipeShares).where(eq(recipeShares.recipeId, testRecipe2.id));
});

describe('Recipe Engagement Analytics Database Operations', () => {
  describe('Recipe View Tracking', () => {
    test('should track recipe views accurately', async () => {
      const view = await db.insert(recipeViews).values({
        recipeId: testRecipe.id,
        userId: testUser.id,
        sessionId: 'session-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        viewDurationSeconds: 45,
      }).returning();

      expect(view).toHaveLength(1);
      expect(view[0].recipeId).toBe(testRecipe.id);
      expect(view[0].userId).toBe(testUser.id);
      expect(view[0].viewDurationSeconds).toBe(45);
      expect(view[0].viewedAt).toBeInstanceOf(Date);
    });

    test('should track anonymous recipe views', async () => {
      const view = await db.insert(recipeViews).values({
        recipeId: testRecipe.id,
        sessionId: 'anonymous-session-456',
        ipAddress: '10.0.0.1',
        userAgent: 'Chrome/91.0...',
        viewDurationSeconds: 30,
      }).returning();

      expect(view).toHaveLength(1);
      expect(view[0].userId).toBeNull();
      expect(view[0].sessionId).toBe('anonymous-session-456');
    });

    test('should aggregate recipe view counts', async () => {
      // Add multiple views
      await db.insert(recipeViews).values([
        {
          recipeId: testRecipe.id,
          userId: testUser.id,
          sessionId: 'session-1',
          viewDurationSeconds: 30,
        },
        {
          recipeId: testRecipe.id,
          userId: testUser2.id,
          sessionId: 'session-2',
          viewDurationSeconds: 45,
        },
        {
          recipeId: testRecipe.id,
          sessionId: 'anonymous-session',
          ipAddress: '192.168.1.100',
          viewDurationSeconds: 20,
        }
      ]);

      const [result] = await db.select({
        totalViews: count(),
        avgDuration: avg(recipeViews.viewDurationSeconds),
      })
      .from(recipeViews)
      .where(eq(recipeViews.recipeId, testRecipe.id));

      expect(result.totalViews).toBe(3);
      expect(Number(result.avgDuration)).toBeCloseTo(31.67, 1);
    });

    test('should handle high-frequency view tracking', async () => {
      const startTime = Date.now();
      
      // Simulate rapid view tracking
      const viewPromises = Array.from({ length: 100 }, (_, i) =>
        db.insert(recipeViews).values({
          recipeId: testRecipe.id,
          sessionId: `session-${i}`,
          ipAddress: `192.168.1.${i % 255}`,
          viewDurationSeconds: Math.floor(Math.random() * 120),
        })
      );

      await Promise.all(viewPromises);
      const insertTime = Date.now() - startTime;

      // Verify all views were inserted
      const [count_result] = await db.select({ count: count() })
        .from(recipeViews)
        .where(eq(recipeViews.recipeId, testRecipe.id));

      expect(count_result.count).toBe(100);
      expect(insertTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Recipe Ratings', () => {
    test('should store recipe ratings correctly', async () => {
      const rating = await db.insert(recipeRatings).values({
        recipeId: testRecipe.id,
        userId: testUser.id,
        rating: 5,
        review: 'Excellent recipe! Loved the flavors.',
      }).returning();

      expect(rating).toHaveLength(1);
      expect(rating[0].rating).toBe(5);
      expect(rating[0].review).toBe('Excellent recipe! Loved the flavors.');
    });

    test('should prevent duplicate ratings from same user', async () => {
      // Add first rating
      await db.insert(recipeRatings).values({
        recipeId: testRecipe.id,
        userId: testUser.id,
        rating: 4,
      });

      // Attempt to add second rating should fail due to unique constraint
      await expect(
        db.insert(recipeRatings).values({
          recipeId: testRecipe.id,
          userId: testUser.id,
          rating: 5,
        })
      ).rejects.toThrow();
    });

    test('should calculate average ratings correctly', async () => {
      // Add multiple ratings
      await db.insert(recipeRatings).values([
        { recipeId: testRecipe.id, userId: testUser.id, rating: 5 },
        { recipeId: testRecipe.id, userId: testUser2.id, rating: 4 },
      ]);

      const [result] = await db.select({
        avgRating: avg(recipeRatings.rating),
        totalRatings: count(),
      })
      .from(recipeRatings)
      .where(eq(recipeRatings.recipeId, testRecipe.id));

      expect(Number(result.avgRating)).toBe(4.5);
      expect(result.totalRatings).toBe(2);
    });

    test('should update existing ratings', async () => {
      // Add initial rating
      await db.insert(recipeRatings).values({
        recipeId: testRecipe.id,
        userId: testUser.id,
        rating: 3,
        review: 'Initial review',
      });

      // Update rating
      const updated = await db.update(recipeRatings)
        .set({
          rating: 5,
          review: 'Updated review - much better!',
          updatedAt: new Date(),
        })
        .where(and(
          eq(recipeRatings.recipeId, testRecipe.id),
          eq(recipeRatings.userId, testUser.id)
        ))
        .returning();

      expect(updated).toHaveLength(1);
      expect(updated[0].rating).toBe(5);
      expect(updated[0].review).toBe('Updated review - much better!');
    });
  });

  describe('User Interactions', () => {
    test('should log user interactions correctly', async () => {
      const interaction = await db.insert(userInteractions).values({
        userId: testUser.id,
        sessionId: 'session-abc',
        interactionType: 'recipe_search',
        targetType: 'recipe',
        targetId: testRecipe.id,
        metadata: {
          searchQuery: 'healthy breakfast',
          resultsCount: 15,
          clickPosition: 3,
        },
      }).returning();

      expect(interaction).toHaveLength(1);
      expect(interaction[0].interactionType).toBe('recipe_search');
      expect(interaction[0].metadata).toEqual({
        searchQuery: 'healthy breakfast',
        resultsCount: 15,
        clickPosition: 3,
      });
    });

    test('should track anonymous user interactions', async () => {
      const interaction = await db.insert(userInteractions).values({
        sessionId: 'anonymous-session-xyz',
        interactionType: 'recipe_view',
        targetType: 'recipe',
        targetId: testRecipe.id,
        metadata: { source: 'trending_page' },
      }).returning();

      expect(interaction).toHaveLength(1);
      expect(interaction[0].userId).toBeNull();
      expect(interaction[0].sessionId).toBe('anonymous-session-xyz');
    });

    test('should aggregate interaction data by type', async () => {
      // Add various interactions
      await db.insert(userInteractions).values([
        {
          userId: testUser.id,
          interactionType: 'recipe_view',
          targetType: 'recipe',
          targetId: testRecipe.id,
        },
        {
          userId: testUser.id,
          interactionType: 'recipe_favorite',
          targetType: 'recipe',
          targetId: testRecipe.id,
        },
        {
          userId: testUser2.id,
          interactionType: 'recipe_view',
          targetType: 'recipe',
          targetId: testRecipe.id,
        },
        {
          userId: testUser2.id,
          interactionType: 'recipe_share',
          targetType: 'recipe',
          targetId: testRecipe.id,
        }
      ]);

      // Aggregate by interaction type
      const results = await db.select({
        interactionType: userInteractions.interactionType,
        count: count(),
      })
      .from(userInteractions)
      .where(eq(userInteractions.targetId, testRecipe.id))
      .groupBy(userInteractions.interactionType);

      const aggregated = results.reduce((acc, row) => {
        acc[row.interactionType] = row.count;
        return acc;
      }, {} as Record<string, number>);

      expect(aggregated['recipe_view']).toBe(2);
      expect(aggregated['recipe_favorite']).toBe(1);
      expect(aggregated['recipe_share']).toBe(1);
    });

    test('should handle interaction metadata efficiently', async () => {
      const complexMetadata = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        viewport: { width: 1920, height: 1080 },
        scrollDepth: 75,
        timeOnPage: 120,
        clickPath: ['header', 'recipe-card', 'ingredients-tab'],
        previousPage: '/recipes/search?q=breakfast',
        sessionData: {
          totalPageViews: 8,
          sessionDuration: 1800,
          isReturningUser: true,
        }
      };

      const interaction = await db.insert(userInteractions).values({
        userId: testUser.id,
        interactionType: 'detailed_view',
        targetType: 'recipe',
        targetId: testRecipe.id,
        metadata: complexMetadata,
      }).returning();

      expect(interaction[0].metadata).toEqual(complexMetadata);
    });
  });

  describe('Recipe Sharing', () => {
    test('should track recipe shares correctly', async () => {
      const share = await db.insert(recipeShares).values({
        recipeId: testRecipe.id,
        userId: testUser.id,
        shareMethod: 'social',
      }).returning();

      expect(share).toHaveLength(1);
      expect(share[0].shareMethod).toBe('social');
      expect(share[0].sharedAt).toBeInstanceOf(Date);
    });

    test('should track anonymous shares', async () => {
      const share = await db.insert(recipeShares).values({
        recipeId: testRecipe.id,
        shareMethod: 'link',
      }).returning();

      expect(share).toHaveLength(1);
      expect(share[0].userId).toBeNull();
    });

    test('should aggregate share counts by method', async () => {
      // Add various shares
      await db.insert(recipeShares).values([
        { recipeId: testRecipe.id, userId: testUser.id, shareMethod: 'email' },
        { recipeId: testRecipe.id, userId: testUser2.id, shareMethod: 'social' },
        { recipeId: testRecipe.id, shareMethod: 'link' },
        { recipeId: testRecipe.id, shareMethod: 'email' },
      ]);

      const results = await db.select({
        shareMethod: recipeShares.shareMethod,
        count: count(),
      })
      .from(recipeShares)
      .where(eq(recipeShares.recipeId, testRecipe.id))
      .groupBy(recipeShares.shareMethod);

      const shareCounts = results.reduce((acc, row) => {
        acc[row.shareMethod!] = row.count;
        return acc;
      }, {} as Record<string, number>);

      expect(shareCounts['email']).toBe(2);
      expect(shareCounts['social']).toBe(1);
      expect(shareCounts['link']).toBe(1);
    });
  });

  describe('Performance and Analytics', () => {
    test('should efficiently calculate engagement scores', async () => {
      // Add comprehensive engagement data
      await Promise.all([
        // Views
        db.insert(recipeViews).values([
          { recipeId: testRecipe.id, userId: testUser.id, viewDurationSeconds: 60 },
          { recipeId: testRecipe.id, userId: testUser2.id, viewDurationSeconds: 45 },
          { recipeId: testRecipe.id, sessionId: 'anon1', viewDurationSeconds: 30 },
        ]),
        // Ratings
        db.insert(recipeRatings).values([
          { recipeId: testRecipe.id, userId: testUser.id, rating: 5 },
          { recipeId: testRecipe.id, userId: testUser2.id, rating: 4 },
        ]),
        // Shares
        db.insert(recipeShares).values([
          { recipeId: testRecipe.id, userId: testUser.id, shareMethod: 'social' },
        ]),
        // Interactions
        db.insert(userInteractions).values([
          {
            userId: testUser.id,
            interactionType: 'recipe_favorite',
            targetType: 'recipe',
            targetId: testRecipe.id,
          },
        ])
      ]);

      const startTime = Date.now();

      // Calculate comprehensive engagement metrics
      const [metrics] = await db.select({
        viewCount: sql<number>`(
          SELECT COUNT(*) FROM ${recipeViews} 
          WHERE ${recipeViews.recipeId} = ${testRecipe.id}
        )`,
        avgRating: sql<number>`(
          SELECT AVG(${recipeRatings.rating}) FROM ${recipeRatings} 
          WHERE ${recipeRatings.recipeId} = ${testRecipe.id}
        )`,
        shareCount: sql<number>`(
          SELECT COUNT(*) FROM ${recipeShares} 
          WHERE ${recipeShares.recipeId} = ${testRecipe.id}
        )`,
        favoriteCount: sql<number>`(
          SELECT COUNT(*) FROM ${userInteractions} 
          WHERE ${userInteractions.targetId} = ${testRecipe.id} 
          AND ${userInteractions.interactionType} = 'recipe_favorite'
        )`,
        avgViewDuration: sql<number>`(
          SELECT AVG(${recipeViews.viewDurationSeconds}) FROM ${recipeViews} 
          WHERE ${recipeViews.recipeId} = ${testRecipe.id}
        )`,
      }).limit(1);

      const queryTime = Date.now() - startTime;

      expect(queryTime).toBeLessThan(500); // Should be fast
      expect(metrics.viewCount).toBe(3);
      expect(Number(metrics.avgRating)).toBe(4.5);
      expect(metrics.shareCount).toBe(1);
      expect(metrics.favoriteCount).toBe(1);
      expect(Number(metrics.avgViewDuration)).toBeCloseTo(45, 0);
    });

    test('should handle time-based analytics queries', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Add timestamped views
      await db.insert(recipeViews).values([
        {
          recipeId: testRecipe.id,
          sessionId: 'recent-1',
          viewedAt: new Date(), // Today
        },
        {
          recipeId: testRecipe.id,
          sessionId: 'recent-2',
          viewedAt: yesterday,
        },
        {
          recipeId: testRecipe.id,
          sessionId: 'old-1',
          viewedAt: lastWeek,
        }
      ]);

      // Query recent views (last 24 hours)
      const [recentViews] = await db.select({ count: count() })
        .from(recipeViews)
        .where(and(
          eq(recipeViews.recipeId, testRecipe.id),
          gte(recipeViews.viewedAt, yesterday)
        ));

      // Query all-time views
      const [allTimeViews] = await db.select({ count: count() })
        .from(recipeViews)
        .where(eq(recipeViews.recipeId, testRecipe.id));

      expect(recentViews.count).toBe(2);
      expect(allTimeViews.count).toBe(3);
    });

    test('should optimize queries for trending calculations', async () => {
      // Add engagement data for multiple recipes
      const recipes = [testRecipe.id, testRecipe2.id];
      
      for (const recipeId of recipes) {
        await Promise.all([
          db.insert(recipeViews).values(
            Array.from({ length: 10 }, (_, i) => ({
              recipeId,
              sessionId: `session-${recipeId}-${i}`,
              viewDurationSeconds: Math.floor(Math.random() * 120),
            }))
          ),
          db.insert(recipeRatings).values([
            { recipeId, userId: testUser.id, rating: Math.floor(Math.random() * 5) + 1 },
          ]),
        ]);
      }

      const startTime = Date.now();

      // Query trending recipes (complex aggregation)
      const trendingRecipes = await db.select({
        recipeId: recipeViews.recipeId,
        viewCount: count(recipeViews.id),
        avgRating: avg(recipeRatings.rating),
        engagementScore: sql<number>`
          (COUNT(${recipeViews.id}) * 0.6 + 
           COALESCE(AVG(${recipeRatings.rating}), 0) * 2 * 0.4) as engagement_score
        `,
      })
      .from(recipeViews)
      .leftJoin(recipeRatings, eq(recipeViews.recipeId, recipeRatings.recipeId))
      .groupBy(recipeViews.recipeId)
      .orderBy(desc(sql`engagement_score`))
      .limit(10);

      const queryTime = Date.now() - startTime;

      expect(queryTime).toBeLessThan(1000); // Should complete within 1 second
      expect(trendingRecipes).toHaveLength(2);
      expect(trendingRecipes[0].viewCount).toBeGreaterThan(0);
    });
  });
});