import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:4000';
const CUSTOMER_EMAIL = 'customer.test@evofitmeals.com';
const CUSTOMER_PASSWORD = 'TestCustomer123!';

// Helper function to login as customer
async function loginAsCustomer(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', CUSTOMER_EMAIL);
  await page.fill('input[type="password"]', CUSTOMER_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/my-meal-plans', { timeout: 15000 });
}

test.describe('Recipe Details - Ratings/Reviews Tabs Removal', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCustomer(page);
  });

  test('Recipe details modal should not have Ratings or Reviews tabs', async ({ page }) => {
    // Navigate to saved meal plans
    await page.click('text=Saved Plans');
    await page.waitForTimeout(2000); // Wait for plans to load
    
    // Click on the first saved meal plan if it exists
    const mealPlanCard = page.locator('.cursor-pointer').first();
    const mealPlanExists = await mealPlanCard.isVisible();
    
    if (!mealPlanExists) {
      console.log('No saved meal plans found. Creating a test scenario...');
      // Navigate to meal plans page to ensure we have content
      await page.goto(`${BASE_URL}/my-meal-plans`);
      await page.waitForTimeout(2000);
    }
    
    // Try to find and click a recipe card (in either saved plans or meal plans)
    const recipeCard = page.locator('[data-testid="recipe-card"], .recipe-card, [class*="recipe"]').first();
    
    // Wait for recipe cards to be visible
    await expect(recipeCard).toBeVisible({ timeout: 10000 });
    
    // Click on the recipe to open the modal
    await recipeCard.click();
    
    // Wait for the modal to open
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
    
    // Verify the modal title is "Recipe Details"
    await expect(page.locator('[role="dialog"] h2').first()).toContainText('Recipe Details');
    
    // Verify NO tabs exist (no TabsList component)
    const tabsList = page.locator('[role="tablist"]');
    await expect(tabsList).not.toBeVisible();
    
    // Verify specific tab text doesn't exist
    await expect(page.locator('text="Ratings"')).not.toBeVisible();
    await expect(page.locator('text="Reviews"')).not.toBeVisible();
    
    // Verify no "Details" tab either (since we removed the entire tabs structure)
    await expect(page.locator('[role="tab"]:has-text("Details")')).not.toBeVisible();
    
    // Verify the recipe content IS still visible (name, description, nutrition, etc.)
    const recipeContent = page.locator('[role="dialog"] .space-y-4, [role="dialog"] .space-y-6').first();
    await expect(recipeContent).toBeVisible();
    
    // Take screenshot for verification
    await page.screenshot({ 
      path: 'test-results/recipe-details-no-tabs.png',
      fullPage: false 
    });
    
    console.log('✅ Recipe details modal confirmed: NO Ratings or Reviews tabs');
  });

  test('Recipe details should show content directly without tabs', async ({ page }) => {
    // Navigate to meal plans
    await page.goto(`${BASE_URL}/my-meal-plans`);
    await page.waitForTimeout(2000);
    
    // Find and click a recipe
    const recipeCard = page.locator('[data-testid="recipe-card"], .recipe-card, [class*="recipe"]').first();
    await recipeCard.waitFor({ state: 'visible', timeout: 10000 });
    await recipeCard.click();
    
    // Wait for modal
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });
    
    // Verify recipe information is displayed directly (no tab switching needed)
    // Check for common recipe elements
    const possibleElements = [
      'Prep Time',
      'Cook Time', 
      'Calories',
      'Servings',
      'Ingredients',
      'Instructions',
      'Protein',
      'Carbs',
      'Fat'
    ];
    
    let foundElements = 0;
    for (const element of possibleElements) {
      const isVisible = await page.locator(`[role="dialog"]:has-text("${element}")`).isVisible();
      if (isVisible) {
        foundElements++;
        console.log(`  ✓ Found: ${element}`);
      }
    }
    
    // Should find at least some recipe elements
    expect(foundElements).toBeGreaterThan(0);
    console.log(`✅ Recipe details showing ${foundElements} content elements directly`);
  });

  test('API rating endpoints should return 404', async ({ page }) => {
    // Get authentication token from cookies or storage
    const cookies = await page.context().cookies();
    
    // Try to access rating endpoints
    const ratingEndpoints = [
      '/api/ratings/recipes/123/rate',
      '/api/recipes/123/rating-summary',
      '/api/users/my-ratings'
    ];
    
    for (const endpoint of ratingEndpoints) {
      const response = await page.request.get(`${BASE_URL}${endpoint}`, {
        failOnStatusCode: false
      });
      
      // Should get 404 since routes are disabled
      expect(response.status()).toBe(404);
      console.log(`  ✓ ${endpoint} returns 404 (disabled)`);
    }
    
    console.log('✅ All rating API endpoints are disabled');
  });

  test('No rating-related UI elements in recipe modal', async ({ page }) => {
    // Navigate to meal plans
    await page.goto(`${BASE_URL}/my-meal-plans`);
    await page.waitForTimeout(2000);
    
    // Open a recipe modal
    const recipeCard = page.locator('[data-testid="recipe-card"], .recipe-card, [class*="recipe"]').first();
    await recipeCard.waitFor({ state: 'visible', timeout: 10000 });
    await recipeCard.click();
    
    // Wait for modal
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
    
    // Verify no rating-related elements
    const ratingElements = [
      'Rate Recipe',
      'Update Rating',
      'Rate this recipe',
      'Your Rating',
      'Average Rating',
      'star', // Star icons for ratings
      '★', // Star characters
      'Review',
      'Write a review',
      'Leave a review'
    ];
    
    for (const element of ratingElements) {
      await expect(page.locator(`[role="dialog"]:has-text("${element}")`)).not.toBeVisible();
    }
    
    // Verify no star rating components
    await expect(page.locator('[role="dialog"] .star-rating')).not.toBeVisible();
    await expect(page.locator('[role="dialog"] [class*="rating"]')).not.toBeVisible();
    
    console.log('✅ No rating-related UI elements found in recipe modal');
  });
});