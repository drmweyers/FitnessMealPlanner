import { test, expect } from '@playwright/test';

test('Test Add Item functionality', async ({ page }) => {
  // Login
  await page.goto('http://localhost:4000/login');
  await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
  await page.fill('input[type="password"]', 'TestCustomer123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  // Go to grocery list
  await page.goto('http://localhost:4000/customer/grocery-list');
  await page.waitForTimeout(2000);

  // Count initial items
  const initialItems = page.locator('.grocery-item-text, [class*="item-text"], button[role="checkbox"]');
  const initialCount = await initialItems.count();
  console.log('Initial item count:', initialCount);

  // Click Add Item button
  const addButton = page.locator('button:has-text("Add Item")');
  await addButton.click();
  console.log('Clicked Add Item button');
  await page.waitForTimeout(1000);

  // Fill the form
  const testItemName = `Test Item ${Date.now()}`;
  const nameInput = page.locator('input[placeholder*="name" i], input[placeholder*="item" i]').first();
  await nameInput.fill(testItemName);
  console.log('Filled item name:', testItemName);

  const qtyInput = page.locator('input[placeholder*="qty" i], input[placeholder*="quantity" i], input[type="number"]').first();
  if (await qtyInput.isVisible()) {
    await qtyInput.fill('5');
    console.log('Filled quantity: 5');
  }

  // Select category if visible
  const categorySelect = page.locator('select').first();
  if (await categorySelect.isVisible()) {
    await categorySelect.selectOption({ index: 0 });
    console.log('Selected first category');
  }

  // Submit the form
  const submitButton = page.locator('button').filter({ hasText: /add item|save|submit/i }).last();
  await submitButton.click();
  console.log('Clicked submit button');

  // Wait for item to appear
  await page.waitForTimeout(3000);

  // Check if item was added
  const newItem = page.locator(`text="${testItemName}"`);
  const itemExists = await newItem.count() > 0;

  if (itemExists) {
    console.log('✅ ITEM ADDED SUCCESSFULLY!');
    console.log('Item is visible in the list');

    // Verify it's in the database by refreshing
    await page.reload();
    await page.waitForTimeout(2000);

    const itemAfterRefresh = page.locator(`text="${testItemName}"`);
    const stillExists = await itemAfterRefresh.count() > 0;

    if (stillExists) {
      console.log('✅ ITEM PERSISTED IN DATABASE!');
    } else {
      console.log('❌ Item disappeared after refresh');
    }
  } else {
    console.log('❌ ITEM WAS NOT ADDED');
    
    // Check for errors
    const errorMsg = page.locator('.error, .toast, [role="alert"]');
    if (await errorMsg.count() > 0) {
      const error = await errorMsg.first().textContent();
      console.log('Error message:', error);
    }

    // Count final items to see if count changed
    const finalItems = page.locator('.grocery-item-text, [class*="item-text"], button[role="checkbox"]');
    const finalCount = await finalItems.count();
    console.log('Final item count:', finalCount);
    
    if (finalCount > initialCount) {
      console.log('Item count increased but item text not found');
    }
  }
});
