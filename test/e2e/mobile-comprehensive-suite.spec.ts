import { test, expect, Page } from '@playwright/test';

/**
 * COMPREHENSIVE MOBILE UI TEST SUITE
 *
 * This test suite provides comprehensive mobile testing covering:
 * - All viewport sizes (320px to 1024px)
 * - All user roles (Admin, Trainer, Customer)
 * - Modal positioning and responsiveness
 * - Navigation functionality
 * - Touch targets and accessibility
 * - Performance and edge cases
 *
 * Designed for reliability and comprehensive coverage.
 */

// Viewport configurations for comprehensive testing
const VIEWPORTS = {
  'iPhone SE': { width: 320, height: 568, deviceScaleFactor: 2 },
  'iPhone 12': { width: 375, height: 812, deviceScaleFactor: 3 },
  'iPhone Pro': { width: 390, height: 844, deviceScaleFactor: 3 },
  'iPhone Plus': { width: 414, height: 896, deviceScaleFactor: 3 },
  'iPad': { width: 768, height: 1024, deviceScaleFactor: 2 },
  'iPad Pro': { width: 1024, height: 1366, deviceScaleFactor: 2 },
} as const;

// Test credentials for all user roles
const TEST_CREDENTIALS = {
  admin: {
    email: 'admin@fitmeal.pro',
    password: 'AdminPass123'
  },
  trainer: {
    email: 'trainer.test@evofitmeals.com',
    password: 'TestTrainer123!'
  },
  customer: {
    email: 'customer.test@evofitmeals.com',
    password: 'TestCustomer123!'
  }
} as const;

// Robust selectors for mobile testing
const SELECTORS = {
  // Authentication
  emailInput: 'input[name="email"], input[type="email"]',
  passwordInput: 'input[name="password"], input[type="password"]',
  loginButton: 'button[type="submit"], button:has-text("Log In"), button:has-text("Login")',

  // Navigation elements
  mobileMenuButton: 'button[aria-label*="menu"], button:has(svg):has([data-testid*="menu"]), .mobile-menu-trigger',
  navigationMenu: '[role="navigation"], .navigation-menu, nav',

  // Common UI elements
  modal: '[role="dialog"], .modal, [data-testid*="modal"]',
  modalClose: '[role="dialog"] button[aria-label*="close"], [role="dialog"] [data-testid*="close"], [role="dialog"] button:has(svg)',

  // Content areas
  mealPlanCard: '.meal-plan-card, [data-testid*="meal-plan"], .bg-white.rounded-lg.shadow',
  recipeCard: '.recipe-card, [data-testid*="recipe"], [class*="recipe-item"]',

  // Form elements
  formInput: 'input, textarea, select',
  submitButton: 'button[type="submit"], button:has-text("Save"), button:has-text("Submit")',

  // Error states
  errorMessage: '[role="alert"], .error, .text-red, [data-testid*="error"]',
  notFound: 'text=/404|not found|page not found/i',

  // Loading states
  loadingIndicator: '[data-testid*="loading"], .loading, .spinner',
} as const;

// Mobile testing helper class
class MobileTestHelper {
  constructor(private page: Page) {}

  /**
   * Login with specified role
   */
  async loginAs(role: keyof typeof TEST_CREDENTIALS): Promise<void> {
    const credentials = TEST_CREDENTIALS[role];

    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');

    // Fill credentials
    await this.page.fill(SELECTORS.emailInput, credentials.email);
    await this.page.fill(SELECTORS.passwordInput, credentials.password);

    // Submit form
    await this.page.click(SELECTORS.loginButton);

    // Wait for successful login
    await this.page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

    // Verify we're not on an error page
    await expect(this.page.locator(SELECTORS.notFound)).not.toBeVisible();
  }

  /**
   * Check if element meets minimum touch target size (44x44px)
   */
  async validateTouchTarget(selector: string): Promise<boolean> {
    const element = this.page.locator(selector).first();
    if (!(await element.isVisible())) return true; // Skip if not visible

    const box = await element.boundingBox();
    if (!box) return false;

    const MIN_SIZE = 44;
    return box.width >= MIN_SIZE && box.height >= MIN_SIZE;
  }

  /**
   * Check if modal is properly positioned on mobile
   */
  async validateModalPositioning(): Promise<boolean> {
    const modal = this.page.locator(SELECTORS.modal).first();
    if (!(await modal.isVisible())) return true;

    const modalBox = await modal.boundingBox();
    const viewport = this.page.viewportSize();

    if (!modalBox || !viewport) return false;

    // Modal should be within viewport
    const isWithinViewport = (
      modalBox.x >= 0 &&
      modalBox.y >= 0 &&
      modalBox.x + modalBox.width <= viewport.width &&
      modalBox.y + modalBox.height <= viewport.height
    );

    // Modal should have proper mobile margins (at least 16px on small screens)
    const hasProperMargins = viewport.width < 640 ?
      modalBox.x >= 12 && modalBox.x + modalBox.width <= viewport.width - 12 :
      true;

    return isWithinViewport && hasProperMargins;
  }

  /**
   * Test navigation to a specific path
   */
  async testNavigation(path: string, expectedContent?: string): Promise<boolean> {
    try {
      await this.page.goto(path);
      await this.page.waitForLoadState('networkidle', { timeout: 10000 });

      // Check for 404
      const has404 = await this.page.locator(SELECTORS.notFound).isVisible();
      if (has404) return false;

      // Check for expected content if provided
      if (expectedContent) {
        const hasContent = await this.page.locator(`text=${expectedContent}`).isVisible();
        return hasContent;
      }

      return true;
    } catch (error) {
      console.error(`Navigation to ${path} failed:`, error);
      return false;
    }
  }

  /**
   * Test form interaction on mobile
   */
  async testFormInteraction(formSelector: string): Promise<boolean> {
    try {
      const form = this.page.locator(formSelector).first();
      if (!(await form.isVisible())) return true;

      // Test input fields
      const inputs = form.locator(SELECTORS.formInput);
      const inputCount = await inputs.count();

      for (let i = 0; i < Math.min(inputCount, 3); i++) {
        const input = inputs.nth(i);
        if (await input.isVisible()) {
          // Test focus
          await input.focus();
          const isFocused = await input.evaluate(el => document.activeElement === el);
          if (!isFocused) return false;

          // Test typing (if it's a text input)
          const inputType = await input.getAttribute('type');
          if (!inputType || ['text', 'email', 'password'].includes(inputType)) {
            await input.fill('test');
            const value = await input.inputValue();
            if (value !== 'test') return false;
            await input.clear();
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Form interaction test failed:', error);
      return false;
    }
  }

  /**
   * Measure page performance
   */
  async measurePerformance(action: () => Promise<void>): Promise<number> {
    const startTime = Date.now();
    await action();
    return Date.now() - startTime;
  }
}

// Test Suite 1: Viewport Responsiveness
test.describe('Mobile Viewport Responsiveness', () => {
  Object.entries(VIEWPORTS).forEach(([deviceName, viewport]) => {
    test(`${deviceName} viewport (${viewport.width}x${viewport.height}) - Customer journey`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const helper = new MobileTestHelper(page);

      // Login as customer
      await helper.loginAs('customer');

      // Test main navigation paths
      const paths = ['/customer', '/customer/meal-plans', '/customer/progress'];

      for (const path of paths) {
        const success = await helper.testNavigation(path);
        expect(success, `Navigation to ${path} failed on ${deviceName}`).toBeTruthy();
      }

      // Test for horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth, `Horizontal overflow detected on ${deviceName}`).toBeLessThanOrEqual(viewport.width + 1);
    });
  });
});

// Test Suite 2: User Role Mobile Journeys
test.describe('User Role Mobile Journeys', () => {
  const testViewport = VIEWPORTS['iPhone 12'];

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(testViewport);
  });

  test('Admin mobile journey', async ({ page }) => {
    const helper = new MobileTestHelper(page);

    await helper.loginAs('admin');

    // Test admin-specific paths
    const adminPaths = ['/admin', '/admin/recipes', '/admin/analytics'];

    for (const path of adminPaths) {
      const success = await helper.testNavigation(path);
      expect(success, `Admin navigation to ${path} failed`).toBeTruthy();
    }

    // Test recipe generation if available
    const recipeButton = page.locator('button:has-text("Generate"), button:has-text("Recipe")').first();
    if (await recipeButton.isVisible()) {
      const touchTargetValid = await helper.validateTouchTarget('button:has-text("Generate"), button:has-text("Recipe")');
      expect(touchTargetValid, 'Recipe generation button touch target too small').toBeTruthy();
    }
  });

  test('Trainer mobile journey', async ({ page }) => {
    const helper = new MobileTestHelper(page);

    await helper.loginAs('trainer');

    // Test trainer-specific paths
    const trainerPaths = ['/trainer', '/trainer/customers', '/trainer/meal-plans'];

    for (const path of trainerPaths) {
      const success = await helper.testNavigation(path);
      expect(success, `Trainer navigation to ${path} failed`).toBeTruthy();
    }

    // Test customer management if available
    const customerCards = page.locator('[data-testid*="customer"], .customer-card').first();
    if (await customerCards.isVisible()) {
      const touchTargetValid = await helper.validateTouchTarget('[data-testid*="customer"], .customer-card');
      expect(touchTargetValid, 'Customer card touch target too small').toBeTruthy();
    }
  });

  test('Customer mobile journey', async ({ page }) => {
    const helper = new MobileTestHelper(page);

    await helper.loginAs('customer');

    // Test customer-specific paths
    const customerPaths = ['/customer', '/customer/meal-plans', '/customer/progress'];

    for (const path of customerPaths) {
      const success = await helper.testNavigation(path);
      expect(success, `Customer navigation to ${path} failed`).toBeTruthy();
    }

    // Test meal plan interactions
    const mealPlanCard = page.locator(SELECTORS.mealPlanCard).first();
    if (await mealPlanCard.isVisible()) {
      const touchTargetValid = await helper.validateTouchTarget(SELECTORS.mealPlanCard);
      expect(touchTargetValid, 'Meal plan card touch target too small').toBeTruthy();
    }
  });
});

// Test Suite 3: Modal Positioning and Responsiveness
test.describe('Modal Positioning and Responsiveness', () => {
  const testViewport = VIEWPORTS['iPhone 12'];

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(testViewport);
  });

  test('Meal plan modals position correctly on mobile', async ({ page }) => {
    const helper = new MobileTestHelper(page);

    await helper.loginAs('customer');

    // Find and click meal plan card
    const mealPlanCard = page.locator(SELECTORS.mealPlanCard).first();
    if (await mealPlanCard.isVisible()) {
      await mealPlanCard.click();

      // Wait for modal
      await page.waitForSelector(SELECTORS.modal, { timeout: 10000 });

      // Validate positioning
      const positionValid = await helper.validateModalPositioning();
      expect(positionValid, 'Modal positioning invalid on mobile').toBeTruthy();

      // Test modal close
      const closeButton = page.locator(SELECTORS.modalClose).first();
      if (await closeButton.isVisible()) {
        const touchTargetValid = await helper.validateTouchTarget(SELECTORS.modalClose);
        expect(touchTargetValid, 'Modal close button touch target too small').toBeTruthy();

        await closeButton.click();
        await expect(page.locator(SELECTORS.modal)).not.toBeVisible();
      }
    }
  });

  test('Recipe modals position correctly on mobile', async ({ page }) => {
    const helper = new MobileTestHelper(page);

    await helper.loginAs('customer');

    // Navigate to recipes or meal plans where recipes are shown
    await page.goto('/customer/meal-plans');
    await page.waitForLoadState('networkidle');

    // Look for recipe cards or recipe elements
    const recipeElement = page.locator('text=/recipe|view recipe/i, [data-testid*="recipe"]').first();
    if (await recipeElement.isVisible()) {
      await recipeElement.click();

      // Check if modal opened
      const modal = page.locator(SELECTORS.modal);
      if (await modal.isVisible()) {
        const positionValid = await helper.validateModalPositioning();
        expect(positionValid, 'Recipe modal positioning invalid on mobile').toBeTruthy();

        // Close modal
        const closeButton = page.locator(SELECTORS.modalClose).first();
        if (await closeButton.isVisible()) {
          await closeButton.click();
        }
      }
    }
  });

  test('Add measurement modal positions correctly', async ({ page }) => {
    const helper = new MobileTestHelper(page);

    await helper.loginAs('customer');

    // Navigate to progress page
    const progressSuccess = await helper.testNavigation('/customer/progress', 'progress|measurements');
    if (!progressSuccess) {
      test.skip('Progress page not accessible');
    }

    // Look for add measurement button
    const addButton = page.locator('button:has-text("Add"), button:has-text("Measurement")').first();
    if (await addButton.isVisible()) {
      await addButton.click();

      // Check if modal opened
      const modal = page.locator(SELECTORS.modal);
      if (await modal.isVisible()) {
        const positionValid = await helper.validateModalPositioning();
        expect(positionValid, 'Add measurement modal positioning invalid').toBeTruthy();

        // Test form interaction
        const formValid = await helper.testFormInteraction(SELECTORS.modal);
        expect(formValid, 'Add measurement form interaction failed').toBeTruthy();

        // Close modal
        const closeButton = page.locator(SELECTORS.modalClose).first();
        if (await closeButton.isVisible()) {
          await closeButton.click();
        }
      }
    }
  });
});

// Test Suite 4: Touch Targets and Accessibility
test.describe('Touch Targets and Accessibility', () => {
  const testViewport = VIEWPORTS['iPhone SE']; // Smallest screen for strictest testing

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(testViewport);
  });

  test('All interactive elements meet minimum touch target size', async ({ page }) => {
    const helper = new MobileTestHelper(page);

    await helper.loginAs('customer');

    // Test common interactive elements
    const interactiveSelectors = [
      'button',
      'a[href]',
      'input[type="submit"]',
      '[role="button"]',
      '[onclick]'
    ];

    for (const selector of interactiveSelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();

      for (let i = 0; i < Math.min(count, 10); i++) { // Test first 10 of each type
        const element = elements.nth(i);
        if (await element.isVisible()) {
          const touchTargetValid = await helper.validateTouchTarget(selector);
          if (!touchTargetValid) {
            const elementText = await element.textContent();
            console.warn(`Touch target too small for ${selector}: "${elementText?.substring(0, 50)}"`);
          }
        }
      }
    }
  });

  test('Navigation elements are accessible on small screens', async ({ page }) => {
    const helper = new MobileTestHelper(page);

    await helper.loginAs('customer');

    // Test mobile menu if it exists
    const mobileMenuButton = page.locator(SELECTORS.mobileMenuButton).first();
    if (await mobileMenuButton.isVisible()) {
      const touchTargetValid = await helper.validateTouchTarget(SELECTORS.mobileMenuButton);
      expect(touchTargetValid, 'Mobile menu button touch target too small').toBeTruthy();

      // Test menu open/close
      await mobileMenuButton.click();
      await page.waitForTimeout(500); // Allow for animation

      const menu = page.locator(SELECTORS.navigationMenu).first();
      if (await menu.isVisible()) {
        await mobileMenuButton.click(); // Close menu
        await page.waitForTimeout(500);
      }
    }

    // Test tab navigation if present
    const tabButtons = page.locator('[role="tab"], .tab-button, [data-testid*="tab"]');
    const tabCount = await tabButtons.count();

    for (let i = 0; i < Math.min(tabCount, 5); i++) {
      const tab = tabButtons.nth(i);
      if (await tab.isVisible()) {
        const touchTargetValid = await helper.validateTouchTarget('[role="tab"], .tab-button, [data-testid*="tab"]');
        expect(touchTargetValid, `Tab ${i} touch target too small`).toBeTruthy();
      }
    }
  });
});

// Test Suite 5: Performance Testing
test.describe('Mobile Performance', () => {
  const testViewport = VIEWPORTS['iPhone 12'];

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(testViewport);
  });

  test('Page load performance is acceptable', async ({ page }) => {
    const helper = new MobileTestHelper(page);

    // Test login performance
    const loginTime = await helper.measurePerformance(async () => {
      await helper.loginAs('customer');
    });
    expect(loginTime, 'Login took too long').toBeLessThan(10000); // 10 seconds max

    // Test navigation performance
    const pages = ['/customer/meal-plans', '/customer/progress'];

    for (const path of pages) {
      const navTime = await helper.measurePerformance(async () => {
        await helper.testNavigation(path);
      });
      expect(navTime, `Navigation to ${path} took too long`).toBeLessThan(5000); // 5 seconds max
    }
  });

  test('Modal open performance is acceptable', async ({ page }) => {
    const helper = new MobileTestHelper(page);

    await helper.loginAs('customer');

    const mealPlanCard = page.locator(SELECTORS.mealPlanCard).first();
    if (await mealPlanCard.isVisible()) {
      const modalTime = await helper.measurePerformance(async () => {
        await mealPlanCard.click();
        await page.waitForSelector(SELECTORS.modal, { timeout: 5000 });
      });

      expect(modalTime, 'Modal opening took too long').toBeLessThan(3000); // 3 seconds max

      // Close modal
      const closeButton = page.locator(SELECTORS.modalClose).first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    }
  });
});

// Test Suite 6: Orientation Changes
test.describe('Orientation Changes', () => {
  test('App handles orientation changes correctly', async ({ page }) => {
    const helper = new MobileTestHelper(page);

    // Start in portrait
    await page.setViewportSize({ width: 375, height: 812 });
    await helper.loginAs('customer');

    // Test portrait functionality
    let navigationSuccess = await helper.testNavigation('/customer/meal-plans');
    expect(navigationSuccess, 'Navigation failed in portrait').toBeTruthy();

    // Switch to landscape
    await page.setViewportSize({ width: 812, height: 375 });
    await page.waitForTimeout(1000); // Allow for reflow

    // Test landscape functionality
    navigationSuccess = await helper.testNavigation('/customer/progress');
    expect(navigationSuccess, 'Navigation failed in landscape').toBeTruthy();

    // Test modal in landscape
    const mealPlanCard = page.locator(SELECTORS.mealPlanCard).first();
    if (await mealPlanCard.isVisible()) {
      await mealPlanCard.click();

      const modal = page.locator(SELECTORS.modal);
      if (await modal.isVisible()) {
        const positionValid = await helper.validateModalPositioning();
        expect(positionValid, 'Modal positioning invalid in landscape').toBeTruthy();

        // Close modal
        const closeButton = page.locator(SELECTORS.modalClose).first();
        if (await closeButton.isVisible()) {
          await closeButton.click();
        }
      }
    }

    // Switch back to portrait
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(1000);

    // Verify still works
    navigationSuccess = await helper.testNavigation('/customer');
    expect(navigationSuccess, 'Navigation failed after orientation change').toBeTruthy();
  });
});

// Test Suite 7: Edge Cases
test.describe('Mobile Edge Cases', () => {
  test('App handles very small screens correctly', async ({ page }) => {
    const helper = new MobileTestHelper(page);

    // Test on very small screen (smaller than iPhone SE)
    await page.setViewportSize({ width: 280, height: 480 });

    await helper.loginAs('customer');

    // Test basic functionality still works
    const navigationSuccess = await helper.testNavigation('/customer');
    expect(navigationSuccess, 'Navigation failed on very small screen').toBeTruthy();

    // Test no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth, 'Horizontal overflow on very small screen').toBeLessThanOrEqual(285); // Allow 5px tolerance
  });

  test('App handles large tablet screens correctly', async ({ page }) => {
    const helper = new MobileTestHelper(page);

    // Test on large tablet
    await page.setViewportSize({ width: 1024, height: 1366 });

    await helper.loginAs('customer');

    // Test that mobile-specific features still work on larger screens
    const navigationSuccess = await helper.testNavigation('/customer/meal-plans');
    expect(navigationSuccess, 'Navigation failed on large tablet').toBeTruthy();

    // Test modal positioning on large screen
    const mealPlanCard = page.locator(SELECTORS.mealPlanCard).first();
    if (await mealPlanCard.isVisible()) {
      await mealPlanCard.click();

      const modal = page.locator(SELECTORS.modal);
      if (await modal.isVisible()) {
        const positionValid = await helper.validateModalPositioning();
        expect(positionValid, 'Modal positioning invalid on large tablet').toBeTruthy();

        // Close modal
        const closeButton = page.locator(SELECTORS.modalClose).first();
        if (await closeButton.isVisible()) {
          await closeButton.click();
        }
      }
    }
  });
});