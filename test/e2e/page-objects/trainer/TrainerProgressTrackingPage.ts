/**
 * TrainerProgressTrackingPage
 *
 * Page object for Trainer viewing customer progress
 */

import { Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export class TrainerProgressTrackingPage extends BasePage {
  // Selectors
  private readonly progressContainer = '[data-testid="progress-tracking"]';
  private readonly customerSelect = 'select[name="customerId"]';
  private readonly measurementsTab = 'button:has-text("Measurements"), a:has-text("Measurements")';
  private readonly photosTab = 'button:has-text("Photos"), a:has-text("Photos")';
  private readonly goalsTab = 'button:has-text("Goals"), a:has-text("Goals")';
  private readonly measurementsTable = '[data-testid="measurements-table"]';
  private readonly weightChart = '[data-testid="weight-chart"]';
  private readonly bodyFatChart = '[data-testid="body-fat-chart"]';
  private readonly photosGallery = '[data-testid="photos-gallery"]';
  private readonly goalsContainer = '[data-testid="goals-container"]';
  private readonly dateRangeSelect = 'select[name="dateRange"]';

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.page.goto('/trainer/progress');
    await this.waitForPageLoad();
  }

  async selectCustomer(customerId: string): Promise<void> {
    await this.selectOption(this.customerSelect, customerId);
    await this.waitForResponse('/api/trainer/progress');
  }

  async goToMeasurementsTab(): Promise<void> {
    await this.click(this.measurementsTab);
  }

  async goToPhotosTab(): Promise<void> {
    await this.click(this.photosTab);
  }

  async goToGoalsTab(): Promise<void> {
    await this.click(this.goalsTab);
  }

  async selectDateRange(range: '7days' | '30days' | '90days' | 'all'): Promise<void> {
    await this.selectOption(this.dateRangeSelect, range);
    await this.waitForResponse('/api/trainer/progress');
  }

  async getMeasurementCount(): Promise<number> {
    return await this.getTableRowCount(this.measurementsTable);
  }

  async assertProgressContainerVisible(): Promise<void> {
    await this.assertVisible(this.progressContainer);
  }

  async assertWeightChartVisible(): Promise<void> {
    await this.assertVisible(this.weightChart);
  }

  async assertBodyFatChartVisible(): Promise<void> {
    await this.assertVisible(this.bodyFatChart);
  }

  async assertMeasurementsTableVisible(): Promise<void> {
    await this.assertVisible(this.measurementsTable);
  }

  async assertPhotosGalleryVisible(): Promise<void> {
    await this.assertVisible(this.photosGallery);
  }
}
