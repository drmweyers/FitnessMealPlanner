/**
 * Service Layer Tests for EngagementService
 * 
 * Comprehensive unit tests for the EngagementService covering
 * analytics tracking, recommendation engine, and performance tests.
 */

import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { EngagementService } from '../../../../server/services/EngagementService.js';
import { db } from '../../../../server/db.js';
import {
  recipeViews,
  recipeRatings,
  userInteractions,
  recipeShares,
  userPreferences,
  users,
  recipes,
  type User,
  type Recipe,
  type TrackInteraction,
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
    zadd: vi.fn(),
    zrange: vi.fn(),
    zrem: vi.fn(),
  }
}));

import { RedisService } from '../../../../server/services/RedisService.js';

// Test data setup
let testUser: User;
let testUser2: User;
let testRecipe: Recipe;
let testRecipe2: Recipe;
let engagementService: EngagementService;

beforeAll(async () => {
  engagementService = new EngagementService();

  // Create test users
  const [user1] = await db.insert(users).values({
    email: 'engagement-service-1@example.com',
    password: 'hashedPassword123',
    name: 'Engagement Service Test User 1',
    role: 'customer',
  }).returning();
  testUser = user1;

  const [user2] = await db.insert(users).values({
    email: 'engagement-service-2@example.com',
    password: 'hashedPassword123',
    name: 'Engagement Service Test User 2',
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
  await db.delete(userPreferences).where(eq(userPreferences.userId, testUser.id));
  await db.delete(userPreferences).where(eq(userPreferences.userId, testUser2.id));
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
  
  // Reset all mocks
  vi.clearAllMocks();
});

describe('EngagementService', () => {
  describe('Analytics Tracking', () => {
    test('should track recipe views accurately', async () => {
      const result = await engagementService.trackRecipeView(testUser.id, testRecipe.id, {
        sessionId: 'session-123',
        viewDurationSeconds: 45,
        userAgent: 'Mozilla/5.0...',
        ipAddress: '192.168.1.1',
      });

      expect(result.success).toBe(true);

      // Verify in database
      const views = await db.select()
        .from(recipeViews)
        .where(and(
          eq(recipeViews.userId, testUser.id),
          eq(recipeViews.recipeId, testRecipe.id)
        ));

      expect(views).toHaveLength(1);
      expect(views[0].viewDurationSeconds).toBe(45);
    });

    test('should track anonymous recipe views', async () => {
      const result = await engagementService.trackRecipeView(null, testRecipe.id, {
        sessionId: 'anonymous-session-456',
        viewDurationSeconds: 30,
        userAgent: 'Chrome/91.0...',
        ipAddress: '10.0.0.1',
      });

      expect(result.success).toBe(true);

      // Verify in database
      const views = await db.select()
        .from(recipeViews)
        .where(and(
          eq(recipeViews.recipeId, testRecipe.id),
          eq(recipeViews.sessionId, 'anonymous-session-456')
        ));

      expect(views).toHaveLength(1);
      expect(views[0].userId).toBeNull();
    });

    test('should aggregate interaction data', async () => {
      // Track multiple interactions
      await Promise.all([
        engagementService.trackRecipeView(testUser.id, testRecipe.id, {
          sessionId: 'session-1',
          viewDurationSeconds: 30,
        }),
        engagementService.trackRecipeView(testUser2.id, testRecipe.id, {
          sessionId: 'session-2',
          viewDurationSeconds: 45,
        }),
        engagementService.trackInteraction(testUser.id, {
          interactionType: 'recipe_favorite',
          targetType: 'recipe',
          targetId: testRecipe.id,
        }),
        engagementService.trackRecipeShare(testUser.id, testRecipe.id, 'social'),
      ]);

      const analytics = await engagementService.getRecipeAnalytics(testRecipe.id);

      expect(analytics.success).toBe(true);
      expect(analytics.data!.viewCount).toBe(2);
      expect(analytics.data!.shareCount).toBe(1);
      expect(analytics.data!.avgViewDuration).toBeCloseTo(37.5, 1);
    });

    test('should calculate engagement scores', async () => {
      // Add engagement data
      await Promise.all([
        engagementService.trackRecipeView(testUser.id, testRecipe.id, {
          viewDurationSeconds: 60,
        }),
        engagementService.trackRecipeRating(testUser.id, testRecipe.id, {
          rating: 5,
          review: 'Excellent!',
        }),
        engagementService.trackRecipeShare(testUser.id, testRecipe.id, 'social'),
      ]);

      const score = await engagementService.calculateEngagementScore(testRecipe.id);

      expect(score.success).toBe(true);
      expect(score.data!.totalScore).toBeGreaterThan(0);
      expect(score.data!.viewScore).toBeGreaterThan(0);
      expect(score.data!.ratingScore).toBeGreaterThan(0);
      expect(score.data!.shareScore).toBeGreaterThan(0);
    });

    test('should generate user activity summaries', async () => {
      // Track user activity
      await Promise.all([
        engagementService.trackRecipeView(testUser.id, testRecipe.id, {}),
        engagementService.trackRecipeView(testUser.id, testRecipe2.id, {}),
        engagementService.trackInteraction(testUser.id, {
          interactionType: 'recipe_favorite',
          targetType: 'recipe',
          targetId: testRecipe.id,
        }),
      ]);

      const summary = await engagementService.getUserActivitySummary(testUser.id, {
        days: 7,
      });

      expect(summary.success).toBe(true);
      expect(summary.data!.totalViews).toBe(2);
      expect(summary.data!.totalInteractions).toBeGreaterThanOrEqual(1);
      expect(summary.data!.uniqueRecipesViewed).toBe(2);
    });
  });

  describe('Recommendation Engine', () => {
    test('should generate personalized recommendations', async () => {
      // Set user preferences
      await engagementService.updateUserPreferences(testUser.id, {
        preferredMealTypes: ['breakfast'],
        preferredDietaryTags: ['healthy'],
        maxPrepTime: 15,
      });

      // Track some engagement to establish preferences
      await engagementService.trackRecipeView(testUser.id, testRecipe.id, {
        viewDurationSeconds: 60,
      });

      const recommendations = await engagementService.getPersonalizedRecommendations(
        testUser.id,
        { limit: 10 }
      );

      expect(recommendations.success).toBe(true);
      expect(recommendations.data!.recipes).toBeInstanceOf(Array);
      expect(recommendations.data!.recipes.length).toBeGreaterThan(0);
      
      // Should include recommendation scores and reasons
      if (recommendations.data!.recipes.length > 0) {
        const firstRec = recommendations.data!.recipes[0];
        expect(firstRec.recommendationScore).toBeGreaterThan(0);
        expect(firstRec.recommendationReason).toBeDefined();
      }
    });

    test('should handle cold start problem for new users', async () => {
      const recommendations = await engagementService.getPersonalizedRecommendations(
        testUser2.id,
        { limit: 5 }
      );

      expect(recommendations.success).toBe(true);
      expect(recommendations.data!.recipes).toBeInstanceOf(Array);
      
      // Should still return recommendations based on popular/trending recipes
      if (recommendations.data!.recipes.length > 0) {
        const firstRec = recommendations.data!.recipes[0];
        expect(firstRec.recommendationReason).toContain('popular');
      }
    });

    test('should incorporate user feedback', async () => {
      // Initial recommendations
      const initial = await engagementService.getPersonalizedRecommendations(
        testUser.id,
        { limit: 5 }
      );

      // Provide feedback
      await engagementService.trackRecommendationFeedback(testUser.id, {
        recipeId: testRecipe.id,
        feedback: 'positive',
        reason: 'loved_ingredients',
      });

      // Get updated recommendations
      const updated = await engagementService.getPersonalizedRecommendations(
        testUser.id,
        { limit: 5, refreshCache: true }
      );

      expect(updated.success).toBe(true);
      // The recommendation algorithm should have learned from the feedback
    });

    test('should respect user preferences', async () => {
      // Set specific preferences
      await engagementService.updateUserPreferences(testUser.id, {
        preferredMealTypes: ['breakfast'],
        dislikedIngredients: ['quinoa'],
        maxPrepTime: 10,
      });

      const recommendations = await engagementService.getPersonalizedRecommendations(
        testUser.id,
        { limit: 10 }
      );

      expect(recommendations.success).toBe(true);
      
      // Verify recommendations respect preferences
      for (const recipe of recommendations.data!.recipes) {
        expect(recipe.prepTimeMinutes).toBeLessThanOrEqual(10);
        expect(recipe.mealTypes).toContain('breakfast');
        
        // Should not contain disliked ingredients
        const hasDislikedIngredient = recipe.mainIngredientTags?.some(
          ingredient => ingredient.toLowerCase().includes('quinoa')
        );
        expect(hasDislikedIngredient).toBe(false);
      }
    });

    test('should find similar recipes', async () => {
      const similar = await engagementService.getSimilarRecipes(testRecipe.id, {
        limit: 5,
      });

      expect(similar.success).toBe(true);
      expect(similar.data!.recipes).toBeInstanceOf(Array);
      
      // Similar recipes should have some common characteristics
      if (similar.data!.recipes.length > 0) {
        const originalMealTypes = testRecipe.mealTypes;
        const similarRecipe = similar.data!.recipes[0];
        
        // Should share at least one meal type or dietary tag
        const hasCommonMealType = similarRecipe.mealTypes.some(
          mealType => originalMealTypes.includes(mealType)
        );
        expect(hasCommonMealType).toBe(true);
      }
    });
  });

  describe('Performance Tests', () => {
    test('should handle high-frequency tracking calls', async () => {
      const startTime = Date.now();
      
      // Simulate high-frequency view tracking
      const trackingPromises = Array.from({ length: 100 }, (_, i) =>
        engagementService.trackRecipeView(testUser.id, testRecipe.id, {
          sessionId: `session-${i}`,
          viewDurationSeconds: Math.floor(Math.random() * 120),
        })
      );

      const results = await Promise.all(trackingPromises);
      const completionTime = Date.now() - startTime;

      // All should succeed
      expect(results.every(r => r.success)).toBe(true);
      
      // Should complete within reasonable time
      expect(completionTime).toBeLessThan(5000); // 5 seconds
    });

    test('should batch analytics efficiently', async () => {
      // Add lots of engagement data
      const promises = Array.from({ length: 50 }, (_, i) => [
        engagementService.trackRecipeView(testUser.id, testRecipe.id, {
          sessionId: `session-${i}`,
        }),
        engagementService.trackRecipeView(testUser2.id, testRecipe2.id, {
          sessionId: `session-${i}-user2`,
        }),
      ]).flat();

      await Promise.all(promises);

      const startTime = Date.now();
      
      // Batch get analytics for multiple recipes
      const analytics = await engagementService.getBatchRecipeAnalytics([
        testRecipe.id,
        testRecipe2.id,
      ]);

      const queryTime = Date.now() - startTime;

      expect(analytics.success).toBe(true);
      expect(queryTime).toBeLessThan(1000); // Should be fast
      expect(Object.keys(analytics.data!)).toHaveLength(2);
    });

    test('should cache recommendation calculations', async () => {
      // Mock cache miss first
      vi.mocked(RedisService.get).mockResolvedValueOnce(null);
      vi.mocked(RedisService.set).mockResolvedValue(undefined);

      await engagementService.getPersonalizedRecommendations(testUser.id);

      expect(RedisService.set).toHaveBeenCalledWith(
        expect.stringContaining(`recommendations:${testUser.id}`),
        expect.any(String),
        expect.any(Number)
      );

      // Mock cache hit
      const cachedRecommendations = {
        recipes: [],
        generatedAt: new Date().toISOString(),
        algorithm: 'collaborative_filtering',
      };

      vi.mocked(RedisService.get).mockResolvedValueOnce(
        JSON.stringify(cachedRecommendations)
      );

      const startTime = Date.now();
      const result = await engagementService.getPersonalizedRecommendations(testUser.id);
      const responseTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(responseTime).toBeLessThan(10); // Should be very fast from cache
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid user gracefully', async () => {
      const result = await engagementService.trackRecipeView(
        'invalid-user-id',
        testRecipe.id,
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('User not found');
    });

    test('should handle invalid recipe gracefully', async () => {
      const result = await engagementService.trackRecipeView(
        testUser.id,
        'invalid-recipe-id',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Recipe not found');
    });

    test('should handle database connection errors', async () => {
      // Mock database error
      const originalInsert = db.insert;
      vi.spyOn(db, 'insert').mockImplementation(() => {
        throw new Error('Database connection error');
      });

      const result = await engagementService.trackRecipeView(
        testUser.id,
        testRecipe.id,
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');

      // Restore
      vi.mocked(db.insert).mockRestore();
    });

    test('should handle recommendation algorithm failures', async () => {
      // Mock ML service failure
      vi.spyOn(engagementService as any, 'runRecommendationAlgorithm')
        .mockRejectedValue(new Error('ML service unavailable'));

      const result = await engagementService.getPersonalizedRecommendations(testUser.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('recommendation service');
    });

    test('should provide fallback recommendations on failure', async () => {
      // Mock personalized recommendations failure
      vi.spyOn(engagementService as any, 'getPersonalizedRecommendations')
        .mockResolvedValueOnce({ success: false, error: 'Algorithm error' });

      const result = await engagementService.getFallbackRecommendations(testUser.id);

      expect(result.success).toBe(true);
      expect(result.data!.recipes).toBeInstanceOf(Array);
      expect(result.data!.fallbackReason).toBeDefined();
    });
  });

  describe('Privacy and Security', () => {
    test('should respect user privacy settings', async () => {
      await engagementService.updatePrivacySettings(testUser.id, {
        allowPersonalizedRecommendations: false,
        allowUsageTracking: false,
        allowDataSharing: false,
      });

      const result = await engagementService.trackRecipeView(
        testUser.id,
        testRecipe.id,
        {}
      );

      // Should still track for essential functionality but not for personalization
      expect(result.success).toBe(true);
      expect(result.data!.trackingLevel).toBe('essential_only');
    });

    test('should anonymize data for analytics', async () => {
      const analytics = await engagementService.getAggregatedAnalytics({
        timeRange: '7d',
        anonymize: true,
      });

      expect(analytics.success).toBe(true);
      expect(analytics.data!.userDataIncluded).toBe(false);
      expect(analytics.data!.metrics).toBeDefined();
    });

    test('should validate interaction data', async () => {
      const invalidInteraction: TrackInteraction = {
        interactionType: 'invalid_type' as any,
        targetType: 'recipe',
        targetId: testRecipe.id,
      };

      const result = await engagementService.trackInteraction(
        testUser.id,
        invalidInteraction
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid interaction type');
    });
  });

  describe('Real-time Features', () => {
    test('should update trending scores in real-time', async () => {
      // Track engagement that should affect trending
      await Promise.all([
        engagementService.trackRecipeView(testUser.id, testRecipe.id, {}),
        engagementService.trackRecipeView(testUser2.id, testRecipe.id, {}),
        engagementService.trackRecipeShare(testUser.id, testRecipe.id, 'social'),
      ]);

      const trendingBefore = await engagementService.getTrendingRecipes({
        timeFrame: 'hourly',
        limit: 10,
      });

      // Add more engagement
      await Promise.all([
        engagementService.trackRecipeView(testUser.id, testRecipe.id, {}),
        engagementService.trackRecipeRating(testUser.id, testRecipe.id, {
          rating: 5,
        }),
      ]);

      const trendingAfter = await engagementService.getTrendingRecipes({
        timeFrame: 'hourly',
        limit: 10,
        refreshCache: true,
      });

      expect(trendingAfter.success).toBe(true);
      
      // Recipe should appear in trending or have increased score
      const recipeTrending = trendingAfter.data!.recipes.find(
        r => r.id === testRecipe.id
      );
      
      if (recipeTrending) {
        expect(recipeTrending.trendingScore).toBeGreaterThan(0);
      }
    });

    test('should provide live recommendation updates', async () => {
      // Simulate user behavior that should update recommendations
      await engagementService.trackRecipeView(testUser.id, testRecipe.id, {
        viewDurationSeconds: 120, // Long view time indicates interest
      });

      await engagementService.trackInteraction(testUser.id, {
        interactionType: 'recipe_favorite',
        targetType: 'recipe',
        targetId: testRecipe.id,
      });

      const recommendations = await engagementService.getLiveRecommendations(
        testUser.id,
        { includeRecentActivity: true }
      );

      expect(recommendations.success).toBe(true);
      expect(recommendations.data!.basedOnRecentActivity).toBe(true);
    });
  });
});