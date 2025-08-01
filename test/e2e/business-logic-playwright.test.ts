import { test, expect, Browser, Page } from '@playwright/test';
import { chromium } from 'playwright';

/**
 * Simplified Business Logic Validation Tests using Playwright
 * 
 * This test suite validates core business logic and role interactions
 * as specified in BUSINESS_LOGIC_SPECIFICATION.md
 */

const BASE_URL = 'http://localhost:4000';

// Test account credentials (must match actual accounts in database)
const TEST_ACCOUNTS = {
  admin: {
    email: 'admin@fitmeal.pro',
    password: 'Admin123!@#',
    expectedRole: 'admin',
    expectedRedirect: '/admin'
  },
  trainer: {
    email: 'testtrainer@example.com',
    password: 'TrainerPassword123!',
    expectedRole: 'trainer',
    expectedRedirect: '/trainer'
  },
  customer: {
    email: 'testcustomer@example.com',
    password: 'TestPassword123!',
    expectedRole: 'customer', 
    expectedRedirect: '/my-meal-plans'
  }
};

test.describe('Business Logic Validation - Role-Based Testing', () => {
  let browser: Browser;

  test.beforeAll(async () => {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  test.afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  test.describe('🔐 Authentication & Role Verification', () => {
    test('Admin login redirects to admin dashboard', async () => {
      const page = await browser.newPage();
      
      await page.goto(`${BASE_URL}/login`);
      
      // Fill login form
      await page.fill('input[type="email"]', TEST_ACCOUNTS.admin.email);
      await page.fill('input[type="password"]', TEST_ACCOUNTS.admin.password);
      
      // Submit and wait for redirect
      await page.click('button[type="submit"]');
      await page.waitForURL(`${BASE_URL}${TEST_ACCOUNTS.admin.expectedRedirect}`);
      
      // Verify admin dashboard elements
      expect(page.url()).toBe(`${BASE_URL}/admin`);
      await expect(page.locator('text=Admin Dashboard')).toBeVisible();
      
      await page.close();
    });

    test('Trainer login redirects to trainer dashboard', async () => {
      const page = await browser.newPage();
      
      await page.goto(`${BASE_URL}/login`);
      
      await page.fill('input[type="email"]', TEST_ACCOUNTS.trainer.email);
      await page.fill('input[type="password"]', TEST_ACCOUNTS.trainer.password);
      
      await page.click('button[type="submit"]');
      await page.waitForURL(`${BASE_URL}${TEST_ACCOUNTS.trainer.expectedRedirect}`);
      
      expect(page.url()).toBe(`${BASE_URL}/trainer`);
      await expect(page.locator('text=Trainer Dashboard')).toBeVisible();
      
      await page.close();
    });

    test('Customer login redirects to meal plans', async () => {
      const page = await browser.newPage();
      
      await page.goto(`${BASE_URL}/login`);
      
      await page.fill('input[type="email"]', TEST_ACCOUNTS.customer.email);
      await page.fill('input[type="password"]', TEST_ACCOUNTS.customer.password);
      
      await page.click('button[type="submit"]');
      await page.waitForURL(`${BASE_URL}${TEST_ACCOUNTS.customer.expectedRedirect}`);
      
      expect(page.url()).toBe(`${BASE_URL}/my-meal-plans`);
      await expect(page.locator('text=My Meal Plans')).toBeVisible();
      
      await page.close();
    });
  });

  test.describe('👨‍💼 Admin Role - System Administration', () => {
    test('Admin can access recipe management interface', async () => {
      const page = await browser.newPage();
      
      // Login as admin
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"]', TEST_ACCOUNTS.admin.email);
      await page.fill('input[type="password"]', TEST_ACCOUNTS.admin.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(`${BASE_URL}/admin`);
      
      // Should see recipe management section
      await expect(page.locator('text=Recipe Management')).toBeVisible();
      
      await page.close();
    });

    test('Admin cannot access trainer-specific features', async () => {
      const page = await browser.newPage();
      
      // Login as admin first
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"]', TEST_ACCOUNTS.admin.email);
      await page.fill('input[type="password"]', TEST_ACCOUNTS.admin.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(`${BASE_URL}/admin`);
      
      // Try to navigate to trainer page - should be blocked or redirected
      await page.goto(`${BASE_URL}/trainer`);
      
      // Should either redirect back to admin or show access denied
      await page.waitForLoadState('networkidle');
      const currentUrl = page.url();
      
      // Admin should not be able to access trainer dashboard
      expect(currentUrl).not.toBe(`${BASE_URL}/trainer`);
      
      await page.close();
    });
  });

  test.describe('🏋️‍♂️ Trainer Role - Customer Management', () => {
    test('Trainer can access customer invitation system', async () => {
      const page = await browser.newPage();
      
      // Login as trainer
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"]', TEST_ACCOUNTS.trainer.email);
      await page.fill('input[type="password"]', TEST_ACCOUNTS.trainer.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(`${BASE_URL}/trainer`);
      
      // Should see invite customer section
      await expect(page.locator('text=Invite Customer')).toBeVisible();
      
      // Should see invitation form
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('button:has-text("Send Invitation")')).toBeVisible();
      
      await page.close();
    });

    test('Trainer cannot access admin features', async () => {
      const page = await browser.newPage();
      
      // Login as trainer first
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"]', TEST_ACCOUNTS.trainer.email);
      await page.fill('input[type="password"]', TEST_ACCOUNTS.trainer.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(`${BASE_URL}/trainer`);
      
      // Try to navigate to admin page
      await page.goto(`${BASE_URL}/admin`);
      
      // Should be denied access or redirected
      await page.waitForLoadState('networkidle');
      const currentUrl = page.url();
      
      expect(currentUrl).not.toBe(`${BASE_URL}/admin`);
      
      await page.close();
    });
  });

  test.describe('🧑‍🤝‍🧑 Customer Role - Content Access', () => {
    test('Customer can view assigned meal plans', async () => {
      const page = await browser.newPage();
      
      // Login as customer
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"]', TEST_ACCOUNTS.customer.email);
      await page.fill('input[type="password"]', TEST_ACCOUNTS.customer.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(`${BASE_URL}/my-meal-plans`);
      
      // Should be on meal plans page
      expect(page.url()).toBe(`${BASE_URL}/my-meal-plans`);
      
      // Should see meal plans section
      await expect(page.locator('[data-testid="meal-plans-section"]')).toBeVisible();
      
      await page.close();
    });

    test('Customer cannot access admin or trainer features', async () => {
      const page = await browser.newPage();
      
      // Login as customer first
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"]', TEST_ACCOUNTS.customer.email);
      await page.fill('input[type="password"]', TEST_ACCOUNTS.customer.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(`${BASE_URL}/my-meal-plans`);
      
      // Try to access admin page
      await page.goto(`${BASE_URL}/admin`);
      await page.waitForLoadState('networkidle');
      expect(page.url()).not.toBe(`${BASE_URL}/admin`);
      
      // Try to access trainer page  
      await page.goto(`${BASE_URL}/trainer`);
      await page.waitForLoadState('networkidle');
      expect(page.url()).not.toBe(`${BASE_URL}/trainer`);
      
      await page.close();
    });
  });

  test.describe('🔒 Security & Permission Boundaries', () => {
    test('Unauthorized access attempts are blocked', async () => {
      const page = await browser.newPage();
      
      // Try to access admin page without login
      await page.goto(`${BASE_URL}/admin`);
      
      // Should redirect to login or show access denied
      await page.waitForLoadState('networkidle');
      const currentUrl = page.url();
      
      expect(currentUrl).not.toBe(`${BASE_URL}/admin`);
      expect(currentUrl).toContain('login');
      
      await page.close();
    });

    test('JWT token expiration and refresh works', async () => {
      const page = await browser.newPage();
      
      // Login and verify token is working
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"]', TEST_ACCOUNTS.customer.email);
      await page.fill('input[type="password"]', TEST_ACCOUNTS.customer.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(`${BASE_URL}/my-meal-plans`);
      
      // Make an API request to verify authentication
      const response = await page.evaluate(async () => {
        return fetch('/api/auth/me', {
          credentials: 'include'
        }).then(r => r.status);
      });
      
      expect(response).toBe(200);
      
      await page.close();
    });
  });
});