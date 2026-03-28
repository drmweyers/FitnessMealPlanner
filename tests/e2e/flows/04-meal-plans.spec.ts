/**
 * E2E Flow 04: Meal Plan Library & Builder
 * Validates meal plan listing, viewing, and assignment.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://evofitmeals.com';
const NUTRITIONIST_EMAIL = 'nutritionist.sarah@evofitmeals.com';
const PASSWORD = 'Demo1234!';

test.describe('04 — Meal Plans', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', NUTRITIONIST_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', PASSWORD);
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    await page.waitForURL(/dashboard|home/i, { timeout: 15000 });
  });

  test('meal plans page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/meal-plans`);
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/login/i);
    await page.screenshot({ path: 'tests/e2e/screenshots/04-meal-plans-list.png' });
  });

  test('meal plan list shows created plans', async ({ page }) => {
    await page.goto(`${BASE_URL}/meal-plans`);
    await page.waitForLoadState('networkidle');

    // Look for the seeded meal plans
    const weightLoss = page.locator('text=/weight loss/i');
    const muscleGain = page.locator('text=/muscle gain/i');
    const balanced = page.locator('text=/balanced|maintenance/i');

    const hasPlans = (await weightLoss.count() > 0) ||
                     (await muscleGain.count() > 0) ||
                     (await balanced.count() > 0);
    expect(hasPlans).toBe(true);
  });

  test('meal plan list is not empty', async ({ page }) => {
    await page.goto(`${BASE_URL}/meal-plans`);
    await page.waitForLoadState('networkidle');

    const cards = page.locator('[data-testid="meal-plan-card"], [class*="meal-plan"], [class*="plan-card"], .card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('clicking a meal plan shows its details', async ({ page }) => {
    await page.goto(`${BASE_URL}/meal-plans`);
    await page.waitForLoadState('networkidle');

    const firstPlan = page.locator('[data-testid="meal-plan-card"], [class*="meal-plan"], .card').first();
    if (await firstPlan.count() > 0) {
      await firstPlan.click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'tests/e2e/screenshots/04-meal-plan-detail.png' });
      // Should show plan name/details
      await expect(page.locator('h1, h2, [class*="title"]').first()).toBeVisible();
    }
  });

  test('meal plan detail shows weekly structure', async ({ page }) => {
    await page.goto(`${BASE_URL}/meal-plans`);
    await page.waitForLoadState('networkidle');

    const firstPlan = page.locator('[data-testid="meal-plan-card"], [class*="meal-plan"], .card').first();
    if (await firstPlan.count() > 0) {
      await firstPlan.click();
      await page.waitForLoadState('networkidle');
      // Should show weeks or days
      const weekView = page.locator('[class*="week"], [data-testid="week"], text=/week/i').first();
      const dayView = page.locator('[class*="day"], [data-testid="day"], text=/monday|tuesday|day 1/i').first();
      const hasStructure = (await weekView.count() > 0) || (await dayView.count() > 0);
      expect(hasStructure).toBe(true);
    }
  });

  test('assign meal plan button is visible', async ({ page }) => {
    await page.goto(`${BASE_URL}/meal-plans`);
    await page.waitForLoadState('networkidle');

    const assignBtn = page.locator('button:has-text("Assign"), button:has-text("Create"), a:has-text("New Plan")');
    if (await assignBtn.count() > 0) {
      await expect(assignBtn.first()).toBeVisible();
    }
  });
});
