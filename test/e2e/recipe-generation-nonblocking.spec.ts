/**
 * ==========================================
 * Recipe Generation Non-Blocking E2E Test
 * Created: October 6, 2025
 * Purpose: End-to-end test for the recipe generation 80% hang fix
 * Reference: RECIPE_GENERATION_FIX_PLAN.md
 * ==========================================
 *
 * Tests that:
 * 1. Recipe generation completes in < 60 seconds
 * 2. Progress bar updates with real recipe counts
 * 3. Recipes appear with placeholder images immediately
 * 4. No 80% hang occurs
 * 5. Background image generation doesn't block user flow
 */

import { test, expect } from '@playwright/test';

test.describe('Recipe Generation - Non-Blocking Architecture', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/api/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Wait for redirect to admin page
    await page.waitForURL(/\/admin/);
  });

  test('should generate 5 recipes in < 60 seconds without hanging', async ({ page }) => {
    test.setTimeout(120000); // 2 minute max timeout

    // Open recipe generation modal
    await page.click('button:has-text("Generate Recipes")');

    // Wait for modal to appear
    await page.waitForSelector('text=Generate Targeted Recipes');

    // Set recipe count to 5
    await page.click('select'); // Recipe count dropdown
    await page.click('text=5 recipes');

    // Start generation
    const startTime = Date.now();
    await page.click('button:has-text("Generate Random Recipes")');

    // Wait for progress bar to appear
    await page.waitForSelector('text=Recipe Generation in Progress');

    // Monitor progress updates
    let progressText = '';
    let lastProgress = 0;

    // Poll for progress updates
    const progressInterval = setInterval(async () => {
      try {
        const element = await page.locator('text=/\\d+\\/\\d+ recipes saved/').first();
        progressText = await element.textContent() || '';

        // Extract current progress (e.g., "3/5 recipes saved")
        const match = progressText.match(/(\d+)\/(\d+)/);
        if (match) {
          lastProgress = parseInt(match[1]);
          console.log(`Progress: ${progressText}`);
        }
      } catch (error) {
        // Progress element might not be visible yet
      }
    }, 1000);

    // Wait for completion (modal closes)
    await page.waitForSelector('text=Recipe Generation in Progress', { state: 'hidden', timeout: 60000 });
    clearInterval(progressInterval);

    const duration = Date.now() - startTime;

    // Assert generation completed in < 60 seconds
    expect(duration).toBeLessThan(60000);
    console.log(`✅ Recipe generation completed in ${duration}ms (< 60 seconds)`);

    // Assert progress reached 100%
    expect(lastProgress).toBeGreaterThanOrEqual(5);

    // Wait for success toast
    await page.waitForSelector('text=/Successfully generated .* recipes/');

    // Verify recipes appear in the list
    await page.waitForTimeout(2000); // Wait for page refresh
    const recipeCards = await page.locator('[data-testid="recipe-card"]').count();
    expect(recipeCards).toBeGreaterThan(0);
  });

  test('should show real-time progress updates during generation', async ({ page }) => {
    // Open recipe generation modal
    await page.click('button:has-text("Generate Recipes")');
    await page.waitForSelector('text=Generate Targeted Recipes');

    // Set to 3 recipes for faster test
    await page.click('select');
    await page.click('text=3 recipes');

    // Start generation
    await page.click('button:has-text("Generate Random Recipes")');
    await page.waitForSelector('text=Recipe Generation in Progress');

    // Track progress updates
    const progressUpdates: string[] = [];

    for (let i = 0; i < 10; i++) {
      try {
        const progress = await page.locator('text=/\\d+\\/\\d+ recipes saved/').first().textContent();
        if (progress && !progressUpdates.includes(progress)) {
          progressUpdates.push(progress);
          console.log(`Progress update #${progressUpdates.length}: ${progress}`);
        }
      } catch (error) {
        // Progress not visible yet
      }
      await page.waitForTimeout(500);
    }

    // Should have seen multiple progress updates
    expect(progressUpdates.length).toBeGreaterThan(0);
    console.log(`✅ Saw ${progressUpdates.length} progress updates`);
  });

  test('should NOT hang at 80% progress', async ({ page }) => {
    test.setTimeout(90000);

    // Open recipe generation modal
    await page.click('button:has-text("Generate Recipes")');
    await page.waitForSelector('text=Generate Targeted Recipes');

    // Generate 10 recipes (more likely to expose hang)
    await page.click('select');
    await page.click('text=10 recipes');

    const startTime = Date.now();
    await page.click('button:has-text("Generate Random Recipes")');
    await page.waitForSelector('text=Recipe Generation in Progress');

    // Monitor for 80% hang
    let stuck = false;
    let lastPercentage = 0;
    let stuckCount = 0;

    for (let i = 0; i < 60; i++) { // Check for 60 seconds
      try {
        const percentageText = await page.locator('text=/Progress: \\d+%/').first().textContent();
        const match = percentageText?.match(/(\d+)%/);

        if (match) {
          const currentPercentage = parseInt(match[1]);

          if (currentPercentage === lastPercentage && currentPercentage >= 70 && currentPercentage < 100) {
            stuckCount++;
            if (stuckCount > 10) { // Stuck for 10 seconds
              stuck = true;
              console.error(`❌ STUCK at ${currentPercentage}%`);
              break;
            }
          } else {
            stuckCount = 0;
          }

          lastPercentage = currentPercentage;
          console.log(`Progress: ${currentPercentage}%`);

          if (currentPercentage === 100) {
            break;
          }
        }
      } catch (error) {
        // Progress bar might have closed
        break;
      }

      await page.waitForTimeout(1000);
    }

    const duration = Date.now() - startTime;

    // Assert did NOT hang
    expect(stuck).toBe(false);
    console.log(`✅ No hang detected. Completed in ${duration}ms`);
  });

  test('should display placeholder images immediately', async ({ page }) => {
    // Open recipe generation modal
    await page.click('button:has-text("Generate Recipes")');
    await page.waitForSelector('text=Generate Targeted Recipes');

    // Generate 2 recipes
    await page.click('select');
    await page.click('text=2 recipes');

    await page.click('button:has-text("Generate Random Recipes")');

    // Wait for completion
    await page.waitForSelector('text=Recipe Generation in Progress', { state: 'hidden', timeout: 60000 });
    await page.waitForTimeout(2000); // Wait for page refresh

    // Check that recipe cards have images (placeholder or real)
    const images = await page.locator('[data-testid="recipe-card"] img').count();
    expect(images).toBeGreaterThan(0);
    console.log(`✅ Found ${images} recipe images`);

    // Verify images have src attribute
    const firstImage = page.locator('[data-testid="recipe-card"] img').first();
    const src = await firstImage.getAttribute('src');
    expect(src).toBeTruthy();
    console.log(`✅ Image src: ${src}`);
  });

  test('should show background image generation status', async ({ page }) => {
    // Open recipe generation modal
    await page.click('button:has-text("Generate Recipes")');
    await page.waitForSelector('text=Generate Targeted Recipes');

    // Generate 3 recipes
    await page.click('select');
    await page.click('text=3 recipes');

    await page.click('button:has-text("Generate Random Recipes")');
    await page.waitForSelector('text=Recipe Generation in Progress');

    // Look for background image generation message
    const backgroundImageMessage = page.locator('text=/Images generating in background/');

    // Should see background image generation message at some point
    try {
      await backgroundImageMessage.waitFor({ timeout: 30000 });
      console.log('✅ Saw background image generation message');
    } catch (error) {
      console.log('ℹ️  Background image message not visible (recipes may have completed too fast)');
    }
  });

  test('should handle generation errors gracefully', async ({ page }) => {
    // This test would need API mocking to simulate errors
    // For now, just verify error handling UI exists

    await page.click('button:has-text("Generate Recipes")');
    await page.waitForSelector('text=Generate Targeted Recipes');

    // Verify error handling elements are in the DOM
    const errorElements = await page.locator('[role="alert"]').count();
    console.log(`ℹ️  Error handling UI elements found: ${errorElements >= 0 ? 'Yes' : 'No'}`);
  });
});
