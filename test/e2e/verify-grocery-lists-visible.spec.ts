import { test, expect } from '@playwright/test';

test.describe('Grocery Lists Visibility', () => {
  test('Customer can see grocery lists in UI', async ({ page }) => {
    console.log('Starting grocery lists visibility test...');
    
    // Navigate to login page
    await page.goto('http://localhost:4000/login');
    await page.waitForLoadState('networkidle');
    
    // Login as customer
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to customer dashboard
    await page.waitForURL(/\/customer/);
    console.log('Logged in successfully, on customer page');
    
    // Navigate to grocery lists
    const groceryTab = page.getByRole('button', { name: /grocery/i });
    if (await groceryTab.isVisible()) {
      await groceryTab.click();
      console.log('Clicked Grocery tab');
    } else {
      // Try direct navigation
      await page.goto('http://localhost:4000/customer/grocery-list');
      console.log('Navigated directly to grocery list');
    }
    
    // Wait for loading to complete
    await page.waitForTimeout(3000);
    
    // Check for the race condition bug
    const emptyStateVisible = await page.locator('text=Create your first grocery list').isVisible();
    const listsVisible = await page.locator('button:has-text("Meal Plan Grocery List")').count();
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'grocery-lists-ui-test.png', fullPage: true });
    
    // Log results
    console.log('Test Results:');
    console.log('- Empty state visible:', emptyStateVisible);
    console.log('- Number of lists visible:', listsVisible);
    
    // Assertions
    if (emptyStateVisible && listsVisible === 0) {
      throw new Error('BUG STILL EXISTS: Shows "Create your first grocery list" even though API returns lists');
    }
    
    expect(emptyStateVisible).toBe(false);
    expect(listsVisible).toBeGreaterThan(0);
    
    console.log('✅ SUCCESS: Grocery lists are visible in the UI!');
  });
});
