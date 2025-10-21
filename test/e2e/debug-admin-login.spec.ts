import { test, expect } from '@playwright/test';

test('Debug admin login flow', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login');
  console.log('1. Navigated to login page');

  // Fill in admin credentials
  await page.fill('input[name="email"]', 'admin@fitmeal.pro');
  await page.fill('input[name="password"]', 'AdminPass123');
  console.log('2. Filled in credentials');

  // Take screenshot before clicking submit
  await page.screenshot({ path: 'test-results/before-login.png' });

  // Click submit
  await page.click('button[type="submit"]');
  console.log('3. Clicked submit button');

  // Wait a bit for any navigation
  await page.waitForTimeout(5000);

  // Check current URL
  const currentUrl = page.url();
  console.log('4. Current URL after login:', currentUrl);

  // Take screenshot after login attempt
  await page.screenshot({ path: 'test-results/after-login.png' });

  // Check for any error messages
  const errorText = await page.locator('text=/error|invalid|failed/i').count();
  if (errorText > 0) {
    const errors = await page.locator('text=/error|invalid|failed/i').allTextContents();
    console.log('5. Found error messages:', errors);
  } else {
    console.log('5. No error messages found');
  }

  // Check what's visible on the page
  const pageText = await page.locator('body').textContent();
  console.log('6. Page contains:', pageText?.substring(0, 200));

  // Check if we're logged in by looking for user-specific elements
  const userElements = await page.locator('[data-user], [data-role], text=/dashboard|logout/i').count();
  console.log('7. User-related elements found:', userElements);
});
