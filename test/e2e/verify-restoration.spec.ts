import { test, expect } from '@playwright/test';

test.describe('Verify Responsive Restoration', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:4000/login');
  });

  test('Desktop layout uses max-w-7xl (1280px) container', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Login to see the layout
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/customer', { timeout: 10000 });

    // Check main content container width
    const mainContent = page.locator('main div.max-w-7xl').first();
    await expect(mainContent).toBeVisible();

    const box = await mainContent.boundingBox();
    if (box) {
      console.log(`Desktop container width: ${box.width}px`);
      // max-w-7xl is 1280px
      expect(box.width).toBeLessThanOrEqual(1280);
      expect(box.width).toBeGreaterThan(1200); // Should be close to max
    }

    // Check desktop header specifically (not mobile)
    const desktopHeader = page.locator('[data-testid="desktop-header"]');
    await expect(desktopHeader).toBeVisible();

    const headerContainer = page.locator('[data-testid="desktop-header"] div.max-w-7xl').first();
    await expect(headerContainer).toBeVisible();
  });

  test('Mobile navigation shows on mobile viewports', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Login to see navigation
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/customer', { timeout: 10000 });

    // Check mobile navigation is visible
    const mobileNav = page.locator('[data-testid="mobile-navigation"]');
    await expect(mobileNav).toBeVisible();

    // Check desktop header is hidden
    const desktopHeader = page.locator('[data-testid="desktop-header"]');
    await expect(desktopHeader).toBeHidden();
  });

  test('Tablet shows desktop navigation', async ({ page }) => {
    // Set tablet viewport (lg breakpoint starts at 1024px)
    await page.setViewportSize({ width: 1024, height: 768 });

    // Login to see navigation
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/customer', { timeout: 10000 });

    // Desktop header should be visible at lg breakpoint
    const desktopHeader = page.locator('[data-testid="desktop-header"]');
    await expect(desktopHeader).toBeVisible();

    // Mobile nav should be hidden
    const mobileNav = page.locator('[data-testid="mobile-navigation"]');
    await expect(mobileNav).toBeHidden();
  });

  test('No horizontal scroll on any viewport', async ({ page }) => {
    const viewports = [
      { width: 375, height: 667, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1920, height: 1080, name: 'Desktop' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);

      const hasScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(hasScroll).toBe(false);
      console.log(`${viewport.name}: No horizontal scroll ✓`);
    }
  });

  test('Forms are accessible on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');

    // All elements should be visible
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // Check touch targets
    const buttonBox = await submitButton.boundingBox();
    if (buttonBox) {
      // Should have reasonable touch target
      expect(buttonBox.height).toBeGreaterThanOrEqual(36);
      console.log(`Button height: ${buttonBox.height}px`);
    }
  });

  test('Content properly centered on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/customer', { timeout: 10000 });

    // Check that content is centered
    const mainContent = page.locator('main div.max-w-7xl').first();
    const box = await mainContent.boundingBox();

    if (box) {
      const leftSpace = box.x;
      const rightSpace = 1920 - (box.x + box.width);

      // Left and right space should be roughly equal (centered)
      const difference = Math.abs(leftSpace - rightSpace);
      expect(difference).toBeLessThan(50); // Allow small difference

      console.log(`Content centered: Left ${leftSpace}px, Right ${rightSpace}px`);
    }
  });

  test('Cards display in grid on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/customer', { timeout: 10000 });

    // Look for grid elements
    const grids = await page.locator('.grid, [class*="grid-cols"]').all();

    if (grids.length > 0) {
      for (const grid of grids) {
        const gridClass = await grid.getAttribute('class');
        console.log(`Found grid: ${gridClass}`);

        // Should have multi-column grid on desktop
        if (gridClass && gridClass.includes('grid')) {
          expect(gridClass).toMatch(/grid-cols-[2-9]|lg:grid-cols-[2-9]|xl:grid-cols-[2-9]/);
        }
      }
    }
  });

  test('Summary: All key features working', async ({ page }) => {
    const results = {
      desktopContainer: false,
      mobileNav: false,
      desktopNav: false,
      noScroll: false,
      formsWork: false,
      centered: false
    };

    // Test desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:4000/login');

    // Check no scroll
    results.noScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= document.documentElement.clientWidth;
    });

    // Check forms
    const submitButton = page.locator('button[type="submit"]');
    results.formsWork = await submitButton.isVisible();

    // Login first
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/customer', { timeout: 10000 });

    // Check desktop container after login
    const desktopContainer = page.locator('main div.max-w-7xl').first();
    results.desktopContainer = await desktopContainer.isVisible();

    // Test mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500); // Wait for viewport change

    // Check mobile nav
    const mobileNav = page.locator('[data-testid="mobile-navigation"]');
    results.mobileNav = await mobileNav.isVisible();

    // Test lg breakpoint
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(500); // Wait for viewport change

    // Check desktop nav
    const desktopHeader = page.locator('[data-testid="desktop-header"]');
    results.desktopNav = await desktopHeader.isVisible();

    // Check centering on desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500); // Wait for viewport change

    const mainContent = page.locator('main div.max-w-7xl').first();
    const box = await mainContent.boundingBox();

    if (box) {
      const leftSpace = box.x;
      const rightSpace = 1920 - (box.x + box.width);
      results.centered = Math.abs(leftSpace - rightSpace) < 50;
    }

    // Print results
    console.log('\n========== RESTORATION VERIFICATION ==========');
    console.log('Desktop Container (max-w-7xl):', results.desktopContainer ? '✅ PASS' : '❌ FAIL');
    console.log('Mobile Navigation on Mobile:', results.mobileNav ? '✅ PASS' : '❌ FAIL');
    console.log('Desktop Navigation on Desktop:', results.desktopNav ? '✅ PASS' : '❌ FAIL');
    console.log('No Horizontal Scroll:', results.noScroll ? '✅ PASS' : '❌ FAIL');
    console.log('Forms Accessible:', results.formsWork ? '✅ PASS' : '❌ FAIL');
    console.log('Content Centered:', results.centered ? '✅ PASS' : '❌ FAIL');
    console.log('==============================================\n');

    // All should pass
    Object.values(results).forEach(result => {
      expect(result).toBe(true);
    });
  });
});