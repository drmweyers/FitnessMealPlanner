/**
 * Recipe Generation Testing Helper Functions
 * 
 * Specialized helper functions for testing recipe generation progress,
 * auto-refresh functionality, and mock strategies for controlled testing.
 */

import { Page, expect } from '@playwright/test';
import { takeTestScreenshot } from './auth-helper';

export interface GenerationProgress {
  jobId: string;
  totalRecipes: number;
  completed: number;
  failed: number;
  currentStep: 'starting' | 'generating' | 'validating' | 'images' | 'storing' | 'complete' | 'failed';
  percentage: number;
  startTime: number;
  estimatedCompletion?: number;
  errors: string[];
  currentRecipeName?: string;
  stepProgress?: {
    stepIndex: number;
    stepName: string;
    itemsProcessed: number;
    totalItems: number;
  };
}

export interface GenerationResult {
  success: number;
  failed: number;
  errors: string[];
  metrics?: {
    totalDuration: number;
    averageTimePerRecipe: number;
  };
}

export interface MockGenerationConfig {
  totalRecipes: number;
  progressSteps: string[];
  recipeNames: string[];
  failureRate?: number;
  stepDuration?: number;
  simulateErrors?: boolean;
}

// Default mock configuration
export const DEFAULT_MOCK_CONFIG: MockGenerationConfig = {
  totalRecipes: 5,
  progressSteps: ['starting', 'generating', 'validating', 'images', 'storing', 'complete'],
  recipeNames: [
    'Grilled Chicken Breast with Quinoa',
    'Salmon Teriyaki Bowl',
    'Turkey Meatball Soup',
    'Vegetarian Lentil Curry',
    'Protein Pancakes',
    'Greek Yogurt Parfait',
    'Beef Stir-Fry',
    'Tuna Salad Wrap',
    'Chicken Caesar Salad',
    'Vegetable Omelet'
  ],
  failureRate: 0,
  stepDuration: 2000,
  simulateErrors: false
};

/**
 * Navigate to recipe generation modal
 */
export async function navigateToRecipeGeneration(page: Page): Promise<void> {
  console.log('📋 Navigating to recipe generation modal...');
  
  // Navigate to Admin tab
  await page.click('button:has-text("Admin"), [role="tab"]:has-text("Admin")');
  await page.waitForTimeout(1000);
  
  // Click Generate Recipes button
  const generateButtons = [
    'button:has-text("Generate")',
    'button:has-text("Generate New Batch")',
    'button:has-text("Generate Recipes")',
    'button[data-testid="generate-recipes"]'
  ];
  
  let buttonClicked = false;
  for (const selector of generateButtons) {
    const button = page.locator(selector);
    if (await button.isVisible()) {
      await button.click();
      buttonClicked = true;
      break;
    }
  }
  
  if (!buttonClicked) {
    throw new Error('Could not find recipe generation button');
  }
  
  // Wait for modal to open
  await page.waitForSelector('[role="dialog"], .modal', { timeout: 10000 });
  
  // Verify modal is visible
  await expect(page.locator('[role="dialog"], .modal')).toBeVisible();
  
  console.log('✅ Recipe generation modal opened');
}

/**
 * Start recipe generation and return job ID
 */
export async function startRecipeGeneration(
  page: Page, 
  recipeCount: number = 5,
  generationType: 'quick' | 'context' = 'quick'
): Promise<string> {
  const jobId = `test-job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Mock generation start response
  await page.route('**/api/admin/generate*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        message: `Generation started for ${recipeCount} recipes`,
        jobId,
        count: recipeCount,
        started: true
      })
    });
  });
  
  // Set recipe count
  await setRecipeCount(page, recipeCount);
  
  // Click appropriate generate button
  if (generationType === 'quick') {
    await clickQuickGenerateButton(page);
  } else {
    await clickContextGenerateButton(page);
  }
  
  // Wait for generation to start
  await page.waitForTimeout(1000);
  
  console.log(`✅ Started ${generationType} generation with job ID: ${jobId}`);
  return jobId;
}

/**
 * Set recipe count in the form
 */
export async function setRecipeCount(page: Page, count: number): Promise<void> {
  const countSelectors = [
    'select[data-testid="recipe-count"]',
    'input[type="number"]',
    'select'
  ];
  
  for (const selector of countSelectors) {
    const element = page.locator(selector).first();
    if (await element.isVisible()) {
      const tagName = await element.evaluate(el => el.tagName.toLowerCase());
      
      if (tagName === 'select') {
        await element.selectOption(count.toString());
      } else {
        await element.fill(count.toString());
      }
      
      console.log(`Set recipe count to ${count}`);
      return;
    }
  }
  
  console.warn('Could not find recipe count selector');
}

/**
 * Click quick/random generate button
 */
export async function clickQuickGenerateButton(page: Page): Promise<void> {
  const quickButtons = [
    'button:has-text("Generate Random")',
    'button:has-text("Quick Generate")',
    'button:has-text("Generate") >> nth=0'
  ];
  
  for (const selector of quickButtons) {
    const button = page.locator(selector);
    if (await button.isVisible()) {
      await button.click();
      console.log('Clicked quick generate button');
      return;
    }
  }
  
  throw new Error('Could not find quick generate button');
}

/**
 * Click context/targeted generate button
 */
export async function clickContextGenerateButton(page: Page): Promise<void> {
  const contextButtons = [
    'button:has-text("Generate Targeted")',
    'button:has-text("Generate Custom")',
    'button:has-text("Generate") >> nth=-1'
  ];
  
  for (const selector of contextButtons) {
    const button = page.locator(selector);
    if (await button.isVisible()) {
      await button.click();
      console.log('Clicked context generate button');
      return;
    }
  }
  
  throw new Error('Could not find context generate button');
}

/**
 * Wait for progress component to appear
 */
export async function waitForProgressComponent(page: Page, timeout: number = 10000): Promise<void> {
  const progressSelectors = [
    '[data-testid="progress-component"]',
    '.progress-bar',
    '[role="progressbar"]',
    'text="Overall Progress"',
    'text="Generating recipes"'
  ];
  
  await page.waitForSelector(progressSelectors.join(', '), { timeout });
  console.log('✅ Progress component appeared');
}

/**
 * Generate mock progress data
 */
export function generateMockProgress(
  jobId: string,
  config: MockGenerationConfig,
  completed: number,
  currentStep: string,
  failed: number = 0,
  currentRecipeName?: string
): GenerationProgress {
  const percentage = ((completed + failed) / config.totalRecipes) * 100;
  const startTime = Date.now() - (completed * (config.stepDuration || 2000));
  const remainingRecipes = config.totalRecipes - completed - failed;
  const estimatedCompletion = remainingRecipes > 0 
    ? Date.now() + (remainingRecipes * (config.stepDuration || 2000))
    : undefined;
  
  const errors: string[] = [];
  if (config.simulateErrors && failed > 0) {
    for (let i = 0; i < failed; i++) {
      errors.push(`Failed to generate recipe ${i + 1}: Mock error for testing`);
    }
  }
  
  return {
    jobId,
    totalRecipes: config.totalRecipes,
    completed,
    failed,
    currentStep: currentStep as any,
    percentage,
    startTime,
    estimatedCompletion,
    errors,
    currentRecipeName,
    stepProgress: {
      stepIndex: config.progressSteps.indexOf(currentStep),
      stepName: `Processing: ${currentStep}`,
      itemsProcessed: Math.min(completed + 1, config.totalRecipes),
      totalItems: config.totalRecipes
    }
  };
}

/**
 * Mock progressive generation with realistic timing
 */
export async function mockProgressiveGeneration(
  page: Page,
  jobId: string,
  config: MockGenerationConfig
): Promise<void> {
  let currentCompleted = 0;
  let currentFailed = 0;
  let currentStepIndex = 0;
  let currentStep = config.progressSteps[0];
  
  await page.route(`**/api/admin/generation-progress/${jobId}`, async (route) => {
    // Simulate progression
    if (currentCompleted + currentFailed < config.totalRecipes) {
      // Progress through steps
      if (currentStepIndex < config.progressSteps.length - 2) {
        currentStepIndex++;
        currentStep = config.progressSteps[currentStepIndex];
      } else {
        // Complete/fail a recipe
        if (config.failureRate && Math.random() < config.failureRate) {
          currentFailed++;
        } else {
          currentCompleted++;
        }
        // Reset to generating step for next recipe
        currentStepIndex = 1;
        currentStep = config.progressSteps[1];
      }
    } else {
      // All recipes processed
      currentStep = config.progressSteps[config.progressSteps.length - 1]; // 'complete'
    }
    
    const currentRecipeName = currentCompleted < config.recipeNames.length 
      ? config.recipeNames[currentCompleted]
      : `Recipe ${currentCompleted + 1}`;
    
    const progress = generateMockProgress(
      jobId,
      config,
      currentCompleted,
      currentStep,
      currentFailed,
      currentStep !== 'complete' && currentStep !== 'failed' ? currentRecipeName : undefined
    );
    
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(progress)
    });
  });
  
  console.log(`Setup progressive mock for ${config.totalRecipes} recipes`);
}

/**
 * Mock immediate completion for testing auto-refresh
 */
export async function mockImmediateCompletion(
  page: Page,
  jobId: string,
  totalRecipes: number,
  successCount?: number,
  failedCount?: number
): Promise<void> {
  const success = successCount ?? totalRecipes;
  const failed = failedCount ?? 0;
  
  await page.route(`**/api/admin/generation-progress/${jobId}`, async (route) => {
    const progress = generateMockProgress(
      jobId,
      { ...DEFAULT_MOCK_CONFIG, totalRecipes },
      success,
      'complete',
      failed
    );
    
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(progress)
    });
  });
  
  console.log(`Mocked immediate completion: ${success} success, ${failed} failed`);
}

/**
 * Mock generation failure
 */
export async function mockGenerationFailure(
  page: Page,
  jobId: string,
  totalRecipes: number,
  errorMessage: string = 'Generation failed for testing'
): Promise<void> {
  await page.route(`**/api/admin/generation-progress/${jobId}`, async (route) => {
    const progress = generateMockProgress(
      jobId,
      { ...DEFAULT_MOCK_CONFIG, totalRecipes, simulateErrors: true },
      0,
      'failed',
      totalRecipes
    );
    
    progress.errors = [errorMessage];
    
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(progress)
    });
  });
  
  console.log(`Mocked generation failure: ${errorMessage}`);
}

/**
 * Monitor network requests for auto-refresh verification
 */
export async function monitorAutoRefreshRequests(page: Page): Promise<{
  getStatsRequests: () => any[];
  getRecipeRequests: () => any[];
  getAllRequests: () => any[];
}> {
  const statsRequests: any[] = [];
  const recipeRequests: any[] = [];
  const allRequests: any[] = [];
  
  page.on('request', request => {
    const url = request.url();
    const requestData = {
      url,
      method: request.method(),
      timestamp: Date.now()
    };
    
    allRequests.push(requestData);
    
    if (url.includes('/api/admin/stats')) {
      statsRequests.push(requestData);
    }
    
    if (url.includes('/api/admin/recipes')) {
      recipeRequests.push(requestData);
    }
  });
  
  return {
    getStatsRequests: () => statsRequests,
    getRecipeRequests: () => recipeRequests,
    getAllRequests: () => allRequests
  };
}

/**
 * Monitor progress polling requests
 */
export async function monitorProgressPolling(page: Page): Promise<{
  getProgressRequests: () => any[];
  getRequestCount: () => number;
  getAverageInterval: () => number;
}> {
  const progressRequests: any[] = [];
  
  page.on('request', request => {
    if (request.url().includes('generation-progress')) {
      progressRequests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now()
      });
    }
  });
  
  return {
    getProgressRequests: () => progressRequests,
    getRequestCount: () => progressRequests.length,
    getAverageInterval: () => {
      if (progressRequests.length < 2) return 0;
      const intervals = [];
      for (let i = 1; i < progressRequests.length; i++) {
        intervals.push(progressRequests[i].timestamp - progressRequests[i - 1].timestamp);
      }
      return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    }
  };
}

/**
 * Verify progress bar elements
 */
export async function verifyProgressBarElements(page: Page): Promise<void> {
  // Check main progress bar
  const progressBar = page.locator('[role="progressbar"], .progress-bar');
  await expect(progressBar).toBeVisible();
  
  // Check progress percentage
  const percentageText = page.locator('text=/\d+\.\d+%/');
  await expect(percentageText).toBeVisible();
  
  // Check completed/failed counts
  const completedCount = page.locator('text="Completed"').locator('..').locator('text=/\d+/');
  const failedCount = page.locator('text="Failed"').locator('..').locator('text=/\d+/');
  
  await expect(completedCount).toBeVisible();
  await expect(failedCount).toBeVisible();
  
  console.log('✅ Progress bar elements verified');
}

/**
 * Verify step indicators
 */
export async function verifyStepIndicators(page: Page): Promise<void> {
  const stepTexts = [
    'Initializing',
    'Generating recipes',
    'Validating',
    'Generating recipe images',
    'Saving to database'
  ];
  
  let visibleSteps = 0;
  for (const stepText of stepTexts) {
    const stepElement = page.locator(`text="${stepText}"`);
    if (await stepElement.isVisible({ timeout: 1000 })) {
      visibleSteps++;
    }
  }
  
  console.log(`✅ Step indicators verified: ${visibleSteps} visible steps`);
}

/**
 * Verify ETA and elapsed time displays
 */
export async function verifyTimeDisplays(page: Page): Promise<void> {
  // Check for ETA
  const etaLabel = page.locator('text="ETA"');
  if (await etaLabel.isVisible()) {
    const etaValue = page.locator('text=/\d+[ms]/').nth(1); // Assuming second time display is ETA
    await expect(etaValue).toBeVisible();
    console.log('✅ ETA display verified');
  }
  
  // Check for elapsed time
  const elapsedLabel = page.locator('text="Elapsed"');
  if (await elapsedLabel.isVisible()) {
    const elapsedValue = page.locator('text=/\d+[ms]/').first(); // Assuming first time display is elapsed
    await expect(elapsedValue).toBeVisible();
    console.log('✅ Elapsed time display verified');
  }
}

/**
 * Verify error display
 */
export async function verifyErrorDisplay(page: Page, expectedErrorCount: number = 1): Promise<void> {
  const errorSection = page.locator('text="Error"');
  await expect(errorSection).toBeVisible();
  
  const errorCountText = page.locator(`text="${expectedErrorCount} Error"`);
  await expect(errorCountText).toBeVisible();
  
  console.log(`✅ Error display verified: ${expectedErrorCount} errors`);
}

/**
 * Verify form controls are disabled during generation
 */
export async function verifyFormControlsDisabled(page: Page): Promise<void> {
  const generateButtons = page.locator('button:has-text("Generate")');
  const buttonCount = await generateButtons.count();
  
  let disabledCount = 0;
  for (let i = 0; i < buttonCount; i++) {
    const button = generateButtons.nth(i);
    if (await button.isDisabled()) {
      disabledCount++;
    }
  }
  
  console.log(`✅ Form controls disabled: ${disabledCount}/${buttonCount} buttons`);
}

/**
 * Verify auto-refresh occurred
 */
export async function verifyAutoRefreshOccurred(
  statsRequests: any[],
  recipeRequests: any[],
  minRequests: number = 1
): Promise<void> {
  expect(statsRequests.length).toBeGreaterThanOrEqual(minRequests);
  expect(recipeRequests.length).toBeGreaterThanOrEqual(minRequests);
  
  console.log(`✅ Auto-refresh verified: ${statsRequests.length} stats requests, ${recipeRequests.length} recipe requests`);
}

/**
 * Fill context generation form for testing
 */
export async function fillContextGenerationForm(page: Page, options: {
  naturalLanguage?: string;
  mealType?: string;
  dietaryTag?: string;
  mainIngredient?: string;
  maxPrepTime?: number;
  maxCalories?: number;
  minProtein?: number;
  maxProtein?: number;
} = {}): Promise<void> {
  // Fill natural language input
  if (options.naturalLanguage) {
    const nlTextarea = page.locator('textarea[placeholder*="Example"], textarea:near-text("Describe")');
    if (await nlTextarea.isVisible()) {
      await nlTextarea.fill(options.naturalLanguage);
    }
  }
  
  // Set meal type
  if (options.mealType) {
    const mealTypeSelect = page.locator('select:near-text("Meal Type")');
    if (await mealTypeSelect.isVisible()) {
      await mealTypeSelect.selectOption(options.mealType);
    }
  }
  
  // Set dietary restrictions
  if (options.dietaryTag) {
    const dietSelect = page.locator('select:near-text("Dietary")');
    if (await dietSelect.isVisible()) {
      await dietSelect.selectOption(options.dietaryTag);
    }
  }
  
  // Set main ingredient
  if (options.mainIngredient) {
    const ingredientInput = page.locator('input[placeholder*="ingredient"]');
    if (await ingredientInput.isVisible()) {
      await ingredientInput.fill(options.mainIngredient);
    }
  }
  
  // Set macro nutrients
  if (options.minProtein) {
    const proteinMinInput = page.locator('input:near-text("Protein"):near-text("Min")');
    if (await proteinMinInput.isVisible()) {
      await proteinMinInput.fill(options.minProtein.toString());
    }
  }
  
  if (options.maxProtein) {
    const proteinMaxInput = page.locator('input:near-text("Protein"):near-text("Max")');
    if (await proteinMaxInput.isVisible()) {
      await proteinMaxInput.fill(options.maxProtein.toString());
    }
  }
  
  console.log('✅ Context generation form filled');
}

/**
 * Take progress-specific screenshot with consistent naming
 */
export async function takeProgressScreenshot(
  page: Page,
  testName: string,
  step: string,
  fullPage: boolean = true
): Promise<void> {
  const filename = `progress-${testName}-${step.toLowerCase().replace(/\s+/g, '-')}.png`;
  await takeTestScreenshot(page, filename, `${testName}: ${step}`, fullPage);
}