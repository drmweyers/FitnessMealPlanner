import { test, expect } from '@playwright/test';

test.describe('Debug Progress TAB', () => {
  test('Check Progress TAB rendering and console errors', async ({ page }) => {
    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log('Console Error:', msg.text());
      }
    });

    // Listen for page errors
    page.on('pageerror', error => {
      console.log('Page Error:', error.message);
      consoleErrors.push(error.message);
    });

    // Navigate to login
    await page.goto('http://localhost:4000/login');
    
    // Login as customer
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    console.log('Current URL after login:', page.url());
    
    // Take screenshot after login
    await page.screenshot({ path: 'after-login.png', fullPage: true });
    
    // Try different ways to find the Progress button
    console.log('\n--- Searching for Progress TAB ---');
    
    // Method 1: Look for button with text
    const progressButton1 = page.locator('button:has-text("Progress")');
    console.log('Method 1 - button:has-text("Progress"):', await progressButton1.count());
    
    // Method 2: Look for tab trigger
    const progressButton2 = page.locator('[role="tab"]:has-text("Progress")');
    console.log('Method 2 - [role="tab"]:has-text("Progress"):', await progressButton2.count());
    
    // Method 3: Look by data attribute
    const progressButton3 = page.locator('[data-state][value="progress"]');
    console.log('Method 3 - [data-state][value="progress"]:', await progressButton3.count());
    
    // Method 4: Look for any element with Progress text
    const progressElements = page.locator('*:has-text("Progress")');
    console.log('Method 4 - Any element with "Progress":', await progressElements.count());
    
    // List all visible buttons
    const allButtons = await page.locator('button:visible').allTextContents();
    console.log('\nAll visible buttons:', allButtons);
    
    // List all tabs
    const allTabs = await page.locator('[role="tab"]').allTextContents();
    console.log('All tabs:', allTabs);
    
    // Try clicking the TAB (not the sidebar button)
    const progressTab = page.locator('[role="tab"]:has-text("Progress")');
    if (await progressTab.isVisible()) {
      console.log('\nClicking Progress TAB...');
      await progressTab.click();
      await page.waitForTimeout(2000);
      
      // Check if Progress content loaded
      console.log('\n--- Checking Progress content ---');
      
      // Look for ProgressTracking component content
      const progressTracking = page.locator('text="Progress Tracking"');
      console.log('Progress Tracking header visible:', await progressTracking.isVisible());
      
      const currentWeight = page.locator('text="Current Weight"');
      console.log('Current Weight visible:', await currentWeight.isVisible());
      
      // Take screenshot of Progress tab
      await page.screenshot({ path: 'progress-tab.png', fullPage: true });
      
      // Check for any error messages
      const errorMessages = page.locator('.error, .alert, [role="alert"]');
      const errorCount = await errorMessages.count();
      if (errorCount > 0) {
        console.log('\nError messages found:', errorCount);
        for (let i = 0; i < errorCount; i++) {
          console.log('Error:', await errorMessages.nth(i).textContent());
        }
      }
    } else {
      console.log('\n❌ Progress button not found!');
      
      // Check if we're on the customer page
      const welcomeText = page.locator('h1');
      console.log('Page heading:', await welcomeText.textContent());
      
      // Debug DOM structure
      const tabsContainer = page.locator('[role="tablist"]');
      if (await tabsContainer.isVisible()) {
        console.log('\nTabs container found');
        const tabsHTML = await tabsContainer.innerHTML();
        console.log('Tabs HTML (first 500 chars):', tabsHTML.substring(0, 500));
      }
    }
    
    // Report console errors
    if (consoleErrors.length > 0) {
      console.log('\n❌ Console errors detected:');
      consoleErrors.forEach(error => console.log('  -', error));
    } else {
      console.log('\n✅ No console errors detected');
    }
    
    // Always pass to see the output
    expect(true).toBe(true);
  });

  test('Check Progress API endpoints', async ({ request }) => {
    // First login to get token
    const loginResponse = await request.post('http://localhost:4000/api/auth/login', {
      data: {
        email: 'customer.test@evofitmeals.com',
        password: 'TestCustomer123!'
      }
    });
    
    const loginData = await loginResponse.json();
    console.log('Login response status:', loginResponse.status());
    
    if (loginResponse.ok() && loginData.data?.accessToken) {
      const token = loginData.data.accessToken;
      console.log('✅ Login successful, got token');
      
      // Test progress endpoints
      const endpoints = [
        '/api/progress/measurements',
        '/api/progress/goals', 
        '/api/progress/photos',
        '/api/progress/summary',
        '/api/progress/trends'
      ];
      
      for (const endpoint of endpoints) {
        const response = await request.get(`http://localhost:4000${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log(`${endpoint}: ${response.status()} ${response.statusText()}`);
        
        if (response.ok()) {
          const data = await response.json();
          console.log(`  Data:`, JSON.stringify(data).substring(0, 100));
        }
      }
    } else {
      console.log('❌ Login failed:', loginData);
    }
    
    expect(true).toBe(true);
  });
});