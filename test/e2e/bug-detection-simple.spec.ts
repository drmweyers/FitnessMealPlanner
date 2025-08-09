/**
 * SIMPLE BUG DETECTION TEST
 * Focus: Identify and isolate specific bugs for fixing
 * Agent: Bug Detective & Fixer #6
 */

import { test, expect } from '@playwright/test';

test.describe('Bug Detection - Basic Connectivity', () => {
  test('application loads without errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', err => {
      errors.push(`Page error: ${err.message}`);
    });

    try {
      await page.goto('http://localhost:4000', { timeout: 30000 });
      await page.waitForSelector('body', { timeout: 15000 });
      
      console.log('✅ Application loaded successfully');
      console.log('Console errors:', errors);
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'test/screenshots/app-loaded.png' });
      
    } catch (error) {
      console.log('❌ Application failed to load:', error);
      await page.screenshot({ path: 'test/screenshots/app-load-error.png' });
      throw error;
    }
  });

  test('login form is present and functional', async ({ page }) => {
    await page.goto('http://localhost:4000');
    
    // Check for login elements
    const emailField = page.locator('input[type="email"], #email, [name="email"]').first();
    const passwordField = page.locator('input[type="password"], #password, [name="password"]').first();
    const loginButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();
    
    await expect(emailField).toBeVisible({ timeout: 10000 });
    await expect(passwordField).toBeVisible({ timeout: 10000 });
    await expect(loginButton).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Login form elements found');
  });

  test('trainer login works', async ({ page }) => {
    await page.goto('http://localhost:4000');
    
    try {
      // Fill login form
      await page.fill('input[type="email"], #email, [name="email"]', 'trainer.test@evofitmeals.com');
      await page.fill('input[type="password"], #password, [name="password"]', 'TestTrainer123!');
      await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
      
      // Wait for redirect or success
      await page.waitForTimeout(5000);
      
      const currentUrl = page.url();
      console.log('Current URL after login:', currentUrl);
      
      // Take screenshot
      await page.screenshot({ path: 'test/screenshots/after-trainer-login.png' });
      
    } catch (error) {
      console.log('❌ Trainer login failed:', error);
      await page.screenshot({ path: 'test/screenshots/trainer-login-error.png' });
    }
  });
});