import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin, takeTestScreenshot, waitForNetworkIdle } from '../../auth-helper';

/**
 * Admin Platform Analytics Tests
 * 
 * Comprehensive testing of platform-wide analytics and engagement monitoring
 * features available to admin users for overseeing the entire favoriting ecosystem.
 */

test.describe('Admin Platform Analytics', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await loginAsAdmin(page);
  });

  test('Admin monitors platform engagement overview', async () => {
    await test.step('Navigate to admin analytics dashboard', async () => {
      await page.goto('/admin/analytics');
      await waitForNetworkIdle(page);
      await expect(page).toHaveURL(/.*\/admin\/analytics.*/);
      
      await takeTestScreenshot(page, 'admin-analytics-dashboard.png', 'Admin analytics dashboard overview');
    });

    await test.step('Check platform-wide metrics', async () => {
      // Verify key platform metrics are displayed
      await expect(page.locator('[data-testid="total-users-metric"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-favorites-metric"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-collections-metric"]')).toBeVisible();
      await expect(page.locator('[data-testid="active-users-metric"]')).toBeVisible();
      
      // Verify engagement rate metrics
      await expect(page.locator('[data-testid="engagement-rate-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-retention-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="feature-adoption-chart"]')).toBeVisible();
      
      // Check that metrics have actual numerical values
      const totalUsers = await page.locator('[data-testid="total-users-value"]').textContent();
      const totalFavorites = await page.locator('[data-testid="total-favorites-value"]').textContent();
      
      expect(parseInt(totalUsers || '0')).toBeGreaterThanOrEqual(0);
      expect(parseInt(totalFavorites || '0')).toBeGreaterThanOrEqual(0);
      
      await takeTestScreenshot(page, 'platform-wide-metrics.png', 'Platform-wide engagement metrics');
    });

    await test.step('Test real-time dashboard updates', async () => {
      // Enable real-time monitoring
      await page.click('[data-testid="real-time-toggle"]');
      await expect(page.locator('[data-testid="real-time-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="real-time-status"]')).toContainText('Live');
      
      // Check auto-refresh settings
      await page.click('[data-testid="refresh-settings"]');
      await expect(page.locator('[data-testid="refresh-interval-modal"]')).toBeVisible();
      
      await page.selectOption('[data-testid="refresh-interval-select"]', '30'); // 30 seconds
      await page.click('[data-testid="save-refresh-settings"]');
      
      // Verify real-time updates are working
      await expect(page.locator('[data-testid="last-updated-timestamp"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'real-time-dashboard.png', 'Real-time dashboard monitoring enabled');
    });

    await test.step('Analyze user engagement patterns', async () => {
      // Navigate to engagement patterns section
      await page.click('[data-testid="engagement-patterns-tab"]');
      
      // Check daily active users chart
      await expect(page.locator('[data-testid="daily-active-users-chart"]')).toBeVisible();
      
      // Check engagement by user role breakdown
      await expect(page.locator('[data-testid="engagement-by-role-chart"]')).toBeVisible();
      
      // Test time period filters
      await page.selectOption('[data-testid="time-period-filter"]', 'last-7-days');
      await waitForNetworkIdle(page);
      
      await page.selectOption('[data-testid="time-period-filter"]', 'last-30-days');
      await waitForNetworkIdle(page);
      
      await page.selectOption('[data-testid="time-period-filter"]', 'last-quarter');
      await waitForNetworkIdle(page);
      
      // Check peak usage hours
      await expect(page.locator('[data-testid="peak-hours-chart"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'engagement-patterns-analysis.png', 'User engagement patterns analysis');
    });

    await test.step('Monitor feature adoption rates', async () => {
      await page.click('[data-testid="feature-adoption-tab"]');
      
      // Check favoriting feature adoption
      await expect(page.locator('[data-testid="favoriting-adoption-metric"]')).toBeVisible();
      const favoritingAdoption = await page.locator('[data-testid="favoriting-adoption-percentage"]').textContent();
      expect(parseFloat(favoritingAdoption?.replace('%', '') || '0')).toBeGreaterThanOrEqual(0);
      
      // Check collections feature adoption
      await expect(page.locator('[data-testid="collections-adoption-metric"]')).toBeVisible();
      
      // Check sharing feature adoption
      await expect(page.locator('[data-testid="sharing-adoption-metric"]')).toBeVisible();
      
      // Feature adoption timeline
      await expect(page.locator('[data-testid="adoption-timeline-chart"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'feature-adoption-rates.png', 'Feature adoption rate analytics');
    });
  });

  test('Admin manages trending recipes and content', async () => {
    await test.step('Navigate to trending content management', async () => {
      await page.goto('/admin/content/trending');
      await waitForNetworkIdle(page);
      
      await takeTestScreenshot(page, 'trending-content-management.png', 'Trending content management interface');
    });

    await test.step('Check trending recipes table', async () => {
      await expect(page.locator('[data-testid="trending-recipes-table"]')).toBeVisible();
      
      // Verify table headers
      await expect(page.locator('[data-testid="recipe-name-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="favorite-count-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="growth-rate-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="actions-header"]')).toBeVisible();
      
      // Check that trending recipes are loaded
      const trendingRows = page.locator('[data-testid="trending-recipe-row"]');
      await expect(trendingRows).toHaveCount.greaterThan(0);
      
      // Verify each row has required data
      const firstRow = trendingRows.first();
      await expect(firstRow.locator('[data-testid="recipe-name"]')).toBeVisible();
      await expect(firstRow.locator('[data-testid="favorite-count"]')).toBeVisible();
      await expect(firstRow.locator('[data-testid="growth-percentage"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'trending-recipes-table.png', 'Trending recipes management table');
    });

    await test.step('Test promoting recipe to featured', async () => {
      const firstTrendingRecipe = page.locator('[data-testid="trending-recipe-row"]').first();
      await firstTrendingRecipe.locator('[data-testid="promote-to-featured"]').click();
      
      await expect(page.locator('[data-testid="promotion-confirmation-modal"]')).toBeVisible();
      
      // Fill promotion details
      await page.fill('[data-testid="featured-duration-input"]', '7'); // Featured for 7 days
      await page.selectOption('[data-testid="featured-category"]', 'healthy-options');
      await page.fill('[data-testid="promotion-reason"]', 'High engagement and positive customer feedback');
      
      await page.click('[data-testid="confirm-promotion"]');
      await expect(page.locator('[data-testid="promotion-success-message"]')).toBeVisible();
      
      // Verify recipe appears in featured section
      await page.goto('/admin/content/featured');
      await waitForNetworkIdle(page);
      
      const featuredRecipes = page.locator('[data-testid="featured-recipe-item"]');
      await expect(featuredRecipes).toHaveCount.greaterThan(0);
      
      await takeTestScreenshot(page, 'recipe-promoted-to-featured.png', 'Recipe successfully promoted to featured');
    });

    await test.step('Test content moderation tools', async () => {
      await page.goto('/admin/content/moderation');
      await waitForNetworkIdle(page);
      
      // Check moderation queue
      await expect(page.locator('[data-testid="moderation-queue"]')).toBeVisible();
      
      // Check reported content
      await expect(page.locator('[data-testid="reported-content-section"]')).toBeVisible();
      const reportedItems = page.locator('[data-testid="reported-item"]');
      
      if (await reportedItems.count() > 0) {
        const firstReportedItem = reportedItems.first();
        
        // Review reported content
        await firstReportedItem.locator('[data-testid="review-button"]').click();
        await expect(page.locator('[data-testid="content-review-modal"]')).toBeVisible();
        
        // Check content details
        await expect(page.locator('[data-testid="reported-content-preview"]')).toBeVisible();
        await expect(page.locator('[data-testid="report-reason"]')).toBeVisible();
        await expect(page.locator('[data-testid="reporter-info"]')).toBeVisible();
        
        // Take moderation action
        await page.click('[data-testid="approve-content"]');
        await page.fill('[data-testid="moderation-notes"]', 'Content reviewed and approved - no policy violations found');
        await page.click('[data-testid="save-moderation-decision"]');
        
        await expect(page.locator('[data-testid="moderation-success-toast"]')).toBeVisible();
      }
      
      await takeTestScreenshot(page, 'content-moderation-tools.png', 'Content moderation and review tools');
    });

    await test.step('Manage featured content scheduling', async () => {
      await page.goto('/admin/content/featured');
      await waitForNetworkIdle(page);
      
      // Check featured content calendar
      await expect(page.locator('[data-testid="featured-content-calendar"]')).toBeVisible();
      
      // Schedule new featured content
      await page.click('[data-testid="schedule-featured-content"]');
      await expect(page.locator('[data-testid="scheduling-modal"]')).toBeVisible();
      
      await page.selectOption('[data-testid="content-type"]', 'recipe');
      await page.selectOption('[data-testid="recipe-select"]', '1'); // Select first available recipe
      
      // Set scheduling details
      await page.fill('[data-testid="start-date-input"]', '2025-08-25');
      await page.fill('[data-testid="end-date-input"]', '2025-09-01');
      await page.selectOption('[data-testid="featured-position"]', 'hero');
      
      await page.click('[data-testid="schedule-content"]');
      await expect(page.locator('[data-testid="scheduling-success-toast"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'featured-content-scheduling.png', 'Featured content scheduling interface');
    });
  });

  test('Admin analyzes user behavior and patterns', async () => {
    await test.step('Navigate to user behavior analytics', async () => {
      await page.goto('/admin/analytics/user-behavior');
      await waitForNetworkIdle(page);
      
      await takeTestScreenshot(page, 'user-behavior-analytics.png', 'User behavior analytics dashboard');
    });

    await test.step('Analyze favoriting patterns', async () => {
      // Check favoriting behavior charts
      await expect(page.locator('[data-testid="favorites-per-user-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="favoriting-frequency-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="favorite-categories-distribution"]')).toBeVisible();
      
      // Test behavior segmentation
      await page.click('[data-testid="segment-users-button"]');
      await expect(page.locator('[data-testid="user-segmentation-modal"]')).toBeVisible();
      
      // Create user segments based on favoriting behavior
      await page.selectOption('[data-testid="segment-criteria"]', 'favorites-count');
      await page.fill('[data-testid="segment-threshold"]', '10');
      await page.fill('[data-testid="segment-name"]', 'Power Users');
      
      await page.click('[data-testid="create-segment"]');
      await expect(page.locator('[data-testid="segment-created-toast"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'favoriting-behavior-analysis.png', 'User favoriting behavior patterns');
    });

    await test.step('Analyze collection usage patterns', async () => {
      await page.click('[data-testid="collection-behavior-tab"]');
      
      // Check collection creation trends
      await expect(page.locator('[data-testid="collection-creation-trend"]')).toBeVisible();
      
      // Check collection size distribution
      await expect(page.locator('[data-testid="collection-size-distribution"]')).toBeVisible();
      
      // Check sharing behavior
      await expect(page.locator('[data-testid="sharing-behavior-chart"]')).toBeVisible();
      
      // Analyze most popular collection types
      await expect(page.locator('[data-testid="popular-collection-types"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'collection-usage-patterns.png', 'Collection usage and behavior patterns');
    });

    await test.step('Generate user journey insights', async () => {
      await page.click('[data-testid="user-journey-tab"]');
      
      // Check user journey flow visualization
      await expect(page.locator('[data-testid="user-journey-flow"]')).toBeVisible();
      
      // Check conversion funnel
      await expect(page.locator('[data-testid="engagement-funnel"]')).toBeVisible();
      
      // Check drop-off points analysis
      await expect(page.locator('[data-testid="drop-off-analysis"]')).toBeVisible();
      
      // Test journey optimization recommendations
      await page.click('[data-testid="optimization-recommendations"]');
      await expect(page.locator('[data-testid="journey-optimization-panel"]')).toBeVisible();
      
      const recommendations = page.locator('[data-testid="optimization-recommendation"]');
      if (await recommendations.count() > 0) {
        const firstRecommendation = recommendations.first();
        await expect(firstRecommendation.locator('[data-testid="recommendation-title"]')).toBeVisible();
        await expect(firstRecommendation.locator('[data-testid="expected-impact"]')).toBeVisible();
      }
      
      await takeTestScreenshot(page, 'user-journey-insights.png', 'User journey analysis and optimization insights');
    });
  });

  test('Admin configures platform-wide favoriting settings', async () => {
    await test.step('Navigate to platform configuration', async () => {
      await page.goto('/admin/settings/favorites');
      await waitForNetworkIdle(page);
      
      await takeTestScreenshot(page, 'favorites-platform-settings.png', 'Platform favoriting configuration settings');
    });

    await test.step('Configure favoriting limits and rules', async () => {
      // Set maximum favorites per user
      await page.fill('[data-testid="max-favorites-per-user"]', '1000');
      
      // Set maximum collections per user
      await page.fill('[data-testid="max-collections-per-user"]', '50');
      
      // Set maximum recipes per collection
      await page.fill('[data-testid="max-recipes-per-collection"]', '200');
      
      // Configure auto-cleanup settings
      await page.check('[data-testid="enable-auto-cleanup"]');
      await page.fill('[data-testid="inactive-period-days"]', '365'); // Clean up after 1 year of inactivity
      
      await page.click('[data-testid="save-limits-settings"]');
      await expect(page.locator('[data-testid="settings-saved-toast"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'favoriting-limits-configured.png', 'Favoriting limits and rules configured');
    });

    await test.step('Configure sharing and privacy settings', async () => {
      await page.click('[data-testid="sharing-privacy-tab"]');
      
      // Default privacy settings for new collections
      await page.selectOption('[data-testid="default-collection-privacy"]', 'private');
      
      // Enable/disable sharing features
      await page.check('[data-testid="allow-public-sharing"]');
      await page.check('[data-testid="allow-trainer-sharing"]');
      await page.check('[data-testid="allow-customer-sharing"]');
      
      // Configure sharing limitations
      await page.fill('[data-testid="max-shares-per-day"]', '10');
      
      // Content moderation for shared collections
      await page.check('[data-testid="moderate-shared-collections"]');
      
      await page.click('[data-testid="save-sharing-settings"]');
      await expect(page.locator('[data-testid="settings-saved-toast"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'sharing-privacy-settings.png', 'Sharing and privacy settings configured');
    });

    await test.step('Configure recommendation engine settings', async () => {
      await page.click('[data-testid="recommendations-tab"]');
      
      // Algorithm configuration
      await page.selectOption('[data-testid="recommendation-algorithm"]', 'collaborative-filtering');
      
      // Recommendation frequency
      await page.fill('[data-testid="recommendations-per-user"]', '20');
      
      // Update frequency
      await page.selectOption('[data-testid="recommendation-update-frequency"]', 'daily');
      
      // Personalization factors
      await page.fill('[data-testid="dietary-preference-weight"]', '0.4');
      await page.fill('[data-testid="past-favorites-weight"]', '0.3');
      await page.fill('[data-testid="trending-weight"]', '0.3');
      
      // Quality thresholds
      await page.fill('[data-testid="min-recipe-rating"]', '3.5');
      await page.fill('[data-testid="min-favorite-count"]', '5');
      
      await page.click('[data-testid="save-recommendations-settings"]');
      await expect(page.locator('[data-testid="settings-saved-toast"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'recommendation-engine-settings.png', 'Recommendation engine configuration');
    });

    await test.step('Test settings validation and rollback', async () => {
      // Test invalid settings
      await page.fill('[data-testid="max-favorites-per-user"]', '-1');
      await page.click('[data-testid="save-limits-settings"]');
      
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="validation-error"]')).toContainText('must be positive');
      
      // Test settings backup and restore
      await page.click('[data-testid="backup-current-settings"]');
      await expect(page.locator('[data-testid="backup-created-toast"]')).toBeVisible();
      
      // Make changes and then rollback
      await page.fill('[data-testid="max-favorites-per-user"]', '500');
      await page.click('[data-testid="save-limits-settings"]');
      
      await page.click('[data-testid="restore-from-backup"]');
      await expect(page.locator('[data-testid="restore-confirmation-modal"]')).toBeVisible();
      await page.click('[data-testid="confirm-restore"]');
      
      await expect(page.locator('[data-testid="settings-restored-toast"]')).toBeVisible();
      
      // Verify settings were restored
      const restoredValue = await page.locator('[data-testid="max-favorites-per-user"]').inputValue();
      expect(restoredValue).toBe('1000');
      
      await takeTestScreenshot(page, 'settings-validation-rollback.png', 'Settings validation and rollback functionality');
    });
  });

  test('Admin generates comprehensive platform reports', async () => {
    await test.step('Navigate to platform reporting', async () => {
      await page.goto('/admin/reports');
      await waitForNetworkIdle(page);
      
      await takeTestScreenshot(page, 'platform-reporting-dashboard.png', 'Platform reporting dashboard');
    });

    await test.step('Generate engagement summary report', async () => {
      await page.click('[data-testid="create-new-report"]');
      await expect(page.locator('[data-testid="report-creation-modal"]')).toBeVisible();
      
      // Configure engagement report
      await page.selectOption('[data-testid="report-type"]', 'engagement-summary');
      await page.fill('[data-testid="report-name"]', 'Monthly Engagement Summary - August 2025');
      
      // Set date range
      await page.fill('[data-testid="report-start-date"]', '2025-08-01');
      await page.fill('[data-testid="report-end-date"]', '2025-08-31');
      
      // Select metrics to include
      await page.check('[data-testid="include-user-metrics"]');
      await page.check('[data-testid="include-favorites-metrics"]');
      await page.check('[data-testid="include-collections-metrics"]');
      await page.check('[data-testid="include-engagement-trends"]');
      
      // Set report format
      await page.selectOption('[data-testid="report-format"]', 'pdf');
      
      await page.click('[data-testid="generate-report"]');
      await expect(page.locator('[data-testid="report-generation-started"]')).toBeVisible();
      
      // Wait for report completion
      await expect(page.locator('[data-testid="report-ready-notification"]')).toBeVisible({ timeout: 30000 });
      
      await takeTestScreenshot(page, 'engagement-report-generated.png', 'Engagement summary report generated');
    });

    await test.step('Generate user behavior analysis report', async () => {
      await page.click('[data-testid="create-new-report"]');
      
      // Configure behavior analysis report
      await page.selectOption('[data-testid="report-type"]', 'user-behavior-analysis');
      await page.fill('[data-testid="report-name"]', 'User Behavior Analysis - Q3 2025');
      
      // Set comprehensive date range
      await page.fill('[data-testid="report-start-date"]', '2025-07-01');
      await page.fill('[data-testid="report-end-date"]', '2025-09-30');
      
      // Select advanced analytics
      await page.check('[data-testid="include-user-segments"]');
      await page.check('[data-testid="include-journey-analysis"]');
      await page.check('[data-testid="include-retention-analysis"]');
      await page.check('[data-testid="include-churn-predictions"]');
      
      // Set detailed format
      await page.selectOption('[data-testid="report-format"]', 'excel');
      
      await page.click('[data-testid="generate-report"]');
      
      // Monitor report progress
      await expect(page.locator('[data-testid="report-progress-bar"]')).toBeVisible();
      await expect(page.locator('[data-testid="report-ready-notification"]')).toBeVisible({ timeout: 45000 });
      
      await takeTestScreenshot(page, 'behavior-analysis-report-generated.png', 'User behavior analysis report generated');
    });

    await test.step('Schedule automated reporting', async () => {
      await page.click('[data-testid="automated-reports-tab"]');
      
      // Create weekly engagement report schedule
      await page.click('[data-testid="create-automated-report"]');
      await expect(page.locator('[data-testid="automation-setup-modal"]')).toBeVisible();
      
      await page.selectOption('[data-testid="report-type"]', 'weekly-engagement');
      await page.fill('[data-testid="report-name-template"]', 'Weekly Engagement Report - Week {week_number}');
      
      // Set schedule
      await page.selectOption('[data-testid="frequency"]', 'weekly');
      await page.selectOption('[data-testid="day-of-week"]', 'monday');
      await page.fill('[data-testid="time"]', '09:00');
      
      // Set recipients
      await page.fill('[data-testid="email-recipients"]', 'admin@evofitmeals.com, manager@evofitmeals.com');
      
      // Configure delivery options
      await page.check('[data-testid="attach-pdf"]');
      await page.check('[data-testid="attach-csv"]');
      await page.check('[data-testid="include-summary-email"]');
      
      await page.click('[data-testid="save-automated-report"]');
      await expect(page.locator('[data-testid="automation-created-toast"]')).toBeVisible();
      
      // Verify automated report appears in schedule
      await expect(page.locator('[data-testid="automated-report-item"]')).toContainText('Weekly Engagement Report');
      
      await takeTestScreenshot(page, 'automated-reporting-scheduled.png', 'Automated reporting schedule configured');
    });

    await test.step('Export comprehensive data exports', async () => {
      await page.click('[data-testid="data-exports-tab"]');
      
      // Create comprehensive data export
      await page.click('[data-testid="create-data-export"]');
      await expect(page.locator('[data-testid="data-export-modal"]')).toBeVisible();
      
      // Select data tables to export
      await page.check('[data-testid="export-users-table"]');
      await page.check('[data-testid="export-recipes-table"]');
      await page.check('[data-testid="export-favorites-table"]');
      await page.check('[data-testid="export-collections-table"]');
      await page.check('[data-testid="export-analytics-table"]');
      
      // Set export format and options
      await page.selectOption('[data-testid="export-format"]', 'csv');
      await page.check('[data-testid="include-relationships"]');
      await page.check('[data-testid="anonymize-personal-data"]');
      
      // Set date range for time-series data
      await page.fill('[data-testid="export-start-date"]', '2025-01-01');
      await page.fill('[data-testid="export-end-date"]', '2025-08-31');
      
      await page.click('[data-testid="start-export"]');
      await expect(page.locator('[data-testid="export-processing"]')).toBeVisible();
      
      // Wait for export completion
      await expect(page.locator('[data-testid="export-ready-notification"]')).toBeVisible({ timeout: 60000 });
      
      // Verify download link
      await expect(page.locator('[data-testid="download-export-link"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'comprehensive-data-export.png', 'Comprehensive data export completed');
    });
  });
});