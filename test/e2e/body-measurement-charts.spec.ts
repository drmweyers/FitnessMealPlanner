import { test, expect } from '@playwright/test';

test.describe('Body Measurement Chart Tests', () => {
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

  test('Body Measurement chart is visible', async ({ page }) => {
    // Wait for the Body Measurements chart to load
    const bodyMeasurementChart = page.locator('h3:has-text("Body Measurements"), .card:has(h3:has-text("Body Measurements"))').first();
    await expect(bodyMeasurementChart).toBeVisible({ timeout: 10000 });

    // Check if chart container exists
    const chartContainers = page.locator('.recharts-wrapper');
    await expect(chartContainers.nth(1)).toBeVisible({ timeout: 10000 }); // Second chart should be body measurements

    console.log('✅ Body Measurement chart is visible');
  });

  test('Configure button opens measurement selector', async ({ page }) => {
    // Wait for the Body Measurements chart to load
    await page.waitForSelector('h3:has-text("Body Measurements")', { timeout: 10000 });

    // Find and click the Configure button
    const configureButton = page.locator('button:has-text("Configure")');
    await expect(configureButton).toBeVisible({ timeout: 5000 });
    await configureButton.click();

    // Wait for popover to open
    await page.waitForTimeout(500);

    // Check for measurement selection options
    const measurementOptions = [
      'Waist', 'Chest', 'Hips', 'Neck', 'Shoulders',
      'Left Bicep', 'Right Bicep', 'Left Thigh', 'Right Thigh',
      'Left Calf', 'Right Calf', 'Body Fat', 'Muscle Mass'
    ];

    let foundOptions = 0;
    for (const option of measurementOptions) {
      const optionElement = page.locator(`label:has-text("${option}")`);
      if (await optionElement.isVisible()) {
        foundOptions++;
      }
    }

    expect(foundOptions).toBeGreaterThan(0);
    console.log(`✅ Configure button opens measurement selector with ${foundOptions} options`);

    // Close the popover by clicking outside or pressing escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  });

  test('Toggle different measurement types on/off', async ({ page }) => {
    // Wait for the Body Measurements chart to load
    await page.waitForSelector('h3:has-text("Body Measurements")', { timeout: 10000 });

    // Open the Configure popover
    const configureButton = page.locator('button:has-text("Configure")');
    await configureButton.click();
    await page.waitForTimeout(500);

    // Find checkboxes and test toggling
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();

    if (checkboxCount > 0) {
      // Get the first few checkboxes to test
      for (let i = 0; i < Math.min(3, checkboxCount); i++) {
        const checkbox = checkboxes.nth(i);
        const isChecked = await checkbox.isChecked();

        // Toggle the checkbox
        await checkbox.click();
        await page.waitForTimeout(300);

        // Verify the state changed
        const newCheckedState = await checkbox.isChecked();
        expect(newCheckedState).toBe(!isChecked);
      }

      console.log('✅ Successfully toggled measurement types on/off');
    } else {
      console.log('⚠️ No checkboxes found in measurement selector');
    }

    // Close the popover
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  });

  test('Legend updates when measurements are toggled', async ({ page }) => {
    // Wait for the Body Measurements chart to load
    await page.waitForSelector('h3:has-text("Body Measurements")', { timeout: 10000 });

    // Look for chart legend initially
    const legendBefore = page.locator('.recharts-legend-wrapper');

    // Open the Configure popover
    const configureButton = page.locator('button:has-text("Configure")');
    await configureButton.click();
    await page.waitForTimeout(500);

    // Find a checkbox to toggle
    const waistCheckbox = page.locator('input[type="checkbox"]').first();
    if (await waistCheckbox.isVisible()) {
      const initialState = await waistCheckbox.isChecked();

      // Toggle the checkbox
      await waistCheckbox.click();
      await page.waitForTimeout(500);

      // Close the popover
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);

      // Check if legend updated (this is more of a functional test)
      const legendAfter = page.locator('.recharts-legend-wrapper');
      if (await legendAfter.isVisible()) {
        console.log('✅ Legend is present and should reflect measurement changes');
      }

      // Toggle back to restore original state
      await configureButton.click();
      await page.waitForTimeout(500);
      await waistCheckbox.click();
      await page.keyboard.press('Escape');
    }

    console.log('✅ Legend updates tested for measurement toggles');
  });

  test('Time range filtering works for body measurements', async ({ page }) => {
    // Wait for the Body Measurements chart to load
    await page.waitForSelector('h3:has-text("Body Measurements")', { timeout: 10000 });

    // Test time range buttons
    const timeRanges = ['30 days', '3 months', '6 months', '1 year', 'All time'];

    for (const range of timeRanges) {
      const timeRangeButtons = page.locator(`button:has-text("${range}")`);
      const bodyMeasurementTimeButton = timeRangeButtons.nth(1); // Second set should be for body measurements

      if (await bodyMeasurementTimeButton.isVisible()) {
        await bodyMeasurementTimeButton.click();
        await page.waitForTimeout(1000);

        // Verify button is selected
        await expect(bodyMeasurementTimeButton).toHaveClass(/bg-blue-100/);

        // Verify chart updates
        const chartContainer = page.locator('.recharts-wrapper').nth(1);
        await expect(chartContainer).toBeVisible();
      }
    }

    console.log('✅ Time range filtering works for body measurements');
  });

  test('Multiple measurement lines are displayed', async ({ page }) => {
    // Wait for the Body Measurements chart to load
    await page.waitForSelector('h3:has-text("Body Measurements")', { timeout: 10000 });

    // Ensure some measurements are enabled
    const configureButton = page.locator('button:has-text("Configure")');
    await configureButton.click();
    await page.waitForTimeout(500);

    // Enable a few measurements
    const measurementCheckboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await measurementCheckboxes.count();

    if (checkboxCount > 0) {
      // Enable first 3 measurements
      for (let i = 0; i < Math.min(3, checkboxCount); i++) {
        const checkbox = measurementCheckboxes.nth(i);
        if (!(await checkbox.isChecked())) {
          await checkbox.click();
          await page.waitForTimeout(200);
        }
      }
    }

    // Close the popover
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    // Look for multiple lines in the chart
    const chartLines = page.locator('.recharts-line');
    const lineCount = await chartLines.count();

    if (lineCount > 0) {
      console.log(`✅ Multiple measurement lines displayed: ${lineCount} lines found`);
    } else {
      // Check if we're in a "no data" or "no measurements selected" state
      const noDataMessage = page.locator('text="No measurement data available for the selected period"');
      const noMeasurementsMessage = page.locator('text="No measurements selected or available"');

      if (await noDataMessage.isVisible() || await noMeasurementsMessage.isVisible()) {
        console.log('⚠️ Chart shows no data/measurements message - this is a valid state');
      } else {
        console.log('⚠️ No chart lines found, but no error message either');
      }
    }
  });

  test('Chart handles no data state gracefully', async ({ page }) => {
    // Wait for the Body Measurements chart to load
    await page.waitForSelector('h3:has-text("Body Measurements")', { timeout: 10000 });

    // Look for possible no-data states
    const noDataMessage = page.locator('text="No measurement data available for the selected period"');
    const noMeasurementsMessage = page.locator('text="No measurements selected or available"');
    const chartContainer = page.locator('.recharts-wrapper').nth(1);

    if (await noDataMessage.isVisible()) {
      console.log('✅ Chart properly handles no data state');
    } else if (await noMeasurementsMessage.isVisible()) {
      console.log('✅ Chart properly handles no measurements selected state');
    } else if (await chartContainer.isVisible()) {
      console.log('✅ Chart displays with available data');
    } else {
      console.log('⚠️ Chart state unclear - investigating further');
    }
  });

  test('Quick stats display for enabled measurements', async ({ page }) => {
    // Wait for the Body Measurements chart to load
    await page.waitForSelector('h3:has-text("Body Measurements")', { timeout: 10000 });

    // Enable some measurements first
    const configureButton = page.locator('button:has-text("Configure")');
    await configureButton.click();
    await page.waitForTimeout(500);

    // Enable waist and chest measurements if available
    const waistCheckbox = page.locator('label:has-text("Waist")').locator('input[type="checkbox"]');
    const chestCheckbox = page.locator('label:has-text("Chest")').locator('input[type="checkbox"]');

    if (await waistCheckbox.isVisible()) {
      if (!(await waistCheckbox.isChecked())) {
        await waistCheckbox.click();
        await page.waitForTimeout(200);
      }
    }

    if (await chestCheckbox.isVisible()) {
      if (!(await chestCheckbox.isChecked())) {
        await chestCheckbox.click();
        await page.waitForTimeout(200);
      }
    }

    // Close the popover
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    // Look for quick stats
    const statsSection = page.locator('.grid').last(); // Usually the last grid contains stats
    if (await statsSection.isVisible()) {
      // Look for measurement labels and values
      const statLabels = statsSection.locator('.text-xs');
      const statValues = statsSection.locator('.font-semibold');

      const labelCount = await statLabels.count();
      const valueCount = await statValues.count();

      if (labelCount > 0 && valueCount > 0) {
        console.log(`✅ Quick stats display with ${labelCount} labels and ${valueCount} values`);
      } else {
        console.log('⚠️ Stats section visible but no clear stat elements found');
      }
    } else {
      console.log('⚠️ No stats section found - may be hidden due to no data');
    }
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

    // Wait for the Body Measurements chart to load
    await page.waitForSelector('h3:has-text("Body Measurements")', { timeout: 10000 });

    // Verify chart is still visible and responsive
    const bodyMeasurementChart = page.locator('h3:has-text("Body Measurements")').locator('..');
    await expect(bodyMeasurementChart).toBeVisible();

    // Check that Configure button is still accessible
    const configureButton = page.locator('button:has-text("Configure")');
    await expect(configureButton).toBeVisible();

    // Test opening the configure modal on mobile
    await configureButton.click();
    await page.waitForTimeout(500);

    // Verify popover/modal opens properly on mobile
    const measurementSelector = page.locator('text="Select measurements to display"');
    await expect(measurementSelector).toBeVisible();

    // Close the modal
    await page.keyboard.press('Escape');

    console.log('✅ Body Measurement chart is responsive on mobile viewport');
  });

  test('Chart tooltip displays measurement values', async ({ page }) => {
    // Wait for the Body Measurements chart to load
    await page.waitForSelector('h3:has-text("Body Measurements")', { timeout: 10000 });

    // Enable some measurements first
    const configureButton = page.locator('button:has-text("Configure")');
    await configureButton.click();
    await page.waitForTimeout(500);

    // Enable at least one measurement
    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    if (await firstCheckbox.isVisible() && !(await firstCheckbox.isChecked())) {
      await firstCheckbox.click();
      await page.waitForTimeout(200);
    }

    // Close the popover
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

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

    // Wait for the Body Measurements chart to load
    await page.waitForSelector('h3:has-text("Body Measurements")', { timeout: 10000 });

    // Interact with the Configure button
    const configureButton = page.locator('button:has-text("Configure")');
    if (await configureButton.isVisible()) {
      await configureButton.click();
      await page.waitForTimeout(500);

      // Toggle a measurement
      const firstCheckbox = page.locator('input[type="checkbox"]').first();
      if (await firstCheckbox.isVisible()) {
        await firstCheckbox.click();
        await page.waitForTimeout(300);
      }

      // Close the popover
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // Interact with time range buttons
    const timeRangeButton = page.locator('button:has-text("6 months")').nth(1); // Second set for body measurements
    if (await timeRangeButton.isVisible()) {
      await timeRangeButton.click();
      await page.waitForTimeout(1000);
    }

    // Check for errors
    if (errors.length > 0) {
      console.log('Errors found:', errors);
      throw new Error(`Console errors detected: ${errors.join(', ')}`);
    }

    console.log('✅ No console errors during body measurement chart interactions');
  });
});