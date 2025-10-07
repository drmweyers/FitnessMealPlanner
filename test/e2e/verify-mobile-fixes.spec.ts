import { test, expect } from '@playwright/test';

test.describe('Verify Mobile UI Fixes', () => {
  test.use({
    viewport: { width: 375, height: 812 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
  });

  test('All three mobile issues should be fixed', async ({ page }) => {
    console.log('Starting mobile UI verification test...');

    // 1. Login as customer
    await page.goto('http://localhost:4000/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('**/customer', { timeout: 10000 });
    console.log('Logged in successfully');

    // TEST 1: Check if meal plan modal opens centered (not top-left)
    console.log('Testing meal plan modal positioning...');

    // Look for a meal plan card - may need to wait for data to load
    const mealPlanCard = page.locator('.cursor-pointer').filter({ hasText: /meal plan/i }).first();
    const cardCount = await mealPlanCard.count();

    if (cardCount > 0) {
      await mealPlanCard.click();

      // Check if modal is visible and properly positioned
      const modal = page.locator('[role="dialog"]').first();
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Get modal bounding box to verify it's centered
      const box = await modal.boundingBox();
      if (box) {
        const viewportWidth = 375;
        const modalCenterX = box.x + (box.width / 2);
        const viewportCenterX = viewportWidth / 2;

        // Modal should be roughly centered (within 50px tolerance)
        const isCentered = Math.abs(modalCenterX - viewportCenterX) < 50;
        console.log(`Modal position - X: ${box.x}, Width: ${box.width}, Center: ${modalCenterX}, Viewport Center: ${viewportCenterX}, Centered: ${isCentered}`);
        expect(isCentered).toBe(true);
      }

      // Close modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } else {
      console.log('No meal plan cards found to test modal');
    }

    // TEST 2: Check "My Plans" navigation doesn't cause 404
    console.log('Testing My Plans navigation...');

    // Click on My Plans in navigation
    const myPlansButton = page.locator('button').filter({ hasText: 'My Plans' }).first();
    const myPlansCount = await myPlansButton.count();

    if (myPlansCount > 0) {
      await myPlansButton.click();
      await page.waitForTimeout(1000);

      // Check we're still on customer page with meal-plans tab
      const currentUrl = page.url();
      console.log(`Current URL after My Plans click: ${currentUrl}`);

      // Should be on /customer?tab=meal-plans, not 404
      expect(currentUrl).toContain('/customer');
      expect(currentUrl).toContain('tab=meal-plans');

      // Verify no 404 error
      const pageContent = await page.textContent('body');
      expect(pageContent).not.toContain('404');
      expect(pageContent).not.toContain('Page not found');
    } else {
      console.log('My Plans button not found in navigation');
    }

    // TEST 3: Check Progress -> Add Measurement modal positioning
    console.log('Testing Add Measurement modal positioning...');

    // Navigate to Progress tab
    const progressButton = page.locator('button').filter({ hasText: 'Progress' }).first();
    const progressCount = await progressButton.count();

    if (progressCount > 0) {
      await progressButton.click();
      await page.waitForTimeout(1000);

      // Click Add Measurement button
      const addMeasurementButton = page.locator('button').filter({ hasText: 'Add Measurement' }).first();
      const addButtonCount = await addMeasurementButton.count();

      if (addButtonCount > 0) {
        await addMeasurementButton.click();

        // Check if modal is visible and properly positioned
        const measurementModal = page.locator('[role="dialog"]').first();
        await expect(measurementModal).toBeVisible({ timeout: 5000 });

        // Get modal bounding box to verify it's centered
        const box = await measurementModal.boundingBox();
        if (box) {
          const viewportWidth = 375;
          const modalCenterX = box.x + (box.width / 2);
          const viewportCenterX = viewportWidth / 2;

          // Modal should be roughly centered (within 50px tolerance)
          const isCentered = Math.abs(modalCenterX - viewportCenterX) < 50;
          console.log(`Measurement modal position - X: ${box.x}, Width: ${box.width}, Center: ${modalCenterX}, Viewport Center: ${viewportCenterX}, Centered: ${isCentered}`);
          expect(isCentered).toBe(true);
        }
      } else {
        console.log('Add Measurement button not found');
      }
    } else {
      console.log('Progress button not found in navigation');
    }

    console.log('Mobile UI verification test completed');
  });
});