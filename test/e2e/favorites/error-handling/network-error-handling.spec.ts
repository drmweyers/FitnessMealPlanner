import { test, expect, Page } from '@playwright/test';
import { loginAsCustomer, takeTestScreenshot, waitForNetworkIdle } from '../../auth-helper';

/**
 * Network Error Handling Tests
 * 
 * Comprehensive testing of how the favoriting system handles various network
 * failures, API errors, and recovery scenarios.
 */

test.describe('Network Error Handling', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await loginAsCustomer(page);
  });

  test('Handles API failures gracefully', async () => {
    await test.step('Navigate to recipes page', async () => {
      await page.goto('/recipes');
      await waitForNetworkIdle(page);
      
      await takeTestScreenshot(page, 'before-api-failure.png', 'Page before API failure simulation');
    });

    await test.step('Simulate complete API failure', async () => {
      // Block all API requests to favorites endpoints
      await page.route('**/api/favorites**', route => route.abort());
      await page.route('**/api/favorites/**', route => route.abort());
      
      // Attempt to favorite a recipe
      const firstRecipeCard = page.locator('[data-testid="recipe-card"]').first();
      await firstRecipeCard.locator('[data-testid="favorite-button"]').click();
      
      // Should show error message
      await expect(page.locator('[data-testid="favorite-error-toast"]')).toBeVisible();
      await expect(page.locator('[data-testid="favorite-error-toast"]')).toContainText(/failed|error|try again/i);
      
      // Should show retry button
      await expect(page.locator('[data-testid="retry-favorite-button"]')).toBeVisible();
      
      // Button should remain in unfavorited state
      const favoriteButton = firstRecipeCard.locator('[data-testid="favorite-button"]');
      await expect(favoriteButton).toHaveAttribute('aria-pressed', 'false');
      
      await takeTestScreenshot(page, 'api-failure-error.png', 'Error display after API failure');
    });

    await test.step('Test retry functionality', async () => {
      // Restore network and test retry
      await page.unroute('**/api/favorites**');
      await page.unroute('**/api/favorites/**');
      
      // Click retry button
      await page.click('[data-testid="retry-favorite-button"]');
      
      // Should show success message
      await expect(page.locator('[data-testid="favorite-success-toast"]')).toBeVisible();
      
      // Button should now be in favorited state
      const firstRecipeCard = page.locator('[data-testid="recipe-card"]').first();
      const favoriteButton = firstRecipeCard.locator('[data-testid="favorite-button"]');
      await expect(favoriteButton).toHaveAttribute('aria-pressed', 'true');
      
      await takeTestScreenshot(page, 'retry-success.png', 'Successful retry after API failure');
    });

    await test.step('Test batch retry for multiple failed operations', async () => {
      // Block API again
      await page.route('**/api/favorites**', route => route.abort());
      
      // Attempt multiple favorite operations
      const recipeCards = page.locator('[data-testid="recipe-card"]');
      const cardCount = Math.min(3, await recipeCards.count());
      
      for (let i = 1; i < cardCount; i++) {
        await recipeCards.nth(i).locator('[data-testid="favorite-button"]').click();
        await expect(page.locator('[data-testid="favorite-error-toast"]')).toBeVisible();
      }
      
      // Should show batch retry option
      await expect(page.locator('[data-testid="batch-retry-banner"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-all-button"]')).toBeVisible();
      
      // Restore network and retry all
      await page.unroute('**/api/favorites**');
      await page.click('[data-testid="retry-all-button"]');
      
      // Should process all failed operations
      await expect(page.locator('[data-testid="batch-retry-progress"]')).toBeVisible();
      await expect(page.locator('[data-testid="batch-retry-success"]')).toBeVisible({ timeout: 10000 });
      
      await takeTestScreenshot(page, 'batch-retry-success.png', 'Batch retry completion');
    });
  });

  test('Handles slow network connections', async () => {
    await test.step('Simulate slow network responses', async () => {
      // Delay all API responses by 5 seconds
      await page.route('**/api/favorites**', async route => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        route.continue();
      });
      
      await page.goto('/recipes');
      await waitForNetworkIdle(page);
      
      // Attempt to favorite a recipe
      const startTime = Date.now();
      await page.click('[data-testid="favorite-button"]');
      
      // Should show loading state immediately
      await expect(page.locator('[data-testid="favorite-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="favorite-loading-spinner"]')).toBeVisible();
      
      // Should show timeout warning after reasonable time
      await expect(page.locator('[data-testid="slow-connection-warning"]')).toBeVisible({ timeout: 8000 });
      
      // Should eventually succeed
      await expect(page.locator('[data-testid="favorite-success-toast"]')).toBeVisible({ timeout: 15000 });
      
      const totalTime = Date.now() - startTime;
      console.log(`Slow network operation completed in: ${totalTime}ms`);
      
      await takeTestScreenshot(page, 'slow-network-completion.png', 'Operation completion with slow network');
    });

    await test.step('Test timeout handling', async () => {
      // Set very long delay to trigger timeout
      await page.route('**/api/favorites**', async route => {
        await new Promise(resolve => setTimeout(resolve, 30000)); // 30 second delay
        route.continue();
      });
      
      await page.click('[data-testid="favorite-button"]');
      
      // Should show timeout error
      await expect(page.locator('[data-testid="request-timeout-error"]')).toBeVisible({ timeout: 20000 });
      await expect(page.locator('[data-testid="timeout-retry-button"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'timeout-error.png', 'Timeout error handling');
    });

    await test.step('Test offline queue functionality', async () => {
      // Simulate offline state
      await page.context().setOffline(true);
      
      await page.goto('/recipes');
      await waitForNetworkIdle(page);
      
      // Should show offline indicator
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      
      // Attempt favorite operations while offline
      const recipeCards = page.locator('[data-testid="recipe-card"]');
      const cardCount = Math.min(3, await recipeCards.count());
      
      for (let i = 0; i < cardCount; i++) {
        await recipeCards.nth(i).locator('[data-testid="favorite-button"]').click();
        
        // Should queue the operation
        await expect(page.locator('[data-testid="action-queued-toast"]')).toBeVisible();
      }
      
      // Should show queued operations count
      await expect(page.locator('[data-testid="queued-operations-count"]')).toContainText('3');
      
      // Go back online
      await page.context().setOffline(false);
      await page.reload();
      await waitForNetworkIdle(page);
      
      // Should process queued operations
      await expect(page.locator('[data-testid="processing-queue-banner"]')).toBeVisible();
      await expect(page.locator('[data-testid="queue-processed-success"]')).toBeVisible({ timeout: 10000 });
      
      await takeTestScreenshot(page, 'offline-queue-processed.png', 'Offline queue processing completion');
    });
  });

  test('Handles server errors gracefully', async () => {
    await test.step('Test 500 internal server error', async () => {
      await page.route('**/api/favorites**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });
      
      await page.goto('/recipes');
      await waitForNetworkIdle(page);
      
      await page.click('[data-testid="favorite-button"]');
      
      // Should show server error message
      await expect(page.locator('[data-testid="server-error-toast"]')).toBeVisible();
      await expect(page.locator('[data-testid="server-error-toast"]')).toContainText(/server error|temporarily unavailable/i);
      
      // Should offer contact support option
      await expect(page.locator('[data-testid="contact-support-link"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'server-error-500.png', 'Server error 500 handling');
    });

    await test.step('Test 429 rate limiting error', async () => {
      await page.unroute('**/api/favorites**');
      await page.route('**/api/favorites**', route => {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          headers: {
            'Retry-After': '60'
          },
          body: JSON.stringify({ error: 'Rate limit exceeded' })
        });
      });
      
      await page.click('[data-testid="favorite-button"]');
      
      // Should show rate limit message
      await expect(page.locator('[data-testid="rate-limit-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="rate-limit-error"]')).toContainText(/too many requests|slow down/i);
      
      // Should show countdown timer
      await expect(page.locator('[data-testid="retry-countdown"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'rate-limit-error.png', 'Rate limiting error handling');
    });

    await test.step('Test 403 authorization error', async () => {
      await page.unroute('**/api/favorites**');
      await page.route('**/api/favorites**', route => {
        route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Forbidden' })
        });
      });
      
      await page.click('[data-testid="favorite-button"]');
      
      // Should show authorization error
      await expect(page.locator('[data-testid="auth-error-toast"]')).toBeVisible();
      await expect(page.locator('[data-testid="auth-error-toast"]')).toContainText(/permission|not authorized/i);
      
      // Should offer login refresh
      await expect(page.locator('[data-testid="refresh-login-button"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'auth-error-403.png', 'Authorization error handling');
    });
  });

  test('Handles Redis cache failures', async () => {
    await test.step('Simulate cache miss scenarios', async () => {
      // Mock slow API responses to simulate cache miss
      await page.route('**/api/favorites**', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        route.continue();
      });
      
      await page.goto('/favorites');
      
      // Should show loading state while fetching from database
      await expect(page.locator('[data-testid="favorites-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="cache-fallback-notice"]')).toBeVisible();
      
      // Should eventually load from database
      await expect(page.locator('[data-testid="favorites-list"]')).toBeVisible({ timeout: 10000 });
      
      await takeTestScreenshot(page, 'cache-miss-fallback.png', 'Cache miss fallback to database');
    });

    await test.step('Test cache inconsistency handling', async () => {
      // Simulate cache returning stale data
      let requestCount = 0;
      await page.route('**/api/favorites**', route => {
        requestCount++;
        if (requestCount === 1) {
          // First request returns stale data
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              favorites: [],
              cached: true,
              stale: true
            })
          });
        } else {
          // Subsequent requests return fresh data
          route.continue();
        }
      });
      
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Should show stale data warning
      await expect(page.locator('[data-testid="stale-data-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="refresh-data-button"]')).toBeVisible();
      
      // Click refresh to get fresh data
      await page.click('[data-testid="refresh-data-button"]');
      await waitForNetworkIdle(page);
      
      // Should show fresh data
      await expect(page.locator('[data-testid="stale-data-warning"]')).not.toBeVisible();
      
      await takeTestScreenshot(page, 'cache-refresh.png', 'Cache refresh for stale data');
    });

    await test.step('Test cache rebuild notification', async () => {
      // Simulate cache rebuild in progress
      await page.route('**/api/favorites**', route => {
        route.fulfill({
          status: 202,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Cache rebuilding, serving from database',
            rebuilding: true
          })
        });
      });
      
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Should show cache rebuild notification
      await expect(page.locator('[data-testid="cache-rebuild-notification"]')).toBeVisible();
      await expect(page.locator('[data-testid="cache-rebuild-notification"]')).toContainText(/rebuilding|updating/i);
      
      await takeTestScreenshot(page, 'cache-rebuilding.png', 'Cache rebuild notification');
    });
  });

  test('Handles concurrent operation conflicts', async () => {
    await test.step('Test concurrent favorite/unfavorite operations', async () => {
      await page.goto('/recipes');
      await waitForNetworkIdle(page);
      
      const favoriteButton = page.locator('[data-testid="favorite-button"]').first();
      
      // Simulate concurrent clicks
      await Promise.all([
        favoriteButton.click(),
        favoriteButton.click(),
        favoriteButton.click()
      ]);
      
      // Should handle gracefully without duplicate operations
      const toastCount = await page.locator('[data-testid="favorite-success-toast"]').count();
      expect(toastCount).toBeLessThanOrEqual(1); // Should not show multiple success toasts
      
      // Final state should be consistent
      await page.waitForTimeout(1000);
      const finalState = await favoriteButton.getAttribute('aria-pressed');
      expect(['true', 'false']).toContain(finalState);
      
      await takeTestScreenshot(page, 'concurrent-operations.png', 'Concurrent operation handling');
    });

    await test.step('Test optimistic UI with rollback', async () => {
      // Set up API to fail after initial success response
      let shouldFail = false;
      await page.route('**/api/favorites**', route => {
        if (shouldFail) {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Operation failed' })
          });
        } else {
          route.continue();
        }
      });
      
      // First operation succeeds
      await page.click('[data-testid="favorite-button"]');
      await expect(page.locator('[data-testid="favorite-success-toast"]')).toBeVisible();
      
      // Enable failure for next operation
      shouldFail = true;
      
      // Second operation should show optimistic UI then rollback
      const favoriteButton = page.locator('[data-testid="favorite-button"]').first();
      await favoriteButton.click();
      
      // Should briefly show optimistic state
      await expect(favoriteButton).toHaveAttribute('aria-pressed', 'false'); // Optimistic unfavorite
      
      // Then should rollback to previous state on error
      await expect(page.locator('[data-testid="operation-failed-toast"]')).toBeVisible();
      await expect(favoriteButton).toHaveAttribute('aria-pressed', 'true'); // Rollback to favorited
      
      await takeTestScreenshot(page, 'optimistic-rollback.png', 'Optimistic UI rollback on error');
    });
  });

  test('Handles data corruption and validation errors', async () => {
    await test.step('Test malformed API response handling', async () => {
      await page.route('**/api/favorites**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json response'
        });
      });
      
      await page.goto('/favorites');
      
      // Should show data corruption error
      await expect(page.locator('[data-testid="data-corruption-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="clear-cache-button"]')).toBeVisible();
      
      // Test cache clearing
      await page.click('[data-testid="clear-cache-button"]');
      await expect(page.locator('[data-testid="cache-cleared-toast"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'data-corruption-error.png', 'Data corruption error handling');
    });

    await test.step('Test validation error handling', async () => {
      await page.unroute('**/api/favorites**');
      await page.route('**/api/favorites**', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Validation failed',
            details: ['Recipe ID is required', 'User ID is invalid']
          })
        });
      });
      
      await page.goto('/recipes');
      await waitForNetworkIdle(page);
      
      await page.click('[data-testid="favorite-button"]');
      
      // Should show validation error details
      await expect(page.locator('[data-testid="validation-error-toast"]')).toBeVisible();
      await expect(page.locator('[data-testid="validation-error-details"]')).toBeVisible();
      
      // Should show report bug option for validation errors
      await expect(page.locator('[data-testid="report-bug-button"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'validation-error.png', 'Validation error handling');
    });

    await test.step('Test session expiration handling', async () => {
      await page.unroute('**/api/favorites**');
      await page.route('**/api/favorites**', route => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Session expired' })
        });
      });
      
      await page.click('[data-testid="favorite-button"]');
      
      // Should show session expired modal
      await expect(page.locator('[data-testid="session-expired-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="relogin-button"]')).toBeVisible();
      
      // Should offer to save pending operations
      await expect(page.locator('[data-testid="save-pending-operations"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'session-expired.png', 'Session expiration handling');
    });
  });
});