import { test, expect, Page } from '@playwright/test';

/**
 * Robust Visual Business Logic Validation Tests
 * 
 * This test suite validates core business logic with more robust error handling
 * and better visual feedback for watching tests run in real-time.
 */

// Test account credentials
const TEST_ACCOUNTS = {
  admin: {
    email: 'admin@fitmeal.pro',
    password: 'Admin123!@#',
    role: 'admin'
  },
  trainer: {
    email: 'testtrainer@example.com',
    password: 'TrainerPassword123!',
    role: 'trainer'
  },
  customer: {
    email: 'testcustomer@example.com',
    password: 'TestPassword123!',
    role: 'customer'
  }
};

// Helper function to add visual feedback
async function addTestStep(page: Page, stepName: string, color: string = '#4CAF50') {
  console.log(`🧪 ${stepName}`);
  
  await page.evaluate(({ step, bgColor }) => {
    const indicator = document.createElement('div');
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${bgColor};
      color: white;
      padding: 15px 25px;
      border-radius: 8px;
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 16px;
      font-weight: bold;
      z-index: 10000;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      border-left: 5px solid rgba(255,255,255,0.3);
      max-width: 300px;
    `;
    indicator.textContent = step;
    indicator.id = 'test-indicator';
    
    const existing = document.getElementById('test-indicator');
    if (existing) existing.remove();
    
    document.body.appendChild(indicator);
    
    setTimeout(() => {
      const elem = document.getElementById('test-indicator');
      if (elem) elem.remove();
    }, 4000);
  }, { step: stepName, bgColor: color });
  
  await page.waitForTimeout(2000);
}

// Robust login function
async function attemptLogin(page: Page, accountType: keyof typeof TEST_ACCOUNTS) {
  const account = TEST_ACCOUNTS[accountType];
  
  await addTestStep(page, `🔐 Logging in as ${accountType.toUpperCase()}`);
  console.log(`Attempting login for: ${account.email}`);
  
  try {
    // Navigate to login page
    await page.goto('/login', { waitUntil: 'networkidle' });
    
    // Wait for login form to be visible
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.waitForSelector('input[type="password"]', { timeout: 5000 });
    await page.waitForSelector('button[type="submit"]', { timeout: 5000 });
    
    // Clear and fill login form
    await page.fill('input[type="email"]', '');
    await page.fill('input[type="email"]', account.email);
    await page.fill('input[type="password"]', '');
    await page.fill('input[type="password"]', account.password);
    
    // Submit and handle potential redirects
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    // Wait for navigation (but don't fail if it doesn't happen)
    try {
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
    } catch (e) {
      console.log('Login redirect timeout - checking current state...');
    }
    
    // Wait a bit more for any async redirects
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log(`Final URL after login attempt: ${currentUrl}`);
    
    // Check if login was successful (not on login page)
    const isLoggedIn = !currentUrl.includes('/login');
    
    if (isLoggedIn) {
      await addTestStep(page, `✅ Successfully logged in as ${accountType.toUpperCase()}`, '#2E7D32');
      return { success: true, url: currentUrl, account };
    } else {
      await addTestStep(page, `❌ Login failed for ${accountType.toUpperCase()}`, '#C62828');
      return { success: false, url: currentUrl, account };
    }
    
  } catch (error) {
    console.error(`Login error for ${accountType}:`, error);
    await addTestStep(page, `💥 Login error: ${accountType.toUpperCase()}`, '#FF5722');
    return { success: false, error: error.message, account };
  }
}

test.describe('🔍 Robust Business Logic Validation - Visual Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Add some custom styles to make testing more visible
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        const style = document.createElement('style');
        style.textContent = `
          * { 
            transition: all 0.3s ease !important; 
          }
          input:focus { 
            box-shadow: 0 0 10px #4CAF50 !important; 
            border-color: #4CAF50 !important; 
          }
          button:hover { 
            transform: scale(1.05) !important; 
          }
        `;
        document.head.appendChild(style);
      });
    });
  });

  test.describe('🔐 Authentication Tests', () => {
    
    test('Admin Authentication & Dashboard Access', async ({ page }) => {
      await addTestStep(page, '🚀 Starting Admin Authentication Test', '#1976D2');
      
      const result = await attemptLogin(page, 'admin');
      
      expect(result.success).toBe(true);
      
      if (result.success) {
        await addTestStep(page, '🔍 Checking Admin Dashboard Features');
        
        // Look for admin-specific elements (more flexible approach)
        const adminIndicators = [
          'admin',
          'recipe management', 
          'user management',
          'statistics',
          'approve',
          'system'
        ];
        
        let foundIndicators = 0;
        for (const indicator of adminIndicators) {
          const elements = await page.locator(`text=${indicator} i`).count();
          if (elements > 0) {
            foundIndicators++;
            console.log(`✅ Found admin indicator: "${indicator}"`);
          }
        }
        
        await addTestStep(page, `📊 Found ${foundIndicators} admin features`, '#4CAF50');
        console.log(`Admin dashboard validation: ${foundIndicators}/${adminIndicators.length} indicators found`);
      }
    });

    test('Trainer Authentication & Dashboard Access', async ({ page }) => {
      await addTestStep(page, '🚀 Starting Trainer Authentication Test', '#1976D2');
      
      const result = await attemptLogin(page, 'trainer');
      
      expect(result.success).toBe(true);
      
      if (result.success) {
        await addTestStep(page, '🔍 Checking Trainer Dashboard Features');
        
        const trainerIndicators = [
          'trainer',
          'invite',
          'customer',
          'meal plan',
          'assign'
        ];
        
        let foundIndicators = 0;
        for (const indicator of trainerIndicators) {
          const elements = await page.locator(`text=${indicator} i`).count();
          if (elements > 0) {
            foundIndicators++;
            console.log(`✅ Found trainer indicator: "${indicator}"`);
          }
        }
        
        await addTestStep(page, `📊 Found ${foundIndicators} trainer features`, '#4CAF50');
        console.log(`Trainer dashboard validation: ${foundIndicators}/${trainerIndicators.length} indicators found`);
      }
    });

    test('Customer Authentication & Dashboard Access', async ({ page }) => {
      await addTestStep(page, '🚀 Starting Customer Authentication Test', '#1976D2');
      
      const result = await attemptLogin(page, 'customer');
      
      expect(result.success).toBe(true);
      
      if (result.success) {
        await addTestStep(page, '🔍 Checking Customer Dashboard Features');
        
        const customerIndicators = [
          'meal plan',
          'my meal',
          'progress',
          'recipe'
        ];
        
        let foundIndicators = 0;
        for (const indicator of customerIndicators) {
          const elements = await page.locator(`text=${indicator} i`).count();
          if (elements > 0) {
            foundIndicators++;
            console.log(`✅ Found customer indicator: "${indicator}"`);
          }
        }
        
        await addTestStep(page, `📊 Found ${foundIndicators} customer features`, '#4CAF50');
        console.log(`Customer dashboard validation: ${foundIndicators}/${customerIndicators.length} indicators found`);
      }
    });
  });

  test.describe('🔒 Security & Access Control', () => {
    
    test('Unauthenticated Access Protection', async ({ page }) => {
      await addTestStep(page, '🚀 Testing Unauthenticated Access Protection', '#FF9800');
      
      // Try to access protected pages without authentication
      const protectedPages = ['/admin', '/trainer', '/my-meal-plans'];
      
      for (const protectedPage of protectedPages) {
        await addTestStep(page, `🔒 Testing access to ${protectedPage}`);
        
        await page.goto(protectedPage);
        await page.waitForLoadState('networkidle');
        
        const currentUrl = page.url();
        console.log(`Accessing ${protectedPage}, redirected to: ${currentUrl}`);
        
        // Should be redirected away from protected page (likely to login)
        const isBlocked = !currentUrl.includes(protectedPage) || currentUrl.includes('/login');
        
        if (isBlocked) {
          await addTestStep(page, `✅ ${protectedPage} properly protected`, '#4CAF50');
        } else {
          await addTestStep(page, `❌ ${protectedPage} not protected!`, '#F44336');
        }
        
        expect(isBlocked).toBe(true);
      }
    });

    test('Role-Based Access Control', async ({ page }) => {
      await addTestStep(page, '🚀 Testing Role-Based Access Control', '#9C27B0');
      
      // Login as customer first
      const customerLogin = await attemptLogin(page, 'customer');
      expect(customerLogin.success).toBe(true);
      
      if (customerLogin.success) {
        // Try to access admin page as customer
        await addTestStep(page, '🔒 Customer trying to access Admin area');
        await page.goto('/admin');
        await page.waitForLoadState('networkidle');
        
        const adminUrl = page.url();
        const adminBlocked = !adminUrl.includes('/admin');
        
        if (adminBlocked) {
          await addTestStep(page, '✅ Customer blocked from Admin area', '#4CAF50');
        } else {
          await addTestStep(page, '❌ Customer accessed Admin area!', '#F44336');
        }
        
        expect(adminBlocked).toBe(true);
        
        // Try to access trainer page as customer
        await addTestStep(page, '🔒 Customer trying to access Trainer area');
        await page.goto('/trainer');
        await page.waitForLoadState('networkidle');
        
        const trainerUrl = page.url();
        const trainerBlocked = !trainerUrl.includes('/trainer');
        
        if (trainerBlocked) {
          await addTestStep(page, '✅ Customer blocked from Trainer area', '#4CAF50');
        } else {
          await addTestStep(page, '❌ Customer accessed Trainer area!', '#F44336');
        }
      }
    });
  });

  test.describe('🔄 Business Logic Workflows', () => {
    
    test('JWT Token Persistence', async ({ page }) => {
      await addTestStep(page, '🚀 Testing JWT Token Persistence', '#00BCD4');
      
      // Login as customer
      const result = await attemptLogin(page, 'customer');
      expect(result.success).toBe(true);
      
      if (result.success) {
        const initialUrl = page.url();
        
        // Navigate to different pages to test token persistence
        const testPages = ['/recipes', '/progress', '/my-meal-plans'];
        
        for (const testPage of testPages) {
          await addTestStep(page, `🔄 Navigating to ${testPage}`);
          
          await page.goto(testPage);
          await page.waitForLoadState('networkidle');
          
          const currentUrl = page.url();
          const stillAuthenticated = !currentUrl.includes('/login');
          
          console.log(`Navigation to ${testPage}: ${currentUrl}, authenticated: ${stillAuthenticated}`);
          
          if (stillAuthenticated) {
            await addTestStep(page, `✅ Token persisted for ${testPage}`, '#4CAF50');
            // Test that we can make authenticated requests
            const apiResponse = await page.evaluate(async () => {
              try {
                const response = await fetch('/api/auth/me', { credentials: 'include' });
                return { status: response.status, ok: response.ok };
              } catch (e) {
                return { error: e.message };
              }
            });
            
            console.log(`API test result:`, apiResponse);
            expect(apiResponse.ok).toBe(true);
          } else {
            await addTestStep(page, `❌ Token lost for ${testPage}`, '#F44336');
          }
        }
      }
    });
  });

  test.describe('🎯 End-to-End Business Logic', () => {
    
    test('Complete Multi-Role System Test', async ({ page }) => {
      await addTestStep(page, '🚀 Starting Complete System Test', '#673AB7');
      
      // Test 1: Admin login and functionality
      await addTestStep(page, '👨‍💼 Testing Admin Role');
      const adminResult = await attemptLogin(page, 'admin');
      expect(adminResult.success).toBe(true);
      
      if (adminResult.success) {
        await addTestStep(page, '✅ Admin login successful', '#4CAF50');
        
        // Clear session for next test
        await page.context().clearCookies();
      }
      
      // Test 2: Trainer login and functionality
      await addTestStep(page, '🏋️‍♂️ Testing Trainer Role');
      const trainerResult = await attemptLogin(page, 'trainer');
      expect(trainerResult.success).toBe(true);
      
      if (trainerResult.success) {
        await addTestStep(page, '✅ Trainer login successful', '#4CAF50');
        
        // Clear session for next test
        await page.context().clearCookies();
      }
      
      // Test 3: Customer login and functionality  
      await addTestStep(page, '🧑‍🤝‍🧑 Testing Customer Role');
      const customerResult = await attemptLogin(page, 'customer');
      expect(customerResult.success).toBe(true);
      
      if (customerResult.success) {
        await addTestStep(page, '✅ Customer login successful', '#4CAF50');
      }
      
      await addTestStep(page, '🎉 Complete System Test Finished!', '#4CAF50');
    });
  });
});