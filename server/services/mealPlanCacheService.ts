/**
 * Meal Plan Cache Service
 * 
 * Specialized caching service for meal plans with user-specific caching,
 * trainer-customer relationships, and intelligent cache invalidation.
 * 
 * Features:
 * - User-specific meal plan caching
 * - Trainer-customer meal plan relationships
 * - Meal plan generation status tracking
 * - Assignment and approval workflow caching
 * - Nutritional summary caching
 * - PDF export caching
 * - Recent meal plans quick access
 * - Performance monitoring for meal plan operations
 */

import { CacheService, CacheOptions } from './cacheService';
import { EventEmitter } from 'events';

export interface MealPlan {
  id: string;
  title: string;
  description?: string;
  customerId: string;
  trainerId?: string;
  adminId?: string;
  weekStart: Date;
  weekEnd: Date;
  status: 'draft' | 'pending' | 'approved' | 'active' | 'completed' | 'cancelled';
  meals: DayMeals[];
  nutritionalSummary?: NutritionalSummary;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  assignedAt?: Date;
  approvedAt?: Date;
  completedAt?: Date;
}

export interface DayMeals {
  day: string; // 'monday', 'tuesday', etc.
  date: Date;
  meals: MealEntry[];
  dailyNutrition?: DailyNutrition;
}

export interface MealEntry {
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipeId: string;
  recipeName: string;
  servings: number;
  prepTime?: number;
  calories?: number;
  notes?: string;
}

export interface DailyNutrition {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber?: number;
  mealBreakdown: {
    [mealType: string]: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
  };
}

export interface NutritionalSummary {
  weeklyTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  dailyAverages: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  macroPercentages: {
    proteinPercent: number;
    carbsPercent: number;
    fatPercent: number;
  };
}

export interface MealPlanSearchOptions {
  userId?: string;
  trainerId?: string;
  customerId?: string;
  status?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'weekStart' | 'title' | 'status';
  sortOrder?: 'asc' | 'desc';
  includeCompleted?: boolean;
}

export interface MealPlanGenerationStatus {
  id: string;
  customerId: string;
  trainerId?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  totalSteps: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  generatedMealPlanId?: string;
  parameters: {
    weekStart: Date;
    nutritionalTargets?: NutritionalTargets;
    dietaryRestrictions?: string[];
    preferredMeals?: string[];
    avoidedIngredients?: string[];
  };
}

export interface NutritionalTargets {
  dailyCalories: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  fiberGrams?: number;
}

export class MealPlanCacheService extends EventEmitter {
  private cacheService: CacheService;
  private readonly MEAL_PLAN_TTL = 900; // 15 minutes
  private readonly USER_PLANS_TTL = 600; // 10 minutes
  private readonly RECENT_PLANS_TTL = 300; // 5 minutes
  private readonly GENERATION_TTL = 3600; // 1 hour
  private readonly PDF_CACHE_TTL = 1800; // 30 minutes
  private readonly SEARCH_TTL = 300; // 5 minutes

  constructor(cacheService: CacheService) {
    super();
    this.cacheService = cacheService;
  }

  // =======================
  // Meal Plan Data Caching
  // =======================

  /**
   * Cache a single meal plan
   */
  async cacheMealPlan(mealPlan: MealPlan): Promise<boolean> {
    const key = this.getMealPlanKey(mealPlan.id);
    const options: CacheOptions = {
      ttl: this.MEAL_PLAN_TTL,
      tags: this.getMealPlanTags(mealPlan),
      namespace: 'meal-plans',
    };

    const success = await this.cacheService.set(key, mealPlan, options);
    
    if (success) {
      this.emit('mealPlanCached', { 
        mealPlanId: mealPlan.id, 
        customerId: mealPlan.customerId,
        trainerId: mealPlan.trainerId 
      });
      
      // Update user's meal plan list
      await this.addToUserMealPlans(mealPlan.customerId, mealPlan.id);
      
      // Update trainer's assigned plans if applicable
      if (mealPlan.trainerId) {
        await this.addToTrainerMealPlans(mealPlan.trainerId, mealPlan.id);
      }
      
      // Update recent meal plans
      await this.addToRecentMealPlans(mealPlan);
    }

    return success;
  }

  /**
   * Get cached meal plan
   */
  async getCachedMealPlan(mealPlanId: string): Promise<MealPlan | null> {
    const key = this.getMealPlanKey(mealPlanId);
    const mealPlan = await this.cacheService.get<MealPlan>(key, {
      namespace: 'meal-plans',
      fallback: async () => {
        this.emit('mealPlanCacheMiss', { mealPlanId });
        return null;
      },
    });

    if (mealPlan) {
      this.emit('mealPlanCacheHit', { mealPlanId });
    }

    return mealPlan;
  }

  /**
   * Cache multiple meal plans
   */
  async cacheMealPlans(mealPlans: MealPlan[]): Promise<number> {
    const keyValuePairs: Array<[string, MealPlan]> = mealPlans.map(plan => [
      this.getMealPlanKey(plan.id),
      plan
    ]);

    const options: CacheOptions = {
      ttl: this.MEAL_PLAN_TTL,
      namespace: 'meal-plans',
      tags: ['meal-plans', 'bulk-meal-plans'],
    };

    const success = await this.cacheService.mset(keyValuePairs, options);
    
    if (success) {
      // Update user and trainer lists
      const userMealPlanMap = new Map<string, string[]>();
      const trainerMealPlanMap = new Map<string, string[]>();

      mealPlans.forEach(plan => {
        // Customer plans
        if (!userMealPlanMap.has(plan.customerId)) {
          userMealPlanMap.set(plan.customerId, []);
        }
        userMealPlanMap.get(plan.customerId)!.push(plan.id);

        // Trainer plans
        if (plan.trainerId) {
          if (!trainerMealPlanMap.has(plan.trainerId)) {
            trainerMealPlanMap.set(plan.trainerId, []);
          }
          trainerMealPlanMap.get(plan.trainerId)!.push(plan.id);
        }
      });

      // Update user meal plan caches
      for (const [userId, planIds] of userMealPlanMap.entries()) {
        await this.addToUserMealPlans(userId, ...planIds);
      }

      // Update trainer meal plan caches
      for (const [trainerId, planIds] of trainerMealPlanMap.entries()) {
        await this.addToTrainerMealPlans(trainerId, ...planIds);
      }

      this.emit('mealPlansBulkCached', { count: mealPlans.length });
      return mealPlans.length;
    }

    return 0;
  }

  /**
   * Invalidate meal plan cache
   */
  async invalidateMealPlan(mealPlanId: string, customerId?: string, trainerId?: string): Promise<boolean> {
    const key = this.getMealPlanKey(mealPlanId);
    const success = await this.cacheService.delete(key, 'meal-plans');

    if (success) {
      // Invalidate related caches
      await this.invalidateMealPlanSearches();
      
      if (customerId) {
        await this.invalidateUserMealPlans(customerId);
      }
      
      if (trainerId) {
        await this.invalidateTrainerMealPlans(trainerId);
      }

      // Invalidate meal plan tags
      await this.cacheService.invalidateByTag(`meal-plan:${mealPlanId}`);
      
      // Invalidate PDF cache for this meal plan
      await this.invalidatePDFCache(mealPlanId);
      
      this.emit('mealPlanInvalidated', { mealPlanId, customerId, trainerId });
    }

    return success;
  }

  // =======================
  // User-Specific Caching
  // =======================

  /**
   * Cache user's meal plan IDs
   */
  async cacheUserMealPlans(userId: string, mealPlanIds: string[]): Promise<boolean> {
    const key = this.getUserMealPlansKey(userId);
    const options: CacheOptions = {
      ttl: this.USER_PLANS_TTL,
      tags: [`user:${userId}`, 'user-meal-plans'],
      namespace: 'user-meal-plans',
    };

    const success = await this.cacheService.set(key, mealPlanIds, options);
    
    if (success) {
      this.emit('userMealPlansCached', { userId, count: mealPlanIds.length });
    }

    return success;
  }

  /**
   * Get user's cached meal plan IDs
   */
  async getCachedUserMealPlans(userId: string): Promise<string[] | null> {
    const key = this.getUserMealPlansKey(userId);
    return await this.cacheService.get<string[]>(key, {
      namespace: 'user-meal-plans',
    });
  }

  /**
   * Add meal plans to user's cached list
   */
  async addToUserMealPlans(userId: string, ...mealPlanIds: string[]): Promise<boolean> {
    const existingIds = await this.getCachedUserMealPlans(userId) || [];
    const newIds = [...new Set([...existingIds, ...mealPlanIds])];
    
    return await this.cacheUserMealPlans(userId, newIds);
  }

  /**
   * Remove meal plans from user's cached list
   */
  async removeFromUserMealPlans(userId: string, ...mealPlanIds: string[]): Promise<boolean> {
    const existingIds = await this.getCachedUserMealPlans(userId);
    
    if (!existingIds) return true;

    const filteredIds = existingIds.filter(id => !mealPlanIds.includes(id));
    
    return await this.cacheUserMealPlans(userId, filteredIds);
  }

  /**
   * Invalidate user's meal plan cache
   */
  async invalidateUserMealPlans(userId: string): Promise<boolean> {
    const key = this.getUserMealPlansKey(userId);
    const success = await this.cacheService.delete(key, 'user-meal-plans');
    
    if (success) {
      this.emit('userMealPlansInvalidated', { userId });
    }

    return success;
  }

  // =======================
  // Trainer-Specific Caching
  // =======================

  /**
   * Cache trainer's assigned meal plan IDs
   */
  async cacheTrainerMealPlans(trainerId: string, mealPlanIds: string[]): Promise<boolean> {
    const key = this.getTrainerMealPlansKey(trainerId);
    const options: CacheOptions = {
      ttl: this.USER_PLANS_TTL,
      tags: [`trainer:${trainerId}`, 'trainer-meal-plans'],
      namespace: 'trainer-meal-plans',
    };

    const success = await this.cacheService.set(key, mealPlanIds, options);
    
    if (success) {
      this.emit('trainerMealPlansCached', { trainerId, count: mealPlanIds.length });
    }

    return success;
  }

  /**
   * Get trainer's cached meal plan IDs
   */
  async getCachedTrainerMealPlans(trainerId: string): Promise<string[] | null> {
    const key = this.getTrainerMealPlansKey(trainerId);
    return await this.cacheService.get<string[]>(key, {
      namespace: 'trainer-meal-plans',
    });
  }

  /**
   * Add meal plans to trainer's cached list
   */
  async addToTrainerMealPlans(trainerId: string, ...mealPlanIds: string[]): Promise<boolean> {
    const existingIds = await this.getCachedTrainerMealPlans(trainerId) || [];
    const newIds = [...new Set([...existingIds, ...mealPlanIds])];
    
    return await this.cacheTrainerMealPlans(trainerId, newIds);
  }

  /**
   * Invalidate trainer's meal plan cache
   */
  async invalidateTrainerMealPlans(trainerId: string): Promise<boolean> {
    const key = this.getTrainerMealPlansKey(trainerId);
    const success = await this.cacheService.delete(key, 'trainer-meal-plans');
    
    if (success) {
      this.emit('trainerMealPlansInvalidated', { trainerId });
    }

    return success;
  }

  // =======================
  // Recent Meal Plans Cache
  // =======================

  /**
   * Cache recent meal plans for quick access
   */
  async cacheRecentMealPlans(mealPlans: MealPlan[]): Promise<boolean> {
    const key = 'recent-meal-plans';
    const options: CacheOptions = {
      ttl: this.RECENT_PLANS_TTL,
      tags: ['recent-meal-plans'],
      namespace: 'recent',
    };

    const success = await this.cacheService.set(key, mealPlans, options);
    
    if (success) {
      this.emit('recentMealPlansCached', { count: mealPlans.length });
    }

    return success;
  }

  /**
   * Get cached recent meal plans
   */
  async getCachedRecentMealPlans(): Promise<MealPlan[] | null> {
    const key = 'recent-meal-plans';
    return await this.cacheService.get<MealPlan[]>(key, {
      namespace: 'recent',
    });
  }

  /**
   * Add meal plan to recent list
   */
  async addToRecentMealPlans(mealPlan: MealPlan): Promise<boolean> {
    const existing = await this.getCachedRecentMealPlans() || [];
    
    // Remove if already exists, then add to beginning
    const filtered = existing.filter(plan => plan.id !== mealPlan.id);
    const updated = [mealPlan, ...filtered].slice(0, 10); // Keep last 10
    
    return await this.cacheRecentMealPlans(updated);
  }

  // =======================
  // Generation Status Caching
  // =======================

  /**
   * Cache meal plan generation status
   */
  async cacheGenerationStatus(status: MealPlanGenerationStatus): Promise<boolean> {
    const key = this.getGenerationStatusKey(status.id);
    const options: CacheOptions = {
      ttl: this.GENERATION_TTL,
      tags: ['meal-plan-generation', `generation:${status.id}`, `customer:${status.customerId}`],
      namespace: 'meal-plan-generation',
    };

    const success = await this.cacheService.set(key, status, options);
    
    if (success) {
      this.emit('generationStatusCached', { 
        generationId: status.id, 
        status: status.status,
        customerId: status.customerId 
      });
    }

    return success;
  }

  /**
   * Get cached generation status
   */
  async getCachedGenerationStatus(generationId: string): Promise<MealPlanGenerationStatus | null> {
    const key = this.getGenerationStatusKey(generationId);
    return await this.cacheService.get<MealPlanGenerationStatus>(key, {
      namespace: 'meal-plan-generation',
    });
  }

  /**
   * Update generation progress
   */
  async updateGenerationProgress(
    generationId: string,
    progress: Partial<MealPlanGenerationStatus>
  ): Promise<boolean> {
    const existing = await this.getCachedGenerationStatus(generationId);
    
    if (!existing) return false;

    const updated = { ...existing, ...progress };
    return await this.cacheGenerationStatus(updated);
  }

  // =======================
  // Search Result Caching
  // =======================

  /**
   * Cache meal plan search results
   */
  async cacheSearchResults(
    searchOptions: MealPlanSearchOptions,
    results: MealPlan[],
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
      namespace: 'meal-plan-searches',
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
    searchOptions: MealPlanSearchOptions
  ): Promise<{ results: MealPlan[]; totalCount: number } | null> {
    const key = this.getSearchKey(searchOptions);
    const cached = await this.cacheService.get(key, {
      namespace: 'meal-plan-searches',
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
  async invalidateMealPlanSearches(): Promise<number> {
    const count = await this.cacheService.invalidateByTag('meal-plan-searches');
    
    if (count > 0) {
      this.emit('searchResultsInvalidated', { count });
    }

    return count;
  }

  // =======================
  // PDF Export Caching
  // =======================

  /**
   * Cache PDF export data
   */
  async cachePDFExport(mealPlanId: string, pdfBuffer: Buffer, metadata: any): Promise<boolean> {
    const key = this.getPDFCacheKey(mealPlanId);
    const cacheData = {
      buffer: pdfBuffer,
      metadata,
      generatedAt: new Date(),
    };

    const options: CacheOptions = {
      ttl: this.PDF_CACHE_TTL,
      tags: [`meal-plan:${mealPlanId}`, 'pdf-exports'],
      namespace: 'pdf-exports',
    };

    const success = await this.cacheService.set(key, cacheData, options);
    
    if (success) {
      this.emit('pdfCached', { mealPlanId, size: pdfBuffer.length });
    }

    return success;
  }

  /**
   * Get cached PDF export
   */
  async getCachedPDFExport(mealPlanId: string): Promise<{ buffer: Buffer; metadata: any; generatedAt: Date } | null> {
    const key = this.getPDFCacheKey(mealPlanId);
    return await this.cacheService.get(key, {
      namespace: 'pdf-exports',
    });
  }

  /**
   * Invalidate PDF cache for a meal plan
   */
  async invalidatePDFCache(mealPlanId: string): Promise<boolean> {
    const key = this.getPDFCacheKey(mealPlanId);
    return await this.cacheService.delete(key, 'pdf-exports');
  }

  // =======================
  // Cache Key Generators
  // =======================

  private getMealPlanKey(mealPlanId: string): string {
    return `meal-plan:${mealPlanId}`;
  }

  private getUserMealPlansKey(userId: string): string {
    return `user:${userId}:meal-plans`;
  }

  private getTrainerMealPlansKey(trainerId: string): string {
    return `trainer:${trainerId}:meal-plans`;
  }

  private getGenerationStatusKey(generationId: string): string {
    return `generation:${generationId}`;
  }

  private getPDFCacheKey(mealPlanId: string): string {
    return `pdf:${mealPlanId}`;
  }

  private getSearchKey(options: MealPlanSearchOptions): string {
    const keyParts = [
      options.userId || 'any',
      options.trainerId || 'any',
      options.customerId || 'any',
      (options.status || []).sort().join(',') || 'anystatus',
      options.dateRange ? `${options.dateRange.start.getTime()}-${options.dateRange.end.getTime()}` : 'anydate',
      options.limit || 'nolimit',
      options.offset || '0',
      options.sortBy || 'createdAt',
      options.sortOrder || 'desc',
      options.includeCompleted ? 'includeCompleted' : 'excludeCompleted',
    ];
    
    return `search:${keyParts.join(':')}`;
  }

  // =======================
  // Cache Tags
  // =======================

  private getMealPlanTags(mealPlan: MealPlan): string[] {
    const tags = ['meal-plans', `meal-plan:${mealPlan.id}`, `customer:${mealPlan.customerId}`];
    
    if (mealPlan.trainerId) tags.push(`trainer:${mealPlan.trainerId}`);
    if (mealPlan.adminId) tags.push(`admin:${mealPlan.adminId}`);
    if (mealPlan.status) tags.push(`status:${mealPlan.status}`);
    
    return tags;
  }

  private getSearchTags(options: MealPlanSearchOptions): string[] {
    const tags = ['meal-plan-searches'];
    
    if (options.userId) tags.push(`user:${options.userId}`);
    if (options.trainerId) tags.push(`trainer:${options.trainerId}`);
    if (options.customerId) tags.push(`customer:${options.customerId}`);
    if (options.status) {
      options.status.forEach(status => tags.push(`status:${status}`));
    }
    
    return tags;
  }

  // =======================
  // Statistics and Monitoring
  // =======================

  /**
   * Get cache statistics for meal plans
   */
  async getCacheStats() {
    const cacheSize = await this.cacheService.getCacheSize();
    const stats = this.cacheService.getStats();
    
    return {
      general: stats,
      size: cacheSize,
      namespaces: {
        mealPlans: await this.getNamespaceStats('meal-plans'),
        userPlans: await this.getNamespaceStats('user-meal-plans'),
        trainerPlans: await this.getNamespaceStats('trainer-meal-plans'),
        searches: await this.getNamespaceStats('meal-plan-searches'),
        generation: await this.getNamespaceStats('meal-plan-generation'),
        pdfExports: await this.getNamespaceStats('pdf-exports'),
        recent: await this.getNamespaceStats('recent'),
      },
    };
  }

  private async getNamespaceStats(namespace: string) {
    return { namespace };
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
    cleaned += await this.cacheService.invalidateByTag('meal-plan-generation');
    
    // Clean up old search results
    cleaned += await this.cacheService.invalidateByTag('meal-plan-searches');
    
    // Clean up old PDF exports
    cleaned += await this.cacheService.invalidateByTag('pdf-exports');
    
    this.emit('cacheCleanedUp', { entriesRemoved: cleaned });
    
    return cleaned;
  }

  /**
   * Invalidate all meal plan-related caches
   */
  async invalidateAll(): Promise<number> {
    let invalidated = 0;

    invalidated += await this.cacheService.invalidateByTag('meal-plans');
    invalidated += await this.cacheService.invalidateByTag('user-meal-plans');
    invalidated += await this.cacheService.invalidateByTag('trainer-meal-plans');
    invalidated += await this.cacheService.invalidateByTag('meal-plan-searches');
    invalidated += await this.cacheService.invalidateByTag('meal-plan-generation');
    invalidated += await this.cacheService.invalidateByTag('pdf-exports');
    invalidated += await this.cacheService.invalidateByTag('recent-meal-plans');

    this.emit('allCachesInvalidated', { count: invalidated });

    return invalidated;
  }
}