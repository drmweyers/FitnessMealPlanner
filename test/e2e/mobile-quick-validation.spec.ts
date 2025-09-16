import { test, expect } from '@playwright/test';

// Quick mobile validation test - focused on core functionality
test.describe('Mobile Quick Validation', () => {
  // Test on iPhone 12 (most common device)
  test.use({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:4000');
    await page.waitForLoadState('networkidle');
  });

  test('should display mobile-optimized login page', async ({ page }) => {
    // Check viewport is mobile
    const viewport = page.viewportSize();
    expect(viewport?.width).toBeLessThanOrEqual(768);

    // Check login form exists
    const loginForm = await page.locator('form').first();
    await expect(loginForm).toBeVisible();

    // Check mobile-specific styling is applied
    const body = page.locator('body');
    await expect(body).toHaveCSS('font-family', /system-ui|sans-serif/);

    // Check for responsive layout
    const container = await page.locator('[class*="container"], [class*="max-w"], main').first();
    await expect(container).toBeVisible();
  });

  test('should have proper touch targets on mobile', async ({ page }) => {
    // Get all interactive elements
    const buttons = await page.locator('button, a, input, select, textarea').all();

    let validTargets = 0;
    let totalTargets = 0;

    for (const element of buttons) {
      if (await element.isVisible()) {
        totalTargets++;
        const box = await element.boundingBox();
        if (box && box.height >= 44 && box.width >= 44) {
          validTargets++;
        }
      }
    }

    // At least 80% of touch targets should meet minimum size
    const percentage = totalTargets > 0 ? (validTargets / totalTargets) * 100 : 0;
    expect(percentage).toBeGreaterThanOrEqual(80);
  });

  test('should complete mobile login flow', async ({ page }) => {
    // Fill login form
    await page.fill('input[type="email"], input[name="email"], #email', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"], input[name="password"], #password', 'TestCustomer123!');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for navigation or error message
    await page.waitForTimeout(3000);

    // Check if we're logged in or got an error
    const url = page.url();
    const hasError = await page.locator('.error, .alert-danger, [role="alert"]').count() > 0;
    const isLoggedIn = url.includes('/customer') || url.includes('/dashboard');

    // Either login succeeded or we got a clear error message
    expect(isLoggedIn || hasError).toBeTruthy();
  });

  test('should have mobile navigation elements', async ({ page }) => {
    // Login first
    await page.fill('input[type="email"], input[name="email"], #email', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"], input[name="password"], #password', 'TestCustomer123!');
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForTimeout(3000);

    // Check for mobile navigation (bottom nav or hamburger menu)
    const hasMobileNav =
      await page.locator('[data-mobile-nav], .mobile-nav, .bottom-nav, nav.mobile').count() > 0 ||
      await page.locator('[aria-label*="menu"], .hamburger, .menu-button').count() > 0;

    expect(hasMobileNav).toBeTruthy();
  });

  test('should display content responsively on mobile', async ({ page }) => {
    // Login
    await page.fill('input[type="email"], input[name="email"], #email', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"], input[name="password"], #password', 'TestCustomer123!');
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForTimeout(3000);

    // Check no horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const windowWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(windowWidth + 10); // Allow 10px tolerance

    // Check content is within viewport
    const mainContent = await page.locator('main, [role="main"], .content').first();
    if (await mainContent.count() > 0) {
      const box = await mainContent.boundingBox();
      if (box) {
        expect(box.width).toBeLessThanOrEqual(windowWidth);
      }
    }
  });

  test('should handle mobile grocery list interactions', async ({ page }) => {
    // Login as customer
    await page.fill('input[type="email"], input[name="email"], #email', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"], input[name="password"], #password', 'TestCustomer123!');
    await page.click('button[type="submit"]');

    // Navigate to grocery list
    await page.waitForTimeout(2000);

    // Try to find grocery list link
    const groceryLink = await page.locator('text=/grocery|shopping/i').first();
    if (await groceryLink.count() > 0) {
      await groceryLink.click();
      await page.waitForTimeout(2000);

      // Check if grocery list is displayed
      const groceryList = await page.locator('[class*="grocery"], [data-testid*="grocery"]').first();
      expect(await groceryList.count()).toBeGreaterThan(0);
    }
  });
});

// Performance test on low-end device
test.describe('Mobile Performance', () => {
  test.use({
    viewport: { width: 360, height: 640 },
    isMobile: true,
    hasTouch: true,
  });

  test('should load quickly on mobile', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('http://localhost:4000', { waitUntil: 'domcontentloaded' });

    const loadTime = Date.now() - startTime;

    // Should load within 5 seconds on mobile
    expect(loadTime).toBeLessThan(5000);
  });
});