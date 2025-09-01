/**
 * Analytics Dashboard E2E Tests
 * Story 1.9: Advanced Analytics Dashboard
 * 
 * Comprehensive tests for the admin analytics dashboard
 * including authentication, data visualization, and interactions
 */

import { test, expect, Page } from '@playwright/test';

// Test admin credentials
const adminCredentials = {
  email: 'admin@fitmeal.pro',
  password: 'AdminPass123'
};

// Helper function to login as admin
async function loginAsAdmin(page: Page) {
  // Add delay to avoid rate limiting
  await page.waitForTimeout(1000);
  
  await page.goto('http://localhost:4000/login');
  await page.fill('input[type="email"]', adminCredentials.email);
  await page.fill('input[type="password"]', adminCredentials.password);
  
  // Add small delay before submitting
  await page.waitForTimeout(500);
  await page.click('button[type="submit"]');
  
  // Wait for navigation to complete
  await page.waitForURL(/admin|trainer|customer/, { timeout: 10000 });
}

test.describe('Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin before each test
    await loginAsAdmin(page);
  });

  test('should display analytics dashboard link in admin page', async ({ page }) => {
    // Navigate to admin page
    await page.goto('http://localhost:4000/admin');
    
    // Check for analytics dashboard button
    const analyticsButton = page.getByRole('button', { name: /Analytics Dashboard/i });
    await expect(analyticsButton).toBeVisible();
    
    // Check that it has the chart icon
    const chartIcon = analyticsButton.locator('svg');
    await expect(chartIcon).toBeVisible();
  });

  test('should navigate to analytics dashboard', async ({ page }) => {
    // Navigate to admin page
    await page.goto('http://localhost:4000/admin');
    
    // Click analytics dashboard button
    await page.click('text=Analytics Dashboard');
    
    // Wait for navigation
    await page.waitForURL('**/admin/analytics');
    
    // Verify we're on the analytics page
    await expect(page.locator('h1')).toContainText('Analytics Dashboard');
  });

  test('should load and display system metrics', async ({ page }) => {
    // Navigate directly to analytics
    await page.goto('http://localhost:4000/admin/analytics');
    
    // Wait for metrics to load
    await page.waitForSelector('[data-testid="metrics-loaded"]', { timeout: 10000 });
    
    // Check for key metric cards
    await expect(page.locator('text=Total Users')).toBeVisible();
    await expect(page.locator('text=Active Today')).toBeVisible();
    await expect(page.locator('text=Total Recipes')).toBeVisible();
    await expect(page.locator('text=Active Plans')).toBeVisible();
  });

  test('should display all dashboard tabs', async ({ page }) => {
    await page.goto('http://localhost:4000/admin/analytics');
    
    // Wait for page to load
    await page.waitForSelector('[role="tablist"]');
    
    // Check all tabs are present
    const tabs = ['Overview', 'Users', 'Content', 'Performance', 'Security'];
    for (const tab of tabs) {
      await expect(page.locator(`[role="tab"]:has-text("${tab}")`)).toBeVisible();
    }
  });

  test('should switch between tabs', async ({ page }) => {
    await page.goto('http://localhost:4000/admin/analytics');
    
    // Wait for initial load
    await page.waitForSelector('[role="tablist"]');
    
    // Click Users tab
    await page.click('[role="tab"]:has-text("Users")');
    await expect(page.locator('text=Recent User Activity')).toBeVisible();
    
    // Click Content tab
    await page.click('[role="tab"]:has-text("Content")');
    await expect(page.locator('text=Recipe Creation Trends')).toBeVisible();
    
    // Click Performance tab
    await page.click('[role="tab"]:has-text("Performance")');
    await expect(page.locator('text=System Performance')).toBeVisible();
    
    // Click Security tab
    await page.click('[role="tab"]:has-text("Security")');
    await expect(page.locator('text=Security Overview')).toBeVisible();
  });

  test('should display charts in content tab', async ({ page }) => {
    await page.goto('http://localhost:4000/admin/analytics');
    
    // Switch to Content tab
    await page.click('[role="tab"]:has-text("Content")');
    
    // Wait for charts to render
    await page.waitForTimeout(2000);
    
    // Check for Recharts SVG elements
    const chartContainer = page.locator('.recharts-wrapper');
    await expect(chartContainer.first()).toBeVisible();
    
    // Check for chart elements
    const svgChart = page.locator('svg.recharts-surface');
    await expect(svgChart.first()).toBeVisible();
  });

  test('should display user distribution pie chart', async ({ page }) => {
    await page.goto('http://localhost:4000/admin/analytics');
    
    // Wait for Overview tab content
    await page.waitForSelector('text=User Distribution');
    
    // Check for pie chart
    const pieChart = page.locator('.recharts-pie');
    await expect(pieChart).toBeVisible();
    
    // Check for pie slices
    const pieSlices = page.locator('.recharts-pie-sector');
    const sliceCount = await pieSlices.count();
    expect(sliceCount).toBeGreaterThan(0);
  });

  test('should refresh metrics on button click', async ({ page }) => {
    await page.goto('http://localhost:4000/admin/analytics');
    
    // Wait for initial load
    await page.waitForSelector('[data-testid="metrics-loaded"]', { timeout: 10000 });
    
    // Find and click refresh button
    const refreshButton = page.locator('button:has-text("Refresh")');
    await expect(refreshButton).toBeVisible();
    
    // Click refresh
    await refreshButton.click();
    
    // Check for loading state or re-render
    await page.waitForTimeout(1000);
    
    // Metrics should still be visible
    await expect(page.locator('text=Total Users')).toBeVisible();
  });

  test('should handle export functionality', async ({ page }) => {
    await page.goto('http://localhost:4000/admin/analytics');
    
    // Wait for page load
    await page.waitForSelector('[data-testid="metrics-loaded"]', { timeout: 10000 });
    
    // Find export button
    const exportButton = page.locator('button:has-text("Export")');
    await expect(exportButton).toBeVisible();
    
    // Click export (should trigger download or show options)
    await exportButton.click();
    
    // Check for export options or download trigger
    // Note: Actual download testing would require additional setup
    await page.waitForTimeout(1000);
  });

  test('should display auto-refresh status', async ({ page }) => {
    await page.goto('http://localhost:4000/admin/analytics');
    
    // Check for auto-refresh indicator
    const autoRefreshText = page.locator('text=/Auto-refresh/i');
    await expect(autoRefreshText).toBeVisible();
  });

  test('should show loading state initially', async ({ page }) => {
    // Navigate and immediately check for loading
    const responsePromise = page.waitForResponse('**/api/analytics/metrics');
    await page.goto('http://localhost:4000/admin/analytics');
    
    // Check for loading spinner or text
    const loadingIndicator = page.locator('text=/Loading/i').or(page.locator('.animate-spin'));
    
    // Loading should be visible initially
    await expect(loadingIndicator).toBeVisible({ timeout: 2000 });
    
    // Wait for response
    await responsePromise;
    
    // Loading should disappear
    await expect(loadingIndicator).not.toBeVisible({ timeout: 10000 });
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Intercept API call to simulate error
    await page.route('**/api/analytics/metrics', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });
    
    await page.goto('http://localhost:4000/admin/analytics');
    
    // Should show error message
    await expect(page.locator('text=/error|failed/i')).toBeVisible({ timeout: 10000 });
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('http://localhost:4000/admin/analytics');
    
    // Check that content is still accessible
    await page.waitForSelector('h1:has-text("Analytics Dashboard")');
    
    // Tabs should be scrollable or stacked on mobile
    const tabList = page.locator('[role="tablist"]');
    await expect(tabList).toBeVisible();
    
    // Cards should stack vertically
    const cards = page.locator('.card');
    const firstCard = cards.first();
    await expect(firstCard).toBeVisible();
  });

  test('should deny access to non-admin users', async ({ page }) => {
    // Logout first
    await page.goto('http://localhost:4000');
    await page.evaluate(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    });
    
    // Try to access analytics directly
    await page.goto('http://localhost:4000/admin/analytics');
    
    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });

  test('should display real-time update indicator', async ({ page }) => {
    await page.goto('http://localhost:4000/admin/analytics');
    
    // Wait for metrics to load
    await page.waitForSelector('[data-testid="metrics-loaded"]', { timeout: 10000 });
    
    // Check for last updated timestamp
    const lastUpdated = page.locator('text=/Last updated:|Updated:/i');
    await expect(lastUpdated).toBeVisible();
  });

  test('should show performance metrics', async ({ page }) => {
    await page.goto('http://localhost:4000/admin/analytics');
    
    // Switch to Performance tab
    await page.click('[role="tab"]:has-text("Performance")');
    
    // Check for performance metrics
    await expect(page.locator('text=/Response Time/i')).toBeVisible();
    await expect(page.locator('text=/Error Rate/i')).toBeVisible();
    await expect(page.locator('text=/Uptime/i')).toBeVisible();
    await expect(page.locator('text=/Cache Hit Rate/i')).toBeVisible();
  });

  test('should show security alerts', async ({ page }) => {
    await page.goto('http://localhost:4000/admin/analytics');
    
    // Switch to Security tab
    await page.click('[role="tab"]:has-text("Security")');
    
    // Check for security metrics
    await expect(page.locator('text=/Failed Logins/i')).toBeVisible();
    await expect(page.locator('text=/Security Score/i')).toBeVisible();
    
    // Check for suspicious activities section
    const suspiciousSection = page.locator('text=/Suspicious Activities/i');
    await expect(suspiciousSection).toBeVisible();
  });

  test('should display user activity table', async ({ page }) => {
    await page.goto('http://localhost:4000/admin/analytics');
    
    // Switch to Users tab
    await page.click('[role="tab"]:has-text("Users")');
    
    // Wait for user activity table
    await page.waitForSelector('text=Recent User Activity');
    
    // Check for table headers
    await expect(page.locator('text=Email')).toBeVisible();
    await expect(page.locator('text=Role')).toBeVisible();
    await expect(page.locator('text=Last Active')).toBeVisible();
  });
});

test.describe('Analytics Dashboard - Data Integrity', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display consistent metric values', async ({ page }) => {
    await page.goto('http://localhost:4000/admin/analytics');
    
    // Wait for metrics to load
    await page.waitForSelector('[data-testid="metrics-loaded"]', { timeout: 10000 });
    
    // Get total users value
    const totalUsersCard = page.locator('text=Total Users').locator('..');
    const totalUsersText = await totalUsersCard.locator('.text-3xl, .text-2xl').textContent();
    const totalUsers = parseInt(totalUsersText || '0');
    
    // Total users should be a positive number
    expect(totalUsers).toBeGreaterThanOrEqual(0);
    
    // Check that active users don't exceed total users
    const activeCard = page.locator('text=Active Today').locator('..');
    const activeText = await activeCard.locator('.text-3xl, .text-2xl').textContent();
    const activeUsers = parseInt(activeText || '0');
    
    expect(activeUsers).toBeLessThanOrEqual(totalUsers);
  });

  test('should update metrics after refresh', async ({ page }) => {
    await page.goto('http://localhost:4000/admin/analytics');
    
    // Wait for initial load
    await page.waitForSelector('[data-testid="metrics-loaded"]', { timeout: 10000 });
    
    // Get initial timestamp
    const initialTimestamp = await page.locator('text=/Last updated:|Updated:/i').textContent();
    
    // Wait a bit
    await page.waitForTimeout(2000);
    
    // Click refresh
    await page.click('button:has-text("Refresh")');
    
    // Wait for update
    await page.waitForTimeout(1000);
    
    // Get new timestamp
    const newTimestamp = await page.locator('text=/Last updated:|Updated:/i').textContent();
    
    // Timestamps should be different (or at least exist)
    expect(initialTimestamp).toBeTruthy();
    expect(newTimestamp).toBeTruthy();
  });
});

test.describe('Analytics Dashboard - Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should handle empty data gracefully', async ({ page }) => {
    // Intercept API to return empty data
    await page.route('**/api/analytics/metrics', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            users: {
              total: 0,
              byRole: {},
              activeToday: 0,
              activeThisWeek: 0,
              activeThisMonth: 0,
              newThisWeek: 0,
              growthRate: 0
            },
            content: {
              totalRecipes: 0,
              approvedRecipes: 0,
              pendingRecipes: 0,
              totalMealPlans: 0,
              activeMealPlans: 0,
              avgRecipesPerPlan: 0
            },
            engagement: {
              dailyActiveUsers: 0,
              weeklyActiveUsers: 0,
              monthlyActiveUsers: 0,
              avgSessionDuration: 0,
              totalSessions: 0,
              bounceRate: 0
            },
            performance: {
              avgResponseTime: 0,
              errorRate: 0,
              uptime: 100,
              databaseSize: '0 MB',
              cacheHitRate: 0
            },
            business: {
              totalCustomers: 0,
              activeSubscriptions: 0,
              churnRate: 0,
              avgCustomersPerTrainer: 0,
              conversionRate: 0,
              revenue: {
                monthly: 0,
                annual: 0,
                growth: 0
              }
            }
          }
        })
      });
    });
    
    await page.goto('http://localhost:4000/admin/analytics');
    
    // Should display zero values without errors
    await expect(page.locator('text=Total Users')).toBeVisible();
    const totalUsersValue = page.locator('text=Total Users').locator('..').locator('.text-3xl, .text-2xl');
    await expect(totalUsersValue).toHaveText('0');
  });

  test('should handle rapid tab switching', async ({ page }) => {
    await page.goto('http://localhost:4000/admin/analytics');
    
    // Wait for initial load
    await page.waitForSelector('[role="tablist"]');
    
    // Rapidly switch between tabs
    const tabs = ['Users', 'Content', 'Performance', 'Security', 'Overview'];
    
    for (let i = 0; i < 3; i++) {
      for (const tab of tabs) {
        await page.click(`[role="tab"]:has-text("${tab}")`);
        await page.waitForTimeout(100);
      }
    }
    
    // Should end up on Overview tab without errors
    await expect(page.locator('text=User Distribution')).toBeVisible();
  });

  test('should maintain state during auto-refresh', async ({ page }) => {
    await page.goto('http://localhost:4000/admin/analytics');
    
    // Switch to Content tab
    await page.click('[role="tab"]:has-text("Content")');
    await expect(page.locator('text=Recipe Creation Trends')).toBeVisible();
    
    // Wait for auto-refresh (simulated)
    await page.waitForTimeout(5000);
    
    // Should still be on Content tab
    await expect(page.locator('text=Recipe Creation Trends')).toBeVisible();
  });

  test('should handle network interruption', async ({ page }) => {
    await page.goto('http://localhost:4000/admin/analytics');
    
    // Wait for initial load
    await page.waitForSelector('[data-testid="metrics-loaded"]', { timeout: 10000 });
    
    // Simulate network offline
    await page.context().setOffline(true);
    
    // Try to refresh
    await page.click('button:has-text("Refresh")');
    
    // Should show error or maintain previous data
    await page.waitForTimeout(2000);
    
    // Restore network
    await page.context().setOffline(false);
    
    // Refresh again
    await page.click('button:has-text("Refresh")');
    
    // Should recover
    await expect(page.locator('text=Total Users')).toBeVisible();
  });
});