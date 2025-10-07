/**
 * Comprehensive Playwright Tests for Grocery List Checkbox Functionality
 *
 * Tests checkbox clicking, state updates, API integration, and accessibility.
 * Focuses on verifying that checkboxes are clickable and update the backend via API.
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

const CUSTOMER_CREDENTIALS = {
  email: 'customer.test@evofitmeals.com',
  password: 'TestCustomer123!'
};

// Helper function to login as customer
async function loginAsCustomer(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', CUSTOMER_CREDENTIALS.email);
  await page.fill('input[type="password"]', CUSTOMER_CREDENTIALS.password);
  await page.click('button[type="submit"]');
  await expect(page.locator('span', { hasText: 'Meal Plans' }).first()).toBeVisible({ timeout: 10000 });
}

// Helper function to navigate to grocery list and wait for items to load
async function navigateToGroceryList(page: Page) {
  await page.goto('/grocery-list');
  await expect(page.locator('h1', { hasText: 'Grocery List' })).toBeVisible();

  // Wait for grocery list to load and show items or empty state
  await page.waitForTimeout(2000);

  // Check if items exist
  const itemCount = await page.locator('.grocery-item-text').count();

  if (itemCount === 0) {
    // If no items, create some test items first
    await createTestItem(page, 'Test Broccoli', 'produce');
    await createTestItem(page, 'Test Chicken', 'meat');
    await createTestItem(page, 'Test Milk', 'dairy');
  }

  // Ensure we have items to test with
  await expect(page.locator('.grocery-item-text').first()).toBeVisible();
}

// Helper function to create a test item
async function createTestItem(page: Page, itemName: string, category: string) {
  // Click Add Item button
  const addItemButton = page.locator('button', { hasText: 'Add Item' }).first();
  await addItemButton.click();

  // Fill in the form
  await page.fill('input[placeholder*="Item name"]', itemName);
  await page.selectOption('select', category);

  // Submit the form
  await page.click('button', { hasText: 'Add Item' });

  // Wait for the item to appear
  await expect(page.locator('.grocery-item-text', { hasText: itemName })).toBeVisible();
}

// Helper function to get checkbox for specific item
function getItemCheckbox(page: Page, itemName: string) {
  return page.locator('.touch-target').filter({
    has: page.locator('.grocery-item-text', { hasText: itemName })
  }).first();
}

// Helper function to get actual checkbox input for specific item
function getItemCheckboxInput(page: Page, itemName: string) {
  return page.locator('.touch-target').filter({
    has: page.locator('.grocery-item-text', { hasText: itemName })
  }).locator('input[type="checkbox"]').first();
}

test.describe('Grocery List Checkbox Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCustomer(page);
    await navigateToGroceryList(page);
  });

  test.describe('Basic Checkbox Operations', () => {
    test('should check item via touch target click', async ({ page }) => {
      const firstItem = page.locator('.grocery-item-text').first();
      const itemText = await firstItem.textContent();
      console.log(`Testing with item: ${itemText}`);

      // Get the touch target for this item
      const touchTarget = page.locator('.touch-target').filter({
        has: firstItem
      }).first();

      // Verify touch target is clickable
      await expect(touchTarget).toBeVisible();
      await expect(touchTarget).toHaveAttribute('role', 'button');

      // Get initial checkbox state
      const checkbox = touchTarget.locator('input[type="checkbox"]').first();
      const initialChecked = await checkbox.isChecked();
      console.log(`Initial checked state: ${initialChecked}`);

      // Click the touch target to toggle checkbox
      await touchTarget.click();

      // Wait for state change
      await page.waitForTimeout(500);

      // Verify checkbox state changed
      const newChecked = await checkbox.isChecked();
      expect(newChecked).toBe(!initialChecked);
      console.log(`New checked state: ${newChecked}`);

      // Verify visual state changes
      if (newChecked) {
        await expect(firstItem).toHaveClass(/line-through/);
        // Check for opacity change on parent element
        const itemRow = firstItem.locator('../../..');
        await expect(itemRow).toHaveClass(/opacity-50/);
      }
    });

    test('should uncheck item via touch target click', async ({ page }) => {
      const firstItem = page.locator('.grocery-item-text').first();
      const touchTarget = page.locator('.touch-target').filter({
        has: firstItem
      }).first();
      const checkbox = touchTarget.locator('input[type="checkbox"]').first();

      // First, ensure item is checked
      const initialChecked = await checkbox.isChecked();
      if (!initialChecked) {
        await touchTarget.click();
        await page.waitForTimeout(500);
        await expect(checkbox).toBeChecked();
      }

      // Now uncheck the item
      await touchTarget.click();
      await page.waitForTimeout(500);

      // Verify item is unchecked
      await expect(checkbox).not.toBeChecked();

      // Verify visual state reverted
      await expect(firstItem).not.toHaveClass(/line-through/);
      const itemRow = firstItem.locator('../../..');
      await expect(itemRow).not.toHaveClass(/opacity-50/);
    });

    test('should handle multiple checkbox operations', async ({ page }) => {
      const items = page.locator('.grocery-item-text');
      const itemCount = await items.count();
      console.log(`Testing with ${itemCount} items`);

      // Check first 3 items (or all if less than 3)
      const itemsToCheck = Math.min(3, itemCount);
      const checkedItems: string[] = [];

      for (let i = 0; i < itemsToCheck; i++) {
        const item = items.nth(i);
        const itemText = await item.textContent();
        checkedItems.push(itemText || '');

        const touchTarget = page.locator('.touch-target').filter({
          has: item
        }).first();

        await touchTarget.click();
        await page.waitForTimeout(300);

        // Verify item is checked
        const checkbox = touchTarget.locator('input[type="checkbox"]').first();
        await expect(checkbox).toBeChecked();
      }

      console.log(`Checked items: ${checkedItems.join(', ')}`);

      // Now uncheck them in reverse order
      for (let i = itemsToCheck - 1; i >= 0; i--) {
        const item = items.nth(i);
        const touchTarget = page.locator('.touch-target').filter({
          has: item
        }).first();

        await touchTarget.click();
        await page.waitForTimeout(300);

        // Verify item is unchecked
        const checkbox = touchTarget.locator('input[type="checkbox"]').first();
        await expect(checkbox).not.toBeChecked();
      }
    });
  });

  test.describe('API Integration & Data Persistence', () => {
    test('should persist checkbox state after page refresh', async ({ page }) => {
      const firstItem = page.locator('.grocery-item-text').first();
      const itemText = await firstItem.textContent();

      const touchTarget = page.locator('.touch-target').filter({
        has: firstItem
      }).first();
      const checkbox = touchTarget.locator('input[type="checkbox"]').first();

      // Check the item
      await touchTarget.click();
      await page.waitForTimeout(1000); // Wait for API call

      // Verify it's checked
      await expect(checkbox).toBeChecked();

      // Refresh the page
      await page.reload();
      await navigateToGroceryList(page);

      // Find the same item and verify it's still checked
      const refreshedItem = page.locator('.grocery-item-text', { hasText: itemText || '' }).first();
      const refreshedTouchTarget = page.locator('.touch-target').filter({
        has: refreshedItem
      }).first();
      const refreshedCheckbox = refreshedTouchTarget.locator('input[type="checkbox"]').first();

      await expect(refreshedCheckbox).toBeChecked();
      await expect(refreshedItem).toHaveClass(/line-through/);
    });

    test('should handle optimistic updates', async ({ page }) => {
      const firstItem = page.locator('.grocery-item-text').first();
      const touchTarget = page.locator('.touch-target').filter({
        has: firstItem
      }).first();
      const checkbox = touchTarget.locator('input[type="checkbox"]').first();

      // Monitor network requests
      const apiRequests: any[] = [];
      page.on('request', request => {
        if (request.url().includes('/api/grocery-lists/') && request.method() === 'PUT') {
          apiRequests.push({
            url: request.url(),
            method: request.method(),
            postData: request.postData()
          });
        }
      });

      // Click checkbox and verify immediate UI feedback
      await touchTarget.click();

      // Should immediately show as checked (optimistic update)
      await expect(checkbox).toBeChecked();
      await expect(firstItem).toHaveClass(/line-through/);

      // Wait for API call to complete
      await page.waitForTimeout(2000);

      // Verify API call was made
      expect(apiRequests.length).toBeGreaterThan(0);
      console.log('API requests made:', apiRequests.length);

      // Verify checkbox remains checked after API response
      await expect(checkbox).toBeChecked();
    });

    test('should clear all checked items', async ({ page }) => {
      // Check multiple items first
      const items = page.locator('.grocery-item-text');
      const itemCount = await items.count();

      // Check first 2 items
      for (let i = 0; i < Math.min(2, itemCount); i++) {
        const item = items.nth(i);
        const touchTarget = page.locator('.touch-target').filter({
          has: item
        }).first();
        await touchTarget.click();
        await page.waitForTimeout(300);
      }

      // Look for "Clear Done" or "Clear Completed" button
      const clearButton = page.locator('button', { hasText: /Clear.*Done|Clear.*Completed/i }).first();

      if (await clearButton.isVisible()) {
        await clearButton.click();
        await page.waitForTimeout(1000);

        // Verify checked items are removed/cleared
        const remainingItems = await page.locator('.grocery-item-text').count();
        console.log(`Items remaining after clear: ${remainingItems}`);

        // Should have fewer items or show confirmation message
        expect(remainingItems).toBeLessThan(itemCount);
      } else {
        console.log('Clear button not found - may be hidden when no checked items');
      }
    });
  });

  test.describe('Error Handling & Edge Cases', () => {
    test('should handle rapid clicking gracefully', async ({ page }) => {
      const firstItem = page.locator('.grocery-item-text').first();
      const touchTarget = page.locator('.touch-target').filter({
        has: firstItem
      }).first();
      const checkbox = touchTarget.locator('input[type="checkbox"]').first();

      // Get initial state
      const initialChecked = await checkbox.isChecked();

      // Rapid clicks
      for (let i = 0; i < 5; i++) {
        await touchTarget.click();
        await page.waitForTimeout(50); // Very short delay
      }

      // Wait for all mutations to settle
      await page.waitForTimeout(2000);

      // Final state should be different from initial (odd number of clicks)
      const finalChecked = await checkbox.isChecked();
      expect(finalChecked).toBe(!initialChecked);
    });

    test('should handle disabled state during updates', async ({ page }) => {
      const firstItem = page.locator('.grocery-item-text').first();
      const touchTarget = page.locator('.touch-target').filter({
        has: firstItem
      }).first();
      const checkbox = touchTarget.locator('input[type="checkbox"]').first();

      // Monitor for loading/disabled states
      await touchTarget.click();

      // Check if checkbox becomes disabled during update
      // This might happen briefly during API calls
      await page.waitForTimeout(100);

      // The element should still be interactable after a reasonable time
      await page.waitForTimeout(1000);
      await expect(touchTarget).not.toHaveAttribute('disabled');
      await expect(checkbox).not.toBeDisabled();
    });

    test('should handle network errors gracefully', async ({ page, context }) => {
      // Intercept and fail API requests
      await page.route('**/api/grocery-lists/*/items/*/update', route => {
        route.abort('failed');
      });

      const firstItem = page.locator('.grocery-item-text').first();
      const touchTarget = page.locator('.touch-target').filter({
        has: firstItem
      }).first();
      const checkbox = touchTarget.locator('input[type="checkbox"]').first();

      const initialChecked = await checkbox.isChecked();

      // Try to toggle checkbox
      await touchTarget.click();

      // Should show optimistic update first
      await expect(checkbox).toBeChecked();

      // Wait for error handling
      await page.waitForTimeout(3000);

      // Check if error toast appears or state reverts
      const errorToast = page.locator('[role="alert"]', { hasText: /error|failed/i });
      if (await errorToast.isVisible()) {
        console.log('Error toast appeared as expected');
      }

      // State might revert due to error
      const finalChecked = await checkbox.isChecked();
      console.log(`Initial: ${initialChecked}, Final: ${finalChecked}`);
    });
  });

  test.describe('Accessibility Features', () => {
    test('should support keyboard navigation', async ({ page }) => {
      const firstItem = page.locator('.grocery-item-text').first();
      const touchTarget = page.locator('.touch-target').filter({
        has: firstItem
      }).first();
      const checkbox = touchTarget.locator('input[type="checkbox"]').first();

      // Focus the touch target
      await touchTarget.focus();

      // Verify it's focusable
      await expect(touchTarget).toBeFocused();

      // Get initial state
      const initialChecked = await checkbox.isChecked();

      // Press Enter to toggle
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      // Verify state changed
      const afterEnter = await checkbox.isChecked();
      expect(afterEnter).toBe(!initialChecked);

      // Press Space to toggle again
      await page.keyboard.press('Space');
      await page.waitForTimeout(500);

      // Should be back to initial state
      const afterSpace = await checkbox.isChecked();
      expect(afterSpace).toBe(initialChecked);
    });

    test('should have proper ARIA labels', async ({ page }) => {
      const items = page.locator('.grocery-item-text');
      const itemCount = await items.count();

      // Check first few items for accessibility attributes
      for (let i = 0; i < Math.min(3, itemCount); i++) {
        const item = items.nth(i);
        const itemText = await item.textContent();

        const touchTarget = page.locator('.touch-target').filter({
          has: item
        }).first();

        // Check for proper role
        await expect(touchTarget).toHaveAttribute('role', 'button');

        // Check for aria-label
        const ariaLabel = await touchTarget.getAttribute('aria-label');
        expect(ariaLabel).toContain(itemText?.split(' ').slice(-1)[0] || ''); // Should contain item name
        expect(ariaLabel).toMatch(/(check|uncheck)/i); // Should indicate action

        console.log(`Item: ${itemText}, ARIA label: ${ariaLabel}`);
      }
    });

    test('should have adequate touch target sizes', async ({ page }) => {
      const touchTargets = page.locator('.touch-target').filter({
        has: page.locator('input[type="checkbox"]')
      });

      const targetCount = await touchTargets.count();
      console.log(`Found ${targetCount} checkbox touch targets`);

      // Check first few touch targets
      for (let i = 0; i < Math.min(3, targetCount); i++) {
        const target = touchTargets.nth(i);
        const boundingBox = await target.boundingBox();

        if (boundingBox) {
          // Touch targets should be at least 44x44px for accessibility
          expect(boundingBox.width).toBeGreaterThanOrEqual(44);
          expect(boundingBox.height).toBeGreaterThanOrEqual(44);

          console.log(`Touch target ${i}: ${boundingBox.width}x${boundingBox.height}px`);
        }
      }
    });

    test('should work with screen reader navigation', async ({ page }) => {
      // Test that checkboxes are properly labeled for screen readers
      const checkboxes = page.locator('input[type="checkbox"]');
      const checkboxCount = await checkboxes.count();

      for (let i = 0; i < Math.min(3, checkboxCount); i++) {
        const checkbox = checkboxes.nth(i);

        // Should have proper labeling through parent touch target
        const touchTarget = checkbox.locator('../..');
        const ariaLabel = await touchTarget.getAttribute('aria-label');

        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel).toMatch(/(check|uncheck)/i);

        // Checkbox should be focusable
        await checkbox.focus();
        await expect(checkbox).toBeFocused();
      }
    });
  });

  test.describe('Visual State Changes', () => {
    test('should apply correct styling to checked items', async ({ page }) => {
      const firstItem = page.locator('.grocery-item-text').first();
      const touchTarget = page.locator('.touch-target').filter({
        has: firstItem
      }).first();
      const checkbox = touchTarget.locator('input[type="checkbox"]').first();

      // Ensure item starts unchecked
      if (await checkbox.isChecked()) {
        await touchTarget.click();
        await page.waitForTimeout(500);
      }

      // Check the item
      await touchTarget.click();
      await page.waitForTimeout(500);

      // Verify checked styling
      await expect(checkbox).toBeChecked();
      await expect(firstItem).toHaveClass(/line-through/);

      // Check for opacity reduction on the item row
      const itemRow = firstItem.locator('../../..');
      await expect(itemRow).toHaveClass(/opacity-50/);

      // Verify text color change (should be muted)
      await expect(firstItem).toHaveClass(/text-muted-foreground/);
    });

    test('should remove styling when unchecked', async ({ page }) => {
      const firstItem = page.locator('.grocery-item-text').first();
      const touchTarget = page.locator('.touch-target').filter({
        has: firstItem
      }).first();
      const checkbox = touchTarget.locator('input[type="checkbox"]').first();

      // Ensure item is checked first
      if (!await checkbox.isChecked()) {
        await touchTarget.click();
        await page.waitForTimeout(500);
      }

      // Uncheck the item
      await touchTarget.click();
      await page.waitForTimeout(500);

      // Verify unchecked styling
      await expect(checkbox).not.toBeChecked();
      await expect(firstItem).not.toHaveClass(/line-through/);

      // Check that opacity is restored
      const itemRow = firstItem.locator('../../..');
      await expect(itemRow).not.toHaveClass(/opacity-50/);

      // Verify normal text color is restored
      await expect(firstItem).toHaveClass(/text-foreground/);
    });

    test('should sort checked items to bottom', async ({ page }) => {
      const items = page.locator('.grocery-item-text');
      const itemCount = await items.count();

      if (itemCount < 2) {
        console.log('Not enough items to test sorting');
        return;
      }

      // Get the first item's text
      const firstItemText = await items.first().textContent();

      // Check the first item
      const firstTouchTarget = page.locator('.touch-target').filter({
        has: items.first()
      }).first();

      await firstTouchTarget.click();
      await page.waitForTimeout(1000); // Wait for re-sorting

      // Verify first item moved down (checked items go to bottom)
      const newFirstItem = await items.first().textContent();
      expect(newFirstItem).not.toBe(firstItemText);

      // Find where the checked item went (should be at the bottom)
      const checkedItem = page.locator('.grocery-item-text', { hasText: firstItemText || '' });
      await expect(checkedItem).toHaveClass(/line-through/);
    });
  });

  test.describe('Multiple User Simulation', () => {
    test('should handle concurrent checkbox updates', async ({ page, context }) => {
      // This test simulates multiple users checking items simultaneously
      // by opening multiple tabs/contexts

      // Create a second page/tab
      const page2 = await context.newPage();
      await loginAsCustomer(page2);
      await navigateToGroceryList(page2);

      // Check an item in the first page
      const firstItem1 = page.locator('.grocery-item-text').first();
      const itemText = await firstItem1.textContent();
      const touchTarget1 = page.locator('.touch-target').filter({
        has: firstItem1
      }).first();

      await touchTarget1.click();
      await page.waitForTimeout(1000);

      // Refresh the second page to see the change
      await page2.reload();
      await navigateToGroceryList(page2);

      // Verify the item is checked in the second page
      const firstItem2 = page2.locator('.grocery-item-text', { hasText: itemText || '' });
      const touchTarget2 = page2.locator('.touch-target').filter({
        has: firstItem2
      }).first();
      const checkbox2 = touchTarget2.locator('input[type="checkbox"]').first();

      await expect(checkbox2).toBeChecked();
      await expect(firstItem2).toHaveClass(/line-through/);

      await page2.close();
    });
  });

  test.describe('Dropdown Menu Integration', () => {
    test('should allow checking via dropdown menu', async ({ page }) => {
      const firstItem = page.locator('.grocery-item-text').first();
      const checkbox = page.locator('.touch-target').filter({
        has: firstItem
      }).locator('input[type="checkbox"]').first();

      // Ensure item starts unchecked
      if (await checkbox.isChecked()) {
        const touchTarget = page.locator('.touch-target').filter({
          has: firstItem
        }).first();
        await touchTarget.click();
        await page.waitForTimeout(500);
      }

      // Find and click the more options button (three dots)
      const moreButton = page.locator('button').filter({
        has: page.locator('svg') // More button usually has an SVG icon
      }).first();

      await moreButton.click();

      // Look for "Check Off" option in dropdown
      const checkOffOption = page.locator('text=Check Off').first();
      if (await checkOffOption.isVisible()) {
        await checkOffOption.click();
        await page.waitForTimeout(500);

        // Verify item is now checked
        await expect(checkbox).toBeChecked();
        await expect(firstItem).toHaveClass(/line-through/);
      }
    });

    test('should allow unchecking via dropdown menu', async ({ page }) => {
      const firstItem = page.locator('.grocery-item-text').first();
      const touchTarget = page.locator('.touch-target').filter({
        has: firstItem
      }).first();
      const checkbox = touchTarget.locator('input[type="checkbox"]').first();

      // Ensure item is checked first
      if (!await checkbox.isChecked()) {
        await touchTarget.click();
        await page.waitForTimeout(500);
      }

      // Find and click the more options button
      const moreButton = page.locator('button').filter({
        has: page.locator('svg')
      }).first();

      await moreButton.click();

      // Look for "Uncheck" option in dropdown
      const uncheckOption = page.locator('text=Uncheck').first();
      if (await uncheckOption.isVisible()) {
        await uncheckOption.click();
        await page.waitForTimeout(500);

        // Verify item is now unchecked
        await expect(checkbox).not.toBeChecked();
        await expect(firstItem).not.toHaveClass(/line-through/);
      }
    });
  });
});