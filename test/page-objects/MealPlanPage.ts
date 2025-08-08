/**
 * Meal Plan Page Object Model
 * Handles meal plan creation and management interactions
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class MealPlanPage extends BasePage {
  private selectors = {
    // Meal plan generation
    generateButton: 'button:has-text("Generate"), [data-testid="generate-meal-plan"]',
    mealPlanModal: '.modal, [data-testid="meal-plan-modal"]',
    
    // Meal plan display
    mealPlanCard: '.meal-plan-card, [data-testid="meal-plan-card"]',
    mealPlanList: '.meal-plan-list, [data-testid="meal-plans"]',
    recipeCard: '.recipe-card, [data-testid="recipe-card"]',
    
    // PDF export
    exportButton: 'button:has-text("Export"), button:has-text("PDF"), [data-testid="export-pdf"]',
    downloadLink: 'a[download], [data-testid="download"]',
    
    // Meal plan details
    mealPlanTitle: '.meal-plan-title, [data-testid="meal-plan-title"]',
    recipeName: '.recipe-name, [data-testid="recipe-name"]',
    nutrition: '.nutrition, [data-testid="nutrition"]',
    
    // Form elements for meal plan creation
    customerSelect: 'select[name*="customer"], [data-testid="customer-select"]',
    goalInput: 'input[name*="goal"], [data-testid="goal"]',
    caloriesInput: 'input[name*="calorie"], [data-testid="calories"]',
    proteinInput: 'input[name*="protein"], [data-testid="protein"]',
    
    // Loading states
    loadingSpinner: '.loading, .spinner, [data-testid="loading"]',
    
    // Error states
    errorMessage: '.error, .alert-error, [data-testid="error"]'
  };

  constructor(page: Page, baseUrl?: string) {
    super(page, baseUrl);
  }

  /**
   * Navigate to meal plan page
   */
  async navigateToMealPlans() {
    // Try different paths depending on user role
    const possiblePaths = ['/my-meal-plans', '/trainer', '/meal-plans'];
    
    for (const path of possiblePaths) {
      try {
        await this.goto(path);
        await this.waitForPageLoad();
        
        // Check if we found meal plan content
        if (await this.hasMealPlanContent()) {
          return;
        }
      } catch {
        continue;
      }
    }
    
    throw new Error('Could not navigate to meal plans page');
  }

  /**
   * Check if page has meal plan content
   */
  async hasMealPlanContent(): Promise<boolean> {
    return await this.elementExists(this.selectors.mealPlanList) ||
           await this.elementExists(this.selectors.generateButton) ||
           await this.elementExists(this.selectors.mealPlanCard);
  }

  /**
   * Generate a new meal plan
   */
  async generateMealPlan(options?: {
    customer?: string;
    goal?: string;
    calories?: string;
    protein?: string;
  }) {
    await this.addVisualIndicator('Generating Meal Plan');
    
    // Fill form if options provided
    if (options) {
      if (options.customer && await this.elementExists(this.selectors.customerSelect)) {
        await this.page.selectOption(this.selectors.customerSelect, options.customer);
      }
      
      if (options.goal && await this.elementExists(this.selectors.goalInput)) {
        await this.page.fill(this.selectors.goalInput, options.goal);
      }
      
      if (options.calories && await this.elementExists(this.selectors.caloriesInput)) {
        await this.page.fill(this.selectors.caloriesInput, options.calories);
      }
      
      if (options.protein && await this.elementExists(this.selectors.proteinInput)) {
        await this.page.fill(this.selectors.proteinInput, options.protein);
      }
    }
    
    // Click generate button
    const generateButton = this.page.locator(this.selectors.generateButton).first();
    if (await generateButton.isVisible({ timeout: 2000 })) {
      await generateButton.click();
      
      // Wait for loading to complete
      await this.waitForGeneration();
    } else {
      throw new Error('Generate meal plan button not found or not visible');
    }
  }

  /**
   * Wait for meal plan generation to complete
   */
  async waitForGeneration() {
    await this.addVisualIndicator('Waiting for Generation');
    
    // Wait for loading spinner to disappear or meal plan to appear
    try {
      await Promise.race([
        this.page.waitForSelector(this.selectors.loadingSpinner, { state: 'hidden', timeout: 30000 }),
        this.page.waitForSelector(this.selectors.mealPlanCard, { timeout: 30000 }),
        this.page.waitForSelector(this.selectors.recipeCard, { timeout: 30000 })
      ]);
    } catch {
      // Check for errors
      const hasError = await this.elementExists(this.selectors.errorMessage);
      if (hasError) {
        const errorText = await this.page.textContent(this.selectors.errorMessage);
        throw new Error(`Meal plan generation failed: ${errorText}`);
      }
    }
    
    await this.waitForPageLoad();
  }

  /**
   * Export meal plan as PDF
   */
  async exportToPdf() {
    await this.addVisualIndicator('Exporting to PDF');
    
    const exportButton = this.page.locator(this.selectors.exportButton).first();
    if (await exportButton.isVisible({ timeout: 2000 })) {
      // Start waiting for download before clicking
      const downloadPromise = this.page.waitForDownload({ timeout: 30000 });
      
      await exportButton.click();
      
      // Wait for download to start
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toMatch(/\.pdf$/);
      
      return download.suggestedFilename();
    } else {
      throw new Error('Export PDF button not found or not visible');
    }
  }

  /**
   * Verify meal plan content
   */
  async verifyMealPlanContent() {
    await this.addVisualIndicator('Verifying Meal Plan Content');
    
    // Check for meal plan cards or recipes
    const hasMealPlans = await this.elementExists(this.selectors.mealPlanCard);
    const hasRecipes = await this.elementExists(this.selectors.recipeCard);
    
    expect(hasMealPlans || hasRecipes).toBeTruthy();
    
    // If meal plans exist, verify they have content
    if (hasMealPlans) {
      const mealPlanCards = await this.page.$$(this.selectors.mealPlanCard);
      expect(mealPlanCards.length).toBeGreaterThan(0);
      
      // Verify first meal plan has content
      const firstCard = mealPlanCards[0];
      const cardText = await firstCard.textContent();
      expect(cardText?.length).toBeGreaterThan(0);
    }
    
    return { hasMealPlans, hasRecipes };
  }

  /**
   * Get number of meal plans displayed
   */
  async getMealPlanCount(): Promise<number> {
    const mealPlanCards = await this.page.$$(this.selectors.mealPlanCard);
    return mealPlanCards.length;
  }

  /**
   * Get number of recipes displayed
   */
  async getRecipeCount(): Promise<number> {
    const recipeCards = await this.page.$$(this.selectors.recipeCard);
    return recipeCards.length;
  }

  /**
   * Click on first meal plan to view details
   */
  async viewMealPlanDetails() {
    const firstMealPlan = this.page.locator(this.selectors.mealPlanCard).first();
    if (await firstMealPlan.isVisible({ timeout: 2000 })) {
      await firstMealPlan.click();
      await this.waitForPageLoad();
      
      // Wait for modal or navigation
      await this.page.waitForTimeout(2000);
    }
  }

  /**
   * Check for error messages
   */
  async hasErrors(): Promise<boolean> {
    return await this.elementExists(this.selectors.errorMessage);
  }

  /**
   * Get error messages
   */
  async getErrors(): Promise<string[]> {
    const errorElements = await this.page.$$(this.selectors.errorMessage);
    const errors: string[] = [];
    
    for (const element of errorElements) {
      const text = await element.textContent();
      if (text) {
        errors.push(text.trim());
      }
    }
    
    return errors;
  }
}