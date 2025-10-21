/**
 * Quick Start Test - Simplified tests that work immediately
 *
 * This file demonstrates the page objects working with actual DOM selectors
 */

import { test, expect } from '@playwright/test';

// Test credentials
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

// Simple login helper
async function login(page, credentials) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', credentials.email);
  await page.fill('input[type="password"]', credentials.password);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 10000 });
}

test.describe('Quick Start Tests - Verify Framework Works', () => {
  test('Admin can login successfully', async ({ page }) => {
    console.log('🔐 Testing admin login...');

    // Login as admin
    await login(page, TEST_ACCOUNTS.admin);

    // Verify we're on admin page
    expect(page.url()).toContain('/admin');
    console.log(`✅ Admin logged in! URL: ${page.url()}`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check for admin content (any h1 or h2)
    const headings = await page.locator('h1, h2').allTextContents();
    console.log(`📄 Page headings: ${headings.join(', ')}`);

    // Take screenshot for verification
    await page.screenshot({ path: 'test-results/admin-logged-in.png', fullPage: true });
    console.log('📸 Screenshot saved: test-results/admin-logged-in.png');
  });

  test('Trainer can login successfully', async ({ page }) => {
    console.log('🔐 Testing trainer login...');

    // Login as trainer
    await login(page, TEST_ACCOUNTS.trainer);

    // Verify we're on trainer page
    expect(page.url()).toContain('/trainer');
    console.log(`✅ Trainer logged in! URL: ${page.url()}`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check for trainer content
    const headings = await page.locator('h1, h2').allTextContents();
    console.log(`📄 Page headings: ${headings.join(', ')}`);

    // Take screenshot
    await page.screenshot({ path: 'test-results/trainer-logged-in.png', fullPage: true });
    console.log('📸 Screenshot saved: test-results/trainer-logged-in.png');
  });

  test('Customer can login successfully', async ({ page }) => {
    console.log('🔐 Testing customer login...');

    // Login as customer
    await login(page, TEST_ACCOUNTS.customer);

    // Verify we're on customer page
    expect(page.url()).toContain('/customer');
    console.log(`✅ Customer logged in! URL: ${page.url()}`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check for customer content
    const headings = await page.locator('h1, h2').allTextContents();
    console.log(`📄 Page headings: ${headings.join(', ')}`);

    // Take screenshot
    await page.screenshot({ path: 'test-results/customer-logged-in.png', fullPage: true });
    console.log('📸 Screenshot saved: test-results/customer-logged-in.png');
  });

  test('Customer CANNOT access admin dashboard (permission test)', async ({ page }) => {
    console.log('🔐 Testing permission boundaries...');

    // Login as customer
    await login(page, TEST_ACCOUNTS.customer);

    // Try to navigate to admin dashboard
    await page.goto('/admin');

    // Wait for React to redirect (useEffect in ProtectedRoute)
    await page.waitForTimeout(1000);

    // Wait for URL to change away from /admin
    await page.waitForFunction(
      () => !window.location.pathname.includes('/admin'),
      { timeout: 5000 }
    );

    // Should NOT be on /admin after redirect
    const url = page.url();
    console.log(`📍 Redirected to: ${url}`);

    // Should be redirected away from /admin (either to /customer or /login)
    // Both are valid - the important thing is customer is NOT on /admin
    expect(url).not.toContain('/admin');

    // Verify it's one of the valid redirect targets
    const validRedirects = url.includes('/customer') || url.includes('/login');
    expect(validRedirects).toBe(true);

    console.log('✅ Customer correctly blocked from admin dashboard!');
  });

  test('All three roles can login in parallel', async ({ browser }) => {
    console.log('🔐 Testing all 3 roles simultaneously...');

    // Create separate contexts for each role
    const adminContext = await browser.newContext();
    const trainerContext = await browser.newContext();
    const customerContext = await browser.newContext();

    const adminPage = await adminContext.newPage();
    const trainerPage = await trainerContext.newPage();
    const customerPage = await customerContext.newPage();

    // Login all three roles in parallel
    await Promise.all([
      login(adminPage, TEST_ACCOUNTS.admin),
      login(trainerPage, TEST_ACCOUNTS.trainer),
      login(customerPage, TEST_ACCOUNTS.customer)
    ]);

    // Verify all are on correct pages
    expect(adminPage.url()).toContain('/admin');
    expect(trainerPage.url()).toContain('/trainer');
    expect(customerPage.url()).toContain('/customer');

    console.log('✅ All three roles logged in successfully!');
    console.log(`   Admin: ${adminPage.url()}`);
    console.log(`   Trainer: ${trainerPage.url()}`);
    console.log(`   Customer: ${customerPage.url()}`);

    // Cleanup
    await adminContext.close();
    await trainerContext.close();
    await customerContext.close();
  });
});
