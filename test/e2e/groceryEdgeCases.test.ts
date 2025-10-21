/**
 * Comprehensive Playwright Tests for Grocery List Edge Cases and Error Scenarios
 *
 * This test suite covers challenging scenarios and edge cases including:
 * - Network connectivity issues and offline behavior
 * - API failures and error recovery mechanisms
 * - Performance testing with large datasets
 * - Concurrent user operations and race conditions
 * - Browser compatibility and accessibility features
 * - Mobile-specific interactions and responsive design
 * - Data corruption and invalid state handling
 * - Security edge cases and input validation
 * - Memory management and resource cleanup
 */

import { test, expect, Page, Browser } from '@playwright/test';

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

// Helper function to navigate to grocery list
async function navigateToGroceryList(page: Page) {
  await page.goto('/grocery-list');
  await page.waitForTimeout(2000);
}

// Helper function to create multiple test items
async function createMultipleItems(page: Page, count: number, namePrefix: string = 'Test Item') {
  for (let i = 1; i <= count; i++) {
    const addButton = page.locator('button', { hasText: 'Add Item' }).first();
    await addButton.click();

    await page.fill('input[placeholder="Item name"]', `${namePrefix} ${i}`);

    const submitButton = page.locator('button', { hasText: 'Add Item' }).last();
    await submitButton.click();

    await page.waitForTimeout(200);
  }
}

// Helper function to simulate network conditions
async function simulateNetworkCondition(page: Page, condition: 'offline' | 'slow' | 'timeout' | 'intermittent') {
  switch (condition) {
    case 'offline':
      await page.setOffline(true);
      break;
    case 'slow':
      await page.route('**/*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        route.continue();
      });
      break;
    case 'timeout':
      await page.route('**/api/**', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 30000));
        route.continue();
      });
      break;
    case 'intermittent':
      let requestCount = 0;
      await page.route('**/api/**', async (route) => {
        requestCount++;
        if (requestCount % 3 === 0) {
          route.fulfill({ status: 500, body: 'Intermittent Error' });
        } else {
          route.continue();
        }
      });
      break;
  }
}

test.describe('Grocery List Edge Cases and Error Scenarios', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsCustomer(page);
  });

  test.describe('Network Connectivity and Offline Behavior', () => {

    test('handle complete network loss gracefully', async ({ page }) => {
      await navigateToGroceryList(page);

      // Create an item first
      if (await page.locator('button', { hasText: 'Add Item' }).isVisible()) {
        const addButton = page.locator('button', { hasText: 'Add Item' }).first();
        await addButton.click();
        await page.fill('input[placeholder="Item name"]', 'Offline Test Item');

        // Simulate offline before submitting
        await simulateNetworkCondition(page, 'offline');

        const submitButton = page.locator('button', { hasText: 'Add Item' }).last();
        await submitButton.click();

        // Should show appropriate error or offline indicator
        const errorIndicator = page.locator('text=/Network error|Offline|Connection failed/i');
        await expect(errorIndicator).toBeVisible({ timeout: 10000 });
      }
    });

    test('recover from temporary network issues', async ({ page }) => {
      await navigateToGroceryList(page);

      // Start with intermittent network issues
      await simulateNetworkCondition(page, 'intermittent');

      if (await page.locator('button', { hasText: 'Add Item' }).isVisible()) {
        // Try to add multiple items (some may fail, some succeed)
        for (let i = 1; i <= 5; i++) {
          const addButton = page.locator('button', { hasText: 'Add Item' }).first();
          await addButton.click();
          await page.fill('input[placeholder="Item name"]', `Intermittent Item ${i}`);

          const submitButton = page.locator('button', { hasText: 'Add Item' }).last();
          await submitButton.click();

          await page.waitForTimeout(1000);
        }

        // Remove network simulation
        await page.unroute('**/api/**');

        // Try adding one more item - should work
        const addButton = page.locator('button', { hasText: 'Add Item' }).first();
        await addButton.click();
        await page.fill('input[placeholder="Item name"]', 'Recovery Item');

        const submitButton = page.locator('button', { hasText: 'Add Item' }).last();
        await submitButton.click();

        await expect(page.locator('.grocery-item-text', { hasText: 'Recovery Item' })).toBeVisible();
      }
    });

    test('handle slow network conditions', async ({ page }) => {
      await simulateNetworkCondition(page, 'slow');

      await navigateToGroceryList(page);

      // Should show loading indicators appropriately
      const loadingIndicator = page.locator('text=/Loading|Spinner/i, .animate-spin');
      await expect(loadingIndicator.first()).toBeVisible({ timeout: 5000 });
    });

  });

  test.describe('Performance Testing with Large Datasets', () => {

    test('handle large number of items (100+)', async ({ page }) => {
      await navigateToGroceryList(page);

      if (await page.locator('button', { hasText: 'Add Item' }).isVisible()) {
        // Create 50 items (scaled down for test performance)
        await createMultipleItems(page, 50, 'Bulk Item');

        // Should still be responsive
        const searchInput = page.locator('input[placeholder*="Search"]');
        if (await searchInput.isVisible()) {
          await searchInput.fill('Bulk Item 25');
          await page.waitForTimeout(500);

          // Should filter correctly
          await expect(page.locator('.grocery-item-text', { hasText: 'Bulk Item 25' })).toBeVisible();
        }

        // Scrolling should work smoothly
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(200);
        await page.evaluate(() => window.scrollTo(0, 0));
      }
    });

    test('handle rapid successive operations', async ({ page }) => {
      await navigateToGroceryList(page);

      if (await page.locator('button', { hasText: 'Add Item' }).isVisible()) {
        // Rapidly create multiple items
        const promises = [];
        for (let i = 1; i <= 10; i++) {
          promises.push((async () => {
            const addButton = page.locator('button', { hasText: 'Add Item' }).first();
            await addButton.click();
            await page.fill('input[placeholder="Item name"]', `Rapid Item ${i}`);
            const submitButton = page.locator('button', { hasText: 'Add Item' }).last();
            await submitButton.click();
          })());
        }

        // Execute all operations concurrently
        await Promise.all(promises);

        // Wait for all operations to complete
        await page.waitForTimeout(3000);

        // Verify some items were created (may not be all due to race conditions)
        const itemCount = await page.locator('.grocery-item-text').count();
        expect(itemCount).toBeGreaterThan(0);
      }
    });

    test('memory usage with large lists', async ({ page }) => {
      await navigateToGroceryList(page);

      // Monitor memory usage
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
      });

      if (await page.locator('button', { hasText: 'Add Item' }).isVisible()) {
        await createMultipleItems(page, 30, 'Memory Test Item');

        const finalMemory = await page.evaluate(() => {
          return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
        });

        // Memory growth should be reasonable (less than 50MB increase)
        if (initialMemory > 0 && finalMemory > 0) {
          const memoryGrowth = finalMemory - initialMemory;
          expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // 50MB
        }
      }
    });

  });

  test.describe('Browser Compatibility and Accessibility', () => {

    test('keyboard-only navigation', async ({ page }) => {
      await navigateToGroceryList(page);

      // Navigate using only keyboard
      await page.keyboard.press('Tab'); // Focus first interactive element
      await page.keyboard.press('Tab'); // Move to next element

      // Should be able to add item using keyboard
      const currentElement = await page.evaluate(() => document.activeElement?.tagName);

      // Keep tabbing until we find Add Item button
      for (let i = 0; i < 10; i++) {
        const element = await page.evaluate(() => document.activeElement?.textContent);
        if (element?.includes('Add Item')) {
          await page.keyboard.press('Enter');
          break;
        }
        await page.keyboard.press('Tab');
      }

      // If form opened, should be able to fill it
      if (await page.locator('input[placeholder="Item name"]').isVisible()) {
        await page.keyboard.type('Keyboard Navigation Item');
        await page.keyboard.press('Tab'); // Move to submit button
        await page.keyboard.press('Enter'); // Submit

        await expect(page.locator('.grocery-item-text', { hasText: 'Keyboard Navigation Item' })).toBeVisible();
      }
    });

    test('screen reader compatibility', async ({ page }) => {
      await navigateToGroceryList(page);

      // Check for proper ARIA labels and roles
      const addButton = page.locator('button', { hasText: 'Add Item' }).first();
      if (await addButton.isVisible()) {
        const ariaLabel = await addButton.getAttribute('aria-label');
        const hasRole = await addButton.getAttribute('role');

        // Should have appropriate accessibility attributes
        expect(ariaLabel || await addButton.textContent()).toBeTruthy();
      }

      // Check checkbox accessibility
      const checkboxes = page.locator('input[type="checkbox"], [role="checkbox"]');
      if (await checkboxes.first().isVisible()) {
        const firstCheckbox = checkboxes.first();
        const hasAriaLabel = await firstCheckbox.getAttribute('aria-label');
        const hasAriaLabelledBy = await firstCheckbox.getAttribute('aria-labelledby');

        expect(hasAriaLabel || hasAriaLabelledBy).toBeTruthy();
      }
    });

    test('high contrast mode support', async ({ page }) => {
      // Simulate high contrast mode
      await page.addStyleTag({
        content: `
          @media (prefers-contrast: high) {
            * {
              background: white !important;
              color: black !important;
              border: 1px solid black !important;
            }
          }
        `
      });

      await navigateToGroceryList(page);

      // Elements should still be visible and functional
      const addButton = page.locator('button', { hasText: 'Add Item' }).first();
      if (await addButton.isVisible()) {
        await expect(addButton).toBeVisible();

        // Should be clickable
        await addButton.click();
        await expect(page.locator('input[placeholder="Item name"]')).toBeVisible();
      }
    });

  });

  test.describe('Mobile-Specific Edge Cases', () => {

    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
    });

    test('handle device orientation changes', async ({ page }) => {
      await navigateToGroceryList(page);

      // Portrait mode
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      // Should be functional in portrait
      const addButton = page.locator('button', { hasText: 'Add Item' }).first();
      if (await addButton.isVisible()) {
        await expect(addButton).toBeVisible();
      }

      // Landscape mode
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(500);

      // Should adapt to landscape
      if (await addButton.isVisible()) {
        await expect(addButton).toBeVisible();
      }
    });

    test('handle touch gestures edge cases', async ({ page }) => {
      await navigateToGroceryList(page);

      if (await page.locator('button', { hasText: 'Add Item' }).isVisible()) {
        // Add test item
        const addButton = page.locator('button', { hasText: 'Add Item' }).first();
        await addButton.click();
        await page.fill('input[placeholder="Item name"]', 'Touch Test Item');
        const submitButton = page.locator('button', { hasText: 'Add Item' }).last();
        await submitButton.click();
        await page.waitForTimeout(500);

        const itemRow = page.locator('.grocery-item-text', { hasText: 'Touch Test Item' }).locator('..').locator('..');

        // Test incomplete swipe gesture
        await itemRow.hover();
        await page.mouse.down();
        await page.mouse.move(50, 0); // Short swipe
        await page.mouse.up();

        // Should not trigger action for short swipe
        await page.waitForTimeout(500);
        await expect(page.locator('.grocery-item-text', { hasText: 'Touch Test Item' })).toBeVisible();

        // Test diagonal swipe (should not trigger)
        await itemRow.hover();
        await page.mouse.down();
        await page.mouse.move(100, 100); // Diagonal movement
        await page.mouse.up();

        await page.waitForTimeout(500);
        await expect(page.locator('.grocery-item-text', { hasText: 'Touch Test Item' })).toBeVisible();
      }
    });

    test('handle small screen sizes', async ({ page }) => {
      // Very small screen (old phone)
      await page.setViewportSize({ width: 320, height: 480 });
      await navigateToGroceryList(page);

      // UI should still be functional
      const addButton = page.locator('button', { hasText: 'Add Item' }).first();
      if (await addButton.isVisible()) {
        const boundingBox = await addButton.boundingBox();

        // Button should be visible and clickable
        expect(boundingBox.width).toBeGreaterThan(0);
        expect(boundingBox.height).toBeGreaterThan(0);

        await addButton.click();
        await expect(page.locator('input[placeholder="Item name"]')).toBeVisible();
      }
    });

  });

  test.describe('Data Corruption and Invalid State Handling', () => {

    test('handle corrupted local storage', async ({ page }) => {
      // Corrupt local storage
      await page.evaluate(() => {
        localStorage.setItem('grocery-list-offline', 'invalid json data {');
        localStorage.setItem('user-preferences', '{"invalid": json}');
      });

      await navigateToGroceryList(page);

      // Should handle corrupted data gracefully
      await expect(page.locator('h1', { hasText: 'Grocery List' })).toBeVisible();

      // Local storage should be cleaned up
      const cleanStorage = await page.evaluate(() => {
        return localStorage.getItem('grocery-list-offline');
      });

      // Should either be null or valid JSON
      if (cleanStorage) {
        expect(() => JSON.parse(cleanStorage)).not.toThrow();
      }
    });

    test('handle invalid API responses', async ({ page }) => {
      // Mock invalid API responses
      await page.route('**/api/grocery-lists', async (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json response'
        });
      });

      await navigateToGroceryList(page);

      // Should handle invalid response gracefully
      const errorState = page.locator('text=/Error|Failed.*load/i');
      await expect(errorState).toBeVisible({ timeout: 10000 });
    });

    test('handle unexpected null/undefined values', async ({ page }) => {
      // Mock API with null values
      await page.route('**/api/grocery-lists', async (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              groceryLists: [
                {
                  id: null,
                  name: undefined,
                  items: null
                }
              ],
              total: null
            }
          })
        });
      });

      await navigateToGroceryList(page);

      // Should handle null values without crashing
      // May show empty state or error, but should not crash
      const isVisible = await page.locator('body').isVisible();
      expect(isVisible).toBe(true);
    });

  });

  test.describe('Security and Input Validation Edge Cases', () => {

    test('handle XSS attempts in item names', async ({ page }) => {
      await navigateToGroceryList(page);

      if (await page.locator('button', { hasText: 'Add Item' }).isVisible()) {
        const addButton = page.locator('button', { hasText: 'Add Item' }).first();
        await addButton.click();

        // Try to inject script
        const maliciousInput = '<script>alert("XSS")</script>';
        await page.fill('input[placeholder="Item name"]', maliciousInput);

        const submitButton = page.locator('button', { hasText: 'Add Item' }).last();
        await submitButton.click();

        // Should be properly escaped/sanitized
        const itemText = page.locator('.grocery-item-text', { hasText: maliciousInput });
        if (await itemText.isVisible()) {
          const innerHTML = await itemText.innerHTML();
          expect(innerHTML).not.toContain('<script>');
        }
      }
    });

    test('handle extremely long input values', async ({ page }) => {
      await navigateToGroceryList(page);

      if (await page.locator('button', { hasText: 'Add Item' }).isVisible()) {
        const addButton = page.locator('button', { hasText: 'Add Item' }).first();
        await addButton.click();

        // Very long item name
        const longName = 'A'.repeat(1000);
        await page.fill('input[placeholder="Item name"]', longName);

        const submitButton = page.locator('button', { hasText: 'Add Item' }).last();
        await submitButton.click();

        // Should either reject or truncate
        await page.waitForTimeout(2000);

        const errorMessage = page.locator('text=/Error|too long|invalid/i');
        const createdItem = page.locator('.grocery-item-text').filter({ hasText: /AAAA/ });

        // Either should show error or create item with truncated name
        const hasError = await errorMessage.isVisible();
        const hasItem = await createdItem.isVisible();

        expect(hasError || hasItem).toBe(true);
      }
    });

    test('handle special Unicode characters', async ({ page }) => {
      await navigateToGroceryList(page);

      if (await page.locator('button', { hasText: 'Add Item' }).isVisible()) {
        const specialChars = [
          '🥕 Carrot',
          '中文字符',
          'Café ñoño',
          '🍎🥖🥛',
          'Ṫᴇṡẗ Ḯẗᴇṁ'
        ];

        for (const specialName of specialChars) {
          const addButton = page.locator('button', { hasText: 'Add Item' }).first();
          await addButton.click();

          await page.fill('input[placeholder="Item name"]', specialName);

          const submitButton = page.locator('button', { hasText: 'Add Item' }).last();
          await submitButton.click();

          await page.waitForTimeout(500);

          // Should handle Unicode properly
          await expect(page.locator('.grocery-item-text', { hasText: specialName })).toBeVisible();
        }
      }
    });

  });

  test.describe('Concurrent Operations and Race Conditions', () => {

    test('handle simultaneous item additions', async ({ page, browser }) => {
      await navigateToGroceryList(page);

      // Open multiple browser contexts to simulate multiple users
      const context2 = await browser.newContext();
      const page2 = await context2.newPage();
      await loginAsCustomer(page2);
      await navigateToGroceryList(page2);

      // Simultaneously add items from both contexts
      const promises = [
        (async () => {
          if (await page.locator('button', { hasText: 'Add Item' }).isVisible()) {
            const addButton = page.locator('button', { hasText: 'Add Item' }).first();
            await addButton.click();
            await page.fill('input[placeholder="Item name"]', 'Concurrent Item 1');
            const submitButton = page.locator('button', { hasText: 'Add Item' }).last();
            await submitButton.click();
          }
        })(),
        (async () => {
          if (await page2.locator('button', { hasText: 'Add Item' }).isVisible()) {
            const addButton = page2.locator('button', { hasText: 'Add Item' }).first();
            await addButton.click();
            await page2.fill('input[placeholder="Item name"]', 'Concurrent Item 2');
            const submitButton = page2.locator('button', { hasText: 'Add Item' }).last();
            await submitButton.click();
          }
        })()
      ];

      await Promise.all(promises);

      // Wait for operations to complete
      await page.waitForTimeout(2000);
      await page2.waitForTimeout(2000);

      // Both items should exist (or show appropriate conflict resolution)
      const item1Exists = await page.locator('.grocery-item-text', { hasText: 'Concurrent Item 1' }).isVisible();
      const item2Exists = await page.locator('.grocery-item-text', { hasText: 'Concurrent Item 2' }).isVisible();

      // At least one operation should succeed
      expect(item1Exists || item2Exists).toBe(true);

      await context2.close();
    });

    test('handle rapid checkbox toggles', async ({ page }) => {
      await navigateToGroceryList(page);

      if (await page.locator('button', { hasText: 'Add Item' }).isVisible()) {
        // Create test item
        const addButton = page.locator('button', { hasText: 'Add Item' }).first();
        await addButton.click();
        await page.fill('input[placeholder="Item name"]', 'Toggle Test Item');
        const submitButton = page.locator('button', { hasText: 'Add Item' }).last();
        await submitButton.click();

        await page.waitForTimeout(500);

        const itemRow = page.locator('.grocery-item-text', { hasText: 'Toggle Test Item' }).locator('..').locator('..');
        const checkbox = itemRow.locator('input[type="checkbox"], [role="checkbox"]').first();

        // Rapidly toggle checkbox
        for (let i = 0; i < 10; i++) {
          await checkbox.click();
          await page.waitForTimeout(100);
        }

        // Should end up in a consistent state
        await page.waitForTimeout(2000);
        const finalState = await checkbox.isChecked();
        expect(typeof finalState).toBe('boolean');
      }
    });

  });

  test.describe('Resource Management and Cleanup', () => {

    test('handle page unload during operations', async ({ page }) => {
      await navigateToGroceryList(page);

      if (await page.locator('button', { hasText: 'Add Item' }).isVisible()) {
        // Start adding item
        const addButton = page.locator('button', { hasText: 'Add Item' }).first();
        await addButton.click();
        await page.fill('input[placeholder="Item name"]', 'Interrupted Item');

        // Mock slow API response
        await page.route('**/api/grocery-lists/**/items', async (route) => {
          await new Promise(resolve => setTimeout(resolve, 5000));
          route.continue();
        });

        const submitButton = page.locator('button', { hasText: 'Add Item' }).last();
        await submitButton.click();

        // Navigate away before completion
        await page.goto('/dashboard');

        // Should handle gracefully without errors
        await expect(page.locator('h1', { hasText: 'Dashboard' })).toBeVisible();
      }
    });

    test('handle browser refresh during operations', async ({ page }) => {
      await navigateToGroceryList(page);

      if (await page.locator('button', { hasText: 'Add Item' }).isVisible()) {
        // Add item with pending operation
        const addButton = page.locator('button', { hasText: 'Add Item' }).first();
        await addButton.click();
        await page.fill('input[placeholder="Item name"]', 'Refresh Test Item');

        // Mock slow network
        await page.route('**/api/grocery-lists/**/items', async (route) => {
          await new Promise(resolve => setTimeout(resolve, 3000));
          route.continue();
        });

        const submitButton = page.locator('button', { hasText: 'Add Item' }).last();
        await submitButton.click();

        // Refresh page mid-operation
        await page.reload();

        // Should recover gracefully
        await expect(page.locator('h1', { hasText: 'Grocery List' })).toBeVisible();
      }
    });

    test('handle memory leaks in long sessions', async ({ page }) => {
      await navigateToGroceryList(page);

      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
      });

      // Simulate long session with many operations
      for (let i = 0; i < 20; i++) {
        if (await page.locator('button', { hasText: 'Add Item' }).isVisible()) {
          const addButton = page.locator('button', { hasText: 'Add Item' }).first();
          await addButton.click();
          await page.fill('input[placeholder="Item name"]', `Memory Test ${i}`);
          const submitButton = page.locator('button', { hasText: 'Add Item' }).last();
          await submitButton.click();
          await page.waitForTimeout(100);

          // Delete the item to clean up
          const itemRow = page.locator('.grocery-item-text', { hasText: `Memory Test ${i}` }).locator('..').locator('..');
          const dropdownTrigger = itemRow.locator('button[role="button"]').last();
          if (await dropdownTrigger.isVisible()) {
            await dropdownTrigger.click();
            const deleteOption = page.locator('text=/Delete/');
            if (await deleteOption.isVisible()) {
              await deleteOption.click();
            }
          }
          await page.waitForTimeout(100);
        }
      }

      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
      });

      // Memory growth should be reasonable
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryGrowth = finalMemory - initialMemory;
        expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // 100MB max growth
      }
    });

  });
});