import { test, expect } from '@playwright/test';

test.describe('Debug Login', () => {
  test('should access login page and take screenshot', async ({ page }) => {
    // Navigate to login page directly
    await page.goto('http://localhost:4000/login');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await page.screenshot({
      path: 'test-results/login-page-debug.png',
      fullPage: true
    });

    // Get page content
    const title = await page.title();
    console.log('Page title:', title);

    // Check for login form elements
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');

    console.log('Email input exists:', await emailInput.count());
    console.log('Password input exists:', await passwordInput.count());
    console.log('Submit button exists:', await submitButton.count());

    // Try to fill the form if inputs exist
    if (await emailInput.count() > 0 && await passwordInput.count() > 0) {
      await emailInput.fill('customer.test@evofitmeals.com');
      await passwordInput.fill('TestCustomer123!');

      await page.screenshot({
        path: 'test-results/login-filled.png',
        fullPage: true
      });

      if (await submitButton.count() > 0) {
        await submitButton.click();

        // Wait for navigation
        await page.waitForTimeout(3000);

        await page.screenshot({
          path: 'test-results/after-login-debug.png',
          fullPage: true
        });

        // Check current URL
        console.log('Current URL:', page.url());
      }
    }
  });
});