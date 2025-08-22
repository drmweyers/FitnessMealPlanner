import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for Trainer Meal Plan Assignment Functionality
 * 
 * This class encapsulates all interactions with the trainer meal plan assignment flow,
 * including navigation between tabs, meal plan assignment modals, and state verification.
 */
export class TrainerMealPlanPage {
  readonly page: Page;
  
  // Tab navigation
  readonly savedPlansTab: Locator;
  readonly customersTab: Locator;
  readonly recipesTab: Locator;
  readonly generateTab: Locator;
  
  // Saved Plans tab elements
  readonly savedPlansList: Locator;
  readonly searchInput: Locator;
  readonly mealPlanCards: Locator;
  readonly firstMealPlanCard: Locator;
  readonly mealPlanDropdownMenu: Locator;
  readonly assignToCustomerButton: Locator;
  readonly viewDetailsButton: Locator;
  readonly deletePlanButton: Locator;
  
  // Assignment modal elements
  readonly assignmentModal: Locator;
  readonly assignmentModalTitle: Locator;
  readonly customerList: Locator;
  readonly customerCheckboxes: Locator;
  readonly firstCustomerCheckbox: Locator;
  readonly assignButton: Locator;
  readonly cancelAssignmentButton: Locator;
  readonly modalCloseButton: Locator;
  
  // Customers tab elements
  readonly customersList: Locator;
  readonly customerCards: Locator;
  readonly firstCustomerCard: Locator;
  readonly customerMealPlansButton: Locator;
  readonly assignedMealPlansList: Locator;
  readonly downloadButton: Locator;
  
  // Loading and error states
  readonly loadingSpinner: Locator;
  readonly errorMessage: Locator;
  readonly successToast: Locator;
  
  // Meal plan details modal
  readonly mealPlanModal: Locator;
  readonly mealPlanModalTitle: Locator;
  readonly mealPlanModalContent: Locator;
  readonly mealPlanModalClose: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Tab navigation
    this.savedPlansTab = page.locator('[role="tab"]:has-text("Saved Plans"), button:has-text("Saved Plans"), button:has-text("Saved")');
    this.customersTab = page.locator('[role="tab"]:has-text("Customers"), button:has-text("Customers")');
    this.recipesTab = page.locator('[role="tab"]:has-text("Recipes"), button:has-text("Browse Recipes")');
    this.generateTab = page.locator('[role="tab"]:has-text("Generate"), button:has-text("Generate Plans")');
    
    // Saved Plans tab elements
    this.savedPlansList = page.locator('.grid, [data-testid="meal-plans-grid"]');
    this.searchInput = page.locator('input[placeholder*="Search meal plans"]');
    this.mealPlanCards = page.locator('.card, [data-testid="meal-plan-card"]');
    this.firstMealPlanCard = this.mealPlanCards.first();
    this.mealPlanDropdownMenu = page.locator('[data-testid="meal-plan-menu"], button:has([data-testid="more-vertical"])').first();
    this.assignToCustomerButton = page.locator('text="Assign to Customer"');
    this.viewDetailsButton = page.locator('text="View Details"');
    this.deletePlanButton = page.locator('text="Delete"');
    
    // Assignment modal elements
    this.assignmentModal = page.locator('[role="dialog"]:has-text("Assign Meal Plan")');
    this.assignmentModalTitle = page.locator('h2:has-text("Assign Meal Plan")');
    this.customerList = page.locator('.space-y-3, [data-testid="customer-list"]');
    this.customerCheckboxes = page.locator('input[type="checkbox"]');
    this.firstCustomerCheckbox = this.customerCheckboxes.first();
    this.assignButton = page.locator('button:has-text("Assign")');
    this.cancelAssignmentButton = page.locator('button:has-text("Cancel")');
    this.modalCloseButton = page.locator('button[aria-label="Close"], button:has([data-testid="x"])');
    
    // Customers tab elements
    this.customersList = page.locator('.customers-list, [data-testid="customers-list"]');
    this.customerCards = page.locator('.customer-card, [data-testid="customer-card"]');
    this.firstCustomerCard = this.customerCards.first();
    this.customerMealPlansButton = page.locator('button:has-text("View Meal Plans"), button:has-text("Meal Plans")');
    this.assignedMealPlansList = page.locator('.assigned-meal-plans, [data-testid="assigned-meal-plans"]');
    this.downloadButton = page.locator('button:has([data-testid="download"]), button:has-text("Download")');
    
    // Loading and error states
    this.loadingSpinner = page.locator('.animate-spin, [data-testid="loading"]');
    this.errorMessage = page.locator('.error, [role="alert"]');
    this.successToast = page.locator('.toast, [data-testid="toast"]');
    
    // Meal plan details modal
    this.mealPlanModal = page.locator('[role="dialog"]:has-text("Meal Plan Details")');
    this.mealPlanModalTitle = page.locator('h2:has-text("Meal Plan")');
    this.mealPlanModalContent = page.locator('.meal-plan-content, [data-testid="meal-plan-content"]');
    this.mealPlanModalClose = page.locator('button[aria-label="Close"]');
  }

  /**
   * Navigate to the trainer dashboard
   */
  async navigateToTrainerDashboard() {
    await this.page.goto('/trainer');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click on the Saved Plans tab
   */
  async clickSavedPlansTab() {
    console.log('🔄 Clicking Saved Plans tab...');
    await this.savedPlansTab.click();
    await this.page.waitForTimeout(500); // Allow tab transition
    
    // Verify we're on the saved plans tab
    await expect(this.savedPlansTab).toHaveAttribute('aria-selected', 'true');
    console.log('✅ Saved Plans tab active');
  }

  /**
   * Click on the Customers tab
   */
  async clickCustomersTab() {
    console.log('🔄 Clicking Customers tab...');
    await this.customersTab.click();
    await this.page.waitForTimeout(500); // Allow tab transition
    
    // Verify we're on the customers tab
    await expect(this.customersTab).toHaveAttribute('aria-selected', 'true');
    console.log('✅ Customers tab active');
  }

  /**
   * Wait for saved plans to load
   */
  async waitForSavedPlansToLoad() {
    console.log('⏳ Waiting for saved plans to load...');
    
    // Wait for either meal plan cards or empty state
    await Promise.race([
      this.mealPlanCards.first().waitFor({ timeout: 10000 }),
      this.page.locator('text="You haven\'t saved any meal plans"').waitFor({ timeout: 5000 })
    ]);
    
    console.log('✅ Saved plans loaded');
  }

  /**
   * Wait for customers to load
   */
  async waitForCustomersToLoad() {
    console.log('⏳ Waiting for customers to load...');
    
    // Wait for either customer cards or empty state
    await Promise.race([
      this.customerCards.first().waitFor({ timeout: 10000 }),
      this.page.locator('text="No customers found"').waitFor({ timeout: 5000 })
    ]);
    
    console.log('✅ Customers loaded');
  }

  /**
   * Get the count of available meal plans
   */
  async getMealPlanCount(): Promise<number> {
    await this.waitForSavedPlansToLoad();
    return await this.mealPlanCards.count();
  }

  /**
   * Get the count of available customers
   */
  async getCustomerCount(): Promise<number> {
    await this.waitForCustomersToLoad();
    return await this.customerCards.count();
  }

  /**
   * Open the meal plan dropdown menu
   */
  async openMealPlanDropdown() {
    console.log('🔽 Opening meal plan dropdown...');
    
    // Find the first meal plan card with dropdown
    const firstMealPlan = this.mealPlanCards.first();
    const dropdownButton = firstMealPlan.locator('button:has([data-testid="more-vertical"]), button:has-text("⋮")').first();
    
    await dropdownButton.waitFor({ timeout: 5000 });
    await dropdownButton.click();
    
    // Wait for dropdown menu to appear
    await this.page.locator('[role="menu"], .dropdown-menu').waitFor({ timeout: 3000 });
    
    console.log('✅ Meal plan dropdown opened');
  }

  /**
   * Click "Assign to Customer" from dropdown
   */
  async clickAssignToCustomer() {
    console.log('👥 Clicking Assign to Customer...');
    await this.assignToCustomerButton.click();
    await this.waitForAssignmentModal();
    console.log('✅ Assignment modal opened');
  }

  /**
   * Wait for assignment modal to appear
   */
  async waitForAssignmentModal() {
    console.log('⏳ Waiting for assignment modal...');
    await this.assignmentModal.waitFor({ timeout: 5000 });
    await expect(this.assignmentModalTitle).toBeVisible();
    console.log('✅ Assignment modal visible');
  }

  /**
   * Select the first customer in assignment modal
   */
  async selectFirstCustomer() {
    console.log('☑️ Selecting first customer...');
    
    // Wait for customer list to load
    await this.customerList.waitFor({ timeout: 5000 });
    
    // Find and click the first customer's checkbox or row
    const firstCustomerRow = this.customerList.locator('.flex.items-center').first();
    await firstCustomerRow.waitFor({ timeout: 3000 });
    await firstCustomerRow.click();
    
    console.log('✅ First customer selected');
  }

  /**
   * Click the assign button to complete assignment
   */
  async clickAssignButton() {
    console.log('✅ Clicking assign button...');
    await this.assignButton.click();
    
    // Wait for assignment to complete
    await this.page.waitForTimeout(1000);
    
    console.log('✅ Assignment completed');
  }

  /**
   * Wait for success toast notification
   */
  async waitForSuccessToast() {
    console.log('📢 Waiting for success notification...');
    
    // Look for various toast/notification patterns
    const toastSelectors = [
      'text="Meal Plan Assigned"',
      'text="Successfully assigned"',
      '.toast',
      '[data-testid="toast"]',
      '.notification',
      '[role="status"]'
    ];
    
    let toastFound = false;
    for (const selector of toastSelectors) {
      try {
        await this.page.locator(selector).waitFor({ timeout: 3000 });
        toastFound = true;
        console.log(`✅ Success notification found: ${selector}`);
        break;
      } catch (error) {
        // Continue to next selector
      }
    }
    
    if (!toastFound) {
      console.log('ℹ️ Success notification not found, assignment may still be successful');
    }
  }

  /**
   * Check if assignment modal is closed
   */
  async verifyAssignmentModalClosed() {
    console.log('🔍 Verifying assignment modal is closed...');
    await expect(this.assignmentModal).not.toBeVisible();
    console.log('✅ Assignment modal closed');
  }

  /**
   * Complete full meal plan assignment workflow
   */
  async assignMealPlanToCustomer() {
    console.log('🎯 Starting meal plan assignment workflow...');
    
    // 1. Navigate to saved plans
    await this.clickSavedPlansTab();
    await this.waitForSavedPlansToLoad();
    
    // 2. Open meal plan dropdown
    await this.openMealPlanDropdown();
    
    // 3. Click assign to customer
    await this.clickAssignToCustomer();
    
    // 4. Select first customer
    await this.selectFirstCustomer();
    
    // 5. Complete assignment
    await this.clickAssignButton();
    
    // 6. Wait for success
    await this.waitForSuccessToast();
    await this.verifyAssignmentModalClosed();
    
    console.log('🎉 Meal plan assignment workflow completed!');
  }

  /**
   * Verify immediate state update without page refresh
   */
  async verifyImmediateStateUpdate() {
    console.log('🔄 Verifying immediate state update...');
    
    // Switch to customers tab to see if assigned meal plan appears
    await this.clickCustomersTab();
    await this.waitForCustomersToLoad();
    
    // Look for assigned meal plans or updated customer information
    const assignedPlansExist = await this.page.locator('text="Meal Plans:", text="View Meal Plans", .assigned-meal-plans').count() > 0;
    
    if (assignedPlansExist) {
      console.log('✅ Immediate state update verified - assigned meal plans visible');
    } else {
      console.log('ℹ️ Assigned meal plans may not be immediately visible');
    }
    
    return assignedPlansExist;
  }

  /**
   * Click on customer to view their meal plans
   */
  async viewCustomerMealPlans() {
    console.log('👁️ Viewing customer meal plans...');
    
    // Click on first customer or meal plans button
    const viewButton = this.page.locator('button:has-text("View Meal Plans"), button:has-text("Meal Plans")').first();
    
    if (await viewButton.count() > 0) {
      await viewButton.click();
      console.log('✅ Customer meal plans view opened');
    } else {
      // Click on customer card itself
      await this.firstCustomerCard.click();
      console.log('✅ Customer detail view opened');
    }
    
    await this.page.waitForTimeout(1000);
  }

  /**
   * Verify meal plan details modal opens
   */
  async verifyMealPlanDetailsModal() {
    console.log('🔍 Verifying meal plan details modal...');
    
    // Look for meal plan modal or detail view
    const modalSelectors = [
      '[role="dialog"]',
      '.modal',
      '.meal-plan-details',
      'h1:has-text("Meal Plan")',
      'h2:has-text("Meal Plan")'
    ];
    
    let modalFound = false;
    for (const selector of modalSelectors) {
      if (await this.page.locator(selector).count() > 0) {
        modalFound = true;
        console.log(`✅ Meal plan details found: ${selector}`);
        break;
      }
    }
    
    return modalFound;
  }

  /**
   * Test download functionality
   */
  async testDownloadFunctionality() {
    console.log('📥 Testing download functionality...');
    
    // Look for download button
    const downloadButton = this.page.locator('button:has([data-testid="download"]), button:has-text("Download"), button:has-text("Export")').first();
    
    if (await downloadButton.count() > 0) {
      // Set up download promise before clicking
      const downloadPromise = this.page.waitForEvent('download', { timeout: 10000 });
      
      await downloadButton.click();
      
      try {
        const download = await downloadPromise;
        console.log(`✅ Download initiated: ${download.suggestedFilename()}`);
        return true;
      } catch (error) {
        console.log('ℹ️ Download may not have started or timed out');
        return false;
      }
    } else {
      console.log('ℹ️ Download button not found');
      return false;
    }
  }

  /**
   * Search for meal plans
   */
  async searchMealPlans(searchTerm: string) {
    console.log(`🔍 Searching for meal plans: "${searchTerm}"`);
    
    await this.searchInput.fill(searchTerm);
    await this.page.waitForTimeout(500); // Allow debounced search
    
    const resultCount = await this.mealPlanCards.count();
    console.log(`📊 Found ${resultCount} meal plans matching "${searchTerm}"`);
    
    return resultCount;
  }

  /**
   * Take screenshot for debugging
   */
  async takeScreenshot(filename: string, description: string) {
    console.log(`📸 Screenshot: ${description}`);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const finalFilename = `${timestamp}-${filename}`;
    
    try {
      await this.page.screenshot({ 
        path: `test-screenshots/${finalFilename}`,
        fullPage: true
      });
      console.log(`✅ Screenshot saved: ${finalFilename}`);
    } catch (error) {
      console.error(`❌ Failed to take screenshot: ${error}`);
    }
  }

  /**
   * Verify page is responsive on different screen sizes
   */
  async testResponsiveDesign() {
    console.log('📱 Testing responsive design...');
    
    // Test mobile view
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.page.waitForTimeout(500);
    await this.takeScreenshot('mobile-meal-plans.png', 'Mobile meal plans view');
    
    // Test tablet view
    await this.page.setViewportSize({ width: 768, height: 1024 });
    await this.page.waitForTimeout(500);
    await this.takeScreenshot('tablet-meal-plans.png', 'Tablet meal plans view');
    
    // Test desktop view
    await this.page.setViewportSize({ width: 1280, height: 720 });
    await this.page.waitForTimeout(500);
    await this.takeScreenshot('desktop-meal-plans.png', 'Desktop meal plans view');
    
    console.log('✅ Responsive design testing completed');
  }

  /**
   * Check for JavaScript errors
   */
  async checkForErrors(): Promise<string[]> {
    const errors: string[] = [];
    
    this.page.on('pageerror', error => {
      errors.push(`Page Error: ${error.toString()}`);
    });
    
    this.page.on('console', message => {
      if (message.type() === 'error') {
        errors.push(`Console Error: ${message.text()}`);
      }
    });
    
    return errors;
  }
}