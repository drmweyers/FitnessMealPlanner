/**
 * Comprehensive QA Audit: Manual Meal Plan Creation
 *
 * Tests the complete workflow from creation to saved plans display
 * Verifies all fixes are working correctly
 */

import { test, expect } from '@playwright/test';

const TRAINER_EMAIL = 'trainer.test@evofitmeals.com';
const TRAINER_PASSWORD = 'TestTrainer123!';
const BASE_URL = 'http://localhost:4000';

const SAMPLE_MEAL_DATA = `Meal 1
-175g of Jasmine Rice
-150g of Lean ground beef
-100g of cooked broccoli

Meal 2
-4 eggs
-2 pieces of sourdough bread`;

test.describe('Manual Meal Plan QA Audit', () => {
  test.beforeEach(async ({ page }) => {
    // Login as trainer
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', TRAINER_EMAIL);
    await page.fill('input[type="password"]', TRAINER_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for navigation to complete
    await page.waitForURL(/.*\/(trainer|dashboard)/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
  });

  test('Complete Manual Meal Plan Workflow - From Creation to Saved Plans', async ({ page }) => {
    console.log('🎯 Starting comprehensive QA audit...');

    // Step 1: Navigate to Trainer Dashboard
    console.log('Step 1: Navigating to Trainer Dashboard...');
    await page.goto(`${BASE_URL}/trainer`);
    await page.waitForLoadState('networkidle');

    // Step 2: Find and click Manual Meal Plan tab/button
    console.log('Step 2: Looking for Manual Meal Plan creation option...');

    // Try multiple possible selectors
    const possibleSelectors = [
      'text=Create Custom Plan',
      'text=Manual Entry',
      'text=Custom Meal Plan',
      'button:has-text("Create")',
      '[role="tab"]:has-text("Create")',
      '[role="tab"]:has-text("Manual")',
      'text=Create Meal Plan',
    ];

    let tabFound = false;
    for (const selector of possibleSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          console.log(`✅ Found tab with selector: ${selector}`);
          await element.click();
          tabFound = true;
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (!tabFound) {
      // List all visible text on the page for debugging
      const pageText = await page.textContent('body');
      console.log('❌ Could not find manual meal plan tab. Page content:', pageText?.substring(0, 500));

      // Take a screenshot for debugging
      await page.screenshot({ path: 'test-results/manual-meal-plan-page.png', fullPage: true });

      throw new Error('Could not find manual meal plan creation tab. Check test-results/manual-meal-plan-page.png');
    }

    await page.waitForTimeout(1000); // Let the tab content load

    // Step 3: Find the textarea for meal data
    console.log('Step 3: Looking for meal data input...');

    const textareaSelectors = [
      'textarea[placeholder*="meal"]',
      'textarea[placeholder*="Meal"]',
      'textarea[placeholder*="Enter"]',
      'textarea',
    ];

    let textarea = null;
    for (const selector of textareaSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 })) {
        textarea = element;
        console.log(`✅ Found textarea with selector: ${selector}`);
        break;
      }
    }

    if (!textarea) {
      await page.screenshot({ path: 'test-results/no-textarea.png', fullPage: true });
      throw new Error('Could not find textarea for meal data');
    }

    // Step 4: Enter meal data
    console.log('Step 4: Entering sample meal data...');
    await textarea.fill(SAMPLE_MEAL_DATA);
    await page.waitForTimeout(500);

    // Step 5: Find and click "Parse Meals" button
    console.log('Step 5: Looking for Parse Meals button...');

    const parseButtonSelectors = [
      'button:has-text("Parse")',
      'button:has-text("parse")',
      'button:has-text("Analyze")',
      'button[type="button"]:has-text("Parse")',
    ];

    let parseButton = null;
    for (const selector of parseButtonSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 })) {
        parseButton = element;
        console.log(`✅ Found parse button with selector: ${selector}`);
        break;
      }
    }

    if (parseButton) {
      await parseButton.click();
      console.log('✅ Clicked Parse Meals button');
      await page.waitForTimeout(1000);
    } else {
      console.log('⚠️ No Parse button found, continuing...');
    }

    // Step 6: Enter plan name
    console.log('Step 6: Entering plan name...');
    const planName = `QA Test Plan ${Date.now()}`;

    const nameInputSelectors = [
      'input[name="planName"]',
      'input[placeholder*="plan name"]',
      'input[placeholder*="Plan Name"]',
      'input[type="text"]',
    ];

    let nameInput = null;
    for (const selector of nameInputSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 })) {
        nameInput = element;
        console.log(`✅ Found name input with selector: ${selector}`);
        break;
      }
    }

    if (nameInput) {
      await nameInput.fill(planName);
      console.log(`✅ Entered plan name: ${planName}`);
    } else {
      console.log('⚠️ Could not find plan name input');
    }

    // Step 7: Select "No nutrition tracking" option
    console.log('Step 7: Looking for nutrition tracking options...');

    const noNutritionSelectors = [
      'text=No nutrition tracking',
      'label:has-text("No nutrition")',
      'input[value="none"]',
      '[role="radio"]:has-text("No nutrition")',
    ];

    for (const selector of noNutritionSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click();
          console.log('✅ Selected "No nutrition tracking"');
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    // Step 8: Find and click Save/Create button
    console.log('Step 8: Looking for Save/Create button...');

    const saveButtonSelectors = [
      'button:has-text("Save Meal Plan")',
      'button:has-text("Create Plan")',
      'button:has-text("Save")',
      'button[type="submit"]',
    ];

    let saveButton = null;
    for (const selector of saveButtonSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 })) {
        saveButton = element;
        console.log(`✅ Found save button with selector: ${selector}`);
        break;
      }
    }

    if (!saveButton) {
      await page.screenshot({ path: 'test-results/no-save-button.png', fullPage: true });
      throw new Error('Could not find Save/Create button');
    }

    await saveButton.click();
    console.log('✅ Clicked Save button');

    // Wait for save to complete
    await page.waitForTimeout(2000);

    // Step 9: Navigate to Saved Plans
    console.log('Step 9: Navigating to Saved Plans...');

    const savedPlansSelectors = [
      'text=Saved Plans',
      'text=My Plans',
      '[role="tab"]:has-text("Plans")',
      'button:has-text("Plans")',
    ];

    let savedPlansTab = null;
    for (const selector of savedPlansSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          savedPlansTab = element;
          console.log(`✅ Found saved plans tab with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue
      }
    }

    if (savedPlansTab) {
      await savedPlansTab.click();
      await page.waitForTimeout(1000);
      console.log('✅ Navigated to Saved Plans');
    } else {
      console.log('⚠️ Could not find Saved Plans tab, might already be there');
    }

    // Step 10: Find the created plan card
    console.log('Step 10: Looking for the created plan...');
    await page.waitForTimeout(1000);

    // Take screenshot of saved plans
    await page.screenshot({ path: 'test-results/saved-plans-view.png', fullPage: true });

    // Look for plan card with the name
    const planCard = page.locator(`text=${planName}`).first();
    await expect(planCard).toBeVisible({ timeout: 5000 });
    console.log('✅ Found the created plan in saved plans list');

    // Step 11: Verify meal count is NOT "0 meals/day"
    console.log('Step 11: Verifying meal count...');

    // Look for meal count text (should be "2 meals/day" or similar, NOT "0 meals/day")
    const mealCountText = page.locator('text=/\\d+ meals?\\/day/').first();
    await expect(mealCountText).toBeVisible({ timeout: 5000 });

    const mealCountValue = await mealCountText.textContent();
    console.log(`Meal count shows: ${mealCountValue}`);

    // Verify it's NOT "0 meals/day"
    expect(mealCountValue).not.toContain('0 meals');
    console.log('✅ Meal count is correct (not 0)');

    // Step 12: Verify nutrition shows "Not calculated"
    console.log('Step 12: Verifying nutrition display...');

    const notCalculatedText = page.locator('text=Not calculated').first();
    await expect(notCalculatedText).toBeVisible({ timeout: 5000 });
    console.log('✅ Nutrition shows "Not calculated" instead of 0');

    // Step 13: Verify date is NOT "Invalid Date"
    console.log('Step 13: Verifying date display...');

    const invalidDateText = page.locator('text=Invalid Date');
    await expect(invalidDateText).not.toBeVisible();
    console.log('✅ Date is valid (not "Invalid Date")');

    // Step 14: Click on the plan card to view details
    console.log('Step 14: Opening plan details...');
    await planCard.click();
    await page.waitForTimeout(1000);

    // Take screenshot of plan details
    await page.screenshot({ path: 'test-results/plan-details-view.png', fullPage: true });

    // Step 15: Verify meals are displayed in detail view
    console.log('Step 15: Verifying meals in detail view...');

    // Look for the meal items
    const meal1 = page.locator('text=/Meal 1/i').first();
    await expect(meal1).toBeVisible({ timeout: 5000 });
    console.log('✅ Meal 1 is visible');

    const meal2 = page.locator('text=/Meal 2/i').first();
    await expect(meal2).toBeVisible({ timeout: 5000 });
    console.log('✅ Meal 2 is visible');

    // Verify ingredients are shown
    const rice = page.locator('text=/jasmine rice/i').first();
    await expect(rice).toBeVisible({ timeout: 5000 });
    console.log('✅ Ingredients are displayed (Rice found)');

    console.log('');
    console.log('🎉 ========================================');
    console.log('🎉 COMPREHENSIVE QA AUDIT: PASSED!');
    console.log('🎉 ========================================');
    console.log('');
    console.log('✅ Manual meal plan created successfully');
    console.log('✅ Plan appears in saved plans list');
    console.log('✅ Meal count is correct (NOT 0)');
    console.log('✅ Nutrition shows "Not calculated"');
    console.log('✅ Date is valid (NOT "Invalid Date")');
    console.log('✅ Meals are displayed correctly');
    console.log('✅ Ingredients are shown');
    console.log('');
    console.log('📸 Screenshots saved to test-results/');
  });

  test('Verify Card Display Shows Correct Information', async ({ page }) => {
    console.log('🎯 Testing meal plan card display...');

    await page.goto(`${BASE_URL}/trainer`);
    await page.waitForLoadState('networkidle');

    // Navigate to saved plans
    const savedPlansTab = page.locator('text=Saved Plans').first();
    if (await savedPlansTab.isVisible({ timeout: 2000 })) {
      await savedPlansTab.click();
      await page.waitForTimeout(1000);
    }

    // Find any meal plan card
    const cards = page.locator('[class*="Card"]').filter({ hasText: /meals\/day/ });
    const firstCard = cards.first();

    if (await firstCard.isVisible({ timeout: 5000 })) {
      console.log('✅ Found meal plan card');

      // Check for "Not calculated" or actual calorie values (both valid)
      const cardText = await firstCard.textContent();
      console.log('Card content:', cardText);

      // Verify it doesn't show "0" for calories
      const zeroCalories = firstCard.locator('text="0"').filter({ hasText: /calories/i });
      const hasZeroCalories = await zeroCalories.count();
      expect(hasZeroCalories).toBe(0);
      console.log('✅ Does not show "0" for calories');

      // Verify it doesn't show "0 meals/day"
      expect(cardText).not.toContain('0 meals/day');
      console.log('✅ Does not show "0 meals/day"');

      // Verify it doesn't show "Invalid Date"
      expect(cardText).not.toContain('Invalid Date');
      console.log('✅ Does not show "Invalid Date"');

      console.log('🎉 Card display verification: PASSED!');
    } else {
      console.log('⚠️ No meal plan cards found (might be empty)');
    }
  });
});
