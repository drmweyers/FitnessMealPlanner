import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../server/index';
import { db } from '../../server/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';

// Mock the S3 upload service
vi.mock('../../server/services/s3Upload', () => ({
  upload: {
    single: () => (req: any, res: any, next: any) => {
      // Mock multer middleware
      if (req.file) {
        next();
      } else {
        req.file = {
          buffer: Buffer.from('fake-image-data'),
          mimetype: 'image/jpeg',
          originalname: 'test.jpg',
          size: 1024,
        };
        next();
      }
    },
  },
  uploadProfileImage: vi.fn(),
  uploadProfileImageLocal: vi.fn(),
  deleteProfileImage: vi.fn(),
  validateImageFile: vi.fn(),
}));

// Mock Sharp for image processing
vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    resize: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('processed-image')),
  })),
}));

// Mock file system operations
vi.mock('fs/promises');
vi.mock('path');

const mockUploadProfileImage = vi.fn();
const mockUploadProfileImageLocal = vi.fn();
const mockDeleteProfileImage = vi.fn();
const mockValidateImageFile = vi.fn();
const mockFs = vi.mocked(fs);
const mockPath = vi.mocked(path);

// Import mocked functions
const s3Upload = await import('../../server/services/s3Upload');
vi.mocked(s3Upload.uploadProfileImage).mockImplementation(mockUploadProfileImage);
vi.mocked(s3Upload.uploadProfileImageLocal).mockImplementation(mockUploadProfileImageLocal);
vi.mocked(s3Upload.deleteProfileImage).mockImplementation(mockDeleteProfileImage);
vi.mocked(s3Upload.validateImageFile).mockImplementation(mockValidateImageFile);

describe('Profile Routes', () => {
  let testUserId: string;
  let authToken: string;

  beforeEach(async () => {
    // Clear mocks
    vi.clearAllMocks();
    
    // Set up default mock returns
    mockValidateImageFile.mockReturnValue({ valid: true });
    mockUploadProfileImageLocal.mockResolvedValue('/uploads/profile-images/test.jpg');
    mockUploadProfileImage.mockResolvedValue('https://s3.amazonaws.com/bucket/test.jpg');
    
    // Create a test user
    const [user] = await db.insert(users).values({
      email: 'test@example.com',
      password: 'hashedpassword',
      role: 'customer',
    }).returning();
    
    testUserId = user.id;
    
    // Generate auth token
    authToken = jwt.sign(
      { id: testUserId, email: 'test@example.com', role: 'customer' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterEach(async () => {
    // Clean up test user
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  describe('POST /api/profile/upload-image', () => {
    it('should successfully upload profile image in development mode', async () => {
      process.env.NODE_ENV = 'development';
      
      const response = await request(app)
        .post('/api/profile/upload-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('profileImage', Buffer.from('fake-image'), 'test.jpg');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.profileImageUrl).toBe('/uploads/profile-images/test.jpg');
      expect(response.body.data.user.id).toBe(testUserId);
      
      // Verify the upload function was called
      expect(mockUploadProfileImageLocal).toHaveBeenCalledWith(
        expect.any(Object),
        testUserId
      );
      
      // Verify database was updated
      const [updatedUser] = await db.select().from(users).where(eq(users.id, testUserId));
      expect(updatedUser.profilePicture).toBe('/uploads/profile-images/test.jpg');
    });

    it('should successfully upload profile image in production mode', async () => {
      process.env.NODE_ENV = 'production';
      process.env.AWS_ACCESS_KEY_ID = 'test-key';
      
      const response = await request(app)
        .post('/api/profile/upload-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('profileImage', Buffer.from('fake-image'), 'test.jpg');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.profileImageUrl).toBe('https://s3.amazonaws.com/bucket/test.jpg');
      
      // Verify the S3 upload function was called
      expect(mockUploadProfileImage).toHaveBeenCalledWith(
        expect.any(Object),
        testUserId
      );
      
      // Clean up
      delete process.env.AWS_ACCESS_KEY_ID;
      process.env.NODE_ENV = 'development';
    });

    it('should replace existing profile image', async () => {
      // Set existing profile image
      await db.update(users)
        .set({ profilePicture: '/uploads/old-image.jpg' })
        .where(eq(users.id, testUserId));

      const response = await request(app)
        .post('/api/profile/upload-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('profileImage', Buffer.from('fake-image'), 'test.jpg');

      expect(response.status).toBe(200);
      expect(mockDeleteProfileImage).toHaveBeenCalledWith('/uploads/old-image.jpg');
    });

    it('should return 400 if no file is provided', async () => {
      const response = await request(app)
        .post('/api/profile/upload-image')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('No image file provided');
      expect(response.body.code).toBe('NO_FILE');
    });

    it('should return 400 if file validation fails', async () => {
      mockValidateImageFile.mockReturnValue({
        valid: false,
        error: 'Invalid file type'
      });

      const response = await request(app)
        .post('/api/profile/upload-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('profileImage', Buffer.from('fake-image'), 'test.txt');

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Invalid file type');
      expect(response.body.code).toBe('INVALID_FILE');
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .post('/api/profile/upload-image')
        .attach('profileImage', Buffer.from('fake-image'), 'test.jpg');

      expect(response.status).toBe(401);
    });

    it('should return 404 if user not found', async () => {
      // Delete the user
      await db.delete(users).where(eq(users.id, testUserId));
      
      const response = await request(app)
        .post('/api/profile/upload-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('profileImage', Buffer.from('fake-image'), 'test.jpg');

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('User not found');
      expect(response.body.code).toBe('USER_NOT_FOUND');
    });

    it('should handle upload service errors', async () => {
      mockUploadProfileImageLocal.mockRejectedValue(new Error('Upload failed'));

      const response = await request(app)
        .post('/api/profile/upload-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('profileImage', Buffer.from('fake-image'), 'test.jpg');

      expect(response.status).toBe(500);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Failed to upload profile image');
      expect(response.body.code).toBe('UPLOAD_ERROR');
    });
  });

  describe('DELETE /api/profile/delete-image', () => {
    beforeEach(async () => {
      // Set profile image for deletion tests
      await db.update(users)
        .set({ profilePicture: '/uploads/test-image.jpg' })
        .where(eq(users.id, testUserId));
    });

    it('should successfully delete profile image', async () => {
      const response = await request(app)
        .delete('/api/profile/delete-image')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.user.profilePicture).toBeNull();
      
      // Verify database was updated
      const [updatedUser] = await db.select().from(users).where(eq(users.id, testUserId));
      expect(updatedUser.profilePicture).toBeNull();
    });

    it('should delete local file for local images', async () => {
      mockPath.join.mockReturnValue('/app/public/uploads/test-image.jpg');
      mockFs.unlink.mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/profile/delete-image')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(mockFs.unlink).toHaveBeenCalledWith('/app/public/uploads/test-image.jpg');
    });

    it('should delete S3 file for S3 images', async () => {
      await db.update(users)
        .set({ profilePicture: 'https://s3.amazonaws.com/bucket/test.jpg' })
        .where(eq(users.id, testUserId));

      const response = await request(app)
        .delete('/api/profile/delete-image')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(mockDeleteProfileImage).toHaveBeenCalledWith('https://s3.amazonaws.com/bucket/test.jpg');
    });

    it('should return 400 if no profile image exists', async () => {
      await db.update(users)
        .set({ profilePicture: null })
        .where(eq(users.id, testUserId));

      const response = await request(app)
        .delete('/api/profile/delete-image')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('No profile image to delete');
      expect(response.body.code).toBe('NO_IMAGE');
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .delete('/api/profile/delete-image');

      expect(response.status).toBe(401);
    });

    it('should handle file deletion errors gracefully', async () => {
      mockFs.unlink.mockRejectedValue(new Error('File not found'));

      const response = await request(app)
        .delete('/api/profile/delete-image')
        .set('Authorization', `Bearer ${authToken}`);

      // Should still succeed even if file deletion fails
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      
      // Database should still be updated
      const [updatedUser] = await db.select().from(users).where(eq(users.id, testUserId));
      expect(updatedUser.profilePicture).toBeNull();
    });
  });

  describe('GET /api/profile', () => {
    beforeEach(async () => {
      await db.update(users)
        .set({ profilePicture: '/uploads/test-image.jpg' })
        .where(eq(users.id, testUserId));
    });

    it('should return user profile with image', async () => {
      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toEqual({
        id: testUserId,
        email: 'test@example.com',
        role: 'customer',
        profilePicture: '/uploads/test-image.jpg',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('should return user profile without image', async () => {
      await db.update(users)
        .set({ profilePicture: null })
        .where(eq(users.id, testUserId));

      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.profilePicture).toBeNull();
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/api/profile');

      expect(response.status).toBe(401);
    });

    it('should return 404 if user not found', async () => {
      await db.delete(users).where(eq(users.id, testUserId));

      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('User not found');
      expect(response.body.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('Role-based Access', () => {
    it('should work for admin users', async () => {
      await db.update(users)
        .set({ role: 'admin' })
        .where(eq(users.id, testUserId));

      const adminToken = jwt.sign(
        { id: testUserId, email: 'test@example.com', role: 'admin' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/api/profile/upload-image')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('profileImage', Buffer.from('fake-image'), 'test.jpg');

      expect(response.status).toBe(200);
    });

    it('should work for trainer users', async () => {
      await db.update(users)
        .set({ role: 'trainer' })
        .where(eq(users.id, testUserId));

      const trainerToken = jwt.sign(
        { id: testUserId, email: 'test@example.com', role: 'trainer' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/api/profile/upload-image')
        .set('Authorization', `Bearer ${trainerToken}`)
        .attach('profileImage', Buffer.from('fake-image'), 'test.jpg');

      expect(response.status).toBe(200);
    });

    it('should work for customer users', async () => {
      const response = await request(app)
        .post('/api/profile/upload-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('profileImage', Buffer.from('fake-image'), 'test.jpg');

      expect(response.status).toBe(200);
    });
  });
});