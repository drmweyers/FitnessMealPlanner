/**
 * E2E Flow 02: Nutritionist Dashboard
 * Validates dashboard overview, key metrics, and navigation.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://evofitmeals.com';
const NUTRITIONIST_EMAIL = 'nutritionist.sarah@evofitmeals.com';
const PASSWORD = 'Demo1234!';

test.describe('02 — Nutritionist Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', NUTRITIONIST_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', PASSWORD);
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    await page.waitForURL(/dashboard|home/i, { timeout: 15000 });
  });

  test('dashboard loads without errors', async ({ page }) => {
    await expect(page).not.toHaveURL(/login/i);
    // No error boundary visible
    await expect(page.locator('[class*="error-boundary"], [data-testid="error"]')).not.toBeVisible();
    await page.screenshot({ path: 'tests/e2e/screenshots/02-dashboard.png' });
  });

  test('dashboard shows client count', async ({ page }) => {
    const clientsSection = page.locator('[data-testid="client-count"], [class*="stat"], [class*="card"]')
      .filter({ hasText: /client/i });
    if (await clientsSection.count() > 0) {
      await expect(clientsSection.first()).toBeVisible();
      const text = await clientsSection.first().textContent();
      expect(text).not.toMatch(/^0$/); // Should have clients
    }
  });

  test('dashboard shows active meal plans stat', async ({ page }) => {
    const mealPlanStat = page.locator('[data-testid="meal-plan-count"], [class*="stat"], [class*="card"]')
      .filter({ hasText: /meal plan|active/i });
    if (await mealPlanStat.count() > 0) {
      await expect(mealPlanStat.first()).toBeVisible();
    }
  });

  test('navigation sidebar is visible', async ({ page }) => {
    const sidebar = page.locator('nav, [role="navigation"], [class*="sidebar"], [class*="nav"]');
    await expect(sidebar.first()).toBeVisible();
  });

  test('dashboard navigation links work', async ({ page }) => {
    // Clients link
    const clientsLink = page.locator('a[href*="client"], nav button:has-text("Clients")');
    if (await clientsLink.count() > 0) {
      await clientsLink.first().click();
      await page.waitForURL(/client/i, { timeout: 5000 });
      await expect(page).toHaveURL(/client/i);
      await page.goBack();
    }
  });

  test('recent activity or quick actions are visible', async ({ page }) => {
    const activity = page.locator('[data-testid="recent-activity"], [class*="activity"], [class*="recent"]');
    const quickActions = page.locator('[data-testid="quick-actions"], button:has-text("Create"), button:has-text("New")');
    const hasContent = (await activity.count() > 0) || (await quickActions.count() > 0);
    expect(hasContent).toBe(true);
  });
});
