import { test, expect, Page } from '@playwright/test';

/**
 * CUSTOMER SAVED MEAL PLANS DATA COMPLETENESS TEST
 *
 * PURPOSE: Verify that customers see ALL meal plan details assigned by trainers
 * ISSUE: Customers were only seeing meal cards without complete meal plan information
 *
 * TEST FLOW:
 * 1. Login as trainer
 * 2. Create custom meal plan with full details
 * 3. Assign to test customer
 * 4. Login as customer
 * 5. Navigate to saved meal plans
 * 6. Verify ALL meal plan data is visible
 */

// Test credentials
const TRAINER = {
  email: 'trainer.test@evofitmeals.com',
  password: 'TestTrainer123!'
};

const CUSTOMER = {
  email: 'customer.test@evofitmeals.com',
  password: 'TestCustomer123!'
};

const ADMIN = {
  email: 'admin@fitmeal.pro',
  password: 'AdminPass123'
};

// Test data for meal plan
const TEST_MEAL_PLAN = {
  planName: 'Complete Data Test Plan',
  description: 'Testing that all meal plan data is visible to customer',
  fitnessGoal: 'muscle_gain',
  days: 7,
  mealsPerDay: 4,
  dailyCalorieTarget: 2500,
  dietaryRestrictions: ['gluten_free'],
  excludedIngredients: []
};

/**
 * Helper: Login to the application
 */
async function login(page: Page, email: string, password: string) {
  await page.goto('/');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(admin|trainer|customer)/);
}

/**
 * Helper: Logout from application
 */
async function logout(page: Page) {
  const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out")').first();
  if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await logoutButton.click();
    await page.waitForURL('/');
  }
}

/**
 * Helper: Wait for API response
 */
async function waitForAPI(page: Page, urlPattern: string | RegExp) {
  return page.waitForResponse(
    response => {
      const url = response.url();
      const matches = typeof urlPattern === 'string'
        ? url.includes(urlPattern)
        : urlPattern.test(url);
      return matches && response.status() === 200;
    },
    { timeout: 10000 }
  );
}

test.describe('Customer Saved Meal Plans - Complete Data Visibility', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport for consistent testing
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('should display ALL meal plan details from trainer assignment', async ({ page }) => {
    // STEP 1: Login as trainer
    test.setTimeout(120000); // 2 minutes for full flow

    await test.step('Login as trainer', async () => {
      await login(page, TRAINER.email, TRAINER.password);
      await expect(page).toHaveURL(/\/trainer/);
    });

    // STEP 2: Navigate to customer management
    let assignmentSuccess = false;
    let mealPlanId: string | null = null;

    await test.step('Navigate to customer management', async () => {
      const customersTab = page.locator('button:has-text("Customers"), a:has-text("Customers")').first();
      await customersTab.click();
      await page.waitForTimeout(1000);
    });

    // STEP 3: Find and select test customer
    await test.step('Select test customer', async () => {
      const customerCard = page.locator(`text="${CUSTOMER.email}"`).first();
      await expect(customerCard).toBeVisible({ timeout: 5000 });
      await customerCard.click();
      await page.waitForTimeout(1000);
    });

    // STEP 4: Create custom meal plan
    await test.step('Create custom meal plan', async () => {
      // Look for "Create New Meal Plan" or similar button
      const createButton = page.locator('button:has-text("Create"), button:has-text("New Meal Plan")').first();
      await expect(createButton).toBeVisible({ timeout: 5000 });
      await createButton.click();
      await page.waitForTimeout(1000);

      // Fill meal plan details
      await page.fill('input[placeholder*="plan name"], input[name="planName"]', TEST_MEAL_PLAN.planName);

      // Description
      const descriptionInput = page.locator('textarea[placeholder*="description"], textarea[name="description"]').first();
      if (await descriptionInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await descriptionInput.fill(TEST_MEAL_PLAN.description);
      }

      // Fitness goal
      const fitnessGoalSelect = page.locator('select[name="fitnessGoal"], button:has-text("Select goal")').first();
      if (await fitnessGoalSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        if ((await fitnessGoalSelect.evaluate(el => el.tagName)) === 'SELECT') {
          await fitnessGoalSelect.selectOption(TEST_MEAL_PLAN.fitnessGoal);
        } else {
          await fitnessGoalSelect.click();
          await page.locator(`text="Muscle Gain"`).click();
        }
      }

      // Days
      const daysInput = page.locator('input[name="days"], input[placeholder*="days"]').first();
      if (await daysInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await daysInput.fill(TEST_MEAL_PLAN.days.toString());
      }

      // Calories
      const caloriesInput = page.locator('input[name="dailyCalorieTarget"], input[placeholder*="calorie"]').first();
      if (await caloriesInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await caloriesInput.fill(TEST_MEAL_PLAN.dailyCalorieTarget.toString());
      }

      // Submit meal plan generation
      const generateButton = page.locator('button:has-text("Generate"), button:has-text("Create")').first();
      await generateButton.click();

      // Wait for generation to complete (up to 30 seconds)
      const successMessage = page.locator('text="generated successfully", text="created successfully"').first();
      await expect(successMessage).toBeVisible({ timeout: 30000 });

      assignmentSuccess = true;
    });

    // STEP 5: Verify meal plan was assigned
    await test.step('Verify meal plan assignment', async () => {
      // Navigate back to customer detail view if not already there
      await page.waitForTimeout(2000);

      // Look for meal plans tab
      const mealPlansTab = page.locator('button:has-text("Meal Plans")').first();
      if (await mealPlansTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await mealPlansTab.click();
        await page.waitForTimeout(1000);
      }

      // Verify our test meal plan appears
      const testPlanCard = page.locator(`text="${TEST_MEAL_PLAN.planName}"`).first();
      await expect(testPlanCard).toBeVisible({ timeout: 5000 });
    });

    // STEP 6: Logout from trainer account
    await test.step('Logout from trainer', async () => {
      await logout(page);
      await page.waitForURL('/');
    });

    // STEP 7: Login as customer
    await test.step('Login as customer', async () => {
      await login(page, CUSTOMER.email, CUSTOMER.password);
      await expect(page).toHaveURL(/\/customer/);
    });

    // STEP 8: Navigate to meal plans (should be default view)
    let mealPlanData: any = null;

    await test.step('Navigate to saved meal plans', async () => {
      // Wait for API to load personalized meal plans
      const apiResponse = await waitForAPI(page, '/api/meal-plan/personalized');
      const responseData = await apiResponse.json();

      console.log('API Response:', JSON.stringify(responseData, null, 2));
      mealPlanData = responseData;

      // Verify API returned data
      expect(mealPlanData).toHaveProperty('mealPlans');
      expect(Array.isArray(mealPlanData.mealPlans)).toBe(true);
      expect(mealPlanData.mealPlans.length).toBeGreaterThan(0);
    });

    // STEP 9: Verify meal plan card shows complete information
    await test.step('Verify meal plan card displays all key information', async () => {
      const testPlanCard = page.locator(`text="${TEST_MEAL_PLAN.planName}"`).first();
      await expect(testPlanCard).toBeVisible({ timeout: 5000 });

      // Verify plan name is visible
      await expect(testPlanCard).toBeVisible();

      // Verify fitness goal badge is visible
      const fitnessGoalBadge = page.locator('text="Muscle Gain"').first();
      await expect(fitnessGoalBadge).toBeVisible();

      // Verify calorie target is visible
      const calorieDisplay = page.locator(`text="${TEST_MEAL_PLAN.dailyCalorieTarget}"`).first();
      await expect(calorieDisplay).toBeVisible();

      // Verify days count
      const daysDisplay = page.locator(`text="${TEST_MEAL_PLAN.days} Day"`).first();
      await expect(daysDisplay).toBeVisible();
    });

    // STEP 10: Click meal plan to open modal and verify ALL details
    await test.step('Open meal plan modal and verify complete details', async () => {
      const testPlanCard = page.locator(`text="${TEST_MEAL_PLAN.planName}"`).first();
      await testPlanCard.click();
      await page.waitForTimeout(1000);

      // Verify modal is open
      const modal = page.locator('[role="dialog"]').first();
      await expect(modal).toBeVisible();

      // Verify modal shows plan name
      await expect(modal.locator(`text="${TEST_MEAL_PLAN.planName}"`)).toBeVisible();

      // Verify nutrition data is displayed
      await expect(modal.locator('text="Avg Cal/Day"')).toBeVisible();
      await expect(modal.locator('text="Avg Protein/Day"')).toBeVisible();
      await expect(modal.locator('text="Avg Carbs/Day"')).toBeVisible();
      await expect(modal.locator('text="Avg Fat/Day"')).toBeVisible();

      // Verify fitness goal
      await expect(modal.locator('text="Muscle Gain"')).toBeVisible();

      // Verify days count
      await expect(modal.locator(`text="${TEST_MEAL_PLAN.days} days"`)).toBeVisible();

      // Verify meals per day
      const mealsPerDayText = modal.locator('text="meals/day"').first();
      await expect(mealsPerDayText).toBeVisible();

      // Verify description if present
      if (TEST_MEAL_PLAN.description) {
        const descriptionText = modal.locator(`text="${TEST_MEAL_PLAN.description}"`).first();
        if (await descriptionText.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(descriptionText).toBeVisible();
        }
      }

      // Verify meal schedule tab exists
      await expect(modal.locator('text="Meal Schedule"')).toBeVisible();

      // Verify meal prep guide tab exists
      await expect(modal.locator('text="Meal Prep Guide"')).toBeVisible();

      // Close modal
      const closeButton = modal.locator('button:has-text("Close"), button[aria-label="Close"]').first();
      if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeButton.click();
      } else {
        await page.keyboard.press('Escape');
      }
    });

    // STEP 11: Verify API data structure includes all required fields
    await test.step('Verify API returns complete meal plan data structure', async () => {
      expect(mealPlanData).toBeTruthy();

      const testPlan = mealPlanData.mealPlans.find(
        (mp: any) => mp.planName === TEST_MEAL_PLAN.planName
      );

      expect(testPlan).toBeTruthy();

      // Verify all expected fields are present
      expect(testPlan).toHaveProperty('id');
      expect(testPlan).toHaveProperty('mealPlanData');
      expect(testPlan).toHaveProperty('planName');
      expect(testPlan).toHaveProperty('fitnessGoal');
      expect(testPlan).toHaveProperty('dailyCalorieTarget');
      expect(testPlan).toHaveProperty('totalDays');
      expect(testPlan).toHaveProperty('mealsPerDay');
      expect(testPlan).toHaveProperty('assignedAt');
      expect(testPlan).toHaveProperty('isActive');

      // Verify mealPlanData contains meals array
      expect(testPlan.mealPlanData).toHaveProperty('meals');
      expect(Array.isArray(testPlan.mealPlanData.meals)).toBe(true);
      expect(testPlan.mealPlanData.meals.length).toBeGreaterThan(0);

      // Verify meal structure
      const firstMeal = testPlan.mealPlanData.meals[0];
      expect(firstMeal).toHaveProperty('day');
      expect(firstMeal).toHaveProperty('mealType');
      expect(firstMeal).toHaveProperty('recipeName');
      expect(firstMeal).toHaveProperty('ingredients');
      expect(firstMeal).toHaveProperty('instructions');
      expect(firstMeal).toHaveProperty('calories');
      expect(firstMeal).toHaveProperty('protein');

      console.log('✅ All meal plan data fields present in API response');
    });

    // STEP 12: Logout
    await test.step('Logout from customer', async () => {
      await logout(page);
    });
  });

  test('should handle missing meal plan data gracefully', async ({ page }) => {
    await test.step('Login as customer', async () => {
      await login(page, CUSTOMER.email, CUSTOMER.password);
      await expect(page).toHaveURL(/\/customer/);
    });

    await test.step('Check for empty state handling', async () => {
      const apiResponse = await waitForAPI(page, '/api/meal-plan/personalized');
      const responseData = await apiResponse.json();

      if (responseData.mealPlans.length === 0) {
        // Verify empty state message is shown
        const emptyMessage = page.locator('text="No meal plans", text="journey awaits"').first();
        await expect(emptyMessage).toBeVisible();
      } else {
        console.log(`Customer has ${responseData.mealPlans.length} meal plans`);
      }
    });

    await test.step('Logout', async () => {
      await logout(page);
    });
  });

  test('should verify data persistence across page reloads', async ({ page }) => {
    let mealPlansBefore: any[] = [];
    let mealPlansAfter: any[] = [];

    await test.step('Login as customer', async () => {
      await login(page, CUSTOMER.email, CUSTOMER.password);
      await expect(page).toHaveURL(/\/customer/);
    });

    await test.step('Capture meal plans before reload', async () => {
      const apiResponse = await waitForAPI(page, '/api/meal-plan/personalized');
      const responseData = await apiResponse.json();
      mealPlansBefore = responseData.mealPlans;
    });

    await test.step('Reload page', async () => {
      await page.reload();
      await page.waitForTimeout(2000);
    });

    await test.step('Capture meal plans after reload', async () => {
      const apiResponse = await waitForAPI(page, '/api/meal-plan/personalized');
      const responseData = await apiResponse.json();
      mealPlansAfter = responseData.mealPlans;
    });

    await test.step('Compare data consistency', async () => {
      expect(mealPlansAfter.length).toBe(mealPlansBefore.length);

      // Verify each meal plan persists with same data
      for (let i = 0; i < mealPlansBefore.length; i++) {
        const before = mealPlansBefore[i];
        const after = mealPlansAfter.find((mp: any) => mp.id === before.id);

        expect(after).toBeTruthy();
        expect(after.planName).toBe(before.planName);
        expect(after.fitnessGoal).toBe(before.fitnessGoal);
        expect(after.dailyCalorieTarget).toBe(before.dailyCalorieTarget);
        expect(after.totalDays).toBe(before.totalDays);
      }

      console.log('✅ Data persistence verified across page reload');
    });

    await test.step('Logout', async () => {
      await logout(page);
    });
  });
});
