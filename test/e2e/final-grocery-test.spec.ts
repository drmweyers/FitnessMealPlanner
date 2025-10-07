import { test, expect } from '@playwright/test';

test.describe('Final Grocery List Verification', () => {
  test('Verify grocery lists are now visible', async ({ page }) => {
    // Extend timeout
    test.setTimeout(60000);
    
    // Navigate to app
    await page.goto('http://localhost:4000');
    await page.waitForTimeout(2000);
    
    // Login
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForTimeout(3000);
    
    // Go to grocery list page
    await page.goto('http://localhost:4000/grocery-list');
    await page.waitForTimeout(5000);
    
    // Check for our debug logs in console
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('[')) {
        logs.push(msg.text());
      }
    });
    
    // Refresh to capture logs
    await page.reload();
    await page.waitForTimeout(3000);
    
    // Check UI state
    const hasEmptyState = await page.locator('text=Create your first grocery list').count();
    const hasMealPlanList = await page.locator('text=Meal Plan Grocery List').count();
    const hasLoading = await page.locator('text=Loading your grocery lists').count();
    
    console.log('=== FINAL TEST RESULTS ===');
    console.log('Empty state count:', hasEmptyState);
    console.log('Meal Plan lists count:', hasMealPlanList);
    console.log('Loading state count:', hasLoading);
    
    // Take screenshot
    await page.screenshot({ path: 'final-grocery-test.png', fullPage: true });
    
    // Success criteria
    if (hasMealPlanList > 0) {
      console.log('✅ SUCCESS! Grocery lists are visible!');
    } else if (hasEmptyState > 0) {
      console.log('❌ FAIL! Still showing empty state');
      throw new Error('Bug persists - empty state shown');
    }
    
    expect(hasMealPlanList).toBeGreaterThan(0);
  });
});
