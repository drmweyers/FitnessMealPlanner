/**
 * Admin Edge Cases and UX Testing
 * Comprehensive testing of admin functionality edge cases
 */

import { test, expect } from '@playwright/test';

const ADMIN_CREDENTIALS = {
  email: 'admin@fitmeal.pro',
  password: 'AdminPass123'
};

test.describe('Admin Edge Cases and UX', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin before each test
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin');
    console.log('🔐 Logged in as admin');
  });

  test('Recipe Data Loading Investigation', async ({ page }) => {
    console.log('🔍 Investigating why recipe cards are not loading...');
    
    // Check network requests
    const networkRequests = [];
    page.on('request', request => {
      if (request.url().includes('api')) {
        networkRequests.push({
          url: request.url(),
          method: request.method()
        });
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('api') && response.status() !== 200) {
        console.log(`❌ API Error: ${response.url()} - Status: ${response.status()}`);
      }
    });
    
    // Wait for any pending requests
    await page.waitForTimeout(5000);
    
    // Check console for errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`🖥️ Console Error: ${msg.text()}`);
      }
    });
    
    // Check if recipes endpoint is being called
    console.log(`📡 API requests made: ${networkRequests.length}`);
    for (const req of networkRequests) {
      console.log(`   ${req.method} ${req.url}`);
    }
    
    // Take screenshot
    await page.screenshot({ path: 'admin-edge-cases/recipe-loading-debug.png' });
    
    // Check if there's a loading state
    const loadingIndicators = page.locator('div:has-text("Loading"), .loading, .spinner');
    const isLoading = await loadingIndicators.count();
    console.log(`⏳ Loading indicators found: ${isLoading}`);
    
    // Check for empty state messages
    const emptyMessages = page.locator('div:has-text("No recipes"), div:has-text("empty"), .empty-state');
    const emptyCount = await emptyMessages.count();
    console.log(`📭 Empty state messages: ${emptyCount}`);
    
    if (emptyCount > 0) {
      for (let i = 0; i < emptyCount; i++) {
        const message = await emptyMessages.nth(i).textContent();
        console.log(`   Empty message ${i + 1}: ${message?.trim()}`);
      }
    }
  });

  test('Tab Navigation and Content Loading', async ({ page }) => {
    console.log('🧭 Testing admin tab navigation...');
    
    const tabs = ['recipes', 'plans', 'admin'];
    
    for (const tabName of tabs) {
      try {
        console.log(`📋 Testing ${tabName} tab...`);
        
        // Click on tab
        const tabSelector = `[role="tab"]:has-text("${tabName}")`;
        await page.click(tabSelector, { force: true });
        await page.waitForTimeout(3000);
        
        // Take screenshot
        await page.screenshot({ path: `admin-edge-cases/tab-${tabName}.png` });
        
        // Check for content
        const content = page.locator('[role="tabpanel"]').first();
        const hasContent = await content.isVisible();
        console.log(`   ${tabName} content visible: ${hasContent}`);
        
        if (hasContent) {
          const contentText = await content.textContent();
          const contentLength = contentText?.length || 0;
          console.log(`   ${tabName} content length: ${contentLength} characters`);
        }
        
        // Check for specific elements based on tab
        if (tabName === 'recipes') {
          const recipeCards = page.locator('[data-testid*="recipe"], .recipe-card, div:has(img[alt*="recipe"])');
          const cardCount = await recipeCards.count();
          console.log(`   Recipe cards in ${tabName}: ${cardCount}`);
          
          // Check for recipe generation button
          const generateBtn = page.locator('button:has-text("Generate")');
          const canGenerate = await generateBtn.isVisible();
          console.log(`   Recipe generation button visible: ${canGenerate}`);
        }
        
        if (tabName === 'admin') {
          const adminControls = page.locator('button:has-text("View"), button:has-text("Delete"), button:has-text("Analytics")');
          const controlCount = await adminControls.count();
          console.log(`   Admin controls in ${tabName}: ${controlCount}`);
        }
        
      } catch (error) {
        console.log(`❌ Error testing ${tabName} tab:`, error.message);
      }
    }
  });

  test('Admin Actions and Interactions', async ({ page }) => {
    console.log('🎯 Testing admin actions and interactions...');
    
    // Test 1: Recipe Generation (if button exists)
    const generateBtn = page.locator('button:has-text("Generate")');
    const canGenerate = await generateBtn.isVisible();
    
    if (canGenerate) {
      console.log('🧪 Testing recipe generation...');
      await generateBtn.click();
      await page.waitForTimeout(3000);
      
      // Look for modals or forms
      const modal = page.locator('[role="dialog"], .modal');
      const modalVisible = await modal.isVisible();
      console.log(`   Generation modal visible: ${modalVisible}`);
      
      if (modalVisible) {
        await page.screenshot({ path: 'admin-edge-cases/generation-modal.png' });
        
        // Check for form fields
        const inputs = page.locator('input, textarea, select');
        const inputCount = await inputs.count();
        console.log(`   Form inputs found: ${inputCount}`);
        
        // Try to close modal (ESC or close button)
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
      }
    } else {
      console.log('   Recipe generation button not found');
    }
    
    // Test 2: Search/Filter functionality
    const searchInput = page.locator('input[placeholder*="search"], input[type="search"]');
    const hasSearch = await searchInput.isVisible();
    
    if (hasSearch) {
      console.log('🔍 Testing search functionality...');
      await searchInput.fill('chicken');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'admin-edge-cases/search-results.png' });
      
      // Clear search
      await searchInput.clear();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
    }
    
    // Test 3: Pagination (if visible)
    const paginationBtns = page.locator('button[aria-label*="page"]');
    const pageCount = await paginationBtns.count();
    
    if (pageCount > 0) {
      console.log(`📄 Testing pagination (${pageCount} buttons)...`);
      try {
        const nextBtn = page.locator('button[aria-label*="next"]');
        const canNext = await nextBtn.isVisible();
        
        if (canNext) {
          await nextBtn.click();
          await page.waitForTimeout(2000);
          console.log('   Next page navigation successful');
          await page.screenshot({ path: 'admin-edge-cases/pagination-next.png' });
          
          // Go back to first page
          const prevBtn = page.locator('button[aria-label*="previous"]');
          const canPrev = await prevBtn.isVisible();
          if (canPrev) {
            await prevBtn.click();
            await page.waitForTimeout(2000);
          }
        }
      } catch (error) {
        console.log('   Pagination test failed:', error.message);
      }
    }
  });

  test('Error Handling and Edge Cases', async ({ page }) => {
    console.log('🚨 Testing error handling and edge cases...');
    
    // Test 1: Invalid API calls (simulate network issues)
    console.log('📡 Testing API error handling...');
    
    // Intercept API calls and return errors
    await page.route('**/api/recipes**', route => {
      route.abort('failed');
    });
    
    // Refresh page to trigger API calls
    await page.reload();
    await page.waitForTimeout(5000);
    
    // Check for error messages
    const errorMessages = page.locator('div:has-text("error"), div:has-text("Error"), .error, .alert-error');
    const errorCount = await errorMessages.count();
    console.log(`   Error messages displayed: ${errorCount}`);
    
    if (errorCount > 0) {
      await page.screenshot({ path: 'admin-edge-cases/api-errors.png' });
      for (let i = 0; i < Math.min(errorCount, 3); i++) {
        const errorText = await errorMessages.nth(i).textContent();
        console.log(`   Error ${i + 1}: ${errorText?.trim()}`);
      }
    }
    
    // Remove route intercept
    await page.unroute('**/api/recipes**');
    
    // Test 2: Responsive behavior
    console.log('📱 Testing responsive behavior...');
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'admin-edge-cases/mobile-view.png' });
    
    // Check if mobile navigation works
    const mobileNav = page.locator('.mobile-nav, [aria-label*="mobile"]');
    const hasMobileNav = await mobileNav.isVisible();
    console.log(`   Mobile navigation visible: ${hasMobileNav}`);
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'admin-edge-cases/tablet-view.png' });
    
    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(2000);
    
    console.log('✅ Edge case testing completed');
  });
});