import { test, expect } from '@playwright/test';

test.describe('Meal Plan Save to Library Feature', () => {
  test('Complete meal plan generation and save workflow', async ({ page }) => {
    // Set longer timeout for this comprehensive test
    test.setTimeout(60000);

    // Step 1: Login as trainer
    await page.goto('http://localhost:4000/login');
    await page.fill('[name="email"]', 'trainer.test@evofitmeals.com');
    await page.fill('[name="password"]', 'TestTrainer123!');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Step 2: Navigate to meal plan generator
    await page.goto('http://localhost:4000/meal-plan-generator');
    await page.waitForLoadState('networkidle');

    // Step 3: Fill out meal plan form
    await page.fill('input[name="numDays"]', '3');
    await page.fill('input[name="mealsPerDay"]', '3');
    await page.fill('input[name="calorieTarget"]', '2000');

    // Select fitness goal
    const fitnessGoalSelect = page.locator('select[name="fitnessGoal"]');
    if (await fitnessGoalSelect.isVisible()) {
      await fitnessGoalSelect.selectOption('weight loss');
    }

    // Step 4: Generate meal plan
    const generateButton = page.locator('button:has-text("Generate"), button:has-text("Create")').first();
    await expect(generateButton).toBeVisible();
    await generateButton.click();

    // Wait for generation to complete
    await page.waitForTimeout(5000);

    // Step 5: Look for Save to Library button
    const saveButton = page.locator('button:has-text("Save to Library"), button:has-text("Save Plan")').first();

    // Check if button exists
    const buttonExists = await saveButton.isVisible().catch(() => false);
    expect(buttonExists).toBe(true);

    if (buttonExists) {
      // Step 6: Click Save to Library
      await saveButton.click();

      // Step 7: Check for success feedback
      await page.waitForTimeout(2000);

      // Look for success toast or message
      const successIndicators = [
        page.locator('.toast:has-text("saved"), .toast:has-text("success")'),
        page.locator('[role="alert"]:has-text("saved"), [role="alert"]:has-text("success")'),
        page.locator('.success-message'),
        page.locator('text=/saved|success/i')
      ];

      let successFound = false;
      for (const indicator of successIndicators) {
        if (await indicator.isVisible().catch(() => false)) {
          successFound = true;
          const text = await indicator.textContent();
          console.log('Success message:', text);
          break;
        }
      }

      expect(successFound).toBe(true);
    }

    // Step 8: Navigate to trainer meal plans library
    await page.goto('http://localhost:4000/trainer/meal-plans');
    await page.waitForLoadState('networkidle');

    // Step 9: Check if saved plan appears
    const mealPlanCards = page.locator('[data-testid="meal-plan-card"], .meal-plan-card, [class*="meal-plan"]');
    const planCount = await mealPlanCards.count();

    console.log('Number of saved meal plans:', planCount);
    expect(planCount).toBeGreaterThan(0);
  });

  test('Verify AI image generation for recipes', async ({ page }) => {
    // Login as admin to check recipe images
    await page.goto('http://localhost:4000/login');
    await page.fill('[name="email"]', 'admin@fitmeal.pro');
    await page.fill('[name="password"]', 'AdminPass123');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard');
    await page.goto('http://localhost:4000/admin');

    // Go to recipes tab
    await page.click('button:has-text("Recipe")');
    await page.waitForTimeout(2000);

    // Check for recipe images
    const recipeImages = page.locator('img[src*="digitalocean"], img[src*="s3"], img[src*="openai"]');
    const imageCount = await recipeImages.count();

    console.log('Number of AI-generated images:', imageCount);

    // Check if at least some images are AI-generated (not Unsplash)
    const aiImages = page.locator('img').filter({ hasNot: page.locator('[src*="unsplash"]') });
    const aiImageCount = await aiImages.count();

    console.log('Non-Unsplash images:', aiImageCount);
    expect(aiImageCount).toBeGreaterThan(0);
  });
});

test('Quick API test for Save to Library', async ({ request }) => {
  // Login first
  const loginResponse = await request.post('/api/auth/login', {
    data: {
      email: 'trainer.test@evofitmeals.com',
      password: 'TestTrainer123!'
    }
  });

  expect(loginResponse.ok()).toBeTruthy();
  const { token } = await loginResponse.json();

  // Create a minimal meal plan
  const mealPlanData = {
    name: 'Test Meal Plan ' + Date.now(),
    mealPlan: {
      days: [
        {
          date: new Date().toISOString(),
          meals: [
            {
              type: 'breakfast',
              recipe: {
                id: 'test-recipe-1',
                name: 'Test Breakfast',
                caloriesKcal: 400,
                proteinGrams: '20',
                carbsGrams: '50',
                fatGrams: '15',
                imageUrl: 'https://example.com/image.jpg'
              }
            }
          ]
        }
      ],
      totalCalories: 400,
      totalProtein: 20,
      totalCarbs: 50,
      totalFat: 15
    },
    notes: 'Test meal plan',
    tags: ['test'],
    isTemplate: true
  };

  // Save meal plan
  const saveResponse = await request.post('/api/trainer/meal-plans', {
    data: mealPlanData,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  console.log('Save response status:', saveResponse.status());
  expect(saveResponse.ok()).toBeTruthy();

  const savedPlan = await saveResponse.json();
  console.log('Saved plan ID:', savedPlan.id || savedPlan.planId);
  expect(savedPlan).toHaveProperty('id');
});