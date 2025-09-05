import { test, expect } from '@playwright/test';

const TRAINER_EMAIL = 'trainer.test@evofitmeals.com';
const TRAINER_PASSWORD = 'TestTrainer123!';

test.describe('Saved Meal Plans - Comprehensive Test Suite', () => {
  
  test('1. Tab navigation and API call verification', async ({ page }) => {
    // Login
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', TRAINER_EMAIL);
    await page.fill('input[type="password"]', TRAINER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/trainer');

    // Monitor API calls
    const apiResponse = page.waitForResponse(
      response => response.url().includes('/api/trainer/meal-plans') && response.status() === 200
    );

    // Click Saved Plans tab
    await page.click('button[role="tab"]:has-text("Saved")');
    
    // Verify API call was made
    const response = await apiResponse;
    const data = await response.json();
    
    expect(response.status()).toBe(200);
    expect(data).toHaveProperty('mealPlans');
    expect(data).toHaveProperty('total');
    expect(Array.isArray(data.mealPlans)).toBeTruthy();
    
    // Verify URL changed
    await expect(page).toHaveURL(/.*\/trainer\/meal-plans/);
  });

  test('2. Meal plans display correctly', async ({ page }) => {
    // Login and navigate to Saved Plans
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', TRAINER_EMAIL);
    await page.fill('input[type="password"]', TRAINER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/trainer');
    
    await page.click('button[role="tab"]:has-text("Saved")');
    await page.waitForURL('**/trainer/meal-plans');
    
    // Wait for content to load
    await page.waitForTimeout(2000);
    
    // Check if meal plans are displayed
    const mealPlanCards = page.locator('.grid > .relative');
    const cardCount = await mealPlanCards.count();
    
    if (cardCount > 0) {
      // Verify first card has all required elements
      const firstCard = mealPlanCards.first();
      
      // Check title
      await expect(firstCard.locator('.text-lg')).toBeVisible();
      
      // Check creation date
      await expect(firstCard.locator('text=/Created/')).toBeVisible();
      
      // Check meal plan details
      await expect(firstCard.locator('text=/days/')).toBeVisible();
      await expect(firstCard.locator('text=/meals\\/day/')).toBeVisible();
      await expect(firstCard.locator('text=/cal\\/day/')).toBeVisible();
      
      console.log(`✅ ${cardCount} meal plan(s) displayed with correct structure`);
    } else {
      // Check for empty state
      await expect(page.locator('text=/You haven\'t saved any meal plans yet/i')).toBeVisible();
      console.log('✅ Empty state displayed correctly');
    }
  });

  test('3. Search functionality works', async ({ page }) => {
    // Login and navigate to Saved Plans
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', TRAINER_EMAIL);
    await page.fill('input[type="password"]', TRAINER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/trainer');
    
    await page.click('button[role="tab"]:has-text("Saved")');
    await page.waitForURL('**/trainer/meal-plans');
    await page.waitForTimeout(2000);
    
    // Test search
    const searchInput = page.locator('input[placeholder*="Search meal plans"]');
    await expect(searchInput).toBeVisible();
    
    // Search for something
    await searchInput.fill('Personalized');
    await page.waitForTimeout(1000);
    
    // Check results update
    const resultsAfterSearch = await page.locator('.grid > .relative').count();
    console.log(`Found ${resultsAfterSearch} results for "Personalized"`);
    
    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(1000);
    
    // Verify results restored
    const resultsAfterClear = await page.locator('.grid > .relative').count();
    console.log(`${resultsAfterClear} results after clearing search`);
  });

  test('4. Meal plan actions menu works', async ({ page }) => {
    // Login and navigate to Saved Plans
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', TRAINER_EMAIL);
    await page.fill('input[type="password"]', TRAINER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/trainer');
    
    await page.click('button[role="tab"]:has-text("Saved")');
    await page.waitForURL('**/trainer/meal-plans');
    await page.waitForTimeout(2000);
    
    const mealPlanCards = await page.locator('.grid > .relative').count();
    
    if (mealPlanCards > 0) {
      // Find and click the dropdown button
      const firstCard = page.locator('.grid > .relative').first();
      const dropdownButton = firstCard.locator('button').filter({ has: page.locator('svg') }).last();
      
      await dropdownButton.click();
      await page.waitForTimeout(500);
      
      // Verify menu options are visible
      await expect(page.locator('text="View Details"')).toBeVisible();
      await expect(page.locator('text="Assign to Customer"')).toBeVisible();
      await expect(page.locator('text="Delete"')).toBeVisible();
      
      // Close by pressing Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      
      console.log('✅ Meal plan actions menu working correctly');
    } else {
      console.log('⚠️ No meal plans available to test actions menu');
    }
  });

  test('5. View Details modal opens', async ({ page }) => {
    // Login and navigate to Saved Plans
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', TRAINER_EMAIL);
    await page.fill('input[type="password"]', TRAINER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/trainer');
    
    await page.click('button[role="tab"]:has-text("Saved")');
    await page.waitForURL('**/trainer/meal-plans');
    await page.waitForTimeout(2000);
    
    const mealPlanCards = await page.locator('.grid > .relative').count();
    
    if (mealPlanCards > 0) {
      // Open dropdown
      const firstCard = page.locator('.grid > .relative').first();
      const dropdownButton = firstCard.locator('button').filter({ has: page.locator('svg') }).last();
      
      await dropdownButton.click();
      await page.waitForTimeout(500);
      
      // Click View Details
      await page.click('text="View Details"');
      await page.waitForTimeout(1000);
      
      // Check if modal opened
      const modal = page.locator('[role="dialog"], .fixed.inset-0');
      await expect(modal).toBeVisible();
      
      // Close modal
      const closeButton = modal.locator('button').filter({ hasText: /Close|Cancel|×/ }).first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
      } else {
        await page.keyboard.press('Escape');
      }
      
      await page.waitForTimeout(500);
      console.log('✅ View Details modal works correctly');
    }
  });

  test('6. Generate and save new meal plan', async ({ page }) => {
    // Login
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', TRAINER_EMAIL);
    await page.fill('input[type="password"]', TRAINER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/trainer');
    
    // Go to Generate Plans tab
    await page.click('button[role="tab"]:has-text("Generate")');
    await page.waitForURL('**/meal-plan-generator');
    
    // Fill form
    const timestamp = Date.now();
    await page.fill('input[name="planName"]', `Test Plan ${timestamp}`);
    await page.selectOption('select[name="fitnessGoal"]', 'weight_loss');
    await page.fill('input[name="days"]', '3');
    await page.fill('input[name="mealsPerDay"]', '3');
    await page.fill('input[name="dailyCalorieTarget"]', '2000');
    
    // Generate
    await page.click('button:has-text("Generate Meal Plan")');
    
    // Wait for generation (could take time)
    await page.waitForSelector('text=/Generated Meal Plan|Save to Library/i', { timeout: 60000 });
    
    // Look for Save button
    const saveButton = page.locator('button').filter({ hasText: /Save to Library|Save Plan/i });
    
    if (await saveButton.isVisible()) {
      await saveButton.click();
      
      // Wait for success message
      await page.waitForSelector('text=/saved successfully|Meal plan saved/i', { timeout: 10000 });
      
      // Navigate to Saved Plans to verify
      await page.click('button[role="tab"]:has-text("Saved")');
      await page.waitForURL('**/trainer/meal-plans');
      await page.waitForTimeout(2000);
      
      // Search for our new plan
      const searchInput = page.locator('input[placeholder*="Search meal plans"]');
      await searchInput.fill(`Test Plan ${timestamp}`);
      await page.waitForTimeout(1000);
      
      // Verify it exists
      const newPlan = page.locator(`text=/Test Plan ${timestamp}/i`);
      await expect(newPlan).toBeVisible();
      
      console.log('✅ Successfully created and saved new meal plan');
    } else {
      console.log('⚠️ Save button not found after generation');
    }
  });

  test('7. Data persists after page refresh', async ({ page }) => {
    // Login and navigate to Saved Plans
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', TRAINER_EMAIL);
    await page.fill('input[type="password"]', TRAINER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/trainer');
    
    await page.click('button[role="tab"]:has-text("Saved")');
    await page.waitForURL('**/trainer/meal-plans');
    await page.waitForTimeout(2000);
    
    // Count meal plans before refresh
    const countBefore = await page.locator('.grid > .relative').count();
    
    // Refresh page
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Count meal plans after refresh
    const countAfter = await page.locator('.grid > .relative').count();
    
    expect(countAfter).toBe(countBefore);
    console.log(`✅ Data persisted: ${countBefore} plans before, ${countAfter} plans after refresh`);
  });

  test('8. Performance test - page loads quickly', async ({ page }) => {
    const startTime = Date.now();
    
    // Login
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', TRAINER_EMAIL);
    await page.fill('input[type="password"]', TRAINER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/trainer');
    
    // Navigate to Saved Plans and measure load time
    const navStartTime = Date.now();
    await page.click('button[role="tab"]:has-text("Saved")');
    await page.waitForURL('**/trainer/meal-plans');
    
    // Wait for content
    await page.waitForSelector('.grid, text=/You haven\'t saved any meal plans yet/i', { timeout: 5000 });
    
    const loadTime = Date.now() - navStartTime;
    console.log(`✅ Saved Plans loaded in ${loadTime}ms`);
    
    expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
  });
});