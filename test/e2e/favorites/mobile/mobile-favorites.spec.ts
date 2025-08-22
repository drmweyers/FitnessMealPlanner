import { test, expect, Page } from '@playwright/test';
import { loginAsCustomer, takeTestScreenshot, waitForNetworkIdle } from '../../auth-helper';

/**
 * Mobile Favorites Experience Tests
 * 
 * Comprehensive testing of the favoriting system on mobile devices,
 * including touch gestures, responsive design, and mobile-specific interactions.
 */

test.describe('Mobile Favorites Experience', () => {
  // Configure for mobile device testing
  test.use({ 
    viewport: { width: 375, height: 667 }, // iPhone SE dimensions
    hasTouch: true,
    isMobile: true
  });

  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await loginAsCustomer(page);
  });

  test('Mobile favoriting with touch gestures', async () => {
    await test.step('Navigate to mobile recipes view', async () => {
      await page.goto('/recipes');
      await waitForNetworkIdle(page);
      
      // Verify mobile layout is active
      await expect(page.locator('[data-testid="mobile-recipe-grid"]')).toBeVisible();
      await expect(page.locator('[data-testid="desktop-recipe-grid"]')).not.toBeVisible();
      
      await takeTestScreenshot(page, 'mobile-recipes-view.png', 'Mobile recipes view layout');
    });

    await test.step('Test tap to favorite gesture', async () => {
      const firstRecipeCard = page.locator('[data-testid="recipe-card"]').first();
      const favoriteButton = firstRecipeCard.locator('[data-testid="favorite-button"]');
      
      // Test tap gesture
      await favoriteButton.tap();
      
      // Verify haptic feedback simulation (visual feedback)
      await expect(page.locator('[data-testid="favorite-animation"]')).toBeVisible();
      await expect(page.locator('[data-testid="favorite-success-toast"]')).toBeVisible();
      
      // Verify favorite button state change
      await expect(favoriteButton).toHaveAttribute('aria-pressed', 'true');
      await expect(favoriteButton).toHaveClass(/favorited/);
      
      await takeTestScreenshot(page, 'mobile-favorite-tap.png', 'Recipe favorited via touch');
    });

    await test.step('Test swipe to favorite gesture', async () => {
      const secondRecipeCard = page.locator('[data-testid="recipe-card"]').nth(1);
      
      // Test swipe right to favorite gesture
      const cardBounds = await secondRecipeCard.boundingBox();
      if (cardBounds) {
        await page.mouse.move(cardBounds.x + 10, cardBounds.y + cardBounds.height / 2);
        await page.mouse.down();
        await page.mouse.move(cardBounds.x + cardBounds.width - 10, cardBounds.y + cardBounds.height / 2);
        await page.mouse.up();
      }
      
      // Verify swipe gesture triggered favorite
      await expect(page.locator('[data-testid="swipe-favorite-animation"]')).toBeVisible();
      await expect(page.locator('[data-testid="favorite-success-toast"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'mobile-swipe-favorite.png', 'Recipe favorited via swipe gesture');
    });

    await test.step('Test long press for context menu', async () => {
      const thirdRecipeCard = page.locator('[data-testid="recipe-card"]').nth(2);
      
      // Simulate long press with touchstart/touchend events
      await thirdRecipeCard.dispatchEvent('touchstart');
      await page.waitForTimeout(800); // Long press duration
      await thirdRecipeCard.dispatchEvent('touchend');
      
      // Verify context menu appears
      await expect(page.locator('[data-testid="mobile-context-menu"]')).toBeVisible();
      
      // Test context menu options
      await expect(page.locator('[data-testid="context-favorite"]')).toBeVisible();
      await expect(page.locator('[data-testid="context-share"]')).toBeVisible();
      await expect(page.locator('[data-testid="context-add-to-collection"]')).toBeVisible();
      
      // Select favorite from context menu
      await page.locator('[data-testid="context-favorite"]').tap();
      await expect(page.locator('[data-testid="favorite-success-toast"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'mobile-long-press-context.png', 'Mobile context menu via long press');
    });

    await test.step('Test mobile navigation to favorites', async () => {
      // Open mobile menu
      await page.locator('[data-testid="mobile-menu-toggle"]').tap();
      await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
      
      // Navigate to favorites
      await page.locator('[data-testid="mobile-favorites-link"]').tap();
      await waitForNetworkIdle(page);
      
      await expect(page).toHaveURL(/.*\/favorites.*/);
      await expect(page.locator('[data-testid="mobile-favorites-list"]')).toBeVisible();
      
      // Verify favorited recipes appear
      const favoriteItems = page.locator('[data-testid="favorite-recipe-item"]');
      await expect(favoriteItems).toHaveCount(3); // From previous steps
      
      await takeTestScreenshot(page, 'mobile-favorites-page.png', 'Mobile favorites page layout');
    });

    await test.step('Test mobile collection creation', async () => {
      // Open collection creation modal
      await page.locator('[data-testid="mobile-add-collection"]').tap();
      await expect(page.locator('[data-testid="mobile-collection-modal"]')).toBeVisible();
      
      // Verify modal is optimized for mobile
      const modal = page.locator('[data-testid="mobile-collection-modal"]');
      const modalBounds = await modal.boundingBox();
      expect(modalBounds?.width).toBeLessThan(375); // Should fit mobile screen
      
      // Fill collection details on mobile
      await page.fill('[data-testid="collection-name-input"]', 'Mobile Collection');
      await page.fill('[data-testid="collection-description-input"]', 'Created on mobile device');
      
      // Test mobile keyboard behavior
      const nameInput = page.locator('[data-testid="collection-name-input"]');
      await nameInput.focus();
      await expect(nameInput).toBeFocused();
      
      await page.locator('[data-testid="save-collection-button"]').tap();
      await expect(page.locator('[data-testid="collection-created-toast"]')).toBeVisible();
      
      // Verify collection appears in mobile view
      await expect(page.locator('[data-testid="collection-item"]')).toContainText('Mobile Collection');
      
      await takeTestScreenshot(page, 'mobile-collection-created.png', 'Collection created on mobile');
    });
  });

  test('Mobile favorites search and filtering', async () => {
    // Setup: Navigate to favorites with existing data
    await test.step('Setup mobile favorites view', async () => {
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Ensure we have some favorites for testing
      if (await page.locator('[data-testid="favorite-recipe-item"]').count() === 0) {
        // Add some favorites for testing
        await page.goto('/recipes');
        await waitForNetworkIdle(page);
        
        const recipeCards = page.locator('[data-testid="recipe-card"]');
        const count = Math.min(5, await recipeCards.count());
        
        for (let i = 0; i < count; i++) {
          await recipeCards.nth(i).locator('[data-testid="favorite-button"]').tap();
          await expect(page.locator('[data-testid="favorite-success-toast"]')).toBeVisible();
        }
        
        await page.goto('/favorites');
        await waitForNetworkIdle(page);
      }
      
      await takeTestScreenshot(page, 'mobile-favorites-setup.png', 'Mobile favorites view with test data');
    });

    await test.step('Test mobile search interface', async () => {
      // Test mobile search expandable interface
      await page.locator('[data-testid="mobile-search-toggle"]').tap();
      await expect(page.locator('[data-testid="mobile-search-bar"]')).toBeVisible();
      
      // Test search input with mobile keyboard
      const searchInput = page.locator('[data-testid="favorites-search-input"]');
      await searchInput.tap();
      await searchInput.fill('chicken');
      
      // Test search suggestions on mobile
      await expect(page.locator('[data-testid="mobile-search-suggestions"]')).toBeVisible();
      
      // Test voice search button (if available)
      if (await page.locator('[data-testid="voice-search-button"]').count() > 0) {
        await page.locator('[data-testid="voice-search-button"]').tap();
        await expect(page.locator('[data-testid="voice-search-modal"]')).toBeVisible();
        await page.locator('[data-testid="cancel-voice-search"]').tap();
      }
      
      await waitForNetworkIdle(page);
      
      await takeTestScreenshot(page, 'mobile-search-interface.png', 'Mobile search interface and results');
    });

    await test.step('Test mobile filter drawer', async () => {
      // Open mobile filter drawer
      await page.locator('[data-testid="mobile-filter-button"]').tap();
      await expect(page.locator('[data-testid="mobile-filter-drawer"]')).toBeVisible();
      
      // Test drawer interaction
      const drawer = page.locator('[data-testid="mobile-filter-drawer"]');
      const drawerBounds = await drawer.boundingBox();
      
      // Verify drawer slides in from bottom
      expect(drawerBounds?.y).toBeGreaterThan(200); // Should slide up from bottom
      
      // Test filter options in mobile layout
      await page.locator('[data-testid="filter-category-meal-type"]').tap();
      await expect(page.locator('[data-testid="meal-type-options"]')).toBeVisible();
      
      // Select breakfast filter
      await page.locator('[data-testid="filter-breakfast"]').tap();
      
      // Test applying filters
      await page.locator('[data-testid="apply-mobile-filters"]').tap();
      await waitForNetworkIdle(page);
      
      // Verify filter drawer closes
      await expect(page.locator('[data-testid="mobile-filter-drawer"]')).not.toBeVisible();
      
      // Verify filter applied indicator
      await expect(page.locator('[data-testid="active-filters-indicator"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'mobile-filter-applied.png', 'Mobile filters applied via drawer');
    });

    await test.step('Test mobile sort options', async () => {
      // Open mobile sort menu
      await page.locator('[data-testid="mobile-sort-button"]').tap();
      await expect(page.locator('[data-testid="mobile-sort-menu"]')).toBeVisible();
      
      // Test different sort options
      await page.locator('[data-testid="sort-name-asc"]').tap();
      await waitForNetworkIdle(page);
      
      // Verify sort indicator
      await expect(page.locator('[data-testid="current-sort-indicator"]')).toContainText('Name A-Z');
      
      await takeTestScreenshot(page, 'mobile-sort-applied.png', 'Mobile sort options applied');
    });
  });

  test('Mobile collection management', async () => {
    await test.step('Navigate to mobile collections view', async () => {
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Switch to collections tab
      await page.locator('[data-testid="mobile-collections-tab"]').tap();
      await expect(page.locator('[data-testid="mobile-collections-grid"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'mobile-collections-view.png', 'Mobile collections view');
    });

    await test.step('Test mobile collection card interactions', async () => {
      // Test collection card tap
      if (await page.locator('[data-testid="collection-card"]').count() > 0) {
        const firstCollection = page.locator('[data-testid="collection-card"]').first();
        await firstCollection.tap();
        
        await expect(page.locator('[data-testid="mobile-collection-detail"]')).toBeVisible();
        
        // Test mobile collection actions menu
        await page.locator('[data-testid="mobile-collection-menu"]').tap();
        await expect(page.locator('[data-testid="mobile-actions-sheet"]')).toBeVisible();
        
        // Test action sheet options
        await expect(page.locator('[data-testid="action-edit"]')).toBeVisible();
        await expect(page.locator('[data-testid="action-share"]')).toBeVisible();
        await expect(page.locator('[data-testid="action-delete"]')).toBeVisible();
        
        // Close action sheet
        await page.locator('[data-testid="action-sheet-backdrop"]').tap();
        
        await takeTestScreenshot(page, 'mobile-collection-actions.png', 'Mobile collection action sheet');
      }
    });

    await test.step('Test mobile collection sharing', async () => {
      if (await page.locator('[data-testid="collection-card"]').count() > 0) {
        const firstCollection = page.locator('[data-testid="collection-card"]').first();
        await firstCollection.locator('[data-testid="share-collection-button"]').tap();
        
        await expect(page.locator('[data-testid="mobile-share-sheet"]')).toBeVisible();
        
        // Test native sharing options (if available)
        if (await page.locator('[data-testid="native-share-button"]').count() > 0) {
          await page.locator('[data-testid="native-share-button"]').tap();
          // Note: Actual native sharing would require device-specific testing
        }
        
        // Test copy link option
        await page.locator('[data-testid="copy-link-button"]').tap();
        await expect(page.locator('[data-testid="link-copied-toast"]')).toBeVisible();
        
        await takeTestScreenshot(page, 'mobile-collection-sharing.png', 'Mobile collection sharing interface');
      }
    });
  });

  test('Mobile performance and responsiveness', async () => {
    await test.step('Test mobile loading performance', async () => {
      const startTime = Date.now();
      
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds on mobile
      
      // Test smooth scrolling performance
      const favoritesList = page.locator('[data-testid="mobile-favorites-list"]');
      
      // Simulate mobile scroll
      for (let i = 0; i < 5; i++) {
        await page.mouse.wheel(0, 100);
        await page.waitForTimeout(100);
      }
      
      // Check for scroll lag indicators
      const scrollLag = await page.evaluate(() => {
        return performance.now() - window.lastScrollTime < 16; // 60fps threshold
      });
      
      await takeTestScreenshot(page, 'mobile-scroll-performance.png', 'Mobile scroll performance test');
    });

    await test.step('Test mobile memory usage', async () => {
      // Test memory usage with large favorites list
      await page.goto('/recipes');
      await waitForNetworkIdle(page);
      
      // Add many favorites to test memory performance
      const recipeCards = page.locator('[data-testid="recipe-card"]');
      const totalRecipes = Math.min(20, await recipeCards.count());
      
      for (let i = 0; i < totalRecipes; i++) {
        await recipeCards.nth(i).locator('[data-testid="favorite-button"]').tap();
        await page.waitForTimeout(100);
      }
      
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Check memory usage (if available)
      const memoryInfo = await page.evaluate(() => {
        return (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize
        } : null;
      });
      
      if (memoryInfo) {
        expect(memoryInfo.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024); // Under 100MB
      }
      
      await takeTestScreenshot(page, 'mobile-memory-usage.png', 'Mobile memory usage with large favorites list');
    });

    await test.step('Test mobile offline behavior', async () => {
      // Test offline functionality (service worker)
      await page.context().setOffline(true);
      
      await page.goto('/favorites');
      
      // Should show offline indicator
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      
      // Should show cached favorites (if any)
      if (await page.locator('[data-testid="favorite-recipe-item"]').count() > 0) {
        await expect(page.locator('[data-testid="cached-content-notice"]')).toBeVisible();
      }
      
      // Test offline queue for actions
      const firstFavorite = page.locator('[data-testid="favorite-recipe-item"]').first();
      if (await firstFavorite.count() > 0) {
        await firstFavorite.locator('[data-testid="recipe-favorite-button"]').tap();
        
        // Should queue action for when online
        await expect(page.locator('[data-testid="action-queued-toast"]')).toBeVisible();
      }
      
      // Restore online state
      await page.context().setOffline(false);
      await page.reload();
      await waitForNetworkIdle(page);
      
      await takeTestScreenshot(page, 'mobile-offline-behavior.png', 'Mobile offline behavior and recovery');
    });
  });

  test('Mobile accessibility and usability', async () => {
    await test.step('Test mobile touch targets', async () => {
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Check that touch targets meet minimum size requirements (44px)
      const favoriteButtons = page.locator('[data-testid="favorite-button"]');
      const buttonCount = await favoriteButtons.count();
      
      for (let i = 0; i < Math.min(3, buttonCount); i++) {
        const button = favoriteButtons.nth(i);
        const bounds = await button.boundingBox();
        
        if (bounds) {
          expect(bounds.width).toBeGreaterThanOrEqual(44);
          expect(bounds.height).toBeGreaterThanOrEqual(44);
        }
      }
      
      await takeTestScreenshot(page, 'mobile-touch-targets.png', 'Mobile touch target sizing verification');
    });

    await test.step('Test mobile keyboard navigation', async () => {
      // Test virtual keyboard behavior
      const searchInput = page.locator('[data-testid="favorites-search-input"]');
      await searchInput.tap();
      
      // Verify keyboard opens (viewport changes)
      await page.waitForTimeout(500);
      const viewportAfterKeyboard = page.viewportSize();
      
      // Type with virtual keyboard
      await searchInput.fill('test recipe');
      await expect(searchInput).toHaveValue('test recipe');
      
      // Test keyboard dismissal
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      
      await takeTestScreenshot(page, 'mobile-keyboard-interaction.png', 'Mobile virtual keyboard interaction');
    });

    await test.step('Test mobile screen reader compatibility', async () => {
      // Test ARIA labels for mobile screen readers
      const favoriteButton = page.locator('[data-testid="favorite-button"]').first();
      
      await expect(favoriteButton).toHaveAttribute('aria-label');
      await expect(favoriteButton).toHaveAttribute('role', 'button');
      
      // Test focus management on mobile
      await favoriteButton.focus();
      await expect(favoriteButton).toBeFocused();
      
      // Test mobile navigation landmarks
      await expect(page.locator('[role="main"]')).toBeVisible();
      await expect(page.locator('[role="navigation"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'mobile-accessibility-features.png', 'Mobile accessibility features verification');
    });

    await test.step('Test mobile error handling', async () => {
      // Test network error handling on mobile
      await page.route('**/api/favorites/**', route => route.abort());
      
      const favoriteButton = page.locator('[data-testid="favorite-button"]').first();
      await favoriteButton.tap();
      
      // Should show mobile-optimized error message
      await expect(page.locator('[data-testid="mobile-error-toast"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-action-button"]')).toBeVisible();
      
      // Test retry functionality
      await page.unroute('**/api/favorites/**');
      await page.locator('[data-testid="retry-action-button"]').tap();
      
      await expect(page.locator('[data-testid="favorite-success-toast"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'mobile-error-handling.png', 'Mobile error handling and recovery');
    });
  });
});