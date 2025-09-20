import { test, expect } from '@playwright/test';

test('Check API responses', async ({ page }) => {
  // Capture responses
  const responses: any[] = [];
  
  page.on('response', async (response) => {
    if (response.url().includes('/api/grocery-lists')) {
      const status = response.status();
      const url = response.url();
      let body = null;
      
      try {
        body = await response.json();
      } catch (e) {
        body = await response.text();
      }
      
      responses.push({ url, status, body });
    }
  });

  // Login
  await page.goto('http://localhost:4000/login');
  await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
  await page.fill('input[type="password"]', 'TestCustomer123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  // Go to grocery list
  await page.goto('http://localhost:4000/customer/grocery-list');
  await page.waitForTimeout(2000);

  // Clear responses from initial load
  const initialResponseCount = responses.length;
  console.log(`Initial load made ${initialResponseCount} API calls`);

  // Find and click a checkbox
  const checkboxes = page.locator('button[role="checkbox"]');
  const count = await checkboxes.count();
  
  if (count > 0) {
    // Get initial state
    const firstCheckbox = checkboxes.first();
    const itemId = await firstCheckbox.evaluate(el => {
      // Try to find the item ID from parent elements
      let parent = el.parentElement;
      while (parent && parent.parentElement) {
        parent = parent.parentElement;
      }
      // Look for any element with item ID in the row
      const row = el.closest('[data-item-id]') || el.closest('div');
      return row?.getAttribute('data-item-id') || 'unknown';
    });
    
    const initialAriaChecked = await firstCheckbox.getAttribute('aria-checked');
    console.log('\nInitial checkbox state:', initialAriaChecked);
    
    // Click checkbox
    await firstCheckbox.click();
    await page.waitForTimeout(2000);
    
    // Check responses after click
    console.log('\n=== API CALLS AFTER CHECKBOX CLICK ===');
    for (let i = initialResponseCount; i < responses.length; i++) {
      const resp = responses[i];
      console.log(`\nCall ${i - initialResponseCount + 1}:`);
      console.log('URL:', resp.url);
      console.log('Status:', resp.status);
      
      if (resp.url.includes('/items/') && resp.url.includes('PUT')) {
        console.log('PUT Request Body:', JSON.stringify(resp.body, null, 2));
      }
      
      if (resp.body && resp.body.items && Array.isArray(resp.body.items)) {
        // Find the item that was clicked
        const relevantItems = resp.body.items.slice(0, 3);
        console.log('First 3 items in response:');
        relevantItems.forEach((item: any) => {
          console.log(`  - ${item.name}: isChecked=${item.isChecked}`);
        });
      } else if (resp.body && resp.body.isChecked !== undefined) {
        console.log('Updated item:', {
          name: resp.body.name,
          isChecked: resp.body.isChecked
        });
      }
    }
    
    // Check final UI state
    await page.waitForTimeout(1000);
    const finalAriaChecked = await firstCheckbox.getAttribute('aria-checked');
    console.log('\nFinal checkbox UI state:', finalAriaChecked);
    
    if (initialAriaChecked !== finalAriaChecked) {
      console.log('✅ UI UPDATED SUCCESSFULLY!');
    } else {
      console.log('❌ UI DID NOT UPDATE');
    }
  } else {
    console.log('No checkboxes found');
  }
});
