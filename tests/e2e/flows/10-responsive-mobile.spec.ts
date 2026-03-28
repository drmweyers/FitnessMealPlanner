/**
 * E2E Flow 10: Responsive & Mobile Layouts
 * Validates key pages render correctly on mobile viewport.
 */

import { test, expect, devices } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://evofitmeals.com';
const NUTRITIONIST_EMAIL = 'nutritionist.sarah@evofitmeals.com';
const PASSWORD = 'Demo1234!';

test.describe('10 — Responsive & Mobile', () => {
  test.use({ ...devices['iPhone 14'] });

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', NUTRITIONIST_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', PASSWORD);
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    await page.waitForURL(/dashboard|home/i, { timeout: 15000 });
  });

  test('login page is mobile-friendly', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput).toBeVisible();
    // Verify it fits in viewport (not overflowing)
    const box = await emailInput.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(430); // iPhone 14 width
    await page.screenshot({ path: 'tests/e2e/screenshots/10-mobile-login.png' });
  });

  test('dashboard renders on mobile', async ({ page }) => {
    await expect(page).not.toHaveURL(/login/i);
    await page.screenshot({ path: 'tests/e2e/screenshots/10-mobile-dashboard.png' });
    // No horizontal overflow
    const body = page.locator('body');
    const bodyWidth = (await body.boundingBox())?.width ?? 0;
    expect(bodyWidth).toBeLessThanOrEqual(430);
  });

  test('meal plans page renders on mobile', async ({ page }) => {
    await page.goto(`${BASE_URL}/meal-plans`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'tests/e2e/screenshots/10-mobile-meal-plans.png' });
    await expect(page).not.toHaveURL(/login/i);
  });

  test('recipe library renders on mobile', async ({ page }) => {
    await page.goto(`${BASE_URL}/recipes`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'tests/e2e/screenshots/10-mobile-recipes.png' });
    await expect(page).not.toHaveURL(/login/i);
  });

  test('mobile navigation menu works', async ({ page }) => {
    // Look for hamburger menu
    const hamburger = page.locator('[data-testid="hamburger"], button[aria-label*="menu" i], button[class*="hamburger"]');
    if (await hamburger.count() > 0) {
      await hamburger.click();
      const mobileNav = page.locator('[data-testid="mobile-nav"], [class*="mobile-menu"], [class*="drawer"]');
      if (await mobileNav.count() > 0) {
        await expect(mobileNav).toBeVisible();
      }
      await page.screenshot({ path: 'tests/e2e/screenshots/10-mobile-menu.png' });
    }
  });

  test('clients page renders on mobile', async ({ page }) => {
    await page.goto(`${BASE_URL}/clients`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'tests/e2e/screenshots/10-mobile-clients.png' });
    await expect(page).not.toHaveURL(/login/i);
  });
});
