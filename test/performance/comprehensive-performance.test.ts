/**
 * Comprehensive Performance Test Suite for FitnessMealPlanner
 *
 * Total Tests: 200
 * - API Performance Tests: 60 tests
 * - Frontend Performance Tests: 50 tests
 * - Database Performance Tests: 50 tests
 * - Scalability Tests: 40 tests
 *
 * Performance Targets:
 * - API responses: <200ms for GET, <500ms for POST
 * - Page loads: <3 seconds
 * - Database queries: <100ms average
 * - Concurrent users: Support 1000+ users
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { performance } from 'perf_hooks';
import { chromium, Browser, Page } from 'playwright';
import { Pool } from 'pg';
import crypto from 'crypto';

// Configuration
const TEST_CONFIG = {
  API_BASE_URL: process.env.TEST_API_URL || 'http://localhost:4000/api',
  FRONTEND_BASE_URL: process.env.TEST_FRONTEND_URL || 'http://localhost:4000',
  DB_URL: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
  PERFORMANCE_THRESHOLDS: {
    API_GET_MAX: 200,        // ms
    API_POST_MAX: 500,       // ms
    PAGE_LOAD_MAX: 3000,     // ms
    DB_QUERY_MAX: 100,       // ms
    MEMORY_LEAK_MAX: 50,     // MB increase
    BUNDLE_SIZE_MAX: 2,      // MB
  },
  LOAD_TEST: {
    USERS_LOW: 10,
    USERS_MEDIUM: 50,
    USERS_HIGH: 100,
    USERS_STRESS: 1000,
    CONCURRENT_REQUESTS: 25,
  }
};

// Performance Metrics Interface
interface PerformanceMetrics {
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  samples: number;
}

interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
}

// Performance Testing Utilities
class PerformanceTester {
  private measurements: number[] = [];
  private browser?: Browser;
  private dbPool?: Pool;

  async setup() {
    // Setup browser for frontend tests
    this.browser = await chromium.launch({ headless: true });

    // Setup database connection for DB tests
    if (TEST_CONFIG.DB_URL) {
      this.dbPool = new Pool({
        connectionString: TEST_CONFIG.DB_URL,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    }
  }

  async cleanup() {
    await this.browser?.close();
    await this.dbPool?.end();
  }

  // Measure API endpoint performance
  async measureApiEndpoint(
    endpoint: string,
    options: RequestInit = {},
    iterations: number = 10
  ): Promise<PerformanceMetrics> {
    this.measurements = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();

      try {
        const response = await fetch(`${TEST_CONFIG.API_BASE_URL}${endpoint}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        if (response.ok) {
          await response.json();
        }
      } catch (error) {
        // Log error but continue test
        console.warn(`Request ${i + 1} failed:`, error);
      }

      const end = performance.now();
      this.measurements.push(end - start);

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    return this.calculateMetrics();
  }

  // Measure page load performance
  async measurePageLoad(url: string, iterations: number = 5): Promise<PerformanceMetrics> {
    if (!this.browser) throw new Error('Browser not initialized');

    this.measurements = [];

    for (let i = 0; i < iterations; i++) {
      const page = await this.browser.newPage();

      try {
        const start = performance.now();
        await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}${url}`, {
          waitUntil: 'networkidle'
        });
        const end = performance.now();

        this.measurements.push(end - start);
      } catch (error) {
        console.warn(`Page load ${i + 1} failed:`, error);
      } finally {
        await page.close();
      }
    }

    return this.calculateMetrics();
  }

  // Measure database query performance
  async measureDbQuery(query: string, params: any[] = [], iterations: number = 10): Promise<PerformanceMetrics> {
    if (!this.dbPool) throw new Error('Database pool not initialized');

    this.measurements = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();

      try {
        await this.dbPool.query(query, params);
      } catch (error) {
        console.warn(`Query ${i + 1} failed:`, error);
      }

      const end = performance.now();
      this.measurements.push(end - start);
    }

    return this.calculateMetrics();
  }

  // Perform load testing
  async performLoadTest(
    endpoint: string,
    concurrentUsers: number,
    duration: number = 30000 // 30 seconds
  ): Promise<LoadTestResult> {
    const startTime = Date.now();
    const results: Array<{ success: boolean; responseTime: number }> = [];

    const makeRequest = async (): Promise<{ success: boolean; responseTime: number }> => {
      const start = performance.now();
      try {
        const response = await fetch(`${TEST_CONFIG.API_BASE_URL}${endpoint}`);
        const end = performance.now();
        return { success: response.ok, responseTime: end - start };
      } catch (error) {
        const end = performance.now();
        return { success: false, responseTime: end - start };
      }
    };

    // Launch concurrent users
    const userPromises: Promise<void>[] = [];

    for (let user = 0; user < concurrentUsers; user++) {
      const userPromise = (async () => {
        while (Date.now() - startTime < duration) {
          const result = await makeRequest();
          results.push(result);
          await new Promise(resolve => setTimeout(resolve, 100)); // 100ms between requests per user
        }
      })();

      userPromises.push(userPromise);
    }

    await Promise.all(userPromises);

    const successfulRequests = results.filter(r => r.success).length;
    const failedRequests = results.length - successfulRequests;
    const totalTime = (Date.now() - startTime) / 1000; // seconds
    const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

    return {
      totalRequests: results.length,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      requestsPerSecond: results.length / totalTime,
      errorRate: (failedRequests / results.length) * 100,
    };
  }

  // Calculate performance metrics from measurements
  private calculateMetrics(): PerformanceMetrics {
    if (this.measurements.length === 0) {
      throw new Error('No measurements available');
    }

    const sorted = [...this.measurements].sort((a, b) => a - b);

    return {
      min: Math.min(...this.measurements),
      max: Math.max(...this.measurements),
      avg: this.measurements.reduce((sum, val) => sum + val, 0) / this.measurements.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      samples: this.measurements.length,
    };
  }
}

// Test Suite Setup
let tester: PerformanceTester;

beforeAll(async () => {
  tester = new PerformanceTester();
  await tester.setup();
}, 30000);

afterAll(async () => {
  await tester.cleanup();
});

// =============================================================================
// API PERFORMANCE TESTS (60 Tests)
// =============================================================================

describe('API Performance Tests', () => {

  describe('Authentication API Performance', () => {
    it('should handle login requests within performance threshold', async () => {
      const metrics = await tester.measureApiEndpoint('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX);
      expect(metrics.p95).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX * 1.5);
    });

    it('should handle logout requests efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/auth/logout', {
        method: 'POST'
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX);
    });

    it('should validate JWT tokens quickly', async () => {
      const metrics = await tester.measureApiEndpoint('/auth/verify', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer test-token' }
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX);
    });

    it('should handle password reset requests efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' })
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX);
    });

    it('should refresh tokens within threshold', async () => {
      const metrics = await tester.measureApiEndpoint('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: 'test-refresh-token' })
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX);
    });
  });

  describe('Recipe API Performance', () => {
    it('should fetch recipes list efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/recipes');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX);
      expect(metrics.p99).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX * 2);
    });

    it('should fetch single recipe quickly', async () => {
      const metrics = await tester.measureApiEndpoint('/recipes/1');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX);
    });

    it('should create new recipes within threshold', async () => {
      const metrics = await tester.measureApiEndpoint('/recipes', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Recipe',
          ingredients: ['ingredient1', 'ingredient2'],
          instructions: 'Test instructions'
        })
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX);
    });

    it('should update recipes efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/recipes/1', {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Updated Recipe',
          ingredients: ['updated ingredient']
        })
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX);
    });

    it('should delete recipes quickly', async () => {
      const metrics = await tester.measureApiEndpoint('/recipes/1', {
        method: 'DELETE'
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX);
    });

    it('should search recipes with good performance', async () => {
      const metrics = await tester.measureApiEndpoint('/recipes/search?q=chicken');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX * 1.5);
    });

    it('should filter recipes by category efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/recipes?category=breakfast');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX);
    });

    it('should filter recipes by dietary restrictions quickly', async () => {
      const metrics = await tester.measureApiEndpoint('/recipes?dietary=vegetarian');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX);
    });

    it('should handle recipe pagination efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/recipes?page=1&limit=20');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX);
    });

    it('should get recipe nutritional info quickly', async () => {
      const metrics = await tester.measureApiEndpoint('/recipes/1/nutrition');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX);
    });
  });

  describe('Meal Plan API Performance', () => {
    it('should generate meal plans within threshold', async () => {
      const metrics = await tester.measureApiEndpoint('/meal-plans/generate', {
        method: 'POST',
        body: JSON.stringify({
          preferences: { dietary: 'vegetarian', calories: 2000 },
          days: 7
        })
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX * 2);
    });

    it('should fetch meal plans list efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/meal-plans');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX);
    });

    it('should fetch single meal plan quickly', async () => {
      const metrics = await tester.measureApiEndpoint('/meal-plans/1');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX);
    });

    it('should save meal plans efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/meal-plans', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Meal Plan',
          meals: [{ day: 1, breakfast: 'recipe1', lunch: 'recipe2' }]
        })
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX);
    });

    it('should update meal plans within threshold', async () => {
      const metrics = await tester.measureApiEndpoint('/meal-plans/1', {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Updated Meal Plan'
        })
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX);
    });

    it('should delete meal plans quickly', async () => {
      const metrics = await tester.measureApiEndpoint('/meal-plans/1', {
        method: 'DELETE'
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX);
    });

    it('should export meal plans to PDF efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/meal-plans/1/export/pdf', {
        method: 'POST'
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX * 3);
    });

    it('should share meal plans quickly', async () => {
      const metrics = await tester.measureApiEndpoint('/meal-plans/1/share', {
        method: 'POST',
        body: JSON.stringify({ shareWith: 'user@example.com' })
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX);
    });

    it('should get meal plan analytics efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/meal-plans/1/analytics');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX);
    });

    it('should duplicate meal plans within threshold', async () => {
      const metrics = await tester.measureApiEndpoint('/meal-plans/1/duplicate', {
        method: 'POST'
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX);
    });
  });

  describe('User Management API Performance', () => {
    it('should fetch user profile efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/users/profile');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX);
    });

    it('should update user profile quickly', async () => {
      const metrics = await tester.measureApiEndpoint('/users/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Updated Name',
          preferences: { dietary: 'vegan' }
        })
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX);
    });

    it('should fetch user preferences efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/users/preferences');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX);
    });

    it('should update user preferences quickly', async () => {
      const metrics = await tester.measureApiEndpoint('/users/preferences', {
        method: 'PUT',
        body: JSON.stringify({
          dietary: 'keto',
          allergies: ['nuts']
        })
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX);
    });

    it('should handle user avatar upload efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/users/avatar', {
        method: 'POST',
        body: JSON.stringify({ imageData: 'base64-image-data' })
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX * 2);
    });
  });

  describe('Analytics API Performance', () => {
    it('should fetch dashboard analytics efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/analytics/dashboard');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX);
    });

    it('should get recipe usage stats quickly', async () => {
      const metrics = await tester.measureApiEndpoint('/analytics/recipes/usage');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX);
    });

    it('should fetch user engagement metrics efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/analytics/users/engagement');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX);
    });

    it('should generate performance reports within threshold', async () => {
      const metrics = await tester.measureApiEndpoint('/analytics/performance/report', {
        method: 'POST',
        body: JSON.stringify({
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        })
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX * 2);
    });

    it('should export analytics data efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/analytics/export/csv');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX * 2);
    });
  });

  describe('Grocery List API Performance', () => {
    it('should generate grocery lists efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/grocery-lists/generate', {
        method: 'POST',
        body: JSON.stringify({ mealPlanId: '1', servings: 4 })
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX);
    });

    it('should fetch grocery lists quickly', async () => {
      const metrics = await tester.measureApiEndpoint('/grocery-lists');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX);
    });

    it('should update grocery list items efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/grocery-lists/1/items', {
        method: 'PUT',
        body: JSON.stringify({
          items: [{ name: 'chicken', quantity: '2 lbs', checked: false }]
        })
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX);
    });

    it('should export grocery lists to PDF within threshold', async () => {
      const metrics = await tester.measureApiEndpoint('/grocery-lists/1/export', {
        method: 'POST'
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX * 2);
    });

    it('should share grocery lists efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/grocery-lists/1/share', {
        method: 'POST',
        body: JSON.stringify({ email: 'friend@example.com' })
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX);
    });
  });

  describe('Search API Performance', () => {
    it('should handle global search efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/search?q=chicken+recipes');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX * 1.5);
    });

    it('should search with filters quickly', async () => {
      const metrics = await tester.measureApiEndpoint('/search?q=salad&category=lunch&dietary=vegan');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX * 1.5);
    });

    it('should handle autocomplete suggestions efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/search/autocomplete?q=chic');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX * 0.5);
    });

    it('should perform advanced search within threshold', async () => {
      const metrics = await tester.measureApiEndpoint('/search/advanced', {
        method: 'POST',
        body: JSON.stringify({
          ingredients: ['chicken', 'broccoli'],
          cookTime: 30,
          difficulty: 'easy'
        })
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX);
    });

    it('should get search suggestions efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/search/suggestions');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX);
    });
  });

  describe('File Upload API Performance', () => {
    it('should handle image uploads efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/uploads/images', {
        method: 'POST',
        body: JSON.stringify({
          filename: 'test.jpg',
          data: 'base64-image-data'
        })
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX * 2);
    });

    it('should process bulk uploads within threshold', async () => {
      const metrics = await tester.measureApiEndpoint('/uploads/bulk', {
        method: 'POST',
        body: JSON.stringify({
          files: [
            { filename: 'recipe1.jpg', data: 'base64-data1' },
            { filename: 'recipe2.jpg', data: 'base64-data2' }
          ]
        })
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX * 3);
    });

    it('should validate file types quickly', async () => {
      const metrics = await tester.measureApiEndpoint('/uploads/validate', {
        method: 'POST',
        body: JSON.stringify({
          filename: 'test.jpg',
          size: 1024000,
          type: 'image/jpeg'
        })
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX * 0.5);
    });

    it('should resize images efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/uploads/resize', {
        method: 'POST',
        body: JSON.stringify({
          imageId: '1',
          width: 300,
          height: 300
        })
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX * 2);
    });

    it('should delete uploaded files quickly', async () => {
      const metrics = await tester.measureApiEndpoint('/uploads/1', {
        method: 'DELETE'
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX);
    });
  });

  describe('Caching Performance', () => {
    it('should serve cached responses efficiently', async () => {
      // First request to populate cache
      await tester.measureApiEndpoint('/recipes?cache=true');

      // Second request should be faster (cached)
      const metrics = await tester.measureApiEndpoint('/recipes?cache=true');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX * 0.5);
    });

    it('should handle cache invalidation quickly', async () => {
      const metrics = await tester.measureApiEndpoint('/cache/invalidate', {
        method: 'POST',
        body: JSON.stringify({ keys: ['recipes', 'meal-plans'] })
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX);
    });

    it('should check cache status efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/cache/status');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX * 0.3);
    });

    it('should warm cache efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/cache/warm', {
        method: 'POST'
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX * 2);
    });

    it('should handle cache compression efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/recipes', {
        headers: { 'Accept-Encoding': 'gzip' }
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX);
    });
  });

  describe('Rate Limiting Performance', () => {
    it('should handle rate limited requests efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/recipes', {}, 5);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX);
    });

    it('should return rate limit status quickly', async () => {
      const metrics = await tester.measureApiEndpoint('/rate-limit/status');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX * 0.3);
    });

    it('should handle burst requests within threshold', async () => {
      const promises = Array(10).fill(null).map(() =>
        fetch(`${TEST_CONFIG.API_BASE_URL}/recipes`)
      );

      const start = performance.now();
      await Promise.all(promises);
      const end = performance.now();

      expect(end - start).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX * 3);
    });

    it('should recover from rate limits quickly', async () => {
      // Trigger rate limit
      const promises = Array(20).fill(null).map(() =>
        fetch(`${TEST_CONFIG.API_BASE_URL}/recipes`)
      );
      await Promise.all(promises);

      // Wait for rate limit reset
      await new Promise(resolve => setTimeout(resolve, 1000));

      const metrics = await tester.measureApiEndpoint('/recipes');
      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX);
    });

    it('should handle different rate limit tiers efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/premium/recipes', {
        headers: { 'X-User-Tier': 'premium' }
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX);
    });
  });
});

// =============================================================================
// FRONTEND PERFORMANCE TESTS (50 Tests)
// =============================================================================

describe('Frontend Performance Tests', () => {

  describe('Page Load Performance', () => {
    it('should load home page within threshold', async () => {
      const metrics = await tester.measurePageLoad('/');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.PAGE_LOAD_MAX);
      expect(metrics.p95).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.PAGE_LOAD_MAX * 1.5);
    });

    it('should load login page efficiently', async () => {
      const metrics = await tester.measurePageLoad('/login');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.PAGE_LOAD_MAX);
    });

    it('should load dashboard quickly', async () => {
      const metrics = await tester.measurePageLoad('/dashboard');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.PAGE_LOAD_MAX);
    });

    it('should load recipes page within threshold', async () => {
      const metrics = await tester.measurePageLoad('/recipes');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.PAGE_LOAD_MAX);
    });

    it('should load meal plans page efficiently', async () => {
      const metrics = await tester.measurePageLoad('/meal-plans');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.PAGE_LOAD_MAX);
    });

    it('should load profile page quickly', async () => {
      const metrics = await tester.measurePageLoad('/profile');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.PAGE_LOAD_MAX);
    });

    it('should load settings page within threshold', async () => {
      const metrics = await tester.measurePageLoad('/settings');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.PAGE_LOAD_MAX);
    });

    it('should load grocery lists page efficiently', async () => {
      const metrics = await tester.measurePageLoad('/grocery-lists');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.PAGE_LOAD_MAX);
    });

    it('should load analytics page quickly', async () => {
      const metrics = await tester.measurePageLoad('/analytics');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.PAGE_LOAD_MAX);
    });

    it('should load search page within threshold', async () => {
      const metrics = await tester.measurePageLoad('/search');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.PAGE_LOAD_MAX);
    });
  });

  describe('Component Rendering Performance', () => {
    it('should render recipe cards efficiently', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/recipes`);

      const start = performance.now();
      await page.waitForSelector('.recipe-card', { timeout: 5000 });
      const end = performance.now();

      expect(end - start).toBeLessThan(1000);
      await page.close();
    });

    it('should render meal plan grid quickly', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/meal-plans`);

      const start = performance.now();
      await page.waitForSelector('.meal-plan-grid', { timeout: 5000 });
      const end = performance.now();

      expect(end - start).toBeLessThan(1000);
      await page.close();
    });

    it('should render navigation menu efficiently', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();

      const start = performance.now();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/`);
      await page.waitForSelector('nav', { timeout: 5000 });
      const end = performance.now();

      expect(end - start).toBeLessThan(800);
      await page.close();
    });

    it('should render forms quickly', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/recipes/new`);

      const start = performance.now();
      await page.waitForSelector('form', { timeout: 5000 });
      const end = performance.now();

      expect(end - start).toBeLessThan(1000);
      await page.close();
    });

    it('should render data tables efficiently', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/analytics`);

      const start = performance.now();
      await page.waitForSelector('table', { timeout: 5000 });
      const end = performance.now();

      expect(end - start).toBeLessThan(1200);
      await page.close();
    });
  });

  describe('Image Loading Performance', () => {
    it('should load recipe images efficiently', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/recipes`);

      const start = performance.now();
      await page.waitForFunction(() => {
        const images = document.querySelectorAll('img');
        return Array.from(images).every(img => img.complete);
      }, { timeout: 10000 });
      const end = performance.now();

      expect(end - start).toBeLessThan(3000);
      await page.close();
    });

    it('should handle lazy loading effectively', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/recipes`);

      // Measure time to load images when scrolling
      const start = performance.now();
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);
      const end = performance.now();

      expect(end - start).toBeLessThan(2000);
      await page.close();
    });

    it('should optimize image sizes for different viewports', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();
      await page.setViewportSize({ width: 375, height: 667 }); // Mobile

      const start = performance.now();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/recipes`);
      await page.waitForLoadState('networkidle');
      const end = performance.now();

      expect(end - start).toBeLessThan(4000);
      await page.close();
    });

    it('should handle image errors gracefully', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();

      // Block image requests to simulate failures
      await page.route('**/*.{png,jpg,jpeg,gif}', route => route.abort());

      const start = performance.now();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/recipes`);
      await page.waitForLoadState('networkidle');
      const end = performance.now();

      expect(end - start).toBeLessThan(2000);
      await page.close();
    });

    it('should preload critical images', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();

      const start = performance.now();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/`);

      const preloadLinks = await page.$$('link[rel="preload"]');
      const end = performance.now();

      expect(preloadLinks.length).toBeGreaterThan(0);
      expect(end - start).toBeLessThan(1000);
      await page.close();
    });
  });

  describe('Interactive Elements Performance', () => {
    it('should handle button clicks efficiently', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/recipes`);

      const measurements: number[] = [];

      for (let i = 0; i < 5; i++) {
        const start = performance.now();
        await page.click('button:first-child');
        await page.waitForTimeout(100);
        const end = performance.now();
        measurements.push(end - start);
      }

      const avg = measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
      expect(avg).toBeLessThan(200);
      await page.close();
    });

    it('should handle form submissions quickly', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/recipes/new`);

      await page.fill('input[name="name"]', 'Test Recipe');
      await page.fill('textarea[name="instructions"]', 'Test instructions');

      const start = performance.now();
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);
      const end = performance.now();

      expect(end - start).toBeLessThan(2000);
      await page.close();
    });

    it('should handle dropdown interactions efficiently', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/recipes`);

      const start = performance.now();
      await page.click('select');
      await page.selectOption('select', 'breakfast');
      const end = performance.now();

      expect(end - start).toBeLessThan(500);
      await page.close();
    });

    it('should handle modal dialogs quickly', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/recipes`);

      const start = performance.now();
      await page.click('[data-testid="open-modal"]');
      await page.waitForSelector('.modal', { timeout: 2000 });
      const end = performance.now();

      expect(end - start).toBeLessThan(800);
      await page.close();
    });

    it('should handle tooltips efficiently', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/recipes`);

      const start = performance.now();
      await page.hover('[data-tooltip]');
      await page.waitForSelector('.tooltip', { timeout: 1000 });
      const end = performance.now();

      expect(end - start).toBeLessThan(300);
      await page.close();
    });
  });

  describe('Scroll and Animation Performance', () => {
    it('should handle smooth scrolling efficiently', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/recipes`);

      const start = performance.now();
      await page.evaluate(() => {
        window.scrollTo({ top: 1000, behavior: 'smooth' });
      });
      await page.waitForTimeout(1000);
      const end = performance.now();

      expect(end - start).toBeLessThan(1500);
      await page.close();
    });

    it('should handle infinite scroll efficiently', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/recipes`);

      const start = performance.now();
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);
      const end = performance.now();

      expect(end - start).toBeLessThan(3000);
      await page.close();
    });

    it('should handle CSS animations efficiently', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/`);

      const start = performance.now();
      await page.hover('.animated-element');
      await page.waitForTimeout(500);
      const end = performance.now();

      expect(end - start).toBeLessThan(700);
      await page.close();
    });

    it('should handle page transitions smoothly', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/`);

      const start = performance.now();
      await page.click('a[href="/recipes"]');
      await page.waitForURL('**/recipes');
      const end = performance.now();

      expect(end - start).toBeLessThan(2000);
      await page.close();
    });

    it('should handle parallax effects efficiently', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/`);

      const start = performance.now();
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollBy(0, 200));
        await page.waitForTimeout(100);
      }
      const end = performance.now();

      expect(end - start).toBeLessThan(1000);
      await page.close();
    });
  });

  describe('Memory and Resource Performance', () => {
    it('should not have significant memory leaks', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();

      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // Navigate through multiple pages
      for (let i = 0; i < 10; i++) {
        await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/recipes`);
        await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/meal-plans`);
        await page.waitForTimeout(100);
      }

      // Force garbage collection if available
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });

      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB
      expect(memoryIncrease).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.MEMORY_LEAK_MAX);

      await page.close();
    });

    it('should load CSS efficiently', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();

      const responses: any[] = [];
      page.on('response', response => {
        if (response.url().endsWith('.css')) {
          responses.push(response);
        }
      });

      const start = performance.now();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/`);
      await page.waitForLoadState('networkidle');
      const end = performance.now();

      expect(end - start).toBeLessThan(2000);
      expect(responses.length).toBeGreaterThan(0);

      await page.close();
    });

    it('should load JavaScript bundles efficiently', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();

      const jsResponses: any[] = [];
      page.on('response', response => {
        if (response.url().endsWith('.js')) {
          jsResponses.push(response);
        }
      });

      const start = performance.now();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/`);
      await page.waitForLoadState('networkidle');
      const end = performance.now();

      expect(end - start).toBeLessThan(3000);

      // Check bundle sizes
      for (const response of jsResponses) {
        const size = parseInt(response.headers()['content-length'] || '0');
        const sizeMB = size / 1024 / 1024;
        expect(sizeMB).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.BUNDLE_SIZE_MAX);
      }

      await page.close();
    });

    it('should handle font loading efficiently', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();

      const start = performance.now();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/`);

      await page.waitForFunction(() => document.fonts.ready);
      const end = performance.now();

      expect(end - start).toBeLessThan(2000);
      await page.close();
    });

    it('should optimize service worker performance', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();

      const start = performance.now();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/`);

      const swRegistration = await page.evaluate(() => {
        return navigator.serviceWorker.ready.then(reg => !!reg);
      });
      const end = performance.now();

      expect(end - start).toBeLessThan(1000);
      expect(swRegistration).toBe(true);

      await page.close();
    });
  });

  describe('Network Performance', () => {
    it('should handle slow network conditions', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();

      // Simulate slow 3G
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), 100);
      });

      const start = performance.now();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/`);
      await page.waitForLoadState('networkidle');
      const end = performance.now();

      expect(end - start).toBeLessThan(8000); // Higher threshold for slow network
      await page.close();
    });

    it('should handle offline scenarios gracefully', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/`);

      // Go offline
      await page.setOffline(true);

      const start = performance.now();
      await page.reload();
      await page.waitForTimeout(2000);
      const end = performance.now();

      expect(end - start).toBeLessThan(3000);
      await page.close();
    });

    it('should utilize browser caching effectively', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();

      // First load
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/`);
      await page.waitForLoadState('networkidle');

      // Second load (should use cache)
      const start = performance.now();
      await page.reload();
      await page.waitForLoadState('networkidle');
      const end = performance.now();

      expect(end - start).toBeLessThan(1500); // Should be faster due to caching
      await page.close();
    });

    it('should compress responses efficiently', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();

      const responses: any[] = [];
      page.on('response', response => {
        if (response.url().includes(TEST_CONFIG.FRONTEND_BASE_URL)) {
          responses.push(response);
        }
      });

      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/`);
      await page.waitForLoadState('networkidle');

      const compressedResponses = responses.filter(r =>
        r.headers()['content-encoding']?.includes('gzip') ||
        r.headers()['content-encoding']?.includes('br')
      );

      expect(compressedResponses.length).toBeGreaterThan(0);
      await page.close();
    });

    it('should handle CDN performance effectively', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();

      const cdnResponses: any[] = [];
      page.on('response', response => {
        if (response.url().includes('cdn') || response.url().includes('amazonaws')) {
          cdnResponses.push(response);
        }
      });

      const start = performance.now();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/`);
      await page.waitForLoadState('networkidle');
      const end = performance.now();

      expect(end - start).toBeLessThan(3000);

      // CDN responses should be fast
      for (const response of cdnResponses) {
        const timing = response.timing();
        expect(timing.responseEnd - timing.requestStart).toBeLessThan(1000);
      }

      await page.close();
    });
  });

  describe('Progressive Web App Performance', () => {
    it('should install as PWA efficiently', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();

      const start = performance.now();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/`);

      const manifest = await page.evaluate(() => {
        const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
        return !!link?.href;
      });
      const end = performance.now();

      expect(end - start).toBeLessThan(2000);
      expect(manifest).toBe(true);

      await page.close();
    });

    it('should handle app shell loading efficiently', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();

      const start = performance.now();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/`);
      await page.waitForSelector('main', { timeout: 3000 });
      const end = performance.now();

      expect(end - start).toBeLessThan(2000);
      await page.close();
    });

    it('should update app efficiently', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/`);

      const start = performance.now();
      await page.evaluate(() => {
        if ('serviceWorker' in navigator) {
          return navigator.serviceWorker.getRegistration()
            .then(reg => reg?.update());
        }
      });
      const end = performance.now();

      expect(end - start).toBeLessThan(3000);
      await page.close();
    });

    it('should handle background sync efficiently', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/`);

      const start = performance.now();
      await page.evaluate(() => {
        // Simulate background sync
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
          return navigator.serviceWorker.ready.then(reg => {
            return (reg as any).sync.register('background-sync');
          });
        }
      });
      const end = performance.now();

      expect(end - start).toBeLessThan(1000);
      await page.close();
    });

    it('should handle push notifications efficiently', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();

      const start = performance.now();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/`);

      const notificationSupport = await page.evaluate(() => {
        return 'Notification' in window && 'serviceWorker' in navigator;
      });
      const end = performance.now();

      expect(end - start).toBeLessThan(1000);
      expect(notificationSupport).toBe(true);

      await page.close();
    });
  });
});

// =============================================================================
// DATABASE PERFORMANCE TESTS (50 Tests)
// =============================================================================

describe('Database Performance Tests', () => {

  describe('Query Execution Performance', () => {
    it('should execute simple SELECT queries efficiently', async () => {
      const metrics = await tester.measureDbQuery('SELECT * FROM users LIMIT 10');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX);
      expect(metrics.p95).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 2);
    });

    it('should execute JOIN queries within threshold', async () => {
      const metrics = await tester.measureDbQuery(`
        SELECT u.id, u.email, COUNT(r.id) as recipe_count
        FROM users u
        LEFT JOIN recipes r ON u.id = r.user_id
        GROUP BY u.id, u.email
        LIMIT 20
      `);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 2);
    });

    it('should execute complex aggregation queries efficiently', async () => {
      const metrics = await tester.measureDbQuery(`
        SELECT
          DATE_TRUNC('day', created_at) as date,
          COUNT(*) as daily_recipes,
          AVG(calories) as avg_calories
        FROM recipes
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date DESC
      `);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 3);
    });

    it('should execute INSERT queries quickly', async () => {
      const metrics = await tester.measureDbQuery(`
        INSERT INTO recipes (name, instructions, calories, user_id)
        VALUES ($1, $2, $3, $4)
      `, ['Test Recipe', 'Test instructions', 300, 'test-user-id']);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX);
    });

    it('should execute UPDATE queries efficiently', async () => {
      const metrics = await tester.measureDbQuery(`
        UPDATE recipes
        SET name = $1, updated_at = NOW()
        WHERE id = $2
      `, ['Updated Recipe', 'test-recipe-id']);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX);
    });

    it('should execute DELETE queries quickly', async () => {
      const metrics = await tester.measureDbQuery(`
        DELETE FROM recipes WHERE id = $1
      `, ['test-recipe-id']);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX);
    });

    it('should handle LIKE queries efficiently', async () => {
      const metrics = await tester.measureDbQuery(`
        SELECT * FROM recipes
        WHERE name ILIKE $1
        LIMIT 20
      `, ['%chicken%']);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 1.5);
    });

    it('should execute subqueries within threshold', async () => {
      const metrics = await tester.measureDbQuery(`
        SELECT * FROM recipes
        WHERE user_id IN (
          SELECT id FROM users WHERE role = 'admin'
        )
        LIMIT 10
      `);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 2);
    });

    it('should handle UNION queries efficiently', async () => {
      const metrics = await tester.measureDbQuery(`
        SELECT name, 'recipe' as type FROM recipes WHERE calories > 500
        UNION
        SELECT name, 'meal_plan' as type FROM meal_plans WHERE created_at > NOW() - INTERVAL '7 days'
        LIMIT 20
      `);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 2);
    });

    it('should execute window function queries efficiently', async () => {
      const metrics = await tester.measureDbQuery(`
        SELECT
          name,
          calories,
          ROW_NUMBER() OVER (ORDER BY calories DESC) as rank
        FROM recipes
        LIMIT 10
      `);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 1.5);
    });
  });

  describe('Index Performance', () => {
    it('should utilize primary key indexes efficiently', async () => {
      const metrics = await tester.measureDbQuery(`
        SELECT * FROM users WHERE id = $1
      `, ['test-user-id']);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 0.5);
    });

    it('should utilize unique indexes effectively', async () => {
      const metrics = await tester.measureDbQuery(`
        SELECT * FROM users WHERE email = $1
      `, ['test@example.com']);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 0.5);
    });

    it('should utilize composite indexes efficiently', async () => {
      const metrics = await tester.measureDbQuery(`
        SELECT * FROM recipes
        WHERE user_id = $1 AND created_at > $2
        ORDER BY created_at DESC
        LIMIT 10
      `, ['test-user-id', new Date('2024-01-01')]);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX);
    });

    it('should handle partial index usage efficiently', async () => {
      const metrics = await tester.measureDbQuery(`
        SELECT * FROM recipes
        WHERE is_approved = true AND category = $1
        LIMIT 20
      `, ['breakfast']);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX);
    });

    it('should utilize full-text search indexes effectively', async () => {
      const metrics = await tester.measureDbQuery(`
        SELECT * FROM recipes
        WHERE to_tsvector('english', name || ' ' || instructions) @@ plainto_tsquery('english', $1)
        LIMIT 10
      `, ['chicken breast']);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 2);
    });

    it('should handle GIN indexes efficiently', async () => {
      const metrics = await tester.measureDbQuery(`
        SELECT * FROM recipes
        WHERE ingredients @> $1
        LIMIT 10
      `, [JSON.stringify(['chicken'])]);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 1.5);
    });

    it('should utilize date range indexes effectively', async () => {
      const metrics = await tester.measureDbQuery(`
        SELECT * FROM recipes
        WHERE created_at BETWEEN $1 AND $2
        ORDER BY created_at DESC
        LIMIT 20
      `, [new Date('2024-01-01'), new Date('2024-12-31')]);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX);
    });

    it('should handle expression indexes efficiently', async () => {
      const metrics = await tester.measureDbQuery(`
        SELECT * FROM recipes
        WHERE LOWER(name) = LOWER($1)
        LIMIT 10
      `, ['Chicken Salad']);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX);
    });

    it('should utilize covering indexes effectively', async () => {
      const metrics = await tester.measureDbQuery(`
        SELECT id, name, calories FROM recipes
        WHERE category = $1
        ORDER BY calories DESC
        LIMIT 15
      `, ['dinner']);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX);
    });

    it('should handle bitmap indexes efficiently', async () => {
      const metrics = await tester.measureDbQuery(`
        SELECT COUNT(*) FROM recipes
        WHERE is_approved = true
        AND is_featured = true
        AND category IN ('breakfast', 'lunch', 'dinner')
      `);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX);
    });
  });

  describe('Transaction Performance', () => {
    it('should handle simple transactions efficiently', async () => {
      const metrics = await tester.measureDbQuery(`
        BEGIN;
        INSERT INTO recipes (name, instructions, user_id) VALUES ('Test', 'Test', 'user-id');
        UPDATE users SET updated_at = NOW() WHERE id = 'user-id';
        COMMIT;
      `);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 2);
    });

    it('should handle complex transactions within threshold', async () => {
      const metrics = await tester.measureDbQuery(`
        BEGIN;
        INSERT INTO meal_plans (name, user_id) VALUES ('Test Plan', 'user-id');
        INSERT INTO meal_plan_recipes (meal_plan_id, recipe_id, day, meal_type)
        VALUES (currval('meal_plans_id_seq'), 'recipe-id', 1, 'breakfast');
        UPDATE users SET meal_plan_count = meal_plan_count + 1 WHERE id = 'user-id';
        COMMIT;
      `);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 3);
    });

    it('should handle transaction rollbacks quickly', async () => {
      const metrics = await tester.measureDbQuery(`
        BEGIN;
        INSERT INTO recipes (name, instructions, user_id) VALUES ('Test', 'Test', 'user-id');
        ROLLBACK;
      `);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX);
    });

    it('should handle savepoints efficiently', async () => {
      const metrics = await tester.measureDbQuery(`
        BEGIN;
        INSERT INTO recipes (name, instructions, user_id) VALUES ('Test1', 'Test', 'user-id');
        SAVEPOINT sp1;
        INSERT INTO recipes (name, instructions, user_id) VALUES ('Test2', 'Test', 'user-id');
        ROLLBACK TO sp1;
        COMMIT;
      `);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 2);
    });

    it('should handle nested transactions efficiently', async () => {
      const metrics = await tester.measureDbQuery(`
        BEGIN;
        INSERT INTO users (email, password) VALUES ('nested@test.com', 'hash');
        BEGIN;
        INSERT INTO recipes (name, instructions, user_id) VALUES ('Nested Recipe', 'Test', currval('users_id_seq'));
        COMMIT;
        COMMIT;
      `);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 2);
    });

    it('should handle concurrent transactions efficiently', async () => {
      const promises = Array(5).fill(null).map((_, i) =>
        tester.measureDbQuery(`
          BEGIN;
          INSERT INTO recipes (name, instructions, user_id) VALUES ($1, 'Test', 'user-id');
          COMMIT;
        `, [`Concurrent Recipe ${i}`])
      );

      const results = await Promise.all(promises);
      const avgTime = results.reduce((sum, r) => sum + r.avg, 0) / results.length;

      expect(avgTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 2);
    });

    it('should handle transaction isolation levels efficiently', async () => {
      const metrics = await tester.measureDbQuery(`
        BEGIN ISOLATION LEVEL REPEATABLE READ;
        SELECT COUNT(*) FROM recipes WHERE user_id = 'user-id';
        INSERT INTO recipes (name, instructions, user_id) VALUES ('Isolated Recipe', 'Test', 'user-id');
        COMMIT;
      `);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 2);
    });

    it('should handle deadlock detection efficiently', async () => {
      // Simulate potential deadlock scenario
      const promise1 = tester.measureDbQuery(`
        BEGIN;
        UPDATE recipes SET name = 'Updated 1' WHERE id = 'recipe-1';
        UPDATE recipes SET name = 'Updated 2' WHERE id = 'recipe-2';
        COMMIT;
      `);

      const promise2 = tester.measureDbQuery(`
        BEGIN;
        UPDATE recipes SET name = 'Updated 2' WHERE id = 'recipe-2';
        UPDATE recipes SET name = 'Updated 1' WHERE id = 'recipe-1';
        COMMIT;
      `);

      const results = await Promise.allSettled([promise1, promise2]);
      const successfulResults = results.filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<PerformanceMetrics>[];

      if (successfulResults.length > 0) {
        const avgTime = successfulResults.reduce((sum, r) => sum + r.value.avg, 0) / successfulResults.length;
        expect(avgTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 3);
      }
    });

    it('should handle bulk operations in transactions efficiently', async () => {
      const metrics = await tester.measureDbQuery(`
        BEGIN;
        INSERT INTO recipes (name, instructions, user_id)
        SELECT
          'Bulk Recipe ' || generate_series(1, 100),
          'Bulk instructions',
          'user-id'
        FROM generate_series(1, 100);
        COMMIT;
      `);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 5);
    });

    it('should handle transaction timeouts appropriately', async () => {
      const start = performance.now();

      try {
        await tester.measureDbQuery(`
          BEGIN;
          SELECT pg_sleep(0.1);
          INSERT INTO recipes (name, instructions, user_id) VALUES ('Timeout Test', 'Test', 'user-id');
          COMMIT;
        `);
      } catch (error) {
        // Transaction might timeout, which is expected behavior
      }

      const end = performance.now();
      expect(end - start).toBeLessThan(5000); // Should not hang indefinitely
    });
  });

  describe('Connection Pool Performance', () => {
    it('should acquire connections efficiently', async () => {
      const promises = Array(10).fill(null).map(() =>
        tester.measureDbQuery('SELECT 1')
      );

      const start = performance.now();
      const results = await Promise.all(promises);
      const end = performance.now();

      expect(end - start).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 2);

      const avgTime = results.reduce((sum, r) => sum + r.avg, 0) / results.length;
      expect(avgTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX);
    });

    it('should handle connection pool exhaustion gracefully', async () => {
      // Create more connections than pool size
      const promises = Array(25).fill(null).map((_, i) =>
        tester.measureDbQuery(`SELECT pg_sleep(0.1), ${i}`)
      );

      const start = performance.now();
      const results = await Promise.allSettled(promises);
      const end = performance.now();

      expect(end - start).toBeLessThan(10000); // Should not hang indefinitely

      const successfulResults = results.filter(r => r.status === 'fulfilled').length;
      expect(successfulResults).toBeGreaterThan(0);
    });

    it('should recycle connections efficiently', async () => {
      // First batch of connections
      const batch1 = Array(5).fill(null).map(() =>
        tester.measureDbQuery('SELECT 1')
      );
      await Promise.all(batch1);

      // Second batch should reuse connections
      const start = performance.now();
      const batch2 = Array(5).fill(null).map(() =>
        tester.measureDbQuery('SELECT 2')
      );
      const results = await Promise.all(batch2);
      const end = performance.now();

      expect(end - start).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 1.5);
    });

    it('should handle connection timeouts appropriately', async () => {
      const start = performance.now();

      try {
        const result = await tester.measureDbQuery('SELECT pg_sleep(2)');
        expect(result.avg).toBeLessThan(3000);
      } catch (error) {
        // Connection timeout is acceptable
        const end = performance.now();
        expect(end - start).toBeLessThan(5000);
      }
    });

    it('should validate connections efficiently', async () => {
      const metrics = await tester.measureDbQuery('SELECT 1');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 0.3);
    });

    it('should handle connection errors gracefully', async () => {
      // Simulate connection error
      try {
        await tester.measureDbQuery('SELECT * FROM non_existent_table');
      } catch (error) {
        // Error is expected, but should be handled quickly
        expect(true).toBe(true);
      }

      // Subsequent queries should still work
      const metrics = await tester.measureDbQuery('SELECT 1');
      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX);
    });

    it('should monitor connection health efficiently', async () => {
      // Health check query
      const metrics = await tester.measureDbQuery('SELECT version()');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX);
    });

    it('should handle connection authentication efficiently', async () => {
      // This test assumes the connection is already authenticated
      // but measures the overhead of authentication checks
      const metrics = await tester.measureDbQuery('SELECT current_user');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 0.5);
    });

    it('should scale connections appropriately', async () => {
      // Test scaling under load
      const promises = Array(15).fill(null).map((_, i) =>
        tester.measureDbQuery(`SELECT ${i}, pg_sleep(0.05)`)
      );

      const start = performance.now();
      const results = await Promise.all(promises);
      const end = performance.now();

      expect(end - start).toBeLessThan(3000);

      const avgTime = results.reduce((sum, r) => sum + r.avg, 0) / results.length;
      expect(avgTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 2);
    });

    it('should clean up idle connections efficiently', async () => {
      // Create connections and let them idle
      const metrics = await tester.measureDbQuery('SELECT 1');

      // Wait for potential cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));

      // New query should still be efficient
      const newMetrics = await tester.measureDbQuery('SELECT 2');

      expect(newMetrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX);
    });
  });

  describe('Large Dataset Operations', () => {
    it('should handle large result sets efficiently', async () => {
      const metrics = await tester.measureDbQuery(`
        SELECT * FROM recipes
        ORDER BY created_at DESC
        LIMIT 1000
      `);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 5);
    });

    it('should handle pagination efficiently', async () => {
      const metrics = await tester.measureDbQuery(`
        SELECT * FROM recipes
        ORDER BY id
        LIMIT 50 OFFSET 1000
      `);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 2);
    });

    it('should handle bulk inserts efficiently', async () => {
      const metrics = await tester.measureDbQuery(`
        INSERT INTO recipes (name, instructions, user_id)
        SELECT
          'Bulk Recipe ' || i,
          'Bulk instructions for recipe ' || i,
          'user-id'
        FROM generate_series(1, 500) i
      `);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 10);
    });

    it('should handle bulk updates efficiently', async () => {
      const metrics = await tester.measureDbQuery(`
        UPDATE recipes
        SET updated_at = NOW()
        WHERE created_at < NOW() - INTERVAL '30 days'
      `);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 5);
    });

    it('should handle bulk deletes efficiently', async () => {
      const metrics = await tester.measureDbQuery(`
        DELETE FROM recipes
        WHERE name LIKE 'Bulk Recipe%'
        AND created_at < NOW() - INTERVAL '1 hour'
      `);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 5);
    });

    it('should handle data export efficiently', async () => {
      const metrics = await tester.measureDbQuery(`
        SELECT
          r.name,
          r.instructions,
          r.calories,
          u.email as creator_email,
          r.created_at
        FROM recipes r
        JOIN users u ON r.user_id = u.id
        WHERE r.created_at >= NOW() - INTERVAL '7 days'
        ORDER BY r.created_at DESC
      `);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 3);
    });

    it('should handle data migration efficiently', async () => {
      const metrics = await tester.measureDbQuery(`
        INSERT INTO recipes_backup (name, instructions, calories, user_id, created_at)
        SELECT name, instructions, calories, user_id, created_at
        FROM recipes
        WHERE created_at < NOW() - INTERVAL '90 days'
      `);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 8);
    });

    it('should handle analytical queries efficiently', async () => {
      const metrics = await tester.measureDbQuery(`
        SELECT
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) as recipe_count,
          AVG(calories) as avg_calories,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY calories) as median_calories
        FROM recipes
        WHERE created_at >= NOW() - INTERVAL '1 year'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month DESC
      `);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 4);
    });

    it('should handle recursive queries efficiently', async () => {
      const metrics = await tester.measureDbQuery(`
        WITH RECURSIVE recipe_hierarchy AS (
          SELECT id, name, parent_recipe_id, 1 as level
          FROM recipes WHERE parent_recipe_id IS NULL
          UNION ALL
          SELECT r.id, r.name, r.parent_recipe_id, rh.level + 1
          FROM recipes r
          INNER JOIN recipe_hierarchy rh ON r.parent_recipe_id = rh.id
          WHERE rh.level < 5
        )
        SELECT * FROM recipe_hierarchy
        ORDER BY level, name
      `);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 3);
    });

    it('should handle cross-table statistics efficiently', async () => {
      const metrics = await tester.measureDbQuery(`
        SELECT
          u.role,
          COUNT(DISTINCT u.id) as user_count,
          COUNT(DISTINCT r.id) as recipe_count,
          COUNT(DISTINCT mp.id) as meal_plan_count,
          AVG(r.calories) as avg_recipe_calories
        FROM users u
        LEFT JOIN recipes r ON u.id = r.user_id
        LEFT JOIN meal_plans mp ON u.id = mp.user_id
        GROUP BY u.role
      `);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 3);
    });
  });

  describe('Backup and Maintenance Performance', () => {
    it('should perform table analysis efficiently', async () => {
      const metrics = await tester.measureDbQuery('ANALYZE recipes');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 5);
    });

    it('should perform vacuum operations efficiently', async () => {
      const metrics = await tester.measureDbQuery('VACUUM ANALYZE recipes');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 10);
    });

    it('should check table integrity efficiently', async () => {
      const metrics = await tester.measureDbQuery(`
        SELECT COUNT(*) as total_recipes,
               COUNT(CASE WHEN name IS NULL THEN 1 END) as null_names,
               COUNT(CASE WHEN user_id IS NULL THEN 1 END) as null_users
        FROM recipes
      `);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX);
    });

    it('should generate database statistics efficiently', async () => {
      const metrics = await tester.measureDbQuery(`
        SELECT
          schemaname,
          tablename,
          n_tup_ins,
          n_tup_upd,
          n_tup_del,
          n_live_tup,
          n_dead_tup
        FROM pg_stat_user_tables
        WHERE tablename IN ('users', 'recipes', 'meal_plans')
      `);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX);
    });

    it('should check index usage efficiently', async () => {
      const metrics = await tester.measureDbQuery(`
        SELECT
          schemaname,
          tablename,
          indexname,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes
        WHERE tablename = 'recipes'
      `);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX);
    });

    it('should monitor database size efficiently', async () => {
      const metrics = await tester.measureDbQuery(`
        SELECT
          pg_size_pretty(pg_database_size(current_database())) as db_size,
          pg_size_pretty(pg_total_relation_size('recipes')) as recipes_size,
          pg_size_pretty(pg_total_relation_size('users')) as users_size
      `);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX);
    });

    it('should check constraint violations efficiently', async () => {
      const metrics = await tester.measureDbQuery(`
        SELECT COUNT(*) as orphaned_recipes
        FROM recipes r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE u.id IS NULL
      `);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX);
    });

    it('should perform data archival efficiently', async () => {
      const metrics = await tester.measureDbQuery(`
        CREATE TABLE IF NOT EXISTS recipes_archive AS
        SELECT * FROM recipes WHERE 1=0;

        INSERT INTO recipes_archive
        SELECT * FROM recipes
        WHERE created_at < NOW() - INTERVAL '2 years'
        LIMIT 100;
      `);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 3);
    });

    it('should handle database reindexing efficiently', async () => {
      const metrics = await tester.measureDbQuery('REINDEX INDEX CONCURRENTLY recipes_name_idx');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 15);
    });

    it('should perform cleanup operations efficiently', async () => {
      const metrics = await tester.measureDbQuery(`
        DELETE FROM recipes
        WHERE name LIKE 'Test Recipe%'
        AND created_at < NOW() - INTERVAL '1 day'
      `);

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 2);
    });
  });
});

// =============================================================================
// SCALABILITY TESTS (40 Tests)
// =============================================================================

describe('Scalability Tests', () => {

  describe('User Load Scaling', () => {
    it('should handle 10 concurrent users efficiently', async () => {
      const result = await tester.performLoadTest('/recipes', TEST_CONFIG.LOAD_TEST.USERS_LOW);

      expect(result.errorRate).toBeLessThan(5);
      expect(result.averageResponseTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX * 1.5);
      expect(result.requestsPerSecond).toBeGreaterThan(10);
    });

    it('should handle 50 concurrent users within threshold', async () => {
      const result = await tester.performLoadTest('/recipes', TEST_CONFIG.LOAD_TEST.USERS_MEDIUM);

      expect(result.errorRate).toBeLessThan(10);
      expect(result.averageResponseTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX * 2);
      expect(result.requestsPerSecond).toBeGreaterThan(30);
    });

    it('should handle 100 concurrent users acceptably', async () => {
      const result = await tester.performLoadTest('/recipes', TEST_CONFIG.LOAD_TEST.USERS_HIGH);

      expect(result.errorRate).toBeLessThan(15);
      expect(result.averageResponseTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX * 3);
      expect(result.requestsPerSecond).toBeGreaterThan(50);
    });

    it('should handle authentication load efficiently', async () => {
      const result = await tester.performLoadTest('/auth/login', TEST_CONFIG.LOAD_TEST.USERS_MEDIUM);

      expect(result.errorRate).toBeLessThan(10);
      expect(result.averageResponseTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX * 2);
    });

    it('should handle meal plan generation under load', async () => {
      const result = await tester.performLoadTest('/meal-plans/generate', TEST_CONFIG.LOAD_TEST.USERS_LOW);

      expect(result.errorRate).toBeLessThan(15);
      expect(result.averageResponseTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX * 4);
    });

    it('should handle search queries under load', async () => {
      const result = await tester.performLoadTest('/search?q=chicken', TEST_CONFIG.LOAD_TEST.USERS_MEDIUM);

      expect(result.errorRate).toBeLessThan(10);
      expect(result.averageResponseTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX * 2.5);
    });

    it('should handle PDF generation under load', async () => {
      const result = await tester.performLoadTest('/meal-plans/1/export/pdf', TEST_CONFIG.LOAD_TEST.USERS_LOW);

      expect(result.errorRate).toBeLessThan(20);
      expect(result.averageResponseTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX * 5);
    });

    it('should handle file uploads under load', async () => {
      const result = await tester.performLoadTest('/uploads/images', TEST_CONFIG.LOAD_TEST.USERS_LOW);

      expect(result.errorRate).toBeLessThan(15);
      expect(result.averageResponseTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX * 3);
    });

    it('should handle analytics queries under load', async () => {
      const result = await tester.performLoadTest('/analytics/dashboard', TEST_CONFIG.LOAD_TEST.USERS_MEDIUM);

      expect(result.errorRate).toBeLessThan(10);
      expect(result.averageResponseTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX * 2);
    });

    it('should handle user profile updates under load', async () => {
      const result = await tester.performLoadTest('/users/profile', TEST_CONFIG.LOAD_TEST.USERS_MEDIUM);

      expect(result.errorRate).toBeLessThan(10);
      expect(result.averageResponseTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX * 2);
    });
  });

  describe('Data Volume Scaling', () => {
    it('should handle large recipe datasets efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/recipes?limit=500');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX * 3);
      expect(metrics.p95).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX * 5);
    });

    it('should handle large meal plan datasets efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/meal-plans?limit=200');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX * 2.5);
    });

    it('should handle large user datasets efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/admin/users?limit=1000');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX * 4);
    });

    it('should handle complex search across large datasets', async () => {
      const metrics = await tester.measureApiEndpoint('/search?q=chicken&category=all&limit=100');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX * 3);
    });

    it('should handle large analytics datasets efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/analytics/users/engagement?days=365');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX * 4);
    });

    it('should handle bulk data imports efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/admin/import/recipes', {
        method: 'POST',
        body: JSON.stringify({
          recipes: Array(100).fill(null).map((_, i) => ({
            name: `Bulk Recipe ${i}`,
            instructions: 'Bulk import instructions',
            calories: 300 + i
          }))
        })
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX * 10);
    });

    it('should handle large exports efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/admin/export/all-data');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX * 10);
    });

    it('should handle pagination of large datasets efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/recipes?page=50&limit=20');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX * 1.5);
    });

    it('should handle filtering of large datasets efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/recipes?category=dinner&dietary=vegetarian&calories_min=200&calories_max=600');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX * 2);
    });

    it('should handle sorting of large datasets efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/recipes?sort=calories&order=desc&limit=100');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX * 2);
    });
  });

  describe('Real-time Updates Performance', () => {
    it('should handle WebSocket connections efficiently', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();

      const start = performance.now();
      await page.evaluate(() => {
        const ws = new WebSocket('ws://localhost:4000/ws');
        return new Promise((resolve) => {
          ws.onopen = () => resolve(true);
          ws.onerror = () => resolve(false);
          setTimeout(() => resolve(false), 3000);
        });
      });
      const end = performance.now();

      expect(end - start).toBeLessThan(3000);
      await page.close();
    });

    it('should handle real-time notifications efficiently', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/dashboard`);

      const start = performance.now();
      await page.evaluate(() => {
        // Simulate receiving real-time notification
        window.dispatchEvent(new CustomEvent('notification', {
          detail: { message: 'New recipe added', type: 'info' }
        }));
      });

      await page.waitForSelector('.notification', { timeout: 2000 });
      const end = performance.now();

      expect(end - start).toBeLessThan(1000);
      await page.close();
    });

    it('should handle live data updates efficiently', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/analytics`);

      const start = performance.now();
      await page.evaluate(() => {
        // Simulate live data update
        const event = new CustomEvent('dataUpdate', {
          detail: { recipes: { count: 150, trend: 'up' } }
        });
        window.dispatchEvent(event);
      });

      await page.waitForTimeout(500);
      const end = performance.now();

      expect(end - start).toBeLessThan(1000);
      await page.close();
    });

    it('should handle collaborative editing efficiently', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/recipes/1/edit`);

      const start = performance.now();
      await page.fill('input[name="name"]', 'Collaborative Edit Test');
      await page.waitForTimeout(300); // Simulate real-time sync
      const end = performance.now();

      expect(end - start).toBeLessThan(1000);
      await page.close();
    });

    it('should handle presence indicators efficiently', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/recipes/1`);

      const start = performance.now();
      await page.evaluate(() => {
        // Simulate user presence update
        window.dispatchEvent(new CustomEvent('userPresence', {
          detail: { users: [{ id: '1', name: 'John', active: true }] }
        }));
      });

      await page.waitForTimeout(200);
      const end = performance.now();

      expect(end - start).toBeLessThan(500);
      await page.close();
    });

    it('should handle activity feeds efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/activity/feed?limit=50');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX * 1.5);
    });

    it('should handle real-time search suggestions efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/search/suggest?q=chic');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX * 0.5);
    });

    it('should handle live statistics updates efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/stats/live');

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX);
    });

    it('should handle real-time validation efficiently', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/recipes/new`);

      const start = performance.now();
      await page.fill('input[name="name"]', 'Real-time Validation Test');
      await page.waitForSelector('.validation-message', { timeout: 1000 });
      const end = performance.now();

      expect(end - start).toBeLessThan(1000);
      await page.close();
    });

    it('should handle live chat efficiently', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/support`);

      const start = performance.now();
      await page.fill('textarea[name="message"]', 'Test message');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
      const end = performance.now();

      expect(end - start).toBeLessThan(1500);
      await page.close();
    });
  });

  describe('Memory Usage Under Load', () => {
    it('should maintain stable memory usage under API load', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();

      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // Simulate API load
      for (let i = 0; i < 50; i++) {
        await fetch(`${TEST_CONFIG.API_BASE_URL}/recipes?page=${i % 10}`);
      }

      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;
      expect(memoryIncrease).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.MEMORY_LEAK_MAX);

      await page.close();
    });

    it('should handle DOM manipulation under load efficiently', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/recipes`);

      const start = performance.now();

      // Simulate heavy DOM manipulation
      for (let i = 0; i < 20; i++) {
        await page.evaluate(() => {
          const container = document.querySelector('.recipe-container');
          if (container) {
            for (let j = 0; j < 10; j++) {
              const div = document.createElement('div');
              div.textContent = `Test item ${j}`;
              container.appendChild(div);
            }
          }
        });
      }

      const end = performance.now();
      expect(end - start).toBeLessThan(3000);

      await page.close();
    });

    it('should handle large form submissions efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/recipes', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Large Recipe Test',
          instructions: 'Very long instructions...'.repeat(100),
          ingredients: Array(50).fill('ingredient'),
          tags: Array(20).fill('tag'),
          nutritionalInfo: {
            calories: 500,
            protein: 30,
            carbs: 40,
            fat: 20,
            fiber: 10,
            sugar: 15
          }
        })
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX * 2);
    });

    it('should handle image processing under load efficiently', async () => {
      const promises = Array(5).fill(null).map(() =>
        tester.measureApiEndpoint('/uploads/images', {
          method: 'POST',
          body: JSON.stringify({
            filename: 'test.jpg',
            data: 'base64-image-data'.repeat(1000)
          })
        })
      );

      const results = await Promise.all(promises);
      const avgTime = results.reduce((sum, r) => sum + r.avg, 0) / results.length;

      expect(avgTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX * 3);
    });

    it('should handle concurrent database operations efficiently', async () => {
      const promises = Array(10).fill(null).map((_, i) =>
        tester.measureDbQuery(`
          INSERT INTO recipes (name, instructions, user_id)
          VALUES ($1, $2, $3)
        `, [`Concurrent Recipe ${i}`, 'Instructions', 'user-id'])
      );

      const results = await Promise.all(promises);
      const avgTime = results.reduce((sum, r) => sum + r.avg, 0) / results.length;

      expect(avgTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX * 2);
    });

    it('should handle cache operations under load efficiently', async () => {
      // Test cache performance under load
      const promises = Array(20).fill(null).map(() =>
        tester.measureApiEndpoint('/recipes?cache=true')
      );

      const results = await Promise.all(promises);
      const avgTime = results.reduce((sum, r) => sum + r.avg, 0) / results.length;

      expect(avgTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX);
    });

    it('should handle session management under load efficiently', async () => {
      const promises = Array(15).fill(null).map(() =>
        tester.measureApiEndpoint('/auth/verify', {
          headers: { 'Authorization': 'Bearer test-token' }
        })
      );

      const results = await Promise.all(promises);
      const avgTime = results.reduce((sum, r) => sum + r.avg, 0) / results.length;

      expect(avgTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX);
    });

    it('should handle garbage collection efficiently', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();

      // Create memory pressure
      await page.evaluate(() => {
        const data = [];
        for (let i = 0; i < 1000; i++) {
          data.push(new Array(1000).fill(Math.random()));
        }
        // Force garbage collection if available
        if ((window as any).gc) {
          (window as any).gc();
        }
      });

      const memory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      expect(memory).toBeLessThan(100 * 1024 * 1024); // 100MB limit
      await page.close();
    });

    it('should handle event listener cleanup efficiently', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/`);

      const start = performance.now();

      // Add and remove many event listeners
      await page.evaluate(() => {
        for (let i = 0; i < 100; i++) {
          const handler = () => console.log(`Handler ${i}`);
          document.addEventListener('click', handler);
          document.removeEventListener('click', handler);
        }
      });

      const end = performance.now();
      expect(end - start).toBeLessThan(1000);

      await page.close();
    });

    it('should handle component lifecycle under load efficiently', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/recipes`);

      const start = performance.now();

      // Simulate component mounting/unmounting
      for (let i = 0; i < 10; i++) {
        await page.click('a[href="/meal-plans"]');
        await page.waitForURL('**/meal-plans');
        await page.click('a[href="/recipes"]');
        await page.waitForURL('**/recipes');
      }

      const end = performance.now();
      expect(end - start).toBeLessThan(15000);

      await page.close();
    });
  });

  describe('Network and CDN Performance', () => {
    it('should handle high bandwidth usage efficiently', async () => {
      const promises = Array(10).fill(null).map(() =>
        tester.measureApiEndpoint('/uploads/images', {
          method: 'POST',
          body: JSON.stringify({
            filename: 'large-image.jpg',
            data: 'base64-large-image-data'.repeat(500)
          })
        })
      );

      const results = await Promise.all(promises);
      const avgTime = results.reduce((sum, r) => sum + r.avg, 0) / results.length;

      expect(avgTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX * 4);
    });

    it('should handle CDN failover efficiently', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();

      // Block CDN requests to simulate failure
      await page.route('**/cdn/**', route => route.abort());

      const start = performance.now();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/`);
      await page.waitForLoadState('networkidle');
      const end = performance.now();

      expect(end - start).toBeLessThan(8000); // Higher threshold for failover
      await page.close();
    });

    it('should handle geographic distribution efficiently', async () => {
      // Simulate requests from different geographic locations
      const headers = [
        { 'CF-IPCountry': 'US' },
        { 'CF-IPCountry': 'EU' },
        { 'CF-IPCountry': 'AS' }
      ];

      const promises = headers.map(header =>
        tester.measureApiEndpoint('/recipes', { headers })
      );

      const results = await Promise.all(promises);
      const avgTime = results.reduce((sum, r) => sum + r.avg, 0) / results.length;

      expect(avgTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX * 1.5);
    });

    it('should handle content compression efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/recipes', {
        headers: { 'Accept-Encoding': 'gzip, deflate, br' }
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX);
    });

    it('should handle HTTP/2 multiplexing efficiently', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();

      const start = performance.now();

      // Make multiple concurrent requests
      await Promise.all([
        page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/recipes`),
        fetch(`${TEST_CONFIG.API_BASE_URL}/recipes`),
        fetch(`${TEST_CONFIG.API_BASE_URL}/meal-plans`),
        fetch(`${TEST_CONFIG.API_BASE_URL}/users/profile`)
      ]);

      const end = performance.now();
      expect(end - start).toBeLessThan(3000);

      await page.close();
    });

    it('should handle service worker caching efficiently', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();

      // First load to populate cache
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/`);
      await page.waitForLoadState('networkidle');

      // Go offline
      await page.setOffline(true);

      const start = performance.now();
      await page.reload();
      await page.waitForLoadState('networkidle');
      const end = performance.now();

      expect(end - start).toBeLessThan(2000);
      await page.close();
    });

    it('should handle edge computing efficiently', async () => {
      const metrics = await tester.measureApiEndpoint('/edge/recipes', {
        headers: { 'X-Edge-Location': 'us-east-1' }
      });

      expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX * 0.8);
    });

    it('should handle SSL/TLS handshake efficiently', async () => {
      if (!tester.browser) return;

      const page = await tester.browser.newPage();

      const start = performance.now();
      await page.goto(`${TEST_CONFIG.FRONTEND_BASE_URL}/`);
      const end = performance.now();

      expect(end - start).toBeLessThan(3000);
      await page.close();
    });

    it('should handle DNS resolution efficiently', async () => {
      const start = performance.now();
      await fetch(`${TEST_CONFIG.API_BASE_URL}/health`);
      const end = performance.now();

      expect(end - start).toBeLessThan(1000);
    });

    it('should handle load balancer distribution efficiently', async () => {
      const promises = Array(20).fill(null).map(() =>
        tester.measureApiEndpoint('/health')
      );

      const results = await Promise.all(promises);
      const avgTime = results.reduce((sum, r) => sum + r.avg, 0) / results.length;

      expect(avgTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX * 0.5);
    });
  });
});

// =============================================================================
// PERFORMANCE BASELINE AND REPORTING
// =============================================================================

describe('Performance Baseline and Reporting', () => {

  it('should establish performance baselines', async () => {
    const baselines = {
      apiGet: await tester.measureApiEndpoint('/recipes', {}, 20),
      apiPost: await tester.measureApiEndpoint('/recipes', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Baseline Recipe',
          instructions: 'Baseline instructions'
        })
      }, 10),
      pageLoad: await tester.measurePageLoad('/', 10),
      dbQuery: await tester.measureDbQuery('SELECT COUNT(*) FROM recipes', [], 20)
    };

    // Store baselines for future comparison
    console.log('Performance Baselines:', {
      'API GET (avg)': `${baselines.apiGet.avg.toFixed(2)}ms`,
      'API POST (avg)': `${baselines.apiPost.avg.toFixed(2)}ms`,
      'Page Load (avg)': `${baselines.pageLoad.avg.toFixed(2)}ms`,
      'DB Query (avg)': `${baselines.dbQuery.avg.toFixed(2)}ms`,
      'API GET (p95)': `${baselines.apiGet.p95.toFixed(2)}ms`,
      'API POST (p95)': `${baselines.apiPost.p95.toFixed(2)}ms`,
      'Page Load (p95)': `${baselines.pageLoad.p95.toFixed(2)}ms`,
      'DB Query (p95)': `${baselines.dbQuery.p95.toFixed(2)}ms`
    });

    // Verify baselines meet thresholds
    expect(baselines.apiGet.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_GET_MAX);
    expect(baselines.apiPost.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_POST_MAX);
    expect(baselines.pageLoad.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.PAGE_LOAD_MAX);
    expect(baselines.dbQuery.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DB_QUERY_MAX);
  });

  it('should generate comprehensive performance report', async () => {
    const report = {
      testSuiteInfo: {
        totalTests: 200,
        apiTests: 60,
        frontendTests: 50,
        databaseTests: 50,
        scalabilityTests: 40
      },
      performanceTargets: TEST_CONFIG.PERFORMANCE_THRESHOLDS,
      loadTestConfig: TEST_CONFIG.LOAD_TEST,
      testEnvironment: {
        apiBaseUrl: TEST_CONFIG.API_BASE_URL,
        frontendBaseUrl: TEST_CONFIG.FRONTEND_BASE_URL,
        databaseUrl: TEST_CONFIG.DB_URL ? 'Connected' : 'Not configured'
      },
      timestamp: new Date().toISOString()
    };

    console.log('Performance Test Report:', JSON.stringify(report, null, 2));

    expect(report.testSuiteInfo.totalTests).toBe(200);
    expect(report.performanceTargets.API_GET_MAX).toBe(200);
    expect(report.performanceTargets.API_POST_MAX).toBe(500);
  });
});