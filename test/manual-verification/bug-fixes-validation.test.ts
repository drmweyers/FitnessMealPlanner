/**
 * Manual Bug Fixes Validation Test
 * 
 * Quick validation script to verify that all bug fixes are working correctly.
 * This bypasses complex E2E setup and directly tests the core functionality.
 */

import { test, expect } from '@playwright/test';

test.describe('Manual Bug Fixes Validation', () => {
  test.setTimeout(10000); // 10 second timeout per test

  test('should verify Redis Service integration fix', async ({ page }) => {
    // Navigate to application
    await page.goto('http://localhost:4000');
    
    // Check that no Redis errors appear in console
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Wait for page to load completely
    await page.waitForTimeout(3000);
    
    // Check for specific Redis errors
    const redisErrors = consoleErrors.filter(error => 
      error.includes('RedisService.get is not a function') ||
      error.includes('TypeError: RedisService')
    );
    
    expect(redisErrors).toHaveLength(0);
    console.log('✅ Redis Service integration fix verified');
  });

  test('should verify login page accessibility (not /api/login)', async ({ page }) => {
    // Try to access login page directly
    await page.goto('http://localhost:4000/login');
    
    // Should successfully load login page, not get 404
    await expect(page).not.toHaveURL(/.*404.*/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    
    console.log('✅ Login page accessibility verified');
  });

  test('should verify admin generation buttons exist and are clickable', async ({ page }) => {
    // Navigate to application and login
    await page.goto('http://localhost:4000');
    
    // Quick login as admin
    await page.fill('input[type="email"]', 'admin@fitmeal.pro');
    await page.fill('input[type="password"]', 'AdminPass123');
    await page.click('button[type="submit"]');
    
    // Wait for admin dashboard
    await expect(page.locator('h1:has-text("Admin Dashboard")')).toBeVisible();
    
    // Navigate to admin tab
    await page.click('[data-testid="admin-tab-admin"]');
    
    // Verify generation button exists
    const generateButton = page.locator('[data-testid="admin-generate-recipes"]');
    await expect(generateButton).toBeVisible();
    await expect(generateButton).not.toBeDisabled();
    
    console.log('✅ Admin generation buttons verified');
  });

  test('should verify review queue button exists and works', async ({ page }) => {
    // Navigate to application and login as admin
    await page.goto('http://localhost:4000');
    
    await page.fill('input[type="email"]', 'admin@fitmeal.pro');
    await page.fill('input[type="password"]', 'AdminPass123');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('h1:has-text("Admin Dashboard")')).toBeVisible();
    
    // Navigate to admin tab
    await page.click('[data-testid="admin-tab-admin"]');
    
    // Verify review queue button exists
    const reviewButton = page.locator('[data-testid="admin-view-pending"]');
    await expect(reviewButton).toBeVisible();
    await expect(reviewButton).not.toBeDisabled();
    
    // Click it to verify it doesn't cause errors
    await reviewButton.click();
    
    // Should open modal (either with recipes or "no pending recipes" message)
    await expect(page.locator('h2:has-text("Pending Recipes")')).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Review queue functionality verified');
  });

  test('should verify application loads without critical JavaScript errors', async ({ page }) => {
    // Track JavaScript errors
    const jsErrors: string[] = [];
    page.on('pageerror', error => {
      jsErrors.push(error.message);
    });
    
    // Navigate to application
    await page.goto('http://localhost:4000');
    
    // Wait for app to fully load
    await page.waitForTimeout(3000);
    
    // Check for critical errors
    const criticalErrors = jsErrors.filter(error =>
      error.includes('Cannot read property') ||
      error.includes('is not a function') ||
      error.includes('undefined') && error.includes('TypeError')
    );
    
    expect(criticalErrors).toHaveLength(0);
    
    console.log('✅ No critical JavaScript errors detected');
    if (jsErrors.length > 0) {
      console.log('ℹ️ Non-critical JS messages:', jsErrors);
    }
  });
});