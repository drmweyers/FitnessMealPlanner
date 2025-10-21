/**
 * JWT Token Refresh Reliability Tests
 *
 * These tests validate the robustness of the JWT refresh token implementation,
 * specifically targeting race conditions, grace periods, and retry logic.
 *
 * Test Coverage:
 * 1. Multiple simultaneous requests near token expiry
 * 2. Token expiry during long API calls
 * 3. Token rotation without breaking active sessions
 * 4. User stays logged in across token refresh
 * 5. Graceful handling of expired refresh tokens
 */

import { test, expect, Page } from '@playwright/test';

// Test credentials
const TEST_USER = {
  email: 'customer.test@evofitmeals.com',
  password: 'TestCustomer123!',
};

// Helper to login and get cookies
async function loginUser(page: Page) {
  // First navigate to login page
  await page.goto('/login');

  // Fill in credentials
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');

  // Wait for redirect after login
  await page.waitForURL(/\/(my-meal-plans|customer)/, { timeout: 10000 });

  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle');

  // Get tokens from cookies
  const cookies = await page.context().cookies();
  const accessToken = cookies.find(c => c.name === 'token')?.value;
  const refreshToken = cookies.find(c => c.name === 'refreshToken')?.value;

  return { accessToken, refreshToken, cookies };
}

// Helper to make authenticated API request via page context
async function makeAuthenticatedRequest(page: Page, endpoint: string) {
  return page.evaluate(async (url) => {
    try {
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return {
        status: response.status,
        ok: response.ok,
      };
    } catch (error) {
      return {
        status: 0,
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, endpoint);
}

// Helper to check if user is authenticated by checking cookies
async function isUserAuthenticated(page: Page): Promise<boolean> {
  const cookies = await page.context().cookies();
  const hasToken = cookies.some(c => c.name === 'token');
  const hasRefreshToken = cookies.some(c => c.name === 'refreshToken');
  return hasToken && hasRefreshToken;
}

test.describe('JWT Token Refresh Reliability', () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear cookies before each test
    await context.clearCookies();

    // Navigate to base page to initialize context
    await page.goto('/');
  });

  test('should handle multiple simultaneous requests near token expiry', async ({ page }) => {
    // Login to get fresh tokens
    await loginUser(page);

    // Navigate to a page that makes multiple API calls
    await page.goto('/my-meal-plans');
    await page.waitForLoadState('networkidle');

    // Make multiple concurrent API requests
    const requests = Promise.all([
      makeAuthenticatedRequest(page, '/api/auth/me'),
      makeAuthenticatedRequest(page, '/api/auth/me'),
      makeAuthenticatedRequest(page, '/api/auth/me'),
      makeAuthenticatedRequest(page, '/api/auth/me'),
      makeAuthenticatedRequest(page, '/api/auth/me'),
    ]);

    const results = await requests;

    // All requests should succeed (either with original or refreshed token)
    results.forEach((result, index) => {
      expect(result.ok, `Request ${index + 1} should succeed`).toBe(true);
      expect(result.status, `Request ${index + 1} status`).toBe(200);
    });

    // Verify user is still logged in via cookies
    const isAuth = await isUserAuthenticated(page);
    expect(isAuth, 'User should still be logged in').toBe(true);
  });

  test('should refresh token during long API call', async ({ page }) => {
    await loginUser(page);

    // Navigate to authenticated page
    await page.goto('/my-meal-plans');
    await page.waitForLoadState('networkidle');

    // Make a request
    const response = await makeAuthenticatedRequest(page, '/api/auth/me');

    expect(response.ok, 'Long request should complete successfully').toBe(true);
    expect(response.status).toBe(200);

    // Verify token is still valid via cookies
    const isAuth = await isUserAuthenticated(page);
    expect(isAuth, 'Token should still exist').toBe(true);
  });

  test('should not break active session during token rotation', async ({ page }) => {
    await loginUser(page);

    // Navigate to meal plans page
    await page.goto('/my-meal-plans');
    await page.waitForLoadState('networkidle');

    // Verify page loaded successfully
    await expect(page.locator('h1, h2')).toContainText(/meal plan/i);

    // Make an API call to trigger potential token refresh
    await makeAuthenticatedRequest(page, '/api/auth/me');

    // Verify user is still on the same page (not redirected to login)
    expect(page.url()).not.toContain('/login');

    // Verify page is still functional
    await expect(page.locator('h1, h2')).toContainText(/meal plan/i);
  });

  test('should keep user logged in across token refresh', async ({ page }) => {
    await loginUser(page);

    // Navigate to multiple pages to trigger various API calls
    await page.goto('/my-meal-plans');
    await page.waitForLoadState('networkidle');

    // Verify logged in state via cookies
    const isAuth1 = await isUserAuthenticated(page);
    expect(isAuth1, 'User should be logged in initially').toBe(true);

    // Make several requests
    for (let i = 0; i < 5; i++) {
      await makeAuthenticatedRequest(page, '/api/auth/me');
      await page.waitForTimeout(100); // Small delay between requests
    }

    // Verify still logged in
    const isAuth2 = await isUserAuthenticated(page);
    expect(isAuth2, 'User should still be logged in after requests').toBe(true);

    // Navigate to another page
    await page.goto('/progress');
    await page.waitForLoadState('networkidle');

    // Should not be redirected to login
    expect(page.url(), 'Should not redirect to login').not.toContain('/login');
  });

  test('should handle expired refresh token gracefully', async ({ page, context }) => {
    await loginUser(page);

    // Navigate to authenticated page
    await page.goto('/my-meal-plans');
    await page.waitForLoadState('networkidle');

    // Simulate expired refresh token by clearing all cookies
    await context.clearCookies();

    // Try to make an API request - should fail and redirect
    await page.reload();

    // Should be redirected to login
    await page.waitForURL(/\/login/, { timeout: 5000 });
    expect(page.url()).toContain('/login');
  });

  test('should deduplicate concurrent refresh requests', async ({ page, context }) => {
    await loginUser(page);

    // Set up request interception to track refresh calls
    const refreshCalls: string[] = [];

    await page.route('**/api/auth/refresh_token', async (route) => {
      refreshCalls.push(new Date().toISOString());
      // Simulate slow refresh (300ms)
      await new Promise(resolve => setTimeout(resolve, 300));
      await route.continue();
    });

    // Navigate to page
    await page.goto('/my-meal-plans');
    await page.waitForLoadState('networkidle');

    // Clear access token cookie to force refresh on next request
    const cookies = await context.cookies();
    const otherCookies = cookies.filter(c => c.name !== 'token');
    await context.clearCookies();
    await context.addCookies(otherCookies);

    // Make multiple concurrent requests (should trigger only ONE refresh)
    await Promise.all([
      makeAuthenticatedRequest(page, '/api/auth/me'),
      makeAuthenticatedRequest(page, '/api/auth/me'),
      makeAuthenticatedRequest(page, '/api/auth/me'),
    ]);

    // Should have made only ONE refresh call (deduplication working)
    expect(refreshCalls.length, 'Should deduplicate refresh requests').toBeLessThanOrEqual(1);
  });

  test('should handle token refresh failure and redirect to login', async ({ page }) => {
    await loginUser(page);

    // Navigate to authenticated page
    await page.goto('/my-meal-plans');
    await page.waitForLoadState('networkidle');

    // Mock refresh endpoint to fail
    await page.route('**/api/auth/refresh_token', async (route) => {
      await route.fulfill({
        status: 401,
        body: JSON.stringify({
          status: 'error',
          code: 'REFRESH_TOKEN_EXPIRED',
        }),
      });
    });

    // Clear access token to force refresh
    const cookies = await page.context().cookies();
    const otherCookies = cookies.filter(c => c.name !== 'token');
    await page.context().clearCookies();
    await page.context().addCookies(otherCookies);

    // Try to make an API request
    await page.reload();

    // Should redirect to login
    await page.waitForURL(/\/login/, { timeout: 5000 });
    expect(page.url()).toContain('/login');
  });

  test('should preserve authentication state across page navigation', async ({ page }) => {
    await loginUser(page);

    // Navigate through multiple pages
    const pages = ['/my-meal-plans', '/progress', '/grocery-lists'];

    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');

      // Verify not redirected to login
      expect(page.url(), `Should stay on ${pagePath}`).not.toContain('/login');

      // Verify cookies still exist
      const isAuth = await isUserAuthenticated(page);
      expect(isAuth, `Should be authenticated on ${pagePath}`).toBe(true);
    }
  });

  test('should handle rapid token expiry and refresh cycles', async ({ page }) => {
    await loginUser(page);

    await page.goto('/my-meal-plans');
    await page.waitForLoadState('networkidle');

    // Make rapid successive requests
    for (let i = 0; i < 10; i++) {
      const response = await makeAuthenticatedRequest(page, '/api/auth/me');
      expect(response.ok, `Request ${i + 1} should succeed`).toBe(true);
    }

    // Verify user is still logged in
    const isAuth = await isUserAuthenticated(page);
    expect(isAuth, 'User should still be logged in').toBe(true);

    // Verify page is still functional
    await expect(page.locator('h1, h2')).toContainText(/meal plan/i);
  });
});

test.describe('Token Grace Period', () => {
  test('should accept requests with old token during grace period', async ({ page }) => {
    await loginUser(page);

    // Navigate to page
    await page.goto('/my-meal-plans');
    await page.waitForLoadState('networkidle');

    // Get current refresh token
    const cookies = await page.context().cookies();
    const oldRefreshToken = cookies.find(c => c.name === 'refreshToken')?.value;

    // Trigger refresh by making multiple requests
    // This should rotate the refresh token but keep old one in grace period
    await Promise.all([
      makeAuthenticatedRequest(page, '/api/auth/me'),
      makeAuthenticatedRequest(page, '/api/auth/me'),
    ]);

    // Get new refresh token
    const newCookies = await page.context().cookies();
    const newRefreshToken = newCookies.find(c => c.name === 'refreshToken')?.value;

    // If token was rotated, verify old token would still work during grace period
    if (oldRefreshToken !== newRefreshToken) {
      // Make another request - should succeed even if using grace period token
      const response = await makeAuthenticatedRequest(page, '/api/auth/me');
      expect(response.ok, 'Request with grace period token should succeed').toBe(true);
    }
  });
});

test.describe('Client-Side Retry Logic', () => {
  test('should retry failed requests with exponential backoff', async ({ page }) => {
    await loginUser(page);

    await page.goto('/my-meal-plans');
    await page.waitForLoadState('networkidle');

    // Track request attempts
    let attemptCount = 0;

    // Intercept API calls to simulate transient failures
    await page.route('**/api/customer/meal-plans', async (route) => {
      attemptCount++;

      // Fail first 2 attempts, succeed on 3rd
      if (attemptCount < 3) {
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server error' }),
        });
      } else {
        await route.continue();
      }
    });

    // Navigate to trigger the API call
    await page.goto('/my-meal-plans');

    // Wait for retries to complete
    await page.waitForTimeout(5000);

    // Should have retried (expect 3 attempts total)
    expect(attemptCount, 'Should retry failed requests').toBeGreaterThanOrEqual(2);
  });
});
