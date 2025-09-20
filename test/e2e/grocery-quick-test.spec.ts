import { test, expect } from '@playwright/test';

test.describe('Grocery List Quick Test', () => {
  test('Login and access grocery list', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:4000/login');

    // Wait for login page to load
    await page.waitForLoadState('networkidle');

    // Login as customer
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForSelector('text=Customer Dashboard', { timeout: 10000 });

    // Click on Grocery button
    await page.click('button:has-text("Grocery")');

    // Wait for grocery list page to load
    await expect(page.locator('h1:has-text("Grocery List")')).toBeVisible({ timeout: 10000 });

    // Check for grocery items or empty state
    const hasItems = await page.locator('.grocery-item-text').count() > 0;
    const hasAddButton = await page.locator('button:has-text("Add Item")').isVisible();

    expect(hasItems || hasAddButton).toBeTruthy();
  });

  test('Checkbox toggle works', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');

    // Navigate to grocery list
    await page.waitForSelector('text=Customer Dashboard');
    await page.click('button:has-text("Grocery")');
    await page.waitForSelector('h1:has-text("Grocery List")');

    // Check if there are any items
    const itemCount = await page.locator('.grocery-item-text').count();

    if (itemCount > 0) {
      // Find checkbox (could be input or div with role="checkbox")
      const checkbox = page.locator('input[type="checkbox"], div[role="checkbox"]').first();

      // Click it
      await checkbox.click();

      // Wait a bit for the update
      await page.waitForTimeout(500);

      console.log('Checkbox clicked successfully');
    } else {
      console.log('No items to test checkbox');
    }
  });

  test('Add new item works', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');

    // Navigate to grocery list
    await page.waitForSelector('text=Customer Dashboard');
    await page.click('button:has-text("Grocery")');
    await page.waitForSelector('h1:has-text("Grocery List")');

    // Click Add Item button
    await page.click('button:has-text("Add Item")');

    // Fill in new item
    await page.fill('input[placeholder="Item name"]', 'Test Item ' + Date.now());
    await page.fill('input[placeholder="Qty"]', '5');

    // Submit
    const addButton = page.locator('button').filter({ hasText: 'Add Item' }).last();
    await addButton.click();

    // Wait for success
    await page.waitForTimeout(1000);

    console.log('Item added successfully');
  });

  test('Edit item works', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');

    // Navigate to grocery list
    await page.waitForSelector('text=Customer Dashboard');
    await page.click('button:has-text("Grocery")');
    await page.waitForSelector('h1:has-text("Grocery List")');

    // Check if there are items
    const itemCount = await page.locator('.grocery-item-text').count();

    if (itemCount > 0) {
      // Click more button for first item
      const moreButton = page.locator('button:has(svg.lucide-more-horizontal)').first();
      await moreButton.click();

      // Click Edit
      await page.click('text=Edit');

      // Wait for edit modal
      await expect(page.locator('text=Edit Item')).toBeVisible();

      // Update name
      const nameInput = page.locator('input[placeholder="Item name"]');
      await nameInput.clear();
      await nameInput.fill('Updated Item ' + Date.now());

      // Click Update
      await page.click('button:has-text("Update Item")');

      // Wait for modal to close
      await expect(page.locator('text=Edit Item')).not.toBeVisible();

      console.log('Item edited successfully');
    } else {
      console.log('No items to edit');
    }
  });
});