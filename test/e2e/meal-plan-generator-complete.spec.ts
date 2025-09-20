import { test, expect, type Page } from '@playwright/test';

// Test credentials
const adminCredentials = {
  email: 'admin@fitmeal.pro',
  password: 'AdminPass123'
};

// Test data for meal plan generation
const testMealPlan = {
  naturalLanguageInput: 'Create a 7-day meal plan for muscle gain with 2500 calories per day and high protein content. Include breakfast, lunch, and dinner.',
  expectedParsedData: {
    planName: '7-day meal plan',
    fitnessGoal: 'muscle gain',
    dailyCalorieTarget: 2500,
    days: 7
  },
  manualFormData: {
    planName: 'Manual Test Plan',
    fitnessGoal: 'Weight Loss',
    dailyCalorieTarget: 1800,
    days: 5,
    mealsPerDay: 3,
    description: 'Manually configured meal plan for testing'
  }
};

// Helper function to login as admin
async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('input[name="email"]', adminCredentials.email);
  await page.fill('input[name="password"]', adminCredentials.password);
  await page.click('button[type="submit"]');

  // Wait for redirect to admin dashboard
  await page.waitForURL('**/admin', { timeout: 10000 });
  await expect(page.locator('text=Admin Dashboard')).toBeVisible();
}

// Helper function to navigate to meal plan generator
async function navigateToMealPlanGenerator(page: Page) {
  // Check if we're on admin page or need to navigate
  const currentUrl = page.url();

  if (currentUrl.includes('/admin')) {
    // Look for the meal plan generator section or link
    const mealPlanLink = page.locator('text=Meal Plan Generator').first();
    if (await mealPlanLink.isVisible()) {
      await mealPlanLink.click();
      await page.waitForTimeout(1000); // Wait for component to load
    }
  } else {
    // Navigate to meal plan generator directly
    await page.goto('/meal-plan-generator');
    await page.waitForLoadState('networkidle');
  }

  // Verify we're in the meal plan generator - look for either text variant or the Meal Plan Generator title
  const aiGeneratorTitle = page.locator('text=/AI.*Natural Language Generator|AI Meal Plan Generator|Meal Plan Generator/i').first();
  await expect(aiGeneratorTitle).toBeVisible({ timeout: 10000 });
}

test.describe('Meal Plan Generator - Complete Functionality Test', () => {
  test.beforeEach(async ({ page }) => {
    // Set timeout for each test
    test.setTimeout(120000); // 2 minutes per test

    // Login as admin before each test
    await loginAsAdmin(page);
  });

  test('1. AI Natural Language Parser - Parse with AI button', async ({ page }) => {
    console.log('Starting test: AI Natural Language Parser');

    await navigateToMealPlanGenerator(page);

    // Find the natural language input textarea
    const nlTextarea = page.locator('textarea[placeholder*="Describe your meal plan requirements"]');
    await expect(nlTextarea).toBeVisible();

    // Enter natural language description
    await nlTextarea.fill(testMealPlan.naturalLanguageInput);

    // Click "Parse with AI" button
    const parseButton = page.locator('button:has-text("Parse with AI")');
    await expect(parseButton).toBeEnabled();
    await parseButton.click();

    // Wait for parsing to complete (loading state should appear then disappear)
    await expect(page.locator('text=Parsing with AI')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Parsing with AI')).toBeHidden({ timeout: 30000 });

    // Verify the advanced form is shown after parsing
    await expect(page.locator('text=Manual Configuration')).toBeVisible();

    // Verify parsed values are populated in the form
    const planNameInput = page.locator('input[name="planName"]');
    await expect(planNameInput).toHaveValue(/.*meal plan.*/i);

    const fitnessGoalSelect = page.locator('select[name="fitnessGoal"], input[name="fitnessGoal"]').first();
    const fitnessGoalValue = await fitnessGoalSelect.inputValue();
    expect(fitnessGoalValue.toLowerCase()).toContain('muscle');

    const caloriesInput = page.locator('input[name="dailyCalorieTarget"]');
    await expect(caloriesInput).toHaveValue('2500');

    const daysInput = page.locator('input[name="days"]');
    await expect(daysInput).toHaveValue('7');

    console.log('✅ AI Natural Language Parser test passed');
  });

  test('2. Direct Generation - Generate Plan Directly button', async ({ page }) => {
    console.log('Starting test: Direct Generation');

    await navigateToMealPlanGenerator(page);

    // Enter natural language description
    const nlTextarea = page.locator('textarea[placeholder*="Describe your meal plan requirements"]');
    await nlTextarea.fill(testMealPlan.naturalLanguageInput);

    // Click "Generate Plan Directly" button (skips parsing step)
    const generateButton = page.locator('button:has-text("Generate")').filter({ hasText: /Generate.*Directly|Generate Plan/ });
    await expect(generateButton).toBeEnabled();
    await generateButton.click();

    // Wait for generation to complete
    await expect(page.locator('text=Generating')).toBeVisible({ timeout: 5000 });

    // Wait for meal plan to be generated (this can take up to 60 seconds)
    await expect(page.locator('text=Meal Plan Generated!, text=Your personalized meal plan is ready')).toBeVisible({ timeout: 60000 });

    // Verify meal plan is displayed
    const mealPlanContainer = page.locator('[class*="meal-plan"], [class*="generated-plan"]').first();
    await expect(mealPlanContainer).toBeVisible({ timeout: 10000 });

    // Verify it contains day headers
    await expect(page.locator('text=/Day [1-7]/i').first()).toBeVisible();

    console.log('✅ Direct Generation test passed');
  });

  test('3. Manual Configuration - Fill form manually', async ({ page }) => {
    console.log('Starting test: Manual Configuration');

    await navigateToMealPlanGenerator(page);

    // Click "Manual Configuration" button to show the advanced form
    const manualConfigButton = page.locator('button:has-text("Manual Configuration")');
    await manualConfigButton.click();

    // Wait for form to be visible
    await expect(page.locator('input[name="planName"]')).toBeVisible();

    // Fill in the manual form
    await page.fill('input[name="planName"]', testMealPlan.manualFormData.planName);

    // Select fitness goal
    const fitnessGoalField = page.locator('select[name="fitnessGoal"], input[name="fitnessGoal"]').first();
    if (await fitnessGoalField.evaluate(el => el.tagName === 'SELECT')) {
      await fitnessGoalField.selectOption({ label: testMealPlan.manualFormData.fitnessGoal });
    } else {
      await fitnessGoalField.fill(testMealPlan.manualFormData.fitnessGoal);
    }

    await page.fill('input[name="dailyCalorieTarget"]', testMealPlan.manualFormData.dailyCalorieTarget.toString());
    await page.fill('input[name="days"]', testMealPlan.manualFormData.days.toString());
    await page.fill('input[name="mealsPerDay"]', testMealPlan.manualFormData.mealsPerDay.toString());

    // Fill description if field exists
    const descriptionField = page.locator('textarea[name="description"], input[name="description"]').first();
    if (await descriptionField.isVisible()) {
      await descriptionField.fill(testMealPlan.manualFormData.description);
    }

    // Submit the form
    const generateFromFormButton = page.locator('button[type="submit"]:has-text("Generate"), button:has-text("Generate Meal Plan")').last();
    await generateFromFormButton.click();

    // Wait for generation to complete
    await expect(page.locator('text=Generating')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Meal Plan Generated!, text=Your personalized meal plan is ready')).toBeVisible({ timeout: 60000 });

    // Verify meal plan is displayed
    const mealPlanContainer = page.locator('[class*="meal-plan"], [class*="generated-plan"]').first();
    await expect(mealPlanContainer).toBeVisible({ timeout: 10000 });

    console.log('✅ Manual Configuration test passed');
  });

  test('4. Complete workflow - Parse, Modify, Generate', async ({ page }) => {
    console.log('Starting test: Complete workflow');

    await navigateToMealPlanGenerator(page);

    // Step 1: Enter natural language input
    const nlTextarea = page.locator('textarea[placeholder*="Describe your meal plan requirements"]');
    await nlTextarea.fill('Create a 5-day vegetarian meal plan with 2000 calories for weight maintenance');

    // Step 2: Parse with AI
    const parseButton = page.locator('button:has-text("Parse with AI")');
    await parseButton.click();

    // Wait for parsing
    await expect(page.locator('text=Parsing with AI')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Parsing with AI')).toBeHidden({ timeout: 30000 });

    // Step 3: Modify parsed values
    await page.fill('input[name="planName"]', 'Modified Vegetarian Plan');
    await page.fill('input[name="dailyCalorieTarget"]', '2200'); // Increase calories

    // Step 4: Generate with modified values
    const generateButton = page.locator('button[type="submit"]:has-text("Generate"), button:has-text("Generate Meal Plan")').last();
    await generateButton.click();

    // Wait for generation
    await expect(page.locator('text=Generating')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Meal Plan Generated!, text=Your personalized meal plan is ready')).toBeVisible({ timeout: 60000 });

    // Verify meal plan is displayed
    await expect(page.locator('text=/Day [1-5]/i').first()).toBeVisible();

    console.log('✅ Complete workflow test passed');
  });

  test('5. Error handling - Invalid input', async ({ page }) => {
    console.log('Starting test: Error handling');

    await navigateToMealPlanGenerator(page);

    // Try to parse with empty input
    const parseButton = page.locator('button:has-text("Parse with AI")');
    await parseButton.click();

    // Should show error message
    await expect(page.locator('text=/Please enter.*description/i')).toBeVisible({ timeout: 5000 });

    // Try to generate directly with empty input
    const nlTextarea = page.locator('textarea[placeholder*="Describe your meal plan requirements"]');
    await nlTextarea.clear();

    const generateButton = page.locator('button:has-text("Generate")').filter({ hasText: /Generate.*Directly|Generate Plan/ });

    // Button should be disabled or show error when clicked
    const isDisabled = await generateButton.isDisabled();
    if (!isDisabled) {
      await generateButton.click();
      await expect(page.locator('text=/Please enter.*description/i')).toBeVisible({ timeout: 5000 });
    }

    console.log('✅ Error handling test passed');
  });
});

test.describe('Meal Plan Generator - Role Access Tests', () => {
  test('Admin can access all meal plan features', async ({ page }) => {
    console.log('Testing admin access to meal plan generator');

    await loginAsAdmin(page);
    await navigateToMealPlanGenerator(page);

    // Verify all features are accessible
    await expect(page.locator('text=AI-Powered Natural Language Generator')).toBeVisible();
    await expect(page.locator('button:has-text("Parse with AI")')).toBeVisible();
    await expect(page.locator('button:has-text("Manual Configuration")')).toBeVisible();

    console.log('✅ Admin access test passed');
  });
});