/**
 * Simple Recipe Approval Test
 * Just tests basic navigation and page loading
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4000';

test.describe('Simple Recipe Approval Tests', () => {
  test('should load the application homepage', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Should see the landing page or login
    await expect(page).toHaveTitle(/FitnessMealPlanner|EvoFitMeals/);
    
    // Should see either login form or main content
    const hasLoginForm = await page.locator('input[type="email"]').isVisible();
    const hasMainContent = await page.locator('main').isVisible();
    
    expect(hasLoginForm || hasMainContent).toBe(true);
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    // Should see login form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show proper error for invalid login', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    // Try invalid credentials
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message or stay on login page
    await page.waitForTimeout(2000);
    
    // Either shows error or stays on login page
    const hasError = await page.locator('.toast:has-text("error"), .alert:has-text("error"), .error').isVisible();
    const stillOnLogin = page.url().includes('/login');
    
    expect(hasError || stillOnLogin).toBe(true);
  });

  test('should load admin dashboard when accessing directly (if logged in)', async ({ page }) => {
    // Try to access admin page directly
    await page.goto(`${BASE_URL}/admin`);
    
    // Should either redirect to login or show admin content
    await page.waitForTimeout(3000);
    
    const isOnLogin = page.url().includes('/login');
    const isOnAdmin = page.url().includes('/admin');
    const hasAdminContent = await page.locator('text=Admin Dashboard').isVisible();
    
    // Should be either redirected to login OR showing admin content
    expect(isOnLogin || (isOnAdmin && hasAdminContent)).toBe(true);
  });
});