import { test, expect } from '@playwright/test';

test('Trainer Tabs - Saved Plans & Customers Working Together', async ({ page }) => {
  console.log('\n🧪 TESTING TRAINER FEATURES FIX\n');
  
  // Login
  console.log('📌 Logging in as trainer...');
  await page.goto('http://localhost:4000/login');
  await page.fill('input[type="email"]', 'trainer.test@evofitmeals.com');
  await page.fill('input[type="password"]', 'TestTrainer123!');
  await page.click('button[type="submit"]');
  
  // Wait for trainer page
  await page.waitForURL('**/trainer', { timeout: 15000 });
  console.log('✅ Login successful\n');
  
  // Test 1: Navigate to Saved Plans
  console.log('1️⃣ Testing Saved Plans tab...');
  
  // Click Saved Plans tab
  const savedPlansTab = page.locator('button[role="tab"]').filter({ hasText: /Saved/i }).first();
  await savedPlansTab.click();
  
  // Wait for navigation
  await page.waitForURL('**/trainer/meal-plans', { timeout: 5000 });
  await page.waitForTimeout(2000);
  
  // Check for content
  const searchBar = await page.locator('input[placeholder*="Search meal plans"]').isVisible();
  const mealPlanCards = await page.locator('.grid > .relative').count();
  const emptyState = await page.locator('text=/You haven\'t saved any meal plans yet/').isVisible().catch(() => false);
  
  console.log(`   - Search bar visible: ${searchBar}`);
  console.log(`   - Meal plan cards: ${mealPlanCards}`);
  console.log(`   - Empty state: ${emptyState}`);
  console.log(`   - Result: ${(searchBar && (mealPlanCards > 0 || emptyState)) ? '✅ WORKS' : '❌ BROKEN'}\n`);
  
  // Test 2: Navigate to Customers
  console.log('2️⃣ Testing Customers tab...');
  
  // Click Customers tab
  const customersTab = page.locator('button[role="tab"]').filter({ hasText: /Customers/i }).first();
  await customersTab.click();
  
  // Wait for navigation
  await page.waitForURL('**/trainer/customers', { timeout: 5000 });
  await page.waitForTimeout(2000);
  
  // Check for content
  const customerCards = await page.locator('.card', '.relative').count();
  const inviteButton = await page.locator('button').filter({ hasText: /Invite Customer/i }).isVisible().catch(() => false);
  const noCustomersText = await page.locator('text=/No customers found/').isVisible().catch(() => false);
  
  console.log(`   - Customer cards: ${customerCards}`);
  console.log(`   - Invite button visible: ${inviteButton}`);
  console.log(`   - No customers message: ${noCustomersText}`);
  console.log(`   - Result: ${(inviteButton || customerCards > 0 || noCustomersText) ? '✅ WORKS' : '❌ BROKEN'}\n`);
  
  // Test 3: Go back to Saved Plans
  console.log('3️⃣ Testing return to Saved Plans...');
  await savedPlansTab.click();
  await page.waitForTimeout(2000);
  
  const searchBarStillVisible = await page.locator('input[placeholder*="Search meal plans"]').isVisible();
  const mealPlanCardsStill = await page.locator('.grid > .relative').count();
  
  console.log(`   - Search bar still visible: ${searchBarStillVisible}`);
  console.log(`   - Meal plans still showing: ${mealPlanCardsStill}`);
  console.log(`   - Result: ${searchBarStillVisible ? '✅ WORKS' : '❌ BROKEN'}\n`);
  
  // Test 4: Go back to Customers
  console.log('4️⃣ Testing return to Customers...');
  await customersTab.click();
  await page.waitForTimeout(2000);
  
  const inviteButtonStillVisible = await page.locator('button').filter({ hasText: /Invite Customer/i }).isVisible().catch(() => false);
  const customerCardsStill = await page.locator('.card', '.relative').count();
  
  console.log(`   - Invite button still visible: ${inviteButtonStillVisible}`);
  console.log(`   - Customer elements still showing: ${customerCardsStill}`);
  console.log(`   - Result: ${inviteButtonStillVisible ? '✅ WORKS' : '❌ BROKEN'}\n`);
  
  // API Call Monitoring
  console.log('5️⃣ Monitoring API calls...');
  
  let savedPlansApiCalled = false;
  let customersApiCalled = false;
  
  page.on('response', response => {
    if (response.url().includes('/api/trainer/meal-plans')) {
      savedPlansApiCalled = true;
    }
    if (response.url().includes('/api/trainer/customers')) {
      customersApiCalled = true;
    }
  });
  
  // Trigger fresh API calls
  await page.reload();
  await page.waitForTimeout(3000);
  
  console.log(`   - Saved Plans API called: ${savedPlansApiCalled ? '✅' : '❌'}`);
  console.log(`   - Customers API called: ${customersApiCalled ? '✅' : '❌'}\n`);
  
  // Final Summary
  console.log('=' .repeat(60));
  console.log('📊 FINAL RESULTS:');
  console.log('=' .repeat(60));
  
  const savedPlansWorks = searchBarStillVisible && (mealPlanCardsStill > 0 || emptyState);
  const customersWorks = inviteButtonStillVisible || customerCardsStill > 0 || noCustomersText;
  
  console.log(`Saved Plans Feature: ${savedPlansWorks ? '✅ WORKING' : '❌ BROKEN'}`);
  console.log(`Customers Feature: ${customersWorks ? '✅ WORKING' : '❌ BROKEN'}`);
  console.log(`Both Work Together: ${savedPlansWorks && customersWorks ? '✅ YES' : '❌ NO'}\n`);
  
  if (savedPlansWorks && customersWorks) {
    console.log('🎉 SUCCESS! Both features work together without conflicts!');
  } else {
    console.log('⚠️ ISSUE REMAINS - Features still conflicting');
  }
  
  console.log('=' .repeat(60) + '\n');
  
  expect(savedPlansWorks && customersWorks).toBeTruthy();
});