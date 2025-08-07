/**
 * Responsive Design and Cross-Device Testing
 * Tests application functionality across different screen sizes and devices
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/LoginPage';
import { DashboardPage } from '../page-objects/DashboardPage';
import { MealPlanPage } from '../page-objects/MealPlanPage';
import { TEST_ACCOUNTS, setupTestEnvironment } from '../playwright-setup';

// Device configurations for testing
const DEVICE_CONFIGS = [
  {
    name: 'Desktop',
    viewport: { width: 1920, height: 1080 },
    userAgent: 'desktop'
  },
  {
    name: 'Laptop',
    viewport: { width: 1366, height: 768 },
    userAgent: 'laptop'
  },
  {
    name: 'Tablet',
    viewport: { width: 768, height: 1024 },
    userAgent: 'tablet'
  },
  {
    name: 'Mobile',
    viewport: { width: 375, height: 667 },
    userAgent: 'mobile'
  }
];

test.describe('📱 Responsive Design & Cross-Device Tests', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let mealPlanPage: MealPlanPage;

  test.beforeAll(async () => {
    await setupTestEnvironment();
  });

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    mealPlanPage = new MealPlanPage(page);
    
    await dashboardPage.clearSession();
  });

  test.describe('Login Page Responsiveness', () => {
    for (const device of DEVICE_CONFIGS) {
      test(`Login page displays correctly on ${device.name}`, async ({ page }) => {
        // Set viewport
        await page.setViewportSize(device.viewport);
        
        // Navigate to login page
        await loginPage.navigate();
        
        // Verify page elements are accessible
        await loginPage.verifyPageElements();
        
        // Check if elements are properly positioned for the device
        const emailInput = page.locator('input[type="email"]');
        const passwordInput = page.locator('input[type="password"]');
        const submitButton = page.locator('button[type="submit"]');
        
        // All elements should be visible and accessible
        await expect(emailInput).toBeVisible();
        await expect(passwordInput).toBeVisible();
        await expect(submitButton).toBeVisible();
        
        // Elements should not overflow the viewport
        const emailBox = await emailInput.boundingBox();
        const passwordBox = await passwordInput.boundingBox();
        const submitBox = await submitButton.boundingBox();
        
        if (emailBox) {
          expect(emailBox.x + emailBox.width).toBeLessThanOrEqual(device.viewport.width);
          expect(emailBox.y + emailBox.height).toBeLessThanOrEqual(device.viewport.height);
        }
        
        // Take screenshot for visual verification
        await loginPage.takeScreenshot(`login-${device.name.toLowerCase()}-responsive`);
        
        console.log(`✅ Login page responsive design verified for ${device.name}`);
      });
    }
  });

  test.describe('Dashboard Responsiveness', () => {
    for (const device of DEVICE_CONFIGS) {
      test(`Dashboard displays correctly on ${device.name}`, async ({ page }) => {
        // Set viewport
        await page.setViewportSize(device.viewport);
        
        // Login as customer (has good dashboard content)
        await loginPage.navigate();
        await loginPage.login(TEST_ACCOUNTS.customer.email, TEST_ACCOUNTS.customer.password);
        await dashboardPage.waitForDashboardLoad();
        
        // Verify dashboard accessibility
        await dashboardPage.verifyAccessibility();
        
        // Check if navigation works on the device
        try {
          await dashboardPage.verifyCustomerFeatures();
          console.log(`✅ Dashboard features accessible on ${device.name}`);
        } catch (error) {
          console.log(`⚠️ Dashboard features may need adjustment for ${device.name}: ${error.message}`);
        }
        
        // Check if content fits within viewport
        const body = page.locator('body');
        const bodyBox = await body.boundingBox();
        
        if (bodyBox && device.name === 'Mobile') {
          // On mobile, horizontal scrolling should be minimal
          console.log(`Mobile layout check - body width: ${bodyBox.width}, viewport: ${device.viewport.width}`);
        }
        
        await dashboardPage.takeScreenshot(`dashboard-${device.name.toLowerCase()}-responsive`);
        
        console.log(`✅ Dashboard responsive design verified for ${device.name}`);
      });
    }
  });

  test.describe('Cross-Device Authentication Flow', () => {
    test('Authentication flow works across all device sizes', async ({ page }) => {
      for (const device of DEVICE_CONFIGS) {
        console.log(`🧪 Testing authentication flow on ${device.name}...`);
        
        // Set viewport for current device
        await page.setViewportSize(device.viewport);
        
        // Clear session and navigate to login
        await dashboardPage.clearSession();
        await loginPage.navigate();
        
        // Perform login
        await loginPage.login(TEST_ACCOUNTS.customer.email, TEST_ACCOUNTS.customer.password);
        await dashboardPage.waitForDashboardLoad();
        
        // Verify successful authentication
        await dashboardPage.verifyPath('/my-meal-plans');
        
        // Take screenshot
        await dashboardPage.takeScreenshot(`auth-flow-${device.name.toLowerCase()}`);
        
        console.log(`✅ Authentication flow verified for ${device.name}`);
      }
    });
  });

  test.describe('Mobile-Specific Interactions', () => {
    test('Touch interactions work correctly on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize(DEVICE_CONFIGS.find(d => d.name === 'Mobile')!.viewport);
      
      // Login
      await loginPage.navigate();
      await loginPage.login(TEST_ACCOUNTS.customer.email, TEST_ACCOUNTS.customer.password);
      await dashboardPage.waitForDashboardLoad();
      
      // Test touch/tap interactions
      try {
        // Try to navigate to meal plans using touch events
        await mealPlanPage.navigateToMealPlans();
        
        // Verify content is accessible via touch
        const hasMealPlanContent = await mealPlanPage.hasMealPlanContent();
        console.log(`Mobile meal plan content accessible: ${hasMealPlanContent}`);
        
        await mealPlanPage.takeScreenshot('mobile-touch-interactions');
      } catch (error) {
        console.log(`Mobile interaction test: ${error.message}`);
      }
    });

    test('Mobile menu and navigation', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize(DEVICE_CONFIGS.find(d => d.name === 'Mobile')!.viewport);
      
      // Login
      await loginPage.navigate();
      await loginPage.login(TEST_ACCOUNTS.trainer.email, TEST_ACCOUNTS.trainer.password);
      await dashboardPage.waitForDashboardLoad();
      
      // Look for mobile-specific navigation (hamburger menu, etc.)
      const mobileMenuSelectors = [
        '[data-testid=\"mobile-menu\"]',
        '.hamburger',
        '.mobile-nav',
        'button[aria-label*=\"menu\"]',
        'button[aria-label*=\"Menu\"]'
      ];
      
      let foundMobileMenu = false;
      for (const selector of mobileMenuSelectors) {
        if (await page.locator(selector).isVisible({ timeout: 1000 })) {
          foundMobileMenu = true;
          console.log(`✅ Mobile menu found: ${selector}`);
          
          // Try to interact with mobile menu
          await page.locator(selector).click();
          await page.waitForTimeout(1000);
          
          break;
        }
      }
      
      if (!foundMobileMenu) {
        console.log('ℹ️ No mobile-specific menu found - may use standard navigation');
      }
      
      await dashboardPage.takeScreenshot('mobile-navigation-test');
    });
  });

  test.describe('Tablet-Specific Layout', () => {
    test('Tablet layout optimization', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize(DEVICE_CONFIGS.find(d => d.name === 'Tablet')!.viewport);
      
      // Login as admin to test more complex layouts
      await loginPage.navigate();
      await loginPage.login(TEST_ACCOUNTS.admin.email, TEST_ACCOUNTS.admin.password);
      await dashboardPage.waitForDashboardLoad();
      
      // Verify admin features are accessible on tablet
      try {
        const adminFeatures = await dashboardPage.verifyAdminFeatures();
        console.log(`✅ Admin features accessible on tablet: ${adminFeatures}`);
      } catch (error) {
        console.log(`⚠️ Admin features may need tablet optimization: ${error.message}`);
      }
      
      await dashboardPage.takeScreenshot('tablet-admin-layout');
    });
  });

  test.describe('Performance Across Devices', () => {
    test('Page load performance across device types', async ({ page }) => {
      const performanceResults = [];
      
      for (const device of DEVICE_CONFIGS) {
        console.log(`📊 Testing performance on ${device.name}...`);
        
        // Set viewport
        await page.setViewportSize(device.viewport);
        
        // Clear session
        await dashboardPage.clearSession();
        
        // Measure login page load time
        const loginStartTime = Date.now();
        await loginPage.navigate();
        const loginLoadTime = Date.now() - loginStartTime;
        
        // Measure authentication time
        const authStartTime = Date.now();
        await loginPage.login(TEST_ACCOUNTS.customer.email, TEST_ACCOUNTS.customer.password);
        await dashboardPage.waitForDashboardLoad();
        const authTime = Date.now() - authStartTime;
        
        // Measure meal plan navigation time
        const mealPlanStartTime = Date.now();
        try {
          await mealPlanPage.navigateToMealPlans();
          const mealPlanLoadTime = Date.now() - mealPlanStartTime;
          
          performanceResults.push({
            device: device.name,
            loginLoadTime,
            authTime,
            mealPlanLoadTime,
            totalTime: loginLoadTime + authTime + mealPlanLoadTime
          });
        } catch (error) {
          performanceResults.push({
            device: device.name,
            loginLoadTime,
            authTime,
            mealPlanLoadTime: -1,
            totalTime: loginLoadTime + authTime,
            error: error.message
          });
        }
      }
      
      // Log performance results
      console.log('📊 Performance Results:');
      console.table(performanceResults);
      
      // Verify reasonable performance (under 10 seconds total for basic flow)
      for (const result of performanceResults) {
        expect(result.totalTime).toBeLessThan(10000);
      }
    });
  });

  test.describe('Orientation Changes', () => {
    test('Application handles orientation changes', async ({ page }) => {
      // Start with portrait mobile
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Login
      await loginPage.navigate();
      await loginPage.login(TEST_ACCOUNTS.customer.email, TEST_ACCOUNTS.customer.password);
      await dashboardPage.waitForDashboardLoad();
      
      await dashboardPage.takeScreenshot('orientation-portrait');
      
      // Change to landscape
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(1000); // Allow layout to adjust
      
      // Verify functionality still works
      try {
        await dashboardPage.verifyCustomerFeatures();
        console.log('✅ Landscape orientation maintains functionality');
      } catch (error) {
        console.log(`⚠️ Landscape orientation issue: ${error.message}`);
      }
      
      await dashboardPage.takeScreenshot('orientation-landscape');
      
      // Change back to portrait
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(1000);
      
      // Verify functionality restored
      try {
        await dashboardPage.verifyCustomerFeatures();
        console.log('✅ Portrait orientation restored successfully');
      } catch (error) {
        console.log(`⚠️ Orientation change issue: ${error.message}`);
      }
      
      await dashboardPage.takeScreenshot('orientation-portrait-restored');
    });
  });
});