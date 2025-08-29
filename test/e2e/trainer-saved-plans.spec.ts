import { test, expect, Page } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { TEST_ACCOUNTS } from './test-data-setup';

const TRAINER_EMAIL = TEST_ACCOUNTS.trainer.username;
const TRAINER_PASSWORD = TEST_ACCOUNTS.trainer.password;
const BASE_URL = 'http://localhost:4000';

test.describe('Trainer Saved Plans Feature', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    
    // Login as trainer
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', TRAINER_EMAIL);
    await page.fill('input[type="password"]', TRAINER_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForURL('**/trainer');
    await expect(page.locator('h1')).toContainText('Welcome');
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('should navigate to Saved Plans tab', async () => {
    // Click on Saved Plans tab
    await page.click('button:has-text("Saved")');
    
    // Wait for URL to change
    await page.waitForURL('**/trainer/meal-plans');
    
    // Verify we're on the saved plans page
    await expect(page.url()).toContain('/trainer/meal-plans');
  });

  test('should display saved meal plans or empty state', async () => {
    // Navigate to saved plans
    await page.goto(`${BASE_URL}/trainer/meal-plans`);
    
    // Wait for content to load
    await page.waitForLoadState('networkidle');
    
    // Check if we have the search bar
    await expect(page.locator('input[placeholder*="Search meal plans"]')).toBeVisible();
    
    // Check for either meal plans or empty state
    const hasMealPlans = await page.locator('.grid').count() > 0;
    const hasEmptyState = await page.locator('text=/You haven\'t saved any meal plans yet/i').count() > 0;
    
    expect(hasMealPlans || hasEmptyState).toBeTruthy();
  });

  test('should generate and save a new meal plan', async () => {
    // Navigate to meal plan generator
    await page.click('button:has-text("Generate")');
    await page.waitForURL('**/meal-plan-generator');
    
    // Fill out meal plan form
    await page.fill('input[name="planName"]', `Test Plan ${faker.string.alphanumeric(5)}`);
    await page.selectOption('select[name="fitnessGoal"]', 'weight_loss');
    await page.fill('input[name="dailyCalorieTarget"]', '2000');
    await page.fill('input[name="days"]', '7');
    await page.fill('input[name="mealsPerDay"]', '3');
    
    // Generate the meal plan
    await page.click('button:has-text("Generate Meal Plan")');
    
    // Wait for generation to complete (may take a while)
    await page.waitForSelector('text=/Meal Plan Generated/i', { timeout: 30000 });
    
    // Save the meal plan
    await page.click('button:has-text("Save to Library")');
    
    // Wait for save confirmation
    await page.waitForSelector('text=/saved successfully/i', { timeout: 10000 });
    
    // Navigate back to saved plans
    await page.click('button:has-text("Saved")');
    await page.waitForURL('**/trainer/meal-plans');
    
    // Verify the new plan appears
    await expect(page.locator('.grid')).toBeVisible();
    await expect(page.locator('text=/Test Plan/i')).toBeVisible();
  });

  test('should search and filter saved meal plans', async () => {
    await page.goto(`${BASE_URL}/trainer/meal-plans`);
    await page.waitForLoadState('networkidle');
    
    // Only test search if there are meal plans
    const hasMealPlans = await page.locator('.grid').count() > 0;
    
    if (hasMealPlans) {
      // Get the name of the first meal plan
      const firstPlanName = await page.locator('.grid card:first-child h3').textContent();
      
      if (firstPlanName) {
        // Search for this plan
        await page.fill('input[placeholder*="Search meal plans"]', firstPlanName.substring(0, 5));
        
        // Wait for filter to apply
        await page.waitForTimeout(500);
        
        // Verify the plan is still visible
        await expect(page.locator(`text=${firstPlanName}`)).toBeVisible();
        
        // Search for non-existent plan
        await page.fill('input[placeholder*="Search meal plans"]', 'NonExistentPlan12345');
        await page.waitForTimeout(500);
        
        // Verify no results message
        await expect(page.locator('text=/No meal plans match your search/i')).toBeVisible();
        
        // Clear search
        await page.fill('input[placeholder*="Search meal plans"]', '');
        await page.waitForTimeout(500);
        
        // Verify plans are visible again
        await expect(page.locator('.grid')).toBeVisible();
      }
    }
  });

  test('should open meal plan details modal', async () => {
    await page.goto(`${BASE_URL}/trainer/meal-plans`);
    await page.waitForLoadState('networkidle');
    
    const hasMealPlans = await page.locator('.grid').count() > 0;
    
    if (hasMealPlans) {
      // Click the menu button on the first meal plan
      await page.locator('.grid card:first-child button:has(svg)').click();
      
      // Click "View Details" from dropdown
      await page.click('text=/View Details/i');
      
      // Wait for modal to open
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      
      // Verify modal content
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.locator('[role="dialog"] h2')).toContainText(/Meal Plan/i);
      
      // Close modal
      await page.keyboard.press('Escape');
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    }
  });

  test('should handle meal plan assignment flow', async () => {
    await page.goto(`${BASE_URL}/trainer/meal-plans`);
    await page.waitForLoadState('networkidle');
    
    const hasMealPlans = await page.locator('.grid').count() > 0;
    
    if (hasMealPlans) {
      // Click the menu button on the first meal plan
      await page.locator('.grid card:first-child button:has(svg)').click();
      
      // Click "Assign to Customer"
      await page.click('text=/Assign to Customer/i');
      
      // Wait for assignment modal
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      
      // Verify modal title
      await expect(page.locator('[role="dialog"] h2')).toContainText(/Assign Meal Plan/i);
      
      // Check if there are customers
      const hasCustomers = await page.locator('[role="dialog"] input[type="checkbox"]').count() > 0;
      
      if (hasCustomers) {
        // Select first customer
        await page.locator('[role="dialog"] input[type="checkbox"]:first-child').check();
        
        // Click assign button
        await page.click('[role="dialog"] button:has-text("Assign")');
        
        // Wait for success message
        await expect(page.locator('text=/assigned successfully/i')).toBeVisible({ timeout: 10000 });
      } else {
        // Verify no customers message
        await expect(page.locator('text=/No customers found/i')).toBeVisible();
        
        // Close modal
        await page.click('[role="dialog"] button:has-text("Cancel")');
      }
    }
  });

  test('should delete a meal plan', async () => {
    await page.goto(`${BASE_URL}/trainer/meal-plans`);
    await page.waitForLoadState('networkidle');
    
    const initialCount = await page.locator('.grid card').count();
    
    if (initialCount > 0) {
      // Get the name of the plan to delete
      const planName = await page.locator('.grid card:first-child h3').textContent();
      
      // Click the menu button
      await page.locator('.grid card:first-child button:has(svg)').click();
      
      // Click delete option
      await page.click('text=/Delete/i');
      
      // Wait for confirmation dialog
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      
      // Confirm deletion
      await page.click('[role="dialog"] button:has-text("Delete")');
      
      // Wait for success message
      await expect(page.locator('text=/deleted successfully/i')).toBeVisible({ timeout: 10000 });
      
      // Verify plan is removed
      if (planName) {
        await expect(page.locator(`text=${planName}`)).not.toBeVisible();
      }
      
      // Verify count decreased
      const newCount = await page.locator('.grid card').count();
      expect(newCount).toBe(initialCount - 1);
    }
  });

  test('should display correct meal plan metadata', async () => {
    await page.goto(`${BASE_URL}/trainer/meal-plans`);
    await page.waitForLoadState('networkidle');
    
    const hasMealPlans = await page.locator('.grid card').count() > 0;
    
    if (hasMealPlans) {
      const firstCard = page.locator('.grid card').first();
      
      // Check for required metadata elements
      await expect(firstCard.locator('h3')).toBeVisible(); // Plan name
      await expect(firstCard.locator('text=/Created/i')).toBeVisible(); // Creation date
      await expect(firstCard.locator('text=/days/i')).toBeVisible(); // Duration
      await expect(firstCard.locator('text=/meals\/day/i')).toBeVisible(); // Meals per day
      await expect(firstCard.locator('text=/cal\/day/i')).toBeVisible(); // Daily calories
      
      // Check for fitness goal badge
      const goalBadge = firstCard.locator('[class*="badge"]');
      await expect(goalBadge).toBeVisible();
    }
  });

  test('should handle share meal plan functionality', async () => {
    await page.goto(`${BASE_URL}/trainer/meal-plans`);
    await page.waitForLoadState('networkidle');
    
    const hasMealPlans = await page.locator('.grid card').count() > 0;
    
    if (hasMealPlans) {
      // Click the menu button
      await page.locator('.grid card:first-child button:has(svg)').click();
      
      // Look for share button in dropdown
      const shareButton = page.locator('button:has-text("Share")');
      
      if (await shareButton.count() > 0) {
        await shareButton.click();
        
        // Wait for share modal or action
        await page.waitForTimeout(1000);
        
        // Check if share link was generated
        const hasShareLink = await page.locator('input[value*="http"]').count() > 0;
        
        if (hasShareLink) {
          // Verify copy button
          await expect(page.locator('button:has-text("Copy"))')).toBeVisible();
        }
      }
    }
  });

  test('should persist meal plans after page refresh', async () => {
    await page.goto(`${BASE_URL}/trainer/meal-plans`);
    await page.waitForLoadState('networkidle');
    
    // Get initial meal plan count
    const initialCount = await page.locator('.grid card').count();
    
    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Get count after reload
    const afterReloadCount = await page.locator('.grid card').count();
    
    // Verify counts match
    expect(afterReloadCount).toBe(initialCount);
  });
});

test.describe('Trainer Saved Plans - Error Handling', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    // Intercept API calls to simulate network error
    await page.route('**/api/trainer/meal-plans', route => {
      route.abort('failed');
    });
    
    // Try to load the page
    await page.goto(`${BASE_URL}/trainer/meal-plans`);
    
    // Should show error message
    await expect(page.locator('text=/Error loading meal plans/i')).toBeVisible({ timeout: 10000 });
    
    // Should show retry button
    await expect(page.locator('button:has-text("Retry")')).toBeVisible();
  });
});