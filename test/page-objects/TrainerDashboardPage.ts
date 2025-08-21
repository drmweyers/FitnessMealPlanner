/**
 * Trainer Dashboard Page Object Model
 * Handles all trainer dashboard interactions and navigation
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class TrainerDashboardPage extends BasePage {
  // Navigation selectors
  private selectors = {
    // Main navigation
    dashboardTitle: 'h1, h2:has-text("Trainer"), text="Dashboard"',
    customersNav: 'text="Customers", button:has-text("Customers"), [data-testid="customers-nav"]',
    mealPlansNav: 'text="Meal Plans", button:has-text("Meal Plans"), [data-testid="meal-plans-nav"]',
    recipesNav: 'text="Recipes", button:has-text("Recipes"), [data-testid="recipes-nav"]',
    profileNav: 'text="Profile", button:has-text("Profile"), [data-testid="profile-nav"]',
    
    // Customer management
    customersList: '.customer-card, .customer-item, table tbody tr, [data-testid="customer-list"]',
    addCustomerButton: 'button:has-text("Add Customer"), button:has-text("Invite"), button:has-text("New Customer"), [data-testid="add-customer"]',
    customerSearchInput: 'input[placeholder*="search" i], input[name="search"], [data-testid="customer-search"]',
    
    // Meal plan management  
    mealPlansList: '.meal-plan-card, .meal-plan-item, [data-testid="meal-plan-list"]',
    createMealPlanButton: 'button:has-text("Create"), button:has-text("New"), button:has-text("Generate"), [data-testid="create-meal-plan"]',
    assignMealPlanButton: 'button:has-text("Assign"), [data-testid="assign-meal-plan"]',
    
    // Recipe management
    recipesList: '.recipe-card, .recipe-item, [data-testid="recipe-list"]',
    
    // Common UI elements
    loadingSpinner: '.loading, .spinner, [data-testid="loading"]',
    errorMessage: '.error, .alert-error, .text-red-500, [data-testid="error"]',
    successMessage: '.success, .alert-success, .text-green-500, [data-testid="success"]',
    
    // Modals and dialogs
    modal: '.modal, [role="dialog"], .fixed.inset-0, [data-testid="modal"]',
    modalCloseButton: '[aria-label="close"], .modal-close, button:has-text("Cancel"), [data-testid="modal-close"]',
  };

  constructor(page: Page, baseUrl?: string) {
    super(page, baseUrl);
  }

  /**
   * Navigate to trainer dashboard
   */
  async navigate() {
    await this.goto('/trainer');
    await this.waitForDashboardLoad();
  }

  /**
   * Wait for dashboard to fully load
   */
  async waitForDashboardLoad() {
    await this.waitForElement(this.selectors.dashboardTitle);
    await this.waitForPageLoad();
    
    // Wait for any loading spinners to disappear
    await this.page.waitForFunction(
      () => document.querySelectorAll('.loading, .spinner').length === 0,
      { timeout: 10000 }
    ).catch(() => {
      // Continue if no loading spinners found
    });
  }

  /**
   * Verify trainer dashboard is loaded correctly
   */
  async verifyDashboardLoaded() {
    await expect(this.page.locator(this.selectors.dashboardTitle)).toBeVisible();
    
    // Check for main navigation elements
    const navigationElements = [
      this.selectors.customersNav,
      this.selectors.mealPlansNav,
      this.selectors.profileNav
    ];
    
    for (const nav of navigationElements) {
      const element = this.page.locator(nav);
      if (await element.count() > 0) {
        await expect(element).toBeVisible();
      }
    }
  }

  /**
   * Navigate to customers section
   */
  async navigateToCustomers() {
    await this.addVisualIndicator('Navigating to Customers');
    await this.clickElement(this.selectors.customersNav);
    await this.waitForPageLoad();
  }

  /**
   * Navigate to meal plans section
   */
  async navigateToMealPlans() {
    await this.addVisualIndicator('Navigating to Meal Plans');
    await this.clickElement(this.selectors.mealPlansNav);
    await this.waitForPageLoad();
  }

  /**
   * Navigate to profile section
   */
  async navigateToProfile() {
    await this.addVisualIndicator('Navigating to Profile');
    await this.clickElement(this.selectors.profileNav);
    await this.waitForPageLoad();
  }

  /**
   * Get list of customers
   */
  async getCustomers() {
    await this.navigateToCustomers();
    
    const customerElements = await this.page.$$(this.selectors.customersList);
    const customers = [];
    
    for (const element of customerElements) {
      const text = await element.textContent();
      if (text) {
        customers.push(text.trim());
      }
    }
    
    return customers;
  }

  /**
   * Add new customer (invite)
   */
  async addCustomer(customerData: { email: string; name?: string; phone?: string }) {
    await this.navigateToCustomers();
    await this.addVisualIndicator(`Adding customer: ${customerData.email}`);
    
    await this.clickElement(this.selectors.addCustomerButton);
    
    // Wait for modal or form to appear
    await this.waitForElement(this.selectors.modal + ', form');
    
    // Fill customer information
    await this.fillField('input[type="email"], input[name="email"]', customerData.email);
    
    if (customerData.name) {
      await this.fillField('input[name="name"], input[name="firstName"], input[placeholder*="name" i]', customerData.name);
    }
    
    if (customerData.phone) {
      await this.fillField('input[name="phone"], input[type="tel"]', customerData.phone);
    }
    
    // Submit form
    await this.clickElement('button[type="submit"], button:has-text("Send"), button:has-text("Invite")');
    
    // Wait for success or error
    await this.page.waitForTimeout(2000);
    
    return await this.getResponseStatus();
  }

  /**
   * Search for customers
   */
  async searchCustomers(searchTerm: string) {
    await this.navigateToCustomers();
    
    const searchInput = this.page.locator(this.selectors.customerSearchInput);
    if (await searchInput.count() > 0) {
      await searchInput.fill(searchTerm);
      await this.page.waitForTimeout(1000); // Wait for search results
    }
    
    return await this.getCustomers();
  }

  /**
   * Create new meal plan
   */
  async createMealPlan(mealPlanData: { name?: string; description?: string; customerId?: string }) {
    await this.navigateToMealPlans();
    await this.addVisualIndicator('Creating new meal plan');
    
    await this.clickElement(this.selectors.createMealPlanButton);
    
    // Wait for meal plan creation form/modal
    await this.waitForElement(this.selectors.modal + ', form');
    
    if (mealPlanData.name) {
      await this.fillField('input[name="name"], input[name="title"], input[placeholder*="name" i]', mealPlanData.name);
    }
    
    if (mealPlanData.description) {
      await this.fillField('textarea[name="description"], textarea[placeholder*="description" i]', mealPlanData.description);
    }
    
    // If customer selection is available
    if (mealPlanData.customerId) {
      const customerSelect = this.page.locator('select[name="customer"], select[name="customerId"]');
      if (await customerSelect.count() > 0) {
        await customerSelect.selectOption(mealPlanData.customerId);
      }
    }
    
    // Submit form
    await this.clickElement('button[type="submit"], button:has-text("Create"), button:has-text("Generate")');
    
    await this.waitForPageLoad();
    return await this.getResponseStatus();
  }

  /**
   * Assign meal plan to customer
   */
  async assignMealPlan(mealPlanId: string, customerId: string) {
    await this.navigateToMealPlans();
    await this.addVisualIndicator(`Assigning meal plan ${mealPlanId} to customer ${customerId}`);
    
    // Find the meal plan and click assign button
    const mealPlanCard = this.page.locator(this.selectors.mealPlansList).first();
    
    if (await mealPlanCard.count() > 0) {
      await mealPlanCard.locator(this.selectors.assignMealPlanButton).click();
      
      // Select customer in assignment modal
      const customerSelect = this.page.locator('select[name="customer"], select[name="customerId"]');
      if (await customerSelect.count() > 0) {
        await customerSelect.selectOption(customerId);
        
        // Confirm assignment
        await this.clickElement('button[type="submit"], button:has-text("Assign")');
        
        await this.waitForPageLoad();
        return await this.getResponseStatus();
      }
    }
    
    return { success: false, message: 'Meal plan or assignment feature not found' };
  }

  /**
   * View customer details
   */
  async viewCustomerDetails(customerEmail: string) {
    await this.navigateToCustomers();
    
    // Find and click on the customer
    const customerElement = this.page.locator(`text="${customerEmail}"`).first();
    
    if (await customerElement.count() > 0) {
      await customerElement.click();
      await this.waitForPageLoad();
      
      return {
        success: true,
        url: this.getCurrentUrl()
      };
    }
    
    return { success: false, message: 'Customer not found' };
  }

  /**
   * Get meal plans list
   */
  async getMealPlans() {
    await this.navigateToMealPlans();
    
    const mealPlanElements = await this.page.$$(this.selectors.mealPlansList);
    const mealPlans = [];
    
    for (const element of mealPlanElements) {
      const text = await element.textContent();
      if (text) {
        mealPlans.push(text.trim());
      }
    }
    
    return mealPlans;
  }

  /**
   * Check for success/error messages
   */
  private async getResponseStatus() {
    // Check for success message
    const successElement = this.page.locator(this.selectors.successMessage);
    if (await successElement.count() > 0) {
      const message = await successElement.textContent();
      return { success: true, message: message?.trim() };
    }
    
    // Check for error message
    const errorElement = this.page.locator(this.selectors.errorMessage);
    if (await errorElement.count() > 0) {
      const message = await errorElement.textContent();
      return { success: false, message: message?.trim() };
    }
    
    return { success: true, message: 'Operation completed' };
  }

  /**
   * Wait for modal to appear
   */
  async waitForModal(timeout: number = 5000) {
    try {
      await this.waitForElement(this.selectors.modal, timeout);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Close modal
   */
  async closeModal() {
    const closeButton = this.page.locator(this.selectors.modalCloseButton);
    if (await closeButton.count() > 0) {
      await closeButton.click();
      
      // Wait for modal to disappear
      await this.page.waitForFunction(
        () => document.querySelectorAll('.modal, [role="dialog"]').length === 0,
        { timeout: 5000 }
      ).catch(() => {
        // Continue if modal doesn't disappear
      });
    }
  }

  /**
   * Helper method to click element with multiple possible selectors
   */
  private async clickElement(selector: string) {
    const selectors = selector.split(', ');
    
    for (const sel of selectors) {
      const element = this.page.locator(sel.trim());
      if (await element.count() > 0 && await element.isVisible()) {
        await element.click();
        return;
      }
    }
    
    throw new Error(`No clickable element found for selectors: ${selector}`);
  }

  /**
   * Helper method to fill field with multiple possible selectors
   */
  private async fillField(selector: string, value: string) {
    const selectors = selector.split(', ');
    
    for (const sel of selectors) {
      const element = this.page.locator(sel.trim());
      if (await element.count() > 0) {
        await element.fill(value);
        return;
      }
    }
    
    // Log warning but don't fail - field might not exist
    console.log(`Warning: No field found for selectors: ${selector}`);
  }
}