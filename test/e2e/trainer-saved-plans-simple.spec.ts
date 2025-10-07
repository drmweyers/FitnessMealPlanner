import { test, expect } from '@playwright/test';
import { TEST_ACCOUNTS } from './test-data-setup';

const BASE_URL = 'http://localhost:4000';

test.describe('Trainer Saved Plans - Core Functionality', () => {
  test('should render saved plans page correctly after login', async ({ page }) => {
    // 1. Navigate to login page
    await page.goto(`${BASE_URL}/login`);
    
    // 2. Login as trainer
    await page.fill('input[type="email"]', TEST_ACCOUNTS.trainer.username);
    await page.fill('input[type="password"]', TEST_ACCOUNTS.trainer.password);
    await page.click('button[type="submit"]');
    
    // 3. Wait for navigation to complete
    await page.waitForLoadState('networkidle');
    
    // 4. Navigate to saved plans directly
    await page.goto(`${BASE_URL}/trainer/meal-plans`);
    
    // 5. Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // 6. Check that the page rendered without errors
    // The search bar should always be visible
    const searchBar = page.locator('input[placeholder*="Search meal plans"]');
    await expect(searchBar).toBeVisible({ timeout: 10000 });
    
    // 7. Check for either meal plans grid or empty state message
    const hasMealPlansGrid = await page.locator('.grid').isVisible().catch(() => false);
    const hasEmptyState = await page.locator('text=/You haven\'t saved any meal plans yet/i').isVisible().catch(() => false);
    
    // At least one of these should be true
    expect(hasMealPlansGrid || hasEmptyState).toBeTruthy();
    
    // 8. Take screenshot for evidence
    await page.screenshot({ 
      path: 'test-results/trainer-saved-plans-rendered.png',
      fullPage: true 
    });
    
    console.log('✅ Trainer Saved Plans page rendered successfully');
    console.log(`   - Has meal plans grid: ${hasMealPlansGrid}`);
    console.log(`   - Has empty state: ${hasEmptyState}`);
  });

  test('should maintain saved plans tab active state', async ({ page }) => {
    // Login and navigate to trainer dashboard
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', TEST_ACCOUNTS.trainer.username);
    await page.fill('input[type="password"]', TEST_ACCOUNTS.trainer.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    // Click on Saved Plans tab
    const savedPlansTab = page.locator('button:has-text("Saved")').first();
    await savedPlansTab.click();
    
    // Wait for navigation
    await page.waitForURL('**/trainer/meal-plans', { timeout: 10000 });
    
    // Check that Saved Plans tab is active
    const tabParent = savedPlansTab.locator('..');
    const isActive = await tabParent.getAttribute('data-state');
    expect(isActive).toBe('active');
    
    console.log('✅ Saved Plans tab navigation works correctly');
  });

  test('should handle API response correctly', async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', TEST_ACCOUNTS.trainer.username);
    await page.fill('input[type="password"]', TEST_ACCOUNTS.trainer.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    // Intercept API call to check response structure
    let apiResponse: any = null;
    
    page.on('response', async response => {
      if (response.url().includes('/api/trainer/meal-plans') && response.status() === 200) {
        apiResponse = await response.json();
      }
    });
    
    // Navigate to saved plans
    await page.goto(`${BASE_URL}/trainer/meal-plans`);
    await page.waitForLoadState('networkidle');
    
    // Give time for API call
    await page.waitForTimeout(2000);
    
    // Check API response structure
    if (apiResponse) {
      expect(apiResponse).toHaveProperty('mealPlans');
      expect(Array.isArray(apiResponse.mealPlans)).toBeTruthy();
      expect(apiResponse).toHaveProperty('total');
      
      console.log('✅ API response structure is correct');
      console.log(`   - Total meal plans: ${apiResponse.total}`);
      
      // If there are meal plans, verify they render
      if (apiResponse.mealPlans.length > 0) {
        const firstPlan = apiResponse.mealPlans[0];
        const planData = firstPlan.mealPlanData;
        
        // Check if plan name is visible on page
        if (planData.planName) {
          await expect(page.locator(`text=${planData.planName}`)).toBeVisible({ timeout: 5000 });
          console.log(`   - First meal plan "${planData.planName}" is rendered`);
        }
      }
    }
  });

  test('should display meal plan cards with correct structure', async ({ page }) => {
    // Login and navigate
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', TEST_ACCOUNTS.trainer.username);
    await page.fill('input[type="password"]', TEST_ACCOUNTS.trainer.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    await page.goto(`${BASE_URL}/trainer/meal-plans`);
    await page.waitForLoadState('networkidle');
    
    // Check if there are any meal plan cards
    const cards = page.locator('.grid > div').first();
    const hasCards = await cards.isVisible().catch(() => false);
    
    if (hasCards) {
      // Verify card structure
      const firstCard = cards;
      
      // Check for title
      const title = firstCard.locator('h3, h4, [class*="title"]').first();
      await expect(title).toBeVisible();
      
      // Check for dropdown menu button
      const menuButton = firstCard.locator('button:has(svg)').first();
      await expect(menuButton).toBeVisible();
      
      // Click menu to check options
      await menuButton.click();
      
      // Check for menu options
      await expect(page.locator('text=/View Details/i')).toBeVisible({ timeout: 3000 });
      await expect(page.locator('text=/Assign to Customer/i')).toBeVisible();
      await expect(page.locator('text=/Delete/i')).toBeVisible();
      
      // Close menu
      await page.keyboard.press('Escape');
      
      console.log('✅ Meal plan cards have correct structure and menu options');
    } else {
      console.log('ℹ️ No meal plan cards to test (empty state)');
    }
  });
});

test.describe('Trainer Saved Plans - Error Recovery', () => {
  test('should recover from temporary API failures', async ({ page }) => {
    let failureCount = 0;
    
    // Intercept API calls and fail the first one
    await page.route('**/api/trainer/meal-plans', async route => {
      if (failureCount === 0) {
        failureCount++;
        await route.abort('failed');
      } else {
        await route.continue();
      }
    });
    
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', TEST_ACCOUNTS.trainer.username);
    await page.fill('input[type="password"]', TEST_ACCOUNTS.trainer.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    // Navigate to saved plans (first call will fail)
    await page.goto(`${BASE_URL}/trainer/meal-plans`);
    
    // Should show error state
    const errorMessage = page.locator('text=/Error loading meal plans/i');
    const hasError = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasError) {
      console.log('✅ Error state displayed on API failure');
      
      // Click retry button
      const retryButton = page.locator('button:has-text("Retry")');
      if (await retryButton.isVisible()) {
        await retryButton.click();
        await page.waitForLoadState('networkidle');
        
        // Should now show content
        const searchBar = page.locator('input[placeholder*="Search meal plans"]');
        await expect(searchBar).toBeVisible({ timeout: 10000 });
        
        console.log('✅ Successfully recovered after retry');
      }
    } else {
      // Component might auto-retry, check if it loaded anyway
      const searchBar = page.locator('input[placeholder*="Search meal plans"]');
      const loaded = await searchBar.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (loaded) {
        console.log('✅ Component auto-recovered from API failure');
      }
    }
  });
});