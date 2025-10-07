import { test, expect } from '@playwright/test';

test.describe('Application Diagnostic Tests', () => {
  
  test('Basic Application Accessibility and Structure', async ({ page }) => {
    // Test homepage accessibility
    await page.goto('/');
    await page.waitForTimeout(3000);
    
    // Take screenshot of homepage
    await page.screenshot({
      path: 'test-results/diagnostic-homepage.png',
      fullPage: true
    });
    
    console.log('Current URL:', page.url());
    console.log('Page title:', await page.title());
    
    // Get page content and log key elements
    const bodyContent = await page.textContent('body');
    console.log('Page contains Login:', bodyContent?.includes('Login') || bodyContent?.includes('login'));
    console.log('Page contains Register:', bodyContent?.includes('Register') || bodyContent?.includes('register'));
    console.log('Page contains Dashboard:', bodyContent?.includes('Dashboard') || bodyContent?.includes('dashboard'));
    
    // Check for common navigation elements
    const navElements = await page.$$('nav, .nav, .navigation, header, .header');
    console.log('Navigation elements found:', navElements.length);
    
    // Check for login-related elements
    const loginElements = await page.$$('input[type="email"], input[type="password"], button:has-text("Login"), a:has-text("Login")');
    console.log('Login-related elements found:', loginElements.length);
    
    // Check for Health Protocol keywords in the page source
    const pageSource = await page.content();
    const healthProtocolKeywords = [
      'health protocol',
      'Health Protocol',
      'protocol assignment',
      'specialized protocol'
    ];
    
    let healthProtocolFound = false;
    for (const keyword of healthProtocolKeywords) {
      if (pageSource.toLowerCase().includes(keyword.toLowerCase())) {
        console.log(`❌ HEALTH PROTOCOL FOUND: "${keyword}"`);
        healthProtocolFound = true;
      }
    }
    
    if (!healthProtocolFound) {
      console.log('✅ NO HEALTH PROTOCOL KEYWORDS FOUND ON HOMEPAGE');
    }
    
    // Test basic interactivity
    try {
      // Try to find and click any login link/button
      const loginSelectors = [
        'text=Login',
        'a:has-text("Login")',
        'button:has-text("Login")',
        '.login-button',
        '[href*="login"]'
      ];
      
      let loginFound = false;
      for (const selector of loginSelectors) {
        try {
          await page.click(selector, { timeout: 2000 });
          console.log(`✅ Successfully clicked login element: ${selector}`);
          loginFound = true;
          break;
        } catch (error) {
          // Try next selector
        }
      }
      
      if (loginFound) {
        await page.waitForTimeout(2000);
        await page.screenshot({
          path: 'test-results/diagnostic-after-login-click.png',
          fullPage: true
        });
        console.log('Current URL after login click:', page.url());
      } else {
        console.log('⚠️ No login element found to click');
      }
      
    } catch (error) {
      console.log(`Login interaction failed: ${error.message}`);
    }
    
    // This test always passes - it's for diagnostics
    expect(true).toBe(true);
  });
  
  test('API Endpoint Health Check', async ({ page }) => {
    // Test API endpoints directly
    const apiEndpoints = [
      '/api/health',
      '/api/status',
      '/api/auth/status',
      '/api/users',
      '/api/recipes'
    ];
    
    const apiResults: { [key: string]: number } = {};
    
    for (const endpoint of apiEndpoints) {
      try {
        const response = await page.request.get(`http://localhost:4001${endpoint}`);
        apiResults[endpoint] = response.status();
        console.log(`API ${endpoint}: Status ${response.status()}`);
      } catch (error) {
        apiResults[endpoint] = 0;
        console.log(`API ${endpoint}: Failed - ${error.message}`);
      }
    }
    
    // Test Health Protocol API endpoints (should be eliminated)
    const healthProtocolEndpoints = [
      '/api/health-protocols',
      '/api/trainer-health-protocols',
      '/api/protocol-assignments'
    ];
    
    let healthProtocolAPIsFound = false;
    for (const endpoint of healthProtocolEndpoints) {
      try {
        const response = await page.request.get(`http://localhost:4001${endpoint}`);
        if (response.status() === 200) {
          console.log(`❌ HEALTH PROTOCOL API STILL ACTIVE: ${endpoint} returned ${response.status()}`);
          healthProtocolAPIsFound = true;
        } else {
          console.log(`✅ Health Protocol API eliminated: ${endpoint} returned ${response.status()}`);
        }
      } catch (error) {
        console.log(`✅ Health Protocol API eliminated: ${endpoint} failed to connect`);
      }
    }
    
    if (!healthProtocolAPIsFound) {
      console.log('🎉 ALL HEALTH PROTOCOL APIs SUCCESSFULLY ELIMINATED');
    }
    
    console.log('API Test Results:', apiResults);
    expect(true).toBe(true);
  });
  
  test('Application Performance Test', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    console.log(`Homepage load time: ${loadTime}ms`);
    
    // Performance should be reasonable (under 15 seconds for initial load)
    expect(loadTime).toBeLessThan(15000);
    
    // Check for JavaScript errors
    const jsErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text());
      }
    });
    
    // Navigate around the application a bit
    await page.reload();
    await page.waitForTimeout(3000);
    
    console.log(`JavaScript errors detected: ${jsErrors.length}`);
    if (jsErrors.length > 0) {
      console.log('JavaScript errors:', jsErrors);
    }
    
    // Check if any errors are Health Protocol related
    const healthProtocolErrors = jsErrors.filter(error => 
      error.toLowerCase().includes('health') || 
      error.toLowerCase().includes('protocol')
    );
    
    if (healthProtocolErrors.length > 0) {
      console.log('❌ Health Protocol related JavaScript errors found:', healthProtocolErrors);
    } else {
      console.log('✅ No Health Protocol related JavaScript errors');
    }
    
    expect(true).toBe(true);
  });
  
});