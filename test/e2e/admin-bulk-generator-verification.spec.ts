import { test, expect } from '@playwright/test';

/**
 * Admin Bulk Generator Verification Tests
 *
 * Purpose: Verify Recipe Library tab no longer has Generate Recipes button
 *          and Bulk Generator tab has new fields (Focus Ingredient, Difficulty, Preferences)
 *
 * Test Coverage:
 * 1. Recipe Library tab - verify NO "Generate Recipes" button
 * 2. Bulk Generator tab - verify new fields exist and function
 * 3. Form interaction - verify all new fields work correctly
 * 4. Removed fields - verify old fields are gone
 *
 * Created: January 2025
 * Last Updated: January 2025
 */

const BASE_URL = 'http://localhost:4000';
const ADMIN_EMAIL = 'admin@fitmeal.pro';
const ADMIN_PASSWORD = 'AdminPass123';

test.describe('Admin Bulk Generator Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto(BASE_URL);

    // Login as admin
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for navigation to admin dashboard
    await page.waitForURL(`${BASE_URL}/admin`, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Wait for admin dashboard to fully load
    await expect(page.getByRole('tab', { name: /Recipe Library/i })).toBeVisible({ timeout: 10000 });
  });

  test('1. Recipe Library Tab - Verify NO Generate Recipes Button', async ({ page }) => {
    // Click Recipe Library tab
    await page.getByRole('tab', { name: /Recipe Library/i }).click();
    await page.waitForTimeout(1000);

    // Verify "Generate Recipes" button does NOT exist
    const generateRecipesButton = page.locator('button:has-text("Generate Recipes")');
    await expect(generateRecipesButton).toHaveCount(0);

    // Verify only "Review Queue" and "Export Data" buttons exist
    const reviewQueueButton = page.locator('button:has-text("Review Queue")');
    await expect(reviewQueueButton).toBeVisible();

    const exportDataButton = page.locator('button:has-text("Export Data")');
    await expect(exportDataButton).toBeVisible();

    // Take screenshot for evidence
    await page.screenshot({
      path: 'test-results/recipe-library-no-generate-button.png',
      fullPage: true
    });

    console.log('✅ Recipe Library tab verified: NO "Generate Recipes" button found');
  });

  test('2. Bulk Generator Tab - New Fields Verification', async ({ page }) => {
    // Navigate to Bulk Generator tab
    const bulkGeneratorTab = page.locator('button:has-text("Bulk Generator"), button:has-text("BMAD Generator")').first();
    await bulkGeneratorTab.click();
    await page.waitForTimeout(1500);

    // Verify "Focus Ingredient" field exists
    const focusIngredientLabel = page.locator('label:has-text("Focus Ingredient")');
    await expect(focusIngredientLabel).toBeVisible();

    const focusIngredientInput = page.locator('input[name="focusIngredient"], input[placeholder*="ingredient" i]').first();
    await expect(focusIngredientInput).toBeVisible();

    // Verify "Difficulty Level" dropdown exists
    const difficultyLabel = page.locator('label:has-text("Difficulty Level")');
    await expect(difficultyLabel).toBeVisible();

    const difficultySelect = page.locator('select[name="difficultyLevel"], select').filter({ hasText: /Any Difficulty|Easy|Medium|Hard/ }).first();
    await expect(difficultySelect).toBeVisible();

    // Verify dropdown has correct options
    const difficultyOptions = await difficultySelect.locator('option').allTextContents();
    expect(difficultyOptions).toContain('Any Difficulty');
    expect(difficultyOptions).toContain('Easy');
    expect(difficultyOptions).toContain('Medium');
    expect(difficultyOptions).toContain('Hard');

    // Verify "Recipe Preferences" textarea exists
    const preferencesLabel = page.locator('label:has-text("Recipe Preferences")');
    await expect(preferencesLabel).toBeVisible();

    const preferencesTextarea = page.locator('textarea[name="recipePreferences"], textarea[placeholder*="preference" i]').first();
    await expect(preferencesTextarea).toBeVisible();

    // Verify "Maximum Number of Ingredients" label (updated label)
    const maxIngredientsLabel = page.locator('label:has-text("Maximum Number of Ingredients")');
    await expect(maxIngredientsLabel).toBeVisible();

    // Take screenshot
    await page.screenshot({
      path: 'test-results/bulk-generator-new-fields.png',
      fullPage: true
    });

    console.log('✅ Bulk Generator tab verified: All new fields present');
  });

  test('3. Form Interaction Test - Fill and Verify New Fields', async ({ page }) => {
    // Navigate to Bulk Generator tab
    const bulkGeneratorTab = page.locator('button:has-text("Bulk Generator"), button:has-text("BMAD Generator")').first();
    await bulkGeneratorTab.click();
    await page.waitForTimeout(1500);

    // Fill Focus Ingredient
    const focusIngredientInput = page.locator('input[name="focusIngredient"], input[placeholder*="ingredient" i]').first();
    await focusIngredientInput.fill('chicken');
    await expect(focusIngredientInput).toHaveValue('chicken');

    // Select Difficulty Level "Easy"
    const difficultySelect = page.locator('select[name="difficultyLevel"], select').filter({ hasText: /Any Difficulty|Easy|Medium|Hard/ }).first();
    await difficultySelect.selectOption('Easy');
    const selectedValue = await difficultySelect.inputValue();
    expect(selectedValue.toLowerCase()).toContain('easy');

    // Fill Recipe Preferences
    const preferencesTextarea = page.locator('textarea[name="recipePreferences"], textarea[placeholder*="preference" i]').first();
    await preferencesTextarea.fill('family-friendly');
    await expect(preferencesTextarea).toHaveValue('family-friendly');

    // Fill Maximum Number of Ingredients
    const maxIngredientsInput = page.locator('input[name="maxIngredients"], input[type="number"]').filter({
      has: page.locator('xpath=./preceding::label[contains(text(), "Maximum Number of Ingredients")]')
    }).first();
    await maxIngredientsInput.fill('15');
    await expect(maxIngredientsInput).toHaveValue('15');

    // Take screenshot after filling
    await page.screenshot({
      path: 'test-results/bulk-generator-filled-form.png',
      fullPage: true
    });

    console.log('✅ Form interaction verified: All fields filled correctly');
    console.log('  - Focus Ingredient: chicken');
    console.log('  - Difficulty Level: Easy');
    console.log('  - Recipe Preferences: family-friendly');
    console.log('  - Maximum Ingredients: 15');
  });

  test('4. Removed Fields Verification', async ({ page }) => {
    // Navigate to Bulk Generator tab
    const bulkGeneratorTab = page.locator('button:has-text("Bulk Generator"), button:has-text("BMAD Generator")').first();
    await bulkGeneratorTab.click();
    await page.waitForTimeout(1500);

    // Verify "Daily Calorie Goal" field does NOT exist
    const calorieGoalLabel = page.locator('label:has-text("Daily Calorie Goal")');
    await expect(calorieGoalLabel).toHaveCount(0);

    // Verify "Number of Days" field does NOT exist
    const numberOfDaysLabel = page.locator('label:has-text("Number of Days")');
    await expect(numberOfDaysLabel).toHaveCount(0);

    // Verify "Meals Per Day" field does NOT exist
    const mealsPerDayLabel = page.locator('label:has-text("Meals Per Day")');
    await expect(mealsPerDayLabel).toHaveCount(0);

    // Verify "Description" field does NOT exist (generic field name)
    const descriptionLabel = page.locator('label:has-text("Description")').filter({
      has: page.locator('xpath=./following-sibling::textarea')
    });
    await expect(descriptionLabel).toHaveCount(0);

    // Take screenshot
    await page.screenshot({
      path: 'test-results/bulk-generator-removed-fields.png',
      fullPage: true
    });

    console.log('✅ Removed fields verified: All old fields removed');
    console.log('  - Daily Calorie Goal: NOT FOUND ✓');
    console.log('  - Number of Days: NOT FOUND ✓');
    console.log('  - Meals Per Day: NOT FOUND ✓');
    console.log('  - Description: NOT FOUND ✓');
  });

  test('5. Complete Form Workflow - End to End', async ({ page }) => {
    // Navigate to Bulk Generator tab
    const bulkGeneratorTab = page.locator('button:has-text("Bulk Generator"), button:has-text("BMAD Generator")').first();
    await bulkGeneratorTab.click();
    await page.waitForTimeout(1500);

    // Fill all new fields
    const focusIngredientInput = page.locator('input[name="focusIngredient"], input[placeholder*="ingredient" i]').first();
    await focusIngredientInput.fill('salmon');

    const difficultySelect = page.locator('select[name="difficultyLevel"], select').filter({ hasText: /Any Difficulty|Easy|Medium|Hard/ }).first();
    await difficultySelect.selectOption('Medium');

    const preferencesTextarea = page.locator('textarea[name="recipePreferences"], textarea[placeholder*="preference" i]').first();
    await preferencesTextarea.fill('low-carb, high-protein, omega-3 rich');

    const maxIngredientsInput = page.locator('input[name="maxIngredients"], input[type="number"]').filter({
      has: page.locator('xpath=./preceding::label[contains(text(), "Maximum Number of Ingredients")]')
    }).first();
    await maxIngredientsInput.fill('12');

    // Fill number of recipes to generate (should still exist)
    const numRecipesInput = page.locator('input[name="numRecipes"], input[type="number"]').first();
    if (await numRecipesInput.isVisible()) {
      await numRecipesInput.fill('5');
    }

    // Verify all values are set correctly
    await expect(focusIngredientInput).toHaveValue('salmon');
    const selectedDifficulty = await difficultySelect.inputValue();
    expect(selectedDifficulty.toLowerCase()).toContain('medium');
    await expect(preferencesTextarea).toHaveValue('low-carb, high-protein, omega-3 rich');
    await expect(maxIngredientsInput).toHaveValue('12');

    // Take final screenshot
    await page.screenshot({
      path: 'test-results/bulk-generator-complete-workflow.png',
      fullPage: true
    });

    console.log('✅ Complete workflow verified successfully');
    console.log('  - Focus Ingredient: salmon');
    console.log('  - Difficulty Level: Medium');
    console.log('  - Recipe Preferences: low-carb, high-protein, omega-3 rich');
    console.log('  - Maximum Ingredients: 12');
  });

  test('6. Tab Navigation Consistency', async ({ page }) => {
    // Verify Recipe Library tab
    await page.getByRole('tab', { name: /Recipe Library/i }).click();
    await page.waitForTimeout(1000);

    const generateRecipesButton = page.locator('button:has-text("Generate Recipes")');
    await expect(generateRecipesButton).toHaveCount(0);

    // Navigate to Bulk Generator and back to Recipe Library
    const bulkGeneratorTab = page.locator('button:has-text("Bulk Generator"), button:has-text("BMAD Generator")').first();
    await bulkGeneratorTab.click();
    await page.waitForTimeout(1000);

    await page.getByRole('tab', { name: /Recipe Library/i }).click();
    await page.waitForTimeout(1000);

    // Verify button still doesn't exist after navigation
    await expect(generateRecipesButton).toHaveCount(0);

    // Take screenshot
    await page.screenshot({
      path: 'test-results/tab-navigation-consistency.png',
      fullPage: true
    });

    console.log('✅ Tab navigation consistency verified');
  });
});

/**
 * Test Execution Notes:
 *
 * Run all tests:
 * npx playwright test test/e2e/admin-bulk-generator-verification.spec.ts
 *
 * Run with UI:
 * npx playwright test test/e2e/admin-bulk-generator-verification.spec.ts --ui
 *
 * Run specific test:
 * npx playwright test test/e2e/admin-bulk-generator-verification.spec.ts -g "Recipe Library Tab"
 *
 * Run in debug mode:
 * npx playwright test test/e2e/admin-bulk-generator-verification.spec.ts --debug
 *
 * Expected Results:
 * ✅ All 6 tests should pass
 * ✅ Screenshots saved to test-results/
 * ✅ No "Generate Recipes" button in Recipe Library tab
 * ✅ All new fields present and functional in Bulk Generator tab
 * ✅ All old fields removed
 */
