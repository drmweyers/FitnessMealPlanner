import { Router } from 'express';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { db } from '../db';
import { 
  progressMeasurements, 
  progressPhotos, 
  createMeasurementSchema,
  uploadProgressPhotoSchema
} from '@shared/schema';
import { requireAuth, requireRole } from '../middleware/auth';
import multer from 'multer';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

/**
 * Progress Tracking API Routes
 * 
 * This module provides comprehensive REST API endpoints for customer progress tracking,
 * including body measurements, fitness goals, and progress photos. All endpoints require
 * customer authentication and implement proper data validation and security measures.
 * 
 * Features:
 * - Body measurements CRUD operations with date filtering
 * - Progress photo upload with S3 storage and image processing
 * - Comprehensive error handling and input validation
 * - User data isolation (customers can only access their own data)
 * 
 * @author FitnessMealPlanner Team
 * @since 1.0.0
 */
const router = Router();

/**
 * AWS S3 Client Configuration
 * 
 * Configures S3 client for storing progress photos. Uses environment variables
 * for credentials and region configuration. Defaults to us-east-1 if not specified.
 * 
 * Environment Variables Required:
 * - AWS_REGION: AWS region for S3 bucket
 * - AWS_ACCESS_KEY_ID: AWS access key for S3 operations
 * - AWS_SECRET_ACCESS_KEY: AWS secret key for S3 operations
 * - S3_BUCKET_NAME: Name of the S3 bucket for photo storage
 */
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

/**
 * Multer Configuration for File Uploads
 * 
 * Configures multer middleware for handling progress photo uploads with:
 * - 10MB file size limit to prevent abuse
 * - MIME type validation for security (only images allowed)
 * - Memory storage (files processed in memory before S3 upload)
 * 
 * Supported formats: JPEG, PNG, WebP
 */
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit to prevent abuse
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  },
});

// ====== MEASUREMENTS ROUTES ======

/**
 * GET /api/progress/measurements
 * 
 * Retrieves all body measurements for the authenticated customer with optional date filtering.
 * Results are ordered by measurement date (most recent first) for easy progress tracking.
 * 
 * Authentication: Requires customer role
 * 
 * Query Parameters:
 * @param {string} [startDate] - ISO date string to filter measurements from (inclusive)
 * @param {string} [endDate] - ISO date string to filter measurements to (inclusive)
 * 
 * @returns {Object} Response object
 * @returns {string} response.status - 'success' or 'error'
 * @returns {Array} response.data - Array of measurement objects
 * 
 * @example
 * GET /api/progress/measurements?startDate=2024-01-01&endDate=2024-01-31
 * 
 * Response:
 * {
 *   "status": "success",
 *   "data": [
 *     {
 *       "id": "uuid",
 *       "customerId": "uuid",
 *       "measurementDate": "2024-01-15T00:00:00Z",
 *       "weightLbs": "175.5",
 *       "bodyFatPercentage": "18.2",
 *       "waistCm": "32.0",
 *       "notes": "Feeling great!",
 *       "createdAt": "2024-01-15T10:00:00Z"
 *     }
 *   ]
 * }
 */
router.get('/measurements', requireRole('customer'), async (req, res) => {
  try {
    const userId = req.user!.id;
    const { startDate, endDate } = req.query;

    let query = db
      .select()
      .from(progressMeasurements)
      .where(eq(progressMeasurements.customerId, userId))
      .orderBy(desc(progressMeasurements.measurementDate));

    // Apply date filters if provided
    if (startDate || endDate) {
      const conditions = [eq(progressMeasurements.customerId, userId)];
      
      if (startDate) {
        conditions.push(gte(progressMeasurements.measurementDate, new Date(startDate as string)));
      }
      
      if (endDate) {
        conditions.push(lte(progressMeasurements.measurementDate, new Date(endDate as string)));
      }
      
      query = db
        .select()
        .from(progressMeasurements)
        .where(and(...conditions))
        .orderBy(desc(progressMeasurements.measurementDate));
    }

    const measurements = await query;


    // Fix date serialization issue - manually convert dates to ISO strings
    const serializedMeasurements = measurements.map(measurement => ({
      ...measurement,
      measurementDate: measurement.measurementDate ? new Date(measurement.measurementDate).toISOString() : null,
      createdAt: measurement.createdAt ? new Date(measurement.createdAt).toISOString() : null,
    }));

    res.json({
      status: 'success',
      data: serializedMeasurements,
    });
  } catch (error) {
    console.error('Error fetching measurements:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch measurements',
    });
  }
});

// Create a new measurement
router.post('/measurements', requireRole('customer'), async (req, res) => {
  try {
    const userId = req.user!.id;
    const validatedData = createMeasurementSchema.parse(req.body);

    const [measurement] = await db
      .insert(progressMeasurements)
      .values({
        customerId: userId,
        measurementDate: new Date(validatedData.measurementDate),
        weightKg: validatedData.weightKg?.toString(),
        weightLbs: validatedData.weightLbs?.toString(),
        neckCm: validatedData.neckCm?.toString(),
        shouldersCm: validatedData.shouldersCm?.toString(),
        chestCm: validatedData.chestCm?.toString(),
        waistCm: validatedData.waistCm?.toString(),
        hipsCm: validatedData.hipsCm?.toString(),
        bicepLeftCm: validatedData.bicepLeftCm?.toString(),
        bicepRightCm: validatedData.bicepRightCm?.toString(),
        thighLeftCm: validatedData.thighLeftCm?.toString(),
        thighRightCm: validatedData.thighRightCm?.toString(),
        calfLeftCm: validatedData.calfLeftCm?.toString(),
        calfRightCm: validatedData.calfRightCm?.toString(),
        bodyFatPercentage: validatedData.bodyFatPercentage?.toString(),
        muscleMassKg: validatedData.muscleMassKg?.toString(),
        notes: validatedData.notes,
      })
      .returning();

    res.status(201).json({
      status: 'success',
      data: measurement,
    });
  } catch (error) {
    console.error('Error creating measurement:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({
        status: 'error',
        message: 'Invalid measurement data',
        errors: error,
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Failed to create measurement',
      });
    }
  }
});

// Update a measurement
router.put('/measurements/:id', requireRole('customer'), async (req, res) => {
  try {
    const userId = req.user!.id;
    const measurementId = req.params.id;
    const validatedData = createMeasurementSchema.parse(req.body);

    // First check if the measurement belongs to the user
    const [existing] = await db
      .select()
      .from(progressMeasurements)
      .where(
        and(
          eq(progressMeasurements.id, measurementId),
          eq(progressMeasurements.customerId, userId)
        )
      );

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Measurement not found',
      });
    }

    const [updated] = await db
      .update(progressMeasurements)
      .set({
        measurementDate: new Date(validatedData.measurementDate),
        weightKg: validatedData.weightKg?.toString(),
        weightLbs: validatedData.weightLbs?.toString(),
        neckCm: validatedData.neckCm?.toString(),
        shouldersCm: validatedData.shouldersCm?.toString(),
        chestCm: validatedData.chestCm?.toString(),
        waistCm: validatedData.waistCm?.toString(),
        hipsCm: validatedData.hipsCm?.toString(),
        bicepLeftCm: validatedData.bicepLeftCm?.toString(),
        bicepRightCm: validatedData.bicepRightCm?.toString(),
        thighLeftCm: validatedData.thighLeftCm?.toString(),
        thighRightCm: validatedData.thighRightCm?.toString(),
        calfLeftCm: validatedData.calfLeftCm?.toString(),
        calfRightCm: validatedData.calfRightCm?.toString(),
        bodyFatPercentage: validatedData.bodyFatPercentage?.toString(),
        muscleMassKg: validatedData.muscleMassKg?.toString(),
        notes: validatedData.notes,
      })
      .where(eq(progressMeasurements.id, measurementId))
      .returning();

    res.json({
      status: 'success',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating measurement:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update measurement',
    });
  }
});

// Delete a measurement
router.delete('/measurements/:id', requireRole('customer'), async (req, res) => {
  try {
    const userId = req.user!.id;
    const measurementId = req.params.id;

    const result = await db
      .delete(progressMeasurements)
      .where(
        and(
          eq(progressMeasurements.id, measurementId),
          eq(progressMeasurements.customerId, userId)
        )
      );

    res.json({
      status: 'success',
      message: 'Measurement deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting measurement:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete measurement',
    });
  }
});

// ====== PROGRESS PHOTOS ROUTES ======

// Get all photos for the current customer
router.get('/photos', requireRole('customer'), async (req, res) => {
  try {
    const userId = req.user!.id;

    const photos = await db
      .select()
      .from(progressPhotos)
      .where(eq(progressPhotos.customerId, userId))
      .orderBy(desc(progressPhotos.photoDate));

    res.json({
      status: 'success',
      data: photos,
    });
  } catch (error) {
    console.error('Error fetching photos:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch photos',
    });
  }
});

// Upload a progress photo
router.post(
  '/photos',
  requireRole('customer'),
  upload.single('photo'),
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          status: 'error',
          message: 'No photo provided',
        });
      }

      const validatedData = uploadProgressPhotoSchema.parse(req.body);

      // Generate unique filenames
      const photoId = uuidv4();
      const photoKey = `progress-photos/${userId}/${photoId}.webp`;
      const thumbnailKey = `progress-photos/${userId}/${photoId}_thumb.webp`;

      // Process images - auto-rotate based on EXIF orientation
      const photoBuffer = await sharp(file.buffer)
        .rotate() // Auto-rotates based on EXIF orientation metadata
        .resize(1200, 1600, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();

      const thumbnailBuffer = await sharp(file.buffer)
        .rotate() // Auto-rotates based on EXIF orientation metadata
        .resize(300, 400, { fit: 'cover' })
        .webp({ quality: 80 })
        .toBuffer();

      // Upload to S3
      const bucketName = process.env.S3_BUCKET_NAME;
      
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: photoKey,
          Body: photoBuffer,
          ContentType: 'image/webp',
        })
      );

      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: thumbnailKey,
          Body: thumbnailBuffer,
          ContentType: 'image/webp',
        })
      );

      // Save metadata to database
      const photoUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${photoKey}`;
      const thumbnailUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${thumbnailKey}`;

      const [photo] = await db
        .insert(progressPhotos)
        .values({
          customerId: userId,
          photoDate: new Date(validatedData.photoDate),
          photoUrl,
          thumbnailUrl,
          photoType: validatedData.photoType,
          caption: validatedData.caption,
          isPrivate: validatedData.isPrivate,
        })
        .returning();

      res.status(201).json({
        status: 'success',
        data: photo,
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to upload photo',
      });
    }
  }
);

// Delete a progress photo
router.delete('/photos/:id', requireRole('customer'), async (req, res) => {
  try {
    const userId = req.user!.id;
    const photoId = req.params.id;

    // Get photo details first
    const [photo] = await db
      .select()
      .from(progressPhotos)
      .where(
        and(
          eq(progressPhotos.id, photoId),
          eq(progressPhotos.customerId, userId)
        )
      );

    if (!photo) {
      return res.status(404).json({
        status: 'error',
        message: 'Photo not found',
      });
    }

    // Extract S3 keys from URLs
    const bucketName = process.env.S3_BUCKET_NAME;
    const photoKey = photo.photoUrl.split('.amazonaws.com/')[1];
    const thumbnailKey = photo.thumbnailUrl ? photo.thumbnailUrl.split('.amazonaws.com/')[1] : null;

    // Delete from S3
    try {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: photoKey,
        })
      );

      if (thumbnailKey) {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: bucketName,
            Key: thumbnailKey,
          })
        );
      }
    } catch (s3Error) {
      console.error('Error deleting from S3:', s3Error);
    }

    // Delete from database
    await db
      .delete(progressPhotos)
      .where(eq(progressPhotos.id, photoId));

    res.json({
      status: 'success',
      message: 'Photo deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete photo',
    });
  }
});

// ====== STORY 1.6: ENHANCED PROGRESS TRACKING ======

import { progressAnalyticsService } from '../services/progressAnalyticsService';
import { milestoneAchievementService } from '../services/milestoneAchievementService';

/**
 * GET /api/progress/summary
 * Get comprehensive progress summary with analytics
 */
router.get('/summary', requireRole('customer'), async (req, res) => {
  try {
    const customerId = req.user!.id;
    const period = req.query.period as 'week' | 'month' | 'quarter' | 'year' | 'all' || 'month';

    const summary = await progressAnalyticsService.getProgressSummary(customerId, period);

    res.json({
      status: 'success',
      data: summary
    });
  } catch (error) {
    console.error('Failed to get progress summary:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch progress summary'
    });
  }
});

/**
 * GET /api/progress/trends
 * Get progress trends and projections
 */
router.get('/trends', requireRole('customer'), async (req, res) => {
  try {
    const customerId = req.user!.id;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const defaultStart = new Date();
    defaultStart.setMonth(defaultStart.getMonth() - 3);

    const trends = await progressAnalyticsService.calculateTrends(
      customerId,
      startDate || defaultStart,
      endDate || new Date()
    );

    res.json({
      status: 'success',
      data: trends
    });
  } catch (error) {
    console.error('Failed to get progress trends:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch progress trends'
    });
  }
});

/**
 * GET /api/progress/compare
 * Compare progress between two periods
 */
router.get('/compare', requireRole('customer'), async (req, res) => {
  try {
    const customerId = req.user!.id;
    const { metric, currentStart, currentEnd, previousStart, previousEnd } = req.query;

    if (!metric || !currentStart || !currentEnd || !previousStart || !previousEnd) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required comparison parameters'
      });
    }

    const comparison = await progressAnalyticsService.compareProgress(
      customerId,
      metric as string,
      {
        start: new Date(currentStart as string),
        end: new Date(currentEnd as string)
      },
      {
        start: new Date(previousStart as string),
        end: new Date(previousEnd as string)
      }
    );

    res.json({
      status: 'success',
      data: comparison
    });
  } catch (error) {
    console.error('Failed to compare progress:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to compare progress'
    });
  }
});

/**
 * GET /api/progress/export
 * Export progress data for sharing with trainer
 */
router.get('/export', requireRole('customer'), async (req, res) => {
  try {
    const customerId = req.user!.id;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date('2020-01-01');
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
    const includePhotos = req.query.includePhotos === 'true';
    const format = req.query.format as 'json' | 'pdf' || 'json';

    const exportData = await progressAnalyticsService.generateProgressExport(
      customerId,
      startDate,
      endDate,
      includePhotos
    );

    if (format === 'pdf') {
      // TODO: Generate PDF report
      res.status(501).json({
        status: 'error',
        message: 'PDF export not yet implemented'
      });
    } else {
      res.json({
        status: 'success',
        data: exportData
      });
    }
  } catch (error) {
    console.error('Failed to export progress:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to export progress data'
    });
  }
});

/**
 * GET /api/progress/achievements
 * Get customer's achievements and milestones
 */
router.get('/achievements', requireRole('customer'), async (req, res) => {
  try {
    const customerId = req.user!.id;

    const summary = await milestoneAchievementService.getAchievementSummary(customerId);

    res.json({
      status: 'success',
      data: summary
    });
  } catch (error) {
    console.error('Failed to get achievements:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch achievements'
    });
  }
});

/**
 * POST /api/progress/achievements/check
 * Check and update milestones
 */
router.post('/achievements/check', requireRole('customer'), async (req, res) => {
  try {
    const customerId = req.user!.id;

    const newMilestones = await milestoneAchievementService.checkAndUpdateMilestones(customerId);

    res.json({
      status: 'success',
      data: {
        newAchievements: newMilestones,
        count: newMilestones.length
      }
    });
  } catch (error) {
    console.error('Failed to check achievements:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check achievements'
    });
  }
});

/**
 * GET /api/progress/milestones/:id
 * Get progress towards specific milestone
 */
router.get('/milestones/:id', requireRole('customer'), async (req, res) => {
  try {
    const customerId = req.user!.id;
    const milestoneId = req.params.id;

    const progress = await milestoneAchievementService.getMilestoneProgress(customerId, milestoneId);

    if (!progress) {
      return res.status(404).json({
        status: 'error',
        message: 'Milestone not found'
      });
    }

    res.json({
      status: 'success',
      data: progress
    });
  } catch (error) {
    console.error('Failed to get milestone progress:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch milestone progress'
    });
  }
});

/**
 * POST /api/progress/milestones/custom
 * Create custom milestone for a goal
 */
router.post('/milestones/custom', requireRole('customer'), async (req, res) => {
  try {
    const { goalId, name, targetValue, unit } = req.body;

    if (!goalId || !name || !targetValue || !unit) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required milestone data'
      });
    }

    await milestoneAchievementService.createCustomMilestone(goalId, name, targetValue, unit);

    res.status(201).json({
      status: 'success',
      message: 'Custom milestone created successfully'
    });
  } catch (error) {
    console.error('Failed to create custom milestone:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create custom milestone'
    });
  }
});

/**
 * POST /api/progress/achievements/:id/share
 * Share achievement on social media
 */
router.post('/achievements/:id/share', requireRole('customer'), async (req, res) => {
  try {
    const customerId = req.user!.id;
    const achievementId = req.params.id;
    const { platform } = req.body;

    if (!platform || !['facebook', 'twitter', 'instagram'].includes(platform)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid social media platform'
      });
    }

    const shareData = await milestoneAchievementService.shareAchievement(
      customerId,
      achievementId,
      platform as any
    );

    res.json({
      status: 'success',
      data: shareData
    });
  } catch (error) {
    console.error('Failed to share achievement:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to share achievement'
    });
  }
});

/**
 * GET /api/progress/privacy-settings
 * Get progress visibility settings
 */
router.get('/privacy-settings', requireRole('customer'), async (req, res) => {
  try {
    const customerId = req.user!.id;

    const settings = await progressAnalyticsService.getProgressVisibilitySettings(customerId);

    res.json({
      status: 'success',
      data: settings
    });
  } catch (error) {
    console.error('Failed to get privacy settings:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch privacy settings'
    });
  }
});

/**
 * PUT /api/progress/privacy-settings
 * Update progress visibility settings
 */
router.put('/privacy-settings', requireRole('customer'), async (req, res) => {
  try {
    const customerId = req.user!.id;
    const settings = req.body;

    await progressAnalyticsService.updateProgressVisibilitySettings(customerId, settings);

    res.json({
      status: 'success',
      message: 'Privacy settings updated successfully'
    });
  } catch (error) {
    console.error('Failed to update privacy settings:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update privacy settings'
    });
  }
});

// Trainer access endpoints for viewing customer progress (with permission)

/**
 * GET /api/progress/trainer/customer/:customerId/summary
 * Trainer view of customer progress (requires permission)
 */
router.get('/trainer/customer/:customerId/summary', requireRole('trainer'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const { customerId } = req.params;
    const period = req.query.period as any || 'month';

    // Verify trainer-customer relationship
    const { personalizedMealPlans, personalizedRecipes } = await import('@shared/schema');
    const hasRelationship = await db.select()
      .from(personalizedMealPlans)
      .where(
        and(
          eq(personalizedMealPlans.trainerId, trainerId),
          eq(personalizedMealPlans.customerId, customerId)
        )
      )
      .limit(1);

    if (hasRelationship.length === 0) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to view this customer\'s progress'
      });
    }

    // Check customer's privacy settings
    const privacySettings = await progressAnalyticsService.getProgressVisibilitySettings(customerId);
    
    if (privacySettings.measurements === 'private') {
      return res.status(403).json({
        status: 'error',
        message: 'Customer has set progress to private'
      });
    }

    const summary = await progressAnalyticsService.getProgressSummary(customerId, period);

    res.json({
      status: 'success',
      data: summary
    });
  } catch (error) {
    console.error('Failed to get customer progress:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch customer progress'
    });
  }
});

export default router;