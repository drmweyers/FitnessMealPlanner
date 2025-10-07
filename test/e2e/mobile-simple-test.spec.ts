import { test, expect } from '@playwright/test';

// Test with mobile viewport
test.use({
  viewport: { width: 375, height: 812 },
  isMobile: true,
  hasTouch: true,
});

test.describe('Simple Mobile UI Verification', () => {
  test('Should load customer login page', async ({ page }) => {
    await page.goto('http://localhost:4000/login');

    // Check if login form is visible
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
  });

  test('Should login as customer and navigate to dashboard', async ({ page }) => {
    await page.goto('http://localhost:4000/login');

    // Fill login form
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForURL('**/customer', { timeout: 15000 });

    // Check if we're on customer dashboard
    expect(page.url()).toContain('/customer');
  });

  test('Should display customer dashboard content', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/customer', { timeout: 15000 });

    // Check for dashboard elements
    const dashboardTitle = page.locator('h1:has-text("My Fitness Dashboard")');
    await expect(dashboardTitle).toBeVisible();

    // Check for tabs
    const mealPlansTab = page.locator('[role="tab"]:has-text("Meal Plans")');
    await expect(mealPlansTab).toBeVisible();

    const progressTab = page.locator('[role="tab"]:has-text("Progress")');
    await expect(progressTab).toBeVisible();
  });

  test('Should switch between tabs', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/customer', { timeout: 15000 });

    // Click on Progress tab
    const progressTab = page.locator('[role="tab"]:has-text("Progress")');
    await progressTab.click();

    // Check if Progress content is visible
    const progressHeading = page.locator('h2:has-text("Progress Tracking")');
    await expect(progressHeading).toBeVisible({ timeout: 10000 });

    // Click back to Meal Plans tab
    const mealPlansTab = page.locator('[role="tab"]:has-text("Meal Plans")');
    await mealPlansTab.click();

    // Check if we're back on meal plans
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });
  });

  test('Should open Add Measurement modal without positioning issues', async ({ page }) => {
    // Login and navigate to progress tab
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/customer', { timeout: 15000 });

    // Navigate to progress tab
    const progressTab = page.locator('[role="tab"]:has-text("Progress")');
    await progressTab.click();

    // Wait for progress content to load
    await page.waitForSelector('h2:has-text("Progress Tracking")', { timeout: 10000 });

    // Click Add Measurement button
    const addButton = page.locator('button:has-text("Add Measurement")');
    await expect(addButton).toBeVisible();
    await addButton.click();

    // Check if modal opens and is positioned correctly
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Get modal position
    const modalBox = await modal.boundingBox();
    if (modalBox) {
      // Modal should be within viewport bounds
      expect(modalBox.x).toBeGreaterThanOrEqual(0);
      expect(modalBox.y).toBeGreaterThanOrEqual(0);

      // Modal should not be stuck in top-left corner
      expect(modalBox.x + modalBox.y).toBeGreaterThan(20);

      console.log(`Modal position: x=${modalBox.x}, y=${modalBox.y}, width=${modalBox.width}, height=${modalBox.height}`);
    }

    // Close modal
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });
});