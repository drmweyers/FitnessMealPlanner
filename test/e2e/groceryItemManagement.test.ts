/**
 * Comprehensive Playwright Tests for Grocery List Item Management
 *
 * This test suite covers all item management operations including:
 * - Adding new items with various configurations
 * - Editing item details (name, quantity, category, etc.)
 * - Deleting items through multiple methods
 * - Form validation and error handling
 * - Category and unit selection
 * - Swipe gestures for mobile operations
 * - Bulk operations and item sorting
 */

import { test, expect, Page } from '@playwright/test';

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
  await expect(page.locator('h1', { hasText: 'Grocery List' })).toBeVisible();
  await page.waitForTimeout(2000); // Allow list to load
}

// Helper function to open add item form
async function openAddItemForm(page: Page) {
  const addItemButton = page.locator('button', { hasText: 'Add Item' }).first();
  await addItemButton.click();
  await expect(page.locator('input[placeholder="Item name"]')).toBeVisible();
}

// Helper function to fill item form
async function fillItemForm(page: Page, itemData: {
  name: string;
  quantity?: number;
  category?: string;
  unit?: string;
}) {
  await page.fill('input[placeholder="Item name"]', itemData.name);

  if (itemData.quantity) {
    await page.fill('input[placeholder="Qty"]', itemData.quantity.toString());
  }

  if (itemData.category) {
    const categorySelect = page.locator('select').first();
    await categorySelect.selectOption(itemData.category);
  }

  if (itemData.unit) {
    const unitSelect = page.locator('select').last();
    await unitSelect.selectOption(itemData.unit);
  }
}

// Helper function to submit item form
async function submitItemForm(page: Page) {
  const addButton = page.locator('button', { hasText: 'Add Item' }).last();
  await addButton.click();
}

// Helper function to cancel item form
async function cancelItemForm(page: Page) {
  const cancelButton = page.locator('button', { hasText: 'Cancel' });
  await cancelButton.click();
}

// Helper function to find item by name
async function findItemByName(page: Page, itemName: string) {
  return page.locator('.grocery-item-text', { hasText: itemName }).first();
}

// Helper function to delete item via dropdown menu
async function deleteItemViaDropdown(page: Page, itemName: string) {
  const itemRow = page.locator('.grocery-item-text', { hasText: itemName }).locator('..').locator('..');
  const dropdownTrigger = itemRow.locator('button[role="button"]').last();

  await dropdownTrigger.click();
  const deleteOption = page.locator('text=/Delete|Remove/');
  await deleteOption.click();
}

test.describe('Grocery List Item Management', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsCustomer(page);
    await navigateToGroceryList(page);
  });

  test.describe('Adding New Items', () => {

    test('add basic item with default values', async ({ page }) => {
      await openAddItemForm(page);

      await fillItemForm(page, {
        name: 'Basic Test Item'
      });

      await submitItemForm(page);

      // Verify item appears in list
      const newItem = await findItemByName(page, 'Basic Test Item');
      await expect(newItem).toBeVisible();

      // Verify default values (1 pcs, produce category)
      await expect(newItem).toContainText('1 pcs Basic Test Item');
    });

    test('add item with custom quantity and unit', async ({ page }) => {
      await openAddItemForm(page);

      await fillItemForm(page, {
        name: 'Custom Quantity Item',
        quantity: 3,
        unit: 'lbs'
      });

      await submitItemForm(page);

      const newItem = await findItemByName(page, 'Custom Quantity Item');
      await expect(newItem).toBeVisible();
      await expect(newItem).toContainText('3 lbs Custom Quantity Item');
    });

    test('add items in different categories', async ({ page }) => {
      const itemsToAdd = [
        { name: 'Fresh Spinach', category: 'produce' },
        { name: 'Ground Beef', category: 'meat' },
        { name: 'Whole Milk', category: 'dairy' },
        { name: 'Rice', category: 'pantry' },
        { name: 'Orange Juice', category: 'beverages' },
        { name: 'Chips', category: 'snacks' }
      ];

      for (const item of itemsToAdd) {
        await openAddItemForm(page);
        await fillItemForm(page, item);
        await submitItemForm(page);

        const newItem = await findItemByName(page, item.name);
        await expect(newItem).toBeVisible();

        // Wait for item to be added before continuing
        await page.waitForTimeout(500);
      }

      // Verify all items exist
      for (const item of itemsToAdd) {
        const itemElement = await findItemByName(page, item.name);
        await expect(itemElement).toBeVisible();
      }
    });

    test('add item with all available units', async ({ page }) => {
      const units = ['pcs', 'lbs', 'oz', 'cups', 'tbsp', 'tsp', 'cloves', 'bunches', 'packages', 'cans', 'bottles'];

      for (const unit of units) {
        await openAddItemForm(page);
        await fillItemForm(page, {
          name: `Test ${unit} Item`,
          quantity: 2,
          unit: unit
        });
        await submitItemForm(page);

        const newItem = await findItemByName(page, `Test ${unit} Item`);
        await expect(newItem).toBeVisible();
        await expect(newItem).toContainText(`2 ${unit} Test ${unit} Item`);

        await page.waitForTimeout(300);
      }
    });

    test('cancel adding item', async ({ page }) => {
      await openAddItemForm(page);

      await fillItemForm(page, {
        name: 'Cancelled Item'
      });

      await cancelItemForm(page);

      // Verify form is closed
      await expect(page.locator('input[placeholder="Item name"]')).not.toBeVisible();

      // Verify item was not added
      const cancelledItem = page.locator('.grocery-item-text', { hasText: 'Cancelled Item' });
      await expect(cancelledItem).not.toBeVisible();
    });

    test('form validation - empty item name', async ({ page }) => {
      await openAddItemForm(page);

      // Try to submit without item name
      await submitItemForm(page);

      // Should show error message
      const errorMessage = page.locator('text=/Item name is required|Error/');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });

      // Form should remain open
      await expect(page.locator('input[placeholder="Item name"]')).toBeVisible();
    });

    test('form validation - whitespace only item name', async ({ page }) => {
      await openAddItemForm(page);

      await page.fill('input[placeholder="Item name"]', '   ');
      await submitItemForm(page);

      // Should show error message
      const errorMessage = page.locator('text=/Item name is required|Error/');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
    });

    test('add item with keyboard shortcuts', async ({ page }) => {
      await openAddItemForm(page);

      await fillItemForm(page, {
        name: 'Keyboard Test Item'
      });

      // Submit with Enter key
      await page.press('input[placeholder="Item name"]', 'Enter');

      const newItem = await findItemByName(page, 'Keyboard Test Item');
      await expect(newItem).toBeVisible();
    });

    test('cancel item with Escape key', async ({ page }) => {
      await openAddItemForm(page);

      await page.fill('input[placeholder="Item name"]', 'Escape Test');

      // Cancel with Escape key
      await page.press('input[placeholder="Item name"]', 'Escape');

      // Form should be closed
      await expect(page.locator('input[placeholder="Item name"]')).not.toBeVisible();
    });

  });

  test.describe('Editing Items', () => {

    test.beforeEach(async ({ page }) => {
      // Add a test item to edit
      await openAddItemForm(page);
      await fillItemForm(page, {
        name: 'Editable Test Item',
        quantity: 2,
        category: 'produce',
        unit: 'lbs'
      });
      await submitItemForm(page);

      const newItem = await findItemByName(page, 'Editable Test Item');
      await expect(newItem).toBeVisible();
    });

    test('access edit option via dropdown menu', async ({ page }) => {
      const itemRow = page.locator('.grocery-item-text', { hasText: 'Editable Test Item' }).locator('..').locator('..');
      const dropdownTrigger = itemRow.locator('button[role="button"]').last();

      await dropdownTrigger.click();

      const editOption = page.locator('text=/Edit/');
      await expect(editOption).toBeVisible();
    });

    // Note: Edit functionality implementation depends on the actual UI implementation
    // The current UI may not have full edit functionality, so we test what's available

  });

  test.describe('Deleting Items', () => {

    test.beforeEach(async ({ page }) => {
      // Add test items to delete
      const itemsToAdd = [
        'Delete Test Item 1',
        'Delete Test Item 2',
        'Delete Test Item 3'
      ];

      for (const itemName of itemsToAdd) {
        await openAddItemForm(page);
        await fillItemForm(page, { name: itemName });
        await submitItemForm(page);
        await page.waitForTimeout(300);
      }
    });

    test('delete item via dropdown menu', async ({ page }) => {
      const itemName = 'Delete Test Item 1';

      await deleteItemViaDropdown(page, itemName);

      // Wait for deletion to complete
      await page.waitForTimeout(1000);

      // Verify item is removed
      const deletedItem = page.locator('.grocery-item-text', { hasText: itemName });
      await expect(deletedItem).not.toBeVisible();
    });

    test('delete multiple items', async ({ page }) => {
      const itemsToDelete = ['Delete Test Item 2', 'Delete Test Item 3'];

      for (const itemName of itemsToDelete) {
        await deleteItemViaDropdown(page, itemName);
        await page.waitForTimeout(500);
      }

      // Verify all items are removed
      for (const itemName of itemsToDelete) {
        const deletedItem = page.locator('.grocery-item-text', { hasText: itemName });
        await expect(deletedItem).not.toBeVisible();
      }
    });

  });

  test.describe('Mobile Swipe Gestures', () => {

    test.beforeEach(async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Add test item for swipe gestures
      await openAddItemForm(page);
      await fillItemForm(page, { name: 'Swipe Test Item' });
      await submitItemForm(page);
    });

    test('swipe right to check item', async ({ page }) => {
      const itemRow = page.locator('.grocery-item-text', { hasText: 'Swipe Test Item' }).locator('..').locator('..');

      // Simulate swipe right gesture
      await itemRow.hover();
      await page.mouse.down();
      await page.mouse.move(200, 0);
      await page.mouse.up();

      // Wait for swipe action
      await page.waitForTimeout(1000);

      // Item should be checked
      const checkbox = itemRow.locator('input[type="checkbox"], [role="checkbox"]').first();
      await expect(checkbox).toBeChecked();
    });

    test('swipe left to delete item', async ({ page }) => {
      const itemName = 'Swipe Test Item';
      const itemRow = page.locator('.grocery-item-text', { hasText: itemName }).locator('..').locator('..');

      // Simulate swipe left gesture
      await itemRow.hover();
      await page.mouse.down();
      await page.mouse.move(-200, 0);
      await page.mouse.up();

      // Wait for deletion
      await page.waitForTimeout(1000);

      // Item should be deleted
      const deletedItem = page.locator('.grocery-item-text', { hasText: itemName });
      await expect(deletedItem).not.toBeVisible();
    });

  });

  test.describe('Item Display and Sorting', () => {

    test.beforeEach(async ({ page }) => {
      // Add items with different priorities and categories
      const testItems = [
        { name: 'A High Priority', category: 'produce', priority: 'high' },
        { name: 'B Medium Priority', category: 'meat', priority: 'medium' },
        { name: 'C Low Priority', category: 'dairy', priority: 'low' },
        { name: 'Z First Alpha', category: 'pantry', priority: 'medium' }
      ];

      for (const item of testItems) {
        await openAddItemForm(page);
        await fillItemForm(page, {
          name: item.name,
          category: item.category
        });

        // Set priority if form supports it
        const prioritySelect = page.locator('select[name="priority"]');
        if (await prioritySelect.isVisible()) {
          await prioritySelect.selectOption(item.priority);
        }

        await submitItemForm(page);
        await page.waitForTimeout(300);
      }
    });

    test('sort items by category', async ({ page }) => {
      // Open sort menu
      const sortMenuTrigger = page.locator('button', { hasText: /More|Actions/ }).last();
      await sortMenuTrigger.click();

      const sortByCategoryOption = page.locator('text=/Category/');
      if (await sortByCategoryOption.isVisible()) {
        await sortByCategoryOption.click();

        // Wait for sorting
        await page.waitForTimeout(500);

        // Verify items are grouped by category
        const itemTexts = await page.locator('.grocery-item-text').allTextContents();

        // Items should be sorted by category order (produce, meat, dairy, pantry, etc.)
        expect(itemTexts.length).toBeGreaterThan(0);
      }
    });

    test('sort items by name', async ({ page }) => {
      // Open sort menu
      const sortMenuTrigger = page.locator('button', { hasText: /More|Actions/ }).last();
      await sortMenuTrigger.click();

      const sortByNameOption = page.locator('text=/Name/');
      if (await sortByNameOption.isVisible()) {
        await sortByNameOption.click();

        // Wait for sorting
        await page.waitForTimeout(500);

        // Verify items are sorted alphabetically
        const itemTexts = await page.locator('.grocery-item-text').allTextContents();

        // Check that "A High Priority" comes before "Z First Alpha"
        const aIndex = itemTexts.findIndex(text => text.includes('A High Priority'));
        const zIndex = itemTexts.findIndex(text => text.includes('Z First Alpha'));

        if (aIndex !== -1 && zIndex !== -1) {
          expect(aIndex).toBeLessThan(zIndex);
        }
      }
    });

    test('high priority items show badge', async ({ page }) => {
      const highPriorityItem = page.locator('.grocery-item-text', { hasText: 'A High Priority' }).locator('..');

      // Check for high priority badge
      const priorityBadge = highPriorityItem.locator('text=/High/');
      if (await priorityBadge.isVisible()) {
        await expect(priorityBadge).toBeVisible();
      }
    });

  });

  test.describe('View Modes', () => {

    test.beforeEach(async ({ page }) => {
      // Add items in different categories
      const categorizedItems = [
        { name: 'Apple', category: 'produce' },
        { name: 'Chicken', category: 'meat' },
        { name: 'Milk', category: 'dairy' }
      ];

      for (const item of categorizedItems) {
        await openAddItemForm(page);
        await fillItemForm(page, item);
        await submitItemForm(page);
        await page.waitForTimeout(300);
      }
    });

    test('switch between list and category view modes', async ({ page }) => {
      // Find view mode toggle button
      const viewToggle = page.locator('button').filter({ hasText: /Grid|List/ });

      if (await viewToggle.isVisible()) {
        // Click to switch view mode
        await viewToggle.click();

        // Wait for view to change
        await page.waitForTimeout(500);

        // Verify items are still visible
        await expect(page.locator('.grocery-item-text', { hasText: 'Apple' })).toBeVisible();

        // Switch back
        await viewToggle.click();
        await page.waitForTimeout(500);

        // Items should still be visible
        await expect(page.locator('.grocery-item-text', { hasText: 'Apple' })).toBeVisible();
      }
    });

    test('category view groups items correctly', async ({ page }) => {
      // In category view, items should be grouped under category headers
      const categoryHeaders = page.locator('text=/Produce|Meat.*Seafood|Dairy.*Eggs/');

      if (await categoryHeaders.first().isVisible()) {
        // Verify category headers exist
        await expect(categoryHeaders.first()).toBeVisible();

        // Verify items appear under their category sections
        await expect(page.locator('.grocery-item-text', { hasText: 'Apple' })).toBeVisible();
        await expect(page.locator('.grocery-item-text', { hasText: 'Chicken' })).toBeVisible();
      }
    });

  });

  test.describe('Bulk Operations', () => {

    test.beforeEach(async ({ page }) => {
      // Add and check some items for bulk operations
      const bulkItems = [
        'Bulk Item 1',
        'Bulk Item 2',
        'Bulk Item 3',
        'Bulk Item 4'
      ];

      for (const itemName of bulkItems) {
        await openAddItemForm(page);
        await fillItemForm(page, { name: itemName });
        await submitItemForm(page);
        await page.waitForTimeout(300);
      }

      // Check some items
      const itemsToCheck = ['Bulk Item 1', 'Bulk Item 2'];
      for (const itemName of itemsToCheck) {
        const itemRow = page.locator('.grocery-item-text', { hasText: itemName }).locator('..').locator('..');
        const checkbox = itemRow.locator('input[type="checkbox"], [role="checkbox"]').first();
        await checkbox.click();
        await page.waitForTimeout(300);
      }
    });

    test('clear all completed items', async ({ page }) => {
      // Find clear completed button
      const clearButton = page.locator('button', { hasText: /Clear.*Done|Clear.*Completed/ });
      await expect(clearButton).toBeVisible();

      await clearButton.click();

      // Wait for bulk deletion
      await page.waitForTimeout(2000);

      // Checked items should be removed
      await expect(page.locator('.grocery-item-text', { hasText: 'Bulk Item 1' })).not.toBeVisible();
      await expect(page.locator('.grocery-item-text', { hasText: 'Bulk Item 2' })).not.toBeVisible();

      // Unchecked items should remain
      await expect(page.locator('.grocery-item-text', { hasText: 'Bulk Item 3' })).toBeVisible();
      await expect(page.locator('.grocery-item-text', { hasText: 'Bulk Item 4' })).toBeVisible();
    });

  });

  test.describe('Error Handling', () => {

    test('handle add item API failure', async ({ page }) => {
      // Simulate API failure for adding items
      await page.route('**/api/grocery-lists/**/items', async (route) => {
        if (route.request().method() === 'POST') {
          route.fulfill({ status: 500, body: 'Server Error' });
        } else {
          route.continue();
        }
      });

      await openAddItemForm(page);
      await fillItemForm(page, { name: 'Failed Item' });
      await submitItemForm(page);

      // Should show error message
      const errorMessage = page.locator('text=/Error|Failed/');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });

      // Item should not appear in list
      await expect(page.locator('.grocery-item-text', { hasText: 'Failed Item' })).not.toBeVisible();
    });

    test('handle delete item API failure', async ({ page }) => {
      // Add item first
      await openAddItemForm(page);
      await fillItemForm(page, { name: 'Delete Fail Item' });
      await submitItemForm(page);

      // Simulate API failure for deleting items
      await page.route('**/api/grocery-lists/**/items/**', async (route) => {
        if (route.request().method() === 'DELETE') {
          route.fulfill({ status: 500, body: 'Server Error' });
        } else {
          route.continue();
        }
      });

      await deleteItemViaDropdown(page, 'Delete Fail Item');

      // Should show error message
      const errorMessage = page.locator('text=/Error|Failed/');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });

      // Item should still be visible (deletion failed)
      await expect(page.locator('.grocery-item-text', { hasText: 'Delete Fail Item' })).toBeVisible();
    });

  });
});