/**
 * FavoritesService
 * 
 * Comprehensive service for managing recipe favorites with caching,
 * collection support, and optimized performance.
 */

import { db } from '../db.js';
import { RedisService } from './RedisService.js';
import { eq, and, count, desc, sql } from 'drizzle-orm';
import {
  recipeFavorites,
  favoriteCollections,
  collectionRecipes,
  recipes,
  users,
  type RecipeFavorite,
  type FavoriteCollection,
  type Recipe,
  type CreateFavorite,
  type CreateCollection,
  type AddRecipeToCollection,
} from '../../shared/schema.js';

interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface PaginatedFavorites {
  favorites: Array<RecipeFavorite & { recipe: Recipe }>;
  total: number;
  hasMore: boolean;
}

interface CollectionWithRecipes {
  collection: FavoriteCollection;
  recipes: Recipe[];
}

interface PaginationOptions {
  page?: number;
  limit?: number;
}

export class FavoritesService {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly MAX_COLLECTIONS_PER_USER = 50;
  private readonly RATE_LIMIT_WINDOW = 60; // 1 minute
  private readonly RATE_LIMIT_MAX_ACTIONS = 100;

  constructor() {}

  /**
   * Add a recipe to user's favorites
   */
  async addToFavorites(
    userId: string,
    favoriteData: CreateFavorite
  ): Promise<ServiceResult<RecipeFavorite>> {
    try {
      // Check rate limit
      if (!(await this.checkRateLimit(userId))) {
        return {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
        };
      }

      // Verify user exists
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (user.length === 0) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      // Verify recipe exists
      const recipe = await db.select()
        .from(recipes)
        .where(eq(recipes.id, favoriteData.recipeId))
        .limit(1);
      
      if (recipe.length === 0) {
        return {
          success: false,
          error: 'Recipe not found',
        };
      }

      // Check if already favorited
      const existing = await db.select()
        .from(recipeFavorites)
        .where(and(
          eq(recipeFavorites.userId, userId),
          eq(recipeFavorites.recipeId, favoriteData.recipeId)
        ))
        .limit(1);

      if (existing.length > 0) {
        return {
          success: false,
          error: 'Recipe already favorited',
        };
      }

      // Add to favorites
      const [favorite] = await db.insert(recipeFavorites).values({
        userId,
        recipeId: favoriteData.recipeId,
        notes: favoriteData.notes,
      }).returning();

      // Invalidate cache
      await this.invalidateUserFavoritesCache(userId);

      return {
        success: true,
        data: favorite,
      };
    } catch (error) {
      console.error('Error adding to favorites:', error);
      return {
        success: false,
        error: 'Database error occurred while adding favorite',
      };
    }
  }

  /**
   * Remove a recipe from user's favorites
   */
  async removeFromFavorites(userId: string, recipeId: string): Promise<ServiceResult<void>> {
    try {
      const deleted = await db.delete(recipeFavorites)
        .where(and(
          eq(recipeFavorites.userId, userId),
          eq(recipeFavorites.recipeId, recipeId)
        ))
        .returning();

      if (deleted.length === 0) {
        return {
          success: false,
          error: 'Favorite not found',
        };
      }

      // Invalidate cache
      await this.invalidateUserFavoritesCache(userId);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error removing from favorites:', error);
      return {
        success: false,
        error: 'Database error occurred while removing favorite',
      };
    }
  }

  /**
   * Batch add multiple recipes to favorites
   */
  async batchAddToFavorites(
    userId: string,
    favorites: CreateFavorite[]
  ): Promise<ServiceResult<RecipeFavorite[]>> {
    try {
      const results: RecipeFavorite[] = [];
      const errors: string[] = [];

      for (const favorite of favorites) {
        const result = await this.addToFavorites(userId, favorite);
        if (result.success && result.data) {
          results.push(result.data);
        } else {
          errors.push(result.error || 'Unknown error');
        }
      }

      if (errors.length > 0 && results.length === 0) {
        return {
          success: false,
          error: `All operations failed: ${errors.join(', ')}`,
        };
      }

      if (errors.length > 0) {
        return {
          success: false,
          error: `Partial failure: ${errors.length} operations failed`,
          data: results,
        };
      }

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      console.error('Error in batch add to favorites:', error);
      return {
        success: false,
        error: 'Database error occurred during batch operation',
      };
    }
  }

  /**
   * Get user's favorites with pagination
   */
  async getUserFavorites(
    userId: string,
    options: PaginationOptions = {}
  ): Promise<ServiceResult<PaginatedFavorites>> {
    try {
      const { page = 1, limit = 12 } = options;
      const offset = (page - 1) * limit;

      // Try cache first
      const cached = await this.getCachedFavorites(userId, page, limit);
      if (cached) {
        return {
          success: true,
          data: cached,
        };
      }

      // Get favorites with recipe details
      const favorites = await db.select({
        id: recipeFavorites.id,
        userId: recipeFavorites.userId,
        recipeId: recipeFavorites.recipeId,
        notes: recipeFavorites.notes,
        favoritedAt: recipeFavorites.favoritedAt,
        recipe: {
          id: recipes.id,
          name: recipes.name,
          description: recipes.description,
          caloriesKcal: recipes.caloriesKcal,
          prepTimeMinutes: recipes.prepTimeMinutes,
          cookTimeMinutes: recipes.cookTimeMinutes,
          servings: recipes.servings,
          mealTypes: recipes.mealTypes,
          dietaryTags: recipes.dietaryTags,
          imageUrl: recipes.imageUrl,
        },
      })
      .from(recipeFavorites)
      .innerJoin(recipes, eq(recipeFavorites.recipeId, recipes.id))
      .where(eq(recipeFavorites.userId, userId))
      .orderBy(desc(recipeFavorites.favoritedAt))
      .limit(limit)
      .offset(offset);

      // Get total count
      const [totalResult] = await db.select({ count: count() })
        .from(recipeFavorites)
        .where(eq(recipeFavorites.userId, userId));

      const total = totalResult.count;
      const hasMore = offset + favorites.length < total;

      const result = {
        favorites: favorites.map(f => ({
          ...f,
          recipe: f.recipe as Recipe,
        })),
        total,
        hasMore,
      };

      // Cache the result
      await this.setCachedFavorites(userId, result, page, limit);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('Error getting user favorites:', error);
      return {
        success: false,
        error: 'Database error occurred while fetching favorites',
      };
    }
  }

  /**
   * Check if a recipe is favorited by user
   */
  async isFavorited(userId: string, recipeId: string): Promise<boolean> {
    try {
      const cacheKey = `favorite:${userId}:${recipeId}`;
      
      // Check cache first
      const cached = await RedisService.get(cacheKey);
      if (cached !== null) {
        return cached === 'true';
      }

      const favorite = await db.select()
        .from(recipeFavorites)
        .where(and(
          eq(recipeFavorites.userId, userId),
          eq(recipeFavorites.recipeId, recipeId)
        ))
        .limit(1);

      const isFavorited = favorite.length > 0;

      // Cache the result
      await RedisService.set(cacheKey, isFavorited ? 'true' : 'false', this.CACHE_TTL);

      return isFavorited;
    } catch (error) {
      console.error('Error checking if favorited:', error);
      return false;
    }
  }

  /**
   * Create a new favorite collection
   */
  async createCollection(
    userId: string,
    collectionData: CreateCollection
  ): Promise<ServiceResult<FavoriteCollection>> {
    try {
      // Check collection limit
      const [existingCount] = await db.select({ count: count() })
        .from(favoriteCollections)
        .where(eq(favoriteCollections.userId, userId));

      if (existingCount.count >= this.MAX_COLLECTIONS_PER_USER) {
        return {
          success: false,
          error: `Maximum collection limit (${this.MAX_COLLECTIONS_PER_USER}) reached`,
        };
      }

      const [collection] = await db.insert(favoriteCollections).values({
        userId,
        name: collectionData.name,
        description: collectionData.description,
        isPublic: collectionData.isPublic || false,
        color: collectionData.color || '#3B82F6',
      }).returning();

      // Invalidate collections cache
      await this.invalidateUserCollectionsCache(userId);

      return {
        success: true,
        data: collection,
      };
    } catch (error) {
      console.error('Error creating collection:', error);
      return {
        success: false,
        error: 'Database error occurred while creating collection',
      };
    }
  }

  /**
   * Add recipe to collection
   */
  async addRecipeToCollection(
    userId: string,
    collectionId: string,
    recipeData: AddRecipeToCollection
  ): Promise<ServiceResult<void>> {
    try {
      // Verify collection ownership
      const collection = await db.select()
        .from(favoriteCollections)
        .where(and(
          eq(favoriteCollections.id, collectionId),
          eq(favoriteCollections.userId, userId)
        ))
        .limit(1);

      if (collection.length === 0) {
        return {
          success: false,
          error: 'Collection not found or no permission to modify',
        };
      }

      // Check if recipe is favorited
      const isFavorited = await this.isFavorited(userId, recipeData.recipeId);
      if (!isFavorited) {
        return {
          success: false,
          error: 'Recipe must be favorited before adding to collection',
        };
      }

      // Add to collection
      await db.insert(collectionRecipes).values({
        collectionId,
        recipeId: recipeData.recipeId,
        notes: recipeData.notes,
      });

      // Invalidate cache
      await this.invalidateCollectionCache(collectionId);

      return {
        success: true,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('duplicate')) {
        return {
          success: false,
          error: 'Recipe already in collection',
        };
      }

      console.error('Error adding recipe to collection:', error);
      return {
        success: false,
        error: 'Database error occurred while adding recipe to collection',
      };
    }
  }

  /**
   * Remove recipe from collection
   */
  async removeRecipeFromCollection(
    userId: string,
    collectionId: string,
    recipeId: string
  ): Promise<ServiceResult<void>> {
    try {
      // Verify collection ownership
      const collection = await db.select()
        .from(favoriteCollections)
        .where(and(
          eq(favoriteCollections.id, collectionId),
          eq(favoriteCollections.userId, userId)
        ))
        .limit(1);

      if (collection.length === 0) {
        return {
          success: false,
          error: 'Collection not found or no permission to modify',
        };
      }

      await db.delete(collectionRecipes)
        .where(and(
          eq(collectionRecipes.collectionId, collectionId),
          eq(collectionRecipes.recipeId, recipeId)
        ));

      // Invalidate cache
      await this.invalidateCollectionCache(collectionId);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error removing recipe from collection:', error);
      return {
        success: false,
        error: 'Database error occurred while removing recipe from collection',
      };
    }
  }

  /**
   * Get collection with recipes
   */
  async getCollectionWithRecipes(
    userId: string,
    collectionId: string
  ): Promise<ServiceResult<CollectionWithRecipes>> {
    try {
      // Get collection
      const [collection] = await db.select()
        .from(favoriteCollections)
        .where(and(
          eq(favoriteCollections.id, collectionId),
          eq(favoriteCollections.userId, userId)
        ));

      if (!collection) {
        return {
          success: false,
          error: 'Collection not found',
        };
      }

      // Get recipes in collection
      const recipeResults = await db.select({
        recipe: {
          id: recipes.id,
          name: recipes.name,
          description: recipes.description,
          caloriesKcal: recipes.caloriesKcal,
          prepTimeMinutes: recipes.prepTimeMinutes,
          cookTimeMinutes: recipes.cookTimeMinutes,
          servings: recipes.servings,
          mealTypes: recipes.mealTypes,
          dietaryTags: recipes.dietaryTags,
          imageUrl: recipes.imageUrl,
        },
      })
      .from(collectionRecipes)
      .innerJoin(recipes, eq(collectionRecipes.recipeId, recipes.id))
      .where(eq(collectionRecipes.collectionId, collectionId))
      .orderBy(desc(collectionRecipes.addedAt));

      return {
        success: true,
        data: {
          collection,
          recipes: recipeResults.map(r => r.recipe as Recipe),
        },
      };
    } catch (error) {
      console.error('Error getting collection with recipes:', error);
      return {
        success: false,
        error: 'Database error occurred while fetching collection',
      };
    }
  }

  /**
   * Batch get user favorites for multiple users
   */
  async batchGetUserFavorites(userIds: string[]): Promise<Record<string, PaginatedFavorites>> {
    const results: Record<string, PaginatedFavorites> = {};

    await Promise.all(
      userIds.map(async (userId) => {
        const result = await this.getUserFavorites(userId);
        if (result.success && result.data) {
          results[userId] = result.data;
        }
      })
    );

    return results;
  }

  // Private helper methods

  private async checkRateLimit(userId: string): Promise<boolean> {
    try {
      const key = `rate_limit:favorites:${userId}`;
      const current = await RedisService.get(key);
      
      if (current === null) {
        await RedisService.set(key, '1', this.RATE_LIMIT_WINDOW);
        return true;
      }

      const count = parseInt(current, 10);
      if (count >= this.RATE_LIMIT_MAX_ACTIONS) {
        return false;
      }

      await RedisService.set(key, (count + 1).toString(), this.RATE_LIMIT_WINDOW);
      return true;
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return true; // Allow on cache error
    }
  }

  private async getCachedFavorites(
    userId: string,
    page: number,
    limit: number
  ): Promise<PaginatedFavorites | null> {
    try {
      const cacheKey = `favorites:${userId}:page:${page}:limit:${limit}`;
      const cached = await RedisService.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      console.error('Error getting cached favorites:', error);
      return null;
    }
  }

  private async setCachedFavorites(
    userId: string,
    data: PaginatedFavorites,
    page: number = 1,
    limit: number = 12
  ): Promise<void> {
    try {
      const cacheKey = `favorites:${userId}:page:${page}:limit:${limit}`;
      await RedisService.set(cacheKey, JSON.stringify(data), this.CACHE_TTL);
    } catch (error) {
      console.error('Error setting cached favorites:', error);
    }
  }

  private async invalidateUserFavoritesCache(userId: string): Promise<void> {
    try {
      await RedisService.invalidatePattern(`favorites:${userId}:*`);
      await RedisService.invalidatePattern(`favorite:${userId}:*`);
    } catch (error) {
      console.error('Error invalidating favorites cache:', error);
    }
  }

  private async invalidateUserCollectionsCache(userId: string): Promise<void> {
    try {
      await RedisService.invalidatePattern(`collections:${userId}:*`);
    } catch (error) {
      console.error('Error invalidating collections cache:', error);
    }
  }

  private async invalidateCollectionCache(collectionId: string): Promise<void> {
    try {
      await RedisService.invalidatePattern(`collection:${collectionId}:*`);
    } catch (error) {
      console.error('Error invalidating collection cache:', error);
    }
  }
}