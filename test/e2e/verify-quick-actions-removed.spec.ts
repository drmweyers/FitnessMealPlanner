import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:4000';
const CUSTOMER_EMAIL = 'customer.test@evofitmeals.com';
const CUSTOMER_PASSWORD = 'TestCustomer123!';

// Helper function to login as customer
async function loginAsCustomer(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', CUSTOMER_EMAIL);
  await page.fill('input[type="password"]', CUSTOMER_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/my-meal-plans');
}

test.describe('Verify Quick Actions Removed', () => {
  test('Quick Actions section should not exist in Customer Profile', async ({ page }) => {
    // Login as customer
    await loginAsCustomer(page);
    
    // Navigate to profile page
    await page.click('a[href="/profile"]');
    await page.waitForURL('**/profile');
    
    // Verify we're on the profile page
    await expect(page.locator('h1')).toContainText('Profile');
    
    // Verify Quick Actions section does not exist
    await expect(page.locator('text="Quick Actions"')).not.toBeVisible();
    
    // Verify "Rate Meal Plans" button does not exist
    await expect(page.locator('text="Rate Meal Plans"')).not.toBeVisible();
    
    // Verify "View Progress" button in Quick Actions does not exist
    // (since the entire Quick Actions section is removed)
    const quickActionsSection = page.locator('div:has(> h2:has-text("Quick Actions"))');
    await expect(quickActionsSection).not.toBeVisible();
    
    // Verify other profile sections still exist
    await expect(page.locator('text="Active Meal Plans"')).toBeVisible();
    await expect(page.locator('text="Account Info"')).toBeVisible();
    
    // Take a screenshot for visual confirmation
    await page.screenshot({ 
      path: 'test-results/customer-profile-no-quick-actions.png',
      fullPage: true 
    });
  });

  test('Verify no Quick Actions remnants in page source', async ({ page }) => {
    // Login as customer
    await loginAsCustomer(page);
    
    // Navigate to profile page
    await page.click('a[href="/profile"]');
    await page.waitForURL('**/profile');
    
    // Get the page content
    const pageContent = await page.content();
    
    // Verify Quick Actions text is not in the page source
    expect(pageContent).not.toContain('Quick Actions');
    expect(pageContent).not.toContain('Rate Meal Plans');
    
    // Verify the Target icon (used for Quick Actions) is not present
    // in a Quick Actions context
    const targetIcons = await page.locator('svg').evaluateAll(elements => 
      elements.map(el => el.innerHTML)
    );
    
    // Check that if Target icon exists, it's not in a Quick Actions card
    const quickActionsCard = page.locator('.card:has(svg):has-text("Quick Actions")');
    await expect(quickActionsCard).not.toBeVisible();
  });

  test('Verify profile page loads correctly without Quick Actions', async ({ page }) => {
    // Login as customer
    await loginAsCustomer(page);
    
    // Navigate to profile page
    await page.click('a[href="/profile"]');
    await page.waitForURL('**/profile');
    
    // Verify page loads without errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Check for no console errors
    expect(consoleErrors).toHaveLength(0);
    
    // Verify essential profile elements are present
    await expect(page.locator('h1:has-text("Profile")')).toBeVisible();
    await expect(page.locator('text="Active Meal Plans"')).toBeVisible();
    await expect(page.locator('text="Account Info"')).toBeVisible();
    
    // Verify tabs are present and functional
    const tabs = page.locator('[role="tablist"] button');
    await expect(tabs).toHaveCount(3); // Profile, Settings, Progress
    
    // Click through tabs to ensure they work
    await page.click('button[role="tab"]:has-text("Settings")');
    await expect(page.locator('text="Account Settings"')).toBeVisible();
    
    await page.click('button[role="tab"]:has-text("Progress")');
    await expect(page.locator('h2:has-text("Progress Tracking")')).toBeVisible();
    
    await page.click('button[role="tab"]:has-text("Profile")');
    await expect(page.locator('text="Active Meal Plans"')).toBeVisible();
  });
});