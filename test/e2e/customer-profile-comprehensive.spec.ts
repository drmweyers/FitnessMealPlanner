/**
 * Customer Profile E2E Test Suite
 * Tests comprehensive customer profile functionality including:
 * - Progress tracking (weight, measurements)
 * - Meal plan viewing
 * - Trainer-assigned meal plans
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4000';
const TEST_CREDENTIALS = {
  customer: {
    email: 'customer.test@evofitmeals.com',
    password: 'TestCustomer123!'
  },
  trainer: {
    email: 'trainer.test@evofitmeals.com',
    password: 'TestTrainer123!'
  }
};

test.describe('Customer Profile Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto(BASE_URL);
  });

  test('Customer can login and view dashboard', async ({ page }) => {
    // Login as customer
    await page.fill('input[name="email"]', TEST_CREDENTIALS.customer.email);
    await page.fill('input[name="password"]', TEST_CREDENTIALS.customer.password);
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForURL('**/customer/**', { timeout: 10000 });

    // Verify dashboard elements are present
    await expect(page.locator('text=Welcome')).toBeVisible();
  });

  test('Customer can view progress tracking data', async ({ page }) => {
    // Login as customer
    await page.fill('input[name="email"]', TEST_CREDENTIALS.customer.email);
    await page.fill('input[name="password"]', TEST_CREDENTIALS.customer.password);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/customer/**', { timeout: 10000 });

    // Navigate to Progress tab
    await page.click('text=Progress');

    // Wait for progress data to load
    await page.waitForSelector('[data-testid="progress-tracking"]', { timeout: 10000 });

    // Check for weight progress card
    const weightCard = page.locator('text=Weight Progress').first();
    await expect(weightCard).toBeVisible();

    // Verify measurements card is visible
    const measurementsCard = page.locator('text=Body Measurements').first();
    await expect(measurementsCard).toBeVisible();

    // Check that error messages are NOT present
    await expect(page.locator('text=Failed to load weight data')).not.toBeVisible();
    await expect(page.locator('text=Failed to load measurement data')).not.toBeVisible();
  });

  test('Customer can view assigned meal plans with correct nutrition data', async ({ page }) => {
    // Login as customer
    await page.fill('input[name="email"]', TEST_CREDENTIALS.customer.email);
    await page.fill('input[name="password"]', TEST_CREDENTIALS.customer.password);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/customer/**', { timeout: 10000 });

    // Click on Meal Plans tab/section
    await page.click('text=Meal Plans');

    // Wait for meal plans to load
    await page.waitForSelector('[data-testid="meal-plan-card"]', { timeout: 10000 });

    // Verify meal plan cards are present
    const mealPlanCards = page.locator('[data-testid="meal-plan-card"]');
    const cardCount = await mealPlanCards.count();
    expect(cardCount).toBeGreaterThan(0);

    // Click on first meal plan to view details
    await mealPlanCards.first().click();

    // Wait for meal plan details modal/page
    await page.waitForSelector('[data-testid="meal-plan-details"]', { timeout: 10000 });

    // Verify nutrition data is NOT zero
    const calorieText = page.locator('text=/\\d+ Avg Cal\\/Day/');
    await expect(calorieText).toBeVisible();

    const calorieValue = await calorieText.textContent();
    expect(calorieValue).not.toContain('0 Avg Cal/Day');

    // Verify protein data is NOT zero
    const proteinText = page.locator('text=/\\d+g Avg Protein\\/Day/');
    await expect(proteinText).toBeVisible();

    const proteinValue = await proteinText.textContent();
    expect(proteinValue).not.toContain('0g Avg Protein/Day');

    // Verify assignment date is NOT "Invalid Date"
    const assignmentDate = page.locator('text=This meal plan was assigned to you on');
    await expect(assignmentDate).toBeVisible();

    const dateText = await assignmentDate.textContent();
    expect(dateText).not.toContain('Invalid Date');
  });

  test('Customer profile shows progress measurements timeline', async ({ page }) => {
    // Login as customer
    await page.fill('input[name="email"]', TEST_CREDENTIALS.customer.email);
    await page.fill('input[name="password"]', TEST_CREDENTIALS.customer.password);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/customer/**', { timeout: 10000 });

    // Navigate to Progress → Measurements
    await page.click('text=Progress');
    await page.click('text=Measurements');

    // Wait for measurements table/list
    await page.waitForSelector('[data-testid="measurements-list"]', { timeout: 10000 });

    // Verify at least 3 measurement entries exist (from seed data)
    const measurementRows = page.locator('[data-testid="measurement-row"]');
    const rowCount = await measurementRows.count();
    expect(rowCount).toBeGreaterThanOrEqual(3);

    // Verify weight data is visible
    const weightData = page.locator('text=/\\d+(\\.\\d+)? kg/');
    await expect(weightData.first()).toBeVisible();
  });

  test('Customer can view goal progress', async ({ page }) => {
    // Login as customer
    await page.fill('input[name="email"]', TEST_CREDENTIALS.customer.email);
    await page.fill('input[name="password"]', TEST_CREDENTIALS.customer.password);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/customer/**', { timeout: 10000 });

    // Navigate to Progress → Goals
    await page.click('text=Progress');
    await page.click('text=Goals');

    // Wait for goals section
    await page.waitForSelector('[data-testid="goals-list"]', { timeout: 10000 });

    // Verify goal card exists
    const goalCard = page.locator('[data-testid="goal-card"]').first();
    await expect(goalCard).toBeVisible();

    // Verify progress percentage is shown
    const progressPercentage = page.locator('text=/%\\s+Progress/');
    await expect(progressPercentage).toBeVisible();
  });
});

test.describe('Trainer-Customer Integration Tests', () => {
  test('Trainer can view customer profile and assigned meal plans', async ({ page }) => {
    // Login as trainer
    await page.goto(BASE_URL);
    await page.fill('input[name="email"]', TEST_CREDENTIALS.trainer.email);
    await page.fill('input[name="password"]', TEST_CREDENTIALS.trainer.password);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/trainer/**', { timeout: 10000 });

    // Navigate to Customers section
    await page.click('text=Customers');

    // Wait for customer list
    await page.waitForSelector('[data-testid="customer-list"]', { timeout: 10000 });

    // Find and click on test customer
    const customerCard = page.locator(`text=${TEST_CREDENTIALS.customer.email}`).first();
    await customerCard.click();

    // Wait for customer detail view
    await page.waitForSelector('[data-testid="customer-detail-view"]', { timeout: 10000 });

    // Verify meal plan assignments are visible
    const assignedPlans = page.locator('[data-testid="assigned-meal-plan"]');
    const planCount = await assignedPlans.count();
    expect(planCount).toBeGreaterThan(0);
  });

  test('Trainer can create and assign custom meal plan to customer', async ({ page }) => {
    // Login as trainer
    await page.goto(BASE_URL);
    await page.fill('input[name="email"]', TEST_CREDENTIALS.trainer.email);
    await page.fill('input[name="password"]', TEST_CREDENTIALS.trainer.password);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/trainer/**', { timeout: 10000 });

    // Navigate to Create Meal Plan
    await page.click('text=Create Meal Plan');

    // Fill in meal plan details
    await page.fill('input[name="planName"]', `E2E Test Plan ${Date.now()}`);
    await page.selectOption('select[name="fitnessGoal"]', 'muscle_building');
    await page.fill('input[name="days"]', '1');
    await page.fill('input[name="mealsPerDay"]', '2');

    // Add first meal
    await page.click('button:has-text("Add Meal")');
    await page.fill('input[name="mealName-0"]', 'Breakfast Bowl');
    await page.selectOption('select[name="category-0"]', 'breakfast');

    // Add second meal
    await page.click('button:has-text("Add Meal")');
    await page.fill('input[name="mealName-1"]', 'Lunch Salad');
    await page.selectOption('select[name="category-1"]', 'lunch');

    // Save meal plan
    await page.click('button:has-text("Save Meal Plan")');

    // Wait for save confirmation
    await page.waitForSelector('text=Meal plan created successfully', { timeout: 10000 });

    // Assign to customer
    await page.click('text=Assign to Customer');
    await page.selectOption('select[name="customerId"]', TEST_CREDENTIALS.customer.email);
    await page.click('button:has-text("Assign")');

    // Verify assignment success
    await page.waitForSelector('text=Meal plan assigned successfully', { timeout: 10000 });
  });
});
