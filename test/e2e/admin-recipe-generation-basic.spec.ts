/**
 * Basic Admin Recipe Generation E2E Tests
 * 
 * Simplified version for initial verification
 */

import { test, expect } from '@playwright/test';

const ADMIN_CREDENTIALS = {
  email: 'admin@fitmeal.pro',
  password: 'Admin123!@#'
};

test.describe('Admin Recipe Generation - Basic Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses to prevent actual generation
    await page.route('**/api/admin/generate**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Generation started successfully',
          count: 10,
          started: true,
          success: 10,
          failed: 0,
          errors: []
        })
      });
    });

    await page.route('**/api/admin/stats**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total: 150,
          approved: 145,
          pending: 5,
          users: 25
        })
      });
    });
  });

  test('1. Login as Admin and Access Recipe Generation', async ({ page }) => {
    // Navigate to login
    await page.goto('/login');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // Login
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    // Wait for redirect to admin
    await page.waitForURL('**/admin**', { timeout: 15000 });
    
    // Verify we're on admin page
    await expect(page.locator('h1')).toContainText(/Admin/i);
    
    // Take screenshot
    await page.screenshot({ path: 'test-screenshots/admin-dashboard.png' });
  });

  test('2. Open Recipe Generation Modal', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin**', { timeout: 15000 });
    
    // Click Admin tab
    const adminTab = page.locator('button:has-text("Admin")').first();
    await adminTab.click();
    
    // Wait for admin content
    await page.waitForTimeout(2000);
    
    // Look for generate button
    const generateButton = page.locator('button:has-text("Generate")').first();
    await generateButton.click();
    
    // Wait for modal
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ path: 'test-screenshots/generation-modal.png' });
  });

  test('3. Test Basic Recipe Generation', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin**', { timeout: 15000 });
    
    // Navigate to Admin tab
    await page.click('button:has-text("Admin")');
    await page.waitForTimeout(2000);
    
    // Click generate button
    await page.click('button:has-text("Generate")');
    await page.waitForTimeout(3000);
    
    // Look for generation form or buttons
    const quickGenButton = page.locator('button:has-text("Random"), button:has-text("Quick")').first();
    if (await quickGenButton.isVisible()) {
      await quickGenButton.click();
      
      // Wait for response
      await page.waitForTimeout(3000);
      
      // Take screenshot
      await page.screenshot({ path: 'test-screenshots/generation-started.png' });
    }
  });
});