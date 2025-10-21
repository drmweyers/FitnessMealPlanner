/**
 * CustomerFavoritesPage
 *
 * Page object for Customer Favorites management
 */

import { Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export class CustomerFavoritesPage extends BasePage {
  // Selectors
  private readonly favoritesContainer = '[data-testid="favorites-container"]';
  private readonly favoriteRecipeCards = '[data-testid="favorite-recipe-card"]';
  private readonly searchInput = 'input[placeholder*="Search favorites"]';
  private readonly filterSelect = 'select[name="mealType"]';
  private readonly removeButton = 'button:has-text("Remove"), button[aria-label="Remove from favorites"]';
  private readonly viewRecipeButton = 'button:has-text("View Recipe")';
  private readonly addToMealPlanButton = 'button:has-text("Add to Meal Plan")';
  private readonly emptyStateMessage = '[data-testid="empty-favorites"]';
  private readonly sortSelect = 'select[name="sort"]';

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.page.goto('/customer/favorites');
    await this.waitForPageLoad();
  }

  async searchFavorites(searchTerm: string): Promise<void> {
    await this.fill(this.searchInput, searchTerm);
  }

  async filterByMealType(mealType: string): Promise<void> {
    await this.selectOption(this.filterSelect, mealType);
  }

  async sortBy(sortOption: 'name' | 'dateAdded' | 'calories'): Promise<void> {
    await this.selectOption(this.sortSelect, sortOption);
  }

  async getFavoriteCount(): Promise<number> {
    return await this.count(this.favoriteRecipeCards);
  }

  async removeFavorite(index: number): Promise<void> {
    await this.page.locator(this.favoriteRecipeCards).nth(index).locator(this.removeButton).click();
    await this.waitForResponse('/api/favorites');
  }

  async viewRecipe(index: number): Promise<void> {
    await this.page.locator(this.favoriteRecipeCards).nth(index).locator(this.viewRecipeButton).click();
  }

  async addFavoriteToMealPlan(index: number): Promise<void> {
    await this.page.locator(this.favoriteRecipeCards).nth(index).locator(this.addToMealPlanButton).click();
  }

  async assertFavoritesContainerVisible(): Promise<void> {
    await this.assertVisible(this.favoritesContainer);
  }

  async assertEmptyStateVisible(): Promise<void> {
    await this.assertVisible(this.emptyStateMessage);
  }

  async assertFavoriteVisible(recipeName: string): Promise<void> {
    await this.assertVisible(`${this.favoriteRecipeCards}:has-text("${recipeName}")`);
  }
}
