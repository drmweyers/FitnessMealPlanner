import { test, expect } from '@playwright/test';

test.describe('Create Grocery Lists for Testing', () => {
  test('should create grocery lists and then test for race condition', async ({ page }) => {
    // Login as customer
    await page.goto('http://localhost:4000/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);

    // Go to grocery list page
    await page.goto('http://localhost:4000/grocery-list');
    await page.waitForLoadState('networkidle');

    // Take screenshot of initial state
    await page.screenshot({
      path: 'test-results/grocery-initial-state.png',
      fullPage: true
    });

    // Check if we need to create grocery lists
    const emptyState = page.locator('text=Create your first grocery list');
    const isEmptyState = await emptyState.isVisible();

    console.log('Initial empty state visible:', isEmptyState);

    if (isEmptyState) {
      console.log('Creating test grocery lists...');

      // Create first grocery list
      const createButton = page.locator('text=Create List', { exact: false });
      if (await createButton.count() > 0) {
        await createButton.first().click();
        await page.waitForTimeout(1000);

        // Fill in list name
        const nameInput = page.locator('input[placeholder*="Weekly Shopping"], input[placeholder*="Meal Prep"]');
        if (await nameInput.count() > 0) {
          await nameInput.fill('Meal Plan Grocery List 1');

          // Click create/save button
          const saveButton = page.locator('button:has-text("Create")');
          if (await saveButton.count() > 0) {
            await saveButton.click();
            await page.waitForTimeout(2000);
          }
        }
      }

      // Take screenshot after creating first list
      await page.screenshot({
        path: 'test-results/grocery-after-first-list.png',
        fullPage: true
      });

      // Try to create a second list
      const addAnotherButton = page.locator('text=Create List', { exact: false }).or(page.locator('text=New List'));
      if (await addAnotherButton.count() > 0) {
        await addAnotherButton.first().click();
        await page.waitForTimeout(1000);

        const nameInput2 = page.locator('input[placeholder*="Weekly Shopping"], input[placeholder*="Meal Prep"]');
        if (await nameInput2.count() > 0) {
          await nameInput2.fill('Meal Plan Grocery List 2');

          const saveButton2 = page.locator('button:has-text("Create")');
          if (await saveButton2.count() > 0) {
            await saveButton2.click();
            await page.waitForTimeout(2000);
          }
        }
      }

      // Take screenshot after creating both lists
      await page.screenshot({
        path: 'test-results/grocery-after-both-lists.png',
        fullPage: true
      });
    }

    // Now test for race condition with existing grocery lists
    console.log('\nTesting for race condition with existing grocery lists...');

    // Method 1: Rapid refresh
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Check immediately after reload
    const emptyStateAfterReload = await page.locator('text=Create your first grocery list').isVisible();
    const buttonsAfterReload = await page.locator('button.w-full.justify-between.h-12').count();

    console.log('After reload - Immediate empty state:', emptyStateAfterReload);
    console.log('After reload - Immediate buttons:', buttonsAfterReload);

    await page.screenshot({
      path: 'test-results/grocery-after-reload-immediate.png',
      fullPage: true
    });

    // Wait and check again
    await page.waitForTimeout(3000);

    const emptyStateAfterWait = await page.locator('text=Create your first grocery list').isVisible();
    const buttonsAfterWait = await page.locator('button.w-full.justify-between.h-12').count();

    console.log('After reload - After wait empty state:', emptyStateAfterWait);
    console.log('After reload - After wait buttons:', buttonsAfterWait);

    await page.screenshot({
      path: 'test-results/grocery-after-reload-wait.png',
      fullPage: true
    });

    // Check for race condition
    if (emptyStateAfterReload && !emptyStateAfterWait && buttonsAfterWait > 0) {
      console.log('🚨 RACE CONDITION DETECTED!');
      console.log('Empty state was shown immediately after reload but grocery lists exist');

      // This is the bug we're testing for
      expect(false, 'Race condition detected: Empty state shown initially but grocery lists exist').toBeTruthy();
    } else if (!emptyStateAfterReload && buttonsAfterReload > 0) {
      console.log('✅ No race condition detected - grocery lists loaded immediately');
    } else if (emptyStateAfterWait && buttonsAfterWait === 0) {
      console.log('ℹ️  No grocery lists exist - empty state is correct');
    }

    // Method 2: Fast navigation
    console.log('\nTesting fast navigation...');

    for (let i = 0; i < 3; i++) {
      await page.goto('http://localhost:4000/customer');
      await page.waitForTimeout(200);
      await page.goto('http://localhost:4000/grocery-list');
      await page.waitForLoadState('domcontentloaded');

      const emptyStateFast = await page.locator('text=Create your first grocery list').isVisible();
      const buttonsFast = await page.locator('button.w-full.justify-between.h-12').count();

      console.log(`Fast nav ${i + 1} - Empty state: ${emptyStateFast}, Buttons: ${buttonsFast}`);

      await page.waitForTimeout(2000);

      const emptyStateFastAfter = await page.locator('text=Create your first grocery list').isVisible();
      const buttonsFastAfter = await page.locator('button.w-full.justify-between.h-12').count();

      console.log(`Fast nav ${i + 1} after wait - Empty state: ${emptyStateFastAfter}, Buttons: ${buttonsFastAfter}`);

      if (emptyStateFast && !emptyStateFastAfter && buttonsFastAfter > 0) {
        console.log(`🚨 RACE CONDITION DETECTED in fast navigation ${i + 1}!`);
      }

      await page.screenshot({
        path: `test-results/grocery-fast-nav-${i + 1}.png`,
        fullPage: true
      });
    }
  });
});