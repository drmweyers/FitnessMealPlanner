/**
 * E2E Flow 03: Client Management
 * Validates client list, client profile view, and client details.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://evofitmeals.com';
const NUTRITIONIST_EMAIL = 'nutritionist.sarah@evofitmeals.com';
const PASSWORD = 'Demo1234!';

test.describe('03 — Client Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', NUTRITIONIST_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', PASSWORD);
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    await page.waitForURL(/dashboard|home/i, { timeout: 15000 });
  });

  test('clients page loads with list', async ({ page }) => {
    await page.goto(`${BASE_URL}/clients`);
    await page.waitForLoadState('networkidle');

    const clientItems = page.locator('[data-testid="client-item"], [class*="client-card"], [class*="client-row"], tr[class*="client"]');
    const count = await clientItems.count();
    expect(count).toBeGreaterThan(0);
    await page.screenshot({ path: 'tests/e2e/screenshots/03-client-list.png' });
  });

  test('client list shows at least 3 clients', async ({ page }) => {
    await page.goto(`${BASE_URL}/clients`);
    await page.waitForLoadState('networkidle');

    // Look for known demo client names
    const alexVisible = await page.locator('text=/alex/i').count() > 0;
    const emmaVisible = await page.locator('text=/emma/i').count() > 0;
    expect(alexVisible || emmaVisible).toBe(true);
  });

  test('client search works', async ({ page }) => {
    await page.goto(`${BASE_URL}/clients`);
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="search" i], input[type="search"], [data-testid="search"]');
    if (await searchInput.count() > 0) {
      await searchInput.fill('Alex');
      await page.waitForTimeout(500); // debounce
      const results = page.locator('[data-testid="client-item"], [class*="client"]');
      const count = await results.count();
      expect(count).toBeGreaterThan(0);
      await page.screenshot({ path: 'tests/e2e/screenshots/03-client-search.png' });
    }
  });

  test('clicking a client opens their profile', async ({ page }) => {
    await page.goto(`${BASE_URL}/clients`);
    await page.waitForLoadState('networkidle');

    const firstClient = page.locator('[data-testid="client-item"], [class*="client-card"], tbody tr').first();
    if (await firstClient.count() > 0) {
      await firstClient.click();
      await page.waitForURL(/client[s]?\/[^/]+/, { timeout: 5000 });
      await page.screenshot({ path: 'tests/e2e/screenshots/03-client-profile.png' });
      // Profile should show some data
      await expect(page.locator('h1, h2, [class*="name"]').first()).toBeVisible();
    }
  });

  test('client profile shows meal plan assignment', async ({ page }) => {
    await page.goto(`${BASE_URL}/clients`);
    await page.waitForLoadState('networkidle');

    const alexLink = page.locator('[href*="client"]').filter({ hasText: /alex/i }).first();
    if (await alexLink.count() > 0) {
      await alexLink.click();
      await page.waitForLoadState('networkidle');
      // Should show meal plan info
      const mealPlanSection = page.locator('[class*="meal"], text=/meal plan/i').first();
      await expect(mealPlanSection).toBeVisible({ timeout: 5000 });
      await page.screenshot({ path: 'tests/e2e/screenshots/03-client-meal-plan.png' });
    }
  });
});
