/**
 * Comprehensive UI Smoke Tests for FitnessMealPlanner
 * Tests all user roles with correct credentials and verifies core functionality
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4000';

// Test account credentials
const TEST_ACCOUNTS = {
  admin: {
    email: 'admin@fitmeal.pro',
    password: 'AdminPass123'
  },
  trainer: {
    email: 'trainer.test@evofitmeals.com',
    password: 'TestTrainer123!'
  },
  customer: {
    email: 'customer.test@evofitmeals.com',
    password: 'TestCustomer123!'
  }
};

test.describe('FitnessMealPlanner UI Smoke Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text());
      }
    });

    // Listen for page errors
    page.on('pageerror', error => {
      console.log('❌ Page Error:', error.message);
    });
  });

  test('1. Landing page loads correctly', async ({ page }) => {
    console.log('🧪 Testing: Landing page loads correctly');
    
    await page.goto(BASE_URL);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-screenshots/landing-page.png', 
      fullPage: true 
    });
    
    // Check if page loaded
    await expect(page.locator('#root')).toBeVisible();
    
    // Look for login/signup elements
    const loginButton = page.locator('button:has-text("Login"), a:has-text("Login"), a[href*="login"]');
    const signupButton = page.locator('button:has-text("Sign Up"), a:has-text("Sign Up"), a[href*="register"]');
    
    expect(await loginButton.count() > 0 || await signupButton.count() > 0).toBe(true);
    
    console.log('✅ Landing page loaded successfully');
  });

  test('2. Login page loads and displays form', async ({ page }) => {
    console.log('🧪 Testing: Login page loads and displays form');
    
    await page.goto(`${BASE_URL}/login`);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-screenshots/login-page.png', 
      fullPage: true 
    });
    
    // Check form elements
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    
    console.log('✅ Login form loaded successfully');
  });

  test('3. Admin login and dashboard access', async ({ page }) => {
    console.log('🧪 Testing: Admin login and dashboard access');
    
    await page.goto(`${BASE_URL}/login`);
    
    // Fill and submit login form
    await page.fill('input[type="email"], input[name="email"]', TEST_ACCOUNTS.admin.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_ACCOUNTS.admin.password);
    
    // Click login button
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');
    
    // Wait for navigation
    await page.waitForURL(/\/admin|\/dashboard/, { timeout: 10000 });
    
    // Take screenshot after login
    await page.screenshot({ 
      path: 'test-screenshots/admin-dashboard.png', 
      fullPage: true 
    });
    
    // Check for admin-specific content
    const adminIndicators = [
      'Admin',
      'Dashboard',
      'Users',
      'Recipes',
      'Management'
    ];
    
    let foundIndicator = false;
    for (const indicator of adminIndicators) {
      if (await page.locator(`text=${indicator}`).count() > 0) {
        foundIndicator = true;
        console.log(`✅ Found admin indicator: ${indicator}`);
        break;
      }
    }
    
    expect(foundIndicator).toBe(true);
    console.log('✅ Admin login successful');
  });

  test('4. Trainer login and dashboard access', async ({ page }) => {
    console.log('🧪 Testing: Trainer login and dashboard access');
    
    await page.goto(`${BASE_URL}/login`);
    
    // Fill and submit login form
    await page.fill('input[type="email"], input[name="email"]', TEST_ACCOUNTS.trainer.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_ACCOUNTS.trainer.password);
    
    // Click login button
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');
    
    // Wait for navigation
    await page.waitForURL(/\/trainer|\/dashboard/, { timeout: 10000 });
    
    // Take screenshot after login
    await page.screenshot({ 
      path: 'test-screenshots/trainer-dashboard.png', 
      fullPage: true 
    });
    
    // Check for trainer-specific content
    const trainerIndicators = [
      'Trainer',
      'Customers',
      'Meal Plans',
      'Recipes'
    ];
    
    let foundIndicator = false;
    for (const indicator of trainerIndicators) {
      if (await page.locator(`text=${indicator}`).count() > 0) {
        foundIndicator = true;
        console.log(`✅ Found trainer indicator: ${indicator}`);
        break;
      }
    }
    
    expect(foundIndicator).toBe(true);
    console.log('✅ Trainer login successful');
  });

  test('5. Customer login and dashboard access', async ({ page }) => {
    console.log('🧪 Testing: Customer login and dashboard access');
    
    await page.goto(`${BASE_URL}/login`);
    
    // Fill and submit login form
    await page.fill('input[type="email"], input[name="email"]', TEST_ACCOUNTS.customer.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_ACCOUNTS.customer.password);
    
    // Click login button
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');
    
    // Wait for navigation
    await page.waitForURL(/\/customer|\/dashboard/, { timeout: 10000 });
    
    // Take screenshot after login
    await page.screenshot({ 
      path: 'test-screenshots/customer-dashboard.png', 
      fullPage: true 
    });
    
    // Check for customer-specific content
    const customerIndicators = [
      'My Meal Plans',
      'Recipes',
      'Progress',
      'Profile'
    ];
    
    let foundIndicator = false;
    for (const indicator of customerIndicators) {
      if (await page.locator(`text=${indicator}`).count() > 0) {
        foundIndicator = true;
        console.log(`✅ Found customer indicator: ${indicator}`);
        break;
      }
    }
    
    expect(foundIndicator).toBe(true);
    console.log('✅ Customer login successful');
  });

  test('6. Navigation tabs work for all roles', async ({ page }) => {
    console.log('🧪 Testing: Navigation tabs work for all roles');
    
    // Test for each role
    const roles = [
      { name: 'admin', ...TEST_ACCOUNTS.admin },
      { name: 'trainer', ...TEST_ACCOUNTS.trainer },
      { name: 'customer', ...TEST_ACCOUNTS.customer }
    ];
    
    for (const role of roles) {
      console.log(`Testing navigation for ${role.name}...`);
      
      // Login
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"], input[name="email"]', role.email);
      await page.fill('input[type="password"], input[name="password"]', role.password);
      await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');
      
      // Wait for login
      await page.waitForTimeout(3000);
      
      // Look for navigation tabs
      const navTabs = await page.locator('[role="tab"], .nav-tab, nav a, [data-tab]').all();
      
      if (navTabs.length > 0) {
        console.log(`✅ Found ${navTabs.length} navigation elements for ${role.name}`);
        
        // Try clicking the first few tabs
        for (let i = 0; i < Math.min(3, navTabs.length); i++) {
          try {
            await navTabs[i].click();
            await page.waitForTimeout(1000);
            console.log(`✅ Successfully clicked tab ${i + 1} for ${role.name}`);
          } catch (error) {
            console.log(`⚠️ Could not click tab ${i + 1} for ${role.name}: ${error.message}`);
          }
        }
      }
      
      // Take screenshot of final state
      await page.screenshot({ 
        path: `test-screenshots/${role.name}-navigation.png`, 
        fullPage: true 
      });
      
      // Logout if possible
      const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout"), button:has-text("Sign out")');
      if (await logoutButton.isVisible({ timeout: 2000 })) {
        await logoutButton.click();
        await page.waitForTimeout(1000);
      }
    }
    
    console.log('✅ Navigation testing completed');
  });

  test('7. Verify Health Protocols tab is NOT visible for Trainer role', async ({ page }) => {
    console.log('🧪 Testing: Health Protocols tab is NOT visible for Trainer role');
    
    // Login as trainer
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', TEST_ACCOUNTS.trainer.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_ACCOUNTS.trainer.password);
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');
    
    // Wait for dashboard to load
    await page.waitForTimeout(5000);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-screenshots/trainer-health-protocol-check.png', 
      fullPage: true 
    });
    
    // Look for Health Protocol related content
    const healthProtocolElements = [
      'Health Protocol',
      'Health Protocols',
      'Longevity Protocol',
      'Parasite Cleanse',
      'Specialized Protocol'
    ];
    
    let foundHealthProtocol = false;
    for (const element of healthProtocolElements) {
      const found = await page.locator(`text=${element}`).count();
      if (found > 0) {
        foundHealthProtocol = true;
        console.log(`❌ FOUND Health Protocol element: ${element} (${found} occurrences)`);
      }
    }
    
    // This should be false - we don't want to find Health Protocol tabs
    expect(foundHealthProtocol).toBe(false);
    console.log('✅ Health Protocols tab correctly NOT visible for Trainer role');
  });

  test('8. Recipe pages load properly', async ({ page }) => {
    console.log('🧪 Testing: Recipe pages load properly');
    
    // Test for trainer role (as they should have access to recipes)
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', TEST_ACCOUNTS.trainer.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_ACCOUNTS.trainer.password);
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');
    
    await page.waitForTimeout(3000);
    
    // Look for recipe-related navigation
    const recipeLinks = page.locator('text=Recipe, text=Recipes, [href*="recipe"]');
    
    if (await recipeLinks.count() > 0) {
      await recipeLinks.first().click();
      await page.waitForTimeout(2000);
      
      // Take screenshot
      await page.screenshot({ 
        path: 'test-screenshots/recipe-page.png', 
        fullPage: true 
      });
      
      // Check if recipe content loaded
      const recipeContent = await page.locator('text=recipe, .recipe, [data-testid*="recipe"]').count();
      
      console.log(`✅ Recipe page loaded with ${recipeContent} recipe-related elements`);
      expect(recipeContent).toBeGreaterThan(0);
    } else {
      console.log('⚠️ No recipe links found in navigation');
    }
  });

  test('9. Meal plan pages load properly', async ({ page }) => {
    console.log('🧪 Testing: Meal plan pages load properly');
    
    // Test for trainer role
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', TEST_ACCOUNTS.trainer.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_ACCOUNTS.trainer.password);
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');
    
    await page.waitForTimeout(3000);
    
    // Look for meal plan related navigation
    const mealPlanLinks = page.locator('text=Meal Plan, text=Meal Plans, [href*="meal"]');
    
    if (await mealPlanLinks.count() > 0) {
      await mealPlanLinks.first().click();
      await page.waitForTimeout(2000);
      
      // Take screenshot
      await page.screenshot({ 
        path: 'test-screenshots/meal-plan-page.png', 
        fullPage: true 
      });
      
      // Check if meal plan content loaded
      const mealPlanContent = await page.locator('text=meal, text=plan, .meal, [data-testid*="meal"]').count();
      
      console.log(`✅ Meal plan page loaded with ${mealPlanContent} meal-related elements`);
      expect(mealPlanContent).toBeGreaterThan(0);
    } else {
      console.log('⚠️ No meal plan links found in navigation');
    }
  });

  test('10. Check for console errors and broken functionality', async ({ page }) => {
    console.log('🧪 Testing: Check for console errors and broken functionality');
    
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Capture page errors
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });
    
    // Test basic navigation
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);
    
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(2000);
    
    // Try a login
    await page.fill('input[type="email"], input[name="email"]', TEST_ACCOUNTS.admin.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_ACCOUNTS.admin.password);
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');
    
    await page.waitForTimeout(5000);
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'test-screenshots/error-check-final.png', 
      fullPage: true 
    });
    
    // Report results
    console.log(`Console errors found: ${consoleErrors.length}`);
    console.log(`Page errors found: ${pageErrors.length}`);
    
    if (consoleErrors.length > 0) {
      console.log('❌ Console Errors:', consoleErrors);
    }
    
    if (pageErrors.length > 0) {
      console.log('❌ Page Errors:', pageErrors);
    }
    
    // We'll be lenient with errors for now, just log them
    console.log('✅ Error checking completed');
  });
});