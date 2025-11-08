// E2E Tests: Tier Upgrades and Recipe Access - Part of BMAD 3-Tier System Test Suite

import { test, expect } from '@playwright/test';

/**
 * BMAD 3-Tier System - E2E Test Suite
 * Tests tier upgrade workflows and recipe access differentiation
 *
 * Coverage: Story 2.14, Story 2.5, Progressive access, Recipe enforcement
 * Status: Story 2.14 implementation complete - tests enabled
 */

test.describe('Tier Upgrade Workflows', () => {
  test('should display current tier and upgrade options', async ({ page }) => {
    await page.goto('http://localhost:4000');
    await page.fill('[name="email"]', 'trainer.starter@test.com');
    await page.fill('[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    
    await page.click('[data-testid="settings-link"]');
    await expect(page.locator('[data-testid="current-tier-badge"]')).toContainText('Starter');
    await expect(page.locator('[data-testid="upgrade-to-professional"]')).toBeVisible();
  });

  test('should calculate correct upgrade price from Starter to Professional', async ({ page }) => {
    await page.goto('http://localhost:4000');
    await page.fill('[name="email"]', 'trainer.starter@test.com');
    await page.fill('[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    
    await page.click('[data-testid="upgrade-to-professional"]');
    await expect(page.locator('[data-testid="upgrade-price"]')).toContainText('$100');
  });
});

test.describe('Recipe Access - Starter Tier', () => {
  test('should see exactly 1,000 recipes', async ({ page }) => {
    await page.goto('http://localhost:4000');
    await page.fill('[name="email"]', 'trainer.starter@test.com');
    await page.fill('[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    
    await page.click('[data-testid="recipes-link"]');
    await expect(page.locator('[data-testid="recipe-count"]')).toContainText('1,000');
  });

  test('should display 5 meal types only', async ({ page }) => {
    await page.goto('http://localhost:4000');
    await page.fill('[name="email"]', 'trainer.starter@test.com');
    await page.fill('[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    
    await page.click('[data-testid="meal-plans-link"]');
    await page.click('[data-testid="meal-type-dropdown"]');
    const mealTypes = page.locator('[data-testid^="meal-type-option-"]');
    await expect(mealTypes).toHaveCount(5);
  });
});

test.describe('Recipe Access - Professional Tier', () => {
  test('should see exactly 2,500 recipes', async ({ page }) => {
    await page.goto('http://localhost:4000');
    await page.fill('[name="email"]', 'trainer.professional@test.com');
    await page.fill('[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    
    await page.click('[data-testid="recipes-link"]');
    await expect(page.locator('[data-testid="recipe-count"]')).toContainText('2,500');
  });

  test('should display 10 meal types', async ({ page }) => {
    await page.goto('http://localhost:4000');
    await page.fill('[name="email"]', 'trainer.professional@test.com');
    await page.fill('[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    
    await page.click('[data-testid="meal-plans-link"]');
    await page.click('[data-testid="meal-type-dropdown"]');
    const mealTypes = page.locator('[data-testid^="meal-type-option-"]');
    await expect(mealTypes).toHaveCount(10);
  });
});

test.describe('Recipe Access - Enterprise Tier', () => {
  test('should see exactly 4,000 recipes', async ({ page }) => {
    await page.goto('http://localhost:4000');
    await page.fill('[name="email"]', 'trainer.enterprise@test.com');
    await page.fill('[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    
    await page.click('[data-testid="recipes-link"]');
    await expect(page.locator('[data-testid="recipe-count"]')).toContainText('4,000');
  });

  test('should display 17 meal types', async ({ page }) => {
    await page.goto('http://localhost:4000');
    await page.fill('[name="email"]', 'trainer.enterprise@test.com');
    await page.fill('[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    
    await page.click('[data-testid="meal-plans-link"]');
    await page.click('[data-testid="meal-type-dropdown"]');
    const mealTypes = page.locator('[data-testid^="meal-type-option-"]');
    await expect(mealTypes).toHaveCount(17);
  });
});

/**
 * Test Execution Notes:
 * 1. Remove .skip() after implementing Stories 2.14 and 2.15
 * 2. Run with: npx playwright test test/e2e/tier-system/
 * 3. Requires 6 test accounts (2 per tier)
 * 4. Requires seeded recipes with tier assignments
 */
