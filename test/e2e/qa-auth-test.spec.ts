/**
 * QA Authentication Test
 * Tests login for all three roles
 */

import { test, expect } from '@playwright/test';

const testCredentials = {
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

test.describe('Authentication Tests', () => {
  test('Admin can login successfully', async ({ page }) => {
    await page.goto('http://localhost:4000/login');
    
    // Fill in credentials
    await page.fill('input[type="email"]', testCredentials.admin.email);
    await page.fill('input[type="password"]', testCredentials.admin.password);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForURL(/admin|trainer/, { timeout: 10000 });
    
    // Verify we're logged in
    const url = page.url();
    console.log('Admin logged in, redirected to:', url);
    expect(url).toMatch(/admin|trainer/);
  });

  test('Trainer can login successfully', async ({ page }) => {
    // Wait to avoid rate limiting
    await page.waitForTimeout(2000);
    
    await page.goto('http://localhost:4000/login');
    
    // Fill in credentials
    await page.fill('input[type="email"]', testCredentials.trainer.email);
    await page.fill('input[type="password"]', testCredentials.trainer.password);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForURL(/trainer|admin/, { timeout: 10000 });
    
    // Verify we're logged in
    const url = page.url();
    console.log('Trainer logged in, redirected to:', url);
    expect(url).toMatch(/trainer|admin/);
  });

  test('Customer can login successfully', async ({ page }) => {
    // Wait to avoid rate limiting
    await page.waitForTimeout(2000);
    
    await page.goto('http://localhost:4000/login');
    
    // Fill in credentials
    await page.fill('input[type="email"]', testCredentials.customer.email);
    await page.fill('input[type="password"]', testCredentials.customer.password);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for navigation - customers redirect to /my-meal-plans
    await page.waitForURL('**/my-meal-plans', { timeout: 10000 });
    
    // Verify we're logged in
    const url = page.url();
    console.log('Customer logged in, redirected to:', url);
    expect(url).toContain('/my-meal-plans');
  });
});