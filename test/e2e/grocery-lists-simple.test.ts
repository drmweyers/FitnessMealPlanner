import { test, expect } from '@playwright/test';

test.describe('Simple Grocery Lists Test', () => {
  test('should login and access grocery lists page', async ({ page }) => {
    // Navigate to login
    await page.goto('http://localhost:4000');

    // Fill login form
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL('**/dashboard**');

    // Take screenshot after login
    await page.screenshot({
      path: 'test-results/after-login.png',
      fullPage: true
    });

    // Look for navigation menu
    const groceryListsLink = page.locator('text=Grocery Lists');

    // Verify the link exists
    await expect(groceryListsLink).toBeVisible();

    // Click grocery lists
    await groceryListsLink.click();

    // Wait for navigation
    await page.waitForTimeout(3000);

    // Take screenshot of grocery lists page
    await page.screenshot({
      path: 'test-results/grocery-lists-page.png',
      fullPage: true
    });

    // Check what we actually see
    const pageContent = await page.textContent('body');
    console.log('Page content includes:', pageContent?.substring(0, 500));

    // Look for either empty state or actual lists
    const emptyState = page.locator('text=Create your first grocery list');
    const groceryListButtons = page.locator('button.w-full.justify-between.h-12');

    const hasEmptyState = await emptyState.isVisible();
    const buttonCount = await groceryListButtons.count();

    console.log('Empty state visible:', hasEmptyState);
    console.log('Grocery list buttons count:', buttonCount);

    // The test should determine what the actual behavior is
    if (hasEmptyState && buttonCount === 0) {
      console.log('NO GROCERY LISTS EXIST - Empty state is correct');
    } else if (!hasEmptyState && buttonCount > 0) {
      console.log('GROCERY LISTS EXIST - Lists are displayed correctly');
    } else {
      console.log('RACE CONDITION DETECTED - Empty state shown but lists exist');

      // Take screenshot showing the race condition
      await page.screenshot({
        path: 'test-results/race-condition-detected.png',
        fullPage: true
      });

      // Wait a bit more and check again
      await page.waitForTimeout(3000);

      const hasEmptyStateAfter = await emptyState.isVisible();
      const buttonCountAfter = await groceryListButtons.count();

      console.log('After waiting - Empty state visible:', hasEmptyStateAfter);
      console.log('After waiting - Grocery list buttons count:', buttonCountAfter);

      await page.screenshot({
        path: 'test-results/after-race-condition-wait.png',
        fullPage: true
      });
    }
  });
});