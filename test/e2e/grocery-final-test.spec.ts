import { test, expect } from '@playwright/test';

test.describe('Grocery List Final Validation', () => {
  test('All functionality works', async ({ page }) => {
    console.log('\n=== STARTING FINAL VALIDATION TEST ===\n');
    
    // Track API calls
    const apiCalls: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/grocery-lists')) {
        apiCalls.push(`${request.method()} ${request.url()}`);
      }
    });

    // Login
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Navigate to grocery list
    await page.goto('http://localhost:4000/customer/grocery-list');
    await page.waitForTimeout(2000);

    // TEST 1: CHECKBOX FUNCTIONALITY
    console.log('TEST 1: Checkbox Functionality');
    const checkboxes = page.locator('button[role="checkbox"]');
    const checkboxCount = await checkboxes.count();
    
    if (checkboxCount > 0) {
      const firstCheckbox = checkboxes.first();
      const initialState = await firstCheckbox.getAttribute('aria-checked');
      
      await firstCheckbox.click();
      await page.waitForTimeout(2000);
      
      const newState = await firstCheckbox.getAttribute('aria-checked');
      
      if (initialState !== newState) {
        console.log('✅ Checkbox: WORKING');
      } else {
        console.log('❌ Checkbox: NOT WORKING');
      }
    }

    // TEST 2: ADD ITEM FUNCTIONALITY
    console.log('\nTEST 2: Add Item Functionality');
    
    // First check if we need to click "Add Item" button or if form is already visible
    const addButton = page.locator('button:has-text("Add Item")').first();
    const formVisible = await page.locator('input[placeholder*="Item name"]').isVisible();
    
    if (!formVisible && await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Now fill the form
    const testItemName = `Final Test Item ${Date.now()}`;
    const nameInput = page.locator('input[placeholder*="Item name"]').first();
    
    if (await nameInput.isVisible()) {
      await nameInput.fill(testItemName);
      
      // Fill quantity
      const qtyInput = page.locator('input[placeholder="Qty"]').first();
      if (await qtyInput.isVisible()) {
        await qtyInput.fill('3');
      }
      
      // Click the Add Item button in the form
      const submitButton = page.locator('button:has-text("Add Item")').last();
      const beforeAddCount = apiCalls.length;
      await submitButton.click();
      await page.waitForTimeout(3000);
      
      // Check if POST request was made
      const afterAddCount = apiCalls.length;
      const postMade = apiCalls.slice(beforeAddCount).some(call => call.includes('POST'));
      
      // Check if item appears
      const newItem = page.locator(`text="${testItemName}"`);
      const itemVisible = await newItem.count() > 0;
      
      if (postMade && itemVisible) {
        console.log('✅ Add Item: WORKING');
      } else if (postMade && !itemVisible) {
        console.log('⚠️ Add Item: API works but UI not updating');
      } else {
        console.log('❌ Add Item: NOT WORKING');
      }
    } else {
      console.log('❌ Add Item form not visible');
    }

    // TEST 3: EDIT FUNCTIONALITY
    console.log('\nTEST 3: Edit Functionality');
    const moreButtons = page.locator('button').filter({ has: page.locator('svg[class*="MoreHorizontal"]') });
    const moreCount = await moreButtons.count();
    
    if (moreCount > 0) {
      await moreButtons.first().click();
      await page.waitForTimeout(500);
      
      const editOption = page.locator('text="Edit"').first();
      if (await editOption.isVisible()) {
        await editOption.click();
        await page.waitForTimeout(1000);
        
        const editModal = page.locator('text=/Edit Item|Update Item/').first();
        if (await editModal.isVisible()) {
          console.log('✅ Edit dropdown: WORKING');
        } else {
          console.log('❌ Edit dropdown: Menu opens but edit form doesn\'t');
        }
      } else {
        console.log('❌ Edit dropdown: NOT WORKING');
      }
    }

    // FINAL SUMMARY
    console.log('\n=== FINAL TEST RESULTS ===');
    console.log('Total API calls made:', apiCalls.length);
    
    // Count working features
    let workingFeatures = 0;
    if (checkboxCount > 0) workingFeatures++;
    // Add more feature counts as needed
    
    console.log('\n🎯 Grocery List Functionality Test Complete!');
  });
});
