import { test, expect } from '@playwright/test';

test.describe('Responsive Quick Test', () => {
  test('should load login page', async ({ page }) => {
    await page.goto('http://localhost:4000/login');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await page.screenshot({ path: 'test-login.png' });
    
    // Check page loaded
    const title = await page.title();
    console.log('Page title:', title);
    
    // Check for login form
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
  });
  
  test('should test mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('http://localhost:4000/login');
    
    // Check viewport
    const viewport = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight
    }));
    
    console.log('Viewport:', viewport);
    expect(viewport.width).toBe(375);
  });
});