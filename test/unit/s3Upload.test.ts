import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { uploadProfileImage, uploadProfileImageLocal, deleteProfileImage, validateImageFile } from '../../server/services/s3Upload';

// Mock AWS SDK
const mockSend = vi.fn();
const mockS3Client = {
  send: mockSend,
};

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => mockS3Client),
  PutObjectCommand: vi.fn((params) => ({ params })),
  DeleteObjectCommand: vi.fn((params) => ({ params })),
}));

// Mock Sharp
const mockSharp = {
  resize: vi.fn().mockReturnThis(),
  jpeg: vi.fn().mockReturnThis(),
  toBuffer: vi.fn().mockResolvedValue(Buffer.from('processed-image')),
};

vi.mock('sharp', () => ({
  default: vi.fn(() => mockSharp),
}));

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'test-id-123'),
}));

// Mock file system for local upload
vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('path', () => ({
  join: vi.fn((...args) => args.join('/')),
}));

describe('S3 Upload Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up environment variables
    process.env.AWS_REGION = 'us-east-1';
    process.env.AWS_ACCESS_KEY_ID = 'test-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
    process.env.AWS_S3_BUCKET_NAME = 'test-bucket';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadProfileImage', () => {
    const mockFile = {
      buffer: Buffer.from('test-image-data'),
      mimetype: 'image/jpeg',
      originalname: 'test.jpg',
      size: 1024,
    } as Express.Multer.File;

    it('should successfully upload image to S3', async () => {
      mockSend.mockResolvedValue({});

      const result = await uploadProfileImage(mockFile, 'user-123');

      expect(result).toBe('https://test-bucket.s3.us-east-1.amazonaws.com/profile-images/user-123/test-id-123.jpg');
      
      // Verify Sharp was called for image processing
      expect(mockSharp.resize).toHaveBeenCalledWith(200, 200, {
        fit: 'cover',
        position: 'center'
      });
      expect(mockSharp.jpeg).toHaveBeenCalledWith({ quality: 85 });
      expect(mockSharp.toBuffer).toHaveBeenCalled();

      // Verify S3 upload was called
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            Bucket: 'test-bucket',
            Key: 'profile-images/user-123/test-id-123.jpg',
            Body: Buffer.from('processed-image'),
            ContentType: 'image/jpeg',
            CacheControl: 'max-age=31536000',
            ACL: 'public-read',
          })
        })
      );
    });

    it('should handle S3 upload errors', async () => {
      mockSend.mockRejectedValue(new Error('S3 upload failed'));

      await expect(uploadProfileImage(mockFile, 'user-123')).rejects.toThrow('Failed to upload profile image');
    });

    it('should handle image processing errors', async () => {
      mockSharp.toBuffer.mockRejectedValue(new Error('Image processing failed'));

      await expect(uploadProfileImage(mockFile, 'user-123')).rejects.toThrow('Failed to upload profile image');
    });

    it('should convert all images to JPEG format', async () => {
      const pngFile = {
        ...mockFile,
        mimetype: 'image/png',
        originalname: 'test.png',
      } as Express.Multer.File;

      mockSend.mockResolvedValue({});

      const result = await uploadProfileImage(pngFile, 'user-123');

      expect(result).toContain('.jpg');
      expect(mockSharp.jpeg).toHaveBeenCalledWith({ quality: 85 });
    });

    it('should use default bucket name when not specified', async () => {
      delete process.env.AWS_S3_BUCKET_NAME;
      mockSend.mockResolvedValue({});

      await uploadProfileImage(mockFile, 'user-123');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            Bucket: 'fitnessmealplanner-uploads',
          })
        })
      );
    });
  });

  describe('uploadProfileImageLocal', () => {
    const mockFile = {
      buffer: Buffer.from('test-image-data'),
      mimetype: 'image/jpeg',
      originalname: 'test.jpg',
      size: 1024,
    } as Express.Multer.File;

    it('should successfully upload image locally', async () => {
      const fs = await import('fs/promises');
      const result = await uploadProfileImageLocal(mockFile, 'user-123');

      expect(result).toBe('/uploads/profile-images/user-123-test-id-123.jpg');

      // Verify directory creation
      expect(fs.mkdir).toHaveBeenCalledWith(
        'uploads/profile-images',
        { recursive: true }
      );

      // Verify file write
      expect(fs.writeFile).toHaveBeenCalledWith(
        'uploads/profile-images/user-123-test-id-123.jpg',
        Buffer.from('processed-image')
      );

      // Verify image processing
      expect(mockSharp.resize).toHaveBeenCalledWith(200, 200, {
        fit: 'cover',
        position: 'center'
      });
      expect(mockSharp.jpeg).toHaveBeenCalledWith({ quality: 85 });
    });

    it('should handle file system errors', async () => {
      const fs = await import('fs/promises');
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('File write failed'));

      await expect(uploadProfileImageLocal(mockFile, 'user-123')).rejects.toThrow('Failed to upload profile image');
    });

    it('should handle directory creation errors', async () => {
      const fs = await import('fs/promises');
      vi.mocked(fs.mkdir).mockRejectedValue(new Error('Directory creation failed'));

      await expect(uploadProfileImageLocal(mockFile, 'user-123')).rejects.toThrow('Failed to upload profile image');
    });
  });

  describe('deleteProfileImage', () => {
    it('should successfully delete S3 image', async () => {
      mockSend.mockResolvedValue({});

      await deleteProfileImage('https://test-bucket.s3.us-east-1.amazonaws.com/profile-images/user-123/image.jpg');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            Bucket: 'test-bucket',
            Key: 'profile-images/user-123/image.jpg',
          })
        })
      );
    });

    it('should handle invalid URLs gracefully', async () => {
      // Should not throw for invalid URLs
      await expect(deleteProfileImage('invalid-url')).resolves.toBeUndefined();
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should handle S3 deletion errors gracefully', async () => {
      mockSend.mockRejectedValue(new Error('S3 deletion failed'));

      // Should not throw errors for deletion failures
      await expect(deleteProfileImage('https://test-bucket.s3.us-east-1.amazonaws.com/profile-images/user-123/image.jpg')).resolves.toBeUndefined();
    });

    it('should extract correct key from complex URLs', async () => {
      mockSend.mockResolvedValue({});

      await deleteProfileImage('https://test-bucket.s3.us-east-1.amazonaws.com/profile-images/user-123/subfolder/image.jpg');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            Key: 'profile-images/user-123/subfolder/image.jpg',
          })
        })
      );
    });
  });

  describe('validateImageFile', () => {
    it('should validate valid JPEG file', () => {
      const file = {
        mimetype: 'image/jpeg',
        size: 1024 * 1024, // 1MB
      } as Express.Multer.File;

      const result = validateImageFile(file);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate valid PNG file', () => {
      const file = {
        mimetype: 'image/png',
        size: 1024 * 1024, // 1MB
      } as Express.Multer.File;

      const result = validateImageFile(file);

      expect(result.valid).toBe(true);
    });

    it('should validate valid WebP file', () => {
      const file = {
        mimetype: 'image/webp',
        size: 1024 * 1024, // 1MB
      } as Express.Multer.File;

      const result = validateImageFile(file);

      expect(result.valid).toBe(true);
    });

    it('should reject invalid file types', () => {
      const file = {
        mimetype: 'text/plain',
        size: 1024,
      } as Express.Multer.File;

      const result = validateImageFile(file);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
    });

    it('should reject files that are too large', () => {
      const file = {
        mimetype: 'image/jpeg',
        size: 6 * 1024 * 1024, // 6MB
      } as Express.Multer.File;

      const result = validateImageFile(file);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('File too large. Maximum size is 5MB.');
    });

    it('should reject when no file is provided', () => {
      const result = validateImageFile(null as any);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('No file provided');
    });

    it('should reject undefined file', () => {
      const result = validateImageFile(undefined as any);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('No file provided');
    });

    it('should handle edge case file sizes', () => {
      // Exactly 5MB should be valid
      const exactSizeFile = {
        mimetype: 'image/jpeg',
        size: 5 * 1024 * 1024,
      } as Express.Multer.File;

      const result = validateImageFile(exactSizeFile);

      expect(result.valid).toBe(true);

      // Just over 5MB should be invalid
      const overSizeFile = {
        mimetype: 'image/jpeg',
        size: 5 * 1024 * 1024 + 1,
      } as Express.Multer.File;

      const overResult = validateImageFile(overSizeFile);

      expect(overResult.valid).toBe(false);
    });

    it('should handle case-insensitive mime types', () => {
      const file = {
        mimetype: 'IMAGE/JPEG',
        size: 1024,
      } as Express.Multer.File;

      // Current implementation is case-sensitive, but we test behavior
      const result = validateImageFile(file);

      // Should fail with current implementation (case-sensitive)
      expect(result.valid).toBe(false);
    });
  });

  describe('Environment Configuration', () => {
    it('should use default AWS region when not specified', async () => {
      delete process.env.AWS_REGION;
      
      const mockFile = {
        buffer: Buffer.from('test'),
        mimetype: 'image/jpeg',
        originalname: 'test.jpg',
        size: 1024,
      } as Express.Multer.File;

      mockSend.mockResolvedValue({});

      const result = await uploadProfileImage(mockFile, 'user-123');

      expect(result).toContain('us-east-1');
    });

    it('should use custom AWS region when specified', async () => {
      process.env.AWS_REGION = 'eu-west-1';
      
      const mockFile = {
        buffer: Buffer.from('test'),
        mimetype: 'image/jpeg',
        originalname: 'test.jpg',
        size: 1024,
      } as Express.Multer.File;

      mockSend.mockResolvedValue({});

      const result = await uploadProfileImage(mockFile, 'user-123');

      expect(result).toContain('eu-west-1');
    });
  });
});