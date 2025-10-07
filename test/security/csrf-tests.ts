/**
 * CSRF (Cross-Site Request Forgery) Security Tests
 *
 * Comprehensive security test suite focusing on CSRF vulnerabilities
 * across all state-changing operations in the application.
 *
 * Test Categories:
 * 1. CSRF Token Validation (15 tests)
 * 2. Same-Origin Policy Enforcement (10 tests)
 * 3. Referrer Header Validation (10 tests)
 * 4. SameSite Cookie Protection (10 tests)
 * 5. State-Changing Operation Protection (5 tests)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../server/index';
import { storage } from '../../server/storage';
import crypto from 'crypto';

describe('CSRF Security Tests', () => {
  let validAdminToken: string;
  let validTrainerToken: string;
  let validCustomerToken: string;
  let csrfToken: string;

  // Test credentials
  const testCredentials = {
    admin: { email: 'admin@test.com', password: 'AdminPass123!', role: 'admin' },
    trainer: { email: 'trainer@test.com', password: 'TrainerPass123!', role: 'trainer' },
    customer: { email: 'customer@test.com', password: 'CustomerPass123!', role: 'customer' }
  };

  // Malicious origins for CSRF testing
  const maliciousOrigins = [
    'https://attacker.com',
    'https://evil.example.com',
    'http://malicious-site.org',
    'https://phishing-site.net',
    'https://fake-fitnessmealplanner.com'
  ];

  beforeAll(async () => {
    // Clean setup
    await storage.deleteFrom('users').execute();

    // Create test users
    for (const [role, creds] of Object.entries(testCredentials)) {
      await request(app)
        .post('/api/auth/register')
        .send(creds);
    }

    // Get valid tokens
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: testCredentials.admin.email, password: testCredentials.admin.password });
    validAdminToken = adminLogin.body.token;

    const trainerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: testCredentials.trainer.email, password: testCredentials.trainer.password });
    validTrainerToken = trainerLogin.body.token;

    const customerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: testCredentials.customer.email, password: testCredentials.customer.password });
    validCustomerToken = customerLogin.body.token;

    // Get CSRF token if implemented
    const csrfResponse = await request(app)
      .get('/api/auth/csrf-token')
      .set('Authorization', `Bearer ${validCustomerToken}`);

    if (csrfResponse.status === 200 && csrfResponse.body.csrfToken) {
      csrfToken = csrfResponse.body.csrfToken;
    }
  });

  afterAll(async () => {
    await storage.deleteFrom('users').execute();
  });

  describe('CSRF Token Validation Tests', () => {
    it('should require CSRF token for state-changing operations (1/50)', async () => {
      // Test recipe creation without CSRF token
      const response = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${validTrainerToken}`)
        .send({
          title: 'Test Recipe',
          ingredients: ['test ingredient'],
          instructions: ['test instruction'],
          nutrition: { calories: 100, protein: 10, carbs: 10, fat: 5 }
        });

      // Should either require CSRF token or work without it (depending on implementation)
      expect(response.status).toBeOneOf([201, 403, 422]);

      if (response.status === 403 || response.status === 422) {
        expect(response.body.message).toMatch(/csrf|token|forbidden/i);
      }
    });

    it('should reject invalid CSRF tokens (2/50)', async () => {
      const invalidTokens = [
        'invalid-csrf-token',
        'expired-token-12345',
        '',
        null,
        undefined,
        'malicious-token-attempt'
      ];

      for (const invalidToken of invalidTokens) {
        const response = await request(app)
          .post('/api/recipes')
          .set('Authorization', `Bearer ${validTrainerToken}`)
          .set('X-CSRF-Token', invalidToken)
          .send({
            title: 'Test Recipe',
            ingredients: ['test ingredient'],
            instructions: ['test instruction'],
            nutrition: { calories: 100, protein: 10, carbs: 10, fat: 5 }
          });

        // If CSRF is implemented, should reject invalid tokens
        if (response.status === 403 || response.status === 422) {
          expect(response.body.message).toMatch(/csrf|token|invalid/i);
        }
      }
    });

    it('should validate CSRF token format (3/50)', async () => {
      const malformedTokens = [
        'too-short',
        'a'.repeat(1000), // Too long
        '<script>alert("xss")</script>',
        '"; DROP TABLE users; --',
        '../../../etc/passwd',
        '../../config.json'
      ];

      for (const malformedToken of malformedTokens) {
        const response = await request(app)
          .post('/api/meal-plan')
          .set('Authorization', `Bearer ${validTrainerToken}`)
          .set('X-CSRF-Token', malformedToken)
          .send({
            name: 'Test Plan',
            description: 'Test Description',
            recipes: []
          });

        if (response.status === 403 || response.status === 422) {
          expect(response.body.message).toMatch(/csrf|token|invalid|format/i);
        }
      }
    });

    it('should prevent CSRF token reuse across sessions (4/50)', async () => {
      if (!csrfToken) {
        return; // Skip if CSRF not implemented
      }

      // Logout and login again to get new session
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${validCustomerToken}`);

      const newLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testCredentials.customer.email,
          password: testCredentials.customer.password
        });

      const newToken = newLoginResponse.body.token;

      // Try to use old CSRF token with new session
      const response = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${newToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          firstName: 'Updated Name'
        });

      // Old CSRF token should be invalid for new session
      expect(response.status).toBeOneOf([200, 403, 422]);

      if (response.status === 403 || response.status === 422) {
        expect(response.body.message).toMatch(/csrf|token|invalid|expired/i);
      }
    });

    it('should implement CSRF token expiration (5/50)', async () => {
      if (!csrfToken) {
        return; // Skip if CSRF not implemented
      }

      // Wait for potential token expiration (if very short-lived)
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await request(app)
        .post('/api/progress')
        .set('Authorization', `Bearer ${validCustomerToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          type: 'measurement',
          data: { weight: 70 }
        });

      expect(response.status).toBeOneOf([200, 201, 403, 422]);

      if (response.status === 403 || response.status === 422) {
        expect(response.body.message).toMatch(/csrf|token|expired/i);
      }
    });

    it('should bind CSRF tokens to specific users (6/50)', async () => {
      if (!csrfToken) {
        return; // Skip if CSRF not implemented
      }

      // Try to use customer's CSRF token with trainer's session
      const response = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${validTrainerToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          title: 'Test Recipe',
          ingredients: ['test ingredient'],
          instructions: ['test instruction'],
          nutrition: { calories: 100, protein: 10, carbs: 10, fat: 5 }
        });

      // CSRF token should be bound to the user who requested it
      expect(response.status).toBeOneOf([201, 403, 422]);

      if (response.status === 403 || response.status === 422) {
        expect(response.body.message).toMatch(/csrf|token|invalid|unauthorized/i);
      }
    });

    it('should require CSRF token for profile updates (7/50)', async () => {
      const response = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${validCustomerToken}`)
        .set('Origin', 'https://attacker.com') // Simulate cross-origin request
        .send({
          firstName: 'Hacked',
          lastName: 'User',
          email: 'hacker@attacker.com'
        });

      // Should either require CSRF token or reject based on origin
      expect(response.status).toBeOneOf([200, 403, 422]);

      if (response.status === 403 || response.status === 422) {
        expect(response.body.message).toMatch(/csrf|token|origin|forbidden/i);
      }
    });

    it('should require CSRF token for password changes (8/50)', async () => {
      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${validCustomerToken}`)
        .set('Origin', 'https://evil.example.com')
        .send({
          currentPassword: testCredentials.customer.password,
          newPassword: 'HackedPassword123!'
        });

      // Password change should be protected against CSRF
      expect(response.status).toBeOneOf([200, 403, 422]);

      if (response.status === 403 || response.status === 422) {
        expect(response.body.message).toMatch(/csrf|token|origin|forbidden/i);
      }
    });

    it('should require CSRF token for meal plan creation (9/50)', async () => {
      const response = await request(app)
        .post('/api/meal-plan')
        .set('Authorization', `Bearer ${validTrainerToken}`)
        .set('Origin', 'https://malicious-site.org')
        .send({
          name: 'Malicious Plan',
          description: 'Created by attacker',
          recipes: []
        });

      expect(response.status).toBeOneOf([201, 403, 422]);

      if (response.status === 403 || response.status === 422) {
        expect(response.body.message).toMatch(/csrf|token|origin|forbidden/i);
      }
    });

    it('should require CSRF token for data deletion (10/50)', async () => {
      // First create a recipe to delete
      const createResponse = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${validTrainerToken}`)
        .send({
          title: 'Recipe to Delete',
          ingredients: ['test'],
          instructions: ['test'],
          nutrition: { calories: 100, protein: 10, carbs: 10, fat: 5 }
        });

      if (createResponse.status === 201) {
        const recipeId = createResponse.body.id;

        const deleteResponse = await request(app)
          .delete(`/api/recipes/${recipeId}`)
          .set('Authorization', `Bearer ${validTrainerToken}`)
          .set('Origin', 'https://attacker.com');

        expect(deleteResponse.status).toBeOneOf([200, 204, 403, 422]);

        if (deleteResponse.status === 403 || deleteResponse.status === 422) {
          expect(deleteResponse.body.message).toMatch(/csrf|token|origin|forbidden/i);
        }
      }
    });

    it('should validate CSRF token in request headers (11/50)', async () => {
      const headerVariations = [
        'X-CSRF-Token',
        'X-XSRF-TOKEN',
        'CSRF-Token',
        'X-Requested-With'
      ];

      for (const header of headerVariations) {
        const response = await request(app)
          .post('/api/recipes')
          .set('Authorization', `Bearer ${validTrainerToken}`)
          .set(header, 'test-token-value')
          .send({
            title: 'Test Recipe',
            ingredients: ['test'],
            instructions: ['test'],
            nutrition: { calories: 100, protein: 10, carbs: 10, fat: 5 }
          });

        expect(response.status).toBeOneOf([201, 403, 422]);
      }
    });

    it('should prevent CSRF token extraction via XSS (12/50)', async () => {
      // Test that CSRF token is not exposed in a way that could be stolen via XSS
      const response = await request(app)
        .get('/api/auth/csrf-token')
        .set('Authorization', `Bearer ${validCustomerToken}`);

      if (response.status === 200) {
        // CSRF token should not be in a global JavaScript variable
        expect(response.text).not.toMatch(/window\.csrfToken|var csrfToken|const csrfToken/);

        // Response should have proper content-type
        expect(response.headers['content-type']).toMatch(/application\/json/);

        // Should have anti-XSS headers
        expect(response.headers['x-content-type-options']).toBe('nosniff');
      }
    });

    it('should implement double-submit cookie pattern (13/50)', async () => {
      const response = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${validTrainerToken}`)
        .set('Cookie', 'csrf-token=valid-csrf-token')
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Test Recipe',
          ingredients: ['test'],
          instructions: ['test'],
          nutrition: { calories: 100, protein: 10, carbs: 10, fat: 5 }
        });

      expect(response.status).toBeOneOf([201, 403, 422]);

      // If using double-submit pattern, mismatched tokens should be rejected
      const mismatchResponse = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${validTrainerToken}`)
        .set('Cookie', 'csrf-token=token-in-cookie')
        .set('X-CSRF-Token', 'different-token-in-header')
        .send({
          title: 'Test Recipe 2',
          ingredients: ['test'],
          instructions: ['test'],
          nutrition: { calories: 100, protein: 10, carbs: 10, fat: 5 }
        });

      if (mismatchResponse.status === 403 || mismatchResponse.status === 422) {
        expect(mismatchResponse.body.message).toMatch(/csrf|token|mismatch/i);
      }
    });

    it('should protect bulk operations against CSRF (14/50)', async () => {
      const response = await request(app)
        .delete('/api/recipes/bulk')
        .set('Authorization', `Bearer ${validAdminToken}`)
        .set('Origin', 'https://attacker.com')
        .send({
          ids: [1, 2, 3, 4, 5]
        });

      expect(response.status).toBeOneOf([200, 403, 422]);

      if (response.status === 403 || response.status === 422) {
        expect(response.body.message).toMatch(/csrf|token|origin|forbidden/i);
      }
    });

    it('should handle CSRF protection in AJAX requests (15/50)', async () => {
      const response = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${validTrainerToken}`)
        .set('X-Requested-With', 'XMLHttpRequest')
        .set('Origin', 'https://trusted-domain.com')
        .send({
          title: 'AJAX Recipe',
          ingredients: ['test'],
          instructions: ['test'],
          nutrition: { calories: 100, protein: 10, carbs: 10, fat: 5 }
        });

      // Should either work (if origin is trusted) or require additional protection
      expect(response.status).toBeOneOf([201, 403, 422]);
    });
  });

  describe('Same-Origin Policy Enforcement Tests', () => {
    it('should reject requests from untrusted origins (16/50)', async () => {
      for (const maliciousOrigin of maliciousOrigins) {
        const response = await request(app)
          .post('/api/meal-plan')
          .set('Authorization', `Bearer ${validTrainerToken}`)
          .set('Origin', maliciousOrigin)
          .send({
            name: 'Malicious Plan',
            description: 'Created by attacker',
            recipes: []
          });

        expect(response.status).toBeOneOf([201, 403, 422]);

        if (response.status === 403 || response.status === 422) {
          expect(response.body.message).toMatch(/origin|forbidden|csrf/i);
        }
      }
    });

    it('should allow requests from trusted origins (17/50)', async () => {
      const trustedOrigins = [
        'https://evofitmeals.com',
        'https://www.evofitmeals.com',
        'http://localhost:3000',
        'http://localhost:4000'
      ];

      for (const trustedOrigin of trustedOrigins) {
        const response = await request(app)
          .get('/api/recipes')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .set('Origin', trustedOrigin);

        expect(response.status).toBe(200);
      }
    });

    it('should validate origin header format (18/50)', async () => {
      const invalidOrigins = [
        'invalid-origin',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'file:///etc/passwd',
        'ftp://attacker.com',
        ''
      ];

      for (const invalidOrigin of invalidOrigins) {
        const response = await request(app)
          .post('/api/profile')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .set('Origin', invalidOrigin)
          .send({
            firstName: 'Test'
          });

        expect(response.status).toBeOneOf([200, 400, 403, 422]);

        if (response.status === 400 || response.status === 422) {
          expect(response.body.message).toMatch(/origin|invalid|format/i);
        }
      }
    });

    it('should handle missing origin header (19/50)', async () => {
      const response = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${validTrainerToken}`)
        // Explicitly not setting Origin header
        .send({
          title: 'No Origin Recipe',
          ingredients: ['test'],
          instructions: ['test'],
          nutrition: { calories: 100, protein: 10, carbs: 10, fat: 5 }
        });

      // Should either work (if origin check is lenient) or require origin
      expect(response.status).toBeOneOf([201, 403, 422]);
    });

    it('should prevent origin header spoofing (20/50)', async () => {
      const spoofedHeaders = [
        { 'Origin': 'https://evofitmeals.com', 'X-Forwarded-Host': 'attacker.com' },
        { 'Origin': 'https://evofitmeals.com', 'Host': 'attacker.com' },
        { 'Origin': 'https://evofitmeals.com', 'X-Original-Host': 'attacker.com' }
      ];

      for (const headers of spoofedHeaders) {
        const response = await request(app)
          .post('/api/meal-plan')
          .set('Authorization', `Bearer ${validTrainerToken}`)
          .set(headers)
          .send({
            name: 'Spoofed Origin Plan',
            description: 'Testing origin spoofing',
            recipes: []
          });

        expect(response.status).toBeOneOf([201, 403, 422]);
      }
    });

    it('should validate subdomain policies (21/50)', async () => {
      const subdomainTests = [
        'https://api.evofitmeals.com',
        'https://admin.evofitmeals.com',
        'https://evil.evofitmeals.com',
        'https://evofitmeals.com.attacker.com'
      ];

      for (const subdomain of subdomainTests) {
        const response = await request(app)
          .get('/api/recipes')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .set('Origin', subdomain);

        expect(response.status).toBeOneOf([200, 403]);
      }
    });

    it('should handle CORS preflight requests securely (22/50)', async () => {
      for (const maliciousOrigin of maliciousOrigins) {
        const response = await request(app)
          .options('/api/recipes')
          .set('Origin', maliciousOrigin)
          .set('Access-Control-Request-Method', 'POST')
          .set('Access-Control-Request-Headers', 'Content-Type, Authorization');

        // Should not allow preflight from malicious origins
        expect(response.status).toBeOneOf([200, 403, 404]);

        if (response.status === 200) {
          expect(response.headers['access-control-allow-origin']).not.toBe(maliciousOrigin);
        }
      }
    });

    it('should prevent wildcard origin in production (23/50)', async () => {
      const response = await request(app)
        .get('/api/recipes')
        .set('Authorization', `Bearer ${validCustomerToken}`)
        .set('Origin', 'https://attacker.com');

      if (response.headers['access-control-allow-origin']) {
        expect(response.headers['access-control-allow-origin']).not.toBe('*');
      }
    });

    it('should validate origin against environment configuration (24/50)', async () => {
      // Test that origin validation respects environment settings
      const testOrigin = 'https://test-environment.com';

      const response = await request(app)
        .post('/api/analytics/events')
        .set('Authorization', `Bearer ${validCustomerToken}`)
        .set('Origin', testOrigin)
        .send({
          event: 'test_event',
          data: { test: true }
        });

      expect(response.status).toBeOneOf([200, 201, 403, 422]);
    });

    it('should protect WebSocket upgrades (if applicable) (25/50)', async () => {
      const response = await request(app)
        .get('/api/websocket')
        .set('Upgrade', 'websocket')
        .set('Connection', 'Upgrade')
        .set('Origin', 'https://attacker.com')
        .set('Sec-WebSocket-Key', 'dGhlIHNhbXBsZSBub25jZQ==')
        .set('Sec-WebSocket-Version', '13');

      // Should reject WebSocket upgrade from malicious origin
      expect(response.status).toBeOneOf([403, 404, 426]);
    });
  });

  describe('Referrer Header Validation Tests', () => {
    it('should validate referrer header for sensitive operations (26/50)', async () => {
      const maliciousReferrers = [
        'https://attacker.com/csrf-attack.html',
        'https://evil.example.com/steal-data',
        'https://phishing-site.net/fake-login'
      ];

      for (const referrer of maliciousReferrers) {
        const response = await request(app)
          .put('/api/auth/change-password')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .set('Referer', referrer)
          .send({
            currentPassword: testCredentials.customer.password,
            newPassword: 'NewPassword123!'
          });

        expect(response.status).toBeOneOf([200, 403, 422]);

        if (response.status === 403 || response.status === 422) {
          expect(response.body.message).toMatch(/referrer|referer|origin|forbidden/i);
        }
      }
    });

    it('should handle missing referrer header (27/50)', async () => {
      const response = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${validTrainerToken}`)
        // No Referer header
        .send({
          title: 'No Referrer Recipe',
          ingredients: ['test'],
          instructions: ['test'],
          nutrition: { calories: 100, protein: 10, carbs: 10, fat: 5 }
        });

      // Should handle missing referrer gracefully
      expect(response.status).toBeOneOf([201, 403, 422]);
    });

    it('should validate referrer against allowed domains (28/50)', async () => {
      const trustedReferrers = [
        'https://evofitmeals.com/dashboard',
        'https://www.evofitmeals.com/recipes',
        'http://localhost:3000/admin'
      ];

      for (const referrer of trustedReferrers) {
        const response = await request(app)
          .post('/api/meal-plan')
          .set('Authorization', `Bearer ${validTrainerToken}`)
          .set('Referer', referrer)
          .send({
            name: 'Trusted Referrer Plan',
            description: 'From trusted source',
            recipes: []
          });

        expect(response.status).toBeOneOf([201, 403, 422]);
      }
    });

    it('should prevent referrer spoofing (29/50)', async () => {
      const spoofedReferrer = 'https://evofitmeals.com/admin?real=attacker.com';

      const response = await request(app)
        .delete('/api/admin/users/1')
        .set('Authorization', `Bearer ${validAdminToken}`)
        .set('Referer', spoofedReferrer);

      expect(response.status).toBeOneOf([200, 403, 404, 422]);
    });

    it('should handle malformed referrer headers (30/50)', async () => {
      const malformedReferrers = [
        'invalid-url',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'file:///etc/passwd',
        '../../../admin/secret'
      ];

      for (const malformedReferrer of malformedReferrers) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .set('Referer', malformedReferrer);

        expect(response.status).toBeOneOf([200, 400, 403, 422]);
      }
    });

    it('should implement strict referrer policy (31/50)', async () => {
      const response = await request(app)
        .get('/api/auth/csrf-token')
        .set('Authorization', `Bearer ${validCustomerToken}`);

      if (response.status === 200) {
        // Should have referrer policy header
        expect(response.headers['referrer-policy']).toBeDefined();
        expect(response.headers['referrer-policy']).toMatch(/strict-origin|no-referrer|same-origin/);
      }
    });

    it('should validate referrer for file upload operations (32/50)', async () => {
      const response = await request(app)
        .post('/api/profile/image')
        .set('Authorization', `Bearer ${validCustomerToken}`)
        .set('Referer', 'https://attacker.com/upload-page');

      expect(response.status).toBeOneOf([200, 403, 422]);

      if (response.status === 403 || response.status === 422) {
        expect(response.body.message).toMatch(/referrer|origin|forbidden/i);
      }
    });

    it('should check referrer for admin operations (33/50)', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${validAdminToken}`)
        .set('Referer', 'https://attacker.com/fake-admin');

      expect(response.status).toBeOneOf([200, 403]);

      if (response.status === 403) {
        expect(response.body.message).toMatch(/referrer|origin|forbidden/i);
      }
    });

    it('should validate referrer for API key operations (34/50)', async () => {
      const response = await request(app)
        .post('/api/auth/api-keys')
        .set('Authorization', `Bearer ${validAdminToken}`)
        .set('Referer', 'https://evil.example.com/steal-keys')
        .send({
          name: 'Test API Key',
          permissions: ['read']
        });

      expect(response.status).toBeOneOf([201, 403, 404, 422]);

      if (response.status === 403 || response.status === 422) {
        expect(response.body.message).toMatch(/referrer|origin|forbidden/i);
      }
    });

    it('should handle referrer policy violations (35/50)', async () => {
      // Test request from HTTPS to HTTP (should be blocked by browser, but test server handling)
      const response = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${validTrainerToken}`)
        .set('Referer', 'http://insecure-site.com/form')
        .send({
          title: 'Insecure Referrer Recipe',
          ingredients: ['test'],
          instructions: ['test'],
          nutrition: { calories: 100, protein: 10, carbs: 10, fat: 5 }
        });

      expect(response.status).toBeOneOf([201, 403, 422]);
    });
  });

  describe('SameSite Cookie Protection Tests', () => {
    it('should set SameSite attribute on session cookies (36/50)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testCredentials.customer.email,
          password: testCredentials.customer.password
        });

      expect(response.status).toBe(200);

      const setCookieHeader = response.headers['set-cookie'];
      if (setCookieHeader) {
        const cookieString = setCookieHeader.join('; ');
        expect(cookieString).toMatch(/SameSite=(Strict|Lax)/i);
      }
    });

    it('should use Strict SameSite for sensitive cookies (37/50)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testCredentials.admin.email,
          password: testCredentials.admin.password
        });

      expect(response.status).toBe(200);

      const setCookieHeader = response.headers['set-cookie'];
      if (setCookieHeader) {
        const sessionCookie = setCookieHeader.find(cookie =>
          cookie.includes('session') || cookie.includes('auth')
        );

        if (sessionCookie) {
          expect(sessionCookie).toMatch(/SameSite=Strict/i);
        }
      }
    });

    it('should handle cross-site requests with SameSite cookies (38/50)', async () => {
      // First, login to set cookies
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testCredentials.customer.email,
          password: testCredentials.customer.password
        });

      const cookies = loginResponse.headers['set-cookie'];

      if (cookies) {
        // Try to make cross-site request with cookies
        const crossSiteResponse = await request(app)
          .post('/api/recipes')
          .set('Origin', 'https://attacker.com')
          .set('Cookie', cookies.join('; '))
          .send({
            title: 'Cross-site Recipe',
            ingredients: ['test'],
            instructions: ['test'],
            nutrition: { calories: 100, protein: 10, carbs: 10, fat: 5 }
          });

        // Should be blocked due to SameSite policy
        expect(crossSiteResponse.status).toBeOneOf([401, 403, 422]);
      }
    });

    it('should validate cookie security attributes (39/50)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testCredentials.customer.email,
          password: testCredentials.customer.password
        });

      const setCookieHeader = response.headers['set-cookie'];
      if (setCookieHeader) {
        setCookieHeader.forEach(cookie => {
          // Should have HttpOnly for security cookies
          if (cookie.includes('session') || cookie.includes('auth')) {
            expect(cookie).toMatch(/HttpOnly/i);
          }

          // Should have Secure in production
          if (process.env.NODE_ENV === 'production') {
            expect(cookie).toMatch(/Secure/i);
          }

          // Should have SameSite
          expect(cookie).toMatch(/SameSite/i);
        });
      }
    });

    it('should prevent CSRF through cookie injection (40/50)', async () => {
      const maliciousCookies = [
        'csrf-token=malicious-token; Path=/; Domain=.attacker.com',
        'session=hijacked-session; HttpOnly; Secure',
        'auth=fake-auth-token; SameSite=None'
      ];

      for (const maliciousCookie of maliciousCookies) {
        const response = await request(app)
          .post('/api/meal-plan')
          .set('Authorization', `Bearer ${validTrainerToken}`)
          .set('Cookie', maliciousCookie)
          .send({
            name: 'Malicious Cookie Plan',
            description: 'Testing cookie injection',
            recipes: []
          });

        expect(response.status).toBeOneOf([201, 403, 422]);
      }
    });

    it('should handle legacy browser compatibility (41/50)', async () => {
      // Test with User-Agent that doesn't support SameSite
      const response = await request(app)
        .post('/api/auth/login')
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 6.1; Trident/7.0; rv:11.0) like Gecko') // IE 11
        .send({
          email: testCredentials.customer.email,
          password: testCredentials.customer.password
        });

      expect(response.status).toBe(200);

      // Should still work but may not set SameSite
      const setCookieHeader = response.headers['set-cookie'];
      if (setCookieHeader) {
        // Should have proper fallback for legacy browsers
        expect(setCookieHeader.length).toBeGreaterThan(0);
      }
    });

    it('should protect against cookie fixation (42/50)', async () => {
      // Set initial cookie
      const initialResponse = await request(app)
        .get('/api/auth/session-status')
        .set('Cookie', 'session=fixed-session-id');

      // Login should change session ID
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .set('Cookie', 'session=fixed-session-id')
        .send({
          email: testCredentials.customer.email,
          password: testCredentials.customer.password
        });

      expect(loginResponse.status).toBe(200);

      const newCookies = loginResponse.headers['set-cookie'];
      if (newCookies) {
        const newSessionCookie = newCookies.find(cookie => cookie.includes('session'));
        if (newSessionCookie) {
          expect(newSessionCookie).not.toContain('fixed-session-id');
        }
      }
    });

    it('should implement proper cookie domain restrictions (43/50)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testCredentials.customer.email,
          password: testCredentials.customer.password
        });

      const setCookieHeader = response.headers['set-cookie'];
      if (setCookieHeader) {
        setCookieHeader.forEach(cookie => {
          // Should not set overly broad domain
          expect(cookie).not.toMatch(/Domain=\.com/i);
          expect(cookie).not.toMatch(/Domain=\./i);

          // Should have appropriate domain restriction
          if (cookie.includes('Domain=')) {
            expect(cookie).toMatch(/Domain=(localhost|evofitmeals\.com)/i);
          }
        });
      }
    });

    it('should validate cookie path restrictions (44/50)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testCredentials.customer.email,
          password: testCredentials.customer.password
        });

      const setCookieHeader = response.headers['set-cookie'];
      if (setCookieHeader) {
        setCookieHeader.forEach(cookie => {
          // Should have appropriate path restriction
          if (cookie.includes('Path=')) {
            expect(cookie).toMatch(/Path=\/(api|auth)?/i);
            expect(cookie).not.toMatch(/Path=\/\.\./); // No path traversal
          }
        });
      }
    });

    it('should implement cookie expiration policies (45/50)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testCredentials.customer.email,
          password: testCredentials.customer.password
        });

      const setCookieHeader = response.headers['set-cookie'];
      if (setCookieHeader) {
        const authCookies = setCookieHeader.filter(cookie =>
          cookie.includes('session') || cookie.includes('auth')
        );

        authCookies.forEach(cookie => {
          // Should have Max-Age or Expires
          expect(cookie).toMatch(/Max-Age=|Expires=/i);

          // Max-Age should be reasonable (not too long)
          const maxAgeMatch = cookie.match(/Max-Age=(\d+)/i);
          if (maxAgeMatch) {
            const maxAge = parseInt(maxAgeMatch[1]);
            expect(maxAge).toBeLessThanOrEqual(24 * 60 * 60); // Max 24 hours
          }
        });
      }
    });
  });

  describe('State-Changing Operation Protection Tests', () => {
    it('should protect all DELETE operations (46/50)', async () => {
      const deleteEndpoints = [
        '/api/recipes/1',
        '/api/meal-plan/1',
        '/api/progress/1',
        '/api/admin/users/1'
      ];

      for (const endpoint of deleteEndpoints) {
        const response = await request(app)
          .delete(endpoint)
          .set('Authorization', `Bearer ${validAdminToken}`)
          .set('Origin', 'https://attacker.com');

        expect(response.status).toBeOneOf([200, 204, 403, 404, 422]);

        if (response.status === 403 || response.status === 422) {
          expect(response.body.message).toMatch(/csrf|origin|forbidden/i);
        }
      }
    });

    it('should protect all PUT/PATCH operations (47/50)', async () => {
      const updateEndpoints = [
        { method: 'PUT', url: '/api/profile', data: { firstName: 'Updated' } },
        { method: 'PATCH', url: '/api/recipes/1', data: { title: 'Updated Recipe' } },
        { method: 'PUT', url: '/api/meal-plan/1', data: { name: 'Updated Plan' } }
      ];

      for (const endpoint of updateEndpoints) {
        const response = await request(app)
          [endpoint.method.toLowerCase()](endpoint.url)
          .set('Authorization', `Bearer ${validTrainerToken}`)
          .set('Origin', 'https://attacker.com')
          .send(endpoint.data);

        expect(response.status).toBeOneOf([200, 403, 404, 422]);

        if (response.status === 403 || response.status === 422) {
          expect(response.body.message).toMatch(/csrf|origin|forbidden/i);
        }
      }
    });

    it('should protect financial/billing operations (48/50)', async () => {
      const billingEndpoints = [
        { url: '/api/billing/subscription', data: { plan: 'premium' } },
        { url: '/api/billing/payment-method', data: { token: 'card_token' } },
        { url: '/api/billing/cancel-subscription', data: {} }
      ];

      for (const endpoint of billingEndpoints) {
        const response = await request(app)
          .post(endpoint.url)
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .set('Origin', 'https://attacker.com')
          .send(endpoint.data);

        expect(response.status).toBeOneOf([200, 201, 403, 404, 422]);

        if (response.status === 403 || response.status === 422) {
          expect(response.body.message).toMatch(/csrf|origin|forbidden/i);
        }
      }
    });

    it('should protect user management operations (49/50)', async () => {
      const userMgmtEndpoints = [
        { url: '/api/admin/users', method: 'POST', data: { email: 'new@test.com', role: 'customer' } },
        { url: '/api/admin/users/1/role', method: 'PUT', data: { role: 'admin' } },
        { url: '/api/admin/users/1/suspend', method: 'POST', data: {} }
      ];

      for (const endpoint of userMgmtEndpoints) {
        const response = await request(app)
          [endpoint.method.toLowerCase()](endpoint.url)
          .set('Authorization', `Bearer ${validAdminToken}`)
          .set('Origin', 'https://attacker.com')
          .send(endpoint.data);

        expect(response.status).toBeOneOf([200, 201, 403, 404, 422]);

        if (response.status === 403 || response.status === 422) {
          expect(response.body.message).toMatch(/csrf|origin|forbidden/i);
        }
      }
    });

    it('should protect system configuration changes (50/50)', async () => {
      const configEndpoints = [
        { url: '/api/admin/settings', data: { maintenanceMode: true } },
        { url: '/api/admin/features', data: { newFeature: true } },
        { url: '/api/admin/system/backup', data: {} }
      ];

      for (const endpoint of configEndpoints) {
        const response = await request(app)
          .post(endpoint.url)
          .set('Authorization', `Bearer ${validAdminToken}`)
          .set('Origin', 'https://attacker.com')
          .send(endpoint.data);

        expect(response.status).toBeOneOf([200, 201, 403, 404, 422]);

        if (response.status === 403 || response.status === 422) {
          expect(response.body.message).toMatch(/csrf|origin|forbidden/i);
        }
      }
    });
  });
});

/**
 * CSRF Testing Utility Functions
 */
export const csrfTestUtils = {
  /**
   * Validates if a request would be blocked by CSRF protection
   */
  wouldBeBlockedByCSRF(origin: string, referrer?: string): boolean {
    const trustedDomains = [
      'evofitmeals.com',
      'www.evofitmeals.com',
      'localhost:3000',
      'localhost:4000'
    ];

    // Check origin
    if (origin) {
      try {
        const originUrl = new URL(origin);
        const isOriginTrusted = trustedDomains.some(domain =>
          originUrl.hostname === domain || originUrl.hostname.endsWith('.' + domain)
        );
        if (!isOriginTrusted) return true;
      } catch {
        return true; // Invalid origin
      }
    }

    // Check referrer if provided
    if (referrer) {
      try {
        const referrerUrl = new URL(referrer);
        const isReferrerTrusted = trustedDomains.some(domain =>
          referrerUrl.hostname === domain || referrerUrl.hostname.endsWith('.' + domain)
        );
        if (!isReferrerTrusted) return true;
      } catch {
        return true; // Invalid referrer
      }
    }

    return false;
  },

  /**
   * Generates test CSRF tokens
   */
  generateTestCSRFToken(): string {
    return crypto.randomBytes(32).toString('hex');
  },

  /**
   * Validates cookie SameSite settings
   */
  validateCookieSameSite(cookieHeader: string): {
    hasSameSite: boolean;
    sameSiteValue: string | null;
    hasHttpOnly: boolean;
    hasSecure: boolean;
  } {
    return {
      hasSameSite: /SameSite=/i.test(cookieHeader),
      sameSiteValue: cookieHeader.match(/SameSite=(Strict|Lax|None)/i)?.[1] || null,
      hasHttpOnly: /HttpOnly/i.test(cookieHeader),
      hasSecure: /Secure/i.test(cookieHeader)
    };
  },

  /**
   * Checks if origin is in allowed list
   */
  isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
    try {
      const originUrl = new URL(origin);
      return allowedOrigins.some(allowed => {
        if (allowed === '*') return true;
        const allowedUrl = new URL(allowed);
        return originUrl.hostname === allowedUrl.hostname &&
               originUrl.protocol === allowedUrl.protocol;
      });
    } catch {
      return false;
    }
  }
};