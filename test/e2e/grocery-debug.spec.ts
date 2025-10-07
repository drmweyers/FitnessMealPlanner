import { test, expect, Page } from '@playwright/test';

// Configuration
const BASE_URL = 'http://localhost:4000';
const CUSTOMER_EMAIL = 'customer.test@evofitmeals.com';
const CUSTOMER_PASSWORD = 'TestCustomer123!';

async function loginAsCustomer(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  
  await page.fill('input[type="email"]', CUSTOMER_EMAIL);
  await page.fill('input[type="password"]', CUSTOMER_PASSWORD);
  await page.click('button[type="submit"]');
  
  await page.waitForURL(/dashboard|customer/i, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

async function navigateToGroceryList(page: Page) {
  // Click on the Grocery Lists menu/button
  const groceryLink = page.locator('a[href="/customer/grocery-lists"]').or(page.locator('button:has-text("Grocery Lists")')).or(page.locator('text=Grocery Lists')).first();
  if (await groceryLink.isVisible()) {
    await groceryLink.click();
  } else {
    // Try mobile menu
    const mobileMenu = page.locator('button[aria-label="Open menu"]');
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      await page.waitForTimeout(500);
      await page.click('text=Grocery Lists');
    }
  }
  
  await page.waitForURL(/grocery/i, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

test.describe('Grocery List Debug Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCustomer(page);
    await navigateToGroceryList(page);
  });

  test('1. Check page loads with items', async ({ page }) => {
    // Check if we're on the grocery list page
    const heading = page.locator('h1:has-text("Grocery"), h2:has-text("Grocery")');
    await expect(heading).toBeVisible();
    
    // Check if there are any items
    const items = page.locator('.grocery-item-text, [class*="item"], text=/eggs|milk|bread/i');
    const itemCount = await items.count();
    console.log(`Found ${itemCount} grocery items on page`);
    
    if (itemCount > 0) {
      console.log('✅ Items are visible');
      
      // Log first few items
      for (let i = 0; i < Math.min(3, itemCount); i++) {
        const itemText = await items.nth(i).textContent();
        console.log(`Item ${i + 1}: ${itemText}`);
      }
    } else {
      console.log('❌ No items found on page');
    }
  });

  test('2. Test checkbox clicking', async ({ page }) => {
    // Wait for checkboxes to be present
    await page.waitForSelector('input[type="checkbox"], [role="checkbox"]', { timeout: 5000 });
    
    const checkboxes = page.locator('input[type="checkbox"], [role="checkbox"]');
    const checkboxCount = await checkboxes.count();
    console.log(`Found ${checkboxCount} checkboxes`);
    
    if (checkboxCount > 0) {
      // Get the first checkbox
      const firstCheckbox = checkboxes.first();
      
      // Check initial state
      const wasChecked = await firstCheckbox.isChecked();
      console.log(`Initial state: ${wasChecked ? 'checked' : 'unchecked'}`);
      
      // Click it
      await firstCheckbox.click();
      await page.waitForTimeout(1000); // Wait for state to update
      
      // Check new state
      const isChecked = await firstCheckbox.isChecked();
      console.log(`After click: ${isChecked ? 'checked' : 'unchecked'}`);
      
      if (wasChecked !== isChecked) {
        console.log('✅ Checkbox toggle works!');
      } else {
        console.log('❌ Checkbox did not toggle');
      }
    }
  });

  test('3. Test add item button', async ({ page }) => {
    // Find and click Add Item button
    const addButton = page.locator('button:has-text("Add Item")');
    await expect(addButton).toBeVisible();
    
    await addButton.click();
    console.log('Clicked Add Item button');
    
    // Wait for form/modal to appear
    await page.waitForTimeout(1000);
    
    // Check if input fields are visible
    const nameInput = page.locator('input[placeholder*="Item name"], input[placeholder*="name"]').first();
    const isFormVisible = await nameInput.isVisible();
    
    if (isFormVisible) {
      console.log('✅ Add item form opened');
      
      // Fill the form
      const testItemName = `Debug Test Item ${Date.now()}`;
      await nameInput.fill(testItemName);
      
      const qtyInput = page.locator('input[placeholder*="Qty"], input[placeholder*="Quantity"], input[type="number"]').first();
      if (await qtyInput.isVisible()) {
        await qtyInput.fill('3');
      }
      
      // Submit
      const submitButton = page.locator('button').filter({ hasText: /Add Item|Save|Submit/ }).last();
      await submitButton.click();
      console.log('Submitted add item form');
      
      // Wait for item to appear
      await page.waitForTimeout(2000);
      
      // Check if item was added
      const newItem = page.locator(`text=${testItemName}`);
      if (await newItem.isVisible()) {
        console.log('✅ Item was added successfully!');
      } else {
        console.log('❌ Item was not added');
        
        // Check for errors
        const errorMsg = page.locator('.error, .toast, [role="alert"]');
        if (await errorMsg.isVisible()) {
          const error = await errorMsg.textContent();
          console.log('Error message:', error);
        }
      }
    } else {
      console.log('❌ Add item form did not open');
    }
  });

  test('4. Test edit dropdown', async ({ page }) => {
    // Find more menu buttons (three dots)
    const moreButtons = page.locator('button:has(svg[class*="more"]), button[aria-label*="More"], button:has([class*="MoreHorizontal"])');
    const buttonCount = await moreButtons.count();
    console.log(`Found ${buttonCount} more menu buttons`);
    
    if (buttonCount > 0) {
      // Click the first one
      const firstButton = moreButtons.first();
      await firstButton.scrollIntoViewIfNeeded();
      await firstButton.click();
      console.log('Clicked more menu button');
      
      // Wait for dropdown to open
      await page.waitForTimeout(500);
      
      // Check if Edit option is visible
      const editOption = page.locator('text=Edit').first();
      if (await editOption.isVisible()) {
        console.log('✅ Edit dropdown opened');
        
        // Click Edit
        await editOption.click();
        await page.waitForTimeout(500);
        
        // Check if edit form opened
        const editForm = page.locator('text=/Edit Item|Update Item/i');
        if (await editForm.isVisible()) {
          console.log('✅ Edit form opened');
        } else {
          console.log('❌ Edit form did not open');
        }
      } else {
        console.log('❌ Edit dropdown did not open');
      }
    }
  });

  test('5. Check console errors', async ({ page }) => {
    // Listen for console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Perform some actions
    const checkboxes = page.locator('input[type="checkbox"], [role="checkbox"]');
    if (await checkboxes.count() > 0) {
      await checkboxes.first().click();
    }
    
    await page.waitForTimeout(1000);
    
    if (errors.length > 0) {
      console.log('❌ Console errors found:');
      errors.forEach(err => console.log('  -', err));
    } else {
      console.log('✅ No console errors');
    }
  });
});
