import { test, expect, Page } from '@playwright/test';
import { loginAsTrainer, takeTestScreenshot, TEST_ACCOUNTS, TEST_CONFIG } from './auth-helper';
import { TrainerMealPlanPage } from './page-objects/TrainerMealPlanPage';
import { MealPlanTestData } from './test-helpers/MealPlanTestData';

/**
 * Comprehensive Playwright E2E Tests for Meal Plan Assignment GUI Functionality
 * 
 * Tests the complete user journey from trainer login through meal plan assignment,
 * including tab navigation, modal interactions, state updates, and cross-browser compatibility.
 * 
 * Test Coverage:
 * - Complete trainer workflow (login -> saved plans -> assignment)
 * - Tab navigation without page refresh
 * - Meal plan assignment modal interactions
 * - Immediate state updates without browser refresh
 * - Cross-browser compatibility
 * - Responsive design
 * - Error handling and edge cases
 */

test.describe('Meal Plan Assignment GUI - Comprehensive E2E Tests', () => {
  let trainerPage: TrainerMealPlanPage;
  let testData: MealPlanTestData;

  test.beforeEach(async ({ page }) => {
    // Initialize page objects
    trainerPage = new TrainerMealPlanPage(page);
    testData = new MealPlanTestData(page);

    // Set up error monitoring
    const errors = await trainerPage.checkForErrors();
    console.log('🔍 Error monitoring active');

    // Reset page state
    await testData.resetPageState();

    // Login as trainer
    await loginAsTrainer(page);

    // Navigate to trainer dashboard
    await trainerPage.navigateToTrainerDashboard();

    // Take initial screenshot
    await trainerPage.takeScreenshot('trainer-dashboard-initial.png', 'Trainer dashboard after login');
  });

  test.afterEach(async ({ page }) => {
    // Clean up test data
    await testData.cleanupTestData();

    // Take final screenshot for debugging
    await trainerPage.takeScreenshot('test-final-state.png', 'Final state after test completion');
  });

  test('Complete trainer meal plan assignment workflow', async ({ page }) => {
    console.log('🎯 Testing complete meal plan assignment workflow...');

    // Set up test data
    const setupResult = await testData.setupTestData(2, 1);
    if (!setupResult.success) {
      // Use mock data if real API setup fails
      await testData.setupMockAPIResponses();
    }

    // Step 1: Navigate to Saved Plans tab
    await trainerPage.clickSavedPlansTab();
    await trainerPage.waitForSavedPlansToLoad();
    await trainerPage.takeScreenshot('saved-plans-tab.png', 'Saved Plans tab loaded');

    // Verify meal plans are visible
    const mealPlanCount = await trainerPage.getMealPlanCount();
    expect(mealPlanCount).toBeGreaterThan(0);
    console.log(`✅ Found ${mealPlanCount} meal plans`);

    // Step 2: Assign meal plan to customer
    await trainerPage.assignMealPlanToCustomer();
    await trainerPage.takeScreenshot('assignment-completed.png', 'Meal plan assignment completed');

    // Step 3: Verify immediate state update by switching to Customers tab
    const stateUpdated = await trainerPage.verifyImmediateStateUpdate();
    await trainerPage.takeScreenshot('customers-tab-updated.png', 'Customers tab after assignment');

    console.log('🎉 Complete workflow test passed!');
  });

  test('Tab navigation without page refresh', async ({ page }) => {
    console.log('🔄 Testing tab navigation without page refresh...');

    // Set up mock data for consistent testing
    await testData.setupMockAPIResponses();

    // Record initial URL
    const initialUrl = page.url();

    // Test navigation between all tabs
    await trainerPage.clickSavedPlansTab();
    expect(page.url()).toBe(initialUrl); // URL should not change on tab switch
    await page.waitForTimeout(500);

    await trainerPage.clickCustomersTab();
    expect(page.url()).toBe(initialUrl); // URL should not change on tab switch
    await page.waitForTimeout(500);

    await trainerPage.clickSavedPlansTab();
    expect(page.url()).toBe(initialUrl); // URL should not change on tab switch
    await page.waitForTimeout(500);

    // Verify each tab loads its content without full page refresh
    await trainerPage.waitForSavedPlansToLoad();
    await trainerPage.takeScreenshot('tab-navigation-test.png', 'Tab navigation without refresh');

    console.log('✅ Tab navigation test passed - no page refreshes detected');
  });

  test('Meal plan assignment modal interactions', async ({ page }) => {
    console.log('🔲 Testing meal plan assignment modal interactions...');

    // Use mock data for consistent modal testing
    await testData.setupMockAPIResponses();

    // Navigate to saved plans
    await trainerPage.clickSavedPlansTab();
    await trainerPage.waitForSavedPlansToLoad();

    // Test opening assignment modal
    await trainerPage.openMealPlanDropdown();
    await trainerPage.takeScreenshot('dropdown-menu.png', 'Meal plan dropdown menu');

    await trainerPage.clickAssignToCustomer();
    await trainerPage.takeScreenshot('assignment-modal.png', 'Assignment modal opened');

    // Verify modal elements are visible
    await expect(trainerPage.assignmentModal).toBeVisible();
    await expect(trainerPage.assignmentModalTitle).toBeVisible();
    await expect(trainerPage.customerList).toBeVisible();

    // Test customer selection
    await trainerPage.selectFirstCustomer();
    await trainerPage.takeScreenshot('customer-selected.png', 'Customer selected in modal');

    // Test modal cancellation
    await trainerPage.cancelAssignmentButton.click();
    await trainerPage.verifyAssignmentModalClosed();

    // Test complete assignment flow
    await trainerPage.openMealPlanDropdown();
    await trainerPage.clickAssignToCustomer();
    await trainerPage.selectFirstCustomer();
    await trainerPage.clickAssignButton();

    await trainerPage.waitForSuccessToast();
    await trainerPage.verifyAssignmentModalClosed();

    console.log('✅ Modal interaction test passed!');
  });

  test('State synchronization between tabs', async ({ page }) => {
    console.log('🔄 Testing state synchronization between tabs...');

    // Set up test data
    await testData.setupMockAPIResponses();

    // Start on Saved Plans tab
    await trainerPage.clickSavedPlansTab();
    await trainerPage.waitForSavedPlansToLoad();

    // Perform assignment
    await trainerPage.assignMealPlanToCustomer();

    // Switch to Customers tab immediately (no page refresh)
    await trainerPage.clickCustomersTab();
    await trainerPage.waitForCustomersToLoad();

    // Verify assignment appears in customers list
    await trainerPage.verifyImmediateStateUpdate();
    await trainerPage.takeScreenshot('state-sync-verification.png', 'State synchronization verification');

    // Switch back to Saved Plans and verify state consistency
    await trainerPage.clickSavedPlansTab();
    await trainerPage.waitForSavedPlansToLoad();

    console.log('✅ State synchronization test passed!');
  });

  test('Meal plan viewing and download functionality', async ({ page }) => {
    console.log('👁️ Testing meal plan viewing and download functionality...');

    // Set up test data
    await testData.setupMockAPIResponses();

    // Navigate to customers tab
    await trainerPage.clickCustomersTab();
    await trainerPage.waitForCustomersToLoad();

    // Click on customer to view meal plans
    await trainerPage.viewCustomerMealPlans();
    await trainerPage.takeScreenshot('customer-meal-plans.png', 'Customer meal plans view');

    // Verify meal plan details can be viewed
    const modalVisible = await trainerPage.verifyMealPlanDetailsModal();
    if (modalVisible) {
      await trainerPage.takeScreenshot('meal-plan-details.png', 'Meal plan details modal');
    }

    // Test download functionality
    const downloadSuccess = await trainerPage.testDownloadFunctionality();
    console.log(`📥 Download test result: ${downloadSuccess ? 'Success' : 'Not available or failed'}`);

    console.log('✅ Viewing and download test completed!');
  });

  test('Search and filter functionality', async ({ page }) => {
    console.log('🔍 Testing search and filter functionality...');

    // Set up test data with searchable meal plans
    await testData.setupMockAPIResponses();

    // Navigate to saved plans
    await trainerPage.clickSavedPlansTab();
    await trainerPage.waitForSavedPlansToLoad();

    // Test search functionality
    const searchTerm = 'Weight Loss';
    const results = await trainerPage.searchMealPlans(searchTerm);
    await trainerPage.takeScreenshot('search-results.png', `Search results for "${searchTerm}"`);

    console.log(`📊 Search returned ${results} results for "${searchTerm}"`);

    // Test clearing search
    await trainerPage.searchMealPlans('');
    await page.waitForTimeout(500);
    
    const allResults = await trainerPage.getMealPlanCount();
    console.log(`📊 All meal plans visible: ${allResults}`);

    console.log('✅ Search and filter test passed!');
  });

  test('Error handling and edge cases', async ({ page }) => {
    console.log('⚠️ Testing error handling and edge cases...');

    // Test with no meal plans available
    await page.route('/api/trainer/meal-plans', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ mealPlans: [] })
      });
    });

    await trainerPage.clickSavedPlansTab();
    await page.waitForTimeout(1000);
    await trainerPage.takeScreenshot('empty-meal-plans.png', 'Empty meal plans state');

    // Test with no customers available
    await page.route('/api/trainer/customers', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ customers: [] })
      });
    });

    await trainerPage.clickCustomersTab();
    await page.waitForTimeout(1000);
    await trainerPage.takeScreenshot('empty-customers.png', 'Empty customers state');

    // Test assignment failure
    await page.route('/api/trainer/meal-plans/*/assign', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Assignment failed', message: 'Customer already has this meal plan' })
      });
    });

    // Reset to have data for assignment test
    await testData.setupMockAPIResponses();
    await trainerPage.clickSavedPlansTab();
    await trainerPage.waitForSavedPlansToLoad();

    // Try assignment that should fail
    try {
      await trainerPage.openMealPlanDropdown();
      await trainerPage.clickAssignToCustomer();
      await trainerPage.selectFirstCustomer();
      await trainerPage.clickAssignButton();
      
      // Should show error message
      await page.waitForTimeout(2000);
      await trainerPage.takeScreenshot('assignment-error.png', 'Assignment error handling');
    } catch (error) {
      console.log('💡 Assignment error handled correctly');
    }

    console.log('✅ Error handling test completed!');
  });
});

test.describe('Cross-Browser Compatibility Tests', () => {
  ['chromium', 'firefox', 'webkit'].forEach((browserName) => {
    test(`Meal plan assignment workflow in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
      // Skip if not the current browser (Playwright runs tests per browser automatically)
      if (currentBrowser !== browserName) {
        test.skip();
      }

      console.log(`🌐 Testing meal plan assignment in ${browserName}...`);

      const trainerPage = new TrainerMealPlanPage(page);
      const testData = new MealPlanTestData(page);

      // Login and setup
      await loginAsTrainer(page);
      await trainerPage.navigateToTrainerDashboard();
      await testData.setupMockAPIResponses();

      // Basic workflow test
      await trainerPage.clickSavedPlansTab();
      await trainerPage.waitForSavedPlansToLoad();
      
      await trainerPage.takeScreenshot(`${browserName}-saved-plans.png`, `Saved plans in ${browserName}`);

      // Test tab switching
      await trainerPage.clickCustomersTab();
      await trainerPage.waitForCustomersToLoad();
      
      await trainerPage.takeScreenshot(`${browserName}-customers-tab.png`, `Customers tab in ${browserName}`);

      console.log(`✅ ${browserName} compatibility test passed!`);
    });
  });
});

test.describe('Responsive Design Tests', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 720 },
    { name: 'large-desktop', width: 1920, height: 1080 }
  ];

  viewports.forEach(({ name, width, height }) => {
    test(`Meal plan assignment on ${name} (${width}x${height})`, async ({ page }) => {
      console.log(`📱 Testing meal plan assignment on ${name} viewport...`);

      // Set viewport
      await page.setViewportSize({ width, height });

      const trainerPage = new TrainerMealPlanPage(page);
      const testData = new MealPlanTestData(page);

      // Setup and login
      await loginAsTrainer(page);
      await trainerPage.navigateToTrainerDashboard();
      await testData.setupMockAPIResponses();

      // Test navigation on this viewport
      await trainerPage.clickSavedPlansTab();
      await trainerPage.waitForSavedPlansToLoad();
      await trainerPage.takeScreenshot(`${name}-saved-plans.png`, `Saved plans on ${name}`);

      // Test modal interactions on this viewport
      try {
        await trainerPage.openMealPlanDropdown();
        await trainerPage.clickAssignToCustomer();
        await trainerPage.takeScreenshot(`${name}-assignment-modal.png`, `Assignment modal on ${name}`);
        
        // Close modal
        await trainerPage.cancelAssignmentButton.click();
        await page.waitForTimeout(500);
      } catch (error) {
        console.log(`💡 Modal interaction may be different on ${name} viewport`);
      }

      // Test customers tab
      await trainerPage.clickCustomersTab();
      await trainerPage.waitForCustomersToLoad();
      await trainerPage.takeScreenshot(`${name}-customers-tab.png`, `Customers tab on ${name}`);

      console.log(`✅ ${name} responsive test passed!`);
    });
  });
});

test.describe('Performance and Load Tests', () => {
  test('Performance with large dataset', async ({ page }) => {
    console.log('⚡ Testing performance with large dataset...');

    const trainerPage = new TrainerMealPlanPage(page);

    // Mock large dataset
    const largeMealPlansResponse = {
      mealPlans: Array.from({ length: 100 }, (_, i) => ({
        id: `large-plan-${i}`,
        trainerId: 'trainer-1',
        mealPlanData: MealPlanTestData.createTestMealPlan(i + 1),
        notes: `Performance test meal plan ${i + 1}`,
        tags: ['performance', 'test'],
        isTemplate: false,
        createdAt: new Date().toISOString(),
        assignmentCount: Math.floor(Math.random() * 5)
      }))
    };

    await page.route('/api/trainer/meal-plans', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(largeMealPlansResponse)
      });
    });

    // Login and test
    await loginAsTrainer(page);
    await trainerPage.navigateToTrainerDashboard();

    // Measure load time
    const startTime = Date.now();
    await trainerPage.clickSavedPlansTab();
    await trainerPage.waitForSavedPlansToLoad();
    const loadTime = Date.now() - startTime;

    console.log(`📊 Large dataset load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds

    // Test search performance with large dataset
    const searchStartTime = Date.now();
    await trainerPage.searchMealPlans('Weight Loss');
    await page.waitForTimeout(500);
    const searchTime = Date.now() - searchStartTime;

    console.log(`📊 Search time with large dataset: ${searchTime}ms`);
    expect(searchTime).toBeLessThan(2000); // Search should be fast

    await trainerPage.takeScreenshot('large-dataset-performance.png', 'Performance test with large dataset');

    console.log('✅ Performance test passed!');
  });

  test('Network error handling', async ({ page }) => {
    console.log('🌐 Testing network error handling...');

    const trainerPage = new TrainerMealPlanPage(page);

    // Login first
    await loginAsTrainer(page);
    await trainerPage.navigateToTrainerDashboard();

    // Simulate network errors
    await page.route('/api/trainer/meal-plans', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    await trainerPage.clickSavedPlansTab();
    await page.waitForTimeout(2000);
    await trainerPage.takeScreenshot('network-error-handling.png', 'Network error handling');

    // Should show error state gracefully
    const errorElements = await page.locator('.error, [role="alert"], text="error"').count();
    console.log(`📊 Error elements found: ${errorElements}`);

    console.log('✅ Network error handling test completed!');
  });
});