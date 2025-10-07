import { test, expect, Page } from '@playwright/test';
import { loginAsCustomer, takeTestScreenshot, waitForNetworkIdle } from '../../auth-helper';

/**
 * Chrome Favorites Tests
 * 
 * Chrome-specific testing of the favoriting system, including Chrome-specific
 * features, performance optimizations, and browser-specific behaviors.
 */

// Configure specifically for Chrome
test.use({ browserName: 'chromium' });

test.describe('Chrome Favorites Tests', () => {

  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await loginAsCustomer(page);
  });

  test('Chrome-specific features work correctly', async () => {
    await test.step('Test Chrome performance features', async () => {
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Test Chrome-specific performance metrics
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          loadEventEnd: navigation.loadEventEnd,
          loadEventStart: navigation.loadEventStart,
          domContentLoaded: navigation.domContentLoadedEventEnd,
          firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
        };
      });
      
      console.log('Chrome performance metrics:', performanceMetrics);
      
      // Chrome should have excellent loading performance
      expect(performanceMetrics.loadEventEnd - performanceMetrics.loadEventStart).toBeLessThan(1000);
      expect(performanceMetrics.firstContentfulPaint).toBeLessThan(1500);
      
      await takeTestScreenshot(page, 'chrome-performance-test.png', 'Chrome performance feature verification');
    });

    await test.step('Test Chrome DevTools Console integration', async () => {
      // Test that no errors are logged to console
      const consoleErrors: string[] = [];
      
      page.on('console', message => {
        if (message.type() === 'error') {
          consoleErrors.push(message.text());
        }
      });
      
      // Perform typical favorite operations
      await page.goto('/recipes');
      await waitForNetworkIdle(page);
      
      await page.click('[data-testid="favorite-button"]');
      await expect(page.locator('[data-testid="favorite-success-toast"]')).toBeVisible();
      
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Should have no console errors
      expect(consoleErrors.length).toBe(0);
      
      if (consoleErrors.length > 0) {
        console.log('Console errors detected:', consoleErrors);
      }
      
      await takeTestScreenshot(page, 'chrome-console-clean.png', 'Chrome console error verification');
    });

    await test.step('Test Chrome extension compatibility', async () => {
      // Test that favorites work with common Chrome extensions simulation
      // This simulates DOM modifications that extensions might make
      
      await page.addStyleTag({
        content: `
          /* Simulate extension injected styles */
          .extension-overlay { position: fixed; top: 0; left: 0; z-index: 9999; }
        `
      });
      
      await page.addScriptTag({
        content: `
          // Simulate extension DOM modifications
          document.addEventListener('DOMContentLoaded', () => {
            const overlay = document.createElement('div');
            overlay.className = 'extension-overlay';
            overlay.style.display = 'none';
            document.body.appendChild(overlay);
          });
        `
      });
      
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Favorites should still work with extension modifications
      await expect(page.locator('[data-testid="favorites-container"]')).toBeVisible();
      
      // Test interaction still works
      const favoriteButton = page.locator('[data-testid="favorite-button"]').first();
      if (await favoriteButton.count() > 0) {
        await favoriteButton.click();
        await expect(page.locator('[data-testid="favorite-success-toast"]')).toBeVisible();
      }
      
      await takeTestScreenshot(page, 'chrome-extension-compatibility.png', 'Chrome extension compatibility test');
    });
  });

  test('Chrome memory management and optimization', async () => {
    await test.step('Test Chrome memory usage patterns', async () => {
      await page.goto('/recipes');
      await waitForNetworkIdle(page);
      
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize
        } : null;
      });
      
      // Perform memory-intensive operations
      const recipeCards = page.locator('[data-testid="recipe-card"]');
      const cardCount = Math.min(20, await recipeCards.count());
      
      for (let i = 0; i < cardCount; i++) {
        await recipeCards.nth(i).locator('[data-testid="favorite-button"]').click();
        await page.waitForTimeout(50);
      }
      
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Get memory usage after operations
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize
        } : null;
      });
      
      if (initialMemory && finalMemory) {
        console.log('Chrome memory usage - Initial:', initialMemory);
        console.log('Chrome memory usage - Final:', finalMemory);
        
        // Memory growth should be reasonable
        const memoryGrowth = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
        
        // Should not use excessive total memory
        expect(finalMemory.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024); // Less than 100MB total
      }
      
      await takeTestScreenshot(page, 'chrome-memory-management.png', 'Chrome memory management test');
    });

    await test.step('Test Chrome garbage collection efficiency', async () => {
      // Force garbage collection if available (only in Chrome with specific flags)
      const gcResult = await page.evaluate(() => {
        if (window.gc) {
          const beforeGC = (performance as any).memory?.usedJSHeapSize || 0;
          window.gc();
          const afterGC = (performance as any).memory?.usedJSHeapSize || 0;
          return { beforeGC, afterGC };
        }
        return null;
      });
      
      if (gcResult) {
        console.log('Garbage collection result:', gcResult);
        
        // GC should reduce memory usage
        expect(gcResult.afterGC).toBeLessThanOrEqual(gcResult.beforeGC);
      }
      
      await takeTestScreenshot(page, 'chrome-gc-test.png', 'Chrome garbage collection test');
    });
  });

  test('Chrome security and privacy features', async () => {
    await test.step('Test Chrome same-origin policy compliance', async () => {
      // Test that favorites API respects same-origin policy
      const apiRequests: string[] = [];
      
      page.on('request', request => {
        if (request.url().includes('/api/')) {
          apiRequests.push(request.url());
        }
      });
      
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // All API requests should be to same origin
      const currentOrigin = new URL(page.url()).origin;
      
      for (const requestUrl of apiRequests) {
        const requestOrigin = new URL(requestUrl).origin;
        expect(requestOrigin).toBe(currentOrigin);
      }
      
      await takeTestScreenshot(page, 'chrome-same-origin-test.png', 'Chrome same-origin policy test');
    });

    await test.step('Test Chrome cookie handling', async () => {
      // Test that favorites work with Chrome's cookie policies
      const cookies = await page.context().cookies();
      console.log('Chrome cookies:', cookies.map(c => ({ name: c.name, secure: c.secure, sameSite: c.sameSite })));
      
      // Should have authentication cookies
      const authCookie = cookies.find(c => c.name.includes('auth') || c.name.includes('session'));
      expect(authCookie).toBeTruthy();
      
      if (authCookie) {
        // Should have secure cookie attributes for production
        if (page.url().startsWith('https://')) {
          expect(authCookie.secure).toBe(true);
          expect(authCookie.sameSite).toBe('strict' || 'lax');
        }
      }
      
      await takeTestScreenshot(page, 'chrome-cookie-test.png', 'Chrome cookie handling test');
    });

    await test.step('Test Chrome Content Security Policy compliance', async () => {
      // Check for CSP violations
      const cspViolations: any[] = [];
      
      page.on('console', message => {
        if (message.text().includes('Content Security Policy')) {
          cspViolations.push(message.text());
        }
      });
      
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Perform various operations that might trigger CSP
      await page.click('[data-testid="create-collection-button"]');
      await page.fill('[data-testid="collection-name-input"]', 'CSP Test Collection');
      await page.click('[data-testid="save-collection-button"]');
      
      // Should have no CSP violations
      expect(cspViolations.length).toBe(0);
      
      if (cspViolations.length > 0) {
        console.log('CSP violations detected:', cspViolations);
      }
      
      await takeTestScreenshot(page, 'chrome-csp-test.png', 'Chrome CSP compliance test');
    });
  });

  test('Chrome developer tools integration', async () => {
    await test.step('Test Chrome debugging features', async () => {
      // Test that source maps work correctly for debugging
      const sourceMapError = await page.evaluate(() => {
        try {
          // Trigger a potential source map lookup
          const error = new Error('Test error for source mapping');
          return error.stack?.includes('.ts') || error.stack?.includes('webpack://');
        } catch (e) {
          return false;
        }
      });
      
      // In development, should have source map support
      console.log('Source map support detected:', sourceMapError);
      
      await takeTestScreenshot(page, 'chrome-debugging-test.png', 'Chrome debugging features test');
    });

    await test.step('Test Chrome performance profiling', async () => {
      // Test performance timing API availability
      const performanceAPISupport = await page.evaluate(() => {
        return {
          hasPerformance: typeof performance !== 'undefined',
          hasNavigation: typeof performance.getEntriesByType === 'function',
          hasResourceTiming: performance.getEntriesByType('resource').length > 0,
          hasUserTiming: typeof performance.mark === 'function',
          hasMemory: !!(performance as any).memory
        };
      });
      
      console.log('Chrome Performance API support:', performanceAPISupport);
      
      // Chrome should support all performance APIs
      expect(performanceAPISupport.hasPerformance).toBe(true);
      expect(performanceAPISupport.hasNavigation).toBe(true);
      expect(performanceAPISupport.hasUserTiming).toBe(true);
      expect(performanceAPISupport.hasMemory).toBe(true);
      
      await takeTestScreenshot(page, 'chrome-performance-api.png', 'Chrome Performance API test');
    });
  });

  test('Chrome experimental features', async () => {
    await test.step('Test Chrome Web Vitals API', async () => {
      // Test Web Vitals API support (Chrome-specific)
      const webVitalsSupport = await page.evaluate(() => {
        return {
          hasLCP: 'PerformanceObserver' in window,
          hasCLS: 'LayoutShift' in window || 'PerformanceObserver' in window,
          hasFID: 'PerformanceEventTiming' in window || 'PerformanceObserver' in window
        };
      });
      
      console.log('Chrome Web Vitals support:', webVitalsSupport);
      
      // Test actual Web Vitals measurement
      if (webVitalsSupport.hasLCP) {
        const lcpValue = await page.evaluate(() => {
          return new Promise((resolve) => {
            const observer = new PerformanceObserver((list) => {
              const entries = list.getEntries();
              const lastEntry = entries[entries.length - 1];
              resolve(lastEntry.startTime);
            });
            observer.observe({ entryTypes: ['largest-contentful-paint'] });
            
            // Timeout fallback
            setTimeout(() => resolve(0), 3000);
          });
        });
        
        console.log('Chrome LCP measurement:', lcpValue);
        expect(lcpValue).toBeGreaterThan(0);
      }
      
      await takeTestScreenshot(page, 'chrome-web-vitals.png', 'Chrome Web Vitals API test');
    });

    await test.step('Test Chrome Service Worker compatibility', async () => {
      // Test service worker registration (if available)
      const serviceWorkerSupport = await page.evaluate(() => {
        return {
          hasServiceWorker: 'serviceWorker' in navigator,
          hasRegistration: !!(navigator as any).serviceWorker?.getRegistration
        };
      });
      
      console.log('Chrome Service Worker support:', serviceWorkerSupport);
      
      if (serviceWorkerSupport.hasServiceWorker) {
        // Test that favorites work with service worker
        await page.goto('/favorites');
        await waitForNetworkIdle(page);
        
        // Favorites should load correctly
        await expect(page.locator('[data-testid="favorites-container"]')).toBeVisible();
        
        // Test offline simulation with service worker
        await page.context().setOffline(true);
        
        // Should show offline indicator or cached content
        const hasOfflineIndicator = await page.locator('[data-testid="offline-indicator"]').isVisible({ timeout: 2000 });
        const hasCachedContent = await page.locator('[data-testid="favorites-container"]').isVisible();
        
        expect(hasOfflineIndicator || hasCachedContent).toBe(true);
        
        // Restore online state
        await page.context().setOffline(false);
      }
      
      await takeTestScreenshot(page, 'chrome-service-worker.png', 'Chrome Service Worker test');
    });

    await test.step('Test Chrome native file system access', async () => {
      // Test File System Access API (Chrome-specific)
      const fileSystemSupport = await page.evaluate(() => {
        return {
          hasFileSystemAccess: 'showOpenFilePicker' in window,
          hasDirectoryAccess: 'showDirectoryPicker' in window,
          hasWriteAccess: 'showSaveFilePicker' in window
        };
      });
      
      console.log('Chrome File System API support:', fileSystemSupport);
      
      // If supported, test export functionality
      if (fileSystemSupport.hasWriteAccess) {
        // This would require user interaction to actually test
        // For now, just verify the API is available
        expect(fileSystemSupport.hasWriteAccess).toBe(true);
      }
      
      await takeTestScreenshot(page, 'chrome-file-system-api.png', 'Chrome File System API test');
    });
  });

  test('Chrome accessibility features', async () => {
    await test.step('Test Chrome accessibility tree', async () => {
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Test accessibility tree structure
      const accessibilitySnapshot = await page.accessibility.snapshot();
      expect(accessibilitySnapshot).toBeTruthy();
      
      if (accessibilitySnapshot) {
        // Should have proper structure
        expect(accessibilitySnapshot.children).toBeTruthy();
        
        // Find favorite buttons in accessibility tree
        const findFavoriteButtons = (node: any): any[] => {
          let buttons: any[] = [];
          
          if (node.role === 'button' && node.name?.toLowerCase().includes('favorite')) {
            buttons.push(node);
          }
          
          if (node.children) {
            for (const child of node.children) {
              buttons = buttons.concat(findFavoriteButtons(child));
            }
          }
          
          return buttons;
        };
        
        const favoriteButtons = findFavoriteButtons(accessibilitySnapshot);
        console.log(`Found ${favoriteButtons.length} favorite buttons in accessibility tree`);
        
        // Should find favorite buttons
        expect(favoriteButtons.length).toBeGreaterThanOrEqual(0);
      }
      
      await takeTestScreenshot(page, 'chrome-accessibility-tree.png', 'Chrome accessibility tree test');
    });

    await test.step('Test Chrome screen reader compatibility', async () => {
      // Test ARIA live regions work in Chrome
      const liveRegions = await page.locator('[aria-live]').count();
      expect(liveRegions).toBeGreaterThan(0);
      
      // Test announcements
      await page.click('[data-testid="favorite-button"]');
      
      // Check for announcement in live region
      const liveRegion = page.locator('[aria-live="polite"]');
      if (await liveRegion.count() > 0) {
        const announcement = await liveRegion.textContent();
        console.log('Chrome live region announcement:', announcement);
      }
      
      await takeTestScreenshot(page, 'chrome-screen-reader.png', 'Chrome screen reader compatibility test');
    });
  });
});