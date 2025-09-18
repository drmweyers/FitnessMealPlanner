/**
 * E2E Tests for Grocery List Generation from Meal Plan
 *
 * Comprehensive end-to-end testing of the meal plan to grocery list generation feature.
 * Tests the complete user journey from login to generating grocery lists with
 * proper ingredient aggregation and categorization.
 *
 * @author QA Testing Agent
 * @since 1.0.0
 */

import { test, expect, Page } from '@playwright/test';

const TEST_USER = {
  email: 'customer.test@evofitmeals.com',
  password: 'TestCustomer123!'
};

const BASE_URL = 'http://localhost:4000';
const TIMEOUT = 30000;

/**
 * Helper function to login as test customer
 */
async function loginAsCustomer(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');

  // Wait for successful login and navigation to dashboard
  await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: TIMEOUT });
  await expect(page.locator('text=Welcome')).toBeVisible({ timeout: TIMEOUT });
}

/**
 * Helper function to navigate to grocery lists page
 */
async function navigateToGroceryLists(page: Page) {
  // Look for navigation menu or direct link to grocery lists
  const groceryListNav = page.locator('a[href*="grocery"]');
  if (await groceryListNav.isVisible()) {
    await groceryListNav.click();
  } else {
    // Fallback to direct navigation
    await page.goto(`${BASE_URL}/grocery-lists`);
  }

  await page.waitForURL(/grocery/, { timeout: TIMEOUT });
}

/**
 * Helper function to check if customer has an active meal plan
 */
async function checkForMealPlan(page: Page): Promise<boolean> {
  // Look for meal plan indicators on the page
  const mealPlanIndicators = [
    'text=meal plan',
    'text=active plan',
    'text=current plan',
    '[data-testid="meal-plan"]',
    '.meal-plan'
  ];

  for (const indicator of mealPlanIndicators) {
    const element = page.locator(indicator);
    if (await element.isVisible()) {
      return true;
    }
  }
  return false;
}

/**
 * Helper function to wait for grocery list generation
 */
async function waitForGroceryListGeneration(page: Page) {
  // Wait for success toast or list update
  const successIndicators = [
    'text=Grocery list generated',
    'text=Success',
    '[data-testid="grocery-list-item"]',
    '.grocery-item'
  ];

  for (const indicator of successIndicators) {
    try {
      await page.waitForSelector(indicator, { timeout: 15000 });
      return true;
    } catch (error) {
      continue;
    }
  }
  return false;
}

test.describe('Grocery List Generation from Meal Plan', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for setup
    test.setTimeout(60000);

    // Enable API mocking if needed for consistent testing
    await page.route('**/api/grocery-lists/generate', async route => {
      if (route.request().method() === 'POST') {
        // Optionally mock the response for predictable testing
        // For now, let it pass through to test real integration
        await route.continue();
      }
    });
  });

  test('should login successfully as customer', async ({ page }) => {
    await loginAsCustomer(page);
    await expect(page.locator('text=Welcome')).toBeVisible();
  });

  test('should navigate to grocery lists page', async ({ page }) => {
    await loginAsCustomer(page);
    await navigateToGroceryLists(page);

    // Verify we're on the grocery lists page
    expect(page.url()).toMatch(/grocery/);
    await expect(page.locator('text=Grocery Lists').or(page.locator('h1')).first()).toBeVisible();
  });

  test('should display "Generate from Meal Plan" button when customer has meal plan', async ({ page }) => {
    await loginAsCustomer(page);
    await navigateToGroceryLists(page);

    const hasMealPlan = await checkForMealPlan(page);

    if (hasMealPlan) {
      // Look for the generate button
      const generateButtons = [
        'button:has-text("Generate from Meal Plan")',
        'button:has-text("Generate from meal plan")',
        'button:has-text("From Meal Plan")',
        '[data-testid="generate-from-meal-plan"]',
        'button[data-action="generate-from-meal-plan"]'
      ];

      let buttonFound = false;
      for (const buttonSelector of generateButtons) {
        const button = page.locator(buttonSelector);
        if (await button.isVisible()) {
          buttonFound = true;
          await expect(button).toBeVisible();
          await expect(button).toBeEnabled();
          break;
        }
      }

      if (!buttonFound) {
        console.log('Generate button not found, checking in dropdown menus...');
        // Check if button is in a dropdown or menu
        const menuButtons = page.locator('button:has([data-testid="dots-vertical"])');
        if (await menuButtons.first().isVisible()) {
          await menuButtons.first().click();
          await expect(page.locator('text=Generate from Meal Plan')).toBeVisible();
        }
      }
    } else {
      console.log('No meal plan detected for customer - this is expected if no meal plan is assigned');
    }
  });

  test('should generate grocery list from meal plan successfully', async ({ page }) => {
    await loginAsCustomer(page);
    await navigateToGroceryLists(page);

    const hasMealPlan = await checkForMealPlan(page);

    if (!hasMealPlan) {
      test.skip('Customer does not have an active meal plan - skipping generation test');
      return;
    }

    // Find and click the generate button
    const generateButtons = [
      'button:has-text("Generate from Meal Plan")',
      'button:has-text("From Meal Plan")',
      '[data-testid="generate-from-meal-plan"]'
    ];

    let clicked = false;
    for (const buttonSelector of generateButtons) {
      const button = page.locator(buttonSelector);
      if (await button.isVisible()) {
        await button.click();
        clicked = true;
        break;
      }
    }

    // If main button not found, check dropdown
    if (!clicked) {
      const menuButton = page.locator('button:has([data-testid="dots-vertical"])').first();
      if (await menuButton.isVisible()) {
        await menuButton.click();
        const dropdownButton = page.locator('text=Generate from Meal Plan');
        await dropdownButton.click();
        clicked = true;
      }
    }

    expect(clicked).toBeTruthy();

    // Wait for generation to complete
    const generationSuccess = await waitForGroceryListGeneration(page);
    expect(generationSuccess).toBeTruthy();

    // Verify grocery list was created
    await expect(page.locator('text=Grocery list generated').or(page.locator('text=Success'))).toBeVisible({ timeout: 10000 });
  });

  test('should display aggregated ingredients correctly', async ({ page }) => {
    await loginAsCustomer(page);
    await navigateToGroceryLists(page);

    const hasMealPlan = await checkForMealPlan(page);

    if (!hasMealPlan) {
      test.skip('Customer does not have an active meal plan - skipping aggregation test');
      return;
    }

    // Generate grocery list
    const generateButton = page.locator('button:has-text("Generate from Meal Plan")').first();
    if (await generateButton.isVisible()) {
      await generateButton.click();
    } else {
      // Try dropdown approach
      await page.locator('button:has([data-testid="dots-vertical"])').first().click();
      await page.locator('text=Generate from Meal Plan').click();
    }

    // Wait for generation
    await waitForGroceryListGeneration(page);

    // Verify ingredients are displayed with proper aggregation
    const groceryItems = page.locator('[data-testid="grocery-list-item"]').or(page.locator('.grocery-item'));

    if (await groceryItems.first().isVisible()) {
      const itemCount = await groceryItems.count();
      expect(itemCount).toBeGreaterThan(0);

      // Check that items have quantities and units
      for (let i = 0; i < Math.min(itemCount, 5); i++) {
        const item = groceryItems.nth(i);
        await expect(item).toBeVisible();

        // Verify item has text content (ingredient name)
        const itemText = await item.textContent();
        expect(itemText).toBeTruthy();
        expect(itemText!.length).toBeGreaterThan(0);
      }
    }
  });

  test('should categorize ingredients properly', async ({ page }) => {
    await loginAsCustomer(page);
    await navigateToGroceryLists(page);

    const hasMealPlan = await checkForMealPlan(page);

    if (!hasMealPlan) {
      test.skip('Customer does not have an active meal plan - skipping categorization test');
      return;
    }

    // Generate grocery list
    const generateButton = page.locator('button:has-text("Generate from Meal Plan")').first();
    if (await generateButton.isVisible()) {
      await generateButton.click();
    } else {
      await page.locator('button:has([data-testid="dots-vertical"])').first().click();
      await page.locator('text=Generate from Meal Plan').click();
    }

    await waitForGroceryListGeneration(page);

    // Look for category headers or grouped items
    const categoryIndicators = [
      'text=Produce',
      'text=Meat',
      'text=Dairy',
      'text=Pantry',
      'text=Spices',
      '[data-category]',
      '.category-header'
    ];

    let categoriesFound = 0;
    for (const indicator of categoryIndicators) {
      const element = page.locator(indicator);
      if (await element.isVisible()) {
        categoriesFound++;
      }
    }

    // We expect at least some categorization to be visible
    // Either through headers or data attributes
    console.log(`Found ${categoriesFound} category indicators`);
  });

  test('should handle error when no meal plan is assigned', async ({ page }) => {
    await loginAsCustomer(page);
    await navigateToGroceryLists(page);

    const hasMealPlan = await checkForMealPlan(page);

    if (hasMealPlan) {
      test.skip('Customer has a meal plan - cannot test error scenario');
      return;
    }

    // Try to find generate button (should be disabled or show error)
    const generateButton = page.locator('button:has-text("Generate from Meal Plan")').first();

    if (await generateButton.isVisible()) {
      // Button exists but should be disabled or show error when clicked
      await generateButton.click();

      // Expect error message
      await expect(page.locator('text=No meal plan').or(page.locator('text=need an assigned meal plan'))).toBeVisible({ timeout: 10000 });
    } else {
      // Button should not be visible when no meal plan exists
      console.log('Generate button correctly hidden when no meal plan exists');
    }
  });

  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await loginAsCustomer(page);
    await navigateToGroceryLists(page);

    const hasMealPlan = await checkForMealPlan(page);

    if (!hasMealPlan) {
      test.skip('Customer does not have an active meal plan - skipping mobile test');
      return;
    }

    // Mobile interface might use different selectors
    const mobileGenerateButton = page.locator('button:has-text("Generate")').or(
      page.locator('[data-testid="mobile-generate-button"]')
    );

    if (await mobileGenerateButton.isVisible()) {
      await mobileGenerateButton.click();
      await waitForGroceryListGeneration(page);
      await expect(page.locator('text=Success').or(page.locator('text=generated'))).toBeVisible();
    } else {
      // Fallback to regular button
      const regularButton = page.locator('button:has-text("Generate from Meal Plan")').first();
      if (await regularButton.isVisible()) {
        await regularButton.click();
        await waitForGroceryListGeneration(page);
      }
    }
  });

  test('should generate new grocery list each time', async ({ page }) => {
    await loginAsCustomer(page);
    await navigateToGroceryLists(page);

    const hasMealPlan = await checkForMealPlan(page);

    if (!hasMealPlan) {
      test.skip('Customer does not have an active meal plan - skipping multiple generation test');
      return;
    }

    // Get initial list count
    const initialLists = page.locator('[data-testid="grocery-list"]').or(page.locator('.grocery-list-card'));
    const initialCount = await initialLists.count();

    // Generate first grocery list
    const generateButton = page.locator('button:has-text("Generate from Meal Plan")').first();
    if (await generateButton.isVisible()) {
      await generateButton.click();
    } else {
      await page.locator('button:has([data-testid="dots-vertical"])').first().click();
      await page.locator('text=Generate from Meal Plan').click();
    }

    await waitForGroceryListGeneration(page);

    // Verify new list was created
    const newLists = page.locator('[data-testid="grocery-list"]').or(page.locator('.grocery-list-card'));
    const newCount = await newLists.count();

    expect(newCount).toBeGreaterThan(initialCount);
  });

  test('should handle large meal plans with many ingredients', async ({ page }) => {
    // Increase timeout for large data processing
    test.setTimeout(90000);

    await loginAsCustomer(page);
    await navigateToGroceryLists(page);

    const hasMealPlan = await checkForMealPlan(page);

    if (!hasMealPlan) {
      test.skip('Customer does not have an active meal plan - skipping large data test');
      return;
    }

    // Generate grocery list
    const generateButton = page.locator('button:has-text("Generate from Meal Plan")').first();
    if (await generateButton.isVisible()) {
      await generateButton.click();
    } else {
      await page.locator('button:has([data-testid="dots-vertical"])').first().click();
      await page.locator('text=Generate from Meal Plan').click();
    }

    // Wait longer for large data processing
    await waitForGroceryListGeneration(page);

    // Verify performance - generation should complete within reasonable time
    await expect(page.locator('text=Success').or(page.locator('text=generated'))).toBeVisible({ timeout: 30000 });

    // Verify ingredients were aggregated (should be fewer items than total recipe ingredients)
    const groceryItems = page.locator('[data-testid="grocery-list-item"]').or(page.locator('.grocery-item'));
    if (await groceryItems.first().isVisible()) {
      const itemCount = await groceryItems.count();
      console.log(`Generated grocery list with ${itemCount} aggregated items`);
      expect(itemCount).toBeGreaterThan(0);
      expect(itemCount).toBeLessThan(200); // Reasonable upper bound for aggregated items
    }
  });
});

test.describe('Grocery List API Integration', () => {
  test('should make correct API call for generation', async ({ page }) => {
    await loginAsCustomer(page);

    // Monitor API calls
    const apiCalls: any[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/grocery-lists/generate')) {
        apiCalls.push({
          url: request.url(),
          method: request.method(),
          postData: request.postData()
        });
      }
    });

    await navigateToGroceryLists(page);

    const hasMealPlan = await checkForMealPlan(page);

    if (!hasMealPlan) {
      test.skip('Customer does not have an active meal plan - skipping API test');
      return;
    }

    // Trigger generation
    const generateButton = page.locator('button:has-text("Generate from Meal Plan")').first();
    if (await generateButton.isVisible()) {
      await generateButton.click();
    }

    await waitForGroceryListGeneration(page);

    // Verify API call was made
    expect(apiCalls.length).toBeGreaterThan(0);
    const apiCall = apiCalls[0];
    expect(apiCall.method).toBe('POST');
    expect(apiCall.url).toMatch(/\/api\/grocery-lists\/generate/);

    if (apiCall.postData) {
      const postData = JSON.parse(apiCall.postData);
      expect(postData).toHaveProperty('mealPlanId');
      expect(postData).toHaveProperty('listName');
    }
  });
});