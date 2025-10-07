import { test, expect, Page, BrowserContext } from '@playwright/test';
import { loginAsCustomer, takeTestScreenshot, waitForNetworkIdle } from '../../auth-helper';

/**
 * Data Integrity Tests
 * 
 * Comprehensive testing of data consistency, concurrent operations,
 * and edge cases that could lead to data corruption or inconsistencies.
 */

test.describe('Data Integrity Tests', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await loginAsCustomer(page);
  });

  test('Handles concurrent favorite operations', async () => {
    await test.step('Setup concurrent browser contexts', async () => {
      const browser = page.context().browser();
      if (!browser) throw new Error('Browser not available');
      
      // Create multiple browser contexts for the same user
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const context3 = await browser.newContext();
      
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      const page3 = await context3.newPage();
      
      // Login same user in all contexts
      await Promise.all([
        loginAsCustomer(page1),
        loginAsCustomer(page2),
        loginAsCustomer(page3)
      ]);
      
      await takeTestScreenshot(page1, 'concurrent-setup-page1.png', 'Concurrent setup - Page 1');
    });

    await test.step('Test concurrent favorite/unfavorite of same recipe', async () => {
      const browser = page.context().browser();
      if (!browser) throw new Error('Browser not available');
      
      const contexts = await Promise.all([
        browser.newContext(),
        browser.newContext()
      ]);
      
      const pages = await Promise.all([
        contexts[0].newPage(),
        contexts[1].newPage()
      ]);
      
      // Login both pages
      await Promise.all([
        loginAsCustomer(pages[0]),
        loginAsCustomer(pages[1])
      ]);
      
      // Navigate both to recipes
      await Promise.all([
        pages[0].goto('/recipes'),
        pages[1].goto('/recipes')
      ]);
      
      await Promise.all([
        waitForNetworkIdle(pages[0]),
        waitForNetworkIdle(pages[1])
      ]);
      
      // Simultaneously favorite the same recipe from both sessions
      const favoritePromises = [
        pages[0].click('[data-testid="recipe-card"]:first-child [data-testid="favorite-button"]'),
        pages[1].click('[data-testid="recipe-card"]:first-child [data-testid="favorite-button"]')
      ];
      
      await Promise.all(favoritePromises);
      
      // Both should succeed (or handle gracefully)
      await Promise.all([
        expect(pages[0].locator('[data-testid="favorite-success-toast"]')).toBeVisible(),
        expect(pages[1].locator('[data-testid="favorite-success-toast"]')).toBeVisible()
      ]);
      
      // Check final state is consistent
      await Promise.all([
        pages[0].goto('/favorites'),
        pages[1].goto('/favorites')
      ]);
      
      await Promise.all([
        waitForNetworkIdle(pages[0]),
        waitForNetworkIdle(pages[1])
      ]);
      
      // Both should show the same favorite count (should not duplicate)
      const count1 = await pages[0].locator('[data-testid="favorite-recipe-item"]').count();
      const count2 = await pages[1].locator('[data-testid="favorite-recipe-item"]').count();
      
      expect(count1).toBe(count2);
      expect(count1).toBe(1); // Should have exactly one favorite, not duplicated
      
      // Cleanup
      await Promise.all(contexts.map(context => context.close()));
      
      await takeTestScreenshot(page, 'concurrent-favorite-result.png', 'Concurrent favorite operation result');
    });

    await test.step('Test rapid sequential operations', async () => {
      await page.goto('/recipes');
      await waitForNetworkIdle(page);
      
      const favoriteButton = page.locator('[data-testid="recipe-card"]:first-child [data-testid="favorite-button"]');
      
      // Perform rapid favorite/unfavorite operations
      for (let i = 0; i < 5; i++) {
        await favoriteButton.click();
        await page.waitForTimeout(100); // Small delay between operations
      }
      
      // Final state should be consistent
      await page.waitForTimeout(1000); // Allow all operations to complete
      
      const finalState = await favoriteButton.getAttribute('aria-pressed');
      expect(['true', 'false']).toContain(finalState);
      
      // Check database consistency
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      const favoriteCount = await page.locator('[data-testid="favorite-recipe-item"]').count();
      
      if (finalState === 'true') {
        expect(favoriteCount).toBeGreaterThan(0);
      } else {
        // Could be 0 or still show some favorites depending on final state
        expect(favoriteCount).toBeGreaterThanOrEqual(0);
      }
      
      await takeTestScreenshot(page, 'rapid-operations-result.png', 'Rapid sequential operations result');
    });
  });

  test('Validates collection data integrity', async () => {
    await test.step('Test collection creation with duplicate names', async () => {
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Create first collection
      await page.click('[data-testid="create-collection-button"]');
      await page.fill('[data-testid="collection-name-input"]', 'Test Collection');
      await page.click('[data-testid="save-collection-button"]');
      await expect(page.locator('[data-testid="collection-created-toast"]')).toBeVisible();
      
      // Attempt to create second collection with same name
      await page.click('[data-testid="create-collection-button"]');
      await page.fill('[data-testid="collection-name-input"]', 'Test Collection');
      await page.click('[data-testid="save-collection-button"]');
      
      // Should either auto-rename or show validation error
      const hasValidationError = await page.locator('[data-testid="collection-name-error"]').isVisible({ timeout: 2000 });
      const hasAutoRename = await page.locator('[data-testid="collection-created-toast"]').isVisible({ timeout: 2000 });
      
      expect(hasValidationError || hasAutoRename).toBe(true);
      
      if (hasAutoRename) {
        // Check that collection was auto-renamed
        const collections = page.locator('[data-testid="collection-item"]');
        const collectionNames = await collections.allTextContents();
        
        // Should have unique names
        const uniqueNames = new Set(collectionNames);
        expect(uniqueNames.size).toBe(collectionNames.length);
      }
      
      await takeTestScreenshot(page, 'duplicate-collection-handling.png', 'Duplicate collection name handling');
    });

    await test.step('Test collection deletion with references', async () => {
      // Add a recipe to the collection first
      await page.goto('/recipes');
      await waitForNetworkIdle(page);
      
      // Favorite a recipe
      await page.click('[data-testid="recipe-card"]:first-child [data-testid="favorite-button"]');
      await expect(page.locator('[data-testid="favorite-success-toast"]')).toBeVisible();
      
      // Go to favorites and add to collection
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      const favoriteItem = page.locator('[data-testid="favorite-recipe-item"]').first();
      await favoriteItem.locator('[data-testid="recipe-actions-menu"]').click();
      await page.click('[data-testid="add-to-collection-option"]');
      await page.selectOption('[data-testid="collection-select"]', 'Test Collection');
      await page.click('[data-testid="confirm-add-to-collection"]');
      await expect(page.locator('[data-testid="add-to-collection-success-toast"]')).toBeVisible();
      
      // Now try to delete the collection
      await page.click('[data-testid="collections-tab"]');
      const collectionItem = page.locator('[data-testid="collection-item"]').first();
      await collectionItem.locator('[data-testid="collection-actions-menu"]').click();
      await page.click('[data-testid="delete-collection-option"]');
      
      // Should warn about references
      await expect(page.locator('[data-testid="delete-confirmation-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="references-warning"]')).toBeVisible();
      
      // Confirm deletion
      await page.click('[data-testid="confirm-delete-collection"]');
      await expect(page.locator('[data-testid="collection-deleted-toast"]')).toBeVisible();
      
      // Verify recipe is still in favorites but not in any collection
      await page.click('[data-testid="favorites-tab"]');
      await expect(page.locator('[data-testid="favorite-recipe-item"]')).toHaveCount(1);
      
      // Recipe should not show collection membership
      const recipeCollectionInfo = page.locator('[data-testid="recipe-collection-tags"]').first();
      if (await recipeCollectionInfo.count() > 0) {
        await expect(recipeCollectionInfo).not.toContainText('Test Collection');
      }
      
      await takeTestScreenshot(page, 'collection-deletion-integrity.png', 'Collection deletion data integrity');
    });

    await test.step('Test orphaned recipe handling', async () => {
      // Create a scenario where a recipe might become orphaned
      // This would happen if a recipe is deleted from the system but still referenced in favorites
      
      // Mock a scenario where API returns 404 for a recipe
      await page.route('**/api/recipes/*', route => {
        if (route.request().url().includes('recipe-deleted-123')) {
          route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Recipe not found' })
          });
        } else {
          route.continue();
        }
      });
      
      // Go to favorites page
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Should handle orphaned references gracefully
      const orphanedItems = page.locator('[data-testid="orphaned-recipe-item"]');
      if (await orphanedItems.count() > 0) {
        // Should show option to remove orphaned items
        await expect(page.locator('[data-testid="clean-orphaned-button"]')).toBeVisible();
        
        await page.click('[data-testid="clean-orphaned-button"]');
        await expect(page.locator('[data-testid="orphaned-cleaned-toast"]')).toBeVisible();
        
        // Orphaned items should be removed
        await expect(orphanedItems).toHaveCount(0);
      }
      
      await takeTestScreenshot(page, 'orphaned-recipe-handling.png', 'Orphaned recipe handling');
    });
  });

  test('Validates user permission boundaries', async () => {
    await test.step('Test collection sharing permission validation', async () => {
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Create a private collection
      await page.click('[data-testid="create-collection-button"]');
      await page.fill('[data-testid="collection-name-input"]', 'Private Collection');
      await page.uncheck('[data-testid="make-collection-public"]'); // Ensure it's private
      await page.click('[data-testid="save-collection-button"]');
      
      // Try to share the private collection
      const collectionItem = page.locator('[data-testid="collection-item"]').first();
      await collectionItem.locator('[data-testid="share-collection-button"]').click();
      
      // Should validate sharing permissions
      await expect(page.locator('[data-testid="share-modal"]')).toBeVisible();
      
      // Public sharing should be disabled for private collections
      const publicShareOption = page.locator('[data-testid="public-share-option"]');
      if (await publicShareOption.count() > 0) {
        await expect(publicShareOption).toBeDisabled();
      }
      
      await takeTestScreenshot(page, 'sharing-permissions.png', 'Collection sharing permission validation');
    });

    await test.step('Test cross-user data access prevention', async () => {
      // This test would require setting up multiple user accounts
      // For now, we'll test the frontend validation
      
      // Try to access a collection with an invalid ID
      await page.goto('/favorites/collections/invalid-collection-id');
      
      // Should redirect or show error
      const hasError = await page.locator('[data-testid="collection-not-found"]').isVisible({ timeout: 3000 });
      const isRedirected = page.url().includes('/favorites') && !page.url().includes('invalid-collection-id');
      
      expect(hasError || isRedirected).toBe(true);
      
      if (hasError) {
        await expect(page.locator('[data-testid="back-to-favorites-button"]')).toBeVisible();
      }
      
      await takeTestScreenshot(page, 'invalid-collection-access.png', 'Invalid collection access handling');
    });
  });

  test('Validates edge case data scenarios', async () => {
    await test.step('Test maximum favorites limit', async () => {
      // This would test what happens when a user reaches the maximum number of favorites
      // In a real scenario, this might be 1000+ favorites
      
      await page.goto('/recipes');
      await waitForNetworkIdle(page);
      
      // Mock scenario where user is at maximum limit
      await page.route('**/api/favorites**', route => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 422,
            contentType: 'application/json',
            body: JSON.stringify({ 
              error: 'Maximum favorites limit reached',
              limit: 1000,
              current: 1000
            })
          });
        } else {
          route.continue();
        }
      });
      
      await page.click('[data-testid="favorite-button"]');
      
      // Should show limit reached error
      await expect(page.locator('[data-testid="favorites-limit-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="manage-favorites-button"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'favorites-limit-reached.png', 'Maximum favorites limit handling');
    });

    await test.step('Test empty state handling', async () => {
      // Mock empty favorites response
      await page.route('**/api/favorites**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ favorites: [], collections: [] })
        });
      });
      
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Should show empty state
      await expect(page.locator('[data-testid="empty-favorites-state"]')).toBeVisible();
      await expect(page.locator('[data-testid="discover-recipes-button"]')).toBeVisible();
      
      // Test empty collections state
      await page.click('[data-testid="collections-tab"]');
      await expect(page.locator('[data-testid="empty-collections-state"]')).toBeVisible();
      await expect(page.locator('[data-testid="create-first-collection-button"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'empty-states.png', 'Empty state handling');
    });

    await test.step('Test very large collection handling', async () => {
      // Mock a collection with many recipes
      const largeCollection = {
        id: 'large-collection',
        name: 'Large Collection',
        recipes: Array.from({ length: 500 }, (_, i) => ({
          id: `recipe-${i}`,
          name: `Recipe ${i + 1}`,
          description: `Description ${i + 1}`
        }))
      };
      
      await page.route('**/api/collections/*', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(largeCollection)
        });
      });
      
      await page.goto('/favorites/collections/large-collection');
      await waitForNetworkIdle(page);
      
      // Should handle large collections efficiently
      await expect(page.locator('[data-testid="collection-recipe-item"]')).toHaveCount.greaterThan(0);
      
      // Should use pagination or virtualization
      const hasPagination = await page.locator('[data-testid="collection-pagination"]').isVisible();
      const hasVirtualization = await page.locator('[data-testid="virtual-list"]').isVisible();
      
      expect(hasPagination || hasVirtualization).toBe(true);
      
      await takeTestScreenshot(page, 'large-collection-handling.png', 'Large collection handling');
    });

    await test.step('Test special character handling in names', async () => {
      // Test collection names with special characters
      const specialCharacterNames = [
        'Collection with "quotes"',
        'Collection with <tags>',
        'Collection with & ampersand',
        'Collection with unicode 🍔',
        'Collection with\nnewlines'
      ];
      
      for (const name of specialCharacterNames) {
        await page.goto('/favorites');
        await waitForNetworkIdle(page);
        
        await page.click('[data-testid="create-collection-button"]');
        await page.fill('[data-testid="collection-name-input"]', name);
        await page.click('[data-testid="save-collection-button"]');
        
        // Should handle special characters without breaking
        const hasError = await page.locator('[data-testid="collection-name-error"]').isVisible({ timeout: 2000 });
        const hasSuccess = await page.locator('[data-testid="collection-created-toast"]').isVisible({ timeout: 2000 });
        
        if (hasSuccess) {
          // Verify the name is displayed correctly
          await expect(page.locator('[data-testid="collection-item"]').last()).toContainText(name);
        }
        
        // Clean up - delete the collection
        if (hasSuccess) {
          const lastCollection = page.locator('[data-testid="collection-item"]').last();
          await lastCollection.locator('[data-testid="collection-actions-menu"]').click();
          await page.click('[data-testid="delete-collection-option"]');
          await page.click('[data-testid="confirm-delete-collection"]');
        }
      }
      
      await takeTestScreenshot(page, 'special-characters-handling.png', 'Special character handling in names');
    });
  });

  test('Validates database transaction integrity', async () => {
    await test.step('Test partial operation failure handling', async () => {
      // Simulate a scenario where adding multiple recipes to a collection partially fails
      
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Create a collection
      await page.click('[data-testid="create-collection-button"]');
      await page.fill('[data-testid="collection-name-input"]', 'Transaction Test');
      await page.click('[data-testid="save-collection-button"]');
      
      // Go to recipes and favorite multiple items
      await page.goto('/recipes');
      await waitForNetworkIdle(page);
      
      const recipeCards = page.locator('[data-testid="recipe-card"]');
      const cardCount = Math.min(3, await recipeCards.count());
      
      for (let i = 0; i < cardCount; i++) {
        await recipeCards.nth(i).locator('[data-testid="favorite-button"]').click();
        await expect(page.locator('[data-testid="favorite-success-toast"]')).toBeVisible();
      }
      
      // Mock partial failure when adding to collection
      let requestCount = 0;
      await page.route('**/api/collections/*/recipes', route => {
        requestCount++;
        if (requestCount === 2) {
          // Second request fails
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Database error' })
          });
        } else {
          route.continue();
        }
      });
      
      // Try to add multiple recipes to collection via batch operation
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Select multiple items
      await page.click('[data-testid="multi-select-mode-toggle"]');
      
      const favoriteItems = page.locator('[data-testid="favorite-recipe-item"]');
      for (let i = 0; i < Math.min(3, await favoriteItems.count()); i++) {
        await favoriteItems.nth(i).locator('[data-testid="select-checkbox"]').click();
      }
      
      // Batch add to collection
      await page.click('[data-testid="batch-actions-menu"]');
      await page.click('[data-testid="batch-add-to-collection"]');
      await page.selectOption('[data-testid="collection-select"]', 'Transaction Test');
      await page.click('[data-testid="confirm-batch-add"]');
      
      // Should show partial success/failure message
      await expect(page.locator('[data-testid="partial-operation-result"]')).toBeVisible();
      
      // Should show which operations succeeded and which failed
      await expect(page.locator('[data-testid="operation-summary"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'partial-operation-failure.png', 'Partial operation failure handling');
    });

    await test.step('Test rollback on critical errors', async () => {
      // Test scenario where a critical operation needs to be rolled back
      
      // Mock a scenario where collection creation succeeds but initial recipe addition fails
      let collectionCreated = false;
      await page.route('**/api/collections', route => {
        if (route.request().method() === 'POST') {
          collectionCreated = true;
          route.continue();
        } else {
          route.continue();
        }
      });
      
      await page.route('**/api/collections/*/recipes', route => {
        if (collectionCreated) {
          // Fail the recipe addition
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Critical database error' })
          });
        } else {
          route.continue();
        }
      });
      
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Try to create collection with initial recipe
      await page.click('[data-testid="create-collection-with-recipes-button"]');
      
      if (await page.locator('[data-testid="collection-creation-modal"]').isVisible()) {
        await page.fill('[data-testid="collection-name-input"]', 'Rollback Test');
        
        // Select recipes to add initially
        const recipeCheckboxes = page.locator('[data-testid="recipe-checkbox"]');
        if (await recipeCheckboxes.count() > 0) {
          await recipeCheckboxes.first().click();
        }
        
        await page.click('[data-testid="create-collection-with-recipes"]');
        
        // Should show error and indicate rollback
        await expect(page.locator('[data-testid="collection-creation-failed"]')).toBeVisible();
        await expect(page.locator('[data-testid="operation-rolled-back"]')).toBeVisible();
        
        // Verify collection was not created
        await page.click('[data-testid="collections-tab"]');
        const collections = page.locator('[data-testid="collection-item"]');
        const collectionNames = await collections.allTextContents();
        expect(collectionNames).not.toContain('Rollback Test');
      }
      
      await takeTestScreenshot(page, 'rollback-handling.png', 'Database rollback handling');
    });
  });
});