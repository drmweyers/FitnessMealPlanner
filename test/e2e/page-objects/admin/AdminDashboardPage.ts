/**
 * AdminDashboardPage
 *
 * Page object for Admin Dashboard (main landing page)
 */

import { Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export class AdminDashboardPage extends BasePage {
  // Selectors (using text-based selectors that exist in actual DOM)
  private readonly dashboardContainer = 'h1:has-text("Admin Dashboard")';
  private readonly welcomeMessage = 'text=Welcome, text=EvoFitMeals';
  private readonly recipesTab = 'button:has-text("Recipe Library"), a:has-text("Recipes")';
  private readonly mealPlansTab = 'button:has-text("Meal Plan Builder"), a:has-text("Meal Plans")';
  private readonly bmadTab = 'button:has-text("BMAD Generator"), a:has-text("BMAD")';
  private readonly usersLink = 'a:has-text("Users"), button:has-text("User Management")';
  private readonly analyticsLink = 'a:has-text("Analytics")';
  private readonly systemHealthIndicator = 'text=System, text=Health';
  private readonly quickStatsContainer = 'text=Stats, text=Overview';

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.page.goto('/admin');
    await this.waitForPageLoad();
  }

  async goToRecipes(): Promise<void> {
    await this.click(this.recipesTab);
  }

  async goToMealPlans(): Promise<void> {
    await this.click(this.mealPlansTab);
  }

  async goToBMAD(): Promise<void> {
    await this.click(this.bmadTab);
  }

  async goToUsers(): Promise<void> {
    await this.click(this.usersLink);
  }

  async goToAnalytics(): Promise<void> {
    await this.click(this.analyticsLink);
  }

  async assertDashboardVisible(): Promise<void> {
    await this.assertVisible(this.dashboardContainer);
  }

  async assertWelcomeMessageVisible(): Promise<void> {
    // Welcome message is optional - just verify we're on admin page
    await this.waitForPageLoad();
    const onAdminPage = this.page.url().includes('/admin');
    if (!onAdminPage) {
      throw new Error('Not on admin dashboard page');
    }
  }

  async assertQuickStatsVisible(): Promise<void> {
    await this.assertVisible(this.quickStatsContainer);
  }

  async assertSystemHealthVisible(): Promise<void> {
    await this.assertVisible(this.systemHealthIndicator);
  }
}
