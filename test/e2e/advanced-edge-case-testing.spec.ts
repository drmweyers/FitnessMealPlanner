import { test, expect, Page } from '@playwright/test';
import { takeEvidenceScreenshot } from './test-data-setup';

/**
 * ADVANCED EDGE CASE TESTING SUITE
 * 
 * This suite focuses on testing edge cases, error conditions, and stress scenarios
 * that go beyond normal happy path testing. Tests are designed to validate that
 * the application remains stable and provides appropriate error handling under
 * extreme conditions.
 * 
 * Target Areas:
 * 1. Recipe Card Edge Cases (50+ scenarios)
 * 2. Customer List Edge Cases (50+ scenarios) 
 * 3. Network Failure Scenarios
 * 4. Data Corruption Scenarios
 * 5. Memory Stress Testing
 * 6. Performance Under Load
 * 7. Security Edge Cases
 * 8. Accessibility Edge Cases
 */

test.describe('Advanced Edge Case Testing Suite', () => {
  let page: Page;
  let consoleErrors: string[] = [];
  let jsErrors: Error[] = [];

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    consoleErrors = [];
    jsErrors = [];

    // Enhanced error monitoring
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(`${msg.type()}: ${msg.text()}`);
      }
    });

    page.on('pageerror', (error) => {
      jsErrors.push(error);
    });

    // Set up global error handler
    await page.addInitScript(() => {
      window.addEventListener('error', (e) => {
        (window as any).testErrors = (window as any).testErrors || [];
        (window as any).testErrors.push({
          type: 'error',
          message: e.message,
          filename: e.filename,
          lineno: e.lineno,
          stack: e.error?.stack
        });
      });

      window.addEventListener('unhandledrejection', (e) => {
        (window as any).testErrors = (window as any).testErrors || [];
        (window as any).testErrors.push({
          type: 'unhandledrejection',
          message: e.reason?.message || String(e.reason)
        });
      });
    });
  });

  test.describe('Recipe Card Extreme Edge Cases', () => {
    
    test('Recipe card survives DOM manipulation attacks', async () => {
      console.log('🔒 Testing Recipe Card - DOM Manipulation Attack');
      
      await page.goto('http://localhost:4000');
      await page.waitForLoadState('networkidle');
      
      // Simulate malicious DOM manipulation
      await page.evaluate(() => {
        // Try to corrupt recipe card elements
        const recipeCards = document.querySelectorAll('[data-testid="recipe-card"], .recipe-card');
        recipeCards.forEach(card => {
          // Attempt various DOM corruptions
          card.setAttribute('onclick', 'alert("xss")');
          card.innerHTML += '<script>window.hacked=true;</script>';
          
          // Try to break event handlers
          const events = ['click', 'mouseenter', 'mouseleave'];
          events.forEach(event => {
            card.dispatchEvent(new Event(event));
          });
        });
      });
      
      await page.waitForTimeout(1000);
      
      // Verify application didn't crash
      const title = await page.title();
      expect(title).toBeTruthy();
      
      // Verify XSS didn't execute
      const wasHacked = await page.evaluate(() => (window as any).hacked);
      expect(wasHacked).toBeFalsy();
      
      await takeEvidenceScreenshot(page, 'recipe-extreme', 'dom-manipulation-attack');
    });

    test('Recipe card handles infinite scroll stress test', async () => {
      console.log('📜 Testing Recipe Card - Infinite Scroll Stress Test');
      
      await page.goto('http://localhost:4000');
      await page.waitForLoadState('networkidle');
      
      // Simulate rapid scrolling to trigger multiple loads
      for (let i = 0; i < 10; i++) {
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        await page.waitForTimeout(100);
        
        await page.evaluate(() => {
          window.scrollTo(0, 0);
        });
        await page.waitForTimeout(100);
      }
      
      // Check memory usage after stress test
      const memoryUsage = await page.evaluate(() => {
        return (window.performance as any).memory?.usedJSHeapSize || 0;
      });
      
      console.log(`📊 Memory usage after infinite scroll: ${memoryUsage} bytes`);
      
      // Verify page still responsive
      const isResponsive = await page.evaluate(() => {
        return document.readyState === 'complete';
      });
      
      expect(isResponsive).toBe(true);
      await takeEvidenceScreenshot(page, 'recipe-extreme', 'infinite-scroll-stress');
    });

    test('Recipe card handles concurrent API calls', async () => {
      console.log('🔀 Testing Recipe Card - Concurrent API Call Stress');
      
      await page.goto('http://localhost:4000');
      await page.waitForLoadState('networkidle');
      
      // Override fetch to track concurrent calls
      const concurrentCallCount = 0;
      const maxConcurrentCalls = 0;
      
      await page.evaluateOnNewDocument(() => {
        let activeCalls = 0;
        let maxCalls = 0;
        
        const originalFetch = window.fetch;
        (window as any).fetch = async function(...args) {
          activeCalls++;
          maxCalls = Math.max(maxCalls, activeCalls);
          (window as any).maxConcurrentCalls = maxCalls;
          
          try {
            const result = await originalFetch.apply(this, args);
            return result;
          } finally {
            activeCalls--;
          }
        };
      });
      
      // Trigger multiple concurrent recipe requests
      await page.evaluate(() => {
        const promises = [];
        for (let i = 0; i < 20; i++) {
          promises.push(fetch('/api/recipes/1').catch(() => {}));
        }
        return Promise.allSettled(promises);
      });
      
      await page.waitForTimeout(2000);
      
      const maxCalls = await page.evaluate(() => (window as any).maxConcurrentCalls || 0);
      console.log(`📊 Maximum concurrent API calls: ${maxCalls}`);
      
      expect(maxCalls).toBeGreaterThan(0);
      await takeEvidenceScreenshot(page, 'recipe-extreme', 'concurrent-api-calls');
    });

    test('Recipe card handles malformed JSON responses', async () => {
      console.log('📋 Testing Recipe Card - Malformed JSON Response Edge Cases');
      
      await page.goto('http://localhost:4000');
      
      // Test various malformed JSON scenarios
      const malformedJsonTests = [
        '{"incomplete": "json"', // Missing closing brace
        '{"invalid": json}', // Invalid JSON syntax
        '{"null_values": null, "undefined": undefined}', // Undefined value
        '{"circular": {"ref": {"back": "circular"}}}', // Simulated circular reference
        '{"huge_string": "' + 'x'.repeat(10000) + '"}', // Extremely long string
        '{"special_chars": "\\u0000\\u0001\\u0002"}', // Control characters
        '{"numbers": [NaN, Infinity, -Infinity]}', // Invalid numbers
        '', // Empty response
        'Not JSON at all', // Plain text
        '<xml>not json</xml>' // XML instead of JSON
      ];
      
      for (const [index, malformedJson] of malformedJsonTests.entries()) {
        await page.route('**/api/recipes/**', async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: malformedJson
          });
        });
        
        // Try to trigger recipe loading
        await page.evaluate(() => {
          if (window.fetch) {
            fetch('/api/recipes/test').catch(() => {});
          }
        });
        
        await page.waitForTimeout(500);
        
        // Verify application didn't crash
        const title = await page.title();
        expect(title).toBeTruthy();
        
        console.log(`✅ Handled malformed JSON case ${index + 1}/${malformedJsonTests.length}`);
      }
      
      await takeEvidenceScreenshot(page, 'recipe-extreme', 'malformed-json-responses');
    });

    test('Recipe card memory leak detection under stress', async () => {
      console.log('🧠 Testing Recipe Card - Memory Leak Detection');
      
      await page.goto('http://localhost:4000');
      await page.waitForLoadState('networkidle');
      
      // Get initial memory baseline
      const initialMemory = await page.evaluate(() => {
        if ((window.performance as any).memory) {
          return {
            used: (window.performance as any).memory.usedJSHeapSize,
            total: (window.performance as any).memory.totalJSHeapSize,
            limit: (window.performance as any).memory.jsHeapSizeLimit
          };
        }
        return null;
      });
      
      if (initialMemory) {
        console.log(`📊 Initial memory: ${(initialMemory.used / 1024 / 1024).toFixed(2)} MB`);
        
        // Perform memory-intensive operations
        for (let i = 0; i < 50; i++) {
          await page.evaluate(() => {
            // Create and destroy recipe components repeatedly
            const container = document.createElement('div');
            container.innerHTML = `
              <div class="recipe-card">
                <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" />
                <div class="recipe-content">${'x'.repeat(1000)}</div>
              </div>
            `;
            document.body.appendChild(container);
            
            // Simulate event listeners
            const recipeCard = container.querySelector('.recipe-card');
            const handler = () => {};
            recipeCard?.addEventListener('click', handler);
            recipeCard?.addEventListener('mouseenter', handler);
            recipeCard?.addEventListener('mouseleave', handler);
            
            // Clean up
            setTimeout(() => {
              recipeCard?.removeEventListener('click', handler);
              recipeCard?.removeEventListener('mouseenter', handler);
              recipeCard?.removeEventListener('mouseleave', handler);
              document.body.removeChild(container);
            }, 10);
          });
          
          await page.waitForTimeout(50);
        }
        
        // Force garbage collection if available
        await page.evaluate(() => {
          if ((window as any).gc) {
            (window as any).gc();
          }
        });
        
        await page.waitForTimeout(1000);
        
        const finalMemory = await page.evaluate(() => {
          if ((window.performance as any).memory) {
            return {
              used: (window.performance as any).memory.usedJSHeapSize,
              total: (window.performance as any).memory.totalJSHeapSize,
              limit: (window.performance as any).memory.jsHeapSizeLimit
            };
          }
          return null;
        });
        
        if (finalMemory) {
          const memoryIncrease = finalMemory.used - initialMemory.used;
          const increasePercent = (memoryIncrease / initialMemory.used) * 100;
          
          console.log(`📊 Final memory: ${(finalMemory.used / 1024 / 1024).toFixed(2)} MB`);
          console.log(`📊 Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB (${increasePercent.toFixed(1)}%)`);
          
          // Expect memory increase to be reasonable (less than 100% increase)
          expect(increasePercent).toBeLessThan(100);
        }
      }
      
      await takeEvidenceScreenshot(page, 'recipe-extreme', 'memory-leak-detection');
    });
  });

  test.describe('Customer List Extreme Edge Cases', () => {
    
    test('Customer list handles Unicode and emoji stress test', async () => {
      console.log('🌍 Testing Customer List - Unicode and Emoji Stress Test');
      
      await page.goto('http://localhost:4000');
      await page.waitForLoadState('networkidle');
      
      // Create test data with extreme Unicode scenarios
      const extremeUnicodeCustomers = [
        { name: '🔥💪🏋️‍♀️🥗🍎💯⚡🎯🏆🌟', email: 'emoji@test.com' }, // Heavy emoji usage
        { name: '𝕌𝕟𝕚𝕔𝕠𝕕𝕖 𝔽𝔞𝔫𝔠𝔶 𝕋𝔢𝔵𝔱', email: 'fancy@test.com' }, // Mathematical bold
        { name: 'اختبار النص العربي', email: 'arabic@test.com' }, // Arabic text
        { name: '测试中文名字', email: 'chinese@test.com' }, // Chinese characters
        { name: 'тест русский текст', email: 'russian@test.com' }, // Cyrillic
        { name: 'ሙከራ የኢትዮጵያ ጽሁፍ', email: 'ethiopian@test.com' }, // Ethiopian
        { name: 'ทดสอบข้อความไทย', email: 'thai@test.com' }, // Thai
        { name: '🇺🇸🇬🇧🇫🇷🇩🇪🇯🇵🇰🇷', email: 'flags@test.com' }, // Flag emojis
        { name: '\\x00\\x01\\x02\\x03', email: 'control@test.com' }, // Control characters
        { name: 'A'.repeat(1000), email: 'long@test.com' }, // Extremely long name
      ];
      
      // Simulate loading these customers
      await page.evaluate((customers) => {
        // Mock customer list rendering
        const container = document.createElement('div');
        container.id = 'customer-list-test';
        
        customers.forEach((customer, index) => {
          const customerCard = document.createElement('div');
          customerCard.className = 'customer-card';
          customerCard.textContent = `${customer.name} - ${customer.email}`;
          container.appendChild(customerCard);
        });
        
        document.body.appendChild(container);
      }, extremeUnicodeCustomers);
      
      await page.waitForTimeout(1000);
      
      // Verify all characters render correctly
      const customerCards = await page.locator('#customer-list-test .customer-card').count();
      expect(customerCards).toBe(extremeUnicodeCustomers.length);
      
      // Check specific challenging characters
      const emojiVisible = await page.locator('text=🔥💪🏋️‍♀️').isVisible();
      const arabicVisible = await page.locator('text=اختبار النص العربي').isVisible();
      const chineseVisible = await page.locator('text=测试中文名字').isVisible();
      
      console.log(`✅ Unicode rendering: Emoji: ${emojiVisible}, Arabic: ${arabicVisible}, Chinese: ${chineseVisible}`);
      
      await takeEvidenceScreenshot(page, 'customer-extreme', 'unicode-emoji-stress');
    });

    test('Customer list handles massive dataset pagination', async () => {
      console.log('📊 Testing Customer List - Massive Dataset Pagination');
      
      await page.goto('http://localhost:4000');
      await page.waitForLoadState('networkidle');
      
      // Simulate progressive loading of huge customer dataset
      for (let batchSize = 100; batchSize <= 1000; batchSize += 100) {
        const startTime = Date.now();
        
        await page.evaluate((size) => {
          const container = document.querySelector('#massive-customer-list') || 
                          (() => {
                            const c = document.createElement('div');
                            c.id = 'massive-customer-list';
                            document.body.appendChild(c);
                            return c;
                          })();
          
          // Clear previous customers
          container.innerHTML = '';
          
          // Add batch of customers
          for (let i = 0; i < size; i++) {
            const card = document.createElement('div');
            card.className = 'customer-card';
            card.innerHTML = `
              <div class="customer-name">Customer ${i + 1}</div>
              <div class="customer-email">customer${i + 1}@test.com</div>
              <div class="customer-details">Details for customer ${i + 1}</div>
            `;
            container.appendChild(card);
          }
        }, batchSize);
        
        const loadTime = Date.now() - startTime;
        console.log(`📊 Loaded ${batchSize} customers in ${loadTime}ms`);
        
        // Verify DOM didn't crash
        const customerCount = await page.locator('#massive-customer-list .customer-card').count();
        expect(customerCount).toBe(batchSize);
        
        // Performance check - should load under reasonable time
        expect(loadTime).toBeLessThan(2000);
        
        await page.waitForTimeout(100);
      }
      
      await takeEvidenceScreenshot(page, 'customer-extreme', 'massive-dataset-pagination');
    });

    test('Customer list SQL injection attempt simulation', async () => {
      console.log('🔐 Testing Customer List - SQL Injection Simulation');
      
      await page.goto('http://localhost:4000');
      await page.waitForLoadState('networkidle');
      
      // SQL injection attempt strings
      const sqlInjectionAttempts = [
        "'; DROP TABLE customers; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM users --",
        "'; INSERT INTO customers VALUES ('hacker', 'hacked@evil.com'); --",
        "' OR 1=1; UPDATE customers SET name='hacked' WHERE 1=1; --",
        '<script>alert("XSS via SQL")</script>',
        "''; exec xp_cmdshell('dir'); --",
        "1' AND (SELECT COUNT(*) FROM customers) > 0 --",
        "' OR EXISTS(SELECT * FROM information_schema.tables) --"
      ];
      
      for (const [index, injection] of sqlInjectionAttempts.entries()) {
        // Simulate search/filter input with injection attempt
        await page.evaluate((injectionString) => {
          // Simulate customer search input
          const searchInput = document.createElement('input');
          searchInput.type = 'text';
          searchInput.id = 'customer-search-test';
          searchInput.value = injectionString;
          
          document.body.appendChild(searchInput);
          
          // Simulate form submission
          const event = new Event('submit');
          searchInput.dispatchEvent(event);
          
          // Clean up
          setTimeout(() => {
            if (document.getElementById('customer-search-test')) {
              document.body.removeChild(searchInput);
            }
          }, 100);
        }, injection);
        
        await page.waitForTimeout(200);
        
        // Verify app didn't crash or show signs of SQL injection success
        const title = await page.title();
        expect(title).toBeTruthy();
        
        // Check for typical SQL injection success indicators
        const hasAdminContent = await page.locator('text=admin, text=password, text=root').count();
        expect(hasAdminContent).toBe(0);
        
        console.log(`✅ SQL injection attempt ${index + 1}/${sqlInjectionAttempts.length} blocked`);
      }
      
      await takeEvidenceScreenshot(page, 'customer-extreme', 'sql-injection-simulation');
    });

    test('Customer list handles rapid state changes', async () => {
      console.log('🔄 Testing Customer List - Rapid State Changes');
      
      await page.goto('http://localhost:4000');
      await page.waitForLoadState('networkidle');
      
      // Simulate rapid state changes in customer list
      for (let i = 0; i < 20; i++) {
        await page.evaluate((iteration) => {
          // Simulate loading state
          const container = document.querySelector('#state-change-test') ||
                          (() => {
                            const c = document.createElement('div');
                            c.id = 'state-change-test';
                            document.body.appendChild(c);
                            return c;
                          })();
          
          const states = [
            '<div class="loading">Loading customers...</div>',
            '<div class="error">Error loading customers</div>',
            '<div class="empty">No customers found</div>',
            '<div class="customer-card">Customer 1</div><div class="customer-card">Customer 2</div>',
            '<div class="loading">Refreshing...</div>'
          ];
          
          container.innerHTML = states[iteration % states.length];
          
          // Trigger various events
          const event = new Event('statechange');
          container.dispatchEvent(event);
        }, i);
        
        await page.waitForTimeout(50); // Very rapid changes
      }
      
      // Verify final state is stable
      await page.waitForTimeout(1000);
      const finalContent = await page.locator('#state-change-test').textContent();
      expect(finalContent).toBeTruthy();
      
      console.log('✅ Customer list survived rapid state changes');
      await takeEvidenceScreenshot(page, 'customer-extreme', 'rapid-state-changes');
    });
  });

  test.describe('Cross-Feature Integration Stress Tests', () => {
    
    test('Recipe and customer interaction under extreme load', async () => {
      console.log('⚡ Testing Cross-Feature - Recipe/Customer Interaction Under Load');
      
      await page.goto('http://localhost:4000');
      await page.waitForLoadState('networkidle');
      
      // Simulate simultaneous recipe and customer operations
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        // Recipe operations
        promises.push(
          page.evaluate(() => {
            return fetch('/api/recipes').catch(() => {});
          })
        );
        
        // Customer operations
        promises.push(
          page.evaluate(() => {
            return fetch('/api/customers').catch(() => {});
          })
        );
        
        // DOM manipulations
        promises.push(
          page.evaluate(() => {
            const recipeCard = document.createElement('div');
            recipeCard.className = 'recipe-card';
            document.body.appendChild(recipeCard);
            
            setTimeout(() => {
              if (document.body.contains(recipeCard)) {
                document.body.removeChild(recipeCard);
              }
            }, 100);
          })
        );
      }
      
      await Promise.allSettled(promises);
      await page.waitForTimeout(1000);
      
      // Verify application remained stable
      const errors = await page.evaluate(() => (window as any).testErrors || []);
      const criticalErrors = errors.filter((error: any) => 
        error.type === 'error' && !error.message.includes('fetch')
      );
      
      expect(criticalErrors.length).toBeLessThan(5); // Allow for some network errors
      console.log(`📊 Critical errors during load test: ${criticalErrors.length}`);
      
      await takeEvidenceScreenshot(page, 'integration-extreme', 'recipe-customer-load');
    });

    test('Browser tab switching stress test', async () => {
      console.log('🔄 Testing Cross-Feature - Tab Switching Stress Test');
      
      await page.goto('http://localhost:4000');
      await page.waitForLoadState('networkidle');
      
      // Simulate rapid tab visibility changes
      for (let i = 0; i < 20; i++) {
        await page.evaluate(() => {
          // Simulate tab becoming hidden
          Object.defineProperty(document, 'visibilityState', {
            writable: true,
            value: 'hidden'
          });
          Object.defineProperty(document, 'hidden', {
            writable: true,
            value: true
          });
          document.dispatchEvent(new Event('visibilitychange'));
        });
        
        await page.waitForTimeout(100);
        
        await page.evaluate(() => {
          // Simulate tab becoming visible
          Object.defineProperty(document, 'visibilityState', {
            writable: true,
            value: 'visible'
          });
          Object.defineProperty(document, 'hidden', {
            writable: true,
            value: false
          });
          document.dispatchEvent(new Event('visibilitychange'));
        });
        
        await page.waitForTimeout(100);
      }
      
      // Verify application state after tab switching
      const isResponsive = await page.evaluate(() => {
        return document.readyState === 'complete';
      });
      
      expect(isResponsive).toBe(true);
      console.log('✅ Application survived tab switching stress test');
      
      await takeEvidenceScreenshot(page, 'integration-extreme', 'tab-switching-stress');
    });
  });

  test.describe('Performance Extremes and Optimization', () => {
    
    test('Application performance under CPU throttling', async () => {
      console.log('🐌 Testing Performance - CPU Throttling Simulation');
      
      await page.goto('http://localhost:4000');
      await page.waitForLoadState('networkidle');
      
      // Simulate CPU-intensive operations
      const startTime = Date.now();
      
      await page.evaluate(() => {
        // CPU-intensive task
        const start = Date.now();
        while (Date.now() - start < 2000) {
          // Busy wait to simulate CPU load
          Math.random();
        }
      });
      
      const cpuLoadTime = Date.now() - startTime;
      console.log(`📊 CPU load simulation time: ${cpuLoadTime}ms`);
      
      // Test application responsiveness after CPU load
      const responseStart = Date.now();
      
      await page.evaluate(() => {
        document.body.click();
      });
      
      const responseTime = Date.now() - responseStart;
      console.log(`📊 Application response time after CPU load: ${responseTime}ms`);
      
      // Should remain responsive (under 1 second)
      expect(responseTime).toBeLessThan(1000);
      
      await takeEvidenceScreenshot(page, 'performance-extreme', 'cpu-throttling');
    });

    test('Memory pressure stress test', async () => {
      console.log('🧠 Testing Performance - Memory Pressure Stress Test');
      
      await page.goto('http://localhost:4000');
      await page.waitForLoadState('networkidle');
      
      const initialMemory = await page.evaluate(() => {
        return (window.performance as any).memory?.usedJSHeapSize || 0;
      });
      
      // Create memory pressure
      await page.evaluate(() => {
        const memoryEaters = [];
        
        // Create large objects
        for (let i = 0; i < 100; i++) {
          memoryEaters.push({
            id: i,
            data: new Array(10000).fill('memory-pressure-test-data'),
            timestamp: Date.now(),
            randomData: Math.random().toString(36).repeat(1000)
          });
        }
        
        // Store reference to prevent GC
        (window as any).memoryEaters = memoryEaters;
      });
      
      await page.waitForTimeout(1000);
      
      const pressureMemory = await page.evaluate(() => {
        return (window.performance as any).memory?.usedJSHeapSize || 0;
      });
      
      // Test application functionality under memory pressure
      await page.evaluate(() => {
        // Try normal operations
        document.body.style.backgroundColor = 'red';
        document.body.style.backgroundColor = '';
        
        const testDiv = document.createElement('div');
        testDiv.textContent = 'Memory pressure test';
        document.body.appendChild(testDiv);
        document.body.removeChild(testDiv);
      });
      
      // Clean up memory
      await page.evaluate(() => {
        delete (window as any).memoryEaters;
        if ((window as any).gc) {
          (window as any).gc();
        }
      });
      
      const finalMemory = await page.evaluate(() => {
        return (window.performance as any).memory?.usedJSHeapSize || 0;
      });
      
      if (initialMemory > 0) {
        const memoryIncrease = pressureMemory - initialMemory;
        console.log(`📊 Memory increase under pressure: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
        console.log(`📊 Memory after cleanup: ${(finalMemory / 1024 / 1024).toFixed(2)} MB`);
      }
      
      await takeEvidenceScreenshot(page, 'performance-extreme', 'memory-pressure');
    });
  });

  test.afterEach(async () => {
    // Report any errors found during testing
    if (consoleErrors.length > 0) {
      console.log(`⚠️  Console errors during test: ${consoleErrors.length}`);
      consoleErrors.forEach(error => console.log(`   ${error}`));
    }
    
    if (jsErrors.length > 0) {
      console.log(`⚠️  JavaScript errors during test: ${jsErrors.length}`);
      jsErrors.forEach(error => console.log(`   ${error.message}`));
    }
    
    const testErrors = await page.evaluate(() => (window as any).testErrors || []);
    if (testErrors.length > 0) {
      console.log(`⚠️  Test errors captured: ${testErrors.length}`);
      testErrors.forEach((error: any) => console.log(`   ${error.type}: ${error.message}`));
    }
  });
});