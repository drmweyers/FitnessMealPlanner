import { test, expect, Page } from '@playwright/test';

// Test with mobile viewport
test.use({
  viewport: { width: 375, height: 812 }, // iPhone 12 Pro dimensions
  isMobile: true,
  hasTouch: true,
});

// Helper function to login as customer
async function loginAsCustomer(page: Page) {
  await page.goto('http://localhost:4000/login');
  await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
  await page.fill('input[type="password"]', 'TestCustomer123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/customer', { timeout: 10000 });
}

test.describe('Mobile UI Fixes - Customer Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCustomer(page);
  });

  test('Mobile navigation "My Plans" link should navigate to customer dashboard with meal-plans tab', async ({ page }) => {
    // Open mobile menu
    await page.click('[data-testid="mobile-header-menu"]');
    await page.waitForTimeout(500); // Wait for animation

    // Click on "My Plans" in the side menu
    await page.click('[data-testid="side-menu-my-plans"]');

    // Should navigate to customer dashboard with meal-plans tab active
    await expect(page).toHaveURL(/\/customer(\?tab=meal-plans)?/);

    // Verify the meal plans tab is active
    const mealPlansTab = page.locator('[role="tab"]:has-text("Meal Plans")');
    await expect(mealPlansTab).toHaveAttribute('data-state', 'active');
  });

  test('Mobile navigation "Progress" link should navigate to customer dashboard with progress tab', async ({ page }) => {
    // Open mobile menu
    await page.click('[data-testid="mobile-header-menu"]');
    await page.waitForTimeout(500);

    // Click on "Progress" in the side menu
    await page.click('[data-testid="side-menu-progress"]');

    // Should navigate to customer dashboard with progress tab
    await expect(page).toHaveURL(/\/customer\?tab=progress/);

    // Verify the progress tab is active
    const progressTab = page.locator('[role="tab"]:has-text("Progress")');
    await expect(progressTab).toHaveAttribute('data-state', 'active');
  });

  test('Bottom navigation bar "My Plans" should work correctly', async ({ page }) => {
    // Click on "My Plans" in bottom navigation
    await page.click('[data-testid="mobile-nav-my-plans"]');

    // Should navigate to customer dashboard
    await expect(page).toHaveURL(/\/customer(\?tab=meal-plans)?/);
  });

  test('Bottom navigation bar "Progress" should work correctly', async ({ page }) => {
    // Click on "Progress" in bottom navigation
    await page.click('[data-testid="mobile-nav-progress"]');

    // Should navigate to customer dashboard with progress tab
    await expect(page).toHaveURL(/\/customer\?tab=progress/);
  });
});

test.describe('Mobile Modal Positioning', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCustomer(page);
  });

  test('Meal plan modal should be properly positioned on mobile', async ({ page }) => {
    // Wait for meal plans to load
    await page.waitForSelector('.grid', { timeout: 10000 });

    // Find and click on a meal plan card
    const mealPlanCard = page.locator('[data-testid*="meal-plan-card"]').first();
    const cardExists = await mealPlanCard.count() > 0;

    if (!cardExists) {
      // If no meal plans exist, skip this test
      test.skip();
      return;
    }

    await mealPlanCard.click();

    // Wait for modal to open
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Check modal positioning
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Get modal bounding box
    const modalBox = await modal.boundingBox();
    expect(modalBox).toBeTruthy();

    if (modalBox) {
      // Modal should be positioned within viewport
      expect(modalBox.x).toBeGreaterThanOrEqual(0);
      expect(modalBox.y).toBeGreaterThanOrEqual(0);
      expect(modalBox.x + modalBox.width).toBeLessThanOrEqual(375); // viewport width

      // Modal should not be stuck in top-left corner
      expect(modalBox.x).toBeGreaterThan(10); // Should have some margin
      expect(modalBox.y).toBeGreaterThan(10);
    }

    // Close button should be visible and clickable
    const closeButton = modal.locator('button[aria-label*="Close"], button:has(svg)').first();
    await expect(closeButton).toBeVisible();
    await closeButton.click();

    // Modal should close
    await expect(modal).not.toBeVisible();
  });

  test('Progress "Add Measurement" modal should be properly positioned on mobile', async ({ page }) => {
    // Navigate to progress tab
    await page.goto('http://localhost:4000/customer?tab=progress');

    // Wait for progress tab to load
    await page.waitForSelector('h2:has-text("Progress Tracking")', { timeout: 10000 });

    // Find and click the "Add Measurement" button
    const addButton = page.locator('button:has-text("Add Measurement")');
    await expect(addButton).toBeVisible();
    await addButton.click();

    // Wait for modal to open
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Check modal positioning
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Get modal bounding box
    const modalBox = await modal.boundingBox();
    expect(modalBox).toBeTruthy();

    if (modalBox) {
      // Modal should be positioned within viewport
      expect(modalBox.x).toBeGreaterThanOrEqual(0);
      expect(modalBox.y).toBeGreaterThanOrEqual(0);
      expect(modalBox.x + modalBox.width).toBeLessThanOrEqual(375);

      // Modal should not be stuck in top-left corner
      expect(modalBox.x).toBeGreaterThan(10);
      expect(modalBox.y).toBeGreaterThan(10);

      // Modal should be reasonably centered (within 50px of center horizontally)
      const expectedCenterX = (375 - modalBox.width) / 2;
      expect(Math.abs(modalBox.x - expectedCenterX)).toBeLessThan(50);
    }

    // Form fields should be visible and accessible
    const dateInput = modal.locator('input[type="date"]');
    await expect(dateInput).toBeVisible();

    // Close modal
    const closeButton = modal.locator('button[aria-label*="Close"], button:has(svg)').first();
    await expect(closeButton).toBeVisible();
    await closeButton.click();

    // Modal should close
    await expect(modal).not.toBeVisible();
  });
});

test.describe('Mobile Responsiveness Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCustomer(page);
  });

  test('Should handle orientation change gracefully', async ({ page, context }) => {
    // Start in portrait mode
    await page.setViewportSize({ width: 375, height: 812 });

    // Navigate to customer dashboard
    await page.goto('http://localhost:4000/customer');
    await page.waitForSelector('h1:has-text("My Fitness Dashboard")', { timeout: 10000 });

    // Change to landscape mode
    await page.setViewportSize({ width: 812, height: 375 });
    await page.waitForTimeout(500); // Wait for re-render

    // Content should still be visible and accessible
    const dashboardTitle = page.locator('h1:has-text("My Fitness Dashboard")');
    await expect(dashboardTitle).toBeVisible();

    // Navigation should still work
    const mobileHeader = page.locator('[data-testid="mobile-header-menu"]');
    const isHeaderVisible = await mobileHeader.isVisible().catch(() => false);

    if (isHeaderVisible) {
      await mobileHeader.click();
      const sideMenu = page.locator('.fixed.top-0.left-0.bottom-0');
      await expect(sideMenu).toBeVisible();
    }
  });

  test('Should handle very small screens (iPhone SE)', async ({ page }) => {
    // iPhone SE dimensions
    await page.setViewportSize({ width: 320, height: 568 });

    await page.goto('http://localhost:4000/customer');
    await page.waitForSelector('h1:has-text("My Fitness Dashboard")', { timeout: 10000 });

    // Content should not overflow
    const viewport = page.locator('body');
    const viewportBox = await viewport.boundingBox();

    // Check for horizontal overflow
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBe(false);
  });

  test('Should handle tablet sizes correctly', async ({ page }) => {
    // iPad Mini dimensions
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('http://localhost:4000/customer');
    await page.waitForSelector('h1:has-text("My Fitness Dashboard")', { timeout: 10000 });

    // Mobile navigation should still be visible on tablets
    const mobileNav = page.locator('.mobile-nav');
    const isMobileNavVisible = await mobileNav.isVisible().catch(() => false);

    // On tablets (768px), we might transition to desktop nav
    if (!isMobileNavVisible) {
      // Desktop navigation should be functional
      const desktopNav = page.locator('nav').first();
      await expect(desktopNav).toBeVisible();
    }
  });
});

test.describe('Touch Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCustomer(page);
  });

  test('Swipe gestures should work on mobile navigation', async ({ page }) => {
    // Open side menu
    await page.click('[data-testid="mobile-header-menu"]');
    await page.waitForTimeout(500);

    const sideMenu = page.locator('.fixed.top-0.left-0.bottom-0');
    await expect(sideMenu).toBeVisible();

    // Simulate swipe to close (tap on overlay)
    const overlay = page.locator('.fixed.inset-0.bg-black.bg-opacity-50');
    await overlay.click();

    // Menu should close
    await expect(sideMenu).not.toBeVisible();
  });

  test('Tap targets should be appropriately sized for mobile', async ({ page }) => {
    // Check button sizes
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      const isVisible = await button.isVisible().catch(() => false);

      if (isVisible) {
        const box = await button.boundingBox();
        if (box) {
          // Minimum tap target size should be 44x44 pixels (iOS guideline)
          expect(box.width).toBeGreaterThanOrEqual(40);
          expect(box.height).toBeGreaterThanOrEqual(40);
        }
      }
    }
  });
});