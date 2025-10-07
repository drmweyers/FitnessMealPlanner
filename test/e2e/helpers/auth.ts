import { Page, expect } from '@playwright/test';

export async function loginAsTrainer(page: Page) {
  // Navigate to login page
  await page.goto('/', { waitUntil: 'networkidle' });
  
  // Check if already logged in
  const isLoggedIn = await page.locator('[data-testid="user-menu"]').isVisible();
  if (isLoggedIn) {
    // Navigate to trainer page if already logged in
    await page.goto('/trainer', { waitUntil: 'networkidle' });
    return;
  }
  
  // Look for login form or login button
  const hasLoginForm = await page.locator('[data-testid="login-form"]').isVisible();
  const hasLoginButton = await page.locator('text=Login').isVisible();
  
  if (hasLoginButton && !hasLoginForm) {
    await page.click('text=Login');
    await page.waitForSelector('[data-testid="login-form"]');
  }
  
  // Fill in trainer credentials
  await page.fill('[data-testid="email-input"]', 'testtrainer@example.com');
  await page.fill('[data-testid="password-input"]', 'TrainerPassword123!');
  
  // Submit login form
  await page.click('[data-testid="login-submit"]');
  
  // Wait for successful login and redirect to trainer page
  await page.waitForURL(/.*trainer.*/, { timeout: 10000 });
  
  // Verify we're logged in as trainer
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
}

export async function loginAsAdmin(page: Page) {
  await page.goto('/', { waitUntil: 'networkidle' });
  
  const isLoggedIn = await page.locator('[data-testid="user-menu"]').isVisible();
  if (isLoggedIn) {
    await page.goto('/admin', { waitUntil: 'networkidle' });
    return;
  }
  
  const hasLoginForm = await page.locator('[data-testid="login-form"]').isVisible();
  const hasLoginButton = await page.locator('text=Login').isVisible();
  
  if (hasLoginButton && !hasLoginForm) {
    await page.click('text=Login');
    await page.waitForSelector('[data-testid="login-form"]');
  }
  
  await page.fill('[data-testid="email-input"]', 'admin@fitmeal.pro');
  await page.fill('[data-testid="password-input"]', 'Admin123!@#');
  
  await page.click('[data-testid="login-submit"]');
  
  await page.waitForURL(/.*admin.*/, { timeout: 10000 });
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
}

export async function loginAsCustomer(page: Page) {
  await page.goto('/', { waitUntil: 'networkidle' });
  
  const isLoggedIn = await page.locator('[data-testid="user-menu"]').isVisible();
  if (isLoggedIn) {
    await page.goto('/customer', { waitUntil: 'networkidle' });
    return;
  }
  
  const hasLoginForm = await page.locator('[data-testid="login-form"]').isVisible();
  const hasLoginButton = await page.locator('text=Login').isVisible();
  
  if (hasLoginButton && !hasLoginForm) {
    await page.click('text=Login');
    await page.waitForSelector('[data-testid="login-form"]');
  }
  
  await page.fill('[data-testid="email-input"]', 'testcustomer@example.com');
  await page.fill('[data-testid="password-input"]', 'TestPassword123!');
  
  await page.click('[data-testid="login-submit"]');
  
  await page.waitForURL(/.*customer.*/, { timeout: 10000 });
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
}

export async function logout(page: Page) {
  await page.click('[data-testid="user-menu"]');
  await page.click('text=Logout');
  await page.waitForURL(/.*login.*|.*\/$/, { timeout: 5000 });
}