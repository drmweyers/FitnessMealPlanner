import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4000';
const CUSTOMER_EMAIL = 'customer.test@evofitmeals.com';
const CUSTOMER_PASSWORD = 'TestCustomer123!';

test.describe('Feature Removals Verification', () => {
  test('Progress Photos tab should be removed', async ({ page }) => {
    // Login as customer
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', CUSTOMER_EMAIL);
    await page.fill('input[type="password"]', CUSTOMER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/my-meal-plans', { timeout: 10000 });
    
    // Navigate to profile
    await page.click('a[href="/profile"]');
    await page.waitForURL('**/profile', { timeout: 10000 });
    
    // Click on Progress tab
    await page.click('text=Progress');
    
    // Wait for Progress Tracking to load
    await expect(page.locator('h2:has-text("Progress Tracking")')).toBeVisible({ timeout: 10000 });
    
    // Verify only 2 tabs exist (Measurements and Goals)
    const tabs = page.locator('[role="tablist"] button[role="tab"]');
    await expect(tabs).toHaveCount(2);
    
    // Verify Photos tab doesn't exist
    await expect(page.locator('button[role="tab"]:has-text("Progress Photos")')).not.toBeVisible();
    
    // Verify the two tabs that should exist
    await expect(page.locator('button[role="tab"]:has-text("Measurements")')).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("Goals")')).toBeVisible();
    
    // Verify Photos card is removed from stats
    await expect(page.locator('.card:has-text("Progress Photos")')).not.toBeVisible();
  });
  
  test('Meal Prep Calendar should be removed from Customer dashboard', async ({ page }) => {
    // Login as customer
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', CUSTOMER_EMAIL);
    await page.fill('input[type="password"]', CUSTOMER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/my-meal-plans', { timeout: 10000 });
    
    // Verify Meal Prep Calendar card doesn't exist
    await expect(page.locator('h3:has-text("Meal Prep Calendar")')).not.toBeVisible();
    
    // Verify navigation link doesn't exist
    await expect(page.locator('a[href="/meal-prep"]')).not.toBeVisible();
    await expect(page.locator('a[href="/meal-prep-calendar"]')).not.toBeVisible();
  });
  
  test('Direct navigation to removed routes should fail', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', CUSTOMER_EMAIL);
    await page.fill('input[type="password"]', CUSTOMER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/my-meal-plans', { timeout: 10000 });
    
    // Try to navigate to /meal-prep
    await page.goto(`${BASE_URL}/meal-prep`);
    
    // Should not stay on that URL
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/meal-prep');
    
    // Try to navigate to /meal-prep-calendar
    await page.goto(`${BASE_URL}/meal-prep-calendar`);
    
    // Should not stay on that URL either
    const currentUrl2 = page.url();
    expect(currentUrl2).not.toContain('/meal-prep-calendar');
  });
  
  test('Quick Actions section should be removed from Customer Profile', async ({ page }) => {
    // Login as customer
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', CUSTOMER_EMAIL);
    await page.fill('input[type="password"]', CUSTOMER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/my-meal-plans', { timeout: 10000 });
    
    // Navigate to profile
    await page.click('a[href="/profile"]');
    await page.waitForURL('**/profile', { timeout: 10000 });
    
    // Verify Quick Actions section doesn't exist
    await expect(page.locator('text="Quick Actions"')).not.toBeVisible();
    
    // Verify "Rate Meal Plans" button doesn't exist
    await expect(page.locator('text="Rate Meal Plans"')).not.toBeVisible();
    
    // Verify "View Progress" button in Quick Actions context doesn't exist
    const quickActionsCard = page.locator('.card:has(text="Quick Actions")');
    await expect(quickActionsCard).not.toBeVisible();
    
    // Verify other expected sections still exist
    await expect(page.locator('text="Active Meal Plans"')).toBeVisible();
    await expect(page.locator('text="Account Info"')).toBeVisible();
  });
  
  test('Goals tab should be functional', async ({ page }) => {
    // Login as customer
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', CUSTOMER_EMAIL);
    await page.fill('input[type="password"]', CUSTOMER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/my-meal-plans', { timeout: 10000 });
    
    // Navigate to profile
    await page.click('a[href="/profile"]');
    await page.waitForURL('**/profile', { timeout: 10000 });
    
    // Click on Progress tab
    await page.click('text=Progress');
    
    // Wait for Progress Tracking to load
    await expect(page.locator('h2:has-text("Progress Tracking")')).toBeVisible({ timeout: 10000 });
    
    // Click on Goals tab
    await page.click('button[role="tab"]:has-text("Goals")');
    
    // Verify Goals content is visible
    await expect(page.locator('text=Fitness Goals')).toBeVisible({ timeout: 10000 });
    
    // Verify Add Goal button exists
    await expect(page.locator('button:has-text("Add Goal")')).toBeVisible();
  });
});