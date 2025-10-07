/**
 * Fresh Admin Test - After container restart
 * Test admin functionality with clean slate
 */

import { test, expect } from '@playwright/test';

const ADMIN_CREDENTIALS = {
  email: 'admin@fitmeal.pro',
  password: 'AdminPass123'
};

test('Fresh Admin Login and Interface Test', async ({ page }) => {
  // Enable console logging
  page.on('console', (msg) => {
    console.log(`🖥️ Console: ${msg.text()}`);
  });

  // Go to login page
  console.log('🔗 Starting fresh admin test...');
  await page.goto('http://localhost:4000/login');
  await page.waitForLoadState('networkidle');
  
  // Fill login form
  console.log('📝 Filling admin credentials...');
  await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
  await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
  
  // Submit login
  console.log('🚀 Submitting login form...');
  await page.click('button[type="submit"]');
  
  // Wait for redirect
  console.log('⏳ Waiting for authentication...');
  await page.waitForTimeout(5000);
  
  const currentUrl = page.url();
  console.log(`📍 Current URL: ${currentUrl}`);
  
  // Take screenshot
  await page.screenshot({ path: 'fresh-admin-test/after-login.png' });
  
  // Check if we're authenticated by looking for user interface elements
  const userInterface = await page.locator('nav, [role="navigation"], .navigation, button:has-text("Admin")').isVisible();
  console.log(`🧭 User interface visible: ${userInterface}`);
  
  if (userInterface) {
    console.log('✅ Admin login successful!');
    
    // Look for admin-specific elements
    const adminElements = page.locator('button:has-text("Admin"), [data-value="admin"], .admin');
    const adminElementCount = await adminElements.count();
    console.log(`👑 Admin elements found: ${adminElementCount}`);
    
    if (adminElementCount > 0) {
      console.log('🖱️ Clicking admin interface element...');
      await adminElements.first().click();
      await page.waitForTimeout(3000);
      
      await page.screenshot({ path: 'fresh-admin-test/admin-interface.png' });
      
      // Look for admin functionality
      const recipes = page.locator('div:has-text("Recipes"), button:has-text("recipes")');
      const recipesVisible = await recipes.isVisible();
      console.log(`🍽️ Recipes section visible: ${recipesVisible}`);
      
      const analytics = page.locator('div:has-text("Analytics"), button:has-text("analytics")');  
      const analyticsVisible = await analytics.isVisible();
      console.log(`📊 Analytics section visible: ${analyticsVisible}`);
      
      const users = page.locator('div:has-text("Users"), button:has-text("users")');
      const usersVisible = await users.isVisible();
      console.log(`👥 Users section visible: ${usersVisible}`);
      
      // Test recipe functionality if available
      if (recipesVisible) {
        console.log('🧪 Testing recipe management...');
        await recipes.first().click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'fresh-admin-test/recipes-section.png' });
        
        // Look for recipe-related buttons
        const recipeButtons = page.locator('button:has-text("Generate"), button:has-text("Approve"), button:has-text("View")');
        const buttonCount = await recipeButtons.count();
        console.log(`🔘 Recipe management buttons found: ${buttonCount}`);
      }
    }
  } else {
    console.log('❌ Admin login appears to have failed');
    
    // Check for error messages
    const errors = page.locator('.error, .alert, [role="alert"]');
    const errorCount = await errors.count();
    if (errorCount > 0) {
      for (let i = 0; i < errorCount; i++) {
        const errorText = await errors.nth(i).textContent();
        console.log(`❌ Error: ${errorText}`);
      }
    }
  }
});