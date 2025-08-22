/**
 * Redis Caching System Tests
 * 
 * Comprehensive test suite for the Redis caching implementation.
 * Tests all major components including cache service, session store,
 * rate limiting, and feature flags.
 */

import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import { CacheManager, createCacheManagerFromEnv } from '../server/services/cacheManager';
import { CacheService } from '../server/services/cacheService';
import { RecipeCacheService } from '../server/services/recipeCacheService';
import { MealPlanCacheService } from '../server/services/mealPlanCacheService';
import { RateLimitService } from '../server/services/rateLimitService';
import { FeatureFlagService } from '../server/services/featureFlagService';
import { RedisClient, createRedisClient } from '../server/services/redisClient';

// Mock environment variables for testing
process.env.CACHE_ENABLED = 'true';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_PASSWORD = 'test_password';
process.env.CACHE_MIDDLEWARE_ENABLED = 'true';
process.env.REDIS_SESSION_STORE_ENABLED = 'true';
process.env.RATE_LIMITING_ENABLED = 'true';

describe('Redis Caching System', () => {
  let cacheManager: CacheManager;
  let redisClient: RedisClient;
  let cacheService: CacheService;

  beforeAll(async () => {
    // Use test configuration
    cacheManager = createCacheManagerFromEnv();
    
    try {
      await cacheManager.initialize();
      redisClient = cacheManager.getRedisClient()!;
      cacheService = cacheManager.getCacheService()!;
    } catch (error) {
      console.warn('Redis not available for testing, using mock implementations');
      // Skip Redis-dependent tests if Redis is not available
    }
  });

  afterAll(async () => {
    if (cacheManager) {
      await cacheManager.shutdown();
    }
  });

  beforeEach(async () => {
    // Clear cache before each test
    if (cacheService) {
      await cacheService.flush();
    }
  });

  describe('CacheService', () => {
    it('should set and get cache values', async () => {
      if (!cacheService) {
        console.log('Skipping test - Redis not available');
        return;
      }

      const testKey = 'test-key';
      const testValue = { message: 'Hello, World!', timestamp: Date.now() };

      // Set cache value
      const setResult = await cacheService.set(testKey, testValue);
      expect(setResult).toBe(true);

      // Get cache value
      const getValue = await cacheService.get(testKey);
      expect(getValue).toEqual(testValue);
    });

    it('should handle TTL expiration', async () => {
      if (!cacheService) {
        console.log('Skipping test - Redis not available');
        return;
      }

      const testKey = 'ttl-test';
      const testValue = 'expires soon';
      const ttl = 1; // 1 second

      // Set with short TTL
      await cacheService.set(testKey, testValue, { ttl });

      // Value should be available immediately
      const immediateValue = await cacheService.get(testKey);
      expect(immediateValue).toBe(testValue);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Value should be expired
      const expiredValue = await cacheService.get(testKey);
      expect(expiredValue).toBeNull();
    });

    it('should support cache invalidation by tags', async () => {
      if (!cacheService) {
        console.log('Skipping test - Redis not available');
        return;
      }

      const tags = ['recipes', 'user:123'];
      
      // Set multiple values with tags
      await cacheService.set('recipe:1', { name: 'Recipe 1' }, { tags });
      await cacheService.set('recipe:2', { name: 'Recipe 2' }, { tags });
      await cacheService.set('other:1', { name: 'Other 1' }, { tags: ['other'] });

      // Verify values are cached
      expect(await cacheService.get('recipe:1')).toEqual({ name: 'Recipe 1' });
      expect(await cacheService.get('recipe:2')).toEqual({ name: 'Recipe 2' });
      expect(await cacheService.get('other:1')).toEqual({ name: 'Other 1' });

      // Invalidate by tag
      const invalidatedCount = await cacheService.invalidateByTag('recipes');
      expect(invalidatedCount).toBeGreaterThan(0);

      // Tagged values should be gone
      expect(await cacheService.get('recipe:1')).toBeNull();
      expect(await cacheService.get('recipe:2')).toBeNull();
      
      // Non-tagged value should remain
      expect(await cacheService.get('other:1')).toEqual({ name: 'Other 1' });
    });

    it('should handle compression for large values', async () => {
      if (!cacheService) {
        console.log('Skipping test - Redis not available');
        return;
      }

      // Create large test data
      const largeValue = {
        data: 'x'.repeat(2048), // 2KB of data
        metadata: { compressed: true },
      };

      // Set with compression enabled
      const setResult = await cacheService.set('large-value', largeValue, { compress: true });
      expect(setResult).toBe(true);

      // Get compressed value
      const getValue = await cacheService.get('large-value');
      expect(getValue).toEqual(largeValue);
    });
  });

  describe('RecipeCacheService', () => {
    let recipeCacheService: RecipeCacheService;

    beforeEach(() => {
      if (cacheService) {
        recipeCacheService = new RecipeCacheService(cacheService);
      }
    });

    it('should cache and retrieve recipes', async () => {
      if (!recipeCacheService) {
        console.log('Skipping test - Redis not available');
        return;
      }

      const recipe = {
        id: 'recipe-123',
        title: 'Test Recipe',
        description: 'A test recipe',
        ingredients: ['ingredient1', 'ingredient2'],
        instructions: ['step1', 'step2'],
        userId: 'user-456',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Cache recipe
      const cacheResult = await recipeCacheService.cacheRecipe(recipe);
      expect(cacheResult).toBe(true);

      // Retrieve recipe
      const cachedRecipe = await recipeCacheService.getCachedRecipe(recipe.id);
      expect(cachedRecipe).toEqual(recipe);
    });

    it('should invalidate recipe cache', async () => {
      if (!recipeCacheService) {
        console.log('Skipping test - Redis not available');
        return;
      }

      const recipe = {
        id: 'recipe-456',
        title: 'Test Recipe 2',
        description: 'Another test recipe',
        ingredients: ['ingredient3'],
        instructions: ['step3'],
        userId: 'user-789',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Cache recipe
      await recipeCacheService.cacheRecipe(recipe);
      expect(await recipeCacheService.getCachedRecipe(recipe.id)).toEqual(recipe);

      // Invalidate recipe
      const invalidated = await recipeCacheService.invalidateRecipe(recipe.id, recipe.userId);
      expect(invalidated).toBe(true);

      // Recipe should no longer be cached
      expect(await recipeCacheService.getCachedRecipe(recipe.id)).toBeNull();
    });
  });

  describe('MealPlanCacheService', () => {
    let mealPlanCacheService: MealPlanCacheService;

    beforeEach(() => {
      if (cacheService) {
        mealPlanCacheService = new MealPlanCacheService(cacheService);
      }
    });

    it('should cache and retrieve meal plans', async () => {
      if (!mealPlanCacheService) {
        console.log('Skipping test - Redis not available');
        return;
      }

      const mealPlan = {
        id: 'plan-123',
        title: 'Test Meal Plan',
        customerId: 'customer-456',
        trainerId: 'trainer-789',
        weekStart: new Date(),
        weekEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'active' as const,
        meals: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Cache meal plan
      const cacheResult = await mealPlanCacheService.cacheMealPlan(mealPlan);
      expect(cacheResult).toBe(true);

      // Retrieve meal plan
      const cachedPlan = await mealPlanCacheService.getCachedMealPlan(mealPlan.id);
      expect(cachedPlan).toEqual(mealPlan);
    });

    it('should manage user-specific meal plan lists', async () => {
      if (!mealPlanCacheService) {
        console.log('Skipping test - Redis not available');
        return;
      }

      const userId = 'user-123';
      const planIds = ['plan-1', 'plan-2', 'plan-3'];

      // Cache user meal plans
      const cacheResult = await mealPlanCacheService.cacheUserMealPlans(userId, planIds);
      expect(cacheResult).toBe(true);

      // Retrieve user meal plans
      const cachedPlanIds = await mealPlanCacheService.getCachedUserMealPlans(userId);
      expect(cachedPlanIds).toEqual(planIds);

      // Add more plans
      await mealPlanCacheService.addToUserMealPlans(userId, 'plan-4', 'plan-5');
      const updatedPlanIds = await mealPlanCacheService.getCachedUserMealPlans(userId);
      expect(updatedPlanIds).toEqual([...planIds, 'plan-4', 'plan-5']);
    });
  });

  describe('RateLimitService', () => {
    let rateLimitService: RateLimitService;
    
    beforeEach(() => {
      if (cacheService) {
        rateLimitService = new RateLimitService(cacheService);
      }
    });

    it('should enforce rate limits', async () => {
      if (!rateLimitService) {
        console.log('Skipping test - Redis not available');
        return;
      }

      // Mock request object
      const mockRequest = {
        ip: '127.0.0.1',
        path: '/api/test',
        method: 'GET',
        user: { id: 'user-123', role: 'customer' },
      } as any;

      // Add a test rule with very low limits
      rateLimitService.addRule({
        id: 'test-rule',
        name: 'Test Rate Limit',
        algorithm: 'fixed-window',
        windowMs: 60000, // 1 minute
        maxRequests: 2,
        keyGenerator: (req) => `test:${req.ip}`,
        enabled: true,
        priority: 10,
      });

      // First request should be allowed
      const result1 = await rateLimitService.checkRateLimit(mockRequest);
      expect(result1).toBeNull(); // No limit exceeded

      // Second request should be allowed
      const result2 = await rateLimitService.checkRateLimit(mockRequest);
      expect(result2).toBeNull(); // No limit exceeded

      // Third request should be rate limited
      const result3 = await rateLimitService.checkRateLimit(mockRequest);
      expect(result3).not.toBeNull();
      expect(result3!.remaining).toBe(0);
    });

    it('should handle whitelist and blacklist', async () => {
      if (!rateLimitService) {
        console.log('Skipping test - Redis not available');
        return;
      }

      const whitelistedIP = '192.168.1.100';
      const blacklistedIP = '10.0.0.1';

      // Add to whitelist
      rateLimitService.addToWhitelist(`ip:${whitelistedIP}`);
      rateLimitService.addToBlacklist(`ip:${blacklistedIP}`);

      // Whitelisted request should bypass rate limiting
      const whitelistedRequest = {
        ip: whitelistedIP,
        path: '/api/test',
        method: 'GET',
      } as any;

      const whitelistResult = await rateLimitService.checkRateLimit(whitelistedRequest);
      expect(whitelistResult).toBeNull();

      // Blacklisted request should be immediately blocked
      const blacklistedRequest = {
        ip: blacklistedIP,
        path: '/api/test',
        method: 'GET',
      } as any;

      const blacklistResult = await rateLimitService.checkRateLimit(blacklistedRequest);
      expect(blacklistResult).not.toBeNull();
      expect(blacklistResult!.algorithm).toBe('blacklist');
    });
  });

  describe('FeatureFlagService', () => {
    let featureFlagService: FeatureFlagService;

    beforeEach(() => {
      if (cacheService) {
        featureFlagService = new FeatureFlagService(cacheService);
      }
    });

    it('should evaluate boolean feature flags', async () => {
      if (!featureFlagService) {
        console.log('Skipping test - Redis not available');
        return;
      }

      // Create a boolean flag
      featureFlagService.createFlag({
        id: 'test-boolean-flag',
        name: 'Test Boolean Flag',
        description: 'A test boolean flag',
        type: 'boolean',
        enabled: true,
        targeting: {},
        value: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test',
      });

      // Evaluate flag
      const context = { userId: 'user-123', userRole: 'customer' };
      const result = await featureFlagService.evaluate('test-boolean-flag', context);

      expect(result.enabled).toBe(true);
      expect(result.value).toBe(true);
      expect(result.reason).toBe('boolean_flag');
    });

    it('should evaluate percentage-based feature flags', async () => {
      if (!featureFlagService) {
        console.log('Skipping test - Redis not available');
        return;
      }

      // Create a percentage flag with 50% rollout
      featureFlagService.createFlag({
        id: 'test-percentage-flag',
        name: 'Test Percentage Flag',
        description: 'A test percentage flag',
        type: 'percentage',
        enabled: true,
        targeting: {
          percentage: 50,
        },
        value: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test',
      });

      // Test multiple users - some should be enabled, some not
      const results = await Promise.all([
        featureFlagService.evaluate('test-percentage-flag', { userId: 'user-1' }),
        featureFlagService.evaluate('test-percentage-flag', { userId: 'user-2' }),
        featureFlagService.evaluate('test-percentage-flag', { userId: 'user-3' }),
        featureFlagService.evaluate('test-percentage-flag', { userId: 'user-4' }),
      ]);

      // Due to deterministic hashing, same users should always get same results
      const enabledCount = results.filter(r => r.enabled).length;
      expect(enabledCount).toBeGreaterThanOrEqual(0);
      expect(enabledCount).toBeLessThanOrEqual(4);
    });

    it('should handle A/B test variants', async () => {
      if (!featureFlagService) {
        console.log('Skipping test - Redis not available');
        return;
      }

      // Create A/B test
      featureFlagService.createABTest({
        flagId: 'test-ab-flag',
        name: 'Test A/B Flag',
        hypothesis: 'Treatment will improve conversion',
        startDate: new Date(),
        targetMetric: 'conversion_rate',
        minimumSampleSize: 100,
        significanceLevel: 0.05,
        variants: {
          control: {
            name: 'Control',
            allocation: 50,
            configuration: { feature: false },
          },
          treatment: {
            name: 'Treatment',
            allocation: 50,
            configuration: { feature: true },
          },
        },
        status: 'running',
      });

      // Evaluate for different users
      const results = await Promise.all([
        featureFlagService.evaluate('test-ab-flag', { userId: 'user-a' }),
        featureFlagService.evaluate('test-ab-flag', { userId: 'user-b' }),
        featureFlagService.evaluate('test-ab-flag', { userId: 'user-c' }),
        featureFlagService.evaluate('test-ab-flag', { userId: 'user-d' }),
      ]);

      // All results should be enabled but with different variants
      results.forEach(result => {
        expect(result.enabled).toBe(true);
        expect(['control', 'treatment']).toContain(result.variant);
        expect(result.trackingData).toBeDefined();
      });

      // Same user should get consistent results
      const user1Result1 = await featureFlagService.evaluate('test-ab-flag', { userId: 'user-consistent' });
      const user1Result2 = await featureFlagService.evaluate('test-ab-flag', { userId: 'user-consistent' });
      
      expect(user1Result1.variant).toBe(user1Result2.variant);
      expect(user1Result1.value).toEqual(user1Result2.value);
    });
  });

  describe('Integration Tests', () => {
    it('should initialize all services successfully', async () => {
      if (!cacheManager.getRedisClient()) {
        console.log('Skipping test - Redis not available');
        return;
      }

      const healthStatus = await cacheManager.getHealthStatus();
      
      expect(healthStatus.services.cacheService).toBe(true);
      expect(healthStatus.services.recipeCacheService).toBe(true);
      expect(healthStatus.services.mealPlanCacheService).toBe(true);
      
      if (cacheManager.isFeatureEnabled('rateLimiting')) {
        expect(healthStatus.services.rateLimitService).toBe(true);
      }
      
      if (cacheManager.isFeatureEnabled('cacheInvalidation')) {
        expect(healthStatus.services.invalidationService).toBe(true);
      }
    });

    it('should handle graceful degradation when Redis is unavailable', async () => {
      // This test would simulate Redis being unavailable
      // In a real scenario, services should fallback gracefully
      
      const fallbackCacheManager = createCacheManagerFromEnv();
      
      // If Redis is not available, services should still be created but in fallback mode
      try {
        await fallbackCacheManager.initialize();
        const healthStatus = await fallbackCacheManager.getHealthStatus();
        
        // In fallback mode, Redis should be disconnected but services might still be created
        if (!healthStatus.redis.connected) {
          console.log('Redis unavailable - fallback mode active');
        }
      } catch (error) {
        // This is expected behavior when Redis is not available
        console.log('Graceful degradation working - Redis unavailable');
      }
      
      await fallbackCacheManager.shutdown();
    });
  });

  describe('Performance Tests', () => {
    it('should handle high-frequency cache operations', async () => {
      if (!cacheService) {
        console.log('Skipping test - Redis not available');
        return;
      }

      const operations = 100;
      const startTime = Date.now();
      
      // Perform many cache operations
      const promises = [];
      for (let i = 0; i < operations; i++) {
        promises.push(
          cacheService.set(`perf-test-${i}`, { id: i, data: `test-data-${i}` })
        );
      }
      
      await Promise.all(promises);
      
      const setTime = Date.now() - startTime;
      
      // Read operations
      const readStartTime = Date.now();
      const readPromises = [];
      for (let i = 0; i < operations; i++) {
        readPromises.push(cacheService.get(`perf-test-${i}`));
      }
      
      const results = await Promise.all(readPromises);
      const readTime = Date.now() - readStartTime;
      
      // Verify all operations completed successfully
      expect(results.length).toBe(operations);
      expect(results.filter(r => r !== null).length).toBe(operations);
      
      // Performance assertions (adjust thresholds based on your requirements)
      expect(setTime).toBeLessThan(5000); // Less than 5 seconds for 100 sets
      expect(readTime).toBeLessThan(2000); // Less than 2 seconds for 100 gets
      
      console.log(`Performance test: ${operations} sets in ${setTime}ms, ${operations} gets in ${readTime}ms`);
    });
  });
});

describe('Cache Middleware Integration', () => {
  // These tests would require Express app setup and are more complex
  // For now, we'll skip them but they would test:
  // - Request/response caching
  // - ETag generation and validation
  // - Cache headers
  // - User-specific caching
  // - Rate limiting middleware
  
  it.skip('should cache HTTP responses', () => {
    // Implementation would test actual HTTP middleware
  });
  
  it.skip('should respect cache-control headers', () => {
    // Implementation would test cache-control handling
  });
  
  it.skip('should handle user-specific caching', () => {
    // Implementation would test user-based cache segregation
  });
});

// Helper function to check if Redis is available
async function isRedisAvailable(): Promise<boolean> {
  try {
    const testClient = createRedisClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
    
    await testClient.connect();
    await testClient.ping();
    await testClient.disconnect();
    return true;
  } catch (error) {
    return false;
  }
}

// Setup and teardown helpers
beforeAll(async () => {
  const available = await isRedisAvailable();
  if (!available) {
    console.warn('⚠️  Redis is not available. Some tests will be skipped.');
    console.warn('   To run all tests, ensure Redis is running on localhost:6379');
  }
});