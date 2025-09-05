import { test, expect } from '@playwright/test';

test('FINAL TEST: Trainer Features Working Together', async ({ page, context }) => {
  console.log('\n' + '='.repeat(70));
  console.log('🏁 FINAL COMPREHENSIVE TEST - SAVED PLANS & CUSTOMERS');
  console.log('='.repeat(70) + '\n');
  
  // Clear cookies to ensure fresh session
  await context.clearCookies();
  
  // Wait for rate limit to clear
  console.log('⏳ Waiting for rate limit to clear...');
  await page.waitForTimeout(5000);
  
  // Login
  console.log('🔐 Logging in as trainer...');
  await page.goto('http://localhost:4000');
  await page.waitForTimeout(1000);
  
  // Handle login page
  if (page.url().includes('/login')) {
    await page.fill('input[type="email"]', 'trainer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestTrainer123!');
    await page.click('button[type="submit"]');
    
    // Wait for navigation with longer timeout
    try {
      await page.waitForURL('**/trainer', { timeout: 30000 });
      console.log('✅ Successfully logged in\n');
    } catch (e) {
      console.log('⚠️ Login may have failed, continuing anyway...\n');
    }
  }
  
  // Ensure we're on the trainer page
  if (!page.url().includes('/trainer')) {
    await page.goto('http://localhost:4000/trainer');
    await page.waitForTimeout(2000);
  }
  
  const results = {
    savedPlansInitial: false,
    customersInitial: false,
    savedPlansAfterSwitch: false,
    customersAfterSwitch: false,
    apiCallsSavedPlans: 0,
    apiCallsCustomers: 0,
  };
  
  // Monitor API calls
  page.on('response', response => {
    if (response.url().includes('/api/trainer/meal-plans') && response.status() === 200) {
      results.apiCallsSavedPlans++;
    }
    if (response.url().includes('/api/trainer/customers') && response.status() === 200) {
      results.apiCallsCustomers++;
    }
  });
  
  // TEST 1: Navigate to Saved Plans
  console.log('📌 TEST 1: Navigating to Saved Plans tab...');
  try {
    const savedTab = page.locator('button[role="tab"]').filter({ hasText: /Saved/i }).first();
    await savedTab.click();
    await page.waitForURL('**/trainer/meal-plans', { timeout: 5000 });
    await page.waitForTimeout(2000);
    
    // Check for content
    const searchBar = await page.locator('input[placeholder*="Search meal plans"]').isVisible();
    const mealPlans = await page.locator('.grid > .relative').count();
    const emptyState = await page.locator('text=/You haven\'t saved any meal plans/').isVisible().catch(() => false);
    
    results.savedPlansInitial = searchBar && (mealPlans > 0 || emptyState);
    console.log(`   Search bar: ${searchBar}`);
    console.log(`   Meal plans: ${mealPlans}`);
    console.log(`   Empty state: ${emptyState}`);
    console.log(`   Result: ${results.savedPlansInitial ? '✅ PASS' : '❌ FAIL'}\n`);
  } catch (e) {
    console.log(`   Error: ${e.message}\n`);
  }
  
  // TEST 2: Navigate to Customers
  console.log('📌 TEST 2: Navigating to Customers tab...');
  try {
    const customersTab = page.locator('button[role="tab"]').filter({ hasText: /Customers/i }).first();
    await customersTab.click();
    await page.waitForURL('**/trainer/customers', { timeout: 5000 });
    await page.waitForTimeout(2000);
    
    // Check for content - look for any indication the component loaded
    const managementTitle = await page.locator('text="Customer Management"').isVisible().catch(() => false);
    const customerBadge = await page.locator('text=/\\d+ Customer/').isVisible().catch(() => false);
    const customerCards = await page.locator('.card').count();
    const emptyMessage = await page.locator('text=/No Customers Yet/').isVisible().catch(() => false);
    const searchInput = await page.locator('input[placeholder*="Search customers"]').isVisible().catch(() => false);
    
    results.customersInitial = managementTitle || customerBadge || customerCards > 0 || emptyMessage || searchInput;
    console.log(`   Management title: ${managementTitle}`);
    console.log(`   Customer badge: ${customerBadge}`);
    console.log(`   Customer cards: ${customerCards}`);
    console.log(`   Empty message: ${emptyMessage}`);
    console.log(`   Search input: ${searchInput}`);
    console.log(`   Result: ${results.customersInitial ? '✅ PASS' : '❌ FAIL'}\n`);
  } catch (e) {
    console.log(`   Error: ${e.message}\n`);
  }
  
  // TEST 3: Switch back to Saved Plans
  console.log('📌 TEST 3: Switching back to Saved Plans...');
  try {
    const savedTab = page.locator('button[role="tab"]').filter({ hasText: /Saved/i }).first();
    await savedTab.click();
    await page.waitForTimeout(2000);
    
    const searchBar = await page.locator('input[placeholder*="Search meal plans"]').isVisible();
    const mealPlans = await page.locator('.grid > .relative').count();
    
    results.savedPlansAfterSwitch = searchBar && mealPlans >= 0;
    console.log(`   Search bar: ${searchBar}`);
    console.log(`   Meal plans: ${mealPlans}`);
    console.log(`   Result: ${results.savedPlansAfterSwitch ? '✅ PASS' : '❌ FAIL'}\n`);
  } catch (e) {
    console.log(`   Error: ${e.message}\n`);
  }
  
  // TEST 4: Switch back to Customers
  console.log('📌 TEST 4: Switching back to Customers...');
  try {
    const customersTab = page.locator('button[role="tab"]').filter({ hasText: /Customers/i }).first();
    await customersTab.click();
    await page.waitForTimeout(2000);
    
    const managementTitle = await page.locator('text="Customer Management"').isVisible().catch(() => false);
    const customerBadge = await page.locator('text=/\\d+ Customer/').isVisible().catch(() => false);
    
    results.customersAfterSwitch = managementTitle || customerBadge;
    console.log(`   Management title: ${managementTitle}`);
    console.log(`   Customer badge: ${customerBadge}`);
    console.log(`   Result: ${results.customersAfterSwitch ? '✅ PASS' : '❌ FAIL'}\n`);
  } catch (e) {
    console.log(`   Error: ${e.message}\n`);
  }
  
  // FINAL SUMMARY
  console.log('=' .repeat(70));
  console.log('📊 FINAL TEST RESULTS:');
  console.log('=' .repeat(70));
  
  console.log(`\n✓ Saved Plans (Initial): ${results.savedPlansInitial ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`✓ Customers (Initial): ${results.customersInitial ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`✓ Saved Plans (After Switch): ${results.savedPlansAfterSwitch ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`✓ Customers (After Switch): ${results.customersAfterSwitch ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`✓ Saved Plans API Calls: ${results.apiCallsSavedPlans}`);
  console.log(`✓ Customers API Calls: ${results.apiCallsCustomers}`);
  
  const allPass = results.savedPlansInitial && results.customersInitial && 
                  results.savedPlansAfterSwitch && results.customersAfterSwitch;
  
  console.log('\n' + '=' .repeat(70));
  if (allPass) {
    console.log('🎉 SUCCESS! BOTH FEATURES WORK TOGETHER!');
    console.log('The conflict between Saved Plans and Customers has been resolved.');
    console.log('No logout/login cycle needed - everything works seamlessly.');
  } else {
    console.log('⚠️ ISSUE DETECTED - Some features still not working correctly.');
    if (!results.customersInitial || !results.customersAfterSwitch) {
      console.log('   → Customers feature needs additional fixes');
    }
    if (!results.savedPlansInitial || !results.savedPlansAfterSwitch) {
      console.log('   → Saved Plans feature needs additional fixes');
    }
  }
  console.log('=' .repeat(70) + '\n');
  
  // Take final screenshots
  await page.screenshot({ path: 'final-test-screenshot.png', fullPage: true });
  console.log('📸 Screenshot saved as final-test-screenshot.png\n');
  
  expect(allPass).toBeTruthy();
});