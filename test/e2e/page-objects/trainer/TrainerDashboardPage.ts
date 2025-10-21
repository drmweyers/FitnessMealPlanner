/**
 * TrainerDashboardPage
 *
 * Page object for Trainer Dashboard (main landing page)
 */

import { Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export class TrainerDashboardPage extends BasePage {
  // Selectors
  private readonly dashboardContainer = '[data-testid="trainer-dashboard"]';
  private readonly welcomeMessage = '.welcome-message, [data-testid="welcome"]';
  private readonly myCustomersLink = 'a:has-text("My Customers"), button:has-text("Customers")';
  private readonly mealPlansLink = 'a:has-text("Meal Plans")';
  private readonly progressLink = 'a:has-text("Progress"), a:has-text("Progress Tracking")';
  private readonly quickStatsContainer = '[data-testid="quick-stats"]';
  private readonly totalCustomersCard = '[data-testid="total-customers"]';
  private readonly activeMealPlansCard = '[data-testid="active-meal-plans"]';
  private readonly recentActivityContainer = '[data-testid="recent-activity"]';

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.page.goto('/trainer');
    await this.waitForPageLoad();
  }

  async goToMyCustomers(): Promise<void> {
    await this.click(this.myCustomersLink);
  }

  async goToMealPlans(): Promise<void> {
    await this.click(this.mealPlansLink);
  }

  async goToProgress(): Promise<void> {
    await this.click(this.progressLink);
  }

  async getTotalCustomers(): Promise<string> {
    return await this.getText(this.totalCustomersCard);
  }

  async getActiveMealPlans(): Promise<string> {
    return await this.getText(this.activeMealPlansCard);
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

  async assertRecentActivityVisible(): Promise<void> {
    await this.assertVisible(this.recentActivityContainer);
  }
}
