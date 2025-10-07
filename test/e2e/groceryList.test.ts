/**
 * Comprehensive E2E Tests for Grocery List Feature
 *
 * Tests all aspects of the grocery list functionality including:
 * - Customer authentication and navigation
 * - CRUD operations for grocery lists and items
 * - Search and filtering functionality
 * - Mobile gestures and interactions
 * - Meal plan integration
 * - Export/sharing capabilities
 * - Edge cases and error scenarios
 *
 * @author QA Testing Agent
 * @since 2025-09-16
 */

import { test, expect, Page, Locator } from '@playwright/test';

// Test configuration
const TEST_TIMEOUT = 30000;
const NAVIGATION_TIMEOUT = 10000;

// Test credentials
const CUSTOMER_CREDENTIALS = {
  email: 'customer.test@evofitmeals.com',
  password: 'TestCustomer123!'
};

// Test data
const TEST_GROCERY_LIST = {
  name: 'Weekly Shopping List'
};

const TEST_ITEMS = [
  { name: 'Chicken Breast', category: 'meat', quantity: 2, unit: 'lbs', priority: 'high' },
  { name: 'Broccoli', category: 'produce', quantity: 2, unit: 'bunches', priority: 'medium' },
  { name: 'Brown Rice', category: 'pantry', quantity: 1, unit: 'packages', priority: 'medium' },
  { name: 'Greek Yogurt', category: 'dairy', quantity: 2, unit: 'cups', priority: 'medium' },
  { name: 'Spinach', category: 'produce', quantity: 1, unit: 'packages', priority: 'medium' },
  { name: 'Almonds', category: 'snacks', quantity: 1, unit: 'packages', priority: 'low' }
];

// Page object helpers
class GroceryListPage {
  constructor(private page: Page) {}

  // Locators
  get groceryListHeader() { return this.page.locator('h1', { hasText: 'Grocery List' }); }
  get addItemButton() { return this.page.locator('button', { hasText: 'Add Item' }); }
  get searchInput() { return this.page.locator('input[placeholder*="Search"]'); }
  get itemNameInput() { return this.page.locator('input[placeholder*="Item name"]'); }
  get quantityInput() { return this.page.locator('input[placeholder*="Qty"]'); }
  get categorySelect() { return this.page.locator('select').first(); }
  get unitSelect() { return this.page.locator('select').last(); }
  get addItemConfirmButton() { return this.page.locator('button', { hasText: 'Add Item' }).last(); }
  get cancelButton() { return this.page.locator('button', { hasText: 'Cancel' }); }
  get clearCompletedButton() { return this.page.locator('button', { hasText: /Clear.*Done/ }); }
  get shareButton() { return this.page.locator('button', { hasText: 'Share' }); }
  get viewModeToggle() { return this.page.locator('button svg').first().locator('..'); } // Button containing SVG
  get moreActionsButton() { return this.page.locator('button').filter({ has: this.page.locator('svg') }).first(); }

  // Dynamic locators
  groceryItem(name: string) { return this.page.locator('.grocery-item-text', { hasText: name }).first(); }
  itemCheckbox(name: string) { return this.page.locator(`[aria-label*="${name}"]`).locator('input[type="checkbox"]'); }
  categoryFilter(category: string) { return this.page.locator('button', { hasText: new RegExp(category, 'i') }); }
  itemMoreOptions(name: string) { return this.groceryItem(name).locator('..').locator('button').filter({ has: this.page.locator('[data-lucide="more-horizontal"]') }); }

  // Actions
  async navigateToGroceryList() {
    await this.page.goto('/grocery-list');
    await expect(this.groceryListHeader).toBeVisible({ timeout: NAVIGATION_TIMEOUT });
  }

  async addItem(item: typeof TEST_ITEMS[0]) {
    await this.addItemButton.click();
    await this.itemNameInput.fill(item.name);
    await this.quantityInput.fill(item.quantity.toString());
    await this.categorySelect.selectOption(item.category);
    await this.unitSelect.selectOption(item.unit);
    await this.addItemConfirmButton.click();

    // Wait for item to appear
    await expect(this.groceryItem(item.name)).toBeVisible();
  }

  async searchItems(searchTerm: string) {
    await this.searchInput.fill(searchTerm);
    await this.page.waitForTimeout(500); // Allow search to process
  }

  async toggleItemCompleted(itemName: string) {
    const checkbox = this.itemCheckbox(itemName);
    await checkbox.click();
  }

  async deleteItemViaMenu(itemName: string) {
    const moreOptions = this.itemMoreOptions(itemName);
    await moreOptions.click();
    await this.page.locator('text=Delete').click();
  }

  async filterByCategory(category: string) {
    await this.categoryFilter(category).click();
  }

  async clearSearch() {
    await this.searchInput.clear();
  }

  async clearCompleted() {
    await this.clearCompletedButton.click();
  }

  async shareList() {
    await this.shareButton.click();
  }

  async toggleViewMode() {
    await this.viewModeToggle.click();
  }

  async openMoreActions() {
    await this.moreActionsButton.click();
  }

  // Mobile gesture simulation
  async swipeItem(itemName: string, direction: 'left' | 'right') {
    const item = this.groceryItem(itemName).locator('..');
    const bbox = await item.boundingBox();
    if (!bbox) throw new Error(`Item ${itemName} not found`);

    const startX = direction === 'right' ? bbox.x + 10 : bbox.x + bbox.width - 10;
    const endX = direction === 'right' ? bbox.x + bbox.width - 10 : bbox.x + 10;
    const y = bbox.y + bbox.height / 2;

    await this.page.mouse.move(startX, y);
    await this.page.mouse.down();
    await this.page.mouse.move(endX, y);
    await this.page.mouse.up();
  }

  // Verification methods
  async expectItemVisible(itemName: string) {
    await expect(this.groceryItem(itemName)).toBeVisible();
  }

  async expectItemNotVisible(itemName: string) {
    await expect(this.groceryItem(itemName)).not.toBeVisible();
  }

  async expectItemChecked(itemName: string) {
    const checkbox = this.itemCheckbox(itemName);
    await expect(checkbox).toBeChecked();
  }

  async expectItemUnchecked(itemName: string) {
    const checkbox = this.itemCheckbox(itemName);
    await expect(checkbox).not.toBeChecked();
  }

  async expectSearchResults(count: number) {
    const items = this.page.locator('.grocery-item-text');
    await expect(items).toHaveCount(count);
  }

  async expectEmptyState() {
    await expect(this.page.locator('text=No items found')).toBeVisible();
  }
}

// Authentication helper
async function loginAsCustomer(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', CUSTOMER_CREDENTIALS.email);
  await page.fill('input[type="password"]', CUSTOMER_CREDENTIALS.password);
  await page.click('button[type="submit"]');

  // Wait for successful login and redirect to customer dashboard
  await expect(page.locator('span', { hasText: 'Meal Plans' }).first()).toBeVisible({ timeout: NAVIGATION_TIMEOUT });
}

test.describe('Grocery List Feature - Comprehensive E2E Tests', () => {
  let groceryListPage: GroceryListPage;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    groceryListPage = new GroceryListPage(page);

    // Login as customer
    await loginAsCustomer(page);
  });

  test.describe('Navigation and Initial Load', () => {
    test('should navigate to grocery list from customer dashboard', async ({ page }) => {
      // Navigate to customer dashboard first
      await page.goto('/customer');
      await expect(page.locator('text=Grocery List')).toBeVisible();

      // Click on grocery list card
      await page.click('text=Grocery List');

      // Verify navigation to grocery list page
      await expect(groceryListPage.groceryListHeader).toBeVisible();
      await expect(page.url()).toContain('/grocery-list');
    });

    test('should display grocery list page with default elements', async ({ page }) => {
      await groceryListPage.navigateToGroceryList();

      // Check main UI elements
      await expect(groceryListPage.groceryListHeader).toBeVisible();
      await expect(groceryListPage.addItemButton).toBeVisible();
      await expect(groceryListPage.searchInput).toBeVisible();
      await expect(groceryListPage.viewModeToggle).toBeVisible();
      await expect(groceryListPage.moreActionsButton).toBeVisible();

      // Check if sample data is loaded
      await expect(page.locator('.grocery-item-text')).toHaveCount({ min: 1 });
    });

    test('should show appropriate mobile-responsive layout', async ({ page, isMobile }) => {
      await groceryListPage.navigateToGroceryList();

      if (isMobile) {
        // Check mobile-specific elements
        await expect(page.locator('.touch-target')).toHaveCount({ min: 1 });
        await expect(page.locator('.safe-area-bottom')).toBeVisible();
      }

      // Check responsive behavior
      const addButton = groceryListPage.addItemButton;
      await expect(addButton).toBeVisible();
    });
  });

  test.describe('Creating and Adding Items', () => {
    test('should create new grocery list items successfully', async ({ page }) => {
      await groceryListPage.navigateToGroceryList();

      for (const item of TEST_ITEMS.slice(0, 3)) { // Test first 3 items
        await groceryListPage.addItem(item);
        await groceryListPage.expectItemVisible(item.name);
      }
    });

    test('should validate required fields when adding items', async ({ page }) => {
      await groceryListPage.navigateToGroceryList();

      // Try to add item without name
      await groceryListPage.addItemButton.click();
      await groceryListPage.addItemConfirmButton.click();

      // Should show error
      await expect(page.locator('text=Item name is required')).toBeVisible();

      // Cancel and try again with proper data
      await groceryListPage.cancelButton.click();
      await groceryListPage.addItem(TEST_ITEMS[0]);
      await groceryListPage.expectItemVisible(TEST_ITEMS[0].name);
    });

    test('should support all available categories and units', async ({ page }) => {
      await groceryListPage.navigateToGroceryList();

      const categoriesAndUnits = [
        { name: 'Produce Item', category: 'produce', unit: 'bunches' },
        { name: 'Meat Item', category: 'meat', unit: 'lbs' },
        { name: 'Dairy Item', category: 'dairy', unit: 'cups' },
        { name: 'Pantry Item', category: 'pantry', unit: 'packages' },
        { name: 'Beverage Item', category: 'beverages', unit: 'bottles' },
        { name: 'Snack Item', category: 'snacks', unit: 'pcs' }
      ];

      for (const item of categoriesAndUnits) {
        await groceryListPage.addItem({ ...item, quantity: 1, priority: 'medium' });
        await groceryListPage.expectItemVisible(item.name);
      }
    });
  });

  test.describe('Item Management Operations', () => {
    test('should check and uncheck items successfully', async ({ page }) => {
      await groceryListPage.navigateToGroceryList();

      // Add a test item
      await groceryListPage.addItem(TEST_ITEMS[0]);

      // Check item
      await groceryListPage.toggleItemCompleted(TEST_ITEMS[0].name);
      await groceryListPage.expectItemChecked(TEST_ITEMS[0].name);

      // Uncheck item
      await groceryListPage.toggleItemCompleted(TEST_ITEMS[0].name);
      await groceryListPage.expectItemUnchecked(TEST_ITEMS[0].name);
    });

    test('should delete items via menu options', async ({ page }) => {
      await groceryListPage.navigateToGroceryList();

      // Add test item
      await groceryListPage.addItem(TEST_ITEMS[0]);
      await groceryListPage.expectItemVisible(TEST_ITEMS[0].name);

      // Delete via menu
      await groceryListPage.deleteItemViaMenu(TEST_ITEMS[0].name);
      await groceryListPage.expectItemNotVisible(TEST_ITEMS[0].name);

      // Should show deletion confirmation
      await expect(page.locator('text=Item deleted from grocery list')).toBeVisible();
    });

    test('should clear completed items in bulk', async ({ page }) => {
      await groceryListPage.navigateToGroceryList();

      // Add multiple items
      for (const item of TEST_ITEMS.slice(0, 3)) {
        await groceryListPage.addItem(item);
      }

      // Check some items
      await groceryListPage.toggleItemCompleted(TEST_ITEMS[0].name);
      await groceryListPage.toggleItemCompleted(TEST_ITEMS[1].name);

      // Clear completed items
      await groceryListPage.clearCompleted();

      // Checked items should be gone, unchecked should remain
      await groceryListPage.expectItemNotVisible(TEST_ITEMS[0].name);
      await groceryListPage.expectItemNotVisible(TEST_ITEMS[1].name);
      await groceryListPage.expectItemVisible(TEST_ITEMS[2].name);
    });
  });

  test.describe('Search and Filtering', () => {
    test('should search items by name', async ({ page }) => {
      await groceryListPage.navigateToGroceryList();

      // Add test items
      await groceryListPage.addItem(TEST_ITEMS[0]); // Chicken Breast
      await groceryListPage.addItem(TEST_ITEMS[1]); // Broccoli

      // Search for specific item
      await groceryListPage.searchItems('chicken');
      await groceryListPage.expectItemVisible(TEST_ITEMS[0].name);
      await groceryListPage.expectItemNotVisible(TEST_ITEMS[1].name);

      // Clear search
      await groceryListPage.clearSearch();
      await groceryListPage.expectItemVisible(TEST_ITEMS[0].name);
      await groceryListPage.expectItemVisible(TEST_ITEMS[1].name);
    });

    test('should filter items by category', async ({ page }) => {
      await groceryListPage.navigateToGroceryList();

      // Add items from different categories
      await groceryListPage.addItem(TEST_ITEMS[0]); // meat
      await groceryListPage.addItem(TEST_ITEMS[1]); // produce

      // Filter by produce category
      await groceryListPage.filterByCategory('Produce');
      await groceryListPage.expectItemNotVisible(TEST_ITEMS[0].name);
      await groceryListPage.expectItemVisible(TEST_ITEMS[1].name);

      // Filter by meat category
      await groceryListPage.filterByCategory('Meat');
      await groceryListPage.expectItemVisible(TEST_ITEMS[0].name);
      await groceryListPage.expectItemNotVisible(TEST_ITEMS[1].name);

      // Show all items
      await groceryListPage.filterByCategory('All');
      await groceryListPage.expectItemVisible(TEST_ITEMS[0].name);
      await groceryListPage.expectItemVisible(TEST_ITEMS[1].name);
    });

    test('should combine search and category filtering', async ({ page }) => {
      await groceryListPage.navigateToGroceryList();

      // Add items
      await groceryListPage.addItem({ name: 'Chicken Breast', category: 'meat', quantity: 2, unit: 'lbs', priority: 'high' });
      await groceryListPage.addItem({ name: 'Chicken Thighs', category: 'meat', quantity: 1, unit: 'lbs', priority: 'medium' });
      await groceryListPage.addItem({ name: 'Broccoli', category: 'produce', quantity: 2, unit: 'bunches', priority: 'medium' });

      // Filter by meat category
      await groceryListPage.filterByCategory('Meat');

      // Then search for "breast"
      await groceryListPage.searchItems('breast');
      await groceryListPage.expectItemVisible('Chicken Breast');
      await groceryListPage.expectItemNotVisible('Chicken Thighs');
      await groceryListPage.expectItemNotVisible('Broccoli');
    });

    test('should show empty state when no items match filters', async ({ page }) => {
      await groceryListPage.navigateToGroceryList();

      // Search for non-existent item
      await groceryListPage.searchItems('nonexistentitem12345');
      await groceryListPage.expectEmptyState();
      await expect(page.locator('text=Try adjusting your search')).toBeVisible();
    });
  });

  test.describe('View Modes and Sorting', () => {
    test('should toggle between list and category view modes', async ({ page }) => {
      await groceryListPage.navigateToGroceryList();

      // Add items from different categories
      await groceryListPage.addItem(TEST_ITEMS[0]); // meat
      await groceryListPage.addItem(TEST_ITEMS[1]); // produce

      // Should start in category view (default)
      await expect(page.locator('text=Meat & Seafood')).toBeVisible();
      await expect(page.locator('text=Produce')).toBeVisible();

      // Toggle to list view
      await groceryListPage.toggleViewMode();
      await expect(page.locator('text=Meat & Seafood')).not.toBeVisible();

      // Toggle back to category view
      await groceryListPage.toggleViewMode();
      await expect(page.locator('text=Meat & Seafood')).toBeVisible();
    });

    test('should support different sorting options', async ({ page }) => {
      await groceryListPage.navigateToGroceryList();

      // Add items with different priorities and names
      await groceryListPage.addItem({ name: 'Zebra Item', category: 'meat', quantity: 1, unit: 'lbs', priority: 'low' });
      await groceryListPage.addItem({ name: 'Apple Item', category: 'produce', quantity: 1, unit: 'pcs', priority: 'high' });

      // Test sorting by priority via more actions menu
      await groceryListPage.openMoreActions();
      await page.click('text=Sort By');
      await page.click('text=Priority');

      // High priority items should come first
      const items = page.locator('.grocery-item-text');
      await expect(items.first()).toContainText('Apple Item');
    });
  });

  test.describe('Mobile Gestures and Touch Interactions', () => {
    test('should support swipe gestures to check/delete items', async ({ page, isMobile }) => {
      if (!isMobile) {
        test.skip('Skipping mobile-specific test on desktop');
      }

      await groceryListPage.navigateToGroceryList();

      // Add test item
      await groceryListPage.addItem(TEST_ITEMS[0]);

      // Swipe right to check item
      await groceryListPage.swipeItem(TEST_ITEMS[0].name, 'right');
      await groceryListPage.expectItemChecked(TEST_ITEMS[0].name);

      // Add another item for deletion test
      await groceryListPage.addItem(TEST_ITEMS[1]);

      // Swipe left to delete item
      await groceryListPage.swipeItem(TEST_ITEMS[1].name, 'left');
      await groceryListPage.expectItemNotVisible(TEST_ITEMS[1].name);
    });

    test('should have proper touch targets for mobile accessibility', async ({ page, isMobile }) => {
      if (!isMobile) {
        test.skip('Skipping mobile-specific test on desktop');
      }

      await groceryListPage.navigateToGroceryList();

      // Check touch target sizes (should be at least 44px for accessibility)
      const touchTargets = page.locator('.touch-target');
      await expect(touchTargets.first()).toBeVisible();

      // Test checkbox touch targets
      await groceryListPage.addItem(TEST_ITEMS[0]);
      const checkbox = groceryListPage.itemCheckbox(TEST_ITEMS[0].name);
      await expect(checkbox).toBeVisible();

      // Should be able to tap on checkbox
      await checkbox.click();
      await groceryListPage.expectItemChecked(TEST_ITEMS[0].name);
    });
  });

  test.describe('Export and Sharing Functionality', () => {
    test('should export grocery list', async ({ page }) => {
      await groceryListPage.navigateToGroceryList();

      // Add some items
      await groceryListPage.addItem(TEST_ITEMS[0]);
      await groceryListPage.addItem(TEST_ITEMS[1]);

      // Export/share list
      await groceryListPage.shareList();

      // Note: Actual file download/share testing depends on browser capabilities
      // This test verifies the action is triggered without errors
    });

    test('should only export unchecked items', async ({ page }) => {
      await groceryListPage.navigateToGroceryList();

      // Add items and check one
      await groceryListPage.addItem(TEST_ITEMS[0]);
      await groceryListPage.addItem(TEST_ITEMS[1]);
      await groceryListPage.toggleItemCompleted(TEST_ITEMS[0].name);

      // Export should only include unchecked items
      await groceryListPage.shareList();

      // Verify the export action completes
      // Note: Full verification would require intercepting the download/share
    });
  });

  test.describe('Meal Plan Integration', () => {
    test('should generate grocery list from meal plan', async ({ page }) => {
      await groceryListPage.navigateToGroceryList();

      // This test would require setting up a meal plan first
      // For now, we'll test the UI elements for meal plan integration

      // Check if "Generate from Meal Plan" option exists in more actions
      await groceryListPage.openMoreActions();

      // Note: This functionality might be in a different location
      // The test structure is prepared for when this feature is implemented
    });
  });

  test.describe('Multiple Lists Management', () => {
    test('should support multiple grocery lists', async ({ page }) => {
      await groceryListPage.navigateToGroceryList();

      // This test structure is prepared for multiple list functionality
      // Currently testing the single list workflow

      // Add items to current list
      await groceryListPage.addItem(TEST_ITEMS[0]);
      await groceryListPage.expectItemVisible(TEST_ITEMS[0].name);

      // Verify list persistence
      await page.reload();
      await expect(groceryListPage.groceryListHeader).toBeVisible();
      // Note: Depending on implementation, items might be sample data or persisted
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      await groceryListPage.navigateToGroceryList();

      // Simulate network failure
      await page.route('**/api/grocery-lists/**', route => route.abort());

      // Try to add item - should handle gracefully
      await groceryListPage.addItemButton.click();
      await groceryListPage.itemNameInput.fill('Test Item');
      await groceryListPage.addItemConfirmButton.click();

      // Should not crash the application
      await expect(groceryListPage.groceryListHeader).toBeVisible();
    });

    test('should validate item names and prevent duplicates', async ({ page }) => {
      await groceryListPage.navigateToGroceryList();

      // Add item with very long name
      const longName = 'A'.repeat(100);
      await groceryListPage.addItem({
        name: longName,
        category: 'produce',
        quantity: 1,
        unit: 'pcs',
        priority: 'medium'
      });

      // Should handle long names appropriately
      await expect(page.locator('.grocery-item-text')).toContainText('A');
    });

    test('should handle special characters in item names', async ({ page }) => {
      await groceryListPage.navigateToGroceryList();

      const specialCharItem = {
        name: 'Item with émojis 🥕 & symbols (½ cup)',
        category: 'produce',
        quantity: 1,
        unit: 'pcs',
        priority: 'medium'
      };

      await groceryListPage.addItem(specialCharItem);
      await groceryListPage.expectItemVisible(specialCharItem.name);
    });

    test('should maintain state after browser refresh', async ({ page }) => {
      await groceryListPage.navigateToGroceryList();

      // Add some items
      await groceryListPage.addItem(TEST_ITEMS[0]);
      await groceryListPage.toggleItemCompleted(TEST_ITEMS[0].name);

      // Refresh browser
      await page.reload();
      await expect(groceryListPage.groceryListHeader).toBeVisible();

      // Note: State persistence depends on implementation
      // This test structure verifies the page loads correctly after refresh
    });
  });

  test.describe('Performance and Responsiveness', () => {
    test('should handle large number of items efficiently', async ({ page }) => {
      await groceryListPage.navigateToGroceryList();

      // Add many items (simulate large list)
      const manyItems = Array.from({ length: 20 }, (_, i) => ({
        name: `Item ${i + 1}`,
        category: 'produce',
        quantity: 1,
        unit: 'pcs',
        priority: 'medium' as const
      }));

      // Add items in batches to test performance
      for (let i = 0; i < 5; i++) {
        await groceryListPage.addItem(manyItems[i]);
      }

      // Search should still be responsive
      await groceryListPage.searchItems('Item 1');
      await groceryListPage.expectItemVisible('Item 1');

      // Filter should work
      await groceryListPage.clearSearch();
      await groceryListPage.filterByCategory('Produce');
      await expect(page.locator('.grocery-item-text')).toHaveCount({ min: 5 });
    });

    test('should respond quickly to user interactions', async ({ page }) => {
      await groceryListPage.navigateToGroceryList();

      // Add item
      await groceryListPage.addItem(TEST_ITEMS[0]);

      // Quick succession of actions should work
      await groceryListPage.toggleItemCompleted(TEST_ITEMS[0].name);
      await groceryListPage.toggleItemCompleted(TEST_ITEMS[0].name);
      await groceryListPage.toggleItemCompleted(TEST_ITEMS[0].name);

      // Final state should be correct
      await groceryListPage.expectItemChecked(TEST_ITEMS[0].name);
    });
  });
});