/**
 * CustomerDashboardPage
 *
 * Page object for Customer Dashboard (main landing page)
 */

import { Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export class CustomerDashboardPage extends BasePage {
  // Selectors
  private readonly dashboardContainer = '[data-testid="customer-dashboard"]';
  private readonly welcomeMessage = '.welcome-message, [data-testid="welcome"]';
  private readonly mealPlansLink = 'a:has-text("Meal Plans"), button:has-text("Meal Plans")';
  private readonly progressLink = 'a:has-text("Progress"), a:has-text("Progress Tracking")';
  private readonly groceryListsLink = 'a:has-text("Grocery Lists")';
  private readonly favoritesLink = 'a:has-text("Favorites")';
  private readonly quickStatsContainer = '[data-testid="quick-stats"]';
  private readonly activeMealPlansCard = '[data-testid="active-meal-plans"]';
  private readonly completedDaysCard = '[data-testid="completed-days"]';
  private readonly currentStreakCard = '[data-testid="current-streak"]';
  private readonly upcomingMealsContainer = '[data-testid="upcoming-meals"]';
  private readonly recentActivityContainer = '[data-testid="recent-activity"]';

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.page.goto('/customer');
    await this.waitForPageLoad();
  }

  async goToMealPlans(): Promise<void> {
    await this.click(this.mealPlansLink);
  }

  async goToProgress(): Promise<void> {
    await this.click(this.progressLink);
  }

  async goToGroceryLists(): Promise<void> {
    await this.click(this.groceryListsLink);
  }

  async goToFavorites(): Promise<void> {
    await this.click(this.favoritesLink);
  }

  async getActiveMealPlans(): Promise<string> {
    return await this.getText(this.activeMealPlansCard);
  }

  async getCompletedDays(): Promise<string> {
    return await this.getText(this.completedDaysCard);
  }

  async getCurrentStreak(): Promise<string> {
    return await this.getText(this.currentStreakCard);
  }

  async assertDashboardVisible(): Promise<void> {
    await this.assertVisible(this.dashboardContainer);
  }

  async assertWelcomeMessageVisible(): Promise<void> {
    await this.assertVisible(this.welcomeMessage);
  }

  async assertQuickStatsVisible(): Promise<void> {
    await this.assertVisible(this.quickStatsContainer);
  }

  async assertUpcomingMealsVisible(): Promise<void> {
    await this.assertVisible(this.upcomingMealsContainer);
  }

  async assertRecentActivityVisible(): Promise<void> {
    await this.assertVisible(this.recentActivityContainer);
  }
}
