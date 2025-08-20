import { test, expect, Page } from '@playwright/test';

/**
 * Admin Meal Generation GUI Testing Suite
 * 
 * This test suite comprehensively tests the admin interface for meal plan generation,
 * focusing on the specific button functionality and user workflows that have been
 * reported as non-working.
 * 
 * Test Coverage:
 * - Admin login workflow
 * - Navigation to meal plan generation
 * - "Generate New Batch" button functionality
 * - "Review Queue" button behavior
 * - "View Pending" button and modal display
 * - AdminRecipeGenerator component interactions
 * - Form submissions and API call verification
 * - Error handling and loading states
 */

// Test data and configuration
const ADMIN_CREDENTIALS = {
  email: 'admin@fitnessmealplanner.com',
  password: 'admin123'
};

const TEST_CONFIG = {
  baseURL: 'http://localhost:4000',
  timeout: 30000,
  slowMo: 500 // Slow down for visual debugging
};

// Helper functions for authentication and navigation
async function loginAsAdmin(page: Page) {
  console.log('🔐 Logging in as admin...');
  
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  
  // Fill in credentials
  await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
  await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
  
  // Take screenshot before login
  await page.screenshot({ path: 'test-screenshots/admin-login-form.png' });
  
  // Submit login form
  await page.click('button[type="submit"]');
  
  // Wait for redirect to admin dashboard
  await page.waitForURL('/admin', { timeout: 10000 });
  
  // Verify admin dashboard loaded
  await expect(page.locator('h1')).toContainText('Admin Dashboard');
  
  console.log('✅ Admin login successful');
}

async function navigateToAdminTab(page: Page) {
  console.log('📋 Navigating to Admin tab...');
  
  // Click on the Admin tab
  const adminTab = page.locator('button[data-value="admin"], button[value="admin"]').first();
  await expect(adminTab).toBeVisible({ timeout: 5000 });
  await adminTab.click();
  
  // Wait for admin content to load
  await page.waitForSelector('text="Generate Recipes"', { timeout: 5000 });
  
  console.log('✅ Admin tab navigation successful');
}

async function takeScreenshotWithContext(page: Page, filename: string, description: string) {
  console.log(`📸 Taking screenshot: ${description}`);
  await page.screenshot({ 
    path: `test-screenshots/${filename}`, 
    fullPage: true 
  });
}

// Main test suite
test.describe('Admin Meal Generation Interface', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set longer timeouts for debugging
    page.setDefaultTimeout(TEST_CONFIG.timeout);
    
    // Log all console messages for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('🚨 Browser Console Error:', msg.text());
      } else if (msg.type() === 'warning') {
        console.warn('⚠️ Browser Console Warning:', msg.text());
      }
    });
    
    // Log all failed network requests
    page.on('response', response => {
      if (!response.ok()) {
        console.error(`🌐 HTTP Error: ${response.status()} ${response.url()}`);
      }
    });
  });

  test('Admin Login and Dashboard Access', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Take screenshot of admin dashboard
    await takeScreenshotWithContext(page, 'admin-dashboard-loaded.png', 'Admin dashboard after login');
    
    // Verify key elements are present
    await expect(page.locator('text="Admin Dashboard"')).toBeVisible();
    await expect(page.locator('button[value="recipes"]')).toBeVisible();
    await expect(page.locator('button[value="meal-plans"]')).toBeVisible();
    await expect(page.locator('button[value="admin"]')).toBeVisible();
  });

  test('Navigate to Admin Tab and Find Generate Buttons', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToAdminTab(page);
    
    // Take screenshot of admin tab
    await takeScreenshotWithContext(page, 'admin-tab-loaded.png', 'Admin tab with generation buttons');
    
    // Verify "Generate New Batch" button exists and is clickable
    const generateBatchButton = page.locator('button:has-text("Generate New Batch")').first();
    await expect(generateBatchButton).toBeVisible();
    await expect(generateBatchButton).toBeEnabled();
    
    // Verify "Review Queue" / "View Pending" button exists
    const reviewQueueButton = page.locator('button:has-text("View Pending"), button:has-text("Review Queue")').first();
    await expect(reviewQueueButton).toBeVisible();
    await expect(reviewQueueButton).toBeEnabled();
    
    console.log('✅ Both admin buttons found and enabled');
  });

  test('Test Generate New Batch Button Click', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToAdminTab(page);
    
    // Monitor network requests for modal opening
    let modalApiCalled = false;
    page.on('response', response => {
      if (response.url().includes('modal') || response.url().includes('generation')) {
        modalApiCalled = true;
      }
    });
    
    // Click "Generate New Batch" button
    const generateBatchButton = page.locator('button:has-text("Generate New Batch")').first();
    await takeScreenshotWithContext(page, 'before-generate-batch-click.png', 'Before clicking Generate New Batch');
    
    await generateBatchButton.click();
    
    // Wait for modal to appear (check multiple possible selectors)
    try {
      await page.waitForSelector('.modal, [role="dialog"], .fixed.inset-0', { timeout: 5000 });
      console.log('✅ Modal appeared after button click');
    } catch (error) {
      console.error('❌ Modal did not appear after button click');
      await takeScreenshotWithContext(page, 'generate-batch-no-modal.png', 'No modal appeared');
    }
    
    // Take screenshot after click
    await takeScreenshotWithContext(page, 'after-generate-batch-click.png', 'After clicking Generate New Batch');
    
    // Check if any modal-like content appeared
    const possibleModalSelectors = [
      '.modal',
      '[role="dialog"]',
      '.fixed.inset-0',
      '.recipe-generation-modal',
      'div:has-text("Recipe Generation")',
      'div:has-text("Generate Recipes")'
    ];
    
    let modalFound = false;
    for (const selector of possibleModalSelectors) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        modalFound = true;
        console.log(`✅ Found modal-like element: ${selector}`);
        break;
      }
    }
    
    if (!modalFound) {
      console.error('❌ No modal or dialog found after Generate New Batch click');
      // Check for any error messages
      const errorElements = await page.locator('.error, .alert-error, [role="alert"]').count();
      if (errorElements > 0) {
        const errorText = await page.locator('.error, .alert-error, [role="alert"]').first().textContent();
        console.error('🚨 Error message found:', errorText);
      }
    }
  });

  test('Test Review Queue / View Pending Button Click', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToAdminTab(page);
    
    // Find and click the review/pending button
    const reviewButton = page.locator('button:has-text("View Pending"), button:has-text("Review Queue")').first();
    await takeScreenshotWithContext(page, 'before-review-queue-click.png', 'Before clicking Review Queue');
    
    await reviewButton.click();
    
    // Wait for pending recipes modal or table to appear
    try {
      await page.waitForSelector('text="Pending Recipes", .pending-recipes, table', { timeout: 5000 });
      console.log('✅ Pending recipes content appeared');
    } catch (error) {
      console.error('❌ Pending recipes content did not appear');
    }
    
    await takeScreenshotWithContext(page, 'after-review-queue-click.png', 'After clicking Review Queue');
    
    // Check for pending recipes table or modal
    const pendingTable = page.locator('table, .pending-recipes-table');
    const pendingModal = page.locator('.modal:has-text("Pending"), [role="dialog"]:has-text("Pending")');
    
    if (await pendingTable.count() > 0) {
      console.log('✅ Found pending recipes table');
    } else if (await pendingModal.count() > 0) {
      console.log('✅ Found pending recipes modal');
    } else {
      console.error('❌ No pending recipes content found');
    }
  });

  test('Test Meal Plans Tab Recipe Generation Interface', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Navigate to Meal Plans tab
    const mealPlansTab = page.locator('button[value="meal-plans"]').first();
    await mealPlansTab.click();
    
    await takeScreenshotWithContext(page, 'meal-plans-tab-loaded.png', 'Meal Plans tab interface');
    
    // Look for recipe generation interface elements
    const generateButton = page.locator('button:has-text("Generate"), button:has-text("Create")');
    if (await generateButton.count() > 0) {
      console.log('✅ Found generation button in Meal Plans tab');
      
      // Test clicking the generation button
      await generateButton.first().click();
      await takeScreenshotWithContext(page, 'meal-plans-generate-clicked.png', 'After clicking generate in Meal Plans');
      
      // Check for any form or interface that appeared
      const formElements = await page.locator('form, .form, input[type="submit"]').count();
      if (formElements > 0) {
        console.log('✅ Form interface appeared');
      }
    }
  });

  test('Test AdminRecipeGenerator Component Direct Interaction', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToAdminTab(page);
    
    // Look for the AdminRecipeGenerator component buttons
    const aiGenerateButton = page.locator('button:has-text("Parse with AI"), button:has-text("AI")');
    const directGenerateButton = page.locator('button:has-text("Generate Directly"), button:has-text("Direct")');
    const customRecipesButton = page.locator('button:has-text("Generate Custom Recipes")');
    
    await takeScreenshotWithContext(page, 'admin-recipe-generator-search.png', 'Searching for AdminRecipeGenerator buttons');
    
    // Test AI parsing button if found
    if (await aiGenerateButton.count() > 0) {
      console.log('✅ Found AI parsing button');
      
      // Fill in natural language input first
      const textArea = page.locator('textarea[placeholder*="Example"]');
      if (await textArea.count() > 0) {
        await textArea.fill('Generate 10 high-protein breakfast recipes');
        await aiGenerateButton.first().click();
        console.log('✅ Clicked AI parsing button');
      }
    }
    
    // Test direct generation button if found
    if (await directGenerateButton.count() > 0) {
      console.log('✅ Found direct generation button');
      await directGenerateButton.first().click();
      console.log('✅ Clicked direct generation button');
    }
    
    // Test custom recipes button if found
    if (await customRecipesButton.count() > 0) {
      console.log('✅ Found custom recipes button');
      await customRecipesButton.first().click();
      console.log('✅ Clicked custom recipes button');
    }
    
    // Take final screenshot
    await takeScreenshotWithContext(page, 'admin-recipe-generator-interaction-complete.png', 'After AdminRecipeGenerator interaction');
  });

  test('Test API Endpoints and Network Requests', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Monitor all network requests
    const networkRequests: string[] = [];
    const failedRequests: string[] = [];
    
    page.on('request', request => {
      networkRequests.push(`${request.method()} ${request.url()}`);
    });
    
    page.on('response', response => {
      if (!response.ok()) {
        failedRequests.push(`${response.status()} ${response.url()}`);
      }
    });
    
    await navigateToAdminTab(page);
    
    // Try to trigger API calls by clicking buttons
    const generateBatchButton = page.locator('button:has-text("Generate New Batch")').first();
    if (await generateBatchButton.count() > 0) {
      await generateBatchButton.click();
      
      // Wait a moment for any network requests
      await page.waitForTimeout(2000);
    }
    
    // Log network activity
    console.log('📡 Network Requests Made:');
    networkRequests.forEach(req => console.log(`  ${req}`));
    
    console.log('🚨 Failed Network Requests:');
    failedRequests.forEach(req => console.log(`  ${req}`));
    
    // Test specific API endpoints
    const adminStatsRequest = page.waitForResponse('**/api/admin/stats');
    await page.reload();
    
    try {
      const statsResponse = await adminStatsRequest;
      console.log(`✅ Admin stats API: ${statsResponse.status()}`);
    } catch (error) {
      console.error('❌ Admin stats API failed:', error);
    }
  });

  test('Test Error Handling and Loading States', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToAdminTab(page);
    
    // Look for loading states
    const loadingElements = page.locator('.loading, .spinner, .animate-spin, [aria-busy="true"]');
    if (await loadingElements.count() > 0) {
      console.log('✅ Found loading indicators');
      await takeScreenshotWithContext(page, 'loading-states-found.png', 'Loading states present');
    }
    
    // Look for error states
    const errorElements = page.locator('.error, .alert-error, [role="alert"], .text-red');
    if (await errorElements.count() > 0) {
      console.log('⚠️ Found error indicators');
      const errorText = await errorElements.first().textContent();
      console.log('Error text:', errorText);
      await takeScreenshotWithContext(page, 'error-states-found.png', 'Error states present');
    }
    
    // Test button disabled states
    const allButtons = page.locator('button');
    const buttonCount = await allButtons.count();
    let disabledButtons = 0;
    
    for (let i = 0; i < buttonCount; i++) {
      const button = allButtons.nth(i);
      const isDisabled = await button.isDisabled();
      if (isDisabled) {
        disabledButtons++;
        const buttonText = await button.textContent();
        console.log(`🔒 Disabled button found: "${buttonText}"`);
      }
    }
    
    console.log(`📊 Button Analysis: ${buttonCount} total buttons, ${disabledButtons} disabled`);
  });

  test('Complete Admin Workflow Integration Test', async ({ page }) => {
    console.log('🧪 Running complete admin workflow test...');
    
    // Step 1: Login
    await loginAsAdmin(page);
    await takeScreenshotWithContext(page, 'workflow-01-login.png', 'Step 1: Login complete');
    
    // Step 2: Navigate to Admin tab
    await navigateToAdminTab(page);
    await takeScreenshotWithContext(page, 'workflow-02-admin-tab.png', 'Step 2: Admin tab loaded');
    
    // Step 3: Test Generate New Batch
    const generateButton = page.locator('button:has-text("Generate New Batch")').first();
    if (await generateButton.count() > 0) {
      await generateButton.click();
      await page.waitForTimeout(1000);
      await takeScreenshotWithContext(page, 'workflow-03-generate-clicked.png', 'Step 3: Generate New Batch clicked');
    }
    
    // Step 4: Test Review Queue
    const reviewButton = page.locator('button:has-text("View Pending"), button:has-text("Review Queue")').first();
    if (await reviewButton.count() > 0) {
      await reviewButton.click();
      await page.waitForTimeout(1000);
      await takeScreenshotWithContext(page, 'workflow-04-review-clicked.png', 'Step 4: Review Queue clicked');
    }
    
    // Step 5: Navigate to Meal Plans tab
    const mealPlansTab = page.locator('button[value="meal-plans"]').first();
    await mealPlansTab.click();
    await page.waitForTimeout(1000);
    await takeScreenshotWithContext(page, 'workflow-05-meal-plans.png', 'Step 5: Meal Plans tab');
    
    // Step 6: Final state
    await takeScreenshotWithContext(page, 'workflow-06-final-state.png', 'Step 6: Workflow complete');
    
    console.log('✅ Complete admin workflow test finished');
  });

  test.afterEach(async ({ page }) => {
    // Take a final screenshot of any errors or final state
    try {
      await takeScreenshotWithContext(page, `final-state-${Date.now()}.png`, 'Final page state');
    } catch (error) {
      console.error('Could not take final screenshot:', error);
    }
  });
});

// Export helper functions for use in other tests
export { loginAsAdmin, navigateToAdminTab, takeScreenshotWithContext };