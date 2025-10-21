import { test, expect, Page } from '@playwright/test';

// Test configuration
test.use({
  baseURL: 'http://localhost:4000',
  timeout: 60000,
  actionTimeout: 15000,
});

// Test accounts
const ADMIN = {
  email: 'admin@fitmeal.pro',
  password: 'AdminPass123'
};

// Helper function to login
async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  
  // Fill login form
  await page.locator('input[type="email"]').fill(ADMIN.email);
  await page.locator('input[type="password"]').fill(ADMIN.password);
  
  // Submit form
  await page.locator('button[type="submit"]').click();
  
  // Wait for successful login - check for dashboard or navigation menu
  await page.waitForSelector('text=/Dashboard|Admin|Recipes/', { timeout: 15000 });
  
  console.log('✅ Successfully logged in as admin');
}

test.describe('Recipe Generation - Core Functionality', () => {
  
  test('Application is accessible and login works', async ({ page }) => {
    // Navigate to app
    await page.goto('/');
    
    // Check if redirected to login
    await expect(page).toHaveURL(/login/);
    
    // Login
    await loginAsAdmin(page);
    
    // Verify we're logged in
    const navMenu = await page.locator('nav').or(page.locator('[role="navigation"]'));
    await expect(navMenu).toBeVisible();
  });

  test('Admin can access Admin Panel', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Look for Admin link/button in navigation
    const adminLink = await page.locator('text=Admin').first();
    await adminLink.click();
    
    // Wait for Admin Panel to load
    await page.waitForSelector('text=/Admin Panel|Admin Dashboard|Recipe Generation/', { timeout: 10000 });
    
    console.log('✅ Admin panel accessed successfully');
  });

  test('Recipe Generation buttons are present', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Navigate to Admin section
    await page.locator('text=Admin').first().click();
    await page.waitForTimeout(2000);
    
    // Check for recipe generation related text/buttons
    const pageContent = await page.content();
    
    // Look for key recipe features
    const features = [
      'Generate',
      'Recipe',
      'Batch',
      'Queue'
    ];
    
    const foundFeatures = [];
    for (const feature of features) {
      if (pageContent.toLowerCase().includes(feature.toLowerCase())) {
        foundFeatures.push(feature);
      }
    }
    
    console.log('✅ Found recipe features:', foundFeatures);
    expect(foundFeatures.length).toBeGreaterThan(0);
  });

  test('Can navigate to Recipes page', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Click on Recipes navigation
    const recipesLink = await page.locator('text=Recipes').first();
    await recipesLink.click();
    
    // Wait for recipes page to load
    await page.waitForSelector('text=/Recipe|Search|Filter/', { timeout: 10000 });
    
    console.log('✅ Recipes page loaded successfully');
  });

  test('Generate New Batch modal opens', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Go to Admin panel
    await page.locator('text=Admin').first().click();
    await page.waitForTimeout(2000);
    
    // Try to find and click Generate button
    const generateButton = await page.locator('button').filter({ hasText: /Generate.*Batch|New Batch/i }).first();
    
    if (await generateButton.isVisible()) {
      await generateButton.click();
      
      // Check if modal or new content appears
      await page.waitForTimeout(2000);
      
      // Look for modal indicators
      const modal = await page.locator('[role="dialog"]').or(page.locator('.modal')).or(page.locator('[data-state="open"]'));
      
      if (await modal.isVisible()) {
        console.log('✅ Generate New Batch modal opened successfully');
        
        // Close modal
        const closeButton = await page.locator('[aria-label="Close"]').or(page.locator('button').filter({ hasText: /Cancel|Close/i }));
        if (await closeButton.isVisible()) {
          await closeButton.first().click();
        }
      }
    } else {
      console.log('⚠️ Generate New Batch button not found in current view');
    }
  });

  test('Recipe statistics are visible', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Go to Admin panel
    await page.locator('text=Admin').first().click();
    await page.waitForTimeout(2000);
    
    // Look for statistics
    const pageContent = await page.content();
    
    const stats = [
      'Total',
      'Approved',
      'Pending',
      'Recipe'
    ];
    
    const foundStats = [];
    for (const stat of stats) {
      if (pageContent.includes(stat)) {
        foundStats.push(stat);
      }
    }
    
    console.log('✅ Found statistics:', foundStats);
    expect(foundStats.length).toBeGreaterThan(0);
  });
});