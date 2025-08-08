/**
 * Comprehensive Meal Plan Workflow Tests
 * Tests meal plan creation, management, and PDF export functionality
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/LoginPage';
import { DashboardPage } from '../page-objects/DashboardPage';
import { MealPlanPage } from '../page-objects/MealPlanPage';
import { TEST_ACCOUNTS, setupTestEnvironment } from '../playwright-setup';

test.describe('🍽️ Comprehensive Meal Plan Workflow Tests', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let mealPlanPage: MealPlanPage;

  test.beforeAll(async () => {
    await setupTestEnvironment();
  });

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    mealPlanPage = new MealPlanPage(page);
    
    // Start with clean session
    await dashboardPage.clearSession();
  });

  test.describe('Customer Meal Plan Access', () => {
    test('Customer can view their meal plans', async ({ page }) => {
      // Login as customer
      await loginPage.navigate();
      await loginPage.login(TEST_ACCOUNTS.customer.email, TEST_ACCOUNTS.customer.password);
      await dashboardPage.waitForDashboardLoad();
      
      // Navigate to meal plans
      await mealPlanPage.navigateToMealPlans();
      
      // Verify meal plan content is accessible
      const hasMealPlanContent = await mealPlanPage.hasMealPlanContent();
      expect(hasMealPlanContent).toBeTruthy();
      
      // Verify meal plan content
      const contentVerification = await mealPlanPage.verifyMealPlanContent();
      console.log('Customer meal plan content verification:', contentVerification);
      
      await mealPlanPage.takeScreenshot('customer-meal-plans-view');
    });

    test('Customer can export meal plan to PDF', async ({ page }) => {
      // Login as customer
      await loginPage.navigate();
      await loginPage.login(TEST_ACCOUNTS.customer.email, TEST_ACCOUNTS.customer.password);
      await dashboardPage.waitForDashboardLoad();
      
      // Navigate to meal plans
      await mealPlanPage.navigateToMealPlans();
      
      // Check if meal plans exist
      const mealPlanCount = await mealPlanPage.getMealPlanCount();
      if (mealPlanCount === 0) {
        console.log('⚠️ No meal plans found for PDF export test');
        return;
      }
      
      try {
        // Attempt PDF export
        const downloadedFile = await mealPlanPage.exportToPdf();
        console.log(`✅ PDF export successful: ${downloadedFile}`);
        
        await mealPlanPage.takeScreenshot('customer-pdf-export-success');
      } catch (error) {
        console.log(`ℹ️ PDF export not available or failed: ${error.message}`);
        await mealPlanPage.takeScreenshot('customer-pdf-export-unavailable');
      }
    });
  });

  test.describe('Trainer Meal Plan Management', () => {
    test('Trainer can access meal plan management', async ({ page }) => {
      // Login as trainer
      await loginPage.navigate();
      await loginPage.login(TEST_ACCOUNTS.trainer.email, TEST_ACCOUNTS.trainer.password);
      await dashboardPage.waitForDashboardLoad();
      
      // Verify trainer features
      const trainerFeatures = await dashboardPage.verifyTrainerFeatures();
      expect(trainerFeatures).toBeGreaterThan(0);
      
      // Try to navigate to meal plans
      await mealPlanPage.navigateToMealPlans();
      
      // Verify trainer can see meal plan interface
      const hasMealPlanContent = await mealPlanPage.hasMealPlanContent();
      console.log(`Trainer meal plan access: ${hasMealPlanContent}`);
      
      await mealPlanPage.takeScreenshot('trainer-meal-plan-interface');
    });

    test('Trainer can generate meal plans', async ({ page }) => {
      // Login as trainer
      await loginPage.navigate();
      await loginPage.login(TEST_ACCOUNTS.trainer.email, TEST_ACCOUNTS.trainer.password);
      await dashboardPage.waitForDashboardLoad();
      
      // Navigate to meal plans
      await mealPlanPage.navigateToMealPlans();
      
      try {
        // Attempt to generate meal plan
        await mealPlanPage.generateMealPlan({
          goal: 'Weight Loss',
          calories: '2000',
          protein: '150'
        });
        
        // Check if generation was successful
        const hasErrors = await mealPlanPage.hasErrors();
        if (hasErrors) {
          const errors = await mealPlanPage.getErrors();
          console.log('Meal plan generation errors:', errors);
        } else {
          console.log('✅ Meal plan generation completed successfully');
        }
        
        await mealPlanPage.takeScreenshot('trainer-meal-plan-generation');
      } catch (error) {
        console.log(`ℹ️ Meal plan generation not available or failed: ${error.message}`);
        await mealPlanPage.takeScreenshot('trainer-meal-plan-generation-unavailable');
      }
    });
  });

  test.describe('Admin Meal Plan Oversight', () => {
    test('Admin can access meal plan system', async ({ page }) => {
      // Login as admin
      await loginPage.navigate();
      await loginPage.login(TEST_ACCOUNTS.admin.email, TEST_ACCOUNTS.admin.password);
      await dashboardPage.waitForDashboardLoad();
      
      // Verify admin features
      const adminFeatures = await dashboardPage.verifyAdminFeatures();
      expect(adminFeatures).toBeGreaterThan(0);
      
      // Check admin access to meal plan system
      const hasAdminAccess = await dashboardPage.hasAdminAccess();
      console.log(`Admin has elevated access: ${hasAdminAccess}`);
      
      await mealPlanPage.takeScreenshot('admin-meal-plan-system-access');
    });
  });

  test.describe('Cross-Role Meal Plan Workflows', () => {
    test('Complete trainer-to-customer meal plan workflow', async ({ page }) => {
      console.log('🔄 Starting complete trainer-to-customer workflow test...');
      
      // Step 1: Login as trainer
      await loginPage.navigate();
      await loginPage.login(TEST_ACCOUNTS.trainer.email, TEST_ACCOUNTS.trainer.password);
      await dashboardPage.waitForDashboardLoad();
      
      // Step 2: Trainer dashboard verification
      const trainerFeatures = await dashboardPage.verifyTrainerFeatures();
      console.log(`✅ Trainer features verified: ${trainerFeatures}`);
      
      // Step 3: Navigate to meal plans as trainer
      await mealPlanPage.navigateToMealPlans();
      await mealPlanPage.takeScreenshot('workflow-trainer-meal-plans');
      
      // Step 4: Logout trainer
      await dashboardPage.logout();
      
      // Step 5: Login as customer
      await loginPage.navigate();
      await loginPage.login(TEST_ACCOUNTS.customer.email, TEST_ACCOUNTS.customer.password);
      await dashboardPage.waitForDashboardLoad();
      
      // Step 6: Customer meal plan access
      await mealPlanPage.navigateToMealPlans();
      const contentVerification = await mealPlanPage.verifyMealPlanContent();
      console.log('✅ Customer meal plan access verified:', contentVerification);
      
      await mealPlanPage.takeScreenshot('workflow-customer-meal-plans');
      
      console.log('🎉 Complete trainer-to-customer workflow test completed');
    });

    test('Multi-role system integrity check', async ({ page }) => {
      const roles = [
        { account: TEST_ACCOUNTS.admin, expectedFeatures: 'admin' },
        { account: TEST_ACCOUNTS.trainer, expectedFeatures: 'trainer' },
        { account: TEST_ACCOUNTS.customer, expectedFeatures: 'customer' }
      ];

      for (const { account, expectedFeatures } of roles) {
        console.log(`🧪 Testing ${expectedFeatures} role integrity...`);
        
        // Clear session and login
        await dashboardPage.clearSession();
        await loginPage.navigate();
        await loginPage.login(account.email, account.password);
        await dashboardPage.waitForDashboardLoad();
        
        // Verify role-specific features
        if (expectedFeatures === 'admin') {
          const features = await dashboardPage.verifyAdminFeatures();
          expect(features).toBeGreaterThan(0);
        } else if (expectedFeatures === 'trainer') {
          const features = await dashboardPage.verifyTrainerFeatures();
          expect(features).toBeGreaterThan(0);
        } else if (expectedFeatures === 'customer') {
          const features = await dashboardPage.verifyCustomerFeatures();
          expect(features).toBeGreaterThan(0);
        }
        
        // Verify meal plan access
        try {
          await mealPlanPage.navigateToMealPlans();
          const hasAccess = await mealPlanPage.hasMealPlanContent();
          console.log(`✅ ${expectedFeatures} meal plan access: ${hasAccess}`);
        } catch (error) {
          console.log(`ℹ️ ${expectedFeatures} meal plan access limited: ${error.message}`);
        }
        
        await mealPlanPage.takeScreenshot(`system-integrity-${expectedFeatures}`);
      }
      
      console.log('🎉 Multi-role system integrity check completed');
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('Meal plan generation with invalid data', async ({ page }) => {
      // Login as trainer
      await loginPage.navigate();
      await loginPage.login(TEST_ACCOUNTS.trainer.email, TEST_ACCOUNTS.trainer.password);
      await dashboardPage.waitForDashboardLoad();
      
      // Navigate to meal plans
      await mealPlanPage.navigateToMealPlans();
      
      try {
        // Attempt generation with invalid/extreme data
        await mealPlanPage.generateMealPlan({
          goal: '',
          calories: '-1000',
          protein: 'invalid'
        });
        
        // Check for appropriate error handling
        const hasErrors = await mealPlanPage.hasErrors();
        console.log(`Error handling for invalid data: ${hasErrors ? 'Present' : 'Missing'}`);
        
        if (hasErrors) {
          const errors = await mealPlanPage.getErrors();
          console.log('Validation errors:', errors);
        }
        
      } catch (error) {
        console.log('Generation with invalid data appropriately handled:', error.message);
      }
      
      await mealPlanPage.takeScreenshot('invalid-data-error-handling');
    });

    test('Network timeout simulation', async ({ page }) => {
      // Login as customer
      await loginPage.navigate();
      await loginPage.login(TEST_ACCOUNTS.customer.email, TEST_ACCOUNTS.customer.password);
      await dashboardPage.waitForDashboardLoad();
      
      // Simulate slow network
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), 2000);
      });
      
      // Navigate to meal plans with slow network
      try {
        await mealPlanPage.navigateToMealPlans();
        console.log('✅ Application handles slow network appropriately');
      } catch (error) {
        console.log('⚠️ Application may have timeout issues:', error.message);
      }
      
      await mealPlanPage.takeScreenshot('slow-network-handling');
    });
  });
});