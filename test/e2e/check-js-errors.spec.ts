import { test } from '@playwright/test';

test('Check for JavaScript errors', async ({ page }) => {
  test.setTimeout(60000);

  // Capture console errors
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    errors.push(`PAGE ERROR: ${err.message}`);
  });

  // Login
  await page.goto('http://localhost:4000/login');
  await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
  await page.fill('input[type="password"]', 'TestCustomer123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  // Navigate to customer page
  await page.goto('http://localhost:4000/customer');
  await page.waitForTimeout(2000);

  // Click Grocery tab
  const groceryTab = page.locator('button:has-text("Grocery")').first();
  await groceryTab.click();
  await page.waitForTimeout(3000);

  console.log('=== JavaScript Errors Found ===');
  if (errors.length > 0) {
    errors.forEach(err => console.log('ERROR:', err));
  } else {
    console.log('No JavaScript errors detected');
  }

  // Check if grocery component rendered
  const groceryWrapper = await page.locator('[class*="GroceryListWrapper"]').count();
  console.log('\nGroceryListWrapper components found:', groceryWrapper);

  // Check React DevTools
  const reactRoot = await page.locator('#root').count();
  console.log('React root found:', reactRoot);

  // Get the HTML of the main content area
  const mainContent = await page.locator('main, [role="main"], .container').first().innerHTML().catch(() => 'Not found');
  console.log('\nMain content HTML (first 500 chars):');
  console.log(mainContent.substring(0, 500));
});
