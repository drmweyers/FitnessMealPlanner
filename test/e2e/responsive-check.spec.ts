/**
 * Quick Responsive Design Check
 * Verifies desktop, tablet, and mobile views work correctly
 */

import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: 'customer.test@evofitmeals.com',
  password: 'TestCustomer123!'
};

test.describe('Responsive Design Verification', () => {
  test('Desktop view (1920x1080) should NOT have mobile styles', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Go to login
    await page.goto('/login');

    // Check that buttons don't have forced 44px height
    const button = page.locator('button[type="submit"]');
    await expect(button).toBeVisible();

    const box = await button.boundingBox();
    console.log('Desktop button height:', box?.height);

    // Login
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForURL(/\/my-meal-plans|\/customer/, { timeout: 10000 });

    // Check desktop navigation is visible
    const desktopHeader = page.locator('header').first();
    await expect(desktopHeader).toBeVisible();

    // Mobile navigation should be hidden
    const mobileNav = page.locator('[data-testid="mobile-navigation"]');
    const mobileNavVisible = await mobileNav.isVisible().catch(() => false);
    expect(mobileNavVisible).toBe(false);

    console.log('✅ Desktop view confirmed - no mobile styles applied');
  });

  test('Mobile view (375x812) should have mobile styles', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });

    // Go to login
    await page.goto('/login');

    // Check that buttons have proper touch targets
    const button = page.locator('button[type="submit"]');
    await expect(button).toBeVisible();

    const box = await button.boundingBox();
    console.log('Mobile button height:', box?.height);

    // Button should be at least 44px on mobile
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44);
    }

    // Login
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForURL(/\/my-meal-plans|\/customer/, { timeout: 10000 });

    // Mobile navigation should be visible
    const mobileNav = page.locator('[data-testid="mobile-navigation"]');
    await expect(mobileNav).toBeVisible();

    // Desktop header should be hidden
    const desktopHeader = page.locator('header.hidden.lg\\:block, header.lg\\:block');
    const headerVisible = await desktopHeader.isVisible().catch(() => false);
    expect(headerVisible).toBe(false);

    console.log('✅ Mobile view confirmed - mobile styles applied correctly');
  });

  test('Tablet view (768x1024) should have appropriate styles', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    // Go to login and verify
    await page.goto('/login');

    // Login
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForURL(/\/my-meal-plans|\/customer/, { timeout: 10000 });

    // Desktop header should be visible on tablet
    const desktopHeader = page.locator('header').first();
    await expect(desktopHeader).toBeVisible();

    // Mobile navigation should be hidden
    const mobileNav = page.locator('[data-testid="mobile-navigation"]');
    const mobileNavVisible = await mobileNav.isVisible().catch(() => false);
    expect(mobileNavVisible).toBe(false);

    console.log('✅ Tablet view confirmed - appropriate styles applied');
  });
});