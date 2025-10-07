import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import invitationRouter from '../../server/invitationRoutes';
import { storage } from '../../server/storage';
import { emailService } from '../../server/services/emailService';

// Mock dependencies
vi.mock('../../server/storage');
vi.mock('../../server/services/emailService');
vi.mock('../../server/middleware/auth', () => ({
  requireAuth: vi.fn((req, res, next) => {
    req.user = { id: 'trainer123', email: 'trainer@example.com', role: 'trainer' };
    next();
  }),
  requireRole: vi.fn((role) => (req, res, next) => next())
}));

describe('Invitation URL Generation', () => {
  let app: express.Application;
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
    
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/invitations', invitationRouter);

    // Mock storage responses
    vi.mocked(storage.getUserByEmail).mockResolvedValue(null);
    vi.mocked(storage.getInvitationsByTrainer).mockResolvedValue([]);
    vi.mocked(storage.createInvitation).mockResolvedValue({
      id: 'inv123',
      trainerId: 'trainer123',
      customerEmail: 'customer@example.com',
      token: 'test-token-123',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      usedAt: null
    });
    vi.mocked(storage.getUser).mockResolvedValue({
      id: 'trainer123',
      email: 'trainer@example.com',
      password: 'hashed',
      role: 'trainer',
      createdAt: new Date()
    });

    // Mock email service
    vi.mocked(emailService.sendInvitationEmail).mockImplementation(async (params) => {
      // Capture the invitation link for testing
      return { 
        success: true, 
        messageId: 'msg123',
        invitationLink: params.invitationLink // Store for verification
      };
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it('should use production URL (evofitmeals.com) when NODE_ENV is production', async () => {
    // Set environment to production
    process.env.NODE_ENV = 'production';

    const response = await request(app)
      .post('/api/invitations/send')
      .send({
        customerEmail: 'customer@example.com',
        message: 'Welcome to EvoFit!'
      });

    expect(response.status).toBe(201);
    
    // Verify the email service was called with the correct URL
    const emailCall = vi.mocked(emailService.sendInvitationEmail).mock.calls[0][0];
    expect(emailCall.invitationLink).toContain('https://evofitmeals.com/register?invitation=');
    expect(emailCall.invitationLink).not.toContain('localhost');
    
    console.log('✅ Production URL test passed:', emailCall.invitationLink);
  });

  it('should use localhost URL when NODE_ENV is development', async () => {
    // Set environment to development
    process.env.NODE_ENV = 'development';
    delete process.env.FRONTEND_URL;

    const response = await request(app)
      .post('/api/invitations/send')
      .send({
        customerEmail: 'customer@example.com',
        message: 'Welcome to EvoFit!'
      });

    expect(response.status).toBe(201);
    
    // Verify the email service was called with localhost URL
    const emailCall = vi.mocked(emailService.sendInvitationEmail).mock.calls[0][0];
    expect(emailCall.invitationLink).toContain('http://localhost:4000/register?invitation=');
    expect(emailCall.invitationLink).not.toContain('evofitmeals.com');
    
    console.log('✅ Development URL test passed:', emailCall.invitationLink);
  });

  it('should use FRONTEND_URL when provided', async () => {
    // Set custom FRONTEND_URL
    process.env.NODE_ENV = 'development';
    process.env.FRONTEND_URL = 'https://staging.evofitmeals.com';

    const response = await request(app)
      .post('/api/invitations/send')
      .send({
        customerEmail: 'customer@example.com',
        message: 'Welcome to EvoFit!'
      });

    expect(response.status).toBe(201);
    
    // Verify the email service was called with custom URL
    const emailCall = vi.mocked(emailService.sendInvitationEmail).mock.calls[0][0];
    expect(emailCall.invitationLink).toContain('https://staging.evofitmeals.com/register?invitation=');
    
    console.log('✅ Custom FRONTEND_URL test passed:', emailCall.invitationLink);
  });

  it('should include a valid invitation token in the URL', async () => {
    process.env.NODE_ENV = 'production';

    const response = await request(app)
      .post('/api/invitations/send')
      .send({
        customerEmail: 'customer@example.com',
        message: 'Welcome to EvoFit!'
      });

    expect(response.status).toBe(201);
    
    // Verify the token is included and has correct format
    const emailCall = vi.mocked(emailService.sendInvitationEmail).mock.calls[0][0];
    expect(emailCall.invitationLink).toMatch(/^https:\/\/evofitmeals\.com\/register\?invitation=[a-f0-9]{64}$/);
    
    console.log('✅ Token inclusion test passed:', emailCall.invitationLink);
  });
});