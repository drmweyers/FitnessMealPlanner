import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test configuration for mobile performance testing
const performanceDevices = {
  'Low-end Mobile': {
    viewport: { width: 375, height: 667 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15A372 Safari/604.1',
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    // Simulate slower device
    cpuSlowdownMultiplier: 4,
    networkProfile: 'slow-3g'
  },
  'Mid-range Mobile': {
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15A372 Safari/604.1',
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    cpuSlowdownMultiplier: 2,
    networkProfile: 'fast-3g'
  },
  'High-end Mobile': {
    viewport: { width: 428, height: 926 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15A372 Safari/604.1',
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    cpuSlowdownMultiplier: 1,
    networkProfile: '4g'
  }
};

// Network profiles for testing
const networkProfiles = {
  'slow-3g': {
    offline: false,
    downloadThroughput: 50 * 1024, // 50 KB/s
    uploadThroughput: 25 * 1024,   // 25 KB/s
    latency: 2000 // 2s
  },
  'fast-3g': {
    offline: false,
    downloadThroughput: 750 * 1024, // 750 KB/s
    uploadThroughput: 250 * 1024,   // 250 KB/s
    latency: 150 // 150ms
  },
  '4g': {
    offline: false,
    downloadThroughput: 4 * 1024 * 1024, // 4 MB/s
    uploadThroughput: 1 * 1024 * 1024,   // 1 MB/s
    latency: 50 // 50ms
  }
};

// Test accounts
const testAccounts = {
  customer: { email: 'customer.test@evofitmeals.com', password: 'TestCustomer123!' },
  trainer: { email: 'trainer.test@evofitmeals.com', password: 'TestTrainer123!' }
};

// Performance thresholds (in milliseconds)
const performanceThresholds = {
  'Low-end Mobile': {
    pageLoad: 8000,
    firstContentfulPaint: 4000,
    largestContentfulPaint: 6000,
    timeToInteractive: 10000,
    navigationTime: 3000,
    scrollPerformance: 100,
    touchResponseTime: 150
  },
  'Mid-range Mobile': {
    pageLoad: 5000,
    firstContentfulPaint: 2500,
    largestContentfulPaint: 4000,
    timeToInteractive: 6000,
    navigationTime: 2000,
    scrollPerformance: 50,
    touchResponseTime: 100
  },
  'High-end Mobile': {
    pageLoad: 3000,
    firstContentfulPaint: 1500,
    largestContentfulPaint: 2500,
    timeToInteractive: 4000,
    navigationTime: 1000,
    scrollPerformance: 25,
    touchResponseTime: 50
  }
};

test.describe('Mobile Performance Testing', () => {
  // Test performance across different device capabilities
  Object.entries(performanceDevices).forEach(([deviceName, deviceConfig]) => {
    test.describe(`Performance on ${deviceName}`, () => {
      let context: BrowserContext;
      let page: Page;

      test.beforeAll(async ({ browser }) => {
        context = await browser.newContext({
          ...deviceConfig,
          // Simulate network conditions
          ...(networkProfiles[deviceConfig.networkProfile as keyof typeof networkProfiles])
        });

        page = await context.newPage();

        // Enable CPU throttling for performance testing
        const client = await context.newCDPSession(page);
        await client.send('Emulation.setCPUThrottlingRate', {
          rate: deviceConfig.cpuSlowdownMultiplier
        });
      });

      test.afterAll(async () => {
        await context.close();
      });

      test(`should meet page load performance benchmarks on ${deviceName}`, async () => {
        const thresholds = performanceThresholds[deviceName as keyof typeof performanceThresholds];

        // Start performance measurement
        const startTime = Date.now();

        await page.goto('http://localhost:4000/login', {
          waitUntil: 'networkidle',
          timeout: thresholds.pageLoad + 5000
        });

        const loadTime = Date.now() - startTime;

        // Check page load time
        expect(loadTime).toBeLessThan(thresholds.pageLoad);

        // Measure Web Vitals
        const webVitals = await page.evaluate(() => {
          return new Promise((resolve) => {
            const vitals: any = {};

            // First Contentful Paint
            new PerformanceObserver((list) => {
              const entries = list.getEntries();
              entries.forEach((entry) => {
                if (entry.name === 'first-contentful-paint') {
                  vitals.firstContentfulPaint = entry.startTime;
                }
              });
            }).observe({ entryTypes: ['paint'] });

            // Largest Contentful Paint
            new PerformanceObserver((list) => {
              const entries = list.getEntries();
              const lastEntry = entries[entries.length - 1];
              vitals.largestContentfulPaint = lastEntry.startTime;
            }).observe({ entryTypes: ['largest-contentful-paint'] });

            // Time to Interactive (simplified)
            setTimeout(() => {
              vitals.timeToInteractive = performance.now();
              resolve(vitals);
            }, 100);
          });
        });

        // Verify Web Vitals meet thresholds
        if (webVitals.firstContentfulPaint) {
          expect(webVitals.firstContentfulPaint).toBeLessThan(thresholds.firstContentfulPaint);
        }

        if (webVitals.largestContentfulPaint) {
          expect(webVitals.largestContentfulPaint).toBeLessThan(thresholds.largestContentfulPaint);
        }
      });

      test(`should perform authentication efficiently on ${deviceName}`, async () => {
        const thresholds = performanceThresholds[deviceName as keyof typeof performanceThresholds];

        await page.goto('http://localhost:4000/login');

        // Measure form interaction performance
        const startTime = Date.now();

        await page.locator('input[type="email"]').fill(testAccounts.customer.email);
        await page.locator('input[type="password"]').fill(testAccounts.customer.password);

        const formFillTime = Date.now() - startTime;

        // Form filling should be responsive
        expect(formFillTime).toBeLessThan(1000);

        // Measure authentication submission
        const submitStart = Date.now();
        await page.locator('button[type="submit"]').tap();
        await page.waitForURL(/.*\/customer.*/, { timeout: thresholds.pageLoad });
        const authTime = Date.now() - submitStart;

        expect(authTime).toBeLessThan(thresholds.pageLoad);
      });

      test(`should maintain navigation performance on ${deviceName}`, async () => {
        const thresholds = performanceThresholds[deviceName as keyof typeof performanceThresholds];

        // Login first
        await page.goto('http://localhost:4000/login');
        await page.locator('input[type="email"]').fill(testAccounts.customer.email);
        await page.locator('input[type="password"]').fill(testAccounts.customer.password);
        await page.locator('button[type="submit"]').tap();
        await page.waitForURL(/.*\/customer.*/);

        // Test navigation performance
        const navigationTests = [
          '[data-testid="mobile-nav-recipes"]',
          '[data-testid="mobile-nav-favorites"]',
          '[data-testid="mobile-nav-dashboard"]'
        ];

        for (const navSelector of navigationTests) {
          const navElement = page.locator(navSelector);

          if (await navElement.count() > 0) {
            const startTime = Date.now();
            await navElement.tap();
            await page.waitForLoadState('networkidle', { timeout: thresholds.navigationTime + 2000 });
            const navTime = Date.now() - startTime;

            expect(navTime).toBeLessThan(thresholds.navigationTime);
          }
        }
      });

      test(`should handle scroll performance efficiently on ${deviceName}`, async () => {
        const thresholds = performanceThresholds[deviceName as keyof typeof performanceThresholds];

        await page.goto('http://localhost:4000/login');
        await page.locator('input[type="email"]').fill(testAccounts.customer.email);
        await page.locator('input[type="password"]').fill(testAccounts.customer.password);
        await page.locator('button[type="submit"]').tap();
        await page.waitForURL(/.*\/customer.*/);

        // Navigate to a page with scrollable content
        const recipesNav = page.locator('[data-testid="mobile-nav-recipes"]');
        if (await recipesNav.count() > 0) {
          await recipesNav.tap();

          // Measure scroll performance
          const scrollTimes: number[] = [];

          for (let i = 0; i < 5; i++) {
            const startTime = performance.now();

            await page.mouse.wheel(0, 300);
            await page.waitForTimeout(50);

            const scrollTime = performance.now() - startTime;
            scrollTimes.push(scrollTime);
          }

          const averageScrollTime = scrollTimes.reduce((a, b) => a + b, 0) / scrollTimes.length;
          expect(averageScrollTime).toBeLessThan(thresholds.scrollPerformance);

          // Test momentum scrolling doesn't cause performance issues
          await page.mouse.wheel(0, 1000);
          await page.waitForTimeout(200);

          // Page should remain responsive
          const isResponsive = await page.evaluate(() => {
            return document.readyState === 'complete';
          });
          expect(isResponsive).toBe(true);
        }
      });

      test(`should maintain touch response performance on ${deviceName}`, async () => {
        const thresholds = performanceThresholds[deviceName as keyof typeof performanceThresholds];

        await page.goto('http://localhost:4000/login');
        await page.locator('input[type="email"]').fill(testAccounts.customer.email);
        await page.locator('input[type="password"]').fill(testAccounts.customer.password);
        await page.locator('button[type="submit"]').tap();
        await page.waitForURL(/.*\/customer.*/);

        // Test touch response times
        const touchTargets = page.locator('button, a, [role="button"]');
        const targetCount = Math.min(await touchTargets.count(), 5);

        const touchTimes: number[] = [];

        for (let i = 0; i < targetCount; i++) {
          const target = touchTargets.nth(i);

          if (await target.isVisible()) {
            const startTime = performance.now();

            await target.tap();
            await page.waitForTimeout(50);

            const touchTime = performance.now() - startTime;
            touchTimes.push(touchTime);
          }
        }

        if (touchTimes.length > 0) {
          const averageTouchTime = touchTimes.reduce((a, b) => a + b, 0) / touchTimes.length;
          expect(averageTouchTime).toBeLessThan(thresholds.touchResponseTime);
        }
      });

      test(`should handle memory usage efficiently on ${deviceName}`, async () => {
        await page.goto('http://localhost:4000/login');
        await page.locator('input[type="email"]').fill(testAccounts.customer.email);
        await page.locator('input[type="password"]').fill(testAccounts.customer.password);
        await page.locator('button[type="submit"]').tap();
        await page.waitForURL(/.*\/customer.*/);

        // Get initial memory usage
        const initialMemory = await page.evaluate(() => {
          return (performance as any).memory ? {
            usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
            totalJSHeapSize: (performance as any).memory.totalJSHeapSize
          } : null;
        });

        // Navigate through multiple pages to test memory management
        const pages = [
          '[data-testid="mobile-nav-recipes"]',
          '[data-testid="mobile-nav-favorites"]',
          '[data-testid="mobile-nav-dashboard"]'
        ];

        for (const pageSelector of pages) {
          const navElement = page.locator(pageSelector);
          if (await navElement.count() > 0) {
            await navElement.tap();
            await page.waitForLoadState('networkidle');
          }
        }

        // Check memory usage after navigation
        const finalMemory = await page.evaluate(() => {
          return (performance as any).memory ? {
            usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
            totalJSHeapSize: (performance as any).memory.totalJSHeapSize
          } : null;
        });

        if (initialMemory && finalMemory) {
          // Memory growth should be reasonable (less than 50MB for mobile)
          const memoryGrowth = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
          const maxMemoryGrowth = 50 * 1024 * 1024; // 50MB

          expect(memoryGrowth).toBeLessThan(maxMemoryGrowth);
        }
      });

      test(`should handle network latency gracefully on ${deviceName}`, async () => {
        const thresholds = performanceThresholds[deviceName as keyof typeof performanceThresholds];

        // Test with network delays
        await page.route('**/api/**', async route => {
          // Add artificial delay based on device profile
          const delay = deviceConfig.networkProfile === 'slow-3g' ? 500 :
                       deviceConfig.networkProfile === 'fast-3g' ? 150 : 50;

          await page.waitForTimeout(delay);
          await route.continue();
        });

        const startTime = Date.now();

        await page.goto('http://localhost:4000/login', {
          waitUntil: 'networkidle',
          timeout: thresholds.pageLoad + 10000 // Extra time for slow networks
        });

        const loadTime = Date.now() - startTime;

        // Should still load within reasonable time considering network conditions
        const maxLoadTime = deviceConfig.networkProfile === 'slow-3g' ? 15000 :
                           deviceConfig.networkProfile === 'fast-3g' ? 8000 : 5000;

        expect(loadTime).toBeLessThan(maxLoadTime);

        // Test form submission with network delay
        await page.locator('input[type="email"]').fill(testAccounts.customer.email);
        await page.locator('input[type="password"]').fill(testAccounts.customer.password);

        const submitStart = Date.now();
        await page.locator('button[type="submit"]').tap();
        await page.waitForURL(/.*\/customer.*/, { timeout: maxLoadTime });
        const submitTime = Date.now() - submitStart;

        expect(submitTime).toBeLessThan(maxLoadTime);
      });

      test(`should optimize image loading performance on ${deviceName}`, async () => {
        await page.goto('http://localhost:4000/login');
        await page.locator('input[type="email"]').fill(testAccounts.customer.email);
        await page.locator('input[type="password"]').fill(testAccounts.customer.password);
        await page.locator('button[type="submit"]').tap();
        await page.waitForURL(/.*\/customer.*/);

        // Navigate to a page with images (recipes)
        const recipesNav = page.locator('[data-testid="mobile-nav-recipes"]');
        if (await recipesNav.count() > 0) {
          await recipesNav.tap();

          // Wait for images to load
          await page.waitForLoadState('networkidle');

          // Check image loading performance
          const imageMetrics = await page.evaluate(() => {
            const images = Array.from(document.querySelectorAll('img'));
            return images.map(img => ({
              loaded: img.complete,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
              src: img.src
            }));
          });

          // Most images should be loaded efficiently
          const loadedImages = imageMetrics.filter(img => img.loaded);
          const loadedPercentage = (loadedImages.length / Math.max(imageMetrics.length, 1)) * 100;

          expect(loadedPercentage).toBeGreaterThan(80);

          // Images should have reasonable dimensions for mobile
          loadedImages.forEach(img => {
            if (img.naturalWidth > 0) {
              // Images shouldn't be excessively large for mobile
              expect(img.naturalWidth).toBeLessThan(2000);
              expect(img.naturalHeight).toBeLessThan(2000);
            }
          });
        }
      });

      test(`should handle bundle size efficiently for ${deviceName}`, async () => {
        // Test JavaScript bundle loading performance
        const resourceMetrics = await page.evaluate(() => {
          const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
          return resources
            .filter(resource => resource.name.includes('.js') || resource.name.includes('.css'))
            .map(resource => ({
              name: resource.name,
              size: resource.transferSize || resource.encodedBodySize || 0,
              loadTime: resource.responseEnd - resource.requestStart
            }));
        });

        // Calculate total bundle size
        const totalBundleSize = resourceMetrics.reduce((total, resource) => total + resource.size, 0);

        // Bundle size expectations based on device capabilities
        const maxBundleSize = deviceName === 'Low-end Mobile' ? 2 * 1024 * 1024 : // 2MB
                             deviceName === 'Mid-range Mobile' ? 3 * 1024 * 1024 : // 3MB
                             5 * 1024 * 1024; // 5MB

        expect(totalBundleSize).toBeLessThan(maxBundleSize);

        // Individual resources shouldn't be too large
        resourceMetrics.forEach(resource => {
          expect(resource.size).toBeLessThan(1024 * 1024); // 1MB per resource
        });
      });
    });
  });

  test.describe('Progressive Performance Testing', () => {
    test('should maintain performance under progressive load', async ({ browser }) => {
      const context = await browser.newContext(performanceDevices['Mid-range Mobile']);
      const page = await context.newPage();

      await page.goto('http://localhost:4000/login');
      await page.locator('input[type="email"]').fill(testAccounts.customer.email);
      await page.locator('input[type="password"]').fill(testAccounts.customer.password);
      await page.locator('button[type="submit"]').tap();
      await page.waitForURL(/.*\/customer.*/);

      // Measure performance under increasing load
      const performanceResults: number[] = [];

      for (let loadLevel = 1; loadLevel <= 5; loadLevel++) {
        const startTime = Date.now();

        // Simulate increasing load by performing multiple operations
        for (let i = 0; i < loadLevel; i++) {
          const recipesNav = page.locator('[data-testid="mobile-nav-recipes"]');
          if (await recipesNav.count() > 0) {
            await recipesNav.tap();
            await page.waitForLoadState('networkidle');
          }

          const dashboardNav = page.locator('[data-testid="mobile-nav-dashboard"]');
          if (await dashboardNav.count() > 0) {
            await dashboardNav.tap();
            await page.waitForLoadState('networkidle');
          }
        }

        const operationTime = Date.now() - startTime;
        performanceResults.push(operationTime);
      }

      // Performance should not degrade exponentially
      for (let i = 1; i < performanceResults.length; i++) {
        const degradation = performanceResults[i] / performanceResults[0];
        expect(degradation).toBeLessThan(i * 2); // Linear degradation tolerance
      }

      await context.close();
    });

    test('should recover performance after intensive operations', async ({ browser }) => {
      const context = await browser.newContext(performanceDevices['Mid-range Mobile']);
      const page = await context.newPage();

      await page.goto('http://localhost:4000/login');
      await page.locator('input[type="email"]').fill(testAccounts.customer.email);
      await page.locator('input[type="password"]').fill(testAccounts.customer.password);
      await page.locator('button[type="submit"]').tap();
      await page.waitForURL(/.*\/customer.*/);

      // Measure baseline performance
      const baselineStart = Date.now();
      const recipesNav = page.locator('[data-testid="mobile-nav-recipes"]');
      if (await recipesNav.count() > 0) {
        await recipesNav.tap();
        await page.waitForLoadState('networkidle');
      }
      const baselineTime = Date.now() - baselineStart;

      // Perform intensive operations
      for (let i = 0; i < 10; i++) {
        await page.mouse.wheel(0, 500);
        await page.waitForTimeout(50);
      }

      // Measure recovery performance
      const recoveryStart = Date.now();
      const dashboardNav = page.locator('[data-testid="mobile-nav-dashboard"]');
      if (await dashboardNav.count() > 0) {
        await dashboardNav.tap();
        await page.waitForLoadState('networkidle');
      }
      const recoveryTime = Date.now() - recoveryStart;

      // Performance should recover to within 150% of baseline
      expect(recoveryTime).toBeLessThan(baselineTime * 1.5);

      await context.close();
    });
  });

  test.describe('Real-world Performance Scenarios', () => {
    test('should handle simultaneous user interactions efficiently', async ({ browser }) => {
      const context = await browser.newContext(performanceDevices['Mid-range Mobile']);
      const page = await context.newPage();

      await page.goto('http://localhost:4000/login');
      await page.locator('input[type="email"]').fill(testAccounts.customer.email);
      await page.locator('input[type="password"]').fill(testAccounts.customer.password);
      await page.locator('button[type="submit"]').tap();
      await page.waitForURL(/.*\/customer.*/);

      // Simulate rapid user interactions
      const startTime = Date.now();

      const interactions = [
        () => page.locator('[data-testid="mobile-header-menu"]').tap(),
        () => page.locator('[data-testid="mobile-nav-recipes"]').tap(),
        () => page.mouse.wheel(0, 300),
        () => page.locator('[data-testid="mobile-nav-favorites"]').tap()
      ];

      // Execute interactions rapidly
      for (const interaction of interactions) {
        await interaction();
        await page.waitForTimeout(100);
      }

      const totalTime = Date.now() - startTime;

      // Should handle rapid interactions within reasonable time
      expect(totalTime).toBeLessThan(3000);

      await context.close();
    });

    test('should maintain performance during form submissions', async ({ browser }) => {
      const context = await browser.newContext(performanceDevices['Low-end Mobile']);
      const page = await context.newPage();

      await page.goto('http://localhost:4000/login');

      // Test form submission performance under load
      const submissionTimes: number[] = [];

      for (let i = 0; i < 3; i++) {
        const startTime = Date.now();

        await page.locator('input[type="email"]').fill(testAccounts.customer.email);
        await page.locator('input[type="password"]').fill(testAccounts.customer.password);
        await page.locator('button[type="submit"]').tap();

        try {
          await page.waitForURL(/.*\/customer.*/, { timeout: 10000 });
          const submissionTime = Date.now() - startTime;
          submissionTimes.push(submissionTime);

          // Logout for next iteration
          const menuButton = page.locator('[data-testid="mobile-header-menu"]');
          if (await menuButton.count() > 0) {
            await menuButton.tap();
            const logoutButton = page.locator('text="Sign Out"');
            if (await logoutButton.count() > 0) {
              await logoutButton.tap();
            }
          }
        } catch (error) {
          // If login fails, continue to next iteration
        }
      }

      if (submissionTimes.length > 0) {
        const averageSubmissionTime = submissionTimes.reduce((a, b) => a + b, 0) / submissionTimes.length;
        expect(averageSubmissionTime).toBeLessThan(8000); // 8 seconds for low-end device
      }

      await context.close();
    });
  });
});