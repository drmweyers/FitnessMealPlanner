/**
 * Quick Manual Meal Plan Test
 * Simple test to verify basic functionality
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4000';

test('Quick check - Server and login page are accessible', async ({ page }) => {
  console.log('Testing server accessibility...');

  // Go to home page first
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60000 });
  console.log('✅ Home page loaded');

  // Wait for React to hydrate
  await page.waitForTimeout(3000);

  // Take screenshot
  await page.screenshot({ path: 'test-results/home-page.png', fullPage: true });

  // Try to navigate to login
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 60000 });
  console.log('✅ Login page loaded');

  await page.waitForTimeout(2000);

  // Take screenshot of login page
  await page.screenshot({ path: 'test-results/login-page.png', fullPage: true });

  // Check if we have any form elements
  const hasEmailInput = await page.locator('input[type="email"], input[name="email"]').count();
  const hasPasswordInput = await page.locator('input[type="password"], input[name="password"]').count();

  console.log(`Email inputs found: ${hasEmailInput}`);
  console.log(`Password inputs found: ${hasPasswordInput}`);

  if (hasEmailInput === 0 || hasPasswordInput === 0) {
    console.log('⚠️ Login form not fully loaded. Page might still be building.');
    const pageContent = await page.textContent('body');
    console.log('Page content:', pageContent?.substring(0, 500));
  } else {
    console.log('✅ Login form is present');
  }
});

test('Quick manual meal plan check - with manual login', async ({ page }) => {
  test.setTimeout(120000); // 2 minutes

  console.log('🎯 Starting quick manual meal plan test...');
  console.log('');
  console.log('⏳ Waiting for Vite to finish building frontend...');
  await page.waitForTimeout(10000); // Wait 10 seconds for Vite to build

  // Navigate to login
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  console.log('📄 Login page opened');

  // Wait for the page to be interactive
  await page.waitForLoadState('networkidle', { timeout: 60000 });
  await page.waitForTimeout(2000);

  // Find and fill login form
  console.log('🔐 Attempting login...');

  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 30000 });
  await emailInput.fill('trainer.test@evofitmeals.com');
  console.log('✅ Email entered');

  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  await passwordInput.fill('TestTrainer123!');
  console.log('✅ Password entered');

  const submitButton = page.locator('button[type="submit"]').first();
  await submitButton.click();
  console.log('✅ Login button clicked');

  // Wait for navigation
  await page.waitForURL(/.*\/(trainer|dashboard)/, { timeout: 30000 });
  console.log('✅ Logged in successfully');

  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Take screenshot
  await page.screenshot({ path: 'test-results/trainer-dashboard.png', fullPage: true });

  // Look for any text that indicates we're on the trainer page
  const pageContent = await page.textContent('body');
  console.log('Page content preview:', pageContent?.substring(0, 200));

  // Check if we can find saved plans or meal plan related content
  const hasMealPlanContent = pageContent?.includes('meal') || pageContent?.includes('plan');
  expect(hasMealPlanContent).toBeTruthy();

  console.log('✅ Trainer dashboard loaded with meal plan content');
  console.log('');
  console.log('📸 Screenshots saved to test-results/');
});
