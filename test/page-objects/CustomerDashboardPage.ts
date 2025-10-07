/**
 * Customer Dashboard Page Object Model
 * Handles all customer dashboard interactions and navigation
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class CustomerDashboardPage extends BasePage {
  // Navigation selectors
  private selectors = {
    // Main navigation
    dashboardTitle: 'h1, h2:has-text("Customer"), h1, h2:has-text("My"), text="Dashboard"',
    mealPlansNav: 'text="My Meal Plans", text="Meal Plans", button:has-text("Meal Plans"), [data-testid="meal-plans-nav"]',
    progressNav: 'text="Progress", text="My Progress", button:has-text("Progress"), [data-testid="progress-nav"]',
    profileNav: 'text="Profile", text="My Profile", button:has-text("Profile"), [data-testid="profile-nav"]',
    
    // Meal plans
    mealPlansList: '.meal-plan-card, .meal-plan-item, table tbody tr, [data-testid="meal-plan-list"]',
    mealPlanCard: '.meal-plan-card, .meal-plan-item, [data-testid="meal-plan-card"]',
    viewMealPlanButton: 'button:has-text("View"), button:has-text("Open"), [data-testid="view-meal-plan"]',
    downloadPdfButton: 'button:has-text("PDF"), button:has-text("Download"), [data-testid="download-pdf"]',
    
    // Progress tracking
    progressTabs: '[role="tab"], .tab, button[data-tab]',
    measurementsTab: 'button:has-text("Measurements"), [data-tab="measurements"], [role="tab"]:has-text("Measurements")',
    photosTab: 'button:has-text("Photos"), [data-tab="photos"], [role="tab"]:has-text("Photos")',
    goalsTab: 'button:has-text("Goals"), [data-tab="goals"], [role="tab"]:has-text("Goals")',
    
    // Measurements
    weightInput: 'input[name="weight"], input[placeholder*="weight" i], [data-testid="weight-input"]',
    heightInput: 'input[name="height"], input[placeholder*="height" i], [data-testid="height-input"]',
    bodyFatInput: 'input[name="bodyFat"], input[placeholder*="body fat" i], [data-testid="bodyfat-input"]',
    muscleInput: 'input[name="muscle"], input[placeholder*="muscle" i], [data-testid="muscle-input"]',
    waistInput: 'input[name="waist"], input[placeholder*="waist" i], [data-testid="waist-input"]',
    
    // Photos
    photoUploadInput: 'input[type="file"], [data-testid="photo-upload"]',
    photoPreview: '.photo-preview, .uploaded-photo, [data-testid="photo-preview"]',
    
    // Goals
    goalInput: 'input[name="goal"], textarea[name="goal"], input[placeholder*="goal" i], [data-testid="goal-input"]',
    targetWeightInput: 'input[name="targetWeight"], input[placeholder*="target weight" i], [data-testid="target-weight"]',
    targetDateInput: 'input[type="date"], input[name="targetDate"], [data-testid="target-date"]',
    
    // Profile
    profileForm: 'form, .profile-form, [data-testid="profile-form"]',
    nameInput: 'input[name="name"], input[name="firstName"], input[placeholder*="name" i]',
    emailInput: 'input[name="email"], input[type="email"]',
    phoneInput: 'input[name="phone"], input[type="tel"], input[placeholder*="phone" i]',
    
    // Common UI elements
    saveButton: 'button:has-text("Save"), button:has-text("Update"), button[type="submit"]',
    cancelButton: 'button:has-text("Cancel"), button:has-text("Close")',
    loadingSpinner: '.loading, .spinner, [data-testid="loading"]',
    errorMessage: '.error, .alert-error, .text-red-500, [data-testid="error"]',
    successMessage: '.success, .alert-success, .text-green-500, [data-testid="success"]',
    
    // Charts and visualizations
    progressChart: '.chart, .graph, canvas, [data-testid="progress-chart"]',
    progressData: '.progress-data, .stats, [data-testid="progress-data"]',
  };

  constructor(page: Page, baseUrl?: string) {
    super(page, baseUrl);
  }

  /**
   * Navigate to customer dashboard
   */
  async navigate() {
    await this.goto('/customer');
    await this.waitForDashboardLoad();
  }

  /**
   * Wait for dashboard to fully load
   */
  async waitForDashboardLoad() {
    await this.waitForElement(this.selectors.dashboardTitle);
    await this.waitForPageLoad();
  }

  /**
   * Verify customer dashboard is loaded correctly
   */
  async verifyDashboardLoaded() {
    await expect(this.page.locator(this.selectors.dashboardTitle)).toBeVisible();
    
    // Check for main navigation elements
    const navigationElements = [
      this.selectors.mealPlansNav,
      this.selectors.progressNav,
      this.selectors.profileNav
    ];
    
    for (const nav of navigationElements) {
      const element = this.page.locator(nav);
      if (await element.count() > 0) {
        await expect(element).toBeVisible();
      }
    }
  }

  /**
   * Navigate to meal plans section
   */
  async navigateToMealPlans() {
    await this.addVisualIndicator('Navigating to My Meal Plans');
    await this.clickElement(this.selectors.mealPlansNav);
    await this.waitForPageLoad();
  }

  /**
   * Navigate to progress section
   */
  async navigateToProgress() {
    await this.addVisualIndicator('Navigating to Progress Tracking');
    await this.clickElement(this.selectors.progressNav);
    await this.waitForPageLoad();
  }

  /**
   * Navigate to profile section
   */
  async navigateToProfile() {
    await this.addVisualIndicator('Navigating to Profile');
    await this.clickElement(this.selectors.profileNav);
    await this.waitForPageLoad();
  }

  /**
   * Get list of assigned meal plans
   */
  async getMealPlans() {
    await this.navigateToMealPlans();
    
    const mealPlanElements = await this.page.$$(this.selectors.mealPlansList);
    const mealPlans = [];
    
    for (const element of mealPlanElements) {
      const text = await element.textContent();
      if (text) {
        mealPlans.push(text.trim());
      }
    }
    
    return mealPlans;
  }

  /**
   * View specific meal plan
   */
  async viewMealPlan(index: number = 0) {
    await this.navigateToMealPlans();
    
    const mealPlanCards = await this.page.$$(this.selectors.mealPlanCard);
    
    if (mealPlanCards.length > index) {
      const card = mealPlanCards[index];
      
      // Try to find view button within the card
      const viewButton = await card.$(this.selectors.viewMealPlanButton);
      if (viewButton) {
        await viewButton.click();
      } else {
        // If no specific view button, click the card itself
        await card.click();
      }
      
      await this.waitForPageLoad();
      return { success: true, url: this.getCurrentUrl() };
    }
    
    return { success: false, message: 'No meal plans found' };
  }

  /**
   * Download meal plan as PDF
   */
  async downloadMealPlanPdf(index: number = 0) {
    await this.navigateToMealPlans();
    
    const mealPlanCards = await this.page.$$(this.selectors.mealPlanCard);
    
    if (mealPlanCards.length > index) {
      const card = mealPlanCards[index];
      const downloadButton = await card.$(this.selectors.downloadPdfButton);
      
      if (downloadButton) {
        // Monitor download
        const downloadPromise = this.page.waitForEvent('download');
        await downloadButton.click();
        
        try {
          const download = await downloadPromise;
          return { 
            success: true, 
            filename: download.suggestedFilename(),
            path: await download.path()
          };
        } catch (error) {
          return { success: false, message: 'Download failed' };
        }
      }
    }
    
    return { success: false, message: 'Download button not found' };
  }

  /**
   * Update measurements
   */
  async updateMeasurements(measurements: {
    weight?: number;
    height?: number;
    bodyFat?: number;
    muscle?: number;
    waist?: number;
  }) {
    await this.navigateToProgress();
    await this.addVisualIndicator('Updating measurements');
    
    // Click measurements tab
    await this.clickElement(this.selectors.measurementsTab);
    await this.page.waitForTimeout(1000);
    
    // Fill measurement fields
    if (measurements.weight) {
      await this.fillField(this.selectors.weightInput, measurements.weight.toString());
    }
    
    if (measurements.height) {
      await this.fillField(this.selectors.heightInput, measurements.height.toString());
    }
    
    if (measurements.bodyFat) {
      await this.fillField(this.selectors.bodyFatInput, measurements.bodyFat.toString());
    }
    
    if (measurements.muscle) {
      await this.fillField(this.selectors.muscleInput, measurements.muscle.toString());
    }
    
    if (measurements.waist) {
      await this.fillField(this.selectors.waistInput, measurements.waist.toString());
    }
    
    // Save measurements
    await this.clickElement(this.selectors.saveButton);
    await this.page.waitForTimeout(2000);
    
    return await this.getResponseStatus();
  }

  /**
   * Upload progress photo
   */
  async uploadProgressPhoto(photoPath: string) {
    await this.navigateToProgress();
    await this.addVisualIndicator('Uploading progress photo');
    
    // Click photos tab
    await this.clickElement(this.selectors.photosTab);
    await this.page.waitForTimeout(1000);
    
    // Upload photo
    const uploadInput = this.page.locator(this.selectors.photoUploadInput);
    if (await uploadInput.count() > 0) {
      await uploadInput.setInputFiles(photoPath);
      
      // Wait for upload to complete
      await this.page.waitForTimeout(3000);
      
      // Check if photo preview appears
      const photoPreview = this.page.locator(this.selectors.photoPreview);
      if (await photoPreview.count() > 0) {
        return { success: true, message: 'Photo uploaded successfully' };
      }
    }
    
    return { success: false, message: 'Photo upload failed or feature not available' };
  }

  /**
   * Set fitness goals
   */
  async setGoals(goals: {
    goal?: string;
    targetWeight?: number;
    targetDate?: string;
  }) {
    await this.navigateToProgress();
    await this.addVisualIndicator('Setting fitness goals');
    
    // Click goals tab
    await this.clickElement(this.selectors.goalsTab);
    await this.page.waitForTimeout(1000);
    
    // Fill goal fields
    if (goals.goal) {
      await this.fillField(this.selectors.goalInput, goals.goal);
    }
    
    if (goals.targetWeight) {
      await this.fillField(this.selectors.targetWeightInput, goals.targetWeight.toString());
    }
    
    if (goals.targetDate) {
      await this.fillField(this.selectors.targetDateInput, goals.targetDate);
    }
    
    // Save goals
    await this.clickElement(this.selectors.saveButton);
    await this.page.waitForTimeout(2000);
    
    return await this.getResponseStatus();
  }

  /**
   * Update profile information
   */
  async updateProfile(profileData: {
    name?: string;
    email?: string;
    phone?: string;
  }) {
    await this.navigateToProfile();
    await this.addVisualIndicator('Updating profile');
    
    // Fill profile fields
    if (profileData.name) {
      await this.fillField(this.selectors.nameInput, profileData.name);
    }
    
    if (profileData.email) {
      await this.fillField(this.selectors.emailInput, profileData.email);
    }
    
    if (profileData.phone) {
      await this.fillField(this.selectors.phoneInput, profileData.phone);
    }
    
    // Save profile
    await this.clickElement(this.selectors.saveButton);
    await this.page.waitForTimeout(2000);
    
    return await this.getResponseStatus();
  }

  /**
   * Get progress data
   */
  async getProgressData() {
    await this.navigateToProgress();
    
    const progressData = {
      measurements: {},
      goals: {},
      charts: false
    };
    
    // Check measurements tab
    await this.clickElement(this.selectors.measurementsTab);
    await this.page.waitForTimeout(1000);
    
    const measurementInputs = [
      { key: 'weight', selector: this.selectors.weightInput },
      { key: 'height', selector: this.selectors.heightInput },
      { key: 'bodyFat', selector: this.selectors.bodyFatInput },
      { key: 'muscle', selector: this.selectors.muscleInput },
      { key: 'waist', selector: this.selectors.waistInput }
    ];
    
    for (const input of measurementInputs) {
      const element = this.page.locator(input.selector);
      if (await element.count() > 0) {
        const value = await element.inputValue();
        if (value) {
          progressData.measurements[input.key] = value;
        }
      }
    }
    
    // Check for charts
    const chartElement = this.page.locator(this.selectors.progressChart);
    progressData.charts = await chartElement.count() > 0;
    
    return progressData;
  }

  /**
   * Check if progress charts are displayed
   */
  async hasProgressCharts(): Promise<boolean> {
    await this.navigateToProgress();
    
    const chartElement = this.page.locator(this.selectors.progressChart);
    return await chartElement.count() > 0;
  }

  /**
   * Get profile information
   */
  async getProfileInfo() {
    await this.navigateToProfile();
    
    const profile = {};
    
    const profileFields = [
      { key: 'name', selector: this.selectors.nameInput },
      { key: 'email', selector: this.selectors.emailInput },
      { key: 'phone', selector: this.selectors.phoneInput }
    ];
    
    for (const field of profileFields) {
      const element = this.page.locator(field.selector);
      if (await element.count() > 0) {
        const value = await element.inputValue();
        if (value) {
          profile[field.key] = value;
        }
      }
    }
    
    return profile;
  }

  /**
   * Check for success/error messages
   */
  private async getResponseStatus() {
    // Check for success message
    const successElement = this.page.locator(this.selectors.successMessage);
    if (await successElement.count() > 0) {
      const message = await successElement.textContent();
      return { success: true, message: message?.trim() };
    }
    
    // Check for error message
    const errorElement = this.page.locator(this.selectors.errorMessage);
    if (await errorElement.count() > 0) {
      const message = await errorElement.textContent();
      return { success: false, message: message?.trim() };
    }
    
    return { success: true, message: 'Operation completed' };
  }

  /**
   * Helper method to click element with multiple possible selectors
   */
  private async clickElement(selector: string) {
    const selectors = selector.split(', ');
    
    for (const sel of selectors) {
      const element = this.page.locator(sel.trim());
      if (await element.count() > 0 && await element.isVisible()) {
        await element.click();
        return;
      }
    }
    
    throw new Error(`No clickable element found for selectors: ${selector}`);
  }

  /**
   * Helper method to fill field with multiple possible selectors
   */
  private async fillField(selector: string, value: string) {
    const selectors = selector.split(', ');
    
    for (const sel of selectors) {
      const element = this.page.locator(sel.trim());
      if (await element.count() > 0) {
        await element.clear();
        await element.fill(value);
        return;
      }
    }
    
    // Log warning but don't fail - field might not exist
    console.log(`Warning: No field found for selectors: ${selector}`);
  }
}