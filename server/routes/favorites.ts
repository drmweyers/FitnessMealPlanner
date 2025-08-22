/**
 * Favorites API Routes - Recipe Favoriting System
 * 
 * Provides complete CRUD operations for recipe favorites and collections.
 * Includes batch operations, rate limiting, and comprehensive error handling.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getFavoritesService } from '../services/FavoritesService';
import { requireAuth } from '../middleware/auth';
import {
  createFavoriteSchema,
  createCollectionSchema,
  updateCollectionSchema,
  addRecipeToCollectionSchema,
  type CreateFavorite,
  type CreateCollection,
  type UpdateCollection,
  type AddRecipeToCollection
} from '../../shared/schema';

const router = Router();
const favoritesService = getFavoritesService();

// Rate limiting helper
const createRateLimiter = (windowMs: number, max: number) => {
  const windows = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}:${req.user?.id}`;
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

// Apply rate limiting to modification endpoints
const favoritesRateLimit = createRateLimiter(60 * 1000, 30); // 30 requests per minute
const collectionsRateLimit = createRateLimiter(60 * 1000, 10); // 10 requests per minute

// Validation middleware
const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
};

// Query validation schemas
const paginationSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? Math.min(parseInt(val) || 12, 50) : 12)
});

const batchFavoritesSchema = z.object({
  recipeIds: z.array(z.string().uuid()).min(1).max(20),
  action: z.enum(['add', 'remove'])
});

/**
 * Core Favorites Endpoints
 */

// POST /api/favorites - Add recipe to favorites
router.post(
  '/',
  requireAuth,
  favoritesRateLimit,
  validateRequest(createFavoriteSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { recipeId, notes }: CreateFavorite = req.body;

      const result = await favoritesService.addFavorite(userId, recipeId, notes);

      if (!result.success) {
        return res.status(400).json({
          status: 'error',
          code: 'FAVORITE_ERROR',
          message: result.message
        });
      }

      res.status(201).json({
        status: 'success',
        data: {
          favorite: result.favorite
        },
        message: 'Recipe added to favorites'
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/favorites/:recipeId - Remove recipe from favorites
router.delete(
  '/:recipeId',
  requireAuth,
  favoritesRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { recipeId } = req.params;

      // Validate UUID format
      if (!z.string().uuid().safeParse(recipeId).success) {
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_RECIPE_ID',
          message: 'Invalid recipe ID format'
        });
      }

      const result = await favoritesService.removeFavorite(userId, recipeId);

      if (!result.success) {
        return res.status(404).json({
          status: 'error',
          code: 'FAVORITE_NOT_FOUND',
          message: result.message
        });
      }

      res.json({
        status: 'success',
        message: 'Recipe removed from favorites'
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/favorites - Get user's favorite recipes with pagination
router.get(
  '/',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      
      // Validate and parse query parameters
      const queryValidation = paginationSchema.safeParse(req.query);
      if (!queryValidation.success) {
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_QUERY_PARAMS',
          message: 'Invalid pagination parameters'
        });
      }

      const { page, limit } = queryValidation.data;
      const result = await favoritesService.getUserFavorites(userId, page, limit);

      res.json({
        status: 'success',
        data: {
          favorites: result.favorites,
          pagination: {
            page,
            limit,
            total: result.total,
            hasMore: result.hasMore,
            totalPages: Math.ceil(result.total / limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/favorites/batch - Batch add/remove favorites
router.post(
  '/batch',
  requireAuth,
  favoritesRateLimit,
  validateRequest(batchFavoritesSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const request = req.body;

      const result = await favoritesService.batchFavorites(userId, request);

      const statusCode = result.success ? 200 : 207; // 207 Multi-Status for partial success

      res.status(statusCode).json({
        status: result.success ? 'success' : 'partial_success',
        data: {
          processedCount: result.processedCount,
          failedRecipes: result.failedRecipes,
          totalRequested: request.recipeIds.length
        },
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/favorites/check/:recipeId - Check if recipe is favorited
router.get(
  '/check/:recipeId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { recipeId } = req.params;

      // Validate UUID format
      if (!z.string().uuid().safeParse(recipeId).success) {
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_RECIPE_ID',
          message: 'Invalid recipe ID format'
        });
      }

      const isFavorited = await favoritesService.isFavorited(userId, recipeId);

      res.json({
        status: 'success',
        data: {
          isFavorited,
          recipeId
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Collections Endpoints
 */

// POST /api/favorites/collections - Create a new collection
router.post(
  '/collections',
  requireAuth,
  collectionsRateLimit,
  validateRequest(createCollectionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const collectionData: CreateCollection = req.body;

      const collection = await favoritesService.createCollection(userId, collectionData);

      res.status(201).json({
        status: 'success',
        data: {
          collection
        },
        message: 'Collection created successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/favorites/collections - Get user's collections
router.get(
  '/collections',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const collections = await favoritesService.getUserCollections(userId);

      res.json({
        status: 'success',
        data: {
          collections
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/favorites/collections/:collectionId - Update collection
router.put(
  '/collections/:collectionId',
  requireAuth,
  collectionsRateLimit,
  validateRequest(updateCollectionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { collectionId } = req.params;
      const updates: UpdateCollection = req.body;

      // Validate UUID format
      if (!z.string().uuid().safeParse(collectionId).success) {
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_COLLECTION_ID',
          message: 'Invalid collection ID format'
        });
      }

      const collection = await favoritesService.updateCollection(userId, collectionId, updates);

      if (!collection) {
        return res.status(404).json({
          status: 'error',
          code: 'COLLECTION_NOT_FOUND',
          message: 'Collection not found or access denied'
        });
      }

      res.json({
        status: 'success',
        data: {
          collection
        },
        message: 'Collection updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/favorites/collections/:collectionId - Delete collection
router.delete(
  '/collections/:collectionId',
  requireAuth,
  collectionsRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { collectionId } = req.params;

      // Validate UUID format
      if (!z.string().uuid().safeParse(collectionId).success) {
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_COLLECTION_ID',
          message: 'Invalid collection ID format'
        });
      }

      const deleted = await favoritesService.deleteCollection(userId, collectionId);

      if (!deleted) {
        return res.status(404).json({
          status: 'error',
          code: 'COLLECTION_NOT_FOUND',
          message: 'Collection not found or access denied'
        });
      }

      res.json({
        status: 'success',
        message: 'Collection deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/favorites/collections/:collectionId - Get collection details
router.get(
  '/collections/:collectionId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { collectionId } = req.params;

      // Validate UUID format
      if (!z.string().uuid().safeParse(collectionId).success) {
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_COLLECTION_ID',
          message: 'Invalid collection ID format'
        });
      }

      // Parse pagination
      const queryValidation = paginationSchema.safeParse(req.query);
      if (!queryValidation.success) {
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_QUERY_PARAMS',
          message: 'Invalid pagination parameters'
        });
      }

      const { page, limit } = queryValidation.data;
      const collection = await favoritesService.getCollectionDetails(userId, collectionId, page, limit);

      if (!collection) {
        return res.status(404).json({
          status: 'error',
          code: 'COLLECTION_NOT_FOUND',
          message: 'Collection not found or access denied'
        });
      }

      res.json({
        status: 'success',
        data: {
          collection,
          pagination: {
            page,
            limit,
            total: collection.recipeCount,
            hasMore: page * limit < collection.recipeCount,
            totalPages: Math.ceil(collection.recipeCount / limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/favorites/collections/:collectionId/recipes - Add recipe to collection
router.post(
  '/collections/:collectionId/recipes',
  requireAuth,
  favoritesRateLimit,
  validateRequest(addRecipeToCollectionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { collectionId } = req.params;
      const { recipeId, notes }: AddRecipeToCollection = req.body;

      // Validate UUID format
      if (!z.string().uuid().safeParse(collectionId).success) {
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_COLLECTION_ID',
          message: 'Invalid collection ID format'
        });
      }

      const success = await favoritesService.addRecipeToCollection(userId, collectionId, recipeId, notes);

      if (!success) {
        return res.status(400).json({
          status: 'error',
          code: 'ADD_TO_COLLECTION_FAILED',
          message: 'Failed to add recipe to collection. Recipe may already be in collection or collection not found.'
        });
      }

      res.status(201).json({
        status: 'success',
        message: 'Recipe added to collection successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/favorites/collections/:collectionId/recipes/:recipeId - Remove recipe from collection
router.delete(
  '/collections/:collectionId/recipes/:recipeId',
  requireAuth,
  favoritesRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { collectionId, recipeId } = req.params;

      // Validate UUID formats
      if (!z.string().uuid().safeParse(collectionId).success || 
          !z.string().uuid().safeParse(recipeId).success) {
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_ID_FORMAT',
          message: 'Invalid collection or recipe ID format'
        });
      }

      const success = await favoritesService.removeRecipeFromCollection(userId, collectionId, recipeId);

      if (!success) {
        return res.status(404).json({
          status: 'error',
          code: 'REMOVE_FROM_COLLECTION_FAILED',
          message: 'Failed to remove recipe from collection. Recipe may not be in collection or collection not found.'
        });
      }

      res.json({
        status: 'success',
        message: 'Recipe removed from collection successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Popular Favorites Endpoint
 */

// GET /api/favorites/popular - Get most favorited recipes
router.get(
  '/popular',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limitQuery = req.query.limit as string;
      const limit = limitQuery ? Math.min(parseInt(limitQuery), 50) : 20;

      if (isNaN(limit) || limit < 1) {
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_LIMIT',
          message: 'Limit must be a positive number'
        });
      }

      const popularRecipes = await favoritesService.getPopularFavorites(limit);

      res.json({
        status: 'success',
        data: {
          recipes: popularRecipes,
          count: popularRecipes.length
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
      const health = await favoritesService.healthCheck();
      
      const statusCode = health.status === 'healthy' ? 200 : 503;
      
      res.status(statusCode).json({
        status: health.status,
        service: 'FavoritesService',
        message: health.message,
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
  console.error('Favorites API Error:', error);

  // Handle specific error types
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: error.message
    });
  }

  if (error.code === '23505') { // PostgreSQL unique violation
    return res.status(409).json({
      status: 'error',
      code: 'DUPLICATE_FAVORITE',
      message: 'Recipe is already in favorites or collection'
    });
  }

  if (error.code === '23503') { // PostgreSQL foreign key violation
    return res.status(400).json({
      status: 'error',
      code: 'INVALID_REFERENCE',
      message: 'Referenced recipe or user does not exist'
    });
  }

  // Default error response
  res.status(500).json({
    status: 'error',
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred'
  });
});

export { router as favoritesRouter };