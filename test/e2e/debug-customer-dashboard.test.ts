import { test, expect } from '@playwright/test';

test.describe('Debug Customer Dashboard', () => {
  test('should login and explore customer dashboard', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:4000/login');
    await page.waitForLoadState('networkidle');

    // Login
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');

    // Wait for navigation to customer dashboard
    await page.waitForTimeout(3000);

    // Take screenshot of dashboard
    await page.screenshot({
      path: 'test-results/customer-dashboard.png',
      fullPage: true
    });

    console.log('Current URL:', page.url());

    // Look for navigation menu items
    const menuItems = await page.locator('nav a, nav button').allTextContents();
    console.log('Menu items:', menuItems);

    // Look for grocery lists link specifically
    const groceryListsLink = page.locator('text=Grocery Lists');
    const groceryListsExists = await groceryListsLink.count();
    console.log('Grocery Lists link exists:', groceryListsExists > 0);

    if (groceryListsExists > 0) {
      // Click on grocery lists
      await groceryListsLink.click();
      await page.waitForTimeout(3000);

      // Take screenshot of grocery lists page
      await page.screenshot({
        path: 'test-results/grocery-lists-customer.png',
        fullPage: true
      });

      console.log('Grocery lists page URL:', page.url());

      // Check page content
      const pageText = await page.textContent('body');

      // Look for key indicators
      const hasEmptyState = pageText?.includes('Create your first grocery list');
      const hasLists = pageText?.includes('Meal Plan Grocery List');

      console.log('Has empty state message:', hasEmptyState);
      console.log('Has grocery lists:', hasLists);
      console.log('Page content preview:', pageText?.substring(0, 500));

      // Look for grocery list buttons
      const listButtons = page.locator('button.w-full.justify-between.h-12');
      const buttonCount = await listButtons.count();
      console.log('Grocery list buttons found:', buttonCount);

      if (buttonCount > 0) {
        // Get text of each button
        for (let i = 0; i < Math.min(buttonCount, 3); i++) {
          const buttonText = await listButtons.nth(i).textContent();
          console.log(`Button ${i + 1} text:`, buttonText);
        }
      }
    }
  });
});