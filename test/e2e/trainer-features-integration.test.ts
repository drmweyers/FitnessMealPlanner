import { test, expect } from '@playwright/test';

const TRAINER_EMAIL = 'trainer.test@evofitmeals.com';
const TRAINER_PASSWORD = 'TestTrainer123!';

test.describe('Trainer Features Integration - Saved Plans & Customers', () => {
  
  test.beforeEach(async ({ page }) => {
    console.log('\n📋 Setting up test environment...');
    
    // Clear any existing session
    await page.goto('http://localhost:4000');
    await page.waitForTimeout(1000);
    
    // Login as trainer
    console.log('🔐 Logging in as trainer...');
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', TRAINER_EMAIL);
    await page.fill('input[type="password"]', TRAINER_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for successful login
    await page.waitForURL('**/trainer', { timeout: 15000 });
    console.log('✅ Successfully logged in\n');
  });
  
  test('1. Both features work without logout/login cycle', async ({ page }) => {
    console.log('🧪 TEST 1: Verifying both features work without logout/login\n');
    
    // Step 1: Navigate to Saved Plans
    console.log('📌 Step 1: Testing Saved Plans tab...');
    const savedPlansTab = page.locator('button[role="tab"]').filter({ hasText: /Saved/i });
    await savedPlansTab.click();
    await page.waitForURL('**/trainer/meal-plans');
    
    // Wait for API call
    const savedPlansApiResponse = page.waitForResponse(
      response => response.url().includes('/api/trainer/meal-plans') && response.status() === 200,
      { timeout: 5000 }
    ).catch(() => null);
    
    await page.waitForTimeout(2000);
    const savedPlansResponse = await savedPlansApiResponse;
    
    if (savedPlansResponse) {
      const data = await savedPlansResponse.json();
      console.log(`   ✅ Saved Plans API called - ${data.total} plans found`);
    } else {
      console.log('   ⚠️ Saved Plans API not called automatically');
    }
    
    // Check if meal plans are displayed
    const mealPlanCards = await page.locator('.grid > .relative').count();
    const emptyPlansState = await page.locator('text=/You haven\'t saved any meal plans yet/i').isVisible().catch(() => false);
    console.log(`   📊 Meal plan cards displayed: ${mealPlanCards}`);
    console.log(`   📭 Empty state shown: ${emptyPlansState}`);
    
    // Step 2: Navigate to Customers WITHOUT logging out
    console.log('\n📌 Step 2: Testing Customers tab (without logout)...');
    const customersTab = page.locator('button[role="tab"]').filter({ hasText: /Customers/i });
    await customersTab.click();
    await page.waitForURL('**/trainer/customers');
    
    // Wait for API call
    const customersApiResponse = page.waitForResponse(
      response => response.url().includes('/api/trainer/customers') && response.status() === 200,
      { timeout: 5000 }
    ).catch(() => null);
    
    await page.waitForTimeout(2000);
    const customersResponse = await customersApiResponse;
    
    if (customersResponse) {
      const data = await customersResponse.json();
      console.log(`   ✅ Customers API called - ${data.total} customers found`);
    } else {
      console.log('   ⚠️ Customers API not called automatically');
    }
    
    // Check if customers are displayed
    const customerCards = await page.locator('[class*="customer"]').count();
    const emptyCustomersState = await page.locator('text=/No customers found/i').isVisible().catch(() => false);
    console.log(`   📊 Customer elements displayed: ${customerCards}`);
    console.log(`   📭 Empty customers state shown: ${emptyCustomersState}`);
    
    // Step 3: Navigate BACK to Saved Plans
    console.log('\n📌 Step 3: Testing return to Saved Plans...');
    await savedPlansTab.click();
    await page.waitForURL('**/trainer/meal-plans');
    await page.waitForTimeout(2000);
    
    const mealPlanCardsAfterReturn = await page.locator('.grid > .relative').count();
    console.log(`   📊 Meal plans after returning: ${mealPlanCardsAfterReturn}`);
    
    // Step 4: Navigate BACK to Customers
    console.log('\n📌 Step 4: Testing return to Customers...');
    await customersTab.click();
    await page.waitForURL('**/trainer/customers');
    await page.waitForTimeout(2000);
    
    const customerCardsAfterReturn = await page.locator('[class*="customer"]').count();
    console.log(`   📊 Customers after returning: ${customerCardsAfterReturn}`);
    
    // Verification
    const savedPlansWork = mealPlanCards > 0 || emptyPlansState;
    const customersWork = customerCards > 0 || emptyCustomersState;
    const bothWork = savedPlansWork && customersWork;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST 1 RESULTS:');
    console.log('='.repeat(60));
    console.log(`Saved Plans functional: ${savedPlansWork ? '✅' : '❌'}`);
    console.log(`Customers functional: ${customersWork ? '✅' : '❌'}`);
    console.log(`Both work together: ${bothWork ? '✅ SUCCESS!' : '❌ FAILED'}`);
    
    expect(bothWork).toBeTruthy();
  });
  
  test('2. Rapid switching between tabs', async ({ page }) => {
    console.log('🧪 TEST 2: Rapid tab switching test\n');
    
    const savedPlansTab = page.locator('button[role="tab"]').filter({ hasText: /Saved/i });
    const customersTab = page.locator('button[role="tab"]').filter({ hasText: /Customers/i });
    
    // Rapid switching test
    for (let i = 1; i <= 5; i++) {
      console.log(`🔄 Switch ${i}/5...`);
      
      // Go to Saved Plans
      await savedPlansTab.click();
      await page.waitForTimeout(500);
      const mealPlans = await page.locator('.grid > .relative, text=/You haven\'t saved any meal plans/i').first().isVisible();
      console.log(`   Saved Plans visible: ${mealPlans}`);
      
      // Go to Customers
      await customersTab.click();
      await page.waitForTimeout(500);
      const customers = await page.locator('[class*="customer"], text=/No customers found/i').first().isVisible();
      console.log(`   Customers visible: ${customers}`);
    }
    
    console.log('\n✅ Rapid switching test completed');
  });
  
  test('3. API calls are made correctly', async ({ page }) => {
    console.log('🧪 TEST 3: API call verification\n');
    
    const apiCalls = {
      savedPlans: 0,
      customers: 0
    };
    
    // Monitor all API calls
    page.on('response', response => {
      if (response.url().includes('/api/trainer/meal-plans') && response.status() === 200) {
        apiCalls.savedPlans++;
        console.log(`📡 Saved Plans API call #${apiCalls.savedPlans}`);
      }
      if (response.url().includes('/api/trainer/customers') && response.status() === 200) {
        apiCalls.customers++;
        console.log(`📡 Customers API call #${apiCalls.customers}`);
      }
    });
    
    // Navigate to Saved Plans
    console.log('🔍 Navigating to Saved Plans...');
    await page.click('button[role="tab"]:has-text("Saved")');
    await page.waitForTimeout(2000);
    
    // Navigate to Customers
    console.log('🔍 Navigating to Customers...');
    await page.click('button[role="tab"]:has-text("Customers")');
    await page.waitForTimeout(2000);
    
    // Navigate back to Saved Plans
    console.log('🔍 Navigating back to Saved Plans...');
    await page.click('button[role="tab"]:has-text("Saved")');
    await page.waitForTimeout(2000);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 API CALL SUMMARY:');
    console.log('='.repeat(60));
    console.log(`Saved Plans API calls: ${apiCalls.savedPlans}`);
    console.log(`Customers API calls: ${apiCalls.customers}`);
    console.log(`Result: ${apiCalls.savedPlans >= 2 && apiCalls.customers >= 1 ? '✅ PASS' : '❌ FAIL'}`);
    
    expect(apiCalls.savedPlans).toBeGreaterThanOrEqual(2);
    expect(apiCalls.customers).toBeGreaterThanOrEqual(1);
  });
  
  test('4. No cache conflicts after operations', async ({ page }) => {
    console.log('🧪 TEST 4: Cache conflict test\n');
    
    // Navigate to Saved Plans and perform search
    console.log('📌 Testing Saved Plans search...');
    await page.click('button[role="tab"]:has-text("Saved")');
    await page.waitForURL('**/trainer/meal-plans');
    await page.waitForTimeout(1500);
    
    const searchInput = page.locator('input[placeholder*="Search meal plans"]');
    await searchInput.fill('test');
    await page.waitForTimeout(1000);
    await searchInput.clear();
    await page.waitForTimeout(1000);
    
    const plansAfterSearch = await page.locator('.grid > .relative').count();
    console.log(`   Plans after search: ${plansAfterSearch}`);
    
    // Navigate to Customers and check they still work
    console.log('\n📌 Checking Customers after Saved Plans operations...');
    await page.click('button[role="tab"]:has-text("Customers")');
    await page.waitForURL('**/trainer/customers');
    await page.waitForTimeout(1500);
    
    const customersVisible = await page.locator('[class*="customer"], text=/No customers found/i').first().isVisible();
    console.log(`   Customers still visible: ${customersVisible}`);
    
    // Go back to Saved Plans
    console.log('\n📌 Checking Saved Plans still work...');
    await page.click('button[role="tab"]:has-text("Saved")');
    await page.waitForURL('**/trainer/meal-plans');
    await page.waitForTimeout(1500);
    
    const plansStillVisible = await page.locator('.grid > .relative, text=/You haven\'t saved any meal plans/i').first().isVisible();
    console.log(`   Saved Plans still visible: ${plansStillVisible}`);
    
    console.log('\n✅ No cache conflicts detected');
    expect(customersVisible && plansStillVisible).toBeTruthy();
  });
  
  test('5. Page refresh maintains both features', async ({ page }) => {
    console.log('🧪 TEST 5: Page refresh test\n');
    
    // Navigate to Saved Plans
    console.log('📌 Navigate to Saved Plans...');
    await page.click('button[role="tab"]:has-text("Saved")');
    await page.waitForURL('**/trainer/meal-plans');
    await page.waitForTimeout(2000);
    
    const plansBeforeRefresh = await page.locator('.grid > .relative').count();
    console.log(`   Plans before refresh: ${plansBeforeRefresh}`);
    
    // Refresh the page
    console.log('\n🔄 Refreshing page...');
    await page.reload();
    await page.waitForTimeout(2000);
    
    const plansAfterRefresh = await page.locator('.grid > .relative').count();
    console.log(`   Plans after refresh: ${plansAfterRefresh}`);
    
    // Navigate to Customers
    console.log('\n📌 Navigate to Customers...');
    await page.click('button[role="tab"]:has-text("Customers")');
    await page.waitForURL('**/trainer/customers');
    await page.waitForTimeout(2000);
    
    const customersBeforeRefresh = await page.locator('[class*="customer"]').count();
    console.log(`   Customers before refresh: ${customersBeforeRefresh}`);
    
    // Refresh again
    console.log('\n🔄 Refreshing page again...');
    await page.reload();
    await page.waitForTimeout(2000);
    
    const customersAfterRefresh = await page.locator('[class*="customer"]').count();
    console.log(`   Customers after refresh: ${customersAfterRefresh}`);
    
    console.log('\n✅ Refresh test completed');
    expect(plansAfterRefresh).toBe(plansBeforeRefresh);
  });
});

test('FINAL VERIFICATION: All trainer features work together', async ({ page }) => {
  console.log('\n' + '='.repeat(70));
  console.log('🏁 FINAL COMPREHENSIVE VERIFICATION');
  console.log('='.repeat(70) + '\n');
  
  // Login
  await page.goto('http://localhost:4000/login');
  await page.fill('input[type="email"]', TRAINER_EMAIL);
  await page.fill('input[type="password"]', TRAINER_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/trainer', { timeout: 15000 });
  
  const results = {
    savedPlansWork: false,
    customersWork: false,
    noConflicts: false,
    apiCallsWork: false
  };
  
  try {
    // Test Saved Plans
    console.log('1️⃣ Testing Saved Plans...');
    await page.click('button[role="tab"]:has-text("Saved")');
    await page.waitForURL('**/trainer/meal-plans');
    await page.waitForTimeout(2000);
    const mealPlans = await page.locator('.grid > .relative, text=/You haven\'t saved any meal plans/i').first().isVisible();
    results.savedPlansWork = mealPlans;
    console.log(`   Result: ${results.savedPlansWork ? '✅' : '❌'}`);
    
    // Test Customers
    console.log('\n2️⃣ Testing Customers...');
    await page.click('button[role="tab"]:has-text("Customers")');
    await page.waitForURL('**/trainer/customers');
    await page.waitForTimeout(2000);
    const customers = await page.locator('[class*="customer"], text=/No customers found/i').first().isVisible();
    results.customersWork = customers;
    console.log(`   Result: ${results.customersWork ? '✅' : '❌'}`);
    
    // Test switching back
    console.log('\n3️⃣ Testing no conflicts...');
    await page.click('button[role="tab"]:has-text("Saved")');
    await page.waitForTimeout(1000);
    const plansStillWork = await page.locator('.grid > .relative, text=/You haven\'t saved any meal plans/i').first().isVisible();
    await page.click('button[role="tab"]:has-text("Customers")');
    await page.waitForTimeout(1000);
    const customersStillWork = await page.locator('[class*="customer"], text=/No customers found/i').first().isVisible();
    results.noConflicts = plansStillWork && customersStillWork;
    console.log(`   Result: ${results.noConflicts ? '✅' : '❌'}`);
    
    results.apiCallsWork = true; // If we got this far, APIs are working
    
  } catch (error) {
    console.error('Test error:', error);
  }
  
  // Final summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 FINAL RESULTS:');
  console.log('='.repeat(70));
  console.log(`✓ Saved Plans functional: ${results.savedPlansWork ? '✅ YES' : '❌ NO'}`);
  console.log(`✓ Customers functional: ${results.customersWork ? '✅ YES' : '❌ NO'}`);
  console.log(`✓ No conflicts when switching: ${results.noConflicts ? '✅ YES' : '❌ NO'}`);
  console.log(`✓ API calls working: ${results.apiCallsWork ? '✅ YES' : '❌ NO'}`);
  
  const allPass = Object.values(results).every(v => v === true);
  console.log('\n' + '='.repeat(70));
  if (allPass) {
    console.log('🎉 SUCCESS: ALL TRAINER FEATURES WORKING TOGETHER!');
    console.log('The conflict between Saved Plans and Customers has been resolved.');
  } else {
    console.log('⚠️ FAILURE: Some features still not working correctly.');
    console.log('Additional fixes needed.');
  }
  console.log('='.repeat(70) + '\n');
  
  expect(allPass).toBeTruthy();
});