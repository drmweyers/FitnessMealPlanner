import { test, expect } from '@playwright/test';

test.describe('Grocery Lists Race Condition Test', () => {
  test('should detect race condition in grocery lists loading', async ({ page }) => {
    // Login as customer
    await page.goto('http://localhost:4000/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');

    // Wait for navigation to customer dashboard
    await page.waitForTimeout(2000);

    // Method 1: Access via grocery list tab in customer page
    console.log('Testing Method 1: Grocery List Tab');

    // Look for grocery list tab
    const groceryTab = page.locator('[value="grocery-list"]');
    const hasGroceryTab = await groceryTab.count();

    if (hasGroceryTab > 0) {
      await groceryTab.click();
      await page.waitForTimeout(1000);

      // Take screenshot immediately after clicking
      await page.screenshot({
        path: 'test-results/grocery-tab-immediate.png',
        fullPage: true
      });

      // Check for race condition immediately
      const emptyStateImmediate = await page.locator('text=Create your first grocery list').isVisible();
      const buttonsImmediate = await page.locator('button.w-full.justify-between.h-12').count();

      console.log('Immediate check - Empty state visible:', emptyStateImmediate);
      console.log('Immediate check - Grocery buttons count:', buttonsImmediate);

      // Wait for API to potentially complete
      await page.waitForTimeout(3000);

      // Check again after waiting
      const emptyStateAfter = await page.locator('text=Create your first grocery list').isVisible();
      const buttonsAfter = await page.locator('button.w-full.justify-between.h-12').count();

      console.log('After wait - Empty state visible:', emptyStateAfter);
      console.log('After wait - Grocery buttons count:', buttonsAfter);

      await page.screenshot({
        path: 'test-results/grocery-tab-after-wait.png',
        fullPage: true
      });

      // Detect race condition
      if (emptyStateImmediate && !emptyStateAfter && buttonsAfter > 0) {
        console.log('🚨 RACE CONDITION DETECTED via Grocery Tab!');
        console.log('Empty state shown initially but grocery lists exist');
      } else if (!emptyStateImmediate && buttonsImmediate > 0) {
        console.log('✅ No race condition - grocery lists loaded correctly');
      } else if (emptyStateAfter && buttonsAfter === 0) {
        console.log('ℹ️  No grocery lists exist - empty state is correct');
      }
    }

    // Method 2: Access via direct URL
    console.log('\nTesting Method 2: Direct Grocery List URL');

    await page.goto('http://localhost:4000/grocery-list');

    // Don't wait for networkidle - simulate fast navigation
    await page.waitForLoadState('domcontentloaded');

    // Take screenshot immediately
    await page.screenshot({
      path: 'test-results/grocery-direct-immediate.png',
      fullPage: true
    });

    // Check for race condition immediately
    const emptyStateDirectImmediate = await page.locator('text=Create your first grocery list').isVisible();
    const buttonsDirectImmediate = await page.locator('button.w-full.justify-between.h-12').count();

    console.log('Direct URL - Immediate empty state visible:', emptyStateDirectImmediate);
    console.log('Direct URL - Immediate grocery buttons count:', buttonsDirectImmediate);

    // Wait for API to potentially complete
    await page.waitForTimeout(5000);

    // Check again after waiting
    const emptyStateDirectAfter = await page.locator('text=Create your first grocery list').isVisible();
    const buttonsDirectAfter = await page.locator('button.w-full.justify-between.h-12').count();

    console.log('Direct URL - After wait empty state visible:', emptyStateDirectAfter);
    console.log('Direct URL - After wait grocery buttons count:', buttonsDirectAfter);

    await page.screenshot({
      path: 'test-results/grocery-direct-after-wait.png',
      fullPage: true
    });

    // Detect race condition
    if (emptyStateDirectImmediate && !emptyStateDirectAfter && buttonsDirectAfter > 0) {
      console.log('🚨 RACE CONDITION DETECTED via Direct URL!');
      console.log('Empty state shown initially but grocery lists exist');

      // This is the bug we're testing for
      expect(false, 'Race condition detected: Empty state shown initially but grocery lists exist').toBeTruthy();
    } else if (!emptyStateDirectImmediate && buttonsDirectImmediate > 0) {
      console.log('✅ No race condition - grocery lists loaded correctly');
    } else if (emptyStateDirectAfter && buttonsDirectAfter === 0) {
      console.log('ℹ️  No grocery lists exist - empty state is correct');
    }

    // Method 3: Test multiple rapid navigation
    console.log('\nTesting Method 3: Rapid Navigation');

    for (let i = 0; i < 3; i++) {
      await page.goto('http://localhost:4000/customer');
      await page.waitForTimeout(500);
      await page.goto('http://localhost:4000/grocery-list');
      await page.waitForTimeout(500);

      const emptyStateRapid = await page.locator('text=Create your first grocery list').isVisible();
      const buttonsRapid = await page.locator('button.w-full.justify-between.h-12').count();

      console.log(`Rapid test ${i + 1} - Empty state: ${emptyStateRapid}, Buttons: ${buttonsRapid}`);

      await page.screenshot({
        path: `test-results/grocery-rapid-${i + 1}.png`,
        fullPage: true
      });
    }
  });
});