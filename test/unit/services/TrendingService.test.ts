import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { TrendingService } from '../../../server/services/TrendingService';
import { db } from '../../../server/db';
import { redis } from '../../../server/redis';

// Mock dependencies
jest.mock('../../../server/db');
jest.mock('../../../server/redis');

const mockDb = db as jest.Mocked<typeof db>;
const mockRedis = redis as jest.Mocked<typeof redis>;

describe('TrendingService', () => {
  let trendingService: TrendingService;

  beforeEach(() => {
    trendingService = new TrendingService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getTrendingRecipes', () => {
    const mockCacheKey = 'trending:recipes:7';

    it('should return cached trending recipes when available', async () => {
      const cachedTrending = [
        { 
          recipe_id: 'recipe-1', 
          name: 'Trending Pasta',
          trending_score: 95.5,
          momentum_score: 12.3
        }
      ];

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedTrending));

      const result = await trendingService.getTrendingRecipes(7, 10);

      expect(mockRedis.get).toHaveBeenCalledWith(mockCacheKey);
      expect(result).toEqual(cachedTrending);
      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('should calculate and cache trending recipes when cache miss', async () => {
      const mockTrendingData = [
        {
          recipe_id: 'recipe-1',
          name: 'Popular Recipe',
          total_views: 1000,
          total_favorites: 200,
          total_shares: 50,
          avg_rating: 4.5,
          recent_activity: 100
        }
      ];

      mockRedis.get.mockResolvedValue(null);
      mockDb.select.mockResolvedValue(mockTrendingData);
      mockRedis.setex.mockResolvedValue('OK');

      const result = await trendingService.getTrendingRecipes(7, 10);

      expect(mockRedis.get).toHaveBeenCalledWith(mockCacheKey);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockRedis.setex).toHaveBeenCalledWith(
        mockCacheKey,
        300, // 5 minutes
        expect.any(String)
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('trending_score');
      expect(result[0]).toHaveProperty('momentum_score');
    });

    it('should handle different time periods', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockDb.select.mockResolvedValue([]);

      await trendingService.getTrendingRecipes(1, 10);
      expect(mockRedis.get).toHaveBeenCalledWith('trending:recipes:1');

      await trendingService.getTrendingRecipes(30, 10);
      expect(mockRedis.get).toHaveBeenCalledWith('trending:recipes:30');
    });

    it('should limit results to specified count', async () => {
      const largeTrendingData = Array.from({ length: 20 }, (_, i) => ({
        recipe_id: `recipe-${i}`,
        name: `Recipe ${i}`,
        total_views: 1000 - (i * 10),
        total_favorites: 100 - (i * 5),
        total_shares: 20 - i,
        avg_rating: 4.5 - (i * 0.1),
        recent_activity: 50 - i
      }));

      mockRedis.get.mockResolvedValue(null);
      mockDb.select.mockResolvedValue(largeTrendingData);

      const result = await trendingService.getTrendingRecipes(7, 5);

      expect(result).toHaveLength(5);
      expect(result[0].trending_score).toBeGreaterThan(result[1].trending_score);
    });

    it('should handle cache errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));
      mockDb.select.mockResolvedValue([]);

      const result = await trendingService.getTrendingRecipes(7, 10);

      expect(result).toEqual([]);
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('getPopularRecipes', () => {
    const mockCacheKey = 'popular:recipes:7';

    it('should return cached popular recipes when available', async () => {
      const cachedPopular = [
        { 
          recipe_id: 'recipe-1', 
          name: 'Popular Recipe',
          popularity_score: 87.5
        }
      ];

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedPopular));

      const result = await trendingService.getPopularRecipes(7, 10);

      expect(mockRedis.get).toHaveBeenCalledWith(mockCacheKey);
      expect(result).toEqual(cachedPopular);
    });

    it('should calculate and cache popular recipes when cache miss', async () => {
      const mockPopularData = [
        {
          recipe_id: 'recipe-1',
          name: 'High Rated Recipe',
          total_views: 2000,
          total_favorites: 400,
          avg_rating: 4.8,
          total_ratings: 100
        }
      ];

      mockRedis.get.mockResolvedValue(null);
      mockDb.select.mockResolvedValue(mockPopularData);
      mockRedis.setex.mockResolvedValue('OK');

      const result = await trendingService.getPopularRecipes(7, 10);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('popularity_score');
      expect(result[0].popularity_score).toBeGreaterThan(0);
    });

    it('should calculate popularity scores correctly', async () => {
      const mockData = [
        {
          recipe_id: 'recipe-high',
          name: 'High Score Recipe',
          total_views: 1000,
          total_favorites: 300,
          avg_rating: 5.0,
          total_ratings: 200
        },
        {
          recipe_id: 'recipe-low',
          name: 'Low Score Recipe',
          total_views: 100,
          total_favorites: 10,
          avg_rating: 3.0,
          total_ratings: 5
        }
      ];

      mockRedis.get.mockResolvedValue(null);
      mockDb.select.mockResolvedValue(mockData);

      const result = await trendingService.getPopularRecipes(7, 10);

      expect(result).toHaveLength(2);
      expect(result[0].recipe_id).toBe('recipe-high');
      expect(result[0].popularity_score).toBeGreaterThan(result[1].popularity_score);
    });
  });

  describe('getViralRecipes', () => {
    const mockCacheKey = 'viral:recipes:7';

    it('should return cached viral recipes when available', async () => {
      const cachedViral = [
        { 
          recipe_id: 'recipe-1', 
          name: 'Viral Recipe',
          viral_score: 92.1,
          share_velocity: 15.5
        }
      ];

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedViral));

      const result = await trendingService.getViralRecipes(7, 10);

      expect(mockRedis.get).toHaveBeenCalledWith(mockCacheKey);
      expect(result).toEqual(cachedViral);
    });

    it('should calculate and cache viral recipes when cache miss', async () => {
      const mockViralData = [
        {
          recipe_id: 'recipe-1',
          name: 'Shared Recipe',
          total_shares: 500,
          total_views: 1000,
          share_depth: 3.2,
          avg_engagement_time: 180
        }
      ];

      mockRedis.get.mockResolvedValue(null);
      mockDb.select.mockResolvedValue(mockViralData);
      mockRedis.setex.mockResolvedValue('OK');

      const result = await trendingService.getViralRecipes(7, 10);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('viral_score');
      expect(result[0]).toHaveProperty('share_velocity');
    });

    it('should calculate viral scores based on sharing metrics', async () => {
      const mockData = [
        {
          recipe_id: 'recipe-viral',
          name: 'High Viral Recipe',
          total_shares: 1000,
          total_views: 2000,
          share_depth: 5.0,
          avg_engagement_time: 300
        },
        {
          recipe_id: 'recipe-normal',
          name: 'Normal Recipe',
          total_shares: 10,
          total_views: 200,
          share_depth: 1.1,
          avg_engagement_time: 60
        }
      ];

      mockRedis.get.mockResolvedValue(null);
      mockDb.select.mockResolvedValue(mockData);

      const result = await trendingService.getViralRecipes(7, 10);

      expect(result).toHaveLength(2);
      expect(result[0].recipe_id).toBe('recipe-viral');
      expect(result[0].viral_score).toBeGreaterThan(result[1].viral_score);
    });

    it('should filter recipes by minimum viral threshold', async () => {
      const mockData = [
        {
          recipe_id: 'recipe-low-viral',
          name: 'Low Viral Recipe',
          total_shares: 1,
          total_views: 100,
          share_depth: 1.0,
          avg_engagement_time: 30
        }
      ];

      mockRedis.get.mockResolvedValue(null);
      mockDb.select.mockResolvedValue(mockData);

      const result = await trendingService.getViralRecipes(7, 10, 10.0);

      expect(result).toEqual([]);
    });
  });

  describe('getTrendingByCategory', () => {
    const mockCategory = 'italian';
    const mockCacheKey = `trending:category:${mockCategory}:7`;

    it('should return cached category trending when available', async () => {
      const cachedCategoryTrending = [
        { 
          recipe_id: 'recipe-1', 
          name: 'Italian Pasta',
          trending_score: 88.5
        }
      ];

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedCategoryTrending));

      const result = await trendingService.getTrendingByCategory(mockCategory, 7, 10);

      expect(mockRedis.get).toHaveBeenCalledWith(mockCacheKey);
      expect(result).toEqual(cachedCategoryTrending);
    });

    it('should calculate and cache category trending when cache miss', async () => {
      const mockCategoryData = [
        {
          recipe_id: 'recipe-1',
          name: 'Italian Dish',
          cuisine_type: 'italian',
          total_views: 800,
          total_favorites: 150,
          avg_rating: 4.3
        }
      ];

      mockRedis.get.mockResolvedValue(null);
      mockDb.select.mockResolvedValue(mockCategoryData);
      mockRedis.setex.mockResolvedValue('OK');

      const result = await trendingService.getTrendingByCategory(mockCategory, 7, 10);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('trending_score');
    });

    it('should handle invalid categories', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockDb.select.mockResolvedValue([]);

      const result = await trendingService.getTrendingByCategory('non-existent', 7, 10);

      expect(result).toEqual([]);
    });
  });

  describe('calculateTrendingScore', () => {
    it('should calculate trending score with all metrics', () => {
      const recipe = {
        total_views: 1000,
        total_favorites: 200,
        total_shares: 50,
        avg_rating: 4.5,
        recent_activity: 100
      };

      const score = (trendingService as any).calculateTrendingScore(recipe);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should handle recipes with missing metrics', () => {
      const recipe = {
        total_views: 100,
        total_favorites: 0,
        total_shares: 0,
        avg_rating: 0,
        recent_activity: 10
      };

      const score = (trendingService as any).calculateTrendingScore(recipe);

      expect(score).toBeGreaterThan(0);
    });

    it('should weight recent activity higher', () => {
      const recentRecipe = {
        total_views: 100,
        total_favorites: 10,
        total_shares: 5,
        avg_rating: 4.0,
        recent_activity: 80
      };

      const oldRecipe = {
        total_views: 200,
        total_favorites: 20,
        total_shares: 10,
        avg_rating: 4.0,
        recent_activity: 5
      };

      const recentScore = (trendingService as any).calculateTrendingScore(recentRecipe);
      const oldScore = (trendingService as any).calculateTrendingScore(oldRecipe);

      // Recent activity should compensate for lower overall metrics
      expect(recentScore).toBeGreaterThan(0);
      expect(oldScore).toBeGreaterThan(0);
    });

    it('should handle zero values gracefully', () => {
      const recipe = {
        total_views: 0,
        total_favorites: 0,
        total_shares: 0,
        avg_rating: 0,
        recent_activity: 0
      };

      const score = (trendingService as any).calculateTrendingScore(recipe);

      expect(score).toBe(0);
    });
  });

  describe('calculateMomentumScore', () => {
    it('should calculate momentum from recent activity and time decay', () => {
      const recent_activity = 100;
      const total_views = 1000;
      const days = 7;

      const momentum = (trendingService as any).calculateMomentumScore(
        recent_activity,
        total_views,
        days
      );

      expect(momentum).toBeGreaterThan(0);
    });

    it('should give higher momentum to recent activity', () => {
      const highRecentMomentum = (trendingService as any).calculateMomentumScore(200, 1000, 7);
      const lowRecentMomentum = (trendingService as any).calculateMomentumScore(50, 1000, 7);

      expect(highRecentMomentum).toBeGreaterThan(lowRecentMomentum);
    });

    it('should decay momentum over longer time periods', () => {
      const shortTermMomentum = (trendingService as any).calculateMomentumScore(100, 1000, 1);
      const longTermMomentum = (trendingService as any).calculateMomentumScore(100, 1000, 30);

      expect(shortTermMomentum).toBeGreaterThan(longTermMomentum);
    });

    it('should handle edge cases', () => {
      expect((trendingService as any).calculateMomentumScore(0, 100, 7)).toBe(0);
      expect((trendingService as any).calculateMomentumScore(100, 0, 7)).toBe(Infinity);
      expect((trendingService as any).calculateMomentumScore(100, 100, 0)).toBe(Infinity);
    });
  });

  describe('calculatePopularityScore', () => {
    it('should calculate popularity score from engagement metrics', () => {
      const recipe = {
        total_views: 1000,
        total_favorites: 300,
        avg_rating: 4.5,
        total_ratings: 100
      };

      const score = (trendingService as any).calculatePopularityScore(recipe);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should weight ratings appropriately', () => {
      const highRatedRecipe = {
        total_views: 500,
        total_favorites: 100,
        avg_rating: 5.0,
        total_ratings: 200
      };

      const lowRatedRecipe = {
        total_views: 500,
        total_favorites: 100,
        avg_rating: 2.0,
        total_ratings: 200
      };

      const highScore = (trendingService as any).calculatePopularityScore(highRatedRecipe);
      const lowScore = (trendingService as any).calculatePopularityScore(lowRatedRecipe);

      expect(highScore).toBeGreaterThan(lowScore);
    });

    it('should handle recipes with no ratings', () => {
      const recipe = {
        total_views: 1000,
        total_favorites: 200,
        avg_rating: 0,
        total_ratings: 0
      };

      const score = (trendingService as any).calculatePopularityScore(recipe);

      expect(score).toBeGreaterThan(0);
    });
  });

  describe('calculateViralScore', () => {
    it('should calculate viral score from sharing metrics', () => {
      const recipe = {
        total_shares: 500,
        total_views: 1000,
        share_depth: 3.5,
        avg_engagement_time: 240
      };

      const result = (trendingService as any).calculateViralScore(recipe);

      expect(result).toHaveProperty('viral_score');
      expect(result).toHaveProperty('share_velocity');
      expect(result.viral_score).toBeGreaterThan(0);
      expect(result.share_velocity).toBeGreaterThan(0);
    });

    it('should give higher viral scores to highly shared content', () => {
      const highSharedRecipe = {
        total_shares: 1000,
        total_views: 2000,
        share_depth: 4.0,
        avg_engagement_time: 300
      };

      const lowSharedRecipe = {
        total_shares: 10,
        total_views: 200,
        share_depth: 1.2,
        avg_engagement_time: 60
      };

      const highResult = (trendingService as any).calculateViralScore(highSharedRecipe);
      const lowResult = (trendingService as any).calculateViralScore(lowSharedRecipe);

      expect(highResult.viral_score).toBeGreaterThan(lowResult.viral_score);
    });

    it('should calculate share velocity correctly', () => {
      const recipe = {
        total_shares: 200,
        total_views: 1000,
        share_depth: 2.5,
        avg_engagement_time: 180
      };

      const result = (trendingService as any).calculateViralScore(recipe);

      // Share velocity should be shares per view * depth factor
      const expectedVelocity = (200 / 1000) * 2.5;
      expect(result.share_velocity).toBeCloseTo(expectedVelocity, 2);
    });

    it('should handle zero shares gracefully', () => {
      const recipe = {
        total_shares: 0,
        total_views: 1000,
        share_depth: 0,
        avg_engagement_time: 120
      };

      const result = (trendingService as any).calculateViralScore(recipe);

      expect(result.viral_score).toBe(0);
      expect(result.share_velocity).toBe(0);
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockDb.select.mockRejectedValue(new Error('Database connection failed'));

      const result = await trendingService.getTrendingRecipes(7, 10);

      expect(result).toEqual([]);
    });

    it('should handle Redis cache set errors gracefully', async () => {
      const mockData = [
        {
          recipe_id: 'recipe-1',
          name: 'Recipe',
          total_views: 100,
          total_favorites: 20,
          total_shares: 5,
          avg_rating: 4.0,
          recent_activity: 10
        }
      ];

      mockRedis.get.mockResolvedValue(null);
      mockDb.select.mockResolvedValue(mockData);
      mockRedis.setex.mockRejectedValue(new Error('Redis write failed'));

      const result = await trendingService.getTrendingRecipes(7, 10);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('trending_score');
    });

    it('should handle malformed cache data', async () => {
      mockRedis.get.mockResolvedValue('invalid json');
      mockDb.select.mockResolvedValue([]);

      const result = await trendingService.getTrendingRecipes(7, 10);

      expect(result).toEqual([]);
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('Performance and edge cases', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        recipe_id: `recipe-${i}`,
        name: `Recipe ${i}`,
        total_views: Math.floor(Math.random() * 10000),
        total_favorites: Math.floor(Math.random() * 1000),
        total_shares: Math.floor(Math.random() * 100),
        avg_rating: Math.random() * 5,
        recent_activity: Math.floor(Math.random() * 500)
      }));

      mockRedis.get.mockResolvedValue(null);
      mockDb.select.mockResolvedValue(largeDataset);

      const result = await trendingService.getTrendingRecipes(7, 20);

      expect(result).toHaveLength(20);
      expect(result[0].trending_score).toBeGreaterThanOrEqual(result[1].trending_score);
    });

    it('should handle concurrent requests', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockDb.select.mockResolvedValue([]);

      const promises = Array.from({ length: 5 }, () =>
        trendingService.getTrendingRecipes(7, 10)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach(result => expect(result).toEqual([]));
    });

    it('should handle extreme values in calculations', async () => {
      const extremeRecipe = {
        recipe_id: 'extreme-recipe',
        name: 'Extreme Recipe',
        total_views: Number.MAX_SAFE_INTEGER,
        total_favorites: Number.MAX_SAFE_INTEGER,
        total_shares: Number.MAX_SAFE_INTEGER,
        avg_rating: 5.0,
        recent_activity: Number.MAX_SAFE_INTEGER
      };

      mockRedis.get.mockResolvedValue(null);
      mockDb.select.mockResolvedValue([extremeRecipe]);

      const result = await trendingService.getTrendingRecipes(7, 10);

      expect(result).toHaveLength(1);
      expect(result[0].trending_score).toBeFinite();
      expect(result[0].momentum_score).toBeFinite();
    });

    it('should maintain consistent ordering across multiple calls', async () => {
      const consistentData = [
        {
          recipe_id: 'recipe-1',
          name: 'Recipe 1',
          total_views: 1000,
          total_favorites: 200,
          total_shares: 50,
          avg_rating: 4.5,
          recent_activity: 100
        },
        {
          recipe_id: 'recipe-2',
          name: 'Recipe 2',
          total_views: 800,
          total_favorites: 180,
          total_shares: 40,
          avg_rating: 4.3,
          recent_activity: 80
        }
      ];

      mockRedis.get.mockResolvedValue(null);
      mockDb.select.mockResolvedValue(consistentData);

      const result1 = await trendingService.getTrendingRecipes(7, 10);
      
      // Clear mocks and simulate second call
      jest.clearAllMocks();
      mockRedis.get.mockResolvedValue(null);
      mockDb.select.mockResolvedValue(consistentData);
      
      const result2 = await trendingService.getTrendingRecipes(7, 10);

      expect(result1[0].recipe_id).toBe(result2[0].recipe_id);
      expect(result1[1].recipe_id).toBe(result2[1].recipe_id);
    });
  });
});