import { test, expect } from '@playwright/test';

test('debug navigation', async ({ page }) => {
  // Navigate to trainer page
  await page.goto('http://localhost:4000/trainer');
  await page.screenshot({ path: 'debug-trainer-page.png' });
  
  console.log('Current URL:', page.url());
  console.log('Page title:', await page.title());
  
  // Check if we're actually on trainer page
  const heading = await page.textContent('h1');
  console.log('Page heading:', heading);
  
  // Look for customers tab
  const customersTab = page.locator('text=Customers').first();
  const isCustomersVisible = await customersTab.isVisible();
  console.log('Customers tab visible:', isCustomersVisible);
  
  if (isCustomersVisible) {
    await customersTab.click();
    await page.screenshot({ path: 'debug-customers-tab.png' });
    
    // Look for customer entries
    const customerEntries = await page.locator('.card, tr, [data-testid="customer"]').count();
    console.log('Customer entries found:', customerEntries);
  }
});