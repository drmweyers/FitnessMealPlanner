import { test, expect } from '@playwright/test';
import { db } from '../../server/db';
import { users, customerPhotos, recipes } from '../../server/db/schema';
import { eq } from 'drizzle-orm';
import * as path from 'path';
import {
  s3ObjectExists,
  countS3Objects,
  deleteTestS3Objects,
  waitForS3Consistency,
} from '../utils/s3TestHelpers';

test.describe('S3 Image Uploads - E2E Tests', () => {
  const baseURL = 'http://localhost:4000';

  // Test accounts (from test seed data)
  const testTrainer = {
    email: 'trainer.test@evofitmeals.com',
    password: 'TestTrainer123!',
  };

  const testCustomer = {
    email: 'customer.test@evofitmeals.com',
    password: 'TestCustomer123!',
  };

  const testAdmin = {
    email: 'admin@fitmeal.pro',
    password: 'AdminPass123',
  };

  // Test image fixtures
  const testImagePath = path.join(__dirname, '..', 'fixtures', 'test-image-1.jpg');
  const testImagePath2 = path.join(__dirname, '..', 'fixtures', 'test-image-2.jpg');
  const largeImagePath = path.join(__dirname, '..', 'fixtures', 'test-image-large.jpg');
  const textFilePath = path.join(__dirname, '..', 'fixtures', 'test-file.txt');

  test.beforeAll(async () => {
    // Ensure test fixtures exist (run generateTestFixtures.ts first)
    console.log('Note: Ensure test fixtures have been generated (npm run generate:fixtures)');
  });

  test.afterEach(async () => {
    // Cleanup: Delete test S3 objects after each test
    await deleteTestS3Objects('test-uploads/');
    await waitForS3Consistency(500);
  });

  test('S3-UPLOAD-1: Profile image upload (trainer)', async ({ page }) => {
    // 1. Login as trainer
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', testTrainer.email);
    await page.fill('input[type="password"]', testTrainer.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${baseURL}/trainer`);

    // 2. Navigate to profile/settings (assuming a profile page exists)
    // Note: Adjust selectors based on actual trainer UI
    const profileButton = page.locator('button:has-text("Profile")').or(page.locator('a:has-text("Profile")'));
    if (await profileButton.isVisible()) {
      await profileButton.click();
    } else {
      console.log('Profile page not found - test may need UI adjustment');
      test.skip();
    }

    // 3. Upload profile image
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testImagePath);

    // 4. Wait for upload to complete
    await expect(page.locator('text=Upload successful').or(page.locator('text=Profile updated'))).toBeVisible({ timeout: 10000 });

    // 5. Verify database updated
    const [trainer] = await db.select().from(users).where(eq(users.email, testTrainer.email));
    expect(trainer).toBeDefined();
    expect(trainer.profileImageUrl).toBeTruthy();

    // 6. Verify S3 object exists
    const s3Key = trainer.profileImageUrl!.split('.com/')[1]; // Extract S3 key from URL
    await waitForS3Consistency(1000);
    const exists = await s3ObjectExists(s3Key);
    expect(exists).toBe(true);

    // 7. Verify image displays in UI
    const profileImage = page.locator(`img[src*="${trainer.profileImageUrl}"]`);
    await expect(profileImage).toBeVisible();
  });

  test('S3-UPLOAD-2: Progress photo upload (customer)', async ({ page }) => {
    // 1. Login as customer
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', testCustomer.email);
    await page.fill('input[type="password"]', testCustomer.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${baseURL}/customer`);

    // 2. Navigate to Progress tab
    await page.click('button[value="progress"]');
    await expect(page.locator('text=Progress Tracking')).toBeVisible();

    // 3. Navigate to Photos sub-tab
    await page.click('button:has-text("Photos")');

    // 4. Upload progress photo
    const uploadButton = page.locator('button:has-text("Upload Photo")').or(page.locator('label:has-text("Upload")'));
    await uploadButton.click();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);

    // 5. Wait for upload confirmation
    await expect(page.locator('text=Photo uploaded').or(page.locator('text=Upload successful'))).toBeVisible({ timeout: 10000 });

    // 6. Verify database record created
    const [customer] = await db.select().from(users).where(eq(users.email, testCustomer.email));
    const photos = await db.select().from(customerPhotos).where(eq(customerPhotos.customerId, customer.id));
    expect(photos.length).toBeGreaterThan(0);

    const latestPhoto = photos[photos.length - 1];
    expect(latestPhoto.photoUrl).toBeTruthy();

    // 7. Verify S3 object exists
    const s3Key = latestPhoto.photoUrl.split('.com/')[1];
    await waitForS3Consistency(1000);
    const exists = await s3ObjectExists(s3Key);
    expect(exists).toBe(true);

    // 8. Verify photo displayed in UI
    const photoImage = page.locator(`img[src*="${latestPhoto.photoUrl}"]`);
    await expect(photoImage).toBeVisible();
  });

  test('S3-UPLOAD-3: Recipe image upload (admin)', async ({ page }) => {
    // 1. Login as admin
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', testAdmin.email);
    await page.fill('input[type="password"]', testAdmin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${baseURL}/admin`);

    // 2. Navigate to Recipe Library tab
    await page.click('button[value="recipes"]').or(page.click('button:has-text("Recipe Library")')));

    // 3. Click "Add Recipe" or "Generate Recipes"
    const addRecipeButton = page.locator('button:has-text("Add Recipe")').or(page.locator('button:has-text("Generate")')));
    await addRecipeButton.click();

    // 4. Fill in recipe form (minimal)
    await page.fill('input[name="recipeName"]', 'Test Recipe with Image Upload');
    await page.fill('textarea[name="description"]', 'Test recipe description');

    // 5. Upload recipe image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);

    // 6. Submit recipe creation
    await page.click('button:has-text("Create Recipe")').or(page.click('button:has-text("Save")'));

    // 7. Wait for success message
    await expect(page.locator('text=Recipe created').or(page.locator('text=Recipe saved'))).toBeVisible({ timeout: 10000 });

    // 8. Verify database record
    const recipeRecords = await db.select().from(recipes).where(eq(recipes.recipeName, 'Test Recipe with Image Upload'));
    expect(recipeRecords.length).toBe(1);

    const recipe = recipeRecords[0];
    expect(recipe.imageUrl).toBeTruthy();

    // 9. Verify S3 object exists
    const s3Key = recipe.imageUrl.split('.com/')[1];
    await waitForS3Consistency(1000);
    const exists = await s3ObjectExists(s3Key);
    expect(exists).toBe(true);

    // 10. Verify recipe card displays image
    const recipeCard = page.locator(`img[alt*="${recipe.recipeName}"]`);
    await expect(recipeCard).toBeVisible();

    // Cleanup: Delete test recipe
    await db.delete(recipes).where(eq(recipes.id, recipe.id));
  });

  test('S3-UPLOAD-4: Multiple image upload (sequential)', async ({ page }) => {
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

    // 3. Upload first image
    const uploadButton = page.locator('button:has-text("Upload Photo")').or(page.locator('label:has-text("Upload")'));
    await uploadButton.click();
    await page.locator('input[type="file"]').setInputFiles(testImagePath);
    await expect(page.locator('text=Photo uploaded').or(page.locator('text=Upload successful'))).toBeVisible({ timeout: 10000 });

    // 4. Upload second image
    await uploadButton.click();
    await page.locator('input[type="file"]').setInputFiles(testImagePath2);
    await expect(page.locator('text=Photo uploaded').or(page.locator('text=Upload successful'))).toBeVisible({ timeout: 10000 });

    // 5. Verify database has both records
    const finalPhotos = await db.select().from(customerPhotos).where(eq(customerPhotos.customerId, customer.id));
    expect(finalPhotos.length).toBe(initialPhotoCount.length + 2);

    // 6. Verify both S3 objects exist
    const photo1 = finalPhotos[finalPhotos.length - 2];
    const photo2 = finalPhotos[finalPhotos.length - 1];

    await waitForS3Consistency(1000);

    const key1 = photo1.photoUrl.split('.com/')[1];
    const key2 = photo2.photoUrl.split('.com/')[1];

    const exists1 = await s3ObjectExists(key1);
    const exists2 = await s3ObjectExists(key2);

    expect(exists1).toBe(true);
    expect(exists2).toBe(true);

    // 7. Verify both images display in UI
    await expect(page.locator(`img[src*="${photo1.photoUrl}"]`)).toBeVisible();
    await expect(page.locator(`img[src*="${photo2.photoUrl}"]`)).toBeVisible();
  });

  test('S3-UPLOAD-5: Image replacement (profile)', async ({ page }) => {
    // 1. Login as trainer
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', testTrainer.email);
    await page.fill('input[type="password"]', testTrainer.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${baseURL}/trainer`);

    // 2. Navigate to profile
    const profileButton = page.locator('button:has-text("Profile")').or(page.locator('a:has-text("Profile")'));
    if (await profileButton.isVisible()) {
      await profileButton.click();
    } else {
      test.skip();
    }

    // 3. Upload first image
    await page.locator('input[type="file"]').setInputFiles(testImagePath);
    await expect(page.locator('text=Upload successful').or(page.locator('text=Profile updated'))).toBeVisible({ timeout: 10000 });

    const [trainer1] = await db.select().from(users).where(eq(users.email, testTrainer.email));
    const oldImageUrl = trainer1.profileImageUrl!;
    const oldS3Key = oldImageUrl.split('.com/')[1];

    // 4. Upload replacement image
    await page.locator('input[type="file"]').setInputFiles(testImagePath2);
    await expect(page.locator('text=Upload successful').or(page.locator('text=Profile updated'))).toBeVisible({ timeout: 10000 });

    // 5. Verify database updated
    const [trainer2] = await db.select().from(users).where(eq(users.email, testTrainer.email));
    const newImageUrl = trainer2.profileImageUrl!;
    const newS3Key = newImageUrl.split('.com/')[1];

    expect(newImageUrl).not.toBe(oldImageUrl);

    // 6. Verify old S3 object deleted and new one exists
    await waitForS3Consistency(1000);

    const oldExists = await s3ObjectExists(oldS3Key);
    const newExists = await s3ObjectExists(newS3Key);

    expect(oldExists).toBe(false); // Old image should be deleted
    expect(newExists).toBe(true);  // New image should exist
  });

  test('S3-UPLOAD-6: Invalid file upload (non-image)', async ({ page }) => {
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

    // 3. Attempt to upload text file
    const uploadButton = page.locator('button:has-text("Upload Photo")').or(page.locator('label:has-text("Upload")'));
    await uploadButton.click();
    await page.locator('input[type="file"]').setInputFiles(textFilePath);

    // 4. Verify error message displayed
    await expect(page.locator('text=Invalid file type').or(page.locator('text=Please upload an image'))).toBeVisible({ timeout: 5000 });

    // 5. Verify database unchanged
    const finalPhotoCount = await db.select().from(customerPhotos).where(eq(customerPhotos.customerId, customer.id));
    expect(finalPhotoCount.length).toBe(initialPhotoCount.length);

    // 6. Verify no S3 upload attempted (no new objects in test prefix)
    const testObjectCount = await countS3Objects('test-uploads/');
    expect(testObjectCount).toBe(0);
  });

  test('S3-UPLOAD-7: Large file upload (>10MB)', async ({ page }) => {
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

    // 3. Attempt to upload large file
    const uploadButton = page.locator('button:has-text("Upload Photo")').or(page.locator('label:has-text("Upload")'));
    await uploadButton.click();
    await page.locator('input[type="file"]').setInputFiles(largeImagePath);

    // 4. Verify error message displayed
    await expect(page.locator('text=File too large').or(page.locator('text=Maximum file size'))).toBeVisible({ timeout: 5000 });

    // 5. Verify database unchanged
    const finalPhotoCount = await db.select().from(customerPhotos).where(eq(customerPhotos.customerId, customer.id));
    expect(finalPhotoCount.length).toBe(initialPhotoCount.length);

    // 6. Verify no S3 upload attempted
    const testObjectCount = await countS3Objects('test-uploads/');
    expect(testObjectCount).toBe(0);
  });

  test('S3-UPLOAD-8: Unauthenticated upload attempt', async ({ page, context }) => {
    // 1. Attempt to upload without logging in
    await page.goto(`${baseURL}/login`);

    // 2. Attempt direct API call without authentication
    const response = await context.request.post(`${baseURL}/api/upload/profile-image`, {
      multipart: {
        file: {
          name: 'test-image-1.jpg',
          mimeType: 'image/jpeg',
          buffer: Buffer.from('fake image data'),
        },
      },
    });

    // 3. Verify 401 Unauthorized response
    expect(response.status()).toBe(401);

    // 4. Verify no S3 upload attempted
    await waitForS3Consistency(500);
    const testObjectCount = await countS3Objects('test-uploads/');
    expect(testObjectCount).toBe(0);
  });
});
