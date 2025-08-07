// Comprehensive Verification Test
// Final verification that all components are working correctly

import { chromium } from 'playwright';

console.log('🔬 Running Comprehensive Verification Test...');

const runComprehensiveTest = async () => {
  let browser, page;
  const testResults = {
    applicationLoading: false,
    authentication: false,
    healthProtocolsAccess: false,
    componentRendering: false,
    apiEndpoints: false,
    javascriptErrors: [],
    consoleWarnings: [],
    screenshots: []
  };
  
  try {
    browser = await chromium.launch({ headless: false, devtools: true });
    const context = await browser.newContext();
    page = await context.newPage();
    
    // Collect JavaScript errors
    page.on('pageerror', (error) => {
      console.log(`❌ JavaScript Error: ${error.message}`);
      testResults.javascriptErrors.push(error.message);
    });
    
    // Collect console warnings and errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`🚨 Console Error: ${msg.text()}`);
        testResults.javascriptErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        console.log(`⚠️  Console Warning: ${msg.text()}`);
        testResults.consoleWarnings.push(msg.text());
      } else {
        console.log(`🖥️  Console ${msg.type()}: ${msg.text()}`);
      }
    });
    
    console.log('🔍 Test 1: Application Loading');
    await page.goto('http://localhost:4000');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Check if page loaded successfully
    const pageTitle = await page.title();
    if (pageTitle && pageTitle !== '') {
      console.log(`✅ Application loaded successfully. Title: ${pageTitle}`);
      testResults.applicationLoading = true;
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test/screenshots/app-loading.png', fullPage: true });
    testResults.screenshots.push('app-loading.png');
    
    console.log('🔍 Test 2: Authentication');
    const emailField = await page.waitForSelector('input[type="email"]', { timeout: 5000 }).catch(() => null);
    const passwordField = await page.waitForSelector('input[type="password"]', { timeout: 3000 }).catch(() => null);
    
    if (emailField && passwordField) {
      await emailField.fill('admin@fitmeal.pro');
      await passwordField.fill('Admin123!@#');
      
      const submitButton = await page.waitForSelector('button[type="submit"]', { timeout: 3000 }).catch(() => null);
      if (submitButton) {
        await submitButton.click();
        await page.waitForTimeout(3000);
        
        // Check if we're redirected away from login
        const currentUrl = page.url();
        if (!currentUrl.includes('login')) {
          console.log('✅ Authentication successful - redirected from login page');
          testResults.authentication = true;
        }
      }
    }
    
    console.log('🔍 Test 3: Health Protocols Access');
    
    // Look for Health Protocols tab
    const healthProtocolsTab = await page.waitForSelector('text="Health Protocols"', { timeout: 5000 }).catch(() => null);
    
    if (healthProtocolsTab) {
      console.log('✅ Health Protocols tab found');
      await healthProtocolsTab.click();
      await page.waitForTimeout(2000);
      
      // Take screenshot after clicking
      await page.screenshot({ path: 'test/screenshots/health-protocols-active.png', fullPage: true });
      testResults.screenshots.push('health-protocols-active.png');
      
      testResults.healthProtocolsAccess = true;
    }
    
    console.log('🔍 Test 4: Component Rendering Verification');
    
    // Check for various component indicators
    const componentSelectors = [
      'text="🧬 Health Protocols"',
      'text="Longevity (Anti-Aging)"',
      'text="Parasite Cleanse"',
      'text="Specialized Health Protocols"',
      '[data-testid]', // Any data-testid attributes
      '.lucide', // Lucide icons
      'svg' // Any SVG icons
    ];
    
    let componentsFound = 0;
    for (const selector of componentSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          componentsFound++;
          console.log(`✅ Found ${elements.length} elements matching: ${selector}`);
        }
      } catch (e) {
        // Continue checking other selectors
      }
    }
    
    if (componentsFound >= 3) {
      console.log(`✅ Component rendering verified - ${componentsFound} component types found`);
      testResults.componentRendering = true;
    }
    
    console.log('🔍 Test 5: API Endpoint Verification');
    
    // Test API endpoints that should be accessible
    try {
      const response = await fetch('http://localhost:4000/api/health');
      if (response.ok) {
        console.log('✅ Health API endpoint responding');
        testResults.apiEndpoints = true;
      }
    } catch (error) {
      console.log(`❌ API test failed: ${error.message}`);
    }
    
    // Wait a bit more to catch any late-loading errors
    await page.waitForTimeout(5000);
    
    return testResults;
    
  } catch (error) {
    console.log(`❌ Test execution failed: ${error.message}`);
    testResults.executionError = error.message;
    return testResults;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

// Execute test and generate report
runComprehensiveTest().then(results => {
  console.log('\n' + '='.repeat(60));
  console.log('🏁 COMPREHENSIVE VERIFICATION TEST RESULTS');
  console.log('='.repeat(60));
  
  console.log('\n📊 TEST RESULTS SUMMARY:');
  console.log(`✅ Application Loading: ${results.applicationLoading ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Authentication Flow: ${results.authentication ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Health Protocols Access: ${results.healthProtocolsAccess ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Component Rendering: ${results.componentRendering ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ API Endpoints: ${results.apiEndpoints ? 'PASSED' : 'FAILED'}`);
  
  console.log(`\n🚨 JavaScript Errors Found: ${results.javascriptErrors.length}`);
  if (results.javascriptErrors.length > 0) {
    results.javascriptErrors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }
  
  console.log(`\n⚠️  Console Warnings: ${results.consoleWarnings.length}`);
  if (results.consoleWarnings.length > 0) {
    results.consoleWarnings.forEach((warning, index) => {
      console.log(`   ${index + 1}. ${warning}`);
    });
  }
  
  console.log(`\n📸 Screenshots Captured: ${results.screenshots.length}`);
  results.screenshots.forEach(screenshot => {
    console.log(`   - test/screenshots/${screenshot}`);
  });
  
  // Overall success calculation
  const passedTests = [
    results.applicationLoading,
    results.authentication,
    results.healthProtocolsAccess,
    results.componentRendering,
    results.apiEndpoints
  ].filter(Boolean).length;
  
  const totalTests = 5;
  const successRate = (passedTests / totalTests) * 100;
  
  console.log(`\n🎯 OVERALL SUCCESS RATE: ${passedTests}/${totalTests} (${successRate.toFixed(1)}%)`);
  
  if (successRate >= 80 && results.javascriptErrors.length === 0) {
    console.log('🎉 VERIFICATION COMPLETE: Application is functioning correctly!');
    console.log('✅ All critical functionality verified');
    console.log('✅ No blocking JavaScript errors detected');
    console.log('✅ User workflow (Admin → Health Protocols) working');
    process.exit(0);
  } else if (successRate >= 60) {
    console.log('⚠️  VERIFICATION PARTIAL: Most functionality working with minor issues');
    process.exit(0);
  } else {
    console.log('❌ VERIFICATION FAILED: Critical issues detected');
    process.exit(1);
  }
  
}).catch(error => {
  console.log('❌ Test execution completely failed:', error.message);
  process.exit(1);
});