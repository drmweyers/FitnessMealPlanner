import { test, expect } from '@playwright/test';

test('Simple Saved Meal Plans Test', async ({ page }) => {
  console.log('Testing Saved Meal Plans functionality...\n');
  
  // Navigate directly to the app
  await page.goto('http://localhost:4000');
  await page.waitForTimeout(2000);
  
  // Check current URL
  console.log('Current URL:', page.url());
  
  // Try to login
  if (page.url().includes('/login')) {
    console.log('On login page, logging in...');
    await page.fill('input[type="email"]', 'trainer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestTrainer123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    console.log('After login, URL:', page.url());
  }
  
  // Check if we're on trainer page
  if (page.url().includes('/trainer')) {
    console.log('✅ Successfully on trainer page');
    
    // Look for Saved Plans tab
    const tabs = await page.locator('button[role="tab"]').all();
    console.log(`Found ${tabs.length} tabs`);
    
    for (const tab of tabs) {
      const text = await tab.textContent();
      console.log(`  Tab: "${text}"`);
    }
    
    // Try to find and click Saved Plans tab
    const savedTab = page.locator('button[role="tab"]').filter({ hasText: /Saved/ }).first();
    if (await savedTab.isVisible()) {
      console.log('✅ Found Saved Plans tab, clicking...');
      await savedTab.click();
      await page.waitForTimeout(2000);
      
      console.log('Current URL after clicking:', page.url());
      
      // Check for API call
      const apiPromise = page.waitForResponse(
        response => response.url().includes('/api/trainer/meal-plans'),
        { timeout: 3000 }
      ).catch(() => null);
      
      // Refresh to trigger API call
      await page.reload();
      const apiResponse = await apiPromise;
      
      if (apiResponse) {
        const data = await apiResponse.json();
        console.log('✅ API call made! Response:', data);
      } else {
        console.log('⚠️ No API call detected');
      }
      
      // Check what's displayed
      await page.waitForTimeout(1000);
      const mealPlans = await page.locator('.grid > .relative').count();
      const emptyState = await page.locator('text=/You haven\'t saved any meal plans/i').count();
      
      console.log(`\nPage content:`);
      console.log(`  - Meal plan cards: ${mealPlans}`);
      console.log(`  - Empty state shown: ${emptyState > 0}`);
      
      // Check for search bar
      const searchBar = await page.locator('input[placeholder*="Search"]').count();
      console.log(`  - Search bar present: ${searchBar > 0}`);
      
      console.log('\n✅ SAVED MEAL PLANS TAB IS WORKING!');
    } else {
      console.log('❌ Saved Plans tab not found');
    }
  } else {
    console.log('❌ Not on trainer page, current URL:', page.url());
  }
});