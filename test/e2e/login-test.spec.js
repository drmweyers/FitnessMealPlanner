/**
 * Simple login test to verify account credentials
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4000';

test.describe('Login Tests', () => {
  test('Test trainer login', async ({ page }) => {
    console.log('Testing trainer login...');
    
    // Go to login page
    await page.goto(`${BASE_URL}/login`);
    console.log('Current URL:', page.url());
    
    // Check if login form exists
    const emailInput = await page.locator('input[name="email"], input[type="email"]').first();
    const passwordInput = await page.locator('input[name="password"], input[type="password"]').first();
    const submitButton = await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();
    
    console.log('Email input visible:', await emailInput.isVisible());
    console.log('Password input visible:', await passwordInput.isVisible());
    console.log('Submit button visible:', await submitButton.isVisible());
    
    // Fill login form
    await emailInput.fill('testtrainer@example.com');
    await passwordInput.fill('password123');
    
    // Take screenshot before submitting
    await page.screenshot({ path: 'before-login.png' });
    
    // Click submit and wait a bit
    await submitButton.click();
    
    // Wait for any response
    await page.waitForTimeout(5000);
    
    // Check where we ended up
    console.log('URL after login attempt:', page.url());
    
    // Take screenshot after login
    await page.screenshot({ path: 'after-login.png', fullPage: true });
    
    // Check for error messages
    const errorMessage = await page.locator('text=error, text=invalid, text=incorrect, .error, .alert').first();
    if (await errorMessage.isVisible({ timeout: 1000 })) {
      console.log('Error message found:', await errorMessage.textContent());
    }
    
    // Check if we see trainer-related content
    const trainerContent = await page.locator('text=Trainer, text=Dashboard, text=Customers, text=Meal Plan').first();
    if (await trainerContent.isVisible({ timeout: 1000 })) {
      console.log('✅ Trainer content visible - login successful!');
    } else {
      console.log('❌ No trainer content found - login may have failed');
    }
  });
  
  test('Check application health', async ({ page }) => {
    console.log('Checking application health...');
    
    // Test API endpoint
    const apiResponse = await page.request.get(`${BASE_URL}/api/health`);
    console.log('API Health check status:', apiResponse.status());
    console.log('API Response:', await apiResponse.text());
    
    // Test frontend
    await page.goto(BASE_URL);
    console.log('Frontend URL:', page.url());
    
    // Check if React app loaded
    const appRoot = await page.locator('#root, [data-reactroot], .App').first();
    console.log('React app root found:', await appRoot.isVisible({ timeout: 5000 }));
  });
});