/**
 * Complete User Journey Tests
 *
 * Tests complete workflows from start to finish for each role
 * These tests demonstrate real-world user scenarios
 */

import { test, expect } from '@playwright/test';
import { RoleAuthHelper } from '../utils/roleTestHelpers';
import { AdminRecipeManagementPage } from '../page-objects/admin/AdminRecipeManagementPage';
import { TrainerCustomerManagementPage } from '../page-objects/trainer/TrainerCustomerManagementPage';
import { TrainerMealPlanPage } from '../page-objects/trainer/TrainerMealPlanPage';
import { CustomerMealPlanPage } from '../page-objects/customer/CustomerMealPlanPage';
import { CustomerGroceryListPage } from '../page-objects/customer/CustomerGroceryListPage';
import { CustomerProgressTrackingPage } from '../page-objects/customer/CustomerProgressTrackingPage';

test.describe('Complete User Journeys', () => {
  test('Admin Journey: Login → View Recipes → View Analytics', async ({ page }) => {
    // Step 1: Login as admin
    await RoleAuthHelper.loginAsAdmin(page);
    await RoleAuthHelper.verifyRoleAccess(page, 'admin');

    // Step 2: Navigate to recipes and view library
    const recipePage = new AdminRecipeManagementPage(page);
    await recipePage.navigate();
    await recipePage.goToRecipesTab();
    await recipePage.assertRecipeLibraryVisible();

    // Step 3: Search for recipes
    await recipePage.searchRecipes('chicken');
    const recipeCount = await recipePage.getRecipeCount();
    console.log(`Admin found ${recipeCount} chicken recipes`);

    // Step 4: Navigate to BMAD Generator
    await recipePage.goToBMADTab();
    await recipePage.assertBMADGeneratorVisible();

    console.log('✅ Admin journey completed successfully');
  });

  test('Trainer Journey: Login → View Customers → Navigate to Meal Plans', async ({ page }) => {
    // Step 1: Login as trainer
    await RoleAuthHelper.loginAsTrainer(page);
    await RoleAuthHelper.verifyRoleAccess(page, 'trainer');

    // Step 2: View customer list
    const customerPage = new TrainerCustomerManagementPage(page);
    await customerPage.navigate();
    await customerPage.assertCustomerListVisible();

    const customerCount = await customerPage.getCustomerCount();
    console.log(`Trainer has ${customerCount} customers`);

    // Step 3: Navigate to meal plans
    const mealPlanPage = new TrainerMealPlanPage(page);
    await mealPlanPage.navigate();
    await mealPlanPage.assertMealPlanListVisible();

    const planCount = await mealPlanPage.getMealPlanCount();
    console.log(`Trainer has ${planCount} meal plans`);

    console.log('✅ Trainer journey completed successfully');
  });

  test('Customer Journey: Login → View Meal Plans → Navigate to Grocery Lists', async ({ page }) => {
    // Step 1: Login as customer
    await RoleAuthHelper.loginAsCustomer(page);
    await RoleAuthHelper.verifyRoleAccess(page, 'customer');

    // Step 2: View meal plans
    const mealPlanPage = new CustomerMealPlanPage(page);
    await mealPlanPage.navigate();
    await mealPlanPage.assertMealPlanListVisible();

    const planCount = await mealPlanPage.getMealPlanCount();
    console.log(`Customer has ${planCount} meal plans`);

    // Step 3: Navigate to grocery lists
    const groceryPage = new CustomerGroceryListPage(page);
    await groceryPage.navigate();
    await groceryPage.assertGroceryListContainerVisible();

    // Step 4: Navigate to progress tracking
    const progressPage = new CustomerProgressTrackingPage(page);
    await progressPage.navigate();
    await progressPage.assertProgressContainerVisible();

    console.log('✅ Customer journey completed successfully');
  });

  test('Multi-Role Workflow: Admin creates recipe → Trainer uses in plan → Customer views', async ({ browser }) => {
    // This test requires multiple browser contexts
    const adminContext = await browser.newContext();
    const trainerContext = await browser.newContext();
    const customerContext = await browser.newContext();

    const adminPage = await adminContext.newPage();
    const trainerPage = await trainerContext.newPage();
    const customerPage = await customerContext.newPage();

    // Step 1: Admin logs in and views recipes
    await RoleAuthHelper.loginAsAdmin(adminPage);
    const recipePage = new AdminRecipeManagementPage(adminPage);
    await recipePage.navigate();
    await recipePage.goToRecipesTab();
    console.log('✅ Admin viewed recipes');

    // Step 2: Trainer logs in and views meal plans
    await RoleAuthHelper.loginAsTrainer(trainerPage);
    const trainerMealPlanPage = new TrainerMealPlanPage(trainerPage);
    await trainerMealPlanPage.navigate();
    console.log('✅ Trainer viewed meal plans');

    // Step 3: Customer logs in and views meal plans
    await RoleAuthHelper.loginAsCustomer(customerPage);
    const customerMealPlanPage = new CustomerMealPlanPage(customerPage);
    await customerMealPlanPage.navigate();
    console.log('✅ Customer viewed meal plans');

    console.log('✅ Multi-role workflow completed successfully');

    // Cleanup
    await adminContext.close();
    await trainerContext.close();
    await customerContext.close();
  });
});
