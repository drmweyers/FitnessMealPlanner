/**
 * RecommendationService - AI-Powered Personalized Recipe Recommendations
 * 
 * Provides intelligent recipe recommendations based on user preferences, behavior,
 * and advanced machine learning algorithms. Includes collaborative filtering,
 * content-based filtering, and hybrid recommendation strategies.
 */

import { and, desc, eq, gte, inArray, not, sql, or } from 'drizzle-orm';
import { db } from '../db';
import {
  recipes,
  recipeFavorites,
  recipeInteractions,
  
  userPreferences,
  
  users,
  type Recipe,
  type UserPreferences,
  type RecipeRating
} from '../../shared/schema';
import { getRedisService } from './RedisService';
import { getEngagementService } from './EngagementService';
import type { RedisService } from './RedisService';
import type { EngagementService } from './EngagementService';

export interface RecommendationRequest {
  userId: string;
  count?: number;
  strategy?: 'collaborative' | 'content' | 'hybrid' | 'trending' | 'popular';
  excludeViewed?: boolean;
  excludeFavorited?: boolean;
  mealType?: string;
  maxPrepTime?: number;
  dietaryRestrictions?: string[];
}

export interface RecommendedRecipe extends Recipe {
  recommendationScore: number;
  recommendationReason: string;
  confidence: number;
  estimatedRating?: number;
}

export interface RecommendationResponse {
  recommendations: RecommendedRecipe[];
  strategy: string;
  totalAvailable: number;
  userProfile: UserRecommendationProfile;
}

export interface UserRecommendationProfile {
  preferences: UserPreferences | null;
  favoriteIngredients: string[];
  favoriteCuisines: string[];
  averageRating: number;
  activityLevel: 'low' | 'medium' | 'high';
  diversityScore: number;
}

export interface SimilarUser {
  userId: string;
  similarity: number;
  commonRatings: number;
}

export interface RecommendationFeedback {
  recommendationId: string;
  userId: string;
  feedback: 'liked' | 'disliked' | 'not_interested' | 'saved';
  reason?: string;
}

export class RecommendationService {
  private redis: RedisService;
  private engagementService: EngagementService;
  private readonly CACHE_TTL = 1800; // 30 minutes
  private readonly RECOMMENDATIONS_PREFIX = 'recommendations:';
  private readonly USER_PROFILE_PREFIX = 'user:profile:';
  private readonly SIMILARITY_PREFIX = 'similarity:';

  constructor() {
    this.redis = getRedisService();
    this.engagementService = getEngagementService();
  }

  /**
   * Get personalized recommendations for a user
   */
  async getRecommendations(request: RecommendationRequest): Promise<RecommendationResponse> {
    const {
      userId,
      count = 20,
      strategy = 'hybrid',
      excludeViewed = true,
      excludeFavorited = true,
      mealType,
      maxPrepTime,
      dietaryRestrictions
    } = request;

    const cacheKey = `${this.RECOMMENDATIONS_PREFIX}${userId}:${strategy}:${count}:${JSON.stringify({
      excludeViewed,
      excludeFavorited,
      mealType,
      maxPrepTime,
      dietaryRestrictions
    })}`;

    // Try cache first
    const cached = await this.redis.get<RecommendationResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get user profile
    const userProfile = await this.getUserRecommendationProfile(userId);

    // Get recommendations based on strategy
    let recommendations: RecommendedRecipe[];
    
    switch (strategy) {
      case 'collaborative':
        recommendations = await this.getCollaborativeRecommendations(userId, userProfile, request);
        break;
      case 'content':
        recommendations = await this.getContentBasedRecommendations(userId, userProfile, request);
        break;
      case 'trending':
        recommendations = await this.getTrendingRecommendations(userId, request);
        break;
      case 'popular':
        recommendations = await this.getPopularRecommendations(userId, request);
        break;
      case 'hybrid':
      default:
        recommendations = await this.getHybridRecommendations(userId, userProfile, request);
        break;
    }

    // Apply filters
    recommendations = await this.applyFilters(recommendations, request);

    // Sort by recommendation score
    recommendations = recommendations
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, count);

    const response: RecommendationResponse = {
      recommendations,
      strategy,
      totalAvailable: recommendations.length,
      userProfile
    };

    // Cache for 30 minutes
    await this.redis.set(cacheKey, response, this.CACHE_TTL);

    return response;
  }

  /**
   * Get collaborative filtering recommendations
   */
  private async getCollaborativeRecommendations(
    userId: string,
    userProfile: UserRecommendationProfile,
    request: RecommendationRequest
  ): Promise<RecommendedRecipe[]> {
    // Find similar users based on ratings
    const similarUsers = await this.findSimilarUsers(userId);
    
    if (similarUsers.length === 0) {
      // Fallback to popular recommendations if no similar users
      return this.getPopularRecommendations(userId, request);
    }

    // Get recipes that similar users liked but current user hasn't interacted with
    const similarUserIds = similarUsers.map(u => u.userId);
    
    const collaborativeRecipes = await db
      .select({
        recipe: recipes,
        avgRating: sql<number>`avg(${recipeInteractions.interactionValue})`,
        ratingCount: sql<number>`count(${recipeInteractions.interactionValue})`,
        similarityScore: sql<number>`avg(case when ${recipeInteractions.userId} = ANY(${similarUserIds}) then ${recipeInteractions.interactionValue} else 0 end)`
      })
      .from(recipes)
      .innerJoin( eq(recipes.id, recipeInteractions.recipeId))
      .where(and(
        eq(recipes.isApproved, true),
        inArray(recipeInteractions.userId, similarUserIds),
        gte(recipeInteractions.interactionValue, 4), // Only recommend highly rated recipes
        not(
          sql`${recipes.id} IN (
            SELECT ${recipeInteractions.recipeId} FROM ${recipeRatings} WHERE ${recipeInteractions.userId} = ${userId}
          )`
        )
      ))
      .groupBy(recipes.id)
      .having(sql`count(${recipeInteractions.interactionValue}) >= 2`) // At least 2 ratings from similar users
      .orderBy(sql`avg(${recipeInteractions.interactionValue}) DESC`)
      .limit(request.count || 20);

    return collaborativeRecipes.map(item => ({
      ...item.recipe,
      recommendationScore: this.calculateCollaborativeScore(
        item.avgRating,
        item.interactionValueCount,
        item.similarityScore,
        similarUsers
      ),
      recommendationReason: `Users with similar tastes love this recipe (${Number(item.avgRating).toFixed(1)}/5 stars)`,
      confidence: Math.min(item.interactionValueCount / 10, 1), // Confidence based on number of ratings
      estimatedRating: item.avgRating
    }));
  }

  /**
   * Get content-based filtering recommendations
   */
  private async getContentBasedRecommendations(
    userId: string,
    userProfile: UserRecommendationProfile,
    request: RecommendationRequest
  ): Promise<RecommendedRecipe[]> {
    const { preferences } = userProfile;
    
    // Build content filters based on user preferences
    const whereConditions = [eq(recipes.isApproved, true)];
    
    // Exclude already rated recipes
    whereConditions.push(
      not(
        sql`${recipes.id} IN (
          SELECT ${recipeInteractions.recipeId} FROM ${recipeRatings} WHERE ${recipeInteractions.userId} = ${userId}
        )`
      )
    );

    // Apply dietary restrictions
    if (preferences?.dietaryRestrictions && preferences.dietaryRestrictions.length > 0) {
      whereConditions.push(
        sql`${recipes.dietaryTags} @> ${JSON.stringify(preferences.dietaryRestrictions)}`
      );
    }

    // Apply preferred meal types
    if (preferences?.preferredMealTypes && preferences.preferredMealTypes.length > 0) {
      whereConditions.push(
        sql`${recipes.mealTypes} && ${JSON.stringify(preferences.preferredMealTypes)}`
      );
    }

    // Apply prep time preference
    if (preferences?.maxPrepTime) {
      whereConditions.push(sql`${recipes.prepTimeMinutes} <= ${preferences.maxPrepTime}`);
    }

    // Get recipes matching content preferences
    const contentRecipes = await db
      .select()
      .from(recipes)
      .where(and(...whereConditions))
      .orderBy(desc(recipes.creationTimestamp))
      .limit((request.count || 20) * 2); // Get more for scoring

    // Calculate content-based scores
    return contentRecipes.map(recipe => {
      const score = this.calculateContentScore(recipe, userProfile);
      const reason = this.generateContentReason(recipe, userProfile);
      
      return {
        ...recipe,
        recommendationScore: score,
        recommendationReason: reason,
        confidence: 0.7, // Content-based has medium confidence
        estimatedRating: this.estimateRating(recipe, userProfile)
      };
    });
  }

  /**
   * Get trending recommendations
   */
  private async getTrendingRecommendations(
    userId: string,
    request: RecommendationRequest
  ): Promise<RecommendedRecipe[]> {
    // Get trending recipes from engagement service
    const trendingMetrics = await this.engagementService.getTrendingRecipes(request.count || 20);
    
    if (trendingMetrics.length === 0) {
      return [];
    }

    const recipeIds = trendingMetrics.map(m => m.recipeId);
    
    // Get recipe details
    const trendingRecipes = await db
      .select()
      .from(recipes)
      .where(and(
        inArray(recipes.id, recipeIds),
        eq(recipes.isApproved, true)
      ));

    // Combine with trending scores
    return trendingRecipes.map(recipe => {
      const metrics = trendingMetrics.find(m => m.recipeId === recipe.id);
      const trendingScore = metrics?.trendingScore || 0;
      
      return {
        ...recipe,
        recommendationScore: trendingScore,
        recommendationReason: `Trending now with ${metrics?.views24h || 0} views in the last 24 hours`,
        confidence: 0.8,
        estimatedRating: metrics?.avgRating || 0
      };
    });
  }

  /**
   * Get popular recommendations
   */
  private async getPopularRecommendations(
    userId: string,
    request: RecommendationRequest
  ): Promise<RecommendedRecipe[]> {
    // Get most popular recipes by ratings and views
    const popularRecipes = await db
      .select({
        recipe: recipes,
        avgRating: sql<number>`avg(${recipeInteractions.interactionValue})`,
        ratingCount: sql<number>`count(${recipeInteractions.interactionValue})`,
        viewCount: sql<number>`count(${recipeInteractions.id})`
      })
      .from(recipes)
      .leftJoin( eq(recipes.id, recipeInteractions.recipeId))
      .leftJoin(recipeInteractions, eq(recipes.id, recipeInteractions.recipeId))
      .where(and(
        eq(recipes.isApproved, true),
        // Exclude recipes user has already rated
        not(
          sql`${recipes.id} IN (
            SELECT ${recipeInteractions.recipeId} FROM ${recipeRatings} WHERE ${recipeInteractions.userId} = ${userId}
          )`
        )
      ))
      .groupBy(recipes.id)
      .having(sql`count(${recipeInteractions.interactionValue}) >= 5`) // At least 5 ratings
      .orderBy(sql`avg(${recipeInteractions.interactionValue}) DESC, count(${recipeInteractions.interactionValue}) DESC`)
      .limit(request.count || 20);

    return popularRecipes.map(item => ({
      ...item.recipe,
      recommendationScore: this.calculatePopularityScore(
        item.avgRating,
        item.interactionValueCount,
        item.viewCount
      ),
      recommendationReason: `Popular recipe with ${Number(item.avgRating).toFixed(1)}/5 stars from ${item.interactionValueCount} reviews`,
      confidence: 0.9,
      estimatedRating: item.avgRating
    }));
  }

  /**
   * Get hybrid recommendations (combination of strategies)
   */
  private async getHybridRecommendations(
    userId: string,
    userProfile: UserRecommendationProfile,
    request: RecommendationRequest
  ): Promise<RecommendedRecipe[]> {
    const { count = 20 } = request;
    
    // Get recommendations from each strategy
    const [collaborative, content, trending, popular] = await Promise.all([
      this.getCollaborativeRecommendations(userId, userProfile, { ...request, count: Math.ceil(count * 0.3) }),
      this.getContentBasedRecommendations(userId, userProfile, { ...request, count: Math.ceil(count * 0.3) }),
      this.getTrendingRecommendations(userId, { ...request, count: Math.ceil(count * 0.2) }),
      this.getPopularRecommendations(userId, { ...request, count: Math.ceil(count * 0.2) })
    ]);

    // Combine and deduplicate
    const allRecommendations = new Map<string, RecommendedRecipe>();
    
    // Add collaborative recommendations with higher weight
    collaborative.forEach(recipe => {
      allRecommendations.set(recipe.id, {
        ...recipe,
        recommendationScore: recipe.recommendationScore * 1.2,
        recommendationReason: `Collaborative: ${recipe.recommendationReason}`
      });
    });

    // Add content-based recommendations
    content.forEach(recipe => {
      const existing = allRecommendations.get(recipe.id);
      if (existing) {
        // Boost score for recipes found by multiple strategies
        existing.recommendationScore = (existing.recommendationScore + recipe.recommendationScore) * 1.1;
        existing.recommendationReason = `Hybrid: ${existing.recommendationReason} + Content match`;
        existing.confidence = Math.min(existing.confidence + 0.1, 1);
      } else {
        allRecommendations.set(recipe.id, {
          ...recipe,
          recommendationReason: `Content: ${recipe.recommendationReason}`
        });
      }
    });

    // Add trending recommendations
    trending.forEach(recipe => {
      const existing = allRecommendations.get(recipe.id);
      if (existing) {
        existing.recommendationScore = (existing.recommendationScore + recipe.recommendationScore * 0.8) * 1.05;
        existing.recommendationReason = `${existing.recommendationReason} + Trending`;
      } else {
        allRecommendations.set(recipe.id, {
          ...recipe,
          recommendationScore: recipe.recommendationScore * 0.8,
          recommendationReason: `Trending: ${recipe.recommendationReason}`
        });
      }
    });

    // Add popular recommendations
    popular.forEach(recipe => {
      const existing = allRecommendations.get(recipe.id);
      if (existing) {
        existing.recommendationScore = (existing.recommendationScore + recipe.recommendationScore * 0.6) * 1.03;
        existing.recommendationReason = `${existing.recommendationReason} + Popular`;
      } else {
        allRecommendations.set(recipe.id, {
          ...recipe,
          recommendationScore: recipe.recommendationScore * 0.6,
          recommendationReason: `Popular: ${recipe.recommendationReason}`
        });
      }
    });

    return Array.from(allRecommendations.values());
  }

  /**
   * Find similar users based on rating patterns
   */
  private async findSimilarUsers(userId: string, limit: number = 10): Promise<SimilarUser[]> {
    const cacheKey = `${this.SIMILARITY_PREFIX}${userId}:limit:${limit}`;
    
    // Try cache first
    const cached = await this.redis.get<SimilarUser[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get user's ratings
    const userRatings = await db
      .select()
      .from(recipeRatings)
      .where(eq(recipeInteractions.userId, userId));

    if (userRatings.length < 3) {
      return []; // Need at least 3 ratings for similarity calculation
    }

    const userRecipeIds = userRatings.map(r => r.recipeId);

    // Find users who rated the same recipes
    const potentialSimilarUsers = await db
      .select({
        userId: recipeInteractions.userId,
        recipeId: recipeInteractions.recipeId,
        rating: recipeInteractions.interactionValue
      })
      .from(recipeRatings)
      .where(and(
        inArray(recipeInteractions.recipeId, userRecipeIds),
        not(eq(recipeInteractions.userId, userId))
      ));

    // Group by user and calculate similarity
    const userRatingMap = new Map<string, Map<string, number>>();
    
    potentialSimilarUsers.forEach(rating => {
      if (!userRatingMap.has(rating.userId)) {
        userRatingMap.set(rating.userId, new Map());
      }
      userRatingMap.get(rating.userId)!.set(rating.recipeId, rating.interactionValue);
    });

    // Calculate Pearson correlation coefficient for each user
    const similarities: SimilarUser[] = [];
    
    for (const [otherUserId, otherRatings] of userRatingMap) {
      const commonRecipes: string[] = [];
      const userCommonRatings: number[] = [];
      const otherCommonRatings: number[] = [];

      // Find common recipes
      userRatings.forEach(userRating => {
        if (otherRatings.has(userRating.recipeId)) {
          commonRecipes.push(userRating.recipeId);
          userCommonRatings.push(userRating.interactionValue);
          otherCommonRatings.push(otherRatings.get(userRating.recipeId)!);
        }
      });

      if (commonRecipes.length >= 3) { // Need at least 3 common ratings
        const similarity = this.calculatePearsonCorrelation(userCommonRatings, otherCommonRatings);
        
        if (similarity > 0.3) { // Only consider users with positive correlation
          similarities.push({
            userId: otherUserId,
            similarity,
            commonRatings: commonRecipes.length
          });
        }
      }
    }

    // Sort by similarity and limit
    const result = similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    // Cache for 1 hour
    await this.redis.set(cacheKey, result, 3600);

    return result;
  }

  /**
   * Get user recommendation profile
   */
  private async getUserRecommendationProfile(userId: string): Promise<UserRecommendationProfile> {
    const cacheKey = `${this.USER_PROFILE_PREFIX}${userId}`;
    
    // Try cache first
    const cached = await this.redis.get<UserRecommendationProfile>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get user preferences
    const preferences = await this.engagementService.getUserPreferences(userId);

    // Get user's favorite ingredients from rated recipes
    const favoriteIngredients = await this.getFavoriteIngredients(userId);
    
    // Get favorite cuisines (if we had cuisine tagging)
    const favoriteCuisines: string[] = []; // TODO: Implement cuisine analysis

    // Get user's average rating
    const [avgRatingResult] = await db
      .select({ avgRating: sql<number>`avg(${recipeInteractions.interactionValue})` })
      .from(recipeRatings)
      .where(eq(recipeInteractions.userId, userId));

    const averageRating = avgRatingResult.avgRating || 0;

    // Calculate activity level based on interactions
    const activityLevel = await this.calculateActivityLevel(userId);

    // Calculate diversity score based on variety of rated recipes
    const diversityScore = await this.calculateDiversityScore(userId);

    const profile: UserRecommendationProfile = {
      preferences,
      favoriteIngredients,
      favoriteCuisines,
      averageRating,
      activityLevel,
      diversityScore
    };

    // Cache for 1 hour
    await this.redis.set(cacheKey, profile, 3600);

    return profile;
  }

  /**
   * Apply filters to recommendations
   */
  private async applyFilters(
    recommendations: RecommendedRecipe[],
    request: RecommendationRequest
  ): Promise<RecommendedRecipe[]> {
    let filtered = recommendations;

    // Exclude viewed recipes
    if (request.excludeViewed) {
      const viewedRecipeIds = await db
        .select({ recipeId: recipeInteractions.recipeId })
        .from(recipeViews)
        .where(eq(recipeInteractions.userId, request.userId));
      
      const viewedIds = new Set(viewedRecipeIds.map(v => v.recipeId));
      filtered = filtered.filter(r => !viewedIds.has(r.id));
    }

    // Exclude favorited recipes
    if (request.excludeFavorited) {
      const favoritedRecipeIds = await db
        .select({ recipeId: recipeFavorites.recipeId })
        .from(recipeFavorites)
        .where(eq(recipeFavorites.userId, request.userId));
      
      const favoritedIds = new Set(favoritedRecipeIds.map(f => f.recipeId));
      filtered = filtered.filter(r => !favoritedIds.has(r.id));
    }

    // Apply meal type filter
    if (request.mealType) {
      filtered = filtered.filter(r => 
        r.mealTypes && r.mealTypes.includes(request.mealType!)
      );
    }

    // Apply prep time filter
    if (request.maxPrepTime) {
      filtered = filtered.filter(r => r.prepTimeMinutes <= request.maxPrepTime!);
    }

    // Apply dietary restrictions filter
    if (request.dietaryRestrictions && request.dietaryRestrictions.length > 0) {
      filtered = filtered.filter(r => {
        if (!r.dietaryTags) return false;
        return request.dietaryRestrictions!.every(restriction => 
          r.dietaryTags!.includes(restriction)
        );
      });
    }

    return filtered;
  }

  /**
   * Helper methods for calculations
   */
  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateCollaborativeScore(
    avgRating: number,
    ratingCount: number,
    similarityScore: number,
    similarUsers: SimilarUser[]
  ): number {
    const ratingWeight = avgRating / 5; // Normalize to 0-1
    const countWeight = Math.min(ratingCount / 10, 1); // Cap at 10 ratings
    const similarityWeight = similarityScore / 5; // Normalize similarity
    const userSimilarityBonus = similarUsers.length > 0 ? 
      similarUsers.reduce((sum, user) => sum + user.similarity, 0) / similarUsers.length : 0;

    return (ratingWeight * 0.4 + countWeight * 0.2 + similarityWeight * 0.2 + userSimilarityBonus * 0.2) * 100;
  }

  private calculateContentScore(recipe: Recipe, profile: UserRecommendationProfile): number {
    let score = 50; // Base score

    const { preferences, favoriteIngredients } = profile;

    // Bonus for matching dietary preferences
    if (preferences?.dietaryRestrictions && recipe.dietaryTags) {
      const matches = preferences.dietaryRestrictions.filter(pref => 
        recipe.dietaryTags!.includes(pref)
      ).length;
      score += matches * 10;
    }

    // Bonus for matching meal type preferences
    if (preferences?.preferredMealTypes && recipe.mealTypes) {
      const matches = preferences.preferredMealTypes.filter(pref => 
        recipe.mealTypes!.includes(pref)
      ).length;
      score += matches * 8;
    }

    // Bonus for favorite ingredients
    if (favoriteIngredients.length > 0 && recipe.ingredientsJson) {
      const recipeIngredients = recipe.ingredientsJson.map(ing => ing.name.toLowerCase());
      const matches = favoriteIngredients.filter(fav => 
        recipeIngredients.some(ing => ing.includes(fav.toLowerCase()))
      ).length;
      score += matches * 5;
    }

    // Penalty for prep time if user has preference
    if (preferences?.maxPrepTime && recipe.prepTimeMinutes > preferences.maxPrepTime) {
      score -= (recipe.prepTimeMinutes - preferences.maxPrepTime) * 0.5;
    }

    return Math.max(score, 0);
  }

  private calculatePopularityScore(avgRating: number, ratingCount: number, viewCount: number): number {
    const ratingScore = (avgRating / 5) * 40; // Max 40 points for rating
    const countScore = Math.min(ratingCount / 20, 1) * 30; // Max 30 points for rating count
    const viewScore = Math.min(viewCount / 100, 1) * 30; // Max 30 points for views

    return ratingScore + countScore + viewScore;
  }

  private generateContentReason(recipe: Recipe, profile: UserRecommendationProfile): string {
    const reasons: string[] = [];

    if (profile.preferences?.dietaryRestrictions && recipe.dietaryTags) {
      const matches = profile.preferences.dietaryRestrictions.filter(pref => 
        recipe.dietaryTags!.includes(pref)
      );
      if (matches.length > 0) {
        reasons.push(`matches your ${matches.join(', ')} preferences`);
      }
    }

    if (profile.favoriteIngredients.length > 0 && recipe.ingredientsJson) {
      const recipeIngredients = recipe.ingredientsJson.map(ing => ing.name.toLowerCase());
      const matches = profile.favoriteIngredients.filter(fav => 
        recipeIngredients.some(ing => ing.includes(fav.toLowerCase()))
      );
      if (matches.length > 0) {
        reasons.push(`contains your favorite ingredients (${matches.slice(0, 2).join(', ')})`);
      }
    }

    if (reasons.length === 0) {
      reasons.push('fits your dietary profile');
    }

    return `Recommended because it ${reasons.join(' and ')}`;
  }

  private estimateRating(recipe: Recipe, profile: UserRecommendationProfile): number {
    // Simple estimation based on user's average rating and content match
    const baseRating = profile.averageRating > 0 ? profile.averageRating : 3.5;
    const contentScore = this.calculateContentScore(recipe, profile);
    const adjustment = (contentScore - 50) / 100; // -0.5 to +0.5 adjustment

    return Math.min(Math.max(baseRating + adjustment, 1), 5);
  }

  private async getFavoriteIngredients(userId: string): Promise<string[]> {
    // Get ingredients from highly rated recipes
    const highlyRatedRecipes = await db
      .select({ recipe: recipes })
      .from(recipeRatings)
      .innerJoin(recipes, eq(recipeInteractions.recipeId, recipes.id))
      .where(and(
        eq(recipeInteractions.userId, userId),
        gte(recipeInteractions.interactionValue, 4)
      ));

    const ingredientCounts = new Map<string, number>();

    highlyRatedRecipes.forEach(({ recipe }) => {
      if (recipe.ingredientsJson) {
        recipe.ingredientsJson.forEach(ingredient => {
          const name = ingredient.name.toLowerCase();
          ingredientCounts.set(name, (ingredientCounts.get(name) || 0) + 1);
        });
      }
    });

    // Return top 10 most frequent ingredients
    return Array.from(ingredientCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ingredient]) => ingredient);
  }

  private async calculateActivityLevel(userId: string): Promise<'low' | 'medium' | 'high'> {
    const [result] = await db
      .select({
        ratingCount: sql<number>`count(${recipeInteractions.id})`,
        viewCount: sql<number>`count(${recipeInteractions.id})`
      })
      .from(users)
      .leftJoin( eq(users.id, recipeInteractions.userId))
      .leftJoin(recipeInteractions, eq(users.id, recipeInteractions.userId))
      .where(eq(users.id, userId))
      .groupBy(users.id);

    const totalActivity = (result.interactionValueCount || 0) + (result.viewCount || 0) / 10;

    if (totalActivity >= 50) return 'high';
    if (totalActivity >= 15) return 'medium';
    return 'low';
  }

  private async calculateDiversityScore(userId: string): Promise<number> {
    // Calculate diversity based on variety of meal types and dietary tags in rated recipes
    const ratedRecipes = await db
      .select({ recipe: recipes })
      .from(recipeRatings)
      .innerJoin(recipes, eq(recipeInteractions.recipeId, recipes.id))
      .where(eq(recipeInteractions.userId, userId));

    if (ratedRecipes.length === 0) return 0;

    const mealTypes = new Set<string>();
    const dietaryTags = new Set<string>();

    ratedRecipes.forEach(({ recipe }) => {
      recipe.mealTypes?.forEach(type => mealTypes.add(type));
      recipe.dietaryTags?.forEach(tag => dietaryTags.add(tag));
    });

    // Normalize by expected maximum diversity
    const mealTypeDiversity = Math.min(mealTypes.size / 4, 1); // Assuming 4 main meal types
    const dietaryDiversity = Math.min(dietaryTags.size / 10, 1); // Assuming 10 common dietary tags

    return (mealTypeDiversity + dietaryDiversity) / 2;
  }

  /**
   * Record recommendation feedback
   */
  async recordFeedback(feedback: RecommendationFeedback): Promise<void> {
    try {
      // Track feedback as interaction
      await this.engagementService.trackInteraction(
        'recommendation_feedback',
        feedback.userId,
        undefined,
        'recommendation',
        feedback.recommendationId,
        {
          feedback: feedback.feedback,
          reason: feedback.reason
        }
      );

      // Invalidate user profile cache to reflect feedback
      await this.redis.del(`${this.USER_PROFILE_PREFIX}${feedback.userId}`);
      await this.redis.invalidatePattern(`${this.RECOMMENDATIONS_PREFIX}${feedback.userId}:*`);

    } catch (error) {
      console.error('Error recording recommendation feedback:', error);
    }
  }

  /**
   * Health check for recommendation service
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }> {
    try {
      // Test database connection
      await db.select().from(recipes).limit(1);
      
      // Test Redis connection
      const redisHealth = await this.redis.healthCheck();
      
      if (redisHealth.status === 'unhealthy') {
        return {
          status: 'unhealthy',
          message: `Redis unhealthy: ${redisHealth.message}`
        };
      }

      return {
        status: 'healthy',
        message: 'RecommendationService is operational'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

// Singleton instance
let recommendationService: RecommendationService | null = null;

export function getRecommendationService(): RecommendationService {
  if (!recommendationService) {
    recommendationService = new RecommendationService();
  }
  return recommendationService;
}

export default RecommendationService;