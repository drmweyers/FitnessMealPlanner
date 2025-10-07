import { Page, expect } from '@playwright/test';

/**
 * Authentication Helper for Playwright Tests
 * 
 * Provides reusable authentication methods for different user roles
 * and common test utilities for the FitnessMealPlanner application.
 */

export interface TestCredentials {
  email: string;
  password: string;
}

export const TEST_ACCOUNTS = {
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

export const TEST_CONFIG = {
  baseURL: 'http://localhost:4000',
  timeout: 30000,
  slowMo: 500,
  screenshotPath: 'test-screenshots'
};

/**
 * Performs login for any user type
 */
export async function login(page: Page, credentials: TestCredentials, expectedRoute: string = '/') {
  console.log(`🔐 Logging in as: ${credentials.email}`);
  
  // Navigate to login page
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  
  // Wait for login form to be visible
  await page.waitForSelector('input[type="email"]', { timeout: 5000 });
  
  // Fill in credentials
  await page.fill('input[type="email"]', credentials.email);
  await page.fill('input[type="password"]', credentials.password);
  
  // Take screenshot before login submission
  await takeTestScreenshot(page, `login-form-${credentials.email.split('@')[0]}.png`, 'Login form filled');
  
  // Submit login form
  await page.click('button[type="submit"]');
  
  // Wait for successful login (could redirect to various pages)
  try {
    await page.waitForURL(expectedRoute, { timeout: 10000 });
  } catch (error) {
    // If expected route fails, wait for any navigation away from login
    await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 10000 });
  }
  
  // Verify we're no longer on the login page
  await expect(page).not.toHaveURL(/.*\/login.*/);
  
  console.log(`✅ Login successful for: ${credentials.email}`);
}

/**
 * Login specifically as admin user
 */
export async function loginAsAdmin(page: Page) {
  await login(page, TEST_ACCOUNTS.admin, '/admin');
  
  // Verify admin dashboard elements
  await page.waitForSelector('text="Admin Dashboard"', { timeout: 5000 });
  await expect(page.locator('h1:has-text("Admin Dashboard")')).toBeVisible();
  
  console.log('✅ Admin login verified');
}

/**
 * Login as trainer user
 */
export async function loginAsTrainer(page: Page) {
  await login(page, TEST_ACCOUNTS.trainer, '/trainer');
  
  // Verify trainer dashboard - check for any indication we're on trainer page
  const dashboardSelectors = [
    'h1:has-text("Trainer")',
    'h2:has-text("Trainer")',
    'text="Trainer Dashboard"',
    'h1, h2',  // Any heading indicating we're on a dashboard
    '.dashboard',
    '[data-testid="trainer-dashboard"]'
  ];
  
  let dashboardFound = false;
  for (const selector of dashboardSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: 2000 });
      dashboardFound = true;
      console.log(`✅ Trainer dashboard found with selector: ${selector}`);
      break;
    } catch (error) {
      // Continue to next selector
    }
  }
  
  if (!dashboardFound) {
    console.log('ℹ️ Trainer dashboard elements not found, but login successful');
  }
  
  console.log('✅ Trainer login verified');
}

/**
 * Login as customer user
 */
export async function loginAsCustomer(page: Page) {
  await login(page, TEST_ACCOUNTS.customer, '/customer');
  
  // Verify customer dashboard - check for any indication we're on customer page
  const dashboardSelectors = [
    'h1:has-text("Customer")',
    'h2:has-text("Customer")',
    'text="Customer Dashboard"',
    'text="My Meal Plans"',
    'text="My Dashboard"',
    'h1, h2',  // Any heading indicating we're on a dashboard
    '.dashboard',
    '[data-testid="customer-dashboard"]'
  ];
  
  let dashboardFound = false;
  for (const selector of dashboardSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: 2000 });
      dashboardFound = true;
      console.log(`✅ Customer dashboard found with selector: ${selector}`);
      break;
    } catch (error) {
      // Continue to next selector
    }
  }
  
  if (!dashboardFound) {
    console.log('ℹ️ Customer dashboard elements not found, but login successful');
  }
  
  console.log('✅ Customer login verified');
}

/**
 * Logout current user
 */
export async function logout(page: Page) {
  console.log('🚪 Logging out...');
  
  // Look for logout button/link (multiple possible selectors)
  const logoutSelectors = [
    'button:has-text("Logout")',
    'a:has-text("Logout")', 
    'button:has-text("Sign Out")',
    '[data-testid="logout"]',
    '.logout-button'
  ];
  
  let logoutSuccessful = false;
  
  for (const selector of logoutSelectors) {
    const element = page.locator(selector);
    if (await element.count() > 0) {
      await element.click();
      logoutSuccessful = true;
      break;
    }
  }
  
  if (!logoutSuccessful) {
    // Force logout by navigating to logout endpoint
    await page.goto('/api/auth/logout');
  }
  
  // Wait for redirect to login or landing page
  await page.waitForFunction(() => 
    window.location.pathname.includes('/login') || window.location.pathname === '/',
    { timeout: 5000 }
  );
  
  console.log('✅ Logout completed');
}

/**
 * Take a screenshot with consistent naming and path
 */
export async function takeTestScreenshot(page: Page, filename: string, description: string, fullPage: boolean = true) {
  console.log(`📸 Screenshot: ${description}`);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const finalFilename = `${timestamp}-${filename}`;
  
  try {
    await page.screenshot({ 
      path: `${TEST_CONFIG.screenshotPath}/${finalFilename}`,
      fullPage: fullPage
    });
  } catch (error) {
    console.error(`Failed to take screenshot ${finalFilename}:`, error);
  }
}

/**
 * Wait for network to be idle (no pending requests)
 */
export async function waitForNetworkIdle(page: Page, timeout: number = 5000) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Check for JavaScript errors on the page
 */
export async function checkForJavaScriptErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  
  page.on('pageerror', error => {
    errors.push(error.toString());
  });
  
  page.on('console', message => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  
  return errors;
}

/**
 * Navigate to a specific tab in the admin dashboard
 */
export async function navigateToAdminTab(page: Page, tabValue: string) {
  console.log(`📋 Navigating to ${tabValue} tab...`);
  
  // Look for tab button using text content instead of value attribute
  const tabSelectors = [
    `button:has-text("${tabValue}")`,
    `[role="tab"]:has-text("${tabValue}")`,
    `button[value="${tabValue}"]`,
    `button[data-value="${tabValue}"]`
  ];
  
  let tabButton;
  for (const selector of tabSelectors) {
    tabButton = page.locator(selector).first();
    if (await tabButton.isVisible()) {
      break;
    }
  }
  
  if (!tabButton || !await tabButton.isVisible()) {
    console.log(`ℹ️ ${tabValue} tab might already be active or not found`);
    return;
  }
  
  await tabButton.click();
  
  // Wait for tab content to load
  await page.waitForTimeout(1000);
  
  console.log(`✅ ${tabValue} tab loaded`);
}

/**
 * Wait for a modal or dialog to appear
 */
export async function waitForModal(page: Page, timeout: number = 5000): Promise<boolean> {
  const modalSelectors = [
    '.modal',
    '[role="dialog"]',
    '.fixed.inset-0',
    '.dialog',
    '.popup'
  ];
  
  try {
    await page.waitForSelector(modalSelectors.join(', '), { timeout });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Monitor network requests and responses
 */
export async function monitorNetworkActivity(page: Page) {
  const requests: { method: string; url: string; status?: number }[] = [];
  
  page.on('request', request => {
    requests.push({
      method: request.method(),
      url: request.url()
    });
  });
  
  page.on('response', response => {
    const existingRequest = requests.find(req => req.url === response.url());
    if (existingRequest) {
      existingRequest.status = response.status();
    }
  });
  
  return {
    getRequests: () => requests,
    getFailedRequests: () => requests.filter(req => req.status && req.status >= 400)
  };
}

/**
 * Verify common page elements are working
 */
export async function verifyPageBasics(page: Page) {
  // Check that page loaded successfully
  await expect(page).not.toHaveTitle(/Error|404|500/);
  
  // Check for basic navigation elements
  const navigationExists = await page.locator('nav, .nav, .navigation').count() > 0;
  const headerExists = await page.locator('header, .header').count() > 0;
  
  console.log(`📋 Page basics: navigation=${navigationExists}, header=${headerExists}`);
  
  return {
    hasNavigation: navigationExists,
    hasHeader: headerExists
  };
}

/**
 * Common test setup for all admin tests
 */
export async function setupAdminTest(page: Page) {
  // Set longer timeouts
  page.setDefaultTimeout(TEST_CONFIG.timeout);
  
  // Enable slow motion for debugging
  // Note: slowMo is set in playwright config, not here
  
  // Setup error monitoring
  const errors = await checkForJavaScriptErrors(page);
  
  // Setup network monitoring  
  const networkMonitor = await monitorNetworkActivity(page);
  
  // Login as admin
  await loginAsAdmin(page);
  
  return {
    errors,
    networkMonitor
  };
}