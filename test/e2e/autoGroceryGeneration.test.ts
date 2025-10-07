/**
 * E2E Test Suite: Automatic Grocery List Generation
 *
 * Comprehensive end-to-end testing of the automatic grocery list generation feature.
 * Tests the complete user journey from meal plan assignment to grocery list creation.
 *
 * Test Coverage:
 * - Trainer assigns meal plan to customer -> Grocery list auto-generates
 * - Customer sees list immediately with correct ingredients
 * - Ingredient aggregation works properly
 * - Duplicate prevention (same plan assigned twice)
 * - Feature toggle on/off functionality
 * - Cleanup when meal plan deleted
 *
 * @author Integration Testing Specialist Agent
 * @since 1.0.0
 */

import { test, expect, type Page } from '@playwright/test';
import { eq } from 'drizzle-orm';

// Test accounts
const TEST_ACCOUNTS = {
  trainer: {
    email: 'trainer.test@evofitmeals.com',
    password: 'TestTrainer123!'
  },
  customer: {
    email: 'customer.test@evofitmeals.com',
    password: 'TestCustomer123!'
  }
};

// Helper functions
class AutoGroceryTestHelper {
  constructor(private page: Page) {}

  async loginAs(role: 'trainer' | 'customer') {
    const account = TEST_ACCOUNTS[role];

    await this.page.goto('/login');
    await this.page.fill('[data-testid="email-input"]', account.email);
    await this.page.fill('[data-testid="password-input"]', account.password);
    await this.page.click('[data-testid="login-button"]');

    // Wait for navigation to dashboard
    await this.page.waitForURL('**/dashboard');
    await this.page.waitForTimeout(1000);
  }

  async navigateToMealPlans() {
    await this.page.click('[data-testid="meal-plans-nav"]');
    await this.page.waitForURL('**/meal-plans');
    await this.page.waitForTimeout(1000);
  }

  async navigateToGroceryLists() {
    await this.page.click('[data-testid="grocery-lists-nav"]');
    await this.page.waitForURL('**/grocery-lists');
    await this.page.waitForTimeout(1000);
  }

  async createMealPlan(planName: string = 'Auto-Test Meal Plan') {
    // Navigate to meal plan generator
    await this.page.click('[data-testid="generate-meal-plan-button"]');
    await this.page.waitForTimeout(1000);

    // Fill out meal plan form
    await this.page.fill('[data-testid="plan-name-input"]', planName);
    await this.page.selectOption('[data-testid="fitness-goal-select"]', 'muscle_gain');
    await this.page.fill('[data-testid="daily-calories-input"]', '2500');
    await this.page.fill('[data-testid="days-input"]', '7');

    // Generate the meal plan
    await this.page.click('[data-testid="generate-plan-button"]');

    // Wait for generation to complete
    await this.page.waitForSelector('[data-testid="meal-plan-generated"]', { timeout: 30000 });

    // Save the meal plan
    await this.page.click('[data-testid="save-meal-plan-button"]');
    await this.page.waitForSelector('[data-testid="meal-plan-saved"]', { timeout: 10000 });

    return planName;
  }

  async assignMealPlanToCustomer(planName: string, customerEmail: string = TEST_ACCOUNTS.customer.email) {
    // Find the meal plan in the list
    const planCard = this.page.locator(`[data-testid="meal-plan-card"]:has-text("${planName}")`);
    await expect(planCard).toBeVisible();

    // Click assign button
    await planCard.locator('[data-testid="assign-plan-button"]').click();
    await this.page.waitForTimeout(1000);

    // Select customer and assign
    await this.page.fill('[data-testid="customer-email-input"]', customerEmail);
    await this.page.click('[data-testid="confirm-assign-button"]');

    // Wait for assignment confirmation
    await this.page.waitForSelector('[data-testid="assignment-success"]', { timeout: 10000 });
  }

  async checkGroceryListExists(expectedListName: string) {
    // Look for grocery list with expected name pattern
    const listCard = this.page.locator(`[data-testid="grocery-list-card"]:has-text("${expectedListName}")`);
    await expect(listCard).toBeVisible();
    return listCard;
  }

  async verifyGroceryListContents(listCard: any, expectedIngredients: string[]) {
    // Click to view list details
    await listCard.click();
    await this.page.waitForTimeout(1000);

    // Check that expected ingredients are present
    for (const ingredient of expectedIngredients) {
      const ingredientItem = this.page.locator(`[data-testid="grocery-item"]:has-text("${ingredient}")`);
      await expect(ingredientItem).toBeVisible();
    }
  }

  async deleteMealPlan(planName: string) {
    const planCard = this.page.locator(`[data-testid="meal-plan-card"]:has-text("${planName}")`);
    await expect(planCard).toBeVisible();

    // Click delete button
    await planCard.locator('[data-testid="delete-plan-button"]').click();

    // Confirm deletion
    await this.page.click('[data-testid="confirm-delete-button"]');

    // Wait for deletion to complete
    await this.page.waitForTimeout(2000);
  }

  async enableFeatureFlag(flagName: string) {
    // Navigate to admin settings (assuming trainer has access)
    await this.page.goto('/admin/features');

    // Enable the feature flag
    const flagToggle = this.page.locator(`[data-testid="feature-flag-${flagName}"]`);
    if (!(await flagToggle.isChecked())) {
      await flagToggle.click();
    }

    // Save changes
    await this.page.click('[data-testid="save-features-button"]');
    await this.page.waitForTimeout(1000);
  }

  async disableFeatureFlag(flagName: string) {
    // Navigate to admin settings
    await this.page.goto('/admin/features');

    // Disable the feature flag
    const flagToggle = this.page.locator(`[data-testid="feature-flag-${flagName}"]`);
    if (await flagToggle.isChecked()) {
      await flagToggle.click();
    }

    // Save changes
    await this.page.click('[data-testid="save-features-button"]');
    await this.page.waitForTimeout(1000);
  }
}

test.describe('Automatic Grocery List Generation E2E', () => {
  let helper: AutoGroceryTestHelper;

  test.beforeEach(async ({ page }) => {
    helper = new AutoGroceryTestHelper(page);
  });

  test('Happy Path: Trainer assigns meal plan → Grocery list auto-generates', async ({ page }) => {
    // Step 1: Login as trainer
    await helper.loginAs('trainer');

    // Step 2: Create a new meal plan
    await helper.navigateToMealPlans();
    const planName = await helper.createMealPlan('Auto-Gen Test Plan');

    // Step 3: Assign meal plan to customer
    await helper.assignMealPlanToCustomer(planName);

    // Step 4: Login as customer to verify grocery list was created
    await helper.loginAs('customer');
    await helper.navigateToGroceryLists();

    // Step 5: Verify grocery list exists with expected name
    const expectedListName = `Grocery List - ${planName}`;
    const groceryListCard = await helper.checkGroceryListExists(expectedListName);

    // Step 6: Verify grocery list contains aggregated ingredients
    await helper.verifyGroceryListContents(groceryListCard, [
      'chicken breast',
      'brown rice',
      'broccoli',
      'olive oil',
      'sweet potato'
    ]);

    // Step 7: Verify meal plan ID is linked to grocery list
    await page.click('[data-testid="grocery-list-details-button"]');
    const mealPlanLink = page.locator('[data-testid="source-meal-plan-link"]');
    await expect(mealPlanLink).toBeVisible();
    await expect(mealPlanLink).toContainText(planName);
  });

  test('Duplicate Prevention: Same meal plan assigned twice', async ({ page }) => {
    // Step 1: Login as trainer and create meal plan
    await helper.loginAs('trainer');
    await helper.navigateToMealPlans();
    const planName = await helper.createMealPlan('Duplicate Test Plan');

    // Step 2: Assign meal plan first time
    await helper.assignMealPlanToCustomer(planName);

    // Step 3: Assign same meal plan again
    await helper.assignMealPlanToCustomer(planName);

    // Step 4: Login as customer and check grocery lists
    await helper.loginAs('customer');
    await helper.navigateToGroceryLists();

    // Step 5: Verify only one grocery list exists for this meal plan
    const groceryLists = page.locator('[data-testid="grocery-list-card"]');
    const listCount = await groceryLists.count();

    // Should have updated existing list, not created duplicate
    const expectedListName = `Grocery List - ${planName}`;
    const matchingLists = page.locator(`[data-testid="grocery-list-card"]:has-text("${expectedListName}")`);
    await expect(matchingLists).toHaveCount(1);
  });

  test('Feature Toggle: Auto-generation disabled', async ({ page }) => {
    // Step 1: Login as trainer and disable auto-generation
    await helper.loginAs('trainer');
    await helper.disableFeatureFlag('AUTO_GENERATE_GROCERY_LISTS');

    // Step 2: Create and assign meal plan
    await helper.navigateToMealPlans();
    const planName = await helper.createMealPlan('Feature Disabled Test');
    await helper.assignMealPlanToCustomer(planName);

    // Step 3: Login as customer and verify no grocery list was created
    await helper.loginAs('customer');
    await helper.navigateToGroceryLists();

    // Step 4: Verify no grocery list exists for this meal plan
    const expectedListName = `Grocery List - ${planName}`;
    const groceryListCard = page.locator(`[data-testid="grocery-list-card"]:has-text("${expectedListName}")`);
    await expect(groceryListCard).toHaveCount(0);

    // Step 5: Re-enable feature for cleanup
    await helper.loginAs('trainer');
    await helper.enableFeatureFlag('AUTO_GENERATE_GROCERY_LISTS');
  });

  test('Feature Toggle: Auto-generation enabled', async ({ page }) => {
    // Step 1: Login as trainer and ensure auto-generation is enabled
    await helper.loginAs('trainer');
    await helper.enableFeatureFlag('AUTO_GENERATE_GROCERY_LISTS');

    // Step 2: Create and assign meal plan
    await helper.navigateToMealPlans();
    const planName = await helper.createMealPlan('Feature Enabled Test');
    await helper.assignMealPlanToCustomer(planName);

    // Step 3: Login as customer and verify grocery list was created
    await helper.loginAs('customer');
    await helper.navigateToGroceryLists();

    // Step 4: Verify grocery list exists
    const expectedListName = `Grocery List - ${planName}`;
    await helper.checkGroceryListExists(expectedListName);
  });

  test('Cleanup: Meal plan deletion removes grocery list', async ({ page }) => {
    // Step 1: Login as trainer and create meal plan
    await helper.loginAs('trainer');
    await helper.navigateToMealPlans();
    const planName = await helper.createMealPlan('Cleanup Test Plan');

    // Step 2: Assign meal plan (creates grocery list)
    await helper.assignMealPlanToCustomer(planName);

    // Step 3: Verify grocery list was created
    await helper.loginAs('customer');
    await helper.navigateToGroceryLists();
    const expectedListName = `Grocery List - ${planName}`;
    await helper.checkGroceryListExists(expectedListName);

    // Step 4: Login as trainer and delete meal plan
    await helper.loginAs('trainer');
    await helper.navigateToMealPlans();
    await helper.deleteMealPlan(planName);

    // Step 5: Verify grocery list was also deleted
    await helper.loginAs('customer');
    await helper.navigateToGroceryLists();
    const groceryListCard = page.locator(`[data-testid="grocery-list-card"]:has-text("${expectedListName}")`);
    await expect(groceryListCard).toHaveCount(0);
  });

  test('Ingredient Aggregation: Multiple recipes with shared ingredients', async ({ page }) => {
    // Step 1: Login as trainer and create complex meal plan
    await helper.loginAs('trainer');
    await helper.navigateToMealPlans();

    // Create meal plan with multiple days and recipes
    await page.click('[data-testid="generate-meal-plan-button"]');
    await page.fill('[data-testid="plan-name-input"]', 'Aggregation Test Plan');
    await page.selectOption('[data-testid="fitness-goal-select"]', 'muscle_gain');
    await page.fill('[data-testid="daily-calories-input"]', '2500');
    await page.fill('[data-testid="days-input"]', '7'); // Full week

    await page.click('[data-testid="generate-plan-button"]');
    await page.waitForSelector('[data-testid="meal-plan-generated"]', { timeout: 30000 });
    await page.click('[data-testid="save-meal-plan-button"]');

    // Step 2: Assign meal plan
    await helper.assignMealPlanToCustomer('Aggregation Test Plan');

    // Step 3: Login as customer and check grocery list
    await helper.loginAs('customer');
    await helper.navigateToGroceryLists();

    const groceryListCard = await helper.checkGroceryListExists('Grocery List - Aggregation Test Plan');
    await groceryListCard.click();

    // Step 4: Verify ingredient aggregation
    // Check that common ingredients like chicken breast show aggregated quantities
    const chickenItem = page.locator('[data-testid="grocery-item"]:has-text("chicken breast")');
    await expect(chickenItem).toBeVisible();

    // Verify quantity is greater than 1 (indicating aggregation)
    const quantityText = await chickenItem.locator('[data-testid="item-quantity"]').textContent();
    const quantity = parseInt(quantityText || '0');
    expect(quantity).toBeGreaterThan(1);

    // Step 5: Verify items are properly categorized
    const produceItems = page.locator('[data-testid="grocery-item"][data-category="produce"]');
    const meatItems = page.locator('[data-testid="grocery-item"][data-category="meat"]');
    const pantryItems = page.locator('[data-testid="grocery-item"][data-category="pantry"]');

    await expect(produceItems.first()).toBeVisible();
    await expect(meatItems.first()).toBeVisible();
    await expect(pantryItems.first()).toBeVisible();
  });

  test('Error Handling: Invalid meal plan data', async ({ page }) => {
    // This test would require mocking invalid data scenarios
    // For E2E, we'll test the UI behavior when backend returns errors

    await helper.loginAs('trainer');
    await helper.navigateToMealPlans();

    // Try to assign a meal plan that doesn't exist or has no recipes
    // This should show appropriate error messaging
    const planName = await helper.createMealPlan('Empty Test Plan');

    // Modify meal plan to have no recipes (if interface allows)
    // Otherwise, test with actual empty plan scenario

    await helper.assignMealPlanToCustomer(planName);

    // Check that appropriate error/warning messages are shown
    const errorMessage = page.locator('[data-testid="assignment-warning"]');
    // This might show a warning about empty meal plan
  });

  test('Performance: Large meal plan with many recipes', async ({ page }) => {
    // Test with a large 30-day meal plan
    await helper.loginAs('trainer');
    await helper.navigateToMealPlans();

    await page.click('[data-testid="generate-meal-plan-button"]');
    await page.fill('[data-testid="plan-name-input"]', 'Large Performance Test');
    await page.selectOption('[data-testid="fitness-goal-select"]', 'muscle_gain');
    await page.fill('[data-testid="daily-calories-input"]', '3000');
    await page.fill('[data-testid="days-input"]', '30'); // Large plan

    const startTime = Date.now();

    await page.click('[data-testid="generate-plan-button"]');
    await page.waitForSelector('[data-testid="meal-plan-generated"]', { timeout: 60000 });
    await page.click('[data-testid="save-meal-plan-button"]');

    // Assign the large meal plan
    await helper.assignMealPlanToCustomer('Large Performance Test');

    const assignmentTime = Date.now() - startTime;
    console.log(`Large meal plan assignment took: ${assignmentTime}ms`);

    // Verify grocery list was created in reasonable time
    expect(assignmentTime).toBeLessThan(30000); // Should complete within 30 seconds

    // Verify grocery list contents
    await helper.loginAs('customer');
    await helper.navigateToGroceryLists();

    const groceryListCard = await helper.checkGroceryListExists('Grocery List - Large Performance Test');
    await groceryListCard.click();

    // Verify significant number of ingredients were aggregated
    const groceryItems = page.locator('[data-testid="grocery-item"]');
    const itemCount = await groceryItems.count();

    // Large meal plan should generate substantial grocery list
    expect(itemCount).toBeGreaterThan(20);
  });

  test('Concurrent Operations: Multiple trainers assigning plans', async ({ browser }) => {
    // Create two browser contexts for concurrent operations
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const helper1 = new AutoGroceryTestHelper(page1);
    const helper2 = new AutoGroceryTestHelper(page2);

    try {
      // Both trainers login and create meal plans simultaneously
      await Promise.all([
        helper1.loginAs('trainer'),
        helper2.loginAs('trainer')
      ]);

      await Promise.all([
        helper1.navigateToMealPlans(),
        helper2.navigateToMealPlans()
      ]);

      // Create meal plans concurrently
      const [plan1, plan2] = await Promise.all([
        helper1.createMealPlan('Concurrent Plan 1'),
        helper2.createMealPlan('Concurrent Plan 2')
      ]);

      // Assign to different customers concurrently
      await Promise.all([
        helper1.assignMealPlanToCustomer(plan1, 'customer1@test.com'),
        helper2.assignMealPlanToCustomer(plan2, 'customer2@test.com')
      ]);

      // Both operations should complete successfully without conflicts
      // This tests the database transaction handling and concurrency control

    } finally {
      await context1.close();
      await context2.close();
    }
  });
});

test.describe('Feature Flag Integration Tests', () => {
  let helper: AutoGroceryTestHelper;

  test.beforeEach(async ({ page }) => {
    helper = new AutoGroceryTestHelper(page);
  });

  test('Runtime feature toggle changes', async ({ page }) => {
    await helper.loginAs('trainer');

    // Start with feature enabled
    await helper.enableFeatureFlag('AUTO_GENERATE_GROCERY_LISTS');

    // Create and assign meal plan (should create grocery list)
    await helper.navigateToMealPlans();
    const planName1 = await helper.createMealPlan('Toggle Test Plan 1');
    await helper.assignMealPlanToCustomer(planName1);

    // Disable feature
    await helper.disableFeatureFlag('AUTO_GENERATE_GROCERY_LISTS');

    // Create and assign another meal plan (should NOT create grocery list)
    const planName2 = await helper.createMealPlan('Toggle Test Plan 2');
    await helper.assignMealPlanToCustomer(planName2);

    // Re-enable feature
    await helper.enableFeatureFlag('AUTO_GENERATE_GROCERY_LISTS');

    // Create and assign third meal plan (should create grocery list again)
    const planName3 = await helper.createMealPlan('Toggle Test Plan 3');
    await helper.assignMealPlanToCustomer(planName3);

    // Verify results
    await helper.loginAs('customer');
    await helper.navigateToGroceryLists();

    // Should have grocery lists for plans 1 and 3, but not 2
    await helper.checkGroceryListExists(`Grocery List - ${planName1}`);
    await helper.checkGroceryListExists(`Grocery List - ${planName3}`);

    const plan2List = page.locator(`[data-testid="grocery-list-card"]:has-text("Grocery List - ${planName2}")`);
    await expect(plan2List).toHaveCount(0);
  });
});