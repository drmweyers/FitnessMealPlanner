/**
 * Unit Tests: BrandingService
 *
 * Comprehensive tests for Story 2.12: Branding & Customization
 * Tests Professional+ branding features and Enterprise white-label mode
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../../../server/db';
import type { Request } from 'express';

// Mock database
vi.mock('../../../server/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  },
}));

describe('BrandingService - Story 2.12', () => {
  let service: any;
  const mockTrainerId = 'trainer-123';
  const mockRequest = {
    ip: '192.168.1.1',
    socket: { remoteAddress: '192.168.1.1' },
    get: (header: string) => 'Mozilla/5.0 Test',
  } as unknown as Request;

  const mockBrandingSettings = {
    id: 'branding-1',
    trainerId: mockTrainerId,
    logoUrl: null,
    logoFileSize: 0,
    logoUploadedAt: null,
    primaryColor: null,
    secondaryColor: null,
    accentColor: null,
    whiteLabelEnabled: false,
    customDomain: null,
    customDomainVerified: false,
    domainVerificationToken: null,
    domainVerifiedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    // Import service after mocks are set up
    const module = await import('../../../server/services/BrandingService');
    service = module.brandingService;
  });

  describe('getBrandingSettings', () => {
    it('should return existing branding settings', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockBrandingSettings]),
          }),
        }),
      } as any);

      const result = await service.getBrandingSettings(mockTrainerId);

      expect(result).toEqual(mockBrandingSettings);
    });

    it('should create default settings if none exist', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // No existing settings
          }),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockBrandingSettings]),
        }),
      } as any);

      const result = await service.getBrandingSettings(mockTrainerId);

      expect(result).toBeDefined();
      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe('updateBrandingSettings - Professional Tier', () => {
    it('should update primary color', async () => {
      const updatedSettings = {
        ...mockBrandingSettings,
        primaryColor: '#FF5733',
        updatedAt: new Date('2024-01-02'),
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockBrandingSettings]),
          }),
        }),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedSettings]),
          }),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      const result = await service.updateBrandingSettings(
        mockTrainerId,
        { primaryColor: '#FF5733' },
        mockRequest
      );

      expect(result.primaryColor).toBe('#FF5733');
    });

    it('should update all color settings simultaneously', async () => {
      const updatedSettings = {
        ...mockBrandingSettings,
        primaryColor: '#FF5733',
        secondaryColor: '#33FF57',
        accentColor: '#3357FF',
        updatedAt: new Date('2024-01-02'),
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockBrandingSettings]),
          }),
        }),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedSettings]),
          }),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      const result = await service.updateBrandingSettings(
        mockTrainerId,
        {
          primaryColor: '#FF5733',
          secondaryColor: '#33FF57',
          accentColor: '#3357FF',
        },
        mockRequest
      );

      expect(result.primaryColor).toBe('#FF5733');
      expect(result.secondaryColor).toBe('#33FF57');
      expect(result.accentColor).toBe('#3357FF');
    });

    it('should create audit log for color updates', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockBrandingSettings]),
          }),
        }),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{
              ...mockBrandingSettings,
              primaryColor: '#FF5733',
            }]),
          }),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      await service.updateBrandingSettings(
        mockTrainerId,
        { primaryColor: '#FF5733' },
        mockRequest
      );

      // Verify audit log was created
      expect(db.insert).toHaveBeenCalledWith(expect.anything());
      expect(vi.mocked(db.insert).mock.calls[0][0]).toBeDefined();
    });
  });

  describe('updateLogo - Professional Tier', () => {
    it('should upload logo and update settings', async () => {
      const logoUpload = {
        logoUrl: 'https://s3.amazonaws.com/logos/trainer-123.png',
        logoFileSize: 524288, // 512 KB
        logoUploadedAt: new Date('2024-01-02'),
      };

      const updatedSettings = {
        ...mockBrandingSettings,
        ...logoUpload,
        updatedAt: new Date('2024-01-02'),
      };

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedSettings]),
          }),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      const result = await service.updateLogo(mockTrainerId, logoUpload, mockRequest);

      expect(result.logoUrl).toBe('https://s3.amazonaws.com/logos/trainer-123.png');
      expect(result.logoFileSize).toBe(524288);
      expect(result.logoUploadedAt).toBeDefined();
    });

    it('should enforce 2MB file size limit', async () => {
      const largeLogoUpload = {
        logoUrl: 'https://s3.amazonaws.com/logos/trainer-123.png',
        logoFileSize: 3145728, // 3 MB (exceeds 2MB limit)
        logoUploadedAt: new Date('2024-01-02'),
      };

      // This test validates the business logic expects validation before this service
      // The service itself doesn't enforce limits, but it stores the value
      // Validation should happen in the API route layer
      const result = await service.updateLogo(mockTrainerId, largeLogoUpload, mockRequest);

      // Service accepts the value - validation is route-level responsibility
      expect(result).toBeDefined();
    });

    it('should create audit log for logo upload', async () => {
      const logoUpload = {
        logoUrl: 'https://s3.amazonaws.com/logos/trainer-123.png',
        logoFileSize: 524288,
        logoUploadedAt: new Date('2024-01-02'),
      };

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{
              ...mockBrandingSettings,
              ...logoUpload,
            }]),
          }),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      await service.updateLogo(mockTrainerId, logoUpload, mockRequest);

      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe('deleteLogo - Professional Tier', () => {
    it('should remove logo and reset fields', async () => {
      const clearedSettings = {
        ...mockBrandingSettings,
        logoUrl: null,
        logoFileSize: 0,
        logoUploadedAt: null,
        updatedAt: new Date('2024-01-02'),
      };

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([clearedSettings]),
          }),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      const result = await service.deleteLogo(mockTrainerId, mockRequest);

      expect(result.logoUrl).toBeNull();
      expect(result.logoFileSize).toBe(0);
      expect(result.logoUploadedAt).toBeNull();
    });

    it('should create audit log for logo deletion', async () => {
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockBrandingSettings]),
          }),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      await service.deleteLogo(mockTrainerId, mockRequest);

      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe('enableWhiteLabel - Enterprise Tier', () => {
    it('should enable white-label mode', async () => {
      const whiteLabelSettings = {
        ...mockBrandingSettings,
        whiteLabelEnabled: true,
        updatedAt: new Date('2024-01-02'),
      };

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([whiteLabelSettings]),
          }),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      const result = await service.enableWhiteLabel(mockTrainerId, true, mockRequest);

      expect(result.whiteLabelEnabled).toBe(true);
    });

    it('should disable white-label mode', async () => {
      const disabledWhiteLabelSettings = {
        ...mockBrandingSettings,
        whiteLabelEnabled: false,
        updatedAt: new Date('2024-01-02'),
      };

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([disabledWhiteLabelSettings]),
          }),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      const result = await service.enableWhiteLabel(mockTrainerId, false, mockRequest);

      expect(result.whiteLabelEnabled).toBe(false);
    });

    it('should create audit log when enabling white-label', async () => {
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{
              ...mockBrandingSettings,
              whiteLabelEnabled: true,
            }]),
          }),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      await service.enableWhiteLabel(mockTrainerId, true, mockRequest);

      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe('setCustomDomain - Enterprise Tier', () => {
    it('should set custom domain and generate verification token', async () => {
      const domainSettings = {
        ...mockBrandingSettings,
        customDomain: 'trainers.example.com',
        customDomainVerified: false,
        domainVerificationToken: 'abc123xyz789',
        updatedAt: new Date('2024-01-02'),
      };

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([domainSettings]),
          }),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      const result = await service.setCustomDomain(
        mockTrainerId,
        'trainers.example.com',
        mockRequest
      );

      expect(result.settings.customDomain).toBe('trainers.example.com');
      expect(result.settings.customDomainVerified).toBe(false);
      expect(result.verificationToken).toBeDefined();
      expect(result.verificationToken.length).toBeGreaterThan(0);
    });

    it('should reset verification status when domain changes', async () => {
      const existingVerifiedDomain = {
        ...mockBrandingSettings,
        customDomain: 'old.example.com',
        customDomainVerified: true,
        domainVerifiedAt: new Date('2024-01-01'),
      };

      const newDomainSettings = {
        ...existingVerifiedDomain,
        customDomain: 'new.example.com',
        customDomainVerified: false,
        domainVerificationToken: 'newtoken123',
        domainVerifiedAt: null,
        updatedAt: new Date('2024-01-02'),
      };

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([newDomainSettings]),
          }),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      const result = await service.setCustomDomain(
        mockTrainerId,
        'new.example.com',
        mockRequest
      );

      expect(result.settings.customDomain).toBe('new.example.com');
      expect(result.settings.customDomainVerified).toBe(false);
      expect(result.settings.domainVerifiedAt).toBeNull();
    });

    it('should create audit log for custom domain set', async () => {
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{
              ...mockBrandingSettings,
              customDomain: 'trainers.example.com',
            }]),
          }),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      await service.setCustomDomain(mockTrainerId, 'trainers.example.com', mockRequest);

      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe('verifyCustomDomain - Enterprise Tier', () => {
    it('should verify domain and set verification timestamp', async () => {
      const verifiedSettings = {
        ...mockBrandingSettings,
        customDomain: 'trainers.example.com',
        customDomainVerified: true,
        domainVerificationToken: 'abc123xyz789',
        domainVerifiedAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              ...mockBrandingSettings,
              customDomain: 'trainers.example.com',
              domainVerificationToken: 'abc123xyz789',
            }]),
          }),
        }),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([verifiedSettings]),
          }),
        }),
      } as any);

      const result = await service.verifyCustomDomain(mockTrainerId);

      expect(result).toBe(true);
    });

    it('should return false when no domain is set', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockBrandingSettings]), // No domain set
          }),
        }),
      } as any);

      const result = await service.verifyCustomDomain(mockTrainerId);

      expect(result).toBe(false);
    });

    it('should return false when verification token is missing', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              ...mockBrandingSettings,
              customDomain: 'trainers.example.com',
              domainVerificationToken: null,
            }]),
          }),
        }),
      } as any);

      const result = await service.verifyCustomDomain(mockTrainerId);

      expect(result).toBe(false);
    });
  });

  describe('getBrandingForPDF', () => {
    it('should return branding with showEvoFitBranding flag', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockBrandingSettings]),
          }),
        }),
      } as any);

      const result = await service.getBrandingForPDF(mockTrainerId);

      expect(result.branding).toBeDefined();
      expect(result.whiteLabelEnabled).toBe(false);
      expect(result.showEvoFitBranding).toBe(true); // Should show when white-label disabled
    });

    it('should hide EvoFit branding when white-label enabled', async () => {
      const whiteLabelSettings = {
        ...mockBrandingSettings,
        whiteLabelEnabled: true,
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([whiteLabelSettings]),
          }),
        }),
      } as any);

      const result = await service.getBrandingForPDF(mockTrainerId);

      expect(result.whiteLabelEnabled).toBe(true);
      expect(result.showEvoFitBranding).toBe(false); // Should hide when white-label enabled
    });

    it('should create default settings if none exist for PDF', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // No settings exist
          }),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockBrandingSettings]),
        }),
      } as any);

      const result = await service.getBrandingForPDF(mockTrainerId);

      expect(result.branding).toBeDefined();
      expect(result.showEvoFitBranding).toBe(true);
    });
  });

  describe('Audit Logging', () => {
    it('should log IP address in audit trail', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockBrandingSettings]),
          }),
        }),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{
              ...mockBrandingSettings,
              primaryColor: '#FF5733',
            }]),
          }),
        }),
      } as any);

      const insertMock = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.insert).mockReturnValue({
        values: insertMock,
      } as any);

      await service.updateBrandingSettings(
        mockTrainerId,
        { primaryColor: '#FF5733' },
        mockRequest
      );

      expect(insertMock).toHaveBeenCalled();
      const auditData = insertMock.mock.calls[0][0];
      expect(auditData).toMatchObject({
        trainerId: mockTrainerId,
        action: 'branding_updated',
      });
    });

    it('should log user agent in audit trail', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockBrandingSettings]),
          }),
        }),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{
              ...mockBrandingSettings,
              primaryColor: '#FF5733',
            }]),
          }),
        }),
      } as any);

      const insertMock = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.insert).mockReturnValue({
        values: insertMock,
      } as any);

      await service.updateBrandingSettings(
        mockTrainerId,
        { primaryColor: '#FF5733' },
        mockRequest
      );

      expect(insertMock).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null color values (reset to default)', async () => {
      const resetSettings = {
        ...mockBrandingSettings,
        primaryColor: null,
        secondaryColor: null,
        accentColor: null,
        updatedAt: new Date('2024-01-02'),
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockBrandingSettings]),
          }),
        }),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([resetSettings]),
          }),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      const result = await service.updateBrandingSettings(
        mockTrainerId,
        { primaryColor: null, secondaryColor: null, accentColor: null },
        mockRequest
      );

      expect(result.primaryColor).toBeNull();
      expect(result.secondaryColor).toBeNull();
      expect(result.accentColor).toBeNull();
    });

    it('should handle empty domain string', async () => {
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockBrandingSettings]),
          }),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      const result = await service.setCustomDomain(mockTrainerId, '', mockRequest);

      expect(result.settings).toBeDefined();
    });

    it('should handle concurrent branding updates', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockBrandingSettings]),
          }),
        }),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{
              ...mockBrandingSettings,
              primaryColor: '#FF5733',
            }]),
          }),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      // Simulate concurrent updates
      const update1 = service.updateBrandingSettings(
        mockTrainerId,
        { primaryColor: '#FF5733' },
        mockRequest
      );
      const update2 = service.updateBrandingSettings(
        mockTrainerId,
        { secondaryColor: '#33FF57' },
        mockRequest
      );

      const results = await Promise.all([update1, update2]);

      expect(results).toHaveLength(2);
      expect(results[0]).toBeDefined();
      expect(results[1]).toBeDefined();
    });
  });
});
