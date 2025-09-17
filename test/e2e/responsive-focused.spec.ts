import { test, expect } from '@playwright/test';

/**
 * Focused Responsive Design Test Suite
 *
 * This test suite validates core responsive design functionality
 * with reliable testing patterns.
 */

// Test credentials
const TEST_ACCOUNTS = {
  customer: {
    email: 'customer.test@evofitmeals.com',
    password: 'TestCustomer123!'
  }
};

// Key viewport sizes to test
const TEST_VIEWPORTS = [
  { name: 'Mobile', width: 375, height: 667, isMobile: true },
  { name: 'Tablet', width: 768, height: 1024, isMobile: false },
  { name: 'Desktop', width: 1280, height: 720, isMobile: false },
  { name: 'Large Desktop', width: 1920, height: 1080, isMobile: false }
];

// Helper function to login
async function login(page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Fill login form
  await page.fill('input[type="email"]', TEST_ACCOUNTS.customer.email);
  await page.fill('input[type="password"]', TEST_ACCOUNTS.customer.password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for navigation to customer dashboard
  await page.waitForURL('**/customer**', { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

// Helper function to check no horizontal scroll
async function checkNoHorizontalScroll(page) {
  const hasHorizontalScroll = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  expect(hasHorizontalScroll).toBe(false);
}

// Helper function to take screenshot
async function takeScreenshot(page, testName, viewportName) {
  await page.screenshot({
    path: `test/screenshots/responsive-focused-${testName}-${viewportName.toLowerCase()}.png`,
    fullPage: true
  });
}

test.describe('Focused Responsive Design Validation', () => {

  test.describe('Login Page Core Responsiveness', () => {
    TEST_VIEWPORTS.forEach(viewport => {
      test(`Login page at ${viewport.name} (${viewport.width}px)`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Core checks
        await checkNoHorizontalScroll(page);

        // Verify login form is visible and functional
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();

        // Check form fits within viewport
        const form = page.locator('form').first();
        if (await form.count() > 0) {
          const formBox = await form.boundingBox();
          if (formBox) {
            expect(formBox.width).toBeLessThan(viewport.width);
            expect(formBox.width).toBeGreaterThan(250); // Minimum usable width
          }
        }

        await takeScreenshot(page, 'login', viewport.name);
      });
    });
  });

  test.describe('Customer Dashboard Responsiveness', () => {
    TEST_VIEWPORTS.forEach(viewport => {
      test(`Customer dashboard at ${viewport.name} (${viewport.width}px)`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        await login(page);

        // Core responsiveness checks
        await checkNoHorizontalScroll(page);

        // Check main content area exists and is visible
        const mainContent = page.locator('main, .dashboard, .customer-dashboard').first();
        if (await mainContent.count() > 0) {
          await expect(mainContent).toBeVisible();
        }

        // Check navigation behavior
        if (viewport.isMobile) {
          // On mobile, look for mobile menu indicators
          const mobileIndicators = page.locator(
            'button[aria-label*="menu"], .hamburger, .mobile-menu, [data-testid="mobile-menu"]'
          );
          // Mobile menu might exist, if it does it should be visible
          if (await mobileIndicators.count() > 0) {
            await expect(mobileIndicators.first()).toBeVisible();
          }
        }

        // Check for meal plan content (primary feature)
        const mealContent = page.locator('.meal, [data-testid*="meal"], .meal-plan, .meal-card');
        if (await mealContent.count() > 0) {
          await expect(mealContent.first()).toBeVisible();
        }

        await takeScreenshot(page, 'dashboard', viewport.name);
      });
    });
  });

  test.describe('Width Utilization Analysis', () => {
    TEST_VIEWPORTS.forEach(viewport => {
      test(`Width utilization at ${viewport.name} (${viewport.width}px)`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        await login(page);

        // Check overall page width utilization
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);

        // Page should not exceed viewport width (no horizontal scroll)
        expect(bodyWidth).toBeLessThanOrEqual(viewport.width);

        // Check main container utilization
        const containers = page.locator('main, .container, .max-w-');
        if (await containers.count() > 0) {
          const container = containers.first();
          const containerBox = await container.boundingBox();

          if (containerBox) {
            if (viewport.isMobile) {
              // Mobile: should use most of the width
              expect(containerBox.width).toBeGreaterThan(viewport.width * 0.8);
            } else {
              // Desktop: should be constrained but reasonable
              expect(containerBox.width).toBeGreaterThan(600);
              expect(containerBox.width).toBeLessThan(viewport.width);
            }
          }
        }

        await takeScreenshot(page, 'width-utilization', viewport.name);
      });
    });
  });

  test.describe('Touch Target Validation', () => {
    test('Mobile touch targets meet minimum size requirements', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await login(page);

      // Find interactive elements
      const interactiveElements = page.locator(
        'button, a, input[type="submit"], input[type="button"], .clickable'
      );

      const elementCount = await interactiveElements.count();
      let validTargets = 0;

      for (let i = 0; i < Math.min(elementCount, 10); i++) {
        const element = interactiveElements.nth(i);

        if (await element.isVisible()) {
          const box = await element.boundingBox();
          if (box) {
            // Check if touch target meets 44px minimum (or close to it)
            const minDimension = Math.min(box.width, box.height);
            if (minDimension >= 40) { // Allowing slight tolerance
              validTargets++;
            }
          }
        }
      }

      // At least some interactive elements should meet touch target requirements
      expect(validTargets).toBeGreaterThan(0);

      await takeScreenshot(page, 'touch-targets', 'mobile');
    });
  });

  test.describe('Modal Behavior Validation', () => {
    TEST_VIEWPORTS.forEach(viewport => {
      test(`Modal behavior at ${viewport.name} (${viewport.width}px)`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        await login(page);

        // Look for modal triggers (buttons that might open modals)
        const possibleTriggers = page.locator(
          'button:has-text("View"), button:has-text("Add"), button:has-text("Edit"), .meal-card button'
        );

        const triggerCount = await possibleTriggers.count();

        if (triggerCount > 0) {
          // Try to open a modal
          const trigger = possibleTriggers.first();
          if (await trigger.isVisible()) {
            await trigger.click();
            await page.waitForTimeout(1000);

            // Check if a modal opened
            const modal = page.locator('.modal, [role="dialog"], .fixed.inset-0, .dialog');
            if (await modal.count() > 0 && await modal.first().isVisible()) {
              const modalBox = await modal.first().boundingBox();

              if (modalBox) {
                if (viewport.isMobile) {
                  // Mobile: modal should take significant screen space
                  expect(modalBox.width).toBeGreaterThan(viewport.width * 0.8);
                } else {
                  // Desktop: modal should be reasonably sized but not full screen
                  expect(modalBox.width).toBeLessThan(viewport.width * 0.9);
                  expect(modalBox.width).toBeGreaterThan(400);
                }
              }

              // Try to close modal
              const closeButton = page.locator('[aria-label*="Close"], .close, button:has-text("Close")');
              if (await closeButton.count() > 0) {
                await closeButton.first().click();
              } else {
                await page.keyboard.press('Escape');
              }
            }
          }
        }

        await takeScreenshot(page, 'modal-behavior', viewport.name);
      });
    });
  });

  test.describe('Table Responsiveness', () => {
    test('Tables adapt to mobile viewports', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await login(page);

      // Navigate to Progress section if it exists
      const progressLink = page.locator('a:has-text("Progress"), [href*="progress"]');
      if (await progressLink.count() > 0) {
        await progressLink.first().click();
        await page.waitForLoadState('networkidle');
      }

      // Check for tables
      const tables = page.locator('table, .table-container, [role="table"]');
      const tableCount = await tables.count();

      if (tableCount > 0) {
        for (let i = 0; i < Math.min(tableCount, 3); i++) {
          const table = tables.nth(i);
          if (await table.isVisible()) {
            const tableBox = await table.boundingBox();
            if (tableBox) {
              // On mobile, table should either:
              // 1. Fit within viewport, or
              // 2. Be in a scrollable container, or
              // 3. Transform to card layout

              // Check if table container has horizontal scroll
              const hasScroll = await page.evaluate((element) => {
                const parent = element.parentElement;
                return parent && parent.scrollWidth > parent.clientWidth;
              }, await table.elementHandle());

              // Table should either fit or have scroll mechanism
              const fitsInViewport = tableBox.width <= 375;
              expect(fitsInViewport || hasScroll).toBe(true);
            }
          }
        }
      }

      await takeScreenshot(page, 'table-responsive', 'mobile');
    });
  });

  test.describe('Cross-Viewport Consistency', () => {
    test('Key elements remain accessible across all viewports', async ({ page }) => {
      const results = [];

      for (const viewport of TEST_VIEWPORTS) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await login(page);

        // Check for key elements
        const keyElements = {
          navigation: await page.locator('nav, .navigation, [role="navigation"]').count() > 0,
          mainContent: await page.locator('main, .main-content, .dashboard').count() > 0,
          interactiveButtons: await page.locator('button:visible').count() > 0
        };

        results.push({
          viewport: viewport.name,
          width: viewport.width,
          elements: keyElements
        });

        // No horizontal scroll on any viewport
        await checkNoHorizontalScroll(page);
      }

      // All viewports should have basic navigation and content
      results.forEach(result => {
        expect(result.elements.mainContent || result.elements.interactiveButtons).toBe(true);
      });

      console.log('Cross-viewport test results:', JSON.stringify(results, null, 2));
    });
  });

  test.describe('Edge Case Viewports', () => {
    test('Very small mobile (320px) remains functional', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });

      await login(page);

      await checkNoHorizontalScroll(page);

      // Core functionality should still be accessible
      const interactiveElements = page.locator('button:visible, a:visible');
      const count = await interactiveElements.count();
      expect(count).toBeGreaterThan(0);

      await takeScreenshot(page, 'edge-case', '320px');
    });

    test('Ultra-wide desktop (2560px) has reasonable layout', async ({ page }) => {
      await page.setViewportSize({ width: 2560, height: 1440 });

      await login(page);

      await checkNoHorizontalScroll(page);

      // Content should not stretch to full width on ultra-wide
      const mainContent = page.locator('main, .container, .max-w-').first();
      if (await mainContent.count() > 0) {
        const contentBox = await mainContent.boundingBox();
        if (contentBox) {
          // Content should have reasonable max-width
          expect(contentBox.width).toBeLessThan(2560 * 0.8);
          expect(contentBox.width).toBeGreaterThan(1000);
        }
      }

      await takeScreenshot(page, 'edge-case', '2560px');
    });
  });
});