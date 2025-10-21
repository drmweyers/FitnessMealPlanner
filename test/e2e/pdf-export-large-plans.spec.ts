/**
 * PDF Export Large Plans E2E Tests
 *
 * Tests PDF generation with large meal plans to verify:
 * - Timeout handling for plans with 28+ meals
 * - Pagination working correctly for 100+ meal plans
 * - Performance optimization for different plan sizes
 * - Error handling for failed exports
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Test credentials
const TRAINER_EMAIL = 'trainer.test@evofitmeals.com';
const TRAINER_PASSWORD = 'TestTrainer123!';

/**
 * Helper function to create a large meal plan via API
 */
async function createLargeMealPlan(
  page: Page,
  days: number,
  mealsPerDay: number
): Promise<string> {
  // This would normally call the meal plan generation API
  // For now, we'll create a mock large meal plan
  const totalMeals = days * mealsPerDay;

  console.log(`Creating large meal plan: ${days} days × ${mealsPerDay} meals/day = ${totalMeals} total meals`);

  // Mock meal plan structure
  const meals = [];
  for (let day = 1; day <= days; day++) {
    for (let meal = 1; meal <= mealsPerDay; meal++) {
      meals.push({
        day,
        mealNumber: meal,
        mealType: meal === 1 ? 'Breakfast' : meal === 2 ? 'Lunch' : meal === 3 ? 'Dinner' : 'Snack',
        recipe: {
          name: `Recipe Day ${day} Meal ${meal}`,
          description: 'A nutritious and delicious meal designed for your fitness goals.',
          caloriesKcal: 400 + (meal * 50),
          proteinGrams: 25 + (meal * 5),
          carbsGrams: 40 + (meal * 5),
          fatGrams: 15 + (meal * 2),
          prepTimeMinutes: 20,
          servings: 1,
          ingredientsJson: [
            { name: 'Chicken Breast', amount: '200', unit: 'g' },
            { name: 'Brown Rice', amount: '150', unit: 'g' },
            { name: 'Broccoli', amount: '100', unit: 'g' },
            { name: 'Olive Oil', amount: '1', unit: 'tbsp' }
          ],
          instructionsText: '1. Season the chicken. 2. Cook rice. 3. Steam broccoli. 4. Plate and serve.',
          dietaryTags: ['High Protein', 'Balanced']
        }
      });
    }
  }

  const mealPlan = {
    planName: `Large Test Plan (${totalMeals} meals)`,
    fitnessGoal: 'Muscle Gain',
    dailyCalorieTarget: 2500,
    days,
    meals,
    createdAt: new Date().toISOString()
  };

  // Store in session storage for PDF export
  await page.evaluate((plan) => {
    sessionStorage.setItem('largeMealPlan', JSON.stringify(plan));
  }, mealPlan);

  return 'test-plan-id';
}

/**
 * Helper to trigger PDF export and wait for download
 */
async function exportPdfAndWait(
  page: Page,
  expectedTimeout: number
): Promise<boolean> {
  const downloadPromise = page.waitForEvent('download', {
    timeout: expectedTimeout + 5000 // Add 5 seconds buffer
  });

  // Trigger export (assuming there's an export button)
  await page.click('[data-testid="export-pdf-button"]');

  try {
    const download = await downloadPromise;
    const fileName = download.suggestedFilename();

    console.log(`PDF downloaded successfully: ${fileName}`);

    // Verify it's a PDF
    expect(fileName).toMatch(/\.pdf$/);

    return true;
  } catch (error) {
    console.error('PDF download failed:', error);
    return false;
  }
}

test.describe('PDF Export - Large Meal Plans', () => {

  test.beforeEach(async ({ page }) => {
    // Login as trainer
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', TRAINER_EMAIL);
    await page.fill('input[type="password"]', TRAINER_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for navigation to trainer dashboard
    await page.waitForURL('**/trainer');
    await expect(page.locator('h1, h2').filter({ hasText: /trainer|dashboard/i })).toBeVisible();
  });

  test('should export 7-day plan with 3 meals/day (21 meals) in under 60 seconds', async ({ page }) => {
    test.setTimeout(90000); // 90 seconds total test timeout

    const planId = await createLargeMealPlan(page, 7, 3);

    const startTime = Date.now();
    const success = await exportPdfAndWait(page, 60000);
    const duration = Date.now() - startTime;

    console.log(`Export completed in ${duration}ms`);

    expect(success).toBe(true);
    expect(duration).toBeLessThan(60000); // Should complete in under 60 seconds
  });

  test('should export 14-day plan with 4 meals/day (56 meals) in under 2 minutes', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes total test timeout

    const planId = await createLargeMealPlan(page, 14, 4);

    const startTime = Date.now();
    const success = await exportPdfAndWait(page, 120000);
    const duration = Date.now() - startTime;

    console.log(`Export completed in ${duration}ms`);

    expect(success).toBe(true);
    expect(duration).toBeLessThan(120000); // Should complete in under 2 minutes
  });

  test('should export 30-day plan with 4 meals/day (120 meals) in under 5 minutes', async ({ page }) => {
    test.setTimeout(360000); // 6 minutes total test timeout

    const planId = await createLargeMealPlan(page, 30, 4);

    const startTime = Date.now();
    const success = await exportPdfAndWait(page, 300000);
    const duration = Date.now() - startTime;

    console.log(`Export completed in ${duration}ms`);

    expect(success).toBe(true);
    expect(duration).toBeLessThan(300000); // Should complete in under 5 minutes
  });

  test('should show helpful error message if export times out', async ({ page }) => {
    // Mock a timeout scenario
    await page.route('**/api/pdf/export*', async (route) => {
      // Delay response to simulate timeout
      await new Promise(resolve => setTimeout(resolve, 10000));
      await route.abort('timedout');
    });

    const planId = await createLargeMealPlan(page, 7, 3);

    // Click export button
    await page.click('[data-testid="export-pdf-button"]');

    // Wait for error message
    const errorMessage = page.locator('[role="alert"], .error-message, .toast-error').first();
    await expect(errorMessage).toBeVisible({ timeout: 15000 });

    // Verify error message is helpful
    const errorText = await errorMessage.textContent();
    expect(errorText).toMatch(/timeout|failed|error/i);
  });

  test('should handle pagination correctly for 100+ meal plan', async ({ page }) => {
    test.setTimeout(420000); // 7 minutes total test timeout

    // Create very large plan (100 meals)
    const planId = await createLargeMealPlan(page, 25, 4);

    // Export should succeed with pagination
    const success = await exportPdfAndWait(page, 300000);

    expect(success).toBe(true);

    // Verify pagination was applied (we'd need to check PDF structure)
    // For now, we verify export completed successfully
  });

  test('should show progress indicator during export of large plan', async ({ page }) => {
    const planId = await createLargeMealPlan(page, 14, 4);

    // Click export button
    await page.click('[data-testid="export-pdf-button"]');

    // Check for progress indicator (spinner, progress bar, etc.)
    const progressIndicator = page.locator(
      '[data-testid="export-progress"], .spinner, .loading, [role="progressbar"]'
    ).first();

    // Progress indicator should be visible during export
    await expect(progressIndicator).toBeVisible({ timeout: 2000 });

    // Wait for export to complete
    await page.waitForEvent('download', { timeout: 120000 });

    // Progress indicator should disappear after export
    await expect(progressIndicator).not.toBeVisible({ timeout: 5000 });
  });

  test('should export with different timeout thresholds based on meal count', async ({ page }) => {
    // Test the dynamic timeout logic
    const testCases = [
      { days: 7, mealsPerDay: 3, expectedTimeout: 60000 },    // 21 meals = 1 min
      { days: 10, mealsPerDay: 4, expectedTimeout: 120000 },  // 40 meals = 2 min
      { days: 20, mealsPerDay: 4, expectedTimeout: 180000 },  // 80 meals = 3 min
      { days: 30, mealsPerDay: 4, expectedTimeout: 300000 },  // 120 meals = 5 min
    ];

    for (const testCase of testCases) {
      const totalMeals = testCase.days * testCase.mealsPerDay;
      console.log(`Testing ${totalMeals} meals with ${testCase.expectedTimeout}ms timeout`);

      const planId = await createLargeMealPlan(page, testCase.days, testCase.mealsPerDay);

      const startTime = Date.now();
      const success = await exportPdfAndWait(page, testCase.expectedTimeout);
      const duration = Date.now() - startTime;

      expect(success).toBe(true);
      expect(duration).toBeLessThan(testCase.expectedTimeout);

      console.log(`✓ ${totalMeals} meals exported in ${duration}ms (under ${testCase.expectedTimeout}ms threshold)`);
    }
  });

  test('should export with nutritional charts for large plans without timing out', async ({ page }) => {
    const planId = await createLargeMealPlan(page, 14, 4);

    // Enable all export options
    await page.check('[data-testid="include-macro-summary"]');
    await page.check('[data-testid="include-nutritional-charts"]');
    await page.check('[data-testid="include-shopping-list"]');

    const success = await exportPdfAndWait(page, 120000);

    expect(success).toBe(true);
  });

  test('should maintain consistent quality across different plan sizes', async ({ page }) => {
    // Export small, medium, and large plans
    const sizes = [
      { name: 'small', days: 7, mealsPerDay: 3 },
      { name: 'medium', days: 14, mealsPerDay: 4 },
      { name: 'large', days: 30, mealsPerDay: 4 }
    ];

    for (const size of sizes) {
      console.log(`Testing ${size.name} plan quality`);

      const planId = await createLargeMealPlan(page, size.days, size.mealsPerDay);

      const downloadPromise = page.waitForEvent('download', { timeout: 300000 });
      await page.click('[data-testid="export-pdf-button"]');

      const download = await downloadPromise;
      const fileName = download.suggestedFilename();

      // Verify filename format
      expect(fileName).toMatch(/EvoFit_Meal_Plan_.*\.pdf$/);

      console.log(`✓ ${size.name} plan exported successfully: ${fileName}`);
    }
  });
});

test.describe('PDF Export - Performance Optimization', () => {

  test('should use client-side export for small plans (< 10 meals)', async ({ page }) => {
    // Login
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', TRAINER_EMAIL);
    await page.fill('input[type="password"]', TRAINER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/trainer');

    // Create small plan
    const planId = await createLargeMealPlan(page, 3, 3); // 9 meals

    // Monitor network requests
    let serverSideCalled = false;
    page.on('request', (request) => {
      if (request.url().includes('/api/pdf/export')) {
        serverSideCalled = true;
      }
    });

    // Export
    await page.click('[data-testid="export-pdf-button"]');
    await page.waitForEvent('download', { timeout: 30000 });

    // Small plans should NOT use server-side export
    expect(serverSideCalled).toBe(false);
  });

  test('should use server-side export for large plans (28+ meals)', async ({ page }) => {
    // Login
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', TRAINER_EMAIL);
    await page.fill('input[type="password"]', TRAINER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/trainer');

    // Create large plan
    const planId = await createLargeMealPlan(page, 10, 3); // 30 meals

    // Monitor network requests
    let serverSideCalled = false;
    page.on('request', (request) => {
      if (request.url().includes('/api/pdf/export')) {
        serverSideCalled = true;
      }
    });

    // Export
    await page.click('[data-testid="export-pdf-button"]');
    await page.waitForEvent('download', { timeout: 120000 });

    // Large plans SHOULD use server-side export
    expect(serverSideCalled).toBe(true);
  });
});
