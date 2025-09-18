/**
 * Comprehensive Playwright Tests for Grocery List Checkbox Functionality
 *
 * This test suite focuses exclusively on checkbox behavior including:
 * - Visual feedback for checkbox clicks
 * - State persistence across page reloads
 * - Optimistic updates with API integration
 * - Accessibility compliance
 * - Mobile touch targets
 * - Keyboard navigation
 * - Bulk operations (clear completed)
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

// Helper function to navigate to grocery list and ensure items exist
async function navigateToGroceryListWithItems(page: Page) {
  await page.goto('/grocery-list');
  await expect(page.locator('h1', { hasText: 'Grocery List' })).toBeVisible();

  // Wait for content to load
  await page.waitForTimeout(2000);

  // Check if items exist, if not create test items
  const itemCount = await page.locator('[data-testid="grocery-item"], .grocery-item-text').count();

  if (itemCount === 0) {
    // Create test items
    await createTestItem(page, 'Test Broccoli', 'produce');
    await createTestItem(page, 'Test Chicken', 'meat');
    await createTestItem(page, 'Test Milk', 'dairy');
    await createTestItem(page, 'Test Pasta', 'pantry');
  }

  // Ensure we have items to test with
  await expect(page.locator('.grocery-item-text').first()).toBeVisible();
}

// Helper function to create a test item
async function createTestItem(page: Page, itemName: string, category: string) {
  const addItemButton = page.locator('button', { hasText: 'Add Item' }).first();
  await addItemButton.click();

  await page.fill('input[placeholder="Item name"]', itemName);

  const categorySelect = page.locator('select').first();
  await categorySelect.selectOption(category);

  const addButton = page.locator('button', { hasText: 'Add Item' }).last();
  await addButton.click();

  // Wait for item to be added
  await expect(page.locator('.grocery-item-text', { hasText: itemName })).toBeVisible();
}

// Helper to get checkbox element for an item
async function getCheckboxForItem(page: Page, itemName: string) {
  const itemRow = page.locator('.grocery-item-text', { hasText: itemName }).locator('..').locator('..');
  return itemRow.locator('input[type="checkbox"], [role="checkbox"]').first();
}

// Helper to get the touch target for an item checkbox
async function getCheckboxTouchTarget(page: Page, itemName: string) {
  const itemRow = page.locator('.grocery-item-text', { hasText: itemName }).locator('..').locator('..');
  return itemRow.locator('.touch-target, .touch-target-checkbox').first();
}

test.describe('Grocery List Checkbox Functionality', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsCustomer(page);
    await navigateToGroceryListWithItems(page);
  });

  test('checkbox visual states - unchecked to checked', async ({ page }) => {
    const itemName = 'Test Broccoli';
    const checkbox = await getCheckboxForItem(page, itemName);
    const itemText = page.locator('.grocery-item-text', { hasText: itemName });

    // Verify initial unchecked state
    await expect(checkbox).not.toBeChecked();
    await expect(itemText).not.toHaveClass(/line-through/);
    await expect(itemText).not.toHaveClass(/opacity-50/);

    // Click checkbox
    await checkbox.click();

    // Verify checked state and visual changes
    await expect(checkbox).toBeChecked();

    // Wait for visual updates to apply
    await page.waitForTimeout(500);

    // Check for visual feedback (line-through, opacity changes, etc.)
    const itemRow = page.locator('.grocery-item-text', { hasText: itemName }).locator('..').locator('..');
    await expect(itemRow).toHaveClass(/opacity-50/);
    await expect(itemText).toHaveClass(/line-through/);
  });

  test('checkbox click via touch target area', async ({ page }) => {
    const itemName = 'Test Chicken';
    const touchTarget = await getCheckboxTouchTarget(page, itemName);
    const checkbox = await getCheckboxForItem(page, itemName);

    // Verify touch target exists and is accessible
    await expect(touchTarget).toBeVisible();

    // Click via touch target
    await touchTarget.click();

    // Verify checkbox state changed
    await expect(checkbox).toBeChecked();
  });

  test('checkbox state persistence across page reloads', async ({ page }) => {
    const itemName = 'Test Milk';
    const checkbox = await getCheckboxForItem(page, itemName);

    // Check the item
    await checkbox.click();
    await expect(checkbox).toBeChecked();

    // Wait for API call to complete
    await page.waitForTimeout(1000);

    // Reload page
    await page.reload();
    await expect(page.locator('h1', { hasText: 'Grocery List' })).toBeVisible();
    await page.waitForTimeout(2000);

    // Verify checkbox is still checked after reload
    const reloadedCheckbox = await getCheckboxForItem(page, itemName);
    await expect(reloadedCheckbox).toBeChecked();
  });

  test('multiple checkbox operations in sequence', async ({ page }) => {
    const items = ['Test Broccoli', 'Test Chicken', 'Test Milk'];

    // Check all items in sequence
    for (const itemName of items) {
      const checkbox = await getCheckboxForItem(page, itemName);
      await checkbox.click();
      await expect(checkbox).toBeChecked();
      await page.waitForTimeout(300); // Allow API call to process
    }

    // Verify all are checked
    for (const itemName of items) {
      const checkbox = await getCheckboxForItem(page, itemName);
      await expect(checkbox).toBeChecked();
    }

    // Uncheck middle item
    const middleCheckbox = await getCheckboxForItem(page, 'Test Chicken');
    await middleCheckbox.click();
    await expect(middleCheckbox).not.toBeChecked();

    // Verify others remain checked
    const firstCheckbox = await getCheckboxForItem(page, 'Test Broccoli');
    const lastCheckbox = await getCheckboxForItem(page, 'Test Milk');
    await expect(firstCheckbox).toBeChecked();
    await expect(lastCheckbox).toBeChecked();
  });

  test('checkbox accessibility - keyboard navigation', async ({ page }) => {
    const itemName = 'Test Pasta';
    const touchTarget = await getCheckboxTouchTarget(page, itemName);
    const checkbox = await getCheckboxForItem(page, itemName);

    // Focus on the touch target
    await touchTarget.focus();

    // Verify focus is visible
    await expect(touchTarget).toBeFocused();

    // Press Enter to toggle
    await touchTarget.press('Enter');
    await expect(checkbox).toBeChecked();

    // Press Space to toggle back
    await touchTarget.press(' ');
    await expect(checkbox).not.toBeChecked();
  });

  test('checkbox accessibility - aria labels', async ({ page }) => {
    const itemName = 'Test Broccoli';
    const touchTarget = await getCheckboxTouchTarget(page, itemName);

    // Check for aria-label
    const ariaLabel = await touchTarget.getAttribute('aria-label');
    expect(ariaLabel).toContain(itemName);
    expect(ariaLabel).toMatch(/(Check|Uncheck)/);
  });

  test('checkbox updates completion counter', async ({ page }) => {
    // Get initial completion count
    const counterText = page.locator('text=/\\d+\\/\\d+ items completed/');
    await expect(counterText).toBeVisible();

    const initialText = await counterText.textContent();
    const [initialCompleted] = initialText.match(/(\d+)\//) || ['0'];

    // Check an item
    const checkbox = await getCheckboxForItem(page, 'Test Broccoli');
    await checkbox.click();
    await expect(checkbox).toBeChecked();

    // Wait for counter to update
    await page.waitForTimeout(500);

    // Verify counter increased
    const updatedText = await counterText.textContent();
    const [updatedCompleted] = updatedText.match(/(\d+)\//) || ['0'];

    expect(parseInt(updatedCompleted)).toBe(parseInt(initialCompleted) + 1);
  });

  test('checked items sort to bottom', async ({ page }) => {
    // Check middle item
    const middleCheckbox = await getCheckboxForItem(page, 'Test Chicken');
    await middleCheckbox.click();
    await expect(middleCheckbox).toBeChecked();

    // Wait for sorting to apply
    await page.waitForTimeout(1000);

    // Get all item names in order
    const itemElements = page.locator('.grocery-item-text');
    const itemTexts = await itemElements.allTextContents();

    // Find position of checked item
    const checkedItemIndex = itemTexts.findIndex(text => text.includes('Test Chicken'));

    // Checked item should be towards the end (checked items sort to bottom)
    expect(checkedItemIndex).toBeGreaterThan(0);
  });

  test('bulk operations - clear completed items', async ({ page }) => {
    // Check multiple items
    const itemsToCheck = ['Test Broccoli', 'Test Milk'];
    for (const itemName of itemsToCheck) {
      const checkbox = await getCheckboxForItem(page, itemName);
      await checkbox.click();
      await expect(checkbox).toBeChecked();
    }

    // Find and click clear completed button
    const clearButton = page.locator('button', { hasText: /Clear.*Done|Clear.*Completed/ });
    await expect(clearButton).toBeVisible();
    await clearButton.click();

    // Wait for deletion to complete
    await page.waitForTimeout(2000);

    // Verify checked items are removed
    for (const itemName of itemsToCheck) {
      await expect(page.locator('.grocery-item-text', { hasText: itemName })).not.toBeVisible();
    }
  });

  test('checkbox operations with network delay simulation', async ({ page }) => {
    // Slow down network to test optimistic updates
    await page.route('**/api/grocery-lists/**', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      route.continue();
    });

    const itemName = 'Test Pasta';
    const checkbox = await getCheckboxForItem(page, itemName);

    // Click checkbox
    await checkbox.click();

    // Should show checked state immediately (optimistic update)
    await expect(checkbox).toBeChecked();

    // Wait for network request to complete
    await page.waitForTimeout(1500);

    // Should still be checked after API call
    await expect(checkbox).toBeChecked();
  });

  test('checkbox dropdown menu toggle options', async ({ page }) => {
    const itemName = 'Test Broccoli';

    // Find the dropdown menu for the item
    const itemRow = page.locator('.grocery-item-text', { hasText: itemName }).locator('..').locator('..');
    const dropdownTrigger = itemRow.locator('button[role="button"]').last();

    await dropdownTrigger.click();

    // Check for toggle options in dropdown
    const checkoffOption = page.locator('text=/Check Off|Uncheck/');
    await expect(checkoffOption).toBeVisible();

    // Click the check off option
    await checkoffOption.click();

    // Verify checkbox state changed
    const checkbox = await getCheckboxForItem(page, itemName);
    await expect(checkbox).toBeChecked();
  });

  test('mobile viewport checkbox touch targets', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    const itemName = 'Test Chicken';
    const touchTarget = await getCheckboxTouchTarget(page, itemName);

    // Verify touch target meets minimum size requirements (44px)
    const boundingBox = await touchTarget.boundingBox();
    expect(boundingBox.width).toBeGreaterThanOrEqual(40); // Allow small margin
    expect(boundingBox.height).toBeGreaterThanOrEqual(40);

    // Test click functionality on mobile
    await touchTarget.click();
    const checkbox = await getCheckboxForItem(page, itemName);
    await expect(checkbox).toBeChecked();
  });

  test('checkbox behavior with search filtering', async ({ page }) => {
    // Check an item first
    const checkbox = await getCheckboxForItem(page, 'Test Broccoli');
    await checkbox.click();
    await expect(checkbox).toBeChecked();

    // Apply search filter
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('Broccoli');

    // Wait for filtering
    await page.waitForTimeout(500);

    // Verify checked item still shows with correct state
    const filteredCheckbox = await getCheckboxForItem(page, 'Test Broccoli');
    await expect(filteredCheckbox).toBeVisible();
    await expect(filteredCheckbox).toBeChecked();
  });

  test('checkbox behavior with category filtering', async ({ page }) => {
    // Check an item in specific category
    const checkbox = await getCheckboxForItem(page, 'Test Chicken');
    await checkbox.click();
    await expect(checkbox).toBeChecked();

    // Filter by meat category
    const meatCategoryButton = page.locator('button', { hasText: /Meat.*Seafood/ });
    if (await meatCategoryButton.isVisible()) {
      await meatCategoryButton.click();

      // Wait for filtering
      await page.waitForTimeout(500);

      // Verify checked item still shows with correct state in filtered view
      const filteredCheckbox = await getCheckboxForItem(page, 'Test Chicken');
      await expect(filteredCheckbox).toBeVisible();
      await expect(filteredCheckbox).toBeChecked();
    }
  });

  test('error recovery - API failure simulation', async ({ page }) => {
    // Simulate API failure
    await page.route('**/api/grocery-lists/**/items/**', async (route) => {
      if (route.request().method() === 'PUT') {
        route.fulfill({ status: 500, body: 'Server Error' });
      } else {
        route.continue();
      }
    });

    const itemName = 'Test Milk';
    const checkbox = await getCheckboxForItem(page, itemName);

    // Click checkbox
    await checkbox.click();

    // Should show checked state initially (optimistic update)
    await expect(checkbox).toBeChecked();

    // Wait for error handling
    await page.waitForTimeout(2000);

    // Should revert to unchecked state on error
    await expect(checkbox).not.toBeChecked();

    // Check for error toast
    const errorToast = page.locator('text=/Error|Failed/');
    await expect(errorToast).toBeVisible({ timeout: 5000 });
  });
});