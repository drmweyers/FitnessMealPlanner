/**
 * Full Width Layout Tests for Laptop and Desktop Screens
 * Ensures the app uses the full width of the screen appropriately
 */

import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: 'customer.test@evofitmeals.com',
  password: 'TestCustomer123!'
};

test.describe('Full Width Layout on Laptop Screens', () => {
  test('should use at least 80% of screen width on 1440px laptop', async ({ page }) => {
    // Set laptop viewport (common laptop resolution)
    await page.setViewportSize({ width: 1440, height: 900 });

    // Navigate to login
    await page.goto('/login');

    // Login
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForURL(/\/customer/, { timeout: 10000 });

    // Get the main content container width
    const mainContainer = await page.locator('main > div').first();
    const containerBox = await mainContainer.boundingBox();

    console.log(`Screen width: 1440px, Container width: ${containerBox?.width}px`);

    // Container should use at least 80% of the screen width
    // The container includes padding, so actual content width is less
    expect(containerBox?.width).toBeGreaterThan(1152); // 80% of 1440

    // Check that it's not limited to 1280px (old max-w-7xl)
    expect(containerBox?.width).toBeGreaterThan(1280);

    // Take screenshot for visual verification
    await page.screenshot({
      path: 'test-results/laptop-1440px-layout.png',
      fullPage: false
    });
  });

  test('should use at least 80% of screen width on 1920px desktop', async ({ page }) => {
    // Set full HD desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Navigate and login
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/customer/, { timeout: 10000 });

    // Get container dimensions
    const mainContainer = await page.locator('main > div').first();
    const containerBox = await mainContainer.boundingBox();

    console.log(`Screen width: 1920px, Container width: ${containerBox?.width}px`);

    // Should use at least 80% of 1920px = 1536px
    // Actual rendered width should be close to screen width minus scrollbar
    expect(containerBox?.width).toBeGreaterThan(1500); // Allow for scrollbar

    // Should not be limited to old 1280px max
    expect(containerBox?.width).toBeGreaterThan(1280);

    // Take screenshot
    await page.screenshot({
      path: 'test-results/desktop-1920px-layout.png',
      fullPage: false
    });
  });

  test('should handle 1366px laptop screens properly', async ({ page }) => {
    // Common laptop resolution
    await page.setViewportSize({ width: 1366, height: 768 });

    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/customer/, { timeout: 10000 });

    const mainContainer = await page.locator('main > div').first();
    const containerBox = await mainContainer.boundingBox();

    console.log(`Screen width: 1366px, Container width: ${containerBox?.width}px`);

    // Should use at least 80% of 1366px = 1093px
    expect(containerBox?.width).toBeGreaterThan(1093);

    // Should exceed old 1280px limit
    expect(containerBox?.width).toBeGreaterThan(1280);
  });

  test('should handle ultra-wide 2560px screens with reasonable max-width', async ({ page }) => {
    // Ultra-wide monitor
    await page.setViewportSize({ width: 2560, height: 1440 });

    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/customer/, { timeout: 10000 });

    const mainContainer = await page.locator('main > div').first();
    const containerBox = await mainContainer.boundingBox();

    console.log(`Screen width: 2560px, Container width: ${containerBox?.width}px`);

    // Should be capped at 1920px for ultra-wide to maintain readability
    expect(containerBox?.width).toBeLessThanOrEqual(1920);
    expect(containerBox?.width).toBeGreaterThan(1500); // Should be wide but capped

    await page.screenshot({
      path: 'test-results/ultrawide-2560px-layout.png',
      fullPage: false
    });
  });

  test('should apply same width to header, main, and footer', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/customer/, { timeout: 10000 });

    // Get all major layout containers
    const headerContainer = await page.locator('header > div').first().boundingBox();
    const mainContainer = await page.locator('main > div').first().boundingBox();
    const footerContainer = await page.locator('footer > div').first().boundingBox();

    console.log('Container widths:', {
      header: headerContainer?.width,
      main: mainContainer?.width,
      footer: footerContainer?.width
    });

    // All should have the same width for consistent layout
    expect(headerContainer?.width).toBe(mainContainer?.width);
    expect(mainContainer?.width).toBe(footerContainer?.width);

    // All should be wider than old constraint
    expect(headerContainer?.width).toBeGreaterThan(1280);
  });

  test('should not break mobile layout (verification test)', async ({ page }) => {
    // Verify mobile still works
    await page.setViewportSize({ width: 375, height: 812 });

    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/customer/, { timeout: 10000 });

    // Mobile navigation should be visible
    const mobileNav = page.locator('[data-testid="mobile-navigation"]');
    await expect(mobileNav).toBeVisible();

    // Container should use full mobile width minus padding
    const mainContainer = await page.locator('main > div').first();
    const containerBox = await mainContainer.boundingBox();

    // Mobile should use nearly full width (375 - padding)
    expect(containerBox?.width).toBeGreaterThan(340);
    expect(containerBox?.width).toBeLessThan(376);
  });
});

test.describe('Visual Layout Consistency', () => {
  test('content should be centered on all screen sizes', async ({ page }) => {
    const viewports = [
      { width: 1366, height: 768, name: 'laptop' },
      { width: 1440, height: 900, name: 'laptop-hd' },
      { width: 1920, height: 1080, name: 'full-hd' },
      { width: 2560, height: 1440, name: 'ultra-wide' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);

      await page.goto('/login');
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');

      await page.waitForURL(/\/customer/, { timeout: 10000 });

      const mainContainer = await page.locator('main > div').first();
      const containerBox = await mainContainer.boundingBox();

      if (containerBox) {
        const leftMargin = containerBox.x;
        const rightMargin = viewport.width - (containerBox.x + containerBox.width);

        console.log(`${viewport.name}: Left margin: ${leftMargin}px, Right margin: ${rightMargin}px`);

        // Content should be centered (margins should be roughly equal)
        expect(Math.abs(leftMargin - rightMargin)).toBeLessThan(5);
      }
    }
  });

  test('should have proper padding on all screen sizes', async ({ page }) => {
    const viewports = [
      { width: 1366, height: 768 },
      { width: 1920, height: 1080 },
      { width: 2560, height: 1440 }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);

      await page.goto('/login');
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');

      await page.waitForURL(/\/customer/, { timeout: 10000 });

      // Check that content has proper padding from edges
      const mainContainer = await page.locator('main > div').first();
      const styles = await mainContainer.evaluate(el =>
        window.getComputedStyle(el)
      );

      // Should have at least 32px padding on large screens
      const paddingLeft = parseFloat(styles.paddingLeft);
      const paddingRight = parseFloat(styles.paddingRight);

      console.log(`Viewport ${viewport.width}px - Padding: ${paddingLeft}px left, ${paddingRight}px right`);

      expect(paddingLeft).toBeGreaterThanOrEqual(24); // At least 1.5rem
      expect(paddingRight).toBeGreaterThanOrEqual(24);
    }
  });
});