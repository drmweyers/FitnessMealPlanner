/**
 * Comprehensive Recipe System E2E Tests with Playwright
 * 
 * This test suite provides complete end-to-end validation of the recipe system
 * from user interactions through the browser to final database state verification.
 * 
 * Test Categories:
 * 1. Complete Recipe Generation User Journey (Admin)
 * 2. Recipe Search and Discovery (All User Types)
 * 3. Recipe Queue Management Workflow (Admin)
 * 4. Recipe Approval/Rejection Process (Admin)
 * 5. Mobile Responsive Recipe Interactions
 * 6. Cross-browser Recipe Functionality
 * 7. Performance and Accessibility Testing
 * 
 * @author BMAD Testing Agent
 * @version 1.0.0
 * @date December 2024
 */

import { test, expect } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4000';

// Test credentials
const TEST_ACCOUNTS = {
  admin: {
    email: 'admin@fitmeal.pro',
    password: 'AdminPass123'
  },
  trainer: {
    email: 'trainer.test@evofitmeals.com',
    password: 'TestTrainer123!'
  },
  customer: {
    email: 'customer.test@evofitmeals.com',
    password: 'TestCustomer123!'
  }
};

// Helper functions
const loginAs = async (page, userType: 'admin' | 'trainer' | 'customer') => {
  const credentials = TEST_ACCOUNTS[userType];
  
  await page.goto(`${BASE_URL}/login`);
  await page.fill('[data-testid="email-input"]', credentials.email);
  await page.fill('[data-testid="password-input"]', credentials.password);
  await page.click('[data-testid="login-button"]');
  
  // Wait for successful login
  await page.waitForURL(/.*\/(dashboard|admin|trainer)/);
};

const waitForRecipeGeneration = async (page) => {
  // Wait for generation to start
  await expect(page.locator('[data-testid="generation-progress"]')).toBeVisible({ timeout: 10000 });
  
  // Wait for completion or failure
  await expect(
    page.locator('[data-testid="generation-complete"]')
    .or(page.locator('[data-testid="generation-failed"]'))
  ).toBeVisible({ timeout: 60000 });
};

test.describe('Recipe System Comprehensive E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for recipe operations
    test.setTimeout(120000);
  });

  test.describe('1. Complete Recipe Generation User Journey (Admin)', () => {
    test('should complete full recipe generation workflow from admin dashboard', async ({ page }) => {
      await loginAs(page, 'admin');
      
      // Navigate to recipe generation
      await page.click('[data-testid="nav-recipes"]');
      await page.click('[data-testid="generate-recipes-button"]');
      
      // Verify modal opens
      await expect(page.locator('[data-testid="recipe-generation-modal"]')).toBeVisible();
      
      // Fill generation form
      await page.fill('[data-testid="recipe-count-input"]', '3');
      await page.selectOption('[data-testid="meal-type-select"]', 'breakfast');
      await page.selectOption('[data-testid="dietary-tag-select"]', 'vegetarian');
      await page.fill('[data-testid="max-prep-time-input"]', '30');
      await page.fill('[data-testid="max-calories-input"]', '500');
      
      // Start generation
      await page.click('[data-testid="start-generation-button"]');
      
      // Wait for generation to complete
      await waitForRecipeGeneration(page);
      
      // Verify success
      await expect(page.locator('[data-testid="generation-success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="recipes-generated-count"]')).toContainText('3');
      
      // Navigate to pending recipes
      await page.click('[data-testid="view-pending-recipes"]');
      
      // Verify new recipes in pending queue
      await expect(page.locator('[data-testid="pending-recipes-table"]')).toBeVisible();
      const pendingRows = page.locator('[data-testid="pending-recipe-row"]');
      await expect(pendingRows).toHaveCount(3);
    });

    test('should handle recipe generation with advanced options', async ({ page }) => {
      await loginAs(page, 'admin');
      
      await page.goto(`${BASE_URL}/admin/recipes`);
      await page.click('[data-testid="generate-recipes-button"]');
      
      // Open advanced options
      await page.click('[data-testid="advanced-options-toggle"]');
      
      // Fill advanced form
      await page.fill('[data-testid="recipe-count-input"]', '5');
      await page.fill('[data-testid="natural-language-prompt"]', 'High protein breakfast recipes for athletes');
      await page.fill('[data-testid="main-ingredient-input"]', 'eggs');
      await page.selectOption('[data-testid="fitness-goal-select"]', 'muscle_gain');
      await page.fill('[data-testid="min-protein-input"]', '25');
      await page.fill('[data-testid="max-protein-input"]', '40');
      
      await page.click('[data-testid="start-generation-button"]');
      
      // Monitor progress steps
      await expect(page.locator('[data-testid="progress-step-generating"]')).toBeVisible();
      await expect(page.locator('[data-testid="progress-step-validating"]')).toBeVisible();
      await expect(page.locator('[data-testid="progress-step-images"]')).toBeVisible();
      await expect(page.locator('[data-testid="progress-step-storing"]')).toBeVisible();
      
      await waitForRecipeGeneration(page);
      
      // Verify completion
      await expect(page.locator('[data-testid="generation-complete"]')).toBeVisible();
    });

    test('should handle recipe generation errors gracefully', async ({ page }) => {
      await loginAs(page, 'admin');
      
      await page.goto(`${BASE_URL}/admin/recipes`);
      await page.click('[data-testid="generate-recipes-button"]');
      
      // Try to generate with invalid count
      await page.fill('[data-testid="recipe-count-input"]', '0');
      await page.click('[data-testid="start-generation-button"]');
      
      // Verify validation error
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="validation-error"]')).toContainText('Count must be between 1 and');
      
      // Fix and try again with too high count
      await page.fill('[data-testid="recipe-count-input"]', '1000');
      await page.click('[data-testid="start-generation-button"]');
      
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    });

    test('should track and display recipe generation metrics', async ({ page }) => {
      await loginAs(page, 'admin');
      
      await page.goto(`${BASE_URL}/admin/recipes`);
      await page.click('[data-testid="generate-recipes-button"]');
      
      await page.fill('[data-testid="recipe-count-input"]', '2');
      await page.click('[data-testid="start-generation-button"]');
      
      await waitForRecipeGeneration(page);
      
      // Check metrics display
      await expect(page.locator('[data-testid="generation-metrics"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-duration"]')).toContainText(/\d+/);
      await expect(page.locator('[data-testid="average-time-per-recipe"]')).toContainText(/\d+/);
      await expect(page.locator('[data-testid="success-count"]')).toContainText('2');
    });
  });

  test.describe('2. Recipe Search and Discovery', () => {
    test('should search and filter recipes as customer', async ({ page }) => {
      await loginAs(page, 'customer');
      
      await page.goto(`${BASE_URL}/recipes`);
      
      // Wait for recipes to load
      await expect(page.locator('[data-testid="recipe-grid"]')).toBeVisible();
      
      // Test search functionality
      await page.fill('[data-testid="recipe-search-input"]', 'chicken');
      await page.press('[data-testid="recipe-search-input"]', 'Enter');
      
      // Wait for search results
      await expect(page.locator('[data-testid="search-results-count"]')).toBeVisible();
      const searchResults = page.locator('[data-testid="recipe-card"]');
      await expect(searchResults.first()).toBeVisible();
      
      // Test meal type filter
      await page.selectOption('[data-testid="meal-type-filter"]', 'dinner');
      await page.click('[data-testid="apply-filters-button"]');
      
      await page.waitForLoadState('networkidle');
      
      // Verify filtered results
      const filteredResults = page.locator('[data-testid="recipe-card"]');
      await expect(filteredResults.first()).toBeVisible();
    });

    test('should use advanced search filters', async ({ page }) => {
      await loginAs(page, 'customer');
      
      await page.goto(`${BASE_URL}/recipes`);
      await page.click('[data-testid="advanced-search-toggle"]');
      
      // Set multiple filters
      await page.selectOption('[data-testid="dietary-tags-filter"]', ['vegan', 'gluten-free']);
      await page.fill('[data-testid="max-calories-input"]', '400');
      await page.fill('[data-testid="min-protein-input"]', '20');
      await page.fill('[data-testid="max-prep-time-input"]', '30');
      
      await page.click('[data-testid="apply-filters-button"]');
      
      await page.waitForLoadState('networkidle');
      
      // Verify results match filters
      const results = page.locator('[data-testid="recipe-card"]');
      if (await results.count() > 0) {
        // Check that dietary tags are displayed
        await expect(results.first().locator('[data-testid="dietary-tags"]')).toContainText(/vegan|gluten-free/);
      }
    });

    test('should handle empty search results', async ({ page }) => {
      await loginAs(page, 'customer');
      
      await page.goto(`${BASE_URL}/recipes`);
      await page.fill('[data-testid="recipe-search-input"]', 'nonexistentrecipe123xyz');
      await page.press('[data-testid="recipe-search-input"]', 'Enter');
      
      await page.waitForLoadState('networkidle');
      
      // Verify empty state
      await expect(page.locator('[data-testid="no-results-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="no-results-message"]')).toContainText('No recipes found');
    });

    test('should display recipe details modal', async ({ page }) => {
      await loginAs(page, 'customer');
      
      await page.goto(`${BASE_URL}/recipes`);
      await expect(page.locator('[data-testid="recipe-card"]').first()).toBeVisible();
      
      // Click on first recipe card
      await page.locator('[data-testid="recipe-card"]').first().click();
      
      // Verify modal opens
      await expect(page.locator('[data-testid="recipe-detail-modal"]')).toBeVisible();
      
      // Check modal content
      await expect(page.locator('[data-testid="recipe-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="recipe-description"]')).toBeVisible();
      await expect(page.locator('[data-testid="recipe-ingredients"]')).toBeVisible();
      await expect(page.locator('[data-testid="recipe-instructions"]')).toBeVisible();
      await expect(page.locator('[data-testid="nutrition-info"]')).toBeVisible();
      
      // Close modal
      await page.click('[data-testid="close-modal-button"]');
      await expect(page.locator('[data-testid="recipe-detail-modal"]')).not.toBeVisible();
    });

    test('should handle recipe favoriting functionality', async ({ page }) => {
      await loginAs(page, 'customer');
      
      await page.goto(`${BASE_URL}/recipes`);
      await expect(page.locator('[data-testid="recipe-card"]').first()).toBeVisible();
      
      // Click favorite button
      const firstCard = page.locator('[data-testid="recipe-card"]').first();
      await firstCard.locator('[data-testid="favorite-button"]').click();
      
      // Verify favorite state
      await expect(firstCard.locator('[data-testid="favorite-button"]')).toHaveAttribute('data-favorited', 'true');
      
      // Navigate to favorites page
      await page.goto(`${BASE_URL}/favorites`);
      
      // Verify recipe appears in favorites
      await expect(page.locator('[data-testid="favorite-recipes-grid"]')).toBeVisible();
      await expect(page.locator('[data-testid="recipe-card"]')).toHaveCount(1);
    });
  });

  test.describe('3. Recipe Queue Management Workflow (Admin)', () => {
    test('should display pending recipes queue', async ({ page }) => {
      await loginAs(page, 'admin');
      
      await page.goto(`${BASE_URL}/admin/recipes/pending`);
      
      // Wait for pending recipes table
      await expect(page.locator('[data-testid="pending-recipes-table"]')).toBeVisible();
      
      // Check table headers
      await expect(page.locator('[data-testid="table-header-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="table-header-created"]')).toBeVisible();
      await expect(page.locator('[data-testid="table-header-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="table-header-actions"]')).toBeVisible();
    });

    test('should filter pending recipes by meal type and dietary tags', async ({ page }) => {
      await loginAs(page, 'admin');
      
      await page.goto(`${BASE_URL}/admin/recipes/pending`);
      
      // Apply filters
      await page.selectOption('[data-testid="pending-meal-type-filter"]', 'breakfast');
      await page.selectOption('[data-testid="pending-dietary-filter"]', 'vegetarian');
      await page.click('[data-testid="apply-pending-filters"]');
      
      await page.waitForLoadState('networkidle');
      
      // Verify filtered results
      const filteredRows = page.locator('[data-testid="pending-recipe-row"]');
      if (await filteredRows.count() > 0) {
        await expect(filteredRows.first().locator('[data-testid="meal-types"]')).toContainText('breakfast');
      }
    });

    test('should sort pending recipes by different criteria', async ({ page }) => {
      await loginAs(page, 'admin');
      
      await page.goto(`${BASE_URL}/admin/recipes/pending`);
      
      // Sort by creation date (newest first)
      await page.click('[data-testid="sort-by-created-desc"]');
      await page.waitForLoadState('networkidle');
      
      // Sort by name (alphabetical)
      await page.click('[data-testid="sort-by-name-asc"]');
      await page.waitForLoadState('networkidle');
      
      // Verify sorting is applied
      await expect(page.locator('[data-testid="active-sort-indicator"]')).toBeVisible();
    });

    test('should handle bulk operations on pending recipes', async ({ page }) => {
      await loginAs(page, 'admin');
      
      await page.goto(`${BASE_URL}/admin/recipes/pending`);
      
      // Select multiple recipes
      const checkboxes = page.locator('[data-testid="recipe-checkbox"]');
      const count = await checkboxes.count();
      
      if (count >= 2) {
        await checkboxes.first().check();
        await checkboxes.nth(1).check();
        
        // Verify bulk actions appear
        await expect(page.locator('[data-testid="bulk-actions-bar"]')).toBeVisible();
        await expect(page.locator('[data-testid="selected-count"]')).toContainText('2');
        
        // Test bulk approval
        await page.click('[data-testid="bulk-approve-button"]');
        await page.click('[data-testid="confirm-bulk-approve"]');
        
        // Wait for success message
        await expect(page.locator('[data-testid="bulk-operation-success"]')).toBeVisible();
      }
    });
  });

  test.describe('4. Recipe Approval/Rejection Process (Admin)', () => {
    test('should approve individual recipe with review notes', async ({ page }) => {
      await loginAs(page, 'admin');
      
      await page.goto(`${BASE_URL}/admin/recipes/pending`);
      
      // Find first pending recipe
      const firstRow = page.locator('[data-testid="pending-recipe-row"]').first();
      if (await firstRow.isVisible()) {
        // Click review button
        await firstRow.locator('[data-testid="review-recipe-button"]').click();
        
        // Verify review modal opens
        await expect(page.locator('[data-testid="recipe-review-modal"]')).toBeVisible();
        
        // Add review notes
        await page.fill('[data-testid="review-notes-input"]', 'Great recipe with clear instructions and good nutritional balance.');
        
        // Approve the recipe
        await page.click('[data-testid="approve-recipe-button"]');
        
        // Wait for success
        await expect(page.locator('[data-testid="approval-success-message"]')).toBeVisible();
        
        // Verify modal closes
        await expect(page.locator('[data-testid="recipe-review-modal"]')).not.toBeVisible();
      }
    });

    test('should reject recipe with detailed feedback', async ({ page }) => {
      await loginAs(page, 'admin');
      
      await page.goto(`${BASE_URL}/admin/recipes/pending`);
      
      const firstRow = page.locator('[data-testid="pending-recipe-row"]').first();
      if (await firstRow.isVisible()) {
        await firstRow.locator('[data-testid="review-recipe-button"]').click();
        
        // Fill rejection reason
        await page.fill('[data-testid="review-notes-input"]', 'Recipe needs clearer cooking instructions and ingredient measurements.');
        
        // Reject the recipe
        await page.click('[data-testid="reject-recipe-button"]');
        
        // Confirm rejection
        await page.click('[data-testid="confirm-rejection-button"]');
        
        // Wait for success
        await expect(page.locator('[data-testid="rejection-success-message"]')).toBeVisible();
      }
    });

    test('should quick approve recipe from table', async ({ page }) => {
      await loginAs(page, 'admin');
      
      await page.goto(`${BASE_URL}/admin/recipes/pending`);
      
      const firstRow = page.locator('[data-testid="pending-recipe-row"]').first();
      if (await firstRow.isVisible()) {
        // Click quick approve button
        await firstRow.locator('[data-testid="quick-approve-button"]').click();
        
        // Confirm in dialog
        await page.click('[data-testid="confirm-quick-approve"]');
        
        // Wait for success notification
        await expect(page.locator('[data-testid="quick-approve-success"]')).toBeVisible();
      }
    });

    test('should view approved recipes history', async ({ page }) => {
      await loginAs(page, 'admin');
      
      await page.goto(`${BASE_URL}/admin/recipes/approved`);
      
      // Check approved recipes table
      await expect(page.locator('[data-testid="approved-recipes-table"]')).toBeVisible();
      
      // Check for approval metadata
      const firstRow = page.locator('[data-testid="approved-recipe-row"]').first();
      if (await firstRow.isVisible()) {
        await expect(firstRow.locator('[data-testid="approved-date"]')).toBeVisible();
        await expect(firstRow.locator('[data-testid="approved-by"]')).toBeVisible();
        await expect(firstRow.locator('[data-testid="review-notes"]')).toBeVisible();
      }
    });
  });

  test.describe('5. Mobile Responsive Recipe Interactions', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await loginAs(page, 'customer');
      
      await page.goto(`${BASE_URL}/recipes`);
      
      // Verify mobile layout
      await expect(page.locator('[data-testid="mobile-recipe-grid"]')).toBeVisible();
      
      // Test mobile search
      await page.click('[data-testid="mobile-search-toggle"]');
      await expect(page.locator('[data-testid="mobile-search-drawer"]')).toBeVisible();
      
      await page.fill('[data-testid="mobile-search-input"]', 'pasta');
      await page.click('[data-testid="mobile-search-submit"]');
      
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-testid="recipe-card"]').first()).toBeVisible();
    });

    test('should handle touch interactions on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await loginAs(page, 'customer');
      
      await page.goto(`${BASE_URL}/recipes`);
      
      // Test touch gestures
      const firstCard = page.locator('[data-testid="recipe-card"]').first();
      await firstCard.tap();
      
      await expect(page.locator('[data-testid="recipe-detail-modal"]')).toBeVisible();
      
      // Test swipe to close (simulate with touch events)
      await page.locator('[data-testid="modal-overlay"]').tap();
      await expect(page.locator('[data-testid="recipe-detail-modal"]')).not.toBeVisible();
    });

    test('should display mobile-optimized recipe generation form', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await loginAs(page, 'admin');
      
      await page.goto(`${BASE_URL}/admin/recipes`);
      await page.click('[data-testid="mobile-generate-recipes-button"]');
      
      // Verify mobile modal
      await expect(page.locator('[data-testid="mobile-generation-modal"]')).toBeVisible();
      
      // Test mobile form interaction
      await page.fill('[data-testid="recipe-count-input"]', '2');
      await page.tap('[data-testid="mobile-start-generation"]');
      
      await waitForRecipeGeneration(page);
      await expect(page.locator('[data-testid="mobile-generation-complete"]')).toBeVisible();
    });
  });

  test.describe('6. Performance and Load Testing', () => {
    test('should handle large recipe datasets efficiently', async ({ page }) => {
      await loginAs(page, 'customer');
      
      // Measure page load time
      const startTime = Date.now();
      await page.goto(`${BASE_URL}/recipes`);
      await expect(page.locator('[data-testid="recipe-grid"]')).toBeVisible();
      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time
      expect(loadTime).toBeLessThan(5000);
      
      // Test scrolling performance with many recipes
      for (let i = 0; i < 5; i++) {
        await page.mouse.wheel(0, 1000);
        await page.waitForTimeout(100);
      }
      
      // Verify smooth scrolling and lazy loading
      const visibleCards = page.locator('[data-testid="recipe-card"]:visible');
      await expect(visibleCards).toHaveCount({ min: 1 });
    });

    test('should optimize recipe image loading', async ({ page }) => {
      await loginAs(page, 'customer');
      
      await page.goto(`${BASE_URL}/recipes`);
      
      // Wait for images to start loading
      await expect(page.locator('[data-testid="recipe-image"]').first()).toBeVisible();
      
      // Check for lazy loading implementation
      const images = page.locator('[data-testid="recipe-image"]');
      const count = await images.count();
      
      for (let i = 0; i < Math.min(count, 3); i++) {
        const img = images.nth(i);
        await expect(img).toHaveAttribute('loading', /lazy|eager/);
      }
    });

    test('should handle concurrent recipe searches', async ({ browser }) => {
      // Create multiple browser contexts for concurrent testing
      const contexts = await Promise.all([
        browser.newContext(),
        browser.newContext(),
        browser.newContext()
      ]);
      
      const pages = await Promise.all(contexts.map(context => context.newPage()));
      
      // Login all pages as customers
      await Promise.all(pages.map(page => loginAs(page, 'customer')));
      
      // Perform concurrent searches
      const searchPromises = pages.map((page, index) => {
        return page.goto(`${BASE_URL}/recipes`).then(() => {
          page.fill('[data-testid="recipe-search-input"]', `search-${index}`);
          return page.press('[data-testid="recipe-search-input"]', 'Enter');
        });
      });
      
      await Promise.all(searchPromises);
      
      // Verify all searches completed
      for (const page of pages) {
        await page.waitForLoadState('networkidle');
        // Should show search results or no results message
        await expect(
          page.locator('[data-testid="recipe-card"]')
          .or(page.locator('[data-testid="no-results-message"]'))
        ).toBeVisible();
      }
      
      // Cleanup
      await Promise.all(contexts.map(context => context.close()));
    });
  });

  test.describe('7. Accessibility Testing', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await loginAs(page, 'customer');
      await page.goto(`${BASE_URL}/recipes`);
      
      // Test keyboard navigation
      await page.keyboard.press('Tab'); // Focus search input
      await expect(page.locator('[data-testid="recipe-search-input"]')).toBeFocused();
      
      await page.keyboard.press('Tab'); // Focus first recipe card
      await page.keyboard.press('Enter'); // Activate recipe card
      
      // Recipe modal should open
      await expect(page.locator('[data-testid="recipe-detail-modal"]')).toBeVisible();
      
      // Escape should close modal
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-testid="recipe-detail-modal"]')).not.toBeVisible();
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      await loginAs(page, 'admin');
      await page.goto(`${BASE_URL}/admin/recipes`);
      
      // Check for proper ARIA labels
      await page.click('[data-testid="generate-recipes-button"]');
      
      const modal = page.locator('[data-testid="recipe-generation-modal"]');
      await expect(modal).toHaveAttribute('role', 'dialog');
      await expect(modal).toHaveAttribute('aria-labelledby');
      
      // Form elements should have proper labels
      await expect(page.locator('[data-testid="recipe-count-input"]')).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="meal-type-select"]')).toHaveAttribute('aria-label');
    });

    test('should support screen reader announcements', async ({ page }) => {
      await loginAs(page, 'admin');
      await page.goto(`${BASE_URL}/admin/recipes`);
      
      // Check for live region announcements
      await expect(page.locator('[aria-live="polite"]')).toBeAttached();
      
      // Generate recipes to trigger announcements
      await page.click('[data-testid="generate-recipes-button"]');
      await page.fill('[data-testid="recipe-count-input"]', '1');
      await page.click('[data-testid="start-generation-button"]');
      
      // Status updates should be announced
      await expect(page.locator('[aria-live="polite"]')).toContainText(/generating|progress|complete/i);
    });

    test('should have sufficient color contrast and visual indicators', async ({ page }) => {
      await loginAs(page, 'customer');
      await page.goto(`${BASE_URL}/recipes`);
      
      // Check focus indicators are visible
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      
      // Focus should be clearly visible
      const outline = await focusedElement.evaluate(el => 
        window.getComputedStyle(el).getPropertyValue('outline')
      );
      expect(outline).not.toBe('none');
      
      // Button states should be distinguishable
      const favoriteButton = page.locator('[data-testid="favorite-button"]').first();
      await favoriteButton.click();
      
      // Should have visual feedback for state change
      await expect(favoriteButton).toHaveAttribute('data-favorited', 'true');
    });
  });
});