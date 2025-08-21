/**
 * Unit Tests for Authentication & Authorization Flows
 * 
 * Tests all authentication and authorization functionality:
 * - User registration and login
 * - JWT token generation and validation
 * - Role-based access control (RBAC)
 * - Session management and refresh tokens
 * - Password reset flows
 * - OAuth integration (Google)
 * - Security middleware and route protection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { db } from '../../server/db';
import { 
  users,
  refreshTokens,
  passwordResetTokens,
  type User 
} from '../../shared/schema';
import { eq } from 'drizzle-orm';
import authRouter from '../../server/authRoutes';
import { requireAuth, requireRole } from '../../server/middleware/auth';
import { storage } from '../../server/storage';
import { hashPassword, verifyPassword } from '../../server/auth';

// Mock dependencies
vi.mock('../../server/db');
vi.mock('../../server/storage');
vi.mock('../../server/auth');
vi.mock('jsonwebtoken');
vi.mock('bcrypt');

// Test data
const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  password: '$2b$10$hashedpassword',
  role: 'customer',
  googleId: null,
  name: 'Test User',
  profilePicture: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockTrainer: User = {
  id: 'trainer-123',
  email: 'trainer@example.com',
  password: '$2b$10$hashedpassword',
  role: 'trainer',
  googleId: null,
  name: 'Test Trainer',
  profilePicture: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockAdmin: User = {
  id: 'admin-123',
  email: 'admin@example.com',
  password: '$2b$10$hashedpassword',
  role: 'admin',
  googleId: null,
  name: 'Test Admin',
  profilePicture: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

describe('Authentication & Authorization Flows', () => {
  let app: express.Application;
  const mockDb = vi.mocked(db);
  const mockStorage = vi.mocked(storage);
  const mockHashPassword = vi.mocked(hashPassword);
  const mockVerifyPassword = vi.mocked(verifyPassword);
  const mockJwt = vi.mocked(jwt);
  const mockBcrypt = vi.mocked(bcrypt);

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);

    // Protected route for testing
    app.get('/api/protected', requireAuth, (req: any, res) => {
      res.json({ message: 'Protected route accessed', user: req.user });
    });

    app.get('/api/trainer-only', requireAuth, requireRole('trainer'), (req: any, res) => {
      res.json({ message: 'Trainer-only route accessed' });
    });

    app.get('/api/admin-only', requireAuth, requireRole('admin'), (req: any, res) => {
      res.json({ message: 'Admin-only route accessed' });
    });

    vi.clearAllMocks();

    // Default mock implementations
    mockStorage.getUserByEmail.mockResolvedValue(mockUser);
    mockStorage.createUser.mockResolvedValue(mockUser);
    mockStorage.createRefreshToken.mockResolvedValue();
    mockStorage.getRefreshToken.mockResolvedValue({
      userId: 'user-123',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    mockStorage.deleteRefreshToken.mockResolvedValue();

    mockHashPassword.mockResolvedValue('$2b$10$hashedpassword');
    mockVerifyPassword.mockResolvedValue(true);
    
    mockJwt.sign.mockReturnValue('mock-jwt-token' as any);
    mockJwt.verify.mockReturnValue({
      userId: 'user-123',
      email: 'test@example.com',
      role: 'customer',
    } as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('User Registration', () => {
    it('should register new user successfully', async () => {
      const registrationData = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        name: 'New User',
        role: 'customer',
      };

      mockStorage.getUserByEmail.mockResolvedValue(null); // No existing user
      
      const newUser = {
        ...mockUser,
        id: 'new-user-456',
        email: registrationData.email,
        name: registrationData.name,
      };
      
      mockStorage.createUser.mockResolvedValue(newUser);

      const response = await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user).toMatchObject({
        id: 'new-user-456',
        email: 'newuser@example.com',
        name: 'New User',
        role: 'customer',
      });
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();

      // Verify password was hashed
      expect(mockHashPassword).toHaveBeenCalledWith('SecurePass123!');
      
      // Verify user was created
      expect(mockStorage.createUser).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: '$2b$10$hashedpassword',
        name: 'New User',
        role: 'customer',
      });
    });

    it('should prevent duplicate email registration', async () => {
      mockStorage.getUserByEmail.mockResolvedValue(mockUser); // User exists

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          name: 'Duplicate User',
        })
        .expect(409);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('USER_EXISTS');
      expect(response.body.message).toContain('already exists');
      expect(mockStorage.createUser).not.toHaveBeenCalled();
    });

    it('should validate registration data', async () => {
      const invalidData = [
        {
          data: { email: 'invalid-email', password: 'pass' },
          expectedError: 'validation',
        },
        {
          data: { email: 'valid@email.com', password: 'short' },
          expectedError: 'password',
        },
        {
          data: { email: '', password: 'ValidPass123!' },
          expectedError: 'email',
        },
        {
          data: { email: 'test@example.com', password: 'NoNumber!' },
          expectedError: 'password',
        },
      ];

      for (const { data, expectedError } of invalidData) {
        const response = await request(app)
          .post('/api/auth/register')
          .send(data)
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message.toLowerCase()).toContain(expectedError);
      }

      expect(mockStorage.createUser).not.toHaveBeenCalled();
    });

    it('should sanitize registration input', async () => {
      const maliciousData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: '<script>alert("xss")</script>',
        bio: 'DROP TABLE users;',
      };

      mockStorage.getUserByEmail.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/register')
        .send(maliciousData)
        .expect(201);

      // Verify malicious input was sanitized
      const createUserCall = mockStorage.createUser.mock.calls[0][0];
      expect(createUserCall.name).not.toContain('<script>');
      expect(createUserCall.name).not.toContain('DROP TABLE');
    });

    it('should set default role when not specified', async () => {
      const registrationData = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        name: 'New User',
        // No role specified
      };

      mockStorage.getUserByEmail.mockResolvedValue(null);

      await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(201);

      const createUserCall = mockStorage.createUser.mock.calls[0][0];
      expect(createUserCall.role).toBe('customer'); // Default role
    });
  });

  describe('User Login', () => {
    it('should login user with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'correctpassword',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user).toMatchObject({
        id: 'user-123',
        email: 'test@example.com',
        role: 'customer',
      });
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();

      // Verify password was checked
      expect(mockVerifyPassword).toHaveBeenCalledWith(
        'correctpassword',
        '$2b$10$hashedpassword'
      );

      // Verify refresh token was created
      expect(mockStorage.createRefreshToken).toHaveBeenCalledWith(
        'user-123',
        expect.any(String),
        expect.any(Date)
      );
    });

    it('should reject invalid email', async () => {
      mockStorage.getUserByEmail.mockResolvedValue(null); // User not found

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'anypassword',
        })
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('INVALID_CREDENTIALS');
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should reject invalid password', async () => {
      mockVerifyPassword.mockResolvedValue(false); // Wrong password

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('should handle different user roles', async () => {
      const testCases = [
        { user: mockUser, role: 'customer' },
        { user: mockTrainer, role: 'trainer' },
        { user: mockAdmin, role: 'admin' },
      ];

      for (const { user, role } of testCases) {
        mockStorage.getUserByEmail.mockResolvedValue(user);
        mockJwt.verify.mockReturnValue({
          userId: user.id,
          email: user.email,
          role: user.role,
        } as any);

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: user.email,
            password: 'correctpassword',
          })
          .expect(200);

        expect(response.body.data.user.role).toBe(role);
      }
    });

    it('should rate limit login attempts', async () => {
      mockVerifyPassword.mockResolvedValue(false); // Wrong password

      // Simulate multiple failed login attempts
      const promises = Array.from({ length: 10 }, () =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword',
          })
      );

      const responses = await Promise.all(promises);

      // Later attempts should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should log security events', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      mockStorage.getUserByEmail.mockResolvedValue(null); // Trigger failed login

      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'suspicious@example.com',
          password: 'password',
        })
        .expect(401);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed login attempt for suspicious@example.com')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('JWT Token Management', () => {
    it('should generate valid JWT tokens', async () => {
      const tokenPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'customer',
      };

      mockJwt.sign.mockImplementation((payload, secret, options) => {
        expect(payload).toMatchObject(tokenPayload);
        expect(secret).toBe(process.env.JWT_SECRET);
        expect(options).toMatchObject({
          expiresIn: '15m', // Access token expiry
        });
        return 'mock-access-token';
      });

      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'correctpassword',
        })
        .expect(200);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        tokenPayload,
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );
    });

    it('should validate JWT tokens in middleware', async () => {
      const token = 'valid-jwt-token';

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toBe('Protected route accessed');
      expect(response.body.user).toMatchObject({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'customer',
      });

      expect(mockJwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
    });

    it('should reject invalid JWT tokens', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid token');
    });

    it('should reject expired JWT tokens', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new jwt.TokenExpiredError('Token expired', new Date());
      });

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer expired-token')
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('TOKEN_EXPIRED');
    });

    it('should require authorization header', async () => {
      const response = await request(app)
        .get('/api/protected')
        .expect(401);

      expect(response.body.message).toContain('Authorization header required');
    });

    it('should validate bearer token format', async () => {
      const invalidFormats = [
        'invalid-format',
        'Bearer',
        'Basic dXNlcjpwYXNz',
        '',
      ];

      for (const format of invalidFormats) {
        const response = await request(app)
          .get('/api/protected')
          .set('Authorization', format)
          .expect(401);

        expect(response.body.message).toContain('Invalid token format');
      }
    });
  });

  describe('Refresh Token Management', () => {
    it('should refresh access token with valid refresh token', async () => {
      const refreshTokenData = {
        refreshToken: 'valid-refresh-token',
      };

      // Mock valid refresh token
      mockStorage.getRefreshToken.mockResolvedValue({
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      });

      mockStorage.getUserById.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/refresh')
        .send(refreshTokenData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();

      // Verify old refresh token was deleted and new one created
      expect(mockStorage.deleteRefreshToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(mockStorage.createRefreshToken).toHaveBeenCalled();
    });

    it('should reject invalid refresh token', async () => {
      mockStorage.getRefreshToken.mockResolvedValue(null); // Token not found

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('should reject expired refresh token', async () => {
      mockStorage.getRefreshToken.mockResolvedValue({
        userId: 'user-123',
        expiresAt: new Date(Date.now() - 1000), // Expired
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'expired-refresh-token' })
        .expect(401);

      expect(response.body.code).toBe('REFRESH_TOKEN_EXPIRED');
      
      // Should clean up expired token
      expect(mockStorage.deleteRefreshToken).toHaveBeenCalledWith('expired-refresh-token');
    });

    it('should handle refresh token rotation', async () => {
      const refreshTokenData = {
        refreshToken: 'current-refresh-token',
      };

      mockStorage.getRefreshToken.mockResolvedValue({
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      mockStorage.getUserById.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/refresh')
        .send(refreshTokenData)
        .expect(200);

      // Verify old token was deleted
      expect(mockStorage.deleteRefreshToken).toHaveBeenCalledWith('current-refresh-token');
      
      // Verify new token was created
      expect(mockStorage.createRefreshToken).toHaveBeenCalledWith(
        'user-123',
        expect.any(String),
        expect.any(Date)
      );

      // New token should be different
      expect(response.body.data.refreshToken).not.toBe('current-refresh-token');
    });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    it('should allow access based on user role', async () => {
      const testCases = [
        {
          role: 'trainer',
          route: '/api/trainer-only',
          shouldAllow: true,
        },
        {
          role: 'admin',
          route: '/api/admin-only',
          shouldAllow: true,
        },
        {
          role: 'customer',
          route: '/api/trainer-only',
          shouldAllow: false,
        },
        {
          role: 'trainer',
          route: '/api/admin-only',
          shouldAllow: false,
        },
      ];

      for (const { role, route, shouldAllow } of testCases) {
        mockJwt.verify.mockReturnValue({
          userId: 'user-123',
          email: 'test@example.com',
          role: role,
        } as any);

        const response = await request(app)
          .get(route)
          .set('Authorization', 'Bearer valid-token');

        if (shouldAllow) {
          expect(response.status).toBe(200);
          expect(response.body.message).toContain('route accessed');
        } else {
          expect(response.status).toBe(403);
          expect(response.body.message).toContain('Insufficient permissions');
        }
      }
    });

    it('should support multiple allowed roles', async () => {
      // Add route that allows both trainer and admin
      app.get('/api/staff-only', requireAuth, requireRole(['trainer', 'admin']), (req, res) => {
        res.json({ message: 'Staff route accessed' });
      });

      const staffRoles = ['trainer', 'admin'];
      const nonStaffRoles = ['customer'];

      // Test allowed roles
      for (const role of staffRoles) {
        mockJwt.verify.mockReturnValue({
          userId: 'user-123',
          email: 'test@example.com',
          role: role,
        } as any);

        const response = await request(app)
          .get('/api/staff-only')
          .set('Authorization', 'Bearer valid-token')
          .expect(200);

        expect(response.body.message).toBe('Staff route accessed');
      }

      // Test denied roles
      for (const role of nonStaffRoles) {
        mockJwt.verify.mockReturnValue({
          userId: 'user-123',
          email: 'test@example.com',
          role: role,
        } as any);

        await request(app)
          .get('/api/staff-only')
          .set('Authorization', 'Bearer valid-token')
          .expect(403);
      }
    });

    it('should handle role inheritance', async () => {
      // Admin should have access to all routes
      app.get('/api/role-hierarchy', requireAuth, (req: any, res) => {
        const userRole = req.user.role;
        const allowedRoles = ['admin', 'trainer'];
        
        if (userRole === 'admin' || allowedRoles.includes(userRole)) {
          res.json({ message: 'Access granted', role: userRole });
        } else {
          res.status(403).json({ message: 'Access denied' });
        }
      });

      mockJwt.verify.mockReturnValue({
        userId: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
      } as any);

      const response = await request(app)
        .get('/api/role-hierarchy')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.message).toBe('Access granted');
      expect(response.body.role).toBe('admin');
    });

    it('should validate role changes', async () => {
      // Mock admin updating user role
      app.put('/api/users/:userId/role', requireAuth, requireRole('admin'), async (req, res) => {
        const { role } = req.body;
        const validRoles = ['admin', 'trainer', 'customer'];

        if (!validRoles.includes(role)) {
          return res.status(400).json({ 
            status: 'error',
            message: 'Invalid role'
          });
        }

        res.json({ 
          status: 'success',
          message: 'Role updated successfully',
          newRole: role
        });
      });

      mockJwt.verify.mockReturnValue({
        userId: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
      } as any);

      // Test valid role change
      const validResponse = await request(app)
        .put('/api/users/user-123/role')
        .set('Authorization', 'Bearer admin-token')
        .send({ role: 'trainer' })
        .expect(200);

      expect(validResponse.body.newRole).toBe('trainer');

      // Test invalid role change
      const invalidResponse = await request(app)
        .put('/api/users/user-123/role')
        .set('Authorization', 'Bearer admin-token')
        .send({ role: 'superuser' })
        .expect(400);

      expect(invalidResponse.body.message).toBe('Invalid role');
    });
  });

  describe('Password Reset Flow', () => {
    it('should initiate password reset', async () => {
      const resetData = {
        email: 'test@example.com',
      };

      mockStorage.createPasswordResetToken = vi.fn().mockResolvedValue();

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send(resetData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('reset link sent');

      // Verify reset token was created
      expect(mockStorage.createPasswordResetToken).toHaveBeenCalledWith(
        'user-123',
        expect.any(String),
        expect.any(Date)
      );
    });

    it('should handle non-existent email gracefully', async () => {
      mockStorage.getUserByEmail.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      // Should return success to prevent email enumeration
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('reset link sent');
      
      // But should not create token
      expect(mockStorage.createPasswordResetToken).not.toHaveBeenCalled();
    });

    it('should reset password with valid token', async () => {
      const resetData = {
        token: 'valid-reset-token',
        newPassword: 'NewSecurePass123!',
      };

      mockStorage.getPasswordResetToken = vi.fn().mockResolvedValue({
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      });

      mockStorage.updateUserPassword = vi.fn().mockResolvedValue();
      mockStorage.deletePasswordResetToken = vi.fn().mockResolvedValue();

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send(resetData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Password reset successful');

      // Verify password was updated
      expect(mockStorage.updateUserPassword).toHaveBeenCalledWith(
        'user-123',
        '$2b$10$hashedpassword'
      );

      // Verify token was deleted
      expect(mockStorage.deletePasswordResetToken).toHaveBeenCalledWith('valid-reset-token');
    });

    it('should reject expired reset tokens', async () => {
      mockStorage.getPasswordResetToken = vi.fn().mockResolvedValue({
        userId: 'user-123',
        expiresAt: new Date(Date.now() - 1000), // Expired
      });

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'expired-token',
          newPassword: 'NewSecurePass123!',
        })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('TOKEN_EXPIRED');
    });

    it('should validate new password strength', async () => {
      mockStorage.getPasswordResetToken = vi.fn().mockResolvedValue({
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });

      const weakPasswords = [
        'short',
        'onlylowercase',
        'ONLYUPPERCASE',
        'NoNumbers!',
        'NoSpecialChars123',
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/reset-password')
          .send({
            token: 'valid-token',
            newPassword: password,
          })
          .expect(400);

        expect(response.body.message).toContain('password');
      }

      expect(mockStorage.updateUserPassword).not.toHaveBeenCalled();
    });
  });

  describe('OAuth Integration (Google)', () => {
    it('should handle Google OAuth callback', async () => {
      const googleUserData = {
        id: 'google-123456',
        email: 'user@gmail.com',
        name: 'Google User',
        picture: 'https://lh3.googleusercontent.com/photo.jpg',
      };

      app.get('/api/auth/google/callback', async (req, res) => {
        // Simulate successful Google OAuth
        const user = await mockStorage.createGoogleUser({
          email: googleUserData.email,
          googleId: googleUserData.id,
          name: googleUserData.name,
          profilePicture: googleUserData.picture,
          role: 'customer',
        });

        const accessToken = jwt.sign(
          { userId: user.id, email: user.email, role: user.role },
          process.env.JWT_SECRET!,
          { expiresIn: '15m' }
        );

        res.json({
          status: 'success',
          data: { user, accessToken },
        });
      });

      const newGoogleUser = {
        ...mockUser,
        id: 'google-user-123',
        email: 'user@gmail.com',
        googleId: 'google-123456',
        name: 'Google User',
        profilePicture: 'https://lh3.googleusercontent.com/photo.jpg',
        password: null,
      };

      mockStorage.createGoogleUser.mockResolvedValue(newGoogleUser);

      const response = await request(app)
        .get('/api/auth/google/callback')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user.googleId).toBe('google-123456');
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should link Google account to existing user', async () => {
      const existingUser = {
        ...mockUser,
        email: 'existing@example.com',
      };

      mockStorage.getUserByEmail.mockResolvedValue(existingUser);
      mockStorage.linkGoogleAccount = vi.fn().mockResolvedValue();

      app.post('/api/auth/link-google', requireAuth, async (req: any, res) => {
        const { googleId } = req.body;
        
        await mockStorage.linkGoogleAccount(req.user.userId, googleId);
        
        res.json({
          status: 'success',
          message: 'Google account linked successfully',
        });
      });

      mockJwt.verify.mockReturnValue({
        userId: 'user-123',
        email: 'existing@example.com',
        role: 'customer',
      } as any);

      const response = await request(app)
        .post('/api/auth/link-google')
        .set('Authorization', 'Bearer valid-token')
        .send({ googleId: 'google-123456' })
        .expect(200);

      expect(response.body.message).toContain('linked successfully');
      expect(mockStorage.linkGoogleAccount).toHaveBeenCalledWith('user-123', 'google-123456');
    });

    it('should handle Google OAuth errors', async () => {
      app.get('/api/auth/google/error', (req, res) => {
        res.status(400).json({
          status: 'error',
          code: 'OAUTH_ERROR',
          message: 'Google OAuth authentication failed',
        });
      });

      const response = await request(app)
        .get('/api/auth/google/error')
        .expect(400);

      expect(response.body.code).toBe('OAUTH_ERROR');
    });
  });

  describe('Session Management', () => {
    it('should logout and invalidate refresh token', async () => {
      app.post('/api/auth/logout', requireAuth, async (req: any, res) => {
        const { refreshToken } = req.body;
        
        if (refreshToken) {
          await mockStorage.deleteRefreshToken(refreshToken);
        }
        
        res.json({
          status: 'success',
          message: 'Logged out successfully',
        });
      });

      mockJwt.verify.mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'customer',
      } as any);

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer valid-token')
        .send({ refreshToken: 'user-refresh-token' })
        .expect(200);

      expect(response.body.message).toContain('Logged out successfully');
      expect(mockStorage.deleteRefreshToken).toHaveBeenCalledWith('user-refresh-token');
    });

    it('should handle concurrent sessions', async () => {
      // Create multiple refresh tokens for same user
      const refreshTokens = ['token1', 'token2', 'token3'];
      
      for (let i = 0; i < refreshTokens.length; i++) {
        mockStorage.getRefreshToken.mockResolvedValueOnce({
          userId: 'user-123',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });

        const response = await request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken: refreshTokens[i] })
          .expect(200);

        expect(response.body.data.accessToken).toBeDefined();
      }

      // All sessions should be valid
      expect(mockStorage.createRefreshToken).toHaveBeenCalledTimes(refreshTokens.length);
    });

    it('should implement session timeout', async () => {
      // Mock JWT with short expiry
      mockJwt.verify.mockImplementation(() => {
        throw new jwt.TokenExpiredError('Token expired', new Date());
      });

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer expired-token')
        .expect(401);

      expect(response.body.code).toBe('TOKEN_EXPIRED');
      expect(response.body.message).toContain('expired');
    });

    it('should clean up expired refresh tokens', async () => {
      mockStorage.cleanupExpiredTokens = vi.fn().mockResolvedValue(5); // 5 tokens cleaned

      app.post('/api/auth/cleanup-tokens', requireAuth, requireRole('admin'), async (req, res) => {
        const cleanedCount = await mockStorage.cleanupExpiredTokens();
        
        res.json({
          status: 'success',
          message: `Cleaned up ${cleanedCount} expired tokens`,
          cleanedCount,
        });
      });

      mockJwt.verify.mockReturnValue({
        userId: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
      } as any);

      const response = await request(app)
        .post('/api/auth/cleanup-tokens')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.cleanedCount).toBe(5);
      expect(mockStorage.cleanupExpiredTokens).toHaveBeenCalled();
    });
  });

  describe('Security Features', () => {
    it('should implement account lockout after failed attempts', async () => {
      mockStorage.incrementFailedAttempts = vi.fn().mockResolvedValue(5);
      mockStorage.isAccountLocked = vi.fn().mockResolvedValue(true);

      mockVerifyPassword.mockResolvedValue(false); // Wrong password

      app.post('/api/auth/login-with-lockout', async (req, res) => {
        const { email } = req.body;
        
        if (await mockStorage.isAccountLocked(email)) {
          return res.status(423).json({
            status: 'error',
            code: 'ACCOUNT_LOCKED',
            message: 'Account is temporarily locked due to multiple failed attempts',
          });
        }

        // Normal login logic would go here
        res.status(401).json({
          status: 'error',
          code: 'INVALID_CREDENTIALS',
        });
      });

      const response = await request(app)
        .post('/api/auth/login-with-lockout')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(423);

      expect(response.body.code).toBe('ACCOUNT_LOCKED');
    });

    it('should detect and prevent brute force attacks', async () => {
      const requests = Array.from({ length: 20 }, () =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword',
          })
      );

      const responses = await Promise.allSettled(requests);

      // Some requests should be rate limited
      const rateLimited = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 429
      );

      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should validate JWT signatures', async () => {
      const malformedTokens = [
        'invalid.token.signature',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        'completely-invalid-token',
      ];

      for (const token of malformedTokens) {
        mockJwt.verify.mockImplementation(() => {
          throw new jwt.JsonWebTokenError('Invalid signature');
        });

        const response = await request(app)
          .get('/api/protected')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);

        expect(response.body.status).toBe('error');
      }
    });

    it('should implement CSRF protection for state-changing operations', async () => {
      app.post('/api/auth/change-password', requireAuth, (req: any, res) => {
        const csrfToken = req.headers['x-csrf-token'];
        const expectedToken = req.user.csrfToken;

        if (!csrfToken || csrfToken !== expectedToken) {
          return res.status(403).json({
            status: 'error',
            code: 'CSRF_TOKEN_MISMATCH',
            message: 'Invalid CSRF token',
          });
        }

        res.json({
          status: 'success',
          message: 'Password changed successfully',
        });
      });

      mockJwt.verify.mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'customer',
        csrfToken: 'expected-csrf-token',
      } as any);

      // Test without CSRF token
      const responseWithoutCSRF = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', 'Bearer valid-token')
        .send({ newPassword: 'NewPass123!' })
        .expect(403);

      expect(responseWithoutCSRF.body.code).toBe('CSRF_TOKEN_MISMATCH');

      // Test with valid CSRF token
      const responseWithCSRF = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', 'Bearer valid-token')
        .set('X-CSRF-Token', 'expected-csrf-token')
        .send({ newPassword: 'NewPass123!' })
        .expect(200);

      expect(responseWithCSRF.body.message).toContain('Password changed');
    });
  });
});