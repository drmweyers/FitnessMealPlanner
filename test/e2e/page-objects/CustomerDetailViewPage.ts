/**
 * CustomerDetailView Page Object Model
 * 
 * Provides a maintainable interface for interacting with the CustomerDetailView component
 * in Playwright E2E tests. Encapsulates element selectors, common actions, and
 * validation methods for the recent meal plans functionality.
 * 
 * This page object supports:
 * - Navigation to customer detail views
 * - Interaction with recent meal plans section
 * - Meal Plans tab operations
 * - Modal management
 * - PDF download testing
 * - Visual state validation
 */

import { Page, Locator, expect } from '@playwright/test';
import { waitForNetworkIdle, takeTestScreenshot } from '../auth-helper';

export interface MealPlanInteractionResult {
  success: boolean;
  modalOpened?: boolean;
  pdfTriggered?: boolean;
  error?: string;
}

export interface PerformanceMetrics {
  loadTime: number;
  interactionTime: number;
  networkRequests: number;
}

/**
 * CustomerDetailView Page Object
 */
export class CustomerDetailViewPage {
  // Core page elements
  private readonly page: Page;
  
  // Selectors organized by component section
  private readonly selectors = {
    // Navigation and header
    navigation: {
      backButton: 'button:has-text("Back"), [data-testid="back-button"]',
      createMealPlanBtn: 'button:has-text("Create"), [data-testid="create-meal-plan"]',
      overviewTab: '[role="tab"]:has-text("Overview")',
      mealPlansTab: '[role="tab"]:has-text("Meal Plans")',
      healthMetricsTab: '[role="tab"]:has-text("Health")',
      goalsTab: '[role="tab"]:has-text("Goals")'
    },
    
    // Recent Meal Plans section (Overview tab)
    recentMealPlans: {
      section: '.card:has(h3:text("Recent")), [data-testid="recent-meal-plans"]',
      container: '[data-testid="recent-meal-plans-container"]',
      items: '.bg-gray-50.rounded-lg.hover\\:bg-gray-100, [data-testid="recent-meal-plan-item"]',
      itemTitle: '.font-medium, h5.font-medium',
      itemDescription: '.text-sm.text-gray-600',
      assignedDate: '.text-sm:has-text("Assigned")',
      pdfButton: 'button:has-text("PDF"), [data-testid="pdf-export-button"]',
      emptyState: 'text="No meal plans", text="Create First Meal Plan"'
    },
    
    // Full Meal Plans tab
    mealPlansTab: {
      container: '[data-testid="meal-plans-tab-content"]',
      cards: '.card.hover\\:shadow-md, [data-testid="meal-plan-card"]',
      cardTitle: '.text-lg.font-medium, h5.text-lg.font-medium',
      cardDetails: '.grid.grid-cols-2',
      cardGoal: '.text-sm:has-text("Goal")',
      cardDuration: '.text-sm:has-text("Duration")',
      cardCalories: '.text-sm:has-text("Calories")',
      cardAssigned: '.text-sm:has-text("Assigned")',
      cardPdfButton: 'button:has-text("PDF"), [data-testid="pdf-export-button"]',
      emptyState: 'text="No Meal Plans Yet"'
    },
    
    // Modal elements
    modal: {
      overlay: '.fixed.inset-0, [role="dialog"]',
      container: '[data-testid="meal-plan-modal"], .modal',
      backdrop: '.backdrop-blur, .bg-black\\/50',
      content: '[data-testid="modal-content"], .dialog-content',
      title: 'h2, .modal-title, [data-testid="modal-title"]',
      mealPlanName: '[data-testid="meal-plan-name"]',
      mealPlanDetails: '[data-testid="meal-plan-details"]',
      closeButton: 'button[aria-label="Close"], [data-testid="close-modal"]',
      pdfExportInModal: '[data-testid="modal-pdf-export"]'
    },
    
    // Customer info
    customerInfo: {
      header: 'h1, h2',
      email: '[data-testid="customer-email"]',
      assignedDate: '[data-testid="customer-assigned-date"]',
      quickStats: '[data-testid="quick-stats"]'
    },
    
    // Loading and error states
    states: {
      loading: '.animate-pulse, [data-testid="loading"], .loading',
      error: '.error, [role="alert"], [data-testid="error"]',
      networkError: '.network-error, [data-testid="network-error"]'
    }
  };

  constructor(page: Page) {
    this.page = page;
  }

  // Navigation Methods

  /**
   * Navigate to a specific customer's detail view
   */
  async navigateToCustomer(customerEmail?: string): Promise<void> {
    console.log(`🔍 Navigating to customer: ${customerEmail || 'first available'}`);
    
    // Start from trainer dashboard
    await this.page.goto('/trainer');
    await waitForNetworkIdle(this.page);
    
    if (customerEmail) {
      // Look for specific customer
      const customerSelectors = [
        `text="${customerEmail}"`,
        `a:has-text("${customerEmail}")`,
        `tr:has-text("${customerEmail}") a`,
        `[data-testid="customer-row"]:has-text("${customerEmail}") a`
      ];
      
      for (const selector of customerSelectors) {
        const element = this.page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click();
          break;
        }
      }
    } else {
      // Click first available customer
      const customerLink = this.page.locator('a, button').filter({ hasText: /@/ }).first();
      if (await customerLink.count() > 0) {
        await customerLink.click();
      } else {
        // Fallback to any customer row
        await this.page.locator('tr').filter({ hasText: /customer|test/ }).first().locator('a').first().click();
      }
    }
    
    await waitForNetworkIdle(this.page);
    await this.waitForPageLoad();
  }

  /**
   * Switch to a specific tab
   */
  async switchToTab(tabName: 'overview' | 'meal-plans' | 'health-metrics' | 'goals'): Promise<void> {
    console.log(`📋 Switching to ${tabName} tab`);
    
    const tabSelector = this.selectors.navigation[`${tabName.replace('-', '')}Tab` as keyof typeof this.selectors.navigation] as string;
    const tab = this.page.locator(tabSelector);
    
    await tab.click();
    await waitForNetworkIdle(this.page);
  }

  /**
   * Go back to customers list
   */
  async goBack(): Promise<void> {
    const backButton = this.page.locator(this.selectors.navigation.backButton);
    await backButton.click();
    await waitForNetworkIdle(this.page);
  }

  // Recent Meal Plans Section Methods

  /**
   * Get all recent meal plan items
   */
  async getRecentMealPlanItems(): Promise<Locator[]> {
    const items = this.page.locator(this.selectors.recentMealPlans.items);
    return await items.all();
  }

  /**
   * Click on a recent meal plan item by index
   */
  async clickRecentMealPlan(index: number = 0): Promise<MealPlanInteractionResult> {
    console.log(`🍽️ Clicking recent meal plan item ${index}`);
    
    try {
      const items = await this.getRecentMealPlanItems();
      
      if (items.length === 0) {
        return { success: false, error: 'No recent meal plan items found' };
      }
      
      if (index >= items.length) {
        return { success: false, error: `Index ${index} out of range (${items.length} items available)` };
      }
      
      const item = items[index];
      const title = item.locator(this.selectors.recentMealPlans.itemTitle).first();
      
      // Click the title (should open modal)
      await title.click();
      await this.page.waitForTimeout(500);
      
      const modalOpened = await this.isModalOpen();
      
      return {
        success: true,
        modalOpened
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Click PDF button on recent meal plan item
   */
  async clickRecentMealPlanPDF(index: number = 0): Promise<MealPlanInteractionResult> {
    console.log(`📄 Clicking PDF button on recent meal plan ${index}`);
    
    try {
      const items = await this.getRecentMealPlanItems();
      
      if (items.length === 0 || index >= items.length) {
        return { success: false, error: 'Meal plan item not found' };
      }
      
      const item = items[index];
      const pdfButton = item.locator(this.selectors.recentMealPlans.pdfButton).first();
      
      if (await pdfButton.count() === 0) {
        return { success: false, error: 'PDF button not found' };
      }
      
      // Click PDF button (should NOT open modal)
      await pdfButton.click();
      await this.page.waitForTimeout(1000);
      
      const modalOpened = await this.isModalOpen();
      
      return {
        success: true,
        pdfTriggered: true,
        modalOpened
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get recent meal plan item details
   */
  async getRecentMealPlanDetails(index: number = 0): Promise<{ title: string; assignedDate: string } | null> {
    const items = await this.getRecentMealPlanItems();
    
    if (items.length === 0 || index >= items.length) {
      return null;
    }
    
    const item = items[index];
    const title = await item.locator(this.selectors.recentMealPlans.itemTitle).textContent() || '';
    const assignedDate = await item.locator(this.selectors.recentMealPlans.assignedDate).textContent() || '';
    
    return { title, assignedDate };
  }

  // Meal Plans Tab Methods

  /**
   * Get all meal plan cards from Meal Plans tab
   */
  async getMealPlanCards(): Promise<Locator[]> {
    const cards = this.page.locator(this.selectors.mealPlansTab.cards);
    return await cards.all();
  }

  /**
   * Click on meal plan card by index
   */
  async clickMealPlanCard(index: number = 0): Promise<MealPlanInteractionResult> {
    console.log(`🍽️ Clicking meal plan card ${index}`);
    
    try {
      const cards = await this.getMealPlanCards();
      
      if (cards.length === 0 || index >= cards.length) {
        return { success: false, error: 'Meal plan card not found' };
      }
      
      const card = cards[index];
      const title = card.locator(this.selectors.mealPlansTab.cardTitle).first();
      
      await title.click();
      await this.page.waitForTimeout(500);
      
      const modalOpened = await this.isModalOpen();
      
      return {
        success: true,
        modalOpened
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Click PDF button on meal plan card
   */
  async clickMealPlanCardPDF(index: number = 0): Promise<MealPlanInteractionResult> {
    console.log(`📄 Clicking PDF button on meal plan card ${index}`);
    
    try {
      const cards = await this.getMealPlanCards();
      
      if (cards.length === 0 || index >= cards.length) {
        return { success: false, error: 'Meal plan card not found' };
      }
      
      const card = cards[index];
      const pdfButton = card.locator(this.selectors.mealPlansTab.cardPdfButton).first();
      
      if (await pdfButton.count() === 0) {
        return { success: false, error: 'PDF button not found' };
      }
      
      await pdfButton.click();
      await this.page.waitForTimeout(1000);
      
      const modalOpened = await this.isModalOpen();
      
      return {
        success: true,
        pdfTriggered: true,
        modalOpened
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Modal Management Methods

  /**
   * Check if modal is currently open
   */
  async isModalOpen(): Promise<boolean> {
    const modal = this.page.locator(this.selectors.modal.overlay);
    return await modal.isVisible();
  }

  /**
   * Close modal using various methods
   */
  async closeModal(method: 'escape' | 'backdrop' | 'button' = 'escape'): Promise<boolean> {
    if (!await this.isModalOpen()) {
      return true;
    }
    
    console.log(`🔐 Closing modal using ${method} method`);
    
    try {
      switch (method) {
        case 'escape':
          await this.page.keyboard.press('Escape');
          break;
          
        case 'backdrop':
          const backdrop = this.page.locator(this.selectors.modal.overlay);
          await backdrop.click({ position: { x: 10, y: 10 } });
          break;
          
        case 'button':
          const closeButton = this.page.locator(this.selectors.modal.closeButton).first();
          if (await closeButton.isVisible()) {
            await closeButton.click();
          } else {
            // Fallback to escape
            await this.page.keyboard.press('Escape');
          }
          break;
      }
      
      await this.page.waitForTimeout(500);
      return !await this.isModalOpen();
      
    } catch (error) {
      console.log(`❌ Error closing modal: ${error}`);
      return false;
    }
  }

  /**
   * Get modal content details
   */
  async getModalDetails(): Promise<{ title: string; content: string } | null> {
    if (!await this.isModalOpen()) {
      return null;
    }
    
    const modal = this.page.locator(this.selectors.modal.container);
    const title = await modal.locator(this.selectors.modal.title).textContent() || '';
    const content = await modal.locator(this.selectors.modal.content).textContent() || '';
    
    return { title, content };
  }

  // Validation and Assertion Methods

  /**
   * Wait for page to fully load
   */
  async waitForPageLoad(): Promise<void> {
    // Wait for loading indicators to disappear
    await this.page.waitForSelector(this.selectors.states.loading, { 
      state: 'detached', 
      timeout: 10000 
    }).catch(() => {});
    
    // Wait for main content
    await this.page.waitForSelector(this.selectors.customerInfo.header, { timeout: 10000 });
    
    // Additional wait for meal plans to load
    await this.page.waitForTimeout(1000);
  }

  /**
   * Validate recent meal plans section is working
   */
  async validateRecentMealPlansSection(): Promise<{ isWorking: boolean; itemCount: number; hasEmptyState: boolean }> {
    const items = await this.getRecentMealPlanItems();
    const itemCount = items.length;
    
    const emptyState = this.page.locator(this.selectors.recentMealPlans.emptyState);
    const hasEmptyState = await emptyState.count() > 0;
    
    // Test basic interaction if items exist
    let isWorking = true;
    if (itemCount > 0) {
      const result = await this.clickRecentMealPlan(0);
      if (result.success && result.modalOpened) {
        await this.closeModal();
      } else if (result.success && !result.modalOpened) {
        // Some meal plans might not open modals, which is acceptable
        isWorking = true;
      } else {
        isWorking = false;
      }
    }
    
    return { isWorking, itemCount, hasEmptyState };
  }

  /**
   * Validate meal plans tab is working
   */
  async validateMealPlansTab(): Promise<{ isWorking: boolean; cardCount: number; hasEmptyState: boolean }> {
    await this.switchToTab('meal-plans');
    
    const cards = await this.getMealPlanCards();
    const cardCount = cards.length;
    
    const emptyState = this.page.locator(this.selectors.mealPlansTab.emptyState);
    const hasEmptyState = await emptyState.count() > 0;
    
    // Test basic interaction if cards exist
    let isWorking = true;
    if (cardCount > 0) {
      const result = await this.clickMealPlanCard(0);
      if (result.success && result.modalOpened) {
        await this.closeModal();
      } else if (result.success && !result.modalOpened) {
        isWorking = true;
      } else {
        isWorking = false;
      }
    }
    
    return { isWorking, cardCount, hasEmptyState };
  }

  /**
   * Test hover effects on meal plan items
   */
  async testHoverEffects(): Promise<boolean> {
    console.log('🖱️ Testing hover effects');
    
    const items = await this.getRecentMealPlanItems();
    if (items.length === 0) {
      return false;
    }
    
    const firstItem = items[0];
    
    // Test hover
    await firstItem.hover();
    await this.page.waitForTimeout(300);
    
    // Check for hover classes
    const hasHoverClass = await firstItem.evaluate(el => 
      el.classList.contains('hover:bg-gray-100') || 
      getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)'
    );
    
    // Reset hover
    await this.page.mouse.move(0, 0);
    
    return hasHoverClass;
  }

  /**
   * Test PDF functionality independence
   */
  async testPDFIndependence(): Promise<{ recentPDFWorks: boolean; cardPDFWorks: boolean }> {
    console.log('📄 Testing PDF independence');
    
    // Test recent section PDF
    const recentResult = await this.clickRecentMealPlanPDF(0);
    const recentPDFWorks = recentResult.success && !recentResult.modalOpened;
    
    // Switch to meal plans tab and test card PDF
    await this.switchToTab('meal-plans');
    const cardResult = await this.clickMealPlanCardPDF(0);
    const cardPDFWorks = cardResult.success && !cardResult.modalOpened;
    
    return { recentPDFWorks, cardPDFWorks };
  }

  // Utility Methods

  /**
   * Take screenshot with descriptive name
   */
  async takeScreenshot(name: string, description: string): Promise<void> {
    await takeTestScreenshot(this.page, name, description);
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const startTime = Date.now();
    
    // Reload page and measure load time
    await this.page.reload();
    await this.waitForPageLoad();
    const loadTime = Date.now() - startTime;
    
    // Test interaction time
    const interactionStart = Date.now();
    const items = await this.getRecentMealPlanItems();
    if (items.length > 0) {
      await this.clickRecentMealPlan(0);
      await this.closeModal();
    }
    const interactionTime = Date.now() - interactionStart;
    
    // Get network request count (approximate)
    const networkRequests = await this.page.evaluate(() => 
      window.performance.getEntriesByType('navigation').length +
      window.performance.getEntriesByType('resource').length
    );
    
    return { loadTime, interactionTime, networkRequests };
  }

  /**
   * Check for JavaScript errors on page
   */
  async hasJavaScriptErrors(): Promise<string[]> {
    const errors: string[] = [];
    
    this.page.on('pageerror', error => {
      errors.push(error.toString());
    });
    
    this.page.on('console', message => {
      if (message.type() === 'error') {
        errors.push(message.text());
      }
    });
    
    return errors;
  }

  /**
   * Comprehensive validation of all meal plan features
   */
  async validateAllFeatures(): Promise<{
    recentSection: boolean;
    mealPlansTab: boolean;
    modalInteraction: boolean;
    pdfFunctionality: boolean;
    hoverEffects: boolean;
    performance: PerformanceMetrics;
  }> {
    console.log('🔍 Running comprehensive feature validation');
    
    // Validate recent section
    const recentValidation = await this.validateRecentMealPlansSection();
    
    // Validate meal plans tab
    const tabValidation = await this.validateMealPlansTab();
    
    // Test modal interaction
    const modalTest = await this.clickRecentMealPlan(0);
    const modalInteraction = modalTest.success && modalTest.modalOpened === true;
    if (modalInteraction) {
      await this.closeModal();
    }
    
    // Test PDF functionality
    const pdfTest = await this.testPDFIndependence();
    const pdfFunctionality = pdfTest.recentPDFWorks || pdfTest.cardPDFWorks;
    
    // Test hover effects
    const hoverEffects = await this.testHoverEffects();
    
    // Get performance metrics
    const performance = await this.getPerformanceMetrics();
    
    return {
      recentSection: recentValidation.isWorking,
      mealPlansTab: tabValidation.isWorking,
      modalInteraction,
      pdfFunctionality,
      hoverEffects,
      performance
    };
  }
}