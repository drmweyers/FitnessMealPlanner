/**
 * Query Optimization Utilities
 * 
 * This module provides utilities for optimizing database queries,
 * including caching, query batching, and performance monitoring.
 */

import { RecipeFilter } from "@shared/schema";

export interface QueryCache {
  key: string;
  data: any;
  expires: number;
}

export class QueryOptimizer {
  private cache = new Map<string, QueryCache>();
  private batchTimer: NodeJS.Timeout | null = null;
  private batchQueue: Array<{ resolve: Function; reject: Function; query: Function }> = [];
  
  // Cache TTL configurations
  private readonly CACHE_TTL = {
    recipes: 5 * 60 * 1000, // 5 minutes for recipe searches
    users: 10 * 60 * 1000,  // 10 minutes for user data
    mealPlans: 3 * 60 * 1000 // 3 minutes for meal plans
  };

  /**
   * Generate cache key for recipe search queries
   */
  generateRecipeSearchKey(filters: RecipeFilter): string {
    const keyParts = [
      'recipes',
      filters.approved ? 'approved' : 'all',
      filters.search || '',
      filters.mealType || '',
      filters.page || 1,
      filters.limit || 20
    ];
    return keyParts.join(':');
  }

  /**
   * Get cached result
   */
  getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Store result in cache
   */
  setCache<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, {
      key,
      data,
      expires: Date.now() + ttlMs
    });
  }

  /**
   * Cached recipe search with optimizations
   */
  async optimizeRecipeSearch<T>(
    key: string, 
    queryFn: () => Promise<T>, 
    cacheTtl: number = this.CACHE_TTL.recipes
  ): Promise<T> {
    // Check cache first
    const cached = this.getFromCache<T>(key);
    if (cached) {
      return cached;
    }

    // Execute query
    const result = await queryFn();
    
    // Cache result
    this.setCache(key, result, cacheTtl);
    
    return result;
  }

  /**
   * Batch query execution for reducing database round trips
   */
  async batchQuery<T>(queryFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.batchQueue.push({ resolve, reject, query: queryFn });
      
      if (this.batchTimer) {
        clearTimeout(this.batchTimer);
      }
      
      this.batchTimer = setTimeout(async () => {
        const batch = [...this.batchQueue];
        this.batchQueue.length = 0;
        this.batchTimer = null;
        
        // Execute all queries in parallel
        const promises = batch.map(async ({ query, resolve, reject }) => {
          try {
            const result = await query();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
        
        await Promise.all(promises);
      }, 10); // 10ms batch delay
    });
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): number {
    const now = Date.now();
    let cleared = 0;
    
    const entries = Array.from(this.cache.entries());
    for (const [key, cached] of entries) {
      if (now > cached.expires) {
        this.cache.delete(key);
        cleared++;
      }
    }
    
    return cleared;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton instance
export const queryOptimizer = new QueryOptimizer();

// Periodic cache cleanup
setInterval(() => {
  const cleared = queryOptimizer.clearExpiredCache();
  if (cleared > 0) {
    console.log(`[Cache] Cleared ${cleared} expired entries`);
  }
}, 60 * 1000); // Every minute