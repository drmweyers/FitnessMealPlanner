import { test, expect } from '@playwright/test';

test.describe('Grocery List Simple Checkbox Test', () => {
  test('checkbox works and persists across page refresh', async ({ page }) => {
    // 1. Login as customer
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');

    // Wait for redirect after login
    await page.waitForURL('**/customer');

    // 2. Go to /customer page
    await page.goto('http://localhost:4000/customer');

    // 3. Click on the "Grocery" tab
    await page.click('text=Grocery');

    // 4. Wait for the grocery list to load
    await page.waitForSelector('input[type="checkbox"]', { timeout: 10000 });

    // 5. Find a checkbox for any grocery item and click it
    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(firstCheckbox).toBeVisible();

    // Get the parent container to check for line-through later
    const itemContainer = firstCheckbox.locator('..').first();

    // Click the checkbox
    await firstCheckbox.click();

    // 6. Verify the item gets checked (look for line-through class)
    await expect(firstCheckbox).toBeChecked();

    // Look for line-through styling
    await expect(itemContainer).toHaveClass(/line-through|completed|checked/);

    // 7. Refresh the page and verify the check persists
    await page.reload();

    // Wait for page to load and click Grocery tab again
    await page.waitForURL('**/customer');
    await page.click('text=Grocery');

    // Wait for grocery list to load again
    await page.waitForSelector('input[type="checkbox"]', { timeout: 10000 });

    // Verify the same checkbox is still checked
    const firstCheckboxAfterRefresh = page.locator('input[type="checkbox"]').first();
    await expect(firstCheckboxAfterRefresh).toBeChecked();

    // Verify line-through styling persists
    const itemContainerAfterRefresh = firstCheckboxAfterRefresh.locator('..').first();
    await expect(itemContainerAfterRefresh).toHaveClass(/line-through|completed|checked/);
  });
});