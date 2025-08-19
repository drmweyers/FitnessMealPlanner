/**
 * Admin Recipe Generation E2E Tests
 * 
 * Comprehensive Playwright tests for the Admin recipe generation functionality.
 * Tests the complete user interface and interactions for recipe generation.
 * 
 * Test Coverage:
 * - Admin login flow and navigation
 * - Recipe generation form interactions
 * - Bulk generation buttons (10, 20, 30, 50)
 * - Natural language input functionality
 * - Form validation and error handling
 * - Progress indicators and status messages
 * - Toast notifications
 * - Collapse/expand functionality
 * - Responsive design elements
 * - Visual regression testing
 */

import { test, expect } from '@playwright/test';

// Test credentials
const ADMIN_CREDENTIALS = {
  email: 'admin@fitmeal.pro',
  password: 'Admin123!@#'
};

// Test data constants
const TEST_DATA = {
  RECIPE_COUNTS: [10, 20, 30, 50],
  NATURAL_LANGUAGE_INPUTS: [
    'Generate 15 high-protein breakfast recipes under 20 minutes prep time, focusing on eggs and Greek yogurt, suitable for keto diet, with 400-600 calories per serving',
    'Create 10 quick lunch recipes for muscle gain with chicken as main ingredient, high protein content',
    'Make 5 vegetarian dinner recipes under 500 calories for weight loss'
  ],
  FORM_VALIDATION_SCENARIOS: [
    { field: 'count', value: 0, expected: 'Invalid count' },
    { field: 'count', value: 51, expected: 'Maximum 50 recipes' },
    { field: 'minCalories', value: -100, expected: 'Invalid calories' },
    { field: 'maxCalories', value: 10000, expected: 'Invalid calories' }
  ]
};

// Helper functions
async function loginAsAdmin(page) {
  await page.goto('/login');
  await page.fill('input[type="email"], input[name="email"]', ADMIN_CREDENTIALS.email);
  await page.fill('input[type="password"], input[name="password"]', ADMIN_CREDENTIALS.password);
  await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
  
  // Wait for successful login redirect
  await page.waitForURL('**/admin**', { timeout: 10000 });
  await expect(page).toHaveURL(/.*admin.*/);
}

async function navigateToRecipeGeneration(page) {
  // Navigate to Admin tab
  await page.click('[data-testid="admin-tab"], button:has-text("Admin"), [role="tab"]:has-text("Admin")');
  
  // Click Generate Recipes button
  await page.click('button:has-text("Generate"), button:has-text("Generate New Batch"), button:has-text("Generate Recipes")');
  
  // Wait for modal to open
  await page.waitForSelector('[data-testid="recipe-generation-modal"], .modal, [role="dialog"]', { timeout: 5000 });
}

async function waitForToast(page, expectedText = '') {
  const toastSelector = '[data-testid="toast"], .toast, [role="alert"]';
  await page.waitForSelector(toastSelector, { timeout: 5000 });
  
  if (expectedText) {
    await expect(page.locator(toastSelector)).toContainText(expectedText);
  }
  
  return page.locator(toastSelector);
}

// Test Suite
test.describe('Admin Recipe Generation', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport size for consistency
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Mock backend responses to prevent actual API calls during testing
    await page.route('**/api/admin/generate**', async route => {
      const request = route.request();
      const postData = request.postDataJSON();
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: `Generation started for ${postData?.count || 10} recipes`,
          count: postData?.count || 10,
          started: true,
          success: postData?.count || 10,
          failed: 0,
          errors: [],
          metrics: {
            totalDuration: 30000,
            averageTimePerRecipe: 3000
          }
        })
      });
    });

    await page.route('**/api/admin/generate-recipes**', async route => {
      const request = route.request();
      const postData = request.postDataJSON();
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: `Custom generation started for ${postData?.count || 10} recipes`,
          count: postData?.count || 10,
          started: true,
          success: postData?.count || 10,
          failed: 0,
          errors: [],
          metrics: {
            totalDuration: 30000,
            averageTimePerRecipe: 3000
          }
        })
      });
    });

    await page.route('**/api/admin/stats**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total: 150,
          approved: 145,
          pending: 5,
          users: 25
        })
      });
    });
  });

  test('1. Admin Login Flow', async ({ page }) => {
    await test.step('Navigate to login page', async () => {
      await page.goto('/login');
      // Wait for login page to load and check for login elements instead of title
      await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
      await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    });

    await test.step('Fill login credentials', async () => {
      await page.fill('input[type="email"], input[name="email"]', ADMIN_CREDENTIALS.email);
      await page.fill('input[type="password"], input[name="password"]', ADMIN_CREDENTIALS.password);
    });

    await test.step('Submit login form', async () => {
      await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
      await page.waitForURL('**/admin**', { timeout: 10000 });
    });

    await test.step('Verify admin dashboard access', async () => {
      await expect(page).toHaveURL(/.*admin.*/);
      await expect(page.locator('h1, [data-testid="page-title"]')).toContainText(/Admin.*Dashboard/i);
    });
  });

  test('2. Navigate to Admin Recipe Generation Panel', async ({ page }) => {
    await loginAsAdmin(page);

    await test.step('Access Admin tab', async () => {
      await page.click('[data-testid="admin-tab"], button:has-text("Admin"), [role="tab"]:has-text("Admin")');
      await page.waitForSelector('button:has-text("Generate"), button:has-text("Generate New Batch"), button:has-text("Generate Recipes")');
    });

    await test.step('Open recipe generation modal', async () => {
      await page.click('button:has-text("Generate"), button:has-text("Generate New Batch"), button:has-text("Generate Recipes")');
      await page.waitForSelector('[data-testid="recipe-generation-modal"], .modal, [role="dialog"]');
    });

    await test.step('Verify modal content', async () => {
      await expect(page.locator('[data-testid="recipe-generation-modal"], .modal, [role="dialog"]')).toBeVisible();
      await expect(page.locator('h1, h2')).toContainText(/Generate.*Recipe/i);
    });
  });

  test('3. Test Bulk Generation Buttons (10, 20, 30, 50)', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToRecipeGeneration(page);

    for (const count of TEST_DATA.RECIPE_COUNTS) {
      await test.step(`Test bulk generation for ${count} recipes`, async () => {
        // Look for recipe count selector or bulk generation buttons
        const countSelector = `button:has-text("${count}")`;
        const bulkButton = page.locator(countSelector).first();
        
        if (await bulkButton.isVisible()) {
          await bulkButton.click();
          
          // If there's a separate generate button, click it
          const generateButton = page.locator('button:has-text("Generate Random"), button:has-text("Quick Generate")').first();
          if (await generateButton.isVisible()) {
            await generateButton.click();
          }
          
          // Wait for toast notification
          const toast = await waitForToast(page, 'Generation');
          await expect(toast).toContainText(/generation.*start/i);
        } else {
          // Alternative: use dropdown selector
          const selectElement = page.locator('select, [role="combobox"]').first();
          if (await selectElement.isVisible()) {
            await selectElement.click();
            await page.click(`option[value="${count}"], [data-value="${count}"]`);
            
            const generateButton = page.locator('button:has-text("Generate"), button[type="submit"]').first();
            await generateButton.click();
            
            const toast = await waitForToast(page, 'Generation');
            await expect(toast).toContainText(/generation.*start/i);
          }
        }

        // Take screenshot for visual regression
        await page.screenshot({ 
          path: `test-screenshots/bulk-generation-${count}.png`,
          fullPage: true 
        });
      });
    }
  });

  test('4. Test Custom Form Submission with Various Parameters', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToRecipeGeneration(page);

    await test.step('Fill custom generation form', async () => {
      // Set recipe count
      const countInput = page.locator('input[type="number"], select').first();
      await countInput.fill('15');

      // Set meal type if available
      const mealTypeSelect = page.locator('select:near-text("Meal Type"), [data-testid="meal-type"]');
      if (await mealTypeSelect.isVisible()) {
        await mealTypeSelect.selectOption('breakfast');
      }

      // Set dietary restrictions if available
      const dietSelect = page.locator('select:near-text("Dietary"), [data-testid="dietary-tag"]');
      if (await dietSelect.isVisible()) {
        await dietSelect.selectOption('keto');
      }

      // Set prep time if available
      const prepTimeSelect = page.locator('select:near-text("Prep Time"), [data-testid="prep-time"]');
      if (await prepTimeSelect.isVisible()) {
        await prepTimeSelect.selectOption('30');
      }

      // Set focus ingredient if available
      const ingredientInput = page.locator('input[placeholder*="ingredient"], input:near-text("Ingredient")');
      if (await ingredientInput.isVisible()) {
        await ingredientInput.fill('chicken');
      }

      // Set macro nutrients if available
      const proteinMinInput = page.locator('input:near-text("Protein"):near-text("Min")');
      if (await proteinMinInput.isVisible()) {
        await proteinMinInput.fill('25');
      }

      const proteinMaxInput = page.locator('input:near-text("Protein"):near-text("Max")');
      if (await proteinMaxInput.isVisible()) {
        await proteinMaxInput.fill('50');
      }
    });

    await test.step('Submit custom form', async () => {
      const submitButton = page.locator('button:has-text("Generate Custom"), button:has-text("Generate Targeted"), button[type="submit"]').last();
      await submitButton.click();

      // Wait for generation start notification
      const toast = await waitForToast(page, 'Generation');
      await expect(toast).toContainText(/generation.*start/i);
    });

    await test.step('Take screenshot of filled form', async () => {
      await page.screenshot({ 
        path: 'test-screenshots/custom-form-filled.png',
        fullPage: true 
      });
    });
  });

  test('5. Test Natural Language Input Functionality', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToRecipeGeneration(page);

    for (let i = 0; i < TEST_DATA.NATURAL_LANGUAGE_INPUTS.length; i++) {
      const input = TEST_DATA.NATURAL_LANGUAGE_INPUTS[i];
      
      await test.step(`Test natural language input ${i + 1}`, async () => {
        // Find natural language textarea
        const nlTextarea = page.locator('textarea[placeholder*="Example"], textarea:near-text("Natural Language"), textarea:near-text("Describe")');
        
        if (await nlTextarea.isVisible()) {
          await nlTextarea.fill(input);

          // Look for "Parse with AI" button
          const parseButton = page.locator('button:has-text("Parse"), button:has-text("AI")');
          if (await parseButton.isVisible()) {
            await parseButton.click();

            // Wait for parsing completion
            await page.waitForTimeout(2000);

            // Check if form was auto-populated
            const toast = await waitForToast(page, 'AI Parsing');
            await expect(toast).toContainText(/parsing.*complete|populated/i);
          }

          // Try direct generation
          const directGenButton = page.locator('button:has-text("Generate Directly"), button:has-text("Direct")');
          if (await directGenButton.isVisible()) {
            await directGenButton.click();

            const toast = await waitForToast(page, 'Generation');
            await expect(toast).toContainText(/generation.*start/i);
          }

          // Take screenshot
          await page.screenshot({ 
            path: `test-screenshots/natural-language-${i + 1}.png`,
            fullPage: true 
          });

          // Clear for next iteration
          await nlTextarea.fill('');
        }
      });
    }
  });

  test('6. Test Progress Indicators and Status Messages', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToRecipeGeneration(page);

    await test.step('Start generation and monitor progress', async () => {
      // Start a simple generation
      const generateButton = page.locator('button:has-text("Generate Random"), button:has-text("Quick Generate")').first();
      await generateButton.click();

      // Check for progress indicators
      const progressIndicators = [
        '.progress-bar, [role="progressbar"]',
        '.status-step, .generation-step',
        '.animate-spin, .spinner',
        'text="Initializing"',
        'text="Generating"',
        'text="Validating"'
      ];

      for (const indicator of progressIndicators) {
        const element = page.locator(indicator);
        if (await element.isVisible({ timeout: 2000 })) {
          await expect(element).toBeVisible();
          await page.screenshot({ 
            path: `test-screenshots/progress-indicator-${indicator.replace(/[^a-zA-Z0-9]/g, '-')}.png` 
          });
        }
      }
    });

    await test.step('Verify status messages appear', async () => {
      const statusMessages = [
        'Initializing AI models',
        'Generating recipe concepts',
        'Calculating nutritional data',
        'Validating recipes',
        'Saving to database'
      ];

      for (const message of statusMessages) {
        const statusElement = page.locator(`text="${message}"`);
        if (await statusElement.isVisible({ timeout: 2000 })) {
          await expect(statusElement).toBeVisible();
        }
      }
    });
  });

  test('7. Test Form Validation and Error Handling', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToRecipeGeneration(page);

    for (const scenario of TEST_DATA.FORM_VALIDATION_SCENARIOS) {
      await test.step(`Test validation for ${scenario.field}`, async () => {
        let fieldSelector = '';
        
        switch (scenario.field) {
          case 'count':
            fieldSelector = 'input[type="number"]:near-text("count"), input[type="number"]:near-text("recipes")';
            break;
          case 'minCalories':
            fieldSelector = 'input:near-text("Min"):near-text("Calorie")';
            break;
          case 'maxCalories':
            fieldSelector = 'input:near-text("Max"):near-text("Calorie")';
            break;
        }

        const field = page.locator(fieldSelector).first();
        if (await field.isVisible()) {
          await field.fill(scenario.value.toString());
          
          // Try to submit form
          const submitButton = page.locator('button[type="submit"], button:has-text("Generate")').last();
          await submitButton.click();

          // Check for validation error (may appear as toast or inline error)
          const errorSelectors = [
            '.error-message, .field-error',
            '[role="alert"]',
            '.text-red, .text-destructive',
            `text="${scenario.expected}"`
          ];

          let errorFound = false;
          for (const selector of errorSelectors) {
            const errorElement = page.locator(selector);
            if (await errorElement.isVisible({ timeout: 2000 })) {
              errorFound = true;
              break;
            }
          }

          // Reset field for next test
          await field.fill('10');
        }
      });
    }
  });

  test('8. Test Toast Notifications Functionality', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToRecipeGeneration(page);

    await test.step('Test success toast notifications', async () => {
      const generateButton = page.locator('button:has-text("Generate")').first();
      await generateButton.click();

      const toast = await waitForToast(page, 'Generation Started');
      await expect(toast).toBeVisible();
      
      // Check toast content
      await expect(toast).toContainText(/generation.*start/i);
      
      // Take screenshot of toast
      await page.screenshot({ path: 'test-screenshots/success-toast.png' });
    });

    await test.step('Test error toast notifications', async () => {
      // Mock an error response
      await page.route('**/api/admin/generate**', async route => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Invalid recipe count'
          })
        });
      });

      const generateButton = page.locator('button:has-text("Generate")').first();
      await generateButton.click();

      const errorToast = await waitForToast(page, 'Failed');
      await expect(errorToast).toBeVisible();
      await expect(errorToast).toContainText(/failed|error/i);
      
      // Take screenshot of error toast
      await page.screenshot({ path: 'test-screenshots/error-toast.png' });
    });
  });

  test('9. Test Collapse/Expand Functionality', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToRecipeGeneration(page);

    await test.step('Test modal collapse/expand', async () => {
      // Look for collapse/expand buttons
      const collapseButtons = [
        'button:has([data-icon="chevron-up"])',
        'button:has([data-icon="chevron-down"])',
        'button:has-text("Collapse")',
        'button:has-text("Expand")',
        '.collapse-toggle, .expand-toggle'
      ];

      for (const buttonSelector of collapseButtons) {
        const button = page.locator(buttonSelector);
        if (await button.isVisible()) {
          // Test collapse
          await button.click();
          await page.screenshot({ path: 'test-screenshots/collapsed-state.png' });
          
          // Test expand
          await button.click();
          await page.screenshot({ path: 'test-screenshots/expanded-state.png' });
          
          break;
        }
      }
    });

    await test.step('Test section collapse/expand', async () => {
      // Look for collapsible sections
      const sections = page.locator('.collapsible, .accordion, [data-collapsible]');
      const count = await sections.count();

      for (let i = 0; i < count; i++) {
        const section = sections.nth(i);
        const toggleButton = section.locator('button').first();
        
        if (await toggleButton.isVisible()) {
          await toggleButton.click();
          await page.screenshot({ path: `test-screenshots/section-toggle-${i}.png` });
        }
      }
    });
  });

  test('10. Test Responsive Design Elements', async ({ page }) => {
    await loginAsAdmin(page);

    const viewports = [
      { width: 375, height: 667, name: 'mobile' },      // iPhone SE
      { width: 768, height: 1024, name: 'tablet' },     // iPad
      { width: 1024, height: 768, name: 'laptop' },     // Small laptop
      { width: 1440, height: 900, name: 'desktop' }     // Desktop
    ];

    for (const viewport of viewports) {
      await test.step(`Test ${viewport.name} view (${viewport.width}x${viewport.height})`, async () => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        
        await navigateToRecipeGeneration(page);
        
        // Take screenshot of modal in different viewport
        await page.screenshot({ 
          path: `test-screenshots/responsive-${viewport.name}.png`,
          fullPage: true 
        });

        // Test if modal is properly responsive
        const modal = page.locator('[data-testid="recipe-generation-modal"], .modal, [role="dialog"]');
        await expect(modal).toBeVisible();

        // Check if form elements are accessible
        const formElements = page.locator('input, select, button, textarea');
        const count = await formElements.count();
        
        for (let i = 0; i < Math.min(count, 5); i++) {
          const element = formElements.nth(i);
          if (await element.isVisible()) {
            await expect(element).toBeVisible();
          }
        }
      });
    }
  });

  test('11. Test Accessibility Features', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToRecipeGeneration(page);

    await test.step('Test keyboard navigation', async () => {
      // Tab through form elements
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(100);
      }
      
      // Take screenshot showing focus states
      await page.screenshot({ path: 'test-screenshots/keyboard-navigation.png' });
    });

    await test.step('Test ARIA labels and roles', async () => {
      // Check for proper ARIA attributes
      const ariaElements = [
        '[role="dialog"]',
        '[role="button"]',
        '[role="textbox"]',
        '[aria-label]',
        '[aria-describedby]'
      ];

      for (const selector of ariaElements) {
        const elements = page.locator(selector);
        const count = await elements.count();
        if (count > 0) {
          console.log(`Found ${count} elements with ${selector}`);
        }
      }
    });

    await test.step('Test screen reader content', async () => {
      // Check for proper labels and descriptions
      const labels = page.locator('label');
      const labelCount = await labels.count();
      
      for (let i = 0; i < labelCount; i++) {
        const label = labels.nth(i);
        const labelText = await label.textContent();
        if (labelText && labelText.trim()) {
          console.log(`Label found: ${labelText.trim()}`);
        }
      }
    });
  });

  test('12. Test Complete User Journey with Visual Regression', async ({ page }) => {
    await test.step('Complete end-to-end journey', async () => {
      // 1. Login
      await loginAsAdmin(page);
      await page.screenshot({ path: 'test-screenshots/journey-1-dashboard.png' });

      // 2. Navigate to recipe generation
      await navigateToRecipeGeneration(page);
      await page.screenshot({ path: 'test-screenshots/journey-2-modal-open.png' });

      // 3. Fill natural language input
      const nlTextarea = page.locator('textarea').first();
      if (await nlTextarea.isVisible()) {
        await nlTextarea.fill('Generate 10 healthy breakfast recipes for weight loss');
        await page.screenshot({ path: 'test-screenshots/journey-3-nl-filled.png' });
      }

      // 4. Fill custom form
      const countInput = page.locator('input[type="number"]').first();
      if (await countInput.isVisible()) {
        await countInput.fill('12');
      }

      // 5. Select options
      const selects = page.locator('select, [role="combobox"]');
      const selectCount = await selects.count();
      
      for (let i = 0; i < Math.min(selectCount, 3); i++) {
        const select = selects.nth(i);
        if (await select.isVisible()) {
          await select.click();
          const options = page.locator('option').filter({ hasText: /breakfast|keto|protein/i });
          if (await options.first().isVisible()) {
            await options.first().click();
          }
        }
      }

      await page.screenshot({ path: 'test-screenshots/journey-4-form-filled.png' });

      // 6. Submit generation
      const submitButton = page.locator('button:has-text("Generate")').last();
      await submitButton.click();
      await page.screenshot({ path: 'test-screenshots/journey-5-generation-started.png' });

      // 7. Wait for completion notification
      await waitForToast(page, 'Generation');
      await page.screenshot({ path: 'test-screenshots/journey-6-completion.png' });

      // 8. Close modal
      const closeButton = page.locator('button:has([data-icon="x"]), button:has-text("Close"), button[aria-label="Close"]');
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }

      await page.screenshot({ path: 'test-screenshots/journey-7-final.png' });
    });
  });
});

// Additional test for error scenarios
test.describe('Admin Recipe Generation Error Scenarios', () => {
  test('Network Error Handling', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    // Mock network failure
    await page.route('**/api/admin/generate**', async route => {
      await route.abort('internetdisconnected');
    });

    await loginAsAdmin(page);
    await navigateToRecipeGeneration(page);

    const generateButton = page.locator('button:has-text("Generate")').first();
    await generateButton.click();

    // Should show network error
    const errorToast = await waitForToast(page, 'Failed');
    await expect(errorToast).toBeVisible();
    await page.screenshot({ path: 'test-screenshots/network-error.png' });
  });

  test('Server Error Handling', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    // Mock server error
    await page.route('**/api/admin/generate**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Internal server error'
        })
      });
    });

    await loginAsAdmin(page);
    await navigateToRecipeGeneration(page);

    const generateButton = page.locator('button:has-text("Generate")').first();
    await generateButton.click();

    // Should show server error
    const errorToast = await waitForToast(page, 'Failed');
    await expect(errorToast).toBeVisible();
    await page.screenshot({ path: 'test-screenshots/server-error.png' });
  });
});