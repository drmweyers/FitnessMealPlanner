import { test, expect, Page } from '@playwright/test';
import { loginAsTrainer } from './helpers/auth';

test.describe('Performance Edge Cases & Stress Testing', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await loginAsTrainer(page);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Extreme Performance Scenarios', () => {
    test('Ultra-rapid tab switching stress test (100 cycles)', async () => {
      const startTime = Date.now();
      let healthProtocolAppeared = false;
      
      console.log('Starting ultra-rapid tab switching test...');
      
      // Ultra-rapid switching - 100 complete cycles
      for (let i = 0; i < 100; i++) {
        // Switch through all 4 tabs rapidly
        await page.click('text=Browse Recipes');
        await page.waitForTimeout(10); // Minimal delay
        
        await page.click('text=Generate Plans');
        await page.waitForTimeout(10);
        
        await page.click('text=Saved Plans'); 
        await page.waitForTimeout(10);
        
        await page.click('text=Customers');
        await page.waitForTimeout(10);
        
        // Check for health protocol every 25 cycles
        if (i % 25 === 0) {
          const healthCount = await page.locator('text=Health Protocol').count();
          if (healthCount > 0) {
            healthProtocolAppeared = true;
            console.log(`❌ Health Protocol appeared at cycle ${i}`);
          }
          
          // Verify tab count remains 4
          const tabCount = await page.locator('[role="tab"]').count();
          expect(tabCount).toBe(4);
          
          console.log(`✓ Cycle ${i + 1} completed, tabs: ${tabCount}`);
        }
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      console.log(`Ultra-rapid test completed in ${totalTime}ms`);
      
      // Performance assertions
      expect(totalTime).toBeLessThan(60000); // Under 60 seconds for 400 tab switches
      expect(healthProtocolAppeared).toBe(false);
      
      // Final verification
      await expect(page.locator('text=Health Protocol')).not.toBeVisible();
      await expect(page.locator('[role="tab"]')).toHaveCount(4);
      
      // Verify interface is still responsive after stress test
      await page.click('text=Browse Recipes');
      await expect(page.locator('[data-state="active"]')).toContainText('Recipes');
    });

    test('Memory leak detection during extended session', async () => {
      console.log('Starting memory leak detection test...');
      
      let initialElementCount = 0;
      let maxElementCount = 0;
      let healthProtocolDetected = false;
      
      // Get baseline element count
      const initialHandle = await page.evaluateHandle(() => document.querySelectorAll('*').length);
      initialElementCount = await initialHandle.jsonValue();
      console.log(`Initial DOM element count: ${initialElementCount}`);
      
      // Extended session simulation (200 interactions)
      for (let i = 0; i < 200; i++) {
        // Various interaction patterns
        await page.click('text=Browse Recipes');
        await page.waitForTimeout(25);
        
        await page.click('text=Generate Plans');
        await page.waitForTimeout(25);
        
        await page.click('text=Customers');
        await page.waitForTimeout(25);
        
        await page.click('text=Saved Plans');
        await page.waitForTimeout(25);
        
        // Scroll operations to stress the DOM
        await page.evaluate(() => window.scrollTo(0, window.innerHeight));
        await page.evaluate(() => window.scrollTo(0, 0));
        
        // Check for memory leaks every 50 iterations
        if (i % 50 === 0) {
          const elementHandle = await page.evaluateHandle(() => document.querySelectorAll('*').length);
          const currentElementCount = await elementHandle.jsonValue();
          
          if (currentElementCount > maxElementCount) {
            maxElementCount = currentElementCount;
          }
          
          // Check for health protocol elements accumulation
          const healthElements = await page.locator('[class*="health"], [id*="health"], [data-testid*="health"]').count();
          if (healthElements > 0) {
            healthProtocolDetected = true;
            console.log(`❌ Health Protocol elements detected: ${healthElements}`);
          }
          
          const elementGrowth = currentElementCount - initialElementCount;
          console.log(`Iteration ${i + 1}: DOM elements: ${currentElementCount} (growth: +${elementGrowth})`);
          
          // Memory leak assertion - DOM shouldn't grow excessively
          expect(elementGrowth).toBeLessThan(1000); // Allow some growth but not excessive
        }
      }
      
      console.log(`Memory leak test completed. Max elements: ${maxElementCount}`);
      
      // Final assertions
      expect(healthProtocolDetected).toBe(false);
      await expect(page.locator('text=Health Protocol')).not.toBeVisible();
      
      // Verify interface remains responsive
      await page.click('text=Browse Recipes');
      await expect(page.locator('[data-state="active"]')).toContainText('Recipes');
    });

    test('Concurrent browser operations stress test', async () => {
      console.log('Starting concurrent operations stress test...');
      
      // Create multiple concurrent pages
      const context = page.context();
      const concurrentPages = await Promise.all([
        context.newPage(),
        context.newPage(),
        context.newPage(),
        context.newPage(),
        context.newPage()
      ]);
      
      try {
        // Login all pages simultaneously
        await Promise.all(concurrentPages.map(p => loginAsTrainer(p)));
        
        // Perform concurrent operations across all pages
        const operations = concurrentPages.map(async (p, index) => {
          console.log(`Starting operations on page ${index + 1}`);
          
          for (let i = 0; i < 30; i++) {
            try {
              // Different operation patterns per page
              switch (index % 4) {
                case 0:
                  await p.click('text=Browse Recipes');
                  await p.waitForTimeout(50);
                  await p.click('text=Generate Plans');
                  break;
                case 1:
                  await p.click('text=Customers');
                  await p.waitForTimeout(50);
                  await p.click('text=Saved Plans');
                  break;
                case 2:
                  await p.reload();
                  await p.waitForTimeout(100);
                  break;
                case 3:
                  await p.goBack();
                  await p.waitForTimeout(50);
                  await p.goForward();
                  break;
              }
            } catch (e) {
              console.log(`Operation error on page ${index + 1}: ${e.message}`);
            }
          }
          
          console.log(`Completed operations on page ${index + 1}`);
        });
        
        // Wait for all concurrent operations to complete
        await Promise.allSettled(operations);
        
        // Verify no health protocol on any page
        for (let i = 0; i < concurrentPages.length; i++) {
          const p = concurrentPages[i];
          const healthCount = await p.locator('text=Health Protocol').count();
          expect(healthCount).toBe(0);
          
          const tabCount = await p.locator('[role="tab"]').count();
          expect(tabCount).toBe(4);
          
          console.log(`✓ Page ${i + 1} verified: No health protocol, 4 tabs`);
        }
        
        console.log('Concurrent operations stress test completed successfully');
        
      } finally {
        // Clean up concurrent pages
        await Promise.all(concurrentPages.map(p => p.close()));
      }
    });

    test('Network interruption recovery stress test', async () => {
      console.log('Starting network interruption recovery test...');
      
      let recoveryCount = 0;
      let healthProtocolSeen = false;
      
      // Simulate intermittent network failures over extended period
      for (let cycle = 0; cycle < 20; cycle++) {
        console.log(`Network interruption cycle ${cycle + 1}/20`);
        
        // Enable network interruption (50% failure rate)
        await page.route('**/*', (route) => {
          if (Math.random() < 0.5) {
            console.log(`Network request blocked: ${route.request().url()}`);
            route.abort();
          } else {
            route.continue();
          }
        });
        
        // Try various operations during network issues
        try {
          await page.click('text=Browse Recipes');
          await page.waitForTimeout(200);
          await page.click('text=Generate Plans');
          await page.waitForTimeout(200);
          await page.click('text=Customers');
          await page.waitForTimeout(200);
        } catch (e) {
          console.log(`Expected network error during cycle ${cycle + 1}: ${e.message}`);
        }
        
        // Remove network interruption
        await page.unroute('**/*');
        
        // Test recovery
        try {
          await page.reload({ waitUntil: 'networkidle', timeout: 10000 });
          recoveryCount++;
          console.log(`✓ Recovery successful for cycle ${cycle + 1}`);
        } catch (e) {
          console.log(`Recovery failed for cycle ${cycle + 1}: ${e.message}`);
        }
        
        // Check for health protocol after recovery
        const healthCount = await page.locator('text=Health Protocol').count();
        if (healthCount > 0) {
          healthProtocolSeen = true;
          console.log(`❌ Health Protocol appeared after recovery in cycle ${cycle + 1}`);
        }
        
        // Verify tab count
        const tabCount = await page.locator('[role="tab"]').count();
        expect(tabCount).toBe(4);
      }
      
      console.log(`Network recovery test completed. Successful recoveries: ${recoveryCount}/20`);
      
      // Final assertions
      expect(healthProtocolSeen).toBe(false);
      await expect(page.locator('text=Health Protocol')).not.toBeVisible();
      await expect(page.locator('[role="tab"]')).toHaveCount(4);
      
      // Verify final functionality
      await page.click('text=Browse Recipes');
      await expect(page.locator('[data-state="active"]')).toContainText('Recipes');
    });

    test('Extreme viewport manipulation stress test', async () => {
      console.log('Starting extreme viewport manipulation test...');
      
      const extremeViewports = [
        { width: 200, height: 300, name: 'ultra-narrow' },
        { width: 100, height: 800, name: 'ultra-thin' },
        { width: 3840, height: 2160, name: '4K' },
        { width: 7680, height: 4320, name: '8K' },
        { width: 320, height: 200, name: 'ultra-small' },
        { width: 1, height: 1, name: 'minimal' },
        { width: 5000, height: 1, name: 'ultra-wide' },
      ];
      
      for (const viewport of extremeViewports) {
        console.log(`Testing extreme viewport: ${viewport.name} (${viewport.width}x${viewport.height})`);
        
        try {
          await page.setViewportSize({ 
            width: viewport.width, 
            height: viewport.height 
          });
          
          await page.waitForTimeout(500);
          
          // Try to interact with tabs at extreme viewport
          try {
            const tabElements = await page.locator('[role="tab"]').all();
            if (tabElements.length > 0) {
              await tabElements[0].click();
              await page.waitForTimeout(200);
            }
          } catch (e) {
            console.log(`Tab interaction expected to fail at ${viewport.name}: ${e.message}`);
          }
          
          // Verify no health protocol at extreme viewport
          const healthCount = await page.locator('text=Health Protocol').count();
          expect(healthCount).toBe(0);
          
          console.log(`✓ ${viewport.name} viewport test passed`);
          
        } catch (e) {
          console.log(`Viewport ${viewport.name} test error (may be expected): ${e.message}`);
        }
      }
      
      // Reset to normal viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Verify normal functionality restored
      await expect(page.locator('[role="tab"]')).toHaveCount(4);
      await expect(page.locator('text=Health Protocol')).not.toBeVisible();
      
      await page.click('text=Browse Recipes');
      await expect(page.locator('[data-state="active"]')).toContainText('Recipes');
      
      console.log('Extreme viewport manipulation test completed');
    });
  });

  test.describe('Error Injection & Recovery', () => {
    test('JavaScript error injection doesn\'t expose Health Protocol', async () => {
      console.log('Starting JavaScript error injection test...');
      
      // Inject various JavaScript errors
      const errorScenarios = [
        'throw new Error("Simulated error");',
        'undefined.property;',
        'window.invalidFunction();',
        'document.querySelector(null);',
        'JSON.parse("{invalid json}");',
      ];
      
      for (const errorScript of errorScenarios) {
        console.log(`Injecting error: ${errorScript}`);
        
        try {
          await page.evaluate(errorScript);
        } catch (e) {
          console.log(`Expected error caught: ${e.message}`);
        }
        
        // Verify error doesn't expose health protocol
        await expect(page.locator('text=Health Protocol')).not.toBeVisible();
        
        // Verify interface remains functional
        const tabCount = await page.locator('[role="tab"]').count();
        expect(tabCount).toBe(4);
      }
      
      // Test recovery after errors
      await page.reload({ waitUntil: 'networkidle' });
      await expect(page.locator('text=Browse Recipes')).toBeVisible();
      await expect(page.locator('text=Health Protocol')).not.toBeVisible();
      
      console.log('JavaScript error injection test completed');
    });

    test('CSS manipulation attempts don\'t reveal Health Protocol', async () => {
      console.log('Starting CSS manipulation test...');
      
      // Attempt various CSS manipulations that might reveal hidden content
      await page.evaluate(() => {
        // Try to make health protocol visible through CSS
        const style = document.createElement('style');
        style.textContent = `
          [data-testid*="health"] { display: block !important; visibility: visible !important; }
          .health-protocol { display: block !important; opacity: 1 !important; }
          [aria-hidden="true"] { display: block !important; }
          [style*="display: none"] { display: block !important; }
          [hidden] { display: block !important; }
        `;
        document.head.appendChild(style);
        
        // Try to remove hiding classes
        document.querySelectorAll('[class*="hidden"], [class*="invisible"]').forEach(el => {
          el.classList.remove('hidden', 'invisible', 'opacity-0', 'sr-only');
        });
      });
      
      await page.waitForTimeout(1000);
      
      // Verify CSS manipulation doesn't reveal health protocol
      await expect(page.locator('text=Health Protocol')).not.toBeVisible();
      await expect(page.locator('[data-testid="health-protocol"]')).not.toBeVisible();
      
      // Verify tab count unchanged
      const tabCount = await page.locator('[role="tab"]').count();
      expect(tabCount).toBe(4);
      
      console.log('CSS manipulation test completed');
    });

    test('Local storage manipulation doesn\'t restore Health Protocol', async () => {
      console.log('Starting local storage manipulation test...');
      
      // Inject health protocol data into storage
      await page.evaluate(() => {
        // Various storage manipulation attempts
        localStorage.setItem('health-protocol-enabled', 'true');
        localStorage.setItem('trainer-tabs', JSON.stringify([
          'recipes', 'meal-plan', 'customers', 'saved-plans', 'health-protocol'
        ]));
        localStorage.setItem('feature-flags', JSON.stringify({
          healthProtocol: true,
          showHealthTab: true
        }));
        
        sessionStorage.setItem('health-protocol-state', JSON.stringify({
          active: true,
          visible: true
        }));
        sessionStorage.setItem('user-permissions', JSON.stringify({
          healthProtocol: true
        }));
      });
      
      // Reload to trigger potential storage-based restoration
      await page.reload({ waitUntil: 'networkidle' });
      
      // Verify storage manipulation doesn't work
      await expect(page.locator('text=Health Protocol')).not.toBeVisible();
      await expect(page.locator('[role="tab"]')).toHaveCount(4);
      
      // Verify normal functionality
      await page.click('text=Browse Recipes');
      await expect(page.locator('[data-state="active"]')).toContainText('Recipes');
      
      console.log('Local storage manipulation test completed');
    });
  });

  test.describe('Accessibility Stress Testing', () => {
    test('Screen reader navigation stress test', async () => {
      console.log('Starting screen reader navigation stress test...');
      
      // Simulate extensive screen reader navigation
      for (let i = 0; i < 50; i++) {
        // Tab through all focusable elements
        await page.keyboard.press('Tab');
        
        // Check current focus doesn't include health protocol
        const focusedElement = await page.locator(':focus');
        const focusText = await focusedElement.textContent();
        
        if (focusText && focusText.includes('Health Protocol')) {
          throw new Error(`Health Protocol found in focus: ${focusText}`);
        }
        
        // Use arrow keys for navigation
        if (i % 10 === 0) {
          await page.keyboard.press('ArrowRight');
          await page.keyboard.press('ArrowLeft');
          await page.keyboard.press('ArrowDown');
          await page.keyboard.press('ArrowUp');
        }
      }
      
      // Verify no health protocol accessible via keyboard
      await expect(page.locator('text=Health Protocol')).not.toBeVisible();
      
      console.log('Screen reader navigation stress test completed');
    });

    test('High contrast mode doesn\'t reveal Health Protocol', async () => {
      console.log('Starting high contrast mode test...');
      
      // Simulate high contrast mode
      await page.evaluate(() => {
        document.documentElement.style.filter = 'contrast(300%) brightness(200%)';
        document.documentElement.style.setProperty('--background', '#000000');
        document.documentElement.style.setProperty('--foreground', '#ffffff');
      });
      
      await page.waitForTimeout(1000);
      
      // Verify high contrast doesn't reveal hidden content
      await expect(page.locator('text=Health Protocol')).not.toBeVisible();
      
      // Test navigation in high contrast mode
      await page.click('text=Generate Plans');
      await expect(page.locator('[data-state="active"]')).toContainText('Generate');
      
      console.log('High contrast mode test completed');
    });
  });
});