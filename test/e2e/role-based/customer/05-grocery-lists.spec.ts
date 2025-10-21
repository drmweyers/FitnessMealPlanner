/**
 * Customer Grocery List Tests
 *
 * Tests customer grocery list viewing and management
 */

import { test, expect } from '@playwright/test';
import { RoleAuthHelper } from '../../utils/roleTestHelpers';
import { CustomerGroceryListPage } from '../../page-objects/customer/CustomerGroceryListPage';

test.describe('Customer Grocery Lists', () => {
  let groceryPage: CustomerGroceryListPage;

  test.beforeEach(async ({ page }) => {
    // Login as customer
    await RoleAuthHelper.loginAsCustomer(page);

    // Initialize page object
    groceryPage = new CustomerGroceryListPage(page);
    await groceryPage.navigate();
  });

  test('Customer can view grocery list page', async ({ page }) => {
    // Verify container visible
    await groceryPage.assertGroceryListContainerVisible();
  });

  test('Customer can open create list modal', async ({ page }) => {
    // Click create list
    await groceryPage.clickCreateList();

    // Modal should be visible (would need actual DOM validation)
  });

  test.skip('Customer can generate grocery list from meal plan', async ({ page }) => {
    // Skip by default - creates actual data
    await groceryPage.clickCreateList();
    await groceryPage.fillListName('Weekly Groceries');

    // Would need actual meal plan ID
    // await groceryPage.selectMealPlan('meal-plan-id');
    // await groceryPage.clickGenerateFromMealPlan();
    // await groceryPage.assertListCreated();
  });

  test.skip('Customer can check off grocery items', async ({ page }) => {
    // Skip - requires existing grocery list

    // Check off first 3 items
    await groceryPage.checkOffItem(0);
    await groceryPage.checkOffItem(1);
    await groceryPage.checkOffItem(2);

    // Verify items checked
    const checkedCount = await groceryPage.getCheckedItemCount();
    expect(checkedCount).toBe(3);
  });

  test.skip('Customer can add manual item to list', async ({ page }) => {
    // Skip - requires existing grocery list

    // Add manual item
    await groceryPage.addManualItem('Extra bananas');

    // Verify item added
    await groceryPage.assertItemVisible('Extra bananas');
  });

  test.skip('Customer can delete grocery item', async ({ page }) => {
    // Skip - requires existing grocery list

    // Get initial count
    const initialCount = await groceryPage.getItemCount();

    // Delete first item
    await groceryPage.deleteItem(0);

    // Verify count decreased
    const newCount = await groceryPage.getItemCount();
    expect(newCount).toBe(initialCount - 1);
  });
});
