import { test, expect } from '@playwright/test';

test('Debug login with network monitoring', async ({ page }) => {
  // Monitor network requests
  page.on('request', request => console.log('Request:', request.method(), request.url()));
  page.on('response', response => {
    console.log('Response:', response.status(), response.url());
    if (response.url().includes('/api/auth/login')) {
      response.text().then(body => console.log('Login response body:', body));
    }
  });
  page.on('console', msg => console.log('Browser console:', msg.text()));

  // Navigate to login page
  await page.goto('/login');
  console.log('Navigated to login page');

  // Fill in credentials
  await page.fill('input[name="email"]', 'admin@fitmeal.pro');
  await page.fill('input[name="password"]', 'AdminPass123');
  console.log('Filled credentials');

  // Click submit
  await page.click('button[type="submit"]');
  console.log('Submitted form');

  // Wait for API response
  await page.waitForTimeout(5000);

  // Check current URL
  console.log('Final URL:', page.url());

  // Check for any visible error messages
  const bodyText = await page.textContent('body');
  console.log('Page text:', bodyText);
});
