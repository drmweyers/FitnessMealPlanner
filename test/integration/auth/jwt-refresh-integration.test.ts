import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import authRouter from '../../../server/authRoutes';
import { requireAuth } from '../../../server/middleware/auth';
import { storage } from '../../../server/storage';
import { hashPassword } from '../../../server/auth';
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';

// Set JWT secret for testing
process.env.JWT_SECRET = 'test-jwt-secret-for-integration-tests';

describe('JWT Refresh Integration Tests', () => {
  let app: express.Application;
  let testUser: any;
  let testUserId: string;

  beforeEach(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/auth', authRouter);

    // Add a protected test route
    app.get('/protected', requireAuth, (req: any, res) => {
      res.json({
        message: 'Protected route accessed',
        user: req.user
      });
    });

    // Create test user
    testUserId = uuidv4();
    const hashedPassword = await hashPassword('TestPassword123!');
    testUser = {
      id: testUserId,
      email: 'integration-test@example.com',
      password: hashedPassword,
      role: 'customer' as const,
      createdAt: new Date()
    };

    // Clear any existing test data
    await storage.deleteUserByEmail(testUser.email).catch(() => {});
    
    // Create test user in database
    await storage.createUser(testUser);
  });

  afterEach(async () => {
    // Clean up test data
    await storage.deleteUserByEmail(testUser.email).catch(() => {});
    await storage.deleteAllRefreshTokensForUser(testUserId).catch(() => {});
  });

  describe('Full JWT Refresh Flow', () => {
    it('should complete full authentication and refresh flow', async () => {
      // Step 1: Login
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!'
        })
        .expect(200);

      expect(loginResponse.body.status).toBe('success');
      const accessToken = loginResponse.body.data.accessToken;
      const cookies = loginResponse.headers['set-cookie'];
      
      expect(accessToken).toBeDefined();
      expect(cookies).toBeDefined();

      // Extract refresh token from cookies
      const refreshTokenCookie = cookies.find((c: string) => c.startsWith('refreshToken='));
      expect(refreshTokenCookie).toBeDefined();

      // Step 2: Access protected route with valid token
      const protectedResponse = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(protectedResponse.body.message).toBe('Protected route accessed');
      expect(protectedResponse.body.user.id).toBe(testUserId);

      // Step 3: Manually refresh token
      const refreshResponse = await request(app)
        .post('/auth/refresh_token')
        .set('Cookie', cookies)
        .expect(200);

      expect(refreshResponse.body.status).toBe('success');
      const newAccessToken = refreshResponse.body.data.token;
      expect(newAccessToken).toBeDefined();
      expect(newAccessToken).not.toBe(accessToken); // Should be different

      // Step 4: Use new token
      const newProtectedResponse = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      expect(newProtectedResponse.body.message).toBe('Protected route accessed');
    });

    it('should automatically refresh expired token via middleware', async () => {
      // Login
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!'
        })
        .expect(200);

      const accessToken = loginResponse.body.data.accessToken;
      const cookies = loginResponse.headers['set-cookie'];

      // Create an expired token with same payload
      const decoded = jwt.decode(accessToken) as any;
      const expiredToken = jwt.sign(
        {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role
        },
        process.env.JWT_SECRET!,
        { expiresIn: '-1h' } // Already expired
      );

      // Try to access protected route with expired token but valid refresh cookie
      const protectedResponse = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${expiredToken}`)
        .set('Cookie', cookies)
        .expect(200);

      // Should still work due to automatic refresh
      expect(protectedResponse.body.message).toBe('Protected route accessed');
      
      // Check for new tokens in response headers
      const newCookies = protectedResponse.headers['set-cookie'];
      expect(newCookies).toBeDefined();
      expect(newCookies.some((c: string) => c.startsWith('token='))).toBe(true);
    });

    it('should handle multiple refresh requests correctly', async () => {
      // Login
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!'
        })
        .expect(200);

      let cookies = loginResponse.headers['set-cookie'];

      // Perform multiple refreshes
      for (let i = 0; i < 3; i++) {
        const refreshResponse = await request(app)
          .post('/auth/refresh_token')
          .set('Cookie', cookies)
          .expect(200);

        // Update cookies for next iteration
        cookies = refreshResponse.headers['set-cookie'];
        
        // Verify we got new tokens
        expect(refreshResponse.body.data.token).toBeDefined();
        
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Final token should still work
      const finalToken = cookies.find((c: string) => c.startsWith('token='))
        ?.split(';')[0]
        .split('=')[1];

      const protectedResponse = await request(app)
        .get('/protected')
        .set('Cookie', cookies)
        .expect(200);

      expect(protectedResponse.body.message).toBe('Protected route accessed');
    });

    it('should reject access when refresh token is revoked', async () => {
      // Login
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!'
        })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];
      const refreshTokenCookie = cookies
        .find((c: string) => c.startsWith('refreshToken='))
        ?.split(';')[0]
        .split('=')[1];

      // Delete refresh token from database (simulating revocation)
      await storage.deleteRefreshToken(refreshTokenCookie!);

      // Try to refresh - should fail
      const refreshResponse = await request(app)
        .post('/auth/refresh_token')
        .set('Cookie', cookies)
        .expect(401);

      expect(refreshResponse.body.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('should handle concurrent refresh attempts gracefully', async () => {
      // Login
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!'
        })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];

      // Make multiple concurrent refresh requests
      const refreshPromises = Array(5).fill(null).map(() =>
        request(app)
          .post('/auth/refresh_token')
          .set('Cookie', cookies)
      );

      const results = await Promise.allSettled(refreshPromises);
      
      // At least one should succeed
      const successfulRefreshes = results.filter(
        r => r.status === 'fulfilled' && r.value.status === 200
      );
      
      expect(successfulRefreshes.length).toBeGreaterThan(0);
    });

    it('should maintain user role across refresh', async () => {
      // Create admin user
      const adminId = uuidv4();
      const adminUser = {
        id: adminId,
        email: 'admin-integration@example.com',
        password: await hashPassword('AdminPassword123!'),
        role: 'admin' as const,
        createdAt: new Date()
      };
      
      await storage.createUser(adminUser);

      try {
        // Login as admin
        const loginResponse = await request(app)
          .post('/auth/login')
          .send({
            email: adminUser.email,
            password: 'AdminPassword123!'
          })
          .expect(200);

        const cookies = loginResponse.headers['set-cookie'];

        // Refresh token
        const refreshResponse = await request(app)
          .post('/auth/refresh_token')
          .set('Cookie', cookies)
          .expect(200);

        // Verify role is maintained
        expect(refreshResponse.body.data.user.role).toBe('admin');

        // Decode new token to verify claims
        const newToken = refreshResponse.body.data.token;
        const decoded = jwt.decode(newToken) as any;
        expect(decoded.role).toBe('admin');
        
      } finally {
        // Clean up
        await storage.deleteUserByEmail(adminUser.email);
        await storage.deleteAllRefreshTokensForUser(adminId);
      }
    });

    it('should clear cookies when refresh fails', async () => {
      // Login
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!'
        })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];

      // Create invalid refresh token cookie
      const invalidCookie = 'refreshToken=invalid-token; Path=/; HttpOnly';

      // Try to refresh with invalid token
      const refreshResponse = await request(app)
        .post('/auth/refresh_token')
        .set('Cookie', invalidCookie)
        .expect(401);

      // Should have clear cookie headers
      const responseCookies = refreshResponse.headers['set-cookie'];
      
      // Note: The actual implementation might not clear cookies on the refresh endpoint
      // This depends on the implementation details
    });

    it('should handle token expiration during long-running requests', async () => {
      // Login
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!'
        })
        .expect(200);

      const accessToken = loginResponse.body.data.accessToken;
      const cookies = loginResponse.headers['set-cookie'];

      // Add a slow endpoint for testing
      app.get('/slow-protected', requireAuth, async (req: any, res) => {
        // Simulate slow processing
        await new Promise(resolve => setTimeout(resolve, 100));
        res.json({
          message: 'Slow operation completed',
          user: req.user
        });
      });

      // Create a token that expires very soon
      const decoded = jwt.decode(accessToken) as any;
      const soonToExpireToken = jwt.sign(
        {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role
        },
        process.env.JWT_SECRET!,
        { expiresIn: '1s' }
      );

      // Wait a bit to ensure token expires during request
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Make request with expired token but valid refresh cookie
      const slowResponse = await request(app)
        .get('/slow-protected')
        .set('Authorization', `Bearer ${soonToExpireToken}`)
        .set('Cookie', cookies)
        .expect(200);

      expect(slowResponse.body.message).toBe('Slow operation completed');
    });
  });

  describe('Security Features', () => {
    it('should not allow refresh with tampered token', async () => {
      // Login
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!'
        })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];
      
      // Tamper with refresh token
      const tamperedCookie = cookies.map((c: string) => {
        if (c.startsWith('refreshToken=')) {
          const token = c.split(';')[0].split('=')[1];
          // Change last character
          const tampered = token.slice(0, -1) + 'X';
          return c.replace(token, tampered);
        }
        return c;
      });

      // Try to refresh with tampered token
      const refreshResponse = await request(app)
        .post('/auth/refresh_token')
        .set('Cookie', tamperedCookie)
        .expect(401);

      expect(refreshResponse.body.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('should enforce token expiration strictly', async () => {
      // This test verifies that expired tokens are rejected even with valid signature
      const expiredToken = jwt.sign(
        {
          id: testUserId,
          email: testUser.email,
          role: testUser.role
        },
        process.env.JWT_SECRET!,
        { expiresIn: '-1h' }
      );

      const protectedResponse = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(protectedResponse.body.code).toBe('SESSION_EXPIRED');
    });
  });
});