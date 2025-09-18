import { test, expect } from '@playwright/test';

test.describe('Debug Grocery List Integration', () => {
  test('debug what is actually rendering in grocery tab', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => {
      console.log('Browser console:', msg.type(), msg.text());
    });

    page.on('pageerror', err => {
      console.error('Page error:', err);
    });

    // Login as customer
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL('**/customer');
    console.log('Logged in and redirected to customer page');

    // Click on the Grocery tab
    await page.click('text=Grocery');
    console.log('Clicked Grocery tab');

    // Take screenshot to see what's rendered
    await page.screenshot({ path: 'debug-grocery-tab.png', fullPage: true });
    console.log('Screenshot saved to debug-grocery-tab.png');

    // Wait a bit for any async operations
    await page.waitForTimeout(3000);

    // Check what's actually on the page
    const bodyText = await page.textContent('body');
    console.log('Page contains text:', bodyText?.substring(0, 500));

    // Look for any grocery-related elements
    const groceryElements = await page.locator('[class*="grocery"], [class*="Grocery"], [id*="grocery"]').count();
    console.log(`Found ${groceryElements} grocery-related elements`);

    // Check for loading states
    const loadingElements = await page.locator('[class*="loading"], [class*="spinner"]').count();
    console.log(`Found ${loadingElements} loading/spinner elements`);

    // Check for error messages
    const errorElements = await page.locator('[class*="error"], [role="alert"]').count();
    console.log(`Found ${errorElements} error elements`);

    if (errorElements > 0) {
      const errorText = await page.locator('[class*="error"], [role="alert"]').first().textContent();
      console.log('Error message:', errorText);
    }

    // Try to find any checkboxes at all
    const checkboxCount = await page.locator('input[type="checkbox"]').count();
    console.log(`Found ${checkboxCount} checkboxes`);

    // Check if MobileGroceryList component is rendered
    const mobileGroceryList = await page.locator('.mobile-grocery-list, [data-testid*="grocery"]').count();
    console.log(`Found ${mobileGroceryList} mobile grocery list components`);

    // Look for list items
    const listItems = await page.locator('li, .list-item, .grocery-item').count();
    console.log(`Found ${listItems} list items`);

    // Check the actual HTML structure
    const groceryTabContent = await page.locator('.tab-content, main').innerHTML();
    console.log('Grocery tab HTML structure (first 1000 chars):', groceryTabContent.substring(0, 1000));

    // Try to interact with the API directly to see if it's an API issue
    const apiResponse = await page.evaluate(async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/grocery-lists', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        return { status: response.status, data };
      } catch (error) {
        return { error: error.message };
      }
    });
    console.log('API response:', JSON.stringify(apiResponse, null, 2));

    // Take final screenshot
    await page.screenshot({ path: 'debug-grocery-final.png', fullPage: true });

    // Assert that we should have checkboxes
    expect(checkboxCount).toBeGreaterThan(0);
  });
});