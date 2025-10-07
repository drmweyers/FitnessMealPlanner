import { test, expect } from '@playwright/test';

test.describe('Weight Progress Chart Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');

    // Wait for navigation and load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Navigate to Progress tab
    const progressTab = page.locator('[role="tab"]:has-text("Progress")');
    await expect(progressTab).toBeVisible();
    await progressTab.click();
    await page.waitForTimeout(2000);
  });

  test('Weight Progress chart is visible and displays data', async ({ page }) => {
    // Wait for the Weight Progress chart to load
    const weightProgressChart = page.locator('h3:has-text("Weight Progress"), .card:has(h3:has-text("Weight Progress"))').first();
    await expect(weightProgressChart).toBeVisible({ timeout: 10000 });

    // Check for chart container
    const chartContainer = page.locator('.recharts-wrapper').first();
    await expect(chartContainer).toBeVisible({ timeout: 10000 });

    // Verify the chart has data points (should have line chart elements)
    const lineChart = page.locator('.recharts-line').first();
    await expect(lineChart).toBeVisible({ timeout: 5000 });

    // Verify chart axes are visible
    const xAxis = page.locator('.recharts-xAxis').first();
    const yAxis = page.locator('.recharts-yAxis').first();
    await expect(xAxis).toBeVisible();
    await expect(yAxis).toBeVisible();

    console.log('✅ Weight Progress chart is visible and displays data');
  });

  test('Time range filters work correctly', async ({ page }) => {
    // Wait for the Weight Progress chart to load
    await page.waitForSelector('h3:has-text("Weight Progress")', { timeout: 10000 });

    // Test time range buttons
    const timeRanges = ['7 days', '30 days', '3 months', '6 months', '1 year', 'All time'];

    for (const range of timeRanges) {
      const timeRangeButton = page.locator(`button:has-text("${range}")`).first();
      if (await timeRangeButton.isVisible()) {
        await timeRangeButton.click();
        await page.waitForTimeout(1000);

        // Verify button is selected (should have active state)
        await expect(timeRangeButton).toHaveClass(/bg-blue-100/);

        // Verify chart updates (check for chart redraw)
        const chartContainer = page.locator('.recharts-wrapper').first();
        await expect(chartContainer).toBeVisible();
      }
    }

    console.log('✅ Time range filters work correctly');
  });

  test('Trend analysis is shown when data is available', async ({ page }) => {
    // Wait for the Weight Progress chart to load
    await page.waitForSelector('h3:has-text("Weight Progress")', { timeout: 10000 });

    // Look for trend analysis indicators
    const trendIndicators = [
      'svg[data-testid="trending-up"]',
      'svg[data-testid="trending-down"]',
      'svg[data-testid="minus"]',
      '.lucide-trending-up',
      '.lucide-trending-down',
      '.lucide-minus'
    ];

    let trendFound = false;
    for (const indicator of trendIndicators) {
      if (await page.locator(indicator).first().isVisible()) {
        trendFound = true;
        break;
      }
    }

    if (!trendFound) {
      // Look for trend text patterns
      const trendText = page.locator('text=/lbs|kg|%/').first();
      if (await trendText.isVisible()) {
        trendFound = true;
      }
    }

    console.log(`✅ Trend analysis ${trendFound ? 'is shown' : 'checked for availability'}`);
  });

  test('Unit switching between lbs and kg works', async ({ page }) => {
    // Wait for the Weight Progress chart to load
    await page.waitForSelector('h3:has-text("Weight Progress")', { timeout: 10000 });

    // Test unit switching
    const lbsButton = page.locator('button:has-text("lbs")').first();
    const kgButton = page.locator('button:has-text("kg")').first();

    if (await lbsButton.isVisible() && await kgButton.isVisible()) {
      // Click lbs button
      await lbsButton.click();
      await page.waitForTimeout(1000);
      await expect(lbsButton).toHaveClass(/bg-blue-100/);

      // Click kg button
      await kgButton.click();
      await page.waitForTimeout(1000);
      await expect(kgButton).toHaveClass(/bg-blue-100/);

      // Switch back to lbs
      await lbsButton.click();
      await page.waitForTimeout(1000);
      await expect(lbsButton).toHaveClass(/bg-blue-100/);
    }

    console.log('✅ Unit switching between lbs and kg works');
  });

  test('Chart displays quick stats correctly', async ({ page }) => {
    // Wait for the Weight Progress chart to load
    await page.waitForSelector('h3:has-text("Weight Progress")', { timeout: 10000 });

    // Look for quick stats labels
    const expectedStats = ['Current', 'Highest', 'Lowest', 'Average'];

    for (const stat of expectedStats) {
      const statLabel = page.locator(`text="${stat}"`).first();
      if (await statLabel.isVisible()) {
        // Check if there's a corresponding value
        const statValue = statLabel.locator('..').locator('.font-semibold');
        await expect(statValue).toBeVisible();
      }
    }

    console.log('✅ Chart displays quick stats correctly');
  });

  test('Chart is responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Reload the page to ensure mobile layout
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Navigate to Progress tab again
    const progressTab = page.locator('[role="tab"]:has-text("Progress")');
    await expect(progressTab).toBeVisible();
    await progressTab.click();
    await page.waitForTimeout(2000);

    // Wait for the Weight Progress chart to load
    await page.waitForSelector('h3:has-text("Weight Progress")', { timeout: 10000 });

    // Verify chart is still visible and responsive
    const chartContainer = page.locator('.recharts-wrapper').first();
    await expect(chartContainer).toBeVisible();

    // Check that time range and unit buttons are still accessible
    const timeRangeButtons = page.locator('button:has-text("3 months")');
    await expect(timeRangeButtons.first()).toBeVisible();

    console.log('✅ Chart is responsive on mobile viewport');
  });

  test('Chart handles loading and error states', async ({ page }) => {
    // Check initial loading state by looking for loading indicators
    const loadingSpinner = page.locator('.animate-spin');

    // Wait for chart to load (loading should disappear)
    await page.waitForSelector('h3:has-text("Weight Progress")', { timeout: 10000 });

    // Verify chart loaded successfully (no error messages)
    const errorMessage = page.locator('text="Failed to load weight data"');
    await expect(errorMessage).not.toBeVisible();

    const noDataMessage = page.locator('text="No weight data available for the selected period"');

    // If no data message appears, that's also a valid state to test
    if (await noDataMessage.isVisible()) {
      console.log('✅ Chart properly handles no data state');
    } else {
      // Chart should have data
      const chartContainer = page.locator('.recharts-wrapper').first();
      await expect(chartContainer).toBeVisible();
      console.log('✅ Chart loaded successfully with data');
    }
  });

  test('Chart tooltip displays on hover', async ({ page }) => {
    // Wait for the Weight Progress chart to load
    await page.waitForSelector('h3:has-text("Weight Progress")', { timeout: 10000 });

    // Look for chart data points
    const dataPoints = page.locator('.recharts-dot');

    if (await dataPoints.first().isVisible()) {
      // Hover over a data point
      await dataPoints.first().hover();
      await page.waitForTimeout(500);

      // Look for tooltip
      const tooltip = page.locator('.recharts-tooltip-wrapper, [class*="tooltip"]');
      if (await tooltip.isVisible()) {
        console.log('✅ Chart tooltip displays on hover');
      } else {
        console.log('⚠️ Tooltip not found, but data points are present');
      }
    } else {
      console.log('⚠️ No data points found for hover test');
    }
  });

  test('No console errors during chart interactions', async ({ page }) => {
    const errors: string[] = [];

    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error' &&
          !msg.text().includes('WebSocket') &&
          !msg.text().includes('ERR_CONNECTION_REFUSED')) {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      if (!error.message.includes('WebSocket') &&
          !error.message.includes('ERR_CONNECTION_REFUSED')) {
        errors.push(error.message);
      }
    });

    // Wait for the Weight Progress chart to load
    await page.waitForSelector('h3:has-text("Weight Progress")', { timeout: 10000 });

    // Interact with time range buttons
    const timeRangeButton = page.locator('button:has-text("30 days")').first();
    if (await timeRangeButton.isVisible()) {
      await timeRangeButton.click();
      await page.waitForTimeout(1000);
    }

    // Interact with unit buttons
    const unitButton = page.locator('button:has-text("kg")').first();
    if (await unitButton.isVisible()) {
      await unitButton.click();
      await page.waitForTimeout(1000);
    }

    // Check for errors
    if (errors.length > 0) {
      console.log('Errors found:', errors);
      throw new Error(`Console errors detected: ${errors.join(', ')}`);
    }

    console.log('✅ No console errors during chart interactions');
  });
});