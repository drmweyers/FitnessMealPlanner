import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRouter from '../../../server/authRoutes';
import { storage } from '../../../server/storage';
import { verifyToken, generateTokens } from '../../../server/auth';
import cookieParser from 'cookie-parser';

// Mock dependencies
vi.mock('../../../server/storage');
vi.mock('../../../server/auth', () => ({
  verifyToken: vi.fn(),
  generateTokens: vi.fn(),
  hashPassword: vi.fn(),
  comparePasswords: vi.fn()
}));
vi.mock('../../../server/passport-config', () => ({
  default: {
    authenticate: vi.fn(() => (req: any, res: any, next: any) => next()),
    initialize: vi.fn(() => (req: any, res: any, next: any) => next()),
    session: vi.fn(() => (req: any, res: any, next: any) => next())
  }
}));

describe('Refresh Token Endpoint', () => {
  let app: express.Application;
  let mockUser: any;
  let mockRefreshToken: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/auth', authRouter);

    // Setup mock data
    mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'customer',
      password: 'hashed-password'
    };

    mockRefreshToken = {
      token: 'valid-refresh-token',
      userId: 'test-user-id',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    };

    // Default storage mocks
    vi.mocked(storage.getUser).mockResolvedValue(mockUser);
    vi.mocked(storage.getRefreshToken).mockResolvedValue(mockRefreshToken);
    vi.mocked(storage.createRefreshToken).mockResolvedValue(undefined);
    vi.mocked(storage.deleteRefreshToken).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /auth/refresh_token', () => {
    it('should successfully refresh tokens with valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const newAccessToken = 'new-access-token';
      const newRefreshToken = 'new-refresh-token';

      vi.mocked(verifyToken).mockResolvedValueOnce({
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'customer'
      });

      vi.mocked(generateTokens).mockReturnValueOnce({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      });

      const response = await request(app)
        .post('/auth/refresh_token')
        .set('Cookie', `refreshToken=${refreshToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        data: {
          token: newAccessToken,
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            role: 'customer'
          }
        }
      });

      // Verify token operations
      expect(verifyToken).toHaveBeenCalledWith(refreshToken);
      expect(storage.getRefreshToken).toHaveBeenCalledWith(refreshToken);
      expect(generateTokens).toHaveBeenCalledWith(mockUser);
      expect(storage.createRefreshToken).toHaveBeenCalled();
      expect(storage.deleteRefreshToken).toHaveBeenCalledWith(refreshToken);

      // Verify cookies are set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c: string) => c.includes('token='))).toBe(true);
      expect(cookies.some((c: string) => c.includes('refreshToken='))).toBe(true);
    });

    it('should return 401 when refresh token is missing', async () => {
      const response = await request(app)
        .post('/auth/refresh_token')
        .expect(401);

      expect(response.body).toMatchObject({
        status: 'error',
        message: 'Refresh token required',
        code: 'NO_REFRESH_TOKEN'
      });

      expect(verifyToken).not.toHaveBeenCalled();
    });

    it('should return 401 when refresh token is invalid', async () => {
      const invalidToken = 'invalid-refresh-token';

      vi.mocked(verifyToken).mockRejectedValueOnce(new Error('Invalid token'));

      const response = await request(app)
        .post('/auth/refresh_token')
        .set('Cookie', `refreshToken=${invalidToken}`)
        .expect(401);

      expect(response.body).toMatchObject({
        status: 'error',
        message: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    });

    it('should return 401 when refresh token is not found in database', async () => {
      const refreshToken = 'not-in-database';

      vi.mocked(verifyToken).mockResolvedValueOnce({
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'customer'
      });

      vi.mocked(storage.getRefreshToken).mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/auth/refresh_token')
        .set('Cookie', `refreshToken=${refreshToken}`)
        .expect(401);

      expect(response.body).toMatchObject({
        status: 'error',
        message: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    });

    it('should return 401 when refresh token is expired in database', async () => {
      const expiredToken = 'expired-refresh-token';

      vi.mocked(verifyToken).mockResolvedValueOnce({
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'customer'
      });

      vi.mocked(storage.getRefreshToken).mockResolvedValueOnce({
        ...mockRefreshToken,
        expiresAt: new Date(Date.now() - 1000) // Expired
      });

      const response = await request(app)
        .post('/auth/refresh_token')
        .set('Cookie', `refreshToken=${expiredToken}`)
        .expect(401);

      expect(response.body).toMatchObject({
        status: 'error',
        message: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    });

    it('should return 404 when user is not found', async () => {
      const refreshToken = 'valid-refresh-token';

      vi.mocked(verifyToken).mockResolvedValueOnce({
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'customer'
      });

      vi.mocked(storage.getUser).mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/auth/refresh_token')
        .set('Cookie', `refreshToken=${refreshToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        status: 'error',
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    });

    it('should handle token generation errors', async () => {
      const refreshToken = 'valid-refresh-token';

      vi.mocked(verifyToken).mockResolvedValueOnce({
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'customer'
      });

      vi.mocked(generateTokens).mockImplementationOnce(() => {
        throw new Error('Token generation failed');
      });

      const response = await request(app)
        .post('/auth/refresh_token')
        .set('Cookie', `refreshToken=${refreshToken}`)
        .expect(500);

      expect(response.body).toMatchObject({
        status: 'error',
        message: 'Token refresh failed'
      });
    });

    it('should handle database errors gracefully', async () => {
      const refreshToken = 'valid-refresh-token';

      vi.mocked(verifyToken).mockResolvedValueOnce({
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'customer'
      });

      vi.mocked(generateTokens).mockReturnValueOnce({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      });

      vi.mocked(storage.createRefreshToken).mockRejectedValueOnce(
        new Error('Database error')
      );

      const response = await request(app)
        .post('/auth/refresh_token')
        .set('Cookie', `refreshToken=${refreshToken}`)
        .expect(500);

      expect(response.body).toMatchObject({
        status: 'error',
        message: 'Token refresh failed'
      });
    });

    it('should set secure cookies in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const refreshToken = 'valid-refresh-token';

      vi.mocked(verifyToken).mockResolvedValueOnce({
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'customer'
      });

      vi.mocked(generateTokens).mockReturnValueOnce({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      });

      const response = await request(app)
        .post('/auth/refresh_token')
        .set('Cookie', `refreshToken=${refreshToken}`)
        .expect(200);

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      
      // In production, cookies should have Secure flag
      const tokenCookie = cookies.find((c: string) => c.startsWith('token='));
      expect(tokenCookie).toContain('Secure');
      expect(tokenCookie).toContain('HttpOnly');
      expect(tokenCookie).toContain('SameSite=Lax');

      process.env.NODE_ENV = originalEnv;
    });

    it('should maintain user session data after refresh', async () => {
      const refreshToken = 'valid-refresh-token';
      const newAccessToken = 'new-access-token';
      const newRefreshToken = 'new-refresh-token';

      // Add additional user data
      const detailedUser = {
        ...mockUser,
        firstName: 'Test',
        lastName: 'User',
        createdAt: new Date('2023-01-01')
      };

      vi.mocked(storage.getUser).mockResolvedValueOnce(detailedUser);
      vi.mocked(verifyToken).mockResolvedValueOnce({
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'customer'
      });

      vi.mocked(generateTokens).mockReturnValueOnce({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      });

      const response = await request(app)
        .post('/auth/refresh_token')
        .set('Cookie', `refreshToken=${refreshToken}`)
        .expect(200);

      expect(response.body.data.user).toMatchObject({
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'customer'
      });

      // Verify tokens were generated with full user object
      expect(generateTokens).toHaveBeenCalledWith(detailedUser);
    });

    it('should clean up old refresh token even if deletion fails', async () => {
      const refreshToken = 'valid-refresh-token';

      vi.mocked(verifyToken).mockResolvedValueOnce({
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'customer'
      });

      vi.mocked(generateTokens).mockReturnValueOnce({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      });

      // Mock deletion failure (non-critical)
      vi.mocked(storage.deleteRefreshToken).mockRejectedValueOnce(
        new Error('Delete failed')
      );

      const response = await request(app)
        .post('/auth/refresh_token')
        .set('Cookie', `refreshToken=${refreshToken}`)
        .expect(200);

      // Should still succeed even if old token deletion fails
      expect(response.body.status).toBe('success');
      expect(storage.deleteRefreshToken).toHaveBeenCalledWith(refreshToken);
    });
  });
});