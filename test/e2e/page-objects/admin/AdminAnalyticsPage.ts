/**
 * AdminAnalyticsPage
 *
 * Page object for Admin Analytics Dashboard
 */

import { Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export class AdminAnalyticsPage extends BasePage {
  // Selectors
  private readonly analyticsContainer = '[data-testid="analytics-dashboard"]';
  private readonly totalUsersCard = '[data-testid="total-users"]';
  private readonly totalRecipesCard = '[data-testid="total-recipes"]';
  private readonly totalMealPlansCard = '[data-testid="total-meal-plans"]';
  private readonly activeUsersCard = '[data-testid="active-users"]';
  private readonly userGrowthChart = '[data-testid="user-growth-chart"]';
  private readonly recipeGenerationChart = '[data-testid="recipe-generation-chart"]';
  private readonly mealPlanUsageChart = '[data-testid="meal-plan-usage-chart"]';
  private readonly dateRangeSelect = 'select[name="dateRange"]';
  private readonly exportButton = 'button:has-text("Export")';
  private readonly refreshButton = 'button:has-text("Refresh")';

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.page.goto('/admin/analytics');
    await this.waitForPageLoad();
  }

  async selectDateRange(range: '7days' | '30days' | '90days' | 'year'): Promise<void> {
    await this.selectOption(this.dateRangeSelect, range);
    await this.waitForResponse('/api/admin/analytics');
  }

  async getTotalUsers(): Promise<string> {
    return await this.getText(this.totalUsersCard);
  }

  async getTotalRecipes(): Promise<string> {
    return await this.getText(this.totalRecipesCard);
  }

  async getTotalMealPlans(): Promise<string> {
    return await this.getText(this.totalMealPlansCard);
  }

  async getActiveUsers(): Promise<string> {
    return await this.getText(this.activeUsersCard);
  }

  async clickExport(): Promise<void> {
    await this.click(this.exportButton);
  }

  async clickRefresh(): Promise<void> {
    await this.click(this.refreshButton);
    await this.waitForResponse('/api/admin/analytics');
  }

  async assertAnalyticsDashboardVisible(): Promise<void> {
    await this.assertVisible(this.analyticsContainer);
  }

  async assertUserGrowthChartVisible(): Promise<void> {
    await this.assertVisible(this.userGrowthChart);
  }

  async assertAllChartsVisible(): Promise<void> {
    await this.assertVisible(this.userGrowthChart);
    await this.assertVisible(this.recipeGenerationChart);
    await this.assertVisible(this.mealPlanUsageChart);
  }
}
