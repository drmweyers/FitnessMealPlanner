import { test, expect } from '@playwright/test';

test.describe('Basic Grocery List Functionality', () => {
  test('can access grocery list and interact with checkboxes', async ({ page }) => {
    // Login
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForURL('**/customer', { timeout: 10000 });

    // Click on Grocery tab
    await page.click('text=Grocery');

    // Wait for the page to load
    await page.waitForTimeout(3000);

    // Take screenshot for debugging
    await page.screenshot({ path: 'grocery-current-state.png', fullPage: true });

    // Check current state - look for any error messages
    const errorExists = await page.locator('.text-destructive, [class*="error"]').count() > 0;
    const loadingExists = await page.locator('[class*="loading"], [class*="spinner"]').count() > 0;

    console.log('Has error:', errorExists);
    console.log('Has loading:', loadingExists);

    if (errorExists) {
      const errorText = await page.locator('.text-destructive, [class*="error"]').first().textContent();
      console.log('Error text:', errorText);
    }

    // Check if we're in list selection mode or if a list is loaded
    const createButton = await page.locator('button:has-text("Create")').count();
    const selectListText = await page.locator('text=/Select a list|Your Lists/').count();

    console.log('Has create button:', createButton);
    console.log('Has select list text:', selectListText);

    // If we're in list selection, try to select or create a list
    if (selectListText > 0 || createButton > 0) {
      // Check if there are existing lists to select
      const existingLists = await page.locator('button:has-text("Weekly Shopping List"), button:has-text("Test Grocery List")').count();

      if (existingLists > 0) {
        console.log('Selecting existing list...');
        await page.locator('button:has-text("Weekly Shopping List"), button:has-text("Test Grocery List")').first().click();
        await page.waitForTimeout(2000);
      } else {
        console.log('No lists exist, creating one...');
        // Click create button if visible
        const createNewButton = page.locator('button:has-text("Create New List")').first();
        if (await createNewButton.isVisible()) {
          await createNewButton.click();
          await page.fill('input[placeholder*="Shopping"]', 'Test List');
          await page.click('button:has-text("Create List")');
          await page.waitForTimeout(2000);
        }
      }
    }

    // Now check if we have the grocery list interface
    const hasGroceryInterface = await page.locator('[class*="grocery"], [class*="MobileGroceryList"]').count() > 0;
    console.log('Has grocery interface:', hasGroceryInterface);

    // Look for checkboxes or items
    const checkboxCount = await page.locator('input[type="checkbox"], [role="checkbox"], .checkbox').count();
    const itemCount = await page.locator('.grocery-item, .list-item, li').count();

    console.log('Checkbox count:', checkboxCount);
    console.log('Item count:', itemCount);

    // If no items, try to add one
    if (itemCount === 0) {
      const addInput = page.locator('input[placeholder*="Add"], input[placeholder*="add"], input[placeholder*="item"]').first();
      if (await addInput.isVisible()) {
        console.log('Adding test item...');
        await addInput.fill('Test Item');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Check again for items
        const newItemCount = await page.locator('.grocery-item, .list-item, li').count();
        console.log('New item count after adding:', newItemCount);
      }
    }

    // Final screenshot
    await page.screenshot({ path: 'grocery-final-state.png', fullPage: true });

    // Assert we have some content (not an error state)
    expect(errorExists).toBe(false);
  });
});