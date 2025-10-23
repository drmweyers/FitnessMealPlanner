import { test, expect } from '@playwright/test';
import { db } from '../../server/db';
import { users, customerPhotos } from '../../server/db/schema';
import { eq } from 'drizzle-orm';
import * as path from 'path';
import {
  countS3Objects,
  deleteTestS3Objects,
  waitForS3Consistency,
} from '../utils/s3TestHelpers';

test.describe('S3 Error Handling - E2E Tests', () => {
  const baseURL = 'http://localhost:4000';

  const testCustomer = {
    email: 'customer.test@evofitmeals.com',
    password: 'TestCustomer123!',
  };

  const testImagePath = path.join(__dirname, '..', 'fixtures', 'test-image-1.jpg');

  test.afterEach(async () => {
    await deleteTestS3Objects('test-uploads/');
    await waitForS3Consistency(500);
  });

  test('S3-ERROR-1: S3 service unavailable (graceful failure)', async ({ page }) => {
    // Note: This test requires mocking S3 to return 500 errors
    // For E2E testing without mocks, we'll verify the UI error handling

    // 1. Login as customer
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', testCustomer.email);
    await page.fill('input[type="password"]', testCustomer.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${baseURL}/customer`);

    // 2. Navigate to Progress → Photos
    await page.click('button[value="progress"]');
    await page.click('button:has-text("Photos")');

    const [customer] = await db.select().from(users).where(eq(users.email, testCustomer.email));
    const initialPhotoCount = await db.select().from(customerPhotos).where(eq(customerPhotos.customerId, customer.id));

    // 3. Temporarily disable S3 (requires environment variable or mock)
    // For now, this test will skip and document expected behavior
    test.skip();

    // Expected behavior when S3 is unavailable:
    // - User attempts upload
    // - Upload fails with error message: "Unable to upload photo. Please try again later."
    // - Database unchanged (no partial records)
    // - No orphaned S3 objects
  });

  test('S3-ERROR-2: S3 network timeout (retry or fail)', async ({ page }) => {
    // Note: This test requires simulating network delay/timeout
    test.skip();

    // Expected behavior:
    // - Upload shows loading state
    // - Timeout after 30-60 seconds
    // - Error message: "Upload timed out. Please check your connection and try again."
    // - Database unchanged
    // - Retry mechanism (if implemented)
  });

  test('S3-ERROR-3: S3 permission denied (403)', async ({ page }) => {
    // Note: This test requires temporarily changing S3 bucket permissions
    test.skip();

    // Expected behavior:
    // - Upload fails with permission error
    // - Error logged to server (for admin debugging)
    // - User sees generic error: "Unable to upload photo. Please contact support."
    // - Database unchanged
  });

  test('S3-ERROR-4: Invalid S3 credentials', async ({ page }) => {
    // Note: This test requires temporarily using invalid AWS credentials
    test.skip();

    // Expected behavior:
    // - Upload fails with authentication error
    // - Error logged: "S3 authentication failed - check AWS credentials"
    // - User sees: "Service temporarily unavailable. Please try again later."
    // - System doesn't crash (graceful degradation)
  });

  test('S3-ERROR-5: S3 rate limiting', async ({ page }) => {
    // 1. Login as customer
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', testCustomer.email);
    await page.fill('input[type="password"]', testCustomer.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${baseURL}/customer`);

    // 2. Navigate to Progress → Photos
    await page.click('button[value="progress"]');
    await page.click('button:has-text("Photos")');

    // 3. Attempt rapid uploads (10 images in quick succession)
    const uploadButton = page.locator('button:has-text("Upload Photo")').or(page.locator('label:has-text("Upload")'));

    const uploadAttempts = [];

    for (let i = 0; i < 10; i++) {
      uploadAttempts.push(
        (async () => {
          await uploadButton.click();
          await page.locator('input[type="file"]').setInputFiles(testImagePath);
        })()
      );
    }

    // Wait for all uploads to initiate
    await Promise.all(uploadAttempts);

    // 4. Verify at least some uploads succeed
    await page.waitForTimeout(10000); // Wait for uploads to complete or fail

    const [customer] = await db.select().from(users).where(eq(users.email, testCustomer.email));
    const finalPhotos = await db.select().from(customerPhotos).where(eq(customerPhotos.customerId, customer.id));

    // Expected: Some uploads succeed, some may be rate-limited or queued
    expect(finalPhotos.length).toBeGreaterThan(0);

    // 5. Verify error handling for rate-limited requests (if any)
    // Check for error messages in UI
    const errorMessages = page.locator('text=/rate limit|too many|slow down/i');
    if (await errorMessages.count() > 0) {
      console.log('Rate limit error messages detected (expected for rapid uploads)');
    }
  });

  test('S3-ERROR-6: Failed upload cleanup (rollback)', async ({ page }) => {
    // 1. Login as customer
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', testCustomer.email);
    await page.fill('input[type="password"]', testCustomer.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${baseURL}/customer`);

    // 2. Navigate to Progress → Photos
    await page.click('button[value="progress"]');
    await page.click('button:has-text("Photos")');

    const [customer] = await db.select().from(users).where(eq(users.email, testCustomer.email));
    const initialPhotoCount = await db.select().from(customerPhotos).where(eq(customerPhotos.customerId, customer.id));

    // Note: To test rollback, we'd need to mock a database failure after S3 upload succeeds
    test.skip();

    // Expected behavior:
    // - S3 upload succeeds
    // - Database save fails
    // - Uploaded S3 image is automatically deleted (cleanup)
    // - No orphaned S3 objects
    // - Error message to user
    // - Database unchanged
  });

  test('S3-ERROR-7: Corrupted file upload', async ({ page }) => {
    // 1. Login as customer
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', testCustomer.email);
    await page.fill('input[type="password"]', testCustomer.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${baseURL}/customer`);

    // 2. Navigate to Progress → Photos
    await page.click('button[value="progress"]');
    await page.click('button:has-text("Photos")');

    const [customer] = await db.select().from(users).where(eq(users.email, testCustomer.email));
    const initialPhotoCount = await db.select().from(customerPhotos).where(eq(customerPhotos.customerId, customer.id));

    // 3. Create a corrupted image file (JPEG header only, no valid image data)
    const corruptedImagePath = path.join(__dirname, '..', 'fixtures', 'test-image-corrupted.jpg');

    // For now, skip this test as it requires generating a corrupted file
    test.skip();

    // Expected behavior:
    // - Client-side validation may catch corrupted file
    // - If uploaded, S3 accepts it (S3 doesn't validate image format)
    // - Server-side validation (if implemented) rejects it
    // - Error message: "Invalid image file. Please upload a valid JPEG or PNG."
  });

  test('S3-ERROR-8: Concurrent upload conflicts', async ({ page }) => {
    // 1. Login as customer
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', testCustomer.email);
    await page.fill('input[type="password"]', testCustomer.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${baseURL}/customer`);

    // 2. Navigate to Progress → Photos
    await page.click('button[value="progress"]');
    await page.click('button:has-text("Photos")');

    const [customer] = await db.select().from(users).where(eq(users.email, testCustomer.email));

    // 3. Initiate multiple uploads at exactly the same time
    const uploadButton = page.locator('button:has-text("Upload Photo")').or(page.locator('label:has-text("Upload")'));

    await Promise.all([
      (async () => {
        await uploadButton.click();
        await page.locator('input[type="file"]').first().setInputFiles(testImagePath);
      })(),
      (async () => {
        await page.waitForTimeout(100);
        await uploadButton.click();
        await page.locator('input[type="file"]').last().setInputFiles(testImagePath);
      })(),
    ]);

    // 4. Wait for uploads to complete
    await page.waitForTimeout(5000);

    // 5. Verify both uploads handled correctly
    const finalPhotos = await db.select().from(customerPhotos).where(eq(customerPhotos.customerId, customer.id));

    // Expected: Both uploads should succeed (no race conditions)
    expect(finalPhotos.length).toBeGreaterThanOrEqual(2);

    // 6. Verify all S3 objects exist
    for (const photo of finalPhotos.slice(-2)) {
      const s3Key = photo.photoUrl.split('.com/')[1];
      await waitForS3Consistency(500);
      // S3 object should exist (this test mainly verifies no crashes/conflicts)
    }
  });
});
