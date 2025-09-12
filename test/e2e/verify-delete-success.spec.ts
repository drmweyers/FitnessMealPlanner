import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4000';

test.describe('✅ DELETE FUNCTIONALITY - 100% SUCCESS VERIFICATION', () => {
  test('🎯 Complete delete functionality works perfectly', async ({ page }) => {
    console.log('========================================');
    console.log('🚀 STARTING DELETE FUNCTIONALITY TEST');
    console.log('========================================\n');
    
    // Step 1: Login
    console.log('📌 Step 1: Logging in as customer...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.waitForTimeout(500);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/my-meal-plans', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    console.log('✅ Successfully logged in and navigated to My Meal Plans\n');
    
    // Step 2: Verify delete buttons exist
    console.log('📌 Step 2: Verifying delete buttons are rendered...');
    await page.waitForSelector('.group.hover\\:shadow-lg', { timeout: 10000 });
    
    const deleteButtons = await page.locator('button[aria-label="Delete meal plan"]').count();
    const mealPlanCards = await page.locator('.group.hover\\:shadow-lg').count();
    
    console.log(`✅ Found ${mealPlanCards} meal plan cards`);
    console.log(`✅ Found ${deleteButtons} delete buttons`);
    
    // Only customers should see delete buttons
    expect(deleteButtons).toBeGreaterThan(0);
    console.log('✅ Delete buttons are properly rendered for customer role\n');
    
    // Step 3: Test delete functionality
    if (mealPlanCards > 0) {
      console.log('📌 Step 3: Testing delete functionality...');
      
      const initialCount = mealPlanCards;
      const firstPlanName = await page.locator('.group.hover\\:shadow-lg h3').first().textContent();
      console.log(`   Initial meal plan count: ${initialCount}`);
      console.log(`   Attempting to delete: "${firstPlanName}"\n`);
      
      // Click delete button
      console.log('   🔄 Clicking delete button...');
      await page.locator('button[aria-label="Delete meal plan"]').first().click();
      
      // Verify confirmation dialog
      console.log('   🔄 Waiting for confirmation dialog...');
      await page.waitForSelector('[role="alertdialog"]', { timeout: 5000 });
      console.log('   ✅ Confirmation dialog appeared');
      
      // Verify dialog contains proper warning
      const dialogText = await page.locator('[role="alertdialog"]').textContent();
      expect(dialogText).toContain('Are you sure you want to delete');
      console.log('   ✅ Dialog shows proper delete warning\n');
      
      // Click Delete in dialog
      console.log('   🔄 Confirming deletion...');
      await page.locator('[role="alertdialog"] button').filter({ hasText: 'Delete' }).click();
      
      // Wait for API response
      const deleteResponse = await page.waitForResponse(
        response => response.url().includes('/api/meal-plan') && response.request().method() === 'DELETE',
        { timeout: 10000 }
      );
      
      console.log(`   ✅ Delete API response: ${deleteResponse.status()}`);
      expect(deleteResponse.status()).toBe(200);
      
      const responseBody = await deleteResponse.json();
      expect(responseBody.success).toBe(true);
      console.log(`   ✅ Server response: ${responseBody.message}`);
      console.log(`   ✅ Deleted meal plan ID: ${responseBody.deletedMealPlanId}\n`);
      
      // Wait for UI update
      await page.waitForTimeout(2000);
      
      // Verify count decreased
      const finalCount = await page.locator('.group.hover\\:shadow-lg').count();
      console.log(`   📊 Final meal plan count: ${finalCount}`);
      console.log(`   📊 Expected: ${initialCount - 1}`);
      
      expect(finalCount).toBe(initialCount - 1);
      console.log('   ✅ Meal plan count decreased by 1');
      console.log('   ✅ UI updated correctly after deletion\n');
      
      // Check for success toast (if exists)
      const toastVisible = await page.locator('[class*="toast"]').first().isVisible().catch(() => false);
      if (toastVisible) {
        const toastText = await page.locator('[class*="toast"]').first().textContent();
        console.log(`   ✅ Success toast displayed: "${toastText}"\n`);
      }
    }
    
    // Step 4: Test cancel functionality
    console.log('📌 Step 4: Testing cancel functionality...');
    const currentCount = await page.locator('.group.hover\\:shadow-lg').count();
    
    if (currentCount > 0) {
      // Click delete button
      await page.locator('button[aria-label="Delete meal plan"]').first().click();
      await page.waitForSelector('[role="alertdialog"]', { timeout: 5000 });
      
      // Click Cancel
      await page.locator('[role="alertdialog"] button').filter({ hasText: 'Cancel' }).click();
      console.log('   ✅ Clicked cancel button');
      
      // Verify dialog closed
      await expect(page.locator('[role="alertdialog"]')).not.toBeVisible();
      console.log('   ✅ Dialog closed after cancel');
      
      // Verify count unchanged
      const afterCancelCount = await page.locator('.group.hover\\:shadow-lg').count();
      expect(afterCancelCount).toBe(currentCount);
      console.log('   ✅ Meal plan count unchanged after cancel\n');
    }
    
    console.log('========================================');
    console.log('🎉 DELETE FUNCTIONALITY TEST COMPLETE');
    console.log('========================================');
    console.log('✅ All delete functionality works correctly:');
    console.log('   ✅ Delete buttons render for customers');
    console.log('   ✅ Confirmation dialog appears');
    console.log('   ✅ Delete API returns 200 status');
    console.log('   ✅ Meal plans are successfully deleted');
    console.log('   ✅ UI updates after deletion');
    console.log('   ✅ Cancel functionality works');
    console.log('\n🏆 100% SUCCESS CONFIRMED! 🏆');
  });
});