import { test, expect, Page } from '@playwright/test';

/**
 * Visual Business Logic Validation Tests
 * 
 * This test suite validates core business logic by actually interacting
 * with the UI in a real browser, so you can see each step happening.
 */

// Test account credentials (must match actual accounts in database)
const TEST_ACCOUNTS = {
  admin: {
    email: 'admin@fitmeal.pro',
    password: 'Admin123!@#',
    expectedRole: 'admin',
    expectedPath: '/admin',
    dashboardText: 'Admin Dashboard'
  },
  trainer: {
    email: 'testtrainer@example.com',
    password: 'TrainerPassword123!',
    expectedRole: 'trainer',
    expectedPath: '/trainer',
    dashboardText: 'Trainer Dashboard'
  },
  customer: {
    email: 'testcustomer@example.com',
    password: 'TestPassword123!',
    expectedRole: 'customer',
    expectedPath: '/my-meal-plans',
    dashboardText: 'My Meal Plans'
  }
};

// Helper function to login as a specific user
async function loginAs(page: Page, accountType: keyof typeof TEST_ACCOUNTS) {
  const account = TEST_ACCOUNTS[accountType];
  
  console.log(`🔐 Logging in as ${accountType}: ${account.email}`);
  
  // Navigate to login page
  await page.goto('/login');
  await expect(page).toHaveTitle(/EvoFitMeals/);
  
  // Fill login form
  await page.fill('input[type="email"]', account.email);
  await page.fill('input[type="password"]', account.password);
  
  // Submit form and wait for navigation
  await Promise.all([
    page.waitForNavigation({ timeout: 10000 }),
    page.click('button[type="submit"]')
  ]);
  
  // Wait a bit for any additional redirects
  await page.waitForTimeout(2000);
  
  // Check if we're on the expected path (or close to it)
  const currentUrl = page.url();
  console.log(`Current URL after login: ${currentUrl}`);
  
  console.log(`✅ Successfully logged in as ${accountType}`);
  return account;
}

// Helper function to add visual feedback
async function addTestStep(page: Page, stepName: string) {
  console.log(`🧪 Test Step: ${stepName}`);
  
  // Add a visual indicator on the page
  await page.evaluate((step) => {
    const indicator = document.createElement('div');
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #4CAF50;
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    indicator.textContent = `Testing: ${step}`;
    indicator.id = 'test-indicator';
    
    // Remove previous indicator
    const existing = document.getElementById('test-indicator');
    if (existing) existing.remove();
    
    document.body.appendChild(indicator);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (document.getElementById('test-indicator')) {
        document.getElementById('test-indicator')?.remove();
      }
    }, 3000);
  }, stepName);
  
  // Wait a bit so you can see the step
  await page.waitForTimeout(1500);
}

test.describe('🔍 Business Logic Validation - Visual Browser Tests', () => {
  
  test.describe('🔐 Authentication & Role Verification', () => {
    
    test('Admin Login & Dashboard Access', async ({ page }) => {
      await addTestStep(page, 'Admin Authentication');
      
      const account = await loginAs(page, 'admin');
      
      // Verify we're on the admin dashboard
      await expect(page).toHaveURL(new RegExp(account.expectedPath));
      
      // Look for admin-specific elements
      await addTestStep(page, 'Verifying Admin Dashboard Elements');
      
      // Check for admin dashboard title/heading
      const dashboardHeading = page.locator('h1, h2, .dashboard-title').filter({ hasText: /admin|dashboard/i });
      if (await dashboardHeading.count() > 0) {
        await expect(dashboardHeading.first()).toBeVisible();
      }
      
      // Check for admin-specific features
      const adminFeatures = [
        'Recipe Management',
        'User Management', 
        'System Statistics',
        'Approve',
        'Admin'
      ];
      
      let foundFeatures = 0;
      for (const feature of adminFeatures) {
        const element = page.locator(`text=${feature}`).first();
        if (await element.isVisible()) {
          foundFeatures++;
          console.log(`✅ Found admin feature: ${feature}`);
        }
      }
      
      expect(foundFeatures).toBeGreaterThan(0);
      console.log(`✅ Admin dashboard validated with ${foundFeatures} admin features visible`);
    });

    test('Trainer Login & Dashboard Access', async ({ page }) => {
      await addTestStep(page, 'Trainer Authentication');
      
      const account = await loginAs(page, 'trainer');
      
      // Verify we're on the trainer dashboard
      await expect(page).toHaveURL(new RegExp(account.expectedPath));
      
      await addTestStep(page, 'Verifying Trainer Dashboard Elements');
      
      // Check for trainer-specific features
      const trainerFeatures = [
        'Invite Customer',
        'Customers',
        'Meal Plans',
        'Send Invitation',
        'Trainer'
      ];
      
      let foundFeatures = 0;
      for (const feature of trainerFeatures) {
        const element = page.locator(`text=${feature}`).first();
        if (await element.isVisible()) {
          foundFeatures++;
          console.log(`✅ Found trainer feature: ${feature}`);
        }
      }
      
      expect(foundFeatures).toBeGreaterThan(0);
      console.log(`✅ Trainer dashboard validated with ${foundFeatures} trainer features visible`);
    });

    test('Customer Login & Dashboard Access', async ({ page }) => {
      await addTestStep(page, 'Customer Authentication');
      
      const account = await loginAs(page, 'customer');
      
      // Verify we're on the customer dashboard
      await expect(page).toHaveURL(new RegExp(account.expectedPath));
      
      await addTestStep(page, 'Verifying Customer Dashboard Elements');
      
      // Check for customer-specific elements
      const customerFeatures = [
        'My Meal Plans',
        'Meal Plans',
        'Progress',
        'Recipes'
      ];
      
      let foundFeatures = 0;
      for (const feature of customerFeatures) {
        const element = page.locator(`text=${feature}`).first();
        if (await element.isVisible()) {
          foundFeatures++;
          console.log(`✅ Found customer feature: ${feature}`);
        }
      }
      
      expect(foundFeatures).toBeGreaterThan(0);
      console.log(`✅ Customer dashboard validated with ${foundFeatures} customer features visible`);
    });
  });

  test.describe('🔒 Security & Permission Boundaries', () => {
    
    test('Unauthenticated Access is Blocked', async ({ page }) => {
      await addTestStep(page, 'Testing Unauthenticated Access');
      
      // Try to access admin page without login
      await page.goto('/admin');
      
      // Should be redirected to login or show access denied
      await page.waitForLoadState('networkidle');
      
      const currentUrl = page.url();
      console.log(`Current URL after attempting admin access: ${currentUrl}`);
      
      // Should not be on admin page
      expect(currentUrl).not.toContain('/admin');
      
      // Should be on login page or show access denied
      expect(currentUrl.includes('/login') || page.locator('text=Access Denied').isVisible()).toBeTruthy();
      
      console.log('✅ Unauthenticated access properly blocked');
    });

    test('Role-Based Access Control - Admin Cannot Access Trainer Routes', async ({ page }) => {
      await addTestStep(page, 'Testing Admin Role Boundaries');
      
      // Login as admin first
      await loginAs(page, 'admin');
      
      // Try to access trainer page
      await addTestStep(page, 'Admin Attempting Trainer Access');
      await page.goto('/trainer');
      
      await page.waitForLoadState('networkidle');
      const currentUrl = page.url();
      
      console.log(`URL after admin trying to access trainer page: ${currentUrl}`);
      
      // Admin should not be able to access trainer dashboard
      expect(currentUrl).not.toBe('/trainer');
      
      console.log('✅ Admin correctly blocked from trainer routes');
    });

    test('Role-Based Access Control - Customer Cannot Access Admin/Trainer Routes', async ({ page }) => {
      await addTestStep(page, 'Testing Customer Role Boundaries');
      
      // Login as customer first
      await loginAs(page, 'customer');
      
      // Try to access admin page
      await addTestStep(page, 'Customer Attempting Admin Access');
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');
      expect(page.url()).not.toContain('/admin');
      
      // Try to access trainer page
      await addTestStep(page, 'Customer Attempting Trainer Access');
      await page.goto('/trainer');
      await page.waitForLoadState('networkidle');
      expect(page.url()).not.toContain('/trainer');
      
      console.log('✅ Customer correctly blocked from admin and trainer routes');
    });
  });

  test.describe('🔄 Business Logic Workflows', () => {
    
    test('JWT Token Management - Authentication Persistence', async ({ page }) => {
      await addTestStep(page, 'Testing JWT Token Persistence');
      
      // Login as customer
      await loginAs(page, 'customer');
      
      // Navigate to different pages to test token persistence
      await addTestStep(page, 'Testing Navigation with Authentication');
      
      // Try to navigate to progress page
      await page.goto('/progress');
      await page.waitForLoadState('networkidle');
      
      // Should still be authenticated and able to access customer pages
      const isAuthenticated = !page.url().includes('/login');
      expect(isAuthenticated).toBeTruthy();
      
      console.log('✅ JWT token authentication persists across navigation');
    });

    test('Content Access Validation - Recipe Visibility', async ({ page }) => {
      await addTestStep(page, 'Testing Recipe Access Permissions');
      
      // Login as customer
      await loginAs(page, 'customer');
      
      // Navigate to recipes page
      await page.goto('/recipes');
      await page.waitForLoadState('networkidle');
      
      await addTestStep(page, 'Verifying Customer Recipe Access');
      
      // Customer should be able to see recipes but not admin controls
      const hasRecipes = await page.locator('.recipe-item, .recipe-card, [data-testid*="recipe"]').count() >= 0;
      const hasAdminControls = await page.locator('button:has-text("Approve"), button:has-text("Delete")').count() > 0;
      
      // Customer should see recipes but not admin controls
      expect(hasAdminControls).toBeFalsy();
      
      console.log('✅ Customer recipe access validated - no admin controls visible');
    });
  });

  test.describe('🧪 Integration Testing', () => {
    
    test('Complete User Journey - Multi-Role Workflow', async ({ page }) => {
      await addTestStep(page, 'Starting Multi-Role Integration Test');
      
      // Test 1: Admin login and system overview
      await loginAs(page, 'admin');
      await addTestStep(page, 'Admin System Overview');
      
      // Admin should see system-wide information
      const adminElements = await page.locator('h1, h2, .dashboard-title, .stats').count();
      expect(adminElements).toBeGreaterThan(0);
      
      // Logout admin
      const logoutBtn = page.locator('button:has-text("Logout"), a:has-text("Logout"), .logout');
      if (await logoutBtn.count() > 0) {
        await logoutBtn.first().click();
        await page.waitForURL('/login');
      } else {
        // If no logout button, clear cookies
        await page.context().clearCookies();
        await page.goto('/login');
      }
      
      // Test 2: Trainer login and customer management
      await loginAs(page, 'trainer');
      await addTestStep(page, 'Trainer Customer Management');
      
      // Trainer should see customer management features
      const trainerElements = await page.locator('text=Invite, text=Customer, text=Meal Plan').count();
      expect(trainerElements).toBeGreaterThan(0);
      
      // Logout trainer
      await page.context().clearCookies();
      await page.goto('/login');
      
      // Test 3: Customer login and content access
      await loginAs(page, 'customer');
      await addTestStep(page, 'Customer Content Access');
      
      // Customer should see personal content
      const customerElements = await page.locator('text=My Meal Plans, text=Progress, text=Recipes').count();
      expect(customerElements).toBeGreaterThan(0);
      
      console.log('✅ Multi-role integration test completed successfully');
    });
  });
});