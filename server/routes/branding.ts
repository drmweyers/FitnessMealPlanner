/**
 * Branding Routes (Story 2.12)
 *
 * Professional+ tier branding customization endpoints
 * Enterprise tier white-label and custom domain endpoints
 */

import { Router } from 'express';
import { brandingService } from '../services/BrandingService';
import { requireAuth, requireRole } from '../middleware/auth';
import { requireTier } from '../middleware/tierEnforcement';
import multer from 'multer';
import { z } from 'zod';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

export const brandingRouter = Router();

// S3 client configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  endpoint: process.env.S3_ENDPOINT,
});

// Multer configuration for logo upload (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PNG, JPG, and SVG are allowed.'));
    }
  },
});

// Validation schemas
const updateBrandingSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  whiteLabelEnabled: z.boolean().optional(),
});

const customDomainSchema = z.object({
  customDomain: z.string().min(3).max(255),
});

/**
 * GET /api/branding
 * Get branding settings for authenticated trainer
 */
brandingRouter.get('/', requireAuth, requireRole('trainer'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const settings = await brandingService.getBrandingSettings(trainerId);

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('[Branding API] Failed to get branding settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get branding settings',
    });
  }
});

/**
 * PUT /api/branding
 * Update branding settings (Professional+ only)
 */
brandingRouter.put('/', requireAuth, requireRole('trainer'), requireTier('professional'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const updates = updateBrandingSchema.parse(req.body);

    const settings = await brandingService.updateBrandingSettings(trainerId, updates, req);

    res.json({
      success: true,
      data: settings,
      message: 'Branding settings updated successfully',
    });
  } catch (error) {
    console.error('[Branding API] Failed to update branding:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid branding data',
        details: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to update branding settings',
    });
  }
});

/**
 * POST /api/branding/logo
 * Upload logo (Professional+ only)
 */
brandingRouter.post(
  '/logo',
  requireAuth,
  requireRole('trainer'),
  requireTier('professional'),
  upload.single('logo'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No logo file provided',
        });
      }

      const trainerId = req.user!.id;
      const file = req.file;

      // Generate unique filename
      const fileExt = file.originalname.split('.').pop();
      const filename = `branding/logos/${trainerId}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${fileExt}`;

      // Upload to S3
      const uploadCommand = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: filename,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
      });

      await s3Client.send(uploadCommand);

      // Construct public URL
      const logoUrl = process.env.S3_ENDPOINT
        ? `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET_NAME}/${filename}`
        : `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${filename}`;

      // Update branding settings
      const settings = await brandingService.updateLogo(
        trainerId,
        {
          logoUrl,
          logoFileSize: file.size,
          logoUploadedAt: new Date(),
        },
        req
      );

      res.json({
        success: true,
        data: settings,
        message: 'Logo uploaded successfully',
      });
    } catch (error) {
      console.error('[Branding API] Failed to upload logo:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload logo',
      });
    }
  }
);

/**
 * DELETE /api/branding/logo
 * Delete logo (Professional+ only)
 */
brandingRouter.delete('/logo', requireAuth, requireRole('trainer'), requireTier('professional'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const currentSettings = await brandingService.getBrandingSettings(trainerId);

    // Delete from S3 if exists
    if (currentSettings?.logoUrl) {
      const key = currentSettings.logoUrl.split('/').slice(-3).join('/'); // Extract key from URL
      const deleteCommand = new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: key,
      });
      await s3Client.send(deleteCommand);
    }

    const settings = await brandingService.deleteLogo(trainerId, req);

    res.json({
      success: true,
      data: settings,
      message: 'Logo deleted successfully',
    });
  } catch (error) {
    console.error('[Branding API] Failed to delete logo:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete logo',
    });
  }
});

/**
 * POST /api/branding/white-label
 * Enable/disable white-label mode (Enterprise only)
 */
brandingRouter.post('/white-label', requireAuth, requireRole('trainer'), requireTier('enterprise'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const { enabled } = z.object({ enabled: z.boolean() }).parse(req.body);

    const settings = await brandingService.enableWhiteLabel(trainerId, enabled, req);

    res.json({
      success: true,
      data: settings,
      message: `White-label mode ${enabled ? 'enabled' : 'disabled'} successfully`,
    });
  } catch (error) {
    console.error('[Branding API] Failed to toggle white-label:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle white-label mode',
    });
  }
});

/**
 * POST /api/branding/custom-domain
 * Set custom domain (Enterprise only)
 */
brandingRouter.post('/custom-domain', requireAuth, requireRole('trainer'), requireTier('enterprise'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const { customDomain } = customDomainSchema.parse(req.body);

    const result = await brandingService.setCustomDomain(trainerId, customDomain, req);

    res.json({
      success: true,
      data: result.settings,
      verificationToken: result.verificationToken,
      message: 'Custom domain set. Please add TXT record to verify.',
      instructions: `Add the following TXT record to your DNS:
        Name: _evofitmeals-verification
        Value: ${result.verificationToken}`,
    });
  } catch (error) {
    console.error('[Branding API] Failed to set custom domain:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid domain',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to set custom domain',
    });
  }
});

/**
 * POST /api/branding/verify-domain
 * Verify custom domain DNS (Enterprise only)
 */
brandingRouter.post('/verify-domain', requireAuth, requireRole('trainer'), requireTier('enterprise'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const verified = await brandingService.verifyCustomDomain(trainerId);

    if (verified) {
      res.json({
        success: true,
        verified: true,
        message: 'Domain verified successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        verified: false,
        error: 'Domain verification failed. Please check DNS records.',
      });
    }
  } catch (error) {
    console.error('[Branding API] Failed to verify domain:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify domain',
    });
  }
});
