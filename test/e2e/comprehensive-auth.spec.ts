/**
 * Comprehensive Authentication Test Suite
 * Tests all authentication flows and security boundaries
 */

import { test, expect, Page, Browser } from '@playwright/test';
import { LoginPage } from '../page-objects/LoginPage';
import { DashboardPage } from '../page-objects/DashboardPage';
import { TEST_ACCOUNTS, setupTestEnvironment } from '../playwright-setup';

test.describe('🔐 Comprehensive Authentication Tests', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeAll(async () => {
    // Setup test environment and accounts
    await setupTestEnvironment();
  });

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    
    // Start from login page with clean session
    await dashboardPage.clearSession();
    await loginPage.navigate();
  });

  test.describe('Login Form Validation', () => {
    test('should display login form with all required elements', async ({ page }) => {
      await loginPage.verifyPageElements();
      await loginPage.verifyTitle();
      
      // Take screenshot for visual verification
      await loginPage.takeScreenshot('login-form-elements');
    });

    test('should show validation errors for empty form submission', async ({ page }) => {
      await loginPage.submitEmptyForm();
      
      const hasErrors = await loginPage.hasValidationErrors();
      expect(hasErrors).toBeTruthy();
      
      const errors = await loginPage.getErrorMessages();
      console.log('Validation errors found:', errors);
      
      await loginPage.takeScreenshot('empty-form-validation');
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await loginPage.login('invalid@email.com', 'wrongpassword');
      
      const stillOnLogin = await loginPage.isStillOnLoginPage();
      expect(stillOnLogin).toBeTruthy();
      
      await loginPage.takeScreenshot('invalid-credentials');
    });
  });

  test.describe('Role-Based Authentication', () => {
    test('Admin authentication and dashboard access', async ({ page }) => {
      const account = TEST_ACCOUNTS.admin;
      
      await loginPage.login(account.email, account.password);
      
      // Verify redirect to admin dashboard
      await dashboardPage.verifyPath(account.expectedPath);
      await dashboardPage.waitForDashboardLoad();
      
      // Verify admin features are present
      const adminFeatures = await dashboardPage.verifyAdminFeatures();
      console.log(`✅ Admin dashboard verified with ${adminFeatures} admin features`);
      
      await dashboardPage.takeScreenshot('admin-dashboard-authenticated');
    });

    test('Trainer authentication and dashboard access', async ({ page }) => {
      const account = TEST_ACCOUNTS.trainer;
      
      await loginPage.login(account.email, account.password);
      
      // Verify redirect to trainer dashboard
      await dashboardPage.verifyPath(account.expectedPath);
      await dashboardPage.waitForDashboardLoad();
      
      // Verify trainer features are present
      const trainerFeatures = await dashboardPage.verifyTrainerFeatures();
      console.log(`✅ Trainer dashboard verified with ${trainerFeatures} trainer features`);
      
      await dashboardPage.takeScreenshot('trainer-dashboard-authenticated');
    });

    test('Customer authentication and dashboard access', async ({ page }) => {
      const account = TEST_ACCOUNTS.customer;
      
      await loginPage.login(account.email, account.password);
      
      // Verify redirect to customer dashboard
      await dashboardPage.verifyPath(account.expectedPath);
      await dashboardPage.waitForDashboardLoad();
      
      // Verify customer features are present
      const customerFeatures = await dashboardPage.verifyCustomerFeatures();
      console.log(`✅ Customer dashboard verified with ${customerFeatures} customer features`);
      
      await dashboardPage.takeScreenshot('customer-dashboard-authenticated');
    });
  });

  test.describe('Security and Access Control', () => {
    test('Unauthenticated users are redirected to login', async ({ page }) => {
      // Try to access protected routes without authentication
      const protectedRoutes = ['/admin', '/trainer', '/my-meal-plans'];
      
      for (const route of protectedRoutes) {
        await page.goto(`http://localhost:4000${route}`);
        await page.waitForLoadState('networkidle');
        
        const currentUrl = page.url();
        expect(currentUrl).not.toContain(route);
        expect(currentUrl.includes('/login') || currentUrl.includes('/')).toBeTruthy();
        
        console.log(`✅ Unauthenticated access to ${route} properly blocked`);
      }
      
      await loginPage.takeScreenshot('unauthenticated-access-blocked');
    });

    test('Admin cannot access trainer-specific routes', async ({ page }) => {
      // Login as admin
      await loginPage.login(TEST_ACCOUNTS.admin.email, TEST_ACCOUNTS.admin.password);
      await dashboardPage.waitForDashboardLoad();
      
      // Try to access trainer route
      await page.goto('http://localhost:4000/trainer');
      await page.waitForLoadState('networkidle');
      
      const currentUrl = page.url();
      expect(currentUrl).not.toBe('http://localhost:4000/trainer');
      
      console.log('✅ Admin correctly blocked from trainer routes');
      await dashboardPage.takeScreenshot('admin-blocked-from-trainer');
    });

    test('Customer cannot access admin or trainer routes', async ({ page }) => {
      // Login as customer
      await loginPage.login(TEST_ACCOUNTS.customer.email, TEST_ACCOUNTS.customer.password);
      await dashboardPage.waitForDashboardLoad();
      
      // Try to access admin route
      await page.goto('http://localhost:4000/admin');
      await page.waitForLoadState('networkidle');
      expect(page.url()).not.toContain('/admin');
      
      // Try to access trainer route
      await page.goto('http://localhost:4000/trainer');
      await page.waitForLoadState('networkidle');
      expect(page.url()).not.toContain('/trainer');
      
      console.log('✅ Customer correctly blocked from admin and trainer routes');
      await dashboardPage.takeScreenshot('customer-blocked-from-privileged-routes');
    });
  });

  test.describe('Session Management', () => {
    test('Logout functionality works correctly', async ({ page }) => {
      // Login as any user
      await loginPage.login(TEST_ACCOUNTS.customer.email, TEST_ACCOUNTS.customer.password);
      await dashboardPage.waitForDashboardLoad();
      
      // Logout
      await dashboardPage.logout();
      
      // Verify redirected to login or home
      const currentUrl = page.url();
      expect(currentUrl.includes('/login') || currentUrl.match(/^https?:\/\/[^\/]+\/?$/)).toBeTruthy();
      
      // Try to access protected route after logout
      await page.goto('http://localhost:4000/my-meal-plans');
      await page.waitForLoadState('networkidle');
      
      const postLogoutUrl = page.url();
      expect(postLogoutUrl).not.toContain('/my-meal-plans');
      
      console.log('✅ Logout and session invalidation working correctly');
      await dashboardPage.takeScreenshot('post-logout-verification');
    });

    test('Session persists across page navigation', async ({ page }) => {
      // Login as customer
      await loginPage.login(TEST_ACCOUNTS.customer.email, TEST_ACCOUNTS.customer.password);
      await dashboardPage.waitForDashboardLoad();
      
      // Navigate to different pages
      const customerPages = ['/my-meal-plans', '/progress'];
      
      for (const pagePath of customerPages) {
        await page.goto(`http://localhost:4000${pagePath}`);
        await page.waitForLoadState('networkidle');
        
        // Should not be redirected to login
        const isAuthenticated = !page.url().includes('/login');
        expect(isAuthenticated).toBeTruthy();
        
        console.log(`✅ Session persists on ${pagePath}`);
      }
      
      await dashboardPage.takeScreenshot('session-persistence-verified');
    });
  });

  test.describe('Multi-Browser Session Testing', () => {
    test('Multiple sessions work independently', async ({ browser }) => {
      // Create two browser contexts (separate sessions)
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      const loginPage1 = new LoginPage(page1);
      const loginPage2 = new LoginPage(page2);
      const dashboardPage1 = new DashboardPage(page1);
      const dashboardPage2 = new DashboardPage(page2);
      
      // Login as admin in first session
      await loginPage1.navigate();
      await loginPage1.login(TEST_ACCOUNTS.admin.email, TEST_ACCOUNTS.admin.password);
      await dashboardPage1.waitForDashboardLoad();
      
      // Login as customer in second session
      await loginPage2.navigate();
      await loginPage2.login(TEST_ACCOUNTS.customer.email, TEST_ACCOUNTS.customer.password);
      await dashboardPage2.waitForDashboardLoad();
      
      // Verify both sessions are independent
      await dashboardPage1.verifyPath('/admin');
      await dashboardPage2.verifyPath('/my-meal-plans');
      
      console.log('✅ Multiple independent sessions verified');
      
      // Cleanup
      await context1.close();
      await context2.close();
    });
  });
});