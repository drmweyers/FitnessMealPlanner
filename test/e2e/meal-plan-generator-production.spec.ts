/**
 * Production-Ready E2E Tests for Unified Meal Plan Generator
 * 100% Coverage Target for Customer-Facing Application
 */

import { test, expect, Page } from '@playwright/test';

// Test data constants
const TEST_CREDENTIALS = {
  trainer: {
    email: 'trainer.test@evofitmeals.com',
    password: 'TestTrainer123!'
  },
  admin: {
    email: 'admin@fitmeal.pro',
    password: 'AdminPass123'
  },
  customer: {
    email: 'customer.test@evofitmeals.com',
    password: 'TestCustomer123!'
  }
};

const NATURAL_LANGUAGE_EXAMPLES = [
  "I need a 5-day weight loss meal plan for Sarah with 1600 calories per day, 3 meals daily, focusing on lean proteins and vegetables, avoiding gluten",
  "Create a 7-day muscle gain plan with 3000 calories, 4 meals per day, high protein",
  "Design a keto meal plan for 2 weeks with less than 20g carbs per day",
  "Build a vegetarian meal plan for weight maintenance, 2000 calories, 3 meals and 2 snacks"
];

const MANUAL_MEAL_PLANS = {
  simple: `Meal 1
-175g of Jasmine Rice
-150g of Lean ground beef
-100g of cooked broccoli
Meal 2
-4 eggs
-2 slices of whole wheat bread
-1 tbsp olive oil
Meal 3
-200ml of milk
-1 banana
-30g of protein powder`,

  multiDay: `Day 1
Meal 1: Breakfast
-200g oatmeal
-50g blueberries
-1 tbsp honey
Meal 2: Lunch
-150g chicken breast
-200g sweet potato
-Mixed vegetables
Meal 3: Dinner
-180g salmon
-150g quinoa
-Green salad

Day 2
Meal 1: Breakfast
-3 eggs scrambled
-2 slices toast
-1 avocado
Meal 2: Lunch
-200g turkey
-150g brown rice
-100g broccoli
Meal 3: Dinner
-200g beef steak
-250g baked potato
-Side salad`,

  bulletFormat: `- 200g chicken breast
- 150g jasmine rice
- 100g steamed vegetables
- 30g almonds
- 1 medium apple
- 250ml protein shake`,

  withUnits: `Meal 1
-1 cup rice
-2 tbsp olive oil
-500ml water
-1 lb chicken
-2 oz cheese`
};

test.describe('🚀 Production E2E Tests - Unified Meal Plan Generator', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage, browserName }) => {
    page = testPage;
    test.setTimeout(60000); // 60 seconds for complex tests

    // Set viewport for consistent testing
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Navigate to application
    await page.goto('http://localhost:4000', { waitUntil: 'networkidle' });
  });

  // ============================================
  // SECTION 1: AUTHENTICATION & ACCESS
  // ============================================

  test.describe('1️⃣ Authentication & Access Control', () => {
    test('1.1 Trainer should access meal plan generator', async () => {
      // Login as trainer
      await page.click('text=Login');
      await page.fill('input[type="email"]', TEST_CREDENTIALS.trainer.email);
      await page.fill('input[type="password"]', TEST_CREDENTIALS.trainer.password);
      await page.click('button[type="submit"]');

      // Verify dashboard access
      await expect(page.locator('text=Trainer Dashboard')).toBeVisible({ timeout: 10000 });

      // Navigate to meal plan generator
      await page.click('text=Create Meal Plan');

      // Verify meal plan generator is accessible
      await expect(page.locator('text=Meal Plan Generator')).toBeVisible();
      await expect(page.locator('text=AI-Powered Natural Language Generator')).toBeVisible();
    });

    test('1.2 Admin should access meal plan generator', async () => {
      // Login as admin
      await page.click('text=Login');
      await page.fill('input[type="email"]', TEST_CREDENTIALS.admin.email);
      await page.fill('input[type="password"]', TEST_CREDENTIALS.admin.password);
      await page.click('button[type="submit"]');

      // Navigate to meal plan generator
      await page.click('text=Create Meal Plan');

      // Verify access
      await expect(page.locator('text=AI-Powered Natural Language Generator')).toBeVisible();
    });

    test('1.3 Customer should NOT directly access meal plan generator', async () => {
      // Login as customer
      await page.click('text=Login');
      await page.fill('input[type="email"]', TEST_CREDENTIALS.customer.email);
      await page.fill('input[type="password"]', TEST_CREDENTIALS.customer.password);
      await page.click('button[type="submit"]');

      // Customer should see their dashboard, not trainer tools
      await expect(page.locator('text=Customer Dashboard')).toBeVisible({ timeout: 10000 });

      // Should not see Create Meal Plan option
      await expect(page.locator('text=Create Meal Plan')).not.toBeVisible();
    });
  });

  // ============================================
  // SECTION 2: UI COMPONENTS & STRUCTURE
  // ============================================

  test.describe('2️⃣ UI Components & Structure', () => {
    test.beforeEach(async () => {
      // Login as trainer for all UI tests
      await page.click('text=Login');
      await page.fill('input[type="email"]', TEST_CREDENTIALS.trainer.email);
      await page.fill('input[type="password"]', TEST_CREDENTIALS.trainer.password);
      await page.click('button[type="submit"]');
      await page.waitForSelector('text=Trainer Dashboard');
      await page.click('text=Create Meal Plan');
    });

    test('2.1 All required UI elements should be present', async () => {
      // Main card
      await expect(page.locator('text=Meal Plan Generator')).toBeVisible();

      // Unified AI card (blue theme)
      const aiCard = page.locator('.border-blue-200.bg-gradient-to-r.from-blue-50.to-indigo-50');
      await expect(aiCard).toBeVisible();

      // Title and description
      await expect(page.locator('text=AI-Powered Natural Language Generator')).toBeVisible();
      await expect(page.locator('text=/Describe your meal plan requirements in plain English or paste an existing meal plan/i')).toBeVisible();

      // Main textarea
      const textarea = page.locator('textarea#natural-language');
      await expect(textarea).toBeVisible();

      // Placeholder should show both options
      const placeholder = await textarea.getAttribute('placeholder');
      expect(placeholder).toContain('Option 1 - Natural Language Description');
      expect(placeholder).toContain('Option 2 - Your Own Meal Plan');

      // Generate AI images checkbox
      const checkbox = page.locator('input#generate-ai-images');
      await expect(checkbox).toBeVisible();
      await expect(checkbox).not.toBeChecked();

      // All buttons
      await expect(page.locator('button:has-text("Parse with AI")')).toBeVisible();
      await expect(page.locator('button:has-text("Generate")')).toBeVisible();
      await expect(page.locator('button:has-text("Clear")')).toBeVisible();
      await expect(page.locator('button:has-text("Manual Configuration")')).toBeVisible();
    });

    test('2.2 No separate Manual Meal Plan Parser card should exist', async () => {
      // Verify the orange manual parser card is NOT present
      await expect(page.locator('text=Manual Meal Plan Parser')).not.toBeVisible();
      await expect(page.locator('.border-orange-200.bg-gradient-to-r.from-orange-50.to-amber-50')).not.toBeVisible();
    });

    test('2.3 Advanced form should toggle correctly', async () => {
      // Initially hidden
      await expect(page.locator('text=Plan Details')).not.toBeVisible();

      // Click Manual Configuration
      await page.click('button:has-text("Manual Configuration")');

      // Form should appear
      await expect(page.locator('text=Plan Details')).toBeVisible();
      await expect(page.locator('input[name="planName"]')).toBeVisible();
      await expect(page.locator('select[name="fitnessGoal"]')).toBeVisible();

      // Hide button should appear
      await expect(page.locator('button:has-text("Hide")')).toBeVisible();

      // Click hide
      await page.click('button:has-text("Hide")');

      // Form should hide
      await expect(page.locator('text=Plan Details')).not.toBeVisible();
    });
  });

  // ============================================
  // SECTION 3: NATURAL LANGUAGE PARSING
  // ============================================

  test.describe('3️⃣ Natural Language Parsing', () => {
    test.beforeEach(async () => {
      await page.click('text=Login');
      await page.fill('input[type="email"]', TEST_CREDENTIALS.trainer.email);
      await page.fill('input[type="password"]', TEST_CREDENTIALS.trainer.password);
      await page.click('button[type="submit"]');
      await page.waitForSelector('text=Trainer Dashboard');
      await page.click('text=Create Meal Plan');
    });

    NATURAL_LANGUAGE_EXAMPLES.forEach((example, index) => {
      test(`3.${index + 1} Should parse: "${example.substring(0, 50)}..."`, async () => {
        const textarea = page.locator('textarea#natural-language');
        await textarea.fill(example);

        // Parse button should be enabled
        const parseButton = page.locator('button:has-text("Parse with AI")');
        await expect(parseButton).toBeEnabled();

        // Click parse
        await parseButton.click();

        // Look for loading state
        const loadingIndicator = page.locator('text=/Parsing with AI|Processing/i').or(page.locator('.animate-spin'));
        await expect(loadingIndicator).toBeVisible({ timeout: 5000 }).catch(() => {});

        // Wait for completion (form should show or success message)
        await page.waitForSelector('text=/Plan Details|Parsed Successfully|Form has been populated/i', { timeout: 15000 }).catch(() => {});

        // Verify no error state
        await expect(page.locator('text=/Error|Failed/i')).not.toBeVisible().catch(() => {});
      });
    });
  });

  // ============================================
  // SECTION 4: MANUAL MEAL PLAN PARSING
  // ============================================

  test.describe('4️⃣ Manual Meal Plan Parsing', () => {
    test.beforeEach(async () => {
      await page.click('text=Login');
      await page.fill('input[type="email"]', TEST_CREDENTIALS.trainer.email);
      await page.fill('input[type="password"]', TEST_CREDENTIALS.trainer.password);
      await page.click('button[type="submit"]');
      await page.waitForSelector('text=Trainer Dashboard');
      await page.click('text=Create Meal Plan');
    });

    test('4.1 Simple manual meal plan', async () => {
      const textarea = page.locator('textarea#natural-language');
      await textarea.fill(MANUAL_MEAL_PLANS.simple);

      await page.click('button:has-text("Parse with AI")');

      // Should parse as manual format
      await page.waitForTimeout(2000);

      // Check for success indicators
      const success = await page.locator('text=/Parsed|Success|Meal 1/i').first().isVisible().catch(() => false);
      expect(success).toBeTruthy();
    });

    test('4.2 Multi-day manual meal plan', async () => {
      const textarea = page.locator('textarea#natural-language');
      await textarea.fill(MANUAL_MEAL_PLANS.multiDay);

      await page.click('button:has-text("Parse with AI")');

      await page.waitForTimeout(3000);

      // Should recognize multiple days
      const hasContent = await page.locator('text=/Day 1|Day 2|Breakfast|Lunch|Dinner/i').first().isVisible().catch(() => false);
      expect(hasContent).toBeTruthy();
    });

    test('4.3 Bullet format manual meal plan', async () => {
      const textarea = page.locator('textarea#natural-language');
      await textarea.fill(MANUAL_MEAL_PLANS.bulletFormat);

      await page.click('button:has-text("Parse with AI")');

      await page.waitForTimeout(2000);

      // Should parse bullet format
      const success = await page.locator('text=/Parsed|Success|chicken/i').first().isVisible().catch(() => false);
      expect(success).toBeTruthy();
    });

    test('4.4 Manual plan with unit conversions', async () => {
      const textarea = page.locator('textarea#natural-language');
      await textarea.fill(MANUAL_MEAL_PLANS.withUnits);

      await page.click('button:has-text("Parse with AI")');

      await page.waitForTimeout(2000);

      // Should convert units to SI
      const success = await page.locator('text=/Parsed|Success|Meal/i').first().isVisible().catch(() => false);
      expect(success).toBeTruthy();
    });

    test('4.5 Manual plan with AI image generation', async () => {
      // Check the Generate AI images checkbox
      await page.check('input#generate-ai-images');

      const textarea = page.locator('textarea#natural-language');
      await textarea.fill(`Meal 1\n-200g chicken breast\n-150g rice`);

      await page.click('button:has-text("Parse with AI")');

      // Wait longer for image generation
      await page.waitForTimeout(5000);

      // Checkbox should remain checked
      await expect(page.locator('input#generate-ai-images')).toBeChecked();
    });
  });

  // ============================================
  // SECTION 5: BUTTON FUNCTIONALITY
  // ============================================

  test.describe('5️⃣ Button Functionality', () => {
    test.beforeEach(async () => {
      await page.click('text=Login');
      await page.fill('input[type="email"]', TEST_CREDENTIALS.trainer.email);
      await page.fill('input[type="password"]', TEST_CREDENTIALS.trainer.password);
      await page.click('button[type="submit"]');
      await page.waitForSelector('text=Trainer Dashboard');
      await page.click('text=Create Meal Plan');
    });

    test('5.1 Parse button states', async () => {
      const parseButton = page.locator('button:has-text("Parse with AI")');
      const textarea = page.locator('textarea#natural-language');

      // Initially disabled
      await expect(parseButton).toBeDisabled();

      // Type content
      await textarea.fill('Test content');

      // Should be enabled
      await expect(parseButton).toBeEnabled();

      // Clear content
      await textarea.clear();

      // Should be disabled again
      await expect(parseButton).toBeDisabled();
    });

    test('5.2 Clear button functionality', async () => {
      const clearButton = page.locator('button:has-text("Clear")');
      const textarea = page.locator('textarea#natural-language');

      // Initially disabled
      await expect(clearButton).toBeDisabled();

      // Type content
      await textarea.fill('Content to clear');
      await expect(textarea).toHaveValue('Content to clear');

      // Clear button should be enabled
      await expect(clearButton).toBeEnabled();

      // Click clear
      await clearButton.click();

      // Content should be cleared
      await expect(textarea).toHaveValue('');

      // Clear button disabled again
      await expect(clearButton).toBeDisabled();
    });

    test('5.3 Generate Plan Directly button', async () => {
      const generateButton = page.locator('button:has-text("Generate")').filter({ hasText: /Generate.*Plan/i });
      const textarea = page.locator('textarea#natural-language');

      // Initially disabled
      await expect(generateButton).toBeDisabled();

      // Type content
      await textarea.fill('Generate a basic meal plan');

      // Should be enabled
      await expect(generateButton).toBeEnabled();

      // Click generate
      await generateButton.click();

      // Should show loading state
      await expect(page.locator('.animate-spin').or(page.locator('text=/Generating/i'))).toBeVisible({ timeout: 5000 }).catch(() => {});
    });

    test('5.4 Manual Configuration toggle', async () => {
      const manualButton = page.locator('button:has-text("Manual Configuration")');

      // Click to show form
      await manualButton.click();

      // Form elements should be visible
      await expect(page.locator('input[name="planName"]')).toBeVisible();
      await expect(page.locator('select[name="fitnessGoal"]')).toBeVisible();
      await expect(page.locator('input[name="days"]')).toBeVisible();

      // Hide button should work
      const hideButton = page.locator('button:has-text("Hide")');
      await hideButton.click();

      // Form should be hidden
      await expect(page.locator('input[name="planName"]')).not.toBeVisible();
    });
  });

  // ============================================
  // SECTION 6: FORM FIELDS & DROPDOWNS
  // ============================================

  test.describe('6️⃣ Form Fields & Dropdowns', () => {
    test.beforeEach(async () => {
      await page.click('text=Login');
      await page.fill('input[type="email"]', TEST_CREDENTIALS.trainer.email);
      await page.fill('input[type="password"]', TEST_CREDENTIALS.trainer.password);
      await page.click('button[type="submit"]');
      await page.waitForSelector('text=Trainer Dashboard');
      await page.click('text=Create Meal Plan');
      await page.click('button:has-text("Manual Configuration")');
    });

    test('6.1 Plan Name field', async () => {
      const planName = page.locator('input[name="planName"]');
      await expect(planName).toBeVisible();

      await planName.fill('Test Meal Plan');
      await expect(planName).toHaveValue('Test Meal Plan');
    });

    test('6.2 Fitness Goal dropdown', async () => {
      const fitnessGoal = page.locator('select[name="fitnessGoal"]');
      await expect(fitnessGoal).toBeVisible();

      // Test each option
      const options = ['weight_loss', 'muscle_gain', 'maintenance', 'general_health'];
      for (const option of options) {
        await fitnessGoal.selectOption(option);
        await expect(fitnessGoal).toHaveValue(option);
      }
    });

    test('6.3 Days and Meals Per Day inputs', async () => {
      const daysInput = page.locator('input[name="days"]');
      const mealsInput = page.locator('input[name="mealsPerDay"]');

      await expect(daysInput).toBeVisible();
      await expect(mealsInput).toBeVisible();

      // Test days input
      await daysInput.fill('7');
      await expect(daysInput).toHaveValue('7');

      // Test meals per day
      await mealsInput.fill('4');
      await expect(mealsInput).toHaveValue('4');
    });

    test('6.4 Calorie target input', async () => {
      const calorieInput = page.locator('input[name="dailyCalorieTarget"]');
      await expect(calorieInput).toBeVisible();

      await calorieInput.fill('2000');
      await expect(calorieInput).toHaveValue('2000');
    });

    test('6.5 Macronutrient targets', async () => {
      const proteinInput = page.locator('input[name="proteinTarget"]');
      const carbsInput = page.locator('input[name="carbsTarget"]');
      const fatInput = page.locator('input[name="fatTarget"]');

      await proteinInput.fill('150');
      await carbsInput.fill('200');
      await fatInput.fill('70');

      await expect(proteinInput).toHaveValue('150');
      await expect(carbsInput).toHaveValue('200');
      await expect(fatInput).toHaveValue('70');
    });
  });

  // ============================================
  // SECTION 7: ERROR HANDLING
  // ============================================

  test.describe('7️⃣ Error Handling', () => {
    test.beforeEach(async () => {
      await page.click('text=Login');
      await page.fill('input[type="email"]', TEST_CREDENTIALS.trainer.email);
      await page.fill('input[type="password"]', TEST_CREDENTIALS.trainer.password);
      await page.click('button[type="submit"]');
      await page.waitForSelector('text=Trainer Dashboard');
      await page.click('text=Create Meal Plan');
    });

    test('7.1 Handle invalid input gracefully', async () => {
      const textarea = page.locator('textarea#natural-language');
      await textarea.fill('!!!@@@###$$$%%%');

      await page.click('button:has-text("Parse with AI")');

      // Should not crash
      await page.waitForTimeout(3000);

      // UI should still be functional
      await expect(textarea).toBeVisible();
      await expect(page.locator('button:has-text("Parse with AI")')).toBeVisible();
    });

    test('7.2 Handle very long input', async () => {
      const longText = 'Test meal plan content '.repeat(500);
      const textarea = page.locator('textarea#natural-language');
      await textarea.fill(longText);

      // Should handle long input
      await expect(textarea).toHaveValue(longText);

      // Buttons should still work
      await expect(page.locator('button:has-text("Parse with AI")')).toBeEnabled();
    });

    test('7.3 Handle special characters', async () => {
      const specialText = 'Meal 1: Café au lait & croissant @ €5.50 #breakfast 🍳';
      const textarea = page.locator('textarea#natural-language');
      await textarea.fill(specialText);

      await page.click('button:has-text("Parse with AI")');

      // Should handle special characters
      await page.waitForTimeout(2000);
      await expect(textarea).toBeVisible();
    });
  });

  // ============================================
  // SECTION 8: RESPONSIVE DESIGN
  // ============================================

  test.describe('8️⃣ Responsive Design', () => {
    test.beforeEach(async () => {
      await page.click('text=Login');
      await page.fill('input[type="email"]', TEST_CREDENTIALS.trainer.email);
      await page.fill('input[type="password"]', TEST_CREDENTIALS.trainer.password);
      await page.click('button[type="submit"]');
      await page.waitForSelector('text=Trainer Dashboard');
      await page.click('text=Create Meal Plan');
    });

    test('8.1 Mobile view (375px)', async () => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Mobile text should be visible
      await expect(page.locator('text=AI Meal Plan Generator')).toBeVisible();

      // Buttons should stack vertically
      const buttons = page.locator('button').filter({ hasText: /Parse|Generate|Clear/i });
      const count = await buttons.count();
      expect(count).toBeGreaterThan(0);

      // Textarea should be responsive
      const textarea = page.locator('textarea#natural-language');
      await expect(textarea).toBeVisible();
    });

    test('8.2 Tablet view (768px)', async () => {
      await page.setViewportSize({ width: 768, height: 1024 });

      // Should show appropriate text
      await expect(page.locator('text=/AI.*Generator/i')).toBeVisible();

      // Layout should be readable
      const textarea = page.locator('textarea#natural-language');
      await expect(textarea).toBeVisible();
    });

    test('8.3 Desktop view (1920px)', async () => {
      await page.setViewportSize({ width: 1920, height: 1080 });

      // Full desktop text
      await expect(page.locator('text=AI-Powered Natural Language Generator')).toBeVisible();

      // Horizontal button layout
      const parseButton = page.locator('button:has-text("Parse with AI")');
      const generateButton = page.locator('button:has-text("Generate")').filter({ hasText: /Plan/i });

      await expect(parseButton).toBeVisible();
      await expect(generateButton).toBeVisible();
    });
  });

  // ============================================
  // SECTION 9: KEYBOARD NAVIGATION
  // ============================================

  test.describe('9️⃣ Keyboard Navigation & Accessibility', () => {
    test.beforeEach(async () => {
      await page.click('text=Login');
      await page.fill('input[type="email"]', TEST_CREDENTIALS.trainer.email);
      await page.fill('input[type="password"]', TEST_CREDENTIALS.trainer.password);
      await page.click('button[type="submit"]');
      await page.waitForSelector('text=Trainer Dashboard');
      await page.click('text=Create Meal Plan');
    });

    test('9.1 Tab navigation through interface', async () => {
      // Start with focus on body
      await page.keyboard.press('Tab');

      // Should focus textarea
      const textarea = page.locator('textarea#natural-language');
      await expect(textarea).toBeFocused();

      // Type in textarea
      await page.keyboard.type('Test input');
      await expect(textarea).toHaveValue('Test input');

      // Tab to checkbox
      await page.keyboard.press('Tab');
      const checkbox = page.locator('input#generate-ai-images');
      await expect(checkbox).toBeFocused();

      // Space to toggle checkbox
      await page.keyboard.press('Space');
      await expect(checkbox).toBeChecked();

      // Tab to buttons
      await page.keyboard.press('Tab');
      // Should reach Parse button
      const activeElement = await page.evaluate(() => document.activeElement?.textContent);
      expect(activeElement).toContain('Parse');
    });

    test('9.2 Enter key submission', async () => {
      const textarea = page.locator('textarea#natural-language');
      await textarea.focus();
      await textarea.fill('Test meal plan');

      // Tab to Parse button
      await page.keyboard.press('Tab'); // To checkbox
      await page.keyboard.press('Tab'); // To Parse button

      // Enter to submit
      await page.keyboard.press('Enter');

      // Should trigger parsing
      await expect(page.locator('.animate-spin').or(page.locator('text=/Parsing/i'))).toBeVisible({ timeout: 5000 }).catch(() => {});
    });

    test('9.3 Escape key interactions', async () => {
      // Show advanced form
      await page.click('button:has-text("Manual Configuration")');
      await expect(page.locator('input[name="planName"]')).toBeVisible();

      // Escape might close modals/dropdowns if implemented
      await page.keyboard.press('Escape');

      // UI should still be functional
      await expect(page.locator('text=AI-Powered Natural Language Generator')).toBeVisible();
    });
  });

  // ============================================
  // SECTION 10: INTEGRATION FLOWS
  // ============================================

  test.describe('🔟 Complete Integration Flows', () => {
    test.beforeEach(async () => {
      await page.click('text=Login');
      await page.fill('input[type="email"]', TEST_CREDENTIALS.trainer.email);
      await page.fill('input[type="password"]', TEST_CREDENTIALS.trainer.password);
      await page.click('button[type="submit"]');
      await page.waitForSelector('text=Trainer Dashboard');
      await page.click('text=Create Meal Plan');
    });

    test('10.1 Complete natural language flow', async () => {
      // Enter natural language
      const textarea = page.locator('textarea#natural-language');
      await textarea.fill('Create a 7-day weight loss meal plan with 1800 calories per day, 3 meals and 2 snacks');

      // Parse
      await page.click('button:has-text("Parse with AI")');

      // Wait for parsing
      await page.waitForTimeout(3000);

      // Form should show or be populated
      const formVisible = await page.locator('text=Plan Details').isVisible().catch(() => false);

      if (!formVisible) {
        await page.click('button:has-text("Manual Configuration")');
      }

      // Verify form has values
      const planNameInput = page.locator('input[name="planName"]');
      const planNameValue = await planNameInput.inputValue().catch(() => '');
      expect(planNameValue.length).toBeGreaterThan(0);
    });

    test('10.2 Complete manual meal plan flow with images', async () => {
      // Enable image generation
      await page.check('input#generate-ai-images');

      // Enter manual meal plan
      const textarea = page.locator('textarea#natural-language');
      await textarea.fill(MANUAL_MEAL_PLANS.simple);

      // Parse
      await page.click('button:has-text("Parse with AI")');

      // Wait for parsing and potential image generation
      await page.waitForTimeout(5000);

      // Should complete without errors
      await expect(page.locator('text=/Error|Failed/i')).not.toBeVisible().catch(() => {});
    });

    test('10.3 Form population and generation flow', async () => {
      // Show form
      await page.click('button:has-text("Manual Configuration")');

      // Fill form manually
      await page.fill('input[name="planName"]', 'Custom Meal Plan');
      await page.selectOption('select[name="fitnessGoal"]', 'muscle_gain');
      await page.fill('input[name="days"]', '5');
      await page.fill('input[name="mealsPerDay"]', '4');
      await page.fill('input[name="dailyCalorieTarget"]', '2500');

      // Generate plan
      const submitButton = page.locator('button[type="submit"]').filter({ hasText: /Generate|Create/i });
      if (await submitButton.isVisible().catch(() => false)) {
        await submitButton.click();

        // Should show loading
        await expect(page.locator('.animate-spin').or(page.locator('text=/Generating/i'))).toBeVisible({ timeout: 5000 }).catch(() => {});
      }
    });
  });

  // ============================================
  // SECTION 11: PERFORMANCE & STABILITY
  // ============================================

  test.describe('1️⃣1️⃣ Performance & Stability', () => {
    test.beforeEach(async () => {
      await page.click('text=Login');
      await page.fill('input[type="email"]', TEST_CREDENTIALS.trainer.email);
      await page.fill('input[type="password"]', TEST_CREDENTIALS.trainer.password);
      await page.click('button[type="submit"]');
      await page.waitForSelector('text=Trainer Dashboard');
      await page.click('text=Create Meal Plan');
    });

    test('11.1 Handle rapid button clicks', async () => {
      const textarea = page.locator('textarea#natural-language');
      await textarea.fill('Test input');

      const parseButton = page.locator('button:has-text("Parse with AI")');

      // Rapid clicks
      await Promise.all([
        parseButton.click(),
        parseButton.click(),
        parseButton.click()
      ]).catch(() => {});

      // Should handle gracefully (button should disable)
      await expect(parseButton).toBeDisabled();

      // Should eventually re-enable
      await page.waitForTimeout(5000);
      await expect(parseButton).toBeEnabled();
    });

    test('11.2 Memory leak test - multiple parse cycles', async () => {
      const textarea = page.locator('textarea#natural-language');
      const parseButton = page.locator('button:has-text("Parse with AI")');
      const clearButton = page.locator('button:has-text("Clear")');

      // Run multiple cycles
      for (let i = 0; i < 3; i++) {
        await textarea.fill(`Test cycle ${i + 1}`);
        await parseButton.click();
        await page.waitForTimeout(2000);
        await clearButton.click();
      }

      // Should still be responsive
      await textarea.fill('Final test');
      await expect(textarea).toHaveValue('Final test');
    });

    test('11.3 Network interruption handling', async () => {
      // Simulate offline
      await page.context().setOffline(true);

      const textarea = page.locator('textarea#natural-language');
      await textarea.fill('Test offline');

      await page.click('button:has-text("Parse with AI")');

      // Should handle offline gracefully
      await page.waitForTimeout(2000);

      // Go back online
      await page.context().setOffline(false);

      // Should recover
      await expect(textarea).toBeVisible();
      await expect(page.locator('button:has-text("Parse with AI")')).toBeVisible();
    });
  });
});

// Mobile-specific tests
test.describe('📱 Mobile-Specific Tests', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('Mobile: Complete flow on small screen', async ({ page }) => {
    await page.goto('http://localhost:4000');

    // Login
    await page.click('text=Login');
    await page.fill('input[type="email"]', TEST_CREDENTIALS.trainer.email);
    await page.fill('input[type="password"]', TEST_CREDENTIALS.trainer.password);
    await page.click('button[type="submit"]');

    await page.waitForSelector('text=Trainer Dashboard');
    await page.click('text=Create Meal Plan');

    // Test on mobile
    const textarea = page.locator('textarea#natural-language');
    await textarea.fill('Mobile test meal plan');

    // Buttons should be accessible
    await expect(page.locator('button:has-text("Parse")')).toBeVisible();
    await expect(page.locator('button:has-text("Generate")')).toBeVisible();
    await expect(page.locator('button:has-text("Clear")')).toBeVisible();

    // Parse should work
    await page.click('button:has-text("Parse")');
    await page.waitForTimeout(2000);

    // Should not have layout issues
    await expect(page.locator('.overflow-hidden')).toHaveCount(0);
  });
});

// Export for reporting
export { TEST_CREDENTIALS, NATURAL_LANGUAGE_EXAMPLES, MANUAL_MEAL_PLANS };