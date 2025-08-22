import { test, expect, Page } from '@playwright/test';
import { loginAsTrainer, takeTestScreenshot, waitForNetworkIdle } from '../../auth-helper';

/**
 * Trainer Favorites Management Tests
 * 
 * Comprehensive testing of favoriting system features specific to trainer users,
 * including professional collection creation, sharing, and customer engagement analytics.
 */

test.describe('Trainer Favorites Management', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await loginAsTrainer(page);
  });

  test('Trainer creates and shares recipe collections', async () => {
    await test.step('Navigate to trainer collections area', async () => {
      await page.goto('/trainer/collections');
      await waitForNetworkIdle(page);
      await expect(page).toHaveURL(/.*\/trainer\/collections.*/);
      
      await takeTestScreenshot(page, 'trainer-collections-page.png', 'Trainer collections management page');
    });

    await test.step('Create professional collection', async () => {
      await page.click('[data-testid="create-collection-button"]');
      await expect(page.locator('[data-testid="collection-modal"]')).toBeVisible();
      
      // Fill out professional collection details
      await page.fill('[data-testid="collection-name-input"]', 'High Protein Recipes');
      await page.fill('[data-testid="collection-description-input"]', 'Recipes optimized for muscle building and recovery');
      await page.fill('[data-testid="collection-tags-input"]', 'protein, muscle-building, recovery');
      
      // Set collection as public for sharing
      await page.check('[data-testid="make-collection-public"]');
      
      // Set target audience
      await page.selectOption('[data-testid="target-audience-select"]', 'athletes');
      
      // Set difficulty level
      await page.selectOption('[data-testid="difficulty-level-select"]', 'intermediate');
      
      await page.click('[data-testid="save-collection-button"]');
      await expect(page.locator('[data-testid="collection-created-toast"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'professional-collection-created.png', 'Professional collection created');
    });

    await test.step('Add multiple recipes to collection', async () => {
      // Navigate to recipe library
      await page.goto('/trainer/recipes');
      await waitForNetworkIdle(page);
      
      // Add recipes to the collection
      const recipeCards = page.locator('[data-testid="recipe-card"]');
      const recipesToAdd = 5;
      
      for (let i = 0; i < recipesToAdd; i++) {
        const recipeCard = recipeCards.nth(i);
        
        // Favorite the recipe first
        await recipeCard.locator('[data-testid="favorite-button"]').click();
        await expect(page.locator('[data-testid="favorite-success-toast"]')).toBeVisible();
        
        // Add to specific collection
        await recipeCard.locator('[data-testid="add-to-collection-button"]').click();
        await expect(page.locator('[data-testid="collection-selection-modal"]')).toBeVisible();
        
        await page.selectOption('[data-testid="collection-select"]', 'High Protein Recipes');
        await page.click('[data-testid="confirm-add-to-collection"]');
        await expect(page.locator('[data-testid="add-to-collection-success-toast"]')).toBeVisible();
      }
      
      await takeTestScreenshot(page, 'recipes-added-to-collection.png', 'Multiple recipes added to collection');
    });

    await test.step('Verify collection has correct recipes', async () => {
      await page.goto('/trainer/collections/high-protein-recipes');
      await waitForNetworkIdle(page);
      
      await expect(page.locator('[data-testid="collection-title"]')).toContainText('High Protein Recipes');
      await expect(page.locator('[data-testid="collection-recipe-item"]')).toHaveCount(5);
      
      // Verify each recipe has high protein content
      const recipeItems = page.locator('[data-testid="collection-recipe-item"]');
      for (let i = 0; i < 5; i++) {
        const proteinContent = recipeItems.nth(i).locator('[data-testid="protein-content"]');
        const proteinText = await proteinContent.textContent();
        const proteinValue = parseInt(proteinText?.replace(/\D/g, '') || '0');
        expect(proteinValue).toBeGreaterThan(15); // Should have substantial protein
      }
      
      await takeTestScreenshot(page, 'collection-with-recipes.png', 'Collection populated with high-protein recipes');
    });

    await test.step('Test sharing collection', async () => {
      await page.click('[data-testid="share-collection-button"]');
      await expect(page.locator('[data-testid="share-modal"]')).toBeVisible();
      
      // Verify share options
      await expect(page.locator('[data-testid="public-link-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="customer-share-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="trainer-share-section"]')).toBeVisible();
      
      // Copy public link
      await page.click('[data-testid="copy-public-link-button"]');
      await expect(page.locator('[data-testid="link-copied-message"]')).toBeVisible();
      
      // Test sharing with specific customers
      await page.click('[data-testid="share-with-customers-tab"]');
      
      // Select customers to share with
      const customerCheckboxes = page.locator('[data-testid="customer-checkbox"]');
      const customerCount = Math.min(3, await customerCheckboxes.count());
      
      for (let i = 0; i < customerCount; i++) {
        await customerCheckboxes.nth(i).check();
      }
      
      await page.fill('[data-testid="share-message-input"]', 'Check out these high-protein recipes perfect for your training goals!');
      await page.click('[data-testid="send-to-customers-button"]');
      
      await expect(page.locator('[data-testid="shared-with-customers-toast"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'collection-sharing.png', 'Collection sharing options and confirmation');
    });

    await test.step('Test collection permissions and access levels', async () => {
      await page.click('[data-testid="collection-settings-button"]');
      await expect(page.locator('[data-testid="collection-settings-modal"]')).toBeVisible();
      
      // Test different access levels
      await page.selectOption('[data-testid="access-level-select"]', 'view-only');
      await page.click('[data-testid="save-settings-button"]');
      
      // Test collaboration features
      await page.check('[data-testid="allow-comments"]');
      await page.check('[data-testid="allow-ratings"]');
      await page.check('[data-testid="allow-suggestions"]');
      await page.click('[data-testid="save-settings-button"]');
      
      await expect(page.locator('[data-testid="settings-saved-toast"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'collection-permissions.png', 'Collection permissions and collaboration settings');
    });
  });

  test('Trainer views customer engagement analytics', async () => {
    await test.step('Navigate to analytics dashboard', async () => {
      await page.goto('/trainer/analytics');
      await waitForNetworkIdle(page);
      await expect(page).toHaveURL(/.*\/trainer\/analytics.*/);
      
      await takeTestScreenshot(page, 'trainer-analytics-dashboard.png', 'Trainer analytics dashboard');
    });

    await test.step('Check engagement metrics overview', async () => {
      // Verify key metrics are displayed
      await expect(page.locator('[data-testid="total-favorites-metric"]')).toBeVisible();
      await expect(page.locator('[data-testid="active-customers-metric"]')).toBeVisible();
      await expect(page.locator('[data-testid="collection-views-metric"]')).toBeVisible();
      await expect(page.locator="recipe-completion-rate-metric"]')).toBeVisible();
      
      // Check that metrics have actual values
      const totalFavorites = await page.locator('[data-testid="total-favorites-value"]').textContent();
      expect(parseInt(totalFavorites || '0')).toBeGreaterThanOrEqual(0);
      
      const activeCustomers = await page.locator('[data-testid="active-customers-value"]').textContent();
      expect(parseInt(activeCustomers || '0')).toBeGreaterThanOrEqual(0);
      
      await takeTestScreenshot(page, 'engagement-metrics-overview.png', 'Engagement metrics overview');
    });

    await test.step('Check popular recipes chart', async () => {
      await expect(page.locator('[data-testid="popular-recipes-chart"]')).toBeVisible();
      
      // Verify chart has data
      const chartBars = page.locator('[data-testid="chart-bar"]');
      await expect(chartBars).toHaveCount.greaterThan(0);
      
      // Test chart interactions
      await chartBars.first().hover();
      await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible();
      
      // Test different chart views
      await page.click('[data-testid="chart-view-favorites"]');
      await waitForNetworkIdle(page);
      
      await page.click('[data-testid="chart-view-completions"]');
      await waitForNetworkIdle(page);
      
      await page.click('[data-testid="chart-view-ratings"]');
      await waitForNetworkIdle(page);
      
      await takeTestScreenshot(page, 'popular-recipes-chart.png', 'Popular recipes analytics chart');
    });

    await test.step('Check customer activity timeline', async () => {
      await expect(page.locator('[data-testid="customer-activity-timeline"]')).toBeVisible();
      
      // Verify timeline has activity entries
      const activityEntries = page.locator('[data-testid="activity-entry"]');
      await expect(activityEntries).toHaveCount.greaterThan(0);
      
      // Check different activity types
      const firstActivity = activityEntries.first();
      await expect(firstActivity.locator('[data-testid="activity-type"]')).toBeVisible();
      await expect(firstActivity.locator('[data-testid="activity-timestamp"]')).toBeVisible();
      await expect(firstActivity.locator('[data-testid="customer-name"]')).toBeVisible();
      
      // Test filtering by activity type
      await page.click('[data-testid="filter-activity-type"]');
      await page.check('[data-testid="filter-favorites"]');
      await page.click('[data-testid="apply-activity-filter"]');
      await waitForNetworkIdle(page);
      
      await takeTestScreenshot(page, 'customer-activity-timeline.png', 'Customer activity timeline');
    });

    await test.step('Filter analytics by time period', async () => {
      // Test different time period filters
      await page.selectOption('[data-testid="analytics-time-filter"]', 'last-7-days');
      await waitForNetworkIdle(page);
      
      await page.selectOption('[data-testid="analytics-time-filter"]', 'last-30-days');
      await waitForNetworkIdle(page);
      
      await page.selectOption('[data-testid="analytics-time-filter"]', 'last-3-months');
      await waitForNetworkIdle(page);
      
      // Custom date range
      await page.selectOption('[data-testid="analytics-time-filter"]', 'custom');
      await page.fill('[data-testid="start-date-input"]', '2025-01-01');
      await page.fill('[data-testid="end-date-input"]', '2025-08-22');
      await page.click('[data-testid="apply-date-range"]');
      await waitForNetworkIdle(page);
      
      await takeTestScreenshot(page, 'analytics-time-filters.png', 'Analytics with different time period filters');
    });

    await test.step('Export analytics report', async () => {
      await page.click('[data-testid="export-report-button"]');
      await expect(page.locator('[data-testid="export-options-modal"]')).toBeVisible();
      
      // Test different export formats
      await page.check('[data-testid="include-metrics"]');
      await page.check('[data-testid="include-charts"]');
      await page.check('[data-testid="include-customer-details"]');
      
      await page.selectOption('[data-testid="export-format"]', 'pdf');
      await page.click('[data-testid="generate-report-button"]');
      
      await expect(page.locator('[data-testid="export-processing-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="export-success-message"]')).toBeVisible({ timeout: 10000 });
      
      // Test CSV export
      await page.selectOption('[data-testid="export-format"]', 'csv');
      await page.click('[data-testid="generate-report-button"]');
      
      await expect(page.locator('[data-testid="export-success-message"]')).toBeVisible({ timeout: 10000 });
      
      await takeTestScreenshot(page, 'analytics-export.png', 'Analytics report export options');
    });
  });

  test('Customer engagement tracking and insights', async () => {
    await test.step('Navigate to customer engagement section', async () => {
      await page.goto('/trainer/customers/engagement');
      await waitForNetworkIdle(page);
      
      await takeTestScreenshot(page, 'customer-engagement-page.png', 'Customer engagement tracking page');
    });

    await test.step('View individual customer engagement profiles', async () => {
      // Select a customer to view detailed engagement
      const customerCards = page.locator('[data-testid="customer-card"]');
      await expect(customerCards).toHaveCount.greaterThan(0);
      
      const firstCustomer = customerCards.first();
      await firstCustomer.click();
      
      await expect(page.locator('[data-testid="customer-engagement-profile"]')).toBeVisible();
      
      // Check engagement metrics for this customer
      await expect(page.locator('[data-testid="customer-favorite-count"]')).toBeVisible();
      await expect(page.locator('[data-testid="customer-collection-count"]')).toBeVisible();
      await expect(page.locator('[data-testid="customer-activity-score"]')).toBeVisible();
      await expect(page.locator('[data-testid="customer-last-active"]')).toBeVisible();
      
      // Check favorite recipe categories breakdown
      await expect(page.locator('[data-testid="favorite-categories-chart"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'customer-engagement-profile.png', 'Individual customer engagement profile');
    });

    await test.step('Test customer engagement trends', async () => {
      await page.click('[data-testid="engagement-trends-tab"]');
      
      // Check weekly engagement trend
      await expect(page.locator('[data-testid="weekly-engagement-chart"]')).toBeVisible();
      
      // Check most engaged customers list
      await expect(page.locator('[data-testid="top-engaged-customers"]')).toBeVisible();
      const topCustomers = page.locator('[data-testid="top-customer-item"]');
      await expect(topCustomers).toHaveCount.greaterThan(0);
      
      // Check least engaged customers (need attention)
      await expect(page.locator('[data-testid="low-engagement-customers"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'engagement-trends.png', 'Customer engagement trends and insights');
    });

    await test.step('Test engagement alerts and notifications', async () => {
      await page.click('[data-testid="engagement-alerts-tab"]');
      
      // Check for different alert types
      await expect(page.locator('[data-testid="low-engagement-alerts"]')).toBeVisible();
      await expect(page.locator('[data-testid="milestone-alerts"]')).toBeVisible();
      await expect(page.locator('[data-testid="goal-completion-alerts"]')).toBeVisible();
      
      // Test creating custom alert
      await page.click('[data-testid="create-alert-button"]');
      await expect(page.locator('[data-testid="alert-creation-modal"]')).toBeVisible();
      
      await page.selectOption('[data-testid="alert-type"]', 'low-engagement');
      await page.fill('[data-testid="alert-threshold"]', '7'); // Days of inactivity
      await page.fill('[data-testid="alert-message"]', 'Haven\'t seen you in a while! Check out these new recipes.');
      
      await page.click('[data-testid="save-alert-button"]');
      await expect(page.locator('[data-testid="alert-created-toast"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'engagement-alerts.png', 'Engagement alerts and notifications setup');
    });
  });

  test('Collection analytics and performance tracking', async () => {
    await test.step('Navigate to collection analytics', async () => {
      await page.goto('/trainer/collections/analytics');
      await waitForNetworkIdle(page);
      
      await takeTestScreenshot(page, 'collection-analytics-page.png', 'Collection analytics dashboard');
    });

    await test.step('View collection performance metrics', async () => {
      // Check collection overview metrics
      await expect(page.locator('[data-testid="total-collections-metric"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-views-metric"]')).toBeVisible();
      await expect(page.locator('[data-testid="avg-rating-metric"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-shares-metric"]')).toBeVisible();
      
      // Check collection performance table
      await expect(page.locator('[data-testid="collection-performance-table"]')).toBeVisible();
      
      const collectionRows = page.locator('[data-testid="collection-row"]');
      await expect(collectionRows).toHaveCount.greaterThan(0);
      
      // Verify table columns
      const firstRow = collectionRows.first();
      await expect(firstRow.locator('[data-testid="collection-name"]')).toBeVisible();
      await expect(firstRow.locator('[data-testid="collection-views"]')).toBeVisible();
      await expect(firstRow.locator('[data-testid="collection-favorites"]')).toBeVisible();
      await expect(firstRow.locator('[data-testid="collection-rating"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'collection-performance-metrics.png', 'Collection performance metrics');
    });

    await test.step('Test collection sorting and filtering', async () => {
      // Sort by views (descending)
      await page.click('[data-testid="sort-by-views"]');
      await waitForNetworkIdle(page);
      
      // Sort by rating (descending)
      await page.click('[data-testid="sort-by-rating"]');
      await waitForNetworkIdle(page);
      
      // Filter by collection type
      await page.selectOption('[data-testid="filter-collection-type"]', 'public');
      await waitForNetworkIdle(page);
      
      // Filter by date range
      await page.fill('[data-testid="date-from-input"]', '2025-01-01');
      await page.fill('[data-testid="date-to-input"]', '2025-08-22');
      await page.click('[data-testid="apply-date-filter"]');
      await waitForNetworkIdle(page);
      
      await takeTestScreenshot(page, 'collection-analytics-filtered.png', 'Filtered collection analytics');
    });

    await test.step('View detailed collection insights', async () => {
      // Click on specific collection for detailed view
      const firstCollection = page.locator('[data-testid="collection-row"]').first();
      await firstCollection.locator('[data-testid="view-details-button"]').click();
      
      await expect(page.locator('[data-testid="collection-detail-analytics"]')).toBeVisible();
      
      // Check detailed metrics
      await expect(page.locator('[data-testid="daily-views-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="customer-engagement-breakdown"]')).toBeVisible();
      await expect(page.locator('[data-testid="recipe-popularity-chart"]')).toBeVisible();
      
      // Check customer feedback section
      await expect(page.locator('[data-testid="customer-reviews"]')).toBeVisible();
      await expect(page.locator('[data-testid="rating-distribution"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'detailed-collection-insights.png', 'Detailed collection analytics and insights');
    });

    await test.step('Test collection optimization recommendations', async () => {
      await page.click('[data-testid="optimization-recommendations-tab"]');
      
      // Check for automated recommendations
      await expect(page.locator('[data-testid="recommendations-list"]')).toBeVisible();
      
      const recommendations = page.locator('[data-testid="recommendation-item"]');
      const recommendationCount = await recommendations.count();
      
      if (recommendationCount > 0) {
        // Check first recommendation details
        const firstRecommendation = recommendations.first();
        await expect(firstRecommendation.locator('[data-testid="recommendation-type"]')).toBeVisible();
        await expect(firstRecommendation.locator('[data-testid="recommendation-description"]')).toBeVisible();
        await expect(firstRecommendation.locator('[data-testid="expected-impact"]')).toBeVisible();
        
        // Test implementing recommendation
        await firstRecommendation.locator('[data-testid="implement-recommendation"]').click();
        await expect(page.locator('[data-testid="implementation-modal"]')).toBeVisible();
      }
      
      await takeTestScreenshot(page, 'collection-optimization-recommendations.png', 'Collection optimization recommendations');
    });
  });

  test('Collaborative collection features', async () => {
    await test.step('Create collaborative collection', async () => {
      await page.goto('/trainer/collections');
      await waitForNetworkIdle(page);
      
      await page.click('[data-testid="create-collection-button"]');
      await page.fill('[data-testid="collection-name-input"]', 'Team Collaboration Collection');
      await page.fill('[data-testid="collection-description-input"]', 'A collection for trainer team collaboration');
      
      // Enable collaboration features
      await page.check('[data-testid="enable-collaboration"]');
      await page.check('[data-testid="allow-trainer-contributions"]');
      await page.check('[data-testid="allow-customer-suggestions"]');
      
      await page.click('[data-testid="save-collection-button"]');
      await expect(page.locator('[data-testid="collection-created-toast"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'collaborative-collection-created.png', 'Collaborative collection created');
    });

    await test.step('Invite collaborators', async () => {
      await page.click('[data-testid="manage-collaborators-button"]');
      await expect(page.locator('[data-testid="collaborators-modal"]')).toBeVisible();
      
      // Invite other trainers
      await page.fill('[data-testid="collaborator-email-input"]', 'trainer2@example.com');
      await page.selectOption('[data-testid="collaborator-role"]', 'contributor');
      await page.click('[data-testid="send-invitation-button"]');
      
      await expect(page.locator('[data-testid="invitation-sent-toast"]')).toBeVisible();
      
      // Set permissions for customers
      await page.click('[data-testid="customer-permissions-tab"]');
      await page.check('[data-testid="allow-recipe-suggestions"]');
      await page.check('[data-testid="allow-comments"]');
      await page.check('[data-testid="allow-ratings"]');
      
      await page.click('[data-testid="save-permissions-button"]');
      
      await takeTestScreenshot(page, 'collaborator-management.png', 'Collaborator management interface');
    });

    await test.step('Test collaboration workflow', async () => {
      // Navigate to collaboration activity feed
      await page.click('[data-testid="collaboration-activity-tab"]');
      
      await expect(page.locator('[data-testid="activity-feed"]')).toBeVisible();
      
      // Check for different activity types
      const activityItems = page.locator('[data-testid="activity-item"]');
      await expect(activityItems).toHaveCount.greaterThanOrEqual(0);
      
      // Test adding a recipe suggestion
      await page.click('[data-testid="suggest-recipe-button"]');
      await expect(page.locator('[data-testid="recipe-suggestion-modal"]')).toBeVisible();
      
      await page.fill('[data-testid="suggestion-notes"]', 'This recipe would be great for post-workout nutrition');
      await page.selectOption('[data-testid="suggested-recipe"]', 'Protein Recovery Smoothie');
      await page.click('[data-testid="submit-suggestion"]');
      
      await expect(page.locator('[data-testid="suggestion-submitted-toast"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'collaboration-workflow.png', 'Collection collaboration workflow');
    });
  });
});