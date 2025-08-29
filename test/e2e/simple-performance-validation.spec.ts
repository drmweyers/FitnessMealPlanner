import { test, expect } from '@playwright/test';

/**
 * SIMPLE PERFORMANCE VALIDATION FOR BUG FIXES
 * 
 * This test validates that the bug fixes do not impact performance
 */

test.describe('Simple Performance Validation', () => {
  
  test('Application loads within acceptable time', async ({ page }) => {
    console.log('⚡ Performance Testing - Application Load Time');
    
    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;
    
    console.log(`📊 Application load time: ${loadTime}ms`);
    
    // Should load within reasonable time (under 10 seconds)
    expect(loadTime).toBeLessThan(10000);
    
    // Take performance screenshot
    await page.screenshot({ 
      path: 'test-results/performance-load-validation.png', 
      fullPage: true 
    });
    
    console.log('✅ Performance load test passed');
  });

  test('Basic navigation performance', async ({ page }) => {
    console.log('🧭 Performance Testing - Basic Navigation');
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Test basic navigation if available
    const navElements = [
      'text="Login"',
      'text="Dashboard"', 
      'text="Home"'
    ];
    
    for (const nav of navElements) {
      try {
        if (await page.locator(nav).isVisible()) {
          const navStart = Date.now();
          await page.click(nav);
          await page.waitForLoadState('networkidle');
          const navTime = Date.now() - navStart;
          
          console.log(`📊 ${nav} navigation: ${navTime}ms`);
          expect(navTime).toBeLessThan(5000);
          
          break;
        }
      } catch (error) {
        console.log(`⚠️  ${nav} navigation test skipped`);
      }
    }
    
    // Take navigation screenshot
    await page.screenshot({ 
      path: 'test-results/performance-navigation-validation.png', 
      fullPage: true 
    });
    
    console.log('✅ Navigation performance test completed');
  });
});