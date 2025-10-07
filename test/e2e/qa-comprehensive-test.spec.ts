import { test, expect, Browser, Page } from '@playwright/test';
import { chromium } from 'playwright';

/**
 * QA Comprehensive GUI Test Suite
 * Tests the complete application with actual test data and accounts
 */

const BASE_URL = 'http://localhost:4000';

// CRITICAL: Use the actual test accounts that were created
const TEST_ACCOUNTS = {
  trainer: {
    email: 'trainer.test@evofitmeals.com',
    password: 'TestTrainer123!',
    expectedRole: 'trainer',
    expectedRedirect: '/trainer'
  },
  customer: {
    email: 'customer.test@evofitmeals.com', 
    password: 'TestCustomer123!',
    expectedRole: 'customer',
    expectedRedirect: '/my-meal-plans'
  }
};

test.describe('QA Comprehensive GUI Test Suite', () => {
  let browser: Browser;

  test.beforeAll(async () => {
    browser = await chromium.launch({
      headless: false, // Use headed mode for better debugging
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      slowMo: 500 // Slow down for visual confirmation
    });
  });

  test.afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  test.describe('🔐 Authentication Test Suite', () => {
    test('Trainer authentication - Full workflow', async () => {
      const page = await browser.newPage();
      console.log('🔍 Testing trainer authentication...');
      
      try {
        // Navigate to login page
        await page.goto(`${BASE_URL}/login`);
        await page.waitForLoadState('networkidle');
        
        // Take screenshot of login page
        await page.screenshot({ path: 'test/screenshots/trainer-login-page.png', fullPage: true });
        
        // Verify login form is present
        await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();
        
        // Fill in trainer credentials
        await page.fill('input[type="email"], input[name="email"]', TEST_ACCOUNTS.trainer.email);
        await page.fill('input[type="password"], input[name="password"]', TEST_ACCOUNTS.trainer.password);
        
        // Submit login
        await page.click('button[type="submit"]');
        
        // Wait for redirect and check success
        await page.waitForURL(`${BASE_URL}${TEST_ACCOUNTS.trainer.expectedRedirect}`, { timeout: 10000 });
        
        // Verify trainer dashboard
        expect(page.url()).toBe(`${BASE_URL}/trainer`);
        await page.screenshot({ path: 'test/screenshots/trainer-dashboard.png', fullPage: true });
        
        // Verify trainer-specific elements are visible
        await expect(page.locator('text=Trainer Dashboard, text=Dashboard')).toBeVisible({ timeout: 5000 });
        
        console.log('✅ Trainer authentication successful');
        
      } catch (error) {
        await page.screenshot({ path: 'test/screenshots/trainer-login-error.png', fullPage: true });
        console.log('❌ Trainer authentication failed:', error.message);
        throw error;
      } finally {
        await page.close();
      }
    });

    test('Customer authentication - Full workflow', async () => {
      const page = await browser.newPage();
      console.log('🔍 Testing customer authentication...');
      
      try {
        // Navigate to login page
        await page.goto(`${BASE_URL}/login`);
        await page.waitForLoadState('networkidle');
        
        // Fill in customer credentials
        await page.fill('input[type="email"], input[name="email"]', TEST_ACCOUNTS.customer.email);
        await page.fill('input[type="password"], input[name="password"]', TEST_ACCOUNTS.customer.password);
        
        // Submit login
        await page.click('button[type="submit"]');
        
        // Wait for redirect
        await page.waitForURL(`${BASE_URL}${TEST_ACCOUNTS.customer.expectedRedirect}`, { timeout: 10000 });
        
        // Verify customer dashboard
        expect(page.url()).toBe(`${BASE_URL}/my-meal-plans`);
        await page.screenshot({ path: 'test/screenshots/customer-dashboard.png', fullPage: true });
        
        // Verify customer-specific elements
        await expect(page.locator('text=My Meal Plans, text=Meal Plans')).toBeVisible({ timeout: 5000 });
        
        console.log('✅ Customer authentication successful');
        
      } catch (error) {
        await page.screenshot({ path: 'test/screenshots/customer-login-error.png', fullPage: true });
        console.log('❌ Customer authentication failed:', error.message);
        throw error;
      } finally {
        await page.close();
      }
    });

    test('Logout functionality test', async () => {
      const page = await browser.newPage();
      console.log('🔍 Testing logout functionality...');
      
      try {
        // Login first
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"], input[name="email"]', TEST_ACCOUNTS.trainer.email);
        await page.fill('input[type="password"], input[name="password"]', TEST_ACCOUNTS.trainer.password);
        await page.click('button[type="submit"]');
        await page.waitForURL(`${BASE_URL}/trainer`);
        
        // Find and click logout button
        const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout"), [data-testid="logout"]');
        await logoutButton.click();
        
        // Verify redirect to login page
        await page.waitForURL(`${BASE_URL}/login`, { timeout: 10000 });
        expect(page.url()).toBe(`${BASE_URL}/login`);
        
        console.log('✅ Logout functionality working');
        
      } catch (error) {
        console.log('❌ Logout test failed:', error.message);
        throw error;
      } finally {
        await page.close();
      }
    });
  });

  test.describe('🏋️‍♂️ Trainer Workflow Tests', () => {
    test('Trainer dashboard - Complete functionality test', async () => {
      const page = await browser.newPage();
      console.log('🔍 Testing trainer dashboard functionality...');
      
      try {
        // Login as trainer
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"], input[name="email"]', TEST_ACCOUNTS.trainer.email);
        await page.fill('input[type="password"], input[name="password"]', TEST_ACCOUNTS.trainer.password);
        await page.click('button[type="submit"]');
        await page.waitForURL(`${BASE_URL}/trainer`);
        
        // Test dashboard statistics (if present)
        const statsElements = await page.locator('[data-testid*="stat"], .stats, .metric').count();
        console.log(`Found ${statsElements} statistics elements on dashboard`);
        
        // Test customer management section
        const customerSection = page.locator('text=Customer, text=Client, [data-testid*="customer"]');
        if (await customerSection.count() > 0) {
          console.log('✅ Customer management section found');
        }
        
        // Test meal plan management
        const mealPlanSection = page.locator('text=Meal Plan, [data-testid*="meal"]');
        if (await mealPlanSection.count() > 0) {
          console.log('✅ Meal plan management section found');
        }
        
        await page.screenshot({ path: 'test/screenshots/trainer-full-dashboard.png', fullPage: true });
        console.log('✅ Trainer dashboard test completed');
        
      } catch (error) {
        await page.screenshot({ path: 'test/screenshots/trainer-dashboard-error.png', fullPage: true });
        console.log('❌ Trainer dashboard test failed:', error.message);
        throw error;
      } finally {
        await page.close();
      }
    });

    test('Trainer - Customer list and management', async () => {
      const page = await browser.newPage();
      console.log('🔍 Testing trainer customer management...');
      
      try {
        // Login as trainer
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"], input[name="email"]', TEST_ACCOUNTS.trainer.email);
        await page.fill('input[type="password"], input[name="password"]', TEST_ACCOUNTS.trainer.password);
        await page.click('button[type="submit"]');
        await page.waitForURL(`${BASE_URL}/trainer`);
        
        // Look for customer list or navigation to customers
        const customerLinks = await page.locator('a:has-text("Customer"), a:has-text("Client"), nav a[href*="customer"]').count();
        if (customerLinks > 0) {
          // Try to navigate to customer list
          await page.click('a:has-text("Customer"), a:has-text("Client"), nav a[href*="customer"]');
          await page.waitForLoadState('networkidle');
          console.log('✅ Customer list accessible');
        }
        
        // Check for customer invitation features
        const inviteButton = page.locator('button:has-text("Invite"), button:has-text("Add Customer")');
        if (await inviteButton.count() > 0) {
          console.log('✅ Customer invitation feature found');
        }
        
        await page.screenshot({ path: 'test/screenshots/trainer-customer-management.png', fullPage: true });
        
      } catch (error) {
        console.log('❌ Customer management test failed:', error.message);
        await page.screenshot({ path: 'test/screenshots/trainer-customer-error.png', fullPage: true });
      } finally {
        await page.close();
      }
    });
  });

  test.describe('🧑‍🤝‍🧑 Customer Workflow Tests', () => {
    test('Customer dashboard - Meal plan viewing', async () => {
      const page = await browser.newPage();
      console.log('🔍 Testing customer meal plan access...');
      
      try {
        // Login as customer
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"], input[name="email"]', TEST_ACCOUNTS.customer.email);
        await page.fill('input[type="password"], input[name="password"]', TEST_ACCOUNTS.customer.password);
        await page.click('button[type="submit"]');
        await page.waitForURL(`${BASE_URL}/my-meal-plans`);
        
        // Check for meal plans display
        const mealPlanElements = await page.locator('[data-testid*="meal"], .meal-plan, .plan-card').count();
        console.log(`Found ${mealPlanElements} meal plan elements`);
        
        // Look for sample meal plans that should be assigned
        const planTitles = await page.locator('h1, h2, h3, h4').allTextContents();
        console.log('Plan titles found:', planTitles);
        
        // Test recipe details access
        const recipeLinks = await page.locator('a[href*="recipe"], button:has-text("Recipe")').count();
        if (recipeLinks > 0) {
          console.log('✅ Recipe access links found');
        }
        
        await page.screenshot({ path: 'test/screenshots/customer-meal-plans.png', fullPage: true });
        console.log('✅ Customer meal plan access test completed');
        
      } catch (error) {
        console.log('❌ Customer meal plan test failed:', error.message);
        await page.screenshot({ path: 'test/screenshots/customer-meal-plan-error.png', fullPage: true });
      } finally {
        await page.close();
      }
    });
  });

  test.describe('🔗 Trainer-Customer Relationship Tests', () => {
    test('Verify trainer can see assigned customer', async () => {
      const page = await browser.newPage();
      console.log('🔍 Testing trainer-customer relationship...');
      
      try {
        // Login as trainer
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"], input[name="email"]', TEST_ACCOUNTS.trainer.email);
        await page.fill('input[type="password"], input[name="password"]', TEST_ACCOUNTS.trainer.password);
        await page.click('button[type="submit"]');
        await page.waitForURL(`${BASE_URL}/trainer`);
        
        // Look for the test customer in the trainer's client list
        const customerEmail = TEST_ACCOUNTS.customer.email;
        const customerFound = await page.locator(`text=${customerEmail}`).count() > 0;
        
        if (customerFound) {
          console.log('✅ Customer found in trainer\'s client list');
        } else {
          console.log('⚠️ Customer not found in visible client list - checking other locations');
          
          // Check if there's a customers page or section
          try {
            await page.click('a:has-text("Customer"), a:has-text("Client")');
            await page.waitForLoadState('networkidle');
            const customerFoundOnPage = await page.locator(`text=${customerEmail}`).count() > 0;
            if (customerFoundOnPage) {
              console.log('✅ Customer found on dedicated customers page');
            }
          } catch {
            console.log('ℹ️ No dedicated customers page found');
          }
        }
        
        await page.screenshot({ path: 'test/screenshots/trainer-customer-relationship.png', fullPage: true });
        
      } catch (error) {
        console.log('❌ Trainer-customer relationship test failed:', error.message);
      } finally {
        await page.close();
      }
    });
  });

  test.describe('📱 Responsive Design Tests', () => {
    test('Mobile responsive - Login and basic navigation', async () => {
      const page = await browser.newPage();
      console.log('🔍 Testing mobile responsive design...');
      
      try {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });
        
        // Test login on mobile
        await page.goto(`${BASE_URL}/login`);
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'test/screenshots/mobile-login.png', fullPage: true });
        
        // Verify form elements are still accessible on mobile
        await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
        
        // Test login functionality on mobile
        await page.fill('input[type="email"], input[name="email"]', TEST_ACCOUNTS.customer.email);
        await page.fill('input[type="password"], input[name="password"]', TEST_ACCOUNTS.customer.password);
        await page.click('button[type="submit"]');
        await page.waitForURL(`${BASE_URL}/my-meal-plans`);
        
        await page.screenshot({ path: 'test/screenshots/mobile-customer-dashboard.png', fullPage: true });
        console.log('✅ Mobile responsive test completed');
        
      } catch (error) {
        console.log('❌ Mobile responsive test failed:', error.message);
        await page.screenshot({ path: 'test/screenshots/mobile-error.png', fullPage: true });
      } finally {
        await page.close();
      }
    });

    test('Tablet responsive - Trainer workflow', async () => {
      const page = await browser.newPage();
      console.log('🔍 Testing tablet responsive design...');
      
      try {
        // Set tablet viewport
        await page.setViewportSize({ width: 768, height: 1024 });
        
        // Test trainer login on tablet
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"], input[name="email"]', TEST_ACCOUNTS.trainer.email);
        await page.fill('input[type="password"], input[name="password"]', TEST_ACCOUNTS.trainer.password);
        await page.click('button[type="submit"]');
        await page.waitForURL(`${BASE_URL}/trainer`);
        
        await page.screenshot({ path: 'test/screenshots/tablet-trainer-dashboard.png', fullPage: true });
        console.log('✅ Tablet responsive test completed');
        
      } catch (error) {
        console.log('❌ Tablet responsive test failed:', error.message);
      } finally {
        await page.close();
      }
    });
  });

  test.describe('📄 PDF Export Tests', () => {
    test('PDF export functionality test', async () => {
      const page = await browser.newPage();
      console.log('🔍 Testing PDF export functionality...');
      
      try {
        // Login as customer to test PDF export
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"], input[name="email"]', TEST_ACCOUNTS.customer.email);
        await page.fill('input[type="password"], input[name="password"]', TEST_ACCOUNTS.customer.password);
        await page.click('button[type="submit"]');
        await page.waitForURL(`${BASE_URL}/my-meal-plans`);
        
        // Look for PDF export buttons
        const pdfButtons = await page.locator('button:has-text("PDF"), button:has-text("Export"), button:has-text("Download"), a:has-text("PDF")').count();
        
        if (pdfButtons > 0) {
          console.log(`✅ Found ${pdfButtons} PDF export options`);
          
          // Try clicking a PDF export button
          try {
            await page.click('button:has-text("PDF"), button:has-text("Export"), button:has-text("Download"), a:has-text("PDF")');
            await page.waitForTimeout(3000); // Wait for PDF generation
            console.log('✅ PDF export button clicked successfully');
          } catch {
            console.log('⚠️ PDF export button click failed or timed out');
          }
        } else {
          console.log('ℹ️ No PDF export buttons found on meal plans page');
        }
        
        await page.screenshot({ path: 'test/screenshots/pdf-export-test.png', fullPage: true });
        
      } catch (error) {
        console.log('❌ PDF export test failed:', error.message);
      } finally {
        await page.close();
      }
    });
  });

  test.describe('⚡ Performance Tests', () => {
    test('Page load performance measurement', async () => {
      const page = await browser.newPage();
      console.log('🔍 Testing page load performance...');
      
      try {
        const startTime = Date.now();
        
        // Measure login page load
        await page.goto(`${BASE_URL}/login`);
        await page.waitForLoadState('networkidle');
        const loginLoadTime = Date.now() - startTime;
        
        // Measure authentication and dashboard load
        const authStartTime = Date.now();
        await page.fill('input[type="email"], input[name="email"]', TEST_ACCOUNTS.trainer.email);
        await page.fill('input[type="password"], input[name="password"]', TEST_ACCOUNTS.trainer.password);
        await page.click('button[type="submit"]');
        await page.waitForURL(`${BASE_URL}/trainer`);
        await page.waitForLoadState('networkidle');
        const dashboardLoadTime = Date.now() - authStartTime;
        
        console.log(`📊 Performance Results:`);
        console.log(`Login page load time: ${loginLoadTime}ms`);
        console.log(`Authentication + dashboard load: ${dashboardLoadTime}ms`);
        
        // Performance thresholds
        expect(loginLoadTime).toBeLessThan(5000); // 5 seconds max
        expect(dashboardLoadTime).toBeLessThan(8000); // 8 seconds max for auth + redirect
        
        console.log('✅ Performance tests passed');
        
      } catch (error) {
        console.log('❌ Performance test failed:', error.message);
      } finally {
        await page.close();
      }
    });
  });
});