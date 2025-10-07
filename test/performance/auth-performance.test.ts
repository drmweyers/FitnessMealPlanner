import { describe, it, beforeAll, afterAll, expect } from '@jest/globals';
import request from 'supertest';
import { performance } from 'perf_hooks';
import express from 'express';

/**
 * Authentication Performance Test Suite
 * 
 * This test suite measures and validates authentication performance improvements
 * by testing login, token validation, and refresh token operations under various loads.
 * 
 * Performance Targets:
 * - Login: <2000ms (was 15-30 seconds)
 * - Token validation: <100ms  
 * - Token refresh: <500ms
 * - Concurrent logins (10): <5000ms total
 */

// Mock Express app with optimized auth
import { requireAuthOptimized, getAuthMetrics } from '../../server/middleware/auth-optimized';
import { 
  hashPassword, 
  comparePasswords, 
  generateTokens, 
  verifyToken,
  getAuthPerformanceMetrics,
  resetAuthMetrics 
} from '../../server/auth-optimized';
import { storage } from '../../server/storage';

// Test configuration
const PERFORMANCE_THRESHOLDS = {
  LOGIN_MAX_TIME: 2000,           // 2 seconds (was 15-30 seconds)
  TOKEN_VALIDATION_MAX_TIME: 100, // 100ms
  TOKEN_REFRESH_MAX_TIME: 500,    // 500ms
  PASSWORD_HASH_MAX_TIME: 1000,   // 1 second
  PASSWORD_COMPARE_MAX_TIME: 500, // 500ms
  CONCURRENT_LOGIN_MAX_TIME: 5000 // 5 seconds for 10 concurrent logins
};

const TEST_CREDENTIALS = {
  email: 'performance.test@evofitmeals.com',
  password: 'TestPassword123!',
  role: 'customer' as const
};

// Mock Express app for testing
const app = express();
app.use(express.json());
app.use(express.cookieParser());

// Mock authentication endpoints
app.post('/auth/login-optimized', async (req, res) => {
  const startTime = performance.now();
  
  try {
    const { email, password } = req.body;
    
    // Mock user lookup (in real app, this uses optimized database)
    const user = await storage.getUserByEmail(email);
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValid = await comparePasswords(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const { accessToken, refreshToken } = generateTokens(user);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    res.json({
      success: true,
      user: { id: user.id, email: user.email, role: user.role },
      accessToken,
      refreshToken,
      performanceMetrics: {
        loginDuration: duration,
        wasOptimized: true
      }
    });
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.error('Login error after', duration, 'ms:', error);
    res.status(500).json({ 
      error: 'Login failed',
      duration
    });
  }
});

// Test protected route with optimized middleware
app.get('/protected', requireAuthOptimized, (req, res) => {
  const startTime = performance.now();
  
  res.json({
    message: 'Access granted',
    user: req.user,
    validationTime: performance.now() - startTime
  });
});

describe('Authentication Performance Tests', () => {
  let testUser: any;
  let testTokens: { accessToken: string; refreshToken: string };
  
  beforeAll(async () => {
    console.log('🚀 Setting up performance tests...');
    
    // Reset metrics for clean testing
    resetAuthMetrics();
    
    // Create test user with optimized password hashing
    const hashedPassword = await hashPassword(TEST_CREDENTIALS.password);
    
    try {
      // Clean up existing test user
      const existingUser = await storage.getUserByEmail(TEST_CREDENTIALS.email);
      if (existingUser) {
        // In a real implementation, you'd delete the user
        console.log('Test user already exists');
      }
      
      // Create test user (or use existing)
      testUser = existingUser || await storage.createUser({
        email: TEST_CREDENTIALS.email,
        password: hashedPassword,
        role: TEST_CREDENTIALS.role
      });
      
      console.log('✅ Test user created:', testUser.id);
    } catch (error) {
      console.error('Failed to create test user:', error);
      throw error;
    }
  });
  
  afterAll(async () => {
    console.log('🧹 Cleaning up performance tests...');
    
    // Log final performance metrics
    const authMetrics = getAuthPerformanceMetrics();
    const middlewareMetrics = getAuthMetrics();
    
    console.log('📊 Final Auth Performance Metrics:');
    console.log(`  - Hash operations: ${authMetrics.hashOperations}`);
    console.log(`  - Token validations: ${authMetrics.tokenValidations}`);
    console.log(`  - Cache hit rate: ${authMetrics.cacheHitRate.toFixed(1)}%`);
    console.log(`  - Average hash time: ${authMetrics.avgHashTime.toFixed(1)}ms`);
    console.log(`  - Average token time: ${authMetrics.avgTokenTime.toFixed(1)}ms`);
    
    console.log('📊 Middleware Performance Metrics:');
    console.log(`  - Cache hits: ${middlewareMetrics.cacheHits}`);
    console.log(`  - Cache misses: ${middlewareMetrics.cacheMisses}`);
    console.log(`  - Database queries: ${middlewareMetrics.dbQueries}`);
    console.log(`  - Timeouts: ${middlewareMetrics.timeouts}`);
  });
  
  describe('Password Operations Performance', () => {
    it('should hash passwords within performance threshold', async () => {
      const startTime = performance.now();
      
      const hashedPassword = await hashPassword(TEST_CREDENTIALS.password);
      
      const duration = performance.now() - startTime;
      
      expect(hashedPassword).toBeDefined();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.PASSWORD_HASH_MAX_TIME);
      
      console.log(`✅ Password hashing: ${duration.toFixed(1)}ms (threshold: ${PERFORMANCE_THRESHOLDS.PASSWORD_HASH_MAX_TIME}ms)`);
    }, 10000);
    
    it('should compare passwords within performance threshold', async () => {
      const hashedPassword = await hashPassword(TEST_CREDENTIALS.password);
      
      const startTime = performance.now();
      
      const isValid = await comparePasswords(TEST_CREDENTIALS.password, hashedPassword);
      
      const duration = performance.now() - startTime;
      
      expect(isValid).toBe(true);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.PASSWORD_COMPARE_MAX_TIME);
      
      console.log(`✅ Password comparison: ${duration.toFixed(1)}ms (threshold: ${PERFORMANCE_THRESHOLDS.PASSWORD_COMPARE_MAX_TIME}ms)`);
    }, 10000);
  });
  
  describe('Token Operations Performance', () => {
    it('should generate tokens quickly', async () => {
      const startTime = performance.now();
      
      testTokens = generateTokens(testUser);
      
      const duration = performance.now() - startTime;
      
      expect(testTokens.accessToken).toBeDefined();
      expect(testTokens.refreshToken).toBeDefined();
      expect(duration).toBeLessThan(100); // Should be very fast
      
      console.log(`✅ Token generation: ${duration.toFixed(1)}ms`);
    });
    
    it('should validate tokens within performance threshold', async () => {
      if (!testTokens) {
        testTokens = generateTokens(testUser);
      }
      
      const startTime = performance.now();
      
      const decoded = verifyToken(testTokens.accessToken);
      
      const duration = performance.now() - startTime;
      
      expect(decoded).toBeDefined();
      expect(decoded.id).toBe(testUser.id);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.TOKEN_VALIDATION_MAX_TIME);
      
      console.log(`✅ Token validation: ${duration.toFixed(1)}ms (threshold: ${PERFORMANCE_THRESHOLDS.TOKEN_VALIDATION_MAX_TIME}ms)`);
    });
    
    it('should benefit from token caching on repeated validations', async () => {
      if (!testTokens) {
        testTokens = generateTokens(testUser);
      }
      
      // First validation (cache miss)
      const firstStart = performance.now();
      const firstResult = verifyToken(testTokens.accessToken);
      const firstDuration = performance.now() - firstStart;
      
      // Second validation (cache hit)
      const secondStart = performance.now();
      const secondResult = verifyToken(testTokens.accessToken);
      const secondDuration = performance.now() - secondStart;
      
      expect(firstResult).toBeDefined();
      expect(secondResult).toBeDefined();
      expect(secondDuration).toBeLessThan(firstDuration); // Cache should be faster
      
      console.log(`✅ Token caching benefit: First: ${firstDuration.toFixed(1)}ms, Second: ${secondDuration.toFixed(1)}ms (${(((firstDuration - secondDuration) / firstDuration) * 100).toFixed(1)}% faster)`);
    });
  });
  
  describe('Login Performance Tests', () => {
    it('should complete login within performance threshold', async () => {
      const startTime = performance.now();
      
      const response = await request(app)
        .post('/auth/login-optimized')
        .send({
          email: TEST_CREDENTIALS.email,
          password: TEST_CREDENTIALS.password
        })
        .expect(200);
      
      const duration = performance.now() - startTime;
      
      expect(response.body.success).toBe(true);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.performanceMetrics.loginDuration).toBeDefined();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.LOGIN_MAX_TIME);
      
      console.log(`✅ Complete login flow: ${duration.toFixed(1)}ms (threshold: ${PERFORMANCE_THRESHOLDS.LOGIN_MAX_TIME}ms)`);
      console.log(`   - Server-side login: ${response.body.performanceMetrics.loginDuration.toFixed(1)}ms`);
    }, 15000);
    
    it('should handle concurrent logins efficiently', async () => {
      const concurrentLogins = 10;
      const startTime = performance.now();
      
      const loginPromises = Array.from({ length: concurrentLogins }, () =>
        request(app)
          .post('/auth/login-optimized')
          .send({
            email: TEST_CREDENTIALS.email,
            password: TEST_CREDENTIALS.password
          })
      );
      
      const responses = await Promise.all(loginPromises);
      
      const totalDuration = performance.now() - startTime;
      const averageDuration = totalDuration / concurrentLogins;
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
      
      expect(totalDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_LOGIN_MAX_TIME);
      
      console.log(`✅ ${concurrentLogins} concurrent logins: ${totalDuration.toFixed(1)}ms total, ${averageDuration.toFixed(1)}ms average (threshold: ${PERFORMANCE_THRESHOLDS.CONCURRENT_LOGIN_MAX_TIME}ms)`);
    }, 30000);
  });
  
  describe('Middleware Performance Tests', () => {
    it('should validate requests quickly with optimized middleware', async () => {
      if (!testTokens) {
        testTokens = generateTokens(testUser);
      }
      
      const startTime = performance.now();
      
      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${testTokens.accessToken}`)
        .expect(200);
      
      const duration = performance.now() - startTime;
      const validationTime = response.body.validationTime;
      
      expect(response.body.message).toBe('Access granted');
      expect(response.body.user).toBeDefined();
      expect(validationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.TOKEN_VALIDATION_MAX_TIME);
      expect(duration).toBeLessThan(200); // Total request should be fast
      
      console.log(`✅ Protected route access: ${duration.toFixed(1)}ms total, ${validationTime.toFixed(1)}ms validation`);
    });
    
    it('should show performance improvement over multiple requests', async () => {
      if (!testTokens) {
        testTokens = generateTokens(testUser);
      }
      
      const requestCount = 5;
      const durations: number[] = [];
      
      for (let i = 0; i < requestCount; i++) {
        const startTime = performance.now();
        
        const response = await request(app)
          .get('/protected')
          .set('Authorization', `Bearer ${testTokens.accessToken}`)
          .expect(200);
        
        const duration = performance.now() - startTime;
        durations.push(duration);
      }
      
      const averageDuration = durations.reduce((a, b) => a + b) / durations.length;
      const firstDuration = durations[0];
      const lastDuration = durations[durations.length - 1];
      
      // Later requests should be faster due to caching
      expect(lastDuration).toBeLessThanOrEqual(firstDuration);
      
      console.log(`✅ Performance over ${requestCount} requests:`);
      console.log(`   - First request: ${firstDuration.toFixed(1)}ms`);
      console.log(`   - Last request: ${lastDuration.toFixed(1)}ms`);
      console.log(`   - Average: ${averageDuration.toFixed(1)}ms`);
      console.log(`   - Improvement: ${(((firstDuration - lastDuration) / firstDuration) * 100).toFixed(1)}%`);
    });
  });
  
  describe('Performance Regression Tests', () => {
    it('should maintain performance under load', async () => {
      if (!testTokens) {
        testTokens = generateTokens(testUser);
      }
      
      const loadTestRequests = 50;
      const startTime = performance.now();
      
      // Create multiple concurrent requests
      const requests = Array.from({ length: loadTestRequests }, () =>
        request(app)
          .get('/protected')
          .set('Authorization', `Bearer ${testTokens.accessToken}`)
      );
      
      const responses = await Promise.all(requests);
      
      const totalDuration = performance.now() - startTime;
      const averageDuration = totalDuration / loadTestRequests;
      
      // All requests should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Access granted');
      });
      
      // Average request time should still be reasonable
      expect(averageDuration).toBeLessThan(100);
      
      console.log(`✅ Load test (${loadTestRequests} requests):`);
      console.log(`   - Total time: ${totalDuration.toFixed(1)}ms`);
      console.log(`   - Average per request: ${averageDuration.toFixed(1)}ms`);
      console.log(`   - Requests per second: ${(loadTestRequests / (totalDuration / 1000)).toFixed(1)}`);
    }, 60000);
  });
  
  describe('Performance Metrics Validation', () => {
    it('should show significant improvement in auth metrics', () => {
      const metrics = getAuthPerformanceMetrics();
      
      // Validate cache effectiveness
      if (metrics.tokenValidations > 0) {
        expect(metrics.cacheHitRate).toBeGreaterThan(0);
        console.log(`✅ Token cache hit rate: ${metrics.cacheHitRate.toFixed(1)}%`);
      }
      
      // Validate performance averages
      if (metrics.avgHashTime > 0) {
        expect(metrics.avgHashTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PASSWORD_HASH_MAX_TIME);
        console.log(`✅ Average hash time: ${metrics.avgHashTime.toFixed(1)}ms`);
      }
      
      if (metrics.avgTokenTime > 0) {
        expect(metrics.avgTokenTime).toBeLessThan(PERFORMANCE_THRESHOLDS.TOKEN_VALIDATION_MAX_TIME);
        console.log(`✅ Average token time: ${metrics.avgTokenTime.toFixed(1)}ms`);
      }
    });
    
    it('should show database optimization benefits', () => {
      const metrics = getAuthMetrics();
      
      // Validate database query reduction
      if (metrics.cacheHits + metrics.cacheMisses > 0) {
        const cacheHitRate = metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses);
        expect(cacheHitRate).toBeGreaterThan(0.5); // At least 50% cache hit rate
        
        console.log(`✅ Database query optimization:`);
        console.log(`   - Cache hits: ${metrics.cacheHits}`);
        console.log(`   - Cache misses: ${metrics.cacheMisses}`);
        console.log(`   - Cache hit rate: ${(cacheHitRate * 100).toFixed(1)}%`);
        console.log(`   - Database queries avoided: ${metrics.cacheHits}`);
      }
      
      // Validate timeout handling
      expect(metrics.timeouts).toBe(0); // Should have no timeouts in tests
    });
  });
});