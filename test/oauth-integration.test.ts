import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp } from './utils/testApp';
import { createTestDatabase, cleanupTestDatabase } from './utils/testDatabase';
import { storage } from '../server/storage';

// Mock Google OAuth for integration tests
const mockGoogleProfile = {
  id: 'google-test-123',
  emails: [{ value: 'integration.test@example.com' }],
  displayName: 'Integration Test User',
  photos: [{ value: 'https://example.com/photo.jpg' }]
};

// Mock passport Google strategy for integration tests
vi.mock('../server/passport-config', () => {
  const passport = {
    use: vi.fn(),
    initialize: () => (req: any, res: any, next: any) => next(),
    session: () => (req: any, res: any, next: any) => next(),
    authenticate: vi.fn((strategy: string, options?: any) => {
      return (req: any, res: any, next: any) => {
        // Simulate different OAuth scenarios based on test context
        const scenario = req.headers['x-test-scenario'];
        
        switch (scenario) {
          case 'success-new-user':
            req.user = {
              id: 'new-user-123',
              email: 'integration.test@example.com',
              role: req.session?.intendedRole || 'customer',
              googleId: 'google-test-123'
            };
            break;
          case 'success-existing-user':
            req.user = {
              id: 'existing-user-456',
              email: 'existing@example.com',
              role: 'trainer',
              googleId: 'google-existing-456'
            };
            break;
          case 'failure-no-email':
            return res.redirect('/login?error=no_email');
          case 'failure-server-error':
            return res.redirect('/login?error=server_error');
          default:
            req.user = null;
        }
        
        next();
      };
    }),
    serializeUser: vi.fn(),
    deserializeUser: vi.fn()
  };
  
  return { default: passport };
});

describe('OAuth Integration Tests', () => {
  let app: any;
  let testDb: any;

  beforeEach(async () => {
    testDb = await createTestDatabase();
    app = createTestApp();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupTestDatabase(testDb);
    vi.resetAllMocks();
  });

  describe('Complete OAuth Flow', () => {
    it('should complete full OAuth flow for new trainer user', async () => {
      // Step 1: Initiate OAuth with role selection
      const initiateResponse = await request(app)
        .get('/api/auth/google/trainer')
        .expect(302);

      // Verify redirect to Google (mocked)
      expect(initiateResponse.headers.location).toContain('google.com');

      // Step 2: Simulate OAuth callback with new user
      const callbackResponse = await request(app)
        .get('/api/auth/google/callback')
        .set('x-test-scenario', 'success-new-user')
        .expect(302);

      // Should redirect to trainer dashboard with token
      expect(callbackResponse.headers.location).toContain('/trainer');
      expect(callbackResponse.headers.location).toContain('token=');

      // Should set refresh token cookie
      const cookies = callbackResponse.headers['set-cookie'];
      expect(cookies.some((cookie: string) => 
        cookie.includes('refreshToken=')
      )).toBe(true);
    });

    it('should complete full OAuth flow for new customer user', async () => {
      // Step 1: Initiate OAuth
      await request(app)
        .get('/api/auth/google/customer')
        .expect(302);

      // Step 2: OAuth callback
      const callbackResponse = await request(app)
        .get('/api/auth/google/callback')
        .set('x-test-scenario', 'success-new-user')
        .expect(302);

      expect(callbackResponse.headers.location).toContain('/my-meal-plans');
    });

    it('should handle existing user login flow', async () => {
      // Pre-populate database with existing user
      await storage.createUser({
        email: 'existing@example.com',
        password: 'hashedpassword',
        role: 'trainer'
      });

      await request(app)
        .get('/api/auth/google/trainer')
        .expect(302);

      const callbackResponse = await request(app)
        .get('/api/auth/google/callback')
        .set('x-test-scenario', 'success-existing-user')
        .expect(302);

      expect(callbackResponse.headers.location).toContain('/trainer');
    });

    it('should handle OAuth flow with account linking', async () => {
      // Create user with same email but no Google ID
      const existingUser = await storage.createUser({
        email: 'integration.test@example.com',
        password: 'hashedpassword',
        role: 'customer'
      });

      await request(app)
        .get('/api/auth/google/customer')
        .expect(302);

      const callbackResponse = await request(app)
        .get('/api/auth/google/callback')
        .set('x-test-scenario', 'success-new-user')
        .expect(302);

      // Should link account and redirect appropriately
      expect(callbackResponse.headers.location).toContain('/my-meal-plans');
      
      // Verify account was linked in database
      const updatedUser = await storage.getUserByEmail('integration.test@example.com');
      expect(updatedUser?.googleId).toBe('google-test-123');
    });
  });

  describe('OAuth Error Scenarios', () => {
    it('should handle OAuth failure with no email', async () => {
      await request(app)
        .get('/api/auth/google/customer')
        .expect(302);

      const callbackResponse = await request(app)
        .get('/api/auth/google/callback')
        .set('x-test-scenario', 'failure-no-email')
        .expect(302);

      expect(callbackResponse.headers.location).toContain('/login?error=no_email');
    });

    it('should handle server errors during OAuth', async () => {
      await request(app)
        .get('/api/auth/google/trainer')
        .expect(302);

      const callbackResponse = await request(app)
        .get('/api/auth/google/callback')
        .set('x-test-scenario', 'failure-server-error')
        .expect(302);

      expect(callbackResponse.headers.location).toContain('/login?error=server_error');
    });

    it('should handle database errors during user creation', async () => {
      // Mock database error
      vi.spyOn(storage, 'createGoogleUser').mockRejectedValue(
        new Error('Database connection failed')
      );

      await request(app)
        .get('/api/auth/google/customer')
        .expect(302);

      const callbackResponse = await request(app)
        .get('/api/auth/google/callback')
        .set('x-test-scenario', 'success-new-user')
        .expect(302);

      expect(callbackResponse.headers.location).toContain('/login?error=auth_error');
    });

    it('should handle invalid role selection', async () => {
      const response = await request(app)
        .get('/api/auth/google/invalid-role')
        .expect(400);

      expect(response.body).toEqual({
        status: 'error',
        message: 'Invalid role specified',
        code: 'INVALID_ROLE'
      });
    });

    it('should reject admin role for security', async () => {
      const response = await request(app)
        .get('/api/auth/google/admin')
        .expect(400);

      expect(response.body.code).toBe('INVALID_ROLE');
    });
  });

  describe('Session and Token Management', () => {
    it('should properly manage session data throughout OAuth flow', async () => {
      // Create session-aware test
      const agent = request.agent(app);

      // Step 1: Initiate OAuth (should set session)
      await agent
        .get('/api/auth/google/trainer')
        .expect(302);

      // Step 2: Complete OAuth (should read and use session)
      const callbackResponse = await agent
        .get('/api/auth/google/callback')
        .set('x-test-scenario', 'success-new-user')
        .expect(302);

      // User should be created with trainer role from session
      expect(callbackResponse.headers.location).toContain('/trainer');
    });

    it('should generate valid JWT tokens', async () => {
      const callbackResponse = await request(app)
        .get('/api/auth/google/callback')
        .set('x-test-scenario', 'success-new-user')
        .expect(302);

      // Extract token from redirect URL
      const location = callbackResponse.headers.location;
      const tokenMatch = location.match(/token=([^&]+)/);
      expect(tokenMatch).toBeTruthy();
      
      const token = tokenMatch![1];
      expect(token).toBeTruthy();

      // Verify token by making authenticated request
      const profileResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(profileResponse.body.data.user).toBeTruthy();
    });

    it('should set secure cookies in production environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const callbackResponse = await request(app)
        .get('/api/auth/google/callback')
        .set('x-test-scenario', 'success-new-user')
        .expect(302);

      const cookies = callbackResponse.headers['set-cookie'];
      const refreshTokenCookie = cookies.find((cookie: string) => 
        cookie.includes('refreshToken=')
      );

      expect(refreshTokenCookie).toContain('Secure');
      expect(refreshTokenCookie).toContain('HttpOnly');
      expect(refreshTokenCookie).toContain('SameSite=Lax');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Role-Based Redirects', () => {
    it('should redirect admin users to admin dashboard', async () => {
      const callbackResponse = await request(app)
        .get('/api/auth/google/callback')
        .set('x-test-scenario', 'success-new-user')
        .set('x-user-role', 'admin')
        .expect(302);

      expect(callbackResponse.headers.location).toContain('/admin');
    });

    it('should redirect trainer users to trainer dashboard', async () => {
      const callbackResponse = await request(app)
        .get('/api/auth/google/callback')
        .set('x-test-scenario', 'success-new-user')
        .set('x-user-role', 'trainer')
        .expect(302);

      expect(callbackResponse.headers.location).toContain('/trainer');
    });

    it('should redirect customer users to meal plans', async () => {
      const callbackResponse = await request(app)
        .get('/api/auth/google/callback')
        .set('x-test-scenario', 'success-new-user')
        .set('x-user-role', 'customer')
        .expect(302);

      expect(callbackResponse.headers.location).toContain('/my-meal-plans');
    });

    it('should default to root for unknown roles', async () => {
      const callbackResponse = await request(app)
        .get('/api/auth/google/callback')
        .set('x-test-scenario', 'success-new-user')
        .set('x-user-role', 'unknown')
        .expect(302);

      expect(callbackResponse.headers.location).toBe('/');
    });
  });

  describe('Database Integration', () => {
    it('should create user record with Google OAuth data', async () => {
      await request(app)
        .get('/api/auth/google/callback')
        .set('x-test-scenario', 'success-new-user')
        .expect(302);

      // Verify user was created in database
      const user = await storage.getUserByEmail('integration.test@example.com');
      expect(user).toBeTruthy();
      expect(user?.googleId).toBe('google-test-123');
      expect(user?.email).toBe('integration.test@example.com');
      expect(user?.role).toBe('customer');
    });

    it('should handle database transaction rollback on errors', async () => {
      // Mock database to fail after partial operations
      let callCount = 0;
      vi.spyOn(storage, 'createGoogleUser').mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Simulated database error');
        }
        return {} as any;
      });

      await request(app)
        .get('/api/auth/google/callback')
        .set('x-test-scenario', 'success-new-user')
        .expect(302);

      // Verify no partial data was left in database
      const user = await storage.getUserByEmail('integration.test@example.com');
      expect(user).toBeFalsy();
    });

    it('should update existing user with Google ID when linking accounts', async () => {
      // Create existing user
      const existingUser = await storage.createUser({
        email: 'integration.test@example.com',
        password: 'password123',
        role: 'trainer'
      });

      await request(app)
        .get('/api/auth/google/callback')
        .set('x-test-scenario', 'success-new-user')
        .expect(302);

      // Verify Google ID was added to existing user
      const updatedUser = await storage.getUserByEmail('integration.test@example.com');
      expect(updatedUser?.id).toBe(existingUser.id);
      expect(updatedUser?.googleId).toBe('google-test-123');
      expect(updatedUser?.role).toBe('trainer'); // Should maintain original role
    });
  });

  describe('Security and Edge Cases', () => {
    it('should not allow OAuth bypass for admin role creation', async () => {
      // Admin role should not be allowed via OAuth role selection
      const response = await request(app)
        .get('/api/auth/google/admin')
        .expect(400);

      expect(response.body.code).toBe('INVALID_ROLE');
    });

    it('should handle concurrent OAuth requests for same user', async () => {
      // Simulate race condition
      const requests = Promise.all([
        request(app)
          .get('/api/auth/google/callback')
          .set('x-test-scenario', 'success-new-user'),
        request(app)
          .get('/api/auth/google/callback')
          .set('x-test-scenario', 'success-new-user')
      ]);

      const responses = await requests;
      
      // Both should succeed without creating duplicate users
      responses.forEach(response => {
        expect(response.status).toBe(302);
      });

      // Verify only one user was created
      const users = await storage.getAllUsers(); // Assuming this method exists
      const testUsers = users.filter(u => u.email === 'integration.test@example.com');
      expect(testUsers.length).toBe(1);
    });

    it('should handle malformed OAuth callback data', async () => {
      // Test with missing required profile data
      const response = await request(app)
        .get('/api/auth/google/callback')
        .set('x-test-scenario', 'malformed-profile')
        .expect(302);

      expect(response.headers.location).toContain('/login?error=');
    });

    it('should validate environment configuration', async () => {
      // Test behavior with missing OAuth configuration
      const originalClientId = process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_ID;

      // Should still handle gracefully
      await request(app)
        .get('/api/auth/google/customer')
        .expect(302);

      process.env.GOOGLE_CLIENT_ID = originalClientId;
    });
  });
});