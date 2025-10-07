/**
 * Debug test for Grocery List Feature
 * Used to understand the DOM structure and fix locators
 */

import { test, expect, Page } from '@playwright/test';

const CUSTOMER_CREDENTIALS = {
  email: 'customer.test@evofitmeals.com',
  password: 'TestCustomer123!'
};

async function loginAsCustomer(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', CUSTOMER_CREDENTIALS.email);
  await page.fill('input[type="password"]', CUSTOMER_CREDENTIALS.password);
  await page.click('button[type="submit"]');
  await expect(page.locator('span', { hasText: 'Meal Plans' }).first()).toBeVisible({ timeout: 10000 });
}

test('Debug grocery list DOM structure', async ({ page }) => {
  await loginAsCustomer(page);

  // Navigate to grocery list
  await page.goto('/grocery-list');
  await expect(page.locator('h1', { hasText: 'Grocery List' })).toBeVisible();

  // Take a screenshot
  await page.screenshot({ path: 'grocery-list-debug.png', fullPage: true });

  // Print page content for debugging
  const content = await page.content();
  console.log('Page title:', await page.title());
  console.log('Current URL:', page.url());

  // Check what elements are available
  const buttons = await page.locator('button').all();
  console.log('Number of buttons found:', buttons.length);

  // Look for specific elements
  const addItemBtn = page.locator('button', { hasText: 'Add Item' });
  console.log('Add Item button visible:', await addItemBtn.isVisible());

  const searchInput = page.locator('input[placeholder*="Search"]');
  console.log('Search input visible:', await searchInput.isVisible());

  // Check for lucide icons
  const gridIcon = page.locator('[data-lucide="grid"]');
  const listIcon = page.locator('[data-lucide="list"]');
  console.log('Grid icon count:', await gridIcon.count());
  console.log('List icon count:', await listIcon.count());

  // Check for view mode toggle button
  const viewToggleButtons = page.locator('button').filter({ has: page.locator('svg') });
  console.log('SVG buttons count:', await viewToggleButtons.count());

  // Check grocery items
  const groceryItems = page.locator('.grocery-item-text');
  console.log('Grocery items found:', await groceryItems.count());

  if (await groceryItems.count() > 0) {
    const firstItemText = await groceryItems.first().textContent();
    console.log('First item text:', firstItemText);
  }

  // Check for category sections
  const categoryHeaders = page.locator('text=Meat & Seafood');
  console.log('Meat & Seafood headers:', await categoryHeaders.count());

  // Test adding an item to see validation
  const addButton = page.locator('button', { hasText: 'Add Item' });
  await addButton.click();

  // Wait for form to appear and then click Add Item in the form without filling name
  await page.waitForSelector('input[placeholder*="Item name"]');
  const addFormButton = page.locator('button', { hasText: 'Add Item' }).last(); // Get the form button, not header button
  await addFormButton.click();

  // Check for error messages
  const errorMessages = page.locator('[role="alert"], .error');
  console.log('Error messages count:', await errorMessages.count());

  // Look for specific error text
  const requiredError = page.locator('text="Item name is required"');
  console.log('Required error visible:', await requiredError.isVisible());

  // Wait a bit for any async validation
  await page.waitForTimeout(2000);

  // Check toast messages with different selectors
  const toastMessages = page.locator('[data-sonner-toaster]');
  console.log('Toast messages count:', await toastMessages.count());

  const toastNotification = page.locator('.toast, [role="status"], [data-testid="toast"]');
  console.log('Toast notification count:', await toastNotification.count());

  // Check for any alert or error text anywhere on page
  const bodyText = await page.locator('body').textContent();
  console.log('Page contains "required" text:', bodyText?.includes('required'));
  console.log('Page contains "Error" text:', bodyText?.includes('Error'));

  // Check all text content to understand structure
  const allText = await page.locator('body').textContent();
  console.log('Page contains "View Mode":', allText?.includes('View Mode'));
  console.log('Page contains "Add Item":', allText?.includes('Add Item'));
  console.log('Page contains sample items:', allText?.includes('Chicken') || allText?.includes('Broccoli'));
});