import { test, expect } from '@playwright/test';

test.describe('Login Verification', () => {
  test('should login with admin credentials', async ({ page }) => {
    // Navigate directly to login page
    await page.goto('http://localhost:4000/login');

    // Wait for login form to appear
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    // Fill in admin credentials
    await page.fill('input[type="email"]', 'admin@fitmeal.pro');
    await page.fill('input[type="password"]', 'AdminPass123');

    // Take screenshot before login
    await page.screenshot({ path: 'test-results/admin-before-login.png', fullPage: true });

    // Click login button
    await page.click('button[type="submit"]:has-text("Sign In")');

    // Wait for navigation after login
    await page.waitForURL(/\/admin/, { timeout: 10000 });

    // Take screenshot after login
    await page.screenshot({ path: 'test-results/admin-after-login.png', fullPage: true });

    // Verify we're on the admin page
    const url = page.url();
    console.log('Admin URL after login:', url);
    expect(url).toContain('/admin');
  });

  test('should login with trainer credentials', async ({ page }) => {
    await page.goto('http://localhost:4000/login');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    await page.fill('input[type="email"]', 'trainer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestTrainer123!');

    await page.screenshot({ path: 'test-results/trainer-before-login.png', fullPage: true });

    await page.click('button[type="submit"]:has-text("Sign In")');

    await page.waitForURL(/\/trainer/, { timeout: 10000 });

    await page.screenshot({ path: 'test-results/trainer-after-login.png', fullPage: true });

    const url = page.url();
    console.log('Trainer URL after login:', url);
    expect(url).toContain('/trainer');
  });

  test('should login with customer credentials', async ({ page }) => {
    await page.goto('http://localhost:4000/login');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');

    await page.screenshot({ path: 'test-results/customer-before-login.png', fullPage: true });

    await page.click('button[type="submit"]:has-text("Sign In")');

    await page.waitForURL(/\/customer|\/my-meal-plans/, { timeout: 10000 });

    await page.screenshot({ path: 'test-results/customer-after-login.png', fullPage: true });

    const url = page.url();
    console.log('Customer URL after login:', url);
    expect(url).toMatch(/\/customer|\/my-meal-plans/);
  });
});
