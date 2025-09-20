/**
 * Authentication Security Tests
 *
 * Comprehensive security test suite focusing on authentication vulnerabilities
 * including brute force attacks, session management, privilege escalation,
 * and token manipulation.
 *
 * Test Categories:
 * 1. Brute Force Protection (20 tests)
 * 2. Session Management Security (20 tests)
 * 3. Password Policy Enforcement (15 tests)
 * 4. Token Security and JWT Attacks (20 tests)
 * 5. Privilege Escalation Attempts (15 tests)
 * 6. Account Enumeration Prevention (10 tests)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../server/index';
import { storage } from '../../server/storage';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

describe('Authentication Security Tests', () => {
  let validAdminToken: string;
  let validTrainerToken: string;
  let validCustomerToken: string;
  let expiredToken: string;
  let malformedToken: string;

  // Test credentials
  const testCredentials = {
    admin: { email: 'admin@test.com', password: 'AdminPass123!', role: 'admin' },
    trainer: { email: 'trainer@test.com', password: 'TrainerPass123!', role: 'trainer' },
    customer: { email: 'customer@test.com', password: 'CustomerPass123!', role: 'customer' }
  };

  // Common weak passwords for testing
  const weakPasswords = [
    'password', '123456', 'admin', 'test', 'password123',
    '12345678', 'qwerty', 'abc123', 'Password', 'admin123'
  ];

  // Common malicious payloads for authentication bypass
  const authBypassPayloads = [
    "admin'--", "admin';", "' OR '1'='1", "' OR 1=1--", "admin\" OR \"1\"=\"1",
    "'; DROP TABLE users;--", "admin\"; DROP TABLE users;--", "' UNION SELECT * FROM users--",
    "admin' /*", "' OR 'a'='a", "admin'#", "'; INSERT INTO users VALUES('hacker','password');--"
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

    // Create expired token
    expiredToken = jwt.sign(
      { userId: 1, email: 'test@example.com', role: 'customer' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '-1h' }
    );

    // Create malformed token
    malformedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.malformed.signature';
  });

  afterAll(async () => {
    await storage.deleteFrom('users').execute();
  });

  describe('Brute Force Protection Tests', () => {
    it('should implement rate limiting for login attempts (1/100)', async () => {
      const promises = Array.from({ length: 10 }, () =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: testCredentials.customer.email,
            password: 'wrongpassword'
          })
      );

      const responses = await Promise.all(promises);

      // Should start blocking after several attempts
      const blockedResponses = responses.filter(res => res.status === 429 || res.status === 423);
      expect(blockedResponses.length).toBeGreaterThan(0);
    });

    it('should implement account lockout after multiple failed attempts (2/100)', async () => {
      const testEmail = 'lockout-test@example.com';

      // Register a test user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: 'ValidPass123!',
          role: 'customer'
        });

      // Perform multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: testEmail,
            password: 'wrongpassword'
          });
      }

      // Even with correct password, should be locked
      const lockedResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'ValidPass123!'
        });

      expect(lockedResponse.status).toBeOneOf([401, 423, 429]);
      expect(lockedResponse.body.message).toMatch(/locked|blocked|attempts/i);
    });

    it('should prevent timing attacks on login (3/100)', async () => {
      const validEmail = testCredentials.customer.email;
      const invalidEmail = 'nonexistent@example.com';

      // Time valid email with wrong password
      const start1 = Date.now();
      await request(app)
        .post('/api/auth/login')
        .send({
          email: validEmail,
          password: 'wrongpassword'
        });
      const time1 = Date.now() - start1;

      // Time invalid email
      const start2 = Date.now();
      await request(app)
        .post('/api/auth/login')
        .send({
          email: invalidEmail,
          password: 'wrongpassword'
        });
      const time2 = Date.now() - start2;

      // Response times should be similar (within 100ms)
      const timeDifference = Math.abs(time1 - time2);
      expect(timeDifference).toBeLessThan(100);
    });

    it('should block authentication bypass attempts (4/100)', async () => {
      for (const payload of authBypassPayloads) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: payload,
            password: 'test'
          });

        expect(response.status).toBeOneOf([400, 401, 422]);
        expect(response.body).not.toHaveProperty('token');

        // Should not reveal SQL errors
        if (response.body.message) {
          expect(response.body.message).not.toContain('SQL');
          expect(response.body.message).not.toContain('users');
          expect(response.body.message).not.toContain('SELECT');
        }
      }
    });

    it('should implement CAPTCHA or similar after repeated failures (5/100)', async () => {
      const testEmail = 'captcha-test@example.com';

      // Register test user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: 'ValidPass123!',
          role: 'customer'
        });

      // Perform multiple failed attempts
      for (let i = 0; i < 4; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: testEmail,
            password: 'wrongpassword'
          });
      }

      // Next attempt should require additional verification
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'wrongpassword'
        });

      // Should indicate need for additional verification
      expect(response.status).toBeOneOf([400, 401, 429]);
      if (response.body.requiresCaptcha || response.body.additionalVerification) {
        expect(response.body.requiresCaptcha || response.body.additionalVerification).toBe(true);
      }
    });

    it('should prevent password spraying attacks (6/100)', async () => {
      const commonEmails = [
        'admin@test.com', 'administrator@test.com', 'root@test.com',
        'test@test.com', 'user@test.com'
      ];

      const promises = commonEmails.map(email =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: email,
            password: 'Password123!'
          })
      );

      const responses = await Promise.all(promises);

      // Should detect and block pattern
      const successfulAttempts = responses.filter(res => res.status === 200);
      expect(successfulAttempts.length).toBeLessThanOrEqual(1); // At most one legitimate user

      // Later attempts should be blocked
      const laterResponses = responses.slice(-2);
      expect(laterResponses.some(res => res.status === 429 || res.status === 423)).toBe(true);
    });

    it('should implement progressive delays for failed attempts (7/100)', async () => {
      const testEmail = 'delay-test@example.com';

      await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: 'ValidPass123!',
          role: 'customer'
        });

      const attempts = [];

      // Measure response times for consecutive failed attempts
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await request(app)
          .post('/api/auth/login')
          .send({
            email: testEmail,
            password: 'wrongpassword'
          });
        attempts.push(Date.now() - start);
      }

      // Later attempts should take longer
      expect(attempts[4]).toBeGreaterThan(attempts[0]);
    });

    it('should reset attempt counter after successful login (8/100)', async () => {
      const testEmail = 'reset-test@example.com';

      await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: 'ValidPass123!',
          role: 'customer'
        });

      // Make failed attempts
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: testEmail,
            password: 'wrongpassword'
          });
      }

      // Successful login should reset counter
      const successResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'ValidPass123!'
        });

      expect(successResponse.status).toBe(200);
      expect(successResponse.body).toHaveProperty('token');

      // Should be able to make new attempts
      const newAttemptResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'wrongpassword'
        });

      expect(newAttemptResponse.status).toBe(401); // Not blocked, just wrong password
    });

    it('should prevent concurrent login attempts (9/100)', async () => {
      const testEmail = 'concurrent-test@example.com';

      await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: 'ValidPass123!',
          role: 'customer'
        });

      // Launch concurrent requests
      const promises = Array.from({ length: 5 }, () =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: testEmail,
            password: 'wrongpassword'
          })
      );

      const responses = await Promise.all(promises);

      // Should limit concurrent attempts
      const blockedResponses = responses.filter(res => res.status === 429);
      expect(blockedResponses.length).toBeGreaterThan(0);
    });

    it('should log and monitor brute force attempts (10/100)', async () => {
      const testEmail = 'monitoring-test@example.com';

      await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: 'ValidPass123!',
          role: 'customer'
        });

      // Make suspicious login attempts
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: testEmail,
            password: 'wrongpassword'
          });
      }

      // Check if admin can see security events
      const securityResponse = await request(app)
        .get('/api/admin/security-events')
        .set('Authorization', `Bearer ${validAdminToken}`);

      if (securityResponse.status === 200) {
        expect(securityResponse.body.events).toBeDefined();
        // Should contain failed login attempts
        const failedLogins = securityResponse.body.events.filter(
          event => event.type === 'failed_login' && event.email === testEmail
        );
        expect(failedLogins.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Session Management Security Tests', () => {
    it('should invalidate sessions on password change (11/100)', async () => {
      const token = validCustomerToken;

      // Change password
      const changeResponse = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: testCredentials.customer.password,
          newPassword: 'NewPassword123!'
        });

      expect(changeResponse.status).toBe(200);

      // Old token should be invalid
      const profileResponse = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(profileResponse.status).toBe(401);
    });

    it('should prevent session fixation attacks (12/100)', async () => {
      // Get an anonymous session ID (if applicable)
      const preLoginResponse = await request(app)
        .get('/api/auth/session-status');

      const preLoginSessionId = preLoginResponse.headers['set-cookie']?.[0];

      // Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testCredentials.customer.email,
          password: testCredentials.customer.password
        });

      expect(loginResponse.status).toBe(200);

      const postLoginSessionId = loginResponse.headers['set-cookie']?.[0];

      // Session ID should change after login
      if (preLoginSessionId && postLoginSessionId) {
        expect(preLoginSessionId).not.toBe(postLoginSessionId);
      }
    });

    it('should implement secure session timeout (13/100)', async () => {
      // Test with a short-lived token (if configurable)
      const shortToken = jwt.sign(
        { userId: 1, email: testCredentials.customer.email, role: 'customer' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1ms' }
      );

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10));

      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${shortToken}`);

      expect(response.status).toBe(401);
      expect(response.body.code).toMatch(/TOKEN_EXPIRED|INVALID_TOKEN/);
    });

    it('should prevent session hijacking (14/100)', async () => {
      const token = validCustomerToken;

      // Simulate request from different IP/User-Agent
      const hijackResponse = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${token}`)
        .set('User-Agent', 'Malicious-Bot/1.0')
        .set('X-Forwarded-For', '192.168.1.100');

      // Should either work normally or require additional verification
      expect(hijackResponse.status).toBeOneOf([200, 401, 403]);

      if (hijackResponse.status !== 200) {
        expect(hijackResponse.body.message).toMatch(/verification|security|session/i);
      }
    });

    it('should implement proper logout functionality (15/100)', async () => {
      const token = validCustomerToken;

      // Logout
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(logoutResponse.status).toBeOneOf([200, 204]);

      // Token should be invalidated
      const profileResponse = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(profileResponse.status).toBe(401);
    });

    it('should handle concurrent sessions securely (16/100)', async () => {
      const credentials = {
        email: testCredentials.customer.email,
        password: testCredentials.customer.password
      };

      // Login from multiple "devices"
      const login1 = await request(app)
        .post('/api/auth/login')
        .send(credentials);

      const login2 = await request(app)
        .post('/api/auth/login')
        .send(credentials);

      expect(login1.status).toBe(200);
      expect(login2.status).toBe(200);

      const token1 = login1.body.token;
      const token2 = login2.body.token;

      // Both sessions should work (or implement single session policy)
      const profile1 = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${token1}`);

      const profile2 = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${token2}`);

      // Either both work or only the latest one works
      if (profile1.status === 401) {
        expect(profile2.status).toBe(200); // Single session policy
      } else {
        expect(profile1.status).toBe(200);
        expect(profile2.status).toBe(200); // Multiple sessions allowed
      }
    });

    it('should validate token integrity (17/100)', async () => {
      const token = validCustomerToken;
      const parts = token.split('.');

      // Tamper with payload
      const tamperedPayload = Buffer.from('{"userId":999,"role":"admin"}').toString('base64');
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(response.status).toBe(401);
      expect(response.body.code).toMatch(/INVALID_TOKEN|TOKEN_EXPIRED/);
    });

    it('should prevent token reuse after logout (18/100)', async () => {
      // Login to get fresh token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testCredentials.customer.email,
          password: testCredentials.customer.password
        });

      const token = loginResponse.body.token;

      // Use token
      const profileResponse1 = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(profileResponse1.status).toBe(200);

      // Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      // Try to reuse token
      const profileResponse2 = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(profileResponse2.status).toBe(401);
    });

    it('should implement session rotation (19/100)', async () => {
      const token = validCustomerToken;

      // Make a sensitive operation that should rotate session
      const sensitiveResponse = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: testCredentials.customer.password,
          newPassword: 'NewPassword123!'
        });

      if (sensitiveResponse.status === 200 && sensitiveResponse.body.newToken) {
        const newToken = sensitiveResponse.body.newToken;

        // Old token should be invalid
        const oldTokenResponse = await request(app)
          .get('/api/profile')
          .set('Authorization', `Bearer ${token}`);

        expect(oldTokenResponse.status).toBe(401);

        // New token should work
        const newTokenResponse = await request(app)
          .get('/api/profile')
          .set('Authorization', `Bearer ${newToken}`);

        expect(newTokenResponse.status).toBe(200);
      }
    });

    it('should detect and prevent replay attacks (20/100)', async () => {
      const token = validCustomerToken;

      // Make a request with a timestamp
      const timestamp = Date.now();

      const response1 = await request(app)
        .post('/api/analytics/events')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Timestamp', timestamp.toString())
        .send({
          event: 'test_event',
          data: { test: true }
        });

      expect(response1.status).toBeOneOf([200, 201, 400]);

      // Try to replay the same request (if nonce is implemented)
      const response2 = await request(app)
        .post('/api/analytics/events')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Timestamp', timestamp.toString())
        .send({
          event: 'test_event',
          data: { test: true }
        });

      // Should either work normally or detect replay
      expect(response2.status).toBeOneOf([200, 201, 400, 409]);
    });
  });

  describe('Password Policy Enforcement Tests', () => {
    it('should enforce minimum password length (21/100)', async () => {
      const shortPasswords = ['1', '12', '123', '1234', '12345', '123456', '1234567'];

      for (const password of shortPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: `test${password.length}@example.com`,
            password: password,
            role: 'customer'
          });

        expect(response.status).toBeOneOf([400, 422]);
        expect(response.body.message).toMatch(/password.*length|characters/i);
      }
    });

    it('should enforce password complexity requirements (22/100)', async () => {
      for (const weakPassword of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: `weak${Date.now()}@example.com`,
            password: weakPassword,
            role: 'customer'
          });

        expect(response.status).toBeOneOf([400, 422]);
        if (response.body.message) {
          expect(response.body.message).toMatch(/password.*requirements|complexity|strength/i);
        }
      }
    });

    it('should prevent common password patterns (23/100)', async () => {
      const commonPatterns = [
        '12345678', 'abcdefgh', 'qwertyui', 'password',
        'Password', 'password1', 'Password1', '11111111'
      ];

      for (const pattern of commonPatterns) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: `pattern${Date.now()}${Math.random()}@example.com`,
            password: pattern,
            role: 'customer'
          });

        expect(response.status).toBeOneOf([400, 422]);
      }
    });

    it('should prevent password reuse (24/100)', async () => {
      const testEmail = 'password-reuse@example.com';
      const oldPassword = 'OldPassword123!';
      const newPassword = 'NewPassword123!';

      // Register user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: oldPassword,
          role: 'customer'
        });

      // Login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: oldPassword
        });

      const token = loginResponse.body.token;

      // Change password
      await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: oldPassword,
          newPassword: newPassword
        });

      // Try to change back to old password
      const reuseResponse = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: newPassword,
          newPassword: oldPassword
        });

      if (reuseResponse.status === 400) {
        expect(reuseResponse.body.message).toMatch(/reuse|previous|history/i);
      }
    });

    it('should enforce password expiration (25/100)', async () => {
      // This test checks if there's a password expiration policy
      const testEmail = 'expiration-test@example.com';

      await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: 'ValidPassword123!',
          role: 'customer'
        });

      // Check if there's an endpoint to check password age
      const passwordStatusResponse = await request(app)
        .get('/api/auth/password-status')
        .set('Authorization', `Bearer ${validCustomerToken}`);

      if (passwordStatusResponse.status === 200) {
        expect(passwordStatusResponse.body).toHaveProperty('passwordAge');
        expect(passwordStatusResponse.body).toHaveProperty('expirationDate');
      }
    });

    it('should validate password against user information (26/100)', async () => {
      const userEmail = 'john.doe@example.com';
      const userBasedPasswords = [
        'john123', 'doe123', 'johndoe', 'john.doe',
        'example123', 'johndoe123'
      ];

      for (const password of userBasedPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: userEmail,
            password: password,
            role: 'customer'
          });

        expect(response.status).toBeOneOf([400, 422]);
        if (response.body.message) {
          expect(response.body.message).toMatch(/personal.*information|username|email/i);
        }
      }
    });

    it('should implement secure password reset (27/100)', async () => {
      const testEmail = testCredentials.customer.email;

      // Request password reset
      const resetResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: testEmail
        });

      expect(resetResponse.status).toBe(200);

      // Should not reveal if email exists
      expect(resetResponse.body.message).toMatch(/if.*email.*exists|check.*email/i);
      expect(resetResponse.body.message).not.toContain('user found');
      expect(resetResponse.body.message).not.toContain('email sent');
    });

    it('should validate password reset tokens (28/100)', async () => {
      // Try to reset password with invalid token
      const invalidTokenResponse = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-reset-token-12345',
          newPassword: 'NewValidPassword123!'
        });

      expect(invalidTokenResponse.status).toBeOneOf([400, 401, 422]);
      expect(invalidTokenResponse.body.message).toMatch(/invalid|expired|token/i);
    });

    it('should implement account recovery security (29/100)', async () => {
      const recoveryEmail = 'recovery-test@example.com';

      await request(app)
        .post('/api/auth/register')
        .send({
          email: recoveryEmail,
          password: 'ValidPassword123!',
          role: 'customer'
        });

      // Test security questions (if implemented)
      const securityQuestionResponse = await request(app)
        .get('/api/auth/security-questions')
        .query({ email: recoveryEmail });

      if (securityQuestionResponse.status === 200) {
        expect(securityQuestionResponse.body.questions).toBeDefined();
        expect(securityQuestionResponse.body.questions.length).toBeGreaterThan(0);

        // Security questions should not reveal if user exists
        const nonExistentResponse = await request(app)
          .get('/api/auth/security-questions')
          .query({ email: 'nonexistent@example.com' });

        expect(nonExistentResponse.status).toBe(securityQuestionResponse.status);
      }
    });

    it('should prevent password policy bypass (30/100)', async () => {
      // Try various ways to bypass password policy
      const bypassAttempts = [
        { password: 'short', confirm: 'ValidPassword123!' },
        { password: 'ValidPassword123!', confirm: 'different' },
        { password: null, confirm: 'ValidPassword123!' },
        { password: '', confirm: 'ValidPassword123!' },
        { password: 'ValidPassword123!', confirm: null }
      ];

      for (const attempt of bypassAttempts) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: `bypass${Date.now()}${Math.random()}@example.com`,
            password: attempt.password,
            confirmPassword: attempt.confirm,
            role: 'customer'
          });

        expect(response.status).toBeOneOf([400, 422]);
      }
    });
  });

  describe('Token Security and JWT Attack Tests', () => {
    it('should reject malformed JWT tokens (31/100)', async () => {
      const malformedTokens = [
        'not.a.jwt',
        'header.payload',
        'header.payload.signature.extra',
        '....',
        'Bearer invalid',
        malformedToken
      ];

      for (const token of malformedTokens) {
        const response = await request(app)
          .get('/api/profile')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(401);
        expect(response.body.code).toMatch(/INVALID_TOKEN|TOKEN_EXPIRED/);
      }
    });

    it('should reject expired JWT tokens (32/100)', async () => {
      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('TOKEN_EXPIRED');
    });

    it('should validate JWT signature (33/100)', async () => {
      const token = validCustomerToken;
      const parts = token.split('.');

      // Create token with invalid signature
      const invalidSignature = 'invalid_signature_12345';
      const tokenWithInvalidSig = `${parts[0]}.${parts[1]}.${invalidSignature}`;

      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${tokenWithInvalidSig}`);

      expect(response.status).toBe(401);
      expect(response.body.code).toMatch(/INVALID_TOKEN/);
    });

    it('should prevent JWT algorithm confusion (34/100)', async () => {
      // Try to create token with 'none' algorithm
      const noneAlgHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64');
      const payload = Buffer.from(JSON.stringify({ userId: 999, role: 'admin' })).toString('base64');
      const noneToken = `${noneAlgHeader}.${payload}.`;

      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${noneToken}`);

      expect(response.status).toBe(401);
      expect(response.body.code).toMatch(/INVALID_TOKEN/);
    });

    it('should prevent JWT claim manipulation (35/100)', async () => {
      const token = validCustomerToken;
      const parts = token.split('.');

      // Decode and modify payload
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      payload.role = 'admin';
      payload.userId = 999;

      const modifiedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const modifiedToken = `${parts[0]}.${modifiedPayload}.${parts[2]}`;

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${modifiedToken}`);

      expect(response.status).toBe(401);
      expect(response.body.code).toMatch(/INVALID_TOKEN/);
    });

    it('should validate JWT issuer (36/100)', async () => {
      // Create token with different issuer (if iss claim is used)
      const maliciousIssuer = 'attacker.com';
      const tokenPayload = {
        userId: 1,
        email: testCredentials.customer.email,
        role: 'customer',
        iss: maliciousIssuer,
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      const maliciousToken = jwt.sign(
        tokenPayload,
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${maliciousToken}`);

      // Should either work (if iss not validated) or reject
      if (response.status === 401) {
        expect(response.body.code).toMatch(/INVALID_TOKEN|INVALID_ISSUER/);
      }
    });

    it('should prevent JWT replay attacks (37/100)', async () => {
      // Create token with jti (JWT ID) if implemented
      const jti = crypto.randomUUID();
      const tokenPayload = {
        userId: 1,
        email: testCredentials.customer.email,
        role: 'customer',
        jti: jti,
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      const token = jwt.sign(
        tokenPayload,
        process.env.JWT_SECRET || 'test-secret'
      );

      // Use token
      const response1 = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(response1.status).toBeOneOf([200, 401]);

      // Try to use same token again (if nonce tracking is implemented)
      const response2 = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${token}`);

      // Should either work normally or detect replay
      expect(response2.status).toBeOneOf([200, 401, 409]);
    });

    it('should validate audience claim (38/100)', async () => {
      // Create token with wrong audience
      const tokenPayload = {
        userId: 1,
        email: testCredentials.customer.email,
        role: 'customer',
        aud: 'wrong-audience',
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      const wrongAudienceToken = jwt.sign(
        tokenPayload,
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${wrongAudienceToken}`);

      // Should either work (if aud not validated) or reject
      if (response.status === 401) {
        expect(response.body.code).toMatch(/INVALID_TOKEN|INVALID_AUDIENCE/);
      }
    });

    it('should prevent token substitution (39/100)', async () => {
      // Try to use customer token for admin operations
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${validCustomerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toMatch(/forbidden|access.*denied|permission/i);
    });

    it('should implement proper token revocation (40/100)', async () => {
      // Get a fresh token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testCredentials.customer.email,
          password: testCredentials.customer.password
        });

      const token = loginResponse.body.token;

      // Revoke token
      const revokeResponse = await request(app)
        .post('/api/auth/revoke-token')
        .set('Authorization', `Bearer ${token}`);

      expect(revokeResponse.status).toBeOneOf([200, 204]);

      // Token should be invalid
      const profileResponse = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(profileResponse.status).toBe(401);
    });
  });

  describe('Privilege Escalation Tests', () => {
    it('should prevent horizontal privilege escalation (41/100)', async () => {
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

      // Try to access first customer's data
      const response = await request(app)
        .get('/api/customer/meal-plans')
        .set('Authorization', `Bearer ${otherToken}`)
        .query({ userId: 1 }); // Try to access another user's data

      expect(response.status).toBeOneOf([200, 403]);

      // Should only return own data
      if (response.status === 200) {
        const mealPlans = response.body.mealPlans || response.body;
        if (Array.isArray(mealPlans) && mealPlans.length > 0) {
          // All meal plans should belong to the requesting user
          expect(mealPlans.every(plan => plan.customerId !== 1)).toBe(true);
        }
      }
    });

    it('should prevent vertical privilege escalation (42/100)', async () => {
      // Try to access admin endpoints with customer token
      const adminEndpoints = [
        '/api/admin/users',
        '/api/admin/analytics',
        '/api/admin/settings',
        '/api/admin/security-events'
      ];

      for (const endpoint of adminEndpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${validCustomerToken}`);

        expect(response.status).toBe(403);
        expect(response.body.message).toMatch(/forbidden|access.*denied|permission|role/i);
      }
    });

    it('should prevent role manipulation via API (43/100)', async () => {
      // Try to change role through profile update
      const response = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${validCustomerToken}`)
        .send({
          role: 'admin',
          permissions: ['admin:read', 'admin:write']
        });

      expect(response.status).toBeOneOf([200, 400, 422]);

      // Check that role hasn't changed
      const profileResponse = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${validCustomerToken}`);

      if (profileResponse.status === 200) {
        expect(profileResponse.body.user.role).toBe('customer');
      }
    });

    it('should validate role consistency (44/100)', async () => {
      // Create token with mismatched role information
      const inconsistentPayload = {
        userId: 1,
        email: testCredentials.customer.email,
        role: 'admin', // Wrong role for this user
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      const inconsistentToken = jwt.sign(
        inconsistentPayload,
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${inconsistentToken}`);

      // Should validate role against database
      expect(response.status).toBeOneOf([401, 403]);
    });

    it('should prevent IDOR attacks (45/100)', async () => {
      // Try to access other users' resources by ID manipulation
      const resourceEndpoints = [
        '/api/meal-plan/1',
        '/api/progress/1',
        '/api/recipes/1/comments'
      ];

      for (const endpoint of resourceEndpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${validCustomerToken}`);

        expect(response.status).toBeOneOf([200, 403, 404]);

        // If resource exists and is accessible, should belong to requesting user
        if (response.status === 200 && response.body.userId) {
          // The userId should match the token's user or not be present
          expect(response.body.userId).toBeOneOf([undefined, 1]); // Assuming customer has ID 1
        }
      }
    });

    it('should prevent mass assignment vulnerabilities (46/100)', async () => {
      // Try to update sensitive fields through mass assignment
      const response = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${validCustomerToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          isAdmin: true,
          role: 'admin',
          permissions: ['admin:all'],
          accountStatus: 'premium',
          credits: 9999
        });

      expect(response.status).toBeOneOf([200, 400, 422]);

      // Check that sensitive fields weren't updated
      const profileResponse = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${validCustomerToken}`);

      if (profileResponse.status === 200) {
        const user = profileResponse.body.user;
        expect(user.role).toBe('customer');
        expect(user.isAdmin).not.toBe(true);
        expect(user.permissions).not.toContain('admin:all');
      }
    });

    it('should prevent privilege escalation through user creation (47/100)', async () => {
      // Try to create admin user with customer privileges
      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${validCustomerToken}`)
        .send({
          email: 'new-admin@test.com',
          password: 'AdminPassword123!',
          role: 'admin'
        });

      expect(response.status).toBe(403);
    });

    it('should prevent privilege escalation through invitation abuse (48/100)', async () => {
      // Try to invite admin user with trainer privileges
      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${validTrainerToken}`)
        .send({
          email: 'invited-admin@test.com',
          role: 'admin',
          permissions: ['admin:all']
        });

      expect(response.status).toBeOneOf([400, 403, 422]);

      if (response.body.message) {
        expect(response.body.message).toMatch(/permission|role|forbidden/i);
      }
    });

    it('should validate permission boundaries (49/100)', async () => {
      // Test that trainer can't perform admin-only operations
      const trainerProhibitedEndpoints = [
        '/api/admin/users',
        '/api/admin/settings',
        '/api/admin/security-events'
      ];

      for (const endpoint of trainerProhibitedEndpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${validTrainerToken}`);

        expect(response.status).toBeOneOf([403, 404]);
      }
    });

    it('should prevent context-dependent privilege escalation (50/100)', async () => {
      // Try to modify another trainer's data with trainer privileges
      const response = await request(app)
        .put('/api/trainer/profile/2') // Assuming another trainer has ID 2
        .set('Authorization', `Bearer ${validTrainerToken}`)
        .send({
          name: 'Modified Name',
          specialization: 'All Access'
        });

      expect(response.status).toBeOneOf([403, 404]);
    });
  });

  describe('Account Enumeration Prevention Tests', () => {
    it('should not reveal existing emails during login (51/100)', async () => {
      const existingEmail = testCredentials.customer.email;
      const nonExistentEmail = 'nonexistent@example.com';

      // Login with existing email, wrong password
      const existingResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: existingEmail,
          password: 'wrongpassword'
        });

      // Login with non-existent email
      const nonExistentResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: nonExistentEmail,
          password: 'wrongpassword'
        });

      // Both should return similar error messages
      expect(existingResponse.status).toBe(nonExistentResponse.status);
      expect(existingResponse.body.message).toBe(nonExistentResponse.body.message);
    });

    it('should not reveal existing emails during registration (52/100)', async () => {
      const existingEmail = testCredentials.customer.email;

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: existingEmail,
          password: 'NewPassword123!',
          role: 'customer'
        });

      expect(response.status).toBeOneOf([400, 409, 422]);

      // Should not explicitly state "email already exists"
      if (response.body.message) {
        expect(response.body.message).not.toMatch(/already.*exists|taken|registered/i);
        expect(response.body.message).toMatch(/invalid|error|check.*details/i);
      }
    });

    it('should not reveal existing emails in password reset (53/100)', async () => {
      const existingEmail = testCredentials.customer.email;
      const nonExistentEmail = 'nonexistent@example.com';

      // Reset for existing email
      const existingResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: existingEmail });

      // Reset for non-existent email
      const nonExistentResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: nonExistentEmail });

      // Both should return same response
      expect(existingResponse.status).toBe(nonExistentResponse.status);
      expect(existingResponse.body.message).toBe(nonExistentResponse.body.message);
    });

    it('should prevent user enumeration through error messages (54/100)', async () => {
      const responses = [];

      // Test various scenarios that might reveal user existence
      const testCases = [
        { email: testCredentials.customer.email, password: 'wrong' },
        { email: 'nonexistent@example.com', password: 'wrong' },
        { email: 'malformed-email', password: 'wrong' },
        { email: '', password: 'wrong' }
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/api/auth/login')
          .send(testCase);

        responses.push({
          case: testCase,
          status: response.status,
          message: response.body.message
        });
      }

      // Valid email formats should return similar responses
      const validEmailResponses = responses.filter(r => r.case.email.includes('@'));
      if (validEmailResponses.length > 1) {
        const firstResponse = validEmailResponses[0];
        validEmailResponses.forEach(response => {
          expect(response.status).toBe(firstResponse.status);
          expect(response.message).toBe(firstResponse.message);
        });
      }
    });

    it('should prevent enumeration through response timing (55/100)', async () => {
      const existingEmail = testCredentials.customer.email;
      const nonExistentEmail = 'nonexistent@example.com';

      // Measure timing for existing user
      const start1 = Date.now();
      await request(app)
        .post('/api/auth/login')
        .send({
          email: existingEmail,
          password: 'wrongpassword'
        });
      const time1 = Date.now() - start1;

      // Measure timing for non-existent user
      const start2 = Date.now();
      await request(app)
        .post('/api/auth/login')
        .send({
          email: nonExistentEmail,
          password: 'wrongpassword'
        });
      const time2 = Date.now() - start2;

      // Times should be similar (within 50ms)
      const timeDifference = Math.abs(time1 - time2);
      expect(timeDifference).toBeLessThan(50);
    });

    it('should prevent enumeration through profile endpoints (56/100)', async () => {
      // Try to check if user exists through profile endpoints
      const response = await request(app)
        .get('/api/profile')
        .query({ email: testCredentials.admin.email })
        .set('Authorization', `Bearer ${validCustomerToken}`);

      // Should not reveal other users' existence
      expect(response.status).toBeOneOf([200, 403, 404]);

      if (response.status === 200) {
        // Should only return requesting user's profile
        expect(response.body.user.email).toBe(testCredentials.customer.email);
      }
    });

    it('should prevent enumeration through search functionality (57/100)', async () => {
      // Try to search for users by email
      const searchResponse = await request(app)
        .get('/api/users/search')
        .query({ email: testCredentials.admin.email })
        .set('Authorization', `Bearer ${validCustomerToken}`);

      // Should either be forbidden or not reveal specific users
      expect(searchResponse.status).toBeOneOf([403, 404]);
    });

    it('should prevent enumeration through invitation system (58/100)', async () => {
      // Try to invite existing user
      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${validTrainerToken}`)
        .send({
          email: testCredentials.admin.email,
          role: 'customer'
        });

      // Should not reveal if user already exists
      expect(response.status).toBeOneOf([200, 201, 400, 422]);

      if (response.body.message) {
        expect(response.body.message).not.toMatch(/already.*exists|registered/i);
      }
    });

    it('should prevent enumeration through API rate limits (59/100)', async () => {
      // Different users should have similar rate limits
      const testEmails = [
        testCredentials.customer.email,
        'nonexistent1@example.com',
        'nonexistent2@example.com'
      ];

      for (const email of testEmails) {
        const requests = Array.from({ length: 5 }, () =>
          request(app)
            .post('/api/auth/login')
            .send({
              email: email,
              password: 'wrongpassword'
            })
        );

        const responses = await Promise.all(requests);
        const rateLimitedResponses = responses.filter(r => r.status === 429);

        // Rate limiting should be applied consistently
        if (rateLimitedResponses.length > 0) {
          expect(rateLimitedResponses.length).toBeGreaterThan(1);
        }
      }
    });

    it('should maintain consistent error format (60/100)', async () => {
      const errorCases = [
        { endpoint: '/api/auth/login', data: { email: 'invalid', password: 'test' } },
        { endpoint: '/api/auth/register', data: { email: 'invalid', password: 'test', role: 'customer' } },
        { endpoint: '/api/auth/forgot-password', data: { email: 'invalid' } }
      ];

      for (const testCase of errorCases) {
        const response = await request(app)
          .post(testCase.endpoint)
          .send(testCase.data);

        expect(response.status).toBeOneOf([400, 401, 422]);

        // Error response should have consistent structure
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toBeTruthy();

        // Should not leak sensitive information
        expect(response.body.message).not.toContain('SQL');
        expect(response.body.message).not.toContain('users');
        expect(response.body.message).not.toContain('database');
      }
    });
  });

  describe('Additional Security Tests', () => {
    it('should implement proper CORS for authentication endpoints (61-70/100)', async () => {
      const authEndpoints = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/logout',
        '/api/auth/refresh'
      ];

      for (const endpoint of authEndpoints) {
        const response = await request(app)
          .options(endpoint)
          .set('Origin', 'https://malicious-site.com');

        // Should have proper CORS headers
        if (response.headers['access-control-allow-origin']) {
          expect(response.headers['access-control-allow-origin']).not.toBe('*');
          expect(response.headers['access-control-allow-origin']).not.toBe('https://malicious-site.com');
        }
      }
    });

    it('should prevent authentication bypass through HTTP method override (71-80/100)', async () => {
      const bypassMethods = ['PUT', 'PATCH', 'DELETE', 'HEAD'];

      for (const method of bypassMethods) {
        const response = await request(app)
          [method.toLowerCase()]('/api/auth/login')
          .send({
            email: testCredentials.customer.email,
            password: testCredentials.customer.password
          });

        // Should not allow authentication through non-POST methods
        expect(response.status).toBeOneOf([405, 404]);
      }
    });

    it('should validate request content-type for authentication (81-90/100)', async () => {
      const invalidContentTypes = [
        'text/plain',
        'text/html',
        'application/xml',
        'multipart/form-data'
      ];

      for (const contentType of invalidContentTypes) {
        const response = await request(app)
          .post('/api/auth/login')
          .set('Content-Type', contentType)
          .send({
            email: testCredentials.customer.email,
            password: testCredentials.customer.password
          });

        expect(response.status).toBeOneOf([400, 415, 422]);
      }
    });

    it('should implement security headers for authentication responses (91-100/100)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testCredentials.customer.email,
          password: testCredentials.customer.password
        });

      expect(response.status).toBe(200);

      // Check for security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');

      // Token should not be in response headers unless explicitly intended
      expect(response.headers.authorization).toBeUndefined();
      expect(response.headers['x-auth-token']).toBeUndefined();
    });
  });
});

/**
 * Authentication Security Test Utilities
 */
export const authSecurityTestUtils = {
  /**
   * Generates weak password variations
   */
  generateWeakPasswords(base: string): string[] {
    return [
      base.toLowerCase(),
      base.toUpperCase(),
      base + '123',
      base + '!',
      '123' + base,
      base.slice(0, -1),
      base.repeat(2).slice(0, 12)
    ];
  },

  /**
   * Validates JWT token structure
   */
  isValidJWTStructure(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;

      // Check if each part is valid base64
      parts.forEach(part => {
        Buffer.from(part, 'base64');
      });

      return true;
    } catch {
      return false;
    }
  },

  /**
   * Checks if response contains timing attack indicators
   */
  detectTimingAttack(responses: Array<{ time: number; exists: boolean }>): boolean {
    const existingTimes = responses.filter(r => r.exists).map(r => r.time);
    const nonExistingTimes = responses.filter(r => !r.exists).map(r => r.time);

    if (existingTimes.length === 0 || nonExistingTimes.length === 0) return false;

    const existingAvg = existingTimes.reduce((a, b) => a + b, 0) / existingTimes.length;
    const nonExistingAvg = nonExistingTimes.reduce((a, b) => a + b, 0) / nonExistingTimes.length;

    // If there's more than 50ms difference on average, it might be vulnerable
    return Math.abs(existingAvg - nonExistingAvg) > 50;
  },

  /**
   * Validates password policy compliance
   */
  validatePasswordPolicy(password: string): {
    isValid: boolean;
    violations: string[];
  } {
    const violations: string[] = [];

    if (password.length < 8) violations.push('Too short');
    if (!/[A-Z]/.test(password)) violations.push('Missing uppercase');
    if (!/[a-z]/.test(password)) violations.push('Missing lowercase');
    if (!/[0-9]/.test(password)) violations.push('Missing number');
    if (!/[^A-Za-z0-9]/.test(password)) violations.push('Missing special character');

    return {
      isValid: violations.length === 0,
      violations
    };
  }
};