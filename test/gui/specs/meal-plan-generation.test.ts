import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Browser, Page } from 'puppeteer';
import { BrowserUtils } from '../utils/browser-utils';
import { VisualTesting } from '../utils/visual-testing';
import { testConfig } from '../puppeteer.config';

describe('Meal Plan Generation Tests', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    const setup = await BrowserUtils.setup();
    browser = setup.browser;
    page = setup.page;
    
    // Login before running tests
    await BrowserUtils.login(page);
  });

  afterAll(async () => {
    await BrowserUtils.teardown();
  });

  beforeEach(async () => {
    // Navigate to meal plan generator
    await BrowserUtils.navigateToPage(page, '/meal-plan-generator');
    await page.waitForTimeout(2000);
  });

  describe('Meal Plan Generator Interface', () => {
    it('should display meal plan generator form', async () => {
      // Wait for form to load
      await BrowserUtils.waitForElement(page, 'form, [data-testid="meal-plan-form"]');
      
      // Check for key form elements
      const formElements = {
        clientName: await page.$('input[name="clientName"], [data-testid="client-name"]'),
        days: await page.$('input[name="days"], [data-testid="days"]'),
        mealsPerDay: await page.$('input[name="mealsPerDay"], [data-testid="meals-per-day"]'),
        calorieTarget: await page.$('input[name="dailyCalorieTarget"], [data-testid="calorie-target"]'),
        fitnessGoal: await page.$('select[name="fitnessGoal"], [data-testid="fitness-goal"]'),
        generateButton: await page.$('button[type="submit"], [data-testid="generate-meal-plan"]')
      };
      
      // Verify essential elements exist
      expect(formElements.generateButton).toBeTruthy();
      expect(formElements.days || formElements.calorieTarget).toBeTruthy();
      
      // Visual regression test
      await VisualTesting.hideVolatileElements(page);
      await VisualTesting.waitForAnimations(page);
      
      const visualResult = await VisualTesting.compareScreenshot(page, 'meal-plan-generator');
      expect(visualResult.match).toBe(true);
    });

    it('should validate required fields', async () => {
      // Try to submit empty form
      const submitButton = await page.$('button[type="submit"], [data-testid="generate-meal-plan"]');
      
      if (submitButton) {
        await submitButton.click();
        await page.waitForTimeout(2000);
        
        // Check for validation errors
        const errors = await BrowserUtils.checkForErrors(page);
        const errorElements = await page.$$('.error, [data-testid="error"], .text-red-500');
        
        expect(errors.length > 0 || errorElements.length > 0).toBe(true);
      }
    });

    it('should show advanced options', async () => {
      // Look for advanced options toggle
      const advancedToggle = await page.$('[data-testid="advanced-options"], button:has-text("Advanced")');
      
      if (advancedToggle) {
        await advancedToggle.click();
        await page.waitForTimeout(1000);
        
        // Check for advanced form fields
        const advancedFields = await page.$$('input[name*="protein"], input[name*="carbs"], input[name*="fat"]');
        expect(advancedFields.length).toBeGreaterThan(0);
        
        // Visual test with advanced options
        await VisualTesting.hideVolatileElements(page);
        await VisualTesting.waitForAnimations(page);
        
        const visualResult = await VisualTesting.compareScreenshot(page, 'meal-plan-generator-advanced');
        expect(visualResult.match).toBe(true);
      }
    });
  });

  describe('Meal Plan Generation Process', () => {
    it('should generate a basic meal plan', async () => {
      // Fill required fields
      const clientNameInput = await page.$('input[name="clientName"], [data-testid="client-name"]');
      if (clientNameInput) {
        await BrowserUtils.typeInField(page, 'input[name="clientName"], [data-testid="client-name"]', 'Test Client');
      }
      
      const daysInput = await page.$('input[name="days"], [data-testid="days"]');
      if (daysInput) {
        await BrowserUtils.typeInField(page, 'input[name="days"], [data-testid="days"]', '3');
      }
      
      const mealsInput = await page.$('input[name="mealsPerDay"], [data-testid="meals-per-day"]');
      if (mealsInput) {
        await BrowserUtils.typeInField(page, 'input[name="mealsPerDay"], [data-testid="meals-per-day"]', '3');
      }
      
      const calorieInput = await page.$('input[name="dailyCalorieTarget"], [data-testid="calorie-target"]');
      if (calorieInput) {
        await BrowserUtils.typeInField(page, 'input[name="dailyCalorieTarget"], [data-testid="calorie-target"]', '2000');
      }
      
      const fitnessGoalSelect = await page.$('select[name="fitnessGoal"], [data-testid="fitness-goal"]');
      if (fitnessGoalSelect) {
        await BrowserUtils.selectOption(page, 'select[name="fitnessGoal"], [data-testid="fitness-goal"]', 'weight loss');
      }
      
      // Submit form
      const submitButton = await page.$('button[type="submit"], [data-testid="generate-meal-plan"]');
      if (submitButton) {
        await submitButton.click();
        
        // Wait for generation to start/complete
        await page.waitForTimeout(5000);
        
        // Check for success indicators (meal plan display or success message)
        const successIndicators = await page.$$('[data-testid="meal-plan-result"], .meal-plan-display, .success');
        const errors = await BrowserUtils.checkForErrors(page);
        
        // Should either show meal plan or at least no errors
        expect(errors.length).toBe(0);
        
        // If meal plan is displayed, test its structure
        const mealPlanContainer = await page.$('[data-testid="meal-plan-result"], .meal-plan-display');
        if (mealPlanContainer) {
          // Visual test of generated meal plan
          await VisualTesting.hideVolatileElements(page);
          await VisualTesting.waitForAnimations(page);
          
          const visualResult = await VisualTesting.compareScreenshot(page, 'generated-meal-plan');
          expect(visualResult.match).toBe(true);
        }
      }
    });

    it('should generate meal plan with dietary restrictions', async () => {
      // Fill form with dietary restrictions
      const clientNameInput = await page.$('input[name="clientName"], [data-testid="client-name"]');
      if (clientNameInput) {
        await BrowserUtils.typeInField(page, 'input[name="clientName"], [data-testid="client-name"]', 'Vegan Client');
      }
      
      // Look for dietary restrictions field
      const dietaryInput = await page.$('input[name="dietaryRestrictions"], [data-testid="dietary-restrictions"]');
      if (dietaryInput) {
        await BrowserUtils.typeInField(page, 'input[name="dietaryRestrictions"], [data-testid="dietary-restrictions"]', 'vegan');
      }
      
      // Set other required fields
      const daysInput = await page.$('input[name="days"], [data-testid="days"]');
      if (daysInput) {
        await BrowserUtils.typeInField(page, 'input[name="days"], [data-testid="days"]', '2');
      }
      
      const calorieInput = await page.$('input[name="dailyCalorieTarget"], [data-testid="calorie-target"]');
      if (calorieInput) {
        await BrowserUtils.typeInField(page, 'input[name="dailyCalorieTarget"], [data-testid="calorie-target"]', '1800');
      }
      
      // Submit and verify
      const submitButton = await page.$('button[type="submit"], [data-testid="generate-meal-plan"]');
      if (submitButton) {
        await submitButton.click();
        await page.waitForTimeout(5000);
        
        const errors = await BrowserUtils.checkForErrors(page);
        expect(errors.length).toBe(0);
      }
    });

    it('should handle natural language input', async () => {
      // Look for natural language input field
      const naturalLanguageInput = await page.$('textarea[name="naturalLanguagePrompt"], [data-testid="natural-language"]');
      
      if (naturalLanguageInput) {
        await BrowserUtils.typeInField(
          page, 
          'textarea[name="naturalLanguagePrompt"], [data-testid="natural-language"]', 
          'Create a meal plan for weight loss with high protein meals'
        );
        
        // Fill minimal required fields
        const daysInput = await page.$('input[name="days"], [data-testid="days"]');
        if (daysInput) {
          await BrowserUtils.typeInField(page, 'input[name="days"], [data-testid="days"]', '1');
        }
        
        // Submit
        const submitButton = await page.$('button[type="submit"], [data-testid="generate-meal-plan"]');
        if (submitButton) {
          await submitButton.click();
          await page.waitForTimeout(5000);
          
          const errors = await BrowserUtils.checkForErrors(page);
          expect(errors.length).toBe(0);
        }
      }
    });
  });

  describe('Meal Plan Display and Actions', () => {
    it('should display meal plan details correctly', async () => {
      // Generate a meal plan first (minimal)
      await BrowserUtils.typeInField(page, 'input[name="days"], [data-testid="days"]', '1');
      await BrowserUtils.typeInField(page, 'input[name="dailyCalorieTarget"], [data-testid="calorie-target"]', '1500');
      
      const submitButton = await page.$('button[type="submit"], [data-testid="generate-meal-plan"]');
      if (submitButton) {
        await submitButton.click();
        await page.waitForTimeout(8000); // Wait longer for generation
        
        // Look for meal plan display
        const mealPlanDisplay = await page.$('[data-testid="meal-plan-result"], .meal-plan-display');
        
        if (mealPlanDisplay) {
          // Check for meal plan components
          const dayHeaders = await page.$$('[data-testid="day-header"], .day-header');
          const mealCards = await page.$$('[data-testid="meal-card"], .meal-card');
          const nutritionInfo = await page.$('[data-testid="nutrition-info"], .nutrition-summary');
          
          expect(dayHeaders.length).toBeGreaterThan(0);
          expect(mealCards.length).toBeGreaterThan(0);
          
          // Visual test
          await VisualTesting.hideVolatileElements(page);
          await VisualTesting.waitForAnimations(page);
          
          const visualResult = await VisualTesting.compareScreenshot(page, 'meal-plan-detailed-view');
          expect(visualResult.match).toBe(true);
        }
      }
    });

    it('should allow PDF export', async () => {
      // Look for export button
      const exportButton = await page.$('[data-testid="export-pdf"], button:has-text("Export"), button:has-text("PDF")');
      
      if (exportButton) {
        // Set up download handling
        const downloadPromise = page.waitForEvent('download');
        
        await exportButton.click();
        
        // Wait for download
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('.pdf');
      }
    });

    it('should allow meal plan assignment to customers', async () => {
      // Look for assign button
      const assignButton = await page.$('[data-testid="assign-meal-plan"], button:has-text("Assign")');
      
      if (assignButton) {
        await assignButton.click();
        await page.waitForTimeout(2000);
        
        // Should show customer selection modal
        const customerModal = await page.$('[data-testid="customer-modal"], .customer-selection');
        expect(customerModal).toBeTruthy();
        
        // Visual test of assignment modal
        await VisualTesting.hideVolatileElements(page);
        await VisualTesting.waitForAnimations(page);
        
        const visualResult = await VisualTesting.compareScreenshot(page, 'meal-plan-assignment-modal');
        expect(visualResult.match).toBe(true);
      }
    });
  });

  describe('Responsive Design', () => {
    it('should work on mobile viewport', async () => {
      // Set mobile viewport
      await page.setViewport({ width: 375, height: 812 });
      await page.reload();
      await page.waitForTimeout(2000);
      
      // Check that form is still accessible
      const form = await page.$('form, [data-testid="meal-plan-form"]');
      expect(form).toBeTruthy();
      
      // Visual test on mobile
      await VisualTesting.hideVolatileElements(page);
      await VisualTesting.waitForAnimations(page);
      
      const visualResult = await VisualTesting.compareScreenshot(page, 'meal-plan-generator-mobile');
      expect(visualResult.match).toBe(true);
      
      // Reset viewport
      await page.setViewport({ width: 1920, height: 1080 });
    });

    it('should work on tablet viewport', async () => {
      // Set tablet viewport
      await page.setViewport({ width: 768, height: 1024 });
      await page.reload();
      await page.waitForTimeout(2000);
      
      // Visual test on tablet
      await VisualTesting.hideVolatileElements(page);
      await VisualTesting.waitForAnimations(page);
      
      const visualResult = await VisualTesting.compareScreenshot(page, 'meal-plan-generator-tablet');
      expect(visualResult.match).toBe(true);
      
      // Reset viewport
      await page.setViewport({ width: 1920, height: 1080 });
    });
  });
});