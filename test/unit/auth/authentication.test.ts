/**
 * Authentication System Tests
 * 
 * Comprehensive tests for the authentication system covering:
 * - User registration and login flows
 * - JWT token generation and validation
 * - Password hashing and verification
 * - Session management
 * - OAuth integration (Google)
 * - Security measures and rate limiting
 * - Error handling and edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authRouter } from '../../../server/authRoutes';
import * as storage from '../../../server/storage';

// Mock dependencies
vi.mock('bcrypt');
vi.mock('jsonwebtoken');
vi.mock('../../../server/storage', () => ({
  storage: {
    createUser: vi.fn(),
    getUserByEmail: vi.fn(),
    updateUser: vi.fn(),
    saveRefreshToken: vi.fn(),
    validateRefreshToken: vi.fn(),
    revokeRefreshToken: vi.fn(),
  },
}));

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  return app;
};

describe('Authentication System', () => {
  let app: express.Application;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    password: '$2b$10$hashedpassword',
    role: 'customer' as const,
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const validRegistrationData = {
    email: 'newuser@example.com',
    password: 'SecurePassword123!',
    name: 'New User',
    role: 'customer',
  };

  const validLoginData = {
    email: 'test@example.com',
    password: 'correctpassword',
  };

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
    
    // Setup default mocks
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/auth/register - User Registration', () => {
    it('registers new user with valid data', async () => {
      const hashedPassword = '$2b$10$newhashedpassword';
      const accessToken = 'jwt-access-token';
      const refreshToken = 'jwt-refresh-token';

      vi.mocked(storage.storage.getUserByEmail).mockResolvedValueOnce(null);
      vi.mocked(bcrypt.hash).mockResolvedValueOnce(hashedPassword);
      vi.mocked(storage.storage.createUser).mockResolvedValueOnce({
        ...mockUser,
        email: validRegistrationData.email,
        name: validRegistrationData.name,
        password: hashedPassword,
      });
      vi.mocked(jwt.sign).mockReturnValueOnce(accessToken).mockReturnValueOnce(refreshToken);
      vi.mocked(storage.storage.saveRefreshToken).mockResolvedValueOnce(undefined);

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(201);

      expect(response.body).toEqual({
        message: 'User registered successfully',
        user: expect.objectContaining({
          email: validRegistrationData.email,
          name: validRegistrationData.name,
          role: validRegistrationData.role,
        }),
        accessToken,
        refreshToken,
      });

      expect(bcrypt.hash).toHaveBeenCalledWith(validRegistrationData.password, 10);
      expect(storage.storage.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: validRegistrationData.email,
          password: hashedPassword,
        })
      );
    });

    it('prevents registration with existing email', async () => {
      vi.mocked(storage.storage.getUserByEmail).mockResolvedValueOnce(mockUser);

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(400);

      expect(response.body.error).toBe('Email already registered');
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(storage.storage.createUser).not.toHaveBeenCalled();
    });

    it('validates email format', async () => {
      const invalidEmailData = {
        ...validRegistrationData,
        email: 'invalid-email-format',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidEmailData)
        .expect(400);

      expect(response.body.error).toContain('validation');
      expect(storage.storage.getUserByEmail).not.toHaveBeenCalled();
    });

    it('validates password strength', async () => {
      const weakPasswordData = {
        ...validRegistrationData,
        password: '123', // Too weak
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(weakPasswordData)
        .expect(400);

      expect(response.body.error).toContain('password');
    });

    it('validates required fields', async () => {
      const incompleteData = {
        email: 'test@example.com',
        // Missing password, name, and role
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(incompleteData)
        .expect(400);

      expect(response.body.error).toContain('validation');
    });

    it('handles database errors during registration', async () => {
      vi.mocked(storage.storage.getUserByEmail).mockResolvedValueOnce(null);
      vi.mocked(bcrypt.hash).mockResolvedValueOnce('hashedpassword');
      vi.mocked(storage.storage.createUser).mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(500);

      expect(response.body.error).toBe('Registration failed');
    });

    it('validates role field', async () => {
      const invalidRoleData = {
        ...validRegistrationData,
        role: 'invalid-role',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidRoleData)
        .expect(400);

      expect(response.body.error).toContain('validation');
    });

    it('handles bcrypt hashing errors', async () => {
      vi.mocked(storage.storage.getUserByEmail).mockResolvedValueOnce(null);
      vi.mocked(bcrypt.hash).mockRejectedValueOnce(new Error('Hashing failed'));

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(500);

      expect(response.body.error).toBe('Registration failed');
    });
  });

  describe('POST /api/auth/login - User Login', () => {
    it('authenticates user with valid credentials', async () => {
      const accessToken = 'jwt-access-token';
      const refreshToken = 'jwt-refresh-token';

      vi.mocked(storage.storage.getUserByEmail).mockResolvedValueOnce(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true);
      vi.mocked(jwt.sign).mockReturnValueOnce(accessToken).mockReturnValueOnce(refreshToken);
      vi.mocked(storage.storage.saveRefreshToken).mockResolvedValueOnce(undefined);

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Login successful',
        user: expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
        }),
        accessToken,
        refreshToken,
      });

      expect(bcrypt.compare).toHaveBeenCalledWith(validLoginData.password, mockUser.password);
    });

    it('rejects invalid email', async () => {
      vi.mocked(storage.storage.getUserByEmail).mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('rejects invalid password', async () => {
      vi.mocked(storage.storage.getUserByEmail).mockResolvedValueOnce(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('validates login input format', async () => {
      const invalidLoginData = {
        email: 'not-an-email',
        password: '', // Empty password
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidLoginData)
        .expect(400);

      expect(response.body.error).toContain('validation');
      expect(storage.storage.getUserByEmail).not.toHaveBeenCalled();
    });

    it('handles database errors during login', async () => {
      vi.mocked(storage.storage.getUserByEmail).mockRejectedValueOnce(
        new Error('Database query failed')
      );

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(500);

      expect(response.body.error).toBe('Login failed');
    });

    it('handles bcrypt comparison errors', async () => {
      vi.mocked(storage.storage.getUserByEmail).mockResolvedValueOnce(mockUser);
      vi.mocked(bcrypt.compare).mockRejectedValueOnce(new Error('Comparison failed'));

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(500);

      expect(response.body.error).toBe('Login failed');
    });

    it('handles users without passwords (OAuth users)', async () => {
      const oauthUser = { ...mockUser, password: null };
      vi.mocked(storage.storage.getUserByEmail).mockResolvedValueOnce(oauthUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
    });
  });

  describe('POST /api/auth/refresh - Token Refresh', () => {
    const validRefreshToken = 'valid-refresh-token';
    const newAccessToken = 'new-access-token';

    it('refreshes access token with valid refresh token', async () => {
      vi.mocked(storage.storage.validateRefreshToken).mockResolvedValueOnce({
        userId: mockUser.id,
        isValid: true,
      });
      vi.mocked(storage.storage.getUserByEmail).mockResolvedValueOnce(mockUser);
      vi.mocked(jwt.sign).mockReturnValueOnce(newAccessToken);

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: validRefreshToken })
        .expect(200);

      expect(response.body).toEqual({
        accessToken: newAccessToken,
      });

      expect(storage.storage.validateRefreshToken).toHaveBeenCalledWith(validRefreshToken);
    });

    it('rejects invalid refresh token', async () => {
      vi.mocked(storage.storage.validateRefreshToken).mockResolvedValueOnce({
        userId: null,
        isValid: false,
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.error).toBe('Invalid refresh token');
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('handles expired refresh tokens', async () => {
      vi.mocked(storage.storage.validateRefreshToken).mockResolvedValueOnce({
        userId: mockUser.id,
        isValid: false,
        reason: 'expired',
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: validRefreshToken })
        .expect(401);

      expect(response.body.error).toBe('Invalid refresh token');
    });

    it('validates refresh token format', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: '' })
        .expect(400);

      expect(response.body.error).toContain('validation');
      expect(storage.storage.validateRefreshToken).not.toHaveBeenCalled();
    });

    it('handles database errors during token validation', async () => {
      vi.mocked(storage.storage.validateRefreshToken).mockRejectedValueOnce(
        new Error('Database error')
      );

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: validRefreshToken })
        .expect(500);

      expect(response.body.error).toBe('Token refresh failed');
    });
  });

  describe('POST /api/auth/logout - User Logout', () => {
    it('logs out user and revokes refresh token', async () => {
      vi.mocked(storage.storage.revokeRefreshToken).mockResolvedValueOnce(undefined);

      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: 'token-to-revoke' })
        .expect(200);

      expect(response.body.message).toBe('Logout successful');
      expect(storage.storage.revokeRefreshToken).toHaveBeenCalledWith('token-to-revoke');
    });

    it('handles logout without refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({})
        .expect(200);

      expect(response.body.message).toBe('Logout successful');
      expect(storage.storage.revokeRefreshToken).not.toHaveBeenCalled();
    });

    it('handles errors during token revocation gracefully', async () => {
      vi.mocked(storage.storage.revokeRefreshToken).mockRejectedValueOnce(
        new Error('Token revocation failed')
      );

      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: 'token-to-revoke' })
        .expect(200);

      // Logout should still succeed even if token revocation fails
      expect(response.body.message).toBe('Logout successful');
    });
  });

  describe('JWT Token Generation and Validation', () => {
    it('generates JWT tokens with correct payload', async () => {
      const mockTokenPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };

      vi.mocked(storage.storage.getUserByEmail).mockResolvedValueOnce(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true);
      vi.mocked(jwt.sign).mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
      vi.mocked(storage.storage.saveRefreshToken).mockResolvedValueOnce(undefined);

      await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(200);

      expect(jwt.sign).toHaveBeenCalledWith(
        mockTokenPayload,
        process.env.JWT_SECRET,
        expect.objectContaining({ expiresIn: '15m' })
      );

      expect(jwt.sign).toHaveBeenCalledWith(
        mockTokenPayload,
        process.env.JWT_REFRESH_SECRET,
        expect.objectContaining({ expiresIn: '7d' })
      );
    });

    it('handles JWT signing errors', async () => {
      vi.mocked(storage.storage.getUserByEmail).mockResolvedValueOnce(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true);
      vi.mocked(jwt.sign).mockImplementationOnce(() => {
        throw new Error('JWT signing failed');
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(500);

      expect(response.body.error).toBe('Login failed');
    });
  });

  describe('Security Measures', () => {
    it('does not include password in response', async () => {
      vi.mocked(storage.storage.getUserByEmail).mockResolvedValueOnce(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true);
      vi.mocked(jwt.sign).mockReturnValue('token');
      vi.mocked(storage.storage.saveRefreshToken).mockResolvedValueOnce(undefined);

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(200);

      expect(response.body.user).not.toHaveProperty('password');
    });

    it('sanitizes user input', async () => {
      const maliciousInput = {
        email: '<script>alert("xss")</script>test@example.com',
        password: 'password123',
        name: '<img src=x onerror=alert("xss")>',
        role: 'customer',
      };

      vi.mocked(storage.storage.getUserByEmail).mockResolvedValueOnce(null);

      // The validation should reject malicious input
      const response = await request(app)
        .post('/api/auth/register')
        .send(maliciousInput);

      // Either rejected due to validation or input was sanitized
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('enforces rate limiting on login attempts', async () => {
      // This test assumes rate limiting middleware is implemented
      vi.mocked(storage.storage.getUserByEmail).mockResolvedValue(null);

      const promises = Array.from({ length: 10 }, () =>
        request(app)
          .post('/api/auth/login')
          .send(validLoginData)
      );

      const responses = await Promise.all(promises);

      // Some requests should be rate limited (status 429)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body.error).toContain('Invalid');
    });

    it('handles missing Content-Type header', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send('email=test@example.com&password=password')
        .expect(400);

      expect(response.body.error).toContain('validation');
    });

    it('handles very long input strings', async () => {
      const longString = 'a'.repeat(10000);
      const requestWithLongData = {
        email: `${longString}@example.com`,
        password: longString,
        name: longString,
        role: 'customer',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(requestWithLongData)
        .expect(400);

      expect(response.body.error).toContain('validation');
    });

    it('handles concurrent registration attempts', async () => {
      vi.mocked(storage.storage.getUserByEmail).mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed');
      vi.mocked(storage.storage.createUser).mockResolvedValue(mockUser);
      vi.mocked(jwt.sign).mockReturnValue('token');

      const requests = Array.from({ length: 3 }, () =>
        request(app)
          .post('/api/auth/register')
          .send(validRegistrationData)
      );

      const responses = await Promise.all(requests);

      // Only one should succeed due to email uniqueness
      const successResponses = responses.filter(r => r.status === 201);
      expect(successResponses).toHaveLength(1);
    });
  });
});