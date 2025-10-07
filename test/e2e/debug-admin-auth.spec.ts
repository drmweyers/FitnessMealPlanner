/**
 * Debug Admin Authentication Flow
 * Simple test to understand what happens when admin logs in
 */

import { test, expect } from '@playwright/test';

const ADMIN_CREDENTIALS = {
  email: 'admin@fitmeal.pro', 
  password: 'AdminPass123'
};

test('Debug Admin Authentication', async ({ page }) => {
  // Enable console logging
  page.on('console', (msg) => {
    console.log(`🖥️ Console: ${msg.text()}`);
  });

  // Go to login page
  console.log('🔗 Navigating to login page...');
  await page.goto('http://localhost:4000/login');
  await page.waitForLoadState('networkidle');
  
  // Take screenshot of login page
  await page.screenshot({ path: 'debug-screenshots/01-login-page.png' });
  
  // Fill login form
  console.log('📝 Filling login form...');
  await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
  await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
  
  // Take screenshot of filled form
  await page.screenshot({ path: 'debug-screenshots/02-login-filled.png' });
  
  // Submit login
  console.log('🚀 Submitting login...');
  await page.click('button[type="submit"]');
  
  // Wait for potential redirect and check current URL
  await page.waitForTimeout(3000);
  const currentUrl = page.url();
  console.log(`📍 Current URL after login: ${currentUrl}`);
  
  // Take screenshot after login
  await page.screenshot({ path: 'debug-screenshots/03-after-login.png' });
  
  // Check if user is authenticated by looking for logout button or user menu
  const userMenu = page.locator('[data-testid="user-menu"], button:has-text("Logout"), .user-menu');
  const isAuthenticated = await userMenu.isVisible();
  console.log(`🔐 User appears to be authenticated: ${isAuthenticated}`);
  
  // Check for any error messages
  const errorMessages = page.locator('.error, .alert-error, [role="alert"]');
  const errorCount = await errorMessages.count();
  console.log(`❌ Error messages found: ${errorCount}`);
  
  if (errorCount > 0) {
    for (let i = 0; i < errorCount; i++) {
      const errorText = await errorMessages.nth(i).textContent();
      console.log(`❌ Error ${i + 1}: ${errorText}`);
    }
  }
  
  // Look for navigation elements that might indicate user role
  const navigation = page.locator('nav, [role="navigation"], .navigation');
  const navVisible = await navigation.isVisible();
  console.log(`🧭 Navigation visible: ${navVisible}`);
  
  if (navVisible) {
    // Check for admin-specific navigation items
    const adminNavItems = page.locator('button:has-text("Admin"), a:has-text("Admin"), [data-value="admin"]');
    const adminNavCount = await adminNavItems.count();
    console.log(`👑 Admin navigation items found: ${adminNavCount}`);
    
    if (adminNavCount > 0) {
      console.log('✅ Admin navigation available - user has admin access');
      
      // Try to click on admin navigation
      console.log('🖱️ Clicking on admin navigation...');
      await adminNavItems.first().click();
      await page.waitForTimeout(2000);
      
      const finalUrl = page.url();
      console.log(`📍 Final URL after clicking admin nav: ${finalUrl}`);
      
      // Take final screenshot
      await page.screenshot({ path: 'debug-screenshots/04-admin-section.png' });
    } else {
      console.log('❌ No admin navigation found - user may not have admin role');
    }
  }
});