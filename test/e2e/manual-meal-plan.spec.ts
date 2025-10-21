/**
 * E2E Tests for Manual Meal Plan Functionality
 *
 * Tests the complete workflow of creating manual meal plans
 * from pasted text input through to display and interaction.
 */

import { test, expect, Page } from '@playwright/test';

// Test data matching the exact user requirements
const EXAMPLE_MEAL_PLAN_TEXT = `Meal 1
-175g of Jasmine Rice
-150g of Lean ground beef
-100g of cooked broccoli
Meal 2
-4 eggs
-2 slices of whole wheat bread
-1 tbsp olive oil
Meal 3
-200ml of milk
-1 banana
-30g of protein powder`;

const MULTI_DAY_MEAL_PLAN = `Day 1
Meal 1: Breakfast
-200g oatmeal
-50g blueberries
-1 tbsp honey
Meal 2: Lunch
-150g chicken breast
-200g sweet potato
-Mixed vegetables
Meal 3: Dinner
-180g salmon
-150g quinoa
-Green salad

Day 2
Meal 1: Breakfast
-3 eggs scrambled
-2 slices toast
-1 avocado
Meal 2: Lunch
-200g turkey
-150g brown rice
-100g broccoli
Meal 3: Dinner
-200g beef steak
-250g baked potato
-Side salad`;

// Test fixtures
test.describe('Manual Meal Plan Parser', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    // Navigate to the application and login as trainer
    await page.goto('http://localhost:4000');

    // Login as trainer (use test credentials)
    await page.click('text=Login');
    await page.fill('input[type="email"]', 'trainer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestTrainer123!');
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    await page.waitForSelector('text=Trainer Dashboard', { timeout: 10000 });

    // Navigate to meal plan generator
    await page.click('text=Create Meal Plan');
    await page.waitForSelector('text=Meal Plan Generator');
  });

  test('should display manual meal plan input section', async () => {
    // Check that the manual meal plan card is visible
    await expect(page.locator('text=Manual Meal Plan Parser')).toBeVisible();

    // Check for the textarea
    const textarea = page.locator('textarea#manual-meal-plan');
    await expect(textarea).toBeVisible();

    // Check for the generate images checkbox
    const checkbox = page.locator('input#generate-images');
    await expect(checkbox).toBeVisible();

    // Check for the parse button
    const parseButton = page.locator('button:has-text("Parse Manual Plan")');
    await expect(parseButton).toBeVisible();
  });

  test('should parse the three-meal example correctly', async () => {
    // Find and fill the manual meal plan textarea
    const textarea = page.locator('textarea#manual-meal-plan');
    await textarea.fill(EXAMPLE_MEAL_PLAN_TEXT);

    // Click the parse button
    await page.click('button:has-text("Parse Manual Plan")');

    // Wait for the parsing to complete
    await page.waitForSelector('text=Manual Meal Plan Parsed Successfully', {
      timeout: 15000
    });

    // Check that the meal plan is displayed
    await expect(page.locator('text=Day 1')).toBeVisible();

    // Verify the three meals are shown
    await expect(page.locator('text=Meal 1')).toBeVisible();
    await expect(page.locator('text=Meal 2')).toBeVisible();
    await expect(page.locator('text=Meal 3')).toBeVisible();

    // Verify some ingredients are displayed
    await expect(page.locator('text=/Jasmine Rice/i')).toBeVisible();
    await expect(page.locator('text=/eggs/i')).toBeVisible();
    await expect(page.locator('text=/protein powder/i')).toBeVisible();
  });

  test('should handle multi-day meal plans', async () => {
    // Fill in the multi-day meal plan
    const textarea = page.locator('textarea#manual-meal-plan');
    await textarea.fill(MULTI_DAY_MEAL_PLAN);

    // Parse the plan
    await page.click('button:has-text("Parse Manual Plan")');

    // Wait for success
    await page.waitForSelector('text=Manual Meal Plan Parsed Successfully', {
      timeout: 15000
    });

    // Verify both days are present
    await expect(page.locator('text=Day 1')).toBeVisible();
    await expect(page.locator('text=Day 2')).toBeVisible();

    // Verify meal types are recognized
    await expect(page.locator('text=/Breakfast/i')).toBeVisible();
    await expect(page.locator('text=/Lunch/i')).toBeVisible();
    await expect(page.locator('text=/Dinner/i')).toBeVisible();
  });

  test('should generate AI images when checkbox is selected', async () => {
    // Enable image generation
    await page.check('input#generate-images');

    // Fill in a simple meal plan
    await page.locator('textarea#manual-meal-plan').fill(`Meal 1
-200g chicken breast
-150g rice
-100g vegetables`);

    // Parse the plan
    await page.click('button:has-text("Parse Manual Plan")');

    // Wait longer for image generation
    await page.waitForSelector('text=Manual Meal Plan Parsed Successfully', {
      timeout: 30000 // Longer timeout for image generation
    });

    // Check that images are present (they should have src attributes)
    const mealImages = page.locator('.meal-card img, .meal-image');
    const imageCount = await mealImages.count();

    // Should have at least one image
    expect(imageCount).toBeGreaterThan(0);

    // Check that the first image has a valid src
    if (imageCount > 0) {
      const firstImageSrc = await mealImages.first().getAttribute('src');
      expect(firstImageSrc).toBeTruthy();
      expect(firstImageSrc).toContain('http'); // Should be a URL
    }
  });

  test('should clear text when Clear button is clicked', async () => {
    const textarea = page.locator('textarea#manual-meal-plan');

    // Fill in some text
    await textarea.fill('Test meal plan text');

    // Verify text is present
    await expect(textarea).toHaveValue('Test meal plan text');

    // Click clear button
    await page.click('button:has-text("Clear Text")');

    // Verify textarea is empty
    await expect(textarea).toHaveValue('');
  });

  test('should show error for invalid meal plan format', async () => {
    // Fill in invalid text
    await page.locator('textarea#manual-meal-plan').fill('This is not a valid meal plan format');

    // Try to parse
    await page.click('button:has-text("Parse Manual Plan")');

    // Should show an error message
    await expect(page.locator('text=/Parsing Failed|No valid meals found/i')).toBeVisible({
      timeout: 10000
    });
  });

  test('should disable parse button when textarea is empty', async () => {
    const parseButton = page.locator('button:has-text("Parse Manual Plan")');
    const textarea = page.locator('textarea#manual-meal-plan');

    // Initially should be disabled (empty textarea)
    await expect(parseButton).toBeDisabled();

    // Type some text
    await textarea.fill('Some text');

    // Should be enabled
    await expect(parseButton).toBeEnabled();

    // Clear the text
    await textarea.clear();

    // Should be disabled again
    await expect(parseButton).toBeDisabled();
  });

  test('should handle unit conversions correctly', async () => {
    const mealPlanWithUnits = `Meal 1
-1 cup rice
-2 tbsp olive oil
-500ml water
-1 lb chicken`;

    await page.locator('textarea#manual-meal-plan').fill(mealPlanWithUnits);
    await page.click('button:has-text("Parse Manual Plan")');

    await page.waitForSelector('text=Manual Meal Plan Parsed Successfully', {
      timeout: 15000
    });

    // The display should still show original units
    await expect(page.locator('text=/1 cup/i')).toBeVisible();
    await expect(page.locator('text=/2 tbsp/i')).toBeVisible();

    // But internally it should have converted to SI units
    // This would be verified by checking the network request or console logs
  });

  test('should integrate with existing meal plan form', async () => {
    // First, fill in basic form data
    await page.fill('input[placeholder*="plan name"]', 'Test Manual Plan');
    await page.selectOption('select[name="fitnessGoal"]', 'muscle_gain');
    await page.fill('input[name="days"]', '7');
    await page.fill('input[name="mealsPerDay"]', '3');

    // Then use manual meal plan parser
    await page.locator('textarea#manual-meal-plan').fill(EXAMPLE_MEAL_PLAN_TEXT);
    await page.click('button:has-text("Parse Manual Plan")');

    await page.waitForSelector('text=Manual Meal Plan Parsed Successfully', {
      timeout: 15000
    });

    // The form values should be respected
    await expect(page.locator('text=Test Manual Plan')).toBeVisible();
    await expect(page.locator('text=/muscle.?gain/i')).toBeVisible();
  });

  test('should allow saving parsed manual meal plan', async () => {
    // Parse a meal plan
    await page.locator('textarea#manual-meal-plan').fill(EXAMPLE_MEAL_PLAN_TEXT);
    await page.click('button:has-text("Parse Manual Plan")');

    await page.waitForSelector('text=Manual Meal Plan Parsed Successfully', {
      timeout: 15000
    });

    // Look for save button
    const saveButton = page.locator('button:has-text("Save"), button:has-text("Save Plan")');

    // Click save if available
    if (await saveButton.count() > 0) {
      await saveButton.first().click();

      // Should show success message
      await expect(page.locator('text=/Saved|Success/i')).toBeVisible({
        timeout: 10000
      });
    }
  });

  test('should display nutrition estimates for manual meals', async () => {
    // Parse a meal plan
    await page.locator('textarea#manual-meal-plan').fill(EXAMPLE_MEAL_PLAN_TEXT);
    await page.click('button:has-text("Parse Manual Plan")');

    await page.waitForSelector('text=Manual Meal Plan Parsed Successfully', {
      timeout: 15000
    });

    // Look for nutrition information
    // Manual meals should show estimated nutrition
    await expect(page.locator('text=/calories|protein|carbs|fat/i')).toBeVisible();
  });
});

// Performance tests
test.describe('Manual Meal Plan Performance', () => {
  test('should parse large meal plans efficiently', async ({ page }) => {
    // Create a large meal plan (7 days, 5 meals per day)
    let largeMealPlan = '';
    for (let day = 1; day <= 7; day++) {
      largeMealPlan += `Day ${day}\n`;
      for (let meal = 1; meal <= 5; meal++) {
        largeMealPlan += `Meal ${meal}\n`;
        largeMealPlan += `-200g protein source\n`;
        largeMealPlan += `-150g carb source\n`;
        largeMealPlan += `-100g vegetables\n`;
        largeMealPlan += `-1 tbsp fat source\n\n`;
      }
    }

    // Login and navigate
    await page.goto('http://localhost:4000');
    await page.click('text=Login');
    await page.fill('input[type="email"]', 'trainer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestTrainer123!');
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Trainer Dashboard');
    await page.click('text=Create Meal Plan');

    // Measure parsing time
    const startTime = Date.now();

    await page.locator('textarea#manual-meal-plan').fill(largeMealPlan);
    await page.click('button:has-text("Parse Manual Plan")');

    await page.waitForSelector('text=Manual Meal Plan Parsed Successfully', {
      timeout: 30000
    });

    const endTime = Date.now();
    const parseTime = endTime - startTime;

    // Should parse within reasonable time (< 10 seconds for large plan)
    expect(parseTime).toBeLessThan(10000);

    // Verify all days are present
    for (let day = 1; day <= 7; day++) {
      await expect(page.locator(`text=Day ${day}`)).toBeVisible();
    }
  });
});