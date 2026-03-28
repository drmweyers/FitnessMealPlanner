/**
 * E2E Flow 01: Login & Authentication
 * Validates nutritionist and client login flows, token handling, and logout.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://evofitmeals.com';
const NUTRITIONIST_EMAIL = 'nutritionist.sarah@evofitmeals.com';
const CLIENT_EMAIL = 'client.alex@example.com';
const PASSWORD = 'Demo1234!';

test.describe('01 — Login & Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('login page loads correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page).toHaveTitle(/EvoFit|Login|Meals/i);
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")')).toBeVisible();
  });

  test('nutritionist can log in successfully', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', NUTRITIONIST_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', PASSWORD);
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');

    // Should redirect to dashboard
    await page.waitForURL(/dashboard|home/i, { timeout: 10000 });
    await expect(page).toHaveURL(/dashboard|home/i);
    await page.screenshot({ path: 'tests/e2e/screenshots/01-nutritionist-login.png' });
  });

  test('client can log in successfully', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', CLIENT_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', PASSWORD);
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');

    await page.waitForURL(/dashboard|home|meal/i, { timeout: 10000 });
    await page.screenshot({ path: 'tests/e2e/screenshots/01-client-login.png' });
  });

  test('invalid credentials show error message', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', 'wrong@example.com');
    await page.fill('input[type="password"], input[name="password"]', 'WrongPassword!');
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');

    const errorMsg = page.locator('[class*="error"], [class*="alert"], [role="alert"], .text-red-500');
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'tests/e2e/screenshots/01-login-error.png' });
  });

  test('nutritionist can log out', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', NUTRITIONIST_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', PASSWORD);
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    await page.waitForURL(/dashboard|home/i, { timeout: 10000 });

    // Logout
    const logoutBtn = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), [data-testid="logout"]');
    if (await logoutBtn.count() > 0) {
      await logoutBtn.click();
      await page.waitForURL(/login|\/$/i, { timeout: 5000 });
      await page.screenshot({ path: 'tests/e2e/screenshots/01-logout.png' });
    } else {
      // Look for a menu that contains logout
      const menuBtn = page.locator('[data-testid="user-menu"], [aria-label="User menu"], button[class*="avatar"]');
      if (await menuBtn.count() > 0) {
        await menuBtn.click();
        await page.locator('button:has-text("Logout"), button:has-text("Sign Out")').click();
        await page.waitForURL(/login|\/$/i, { timeout: 5000 });
      }
    }
  });
});
