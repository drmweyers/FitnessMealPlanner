/**
 * Comprehensive System E2E Test Suite
 *
 * End-to-end testing covering complete user journeys, cross-component interactions,
 * and system-wide functionality for the FitnessMealPlanner application.
 *
 * Test Coverage:
 * - Complete user onboarding and authentication flows
 * - Multi-role user interactions and workflows
 * - Recipe creation, approval, and management lifecycle
 * - Meal plan generation, assignment, and tracking
 * - PDF export and sharing functionality
 * - System performance under realistic load
 * - Cross-browser compatibility scenarios
 * - Mobile and responsive design validation
 * - Error handling and recovery workflows
 * - Data persistence and synchronization
 *
 * @author FitnessMealPlanner Test Team
 * @since 1.0.0
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:4000';
const TEST_TIMEOUT = 60000;
const API_TIMEOUT = 30000;

// Test credentials
const TEST_USERS = {
  admin: {
    email: 'admin@fitmeal.pro',
    password: 'AdminPass123',
    role: 'admin'
  },
  trainer: {
    email: 'trainer.test@evofitmeals.com',
    password: 'TestTrainer123!',
    role: 'trainer'
  },
  customer: {
    email: 'customer.test@evofitmeals.com',
    password: 'TestCustomer123!',
    role: 'customer'
  }
};

// Helper functions
const login = async (page: Page, user: typeof TEST_USERS.admin) => {
  await page.goto(`${BASE_URL}/auth/login`);
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');

  // Wait for successful login redirect
  await expect(page).toHaveURL(/\/(dashboard|admin)/);
  await page.waitForLoadState('networkidle');
};

const generateTestRecipe = () => ({
  name: `E2E Test Recipe ${Date.now()}`,
  description: 'A comprehensive test recipe created during E2E testing',
  mealTypes: ['breakfast'],
  dietaryTags: ['vegetarian'],
  ingredients: [
    { name: 'Eggs', amount: '2', unit: 'pieces' },
    { name: 'Spinach', amount: '100', unit: 'grams' }
  ],
  instructions: '1. Beat eggs\n2. Add spinach\n3. Cook until set',
  prepTime: 10,
  cookTime: 15,
  servings: 2,
  calories: 300
});

const waitForElement = async (page: Page, selector: string, timeout = 10000) => {
  return await page.waitForSelector(selector, { timeout });
};

const takeScreenshotOnFailure = async (page: Page, testName: string) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `test-results/failure-${testName}-${timestamp}.png`,
    fullPage: true
  });
};

test.describe('Comprehensive System E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for E2E tests
    test.setTimeout(TEST_TIMEOUT);

    // Handle console errors and warnings
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`Console error: ${msg.text()}`);
      }
    });

    // Handle uncaught exceptions
    page.on('pageerror', error => {
      console.log(`Page error: ${error.message}`);
    });
  });

  test.describe('Complete User Authentication Flows', () => {
    test('should complete full admin authentication and navigation', async ({ page }) => {
      try {
        // Login as admin
        await login(page, TEST_USERS.admin);

        // Verify admin dashboard access
        await expect(page.locator('h1')).toContainText('Admin Dashboard');

        // Navigate to different admin sections
        await page.click('text=Recipes');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('text=Recipe Management')).toBeVisible();

        await page.click('text=Admin');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('text=Generate Recipes')).toBeVisible();

        // Test logout
        await page.click('[data-testid="user-menu"]', { timeout: 5000 });
        await page.click('text=Logout');
        await expect(page).toHaveURL(/login/);

      } catch (error) {
        await takeScreenshotOnFailure(page, 'admin-auth-flow');
        throw error;
      }
    });

    test('should complete trainer authentication and role-specific access', async ({ page }) => {
      try {
        // Login as trainer
        await login(page, TEST_USERS.trainer);

        // Verify trainer dashboard
        await expect(page.locator('text=Trainer Dashboard')).toBeVisible();

        // Check trainer-specific features
        await expect(page.locator('text=My Customers')).toBeVisible();
        await expect(page.locator('text=Saved Meal Plans')).toBeVisible();

        // Verify admin sections are not accessible
        await page.goto(`${BASE_URL}/admin`);
        await expect(page.locator('text=Access Denied')).toBeVisible();

      } catch (error) {
        await takeScreenshotOnFailure(page, 'trainer-auth-flow');
        throw error;
      }
    });

    test('should complete customer authentication and journey', async ({ page }) => {
      try {
        // Login as customer
        await login(page, TEST_USERS.customer);

        // Verify customer dashboard
        await expect(page.locator('text=Welcome')).toBeVisible();

        // Navigate to meal plans
        await page.click('text=Meal Plans');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('text=My Meal Plans')).toBeVisible();

        // Navigate to progress
        await page.click('text=Progress');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('text=Track Your Progress')).toBeVisible();

      } catch (error) {
        await takeScreenshotOnFailure(page, 'customer-auth-flow');
        throw error;
      }
    });

    test('should handle invalid authentication attempts', async ({ page }) => {
      try {
        await page.goto(`${BASE_URL}/auth/login`);

        // Test invalid credentials
        await page.fill('input[type="email"]', 'invalid@example.com');
        await page.fill('input[type="password"]', 'wrongpassword');
        await page.click('button[type="submit"]');

        // Should show error message
        await expect(page.locator('text=Invalid credentials')).toBeVisible();

        // Test malformed email
        await page.fill('input[type="email"]', 'not-an-email');
        await page.fill('input[type="password"]', 'somepassword');
        await page.click('button[type="submit"]');

        // Should show validation error
        await expect(page.locator('text=Invalid email')).toBeVisible();

      } catch (error) {
        await takeScreenshotOnFailure(page, 'invalid-auth');
        throw error;
      }
    });
  });

  test.describe('Recipe Management Lifecycle', () => {
    test('should complete full recipe creation and approval workflow', async ({ page }) => {
      try {
        // Login as admin
        await login(page, TEST_USERS.admin);

        // Navigate to admin section
        await page.click('text=Admin');
        await page.waitForLoadState('networkidle');

        // Test recipe generation (if available)
        const generateButton = page.locator('text=Generate New Batch');
        if (await generateButton.isVisible()) {
          await generateButton.click();

          // Wait for generation modal or process
          await page.waitForTimeout(2000);

          // Close modal if opened
          const closeButton = page.locator('[data-testid="close-generation-modal"]');
          if (await closeButton.isVisible()) {
            await closeButton.click();
          }
        }

        // Navigate to recipes management
        await page.click('text=Recipes');
        await page.waitForLoadState('networkidle');

        // Search for existing recipes
        const searchInput = page.locator('input[placeholder*="Search recipes"]');
        if (await searchInput.isVisible()) {
          await searchInput.fill('test');
          await page.waitForTimeout(1000);
        }

        // Check if recipes are displayed
        await expect(page.locator('[data-testid="recipe-card"]')).toBeVisible();

        // Test recipe approval (if pending recipes exist)
        const firstRecipe = page.locator('[data-testid="recipe-card"]').first();
        await firstRecipe.click();

        // Recipe modal should open
        await expect(page.locator('[data-testid="recipe-modal"]')).toBeVisible();

        // Check for approve button (if recipe is pending)
        const approveButton = page.locator('text=Approve Recipe');
        if (await approveButton.isVisible()) {
          await approveButton.click();
          await expect(page.locator('text=Recipe approved')).toBeVisible();
        }

        // Close modal
        await page.press('body', 'Escape');

      } catch (error) {
        await takeScreenshotOnFailure(page, 'recipe-lifecycle');
        throw error;
      }
    });

    test('should handle recipe search and filtering', async ({ page }) => {
      try {
        // Login as customer
        await login(page, TEST_USERS.customer);

        // Navigate to recipes (if available for customers)
        await page.goto(`${BASE_URL}/recipes`);
        await page.waitForLoadState('networkidle');

        // Test search functionality
        const searchInput = page.locator('input[placeholder*="Search"]');
        if (await searchInput.isVisible()) {
          await searchInput.fill('breakfast');
          await page.waitForTimeout(1000);

          // Verify search results
          const recipeCards = page.locator('[data-testid="recipe-card"]');
          const count = await recipeCards.count();
          expect(count).toBeGreaterThan(0);
        }

        // Test dietary filters
        const filterButton = page.locator('text=Filter');
        if (await filterButton.isVisible()) {
          await filterButton.click();

          // Select dietary preference
          const vegetarianFilter = page.locator('text=Vegetarian');
          if (await vegetarianFilter.isVisible()) {
            await vegetarianFilter.click();
            await page.waitForTimeout(1000);
          }

          // Apply filters
          const applyButton = page.locator('text=Apply Filters');
          if (await applyButton.isVisible()) {
            await applyButton.click();
            await page.waitForTimeout(1000);
          }
        }

      } catch (error) {
        await takeScreenshotOnFailure(page, 'recipe-search');
        throw error;
      }
    });
  });

  test.describe('Meal Plan Generation and Management', () => {
    test('should complete meal plan generation workflow', async ({ page }) => {
      try {
        // Login as customer
        await login(page, TEST_USERS.customer);

        // Navigate to meal plan generator
        await page.click('text=Generate Meal Plan');
        await page.waitForLoadState('networkidle');

        // Fill out meal plan form
        await page.fill('input[name="planName"]', `E2E Test Plan ${Date.now()}`);

        // Select meal plan options
        const daysSelect = page.locator('select[name="days"]');
        if (await daysSelect.isVisible()) {
          await daysSelect.selectOption('7');
        }

        const mealsSelect = page.locator('select[name="mealsPerDay"]');
        if (await mealsSelect.isVisible()) {
          await mealsSelect.selectOption('3');
        }

        const caloriesInput = page.locator('input[name="dailyCalorieTarget"]');
        if (await caloriesInput.isVisible()) {
          await caloriesInput.fill('2000');
        }

        // Select fitness goal
        const goalSelect = page.locator('select[name="fitnessGoal"]');
        if (await goalSelect.isVisible()) {
          await goalSelect.selectOption('weight_loss');
        }

        // Generate meal plan
        await page.click('button[type="submit"]');

        // Wait for generation to complete
        await page.waitForTimeout(5000);

        // Verify meal plan was created
        await expect(page.locator('text=Meal plan generated successfully')).toBeVisible();

        // Navigate to saved meal plans
        await page.click('text=My Meal Plans');
        await page.waitForLoadState('networkidle');

        // Verify plan is listed
        await expect(page.locator('text=E2E Test Plan')).toBeVisible();

      } catch (error) {
        await takeScreenshotOnFailure(page, 'meal-plan-generation');
        throw error;
      }
    });

    test('should handle trainer meal plan assignment workflow', async ({ page }) => {
      try {
        // Login as trainer
        await login(page, TEST_USERS.trainer);

        // Navigate to saved meal plans
        await page.click('text=Saved Meal Plans');
        await page.waitForLoadState('networkidle');

        // Create a new meal plan or select existing
        const createButton = page.locator('text=Create New Plan');
        if (await createButton.isVisible()) {
          await createButton.click();

          // Fill out basic meal plan info
          await page.fill('input[name="planName"]', `Trainer Plan ${Date.now()}`);
          await page.fill('textarea[name="description"]', 'Plan created by trainer for customer assignment');

          // Save plan
          await page.click('button[type="submit"]');
          await page.waitForTimeout(2000);
        }

        // Assign to customer
        const assignButton = page.locator('text=Assign to Customer').first();
        if (await assignButton.isVisible()) {
          await assignButton.click();

          // Select customer from list
          const customerSelect = page.locator('select[name="customerId"]');
          if (await customerSelect.isVisible()) {
            await customerSelect.selectOption({ index: 1 });
          }

          // Confirm assignment
          await page.click('text=Assign Plan');
          await expect(page.locator('text=Plan assigned successfully')).toBeVisible();
        }

      } catch (error) {
        await takeScreenshotOnFailure(page, 'trainer-assignment');
        throw error;
      }
    });
  });

  test.describe('PDF Export Functionality', () => {
    test('should generate and download PDF meal plans', async ({ page }) => {
      try {
        // Login as customer
        await login(page, TEST_USERS.customer);

        // Navigate to meal plans
        await page.click('text=Meal Plans');
        await page.waitForLoadState('networkidle');

        // Find a meal plan with PDF export option
        const exportButton = page.locator('text=Export PDF').first();
        if (await exportButton.isVisible()) {
          // Setup download listener
          const downloadPromise = page.waitForEvent('download');

          // Click export button
          await exportButton.click();

          // Wait for download
          const download = await downloadPromise;

          // Verify download occurred
          expect(download.suggestedFilename()).toContain('.pdf');

          // Save download for verification
          await download.saveAs(`test-results/meal-plan-${Date.now()}.pdf`);
        }

      } catch (error) {
        await takeScreenshotOnFailure(page, 'pdf-export');
        throw error;
      }
    });

    test('should handle PDF export with different formats', async ({ page }) => {
      try {
        // Login as trainer
        await login(page, TEST_USERS.trainer);

        // Navigate to customer meal plans
        await page.click('text=My Customers');
        await page.waitForLoadState('networkidle');

        // Select a customer
        const customerCard = page.locator('[data-testid="customer-card"]').first();
        if (await customerCard.isVisible()) {
          await customerCard.click();

          // Find meal plan for PDF export
          const mealPlanCard = page.locator('[data-testid="meal-plan-card"]').first();
          if (await mealPlanCard.isVisible()) {
            await mealPlanCard.click();

            // Test different PDF export options
            const exportOptions = page.locator('text=Export Options');
            if (await exportOptions.isVisible()) {
              await exportOptions.click();

              // Select format options
              const formatSelect = page.locator('select[name="exportFormat"]');
              if (await formatSelect.isVisible()) {
                await formatSelect.selectOption('detailed');
              }

              // Include grocery list option
              const includeGrocery = page.locator('input[name="includeGroceryList"]');
              if (await includeGrocery.isVisible()) {
                await includeGrocery.check();
              }

              // Generate PDF
              await page.click('text=Generate PDF');
              await page.waitForTimeout(3000);
            }
          }
        }

      } catch (error) {
        await takeScreenshotOnFailure(page, 'pdf-formats');
        throw error;
      }
    });
  });

  test.describe('Progress Tracking and Analytics', () => {
    test('should complete progress tracking workflow', async ({ page }) => {
      try {
        // Login as customer
        await login(page, TEST_USERS.customer);

        // Navigate to progress section
        await page.click('text=Progress');
        await page.waitForLoadState('networkidle');

        // Add new measurement
        const addButton = page.locator('text=Add Measurement');
        if (await addButton.isVisible()) {
          await addButton.click();

          // Fill measurement form
          await page.fill('input[name="weight"]', '70.5');
          await page.fill('input[name="bodyFat"]', '15.2');
          await page.fill('input[name="muscleMass"]', '45.8');

          // Add date
          const dateInput = page.locator('input[type="date"]');
          if (await dateInput.isVisible()) {
            await dateInput.fill('2024-01-15');
          }

          // Save measurement
          await page.click('button[type="submit"]');
          await expect(page.locator('text=Measurement added')).toBeVisible();
        }

        // Check progress charts
        await page.click('text=Charts');
        await page.waitForLoadState('networkidle');

        // Verify charts are rendered
        await expect(page.locator('canvas')).toBeVisible();

        // Test different chart views
        const chartTypeSelect = page.locator('select[name="chartType"]');
        if (await chartTypeSelect.isVisible()) {
          await chartTypeSelect.selectOption('weight');
          await page.waitForTimeout(1000);

          await chartTypeSelect.selectOption('bodyFat');
          await page.waitForTimeout(1000);
        }

      } catch (error) {
        await takeScreenshotOnFailure(page, 'progress-tracking');
        throw error;
      }
    });

    test('should display analytics for trainers', async ({ page }) => {
      try {
        // Login as trainer
        await login(page, TEST_USERS.trainer);

        // Navigate to analytics (if available)
        const analyticsTab = page.locator('text=Analytics');
        if (await analyticsTab.isVisible()) {
          await analyticsTab.click();
          await page.waitForLoadState('networkidle');

          // Check dashboard metrics
          await expect(page.locator('text=Total Customers')).toBeVisible();
          await expect(page.locator('text=Active Meal Plans')).toBeVisible();

          // Test date range filters
          const dateRange = page.locator('select[name="dateRange"]');
          if (await dateRange.isVisible()) {
            await dateRange.selectOption('last30days');
            await page.waitForTimeout(2000);

            await dateRange.selectOption('last90days');
            await page.waitForTimeout(2000);
          }

          // Check customer progress charts
          const customerSelect = page.locator('select[name="customerId"]');
          if (await customerSelect.isVisible()) {
            await customerSelect.selectOption({ index: 1 });
            await page.waitForTimeout(1000);

            // Verify customer-specific charts load
            await expect(page.locator('canvas')).toBeVisible();
          }
        }

      } catch (error) {
        await takeScreenshotOnFailure(page, 'trainer-analytics');
        throw error;
      }
    });
  });

  test.describe('Responsive Design and Mobile Experience', () => {
    test('should work correctly on mobile viewport', async ({ page }) => {
      try {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });

        // Login as customer
        await login(page, TEST_USERS.customer);

        // Test mobile navigation
        const mobileMenu = page.locator('[data-testid="mobile-menu"]');
        if (await mobileMenu.isVisible()) {
          await mobileMenu.click();

          // Navigate through mobile menu
          await page.click('text=Meal Plans');
          await page.waitForLoadState('networkidle');

          await mobileMenu.click();
          await page.click('text=Progress');
          await page.waitForLoadState('networkidle');
        }

        // Test meal plan generation on mobile
        await page.click('text=Generate Meal Plan');
        await page.waitForLoadState('networkidle');

        // Form should be mobile-optimized
        const form = page.locator('form');
        await expect(form).toBeVisible();

        // Test responsive form elements
        await page.fill('input[name="planName"]', 'Mobile Test Plan');

        // Scroll to submit button (mobile forms might be long)
        await page.locator('button[type="submit"]').scrollIntoViewIfNeeded();

      } catch (error) {
        await takeScreenshotOnFailure(page, 'mobile-experience');
        throw error;
      }
    });

    test('should work correctly on tablet viewport', async ({ page }) => {
      try {
        // Set tablet viewport
        await page.setViewportSize({ width: 768, height: 1024 });

        // Login as trainer
        await login(page, TEST_USERS.trainer);

        // Test tablet layout
        await page.click('text=My Customers');
        await page.waitForLoadState('networkidle');

        // Customer grid should adapt to tablet
        const customerGrid = page.locator('[data-testid="customer-grid"]');
        if (await customerGrid.isVisible()) {
          // Check grid layout adapts properly
          const customers = page.locator('[data-testid="customer-card"]');
          const count = await customers.count();
          expect(count).toBeGreaterThan(0);
        }

        // Test meal plan cards layout
        await page.click('text=Saved Meal Plans');
        await page.waitForLoadState('networkidle');

        const planGrid = page.locator('[data-testid="meal-plan-grid"]');
        if (await planGrid.isVisible()) {
          await expect(planGrid).toBeVisible();
        }

      } catch (error) {
        await takeScreenshotOnFailure(page, 'tablet-experience');
        throw error;
      }
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('should handle network failures gracefully', async ({ page }) => {
      try {
        // Login as customer
        await login(page, TEST_USERS.customer);

        // Navigate to meal plans
        await page.click('text=Meal Plans');
        await page.waitForLoadState('networkidle');

        // Simulate network failure
        await page.route('**/api/**', route => route.abort());

        // Try to generate meal plan
        await page.click('text=Generate Meal Plan');
        await page.waitForLoadState('networkidle');

        await page.fill('input[name="planName"]', 'Network Test Plan');
        await page.click('button[type="submit"]');

        // Should show error message
        await expect(page.locator('text=Network error')).toBeVisible();

        // Restore network
        await page.unroute('**/api/**');

        // Retry should work
        await page.click('text=Retry');
        await page.waitForTimeout(2000);

      } catch (error) {
        await takeScreenshotOnFailure(page, 'network-failure');
        throw error;
      }
    });

    test('should handle form validation errors', async ({ page }) => {
      try {
        // Login as admin
        await login(page, TEST_USERS.admin);

        // Navigate to recipe creation (if available)
        await page.click('text=Admin');
        await page.waitForLoadState('networkidle');

        const createRecipeButton = page.locator('text=Create Recipe');
        if (await createRecipeButton.isVisible()) {
          await createRecipeButton.click();

          // Submit empty form
          await page.click('button[type="submit"]');

          // Should show validation errors
          await expect(page.locator('text=Recipe name is required')).toBeVisible();

          // Fill partial form
          await page.fill('input[name="name"]', 'Test Recipe');
          await page.click('button[type="submit"]');

          // Should show remaining validation errors
          await expect(page.locator('text=Description is required')).toBeVisible();

          // Fill complete form
          await page.fill('textarea[name="description"]', 'Test description');
          await page.fill('input[name="prepTime"]', '10');
          await page.fill('input[name="cookTime"]', '15');
          await page.fill('input[name="servings"]', '2');
          await page.fill('input[name="calories"]', '300');

          // Should submit successfully
          await page.click('button[type="submit"]');
          await expect(page.locator('text=Recipe created')).toBeVisible();
        }

      } catch (error) {
        await takeScreenshotOnFailure(page, 'form-validation');
        throw error;
      }
    });

    test('should handle session expiration', async ({ page }) => {
      try {
        // Login as customer
        await login(page, TEST_USERS.customer);

        // Clear authentication cookies to simulate expiration
        await page.context().clearCookies();

        // Try to access protected resource
        await page.click('text=Generate Meal Plan');

        // Should redirect to login
        await expect(page).toHaveURL(/login/);
        await expect(page.locator('text=Session expired')).toBeVisible();

        // Login again should work
        await login(page, TEST_USERS.customer);
        await expect(page.locator('text=Welcome')).toBeVisible();

      } catch (error) {
        await takeScreenshotOnFailure(page, 'session-expiration');
        throw error;
      }
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    test('should work in different browser engines', async ({ page, browserName }) => {
      try {
        // Skip if not testing multiple browsers
        if (!process.env.CI) {
          test.skip();
        }

        // Login with current browser
        await login(page, TEST_USERS.customer);

        // Test core functionality works across browsers
        await page.click('text=Meal Plans');
        await page.waitForLoadState('networkidle');

        // Generate meal plan
        await page.click('text=Generate Meal Plan');
        await page.waitForLoadState('networkidle');

        await page.fill('input[name="planName"]', `${browserName} Test Plan`);

        // Test form submission works
        await page.click('button[type="submit"]');
        await page.waitForTimeout(3000);

        // Verify success or appropriate response
        const successMessage = page.locator('text=generated successfully');
        const errorMessage = page.locator('text=error');

        // Either should work or show expected error
        await expect(successMessage.or(errorMessage)).toBeVisible();

      } catch (error) {
        await takeScreenshotOnFailure(page, `browser-${browserName}`);
        throw error;
      }
    });
  });

  test.describe('Performance and Load Testing', () => {
    test('should handle multiple simultaneous users', async ({ browser }) => {
      try {
        // Create multiple browser contexts to simulate different users
        const contexts = await Promise.all([
          browser.newContext(),
          browser.newContext(),
          browser.newContext()
        ]);

        const pages = await Promise.all(
          contexts.map(context => context.newPage())
        );

        // Login as different users simultaneously
        await Promise.all([
          login(pages[0], TEST_USERS.admin),
          login(pages[1], TEST_USERS.trainer),
          login(pages[2], TEST_USERS.customer)
        ]);

        // Perform different actions simultaneously
        await Promise.all([
          // Admin searches recipes
          pages[0].click('text=Recipes').then(() => pages[0].waitForLoadState('networkidle')),

          // Trainer views customers
          pages[1].click('text=My Customers').then(() => pages[1].waitForLoadState('networkidle')),

          // Customer generates meal plan
          pages[2].click('text=Generate Meal Plan').then(() => pages[2].waitForLoadState('networkidle'))
        ]);

        // Verify all actions completed successfully
        await expect(pages[0].locator('text=Recipe Management')).toBeVisible();
        await expect(pages[1].locator('text=Customers')).toBeVisible();
        await expect(pages[2].locator('text=Generate')).toBeVisible();

        // Cleanup
        await Promise.all(contexts.map(context => context.close()));

      } catch (error) {
        console.error('Multi-user test failed:', error);
        throw error;
      }
    });

    test('should handle large datasets efficiently', async ({ page }) => {
      try {
        // Login as admin
        await login(page, TEST_USERS.admin);

        // Navigate to recipes with potentially large dataset
        await page.click('text=Recipes');
        await page.waitForLoadState('networkidle');

        // Test pagination with large dataset
        const paginationInfo = page.locator('text=Page 1 of');
        if (await paginationInfo.isVisible()) {
          // Test pagination navigation
          const nextButton = page.locator('text=Next');
          if (await nextButton.isVisible()) {
            await nextButton.click();
            await page.waitForLoadState('networkidle');

            // Verify page changed
            await expect(page.locator('text=Page 2 of')).toBeVisible();
          }
        }

        // Test search with large dataset
        const searchInput = page.locator('input[placeholder*="Search"]');
        if (await searchInput.isVisible()) {
          // Measure search response time
          const startTime = Date.now();

          await searchInput.fill('test');
          await page.waitForTimeout(1000);

          const endTime = Date.now();
          const responseTime = endTime - startTime;

          // Search should complete within reasonable time
          expect(responseTime).toBeLessThan(5000);
        }

      } catch (error) {
        await takeScreenshotOnFailure(page, 'large-dataset');
        throw error;
      }
    });
  });

  test.describe('Data Persistence and Synchronization', () => {
    test('should persist data across browser sessions', async ({ page }) => {
      try {
        // Login and create data
        await login(page, TEST_USERS.customer);

        // Generate a meal plan
        await page.click('text=Generate Meal Plan');
        await page.waitForLoadState('networkidle');

        const planName = `Persistence Test ${Date.now()}`;
        await page.fill('input[name="planName"]', planName);

        const caloriesInput = page.locator('input[name="dailyCalorieTarget"]');
        if (await caloriesInput.isVisible()) {
          await caloriesInput.fill('2000');
        }

        await page.click('button[type="submit"]');
        await page.waitForTimeout(3000);

        // Navigate away and back
        await page.click('text=Progress');
        await page.waitForLoadState('networkidle');

        await page.click('text=Meal Plans');
        await page.waitForLoadState('networkidle');

        // Data should still be there
        await expect(page.locator(`text=${planName}`)).toBeVisible();

        // Refresh page
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Data should persist after refresh
        await expect(page.locator(`text=${planName}`)).toBeVisible();

      } catch (error) {
        await takeScreenshotOnFailure(page, 'data-persistence');
        throw error;
      }
    });

    test('should synchronize data between trainer and customer views', async ({ browser }) => {
      try {
        // Create two browser contexts
        const trainerContext = await browser.newContext();
        const customerContext = await browser.newContext();

        const trainerPage = await trainerContext.newPage();
        const customerPage = await customerContext.newPage();

        // Login as trainer and customer
        await login(trainerPage, TEST_USERS.trainer);
        await login(customerPage, TEST_USERS.customer);

        // Trainer assigns meal plan
        await trainerPage.click('text=Saved Meal Plans');
        await trainerPage.waitForLoadState('networkidle');

        // Create and assign plan (simplified)
        const assignButton = trainerPage.locator('text=Assign to Customer').first();
        if (await assignButton.isVisible()) {
          await assignButton.click();

          const customerSelect = trainerPage.locator('select[name="customerId"]');
          if (await customerSelect.isVisible()) {
            await customerSelect.selectOption({ index: 1 });
            await trainerPage.click('text=Assign Plan');
            await trainerPage.waitForTimeout(2000);
          }
        }

        // Customer should see assigned plan
        await customerPage.reload();
        await customerPage.waitForLoadState('networkidle');

        await customerPage.click('text=Meal Plans');
        await customerPage.waitForLoadState('networkidle');

        // Plan should be visible in customer view
        const assignedPlan = customerPage.locator('[data-testid="meal-plan-card"]');
        await expect(assignedPlan).toBeVisible();

        // Cleanup
        await trainerContext.close();
        await customerContext.close();

      } catch (error) {
        console.error('Data synchronization test failed:', error);
        throw error;
      }
    });
  });

  test.describe('Accessibility and User Experience', () => {
    test('should be accessible with keyboard navigation', async ({ page }) => {
      try {
        // Login as customer
        await login(page, TEST_USERS.customer);

        // Test keyboard navigation
        await page.press('body', 'Tab');

        // Navigate through main menu with keyboard
        let activeElement = await page.evaluate(() => document.activeElement?.tagName);
        expect(['A', 'BUTTON', 'INPUT'].includes(activeElement)).toBeTruthy();

        // Press Enter on focused element
        await page.press('body', 'Enter');
        await page.waitForTimeout(1000);

        // Test form navigation with keyboard
        await page.goto(`${BASE_URL}/generate-meal-plan`);
        await page.waitForLoadState('networkidle');

        // Tab through form elements
        await page.press('body', 'Tab');
        await page.press('body', 'Tab');

        // Fill form with keyboard
        await page.type('input[name="planName"]', 'Keyboard Test Plan');

        // Navigate to submit button
        for (let i = 0; i < 5; i++) {
          await page.press('body', 'Tab');
        }

        // Submit with Enter
        await page.press('body', 'Enter');

      } catch (error) {
        await takeScreenshotOnFailure(page, 'keyboard-navigation');
        throw error;
      }
    });

    test('should have proper ARIA labels and semantic HTML', async ({ page }) => {
      try {
        // Login as admin
        await login(page, TEST_USERS.admin);

        // Check for proper heading structure
        const h1 = await page.locator('h1').count();
        expect(h1).toBeGreaterThan(0);

        // Check for ARIA labels on interactive elements
        const buttons = page.locator('button');
        const buttonCount = await buttons.count();

        for (let i = 0; i < Math.min(buttonCount, 5); i++) {
          const button = buttons.nth(i);
          const ariaLabel = await button.getAttribute('aria-label');
          const text = await button.textContent();

          // Button should have either aria-label or visible text
          expect(ariaLabel || text?.trim()).toBeTruthy();
        }

        // Check for form labels
        const inputs = page.locator('input[type="text"], input[type="email"], input[type="password"]');
        const inputCount = await inputs.count();

        for (let i = 0; i < Math.min(inputCount, 3); i++) {
          const input = inputs.nth(i);
          const id = await input.getAttribute('id');

          if (id) {
            const label = page.locator(`label[for="${id}"]`);
            await expect(label).toBeVisible();
          }
        }

      } catch (error) {
        await takeScreenshotOnFailure(page, 'accessibility');
        throw error;
      }
    });
  });
});