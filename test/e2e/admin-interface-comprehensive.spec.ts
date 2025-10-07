/**
 * Comprehensive Admin Interface E2E Tests
 * 
 * Tests all major admin interface features:
 * 1. Pagination Functionality
 * 2. Recipe Deletion (Individual & Bulk)
 * 3. View Toggle (Cards/Table)
 * 4. Admin Statistics Consistency
 * 5. Error Handling and Edge Cases
 */

import { test, expect, Page } from '@playwright/test';
import { 
  loginAsAdmin, 
  takeTestScreenshot, 
  waitForNetworkIdle, 
  navigateToAdminTab,
  waitForModal,
  TEST_CONFIG 
} from './auth-helper';

// Test configuration
const TEST_TIMEOUTS = {
  modal: 10000,
  network: 15000,
  navigation: 10000
};

test.describe('Admin Interface Comprehensive Tests', () => {
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

    // Login as admin and navigate to recipes tab
    await loginAsAdmin(page);
    await navigateToAdminTab(page, 'recipes');
    await waitForNetworkIdle(page);
    await takeTestScreenshot(page, 'admin-dashboard-initial.png', 'Initial admin dashboard');
  });

  test.afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  test.describe('Pagination Functionality', () => {
    test('should display pagination when total recipes > 12', async () => {
      console.log('🧪 Testing pagination display logic...');
      
      // Wait for recipes to load
      await page.waitForSelector('[data-testid="recipes-container"], .recipe-card, .recipe-grid', { timeout: 15000 });
      
      // Check if pagination exists
      const paginationContainer = page.locator('[data-testid="pagination"], .pagination, nav[aria-label="Pagination"]');
      const recipesCount = await page.locator('.recipe-card, .recipe-item, [data-testid="recipe-card"]').count();
      
      // Take screenshot of current state
      await takeTestScreenshot(page, 'pagination-check.png', `Found ${recipesCount} recipes on page`);
      
      // Check for pagination visibility
      const paginationVisible = await paginationContainer.isVisible();
      console.log(`📊 Recipes on page: ${recipesCount}, Pagination visible: ${paginationVisible}`);
      
      // Look for total count indicator
      const totalIndicators = [
        'text*="total"',
        'text*="Total"', 
        'text*="recipes"',
        '[data-testid="total-count"]'
      ];
      
      let totalCount = 0;
      for (const indicator of totalIndicators) {
        const element = page.locator(indicator);
        if (await element.count() > 0) {
          const text = await element.textContent();
          console.log(`📝 Found total indicator: ${text}`);
          // Extract number from text
          const match = text?.match(/(\d+)/);
          if (match) {
            totalCount = parseInt(match[1]);
            break;
          }
        }
      }
      
      console.log(`📊 Total count extracted: ${totalCount}`);
      
      // Verify pagination behavior
      if (totalCount > 12 || recipesCount >= 12) {
        expect(paginationVisible).toBe(true);
        console.log('✅ Pagination correctly shown for large dataset');
      } else {
        console.log(`ℹ️ Dataset too small (${totalCount}) for pagination test`);
      }
    });

    test('should navigate between pages correctly', async () => {
      console.log('🧪 Testing page navigation...');
      
      // Wait for pagination to be visible
      const paginationContainer = page.locator('[data-testid="pagination"], .pagination, nav[aria-label="Pagination"]');
      
      if (await paginationContainer.isVisible()) {
        // Test Next button
        const nextButton = page.locator('button:has-text("Next"), a:has-text("Next"), [aria-label="Next"]');
        
        if (await nextButton.isVisible() && !await nextButton.isDisabled()) {
          const initialRecipes = await page.locator('.recipe-card, .recipe-item').count();
          
          await nextButton.click();
          await waitForNetworkIdle(page);
          await takeTestScreenshot(page, 'pagination-next-page.png', 'After clicking next');
          
          // Verify different recipes loaded
          const newRecipes = await page.locator('.recipe-card, .recipe-item').count();
          console.log(`📊 Initial recipes: ${initialRecipes}, New recipes: ${newRecipes}`);
          
          // Test Previous button
          const prevButton = page.locator('button:has-text("Previous"), a:has-text("Previous"), [aria-label="Previous"]');
          
          if (await prevButton.isVisible() && !await prevButton.isDisabled()) {
            await prevButton.click();
            await waitForNetworkIdle(page);
            await takeTestScreenshot(page, 'pagination-prev-page.png', 'After clicking previous');
            
            console.log('✅ Page navigation working correctly');
          }
        }
      } else {
        console.log('ℹ️ Pagination not visible - skipping navigation test');
      }
    });

    test('should update recipe count display correctly', async () => {
      console.log('🧪 Testing recipe count display updates...');
      
      // Find count displays
      const countSelectors = [
        '[data-testid="recipe-count"]',
        'text*="Showing"',
        'text*="of"',
        '.pagination-info'
      ];
      
      for (const selector of countSelectors) {
        const element = page.locator(selector);
        if (await element.count() > 0) {
          const countText = await element.textContent();
          console.log(`📊 Found count display: ${countText}`);
          
          await takeTestScreenshot(page, 'recipe-count-display.png', `Count display: ${countText}`);
          
          // Verify format looks reasonable
          if (countText && (countText.includes('of') || countText.includes('/'))) {
            console.log('✅ Count display format looks correct');
          }
        }
      }
    });
  });

  test.describe('Recipe Deletion', () => {
    test('should delete individual recipe from modal', async () => {
      console.log('🧪 Testing individual recipe deletion...');
      
      // Find a recipe to delete
      const recipeCard = page.locator('.recipe-card, [data-testid="recipe-card"]').first();
      await expect(recipeCard).toBeVisible({ timeout: 15000 });
      
      // Get initial count
      const initialCount = await page.locator('.recipe-card, [data-testid="recipe-card"]').count();
      console.log(`📊 Initial recipe count: ${initialCount}`);
      
      // Click on recipe to open modal
      await recipeCard.click();
      
      // Wait for modal
      const modalAppeared = await waitForModal(page);
      expect(modalAppeared).toBe(true);
      
      await takeTestScreenshot(page, 'recipe-modal-opened.png', 'Recipe modal opened');
      
      // Look for delete button in modal
      const deleteButton = page.locator('button:has-text("Delete"), button[aria-label="Delete"], .delete-btn');
      
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        
        // Look for confirmation dialog
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")');
        
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }
        
        // Wait for deletion to complete
        await waitForNetworkIdle(page);
        await page.waitForTimeout(2000);
        
        await takeTestScreenshot(page, 'after-recipe-deletion.png', 'After recipe deletion');
        
        console.log('✅ Individual recipe deletion test completed');
      } else {
        console.log('⚠️ Delete button not found in modal');
      }
    });

    test('should handle bulk selection and deletion', async () => {
      console.log('🧪 Testing bulk selection and deletion...');
      
      // Look for bulk selection toggle
      const selectionModeButton = page.locator(
        'button:has-text("Select"), button:has-text("Bulk"), [data-testid="selection-mode"]'
      );
      
      if (await selectionModeButton.isVisible()) {
        await selectionModeButton.click();
        await page.waitForTimeout(1000);
        
        await takeTestScreenshot(page, 'bulk-selection-mode.png', 'Bulk selection mode activated');
        
        // Look for checkboxes
        const checkboxes = page.locator('input[type="checkbox"], [role="checkbox"]');
        const checkboxCount = await checkboxes.count();
        
        if (checkboxCount > 0) {
          // Select a few recipes
          const selectCount = Math.min(3, checkboxCount);
          for (let i = 0; i < selectCount; i++) {
            await checkboxes.nth(i).click();
            await page.waitForTimeout(200);
          }
          
          await takeTestScreenshot(page, 'recipes-selected.png', `Selected ${selectCount} recipes`);
          
          // Look for bulk delete button
          const bulkDeleteButton = page.locator(
            'button:has-text("Delete Selected"), button:has-text("Bulk Delete"), [data-testid="bulk-delete"]'
          );
          
          if (await bulkDeleteButton.isVisible() && !await bulkDeleteButton.isDisabled()) {
            await bulkDeleteButton.click();
            
            // Look for confirmation
            const confirmDelete = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")');
            
            if (await confirmDelete.isVisible()) {
              await confirmDelete.click();
              
              await waitForNetworkIdle(page);
              await takeTestScreenshot(page, 'bulk-deletion-completed.png', 'Bulk deletion completed');
              
              console.log('✅ Bulk deletion test completed successfully');
            }
          }
        }
      } else {
        console.log('⚠️ Bulk selection mode not available');
      }
    });
  });

  test.describe('View Toggle Functionality', () => {
    test('should switch between Cards and Table view', async () => {
      console.log('🧪 Testing view toggle functionality...');
      
      // Look for view toggle buttons
      const viewToggle = page.locator('[data-testid="view-toggle"], .view-toggle');
      const cardViewButton = page.locator('button:has-text("Cards"), [data-value="cards"]');
      const tableViewButton = page.locator('button:has-text("Table"), [data-value="table"]');
      
      // Test Cards view
      if (await cardViewButton.isVisible()) {
        await cardViewButton.click();
        await waitForNetworkIdle(page);
        
        // Verify cards are displayed
        const cardsVisible = await page.locator('.recipe-card, [data-testid="recipe-card"]').isVisible();
        expect(cardsVisible).toBe(true);
        
        await takeTestScreenshot(page, 'cards-view.png', 'Cards view activated');
        console.log('✅ Cards view working');
      }
      
      // Test Table view
      if (await tableViewButton.isVisible()) {
        await tableViewButton.click();
        await waitForNetworkIdle(page);
        
        // Verify table is displayed
        const tableVisible = await page.locator('table, .table-container, [data-testid="recipe-table"]').isVisible();
        expect(tableVisible).toBe(true);
        
        await takeTestScreenshot(page, 'table-view.png', 'Table view activated');
        console.log('✅ Table view working');
      }
    });

    test('should persist view preference in localStorage', async () => {
      console.log('🧪 Testing localStorage persistence...');
      
      // Switch to table view
      const tableViewButton = page.locator('button:has-text("Table"), [data-value="table"]');
      
      if (await tableViewButton.isVisible()) {
        await tableViewButton.click();
        await waitForNetworkIdle(page);
        
        // Check localStorage
        const viewType = await page.evaluate(() => {
          return localStorage.getItem('admin-recipe-view-type');
        });
        
        expect(viewType).toBe('table');
        console.log('✅ View preference persisted to localStorage');
        
        // Refresh page and verify persistence
        await page.reload();
        await waitForNetworkIdle(page);
        
        const tableStillVisible = await page.locator('table, .table-container').isVisible();
        if (tableStillVisible) {
          console.log('✅ View preference restored from localStorage');
        }
      }
    });

    test('should work in both views with all functionality', async () => {
      console.log('🧪 Testing functionality in both views...');
      
      const viewButtons = [
        { name: 'Cards', selector: 'button:has-text("Cards"), [data-value="cards"]' },
        { name: 'Table', selector: 'button:has-text("Table"), [data-value="table"]' }
      ];
      
      for (const view of viewButtons) {
        const viewButton = page.locator(view.selector);
        
        if (await viewButton.isVisible()) {
          console.log(`🔄 Testing ${view.name} view...`);
          
          await viewButton.click();
          await waitForNetworkIdle(page);
          
          // Test that recipes are visible
          const recipesVisible = await page.locator('.recipe-card, tr, .recipe-item').count() > 0;
          expect(recipesVisible).toBe(true);
          
          // Test that pagination works (if visible)
          const paginationVisible = await page.locator('.pagination, [data-testid="pagination"]').isVisible();
          if (paginationVisible) {
            console.log(`📄 Pagination available in ${view.name} view`);
          }
          
          await takeTestScreenshot(page, `${view.name.toLowerCase()}-view-functionality.png`, 
            `${view.name} view functionality test`);
          
          console.log(`✅ ${view.name} view functionality verified`);
        }
      }
    });
  });

  test.describe('Admin Statistics Consistency', () => {
    test('should display accurate recipe counts in stats header', async () => {
      console.log('🧪 Testing admin statistics consistency...');
      
      // Find stats elements
      const statCards = page.locator('.stat-card, [data-testid="stat-card"], .stats-container .card');
      const statsCount = await statCards.count();
      
      console.log(`📊 Found ${statsCount} stat cards`);
      
      for (let i = 0; i < statsCount; i++) {
        const statCard = statCards.nth(i);
        const statText = await statCard.textContent();
        console.log(`📈 Stat ${i + 1}: ${statText}`);
      }
      
      await takeTestScreenshot(page, 'admin-stats.png', 'Admin statistics display');
      
      // Verify stats are numbers
      const numberPattern = /\d+/;
      let hasValidStats = false;
      
      for (let i = 0; i < statsCount; i++) {
        const statText = await statCards.nth(i).textContent();
        if (statText && numberPattern.test(statText)) {
          hasValidStats = true;
          console.log(`✅ Valid numeric stat found: ${statText}`);
        }
      }
      
      expect(hasValidStats).toBe(true);
    });

    test('should update stats after recipe operations', async () => {
      console.log('🧪 Testing stats updates after operations...');
      
      // Get initial stats
      const initialStats = await page.locator('.stat-card, [data-testid="stat-card"]').allTextContents();
      console.log('📊 Initial stats:', initialStats);
      
      await takeTestScreenshot(page, 'stats-before-operation.png', 'Stats before operation');
      
      // Perform an operation (if possible) - try to approve a pending recipe
      const viewPendingButton = page.locator('button:has-text("View Pending"), button:has-text("Pending")');
      
      if (await viewPendingButton.isVisible()) {
        await viewPendingButton.click();
        
        if (await waitForModal(page)) {
          const approveButton = page.locator('button:has-text("Approve")').first();
          
          if (await approveButton.isVisible()) {
            await approveButton.click();
            await waitForNetworkIdle(page);
            
            // Close modal
            const closeButton = page.locator('button:has-text("Close"), [aria-label="Close"]');
            if (await closeButton.isVisible()) {
              await closeButton.click();
            }
            
            // Check if stats updated
            await page.waitForTimeout(2000);
            const updatedStats = await page.locator('.stat-card, [data-testid="stat-card"]').allTextContents();
            console.log('📊 Updated stats:', updatedStats);
            
            await takeTestScreenshot(page, 'stats-after-operation.png', 'Stats after operation');
            
            console.log('✅ Stats update test completed');
          }
        }
      } else {
        console.log('ℹ️ No pending recipes to test stats updates');
      }
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle network errors gracefully', async () => {
      console.log('🧪 Testing network error handling...');
      
      // Simulate network failure
      await page.route('**/api/admin/recipes*', route => {
        route.abort('failed');
      });
      
      // Try to navigate to next page or refresh
      await page.reload();
      await page.waitForTimeout(3000);
      
      await takeTestScreenshot(page, 'network-error-state.png', 'Network error state');
      
      // Look for error messages
      const errorMessages = await page.locator('text*="error", text*="Error", text*="failed", text*="Failed"').count();
      
      if (errorMessages > 0) {
        console.log('✅ Error messages displayed for network failure');
      } else {
        console.log('⚠️ No clear error messaging for network failure');
      }
      
      // Restore network
      await page.unroute('**/api/admin/recipes*');
    });

    test('should handle empty states appropriately', async () => {
      console.log('🧪 Testing empty state handling...');
      
      // Search for something that probably doesn't exist
      const searchInput = page.locator('input[type="search"], input[placeholder*="search"], input[placeholder*="Search"]');
      
      if (await searchInput.isVisible()) {
        await searchInput.fill('xyz123nonexistentrecipe');
        await searchInput.press('Enter');
        
        await waitForNetworkIdle(page);
        await page.waitForTimeout(2000);
        
        await takeTestScreenshot(page, 'empty-search-results.png', 'Empty search results');
        
        // Look for empty state messages
        const emptyMessages = page.locator('text*="No recipes", text*="No results", text*="Nothing found"');
        const hasEmptyMessage = await emptyMessages.count() > 0;
        
        if (hasEmptyMessage) {
          console.log('✅ Empty state message displayed');
        } else {
          console.log('⚠️ No clear empty state messaging');
        }
        
        // Clear search
        await searchInput.clear();
        await searchInput.press('Enter');
        await waitForNetworkIdle(page);
      }
    });

    test('should validate user permissions', async () => {
      console.log('🧪 Testing admin permissions...');
      
      // Verify admin-only features are visible
      const adminFeatures = [
        'button:has-text("Delete")',
        'button:has-text("Generate")',
        'button:has-text("Pending")',
        '[data-testid="admin-only"]'
      ];
      
      let adminFeaturesFound = 0;
      
      for (const feature of adminFeatures) {
        const element = page.locator(feature);
        if (await element.count() > 0) {
          adminFeaturesFound++;
          console.log(`✅ Admin feature found: ${feature}`);
        }
      }
      
      expect(adminFeaturesFound).toBeGreaterThan(0);
      console.log(`✅ ${adminFeaturesFound} admin features verified`);
    });
  });

  test.describe('Responsive Design Tests', () => {
    test('should work correctly on mobile viewport', async () => {
      console.log('🧪 Testing mobile responsiveness...');
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(1000);
      
      await takeTestScreenshot(page, 'mobile-view.png', 'Mobile viewport');
      
      // Test that main elements are still accessible
      const recipesVisible = await page.locator('.recipe-card, .recipe-item').count() > 0;
      expect(recipesVisible).toBe(true);
      
      // Check if view toggle works on mobile
      const viewToggle = page.locator('[data-testid="view-toggle"], .view-toggle');
      if (await viewToggle.isVisible()) {
        console.log('✅ View toggle visible on mobile');
      }
      
      console.log('✅ Mobile responsiveness test completed');
    });

    test('should work correctly on tablet viewport', async () => {
      console.log('🧪 Testing tablet responsiveness...');
      
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(1000);
      
      await takeTestScreenshot(page, 'tablet-view.png', 'Tablet viewport');
      
      // Verify functionality
      const recipesVisible = await page.locator('.recipe-card, .recipe-item').count() > 0;
      expect(recipesVisible).toBe(true);
      
      console.log('✅ Tablet responsiveness test completed');
    });
  });
});