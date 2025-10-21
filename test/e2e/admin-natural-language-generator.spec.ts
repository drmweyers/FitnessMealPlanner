/**
 * Admin Natural Language Recipe Generator E2E Tests
 *
 * Comprehensive Playwright tests for the Natural Language Generator feature
 * in the AdminRecipeGenerator component.
 *
 * Test Coverage:
 * - Admin login and navigation to Recipe Generator
 * - Natural Language Generator section visibility
 * - "Generate Directly" button existence and state
 * - Button disabled/enabled states based on textarea content
 * - API endpoint call verification
 * - Toast notifications
 * - Error handling scenarios
 */

import { test, expect } from '@playwright/test';

// Test credentials
const ADMIN_CREDENTIALS = {
  email: 'admin@fitmeal.pro',
  password: 'AdminPass123'
};

// Test data
const TEST_PROMPTS = {
  valid: 'Generate 15 high-protein breakfast recipes under 20 minutes prep time, focusing on eggs and Greek yogurt, suitable for keto diet, with 400-600 calories per serving',
  short: 'Create 5 lunch recipes',
  complex: 'Make 20 vegetarian dinner recipes under 500 calories for weight loss with at least 25g protein per serving'
};

// Helper function: Login as admin
async function loginAsAdmin(page: any) {
  await page.goto('/login');
  await page.fill('input[type="email"], input[name="email"]', ADMIN_CREDENTIALS.email);
  await page.fill('input[type="password"], input[name="password"]', ADMIN_CREDENTIALS.password);
  await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');

  // Wait for successful login redirect
  await page.waitForURL('**/admin**', { timeout: 10000 });
  await expect(page).toHaveURL(/.*admin.*/);
}

// Helper function: Navigate to Recipe Generation
async function navigateToRecipeGeneration(page: any) {
  // Look for Admin tab or Recipe Generator link
  const adminTab = page.locator('[data-testid="admin-tab"], button:has-text("Admin"), [role="tab"]:has-text("Admin")');

  if (await adminTab.isVisible({ timeout: 5000 })) {
    await adminTab.click();
  }

  // Wait for the Recipe Generator section to be visible
  await page.waitForSelector('text="AI Recipe Generator", h2:has-text("AI Recipe Generator"), [data-testid="recipe-generator"]', { timeout: 10000 });
}

test.describe('Admin Natural Language Recipe Generator', () => {

  test.beforeEach(async ({ page }) => {
    // Set consistent viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('1. Admin Login and Navigation to Recipe Generator', async ({ page }) => {
    await test.step('Login as admin', async () => {
      await loginAsAdmin(page);
    });

    await test.step('Navigate to Recipe Generator', async () => {
      await navigateToRecipeGeneration(page);
    });

    await test.step('Verify AI Recipe Generator section is visible', async () => {
      const recipeGeneratorSection = page.locator('text="AI Recipe Generator"').first();
      await expect(recipeGeneratorSection).toBeVisible();
    });

    // Take screenshot
    await page.screenshot({ path: 'test-screenshots/nl-generator-1-navigation.png', fullPage: true });
  });

  test('2. Verify Natural Language Generator Section Exists', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToRecipeGeneration(page);

    await test.step('Check for Natural Language Generator section', async () => {
      // Look for the section header
      const nlSectionHeader = page.locator('text="AI-Powered Natural Language Generator"');
      await expect(nlSectionHeader).toBeVisible();
    });

    await test.step('Verify section description', async () => {
      const description = page.locator('text*="Describe your recipe generation requirements in plain English"');
      await expect(description).toBeVisible();
    });

    await test.step('Verify textarea exists', async () => {
      const textarea = page.locator('textarea#natural-language, textarea[placeholder*="Example"]');
      await expect(textarea).toBeVisible();
      await expect(textarea).toBeEditable();
    });

    // Take screenshot
    await page.screenshot({ path: 'test-screenshots/nl-generator-2-section-visible.png', fullPage: true });
  });

  test('3. Verify "Generate Directly" Button Exists', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToRecipeGeneration(page);

    await test.step('Locate Generate Directly button', async () => {
      const generateDirectlyButton = page.locator('button:has-text("Generate Directly")');
      await expect(generateDirectlyButton).toBeVisible();
    });

    await test.step('Verify button has correct icon', async () => {
      // The button should have a Wand2 icon (magic wand)
      const buttonWithIcon = page.locator('button:has-text("Generate Directly")');
      await expect(buttonWithIcon).toBeVisible();

      // Check if it contains the icon class or SVG
      const hasIcon = await buttonWithIcon.locator('svg').count() > 0;
      expect(hasIcon).toBeTruthy();
    });

    await test.step('Verify button styling', async () => {
      const button = page.locator('button:has-text("Generate Directly")');

      // Check for green background class (bg-green-600)
      const classList = await button.getAttribute('class');
      expect(classList).toContain('bg-green');
    });

    // Take screenshot
    await page.screenshot({ path: 'test-screenshots/nl-generator-3-button-exists.png', fullPage: true });
  });

  test('4. Verify Button is Disabled When Textarea is Empty', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToRecipeGeneration(page);

    await test.step('Ensure textarea is empty', async () => {
      const textarea = page.locator('textarea#natural-language, textarea[placeholder*="Example"]');
      await textarea.clear();
      await expect(textarea).toHaveValue('');
    });

    await test.step('Verify Generate Directly button is disabled', async () => {
      const generateDirectlyButton = page.locator('button:has-text("Generate Directly")');
      await expect(generateDirectlyButton).toBeDisabled();
    });

    await test.step('Verify Parse with AI button is also disabled', async () => {
      const parseButton = page.locator('button:has-text("Parse with AI")');
      await expect(parseButton).toBeDisabled();
    });

    // Take screenshot
    await page.screenshot({ path: 'test-screenshots/nl-generator-4-button-disabled.png', fullPage: true });
  });

  test('5. Verify Button Becomes Enabled When Text is Entered', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToRecipeGeneration(page);

    const textarea = page.locator('textarea#natural-language, textarea[placeholder*="Example"]');
    const generateDirectlyButton = page.locator('button:has-text("Generate Directly")');
    const parseButton = page.locator('button:has-text("Parse with AI")');

    await test.step('Initially buttons should be disabled', async () => {
      await expect(generateDirectlyButton).toBeDisabled();
      await expect(parseButton).toBeDisabled();
    });

    await test.step('Type text in textarea', async () => {
      await textarea.fill(TEST_PROMPTS.valid);
      await expect(textarea).toHaveValue(TEST_PROMPTS.valid);
    });

    await test.step('Verify buttons become enabled', async () => {
      await expect(generateDirectlyButton).toBeEnabled();
      await expect(parseButton).toBeEnabled();
    });

    // Take screenshot
    await page.screenshot({ path: 'test-screenshots/nl-generator-5-button-enabled.png', fullPage: true });
  });

  test('6. Verify Button Disabled State with Only Whitespace', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToRecipeGeneration(page);

    const textarea = page.locator('textarea#natural-language, textarea[placeholder*="Example"]');
    const generateDirectlyButton = page.locator('button:has-text("Generate Directly")');

    await test.step('Enter only whitespace', async () => {
      await textarea.fill('   \n\t   ');
    });

    await test.step('Verify button remains disabled', async () => {
      await expect(generateDirectlyButton).toBeDisabled();
    });

    // Take screenshot
    await page.screenshot({ path: 'test-screenshots/nl-generator-6-whitespace-disabled.png', fullPage: true });
  });

  test('7. Verify API Call When Generate Directly is Clicked', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToRecipeGeneration(page);

    let apiRequestMade = false;
    let requestPayload: any = null;

    await test.step('Set up API request interceptor', async () => {
      // Intercept the API call
      await page.route('**/api/admin/generate-from-prompt', async (route) => {
        apiRequestMade = true;
        requestPayload = route.request().postDataJSON();

        // Mock successful response
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            batchId: 'test-batch-123',
            parsedParameters: {
              count: 15,
              mealType: 'breakfast',
              dietaryTag: 'keto'
            },
            generationOptions: {
              batchSize: 15
            }
          })
        });
      });
    });

    await test.step('Fill textarea with prompt', async () => {
      const textarea = page.locator('textarea#natural-language, textarea[placeholder*="Example"]');
      await textarea.fill(TEST_PROMPTS.valid);
    });

    await test.step('Click Generate Directly button', async () => {
      const generateDirectlyButton = page.locator('button:has-text("Generate Directly")');
      await generateDirectlyButton.click();
    });

    await test.step('Verify API request was made', async () => {
      // Wait a bit for the request to be made
      await page.waitForTimeout(1000);
      expect(apiRequestMade).toBeTruthy();
    });

    await test.step('Verify request payload', async () => {
      expect(requestPayload).toBeDefined();
      expect(requestPayload.prompt).toBe(TEST_PROMPTS.valid);
    });

    // Take screenshot
    await page.screenshot({ path: 'test-screenshots/nl-generator-7-api-call.png', fullPage: true });
  });

  test('8. Verify Success Toast Notification Appears', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToRecipeGeneration(page);

    await test.step('Mock successful API response', async () => {
      await page.route('**/api/admin/generate-from-prompt', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            batchId: 'test-batch-456',
            parsedParameters: {
              count: 10,
              mealType: 'lunch'
            },
            generationOptions: {
              batchSize: 10
            }
          })
        });
      });
    });

    await test.step('Fill textarea and click button', async () => {
      const textarea = page.locator('textarea#natural-language, textarea[placeholder*="Example"]');
      await textarea.fill(TEST_PROMPTS.short);

      const generateDirectlyButton = page.locator('button:has-text("Generate Directly")');
      await generateDirectlyButton.click();
    });

    await test.step('Verify success toast appears', async () => {
      // Wait for toast notification
      const toast = page.locator('[data-testid="toast"], .toast, [role="alert"]');
      await expect(toast).toBeVisible({ timeout: 5000 });

      // Verify toast contains success message
      await expect(toast).toContainText(/Natural Language Generation Started|Generating.*recipes/i);
    });

    // Take screenshot
    await page.screenshot({ path: 'test-screenshots/nl-generator-8-success-toast.png', fullPage: true });
  });

  test('9. Verify Error Handling - Empty Input', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToRecipeGeneration(page);

    await test.step('Clear textarea and try to generate', async () => {
      const textarea = page.locator('textarea#natural-language, textarea[placeholder*="Example"]');
      await textarea.clear();

      // Button should be disabled, but let's verify the validation logic
      const generateDirectlyButton = page.locator('button:has-text("Generate Directly")');
      await expect(generateDirectlyButton).toBeDisabled();
    });

    // If we could somehow click the disabled button, it should show error toast
    // This is just documenting the expected behavior

    // Take screenshot
    await page.screenshot({ path: 'test-screenshots/nl-generator-9-empty-validation.png', fullPage: true });
  });

  test('10. Verify Error Handling - API Error', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToRecipeGeneration(page);

    await test.step('Mock API error response', async () => {
      await page.route('**/api/admin/generate-from-prompt', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Invalid prompt: unable to parse recipe requirements'
          })
        });
      });
    });

    await test.step('Fill textarea and click button', async () => {
      const textarea = page.locator('textarea#natural-language, textarea[placeholder*="Example"]');
      await textarea.fill('invalid prompt xyz123');

      const generateDirectlyButton = page.locator('button:has-text("Generate Directly")');
      await generateDirectlyButton.click();
    });

    await test.step('Verify error toast appears', async () => {
      const errorToast = page.locator('[data-testid="toast"], .toast, [role="alert"]');
      await expect(errorToast).toBeVisible({ timeout: 5000 });
      await expect(errorToast).toContainText(/Generation Failed|Failed|error/i);
    });

    // Take screenshot
    await page.screenshot({ path: 'test-screenshots/nl-generator-10-api-error.png', fullPage: true });
  });

  test('11. Verify Error Handling - Server Error (500)', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToRecipeGeneration(page);

    await test.step('Mock server error response', async () => {
      await page.route('**/api/admin/generate-from-prompt', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Internal server error'
          })
        });
      });
    });

    await test.step('Fill textarea and click button', async () => {
      const textarea = page.locator('textarea#natural-language, textarea[placeholder*="Example"]');
      await textarea.fill(TEST_PROMPTS.complex);

      const generateDirectlyButton = page.locator('button:has-text("Generate Directly")');
      await generateDirectlyButton.click();
    });

    await test.step('Verify error toast appears', async () => {
      const errorToast = page.locator('[data-testid="toast"], .toast, [role="alert"]');
      await expect(errorToast).toBeVisible({ timeout: 5000 });
      await expect(errorToast).toContainText(/Failed|error|server/i);
    });

    // Take screenshot
    await page.screenshot({ path: 'test-screenshots/nl-generator-11-server-error.png', fullPage: true });
  });

  test('12. Verify Button Loading State During Generation', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToRecipeGeneration(page);

    await test.step('Mock slow API response', async () => {
      await page.route('**/api/admin/generate-from-prompt', async (route) => {
        // Delay response by 2 seconds
        await new Promise(resolve => setTimeout(resolve, 2000));

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            batchId: 'test-batch-789',
            parsedParameters: { count: 10 },
            generationOptions: { batchSize: 10 }
          })
        });
      });
    });

    await test.step('Fill textarea', async () => {
      const textarea = page.locator('textarea#natural-language, textarea[placeholder*="Example"]');
      await textarea.fill(TEST_PROMPTS.valid);
    });

    await test.step('Click Generate Directly button', async () => {
      const generateDirectlyButton = page.locator('button:has-text("Generate Directly")');
      await generateDirectlyButton.click();
    });

    await test.step('Verify button shows loading state', async () => {
      // Button should show "Generating..." text and spinner
      const loadingButton = page.locator('button:has-text("Generating")');
      await expect(loadingButton).toBeVisible({ timeout: 1000 });

      // Button should be disabled during loading
      await expect(loadingButton).toBeDisabled();

      // Check for spinner
      const spinner = loadingButton.locator('.animate-spin');
      await expect(spinner).toBeVisible();
    });

    // Take screenshot during loading
    await page.screenshot({ path: 'test-screenshots/nl-generator-12-loading-state.png', fullPage: true });
  });

  test('13. Verify Network Error Handling', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToRecipeGeneration(page);

    await test.step('Mock network failure', async () => {
      await page.route('**/api/admin/generate-from-prompt', async (route) => {
        await route.abort('internetdisconnected');
      });
    });

    await test.step('Fill textarea and click button', async () => {
      const textarea = page.locator('textarea#natural-language, textarea[placeholder*="Example"]');
      await textarea.fill(TEST_PROMPTS.valid);

      const generateDirectlyButton = page.locator('button:has-text("Generate Directly")');
      await generateDirectlyButton.click();
    });

    await test.step('Verify error handling', async () => {
      const errorToast = page.locator('[data-testid="toast"], .toast, [role="alert"]');
      await expect(errorToast).toBeVisible({ timeout: 5000 });
      await expect(errorToast).toContainText(/Failed|error/i);
    });

    // Take screenshot
    await page.screenshot({ path: 'test-screenshots/nl-generator-13-network-error.png', fullPage: true });
  });

  test('14. Verify Parse with AI Button vs Generate Directly Button', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToRecipeGeneration(page);

    await test.step('Verify both buttons are present', async () => {
      const parseButton = page.locator('button:has-text("Parse with AI")');
      const generateButton = page.locator('button:has-text("Generate Directly")');

      await expect(parseButton).toBeVisible();
      await expect(generateButton).toBeVisible();
    });

    await test.step('Verify buttons have different styling', async () => {
      const parseButton = page.locator('button:has-text("Parse with AI")');
      const generateButton = page.locator('button:has-text("Generate Directly")');

      const parseClass = await parseButton.getAttribute('class');
      const generateClass = await generateButton.getAttribute('class');

      // Parse button should be blue
      expect(parseClass).toContain('bg-blue');

      // Generate button should be green
      expect(generateClass).toContain('bg-green');
    });

    await test.step('Verify Generate Directly calls different endpoint', async () => {
      let generateEndpointCalled = false;

      await page.route('**/api/admin/generate-from-prompt', async (route) => {
        generateEndpointCalled = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ batchId: 'test', parsedParameters: {}, generationOptions: {} })
        });
      });

      const textarea = page.locator('textarea#natural-language, textarea[placeholder*="Example"]');
      await textarea.fill(TEST_PROMPTS.valid);

      const generateButton = page.locator('button:has-text("Generate Directly")');
      await generateButton.click();

      await page.waitForTimeout(500);
      expect(generateEndpointCalled).toBeTruthy();
    });

    // Take screenshot
    await page.screenshot({ path: 'test-screenshots/nl-generator-14-button-comparison.png', fullPage: true });
  });

  test('15. Complete User Journey - Natural Language Generation', async ({ page }) => {
    await test.step('Login as admin', async () => {
      await loginAsAdmin(page);
      await page.screenshot({ path: 'test-screenshots/nl-generator-journey-1-login.png', fullPage: true });
    });

    await test.step('Navigate to Recipe Generator', async () => {
      await navigateToRecipeGeneration(page);
      await page.screenshot({ path: 'test-screenshots/nl-generator-journey-2-navigation.png', fullPage: true });
    });

    await test.step('Locate Natural Language section', async () => {
      const nlSection = page.locator('text="AI-Powered Natural Language Generator"');
      await expect(nlSection).toBeVisible();
      await page.screenshot({ path: 'test-screenshots/nl-generator-journey-3-section.png', fullPage: true });
    });

    await test.step('Type natural language prompt', async () => {
      const textarea = page.locator('textarea#natural-language, textarea[placeholder*="Example"]');
      await textarea.fill(TEST_PROMPTS.valid);
      await page.screenshot({ path: 'test-screenshots/nl-generator-journey-4-typed.png', fullPage: true });
    });

    await test.step('Mock API and click Generate Directly', async () => {
      await page.route('**/api/admin/generate-from-prompt', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            batchId: 'journey-test-batch',
            parsedParameters: {
              count: 15,
              mealType: 'breakfast',
              dietaryTag: 'keto',
              minCalories: 400,
              maxCalories: 600
            },
            generationOptions: {
              batchSize: 15
            }
          })
        });
      });

      const generateButton = page.locator('button:has-text("Generate Directly")');
      await generateButton.click();
      await page.screenshot({ path: 'test-screenshots/nl-generator-journey-5-clicked.png', fullPage: true });
    });

    await test.step('Verify success notification', async () => {
      const toast = page.locator('[data-testid="toast"], .toast, [role="alert"]');
      await expect(toast).toBeVisible({ timeout: 5000 });
      await page.screenshot({ path: 'test-screenshots/nl-generator-journey-6-success.png', fullPage: true });
    });
  });
});

// Additional test suite for edge cases
test.describe('Natural Language Generator Edge Cases', () => {

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('Edge Case 1: Very Long Prompt', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToRecipeGeneration(page);

    const longPrompt = 'Generate '.repeat(100) + '20 recipes with very specific requirements and detailed instructions for each one that should still work fine';

    await test.step('Enter very long prompt', async () => {
      const textarea = page.locator('textarea#natural-language, textarea[placeholder*="Example"]');
      await textarea.fill(longPrompt);
    });

    await test.step('Verify button still works', async () => {
      const generateButton = page.locator('button:has-text("Generate Directly")');
      await expect(generateButton).toBeEnabled();
    });

    await page.screenshot({ path: 'test-screenshots/nl-generator-edge-1-long-prompt.png', fullPage: true });
  });

  test('Edge Case 2: Special Characters in Prompt', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToRecipeGeneration(page);

    const specialCharPrompt = 'Generate 10 recipes with ingredients like: chicken (boneless), eggs [organic], & vegetables @400-600 cal! #keto $15 budget';

    await test.step('Enter prompt with special characters', async () => {
      const textarea = page.locator('textarea#natural-language, textarea[placeholder*="Example"]');
      await textarea.fill(specialCharPrompt);
    });

    await test.step('Mock API and verify it handles special characters', async () => {
      let receivedPrompt = '';

      await page.route('**/api/admin/generate-from-prompt', async (route) => {
        const payload = route.request().postDataJSON();
        receivedPrompt = payload.prompt;

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ batchId: 'test', parsedParameters: {}, generationOptions: {} })
        });
      });

      const generateButton = page.locator('button:has-text("Generate Directly")');
      await generateButton.click();

      await page.waitForTimeout(500);
      expect(receivedPrompt).toBe(specialCharPrompt);
    });

    await page.screenshot({ path: 'test-screenshots/nl-generator-edge-2-special-chars.png', fullPage: true });
  });

  test('Edge Case 3: Multiple Line Breaks in Prompt', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToRecipeGeneration(page);

    const multilinePrompt = `Generate 10 recipes with:

- High protein
- Low carbs
- Keto friendly

With 400-600 calories per serving`;

    await test.step('Enter multiline prompt', async () => {
      const textarea = page.locator('textarea#natural-language, textarea[placeholder*="Example"]');
      await textarea.fill(multilinePrompt);
    });

    await test.step('Verify button is enabled', async () => {
      const generateButton = page.locator('button:has-text("Generate Directly")');
      await expect(generateButton).toBeEnabled();
    });

    await page.screenshot({ path: 'test-screenshots/nl-generator-edge-3-multiline.png', fullPage: true });
  });
});
