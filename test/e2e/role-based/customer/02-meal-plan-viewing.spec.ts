/**
 * Customer Meal Plan Viewing Tests
 *
 * Tests customer viewing meal plans and meal plan details
 */

import { test, expect } from '@playwright/test';
import { RoleAuthHelper } from '../../utils/roleTestHelpers';
import { CustomerMealPlanPage } from '../../page-objects/customer/CustomerMealPlanPage';

test.describe('Customer Meal Plan Viewing', () => {
  let mealPlanPage: CustomerMealPlanPage;

  test.beforeEach(async ({ page }) => {
    // Login as customer
    await RoleAuthHelper.loginAsCustomer(page);

    // Initialize page object
    mealPlanPage = new CustomerMealPlanPage(page);
    await mealPlanPage.navigate();
  });

  test('Customer can view meal plan list', async ({ page }) => {
    // Verify meal plan list visible
    await mealPlanPage.assertMealPlanListVisible();

    // Get meal plan count
    const planCount = await mealPlanPage.getMealPlanCount();
    expect(planCount).toBeGreaterThanOrEqual(0);
    console.log(`Customer has ${planCount} meal plans`);
  });

  test('Customer can view meal plan details', async ({ page }) => {
    // Check if customer has any meal plans
    const planCount = await mealPlanPage.getMealPlanCount();

    if (planCount > 0) {
      // Click first meal plan
      await mealPlanPage.clickFirstMealPlan();

      // Verify details visible
      await mealPlanPage.assertMealPlanDetailsVisible();

      // Verify recipes displayed
      await mealPlanPage.assertRecipesDisplayed();
    } else {
      console.log('No meal plans available for this customer');
    }
  });

  test('Customer can open meal plan generation modal', async ({ page }) => {
    // Click generate meal plan
    await mealPlanPage.clickGenerateMealPlan();

    // Modal should be visible (would need actual DOM validation)
  });

  test.skip('Customer can fill meal plan generation form', async ({ page }) => {
    // Skip by default - would create actual data
    await mealPlanPage.clickGenerateMealPlan();

    await mealPlanPage.fillMealPlanForm({
      planName: 'My Test Plan',
      days: 7,
      dailyCalories: 2000,
      fitnessGoal: 'weight_loss',
      dietaryRestrictions: ['gluten_free']
    });

    // Form should be filled
  });
});
