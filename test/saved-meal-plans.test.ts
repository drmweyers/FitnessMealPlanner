import { test, expect } from '@playwright/test';

const TRAINER_EMAIL = 'trainer.test@evofitmeals.com';
const TRAINER_PASSWORD = 'TestTrainer123!';

test.describe('Saved Meal Plans Tab - Comprehensive Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:4000/login');
    
    // Login as trainer
    await page.fill('input[type="email"]', TRAINER_EMAIL);
    await page.fill('input[type="password"]', TRAINER_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for successful login and redirect
    await page.waitForURL('**/trainer', { timeout: 10000 });
  });

  test('Should display Saved Plans tab and allow navigation', async ({ page }) => {
    // Check if Saved Plans tab is visible
    const savedPlansTab = page.locator('button[role="tab"]:has-text("Saved")');
    await expect(savedPlansTab).toBeVisible();
    
    // Click on the Saved Plans tab
    await savedPlansTab.click();
    
    // Wait for URL to change to saved plans
    await page.waitForURL('**/trainer/meal-plans', { timeout: 5000 });
    
    // Verify we're on the right tab
    await expect(savedPlansTab).toHaveAttribute('data-state', 'active');
  });

  test('Should make API call to fetch trainer meal plans', async ({ page }) => {
    // Set up request interception to monitor API calls
    const apiResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/trainer/meal-plans') && response.status() === 200,
      { timeout: 10000 }
    );

    // Navigate to Saved Plans tab
    await page.click('button[role="tab"]:has-text("Saved")');
    
    // Wait for the API response
    const apiResponse = await apiResponsePromise;
    const responseData = await apiResponse.json();
    
    // Verify API response structure
    expect(responseData).toHaveProperty('mealPlans');
    expect(responseData).toHaveProperty('total');
    expect(Array.isArray(responseData.mealPlans)).toBeTruthy();
    
    console.log(`API returned ${responseData.total} saved meal plans`);
  });

  test('Should display saved meal plans if they exist', async ({ page }) => {
    // Navigate to Saved Plans tab
    await page.click('button[role="tab"]:has-text("Saved")');
    await page.waitForURL('**/trainer/meal-plans', { timeout: 5000 });
    
    // Wait for content to load
    await page.waitForTimeout(2000);
    
    // Check for either meal plans or empty state
    const hasMealPlans = await page.locator('.grid > .relative').count() > 0;
    const hasEmptyState = await page.locator('text=/You haven\'t saved any meal plans yet/i').isVisible();
    
    // One of these should be true
    expect(hasMealPlans || hasEmptyState).toBeTruthy();
    
    if (hasMealPlans) {
      console.log('Found saved meal plans displayed');
      
      // Verify meal plan card structure
      const firstCard = page.locator('.grid > .relative').first();
      await expect(firstCard).toBeVisible();
      
      // Check for essential elements
      await expect(firstCard.locator('.text-lg')).toBeVisible(); // Title
      await expect(firstCard.locator('text=/Created/')).toBeVisible(); // Creation date
      await expect(firstCard.locator('text=/days/')).toBeVisible(); // Days info
      await expect(firstCard.locator('text=/meals\\/day/')).toBeVisible(); // Meals per day
      await expect(firstCard.locator('text=/cal\\/day/')).toBeVisible(); // Calories
    } else {
      console.log('No saved meal plans - showing empty state');
    }
  });

  test('Should have functional search bar', async ({ page }) => {
    // Navigate to Saved Plans tab
    await page.click('button[role="tab"]:has-text("Saved")');
    await page.waitForURL('**/trainer/meal-plans', { timeout: 5000 });
    
    // Find and test search input
    const searchInput = page.locator('input[placeholder*="Search meal plans"]');
    await expect(searchInput).toBeVisible();
    
    // Type in search
    await searchInput.fill('test search');
    
    // Verify search value is set
    await expect(searchInput).toHaveValue('test search');
  });

  test('Should handle meal plan actions dropdown', async ({ page }) => {
    // Navigate to Saved Plans tab
    await page.click('button[role="tab"]:has-text("Saved")');
    await page.waitForURL('**/trainer/meal-plans', { timeout: 5000 });
    
    // Wait for content to load
    await page.waitForTimeout(2000);
    
    // Check if there are any meal plans
    const mealPlanCards = page.locator('.grid > .relative');
    const cardCount = await mealPlanCards.count();
    
    if (cardCount > 0) {
      // Find the dropdown trigger button on the first card
      const dropdownButton = mealPlanCards.first().locator('button:has(svg)').last();
      await expect(dropdownButton).toBeVisible();
      
      // Click dropdown
      await dropdownButton.click();
      
      // Check for dropdown menu items
      await expect(page.locator('text="View Details"')).toBeVisible();
      await expect(page.locator('text="Assign to Customer"')).toBeVisible();
      await expect(page.locator('text="Delete"')).toBeVisible();
      
      // Close dropdown by clicking outside
      await page.click('body', { position: { x: 0, y: 0 } });
    } else {
      console.log('No meal plans to test dropdown functionality');
    }
  });

  test('Should create and save a new meal plan', async ({ page }) => {
    // Navigate to Generate Plans tab first
    await page.click('button[role="tab"]:has-text("Generate")');
    await page.waitForURL('**/meal-plan-generator', { timeout: 5000 });
    
    // Fill out meal plan generation form
    await page.fill('input[name="planName"]', `Test Plan ${Date.now()}`);
    await page.selectOption('select[name="fitnessGoal"]', 'weight_loss');
    await page.fill('input[name="days"]', '7');
    await page.fill('input[name="mealsPerDay"]', '3');
    await page.fill('input[name="dailyCalorieTarget"]', '2000');
    
    // Generate meal plan
    await page.click('button:has-text("Generate Meal Plan")');
    
    // Wait for generation to complete
    await page.waitForSelector('text=/Generated Meal Plan/i', { timeout: 30000 });
    
    // Save the meal plan
    const saveButton = page.locator('button:has-text("Save to Library")');
    if (await saveButton.isVisible()) {
      await saveButton.click();
      
      // Wait for save confirmation
      await page.waitForSelector('text=/saved successfully/i', { timeout: 10000 });
      
      // Now navigate to Saved Plans to verify it's there
      await page.click('button[role="tab"]:has-text("Saved")');
      await page.waitForURL('**/trainer/meal-plans', { timeout: 5000 });
      
      // Wait for content to load
      await page.waitForTimeout(2000);
      
      // Verify the new plan appears
      const newPlan = page.locator(`text=/Test Plan ${Date.now()}/`).first();
      await expect(newPlan).toBeVisible({ timeout: 10000 });
    } else {
      console.log('Save button not found - meal plan generation might have failed');
    }
  });

  test('Should handle empty state correctly', async ({ page }) => {
    // Navigate to Saved Plans tab
    await page.click('button[role="tab"]:has-text("Saved")');
    await page.waitForURL('**/trainer/meal-plans', { timeout: 5000 });
    
    // Search for something that likely won't exist
    const searchInput = page.locator('input[placeholder*="Search meal plans"]');
    await searchInput.fill('xyzabc123nonexistent');
    
    // Wait for search to process
    await page.waitForTimeout(1000);
    
    // Should show appropriate empty message
    const emptyMessage = page.locator('text=/No meal plans match your search/i');
    await expect(emptyMessage).toBeVisible();
  });

  test('Should verify TrainerMealPlans component is rendered', async ({ page }) => {
    // Navigate to Saved Plans tab
    await page.click('button[role="tab"]:has-text("Saved")');
    await page.waitForURL('**/trainer/meal-plans', { timeout: 5000 });
    
    // Check for component-specific elements
    const componentRoot = page.locator('[data-testid="trainer-meal-plans"], .space-y-6').first();
    await expect(componentRoot).toBeVisible();
    
    // Verify search bar is part of the component
    const searchSection = componentRoot.locator('.relative:has(input[placeholder*="Search"])');
    await expect(searchSection).toBeVisible();
  });

  test('API endpoint should return correct data structure', async ({ page }) => {
    // Make direct API call to test endpoint
    const response = await page.request.get('http://localhost:4000/api/trainer/meal-plans', {
      headers: {
        'Cookie': await page.context().cookies().then(cookies => 
          cookies.map(c => `${c.name}=${c.value}`).join('; ')
        )
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    // Verify response structure
    expect(data).toHaveProperty('mealPlans');
    expect(data).toHaveProperty('total');
    expect(typeof data.total).toBe('number');
    expect(Array.isArray(data.mealPlans)).toBeTruthy();
    
    // If there are meal plans, verify their structure
    if (data.mealPlans.length > 0) {
      const firstPlan = data.mealPlans[0];
      expect(firstPlan).toHaveProperty('id');
      expect(firstPlan).toHaveProperty('trainerId');
      expect(firstPlan).toHaveProperty('mealPlanData');
      expect(firstPlan).toHaveProperty('createdAt');
    }
    
    console.log(`Direct API call returned ${data.total} meal plans`);
  });
});

test.describe('Saved Meal Plans - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    // Login as trainer
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', TRAINER_EMAIL);
    await page.fill('input[type="password"]', TRAINER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/trainer', { timeout: 10000 });
  });

  test('Should handle API errors gracefully', async ({ page }) => {
    // Intercept API call and force an error
    await page.route('**/api/trainer/meal-plans', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });
    
    // Navigate to Saved Plans tab
    await page.click('button[role="tab"]:has-text("Saved")');
    
    // Should show error state
    const errorMessage = page.locator('text=/Error loading meal plans/i');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    
    // Should have retry button
    const retryButton = page.locator('button:has-text("Retry")');
    await expect(retryButton).toBeVisible();
  });
});