import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { requireAuth } from '../../../server/middleware/auth';
import { verifyToken, generateTokens } from '../../../server/auth';
import { storage } from '../../../server/storage';

// Mock dependencies
vi.mock('../../../server/storage');
vi.mock('../../../server/auth', () => ({
  verifyToken: vi.fn(),
  generateTokens: vi.fn()
}));

describe('JWT Refresh Mechanism', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockUser: any;
  let mockRefreshToken: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup mock user
    mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'customer'
    };

    // Setup mock refresh token
    mockRefreshToken = {
      token: 'valid-refresh-token',
      userId: 'test-user-id',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    };

    // Setup request mock
    mockReq = {
      headers: {},
      cookies: {}
    };

    // Setup response mock
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      cookie: vi.fn().mockReturnThis(),
      clearCookie: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis()
    };

    // Setup next function
    mockNext = vi.fn();

    // Default storage mocks
    vi.mocked(storage.getUser).mockResolvedValue(mockUser);
    vi.mocked(storage.getRefreshToken).mockResolvedValue(mockRefreshToken);
    vi.mocked(storage.createRefreshToken).mockResolvedValue(undefined);
    vi.mocked(storage.deleteRefreshToken).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('requireAuth middleware', () => {
    describe('Access Token Validation', () => {
      it('should authenticate successfully with valid access token in Authorization header', async () => {
        const validToken = 'valid-access-token';
        mockReq.headers!.authorization = `Bearer ${validToken}`;
        
        vi.mocked(verifyToken).mockResolvedValueOnce({
          id: 'test-user-id',
          email: 'test@example.com',
          role: 'customer'
        });

        await requireAuth(mockReq as Request, mockRes as Response, mockNext);

        expect(verifyToken).toHaveBeenCalledWith(validToken);
        expect(storage.getUser).toHaveBeenCalledWith('test-user-id');
        expect(mockReq.user).toEqual({
          id: 'test-user-id',
          role: 'customer'
        });
        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });

      it('should authenticate successfully with valid access token in cookies', async () => {
        const validToken = 'valid-access-token';
        mockReq.cookies!.token = validToken;
        
        vi.mocked(verifyToken).mockResolvedValueOnce({
          id: 'test-user-id',
          email: 'test@example.com',
          role: 'customer'
        });

        await requireAuth(mockReq as Request, mockRes as Response, mockNext);

        expect(verifyToken).toHaveBeenCalledWith(validToken);
        expect(storage.getUser).toHaveBeenCalledWith('test-user-id');
        expect(mockNext).toHaveBeenCalled();
      });

      it('should prefer Authorization header over cookie when both present', async () => {
        const headerToken = 'header-token';
        const cookieToken = 'cookie-token';
        mockReq.headers!.authorization = `Bearer ${headerToken}`;
        mockReq.cookies!.token = cookieToken;
        
        vi.mocked(verifyToken).mockResolvedValueOnce({
          id: 'test-user-id',
          email: 'test@example.com',
          role: 'customer'
        });

        await requireAuth(mockReq as Request, mockRes as Response, mockNext);

        expect(verifyToken).toHaveBeenCalledWith(headerToken);
        expect(verifyToken).not.toHaveBeenCalledWith(cookieToken);
      });

      it('should return 401 when no token is provided', async () => {
        await requireAuth(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Authentication required. Please provide a valid token.',
          code: 'NO_TOKEN'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 401 when user not found in database', async () => {
        mockReq.headers!.authorization = 'Bearer valid-token';
        
        vi.mocked(verifyToken).mockResolvedValueOnce({
          id: 'test-user-id',
          email: 'test@example.com',
          role: 'customer'
        });
        vi.mocked(storage.getUser).mockResolvedValueOnce(null);

        await requireAuth(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Invalid user session',
          code: 'INVALID_SESSION'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('Automatic Token Refresh', () => {
      it('should automatically refresh expired access token when valid refresh token exists', async () => {
        const expiredToken = 'expired-access-token';
        const refreshToken = 'valid-refresh-token';
        const newAccessToken = 'new-access-token';
        const newRefreshToken = 'new-refresh-token';

        mockReq.headers!.authorization = `Bearer ${expiredToken}`;
        mockReq.cookies!.refreshToken = refreshToken;

        // First call throws TokenExpiredError
        vi.mocked(verifyToken)
          .mockRejectedValueOnce(new jwt.TokenExpiredError('jwt expired', new Date()))
          .mockResolvedValueOnce({
            id: 'test-user-id',
            email: 'test@example.com',
            role: 'customer'
          });

        vi.mocked(generateTokens).mockReturnValueOnce({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        });

        await requireAuth(mockReq as Request, mockRes as Response, mockNext);

        // Verify refresh flow
        expect(verifyToken).toHaveBeenCalledWith(expiredToken);
        expect(verifyToken).toHaveBeenCalledWith(refreshToken);
        expect(storage.getRefreshToken).toHaveBeenCalledWith(refreshToken);
        expect(generateTokens).toHaveBeenCalledWith(mockUser);
        expect(storage.createRefreshToken).toHaveBeenCalled();
        expect(storage.deleteRefreshToken).toHaveBeenCalledWith(refreshToken);

        // Verify new tokens are set
        expect(mockRes.cookie).toHaveBeenCalledWith('token', newAccessToken, expect.any(Object));
        expect(mockRes.cookie).toHaveBeenCalledWith('refreshToken', newRefreshToken, expect.any(Object));
        expect(mockRes.setHeader).toHaveBeenCalledWith('X-Access-Token', newAccessToken);
        expect(mockRes.setHeader).toHaveBeenCalledWith('X-Refresh-Token', newRefreshToken);

        // Verify request continues
        expect(mockReq.user).toEqual({
          id: 'test-user-id',
          role: 'customer'
        });
        expect(mockReq.tokens).toEqual({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        });
        expect(mockNext).toHaveBeenCalled();
      });

      it('should return 401 when refresh token is missing during refresh attempt', async () => {
        const expiredToken = 'expired-access-token';
        mockReq.headers!.authorization = `Bearer ${expiredToken}`;

        vi.mocked(verifyToken).mockRejectedValueOnce(
          new jwt.TokenExpiredError('jwt expired', new Date())
        );

        await requireAuth(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Session expired',
          code: 'SESSION_EXPIRED'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 401 when refresh token is expired', async () => {
        const expiredToken = 'expired-access-token';
        const expiredRefreshToken = 'expired-refresh-token';
        mockReq.headers!.authorization = `Bearer ${expiredToken}`;
        mockReq.cookies!.refreshToken = expiredRefreshToken;

        vi.mocked(verifyToken)
          .mockRejectedValueOnce(new jwt.TokenExpiredError('jwt expired', new Date()))
          .mockResolvedValueOnce({
            id: 'test-user-id',
            email: 'test@example.com',
            role: 'customer'
          });

        // Mock expired refresh token
        vi.mocked(storage.getRefreshToken).mockResolvedValueOnce({
          ...mockRefreshToken,
          expiresAt: new Date(Date.now() - 1000) // Expired
        });

        await requireAuth(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.clearCookie).toHaveBeenCalledWith('token');
        expect(mockRes.clearCookie).toHaveBeenCalledWith('refreshToken');
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Session expired. Please login again.',
          code: 'REFRESH_TOKEN_EXPIRED'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 401 when refresh token is not found in database', async () => {
        const expiredToken = 'expired-access-token';
        const invalidRefreshToken = 'invalid-refresh-token';
        mockReq.headers!.authorization = `Bearer ${expiredToken}`;
        mockReq.cookies!.refreshToken = invalidRefreshToken;

        vi.mocked(verifyToken)
          .mockRejectedValueOnce(new jwt.TokenExpiredError('jwt expired', new Date()))
          .mockResolvedValueOnce({
            id: 'test-user-id',
            email: 'test@example.com',
            role: 'customer'
          });

        vi.mocked(storage.getRefreshToken).mockResolvedValueOnce(null);

        await requireAuth(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.clearCookie).toHaveBeenCalledWith('token');
        expect(mockRes.clearCookie).toHaveBeenCalledWith('refreshToken');
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Session expired. Please login again.',
          code: 'REFRESH_TOKEN_EXPIRED'
        });
      });

      it('should handle refresh token verification failure', async () => {
        const expiredToken = 'expired-access-token';
        const invalidRefreshToken = 'invalid-refresh-token';
        mockReq.headers!.authorization = `Bearer ${expiredToken}`;
        mockReq.cookies!.refreshToken = invalidRefreshToken;

        vi.mocked(verifyToken)
          .mockRejectedValueOnce(new jwt.TokenExpiredError('jwt expired', new Date()))
          .mockRejectedValueOnce(new Error('Invalid token'));

        await requireAuth(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.clearCookie).toHaveBeenCalledWith('token');
        expect(mockRes.clearCookie).toHaveBeenCalledWith('refreshToken');
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Session expired. Please login again.',
          code: 'SESSION_EXPIRED'
        });
      });

      it('should handle user not found during refresh', async () => {
        const expiredToken = 'expired-access-token';
        const refreshToken = 'valid-refresh-token';
        mockReq.headers!.authorization = `Bearer ${expiredToken}`;
        mockReq.cookies!.refreshToken = refreshToken;

        vi.mocked(verifyToken)
          .mockRejectedValueOnce(new jwt.TokenExpiredError('jwt expired', new Date()))
          .mockResolvedValueOnce({
            id: 'test-user-id',
            email: 'test@example.com',
            role: 'customer'
          });

        // User not found during refresh
        vi.mocked(storage.getUser).mockResolvedValueOnce(null);

        await requireAuth(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Invalid user session',
          code: 'INVALID_SESSION'
        });
      });
    });

    describe('Non-Expired Token Errors', () => {
      it('should return 401 for invalid token format', async () => {
        const invalidToken = 'invalid-token-format';
        mockReq.headers!.authorization = `Bearer ${invalidToken}`;

        vi.mocked(verifyToken).mockRejectedValueOnce(new Error('jwt malformed'));

        await requireAuth(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 401 for invalid signature', async () => {
        const invalidToken = 'token-with-invalid-signature';
        mockReq.headers!.authorization = `Bearer ${invalidToken}`;

        vi.mocked(verifyToken).mockRejectedValueOnce(new Error('invalid signature'));

        await requireAuth(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      });
    });

    describe('Cookie Configuration', () => {
      it('should set secure cookies in production', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const expiredToken = 'expired-access-token';
        const refreshToken = 'valid-refresh-token';
        mockReq.headers!.authorization = `Bearer ${expiredToken}`;
        mockReq.cookies!.refreshToken = refreshToken;

        vi.mocked(verifyToken)
          .mockRejectedValueOnce(new jwt.TokenExpiredError('jwt expired', new Date()))
          .mockResolvedValueOnce({
            id: 'test-user-id',
            email: 'test@example.com',
            role: 'customer'
          });

        vi.mocked(generateTokens).mockReturnValueOnce({
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token'
        });

        // Ensure user is found during refresh
        vi.mocked(storage.getUser)
          .mockResolvedValueOnce(mockUser) // First call
          .mockResolvedValueOnce(mockUser); // Second call during refresh

        await requireAuth(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.cookie).toHaveBeenCalledWith(
          'token',
          'new-access-token',
          expect.objectContaining({
            httpOnly: true,
            secure: true,
            sameSite: 'lax'
          })
        );

        process.env.NODE_ENV = originalEnv;
      });

      it('should set non-secure cookies in development', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        const expiredToken = 'expired-access-token';
        const refreshToken = 'valid-refresh-token';
        mockReq.headers!.authorization = `Bearer ${expiredToken}`;
        mockReq.cookies!.refreshToken = refreshToken;

        vi.mocked(verifyToken)
          .mockRejectedValueOnce(new jwt.TokenExpiredError('jwt expired', new Date()))
          .mockResolvedValueOnce({
            id: 'test-user-id',
            email: 'test@example.com',
            role: 'customer'
          });

        vi.mocked(generateTokens).mockReturnValueOnce({
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token'
        });

        await requireAuth(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.cookie).toHaveBeenCalledWith(
          'token',
          'new-access-token',
          expect.objectContaining({
            httpOnly: true,
            secure: false,
            sameSite: 'lax'
          })
        );

        process.env.NODE_ENV = originalEnv;
      });
    });

    describe('Error Handling', () => {
      it('should handle unexpected errors gracefully', async () => {
        mockReq.headers!.authorization = 'Bearer valid-token';

        vi.mocked(verifyToken).mockRejectedValueOnce(new Error('Unexpected error'));

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        await requireAuth(mockReq as Request, mockRes as Response, mockNext);

        // The error might be handled differently in the actual implementation
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.any(String)
          })
        );

        consoleSpy.mockRestore();
      });

      it('should handle storage errors during refresh', async () => {
        const expiredToken = 'expired-access-token';
        const refreshToken = 'valid-refresh-token';
        mockReq.headers!.authorization = `Bearer ${expiredToken}`;
        mockReq.cookies!.refreshToken = refreshToken;

        vi.mocked(verifyToken)
          .mockRejectedValueOnce(new jwt.TokenExpiredError('jwt expired', new Date()))
          .mockResolvedValueOnce({
            id: 'test-user-id',
            email: 'test@example.com',
            role: 'customer'
          });

        vi.mocked(storage.createRefreshToken).mockRejectedValueOnce(
          new Error('Database error')
        );

        await requireAuth(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.clearCookie).toHaveBeenCalledWith('token');
        expect(mockRes.clearCookie).toHaveBeenCalledWith('refreshToken');
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Session expired. Please login again.',
          code: 'SESSION_EXPIRED'
        });
      });
    });
  });
});