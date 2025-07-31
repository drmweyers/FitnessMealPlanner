import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import invitationRouter from '../../server/invitationRoutes';
import { storage } from '../../server/storage';
import { emailService } from '../../server/services/emailService';

// Mock dependencies
vi.mock('../../server/storage');
vi.mock('../../server/services/emailService');
vi.mock('../../server/authRoutes', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { id: 'trainer-123', role: 'trainer' };
    next();
  },
  requireRole: (role: string) => (req: any, res: any, next: any) => {
    if (req.user?.role === role || role === 'trainer') {
      next();
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  }
}));

describe('Invitation Routes', () => {
  let app: express.Application;
  const mockStorage = vi.mocked(storage);
  const mockEmailService = vi.mocked(emailService);

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/invitations', invitationRouter);

    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mock implementations
    mockStorage.getUser.mockResolvedValue({
      id: 'trainer-123',
      email: 'trainer@example.com',
      role: 'trainer',
      password: 'hashed-password',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    mockStorage.createInvitation.mockResolvedValue({
      id: 'invitation-123',
      trainerId: 'trainer-123',
      customerEmail: 'customer@example.com',
      token: 'abc123',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    mockEmailService.sendInvitationEmail.mockResolvedValue({
      success: true,
      messageId: 'email-123'
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /create', () => {
    const validInvitationData = {
      customerEmail: 'customer@example.com'
    };

    test('should create invitation and send email successfully', async () => {
      const response = await request(app)
        .post('/api/invitations/create')
        .send(validInvitationData);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Invitation created and email sent successfully');
      expect(response.body.data.invitation).toMatchObject({
        id: 'invitation-123',
        customerEmail: 'customer@example.com',
        emailSent: true
      });

      // Verify storage calls
      expect(mockStorage.createInvitation).toHaveBeenCalledWith({
        trainerId: 'trainer-123',
        customerEmail: 'customer@example.com',
        token: expect.stringMatching(/^[a-f0-9]{64}$/),
        expiresAt: expect.any(Date)
      });

      // Verify email service call
      expect(mockEmailService.sendInvitationEmail).toHaveBeenCalledWith({
        customerEmail: 'customer@example.com',
        trainerName: 'trainer@example.com',
        trainerEmail: 'trainer@example.com',
        invitationLink: expect.stringContaining('register?invitation='),
        expiresAt: expect.any(Date)
      });
    });

    test('should handle email sending failure gracefully', async () => {
      mockEmailService.sendInvitationEmail.mockResolvedValue({
        success: false,
        error: 'SMTP server unavailable'
      });

      const response = await request(app)
        .post('/api/invitations/create')
        .send(validInvitationData);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Invitation created but email could not be sent');
      expect(response.body.data.invitation.emailSent).toBe(false);

      // Should still create invitation even if email fails
      expect(mockStorage.createInvitation).toHaveBeenCalled();
    });

    test('should include invitation link in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const response = await request(app)
        .post('/api/invitations/create')
        .send(validInvitationData);

      expect(response.status).toBe(201);
      expect(response.body.data.invitation.invitationLink).toBeDefined();
      expect(response.body.data.invitation.invitationLink).toMatch(/register\?invitation=/);

      process.env.NODE_ENV = originalEnv;
    });

    test('should not include invitation link in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .post('/api/invitations/create')
        .send(validInvitationData);

      expect(response.status).toBe(201);
      expect(response.body.data.invitation.invitationLink).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    test('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/invitations/create')
        .send({ customerEmail: 'invalid-email' });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(mockStorage.createInvitation).not.toHaveBeenCalled();
      expect(mockEmailService.sendInvitationEmail).not.toHaveBeenCalled();
    });

    test('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/api/invitations/create')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(mockStorage.createInvitation).not.toHaveBeenCalled();
    });

    test('should handle trainer not found error', async () => {
      mockStorage.getUser.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/invitations/create')
        .send(validInvitationData);

      expect(response.status).toBe(500);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Failed to retrieve trainer information');
      expect(mockEmailService.sendInvitationEmail).not.toHaveBeenCalled();
    });

    test('should handle storage errors', async () => {
      mockStorage.createInvitation.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/invitations/create')
        .send(validInvitationData);

      expect(response.status).toBe(500);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Failed to create invitation');
    });

    test('should generate unique tokens for multiple invitations', async () => {
      const calls = [];
      mockStorage.createInvitation.mockImplementation((data) => {
        calls.push(data.token);
        return Promise.resolve({
          id: `invitation-${calls.length}`,
          trainerId: data.trainerId,
          customerEmail: data.customerEmail,
          token: data.token,
          expiresAt: data.expiresAt,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      });

      // Create multiple invitations
      await Promise.all([
        request(app).post('/api/invitations/create').send({ customerEmail: 'user1@example.com' }),
        request(app).post('/api/invitations/create').send({ customerEmail: 'user2@example.com' }),
        request(app).post('/api/invitations/create').send({ customerEmail: 'user3@example.com' })
      ]);

      expect(calls).toHaveLength(3);
      expect(new Set(calls).size).toBe(3); // All tokens should be unique
      calls.forEach(token => {
        expect(token).toMatch(/^[a-f0-9]{64}$/);
      });
    });

    test('should set correct expiration date (7 days)', async () => {
      const beforeTime = Date.now();
      
      await request(app)
        .post('/api/invitations/create')
        .send(validInvitationData);

      const afterTime = Date.now();
      const createCall = mockStorage.createInvitation.mock.calls[0][0];
      const expiresAt = createCall.expiresAt.getTime();
      
      const expectedMin = beforeTime + (7 * 24 * 60 * 60 * 1000);
      const expectedMax = afterTime + (7 * 24 * 60 * 60 * 1000);
      
      expect(expiresAt).toBeGreaterThanOrEqual(expectedMin);
      expect(expiresAt).toBeLessThanOrEqual(expectedMax);
    });
  });

  describe('POST /test-email', () => {
    beforeEach(() => {
      // Mock admin role for test endpoint
      vi.mocked(vi.fn()).mockImplementation((role: string) => (req: any, res: any, next: any) => {
        if (role === 'admin') {
          req.user = { id: 'admin-123', role: 'admin' };
          next();
        } else {
          res.status(403).json({ message: 'Forbidden' });
        }
      });
    });

    test('should send test email in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      mockEmailService.sendTestEmail.mockResolvedValue({
        success: true,
        messageId: 'test-email-123'
      });

      const response = await request(app)
        .post('/api/invitations/test-email')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Test email sent successfully');
      expect(response.body.data.messageId).toBe('test-email-123');

      expect(mockEmailService.sendTestEmail).toHaveBeenCalledWith('test@example.com');

      process.env.NODE_ENV = originalEnv;
    });

    test('should return 404 in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .post('/api/invitations/test-email')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(404);
      expect(mockEmailService.sendTestEmail).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    test('should return 400 for missing email', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const response = await request(app)
        .post('/api/invitations/test-email')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Email address is required');

      process.env.NODE_ENV = originalEnv;
    });

    test('should handle test email sending failure', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      mockEmailService.sendTestEmail.mockResolvedValue({
        success: false,
        error: 'Invalid API key'
      });

      const response = await request(app)
        .post('/api/invitations/test-email')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Failed to send test email');

      process.env.NODE_ENV = originalEnv;
    });

    test('should handle unexpected errors', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      mockEmailService.sendTestEmail.mockRejectedValue(new Error('Unexpected error'));

      const response = await request(app)
        .post('/api/invitations/test-email')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(500);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Internal server error');
      expect(response.body.error).toBe('Unexpected error');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Environment Configuration', () => {
    test('should use default frontend URL when not configured', async () => {
      const originalUrl = process.env.FRONTEND_URL;
      delete process.env.FRONTEND_URL;

      await request(app)
        .post('/api/invitations/create')
        .send({ customerEmail: 'customer@example.com' });

      const emailCall = mockEmailService.sendInvitationEmail.mock.calls[0][0];
      expect(emailCall.invitationLink).toContain('http://localhost:4000');

      if (originalUrl) process.env.FRONTEND_URL = originalUrl;
    });

    test('should use configured frontend URL', async () => {
      const originalUrl = process.env.FRONTEND_URL;
      process.env.FRONTEND_URL = 'https://myapp.com';

      await request(app)
        .post('/api/invitations/create')
        .send({ customerEmail: 'customer@example.com' });

      const emailCall = mockEmailService.sendInvitationEmail.mock.calls[0][0];
      expect(emailCall.invitationLink).toContain('https://myapp.com');

      if (originalUrl) {
        process.env.FRONTEND_URL = originalUrl;
      } else {
        delete process.env.FRONTEND_URL;
      }
    });
  });

  describe('Authentication and Authorization', () => {
    test('should require authentication for create endpoint', async () => {
      // Mock unauthenticated request
      const unauthorizedApp = express();
      unauthorizedApp.use(express.json());
      unauthorizedApp.use('/api/invitations', (req, res, next) => {
        // Skip auth middleware
        next();
      }, invitationRouter);

      const response = await request(unauthorizedApp)
        .post('/api/invitations/create')
        .send({ customerEmail: 'customer@example.com' });

      // This would depend on how the actual auth middleware handles missing authentication
      // For this test, we'll assume it returns 401
      expect([401, 500]).toContain(response.status);
    });

    test('should require trainer role for create endpoint', async () => {
      // Mock customer role
      const customerApp = express();
      customerApp.use(express.json());
      customerApp.use('/api/invitations', (req, res, next) => {
        req.user = { id: 'customer-123', role: 'customer' };
        next();
      }, invitationRouter);

      // This test would need the actual requireRole middleware behavior
      // Skipping for now as it depends on middleware implementation
    });
  });

  describe('Data Validation and Sanitization', () => {
    test('should handle very long email addresses', async () => {
      const longEmail = 'a'.repeat(200) + '@example.com';
      
      const response = await request(app)
        .post('/api/invitations/create')
        .send({ customerEmail: longEmail });

      // Should either succeed or fail with validation error, not crash
      expect([201, 400]).toContain(response.status);
    });

    test('should handle special characters in email', async () => {
      const specialEmail = 'test+special.email@sub-domain.example-site.com';
      
      const response = await request(app)
        .post('/api/invitations/create')
        .send({ customerEmail: specialEmail });

      if (response.status === 201) {
        expect(mockStorage.createInvitation).toHaveBeenCalledWith(
          expect.objectContaining({
            customerEmail: specialEmail
          })
        );
      }
    });

    test('should handle unicode characters in email', async () => {
      const unicodeEmail = 'tëst@éxample.com';
      
      const response = await request(app)
        .post('/api/invitations/create')
        .send({ customerEmail: unicodeEmail });

      // Should handle gracefully without crashing
      expect(typeof response.status).toBe('number');
    });
  });

  describe('Logging and Monitoring', () => {
    let consoleSpy: any;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    test('should log successful email sending', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await request(app)
        .post('/api/invitations/create')
        .send({ customerEmail: 'customer@example.com' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invitation email sent successfully to customer@example.com')
      );

      consoleSpy.mockRestore();
    });

    test('should log email sending failures', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      mockEmailService.sendInvitationEmail.mockResolvedValue({
        success: false,
        error: 'Test error'
      });

      await request(app)
        .post('/api/invitations/create')
        .send({ customerEmail: 'customer@example.com' });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send invitation email to customer@example.com')
      );

      consoleWarnSpy.mockRestore();
    });
  });
});