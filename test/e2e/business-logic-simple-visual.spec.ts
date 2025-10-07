import { test, expect, Page } from '@playwright/test';

/**
 * Simple Visual Business Logic Tests
 * 
 * Streamlined tests that focus on core functionality with visual feedback
 */

const TEST_ACCOUNTS = {
  admin: { email: 'admin@fitmeal.pro', password: 'Admin123!@#' },
  trainer: { email: 'testtrainer@example.com', password: 'TrainerPassword123!' },
  customer: { email: 'testcustomer@example.com', password: 'TestPassword123!' }
};

// Simple visual indicator
async function showStep(page: Page, message: string, color = '#4CAF50') {
  console.log(`🧪 ${message}`);
  
  await page.evaluate(({ msg, col }) => {
    const div = document.createElement('div');
    div.id = 'test-step';
    div.textContent = msg;
    div.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 9999;
      background: ${col}; color: white; padding: 15px 25px;
      border-radius: 8px; font-family: Arial, sans-serif;
      font-size: 16px; font-weight: bold; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    
    const existing = document.getElementById('test-step');
    if (existing) existing.remove();
    document.body.appendChild(div);
    
    setTimeout(() => {
      const elem = document.getElementById('test-step');
      if (elem) elem.remove();
    }, 3000);
  }, { msg: message, col: color });
  
  await page.waitForTimeout(1500);
}

// Simple login function
async function login(page: Page, role: keyof typeof TEST_ACCOUNTS) {
  const account = TEST_ACCOUNTS[role];
  
  await showStep(page, `🔐 Logging in as ${role.toUpperCase()}`);
  
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  
  // Fill login form
  await page.fill('input[type="email"]', account.email);
  await page.fill('input[type="password"]', account.password);
  
  // Submit and wait
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000); // Wait for redirect
  
  const url = page.url();
  const success = !url.includes('/login');
  
  if (success) {
    await showStep(page, `✅ ${role.toUpperCase()} login successful!`, '#4CAF50');
  } else {
    await showStep(page, `❌ ${role.toUpperCase()} login failed!`, '#F44336');
  }
  
  return { success, url };
}

test.describe('🎯 Visual Business Logic Tests', () => {
  
  test('Admin Login Test', async ({ page }) => {
    await showStep(page, '🚀 Starting Admin Test', '#2196F3');
    
    const result = await login(page, 'admin');
    expect(result.success).toBe(true);
    
    if (result.success) {
      await showStep(page, '🔍 Checking admin features');
      
      // Look for admin-specific text on the page
      const pageContent = await page.content();
      const hasAdminFeatures = pageContent.toLowerCase().includes('admin') || 
                               pageContent.toLowerCase().includes('manage') ||
                               pageContent.toLowerCase().includes('dashboard');
      
      if (hasAdminFeatures) {
        await showStep(page, '✅ Admin features detected!', '#4CAF50');
      } else {
        await showStep(page, '⚠️ Admin features not clearly visible', '#FF9800');
      }
      
      console.log(`Admin test: URL = ${result.url}, Features = ${hasAdminFeatures}`);
    }
  });

  test('Trainer Login Test', async ({ page }) => {
    await showStep(page, '🚀 Starting Trainer Test', '#2196F3');
    
    const result = await login(page, 'trainer');
    expect(result.success).toBe(true);
    
    if (result.success) {
      await showStep(page, '🔍 Checking trainer features');
      
      const pageContent = await page.content();
      const hasTrainerFeatures = pageContent.toLowerCase().includes('trainer') || 
                                  pageContent.toLowerCase().includes('customer') ||
                                  pageContent.toLowerCase().includes('invite');
      
      if (hasTrainerFeatures) {
        await showStep(page, '✅ Trainer features detected!', '#4CAF50');
      } else {
        await showStep(page, '⚠️ Trainer features not clearly visible', '#FF9800');
      }
      
      console.log(`Trainer test: URL = ${result.url}, Features = ${hasTrainerFeatures}`);
    }
  });

  test('Customer Login Test', async ({ page }) => {
    await showStep(page, '🚀 Starting Customer Test', '#2196F3');
    
    const result = await login(page, 'customer');
    expect(result.success).toBe(true);
    
    if (result.success) {
      await showStep(page, '🔍 Checking customer features'); 
      
      const pageContent = await page.content();
      const hasCustomerFeatures = pageContent.toLowerCase().includes('meal') || 
                                   pageContent.toLowerCase().includes('progress') ||
                                   pageContent.toLowerCase().includes('my');
      
      if (hasCustomerFeatures) {
        await showStep(page, '✅ Customer features detected!', '#4CAF50');
      } else {
        await showStep(page, '⚠️ Customer features not clearly visible', '#FF9800');
      }
      
      console.log(`Customer test: URL = ${result.url}, Features = ${hasCustomerFeatures}`);
    }
  });

  test('Unauthenticated Access Test', async ({ page }) => {
    await showStep(page, '🚀 Testing Unauthenticated Access', '#FF9800');
    
    // Try to access admin page without login
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    const url = page.url();
    const isBlocked = url.includes('/login') || !url.includes('/admin');
    
    if (isBlocked) {
      await showStep(page, '✅ Unauthenticated access blocked!', '#4CAF50');
    } else {
      await showStep(page, '❌ Security issue: Access allowed!', '#F44336');
    }
    
    expect(isBlocked).toBe(true);
    console.log(`Unauthenticated test: URL = ${url}, Blocked = ${isBlocked}`);
  });

  test('Role Access Control Test', async ({ page }) => {
    await showStep(page, '🚀 Testing Role-Based Access Control', '#9C27B0');
    
    // Login as customer
    const customerLogin = await login(page, 'customer');
    expect(customerLogin.success).toBe(true);
    
    if (customerLogin.success) {
      // Try to access admin page as customer
      await showStep(page, '🔒 Customer trying admin access');
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');
      
      const adminUrl = page.url();
      const adminBlocked = !adminUrl.includes('/admin');
      
      if (adminBlocked) {
        await showStep(page, '✅ Customer blocked from admin!', '#4CAF50');
      } else {
        await showStep(page, '❌ Customer accessed admin!', '#F44336');
      }
      
      expect(adminBlocked).toBe(true);
      
      // Try trainer page
      await showStep(page, '🔒 Customer trying trainer access');
      await page.goto('/trainer');
      await page.waitForLoadState('networkidle');
      
      const trainerUrl = page.url();
      const trainerBlocked = !trainerUrl.includes('/trainer');
      
      if (trainerBlocked) {
        await showStep(page, '✅ Customer blocked from trainer!', '#4CAF50');
      } else {
        await showStep(page, '❌ Customer accessed trainer!', '#F44336');
      }
      
      console.log(`Role test: Admin blocked = ${adminBlocked}, Trainer blocked = ${trainerBlocked}`);
    }
  });

  test('JWT Token Persistence Test', async ({ page }) => {
    await showStep(page, '🚀 Testing JWT Token Persistence', '#00BCD4');
    
    // Login as customer
    const result = await login(page, 'customer');
    expect(result.success).toBe(true);
    
    if (result.success) {
      // Navigate to different pages
      const testPages = ['/recipes', '/progress'];
      
      for (const testPage of testPages) {
        await showStep(page, `🔄 Testing ${testPage}`);
        
        await page.goto(testPage);
        await page.waitForLoadState('networkidle');
        
        const url = page.url();
        const stillAuthenticated = !url.includes('/login');
        
        if (stillAuthenticated) {
          await showStep(page, `✅ Token valid for ${testPage}`, '#4CAF50');
          
          // Test API call
          const apiTest = await page.evaluate(async () => {
            try {
              const response = await fetch('/api/auth/me', { credentials: 'include' });
              return response.ok;
            } catch (e) {
              return false;
            }
          });
          
          if (apiTest) {
            await showStep(page, `✅ API call successful`, '#4CAF50');
          } else {
            await showStep(page, `⚠️ API call failed`, '#FF9800');  
          }
          
          expect(apiTest).toBe(true);
        } else {
          await showStep(page, `❌ Token lost for ${testPage}`, '#F44336');
        }
        
        console.log(`Token test ${testPage}: URL = ${url}, Auth = ${stillAuthenticated}`);
      }
    }
  });

  test('System Integration - Core Functionality Test', async ({ page }) => {
    await showStep(page, '🚀 Core System Integration Test', '#673AB7');
    
    // Test 1: Login as customer and verify full workflow
    await showStep(page, '🧪 Testing Customer Complete Workflow');
    
    const customerLogin = await login(page, 'customer');
    expect(customerLogin.success).toBe(true);
    
    if (customerLogin.success) {
      await showStep(page, '✅ Customer authentication successful', '#4CAF50');
      
      // Test navigation to different customer pages
      const customerPages = ['/my-meal-plans', '/recipes', '/progress'];
      let navSuccessCount = 0;
      
      for (const pagePath of customerPages) {
        await showStep(page, `🔄 Testing navigation to ${pagePath}`);
        
        try {
          await page.goto(pagePath);
          await page.waitForLoadState('networkidle');
          
          const currentUrl = page.url();
          const navSuccess = currentUrl.includes(pagePath) && !currentUrl.includes('/login');
          
          if (navSuccess) {
            navSuccessCount++;
            await showStep(page, `✅ ${pagePath} accessible`, '#4CAF50');
            
            // Test API call from this page
            const apiTest = await page.evaluate(async () => {
              try {
                const response = await fetch('/api/auth/me', { credentials: 'include' });
                return response.ok;
              } catch (e) {
                return false;
              }
            });
            
            if (apiTest) {
              console.log(`✅ API auth working on ${pagePath}`);
            }
          } else {
            await showStep(page, `❌ ${pagePath} not accessible`, '#F44336');
          }
        } catch (error) {
          console.log(`Navigation error for ${pagePath}:`, error.message);
        }
      }
      
      await showStep(page, `📊 Navigation: ${navSuccessCount}/${customerPages.length} pages accessible`, '#2196F3');
      
      // Test 2: Verify security boundaries (customer cannot access admin/trainer)
      await showStep(page, '🔒 Testing security boundaries');
      
      const restrictedPages = ['/admin', '/trainer'];
      let securityPassCount = 0;
      
      for (const restrictedPage of restrictedPages) {
        await page.goto(restrictedPage);
        await page.waitForLoadState('networkidle');
        
        const blocked = !page.url().includes(restrictedPage);
        if (blocked) {
          securityPassCount++;
          console.log(`✅ Customer blocked from ${restrictedPage}`);
        }
      }
      
      await showStep(page, `🛡️ Security: ${securityPassCount}/${restrictedPages.length} boundaries enforced`, '#4CAF50');
      
      // Summary
      const totalTests = customerPages.length + restrictedPages.length;
      const totalPassed = navSuccessCount + securityPassCount;
      
      await showStep(page, `🎉 Integration Test Complete! ${totalPassed}/${totalTests} checks passed`, '#4CAF50');
      
      // Expect most functionality to work
      expect(totalPassed).toBeGreaterThanOrEqual(Math.floor(totalTests * 0.8)); // 80% success rate
      
      console.log(`\n🎯 Integration Test Summary:`);
      console.log(`   • Customer Authentication: ✅`);
      console.log(`   • Page Navigation: ${navSuccessCount}/${customerPages.length}`);
      console.log(`   • Security Boundaries: ${securityPassCount}/${restrictedPages.length}`);
      console.log(`   • Overall Success: ${totalPassed}/${totalTests} (${Math.round(totalPassed/totalTests*100)}%)`);
    }
  });
});