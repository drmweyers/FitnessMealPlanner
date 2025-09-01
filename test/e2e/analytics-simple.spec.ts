/**
 * Simple Analytics Dashboard Test
 * Minimal test to verify basic functionality
 */

import { test, expect } from '@playwright/test';

test('can login as admin and access analytics dashboard', async ({ page }) => {
  // Wait to avoid rate limiting
  await page.waitForTimeout(2000);
  
  // Navigate to login
  await page.goto('http://localhost:4000/login');
  
  // Fill login form
  await page.fill('input[type="email"]', 'admin@fitmeal.pro');
  await page.fill('input[type="password"]', 'AdminPass123');
  
  // Wait before submitting to avoid rate limit
  await page.waitForTimeout(1000);
  
  // Submit login and wait for response
  const [response] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/auth/login')),
    page.click('button[type="submit"]')
  ]);
  
  // Check login response
  const responseData = await response.json();
  console.log('Login response:', responseData);
  
  // If login successful, wait for navigation
  if (response.ok() && (responseData.data?.accessToken || responseData.token)) {
    // Small delay for redirect to happen
    await page.waitForTimeout(2000);
    
    // Check current URL
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);
    
    // If still on login page, manually navigate based on role
    if (currentUrl.includes('/login')) {
      const userRole = responseData.user?.role || 'admin';
      const targetUrl = userRole === 'admin' ? '/admin' : '/trainer';
      await page.goto(`http://localhost:4000${targetUrl}`);
    }
  } else {
    throw new Error(`Login failed: ${JSON.stringify(responseData)}`);
  }
  
  // Navigate to admin page if not already there
  const currentUrl = page.url();
  if (!currentUrl.includes('/admin')) {
    await page.goto('http://localhost:4000/admin');
  }
  
  // Check for Analytics Dashboard button
  const analyticsButton = page.locator('text=Analytics Dashboard');
  await expect(analyticsButton).toBeVisible({ timeout: 10000 });
  
  // Click on Analytics Dashboard
  await analyticsButton.click();
  
  // Wait for navigation to analytics page
  await page.waitForURL('**/admin/analytics', { timeout: 10000 });
  
  // Verify we're on the analytics page
  await expect(page.locator('h1')).toContainText('Analytics Dashboard');
  
  // Wait for metrics to load
  await page.waitForSelector('[data-testid="metrics-loaded"]', { timeout: 15000 });
  
  // Check for key elements
  await expect(page.locator('text=Total Users')).toBeVisible();
  await expect(page.locator('text=Total Recipes')).toBeVisible();
  
  // Check tabs are present
  await expect(page.locator('[role="tab"]:has-text("Overview")')).toBeVisible();
  await expect(page.locator('[role="tab"]:has-text("Users")')).toBeVisible();
  await expect(page.locator('[role="tab"]:has-text("Content")')).toBeVisible();
  
  console.log('✅ Analytics Dashboard is working correctly!');
});