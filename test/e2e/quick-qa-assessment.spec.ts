import { test, expect, Page } from '@playwright/test';

/**
 * Quick QA Assessment
 * 
 * Rapid testing of critical functionality to identify major issues
 */

const CREDENTIALS = {
  admin: { email: 'admin@fitmeal.pro', password: 'AdminPass123' },
  trainer: { email: 'trainer.test@evofitmeals.com', password: 'TestTrainer123!' },
  customer: { email: 'customer.test@evofitmeals.com', password: 'TestCustomer123!' }
};

async function quickLogin(page: Page, role: keyof typeof CREDENTIALS) {
  try {
    const credentials = CREDENTIALS[role];
    await page.goto('/');
    
    // Check if we need to navigate to login
    if (page.url().includes('login') || await page.locator('#email').isVisible({ timeout: 2000 })) {
      // Already on login page
    } else {
      // Try to find login link
      const loginLinks = ['a:has-text("Login")', 'a:has-text("Sign In")', 'button:has-text("Login")'];
      for (const loginLink of loginLinks) {
        try {
          const link = page.locator(loginLink).first();
          if (await link.isVisible({ timeout: 2000 })) {
            await link.click();
            break;
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    // Wait for login form
    await page.waitForSelector('#email', { timeout: 5000 });
    
    await page.fill('#email', credentials.email);
    await page.fill('#password', credentials.password);
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    
    // Wait for either success or error
    await page.waitForTimeout(3000);
    
    return !page.url().includes('login');
  } catch (error) {
    console.log(`Login failed for ${role}: ${error}`);
    return false;
  }
}

test.describe('Quick QA Assessment', () => {
  
  test('Application loads and basic navigation works', async ({ page }) => {
    console.log('\n🔍 Testing: Application Load and Navigation');
    
    // Test 1: App loads
    await page.goto('/');
    await page.waitForTimeout(3000);
    
    const title = await page.title();
    console.log(`✓ App loads - Title: "${title}"`);
    
    // Test 2: Check for critical elements
    const criticalElements = [
      { selector: 'body', name: 'Body element' },
      { selector: 'main, #root, #app', name: 'Main content area' },
      { selector: 'nav, .navigation, .navbar', name: 'Navigation', optional: true }
    ];
    
    for (const element of criticalElements) {
      try {
        const isVisible = await page.locator(element.selector).first().isVisible({ timeout: 2000 });
        if (isVisible) {
          console.log(`✓ ${element.name} found`);
        } else if (!element.optional) {
          console.log(`❌ ${element.name} missing`);
        }
      } catch (e) {
        if (!element.optional) {
          console.log(`❌ ${element.name} error: ${e}`);
        }
      }
    }
  });
  
  test('Authentication system basic functionality', async ({ page }) => {
    console.log('\n🔐 Testing: Authentication System');
    
    const loginResults = {
      admin: false,
      trainer: false,
      customer: false
    };
    
    // Test each role
    for (const [roleName, credentials] of Object.entries(CREDENTIALS)) {
      try {
        const loginSuccess = await quickLogin(page, roleName as keyof typeof CREDENTIALS);
        loginResults[roleName as keyof typeof loginResults] = loginSuccess;
        
        if (loginSuccess) {
          console.log(`✓ ${roleName} login: SUCCESS`);
          
          // Quick check for role-specific content
          await page.waitForTimeout(2000);
          const bodyText = await page.textContent('body');
          
          if (roleName === 'admin' && (bodyText?.includes('Admin') || bodyText?.includes('Manage') || bodyText?.includes('Users'))) {
            console.log(`  ✓ Admin-specific content detected`);
          } else if (roleName === 'trainer' && (bodyText?.includes('Customer') || bodyText?.includes('Meal Plan') || bodyText?.includes('Recipe'))) {
            console.log(`  ✓ Trainer-specific content detected`);
          } else if (roleName === 'customer' && (bodyText?.includes('My') || bodyText?.includes('Progress') || bodyText?.includes('Plan'))) {
            console.log(`  ✓ Customer-specific content detected`);
          }
        } else {
          console.log(`❌ ${roleName} login: FAILED`);
        }
        
        // Logout for next test
        await page.context().clearCookies();
      } catch (error) {
        console.log(`❌ ${roleName} authentication test error: ${error}`);
      }
    }
    
    // Summary
    const successfulLogins = Object.values(loginResults).filter(Boolean).length;
    console.log(`📊 Authentication Summary: ${successfulLogins}/3 roles can login`);
  });
  
  test('Core pages and functionality check', async ({ page }) => {
    console.log('\n📄 Testing: Core Pages and Functionality');
    
    // Login as trainer for testing
    const trainerLoginSuccess = await quickLogin(page, 'trainer');
    
    if (!trainerLoginSuccess) {
      console.log('❌ Cannot test core functionality - trainer login failed');
      return;
    }
    
    console.log('✓ Logged in as trainer for functionality testing');
    
    // Test key pages
    const pagesToTest = [
      { path: '/dashboard', name: 'Dashboard' },
      { path: '/recipes', name: 'Recipes' },
      { path: '/meal-plans', name: 'Meal Plans' },
      { path: '/customers', name: 'Customers' },
      { path: '/profile', name: 'Profile' }
    ];
    
    let accessiblePages = 0;
    
    for (const pageTest of pagesToTest) {
      try {
        await page.goto(pageTest.path);
        await page.waitForTimeout(2000);
        
        const currentUrl = page.url();
        const bodyText = await page.textContent('body');
        
        if (!currentUrl.includes('login') && !currentUrl.includes('404') && bodyText && bodyText.length > 100) {
          console.log(`✓ ${pageTest.name} accessible and loads content`);
          accessiblePages++;
          
          // Quick functionality checks
          const commonElements = [
            'button',
            'form',
            'a[href]',
            'input',
            'table, .card, .item'
          ];
          
          let functionalElements = 0;
          for (const elementType of commonElements) {
            try {
              const count = await page.locator(elementType).count();
              if (count > 0) {
                functionalElements++;
              }
            } catch (e) {
              // Element type not found
            }
          }
          
          console.log(`  ✓ Interactive elements found: ${functionalElements}/${commonElements.length} types`);
        } else {
          console.log(`❌ ${pageTest.name} not accessible or empty`);
        }
      } catch (error) {
        console.log(`❌ ${pageTest.name} error: ${error}`);
      }
    }
    
    console.log(`📊 Page Accessibility Summary: ${accessiblePages}/${pagesToTest.length} pages accessible`);
  });
  
  test('Forms and user interactions', async ({ page }) => {
    console.log('\n📝 Testing: Forms and User Interactions');
    
    // Login as admin for broader access
    const adminLoginSuccess = await quickLogin(page, 'admin');
    
    if (!adminLoginSuccess) {
      console.log('❌ Cannot test forms - admin login failed');
      return;
    }
    
    // Look for forms across the application
    const formPages = ['/profile', '/recipes/create', '/settings', '/users/create'];
    let formsFound = 0;
    let workingForms = 0;
    
    for (const formPage of formPages) {
      try {
        await page.goto(formPage);
        await page.waitForTimeout(2000);
        
        const forms = page.locator('form');
        const formCount = await forms.count();
        
        if (formCount > 0) {
          formsFound++;
          console.log(`✓ Form found at ${formPage}`);
          
          // Test form elements
          const formElements = ['input', 'textarea', 'select', 'button[type="submit"]'];
          let elementsFound = 0;
          
          for (const elementType of formElements) {
            try {
              const count = await page.locator(elementType).count();
              if (count > 0) {
                elementsFound++;
              }
            } catch (e) {
              // Element not found
            }
          }
          
          if (elementsFound >= 2) { // At least input and submit button
            workingForms++;
            console.log(`  ✓ Form appears functional (${elementsFound} element types)`);
          } else {
            console.log(`  ❌ Form may be incomplete (${elementsFound} element types)`);
          }
        }
      } catch (error) {
        // Page not found or accessible
      }
    }
    
    console.log(`📊 Forms Summary: ${workingForms}/${formsFound} forms appear functional`);
  });
  
  test('Responsive design basic check', async ({ page }) => {
    console.log('\n📱 Testing: Responsive Design Basics');
    
    const viewports = [
      { name: 'Desktop', width: 1280, height: 720 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Mobile', width: 375, height: 667 }
    ];
    
    // Login first
    const loginSuccess = await quickLogin(page, 'trainer');
    
    if (!loginSuccess) {
      console.log('❌ Cannot test responsive design - login failed');
      return;
    }
    
    let responsiveIssues = 0;
    
    for (const viewport of viewports) {
      try {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/dashboard');
        await page.waitForTimeout(2000);
        
        // Check if content is visible and not clipped
        const body = page.locator('body');
        const bodyBox = await body.boundingBox();
        
        if (bodyBox) {
          const hasHorizontalScroll = await page.evaluate(() => {
            return document.body.scrollWidth > window.innerWidth;
          });
          
          if (hasHorizontalScroll) {
            console.log(`⚠️  ${viewport.name}: Horizontal scroll detected (may indicate layout issues)`);
            responsiveIssues++;
          } else {
            console.log(`✓ ${viewport.name}: Layout appears responsive`);
          }
          
          // Check for mobile-specific elements on mobile
          if (viewport.width < 768) {
            const mobileMenu = await page.locator('button[aria-label*="menu" i], .hamburger, .menu-toggle').count();
            if (mobileMenu > 0) {
              console.log(`  ✓ Mobile navigation detected`);
            } else {
              console.log(`  ⚠️  Mobile navigation not clearly identified`);
              responsiveIssues++;
            }
          }
        }
      } catch (error) {
        console.log(`❌ ${viewport.name}: Responsive test error: ${error}`);
        responsiveIssues++;
      }
    }
    
    console.log(`📊 Responsive Design Summary: ${responsiveIssues === 0 ? 'No major issues' : `${responsiveIssues} potential issues`} detected`);
  });
  
  test('Performance and error detection', async ({ page }) => {
    console.log('\n⚡ Testing: Performance and Error Detection');
    
    const jsErrors: string[] = [];
    const consoleMessages: string[] = [];
    
    // Listen for JavaScript errors
    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });
    
    // Listen for console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleMessages.push(msg.text());
      }
    });
    
    const pagesToTest = ['/', '/dashboard', '/recipes'];
    const performanceResults: Array<{ page: string; loadTime: number }> = [];
    
    // Login first
    await quickLogin(page, 'trainer');
    
    for (const pagePath of pagesToTest) {
      try {
        const startTime = Date.now();
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;
        
        performanceResults.push({ page: pagePath, loadTime });
        
        if (loadTime < 3000) {
          console.log(`✓ ${pagePath}: Fast load (${loadTime}ms)`);
        } else if (loadTime < 5000) {
          console.log(`⚠️  ${pagePath}: Slow load (${loadTime}ms)`);
        } else {
          console.log(`❌ ${pagePath}: Very slow load (${loadTime}ms)`);
        }
        
        await page.waitForTimeout(2000); // Allow time for errors to surface
      } catch (error) {
        console.log(`❌ ${pagePath}: Load error: ${error}`);
      }
    }
    
    // Report errors
    if (jsErrors.length > 0) {
      console.log(`❌ JavaScript Errors (${jsErrors.length}):`);
      jsErrors.slice(0, 5).forEach(error => console.log(`  - ${error}`));
    } else {
      console.log(`✓ No JavaScript errors detected`);
    }
    
    if (consoleMessages.length > 0) {
      console.log(`⚠️  Console Errors (${consoleMessages.length}):`);
      consoleMessages.slice(0, 3).forEach(msg => console.log(`  - ${msg.substring(0, 100)}`));
    } else {
      console.log(`✓ No console errors detected`);
    }
    
    const avgLoadTime = performanceResults.reduce((sum, result) => sum + result.loadTime, 0) / performanceResults.length;
    console.log(`📊 Average Load Time: ${Math.round(avgLoadTime)}ms`);
  });
  
  test.afterAll(async () => {
    console.log('\n' + '='.repeat(80));
    console.log('🏆 QUICK QA ASSESSMENT COMPLETE');
    console.log('='.repeat(80));
    
    console.log('\n📋 SUMMARY RECOMMENDATIONS:');
    console.log('1. ✅ Review authentication system test results above');
    console.log('2. 📄 Ensure all core pages are accessible and functional'); 
    console.log('3. 📝 Verify forms have proper validation and error handling');
    console.log('4. 📱 Test responsive design across different devices');
    console.log('5. ⚡ Monitor performance and fix any JavaScript errors');
    console.log('6. 🔒 Implement comprehensive security testing');
    console.log('7. 📊 Add automated testing to CI/CD pipeline');
    
    console.log('\n💡 NEXT STEPS:');
    console.log('• Run full test suite: npm run test:playwright');
    console.log('• Check individual test files for detailed scenarios');
    console.log('• Review any failed login attempts with correct credentials');
    console.log('• Test cross-role interactions and permissions');
    console.log('• Validate PDF export and AI features functionality');
    
    console.log('\n' + '='.repeat(80));
  });
});