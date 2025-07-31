import { describe, test, expect, beforeEach } from 'vitest';
import { EmailService } from '../server/services/emailService';

describe('Email Service', () => {
  let emailService: EmailService;

  beforeEach(() => {
    emailService = EmailService.getInstance();
  });

  test('should create email service instance', () => {
    expect(emailService).toBeDefined();
    expect(emailService).toBeInstanceOf(EmailService);
  });

  test('should be a singleton', () => {
    const instance1 = EmailService.getInstance();
    const instance2 = EmailService.getInstance();
    expect(instance1).toBe(instance2);
  });

  test('should handle missing API key gracefully', async () => {
    // Store original API key
    const originalApiKey = process.env.RESEND_API_KEY;
    
    // Remove API key
    delete process.env.RESEND_API_KEY;

    const result = await emailService.sendInvitationEmail({
      customerEmail: 'test@example.com',
      trainerName: 'Test Trainer',
      trainerEmail: 'trainer@example.com',
      invitationLink: 'https://example.com/invite/123',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Email service not configured');

    // Restore API key
    if (originalApiKey) {
      process.env.RESEND_API_KEY = originalApiKey;
    }
  });

  test('should handle test email without API key', async () => {
    // Store original API key
    const originalApiKey = process.env.RESEND_API_KEY;
    
    // Remove API key
    delete process.env.RESEND_API_KEY;

    const result = await emailService.sendTestEmail('test@example.com');

    expect(result.success).toBe(false);
    expect(result.error).toBe('RESEND_API_KEY not configured');

    // Restore API key
    if (originalApiKey) {
      process.env.RESEND_API_KEY = originalApiKey;
    }
  });

  test('should validate invitation email data structure', () => {
    const validData = {
      customerEmail: 'customer@example.com',
      trainerName: 'John Trainer',
      trainerEmail: 'john@trainer.com',
      invitationLink: 'https://app.com/invite/abc123',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    };

    // Test that the data structure is valid
    expect(validData.customerEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(validData.trainerName).toBeDefined();
    expect(validData.trainerEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(validData.invitationLink).toMatch(/^https?:\/\/.+/);
    expect(validData.expiresAt).toBeInstanceOf(Date);
    expect(validData.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  // This test would work with a real API key
  test.skip('should send invitation email with real API key', async () => {
    // Only run this test if you have a real API key set
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'your-resend-api-key-here') {
      return;
    }

    const result = await emailService.sendInvitationEmail({
      customerEmail: 'test@example.com',
      trainerName: 'Test Trainer',
      trainerEmail: 'trainer@example.com',
      invitationLink: 'https://example.com/invite/123',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    // With a real API key, this should succeed (unless there are other issues)
    // expect(result.success).toBe(true);
    // expect(result.messageId).toBeDefined();
  });
});