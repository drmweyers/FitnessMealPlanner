import { test, expect } from '@playwright/test';
import { loginAsTrainer } from './auth-helper';

test('debug authenticated navigation', async ({ page }) => {
  // Login as trainer first
  await loginAsTrainer(page);
  
  console.log('Current URL after login:', page.url());
  
  // Take screenshot of trainer page
  await page.screenshot({ path: 'debug-trainer-logged-in.png' });
  
  // Look for customers tab
  const customersTab = page.locator('text=Customers').first();
  const isCustomersVisible = await customersTab.isVisible();
  console.log('Customers tab visible:', isCustomersVisible);
  
  if (isCustomersVisible) {
    console.log('Clicking customers tab...');
    await customersTab.click();
    await page.waitForTimeout(2000); // Wait for tab to load
    await page.screenshot({ path: 'debug-customers-tab.png' });
    
    // Look for customer entries
    const customerCards = await page.locator('.card').count();
    console.log('Customer cards found:', customerCards);
    
    // Look for specific test customer
    const testCustomer = page.locator('text=customer.test@evofitmeals.com');
    const isTestCustomerVisible = await testCustomer.isVisible();
    console.log('Test customer visible:', isTestCustomerVisible);
    
    if (isTestCustomerVisible) {
      console.log('Clicking test customer...');
      await testCustomer.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'debug-customer-detail.png' });
      
      // Look for Recent Meal Plans section
      const recentMealPlans = page.locator('text=Recent Meal Plans');
      const isRecentMealPlansVisible = await recentMealPlans.isVisible();
      console.log('Recent Meal Plans section visible:', isRecentMealPlansVisible);
    }
  }
});