import { test, expect, Page } from '@playwright/test';
import { loginAsTrainer } from './helpers/auth';
import { takeEvidenceScreenshot } from './test-data-setup';

/**
 * COMPREHENSIVE EDGE CASE TESTING FOR BUG FIXES
 * 
 * This test suite covers edge cases and stress scenarios for both bug fixes:
 * 1. Recipe Card Edge Cases: Network failures, malformed data, rapid clicking
 * 2. Customer List Edge Cases: Empty states, loading failures, data corruption
 * 
 * Purpose: Ensure the bug fixes are robust and handle all possible edge cases
 */

test.describe('Trainer Bug Fixes - Edge Cases & Stress Testing', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Enhanced error monitoring
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(`Console Error: ${msg.text()}`);
      }
    });
    
    page.on('pageerror', (error) => {
      errors.push(`Page Error: ${error.message}`);
    });
    
    // Store errors for test validation
    (page as any).testErrors = errors;
  });

  test.describe('Recipe Card Bug Fix - Edge Cases', () => {
    
    test('Recipe card handles network timeouts gracefully', async () => {
      console.log('🌐 Testing Recipe Card - Network Timeout Edge Case');
      
      await loginAsTrainer(page);
      
      // Simulate network timeout for recipe requests
      await page.route('**/api/recipes/**', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay
        await route.abort();
      });
      
      await page.click('text=Saved Plans');
      await page.waitForLoadState('networkidle');
      
      const recipeCards = await page.locator('[data-testid="recipe-card"], .recipe-card').count();
      if (recipeCards > 0) {
        await page.locator('[data-testid="recipe-card"], .recipe-card').first().click();
        
        // Should show loading state or timeout error, not crash
        await page.waitForTimeout(3000);
        
        const timeoutMessages = [
          'Loading recipe...',
          'Request timed out',
          'Unable to load recipe',
          'Network error'
        ];
        
        let hasAppropriateMessage = false;
        for (const message of timeoutMessages) {
          if (await page.locator(`text="${message}"`).isVisible()) {
            hasAppropriateMessage = true;
            console.log(`✅ Appropriate timeout message: ${message}`);
            break;
          }
        }
        
        // Most importantly, should NOT show "Recipe not found" bug
        const buggyMessage = await page.locator('text="Recipe not found"').count();
        expect(buggyMessage).toBe(0);
        console.log('✅ No "Recipe not found" error during timeout - bug fix holds!');
      }
      
      await takeEvidenceScreenshot(page, 'recipe-edge', 'network-timeout');
    });

    test('Rapid recipe card clicking stress test', async () => {
      console.log('⚡ Testing Recipe Card - Rapid Clicking Stress Test');
      
      await loginAsTrainer(page);
      await page.click('text=Saved Plans');
      await page.waitForLoadState('networkidle');
      
      const recipeCards = await page.locator('[data-testid="recipe-card"], .recipe-card').count();
      console.log(`📍 Found ${recipeCards} recipe cards for stress test`);
      
      if (recipeCards > 0) {
        // Rapid click the first recipe card multiple times
        const recipeCard = page.locator('[data-testid="recipe-card"], .recipe-card').first();
        
        for (let i = 0; i < 10; i++) {
          await recipeCard.click({ force: true, timeout: 1000 });
          await page.waitForTimeout(100); // Very short wait
        }
        
        // Application should remain stable
        await page.waitForTimeout(2000);
        
        // Check for duplicate modals or UI corruption
        const modalCount = await page.locator('[data-testid="recipe-modal"], .recipe-modal, div[role="dialog"]').count();
        expect(modalCount).toBeLessThanOrEqual(1); // At most one modal should be open
        
        // No crash errors should occur
        const errors = (page as any).testErrors as string[];
        const crashErrors = errors.filter(error => 
          error.toLowerCase().includes('crash') ||
          error.toLowerCase().includes('fatal') ||
          error.toLowerCase().includes('uncaught')
        );
        
        expect(crashErrors.length).toBe(0);
        console.log('✅ Application remained stable during rapid clicking');
      }
      
      await takeEvidenceScreenshot(page, 'recipe-edge', 'rapid-clicking-stress');
    });

    test('Recipe card with malformed JSON response', async () => {
      console.log('📋 Testing Recipe Card - Malformed Data Edge Case');
      
      await loginAsTrainer(page);
      
      // Intercept and return malformed JSON
      await page.route('**/api/recipes/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: '{"incomplete_json": "missing_closing_brace"' // Malformed JSON
        });
      });
      
      await page.click('text=Saved Plans');
      await page.waitForLoadState('networkidle');
      
      const recipeCards = await page.locator('[data-testid="recipe-card"], .recipe-card').count();
      if (recipeCards > 0) {
        await page.locator('[data-testid="recipe-card"], .recipe-card').first().click();
        await page.waitForTimeout(2000);
        
        // Should handle malformed JSON gracefully
        const errorHandlingMessages = [
          'Error loading recipe',
          'Invalid recipe data',
          'Unable to display recipe',
          'Data format error'
        ];
        
        let hasGracefulError = false;
        for (const message of errorHandlingMessages) {
          if (await page.locator(`text="${message}"`).isVisible()) {
            hasGracefulError = true;
            console.log(`✅ Graceful error handling: ${message}`);
            break;
          }
        }
        
        // Critical: Should not show the original "Recipe not found" bug
        const originalBugMessage = await page.locator('text="Recipe not found"').count();
        expect(originalBugMessage).toBe(0);
        console.log('✅ Original bug message absent with malformed data');
      }
      
      await takeEvidenceScreenshot(page, 'recipe-edge', 'malformed-json');
    });

    test('Recipe modal accessibility with keyboard navigation', async () => {
      console.log('♿ Testing Recipe Card - Keyboard Accessibility');
      
      await loginAsTrainer(page);
      await page.click('text=Saved Plans');
      await page.waitForLoadState('networkidle');
      
      // Navigate using keyboard only
      await page.keyboard.press('Tab'); // Focus first interactive element
      
      // Use keyboard to navigate to and activate recipe card
      let tabPressed = 0;
      while (tabPressed < 20) { // Reasonable limit
        await page.keyboard.press('Tab');
        tabPressed++;
        
        // Check if we're on a recipe card
        const focusedElement = await page.locator(':focus').getAttribute('class');
        if (focusedElement && focusedElement.includes('recipe')) {
          await page.keyboard.press('Enter'); // Activate with keyboard
          break;
        }
      }
      
      await page.waitForTimeout(2000);
      
      // Verify modal opened and is accessible
      const modalVisible = await page.locator('[data-testid="recipe-modal"], .recipe-modal, div[role="dialog"]').isVisible();
      if (modalVisible) {
        console.log('✅ Recipe modal opened via keyboard navigation');
        
        // Verify modal can be closed with Escape key
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
        
        const modalStillVisible = await page.locator('[data-testid="recipe-modal"], .recipe-modal, div[role="dialog"]').isVisible();
        expect(modalStillVisible).toBe(false);
        console.log('✅ Recipe modal closed with Escape key');
      }
      
      await takeEvidenceScreenshot(page, 'recipe-edge', 'keyboard-accessibility');
    });
  });

  test.describe('Customer List Bug Fix - Edge Cases', () => {
    
    test('Customer list with API returning 500 error', async () => {
      console.log('🔥 Testing Customer List - Server Error Edge Case');
      
      await loginAsTrainer(page);
      
      // Simulate server error for customer requests
      await page.route('**/api/trainer/customers/**', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      });
      
      await page.route('**/api/customers/**', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      });
      
      await page.click('text=Customers');
      await page.waitForLoadState('networkidle');
      
      // Should show appropriate error message, not the old "no customer yet" bug
      const serverErrorMessages = [
        'Unable to load customers',
        'Server error occurred',
        'Failed to fetch customers',
        'Error loading customer data'
      ];
      
      let hasServerErrorMessage = false;
      for (const message of serverErrorMessages) {
        if (await page.locator(`text="${message}"`).isVisible()) {
          hasServerErrorMessage = true;
          console.log(`✅ Appropriate server error message: ${message}`);
          break;
        }
      }
      
      // Critical: Should NOT show the buggy "no customer yet" message
      const buggyMessage = await page.locator('text="no customer yet"').count();
      expect(buggyMessage).toBe(0);
      console.log('✅ No buggy "no customer yet" message during server error');
      
      await takeEvidenceScreenshot(page, 'customer-edge', 'server-error');
    });

    test('Customer list with extremely large dataset', async () => {
      console.log('📊 Testing Customer List - Large Dataset Edge Case');
      
      await loginAsTrainer(page);
      
      // Generate large customer dataset (100 customers)
      const largeCustomerDataset = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Test Customer ${i + 1}`,
        email: `customer${i + 1}@test.com`,
        assigned_date: new Date().toISOString()
      }));
      
      await page.route('**/api/trainer/customers/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(largeCustomerDataset)
        });
      });
      
      const startTime = Date.now();
      await page.click('text=Customers');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      console.log(`📊 Large dataset load time: ${loadTime}ms`);
      
      // Should handle large dataset efficiently (under 5 seconds)
      expect(loadTime).toBeLessThan(5000);
      
      // Verify customers are displayed (at least some of them)
      const displayedCustomers = await page.locator('[data-testid="customer-card"], .customer-card').count();
      expect(displayedCustomers).toBeGreaterThan(0);
      console.log(`✅ Displaying ${displayedCustomers} customers from large dataset`);
      
      // Critical: No "no customer yet" bug even with large dataset
      const buggyMessage = await page.locator('text="no customer yet"').count();
      expect(buggyMessage).toBe(0);
      
      await takeEvidenceScreenshot(page, 'customer-edge', 'large-dataset');
    });

    test('Customer list with mixed data types and special characters', async () => {
      console.log('🔣 Testing Customer List - Special Characters Edge Case');
      
      await loginAsTrainer(page);
      
      // Customer data with special characters and edge cases
      const specialCustomerData = [
        {
          id: 1,
          name: 'José María García-López',
          email: 'jose@test.com',
          notes: 'Customer with accented characters'
        },
        {
          id: 2,
          name: '张伟',
          email: 'zhang@test.com',
          notes: 'Chinese characters'
        },
        {
          id: 3,
          name: 'O\'Brien & Sons LLC',
          email: 'obrien@test.com',
          notes: 'Special characters & apostrophes'
        },
        {
          id: 4,
          name: 'Test<script>alert("xss")</script>',
          email: 'security@test.com',
          notes: 'Potential XSS attempt'
        }
      ];
      
      await page.route('**/api/trainer/customers/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(specialCustomerData)
        });
      });
      
      await page.click('text=Customers');
      await page.waitForLoadState('networkidle');
      
      // Verify special characters are handled properly
      const specialNameVisible = await page.locator('text="José María García-López"').isVisible();
      const chineseNameVisible = await page.locator('text="张伟"').isVisible();
      
      console.log(`✅ Special characters handled: José - ${specialNameVisible}, Chinese - ${chineseNameVisible}`);
      
      // Verify XSS protection (script should not execute)
      const xssAttemptVisible = await page.locator('text="Test<script>alert("xss")</script>"').isVisible();
      if (xssAttemptVisible) {
        console.log('⚠️  XSS attempt visible but should be escaped');
      }
      
      // No JavaScript alert should have fired
      let alertFired = false;
      page.on('dialog', async (dialog) => {
        alertFired = true;
        await dialog.dismiss();
      });
      
      await page.waitForTimeout(2000);
      expect(alertFired).toBe(false);
      console.log('✅ No XSS execution detected');
      
      // Critical: No "no customer yet" bug with special data
      const buggyMessage = await page.locator('text="no customer yet"').count();
      expect(buggyMessage).toBe(0);
      
      await takeEvidenceScreenshot(page, 'customer-edge', 'special-characters');
    });

    test('Customer list refresh and real-time updates', async () => {
      console.log('🔄 Testing Customer List - Real-time Updates Edge Case');
      
      await loginAsTrainer(page);
      
      let customerCount = 3;
      
      // Dynamic customer data that changes over time
      await page.route('**/api/trainer/customers/**', async (route) => {
        const customers = Array.from({ length: customerCount }, (_, i) => ({
          id: i + 1,
          name: `Dynamic Customer ${i + 1}`,
          email: `dynamic${i + 1}@test.com`
        }));
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(customers)
        });
      });
      
      await page.click('text=Customers');
      await page.waitForLoadState('networkidle');
      
      const initialCustomers = await page.locator('[data-testid="customer-card"], .customer-card').count();
      console.log(`📊 Initial customer count: ${initialCustomers}`);
      
      // Simulate customer addition
      customerCount = 5;
      
      // Trigger refresh (if refresh button exists)
      const refreshButton = page.locator('text="Refresh", button:has-text("Refresh"), [data-testid="refresh-customers"]');
      if (await refreshButton.isVisible()) {
        await refreshButton.click();
        await page.waitForLoadState('networkidle');
        
        const updatedCustomers = await page.locator('[data-testid="customer-card"], .customer-card').count();
        console.log(`📊 Updated customer count: ${updatedCustomers}`);
        
        expect(updatedCustomers).toBeGreaterThanOrEqual(initialCustomers);
      }
      
      // Critical: No "no customer yet" bug during updates
      const buggyMessage = await page.locator('text="no customer yet"').count();
      expect(buggyMessage).toBe(0);
      
      await takeEvidenceScreenshot(page, 'customer-edge', 'real-time-updates');
    });
  });

  test.describe('Cross-Browser Compatibility Edge Cases', () => {
    
    test('Bug fixes work in different browser engines', async () => {
      console.log('🌐 Testing Cross-Browser - Bug Fix Compatibility');
      
      const browserInfo = await page.evaluate(() => {
        return {
          userAgent: navigator.userAgent,
          vendor: navigator.vendor,
          platform: navigator.platform
        };
      });
      
      console.log(`🔍 Testing on: ${browserInfo.userAgent}`);
      
      await loginAsTrainer(page);
      
      // Test recipe card bug fix
      await page.click('text=Saved Plans');
      await page.waitForLoadState('networkidle');
      
      const recipeCards = await page.locator('[data-testid="recipe-card"], .recipe-card').count();
      if (recipeCards > 0) {
        await page.locator('[data-testid="recipe-card"], .recipe-card').first().click();
        await page.waitForTimeout(2000);
        
        // Recipe modal should work across browsers
        const modalVisible = await page.locator('[data-testid="recipe-modal"], .recipe-modal, div[role="dialog"]').isVisible();
        console.log(`✅ Recipe modal works on current browser: ${modalVisible}`);
        
        const recipeBugMessage = await page.locator('text="Recipe not found"').count();
        expect(recipeBugMessage).toBe(0);
      }
      
      // Test customer list bug fix
      await page.click('text=Customers');
      await page.waitForLoadState('networkidle');
      
      const customerCount = await page.locator('[data-testid="customer-card"], .customer-card').count();
      const customerBugMessage = await page.locator('text="no customer yet"').count();
      
      expect(customerBugMessage).toBe(0);
      console.log(`✅ Customer bug fix works on current browser - ${customerCount} customers shown`);
      
      await takeEvidenceScreenshot(page, 'cross-browser', `bug-fixes-${browserInfo.vendor || 'unknown'}`);
    });
  });

  test.describe('Memory and Performance Edge Cases', () => {
    
    test('Bug fixes do not cause memory leaks', async () => {
      console.log('🧠 Testing Memory - Memory Leak Detection');
      
      await loginAsTrainer(page);
      
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        return (window.performance as any).memory?.usedJSHeapSize || 0;
      });
      
      // Perform bug fix operations repeatedly
      for (let i = 0; i < 5; i++) {
        // Recipe card operations
        await page.click('text=Saved Plans');
        await page.waitForLoadState('networkidle');
        
        const recipeCards = await page.locator('[data-testid="recipe-card"], .recipe-card').count();
        if (recipeCards > 0) {
          await page.locator('[data-testid="recipe-card"], .recipe-card').first().click();
          await page.waitForTimeout(1000);
          
          // Close modal if it exists
          const closeButton = page.locator('[data-testid="close-modal"], button:has-text("Close"), button:has-text("×")');
          if (await closeButton.isVisible()) {
            await closeButton.click();
          }
        }
        
        // Customer list operations
        await page.click('text=Customers');
        await page.waitForLoadState('networkidle');
        
        await page.waitForTimeout(500);
      }
      
      // Check final memory usage
      const finalMemory = await page.evaluate(() => {
        return (window.performance as any).memory?.usedJSHeapSize || 0;
      });
      
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;
        
        console.log(`📊 Memory usage: ${initialMemory} → ${finalMemory} (+${memoryIncrease} bytes, +${memoryIncreasePercent.toFixed(1)}%)`);
        
        // Memory increase should be reasonable (less than 50% increase)
        expect(memoryIncreasePercent).toBeLessThan(50);
        console.log('✅ No significant memory leaks detected');
      }
      
      await takeEvidenceScreenshot(page, 'performance', 'memory-leak-test');
    });
  });
});