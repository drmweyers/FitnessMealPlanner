import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { EmailService, type InvitationEmailData } from '../../server/services/emailService';

// Mock Resend module
vi.mock('resend', () => {
  const mockSend = vi.fn();
  const mockResend = vi.fn().mockImplementation(() => ({
    emails: {
      send: mockSend
    }
  }));
  return {
    Resend: mockResend,
    __mockSend: mockSend
  };
});

// Import the mock after setting up the mock
const { __mockSend: mockSend } = await import('resend');

describe('EmailService', () => {
  let emailService: EmailService;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...process.env };
    
    // Reset mocks
    vi.clearAllMocks();
    
    // Get fresh instance
    emailService = EmailService.getInstance();
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
  });

  describe('Singleton Pattern', () => {
    test('should return the same instance', () => {
      const instance1 = EmailService.getInstance();
      const instance2 = EmailService.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(EmailService);
    });
  });

  describe('Environment Configuration', () => {
    test('should handle missing RESEND_API_KEY gracefully', async () => {
      delete process.env.RESEND_API_KEY;
      
      const testData: InvitationEmailData = {
        customerEmail: 'customer@example.com',
        trainerName: 'John Trainer',
        trainerEmail: 'john@trainer.com',
        invitationLink: 'https://app.com/invite/123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      const result = await emailService.sendInvitationEmail(testData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email service not configured');
      expect(mockSend).not.toHaveBeenCalled();
    });

    test('should use default FROM_EMAIL when not configured', async () => {
      process.env.RESEND_API_KEY = 'test-key';
      delete process.env.FROM_EMAIL;
      
      mockSend.mockResolvedValue({ data: { id: 'test-id' }, error: null });

      const testData: InvitationEmailData = {
        customerEmail: 'customer@example.com',
        trainerName: 'John Trainer',
        trainerEmail: 'john@trainer.com',
        invitationLink: 'https://app.com/invite/123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      await emailService.sendInvitationEmail(testData);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'EvoFitMeals <noreply@evofitmeals.com>'
        })
      );
    });

    test('should use configured FROM_EMAIL', async () => {
      process.env.RESEND_API_KEY = 'test-key';
      process.env.FROM_EMAIL = 'Custom <custom@example.com>';
      
      mockSend.mockResolvedValue({ data: { id: 'test-id' }, error: null });

      const testData: InvitationEmailData = {
        customerEmail: 'customer@example.com',
        trainerName: 'John Trainer',
        trainerEmail: 'john@trainer.com',
        invitationLink: 'https://app.com/invite/123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      await emailService.sendInvitationEmail(testData);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'Custom <custom@example.com>'
        })
      );
    });
  });

  describe('sendInvitationEmail', () => {
    beforeEach(() => {
      process.env.RESEND_API_KEY = 'test-key';
      process.env.FROM_EMAIL = 'Test <test@example.com>';
    });

    const validInvitationData: InvitationEmailData = {
      customerEmail: 'customer@example.com',
      trainerName: 'John Trainer',
      trainerEmail: 'john@trainer.com',
      invitationLink: 'https://app.com/invite/abc123',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    };

    test('should send invitation email successfully', async () => {
      const mockMessageId = 'message-123';
      mockSend.mockResolvedValue({ 
        data: { id: mockMessageId }, 
        error: null 
      });

      const result = await emailService.sendInvitationEmail(validInvitationData);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe(mockMessageId);
      expect(result.error).toBeUndefined();

      expect(mockSend).toHaveBeenCalledWith({
        from: 'Test <test@example.com>',
        to: ['customer@example.com'],
        subject: "You're invited to join John Trainer's meal planning program",
        html: expect.stringContaining('John Trainer'),
        text: expect.stringContaining('John Trainer')
      });
    });

    test('should handle Resend API errors', async () => {
      const mockError = { message: 'API rate limit exceeded' };
      mockSend.mockResolvedValue({ 
        data: null, 
        error: mockError 
      });

      const result = await emailService.sendInvitationEmail(validInvitationData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('API rate limit exceeded');
      expect(result.messageId).toBeUndefined();
    });

    test('should handle network/connection errors', async () => {
      const networkError = new Error('Network connection failed');
      mockSend.mockRejectedValue(networkError);

      const result = await emailService.sendInvitationEmail(validInvitationData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network connection failed');
      expect(result.messageId).toBeUndefined();
    });

    test('should handle unknown errors', async () => {
      mockSend.mockRejectedValue('Unknown error type');

      const result = await emailService.sendInvitationEmail(validInvitationData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
      expect(result.messageId).toBeUndefined();
    });

    test('should include all required email fields', async () => {
      mockSend.mockResolvedValue({ data: { id: 'test-id' }, error: null });

      await emailService.sendInvitationEmail(validInvitationData);

      const emailCall = mockSend.mock.calls[0][0];
      
      expect(emailCall).toMatchObject({
        from: expect.stringMatching(/.+@.+\..+/),
        to: ['customer@example.com'],
        subject: expect.stringContaining('invited'),
        html: expect.stringMatching(/<html/i),
        text: expect.stringContaining('John Trainer')
      });
    });

    test('should format expiration date correctly', async () => {
      mockSend.mockResolvedValue({ data: { id: 'test-id' }, error: null });

      const futureDate = new Date('2025-12-25T12:00:00Z');
      const testData = {
        ...validInvitationData,
        expiresAt: futureDate
      };

      await emailService.sendInvitationEmail(testData);

      const emailCall = mockSend.mock.calls[0][0];
      
      expect(emailCall.html).toContain('December');
      expect(emailCall.html).toContain('25');
      expect(emailCall.html).toContain('2025');
      expect(emailCall.text).toContain('December');
    });
  });

  describe('sendTestEmail', () => {
    beforeEach(() => {
      process.env.FROM_EMAIL = 'Test <test@example.com>';
    });

    test('should send test email with API key', async () => {
      process.env.RESEND_API_KEY = 'test-key';
      const mockMessageId = 'test-message-123';
      mockSend.mockResolvedValue({ 
        data: { id: mockMessageId }, 
        error: null 
      });

      const result = await emailService.sendTestEmail('test@example.com');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe(mockMessageId);

      expect(mockSend).toHaveBeenCalledWith({
        from: 'Test <test@example.com>',
        to: ['test@example.com'],
        subject: 'EvoFitMeals Email Test',
        html: expect.stringContaining('Email Service Test'),
        text: expect.stringContaining('Email Service Test')
      });
    });

    test('should fail without API key', async () => {
      delete process.env.RESEND_API_KEY;

      const result = await emailService.sendTestEmail('test@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('RESEND_API_KEY not configured');
      expect(mockSend).not.toHaveBeenCalled();
    });

    test('should include timestamp in test email', async () => {
      process.env.RESEND_API_KEY = 'test-key';
      mockSend.mockResolvedValue({ data: { id: 'test-id' }, error: null });

      await emailService.sendTestEmail('test@example.com');

      const emailCall = mockSend.mock.calls[0][0];
      
      expect(emailCall.html).toMatch(/Timestamp: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(emailCall.text).toMatch(/Timestamp: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    test('should handle test email API errors', async () => {
      process.env.RESEND_API_KEY = 'test-key';
      const mockError = { message: 'Invalid recipient' };
      mockSend.mockResolvedValue({ 
        data: null, 
        error: mockError 
      });

      const result = await emailService.sendTestEmail('invalid-email');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid recipient');
    });
  });

  describe('Email Template Generation', () => {
    beforeEach(() => {
      process.env.RESEND_API_KEY = 'test-key';
      process.env.FROM_EMAIL = 'Test <test@example.com>';
    });

    test('should generate HTML template with all required elements', async () => {
      mockSend.mockResolvedValue({ data: { id: 'test-id' }, error: null });

      const testData: InvitationEmailData = {
        customerEmail: 'customer@example.com',
        trainerName: 'Jane Smith',
        trainerEmail: 'jane@fitness.com',
        invitationLink: 'https://app.com/invite/xyz789',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      await emailService.sendInvitationEmail(testData);

      const emailCall = mockSend.mock.calls[0][0];
      const htmlContent = emailCall.html;

      // Check essential HTML elements
      expect(htmlContent).toContain('<!DOCTYPE html');
      expect(htmlContent).toContain('<html lang="en">');
      expect(htmlContent).toContain('EvoFitMeals');
      expect(htmlContent).toContain('Jane Smith');
      expect(htmlContent).toContain('jane@fitness.com');
      expect(htmlContent).toContain(testData.invitationLink);
      
      // Check styling
      expect(htmlContent).toContain('font-family:');
      expect(htmlContent).toContain('background:');
      expect(htmlContent).toContain('color:');
      
      // Check CTA button
      expect(htmlContent).toContain('Accept Invitation');
      expect(htmlContent).toContain('href="https://app.com/invite/xyz789"');
      
      // Check branding
      expect(htmlContent).toContain('🏋️');
      expect(htmlContent).toContain('&copy; 2025 EvoFitMeals');
    });

    test('should generate plain text template with all required elements', async () => {
      mockSend.mockResolvedValue({ data: { id: 'test-id' }, error: null });

      const testData: InvitationEmailData = {
        customerEmail: 'customer@example.com',
        trainerName: 'Jane Smith',
        trainerEmail: 'jane@fitness.com',
        invitationLink: 'https://app.com/invite/xyz789',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      await emailService.sendInvitationEmail(testData);

      const emailCall = mockSend.mock.calls[0][0];
      const textContent = emailCall.text;

      // Check essential text elements
      expect(textContent).toContain('EvoFitMeals');
      expect(textContent).toContain('Jane Smith');
      expect(textContent).toContain('jane@fitness.com');
      expect(textContent).toContain(testData.invitationLink);
      expect(textContent).toContain('Personalized meal plans');
      expect(textContent).toContain('© 2025 EvoFitMeals');
      
      // Check structure
      expect(textContent).toContain('Your Trainer:');
      expect(textContent).toContain('- Name: Jane Smith');
      expect(textContent).toContain('- Email: jane@fitness.com');
    });

    test('should handle special characters in trainer names', async () => {
      mockSend.mockResolvedValue({ data: { id: 'test-id' }, error: null });

      const testData: InvitationEmailData = {
        customerEmail: 'customer@example.com',
        trainerName: 'José María García-López',
        trainerEmail: 'jose@fitness.com',
        invitationLink: 'https://app.com/invite/special123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      await emailService.sendInvitationEmail(testData);

      const emailCall = mockSend.mock.calls[0][0];
      
      expect(emailCall.html).toContain('José María García-López');
      expect(emailCall.text).toContain('José María García-López');
      expect(emailCall.subject).toContain('José María García-López');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach(() => {
      process.env.RESEND_API_KEY = 'test-key';
      process.env.FROM_EMAIL = 'Test <test@example.com>';
    });

    test('should handle malformed invitation data gracefully', async () => {
      mockSend.mockResolvedValue({ data: { id: 'test-id' }, error: null });

      const malformedData = {
        customerEmail: '',
        trainerName: null,
        trainerEmail: undefined,
        invitationLink: 'not-a-url',
        expiresAt: new Date('invalid-date')
      } as any;

      const result = await emailService.sendInvitationEmail(malformedData);

      // Should not crash, but may return error depending on Resend validation
      expect(typeof result.success).toBe('boolean');
      expect(result).toHaveProperty('success');
    });

    test('should handle very long trainer names', async () => {
      mockSend.mockResolvedValue({ data: { id: 'test-id' }, error: null });

      const longName = 'A'.repeat(200);
      const testData: InvitationEmailData = {
        customerEmail: 'customer@example.com',
        trainerName: longName,
        trainerEmail: 'trainer@example.com',
        invitationLink: 'https://app.com/invite/long123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      const result = await emailService.sendInvitationEmail(testData);

      expect(result.success).toBe(true);
      
      const emailCall = mockSend.mock.calls[0][0];
      expect(emailCall.html).toContain(longName);
      expect(emailCall.subject).toContain(longName);
    });

    test('should handle expiration dates in the past', async () => {
      mockSend.mockResolvedValue({ data: { id: 'test-id' }, error: null });

      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      const testData: InvitationEmailData = {
        customerEmail: 'customer@example.com',
        trainerName: 'Test Trainer',
        trainerEmail: 'trainer@example.com',
        invitationLink: 'https://app.com/invite/past123',
        expiresAt: pastDate
      };

      const result = await emailService.sendInvitationEmail(testData);

      expect(result.success).toBe(true);
      
      const emailCall = mockSend.mock.calls[0][0];
      expect(emailCall.html).toContain(pastDate.getFullYear().toString());
    });
  });

  describe('Performance and Concurrency', () => {
    beforeEach(() => {
      process.env.RESEND_API_KEY = 'test-key';
      process.env.FROM_EMAIL = 'Test <test@example.com>';
    });

    test('should handle multiple concurrent email sends', async () => {
      mockSend.mockResolvedValue({ data: { id: 'test-id' }, error: null });

      const testData: InvitationEmailData = {
        customerEmail: 'customer@example.com',
        trainerName: 'Test Trainer',
        trainerEmail: 'trainer@example.com',
        invitationLink: 'https://app.com/invite/concurrent',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      // Send 5 emails concurrently
      const promises = Array.from({ length: 5 }, () => 
        emailService.sendInvitationEmail(testData)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      expect(mockSend).toHaveBeenCalledTimes(5);
    });

    test('should handle mixed success/failure scenarios', async () => {
      // Mock alternating success/failure
      mockSend
        .mockResolvedValueOnce({ data: { id: 'success-1' }, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'Failed' } })
        .mockResolvedValueOnce({ data: { id: 'success-2' }, error: null });

      const testData: InvitationEmailData = {
        customerEmail: 'customer@example.com',
        trainerName: 'Test Trainer',
        trainerEmail: 'trainer@example.com',
        invitationLink: 'https://app.com/invite/mixed',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      const results = await Promise.all([
        emailService.sendInvitationEmail(testData),
        emailService.sendInvitationEmail(testData),
        emailService.sendInvitationEmail(testData)
      ]);

      expect(results[0].success).toBe(true);
      expect(results[0].messageId).toBe('success-1');
      
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('Failed');
      
      expect(results[2].success).toBe(true);
      expect(results[2].messageId).toBe('success-2');
    });
  });

  describe('Email Content Validation', () => {
    beforeEach(() => {
      process.env.RESEND_API_KEY = 'test-key';
      process.env.FROM_EMAIL = 'Test <test@example.com>';
    });

    test('should include all required features in email content', async () => {
      mockSend.mockResolvedValue({ data: { id: 'test-id' }, error: null });

      const testData: InvitationEmailData = {
        customerEmail: 'customer@example.com',
        trainerName: 'Feature Test Trainer',
        trainerEmail: 'features@trainer.com',
        invitationLink: 'https://app.com/invite/features123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      await emailService.sendInvitationEmail(testData);

      const emailCall = mockSend.mock.calls[0][0];
      const htmlContent = emailCall.html;

      // Check all required features are mentioned
      const requiredFeatures = [
        'Personalized meal plans',
        'Nutritional tracking',
        'Easy-to-follow recipes',
        'Direct guidance'
      ];

      requiredFeatures.forEach(feature => {
        expect(htmlContent).toContain(feature);
      });

      // Check emojis are present
      expect(htmlContent).toContain('🍽️');
      expect(htmlContent).toContain('📊');
      expect(htmlContent).toContain('📱');
      expect(htmlContent).toContain('👨‍⚕️');
    });

    test('should include proper security disclaimers', async () => {
      mockSend.mockResolvedValue({ data: { id: 'test-id' }, error: null });

      const testData: InvitationEmailData = {
        customerEmail: 'customer@example.com',
        trainerName: 'Security Test',
        trainerEmail: 'security@trainer.com',
        invitationLink: 'https://app.com/invite/security123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      await emailService.sendInvitationEmail(testData);

      const emailCall = mockSend.mock.calls[0][0];
      
      expect(emailCall.html).toContain("didn't expect this invitation");
      expect(emailCall.html).toContain('safely ignore');
      expect(emailCall.text).toContain("didn't expect this invitation");
      expect(emailCall.text).toContain('safely ignore');
    });
  });
});