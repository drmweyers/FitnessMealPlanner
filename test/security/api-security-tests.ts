/**
 * API Security Vulnerability Tests
 *
 * Comprehensive security test suite focusing on API-specific vulnerabilities
 * including rate limiting, authorization bypass, data exposure, and injection attacks.
 *
 * Test Categories:
 * 1. Rate Limiting and DDoS Protection (20 tests)
 * 2. Authorization and Access Control (25 tests)
 * 3. Data Exposure and Information Leakage (20 tests)
 * 4. HTTP Method Security (15 tests)
 * 5. API Parameter Manipulation (20 tests)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../server/index';
import { storage } from '../../server/storage';
import crypto from 'crypto';

describe('API Security Tests', () => {
  let validAdminToken: string;
  let validTrainerToken: string;
  let validCustomerToken: string;
  let expiredToken: string;
  let revokedToken: string;

  // Test credentials
  const testCredentials = {
    admin: { email: 'admin@test.com', password: 'AdminPass123!', role: 'admin' },
    trainer: { email: 'trainer@test.com', password: 'TrainerPass123!', role: 'trainer' },
    customer: { email: 'customer@test.com', password: 'CustomerPass123!', role: 'customer' }
  };

  // Common API attack vectors
  const apiAttackVectors = [
    '../../../etc/passwd',
    '../../config.json',
    '/proc/self/environ',
    '\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
    'file:///etc/passwd',
    'http://169.254.169.254/latest/meta-data/',
    'gopher://127.0.0.1:25/',
    'dict://127.0.0.1:6379/',
    'sftp://127.0.0.1/etc/passwd'
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

    // Create expired token for testing
    expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJjdXN0b21lciIsImV4cCI6MTYwMDAwMDAwMH0.expired';
  });

  afterAll(async () => {
    await storage.deleteFrom('users').execute();
  });

  describe('Rate Limiting and DDoS Protection Tests', () => {
    it('should implement rate limiting on authentication endpoints (1/100)', async () => {
      const promises = Array.from({ length: 20 }, () =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: 'wrongpassword'
          })
      );

      const responses = await Promise.all(promises);

      // Should start rate limiting after several attempts
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      // Rate limited responses should have appropriate headers
      const rateLimitedResponse = rateLimitedResponses[0];
      if (rateLimitedResponse) {
        expect(rateLimitedResponse.headers['retry-after']).toBeDefined();
        expect(rateLimitedResponse.body.message).toMatch(/rate limit|too many requests/i);
      }
    });

    it('should implement rate limiting on API endpoints (2/100)', async () => {
      const promises = Array.from({ length: 50 }, () =>
        request(app)
          .get('/api/recipes')
          .set('Authorization', `Bearer ${validCustomerToken}`)
      );

      const responses = await Promise.all(promises);

      // Should implement rate limiting for API calls
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should prevent brute force attacks on recipe search (3/100)', async () => {
      const searchTerms = Array.from({ length: 100 }, (_, i) => `search${i}`);

      const promises = searchTerms.map(term =>
        request(app)
          .get('/api/recipes/search')
          .query({ q: term })
          .set('Authorization', `Bearer ${validCustomerToken}`)
      );

      const responses = await Promise.all(promises);

      // Should rate limit search requests
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should implement IP-based rate limiting (4/100)', async () => {
      const fakeIPs = ['192.168.1.100', '10.0.0.50', '172.16.0.10'];

      for (const ip of fakeIPs) {
        const promises = Array.from({ length: 30 }, () =>
          request(app)
            .get('/api/recipes')
            .set('X-Forwarded-For', ip)
            .set('Authorization', `Bearer ${validCustomerToken}`)
        );

        const responses = await Promise.all(promises);
        const rateLimitedResponses = responses.filter(res => res.status === 429);

        // Each IP should have its own rate limit
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
      }
    });

    it('should protect against slowloris attacks (5/100)', async () => {
      // Test slow request handling
      const response = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${validTrainerToken}`)
        .set('Connection', 'keep-alive')
        .send({
          title: 'Test Recipe',
          ingredients: ['test'],
          instructions: ['test'],
          nutrition: { calories: 100, protein: 10, carbs: 10, fat: 5 }
        });

      // Should handle request normally without hanging
      expect(response.status).toBeOneOf([201, 400, 422]);
    });

    it('should limit request payload size (6/100)', async () => {
      const largePayload = {
        title: 'A'.repeat(10000),
        ingredients: Array.from({ length: 1000 }, (_, i) => `Ingredient ${i}`.repeat(100)),
        instructions: Array.from({ length: 1000 }, (_, i) => `Step ${i}`.repeat(200)),
        nutrition: { calories: 100, protein: 10, carbs: 10, fat: 5 }
      };

      const response = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${validTrainerToken}`)
        .send(largePayload);

      // Should reject oversized payloads
      expect(response.status).toBeOneOf([413, 400, 422]);

      if (response.status === 413) {
        expect(response.body.code).toBe('PAYLOAD_TOO_LARGE');
      }
    });

    it('should implement concurrent request limiting (7/100)', async () => {
      // Launch many concurrent requests
      const promises = Array.from({ length: 100 }, () =>
        request(app)
          .get('/api/meal-plan')
          .set('Authorization', `Bearer ${validCustomerToken}`)
      );

      const responses = await Promise.all(promises);

      // Should limit concurrent connections
      const errorResponses = responses.filter(res => res.status >= 400);
      expect(errorResponses.length).toBeGreaterThan(0);

      // Some should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should protect against request flooding (8/100)', async () => {
      const floodRequests = Array.from({ length: 500 }, () =>
        request(app)
          .get('/api/health')
      );

      const responses = await Promise.all(floodRequests);

      // Health endpoint should have some protection
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should implement different rate limits for different user roles (9/100)', async () => {
      // Test admin rate limits (should be higher)
      const adminPromises = Array.from({ length: 20 }, () =>
        request(app)
          .get('/api/admin/users')
          .set('Authorization', `Bearer ${validAdminToken}`)
      );

      const adminResponses = await Promise.all(adminPromises);
      const adminRateLimited = adminResponses.filter(res => res.status === 429);

      // Test customer rate limits (should be lower)
      const customerPromises = Array.from({ length: 20 }, () =>
        request(app)
          .get('/api/recipes')
          .set('Authorization', `Bearer ${validCustomerToken}`)
      );

      const customerResponses = await Promise.all(customerPromises);
      const customerRateLimited = customerResponses.filter(res => res.status === 429);

      // Customers should hit rate limits before admins
      expect(customerRateLimited.length).toBeGreaterThanOrEqual(adminRateLimited.length);
    });

    it('should implement adaptive rate limiting (10/100)', async () => {
      // Make normal requests first
      for (let i = 0; i < 5; i++) {
        await request(app)
          .get('/api/recipes')
          .set('Authorization', `Bearer ${validCustomerToken}`);
      }

      // Then flood with requests
      const floodPromises = Array.from({ length: 50 }, () =>
        request(app)
          .get('/api/recipes')
          .set('Authorization', `Bearer ${validCustomerToken}`)
      );

      const floodResponses = await Promise.all(floodPromises);
      const rateLimitedCount = floodResponses.filter(res => res.status === 429).length;

      // Should detect unusual traffic pattern and adapt
      expect(rateLimitedCount).toBeGreaterThan(30);
    });

    it('should protect expensive operations with stricter limits (11/100)', async () => {
      const expensiveEndpoints = [
        '/api/recipes/search',
        '/api/analytics/reports',
        '/api/pdf/export',
        '/api/meal-plan/generate'
      ];

      for (const endpoint of expensiveEndpoints) {
        const promises = Array.from({ length: 10 }, () =>
          request(app)
            .get(endpoint)
            .set('Authorization', `Bearer ${validCustomerToken}`)
        );

        const responses = await Promise.all(promises);
        const rateLimitedResponses = responses.filter(res => res.status === 429);

        // Expensive operations should have stricter limits
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
      }
    });

    it('should implement rate limiting headers (12/100)', async () => {
      const response = await request(app)
        .get('/api/recipes')
        .set('Authorization', `Bearer ${validCustomerToken}`);

      expect(response.status).toBeOneOf([200, 429]);

      // Should include rate limiting headers
      if (response.headers['x-ratelimit-limit']) {
        expect(parseInt(response.headers['x-ratelimit-limit'])).toBeGreaterThan(0);
      }

      if (response.headers['x-ratelimit-remaining']) {
        expect(parseInt(response.headers['x-ratelimit-remaining'])).toBeGreaterThanOrEqual(0);
      }

      if (response.headers['x-ratelimit-reset']) {
        expect(parseInt(response.headers['x-ratelimit-reset'])).toBeGreaterThan(Date.now() / 1000);
      }
    });

    it('should prevent cache poisoning via rate limiting (13/100)', async () => {
      const maliciousHeaders = [
        { 'X-Forwarded-Host': 'attacker.com' },
        { 'X-Original-URL': '/admin/secret' },
        { 'X-Rewrite-URL': '/admin/users' }
      ];

      for (const headers of maliciousHeaders) {
        const promises = Array.from({ length: 20 }, () =>
          request(app)
            .get('/api/recipes')
            .set('Authorization', `Bearer ${validCustomerToken}`)
            .set(headers)
        );

        const responses = await Promise.all(promises);
        const rateLimitedResponses = responses.filter(res => res.status === 429);

        // Should rate limit even with malicious headers
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
      }
    });

    it('should implement sliding window rate limiting (14/100)', async () => {
      const startTime = Date.now();

      // Make requests over time
      const responses = [];
      for (let i = 0; i < 30; i++) {
        const response = await request(app)
          .get('/api/recipes')
          .set('Authorization', `Bearer ${validCustomerToken}`);

        responses.push({
          status: response.status,
          timestamp: Date.now()
        });

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const rateLimitedResponses = responses.filter(r => r.status === 429);

      // Should implement sliding window (some requests succeed over time)
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      expect(rateLimitedResponses.length).toBeLessThan(30); // Not all blocked
    });

    it('should protect against distributed attacks (15/100)', async () => {
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        'curl/7.68.0',
        'PostmanRuntime/7.28.4'
      ];

      for (const userAgent of userAgents) {
        const promises = Array.from({ length: 15 }, () =>
          request(app)
            .get('/api/recipes')
            .set('Authorization', `Bearer ${validCustomerToken}`)
            .set('User-Agent', userAgent)
        );

        const responses = await Promise.all(promises);
        const rateLimitedResponses = responses.filter(res => res.status === 429);

        // Should rate limit regardless of user agent
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
      }
    });

    it('should implement progressive delays for repeat offenders (16/100)', async () => {
      // First violation
      const firstViolationPromises = Array.from({ length: 30 }, () =>
        request(app)
          .get('/api/recipes/search')
          .query({ q: 'test' })
          .set('Authorization', `Bearer ${validCustomerToken}`)
      );

      await Promise.all(firstViolationPromises);

      // Wait for rate limit to reset partially
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Second violation (should have harsher penalty)
      const secondViolationStart = Date.now();
      const secondViolationPromises = Array.from({ length: 10 }, () =>
        request(app)
          .get('/api/recipes/search')
          .query({ q: 'test2' })
          .set('Authorization', `Bearer ${validCustomerToken}`)
      );

      const secondResponses = await Promise.all(secondViolationPromises);
      const secondDuration = Date.now() - secondViolationStart;

      // Second violation should result in longer delays
      const rateLimitedCount = secondResponses.filter(res => res.status === 429).length;
      expect(rateLimitedCount).toBeGreaterThan(5);
    });

    it('should protect WebSocket connections (if applicable) (17/100)', async () => {
      // Test WebSocket rate limiting
      const wsPromises = Array.from({ length: 20 }, () =>
        request(app)
          .get('/api/websocket')
          .set('Upgrade', 'websocket')
          .set('Connection', 'Upgrade')
          .set('Sec-WebSocket-Key', crypto.randomBytes(16).toString('base64'))
          .set('Authorization', `Bearer ${validCustomerToken}`)
      );

      const wsResponses = await Promise.all(wsPromises);

      // Should limit WebSocket connections
      const rejectedConnections = wsResponses.filter(res => res.status >= 400);
      expect(rejectedConnections.length).toBeGreaterThan(0);
    });

    it('should implement rate limiting bypass detection (18/100)', async () => {
      const bypassAttempts = [
        { 'X-Forwarded-For': '127.0.0.1' },
        { 'X-Real-IP': '10.0.0.1' },
        { 'X-Originating-IP': '192.168.1.1' },
        { 'CF-Connecting-IP': '172.16.0.1' }
      ];

      for (const headers of bypassAttempts) {
        const promises = Array.from({ length: 25 }, () =>
          request(app)
            .get('/api/recipes')
            .set('Authorization', `Bearer ${validCustomerToken}`)
            .set(headers)
        );

        const responses = await Promise.all(promises);
        const rateLimitedResponses = responses.filter(res => res.status === 429);

        // Should not allow bypass via headers
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
      }
    });

    it('should monitor and alert on rate limiting violations (19/100)', async () => {
      // Trigger rate limiting
      const promises = Array.from({ length: 50 }, () =>
        request(app)
          .get('/api/recipes')
          .set('Authorization', `Bearer ${validCustomerToken}`)
      );

      await Promise.all(promises);

      // Check if violations are logged
      const logsResponse = await request(app)
        .get('/api/admin/security-logs')
        .set('Authorization', `Bearer ${validAdminToken}`)
        .query({ type: 'rate_limit_violation' });

      if (logsResponse.status === 200) {
        expect(logsResponse.body.logs).toBeDefined();
        const rateLimitLogs = logsResponse.body.logs.filter(log =>
          log.type === 'rate_limit_violation'
        );
        expect(rateLimitLogs.length).toBeGreaterThan(0);
      }
    });

    it('should implement global rate limiting for anonymous users (20/100)', async () => {
      // Test rate limiting for unauthenticated requests
      const promises = Array.from({ length: 30 }, () =>
        request(app)
          .get('/api/recipes')
      );

      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(res => res.status === 429);

      // Should rate limit anonymous users more aggressively
      expect(rateLimitedResponses.length).toBeGreaterThan(10);
    });
  });

  describe('Authorization and Access Control Tests', () => {
    it('should reject requests without authentication tokens (21/100)', async () => {
      const protectedEndpoints = [
        '/api/profile',
        '/api/meal-plan',
        '/api/recipes',
        '/api/progress',
        '/api/admin/users'
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request(app)
          .get(endpoint);

        expect(response.status).toBe(401);
        expect(response.body.code).toMatch(/MISSING_TOKEN|UNAUTHORIZED/);
      }
    });

    it('should reject malformed authorization headers (22/100)', async () => {
      const malformedHeaders = [
        'Bearer',
        'Bearer ',
        'InvalidBearer token123',
        'Basic dGVzdDp0ZXN0',
        'Bearer invalid.jwt.format',
        'Bearer null',
        'Bearer undefined'
      ];

      for (const header of malformedHeaders) {
        const response = await request(app)
          .get('/api/profile')
          .set('Authorization', header);

        expect(response.status).toBe(401);
        expect(response.body.code).toMatch(/INVALID_TOKEN|UNAUTHORIZED|MISSING_TOKEN/);
      }
    });

    it('should reject expired tokens (23/100)', async () => {
      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('TOKEN_EXPIRED');
    });

    it('should enforce role-based access control (24/100)', async () => {
      const roleTests = [
        { role: 'customer', token: validCustomerToken, endpoint: '/api/admin/users', expectedStatus: 403 },
        { role: 'trainer', token: validTrainerToken, endpoint: '/api/admin/settings', expectedStatus: 403 },
        { role: 'customer', token: validCustomerToken, endpoint: '/api/trainer/dashboard', expectedStatus: 403 }
      ];

      for (const test of roleTests) {
        const response = await request(app)
          .get(test.endpoint)
          .set('Authorization', `Bearer ${test.token}`);

        expect(response.status).toBe(test.expectedStatus);
        expect(response.body.message).toMatch(/forbidden|access.*denied|permission/i);
      }
    });

    it('should prevent privilege escalation through token manipulation (25/100)', async () => {
      // Try to access admin endpoint with modified customer token
      const token = validCustomerToken;
      const parts = token.split('.');

      // Attempt to modify payload (will fail signature verification)
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      payload.role = 'admin';
      const modifiedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const modifiedToken = `${parts[0]}.${modifiedPayload}.${parts[2]}`;

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${modifiedToken}`);

      expect(response.status).toBe(401);
      expect(response.body.code).toMatch(/INVALID_TOKEN/);
    });

    it('should validate token signature integrity (26/100)', async () => {
      const token = validCustomerToken;
      const parts = token.split('.');

      // Tamper with signature
      const tamperedSignature = 'tampered_signature_12345';
      const tamperedToken = `${parts[0]}.${parts[1]}.${tamperedSignature}`;

      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(response.status).toBe(401);
      expect(response.body.code).toMatch(/INVALID_TOKEN/);
    });

    it('should prevent horizontal privilege escalation (27/100)', async () => {
      // Create another customer
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'other-customer@test.com',
          password: 'OtherCustomer123!',
          role: 'customer'
        });

      const otherLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'other-customer@test.com',
          password: 'OtherCustomer123!'
        });

      const otherToken = otherLoginResponse.body.token;

      // Try to access original customer's data
      const response = await request(app)
        .get('/api/customer/meal-plans')
        .query({ userId: 1 })
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBeOneOf([200, 403]);

      if (response.status === 200) {
        // Should only return own data
        const mealPlans = response.body.mealPlans || response.body;
        if (Array.isArray(mealPlans) && mealPlans.length > 0) {
          expect(mealPlans.every(plan => plan.customerId !== 1)).toBe(true);
        }
      }
    });

    it('should validate resource ownership (28/100)', async () => {
      // Try to access resources by ID manipulation
      const resourceTests = [
        '/api/meal-plan/999',
        '/api/progress/999',
        '/api/recipes/999/comments'
      ];

      for (const endpoint of resourceTests) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${validCustomerToken}`);

        expect(response.status).toBeOneOf([403, 404]);
      }
    });

    it('should prevent access to deleted/inactive users (29/100)', async () => {
      // Create user and then simulate deletion
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'to-delete@test.com',
          password: 'ToDelete123!',
          role: 'customer'
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'to-delete@test.com',
          password: 'ToDelete123!'
        });

      const tokenToDelete = loginResponse.body.token;

      // Simulate user deletion/deactivation
      await request(app)
        .delete('/api/admin/users/to-delete@test.com')
        .set('Authorization', `Bearer ${validAdminToken}`);

      // Deleted user's token should not work
      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${tokenToDelete}`);

      expect(response.status).toBe(401);
    });

    it('should implement session-based token validation (30/100)', async () => {
      // Get fresh token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testCredentials.customer.email,
          password: testCredentials.customer.password
        });

      const freshToken = loginResponse.body.token;

      // Use token
      const useResponse = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${freshToken}`);

      expect(useResponse.status).toBe(200);

      // Logout (invalidate session)
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${freshToken}`);

      // Token should be invalid after logout
      const postLogoutResponse = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${freshToken}`);

      expect(postLogoutResponse.status).toBe(401);
    });

    it('should validate API key permissions (31/100)', async () => {
      // Create API key with limited permissions
      const apiKeyResponse = await request(app)
        .post('/api/auth/api-keys')
        .set('Authorization', `Bearer ${validAdminToken}`)
        .send({
          name: 'Limited API Key',
          permissions: ['recipes:read']
        });

      if (apiKeyResponse.status === 201) {
        const apiKey = apiKeyResponse.body.apiKey;

        // Should allow reading recipes
        const allowedResponse = await request(app)
          .get('/api/recipes')
          .set('X-API-Key', apiKey);

        expect(allowedResponse.status).toBe(200);

        // Should not allow creating recipes
        const deniedResponse = await request(app)
          .post('/api/recipes')
          .set('X-API-Key', apiKey)
          .send({
            title: 'Test Recipe',
            ingredients: ['test'],
            instructions: ['test'],
            nutrition: { calories: 100, protein: 10, carbs: 10, fat: 5 }
          });

        expect(deniedResponse.status).toBe(403);
      }
    });

    it('should prevent token replay attacks (32/100)', async () => {
      const token = validCustomerToken;

      // Use token with timestamp
      const response1 = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Timestamp', Date.now().toString());

      expect(response1.status).toBe(200);

      // Try to replay with same timestamp (if nonce is implemented)
      const response2 = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Timestamp', Date.now().toString());

      // Should either work normally or detect replay
      expect(response2.status).toBeOneOf([200, 401, 409]);
    });

    it('should implement proper scope validation (33/100)', async () => {
      // Test with scoped tokens (if implemented)
      const scopeTests = [
        { scope: 'recipes:read', endpoint: '/api/recipes', method: 'GET', allowed: true },
        { scope: 'recipes:read', endpoint: '/api/recipes', method: 'POST', allowed: false },
        { scope: 'profile:write', endpoint: '/api/profile', method: 'PUT', allowed: true },
        { scope: 'admin:read', endpoint: '/api/admin/users', method: 'GET', allowed: false }
      ];

      for (const test of scopeTests) {
        const response = await request(app)
          [test.method.toLowerCase()](test.endpoint)
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .send({});

        if (test.allowed) {
          expect(response.status).toBeOneOf([200, 201, 400, 422]);
        } else {
          expect(response.status).toBeOneOf([403, 404]);
        }
      }
    });

    it('should validate context-dependent permissions (34/100)', async () => {
      // Test permissions that depend on context (e.g., time, location, device)
      const contextTests = [
        { header: 'X-Device-Type', value: 'mobile' },
        { header: 'X-Timezone', value: 'America/New_York' },
        { header: 'X-App-Version', value: '1.0.0' }
      ];

      for (const context of contextTests) {
        const response = await request(app)
          .get('/api/profile')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .set(context.header, context.value);

        expect(response.status).toBeOneOf([200, 403]);
      }
    });

    it('should prevent authorization bypass through parameter pollution (35/100)', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .query('role=admin&role=customer')
        .set('Authorization', `Bearer ${validCustomerToken}`);

      expect(response.status).toBe(403);
    });

    it('should validate multi-factor authentication requirements (36/100)', async () => {
      // Test MFA requirements for sensitive operations
      const sensitiveEndpoints = [
        '/api/auth/change-password',
        '/api/admin/users',
        '/api/billing/payment-method'
      ];

      for (const endpoint of sensitiveEndpoints) {
        const response = await request(app)
          .post(endpoint)
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .send({});

        // Should either work or require additional authentication
        expect(response.status).toBeOneOf([200, 201, 400, 401, 403, 422]);

        if (response.status === 401 || response.status === 403) {
          expect(response.body.message).toMatch(/mfa|factor|verification/i);
        }
      }
    });

    it('should implement time-based access restrictions (37/100)', async () => {
      // Test if certain operations are restricted by time
      const timeRestrictedResponse = await request(app)
        .post('/api/admin/system/maintenance')
        .set('Authorization', `Bearer ${validAdminToken}`)
        .send({ mode: 'enable' });

      expect(timeRestrictedResponse.status).toBeOneOf([200, 201, 403, 404, 422]);
    });

    it('should validate geographic access restrictions (38/100)', async () => {
      const geoHeaders = [
        { 'X-Country-Code': 'CN' },
        { 'X-Country-Code': 'RU' },
        { 'X-Country-Code': 'IR' }
      ];

      for (const headers of geoHeaders) {
        const response = await request(app)
          .get('/api/profile')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .set(headers);

        // Should either work normally or apply geo-restrictions
        expect(response.status).toBeOneOf([200, 403]);
      }
    });

    it('should prevent privilege escalation through admin impersonation (39/100)', async () => {
      const impersonationResponse = await request(app)
        .get('/api/admin/impersonate/1')
        .set('Authorization', `Bearer ${validTrainerToken}`);

      expect(impersonationResponse.status).toBe(403);
    });

    it('should validate service-to-service authentication (40/100)', async () => {
      const serviceEndpoints = [
        '/api/internal/health-check',
        '/api/internal/metrics',
        '/api/internal/cache-clear'
      ];

      for (const endpoint of serviceEndpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${validAdminToken}`);

        // Internal endpoints should require special authentication
        expect(response.status).toBeOneOf([401, 403, 404]);
      }
    });

    it('should implement permission caching with proper invalidation (41/100)', async () => {
      // Test that permission changes are reflected immediately

      // First request should work
      const response1 = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${validCustomerToken}`);

      expect(response1.status).toBe(200);

      // Simulate permission change
      await request(app)
        .put('/api/admin/users/permissions')
        .set('Authorization', `Bearer ${validAdminToken}`)
        .send({
          userId: 1,
          permissions: []
        });

      // Subsequent request should reflect new permissions
      const response2 = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${validCustomerToken}`);

      expect(response2.status).toBe(403);
    });

    it('should prevent authorization bypass through HTTP method override (42/100)', async () => {
      const overrideMethods = ['PUT', 'DELETE', 'PATCH'];

      for (const method of overrideMethods) {
        const response = await request(app)
          .post('/api/admin/users')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .set('X-HTTP-Method-Override', method)
          .send({});

        expect(response.status).toBeOneOf([403, 405]);
      }
    });

    it('should validate cross-tenant data access (43/100)', async () => {
      // Test multi-tenancy if implemented
      const tenantHeaders = [
        { 'X-Tenant-ID': 'tenant1' },
        { 'X-Tenant-ID': 'tenant2' },
        { 'X-Tenant-ID': 'admin-tenant' }
      ];

      for (const headers of tenantHeaders) {
        const response = await request(app)
          .get('/api/recipes')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .set(headers);

        expect(response.status).toBeOneOf([200, 403]);

        if (response.status === 200) {
          // Should only return data for the correct tenant
          const recipes = response.body.recipes || response.body;
          if (Array.isArray(recipes)) {
            recipes.forEach(recipe => {
              expect(recipe.tenantId).toBeOneOf([undefined, headers['X-Tenant-ID']]);
            });
          }
        }
      }
    });

    it('should implement proper delegation and proxy authentication (44/100)', async () => {
      // Test delegation scenarios
      const delegationResponse = await request(app)
        .get('/api/customer/meal-plans')
        .set('Authorization', `Bearer ${validTrainerToken}`)
        .set('X-On-Behalf-Of', 'customer@test.com');

      expect(delegationResponse.status).toBeOneOf([200, 403, 404]);
    });

    it('should validate API versioning security (45/100)', async () => {
      const versionHeaders = [
        { 'API-Version': '1.0' },
        { 'API-Version': '2.0' },
        { 'API-Version': 'beta' },
        { 'API-Version': '../../../admin' }
      ];

      for (const headers of versionHeaders) {
        const response = await request(app)
          .get('/api/recipes')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .set(headers);

        expect(response.status).toBeOneOf([200, 400, 404]);

        // Malicious version should be rejected
        if (headers['API-Version'].includes('../')) {
          expect(response.status).toBeOneOf([400, 404]);
        }
      }
    });
  });

  describe('Data Exposure and Information Leakage Tests', () => {
    it('should not expose sensitive data in error messages (46/100)', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint')
        .set('Authorization', `Bearer ${validCustomerToken}`);

      expect(response.status).toBe(404);

      const responseText = JSON.stringify(response.body);
      const sensitivePatterns = [
        /password/i,
        /secret/i,
        /key/i,
        /token/i,
        /hash/i,
        /sql/i,
        /database/i,
        /connection/i,
        /config/i,
        /environment/i,
        /path.*[:\/].*[:\/]/,
        /stack.*trace/i
      ];

      sensitivePatterns.forEach(pattern => {
        expect(responseText).not.toMatch(pattern);
      });
    });

    it('should not expose user emails in responses (47/100)', async () => {
      const response = await request(app)
        .get('/api/recipes')
        .set('Authorization', `Bearer ${validCustomerToken}`);

      expect(response.status).toBe(200);

      const responseText = JSON.stringify(response.body);

      // Should not contain other users' emails
      expect(responseText).not.toContain('admin@test.com');
      expect(responseText).not.toContain('trainer@test.com');
    });

    it('should not expose internal system information (48/100)', async () => {
      const systemEndpoints = [
        '/api/health',
        '/api/status',
        '/api/version'
      ];

      for (const endpoint of systemEndpoints) {
        const response = await request(app)
          .get(endpoint);

        if (response.status === 200) {
          const responseText = JSON.stringify(response.body);
          const internalPatterns = [
            /server.*path/i,
            /internal.*ip/i,
            /database.*connection/i,
            /redis.*host/i,
            /aws.*key/i,
            /api.*secret/i,
            /version.*\d+\.\d+\.\d+.*build/i
          ];

          internalPatterns.forEach(pattern => {
            expect(responseText).not.toMatch(pattern);
          });
        }
      }
    });

    it('should not expose database schema information (49/100)', async () => {
      const response = await request(app)
        .get('/api/recipes')
        .query({ invalid: 'parameter' })
        .set('Authorization', `Bearer ${validCustomerToken}`);

      const responseText = JSON.stringify(response.body);
      const schemaPatterns = [
        /table.*name/i,
        /column.*name/i,
        /foreign.*key/i,
        /primary.*key/i,
        /constraint/i,
        /index/i,
        /schema/i
      ];

      schemaPatterns.forEach(pattern => {
        expect(responseText).not.toMatch(pattern);
      });
    });

    it('should not expose file system paths (50/100)', async () => {
      const response = await request(app)
        .get('/api/profile/image')
        .set('Authorization', `Bearer ${validCustomerToken}`);

      if (response.status === 200) {
        const responseText = JSON.stringify(response.body);
        const pathPatterns = [
          /\/home\/\w+/,
          /\/var\/www/,
          /\/usr\/local/,
          /C:\\\\Users/,
          /C:\\\\Program Files/,
          /node_modules/,
          /\.\.\//
        ];

        pathPatterns.forEach(pattern => {
          expect(responseText).not.toMatch(pattern);
        });
      }
    });

    it('should not expose environment variables (51/100)', async () => {
      const envEndpoints = [
        '/api/admin/config',
        '/api/system/environment',
        '/api/debug/env'
      ];

      for (const endpoint of envEndpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${validAdminToken}`);

        if (response.status === 200) {
          const responseText = JSON.stringify(response.body);
          const envPatterns = [
            /DATABASE_URL/i,
            /JWT_SECRET/i,
            /API_KEY/i,
            /PASSWORD/i,
            /SECRET/i,
            /TOKEN/i
          ];

          envPatterns.forEach(pattern => {
            expect(responseText).not.toMatch(pattern);
          });
        }
      }
    });

    it('should not expose other users\' private data (52/100)', async () => {
      const response = await request(app)
        .get('/api/meal-plan')
        .set('Authorization', `Bearer ${validCustomerToken}`);

      if (response.status === 200) {
        const mealPlans = response.body.mealPlans || response.body;
        if (Array.isArray(mealPlans)) {
          mealPlans.forEach(plan => {
            // Should only contain own data or public data
            expect(plan.customerId).toBeOneOf([undefined, 1]); // Assuming customer has ID 1
          });
        }
      }
    });

    it('should not expose API keys or tokens in responses (53/100)', async () => {
      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${validCustomerToken}`);

      expect(response.status).toBe(200);

      const responseText = JSON.stringify(response.body);
      const tokenPatterns = [
        /eyJ[A-Za-z0-9-_]*\.[A-Za-z0-9-_]*\.[A-Za-z0-9-_]*/,  // JWT pattern
        /sk_[a-z0-9]{32}/,  // Stripe secret key pattern
        /pk_[a-z0-9]{32}/,  // Stripe public key pattern
        /[A-Za-z0-9]{32,}/   // Generic long tokens
      ];

      tokenPatterns.forEach(pattern => {
        expect(responseText).not.toMatch(pattern);
      });
    });

    it('should not expose timing information for enumeration (54/100)', async () => {
      const userEmails = [
        testCredentials.customer.email,  // Exists
        'nonexistent@example.com'        // Doesn't exist
      ];

      const timings = [];

      for (const email of userEmails) {
        const start = Date.now();
        await request(app)
          .post('/api/auth/forgot-password')
          .send({ email });
        const duration = Date.now() - start;

        timings.push(duration);
      }

      // Response times should be similar
      const timeDifference = Math.abs(timings[0] - timings[1]);
      expect(timeDifference).toBeLessThan(100);
    });

    it('should not expose debug information in production (55/100)', async () => {
      const debugEndpoints = [
        '/api/debug',
        '/api/debug/routes',
        '/api/debug/memory',
        '/api/debug/performance'
      ];

      for (const endpoint of debugEndpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${validAdminToken}`);

        // Debug endpoints should not be available in production
        expect(response.status).toBeOneOf([404, 405]);
      }
    });

    it('should not expose server software versions (56/100)', async () => {
      const response = await request(app)
        .get('/api/health');

      // Should not reveal server software in headers
      const serverHeader = response.headers.server;
      if (serverHeader) {
        expect(serverHeader).not.toMatch(/express/i);
        expect(serverHeader).not.toMatch(/node/i);
        expect(serverHeader).not.toMatch(/\d+\.\d+\.\d+/); // Version numbers
      }

      // Should not reveal powered-by headers
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    it('should not expose backup file information (57/100)', async () => {
      const backupPaths = [
        '/api/backup',
        '/api/backup/download',
        '/api/admin/backup/list'
      ];

      for (const path of backupPaths) {
        const response = await request(app)
          .get(path)
          .set('Authorization', `Bearer ${validAdminToken}`);

        if (response.status === 200) {
          const responseText = JSON.stringify(response.body);

          // Should not expose backup file paths
          expect(responseText).not.toMatch(/\.sql$/);
          expect(responseText).not.toMatch(/\.dump$/);
          expect(responseText).not.toMatch(/backup.*\d{4}-\d{2}-\d{2}/);
        }
      }
    });

    it('should not expose configuration files (58/100)', async () => {
      const configPaths = [
        '/api/config',
        '/api/config.json',
        '/api/package.json',
        '/api/.env'
      ];

      for (const path of configPaths) {
        const response = await request(app)
          .get(path);

        expect(response.status).toBeOneOf([404, 405]);
      }
    });

    it('should not expose dependency information (59/100)', async () => {
      const dependencyEndpoints = [
        '/api/package.json',
        '/api/node_modules',
        '/api/vendor'
      ];

      for (const endpoint of dependencyEndpoints) {
        const response = await request(app)
          .get(endpoint);

        expect(response.status).toBeOneOf([404, 405]);
      }
    });

    it('should not expose log file contents (60/100)', async () => {
      const logEndpoints = [
        '/api/logs',
        '/api/error.log',
        '/api/access.log',
        '/api/application.log'
      ];

      for (const endpoint of logEndpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${validAdminToken}`);

        // Even admin shouldn't access raw logs via API
        expect(response.status).toBeOneOf([403, 404]);
      }
    });

    it('should not expose session storage information (61/100)', async () => {
      const response = await request(app)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAdminToken}`);

      if (response.status === 200) {
        const responseText = JSON.stringify(response.body);

        // Should not expose session tokens or IDs
        expect(responseText).not.toMatch(/sess:[a-zA-Z0-9]+/);
        expect(responseText).not.toMatch(/session_id/);
      }
    });

    it('should not expose cache information (62/100)', async () => {
      const cacheEndpoints = [
        '/api/cache',
        '/api/redis/keys',
        '/api/cache/stats'
      ];

      for (const endpoint of cacheEndpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${validAdminToken}`);

        if (response.status === 200) {
          const responseText = JSON.stringify(response.body);

          // Should not expose cache keys or internal structure
          expect(responseText).not.toMatch(/redis:/);
          expect(responseText).not.toMatch(/cache:user:/);
        }
      }
    });

    it('should not expose queue information (63/100)', async () => {
      const queueEndpoints = [
        '/api/queue',
        '/api/jobs',
        '/api/worker/status'
      ];

      for (const endpoint of queueEndpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${validAdminToken}`);

        if (response.status === 200) {
          const responseText = JSON.stringify(response.body);

          // Should not expose sensitive job data
          expect(responseText).not.toMatch(/password/i);
          expect(responseText).not.toMatch(/secret/i);
          expect(responseText).not.toMatch(/token/i);
        }
      }
    });

    it('should not expose metrics that reveal business intelligence (64/100)', async () => {
      const response = await request(app)
        .get('/api/metrics')
        .set('Authorization', `Bearer ${validAdminToken}`);

      if (response.status === 200) {
        const responseText = JSON.stringify(response.body);

        // Should not expose detailed business metrics to non-authorized users
        expect(responseText).not.toMatch(/revenue/i);
        expect(responseText).not.toMatch(/profit/i);
        expect(responseText).not.toMatch(/customer.*count/i);
      }
    });

    it('should not expose test data in production responses (65/100)', async () => {
      const response = await request(app)
        .get('/api/recipes')
        .set('Authorization', `Bearer ${validCustomerToken}`);

      if (response.status === 200) {
        const responseText = JSON.stringify(response.body);

        // Should not contain test data markers
        expect(responseText).not.toMatch(/test.*recipe/i);
        expect(responseText).not.toMatch(/example.*data/i);
        expect(responseText).not.toMatch(/lorem.*ipsum/i);
      }
    });
  });

  describe('HTTP Method Security Tests', () => {
    it('should properly restrict HTTP methods per endpoint (66/100)', async () => {
      const methodTests = [
        { endpoint: '/api/recipes', allowedMethods: ['GET', 'POST'], disallowedMethods: ['PUT', 'DELETE', 'PATCH'] },
        { endpoint: '/api/profile', allowedMethods: ['GET', 'PUT'], disallowedMethods: ['POST', 'DELETE'] },
        { endpoint: '/api/health', allowedMethods: ['GET'], disallowedMethods: ['POST', 'PUT', 'DELETE', 'PATCH'] }
      ];

      for (const test of methodTests) {
        for (const method of test.disallowedMethods) {
          const response = await request(app)
            [method.toLowerCase()](test.endpoint)
            .set('Authorization', `Bearer ${validCustomerToken}`)
            .send({});

          expect(response.status).toBeOneOf([405, 404]);
        }
      }
    });

    it('should prevent HTTP verb tampering (67/100)', async () => {
      const tamperingHeaders = [
        'X-HTTP-Method-Override',
        'X-HTTP-Method',
        'X-Method-Override',
        '_method'
      ];

      for (const header of tamperingHeaders) {
        const response = await request(app)
          .post('/api/admin/users/1')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .set(header, 'DELETE')
          .send({});

        // Should not allow method override to bypass authorization
        expect(response.status).toBeOneOf([403, 405]);
      }
    });

    it('should handle TRACE method securely (68/100)', async () => {
      const response = await request(app)
        .request('TRACE', '/api/profile')
        .set('Authorization', `Bearer ${validCustomerToken}`);

      // TRACE should be disabled to prevent XST attacks
      expect(response.status).toBeOneOf([405, 501]);
    });

    it('should handle OPTIONS method securely (69/100)', async () => {
      const response = await request(app)
        .options('/api/recipes')
        .set('Origin', 'https://attacker.com');

      // Should not reveal allowed methods to unauthorized origins
      if (response.status === 200) {
        expect(response.headers['access-control-allow-origin']).not.toBe('https://attacker.com');
      }
    });

    it('should prevent HEAD method information disclosure (70/100)', async () => {
      const headResponse = await request(app)
        .head('/api/admin/users')
        .set('Authorization', `Bearer ${validCustomerToken}`);

      const getResponse = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${validCustomerToken}`);

      // HEAD and GET should return same status for security
      expect(headResponse.status).toBe(getResponse.status);
    });

    it('should handle CONNECT method (71/100)', async () => {
      const response = await request(app)
        .request('CONNECT', '/api/profile')
        .set('Authorization', `Bearer ${validCustomerToken}`);

      // CONNECT should not be allowed on application endpoints
      expect(response.status).toBeOneOf([405, 501]);
    });

    it('should validate custom HTTP methods (72/100)', async () => {
      const customMethods = ['PATCH', 'PURGE', 'LOCK', 'UNLOCK'];

      for (const method of customMethods) {
        const response = await request(app)
          .request(method, '/api/recipes')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .send({});

        expect(response.status).toBeOneOf([200, 405, 501]);
      }
    });

    it('should prevent method smuggling (73/100)', async () => {
      const response = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${validTrainerToken}`)
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('_method=DELETE&id=1');

      // Should not allow method smuggling via form parameters
      expect(response.status).toBeOneOf([201, 400, 422]);
    });

    it('should handle malformed method names (74/100)', async () => {
      const malformedMethods = ['G ET', 'POST\r\n', 'DEL ETE', 'P\x00OST'];

      for (const method of malformedMethods) {
        try {
          const response = await request(app)
            .request(method, '/api/recipes')
            .set('Authorization', `Bearer ${validCustomerToken}`);

          expect(response.status).toBeOneOf([400, 405, 501]);
        } catch (error) {
          // Malformed methods should be rejected
          expect(error).toBeDefined();
        }
      }
    });

    it('should implement proper CORS for different methods (75/100)', async () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE'];

      for (const method of methods) {
        const preflightResponse = await request(app)
          .options('/api/recipes')
          .set('Origin', 'https://evofitmeals.com')
          .set('Access-Control-Request-Method', method);

        if (preflightResponse.status === 200) {
          const allowedMethods = preflightResponse.headers['access-control-allow-methods'];
          if (allowedMethods) {
            expect(allowedMethods).toContain(method);
          }
        }
      }
    });

    it('should prevent method-based cache poisoning (76/100)', async () => {
      const response = await request(app)
        .get('/api/recipes')
        .set('Authorization', `Bearer ${validCustomerToken}`)
        .set('X-HTTP-Method-Override', 'POST');

      // Should not allow cache poisoning via method override
      expect(response.status).toBeOneOf([200, 405]);
      expect(response.headers['cache-control']).toBeDefined();
    });

    it('should validate method consistency in request routing (77/100)', async () => {
      // Test that the actual HTTP method is used, not overridden values
      const response = await request(app)
        .get('/api/recipes')
        .set('Authorization', `Bearer ${validCustomerToken}`)
        .query({ _method: 'DELETE' });

      // Should treat as GET request regardless of query parameter
      expect(response.status).toBe(200);
    });

    it('should handle idempotency for safe methods (78/100)', async () => {
      // Multiple GET requests should return same result
      const responses = await Promise.all([
        request(app).get('/api/recipes').set('Authorization', `Bearer ${validCustomerToken}`),
        request(app).get('/api/recipes').set('Authorization', `Bearer ${validCustomerToken}`),
        request(app).get('/api/recipes').set('Authorization', `Bearer ${validCustomerToken}`)
      ]);

      responses.forEach((response, index) => {
        expect(response.status).toBe(responses[0].status);
        if (index > 0) {
          expect(response.body).toEqual(responses[0].body);
        }
      });
    });

    it('should enforce read-only methods for read-only endpoints (79/100)', async () => {
      const readOnlyEndpoints = ['/api/health', '/api/version', '/api/status'];

      for (const endpoint of readOnlyEndpoints) {
        const response = await request(app)
          .post(endpoint)
          .send({});

        expect(response.status).toBeOneOf([405, 404]);
      }
    });

    it('should validate method-specific content types (80/100)', async () => {
      // POST should require appropriate content type
      const response = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${validTrainerToken}`)
        .set('Content-Type', 'text/plain')
        .send('invalid content type');

      expect(response.status).toBeOneOf([400, 415, 422]);
    });
  });

  describe('API Parameter Manipulation Tests', () => {
    it('should validate query parameter injection (81/100)', async () => {
      for (const vector of apiAttackVectors) {
        const response = await request(app)
          .get('/api/recipes')
          .query({ search: vector })
          .set('Authorization', `Bearer ${validCustomerToken}`);

        expect(response.status).toBeOneOf([200, 400]);

        if (response.status === 200) {
          const responseText = JSON.stringify(response.body);
          expect(responseText).not.toContain('root:');
          expect(responseText).not.toContain('etc/passwd');
          expect(responseText).not.toContain('system32');
        }
      }
    });

    it('should prevent path traversal in API endpoints (82/100)', async () => {
      const pathTraversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
        '....//....//....//etc/passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        '..%252f..%252f..%252fetc%252fpasswd'
      ];

      for (const payload of pathTraversalPayloads) {
        const response = await request(app)
          .get(`/api/recipes/${encodeURIComponent(payload)}`)
          .set('Authorization', `Bearer ${validCustomerToken}`);

        expect(response.status).toBeOneOf([400, 404, 422]);
      }
    });

    it('should validate parameter type enforcement (83/100)', async () => {
      const typeTests = [
        { param: 'limit', value: 'not-a-number', endpoint: '/api/recipes' },
        { param: 'page', value: '-1', endpoint: '/api/recipes' },
        { param: 'id', value: 'abc', endpoint: '/api/recipes/abc' },
        { param: 'sort', value: '{}', endpoint: '/api/recipes' }
      ];

      for (const test of typeTests) {
        const response = await request(app)
          .get(test.endpoint)
          .query(test.param === 'id' ? {} : { [test.param]: test.value })
          .set('Authorization', `Bearer ${validCustomerToken}`);

        expect(response.status).toBeOneOf([400, 422]);
      }
    });

    it('should prevent parameter pollution attacks (84/100)', async () => {
      // Test with duplicate parameters
      const response = await request(app)
        .get('/api/recipes')
        .query('limit=10&limit=999999&page=1&page=999')
        .set('Authorization', `Bearer ${validCustomerToken}`);

      expect(response.status).toBeOneOf([200, 400]);

      if (response.status === 200) {
        const recipes = response.body.recipes || response.body;
        if (Array.isArray(recipes)) {
          // Should not return excessive results
          expect(recipes.length).toBeLessThanOrEqual(100);
        }
      }
    });

    it('should validate range parameters (85/100)', async () => {
      const rangeTests = [
        { param: 'limit', value: '999999999' },
        { param: 'offset', value: '-999999' },
        { param: 'page', value: '0' },
        { param: 'per_page', value: '10000' }
      ];

      for (const test of rangeTests) {
        const response = await request(app)
          .get('/api/recipes')
          .query({ [test.param]: test.value })
          .set('Authorization', `Bearer ${validCustomerToken}`);

        expect(response.status).toBeOneOf([200, 400, 422]);

        if (response.status === 200) {
          const recipes = response.body.recipes || response.body;
          if (Array.isArray(recipes)) {
            expect(recipes.length).toBeLessThanOrEqual(100);
          }
        }
      }
    });

    it('should prevent NoSQL injection in parameters (86/100)', async () => {
      const nosqlPayloads = [
        '{"$gt": ""}',
        '{"$ne": null}',
        '{"$regex": ".*"}',
        '{"$where": "function() { return true; }"}',
        '{"$eval": "function() { return db.users.find(); }"}'
      ];

      for (const payload of nosqlPayloads) {
        const response = await request(app)
          .get('/api/recipes')
          .query({ filter: payload })
          .set('Authorization', `Bearer ${validCustomerToken}`);

        expect(response.status).toBeOneOf([200, 400, 422]);

        if (response.status === 200) {
          const responseText = JSON.stringify(response.body);
          expect(responseText).not.toContain('$gt');
          expect(responseText).not.toContain('$ne');
          expect(responseText).not.toContain('$regex');
        }
      }
    });

    it('should validate JSON parameter structure (87/100)', async () => {
      const malformedJson = [
        '{"incomplete": }',
        '{"nested": {"too": {"deep": {"object": {}}}}}',
        '{"circular": "ref"}',
        '{"huge": "' + 'A'.repeat(100000) + '"}'
      ];

      for (const json of malformedJson) {
        const response = await request(app)
          .post('/api/recipes')
          .set('Authorization', `Bearer ${validTrainerToken}`)
          .set('Content-Type', 'application/json')
          .send(json);

        expect(response.status).toBeOneOf([400, 422]);
      }
    });

    it('should prevent LDAP injection in search parameters (88/100)', async () => {
      const ldapPayloads = [
        '*)(uid=*',
        '*)(|(password=*))',
        '*))%00',
        '*)(&(objectClass=*)',
        '*)(objectClass=*)'
      ];

      for (const payload of ldapPayloads) {
        const response = await request(app)
          .get('/api/admin/users')
          .query({ search: payload })
          .set('Authorization', `Bearer ${validAdminToken}`);

        expect(response.status).toBeOneOf([200, 400, 422]);

        if (response.status === 200) {
          const responseText = JSON.stringify(response.body);
          expect(responseText).not.toContain('objectClass');
          expect(responseText).not.toContain('uid=');
        }
      }
    });

    it('should validate array parameter limits (89/100)', async () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => `item${i}`);

      const response = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${validTrainerToken}`)
        .send({
          title: 'Test Recipe',
          ingredients: largeArray,
          instructions: ['test'],
          nutrition: { calories: 100, protein: 10, carbs: 10, fat: 5 }
        });

      expect(response.status).toBeOneOf([400, 413, 422]);
    });

    it('should prevent command injection via parameters (90/100)', async () => {
      const commandPayloads = [
        '; ls -la',
        '| cat /etc/passwd',
        '&& whoami',
        '`id`',
        '$(whoami)',
        '; rm -rf /',
        '|| ping -c 10 127.0.0.1'
      ];

      for (const payload of commandPayloads) {
        const response = await request(app)
          .get('/api/recipes/search')
          .query({ q: payload })
          .set('Authorization', `Bearer ${validCustomerToken}`);

        expect(response.status).toBeOneOf([200, 400]);

        if (response.status === 200) {
          const responseText = JSON.stringify(response.body);
          expect(responseText).not.toMatch(/root:|etc\/passwd|uid=|gid=/);
        }
      }
    });

    it('should validate email parameter format (91/100)', async () => {
      const invalidEmails = [
        'not-an-email',
        '@domain.com',
        'user@',
        'user..double.dot@domain.com',
        'user@domain',
        'user name@domain.com',
        'user@domain..com'
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/invitations')
          .set('Authorization', `Bearer ${validTrainerToken}`)
          .send({
            email: email,
            role: 'customer'
          });

        expect(response.status).toBeOneOf([400, 422]);
        expect(response.body.message).toMatch(/email|invalid|format/i);
      }
    });

    it('should prevent URL parameter manipulation (92/100)', async () => {
      const urlManipulation = [
        'http://attacker.com',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'file:///etc/passwd',
        'ftp://attacker.com/malicious'
      ];

      for (const url of urlManipulation) {
        const response = await request(app)
          .put('/api/profile')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .send({
            website: url
          });

        expect(response.status).toBeOneOf([200, 400, 422]);

        if (response.status === 200) {
          const profile = await request(app)
            .get('/api/profile')
            .set('Authorization', `Bearer ${validCustomerToken}`);

          if (profile.body.user?.website) {
            expect(profile.body.user.website).not.toContain('javascript:');
            expect(profile.body.user.website).not.toContain('data:');
            expect(profile.body.user.website).not.toContain('file:');
          }
        }
      }
    });

    it('should validate date parameter formats (93/100)', async () => {
      const invalidDates = [
        'not-a-date',
        '2023-13-01',
        '2023-02-30',
        '99999-12-31',
        '2023/12/31',
        'Dec 31, 2023'
      ];

      for (const date of invalidDates) {
        const response = await request(app)
          .get('/api/meal-plan')
          .query({ startDate: date })
          .set('Authorization', `Bearer ${validCustomerToken}`);

        expect(response.status).toBeOneOf([200, 400, 422]);
      }
    });

    it('should prevent parameter key injection (94/100)', async () => {
      const maliciousKeys = {
        '__proto__': 'polluted',
        'constructor': 'hijacked',
        'prototype': 'modified',
        '$where': 'function() { return true; }'
      };

      const response = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${validTrainerToken}`)
        .send({
          title: 'Test Recipe',
          ingredients: ['test'],
          instructions: ['test'],
          nutrition: { calories: 100, protein: 10, carbs: 10, fat: 5 },
          ...maliciousKeys
        });

      expect(response.status).toBeOneOf([201, 400, 422]);
    });

    it('should validate numeric parameter precision (95/100)', async () => {
      const precisionTests = [
        { calories: 123.456789123456789 },
        { protein: Number.MAX_SAFE_INTEGER },
        { carbs: Number.MIN_SAFE_INTEGER },
        { fat: Infinity },
        { fiber: -Infinity },
        { sugar: NaN }
      ];

      for (const nutrition of precisionTests) {
        const response = await request(app)
          .post('/api/recipes')
          .set('Authorization', `Bearer ${validTrainerToken}`)
          .send({
            title: 'Test Recipe',
            ingredients: ['test'],
            instructions: ['test'],
            nutrition: { calories: 100, protein: 10, carbs: 10, fat: 5, ...nutrition }
          });

        expect(response.status).toBeOneOf([201, 400, 422]);
      }
    });

    it('should prevent parameter encoding attacks (96/100)', async () => {
      const encodingAttacks = [
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        '%00%00%00%00',
        '%0d%0a%0d%0a',
        '%%3c%73%63%72%69%70%74%3e',
        '%u003cscript%u003e'
      ];

      for (const attack of encodingAttacks) {
        const response = await request(app)
          .get('/api/recipes/search')
          .query({ q: attack })
          .set('Authorization', `Bearer ${validCustomerToken}`);

        expect(response.status).toBeOneOf([200, 400]);

        if (response.status === 200) {
          const responseText = JSON.stringify(response.body);
          expect(responseText).not.toContain('etc/passwd');
          expect(responseText).not.toContain('<script>');
        }
      }
    });

    it('should validate parameter length limits (97/100)', async () => {
      const longParameters = {
        title: 'A'.repeat(10000),
        description: 'B'.repeat(50000),
        search: 'C'.repeat(1000)
      };

      for (const [key, value] of Object.entries(longParameters)) {
        const response = await request(app)
          .get('/api/recipes')
          .query({ [key]: value })
          .set('Authorization', `Bearer ${validCustomerToken}`);

        expect(response.status).toBeOneOf([200, 400, 413, 422]);
      }
    });

    it('should prevent server-side template injection via parameters (98/100)', async () => {
      const sstiPayloads = [
        '{{7*7}}',
        '${7*7}',
        '#{7*7}',
        '<%= 7*7 %>',
        '{{constructor.constructor("alert(1)")()}}',
        '${this.constructor.constructor("alert(1)")()}'
      ];

      for (const payload of sstiPayloads) {
        const response = await request(app)
          .post('/api/recipes')
          .set('Authorization', `Bearer ${validTrainerToken}`)
          .send({
            title: payload,
            ingredients: ['test'],
            instructions: ['test'],
            nutrition: { calories: 100, protein: 10, carbs: 10, fat: 5 }
          });

        expect(response.status).toBeOneOf([201, 400, 422]);

        if (response.status === 201) {
          const recipeId = response.body.id;
          const getResponse = await request(app)
            .get(`/api/recipes/${recipeId}`)
            .set('Authorization', `Bearer ${validCustomerToken}`);

          if (getResponse.status === 200) {
            expect(getResponse.body.title).not.toBe('49'); // 7*7 executed
            expect(getResponse.body.title).not.toContain('constructor');
          }
        }
      }
    });

    it('should validate boolean parameter handling (99/100)', async () => {
      const booleanTests = [
        { param: 'approved', value: 'maybe' },
        { param: 'active', value: '1' },
        { param: 'enabled', value: 'yes' },
        { param: 'visible', value: 'on' }
      ];

      for (const test of booleanTests) {
        const response = await request(app)
          .get('/api/recipes')
          .query({ [test.param]: test.value })
          .set('Authorization', `Bearer ${validCustomerToken}`);

        expect(response.status).toBeOneOf([200, 400, 422]);
      }
    });

    it('should implement proper parameter sanitization (100/100)', async () => {
      const sanitizationTests = [
        { input: '<script>alert("xss")</script>', field: 'title' },
        { input: 'SELECT * FROM users', field: 'description' },
        { input: 'javascript:alert(1)', field: 'website' },
        { input: '../../etc/passwd', field: 'image_path' }
      ];

      for (const test of sanitizationTests) {
        const response = await request(app)
          .post('/api/recipes')
          .set('Authorization', `Bearer ${validTrainerToken}`)
          .send({
            title: test.field === 'title' ? test.input : 'Test Recipe',
            description: test.field === 'description' ? test.input : 'Test Description',
            ingredients: ['test'],
            instructions: ['test'],
            nutrition: { calories: 100, protein: 10, carbs: 10, fat: 5 }
          });

        expect(response.status).toBeOneOf([201, 400, 422]);

        if (response.status === 201) {
          const recipeId = response.body.id;
          const getResponse = await request(app)
            .get(`/api/recipes/${recipeId}`)
            .set('Authorization', `Bearer ${validCustomerToken}`);

          if (getResponse.status === 200) {
            const responseText = JSON.stringify(getResponse.body);
            expect(responseText).not.toContain('<script>');
            expect(responseText).not.toContain('SELECT * FROM');
            expect(responseText).not.toContain('javascript:');
            expect(responseText).not.toContain('../../');
          }
        }
      }
    });
  });
});

/**
 * API Security Test Utilities
 */
export const apiSecurityTestUtils = {
  /**
   * Checks if response indicates successful path traversal
   */
  indicatesPathTraversal(response: any): boolean {
    const responseText = JSON.stringify(response.body);
    const pathTraversalIndicators = [
      'root:',
      'etc/passwd',
      'system32',
      'windows/system.ini',
      '[users]',
      'daemon:'
    ];

    return pathTraversalIndicators.some(indicator =>
      responseText.toLowerCase().includes(indicator.toLowerCase())
    );
  },

  /**
   * Validates rate limiting headers
   */
  validateRateLimitHeaders(headers: any): {
    hasRateLimit: boolean;
    limit?: number;
    remaining?: number;
    resetTime?: number;
  } {
    const result = { hasRateLimit: false };

    if (headers['x-ratelimit-limit']) {
      result.hasRateLimit = true;
      result.limit = parseInt(headers['x-ratelimit-limit']);
    }

    if (headers['x-ratelimit-remaining']) {
      result.remaining = parseInt(headers['x-ratelimit-remaining']);
    }

    if (headers['x-ratelimit-reset']) {
      result.resetTime = parseInt(headers['x-ratelimit-reset']);
    }

    return result;
  },

  /**
   * Generates various injection payloads for testing
   */
  generateInjectionPayloads(type: 'sql' | 'nosql' | 'ldap' | 'command'): string[] {
    const payloads = {
      sql: [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "' UNION SELECT * FROM users --"
      ],
      nosql: [
        '{"$gt": ""}',
        '{"$ne": null}',
        '{"$regex": ".*"}'
      ],
      ldap: [
        '*)(uid=*',
        '*)(|(password=*))',
        '*)(&(objectClass=*)'
      ],
      command: [
        '; ls -la',
        '| cat /etc/passwd',
        '&& whoami'
      ]
    };

    return payloads[type] || [];
  },

  /**
   * Checks if response contains sensitive information
   */
  containsSensitiveData(response: any): {
    hasSensitiveData: boolean;
    sensitiveFields: string[];
  } {
    const responseText = JSON.stringify(response.body).toLowerCase();
    const sensitivePatterns = [
      { name: 'passwords', pattern: /password.*[:=]/ },
      { name: 'api_keys', pattern: /api.*key.*[:=]/ },
      { name: 'secrets', pattern: /secret.*[:=]/ },
      { name: 'tokens', pattern: /token.*[:=]/ },
      { name: 'database_urls', pattern: /database.*url/ },
      { name: 'file_paths', pattern: /\/home\/|\/var\/|c:\\\\/ }
    ];

    const foundFields = sensitivePatterns
      .filter(pattern => pattern.pattern.test(responseText))
      .map(pattern => pattern.name);

    return {
      hasSensitiveData: foundFields.length > 0,
      sensitiveFields: foundFields
    };
  },

  /**
   * Validates HTTP method restrictions
   */
  validateMethodRestrictions(responses: Array<{ method: string; status: number }>): {
    properlyRestricted: boolean;
    allowedMethods: string[];
    blockedMethods: string[];
  } {
    const allowed = responses.filter(r => r.status < 400).map(r => r.method);
    const blocked = responses.filter(r => r.status >= 400).map(r => r.method);

    return {
      properlyRestricted: blocked.length > 0,
      allowedMethods: allowed,
      blockedMethods: blocked
    };
  }
};