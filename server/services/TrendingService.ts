/**
 * TrendingService - Real-time Popular and Trending Recipe Calculations
 * 
 * Provides advanced trending algorithms for recipe popularity based on views,
 * ratings, shares, and time-weighted engagement metrics. Includes social features
 * and viral content detection.
 */

import { and, desc, eq, gte, sql, inArray, lt } from 'drizzle-orm';
import { db } from '../db';
import {
  recipes,
  recipeInteractions,
  
  recipeFavorites,
  
  
  type Recipe
} from '../../shared/schema';
import {
  recipeShares,
  recipeRatings
} from '../../shared/schema-engagement';
import { getRedisService } from './RedisService';
import type { RedisService } from './RedisService';

export interface TrendingRecipe extends Recipe {
  trendingScore: number;
  views24h: number;
  views7d: number;
  shares24h: number;
  shares7d: number;
  favorites24h: number;
  favorites7d: number;
  ratings24h: number;
  avgRating: number;
  velocityScore: number;
  viralCoefficient: number;
  momentum: string; // 'rising', 'stable', 'declining'
}

export interface PopularRecipe extends Recipe {
  popularityScore: number;
  totalViews: number;
  totalRatings: number;
  totalFavorites: number;
  totalShares: number;
  avgRating: number;
  consistency: number;
  longevity: number;
}

export interface TrendingCategory {
  category: string;
  recipes: TrendingRecipe[];
  categoryTrend: 'up' | 'down' | 'stable';
  totalEngagement: number;
}

export interface ViralMetrics {
  recipeId: string;
  viralScore: number;
  shareVelocity: number;
  exponentialGrowth: boolean;
  peakDay: Date;
  currentPhase: 'emerging' | 'viral' | 'peak' | 'declining';
}

export interface TrendingTimeframe {
  hours1: Date;
  hours6: Date;
  hours24: Date;
  days7: Date;
  days30: Date;
}

export class TrendingService {
  private redis: RedisService;
  private readonly CACHE_TTL_SHORT = 300; // 5 minutes for trending
  private readonly CACHE_TTL_MEDIUM = 900; // 15 minutes for popular
  private readonly CACHE_TTL_LONG = 3600; // 1 hour for analytics
  private readonly TRENDING_PREFIX = 'trending:';
  private readonly POPULAR_PREFIX = 'popular:';
  private readonly VIRAL_PREFIX = 'viral:';

  constructor() {
    this.redis = getRedisService();
  }

  /**
   * Get trending recipes with advanced scoring
   */
  async getTrendingRecipes(
    limit: number = 20,
    timeframe: '1h' | '6h' | '24h' | '7d' = '24h',
    category?: string
  ): Promise<TrendingRecipe[]> {
    const cacheKey = `${this.TRENDING_PREFIX}recipes:${timeframe}:${limit}:${category || 'all'}`;
    
    // Try cache first
    const cached = await this.redis.get<TrendingRecipe[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const timeframes = this.getTimeframes();
    const cutoffTime = timeframes[timeframe === '1h' ? 'hours1' : 
                               timeframe === '6h' ? 'hours6' :
                               timeframe === '24h' ? 'hours24' : 'days7'];

    // Get comprehensive trending metrics
    const trendingData = await this.calculateTrendingMetrics(cutoffTime, category);
    
    // Calculate advanced scores and sort
    const trending = trendingData
      .map(data => this.enhanceTrendingData(data))
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, limit);

    // Cache based on timeframe
    const cacheTTL = timeframe === '1h' ? 60 : // 1 minute for 1h trending
                     timeframe === '6h' ? 180 : // 3 minutes for 6h trending
                     timeframe === '24h' ? this.CACHE_TTL_SHORT : // 5 minutes for 24h
                     this.CACHE_TTL_MEDIUM; // 15 minutes for 7d

    await this.redis.set(cacheKey, trending, cacheTTL);

    return trending;
  }

  /**
   * Get popular recipes (all-time and consistent performers)
   */
  async getPopularRecipes(
    limit: number = 20,
    timeframe: 'all' | '30d' | '90d' = 'all',
    category?: string
  ): Promise<PopularRecipe[]> {
    const cacheKey = `${this.POPULAR_PREFIX}recipes:${timeframe}:${limit}:${category || 'all'}`;
    
    // Try cache first
    const cached = await this.redis.get<PopularRecipe[]>(cacheKey);
    if (cached) {
      return cached;
    }

    let timeFilter = sql`true`;
    if (timeframe !== 'all') {
      const days = timeframe === '30d' ? 30 : 90;
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      timeFilter = sql`${recipes.creationTimestamp} >= ${cutoff}`;
    }

    // Build category filter
    let categoryFilter = sql`true`;
    if (category) {
      categoryFilter = sql`${recipes.mealTypes} @> ${JSON.stringify([category])}`;
    }

    // Get comprehensive popularity metrics
    const popularData = await db
      .select({
        recipe: recipes,
        totalViews: sql<number>`count(distinct ${recipeInteractions.id})`,
        totalRatings: sql<number>`count(distinct ${recipeInteractions.id})`,
        totalFavorites: sql<number>`count(distinct ${recipeFavorites.id})`,
        totalShares: sql<number>`count(distinct ${recipeInteractions.id})`,
        avgRating: sql<number>`avg(${recipeInteractions.interactionValue})`,
        firstRating: sql<Date>`min(${recipeInteractions.interactionDate})`,
        lastRating: sql<Date>`max(${recipeInteractions.interactionDate})`
      })
      .from(recipes)
      .leftJoin(recipeInteractions, eq(recipes.id, recipeInteractions.recipeId))
      .leftJoin( eq(recipes.id, recipeInteractions.recipeId))
      .leftJoin(recipeFavorites, eq(recipes.id, recipeFavorites.recipeId))
      .leftJoin( eq(recipes.id, recipeInteractions.recipeId))
      .where(and(
        eq(recipes.isApproved, true),
        timeFilter,
        categoryFilter
      ))
      .groupBy(recipes.id)
      .having(sql`count(distinct ${recipeInteractions.id}) > 0`) // Must have at least some engagement
      .orderBy(sql`count(distinct ${recipeInteractions.id}) DESC`)
      .limit(limit * 2); // Get more for scoring

    // Calculate popularity scores
    const popular = popularData
      .map(data => this.enhancePopularData(data))
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice(0, limit);

    // Cache for 15 minutes
    await this.redis.set(cacheKey, popular, this.CACHE_TTL_MEDIUM);

    return popular;
  }

  /**
   * Get trending by category
   */
  async getTrendingByCategory(limit: number = 10): Promise<TrendingCategory[]> {
    const cacheKey = `${this.TRENDING_PREFIX}categories:${limit}`;
    
    // Try cache first
    const cached = await this.redis.get<TrendingCategory[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const categories = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'side'];
    const results: TrendingCategory[] = [];

    for (const category of categories) {
      const trending = await this.getTrendingRecipes(limit, '24h', category);
      
      if (trending.length > 0) {
        const totalEngagement = trending.reduce((sum, recipe) => 
          sum + recipe.views24h + recipe.shares24h + recipe.favorites24h, 0
        );

        // Calculate category trend (simplified)
        const categoryTrend = await this.calculateCategoryTrend(category);

        results.push({
          category,
          recipes: trending,
          categoryTrend,
          totalEngagement
        });
      }
    }

    // Sort categories by total engagement
    results.sort((a, b) => b.totalEngagement - a.totalEngagement);

    // Cache for 10 minutes
    await this.redis.set(cacheKey, results, 600);

    return results;
  }

  /**
   * Detect viral content
   */
  async getViralRecipes(limit: number = 10): Promise<ViralMetrics[]> {
    const cacheKey = `${this.VIRAL_PREFIX}recipes:${limit}`;
    
    // Try cache first
    const cached = await this.redis.get<ViralMetrics[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const timeframes = this.getTimeframes();

    // Get recipes with exponential growth patterns
    const viralCandidates = await db
      .select({
        recipeId: recipeInteractions.recipeId,
        views1h: sql<number>`count(case when ${recipeInteractions.interactionDate} >= ${timeframes.hours1} then 1 end)`,
        views6h: sql<number>`count(case when ${recipeInteractions.interactionDate} >= ${timeframes.hours6} then 1 end)`,
        views24h: sql<number>`count(case when ${recipeInteractions.interactionDate} >= ${timeframes.hours24} then 1 end)`,
        shares1h: sql<number>`(select count(*) from ${recipeShares} where ${recipeInteractions.recipeId} = ${recipeInteractions.recipeId} and ${recipeInteractions.interactionDate} >= ${timeframes.hours1})`,
        shares6h: sql<number>`(select count(*) from ${recipeShares} where ${recipeInteractions.recipeId} = ${recipeInteractions.recipeId} and ${recipeInteractions.interactionDate} >= ${timeframes.hours6})`,
        shares24h: sql<number>`(select count(*) from ${recipeShares} where ${recipeInteractions.recipeId} = ${recipeInteractions.recipeId} and ${recipeInteractions.interactionDate} >= ${timeframes.hours24})`
      })
      .from(recipeViews)
      .where(gte(recipeInteractions.interactionDate, timeframes.hours24))
      .groupBy(recipeInteractions.recipeId)
      .having(sql`count(*) >= 50`) // Minimum threshold for viral consideration
      .orderBy(sql`count(*) DESC`)
      .limit(limit * 3);

    // Analyze viral patterns
    const viral = viralCandidates
      .map(candidate => this.analyzeViralPattern(candidate))
      .filter(metrics => metrics.exponentialGrowth)
      .sort((a, b) => b.viralScore - a.viralScore)
      .slice(0, limit);

    // Cache for 2 minutes (viral content changes rapidly)
    await this.redis.set(cacheKey, viral, 120);

    return viral;
  }

  /**
   * Get recently favorited recipes by others
   */
  async getRecentlyFavorited(
    userId: string, 
    limit: number = 15,
    excludeOwn: boolean = true
  ): Promise<Recipe[]> {
    const cacheKey = `${this.TRENDING_PREFIX}recent_favorites:${userId}:${limit}:${excludeOwn}`;
    
    // Try cache first
    const cached = await this.redis.get<Recipe[]>(cacheKey);
    if (cached) {
      return cached;
    }

    let whereConditions = [
      eq(recipes.isApproved, true),
      gte(recipeFavorites.favoritedAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
    ];

    // Exclude user's own favorites
    if (excludeOwn) {
      whereConditions.push(sql`${recipeFavorites.userId} != ${userId}`);
    }

    const recentFavorites = await db
      .select({
        recipe: recipes,
        favoritedAt: recipeFavorites.favoritedAt,
        favoriteCount: sql<number>`count(*) over (partition by ${recipes.id})`
      })
      .from(recipeFavorites)
      .innerJoin(recipes, eq(recipeFavorites.recipeId, recipes.id))
      .where(and(...whereConditions))
      .orderBy(desc(recipeFavorites.favoritedAt))
      .limit(limit);

    const result = recentFavorites.map(item => item.recipe);

    // Cache for 5 minutes
    await this.redis.set(cacheKey, result, 300);

    return result;
  }

  /**
   * Get top rated recipes with minimum rating threshold
   */
  async getTopRatedRecipes(
    limit: number = 20,
    minRatings: number = 5,
    timeframe: '7d' | '30d' | 'all' = 'all'
  ): Promise<Recipe[]> {
    const cacheKey = `${this.POPULAR_PREFIX}top_rated:${timeframe}:${limit}:${minRatings}`;
    
    // Try cache first
    const cached = await this.redis.get<Recipe[]>(cacheKey);
    if (cached) {
      return cached;
    }

    let timeFilter = sql`true`;
    if (timeframe !== 'all') {
      const days = timeframe === '7d' ? 7 : 30;
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      timeFilter = sql`${recipeInteractions.interactionDate} >= ${cutoff}`;
    }

    const topRated = await db
      .select({
        recipe: recipes,
        avgRating: sql<number>`avg(${recipeInteractions.interactionValue})`,
        ratingCount: sql<number>`count(${recipeInteractions.interactionValue})`
      })
      .from(recipes)
      .innerJoin( eq(recipes.id, recipeInteractions.recipeId))
      .where(and(
        eq(recipes.isApproved, true),
        timeFilter
      ))
      .groupBy(recipes.id)
      .having(sql`count(${recipeInteractions.interactionValue}) >= ${minRatings}`)
      .orderBy(sql`avg(${recipeInteractions.interactionValue}) DESC, count(${recipeInteractions.interactionValue}) DESC`)
      .limit(limit);

    const result = topRated.map(item => item.recipe);

    // Cache for 30 minutes
    await this.redis.set(cacheKey, result, 1800);

    return result;
  }

  /**
   * Get engagement statistics for admin dashboard
   */
  async getEngagementStats(): Promise<{
    totalViews24h: number;
    totalShares24h: number;
    totalFavorites24h: number;
    totalRatings24h: number;
    activeUsers24h: number;
    topPerformingRecipe: string;
    growthRate: number;
  }> {
    const cacheKey = `${this.TRENDING_PREFIX}engagement_stats`;
    
    // Try cache first
    const cached = await this.redis.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const timeframes = this.getTimeframes();

    // Get 24h engagement metrics
    const [engagementResult] = await db
      .select({
        totalViews24h: sql<number>`(select count(*) from ${recipeViews} where ${recipeInteractions.interactionDate} >= ${timeframes.hours24})`,
        totalShares24h: sql<number>`(select count(*) from ${recipeShares} where ${recipeInteractions.interactionDate} >= ${timeframes.hours24})`,
        totalFavorites24h: sql<number>`(select count(*) from ${recipeFavorites} where ${recipeFavorites.favoritedAt} >= ${timeframes.hours24})`,
        totalRatings24h: sql<number>`(select count(*) from ${recipeRatings} where ${recipeInteractions.interactionDate} >= ${timeframes.hours24})`,
        activeUsers24h: sql<number>`(select count(distinct coalesce(${recipeInteractions.userId}, ${recipeInteractions.sessionId})) from ${recipeViews} where ${recipeInteractions.interactionDate} >= ${timeframes.hours24})`
      });

    // Get top performing recipe
    const [topRecipe] = await db
      .select({
        recipeId: recipeInteractions.recipeId,
        score: sql<number>`count(*) + coalesce((select count(*) * 5 from ${recipeShares} where ${recipeInteractions.recipeId} = ${recipeInteractions.recipeId} and ${recipeInteractions.interactionDate} >= ${timeframes.hours24}), 0)`
      })
      .from(recipeViews)
      .where(gte(recipeInteractions.interactionDate, timeframes.hours24))
      .groupBy(recipeInteractions.recipeId)
      .orderBy(sql`count(*) + coalesce((select count(*) * 5 from ${recipeShares} where ${recipeInteractions.recipeId} = ${recipeInteractions.recipeId} and ${recipeInteractions.interactionDate} >= ${timeframes.hours24}), 0) DESC`)
      .limit(1);

    // Calculate growth rate (compare to previous 24h)
    const [previousEngagement] = await db
      .select({
        previousViews: sql<number>`count(*)`
      })
      .from(recipeViews)
      .where(and(
        gte(recipeInteractions.interactionDate, new Date(timeframes.hours24.getTime() - 24 * 60 * 60 * 1000)),
        lt(recipeInteractions.interactionDate, timeframes.hours24)
      ));

    const growthRate = previousEngagement.previousViews > 0 
      ? ((engagementResult.totalViews24h - previousEngagement.previousViews) / previousEngagement.previousViews) * 100
      : 0;

    const stats = {
      ...engagementResult,
      topPerformingRecipe: topRecipe?.recipeId || '',
      growthRate
    };

    // Cache for 5 minutes
    await this.redis.set(cacheKey, stats, 300);

    return stats;
  }

  /**
   * Private helper methods
   */
  private getTimeframes(): TrendingTimeframe {
    const now = new Date();
    return {
      hours1: new Date(now.getTime() - 60 * 60 * 1000),
      hours6: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      hours24: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      days7: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      days30: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    };
  }

  private async calculateTrendingMetrics(cutoffTime: Date, category?: string): Promise<any[]> {
    const timeframes = this.getTimeframes();

    let categoryFilter = sql`true`;
    if (category) {
      categoryFilter = sql`${recipes.mealTypes} @> ${JSON.stringify([category])}`;
    }

    return await db
      .select({
        recipe: recipes,
        views24h: sql<number>`count(case when ${recipeInteractions.interactionDate} >= ${timeframes.hours24} then 1 end)`,
        views7d: sql<number>`count(case when ${recipeInteractions.interactionDate} >= ${timeframes.days7} then 1 end)`,
        shares24h: sql<number>`(select count(*) from ${recipeShares} where ${recipeInteractions.recipeId} = ${recipes.id} and ${recipeInteractions.interactionDate} >= ${timeframes.hours24})`,
        shares7d: sql<number>`(select count(*) from ${recipeShares} where ${recipeInteractions.recipeId} = ${recipes.id} and ${recipeInteractions.interactionDate} >= ${timeframes.days7})`,
        favorites24h: sql<number>`(select count(*) from ${recipeFavorites} where ${recipeFavorites.recipeId} = ${recipes.id} and ${recipeFavorites.favoritedAt} >= ${timeframes.hours24})`,
        favorites7d: sql<number>`(select count(*) from ${recipeFavorites} where ${recipeFavorites.recipeId} = ${recipes.id} and ${recipeFavorites.favoritedAt} >= ${timeframes.days7})`,
        ratings24h: sql<number>`(select count(*) from ${recipeRatings} where ${recipeInteractions.recipeId} = ${recipes.id} and ${recipeInteractions.interactionDate} >= ${timeframes.hours24})`,
        avgRating: sql<number>`(select avg(${recipeInteractions.interactionValue}) from ${recipeRatings} where ${recipeInteractions.recipeId} = ${recipes.id})`
      })
      .from(recipes)
      .leftJoin(recipeInteractions, eq(recipes.id, recipeInteractions.recipeId))
      .where(and(
        eq(recipes.isApproved, true),
        gte(recipeInteractions.interactionDate, cutoffTime),
        categoryFilter
      ))
      .groupBy(recipes.id)
      .having(sql`count(case when ${recipeInteractions.interactionDate} >= ${cutoffTime} then 1 end) > 0`);
  }

  private enhanceTrendingData(data: any): TrendingRecipe {
    const velocityScore = this.calculateVelocityScore(data.views24h, data.views7d, data.shares24h);
    const viralCoefficient = this.calculateViralCoefficient(data.views24h, data.shares24h);
    const momentum = this.calculateMomentum(data.views24h, data.views7d);

    // Advanced trending score formula
    const baseScore = data.views24h * 1.0;
    const shareBoost = data.shares24h * 10.0;
    const favoriteBoost = data.favorites24h * 5.0;
    const ratingBoost = data.interactionValues24h * 3.0;
    const qualityMultiplier = data.avgRating > 4 ? 1.5 : data.avgRating > 3 ? 1.2 : 1.0;
    const velocityMultiplier = 1 + (velocityScore / 100);
    const viralMultiplier = 1 + (viralCoefficient / 50);

    const trendingScore = (baseScore + shareBoost + favoriteBoost + ratingBoost) 
      * qualityMultiplier * velocityMultiplier * viralMultiplier;

    return {
      ...data.recipe,
      trendingScore: Math.round(trendingScore),
      views24h: data.views24h,
      views7d: data.views7d,
      shares24h: data.shares24h,
      shares7d: data.shares7d,
      favorites24h: data.favorites24h,
      favorites7d: data.favorites7d,
      ratings24h: data.interactionValues24h,
      avgRating: Number(data.avgRating) || 0,
      velocityScore,
      viralCoefficient,
      momentum
    };
  }

  private enhancePopularData(data: any): PopularRecipe {
    const consistency = this.calculateConsistency(data.firstRating, data.lastRating, data.totalRatings);
    const longevity = this.calculateLongevity(data.recipe.creationTimestamp);

    // Popularity score formula
    const viewScore = Math.min(data.totalViews / 100, 50); // Max 50 points for views
    const ratingScore = (data.avgRating / 5) * 30; // Max 30 points for rating quality
    const countScore = Math.min(data.totalRatings / 20, 20); // Max 20 points for rating count
    const favoriteScore = Math.min(data.totalFavorites / 10, 15); // Max 15 points for favorites
    const shareScore = Math.min(data.totalShares / 5, 10); // Max 10 points for shares
    const consistencyBonus = consistency * 5; // Max 5 points for consistency
    const longevityBonus = longevity * 5; // Max 5 points for longevity

    const popularityScore = viewScore + ratingScore + countScore + favoriteScore + shareScore + consistencyBonus + longevityBonus;

    return {
      ...data.recipe,
      popularityScore: Math.round(popularityScore),
      totalViews: data.totalViews,
      totalRatings: data.totalRatings,
      totalFavorites: data.totalFavorites,
      totalShares: data.totalShares,
      avgRating: Number(data.avgRating) || 0,
      consistency,
      longevity
    };
  }

  private calculateVelocityScore(views24h: number, views7d: number, shares24h: number): number {
    const dailyAverage = views7d / 7;
    const acceleration = dailyAverage > 0 ? (views24h / dailyAverage) : 1;
    const shareVelocity = shares24h > 0 ? shares24h * 2 : 0;
    
    return Math.min((acceleration - 1) * 50 + shareVelocity, 100);
  }

  private calculateViralCoefficient(views24h: number, shares24h: number): number {
    if (views24h === 0) return 0;
    const shareRate = shares24h / views24h;
    return Math.min(shareRate * 1000, 100); // Normalize to 0-100
  }

  private calculateMomentum(views24h: number, views7d: number): string {
    const dailyAverage = views7d / 7;
    const ratio = dailyAverage > 0 ? views24h / dailyAverage : 1;
    
    if (ratio > 1.5) return 'rising';
    if (ratio < 0.7) return 'declining';
    return 'stable';
  }

  private calculateConsistency(firstRating: Date, lastRating: Date, totalRatings: number): number {
    if (!firstRating || !lastRating || totalRatings < 5) return 0;
    
    const timeSpan = lastRating.getTime() - firstRating.getTime();
    const days = timeSpan / (1000 * 60 * 60 * 24);
    
    if (days === 0) return 0;
    
    const ratingsPerDay = totalRatings / days;
    return Math.min(ratingsPerDay / 2, 1); // Normalize to 0-1
  }

  private calculateLongevity(creationDate: Date): number {
    const now = new Date();
    const ageInDays = (now.getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24);
    
    // Recipes that maintain popularity over time get higher longevity scores
    if (ageInDays > 365) return 1; // 1 year+
    if (ageInDays > 180) return 0.8; // 6 months+
    if (ageInDays > 90) return 0.6; // 3 months+
    if (ageInDays > 30) return 0.4; // 1 month+
    return 0.2; // New recipes
  }

  private analyzeViralPattern(candidate: any): ViralMetrics {
    const shareVelocity = candidate.shares6h > 0 ? candidate.shares1h / candidate.shares6h : 0;
    const viewGrowth = candidate.views6h > 0 ? candidate.views1h / candidate.views6h : 0;
    
    // Detect exponential growth pattern
    const exponentialGrowth = viewGrowth > 0.3 && shareVelocity > 0.2 && candidate.shares1h > 2;
    
    // Calculate viral score
    const viralScore = (candidate.views1h * 1.0) + 
                      (candidate.shares1h * 20.0) + 
                      (shareVelocity * 50.0) + 
                      (viewGrowth * 30.0);

    // Determine viral phase
    let currentPhase: 'emerging' | 'viral' | 'peak' | 'declining';
    if (candidate.views1h > candidate.views6h * 0.5) {
      currentPhase = 'viral';
    } else if (candidate.views1h > candidate.views6h * 0.3) {
      currentPhase = 'emerging';
    } else if (candidate.views6h > candidate.views24h * 0.3) {
      currentPhase = 'peak';
    } else {
      currentPhase = 'declining';
    }

    return {
      recipeId: candidate.recipeId,
      viralScore: Math.round(viralScore),
      shareVelocity,
      exponentialGrowth,
      peakDay: new Date(), // Simplified - would need more sophisticated analysis
      currentPhase
    };
  }

  private async calculateCategoryTrend(category: string): Promise<'up' | 'down' | 'stable'> {
    // Simplified category trend calculation
    // Compare current 24h engagement vs previous 24h for the category
    const timeframes = this.getTimeframes();
    const previousDay = new Date(timeframes.hours24.getTime() - 24 * 60 * 60 * 1000);

    const [currentEngagement] = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(recipeViews)
      .innerJoin(recipes, eq(recipeInteractions.recipeId, recipes.id))
      .where(and(
        gte(recipeInteractions.interactionDate, timeframes.hours24),
        sql`${recipes.mealTypes} @> ${JSON.stringify([category])}`
      ));

    const [previousEngagement] = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(recipeViews)
      .innerJoin(recipes, eq(recipeInteractions.recipeId, recipes.id))
      .where(and(
        gte(recipeInteractions.interactionDate, previousDay),
        lt(recipeInteractions.interactionDate, timeframes.hours24),
        sql`${recipes.mealTypes} @> ${JSON.stringify([category])}`
      ));

    const currentCount = currentEngagement.count;
    const previousCount = previousEngagement.count;

    if (previousCount === 0) return 'stable';

    const changeRatio = currentCount / previousCount;
    
    if (changeRatio > 1.2) return 'up';
    if (changeRatio < 0.8) return 'down';
    return 'stable';
  }

  /**
   * Health check for trending service
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
        message: 'TrendingService is operational'
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
let trendingService: TrendingService | null = null;

export function getTrendingService(): TrendingService {
  if (!trendingService) {
    trendingService = new TrendingService();
  }
  return trendingService;
}

export default TrendingService;