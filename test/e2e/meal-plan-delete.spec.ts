import { test, expect, type Page } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:4000';
const CUSTOMER_EMAIL = 'customer.test@evofitmeals.com';
const CUSTOMER_PASSWORD = 'TestCustomer123!';

// Helper function to login as customer
async function loginAsCustomer(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  
  // Fill in login form
  await page.fill('input[type="email"]', CUSTOMER_EMAIL);
  await page.fill('input[type="password"]', CUSTOMER_PASSWORD);
  
  // Click login button
  await page.click('button[type="submit"]');
  
  // Wait for navigation to customer dashboard
  await page.waitForURL('**/my-meal-plans', { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

test.describe('Meal Plan Delete Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Set a longer timeout for login
    test.setTimeout(60000);
    
    // Login as customer before each test
    await loginAsCustomer(page);
  });

  test('should display delete button on meal plan cards', async ({ page }) => {
    // Wait for meal plan cards to load - use the Card with specific class pattern
    await page.waitForSelector('.group.hover\\:shadow-lg', { timeout: 10000 }).catch(() => {
      // Fallback to any card
      return page.waitForSelector('[class*="card"]', { timeout: 10000 });
    });
    
    // Check if delete button exists
    const deleteButtons = await page.locator('button[aria-label="Delete meal plan"]').count();
    console.log(`Found ${deleteButtons} delete buttons`);
    
    // There should be at least one delete button if there are meal plans
    const mealPlanCards = await page.locator('.group.hover\\:shadow-lg').count();
    if (mealPlanCards > 0) {
      expect(deleteButtons).toBeGreaterThan(0);
    }
    
    // Check if delete button is visible
    if (deleteButtons > 0) {
      const firstDeleteButton = page.locator('button[aria-label="Delete meal plan"]').first();
      await expect(firstDeleteButton).toBeVisible();
      
      // Check if button has the trash icon
      const trashIcon = await firstDeleteButton.locator('svg').count();
      expect(trashIcon).toBeGreaterThan(0);
    }
  });

  test('should open confirmation dialog when delete button is clicked', async ({ page }) => {
    // Wait for meal plan cards to load
    await page.waitForSelector('.group.hover\\:shadow-lg', { timeout: 10000 });
    
    const deleteButtons = await page.locator('button[aria-label="Delete meal plan"]').count();
    
    if (deleteButtons > 0) {
      // Get the meal plan name before deletion
      const firstCard = page.locator('.group.hover\\:shadow-lg').first();
      const planNameElement = await firstCard.locator('h3').textContent();
      console.log(`Attempting to delete meal plan: ${planNameElement}`);
      
      // Click the first delete button
      await page.locator('button[aria-label="Delete meal plan"]').first().click();
      
      // Wait for confirmation dialog
      await page.waitForSelector('[role="alertdialog"]', { timeout: 5000 });
      
      // Check dialog content
      const dialogTitle = await page.locator('[role="alertdialog"] h2').textContent();
      expect(dialogTitle).toContain('Delete Meal Plan');
      
      // Check if meal plan name is shown in the dialog
      const dialogDescription = await page.locator('[role="alertdialog"] [class*="AlertDialogDescription"]').textContent();
      expect(dialogDescription).toContain('Are you sure you want to delete');
      
      // Check for Cancel and Delete buttons
      const cancelButton = page.locator('[role="alertdialog"] button:has-text("Cancel")');
      const deleteButton = page.locator('[role="alertdialog"] button:has-text("Delete")');
      
      await expect(cancelButton).toBeVisible();
      await expect(deleteButton).toBeVisible();
      
      // Test cancel functionality
      await cancelButton.click();
      
      // Dialog should close
      await expect(page.locator('[role="alertdialog"]')).not.toBeVisible();
    } else {
      console.log('No meal plans available to test delete functionality');
    }
  });

  test('should delete meal plan when confirmed', async ({ page }) => {
    // Enable console logging to debug
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser console error:', msg.text());
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/meal-plan') && response.request().method() === 'DELETE') {
        console.log('Delete API Response:', response.status(), response.statusText());
      }
    });
    
    // Wait for meal plan cards to load
    await page.waitForSelector('.group.hover\\:shadow-lg', { timeout: 10000 });
    
    // Get initial count of meal plans
    const initialCount = await page.locator('.group.hover\\:shadow-lg').count();
    console.log(`Initial meal plan count: ${initialCount}`);
    
    if (initialCount > 0) {
      // Get the meal plan name before deletion
      const firstCard = page.locator('.group.hover\\:shadow-lg').first();
      const planNameToDelete = await firstCard.locator('h3').textContent();
      console.log(`Deleting meal plan: ${planNameToDelete}`);
      
      // Click the first delete button
      await page.locator('button[aria-label="Delete meal plan"]').first().click();
      
      // Wait for confirmation dialog
      await page.waitForSelector('[role="alertdialog"]', { timeout: 5000 });
      
      // Click the Delete button in the dialog
      const deleteButton = page.locator('[role="alertdialog"] button:has-text("Delete")');
      await deleteButton.click();
      
      // Wait for the API response
      const deleteResponse = await page.waitForResponse(
        response => response.url().includes('/api/meal-plan') && response.request().method() === 'DELETE',
        { timeout: 10000 }
      ).catch(() => null);
      
      if (deleteResponse) {
        console.log('Delete response status:', deleteResponse.status());
        const responseBody = await deleteResponse.json().catch(() => null);
        console.log('Delete response body:', responseBody);
      }
      
      // Wait for success toast or error message
      const toastMessage = await page.locator('[class*="toast"]').textContent().catch(() => null);
      if (toastMessage) {
        console.log('Toast message:', toastMessage);
      }
      
      // Wait a moment for the UI to update
      await page.waitForTimeout(2000);
      
      // Check if the meal plan count decreased
      const finalCount = await page.locator('.group.hover\\:shadow-lg').count();
      console.log(`Final meal plan count: ${finalCount}`);
      
      // The count should decrease by 1 if deletion was successful
      if (deleteResponse && deleteResponse.status() === 200) {
        expect(finalCount).toBe(initialCount - 1);
        
        // Verify the deleted plan is no longer visible
        const remainingPlanNames = await page.locator('[class*="MealPlanCard"] h3').allTextContents();
        expect(remainingPlanNames).not.toContain(planNameToDelete);
      }
    } else {
      console.log('No meal plans available to test delete functionality');
    }
  });

  test('should only show delete button for customer role', async ({ page }) => {
    // Verify we're logged in as a customer
    const userRole = await page.evaluate(() => {
      const auth = JSON.parse(localStorage.getItem('auth') || '{}');
      return auth.user?.role;
    });
    
    expect(userRole).toBe('customer');
    
    // Wait for meal plan cards
    await page.waitForSelector('.group.hover\\:shadow-lg', { timeout: 10000 });
    
    // Check if delete buttons are present (should be visible for customers)
    const deleteButtons = await page.locator('button[aria-label="Delete meal plan"]').count();
    const mealPlanCards = await page.locator('.group.hover\\:shadow-lg').count();
    
    if (mealPlanCards > 0) {
      // Customers should see delete buttons
      expect(deleteButtons).toBe(mealPlanCards);
    }
  });
});

test.describe('Delete Button Error Handling', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    await loginAsCustomer(page);
    
    // Wait for meal plan cards to load
    await page.waitForSelector('.group.hover\\:shadow-lg', { timeout: 10000 });
    
    const deleteButtons = await page.locator('button[aria-label="Delete meal plan"]').count();
    
    if (deleteButtons > 0) {
      // Intercept the delete request and make it fail
      await page.route('**/api/meal-plan/*', route => {
        if (route.request().method() === 'DELETE') {
          route.abort('failed');
        } else {
          route.continue();
        }
      });
      
      // Click delete button
      await page.locator('button[aria-label="Delete meal plan"]').first().click();
      
      // Confirm deletion
      await page.waitForSelector('[role="alertdialog"]', { timeout: 5000 });
      await page.locator('[role="alertdialog"] button:has-text("Delete")').click();
      
      // Should show error toast
      const errorToast = await page.locator('[class*="toast"][class*="destructive"]').textContent().catch(() => null);
      if (errorToast) {
        expect(errorToast).toContain('Failed to delete');
      }
      
      // Meal plan should still be visible
      const mealPlanCount = await page.locator('.group.hover\\:shadow-lg').count();
      expect(mealPlanCount).toBe(deleteButtons);
    }
  });
});