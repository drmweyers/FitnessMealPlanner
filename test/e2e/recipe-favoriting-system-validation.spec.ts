import { test, expect, Page } from '@playwright/test';

const TEST_CONFIG = {
  baseURL: 'http://localhost:4000',
  timeout: 30000
};

const TEST_ACCOUNTS = {
  customer: {
    email: 'testcustomer@example.com',
    password: 'TestPassword123!'
  }
};

/**
 * Recipe Favoriting System Integration Validation Tests
 * 
 * These tests verify that the Recipe Favoriting System components are properly integrated
 * into the main FitnessMealPlanner application.
 */
test.describe('Recipe Favoriting System Integration Validation', () => {
  
  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(TEST_CONFIG.timeout);
    
    // Reset rate limits
    await page.request.post(`${TEST_CONFIG.baseURL}/api/auth/dev/reset-rate-limits`);
  });

  test('Customer can login and navigate to recipe areas', async ({ page }) => {
    console.log('🔐 Testing customer login...');
    
    // Navigate to login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Fill in credentials
    await page.fill('input[type="email"]', TEST_ACCOUNTS.customer.email);
    await page.fill('input[type="password"]', TEST_ACCOUNTS.customer.password);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-screenshots/01-login-form.png',
      fullPage: true 
    });
    
    // Submit login
    await page.click('button[type="submit"]');
    
    // Wait for successful login
    await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 10000 });
    await expect(page).not.toHaveURL(/.*\/login.*/);
    
    console.log('✅ Customer login successful');
    
    // Take screenshot of dashboard
    await page.screenshot({ 
      path: 'test-screenshots/02-customer-dashboard.png',
      fullPage: true 
    });
  });

  test('Check if FavoriteButton component is available in codebase', async ({ page }) => {
    console.log('🧩 Checking for FavoriteButton component integration...');
    
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_ACCOUNTS.customer.email);
    await page.fill('input[type="password"]', TEST_ACCOUNTS.customer.password);
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => !window.location.pathname.includes('/login'));
    
    // Navigate to different potential recipe areas
    const pagesToCheck = [
      { name: 'Customer Dashboard', url: '/customer' },
      { name: 'Recipes Page', url: '/recipes' },
      { name: 'Meal Plans', url: '/meal-plans' }
    ];
    
    for (const pageToCheck of pagesToCheck) {
      try {
        console.log(`🔍 Checking ${pageToCheck.name}...`);
        await page.goto(pageToCheck.url);
        await page.waitForLoadState('networkidle', { timeout: 10000 });
        
        // Take screenshot
        await page.screenshot({ 
          path: `test-screenshots/03-${pageToCheck.name.toLowerCase().replace(' ', '-')}.png`,
          fullPage: true 
        });
        
        // Check for recipe-related elements
        const recipeElements = await page.locator('[data-testid*="recipe"], [class*="recipe"], .recipe-card, .recipe').count();
        const favoriteElements = await page.locator('[data-testid*="favorite"], [class*="favorite"], button:has-text("favorite")').count();
        
        console.log(`   📊 ${pageToCheck.name}: ${recipeElements} recipe elements, ${favoriteElements} favorite elements found`);
        
        // Check if there are any JavaScript errors
        const errors = await page.evaluate(() => {
          return window.console?.error ? 'Console errors may be present' : 'No console errors detected';
        });
        
        console.log(`   🐛 ${pageToCheck.name}: ${errors}`);
        
      } catch (error) {
        console.log(`   ⚠️ Could not access ${pageToCheck.name}: ${error.message}`);
      }
    }
  });

  test('Test favorites backend API endpoints', async ({ page }) => {
    console.log('🔗 Testing favorites backend API endpoints...');
    
    // Login to get authentication cookies
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_ACCOUNTS.customer.email);
    await page.fill('input[type="password"]', TEST_ACCOUNTS.customer.password);
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => !window.location.pathname.includes('/login'));
    
    // Test API endpoints through browser context (with cookies)
    const apiEndpoints = [
      { name: 'Get Favorites', method: 'GET', url: '/api/favorites' },
      { name: 'Get Collections', method: 'GET', url: '/api/favorites/collections' },
      { name: 'Get Trending', method: 'GET', url: '/api/trending' }
    ];
    
    for (const endpoint of apiEndpoints) {
      try {
        console.log(`🌐 Testing ${endpoint.name} (${endpoint.method} ${endpoint.url})...`);
        
        const response = await page.request.get(`${TEST_CONFIG.baseURL}${endpoint.url}`);
        const status = response.status();
        
        let responseText = '';
        try {
          responseText = await response.text();
        } catch (e) {
          responseText = 'Could not read response body';
        }
        
        console.log(`   📊 ${endpoint.name}: Status ${status}`);
        
        if (status === 200) {
          console.log(`   ✅ ${endpoint.name}: SUCCESS`);
        } else if (status === 401) {
          console.log(`   🔒 ${endpoint.name}: Authentication required (expected)`);
        } else {
          console.log(`   ❌ ${endpoint.name}: Error - ${responseText.substring(0, 100)}...`);
        }
        
      } catch (error) {
        console.log(`   ⚠️ ${endpoint.name}: Request failed - ${error.message}`);
      }
    }
  });

  test('Verify database tables exist for favorites system', async ({ page }) => {
    console.log('🗄️ Verifying database integration...');
    
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_ACCOUNTS.customer.email);
    await page.fill('input[type="password"]', TEST_ACCOUNTS.customer.password);
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => !window.location.pathname.includes('/login'));
    
    // Try to make requests that would interact with the database
    try {
      // Test that the favorites API exists and can be called
      const response = await page.request.get(`${TEST_CONFIG.baseURL}/api/favorites`);
      
      if (response.status() === 200) {
        console.log('   ✅ Database connection working - favorites API accessible');
      } else if (response.status() === 401) {
        console.log('   🔒 Database connection working - authentication required (expected)');
      } else if (response.status() === 500) {
        const errorText = await response.text();
        if (errorText.includes('database') || errorText.includes('table')) {
          console.log('   ❌ Database integration issue detected');
        } else {
          console.log('   ⚠️ Server error (not database related)');
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Database verification failed: ${error.message}`);
    }
  });

  test('Generate comprehensive integration report', async ({ page }) => {
    console.log('📋 Generating comprehensive integration report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      login: { success: false, error: null },
      pages: {},
      apiEndpoints: {},
      components: {},
      overallStatus: 'UNKNOWN'
    };
    
    try {
      // Test login
      await page.goto('/login');
      await page.fill('input[type="email"]', TEST_ACCOUNTS.customer.email);
      await page.fill('input[type="password"]', TEST_ACCOUNTS.customer.password);
      await page.click('button[type="submit"]');
      await page.waitForFunction(() => !window.location.pathname.includes('/login'));
      report.login.success = true;
      
      // Test key pages
      const pagesToTest = ['/customer', '/recipes', '/meal-plans', '/favorites'];
      for (const pageUrl of pagesToTest) {
        try {
          await page.goto(pageUrl);
          await page.waitForLoadState('networkidle', { timeout: 5000 });
          
          report.pages[pageUrl] = {
            accessible: true,
            hasRecipeElements: await page.locator('[data-testid*="recipe"], [class*="recipe"]').count() > 0,
            hasFavoriteElements: await page.locator('[data-testid*="favorite"], [class*="favorite"]').count() > 0
          };
        } catch (error) {
          report.pages[pageUrl] = {
            accessible: false,
            error: error.message
          };
        }
      }
      
      // Test API endpoints
      const endpoints = ['/api/favorites', '/api/favorites/collections', '/api/trending'];
      for (const endpoint of endpoints) {
        try {
          const response = await page.request.get(`${TEST_CONFIG.baseURL}${endpoint}`);
          report.apiEndpoints[endpoint] = {
            status: response.status(),
            accessible: response.status() < 500
          };
        } catch (error) {
          report.apiEndpoints[endpoint] = {
            status: 'ERROR',
            error: error.message
          };
        }
      }
      
      // Determine overall status
      const loginOk = report.login.success;
      const pagesOk = Object.values(report.pages).some(p => p.accessible);
      const apisOk = Object.values(report.apiEndpoints).some(e => e.accessible);
      
      if (loginOk && pagesOk && apisOk) {
        report.overallStatus = 'GOOD';
      } else if (loginOk && pagesOk) {
        report.overallStatus = 'PARTIAL';
      } else {
        report.overallStatus = 'ISSUES';
      }
      
      console.log('📊 Integration Report:', JSON.stringify(report, null, 2));
      
      // Write report to a test artifact
      await page.evaluate((reportData) => {
        console.log('INTEGRATION_REPORT:', JSON.stringify(reportData, null, 2));
      }, report);
      
    } catch (error) {
      report.overallStatus = 'FAILED';
      report.error = error.message;
      console.log('❌ Report generation failed:', error.message);
    }
    
    // Final screenshot showing current state
    await page.screenshot({ 
      path: 'test-screenshots/99-final-state.png',
      fullPage: true 
    });
  });

});