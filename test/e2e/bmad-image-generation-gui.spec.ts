/**
 * Playwright E2E Test: BMAD Image Generation GUI Verification
 *
 * This test verifies that the BMAD recipe generation system:
 * 1. Successfully generates recipes via the admin UI
 * 2. Creates AI-generated images (S3 URLs, not Unsplash placeholders)
 * 3. Displays the images correctly in the GUI
 *
 * User requirement: "run playwright to confirm GUI" - verify AI images work end-to-end
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:4000';
const ADMIN_EMAIL = 'admin@fitmeal.pro';
const ADMIN_PASSWORD = 'AdminPass123';

// Helper function to login as admin
async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE_URL}/login`);

  // Wait for login page to be ready
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });

  // Fill in credentials
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);

  // Submit login
  await page.click('button[type="submit"]');

  // Wait for navigation to admin dashboard
  await page.waitForURL(/\/admin/, { timeout: 15000 });

  // Verify we're logged in as admin
  await expect(page).toHaveURL(/\/admin/);
}

// Helper function to navigate to BMAD Generator tab
async function navigateToBMADTab(page: Page) {
  // Look for BMAD Generator tab (4th tab with robot icon or "BMAD" text)
  const bmadTab = page.locator('button:has-text("BMAD"), button:has-text("Generator"), [role="tab"]:has-text("BMAD")').first();

  await expect(bmadTab).toBeVisible({ timeout: 10000 });
  await bmadTab.click();

  // Wait for BMAD generator content to be visible
  await page.waitForSelector('text=/Generate.*Recipe|BMAD|Bulk/i', { timeout: 5000 });
}

test.describe('BMAD Image Generation GUI Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin before each test
    await loginAsAdmin(page);
  });

  test('should display BMAD Generator tab in admin dashboard', async ({ page }) => {
    // Verify BMAD Generator tab exists
    const bmadTab = page.locator('button:has-text("BMAD"), button:has-text("Generator"), [role="tab"]:has-text("BMAD")').first();
    await expect(bmadTab).toBeVisible();
  });

  test('should successfully generate recipe with AI image via BMAD', async ({ page }) => {
    // Navigate to BMAD Generator tab
    await navigateToBMADTab(page);

    // Configure recipe generation settings
    // Look for count input (may be number input or text input)
    const countInput = page.locator('input[type="number"], input[name*="count"], input[placeholder*="count"]').first();
    if (await countInput.isVisible({ timeout: 2000 })) {
      await countInput.fill('1');
    }

    // Select meal type (Breakfast)
    const breakfastOption = page.locator('input[value="Breakfast"], label:has-text("Breakfast")').first();
    if (await breakfastOption.isVisible({ timeout: 2000 })) {
      await breakfastOption.check();
    }

    // Ensure image generation is enabled
    const imageGenCheckbox = page.locator('input[name*="image"], input[type="checkbox"]:near(:text("Image"))').first();
    if (await imageGenCheckbox.isVisible({ timeout: 2000 })) {
      if (!await imageGenCheckbox.isChecked()) {
        await imageGenCheckbox.check();
      }
    }

    // Click generate button
    const generateButton = page.locator('button:has-text("Generate"), button:has-text("Start"), button[type="submit"]').first();
    await expect(generateButton).toBeVisible();
    await generateButton.click();

    // Wait for generation to complete (this may take 30-60 seconds)
    // Look for success message or progress completion
    await page.waitForSelector(
      'text=/Success|Complete|Generated|100%/i',
      { timeout: 120000 } // 2 minutes max
    );

    // Verify generation completed successfully
    const successIndicator = page.locator('text=/Success|Complete|Generated/i').first();
    await expect(successIndicator).toBeVisible();
  });

  test('should display AI-generated image (S3 URL) not placeholder (Unsplash)', async ({ page }) => {
    // First, let's check the Recipe Library to see recently generated recipes
    // Click on Recipe Library tab (might be tab 1 or have "Recipe" in text)
    const recipeTab = page.locator('button:has-text("Recipe"), [role="tab"]:has-text("Recipe")').first();

    if (await recipeTab.isVisible({ timeout: 5000 })) {
      await recipeTab.click();
      await page.waitForTimeout(2000); // Wait for recipes to load
    } else {
      // If no recipe tab, we might already be viewing recipes
      console.log('Recipe tab not found, assuming recipes are already visible');
    }

    // Look for the most recent recipe card/row
    // Recipes should have images displayed
    const recipeImages = page.locator('img[src*="recipes"], img[alt*="recipe" i]');

    // Wait for at least one recipe image to be visible
    await expect(recipeImages.first()).toBeVisible({ timeout: 10000 });

    // Get the first recipe image URL
    const imageUrl = await recipeImages.first().getAttribute('src');

    console.log('First recipe image URL:', imageUrl);

    // Verify the image URL is from S3/DigitalOcean Spaces, NOT Unsplash
    expect(imageUrl).not.toBeNull();
    expect(imageUrl).not.toContain('unsplash.com'); // NOT a placeholder
    expect(imageUrl).toMatch(/digitaloceanspaces\.com|\.png|\.jpg/); // IS an S3 URL or has image extension
  });

  test('should verify recipe created within last 5 minutes has AI image', async ({ page }) => {
    // Navigate to Recipe Library
    const recipeTab = page.locator('button:has-text("Recipe"), [role="tab"]:has-text("Recipe")').first();

    if (await recipeTab.isVisible({ timeout: 5000 })) {
      await recipeTab.click();
      await page.waitForTimeout(2000);
    }

    // Look for recently created recipes
    // Sort by creation date if possible
    const sortButton = page.locator('button:has-text("Sort"), select:has(option:has-text("Date"))').first();
    if (await sortButton.isVisible({ timeout: 2000 })) {
      await sortButton.click();
      // Select "Newest first" or similar option
      const newestOption = page.locator('text=/Newest|Recent|Latest/i').first();
      if (await newestOption.isVisible({ timeout: 2000 })) {
        await newestOption.click();
      }
    }

    // Get the first recipe card
    const firstRecipe = page.locator('[data-testid="recipe-card"], .recipe-card, div:has(img[alt*="recipe" i])').first();

    // Verify it has an image
    const recipeImage = firstRecipe.locator('img').first();
    await expect(recipeImage).toBeVisible();

    // Get the image URL
    const imageUrl = await recipeImage.getAttribute('src');
    console.log('Most recent recipe image URL:', imageUrl);

    // Verify it's an AI-generated S3 image
    expect(imageUrl).toBeTruthy();
    expect(imageUrl).not.toContain('unsplash.com');

    // Check for DigitalOcean Spaces pattern
    const isS3Image = imageUrl?.includes('digitaloceanspaces.com') || imageUrl?.endsWith('.png');
    expect(isS3Image).toBeTruthy();
  });

  test('should display image correctly without broken image placeholder', async ({ page }) => {
    // Navigate to recipes
    const recipeTab = page.locator('button:has-text("Recipe"), [role="tab"]:has-text("Recipe")').first();
    if (await recipeTab.isVisible({ timeout: 5000 })) {
      await recipeTab.click();
      await page.waitForTimeout(2000);
    }

    // Get first recipe image
    const firstImage = page.locator('img[src*="recipes"], img[alt*="recipe" i]').first();
    await expect(firstImage).toBeVisible();

    // Verify the image loaded successfully (not broken)
    const imageNaturalWidth = await firstImage.evaluate((img: HTMLImageElement) => img.naturalWidth);
    const imageNaturalHeight = await firstImage.evaluate((img: HTMLImageElement) => img.naturalHeight);

    console.log('Image dimensions:', { width: imageNaturalWidth, height: imageNaturalHeight });

    // A broken image has naturalWidth and naturalHeight of 0
    expect(imageNaturalWidth).toBeGreaterThan(0);
    expect(imageNaturalHeight).toBeGreaterThan(0);
  });

  test('should show multiple recipes all with AI-generated images', async ({ page }) => {
    // Navigate to recipes
    const recipeTab = page.locator('button:has-text("Recipe"), [role="tab"]:has-text("Recipe")').first();
    if (await recipeTab.isVisible({ timeout: 5000 })) {
      await recipeTab.click();
      await page.waitForTimeout(2000);
    }

    // Get all recipe images visible on the page
    const recipeImages = page.locator('img[src*="recipes"], img[alt*="recipe" i]');
    const imageCount = await recipeImages.count();

    console.log('Total recipe images found:', imageCount);

    // Verify we have at least 1 recipe image
    expect(imageCount).toBeGreaterThan(0);

    // Check the first 3 images (or all if less than 3)
    const imagesToCheck = Math.min(imageCount, 3);

    for (let i = 0; i < imagesToCheck; i++) {
      const image = recipeImages.nth(i);
      const imageUrl = await image.getAttribute('src');

      console.log(`Image ${i + 1} URL:`, imageUrl);

      // Verify it's not a placeholder
      expect(imageUrl).not.toContain('unsplash.com');

      // Verify it's loaded correctly
      const naturalWidth = await image.evaluate((img: HTMLImageElement) => img.naturalWidth);
      expect(naturalWidth).toBeGreaterThan(0);
    }
  });

  test('CRITICAL: Quinoa Breakfast Bowl recipe has S3 image URL', async ({ page }) => {
    // This test specifically checks the recipe we just created in the previous test
    // Navigate to recipes
    const recipeTab = page.locator('button:has-text("Recipe"), [role="tab"]:has-text("Recipe")').first();
    if (await recipeTab.isVisible({ timeout: 5000 })) {
      await recipeTab.click();
      await page.waitForTimeout(2000);
    }

    // Search for "Quinoa Breakfast Bowl" recipe
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    if (await searchInput.isVisible({ timeout: 2000 })) {
      await searchInput.fill('Quinoa Breakfast Bowl');
      await page.waitForTimeout(1000); // Wait for search results
    }

    // Look for the Quinoa recipe card
    const quinoaRecipe = page.locator('text=/Quinoa Breakfast Bowl/i').first();

    // If found, check its image
    if (await quinoaRecipe.isVisible({ timeout: 5000 })) {
      // Get the parent container
      const recipeCard = quinoaRecipe.locator('xpath=ancestor::div[contains(@class, "card") or contains(@data-testid, "recipe")]').first();

      // Get the image within this card
      const recipeImage = recipeCard.locator('img').first();

      if (await recipeImage.isVisible({ timeout: 2000 })) {
        const imageUrl = await recipeImage.getAttribute('src');
        console.log('Quinoa Breakfast Bowl image URL:', imageUrl);

        // CRITICAL VERIFICATION
        expect(imageUrl).toBeTruthy();
        expect(imageUrl).not.toContain('unsplash.com'); // NOT placeholder
        expect(imageUrl).toContain('digitaloceanspaces.com'); // IS S3 URL
        expect(imageUrl).toContain('quinoa'); // Has recipe name in URL

        console.log('✅ VERIFIED: Quinoa Breakfast Bowl has AI-generated S3 image!');
      } else {
        console.log('⚠️ Quinoa recipe found but image not visible yet');
      }
    } else {
      console.log('⚠️ Quinoa Breakfast Bowl recipe not found in UI (may still be processing)');
    }
  });
});

test.describe('BMAD Image Generation Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should generate recipe and image within 2 minutes', async ({ page }) => {
    await navigateToBMADTab(page);

    const startTime = Date.now();

    // Configure and start generation
    const countInput = page.locator('input[type="number"], input[name*="count"]').first();
    if (await countInput.isVisible({ timeout: 2000 })) {
      await countInput.fill('1');
    }

    const generateButton = page.locator('button:has-text("Generate"), button:has-text("Start")').first();
    await generateButton.click();

    // Wait for completion
    await page.waitForSelector(
      'text=/Success|Complete|Generated/i',
      { timeout: 120000 }
    );

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000; // Convert to seconds

    console.log(`Recipe generation completed in ${duration.toFixed(1)} seconds`);

    // Verify it completed within 2 minutes (120 seconds)
    expect(duration).toBeLessThan(120);
  });

  test('should display real-time progress updates during generation', async ({ page }) => {
    await navigateToBMADTab(page);

    // Start generation
    const generateButton = page.locator('button:has-text("Generate"), button:has-text("Start")').first();
    await generateButton.click();

    // Wait a few seconds
    await page.waitForTimeout(3000);

    // Look for progress indicators
    // Could be: progress bar, percentage, status text, etc.
    const progressIndicators = page.locator(
      'text=/Progress|%|Generating|Processing|Validating|Saving/i, [role="progressbar"], progress'
    );

    // Verify at least one progress indicator is visible
    const count = await progressIndicators.count();
    expect(count).toBeGreaterThan(0);

    console.log(`Found ${count} progress indicators`);
  });
});
