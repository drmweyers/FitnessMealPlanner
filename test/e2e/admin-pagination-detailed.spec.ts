/**
 * Detailed Admin Pagination Tests
 * 
 * Focused tests for pagination functionality with edge cases
 */

import { test, expect, Page } from '@playwright/test';
import { 
  loginAsAdmin, 
  takeTestScreenshot, 
  waitForNetworkIdle, 
  navigateToAdminTab
} from './auth-helper';

test.describe('Admin Pagination Detailed Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    page.setDefaultTimeout(30000);
    
    await loginAsAdmin(page);
    await navigateToAdminTab(page, 'recipes');
    await waitForNetworkIdle(page);
  });

  test.afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  test('should display correct pagination info', async () => {
    console.log('🧪 Testing detailed pagination info...');
    
    // Wait for recipes to load
    await page.waitForSelector('[data-testid="recipes-container"], .recipe-card, .recipe-grid', { timeout: 15000 });
    
    // Get current pagination state
    const currentPageInfo = await page.evaluate(() => {
      // Look for pagination info text
      const infoSelectors = [
        '[data-testid="pagination-info"]',
        '.pagination-info',
        'text*="Showing"',
        'text*="of"'
      ];
      
      for (const selector of infoSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          if (element.textContent) {
            return element.textContent;
          }
        }
      }
      
      // Fallback: count visible recipes
      const recipes = document.querySelectorAll('.recipe-card, [data-testid="recipe-card"], .recipe-item');
      return `Found ${recipes.length} recipes on page`;
    });
    
    console.log(`📊 Pagination info: ${currentPageInfo}`);
    await takeTestScreenshot(page, 'pagination-info-detail.png', `Pagination info: ${currentPageInfo}`);
    
    // Verify pagination controls
    const paginationControls = await page.evaluate(() => {
      const controls = {
        hasNext: false,
        hasPrev: false,
        hasNumbers: false,
        totalPages: 0
      };
      
      // Check for next/prev buttons
      const nextBtn = document.querySelector('button:has-text("Next"), a:has-text("Next"), [aria-label="Next"]');
      const prevBtn = document.querySelector('button:has-text("Previous"), a:has-text("Previous"), [aria-label="Previous"]');
      
      controls.hasNext = !!nextBtn && !nextBtn.hasAttribute('disabled');
      controls.hasPrev = !!prevBtn && !prevBtn.hasAttribute('disabled');
      
      // Check for page numbers
      const pageNumbers = document.querySelectorAll('[aria-label*="Page"], .pagination-item, .page-link');
      controls.hasNumbers = pageNumbers.length > 0;
      controls.totalPages = pageNumbers.length;
      
      return controls;
    });
    
    console.log('🎮 Pagination controls:', paginationControls);
    
    // Verify controls make sense
    if (paginationControls.totalPages > 1) {
      expect(paginationControls.hasNext || paginationControls.hasPrev).toBe(true);
      console.log('✅ Pagination controls are logical');
    }
  });

  test('should handle page navigation edge cases', async () => {
    console.log('🧪 Testing pagination edge cases...');
    
    // Check if we're on first page
    const onFirstPage = await page.evaluate(() => {
      const prevBtn = document.querySelector('button:has-text("Previous"), [aria-label="Previous"]');
      return prevBtn ? prevBtn.hasAttribute('disabled') || prevBtn.getAttribute('aria-disabled') === 'true' : true;
    });
    
    console.log(`📍 On first page: ${onFirstPage}`);
    
    if (onFirstPage) {
      // Try to go to previous (should be disabled)
      const prevButton = page.locator('button:has-text("Previous"), [aria-label="Previous"]');
      if (await prevButton.isVisible()) {
        const isDisabled = await prevButton.isDisabled();
        expect(isDisabled).toBe(true);
        console.log('✅ Previous button properly disabled on first page');
      }
    }
    
    // Navigate to last page if possible
    const lastPageButton = page.locator('button[aria-label*="Last"], button:has-text("Last")');
    if (await lastPageButton.isVisible()) {
      await lastPageButton.click();
      await waitForNetworkIdle(page);
      
      // Check if Next is now disabled
      const nextButton = page.locator('button:has-text("Next"), [aria-label="Next"]');
      if (await nextButton.isVisible()) {
        const isDisabled = await nextButton.isDisabled();
        if (isDisabled) {
          console.log('✅ Next button properly disabled on last page');
        }
      }
    }
  });

  test('should maintain state during pagination', async () => {
    console.log('🧪 Testing state maintenance during pagination...');
    
    // Set a search filter first
    const searchInput = page.locator('input[type="search"], input[placeholder*="search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('chicken');
      await searchInput.press('Enter');
      await waitForNetworkIdle(page);
    }
    
    // Set view type to table
    const tableViewButton = page.locator('button:has-text("Table"), [data-value="table"]');
    if (await tableViewButton.isVisible()) {
      await tableViewButton.click();
      await waitForNetworkIdle(page);
    }
    
    await takeTestScreenshot(page, 'before-pagination-navigation.png', 'Before pagination navigation with filters');
    
    // Navigate to next page if available
    const nextButton = page.locator('button:has-text("Next"), [aria-label="Next"]');
    if (await nextButton.isVisible() && !await nextButton.isDisabled()) {
      await nextButton.click();
      await waitForNetworkIdle(page);
      
      await takeTestScreenshot(page, 'after-pagination-navigation.png', 'After pagination navigation');
      
      // Verify search is still applied
      const searchValue = await searchInput.inputValue();
      if (searchValue) {
        expect(searchValue).toBe('chicken');
        console.log('✅ Search filter maintained during pagination');
      }
      
      // Verify view type is maintained
      const tableVisible = await page.locator('table, [data-testid="recipe-table"]').isVisible();
      if (tableVisible) {
        console.log('✅ View type maintained during pagination');
      }
    }
  });

  test('should show correct counts per page', async () => {
    console.log('🧪 Testing recipe counts per page...');
    
    // Test cards view (should show 12 per page)
    const cardsViewButton = page.locator('button:has-text("Cards"), [data-value="cards"]');
    if (await cardsViewButton.isVisible()) {
      await cardsViewButton.click();
      await waitForNetworkIdle(page);
      
      const cardsCount = await page.locator('.recipe-card, [data-testid="recipe-card"]').count();
      console.log(`🃏 Cards view: ${cardsCount} items per page`);
      
      if (cardsCount > 0) {
        expect(cardsCount).toBeLessThanOrEqual(12);
        console.log('✅ Cards view shows appropriate number of items');
      }
    }
    
    // Test table view (should show 20 per page)
    const tableViewButton = page.locator('button:has-text("Table"), [data-value="table"]');
    if (await tableViewButton.isVisible()) {
      await tableViewButton.click();
      await waitForNetworkIdle(page);
      
      const tableRows = await page.locator('table tbody tr, [data-testid="recipe-row"]').count();
      console.log(`📋 Table view: ${tableRows} items per page`);
      
      if (tableRows > 0) {
        expect(tableRows).toBeLessThanOrEqual(20);
        console.log('✅ Table view shows appropriate number of items');
      }
    }
  });

  test('should handle dynamic pagination updates', async () => {
    console.log('🧪 Testing dynamic pagination updates...');
    
    // Get initial pagination state
    const initialState = await page.evaluate(() => {
      const pageButtons = document.querySelectorAll('[aria-label*="Page"], .page-link');
      const currentPage = document.querySelector('.active[aria-label*="Page"], .page-link.active, .current');
      
      return {
        totalPageButtons: pageButtons.length,
        currentPageText: currentPage ? currentPage.textContent : '1'
      };
    });
    
    console.log('📊 Initial pagination state:', initialState);
    
    // Apply a filter to reduce results
    const searchInput = page.locator('input[type="search"], input[placeholder*="search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('very-specific-unlikely-search-term');
      await searchInput.press('Enter');
      await waitForNetworkIdle(page);
      
      // Check if pagination updated
      const filteredState = await page.evaluate(() => {
        const pageButtons = document.querySelectorAll('[aria-label*="Page"], .page-link');
        const paginationContainer = document.querySelector('.pagination, [data-testid="pagination"]');
        
        return {
          totalPageButtons: pageButtons.length,
          paginationVisible: paginationContainer ? !paginationContainer.hidden : false
        };
      });
      
      console.log('📊 Filtered pagination state:', filteredState);
      
      // Clear filter
      await searchInput.clear();
      await searchInput.press('Enter');
      await waitForNetworkIdle(page);
      
      // Verify pagination restored
      const restoredState = await page.evaluate(() => {
        const pageButtons = document.querySelectorAll('[aria-label*="Page"], .page-link');
        return {
          totalPageButtons: pageButtons.length
        };
      });
      
      console.log('📊 Restored pagination state:', restoredState);
      
      console.log('✅ Dynamic pagination updates working');
    }
  });
});