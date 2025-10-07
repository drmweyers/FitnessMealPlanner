import { test, expect, Page } from '@playwright/test';

test.describe('Manual Health Protocol Validation', () => {
  let page: Page;
  
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      console.log(`🔍 ${msg.type()}: ${msg.text()}`);
    });

    // Catch network errors
    page.on('requestfailed', request => {
      console.log(`❌ Network Error: ${request.url()} - ${request.failure()?.errorText}`);
    });
  });

  test.afterAll(async () => {
    await page?.close();
  });

  test('Login and Navigate to Health Protocols', async () => {
    console.log('🚀 Starting manual validation...');
    
    // Step 1: Navigate and login
    await page.goto('http://localhost:4000');
    await page.waitForLoadState('networkidle');
    
    // Verify login page loaded
    await expect(page.locator('h1')).toContainText('Welcome Back');
    console.log('✅ Login page loaded correctly');
    
    // Login as trainer
    await page.fill('input[placeholder="your@email.com"]', 'trainer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestTrainer123!');
    await page.click('button:has-text("Sign In")');
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/trainer/dashboard', { timeout: 10000 });
    console.log('✅ Successfully logged in and redirected to dashboard');
    
    // Step 2: Navigate to Health Protocols
    await page.click('a[href="/trainer/health-protocols"]');
    await page.waitForURL('**/trainer/health-protocols');
    await page.waitForLoadState('networkidle');
    
    // Verify Health Protocols page
    await expect(page.locator('h1')).toContainText('Health Protocols');
    console.log('✅ Health Protocols page loaded correctly');
    
    // Step 3: Check all tabs are present
    const tabs = ['Protocols', 'Health Issues', 'Specialized Protocols', 'Ingredients', 'Dashboard'];
    for (const tab of tabs) {
      const tabExists = await page.locator(`button:has-text("${tab}")`).isVisible();
      console.log(`${tabExists ? '✅' : '❌'} ${tab} tab: ${tabExists ? 'Present' : 'Missing'}`);
    }
    
    // Step 4: Test Specialized Protocols tab
    console.log('🔄 Testing Specialized Protocols tab...');
    await page.click('button:has-text("Specialized Protocols")');
    await page.waitForTimeout(2000);
    
    // Check form elements
    const protocolSelect = page.locator('select[name="protocolType"]');
    const emailInput = page.locator('input[name="customerEmail"]');
    const generateButton = page.locator('button:has-text("Generate Protocol")');
    
    const formExists = await protocolSelect.isVisible() && 
                      await emailInput.isVisible() && 
                      await generateButton.isVisible();
    
    console.log(`${formExists ? '✅' : '❌'} Specialized Protocols form: ${formExists ? 'Complete' : 'Incomplete'}`);
    
    // Step 5: Test protocol generation (quick test)
    if (formExists) {
      console.log('🔄 Testing quick protocol generation...');
      
      // Fill minimal form
      await page.selectOption('select[name="protocolType"]', 'parasite-cleanse');
      await page.fill('input[name="customerEmail"]', 'test.validation@example.com');
      await page.fill('input[name="age"]', '30');
      await page.selectOption('select[name="gender"]', 'female');
      await page.fill('input[name="weight"]', '150');
      
      // Try to generate
      await page.click('button:has-text("Generate Protocol")');
      
      // Wait for either success or error
      try {
        // Wait for protocol result or error message
        await Promise.race([
          page.locator('.protocol-result, .generated-protocol').waitFor({ timeout: 30000 }),
          page.locator('.error, .alert-error, .text-red').waitFor({ timeout: 5000 })
        ]);
        
        const protocolVisible = await page.locator('.protocol-result, .generated-protocol').isVisible().catch(() => false);
        const errorVisible = await page.locator('.error, .alert-error, .text-red').isVisible().catch(() => false);
        
        if (protocolVisible) {
          console.log('✅ Protocol generated successfully');
        } else if (errorVisible) {
          const errorText = await page.locator('.error, .alert-error, .text-red').textContent();
          console.log(`❌ Protocol generation failed with error: ${errorText}`);
        } else {
          console.log('⚠️ Protocol generation status unclear');
        }
        
      } catch (error) {
        console.log(`⚠️ Protocol generation timed out: ${error}`);
      }
    }
    
    console.log('🎉 Manual validation completed');
  });
  
  test('Check Application Health', async () => {
    // Check frontend is responsive
    const response = await page.request.get('http://localhost:4000');
    expect(response.status()).toBe(200);
    console.log('✅ Frontend server responding');
    
    // Check API health
    const apiResponse = await page.request.get('http://localhost:4000/api/health');
    if (apiResponse.status() === 200) {
      console.log('✅ API server responding');
    } else {
      console.log('❌ API server not responding');
    }
  });
});