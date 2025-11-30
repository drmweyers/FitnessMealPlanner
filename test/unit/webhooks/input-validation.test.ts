/**
 * Webhook Input Validation Tests
 *
 * Security Tests for Payload Validation using Zod Schemas
 * Based on Security Agent recommendations from Enterprise Readiness Report
 *
 * Tests cover:
 * - Email validation and sanitization
 * - SQL injection prevention
 * - XSS attack prevention
 * - Type safety and schema validation
 * - Required field enforcement
 *
 * Priority: P0 (Critical Security - Injection Prevention)
 * Test Count: 20 tests
 */

import request from 'supertest';
import { app } from '../../../server';
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('Webhook Input Validation - Security Tests', () => {
  describe('TC-VAL-001: Email Validation', () => {
    it('should reject invalid email format', async () => {
      const payload = {
        email: 'not-an-email',
        firstName: 'Test',
        leadSource: 'meal_plan_generator'
      };

      const response = await request(app)
        .post('/api/webhooks/lead-capture')
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid email');
    });

    it('should reject email with SQL injection attempt', async () => {
      const payload = {
        email: "test@example.com'; DROP TABLE users; --",
        firstName: 'Test',
        leadSource: 'meal_plan_generator'
      };

      const response = await request(app)
        .post('/api/webhooks/lead-capture')
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid email');
    });

    it('should normalize email addresses (remove +tags, normalize dots)', async () => {
      const payload = {
        email: 'Test.User+tag@EXAMPLE.COM',
        firstName: 'Test',
        leadSource: 'meal_plan_generator'
      };

      const response = await request(app)
        .post('/api/webhooks/lead-capture')
        .send(payload);

      // Email should be normalized to: testuser@example.com
      // (implementation should use validator.normalizeEmail())
      if (response.status === 200 || response.status === 201) {
        expect(response.body.email?.toLowerCase()).toBe('testuser@example.com');
      }
    });

    it('should reject email with extremely long local part (>64 chars)', async () => {
      const longLocal = 'a'.repeat(65);
      const payload = {
        email: `${longLocal}@example.com`,
        firstName: 'Test',
        leadSource: 'meal_plan_generator'
      };

      const response = await request(app)
        .post('/api/webhooks/lead-capture')
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid email');
    });
  });

  describe('TC-VAL-002: XSS Attack Prevention', () => {
    it('should sanitize HTML tags in firstName field', async () => {
      const payload = {
        email: 'test@example.com',
        firstName: '<script>alert("XSS")</script>',
        leadSource: 'meal_plan_generator'
      };

      const response = await request(app)
        .post('/api/webhooks/lead-capture')
        .send(payload);

      // Should sanitize or reject HTML tags
      if (response.status === 200 || response.status === 201) {
        expect(response.body.firstName).not.toContain('<script>');
      } else {
        expect(response.status).toBe(400);
      }
    });

    it('should sanitize JavaScript event handlers in input', async () => {
      const payload = {
        email: 'test@example.com',
        firstName: 'Test<img src=x onerror=alert(1)>',
        leadSource: 'meal_plan_generator'
      };

      const response = await request(app)
        .post('/api/webhooks/lead-capture')
        .send(payload);

      if (response.status === 200 || response.status === 201) {
        expect(response.body.firstName).not.toContain('onerror');
      } else {
        expect(response.status).toBe(400);
      }
    });

    it('should handle Unicode-based XSS attempts', async () => {
      const payload = {
        email: 'test@example.com',
        firstName: '\u003Cscript\u003Ealert("XSS")\u003C/script\u003E',
        leadSource: 'meal_plan_generator'
      };

      const response = await request(app)
        .post('/api/webhooks/lead-capture')
        .send(payload);

      if (response.status === 200 || response.status === 201) {
        expect(response.body.firstName).not.toContain('script');
      } else {
        expect(response.status).toBe(400);
      }
    });
  });

  describe('TC-VAL-003: Required Fields Enforcement', () => {
    it('should reject lead capture webhook without email field', async () => {
      const payload = {
        firstName: 'Test',
        leadSource: 'meal_plan_generator'
      };

      const response = await request(app)
        .post('/api/webhooks/lead-capture')
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('email');
    });

    it('should reject welcome webhook without accountType field', async () => {
      const payload = {
        email: 'test@example.com',
        firstName: 'Test',
        customerId: 'cus_test123'
      };

      const response = await request(app)
        .post('/api/webhooks/welcome')
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('accountType');
    });

    it('should allow optional fields to be omitted', async () => {
      const payload = {
        email: 'test@example.com',
        // firstName is optional
        leadSource: 'meal_plan_generator'
      };

      const response = await request(app)
        .post('/api/webhooks/lead-capture')
        .send(payload);

      // Should NOT reject due to missing optional fields
      expect(response.status).not.toBe(400);
    });
  });

  describe('TC-VAL-004: Enum Validation', () => {
    it('should reject invalid accountType enum value', async () => {
      const payload = {
        email: 'test@example.com',
        firstName: 'Test',
        accountType: 'invalid-tier', // Not in enum
        customerId: 'cus_test123'
      };

      const response = await request(app)
        .post('/api/webhooks/welcome')
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('accountType');
    });

    it('should accept valid accountType enum values', async () => {
      const validAccountTypes = ['starter', 'professional', 'enterprise', 'trial', 'lifetime'];

      for (const accountType of validAccountTypes) {
        const payload = {
          email: 'test@example.com',
          firstName: 'Test',
          accountType,
          customerId: 'cus_test123'
        };

        const response = await request(app)
          .post('/api/webhooks/welcome')
          .send(payload);

        // Should NOT reject due to invalid enum
        if (response.status === 400) {
          expect(response.body.error).not.toContain('accountType');
        }
      }
    });

    it('should be case-sensitive for enum values', async () => {
      const payload = {
        email: 'test@example.com',
        firstName: 'Test',
        accountType: 'STARTER', // Wrong case
        customerId: 'cus_test123'
      };

      const response = await request(app)
        .post('/api/webhooks/welcome')
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('accountType');
    });
  });

  describe('TC-VAL-005: Stripe ID Validation', () => {
    it('should validate Stripe customer ID format (cus_*)', async () => {
      const payload = {
        email: 'test@example.com',
        accountType: 'starter',
        customerId: 'invalid-customer-id' // Not Stripe format
      };

      const response = await request(app)
        .post('/api/webhooks/welcome')
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('customerId');
    });

    it('should validate Stripe subscription ID format (sub_*)', async () => {
      const payload = {
        email: 'test@example.com',
        accountType: 'starter',
        customerId: 'cus_test123',
        subscriptionId: 'invalid-sub-id' // Not Stripe format
      };

      const response = await request(app)
        .post('/api/webhooks/welcome')
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('subscriptionId');
    });

    it('should accept valid Stripe ID formats', async () => {
      const payload = {
        email: 'test@example.com',
        accountType: 'starter',
        customerId: 'cus_ABCDefgh1234567890ABCDEF', // Valid Stripe customer ID
        subscriptionId: 'sub_XYZabcde9876543210XYZABC' // Valid Stripe subscription ID
      };

      const response = await request(app)
        .post('/api/webhooks/welcome')
        .send(payload);

      // Should NOT reject due to ID format
      if (response.status === 400) {
        expect(response.body.error).not.toContain('customerId');
        expect(response.body.error).not.toContain('subscriptionId');
      }
    });
  });

  describe('TC-VAL-006: Numeric Field Validation', () => {
    it('should validate calories as positive integer', async () => {
      const payload = {
        email: 'test@example.com',
        mealPlanId: 'uuid-12345',
        calories: -500 // Negative calories invalid
      };

      const response = await request(app)
        .post('/api/webhooks/aha-moment')
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('calories');
    });

    it('should validate protein as positive integer', async () => {
      const payload = {
        email: 'test@example.com',
        mealPlanId: 'uuid-12345',
        calories: 2500,
        protein: 0 // Zero protein invalid
      };

      const response = await request(app)
        .post('/api/webhooks/aha-moment')
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('protein');
    });

    it('should reject string values for numeric fields', async () => {
      const payload = {
        email: 'test@example.com',
        mealPlanId: 'uuid-12345',
        calories: '2500', // String instead of number
        protein: 200
      };

      const response = await request(app)
        .post('/api/webhooks/aha-moment')
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('calories');
    });
  });

  describe('TC-VAL-007: UUID Validation', () => {
    it('should validate UUID format for mealPlanId', async () => {
      const payload = {
        email: 'test@example.com',
        mealPlanId: 'not-a-uuid', // Invalid UUID
        calories: 2500
      };

      const response = await request(app)
        .post('/api/webhooks/aha-moment')
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('mealPlanId');
    });

    it('should accept valid UUID v4 format', async () => {
      const payload = {
        email: 'test@example.com',
        mealPlanId: '123e4567-e89b-12d3-a456-426614174000', // Valid UUID v4
        calories: 2500
      };

      const response = await request(app)
        .post('/api/webhooks/aha-moment')
        .send(payload);

      // Should NOT reject due to UUID format
      if (response.status === 400) {
        expect(response.body.error).not.toContain('mealPlanId');
      }
    });
  });

  describe('TC-VAL-008: Timestamp Validation', () => {
    it('should validate ISO 8601 timestamp format', async () => {
      const payload = {
        email: 'test@example.com',
        leadSource: 'meal_plan_generator',
        timestamp: 'not-a-timestamp' // Invalid format
      };

      const response = await request(app)
        .post('/api/webhooks/lead-capture')
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('timestamp');
    });

    it('should accept valid ISO 8601 timestamp', async () => {
      const payload = {
        email: 'test@example.com',
        leadSource: 'meal_plan_generator',
        timestamp: new Date().toISOString() // Valid ISO 8601
      };

      const response = await request(app)
        .post('/api/webhooks/lead-capture')
        .send(payload);

      // Should NOT reject due to timestamp format
      if (response.status === 400) {
        expect(response.body.error).not.toContain('timestamp');
      }
    });
  });

  describe('TC-VAL-009: Payload Size Limits', () => {
    it('should reject extremely large payloads (> 1MB)', async () => {
      const payload = {
        email: 'test@example.com',
        leadSource: 'meal_plan_generator',
        data: 'x'.repeat(1024 * 1024 * 2) // 2MB payload
      };

      const response = await request(app)
        .post('/api/webhooks/lead-capture')
        .send(payload);

      expect(response.status).toBe(413); // Payload Too Large
    });

    it('should accept normal-sized payloads (< 100KB)', async () => {
      const payload = {
        email: 'test@example.com',
        leadSource: 'meal_plan_generator',
        data: 'x'.repeat(50000) // 50KB payload
      };

      const response = await request(app)
        .post('/api/webhooks/lead-capture')
        .send(payload);

      // Should NOT reject due to size
      expect(response.status).not.toBe(413);
    });
  });

  describe('TC-VAL-010: Special Characters and Edge Cases', () => {
    it('should handle emojis in firstName field', async () => {
      const payload = {
        email: 'test@example.com',
        firstName: 'Test 😀🎉',
        leadSource: 'meal_plan_generator'
      };

      const response = await request(app)
        .post('/api/webhooks/lead-capture')
        .send(payload);

      // Should either accept or sanitize emojis gracefully
      expect(response.status).not.toBe(500); // Should not crash server
    });

    it('should handle null bytes in input', async () => {
      const payload = {
        email: 'test@example.com',
        firstName: 'Test\x00Name', // Null byte
        leadSource: 'meal_plan_generator'
      };

      const response = await request(app)
        .post('/api/webhooks/lead-capture')
        .send(payload);

      // Should reject or sanitize null bytes
      if (response.status === 200 || response.status === 201) {
        expect(response.body.firstName).not.toContain('\x00');
      } else {
        expect(response.status).toBe(400);
      }
    });
  });
});
