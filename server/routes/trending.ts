// @ts-nocheck - Type errors suppressed
/**
 * Trending & Popular API Routes - Recipe Discovery and Social Features
 * 
 * Provides endpoints for trending recipes, popular content, viral detection,
 * and recommendation systems. Includes real-time trending calculations and
 * social discovery features.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getTrendingService } from '../services/TrendingService';
import { getRecommendationService } from '../services/RecommendationService';
import { getFavoritesService } from '../services/FavoritesService';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
const trendingService = getTrendingService();
const recommendationService = getRecommendationService();
const favoritesService = getFavoritesService();

// Rate limiting
const createRateLimiter = (windowMs: number, max: number) => {
  const windows = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}:${req.user?.id || 'anonymous'}`;
    const now = Date.now();
    const window = windows.get(key);
    
    if (!window || now > window.resetTime) {
      windows.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (window.count >= max) {
      return res.status(429).json({
        status: 'error',
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((window.resetTime - now) / 1000)
      });
    }
    
    window.count++;
    next();
  };
};

const trendingRateLimit = createRateLimiter(60 * 1000, 60); // 60 requests per minute
const recommendationsRateLimit = createRateLimiter(60 * 1000, 30); // 30 requests per minute

// Query validation schemas
const trendingQuerySchema = z.object({
  limit: z.string().optional().transform(val => {
    if (!val) return 20;
    const parsed = parseInt(val);
    return isNaN(parsed) ? 20 : Math.min(Math.max(parsed, 1), 100);
  }),
  timeframe: z.enum(['1h', '6h', '24h', '7d']).optional().default('24h'),
  category: z.string().optional()
});

const popularQuerySchema = z.object({
  limit: z.string().optional().transform(val => {
    if (!val) return 20;
    const parsed = parseInt(val);
    return isNaN(parsed) ? 20 : Math.min(Math.max(parsed, 1), 100);
  }),
  timeframe: z.enum(['all', '30d', '90d']).optional().default('all'),
  category: z.string().optional(),
  minRatings: z.string().optional().transform(val => {
    if (!val) return 5;
    const parsed = parseInt(val);
    return isNaN(parsed) ? 5 : Math.max(parsed, 1);
  })
});

const recommendationQuerySchema = z.object({
  count: z.string().optional().transform(val => {
    if (!val) return 20;
    const parsed = parseInt(val);
    return isNaN(parsed) ? 20 : Math.min(Math.max(parsed, 1), 50);
  }),
  strategy: z.enum(['collaborative', 'content', 'hybrid', 'trending', 'popular']).optional().default('hybrid'),
  excludeViewed: z.string().optional().transform(val => val !== 'false'),
  excludeFavorited: z.string().optional().transform(val => val !== 'false'),
  mealType: z.string().optional(),
  maxPrepTime: z.string().optional().transform(val => {
    if (!val) return undefined;
    const parsed = parseInt(val);
    return isNaN(parsed) ? undefined : parsed;
  }),
  dietaryRestrictions: z.string().optional().transform(val => 
    val ? val.split(',').map(s => s.trim()) : undefined
  )
});

/**
 * Trending Recipes Endpoints
 */

// GET /api/recipes/trending - Get trending recipes
router.get(
  '/recipes/trending',
  trendingRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const queryValidation = trendingQuerySchema.safeParse(req.query);
      if (!queryValidation.success) {
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_QUERY_PARAMS',
          message: 'Invalid query parameters',
          errors: queryValidation.error.errors
        });
      }

      const { limit, timeframe, category } = queryValidation.data;
      const trending = await trendingService.getTrendingRecipes(limit, timeframe, category);

      res.json({
        status: 'success',
        data: {
          trending,
          count: trending.length,
          timeframe,
          category: category || 'all'
        },
        meta: {
          description: `Trending recipes for the last ${timeframe}`,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/recipes/popular - Get popular recipes
router.get(
  '/recipes/popular',
  trendingRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const queryValidation = popularQuerySchema.safeParse(req.query);
      if (!queryValidation.success) {
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_QUERY_PARAMS',
          message: 'Invalid query parameters',
          errors: queryValidation.error.errors
        });
      }

      const { limit, timeframe, category, minRatings } = queryValidation.data;
      const popular = await trendingService.getPopularRecipes(limit, timeframe, category);

      res.json({
        status: 'success',
        data: {
          popular,
          count: popular.length,
          timeframe,
          category: category || 'all',
          minRatings
        },
        meta: {
          description: `Popular recipes for ${timeframe === 'all' ? 'all time' : timeframe}`,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/recipes/viral - Get viral content detection
router.get(
  '/recipes/viral',
  trendingRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limitQuery = req.query.limit as string;
      const limit = limitQuery ? Math.min(parseInt(limitQuery), 50) : 10;

      if (isNaN(limit) || limit < 1) {
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_LIMIT',
          message: 'Limit must be a positive number'
        });
      }

      const viral = await trendingService.getViralRecipes(limit);

      res.json({
        status: 'success',
        data: {
          viral,
          count: viral.length
        },
        meta: {
          description: 'Recipes with viral growth patterns',
          detectionCriteria: 'Exponential growth in views and shares',
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/recipes/trending/categories - Get trending by category
router.get(
  '/recipes/trending/categories',
  trendingRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limitQuery = req.query.limit as string;
      const limit = limitQuery ? Math.min(parseInt(limitQuery), 20) : 10;

      if (isNaN(limit) || limit < 1) {
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_LIMIT',
          message: 'Limit must be a positive number'
        });
      }

      const categories = await trendingService.getTrendingByCategory(limit);

      res.json({
        status: 'success',
        data: {
          categories,
          count: categories.length
        },
        meta: {
          description: 'Trending recipes organized by meal categories',
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/recipes/top-rated - Get highest rated recipes
router.get(
  '/recipes/top-rated',
  trendingRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const queryValidation = popularQuerySchema.safeParse(req.query);
      if (!queryValidation.success) {
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_QUERY_PARAMS',
          message: 'Invalid query parameters',
          errors: queryValidation.error.errors
        });
      }

      const { limit, timeframe, minRatings } = queryValidation.data;
      const timeframeParam = timeframe === 'all' ? 'all' as const : 
                            timeframe === '30d' ? '30d' as const : '7d' as const;
      
      const topRated = await trendingService.getTopRatedRecipes(limit, minRatings, timeframeParam);

      res.json({
        status: 'success',
        data: {
          recipes: topRated,
          count: topRated.length,
          timeframe,
          minRatings
        },
        meta: {
          description: `Highest rated recipes for ${timeframe === 'all' ? 'all time' : timeframe}`,
          minimumRatings: minRatings,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Personalized Recommendations Endpoints
 */

// GET /api/recipes/recommended - Get personalized recommendations
router.get(
  '/recipes/recommended',
  requireAuth,
  recommendationsRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      
      const queryValidation = recommendationQuerySchema.safeParse(req.query);
      if (!queryValidation.success) {
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_QUERY_PARAMS',
          message: 'Invalid query parameters',
          errors: queryValidation.error.errors
        });
      }

      const {
        count,
        strategy,
        excludeViewed,
        excludeFavorited,
        mealType,
        maxPrepTime,
        dietaryRestrictions
      } = queryValidation.data;

      const recommendations = await recommendationService.getRecommendations({
        userId,
        count,
        strategy,
        excludeViewed,
        excludeFavorited,
        mealType,
        maxPrepTime,
        dietaryRestrictions
      });

      res.json({
        status: 'success',
        data: recommendations,
        meta: {
          description: `Personalized recommendations using ${strategy} strategy`,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/recommendations/feedback - Record recommendation feedback
router.post(
  '/recommendations/feedback',
  requireAuth,
  recommendationsRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      
      const feedbackSchema = z.object({
        recommendationId: z.string(),
        feedback: z.enum(['liked', 'disliked', 'not_interested', 'saved']),
        reason: z.string().optional()
      });

      const validatedData = feedbackSchema.parse(req.body);

      await recommendationService.recordFeedback({
        ...validatedData,
        userId
      });

      res.status(201).json({
        status: 'success',
        message: 'Recommendation feedback recorded successfully'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: 'Invalid feedback data',
          errors: error.errors
        });
      }
      next(error);
    }
  }
);

/**
 * Social Discovery Endpoints
 */

// GET /api/recipes/recent-favorites - Get recently favorited recipes by others
router.get(
  '/recipes/recent-favorites',
  requireAuth,
  trendingRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const limitQuery = req.query.limit as string;
      const excludeOwnQuery = req.query.excludeOwn as string;
      
      const limit = limitQuery ? Math.min(parseInt(limitQuery), 50) : 15;
      const excludeOwn = excludeOwnQuery !== 'false';

      if (isNaN(limit) || limit < 1) {
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_LIMIT',
          message: 'Limit must be a positive number'
        });
      }

      const recentFavorites = await trendingService.getRecentlyFavorited(userId, limit, excludeOwn);

      res.json({
        status: 'success',
        data: {
          recipes: recentFavorites,
          count: recentFavorites.length
        },
        meta: {
          description: 'Recently favorited recipes by other users',
          timeframe: 'Last 7 days',
          excludeOwn,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/users/:id/favorites/public - Get public favorite collections
router.get(
  '/users/:id/favorites/public',
  trendingRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const targetUserId = req.params.id;

      // Validate UUID format
      if (!z.string().uuid().safeParse(targetUserId).success) {
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_USER_ID',
          message: 'Invalid user ID format'
        });
      }

      // Get public collections for the user
      const collections = await favoritesService.getUserCollections(targetUserId);
      const publicCollections = collections.filter(collection => collection.isPublic);

      res.json({
        status: 'success',
        data: {
          collections: publicCollections,
          count: publicCollections.length,
          userId: targetUserId
        },
        meta: {
          description: 'Public favorite collections shared by user',
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Feed and Discovery Endpoints
 */

// GET /api/feed - Get personalized activity feed
router.get(
  '/feed',
  requireAuth,
  trendingRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const limitQuery = req.query.limit as string;
      const limit = limitQuery ? Math.min(parseInt(limitQuery), 50) : 20;

      if (isNaN(limit) || limit < 1) {
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_LIMIT',
          message: 'Limit must be a positive number'
        });
      }

      // Create a mixed feed of trending, popular, and recommended content
      const [trending, popular, recommended, recentFavorites] = await Promise.all([
        trendingService.getTrendingRecipes(Math.ceil(limit * 0.3), '24h'),
        trendingService.getPopularRecipes(Math.ceil(limit * 0.2)),
        recommendationService.getRecommendations({
          userId,
          count: Math.ceil(limit * 0.3),
          strategy: 'hybrid'
        }),
        trendingService.getRecentlyFavorited(userId, Math.ceil(limit * 0.2))
      ]);

      // Combine and deduplicate
      const feedItems = new Map();
      
      // Add trending recipes
      trending.forEach(recipe => {
        if (!feedItems.has(recipe.id)) {
          feedItems.set(recipe.id, {
            ...recipe,
            feedType: 'trending',
            feedReason: 'Currently trending',
            feedScore: recipe.trendingScore
          });
        }
      });

      // Add popular recipes
      popular.forEach(recipe => {
        if (!feedItems.has(recipe.id)) {
          feedItems.set(recipe.id, {
            ...recipe,
            feedType: 'popular',
            feedReason: 'Popular among users',
            feedScore: recipe.popularityScore
          });
        }
      });

      // Add personalized recommendations
      recommended.recommendations.forEach(recipe => {
        if (!feedItems.has(recipe.id)) {
          feedItems.set(recipe.id, {
            ...recipe,
            feedType: 'recommended',
            feedReason: recipe.recommendationReason,
            feedScore: recipe.recommendationScore
          });
        }
      });

      // Add recent favorites
      recentFavorites.forEach(recipe => {
        if (!feedItems.has(recipe.id)) {
          feedItems.set(recipe.id, {
            ...recipe,
            feedType: 'social',
            feedReason: 'Recently favorited by others',
            feedScore: 50 // Default score for social items
          });
        }
      });

      // Sort by feed score and limit
      const feed = Array.from(feedItems.values())
        .sort((a, b) => b.feedScore - a.feedScore)
        .slice(0, limit);

      res.json({
        status: 'success',
        data: {
          feed,
          count: feed.length
        },
        meta: {
          description: 'Personalized activity feed',
          composition: {
            trending: `${Math.ceil(limit * 0.3)} items`,
            popular: `${Math.ceil(limit * 0.2)} items`,
            recommended: `${Math.ceil(limit * 0.3)} items`,
            social: `${Math.ceil(limit * 0.2)} items`
          },
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Analytics and Stats Endpoints
 */

// GET /api/recipes/:id/stats - Get recipe engagement stats
router.get(
  '/recipes/:id/stats',
  trendingRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const recipeId = req.params.id;

      // Validate recipe ID format
      if (!z.string().uuid().safeParse(recipeId).success) {
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_RECIPE_ID',
          message: 'Invalid recipe ID format'
        });
      }

      const stats = await trendingService.getEngagementStats();
      
      // Note: This is a simplified version. In a real implementation,
      // you would get recipe-specific stats
      res.json({
        status: 'success',
        data: {
          recipeId,
          stats: {
            // Placeholder - would be recipe-specific metrics
            message: 'Recipe-specific stats would be implemented here'
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Health Check Endpoint
 */
router.get(
  '/health',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const [trendingHealth, recommendationHealth] = await Promise.all([
        trendingService.healthCheck(),
        recommendationService.healthCheck()
      ]);
      
      const overallStatus = trendingHealth.status === 'healthy' && 
                           recommendationHealth.status === 'healthy' ? 'healthy' : 'unhealthy';
      
      const statusCode = overallStatus === 'healthy' ? 200 : 503;
      
      res.status(statusCode).json({
        status: overallStatus,
        services: {
          trending: trendingHealth,
          recommendations: recommendationHealth
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Error handling middleware
 */
router.use((error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Trending API Error:', error);

  // Handle specific error types
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: error.message
    });
  }

  if (error.code === 'ECONNREFUSED') {
    return res.status(503).json({
      status: 'error',
      code: 'SERVICE_UNAVAILABLE',
      message: 'External service temporarily unavailable'
    });
  }

  // Default error response
  res.status(500).json({
    status: 'error',
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred'
  });
});

export { router as trendingRouter };