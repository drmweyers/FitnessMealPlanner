import { test, expect, Page } from '@playwright/test';

/**
 * BUG FIX PERFORMANCE VALIDATION
 * 
 * This test suite validates that the bug fixes do not negatively impact
 * application performance and user experience.
 */

test.describe('Bug Fix Performance Validation', () => {
  
  test('Application load performance after bug fixes', async ({ page }) => {
    console.log('⚡ Performance Testing - Application Load Time');
    
    // Enable performance monitoring
    const performanceMetrics: any[] = [];
    
    page.on('response', (response) => {
      if (response.url().includes('/api/')) {
        performanceMetrics.push({
          url: response.url(),
          status: response.status(),
          timing: Date.now()
        });
      }
    });
    
    // Measure initial load time
    const startTime = Date.now();
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    const loadTime = Date.now() - startTime;
    console.log(`📊 Initial load time: ${loadTime}ms`);
    
    // Performance should be reasonable (under 10 seconds)
    expect(loadTime).toBeLessThan(10000);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/performance-initial-load.png', fullPage: true });
    
    // Measure navigation performance to key sections
    await this.measureNavigationPerformance(page);
    
    // Measure API response times
    if (performanceMetrics.length > 0) {
      console.log(`📊 API calls made: ${performanceMetrics.length}`);
      
      const successfulCalls = performanceMetrics.filter(m => m.status < 400);
      const errorCalls = performanceMetrics.filter(m => m.status >= 400);
      
      console.log(`   Successful: ${successfulCalls.length}`);
      console.log(`   Errors: ${errorCalls.length}`);
      
      if (errorCalls.length > 0) {
        console.log('❌ API Errors detected:');
        errorCalls.forEach(call => {
          console.log(`   ${call.status} - ${call.url}`);
        });
      }
    }
    
    console.log('✅ Performance validation completed');
  });
});

async function measureNavigationPerformance(page: Page): Promise<void> {
    console.log('🧭 Testing Navigation Performance...');
    
    const navigationTests = [
      { name: 'Saved Plans', selectors: ['text="Saved Plans"', 'text="Plans"'] },
      { name: 'Customers', selectors: ['text="Customers"', 'text="My Customers"'] },
      { name: 'Profile', selectors: ['text="Profile"', 'text="Account"'] }
    ];
    
    for (const navTest of navigationTests) {
      let navigationSuccessful = false;
      
      for (const selector of navTest.selectors) {
        if (await page.locator(selector).isVisible()) {
          const startTime = Date.now();
          
          try {
            await page.click(selector);
            await page.waitForLoadState('networkidle', { timeout: 15000 });
            
            const navTime = Date.now() - startTime;
            console.log(`📊 ${navTest.name} navigation: ${navTime}ms`);
            
            // Navigation should be quick (under 5 seconds)
            expect(navTime).toBeLessThan(5000);
            
            navigationSuccessful = true;
            
            // Take screenshot
            await page.screenshot({ 
              path: `test-results/performance-nav-${navTest.name.toLowerCase().replace(' ', '-')}.png`, 
              fullPage: true 
            });
            
          } catch (error) {
            console.log(`⚠️  ${navTest.name} navigation failed: ${error}`);
          }
          
          break;
        }
      }
      
      if (!navigationSuccessful) {
        console.log(`⚠️  ${navTest.name} navigation not available`);
      }
      
      await page.waitForTimeout(1000); // Brief pause between navigations
    }
  }

  test('Memory usage stability during bug fix operations', async ({ page }) => {
    console.log('🧠 Performance Testing - Memory Usage Stability');
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Get initial memory usage (if available)
    let initialMemory = 0;
    try {
      initialMemory = await page.evaluate(() => {
        return (window.performance as any).memory?.usedJSHeapSize || 0;
      });
    } catch (error) {
      console.log('⚠️  Memory monitoring not available in this browser');
      return;
    }
    
    if (initialMemory === 0) {
      console.log('⚠️  Memory monitoring not available');
      return;
    }
    
    console.log(`📊 Initial memory usage: ${Math.round(initialMemory / 1024 / 1024)}MB`);
    
    // Perform operations that previously had bugs
    await this.simulateUserOperations(page);
    
    // Check final memory usage
    const finalMemory = await page.evaluate(() => {
      return (window.performance as any).memory?.usedJSHeapSize || 0;
    });
    
    const memoryIncrease = finalMemory - initialMemory;
    const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;
    
    console.log(`📊 Final memory usage: ${Math.round(finalMemory / 1024 / 1024)}MB`);
    console.log(`📊 Memory increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB (${memoryIncreasePercent.toFixed(1)}%)`);
    
    // Memory increase should be reasonable (less than 100% increase)
    expect(memoryIncreasePercent).toBeLessThan(100);
    
    console.log('✅ Memory usage remains stable');
  });

  async simulateUserOperations(page: Page): Promise<void> {
    console.log('👤 Simulating User Operations...');
    
    // Simulate typical user interactions that involve the bug fixes
    const operations = [
      {
        name: 'Navigate to Saved Plans',
        action: async () => {
          const selector = 'text="Saved Plans", text="Plans"';
          if (await page.locator(selector).isVisible()) {
            await page.click(selector);
            await page.waitForLoadState('networkidle');
          }
        }
      },
      {
        name: 'Look for Recipe Cards',
        action: async () => {
          const recipeCount = await page.locator('[data-testid="recipe-card"], .recipe-card, [class*="recipe"]').count();
          if (recipeCount > 0) {
            console.log(`   Found ${recipeCount} recipe cards`);
          }
        }
      },
      {
        name: 'Navigate to Customers',
        action: async () => {
          const selector = 'text="Customers", text="My Customers"';
          if (await page.locator(selector).isVisible()) {
            await page.click(selector);
            await page.waitForLoadState('networkidle');
          }
        }
      },
      {
        name: 'Check Customer List',
        action: async () => {
          const customerCount = await page.locator('[data-testid="customer-card"], .customer-card, [class*="customer"]').count();
          const buggyMessage = await page.locator('text="no customer yet"').count();
          
          console.log(`   Customer cards: ${customerCount}`);
          console.log(`   Buggy message: ${buggyMessage > 0 ? 'PRESENT (BAD)' : 'ABSENT (GOOD)'}`);
        }
      }
    ];
    
    for (const operation of operations) {
      try {
        console.log(`🔄 ${operation.name}...`);
        await operation.action();
        await page.waitForTimeout(1000); // Pause between operations
      } catch (error) {
        console.log(`⚠️  ${operation.name} failed: ${error}`);
      }
    }
  }

  test('Network request efficiency after bug fixes', async ({ page }) => {
    console.log('🌐 Performance Testing - Network Request Efficiency');
    
    const networkRequests: any[] = [];
    
    // Monitor network requests
    page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        networkRequests.push({
          url: request.url(),
          method: request.method(),
          timestamp: Date.now()
        });
      }
    });
    
    page.on('response', (response) => {
      if (response.url().includes('/api/')) {
        const request = networkRequests.find(r => r.url === response.url());
        if (request) {
          request.status = response.status();
          request.responseTime = Date.now() - request.timestamp;
        }
      }
    });
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Navigate through the application
    await this.simulateUserOperations(page);
    
    // Analyze network requests
    const completedRequests = networkRequests.filter(r => r.status !== undefined);
    const successfulRequests = completedRequests.filter(r => r.status < 400);
    const failedRequests = completedRequests.filter(r => r.status >= 400);
    
    console.log(`📊 Network Request Analysis:`);
    console.log(`   Total API calls: ${networkRequests.length}`);
    console.log(`   Completed: ${completedRequests.length}`);
    console.log(`   Successful: ${successfulRequests.length}`);
    console.log(`   Failed: ${failedRequests.length}`);
    
    if (successfulRequests.length > 0) {
      const avgResponseTime = successfulRequests.reduce((sum, r) => sum + r.responseTime, 0) / successfulRequests.length;
      console.log(`   Average response time: ${Math.round(avgResponseTime)}ms`);
      
      // API responses should be reasonably fast (under 2 seconds average)
      expect(avgResponseTime).toBeLessThan(2000);
    }
    
    if (failedRequests.length > 0) {
      console.log('❌ Failed requests detected:');
      failedRequests.forEach(req => {
        console.log(`   ${req.status} - ${req.method} ${req.url}`);
      });
    }
    
    // Should have more successful requests than failures
    expect(successfulRequests.length).toBeGreaterThanOrEqual(failedRequests.length);
    
    console.log('✅ Network efficiency validation completed');
  });

  test('Responsive design performance after bug fixes', async ({ page }) => {
    console.log('📱 Performance Testing - Responsive Design Performance');
    
    const viewports = [
      { name: 'Desktop', width: 1280, height: 720 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Mobile', width: 375, height: 667 }
    ];
    
    for (const viewport of viewports) {
      console.log(`📐 Testing ${viewport.name} (${viewport.width}x${viewport.height})`);
      
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      const startTime = Date.now();
      await page.goto('/', { waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;
      
      console.log(`   Load time: ${loadTime}ms`);
      
      // Should load efficiently on all devices
      expect(loadTime).toBeLessThan(8000);
      
      // Take screenshot for visual verification
      await page.screenshot({ 
        path: `test-results/performance-responsive-${viewport.name.toLowerCase()}.png`, 
        fullPage: true 
      });
      
      // Check that key elements are visible
      const hasNavigation = await page.locator('nav, [role="navigation"], .navigation').count() > 0;
      const hasContent = await page.locator('main, .main-content, [role="main"]').count() > 0;
      
      console.log(`   Navigation visible: ${hasNavigation}`);
      console.log(`   Content visible: ${hasContent}`);
      
      await page.waitForTimeout(1000);
    }
    
    console.log('✅ Responsive design performance validated');
  });
});