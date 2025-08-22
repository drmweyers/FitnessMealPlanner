/**
 * Redis Caching Strategy for Recipe Favoriting System + User Engagement
 * 
 * Comprehensive caching design to support 100k+ favorites with sub-100ms query times
 * and real-time trending calculations for 10k+ concurrent users.
 */

import { z } from "zod";

// =============================================================================
// CACHE KEY PATTERNS
// =============================================================================

export const CacheKeys = {
  // User Favorites
  USER_FAVORITES: (userId: string) => `user:${userId}:favorites`,
  USER_FAVORITE_COUNT: (userId: string) => `user:${userId}:favorite_count`,
  RECIPE_FAVORITE_COUNT: (recipeId: string) => `recipe:${recipeId}:favorite_count`,
  
  // User Collections
  USER_COLLECTIONS: (userId: string) => `user:${userId}:collections`,
  COLLECTION_RECIPES: (collectionId: string) => `collection:${collectionId}:recipes`,
  COLLECTION_STATS: (collectionId: string) => `collection:${collectionId}:stats`,
  
  // Popular & Trending Content
  POPULAR_RECIPES_DAILY: "popular:recipes:daily",
  POPULAR_RECIPES_WEEKLY: "popular:recipes:weekly", 
  POPULAR_RECIPES_MONTHLY: "popular:recipes:monthly",
  TRENDING_RECIPES_NOW: "trending:recipes:now",
  TRENDING_RECIPES_CATEGORY: (category: string) => `trending:recipes:${category}`,
  
  // User Engagement
  USER_INTERACTIONS: (userId: string) => `user:${userId}:interactions`,
  RECIPE_VIEW_METRICS: (recipeId: string) => `recipe:${recipeId}:metrics`,
  USER_SESSION: (sessionId: string) => `session:${sessionId}`,
  
  // Social Features
  USER_FOLLOWERS: (userId: string) => `user:${userId}:followers`,
  USER_FOLLOWING: (userId: string) => `user:${userId}:following`,
  USER_SOCIAL_STATS: (userId: string) => `user:${userId}:social_stats`,
  VIRAL_CONTENT: "viral:content",
  
  // Recommendations
  USER_RECOMMENDATIONS: (userId: string) => `user:${userId}:recommendations`,
  SIMILAR_USERS: (userId: string) => `user:${userId}:similar_users`,
  RECOMMENDATION_BATCH: (batchId: string) => `rec_batch:${batchId}`,
  
  // Feature Store
  USER_FEATURES: (userId: string) => `features:user:${userId}`,
  RECIPE_FEATURES: (recipeId: string) => `features:recipe:${recipeId}`,
  
  // Real-time Counters
  REAL_TIME_VIEWS: "realtime:views",
  REAL_TIME_FAVORITES: "realtime:favorites", 
  REAL_TIME_SHARES: "realtime:shares",
  
  // Rate Limiting
  RATE_LIMIT: (key: string) => `rate_limit:${key}`,
  
  // Analytics Aggregations
  ANALYTICS_HOURLY: (hour: string) => `analytics:hourly:${hour}`,
  ANALYTICS_DAILY: (date: string) => `analytics:daily:${date}`,
} as const;

// =============================================================================
// CACHE DATA STRUCTURES & TTL CONFIGURATION
// =============================================================================

export const CacheConfig = {
  // TTL values in seconds
  TTL: {
    USER_FAVORITES: 3600,           // 1 hour - frequently accessed
    USER_COLLECTIONS: 1800,        // 30 minutes - moderately accessed
    POPULAR_RECIPES: 900,           // 15 minutes - high update frequency
    TRENDING_RECIPES: 300,          // 5 minutes - real-time updates
    USER_RECOMMENDATIONS: 7200,     // 2 hours - expensive to regenerate
    USER_SOCIAL_STATS: 1800,        // 30 minutes
    RECIPE_METRICS: 600,            // 10 minutes
    USER_SESSION: 86400,            // 24 hours - session duration
    SIMILAR_USERS: 3600,            // 1 hour
    VIRAL_CONTENT: 300,             // 5 minutes - fast moving
    REAL_TIME_COUNTERS: 60,         // 1 minute - very fresh data
    RATE_LIMITS: 3600,              // 1 hour
    ANALYTICS: 43200,               // 12 hours - stable data
    FEATURES: 1800,                 // 30 minutes - ML features
  },
  
  // Maximum sizes for collections
  MAX_SIZES: {
    USER_FAVORITES: 10000,          // Max favorites per user
    TRENDING_RECIPES: 100,          // Top trending recipes
    POPULAR_RECIPES: 500,           // Popular recipes pool
    USER_RECOMMENDATIONS: 200,      // Recommendations per user
    SIMILAR_USERS: 50,              // Similar users to cache
    VIRAL_CONTENT: 50,              // Top viral content
  },
} as const;

// =============================================================================
// REDIS DATA STRUCTURE DESIGNS
// =============================================================================

/**
 * User Favorites Cache Structure
 * 
 * Uses Redis HASH for efficient storage and retrieval of user's favorites
 * with metadata like favorite type and creation timestamp.
 */
export interface UserFavoritesCache {
  // HASH: user:{userId}:favorites
  // Field: recipeId, Value: JSON{type, createdAt, notes}
  [recipeId: string]: {
    type: "standard" | "want_to_try" | "made_it" | "love_it";
    createdAt: string;
    notes?: string;
  };
}

/**
 * Popular Recipes Cache Structure
 * 
 * Uses Redis SORTED SET for ranked popular recipes with scores
 * based on engagement metrics and time decay.
 */
export interface PopularRecipesCache {
  // ZSET: popular:recipes:{timeframe}
  // Member: recipeId, Score: popularity_score
  recipeId: string;
  score: number; // Calculated popularity score
  metadata?: {
    viewCount: number;
    favoriteCount: number;
    shareCount: number;
    avgRating: number;
  };
}

/**
 * User Recommendations Cache Structure
 * 
 * Uses Redis LIST for ordered recommendations with JSON metadata
 * for fast retrieval of personalized recommendations.
 */
export interface UserRecommendationsCache {
  // LIST: user:{userId}:recommendations
  // Value: JSON{recipeId, score, reason, algorithm, generatedAt}
  recipeId: string;
  score: number;
  reason: string;
  algorithm: string;
  confidence: number;
  generatedAt: string;
  context?: string;
}

/**
 * Real-time Metrics Cache Structure
 * 
 * Uses Redis HASH for real-time counters and metrics
 * with atomic increment operations.
 */
export interface RealTimeMetricsCache {
  // HASH: realtime:{metric_type}
  // Field: entityId, Value: count
  [entityId: string]: number;
}

/**
 * User Session Cache Structure
 * 
 * Uses Redis HASH for session tracking and analytics
 * with structured session data.
 */
export interface UserSessionCache {
  // HASH: session:{sessionId}
  sessionId: string;
  userId?: string;
  startTime: string;
  deviceType: string;
  location?: string;
  pageViews: number;
  recipeViews: number;
  interactions: string[]; // JSON array of interaction IDs
  lastActivity: string;
}

// =============================================================================
// CACHE OPERATIONS INTERFACE
// =============================================================================

export interface CacheOperations {
  // User Favorites Operations
  addToFavorites(userId: string, recipeId: string, type: string, notes?: string): Promise<void>;
  removeFromFavorites(userId: string, recipeId: string): Promise<void>;
  getUserFavorites(userId: string, limit?: number): Promise<UserFavoritesCache>;
  isFavorited(userId: string, recipeId: string): Promise<boolean>;
  getFavoriteCount(userId: string): Promise<number>;
  
  // Popular Content Operations
  updatePopularRecipes(timeframe: 'daily' | 'weekly' | 'monthly'): Promise<void>;
  getPopularRecipes(timeframe: 'daily' | 'weekly' | 'monthly', limit: number): Promise<PopularRecipesCache[]>;
  getTrendingRecipes(category?: string, limit?: number): Promise<PopularRecipesCache[]>;
  
  // Recommendations Operations
  cacheRecommendations(userId: string, recommendations: UserRecommendationsCache[]): Promise<void>;
  getUserRecommendations(userId: string, limit?: number): Promise<UserRecommendationsCache[]>;
  clearRecommendations(userId: string): Promise<void>;
  
  // Real-time Metrics Operations
  incrementView(recipeId: string): Promise<number>;
  incrementFavorite(recipeId: string): Promise<number>;
  incrementShare(recipeId: string): Promise<number>;
  getRealTimeMetrics(recipeId: string): Promise<RealTimeMetricsCache>;
  
  // Session Operations
  createSession(sessionId: string, sessionData: Partial<UserSessionCache>): Promise<void>;
  updateSession(sessionId: string, updates: Partial<UserSessionCache>): Promise<void>;
  getSession(sessionId: string): Promise<UserSessionCache | null>;
  
  // Social Features Operations
  addFollower(userId: string, followerId: string): Promise<void>;
  removeFollower(userId: string, followerId: string): Promise<void>;
  getFollowers(userId: string, limit?: number): Promise<string[]>;
  getFollowing(userId: string, limit?: number): Promise<string[]>;
  updateSocialStats(userId: string, stats: Record<string, number>): Promise<void>;
}

// =============================================================================
// CACHE INVALIDATION STRATEGIES
// =============================================================================

export const CacheInvalidationRules = {
  // When user favorites a recipe
  ON_FAVORITE_ADDED: [
    (userId: string, recipeId: string) => CacheKeys.USER_FAVORITES(userId),
    (userId: string, recipeId: string) => CacheKeys.USER_FAVORITE_COUNT(userId),
    (userId: string, recipeId: string) => CacheKeys.RECIPE_FAVORITE_COUNT(recipeId),
    (userId: string, recipeId: string) => CacheKeys.POPULAR_RECIPES_DAILY,
    (userId: string, recipeId: string) => CacheKeys.USER_SOCIAL_STATS(userId),
  ],
  
  // When user removes favorite
  ON_FAVORITE_REMOVED: [
    (userId: string, recipeId: string) => CacheKeys.USER_FAVORITES(userId),
    (userId: string, recipeId: string) => CacheKeys.USER_FAVORITE_COUNT(userId),
    (userId: string, recipeId: string) => CacheKeys.RECIPE_FAVORITE_COUNT(recipeId),
    (userId: string, recipeId: string) => CacheKeys.POPULAR_RECIPES_DAILY,
  ],
  
  // When recipe is viewed
  ON_RECIPE_VIEW: [
    (userId: string, recipeId: string) => CacheKeys.RECIPE_VIEW_METRICS(recipeId),
    (userId: string, recipeId: string) => CacheKeys.POPULAR_RECIPES_DAILY,
    (userId: string, recipeId: string) => CacheKeys.TRENDING_RECIPES_NOW,
  ],
  
  // When user follows another user
  ON_USER_FOLLOW: [
    (followerId: string, followingId: string) => CacheKeys.USER_FOLLOWERS(followingId),
    (followerId: string, followingId: string) => CacheKeys.USER_FOLLOWING(followerId),
    (followerId: string, followingId: string) => CacheKeys.USER_SOCIAL_STATS(followerId),
    (followerId: string, followingId: string) => CacheKeys.USER_SOCIAL_STATS(followingId),
  ],
  
  // When new recommendations are generated
  ON_RECOMMENDATIONS_UPDATED: [
    (userId: string) => CacheKeys.USER_RECOMMENDATIONS(userId),
    (userId: string) => CacheKeys.SIMILAR_USERS(userId),
  ],
} as const;

// =============================================================================
// PERFORMANCE OPTIMIZATION STRATEGIES
// =============================================================================

export const PerformanceStrategies = {
  // Pipeline Operations for Batch Processing
  BATCH_OPERATIONS: {
    // Batch user favorites retrieval
    GET_MULTIPLE_USER_FAVORITES: async (userIds: string[]) => {
      // Use Redis pipeline to get multiple user favorites in single round trip
      const pipeline = []; // Redis pipeline commands
      return pipeline;
    },
    
    // Batch popularity updates
    UPDATE_MULTIPLE_POPULARITY_SCORES: async (updates: Array<{recipeId: string, score: number}>) => {
      // Use Redis pipeline for batch popularity updates
      const pipeline = []; // Redis pipeline commands
      return pipeline;
    },
  },
  
  // Memory Optimization
  MEMORY_OPTIMIZATION: {
    // Use Redis EXPIRE for automatic cleanup
    AUTO_EXPIRE_KEYS: true,
    
    // Use Redis LRU for memory management
    LRU_POLICY: "allkeys-lru",
    
    // Compress large JSON objects
    COMPRESS_LARGE_OBJECTS: true,
    
    // Use efficient data structures
    PREFER_HASH_OVER_STRING: true,
    PREFER_ZSET_FOR_RANKINGS: true,
  },
  
  // Read Replicas for Heavy Read Workloads
  READ_SCALING: {
    // Route read operations to replicas
    USE_READ_REPLICAS: true,
    
    // Cache frequently accessed data in application memory
    APPLICATION_CACHE: true,
    
    // Use consistent hashing for data distribution
    CONSISTENT_HASHING: true,
  },
} as const;

// =============================================================================
// ANALYTICS & MONITORING
// =============================================================================

export const CacheMonitoring = {
  // Key Metrics to Track
  METRICS: {
    HIT_RATE: "cache_hit_rate",
    MISS_RATE: "cache_miss_rate", 
    EVICTION_RATE: "cache_eviction_rate",
    MEMORY_USAGE: "memory_usage",
    CONNECTION_COUNT: "connection_count",
    COMMAND_RATE: "commands_per_second",
  },
  
  // Performance Thresholds
  THRESHOLDS: {
    MIN_HIT_RATE: 0.85,           // 85% cache hit rate
    MAX_MEMORY_USAGE: 0.8,        // 80% max memory usage
    MAX_RESPONSE_TIME: 100,       // 100ms max response time
    MAX_CONNECTION_COUNT: 1000,    // 1000 max connections
  },
  
  // Alerting Rules
  ALERTS: {
    LOW_HIT_RATE: "Hit rate below 85%",
    HIGH_MEMORY_USAGE: "Memory usage above 80%", 
    SLOW_RESPONSE: "Response time above 100ms",
    CONNECTION_LIMIT: "Connection count near limit",
  },
} as const;

// =============================================================================
// CACHE WARMING STRATEGIES
// =============================================================================

export const CacheWarmingStrategy = {
  // High Priority - Warm on Application Start
  HIGH_PRIORITY: [
    "POPULAR_RECIPES_DAILY",
    "TRENDING_RECIPES_NOW", 
    "VIRAL_CONTENT",
  ],
  
  // Medium Priority - Warm on User Login
  MEDIUM_PRIORITY: [
    "USER_FAVORITES",
    "USER_RECOMMENDATIONS",
    "USER_SOCIAL_STATS",
  ],
  
  // Low Priority - Warm on Demand
  LOW_PRIORITY: [
    "SIMILAR_USERS",
    "COLLECTION_RECIPES",
    "USER_SESSIONS",
  ],
  
  // Warming Schedule
  SCHEDULE: {
    POPULAR_RECIPES: "*/15 * * * *",    // Every 15 minutes
    TRENDING_RECIPES: "*/5 * * * *",     // Every 5 minutes
    USER_RECOMMENDATIONS: "0 */2 * * *", // Every 2 hours
    ANALYTICS_AGGREGATIONS: "0 * * * *", // Every hour
  },
} as const;

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type CacheKeyType = keyof typeof CacheKeys;
export type TTLType = keyof typeof CacheConfig.TTL;
export type InvalidationRule = keyof typeof CacheInvalidationRules;

// Validation schemas for cache operations
export const cacheOperationSchema = z.object({
  operation: z.enum(["get", "set", "delete", "increment", "pipeline"]),
  key: z.string(),
  value: z.any().optional(),
  ttl: z.number().optional(),
  pipeline: z.array(z.object({
    operation: z.string(),
    key: z.string(),
    value: z.any().optional(),
  })).optional(),
});

export const cacheMetricsSchema = z.object({
  hitRate: z.number().min(0).max(1),
  missRate: z.number().min(0).max(1),
  memoryUsage: z.number().min(0).max(1),
  responseTime: z.number().min(0),
  connectionCount: z.number().min(0),
  commandRate: z.number().min(0),
});

export type CacheOperation = z.infer<typeof cacheOperationSchema>;
export type CacheMetrics = z.infer<typeof cacheMetricsSchema>;

// Export utility functions for cache key generation
export const generateCacheKey = (pattern: string, ...args: string[]): string => {
  return pattern.replace(/\{(\d+)\}/g, (match, index) => args[parseInt(index)] || match);
};

export const getCacheTTL = (keyType: TTLType): number => {
  return CacheConfig.TTL[keyType];
};

export const shouldInvalidateCache = (event: InvalidationRule, ...args: string[]): string[] => {
  const rules = CacheInvalidationRules[event];
  return rules.map(rule => rule(...args));
};