import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import session from 'express-session';

// Mock dependencies before importing
vi.mock('../server/storage', () => ({
  storage: {
    getUserById: vi.fn(),
    getUserByEmail: vi.fn(),
    getUserByGoogleId: vi.fn(),
    createUser: vi.fn(),
    createGoogleUser: vi.fn(),
    linkGoogleAccount: vi.fn(),
    createRefreshToken: vi.fn(),
    getRefreshToken: vi.fn(),
    deleteRefreshToken: vi.fn(),
    getUser: vi.fn(),
    updateUserPassword: vi.fn(),
    updateUserEmail: vi.fn()
  }
}));

vi.mock('../server/auth', () => ({
  hashPassword: vi.fn(),
  comparePasswords: vi.fn(),
  generateTokens: vi.fn(),
  verifyToken: vi.fn()
}));

vi.mock('passport-google-oauth20', () => ({
  Strategy: vi.fn()
}));

vi.mock('../server/passport-config', () => ({
  default: {
    initialize: () => (req: any, res: any, next: any) => next(),
    session: () => (req: any, res: any, next: any) => next(),
    authenticate: vi.fn((strategy: string, options?: any) => {
      return (req: any, res: any, next: any) => {
        if (strategy === 'google') {
          res.redirect('https://accounts.google.com/oauth/authorize');
        } else {
          next();
        }
      };
    })
  }
}));

// Now import the modules
import authRouter from '../server/authRoutes';
import { storage } from '../server/storage';
import * as auth from '../server/auth';
import passport from '../server/passport-config';

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(
    session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());
  app.use('/auth', authRouter);
  return app;
};

describe('OAuth Authentication Routes', () => {
  let app: express.Application;
  let mockStorage: any;
  let mockAuth: any;

  beforeEach(() => {
    app = createTestApp();
    mockStorage = vi.mocked(storage);
    mockAuth = vi.mocked(auth);
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /auth/google/:role', () => {
    it('should initiate Google OAuth for trainer role', async () => {
      // Mock passport.authenticate to avoid actual OAuth flow
      const mockAuthenticate = vi.fn((strategy, options) => {
        return (req: any, res: any, next: any) => {
          req.session.intendedRole = req.params.role;
          res.redirect('https://accounts.google.com/oauth/authorize');
        };
      });
      vi.mocked(passport.authenticate).mockImplementation(mockAuthenticate);

      const response = await request(app)
        .get('/auth/google/trainer')
        .expect(302);

      expect(response.headers.location).toContain('google.com');
      expect(mockAuthenticate).toHaveBeenCalledWith('google', { scope: ['profile', 'email'] });
    });

    it('should initiate Google OAuth for customer role', async () => {
      const mockAuthenticate = vi.fn((strategy, options) => {
        return (req: any, res: any, next: any) => {
          req.session.intendedRole = req.params.role;
          res.redirect('https://accounts.google.com/oauth/authorize');
        };
      });
      vi.mocked(passport.authenticate).mockImplementation(mockAuthenticate);

      await request(app)
        .get('/auth/google/customer')
        .expect(302);

      expect(mockAuthenticate).toHaveBeenCalledWith('google', { scope: ['profile', 'email'] });
    });

    it('should reject invalid role', async () => {
      const response = await request(app)
        .get('/auth/google/invalid-role')
        .expect(400);

      expect(response.body).toEqual({
        status: 'error',
        message: 'Invalid role specified',
        code: 'INVALID_ROLE'
      });
    });

    it('should reject admin role for security', async () => {
      const response = await request(app)
        .get('/auth/google/admin')
        .expect(400);

      expect(response.body).toEqual({
        status: 'error',
        message: 'Invalid role specified',
        code: 'INVALID_ROLE'
      });
    });
  });

  describe('GET /auth/google/callback', () => {
    beforeEach(() => {
      // Mock auth token generation
      mockAuth.generateTokens.mockReturnValue({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
      });
    });

    it('should handle successful OAuth callback for trainer', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'trainer@example.com',
        role: 'trainer',
        googleId: 'google-123'
      };

      // Mock passport authenticate middleware
      const mockAuthenticate = vi.fn((strategy, options) => {
        return (req: any, res: any, next: any) => {
          req.user = mockUser;
          next();
        };
      });
      vi.mocked(passport.authenticate).mockImplementation(mockAuthenticate);

      const response = await request(app)
        .get('/auth/google/callback')
        .expect(302);

      expect(response.headers.location).toContain('/trainer');
      expect(response.headers.location).toContain('token=mock-access-token');
      expect(mockAuth.generateTokens).toHaveBeenCalledWith(mockUser);
    });

    it('should handle successful OAuth callback for customer', async () => {
      const mockUser = {
        id: 'user-456',
        email: 'customer@example.com',
        role: 'customer',
        googleId: 'google-456'
      };

      const mockAuthenticate = vi.fn((strategy, options) => {
        return (req: any, res: any, next: any) => {
          req.user = mockUser;
          next();
        };
      });
      vi.mocked(passport.authenticate).mockImplementation(mockAuthenticate);

      const response = await request(app)
        .get('/auth/google/callback')
        .expect(302);

      expect(response.headers.location).toContain('/my-meal-plans');
      expect(response.headers.location).toContain('token=mock-access-token');
    });

    it('should handle successful OAuth callback for admin', async () => {
      const mockUser = {
        id: 'user-789',
        email: 'admin@example.com',
        role: 'admin',
        googleId: 'google-789'
      };

      const mockAuthenticate = vi.fn((strategy, options) => {
        return (req: any, res: any, next: any) => {
          req.user = mockUser;
          next();
        };
      });
      vi.mocked(passport.authenticate).mockImplementation(mockAuthenticate);

      const response = await request(app)
        .get('/auth/google/callback')
        .expect(302);

      expect(response.headers.location).toContain('/admin');
      expect(response.headers.location).toContain('token=mock-access-token');
    });

    it('should set refresh token cookie', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'customer',
        googleId: 'google-123'
      };

      const mockAuthenticate = vi.fn((strategy, options) => {
        return (req: any, res: any, next: any) => {
          req.user = mockUser;
          next();
        };
      });
      vi.mocked(passport.authenticate).mockImplementation(mockAuthenticate);

      const response = await request(app)
        .get('/auth/google/callback')
        .expect(302);

      const cookieHeader = response.headers['set-cookie'];
      expect(cookieHeader).toBeDefined();
      expect(cookieHeader.some((cookie: string) => 
        cookie.includes('refreshToken=mock-refresh-token')
      )).toBe(true);
    });

    it('should handle OAuth failure - no user', async () => {
      const mockAuthenticate = vi.fn((strategy, options) => {
        return (req: any, res: any, next: any) => {
          req.user = null;
          next();
        };
      });
      vi.mocked(passport.authenticate).mockImplementation(mockAuthenticate);

      const response = await request(app)
        .get('/auth/google/callback')
        .expect(302);

      expect(response.headers.location).toContain('/login?error=no_user');
    });

    it('should handle token generation error', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'customer',
        googleId: 'google-123'
      };

      mockAuth.generateTokens.mockImplementation(() => {
        throw new Error('Token generation failed');
      });

      const mockAuthenticate = vi.fn((strategy, options) => {
        return (req: any, res: any, next: any) => {
          req.user = mockUser;
          next();
        };
      });
      vi.mocked(passport.authenticate).mockImplementation(mockAuthenticate);

      const response = await request(app)
        .get('/auth/google/callback')
        .expect(302);

      expect(response.headers.location).toContain('/login?error=auth_error');
    });

    it('should use production redirect path in production environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'trainer',
        googleId: 'google-123'
      };

      const mockAuthenticate = vi.fn((strategy, options) => {
        return (req: any, res: any, next: any) => {
          req.user = mockUser;
          next();
        };
      });
      vi.mocked(passport.authenticate).mockImplementation(mockAuthenticate);

      const response = await request(app)
        .get('/auth/google/callback')
        .expect(302);

      expect(response.headers.location).toBe('/trainer');
      expect(response.headers.location).not.toContain('token=');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('OAuth Error Handling', () => {
    it('should handle passport authentication errors', async () => {
      const mockAuthenticate = vi.fn((strategy, options) => {
        return (req: any, res: any, next: any) => {
          const error = new Error('Authentication failed');
          next(error);
        };
      });
      vi.mocked(passport.authenticate).mockImplementation(mockAuthenticate);

      // This would normally be handled by Express error middleware
      // In a real test, you'd set up error handling middleware
    });

    it('should handle missing environment variables gracefully', async () => {
      // Test would need to mock missing env vars
      // This tests the graceful degradation of the OAuth flow
      const originalClientId = process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_ID;

      // OAuth should still attempt to work but would fail at Google's end
      const response = await request(app)
        .get('/auth/google/trainer');

      // Restore env var
      process.env.GOOGLE_CLIENT_ID = originalClientId;
    });
  });

  describe('Session Management', () => {
    it('should store intended role in session', async () => {
      let sessionData: any = {};
      
      const mockAuthenticate = vi.fn((strategy, options) => {
        return (req: any, res: any, next: any) => {
          sessionData = req.session;
          res.redirect('https://accounts.google.com/oauth/authorize');
        };
      });
      vi.mocked(passport.authenticate).mockImplementation(mockAuthenticate);

      await request(app)
        .get('/auth/google/trainer')
        .expect(302);

      expect(sessionData.intendedRole).toBe('trainer');
    });

    it('should clear session data after successful authentication', async () => {
      // This would be tested in integration tests
      // Unit tests focus on individual route behavior
    });
  });
});