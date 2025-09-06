/**
 * Comprehensive E2E Bug Fixes Test Suite
 * 
 * End-to-end tests to verify all bug fixes work correctly in production-like environment.
 * Tests the complete user workflows that were affected by the bugs.
 */

import { test, expect } from '@playwright/test';

test.describe('Bug Fixes Comprehensive E2E Tests', () => {
  const ADMIN_EMAIL = 'admin@fitmeal.pro';
  const ADMIN_PASSWORD = 'AdminPass123';
  const TRAINER_EMAIL = 'trainer.test@evofitmeals.com';
  const TRAINER_PASSWORD = 'TestTrainer123!';

  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:4000');
  });

  test.describe('Recipe Generation Workflow (BUG #3 & #6 Fixes)', () => {
    test('should handle recipe generation without navigation errors', async ({ page }) => {
      // Login as admin
      await page.fill('input[type="email"]', ADMIN_EMAIL);
      await page.fill('input[type="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      
      // Wait for admin dashboard
      await expect(page.locator('h1:has-text("Admin Dashboard")')).toBeVisible();
      
      // Navigate to admin tab
      await page.click('[data-testid="admin-tab-admin"]');
      
      // Open recipe generation modal
      await page.click('[data-testid="admin-generate-recipes"]');
      
      // Verify modal opened
      await expect(page.locator('h1:has-text("Generate Targeted Recipes")')).toBeVisible();
      
      // Test Quick Random Generation button
      const quickGenButton = page.locator('text=Generate Random Recipes');
      await expect(quickGenButton).toBeVisible();
      await expect(quickGenButton).not.toBeDisabled();
      
      // Click quick generation (should not cause navigation errors)
      await quickGenButton.click();
      
      // Verify no navigation to error page or login redirect
      await expect(page).not.toHaveURL(/.*404.*/, { timeout: 5000 });
      await expect(page).not.toHaveURL(/.*login.*/, { timeout: 5000 });
      
      // Should show loading or success state
      await expect(page.locator('text=Generating...')).toBeVisible({ timeout: 10000 });
    });

    test('should handle authentication errors with proper React Router navigation', async ({ page }) => {
      // Login as admin first
      await page.fill('input[type="email"]', ADMIN_EMAIL);
      await page.fill('input[type="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      
      await expect(page.locator('h1:has-text("Admin Dashboard")')).toBeVisible();
      
      // Clear localStorage to simulate expired token
      await page.evaluate(() => localStorage.removeItem('token'));
      
      // Navigate to admin tab and try generation
      await page.click('[data-testid="admin-tab-admin"]');
      await page.click('[data-testid="admin-generate-recipes"]');
      
      // Try to generate recipes with expired token
      await page.click('text=Generate Random Recipes');
      
      // Should redirect to login using React Router (not full page reload)
      await expect(page).toHaveURL(/.*\/login.*/, { timeout: 10000 });
      
      // Should not have gone to /api/login
      expect(page.url()).not.toContain('/api/login');
    });
  });

  test.describe('Review Queue Workflow (BUG #4 Fix)', () => {
    test('should handle pending recipes review without redirect errors', async ({ page }) => {
      // Login as admin
      await page.fill('input[type="email"]', ADMIN_EMAIL);
      await page.fill('input[type="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      
      await expect(page.locator('h1:has-text("Admin Dashboard")')).toBeVisible();
      
      // Navigate to admin tab
      await page.click('[data-testid="admin-tab-admin"]');
      
      // Open review queue
      await page.click('[data-testid="admin-view-pending"]');
      
      // Verify pending recipes modal opened
      await expect(page.locator('h2:has-text("Pending Recipes")')).toBeVisible();
      
      // The review queue should load without errors
      await expect(page.locator('text=No pending recipes, text=recipes pending approval')).toBeVisible({ timeout: 10000 });
    });

    test('should redirect to /login not /api/login on auth errors in review queue', async ({ page }) => {
      // Login as admin
      await page.fill('input[type="email"]', ADMIN_EMAIL);
      await page.fill('input[type="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      
      await expect(page.locator('h1:has-text("Admin Dashboard")')).toBeVisible();
      
      // Clear token to simulate auth error
      await page.evaluate(() => localStorage.removeItem('token'));
      
      // Navigate to admin tab and open review queue
      await page.click('[data-testid="admin-tab-admin"]');
      await page.click('[data-testid="admin-view-pending"]');
      
      // Should redirect properly on auth error
      await expect(page).toHaveURL(/.*\/login.*/, { timeout: 15000 });
      expect(page.url()).not.toContain('/api/login');
    });
  });

  test.describe('Favorites Functionality (BUG #5 Fix)', () => {
    test('should handle favorites without Redis service errors', async ({ page }) => {
      // Login as trainer (has access to favorites)
      await page.fill('input[type="email"]', TRAINER_EMAIL);
      await page.fill('input[type="password"]', TRAINER_PASSWORD);
      await page.click('button[type="submit"]');
      
      await expect(page.locator('h1:has-text("Recipe Management")')).toBeVisible();
      
      // Navigate to recipes tab
      await page.click('text=Recipes');
      
      // Wait for recipes to load
      await page.waitForTimeout(3000);
      
      // Look for favorite buttons (heart icons)
      const favoriteButtons = page.locator('[data-testid*="favorite"], .fa-heart, [aria-label*="favorite"]');
      
      // If favorite buttons exist, test them
      const count = await favoriteButtons.count();
      if (count > 0) {
        // Click a favorite button
        await favoriteButtons.first().click();
        
        // Should not see Redis errors in console
        const logs = [];
        page.on('console', msg => logs.push(msg.text()));
        
        await page.waitForTimeout(2000);
        
        // Check that no Redis service errors occurred
        const redisErrors = logs.filter(log => 
          log.includes('RedisService.get is not a function') ||
          log.includes('TypeError: RedisService')
        );
        
        expect(redisErrors).toHaveLength(0);
      }
    });
  });

  test.describe('Meal Plan Save Functionality (BUG #6 Fix)', () => {
    test('should save meal plans with proper data instead of empty objects', async ({ page }) => {
      // Login as trainer
      await page.fill('input[type="email"]', TRAINER_EMAIL);
      await page.fill('input[type="password"]', TRAINER_PASSWORD);
      await page.click('button[type="submit"]');
      
      await expect(page.locator('h1:has-text("Recipe Management")')).toBeVisible();
      
      // Navigate to meal plan generator
      await page.click('text=Meal Plan Generator');
      
      // Wait for generator to load
      await page.waitForTimeout(2000);
      
      // Fill in generation form
      await page.selectOption('select[name="fitnessGoal"]', 'weight_loss');
      await page.fill('input[name="dailyCalorieTarget"]', '2000');
      
      // Generate a meal plan
      await page.click('text=Generate Meal Plan');
      
      // Wait for generation to complete
      await expect(page.locator('text=Generated Meal Plan, text=Meal Plan Generated')).toBeVisible({ timeout: 30000 });
      
      // Look for save button and click it
      const saveButton = page.locator('text=Save to Library, text=Save Plan');
      if (await saveButton.isVisible()) {
        // Listen for network requests to verify proper data is sent
        let saveRequestData: any = null;
        
        page.on('request', request => {
          if (request.url().includes('/api/trainer/meal-plans') && request.method() === 'POST') {
            saveRequestData = request.postData();
          }
        });
        
        await saveButton.click();
        
        // Wait for request to complete
        await page.waitForTimeout(3000);
        
        // Verify that proper data was sent (not empty object)
        if (saveRequestData) {
          const data = JSON.parse(saveRequestData);
          expect(data).not.toEqual({});
          expect(data).toHaveProperty('mealPlanData');
          expect(data).toHaveProperty('notes');
        }
        
        // Should show success message
        await expect(page.locator('text=Meal Plan Saved, text=saved successfully')).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Navigation and Routing (Overall Fix Verification)', () => {
    test('should maintain SPA routing throughout admin workflow', async ({ page }) => {
      let pageReloads = 0;
      
      page.on('load', () => {
        pageReloads++;
      });
      
      // Login as admin
      await page.fill('input[type="email"]', ADMIN_EMAIL);
      await page.fill('input[type="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      
      await expect(page.locator('h1:has-text("Admin Dashboard")')).toBeVisible();
      
      // Navigate through different tabs
      await page.click('[data-testid="admin-tab-recipes"]');
      await page.waitForTimeout(1000);
      
      await page.click('[data-testid="admin-tab-meal-plans"]');
      await page.waitForTimeout(1000);
      
      await page.click('[data-testid="admin-tab-admin"]');
      await page.waitForTimeout(1000);
      
      // Open and close modals
      await page.click('[data-testid="admin-generate-recipes"]');
      await expect(page.locator('h1:has-text("Generate Targeted Recipes")')).toBeVisible();
      
      // Close modal with X button
      await page.click('button[aria-label="Close"], .lucide-x, [data-testid="close-modal"]');
      
      // Verify minimal page reloads (only initial load)
      expect(pageReloads).toBeLessThanOrEqual(1);
    });

    test('should handle back button navigation correctly', async ({ page }) => {
      // Login as admin
      await page.fill('input[type="email"]', ADMIN_EMAIL);
      await page.fill('input[type="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      
      await expect(page.locator('h1:has-text("Admin Dashboard")')).toBeVisible();
      
      // Navigate to different tabs
      await page.click('[data-testid="admin-tab-meal-plans"]');
      await page.waitForTimeout(500);
      
      // Use browser back button
      await page.goBack();
      
      // Should not show 404 or error page
      await expect(page.locator('h1:has-text("Admin Dashboard")')).toBeVisible();
      await expect(page).not.toHaveURL(/.*404.*/);
      await expect(page.locator('text=Page Not Found, text=404')).not.toBeVisible();
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('should recover gracefully from API errors', async ({ page }) => {
      // Login as admin
      await page.fill('input[type="email"]', ADMIN_EMAIL);
      await page.fill('input[type="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      
      await expect(page.locator('h1:has-text("Admin Dashboard")')).toBeVisible();
      
      // Intercept and fail API requests to test error handling
      await page.route('**/api/admin/generate', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });
      
      // Try recipe generation
      await page.click('[data-testid="admin-tab-admin"]');
      await page.click('[data-testid="admin-generate-recipes"]');
      await page.click('text=Generate Random Recipes');
      
      // Should show error toast/message, not crash or redirect incorrectly
      await expect(page.locator('text=Failed, text=Error')).toBeVisible({ timeout: 10000 });
      
      // Should remain on the same page
      await expect(page).not.toHaveURL(/.*login.*/, { timeout: 5000 });
      await expect(page.locator('h1:has-text("Generate Targeted Recipes")')).toBeVisible();
    });
  });
});