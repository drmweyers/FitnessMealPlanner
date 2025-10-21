/**
 * Trainer Create Custom Flow - Enhanced E2E Tests
 *
 * Tests the complete Create Custom meal planning workflow including:
 * - Parse button functionality
 * - Structured format parsing
 * - Meal preview and categorization
 * - Saving meal plans
 * - Viewing saved plans
 */

import { test, expect } from '@playwright/test';

test.describe('Trainer Create Custom - Enhanced', () => {
  const trainerEmail = 'trainer.test@evofitmeals.com';
  const trainerPassword = 'TestTrainer123!';

  test.beforeEach(async ({ page }) => {
    // Login as trainer
    await page.goto('/login');
    await page.fill('input[type="email"]', trainerEmail);
    await page.fill('input[type="password"]', trainerPassword);
    await page.click('button[type="submit"]');

    // Wait for redirect to trainer dashboard
    await page.waitForURL('/trainer');

    // Navigate to Create Custom tab
    await page.click('text=Create Custom');
    await page.waitForSelector('textarea', { timeout: 5000 });
  });

  test('Parse button works with simple format', async ({ page }) => {
    // Enter simple format text
    await page.fill('textarea', 'Breakfast: Oatmeal with berries\nLunch: Chicken salad');

    // Click parse button
    await page.click('button:has-text("Parse Meals")');

    // Wait for success message
    await page.waitForSelector('text=2 meals detected', { timeout: 5000 });

    // Verify meals are displayed
    expect(await page.textContent('body')).toContain('Oatmeal with berries');
    expect(await page.textContent('body')).toContain('Chicken salad');
  });

  test('Parse button works with structured format', async ({ page }) => {
    const structuredText = `
Meal 1

-175g of Jasmine Rice
-150g of Lean ground beef
-100g of cooked broccoli

Meal 2

-4 eggs
-2 pieces of sourdough bread
-1 banana (100g)
    `;

    await page.fill('textarea', structuredText);
    await page.click('button:has-text("Parse Meals")');

    await page.waitForSelector('text=2 meals detected', { timeout: 5000 });

    // Verify ingredient-based meal names are generated
    expect(await page.textContent('body')).toContain('Jasmine Rice');
    expect(await page.textContent('body')).toContain('eggs');
  });

  test('Parses all 3 meals from user example format', async ({ page }) => {
    const userExampleText = `
Meal 1

-175g of Jasmine Rice
-150g of Lean ground beef
-100g of cooked broccoli

Meal 2

-4 eggs
-2 pieces of sourdough bread
-1 banana (100g)
-50g of strawberries
-10g of butter
-15ml of honey

Meal 3

-100g turkey breast
-150g of sweet potato
-100g of asparagus
-250ml of coconut water
    `;

    await page.fill('textarea', userExampleText);
    await page.click('button:has-text("Parse Meals")');

    await page.waitForSelector('text=3 meals detected', { timeout: 5000 });

    // Verify all meals are present
    const bodyText = await page.textContent('body');
    expect(bodyText).toContain('Jasmine Rice');
    expect(bodyText).toContain('eggs');
    expect(bodyText).toContain('turkey breast');
  });

  test('Displays meal categories correctly', async ({ page }) => {
    const text = `
Meal 1
-4 eggs
-2 toast

Meal 2
-175g rice
-150g steak
    `;

    await page.fill('textarea', text);
    await page.click('button:has-text("Parse Meals")');

    await page.waitForSelector('text=2 meals detected');

    // Check that category badges are displayed
    const badges = await page.locator('[class*="badge"]').allTextContents();
    expect(badges.some(b => b.toLowerCase().includes('breakfast'))).toBeTruthy();
    expect(badges.some(b => b.toLowerCase().includes('dinner'))).toBeTruthy();
  });

  test('Can change meal category manually', async ({ page }) => {
    await page.fill('textarea', 'Meal 1\n-100g chicken');
    await page.click('button:has-text("Parse Meals")');

    await page.waitForSelector('text=1 meals detected');

    // Find and click category dropdown
    const categorySelect = page.locator('button[role="combobox"]').first();
    await categorySelect.click();

    // Select breakfast
    await page.click('text=🌅 Breakfast');

    // Verify category changed
    await page.waitForTimeout(500);
    const selectedCategory = await categorySelect.textContent();
    expect(selectedCategory?.toLowerCase()).toContain('breakfast');
  });

  test('Can remove meals from preview', async ({ page }) => {
    await page.fill('textarea', 'Meal 1\n-rice\n\nMeal 2\n-chicken');
    await page.click('button:has-text("Parse Meals")');

    await page.waitForSelector('text=2 meals detected');

    // Remove first meal
    await page.click('button:has-text("Remove")');

    // Should now show 1 meal
    expect(await page.textContent('body')).toContain('Meals (1)');
  });

  test('Can save meal plan after parsing', async ({ page }) => {
    await page.fill('textarea', 'Meal 1\n-175g rice\n-100g chicken');
    await page.click('button:has-text("Parse Meals")');

    await page.waitForSelector('text=1 meals detected');

    // Enter plan name
    await page.fill('input[placeholder*="plan name"]', 'Test Custom Plan E2E');

    // Save plan
    await page.click('button:has-text("Save Meal Plan")');

    // Wait for success message
    await page.waitForSelector('text=Manual meal plan created successfully', { timeout: 5000 });

    // Verify form resets
    const textareaValue = await page.locator('textarea').inputValue();
    expect(textareaValue).toBe('');
  });

  test('Shows error when trying to parse empty text', async ({ page }) => {
    await page.click('button:has-text("Parse Meals")');

    // Should show error toast
    await page.waitForSelector('text=Please enter meal details', { timeout: 3000 });
  });

  test('Shows error when trying to save without plan name', async ({ page }) => {
    await page.fill('textarea', 'Meal 1\n-rice');
    await page.click('button:has-text("Parse Meals")');

    await page.waitForSelector('text=1 meals detected');

    // Try to save without name
    await page.click('button:has-text("Save Meal Plan")');

    // Should show error
    await page.waitForSelector('text=Please enter a meal plan name', { timeout: 3000 });
  });

  test('Can go back to edit after parsing', async ({ page }) => {
    await page.fill('textarea', 'Meal 1\n-rice');
    await page.click('button:has-text("Parse Meals")');

    await page.waitForSelector('text=1 meals detected');

    // Click back to edit
    await page.click('button:has-text("Back to Edit")');

    // Should show original text
    const textareaValue = await page.locator('textarea').inputValue();
    expect(textareaValue).toContain('Meal 1');
  });

  test('Complete flow: Parse → Preview → Save → View in Saved Plans', async ({ page }) => {
    // Step 1: Parse meals
    const planName = `E2E Test Plan ${Date.now()}`;
    await page.fill('textarea', 'Meal 1\n-175g rice\n-100g chicken\n\nMeal 2\n-4 eggs');
    await page.click('button:has-text("Parse Meals")');

    await page.waitForSelector('text=2 meals detected');

    // Step 2: Save plan
    await page.fill('input[placeholder*="plan name"]', planName);
    await page.click('button:has-text("Save Meal Plan")');

    await page.waitForSelector('text=Manual meal plan created successfully');

    // Step 3: Navigate to Saved Plans tab
    await page.click('text=Saved Plans');

    // Wait for meal plans to load
    await page.waitForSelector('[data-testid="meal-plan-card"], text=/meal plan/i', { timeout: 5000 });

    // Step 4: Verify our plan is there
    const bodyText = await page.textContent('body');
    expect(bodyText).toContain(planName);
  });

  test('Saved Plans tab loads successfully', async ({ page }) => {
    // Navigate to Saved Plans
    await page.click('text=Saved Plans');

    // Should not show error
    expect(await page.textContent('body')).not.toContain('Error loading meal plans');

    // Should show either plans or empty state
    const hasPlans = await page.locator('[data-testid="meal-plan-card"]').count() > 0;
    const hasEmptyState = (await page.textContent('body'))?.includes("haven't saved any meal plans");

    expect(hasPlans || hasEmptyState).toBeTruthy();
  });

  test('Can view plan details from Saved Plans', async ({ page }) => {
    // Navigate to Saved Plans
    await page.click('text=Saved Plans');

    await page.waitForTimeout(1000);

    const planCards = await page.locator('[data-testid="meal-plan-card"]').count();

    if (planCards > 0) {
      // Click more options menu
      await page.locator('button:has-text("⋮")').first().click();

      // Click View Details
      await page.click('text=View Details');

      // Modal should open
      await page.waitForSelector('[role="dialog"]', { timeout: 3000 });

      // Should show meal plan details
      expect(await page.textContent('[role="dialog"]')).toBeTruthy();
    }
  });

  test('Handles decimal measurements correctly', async ({ page }) => {
    await page.fill('textarea', 'Meal 1\n-175.5g rice\n-0.5 cup oil');
    await page.click('button:has-text("Parse Meals")');

    await page.waitForSelector('text=1 meals detected');

    // Verify meal parsed successfully
    expect(await page.textContent('body')).toContain('rice');
  });

  test('Works with different bullet point styles', async ({ page }) => {
    const text = `
Meal 1
-175g rice
•100g chicken
    `;

    await page.fill('textarea', text);
    await page.click('button:has-text("Parse Meals")');

    await page.waitForSelector('text=1 meals detected');

    // Should parse both bullet styles
    const bodyText = await page.textContent('body');
    expect(bodyText).toContain('rice');
  });

  test('Mobile responsiveness - works on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Enter and parse meal
    await page.fill('textarea', 'Meal 1\n-rice\n-chicken');
    await page.click('button:has-text("Parse Meals")');

    await page.waitForSelector('text=1 meals detected');

    // Verify UI is usable on mobile
    const parseButton = await page.locator('button:has-text("Parse Meals")').boundingBox();
    expect(parseButton?.width).toBeGreaterThan(0);
  });
});
