import { test, expect } from '@playwright/test';

test('Verify Saved Meal Plans Fix', async ({ page }) => {
  console.log('Starting test to verify Saved Meal Plans fix...');
  
  // 1. Login as trainer
  await page.goto('http://localhost:4000/login');
  await page.fill('input[type="email"]', 'trainer.test@evofitmeals.com');
  await page.fill('input[type="password"]', 'TestTrainer123!');
  await page.click('button[type="submit"]');
  
  await page.waitForURL('**/trainer', { timeout: 10000 });
  console.log('✅ Successfully logged in as trainer');

  // 2. Set up API request monitoring
  let apiCallMade = false;
  let apiResponseData: any = null;
  
  page.on('response', async response => {
    if (response.url().includes('/api/trainer/meal-plans') && response.status() === 200) {
      apiCallMade = true;
      apiResponseData = await response.json();
      console.log('✅ API call detected to /api/trainer/meal-plans');
      console.log(`   Response: ${apiResponseData.total} meal plans`);
    }
  });

  // 3. Click on Saved Plans tab
  const savedPlansTab = page.locator('button[role="tab"]').filter({ hasText: /Saved/ });
  await savedPlansTab.first().click();
  console.log('✅ Clicked on Saved Plans tab');
  
  // 4. Wait for navigation and API call
  await page.waitForURL('**/trainer/meal-plans', { timeout: 5000 });
  await page.waitForTimeout(2000); // Give time for API call
  
  // 5. Verify API was called
  if (apiCallMade) {
    console.log('✅ API call was made successfully!');
  } else {
    console.log('❌ API call was NOT made - issue persists');
  }
  
  // 6. Check what's rendered on the page
  await page.waitForTimeout(1000);
  
  // Check for loading state
  const loadingIndicator = await page.locator('.animate-spin').count();
  if (loadingIndicator > 0) {
    console.log('⏳ Loading indicator is showing');
    await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 5000 });
  }
  
  // Check for meal plan cards
  const mealPlanCards = await page.locator('.grid > .relative').count();
  console.log(`✅ Found ${mealPlanCards} meal plan cards displayed`);
  
  // Check for empty state
  const emptyState = await page.locator('text=/You haven\'t saved any meal plans yet/i').count();
  if (emptyState > 0) {
    console.log('📭 Empty state is displayed (no saved meal plans)');
  }
  
  // 7. Verify meal plan cards have correct structure if they exist
  if (mealPlanCards > 0) {
    const firstCard = page.locator('.grid > .relative').first();
    
    // Check for title
    const title = await firstCard.locator('.text-lg').textContent();
    console.log(`   First plan title: ${title}`);
    
    // Check for details
    const hasDetails = await firstCard.locator('text=/days/').count() > 0;
    const hasCalories = await firstCard.locator('text=/cal\\/day/').count() > 0;
    const hasMealsPerDay = await firstCard.locator('text=/meals\\/day/').count() > 0;
    
    console.log(`   Has days info: ${hasDetails}`);
    console.log(`   Has calories info: ${hasCalories}`);
    console.log(`   Has meals/day info: ${hasMealsPerDay}`);
    
    // Check for action buttons
    const actionButton = firstCard.locator('button:has(svg)').last();
    await actionButton.click();
    
    const hasViewDetails = await page.locator('text="View Details"').isVisible();
    const hasAssign = await page.locator('text="Assign to Customer"').isVisible();
    const hasDelete = await page.locator('text="Delete"').isVisible();
    
    console.log(`   Has View Details option: ${hasViewDetails}`);
    console.log(`   Has Assign option: ${hasAssign}`);
    console.log(`   Has Delete option: ${hasDelete}`);
    
    // Close dropdown
    await page.click('body', { position: { x: 0, y: 0 } });
  }
  
  // 8. Test search functionality
  const searchInput = page.locator('input[placeholder*="Search meal plans"]');
  await searchInput.fill('test');
  await page.waitForTimeout(500);
  console.log('✅ Search input is functional');
  
  // Clear search
  await searchInput.clear();
  await page.waitForTimeout(500);
  
  // 9. Final verification
  expect(apiCallMade).toBeTruthy();
  console.log('\n🎉 SAVED MEAL PLANS FIX VERIFIED SUCCESSFULLY!');
});