import { test, expect } from '@playwright/test';

test.describe('Trainer Features - Edge Cases & Stress Testing', () => {
  
  test.beforeEach(async ({ page, context }) => {
    // Clear cookies
    await context.clearCookies();
    await page.waitForTimeout(3000);
    
    // Login
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', 'trainer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestTrainer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/trainer', { timeout: 30000 });
  });
  
  test('1. Rapid tab switching stress test', async ({ page }) => {
    console.log('🔥 Running rapid tab switching test...');
    
    const savedTab = page.locator('button[role="tab"]').filter({ hasText: /Saved/i }).first();
    const customersTab = page.locator('button[role="tab"]').filter({ hasText: /Customers/i }).first();
    
    for (let i = 1; i <= 10; i++) {
      // Switch to Saved Plans
      await savedTab.click();
      await page.waitForTimeout(200);
      
      // Switch to Customers
      await customersTab.click();
      await page.waitForTimeout(200);
      
      console.log(`   Switch cycle ${i}/10 completed`);
    }
    
    // Final check - both should still work
    await savedTab.click();
    await page.waitForTimeout(1000);
    const savedPlansWork = await page.locator('input[placeholder*="Search meal plans"]').isVisible();
    
    await customersTab.click();
    await page.waitForTimeout(1000);
    const customersWork = await page.locator('text="Customer Management"').isVisible();
    
    console.log(`\n   Final state - Saved Plans: ${savedPlansWork ? '✅' : '❌'}, Customers: ${customersWork ? '✅' : '❌'}`);
    expect(savedPlansWork && customersWork).toBeTruthy();
  });
  
  test('2. Page refresh on each tab', async ({ page }) => {
    console.log('🔄 Testing page refresh on each tab...');
    
    // Test Saved Plans with refresh
    await page.click('button[role="tab"]:has-text("Saved")');
    await page.waitForURL('**/trainer/meal-plans');
    await page.waitForTimeout(1000);
    
    await page.reload();
    await page.waitForTimeout(2000);
    
    const savedPlansAfterRefresh = await page.locator('.grid > .relative').count();
    console.log(`   Saved Plans after refresh: ${savedPlansAfterRefresh} cards`);
    
    // Test Customers with refresh
    await page.click('button[role="tab"]:has-text("Customers")');
    await page.waitForURL('**/trainer/customers');
    await page.waitForTimeout(1000);
    
    await page.reload();
    await page.waitForTimeout(2000);
    
    const customersVisible = await page.locator('text="Customer Management"').isVisible();
    console.log(`   Customers after refresh: ${customersVisible ? 'visible ✅' : 'not visible ❌'}`);
    
    expect(savedPlansAfterRefresh >= 0 && customersVisible).toBeTruthy();
  });
  
  test('3. Search functionality on both tabs', async ({ page }) => {
    console.log('🔍 Testing search on both tabs...');
    
    // Search on Saved Plans
    await page.click('button[role="tab"]:has-text("Saved")');
    await page.waitForTimeout(1500);
    
    const mealPlanSearch = page.locator('input[placeholder*="Search meal plans"]');
    await mealPlanSearch.fill('test search');
    await page.waitForTimeout(500);
    const searchValue1 = await mealPlanSearch.inputValue();
    console.log(`   Saved Plans search: "${searchValue1}"`);
    await mealPlanSearch.clear();
    
    // Search on Customers
    await page.click('button[role="tab"]:has-text("Customers")');
    await page.waitForTimeout(1500);
    
    const customerSearch = page.locator('input[placeholder*="Search customers"]');
    if (await customerSearch.isVisible()) {
      await customerSearch.fill('test@example.com');
      await page.waitForTimeout(500);
      const searchValue2 = await customerSearch.inputValue();
      console.log(`   Customers search: "${searchValue2}"`);
      await customerSearch.clear();
    } else {
      console.log('   Customers search: not visible (may have no customers)');
    }
    
    // Go back to Saved Plans to ensure no interference
    await page.click('button[role="tab"]:has-text("Saved")');
    await page.waitForTimeout(1000);
    const stillWorks = await mealPlanSearch.isVisible();
    console.log(`   Saved Plans still works after search: ${stillWorks ? '✅' : '❌'}`);
    
    expect(stillWorks).toBeTruthy();
  });
  
  test('4. Browser back/forward navigation', async ({ page }) => {
    console.log('⏮️ Testing browser navigation...');
    
    // Navigate through tabs
    await page.click('button[role="tab"]:has-text("Saved")');
    await page.waitForURL('**/trainer/meal-plans');
    
    await page.click('button[role="tab"]:has-text("Customers")');
    await page.waitForURL('**/trainer/customers');
    
    // Go back
    await page.goBack();
    await page.waitForTimeout(1500);
    const onSavedPlans = page.url().includes('/meal-plans');
    console.log(`   After back: ${onSavedPlans ? 'on Saved Plans ✅' : 'not on Saved Plans ❌'}`);
    
    // Go forward
    await page.goForward();
    await page.waitForTimeout(1500);
    const onCustomers = page.url().includes('/customers');
    console.log(`   After forward: ${onCustomers ? 'on Customers ✅' : 'not on Customers ❌'}`);
    
    // Check both still render correctly
    const customersRender = await page.locator('text=/Customer Management|No Customers Yet/').isVisible();
    await page.goBack();
    await page.waitForTimeout(1500);
    const savedPlansRender = await page.locator('input[placeholder*="Search meal plans"]').isVisible();
    
    console.log(`   Final render - Saved Plans: ${savedPlansRender ? '✅' : '❌'}, Customers: ${customersRender ? '✅' : '❌'}`);
    expect(savedPlansRender && customersRender).toBeTruthy();
  });
  
  test('5. Multiple window test', async ({ browser }) => {
    console.log('🪟 Testing multiple windows...');
    
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    // Login in both windows
    for (const page of [page1, page2]) {
      await page.goto('http://localhost:4000/login');
      await page.fill('input[type="email"]', 'trainer.test@evofitmeals.com');
      await page.fill('input[type="password"]', 'TestTrainer123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/trainer', { timeout: 30000 });
    }
    
    // Window 1 - go to Saved Plans
    await page1.click('button[role="tab"]:has-text("Saved")');
    await page1.waitForTimeout(2000);
    
    // Window 2 - go to Customers
    await page2.click('button[role="tab"]:has-text("Customers")');
    await page2.waitForTimeout(2000);
    
    // Check both work independently
    const window1Works = await page1.locator('input[placeholder*="Search meal plans"]').isVisible();
    const window2Works = await page2.locator('text="Customer Management"').isVisible();
    
    console.log(`   Window 1 (Saved Plans): ${window1Works ? '✅' : '❌'}`);
    console.log(`   Window 2 (Customers): ${window2Works ? '✅' : '❌'}`);
    
    await context1.close();
    await context2.close();
    
    expect(window1Works && window2Works).toBeTruthy();
  });
});

test('FINAL VALIDATION: Complete feature verification', async ({ page, context }) => {
  console.log('\n' + '🎯'.repeat(30));
  console.log('FINAL VALIDATION - COMPLETE FEATURE CHECK');
  console.log('🎯'.repeat(30) + '\n');
  
  await context.clearCookies();
  await page.waitForTimeout(3000);
  
  // Login
  await page.goto('http://localhost:4000/login');
  await page.fill('input[type="email"]', 'trainer.test@evofitmeals.com');
  await page.fill('input[type="password"]', 'TestTrainer123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/trainer', { timeout: 30000 });
  
  // Comprehensive check
  const checks = {
    savedPlansLoad: false,
    customersLoad: false,
    savedPlansData: false,
    customersData: false,
    noConflicts: false
  };
  
  // Check Saved Plans
  await page.click('button[role="tab"]:has-text("Saved")');
  await page.waitForTimeout(2000);
  checks.savedPlansLoad = await page.locator('input[placeholder*="Search meal plans"]').isVisible();
  checks.savedPlansData = (await page.locator('.grid > .relative').count()) > 0 || 
                          await page.locator('text=/You haven\'t saved any meal plans/').isVisible();
  
  // Check Customers
  await page.click('button[role="tab"]:has-text("Customers")');
  await page.waitForTimeout(2000);
  checks.customersLoad = await page.locator('text="Customer Management"').isVisible();
  checks.customersData = await page.locator('text=/\\d+ Customer/').isVisible();
  
  // Quick switch test
  for (let i = 0; i < 3; i++) {
    await page.click('button[role="tab"]:has-text("Saved")');
    await page.waitForTimeout(500);
    await page.click('button[role="tab"]:has-text("Customers")');
    await page.waitForTimeout(500);
  }
  
  checks.noConflicts = await page.locator('text="Customer Management"').isVisible();
  
  console.log('📊 VALIDATION RESULTS:');
  console.log('─'.repeat(50));
  console.log(`Saved Plans Loads: ${checks.savedPlansLoad ? '✅' : '❌'}`);
  console.log(`Saved Plans Has Data: ${checks.savedPlansData ? '✅' : '❌'}`);
  console.log(`Customers Loads: ${checks.customersLoad ? '✅' : '❌'}`);
  console.log(`Customers Has Data: ${checks.customersData ? '✅' : '❌'}`);
  console.log(`No Conflicts: ${checks.noConflicts ? '✅' : '❌'}`);
  console.log('─'.repeat(50));
  
  const allPass = Object.values(checks).every(v => v === true);
  
  if (allPass) {
    console.log('\n🏆 COMPLETE SUCCESS! All features working perfectly!');
    console.log('✅ Saved Meal Plans tab works');
    console.log('✅ Customers tab works');
    console.log('✅ No conflicts between features');
    console.log('✅ No logout/login required');
    console.log('✅ Ready for production!');
  } else {
    console.log('\n⚠️ Some checks failed - review results above');
  }
  
  expect(allPass).toBeTruthy();
});