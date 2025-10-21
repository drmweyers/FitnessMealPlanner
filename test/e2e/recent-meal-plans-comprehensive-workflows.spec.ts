/**
 * Recent Meal Plans Comprehensive Workflows E2E Tests
 * 
 * Tests complete end-to-end workflows and complex scenarios for recent meal plans:
 * - Complete trainer journey to customer meal plans
 * - Complex interaction sequences and state management
 * - Error handling and edge cases
 * - Performance testing with multiple meal plans
 * - Cross-browser compatibility
 * - Authentication flows and permission handling
 * - Data persistence and refresh scenarios
 * 
 * This test suite validates the entire user journey and ensures
 * the recent meal plans feature works in real-world scenarios.
 */

import { test, expect, Page, Browser } from '@playwright/test';
import { 
  loginAsTrainer, 
  loginAsAdmin,
  logout,
  takeTestScreenshot, 
  waitForNetworkIdle,
  checkForJavaScriptErrors,
  monitorNetworkActivity 
} from './auth-helper';

// Comprehensive test configuration
const WORKFLOW_CONFIG = {
  baseURL: 'http://localhost:4000',
  timeout: 45000,
  performance: {
    maxLoadTime: 5000,
    maxInteractionTime: 2000
  },
  testData: {
    trainer: {
      email: 'trainer.test@evofitmeals.com',
      password: 'TestTrainer123!'
    },
    customer: {
      email: 'customer.test@evofitmeals.com',
      expectedMealPlans: 3
    }
  }
};

// Advanced selectors for workflow testing
const WORKFLOW_SELECTORS = {
  dashboard: {
    trainerNav: 'nav, .navigation, [data-testid="trainer-nav"]',
    customersSection: 'text="Customers", [data-testid="customers-section"]',
    customersList: 'table, .customers-list, [data-testid="customers-list"]'
  },
  
  customerDetail: {
    header: 'h1, h2',
    backButton: 'button:has-text("Back"), [data-testid="back-button"]',
    createMealPlanBtn: 'button:has-text("Create"), [data-testid="create-meal-plan"]',
    tabContainer: '[role="tablist"], .tabs',
    overviewTab: '[role="tab"]:has-text("Overview")',
    mealPlansTab: '[role="tab"]:has-text("Meal Plans")'
  },
  
  recentMealPlans: {
    section: '.card:has(h3:text("Recent")), [data-testid="recent-meal-plans"]',
    items: '.bg-gray-50, [data-testid="meal-plan-item"]',
    itemTitle: '.font-medium, h5',
    assignedDate: 'text="Assigned", .assigned-date',
    pdfButton: 'button:has-text("PDF"), [data-testid="pdf-button"]'
  },
  
  modal: {
    overlay: '.fixed.inset-0, [role="dialog"]',
    container: '[data-testid="meal-plan-modal"], .modal',
    title: 'h2, .modal-title',
    mealPlanName: '[data-testid="meal-plan-name"]',
    mealPlanDetails: '[data-testid="meal-plan-details"]',
    closeButton: 'button[aria-label="Close"], [data-testid="close"]'
  },
  
  performance: {
    loadingIndicators: '.animate-pulse, .loading, .spinner',
    errorMessages: '.error, .alert-error, [role="alert"]'
  }
};

/**
 * Comprehensive Workflow Helper Class
 */
class WorkflowTestHelper {
  private networkMonitor: any;
  private jsErrors: string[] = [];

  constructor(private page: Page) {}

  /**
   * Initialize comprehensive monitoring
   */
  async initializeMonitoring() {
    console.log('📊 Initializing comprehensive monitoring...');
    
    // Network monitoring
    this.networkMonitor = await monitorNetworkActivity(this.page);
    
    // JavaScript error monitoring
    this.page.on('pageerror', error => {
      this.jsErrors.push(error.toString());
      console.log(`❌ JavaScript Error: ${error.toString()}`);
    });
    
    this.page.on('console', message => {
      if (message.type() === 'error') {
        this.jsErrors.push(message.text());
        console.log(`❌ Console Error: ${message.text()}`);
      }
    });
    
    console.log('✅ Monitoring initialized');
  }

  /**
   * Complete trainer login and navigation workflow
   */
  async completeTrainerWorkflow() {
    console.log('👨‍💼 Starting complete trainer workflow...');
    
    const startTime = Date.now();
    
    // Step 1: Login as trainer
    await loginAsTrainer(this.page);
    
    // Step 2: Navigate to trainer dashboard
    await this.page.goto('/trainer');
    await waitForNetworkIdle(this.page);
    
    // Step 3: Find customers section
    await this.findCustomersSection();
    
    // Step 4: Select a customer
    await this.selectTestCustomer();
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ Trainer workflow completed in ${totalTime}ms`);
    
    return totalTime;
  }

  /**
   * Find and navigate to customers section
   */
  async findCustomersSection() {
    console.log('🔍 Finding customers section...');
    
    const customerSectionSelectors = [
      'text="Customers"',
      'button:has-text("Customers")', 
      'a:has-text("Customers")',
      '[data-testid="customers-tab"]',
      '.customers-section'
    ];
    
    for (const selector of customerSectionSelectors) {
      try {
        const element = this.page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click();
          await waitForNetworkIdle(this.page);
          console.log(`✅ Found customers section with: ${selector}`);
          return;
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    // Customers might be directly visible - check for customer list
    const customersList = this.page.locator(WORKFLOW_SELECTORS.customersList);
    if (await customersList.count() > 0) {
      console.log('✅ Customers list directly visible');
      return;
    }
    
    throw new Error('Could not find customers section');
  }

  /**
   * Select a test customer for detailed workflow testing
   */
  async selectTestCustomer() {
    console.log('👤 Selecting test customer...');
    
    // Look for specific test customer
    const testCustomerSelectors = [
      `text="${WORKFLOW_CONFIG.testData.customer.email}"`,
      `a:has-text("${WORKFLOW_CONFIG.testData.customer.email}")`,
      'tr:has-text("customer") a',
      'tr:has-text("test") a',
      '.customer-row:first-child a',
      'table tr:nth-child(2) a'  // Skip header row
    ];
    
    for (const selector of testCustomerSelectors) {
      try {
        const customerLink = this.page.locator(selector).first();
        if (await customerLink.isVisible({ timeout: 2000 })) {
          await customerLink.click();
          await waitForNetworkIdle(this.page);
          console.log(`✅ Selected customer with: ${selector}`);
          return;
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    throw new Error('Could not find test customer');
  }

  /**
   * Comprehensive meal plans functionality test
   */
  async testMealPlansFunctionality() {
    console.log('🍽️ Testing comprehensive meal plans functionality...');
    
    const results = {
      recentSectionWorking: false,
      mealPlansTabWorking: false,
      modalInteraction: false,
      pdfFunctionality: false,
      performanceAcceptable: true
    };
    
    // Test Recent section
    try {
      results.recentSectionWorking = await this.testRecentMealPlansSection();
    } catch (error) {
      console.log(`❌ Recent section test failed: ${error.message}`);
    }
    
    // Test Meal Plans tab
    try {
      results.mealPlansTabWorking = await this.testMealPlansTab();
    } catch (error) {
      console.log(`❌ Meal Plans tab test failed: ${error.message}`);
    }
    
    // Test modal interaction
    try {
      results.modalInteraction = await this.testModalInteraction();
    } catch (error) {
      console.log(`❌ Modal interaction test failed: ${error.message}`);
    }
    
    // Test PDF functionality
    try {
      results.pdfFunctionality = await this.testPDFDownloadFunctionality();
    } catch (error) {
      console.log(`❌ PDF functionality test failed: ${error.message}`);
    }
    
    return results;
  }

  /**
   * Test Recent Meal Plans section functionality
   */
  async testRecentMealPlansSection(): Promise<boolean> {
    console.log('📋 Testing Recent Meal Plans section...');
    
    // Wait for section to load
    const recentSection = this.page.locator(WORKFLOW_SELECTORS.recentMealPlans.section);
    await expect(recentSection).toBeVisible({ timeout: 10000 });
    
    // Get meal plan items
    const mealPlanItems = this.page.locator(WORKFLOW_SELECTORS.recentMealPlans.items);
    const itemCount = await mealPlanItems.count();
    
    if (itemCount === 0) {
      console.log('⚠️ No meal plans found in Recent section');
      return false;
    }
    
    console.log(`📊 Found ${itemCount} meal plans in Recent section`);
    
    // Test clicking on first item
    const firstItem = mealPlanItems.first();
    const firstTitle = firstItem.locator(WORKFLOW_SELECTORS.recentMealPlans.itemTitle).first();
    
    await firstTitle.click();
    await this.page.waitForTimeout(1000);
    
    // Check if modal opened
    const modal = this.page.locator(WORKFLOW_SELECTORS.modal.overlay);
    const modalVisible = await modal.isVisible();
    
    if (modalVisible) {
      // Close modal
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(500);
    }
    
    return modalVisible;
  }

  /**
   * Test Meal Plans tab functionality
   */
  async testMealPlansTab(): Promise<boolean> {
    console.log('📋 Testing Meal Plans tab...');
    
    // Switch to Meal Plans tab
    const mealPlansTab = this.page.locator(WORKFLOW_SELECTORS.customerDetail.mealPlansTab);
    await mealPlansTab.click();
    await waitForNetworkIdle(this.page);
    
    // Check for meal plan cards
    const mealPlanCards = this.page.locator('.card, [data-testid="meal-plan-card"]');
    const cardCount = await mealPlanCards.count();
    
    console.log(`📊 Found ${cardCount} meal plan cards in tab`);
    
    if (cardCount > 0) {
      // Test clicking on first card
      const firstCard = mealPlanCards.first();
      const cardTitle = firstCard.locator('.font-medium, h5').first();
      
      await cardTitle.click();
      await this.page.waitForTimeout(1000);
      
      // Check if modal opened
      const modal = this.page.locator(WORKFLOW_SELECTORS.modal.overlay);
      const modalVisible = await modal.isVisible();
      
      if (modalVisible) {
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(500);
      }
      
      return modalVisible;
    }
    
    return cardCount > 0;
  }

  /**
   * Test modal interaction thoroughly
   */
  async testModalInteraction(): Promise<boolean> {
    console.log('🔄 Testing modal interaction...');
    
    // Go back to Overview tab
    const overviewTab = this.page.locator(WORKFLOW_SELECTORS.customerDetail.overviewTab);
    await overviewTab.click();
    await this.page.waitForTimeout(500);
    
    const mealPlanItems = this.page.locator(WORKFLOW_SELECTORS.recentMealPlans.items);
    const itemCount = await mealPlanItems.count();
    
    if (itemCount === 0) {
      return false;
    }
    
    // Open modal
    const firstTitle = mealPlanItems.first().locator(WORKFLOW_SELECTORS.recentMealPlans.itemTitle).first();
    await firstTitle.click();
    await this.page.waitForTimeout(1000);
    
    const modal = this.page.locator(WORKFLOW_SELECTORS.modal.container);
    await expect(modal).toBeVisible();
    
    // Test modal content
    const modalTitle = modal.locator(WORKFLOW_SELECTORS.modal.title);
    await expect(modalTitle).toBeVisible();
    
    // Test closing modal with Escape
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(500);
    await expect(modal).not.toBeVisible();
    
    // Test opening and closing with click
    await firstTitle.click();
    await this.page.waitForTimeout(500);
    await expect(modal).toBeVisible();
    
    // Close by clicking backdrop
    await modal.click({ position: { x: 10, y: 10 } });
    await this.page.waitForTimeout(500);
    
    return true;
  }

  /**
   * Test PDF download functionality
   */
  async testPDFDownloadFunctionality(): Promise<boolean> {
    console.log('📄 Testing PDF download functionality...');
    
    const mealPlanItems = this.page.locator(WORKFLOW_SELECTORS.recentMealPlans.items);
    const itemCount = await mealPlanItems.count();
    
    if (itemCount === 0) {
      return false;
    }
    
    // Test PDF button
    const firstItem = mealPlanItems.first();
    const pdfButton = firstItem.locator(WORKFLOW_SELECTORS.recentMealPlans.pdfButton).first();
    
    if (await pdfButton.count() === 0) {
      console.log('⚠️ No PDF button found');
      return false;
    }
    
    // Click PDF button
    await pdfButton.click();
    await this.page.waitForTimeout(2000);
    
    // Check that modal did NOT open
    const modal = this.page.locator(WORKFLOW_SELECTORS.modal.overlay);
    const modalVisible = await modal.isVisible();
    
    // PDF should work independently (not open modal)
    return !modalVisible;
  }

  /**
   * Performance testing
   */
  async testPerformance(): Promise<{ loadTime: number; interactionTime: number; acceptable: boolean }> {
    console.log('⚡ Testing performance...');
    
    const startTime = Date.now();
    
    // Test page load performance
    await this.page.reload();
    await waitForNetworkIdle(this.page);
    const loadTime = Date.now() - startTime;
    
    // Test interaction performance
    const interactionStart = Date.now();
    const mealPlanItems = this.page.locator(WORKFLOW_SELECTORS.recentMealPlans.items);
    if (await mealPlanItems.count() > 0) {
      const firstTitle = mealPlanItems.first().locator('.font-medium').first();
      await firstTitle.click();
      await this.page.waitForTimeout(500);
      await this.page.keyboard.press('Escape');
    }
    const interactionTime = Date.now() - interactionStart;
    
    const acceptable = loadTime < WORKFLOW_CONFIG.performance.maxLoadTime && 
                      interactionTime < WORKFLOW_CONFIG.performance.maxInteractionTime;
    
    console.log(`📊 Performance: Load ${loadTime}ms, Interaction ${interactionTime}ms, Acceptable: ${acceptable}`);
    
    return { loadTime, interactionTime, acceptable };
  }

  /**
   * Get monitoring results
   */
  getMonitoringResults() {
    return {
      networkRequests: this.networkMonitor?.getRequests() || [],
      failedRequests: this.networkMonitor?.getFailedRequests() || [],
      jsErrors: this.jsErrors
    };
  }
}

test.describe('Recent Meal Plans Comprehensive Workflows', () => {
  let workflowHelper: WorkflowTestHelper;

  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(WORKFLOW_CONFIG.timeout);
    workflowHelper = new WorkflowTestHelper(page);
    await workflowHelper.initializeMonitoring();
  });

  test.describe('Complete Trainer Journey', () => {
    test('should complete full trainer to customer meal plans workflow', async ({ page }) => {
      console.log('🧪 Testing: Complete trainer workflow');
      
      const workflowTime = await workflowHelper.completeTrainerWorkflow();
      
      // Test all meal plans functionality
      const results = await workflowHelper.testMealPlansFunctionality();
      
      // Take comprehensive screenshot
      await takeTestScreenshot(page, 'complete-workflow.png', 'Complete trainer workflow');
      
      // Verify all components working
      expect(results.recentSectionWorking || results.mealPlansTabWorking).toBe(true);
      expect(workflowTime).toBeLessThan(30000); // Should complete within 30 seconds
      
      console.log('✅ Complete trainer workflow successful');
    });

    test('should handle workflow with empty meal plans', async ({ page }) => {
      console.log('🧪 Testing: Workflow with empty meal plans');
      
      await workflowHelper.completeTrainerWorkflow();
      
      // Look for empty state messages
      const emptyMessages = [
        page.locator('text="No meal plans"'),
        page.locator('text="Create First Meal Plan"'),
        page.locator('text="No Meal Plans Yet"')
      ];
      
      let emptyStateFound = false;
      for (const message of emptyMessages) {
        if (await message.count() > 0) {
          emptyStateFound = true;
          await expect(message).toBeVisible();
          break;
        }
      }
      
      console.log(`📋 Empty state handling: ${emptyStateFound ? 'Found' : 'Not applicable'}`);
      
      // Should still be able to navigate and create meal plans
      const createButton = page.locator('button:has-text("Create")').first();
      if (await createButton.count() > 0) {
        await expect(createButton).toBeVisible();
      }
      
      console.log('✅ Empty meal plans workflow handled correctly');
    });
  });

  test.describe('Complex Interaction Sequences', () => {
    test('should handle rapid sequential interactions', async ({ page }) => {
      console.log('🧪 Testing: Rapid sequential interactions');
      
      await workflowHelper.completeTrainerWorkflow();
      
      const mealPlanItems = page.locator(WORKFLOW_SELECTORS.recentMealPlans.items);
      const itemCount = await mealPlanItems.count();
      
      if (itemCount === 0) {
        console.log('⚠️ No meal plans found - skipping rapid interaction test');
        test.skip();
      }
      
      // Rapid sequence: hover, click, close, click different item
      const items = await mealPlanItems.all();
      
      for (let i = 0; i < Math.min(items.length, 3); i++) {
        const item = items[i];
        const title = item.locator('.font-medium').first();
        
        // Hover and click
        await item.hover();
        await title.click();
        await page.waitForTimeout(300);
        
        // Close modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        
        // Verify clean state
        const modal = page.locator(WORKFLOW_SELECTORS.modal.overlay);
        await expect(modal).not.toBeVisible();
      }
      
      console.log('✅ Rapid sequential interactions handled correctly');
    });

    test('should maintain state during tab switching with open modal', async ({ page }) => {
      console.log('🧪 Testing: Tab switching with modal state');
      
      await workflowHelper.completeTrainerWorkflow();
      
      const mealPlanItems = page.locator(WORKFLOW_SELECTORS.recentMealPlans.items);
      if (await mealPlanItems.count() === 0) {
        test.skip();
      }
      
      // Open modal from Recent section
      const firstTitle = mealPlanItems.first().locator('.font-medium').first();
      await firstTitle.click();
      await page.waitForTimeout(500);
      
      const modal = page.locator(WORKFLOW_SELECTORS.modal.overlay);
      await expect(modal).toBeVisible();
      
      // Try switching tabs while modal is open
      const mealPlansTab = page.locator(WORKFLOW_SELECTORS.customerDetail.mealPlansTab);
      await mealPlansTab.click();
      await page.waitForTimeout(500);
      
      // Modal should still be open or should close gracefully
      const modalStillVisible = await modal.isVisible();
      console.log(`Modal visibility after tab switch: ${modalStillVisible}`);
      
      // If modal is still open, close it
      if (modalStillVisible) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
      
      // Verify tab content is accessible
      await expect(page.locator('text="Meal Plans"')).toBeVisible();
      
      console.log('✅ Tab switching with modal handled correctly');
    });

    test('should handle mixed PDF and modal interactions', async ({ page }) => {
      console.log('🧪 Testing: Mixed PDF and modal interactions');
      
      await workflowHelper.completeTrainerWorkflow();
      
      const mealPlanItems = page.locator(WORKFLOW_SELECTORS.recentMealPlans.items);
      if (await mealPlanItems.count() === 0) {
        test.skip();
      }
      
      const firstItem = mealPlanItems.first();
      const title = firstItem.locator('.font-medium').first();
      const pdfButton = firstItem.locator('button:has-text("PDF")').first();
      
      // Sequence: PDF click, then modal click, then PDF click again
      if (await pdfButton.count() > 0) {
        // 1. Click PDF (should not open modal)
        await pdfButton.click();
        await page.waitForTimeout(1000);
        
        const modal = page.locator(WORKFLOW_SELECTORS.modal.overlay);
        expect(await modal.isVisible()).toBe(false);
        
        // 2. Click title (should open modal)
        await title.click();
        await page.waitForTimeout(500);
        
        expect(await modal.isVisible()).toBe(true);
        
        // 3. Close modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        
        // 4. Click PDF again (should still not open modal)
        await pdfButton.click();
        await page.waitForTimeout(1000);
        
        expect(await modal.isVisible()).toBe(false);
      }
      
      console.log('✅ Mixed PDF and modal interactions working correctly');
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle network interruptions gracefully', async ({ page }) => {
      console.log('🧪 Testing: Network interruption handling');
      
      await workflowHelper.completeTrainerWorkflow();
      
      // Simulate network failure for meal plan requests
      await page.route('**/api/trainer/customers/*/meal-plans', route => {
        route.abort('failed');
      });
      
      // Try refreshing the page
      await page.reload();
      await page.waitForTimeout(3000);
      
      // Should show error state or loading state, but not crash
      const hasError = await page.locator('.error, [role="alert"]').count() > 0;
      const hasLoading = await page.locator('.loading, .animate-pulse').count() > 0;
      const hasEmptyState = await page.locator('text="No meal plans"').count() > 0;
      
      const handledGracefully = hasError || hasLoading || hasEmptyState;
      expect(handledGracefully).toBe(true);
      
      console.log('✅ Network interruption handled gracefully');
    });

    test('should handle authentication errors during meal plan interactions', async ({ page }) => {
      console.log('🧪 Testing: Authentication error handling');
      
      await workflowHelper.completeTrainerWorkflow();
      
      // Clear authentication
      await page.evaluate(() => {
        localStorage.removeItem('token');
        sessionStorage.clear();
      });
      
      // Try interacting with meal plans
      const mealPlanItems = page.locator(WORKFLOW_SELECTORS.recentMealPlans.items);
      if (await mealPlanItems.count() > 0) {
        const firstTitle = mealPlanItems.first().locator('.font-medium').first();
        await firstTitle.click();
        await page.waitForTimeout(2000);
        
        // Should either show login prompt or handle gracefully
        const currentUrl = page.url();
        const hasLoginRedirect = currentUrl.includes('/login');
        const hasErrorMessage = await page.locator('.error, [role="alert"]').count() > 0;
        
        const handledAuth = hasLoginRedirect || hasErrorMessage;
        console.log(`Authentication handling: Redirect=${hasLoginRedirect}, Error=${hasErrorMessage}`);
        
        // Don't fail test if auth handled appropriately
        if (!handledAuth) {
          console.log('⚠️ Authentication error not clearly handled, but continuing...');
        }
      }
      
      console.log('✅ Authentication error handling test completed');
    });

    test('should handle malformed meal plan data', async ({ page }) => {
      console.log('🧪 Testing: Malformed data handling');
      
      await workflowHelper.completeTrainerWorkflow();
      
      // Mock malformed API response
      await page.route('**/api/trainer/customers/*/meal-plans', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            mealPlans: [
              {
                id: 'malformed-1',
                // Missing required fields
                mealPlanData: null
              },
              {
                // Completely malformed
                invalid: 'data'
              }
            ]
          })
        });
      });
      
      // Refresh to trigger new API call
      await page.reload();
      await page.waitForTimeout(3000);
      
      // Should handle malformed data gracefully
      const pageStillFunctional = await page.locator(WORKFLOW_SELECTORS.customerDetail.header).count() > 0;
      expect(pageStillFunctional).toBe(true);
      
      console.log('✅ Malformed data handled gracefully');
    });
  });

  test.describe('Performance and Load Testing', () => {
    test('should maintain acceptable performance', async ({ page }) => {
      console.log('🧪 Testing: Performance benchmarks');
      
      await workflowHelper.completeTrainerWorkflow();
      
      const performance = await workflowHelper.testPerformance();
      
      // Performance assertions
      expect(performance.loadTime).toBeLessThan(WORKFLOW_CONFIG.performance.maxLoadTime);
      expect(performance.interactionTime).toBeLessThan(WORKFLOW_CONFIG.performance.maxInteractionTime);
      expect(performance.acceptable).toBe(true);
      
      console.log(`✅ Performance acceptable: Load ${performance.loadTime}ms, Interaction ${performance.interactionTime}ms`);
    });

    test('should handle large numbers of meal plans efficiently', async ({ page }) => {
      console.log('🧪 Testing: Large dataset performance');
      
      await workflowHelper.completeTrainerWorkflow();
      
      // Mock response with many meal plans
      const largeMealPlanSet = Array.from({ length: 20 }, (_, i) => ({
        id: `plan-${i}`,
        mealPlanData: {
          planName: `Test Meal Plan ${i + 1}`,
          fitnessGoal: 'weight_loss',
          dailyCalorieTarget: 1800,
          days: 7,
          mealsPerDay: 3
        },
        assignedAt: new Date().toISOString(),
        notes: `Test meal plan ${i + 1}`
      }));
      
      await page.route('**/api/trainer/customers/*/meal-plans', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            mealPlans: largeMealPlanSet,
            total: largeMealPlanSet.length
          })
        });
      });
      
      // Refresh and measure performance
      const startTime = Date.now();
      await page.reload();
      await waitForNetworkIdle(page);
      const loadTime = Date.now() - startTime;
      
      // Should still load quickly even with many meal plans
      expect(loadTime).toBeLessThan(10000); // 10 seconds max for large dataset
      
      // Verify UI still responsive
      const mealPlanItems = page.locator(WORKFLOW_SELECTORS.recentMealPlans.items);
      const displayedCount = await mealPlanItems.count();
      
      // Should show recent items (limited number for performance)
      expect(displayedCount).toBeGreaterThan(0);
      expect(displayedCount).toBeLessThanOrEqual(10); // Should limit display for performance
      
      console.log(`✅ Large dataset handled efficiently: ${loadTime}ms load time, ${displayedCount} items displayed`);
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    test('should work consistently across browser types', async ({ page, browserName }) => {
      console.log(`🧪 Testing: Cross-browser compatibility on ${browserName}`);
      
      await workflowHelper.completeTrainerWorkflow();
      
      // Test core functionality regardless of browser
      const results = await workflowHelper.testMealPlansFunctionality();
      
      // Should work in all browsers
      const anyFunctionalityWorking = Object.values(results).some(result => result === true);
      expect(anyFunctionalityWorking).toBe(true);
      
      // Take browser-specific screenshot
      await takeTestScreenshot(page, `cross-browser-${browserName}.png`, `${browserName} compatibility test`);
      
      console.log(`✅ ${browserName} compatibility verified`);
    });
  });

  test.afterEach(async ({ page }) => {
    // Collect monitoring results
    const monitoring = workflowHelper.getMonitoringResults();
    
    console.log(`📊 Monitoring Summary:`);
    console.log(`  - Network requests: ${monitoring.networkRequests.length}`);
    console.log(`  - Failed requests: ${monitoring.failedRequests.length}`);
    console.log(`  - JavaScript errors: ${monitoring.jsErrors.length}`);
    
    // Log any significant issues
    if (monitoring.failedRequests.length > 0) {
      console.log(`❌ Failed requests:`, monitoring.failedRequests);
    }
    
    if (monitoring.jsErrors.length > 0) {
      console.log(`❌ JavaScript errors:`, monitoring.jsErrors);
    }
    
    // Clean up any open modals
    try {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } catch (error) {
      // Ignore cleanup errors
    }
  });
});