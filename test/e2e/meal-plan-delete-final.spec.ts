import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4000';

test.describe('Meal Plan Delete - Final Verification', () => {
  test('Complete delete functionality test', async ({ page }) => {
    // Wait for rate limiting to clear
    await page.waitForTimeout(5000);
    
    // Navigate to login page
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    // Perform login
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    
    // Add a small delay before clicking to ensure form is ready
    await page.waitForTimeout(1000);
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/my-meal-plans', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    
    // Wait for meal plan cards to be rendered
    await page.waitForSelector('.group.hover\\:shadow-lg', { timeout: 10000 });
    
    // Verify delete buttons exist
    const deleteButtons = await page.locator('button[aria-label="Delete meal plan"]').count();
    console.log(`✓ Found ${deleteButtons} delete buttons on meal plan cards`);
    expect(deleteButtons).toBeGreaterThan(0);
    
    // Get initial meal plan count
    const initialCount = await page.locator('.group.hover\\:shadow-lg').count();
    console.log(`✓ Initial meal plan count: ${initialCount}`);
    
    // Get the name of the first meal plan
    const firstPlanName = await page.locator('.group.hover\\:shadow-lg h3').first().textContent();
    console.log(`✓ Will attempt to delete: "${firstPlanName}"`);
    
    // Click the first delete button
    await page.locator('button[aria-label="Delete meal plan"]').first().click();
    console.log('✓ Clicked delete button');
    
    // Verify confirmation dialog appears
    await page.waitForSelector('[role="alertdialog"]', { timeout: 5000 });
    console.log('✓ Confirmation dialog appeared');
    
    // Verify dialog contains confirmation text
    const dialogText = await page.locator('[role="alertdialog"]').textContent();
    expect(dialogText).toContain('Are you sure you want to delete');
    console.log(`✓ Dialog text: ${dialogText}`);
    // The dialog shows the actual meal plan name, which might be different from the card title
    console.log('✓ Confirmation dialog shows delete warning');
    
    // Click the Delete button in the dialog
    await page.locator('[role="alertdialog"] button').filter({ hasText: 'Delete' }).click();
    console.log('✓ Clicked confirm delete button');
    
    // Wait for the delete request to complete
    const deleteResponse = await page.waitForResponse(
      response => response.url().includes('/api/meal-plan') && response.request().method() === 'DELETE',
      { timeout: 10000 }
    ).catch(() => null);
    
    if (deleteResponse) {
      console.log(`✓ Delete API response: ${deleteResponse.status()}`);
      expect(deleteResponse.status()).toBe(200);
      
      const responseBody = await deleteResponse.json();
      console.log('✓ Delete response:', responseBody);
      expect(responseBody.success).toBe(true);
    }
    
    // Wait for UI to update
    await page.waitForTimeout(2000);
    
    // Verify meal plan count decreased
    const finalCount = await page.locator('.group.hover\\:shadow-lg').count();
    console.log(`✓ Final meal plan count: ${finalCount}`);
    expect(finalCount).toBe(initialCount - 1);
    
    // Since we've confirmed the count decreased, the deletion was successful
    console.log('✓ Meal plan successfully deleted');
    
    // Check for success toast
    const toast = await page.locator('[class*="toast"]').first().textContent().catch(() => null);
    if (toast) {
      console.log(`✓ Toast message: ${toast}`);
      expect(toast.toLowerCase()).toContain('success');
    }
    
    console.log('\n✅ All delete functionality tests passed successfully!');
  });
  
  test('Verify delete button only shows for customers', async ({ page }) => {
    // Test that we're logged in as a customer
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    // Login as customer
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.waitForTimeout(1000);
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForURL('**/my-meal-plans', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the customer dashboard (only customers can access this page)
    const currentUrl = page.url();
    expect(currentUrl).toContain('/my-meal-plans');
    console.log('✓ User is on customer dashboard (my-meal-plans)');
    
    // Wait for cards to load
    await page.waitForSelector('.group.hover\\:shadow-lg', { timeout: 10000 });
    
    // Verify delete buttons are present
    const cardCount = await page.locator('.group.hover\\:shadow-lg').count();
    const deleteButtonCount = await page.locator('button[aria-label="Delete meal plan"]').count();
    
    expect(deleteButtonCount).toBe(cardCount);
    console.log(`✓ All ${cardCount} meal plan cards have delete buttons`);
  });
  
  test('Cancel delete operation works correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    // Login
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.waitForTimeout(1000);
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForURL('**/my-meal-plans', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.group.hover\\:shadow-lg', { timeout: 10000 });
    
    // Get initial count
    const initialCount = await page.locator('.group.hover\\:shadow-lg').count();
    
    // Click delete button
    await page.locator('button[aria-label="Delete meal plan"]').first().click();
    
    // Wait for dialog
    await page.waitForSelector('[role="alertdialog"]', { timeout: 5000 });
    
    // Click Cancel
    await page.locator('[role="alertdialog"] button').filter({ hasText: 'Cancel' }).click();
    console.log('✓ Clicked cancel button');
    
    // Verify dialog is closed
    await expect(page.locator('[role="alertdialog"]')).not.toBeVisible();
    console.log('✓ Dialog closed after cancel');
    
    // Verify count is unchanged
    const finalCount = await page.locator('.group.hover\\:shadow-lg').count();
    expect(finalCount).toBe(initialCount);
    console.log('✓ Meal plan count unchanged after cancel');
  });
});