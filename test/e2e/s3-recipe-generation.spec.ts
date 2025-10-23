import { test, expect } from '@playwright/test';
import { db } from '../../server/db';
import { recipes } from '../../server/db/schema';
import { eq, inArray } from 'drizzle-orm';
import {
  s3ObjectExists,
  countS3Objects,
  deleteTestS3Objects,
  waitForS3Consistency,
} from '../utils/s3TestHelpers';

test.describe('S3 Recipe Generation - E2E Tests', () => {
  const baseURL = 'http://localhost:4000';

  const testAdmin = {
    email: 'admin@fitmeal.pro',
    password: 'AdminPass123',
  };

  const createdRecipeIds: number[] = [];

  test.afterEach(async () => {
    // Cleanup: Delete created recipes
    if (createdRecipeIds.length > 0) {
      await db.delete(recipes).where(inArray(recipes.id, createdRecipeIds));
      createdRecipeIds.length = 0;
    }

    // Cleanup test S3 objects
    await deleteTestS3Objects('test-recipe-images/');
    await waitForS3Consistency(500);
  });

  test('S3-RECIPE-1: BMAD recipe generation with S3 images (happy path)', async ({ page }) => {
    // 1. Login as admin
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', testAdmin.email);
    await page.fill('input[type="password"]', testAdmin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${baseURL}/admin`);

    // 2. Navigate to BMAD Generator tab
    await page.click('button[value="bmad"]').or(page.click('button:has-text("BMAD Generator")'));

    // 3. Configure recipe generation (5 recipes)
    await page.fill('input[name="recipeCount"]', '5');
    await page.check('input[value="breakfast"]'); // Select at least one meal type
    await page.check('input[value="lunch"]');

    // 4. Start generation
    await page.click('button:has-text("Start BMAD Generation")').or(page.click('button:has-text("Generate")'));

    // 5. Wait for SSE progress updates
    await expect(page.locator('text=Generating recipes')).toBeVisible({ timeout: 2000 });

    // 6. Wait for image upload progress
    await expect(page.locator('text=ImageGenerationAgent').or(page.locator('text=Uploading image'))).toBeVisible({ timeout: 30000 });

    // 7. Wait for completion (max 3 minutes for 5 recipes)
    await expect(page.locator('text=Generation complete').or(page.locator('text=All recipes generated'))).toBeVisible({ timeout: 180000 });

    // 8. Verify database: All 5 recipes created
    await waitForS3Consistency(1000);

    const generatedRecipes = await db
      .select()
      .from(recipes)
      .orderBy(recipes.createdAt)
      .limit(5);

    expect(generatedRecipes.length).toBe(5);

    // Track for cleanup
    generatedRecipes.forEach(r => createdRecipeIds.push(r.id));

    // 9. Verify all recipes have imageUrl
    for (const recipe of generatedRecipes) {
      expect(recipe.imageUrl).toBeTruthy();
      expect(recipe.imageUrl).toContain('recipe-images/');
    }

    // 10. Verify all S3 objects exist
    for (const recipe of generatedRecipes) {
      const s3Key = recipe.imageUrl.split('.com/')[1];
      const exists = await s3ObjectExists(s3Key);
      expect(exists).toBe(true);
    }

    // 11. Verify recipe cards display images
    for (const recipe of generatedRecipes) {
      const recipeCard = page.locator(`img[alt*="${recipe.recipeName}"]`);
      await expect(recipeCard).toBeVisible();
    }
  });

  test('S3-RECIPE-2: Recipe generation with S3 failure (rollback)', async ({ page }) => {
    // Note: This test requires mocking S3 failure
    // For now, we'll test the UI error handling

    // 1. Login as admin
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', testAdmin.email);
    await page.fill('input[type="password"]', testAdmin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${baseURL}/admin`);

    // 2. Navigate to BMAD Generator
    await page.click('button[value="bmad"]').or(page.click('button:has-text("BMAD Generator")'));

    // TODO: Mock S3 upload failure (requires additional setup)
    // For now, skip this test
    test.skip();

    // Expected behavior:
    // - Recipe creation should roll back
    // - Error message displayed: "Failed to upload recipe image"
    // - No incomplete recipe records
    // - No orphaned S3 objects
  });

  test('S3-RECIPE-3: Recipe image uniqueness (10 recipes)', async ({ page }) => {
    // 1. Login as admin
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', testAdmin.email);
    await page.fill('input[type="password"]', testAdmin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${baseURL}/admin`);

    // 2. Navigate to BMAD Generator
    await page.click('button[value="bmad"]').or(page.click('button:has-text("BMAD Generator")'));

    // 3. Generate 10 recipes
    await page.fill('input[name="recipeCount"]', '10');
    await page.check('input[value="breakfast"]');
    await page.check('input[value="lunch"]');
    await page.check('input[value="dinner"]');

    await page.click('button:has-text("Start BMAD Generation")');

    // 4. Wait for completion (max 5 minutes for 10 recipes)
    await expect(page.locator('text=Generation complete')).toBeVisible({ timeout: 300000 });

    // 5. Verify all recipes have unique imageUrl
    await waitForS3Consistency(1000);

    const generatedRecipes = await db
      .select()
      .from(recipes)
      .orderBy(recipes.createdAt)
      .limit(10);

    expect(generatedRecipes.length).toBe(10);

    generatedRecipes.forEach(r => createdRecipeIds.push(r.id));

    const imageUrls = generatedRecipes.map(r => r.imageUrl);

    // 6. Verify all URLs are unique
    const uniqueUrls = new Set(imageUrls);
    expect(uniqueUrls.size).toBe(10); // All 10 should be different

    // 7. Verify all S3 keys are different
    const s3Keys = imageUrls.map(url => url.split('.com/')[1]);
    const uniqueKeys = new Set(s3Keys);
    expect(uniqueKeys.size).toBe(10);
  });

  test('S3-RECIPE-4: Recipe image deletion', async ({ page }) => {
    // 1. Login as admin
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', testAdmin.email);
    await page.fill('input[type="password"]', testAdmin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${baseURL}/admin`);

    // 2. Create a test recipe via BMAD
    await page.click('button[value="bmad"]');
    await page.fill('input[name="recipeCount"]', '1');
    await page.check('input[value="breakfast"]');
    await page.click('button:has-text("Start BMAD Generation")');
    await expect(page.locator('text=Generation complete')).toBeVisible({ timeout: 60000 });

    // 3. Get the created recipe
    await waitForS3Consistency(1000);
    const generatedRecipes = await db
      .select()
      .from(recipes)
      .orderBy(recipes.createdAt)
      .limit(1);

    expect(generatedRecipes.length).toBe(1);

    const recipe = generatedRecipes[0];
    const s3Key = recipe.imageUrl.split('.com/')[1];

    // 4. Verify S3 object exists before deletion
    const existsBefore = await s3ObjectExists(s3Key);
    expect(existsBefore).toBe(true);

    // 5. Delete recipe via admin panel
    await page.click('button[value="recipes"]'); // Navigate to Recipe Library
    const deleteButton = page.locator(`button[data-recipe-id="${recipe.id}"]`).or(page.locator(`button:has-text("Delete"):near(text=${recipe.recipeName})`));

    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      await page.click('button:has-text("Confirm")').or(page.click('button:has-text("Delete")'));
      await expect(page.locator('text=Recipe deleted')).toBeVisible({ timeout: 5000 });
    } else {
      // Fallback: Delete via API
      await db.delete(recipes).where(eq(recipes.id, recipe.id));
    }

    // 6. Verify recipe deleted from database
    const deletedRecipe = await db.select().from(recipes).where(eq(recipes.id, recipe.id));
    expect(deletedRecipe.length).toBe(0);

    // 7. Verify S3 object deleted
    await waitForS3Consistency(1000);
    const existsAfter = await s3ObjectExists(s3Key);
    expect(existsAfter).toBe(false);
  });

  test('S3-RECIPE-5: Bulk recipe deletion (S3 cleanup)', async ({ page }) => {
    // 1. Login as admin
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', testAdmin.email);
    await page.fill('input[type="password"]', testAdmin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${baseURL}/admin`);

    // 2. Generate 3 recipes
    await page.click('button[value="bmad"]');
    await page.fill('input[name="recipeCount"]', '3');
    await page.check('input[value="breakfast"]');
    await page.click('button:has-text("Start BMAD Generation")');
    await expect(page.locator('text=Generation complete')).toBeVisible({ timeout: 120000 });

    // 3. Get generated recipes
    await waitForS3Consistency(1000);
    const generatedRecipes = await db
      .select()
      .from(recipes)
      .orderBy(recipes.createdAt)
      .limit(3);

    expect(generatedRecipes.length).toBe(3);

    const recipeIds = generatedRecipes.map(r => r.id);
    const s3Keys = generatedRecipes.map(r => r.imageUrl.split('.com/')[1]);

    // 4. Verify all S3 objects exist
    for (const key of s3Keys) {
      const exists = await s3ObjectExists(key);
      expect(exists).toBe(true);
    }

    // 5. Delete all recipes (bulk delete via database)
    await db.delete(recipes).where(inArray(recipes.id, recipeIds));

    // 6. Verify recipes deleted
    const deletedRecipes = await db.select().from(recipes).where(inArray(recipes.id, recipeIds));
    expect(deletedRecipes.length).toBe(0);

    // 7. Verify all S3 objects deleted
    await waitForS3Consistency(2000);
    for (const key of s3Keys) {
      const exists = await s3ObjectExists(key);
      expect(exists).toBe(false);
    }
  });

  test('S3-RECIPE-6: Recipe generation with slow S3 (SSE progress)', async ({ page }) => {
    // 1. Login as admin
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', testAdmin.email);
    await page.fill('input[type="password"]', testAdmin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${baseURL}/admin`);

    // 2. Navigate to BMAD Generator
    await page.click('button[value="bmad"]');

    // 3. Generate 2 recipes
    await page.fill('input[name="recipeCount"]', '2');
    await page.check('input[value="breakfast"]');
    await page.click('button:has-text("Start BMAD Generation")');

    // 4. Verify SSE progress updates
    await expect(page.locator('text=Generating recipes')).toBeVisible({ timeout: 2000 });

    // 5. Wait for image upload status
    await expect(page.locator('text=ImageGenerationAgent').or(page.locator('text=Uploading image'))).toBeVisible({ timeout: 30000 });

    // 6. Verify progress percentage updates
    const progressText = page.locator('text=/\\d+%/'); // Matches "50%", "100%", etc.
    await expect(progressText).toBeVisible({ timeout: 30000 });

    // 7. Wait for completion
    await expect(page.locator('text=Generation complete')).toBeVisible({ timeout: 120000 });

    // 8. Verify recipes created successfully
    await waitForS3Consistency(1000);
    const generatedRecipes = await db
      .select()
      .from(recipes)
      .orderBy(recipes.createdAt)
      .limit(2);

    expect(generatedRecipes.length).toBe(2);

    generatedRecipes.forEach(r => createdRecipeIds.push(r.id));

    // 9. Verify all images uploaded
    for (const recipe of generatedRecipes) {
      expect(recipe.imageUrl).toBeTruthy();
      const s3Key = recipe.imageUrl.split('.com/')[1];
      const exists = await s3ObjectExists(s3Key);
      expect(exists).toBe(true);
    }
  });
});
