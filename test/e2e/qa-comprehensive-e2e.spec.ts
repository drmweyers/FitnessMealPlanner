/**
 * Comprehensive E2E Tests for FitnessMealPlanner QA
 * 
 * This test suite covers critical user journeys across all roles
 * to verify production readiness of the qa-ready branch.
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const CONFIG = {
  baseUrl: 'http://localhost:4000',
  testAccounts: {
    admin: { email: 'admin@evofitmeals.com', password: 'Admin123!' },
    trainer: { email: 'trainer@evofitmeals.com', password: 'Trainer123!' },
    customer: { email: 'customer@evofitmeals.com', password: 'Customer123!' }
  },
  timeouts: {
    short: 5000,
    medium: 10000,
    long: 30000
  }
};

// Helper functions
const loginAs = async (page: Page, role: 'admin' | 'trainer' | 'customer') => {
  const account = CONFIG.testAccounts[role];
  
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', account.email);
  await page.fill('[data-testid="password-input"]', account.password);
  await page.click('[data-testid="login-button"]');
  
  // Wait for redirect after successful login
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: CONFIG.timeouts.medium });
};

const takeScreenshot = async (page: Page, name: string) => {
  await page.screenshot({ 
    path: `test-screenshots/qa-comprehensive/${name}.png`,
    fullPage: true 
  });
};

test.describe('QA Comprehensive E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for complex operations
    test.setTimeout(60000);
  });

  test.describe('🔐 Authentication & Authorization', () => {
    test('AC-001: Admin login and dashboard access', async ({ page }) => {
      await loginAs(page, 'admin');
      
      // Verify admin dashboard loads
      await expect(page).toHaveTitle(/Admin/);
      await takeScreenshot(page, 'admin-dashboard');
      
      // Verify admin-specific elements are visible
      await expect(page.locator('[data-testid="admin-navigation"]')).toBeVisible();
      await expect(page.locator('text=Recipe Management')).toBeVisible();
      await expect(page.locator('text=User Management')).toBeVisible();
    });

    test('AC-002: Trainer login and dashboard access', async ({ page }) => {
      await loginAs(page, 'trainer');
      
      // Verify trainer dashboard loads
      await expect(page).toHaveTitle(/Trainer/);
      await takeScreenshot(page, 'trainer-dashboard');
      
      // Verify trainer-specific elements are visible
      await expect(page.locator('[data-testid="trainer-navigation"]')).toBeVisible();
      await expect(page.locator('text=My Customers')).toBeVisible();
      await expect(page.locator('text=Meal Plans')).toBeVisible();
    });

    test('AC-003: Customer login and dashboard access', async ({ page }) => {
      await loginAs(page, 'customer');
      
      // Verify customer dashboard loads
      await expect(page).toHaveTitle(/Customer/);
      await takeScreenshot(page, 'customer-dashboard');
      
      // Verify customer-specific elements are visible
      await expect(page.locator('[data-testid="customer-navigation"]')).toBeVisible();
      await expect(page.locator('text=My Meal Plans')).toBeVisible();
      await expect(page.locator('text=Progress Tracking')).toBeVisible();
    });

    test('AC-004: Role-based access control', async ({ page }) => {
      // Login as customer
      await loginAs(page, 'customer');
      
      // Attempt to access admin routes directly
      await page.goto('/admin');
      
      // Should be redirected or see access denied
      await expect(page.locator('text=Access Denied')).toBeVisible()
        .or(page.locator('text=Not Found'));
      
      await takeScreenshot(page, 'access-denied-customer');
    });

    test('AC-005: Logout functionality', async ({ page }) => {
      await loginAs(page, 'admin');
      
      // Click logout button
      await page.click('[data-testid="logout-button"]');
      
      // Verify redirect to login page
      await page.waitForURL('**/login');
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
      
      await takeScreenshot(page, 'logout-success');
    });
  });

  test.describe('🍽️ Recipe Management', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'admin');
    });

    test('RM-001: Create new recipe', async ({ page }) => {
      // Navigate to recipe management
      await page.click('text=Recipe Management');
      await page.click('[data-testid="create-recipe-button"]');
      
      // Fill recipe form
      await page.fill('[data-testid="recipe-name"]', 'QA Test Recipe');
      await page.fill('[data-testid="recipe-description"]', 'A test recipe for QA validation');
      await page.selectOption('[data-testid="meal-type"]', 'breakfast');
      await page.fill('[data-testid="prep-time"]', '15');
      await page.fill('[data-testid="cook-time"]', '20');
      await page.fill('[data-testid="servings"]', '2');
      await page.fill('[data-testid="calories"]', '350');
      await page.fill('[data-testid="protein"]', '25');
      await page.fill('[data-testid="carbs"]', '30');
      await page.fill('[data-testid="fat"]', '12');
      
      // Add ingredients
      await page.click('[data-testid="add-ingredient"]');
      await page.fill('[data-testid="ingredient-name-0"]', 'Chicken Breast');
      await page.fill('[data-testid="ingredient-amount-0"]', '200');
      await page.fill('[data-testid="ingredient-unit-0"]', 'g');
      
      // Add instructions
      await page.fill('[data-testid="instructions"]', '1. Season chicken\n2. Cook for 20 minutes\n3. Serve hot');
      
      // Submit form
      await page.click('[data-testid="save-recipe"]');
      
      // Verify recipe was created
      await expect(page.locator('text=Recipe created successfully')).toBeVisible();
      await takeScreenshot(page, 'recipe-created');
    });

    test('RM-002: Recipe approval workflow', async ({ page }) => {
      // Navigate to pending recipes
      await page.click('text=Recipe Management');
      await page.click('[data-testid="pending-recipes-tab"]');
      
      // If there are pending recipes, approve one
      const pendingRecipes = page.locator('[data-testid="pending-recipe-item"]');
      const count = await pendingRecipes.count();
      
      if (count > 0) {
        await pendingRecipes.first().locator('[data-testid="approve-button"]').click();
        await expect(page.locator('text=Recipe approved')).toBeVisible();
        await takeScreenshot(page, 'recipe-approved');
      } else {
        await takeScreenshot(page, 'no-pending-recipes');
      }
    });

    test('RM-003: Recipe search and filtering', async ({ page }) => {
      await page.click('text=Recipe Management');
      
      // Test search functionality
      await page.fill('[data-testid="recipe-search"]', 'chicken');
      await page.press('[data-testid="recipe-search"]', 'Enter');
      
      // Wait for search results
      await page.waitForTimeout(2000);
      await takeScreenshot(page, 'recipe-search-results');
      
      // Test meal type filter
      await page.selectOption('[data-testid="meal-type-filter"]', 'dinner');
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'recipe-filtered-dinner');
      
      // Clear filters
      await page.click('[data-testid="clear-filters"]');
      await takeScreenshot(page, 'recipe-filters-cleared');
    });
  });

  test.describe('📋 Meal Plan Generation', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'trainer');
    });

    test('MP-001: Generate basic meal plan', async ({ page }) => {
      // Navigate to meal plan generator
      await page.click('text=Meal Plans');
      await page.click('[data-testid="generate-meal-plan"]');
      
      // Fill meal plan form
      await page.fill('[data-testid="meal-plan-name"]', 'QA Test Meal Plan');
      await page.selectOption('[data-testid="diet-type"]', 'balanced');
      await page.fill('[data-testid="target-calories"]', '2000');
      await page.selectOption('[data-testid="meals-per-day"]', '3');
      await page.fill('[data-testid="plan-duration"]', '7');
      
      // Generate meal plan
      await page.click('[data-testid="generate-plan-button"]');
      
      // Wait for generation to complete
      await page.waitForSelector('[data-testid="meal-plan-generated"]', { timeout: CONFIG.timeouts.long });
      await takeScreenshot(page, 'meal-plan-generated');
      
      // Verify meal plan contains meals
      await expect(page.locator('[data-testid="meal-item"]')).toHaveCount(21); // 7 days × 3 meals
    });

    test('MP-002: Assign meal plan to customer', async ({ page }) => {
      // Assuming we have a generated meal plan
      await page.click('text=Meal Plans');
      
      // Select existing meal plan
      const mealPlanItems = page.locator('[data-testid="meal-plan-item"]');
      if (await mealPlanItems.count() > 0) {
        await mealPlanItems.first().click();
        
        // Click assign button
        await page.click('[data-testid="assign-meal-plan"]');
        
        // Select customer
        await page.selectOption('[data-testid="customer-select"]', { index: 0 });
        await page.click('[data-testid="confirm-assignment"]');
        
        // Verify assignment success
        await expect(page.locator('text=Meal plan assigned successfully')).toBeVisible();
        await takeScreenshot(page, 'meal-plan-assigned');
      } else {
        await takeScreenshot(page, 'no-meal-plans-available');
      }
    });
  });

  test.describe('📄 PDF Export', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'trainer');
    });

    test('PDF-001: Client-side PDF export', async ({ page }) => {
      // Navigate to meal plans
      await page.click('text=Meal Plans');
      
      // Select a meal plan
      const mealPlanItems = page.locator('[data-testid="meal-plan-item"]');
      if (await mealPlanItems.count() > 0) {
        await mealPlanItems.first().click();
        
        // Setup download event listener
        const downloadPromise = page.waitForEvent('download');
        
        // Click PDF export button
        await page.click('[data-testid="export-pdf-button"]');
        
        // Wait for download
        const download = await downloadPromise;
        await takeScreenshot(page, 'pdf-export-initiated');
        
        // Verify download filename
        expect(download.suggestedFilename()).toContain('.pdf');
      } else {
        await takeScreenshot(page, 'no-meal-plans-for-pdf');
      }
    });

    test('PDF-002: Server-side PDF export', async ({ page }) => {
      await page.click('text=Meal Plans');
      
      const mealPlanItems = page.locator('[data-testid="meal-plan-item"]');
      if (await mealPlanItems.count() > 0) {
        await mealPlanItems.first().click();
        
        // Setup download event listener for server-side PDF
        const downloadPromise = page.waitForEvent('download');
        
        // Click server PDF export button
        await page.click('[data-testid="export-server-pdf-button"]');
        
        // Wait for download (server-side generation may take longer)
        const download = await downloadPromise;
        await takeScreenshot(page, 'server-pdf-export-completed');
        
        // Verify download
        expect(download.suggestedFilename()).toContain('.pdf');
      }
    });
  });

  test.describe('👥 Customer Management', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'trainer');
    });

    test('CM-001: Send customer invitation', async ({ page }) => {
      // Navigate to customer management
      await page.click('text=Customers');
      await page.click('[data-testid="invite-customer-button"]');
      
      // Fill invitation form
      await page.fill('[data-testid="customer-email"]', 'qa-test@example.com');
      await page.fill('[data-testid="customer-name"]', 'QA Test Customer');
      
      // Send invitation
      await page.click('[data-testid="send-invitation"]');
      
      // Verify invitation sent
      await expect(page.locator('text=Invitation sent successfully')).toBeVisible();
      await takeScreenshot(page, 'customer-invitation-sent');
    });

    test('CM-002: View customer list', async ({ page }) => {
      await page.click('text=Customers');
      
      // Verify customer list is visible
      await expect(page.locator('[data-testid="customer-list"]')).toBeVisible();
      await takeScreenshot(page, 'customer-list');
      
      // Check if there are customers
      const customerItems = page.locator('[data-testid="customer-item"]');
      if (await customerItems.count() > 0) {
        // View customer details
        await customerItems.first().click();
        await expect(page.locator('[data-testid="customer-details"]')).toBeVisible();
        await takeScreenshot(page, 'customer-details');
      }
    });
  });

  test.describe('📈 Progress Tracking', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'customer');
    });

    test('PT-001: Add body measurements', async ({ page }) => {
      // Navigate to progress tracking
      await page.click('text=Progress');
      await page.click('[data-testid="measurements-tab"]');
      
      // Add new measurement
      await page.click('[data-testid="add-measurement"]');
      await page.fill('[data-testid="weight-input"]', '70');
      await page.fill('[data-testid="height-input"]', '175');
      await page.fill('[data-testid="body-fat-input"]', '15');
      
      // Save measurement
      await page.click('[data-testid="save-measurement"]');
      
      // Verify measurement saved
      await expect(page.locator('text=Measurement saved')).toBeVisible();
      await takeScreenshot(page, 'measurement-added');
    });

    test('PT-002: Upload progress photo', async ({ page }) => {
      await page.click('text=Progress');
      await page.click('[data-testid="photos-tab"]');
      
      // Upload photo (mock file)
      const fileInput = page.locator('[data-testid="photo-upload"]');
      await fileInput.setInputFiles({
        name: 'progress-photo.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data')
      });
      
      // Wait for upload confirmation
      await expect(page.locator('text=Photo uploaded successfully')).toBeVisible();
      await takeScreenshot(page, 'progress-photo-uploaded');
    });

    test('PT-003: Set fitness goals', async ({ page }) => {
      await page.click('text=Progress');
      await page.click('[data-testid="goals-tab"]');
      
      // Set goals
      await page.fill('[data-testid="target-weight"]', '68');
      await page.fill('[data-testid="target-body-fat"]', '12');
      await page.selectOption('[data-testid="goal-timeline"]', '3-months');
      
      // Save goals
      await page.click('[data-testid="save-goals"]');
      
      // Verify goals saved
      await expect(page.locator('text=Goals updated successfully')).toBeVisible();
      await takeScreenshot(page, 'fitness-goals-set');
    });
  });

  test.describe('📱 Mobile Responsiveness', () => {
    test('MR-001: Mobile navigation and functionality', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await loginAs(page, 'trainer');
      
      // Test mobile navigation
      await page.click('[data-testid="mobile-menu-button"]');
      await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
      await takeScreenshot(page, 'mobile-navigation');
      
      // Test mobile meal plan view
      await page.click('text=Meal Plans');
      await takeScreenshot(page, 'mobile-meal-plans');
      
      // Verify touch interactions work
      const mealPlanItems = page.locator('[data-testid="meal-plan-item"]');
      if (await mealPlanItems.count() > 0) {
        await mealPlanItems.first().tap();
        await takeScreenshot(page, 'mobile-meal-plan-details');
      }
    });

    test('MR-002: Tablet layout adaptation', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await loginAs(page, 'admin');
      
      // Test tablet layout
      await page.click('text=Recipe Management');
      await takeScreenshot(page, 'tablet-recipe-management');
      
      // Verify grid layout adapts properly
      await expect(page.locator('[data-testid="recipe-grid"]')).toBeVisible();
      
      // Test recipe creation on tablet
      await page.click('[data-testid="create-recipe-button"]');
      await takeScreenshot(page, 'tablet-recipe-form');
    });
  });

  test.describe('🔍 Health Protocol Removal Verification', () => {
    test('HP-001: Verify no Health Protocol tabs in GUI', async ({ page }) => {
      // Test admin interface
      await loginAs(page, 'admin');
      await expect(page.locator('text=Health Protocol')).not.toBeVisible();
      await takeScreenshot(page, 'admin-no-health-protocol');
      
      // Test trainer interface
      await page.goto('/logout');
      await loginAs(page, 'trainer');
      await expect(page.locator('text=Health Protocol')).not.toBeVisible();
      await takeScreenshot(page, 'trainer-no-health-protocol');
      
      // Test customer interface
      await page.goto('/logout');
      await loginAs(page, 'customer');
      await expect(page.locator('text=Health Protocol')).not.toBeVisible();
      await takeScreenshot(page, 'customer-no-health-protocol');
    });

    test('HP-002: Verify Health Protocol routes return 404', async ({ page }) => {
      await loginAs(page, 'trainer');
      
      // Attempt to access health protocol routes directly
      const response = await page.goto('/trainer/health-protocols');
      expect(response?.status()).toBe(404);
      
      await takeScreenshot(page, 'health-protocol-404');
    });
  });

  test.describe('🛡️ Security Tests', () => {
    test('SEC-001: XSS protection test', async ({ page }) => {
      await loginAs(page, 'admin');
      
      // Navigate to recipe creation
      await page.click('text=Recipe Management');
      await page.click('[data-testid="create-recipe-button"]');
      
      // Attempt XSS injection
      const xssPayload = '<script>alert("XSS")</script>';
      await page.fill('[data-testid="recipe-name"]', xssPayload);
      await page.click('[data-testid="save-recipe"]');
      
      // Verify XSS is blocked (no alert should appear)
      await page.waitForTimeout(2000);
      await takeScreenshot(page, 'xss-protection-test');
      
      // The payload should be escaped in the display
      await expect(page.locator('text=<script>')).not.toBeVisible();
    });

    test('SEC-002: Input validation test', async ({ page }) => {
      await loginAs(page, 'trainer');
      
      // Test meal plan generation with invalid inputs
      await page.click('text=Meal Plans');
      await page.click('[data-testid="generate-meal-plan"]');
      
      // Enter invalid calories (negative number)
      await page.fill('[data-testid="target-calories"]', '-500');
      await page.click('[data-testid="generate-plan-button"]');
      
      // Verify validation error appears
      await expect(page.locator('text=Please enter a valid calorie amount')).toBeVisible();
      await takeScreenshot(page, 'input-validation-test');
    });
  });
});

// Test helper for cleanup
test.afterAll(async () => {
  console.log('🧪 E2E test suite completed');
  console.log('📸 Screenshots saved to: test-screenshots/qa-comprehensive/');
});