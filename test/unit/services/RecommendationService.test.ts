import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { RecommendationService } from '../../../server/services/RecommendationService';
import { db } from '../../../server/db';
import { redis } from '../../../server/redis';

// Mock dependencies
jest.mock('../../../server/db');
jest.mock('../../../server/redis');

const mockDb = db as jest.Mocked<typeof db>;
const mockRedis = redis as jest.Mocked<typeof redis>;

describe('RecommendationService', () => {
  let recommendationService: RecommendationService;

  beforeEach(() => {
    recommendationService = new RecommendationService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getRecommendations', () => {
    const mockUserId = 'user-123';
    const mockCacheKey = `recommendations:${mockUserId}`;

    it('should return cached recommendations when available', async () => {
      const cachedRecommendations = [
        { recipe_id: 'recipe-1', score: 0.95, algorithm: 'collaborative' },
        { recipe_id: 'recipe-2', score: 0.87, algorithm: 'content' }
      ];

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedRecommendations));

      const result = await recommendationService.getRecommendations(mockUserId);

      expect(mockRedis.get).toHaveBeenCalledWith(mockCacheKey);
      expect(result).toEqual(cachedRecommendations);
      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('should generate and cache recommendations when cache miss', async () => {
      const mockUserPreferences = [
        { preference_key: 'cuisine', preference_value: 'italian', weight: 0.8 }
      ];
      const mockSimilarUsers = [
        { user_id: 'user-456', similarity_score: 0.85 }
      ];
      const mockRecommendations = [
        { recipe_id: 'recipe-1', score: 0.92, algorithm: 'hybrid' }
      ];

      mockRedis.get.mockResolvedValue(null);
      mockDb.select.mockResolvedValueOnce(mockUserPreferences);
      mockDb.select.mockResolvedValueOnce(mockSimilarUsers);
      
      // Mock the recommendation generation
      jest.spyOn(recommendationService as any, 'generateCollaborativeRecommendations')
        .mockResolvedValue([{ recipe_id: 'recipe-1', score: 0.9, algorithm: 'collaborative' }]);
      jest.spyOn(recommendationService as any, 'generateContentBasedRecommendations')
        .mockResolvedValue([{ recipe_id: 'recipe-1', score: 0.8, algorithm: 'content' }]);
      jest.spyOn(recommendationService as any, 'combineRecommendations')
        .mockReturnValue(mockRecommendations);

      mockRedis.setex.mockResolvedValue('OK');

      const result = await recommendationService.getRecommendations(mockUserId, 5, 'hybrid');

      expect(mockRedis.get).toHaveBeenCalledWith(mockCacheKey);
      expect(mockDb.select).toHaveBeenCalledTimes(2);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        mockCacheKey,
        7200, // 2 hours
        JSON.stringify(mockRecommendations)
      );
      expect(result).toEqual(mockRecommendations);
    });

    it('should handle different algorithm types', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockDb.select.mockResolvedValue([]);

      const collaborativeSpy = jest.spyOn(recommendationService as any, 'generateCollaborativeRecommendations')
        .mockResolvedValue([]);
      const contentSpy = jest.spyOn(recommendationService as any, 'generateContentBasedRecommendations')
        .mockResolvedValue([]);

      await recommendationService.getRecommendations(mockUserId, 5, 'collaborative');
      expect(collaborativeSpy).toHaveBeenCalled();
      expect(contentSpy).not.toHaveBeenCalled();

      jest.clearAllMocks();
      mockRedis.get.mockResolvedValue(null);

      await recommendationService.getRecommendations(mockUserId, 5, 'content');
      expect(contentSpy).toHaveBeenCalled();
      expect(collaborativeSpy).not.toHaveBeenCalled();
    });

    it('should handle cache errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));
      mockDb.select.mockResolvedValue([]);

      jest.spyOn(recommendationService as any, 'generateCollaborativeRecommendations')
        .mockResolvedValue([]);
      jest.spyOn(recommendationService as any, 'generateContentBasedRecommendations')
        .mockResolvedValue([]);

      const result = await recommendationService.getRecommendations(mockUserId);

      expect(result).toEqual([]);
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('findSimilarUsers', () => {
    const mockUserId = 'user-123';

    it('should find users with similar preferences', async () => {
      const mockUserPreferences = [
        { preference_key: 'cuisine', preference_value: 'italian' },
        { preference_key: 'diet', preference_value: 'vegetarian' }
      ];
      const mockSimilarUsers = [
        { user_id: 'user-456', similarity_score: 0.85 },
        { user_id: 'user-789', similarity_score: 0.72 }
      ];

      mockDb.select.mockResolvedValueOnce(mockUserPreferences);
      mockDb.select.mockResolvedValueOnce(mockSimilarUsers);

      const result = await recommendationService.findSimilarUsers(mockUserId, 5);

      expect(mockDb.select).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockSimilarUsers);
    });

    it('should handle users with no preferences', async () => {
      mockDb.select.mockResolvedValueOnce([]);

      const result = await recommendationService.findSimilarUsers(mockUserId, 5);

      expect(result).toEqual([]);
      expect(mockDb.select).toHaveBeenCalledTimes(1);
    });

    it('should limit results to specified count', async () => {
      const mockUserPreferences = [
        { preference_key: 'cuisine', preference_value: 'italian' }
      ];
      const mockSimilarUsers = Array.from({ length: 10 }, (_, i) => ({
        user_id: `user-${i}`,
        similarity_score: 0.9 - (i * 0.1)
      }));

      mockDb.select.mockResolvedValueOnce(mockUserPreferences);
      mockDb.select.mockResolvedValueOnce(mockSimilarUsers);

      const result = await recommendationService.findSimilarUsers(mockUserId, 3);

      expect(result).toHaveLength(3);
      expect(result[0].similarity_score).toBeGreaterThan(result[1].similarity_score);
    });
  });

  describe('calculatePearsonCorrelation', () => {
    it('should calculate correlation between two rating arrays', () => {
      const ratingsA = [5, 4, 3, 5, 2];
      const ratingsB = [4, 5, 2, 4, 1];

      const correlation = recommendationService.calculatePearsonCorrelation(ratingsA, ratingsB);

      expect(correlation).toBeGreaterThan(0);
      expect(correlation).toBeLessThanOrEqual(1);
    });

    it('should return 0 for arrays with no variance', () => {
      const ratingsA = [3, 3, 3, 3, 3];
      const ratingsB = [4, 5, 2, 4, 1];

      const correlation = recommendationService.calculatePearsonCorrelation(ratingsA, ratingsB);

      expect(correlation).toBe(0);
    });

    it('should handle empty arrays', () => {
      const correlation = recommendationService.calculatePearsonCorrelation([], []);

      expect(correlation).toBe(0);
    });

    it('should handle arrays of different lengths', () => {
      const ratingsA = [5, 4, 3];
      const ratingsB = [4, 5];

      const correlation = recommendationService.calculatePearsonCorrelation(ratingsA, ratingsB);

      expect(correlation).toBe(0);
    });

    it('should calculate perfect positive correlation', () => {
      const ratingsA = [1, 2, 3, 4, 5];
      const ratingsB = [2, 4, 6, 8, 10];

      const correlation = recommendationService.calculatePearsonCorrelation(ratingsA, ratingsB);

      expect(correlation).toBeCloseTo(1, 2);
    });

    it('should calculate perfect negative correlation', () => {
      const ratingsA = [1, 2, 3, 4, 5];
      const ratingsB = [10, 8, 6, 4, 2];

      const correlation = recommendationService.calculatePearsonCorrelation(ratingsA, ratingsB);

      expect(correlation).toBeCloseTo(-1, 2);
    });
  });

  describe('generateCollaborativeRecommendations', () => {
    const mockUserId = 'user-123';
    const mockSimilarUsers = [
      { user_id: 'user-456', similarity_score: 0.85 },
      { user_id: 'user-789', similarity_score: 0.72 }
    ];

    it('should generate recommendations based on similar users', async () => {
      const mockSimilarUserFavorites = [
        { recipe_id: 'recipe-1', user_id: 'user-456', created_at: new Date() },
        { recipe_id: 'recipe-2', user_id: 'user-789', created_at: new Date() }
      ];
      const mockUserFavorites = []; // User hasn't favorited these recipes

      mockDb.select.mockResolvedValueOnce(mockSimilarUserFavorites);
      mockDb.select.mockResolvedValueOnce(mockUserFavorites);

      const result = await (recommendationService as any).generateCollaborativeRecommendations(
        mockUserId,
        mockSimilarUsers,
        5
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('recipe_id');
      expect(result[0]).toHaveProperty('score');
      expect(result[0]).toHaveProperty('algorithm', 'collaborative');
      expect(result[0].score).toBeGreaterThan(result[1].score); // Should be sorted by score
    });

    it('should exclude recipes already favorited by user', async () => {
      const mockSimilarUserFavorites = [
        { recipe_id: 'recipe-1', user_id: 'user-456', created_at: new Date() },
        { recipe_id: 'recipe-2', user_id: 'user-789', created_at: new Date() }
      ];
      const mockUserFavorites = [
        { recipe_id: 'recipe-1', user_id: mockUserId, created_at: new Date() }
      ];

      mockDb.select.mockResolvedValueOnce(mockSimilarUserFavorites);
      mockDb.select.mockResolvedValueOnce(mockUserFavorites);

      const result = await (recommendationService as any).generateCollaborativeRecommendations(
        mockUserId,
        mockSimilarUsers,
        5
      );

      expect(result).toHaveLength(1);
      expect(result[0].recipe_id).toBe('recipe-2');
    });

    it('should handle no similar users', async () => {
      const result = await (recommendationService as any).generateCollaborativeRecommendations(
        mockUserId,
        [],
        5
      );

      expect(result).toEqual([]);
      expect(mockDb.select).not.toHaveBeenCalled();
    });
  });

  describe('generateContentBasedRecommendations', () => {
    const mockUserId = 'user-123';
    const mockUserPreferences = [
      { preference_key: 'cuisine', preference_value: 'italian', weight: 0.8 },
      { preference_key: 'diet', preference_value: 'vegetarian', weight: 0.6 }
    ];

    it('should generate recommendations based on user preferences', async () => {
      const mockMatchingRecipes = [
        { 
          recipe_id: 'recipe-1', 
          name: 'Italian Pasta',
          cuisine_type: 'italian',
          dietary_tags: ['vegetarian'],
          avg_rating: 4.5
        },
        { 
          recipe_id: 'recipe-2', 
          name: 'Vegetarian Pizza',
          cuisine_type: 'italian',
          dietary_tags: ['vegetarian'],
          avg_rating: 4.2
        }
      ];
      const mockUserFavorites = [];

      mockDb.select.mockResolvedValueOnce(mockMatchingRecipes);
      mockDb.select.mockResolvedValueOnce(mockUserFavorites);

      const result = await (recommendationService as any).generateContentBasedRecommendations(
        mockUserId,
        mockUserPreferences,
        5
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('recipe_id');
      expect(result[0]).toHaveProperty('score');
      expect(result[0]).toHaveProperty('algorithm', 'content');
      expect(result[0].score).toBeGreaterThan(result[1].score);
    });

    it('should calculate scores based on preference weights', async () => {
      const mockMatchingRecipes = [
        { 
          recipe_id: 'recipe-1', 
          name: 'Italian Dish',
          cuisine_type: 'italian',
          dietary_tags: ['vegetarian'],
          avg_rating: 4.0
        }
      ];
      const mockUserFavorites = [];

      mockDb.select.mockResolvedValueOnce(mockMatchingRecipes);
      mockDb.select.mockResolvedValueOnce(mockUserFavorites);

      const result = await (recommendationService as any).generateContentBasedRecommendations(
        mockUserId,
        mockUserPreferences,
        5
      );

      expect(result[0].score).toBeGreaterThan(0);
      expect(result[0].score).toBeLessThanOrEqual(1);
    });

    it('should handle no matching recipes', async () => {
      mockDb.select.mockResolvedValueOnce([]);

      const result = await (recommendationService as any).generateContentBasedRecommendations(
        mockUserId,
        mockUserPreferences,
        5
      );

      expect(result).toEqual([]);
    });

    it('should handle no user preferences', async () => {
      const result = await (recommendationService as any).generateContentBasedRecommendations(
        mockUserId,
        [],
        5
      );

      expect(result).toEqual([]);
      expect(mockDb.select).not.toHaveBeenCalled();
    });
  });

  describe('combineRecommendations', () => {
    it('should combine collaborative and content-based recommendations', () => {
      const collaborativeRecs = [
        { recipe_id: 'recipe-1', score: 0.9, algorithm: 'collaborative' },
        { recipe_id: 'recipe-2', score: 0.7, algorithm: 'collaborative' }
      ];
      const contentRecs = [
        { recipe_id: 'recipe-2', score: 0.8, algorithm: 'content' },
        { recipe_id: 'recipe-3', score: 0.6, algorithm: 'content' }
      ];

      const result = (recommendationService as any).combineRecommendations(
        collaborativeRecs,
        contentRecs,
        5
      );

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('algorithm', 'hybrid');
      
      // Recipe-2 should have highest score (combination of both algorithms)
      const recipe2 = result.find(r => r.recipe_id === 'recipe-2');
      expect(recipe2?.score).toBeGreaterThan(0.8);
    });

    it('should handle empty recommendation arrays', () => {
      const result = (recommendationService as any).combineRecommendations([], [], 5);

      expect(result).toEqual([]);
    });

    it('should limit results to specified count', () => {
      const collaborativeRecs = Array.from({ length: 10 }, (_, i) => ({
        recipe_id: `recipe-${i}`,
        score: 0.9 - (i * 0.05),
        algorithm: 'collaborative'
      }));

      const result = (recommendationService as any).combineRecommendations(
        collaborativeRecs,
        [],
        5
      );

      expect(result).toHaveLength(5);
    });

    it('should sort results by score in descending order', () => {
      const collaborativeRecs = [
        { recipe_id: 'recipe-1', score: 0.6, algorithm: 'collaborative' },
        { recipe_id: 'recipe-2', score: 0.9, algorithm: 'collaborative' }
      ];

      const result = (recommendationService as any).combineRecommendations(
        collaborativeRecs,
        [],
        5
      );

      expect(result[0].score).toBeGreaterThan(result[1].score);
      expect(result[0].recipe_id).toBe('recipe-2');
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockDb.select.mockRejectedValue(new Error('Database connection failed'));

      const result = await recommendationService.getRecommendations('user-123');

      expect(result).toEqual([]);
    });

    it('should handle Redis cache set errors gracefully', async () => {
      const mockRecommendations = [
        { recipe_id: 'recipe-1', score: 0.9, algorithm: 'hybrid' }
      ];

      mockRedis.get.mockResolvedValue(null);
      mockDb.select.mockResolvedValue([]);
      mockRedis.setex.mockRejectedValue(new Error('Redis write failed'));

      jest.spyOn(recommendationService as any, 'generateCollaborativeRecommendations')
        .mockResolvedValue([]);
      jest.spyOn(recommendationService as any, 'generateContentBasedRecommendations')
        .mockResolvedValue([]);
      jest.spyOn(recommendationService as any, 'combineRecommendations')
        .mockReturnValue(mockRecommendations);

      const result = await recommendationService.getRecommendations('user-123');

      expect(result).toEqual(mockRecommendations);
    });

    it('should handle invalid algorithm types', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockDb.select.mockResolvedValue([]);

      const result = await recommendationService.getRecommendations(
        'user-123',
        5,
        'invalid' as any
      );

      expect(result).toEqual([]);
    });
  });

  describe('Performance and edge cases', () => {
    it('should handle large datasets efficiently', async () => {
      const largeUserPreferences = Array.from({ length: 100 }, (_, i) => ({
        preference_key: `pref-${i}`,
        preference_value: `value-${i}`,
        weight: Math.random()
      }));

      mockRedis.get.mockResolvedValue(null);
      mockDb.select.mockResolvedValueOnce(largeUserPreferences);
      mockDb.select.mockResolvedValueOnce([]);

      jest.spyOn(recommendationService as any, 'generateContentBasedRecommendations')
        .mockResolvedValue([]);

      const result = await recommendationService.getRecommendations('user-123', 5, 'content');

      expect(result).toEqual([]);
      expect(mockDb.select).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent requests', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockDb.select.mockResolvedValue([]);

      jest.spyOn(recommendationService as any, 'generateCollaborativeRecommendations')
        .mockResolvedValue([]);

      const promises = Array.from({ length: 10 }, () =>
        recommendationService.getRecommendations('user-123')
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach(result => expect(result).toEqual([]));
    });
  });
});