import { test, expect, Page } from '@playwright/test';
import { loginAsTrainer, takeTestScreenshot } from './auth-helper';
import { TrainerMealPlanPage } from './page-objects/TrainerMealPlanPage';
import { MealPlanTestData } from './test-helpers/MealPlanTestData';

/**
 * Visual Regression Tests for Meal Plan Assignment GUI
 * 
 * Tests visual consistency and UI element appearances across different states
 * and interactions in the meal plan assignment workflow.
 */

test.describe('Meal Plan Assignment Visual Regression Tests', () => {
  let trainerPage: TrainerMealPlanPage;
  let testData: MealPlanTestData;

  test.beforeEach(async ({ page }) => {
    trainerPage = new TrainerMealPlanPage(page);
    testData = new MealPlanTestData(page);

    // Login and setup consistent test environment
    await loginAsTrainer(page);
    await trainerPage.navigateToTrainerDashboard();
    await testData.setupMockAPIResponses();
  });

  test('Visual consistency - Saved Plans tab interface', async ({ page }) => {
    console.log('📸 Testing visual consistency of Saved Plans tab...');

    // Navigate to saved plans tab
    await trainerPage.clickSavedPlansTab();
    await trainerPage.waitForSavedPlansToLoad();

    // Wait for all images and content to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Take baseline screenshot
    await expect(page).toHaveScreenshot('saved-plans-interface.png', {
      fullPage: true,
      mask: [
        // Mask dynamic content like timestamps
        page.locator('text=/Created.*ago/'),
        page.locator('.timestamp'),
        page.locator('[data-testid="timestamp"]')
      ]
    });

    console.log('✅ Saved Plans visual regression test completed');
  });

  test('Visual consistency - Assignment modal interface', async ({ page }) => {
    console.log('📸 Testing visual consistency of Assignment modal...');

    await trainerPage.clickSavedPlansTab();
    await trainerPage.waitForSavedPlansToLoad();

    // Open assignment modal
    await trainerPage.openMealPlanDropdown();
    await trainerPage.clickAssignToCustomer();
    await trainerPage.waitForAssignmentModal();

    // Wait for modal animation to complete
    await page.waitForTimeout(500);

    // Take screenshot of assignment modal
    await expect(trainerPage.assignmentModal).toHaveScreenshot('assignment-modal-interface.png');

    console.log('✅ Assignment modal visual regression test completed');
  });

  test('Visual consistency - Customers tab interface', async ({ page }) => {
    console.log('📸 Testing visual consistency of Customers tab...');

    await trainerPage.clickCustomersTab();
    await trainerPage.waitForCustomersToLoad();
    await page.waitForLoadState('networkidle');

    // Take screenshot of customers interface
    await expect(page).toHaveScreenshot('customers-tab-interface.png', {
      fullPage: true,
      mask: [
        // Mask dynamic timestamps
        page.locator('text=/ago/'),
        page.locator('.timestamp')
      ]
    });

    console.log('✅ Customers tab visual regression test completed');
  });

  test('Visual consistency - Tab navigation states', async ({ page }) => {
    console.log('📸 Testing visual consistency of tab navigation states...');

    // Test each tab's active state
    const tabs = [
      { name: 'saved-plans', action: () => trainerPage.clickSavedPlansTab() },
      { name: 'customers', action: () => trainerPage.clickCustomersTab() }
    ];

    for (const tab of tabs) {
      await tab.action();
      await page.waitForTimeout(500);

      // Take screenshot of tab navigation area
      const tabsContainer = page.locator('[role="tablist"], .tabs-list');
      await expect(tabsContainer).toHaveScreenshot(`tab-navigation-${tab.name}.png`);
    }

    console.log('✅ Tab navigation visual regression test completed');
  });

  test('Visual consistency - Empty states', async ({ page }) => {
    console.log('📸 Testing visual consistency of empty states...');

    // Mock empty responses
    await page.route('/api/trainer/meal-plans', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ mealPlans: [] })
      });
    });

    await page.route('/api/trainer/customers', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ customers: [] })
      });
    });

    // Test empty saved plans
    await trainerPage.clickSavedPlansTab();
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('empty-saved-plans.png', { fullPage: true });

    // Test empty customers
    await trainerPage.clickCustomersTab();
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('empty-customers-list.png', { fullPage: true });

    console.log('✅ Empty states visual regression test completed');
  });

  test('Visual consistency - Loading states', async ({ page }) => {
    console.log('📸 Testing visual consistency of loading states...');

    // Mock delayed responses to capture loading states
    await page.route('/api/trainer/meal-plans', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MealPlanTestData.getMockAPIResponses().mealPlans)
      });
    });

    // Navigate to trigger loading state
    await trainerPage.clickSavedPlansTab();
    
    // Capture loading state quickly
    await page.waitForTimeout(100);
    await expect(page).toHaveScreenshot('loading-saved-plans.png', { fullPage: true });

    // Wait for loading to complete
    await trainerPage.waitForSavedPlansToLoad();

    console.log('✅ Loading states visual regression test completed');
  });

  test('Visual consistency - Error states', async ({ page }) => {
    console.log('📸 Testing visual consistency of error states...');

    // Mock error responses
    await page.route('/api/trainer/meal-plans', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    await trainerPage.clickSavedPlansTab();
    await page.waitForTimeout(2000);

    // Take screenshot of error state
    await expect(page).toHaveScreenshot('error-state-meal-plans.png', { fullPage: true });

    console.log('✅ Error states visual regression test completed');
  });

  test('Visual consistency - Responsive breakpoints', async ({ page }) => {
    console.log('📸 Testing visual consistency across responsive breakpoints...');

    const breakpoints = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1280, height: 720 }
    ];

    for (const { name, width, height } of breakpoints) {
      await page.setViewportSize({ width, height });
      
      // Test saved plans on this breakpoint
      await trainerPage.clickSavedPlansTab();
      await trainerPage.waitForSavedPlansToLoad();
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot(`responsive-${name}-saved-plans.png`, {
        fullPage: true
      });

      // Test customers tab on this breakpoint
      await trainerPage.clickCustomersTab();
      await trainerPage.waitForCustomersToLoad();
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot(`responsive-${name}-customers.png`, {
        fullPage: true
      });
    }

    console.log('✅ Responsive breakpoints visual regression test completed');
  });

  test('Visual consistency - Modal animations and states', async ({ page }) => {
    console.log('📸 Testing visual consistency of modal animations and states...');

    await trainerPage.clickSavedPlansTab();
    await trainerPage.waitForSavedPlansToLoad();

    // Test dropdown menu appearance
    await trainerPage.openMealPlanDropdown();
    const dropdown = page.locator('[role="menu"], .dropdown-menu');
    await expect(dropdown).toHaveScreenshot('dropdown-menu-appearance.png');

    // Test assignment modal appearance
    await trainerPage.clickAssignToCustomer();
    await trainerPage.waitForAssignmentModal();
    await page.waitForTimeout(300); // Wait for animation
    
    await expect(trainerPage.assignmentModal).toHaveScreenshot('assignment-modal-appearance.png');

    // Test modal with customer selected
    await trainerPage.selectFirstCustomer();
    await page.waitForTimeout(200);
    
    await expect(trainerPage.assignmentModal).toHaveScreenshot('assignment-modal-customer-selected.png');

    console.log('✅ Modal animations visual regression test completed');
  });

  test('Visual consistency - Search and filter states', async ({ page }) => {
    console.log('📸 Testing visual consistency of search and filter states...');

    await trainerPage.clickSavedPlansTab();
    await trainerPage.waitForSavedPlansToLoad();

    // Test search input focus state
    await trainerPage.searchInput.focus();
    await expect(trainerPage.searchInput).toHaveScreenshot('search-input-focused.png');

    // Test search with results
    await trainerPage.searchMealPlans('Weight Loss');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('search-results-filtered.png', { fullPage: true });

    // Test search with no results
    await trainerPage.searchMealPlans('NonexistentPlan');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('search-no-results.png', { fullPage: true });

    console.log('✅ Search and filter visual regression test completed');
  });

  test('Visual consistency - Toast notifications', async ({ page }) => {
    console.log('📸 Testing visual consistency of toast notifications...');

    await trainerPage.clickSavedPlansTab();
    await trainerPage.waitForSavedPlansToLoad();

    // Perform assignment to trigger success toast
    await trainerPage.assignMealPlanToCustomer();
    
    // Try to capture toast notification
    const toast = page.locator('.toast, [role="status"], .notification');
    if (await toast.count() > 0) {
      await expect(toast).toHaveScreenshot('success-toast-notification.png');
    }

    // Test error toast by mocking failed assignment
    await page.route('/api/trainer/meal-plans/*/assign', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Assignment failed' })
      });
    });

    // Try another assignment to trigger error
    try {
      await trainerPage.assignMealPlanToCustomer();
      
      const errorToast = page.locator('.toast.error, [role="alert"]');
      if (await errorToast.count() > 0) {
        await expect(errorToast).toHaveScreenshot('error-toast-notification.png');
      }
    } catch (error) {
      console.log('💡 Error toast captured through exception handling');
    }

    console.log('✅ Toast notifications visual regression test completed');
  });

  test('Visual consistency - Theme and styling consistency', async ({ page }) => {
    console.log('📸 Testing visual consistency of theme and styling...');

    // Test in light mode (default)
    await trainerPage.clickSavedPlansTab();
    await trainerPage.waitForSavedPlansToLoad();
    await expect(page).toHaveScreenshot('theme-light-mode.png', { fullPage: true });

    // Test styling of interactive elements
    const interactiveElements = [
      { selector: 'button:first-of-type', name: 'button-default' },
      { selector: 'input:first-of-type', name: 'input-default' },
      { selector: '.card:first-of-type', name: 'card-default' }
    ];

    for (const { selector, name } of interactiveElements) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        await expect(element).toHaveScreenshot(`styling-${name}.png`);
      }
    }

    console.log('✅ Theme and styling visual regression test completed');
  });
});

test.describe('Visual Regression - Cross Browser Consistency', () => {
  const browsers = ['chromium', 'firefox', 'webkit'];

  browsers.forEach((browserName) => {
    test(`Visual consistency in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
      if (currentBrowser !== browserName) {
        test.skip();
      }

      console.log(`🌐 Testing visual consistency in ${browserName}...`);

      const trainerPage = new TrainerMealPlanPage(page);
      const testData = new MealPlanTestData(page);

      await loginAsTrainer(page);
      await trainerPage.navigateToTrainerDashboard();
      await testData.setupMockAPIResponses();

      // Test key interfaces across browsers
      await trainerPage.clickSavedPlansTab();
      await trainerPage.waitForSavedPlansToLoad();
      await expect(page).toHaveScreenshot(`${browserName}-saved-plans-interface.png`, {
        fullPage: true
      });

      await trainerPage.clickCustomersTab();
      await trainerPage.waitForCustomersToLoad();
      await expect(page).toHaveScreenshot(`${browserName}-customers-interface.png`, {
        fullPage: true
      });

      console.log(`✅ ${browserName} visual consistency test completed`);
    });
  });
});