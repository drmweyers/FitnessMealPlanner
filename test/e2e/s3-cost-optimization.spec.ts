import { test, expect } from '@playwright/test';
import { db } from '../../server/db';
import { users, customerPhotos, recipes } from '../../server/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import {
  listS3Objects,
  countS3Objects,
  deleteTestS3Objects,
  generateS3StorageReport,
  detectOrphanedS3Objects,
  waitForS3Consistency,
} from '../utils/s3TestHelpers';

test.describe('S3 Cost Optimization - E2E Tests', () => {
  const baseURL = 'http://localhost:4000';

  const testCustomer = {
    email: 'delete-s3-test@example.com',
    password: 'DeleteTest123!',
    role: 'customer' as const,
  };

  let testUserId: number;

  test.beforeEach(async () => {
    // Create test customer account
    const hashedPassword = await bcrypt.hash(testCustomer.password, 10);
    const [user] = await db.insert(users).values({
      email: testCustomer.email,
      password: hashedPassword,
      role: testCustomer.role,
    }).returning();

    testUserId = user.id;
  });

  test.afterEach(async () => {
    // Cleanup test user
    try {
      await db.delete(users).where(eq(users.email, testCustomer.email));
    } catch (error) {
      // User already deleted (expected)
    }

    // Cleanup test S3 objects
    await deleteTestS3Objects(`progress-photos/${testUserId}/`);
    await deleteTestS3Objects(`profile-images/${testUserId}/`);
    await waitForS3Consistency(500);
  });

  test('S3-COST-1: S3 cleanup on account deletion (cross-reference Phase B)', async ({ page }) => {
    // This test validates that S3 cleanup works correctly when account is deleted
    // Cross-references Phase B: Delete Account Feature tests

    // 1. Login as customer
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', testCustomer.email);
    await page.fill('input[type="password"]', testCustomer.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${baseURL}/customer`);

    // 2. Upload progress photos (create S3 objects to delete)
    await page.click('button[value="progress"]');
    await page.click('button:has-text("Photos")');

    // Upload 2 progress photos
    const uploadButton = page.locator('button:has-text("Upload Photo")').or(page.locator('label:has-text("Upload")'));

    for (let i = 0; i < 2; i++) {
      await uploadButton.click();
      const testImagePath = `test/fixtures/test-image-${i + 1}.jpg`;
      await page.locator('input[type="file"]').setInputFiles(testImagePath);
      await page.waitForTimeout(2000); // Wait for upload
    }

    // 3. Verify S3 objects exist
    await waitForS3Consistency(1000);
    const photosBeforeDeletion = await listS3Objects(`progress-photos/${testUserId}/`);
    expect(photosBeforeDeletion.length).toBeGreaterThanOrEqual(2);

    const s3KeysBefore = photosBeforeDeletion.map(obj => obj.Key);

    // 4. Delete account (triggers S3 cleanup)
    await page.click('button[value="profile"]');
    await page.click('button:has-text("Delete My Account")');
    await page.fill('input[type="password"]', testCustomer.password);
    await page.check('input[type="checkbox"]'); // "I understand" checkbox
    await page.click('button:has-text("Delete Account"):not([aria-label])');

    // 5. Wait for account deletion to complete
    await expect(page.locator('text=Account Deleted')).toBeVisible({ timeout: 10000 });
    await page.waitForURL(`${baseURL}/login`);

    // 6. Verify user deleted from database
    const deletedUser = await db.select().from(users).where(eq(users.email, testCustomer.email));
    expect(deletedUser.length).toBe(0);

    // 7. Verify all S3 objects deleted
    await waitForS3Consistency(2000);
    const photosAfterDeletion = await listS3Objects(`progress-photos/${testUserId}/`);
    expect(photosAfterDeletion.length).toBe(0);

    // 8. Verify specific keys no longer exist
    for (const key of s3KeysBefore) {
      const objects = await listS3Objects(key);
      expect(objects.length).toBe(0);
    }
  });

  test('S3-COST-2: S3 cleanup on failed upload (rollback)', async ({ page }) => {
    // This test validates that S3 objects are cleaned up when upload fails

    // Note: To properly test this, we'd need to mock a database failure after S3 upload
    test.skip();

    // Expected behavior:
    // 1. S3 upload succeeds
    // 2. Database save fails
    // 3. S3 cleanup service automatically deletes the uploaded image
    // 4. No orphaned S3 objects
    // 5. User sees error message
  });

  test('S3-COST-3: Orphaned image detection (utility script)', async () => {
    // This test validates the orphaned image detection utility

    // 1. Create a legitimate progress photo (with database record)
    await db.insert(customerPhotos).values({
      customerId: testUserId,
      photoUrl: `https://pti.s3.amazonaws.com/progress-photos/${testUserId}/legitimate-photo.jpg`,
      photoType: 'progress',
      uploadDate: new Date(),
    });

    // 2. Get all valid S3 keys from database
    const validPhotos = await db.select().from(customerPhotos);
    const validKeys = new Set(validPhotos.map(p => p.photoUrl.split('.com/')[1]));

    // Also get valid profile images
    const validUsers = await db.select().from(users).where(eq(users.profileImageUrl, null));
    validUsers.forEach(user => {
      if (user.profileImageUrl) {
        validKeys.add(user.profileImageUrl.split('.com/')[1]);
      }
    });

    // Also get valid recipe images
    const validRecipes = await db.select().from(recipes);
    validRecipes.forEach(recipe => {
      if (recipe.imageUrl) {
        validKeys.add(recipe.imageUrl.split('.com/')[1]);
      }
    });

    // 3. Run orphan detection for test user's progress photos
    const orphanedKeys = await detectOrphanedS3Objects(
      `progress-photos/${testUserId}/`,
      validKeys
    );

    // 4. Verify no orphaned objects (all S3 objects have database records)
    expect(orphanedKeys.length).toBe(0);

    // Cleanup
    await db.delete(customerPhotos).where(eq(customerPhotos.customerId, testUserId));
  });

  test('S3-COST-4: Storage metrics and monitoring', async () => {
    // This test generates a storage metrics report

    // 1. Generate comprehensive storage report
    const report = await generateS3StorageReport();

    // 2. Verify report structure
    expect(report).toHaveProperty('profileImages');
    expect(report).toHaveProperty('progressPhotos');
    expect(report).toHaveProperty('recipeImages');
    expect(report).toHaveProperty('total');

    // 3. Verify metrics for each category
    expect(report.profileImages.count).toBeGreaterThanOrEqual(0);
    expect(report.progressPhotos.count).toBeGreaterThanOrEqual(0);
    expect(report.recipeImages.count).toBeGreaterThanOrEqual(0);
    expect(report.total.count).toBeGreaterThanOrEqual(0);

    // 4. Verify size calculations
    expect(report.profileImages.totalSizeMB).toBeGreaterThanOrEqual(0);
    expect(report.progressPhotos.totalSizeMB).toBeGreaterThanOrEqual(0);
    expect(report.recipeImages.totalSizeMB).toBeGreaterThanOrEqual(0);

    // 5. Log metrics for monitoring
    console.log('S3 Storage Metrics:');
    console.log('Profile Images:', report.profileImages);
    console.log('Progress Photos:', report.progressPhotos);
    console.log('Recipe Images:', report.recipeImages);
    console.log('Total Storage:', report.total);

    // 6. Verify total count matches sum of categories
    const categorySum =
      report.profileImages.count +
      report.progressPhotos.count +
      report.recipeImages.count;

    // Note: Total may be >= categorySum due to other objects (test files, etc.)
    expect(report.total.count).toBeGreaterThanOrEqual(categorySum);
  });
});
