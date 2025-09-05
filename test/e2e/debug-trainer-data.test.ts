import { test } from '@playwright/test';

test('Debug Trainer Data', async ({ page }) => {
  console.log('\n🔍 DEBUGGING TRAINER DATA\n');
  
  // Login
  await page.goto('http://localhost:4000/login');
  await page.fill('input[type="email"]', 'trainer.test@evofitmeals.com');
  await page.fill('input[type="password"]', 'TestTrainer123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/trainer', { timeout: 15000 });
  
  // Get authentication cookies
  const cookies = await page.context().cookies();
  const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
  
  // Make direct API calls to check data
  console.log('📡 Making API calls...\n');
  
  // 1. Check Saved Meal Plans
  const mealPlansResponse = await page.request.get('http://localhost:4000/api/trainer/meal-plans', {
    headers: { 'Cookie': cookieString }
  });
  
  if (mealPlansResponse.ok()) {
    const mealPlansData = await mealPlansResponse.json();
    console.log('✅ Saved Meal Plans API:');
    console.log(`   Total: ${mealPlansData.total}`);
    console.log(`   Plans:`, mealPlansData.mealPlans?.map(p => ({
      id: p.id,
      name: p.mealPlanData?.planName,
      created: p.createdAt
    })));
  } else {
    console.log('❌ Saved Meal Plans API failed:', mealPlansResponse.status());
  }
  
  console.log('');
  
  // 2. Check Customers
  const customersResponse = await page.request.get('http://localhost:4000/api/trainer/customers', {
    headers: { 'Cookie': cookieString }
  });
  
  if (customersResponse.ok()) {
    const customersData = await customersResponse.json();
    console.log('✅ Customers API:');
    console.log(`   Total: ${customersData.total}`);
    console.log(`   Customers:`, customersData.customers?.map(c => ({
      id: c.id,
      email: c.email,
      assigned: c.firstAssignedAt
    })));
  } else {
    console.log('❌ Customers API failed:', customersResponse.status());
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 DATA SUMMARY:');
  console.log('='.repeat(60));
  
  // Now navigate through the UI and see what displays
  console.log('\n🖥️ UI VERIFICATION:\n');
  
  // Check Saved Plans tab
  await page.click('button[role="tab"]:has-text("Saved")');
  await page.waitForURL('**/trainer/meal-plans');
  await page.waitForTimeout(2000);
  
  const mealPlanCards = await page.locator('.grid > .relative').count();
  const mealPlanEmpty = await page.locator('text=/You haven\'t saved any meal plans yet/').isVisible().catch(() => false);
  console.log(`Saved Plans UI: ${mealPlanCards} cards, empty state: ${mealPlanEmpty}`);
  
  // Check Customers tab
  await page.click('button[role="tab"]:has-text("Customers")');
  await page.waitForURL('**/trainer/customers');
  await page.waitForTimeout(2000);
  
  // Look for different possible customer UI elements
  const customerCards = await page.locator('.card').count();
  const customerEmptyTitle = await page.locator('text="No Customers Yet"').isVisible().catch(() => false);
  const customerEmptyMessage = await page.locator('text=/Start by assigning meal plans/').isVisible().catch(() => false);
  const inviteButton = await page.locator('button:has-text("Invite Customer")').isVisible().catch(() => false);
  const customerBadge = await page.locator('.badge, [class*="badge"]').filter({ hasText: /Customer/ }).isVisible().catch(() => false);
  
  console.log(`Customers UI:`);
  console.log(`  - Cards: ${customerCards}`);
  console.log(`  - Empty title: ${customerEmptyTitle}`);
  console.log(`  - Empty message: ${customerEmptyMessage}`);
  console.log(`  - Invite button: ${inviteButton}`);
  console.log(`  - Customer badge: ${customerBadge}`);
  
  // Take screenshots
  await page.screenshot({ path: 'customers-tab-debug.png', fullPage: true });
  console.log('\n📸 Screenshot saved as customers-tab-debug.png');
  
  // Check the actual HTML content
  const pageContent = await page.locator('body').innerHTML();
  if (pageContent.includes('Customer Management')) {
    console.log('✅ "Customer Management" text found in page');
  }
  if (pageContent.includes('0 Customer')) {
    console.log('✅ "0 Customer" badge found in page');
  }
});