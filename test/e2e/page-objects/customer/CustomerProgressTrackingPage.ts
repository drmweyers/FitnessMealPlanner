/**
 * CustomerProgressTrackingPage
 *
 * Page object for Customer Progress Tracking (measurements, photos, goals)
 */

import { Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export interface MeasurementData {
  weight: number;
  bodyFat?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  date?: string;
}

export class CustomerProgressTrackingPage extends BasePage {
  // Selectors
  private readonly progressContainer = '[data-testid="progress-container"]';
  private readonly measurementsTab = 'button:has-text("Measurements"), a:has-text("Measurements")';
  private readonly photosTab = 'button:has-text("Photos"), a:has-text("Photos")';
  private readonly goalsTab = 'button:has-text("Goals"), a:has-text("Goals")';
  private readonly addMeasurementButton = 'button:has-text("Add Measurement")';
  private readonly measurementModal = '[data-testid="measurement-modal"]';
  private readonly weightInput = 'input[name="weight"]';
  private readonly bodyFatInput = 'input[name="bodyFat"]';
  private readonly chestInput = 'input[name="chest"]';
  private readonly waistInput = 'input[name="waist"]';
  private readonly hipsInput = 'input[name="hips"]';
  private readonly dateInput = 'input[name="date"]';
  private readonly saveMeasurementButton = 'button:has-text("Save Measurement")';
  private readonly measurementsTable = '[data-testid="measurements-table"]';
  private readonly weightChart = '[data-testid="weight-chart"]';
  private readonly uploadPhotoButton = 'button:has-text("Upload Photo")';
  private readonly photoInput = 'input[type="file"]';
  private readonly photosGallery = '[data-testid="photos-gallery"]';
  private readonly photoCards = '[data-testid="photo-card"]';
  private readonly addGoalButton = 'button:has-text("Add Goal")';
  private readonly goalInput = 'textarea[name="goal"]';
  private readonly saveGoalButton = 'button:has-text("Save Goal")';
  private readonly goalsContainer = '[data-testid="goals-container"]';
  private readonly goalCards = '[data-testid="goal-card"]';

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.page.goto('/customer/progress');
    await this.waitForPageLoad();
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

  async clickAddMeasurement(): Promise<void> {
    await this.click(this.addMeasurementButton);
    await this.waitForModal(this.measurementModal);
  }

  async fillMeasurementForm(data: MeasurementData): Promise<void> {
    await this.fill(this.weightInput, data.weight.toString());
    if (data.bodyFat) await this.fill(this.bodyFatInput, data.bodyFat.toString());
    if (data.chest) await this.fill(this.chestInput, data.chest.toString());
    if (data.waist) await this.fill(this.waistInput, data.waist.toString());
    if (data.hips) await this.fill(this.hipsInput, data.hips.toString());
    if (data.date) await this.fill(this.dateInput, data.date);
  }

  async saveMeasurement(): Promise<void> {
    await this.click(this.saveMeasurementButton);
    await this.waitForResponse('/api/progress/measurements');
  }

  async addMeasurement(data: MeasurementData): Promise<void> {
    await this.clickAddMeasurement();
    await this.fillMeasurementForm(data);
    await this.saveMeasurement();
  }

  async getMeasurementCount(): Promise<number> {
    return await this.getTableRowCount(this.measurementsTable);
  }

  async uploadPhoto(filePath: string): Promise<void> {
    await this.uploadFile(this.photoInput, filePath);
    await this.waitForResponse('/api/progress/photos');
  }

  async getPhotoCount(): Promise<number> {
    return await this.count(this.photoCards);
  }

  async clickAddGoal(): Promise<void> {
    await this.click(this.addGoalButton);
  }

  async fillGoal(goalText: string): Promise<void> {
    await this.fill(this.goalInput, goalText);
  }

  async saveGoal(): Promise<void> {
    await this.click(this.saveGoalButton);
    await this.waitForResponse('/api/progress/goals');
  }

  async addGoal(goalText: string): Promise<void> {
    await this.clickAddGoal();
    await this.fillGoal(goalText);
    await this.saveGoal();
  }

  async getGoalCount(): Promise<number> {
    return await this.count(this.goalCards);
  }

  async assertProgressContainerVisible(): Promise<void> {
    await this.assertVisible(this.progressContainer);
  }

  async assertMeasurementsTableVisible(): Promise<void> {
    await this.assertVisible(this.measurementsTable);
  }

  async assertWeightChartVisible(): Promise<void> {
    await this.assertVisible(this.weightChart);
  }

  async assertPhotosGalleryVisible(): Promise<void> {
    await this.assertVisible(this.photosGallery);
  }

  async assertGoalsContainerVisible(): Promise<void> {
    await this.assertVisible(this.goalsContainer);
  }

  async assertMeasurementAdded(): Promise<void> {
    await this.waitForResponse('/api/progress/measurements');
  }
}
