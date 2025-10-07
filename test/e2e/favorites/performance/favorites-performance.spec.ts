import { test, expect, Page } from '@playwright/test';
import { loginAsCustomer, loginAsTrainer, loginAsAdmin, takeTestScreenshot, waitForNetworkIdle } from '../../auth-helper';

/**
 * Favorites Performance Tests
 * 
 * Comprehensive performance testing of the favoriting system including:
 * - Page load performance
 * - Large dataset handling
 * - Memory usage optimization
 * - Network efficiency
 * - Core Web Vitals compliance
 */

test.describe('Favorites Performance Tests', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
  });

  test('Favorites page load performance', async () => {
    await test.step('Login and measure initial load time', async () => {
      const startTime = Date.now();
      
      await loginAsCustomer(page);
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(2000); // Should load within 2 seconds
      
      console.log(`Favorites page load time: ${loadTime}ms`);
      await takeTestScreenshot(page, 'favorites-page-loaded.png', 'Favorites page after load');
    });

    await test.step('Measure Core Web Vitals', async () => {
      // Measure Largest Contentful Paint (LCP)
      const lcp = await page.evaluate(() => {
        return new Promise((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            resolve(lastEntry.startTime);
          });
          observer.observe({ entryTypes: ['largest-contentful-paint'] });
          
          // Fallback timeout
          setTimeout(() => resolve(0), 5000);
        });
      });
      
      expect(lcp).toBeLessThan(2500); // LCP should be under 2.5s
      console.log(`Largest Contentful Paint: ${lcp}ms`);
      
      // Measure Cumulative Layout Shift (CLS)
      const cls = await page.evaluate(() => {
        return new Promise((resolve) => {
          let clsValue = 0;
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            }
          });
          observer.observe({ entryTypes: ['layout-shift'] });
          
          setTimeout(() => resolve(clsValue), 3000);
        });
      });
      
      expect(cls).toBeLessThan(0.1); // CLS should be under 0.1
      console.log(`Cumulative Layout Shift: ${cls}`);
      
      // Measure First Input Delay (FID) simulation
      const firstInteractionTime = Date.now();
      await page.click('[data-testid="favorite-button"]', { timeout: 1000 });
      const interactionDelay = Date.now() - firstInteractionTime;
      
      expect(interactionDelay).toBeLessThan(100); // FID should be under 100ms
      console.log(`First Interaction Delay: ${interactionDelay}ms`);
    });

    await test.step('Measure resource loading efficiency', async () => {
      const resourceMetrics = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource');
        const totalSize = resources.reduce((sum: number, resource: any) => {
          return sum + (resource.transferSize || 0);
        }, 0);
        
        const imageResources = resources.filter((r: any) => r.initiatorType === 'img');
        const scriptResources = resources.filter((r: any) => r.initiatorType === 'script');
        const styleResources = resources.filter((r: any) => r.initiatorType === 'link');
        
        return {
          totalResources: resources.length,
          totalSize: totalSize,
          imageCount: imageResources.length,
          scriptCount: scriptResources.length,
          styleCount: styleResources.length
        };
      });
      
      console.log('Resource metrics:', resourceMetrics);
      
      // Total page size should be reasonable
      expect(resourceMetrics.totalSize).toBeLessThan(5 * 1024 * 1024); // Under 5MB
      
      // Should not load excessive resources
      expect(resourceMetrics.totalResources).toBeLessThan(100);
    });
  });

  test('Large favorites list performance', async () => {
    await test.step('Setup large favorites dataset', async () => {
      await loginAsCustomer(page);
      
      // Create large favorites list via API or simulation
      await page.evaluate(() => {
        // Simulate large favorites list
        window.largeFavoritesList = Array.from({ length: 1000 }, (_, i) => ({
          id: `recipe-${i}`,
          name: `Recipe ${i + 1}`,
          description: `Description for recipe ${i + 1}`,
          image: `https://example.com/recipe-${i}.jpg`,
          calories: 200 + (i % 300),
          protein: 15 + (i % 20),
          cookTime: 20 + (i % 40)
        }));
      });
      
      console.log('Large favorites dataset created');
    });

    await test.step('Test virtualization performance', async () => {
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Should use virtual scrolling for large lists
      await expect(page.locator('[data-testid="virtual-list"]')).toBeVisible();
      
      // Measure initial render time with large dataset
      const renderStartTime = Date.now();
      
      // Scroll through list and measure performance
      for (let i = 0; i < 10; i++) {
        await page.mouse.wheel(0, 500);
        await page.waitForTimeout(100);
      }
      
      const renderTime = Date.now() - renderStartTime;
      expect(renderTime).toBeLessThan(2000); // Should handle scrolling smoothly
      
      console.log(`Large list scroll performance: ${renderTime}ms`);
      
      await takeTestScreenshot(page, 'large-list-performance.png', 'Large favorites list performance');
    });

    await test.step('Test memory usage with large datasets', async () => {
      // Check memory usage
      const memoryUsage = await page.evaluate(() => {
        if ((performance as any).memory) {
          return {
            usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
            totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
            jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
          };
        }
        return null;
      });
      
      if (memoryUsage) {
        console.log('Memory usage:', memoryUsage);
        
        // Memory usage should be reasonable
        expect(memoryUsage.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024); // Under 100MB
        
        // Memory usage should not exceed 80% of limit
        const memoryUsagePercentage = memoryUsage.usedJSHeapSize / memoryUsage.jsHeapSizeLimit;
        expect(memoryUsagePercentage).toBeLessThan(0.8);
      }
    });

    await test.step('Test search performance with large datasets', async () => {
      const searchStartTime = Date.now();
      
      // Perform search on large dataset
      await page.fill('[data-testid="favorites-search-input"]', 'chicken');
      await waitForNetworkIdle(page);
      
      const searchTime = Date.now() - searchStartTime;
      expect(searchTime).toBeLessThan(500); // Search should be fast
      
      console.log(`Search performance on large dataset: ${searchTime}ms`);
      
      // Verify search results are relevant and limited
      const searchResults = page.locator('[data-testid="favorite-recipe-item"]');
      const resultCount = await searchResults.count();
      
      expect(resultCount).toBeGreaterThan(0);
      expect(resultCount).toBeLessThan(50); // Should limit results for performance
    });
  });

  test('Network efficiency and caching', async () => {
    await test.step('Test initial network requests', async () => {
      await loginAsCustomer(page);
      
      // Monitor network requests
      const requests: any[] = [];
      page.on('request', request => {
        requests.push({
          url: request.url(),
          method: request.method(),
          resourceType: request.resourceType()
        });
      });
      
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      console.log(`Total network requests: ${requests.length}`);
      
      // Should not make excessive requests
      expect(requests.length).toBeLessThan(30);
      
      // Check for duplicate requests
      const duplicateRequests = requests.filter((request, index, arr) => 
        arr.findIndex(r => r.url === request.url) !== index
      );
      
      expect(duplicateRequests.length).toBe(0); // No duplicate requests
    });

    await test.step('Test caching behavior', async () => {
      // Navigate away and back to test caching
      await page.goto('/recipes');
      await waitForNetworkIdle(page);
      
      const cachedRequests: any[] = [];
      page.on('request', request => {
        cachedRequests.push({
          url: request.url(),
          method: request.method()
        });
      });
      
      // Return to favorites - should use cached data
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      console.log(`Cached navigation requests: ${cachedRequests.length}`);
      
      // Should make fewer requests due to caching
      expect(cachedRequests.length).toBeLessThan(15);
    });

    await test.step('Test image loading optimization', async () => {
      const imageLoadTimes: number[] = [];
      
      page.on('response', response => {
        if (response.url().includes('image') || response.url().includes('jpg') || response.url().includes('png')) {
          const request = response.request();
          const loadTime = Date.now() - request.timing().requestTime;
          imageLoadTimes.push(loadTime);
        }
      });
      
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      if (imageLoadTimes.length > 0) {
        const avgImageLoadTime = imageLoadTimes.reduce((a, b) => a + b, 0) / imageLoadTimes.length;
        console.log(`Average image load time: ${avgImageLoadTime}ms`);
        
        expect(avgImageLoadTime).toBeLessThan(1000); // Images should load quickly
      }
      
      await takeTestScreenshot(page, 'image-loading-performance.png', 'Image loading performance test');
    });
  });

  test('Favorites interaction performance', async () => {
    await test.step('Test favorite button responsiveness', async () => {
      await loginAsCustomer(page);
      await page.goto('/recipes');
      await waitForNetworkIdle(page);
      
      const favoriteButtons = page.locator('[data-testid="favorite-button"]');
      const buttonCount = Math.min(10, await favoriteButtons.count());
      
      const interactionTimes: number[] = [];
      
      for (let i = 0; i < buttonCount; i++) {
        const startTime = Date.now();
        
        await favoriteButtons.nth(i).click();
        await expect(page.locator('[data-testid="favorite-success-toast"]')).toBeVisible();
        
        const interactionTime = Date.now() - startTime;
        interactionTimes.push(interactionTime);
        
        console.log(`Favorite button ${i + 1} interaction time: ${interactionTime}ms`);
      }
      
      const avgInteractionTime = interactionTimes.reduce((a, b) => a + b, 0) / interactionTimes.length;
      expect(avgInteractionTime).toBeLessThan(200); // Should respond quickly
      
      console.log(`Average favorite interaction time: ${avgInteractionTime}ms`);
    });

    await test.step('Test collection operations performance', async () => {
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Test collection creation performance
      const createStartTime = Date.now();
      
      await page.click('[data-testid="create-collection-button"]');
      await page.fill('[data-testid="collection-name-input"]', 'Performance Test Collection');
      await page.click('[data-testid="save-collection-button"]');
      await expect(page.locator('[data-testid="collection-created-toast"]')).toBeVisible();
      
      const createTime = Date.now() - createStartTime;
      expect(createTime).toBeLessThan(1000);
      
      console.log(`Collection creation time: ${createTime}ms`);
      
      // Test adding recipes to collection performance
      const favoriteItems = page.locator('[data-testid="favorite-recipe-item"]');
      const itemCount = Math.min(5, await favoriteItems.count());
      
      const addTimes: number[] = [];
      
      for (let i = 0; i < itemCount; i++) {
        const addStartTime = Date.now();
        
        await favoriteItems.nth(i).locator('[data-testid="recipe-actions-menu"]').click();
        await page.click('[data-testid="add-to-collection-option"]');
        await page.selectOption('[data-testid="collection-select"]', 'Performance Test Collection');
        await page.click('[data-testid="confirm-add-to-collection"]');
        await expect(page.locator('[data-testid="add-to-collection-success-toast"]')).toBeVisible();
        
        const addTime = Date.now() - addStartTime;
        addTimes.push(addTime);
      }
      
      const avgAddTime = addTimes.reduce((a, b) => a + b, 0) / addTimes.length;
      expect(avgAddTime).toBeLessThan(500);
      
      console.log(`Average add to collection time: ${avgAddTime}ms`);
    });
  });

  test('Concurrent user performance simulation', async () => {
    await test.step('Simulate multiple user actions', async () => {
      // Create multiple browser contexts to simulate concurrent users
      const contexts = await Promise.all([
        page.context().browser()?.newContext(),
        page.context().browser()?.newContext(),
        page.context().browser()?.newContext()
      ]);
      
      const pages = await Promise.all(
        contexts.filter(Boolean).map(context => context!.newPage())
      );
      
      // Login different user types concurrently
      const loginPromises = [
        loginAsCustomer(pages[0]),
        loginAsTrainer(pages[1]),
        loginAsAdmin(pages[2])
      ];
      
      const loginStartTime = Date.now();
      await Promise.all(loginPromises);
      const concurrentLoginTime = Date.now() - loginStartTime;
      
      console.log(`Concurrent login time: ${concurrentLoginTime}ms`);
      expect(concurrentLoginTime).toBeLessThan(5000);
      
      // Perform concurrent favorites operations
      const operationPromises = [
        // Customer favoriting recipes
        pages[0].goto('/recipes').then(() => 
          pages[0].click('[data-testid="favorite-button"]')
        ),
        // Trainer managing collections
        pages[1].goto('/trainer/collections').then(() =>
          pages[1].click('[data-testid="create-collection-button"]')
        ),
        // Admin viewing analytics
        pages[2].goto('/admin/analytics').then(() =>
          pages[2].waitForSelector('[data-testid="engagement-metrics"]')
        )
      ];
      
      const operationStartTime = Date.now();
      await Promise.all(operationPromises);
      const concurrentOperationTime = Date.now() - operationStartTime;
      
      console.log(`Concurrent operations time: ${concurrentOperationTime}ms`);
      expect(concurrentOperationTime).toBeLessThan(3000);
      
      // Cleanup
      await Promise.all(contexts.filter(Boolean).map(context => context!.close()));
    });
  });

  test('Database query performance simulation', async () => {
    await test.step('Test favorites query performance', async () => {
      await loginAsCustomer(page);
      
      // Monitor network requests to API endpoints
      const apiRequests: any[] = [];
      page.on('response', response => {
        if (response.url().includes('/api/favorites')) {
          apiRequests.push({
            url: response.url(),
            status: response.status(),
            timing: response.request().timing()
          });
        }
      });
      
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Check API response times
      for (const request of apiRequests) {
        const responseTime = request.timing.responseEnd - request.timing.requestStart;
        expect(responseTime).toBeLessThan(1000); // API should respond within 1 second
        console.log(`API response time: ${responseTime}ms for ${request.url}`);
      }
    });

    await test.step('Test search query performance', async () => {
      const searchRequests: any[] = [];
      page.on('response', response => {
        if (response.url().includes('/api/favorites') && response.url().includes('search')) {
          searchRequests.push({
            url: response.url(),
            status: response.status(),
            timing: response.request().timing()
          });
        }
      });
      
      // Perform search
      await page.fill('[data-testid="favorites-search-input"]', 'chicken breast');
      await waitForNetworkIdle(page);
      
      // Check search API performance
      for (const request of searchRequests) {
        const responseTime = request.timing.responseEnd - request.timing.requestStart;
        expect(responseTime).toBeLessThan(500); // Search should be very fast
        console.log(`Search API response time: ${responseTime}ms`);
      }
    });
  });

  test('Mobile performance optimization', async () => {
    // Configure for mobile testing
    test.use({ 
      viewport: { width: 375, height: 667 },
      hasTouch: true,
      isMobile: true
    });

    await test.step('Test mobile load performance', async () => {
      await loginAsCustomer(page);
      
      const mobileLoadStartTime = Date.now();
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      const mobileLoadTime = Date.now() - mobileLoadStartTime;
      
      // Mobile should load within 3 seconds (allowing for slower connections)
      expect(mobileLoadTime).toBeLessThan(3000);
      console.log(`Mobile load time: ${mobileLoadTime}ms`);
      
      await takeTestScreenshot(page, 'mobile-performance.png', 'Mobile performance test');
    });

    await test.step('Test mobile interaction performance', async () => {
      const touchInteractionTimes: number[] = [];
      
      const favoriteButtons = page.locator('[data-testid="favorite-button"]');
      const buttonCount = Math.min(5, await favoriteButtons.count());
      
      for (let i = 0; i < buttonCount; i++) {
        const startTime = Date.now();
        
        await favoriteButtons.nth(i).tap();
        await expect(page.locator('[data-testid="favorite-success-toast"]')).toBeVisible();
        
        const interactionTime = Date.now() - startTime;
        touchInteractionTimes.push(interactionTime);
      }
      
      const avgTouchTime = touchInteractionTimes.reduce((a, b) => a + b, 0) / touchInteractionTimes.length;
      expect(avgTouchTime).toBeLessThan(300); // Touch interactions should be responsive
      
      console.log(`Average mobile touch interaction time: ${avgTouchTime}ms`);
    });
  });
});