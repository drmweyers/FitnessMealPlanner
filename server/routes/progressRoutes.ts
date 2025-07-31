import { Router } from 'express';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { db } from '../db';
import { 
  progressMeasurements, 
  progressPhotos, 
  customerGoals,
  goalMilestones,
  createMeasurementSchema,
  createGoalSchema,
  uploadProgressPhotoSchema
} from '@shared/schema';
import { requireAuth, requireRole } from '../middleware/auth';
import multer from 'multer';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

const router = Router();

// Configure S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
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

// Get all measurements for the current customer
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

    res.json({
      status: 'success',
      data: measurements,
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

// ====== GOALS ROUTES ======

// Get all goals for the current customer
router.get('/goals', requireRole('customer'), async (req, res) => {
  try {
    const userId = req.user!.id;
    const { status } = req.query;

    let query = db
      .select()
      .from(customerGoals)
      .where(eq(customerGoals.customerId, userId))
      .orderBy(desc(customerGoals.createdAt));

    if (status) {
      query = db
        .select()
        .from(customerGoals)
        .where(
          and(
            eq(customerGoals.customerId, userId),
            eq(customerGoals.status, status as string)
          )
        )
        .orderBy(desc(customerGoals.createdAt));
    }

    const goals = await query;

    // For each goal, fetch its milestones
    const goalsWithMilestones = await Promise.all(
      goals.map(async (goal) => {
        const milestones = await db
          .select()
          .from(goalMilestones)
          .where(eq(goalMilestones.goalId, goal.id))
          .orderBy(desc(goalMilestones.createdAt));

        return {
          ...goal,
          milestones,
        };
      })
    );

    res.json({
      status: 'success',
      data: goalsWithMilestones,
    });
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch goals',
    });
  }
});

// Create a new goal
router.post('/goals', requireRole('customer'), async (req, res) => {
  try {
    const userId = req.user!.id;
    const validatedData = createGoalSchema.parse(req.body);

    const [goal] = await db
      .insert(customerGoals)
      .values({
        customerId: userId,
        goalType: validatedData.goalType,
        goalName: validatedData.goalName,
        description: validatedData.description,
        targetValue: validatedData.targetValue.toString(),
        targetUnit: validatedData.targetUnit,
        currentValue: validatedData.currentValue?.toString(),
        startingValue: validatedData.startingValue?.toString(),
        startDate: new Date(validatedData.startDate),
        targetDate: validatedData.targetDate ? new Date(validatedData.targetDate) : null,
        notes: validatedData.notes,
      })
      .returning();

    res.status(201).json({
      status: 'success',
      data: goal,
    });
  } catch (error) {
    console.error('Error creating goal:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({
        status: 'error',
        message: 'Invalid goal data',
        errors: error,
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Failed to create goal',
      });
    }
  }
});

// Update goal progress
router.patch('/goals/:id/progress', requireRole('customer'), async (req, res) => {
  try {
    const userId = req.user!.id;
    const goalId = req.params.id;
    const { currentValue } = req.body;

    // First check if the goal belongs to the user
    const [existing] = await db
      .select()
      .from(customerGoals)
      .where(
        and(
          eq(customerGoals.id, goalId),
          eq(customerGoals.customerId, userId)
        )
      );

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Goal not found',
      });
    }

    // Calculate progress percentage
    const target = parseFloat(existing.targetValue || '0');
    const starting = parseFloat(existing.startingValue || '0');
    const current = parseFloat(currentValue);
    
    let progressPercentage = 0;
    if (target !== starting) {
      progressPercentage = Math.round(((current - starting) / (target - starting)) * 100);
      progressPercentage = Math.max(0, Math.min(100, progressPercentage));
    }

    // Check if goal is achieved
    const isAchieved = progressPercentage >= 100;

    const [updated] = await db
      .update(customerGoals)
      .set({
        currentValue: currentValue.toString(),
        progressPercentage,
        status: isAchieved ? 'achieved' : existing.status,
        achievedDate: isAchieved ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(customerGoals.id, goalId))
      .returning();

    res.json({
      status: 'success',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating goal progress:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update goal progress',
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

      // Process images
      const photoBuffer = await sharp(file.buffer)
        .resize(1200, 1600, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();

      const thumbnailBuffer = await sharp(file.buffer)
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

export default router;