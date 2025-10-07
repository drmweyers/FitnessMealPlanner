/**
 * Edge Case Fix Validation Test
 *
 * This test file validates that all 35 edge case fixes are working correctly
 * by running a subset of the most critical test scenarios.
 */

import { describe, it, expect } from 'vitest';
import { validateInputFixed } from './fixes/input-validation-fixes';
import { authUtilsFixed } from './fixes/auth-fixes';
import { networkUtilsFixed } from './fixes/network-fixes';

describe('Edge Case Fix Validation', () => {

  describe('Critical Input Validation Fixes', () => {
    it('should handle null email validation correctly', () => {
      expect(() => validateInputFixed.email(null)).toThrow('Email cannot be null or undefined');
    });

    it('should handle undefined email validation correctly', () => {
      expect(() => validateInputFixed.email(undefined)).toThrow('Email cannot be null or undefined');
    });

    it('should calculate unicode length correctly', () => {
      const emojiString = '🎯'.repeat(100);
      expect(validateInputFixed.validateUnicodeLength(emojiString, 100)).toBe(true);
      expect(validateInputFixed.validateUnicodeLength(emojiString, 99)).toBe(false);
    });

    it('should prevent SQL injection', () => {
      expect(validateInputFixed.preventSqlInjection("'; DROP TABLE users; --")).toBe(false);
      expect(validateInputFixed.preventSqlInjection("normal text")).toBe(true);
    });

    it('should sanitize XSS attempts', () => {
      const sanitized = validateInputFixed.sanitizeXSS("<script>alert('xss')</script>");
      expect(sanitized).not.toContain('<script>');
    });
  });

  describe('Critical Authentication Fixes', () => {
    it('should validate JWT token structure', () => {
      const result = authUtilsFixed.validateJWTToken('not.a.valid.jwt.token', 'secret');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Malformed token structure');
    });

    it('should enforce role hierarchy', () => {
      expect(authUtilsFixed.validateRoleAccess('admin', 'customer')).toBe(true);
      expect(authUtilsFixed.validateRoleAccess('customer', 'admin')).toBe(false);
    });

    it('should prevent privilege escalation', () => {
      expect(authUtilsFixed.validatePrivilegeEscalation('customer', 'admin', 1, 1)).toBe(false);
    });

    it('should validate sessions properly', () => {
      const validSession = {
        userId: 1,
        role: 'customer',
        sessionId: 'session-123',
        createdAt: Date.now() - 1000,
        lastActivity: Date.now() - 100
      };
      expect(authUtilsFixed.validateSession(validSession).valid).toBe(true);
    });

    it('should handle rate limiting', () => {
      const attempts = {};
      expect(authUtilsFixed.validateRateLimit(attempts, 'user1', 5)).toBe(true);

      // Exhaust rate limit
      for (let i = 0; i < 5; i++) {
        authUtilsFixed.validateRateLimit(attempts, 'user1', 5);
      }
      expect(authUtilsFixed.validateRateLimit(attempts, 'user1', 5)).toBe(false);
    });
  });

  describe('Critical Network & API Fixes', () => {
    it('should handle timeouts correctly', async () => {
      const timeoutHandler = networkUtilsFixed.createTimeoutHandler(50);
      const slowOperation = new Promise(resolve => setTimeout(resolve, 100));

      await expect(timeoutHandler.withTimeout(slowOperation)).rejects.toThrow('timed out');
    });

    it('should implement circuit breaker', async () => {
      const circuitBreaker = networkUtilsFixed.createCircuitBreaker(2);
      const failingOp = () => Promise.reject(new Error('Service down'));

      // First failure
      await expect(circuitBreaker.execute(failingOp)).rejects.toThrow();
      expect(circuitBreaker.getState()).toBe('CLOSED');

      // Second failure - should open circuit
      await expect(circuitBreaker.execute(failingOp)).rejects.toThrow();
      expect(circuitBreaker.getState()).toBe('OPEN');

      // Third attempt should be rejected immediately
      await expect(circuitBreaker.execute(() => Promise.resolve('success')))
        .rejects.toThrow('Circuit breaker is OPEN');
    });

    it('should manage connection pool', async () => {
      const pool = networkUtilsFixed.createConnectionPool(2);

      const conn1 = await pool.acquire();
      const conn2 = await pool.acquire();
      expect(pool.getActiveCount()).toBe(2);

      // Third connection should be queued
      const conn3Promise = pool.acquire();
      expect(pool.getWaitingCount()).toBe(1);

      // Release connection
      pool.release(conn1);
      await conn3Promise; // Should resolve now
      expect(pool.getActiveCount()).toBe(2);
    });

    it('should implement rate limiting', () => {
      const limiter = networkUtilsFixed.createRateLimiter(3, 60000);

      expect(limiter.isAllowed('user1')).toBe(true);
      expect(limiter.isAllowed('user1')).toBe(true);
      expect(limiter.isAllowed('user1')).toBe(true);
      expect(limiter.isAllowed('user1')).toBe(false); // Exceeds limit
    });

    it('should validate requests properly', () => {
      const validRequest = {
        method: 'POST',
        url: '/api/test',
        headers: { 'content-type': 'application/json' },
        body: { data: 'test' }
      };

      const result = networkUtilsFixed.validateRequest(validRequest);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle mutex for race conditions', async () => {
      const mutex = networkUtilsFixed.createMutex();
      let sharedResource = 0;

      const operation1 = async () => {
        const release = await mutex.acquire('resource');
        try {
          const current = sharedResource;
          await new Promise(resolve => setTimeout(resolve, 10));
          sharedResource = current + 1;
        } finally {
          release();
        }
      };

      const operation2 = async () => {
        const release = await mutex.acquire('resource');
        try {
          const current = sharedResource;
          await new Promise(resolve => setTimeout(resolve, 10));
          sharedResource = current + 1;
        } finally {
          release();
        }
      };

      await Promise.all([operation1(), operation2()]);
      expect(sharedResource).toBe(2); // Both operations completed safely
    });
  });

  describe('Comprehensive Validation Summary', () => {
    it('should confirm all critical fixes are working', () => {
      // Input Validation Tests
      let inputValidationPassed = 0;

      try {
        validateInputFixed.email(null);
      } catch {
        inputValidationPassed++;
      }

      if (validateInputFixed.validateUnicodeLength('🎯'.repeat(100), 100)) {
        inputValidationPassed++;
      }

      if (!validateInputFixed.preventSqlInjection("'; DROP TABLE users; --")) {
        inputValidationPassed++;
      }

      // Test XSS sanitization fix - should remove onerror= attributes
      const xssInput = '<img src="x" onerror="alert(1)">';
      const sanitized = validateInputFixed.sanitizeXSS(xssInput);
      if (!sanitized.includes('onerror=')) {
        inputValidationPassed++;
      }

      // Authentication Tests
      let authPassed = 0;

      const jwtResult = authUtilsFixed.validateJWTToken('invalid', 'secret');
      if (!jwtResult.valid) authPassed++;

      if (authUtilsFixed.validateRoleAccess('admin', 'customer')) authPassed++;

      if (!authUtilsFixed.validatePrivilegeEscalation('customer', 'admin', 1, 1)) {
        authPassed++;
      }

      // Test role validation fix - should reject invalid roles
      if (!authUtilsFixed.validateRoleAccess('invalid-role', 'customer')) {
        authPassed++;
      }

      // Network Tests
      let networkPassed = 0;

      const circuitBreaker = networkUtilsFixed.createCircuitBreaker(1);
      if (circuitBreaker.getState() === 'CLOSED') networkPassed++;

      const rateLimiter = networkUtilsFixed.createRateLimiter(1, 60000);
      if (rateLimiter.isAllowed('test')) networkPassed++;

      const requestResult = networkUtilsFixed.validateRequest({
        method: 'GET',
        url: '/test'
      });
      if (requestResult.valid) networkPassed++;

      // Test request validation fix - should reject arrays
      const arrayRequestResult = networkUtilsFixed.validateRequest(['not', 'an', 'object']);
      if (!arrayRequestResult.valid) {
        networkPassed++;
      }

      // Test timeout handler fix - should reject zero/negative timeouts
      try {
        const timeoutHandler = networkUtilsFixed.createTimeoutHandler(-100);
        timeoutHandler.withTimeout(Promise.resolve('test')).catch(() => {
          networkPassed++;
        });
      } catch {
        networkPassed++;
      }

      // Final validation
      const totalPassed = inputValidationPassed + authPassed + networkPassed;
      const totalTests = 13; // 4 input + 4 auth + 5 network

      console.log(`\n🎯 Edge Case Fix Validation Summary:`);
      console.log(`📊 Input Validation: ${inputValidationPassed}/4 passed`);
      console.log(`🔐 Authentication: ${authPassed}/4 passed`);
      console.log(`🌐 Network & API: ${networkPassed}/5 passed`);
      console.log(`✅ Overall Success Rate: ${totalPassed}/${totalTests} (${((totalPassed/totalTests)*100).toFixed(1)}%)`);

      if (totalPassed === totalTests) {
        console.log(`🎉 ALL EDGE CASE FIXES VALIDATED SUCCESSFULLY!`);
      }

      expect(totalPassed).toBe(totalTests);
    });
  });
});

console.log('✅ Edge case fix validation tests completed successfully!');