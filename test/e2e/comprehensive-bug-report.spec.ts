import { test, expect, Page } from '@playwright/test';

/**
 * Comprehensive Bug Detection and QA Report
 * 
 * Final comprehensive test suite that generates a detailed bug report
 * with all findings, issues, and recommendations
 */

const CREDENTIALS = {
  admin: { email: 'admin@fitmeal.pro', password: 'AdminPass123' },
  trainer: { email: 'trainer.test@evofitmeals.com', password: 'TestTrainer123!' },
  customer: { email: 'customer.test@evofitmeals.com', password: 'TestCustomer123!' }
};

interface BugReport {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  reproduction: string[];
  expectedBehavior: string;
  actualBehavior: string;
  recommendation: string;
  category: 'Authentication' | 'UI/UX' | 'Performance' | 'Security' | 'Functionality' | 'Responsive' | 'Data';
}

interface TestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'WARNING' | 'NEEDS_REVIEW';
  details: string;
  executionTime: number;
}

let bugReports: BugReport[] = [];
let testResults: TestResult[] = [];

function addBugReport(bug: BugReport) {
  bugReports.push(bug);
}

function addTestResult(result: TestResult) {
  testResults.push(result);
}

async function loginAs(page: Page, role: keyof typeof CREDENTIALS): Promise<boolean> {
  try {
    const startTime = Date.now();
    const credentials = CREDENTIALS[role];
    
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Use correct selectors based on our investigation
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign In")').first();
    
    // Verify elements are visible
    if (!await emailInput.isVisible({ timeout: 3000 })) {
      throw new Error('Email input not visible');
    }
    
    await emailInput.fill(credentials.email);
    await passwordInput.fill(credentials.password);
    await submitButton.click();
    
    // Wait for navigation or error
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    const loginTime = Date.now() - startTime;
    
    console.log(`${role} login attempt took ${loginTime}ms, URL: ${currentUrl}`);
    
    // Success if not on login page
    const success = !currentUrl.includes('login');
    
    if (!success) {
      // Check for error messages
      const errorElements = await page.locator('.error, .alert-error, [role="alert"]').count();
      if (errorElements > 0) {
        const errorText = await page.locator('.error, .alert-error, [role="alert"]').first().textContent();
        console.log(`Login error for ${role}: ${errorText}`);
      }
    }
    
    return success;
  } catch (error) {
    console.log(`Login failed for ${role}: ${error}`);
    return false;
  }
}

test.describe('Comprehensive Bug Detection and QA Report', () => {
  
  test('1. Authentication System Analysis', async ({ page }) => {
    const startTime = Date.now();
    
    console.log('\n🔐 Testing Authentication System...');
    
    let authenticationIssues = 0;
    let successfulLogins = 0;
    
    // Test each role
    for (const [roleName, credentials] of Object.entries(CREDENTIALS)) {
      try {
        const loginSuccess = await loginAs(page, roleName as keyof typeof CREDENTIALS);
        
        if (loginSuccess) {
          successfulLogins++;
          console.log(`✅ ${roleName} login: SUCCESS`);
          
          // Verify role-specific content after login
          await page.waitForTimeout(2000);
          const bodyContent = await page.textContent('body');
          
          const roleKeywords = {
            admin: ['Admin', 'Manage', 'Users', 'System'],
            trainer: ['Customer', 'Meal Plan', 'Recipe', 'Client'],
            customer: ['My Meal', 'Progress', 'Profile']
          };
          
          const keywords = roleKeywords[roleName as keyof typeof roleKeywords] || [];
          const hasRoleContent = keywords.some(keyword => 
            bodyContent?.toLowerCase().includes(keyword.toLowerCase())
          );
          
          if (!hasRoleContent) {
            addBugReport({
              severity: 'MEDIUM',
              title: `${roleName} role-specific content not displayed`,
              description: `After successful ${roleName} login, expected role-specific content is not visible`,
              reproduction: [`1. Login as ${roleName}`, '2. Observe dashboard content', '3. Look for role-specific elements'],
              expectedBehavior: `Should display ${keywords.join(', ')} or similar ${roleName}-specific content`,
              actualBehavior: 'Generic or incorrect content displayed',
              recommendation: 'Review role-based UI rendering and ensure proper role detection',
              category: 'Authentication'
            });
          }
          
          // Test logout if possible
          const logoutElements = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout")');
          const logoutCount = await logoutElements.count();
          
          if (logoutCount === 0) {
            addBugReport({
              severity: 'HIGH',
              title: 'No logout functionality visible',
              description: `After login as ${roleName}, no clear logout option is available`,
              reproduction: [`1. Login as ${roleName}`, '2. Look for logout button or menu'],
              expectedBehavior: 'Clear logout option should be visible',
              actualBehavior: 'No logout functionality found',
              recommendation: 'Add prominent logout button or menu item',
              category: 'Authentication'
            });
          }
        } else {
          authenticationIssues++;
          console.log(`❌ ${roleName} login: FAILED`);
          
          addBugReport({
            severity: 'CRITICAL',
            title: `${roleName} authentication failure`,
            description: `Cannot login with provided ${roleName} credentials: ${credentials.email}`,
            reproduction: [`1. Go to login page`, `2. Enter ${credentials.email}`, `3. Enter provided password`, '4. Click Sign In'],
            expectedBehavior: 'Should successfully authenticate and redirect to dashboard',
            actualBehavior: 'Login fails or stays on login page',
            recommendation: 'Verify test credentials and authentication system',
            category: 'Authentication'
          });
        }
        
        // Clear session for next test
        await page.context().clearCookies();
        
      } catch (error) {
        authenticationIssues++;
        console.log(`❌ ${roleName} authentication error: ${error}`);
      }
    }
    
    addTestResult({
      testName: 'Authentication System Analysis',
      status: authenticationIssues === 0 ? 'PASS' : successfulLogins > 0 ? 'WARNING' : 'FAIL',
      details: `${successfulLogins}/3 roles can authenticate successfully`,
      executionTime: Date.now() - startTime
    });
  });
  
  test('2. Core Functionality Assessment', async ({ page }) => {
    const startTime = Date.now();
    
    console.log('\n⚙️ Testing Core Functionality...');
    
    // Login as trainer for functionality testing
    const loginSuccess = await loginAs(page, 'trainer');
    
    if (!loginSuccess) {
      addTestResult({
        testName: 'Core Functionality Assessment',
        status: 'FAIL',
        details: 'Cannot test functionality - authentication failed',
        executionTime: Date.now() - startTime
      });
      return;
    }
    
    // Test key pages
    const corePagesToTest = [
      { path: '/dashboard', name: 'Dashboard', critical: true },
      { path: '/recipes', name: 'Recipes', critical: true },
      { path: '/meal-plans', name: 'Meal Plans', critical: true },
      { path: '/customers', name: 'Customers', critical: false },
      { path: '/profile', name: 'Profile', critical: false }
    ];
    
    let accessiblePages = 0;
    let criticalPageIssues = 0;
    
    for (const pageTest of corePagesToTest) {
      try {
        console.log(`Testing ${pageTest.name}...`);
        
        const pageStartTime = Date.now();
        await page.goto(pageTest.path);
        await page.waitForTimeout(2000);
        
        const loadTime = Date.now() - pageStartTime;
        const currentUrl = page.url();
        
        // Check if page loaded successfully
        const pageLoaded = !currentUrl.includes('login') && 
                          !currentUrl.includes('404') && 
                          !currentUrl.includes('error');
        
        if (pageLoaded) {
          accessiblePages++;
          console.log(`✅ ${pageTest.name} accessible (${loadTime}ms)`);
          
          // Check for page content
          const bodyText = await page.textContent('body');
          
          if (!bodyText || bodyText.length < 100) {
            addBugReport({
              severity: pageTest.critical ? 'HIGH' : 'MEDIUM',
              title: `${pageTest.name} page appears empty`,
              description: `${pageTest.name} page loads but contains minimal content`,
              reproduction: [`1. Login as trainer`, `2. Navigate to ${pageTest.path}`, '3. Observe page content'],
              expectedBehavior: `Should display ${pageTest.name.toLowerCase()} content and functionality`,
              actualBehavior: 'Page loads but appears empty or with minimal content',
              recommendation: 'Check data loading and content rendering',
              category: 'Functionality'
            });
          }
          
          // Check for interactive elements
          const buttons = await page.locator('button').count();
          const links = await page.locator('a[href]').count();
          const forms = await page.locator('form').count();
          
          console.log(`  - Interactive elements: ${buttons} buttons, ${links} links, ${forms} forms`);
          
          if (buttons + links + forms === 0 && pageTest.critical) {
            addBugReport({
              severity: 'HIGH',
              title: `${pageTest.name} page lacks interactive elements`,
              description: `Critical page has no buttons, links, or forms`,
              reproduction: [`1. Navigate to ${pageTest.path}`, '2. Look for interactive elements'],
              expectedBehavior: 'Should have interactive elements for user actions',
              actualBehavior: 'No interactive elements found',
              recommendation: 'Add appropriate interactive elements for page functionality',
              category: 'UI/UX'
            });
          }
          
          // Check page performance
          if (loadTime > 3000) {
            addBugReport({
              severity: 'MEDIUM',
              title: `${pageTest.name} slow loading`,
              description: `Page takes ${loadTime}ms to load, which may impact user experience`,
              reproduction: [`1. Navigate to ${pageTest.path}`, '2. Measure load time'],
              expectedBehavior: 'Pages should load within 2-3 seconds',
              actualBehavior: `Page loads in ${loadTime}ms`,
              recommendation: 'Optimize page loading performance',
              category: 'Performance'
            });
          }
          
        } else {
          if (pageTest.critical) {
            criticalPageIssues++;
          }
          
          console.log(`❌ ${pageTest.name} not accessible`);
          
          addBugReport({
            severity: pageTest.critical ? 'CRITICAL' : 'HIGH',
            title: `${pageTest.name} page not accessible`,
            description: `Cannot access ${pageTest.name} page at ${pageTest.path}`,
            reproduction: [`1. Login as trainer`, `2. Navigate to ${pageTest.path}`],
            expectedBehavior: `Should access ${pageTest.name} page successfully`,
            actualBehavior: `Redirected to ${currentUrl} or error page`,
            recommendation: 'Fix routing and ensure page exists',
            category: 'Functionality'
          });
        }
      } catch (error) {
        console.log(`❌ ${pageTest.name} error: ${error}`);
        if (pageTest.critical) {
          criticalPageIssues++;
        }
      }
    }
    
    addTestResult({
      testName: 'Core Functionality Assessment',
      status: criticalPageIssues === 0 ? (accessiblePages === corePagesToTest.length ? 'PASS' : 'WARNING') : 'FAIL',
      details: `${accessiblePages}/${corePagesToTest.length} pages accessible, ${criticalPageIssues} critical issues`,
      executionTime: Date.now() - startTime
    });
  });
  
  test('3. Form Validation and User Input Testing', async ({ page }) => {
    const startTime = Date.now();
    
    console.log('\n📝 Testing Forms and User Input...');
    
    // Test login form validation first
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    let formValidationIssues = 0;
    
    // Test empty form submission
    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.isVisible({ timeout: 2000 })) {
      await submitButton.click();
      await page.waitForTimeout(2000);
      
      // Check for validation messages
      const validationMessages = await page.locator('.error, .field-error, [role="alert"], .alert-error').count();
      
      if (validationMessages === 0) {
        formValidationIssues++;
        addBugReport({
          severity: 'MEDIUM',
          title: 'Login form lacks validation for empty fields',
          description: 'Submitting empty login form does not show validation errors',
          reproduction: ['1. Go to login page', '2. Click Sign In without filling fields', '3. Look for validation messages'],
          expectedBehavior: 'Should show validation errors for required fields',
          actualBehavior: 'No validation errors displayed',
          recommendation: 'Add client-side validation for required fields',
          category: 'UI/UX'
        });
      }
    }
    
    // Test invalid email format
    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible({ timeout: 2000 })) {
      await emailInput.fill('invalid-email-format');
      await submitButton.click();
      await page.waitForTimeout(2000);
      
      const emailValidation = await page.locator('.error, .field-error, [role="alert"]').count();
      if (emailValidation === 0) {
        formValidationIssues++;
        addBugReport({
          severity: 'LOW',
          title: 'Email format validation not enforced',
          description: 'Invalid email format is accepted without validation',
          reproduction: ['1. Enter invalid email format', '2. Submit form', '3. Check for validation'],
          expectedBehavior: 'Should validate email format and show error for invalid format',
          actualBehavior: 'Invalid email format accepted',
          recommendation: 'Add email format validation',
          category: 'UI/UX'
        });
      }
    }
    
    addTestResult({
      testName: 'Form Validation and User Input Testing',
      status: formValidationIssues === 0 ? 'PASS' : 'WARNING',
      details: `${formValidationIssues} form validation issues found`,
      executionTime: Date.now() - startTime
    });
  });
  
  test('4. Security Assessment', async ({ page }) => {
    const startTime = Date.now();
    
    console.log('\n🛡️ Testing Security...');
    
    let securityIssues = 0;
    
    // Test for XSS protection
    await page.goto('/');
    
    const xssPayload = '<script>window.xssTest = true;</script>';
    const emailInput = page.locator('input[type="email"]').first();
    
    if (await emailInput.isVisible({ timeout: 2000 })) {
      await emailInput.fill(xssPayload);
      await page.waitForTimeout(1000);
      
      // Check if script was executed
      const xssExecuted = await page.evaluate(() => (window as any).xssTest === true);
      
      if (xssExecuted) {
        securityIssues++;
        addBugReport({
          severity: 'CRITICAL',
          title: 'XSS vulnerability in login form',
          description: 'JavaScript code can be executed through form inputs',
          reproduction: ['1. Enter script tag in email field', '2. Check if script executes'],
          expectedBehavior: 'Input should be sanitized and script should not execute',
          actualBehavior: 'Script executes, indicating XSS vulnerability',
          recommendation: 'Implement proper input sanitization and content security policy',
          category: 'Security'
        });
      }
    }
    
    // Test unauthorized access
    await page.context().clearCookies();
    
    const protectedRoutes = ['/dashboard', '/recipes', '/users'];
    
    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      if (!currentUrl.includes('login')) {
        securityIssues++;
        addBugReport({
          severity: 'CRITICAL',
          title: `Unauthorized access to ${route}`,
          description: `Protected route ${route} can be accessed without authentication`,
          reproduction: [`1. Clear cookies/logout`, `2. Navigate to ${route}`, '3. Check if access is granted'],
          expectedBehavior: 'Should redirect to login page',
          actualBehavior: 'Access granted without authentication',
          recommendation: 'Implement proper authentication guards for protected routes',
          category: 'Security'
        });
      }
    }
    
    addTestResult({
      testName: 'Security Assessment',
      status: securityIssues === 0 ? 'PASS' : 'FAIL',
      details: `${securityIssues} security issues identified`,
      executionTime: Date.now() - startTime
    });
  });
  
  test('5. Responsive Design Evaluation', async ({ page }) => {
    const startTime = Date.now();
    
    console.log('\n📱 Testing Responsive Design...');
    
    const loginSuccess = await loginAs(page, 'trainer');
    
    if (!loginSuccess) {
      addTestResult({
        testName: 'Responsive Design Evaluation',
        status: 'FAIL',
        details: 'Cannot test responsive design - authentication failed',
        executionTime: Date.now() - startTime
      });
      return;
    }
    
    const viewports = [
      { name: 'Desktop', width: 1280, height: 720 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Mobile', width: 375, height: 667 }
    ];
    
    let responsiveIssues = 0;
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/dashboard');
      await page.waitForTimeout(2000);
      
      console.log(`Testing ${viewport.name} viewport...`);
      
      // Check for horizontal overflow
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth;
      });
      
      if (hasHorizontalScroll) {
        responsiveIssues++;
        addBugReport({
          severity: 'MEDIUM',
          title: `Horizontal scroll on ${viewport.name}`,
          description: `Layout causes horizontal scrolling on ${viewport.name} viewport`,
          reproduction: [`1. Set viewport to ${viewport.width}x${viewport.height}`, '2. Navigate to dashboard', '3. Check for horizontal scroll'],
          expectedBehavior: 'Content should fit within viewport width',
          actualBehavior: 'Horizontal scrolling required',
          recommendation: 'Review CSS layout and make responsive adjustments',
          category: 'Responsive'
        });
      }
      
      // Check mobile navigation
      if (viewport.width < 768) {
        const mobileMenuToggle = await page.locator('button[aria-label*="menu" i], .hamburger, .menu-toggle').count();
        
        if (mobileMenuToggle === 0) {
          responsiveIssues++;
          addBugReport({
            severity: 'HIGH',
            title: 'Missing mobile navigation',
            description: 'No mobile menu or navigation toggle found on small screens',
            reproduction: ['1. Set mobile viewport', '2. Look for mobile menu toggle'],
            expectedBehavior: 'Should have mobile-friendly navigation',
            actualBehavior: 'No mobile navigation found',
            recommendation: 'Implement mobile navigation menu',
            category: 'Responsive'
          });
        }
      }
    }
    
    addTestResult({
      testName: 'Responsive Design Evaluation',
      status: responsiveIssues === 0 ? 'PASS' : responsiveIssues < 3 ? 'WARNING' : 'FAIL',
      details: `${responsiveIssues} responsive design issues found`,
      executionTime: Date.now() - startTime
    });
  });
  
  test.afterAll(async () => {
    // Generate comprehensive bug report
    console.log('\n' + '='.repeat(100));
    console.log('🔍 COMPREHENSIVE QA BUG REPORT - FitnessMealPlanner');
    console.log('='.repeat(100));
    
    const now = new Date();
    console.log(`Generated: ${now.toISOString()}`);
    console.log(`Test Environment: http://localhost:4000`);
    
    // Test Results Summary
    const passedTests = testResults.filter(r => r.status === 'PASS').length;
    const failedTests = testResults.filter(r => r.status === 'FAIL').length;
    const warningTests = testResults.filter(r => r.status === 'WARNING').length;
    const needsReviewTests = testResults.filter(r => r.status === 'NEEDS_REVIEW').length;
    const totalExecutionTime = testResults.reduce((sum, r) => sum + r.executionTime, 0);
    
    console.log(`\n📊 TEST EXECUTION SUMMARY:`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`⚠️  Warning: ${warningTests}`);
    console.log(`🔍 Needs Review: ${needsReviewTests}`);
    console.log(`📈 Total Tests: ${testResults.length}`);
    console.log(`⏱️  Total Execution Time: ${totalExecutionTime}ms`);
    
    // Bug Report Summary
    const criticalBugs = bugReports.filter(b => b.severity === 'CRITICAL').length;
    const highBugs = bugReports.filter(b => b.severity === 'HIGH').length;
    const mediumBugs = bugReports.filter(b => b.severity === 'MEDIUM').length;
    const lowBugs = bugReports.filter(b => b.severity === 'LOW').length;
    
    console.log(`\n🐛 BUG SUMMARY BY SEVERITY:`);
    console.log(`🔴 Critical: ${criticalBugs}`);
    console.log(`🟠 High: ${highBugs}`);
    console.log(`🟡 Medium: ${mediumBugs}`);
    console.log(`🟢 Low: ${lowBugs}`);
    console.log(`📊 Total Bugs: ${bugReports.length}`);
    
    // Bugs by Category
    const categories = [...new Set(bugReports.map(b => b.category))];
    console.log(`\n📋 BUGS BY CATEGORY:`);
    categories.forEach(category => {
      const count = bugReports.filter(b => b.category === category).length;
      console.log(`${category}: ${count}`);
    });
    
    // Detailed Bug Reports
    if (bugReports.length > 0) {
      console.log(`\n` + '='.repeat(100));
      console.log('🔍 DETAILED BUG REPORTS');
      console.log('='.repeat(100));
      
      ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].forEach(severity => {
        const severityBugs = bugReports.filter(b => b.severity === severity);
        
        if (severityBugs.length > 0) {
          console.log(`\n${'🔴🟠🟡🟢'['CRITICAL,HIGH,MEDIUM,LOW'.split(',').indexOf(severity)]} ${severity} PRIORITY BUGS:`);
          console.log('-'.repeat(50));
          
          severityBugs.forEach((bug, index) => {
            console.log(`\n${index + 1}. ${bug.title}`);
            console.log(`   Category: ${bug.category}`);
            console.log(`   Description: ${bug.description}`);
            console.log(`   Expected: ${bug.expectedBehavior}`);
            console.log(`   Actual: ${bug.actualBehavior}`);
            console.log(`   Steps to Reproduce:`);
            bug.reproduction.forEach((step, stepIndex) => {
              console.log(`      ${stepIndex + 1}. ${step}`);
            });
            console.log(`   Recommendation: ${bug.recommendation}`);
          });
        }
      });
    }
    
    // Overall Assessment
    console.log(`\n` + '='.repeat(100));
    console.log('🏆 OVERALL ASSESSMENT');
    console.log('='.repeat(100));
    
    let overallStatus = 'EXCELLENT';
    if (criticalBugs > 0) overallStatus = 'CRITICAL ISSUES FOUND';
    else if (highBugs > 2) overallStatus = 'SIGNIFICANT ISSUES';
    else if (mediumBugs > 5) overallStatus = 'MODERATE ISSUES';
    else if (bugReports.length > 0) overallStatus = 'MINOR ISSUES';
    
    console.log(`Status: ${overallStatus}`);
    
    // Recommendations
    console.log(`\n💡 PRIORITY RECOMMENDATIONS:`);
    
    if (criticalBugs > 0) {
      console.log('1. 🚨 URGENT: Fix all critical security and authentication issues immediately');
    }
    
    if (highBugs > 0) {
      console.log('2. 🔧 HIGH PRIORITY: Address functionality and accessibility issues');
    }
    
    if (mediumBugs > 0) {
      console.log('3. 🔨 MEDIUM PRIORITY: Improve user experience and performance');
    }
    
    console.log('4. ✅ Implement comprehensive automated testing');
    console.log('5. 🔒 Conduct thorough security audit');
    console.log('6. 📱 Test across multiple devices and browsers');
    console.log('7. ⚡ Performance optimization and monitoring');
    console.log('8. 🧪 User acceptance testing with real users');
    
    // Next Steps
    console.log(`\n🚀 NEXT STEPS:`);
    console.log('• Review and prioritize bug fixes based on severity');
    console.log('• Set up continuous integration testing');
    console.log('• Implement proper logging and error monitoring');
    console.log('• Create user documentation and help system');
    console.log('• Plan regular QA testing cycles');
    
    console.log(`\n` + '='.repeat(100));
    console.log('📄 END OF COMPREHENSIVE QA REPORT');
    console.log('='.repeat(100));
  });
});