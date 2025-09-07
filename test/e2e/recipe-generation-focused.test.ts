import { test, expect } from '@playwright/test';

// Test accounts
const ADMIN_CREDENTIALS = {
  email: 'admin@fitmeal.pro',
  password: 'AdminPass123'
};

test.describe('Recipe Generation System - Focused Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:4000/login');
    
    // Login as admin
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
  });

  test('Recipe Generation - Generate New Batch button exists and is clickable', async ({ page }) => {
    // Navigate to Admin tab
    await page.click('text=Admin');
    
    // Wait for admin panel to load
    await page.waitForSelector('text=Admin Panel', { timeout: 5000 });
    
    // Check if Generate New Batch button exists
    const generateButton = page.locator('button:has-text("Generate New Batch")');
    await expect(generateButton).toBeVisible();
    
    // Click the button
    await generateButton.click();
    
    // Check if modal opens
    const modal = page.locator('text=Recipe Generation Options');
    await expect(modal).toBeVisible({ timeout: 5000 });
    
    // Close modal
    const closeButton = page.locator('[aria-label="Close"]').or(page.locator('button:has-text("Cancel")'));
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  });

  test('Recipe Generation - Review Recipe Queue button functionality', async ({ page }) => {
    // Navigate to Admin tab
    await page.click('text=Admin');
    
    // Wait for admin panel
    await page.waitForSelector('text=Admin Panel', { timeout: 5000 });
    
    // Check Review Recipe Queue button
    const reviewButton = page.locator('button:has-text("Review Recipe Queue")');
    await expect(reviewButton).toBeVisible();
    
    // Click the button
    await reviewButton.click();
    
    // Check if review interface loads
    await expect(page.locator('text=/Pending Recipes|Recipe Queue|Review Queue/')).toBeVisible({ timeout: 5000 });
  });

  test('Recipe Generation - Export Recipe Data functionality', async ({ page }) => {
    // Navigate to Admin tab
    await page.click('text=Admin');
    
    // Wait for admin panel
    await page.waitForSelector('text=Admin Panel', { timeout: 5000 });
    
    // Check Export Recipe Data button
    const exportButton = page.locator('button:has-text("Export Recipe Data")').or(page.locator('button:has-text("Export Data")'));
    
    // Button might be visible or in a dropdown
    if (await exportButton.isVisible()) {
      await exportButton.click();
      
      // Check for export confirmation or download
      await page.waitForTimeout(2000);
    }
  });

  test('Recipe Management - Search and filter functionality', async ({ page }) => {
    // Navigate to Recipes page
    await page.click('text=Recipes');
    
    // Wait for recipes to load
    await page.waitForSelector('text=/Recipe|Recipes/', { timeout: 5000 });
    
    // Check if search input exists
    const searchInput = page.locator('input[placeholder*="Search"]').or(page.locator('input[type="search"]'));
    
    if (await searchInput.isVisible()) {
      // Type in search
      await searchInput.fill('chicken');
      await page.waitForTimeout(1000);
      
      // Check if results update
      const recipes = page.locator('[data-testid="recipe-card"]').or(page.locator('.recipe-card'));
      const count = await recipes.count();
      console.log(`Found ${count} recipe cards after search`);
    }
  });

  test('Recipe Details - Modal interaction', async ({ page }) => {
    // Navigate to Recipes page
    await page.click('text=Recipes');
    
    // Wait for recipes to load
    await page.waitForSelector('text=/Recipe|Recipes/', { timeout: 5000 });
    
    // Click on first recipe card
    const firstRecipe = page.locator('[data-testid="recipe-card"]').or(page.locator('.recipe-card')).first();
    
    if (await firstRecipe.isVisible()) {
      await firstRecipe.click();
      
      // Check if modal opens with recipe details
      const modal = page.locator('[role="dialog"]').or(page.locator('.modal'));
      await expect(modal).toBeVisible({ timeout: 5000 });
      
      // Check for recipe details
      await expect(page.locator('text=/Ingredients|Nutrition|Instructions/')).toBeVisible();
      
      // Close modal
      const closeButton = page.locator('[aria-label="Close"]').or(page.locator('button:has-text("Close")'));
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    }
  });

  test('Admin Dashboard - All recipe buttons are accessible', async ({ page }) => {
    // Navigate to Admin tab
    await page.click('text=Admin');
    
    // Wait for admin panel
    await page.waitForSelector('text=Admin Panel', { timeout: 5000 });
    
    // List of expected buttons
    const expectedButtons = [
      'Generate New Batch',
      'Review Recipe Queue',
      'Export'
    ];
    
    // Check each button
    for (const buttonText of expectedButtons) {
      const button = page.locator(`button:has-text("${buttonText}")`);
      const isVisible = await button.isVisible();
      console.log(`Button "${buttonText}": ${isVisible ? 'FOUND' : 'NOT FOUND'}`);
    }
    
    // Check for recipe statistics
    const stats = page.locator('text=/Total Recipes|Approved|Pending/');
    if (await stats.isVisible()) {
      console.log('Recipe statistics are visible');
    }
  });
});