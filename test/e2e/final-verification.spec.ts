import { test, expect } from '@playwright/test';

test('FINAL: Verify grocery lists are visible after all fixes', async ({ page }) => {
  test.setTimeout(60000);
  
  console.log('🚀 Starting final verification test...');
  
  // Login
  await page.goto('http://localhost:4000/login');
  await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
  await page.fill('input[type="password"]', 'TestCustomer123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  
  console.log('✅ Logged in as customer');
  
  // Navigate to customer page
  await page.goto('http://localhost:4000/customer');
  await page.waitForTimeout(2000);
  
  // Click Grocery tab
  const groceryTab = page.locator('button:has-text("Grocery")').first();
  await groceryTab.click();
  console.log('✅ Clicked Grocery tab');
  await page.waitForTimeout(3000);
  
  // Check for error console messages
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  // Take screenshot
  await page.screenshot({ path: 'final-verification.png', fullPage: true });
  
  // Check what's visible
  const results = {
    loadingText: await page.locator('text=Loading your grocery lists').count(),
    emptyState: await page.locator('text=Create your first grocery list').count(),
    mealPlanList: await page.locator('text=Meal Plan Grocery List').count(),
    groceryHeader: await page.locator('text=Grocery Lists').count(),
    anyButtons: await page.locator('button.w-full.justify-between').count(),
    anyListItems: await page.locator('[class*="grocery-item"]').count(),
  };
  
  console.log('\n📊 === FINAL RESULTS ===');
  console.log('Loading text count:', results.loadingText);
  console.log('Empty state count:', results.emptyState);
  console.log('Meal Plan List count:', results.mealPlanList);
  console.log('Grocery header count:', results.groceryHeader);
  console.log('List buttons count:', results.anyButtons);
  console.log('Grocery items count:', results.anyListItems);
  console.log('JavaScript errors:', errors.length);
  
  // Success criteria
  if (results.mealPlanList > 0 || results.anyListItems > 0) {
    console.log('\n🎉 SUCCESS! Grocery lists are FINALLY VISIBLE!');
    expect(true).toBe(true);
  } else if (results.emptyState > 0) {
    console.log('\n❌ FAILURE: Still showing empty state');
    throw new Error('Bug persists after 4 attempts');
  } else {
    console.log('\n⚠️ UNKNOWN STATE: Page may be blank or loading');
    throw new Error('Unknown state - check screenshot');
  }
});
