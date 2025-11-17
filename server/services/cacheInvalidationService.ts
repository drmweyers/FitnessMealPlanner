/**
 * Cache Invalidation Service
 * 
 * Comprehensive cache invalidation system with decorators, automatic invalidation,
 * and intelligent cache management for the FitnessMealPlanner application.
 * 
 * Features:
 * - Decorator-based cache invalidation
 * - Automatic invalidation on CRUD operations
 * - Tag-based invalidation for related data
 * - Scheduled invalidation for stale data
 * - Dependency tracking for complex invalidation
 * - Performance monitoring and analytics
 * - Rollback support for failed operations
 */

import { CacheService } from './cacheService';
import { RecipeCacheService } from './recipeCacheService';
import { MealPlanCacheService } from './mealPlanCacheService';
import { EventEmitter } from 'events';

export interface InvalidationRule {
  id: string;
  name: string;
  trigger: InvalidationTrigger;
  action: InvalidationAction;
  condition?: (context: InvalidationContext) => boolean;
  delay?: number; // Delay in milliseconds before invalidation
  priority: number;
  enabled: boolean;
}

export interface InvalidationTrigger {
  type: 'crud' | 'time' | 'event' | 'manual';
  pattern?: string; // For path-based triggers
  operation?: 'create' | 'update' | 'delete' | 'read';
  schedule?: string; // Cron expression for time-based triggers
  event?: string; // Event name for event-based triggers
}

export interface InvalidationAction {
  type: 'keys' | 'patterns' | 'tags' | 'custom';
  keys?: string[];
  patterns?: string[];
  tags?: string[];
  customHandler?: (context: InvalidationContext) => Promise<void>;
}

export interface InvalidationContext {
  trigger: string;
  data?: any;
  userId?: string;
  entityId?: string;
  entityType?: string;
  operation?: string;
  timestamp: number;
  metadata?: any;
}

export interface InvalidationStrategy {
  immediate: boolean; // Invalidate immediately
  batched: boolean; // Batch invalidations
  batchSize?: number;
  batchInterval?: number; // milliseconds
  retryOnFailure: boolean;
  maxRetries?: number;
}

// Decorator types
export interface CacheInvalidationOptions {
  tags?: string[];
  patterns?: string[];
  keys?: string[];
  delay?: number;
  condition?: (result: any, args: any[]) => boolean;
  dependencies?: string[]; // Other methods that should also invalidate
}

export class CacheInvalidationService extends EventEmitter {
  private cacheService: CacheService;
  private recipeCacheService: RecipeCacheService;
  private mealPlanCacheService: MealPlanCacheService;
  private rules: Map<string, InvalidationRule> = new Map();
  private pendingInvalidations: Map<string, InvalidationContext[]> = new Map();
  private dependencies: Map<string, Set<string>> = new Map(); // Method dependencies
  private invalidationHistory: InvalidationContext[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private strategy: InvalidationStrategy;

  constructor(
    cacheService: CacheService,
    recipeCacheService: RecipeCacheService,
    mealPlanCacheService: MealPlanCacheService
  ) {
    super();
    this.cacheService = cacheService;
    this.recipeCacheService = recipeCacheService;
    this.mealPlanCacheService = mealPlanCacheService;
    
    this.strategy = {
      immediate: false,
      batched: true,
      batchSize: 10,
      batchInterval: 1000, // 1 second
      retryOnFailure: true,
      maxRetries: 3,
    };

    this.initializeDefaultRules();
    this.startBatchProcessor();
  }

  // =======================
  // Rule Management
  // =======================

  /**
   * Initialize default invalidation rules
   */
  private initializeDefaultRules(): void {
    // Recipe CRUD operations
    this.addRule({
      id: 'recipe-crud',
      name: 'Recipe CRUD Invalidation',
      trigger: {
        type: 'crud',
        pattern: '/api/recipes/*',
      },
      action: {
        type: 'tags',
        tags: ['recipes', 'recipe-searches'],
      },
      priority: 10,
      enabled: true,
    });

    // Meal plan CRUD operations
    this.addRule({
      id: 'meal-plan-crud',
      name: 'Meal Plan CRUD Invalidation',
      trigger: {
        type: 'crud',
        pattern: '/api/meal-plan/*',
      },
      action: {
        type: 'tags',
        tags: ['meal-plans', 'user-meal-plans', 'trainer-meal-plans'],
      },
      priority: 10,
      enabled: true,
    });

    // User profile updates
    this.addRule({
      id: 'user-profile-update',
      name: 'User Profile Update Invalidation',
      trigger: {
        type: 'crud',
        pattern: '/api/profile/*',
        operation: 'update',
      },
      action: {
        type: 'custom',
        customHandler: this.handleUserProfileInvalidation.bind(this),
      },
      priority: 9,
      enabled: true,
    });

    // Scheduled cleanup of old caches
    this.addRule({
      id: 'scheduled-cleanup',
      name: 'Scheduled Cache Cleanup',
      trigger: {
        type: 'time',
        schedule: '0 */6 * * *', // Every 6 hours
      },
      action: {
        type: 'custom',
        customHandler: this.handleScheduledCleanup.bind(this),
      },
      priority: 1,
      enabled: true,
    });

    // Recipe generation completion
    this.addRule({
      id: 'recipe-generation-complete',
      name: 'Recipe Generation Completion',
      trigger: {
        type: 'event',
        event: 'recipeGenerationCompleted',
      },
      action: {
        type: 'tags',
        tags: ['recipes', 'recipe-searches', 'user-recipes'],
      },
      priority: 8,
      enabled: true,
    });

    // Meal plan assignment
    this.addRule({
      id: 'meal-plan-assignment',
      name: 'Meal Plan Assignment',
      trigger: {
        type: 'event',
        event: 'mealPlanAssigned',
      },
      action: {
        type: 'custom',
        customHandler: this.handleMealPlanAssignment.bind(this),
      },
      priority: 8,
      enabled: true,
    });
  }

  /**
   * Add invalidation rule
   */
  addRule(rule: InvalidationRule): void {
    this.rules.set(rule.id, rule);
    this.emit('ruleAdded', rule);
  }

  /**
   * Remove invalidation rule
   */
  removeRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId);
    if (removed) {
      this.emit('ruleRemoved', { ruleId });
    }
    return removed;
  }

  /**
   * Update invalidation rule
   */
  updateRule(ruleId: string, updates: Partial<InvalidationRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    const updated = { ...rule, ...updates };
    this.rules.set(ruleId, updated);
    this.emit('ruleUpdated', { ruleId, updates });
    return true;
  }

  // =======================
  // Decorator Factory
  // =======================

  /**
   * Cache invalidation decorator
   */
  static InvalidateCache(options: CacheInvalidationOptions) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;
      const service = CacheInvalidationService.getInstance();

      descriptor.value = async function (...args: any[]) {
        let result;
        let error: unknown;

        try {
          result = await originalMethod.apply(this, args);
        } catch (err) {
          error = err;
          throw err;
        } finally {
          // Invalidate cache after method execution (success or failure)
          if (service && (!options.condition || options.condition(result, args))) {
            const context: InvalidationContext = {
              trigger: `method:${target.constructor.name}.${propertyKey}`,
              data: result,
              timestamp: Date.now(),
              metadata: { args, error: error instanceof Error ? error.message : String(error) },
            };

            if (options.delay && options.delay > 0) {
              setTimeout(() => {
                service.invalidateByContext(context, options);
              }, options.delay);
            } else {
              service.invalidateByContext(context, options);
            }

            // Handle dependencies
            if (options.dependencies) {
              for (const dep of options.dependencies) {
                service.addDependency(propertyKey, dep);
              }
            }
          }
        }

        return result;
      };

      return descriptor;
    };
  }

  /**
   * Get singleton instance (for decorator usage)
   */
  private static instance: CacheInvalidationService | null = null;

  static setInstance(service: CacheInvalidationService): void {
    CacheInvalidationService.instance = service;
  }

  static getInstance(): CacheInvalidationService | null {
    return CacheInvalidationService.instance;
  }

  // =======================
  // Invalidation Logic
  // =======================

  /**
   * Trigger invalidation based on context
   */
  async invalidateByContext(context: InvalidationContext, options?: CacheInvalidationOptions): Promise<void> {
    if (options) {
      // Direct invalidation from decorator
      await this.executeInvalidation(context, {
        type: 'custom',
        customHandler: async (ctx) => {
          if (options.tags) {
            for (const tag of options.tags) {
              await this.cacheService.invalidateByTag(tag);
            }
          }
          
          if (options.patterns) {
            for (const pattern of options.patterns) {
              await this.cacheService.invalidateByPattern(pattern);
            }
          }
          
          if (options.keys) {
            for (const key of options.keys) {
              await this.cacheService.delete(key);
            }
          }
        },
      });
    } else {
      // Rule-based invalidation
      await this.processInvalidationRules(context);
    }
  }

  /**
   * Process invalidation rules for a context
   */
  private async processInvalidationRules(context: InvalidationContext): Promise<void> {
    const applicableRules = Array.from(this.rules.values())
      .filter(rule => rule.enabled && this.ruleMatches(rule, context))
      .sort((a, b) => b.priority - a.priority);

    for (const rule of applicableRules) {
      if (!rule.condition || rule.condition(context)) {
        if (this.strategy.immediate && !rule.delay) {
          await this.executeInvalidation(context, rule.action);
        } else {
          this.scheduleInvalidation(rule.id, context, rule.action, rule.delay);
        }
      }
    }
  }

  /**
   * Check if rule matches context
   */
  private ruleMatches(rule: InvalidationRule, context: InvalidationContext): boolean {
    const { trigger } = rule;
    
    switch (trigger.type) {
      case 'crud':
        return context.trigger.startsWith('crud:') && 
               (!trigger.pattern || context.trigger.includes(trigger.pattern)) &&
               (!trigger.operation || context.operation === trigger.operation);
      
      case 'event':
        return context.trigger.startsWith('event:') &&
               (!trigger.event || context.trigger.includes(trigger.event));
      
      case 'time':
        return context.trigger.startsWith('schedule:');
      
      case 'manual':
        return context.trigger.startsWith('manual:');
      
      default:
        return false;
    }
  }

  /**
   * Execute invalidation action
   */
  private async executeInvalidation(context: InvalidationContext, action: InvalidationAction): Promise<void> {
    try {
      switch (action.type) {
        case 'keys':
          if (action.keys) {
            for (const key of action.keys) {
              await this.cacheService.delete(key);
            }
          }
          break;

        case 'patterns':
          if (action.patterns) {
            for (const pattern of action.patterns) {
              await this.cacheService.invalidateByPattern(pattern);
            }
          }
          break;

        case 'tags':
          if (action.tags) {
            for (const tag of action.tags) {
              await this.cacheService.invalidateByTag(tag);
            }
          }
          break;

        case 'custom':
          if (action.customHandler) {
            await action.customHandler(context);
          }
          break;
      }

      this.emit('invalidationExecuted', { context, action });
      this.addToHistory(context);
      
    } catch (error) {
      console.error('[CacheInvalidationService] Invalidation failed:', error);
      this.emit('invalidationError', { context, action, error });
      
      if (this.strategy.retryOnFailure) {
        this.scheduleRetry(context, action);
      }
    }
  }

  /**
   * Schedule invalidation for later execution
   */
  private scheduleInvalidation(
    ruleId: string, 
    context: InvalidationContext, 
    action: InvalidationAction, 
    delay: number = 0
  ): void {
    if (!this.pendingInvalidations.has(ruleId)) {
      this.pendingInvalidations.set(ruleId, []);
    }
    
    this.pendingInvalidations.get(ruleId)!.push(context);
    
    if (delay > 0) {
      setTimeout(() => {
        this.executeInvalidation(context, action);
      }, delay);
    } else if (this.strategy.batched) {
      // Will be processed by batch processor
    } else {
      // Execute immediately
      this.executeInvalidation(context, action);
    }
  }

  /**
   * Schedule retry for failed invalidation
   */
  private scheduleRetry(context: InvalidationContext, action: InvalidationAction, attempt: number = 1): void {
    if (attempt > (this.strategy.maxRetries || 3)) {
      console.error('[CacheInvalidationService] Max retries exceeded for invalidation');
      return;
    }

    const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
    setTimeout(() => {
      this.executeInvalidation({ ...context, metadata: { ...context.metadata, retryAttempt: attempt } }, action);
    }, delay);
  }

  // =======================
  // Batch Processing
  // =======================

  /**
   * Start batch processor for pending invalidations
   */
  private startBatchProcessor(): void {
    if (!this.strategy.batched) return;

    this.batchTimer = setInterval(() => {
      this.processBatch();
    }, this.strategy.batchInterval || 1000);
  }

  /**
   * Process batch of pending invalidations
   */
  private async processBatch(): Promise<void> {
    const batchSize = this.strategy.batchSize || 10;
    let processed = 0;

    for (const [ruleId, contexts] of this.pendingInvalidations.entries()) {
      if (processed >= batchSize) break;
      
      const rule = this.rules.get(ruleId);
      if (!rule || contexts.length === 0) continue;

      const context = contexts.shift()!;
      await this.executeInvalidation(context, rule.action);
      processed++;

      if (contexts.length === 0) {
        this.pendingInvalidations.delete(ruleId);
      }
    }
  }

  // =======================
  // Custom Invalidation Handlers
  // =======================

  /**
   * Handle user profile invalidation
   */
  private async handleUserProfileInvalidation(context: InvalidationContext): Promise<void> {
    if (!context.userId) return;

    // Invalidate user-specific caches
    await this.recipeCacheService.invalidateUserRecipes(context.userId);
    await this.mealPlanCacheService.invalidateUserMealPlans(context.userId);
    
    // Invalidate session-related caches
    await this.cacheService.invalidateByTag(`user:${context.userId}`);
    
    this.emit('userProfileInvalidated', { userId: context.userId });
  }

  /**
   * Handle scheduled cleanup
   */
  private async handleScheduledCleanup(context: InvalidationContext): Promise<void> {
    // Clean up recipe caches
    await this.recipeCacheService.cleanup();
    
    // Clean up meal plan caches
    await this.mealPlanCacheService.cleanup();
    
    // Clean up general cache
    await this.cacheService.invalidateByTag('expired');
    
    this.emit('scheduledCleanupCompleted', { timestamp: context.timestamp });
  }

  /**
   * Handle meal plan assignment
   */
  private async handleMealPlanAssignment(context: InvalidationContext): Promise<void> {
    const { customerId, trainerId, mealPlanId } = context.data || {};
    
    if (customerId) {
      await this.mealPlanCacheService.invalidateUserMealPlans(customerId);
    }
    
    if (trainerId) {
      await this.mealPlanCacheService.invalidateTrainerMealPlans(trainerId);
    }
    
    if (mealPlanId) {
      await this.mealPlanCacheService.invalidateMealPlan(mealPlanId, customerId, trainerId);
    }
    
    // Invalidate recent meal plans
    await this.cacheService.invalidateByTag('recent-meal-plans');
    
    this.emit('mealPlanAssignmentInvalidated', context.data);
  }

  // =======================
  // Manual Invalidation Methods
  // =======================

  /**
   * Manually invalidate by entity
   */
  async invalidateEntity(entityType: string, entityId: string, userId?: string): Promise<void> {
    const context: InvalidationContext = {
      trigger: `manual:${entityType}:${entityId}`,
      entityType,
      entityId,
      userId,
      timestamp: Date.now(),
    };

    switch (entityType.toLowerCase()) {
      case 'recipe':
        await this.recipeCacheService.invalidateRecipe(entityId, userId);
        break;
      
      case 'mealplan':
        await this.mealPlanCacheService.invalidateMealPlan(entityId, userId);
        break;
      
      case 'user':
        await this.handleUserProfileInvalidation({ ...context, userId: entityId });
        break;
      
      default:
        await this.cacheService.invalidateByTag(`${entityType}:${entityId}`);
    }

    this.emit('manualInvalidation', context);
  }

  /**
   * Manually invalidate by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    let totalInvalidated = 0;
    
    for (const tag of tags) {
      const count = await this.cacheService.invalidateByTag(tag);
      totalInvalidated += count;
    }
    
    this.emit('bulkInvalidation', { tags, count: totalInvalidated });
    return totalInvalidated;
  }

  /**
   * Manually invalidate by patterns
   */
  async invalidateByPatterns(patterns: string[]): Promise<number> {
    let totalInvalidated = 0;
    
    for (const pattern of patterns) {
      const count = await this.cacheService.invalidateByPattern(pattern);
      totalInvalidated += count;
    }
    
    this.emit('bulkInvalidation', { patterns, count: totalInvalidated });
    return totalInvalidated;
  }

  // =======================
  // Dependency Management
  // =======================

  /**
   * Add method dependency
   */
  addDependency(method: string, dependsOn: string): void {
    if (!this.dependencies.has(method)) {
      this.dependencies.set(method, new Set());
    }
    this.dependencies.get(method)!.add(dependsOn);
  }

  /**
   * Remove method dependency
   */
  removeDependency(method: string, dependsOn: string): boolean {
    const deps = this.dependencies.get(method);
    if (!deps) return false;
    
    return deps.delete(dependsOn);
  }

  /**
   * Get method dependencies
   */
  getDependencies(method: string): string[] {
    const deps = this.dependencies.get(method);
    return deps ? Array.from(deps) : [];
  }

  // =======================
  // History and Analytics
  // =======================

  /**
   * Add invalidation to history
   */
  private addToHistory(context: InvalidationContext): void {
    this.invalidationHistory.push(context);
    
    // Keep only last 1000 entries
    if (this.invalidationHistory.length > 1000) {
      this.invalidationHistory.shift();
    }
  }

  /**
   * Get invalidation history
   */
  getHistory(limit: number = 100): InvalidationContext[] {
    return this.invalidationHistory.slice(-limit);
  }

  /**
   * Get invalidation statistics
   */
  getStatistics() {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    const dayAgo = now - (24 * 60 * 60 * 1000);
    
    const recentHistory = this.invalidationHistory.filter(h => h.timestamp > hourAgo);
    const dailyHistory = this.invalidationHistory.filter(h => h.timestamp > dayAgo);
    
    return {
      total: this.invalidationHistory.length,
      lastHour: recentHistory.length,
      lastDay: dailyHistory.length,
      averagePerHour: dailyHistory.length / 24,
      ruleCount: this.rules.size,
      enabledRules: Array.from(this.rules.values()).filter(r => r.enabled).length,
      pendingInvalidations: Array.from(this.pendingInvalidations.values()).reduce((sum, arr) => sum + arr.length, 0),
    };
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.invalidationHistory = [];
    this.emit('historyCleaned');
  }

  // =======================
  // Cleanup
  // =======================

  /**
   * Stop batch processor and clean up
   */
  destroy(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
    
    this.pendingInvalidations.clear();
    this.dependencies.clear();
    this.invalidationHistory = [];
  }
}

// Export decorator for easy usage
export const InvalidateCache = CacheInvalidationService.InvalidateCache;