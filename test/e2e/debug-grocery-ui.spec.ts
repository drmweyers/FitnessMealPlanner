import { test, expect } from '@playwright/test';

test('Debug grocery UI completely', async ({ page }) => {
  test.setTimeout(120000);

  console.log('Step 1: Login as customer');
  await page.goto('http://localhost:4000/login');
  await page.waitForLoadState('domcontentloaded');
  
  // Fill login
  await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
  await page.fill('input[type="password"]', 'TestCustomer123!');
  
  // Capture network requests
  const responses: any[] = [];
  page.on('response', response => {
    if (response.url().includes('grocery')) {
      responses.push({
        url: response.url(),
        status: response.status(),
      });
    }
  });
  
  // Submit login
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  console.log('Step 2: Navigate to customer page');
  const currentUrl = page.url();
  console.log('Current URL after login:', currentUrl);
  
  // Go to customer page
  if (!currentUrl.includes('customer')) {
    await page.goto('http://localhost:4000/customer');
    await page.waitForTimeout(2000);
  }

  console.log('Step 3: Looking for Grocery tab');
  // Find all buttons
  const buttons = await page.locator('button').all();
  console.log(`Found ${buttons.length} buttons on page`);
  
  for (let i = 0; i < buttons.length; i++) {
    const text = await buttons[i].innerText().catch(() => '');
    if (text) {
      console.log(`Button ${i}: "${text}"`);
    }
  }

  // Try to find and click Grocery
  const groceryTab = page.locator('button:has-text("Grocery")').first();
  if (await groceryTab.isVisible()) {
    console.log('Found Grocery tab, clicking...');
    await groceryTab.click();
    await page.waitForTimeout(3000);
  } else {
    console.log('Grocery tab not found, trying direct navigation');
    await page.goto('http://localhost:4000/customer#grocery');
    await page.waitForTimeout(3000);
  }

  console.log('\nStep 4: Check what is visible on page');
  
  // Get all h1, h2, h3 headings
  const headings = await page.locator('h1, h2, h3').all();
  for (const heading of headings) {
    const text = await heading.innerText();
    console.log('Heading:', text);
  }
  
  // Check for specific elements
  const checks = [
    'text=Loading your grocery lists',
    'text=Create your first grocery list',
    'text=Meal Plan Grocery List',
    'text=Grocery Lists',
    'text=Select a list',
    'button:has-text("Create New List")',
  ];
  
  for (const selector of checks) {
    const count = await page.locator(selector).count();
    console.log(`"${selector}": ${count} found`);
  }
  
  console.log('\nStep 5: Network responses to grocery endpoints');
  responses.forEach(r => {
    console.log(`${r.status} - ${r.url}`);
  });
  
  // Final screenshot
  await page.screenshot({ path: 'debug-grocery-final.png', fullPage: true });
  
  // Get page content
  const bodyText = await page.locator('body').innerText();
  if (bodyText.length > 0) {
    console.log('\nPage content preview:');
    console.log(bodyText.substring(0, 300));
  } else {
    console.log('\n⚠️ PAGE IS BLANK');
  }
});
