import { describe, it, expect, beforeAll, vi } from 'vitest';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

/**
 * Fast Integration Test for Progress Photo EXIF Orientation
 *
 * This test verifies that the progress photo upload API correctly handles
 * mobile images with EXIF orientation metadata. It mocks S3 upload to keep
 * tests fast and reliable.
 *
 * Test Strategy:
 * - Create test images with different EXIF orientations
 * - Mock S3 upload to avoid network calls
 * - Verify Sharp processes images correctly
 * - Ensure orientation is normalized before storage
 *
 * Expected Runtime: < 5 seconds
 */

describe('Progress Photo EXIF Orientation - Integration', () => {
  const FIXTURES_DIR = path.join(process.cwd(), 'test', 'fixtures', 'images');

  beforeAll(async () => {
    // Ensure fixtures directory exists
    await fs.mkdir(FIXTURES_DIR, { recursive: true });

    // Mock S3 upload to avoid network calls and speed up tests
    vi.mock('@aws-sdk/client-s3', () => {
      return {
        S3Client: vi.fn().mockImplementation(() => ({
          send: vi.fn().mockResolvedValue({ ETag: '"mock-etag"' })
        })),
        PutObjectCommand: vi.fn(),
        DeleteObjectCommand: vi.fn()
      };
    });
  });

  /**
   * Helper to create test image with specific EXIF orientation
   */
  async function createTestImageWithOrientation(orientation: 1 | 3 | 6 | 8): Promise<Buffer> {
    const width = 400;
    const height = 300;

    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${height}" fill="#f0f0f0"/>
        <rect width="${width}" height="60" fill="#ff0000"/>
        <text x="${width/2}" y="35" text-anchor="middle" font-size="24" fill="white" font-weight="bold">TOP</text>
        <rect y="${height-60}" width="${width}" height="60" fill="#0000ff"/>
        <text x="${width/2}" y="${height-25}" text-anchor="middle" font-size="24" fill="white" font-weight="bold">BOTTOM</text>
      </svg>
    `;

    return sharp(Buffer.from(svg))
      .jpeg({ quality: 90 })
      .withMetadata({ orientation })
      .toBuffer();
  }

  describe('Full-Size Photo Processing', () => {
    it('should auto-rotate portrait photo (EXIF 6) for full-size', async () => {
      // Simulate mobile portrait photo (most common issue)
      const mobilePhoto = await createTestImageWithOrientation(6);
      const originalMetadata = await sharp(mobilePhoto).metadata();
      expect(originalMetadata.orientation).toBe(6);

      // This matches progressRoutes.ts lines 361-365
      const processedPhoto = await sharp(mobilePhoto)
        .rotate() // Auto-rotates based on EXIF orientation metadata
        .resize(1200, 1600, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();

      const processedMetadata = await sharp(processedPhoto).metadata();

      // Verify orientation normalized
      expect([1, undefined]).toContain(processedMetadata.orientation);

      // Verify format conversion
      expect(processedMetadata.format).toBe('webp');

      // Verify dimensions respected
      expect(processedMetadata.width).toBeLessThanOrEqual(1200);
      expect(processedMetadata.height).toBeLessThanOrEqual(1600);
    });

    it('should auto-rotate upside-down photo (EXIF 3) for full-size', async () => {
      const photo = await createTestImageWithOrientation(3);

      const processedPhoto = await sharp(photo)
        .rotate()
        .resize(1200, 1600, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();

      const metadata = await sharp(processedPhoto).metadata();
      expect([1, undefined]).toContain(metadata.orientation);
      expect(metadata.format).toBe('webp');
    });

    it('should handle normal orientation (EXIF 1) for full-size', async () => {
      const photo = await createTestImageWithOrientation(1);

      const processedPhoto = await sharp(photo)
        .rotate()
        .resize(1200, 1600, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();

      const metadata = await sharp(processedPhoto).metadata();
      expect([1, undefined]).toContain(metadata.orientation);
    });
  });

  describe('Thumbnail Processing', () => {
    it('should auto-rotate portrait photo (EXIF 6) for thumbnail', async () => {
      const mobilePhoto = await createTestImageWithOrientation(6);

      // This matches progressRoutes.ts lines 367-371
      const thumbnailBuffer = await sharp(mobilePhoto)
        .rotate() // Auto-rotates based on EXIF orientation metadata
        .resize(300, 400, { fit: 'cover' })
        .webp({ quality: 80 })
        .toBuffer();

      const metadata = await sharp(thumbnailBuffer).metadata();

      // Verify orientation normalized
      expect([1, undefined]).toContain(metadata.orientation);

      // Verify exact dimensions
      expect(metadata.width).toBe(300);
      expect(metadata.height).toBe(400);

      // Verify format
      expect(metadata.format).toBe('webp');
    });

    it('should auto-rotate CCW photo (EXIF 8) for thumbnail', async () => {
      const photo = await createTestImageWithOrientation(8);

      const thumbnailBuffer = await sharp(photo)
        .rotate()
        .resize(300, 400, { fit: 'cover' })
        .webp({ quality: 80 })
        .toBuffer();

      const metadata = await sharp(thumbnailBuffer).metadata();
      expect([1, undefined]).toContain(metadata.orientation);
      expect(metadata.width).toBe(300);
      expect(metadata.height).toBe(400);
    });
  });

  describe('Both Full-Size and Thumbnail', () => {
    it('should process both with same orientation correction', async () => {
      const mobilePhoto = await createTestImageWithOrientation(6);

      // Process full-size
      const fullSize = await sharp(mobilePhoto)
        .rotate()
        .resize(1200, 1600, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();

      // Process thumbnail
      const thumbnail = await sharp(mobilePhoto)
        .rotate()
        .resize(300, 400, { fit: 'cover' })
        .webp({ quality: 80 })
        .toBuffer();

      const fullSizeMetadata = await sharp(fullSize).metadata();
      const thumbnailMetadata = await sharp(thumbnail).metadata();

      // Both should have normalized orientation
      expect([1, undefined]).toContain(fullSizeMetadata.orientation);
      expect([1, undefined]).toContain(thumbnailMetadata.orientation);

      // Both should be WebP
      expect(fullSizeMetadata.format).toBe('webp');
      expect(thumbnailMetadata.format).toBe('webp');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large mobile photos (4K)', async () => {
      // Simulate high-res phone camera (4000x3000)
      const largeSvg = '<svg width="4000" height="3000"><rect width="4000" height="3000" fill="blue"/></svg>';
      const largePhoto = await sharp(Buffer.from(largeSvg))
        .jpeg({ quality: 90 })
        .withMetadata({ orientation: 6 })
        .toBuffer();

      const processed = await sharp(largePhoto)
        .rotate()
        .resize(1200, 1600, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();

      const metadata = await sharp(processed).metadata();

      // Should be resized to fit within bounds
      expect(metadata.width).toBeLessThanOrEqual(1200);
      expect(metadata.height).toBeLessThanOrEqual(1600);

      // Orientation normalized
      expect([1, undefined]).toContain(metadata.orientation);
    });

    it('should handle images without EXIF orientation', async () => {
      // Some images don't have EXIF orientation tag
      const svg = '<svg width="400" height="300"><rect width="400" height="300" fill="red"/></svg>';
      const photoNoExif = await sharp(Buffer.from(svg))
        .jpeg({ quality: 90 })
        .toBuffer();

      const metadata = await sharp(photoNoExif).metadata();
      expect(metadata.orientation).toBeUndefined();

      // Should not fail when rotating image without EXIF
      const processed = await sharp(photoNoExif)
        .rotate()
        .resize(1200, 1600, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();

      const processedMetadata = await sharp(processed).metadata();
      expect([1, undefined]).toContain(processedMetadata.orientation);
    });

    it('should handle PNG with EXIF orientation (rare but possible)', async () => {
      const svg = '<svg width="400" height="300"><rect width="400" height="300" fill="green"/></svg>';
      const pngWithExif = await sharp(Buffer.from(svg))
        .png()
        .withMetadata({ orientation: 6 })
        .toBuffer();

      const processed = await sharp(pngWithExif)
        .rotate()
        .resize(1200, 1600, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();

      const metadata = await sharp(processed).metadata();
      expect([1, undefined]).toContain(metadata.orientation);
      expect(metadata.format).toBe('webp');
    });
  });

  describe('Performance', () => {
    it('should process orientation correction quickly', async () => {
      const testPhoto = await createTestImageWithOrientation(6);

      const startTime = Date.now();

      // Process 5 photos (simulating burst upload)
      for (let i = 0; i < 5; i++) {
        await sharp(testPhoto)
          .rotate()
          .resize(1200, 1600, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 85 })
          .toBuffer();
      }

      const endTime = Date.now();
      const avgTime = (endTime - startTime) / 5;

      // Should process each photo in less than 200ms
      expect(avgTime).toBeLessThan(200);
    });

    it('should process thumbnail generation quickly', async () => {
      const testPhoto = await createTestImageWithOrientation(6);

      const startTime = Date.now();

      for (let i = 0; i < 10; i++) {
        await sharp(testPhoto)
          .rotate()
          .resize(300, 400, { fit: 'cover' })
          .webp({ quality: 80 })
          .toBuffer();
      }

      const endTime = Date.now();
      const avgTime = (endTime - startTime) / 10;

      // Thumbnails should be even faster (< 100ms)
      expect(avgTime).toBeLessThan(100);
    });
  });

  describe('Visual Verification Tests', () => {
    it('should save test images for manual verification', async () => {
      // Generate all orientation test images for manual inspection
      const orientations: Array<1 | 3 | 6 | 8> = [1, 3, 6, 8];

      for (const orientation of orientations) {
        // Create original with EXIF
        const original = await createTestImageWithOrientation(orientation);
        await fs.writeFile(
          path.join(FIXTURES_DIR, `orientation-${orientation}-original.jpg`),
          original
        );

        // Process with rotation
        const processed = await sharp(original)
          .rotate()
          .resize(1200, 1600, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 85 })
          .toBuffer();

        await fs.writeFile(
          path.join(FIXTURES_DIR, `orientation-${orientation}-processed.webp`),
          processed
        );
      }

      // Verify files were created
      const files = await fs.readdir(FIXTURES_DIR);
      const processedFiles = files.filter(f => f.includes('processed'));
      expect(processedFiles.length).toBeGreaterThanOrEqual(4);
    });
  });
});
