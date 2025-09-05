import { test } from '@playwright/test';

test('Check Console Logs for Customer Data', async ({ page }) => {
  // Capture console logs
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    if (msg.text().includes('CustomerManagement')) {
      consoleLogs.push(msg.text());
      console.log('📝 Console:', msg.text());
    }
  });
  
  // Login
  await page.goto('http://localhost:4000/login');
  await page.fill('input[type="email"]', 'trainer.test@evofitmeals.com');
  await page.fill('input[type="password"]', 'TestTrainer123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/trainer', { timeout: 15000 });
  
  console.log('\n🔍 Navigating to Customers tab...\n');
  
  // Navigate to Customers tab
  await page.click('button[role="tab"]:has-text("Customers")');
  await page.waitForURL('**/trainer/customers');
  await page.waitForTimeout(3000);
  
  // Check what's in the DOM
  const pageHTML = await page.content();
  
  // Look for customer data in the page
  if (pageHTML.includes('customer.test@evofitmeals.com')) {
    console.log('✅ Customer email found in page HTML!');
  } else {
    console.log('❌ Customer email NOT found in page HTML');
  }
  
  if (pageHTML.includes('No Customers Yet')) {
    console.log('⚠️ "No Customers Yet" message is displayed');
  }
  
  if (pageHTML.includes('0 Customer')) {
    console.log('⚠️ "0 Customer" badge is displayed');
  }
  
  // Check the actual customer count in the badge
  const badge = await page.locator('.badge, [class*="badge"]').filter({ hasText: /Customer/ }).textContent();
  console.log(`\n📊 Badge text: "${badge}"`);
  
  // Try to find any customer card elements
  const possibleCustomerElements = [
    '.card',
    '[class*="customer"]',
    '[data-testid*="customer"]',
    'div:has-text("customer.test@evofitmeals.com")'
  ];
  
  for (const selector of possibleCustomerElements) {
    const count = await page.locator(selector).count();
    if (count > 0) {
      console.log(`Found ${count} elements matching "${selector}"`);
    }
  }
  
  console.log('\n📋 Console logs captured:', consoleLogs.length);
  consoleLogs.forEach(log => console.log('  ', log));
});