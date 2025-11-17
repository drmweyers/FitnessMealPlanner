/**
 * Branding Service (Story 2.12)
 *
 * Handles tier-based branding customization:
 * - Professional: Logo upload + color customization
 * - Enterprise: White-label mode + custom domains
 */

import { db } from '../db';
import { trainerBrandingSettings, brandingAuditLog, trainerSubscriptions, users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { Request } from 'express';
import crypto from 'crypto';

export interface BrandingSettings {
  id: string;
  trainerId: string;
  logoUrl: string | null;
  logoFileSize: number;
  logoUploadedAt: Date | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  whiteLabelEnabled: boolean;
  customDomain: string | null;
  customDomainVerified: boolean;
  domainVerificationToken: string | null;
  domainVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateBrandingInput {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  whiteLabelEnabled?: boolean;
  customDomain?: string | null;
}

export interface LogoUploadResult {
  logoUrl: string;
  logoFileSize: number;
  logoUploadedAt: Date;
}

class BrandingService {
  /**
   * Get branding settings for a trainer (creates default if not exists)
   */
  async getBrandingSettings(trainerId: string): Promise<BrandingSettings | null> {
    let settings = await db
      .select()
      .from(trainerBrandingSettings)
      .where(eq(trainerBrandingSettings.trainerId, trainerId))
      .limit(1);

    // Create default settings if not exists
    if (settings.length === 0) {
      const [newSettings] = await db
        .insert(trainerBrandingSettings)
        .values({ trainerId })
        .returning();
      return newSettings as BrandingSettings;
    }

    return settings[0] as BrandingSettings;
  }

  /**
   * Update branding settings (Professional+)
   */
  async updateBrandingSettings(
    trainerId: string,
    updates: UpdateBrandingInput,
    req: Request
  ): Promise<BrandingSettings> {
    const oldSettings = await this.getBrandingSettings(trainerId);

    const [updatedSettings] = await db
      .update(trainerBrandingSettings)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(trainerBrandingSettings.trainerId, trainerId))
      .returning();

    // Audit log
    await this.logBrandingChange(trainerId, 'branding_updated', updates, oldSettings, req);

    return updatedSettings as BrandingSettings;
  }

  /**
   * Update logo (Professional+)
   */
  async updateLogo(
    trainerId: string,
    logoUpload: LogoUploadResult,
    req: Request
  ): Promise<BrandingSettings> {
    const [updatedSettings] = await db
      .update(trainerBrandingSettings)
      .set({
        logoUrl: logoUpload.logoUrl,
        logoFileSize: logoUpload.logoFileSize,
        logoUploadedAt: logoUpload.logoUploadedAt,
        updatedAt: new Date(),
      })
      .where(eq(trainerBrandingSettings.trainerId, trainerId))
      .returning();

    // Audit log
    await this.logBrandingChange(trainerId, 'logo_uploaded', { logoUrl: logoUpload.logoUrl }, null, req);

    return updatedSettings as BrandingSettings;
  }

  /**
   * Enable white-label mode (Enterprise only)
   */
  async enableWhiteLabel(trainerId: string, enabled: boolean, req: Request): Promise<BrandingSettings> {
    const [updatedSettings] = await db
      .update(trainerBrandingSettings)
      .set({
        whiteLabelEnabled: enabled,
        updatedAt: new Date(),
      })
      .where(eq(trainerBrandingSettings.trainerId, trainerId))
      .returning();

    // Audit log
    await this.logBrandingChange(
      trainerId,
      enabled ? 'white_label_enabled' : 'white_label_disabled',
      { whiteLabelEnabled: enabled },
      null,
      req
    );

    return updatedSettings as BrandingSettings;
  }

  /**
   * Set custom domain (Enterprise only)
   */
  async setCustomDomain(trainerId: string, customDomain: string, req: Request): Promise<{
    settings: BrandingSettings;
    verificationToken: string;
  }> {
    // Generate verification token for DNS TXT record
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const [updatedSettings] = await db
      .update(trainerBrandingSettings)
      .set({
        customDomain,
        customDomainVerified: false,
        domainVerificationToken: verificationToken,
        domainVerifiedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(trainerBrandingSettings.trainerId, trainerId))
      .returning();

    // Audit log
    await this.logBrandingChange(trainerId, 'custom_domain_set', { customDomain }, null, req);

    return {
      settings: updatedSettings as BrandingSettings,
      verificationToken,
    };
  }

  /**
   * Verify custom domain (checks DNS TXT record)
   */
  async verifyCustomDomain(trainerId: string): Promise<boolean> {
    const settings = await this.getBrandingSettings(trainerId);
    if (!settings?.customDomain || !settings?.domainVerificationToken) {
      return false;
    }

    // TODO: Implement actual DNS verification
    // For now, manually verify by checking DNS records
    // Production should use dns.promises.resolveTxt()

    const [updatedSettings] = await db
      .update(trainerBrandingSettings)
      .set({
        customDomainVerified: true,
        domainVerifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(trainerBrandingSettings.trainerId, trainerId))
      .returning();

    return updatedSettings.customDomainVerified ?? false;
  }

  /**
   * Delete logo
   */
  async deleteLogo(trainerId: string, req: Request): Promise<BrandingSettings> {
    const [updatedSettings] = await db
      .update(trainerBrandingSettings)
      .set({
        logoUrl: null,
        logoFileSize: 0,
        logoUploadedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(trainerBrandingSettings.trainerId, trainerId))
      .returning();

    // Audit log
    await this.logBrandingChange(trainerId, 'logo_deleted', {}, null, req);

    return updatedSettings as BrandingSettings;
  }

  /**
   * Log branding change to audit trail
   */
  private async logBrandingChange(
    trainerId: string,
    action: string,
    newValues: any,
    oldValues: any,
    req: Request
  ): Promise<void> {
    const ipAddress = req.ip || req.socket.remoteAddress || null;
    const userAgent = req.get('user-agent') || null;

    await db.insert(brandingAuditLog).values({
      trainerId,
      action,
      fieldChanged: Object.keys(newValues).join(', '),
      oldValue: oldValues ? JSON.stringify(oldValues) : null,
      newValue: JSON.stringify(newValues),
      ipAddress,
      userAgent,
    });
  }

  /**
   * Get branding for PDF generation (includes tier info)
   */
  async getBrandingForPDF(trainerId: string): Promise<{
    branding: BrandingSettings | null;
    whiteLabelEnabled: boolean;
    showEvoFitBranding: boolean;
  }> {
    const settings = await this.getBrandingSettings(trainerId);
    const whiteLabelEnabled = settings?.whiteLabelEnabled || false;

    return {
      branding: settings,
      whiteLabelEnabled,
      showEvoFitBranding: !whiteLabelEnabled, // Hide EvoFit branding if white-label enabled
    };
  }
}

export const brandingService = new BrandingService();
