import { test, expect } from '@playwright/test';

test('Capture console logs from grocery list component', async ({ page }) => {
  // Capture console messages
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    if (msg.text().includes('GroceryListWrapper') || msg.text().includes('useGroceryLists')) {
      consoleLogs.push(`${msg.type()}: ${msg.text()}`);
    }
  });

  // Navigate and login
  await page.goto('http://localhost:4000/login');
  await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
  await page.fill('input[type="password"]', 'TestCustomer123!');
  await page.click('button[type="submit"]');
  
  // Wait for customer page
  await page.waitForURL(/\/customer/);
  
  // Navigate to grocery list
  await page.goto('http://localhost:4000/customer/grocery-list');
  
  // Wait for component to render
  await page.waitForTimeout(5000);
  
  // Print captured logs
  console.log('\n=== Console Logs from Component ===');
  consoleLogs.forEach(log => console.log(log));
  
  // Check what's actually rendered
  const hasLoadingText = await page.locator('text=Loading your grocery lists').isVisible();
  const hasEmptyState = await page.locator('text=Create your first grocery list').isVisible();
  const hasSelectText = await page.locator('text=Select a list or create a new one').isVisible();
  
  console.log('\n=== UI State ===');
  console.log('Loading state visible:', hasLoadingText);
  console.log('Empty state visible:', hasEmptyState);
  console.log('Select list text visible:', hasSelectText);
  
  // Check if any list buttons are visible
  const listButtons = await page.locator('button.w-full.justify-between').count();
  console.log('Number of list buttons:', listButtons);
});
