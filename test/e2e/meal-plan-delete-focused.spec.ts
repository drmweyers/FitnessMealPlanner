import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4000';

test('Delete meal plan functionality', async ({ page }) => {
  // Enable console and network logging
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`Browser ${msg.type()}:`, msg.text());
    }
  });
  
  page.on('request', request => {
    if (request.url().includes('/api/meal-plan') && request.method() === 'DELETE') {
      console.log('DELETE Request:', request.url());
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('/api/meal-plan') && response.request().method() === 'DELETE') {
      console.log('DELETE Response:', response.status(), response.url());
    }
  });
  
  // Go to login
  await page.goto(`${BASE_URL}/login`);
  
  // Login as customer
  await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
  await page.fill('input[type="password"]', 'TestCustomer123!');
  await page.click('button[type="submit"]');
  
  // Wait for dashboard
  await page.waitForURL('**/my-meal-plans', { timeout: 10000 });
  await page.waitForTimeout(2000);
  
  // Get initial count
  const initialCount = await page.locator('.group.hover\\:shadow-lg').count();
  console.log('Initial meal plan count:', initialCount);
  
  if (initialCount === 0) {
    console.log('No meal plans to delete');
    return;
  }
  
  // Get the first meal plan's name
  const firstCardName = await page.locator('.group.hover\\:shadow-lg h3').first().textContent();
  console.log('Deleting meal plan:', firstCardName);
  
  // Click the first delete button
  const deleteButton = page.locator('button[aria-label="Delete meal plan"]').first();
  await deleteButton.click();
  
  // Wait for dialog
  await page.waitForSelector('[role="alertdialog"]', { timeout: 5000 });
  console.log('Confirmation dialog opened');
  
  // Check dialog content
  const dialogText = await page.locator('[role="alertdialog"]').textContent();
  console.log('Dialog text:', dialogText);
  
  // Click Delete in the dialog
  const confirmButton = page.locator('[role="alertdialog"] button').filter({ hasText: 'Delete' });
  await confirmButton.click();
  console.log('Clicked Delete confirmation');
  
  // Wait for the response
  try {
    const response = await page.waitForResponse(
      resp => resp.url().includes('/api/meal-plan') && resp.request().method() === 'DELETE',
      { timeout: 5000 }
    );
    console.log('Delete API response status:', response.status());
    
    if (response.ok()) {
      const body = await response.json();
      console.log('Response body:', body);
    } else {
      const errorBody = await response.text();
      console.log('Error response:', errorBody);
    }
  } catch (error) {
    console.log('No DELETE request detected - checking if it was sent');
    
    // Check network activity
    const requests = await page.evaluate(() => {
      return performance.getEntriesByType('resource')
        .filter(entry => entry.name.includes('meal-plan'))
        .map(entry => ({ name: entry.name, type: entry.initiatorType }));
    });
    console.log('Network requests to meal-plan:', requests);
  }
  
  // Wait for UI update
  await page.waitForTimeout(2000);
  
  // Check final count
  const finalCount = await page.locator('.group.hover\\:shadow-lg').count();
  console.log('Final meal plan count:', finalCount);
  
  // Check for toast message
  const toasts = await page.locator('[class*="toast"]').all();
  for (const toast of toasts) {
    const text = await toast.textContent();
    console.log('Toast message:', text);
  }
  
  // Verify deletion
  if (finalCount < initialCount) {
    console.log('✅ Meal plan successfully deleted');
    
    // Verify the specific plan is gone
    const remainingNames = await page.locator('.group.hover\\:shadow-lg h3').allTextContents();
    if (!remainingNames.includes(firstCardName)) {
      console.log('✅ Correct meal plan was removed');
    }
  } else {
    console.log('❌ Meal plan was not deleted');
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'delete-failed.png', fullPage: true });
  }
  
  expect(finalCount).toBe(initialCount - 1);
});