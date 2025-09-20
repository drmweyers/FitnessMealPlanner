import { test, expect } from '@playwright/test';

test('Direct grocery list test', async ({ page }) => {
  // Capture console messages
  const consoleMessages: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleMessages.push(`${msg.type().toUpperCase()}: ${msg.text()}`);
    }
    // Also capture debug logs
    if (msg.text().includes('Checkbox')) {
      console.log('DEBUG:', msg.text());
    }
  });

  // Capture network requests
  const apiCalls: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/grocery-lists')) {
      apiCalls.push(`${request.method()} ${request.url()}`);
    }
  });

  // Navigate directly to login page
  await page.goto('http://localhost:4000/login');
  
  // Login
  await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
  await page.fill('input[type="password"]', 'TestCustomer123!');
  await page.click('button[type="submit"]');
  
  // Wait for login to complete
  await page.waitForTimeout(2000);
  
  // Navigate directly to grocery list (singular!)
  await page.goto('http://localhost:4000/customer/grocery-list');
  await page.waitForTimeout(2000);
  
  // Take screenshot for debugging
  await page.screenshot({ path: 'grocery-page.png' });
  
  // Check if we're on the grocery page
  const url = page.url();
  console.log('Current URL:', url);
  
  // Look for grocery list elements
  const heading = await page.locator('h1, h2').allTextContents();
  console.log('Headings on page:', heading);
  
  // Check for items
  const checkboxes = page.locator('input[type="checkbox"], [role="checkbox"]');
  const count = await checkboxes.count();
  console.log('Checkbox count:', count);
  
  if (count > 0) {
    // Inspect checkbox element
    const firstCheckbox = checkboxes.first();
    const tagName = await firstCheckbox.evaluate(el => el.tagName);
    const type = await firstCheckbox.getAttribute('type');
    const role = await firstCheckbox.getAttribute('role');
    const ariaChecked = await firstCheckbox.getAttribute('aria-checked');
    const dataState = await firstCheckbox.getAttribute('data-state');

    console.log('Checkbox element:', { tagName, type, role, ariaChecked, dataState });

    // Try different ways to check state
    const wasChecked = await firstCheckbox.isChecked().catch(() => false);
    const wasAriaChecked = ariaChecked === 'true';
    const wasDataChecked = dataState === 'checked';

    console.log('Initial states:', { isChecked: wasChecked, ariaChecked: wasAriaChecked, dataState: wasDataChecked });

    // Try clicking
    await firstCheckbox.click();
    await page.waitForTimeout(1000);

    // Check all states again
    const isChecked = await firstCheckbox.isChecked().catch(() => false);
    const newAriaChecked = await firstCheckbox.getAttribute('aria-checked');
    const newDataState = await firstCheckbox.getAttribute('data-state');

    console.log('After click:', { isChecked, ariaChecked: newAriaChecked, dataState: newDataState });

    if (wasChecked !== isChecked || wasAriaChecked !== (newAriaChecked === 'true') || wasDataChecked !== (newDataState === 'checked')) {
      console.log('✅ CHECKBOX WORKS!');
    } else {
      console.log('❌ CHECKBOX DOES NOT WORK');

      // Try to find the actual click handler
      const hasClickHandler = await firstCheckbox.evaluate(el => {
        return el.onclick !== null || el.addEventListener !== undefined;
      });
      console.log('Has click handler:', hasClickHandler);
    }
  } else {
    console.log('No checkboxes found on page');
  }
  
  // Check for Add Item button
  const addButton = page.locator('button:has-text("Add Item")');
  if (await addButton.count() > 0) {
    console.log('✅ Add Item button found');
    await addButton.click();
    await page.waitForTimeout(1000);
    
    // Check if form appeared
    const nameInput = page.locator('input[placeholder*="name" i], input[placeholder*="item" i]').first();
    if (await nameInput.isVisible()) {
      console.log('✅ Add Item form opened');
      
      // Try to add an item
      await nameInput.fill('Test Item from Playwright');
      const submitButton = page.locator('button:has-text("Add"), button:has-text("Save")').last();
      await submitButton.click();
      await page.waitForTimeout(2000);
      
      // Check if item was added
      const newItem = page.locator('text=Test Item from Playwright');
      if (await newItem.count() > 0) {
        console.log('✅ ITEM ADDED SUCCESSFULLY!');
      } else {
        console.log('❌ Item was not added');
      }
    } else {
      console.log('❌ Add Item form did not open');
    }
  } else {
    console.log('❌ Add Item button not found');
  }

  // Print console errors if any
  if (consoleMessages.length > 0) {
    console.log('\n\n=== CONSOLE ERRORS/WARNINGS ===');
    consoleMessages.forEach(msg => console.log(msg));
  } else {
    console.log('\n✅ No console errors');
  }

  // Print API calls
  console.log('\n=== API CALLS MADE ===');
  if (apiCalls.length > 0) {
    apiCalls.forEach(call => console.log(call));
  } else {
    console.log('No API calls to grocery-lists endpoints');
  }
});
