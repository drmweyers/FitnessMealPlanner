/**
 * E2E Tests for Meal Plan Date Timezone Handling
 *
 * These tests verify that meal plan dates display correctly across different timezones
 * without shifting by one day due to timezone conversion issues.
 *
 * PROBLEM TESTED:
 * - User selects "January 15, 2024" in date picker
 * - Date gets stored as "2024-01-15T00:00:00Z" (UTC midnight)
 * - User in EST (UTC-5) sees "January 14, 2024" instead of "January 15, 2024"
 *
 * SOLUTION:
 * - Use formatDateSafe() utility that extracts UTC date components
 * - Display dates without timezone conversion
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Test configuration
const TEST_ADMIN = {
  email: 'admin@fitmeal.pro',
  password: 'AdminPass123'
};

const TEST_TRAINER = {
  email: 'trainer.test@evofitmeals.com',
  password: 'TestTrainer123!'
};

const TEST_CUSTOMER = {
  email: 'customer.test@evofitmeals.com',
  password: 'TestCustomer123!'
};

/**
 * Helper: Login as specific user
 */
async function loginAs(page: Page, user: { email: string; password: string }) {
  await page.goto('http://localhost:4000/');
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(admin|trainer|customer)/, { timeout: 10000 });
}

/**
 * Helper: Create a meal plan for a customer
 */
async function createMealPlan(page: Page, customerEmail: string, planName: string) {
  // Navigate to customer list
  await page.click('text=Customers');
  await page.waitForSelector('text=Customer Management');

  // Find and click on the customer
  await page.click(`text=${customerEmail}`);
  await page.waitForSelector('text=Customer Details');

  // Click "Create New Meal Plan"
  await page.click('text=Create New Meal Plan');
  await page.waitForSelector('text=Generate Meal Plan');

  // Fill in meal plan details
  await page.fill('input[placeholder*="Plan Name"]', planName);
  await page.selectOption('select[name="fitnessGoal"]', 'Weight Loss');
  await page.fill('input[name="dailyCalorieTarget"]', '2000');
  await page.fill('input[name="days"]', '7');

  // Generate meal plan
  await page.click('button:has-text("Generate Meal Plan")');
  await page.waitForSelector('text=Meal plan generated successfully', { timeout: 30000 });

  // Assign to customer
  await page.click('button:has-text("Assign to Customer")');
  await page.waitForSelector('text=Meal plan assigned successfully', { timeout: 10000 });
}

/**
 * Helper: Get date from element text
 */
function extractDate(text: string): string | null {
  // Match dates in format: MM/DD/YYYY or M/D/YYYY
  const match = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return match ? match[0] : null;
}

test.describe('Meal Plan Date Timezone Handling', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing state
    await page.context().clearCookies();
  });

  test('dates display correctly in EST timezone (UTC-5)', async ({ page, context }) => {
    // Set timezone to EST (UTC-5)
    await context.addInitScript(() => {
      // Mock timezone to EST
      Object.defineProperty(Intl.DateTimeFormat.prototype, 'resolvedOptions', {
        value: () => ({ timeZone: 'America/New_York' })
      });
    });

    // Login as trainer
    await loginAs(page, TEST_TRAINER);

    // Create meal plan with known date
    const today = new Date();
    const planName = `Test Plan ${today.toISOString().split('T')[0]}`;

    await createMealPlan(page, TEST_CUSTOMER.email, planName);

    // Navigate to customer's meal plans
    await page.click('text=Customers');
    await page.click(`text=${TEST_CUSTOMER.email}`);

    // Find the assigned date
    const assignedDateElement = await page.locator('text=/Assigned \\d{1,2}\\/\\d{1,2}\\/\\d{4}/').first();
    const assignedText = await assignedDateElement.textContent();

    // Extract date
    const displayedDate = extractDate(assignedText || '');

    // The displayed date should match today's date (not yesterday)
    const expectedDate = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;

    expect(displayedDate).toBe(expectedDate);
  });

  test('dates display correctly in PST timezone (UTC-8)', async ({ page, context }) => {
    // Set timezone to PST (UTC-8)
    await context.addInitScript(() => {
      Object.defineProperty(Intl.DateTimeFormat.prototype, 'resolvedOptions', {
        value: () => ({ timeZone: 'America/Los_Angeles' })
      });
    });

    // Login as trainer
    await loginAs(page, TEST_TRAINER);

    // Create meal plan
    const today = new Date();
    const planName = `PST Test Plan ${today.toISOString().split('T')[0]}`;

    await createMealPlan(page, TEST_CUSTOMER.email, planName);

    // Navigate to customer's meal plans
    await page.click('text=Customers');
    await page.click(`text=${TEST_CUSTOMER.email}`);

    // Find the assigned date
    const assignedDateElement = await page.locator('text=/Assigned \\d{1,2}\\/\\d{1,2}\\/\\d{4}/').first();
    const assignedText = await assignedDateElement.textContent();

    // Extract date
    const displayedDate = extractDate(assignedText || '');

    // The displayed date should match today's date
    const expectedDate = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;

    expect(displayedDate).toBe(expectedDate);
  });

  test('dates remain consistent when viewed from different timezones', async ({ page, browser }) => {
    // Create a meal plan in EST
    const estContext = await browser.newContext({
      timezoneId: 'America/New_York'
    });
    const estPage = await estContext.newPage();

    await loginAs(estPage, TEST_TRAINER);

    const today = new Date();
    const planName = `Timezone Test ${today.toISOString().split('T')[0]}`;

    await createMealPlan(estPage, TEST_CUSTOMER.email, planName);

    // Get the assigned date in EST
    await estPage.click('text=Customers');
    await estPage.click(`text=${TEST_CUSTOMER.email}`);

    const estAssignedElement = await estPage.locator('text=/Assigned \\d{1,2}\\/\\d{1,2}\\/\\d{4}/').first();
    const estAssignedText = await estAssignedElement.textContent();
    const estDate = extractDate(estAssignedText || '');

    await estContext.close();

    // View the same meal plan in PST
    const pstContext = await browser.newContext({
      timezoneId: 'America/Los_Angeles'
    });
    const pstPage = await pstContext.newPage();

    await loginAs(pstPage, TEST_TRAINER);

    await pstPage.click('text=Customers');
    await pstPage.click(`text=${TEST_CUSTOMER.email}`);

    const pstAssignedElement = await pstPage.locator('text=/Assigned \\d{1,2}\\/\\d{1,2}\\/\\d{4}/').first();
    const pstAssignedText = await pstAssignedElement.textContent();
    const pstDate = extractDate(pstAssignedText || '');

    await pstContext.close();

    // Dates should be the same regardless of timezone
    expect(estDate).toBe(pstDate);
  });

  test('dates near timezone boundaries (11 PM creation)', async ({ page }) => {
    // Login as trainer
    await loginAs(page, TEST_TRAINER);

    // Mock time to be 11 PM local time
    await page.addInitScript(() => {
      const originalDate = Date;
      // @ts-ignore
      globalThis.Date = class extends originalDate {
        constructor(...args: any[]) {
          if (args.length === 0) {
            super();
            this.setHours(23, 0, 0, 0); // 11 PM
          } else {
            // @ts-ignore
            super(...args);
          }
        }
      };
    });

    // Create meal plan at 11 PM
    const today = new Date();
    today.setHours(23, 0, 0, 0);
    const planName = `Late Night Test ${today.toISOString().split('T')[0]}`;

    await createMealPlan(page, TEST_CUSTOMER.email, planName);

    // Navigate to customer's meal plans
    await page.click('text=Customers');
    await page.click(`text=${TEST_CUSTOMER.email}`);

    // Find the assigned date
    const assignedDateElement = await page.locator('text=/Assigned \\d{1,2}\\/\\d{1,2}\\/\\d{4}/').first();
    const assignedText = await assignedDateElement.textContent();

    // Extract date
    const displayedDate = extractDate(assignedText || '');

    // Should still show today's date, not tomorrow
    const expectedDate = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;

    expect(displayedDate).toBe(expectedDate);
  });

  test('customer view shows correct meal plan assigned date', async ({ page }) => {
    // First create a meal plan as trainer
    await loginAs(page, TEST_TRAINER);

    const today = new Date();
    const planName = `Customer View Test ${today.toISOString().split('T')[0]}`;

    await createMealPlan(page, TEST_CUSTOMER.email, planName);

    // Logout
    await page.click('button[aria-label="User menu"]');
    await page.click('text=Logout');

    // Login as customer
    await loginAs(page, TEST_CUSTOMER);

    // Navigate to meal plans
    await page.click('text=My Meal Plans');

    // Find the assigned date on the meal plan card
    const assignedDateElement = await page.locator('text=/Assigned \\d{1,2}\\/\\d{1,2}\\/\\d{4}/').first();
    const assignedText = await assignedDateElement.textContent();

    // Extract date
    const displayedDate = extractDate(assignedText || '');

    // Should match today's date
    const expectedDate = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;

    expect(displayedDate).toBe(expectedDate);
  });

  test('meal plan modal shows correct assignment date', async ({ page }) => {
    // Login as customer
    await loginAs(page, TEST_CUSTOMER);

    // Navigate to meal plans
    await page.click('text=My Meal Plans');

    // Click on first meal plan to open modal
    await page.click('.meal-plan-card').first();

    // Wait for modal to open
    await page.waitForSelector('text=Assignment Details');

    // Find the assignment date in the modal
    const assignmentText = await page.locator('text=/assigned to you on \\d{1,2}\\/\\d{1,2}\\/\\d{4}/i').textContent();

    // Extract date
    const displayedDate = extractDate(assignmentText || '');

    // Date should be valid and not "Invalid Date"
    expect(displayedDate).toBeTruthy();
    expect(displayedDate).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
  });

  test('measurement dates display correctly', async ({ page }) => {
    // Login as trainer
    await loginAs(page, TEST_TRAINER);

    // Navigate to customer
    await page.click('text=Customers');
    await page.click(`text=${TEST_CUSTOMER.email}`);

    // Switch to Progress tab
    await page.click('button[role="tab"]:has-text("Progress")');

    // Wait for measurements to load
    await page.waitForSelector('text=Progress Measurements');

    // Find measurement dates
    const measurementDates = await page.locator('text=/Recorded \\d{1,2}\\/\\d{1,2}\\/\\d{4}/').all();

    // All dates should be valid
    for (const element of measurementDates) {
      const text = await element.textContent();
      const date = extractDate(text || '');

      expect(date).toBeTruthy();
      expect(date).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    }
  });

  test('goal target dates display correctly', async ({ page }) => {
    // Login as trainer
    await loginAs(page, TEST_TRAINER);

    // Navigate to customer
    await page.click('text=Customers');
    await page.click(`text=${TEST_CUSTOMER.email}`);

    // Switch to Goals tab
    await page.click('button[role="tab"]:has-text("Goals")');

    // Wait for goals to load
    await page.waitForSelector('text=Customer Goals');

    // Find goal target dates
    const targetDates = await page.locator('text=/Target Date.*\\d{1,2}\\/\\d{1,2}\\/\\d{4}/').all();

    // All dates should be valid
    for (const element of targetDates) {
      const text = await element.textContent();
      const date = extractDate(text || '');

      expect(date).toBeTruthy();
      expect(date).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    }
  });
});

test.describe('Date Formatting Utilities', () => {
  test('formatDateSafe handles null/undefined gracefully', async ({ page }) => {
    await page.goto('http://localhost:4000/');

    // Test formatDateSafe directly via browser console
    const result = await page.evaluate(() => {
      // @ts-ignore - accessing window-level import
      const { formatDateSafe } = window;

      return {
        nullInput: formatDateSafe(null),
        undefinedInput: formatDateSafe(undefined),
        invalidDate: formatDateSafe('invalid'),
        validDate: formatDateSafe('2024-01-15T00:00:00.000Z')
      };
    });

    expect(result.nullInput).toBe('Unknown');
    expect(result.undefinedInput).toBe('Unknown');
    expect(result.invalidDate).toBe('Invalid Date');
    expect(result.validDate).toMatch(/1\/15\/2024/);
  });

  test('formatDateSafe extracts UTC date components correctly', async ({ page }) => {
    await page.goto('http://localhost:4000/');

    // Test UTC extraction
    const result = await page.evaluate(() => {
      // @ts-ignore
      const { formatDateSafe } = window;

      // Test date at UTC midnight should show as the same day in all timezones
      return formatDateSafe('2024-01-15T00:00:00.000Z');
    });

    // Should always show January 15, not January 14 or 16
    expect(result).toBe('1/15/2024');
  });
});
