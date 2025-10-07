import { QueryClient } from '@tanstack/react-query';

/**
 * Centralized cache invalidation utilities for FitMeal Pro
 * Handles automatic cache refresh when recipes, stats, or meal plans change
 */

export class CacheManager {
  private queryClient: QueryClient;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  /**
   * Invalidate all recipe-related caches
   * Call this when recipes are created, updated, approved, or deleted
   */
  async invalidateRecipes(): Promise<void> {
    console.log('🔄 Invalidating recipe caches...');
    
    // Invalidate all recipe queries
    await this.queryClient.invalidateQueries({ queryKey: ['/api/admin/recipes'] });
    await this.queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
    await this.queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    
    // Force immediate refetch of critical data
    await this.queryClient.refetchQueries({ queryKey: ['adminStats'] });
    
    console.log('✅ Recipe caches invalidated');
  }

  /**
   * Invalidate stats cache specifically
   * Call this for operations that affect counts/statistics
   */
  async invalidateStats(): Promise<void> {
    console.log('🔄 Invalidating stats cache...');
    
    await this.queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    await this.queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    
    // Force immediate refetch for instant UI update
    await this.queryClient.refetchQueries({ queryKey: ['adminStats'] });
    
    console.log('✅ Stats cache invalidated');
  }

  /**
   * Invalidate meal plan related caches
   */
  async invalidateMealPlans(): Promise<void> {
    console.log('🔄 Invalidating meal plan caches...');
    
    await this.queryClient.invalidateQueries({ queryKey: ['/api/meal-plan'] });
    await this.queryClient.invalidateQueries({ queryKey: ['/api/admin/meal-plans'] });
    
    console.log('✅ Meal plan caches invalidated');
  }

  /**
   * Complete cache refresh - use for major operations
   * This is more aggressive and refreshes everything
   */
  async refreshAll(): Promise<void> {
    console.log('🔄 Complete cache refresh...');
    
    // Invalidate all recipe and stats data
    await this.invalidateRecipes();
    await this.invalidateStats();
    await this.invalidateMealPlans();
    
    // Additional aggressive refresh with delay for background operations
    setTimeout(async () => {
      await this.queryClient.refetchQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.includes('/api/admin') || key?.includes('/api/recipes');
        }
      });
    }, 2000);
    
    console.log('✅ Complete cache refresh completed');
  }

  /**
   * Smart invalidation after recipe generation
   * Handles the async nature of recipe generation
   */
  async handleRecipeGeneration(expectedCount: number): Promise<void> {
    console.log(`🔄 Handling recipe generation (${expectedCount} recipes)...`);
    
    // Immediate stats refresh
    await this.invalidateStats();
    
    // Progressive refresh strategy for generation
    const refreshIntervals = [5000, 10000, 20000, 30000]; // 5s, 10s, 20s, 30s
    
    refreshIntervals.forEach((delay, index) => {
      setTimeout(async () => {
        console.log(`🔄 Generation refresh ${index + 1}/${refreshIntervals.length}`);
        await this.invalidateRecipes();
        await this.invalidateStats();
      }, delay);
    });
    
    console.log('✅ Recipe generation cache handling initiated');
  }

  /**
   * Bulk operation cache invalidation
   * For approve-all, delete-all, etc.
   */
  async handleBulkOperation(operationType: 'approve' | 'delete' | 'update', count: number): Promise<void> {
    console.log(`🔄 Handling bulk ${operationType} operation (${count} items)...`);
    
    // Immediate refresh for bulk operations
    await this.refreshAll();
    
    // Additional refresh after delay to ensure consistency
    setTimeout(async () => {
      await this.invalidateRecipes();
      await this.invalidateStats();
    }, 3000);
    
    console.log(`✅ Bulk ${operationType} cache handling completed`);
  }

  /**
   * Real-time cache sync
   * Call this periodically to keep cache fresh
   */
  startPeriodicRefresh(intervalMs: number = 30000): () => void {
    console.log(`🔄 Starting periodic cache refresh (${intervalMs}ms interval)`);
    
    const interval = setInterval(async () => {
      console.log('🔄 Periodic cache refresh...');
      await this.invalidateStats();
    }, intervalMs);
    
    // Return cleanup function
    return () => {
      console.log('🛑 Stopping periodic cache refresh');
      clearInterval(interval);
    };
  }
}

/**
 * Create cache manager instance
 */
export const createCacheManager = (queryClient: QueryClient): CacheManager => {
  return new CacheManager(queryClient);
};

/**
 * Quick utility functions for common operations
 */
export const cacheUtils = {
  /**
   * Quick recipe cache invalidation
   */
  invalidateRecipes: (queryClient: QueryClient) => {
    const manager = createCacheManager(queryClient);
    return manager.invalidateRecipes();
  },

  /**
   * Quick stats cache invalidation
   */
  invalidateStats: (queryClient: QueryClient) => {
    const manager = createCacheManager(queryClient);
    return manager.invalidateStats();
  },

  /**
   * Quick complete refresh
   */
  refreshAll: (queryClient: QueryClient) => {
    const manager = createCacheManager(queryClient);
    return manager.refreshAll();
  }
};