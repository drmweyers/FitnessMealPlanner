/**
 * Recipe Cache Service
 * 
 * Specialized caching service for recipes with intelligent invalidation,
 * search result caching, and user-specific recipe data management.
 * 
 * Features:
 * - Recipe data caching with automatic invalidation
 * - Search result caching with filters
 * - User-specific recipe assignments and preferences
 * - Bulk recipe operations caching
 * - Recipe generation status caching
 * - Nutritional information caching
 * - Recipe image and metadata caching
 * - Performance monitoring for recipe operations
 */

import { CacheService, CacheOptions } from './cacheService';
import { EventEmitter } from 'events';

export interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  nutritionalInfo?: NutritionalInfo;
  category?: string;
  tags?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  calories?: number;
  imageUrl?: string;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
  status?: 'draft' | 'pending' | 'approved' | 'rejected';
}

export interface NutritionalInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

export interface RecipeSearchOptions {
  query?: string;
  category?: string;
  tags?: string[];
  difficulty?: string;
  maxPrepTime?: number;
  maxCalories?: number;
  userId?: string;
  status?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'title' | 'calories' | 'prepTime' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface RecipeGenerationStatus {
  id: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  progress: number;
  totalRecipes: number;
  completedRecipes: number;
  failedRecipes: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  generatedRecipeIds: string[];
}

export class RecipeCacheService extends EventEmitter {
  private cacheService: CacheService;
  private readonly RECIPE_TTL = 1800; // 30 minutes
  private readonly SEARCH_TTL = 600; // 10 minutes
  private readonly GENERATION_TTL = 3600; // 1 hour
  private readonly USER_RECIPES_TTL = 900; // 15 minutes

  constructor(cacheService: CacheService) {
    super();
    this.cacheService = cacheService;
  }

  // =======================
  // Recipe Data Caching
  // =======================

  /**
   * Cache a single recipe
   */
  async cacheRecipe(recipe: Recipe): Promise<boolean> {
    const key = this.getRecipeKey(recipe.id);
    const options: CacheOptions = {
      ttl: this.RECIPE_TTL,
      tags: this.getRecipeTags(recipe),
      namespace: 'recipes',
    };

    const success = await this.cacheService.set(key, recipe, options);
    
    if (success) {
      this.emit('recipeCached', { recipeId: recipe.id, userId: recipe.userId });
      
      // Also cache by user if applicable
      if (recipe.userId) {
        await this.addToUserRecipes(recipe.userId, recipe.id);
      }
    }

    return success;
  }

  /**
   * Get cached recipe
   */
  async getCachedRecipe(recipeId: string): Promise<Recipe | null> {
    const key = this.getRecipeKey(recipeId);
    const recipe = await this.cacheService.get<Recipe>(key, {
      namespace: 'recipes',
      fallback: async () => {
        // This would typically fetch from database
        // For now, we'll emit an event to let the controller handle it
        this.emit('recipeCacheMiss', { recipeId });
        return null;
      },
    });

    if (recipe) {
      this.emit('recipeCacheHit', { recipeId });
    }

    return recipe;
  }

  /**
   * Cache multiple recipes
   */
  async cacheRecipes(recipes: Recipe[]): Promise<number> {
    const keyValuePairs: Array<[string, Recipe]> = recipes.map(recipe => [
      this.getRecipeKey(recipe.id),
      recipe
    ]);

    const options: CacheOptions = {
      ttl: this.RECIPE_TTL,
      namespace: 'recipes',
      tags: ['recipes', 'bulk-recipes'],
    };

    const success = await this.cacheService.mset(keyValuePairs, options);
    
    if (success) {
      // Update user recipe lists
      const userRecipeMap = new Map<string, string[]>();
      recipes.forEach(recipe => {
        if (recipe.userId) {
          if (!userRecipeMap.has(recipe.userId)) {
            userRecipeMap.set(recipe.userId, []);
          }
          userRecipeMap.get(recipe.userId)!.push(recipe.id);
        }
      });

      for (const [userId, recipeIds] of userRecipeMap.entries()) {
        await this.addToUserRecipes(userId, ...recipeIds);
      }

      this.emit('recipesBulkCached', { count: recipes.length });
      return recipes.length;
    }

    return 0;
  }

  /**
   * Invalidate recipe cache
   */
  async invalidateRecipe(recipeId: string, userId?: string): Promise<boolean> {
    const key = this.getRecipeKey(recipeId);
    const success = await this.cacheService.delete(key, 'recipes');

    if (success) {
      // Invalidate related caches
      await this.invalidateRecipeSearches();
      
      if (userId) {
        await this.invalidateUserRecipes(userId);
      }

      // Invalidate recipe tags
      await this.cacheService.invalidateByTag(`recipe:${recipeId}`);
      
      this.emit('recipeInvalidated', { recipeId, userId });
    }

    return success;
  }

  /**
   * Invalidate multiple recipes
   */
  async invalidateRecipes(recipeIds: string[], userId?: string): Promise<number> {
    let invalidated = 0;

    for (const recipeId of recipeIds) {
      const success = await this.invalidateRecipe(recipeId, userId);
      if (success) invalidated++;
    }

    return invalidated;
  }

  // =======================
  // Search Result Caching
  // =======================

  /**
   * Cache search results
   */
  async cacheSearchResults(
    searchOptions: RecipeSearchOptions,
    results: Recipe[],
    totalCount: number
  ): Promise<boolean> {
    const key = this.getSearchKey(searchOptions);
    const searchResult = {
      results,
      totalCount,
      searchOptions,
      cachedAt: new Date(),
    };

    const options: CacheOptions = {
      ttl: this.SEARCH_TTL,
      tags: this.getSearchTags(searchOptions),
      namespace: 'recipe-searches',
    };

    const success = await this.cacheService.set(key, searchResult, options);
    
    if (success) {
      this.emit('searchResultsCached', { 
        searchOptions, 
        resultCount: results.length,
        totalCount 
      });
    }

    return success;
  }

  /**
   * Get cached search results
   */
  async getCachedSearchResults(
    searchOptions: RecipeSearchOptions
  ): Promise<{ results: Recipe[]; totalCount: number } | null> {
    const key = this.getSearchKey(searchOptions);
    const cached = await this.cacheService.get(key, {
      namespace: 'recipe-searches',
    });

    if (cached) {
      this.emit('searchCacheHit', { searchOptions });
      return {
        results: cached.results,
        totalCount: cached.totalCount,
      };
    }

    this.emit('searchCacheMiss', { searchOptions });
    return null;
  }

  /**
   * Invalidate all search results
   */
  async invalidateRecipeSearches(): Promise<number> {
    const count = await this.cacheService.invalidateByTag('recipe-searches');
    
    if (count > 0) {
      this.emit('searchResultsInvalidated', { count });
    }

    return count;
  }

  // =======================
  // User Recipe Management
  // =======================

  /**
   * Cache user's recipes
   */
  async cacheUserRecipes(userId: string, recipeIds: string[]): Promise<boolean> {
    const key = this.getUserRecipesKey(userId);
    const options: CacheOptions = {
      ttl: this.USER_RECIPES_TTL,
      tags: [`user:${userId}`, 'user-recipes'],
      namespace: 'user-recipes',
    };

    const success = await this.cacheService.set(key, recipeIds, options);
    
    if (success) {
      this.emit('userRecipesCached', { userId, count: recipeIds.length });
    }

    return success;
  }

  /**
   * Get user's cached recipe IDs
   */
  async getCachedUserRecipes(userId: string): Promise<string[] | null> {
    const key = this.getUserRecipesKey(userId);
    return await this.cacheService.get<string[]>(key, {
      namespace: 'user-recipes',
    });
  }

  /**
   * Add recipes to user's cached list
   */
  async addToUserRecipes(userId: string, ...recipeIds: string[]): Promise<boolean> {
    const existingIds = await this.getCachedUserRecipes(userId) || [];
    const newIds = [...new Set([...existingIds, ...recipeIds])];
    
    return await this.cacheUserRecipes(userId, newIds);
  }

  /**
   * Remove recipes from user's cached list
   */
  async removeFromUserRecipes(userId: string, ...recipeIds: string[]): Promise<boolean> {
    const existingIds = await this.getCachedUserRecipes(userId);
    
    if (!existingIds) return true;

    const filteredIds = existingIds.filter(id => !recipeIds.includes(id));
    
    return await this.cacheUserRecipes(userId, filteredIds);
  }

  /**
   * Invalidate user's recipe cache
   */
  async invalidateUserRecipes(userId: string): Promise<boolean> {
    const key = this.getUserRecipesKey(userId);
    const success = await this.cacheService.delete(key, 'user-recipes');
    
    if (success) {
      this.emit('userRecipesInvalidated', { userId });
    }

    return success;
  }

  // =======================
  // Recipe Generation Caching
  // =======================

  /**
   * Cache recipe generation status
   */
  async cacheGenerationStatus(status: RecipeGenerationStatus): Promise<boolean> {
    const key = this.getGenerationStatusKey(status.id);
    const options: CacheOptions = {
      ttl: this.GENERATION_TTL,
      tags: ['recipe-generation', `generation:${status.id}`],
      namespace: 'recipe-generation',
    };

    const success = await this.cacheService.set(key, status, options);
    
    if (success) {
      this.emit('generationStatusCached', { 
        generationId: status.id, 
        status: status.status 
      });
    }

    return success;
  }

  /**
   * Get cached generation status
   */
  async getCachedGenerationStatus(generationId: string): Promise<RecipeGenerationStatus | null> {
    const key = this.getGenerationStatusKey(generationId);
    return await this.cacheService.get<RecipeGenerationStatus>(key, {
      namespace: 'recipe-generation',
    });
  }

  /**
   * Update generation progress
   */
  async updateGenerationProgress(
    generationId: string,
    progress: Partial<RecipeGenerationStatus>
  ): Promise<boolean> {
    const existing = await this.getCachedGenerationStatus(generationId);
    
    if (!existing) return false;

    const updated = { ...existing, ...progress };
    return await this.cacheGenerationStatus(updated);
  }

  /**
   * Invalidate generation status
   */
  async invalidateGenerationStatus(generationId: string): Promise<boolean> {
    const key = this.getGenerationStatusKey(generationId);
    return await this.cacheService.delete(key, 'recipe-generation');
  }

  // =======================
  // Nutritional Information Caching
  // =======================

  /**
   * Cache nutritional analysis
   */
  async cacheNutritionalAnalysis(
    ingredients: string[],
    nutritionalInfo: NutritionalInfo
  ): Promise<boolean> {
    const key = this.getNutritionalAnalysisKey(ingredients);
    const options: CacheOptions = {
      ttl: 3600 * 24, // 24 hours - nutritional data is fairly static
      tags: ['nutritional-analysis'],
      namespace: 'nutrition',
    };

    return await this.cacheService.set(key, nutritionalInfo, options);
  }

  /**
   * Get cached nutritional analysis
   */
  async getCachedNutritionalAnalysis(ingredients: string[]): Promise<NutritionalInfo | null> {
    const key = this.getNutritionalAnalysisKey(ingredients);
    return await this.cacheService.get<NutritionalInfo>(key, {
      namespace: 'nutrition',
    });
  }

  // =======================
  // Cache Statistics and Monitoring
  // =======================

  /**
   * Get cache statistics for recipes
   */
  async getCacheStats() {
    const cacheSize = await this.cacheService.getCacheSize();
    const stats = this.cacheService.getStats();
    
    return {
      general: stats,
      size: cacheSize,
      namespaces: {
        recipes: await this.getNamespaceStats('recipes'),
        searches: await this.getNamespaceStats('recipe-searches'),
        userRecipes: await this.getNamespaceStats('user-recipes'),
        generation: await this.getNamespaceStats('recipe-generation'),
        nutrition: await this.getNamespaceStats('nutrition'),
      },
    };
  }

  /**
   * Get statistics for a specific namespace
   */
  private async getNamespaceStats(namespace: string) {
    // This would require additional implementation in CacheService
    // For now, return basic info
    return {
      namespace,
      // Could include: key count, memory usage, hit rate, etc.
    };
  }

  /**
   * Warm up recipe cache with popular recipes
   */
  async warmupPopularRecipes(recipes: Recipe[]): Promise<number> {
    const entries = recipes.map(recipe => ({
      key: this.getRecipeKey(recipe.id),
      value: recipe,
      options: {
        ttl: this.RECIPE_TTL * 2, // Longer TTL for popular recipes
        tags: [...this.getRecipeTags(recipe), 'popular'],
        namespace: 'recipes',
      },
    }));

    const successful = await this.cacheService.warmup(entries);
    
    if (successful > 0) {
      this.emit('popularRecipesWarmedUp', { count: successful });
    }

    return successful;
  }

  // =======================
  // Cache Key Generators
  // =======================

  private getRecipeKey(recipeId: string): string {
    return `recipe:${recipeId}`;
  }

  private getUserRecipesKey(userId: string): string {
    return `user:${userId}:recipes`;
  }

  private getSearchKey(options: RecipeSearchOptions): string {
    // Create a consistent key from search options
    const keyParts = [
      options.query || 'all',
      options.category || 'any',
      (options.tags || []).sort().join(',') || 'notags',
      options.difficulty || 'any',
      options.maxPrepTime || 'nomax',
      options.maxCalories || 'nomax',
      options.userId || 'any',
      options.status || 'any',
      options.limit || 'nolimit',
      options.offset || '0',
      options.sortBy || 'title',
      options.sortOrder || 'asc',
    ];
    
    return `search:${keyParts.join(':')}`;
  }

  private getGenerationStatusKey(generationId: string): string {
    return `generation:${generationId}`;
  }

  private getNutritionalAnalysisKey(ingredients: string[]): string {
    // Create consistent key from sorted ingredients
    const sortedIngredients = [...ingredients].sort().join('|');
    const hash = require('crypto').createHash('md5').update(sortedIngredients).digest('hex');
    return `nutrition:${hash}`;
  }

  // =======================
  // Cache Tags
  // =======================

  private getRecipeTags(recipe: Recipe): string[] {
    const tags = ['recipes', `recipe:${recipe.id}`];
    
    if (recipe.userId) tags.push(`user:${recipe.userId}`);
    if (recipe.category) tags.push(`category:${recipe.category}`);
    if (recipe.status) tags.push(`status:${recipe.status}`);
    if (recipe.tags) {
      recipe.tags.forEach(tag => tags.push(`tag:${tag}`));
    }
    
    return tags;
  }

  private getSearchTags(options: RecipeSearchOptions): string[] {
    const tags = ['recipe-searches'];
    
    if (options.userId) tags.push(`user:${options.userId}`);
    if (options.category) tags.push(`category:${options.category}`);
    if (options.status) tags.push(`status:${options.status}`);
    
    return tags;
  }

  // =======================
  // Cleanup and Maintenance
  // =======================

  /**
   * Clean up expired and orphaned cache entries
   */
  async cleanup(): Promise<number> {
    let cleaned = 0;

    // Clean up expired generation statuses
    cleaned += await this.cacheService.invalidateByTag('recipe-generation');
    
    // Clean up old search results
    cleaned += await this.cacheService.invalidateByTag('recipe-searches');
    
    this.emit('cacheCleanedUp', { entriesRemoved: cleaned });
    
    return cleaned;
  }

  /**
   * Invalidate all recipe-related caches
   */
  async invalidateAll(): Promise<number> {
    let invalidated = 0;

    invalidated += await this.cacheService.invalidateByTag('recipes');
    invalidated += await this.cacheService.invalidateByTag('recipe-searches');
    invalidated += await this.cacheService.invalidateByTag('user-recipes');
    invalidated += await this.cacheService.invalidateByTag('recipe-generation');
    invalidated += await this.cacheService.invalidateByTag('nutritional-analysis');

    this.emit('allCachesInvalidated', { count: invalidated });

    return invalidated;
  }
}