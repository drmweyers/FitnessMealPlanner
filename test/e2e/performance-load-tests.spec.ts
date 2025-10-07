import { test, expect, Page } from '@playwright/test';
import { 
  TEST_ACCOUNTS, 
  loginAsTrainer, 
  loginAsCustomer, 
  loginAsAdmin,
  takeTestScreenshot, 
  waitForNetworkIdle,
  monitorNetworkActivity
} from './auth-helper';

/**
 * Performance and Load Testing Suite
 * 
 * Tests application performance under various conditions:
 * - Page load times
 * - Network request efficiency
 * - Large data set handling
 * - Concurrent user simulation
 * - Resource usage monitoring
 */

interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstContentfulPaint: number;
  networkRequests: number;
  failedRequests: number;
  totalTransferSize: number;
}

test.describe('Performance Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeouts for performance tests
    page.setDefaultTimeout(60000);
  });

  test('Page Load Performance - Landing Page', async ({ page }) => {
    const startTime = performance.now();
    
    // Monitor network activity
    const networkMonitor = await monitorNetworkActivity(page);
    
    // Navigate to landing page
    await page.goto('/');
    await waitForNetworkIdle(page);
    
    const loadTime = performance.now() - startTime;
    
    // Get performance metrics
    const metrics = await getPerformanceMetrics(page);
    metrics.loadTime = loadTime;
    
    const requests = networkMonitor.getRequests();
    const failedRequests = networkMonitor.getFailedRequests();
    
    metrics.networkRequests = requests.length;
    metrics.failedRequests = failedRequests.length;
    
    await takeTestScreenshot(page, 'performance-landing-page.png', 'Landing page performance test');
    
    // Log performance metrics
    console.log('🚀 Landing Page Performance Metrics:');
    console.log(`   Load Time: ${metrics.loadTime.toFixed(2)}ms`);
    console.log(`   DOM Content Loaded: ${metrics.domContentLoaded.toFixed(2)}ms`);
    console.log(`   First Contentful Paint: ${metrics.firstContentfulPaint.toFixed(2)}ms`);
    console.log(`   Network Requests: ${metrics.networkRequests}`);
    console.log(`   Failed Requests: ${metrics.failedRequests}`);
    
    // Performance assertions
    expect(metrics.loadTime).toBeLessThan(5000); // 5 seconds max
    expect(metrics.failedRequests).toBeLessThan(3); // Max 2 failed requests
    expect(metrics.domContentLoaded).toBeLessThan(2000); // 2 seconds for DOM
  });

  test('Page Load Performance - Trainer Dashboard', async ({ page }) => {
    const networkMonitor = await monitorNetworkActivity(page);
    
    const startTime = performance.now();
    await loginAsTrainer(page);
    const loadTime = performance.now() - startTime;
    
    const metrics = await getPerformanceMetrics(page);
    metrics.loadTime = loadTime;
    
    const requests = networkMonitor.getRequests();
    const failedRequests = networkMonitor.getFailedRequests();
    
    await takeTestScreenshot(page, 'performance-trainer-dashboard.png', 'Trainer dashboard performance test');
    
    console.log('🏋️ Trainer Dashboard Performance Metrics:');
    console.log(`   Total Load Time (including login): ${metrics.loadTime.toFixed(2)}ms`);
    console.log(`   Network Requests: ${requests.length}`);
    console.log(`   Failed Requests: ${failedRequests.length}`);
    
    // Log failed requests for debugging
    if (failedRequests.length > 0) {
      console.log('❌ Failed Requests:');
      failedRequests.forEach(req => {
        console.log(`   ${req.method} ${req.url} - Status: ${req.status}`);
      });
    }
    
    expect(metrics.loadTime).toBeLessThan(10000); // 10 seconds including authentication
    expect(failedRequests.length).toBeLessThan(5);
  });

  test('Page Load Performance - Customer Dashboard', async ({ page }) => {
    const networkMonitor = await monitorNetworkActivity(page);
    
    const startTime = performance.now();
    await loginAsCustomer(page);
    const loadTime = performance.now() - startTime;
    
    const metrics = await getPerformanceMetrics(page);
    metrics.loadTime = loadTime;
    
    const requests = networkMonitor.getRequests();
    const failedRequests = networkMonitor.getFailedRequests();
    
    await takeTestScreenshot(page, 'performance-customer-dashboard.png', 'Customer dashboard performance test');
    
    console.log('👤 Customer Dashboard Performance Metrics:');
    console.log(`   Total Load Time (including login): ${metrics.loadTime.toFixed(2)}ms`);
    console.log(`   Network Requests: ${requests.length}`);
    console.log(`   Failed Requests: ${failedRequests.length}`);
    
    expect(metrics.loadTime).toBeLessThan(10000);
    expect(failedRequests.length).toBeLessThan(5);
  });

  test('Large Data Set Performance - Admin Recipe List', async ({ page }) => {
    const networkMonitor = await monitorNetworkActivity(page);
    
    await loginAsAdmin(page);
    
    // Navigate to admin recipes section (likely has large dataset)
    const recipesNav = page.locator('text="Recipes", button:has-text("Recipes")');
    if (await recipesNav.count() > 0) {
      const startTime = performance.now();
      
      await recipesNav.click();
      await waitForNetworkIdle(page);
      
      const loadTime = performance.now() - startTime;
      
      await takeTestScreenshot(page, 'performance-admin-recipes.png', 'Admin recipes large dataset');
      
      // Check how many recipe items loaded
      const recipeItems = await page.locator('.recipe-card, .recipe-item, table tbody tr').count();
      
      console.log('📊 Admin Recipes Performance:');
      console.log(`   Load Time: ${loadTime.toFixed(2)}ms`);
      console.log(`   Recipe Items Loaded: ${recipeItems}`);
      
      const requests = networkMonitor.getRequests();
      const apiRequests = requests.filter(req => req.url.includes('/api/'));
      
      console.log(`   API Requests: ${apiRequests.length}`);
      
      expect(loadTime).toBeLessThan(8000); // 8 seconds for large dataset
      expect(recipeItems).toBeGreaterThan(0); // Should load some recipes
    }
  });

  test('Network Request Efficiency', async ({ page }) => {
    const networkMonitor = await monitorNetworkActivity(page);
    
    // Perform typical user journey
    await loginAsTrainer(page);
    
    // Navigate through different sections
    const navigation = [
      'text="Customers"',
      'text="Meal Plans"',
      'text="Profile"'
    ];
    
    for (const nav of navigation) {
      const navElement = page.locator(nav);
      if (await navElement.count() > 0) {
        await navElement.click();
        await waitForNetworkIdle(page);
      }
    }
    
    const requests = networkMonitor.getRequests();
    const apiRequests = requests.filter(req => req.url.includes('/api/'));
    const staticRequests = requests.filter(req => 
      req.url.includes('.js') || req.url.includes('.css') || req.url.includes('.png') || req.url.includes('.jpg')
    );
    
    console.log('🌐 Network Efficiency Metrics:');
    console.log(`   Total Requests: ${requests.length}`);
    console.log(`   API Requests: ${apiRequests.length}`);
    console.log(`   Static Resource Requests: ${staticRequests.length}`);
    
    // Check for duplicate requests (inefficiency)
    const urlCounts = {};
    requests.forEach(req => {
      urlCounts[req.url] = (urlCounts[req.url] || 0) + 1;
    });
    
    const duplicateUrls = Object.entries(urlCounts).filter(([url, count]) => count > 1);
    if (duplicateUrls.length > 0) {
      console.log('⚠️ Duplicate Requests Found:');
      duplicateUrls.forEach(([url, count]) => {
        console.log(`   ${url}: ${count} times`);
      });
    }
    
    // Performance expectations
    expect(requests.length).toBeLessThan(50); // Reasonable request count
    expect(duplicateUrls.length).toBeLessThan(5); // Minimal duplicates
  });
});

test.describe('Load Testing Simulation', () => {
  test('Concurrent User Simulation - Multiple Logins', async ({ browser }) => {
    console.log('👥 Simulating concurrent users...');
    
    const contexts = [];
    const pages = [];
    const userTypes = ['trainer', 'customer', 'trainer', 'customer'];
    
    // Create multiple browser contexts (simulating different users)
    for (let i = 0; i < userTypes.length; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      contexts.push(context);
      pages.push(page);
    }
    
    // Perform concurrent logins
    const loginPromises = pages.map(async (page, index) => {
      const userType = userTypes[index];
      const startTime = performance.now();
      
      try {
        if (userType === 'trainer') {
          await loginAsTrainer(page);
        } else {
          await loginAsCustomer(page);
        }
        
        const loadTime = performance.now() - startTime;
        
        await takeTestScreenshot(page, `concurrent-user-${index + 1}-${userType}.png`, 
          `Concurrent user ${index + 1} (${userType})`);
        
        return {
          userIndex: index + 1,
          userType,
          loadTime,
          success: true
        };
      } catch (error) {
        return {
          userIndex: index + 1,
          userType,
          loadTime: performance.now() - startTime,
          success: false,
          error: error.message
        };
      }
    });
    
    const results = await Promise.all(loginPromises);
    
    console.log('👥 Concurrent Login Results:');
    results.forEach(result => {
      console.log(`   User ${result.userIndex} (${result.userType}): ${result.success ? '✅' : '❌'} ${result.loadTime.toFixed(2)}ms`);
      if (!result.success) {
        console.log(`     Error: ${result.error}`);
      }
    });
    
    // Cleanup
    for (const context of contexts) {
      await context.close();
    }
    
    // Assert that most logins succeeded
    const successfulLogins = results.filter(r => r.success).length;
    expect(successfulLogins).toBeGreaterThanOrEqual(Math.floor(userTypes.length * 0.75)); // At least 75% success
  });

  test('Resource Usage Under Load', async ({ page }) => {
    console.log('📊 Testing resource usage under load...');
    
    const networkMonitor = await monitorNetworkActivity(page);
    
    await loginAsTrainer(page);
    
    // Simulate rapid navigation (stress test)
    const navigationSequence = [
      'text="Customers"',
      'text="Meal Plans"',
      'text="Profile"',
      'text="Customers"',
      'text="Meal Plans"'
    ];
    
    const startTime = performance.now();
    
    for (let i = 0; i < navigationSequence.length; i++) {
      const navElement = page.locator(navigationSequence[i]);
      if (await navElement.count() > 0) {
        await navElement.click();
        await page.waitForTimeout(500); // Shorter wait to stress test
      }
    }
    
    const totalTime = performance.now() - startTime;
    
    // Get final metrics
    const requests = networkMonitor.getRequests();
    const failedRequests = networkMonitor.getFailedRequests();
    
    console.log('📊 Resource Usage Metrics:');
    console.log(`   Total Navigation Time: ${totalTime.toFixed(2)}ms`);
    console.log(`   Total Requests: ${requests.length}`);
    console.log(`   Failed Requests: ${failedRequests.length}`);
    console.log(`   Average Request Time: ${(totalTime / requests.length).toFixed(2)}ms`);
    
    await takeTestScreenshot(page, 'load-test-final-state.png', 'Load test final state');
    
    // Performance under load expectations
    expect(totalTime).toBeLessThan(15000); // 15 seconds for rapid navigation
    expect(failedRequests.length).toBeLessThan(10); // Reasonable failure rate
  });
});

test.describe('Memory and Resource Monitoring', () => {
  test('Memory Usage Monitoring', async ({ page }) => {
    console.log('🧠 Monitoring memory usage...');
    
    await loginAsTrainer(page);
    
    // Get initial memory usage
    const initialMemory = await getMemoryUsage(page);
    
    // Perform memory-intensive operations
    const operations = [
      'Navigate to customers',
      'Navigate to meal plans', 
      'Navigate to recipes',
      'Open modal dialogs',
      'Search functionality'
    ];
    
    for (let i = 0; i < operations.length; i++) {
      // Simulate various operations
      await simulateOperation(page, i);
      
      const currentMemory = await getMemoryUsage(page);
      
      console.log(`${operations[i]}: ${formatMemory(currentMemory)}`);
      
      // Check for memory leaks (significant growth)
      if (currentMemory > initialMemory * 3) {
        console.warn(`⚠️ Potential memory leak detected: ${formatMemory(currentMemory)}`);
      }
    }
    
    const finalMemory = await getMemoryUsage(page);
    
    console.log('🧠 Memory Usage Summary:');
    console.log(`   Initial: ${formatMemory(initialMemory)}`);
    console.log(`   Final: ${formatMemory(finalMemory)}`);
    console.log(`   Growth: ${((finalMemory / initialMemory - 1) * 100).toFixed(1)}%`);
    
    // Memory usage expectations
    expect(finalMemory).toBeLessThan(initialMemory * 5); // Max 5x growth
  });
});

// Helper Functions

async function getPerformanceMetrics(page: Page): Promise<PerformanceMetrics> {
  const performanceData = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    
    const fcp = paint.find(entry => entry.name === 'first-contentful-paint');
    
    return {
      domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : 0,
      firstContentfulPaint: fcp ? fcp.startTime : 0,
    };
  });
  
  return {
    loadTime: 0, // Will be set by caller
    domContentLoaded: performanceData.domContentLoaded,
    firstContentfulPaint: performanceData.firstContentfulPaint,
    networkRequests: 0, // Will be set by caller
    failedRequests: 0, // Will be set by caller
    totalTransferSize: 0
  };
}

async function getMemoryUsage(page: Page): Promise<number> {
  try {
    const memoryInfo = await page.evaluate(() => {
      // @ts-ignore - performance.memory is available in Chrome
      return performance.memory ? performance.memory.usedJSHeapSize : 0;
    });
    return memoryInfo;
  } catch (error) {
    return 0;
  }
}

function formatMemory(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

async function simulateOperation(page: Page, operationIndex: number) {
  const operations = [
    async () => {
      // Navigate to customers
      const customersNav = page.locator('text="Customers"');
      if (await customersNav.count() > 0) {
        await customersNav.click();
        await waitForNetworkIdle(page);
      }
    },
    async () => {
      // Navigate to meal plans
      const mealPlansNav = page.locator('text="Meal Plans"');
      if (await mealPlansNav.count() > 0) {
        await mealPlansNav.click();
        await waitForNetworkIdle(page);
      }
    },
    async () => {
      // Navigate to profile
      const profileNav = page.locator('text="Profile"');
      if (await profileNav.count() > 0) {
        await profileNav.click();
        await waitForNetworkIdle(page);
      }
    },
    async () => {
      // Try to open modal
      const createButtons = page.locator('button:has-text("Create"), button:has-text("Add"), button:has-text("New")');
      if (await createButtons.count() > 0) {
        await createButtons.first().click();
        await page.waitForTimeout(1000);
        
        // Close modal if opened
        const closeButtons = page.locator('button:has-text("Cancel"), button:has-text("Close"), [aria-label="close"]');
        if (await closeButtons.count() > 0) {
          await closeButtons.first().click();
        }
      }
    },
    async () => {
      // Try search functionality
      const searchInputs = page.locator('input[placeholder*="search" i], input[name="search"]');
      if (await searchInputs.count() > 0) {
        await searchInputs.first().fill('test search');
        await page.waitForTimeout(1000);
        await searchInputs.first().clear();
      }
    }
  ];
  
  if (operations[operationIndex]) {
    await operations[operationIndex]();
  }
}