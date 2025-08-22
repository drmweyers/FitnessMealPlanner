/**
 * Recent Meal Plans Interactions E2E Tests
 * 
 * Tests the core interaction functionality for the recent meal plans feature
 * in CustomerDetailView. Validates that:
 * - Clicking on meal plan items opens the modal with correct data
 * - PDF download buttons work independently without triggering modal
 * - Both Recent section (Overview tab) and Meal Plans tab work correctly
 * - Modal state management is correct
 * 
 * This test suite focuses on the specific bugs that were recently fixed
 * where clicking interactions were interfering with each other.
 */

import { test, expect, Page } from '@playwright/test';
import { loginAsTrainer, takeTestScreenshot, waitForNetworkIdle } from './auth-helper';

// Test configuration for meal plan interactions
const TEST_CONFIG = {
  baseURL: 'http://localhost:4000',
  timeout: 30000,
  customer: {
    email: 'customer.test@evofitmeals.com',
    expectedMealPlans: 2  // Expecting at least 2 meal plans for comprehensive testing
  }
};

// Page selectors for meal plan elements
const SELECTORS = {
  // Recent Meal Plans section (Overview tab)
  recentMealPlans: {
    section: '[data-testid="recent-meal-plans"], .card:has(h3:text("Recent Meal Plans"))',
    items: '[data-testid="recent-meal-plan-item"], .bg-gray-50.rounded-lg.hover\\:bg-gray-100',
    itemTitle: '.font-medium, h5.font-medium',
    pdfButton: '[data-testid="pdf-export-button"], button:has-text("PDF")',
  },
  
  // Full Meal Plans tab
  mealPlansTab: {
    tab: 'button[role="tab"]:has-text("Meal Plans"), [data-testid="meal-plans-tab"]',
    cards: '[data-testid="meal-plan-card"], .card.hover\\:shadow-md',
    cardTitle: '.text-lg.font-medium, h5.text-lg.font-medium',
    pdfButton: '[data-testid="pdf-export-button"], button:has-text("PDF")',
  },
  
  // Modal elements
  modal: {
    container: '[data-testid="meal-plan-modal"], [role="dialog"], .fixed.inset-0',
    title: '[data-testid="modal-title"], .dialog-title, h2',
    closeButton: '[data-testid="modal-close"], button[aria-label="Close"], [data-testid="close-modal"]',
    content: '[data-testid="modal-content"], .dialog-content'
  },
  
  // Navigation elements
  navigation: {
    overviewTab: 'button[role="tab"]:has-text("Overview")',
    customersLink: 'a:has-text("Customers"), button:has-text("Back to Customers")'
  }
};

/**
 * Helper class for Customer Detail View Page interactions
 */
class CustomerDetailPage {
  constructor(private page: Page) {}

  /**
   * Navigate to a specific customer's detail view
   */
  async navigateToCustomer(customerEmail: string = TEST_CONFIG.customer.email) {
    console.log(`🔍 Navigating to customer: ${customerEmail}`);
    
    // First go to trainer dashboard
    await this.page.goto('/trainer');
    await waitForNetworkIdle(this.page);
    
    // Look for customer in the customers list
    const customerSelectors = [
      `text="${customerEmail}"`,
      `a:has-text("${customerEmail}")`,
      `button:has-text("${customerEmail}")`,
      `tr:has-text("${customerEmail}") a`,
      `[data-testid="customer-row"]:has-text("${customerEmail}") a`
    ];
    
    let customerFound = false;
    for (const selector of customerSelectors) {
      try {
        const customerElement = this.page.locator(selector).first();
        if (await customerElement.isVisible({ timeout: 2000 })) {
          await customerElement.click();
          customerFound = true;
          console.log(`✅ Customer found with selector: ${selector}`);
          break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    if (!customerFound) {
      // Try clicking through any customer management interface
      const managementSelectors = [
        'button:has-text("View Details")',
        'a:has-text("Manage")',
        'tr:first-child a',  // First customer in table
        '.customer-card:first-child a'
      ];
      
      for (const selector of managementSelectors) {
        try {
          const element = this.page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            await element.click();
            customerFound = true;
            console.log(`✅ Customer accessed via: ${selector}`);
            break;
          }
        } catch (error) {
          // Continue
        }
      }
    }
    
    if (!customerFound) {
      throw new Error(`Could not find customer: ${customerEmail}`);
    }
    
    // Wait for customer detail view to load
    await waitForNetworkIdle(this.page);
    await this.page.waitForSelector('h2, h1', { timeout: 10000 });
    
    console.log('✅ Customer detail view loaded');
  }

  /**
   * Wait for meal plans to load in the UI
   */
  async waitForMealPlansToLoad() {
    console.log('⏳ Waiting for meal plans to load...');
    
    // Wait for any loading indicators to disappear
    const loadingSelectors = [
      '.animate-pulse',
      '[data-testid="loading"]',
      'text="Loading"'
    ];
    
    for (const selector of loadingSelectors) {
      try {
        await this.page.waitForSelector(selector, { state: 'detached', timeout: 5000 });
      } catch (error) {
        // Loading indicator might not exist, continue
      }
    }
    
    // Wait for meal plan elements to appear
    const mealPlanSelectors = [
      SELECTORS.recentMealPlans.items,
      '.bg-gray-50.rounded-lg',
      '.card',
      'text="Recent Meal Plans"'
    ];
    
    let mealPlansFound = false;
    for (const selector of mealPlanSelectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 5000 });
        mealPlansFound = true;
        break;
      } catch (error) {
        // Continue to next selector
      }
    }
    
    await waitForNetworkIdle(this.page);
    console.log(`📋 Meal plans loading status: ${mealPlansFound ? 'Found' : 'Not found'}`);
    
    return mealPlansFound;
  }

  /**
   * Get meal plan items from Recent section
   */
  async getRecentMealPlanItems() {
    const items = await this.page.locator(SELECTORS.recentMealPlans.items).all();
    console.log(`📋 Found ${items.length} recent meal plan items`);
    return items;
  }

  /**
   * Get meal plan cards from Meal Plans tab
   */
  async getMealPlanCards() {
    const cards = await this.page.locator(SELECTORS.mealPlansTab.cards).all();
    console.log(`📋 Found ${cards.length} meal plan cards`);
    return cards;
  }

  /**
   * Switch to Meal Plans tab
   */
  async switchToMealPlansTab() {
    console.log('📋 Switching to Meal Plans tab...');
    
    const tabSelectors = [
      SELECTORS.mealPlansTab.tab,
      'button:has-text("Meal Plans")',
      '[role="tab"]:has-text("Meal Plans")'
    ];
    
    for (const selector of tabSelectors) {
      try {
        const tab = this.page.locator(selector).first();
        if (await tab.isVisible({ timeout: 2000 })) {
          await tab.click();
          await waitForNetworkIdle(this.page);
          console.log(`✅ Switched to Meal Plans tab with: ${selector}`);
          return;
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    throw new Error('Could not find Meal Plans tab');
  }

  /**
   * Check if modal is open
   */
  async isModalOpen() {
    const modalSelectors = [
      SELECTORS.modal.container,
      '[role="dialog"]',
      '.fixed.inset-0',
      '.modal'
    ];
    
    for (const selector of modalSelectors) {
      try {
        const modal = this.page.locator(selector);
        if (await modal.isVisible({ timeout: 1000 })) {
          return true;
        }
      } catch (error) {
        // Continue checking
      }
    }
    
    return false;
  }

  /**
   * Close modal if open
   */
  async closeModal() {
    if (await this.isModalOpen()) {
      console.log('🔐 Closing modal...');
      
      // Try multiple ways to close modal
      const closeSelectors = [
        SELECTORS.modal.closeButton,
        'button[aria-label="Close"]',
        '[data-testid="close-modal"]',
        '.close-button'
      ];
      
      for (const selector of closeSelectors) {
        try {
          const closeButton = this.page.locator(selector).first();
          if (await closeButton.isVisible({ timeout: 1000 })) {
            await closeButton.click();
            await this.page.waitForTimeout(500);
            return;
          }
        } catch (error) {
          // Continue
        }
      }
      
      // Fallback: press Escape
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(500);
    }
  }
}

test.describe('Recent Meal Plans Interactions', () => {
  let customerPage: CustomerDetailPage;

  test.beforeEach(async ({ page }) => {
    // Set longer timeout for these tests
    page.setDefaultTimeout(TEST_CONFIG.timeout);
    
    customerPage = new CustomerDetailPage(page);
    
    // Login as trainer
    await loginAsTrainer(page);
    
    // Navigate to customer detail view
    await customerPage.navigateToCustomer();
    
    // Ensure we're on Overview tab
    try {
      await page.click(SELECTORS.navigation.overviewTab);
      await page.waitForTimeout(1000);
    } catch (error) {
      // Already on overview tab
    }
    
    // Wait for meal plans to load
    await customerPage.waitForMealPlansToLoad();
    
    // Take initial screenshot
    await takeTestScreenshot(page, 'customer-detail-initial.png', 'Customer detail view loaded');
  });

  test.afterEach(async ({ page }) => {
    // Clean up any open modals
    await customerPage.closeModal();
  });

  test.describe('Recent Meal Plans Section (Overview Tab)', () => {
    test('should open modal when clicking on meal plan item title', async ({ page }) => {
      console.log('🧪 Testing: Meal plan title click opens modal');
      
      const recentItems = await customerPage.getRecentMealPlanItems();
      
      if (recentItems.length === 0) {
        console.log('⚠️ No meal plans found - skipping interaction test');
        test.skip();
      }
      
      // Test first meal plan item
      const firstItem = recentItems[0];
      
      // Ensure modal is initially closed
      expect(await customerPage.isModalOpen()).toBe(false);
      
      // Click on the meal plan title/item (not the PDF button)
      const title = firstItem.locator(SELECTORS.recentMealPlans.itemTitle).first();
      await title.click();
      
      // Take screenshot after click
      await takeTestScreenshot(page, 'recent-meal-plan-clicked.png', 'After clicking recent meal plan');
      
      // Verify modal opens
      await page.waitForTimeout(1000); // Allow for modal animation
      expect(await customerPage.isModalOpen()).toBe(true);
      
      // Verify modal contains expected content
      const modalTitle = page.locator(SELECTORS.modal.title).first();
      await expect(modalTitle).toBeVisible();
      
      console.log('✅ Modal opened successfully when clicking meal plan title');
    });

    test('should NOT open modal when clicking PDF button', async ({ page }) => {
      console.log('🧪 Testing: PDF button click does NOT open modal');
      
      const recentItems = await customerPage.getRecentMealPlanItems();
      
      if (recentItems.length === 0) {
        console.log('⚠️ No meal plans found - skipping PDF test');
        test.skip();
      }
      
      // Test first meal plan item
      const firstItem = recentItems[0];
      
      // Ensure modal is initially closed
      expect(await customerPage.isModalOpen()).toBe(false);
      
      // Click on the PDF button specifically
      const pdfButton = firstItem.locator(SELECTORS.recentMealPlans.pdfButton).first();
      
      // Verify PDF button exists
      await expect(pdfButton).toBeVisible();
      
      // Click PDF button
      await pdfButton.click();
      
      // Take screenshot after PDF click
      await takeTestScreenshot(page, 'recent-pdf-button-clicked.png', 'After clicking PDF button');
      
      // Give time for any potential modal to appear
      await page.waitForTimeout(1000);
      
      // Verify modal does NOT open
      expect(await customerPage.isModalOpen()).toBe(false);
      
      console.log('✅ PDF button click correctly did NOT open modal');
    });

    test('should support clicking multiple meal plan items sequentially', async ({ page }) => {
      console.log('🧪 Testing: Multiple meal plan item clicks');
      
      const recentItems = await customerPage.getRecentMealPlanItems();
      
      if (recentItems.length < 2) {
        console.log('⚠️ Need at least 2 meal plans for sequential test - skipping');
        test.skip();
      }
      
      // Test first meal plan
      const firstTitle = recentItems[0].locator(SELECTORS.recentMealPlans.itemTitle).first();
      await firstTitle.click();
      expect(await customerPage.isModalOpen()).toBe(true);
      
      // Close modal
      await customerPage.closeModal();
      expect(await customerPage.isModalOpen()).toBe(false);
      
      // Test second meal plan
      const secondTitle = recentItems[1].locator(SELECTORS.recentMealPlans.itemTitle).first();
      await secondTitle.click();
      expect(await customerPage.isModalOpen()).toBe(true);
      
      console.log('✅ Sequential meal plan clicks work correctly');
    });

    test('should handle rapid clicking correctly', async ({ page }) => {
      console.log('🧪 Testing: Rapid clicking behavior');
      
      const recentItems = await customerPage.getRecentMealPlanItems();
      
      if (recentItems.length === 0) {
        test.skip();
      }
      
      const firstItem = recentItems[0];
      const title = firstItem.locator(SELECTORS.recentMealPlans.itemTitle).first();
      
      // Rapid clicks
      await title.click();
      await title.click();
      await title.click();
      
      // Should still only open one modal
      await page.waitForTimeout(1000);
      expect(await customerPage.isModalOpen()).toBe(true);
      
      console.log('✅ Rapid clicking handled correctly');
    });
  });

  test.describe('Full Meal Plans Tab', () => {
    test.beforeEach(async ({ page }) => {
      // Switch to Meal Plans tab for these tests
      await customerPage.switchToMealPlansTab();
      await takeTestScreenshot(page, 'meal-plans-tab.png', 'Meal Plans tab loaded');
    });

    test('should open modal when clicking on meal plan card', async ({ page }) => {
      console.log('🧪 Testing: Meal plan card click opens modal');
      
      const mealPlanCards = await customerPage.getMealPlanCards();
      
      if (mealPlanCards.length === 0) {
        console.log('⚠️ No meal plan cards found - skipping test');
        test.skip();
      }
      
      // Test first meal plan card
      const firstCard = mealPlanCards[0];
      
      // Ensure modal is initially closed
      expect(await customerPage.isModalOpen()).toBe(false);
      
      // Click on the card (but avoid PDF button)
      const cardTitle = firstCard.locator(SELECTORS.mealPlansTab.cardTitle).first();
      await cardTitle.click();
      
      // Take screenshot after click
      await takeTestScreenshot(page, 'meal-plan-card-clicked.png', 'After clicking meal plan card');
      
      // Verify modal opens
      await page.waitForTimeout(1000);
      expect(await customerPage.isModalOpen()).toBe(true);
      
      console.log('✅ Modal opened successfully when clicking meal plan card');
    });

    test('should NOT open modal when clicking PDF button in meal plans tab', async ({ page }) => {
      console.log('🧪 Testing: PDF button in Meal Plans tab does NOT open modal');
      
      const mealPlanCards = await customerPage.getMealPlanCards();
      
      if (mealPlanCards.length === 0) {
        test.skip();
      }
      
      // Test first meal plan card
      const firstCard = mealPlanCards[0];
      
      // Ensure modal is initially closed
      expect(await customerPage.isModalOpen()).toBe(false);
      
      // Click on the PDF button specifically
      const pdfButton = firstCard.locator(SELECTORS.mealPlansTab.pdfButton).first();
      
      // Verify PDF button exists
      await expect(pdfButton).toBeVisible();
      
      // Click PDF button
      await pdfButton.click();
      
      // Take screenshot after PDF click
      await takeTestScreenshot(page, 'meal-plans-pdf-clicked.png', 'After clicking PDF button in Meal Plans tab');
      
      // Give time for any potential modal to appear
      await page.waitForTimeout(1000);
      
      // Verify modal does NOT open
      expect(await customerPage.isModalOpen()).toBe(false);
      
      console.log('✅ PDF button in Meal Plans tab correctly did NOT open modal');
    });

    test('should handle switching between tabs without losing modal state', async ({ page }) => {
      console.log('🧪 Testing: Tab switching with modal interactions');
      
      const mealPlanCards = await customerPage.getMealPlanCards();
      
      if (mealPlanCards.length === 0) {
        test.skip();
      }
      
      // Open modal from meal plan card
      const firstCard = mealPlanCards[0];
      const cardTitle = firstCard.locator(SELECTORS.mealPlansTab.cardTitle).first();
      await cardTitle.click();
      expect(await customerPage.isModalOpen()).toBe(true);
      
      // Close modal
      await customerPage.closeModal();
      expect(await customerPage.isModalOpen()).toBe(false);
      
      // Switch back to Overview tab
      await page.click(SELECTORS.navigation.overviewTab);
      await page.waitForTimeout(1000);
      
      // Try clicking recent meal plan
      const recentItems = await customerPage.getRecentMealPlanItems();
      if (recentItems.length > 0) {
        const title = recentItems[0].locator(SELECTORS.recentMealPlans.itemTitle).first();
        await title.click();
        expect(await customerPage.isModalOpen()).toBe(true);
      }
      
      console.log('✅ Tab switching with modal interactions works correctly');
    });
  });

  test.describe('Cross-Section Testing', () => {
    test('should maintain independent behavior between Recent and Full sections', async ({ page }) => {
      console.log('🧪 Testing: Independence between Recent and Full meal plans sections');
      
      // Test Recent section first
      const recentItems = await customerPage.getRecentMealPlanItems();
      
      if (recentItems.length > 0) {
        // Click recent meal plan title
        const recentTitle = recentItems[0].locator(SELECTORS.recentMealPlans.itemTitle).first();
        await recentTitle.click();
        expect(await customerPage.isModalOpen()).toBe(true);
        
        // Close modal
        await customerPage.closeModal();
        expect(await customerPage.isModalOpen()).toBe(false);
        
        // Click recent PDF button
        const recentPdf = recentItems[0].locator(SELECTORS.recentMealPlans.pdfButton).first();
        await recentPdf.click();
        expect(await customerPage.isModalOpen()).toBe(false);
      }
      
      // Switch to Meal Plans tab
      await customerPage.switchToMealPlansTab();
      
      // Test Full meal plans section
      const mealPlanCards = await customerPage.getMealPlanCards();
      
      if (mealPlanCards.length > 0) {
        // Click meal plan card
        const cardTitle = mealPlanCards[0].locator(SELECTORS.mealPlansTab.cardTitle).first();
        await cardTitle.click();
        expect(await customerPage.isModalOpen()).toBe(true);
        
        // Close modal
        await customerPage.closeModal();
        expect(await customerPage.isModalOpen()).toBe(false);
        
        // Click PDF button
        const cardPdf = mealPlanCards[0].locator(SELECTORS.mealPlansTab.pdfButton).first();
        await cardPdf.click();
        expect(await customerPage.isModalOpen()).toBe(false);
      }
      
      console.log('✅ Both sections maintain independent, correct behavior');
    });

    test('should display consistent meal plan data between sections', async ({ page }) => {
      console.log('🧪 Testing: Data consistency between Recent and Full sections');
      
      // Get meal plan title from Recent section
      const recentItems = await customerPage.getRecentMealPlanItems();
      
      if (recentItems.length === 0) {
        test.skip();
      }
      
      const recentTitle = await recentItems[0].locator(SELECTORS.recentMealPlans.itemTitle).textContent();
      
      // Switch to Meal Plans tab
      await customerPage.switchToMealPlansTab();
      
      // Find the same meal plan in Full section
      const mealPlanCards = await customerPage.getMealPlanCards();
      let foundMatchingCard = false;
      
      for (const card of mealPlanCards) {
        const cardTitle = await card.locator(SELECTORS.mealPlansTab.cardTitle).textContent();
        if (cardTitle === recentTitle) {
          foundMatchingCard = true;
          console.log(`✅ Found matching meal plan: "${cardTitle}"`);
          break;
        }
      }
      
      // Should find at least one matching meal plan between sections
      expect(foundMatchingCard).toBe(true);
      
      console.log('✅ Data consistency verified between sections');
    });
  });

  test.describe('Edge Cases and Error Handling', () => {
    test('should handle empty meal plans gracefully', async ({ page }) => {
      console.log('🧪 Testing: Empty meal plans handling');
      
      const recentItems = await customerPage.getRecentMealPlanItems();
      const mealPlanCards = await customerPage.getMealPlanCards();
      
      if (recentItems.length === 0) {
        // Verify empty state messaging
        const emptyMessage = page.locator('text="No meal plans"').or(page.locator('text="Create First Meal Plan"'));
        await expect(emptyMessage).toBeVisible();
        console.log('✅ Empty state properly displayed');
      }
      
      // Test Meal Plans tab too
      await customerPage.switchToMealPlansTab();
      
      if (mealPlanCards.length === 0) {
        const emptyMessage = page.locator('text="No Meal Plans Yet"').or(page.locator('text="Create First Meal Plan"'));
        await expect(emptyMessage).toBeVisible();
        console.log('✅ Meal Plans tab empty state properly displayed');
      }
    });

    test('should handle network errors gracefully', async ({ page }) => {
      console.log('🧪 Testing: Network error handling');
      
      // Simulate network issues by blocking meal plan requests
      await page.route('**/api/trainer/customers/*/meal-plans', route => {
        route.abort('failed');
      });
      
      // Refresh the page to trigger error
      await page.reload();
      await page.waitForTimeout(2000);
      
      // Should handle error gracefully (not crash the page)
      const pageTitle = await page.title();
      expect(pageTitle).not.toContain('Error');
      
      console.log('✅ Network errors handled gracefully');
    });
  });
});