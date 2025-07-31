import { describe, test, expect } from 'vitest';

// Utility functions for email validation and formatting
export const EmailUtils = {
  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    // Basic validation that covers most real-world cases
    if (!email || typeof email !== 'string') return false;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return false;
    
    // Additional checks for edge cases
    if (email.includes('..')) return false;
    if (email.includes(' ')) return false;
    if (email.startsWith('.') || email.endsWith('.')) return false;
    if (email.includes('@.') || email.includes('.@')) return false;
    
    return true;
  },

  /**
   * Sanitize email for safe usage
   */
  sanitizeEmail(email: string): string {
    return email.trim().toLowerCase();
  },

  /**
   * Generate invitation token
   */
  generateInvitationToken(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  },

  /**
   * Calculate expiration date
   */
  calculateExpirationDate(daysFromNow: number = 7): Date {
    return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  },

  /**
   * Format date for email display
   */
  formatDateForEmail(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },

  /**
   * Extract domain from email
   */
  extractDomain(email: string): string {
    const match = email.match(/@(.+)$/);
    return match ? match[1] : '';
  },

  /**
   * Check if email domain is commonly used for testing
   */
  isTestEmailDomain(email: string): boolean {
    const testDomains = ['example.com', 'test.com', 'localhost', 'resend.dev'];
    const domain = this.extractDomain(email);
    return testDomains.includes(domain);
  },

  /**
   * Mask email for logging (privacy)
   */
  maskEmailForLogging(email: string): string {
    const [username, domain] = email.split('@');
    if (!username || !domain) return '***@***.***';
    
    const maskedUsername = username.length > 2 
      ? username.substring(0, 2) + '*'.repeat(username.length - 2)
      : '**';
    
    const domainParts = domain.split('.');
    if (domainParts.length < 2) return '***@***.***';
    
    const firstPart = domainParts[0];
    const maskedFirstPart = firstPart.length > 1 
      ? firstPart.substring(0, 1) + '*'.repeat(firstPart.length - 1)
      : '*';
    
    const maskedDomain = maskedFirstPart + '.' + domainParts.slice(1).join('.');
    
    return `${maskedUsername}@${maskedDomain}`;
  }
};

describe('EmailUtils', () => {
  describe('isValidEmail', () => {
    test('should validate correct email formats', () => {
      const validEmails = [
        'user@example.com',
        'test.user@domain.co.uk',
        'user+tag@example.org',
        'user-name@sub.domain.com',
        'a@b.co',
        '123@456.com'
      ];

      validEmails.forEach(email => {
        expect(EmailUtils.isValidEmail(email)).toBe(true);
      });
    });

    test('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@domain',
        'user..name@domain.com',
        'user@domain..com',
        '',
        'user name@domain.com',
        'user@domain .com'
      ];

      invalidEmails.forEach(email => {
        expect(EmailUtils.isValidEmail(email)).toBe(false);
      });
    });

    test('should handle edge cases', () => {
      expect(EmailUtils.isValidEmail('a@b.c')).toBe(true);
      expect(EmailUtils.isValidEmail('very.long.email.address@very.long.domain.name.com')).toBe(true);
      expect(EmailUtils.isValidEmail('user@domain-with-dashes.com')).toBe(true);
    });
  });

  describe('sanitizeEmail', () => {
    test('should trim whitespace and convert to lowercase', () => {
      expect(EmailUtils.sanitizeEmail('  USER@EXAMPLE.COM  ')).toBe('user@example.com');
      expect(EmailUtils.sanitizeEmail('User@Example.Com')).toBe('user@example.com');
      expect(EmailUtils.sanitizeEmail('\tuser@domain.com\n')).toBe('user@domain.com');
    });

    test('should handle empty string', () => {
      expect(EmailUtils.sanitizeEmail('')).toBe('');
      expect(EmailUtils.sanitizeEmail('   ')).toBe('');
    });
  });

  describe('generateInvitationToken', () => {
    test('should generate 64-character hex token', () => {
      const token = EmailUtils.generateInvitationToken();
      
      expect(token).toMatch(/^[a-f0-9]{64}$/);
      expect(token.length).toBe(64);
    });

    test('should generate unique tokens', () => {
      const tokens = Array.from({ length: 100 }, () => EmailUtils.generateInvitationToken());
      const uniqueTokens = new Set(tokens);
      
      expect(uniqueTokens.size).toBe(100);
    });

    test('should only contain valid hex characters', () => {
      const token = EmailUtils.generateInvitationToken();
      const validHexRegex = /^[0-9a-f]+$/;
      
      expect(validHexRegex.test(token)).toBe(true);
    });
  });

  describe('calculateExpirationDate', () => {
    test('should calculate correct expiration date with default 7 days', () => {
      const beforeTime = Date.now();
      const expirationDate = EmailUtils.calculateExpirationDate();
      const afterTime = Date.now();
      
      const expectedMinTime = beforeTime + (7 * 24 * 60 * 60 * 1000);
      const expectedMaxTime = afterTime + (7 * 24 * 60 * 60 * 1000);
      
      expect(expirationDate.getTime()).toBeGreaterThanOrEqual(expectedMinTime);
      expect(expirationDate.getTime()).toBeLessThanOrEqual(expectedMaxTime);
    });

    test('should calculate correct expiration date with custom days', () => {
      const beforeTime = Date.now();
      const expirationDate = EmailUtils.calculateExpirationDate(14);
      const afterTime = Date.now();
      
      const expectedMinTime = beforeTime + (14 * 24 * 60 * 60 * 1000);
      const expectedMaxTime = afterTime + (14 * 24 * 60 * 60 * 1000);
      
      expect(expirationDate.getTime()).toBeGreaterThanOrEqual(expectedMinTime);
      expect(expirationDate.getTime()).toBeLessThanOrEqual(expectedMaxTime);
    });

    test('should handle edge cases', () => {
      const sameDay = EmailUtils.calculateExpirationDate(0);
      expect(sameDay.getTime()).toBeGreaterThan(Date.now() - 1000); // Within last second
      
      const oneDay = EmailUtils.calculateExpirationDate(1);
      const expectedOneDay = Date.now() + (24 * 60 * 60 * 1000);
      expect(Math.abs(oneDay.getTime() - expectedOneDay)).toBeLessThan(1000);
    });
  });

  describe('formatDateForEmail', () => {
    test('should format date correctly', () => {
      const testDate = new Date('2025-12-25T12:00:00Z');
      const formatted = EmailUtils.formatDateForEmail(testDate);
      
      expect(formatted).toContain('December');
      expect(formatted).toContain('25');
      expect(formatted).toContain('2025');
      expect(formatted).toMatch(/\w+day/); // Should contain day of week
    });

    test('should handle different dates consistently', () => {
      const dates = [
        new Date('2025-01-01T00:00:00Z'),
        new Date('2025-06-15T12:00:00Z'),
        new Date('2025-12-31T23:59:59Z')
      ];

      dates.forEach(date => {
        const formatted = EmailUtils.formatDateForEmail(date);
        expect(formatted).toMatch(/\w+day, \w+ \d{1,2}, \d{4}/);
      });
    });
  });

  describe('extractDomain', () => {
    test('should extract domain from valid emails', () => {
      expect(EmailUtils.extractDomain('user@example.com')).toBe('example.com');
      expect(EmailUtils.extractDomain('test@sub.domain.co.uk')).toBe('sub.domain.co.uk');
      expect(EmailUtils.extractDomain('user+tag@domain.org')).toBe('domain.org');
    });

    test('should handle invalid emails gracefully', () => {
      expect(EmailUtils.extractDomain('invalid-email')).toBe('');
      expect(EmailUtils.extractDomain('@domain.com')).toBe('domain.com');
      expect(EmailUtils.extractDomain('user@')).toBe('');
      expect(EmailUtils.extractDomain('')).toBe('');
    });
  });

  describe('isTestEmailDomain', () => {
    test('should identify test domains', () => {
      const testEmails = [
        'user@example.com',
        'test@test.com',
        'local@localhost',
        'dev@resend.dev'
      ];

      testEmails.forEach(email => {
        expect(EmailUtils.isTestEmailDomain(email)).toBe(true);
      });
    });

    test('should identify production domains', () => {
      const productionEmails = [
        'user@gmail.com',
        'contact@company.org',
        'admin@myapp.io',
        'support@business.co.uk'
      ];

      productionEmails.forEach(email => {
        expect(EmailUtils.isTestEmailDomain(email)).toBe(false);
      });
    });
  });

  describe('maskEmailForLogging', () => {
    test('should mask emails for privacy', () => {
      expect(EmailUtils.maskEmailForLogging('user@example.com')).toBe('us**@e******.com');
      expect(EmailUtils.maskEmailForLogging('john.doe@company.org')).toBe('jo******@c******.org');
      expect(EmailUtils.maskEmailForLogging('a@b.com')).toBe('**@*.com');
    });

    test('should handle short usernames', () => {
      expect(EmailUtils.maskEmailForLogging('ab@domain.com')).toBe('**@d*****.com');
      expect(EmailUtils.maskEmailForLogging('a@domain.com')).toBe('**@d*****.com');
    });

    test('should handle invalid emails gracefully', () => {
      expect(EmailUtils.maskEmailForLogging('invalid-email')).toBe('***@***.***');
      expect(EmailUtils.maskEmailForLogging('')).toBe('***@***.***');
      expect(EmailUtils.maskEmailForLogging('@domain.com')).toBe('***@***.***');
    });

    test('should handle complex domains', () => {
      expect(EmailUtils.maskEmailForLogging('user@sub.domain.co.uk')).toBe('us**@s**.domain.co.uk');
      expect(EmailUtils.maskEmailForLogging('test@a.b')).toBe('te**@*.b');
    });
  });

  describe('Integration scenarios', () => {
    test('should work together for complete email processing', () => {
      const rawEmail = '  USER+TAG@EXAMPLE.COM  ';
      
      // Clean the email
      const sanitized = EmailUtils.sanitizeEmail(rawEmail);
      expect(sanitized).toBe('user+tag@example.com');
      
      // Validate it
      expect(EmailUtils.isValidEmail(sanitized)).toBe(true);
      
      // Check if it's a test domain
      expect(EmailUtils.isTestEmailDomain(sanitized)).toBe(true);
      
      // Generate token and expiration
      const token = EmailUtils.generateInvitationToken();
      const expiration = EmailUtils.calculateExpirationDate();
      
      expect(token).toMatch(/^[a-f0-9]{64}$/);
      expect(expiration.getTime()).toBeGreaterThan(Date.now());
      
      // Mask for logging
      const masked = EmailUtils.maskEmailForLogging(sanitized);
      expect(masked).not.toContain('user+tag');
      expect(masked).toContain('.com');
    });

    test('should handle complete invitation flow data', () => {
      const invitationData = {
        customerEmail: EmailUtils.sanitizeEmail('  Customer@Company.Com  '),
        token: EmailUtils.generateInvitationToken(),
        expiresAt: EmailUtils.calculateExpirationDate(7)
      };

      expect(EmailUtils.isValidEmail(invitationData.customerEmail)).toBe(true);
      expect(invitationData.customerEmail).toBe('customer@company.com');
      expect(invitationData.token).toMatch(/^[a-f0-9]{64}$/);
      expect(invitationData.expiresAt.getTime()).toBeGreaterThan(Date.now());

      const formattedExpiration = EmailUtils.formatDateForEmail(invitationData.expiresAt);
      expect(formattedExpiration).toMatch(/\w+day, \w+ \d{1,2}, \d{4}/);

      const maskedEmail = EmailUtils.maskEmailForLogging(invitationData.customerEmail);
      expect(maskedEmail).not.toContain('customer');
      expect(maskedEmail).toContain('.com');
    });
  });

  describe('Performance', () => {
    test('should handle large batches of email validation efficiently', () => {
      const emails = Array.from({ length: 1000 }, (_, i) => `user${i}@example.com`);
      
      const startTime = Date.now();
      const results = emails.map(email => EmailUtils.isValidEmail(email));
      const endTime = Date.now();
      
      expect(results.every(result => result === true)).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });

    test('should generate tokens efficiently', () => {
      const startTime = Date.now();
      const tokens = Array.from({ length: 100 }, () => EmailUtils.generateInvitationToken());
      const endTime = Date.now();
      
      expect(tokens).toHaveLength(100);
      expect(new Set(tokens).size).toBe(100); // All unique
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});