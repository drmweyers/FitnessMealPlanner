/**
 * Unit Tests for Profile Management CRUD Operations
 * 
 * Tests all profile management functionality for trainers and customers:
 * - User profile creation, reading, updating, deletion
 * - Profile image upload and management
 * - Progress measurements and tracking
 * - Customer goals management
 * - Privacy and security controls
 * - Trainer-customer profile access permissions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import multer from 'multer';
import { db } from '../../server/db';
import { 
  users,
  progressMeasurements,
  progressPhotos,
  customerGoals,
  goalMilestones,
  type User,
  type InsertUser,
  type ProgressMeasurement,
  type ProgressPhoto,
  type CustomerGoal,
  type GoalMilestone 
} from '../../shared/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import profileRouter from '../../server/routes/profileRoutes';
import progressRouter from '../../server/routes/progressRoutes';
import { storage } from '../../server/storage';
import { s3Upload } from '../../server/services/s3Upload';

// Mock dependencies
vi.mock('../../server/db');
vi.mock('../../server/storage');
vi.mock('../../server/services/s3Upload');
vi.mock('multer');

// Mock authentication middleware
const mockTrainerAuth = (req: any, res: any, next: any) => {
  req.user = {
    id: 'trainer-123',
    email: 'trainer@example.com',
    role: 'trainer',
  };
  next();
};

const mockCustomerAuth = (req: any, res: any, next: any) => {
  req.user = {
    id: 'customer-123',
    email: 'customer@example.com',
    role: 'customer',
  };
  next();
};

const mockAdminAuth = (req: any, res: any, next: any) => {
  req.user = {
    id: 'admin-123',
    email: 'admin@example.com',
    role: 'admin',
  };
  next();
};

// Test data
const mockUser: User = {
  id: 'customer-123',
  email: 'customer@example.com',
  password: 'hashed-password',
  role: 'customer',
  googleId: null,
  name: 'Jane Customer',
  profilePicture: 'https://s3.amazonaws.com/bucket/profile-123.jpg',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockTrainer: User = {
  id: 'trainer-123',
  email: 'trainer@example.com',
  password: 'hashed-password',
  role: 'trainer',
  googleId: null,
  name: 'John Trainer',
  profilePicture: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockMeasurement: ProgressMeasurement = {
  id: 'measurement-123',
  customerId: 'customer-123',
  measurementDate: new Date('2024-01-15'),
  weightKg: '75.5',
  weightLbs: '166.4',
  neckCm: '38.0',
  shouldersCm: '112.0',
  chestCm: '98.0',
  waistCm: '85.0',
  hipsCm: '95.0',
  bicepLeftCm: '32.0',
  bicepRightCm: '32.5',
  thighLeftCm: '58.0',
  thighRightCm: '57.5',
  calfLeftCm: '36.0',
  calfRightCm: '36.5',
  bodyFatPercentage: '18.5',
  muscleMassKg: '55.2',
  notes: 'Steady progress this week',
  createdAt: new Date('2024-01-15'),
};

const mockProgressPhoto: ProgressPhoto = {
  id: 'photo-123',
  customerId: 'customer-123',
  photoDate: new Date('2024-01-15'),
  photoUrl: 'https://s3.amazonaws.com/bucket/progress-123.jpg',
  thumbnailUrl: 'https://s3.amazonaws.com/bucket/progress-123-thumb.jpg',
  photoType: 'front',
  caption: 'Week 4 progress',
  isPrivate: true,
  createdAt: new Date('2024-01-15'),
};

const mockGoal: CustomerGoal = {
  id: 'goal-123',
  customerId: 'customer-123',
  goalType: 'weight_loss',
  goalName: 'Lose 20 pounds',
  description: 'Target weight loss for summer',
  targetValue: '155.0',
  targetUnit: 'lbs',
  currentValue: '166.4',
  startingValue: '175.0',
  startDate: new Date('2024-01-01'),
  targetDate: new Date('2024-06-01'),
  achievedDate: null,
  status: 'active',
  progressPercentage: 43,
  notes: 'Making good progress',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
};

describe('Profile Management CRUD Operations', () => {
  let app: express.Application;
  const mockDb = vi.mocked(db);
  const mockStorage = vi.mocked(storage);
  const mockS3Upload = vi.mocked(s3Upload);

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/profile', profileRouter);
    app.use('/api/progress', progressRouter);

    vi.clearAllMocks();

    // Default mock implementations
    mockStorage.getUser.mockResolvedValue(mockUser);
    mockStorage.getUserById.mockResolvedValue(mockUser);
    mockStorage.updateUser = vi.fn().mockResolvedValue(mockUser);
    mockStorage.deleteUser = vi.fn().mockResolvedValue(true);
    
    mockS3Upload.uploadProfileImage.mockResolvedValue({
      success: true,
      url: 'https://s3.amazonaws.com/bucket/profile-new.jpg',
      key: 'profiles/profile-new.jpg',
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('User Profile CRUD Operations', () => {
    it('should get user profile', async () => {
      app.use(mockCustomerAuth);

      const response = await request(app)
        .get('/api/profile')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user).toMatchObject({
        id: 'customer-123',
        email: 'customer@example.com',
        name: 'Jane Customer',
        role: 'customer',
      });

      // Should not include password
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should update user profile information', async () => {
      app.use(mockCustomerAuth);

      const updates = {
        name: 'Jane Updated',
        phone: '+1-555-0123',
        bio: 'Fitness enthusiast on a transformation journey',
      };

      const updatedUser = {
        ...mockUser,
        ...updates,
        updatedAt: new Date(),
      };

      mockStorage.updateUser.mockResolvedValue(updatedUser);

      const response = await request(app)
        .put('/api/profile')
        .send(updates)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user.name).toBe('Jane Updated');
      expect(response.body.data.user.bio).toBe('Fitness enthusiast on a transformation journey');

      expect(mockStorage.updateUser).toHaveBeenCalledWith('customer-123', updates);
    });

    it('should validate profile update data', async () => {
      app.use(mockCustomerAuth);

      const invalidUpdates = {
        email: 'invalid-email-format',
        name: '', // Empty name
        phone: '123', // Invalid phone format
      };

      const response = await request(app)
        .put('/api/profile')
        .send(invalidUpdates)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('validation');
      expect(mockStorage.updateUser).not.toHaveBeenCalled();
    });

    it('should prevent updating protected fields', async () => {
      app.use(mockCustomerAuth);

      const protectedUpdates = {
        id: 'new-id',
        role: 'admin',
        createdAt: new Date(),
        password: 'new-password',
      };

      const response = await request(app)
        .put('/api/profile')
        .send(protectedUpdates)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('protected fields');
    });

    it('should delete user profile (admin only)', async () => {
      app.use(mockAdminAuth);

      mockStorage.deleteUser.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/profile/customer-123')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('deleted successfully');
      expect(mockStorage.deleteUser).toHaveBeenCalledWith('customer-123');
    });

    it('should prevent non-admin users from deleting profiles', async () => {
      app.use(mockCustomerAuth);

      const response = await request(app)
        .delete('/api/profile/customer-123')
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Admin access required');
    });

    it('should handle user not found scenarios', async () => {
      app.use(mockCustomerAuth);

      mockStorage.getUser.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/profile')
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('User not found');
    });
  });

  describe('Profile Image Management', () => {
    beforeEach(() => {
      // Mock multer middleware
      const mockMulter = vi.mocked(multer);
      mockMulter.single = vi.fn().mockReturnValue((req: any, res: any, next: any) => {
        req.file = {
          originalname: 'profile.jpg',
          mimetype: 'image/jpeg',
          size: 1024 * 500, // 500KB
          buffer: Buffer.from('mock-image-data'),
        };
        next();
      });
    });

    it('should upload profile image', async () => {
      app.use(mockCustomerAuth);

      const response = await request(app)
        .post('/api/profile/upload-image')
        .attach('profileImage', Buffer.from('mock-image-data'), 'profile.jpg')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.imageUrl).toBe('https://s3.amazonaws.com/bucket/profile-new.jpg');

      expect(mockS3Upload.uploadProfileImage).toHaveBeenCalledWith(
        expect.objectContaining({
          buffer: expect.any(Buffer),
          originalname: 'profile.jpg',
        }),
        'customer-123'
      );
    });

    it('should validate image file type', async () => {
      app.use(mockCustomerAuth);

      // Mock invalid file type
      const mockMulter = vi.mocked(multer);
      mockMulter.single = vi.fn().mockReturnValue((req: any, res: any, next: any) => {
        req.file = {
          originalname: 'document.pdf',
          mimetype: 'application/pdf',
          size: 1024 * 100,
          buffer: Buffer.from('mock-pdf-data'),
        };
        next();
      });

      const response = await request(app)
        .post('/api/profile/upload-image')
        .attach('profileImage', Buffer.from('mock-pdf-data'), 'document.pdf')
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid file type');
    });

    it('should validate image file size', async () => {
      app.use(mockCustomerAuth);

      // Mock oversized file
      const mockMulter = vi.mocked(multer);
      mockMulter.single = vi.fn().mockReturnValue((req: any, res: any, next: any) => {
        req.file = {
          originalname: 'large-image.jpg',
          mimetype: 'image/jpeg',
          size: 1024 * 1024 * 10, // 10MB (too large)
          buffer: Buffer.from('mock-large-image-data'),
        };
        next();
      });

      const response = await request(app)
        .post('/api/profile/upload-image')
        .attach('profileImage', Buffer.alloc(1024 * 1024 * 10), 'large-image.jpg')
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('File too large');
    });

    it('should delete profile image', async () => {
      app.use(mockCustomerAuth);

      mockS3Upload.deleteImage = vi.fn().mockResolvedValue({ success: true });

      const response = await request(app)
        .delete('/api/profile/image')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('removed successfully');

      expect(mockStorage.updateUser).toHaveBeenCalledWith('customer-123', {
        profilePicture: null,
      });
    });

    it('should handle S3 upload failures', async () => {
      app.use(mockCustomerAuth);

      mockS3Upload.uploadProfileImage.mockResolvedValue({
        success: false,
        error: 'S3 upload failed',
      });

      const response = await request(app)
        .post('/api/profile/upload-image')
        .attach('profileImage', Buffer.from('mock-image-data'), 'profile.jpg')
        .expect(500);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Upload failed');
    });
  });

  describe('Progress Measurements Management', () => {
    it('should create new progress measurement', async () => {
      app.use(mockCustomerAuth);

      const measurementData = {
        measurementDate: '2024-01-20T10:00:00.000Z',
        weightKg: 74.8,
        bodyFatPercentage: 17.8,
        chestCm: 97.5,
        waistCm: 84.0,
        notes: 'Feeling stronger this week',
      };

      const newMeasurement = {
        id: 'measurement-456',
        customerId: 'customer-123',
        ...measurementData,
        measurementDate: new Date(measurementData.measurementDate),
        createdAt: new Date(),
      };

      const mockInsertQuery = {
        into: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([newMeasurement]),
      };

      mockDb.insert.mockReturnValue(mockInsertQuery as any);

      const response = await request(app)
        .post('/api/progress/measurements')
        .send(measurementData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.measurement.weightKg).toBe('74.8');
      expect(response.body.data.measurement.customerId).toBe('customer-123');
    });

    it('should get customer progress measurements', async () => {
      app.use(mockCustomerAuth);

      const measurements = [
        mockMeasurement,
        {
          ...mockMeasurement,
          id: 'measurement-456',
          measurementDate: new Date('2024-01-08'),
          weightKg: '76.2',
        },
      ];

      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(measurements),
      };

      mockDb.select.mockReturnValue(mockDbQuery as any);

      const response = await request(app)
        .get('/api/progress/measurements')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.measurements).toHaveLength(2);
      expect(response.body.data.measurements[0].weightKg).toBe('75.5');
    });

    it('should filter measurements by date range', async () => {
      app.use(mockCustomerAuth);

      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([mockMeasurement]),
      };

      mockDb.select.mockReturnValue(mockDbQuery as any);

      const response = await request(app)
        .get('/api/progress/measurements')
        .query({ 
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        })
        .expect(200);

      expect(response.body.data.measurements).toHaveLength(1);
      
      // Verify date filter was applied
      expect(mockDbQuery.where).toHaveBeenCalledWith(
        and(
          eq(progressMeasurements.customerId, 'customer-123'),
          gte(progressMeasurements.measurementDate, expect.any(Date)),
          lte(progressMeasurements.measurementDate, expect.any(Date))
        )
      );
    });

    it('should update existing measurement', async () => {
      app.use(mockCustomerAuth);

      const updates = {
        weightKg: 74.5,
        notes: 'Updated measurement with more accurate scale',
      };

      const updatedMeasurement = {
        ...mockMeasurement,
        ...updates,
        weightKg: '74.5',
        notes: updates.notes,
      };

      const mockUpdateQuery = {
        table: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([updatedMeasurement]),
      };

      mockDb.update.mockReturnValue(mockUpdateQuery as any);

      const response = await request(app)
        .put('/api/progress/measurements/measurement-123')
        .send(updates)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.measurement.weightKg).toBe('74.5');
      expect(response.body.data.measurement.notes).toBe('Updated measurement with more accurate scale');
    });

    it('should delete measurement', async () => {
      app.use(mockCustomerAuth);

      const mockDeleteQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockMeasurement]),
      };

      mockDb.delete.mockReturnValue(mockDeleteQuery as any);

      const response = await request(app)
        .delete('/api/progress/measurements/measurement-123')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('deleted successfully');
    });

    it('should prevent accessing other customers measurements', async () => {
      app.use(mockCustomerAuth);

      // Mock measurement belonging to different customer
      const otherCustomerMeasurement = {
        ...mockMeasurement,
        customerId: 'other-customer-456',
      };

      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]), // No results for current customer
      };

      mockDb.select.mockReturnValue(mockDbQuery as any);

      const response = await request(app)
        .put('/api/progress/measurements/measurement-123')
        .send({ weightKg: 70.0 })
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('not found');
    });
  });

  describe('Progress Photos Management', () => {
    beforeEach(() => {
      mockS3Upload.uploadProgressPhoto = vi.fn().mockResolvedValue({
        success: true,
        url: 'https://s3.amazonaws.com/bucket/progress-new.jpg',
        thumbnailUrl: 'https://s3.amazonaws.com/bucket/progress-new-thumb.jpg',
        key: 'progress/progress-new.jpg',
      });
    });

    it('should upload progress photo', async () => {
      app.use(mockCustomerAuth);

      const photoData = {
        photoDate: '2024-01-20T10:00:00.000Z',
        photoType: 'side',
        caption: 'Week 5 side view',
        isPrivate: false,
      };

      const response = await request(app)
        .post('/api/progress/photos')
        .field('photoData', JSON.stringify(photoData))
        .attach('photo', Buffer.from('mock-image-data'), 'progress.jpg')
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.photo.photoType).toBe('side');
      expect(response.body.data.photo.caption).toBe('Week 5 side view');

      expect(mockS3Upload.uploadProgressPhoto).toHaveBeenCalled();
    });

    it('should get customer progress photos', async () => {
      app.use(mockCustomerAuth);

      const photos = [
        mockProgressPhoto,
        {
          ...mockProgressPhoto,
          id: 'photo-456',
          photoType: 'back',
          caption: 'Back view progress',
        },
      ];

      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(photos),
      };

      mockDb.select.mockReturnValue(mockDbQuery as any);

      const response = await request(app)
        .get('/api/progress/photos')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.photos).toHaveLength(2);
      expect(response.body.data.photos[0].photoType).toBe('front');
    });

    it('should filter photos by type', async () => {
      app.use(mockCustomerAuth);

      const frontPhotos = [mockProgressPhoto];

      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(frontPhotos),
      };

      mockDb.select.mockReturnValue(mockDbQuery as any);

      const response = await request(app)
        .get('/api/progress/photos?type=front')
        .expect(200);

      expect(response.body.data.photos).toHaveLength(1);
      expect(response.body.data.photos[0].photoType).toBe('front');
    });

    it('should update photo privacy settings', async () => {
      app.use(mockCustomerAuth);

      const privacyUpdate = {
        isPrivate: false,
        caption: 'Updated caption',
      };

      const updatedPhoto = {
        ...mockProgressPhoto,
        ...privacyUpdate,
      };

      const mockUpdateQuery = {
        table: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([updatedPhoto]),
      };

      mockDb.update.mockReturnValue(mockUpdateQuery as any);

      const response = await request(app)
        .put('/api/progress/photos/photo-123')
        .send(privacyUpdate)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.photo.isPrivate).toBe(false);
      expect(response.body.data.photo.caption).toBe('Updated caption');
    });

    it('should delete progress photo and S3 files', async () => {
      app.use(mockCustomerAuth);

      const mockDeleteQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockProgressPhoto]),
      };

      mockDb.delete.mockReturnValue(mockDeleteQuery as any);
      mockS3Upload.deleteImage = vi.fn().mockResolvedValue({ success: true });

      const response = await request(app)
        .delete('/api/progress/photos/photo-123')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('deleted successfully');

      // Verify S3 cleanup
      expect(mockS3Upload.deleteImage).toHaveBeenCalledTimes(2); // Main image and thumbnail
    });
  });

  describe('Customer Goals Management', () => {
    it('should create new goal', async () => {
      app.use(mockCustomerAuth);

      const goalData = {
        goalType: 'muscle_gain',
        goalName: 'Build 10 lbs of muscle',
        description: 'Focus on strength training and nutrition',
        targetValue: 10.0,
        targetUnit: 'lbs',
        currentValue: 0.0,
        startingValue: 0.0,
        startDate: '2024-01-20T00:00:00.000Z',
        targetDate: '2024-07-20T00:00:00.000Z',
        notes: 'Working with trainer on progressive overload',
      };

      const newGoal = {
        id: 'goal-456',
        customerId: 'customer-123',
        ...goalData,
        targetValue: '10.0',
        currentValue: '0.0',
        startingValue: '0.0',
        status: 'active',
        progressPercentage: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockInsertQuery = {
        into: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([newGoal]),
      };

      mockDb.insert.mockReturnValue(mockInsertQuery as any);

      const response = await request(app)
        .post('/api/progress/goals')
        .send(goalData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.goal.goalName).toBe('Build 10 lbs of muscle');
      expect(response.body.data.goal.status).toBe('active');
    });

    it('should get customer goals with progress calculation', async () => {
      app.use(mockCustomerAuth);

      const goals = [
        mockGoal,
        {
          ...mockGoal,
          id: 'goal-456',
          goalType: 'body_fat',
          goalName: 'Reduce body fat to 15%',
          targetValue: '15.0',
          currentValue: '18.5',
          startingValue: '22.0',
          progressPercentage: 53, // (22-18.5)/(22-15) * 100
        },
      ];

      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(goals),
      };

      mockDb.select.mockReturnValue(mockDbQuery as any);

      const response = await request(app)
        .get('/api/progress/goals')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.goals).toHaveLength(2);
      expect(response.body.data.goals[0].progressPercentage).toBe(43);
      expect(response.body.data.goals[1].progressPercentage).toBe(53);
    });

    it('should update goal progress', async () => {
      app.use(mockCustomerAuth);

      const progressUpdate = {
        currentValue: 160.0, // Lost 6.4 lbs
        notes: 'Great progress this month!',
      };

      // Calculate new progress percentage
      const newProgressPercentage = Math.round(
        ((175.0 - 160.0) / (175.0 - 155.0)) * 100
      ); // 75%

      const updatedGoal = {
        ...mockGoal,
        currentValue: '160.0',
        progressPercentage: newProgressPercentage,
        notes: progressUpdate.notes,
        updatedAt: new Date(),
      };

      const mockUpdateQuery = {
        table: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([updatedGoal]),
      };

      mockDb.update.mockReturnValue(mockUpdateQuery as any);

      const response = await request(app)
        .put('/api/progress/goals/goal-123')
        .send(progressUpdate)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.goal.currentValue).toBe('160.0');
      expect(response.body.data.goal.progressPercentage).toBe(75);
    });

    it('should mark goal as achieved', async () => {
      app.use(mockCustomerAuth);

      const achievementUpdate = {
        currentValue: 155.0, // Reached target
        status: 'achieved',
        achievedDate: '2024-03-01T00:00:00.000Z',
      };

      const achievedGoal = {
        ...mockGoal,
        currentValue: '155.0',
        status: 'achieved',
        achievedDate: new Date(achievementUpdate.achievedDate),
        progressPercentage: 100,
        updatedAt: new Date(),
      };

      const mockUpdateQuery = {
        table: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([achievedGoal]),
      };

      mockDb.update.mockReturnValue(mockUpdateQuery as any);

      const response = await request(app)
        .put('/api/progress/goals/goal-123')
        .send(achievementUpdate)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.goal.status).toBe('achieved');
      expect(response.body.data.goal.progressPercentage).toBe(100);
      expect(response.body.data.goal.achievedDate).toBeTruthy();
    });

    it('should create goal milestones', async () => {
      app.use(mockCustomerAuth);

      const milestoneData = {
        goalId: 'goal-123',
        milestoneName: 'First 10 pounds',
        targetValue: 165.0,
      };

      const milestone: GoalMilestone = {
        id: 'milestone-123',
        goalId: 'goal-123',
        milestoneName: 'First 10 pounds',
        targetValue: '165.0',
        achievedValue: null,
        achievedDate: null,
        createdAt: new Date(),
      };

      const mockInsertQuery = {
        into: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([milestone]),
      };

      mockDb.insert.mockReturnValue(mockInsertQuery as any);

      const response = await request(app)
        .post('/api/progress/goals/goal-123/milestones')
        .send(milestoneData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.milestone.milestoneName).toBe('First 10 pounds');
    });

    it('should filter goals by status and type', async () => {
      app.use(mockCustomerAuth);

      const activeWeightLossGoals = [mockGoal];

      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(activeWeightLossGoals),
      };

      mockDb.select.mockReturnValue(mockDbQuery as any);

      const response = await request(app)
        .get('/api/progress/goals?status=active&type=weight_loss')
        .expect(200);

      expect(response.body.data.goals).toHaveLength(1);
      expect(response.body.data.goals[0].status).toBe('active');
      expect(response.body.data.goals[0].goalType).toBe('weight_loss');
    });
  });

  describe('Trainer Access to Customer Profiles', () => {
    it('should allow trainer to view customer profile (with permission)', async () => {
      app.use(mockTrainerAuth);

      // Mock trainer-customer relationship verification
      const mockAuthQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          trainerId: 'trainer-123',
          customerId: 'customer-123',
        }]),
      };

      mockDb.select
        .mockReturnValueOnce(mockAuthQuery as any) // Authorization check
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([mockUser]),
        } as any); // User data

      const response = await request(app)
        .get('/api/profile/customer/customer-123')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user.id).toBe('customer-123');
      
      // Should not include sensitive data
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should deny trainer access to unauthorized customer profiles', async () => {
      app.use(mockTrainerAuth);

      // Mock no relationship found
      const mockAuthQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]), // No relationship
      };

      mockDb.select.mockReturnValue(mockAuthQuery as any);

      const response = await request(app)
        .get('/api/profile/customer/unauthorized-customer')
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Not authorized');
    });

    it('should allow trainer to view customer measurements', async () => {
      app.use(mockTrainerAuth);

      // Mock authorization and data retrieval
      const mockAuthQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ trainerId: 'trainer-123' }]),
      };

      const mockMeasurementQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([mockMeasurement]),
      };

      mockDb.select
        .mockReturnValueOnce(mockAuthQuery as any)
        .mockReturnValueOnce(mockMeasurementQuery as any);

      const response = await request(app)
        .get('/api/progress/customer/customer-123/measurements')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.measurements).toHaveLength(1);
    });

    it('should allow trainer to view customer goals', async () => {
      app.use(mockTrainerAuth);

      const mockAuthQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ trainerId: 'trainer-123' }]),
      };

      const mockGoalQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([mockGoal]),
      };

      mockDb.select
        .mockReturnValueOnce(mockAuthQuery as any)
        .mockReturnValueOnce(mockGoalQuery as any);

      const response = await request(app)
        .get('/api/progress/customer/customer-123/goals')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.goals).toHaveLength(1);
      expect(response.body.data.goals[0].customerId).toBe('customer-123');
    });

    it('should respect customer privacy settings for photos', async () => {
      app.use(mockTrainerAuth);

      const publicPhoto = { ...mockProgressPhoto, isPrivate: false };
      const privatePhoto = { ...mockProgressPhoto, id: 'photo-456', isPrivate: true };

      const mockAuthQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ trainerId: 'trainer-123' }]),
      };

      const mockPhotoQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([publicPhoto]), // Only public photos
      };

      mockDb.select
        .mockReturnValueOnce(mockAuthQuery as any)
        .mockReturnValueOnce(mockPhotoQuery as any);

      const response = await request(app)
        .get('/api/progress/customer/customer-123/photos')
        .expect(200);

      expect(response.body.data.photos).toHaveLength(1);
      expect(response.body.data.photos[0].isPrivate).toBe(false);
    });
  });

  describe('Data Privacy and Security', () => {
    it('should anonymize data for analytics', async () => {
      app.use(mockAdminAuth);

      const anonymizedData = {
        totalUsers: 150,
        averageWeightLoss: 12.5,
        commonGoalTypes: ['weight_loss', 'muscle_gain', 'body_fat'],
        progressTrends: [
          { month: '2024-01', avgProgress: 65 },
          { month: '2024-02', avgProgress: 72 },
        ],
      };

      mockStorage.getAnonymizedAnalytics = vi.fn().mockResolvedValue(anonymizedData);

      const response = await request(app)
        .get('/api/profile/analytics')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.totalUsers).toBe(150);
      expect(response.body.data.averageWeightLoss).toBe(12.5);
      
      // Should not contain any personal identifying information
      expect(JSON.stringify(response.body)).not.toMatch(/customer-123|jane.*customer/i);
    });

    it('should encrypt sensitive profile data', async () => {
      app.use(mockCustomerAuth);

      const sensitiveUpdate = {
        medicalConditions: 'Type 2 diabetes, managed',
        emergencyContact: '+1-555-0199',
      };

      // Mock encryption service
      mockStorage.updateUserWithEncryption = vi.fn().mockResolvedValue({
        ...mockUser,
        ...sensitiveUpdate,
      });

      const response = await request(app)
        .put('/api/profile/sensitive')
        .send(sensitiveUpdate)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(mockStorage.updateUserWithEncryption).toHaveBeenCalledWith(
        'customer-123',
        sensitiveUpdate
      );
    });

    it('should audit profile access', async () => {
      app.use(mockTrainerAuth);

      // Mock audit logging
      mockStorage.logProfileAccess = vi.fn().mockResolvedValue();

      const mockAuthQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ trainerId: 'trainer-123' }]),
      };

      mockDb.select.mockReturnValue(mockAuthQuery as any);

      await request(app)
        .get('/api/profile/customer/customer-123')
        .expect(200);

      expect(mockStorage.logProfileAccess).toHaveBeenCalledWith({
        accessorId: 'trainer-123',
        accessorRole: 'trainer',
        targetUserId: 'customer-123',
        action: 'view_profile',
        timestamp: expect.any(Date),
      });
    });

    it('should handle GDPR data export request', async () => {
      app.use(mockCustomerAuth);

      const fullUserData = {
        profile: mockUser,
        measurements: [mockMeasurement],
        photos: [mockProgressPhoto],
        goals: [mockGoal],
        mealPlans: [], // Would include meal plan assignments
        auditLog: [], // Profile access history
      };

      mockStorage.exportAllUserData = vi.fn().mockResolvedValue(fullUserData);

      const response = await request(app)
        .get('/api/profile/export')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toEqual(fullUserData);
      expect(mockStorage.exportAllUserData).toHaveBeenCalledWith('customer-123');
    });

    it('should handle GDPR data deletion request', async () => {
      app.use(mockCustomerAuth);

      mockStorage.deleteAllUserData = vi.fn().mockResolvedValue({
        deletedRecords: {
          profile: 1,
          measurements: 5,
          photos: 3,
          goals: 2,
          mealPlans: 1,
        },
        s3FilesDeleted: 4,
      });

      const response = await request(app)
        .delete('/api/profile/delete-all-data')
        .send({ confirmDeletion: true })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.deletedRecords.profile).toBe(1);
      expect(mockStorage.deleteAllUserData).toHaveBeenCalledWith('customer-123');
    });
  });
});