import { test, expect } from '@playwright/test';

test.describe('Simple Grocery List Check', () => {
  test('can access grocery list and see items', async ({ page }) => {
    // Enable detailed console logging
    page.on('console', msg => {
      console.log('Browser:', msg.type(), msg.text());
    });

    page.on('pageerror', error => {
      console.error('Page error:', error);
    });

    page.on('response', response => {
      if (response.url().includes('grocery')) {
        console.log(`API Response: ${response.url()} - Status: ${response.status()}`);
      }
    });

    // Login
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/customer');
    console.log('Logged in successfully');

    // Navigate to Grocery tab
    await page.click('text=Grocery');
    console.log('Clicked Grocery tab');

    // Wait for any response
    await page.waitForTimeout(5000);

    // Check page content
    const pageText = await page.textContent('body');
    console.log('Page text includes:', {
      hasError: pageText?.includes('Failed') || false,
      hasGroceryList: pageText?.includes('Grocery List') || false,
      hasTestList: pageText?.includes('Test Grocery List') || false,
      hasWeeklyList: pageText?.includes('Weekly Shopping List') || false,
      hasCreateButton: pageText?.includes('Create') || false,
      hasTryAgain: pageText?.includes('Try Again') || false
    });

    // Check for specific elements
    const errorMessage = await page.locator('.text-destructive, [class*="error"]').count();
    const groceryListElements = await page.locator('[class*="grocery"], [class*="Grocery"]').count();
    const buttons = await page.locator('button').count();
    const inputs = await page.locator('input').count();

    console.log('Element counts:', {
      errors: errorMessage,
      groceryElements: groceryListElements,
      buttons,
      inputs
    });

    // Take final screenshot
    await page.screenshot({ path: 'simple-grocery-check.png', fullPage: true });

    // Try to manually call the API from the browser context
    const apiTest = await page.evaluate(async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return { error: 'No token in localStorage' };

        const response = await fetch('/api/grocery-lists', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();
        return { status: response.status, data };
      } catch (error: any) {
        return { error: error.message };
      }
    });

    console.log('Direct API test from browser:', JSON.stringify(apiTest, null, 2));

    // Assert something exists
    expect(groceryListElements).toBeGreaterThan(0);
  });
});