import { test, expect, Page, BrowserContext } from '@playwright/test';

// Mobile viewport configuration
const MOBILE_VIEWPORT = { width: 375, height: 812 }; // iPhone X dimensions
const TABLET_VIEWPORT = { width: 768, height: 1024 }; // iPad dimensions

// Test user credentials
const CUSTOMER_CREDENTIALS = {
  email: 'customer.test@evofitmeals.com',
  password: 'TestCustomer123!'
};

// Helper function to login as customer
async function loginAsCustomer(page: Page) {
  await page.goto('http://localhost:4000/login');
  await page.fill('input[name="email"]', CUSTOMER_CREDENTIALS.email);
  await page.fill('input[name="password"]', CUSTOMER_CREDENTIALS.password);
  await page.click('button[type="submit"]');
  
  // Wait for successful login redirect - may redirect to /customer or /my-meal-plans
  await page.waitForURL((url) => {
    return url.pathname.includes('/customer') || url.pathname.includes('/my-meal-plans');
  }, { timeout: 10000 });
  
  // Verify we're logged in by checking for customer-specific content
  await page.waitForTimeout(2000); // Wait for page to stabilize
  const dashboardIndicator = page.locator('text=/dashboard|meal plan|my plans/i').first();
  await expect(dashboardIndicator).toBeVisible({ timeout: 10000 });
}

// Helper to check if element is visible in viewport
async function isElementInViewport(page: Page, selector: string): Promise<boolean> {
  const element = page.locator(selector).first();
  const box = await element.boundingBox();
  if (!box) return false;
  
  const viewport = page.viewportSize();
  if (!viewport) return false;
  
  return (
    box.x >= 0 &&
    box.y >= 0 &&
    box.x + box.width <= viewport.width &&
    box.y + box.height <= viewport.height
  );
}

test.describe('Mobile UI Fixes - Customer Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize(MOBILE_VIEWPORT);
  });

  test('Modal opens correctly when clicking Meal Plan Card on mobile', async ({ page }) => {
    await loginAsCustomer(page);
    
    // Wait for meal plan cards to load
    await page.waitForSelector('.hover\\:shadow-lg', { timeout: 10000 });
    
    // Find and click the first meal plan card
    const mealPlanCard = page.locator('.hover\\:shadow-lg').first();
    await expect(mealPlanCard).toBeVisible();
    await mealPlanCard.click();
    
    // Wait for modal to open
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    
    // Check if modal is properly positioned
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    // Verify modal is centered in viewport
    const modalBox = await modal.boundingBox();
    const viewport = page.viewportSize();
    
    if (modalBox && viewport) {
      // Check horizontal centering (with some tolerance)
      const horizontalCenter = modalBox.x + modalBox.width / 2;
      const viewportCenter = viewport.width / 2;
      expect(Math.abs(horizontalCenter - viewportCenter)).toBeLessThan(50);
      
      // Check vertical positioning (should be visible in viewport)
      expect(modalBox.y).toBeGreaterThanOrEqual(0);
      expect(modalBox.y).toBeLessThan(viewport.height - 100);
    }
    
    // Verify modal content is visible
    await expect(page.locator('[role="dialog"] h2, [role="dialog"] [class*="DialogTitle"]').first()).toBeVisible();
    
    // Verify close button is accessible
    const closeButton = page.locator('[role="dialog"] button[aria-label="Close"], [role="dialog"] button:has(svg)').first();
    await expect(closeButton).toBeVisible();
    
    // Close the modal
    await closeButton.click();
    await expect(modal).not.toBeVisible();
  });

  test('My Plans navigation works correctly on mobile', async ({ page }) => {
    await loginAsCustomer(page);
    
    // Check if mobile navigation is visible
    const mobileNav = page.locator('.mobile-nav, [data-testid*="mobile-nav"]').first();
    await expect(mobileNav.or(page.locator('nav')).first()).toBeVisible();
    
    // Test navigation via mobile menu
    // First, open the mobile menu if it exists
    const menuButton = page.locator('[data-testid="mobile-nav-more"], button:has-text("More"), button[aria-label*="menu"]').first();
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(500); // Wait for menu animation
    }
    
    // Click on My Plans link
    const myPlansLink = page.locator('button:has-text("My Plans"), a:has-text("My Plans"), [data-testid*="my-plans"]').first();
    if (await myPlansLink.isVisible()) {
      await myPlansLink.click();
    } else {
      // Try direct navigation
      await page.goto('http://localhost:4000/customer/meal-plans');
    }
    
    // Verify we're on the correct page (should show meal plans)
    await page.waitForTimeout(1000);
    
    // Check that we're not on a 404 page
    const notFoundText = page.locator('text=/404|not found|page not found/i');
    await expect(notFoundText).not.toBeVisible();
    
    // Verify meal plans content is visible
    const mealPlansContent = page.locator('text=/meal plan|my plans|active plans/i').first();
    await expect(mealPlansContent).toBeVisible({ timeout: 10000 });
  });

  test('Progress TAB Add Measurement modal opens correctly on mobile', async ({ page }) => {
    await loginAsCustomer(page);
    
    // Navigate to Progress tab
    const progressTab = page.locator('button:has-text("Progress"), [role="tab"]:has-text("Progress")').first();
    if (await progressTab.isVisible()) {
      await progressTab.click();
    } else {
      // Direct navigation to progress
      await page.goto('http://localhost:4000/customer/progress');
    }
    
    // Wait for Progress content to load
    await page.waitForSelector('text=/progress|measurements|photos|goals/i', { timeout: 10000 });
    
    // Click on Measurements tab if it exists
    const measurementsTab = page.locator('button:has-text("Measurements"), [role="tab"]:has-text("Measurements")').first();
    if (await measurementsTab.isVisible()) {
      await measurementsTab.click();
      await page.waitForTimeout(500);
    }
    
    // Find and click Add Measurement button
    const addMeasurementButton = page.locator('button:has-text("Add Measurement")').first();
    await expect(addMeasurementButton).toBeVisible({ timeout: 10000 });
    await addMeasurementButton.click();
    
    // Wait for modal to open
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    
    // Check if modal is properly positioned
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    // Verify modal is centered and visible
    const modalBox = await modal.boundingBox();
    const viewport = page.viewportSize();
    
    if (modalBox && viewport) {
      // Check that modal is within viewport
      expect(modalBox.x).toBeGreaterThanOrEqual(0);
      expect(modalBox.y).toBeGreaterThanOrEqual(0);
      expect(modalBox.x + modalBox.width).toBeLessThanOrEqual(viewport.width + 20); // Small tolerance
      
      // Modal should be visible in the current viewport
      const modalTop = modalBox.y;
      expect(modalTop).toBeLessThan(viewport.height - 100);
    }
    
    // Verify modal content is accessible
    const modalTitle = page.locator('[role="dialog"] h2:has-text("Add New Measurement"), [role="dialog"] [class*="DialogTitle"]:has-text("Measurement")').first();
    await expect(modalTitle).toBeVisible();
    
    // Verify form fields are accessible
    const dateInput = page.locator('[role="dialog"] input[type="date"]').first();
    await expect(dateInput).toBeVisible();
    
    // Test scrolling within modal if content is long
    const modalContent = page.locator('[role="dialog"] [class*="DialogContent"], [role="dialog"] form').first();
    if (await modalContent.isVisible()) {
      // Scroll to bottom of modal
      await modalContent.evaluate(el => el.scrollTop = el.scrollHeight);
      await page.waitForTimeout(200);
      
      // Verify submit button is accessible at bottom
      const submitButton = page.locator('[role="dialog"] button[type="submit"], [role="dialog"] button:has-text("Save")').first();
      if (await submitButton.isVisible()) {
        await expect(submitButton).toBeInViewport();
      }
    }
    
    // Close the modal
    const closeButton = page.locator('[role="dialog"] button[aria-label="Close"], [role="dialog"] button:has(svg[class*="X"]), [role="dialog"] button:has(svg[class*="close"])').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
      await expect(modal).not.toBeVisible();
    }
  });

  test('Modal scrolling works on mobile devices', async ({ page }) => {
    await loginAsCustomer(page);
    
    // Open a meal plan modal
    await page.waitForSelector('.hover\\:shadow-lg', { timeout: 10000 });
    const mealPlanCard = page.locator('.hover\\:shadow-lg').first();
    await mealPlanCard.click();
    
    // Wait for modal
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    const modal = page.locator('[role="dialog"]');
    
    // Test touch scrolling simulation
    const modalContent = modal.locator('[class*="DialogContent"], [class*="overflow"]').first();
    if (await modalContent.isVisible()) {
      // Simulate touch scroll
      await modalContent.evaluate(el => {
        el.scrollTop = 100;
      });
      await page.waitForTimeout(200);
      
      // Verify scroll worked
      const scrollTop = await modalContent.evaluate(el => el.scrollTop);
      expect(scrollTop).toBeGreaterThan(0);
    }
  });

  test('All navigation links work on mobile viewport', async ({ page }) => {
    await loginAsCustomer(page);
    
    const navigationTests = [
      { path: '/customer', expectedText: /dashboard|meal plan|active plans/i },
      { path: '/customer/meal-plans', expectedText: /meal plan|my plans|active plans/i },
      { path: '/customer/progress', expectedText: /progress|measurements|photos|goals/i }
    ];
    
    for (const navTest of navigationTests) {
      await page.goto(`http://localhost:4000${navTest.path}`);
      await page.waitForTimeout(1000);
      
      // Check we're not on 404
      const notFound = page.locator('text=/404|not found/i');
      await expect(notFound).not.toBeVisible();
      
      // Check expected content is visible
      const content = page.locator(`text=${navTest.expectedText}`).first();
      await expect(content).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('Tablet UI Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(TABLET_VIEWPORT);
  });

  test('Modals work correctly on tablet viewport', async ({ page }) => {
    await loginAsCustomer(page);
    
    // Test meal plan modal
    await page.waitForSelector('.hover\\:shadow-lg', { timeout: 10000 });
    const mealPlanCard = page.locator('.hover\\:shadow-lg').first();
    await mealPlanCard.click();
    
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    // Verify positioning on tablet
    const modalBox = await modal.boundingBox();
    const viewport = page.viewportSize();
    
    if (modalBox && viewport) {
      // Should be centered on tablet too
      const horizontalCenter = modalBox.x + modalBox.width / 2;
      const viewportCenter = viewport.width / 2;
      expect(Math.abs(horizontalCenter - viewportCenter)).toBeLessThan(100);
    }
  });
});

test.describe('Edge Cases and User Experience', () => {
  test('Handles rapid navigation without errors', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await loginAsCustomer(page);
    
    // Rapidly switch between tabs
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("Progress"), [role="tab"]:has-text("Progress")');
      await page.waitForTimeout(100);
      await page.click('button:has-text("Meal Plans"), [role="tab"]:has-text("Meal Plans")');
      await page.waitForTimeout(100);
    }
    
    // Verify no errors and content still loads
    const content = page.locator('text=/meal plan|progress/i').first();
    await expect(content).toBeVisible();
  });

  test('Modals handle multiple open/close cycles', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await loginAsCustomer(page);
    
    for (let i = 0; i < 3; i++) {
      // Open modal
      const card = page.locator('.hover\\:shadow-lg').first();
      await card.click();
      
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
      
      // Close modal
      const closeButton = page.locator('[role="dialog"] button[aria-label="Close"], [role="dialog"] button:has(svg)').first();
      await closeButton.click();
      await expect(modal).not.toBeVisible();
      
      await page.waitForTimeout(200);
    }
  });

  test('Handles orientation changes gracefully', async ({ page, context }) => {
    // Start in portrait
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAsCustomer(page);
    
    // Open a modal
    const card = page.locator('.hover\\:shadow-lg').first();
    await card.click();
    
    let modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    // Switch to landscape
    await page.setViewportSize({ width: 812, height: 375 });
    await page.waitForTimeout(500);
    
    // Modal should still be visible and centered
    modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    // Switch back to portrait
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    
    // Modal should still be functional
    modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
  });

  test('Forms in modals are fully accessible on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await loginAsCustomer(page);
    
    // Navigate to progress and open measurement modal
    await page.click('button:has-text("Progress"), [role="tab"]:has-text("Progress")');
    await page.waitForTimeout(1000);
    
    const addButton = page.locator('button:has-text("Add Measurement")').first();
    await addButton.click();
    
    // Test form field accessibility
    const dateField = page.locator('[role="dialog"] input[type="date"]').first();
    await expect(dateField).toBeVisible();
    await dateField.fill('2024-01-15');
    
    // Test numeric inputs
    const weightField = page.locator('[role="dialog"] input[placeholder*="0.0"]').first();
    if (await weightField.isVisible()) {
      await weightField.fill('150.5');
      const value = await weightField.inputValue();
      expect(value).toBe('150.5');
    }
  });
});

test.describe('Performance and Loading States', () => {
  test('Modals open within acceptable time on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await loginAsCustomer(page);
    
    const startTime = Date.now();
    
    // Click meal plan card
    const card = page.locator('.hover\\:shadow-lg').first();
    await card.click();
    
    // Wait for modal
    await page.waitForSelector('[role="dialog"]', { timeout: 3000 });
    
    const endTime = Date.now();
    const loadTime = endTime - startTime;
    
    // Modal should open within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('Navigation transitions are smooth', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await loginAsCustomer(page);
    
    // Measure tab switch time
    const startTime = Date.now();
    
    await page.click('button:has-text("Progress"), [role="tab"]:has-text("Progress")');
    await page.waitForSelector('text=/measurements|photos|goals/i', { timeout: 2000 });
    
    const endTime = Date.now();
    const transitionTime = endTime - startTime;
    
    // Tab switch should be fast
    expect(transitionTime).toBeLessThan(2000);
  });
});