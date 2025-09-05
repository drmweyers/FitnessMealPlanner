import { test, expect } from '@playwright/test';

test('Diagnose Saved Meal Plans Issue', async ({ page }) => {
  // 1. Login as trainer
  await page.goto('http://localhost:4000/login');
  await page.fill('input[type="email"]', 'trainer.test@evofitmeals.com');
  await page.fill('input[type="password"]', 'TestTrainer123!');
  await page.click('button[type="submit"]');
  
  // Wait for redirect to trainer page
  await page.waitForURL('**/trainer', { timeout: 10000 });
  console.log('✓ Successfully logged in as trainer');

  // 2. Check if Saved Plans tab exists
  const savedPlansTab = page.locator('button[role="tab"]').filter({ hasText: /Saved/ });
  const tabExists = await savedPlansTab.count() > 0;
  console.log(`✓ Saved Plans tab exists: ${tabExists}`);
  
  if (tabExists) {
    // 3. Click on Saved Plans tab
    await savedPlansTab.first().click();
    console.log('✓ Clicked on Saved Plans tab');
    
    // 4. Check URL change
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    console.log(`✓ Current URL: ${currentUrl}`);
    
    // 5. Monitor API calls
    const apiCallPromise = page.waitForResponse(
      response => response.url().includes('/api/trainer/meal-plans'),
      { timeout: 5000 }
    ).catch(e => null);
    
    const apiResponse = await apiCallPromise;
    if (apiResponse) {
      const status = apiResponse.status();
      const data = await apiResponse.json();
      console.log(`✓ API Response Status: ${status}`);
      console.log(`✓ API Response Data:`, JSON.stringify(data, null, 2));
    } else {
      console.log('✗ No API call to /api/trainer/meal-plans detected');
    }
    
    // 6. Check what's actually rendered
    await page.waitForTimeout(2000);
    
    // Check for loading state
    const loadingIndicator = page.locator('.animate-spin');
    const hasLoading = await loadingIndicator.count() > 0;
    console.log(`Loading indicator present: ${hasLoading}`);
    
    // Check for error state
    const errorMessage = page.locator('text=/Error loading meal plans/i');
    const hasError = await errorMessage.count() > 0;
    console.log(`Error message present: ${hasError}`);
    
    // Check for empty state
    const emptyMessage = page.locator('text=/You haven\'t saved any meal plans yet/i');
    const hasEmpty = await emptyMessage.count() > 0;
    console.log(`Empty state present: ${hasEmpty}`);
    
    // Check for meal plan cards
    const mealPlanCards = page.locator('.grid > .relative, [class*="Card"]');
    const cardCount = await mealPlanCards.count();
    console.log(`Meal plan cards found: ${cardCount}`);
    
    // 7. Check if TrainerMealPlans component is rendered
    const componentWrapper = page.locator('.space-y-6').first();
    const hasComponent = await componentWrapper.count() > 0;
    console.log(`TrainerMealPlans component wrapper found: ${hasComponent}`);
    
    // 8. Take a screenshot for visual debugging
    await page.screenshot({ path: 'saved-plans-debug.png', fullPage: true });
    console.log('✓ Screenshot saved as saved-plans-debug.png');
    
    // 9. Check console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`Browser console error: ${msg.text()}`);
      }
    });
    
    // 10. Make a direct API call with authentication
    const cookies = await page.context().cookies();
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    const directApiResponse = await page.request.get('http://localhost:4000/api/trainer/meal-plans', {
      headers: { 'Cookie': cookieString }
    });
    
    if (directApiResponse.ok()) {
      const apiData = await directApiResponse.json();
      console.log('✓ Direct API call successful');
      console.log(`  - Total meal plans: ${apiData.total}`);
      console.log(`  - Meal plans array length: ${apiData.mealPlans?.length || 0}`);
    } else {
      console.log(`✗ Direct API call failed with status: ${directApiResponse.status()}`);
    }
  } else {
    console.log('✗ Saved Plans tab not found!');
  }
  
  // Final assertion to make test pass/fail
  expect(tabExists).toBeTruthy();
});