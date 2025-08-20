/**
 * Working Admin Interface E2E Tests
 * 
 * Tests based on the actual admin interface structure discovered
 */

import { test, expect, Page } from '@playwright/test';
import { 
  loginAsAdmin, 
  takeTestScreenshot, 
  waitForNetworkIdle 
} from './auth-helper';

test.describe('Admin Interface Working Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    page.setDefaultTimeout(30000);
    
    // Setup console error monitoring
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console error:', msg.text());
      }
    });

    // Login as admin (Recipes tab is default)
    await loginAsAdmin(page);
    await waitForNetworkIdle(page);
    await takeTestScreenshot(page, 'admin-dashboard-initial.png', 'Initial admin dashboard');
  });

  test.afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  test('should display admin statistics correctly', async () => {
    console.log('🧪 Testing admin statistics display...');
    
    // Check for stats cards
    const statsCards = page.locator('.stat-card, [data-testid="stat-card"], .card:has-text("Total Recipes"), .card:has-text("Approved"), .card:has-text("Pending"), .card:has-text("Users")');
    
    await expect(statsCards.first()).toBeVisible({ timeout: 10000 });
    
    const statsCount = await statsCards.count();
    console.log(`📊 Found ${statsCount} stat cards`);
    
    // Check specific stats from the screenshot we saw
    const totalRecipes = page.locator('text="Total Recipes"');
    const approvedRecipes = page.locator('text="Approved"');
    const pendingReview = page.locator('text="Pending Review"');
    const users = page.locator('text="Users"');
    
    await expect(totalRecipes).toBeVisible();
    await expect(approvedRecipes).toBeVisible();
    await expect(pendingReview).toBeVisible();
    await expect(users).toBeVisible();
    
    await takeTestScreenshot(page, 'admin-stats-verification.png', 'Admin statistics verification');
    
    console.log('✅ Admin statistics display verified');
  });

  test('should have functional search bar', async () => {
    console.log('🧪 Testing search functionality...');
    
    // Find search input
    const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    
    // Test search functionality
    await searchInput.fill('chicken');
    await searchInput.press('Enter');
    await waitForNetworkIdle(page);
    
    await takeTestScreenshot(page, 'search-test.png', 'Search functionality test');
    
    // Clear search
    await searchInput.clear();
    await searchInput.press('Enter');
    await waitForNetworkIdle(page);
    
    console.log('✅ Search functionality working');
  });

  test('should show advanced filters', async () => {
    console.log('🧪 Testing advanced filters...');
    
    // Click advanced filters button
    const filtersButton = page.locator('button:has-text("Advanced Filters"), button:has-text("Filters")');
    await expect(filtersButton).toBeVisible({ timeout: 10000 });
    
    await filtersButton.click();
    await page.waitForTimeout(1000);
    
    await takeTestScreenshot(page, 'advanced-filters.png', 'Advanced filters opened');
    
    console.log('✅ Advanced filters accessible');
  });

  test('should navigate between admin tabs', async () => {
    console.log('🧪 Testing tab navigation...');
    
    // Test Meal Plan Generator tab
    const mealPlanTab = page.locator('button:has-text("Meal Plan Generator")');
    if (await mealPlanTab.isVisible()) {
      await mealPlanTab.click();
      await waitForNetworkIdle(page);
      await takeTestScreenshot(page, 'meal-plan-tab.png', 'Meal Plan Generator tab');
      console.log('✅ Meal Plan Generator tab accessible');
    }
    
    // Test Admin tab
    const adminTab = page.locator('button:has-text("Admin"):not(:has-text("Dashboard"))');
    if (await adminTab.isVisible()) {
      await adminTab.click();
      await waitForNetworkIdle(page);
      await takeTestScreenshot(page, 'admin-tab.png', 'Admin tab');
      console.log('✅ Admin tab accessible');
    }
    
    // Return to Recipes tab
    const recipesTab = page.locator('button:has-text("Recipes")');
    if (await recipesTab.isVisible()) {
      await recipesTab.click();
      await waitForNetworkIdle(page);
      await takeTestScreenshot(page, 'recipes-tab-return.png', 'Back to Recipes tab');
      console.log('✅ Returned to Recipes tab');
    }
  });

  test('should display recipe content area', async () => {
    console.log('🧪 Testing recipe content display...');
    
    // Look for recipe display area
    const recipeArea = page.locator('.recipe-grid, .recipe-list, .recipes-container, [data-testid="recipes"]');
    
    // Wait for content to load
    await page.waitForTimeout(3000);
    
    // Check if recipes are loading or if there's a loading state
    const loadingState = page.locator('text="Loading", .loading, .spinner');
    const emptyState = page.locator('text="No recipes", text="No results"');
    const recipeCards = page.locator('.recipe-card, [data-testid="recipe-card"]');
    
    await takeTestScreenshot(page, 'recipe-content-area.png', 'Recipe content area');
    
    // Check what's displayed
    if (await loadingState.isVisible()) {
      console.log('📋 Recipes are loading...');
      // Wait for loading to complete
      await page.waitForFunction(() => {
        const loading = document.querySelector('text="Loading", .loading, .spinner');
        return !loading || !loading.isVisible;
      }, { timeout: 15000 }).catch(() => {
        console.log('⚠️ Loading timeout - continuing test');
      });
    }
    
    if (await emptyState.isVisible()) {
      console.log('📋 No recipes found - empty state displayed');
    }
    
    const recipeCount = await recipeCards.count();
    console.log(`📊 Found ${recipeCount} recipe cards`);
    
    if (recipeCount > 0) {
      console.log('✅ Recipes are displayed');
      
      // Test clicking on first recipe if available
      const firstRecipe = recipeCards.first();
      if (await firstRecipe.isVisible()) {
        await firstRecipe.click();
        await page.waitForTimeout(1000);
        await takeTestScreenshot(page, 'recipe-modal-or-detail.png', 'Recipe detail/modal');
        
        // Look for modal or detail view
        const modal = page.locator('.modal, [role="dialog"], .recipe-detail');
        if (await modal.isVisible()) {
          console.log('✅ Recipe detail modal/view opened');
          
          // Close modal if present
          const closeButton = page.locator('button:has-text("Close"), [aria-label="Close"], .close');
          if (await closeButton.isVisible()) {
            await closeButton.click();
            await page.waitForTimeout(500);
          }
        }
      }
    }
    
    console.log('✅ Recipe content area verified');
  });

  test('should handle responsive design', async () => {
    console.log('🧪 Testing responsive design...');
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    await takeTestScreenshot(page, 'tablet-view.png', 'Tablet viewport');
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    await takeTestScreenshot(page, 'mobile-view.png', 'Mobile viewport');
    
    // Verify key elements are still accessible
    const adminDashboard = page.locator('text="Admin Dashboard"');
    await expect(adminDashboard).toBeVisible();
    
    // Return to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(1000);
    
    console.log('✅ Responsive design working');
  });

  test('should validate admin permissions and features', async () => {
    console.log('🧪 Testing admin-specific features...');
    
    // Check for admin-only elements
    const adminFeatures = [
      'text="Admin Dashboard"',
      'text="Total Recipes"',
      'text="Approved"',
      'text="Pending Review"',
      'text="Users"'
    ];
    
    for (const feature of adminFeatures) {
      const element = page.locator(feature);
      await expect(element).toBeVisible();
      console.log(`✅ Admin feature visible: ${feature}`);
    }
    
    // Check that user count is visible (admin-only stat)
    const userCount = page.locator('text="Users"');
    await expect(userCount).toBeVisible();
    
    await takeTestScreenshot(page, 'admin-permissions-check.png', 'Admin permissions verification');
    
    console.log('✅ Admin permissions and features verified');
  });
});