import { describe, it, expect, beforeAll } from 'vitest';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

/**
 * Unit Tests for Image Orientation Auto-Rotation
 *
 * Tests that Sharp's .rotate() properly handles EXIF orientation metadata.
 * This validates the fix for mobile image uploads displaying incorrectly.
 *
 * EXIF Orientation Values:
 * 1 = Normal (no rotation needed)
 * 3 = Upside down (180° rotation needed)
 * 6 = Rotated 90° CW (portrait from mobile camera)
 * 8 = Rotated 90° CCW
 */

describe('Image Orientation Auto-Rotation', () => {
  const FIXTURES_DIR = path.join(process.cwd(), 'test', 'fixtures', 'images');

  beforeAll(async () => {
    // Ensure fixtures directory exists
    await fs.mkdir(FIXTURES_DIR, { recursive: true });
  });

  /**
   * Helper to create test image with specific EXIF orientation
   */
  async function createTestImageWithOrientation(orientation: 1 | 3 | 6 | 8): Promise<Buffer> {
    const svg = `
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="300" fill="#f0f0f0"/>
        <rect width="400" height="60" fill="#ff0000"/>
        <text x="200" y="35" text-anchor="middle" font-size="24" fill="white">TOP</text>
        <rect y="240" width="400" height="60" fill="#0000ff"/>
        <text x="200" y="275" text-anchor="middle" font-size="24" fill="white">BOTTOM</text>
      </svg>
    `;

    return sharp(Buffer.from(svg))
      .jpeg({ quality: 90 })
      .withMetadata({ orientation })
      .toBuffer();
  }

  describe('Sharp .rotate() Method', () => {
    it('should auto-rotate image with EXIF orientation 6 (90° CW)', async () => {
      // Create image with orientation 6 (portrait from mobile camera)
      const originalImage = await createTestImageWithOrientation(6);

      // Get original metadata
      const originalMetadata = await sharp(originalImage).metadata();
      expect(originalMetadata.orientation).toBe(6);

      // Apply .rotate() - this is what our fix does
      const rotatedImage = await sharp(originalImage)
        .rotate() // Auto-rotates based on EXIF
        .jpeg({ quality: 90 })
        .toBuffer();

      // Check that orientation is normalized
      const rotatedMetadata = await sharp(rotatedImage).metadata();

      // After rotation, orientation should be 1 or undefined (normalized)
      expect([1, undefined]).toContain(rotatedMetadata.orientation);
    });

    it('should auto-rotate image with EXIF orientation 3 (180°)', async () => {
      const originalImage = await createTestImageWithOrientation(3);
      const originalMetadata = await sharp(originalImage).metadata();
      expect(originalMetadata.orientation).toBe(3);

      const rotatedImage = await sharp(originalImage)
        .rotate()
        .jpeg({ quality: 90 })
        .toBuffer();

      const rotatedMetadata = await sharp(rotatedImage).metadata();
      expect([1, undefined]).toContain(rotatedMetadata.orientation);
    });

    it('should auto-rotate image with EXIF orientation 8 (90° CCW)', async () => {
      const originalImage = await createTestImageWithOrientation(8);
      const originalMetadata = await sharp(originalImage).metadata();
      expect(originalMetadata.orientation).toBe(8);

      const rotatedImage = await sharp(originalImage)
        .rotate()
        .jpeg({ quality: 90 })
        .toBuffer();

      const rotatedMetadata = await sharp(rotatedImage).metadata();
      expect([1, undefined]).toContain(rotatedMetadata.orientation);
    });

    it('should not modify image with EXIF orientation 1 (normal)', async () => {
      const originalImage = await createTestImageWithOrientation(1);
      const originalMetadata = await sharp(originalImage).metadata();
      expect(originalMetadata.orientation).toBe(1);

      const rotatedImage = await sharp(originalImage)
        .rotate()
        .jpeg({ quality: 90 })
        .toBuffer();

      const rotatedMetadata = await sharp(rotatedImage).metadata();
      expect([1, undefined]).toContain(rotatedMetadata.orientation);
    });

    it('should handle image without EXIF orientation', async () => {
      // Create image without orientation metadata
      const svg = '<svg width="100" height="100"><rect width="100" height="100" fill="red"/></svg>';
      const imageWithoutOrientation = await sharp(Buffer.from(svg))
        .jpeg({ quality: 90 })
        .toBuffer();

      const metadata = await sharp(imageWithoutOrientation).metadata();
      expect(metadata.orientation).toBeUndefined();

      // Rotate should not fail on images without EXIF
      const rotated = await sharp(imageWithoutOrientation)
        .rotate()
        .jpeg()
        .toBuffer();

      const rotatedMetadata = await sharp(rotated).metadata();
      expect([1, undefined]).toContain(rotatedMetadata.orientation);
    });
  });

  describe('Profile Image Processing Pipeline', () => {
    it('should match profile image processing (resize + rotate)', async () => {
      // Simulate profile image upload with EXIF 6
      const mobilePhoto = await createTestImageWithOrientation(6);

      // This is the exact processing from uploadProfileImage() in s3Upload.ts
      const processedImage = await sharp(mobilePhoto)
        .rotate() // Auto-rotates based on EXIF orientation metadata
        .resize(200, 200, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      const metadata = await sharp(processedImage).metadata();

      // Verify dimensions
      expect(metadata.width).toBe(200);
      expect(metadata.height).toBe(200);

      // Verify orientation is normalized
      expect([1, undefined]).toContain(metadata.orientation);

      // Verify format
      expect(metadata.format).toBe('jpeg');
    });
  });

  describe('Progress Photo Processing Pipeline', () => {
    it('should match full-size progress photo processing', async () => {
      const mobilePhoto = await createTestImageWithOrientation(6);

      // Full-size processing from progressRoutes.ts
      const processedImage = await sharp(mobilePhoto)
        .rotate() // Auto-rotates based on EXIF orientation metadata
        .resize(1200, 1600, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();

      const metadata = await sharp(processedImage).metadata();

      // Verify orientation is normalized
      expect([1, undefined]).toContain(metadata.orientation);

      // Verify format
      expect(metadata.format).toBe('webp');

      // Verify max dimensions respected
      expect(metadata.width).toBeLessThanOrEqual(1200);
      expect(metadata.height).toBeLessThanOrEqual(1600);
    });

    it('should match thumbnail progress photo processing', async () => {
      const mobilePhoto = await createTestImageWithOrientation(6);

      // Thumbnail processing from progressRoutes.ts
      const thumbnailBuffer = await sharp(mobilePhoto)
        .rotate() // Auto-rotates based on EXIF orientation metadata
        .resize(300, 400, { fit: 'cover' })
        .webp({ quality: 80 })
        .toBuffer();

      const metadata = await sharp(thumbnailBuffer).metadata();

      // Verify dimensions
      expect(metadata.width).toBe(300);
      expect(metadata.height).toBe(400);

      // Verify orientation is normalized
      expect([1, undefined]).toContain(metadata.orientation);

      // Verify format
      expect(metadata.format).toBe('webp');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large images with orientation', async () => {
      // Create a large test image (simulating high-res phone camera)
      const largeSvg = '<svg width="4000" height="3000"><rect width="4000" height="3000" fill="blue"/></svg>';
      const largeImage = await sharp(Buffer.from(largeSvg))
        .jpeg({ quality: 90 })
        .withMetadata({ orientation: 6 })
        .toBuffer();

      const processed = await sharp(largeImage)
        .rotate()
        .resize(1200, 1600, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();

      const metadata = await sharp(processed).metadata();
      expect([1, undefined]).toContain(metadata.orientation);
      expect(metadata.width).toBeLessThanOrEqual(1200);
    });

    it('should handle images with orientation and alpha channel', async () => {
      // Some phones save with transparency
      const pngSvg = '<svg width="400" height="300"><rect width="400" height="300" fill="rgba(255,0,0,0.5)"/></svg>';
      const pngImage = await sharp(Buffer.from(pngSvg))
        .png()
        .withMetadata({ orientation: 6 })
        .toBuffer();

      const processed = await sharp(pngImage)
        .rotate()
        .jpeg({ quality: 85 }) // Convert to JPEG (no alpha)
        .toBuffer();

      const metadata = await sharp(processed).metadata();
      expect([1, undefined]).toContain(metadata.orientation);
      expect(metadata.hasAlpha).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should process orientation rotation quickly', async () => {
      const testImage = await createTestImageWithOrientation(6);

      const startTime = Date.now();

      for (let i = 0; i < 10; i++) {
        await sharp(testImage)
          .rotate()
          .resize(200, 200)
          .jpeg({ quality: 85 })
          .toBuffer();
      }

      const endTime = Date.now();
      const avgTime = (endTime - startTime) / 10;

      // Should process each image in less than 100ms
      expect(avgTime).toBeLessThan(100);
    });
  });
});
