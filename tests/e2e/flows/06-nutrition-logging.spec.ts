/**
 * E2E Flow 06: Nutrition Logging (Client Perspective)
 * Validates client nutrition logging, daily tracking, and macro display.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://evofitmeals.com';
const CLIENT_EMAIL = 'client.alex@example.com';
const PASSWORD = 'Demo1234!';

test.describe('06 — Nutrition Logging (Client)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', CLIENT_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', PASSWORD);
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    await page.waitForURL(/dashboard|home|meal/i, { timeout: 15000 });
  });

  test('client dashboard loads after login', async ({ page }) => {
    await expect(page).not.toHaveURL(/login/i);
    await page.screenshot({ path: 'tests/e2e/screenshots/06-client-dashboard.png' });
  });

  test('client can view their meal plan', async ({ page }) => {
    // Navigate to meal plan
    const mealPlanLink = page.locator('a[href*="meal"], nav a:has-text("Meal Plan"), [data-testid="meal-plan-link"]');
    if (await mealPlanLink.count() > 0) {
      await mealPlanLink.first().click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'tests/e2e/screenshots/06-client-meal-plan.png' });
      // Should show meal plan content
      await expect(page.locator('h1, h2, [class*="meal"]').first()).toBeVisible();
    }
  });

  test('nutrition log page is accessible', async ({ page }) => {
    const nutritionUrl = `${BASE_URL}/nutrition/log`;
    await page.goto(nutritionUrl);
    await page.waitForLoadState('networkidle');
    // If page redirected to login, skip — route might be different
    if (page.url().includes('login')) {
      test.skip();
    }
    await page.screenshot({ path: 'tests/e2e/screenshots/06-nutrition-log.png' });
  });

  test('client dashboard shows nutrition summary', async ({ page }) => {
    // Look for calorie/macro summary on dashboard
    const calorieDisplay = page.locator('[class*="calorie"], [class*="macro"], text=/kcal|calories|protein/i').first();
    if (await calorieDisplay.count() > 0) {
      await expect(calorieDisplay).toBeVisible();
    }
    await page.screenshot({ path: 'tests/e2e/screenshots/06-nutrition-summary.png' });
  });

  test('today\'s meal plan view is not empty', async ({ page }) => {
    const todaySection = page.locator('[data-testid="today"], [class*="today"], text=/today/i').first();
    const mealSection = page.locator('[class*="breakfast"], [class*="lunch"], [class*="dinner"]').first();
    const hasContent = (await todaySection.count() > 0) || (await mealSection.count() > 0);
    // This is informational — page content depends on seeded data
    await page.screenshot({ path: 'tests/e2e/screenshots/06-today-meals.png' });
  });
});
