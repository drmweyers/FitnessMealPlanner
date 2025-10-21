/**
 * AdminRecipeManagementPage
 *
 * Page object for Admin Recipe Management features including:
 * - Recipe Library viewing
 * - BMAD Recipe Generation
 * - Recipe approval/rejection
 * - Recipe search and filtering
 * - Bulk operations
 *
 * @example
 * ```typescript
 * const adminPage = new AdminRecipeManagementPage(page);
 * await adminPage.navigate();
 * await adminPage.goToBMADTab();
 * await adminPage.generateRecipes({ count: 10 });
 * await adminPage.assertGenerationStarted();
 * ```
 */

import { Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export interface RecipeGenerationOptions {
  count: number;
  mealTypes?: string[];
  fitnessGoal?: string;
  dietaryRestrictions?: string[];
  naturalLanguagePrompt?: string;
  maxPrepTime?: number;
  targetCalories?: number;
}

export class AdminRecipeManagementPage extends BasePage {
  // ============================================================================
  // SELECTORS
  // ============================================================================

  // Navigation
  private readonly recipesTab = 'text=Recipe Library';
  private readonly bmadTab = 'text=BMAD Generator';
  private readonly mealPlansTab = 'text=Meal Plan Builder';

  // Recipe Library (using actual DOM selectors)
  private readonly recipeLibraryContainer = 'h2:has-text("Recipe Library"), .recipe-container, main';
  private readonly searchInput = 'input[placeholder*="Search"], input[type="search"]';
  private readonly filterDropdown = 'select[name="mealType"], select:has-text("Meal Type")';
  private readonly recipeCards = '.recipe-card, [role="article"], .card';
  private readonly recipeTitle = 'h3, h4, .recipe-title';
  private readonly approveButton = 'button:has-text("Approve")';
  private readonly rejectButton = 'button:has-text("Reject")';
  private readonly bulkApproveButton = 'button:has-text("Bulk Approve")';
  private readonly selectAllCheckbox = 'input[type="checkbox"][aria-label="Select all"], input[type="checkbox"]';

  // BMAD Generator (using actual DOM selectors)
  private readonly bmadContainer = 'h2:has-text("BMAD"), form, .generator-container';
  private readonly countInput = 'input[name="count"], input[type="number"]';
  private readonly mealTypeCheckboxes = 'input[name="mealTypes"], input[type="checkbox"]';
  private readonly fitnessGoalSelect = 'select[name="fitnessGoal"], select';
  private readonly dietaryRestrictionsCheckboxes = 'input[name="dietaryRestrictions"], input[type="checkbox"]';
  private readonly naturalLanguageInput = 'textarea[name="naturalLanguagePrompt"], textarea';
  private readonly maxPrepTimeInput = 'input[name="maxPrepTime"], input[type="number"]';
  private readonly targetCaloriesInput = 'input[name="targetCalories"], input[type="number"]';
  private readonly generateButton = 'button[type="submit"]:has-text("Generate"), button:has-text("Start")';
  private readonly progressIndicator = '.progress, [role="progressbar"], text=Generating';
  private readonly successMessage = 'text=Success, text=Complete, .success-message';
  private readonly errorMessage = 'text=Error, text=Failed, .error-message';

  // Recipe Details Modal (using actual DOM selectors)
  private readonly recipeModal = '[role="dialog"], .modal, .recipe-modal';
  private readonly modalTitle = 'h2, h3, .modal-title';
  private readonly modalIngredients = 'text=Ingredients, .ingredients';
  private readonly modalInstructions = 'text=Instructions, .instructions';
  private readonly modalNutrition = 'text=Nutrition, .nutrition';
  private readonly closeModalButton = 'button[aria-label="Close"], button:has-text("Close")';

  // Pagination (using actual DOM selectors)
  private readonly paginationContainer = 'nav[aria-label="pagination"], .pagination';
  private readonly nextPageButton = 'button:has-text("Next")';
  private readonly prevPageButton = 'button:has-text("Previous")';
  private readonly pageNumberButton = (page: number) => `button:has-text("${page}")`;

  // Action Toolbar (using actual DOM selectors)
  private readonly actionToolbar = '.toolbar, .action-bar, div:has(button:has-text("Generate"))';
  private readonly exportButton = 'button:has-text("Export")';
  private readonly generateRecipesButton = 'button:has-text("Generate Recipes"), button:has-text("Generate")';
  private readonly reviewQueueButton = 'button:has-text("Review Queue"), button:has-text("Review")';

  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================

  constructor(page: Page) {
    super(page);
  }

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  /**
   * Navigate to Admin Dashboard
   */
  async navigate(): Promise<void> {
    await this.page.goto('/admin');
    await this.waitForPageLoad();
  }

  /**
   * Navigate to Recipe Library tab
   */
  async goToRecipesTab(): Promise<void> {
    await this.click(this.recipesTab);
    await this.waitForVisible(this.recipeLibraryContainer);
  }

  /**
   * Navigate to BMAD Generator tab
   */
  async goToBMADTab(): Promise<void> {
    await this.click(this.bmadTab);
    await this.waitForVisible(this.bmadContainer);
  }

  /**
   * Navigate to Meal Plan Builder tab
   */
  async goToMealPlansTab(): Promise<void> {
    await this.click(this.mealPlansTab);
  }

  // ============================================================================
  // RECIPE LIBRARY OPERATIONS
  // ============================================================================

  /**
   * Search for recipes
   * @param searchTerm - Search term
   */
  async searchRecipes(searchTerm: string): Promise<void> {
    await this.fill(this.searchInput, searchTerm);
    await this.waitForResponse('/api/recipes');
  }

  /**
   * Filter recipes by meal type
   * @param mealType - Meal type to filter (breakfast, lunch, dinner, snack)
   */
  async filterByMealType(mealType: string): Promise<void> {
    await this.selectOption(this.filterDropdown, mealType);
    await this.waitForResponse('/api/recipes');
  }

  /**
   * Get count of displayed recipes
   */
  async getRecipeCount(): Promise<number> {
    return await this.count(this.recipeCards);
  }

  /**
   * Get recipe title by index
   * @param index - Recipe card index (0-based)
   */
  async getRecipeTitle(index: number): Promise<string> {
    return await this.page.locator(this.recipeCards).nth(index).locator(this.recipeTitle).textContent() || '';
  }

  /**
   * Click recipe card to view details
   * @param index - Recipe card index (0-based)
   */
  async clickRecipeCard(index: number): Promise<void> {
    await this.page.locator(this.recipeCards).nth(index).click();
    await this.waitForModal(this.recipeModal);
  }

  /**
   * Approve recipe
   * @param index - Recipe card index (0-based)
   */
  async approveRecipe(index: number): Promise<void> {
    await this.page.locator(this.recipeCards).nth(index).locator(this.approveButton).click();
    await this.waitForResponse('/api/admin/recipes');
  }

  /**
   * Reject recipe
   * @param index - Recipe card index (0-based)
   */
  async rejectRecipe(index: number): Promise<void> {
    await this.page.locator(this.recipeCards).nth(index).locator(this.rejectButton).click();
    await this.waitForResponse('/api/admin/recipes');
  }

  /**
   * Select all recipes
   */
  async selectAllRecipes(): Promise<void> {
    await this.check(this.selectAllCheckbox);
  }

  /**
   * Bulk approve selected recipes
   */
  async bulkApproveRecipes(): Promise<void> {
    await this.click(this.bulkApproveButton);
    await this.waitForResponse('/api/admin/recipes/bulk-approve');
  }

  // ============================================================================
  // BMAD GENERATOR OPERATIONS
  // ============================================================================

  /**
   * Fill BMAD generation form
   * @param options - Recipe generation options
   */
  async fillGenerationForm(options: RecipeGenerationOptions): Promise<void> {
    // Required: count
    await this.fill(this.countInput, options.count.toString());

    // Optional: meal types
    if (options.mealTypes && options.mealTypes.length > 0) {
      for (const mealType of options.mealTypes) {
        await this.check(`${this.mealTypeCheckboxes}[value="${mealType}"]`);
      }
    }

    // Optional: fitness goal
    if (options.fitnessGoal) {
      await this.selectOption(this.fitnessGoalSelect, options.fitnessGoal);
    }

    // Optional: dietary restrictions
    if (options.dietaryRestrictions && options.dietaryRestrictions.length > 0) {
      for (const restriction of options.dietaryRestrictions) {
        await this.check(`${this.dietaryRestrictionsCheckboxes}[value="${restriction}"]`);
      }
    }

    // Optional: natural language prompt
    if (options.naturalLanguagePrompt) {
      await this.fill(this.naturalLanguageInput, options.naturalLanguagePrompt);
    }

    // Optional: max prep time
    if (options.maxPrepTime) {
      await this.fill(this.maxPrepTimeInput, options.maxPrepTime.toString());
    }

    // Optional: target calories
    if (options.targetCalories) {
      await this.fill(this.targetCaloriesInput, options.targetCalories.toString());
    }
  }

  /**
   * Submit recipe generation
   */
  async submitGeneration(): Promise<void> {
    await this.click(this.generateButton);
  }

  /**
   * Generate recipes with options (fill form + submit)
   * @param options - Recipe generation options
   */
  async generateRecipes(options: RecipeGenerationOptions): Promise<void> {
    await this.fillGenerationForm(options);
    await this.submitGeneration();
  }

  /**
   * Wait for generation progress to appear
   */
  async waitForGenerationProgress(): Promise<void> {
    await this.waitForVisible(this.progressIndicator);
  }

  /**
   * Wait for generation to complete (success or error)
   */
  async waitForGenerationComplete(): Promise<void> {
    await this.page.waitForSelector(`${this.successMessage}, ${this.errorMessage}`, {
      state: 'visible',
      timeout: 60000 // 60 seconds for generation
    });
  }

  // ============================================================================
  // RECIPE MODAL OPERATIONS
  // ============================================================================

  /**
   * Get recipe title from modal
   */
  async getModalRecipeTitle(): Promise<string> {
    return await this.getText(this.modalTitle);
  }

  /**
   * Get ingredients from modal
   */
  async getModalIngredients(): Promise<string[]> {
    const ingredientsText = await this.getText(this.modalIngredients);
    return ingredientsText.split('\n').filter(i => i.trim().length > 0);
  }

  /**
   * Get instructions from modal
   */
  async getModalInstructions(): Promise<string> {
    return await this.getText(this.modalInstructions);
  }

  /**
   * Get nutrition info from modal
   */
  async getModalNutritionInfo(): Promise<string> {
    return await this.getText(this.modalNutrition);
  }

  /**
   * Close recipe modal
   */
  async closeRecipeModal(): Promise<void> {
    await this.click(this.closeModalButton);
    await this.waitForHidden(this.recipeModal);
  }

  // ============================================================================
  // PAGINATION OPERATIONS
  // ============================================================================

  /**
   * Go to next page
   */
  async goToNextPage(): Promise<void> {
    await this.click(this.nextPageButton);
    await this.waitForResponse('/api/recipes');
  }

  /**
   * Go to previous page
   */
  async goToPreviousPage(): Promise<void> {
    await this.click(this.prevPageButton);
    await this.waitForResponse('/api/recipes');
  }

  /**
   * Go to specific page number
   * @param pageNumber - Page number to navigate to
   */
  async goToPage(pageNumber: number): Promise<void> {
    await this.click(this.pageNumberButton(pageNumber));
    await this.waitForResponse('/api/recipes');
  }

  // ============================================================================
  // ACTION TOOLBAR OPERATIONS
  // ============================================================================

  /**
   * Click Export button
   */
  async clickExport(): Promise<void> {
    await this.click(this.exportButton);
  }

  /**
   * Click Generate Recipes button
   */
  async clickGenerateRecipesButton(): Promise<void> {
    await this.click(this.generateRecipesButton);
  }

  /**
   * Click Review Queue button
   */
  async clickReviewQueue(): Promise<void> {
    await this.click(this.reviewQueueButton);
  }

  // ============================================================================
  // ASSERTIONS
  // ============================================================================

  /**
   * Assert recipe library is visible
   */
  async assertRecipeLibraryVisible(): Promise<void> {
    await this.assertVisible(this.recipeLibraryContainer);
  }

  /**
   * Assert BMAD generator is visible
   */
  async assertBMADGeneratorVisible(): Promise<void> {
    await this.assertVisible(this.bmadContainer);
  }

  /**
   * Assert recipe count equals expected
   * @param expectedCount - Expected number of recipes
   */
  async assertRecipeCount(expectedCount: number): Promise<void> {
    await this.assertCount(this.recipeCards, expectedCount);
  }

  /**
   * Assert recipe is visible by title
   * @param recipeTitle - Recipe title to look for
   */
  async assertRecipeVisible(recipeTitle: string): Promise<void> {
    await this.assertVisible(`${this.recipeTitle}:has-text("${recipeTitle}")`);
  }

  /**
   * Assert generation started (progress indicator visible)
   */
  async assertGenerationStarted(): Promise<void> {
    await this.assertVisible(this.progressIndicator);
  }

  /**
   * Assert generation success
   */
  async assertGenerationSuccess(): Promise<void> {
    await this.assertVisible(this.successMessage);
  }

  /**
   * Assert generation error
   */
  async assertGenerationError(): Promise<void> {
    await this.assertVisible(this.errorMessage);
  }

  /**
   * Assert recipe modal is visible
   */
  async assertRecipeModalVisible(): Promise<void> {
    await this.assertVisible(this.recipeModal);
  }

  /**
   * Assert recipe modal is hidden
   */
  async assertRecipeModalHidden(): Promise<void> {
    await this.assertHidden(this.recipeModal);
  }

  /**
   * Assert action toolbar is visible
   */
  async assertActionToolbarVisible(): Promise<void> {
    await this.assertVisible(this.actionToolbar);
  }
}
