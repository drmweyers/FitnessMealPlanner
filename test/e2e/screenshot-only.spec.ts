import { test } from '@playwright/test';

test('Take screenshot of grocery page', async ({ page }) => {
  test.setTimeout(60000);
  
  // Login
  await page.goto('http://localhost:4000/login');
  await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
  await page.fill('input[type="password"]', 'TestCustomer123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  
  // Try different navigation methods
  console.log('Method 1: Direct navigation to /grocery-list');
  await page.goto('http://localhost:4000/grocery-list');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'grocery-direct.png', fullPage: true });
  
  // Get all visible text
  const allText1 = await page.locator('body').innerText();
  console.log('Visible text on page:', allText1.substring(0, 500));
  
  console.log('\nMethod 2: Navigate to /customer and click Grocery tab');
  await page.goto('http://localhost:4000/customer');
  await page.waitForTimeout(2000);
  
  // Look for and click Grocery tab
  const groceryButton = page.locator('button:has-text("Grocery")').first();
  if (await groceryButton.isVisible()) {
    await groceryButton.click();
    console.log('Clicked Grocery tab');
    await page.waitForTimeout(3000);
  }
  
  await page.screenshot({ path: 'grocery-tab.png', fullPage: true });
  
  // Get all visible text again
  const allText2 = await page.locator('body').innerText();
  console.log('Visible text after tab click:', allText2.substring(0, 500));
});
