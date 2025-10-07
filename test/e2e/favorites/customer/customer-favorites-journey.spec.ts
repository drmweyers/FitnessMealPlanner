import { test, expect, Page } from '@playwright/test';
import { loginAsCustomer, takeTestScreenshot, waitForNetworkIdle } from '../../auth-helper';

/**
 * Customer Favorites Journey Tests
 * 
 * Complete end-to-end testing of the favoriting system from a customer perspective.
 * Tests the entire user workflow from discovering recipes to managing collections.
 */

test.describe('Customer Favorites Journey', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await loginAsCustomer(page);
  });

  test('Complete favoriting workflow', async () => {
    // Navigate to recipes discovery page
    await test.step('Navigate to recipes page', async () => {
      await page.goto('/recipes');
      await waitForNetworkIdle(page);
      await expect(page).toHaveURL(/.*\/recipes.*/);
      await takeTestScreenshot(page, 'recipes-page.png', 'Customer viewing recipes page');
    });

    // Browse and favorite multiple recipes
    await test.step('Favorite multiple recipes', async () => {
      // Check that recipes are loaded
      await expect(page.locator('[data-testid="recipe-card"]')).toHaveCount.greaterThan(0);
      
      // Favorite first recipe
      const firstRecipeCard = page.locator('[data-testid="recipe-card"]').first();
      const firstFavoriteButton = firstRecipeCard.locator('[data-testid="favorite-button"]');
      
      await firstFavoriteButton.click();
      await expect(page.locator('[data-testid="favorite-success-toast"]')).toBeVisible();
      await expect(firstFavoriteButton).toHaveAttribute('aria-pressed', 'true');
      
      // Favorite second recipe
      const secondRecipeCard = page.locator('[data-testid="recipe-card"]').nth(1);
      const secondFavoriteButton = secondRecipeCard.locator('[data-testid="favorite-button"]');
      
      await secondFavoriteButton.click();
      await expect(page.locator('[data-testid="favorite-success-toast"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'recipes-favorited.png', 'Recipes after favoriting');
    });

    // Navigate to favorites page
    await test.step('Navigate to favorites page', async () => {
      await page.click('[data-testid="favorites-nav-link"]');
      await waitForNetworkIdle(page);
      await expect(page).toHaveURL(/.*\/favorites.*/);
      await expect(page.locator('[data-testid="favorites-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="favorite-recipe-item"]')).toHaveCount(2);
      
      await takeTestScreenshot(page, 'favorites-page.png', 'Customer favorites page with favorited recipes');
    });

    // Create new collection
    await test.step('Create new collection', async () => {
      await page.click('[data-testid="create-collection-button"]');
      await expect(page.locator('[data-testid="collection-modal"]')).toBeVisible();
      
      await page.fill('[data-testid="collection-name-input"]', 'My Healthy Recipes');
      await page.fill('[data-testid="collection-description-input"]', 'Collection of my favorite healthy recipes');
      await page.click('[data-testid="save-collection-button"]');
      
      await expect(page.locator('[data-testid="collection-success-toast"]')).toBeVisible();
      await expect(page.locator('[data-testid="collection-item"]')).toContainText('My Healthy Recipes');
      
      await takeTestScreenshot(page, 'collection-created.png', 'New collection created');
    });

    // Add recipe to collection
    await test.step('Add recipe to collection', async () => {
      const firstRecipeItem = page.locator('[data-testid="favorite-recipe-item"]').first();
      await firstRecipeItem.locator('[data-testid="recipe-actions-menu"]').click();
      await page.click('[data-testid="add-to-collection-option"]');
      
      await expect(page.locator('[data-testid="collection-selection-modal"]')).toBeVisible();
      await page.selectOption('[data-testid="collection-select"]', 'My Healthy Recipes');
      await page.click('[data-testid="confirm-add-to-collection"]');
      
      await expect(page.locator('[data-testid="add-to-collection-success-toast"]')).toBeVisible();
    });

    // Verify collection contains recipe
    await test.step('Verify collection contents', async () => {
      await page.click('[data-testid="collections-tab"]');
      await page.locator('[data-testid="collection-item"]').filter({ hasText: 'My Healthy Recipes' }).click();
      
      await expect(page.locator('[data-testid="collection-recipe-item"]')).toHaveCount(1);
      await expect(page.locator('[data-testid="collection-title"]')).toContainText('My Healthy Recipes');
      
      await takeTestScreenshot(page, 'collection-with-recipe.png', 'Collection containing favorited recipe');
    });

    // Test unfavoriting
    await test.step('Test unfavoriting workflow', async () => {
      // Go back to favorites list
      await page.click('[data-testid="back-to-favorites"]');
      await expect(page.locator('[data-testid="favorites-list"]')).toBeVisible();
      
      // Unfavorite a recipe
      const recipeToUnfavorite = page.locator('[data-testid="favorite-recipe-item"]').first();
      await recipeToUnfavorite.locator('[data-testid="recipe-favorite-button"]').click();
      
      await expect(page.locator('[data-testid="unfavorite-confirmation"]')).toBeVisible();
      await page.click('[data-testid="confirm-unfavorite"]');
      
      await expect(page.locator('[data-testid="unfavorite-success-toast"]')).toBeVisible();
      await expect(page.locator('[data-testid="favorite-recipe-item"]')).toHaveCount(1);
      
      await takeTestScreenshot(page, 'after-unfavorite.png', 'Favorites list after unfavoriting');
    });

    // Verify recipe removed from collection
    await test.step('Verify collection updated after unfavorite', async () => {
      await page.click('[data-testid="collections-tab"]');
      await page.locator('[data-testid="collection-item"]').filter({ hasText: 'My Healthy Recipes' }).click();
      
      // Should show empty collection message if the unfavorited recipe was removed from collection
      const collectionRecipes = await page.locator('[data-testid="collection-recipe-item"]').count();
      if (collectionRecipes === 0) {
        await expect(page.locator('[data-testid="empty-collection-message"]')).toBeVisible();
      }
    });
  });

  test('Popular recipes discovery', async () => {
    await test.step('Navigate to discover page', async () => {
      await page.goto('/discover');
      await waitForNetworkIdle(page);
      await expect(page).toHaveURL(/.*\/discover.*/);
      
      await takeTestScreenshot(page, 'discover-page.png', 'Customer discover page');
    });

    await test.step('Check trending recipes section', async () => {
      await expect(page.locator('[data-testid="trending-recipes-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="trending-recipe-card"]')).toHaveCount.greaterThan(0);
      
      // Check that trending recipes have proper metadata
      const firstTrendingRecipe = page.locator('[data-testid="trending-recipe-card"]').first();
      await expect(firstTrendingRecipe.locator('[data-testid="recipe-name"]')).toBeVisible();
      await expect(firstTrendingRecipe.locator('[data-testid="favorite-count"]')).toBeVisible();
      await expect(firstTrendingRecipe.locator('[data-testid="popularity-indicator"]')).toBeVisible();
    });

    await test.step('Test time period filters', async () => {
      // Test weekly filter
      await page.click('[data-testid="trending-period-weekly"]');
      await waitForNetworkIdle(page);
      await expect(page.locator('[data-testid="trending-recipe-card"]')).toHaveCount.greaterThan(0);
      
      // Test monthly filter
      await page.click('[data-testid="trending-period-monthly"]');
      await waitForNetworkIdle(page);
      await expect(page.locator('[data-testid="trending-recipe-card"]')).toHaveCount.greaterThan(0);
      
      // Test all time filter
      await page.click('[data-testid="trending-period-all-time"]');
      await waitForNetworkIdle(page);
      await expect(page.locator('[data-testid="trending-recipe-card"]')).toHaveCount.greaterThan(0);
      
      await takeTestScreenshot(page, 'trending-filters.png', 'Trending recipes with different time filters');
    });

    await test.step('Test favoriting from popular list', async () => {
      const firstTrendingRecipe = page.locator('[data-testid="trending-recipe-card"]').first();
      const favoriteButton = firstTrendingRecipe.locator('[data-testid="favorite-button"]');
      
      await favoriteButton.click();
      await expect(page.locator('[data-testid="favorite-success-toast"]')).toBeVisible();
      await expect(favoriteButton).toHaveAttribute('aria-pressed', 'true');
      
      // Verify favorite count increased
      const favoriteCountAfter = await firstTrendingRecipe.locator('[data-testid="favorite-count"]').textContent();
      expect(parseInt(favoriteCountAfter || '0')).toBeGreaterThan(0);
    });

    await test.step('Verify in favorites', async () => {
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      await expect(page.locator('[data-testid="favorite-recipe-item"]')).toHaveCount.greaterThan(0);
      
      await takeTestScreenshot(page, 'favorites-from-trending.png', 'Favorites page with recipe from trending');
    });
  });

  test('Personalized recommendations', async () => {
    await test.step('Set dietary preferences', async () => {
      await page.goto('/profile/preferences');
      await waitForNetworkIdle(page);
      
      // Set dietary preferences
      await page.check('[data-testid="dietary-preference-vegetarian"]');
      await page.check('[data-testid="dietary-preference-low-carb"]');
      await page.check('[data-testid="cuisine-preference-italian"]');
      await page.check('[data-testid="cuisine-preference-mediterranean"]');
      
      // Set calorie target
      await page.fill('[data-testid="daily-calories-input"]', '2000');
      
      // Set allergen restrictions
      await page.check('[data-testid="allergen-dairy"]');
      
      await page.click('[data-testid="save-preferences-button"]');
      await expect(page.locator('[data-testid="preferences-saved-toast"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'preferences-set.png', 'Customer dietary preferences set');
    });

    await test.step('Navigate to recommendations', async () => {
      await page.goto('/recommendations');
      await waitForNetworkIdle(page);
      
      await expect(page.locator('[data-testid="recommendation-card"]')).toHaveCount.greaterThan(0);
      
      // Verify recommendations match preferences
      const recommendations = page.locator('[data-testid="recommendation-card"]');
      const recommendationCount = await recommendations.count();
      
      expect(recommendationCount).toBeGreaterThanOrEqual(5); // Should have at least 5 recommendations
      expect(recommendationCount).toBeLessThanOrEqual(20);  // Should not overwhelm with too many
      
      await takeTestScreenshot(page, 'personalized-recommendations.png', 'Personalized recipe recommendations');
    });

    await test.step('Test recommendation feedback', async () => {
      // Like first recommendation
      const firstRecommendation = page.locator('[data-testid="recommendation-card"]').first();
      await firstRecommendation.locator('[data-testid="recommendation-like-button"]').click();
      await expect(page.locator('[data-testid="feedback-success-toast"]')).toBeVisible();
      
      // Dislike second recommendation
      const secondRecommendation = page.locator('[data-testid="recommendation-card"]').nth(1);
      await secondRecommendation.locator('[data-testid="recommendation-dislike-button"]').click();
      await expect(page.locator('[data-testid="feedback-success-toast"]')).toBeVisible();
      
      // Provide detailed feedback
      await page.click('[data-testid="provide-feedback-button"]');
      await expect(page.locator('[data-testid="feedback-modal"]')).toBeVisible();
      await page.fill('[data-testid="feedback-reason"]', 'Too many carbohydrates for my low-carb diet');
      await page.click('[data-testid="submit-feedback"]');
      
      await takeTestScreenshot(page, 'recommendation-feedback.png', 'Recommendation feedback provided');
    });

    await test.step('Test refresh recommendations', async () => {
      const initialRecommendations = await page.locator('[data-testid="recommendation-card"] h3').allTextContents();
      
      await page.click('[data-testid="refresh-recommendations-button"]');
      await waitForNetworkIdle(page);
      
      const refreshedRecommendations = await page.locator('[data-testid="recommendation-card"] h3').allTextContents();
      
      // Should have new recommendations (at least some different)
      const sameRecipes = initialRecommendations.filter(recipe => refreshedRecommendations.includes(recipe));
      expect(sameRecipes.length).toBeLessThan(initialRecommendations.length);
      
      await takeTestScreenshot(page, 'refreshed-recommendations.png', 'Refreshed personalized recommendations');
    });

    await test.step('Test recommendation categories', async () => {
      // Test breakfast recommendations
      await page.click('[data-testid="category-breakfast"]');
      await waitForNetworkIdle(page);
      await expect(page.locator('[data-testid="recommendation-card"]')).toHaveCount.greaterThan(0);
      
      // Verify all recommendations are breakfast items
      const breakfastRecommendations = page.locator('[data-testid="recommendation-card"]');
      const breakfastCount = await breakfastRecommendations.count();
      
      for (let i = 0; i < breakfastCount; i++) {
        const mealType = breakfastRecommendations.nth(i).locator('[data-testid="meal-type"]');
        await expect(mealType).toContainText(/breakfast/i);
      }
      
      // Test lunch recommendations
      await page.click('[data-testid="category-lunch"]');
      await waitForNetworkIdle(page);
      
      // Test dinner recommendations
      await page.click('[data-testid="category-dinner"]');
      await waitForNetworkIdle(page);
      
      // Test snack recommendations
      await page.click('[data-testid="category-snacks"]');
      await waitForNetworkIdle(page);
      
      await takeTestScreenshot(page, 'recommendation-categories.png', 'Recommendations filtered by meal category');
    });
  });

  test('Collection management workflows', async () => {
    // Setup: Add some recipes to favorites first
    await test.step('Setup favorite recipes', async () => {
      await page.goto('/recipes');
      await waitForNetworkIdle(page);
      
      // Favorite multiple recipes for testing
      const recipeCards = page.locator('[data-testid="recipe-card"]');
      const recipeCount = Math.min(5, await recipeCards.count());
      
      for (let i = 0; i < recipeCount; i++) {
        await recipeCards.nth(i).locator('[data-testid="favorite-button"]').click();
        await expect(page.locator('[data-testid="favorite-success-toast"]')).toBeVisible();
      }
    });

    await test.step('Navigate to favorites and create multiple collections', async () => {
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Create "Breakfast Favorites" collection
      await page.click('[data-testid="create-collection-button"]');
      await page.fill('[data-testid="collection-name-input"]', 'Breakfast Favorites');
      await page.fill('[data-testid="collection-description-input"]', 'My favorite breakfast recipes');
      await page.click('[data-testid="save-collection-button"]');
      
      // Create "Quick Meals" collection
      await page.click('[data-testid="create-collection-button"]');
      await page.fill('[data-testid="collection-name-input"]', 'Quick Meals');
      await page.fill('[data-testid="collection-description-input"]', 'Recipes that take 30 minutes or less');
      await page.click('[data-testid="save-collection-button"]');
      
      // Create "Healthy Options" collection
      await page.click('[data-testid="create-collection-button"]');
      await page.fill('[data-testid="collection-name-input"]', 'Healthy Options');
      await page.fill('[data-testid="collection-description-input"]', 'Low-calorie, nutritious recipes');
      await page.click('[data-testid="save-collection-button"]');
      
      await takeTestScreenshot(page, 'multiple-collections-created.png', 'Multiple collections created');
    });

    await test.step('Add recipes to different collections', async () => {
      const favoriteRecipes = page.locator('[data-testid="favorite-recipe-item"]');
      const recipeCount = await favoriteRecipes.count();
      
      for (let i = 0; i < Math.min(3, recipeCount); i++) {
        const recipe = favoriteRecipes.nth(i);
        await recipe.locator('[data-testid="recipe-actions-menu"]').click();
        await page.click('[data-testid="add-to-collection-option"]');
        
        // Add to different collections based on index
        const collections = ['Breakfast Favorites', 'Quick Meals', 'Healthy Options'];
        await page.selectOption('[data-testid="collection-select"]', collections[i % collections.length]);
        await page.click('[data-testid="confirm-add-to-collection"]');
        
        await expect(page.locator('[data-testid="add-to-collection-success-toast"]')).toBeVisible();
      }
    });

    await test.step('Test collection management features', async () => {
      await page.click('[data-testid="collections-tab"]');
      
      // Verify all collections are visible
      await expect(page.locator('[data-testid="collection-item"]')).toHaveCount(3);
      
      // Test renaming collection
      const firstCollection = page.locator('[data-testid="collection-item"]').first();
      await firstCollection.locator('[data-testid="collection-actions-menu"]').click();
      await page.click('[data-testid="rename-collection-option"]');
      
      await page.fill('[data-testid="collection-name-input"]', 'Morning Favorites');
      await page.click('[data-testid="save-collection-button"]');
      
      await expect(page.locator('[data-testid="collection-item"]').first()).toContainText('Morning Favorites');
      
      // Test collection description edit
      await firstCollection.locator('[data-testid="collection-actions-menu"]').click();
      await page.click('[data-testid="edit-collection-option"]');
      
      await page.fill('[data-testid="collection-description-input"]', 'Updated description for morning recipes');
      await page.click('[data-testid="save-collection-button"]');
      
      await takeTestScreenshot(page, 'collection-management.png', 'Collection management features');
    });

    await test.step('Test collection deletion', async () => {
      const initialCollectionCount = await page.locator('[data-testid="collection-item"]').count();
      
      // Delete a collection
      const lastCollection = page.locator('[data-testid="collection-item"]').last();
      await lastCollection.locator('[data-testid="collection-actions-menu"]').click();
      await page.click('[data-testid="delete-collection-option"]');
      
      // Confirm deletion
      await expect(page.locator('[data-testid="delete-confirmation-modal"]')).toBeVisible();
      await page.click('[data-testid="confirm-delete-collection"]');
      
      await expect(page.locator('[data-testid="collection-deleted-toast"]')).toBeVisible();
      await expect(page.locator('[data-testid="collection-item"]')).toHaveCount(initialCollectionCount - 1);
      
      await takeTestScreenshot(page, 'collection-deleted.png', 'Collection after deletion');
    });
  });

  test('Favorites search and filtering', async () => {
    // Setup: Create favorites with different characteristics
    await test.step('Setup diverse favorite recipes', async () => {
      await page.goto('/recipes');
      await waitForNetworkIdle(page);
      
      // Favorite recipes with different meal types and dietary tags
      const recipeCards = page.locator('[data-testid="recipe-card"]');
      const recipeCount = Math.min(10, await recipeCards.count());
      
      for (let i = 0; i < recipeCount; i++) {
        await recipeCards.nth(i).locator('[data-testid="favorite-button"]').click();
        await expect(page.locator('[data-testid="favorite-success-toast"]')).toBeVisible();
      }
    });

    await test.step('Test search functionality in favorites', async () => {
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Test search by recipe name
      await page.fill('[data-testid="favorites-search-input"]', 'chicken');
      await waitForNetworkIdle(page);
      
      const searchResults = page.locator('[data-testid="favorite-recipe-item"]');
      const resultCount = await searchResults.count();
      
      // Verify search results contain the search term
      for (let i = 0; i < resultCount; i++) {
        const recipeName = await searchResults.nth(i).locator('[data-testid="recipe-name"]').textContent();
        expect(recipeName?.toLowerCase()).toContain('chicken');
      }
      
      // Clear search
      await page.fill('[data-testid="favorites-search-input"]', '');
      await waitForNetworkIdle(page);
      
      await takeTestScreenshot(page, 'favorites-search.png', 'Search results in favorites');
    });

    await test.step('Test filtering by meal type', async () => {
      // Filter by breakfast
      await page.click('[data-testid="filter-meal-type"]');
      await page.check('[data-testid="filter-breakfast"]');
      await page.click('[data-testid="apply-filters"]');
      await waitForNetworkIdle(page);
      
      const breakfastFavorites = page.locator('[data-testid="favorite-recipe-item"]');
      const breakfastCount = await breakfastFavorites.count();
      
      // Verify all results are breakfast items
      for (let i = 0; i < breakfastCount; i++) {
        const mealType = breakfastFavorites.nth(i).locator('[data-testid="recipe-meal-type"]');
        await expect(mealType).toContainText(/breakfast/i);
      }
      
      // Test multiple meal type selection
      await page.check('[data-testid="filter-lunch"]');
      await page.click('[data-testid="apply-filters"]');
      await waitForNetworkIdle(page);
      
      await takeTestScreenshot(page, 'favorites-meal-type-filter.png', 'Favorites filtered by meal type');
    });

    await test.step('Test filtering by dietary preferences', async () => {
      // Clear previous filters
      await page.click('[data-testid="clear-all-filters"]');
      await waitForNetworkIdle(page);
      
      // Filter by vegetarian
      await page.click('[data-testid="filter-dietary"]');
      await page.check('[data-testid="filter-vegetarian"]');
      await page.click('[data-testid="apply-filters"]');
      await waitForNetworkIdle(page);
      
      const vegetarianFavorites = page.locator('[data-testid="favorite-recipe-item"]');
      const vegetarianCount = await vegetarianFavorites.count();
      
      // Verify all results are vegetarian
      for (let i = 0; i < vegetarianCount; i++) {
        const dietaryTags = vegetarianFavorites.nth(i).locator('[data-testid="recipe-dietary-tags"]');
        await expect(dietaryTags).toContainText(/vegetarian/i);
      }
      
      await takeTestScreenshot(page, 'favorites-dietary-filter.png', 'Favorites filtered by dietary preferences');
    });

    await test.step('Test sorting options', async () => {
      // Clear filters
      await page.click('[data-testid="clear-all-filters"]');
      await waitForNetworkIdle(page);
      
      // Test sort by date added (newest first)
      await page.selectOption('[data-testid="sort-favorites"]', 'newest');
      await waitForNetworkIdle(page);
      
      // Test sort by recipe name (alphabetical)
      await page.selectOption('[data-testid="sort-favorites"]', 'name-asc');
      await waitForNetworkIdle(page);
      
      const sortedFavorites = page.locator('[data-testid="favorite-recipe-item"] [data-testid="recipe-name"]');
      const firstRecipeName = await sortedFavorites.first().textContent();
      const secondRecipeName = await sortedFavorites.nth(1).textContent();
      
      // Verify alphabetical order
      expect(firstRecipeName?.localeCompare(secondRecipeName || '') || 0).toBeLessThanOrEqual(0);
      
      // Test sort by cooking time
      await page.selectOption('[data-testid="sort-favorites"]', 'cook-time');
      await waitForNetworkIdle(page);
      
      await takeTestScreenshot(page, 'favorites-sorted.png', 'Favorites with different sorting options');
    });

    await test.step('Test combined search and filters', async () => {
      // Search for specific term and apply filters
      await page.fill('[data-testid="favorites-search-input"]', 'salad');
      await page.click('[data-testid="filter-dietary"]');
      await page.check('[data-testid="filter-healthy"]');
      await page.click('[data-testid="apply-filters"]');
      await waitForNetworkIdle(page);
      
      const combinedResults = page.locator('[data-testid="favorite-recipe-item"]');
      const resultCount = await combinedResults.count();
      
      // Verify results match both search term and filter
      for (let i = 0; i < resultCount; i++) {
        const recipeName = await combinedResults.nth(i).locator('[data-testid="recipe-name"]').textContent();
        const dietaryTags = combinedResults.nth(i).locator('[data-testid="recipe-dietary-tags"]');
        
        expect(recipeName?.toLowerCase()).toContain('salad');
        await expect(dietaryTags).toContainText(/healthy/i);
      }
      
      await takeTestScreenshot(page, 'favorites-combined-filters.png', 'Combined search and filter results');
    });
  });
});