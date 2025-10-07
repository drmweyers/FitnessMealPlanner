/**
 * Cache Manager
 * 
 * Central manager for all caching services in the FitnessMealPlanner application.
 * Provides initialization, configuration, and coordination of Redis-based caching.
 * 
 * Features:
 * - Centralized cache service initialization
 * - Health monitoring and diagnostics
 * - Performance metrics aggregation
 * - Feature flag management
 * - Graceful degradation when Redis is unavailable
 * - Cache warm-up and preloading
 * - Maintenance and cleanup scheduling
 */

import { createRedisClient, RedisClient, RedisConnectionConfig } from './redisClient';
import { CacheService } from './cacheService';
import { RecipeCacheService } from './recipeCacheService';
import { MealPlanCacheService } from './mealPlanCacheService';
import { RateLimitService } from './rateLimitService';
import { CacheInvalidationService } from './cacheInvalidationService';
import { RedisSessionStore, createRedisSessionStore } from './redisSessionStore';
import { EventEmitter } from 'events';

export interface CacheManagerConfig {
  redis: RedisConnectionConfig;
  cache: {
    enabled: boolean;
    prefix: string;
    defaultTTL: number;
    compressionThreshold: number;
  };
  rateLimit: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
  };
  session: {
    type: 'redis' | 'memory';
    compress: boolean;
    encryptionSecret?: string;
  };
  features: {
    cacheMiddleware: boolean;
    redisSessionStore: boolean;
    cacheInvalidation: boolean;
    rateLimiting: boolean;
  };
}

export interface CacheHealthStatus {
  redis: {
    connected: boolean;
    ready: boolean;
    latency?: number;
    memory?: string;
    error?: string;
  };
  services: {
    cacheService: boolean;
    recipeCacheService: boolean;
    mealPlanCacheService: boolean;
    rateLimitService: boolean;
    invalidationService: boolean;
    sessionStore: boolean;
  };
  performance: {
    hitRate: number;
    avgResponseTime: number;
    totalOperations: number;
  };
  features: {
    [key: string]: boolean;
  };
}

export class CacheManager extends EventEmitter {
  private config: CacheManagerConfig;
  private redisClient: RedisClient | null = null;
  private cacheService: CacheService | null = null;
  private recipeCacheService: RecipeCacheService | null = null;
  private mealPlanCacheService: MealPlanCacheService | null = null;
  private rateLimitService: RateLimitService | null = null;
  private invalidationService: CacheInvalidationService | null = null;
  private sessionStore: RedisSessionStore | null = null;
  private initialized: boolean = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private maintenanceInterval: NodeJS.Timeout | null = null;

  constructor(config: CacheManagerConfig) {
    super();
    this.config = config;
  }

  /**
   * Initialize all caching services
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[CacheManager] Already initialized');
      return;
    }

    try {
      console.log('[CacheManager] Initializing caching system...');

      // Initialize Redis client
      await this.initializeRedisClient();

      // Initialize core services
      await this.initializeServices();

      // Set up health monitoring
      this.startHealthMonitoring();

      // Set up maintenance scheduling
      this.startMaintenanceScheduler();

      // Perform initial cache warm-up
      await this.performWarmup();

      this.initialized = true;
      console.log('[CacheManager] Cache system initialized successfully');
      this.emit('initialized');

    } catch (error) {
      console.error('[CacheManager] Initialization failed:', error);
      this.emit('initializationError', error);
      
      // Enable fallback mode
      this.enableFallbackMode();
    }
  }

  /**
   * Initialize Redis client
   */
  private async initializeRedisClient(): Promise<void> {
    if (!this.config.cache.enabled) {
      console.log('[CacheManager] Caching disabled by configuration');
      return;
    }

    try {
      this.redisClient = createRedisClient(this.config.redis);
      await this.redisClient.connect();
      
      this.redisClient.on('error', (error) => {
        console.error('[CacheManager] Redis error:', error);
        this.emit('redisError', error);
      });

      this.redisClient.on('connected', () => {
        console.log('[CacheManager] Redis connected');
        this.emit('redisConnected');
      });

      this.redisClient.on('disconnected', () => {
        console.log('[CacheManager] Redis disconnected');
        this.emit('redisDisconnected');
      });

    } catch (error) {
      console.error('[CacheManager] Redis client initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize all caching services
   */
  private async initializeServices(): Promise<void> {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }

    // Initialize core cache service
    this.cacheService = new CacheService(this.config.cache.prefix, this.redisClient);
    
    // Initialize specialized cache services
    this.recipeCacheService = new RecipeCacheService(this.cacheService);
    this.mealPlanCacheService = new MealPlanCacheService(this.cacheService);
    
    // Initialize rate limiting service
    if (this.config.features.rateLimiting) {
      this.rateLimitService = new RateLimitService(this.cacheService);
    }
    
    // Initialize cache invalidation service
    if (this.config.features.cacheInvalidation) {
      this.invalidationService = new CacheInvalidationService(
        this.cacheService,
        this.recipeCacheService,
        this.mealPlanCacheService
      );
      
      // Set singleton instance for decorator usage
      CacheInvalidationService.setInstance(this.invalidationService);
    }
    
    // Initialize session store
    if (this.config.features.redisSessionStore && this.config.session.type === 'redis') {
      this.sessionStore = createRedisSessionStore(this.cacheService, this.redisClient, {
        compress: this.config.session.compress,
        encryption: this.config.session.encryptionSecret ? {
          secret: this.config.session.encryptionSecret,
        } : undefined,
      });
    }

    // Set up service event handlers
    this.setupServiceEventHandlers();
  }

  /**
   * Set up event handlers for all services
   */
  private setupServiceEventHandlers(): void {
    if (this.cacheService) {
      this.cacheService.on('cacheHit', (data) => this.emit('cacheHit', data));
      this.cacheService.on('cacheMiss', (data) => this.emit('cacheMiss', data));
      this.cacheService.on('cacheError', (data) => this.emit('cacheError', data));
    }

    if (this.recipeCacheService) {
      this.recipeCacheService.on('recipeCached', (data) => this.emit('recipeCached', data));
      this.recipeCacheService.on('recipeInvalidated', (data) => this.emit('recipeInvalidated', data));
    }

    if (this.mealPlanCacheService) {
      this.mealPlanCacheService.on('mealPlanCached', (data) => this.emit('mealPlanCached', data));
      this.mealPlanCacheService.on('mealPlanInvalidated', (data) => this.emit('mealPlanInvalidated', data));
    }

    if (this.rateLimitService) {
      this.rateLimitService.on('rateLimitExceeded', (data) => this.emit('rateLimitExceeded', data));
    }

    if (this.invalidationService) {
      this.invalidationService.on('invalidationExecuted', (data) => this.emit('invalidationExecuted', data));
    }

    if (this.sessionStore) {
      this.sessionStore.on('connect', () => this.emit('sessionStoreConnected'));
      this.sessionStore.on('disconnect', () => this.emit('sessionStoreDisconnected'));
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.getHealthStatus();
        this.emit('healthCheck', health);
        
        if (!health.redis.connected) {
          console.warn('[CacheManager] Redis health check failed');
          this.emit('healthWarning', { service: 'redis', status: health.redis });
        }
      } catch (error) {
        console.error('[CacheManager] Health check error:', error);
        this.emit('healthError', error);
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Start maintenance scheduler
   */
  private startMaintenanceScheduler(): void {
    this.maintenanceInterval = setInterval(async () => {
      try {
        await this.performMaintenance();
      } catch (error) {
        console.error('[CacheManager] Maintenance error:', error);
        this.emit('maintenanceError', error);
      }
    }, 3600000); // Every hour
  }

  /**
   * Perform cache warm-up
   */
  private async performWarmup(): Promise<void> {
    if (!this.recipeCacheService || !this.mealPlanCacheService) {
      return;
    }

    try {
      console.log('[CacheManager] Starting cache warm-up...');
      
      // This would typically fetch popular recipes and meal plans from the database
      // For now, we'll emit events that controllers can listen to for warm-up
      this.emit('warmupRequested', {
        recipes: true,
        mealPlans: true,
        userSessions: true,
      });

      console.log('[CacheManager] Cache warm-up completed');
    } catch (error) {
      console.error('[CacheManager] Cache warm-up failed:', error);
    }
  }

  /**
   * Perform maintenance tasks
   */
  private async performMaintenance(): Promise<void> {
    console.log('[CacheManager] Starting maintenance tasks...');
    
    try {
      // Clean up expired cache entries
      if (this.recipeCacheService) {
        await this.recipeCacheService.cleanup();
      }
      
      if (this.mealPlanCacheService) {
        await this.mealPlanCacheService.cleanup();
      }
      
      // Reset rate limit statistics
      if (this.rateLimitService) {
        // Optionally reset metrics periodically
      }
      
      // Clean up invalidation history
      if (this.invalidationService) {
        const history = this.invalidationService.getHistory();
        if (history.length > 500) {
          this.invalidationService.clearHistory();
        }
      }

      console.log('[CacheManager] Maintenance tasks completed');
      this.emit('maintenanceCompleted');
      
    } catch (error) {
      console.error('[CacheManager] Maintenance failed:', error);
      this.emit('maintenanceError', error);
    }
  }

  /**
   * Enable fallback mode when Redis is unavailable
   */
  private enableFallbackMode(): void {
    console.log('[CacheManager] Enabling fallback mode - caching disabled');
    
    // Create mock services that do nothing
    this.cacheService = null;
    this.recipeCacheService = null;
    this.mealPlanCacheService = null;
    this.rateLimitService = null;
    this.invalidationService = null;
    this.sessionStore = null;
    
    this.emit('fallbackModeEnabled');
  }

  // =======================
  // Service Getters
  // =======================

  /**
   * Get Redis client instance
   */
  getRedisClient(): RedisClient | null {
    return this.redisClient;
  }

  /**
   * Get cache service instance
   */
  getCacheService(): CacheService | null {
    return this.cacheService;
  }

  /**
   * Get recipe cache service instance
   */
  getRecipeCacheService(): RecipeCacheService | null {
    return this.recipeCacheService;
  }

  /**
   * Get meal plan cache service instance
   */
  getMealPlanCacheService(): MealPlanCacheService | null {
    return this.mealPlanCacheService;
  }

  /**
   * Get rate limit service instance
   */
  getRateLimitService(): RateLimitService | null {
    return this.rateLimitService;
  }

  /**
   * Get cache invalidation service instance
   */
  getCacheInvalidationService(): CacheInvalidationService | null {
    return this.invalidationService;
  }

  /**
   * Get session store instance
   */
  getSessionStore(): RedisSessionStore | null {
    return this.sessionStore;
  }

  // =======================
  // Health and Diagnostics
  // =======================

  /**
   * Get comprehensive health status
   */
  async getHealthStatus(): Promise<CacheHealthStatus> {
    const status: CacheHealthStatus = {
      redis: {
        connected: false,
        ready: false,
      },
      services: {
        cacheService: !!this.cacheService,
        recipeCacheService: !!this.recipeCacheService,
        mealPlanCacheService: !!this.mealPlanCacheService,
        rateLimitService: !!this.rateLimitService,
        invalidationService: !!this.invalidationService,
        sessionStore: !!this.sessionStore,
      },
      performance: {
        hitRate: 0,
        avgResponseTime: 0,
        totalOperations: 0,
      },
      features: {
        cacheMiddleware: this.config.features.cacheMiddleware,
        redisSessionStore: this.config.features.redisSessionStore,
        cacheInvalidation: this.config.features.cacheInvalidation,
        rateLimiting: this.config.features.rateLimiting,
      },
    };

    // Check Redis health
    if (this.redisClient) {
      try {
        const redisHealth = await this.redisClient.getHealthStatus();
        status.redis = redisHealth;
      } catch (error) {
        status.redis.error = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    // Get performance metrics
    if (this.cacheService) {
      const stats = this.cacheService.getStats();
      status.performance = {
        hitRate: stats.hitRate,
        avgResponseTime: stats.avgResponseTime,
        totalOperations: stats.totalOperations,
      };
    }

    return status;
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics() {
    const metrics: any = {
      cache: null,
      recipes: null,
      mealPlans: null,
      rateLimit: null,
    };

    if (this.cacheService) {
      metrics.cache = this.cacheService.getStats();
    }

    if (this.recipeCacheService) {
      metrics.recipes = await this.recipeCacheService.getCacheStats();
    }

    if (this.mealPlanCacheService) {
      metrics.mealPlans = await this.mealPlanCacheService.getCacheStats();
    }

    if (this.rateLimitService) {
      metrics.rateLimit = this.rateLimitService.getMetrics();
    }

    return metrics;
  }

  // =======================
  // Configuration Management
  // =======================

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<CacheManagerConfig>): void {
    this.config = { ...this.config, ...updates };
    this.emit('configUpdated', updates);
  }

  /**
   * Get current configuration
   */
  getConfig(): CacheManagerConfig {
    return { ...this.config };
  }

  /**
   * Check if feature is enabled
   */
  isFeatureEnabled(feature: keyof CacheManagerConfig['features']): boolean {
    return this.config.features[feature];
  }

  /**
   * Enable/disable feature
   */
  setFeatureEnabled(feature: keyof CacheManagerConfig['features'], enabled: boolean): void {
    this.config.features[feature] = enabled;
    this.emit('featureToggled', { feature, enabled });
  }

  // =======================
  // Manual Operations
  // =======================

  /**
   * Manually trigger cache warm-up
   */
  async warmup(): Promise<void> {
    await this.performWarmup();
  }

  /**
   * Manually trigger maintenance
   */
  async maintenance(): Promise<void> {
    await this.performMaintenance();
  }

  /**
   * Flush all caches
   */
  async flushAll(): Promise<void> {
    if (this.cacheService) {
      await this.cacheService.flush();
    }
    
    this.emit('allCachesFlushed');
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('[CacheManager] Shutting down...');
    
    try {
      // Clear intervals
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }
      
      if (this.maintenanceInterval) {
        clearInterval(this.maintenanceInterval);
        this.maintenanceInterval = null;
      }
      
      // Close session store
      if (this.sessionStore) {
        this.sessionStore.close();
      }
      
      // Destroy invalidation service
      if (this.invalidationService) {
        this.invalidationService.destroy();
      }
      
      // Disconnect Redis
      if (this.redisClient) {
        await this.redisClient.disconnect();
      }
      
      this.initialized = false;
      console.log('[CacheManager] Shutdown completed');
      this.emit('shutdown');
      
    } catch (error) {
      console.error('[CacheManager] Shutdown error:', error);
      this.emit('shutdownError', error);
    }
  }
}

/**
 * Create cache manager from environment variables
 */
export function createCacheManagerFromEnv(): CacheManager {
  const config: CacheManagerConfig = {
    redis: {
      url: process.env.REDIS_URL,
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
    },
    cache: {
      enabled: process.env.CACHE_ENABLED === 'true',
      prefix: process.env.CACHE_PREFIX || 'fitnessmeal:',
      defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL || '3600'),
      compressionThreshold: parseInt(process.env.CACHE_COMPRESSION_THRESHOLD || '1024'),
    },
    rateLimit: {
      enabled: process.env.RATE_LIMIT_ENABLED === 'true',
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    },
    session: {
      type: (process.env.SESSION_STORE_TYPE as 'redis' | 'memory') || 'redis',
      compress: process.env.SESSION_COMPRESS === 'true',
      encryptionSecret: process.env.SESSION_ENCRYPTION_SECRET,
    },
    features: {
      cacheMiddleware: process.env.CACHE_MIDDLEWARE_ENABLED === 'true',
      redisSessionStore: process.env.REDIS_SESSION_STORE_ENABLED === 'true',
      cacheInvalidation: process.env.CACHE_INVALIDATION_ENABLED === 'true',
      rateLimiting: process.env.RATE_LIMITING_ENABLED === 'true',
    },
  };

  return new CacheManager(config);
}