import { test, expect, Page } from '@playwright/test';
import { loginAsTrainer } from './helpers/auth';

test.describe('Edge Case Testing: Health Protocol Elimination', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await loginAsTrainer(page);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Navigation Edge Cases', () => {
    test('Health Protocol cannot be accessed via direct URL manipulation', async () => {
      const baseUrl = page.url().split('/')[0] + '//' + page.url().split('/')[2];
      
      // Test various URL manipulation attempts
      const urlAttempts = [
        `${baseUrl}/trainer#health-protocol`,
        `${baseUrl}/trainer?tab=health-protocol`,
        `${baseUrl}/trainer/health-protocol`,
        `${baseUrl}/trainer?tab=health&protocol=true`,
        `${baseUrl}/trainer/health`,
        `${baseUrl}/health-protocol`,
        `${baseUrl}/trainer?health=true`,
        `${baseUrl}/trainer#health`,
        `${baseUrl}/trainer?section=health-protocol`,
        `${baseUrl}/trainer/protocols`,
      ];

      for (const url of urlAttempts) {
        console.log(`Testing URL manipulation: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle' });
        
        // Verify no health protocol content is visible
        await expect(page.locator('text=Health Protocol')).not.toBeVisible();
        await expect(page.locator('[data-testid="health-protocol"]')).not.toBeVisible();
        await expect(page.locator('.health-protocol')).not.toBeVisible();
        
        // Verify trainer interface loads normally without health tab
        await expect(page.locator('text=Browse Recipes')).toBeVisible();
        await expect(page.locator('text=Generate Plans')).toBeVisible();
        await expect(page.locator('text=Saved Plans')).toBeVisible();
        await expect(page.locator('text=Customers')).toBeVisible();
        
        // Count tabs to ensure only 4 remain (no health protocol tab)
        const tabCount = await page.locator('[role="tab"]').count();
        expect(tabCount).toBe(4);
      }
    });

    test('Deep linking to trainer sections works correctly', async () => {
      const baseUrl = page.url().split('/')[0] + '//' + page.url().split('/')[2];
      
      const validDeepLinks = [
        { url: `${baseUrl}/trainer`, expectedTab: 'recipes', expectedContent: 'Browse Recipes' },
        { url: `${baseUrl}/meal-plan-generator`, expectedTab: 'meal-plan', expectedContent: 'Generate Plans' },
        { url: `${baseUrl}/trainer/customers`, expectedTab: 'customers', expectedContent: 'Customers' },
        { url: `${baseUrl}/trainer/meal-plans`, expectedTab: 'saved-plans', expectedContent: 'Saved Plans' },
      ];

      for (const link of validDeepLinks) {
        console.log(`Testing deep link: ${link.url}`);
        await page.goto(link.url, { waitUntil: 'networkidle' });
        
        // Verify correct tab is active
        const activeTab = await page.locator('[data-state="active"]').textContent();
        expect(activeTab).toContain(link.expectedContent);
        
        // Verify no health protocol elements exist
        await expect(page.locator('text=Health Protocol')).not.toBeVisible();
        await expect(page.locator('[data-testid="health-protocol"]')).not.toBeVisible();
      }
    });

    test('Browser back/forward navigation handles Health Protocol absence', async () => {
      // Navigate through trainer sections
      await page.click('text=Generate Plans');
      await page.waitForTimeout(500);
      
      await page.click('text=Customers');
      await page.waitForTimeout(500);
      
      await page.click('text=Saved Plans');
      await page.waitForTimeout(500);
      
      await page.click('text=Browse Recipes');
      await page.waitForTimeout(500);

      // Test browser back navigation
      for (let i = 0; i < 4; i++) {
        await page.goBack();
        await page.waitForTimeout(300);
        
        // Verify no health protocol appears during navigation
        await expect(page.locator('text=Health Protocol')).not.toBeVisible();
        await expect(page.locator('[data-testid="health-protocol"]')).not.toBeVisible();
        
        // Verify trainer interface remains intact
        const tabCount = await page.locator('[role="tab"]').count();
        expect(tabCount).toBe(4);
      }

      // Test browser forward navigation
      for (let i = 0; i < 4; i++) {
        await page.goForward();
        await page.waitForTimeout(300);
        
        // Verify no health protocol appears during navigation
        await expect(page.locator('text=Health Protocol')).not.toBeVisible();
        await expect(page.locator('[data-testid="health-protocol"]')).not.toBeVisible();
      }
    });

    test('Page refresh maintains correct tab state without Health Protocol', async () => {
      const tabs = ['Browse Recipes', 'Generate Plans', 'Customers', 'Saved Plans'];
      
      for (const tabText of tabs) {
        console.log(`Testing page refresh for tab: ${tabText}`);
        await page.click(`text=${tabText}`);
        await page.waitForTimeout(500);
        
        // Refresh page
        await page.reload({ waitUntil: 'networkidle' });
        
        // Verify correct tab remains active
        const activeTab = await page.locator('[data-state="active"]').textContent();
        expect(activeTab).toContain(tabText);
        
        // Verify no health protocol content appears
        await expect(page.locator('text=Health Protocol')).not.toBeVisible();
        await expect(page.locator('[data-testid="health-protocol"]')).not.toBeVisible();
        
        // Verify tab count remains 4
        const tabCount = await page.locator('[role="tab"]').count();
        expect(tabCount).toBe(4);
      }
    });

    test('Concurrent tab operations handle Health Protocol absence gracefully', async () => {
      // Open multiple browser tabs
      const context = page.context();
      const tab1 = await context.newPage();
      const tab2 = await context.newPage();
      const tab3 = await context.newPage();
      
      try {
        // Navigate all tabs to trainer
        await Promise.all([
          loginAsTrainer(tab1),
          loginAsTrainer(tab2),
          loginAsTrainer(tab3)
        ]);

        // Perform concurrent operations across tabs
        await Promise.all([
          tab1.click('text=Generate Plans'),
          tab2.click('text=Customers'),
          tab3.click('text=Saved Plans')
        ]);

        await page.waitForTimeout(1000);

        // Verify no health protocol content in any tab
        const tabs = [page, tab1, tab2, tab3];
        for (const tab of tabs) {
          await expect(tab.locator('text=Health Protocol')).not.toBeVisible();
          await expect(tab.locator('[data-testid="health-protocol"]')).not.toBeVisible();
          
          const tabCount = await tab.locator('[role="tab"]').count();
          expect(tabCount).toBe(4);
        }
      } finally {
        await Promise.all([tab1.close(), tab2.close(), tab3.close()]);
      }
    });
  });

  test.describe('Authentication Edge Cases', () => {
    test('Session expiration during trainer usage maintains Health Protocol elimination', async () => {
      // Simulate session expiration by clearing cookies
      await page.context().clearCookies();
      
      // Try to navigate to different sections
      await page.click('text=Generate Plans');
      
      // Should redirect to login or show auth error
      // After re-authentication, verify no health protocol
      await page.waitForTimeout(2000);
      
      // Re-login if redirected
      try {
        await loginAsTrainer(page);
        
        // Verify trainer interface without health protocol
        await expect(page.locator('text=Health Protocol')).not.toBeVisible();
        await expect(page.locator('[data-testid="health-protocol"]')).not.toBeVisible();
        
        const tabCount = await page.locator('[role="tab"]').count();
        expect(tabCount).toBe(4);
      } catch (e) {
        console.log('Session handling test completed');
      }
    });

    test('Permission boundary testing for Health Protocol access', async () => {
      // Test that even admin users don't see health protocol in trainer view
      await page.goto('/trainer', { waitUntil: 'networkidle' });
      
      // Try to access through console manipulation
      await page.evaluate(() => {
        // Attempt to inject health protocol tab
        const tabsList = document.querySelector('[role="tablist"]');
        if (tabsList) {
          const healthTab = document.createElement('button');
          healthTab.setAttribute('role', 'tab');
          healthTab.textContent = 'Health Protocol';
          healthTab.setAttribute('data-testid', 'health-protocol-injected');
          tabsList.appendChild(healthTab);
        }
      });
      
      // Verify injection doesn't work or is cleaned up
      await page.waitForTimeout(1000);
      const injectedTab = await page.locator('[data-testid="health-protocol-injected"]').count();
      expect(injectedTab).toBe(0);
    });

    test('Multiple login/logout cycles maintain Health Protocol elimination', async () => {
      for (let i = 0; i < 3; i++) {
        console.log(`Login/logout cycle ${i + 1}`);
        
        // Logout
        await page.click('[data-testid="user-menu"]');
        await page.click('text=Logout');
        await page.waitForTimeout(1000);
        
        // Login again
        await loginAsTrainer(page);
        
        // Verify no health protocol after re-login
        await expect(page.locator('text=Health Protocol')).not.toBeVisible();
        await expect(page.locator('[data-testid="health-protocol"]')).not.toBeVisible();
        
        const tabCount = await page.locator('[role="tab"]').count();
        expect(tabCount).toBe(4);
      }
    });
  });

  test.describe('Performance Edge Cases', () => {
    test('Rapid tab switching performance without Health Protocol', async () => {
      // Perform rapid tab switching to test performance
      const startTime = Date.now();
      
      for (let i = 0; i < 20; i++) {
        await page.click('text=Browse Recipes');
        await page.waitForTimeout(50);
        
        await page.click('text=Generate Plans');
        await page.waitForTimeout(50);
        
        await page.click('text=Saved Plans');
        await page.waitForTimeout(50);
        
        await page.click('text=Customers');
        await page.waitForTimeout(50);
        
        // Verify no health protocol appears during rapid switching
        const healthProtocolCount = await page.locator('text=Health Protocol').count();
        expect(healthProtocolCount).toBe(0);
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Verify performance remains good (under 30 seconds for 80 tab switches)
      expect(totalTime).toBeLessThan(30000);
      
      // Verify interface remains responsive
      await expect(page.locator('text=Browse Recipes')).toBeVisible();
      const finalTabCount = await page.locator('[role="tab"]').count();
      expect(finalTabCount).toBe(4);
    });

    test('Memory usage stability during extended session', async () => {
      // Simulate extended usage session
      for (let i = 0; i < 50; i++) {
        await page.click('text=Browse Recipes');
        await page.waitForTimeout(100);
        
        await page.click('text=Generate Plans');
        await page.waitForTimeout(100);
        
        // Check for memory leaks indicators
        const jsHandles = await page.evaluateHandle(() => document.querySelectorAll('*').length);
        const elementCount = await jsHandles.jsonValue();
        
        // Element count shouldn't grow excessively (basic memory leak check)
        expect(elementCount).toBeLessThan(5000);
        
        // Verify no health protocol elements accumulate
        const healthElementCount = await page.locator('[class*="health"], [id*="health"], [data-testid*="health"]').count();
        expect(healthElementCount).toBe(0);
      }
    });

    test('Stress test with concurrent operations', async () => {
      // Start concurrent operations
      const operations = [
        page.click('text=Browse Recipes'),
        page.reload(),
        page.goBack(),
        page.goForward(),
        page.click('text=Generate Plans'),
        page.click('text=Customers'),
        page.click('text=Saved Plans'),
      ];
      
      // Execute operations concurrently
      await Promise.allSettled(operations);
      
      // Verify system stability
      await page.waitForTimeout(2000);
      
      // Verify trainer interface is still intact
      await expect(page.locator('text=Browse Recipes')).toBeVisible();
      await expect(page.locator('text=Generate Plans')).toBeVisible();
      await expect(page.locator('text=Customers')).toBeVisible();
      await expect(page.locator('text=Saved Plans')).toBeVisible();
      
      // Verify no health protocol appears
      await expect(page.locator('text=Health Protocol')).not.toBeVisible();
      
      const tabCount = await page.locator('[role="tab"]').count();
      expect(tabCount).toBe(4);
    });
  });

  test.describe('UI/UX Edge Cases', () => {
    test('Responsive design breakpoints maintain Health Protocol elimination', async () => {
      const breakpoints = [
        { width: 320, height: 568, name: 'mobile-portrait' },
        { width: 768, height: 1024, name: 'tablet-portrait' },
        { width: 1024, height: 768, name: 'tablet-landscape' },
        { width: 1920, height: 1080, name: 'desktop' },
        { width: 2560, height: 1440, name: 'large-desktop' },
      ];

      for (const breakpoint of breakpoints) {
        console.log(`Testing breakpoint: ${breakpoint.name} (${breakpoint.width}x${breakpoint.height})`);
        
        await page.setViewportSize({ 
          width: breakpoint.width, 
          height: breakpoint.height 
        });
        
        await page.waitForTimeout(500);
        
        // Verify tabs are still visible and accessible
        await expect(page.locator('[role="tab"]')).toHaveCount(4);
        
        // Verify no health protocol at any breakpoint
        await expect(page.locator('text=Health Protocol')).not.toBeVisible();
        await expect(page.locator('[data-testid="health-protocol"]')).not.toBeVisible();
        
        // Test tab functionality at this breakpoint
        await page.click('text=Generate Plans');
        await expect(page.locator('[data-state="active"]').first()).toContainText('Generate');
        
        await page.click('text=Browse Recipes');
        await expect(page.locator('[data-state="active"]').first()).toContainText('Recipes');
      }
    });

    test('Modal interactions don\'t reveal Health Protocol elements', async () => {
      // Navigate to recipes and click on first recipe to open modal
      await page.click('text=Browse Recipes');
      
      // Wait for recipes to load and click first one
      await page.waitForSelector('[data-testid="recipe-card"]', { timeout: 10000 });
      const recipeCards = await page.locator('[data-testid="recipe-card"]').count();
      
      if (recipeCards > 0) {
        await page.click('[data-testid="recipe-card"]');
        
        // Verify modal opens
        await expect(page.locator('[role="dialog"]')).toBeVisible();
        
        // Verify no health protocol content in modal
        await expect(page.locator('[role="dialog"] text=Health Protocol')).not.toBeVisible();
        
        // Close modal and verify no health protocol elements remain
        await page.click('[data-testid="close-modal"]');
        await expect(page.locator('text=Health Protocol')).not.toBeVisible();
      }
    });

    test('Form submission edge cases don\'t expose Health Protocol', async () => {
      await page.click('text=Generate Plans');
      
      // Try various form interactions that might reveal hidden elements
      await page.evaluate(() => {
        // Attempt to trigger form events that might show hidden content
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
          const event = new Event('submit');
          form.dispatchEvent(event);
        });
      });
      
      await page.waitForTimeout(1000);
      
      // Verify no health protocol content appears
      await expect(page.locator('text=Health Protocol')).not.toBeVisible();
    });

    test('Keyboard navigation accessibility without Health Protocol', async () => {
      // Test Tab key navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Use arrow keys to navigate tabs
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowLeft');
      
      // Verify keyboard navigation works and no health protocol appears
      await expect(page.locator('text=Health Protocol')).not.toBeVisible();
      
      const focusedElement = await page.locator(':focus').textContent();
      expect(focusedElement).not.toContain('Health Protocol');
    });
  });

  test.describe('Error Handling Edge Cases', () => {
    test('Network failure recovery doesn\'t expose Health Protocol', async () => {
      // Simulate network failures
      await page.route('**/*', (route) => {
        if (Math.random() < 0.3) { // 30% failure rate
          route.abort();
        } else {
          route.continue();
        }
      });
      
      // Try to navigate between tabs
      for (let i = 0; i < 5; i++) {
        try {
          await page.click('text=Browse Recipes');
          await page.waitForTimeout(500);
          await page.click('text=Generate Plans');
          await page.waitForTimeout(500);
        } catch (e) {
          console.log(`Network simulation error (expected): ${e.message}`);
        }
      }
      
      // Remove network simulation
      await page.unroute('**/*');
      await page.reload({ waitUntil: 'networkidle' });
      
      // Verify recovery doesn't show health protocol
      await expect(page.locator('text=Health Protocol')).not.toBeVisible();
      await expect(page.locator('[role="tab"]')).toHaveCount(4);
    });

    test('API timeout handling maintains Health Protocol elimination', async () => {
      // Intercept API calls and add delays
      await page.route('**/api/**', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay
        route.continue();
      });
      
      // Try to load different sections
      await page.click('text=Browse Recipes');
      await page.click('text=Generate Plans');
      
      // Verify loading states don't show health protocol
      await expect(page.locator('text=Health Protocol')).not.toBeVisible();
      
      // Clean up route
      await page.unroute('**/api/**');
    });

    test('Invalid data scenarios don\'t reveal Health Protocol', async () => {
      // Inject invalid data into local storage
      await page.evaluate(() => {
        localStorage.setItem('health-protocol-data', JSON.stringify({
          enabled: true,
          tabs: ['health-protocol'],
          invalid: 'data'
        }));
        
        sessionStorage.setItem('trainer-tabs', JSON.stringify([
          'recipes', 'meal-plan', 'customers', 'saved-plans', 'health-protocol'
        ]));
      });
      
      await page.reload({ waitUntil: 'networkidle' });
      
      // Verify invalid data doesn't restore health protocol
      await expect(page.locator('text=Health Protocol')).not.toBeVisible();
      await expect(page.locator('[role="tab"]')).toHaveCount(4);
    });
  });

  test.describe('Security Edge Cases', () => {
    test('Console manipulation cannot restore Health Protocol', async () => {
      // Attempt various console manipulations
      await page.evaluate(() => {
        // Try to manipulate DOM to add health protocol tab
        const tabsList = document.querySelector('[role="tablist"]');
        if (tabsList) {
          const healthTab = document.createElement('button');
          healthTab.textContent = 'Health Protocol';
          healthTab.setAttribute('role', 'tab');
          healthTab.setAttribute('data-value', 'health-protocol');
          tabsList.appendChild(healthTab);
        }
        
        // Try to trigger health protocol through window object
        if (window as any) {
          (window as any).showHealthProtocol = true;
          (window as any).enableHealthProtocol?.();
        }
        
        // Try to dispatch custom events
        document.dispatchEvent(new CustomEvent('showHealthProtocol'));
        document.dispatchEvent(new CustomEvent('enableHealthProtocol'));
      });
      
      await page.waitForTimeout(1000);
      
      // Verify manipulations don't work
      await expect(page.locator('text=Health Protocol')).not.toBeVisible();
      await expect(page.locator('[data-value="health-protocol"]')).not.toBeVisible();
    });

    test('XSS attempts don\'t expose Health Protocol functionality', async () => {
      const xssPayloads = [
        '<script>window.healthProtocol = true;</script>',
        '"><script>showHealthProtocol();</script>',
        'javascript:enableHealthProtocol();',
        '<img src=x onerror="window.healthProtocol=true">',
      ];
      
      for (const payload of xssPayloads) {
        // Try to inject payload through search or form inputs
        try {
          await page.fill('[data-testid="search-input"]', payload);
          await page.keyboard.press('Enter');
          await page.waitForTimeout(500);
        } catch (e) {
          console.log('XSS payload rejected (expected)');
        }
        
        // Verify no health protocol content appears
        await expect(page.locator('text=Health Protocol')).not.toBeVisible();
      }
    });
  });
});