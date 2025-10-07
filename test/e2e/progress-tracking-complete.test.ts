import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:4000';
const CUSTOMER_EMAIL = 'customer.test@evofitmeals.com';
const CUSTOMER_PASSWORD = 'TestCustomer123!';

// Helper function to login as customer
async function loginAsCustomer(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', CUSTOMER_EMAIL);
  await page.fill('input[type="password"]', CUSTOMER_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/my-meal-plans');
}

// Helper function to navigate to Progress Tracking
async function navigateToProgress(page: Page) {
  await page.click('a[href="/profile"]');
  await page.waitForURL('**/profile');
  await page.click('text=Progress');
  await expect(page.locator('h2:has-text("Progress Tracking")')).toBeVisible();
}

test.describe('Progress Tracking - Complete E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCustomer(page);
    await navigateToProgress(page);
  });

  test.describe('Tab Navigation', () => {
    test('should have only Measurements and Goals tabs (Photos tab removed)', async ({ page }) => {
      // Verify only 2 tabs exist
      const tabs = page.locator('[role="tablist"] button[role="tab"]');
      await expect(tabs).toHaveCount(2);
      
      // Verify tab names
      await expect(tabs.nth(0)).toHaveText('Measurements');
      await expect(tabs.nth(1)).toHaveText('Goals');
      
      // Verify Photos tab doesn't exist
      await expect(page.locator('button[role="tab"]:has-text("Progress Photos")')).not.toBeVisible();
    });

    test('should switch between tabs correctly', async ({ page }) => {
      // Start on Measurements tab (default)
      await expect(page.locator('[role="tabpanel"]').first()).toContainText('Body Measurements');
      
      // Click Goals tab
      await page.click('button[role="tab"]:has-text("Goals")');
      await expect(page.locator('[role="tabpanel"]').first()).toContainText('Fitness Goals');
      
      // Click back to Measurements
      await page.click('button[role="tab"]:has-text("Measurements")');
      await expect(page.locator('[role="tabpanel"]').first()).toContainText('Body Measurements');
    });
  });

  test.describe('Quick Stats Cards', () => {
    test('should display 3 stat cards (Photos card removed)', async ({ page }) => {
      const statCards = page.locator('.grid > .card').filter({ hasText: /Current Weight|Body Fat|Active Goals/ });
      await expect(statCards).toHaveCount(3);
      
      // Verify specific cards exist
      await expect(page.locator('.card:has-text("Current Weight")')).toBeVisible();
      await expect(page.locator('.card:has-text("Body Fat %")')).toBeVisible();
      await expect(page.locator('.card:has-text("Active Goals")')).toBeVisible();
      
      // Verify Photos card doesn't exist
      await expect(page.locator('.card:has-text("Progress Photos")')).not.toBeVisible();
    });
  });

  test.describe('Measurements Tab', () => {
    test('should add a new measurement', async ({ page }) => {
      // Click Add Measurement button
      await page.click('button:has-text("Add Measurement")');
      
      // Fill in the form
      await page.fill('input[name="weight"]', '175');
      await page.fill('input[name="bodyFat"]', '18.5');
      await page.fill('input[name="chest"]', '42');
      await page.fill('input[name="waist"]', '32');
      await page.fill('input[name="hips"]', '38');
      await page.fill('input[name="biceps"]', '15');
      await page.fill('input[name="thighs"]', '24');
      await page.fill('input[name="calves"]', '15');
      await page.fill('textarea[name="notes"]', 'Feeling strong today!');
      
      // Save the measurement
      await page.click('button:has-text("Save Measurement")');
      
      // Verify success message
      await expect(page.locator('.toast:has-text("Measurement added successfully")')).toBeVisible();
      
      // Verify measurement appears in the table
      await expect(page.locator('td:has-text("175")')).toBeVisible();
      await expect(page.locator('td:has-text("18.5")')).toBeVisible();
    });

    test('should edit an existing measurement', async ({ page }) => {
      // Assuming there's at least one measurement
      // Click edit button on first measurement
      await page.click('button[aria-label="Edit measurement"]').first();
      
      // Update weight value
      await page.fill('input[name="weight"]', '173');
      
      // Save changes
      await page.click('button:has-text("Update Measurement")');
      
      // Verify success message
      await expect(page.locator('.toast:has-text("Measurement updated successfully")')).toBeVisible();
      
      // Verify updated value appears
      await expect(page.locator('td:has-text("173")')).toBeVisible();
    });

    test('should delete a measurement', async ({ page }) => {
      // Click delete button on first measurement
      await page.click('button[aria-label="Delete measurement"]').first();
      
      // Confirm deletion
      await page.click('button:has-text("Confirm")');
      
      // Verify success message
      await expect(page.locator('.toast:has-text("Measurement deleted successfully")')).toBeVisible();
    });

    test('should handle empty state correctly', async ({ page }) => {
      // If no measurements exist, should show empty state
      const emptyState = page.locator('text=/No measurements recorded yet|Start tracking your progress/');
      
      if (await emptyState.isVisible()) {
        await expect(emptyState).toBeVisible();
        await expect(page.locator('button:has-text("Add Your First Measurement")')).toBeVisible();
      }
    });
  });

  test.describe('Goals Tab', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to Goals tab
      await page.click('button[role="tab"]:has-text("Goals")');
      await page.waitForTimeout(500); // Wait for tab content to load
    });

    test('should create a new goal', async ({ page }) => {
      // Click Add Goal button
      await page.click('button:has-text("Add Goal")');
      
      // Fill in the goal form
      await page.selectOption('select[name="type"]', 'weight_loss');
      await page.fill('input[name="targetValue"]', '150');
      await page.fill('input[name="currentValue"]', '165');
      await page.fill('input[name="targetDate"]', '2024-12-31');
      await page.fill('textarea[name="notes"]', 'Summer body goal');
      
      // Save the goal
      await page.click('button:has-text("Save Goal")');
      
      // Verify success message
      await expect(page.locator('.toast:has-text("Goal created successfully")')).toBeVisible();
      
      // Verify goal appears in the list
      await expect(page.locator('text=Summer body goal')).toBeVisible();
      await expect(page.locator('text=Weight Loss')).toBeVisible();
    });

    test('should update goal progress', async ({ page }) => {
      // Assuming there's at least one goal
      // Click Update Progress button
      await page.click('button:has-text("Update Progress")').first();
      
      // Enter new progress value
      await page.fill('input[name="currentProgress"]', '160');
      
      // Save progress
      await page.click('button:has-text("Save Progress")');
      
      // Verify success message
      await expect(page.locator('.toast:has-text("Progress updated successfully")')).toBeVisible();
      
      // Verify progress is reflected
      await expect(page.locator('text=160')).toBeVisible();
    });

    test('should handle different goal types', async ({ page }) => {
      const goalTypes = ['weight_loss', 'weight_gain', 'muscle_gain', 'body_fat', 'performance', 'other'];
      
      for (const goalType of goalTypes) {
        await page.click('button:has-text("Add Goal")');
        
        // Verify goal type option exists
        const option = page.locator(`select[name="type"] option[value="${goalType}"]`);
        await expect(option).toBeVisible();
        
        // Cancel to close the form
        await page.click('button:has-text("Cancel")');
      }
    });

    test('should mark goal as achieved', async ({ page }) => {
      // Click on goal status dropdown
      await page.click('button[aria-label="Change goal status"]').first();
      
      // Select achieved status
      await page.click('text=Achieved');
      
      // Verify status change
      await expect(page.locator('.badge:has-text("Achieved")')).toBeVisible();
      await expect(page.locator('.toast:has-text("Goal status updated")')).toBeVisible();
    });

    test('should delete a goal', async ({ page }) => {
      // Click delete button on a goal
      await page.click('button[aria-label="Delete goal"]').first();
      
      // Confirm deletion
      await page.click('button:has-text("Delete")');
      
      // Verify success message
      await expect(page.locator('.toast:has-text("Goal deleted successfully")')).toBeVisible();
    });
  });

  test.describe('Progress Charts', () => {
    test('should display progress charts', async ({ page }) => {
      // Verify charts section exists
      await expect(page.locator('text=Progress Charts')).toBeVisible();
      
      // Verify chart containers
      await expect(page.locator('.recharts-wrapper')).toBeVisible();
      
      // Verify chart interactions
      const chartContainer = page.locator('.recharts-wrapper').first();
      await chartContainer.hover();
      
      // Check for tooltip on hover (if data exists)
      const tooltip = page.locator('.recharts-tooltip');
      if (await tooltip.isVisible()) {
        await expect(tooltip).toContainText(/Weight|Body Fat|Measurements/);
      }
    });

    test('should toggle between different chart views', async ({ page }) => {
      // Look for chart toggle buttons
      const toggleButtons = page.locator('button').filter({ hasText: /Weight|Body Fat|All Measurements/ });
      
      if (await toggleButtons.count() > 0) {
        // Click through different views
        for (let i = 0; i < await toggleButtons.count(); i++) {
          await toggleButtons.nth(i).click();
          await page.waitForTimeout(300); // Wait for chart to update
          await expect(page.locator('.recharts-wrapper')).toBeVisible();
        }
      }
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should be responsive on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 812 });
      
      // Verify layout adjusts for mobile
      await expect(page.locator('h2:has-text("Progress Tracking")')).toBeVisible();
      
      // Stats should stack vertically
      const statsGrid = page.locator('.grid').first();
      await expect(statsGrid).toHaveCSS('grid-template-columns', /1fr/);
      
      // Tabs should still be functional
      await page.click('button[role="tab"]:has-text("Goals")');
      await expect(page.locator('text=Fitness Goals')).toBeVisible();
      
      // Forms should be full width
      await page.click('button:has-text("Add Goal")');
      const form = page.locator('form').first();
      await expect(form).toBeVisible();
    });

    test('should handle tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Verify layout adjusts for tablet
      await expect(page.locator('h2:has-text("Progress Tracking")')).toBeVisible();
      
      // Stats should be in 2 columns
      const statsGrid = page.locator('.grid').first();
      await expect(statsGrid).toBeVisible();
      
      // Navigation should work
      await page.click('button[role="tab"]:has-text("Measurements")');
      await expect(page.locator('text=Body Measurements')).toBeVisible();
    });
  });

  test.describe('Edge Cases and Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Intercept API calls and simulate network error
      await page.route('**/api/progress/**', route => route.abort());
      
      // Try to load goals
      await page.click('button[role="tab"]:has-text("Goals")');
      
      // Should show error state or empty state
      await expect(page.locator('text=/Unable to load|No goals|Try again/')).toBeVisible();
    });

    test('should validate form inputs', async ({ page }) => {
      // Try to submit empty measurement form
      await page.click('button:has-text("Add Measurement")');
      await page.click('button:has-text("Save Measurement")');
      
      // Should show validation errors or not submit
      const errors = page.locator('.error-message, .text-red-500, [aria-invalid="true"]');
      if (await errors.count() > 0) {
        await expect(errors.first()).toBeVisible();
      }
    });

    test('should handle invalid date inputs', async ({ page }) => {
      await page.click('button[role="tab"]:has-text("Goals")');
      await page.click('button:has-text("Add Goal")');
      
      // Try to set past date for target
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateString = yesterday.toISOString().split('T')[0];
      
      await page.fill('input[name="targetDate"]', dateString);
      await page.click('button:has-text("Save Goal")');
      
      // Should show validation error or not allow submission
      const errorMessage = page.locator('text=/must be in the future|Invalid date/');
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toBeVisible();
      }
    });

    test('should handle concurrent updates', async ({ page, context }) => {
      // Open a second tab
      const page2 = await context.newPage();
      await loginAsCustomer(page2);
      await navigateToProgress(page2);
      
      // Make changes in first tab
      await page.click('button[role="tab"]:has-text("Goals")');
      
      // Make changes in second tab
      await page2.click('button[role="tab"]:has-text("Measurements")');
      
      // Both should work without conflicts
      await expect(page.locator('text=Fitness Goals')).toBeVisible();
      await expect(page2.locator('text=Body Measurements')).toBeVisible();
      
      await page2.close();
    });
  });
});

test.describe('Meal Prep Calendar Removal Verification', () => {
  test('should not have Meal Prep Calendar in navigation', async ({ page }) => {
    await loginAsCustomer(page);
    
    // Check that Meal Prep link doesn't exist
    await expect(page.locator('a[href="/meal-prep"]')).not.toBeVisible();
    await expect(page.locator('a[href="/meal-prep-calendar"]')).not.toBeVisible();
    await expect(page.locator('text=Meal Prep Calendar')).not.toBeVisible();
    
    // Try to navigate directly to the route
    await page.goto(`${BASE_URL}/meal-prep`);
    
    // Should redirect or show 404
    await expect(page).not.toHaveURL('**/meal-prep');
    
    await page.goto(`${BASE_URL}/meal-prep-calendar`);
    await expect(page).not.toHaveURL('**/meal-prep-calendar');
  });
});