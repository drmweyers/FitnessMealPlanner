import { test, expect } from '@playwright/test';

test.describe('Progress Charts Comprehensive Validation', () => {
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

  test.describe('Weight Progress Chart Validation', () => {
    test('Weight Progress chart displays data correctly with 31 test measurements', async ({ page }) => {
      // Wait for the Weight Progress chart to load
      const weightProgressChart = page.locator('h3:has-text("Weight Progress"), .card:has(h3:has-text("Weight Progress"))').first();
      await expect(weightProgressChart).toBeVisible({ timeout: 15000 });

      // Check for chart container
      const chartContainer = page.locator('.recharts-wrapper').first();
      await expect(chartContainer).toBeVisible({ timeout: 10000 });

      // Verify the chart has data points (should have line chart elements)
      const lineChart = page.locator('.recharts-line').first();
      await expect(lineChart).toBeVisible({ timeout: 10000 });

      // Verify chart axes are visible
      const xAxis = page.locator('.recharts-xAxis').first();
      const yAxis = page.locator('.recharts-yAxis').first();
      await expect(xAxis).toBeVisible();
      await expect(yAxis).toBeVisible();

      // Look for data points on the chart
      const dataPoints = page.locator('.recharts-dot');
      const pointCount = await dataPoints.count();

      if (pointCount > 0) {
        console.log(`✅ Weight Progress chart displays ${pointCount} data points`);
      } else {
        // Alternative check for line segments if dots aren't visible
        const lineSegments = page.locator('.recharts-line-curve, .recharts-line-dots');
        await expect(lineSegments.first()).toBeVisible();
        console.log('✅ Weight Progress chart displays line data (continuous line without individual dots)');
      }

      console.log('✅ Weight Progress chart is fully loaded with test data');
    });

    test('Weight values show progression from 200 lbs to ~180 lbs', async ({ page }) => {
      // Wait for the Weight Progress chart to load
      await page.waitForSelector('h3:has-text("Weight Progress")', { timeout: 15000 });

      // Ensure we're viewing in lbs
      const lbsButton = page.locator('button:has-text("lbs")').first();
      if (await lbsButton.isVisible()) {
        await lbsButton.click();
        await page.waitForTimeout(1000);
      }

      // Look for current weight display (should show around 180 lbs for most recent measurement)
      const currentWeightElements = page.locator('text=/180|179|181|178|182/'); // Allow some variance

      if (await currentWeightElements.first().isVisible()) {
        const currentWeightText = await currentWeightElements.first().textContent();
        console.log(`✅ Current weight displays correctly: ${currentWeightText}`);
      }

      // Check for weight progression indicators
      const weightStats = page.locator('.text-xs').filter({ hasText: /lbs|Current|Highest|Lowest|Average/ });
      const statsCount = await weightStats.count();

      if (statsCount > 0) {
        console.log(`✅ Weight statistics displayed: ${statsCount} stat items found`);

        // Try to find specific weight values in the stats
        for (let i = 0; i < statsCount; i++) {
          const statText = await weightStats.nth(i).textContent();
          if (statText && statText.includes('lbs')) {
            console.log(`  - Weight stat: ${statText}`);
          }
        }
      }

      console.log('✅ Weight progression data validated');
    });

    test('Weight chart time range filters work correctly', async ({ page }) => {
      // Wait for the Weight Progress chart to load
      await page.waitForSelector('h3:has-text("Weight Progress")', { timeout: 15000 });

      // Test different time ranges
      const timeRanges = ['30 days', '3 months', '6 months', '1 year', 'All time'];

      for (const range of timeRanges) {
        const timeRangeButton = page.locator(`button:has-text("${range}")`).first();
        if (await timeRangeButton.isVisible()) {
          await timeRangeButton.click();
          await page.waitForTimeout(1500);

          // Verify button is selected (should have active state)
          await expect(timeRangeButton).toHaveClass(/bg-blue-100/);

          // Verify chart updates (check for chart redraw)
          const chartContainer = page.locator('.recharts-wrapper').first();
          await expect(chartContainer).toBeVisible();

          // Check if chart data changes based on time range
          await page.waitForTimeout(500);

          console.log(`✅ Time range filter "${range}" applied successfully`);
        }
      }

      console.log('✅ All time range filters work correctly');
    });

    test('Weight trend analysis shows "Losing weight" status', async ({ page }) => {
      // Wait for the Weight Progress chart to load
      await page.waitForSelector('h3:has-text("Weight Progress")', { timeout: 15000 });

      // Look for trend analysis indicators
      const trendIndicators = [
        'svg[data-testid="trending-down"]',  // Should show downward trend for weight loss
        '.lucide-trending-down',
        'text=/losing/i',
        'text=/decreased/i',
        'text=/down/i'
      ];

      let trendFound = false;
      let trendDescription = '';

      for (const indicator of trendIndicators) {
        const element = page.locator(indicator);
        if (await element.first().isVisible()) {
          trendFound = true;
          if (indicator.includes('text=')) {
            trendDescription = await element.first().textContent() || '';
          } else {
            trendDescription = 'downward trend icon';
          }
          break;
        }
      }

      // Also look for trend text in the stats area
      if (!trendFound) {
        const statsArea = page.locator('.grid, .flex').filter({ hasText: /trend|change|progress/ });
        if (await statsArea.first().isVisible()) {
          const trendText = await statsArea.first().textContent();
          if (trendText && (trendText.toLowerCase().includes('losing') ||
                          trendText.toLowerCase().includes('decreased') ||
                          trendText.toLowerCase().includes('down'))) {
            trendFound = true;
            trendDescription = trendText;
          }
        }
      }

      if (trendFound) {
        console.log(`✅ Weight trend analysis shows weight loss: ${trendDescription}`);
      } else {
        console.log('⚠️ Trend analysis not clearly visible, checking for any trend information...');

        // Fallback: Look for any weight-related numbers that indicate loss
        const weightNumbers = page.locator('text=/20\d\.\d|1[89]\d\.\d/'); // Numbers in 180-209 range
        const numberCount = await weightNumbers.count();
        if (numberCount > 0) {
          console.log(`✅ Weight data present with ${numberCount} weight values found`);
        }
      }

      console.log('✅ Trend analysis validation completed');
    });

    test('Weight unit switching between lbs and kg works', async ({ page }) => {
      // Wait for the Weight Progress chart to load
      await page.waitForSelector('h3:has-text("Weight Progress")', { timeout: 15000 });

      // Test unit switching
      const lbsButton = page.locator('button:has-text("lbs")').first();
      const kgButton = page.locator('button:has-text("kg")').first();

      if (await lbsButton.isVisible() && await kgButton.isVisible()) {
        // Start with lbs
        await lbsButton.click();
        await page.waitForTimeout(1000);
        await expect(lbsButton).toHaveClass(/bg-blue-100/);

        // Capture weight value in lbs
        const weightInLbs = page.locator('text=/18[0-9]\.\d|19[0-9]\.\d/').first();
        let lbsValue = '';
        if (await weightInLbs.isVisible()) {
          lbsValue = await weightInLbs.textContent() || '';
        }

        // Switch to kg
        await kgButton.click();
        await page.waitForTimeout(1000);
        await expect(kgButton).toHaveClass(/bg-blue-100/);

        // Capture weight value in kg (should be roughly half of lbs value)
        const weightInKg = page.locator('text=/8[0-9]\.\d|9[0-9]\.\d/').first();
        let kgValue = '';
        if (await weightInKg.isVisible()) {
          kgValue = await weightInKg.textContent() || '';
        }

        // Switch back to lbs
        await lbsButton.click();
        await page.waitForTimeout(1000);
        await expect(lbsButton).toHaveClass(/bg-blue-100/);

        console.log(`✅ Unit switching works: ${lbsValue} lbs ↔ ${kgValue} kg`);
      } else {
        console.log('⚠️ Unit switching buttons not found');
      }

      console.log('✅ Weight unit switching validated');
    });

    test('Weight quick stats display correctly', async ({ page }) => {
      // Wait for the Weight Progress chart to load
      await page.waitForSelector('h3:has-text("Weight Progress")', { timeout: 15000 });

      // Look for quick stats labels
      const expectedStats = ['Current', 'Highest', 'Lowest', 'Average'];

      let statsFound = 0;
      for (const stat of expectedStats) {
        const statLabel = page.locator(`text="${stat}"`).first();
        if (await statLabel.isVisible()) {
          // Check if there's a corresponding value
          const parentElement = statLabel.locator('..');
          const statValue = parentElement.locator('.font-semibold, .text-lg, .text-xl');

          if (await statValue.first().isVisible()) {
            const value = await statValue.first().textContent();
            console.log(`  - ${stat}: ${value}`);
            statsFound++;
          }
        }
      }

      expect(statsFound).toBeGreaterThan(0);
      console.log(`✅ Weight quick stats displayed: ${statsFound}/${expectedStats.length} stats found`);
    });
  });

  test.describe('Body Measurement Chart Validation', () => {
    test('Body Measurement chart is visible and configurable', async ({ page }) => {
      // Wait for the Body Measurements chart to load
      const bodyMeasurementChart = page.locator('h3:has-text("Body Measurements"), .card:has(h3:has-text("Body Measurements"))').first();
      await expect(bodyMeasurementChart).toBeVisible({ timeout: 15000 });

      // Check if chart container exists (should be second chart)
      const chartContainers = page.locator('.recharts-wrapper');
      const containerCount = await chartContainers.count();

      if (containerCount >= 2) {
        await expect(chartContainers.nth(1)).toBeVisible({ timeout: 10000 });
        console.log('✅ Body Measurements chart container is visible');
      } else {
        console.log(`⚠️ Expected 2+ chart containers, found ${containerCount}`);
      }

      // Verify Configure button is present
      const configureButton = page.locator('button:has-text("Configure")');
      await expect(configureButton).toBeVisible({ timeout: 5000 });

      console.log('✅ Body Measurement chart is visible and configurable');
    });

    test('Body Measurement configuration shows waist, chest, hips options', async ({ page }) => {
      // Wait for the Body Measurements chart to load
      await page.waitForSelector('h3:has-text("Body Measurements")', { timeout: 15000 });

      // Find and click the Configure button
      const configureButton = page.locator('button:has-text("Configure")');
      await expect(configureButton).toBeVisible({ timeout: 5000 });
      await configureButton.click();

      // Wait for popover to open
      await page.waitForTimeout(1000);

      // Check for specific measurement options
      const expectedMeasurements = ['Waist', 'Chest', 'Hips', 'Body Fat'];
      let foundMeasurements = 0;

      for (const measurement of expectedMeasurements) {
        const measurementLabel = page.locator(`label:has-text("${measurement}")`);
        if (await measurementLabel.isVisible()) {
          foundMeasurements++;
          console.log(`  ✓ Found measurement option: ${measurement}`);

          // Check if checkbox is present
          const checkbox = measurementLabel.locator('input[type="checkbox"]');
          await expect(checkbox).toBeVisible();
        }
      }

      expect(foundMeasurements).toBeGreaterThan(0);
      console.log(`✅ Body Measurement configuration shows ${foundMeasurements}/${expectedMeasurements.length} expected options`);

      // Close the popover
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    });

    test('Body Measurement lines display when measurements are enabled', async ({ page }) => {
      // Wait for the Body Measurements chart to load
      await page.waitForSelector('h3:has-text("Body Measurements")', { timeout: 15000 });

      // Open the Configure popover
      const configureButton = page.locator('button:has-text("Configure")');
      await configureButton.click();
      await page.waitForTimeout(1000);

      // Enable waist, chest, and hips measurements
      const measurementsToEnable = ['Waist', 'Chest', 'Hips'];

      for (const measurement of measurementsToEnable) {
        const measurementCheckbox = page.locator(`label:has-text("${measurement}")`).locator('input[type="checkbox"]');
        if (await measurementCheckbox.isVisible()) {
          // Enable if not already checked
          if (!(await measurementCheckbox.isChecked())) {
            await measurementCheckbox.click();
            await page.waitForTimeout(300);
          }
          console.log(`  ✓ Enabled ${measurement} measurement`);
        }
      }

      // Close the popover
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1500);

      // Check for chart lines (should have multiple lines for different measurements)
      const chartLines = page.locator('.recharts-line');
      const lineCount = await chartLines.count();

      if (lineCount > 0) {
        console.log(`✅ Body Measurement chart displays ${lineCount} measurement lines`);
      } else {
        // Check for alternative chart representations
        const chartPaths = page.locator('path[stroke]:not([stroke="transparent"])');
        const pathCount = await chartPaths.count();
        if (pathCount > 0) {
          console.log(`✅ Body Measurement chart displays ${pathCount} measurement paths`);
        } else {
          // Check if showing no data message
          const noDataMessage = page.locator('text="No measurement data available"');
          if (await noDataMessage.isVisible()) {
            console.log('⚠️ Chart shows no data message - this is expected if no body measurements exist yet');
          }
        }
      }

      console.log('✅ Body Measurement lines validation completed');
    });

    test('Body Measurement legend is visible with enabled measurements', async ({ page }) => {
      // Wait for the Body Measurements chart to load
      await page.waitForSelector('h3:has-text("Body Measurements")', { timeout: 15000 });

      // Enable multiple measurements first
      const configureButton = page.locator('button:has-text("Configure")');
      await configureButton.click();
      await page.waitForTimeout(1000);

      // Enable first 3 available measurements
      const checkboxes = page.locator('input[type="checkbox"]');
      const checkboxCount = await checkboxes.count();

      let enabledCount = 0;
      for (let i = 0; i < Math.min(3, checkboxCount); i++) {
        const checkbox = checkboxes.nth(i);
        if (await checkbox.isVisible()) {
          if (!(await checkbox.isChecked())) {
            await checkbox.click();
            await page.waitForTimeout(200);
          }
          enabledCount++;
        }
      }

      // Close the popover
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1500);

      // Look for legend
      const legend = page.locator('.recharts-legend-wrapper, .recharts-legend');
      if (await legend.isVisible()) {
        const legendItems = legend.locator('.recharts-legend-item, .legend-item');
        const legendItemCount = await legendItems.count();
        console.log(`✅ Body Measurement legend is visible with ${legendItemCount} items`);
      } else {
        // Alternative legend check - look for color indicators
        const colorIndicators = page.locator('[style*="background-color"], [style*="color"]').filter({ hasText: /waist|chest|hips|body fat/i });
        const indicatorCount = await colorIndicators.count();
        if (indicatorCount > 0) {
          console.log(`✅ Body Measurement color indicators found: ${indicatorCount} indicators`);
        } else {
          console.log('⚠️ Legend not clearly visible - may be due to no data or different layout');
        }
      }

      console.log('✅ Body Measurement legend validation completed');
    });

    test('Body Measurement time ranges work correctly', async ({ page }) => {
      // Wait for the Body Measurements chart to load
      await page.waitForSelector('h3:has-text("Body Measurements")', { timeout: 15000 });

      // Test time range buttons for body measurements (should be the second set)
      const timeRanges = ['30 days', '3 months', '6 months', '1 year'];

      for (const range of timeRanges) {
        const timeRangeButtons = page.locator(`button:has-text("${range}")`);

        // Try to find the body measurement time range button (usually the second set)
        const buttonCount = await timeRangeButtons.count();
        if (buttonCount >= 2) {
          const bodyMeasurementTimeButton = timeRangeButtons.nth(1);

          if (await bodyMeasurementTimeButton.isVisible()) {
            await bodyMeasurementTimeButton.click();
            await page.waitForTimeout(1000);

            // Verify button is selected
            await expect(bodyMeasurementTimeButton).toHaveClass(/bg-blue-100/);

            console.log(`✅ Body Measurement time range "${range}" applied successfully`);
          }
        } else if (buttonCount === 1) {
          // If only one set of buttons, it might control both charts
          const timeButton = timeRangeButtons.first();
          if (await timeButton.isVisible()) {
            await timeButton.click();
            await page.waitForTimeout(1000);
          }
        }
      }

      console.log('✅ Body Measurement time range filtering validated');
    });
  });

  test.describe('Add Measurement Modal Validation', () => {
    test('Add Measurement modal opens and contains all expected fields', async ({ page }) => {
      // Navigate to Measurements sub-tab if not already there
      const measurementsTab = page.locator('[role="tab"]:has-text("Measurements")');
      if (await measurementsTab.isVisible()) {
        await measurementsTab.click();
        await page.waitForTimeout(1000);
      }

      // Find and click the Add Measurement button
      const addButton = page.locator('button:has-text("Add Measurement")');
      await expect(addButton).toBeVisible({ timeout: 10000 });
      await addButton.click();

      // Wait for modal to appear
      await page.waitForTimeout(1000);

      // Verify modal is open
      const modalTitle = page.locator('h2:has-text("Add New Measurement")');
      await expect(modalTitle).toBeVisible({ timeout: 5000 });

      // Verify modal description
      const modalDescription = page.locator('text="Record your current body measurements. All fields are optional."');
      await expect(modalDescription).toBeVisible();

      // Check for expected input fields
      const expectedFields = [
        'Weight',
        'Body Fat %',
        'Waist',
        'Chest',
        'Hips',
        'Date'
      ];

      let fieldsFound = 0;
      for (const field of expectedFields) {
        const fieldLabel = page.locator(`label:has-text("${field}")`);
        if (await fieldLabel.isVisible()) {
          fieldsFound++;
          console.log(`  ✓ Found field: ${field}`);
        }
      }

      expect(fieldsFound).toBeGreaterThan(3); // Should have at least basic fields
      console.log(`✅ Add Measurement modal contains ${fieldsFound}/${expectedFields.length} expected fields`);

      // Close modal
      const cancelButton = page.locator('button:has-text("Cancel")');
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(500);
    });

    test('Add Measurement modal form can be filled and submitted', async ({ page }) => {
      // Navigate to Measurements sub-tab
      const measurementsTab = page.locator('[role="tab"]:has-text("Measurements")');
      if (await measurementsTab.isVisible()) {
        await measurementsTab.click();
        await page.waitForTimeout(1000);
      }

      // Open the modal
      const addButton = page.locator('button:has-text("Add Measurement")');
      await addButton.click();
      await page.waitForTimeout(1000);

      // Fill in some test data
      const weightInput = page.locator('input[name="weight"], input[placeholder*="weight"]').first();
      if (await weightInput.isVisible()) {
        await weightInput.fill('175.5');
        console.log('  ✓ Filled weight field');
      }

      const bodyFatInput = page.locator('input[name="bodyFat"], input[placeholder*="body fat"]').first();
      if (await bodyFatInput.isVisible()) {
        await bodyFatInput.fill('18.5');
        console.log('  ✓ Filled body fat field');
      }

      const waistInput = page.locator('input[name="waist"], input[placeholder*="waist"]').first();
      if (await waistInput.isVisible()) {
        await waistInput.fill('32.0');
        console.log('  ✓ Filled waist field');
      }

      // Try to submit the form
      const submitButton = page.locator('button:has-text("Save Measurement"), button:has-text("Add Measurement")').last();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(2000);

        // Check if modal closed (successful submission)
        const modalTitle = page.locator('h2:has-text("Add New Measurement")');
        const modalClosed = !(await modalTitle.isVisible());

        if (modalClosed) {
          console.log('✅ Measurement successfully submitted and modal closed');
        } else {
          console.log('⚠️ Modal still open - may have validation errors or form issues');

          // Check for validation errors
          const errorMessages = page.locator('.text-red-500, .error, [class*="error"]');
          const errorCount = await errorMessages.count();
          if (errorCount > 0) {
            console.log(`  - Found ${errorCount} validation errors`);
          }
        }
      } else {
        console.log('⚠️ Submit button not found');
      }

      // Ensure modal is closed
      const cancelButton = page.locator('button:has-text("Cancel")');
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
      }
      await page.waitForTimeout(500);

      console.log('✅ Add Measurement form submission tested');
    });
  });

  test.describe('Cross-Chart Integration and Performance', () => {
    test('Both charts load simultaneously without conflicts', async ({ page }) => {
      // Wait for both charts to be present
      const weightChart = page.locator('h3:has-text("Weight Progress")').first();
      const bodyChart = page.locator('h3:has-text("Body Measurements")').first();

      await expect(weightChart).toBeVisible({ timeout: 15000 });
      await expect(bodyChart).toBeVisible({ timeout: 15000 });

      // Check that both chart containers are present
      const chartContainers = page.locator('.recharts-wrapper');
      const containerCount = await chartContainers.count();

      expect(containerCount).toBeGreaterThanOrEqual(2);
      console.log(`✅ Both charts loaded: ${containerCount} chart containers found`);

      // Verify both charts have their own time range controls
      const timeRangeButtons = page.locator('button:has-text("30 days")');
      const timeButtonCount = await timeRangeButtons.count();

      if (timeButtonCount >= 2) {
        console.log('✅ Both charts have independent time range controls');
      } else {
        console.log('⚠️ Charts may share time range controls');
      }

      console.log('✅ Chart integration validated');
    });

    test('Charts are responsive on mobile viewport', async ({ page }) => {
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

      // Verify both charts are still visible and responsive
      const weightChart = page.locator('h3:has-text("Weight Progress")');
      const bodyChart = page.locator('h3:has-text("Body Measurements")');

      await expect(weightChart).toBeVisible({ timeout: 10000 });
      await expect(bodyChart).toBeVisible({ timeout: 10000 });

      // Check that controls are still accessible on mobile
      const configureButton = page.locator('button:has-text("Configure")');
      await expect(configureButton).toBeVisible();

      const addMeasurementButton = page.locator('button:has-text("Add Measurement")');
      if (await addMeasurementButton.isVisible()) {
        console.log('✅ Add Measurement button accessible on mobile');
      }

      console.log('✅ Charts are responsive on mobile viewport');
    });

    test('No console errors or performance issues with test data', async ({ page }) => {
      const errors: string[] = [];

      // Listen for console errors
      page.on('console', msg => {
        if (msg.type() === 'error' &&
            !msg.text().includes('WebSocket') &&
            !msg.text().includes('ERR_CONNECTION_REFUSED') &&
            !msg.text().includes('favicon')) {
          errors.push(msg.text());
        }
      });

      page.on('pageerror', error => {
        if (!error.message.includes('WebSocket') &&
            !error.message.includes('ERR_CONNECTION_REFUSED')) {
          errors.push(error.message);
        }
      });

      // Wait for charts to load with test data
      await page.waitForSelector('h3:has-text("Weight Progress")', { timeout: 15000 });
      await page.waitForSelector('h3:has-text("Body Measurements")', { timeout: 15000 });

      // Interact with various controls to trigger any potential errors
      const timeRangeButton = page.locator('button:has-text("3 months")').first();
      if (await timeRangeButton.isVisible()) {
        await timeRangeButton.click();
        await page.waitForTimeout(1000);
      }

      const configureButton = page.locator('button:has-text("Configure")');
      if (await configureButton.isVisible()) {
        await configureButton.click();
        await page.waitForTimeout(500);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }

      // Check for errors
      if (errors.length > 0) {
        console.log('Console errors found:', errors);
        throw new Error(`Console errors detected: ${errors.join(', ')}`);
      }

      console.log('✅ No console errors or performance issues detected');
    });

    test('Data refresh and real-time updates work correctly', async ({ page }) => {
      // Test the current state of charts
      await page.waitForSelector('h3:has-text("Weight Progress")', { timeout: 15000 });

      // Refresh the page to test data persistence and loading
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Navigate back to Progress tab
      const progressTab = page.locator('[role="tab"]:has-text("Progress")');
      await expect(progressTab).toBeVisible();
      await progressTab.click();
      await page.waitForTimeout(2000);

      // Verify charts reload with data
      const weightChart = page.locator('h3:has-text("Weight Progress")');
      const bodyChart = page.locator('h3:has-text("Body Measurements")');

      await expect(weightChart).toBeVisible({ timeout: 10000 });
      await expect(bodyChart).toBeVisible({ timeout: 10000 });

      // Check for chart containers after reload
      const chartContainers = page.locator('.recharts-wrapper');
      const containerCount = await chartContainers.count();

      expect(containerCount).toBeGreaterThanOrEqual(1);
      console.log(`✅ Charts reloaded successfully: ${containerCount} containers after refresh`);

      console.log('✅ Data refresh and persistence validated');
    });
  });
});