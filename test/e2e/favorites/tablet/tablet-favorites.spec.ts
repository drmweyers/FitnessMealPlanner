import { test, expect, Page } from '@playwright/test';
import { loginAsCustomer, takeTestScreenshot, waitForNetworkIdle } from '../../auth-helper';

/**
 * Tablet Favorites Experience Tests
 * 
 * Comprehensive testing of the favoriting system on tablet devices,
 * focusing on tablet-specific layouts, interactions, and responsive behavior.
 */

test.describe('Tablet Favorites Experience', () => {
  // Configure for tablet device testing
  test.use({ 
    viewport: { width: 768, height: 1024 }, // iPad dimensions
    hasTouch: true,
    isMobile: false // Tablet is treated differently from mobile
  });

  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await loginAsCustomer(page);
  });

  test('Tablet grid layout and interactions', async () => {
    await test.step('Navigate to tablet recipes view', async () => {
      await page.goto('/recipes');
      await waitForNetworkIdle(page);
      
      // Verify tablet-optimized grid layout
      await expect(page.locator('[data-testid="tablet-recipe-grid"]')).toBeVisible();
      
      // Check grid configuration for tablet
      const grid = page.locator('[data-testid="favorites-grid"]');
      const gridStyles = await grid.evaluate(el => getComputedStyle(el));
      
      // Should use 2-column layout on tablet
      expect(gridStyles.gridTemplateColumns).toMatch(/repeat\(2,|repeat\(3,/);
      
      await takeTestScreenshot(page, 'tablet-recipes-grid.png', 'Tablet recipes grid layout');
    });

    await test.step('Test tablet touch interactions', async () => {
      const firstRecipeCard = page.locator('[data-testid="recipe-card"]').first();
      
      // Test tablet tap (more precise than mobile)
      await firstRecipeCard.tap();
      await expect(page.locator('[data-testid="recipe-detail-modal"]')).toBeVisible();
      
      // Verify modal size is optimized for tablet
      const modal = page.locator('[data-testid="recipe-detail-modal"]');
      const modalBounds = await modal.boundingBox();
      
      expect(modalBounds?.width).toBeGreaterThan(400); // Larger than mobile
      expect(modalBounds?.width).toBeLessThan(700);    // Smaller than desktop
      
      // Test favorite button in modal
      await modal.locator('[data-testid="modal-favorite-button"]').tap();
      await expect(page.locator('[data-testid="favorite-success-toast"]')).toBeVisible();
      
      // Close modal
      await page.locator('[data-testid="close-modal"]').tap();
      
      await takeTestScreenshot(page, 'tablet-modal-interaction.png', 'Tablet modal interaction');
    });

    await test.step('Test tablet drag and drop for collections', async () => {
      // Navigate to favorites to test drag and drop
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Create a collection first
      await page.click('[data-testid="create-collection-button"]');
      await page.fill('[data-testid="collection-name-input"]', 'Tablet Collection');
      await page.click('[data-testid="save-collection-button"]');
      
      // Switch to dual-pane view (tablet specific)
      await page.click('[data-testid="tablet-dual-pane-toggle"]');
      await expect(page.locator('[data-testid="dual-pane-layout"]')).toBeVisible();
      
      // Test drag and drop from favorites list to collection
      const favoriteItem = page.locator('[data-testid="favorite-recipe-item"]').first();
      const collectionArea = page.locator('[data-testid="collection-drop-zone"]');
      
      if (await favoriteItem.count() > 0 && await collectionArea.count() > 0) {
        await favoriteItem.dragTo(collectionArea);
        await expect(page.locator('[data-testid="recipe-added-to-collection-toast"]')).toBeVisible();
      }
      
      await takeTestScreenshot(page, 'tablet-drag-drop.png', 'Tablet drag and drop functionality');
    });

    await test.step('Test tablet multi-selection features', async () => {
      // Test multi-select mode for batch operations
      await page.click('[data-testid="multi-select-mode-toggle"]');
      await expect(page.locator('[data-testid="multi-select-interface"]')).toBeVisible();
      
      // Select multiple favorites
      const favoriteItems = page.locator('[data-testid="favorite-recipe-item"]');
      const itemCount = Math.min(3, await favoriteItems.count());
      
      for (let i = 0; i < itemCount; i++) {
        await favoriteItems.nth(i).locator('[data-testid="select-checkbox"]').tap();
        await expect(favoriteItems.nth(i)).toHaveClass(/selected/);
      }
      
      // Test batch operations
      await page.click('[data-testid="batch-actions-menu"]');
      await expect(page.locator('[data-testid="batch-actions-dropdown"]')).toBeVisible();
      
      // Test add to collection batch operation
      await page.click('[data-testid="batch-add-to-collection"]');
      await expect(page.locator('[data-testid="collection-selection-modal"]')).toBeVisible();
      
      await page.selectOption('[data-testid="collection-select"]', 'Tablet Collection');
      await page.click('[data-testid="confirm-batch-add"]');
      
      await expect(page.locator('[data-testid="batch-operation-success-toast"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'tablet-multi-select.png', 'Tablet multi-selection interface');
    });
  });

  test('Tablet collection management interface', async () => {
    await test.step('Navigate to tablet collections view', async () => {
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Switch to collections tab
      await page.click('[data-testid="collections-tab"]');
      await expect(page.locator('[data-testid="tablet-collections-grid"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'tablet-collections-view.png', 'Tablet collections grid view');
    });

    await test.step('Test tablet collection card layout', async () => {
      // Verify collection cards are optimized for tablet
      const collectionCards = page.locator('[data-testid="collection-card"]');
      
      if (await collectionCards.count() > 0) {
        const firstCard = collectionCards.first();
        const cardBounds = await firstCard.boundingBox();
        
        // Collection cards should be larger on tablet
        expect(cardBounds?.width).toBeGreaterThan(200);
        expect(cardBounds?.height).toBeGreaterThan(150);
        
        // Test hover effects (tablet supports hover)
        await firstCard.hover();
        await expect(firstCard.locator('[data-testid="card-hover-overlay"]')).toBeVisible();
        
        // Test quick actions on hover
        await expect(firstCard.locator('[data-testid="quick-edit-button"]')).toBeVisible();
        await expect(firstCard.locator('[data-testid="quick-share-button"]')).toBeVisible();
        
        await takeTestScreenshot(page, 'tablet-collection-card-hover.png', 'Tablet collection card hover effects');
      }
    });

    await test.step('Test tablet collection editing interface', async () => {
      if (await page.locator('[data-testid="collection-card"]').count() > 0) {
        const firstCollection = page.locator('[data-testid="collection-card"]').first();
        await firstCollection.locator('[data-testid="quick-edit-button"]').click();
        
        await expect(page.locator('[data-testid="inline-edit-interface"]')).toBeVisible();
        
        // Test inline editing (tablet specific feature)
        const nameInput = page.locator('[data-testid="inline-name-input"]');
        await nameInput.clear();
        await nameInput.fill('Updated Tablet Collection');
        
        // Test tablet keyboard shortcuts
        await page.keyboard.press('Control+Enter'); // Save shortcut
        await expect(page.locator('[data-testid="collection-updated-toast"]')).toBeVisible();
        
        await takeTestScreenshot(page, 'tablet-inline-editing.png', 'Tablet inline editing interface');
      }
    });

    await test.step('Test tablet split-view for collection details', async () => {
      if (await page.locator('[data-testid="collection-card"]').count() > 0) {
        // Enable split view mode
        await page.click('[data-testid="split-view-toggle"]');
        await expect(page.locator('[data-testid="split-view-layout"]')).toBeVisible();
        
        // Click collection to open in split view
        const firstCollection = page.locator('[data-testid="collection-card"]').first();
        await firstCollection.click();
        
        // Verify split view shows collection list on left, details on right
        await expect(page.locator('[data-testid="collections-sidebar"]')).toBeVisible();
        await expect(page.locator('[data-testid="collection-detail-pane"]')).toBeVisible();
        
        // Test navigation within split view
        const secondCollection = page.locator('[data-testid="collection-card"]').nth(1);
        if (await secondCollection.count() > 0) {
          await secondCollection.click();
          await expect(page.locator('[data-testid="collection-detail-pane"]')).toContainText('Updated'); // Should update content
        }
        
        await takeTestScreenshot(page, 'tablet-split-view.png', 'Tablet split-view collection interface');
      }
    });
  });

  test('Tablet search and filtering experience', async () => {
    await test.step('Test tablet search interface', async () => {
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Tablet should have expanded search bar by default
      await expect(page.locator('[data-testid="tablet-search-bar"]')).toBeVisible();
      
      // Test search with auto-complete
      const searchInput = page.locator('[data-testid="favorites-search-input"]');
      await searchInput.fill('ch');
      
      // Should show auto-complete suggestions
      await expect(page.locator('[data-testid="search-autocomplete"]')).toBeVisible();
      
      // Test selecting from autocomplete
      const firstSuggestion = page.locator('[data-testid="autocomplete-suggestion"]').first();
      if (await firstSuggestion.count() > 0) {
        await firstSuggestion.click();
        await waitForNetworkIdle(page);
      }
      
      await takeTestScreenshot(page, 'tablet-search-autocomplete.png', 'Tablet search with autocomplete');
    });

    await test.step('Test tablet filter sidebar', async () => {
      // Tablet should have permanent filter sidebar
      await expect(page.locator('[data-testid="tablet-filter-sidebar"]')).toBeVisible();
      
      // Test expandable filter categories
      await page.click('[data-testid="filter-category-dietary"]');
      await expect(page.locator('[data-testid="dietary-filter-options"]')).toBeVisible();
      
      // Test multiple filter selection
      await page.check('[data-testid="filter-vegetarian"]');
      await page.check('[data-testid="filter-low-carb"]');
      
      // Test filter combination display
      await expect(page.locator('[data-testid="active-filters-display"]')).toBeVisible();
      await expect(page.locator('[data-testid="active-filter-tag"]')).toHaveCount(2);
      
      // Test quick filter removal
      const firstFilterTag = page.locator('[data-testid="active-filter-tag"]').first();
      await firstFilterTag.locator('[data-testid="remove-filter"]').click();
      
      await expect(page.locator('[data-testid="active-filter-tag"]')).toHaveCount(1);
      
      await takeTestScreenshot(page, 'tablet-filter-sidebar.png', 'Tablet filter sidebar interface');
    });

    await test.step('Test tablet advanced search features', async () => {
      // Test advanced search toggle
      await page.click('[data-testid="advanced-search-toggle"]');
      await expect(page.locator('[data-testid="advanced-search-panel"]')).toBeVisible();
      
      // Test multi-field search
      await page.fill('[data-testid="search-name-field"]', 'chicken');
      await page.fill('[data-testid="search-ingredients-field"]', 'garlic, herbs');
      await page.selectOption('[data-testid="search-cook-time"]', '30'); // max 30 minutes
      
      // Test nutritional range filters
      await page.fill('[data-testid="min-protein-input"]', '20');
      await page.fill('[data-testid="max-calories-input"]', '500');
      
      await page.click('[data-testid="execute-advanced-search"]');
      await waitForNetworkIdle(page);
      
      // Verify search results match criteria
      const searchResults = page.locator('[data-testid="favorite-recipe-item"]');
      if (await searchResults.count() > 0) {
        // Check first result matches criteria
        const firstResult = searchResults.first();
        const proteinContent = await firstResult.locator('[data-testid="protein-content"]').textContent();
        const proteinValue = parseInt(proteinContent?.replace(/\D/g, '') || '0');
        expect(proteinValue).toBeGreaterThanOrEqual(20);
      }
      
      await takeTestScreenshot(page, 'tablet-advanced-search.png', 'Tablet advanced search interface');
    });
  });

  test('Tablet performance and responsiveness', async () => {
    await test.step('Test tablet layout transitions', async () => {
      // Test orientation change simulation
      await page.setViewportSize({ width: 1024, height: 768 }); // Landscape
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Verify landscape layout
      await expect(page.locator('[data-testid="landscape-layout"]')).toBeVisible();
      
      // Switch back to portrait
      await page.setViewportSize({ width: 768, height: 1024 }); // Portrait
      await page.waitForTimeout(500); // Allow layout to settle
      
      // Verify portrait layout
      await expect(page.locator('[data-testid="portrait-layout"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'tablet-orientation-change.png', 'Tablet orientation change handling');
    });

    await test.step('Test tablet scroll performance with large lists', async () => {
      // Navigate to recipes and favorite many items
      await page.goto('/recipes');
      await waitForNetworkIdle(page);
      
      const recipeCards = page.locator('[data-testid="recipe-card"]');
      const totalRecipes = Math.min(15, await recipeCards.count());
      
      // Add many favorites to test scroll performance
      for (let i = 0; i < totalRecipes; i++) {
        await recipeCards.nth(i).locator('[data-testid="favorite-button"]').tap();
        await page.waitForTimeout(50); // Small delay to prevent overwhelming
      }
      
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Test smooth scrolling with momentum
      const startTime = Date.now();
      
      for (let i = 0; i < 10; i++) {
        await page.mouse.wheel(0, 200);
        await page.waitForTimeout(50);
      }
      
      const scrollTime = Date.now() - startTime;
      expect(scrollTime).toBeLessThan(2000); // Should complete smoothly
      
      // Test scroll to top functionality
      await page.click('[data-testid="scroll-to-top-button"]');
      await page.waitForTimeout(500);
      
      const scrollPosition = await page.evaluate(() => window.pageYOffset);
      expect(scrollPosition).toBeLessThan(100); // Should be near top
      
      await takeTestScreenshot(page, 'tablet-scroll-performance.png', 'Tablet scroll performance test');
    });

    await test.step('Test tablet gesture performance', async () => {
      // Test pinch-to-zoom on recipe cards (if supported)
      const firstRecipeCard = page.locator('[data-testid="recipe-card"]').first();
      
      if (await firstRecipeCard.count() > 0) {
        const cardBounds = await firstRecipeCard.boundingBox();
        
        if (cardBounds) {
          // Simulate pinch gesture (zoom in)
          await page.touchscreen.tap(cardBounds.x + cardBounds.width / 2, cardBounds.y + cardBounds.height / 2);
          
          // Test double-tap to zoom
          await page.touchscreen.tap(cardBounds.x + cardBounds.width / 2, cardBounds.y + cardBounds.height / 2);
          await page.touchscreen.tap(cardBounds.x + cardBounds.width / 2, cardBounds.y + cardBounds.height / 2);
          
          await page.waitForTimeout(300);
        }
      }
      
      // Test swipe gestures for navigation
      const favoritesContainer = page.locator('[data-testid="favorites-container"]');
      const containerBounds = await favoritesContainer.boundingBox();
      
      if (containerBounds) {
        // Swipe left to right (previous/next page if applicable)
        await page.mouse.move(containerBounds.x + 50, containerBounds.y + containerBounds.height / 2);
        await page.mouse.down();
        await page.mouse.move(containerBounds.x + containerBounds.width - 50, containerBounds.y + containerBounds.height / 2);
        await page.mouse.up();
      }
      
      await takeTestScreenshot(page, 'tablet-gesture-performance.png', 'Tablet gesture handling');
    });
  });

  test('Tablet accessibility and usability', async () => {
    await test.step('Test tablet keyboard navigation', async () => {
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Test tab navigation through favorites
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should reach first favorite item
      const focusedElement = await page.locator(':focus').first();
      await expect(focusedElement).toHaveAttribute('data-testid');
      
      // Test Enter key to activate
      await page.keyboard.press('Enter');
      
      // Test arrow key navigation in grid
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowDown');
      
      await takeTestScreenshot(page, 'tablet-keyboard-navigation.png', 'Tablet keyboard navigation');
    });

    await test.step('Test tablet accessibility features', async () => {
      // Test high contrast mode compatibility
      await page.addStyleTag({
        content: `
          @media (prefers-contrast: high) {
            * { border: 1px solid yellow !important; }
          }
        `
      });
      
      // Test focus indicators visibility
      const favoriteButton = page.locator('[data-testid="favorite-button"]').first();
      await favoriteButton.focus();
      
      const focusStyles = await favoriteButton.evaluate(el => getComputedStyle(el));
      expect(focusStyles.outline).not.toBe('none');
      
      // Test screen reader landmarks
      await expect(page.locator('[role="main"]')).toBeVisible();
      await expect(page.locator('[role="navigation"]')).toBeVisible();
      await expect(page.locator('[role="search"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'tablet-accessibility.png', 'Tablet accessibility features');
    });

    await test.step('Test tablet text scaling', async () => {
      // Simulate browser zoom (text scaling)
      await page.evaluate(() => {
        document.body.style.fontSize = '1.2em'; // 120% text size
      });
      
      await page.waitForTimeout(500);
      
      // Verify layout doesn't break with larger text
      const favoriteItem = page.locator('[data-testid="favorite-recipe-item"]').first();
      if (await favoriteItem.count() > 0) {
        const itemBounds = await favoriteItem.boundingBox();
        expect(itemBounds?.height).toBeGreaterThan(80); // Should accommodate larger text
      }
      
      // Test button accessibility with larger text
      const buttons = page.locator('[data-testid="favorite-button"]');
      const buttonCount = Math.min(3, await buttons.count());
      
      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);
        const bounds = await button.boundingBox();
        
        if (bounds) {
          expect(bounds.width).toBeGreaterThan(44); // Minimum touch target
          expect(bounds.height).toBeGreaterThan(44);
        }
      }
      
      // Reset text size
      await page.evaluate(() => {
        document.body.style.fontSize = '';
      });
      
      await takeTestScreenshot(page, 'tablet-text-scaling.png', 'Tablet text scaling compatibility');
    });
  });
});