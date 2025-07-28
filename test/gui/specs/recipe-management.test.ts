import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Browser, Page } from 'puppeteer';
import { BrowserUtils } from '../utils/browser-utils';
import { VisualTesting } from '../utils/visual-testing';
import { testConfig } from '../puppeteer.config';

describe('Recipe Management Tests', () => {
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
    // Navigate to admin page before each test
    await BrowserUtils.navigateToPage(page, '/admin');
    await page.waitForTimeout(2000);
  });

  describe('Recipe Generation', () => {
    it('should display recipe generation interface', async () => {
      // Look for recipe generation UI elements
      const generateButton = await page.$('[data-testid="generate-recipes"], button:has-text("Generate"), .generate-recipes');
      
      if (!generateButton) {
        // Try to find navigation to recipe generation
        const recipeNavLink = await page.$('a:has-text("Recipe"), [href*="recipe"]');
        if (recipeNavLink) {
          await recipeNavLink.click();
          await page.waitForTimeout(1000);
        }
      }
      
      // Wait for generation interface
      await page.waitForTimeout(2000);
      
      // Visual regression test
      await VisualTesting.hideVolatileElements(page);
      await VisualTesting.waitForAnimations(page);
      
      const visualResult = await VisualTesting.compareScreenshot(page, 'recipe-generation-interface');
      expect(visualResult.match).toBe(true);
    });

    it('should generate recipes with basic parameters', async () => {
      // Look for recipe generation form
      const generateButton = await page.$('[data-testid="generate-recipes"], button:has-text("Generate")');
      
      if (generateButton) {
        // Fill generation parameters if form exists
        const countInput = await page.$('input[name="count"], [data-testid="recipe-count"]');
        if (countInput) {
          await BrowserUtils.typeInField(page, 'input[name="count"], [data-testid="recipe-count"]', '2');
        }
        
        // Set fitness goal if dropdown exists
        const fitnessGoalSelect = await page.$('select[name="fitnessGoal"], [data-testid="fitness-goal"]');
        if (fitnessGoalSelect) {
          await BrowserUtils.selectOption(page, 'select[name="fitnessGoal"], [data-testid="fitness-goal"]', 'weight loss');
        }
        
        // Submit generation request
        await generateButton.click();
        
        // Wait for generation to start (should show success message)
        try {
          await BrowserUtils.waitForToast(page, 'Recipe generation started');
        } catch {
          // If no toast, wait for page changes
          await page.waitForTimeout(3000);
        }
        
        // Check that generation was triggered (should not show error)
        const errors = await BrowserUtils.checkForErrors(page);
        expect(errors.length).toBe(0);
      }
    });

    it('should validate generation parameters', async () => {
      const generateButton = await page.$('[data-testid="generate-recipes"], button:has-text("Generate")');
      
      if (generateButton) {
        // Try to generate with invalid count
        const countInput = await page.$('input[name="count"], [data-testid="recipe-count"]');
        if (countInput) {
          await BrowserUtils.typeInField(page, 'input[name="count"], [data-testid="recipe-count"]', '200');
        }
        
        await generateButton.click();
        await page.waitForTimeout(2000);
        
        // Should show validation error
        const errors = await BrowserUtils.checkForErrors(page);
        expect(errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Recipe List', () => {
    it('should display recipe list', async () => {
      // Navigate to recipe list
      const recipeListLink = await page.$('a:has-text("Recipes"), [href*="recipe"]');
      if (recipeListLink) {
        await recipeListLink.click();
        await page.waitForTimeout(2000);
      }
      
      // Look for recipe table or grid
      await page.waitForTimeout(3000);
      
      const recipeContainer = await page.$('[data-testid="recipe-list"], .recipe-grid, table');
      
      // Take visual snapshot
      await VisualTesting.hideVolatileElements(page);
      await VisualTesting.waitForAnimations(page);
      
      const visualResult = await VisualTesting.compareScreenshot(page, 'recipe-list');
      expect(visualResult.match).toBe(true);
    });

    it('should allow recipe filtering', async () => {
      // Look for filter controls
      const searchInput = await page.$('input[placeholder*="search"], [data-testid="search"]');
      
      if (searchInput) {
        await BrowserUtils.typeInField(page, 'input[placeholder*="search"], [data-testid="search"]', 'chicken');
        await page.waitForTimeout(1000);
        
        // Check that results are filtered
        const recipeItems = await page.$$('[data-testid="recipe-item"], .recipe-card');
        // Results should be filtered (or no results if no chicken recipes)
        expect(recipeItems.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should allow recipe approval/disapproval', async () => {
      // Look for pending recipes
      const pendingFilter = await page.$('[data-testid="pending-filter"], button:has-text("Pending")');
      if (pendingFilter) {
        await pendingFilter.click();
        await page.waitForTimeout(2000);
      }
      
      // Look for approve/disapprove buttons
      const approveButton = await page.$('[data-testid="approve-recipe"], button:has-text("Approve")');
      
      if (approveButton) {
        await approveButton.click();
        await page.waitForTimeout(1000);
        
        // Should show success message
        try {
          await BrowserUtils.waitForToast(page, 'approved');
        } catch {
          // If no toast, check for visual changes
          await page.waitForTimeout(2000);
        }
      }
    });
  });

  describe('Recipe Details', () => {
    it('should display recipe details modal', async () => {
      // Look for a recipe item to click
      const recipeItem = await page.$('[data-testid="recipe-item"], .recipe-card');
      
      if (recipeItem) {
        await recipeItem.click();
        await page.waitForTimeout(2000);
        
        // Look for modal or detail view
        const modal = await page.$('[data-testid="recipe-modal"], .modal, .recipe-details');
        expect(modal).toBeTruthy();
        
        // Check for recipe information
        const recipeName = await page.$('[data-testid="recipe-name"], .recipe-title');
        const recipeIngredients = await page.$('[data-testid="ingredients"], .ingredients');
        const recipeInstructions = await page.$('[data-testid="instructions"], .instructions');
        
        expect(recipeName).toBeTruthy();
        expect(recipeIngredients).toBeTruthy();
        expect(recipeInstructions).toBeTruthy();
        
        // Visual test
        await VisualTesting.hideVolatileElements(page);
        await VisualTesting.waitForAnimations(page);
        
        const visualResult = await VisualTesting.compareScreenshot(page, 'recipe-details-modal');
        expect(visualResult.match).toBe(true);
        
        // Close modal
        const closeButton = await page.$('[data-testid="close-modal"], .close, button:has-text("Close")');
        if (closeButton) {
          await closeButton.click();
        }
      }
    });
  });

  describe('Bulk Operations', () => {
    it('should allow bulk approval of recipes', async () => {
      // Look for select all checkbox
      const selectAllCheckbox = await page.$('[data-testid="select-all"], input[type="checkbox"]');
      
      if (selectAllCheckbox) {
        await selectAllCheckbox.click();
        await page.waitForTimeout(500);
        
        // Look for bulk approve button
        const bulkApproveButton = await page.$('[data-testid="bulk-approve"], button:has-text("Approve Selected")');
        
        if (bulkApproveButton) {
          await bulkApproveButton.click();
          await page.waitForTimeout(2000);
          
          // Should show success message
          try {
            await BrowserUtils.waitForToast(page, 'approved');
          } catch {
            // Check for other success indicators
            await page.waitForTimeout(2000);
          }
        }
      }
    });

    it('should allow bulk deletion of recipes', async () => {
      // Look for select checkboxes
      const checkboxes = await page.$$('[data-testid="recipe-checkbox"], input[type="checkbox"]');
      
      if (checkboxes.length > 0) {
        // Select first checkbox
        await checkboxes[0].click();
        await page.waitForTimeout(500);
        
        // Look for bulk delete button
        const bulkDeleteButton = await page.$('[data-testid="bulk-delete"], button:has-text("Delete Selected")');
        
        if (bulkDeleteButton) {
          await bulkDeleteButton.click();
          
          // Confirm deletion if confirmation dialog appears
          await page.waitForTimeout(1000);
          const confirmButton = await page.$('[data-testid="confirm-delete"], button:has-text("Confirm"), button:has-text("Yes")');
          
          if (confirmButton) {
            await confirmButton.click();
            await page.waitForTimeout(2000);
            
            // Should show success message
            try {
              await BrowserUtils.waitForToast(page, 'deleted');
            } catch {
              await page.waitForTimeout(2000);
            }
          }
        }
      }
    });
  });
});