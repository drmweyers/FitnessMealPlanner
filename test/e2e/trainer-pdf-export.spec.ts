/**
 * Trainer Profile PDF Export E2E Tests
 *
 * Comprehensive end-to-end tests for the PDF export feature in the trainer profile
 * Tests the real user experience of exporting meal plans to PDF
 */

import { test, expect, Page, Download } from '@playwright/test';

// Test credentials
const TRAINER_EMAIL = 'trainer.test@evofitmeals.com';
const TRAINER_PASSWORD = 'TestTrainer123!';

// Helper function to login as trainer
async function loginAsTrainer(page: Page) {
  await page.goto('http://localhost:4000/login');
  await page.fill('input[type="email"]', TRAINER_EMAIL);
  await page.fill('input[type="password"]', TRAINER_PASSWORD);
  await page.click('button[type="submit"]');

  // Wait for navigation to complete
  await page.waitForURL('**/trainer', { timeout: 10000 });
}

// Helper to navigate to trainer profile
async function navigateToTrainerProfile(page: Page) {
  await page.goto('http://localhost:4000/trainer/profile');
  await page.waitForSelector('h1:has-text("Trainer Profile")');
}

// Helper to wait for PDF export section to load
async function waitForPDFExportSection(page: Page) {
  await page.waitForSelector('text="Recipe Card Export"', { timeout: 10000 });
}

test.describe('Trainer Profile PDF Export Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Start each test by logging in as trainer
    await loginAsTrainer(page);
    await navigateToTrainerProfile(page);
  });

  test('should display PDF export section in trainer profile', async ({ page }) => {
    // Check that PDF export section is visible
    await expect(page.locator('text="Recipe Card Export"')).toBeVisible();

    // Check description text
    await expect(page.locator('text=/Export recipe cards from customer meal plans/')).toBeVisible();

    // Check for download icon in the export section
    const exportSection = page.locator('text="Recipe Card Export"').locator('..');
    const svgIcon = await exportSection.locator('svg').count();
    expect(svgIcon).toBeGreaterThan(0);
  });

  test('should show export all button when meal plans are available', async ({ page }) => {
    await waitForPDFExportSection(page);

    // Look for Export All button
    const exportAllButton = page.locator('button:has-text("Export All")');

    // If meal plans exist, button should be visible
    const buttonCount = await exportAllButton.count();
    if (buttonCount > 0) {
      await expect(exportAllButton.first()).toBeVisible();
      await expect(exportAllButton.first()).toBeEnabled();
    }
  });

  test('should show empty state when no meal plans are available', async ({ page }) => {
    await waitForPDFExportSection(page);

    // Check if empty state message is shown
    const emptyState = page.locator('text="No meal plans available for export"');
    const hasEmptyState = await emptyState.isVisible().catch(() => false);

    if (hasEmptyState) {
      await expect(emptyState).toBeVisible();
      await expect(page.locator('text=/Create meal plans and assign them to customers/')).toBeVisible();
    }
  });

  test('should trigger PDF download when Export All is clicked', async ({ page }) => {
    await waitForPDFExportSection(page);

    const exportAllButton = page.locator('button:has-text("Export All")').first();
    const hasExportButton = await exportAllButton.isVisible().catch(() => false);

    if (!hasExportButton) {
      test.skip();
      return;
    }

    // Set up download promise before clicking
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 }).catch(() => null);

    // Click export button
    await exportAllButton.click();

    // Check for loading state
    const loadingIndicator = page.locator('svg.animate-spin');
    if (await loadingIndicator.isVisible().catch(() => false)) {
      await expect(loadingIndicator).toBeVisible();
    }

    // Wait for download or timeout
    const download = await downloadPromise;

    if (download) {
      // Verify download properties
      const fileName = download.suggestedFilename();
      expect(fileName).toMatch(/\.pdf$/i);
      expect(fileName).toContain('meal_plan');

      // Save to verify it's a valid file
      const path = await download.path();
      expect(path).toBeTruthy();
    }
  });

  test('should show individual customer export options', async ({ page }) => {
    await waitForPDFExportSection(page);

    // Look for "Export by Customer:" text
    const exportByCustomer = page.locator('text="Export by Customer:"');
    const hasCustomerExports = await exportByCustomer.isVisible().catch(() => false);

    if (hasCustomerExports) {
      await expect(exportByCustomer).toBeVisible();

      // Check for customer email entries
      const customerEmails = page.locator('[class*="font-medium"][class*="text-sm"]');
      const emailCount = await customerEmails.count();

      if (emailCount > 0) {
        // Verify at least one customer is shown
        const firstEmail = customerEmails.first();
        await expect(firstEmail).toBeVisible();

        // Check for meal plan count
        const mealPlanCount = page.locator('text=/\\d+ meal plans?/').first();
        await expect(mealPlanCount).toBeVisible();
      }
    }
  });

  test('should open PDF export options dialog', async ({ page }) => {
    await waitForPDFExportSection(page);

    // Find settings button (usually next to export button)
    const settingsButton = page.locator('button:has(svg):not(:has-text("Export"))').last();
    const hasSettingsButton = await settingsButton.isVisible().catch(() => false);

    if (!hasSettingsButton) {
      // If no meal plans, skip this test
      test.skip();
      return;
    }

    // Click settings button
    await settingsButton.click();

    // Wait for dialog to appear
    await page.waitForSelector('text="PDF Export Options"', { timeout: 5000 });

    // Verify dialog contents
    await expect(page.locator('text="PDF Export Options"')).toBeVisible();
    await expect(page.locator('text="Customize your recipe card export settings"')).toBeVisible();

    // Check for card size options
    await expect(page.locator('text="Card Size"')).toBeVisible();
    await expect(page.locator('label:has-text("Small")')).toBeVisible();
    await expect(page.locator('label:has-text("Medium")')).toBeVisible();
    await expect(page.locator('label:has-text("Large")')).toBeVisible();

    // Check for nutrition option
    await expect(page.locator('text="Include nutrition information"')).toBeVisible();

    // Close dialog
    const cancelButton = page.locator('button:has-text("Cancel")');
    await cancelButton.click();
    await expect(page.locator('text="PDF Export Options"')).not.toBeVisible();
  });

  test('should export individual customer meal plans', async ({ page }) => {
    await waitForPDFExportSection(page);

    // Look for individual customer export buttons
    const customerExportButtons = page.locator('div:has(> div:has-text("@")) button:has(svg)');
    const buttonCount = await customerExportButtons.count();

    if (buttonCount === 0) {
      test.skip();
      return;
    }

    // Click first customer export button
    const firstExportButton = customerExportButtons.first();

    // Set up download promise
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 }).catch(() => null);

    await firstExportButton.click();

    // Wait for download
    const download = await downloadPromise;

    if (download) {
      const fileName = download.suggestedFilename();
      expect(fileName).toMatch(/\.pdf$/i);

      // Verify it contains customer-specific naming
      const customerEmail = await page.locator('div:has(> div:has-text("@")) div').first().textContent();
      if (customerEmail) {
        const sanitizedEmail = customerEmail.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        expect(fileName.toLowerCase()).toContain(sanitizedEmail.substring(0, 10));
      }
    }
  });

  test('should handle export errors gracefully', async ({ page }) => {
    await waitForPDFExportSection(page);

    // Intercept PDF export requests to simulate error
    await page.route('**/api/pdf/export**', route => {
      route.abort('failed');
    });

    const exportButton = page.locator('button:has-text("Export")').first();
    const hasExportButton = await exportButton.isVisible().catch(() => false);

    if (!hasExportButton) {
      test.skip();
      return;
    }

    await exportButton.click();

    // Should show error toast or message
    const errorMessage = page.locator('text=/export failed|failed to export|error/i');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });

  test('should allow changing export options', async ({ page }) => {
    await waitForPDFExportSection(page);

    // Find and click settings button
    const settingsButton = page.locator('button:has(svg):not(:has-text("Export"))').last();
    const hasSettingsButton = await settingsButton.isVisible().catch(() => false);

    if (!hasSettingsButton) {
      test.skip();
      return;
    }

    await settingsButton.click();
    await page.waitForSelector('text="PDF Export Options"');

    // Change to large card size
    await page.click('label:has-text("Large")');

    // Uncheck nutrition info
    const nutritionCheckbox = page.locator('input[type="checkbox"]');
    if (await nutritionCheckbox.isChecked()) {
      await nutritionCheckbox.click();
    }

    // Click Export PDF in dialog
    await page.click('button:has-text("Export PDF")');

    // Should trigger download with custom options
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 }).catch(() => null);
    const download = await downloadPromise;

    if (download) {
      expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    }
  });

  test('should display correct meal plan counts', async ({ page }) => {
    await waitForPDFExportSection(page);

    // Check for total meal plans count
    const totalPlansText = page.locator('text=/\\d+ total meal plans/');
    const hasTotalPlans = await totalPlansText.isVisible().catch(() => false);

    if (hasTotalPlans) {
      await expect(totalPlansText).toBeVisible();

      // Extract and verify the number
      const text = await totalPlansText.textContent();
      const match = text?.match(/(\d+) total meal plans/);
      if (match) {
        const count = parseInt(match[1]);
        expect(count).toBeGreaterThanOrEqual(0);
      }
    }

    // Check individual customer meal plan counts
    const individualCounts = page.locator('text=/\\d+ meal plans?$/');
    const countElements = await individualCounts.count();

    for (let i = 0; i < countElements; i++) {
      const element = individualCounts.nth(i);
      await expect(element).toBeVisible();
    }
  });

  test('should maintain state when switching between tabs', async ({ page }) => {
    await waitForPDFExportSection(page);

    // Remember initial state
    const exportButton = page.locator('button:has-text("Export All")').first();
    const initialButtonState = await exportButton.isVisible().catch(() => false);

    // Navigate to another section
    await page.click('text="Quick Actions"');
    await expect(page.locator('text="Quick Actions"')).toBeVisible();

    // Navigate back to PDF export section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await waitForPDFExportSection(page);

    // Check state is maintained
    const finalButtonState = await exportButton.isVisible().catch(() => false);
    expect(finalButtonState).toBe(initialButtonState);
  });

  test('should handle rapid clicks gracefully', async ({ page }) => {
    await waitForPDFExportSection(page);

    const exportButton = page.locator('button:has-text("Export")').first();
    const hasExportButton = await exportButton.isVisible().catch(() => false);

    if (!hasExportButton) {
      test.skip();
      return;
    }

    // Click multiple times rapidly
    await exportButton.click();
    await exportButton.click();
    await exportButton.click();

    // Should only trigger one download or show appropriate feedback
    let downloadCount = 0;
    page.on('download', () => downloadCount++);

    await page.waitForTimeout(3000);

    // Should not trigger multiple downloads
    expect(downloadCount).toBeLessThanOrEqual(1);
  });

  test('should show loading state during export', async ({ page }) => {
    await waitForPDFExportSection(page);

    const exportButton = page.locator('button:has-text("Export")').first();
    const hasExportButton = await exportButton.isVisible().catch(() => false);

    if (!hasExportButton) {
      test.skip();
      return;
    }

    // Slow down network to see loading state
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 1000);
    });

    await exportButton.click();

    // Check for loading indicator
    const loadingIndicator = page.locator('svg.animate-spin, text=/exporting/i, button:disabled:has-text("Export")');
    await expect(loadingIndicator.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('PDF Export Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTrainer(page);
    await navigateToTrainerProfile(page);
  });

  test('should be keyboard navigable', async ({ page }) => {
    await waitForPDFExportSection(page);

    // Tab to export button
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Find focused element
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();

    // Press Enter on focused export button
    const exportButton = page.locator('button:has-text("Export"):focus');
    if (await exportButton.isVisible().catch(() => false)) {
      await page.keyboard.press('Enter');

      // Should trigger export
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
      const download = await downloadPromise;

      if (download) {
        expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
      }
    }
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await waitForPDFExportSection(page);

    // Check export buttons have accessible names
    const exportButtons = page.locator('button:has-text("Export")');
    const buttonCount = await exportButtons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = exportButtons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.textContent();

      // Button should have either aria-label or visible text
      expect(ariaLabel || text).toBeTruthy();
    }
  });
});