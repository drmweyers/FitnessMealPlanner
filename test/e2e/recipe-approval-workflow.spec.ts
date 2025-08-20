/**
 * Playwright E2E Tests for Recipe Approval Workflow
 * 
 * Tests the complete recipe approval workflow including:
 * - Navigating to pending recipes page
 * - Individual recipe approval
 * - Bulk approval functionality 
 * - Page refresh behavior
 * - Error handling scenarios
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

const BASE_URL = 'http://localhost:4000';

// Test admin credentials (ensure these exist in your test database)
const ADMIN_CREDENTIALS = {
  email: 'admin@test.com',
  password: 'admin123'
};

// Helper function to login as admin
async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  
  // Fill login form
  await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
  await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
  
  // Submit login
  await page.click('button[type="submit"]');
  
  // Wait for redirect to admin dashboard
  await page.waitForURL(`${BASE_URL}/admin`);
}

// Helper function to navigate to pending recipes
async function navigateToPendingRecipes(page: Page) {
  // Go to admin dashboard if not already there
  if (!page.url().includes('/admin')) {
    await page.goto(`${BASE_URL}/admin`);
  }
  
  // Click on Admin tab to access admin functions
  await page.click('[role="tab"][data-value="admin"]');
  
  // Click on "View Pending" button in the Review Queue card
  await page.click('text=View Pending');
  
  // Wait for pending recipes to load
  await page.waitForSelector('[data-testid="pending-recipes-table"]', { timeout: 10000 });
}

// Helper function to generate test recipes
async function generateTestRecipes(page: Page, count: number = 3) {
  // Navigate to recipe generation
  await page.goto(`${BASE_URL}/admin`);
  await page.click('[role="tab"][data-value="admin"]');
  
  // Click "Generate New Batch" button
  await page.click('text=Generate New Batch');
  
  // Wait for modal and fill form
  await page.waitForSelector('[data-testid="recipe-generation-modal"]');
  await page.fill('input[name="count"]', count.toString());
  
  // Submit generation
  await page.click('button[type="submit"]');
  
  // Wait for success toast
  await page.waitForSelector('.toast', { timeout: 30000 });
  
  // Wait a bit for recipes to be generated
  await page.waitForTimeout(5000);
}

test.describe('Recipe Approval Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.describe('Navigation and Setup', () => {
    test('should navigate to pending recipes successfully', async ({ page }) => {
      await navigateToPendingRecipes(page);
      
      // Should see the pending recipes interface
      await expect(page.locator('h1')).toContainText('Admin Dashboard');
      
      // Should see either recipes or empty state
      const hasRecipes = await page.locator('[data-testid="recipe-card"]').count() > 0;
      const hasEmptyState = await page.locator('text=No pending recipes').isVisible();
      
      expect(hasRecipes || hasEmptyState).toBe(true);
    });

    test('should display pending recipes count in header', async ({ page }) => {
      await navigateToPendingRecipes(page);
      
      // Should show count (either 0 or more)
      const countElement = page.locator('text=/\\d+ recipes pending approval/');
      await expect(countElement).toBeVisible();
    });
  });

  test.describe('Individual Recipe Approval', () => {
    test('should approve individual recipe successfully', async ({ page }) => {
      // First ensure we have some pending recipes
      await generateTestRecipes(page, 2);
      await navigateToPendingRecipes(page);
      
      // Wait for recipes to be visible
      await page.waitForSelector('[data-testid="recipe-card"]', { timeout: 10000 });
      
      const initialCount = await page.locator('[data-testid="recipe-card"]').count();
      expect(initialCount).toBeGreaterThan(0);
      
      // Click approve on first recipe
      const approveButton = page.locator('button:has-text("Approve")').first();
      await approveButton.click();
      
      // Should see success toast
      await expect(page.locator('.toast:has-text("Recipe Approved")')).toBeVisible();
      
      // Page should refresh and show one less recipe
      await page.waitForTimeout(2000); // Allow for refresh
      const finalCount = await page.locator('[data-testid="recipe-card"]').count();
      expect(finalCount).toBe(initialCount - 1);
    });

    test('should delete individual recipe successfully', async ({ page }) => {
      // Ensure we have pending recipes
      await generateTestRecipes(page, 2);
      await navigateToPendingRecipes(page);
      
      await page.waitForSelector('[data-testid="recipe-card"]', { timeout: 10000 });
      
      const initialCount = await page.locator('[data-testid="recipe-card"]').count();
      
      // Click delete on first recipe
      const deleteButton = page.locator('button:has-text("Delete")').first();
      await deleteButton.click();
      
      // Should see success toast
      await expect(page.locator('.toast:has-text("Recipe Deleted")')).toBeVisible();
      
      // Should have one less recipe
      await page.waitForTimeout(2000);
      const finalCount = await page.locator('[data-testid="recipe-card"]').count();
      expect(finalCount).toBe(initialCount - 1);
    });

    test('should open recipe modal when clicking recipe name', async ({ page }) => {
      await generateTestRecipes(page, 1);
      await navigateToPendingRecipes(page);
      
      await page.waitForSelector('[data-testid="recipe-card"]');
      
      // Click on recipe name/title
      const recipeName = page.locator('[data-testid="recipe-card"] h3').first();
      await recipeName.click();
      
      // Should open modal
      await expect(page.locator('[data-testid="recipe-modal"]')).toBeVisible();
      
      // Close modal
      await page.click('[data-testid="close-recipe-modal"]');
      await expect(page.locator('[data-testid="recipe-modal"]')).not.toBeVisible();
    });
  });

  test.describe('Bulk Approval Functionality', () => {
    test('should show bulk approve button with correct count', async ({ page }) => {
      await generateTestRecipes(page, 3);
      await navigateToPendingRecipes(page);
      
      await page.waitForSelector('[data-testid="recipe-card"]');
      
      const recipeCount = await page.locator('[data-testid="recipe-card"]').count();
      
      // Should show "Approve All (X)" button
      const bulkApproveButton = page.locator(`button:has-text("Approve All (${recipeCount})")`);
      await expect(bulkApproveButton).toBeVisible();
    });

    test('should approve all recipes successfully', async ({ page }) => {
      await generateTestRecipes(page, 3);
      await navigateToPendingRecipes(page);
      
      await page.waitForSelector('[data-testid="recipe-card"]');
      
      const initialCount = await page.locator('[data-testid="recipe-card"]').count();
      expect(initialCount).toBeGreaterThan(0);
      
      // Click "Approve All" button
      const bulkApproveButton = page.locator('button:has-text("Approve All")');
      await bulkApproveButton.click();
      
      // Should see loading state
      await expect(page.locator('button:has-text("Approving All")')).toBeVisible();
      
      // Should see success toast
      await expect(page.locator('.toast:has-text("All Recipes Approved")')).toBeVisible({ timeout: 10000 });
      
      // Should show empty state after all approved
      await expect(page.locator('text=No pending recipes')).toBeVisible({ timeout: 5000 });
    });

    test('should disable bulk approve button during operation', async ({ page }) => {
      await generateTestRecipes(page, 2);
      await navigateToPendingRecipes(page);
      
      await page.waitForSelector('[data-testid="recipe-card"]');
      
      const bulkApproveButton = page.locator('button:has-text("Approve All")');
      await bulkApproveButton.click();
      
      // Button should be disabled during operation
      await expect(bulkApproveButton).toBeDisabled();
      
      // Should show loading text
      await expect(page.locator('button:has-text("Approving All")')).toBeVisible();
    });
  });

  test.describe('Page Refresh and State Management', () => {
    test('should refresh data when refresh button is clicked', async ({ page }) => {
      await navigateToPendingRecipes(page);
      
      // Click refresh button
      const refreshButton = page.locator('button:has-text("Refresh")');
      await refreshButton.click();
      
      // Should see refreshing toast
      await expect(page.locator('.toast:has-text("Refreshing")')).toBeVisible();
      
      // Page should update (we can verify this by checking the data loads)
      await page.waitForTimeout(1000);
    });

    test('should maintain correct state after approval operations', async ({ page }) => {
      await generateTestRecipes(page, 2);
      await navigateToPendingRecipes(page);
      
      await page.waitForSelector('[data-testid="recipe-card"]');
      
      // Approve one recipe
      await page.click('button:has-text("Approve")');
      await expect(page.locator('.toast:has-text("Recipe Approved")')).toBeVisible();
      
      // Wait for state to update
      await page.waitForTimeout(2000);
      
      // Count should be updated in header
      const remainingCount = await page.locator('[data-testid="recipe-card"]').count();
      const headerText = await page.locator('text=/\\d+ recipes pending approval/').textContent();
      
      expect(headerText).toContain(remainingCount.toString());
    });
  });

  test.describe('Responsive Design', () => {
    test('should work correctly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
      
      await navigateToPendingRecipes(page);
      
      // Should show mobile card layout
      const isMobileView = await page.locator('.lg\\:hidden').isVisible();
      expect(isMobileView).toBe(true);
      
      // Mobile approve buttons should work
      if (await page.locator('[data-testid="recipe-card"]').count() > 0) {
        await page.click('button:has-text("Approve")');
        await expect(page.locator('.toast')).toBeVisible();
      }
    });

    test('should work correctly on desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1200, height: 800 });
      
      await navigateToPendingRecipes(page);
      
      // Should show desktop table layout
      const isDesktopView = await page.locator('table').isVisible();
      expect(isDesktopView).toBe(true);
    });
  });

  test.describe('Error Scenarios', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      await navigateToPendingRecipes(page);
      
      // Simulate network failure
      await page.route('**/api/admin/recipes/*/approve', route => {
        route.abort('failed');
      });
      
      if (await page.locator('[data-testid="recipe-card"]').count() > 0) {
        await page.click('button:has-text("Approve")');
        
        // Should show error toast
        await expect(page.locator('.toast:has-text("Error")')).toBeVisible();
      }
    });

    test('should handle authentication errors', async ({ page }) => {
      await navigateToPendingRecipes(page);
      
      // Simulate 401 response
      await page.route('**/api/admin/recipes/*/approve', route => {
        route.fulfill({
          status: 401,
          body: JSON.stringify({ error: 'Unauthorized' })
        });
      });
      
      if (await page.locator('[data-testid="recipe-card"]').count() > 0) {
        await page.click('button:has-text("Approve")');
        
        // Should show unauthorized toast and redirect
        await expect(page.locator('.toast:has-text("Unauthorized")')).toBeVisible();
      }
    });
  });

  test.describe('Empty State', () => {
    test('should display empty state when no pending recipes', async ({ page }) => {
      await navigateToPendingRecipes(page);
      
      // If there are no pending recipes, should show empty state
      const hasRecipes = await page.locator('[data-testid="recipe-card"]').count() > 0;
      
      if (!hasRecipes) {
        await expect(page.locator('text=No pending recipes')).toBeVisible();
        await expect(page.locator('text=All recipes have been reviewed and approved')).toBeVisible();
      }
    });

    test('should transition to empty state after approving all recipes', async ({ page }) => {
      await generateTestRecipes(page, 1);
      await navigateToPendingRecipes(page);
      
      await page.waitForSelector('[data-testid="recipe-card"]');
      
      // Approve all recipes
      await page.click('button:has-text("Approve All")');
      
      // Should show success and then empty state
      await expect(page.locator('.toast:has-text("All Recipes Approved")')).toBeVisible();
      await expect(page.locator('text=No pending recipes')).toBeVisible({ timeout: 5000 });
    });
  });
});