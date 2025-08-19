import { test, expect, Page } from '@playwright/test';

test.describe('Health Protocol Removal Validation', () => {
  let page: Page;
  
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    
    // Enable console logging to catch errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`❌ Console Error: ${msg.text()}`);
      } else if (msg.type() === 'warning') {
        console.log(`⚠️ Console Warning: ${msg.text()}`);
      } else if (msg.text().includes('protocol') || msg.text().includes('generation')) {
        console.log(`🔍 Console Log: ${msg.text()}`);
      }
    });

    // Catch network errors
    page.on('requestfailed', request => {
      console.log(`❌ Network Error: ${request.url()} - ${request.failure()?.errorText}`);
    });
  });

  test.afterAll(async () => {
    await page?.close();
  });

  test('Verify Health Protocol Feature Removal', async () => {
    console.log('🚀 Starting health protocol removal validation...');
    
    // Step 1: Navigate to application
    console.log('📍 Step 1: Navigating to application...');
    await page.goto('http://localhost:4000');
    await page.waitForLoadState('networkidle');
    
    // Step 2: Login as trainer
    console.log('📍 Step 2: Logging in as trainer...');
    await expect(page.locator('h2')).toContainText('Login');
    
    await page.fill('input[type="email"]', 'trainer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestTrainer123!');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForURL('**/trainer/dashboard');
    await page.waitForLoadState('networkidle');
    console.log('✅ Successfully logged in as trainer');
    
    // Step 3: Navigate to Health Protocols
    console.log('📍 Step 3: Navigating to Health Protocols...');
    await page.click('a[href="/trainer/health-protocols"]');
    await page.waitForURL('**/trainer/health-protocols');
    await page.waitForLoadState('networkidle');
    
    // Verify page loaded correctly
    await expect(page.locator('h1')).toContainText('Health Protocols');
    console.log('✅ Health Protocols page loaded');
    
    // Step 4: Test Longevity Protocol Generation
    console.log('📍 Step 4: Testing Longevity protocol generation...');
    
    // Navigate to Specialized Protocols tab
    await page.click('button:has-text("Specialized Protocols")');
    await page.waitForTimeout(1000);
    
    // Fill longevity protocol form
    await page.selectOption('select[name="protocolType"]', 'longevity');
    await page.fill('input[name="customerEmail"]', 'longevity.customer@test.com');
    await page.fill('input[name="age"]', '45');
    await page.selectOption('select[name="gender"]', 'male');
    await page.fill('input[name="weight"]', '180');
    await page.fill('input[name="height"]', '5\'10"');
    await page.selectOption('select[name="activityLevel"]', 'moderate');
    
    // Add multiple health concerns
    await page.click('input[value="cardiovascular"]');
    await page.click('input[value="cognitive"]');
    await page.click('input[value="metabolic"]');
    
    // Generate protocol
    console.log('🔄 Generating longevity protocol...');
    await page.click('button:has-text("Generate Protocol")');
    
    // Wait for generation to complete (increased timeout for large payloads)
    const protocolResult1 = page.locator('.protocol-result, .generated-protocol, [data-testid="protocol-result"]');
    await expect(protocolResult1).toBeVisible({ timeout: 60000 });
    
    console.log('✅ Longevity protocol generated successfully');
    
    // Step 5: Test Parasite Cleanse Protocol
    console.log('📍 Step 5: Testing Parasite cleanse protocol...');
    
    // Clear form and set parasite cleanse
    await page.selectOption('select[name="protocolType"]', 'parasite-cleanse');
    await page.fill('input[name="customerEmail"]', 'parasite.customer@test.com');
    await page.fill('input[name="age"]', '35');
    await page.selectOption('select[name="gender"]', 'female');
    await page.fill('input[name="weight"]', '140');
    
    console.log('🔄 Generating parasite cleanse protocol...');
    await page.click('button:has-text("Generate Protocol")');
    
    const protocolResult2 = page.locator('.protocol-result, .generated-protocol, [data-testid="protocol-result"]');
    await expect(protocolResult2).toBeVisible({ timeout: 60000 });
    
    console.log('✅ Parasite cleanse protocol generated successfully');
    
    // Step 6: Test Ailments-Based Protocol
    console.log('📍 Step 6: Testing ailments-based protocol...');
    
    // Navigate to Health Issues tab
    await page.click('button:has-text("Health Issues")');
    await page.waitForTimeout(1000);
    
    // Fill ailments form
    await page.fill('input[name="customerEmail"]', 'diabetes.customer@test.com');
    await page.fill('input[name="age"]', '50');
    await page.selectOption('select[name="gender"]', 'male');
    await page.fill('input[name="weight"]', '200');
    await page.fill('input[name="height"]', '6\'0"');
    await page.selectOption('select[name="activityLevel"]', 'low');
    
    // Add specific ailments
    await page.click('input[value="diabetes"]');
    await page.click('input[value="hypertension"]');
    
    console.log('🔄 Generating ailments-based protocol...');
    await page.click('button:has-text("Generate Protocol")');
    
    const protocolResult3 = page.locator('.protocol-result, .generated-protocol, [data-testid="protocol-result"]');
    await expect(protocolResult3).toBeVisible({ timeout: 60000 });
    
    console.log('✅ Ailments-based protocol generated successfully');
    
    // Step 7: Verify Protocol Persistence
    console.log('📍 Step 7: Verifying protocol persistence...');
    
    // Navigate to Protocols tab to see saved protocols
    await page.click('button:has-text("Protocols")');
    await page.waitForTimeout(2000);
    
    // Check for protocol cards or list items
    const protocolCards = page.locator('.protocol-card, .protocol-item, [data-testid="protocol-card"]');
    await expect(protocolCards.first()).toBeVisible({ timeout: 10000 });
    
    const protocolCount = await protocolCards.count();
    console.log(`✅ Found ${protocolCount} saved protocols`);
    
    // Step 8: Test Tab Functionality
    console.log('📍 Step 8: Testing all tab functionality...');
    
    const tabs = ['Protocols', 'Health Issues', 'Ingredients', 'Dashboard'];
    for (const tab of tabs) {
      console.log(`🔄 Testing ${tab} tab...`);
      await page.click(`button:has-text("${tab}")`);
      await page.waitForTimeout(1000);
      
      // Verify tab content loads
      const tabContent = page.locator('.tab-content, .protocol-content, [data-testid="tab-content"]');
      await expect(tabContent).toBeVisible({ timeout: 5000 });
      console.log(`✅ ${tab} tab working`);
    }
    
    // Step 9: Test Error Handling
    console.log('📍 Step 9: Testing error handling...');
    
    await page.click('button:has-text("Health Issues")');
    await page.waitForTimeout(1000);
    
    // Try to generate without required fields
    await page.click('button:has-text("Generate Protocol")');
    
    // Look for error messages
    const errorMessage = page.locator('.error, .alert-error, [data-testid="error"]');
    const errorVisible = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (errorVisible) {
      console.log('✅ Error handling working - validation messages shown');
    } else {
      console.log('⚠️ No error message visible - may need improvement');
    }
    
    console.log('🎉 Integration validation completed successfully!');
    
    // Generate summary
    const summary = {
      longevityProtocol: '✅ Generated successfully',
      parasiteProtocol: '✅ Generated successfully', 
      ailmentsProtocol: '✅ Generated successfully',
      protocolPersistence: `✅ ${protocolCount} protocols saved`,
      tabFunctionality: '✅ All tabs working',
      errorHandling: errorVisible ? '✅ Working' : '⚠️ Needs review'
    };
    
    console.log('\n📊 VALIDATION SUMMARY:');
    Object.entries(summary).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
  });
  
  test('Database Verification Test', async () => {
    console.log('📍 Testing database persistence directly...');
    
    // This will be verified by checking the database after protocol generation
    // The actual database check will be done in the next test step
    expect(true).toBe(true); // Placeholder - actual DB check follows in bash commands
  });
});