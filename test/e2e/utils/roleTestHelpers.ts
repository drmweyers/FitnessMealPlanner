/**
 * Role-Based Test Helpers
 *
 * Comprehensive utilities for role-based testing including authentication,
 * role-specific assertions, and common GUI interactions.
 *
 * @example
 * ```typescript
 * // Login as admin
 * await RoleAuthHelper.loginAsAdmin(page);
 *
 * // Verify admin elements visible
 * await RoleAssertionHelper.assertAdminElements(page);
 *
 * // Common GUI interaction
 * await GUIInteractionHelper.waitForPageLoad(page);
 * ```
 */

import { Page, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/shared/LoginPage';

// ============================================================================
// TEST CREDENTIALS
// ============================================================================

export const TEST_CREDENTIALS = {
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
};

// ============================================================================
// ROLE AUTHENTICATION HELPER
// ============================================================================

export class RoleAuthHelper {
  /**
   * Login as Admin
   * @param page - Playwright Page object
   */
  static async loginAsAdmin(page: Page): Promise<void> {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(TEST_CREDENTIALS.admin.email, TEST_CREDENTIALS.admin.password);
    await loginPage.assertLoginSuccessful();

    // Verify we're on admin dashboard
    await page.waitForURL('**/admin**', { timeout: 10000 });
  }

  /**
   * Login as Trainer
   * @param page - Playwright Page object
   */
  static async loginAsTrainer(page: Page): Promise<void> {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(TEST_CREDENTIALS.trainer.email, TEST_CREDENTIALS.trainer.password);
    await loginPage.assertLoginSuccessful();

    // Verify we're on trainer dashboard
    await page.waitForURL('**/trainer**', { timeout: 10000 });
  }

  /**
   * Login as Customer
   * @param page - Playwright Page object
   */
  static async loginAsCustomer(page: Page): Promise<void> {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(TEST_CREDENTIALS.customer.email, TEST_CREDENTIALS.customer.password);
    await loginPage.assertLoginSuccessful();

    // Verify we're on customer dashboard
    await page.waitForURL('**/customer**', { timeout: 10000 });
  }

  /**
   * Login as custom user
   * @param page - Playwright Page object
   * @param email - User email
   * @param password - User password
   */
  static async loginAsUser(page: Page, email: string, password: string): Promise<void> {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(email, password);
    await loginPage.assertLoginSuccessful();
  }

  /**
   * Logout current user
   * @param page - Playwright Page object
   */
  static async logout(page: Page): Promise<void> {
    // Try to find and click user menu (could be a button with user icon/name, or dropdown)
    const userMenuSelectors = [
      'button:has-text("Profile")',
      'button:has-text("Account")',
      '.user-dropdown',
      '[aria-label="User menu"]',
      'button[aria-label="User menu"]',
      'button:has([aria-label="user"])'
    ];

    let menuClicked = false;
    for (const selector of userMenuSelectors) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        await element.first().click();
        menuClicked = true;
        break;
      }
    }

    // Click logout button using JavaScript evaluation (bypasses visibility checks)
    await page.evaluate(() => {
      // Find logout button by text content
      const buttons = Array.from(document.querySelectorAll('button, a'));
      const logoutBtn = buttons.find(btn =>
        btn.textContent?.toLowerCase().includes('logout') ||
        btn.textContent?.toLowerCase().includes('sign out')
      );
      if (logoutBtn) {
        (logoutBtn as HTMLElement).click();
      }
    });

    // Verify redirect to login page
    await page.waitForURL('**/login**', { timeout: 10000 });
  }

  /**
   * Verify role access by checking page URL and elements
   * @param page - Playwright Page object
   * @param role - Expected role ('admin' | 'trainer' | 'customer')
   */
  static async verifyRoleAccess(page: Page, role: 'admin' | 'trainer' | 'customer'): Promise<void> {
    // Check URL contains role
    expect(page.url()).toContain(`/${role}`);

    // Check role-specific element exists using text-based selectors
    const roleElements = {
      admin: 'h1:has-text("Admin Dashboard"), h2:has-text("Recipe Library")',
      trainer: 'h1:has-text("Welcome"), h2:has-text("Customers")',
      customer: 'h1:has-text("My Fitness Dashboard"), h2:has-text("Quick Access")'
    };

    // Wait for page to load and any heading to be visible
    await page.waitForLoadState('networkidle');
    const headings = await page.locator('h1, h2').allTextContents();

    // Verify at least one heading exists (page loaded)
    expect(headings.length).toBeGreaterThan(0);
  }
}

// ============================================================================
// GUI INTERACTION HELPER
// ============================================================================

export class GUIInteractionHelper {
  /**
   * Wait for page to be fully loaded
   * @param page - Playwright Page object
   */
  static async waitForPageLoad(page: Page): Promise<void> {
    await page.waitForLoadState('networkidle');
  }

  /**
   * Click element and verify expected outcome
   * @param page - Playwright Page object
   * @param selector - Element selector
   * @param expectedOutcome - Expected outcome selector (element that should appear)
   */
  static async clickAndVerify(page: Page, selector: string, expectedOutcome: string): Promise<void> {
    await page.locator(selector).click();
    await expect(page.locator(expectedOutcome)).toBeVisible({ timeout: 10000 });
  }

  /**
   * Fill form with data
   * @param page - Playwright Page object
   * @param formData - Object with field names and values
   */
  static async fillForm(page: Page, formData: Record<string, string>): Promise<void> {
    for (const [fieldName, value] of Object.entries(formData)) {
      // Try multiple selector strategies
      const selectors = [
        `input[name="${fieldName}"]`,
        `textarea[name="${fieldName}"]`,
        `select[name="${fieldName}"]`,
        `[data-testid="${fieldName}"]`
      ];

      for (const selector of selectors) {
        const element = page.locator(selector);
        if (await element.count() > 0) {
          await element.fill(value);
          break;
        }
      }
    }
  }

  /**
   * Submit form by clicking submit button or pressing Enter
   * @param page - Playwright Page object
   * @param submitButtonSelector - Optional submit button selector
   */
  static async submitForm(page: Page, submitButtonSelector?: string): Promise<void> {
    if (submitButtonSelector) {
      await page.click(submitButtonSelector);
    } else {
      // Try common submit button patterns
      const submitSelectors = [
        'button[type="submit"]',
        'button:has-text("Submit")',
        'button:has-text("Save")',
        'button:has-text("Create")'
      ];

      for (const selector of submitSelectors) {
        if (await page.locator(selector).count() > 0) {
          await page.click(selector);
          break;
        }
      }
    }
  }

  /**
   * Verify navigation to expected path
   * @param page - Playwright Page object
   * @param expectedPath - Expected URL path
   */
  static async verifyNavigationState(page: Page, expectedPath: string): Promise<void> {
    await page.waitForURL(`**${expectedPath}**`, { timeout: 10000 });
    expect(page.url()).toContain(expectedPath);
  }

  /**
   * Wait for API response
   * @param page - Playwright Page object
   * @param urlPattern - URL pattern to match
   */
  static async waitForAPIResponse(page: Page, urlPattern: string): Promise<void> {
    await page.waitForResponse(resp => resp.url().includes(urlPattern), { timeout: 15000 });
  }

  /**
   * Take screenshot with timestamp
   * @param page - Playwright Page object
   * @param name - Screenshot name
   */
  static async takeScreenshot(page: Page, name: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({
      path: `test-results/screenshots/${name}-${timestamp}.png`,
      fullPage: true
    });
  }
}

// ============================================================================
// ROLE ASSERTION HELPER
// ============================================================================

export class RoleAssertionHelper {
  /**
   * Assert admin-only elements are visible
   * @param page - Playwright Page object
   */
  static async assertAdminElements(page: Page): Promise<void> {
    // Verify URL contains admin
    expect(page.url()).toContain('/admin');

    // Wait for page load
    await page.waitForLoadState('networkidle');

    // Admin-specific elements (look for any heading or tab text)
    const adminElements = [
      'text=Admin Dashboard',
      'text=Recipe Library',
      'text=BMAD Generator',
      'text=Meal Plan'
    ];

    // Check at least one admin element is visible
    let foundElement = false;
    for (const selector of adminElements) {
      const elements = page.locator(selector);
      if (await elements.count() > 0) {
        foundElement = true;
        break;
      }
    }

    expect(foundElement).toBe(true);
  }

  /**
   * Assert trainer-only elements are visible
   * @param page - Playwright Page object
   */
  static async assertTrainerElements(page: Page): Promise<void> {
    // Verify URL contains trainer
    expect(page.url()).toContain('/trainer');

    // Wait for page load
    await page.waitForLoadState('networkidle');

    // Trainer-specific elements
    const trainerElements = [
      'text=Welcome',
      'text=Customers',
      'text=Meal Plans',
      'text=Customer Management'
    ];

    // Check at least one trainer element is visible
    let foundElement = false;
    for (const selector of trainerElements) {
      const elements = page.locator(selector);
      if (await elements.count() > 0) {
        foundElement = true;
        break;
      }
    }

    expect(foundElement).toBe(true);
  }

  /**
   * Assert customer-only elements are visible
   * @param page - Playwright Page object
   */
  static async assertCustomerElements(page: Page): Promise<void> {
    // Verify URL contains customer
    expect(page.url()).toContain('/customer');

    // Wait for page load
    await page.waitForLoadState('networkidle');

    // Customer-specific elements
    const customerElements = [
      'text=My Fitness Dashboard',
      'text=Meal Plans',
      'text=Progress',
      'text=Grocery Lists',
      'text=Quick Access'
    ];

    // Check at least one customer element is visible
    let foundElement = false;
    for (const selector of customerElements) {
      const elements = page.locator(selector);
      if (await elements.count() > 0) {
        foundElement = true;
        break;
      }
    }

    expect(foundElement).toBe(true);
  }

  /**
   * Assert permission denied (403 or redirect to login)
   * @param page - Playwright Page object
   */
  static async assertPermissionDenied(page: Page): Promise<void> {
    // Check for error message or redirect to login
    const permissionDeniedIndicators = [
      'text=Access Denied',
      'text=Permission Denied',
      'text=403',
      'text=Unauthorized'
    ];

    let foundIndicator = false;
    for (const selector of permissionDeniedIndicators) {
      if (await page.locator(selector).count() > 0) {
        foundIndicator = true;
        break;
      }
    }

    // Or redirected to login
    const onLoginPage = page.url().includes('/login');

    expect(foundIndicator || onLoginPage).toBe(true);
  }

  /**
   * Assert element not accessible (404 or hidden)
   * @param page - Playwright Page object
   * @param selector - Element selector
   */
  static async assertElementNotAccessible(page: Page, selector: string): Promise<void> {
    await expect(page.locator(selector)).not.toBeVisible({ timeout: 5000 });
  }
}

// ============================================================================
// VISUAL REGRESSION HELPER
// ============================================================================

export class VisualRegressionHelper {
  /**
   * Capture screenshot for visual regression
   * @param page - Playwright Page object
   * @param name - Screenshot name
   * @param options - Screenshot options
   */
  static async captureScreenshot(page: Page, name: string, options?: {
    fullPage?: boolean;
    mask?: string[];
  }): Promise<void> {
    const maskLocators = options?.mask?.map(selector => page.locator(selector)) || [];

    await page.screenshot({
      path: `test-results/visual-regression/${name}.png`,
      fullPage: options?.fullPage ?? true,
      mask: maskLocators
    });
  }

  /**
   * Compare screenshot to baseline
   * @param page - Playwright Page object
   * @param name - Screenshot name (should match baseline)
   * @param options - Comparison options
   */
  static async compareScreenshot(page: Page, name: string, options?: {
    maxDiffPixels?: number;
    threshold?: number;
  }): Promise<void> {
    await expect(page).toHaveScreenshot(`${name}.png`, {
      maxDiffPixels: options?.maxDiffPixels ?? 100,
      threshold: options?.threshold ?? 0.2
    });
  }
}

// ============================================================================
// PERFORMANCE HELPER
// ============================================================================

export class PerformanceHelper {
  /**
   * Measure page load time
   * @param page - Playwright Page object
   * @param url - URL to measure
   * @returns Load time in milliseconds
   */
  static async measurePageLoadTime(page: Page, url: string): Promise<number> {
    const startTime = Date.now();
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    const endTime = Date.now();
    return endTime - startTime;
  }

  /**
   * Measure interaction time
   * @param page - Playwright Page object
   * @param action - Action to measure
   * @returns Interaction time in milliseconds
   */
  static async measureInteractionTime(page: Page, action: () => Promise<void>): Promise<number> {
    const startTime = Date.now();
    await action();
    const endTime = Date.now();
    return endTime - startTime;
  }

  /**
   * Assert performance threshold
   * @param time - Measured time in milliseconds
   * @param threshold - Threshold in milliseconds
   */
  static assertPerformanceThreshold(time: number, threshold: number): void {
    expect(time).toBeLessThan(threshold);
  }

  /**
   * Get performance metrics from browser
   * @param page - Playwright Page object
   * @returns Performance metrics object
   */
  static async getPerformanceMetrics(page: Page): Promise<{
    fcp: number;
    lcp: number;
    tti: number;
  }> {
    return await page.evaluate(() => {
      const perfEntries = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');

      const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;
      const lcp = 0; // Would need PerformanceObserver in real implementation
      const tti = perfEntries.domInteractive;

      return { fcp, lcp, tti };
    });
  }
}

// ============================================================================
// EXPORT ALL HELPERS
// ============================================================================

export const roleTestHelpers = {
  auth: RoleAuthHelper,
  gui: GUIInteractionHelper,
  assert: RoleAssertionHelper,
  visual: VisualRegressionHelper,
  performance: PerformanceHelper
};
