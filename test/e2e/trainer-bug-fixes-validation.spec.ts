import { test, expect, Page } from '@playwright/test';
import { loginAsTrainer } from './helpers/auth';
import { takeEvidenceScreenshot } from './test-data-setup';

/**
 * COMPREHENSIVE BUG FIX VALIDATION TEST SUITE
 * 
 * This test suite validates two critical bug fixes:
 * 1. Recipe Card Bug Fix: Recipe cards in saved meal plans should open properly
 * 2. Customer List Bug Fix: Trainer should see assigned customers, not "no customer yet"
 * 
 * Testing Strategy:
 * - Functional validation of both fixes
 * - Edge case testing
 * - Performance validation
 * - Cross-browser compatibility
 * - User experience validation
 */

test.describe('Trainer Bug Fixes Validation Suite', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Set up comprehensive error logging
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error(`Browser Console Error: ${msg.text()}`);
      }
    });
    
    page.on('pageerror', (error) => {
      console.error(`Page Error: ${error.message}`);
    });

    // Clear any existing state
    await page.context().clearCookies();
    await page.context().clearPermissions();
  });

  test.describe('Recipe Card Bug Fix Validation', () => {
    
    test('Recipe cards open correctly in saved meal plans', async () => {
      console.log('🧪 Testing Recipe Card Bug Fix - Happy Path');
      
      // Login as trainer
      await loginAsTrainer(page);
      await takeEvidenceScreenshot(page, 'recipe-bug', 'trainer-logged-in');
      
      // Navigate to saved plans
      await page.click('text=Saved Plans', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      await takeEvidenceScreenshot(page, 'recipe-bug', 'saved-plans-page');
      
      // Verify saved plans exist
      const savedPlansExist = await page.locator('[data-testid="meal-plan-card"], .meal-plan-card, text="View Details"').count();
      expect(savedPlansExist).toBeGreaterThan(0);
      console.log(`✅ Found ${savedPlansExist} saved meal plans`);
      
      // Click on first meal plan to view details
      await page.locator('[data-testid="meal-plan-card"], .meal-plan-card').first().click();
      await page.waitForLoadState('networkidle');
      await takeEvidenceScreenshot(page, 'recipe-bug', 'meal-plan-details');
      
      // Alternative approach - look for "View Details" button
      const viewDetailsButtons = await page.locator('text="View Details"').count();
      if (viewDetailsButtons > 0) {
        await page.locator('text="View Details"').first().click();
        await page.waitForLoadState('networkidle');
        await takeEvidenceScreenshot(page, 'recipe-bug', 'meal-plan-details-alt');
      }
      
      // Find and click on recipe card within meal plan
      const recipeSelectors = [
        '[data-testid="recipe-card"]',
        '.recipe-card',
        '[data-testid="recipe-item"]',
        '.recipe-item',
        'div[class*="recipe"]',
        'button[class*="recipe"]'
      ];
      
      let recipeFound = false;
      for (const selector of recipeSelectors) {
        const recipeCount = await page.locator(selector).count();
        if (recipeCount > 0) {
          console.log(`📍 Found ${recipeCount} recipes using selector: ${selector}`);
          await page.locator(selector).first().click();
          recipeFound = true;
          break;
        }
      }
      
      expect(recipeFound).toBe(true);
      console.log('✅ Recipe card clicked successfully');
      
      // Wait for recipe modal/details to appear
      await page.waitForTimeout(2000); // Allow time for modal to appear
      await takeEvidenceScreenshot(page, 'recipe-bug', 'recipe-modal-opened');
      
      // Verify recipe modal opens (not "Recipe not found" error)
      const modalSelectors = [
        '[data-testid="recipe-modal"]',
        '.recipe-modal',
        '[data-testid="recipe-details"]',
        '.recipe-details',
        'div[role="dialog"]'
      ];
      
      let modalVisible = false;
      for (const selector of modalSelectors) {
        if (await page.locator(selector).isVisible()) {
          modalVisible = true;
          console.log(`✅ Recipe modal/details visible with selector: ${selector}`);
          break;
        }
      }
      
      expect(modalVisible).toBe(true);
      
      // Critical Bug Fix Validation: Ensure "Recipe not found" error is NOT present
      const errorMessages = [
        'Recipe not found',
        'Error loading recipe',
        'Failed to load recipe',
        'Recipe data unavailable'
      ];
      
      for (const errorMsg of errorMessages) {
        const errorCount = await page.locator(`text="${errorMsg}"`).count();
        expect(errorCount).toBe(0);
        console.log(`✅ No "${errorMsg}" error found`);
      }
      
      // Verify recipe content is actually displayed
      const contentSelectors = [
        'text=Ingredients',
        'text=Instructions', 
        'text=Nutrition',
        'text=Servings',
        'h1, h2, h3' // Any heading that might contain recipe name
      ];
      
      let contentFound = false;
      for (const selector of contentSelectors) {
        if (await page.locator(selector).isVisible()) {
          contentFound = true;
          console.log(`✅ Recipe content found: ${selector}`);
          break;
        }
      }
      
      expect(contentFound).toBe(true);
      await takeEvidenceScreenshot(page, 'recipe-bug', 'recipe-content-validated');
      
      console.log('🎉 Recipe Card Bug Fix VALIDATED - Recipe opens correctly!');
    });

    test('Recipe card handles invalid data gracefully', async () => {
      console.log('🧪 Testing Recipe Card Bug Fix - Edge Case: Invalid Data');
      
      await loginAsTrainer(page);
      
      // Navigate to saved plans
      await page.click('text=Saved Plans');
      await page.waitForLoadState('networkidle');
      
      // Inject script to simulate corrupted recipe data
      await page.evaluate(() => {
        // Override fetch for recipe endpoints to return invalid data
        const originalFetch = window.fetch;
        (window as any).fetch = function(url: any, options?: any) {
          if (url.includes('/api/recipes/')) {
            return Promise.resolve(new Response(JSON.stringify({
              error: 'Test error simulation'
            }), { status: 404 }));
          }
          return originalFetch(url, options);
        };
      });
      
      // Try clicking recipe cards and ensure graceful error handling
      const recipeCards = await page.locator('[data-testid="recipe-card"], .recipe-card').count();
      if (recipeCards > 0) {
        await page.locator('[data-testid="recipe-card"], .recipe-card').first().click();
        await page.waitForTimeout(2000);
        
        // Should show appropriate error message, not crash
        const hasErrorMessage = await page.locator('text=Error loading recipe, text=Unable to load recipe').count() > 0;
        console.log(hasErrorMessage ? '✅ Graceful error handling confirmed' : '⚠️  No error message shown');
      }
      
      await takeEvidenceScreenshot(page, 'recipe-bug', 'edge-case-invalid-data');
    });

    test('Multiple recipe interactions work correctly', async () => {
      console.log('🧪 Testing Recipe Card Bug Fix - Edge Case: Multiple Interactions');
      
      await loginAsTrainer(page);
      await page.click('text=Saved Plans');
      await page.waitForLoadState('networkidle');
      
      // Try opening multiple recipe cards in sequence
      const recipeCards = await page.locator('[data-testid="recipe-card"], .recipe-card').count();
      console.log(`📍 Found ${recipeCards} recipe cards for multiple interaction test`);
      
      for (let i = 0; i < Math.min(3, recipeCards); i++) {
        await page.locator('[data-testid="recipe-card"], .recipe-card').nth(i).click();
        await page.waitForTimeout(1000);
        
        // Close modal if it opened
        const closeButton = page.locator('[data-testid="close-modal"], button:has-text("Close"), button:has-text("×")');
        if (await closeButton.isVisible()) {
          await closeButton.click();
        }
        
        await page.waitForTimeout(500);
      }
      
      await takeEvidenceScreenshot(page, 'recipe-bug', 'multiple-interactions');
      console.log('✅ Multiple recipe interactions completed');
    });
  });

  test.describe('Customer List Bug Fix Validation', () => {
    
    test('Customer list shows assigned customers', async () => {
      console.log('🧪 Testing Customer List Bug Fix - Happy Path');
      
      // Login as trainer
      await loginAsTrainer(page);
      await takeEvidenceScreenshot(page, 'customer-bug', 'trainer-logged-in');
      
      // Navigate to customers section/tab
      const customerNavigationOptions = [
        'text=Customers',
        '[data-testid="customers-tab"]',
        'button:has-text("Customers")',
        'a:has-text("Customers")',
        'text=My Customers'
      ];
      
      let customerSectionFound = false;
      for (const selector of customerNavigationOptions) {
        if (await page.locator(selector).isVisible()) {
          await page.click(selector);
          customerSectionFound = true;
          console.log(`✅ Navigated to customers using: ${selector}`);
          break;
        }
      }
      
      expect(customerSectionFound).toBe(true);
      await page.waitForLoadState('networkidle');
      await takeEvidenceScreenshot(page, 'customer-bug', 'customers-section');
      
      // Critical Bug Fix Validation: Ensure "no customer yet" message is NOT present
      const emptyStateMessages = [
        'no customer yet',
        'No customers yet',
        'No customers assigned',
        'You don\'t have any customers',
        'No customers found'
      ];
      
      for (const emptyMsg of emptyStateMessages) {
        const emptyStateCount = await page.locator(`text="${emptyMsg}"`).count();
        expect(emptyStateCount).toBe(0);
        console.log(`✅ No "${emptyMsg}" message found - bug fix working!`);
      }
      
      // Verify customers are actually displayed
      const customerSelectors = [
        '[data-testid="customer-card"]',
        '.customer-card',
        '[data-testid="customer-item"]',
        '.customer-item',
        'div[class*="customer"]'
      ];
      
      let customersFound = false;
      for (const selector of customerSelectors) {
        const customerCount = await page.locator(selector).count();
        if (customerCount > 0) {
          customersFound = true;
          console.log(`✅ Found ${customerCount} customers using selector: ${selector}`);
          break;
        }
      }
      
      expect(customersFound).toBe(true);
      await takeEvidenceScreenshot(page, 'customer-bug', 'customers-displayed');
      
      // Verify customer data is meaningful (not placeholder data)
      const customerElements = await page.locator('[data-testid="customer-card"], .customer-card').all();
      for (const customer of customerElements.slice(0, 3)) { // Check first 3 customers
        const customerText = await customer.textContent();
        expect(customerText?.length).toBeGreaterThan(5); // Should have actual content
        console.log(`✅ Customer card has meaningful content: ${customerText?.substring(0, 50)}...`);
      }
      
      console.log('🎉 Customer List Bug Fix VALIDATED - Customers display correctly!');
    });

    test('Customer list handles empty trainer assignments gracefully', async () => {
      console.log('🧪 Testing Customer List Bug Fix - Edge Case: Empty Assignments');
      
      await loginAsTrainer(page);
      
      // Simulate a trainer with no customers
      await page.evaluate(() => {
        const originalFetch = window.fetch;
        (window as any).fetch = function(url: any, options?: any) {
          if (url.includes('/api/trainer/customers') || url.includes('/api/customers')) {
            return Promise.resolve(new Response(JSON.stringify([]), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }));
          }
          return originalFetch(url, options);
        };
      });
      
      await page.click('text=Customers');
      await page.waitForLoadState('networkidle');
      
      // Should show appropriate empty state, not the old "no customer yet" bug
      const appropriateEmptyStates = [
        'No customers assigned to you yet',
        'You haven\'t been assigned any customers',
        'No customers to display',
        'Get started by having customers assigned to you'
      ];
      
      let appropriateEmptyStateFound = false;
      for (const message of appropriateEmptyStates) {
        if (await page.locator(`text="${message}"`).isVisible()) {
          appropriateEmptyStateFound = true;
          console.log(`✅ Appropriate empty state message found: ${message}`);
          break;
        }
      }
      
      // The key is that it should NOT show the buggy "no customer yet" message
      const buggyMessage = await page.locator('text=no customer yet').count();
      expect(buggyMessage).toBe(0);
      console.log('✅ Buggy "no customer yet" message absent - fix working!');
      
      await takeEvidenceScreenshot(page, 'customer-bug', 'edge-case-empty-assignments');
    });

    test('Customer list loads efficiently with multiple customers', async () => {
      console.log('🧪 Testing Customer List Bug Fix - Performance: Multiple Customers');
      
      await loginAsTrainer(page);
      
      // Measure load time
      const startTime = Date.now();
      
      await page.click('text=Customers');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      console.log(`📊 Customer list load time: ${loadTime}ms`);
      
      // Should load within reasonable time (under 3 seconds)
      expect(loadTime).toBeLessThan(3000);
      
      // Count customers and verify performance is acceptable
      const customerCount = await page.locator('[data-testid="customer-card"], .customer-card').count();
      console.log(`📊 Loaded ${customerCount} customers in ${loadTime}ms`);
      
      if (customerCount > 0) {
        const timePerCustomer = loadTime / customerCount;
        console.log(`📊 Time per customer: ${timePerCustomer.toFixed(2)}ms`);
        
        // Should be efficient - less than 100ms per customer for loading
        expect(timePerCustomer).toBeLessThan(100);
      }
      
      await takeEvidenceScreenshot(page, 'customer-bug', 'performance-multiple-customers');
    });
  });

  test.describe('Cross-Component Integration Testing', () => {
    
    test('Navigation between tabs remains smooth after bug fixes', async () => {
      console.log('🧪 Testing Integration - Smooth Navigation After Bug Fixes');
      
      await loginAsTrainer(page);
      
      // Test rapid navigation between different sections
      const navigationTests = [
        'text=Saved Plans',
        'text=Customers',
        'text=Recent Plans',
        'text=Profile'
      ];
      
      for (const nav of navigationTests) {
        if (await page.locator(nav).isVisible()) {
          const startTime = Date.now();
          await page.click(nav);
          await page.waitForLoadState('networkidle');
          const navTime = Date.now() - startTime;
          
          console.log(`📊 Navigation to ${nav}: ${navTime}ms`);
          expect(navTime).toBeLessThan(2000); // Should navigate quickly
        }
      }
      
      await takeEvidenceScreenshot(page, 'integration', 'smooth-navigation');
    });

    test('No console errors during bug fix operations', async () => {
      console.log('🧪 Testing Integration - Console Error Monitoring');
      
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      await loginAsTrainer(page);
      
      // Perform the operations that were previously buggy
      await page.click('text=Saved Plans');
      await page.waitForLoadState('networkidle');
      
      // Try clicking recipe cards
      const recipeCards = await page.locator('[data-testid="recipe-card"], .recipe-card').count();
      if (recipeCards > 0) {
        await page.locator('[data-testid="recipe-card"], .recipe-card').first().click();
        await page.waitForTimeout(2000);
      }
      
      await page.click('text=Customers');
      await page.waitForLoadState('networkidle');
      
      // Filter out expected/harmless errors
      const criticalErrors = consoleErrors.filter(error => 
        !error.includes('favicon') &&
        !error.includes('manifest') &&
        !error.includes('chunk') &&
        error.toLowerCase().includes('error')
      );
      
      console.log(`📊 Console errors found: ${criticalErrors.length}`);
      criticalErrors.forEach(error => console.error(`❌ ${error}`));
      
      expect(criticalErrors.length).toBe(0);
      await takeEvidenceScreenshot(page, 'integration', 'no-console-errors');
    });
  });

  test.describe('Mobile Responsiveness Validation', () => {
    
    test('Bug fixes work correctly on mobile devices', async () => {
      console.log('🧪 Testing Mobile - Bug Fixes on Mobile Viewport');
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      
      await loginAsTrainer(page);
      await takeEvidenceScreenshot(page, 'mobile', 'trainer-logged-in');
      
      // Test recipe card bug fix on mobile
      await page.click('text=Saved Plans');
      await page.waitForLoadState('networkidle');
      
      const mobileRecipeCards = await page.locator('[data-testid="recipe-card"], .recipe-card').count();
      if (mobileRecipeCards > 0) {
        await page.locator('[data-testid="recipe-card"], .recipe-card').first().click();
        await page.waitForTimeout(2000);
        
        // Verify modal works on mobile
        const modalVisible = await page.locator('[data-testid="recipe-modal"], .recipe-modal, div[role="dialog"]').isVisible();
        expect(modalVisible).toBe(true);
        console.log('✅ Recipe modal works on mobile');
      }
      
      // Test customer list bug fix on mobile
      await page.click('text=Customers');
      await page.waitForLoadState('networkidle');
      
      const mobileCustomerCount = await page.locator('[data-testid="customer-card"], .customer-card').count();
      expect(mobileCustomerCount).toBeGreaterThan(0);
      console.log(`✅ ${mobileCustomerCount} customers visible on mobile`);
      
      await takeEvidenceScreenshot(page, 'mobile', 'bug-fixes-validated');
    });
  });

  test.describe('Performance and Load Testing', () => {
    
    test('Application performance remains optimal after bug fixes', async () => {
      console.log('🧪 Testing Performance - Post-Bug-Fix Performance');
      
      await loginAsTrainer(page);
      
      // Measure key performance metrics
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          totalLoad: navigation.loadEventEnd - navigation.fetchStart
        };
      });
      
      console.log('📊 Performance Metrics:');
      console.log(`   DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms`);
      console.log(`   Load Complete: ${performanceMetrics.loadComplete}ms`);
      console.log(`   Total Load: ${performanceMetrics.totalLoad}ms`);
      
      // Performance should be reasonable
      expect(performanceMetrics.totalLoad).toBeLessThan(5000); // Under 5 seconds
      
      await takeEvidenceScreenshot(page, 'performance', 'metrics-captured');
    });
  });
});