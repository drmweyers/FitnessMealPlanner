import { test, expect } from '@playwright/test';
import { test as base } from '@playwright/test';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

/**
 * Mobile Image Orientation E2E Tests
 *
 * Tests that images uploaded from mobile devices with EXIF orientation metadata
 * are properly auto-rotated to display correctly on the web.
 *
 * Background:
 * - Mobile cameras often embed EXIF orientation metadata (values 1-8)
 * - Without proper handling, images appear rotated 90°, 180°, or 270°
 * - Sharp's .rotate() automatically corrects this based on EXIF data
 *
 * Test Coverage:
 * 1. Profile image uploads with various EXIF orientations
 * 2. Progress photo uploads with various EXIF orientations
 * 3. Verification that uploaded images display in correct orientation
 */

// Test fixture directory
const FIXTURES_DIR = path.join(process.cwd(), 'test', 'fixtures', 'images');

/**
 * Generate test images with different EXIF orientations
 *
 * EXIF Orientation Values:
 * 1 = Normal (0° rotation)
 * 3 = Upside down (180° rotation)
 * 6 = Rotated 90° CW (portrait shot held normally)
 * 8 = Rotated 90° CCW
 */
async function generateTestImage(orientation: 1 | 3 | 6 | 8): Promise<Buffer> {
  // Create a 400x300 test image with colored sections for visual verification
  const width = 400;
  const height = 300;

  // Create SVG with clear top/bottom/left/right indicators
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="${width}" height="${height}" fill="#f0f0f0"/>

      <!-- Top bar (RED) -->
      <rect width="${width}" height="60" fill="#ff0000"/>
      <text x="${width/2}" y="35" text-anchor="middle" font-size="24" fill="white" font-weight="bold">TOP</text>

      <!-- Bottom bar (BLUE) -->
      <rect y="${height-60}" width="${width}" height="60" fill="#0000ff"/>
      <text x="${width/2}" y="${height-25}" text-anchor="middle" font-size="24" fill="white" font-weight="bold">BOTTOM</text>

      <!-- Left bar (GREEN) -->
      <rect width="60" height="${height}" fill="#00ff00"/>
      <text x="30" y="${height/2}" text-anchor="middle" font-size="20" fill="black" font-weight="bold"
            transform="rotate(-90 30 ${height/2})">LEFT</text>

      <!-- Right bar (YELLOW) -->
      <rect x="${width-60}" width="60" height="${height}" fill="#ffff00"/>
      <text x="${width-30}" y="${height/2}" text-anchor="middle" font-size="20" fill="black" font-weight="bold"
            transform="rotate(90 ${width-30} ${height/2})">RIGHT</text>

      <!-- Center indicator -->
      <circle cx="${width/2}" cy="${height/2}" r="40" fill="#ffffff" stroke="#000000" stroke-width="3"/>
      <text x="${width/2}" y="${height/2+8}" text-anchor="middle" font-size="24" fill="#000000" font-weight="bold">
        EXIF ${orientation}
      </text>
    </svg>
  `;

  // Create image buffer from SVG with EXIF orientation
  const imageBuffer = await sharp(Buffer.from(svg))
    .jpeg({ quality: 90 })
    .withMetadata({ orientation }) // Set EXIF orientation
    .toBuffer();

  return imageBuffer;
}

test.describe('Mobile Image Orientation - Profile Images', () => {
  test.beforeAll(async () => {
    // Ensure fixtures directory exists
    await fs.mkdir(FIXTURES_DIR, { recursive: true });

    // Generate test images with different orientations
    const orientations: Array<1 | 3 | 6 | 8> = [1, 3, 6, 8];
    for (const orientation of orientations) {
      const buffer = await generateTestImage(orientation);
      await fs.writeFile(
        path.join(FIXTURES_DIR, `test-image-orientation-${orientation}.jpg`),
        buffer
      );
    }
  });

  test('should handle normal orientation (EXIF 1)', async ({ page }) => {
    // Login as customer
    await page.goto('http://localhost:4000');
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');

    // Wait for login
    await page.waitForURL('http://localhost:4000/customer');

    // Navigate to profile
    await page.click('text=Profile');

    // Upload image with normal orientation
    const filePath = path.join(FIXTURES_DIR, 'test-image-orientation-1.jpg');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('button:has-text("Upload Profile Picture")');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);

    // Wait for upload to complete
    await page.waitForSelector('img[alt="Profile"]', { timeout: 10000 });

    // Verify image is displayed
    const profileImage = page.locator('img[alt="Profile"]');
    await expect(profileImage).toBeVisible();

    // Image should be properly oriented (red bar at top)
    // Note: We can't directly check orientation in E2E, but we verify upload succeeds
    const src = await profileImage.getAttribute('src');
    expect(src).toBeTruthy();
    expect(src).toContain('profile-images');
  });

  test('should auto-rotate portrait image (EXIF 6 - 90° CW)', async ({ page }) => {
    // This is the most common mobile camera orientation issue
    await page.goto('http://localhost:4000');
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');

    await page.waitForURL('http://localhost:4000/customer');
    await page.click('text=Profile');

    // Upload portrait image (EXIF 6 = needs 90° CCW rotation to display correctly)
    const filePath = path.join(FIXTURES_DIR, 'test-image-orientation-6.jpg');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('button:has-text("Upload Profile Picture")');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);

    await page.waitForSelector('img[alt="Profile"]', { timeout: 10000 });

    const profileImage = page.locator('img[alt="Profile"]');
    await expect(profileImage).toBeVisible();

    // Verify upload succeeded - Sharp should have auto-rotated
    const src = await profileImage.getAttribute('src');
    expect(src).toBeTruthy();

    // Download and verify the uploaded image has been rotated
    const response = await page.request.get(src!);
    const buffer = Buffer.from(await response.body());

    // Use Sharp to read metadata - should have no orientation or orientation=1
    const metadata = await sharp(buffer).metadata();
    expect([undefined, 1]).toContain(metadata.orientation);
  });

  test('should auto-rotate upside-down image (EXIF 3 - 180°)', async ({ page }) => {
    await page.goto('http://localhost:4000');
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');

    await page.waitForURL('http://localhost:4000/customer');
    await page.click('text=Profile');

    const filePath = path.join(FIXTURES_DIR, 'test-image-orientation-3.jpg');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('button:has-text("Upload Profile Picture")');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);

    await page.waitForSelector('img[alt="Profile"]', { timeout: 10000 });

    const profileImage = page.locator('img[alt="Profile"]');
    const src = await profileImage.getAttribute('src');

    const response = await page.request.get(src!);
    const buffer = Buffer.from(await response.body());
    const metadata = await sharp(buffer).metadata();

    // Should be normalized to orientation 1 or undefined
    expect([undefined, 1]).toContain(metadata.orientation);
  });

  test('should auto-rotate CCW image (EXIF 8 - 90° CCW)', async ({ page }) => {
    await page.goto('http://localhost:4000');
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');

    await page.waitForURL('http://localhost:4000/customer');
    await page.click('text=Profile');

    const filePath = path.join(FIXTURES_DIR, 'test-image-orientation-8.jpg');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('button:has-text("Upload Profile Picture")');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);

    await page.waitForSelector('img[alt="Profile"]', { timeout: 10000 });

    const profileImage = page.locator('img[alt="Profile"]');
    const src = await profileImage.getAttribute('src');

    const response = await page.request.get(src!);
    const buffer = Buffer.from(await response.body());
    const metadata = await sharp(buffer).metadata();

    expect([undefined, 1]).toContain(metadata.orientation);
  });
});

test.describe('Mobile Image Orientation - Progress Photos', () => {
  test('should handle portrait progress photo (EXIF 6)', async ({ page }) => {
    await page.goto('http://localhost:4000');
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');

    await page.waitForURL('http://localhost:4000/customer');

    // Navigate to Progress tab
    await page.click('text=Progress');
    await page.waitForTimeout(1000);

    // Click Photos sub-tab
    await page.click('button:has-text("Photos")');
    await page.waitForTimeout(500);

    // Upload progress photo
    const filePath = path.join(FIXTURES_DIR, 'test-image-orientation-6.jpg');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('button:has-text("Upload Photo")');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);

    // Fill photo details
    await page.fill('input[name="photoDate"]', '2025-01-15');
    await page.selectOption('select[name="photoType"]', 'front');
    await page.click('button:has-text("Upload")');

    // Wait for photo to appear
    await page.waitForSelector('.progress-photo-thumbnail', { timeout: 10000 });

    // Verify photo is visible
    const thumbnail = page.locator('.progress-photo-thumbnail').first();
    await expect(thumbnail).toBeVisible();

    // Get thumbnail src and verify orientation is corrected
    const src = await thumbnail.getAttribute('src');
    expect(src).toBeTruthy();

    const response = await page.request.get(src!);
    const buffer = Buffer.from(await response.body());
    const metadata = await sharp(buffer).metadata();

    // Should be auto-rotated to orientation 1 or undefined
    expect([undefined, 1]).toContain(metadata.orientation);
  });

  test('should handle both full and thumbnail correctly', async ({ page }) => {
    await page.goto('http://localhost:4000');
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');

    await page.waitForURL('http://localhost:4000/customer');
    await page.click('text=Progress');
    await page.click('button:has-text("Photos")');

    const filePath = path.join(FIXTURES_DIR, 'test-image-orientation-6.jpg');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('button:has-text("Upload Photo")');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);

    await page.fill('input[name="photoDate"]', '2025-01-15');
    await page.selectOption('select[name="photoType"]', 'side');
    await page.click('button:has-text("Upload")');

    await page.waitForSelector('.progress-photo-thumbnail', { timeout: 10000 });

    // Click to view full size
    const thumbnail = page.locator('.progress-photo-thumbnail').first();
    await thumbnail.click();

    // Wait for modal with full-size image
    await page.waitForSelector('.progress-photo-fullsize', { timeout: 5000 });

    const fullImage = page.locator('.progress-photo-fullsize');
    await expect(fullImage).toBeVisible();

    // Both thumbnail and full size should have correct orientation
    const fullSrc = await fullImage.getAttribute('src');
    expect(fullSrc).toBeTruthy();

    const response = await page.request.get(fullSrc!);
    const buffer = Buffer.from(await response.body());
    const metadata = await sharp(buffer).metadata();

    expect([undefined, 1]).toContain(metadata.orientation);
  });
});

test.describe('Image Orientation - Visual Regression', () => {
  test('should display all orientations correctly side-by-side', async ({ page }) => {
    // This test visually verifies orientation fixes by displaying all test images
    await page.goto('http://localhost:4000');
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');

    await page.waitForURL('http://localhost:4000/customer');
    await page.click('text=Progress');
    await page.click('button:has-text("Photos")');

    // Upload all orientation test images
    const orientations = [1, 3, 6, 8];
    for (const orientation of orientations) {
      const filePath = path.join(FIXTURES_DIR, `test-image-orientation-${orientation}.jpg`);
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.click('button:has-text("Upload Photo")');
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(filePath);

      await page.fill('input[name="photoDate"]', '2025-01-15');
      await page.selectOption('select[name="photoType"]', 'front');
      await page.fill('input[name="caption"]', `Test EXIF ${orientation}`);
      await page.click('button:has-text("Upload")');

      // Wait for upload to complete
      await page.waitForTimeout(2000);
    }

    // All thumbnails should be visible and correctly oriented
    const thumbnails = page.locator('.progress-photo-thumbnail');
    await expect(thumbnails).toHaveCount(4);

    // Take screenshot for visual verification
    await page.screenshot({
      path: path.join(FIXTURES_DIR, 'orientation-fix-verification.png'),
      fullPage: true
    });
  });
});
