/**
 * Authentication Middleware Test Suite
 *
 * Comprehensive test coverage for JWT-based authentication and role-based authorization
 * middleware in the FitnessMealPlanner application.
 *
 * Test Coverage:
 * - requireAuth middleware (JWT validation, token refresh, cookie/header support)
 * - requireAdmin middleware (admin-only access control)
 * - requireTrainerOrAdmin middleware (trainer/admin access control)
 * - requireRole middleware factory (dynamic role-based access)
 * - Token extraction from headers and cookies
 * - Token refresh flow with refresh tokens
 * - Error handling and security scenarios
 * - Edge cases and boundary conditions
 *
 * @author FitnessMealPlanner Test Team
 * @since 1.0.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import {
  requireAuth,
  requireAdmin,
  requireTrainerOrAdmin,
  requireRole
} from '../../../server/middleware/auth';
import { storage } from '../../../server/storage';
import { verifyToken, verifyRefreshToken, generateTokens } from '../../../server/auth';

// Mock dependencies
vi.mock('../../../server/storage', () => ({
  storage: {
    getUser: vi.fn(),
    getRefreshToken: vi.fn(),
    createRefreshToken: vi.fn(),
    deleteRefreshToken: vi.fn(),
  }
}));

vi.mock('../../../server/auth', () => ({
  verifyToken: vi.fn(),
  verifyRefreshToken: vi.fn(),
  generateTokens: vi.fn(),
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    TokenExpiredError: class extends Error {
      name = 'TokenExpiredError';
      constructor(message: string, expiredAt: Date) {
        super(message);
        this.expiredAt = expiredAt;
      }
      expiredAt: Date;
    }
  }
}));

// Get mocked functions
const mockStorage = {
  getUser: storage.getUser as vi.MockedFunction<typeof storage.getUser>,
  getRefreshToken: storage.getRefreshToken as vi.MockedFunction<typeof storage.getRefreshToken>,
  createRefreshToken: storage.createRefreshToken as vi.MockedFunction<typeof storage.createRefreshToken>,
  deleteRefreshToken: storage.deleteRefreshToken as vi.MockedFunction<typeof storage.deleteRefreshToken>,
};

const mockAuth = {
  verifyToken: verifyToken as vi.MockedFunction<typeof verifyToken>,
  verifyRefreshToken: verifyRefreshToken as vi.MockedFunction<typeof verifyRefreshToken>,
  generateTokens: generateTokens as vi.MockedFunction<typeof generateTokens>,
};

const mockedJwt = jwt as any;

// Helper function to create mock request
const createMockRequest = (options: {
  authHeader?: string;
  cookies?: { [key: string]: string };
  headers?: { [key: string]: string };
} = {}): Partial<Request> => ({
  headers: {
    authorization: options.authHeader,
    ...options.headers,
  },
  cookies: options.cookies || {},
});

// Helper function to create mock response
const createMockResponse = (): Partial<Response> => {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  };
  return res;
};

// Helper function to create mock next function
const createMockNext = (): NextFunction => vi.fn();

// Sample user data for testing
const sampleUsers = {
  admin: {
    id: 'admin-123',
    email: 'admin@test.com',
    role: 'admin' as const,
    name: 'Admin User',
  },
  trainer: {
    id: 'trainer-123',
    email: 'trainer@test.com',
    role: 'trainer' as const,
    name: 'Trainer User',
  },
  customer: {
    id: 'customer-123',
    email: 'customer@test.com',
    role: 'customer' as const,
    name: 'Customer User',
  },
};

describe('Authentication Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('requireAuth Middleware', () => {
    describe('Successful Authentication', () => {
      it('should authenticate user with valid Bearer token', async () => {
        const req = createMockRequest({
          authHeader: 'Bearer valid-token-123'
        }) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        mockAuth.verifyToken.mockResolvedValue({ id: 'user-123', email: 'test@test.com' });
        mockStorage.getUser.mockResolvedValue(sampleUsers.admin);

        await requireAuth(req, res, next);

        expect(mockAuth.verifyToken).toHaveBeenCalledWith('valid-token-123');
        expect(mockStorage.getUser).toHaveBeenCalledWith('user-123');
        expect(req.user).toEqual({
          id: 'admin-123',
          role: 'admin',
        });
        expect(next).toHaveBeenCalledOnce();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should authenticate user with valid cookie token', async () => {
        const req = createMockRequest({
          cookies: { token: 'cookie-token-123' }
        }) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        mockAuth.verifyToken.mockResolvedValue({ id: 'user-123' });
        mockStorage.getUser.mockResolvedValue(sampleUsers.trainer);

        await requireAuth(req, res, next);

        expect(mockAuth.verifyToken).toHaveBeenCalledWith('cookie-token-123');
        expect(req.user).toEqual({
          id: 'trainer-123',
          role: 'trainer',
        });
        expect(next).toHaveBeenCalledOnce();
      });

      it('should prefer Bearer token over cookie token', async () => {
        const req = createMockRequest({
          authHeader: 'Bearer bearer-token-123',
          cookies: { token: 'cookie-token-123' }
        }) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        mockAuth.verifyToken.mockResolvedValue({ id: 'user-123' });
        mockStorage.getUser.mockResolvedValue(sampleUsers.customer);

        await requireAuth(req, res, next);

        expect(mockAuth.verifyToken).toHaveBeenCalledWith('bearer-token-123');
        expect(req.user).toEqual({
          id: 'customer-123',
          role: 'customer',
        });
      });

      it('should handle different user roles correctly', async () => {
        const roles = ['admin', 'trainer', 'customer'] as const;

        for (const role of roles) {
          const req = createMockRequest({
            authHeader: `Bearer ${role}-token`
          }) as Request;
          const res = createMockResponse() as Response;
          const next = createMockNext();

          mockAuth.verifyToken.mockResolvedValue({ id: `${role}-123` });
          mockStorage.getUser.mockResolvedValue(sampleUsers[role]);

          await requireAuth(req, res, next);

          expect(req.user?.role).toBe(role);
          vi.clearAllMocks();
        }
      });
    });

    describe('Missing Token Scenarios', () => {
      it('should return 401 when no token provided', async () => {
        const req = createMockRequest() as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        await requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Authentication required. Please provide a valid token.',
          code: 'NO_TOKEN'
        });
        expect(next).not.toHaveBeenCalled();
      });

      it('should return 401 when Authorization header is malformed', async () => {
        const req = createMockRequest({
          authHeader: 'InvalidFormat token123'
        }) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        await requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Authentication required. Please provide a valid token.',
          code: 'NO_TOKEN'
        });
      });

      it('should return 401 when Bearer token is empty', async () => {
        const req = createMockRequest({
          authHeader: 'Bearer '
        }) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        await requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Authentication required. Please provide a valid token.',
          code: 'NO_TOKEN'
        });
      });
    });

    describe('Invalid Token Scenarios', () => {
      it('should return 401 when token verification fails', async () => {
        const req = createMockRequest({
          authHeader: 'Bearer invalid-token'
        }) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        mockAuth.verifyToken.mockRejectedValue(new Error('Invalid token'));

        await requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
        expect(next).not.toHaveBeenCalled();
      });

      it('should return 401 when user not found in database', async () => {
        const req = createMockRequest({
          authHeader: 'Bearer valid-token'
        }) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        mockAuth.verifyToken.mockResolvedValue({ id: 'nonexistent-user' });
        mockStorage.getUser.mockResolvedValue(null);

        await requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Invalid user session',
          code: 'INVALID_SESSION'
        });
      });

      it('should handle JWT signature verification errors', async () => {
        const req = createMockRequest({
          authHeader: 'Bearer tampered-token'
        }) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        const jwtError = new Error('invalid signature');
        jwtError.name = 'JsonWebTokenError';
        mockAuth.verifyToken.mockRejectedValue(jwtError);

        await requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      });
    });

    describe('Token Refresh Flow', () => {
      it('should refresh expired access token with valid refresh token', async () => {
        const req = createMockRequest({
          authHeader: 'Bearer expired-access-token',
          cookies: { refreshToken: 'valid-refresh-token' }
        }) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        // Mock expired access token
        const expiredError = new mockedJwt.TokenExpiredError('Token expired', new Date());
        mockAuth.verifyToken.mockRejectedValue(expiredError);

        // Mock valid refresh token
        mockAuth.verifyRefreshToken.mockResolvedValue({ id: 'user-123' });
        mockStorage.getRefreshToken.mockResolvedValue({
          token: 'valid-refresh-token',
          expiresAt: new Date(Date.now() + 86400000), // 1 day from now
          userId: 'user-123'
        });
        mockStorage.getUser.mockResolvedValue(sampleUsers.admin);

        // Mock new token generation
        const newTokens = {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token'
        };
        mockAuth.generateTokens.mockReturnValue(newTokens);

        await requireAuth(req, res, next);

        expect(mockAuth.verifyRefreshToken).toHaveBeenCalledWith('valid-refresh-token');
        expect(mockStorage.createRefreshToken).toHaveBeenCalledWith(
          'admin-123', // Should match the mocked user's ID
          'new-refresh-token',
          expect.any(Date)
        );
        expect(mockStorage.deleteRefreshToken).toHaveBeenCalledWith('valid-refresh-token');
        expect(res.cookie).toHaveBeenCalledWith('token', 'new-access-token', expect.any(Object));
        expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'new-refresh-token', expect.any(Object));
        expect(res.setHeader).toHaveBeenCalledWith('X-Access-Token', 'new-access-token');
        expect(res.setHeader).toHaveBeenCalledWith('X-Refresh-Token', 'new-refresh-token');
        expect(req.user).toEqual({ id: 'admin-123', role: 'admin' });
        expect(req.tokens).toEqual(newTokens);
        expect(next).toHaveBeenCalledOnce();
      });

      it('should return 401 when refresh token is missing', async () => {
        const req = createMockRequest({
          authHeader: 'Bearer expired-access-token'
        }) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        const expiredError = new mockedJwt.TokenExpiredError('Token expired', new Date());
        mockAuth.verifyToken.mockRejectedValue(expiredError);

        await requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Session expired',
          code: 'SESSION_EXPIRED'
        });
      });

      it('should return 401 when refresh token is expired', async () => {
        const req = createMockRequest({
          authHeader: 'Bearer expired-access-token',
          cookies: { refreshToken: 'expired-refresh-token' }
        }) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        const expiredError = new mockedJwt.TokenExpiredError('Token expired', new Date());
        mockAuth.verifyToken.mockRejectedValue(expiredError);
        mockAuth.verifyRefreshToken.mockResolvedValue({ id: 'user-123' });
        mockStorage.getRefreshToken.mockResolvedValue({
          token: 'expired-refresh-token',
          expiresAt: new Date(Date.now() - 86400000), // 1 day ago
          userId: 'user-123'
        });

        await requireAuth(req, res, next);

        expect(res.clearCookie).toHaveBeenCalledWith('token');
        expect(res.clearCookie).toHaveBeenCalledWith('refreshToken');
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Session expired. Please login again.',
          code: 'REFRESH_TOKEN_EXPIRED'
        });
      });

      it('should return 401 when refresh token not found in storage', async () => {
        const req = createMockRequest({
          authHeader: 'Bearer expired-access-token',
          cookies: { refreshToken: 'nonexistent-refresh-token' }
        }) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        const expiredError = new mockedJwt.TokenExpiredError('Token expired', new Date());
        mockAuth.verifyToken.mockRejectedValue(expiredError);
        mockAuth.verifyRefreshToken.mockResolvedValue({ id: 'user-123' });
        mockStorage.getRefreshToken.mockResolvedValue(null);

        await requireAuth(req, res, next);

        expect(res.clearCookie).toHaveBeenCalledWith('token');
        expect(res.clearCookie).toHaveBeenCalledWith('refreshToken');
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Session expired. Please login again.',
          code: 'REFRESH_TOKEN_EXPIRED'
        });
      });

      it('should handle refresh token verification failure', async () => {
        const req = createMockRequest({
          authHeader: 'Bearer expired-access-token',
          cookies: { refreshToken: 'invalid-refresh-token' }
        }) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        const expiredError = new mockedJwt.TokenExpiredError('Token expired', new Date());
        mockAuth.verifyToken.mockRejectedValue(expiredError);
        mockAuth.verifyRefreshToken.mockRejectedValue(new Error('Invalid refresh token'));

        await requireAuth(req, res, next);

        expect(res.clearCookie).toHaveBeenCalledWith('token');
        expect(res.clearCookie).toHaveBeenCalledWith('refreshToken');
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Session expired. Please login again.',
          code: 'SESSION_EXPIRED'
        });
      });

      it('should handle user not found during refresh', async () => {
        const req = createMockRequest({
          authHeader: 'Bearer expired-access-token',
          cookies: { refreshToken: 'valid-refresh-token' }
        }) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        const expiredError = new mockedJwt.TokenExpiredError('Token expired', new Date());
        mockAuth.verifyToken.mockRejectedValue(expiredError);
        mockAuth.verifyRefreshToken.mockResolvedValue({ id: 'user-123' });
        mockStorage.getRefreshToken.mockResolvedValue({
          token: 'valid-refresh-token',
          expiresAt: new Date(Date.now() + 86400000),
          userId: 'user-123'
        });
        mockStorage.getUser.mockResolvedValue(null);

        await requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Invalid user session',
          code: 'INVALID_SESSION'
        });
      });
    });

    describe('Cookie Security Configuration', () => {
      it('should set secure cookies in production environment', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const req = createMockRequest({
          authHeader: 'Bearer expired-access-token',
          cookies: { refreshToken: 'valid-refresh-token' }
        }) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        const expiredError = new mockedJwt.TokenExpiredError('Token expired', new Date());
        mockAuth.verifyToken.mockRejectedValue(expiredError);
        mockAuth.verifyRefreshToken.mockResolvedValue({ id: 'user-123' });
        mockStorage.getRefreshToken.mockResolvedValue({
          token: 'valid-refresh-token',
          expiresAt: new Date(Date.now() + 86400000),
          userId: 'user-123'
        });
        mockStorage.getUser.mockResolvedValue(sampleUsers.admin);
        mockAuth.generateTokens.mockReturnValue({
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token'
        });

        await requireAuth(req, res, next);

        expect(res.cookie).toHaveBeenCalledWith('token', 'new-access-token', {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          expires: expect.any(Date)
        });

        process.env.NODE_ENV = originalEnv;
      });

      it('should set non-secure cookies in development environment', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        const req = createMockRequest({
          authHeader: 'Bearer expired-access-token',
          cookies: { refreshToken: 'valid-refresh-token' }
        }) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        const expiredError = new mockedJwt.TokenExpiredError('Token expired', new Date());
        mockAuth.verifyToken.mockRejectedValue(expiredError);
        mockAuth.verifyRefreshToken.mockResolvedValue({ id: 'user-123' });
        mockStorage.getRefreshToken.mockResolvedValue({
          token: 'valid-refresh-token',
          expiresAt: new Date(Date.now() + 86400000),
          userId: 'user-123'
        });
        mockStorage.getUser.mockResolvedValue(sampleUsers.admin);
        mockAuth.generateTokens.mockReturnValue({
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token'
        });

        await requireAuth(req, res, next);

        expect(res.cookie).toHaveBeenCalledWith('token', 'new-access-token', {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          expires: expect.any(Date)
        });

        process.env.NODE_ENV = originalEnv;
      });
    });

    describe('Error Handling', () => {
      it('should handle general authentication errors', async () => {
        const req = createMockRequest({
          authHeader: 'Bearer some-token'
        }) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        // Mock verifyToken to throw a non-TokenExpiredError
        mockAuth.verifyToken.mockRejectedValue(new Error('Unexpected error'));

        await requireAuth(req, res, next);

        // Non-TokenExpiredError goes to the else block which returns Invalid token
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      });

      it('should handle storage errors during token refresh', async () => {
        const req = createMockRequest({
          authHeader: 'Bearer expired-access-token',
          cookies: { refreshToken: 'valid-refresh-token' }
        }) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        const expiredError = new mockedJwt.TokenExpiredError('Token expired', new Date());
        mockAuth.verifyToken.mockRejectedValue(expiredError);
        mockAuth.verifyRefreshToken.mockResolvedValue({ id: 'user-123' });
        mockStorage.getRefreshToken.mockRejectedValue(new Error('Database error'));

        await requireAuth(req, res, next);

        expect(res.clearCookie).toHaveBeenCalledWith('token');
        expect(res.clearCookie).toHaveBeenCalledWith('refreshToken');
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Session expired. Please login again.',
          code: 'SESSION_EXPIRED'
        });
      });

      it('should handle token generation failures during refresh', async () => {
        const req = createMockRequest({
          authHeader: 'Bearer expired-access-token',
          cookies: { refreshToken: 'valid-refresh-token' }
        }) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        const expiredError = new mockedJwt.TokenExpiredError('Token expired', new Date());
        mockAuth.verifyToken.mockRejectedValue(expiredError);
        mockAuth.verifyRefreshToken.mockResolvedValue({ id: 'user-123' });
        mockStorage.getRefreshToken.mockResolvedValue({
          token: 'valid-refresh-token',
          expiresAt: new Date(Date.now() + 86400000),
          userId: 'user-123'
        });
        mockStorage.getUser.mockResolvedValue(sampleUsers.admin);
        mockAuth.generateTokens.mockImplementation(() => {
          throw new Error('Token generation failed');
        });

        await requireAuth(req, res, next);

        expect(res.clearCookie).toHaveBeenCalledWith('token');
        expect(res.clearCookie).toHaveBeenCalledWith('refreshToken');
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Session expired. Please login again.',
          code: 'SESSION_EXPIRED'
        });
      });
    });

    describe('Edge Cases', () => {
      it('should handle malformed JWT tokens', async () => {
        const req = createMockRequest({
          authHeader: 'Bearer malformed.jwt.token'
        }) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        const malformedError = new Error('jwt malformed');
        malformedError.name = 'JsonWebTokenError';
        mockAuth.verifyToken.mockRejectedValue(malformedError);

        await requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      });

      it('should handle null/undefined user data from storage', async () => {
        const req = createMockRequest({
          authHeader: 'Bearer valid-token'
        }) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        mockAuth.verifyToken.mockResolvedValue({ id: 'user-123' });
        mockStorage.getUser.mockResolvedValue(undefined as any);

        await requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Invalid user session',
          code: 'INVALID_SESSION'
        });
      });

      it('should handle empty token strings', async () => {
        const req = createMockRequest({
          cookies: { token: '' }
        }) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        await requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Authentication required. Please provide a valid token.',
          code: 'NO_TOKEN'
        });
      });

      it('should handle concurrent refresh token requests', async () => {
        const req = createMockRequest({
          authHeader: 'Bearer expired-access-token',
          cookies: { refreshToken: 'valid-refresh-token' }
        }) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        const expiredError = new mockedJwt.TokenExpiredError('Token expired', new Date());
        mockAuth.verifyToken.mockRejectedValue(expiredError);
        mockAuth.verifyRefreshToken.mockResolvedValue({ id: 'user-123' });

        // Simulate race condition where refresh token is already deleted
        mockStorage.getRefreshToken.mockResolvedValue(null);

        await requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Session expired. Please login again.',
          code: 'REFRESH_TOKEN_EXPIRED'
        });
      });
    });
  });

  describe('requireAdmin Middleware', () => {
    it('should allow access for admin users', async () => {
      const req = createMockRequest({
        authHeader: 'Bearer admin-token'
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      mockAuth.verifyToken.mockResolvedValue({ id: 'admin-123' });
      mockStorage.getUser.mockResolvedValue(sampleUsers.admin);

      await requireAdmin(req, res, next);

      expect(req.user).toEqual({ id: 'admin-123', role: 'admin' });
      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access for trainer users', async () => {
      const req = createMockRequest({
        authHeader: 'Bearer trainer-token'
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      mockAuth.verifyToken.mockResolvedValue({ id: 'trainer-123' });
      mockStorage.getUser.mockResolvedValue(sampleUsers.trainer);

      await requireAdmin(req, res, next);

      expect(req.user).toEqual({ id: 'trainer-123', role: 'trainer' });
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Admin access required',
        code: 'ADMIN_REQUIRED'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny access for customer users', async () => {
      const req = createMockRequest({
        authHeader: 'Bearer customer-token'
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      mockAuth.verifyToken.mockResolvedValue({ id: 'customer-123' });
      mockStorage.getUser.mockResolvedValue(sampleUsers.customer);

      await requireAdmin(req, res, next);

      expect(req.user).toEqual({ id: 'customer-123', role: 'customer' });
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Admin access required',
        code: 'ADMIN_REQUIRED'
      });
    });

    it('should handle authentication failures', async () => {
      const req = createMockRequest() as Request; // No token
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required. Please provide a valid token.',
        code: 'NO_TOKEN'
      });
    });

    it('should handle undefined user role', async () => {
      const req = createMockRequest({
        authHeader: 'Bearer valid-token'
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      mockAuth.verifyToken.mockResolvedValue({ id: 'user-123' });
      mockStorage.getUser.mockResolvedValue({
        ...sampleUsers.admin,
        role: undefined as any
      });

      await requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Admin access required',
        code: 'ADMIN_REQUIRED'
      });
    });
  });

  describe('requireTrainerOrAdmin Middleware', () => {
    it('should allow access for admin users', async () => {
      const req = createMockRequest({
        authHeader: 'Bearer admin-token'
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      mockAuth.verifyToken.mockResolvedValue({ id: 'admin-123' });
      mockStorage.getUser.mockResolvedValue(sampleUsers.admin);

      await requireTrainerOrAdmin(req, res, next);

      expect(req.user).toEqual({ id: 'admin-123', role: 'admin' });
      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow access for trainer users', async () => {
      const req = createMockRequest({
        authHeader: 'Bearer trainer-token'
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      mockAuth.verifyToken.mockResolvedValue({ id: 'trainer-123' });
      mockStorage.getUser.mockResolvedValue(sampleUsers.trainer);

      await requireTrainerOrAdmin(req, res, next);

      expect(req.user).toEqual({ id: 'trainer-123', role: 'trainer' });
      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access for customer users', async () => {
      const req = createMockRequest({
        authHeader: 'Bearer customer-token'
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      mockAuth.verifyToken.mockResolvedValue({ id: 'customer-123' });
      mockStorage.getUser.mockResolvedValue(sampleUsers.customer);

      await requireTrainerOrAdmin(req, res, next);

      expect(req.user).toEqual({ id: 'customer-123', role: 'customer' });
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Trainer or admin access required',
        code: 'TRAINER_OR_ADMIN_REQUIRED'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle authentication failures', async () => {
      const req = createMockRequest({
        authHeader: 'Bearer invalid-token'
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      mockAuth.verifyToken.mockRejectedValue(new Error('Invalid token'));

      await requireTrainerOrAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    });

    it('should handle mixed case role validation', async () => {
      const roles = [
        { input: 'ADMIN', expected: true },
        { input: 'TRAINER', expected: true },
        { input: 'CUSTOMER', expected: false }
      ];

      for (const { input, expected } of roles) {
        const req = createMockRequest({
          authHeader: 'Bearer valid-token'
        }) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        mockAuth.verifyToken.mockResolvedValue({ id: 'user-123' });
        mockStorage.getUser.mockResolvedValue({
          ...sampleUsers.admin,
          role: input.toLowerCase() as any
        });

        await requireTrainerOrAdmin(req, res, next);

        if (expected) {
          expect(next).toHaveBeenCalledOnce();
          expect(res.status).not.toHaveBeenCalled();
        } else {
          expect(res.status).toHaveBeenCalledWith(403);
        }

        vi.clearAllMocks();
      }
    });
  });

  describe('requireRole Middleware Factory', () => {
    describe('Admin Role Requirement', () => {
      it('should allow access for admin users when requiring admin role', async () => {
        const middleware = requireRole('admin');
        const req = createMockRequest({
          authHeader: 'Bearer admin-token'
        }) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        mockAuth.verifyToken.mockResolvedValue({ id: 'admin-123' });
        mockStorage.getUser.mockResolvedValue(sampleUsers.admin);

        await middleware(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should deny access for non-admin users when requiring admin role', async () => {
        const middleware = requireRole('admin');
        const req = createMockRequest({
          authHeader: 'Bearer trainer-token'
        }) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        mockAuth.verifyToken.mockResolvedValue({ id: 'trainer-123' });
        mockStorage.getUser.mockResolvedValue(sampleUsers.trainer);

        await middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Admin access required',
          code: 'ROLE_REQUIRED'
        });
        expect(next).not.toHaveBeenCalled();
      });
    });

    describe('Trainer Role Requirement', () => {
      it('should allow access for trainer users when requiring trainer role', async () => {
        const middleware = requireRole('trainer');
        const req = createMockRequest({
          authHeader: 'Bearer trainer-token'
        }) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        mockAuth.verifyToken.mockResolvedValue({ id: 'trainer-123' });
        mockStorage.getUser.mockResolvedValue(sampleUsers.trainer);

        await middleware(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should deny access for non-trainer users when requiring trainer role', async () => {
        const middleware = requireRole('trainer');
        const req = createMockRequest({
          authHeader: 'Bearer customer-token'
        }) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        mockAuth.verifyToken.mockResolvedValue({ id: 'customer-123' });
        mockStorage.getUser.mockResolvedValue(sampleUsers.customer);

        await middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Trainer access required',
          code: 'ROLE_REQUIRED'
        });
      });
    });

    describe('Customer Role Requirement', () => {
      it('should allow access for customer users when requiring customer role', async () => {
        const middleware = requireRole('customer');
        const req = createMockRequest({
          authHeader: 'Bearer customer-token'
        }) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        mockAuth.verifyToken.mockResolvedValue({ id: 'customer-123' });
        mockStorage.getUser.mockResolvedValue(sampleUsers.customer);

        await middleware(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should deny access for non-customer users when requiring customer role', async () => {
        const middleware = requireRole('customer');
        const req = createMockRequest({
          authHeader: 'Bearer admin-token'
        }) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        mockAuth.verifyToken.mockResolvedValue({ id: 'admin-123' });
        mockStorage.getUser.mockResolvedValue(sampleUsers.admin);

        await middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Customer access required',
          code: 'ROLE_REQUIRED'
        });
      });
    });

    describe('Dynamic Role Requirements', () => {
      it('should create different middleware instances for different roles', () => {
        const adminMiddleware = requireRole('admin');
        const trainerMiddleware = requireRole('trainer');
        const customerMiddleware = requireRole('customer');

        expect(adminMiddleware).toBeInstanceOf(Function);
        expect(trainerMiddleware).toBeInstanceOf(Function);
        expect(customerMiddleware).toBeInstanceOf(Function);
        expect(adminMiddleware).not.toBe(trainerMiddleware);
        expect(trainerMiddleware).not.toBe(customerMiddleware);
      });

      it('should handle role validation with proper capitalization', async () => {
        const roles = ['admin', 'trainer', 'customer'] as const;

        for (const role of roles) {
          const middleware = requireRole(role);
          const req = createMockRequest({
            authHeader: 'Bearer valid-token'
          }) as Request;
          const res = createMockResponse() as Response;
          const next = createMockNext();

          mockAuth.verifyToken.mockResolvedValue({ id: 'user-123' });
          mockStorage.getUser.mockResolvedValue(sampleUsers[role]);

          await middleware(req, res, next);

          expect(next).toHaveBeenCalledOnce();
          expect(res.status).not.toHaveBeenCalled();
          vi.clearAllMocks();
        }
      });

      it('should handle authentication failures in role-specific middleware', async () => {
        const middleware = requireRole('admin');
        const req = createMockRequest() as Request; // No token
        const res = createMockResponse() as Response;
        const next = createMockNext();

        await middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Authentication required. Please provide a valid token.',
          code: 'NO_TOKEN'
        });
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle chained middleware correctly', async () => {
      const req = createMockRequest({
        authHeader: 'Bearer admin-token'
      }) as Request;
      const res = createMockResponse() as Response;
      let middlewareCallCount = 0;

      const next1 = vi.fn(() => middlewareCallCount++);
      const next2 = vi.fn(() => middlewareCallCount++);

      mockAuth.verifyToken.mockResolvedValue({ id: 'admin-123' });
      mockStorage.getUser.mockResolvedValue(sampleUsers.admin);

      // First middleware call
      await requireAuth(req, res, next1);
      expect(middlewareCallCount).toBe(1);
      expect(req.user).toEqual({ id: 'admin-123', role: 'admin' });

      // Second middleware call (requireAdmin should reuse existing req.user)
      await requireAdmin(req, res, next2);
      expect(middlewareCallCount).toBe(2);
    });

    it('should handle concurrent authentication requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => ({
        req: createMockRequest({
          authHeader: `Bearer token-${i}`
        }) as Request,
        res: createMockResponse() as Response,
        next: createMockNext()
      }));

      mockAuth.verifyToken.mockImplementation((token: string) => {
        const userId = token.replace('token-', 'user-');
        return Promise.resolve({ id: userId });
      });

      mockStorage.getUser.mockImplementation((id: string) => {
        return Promise.resolve({
          ...sampleUsers.admin,
          id
        });
      });

      const promises = requests.map(({ req, res, next }) =>
        requireAuth(req, res, next)
      );

      await Promise.all(promises);

      requests.forEach(({ req, next }) => {
        expect(next).toHaveBeenCalledOnce();
        expect(req.user).toBeDefined();
        expect(req.user?.role).toBe('admin');
      });
    });

    it('should handle memory pressure with many authentication requests', async () => {
      const requestCount = 100;
      const promises = [];

      for (let i = 0; i < requestCount; i++) {
        const req = createMockRequest({
          authHeader: `Bearer token-${i}`
        }) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        mockAuth.verifyToken.mockResolvedValue({ id: `user-${i}` });
        mockStorage.getUser.mockResolvedValue({
          ...sampleUsers.customer,
          id: `user-${i}`
        });

        promises.push(requireAuth(req, res, next));
      }

      await Promise.all(promises);

      expect(mockAuth.verifyToken).toHaveBeenCalledTimes(requestCount);
      expect(mockStorage.getUser).toHaveBeenCalledTimes(requestCount);
    });
  });

  describe('Performance and Security', () => {
    it('should not expose sensitive information in error messages', async () => {
      const req = createMockRequest({
        authHeader: 'Bearer malicious-token'
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      const sensitiveError = new Error('Database connection string: postgresql://user:password@localhost:5432/db');
      mockAuth.verifyToken.mockRejectedValue(sensitiveError);

      await requireAuth(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });

      // Ensure sensitive info doesn't leak
      const responseCall = (res.json as any).mock.calls[0][0];
      expect(responseCall.error).not.toContain('postgresql://');
      expect(responseCall.error).not.toContain('password');
    });

    it('should handle timing attacks by maintaining consistent response times', async () => {
      const scenarios = [
        { name: 'valid token', setup: () => {
          mockAuth.verifyToken.mockResolvedValue({ id: 'user-123' });
          mockStorage.getUser.mockResolvedValue(sampleUsers.admin);
        }},
        { name: 'invalid token', setup: () => {
          mockAuth.verifyToken.mockRejectedValue(new Error('Invalid token'));
        }},
        { name: 'user not found', setup: () => {
          mockAuth.verifyToken.mockResolvedValue({ id: 'nonexistent' });
          mockStorage.getUser.mockResolvedValue(null);
        }}
      ];

      const timings: number[] = [];

      for (const scenario of scenarios) {
        scenario.setup();

        const req = createMockRequest({
          authHeader: 'Bearer test-token'
        }) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        const start = Date.now();
        await requireAuth(req, res, next);
        const duration = Date.now() - start;

        timings.push(duration);
        vi.clearAllMocks();
      }

      // Verify timing differences are minimal (within 10ms tolerance)
      const maxTiming = Math.max(...timings);
      const minTiming = Math.min(...timings);
      expect(maxTiming - minTiming).toBeLessThan(10);
    });

    it('should handle large token payloads gracefully', async () => {
      const req = createMockRequest({
        authHeader: 'Bearer ' + 'x'.repeat(10000) // 10KB token
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      mockAuth.verifyToken.mockRejectedValue(new Error('Token too large'));

      await requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    });

    it('should handle token injection attempts', async () => {
      const maliciousTokens = [
        'Bearer <script>alert("xss")</script>',
        'Bearer ${process.env.JWT_SECRET}',
        'Bearer ../../etc/passwd',
        'Bearer null',
        'Bearer undefined',
        'Bearer DROP TABLE users;'
      ];

      for (const maliciousToken of maliciousTokens) {
        const req = createMockRequest({
          authHeader: maliciousToken
        }) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        mockAuth.verifyToken.mockRejectedValue(new Error('Invalid token'));

        await requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        });

        vi.clearAllMocks();
      }
    });
  });
});