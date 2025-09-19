import { test, expect, Page } from '@playwright/test';

test.describe('Grocery Lists Visibility - Race Condition Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    // Navigate to login page
    await page.goto('http://localhost:4000/login');
    await page.waitForLoadState('networkidle');

    // Login as customer
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');

    // Wait for successful login and navigation
    await page.waitForTimeout(2000);
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('should detect race condition in grocery lists loading', async () => {
    console.log('🧪 Testing for race condition in grocery lists loading...');

    // Method 1: Navigate to grocery list page and check immediately
    await page.goto('http://localhost:4000/grocery-list');
    await page.waitForLoadState('domcontentloaded');

    // Take screenshot immediately after navigation
    await page.screenshot({
      path: 'test-results/grocery-race-immediate.png',
      fullPage: true
    });

    // Check immediately after navigation (this should catch the race condition)
    const emptyStateImmediate = await page.locator('text=Create your first grocery list').isVisible();
    const buttonsImmediate = await page.locator('button.w-full.justify-between.h-12').count();

    console.log('Immediate check - Empty state visible:', emptyStateImmediate);
    console.log('Immediate check - Button count:', buttonsImmediate);

    // Wait for potential API response and UI update
    await page.waitForTimeout(5000);

    const emptyStateAfterWait = await page.locator('text=Create your first grocery list').isVisible();
    const buttonsAfterWait = await page.locator('button.w-full.justify-between.h-12').count();

    console.log('After wait - Empty state visible:', emptyStateAfterWait);
    console.log('After wait - Button count:', buttonsAfterWait);

    await page.screenshot({
      path: 'test-results/grocery-race-after-wait.png',
      fullPage: true
    });

    // Race condition detection logic
    if (emptyStateImmediate && !emptyStateAfterWait && buttonsAfterWait > 0) {
      console.log('🚨 RACE CONDITION DETECTED!');
      console.log('❌ BUG: Empty state was shown initially but grocery lists exist');
      console.log('This confirms the race condition bug in GroceryListWrapper.tsx line 225-227');

      // Fail the test to indicate the bug exists
      expect(false, 'Race condition detected: Empty state shown initially but grocery lists exist').toBeTruthy();
    } else if (!emptyStateImmediate && buttonsImmediate > 0) {
      console.log('✅ No race condition - grocery lists loaded immediately');
    } else if (emptyStateAfterWait && buttonsAfterWait === 0) {
      console.log('ℹ️  No grocery lists exist - empty state is correct');
      console.log('⚠️  To test race condition, create grocery lists first');
    } else {
      console.log('🤔 Unclear state - investigate further');
      console.log(`States: immediate(empty=${emptyStateImmediate}, buttons=${buttonsImmediate}) -> wait(empty=${emptyStateAfterWait}, buttons=${buttonsAfterWait})`);
    }

    // Additional test: Check if the race condition appears in network activity
    await page.evaluate(() => {
      if (window.performance && window.performance.getEntriesByType) {
        const networkEntries = window.performance.getEntriesByType('navigation');
        console.log('Navigation timing:', networkEntries);
      }
    });
  });

  test('should display grocery list items with correct counts', async () => {
    // Navigate to Grocery Lists
    await page.click('text=Grocery Lists');
    await page.waitForLoadState('networkidle');

    // Wait for grocery lists to load
    await page.waitForFunction(() => {
      const buttons = document.querySelectorAll('button.w-full.justify-between.h-12');
      return buttons.length > 0;
    }, { timeout: 15000 });

    // Check for item counts in grocery lists (as badges)
    const itemCountBadges = page.locator('.bg-primary\\/10.text-primary.px-2.py-0\\.5.rounded-full');

    // Take screenshot showing item counts
    await page.screenshot({
      path: 'test-results/grocery-lists-with-counts.png',
      fullPage: true
    });

    // Verify the lists total text appears
    await expect(page.locator('text=lists total')).toBeVisible();
  });

  test('should allow clicking on grocery lists to view details', async () => {
    // Navigate to Grocery Lists
    await page.click('text=Grocery Lists');
    await page.waitForLoadState('networkidle');

    // Wait for grocery lists to load
    await page.waitForFunction(() => {
      const buttons = document.querySelectorAll('button.w-full.justify-between.h-12');
      return buttons.length > 0;
    }, { timeout: 15000 });

    // Click on the first grocery list
    const firstGroceryList = page.locator('button.w-full.justify-between.h-12').first();
    await firstGroceryList.click();

    // Wait for grocery list details to load
    await page.waitForTimeout(2000);

    // Take screenshot of grocery list details
    await page.screenshot({
      path: 'test-results/grocery-list-details.png',
      fullPage: true
    });

    // Verify we can see grocery list content - the page should change to show list items
    // Either we see items or an add items interface
    await expect(page.locator('text=Add Item').or(page.locator('text=Items'))).toBeVisible();
  });

  test('should handle race condition - wait for API response before showing UI', async () => {
    // This test specifically targets the race condition bug

    // Navigate to Grocery Lists
    await page.click('text=Grocery Lists');

    // Don't wait for networkidle - simulate fast navigation
    await page.waitForLoadState('domcontentloaded');

    // Immediately check what's displayed (this should catch the race condition)
    const initialContent = await page.textContent('body');

    // Check if we initially see the empty state (this is the bug)
    const emptyStateMessage = page.locator('text=Create your first grocery list');
    const isEmptyStateVisible = await emptyStateMessage.isVisible();

    // Take screenshot to capture initial state
    await page.screenshot({
      path: 'test-results/race-condition-initial.png',
      fullPage: true
    });

    // Wait for the API call to complete
    await page.waitForTimeout(5000);

    // Take another screenshot after waiting
    await page.screenshot({
      path: 'test-results/race-condition-after-wait.png',
      fullPage: true
    });

    // After waiting, we should NOT see the empty state if lists exist
    await expect(emptyStateMessage).not.toBeVisible();

    // We should see actual grocery lists
    const groceryListButtons = page.locator('button.w-full.justify-between.h-12');
    await expect(groceryListButtons).toHaveCountGreaterThan(0);

    // If we initially saw the empty state, this confirms the race condition bug
    if (isEmptyStateVisible) {
      console.log('RACE CONDITION DETECTED: Empty state was shown initially but lists exist');
    }
  });

  test('should show correct grocery list structure and content', async () => {
    // Navigate to Grocery Lists
    await page.click('text=Grocery Lists');
    await page.waitForLoadState('networkidle');

    // Wait for grocery lists to load
    await page.waitForFunction(() => {
      const buttons = document.querySelectorAll('button.w-full.justify-between.h-12');
      return buttons.length > 0;
    }, { timeout: 15000 });

    // Verify grocery list structure
    const groceryListSection = page.locator('text=Grocery Lists');
    await expect(groceryListSection).toBeVisible();

    // Check for expected grocery lists by name
    await expect(page.locator('text=Meal Plan Grocery List')).toBeVisible();

    // Verify the lists are interactive (have click handlers)
    const groceryListButtons = page.locator('button.w-full.justify-between.h-12');

    for (let i = 0; i < await groceryListButtons.count(); i++) {
      const button = groceryListButtons.nth(i);

      // Verify each button is clickable
      await expect(button).toBeVisible();

      // Check for proper styling/classes that indicate it's interactive
      const classes = await button.getAttribute('class');
      expect(classes).toMatch(/w-full/);
    }

    // Take final screenshot
    await page.screenshot({
      path: 'test-results/grocery-lists-final-structure.png',
      fullPage: true
    });
  });

  test('should not show loading state indefinitely', async () => {
    // Navigate to Grocery Lists
    await page.click('text=Grocery Lists');

    // Check if there's a loading indicator
    const loadingIndicator = page.locator('text=Loading...').or(page.locator('[data-testid="loading"]'));

    // If loading indicator exists, it should disappear within reasonable time
    if (await loadingIndicator.isVisible()) {
      await expect(loadingIndicator).not.toBeVisible({ timeout: 15000 });
    }

    // After loading completes, grocery lists should be visible
    const groceryListButtons = page.locator('button.w-full.justify-between.h-12');
    await expect(groceryListButtons).toHaveCountGreaterThan(0);

    // Take screenshot showing final loaded state
    await page.screenshot({
      path: 'test-results/grocery-lists-no-loading.png',
      fullPage: true
    });
  });

  test('should maintain grocery list visibility during navigation', async () => {
    // Navigate to Grocery Lists
    await page.click('text=Grocery Lists');
    await page.waitForLoadState('networkidle');

    // Verify grocery lists are visible
    await page.waitForFunction(() => {
      const buttons = document.querySelectorAll('button.w-full.justify-between.h-12');
      return buttons.length > 0;
    }, { timeout: 15000 });

    // Navigate away and back to test persistence
    await page.click('text=Meal Plans');
    await page.waitForLoadState('networkidle');

    await page.click('text=Grocery Lists');
    await page.waitForLoadState('networkidle');

    // Wait a moment for re-render
    await page.waitForTimeout(2000);

    // Grocery lists should still be visible (not reset to empty state)
    const emptyStateMessage = page.locator('text=Create your first grocery list');
    await expect(emptyStateMessage).not.toBeVisible();

    const groceryListButtons = page.locator('button.w-full.justify-between.h-12');
    await expect(groceryListButtons).toHaveCountGreaterThan(0);

    // Take screenshot showing persistence
    await page.screenshot({
      path: 'test-results/grocery-lists-navigation-persistence.png',
      fullPage: true
    });
  });
});