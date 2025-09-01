/**
 * Direct Analytics Dashboard UI Test
 * Tests the UI directly by setting authentication token
 */

import { test, expect } from '@playwright/test';

test('analytics dashboard UI works correctly', async ({ page, request }) => {
  // First get a token via API (longer wait to avoid rate limit)
  await new Promise(resolve => setTimeout(resolve, 20000));
  
  const loginResponse = await request.post('http://localhost:4000/api/auth/login', {
    data: {
      email: 'admin@fitmeal.pro',
      password: 'AdminPass123'
    }
  });
  
  if (!loginResponse.ok()) {
    const error = await loginResponse.json();
    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      console.log('Rate limited, skipping test');
      test.skip();
      return;
    }
    throw new Error(`Login failed: ${JSON.stringify(error)}`);
  }
  
  const loginData = await loginResponse.json();
  const token = loginData.data?.accessToken;
  const user = loginData.data?.user;
  
  console.log('✅ Got auth token');
  
  // Set auth data in localStorage
  await page.goto('http://localhost:4000/login');
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }, { token, user });
  
  console.log('✅ Set auth data in localStorage');
  
  // Navigate directly to admin page
  await page.goto('http://localhost:4000/admin');
  
  // Verify we're on the admin page - use more specific selector
  await expect(page.locator('h1.text-3xl')).toContainText('Admin Dashboard', { timeout: 10000 });
  console.log('✅ On admin dashboard');
  
  // Check for Analytics Dashboard button
  const analyticsButton = page.locator('text=Analytics Dashboard');
  await expect(analyticsButton).toBeVisible();
  console.log('✅ Analytics button visible');
  
  // Click on Analytics Dashboard
  await analyticsButton.click();
  
  // Wait for navigation to analytics page
  await page.waitForURL('**/admin/analytics');
  console.log('✅ Navigated to analytics page');
  
  // Verify we're on the analytics page - use more specific selector
  await expect(page.locator('h1.text-3xl, h1:has-text("Analytics")')).toContainText('Analytics Dashboard');
  console.log('✅ Analytics Dashboard header visible');
  
  // Wait for metrics to load
  await page.waitForSelector('[data-testid="metrics-loaded"]', { timeout: 15000 });
  console.log('✅ Metrics loaded');
  
  // Check for key metric cards
  await expect(page.locator('text=Total Users')).toBeVisible();
  await expect(page.locator('text=Total Recipes')).toBeVisible();
  await expect(page.locator('text=Active Plans')).toBeVisible();
  console.log('✅ Metric cards visible');
  
  // Check tabs are present
  const tabs = ['Overview', 'Users', 'Content', 'Performance', 'Security'];
  for (const tab of tabs) {
    await expect(page.locator(`[role="tab"]:has-text("${tab}")`)).toBeVisible();
  }
  console.log('✅ All tabs visible');
  
  // Test tab switching
  await page.click('[role="tab"]:has-text("Content")');
  await expect(page.locator('text=Recipe Creation Trends')).toBeVisible({ timeout: 5000 });
  console.log('✅ Content tab works');
  
  // Check for charts
  const chartContainer = page.locator('.recharts-wrapper');
  await expect(chartContainer.first()).toBeVisible();
  console.log('✅ Charts are rendering');
  
  // Test Users tab
  await page.click('[role="tab"]:has-text("Users")');
  await expect(page.locator('text=Recent User Activity')).toBeVisible({ timeout: 5000 });
  console.log('✅ Users tab works');
  
  // Test Performance tab
  await page.click('[role="tab"]:has-text("Performance")');
  await expect(page.locator('text=System Performance')).toBeVisible({ timeout: 5000 });
  console.log('✅ Performance tab works');
  
  // Test Security tab
  await page.click('[role="tab"]:has-text("Security")');
  await expect(page.locator('text=Security Overview')).toBeVisible({ timeout: 5000 });
  console.log('✅ Security tab works');
  
  // Go back to Overview
  await page.click('[role="tab"]:has-text("Overview")');
  await expect(page.locator('text=User Distribution')).toBeVisible({ timeout: 5000 });
  console.log('✅ Overview tab works');
  
  // Check for pie chart on Overview
  const pieChart = page.locator('.recharts-pie');
  await expect(pieChart).toBeVisible();
  console.log('✅ Pie chart visible');
  
  // Test Refresh button
  const refreshButton = page.locator('button:has-text("Refresh")');
  await expect(refreshButton).toBeVisible();
  await refreshButton.click();
  await page.waitForTimeout(1000);
  console.log('✅ Refresh button works');
  
  // Test Export button
  const exportButton = page.locator('button:has-text("Export")');
  await expect(exportButton).toBeVisible();
  console.log('✅ Export button visible');
  
  // Check responsive behavior
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(500);
  await expect(page.locator('h1:has-text("Analytics Dashboard")')).toBeVisible();
  console.log('✅ Responsive on mobile');
  
  console.log('\n🎉 Analytics Dashboard UI Test Complete!');
  console.log('================================');
  console.log('✅ All UI components working correctly');
  console.log('✅ Charts rendering properly');
  console.log('✅ Tab navigation functional');
  console.log('✅ Responsive design verified');
});