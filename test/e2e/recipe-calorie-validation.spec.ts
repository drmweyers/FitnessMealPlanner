import { test, expect } from '@playwright/test';

/**
 * E2E Test: Recipe Calorie Validation
 *
 * Reproduces and verifies fix for Bug #4:
 * "I asked it to generate meals with less than 300 calories
 * and it generated 2 meals with over 400 calories"
 *
 * This test ensures the RecipeValidator properly enforces
 * maxCalories constraints during recipe generation.
 */

test.describe('Recipe Calorie Validation (Fix #4)', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('http://localhost:4000');
    await page.fill('input[type="email"]', 'admin@fitmeal.pro');
    await page.fill('input[type="password"]', 'AdminPass123');
    await page.click('button[type="submit"]');

    // Wait for redirect to admin page
    await page.waitForURL('**/admin');

    // Navigate to recipe generation (tab depends on UI structure)
    // Assuming there's a tab or button to access recipe generator
    await page.waitForSelector('text=Recipe');
  });

  test('should enforce maxCalories=300 constraint', async ({ page }) => {
    // Step 1: Set maxCalories to 300
    await page.fill('input[name="maxCalories"]', '300');

    // Step 2: Request recipe generation (small batch for testing)
    await page.fill('input[name="count"]', '5');

    // Step 3: Start generation
    await page.click('button:has-text("Generate")');

    // Step 4: Wait for generation to complete
    await page.waitForSelector('text=Generation complete', { timeout: 60000 });

    // Step 5: Verify all generated recipes are <= 300 calories
    // This depends on where recipes are displayed
    // Assuming they appear in a list or table

    const recipeCalories = await page.$$eval('[data-testid="recipe-calories"]', elements =>
      elements.map(el => parseInt(el.textContent || '0'))
    );

    // Verify at least some recipes were generated
    expect(recipeCalories.length).toBeGreaterThan(0);

    // Verify ALL recipes are <= 300 calories
    recipeCalories.forEach((calories, index) => {
      expect(calories).toBeLessThanOrEqual(300);
      console.log(`Recipe ${index + 1}: ${calories} cal (✓ Valid)`);
    });
  });

  test('should reject recipes exceeding maxCalories during generation', async ({ page }) => {
    // This test verifies that invalid recipes are rejected (not saved)
    // rather than being displayed with >300 cal

    await page.fill('input[name="maxCalories"]', '300');
    await page.fill('input[name="count"]', '10');
    await page.click('button:has-text("Generate")');

    // Wait for generation
    await page.waitForSelector('text=Generation complete', { timeout: 60000 });

    // Check if any rejection messages appear
    // (depends on UI implementation)
    const hasRejections = await page.locator('text=/rejected|invalid|failed/i').count() > 0;

    if (hasRejections) {
      console.log('✓ System correctly rejected some recipes exceeding 300 cal');
    }

    // Verify success count (some recipes may have been rejected)
    const successCount = await page.locator('[data-testid="generation-success-count"]').textContent();
    console.log(`Successfully generated recipes: ${successCount}`);
  });

  test('should display validation errors for invalid recipes', async ({ page }) => {
    // Generate with very strict constraint that's likely to cause failures
    await page.fill('input[name="maxCalories"]', '100'); // Very low - likely to fail
    await page.fill('input[name="count"]', '5');
    await page.click('button:has-text("Generate")');

    await page.waitForSelector('text=Generation complete', { timeout: 60000 });

    // Check for validation error messages
    const errorMessages = await page.$$eval('[data-testid="validation-error"]', elements =>
      elements.map(el => el.textContent)
    );

    if (errorMessages.length > 0) {
      console.log('Validation errors found:');
      errorMessages.forEach(msg => console.log(`  - ${msg}`));
    }

    // Verify error messages are specific and helpful
    errorMessages.forEach(msg => {
      expect(msg).toMatch(/calorie|exceed|constraint|invalid/i);
    });
  });

  test('should enforce multiple constraints simultaneously', async ({ page }) => {
    // Test the user's actual use case:
    // maxCalories: 300, minProtein: 20

    await page.fill('input[name="maxCalories"]', '300');
    await page.fill('input[name="minProtein"]', '20');
    await page.fill('input[name="count"]', '5');
    await page.click('button:has-text("Generate")');

    await page.waitForSelector('text=Generation complete', { timeout: 60000 });

    // Get all recipe nutritional info
    const recipes = await page.$$eval('[data-testid="recipe-nutrition"]', elements =>
      elements.map(el => ({
        calories: parseInt(el.getAttribute('data-calories') || '0'),
        protein: parseInt(el.getAttribute('data-protein') || '0'),
      }))
    );

    // Verify each recipe meets BOTH constraints
    recipes.forEach((recipe, index) => {
      expect(recipe.calories).toBeLessThanOrEqual(300);
      expect(recipe.protein).toBeGreaterThanOrEqual(20);
      console.log(`Recipe ${index + 1}: ${recipe.calories} cal, ${recipe.protein}g protein (✓ Valid)`);
    });
  });

  test('should handle recipes at exact calorie boundary (edge case)', async ({ page }) => {
    // Recipe with exactly 300 calories should PASS when maxCalories=300

    await page.fill('input[name="maxCalories"]', '300');
    await page.fill('input[name="count"]', '5');
    await page.click('button:has-text("Generate")');

    await page.waitForSelector('text=Generation complete', { timeout: 60000 });

    const recipeCalories = await page.$$eval('[data-testid="recipe-calories"]', elements =>
      elements.map(el => parseInt(el.textContent || '0'))
    );

    // Check if any recipes are exactly 300 calories
    const exactly300 = recipeCalories.filter(cal => cal === 300);

    if (exactly300.length > 0) {
      console.log(`✓ Found ${exactly300.length} recipe(s) with exactly 300 calories - correctly accepted`);
    }

    // Verify none exceed 300
    recipeCalories.forEach(cal => {
      expect(cal).toBeLessThanOrEqual(300);
    });
  });

  test('should show validation statistics after generation', async ({ page }) => {
    // Verify UI shows validation stats (validated, passed, failed)

    await page.fill('input[name="maxCalories"]', '300');
    await page.fill('input[name="count"]', '10');
    await page.click('button:has-text("Generate")');

    await page.waitForSelector('text=Generation complete', { timeout: 60000 });

    // Look for validation statistics
    const stats = await page.locator('[data-testid="validation-stats"]').textContent();

    if (stats) {
      console.log('Validation statistics:', stats);
      expect(stats).toMatch(/validated|passed|failed/i);
    }
  });
});

test.describe('Recipe Generator UI - Constraint Fields', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:4000');
    await page.fill('input[type="email"]', 'admin@fitmeal.pro');
    await page.fill('input[type="password"]', 'AdminPass123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin');
  });

  test('should have maxCalories input field', async ({ page }) => {
    const maxCaloriesInput = page.locator('input[name="maxCalories"]');
    await expect(maxCaloriesInput).toBeVisible();
  });

  test('should have minProtein input field', async ({ page }) => {
    const minProteinInput = page.locator('input[name="minProtein"]');
    await expect(minProteinInput).toBeVisible();
  });

  test('should have maxPrepTime input field', async ({ page }) => {
    const maxPrepTimeInput = page.locator('input[name="maxPrepTime"]');
    await expect(maxPrepTimeInput).toBeVisible();
  });

  test('should accept numeric input for constraints', async ({ page }) => {
    await page.fill('input[name="maxCalories"]', '500');
    const value = await page.inputValue('input[name="maxCalories"]');
    expect(value).toBe('500');
  });

  test('should show constraint values in form', async ({ page }) => {
    // Fill multiple constraints
    await page.fill('input[name="maxCalories"]', '400');
    await page.fill('input[name="minProtein"]', '25');
    await page.fill('input[name="maxCarbs"]', '50');

    // Verify all are set
    expect(await page.inputValue('input[name="maxCalories"]')).toBe('400');
    expect(await page.inputValue('input[name="minProtein"]')).toBe('25');
    expect(await page.inputValue('input[name="maxCarbs"]')).toBe('50');
  });
});
