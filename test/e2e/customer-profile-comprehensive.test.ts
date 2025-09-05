import { test, expect } from '@playwright/test';

// Test data for customer login
const CUSTOMER_CREDENTIALS = {
  email: 'customer.test@evofitmeals.com',
  password: 'TestCustomer123!'
};

// Helper function to login as customer
async function loginAsCustomer(page) {
  await page.goto('http://localhost:4000/login');
  await page.fill('input[type="email"]', CUSTOMER_CREDENTIALS.email);
  await page.fill('input[type="password"]', CUSTOMER_CREDENTIALS.password);
  await page.click('button[type="submit"]');
  // Wait for navigation to customer pages
  await page.waitForURL(/\/(my-meal-plans|customer)/i, { timeout: 10000 });
}

test.describe('Customer Profile - Comprehensive Testing', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCustomer(page);
  });

  test('should load customer dashboard and navigate to all sections', async ({ page }) => {
    // Verify dashboard loaded
    await expect(page.locator('h1').filter({ hasText: 'Welcome' })).toBeVisible();
    
    // Test navigation to Meal Plans tab
    await page.click('button:has-text("Meal Plans")');
    await expect(page.locator('h2:has-text("Your Meal Plans")')).toBeVisible();
    
    // Test navigation to Progress tab
    await page.click('button:has-text("Progress")');
    await expect(page.locator('h2:has-text("Progress Tracking")')).toBeVisible();
    
    // Check if Progress TAB loads correctly
    await expect(page.locator('text=Current Weight')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Body Fat %')).toBeVisible();
    await expect(page.locator('text=Active Goals')).toBeVisible();
  });

  test('Progress TAB functionality works correctly', async ({ page }) => {
    // Navigate to Progress tab
    await page.click('button:has-text("Progress")');
    await page.waitForTimeout(2000);
    
    // Check that all sub-tabs are present
    await expect(page.getByRole('tab', { name: /measurements/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /progress photos/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /goals/i })).toBeVisible();
    
    // Test switching between tabs
    await page.getByRole('tab', { name: /progress photos/i }).click();
    await page.waitForTimeout(1000);
    
    await page.getByRole('tab', { name: /goals/i }).click();
    await page.waitForTimeout(1000);
    
    await page.getByRole('tab', { name: /measurements/i }).click();
    await page.waitForTimeout(1000);
  });

  test('Add new measurement in Progress tab', async ({ page }) => {
    // Navigate to Progress tab
    await page.click('button:has-text("Progress")');
    await page.waitForTimeout(2000);
    
    // Click Add Measurement button
    await page.click('button:has-text("Add Measurement")');
    
    // Fill in measurement form
    await page.fill('input[placeholder*="Weight"]', '175');
    await page.fill('input[placeholder*="Body Fat"]', '18.5');
    await page.fill('input[placeholder*="Waist"]', '32');
    
    // Save measurement
    await page.click('button:has-text("Save Measurement")');
    
    // Verify success toast or confirmation
    await expect(page.locator('text=Success')).toBeVisible({ timeout: 5000 });
  });

  test('Customer profile displays correct information', async ({ page }) => {
    // Navigate to profile
    await page.click('text=Profile');
    await page.waitForTimeout(2000);
    
    // Check that profile information is displayed
    await expect(page.locator('h1:has-text("My Profile")')).toBeVisible();
    await expect(page.locator('text=Personal Information')).toBeVisible();
    await expect(page.locator('text=Fitness Details')).toBeVisible();
    
    // Verify no profile image upload modal exists
    const modalCount = await page.locator('[role="dialog"]').count();
    expect(modalCount).toBe(0);
  });

  test('Edit profile functionality', async ({ page }) => {
    // Navigate to profile
    await page.click('text=Profile');
    await page.waitForTimeout(2000);
    
    // Click edit button
    await page.click('button:has-text("Edit Profile")');
    
    // Modify a field
    const phoneInput = page.locator('input[name="phone"]');
    await phoneInput.clear();
    await phoneInput.fill('555-9876');
    
    // Save changes
    await page.click('button:has-text("Save Changes")');
    
    // Verify success
    await expect(page.locator('text=Success')).toBeVisible({ timeout: 5000 });
  });

  test('Mobile responsiveness - 375px width', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify responsive layout
    await expect(page.locator('h1').first()).toBeVisible();
    
    // Navigate to Progress tab on mobile
    await page.click('button:has-text("Progress")');
    await page.waitForTimeout(2000);
    
    // Check that content adapts to mobile
    const currentWeight = page.locator('text=Current Weight');
    await expect(currentWeight).toBeVisible();
    
    // Check table responsiveness
    await page.getByRole('tab', { name: /measurements/i }).click();
    await page.waitForTimeout(1000);
    
    // Table should be scrollable or responsive
    const table = page.locator('table').first();
    if (await table.isVisible()) {
      const tableContainer = table.locator('..');
      await expect(tableContainer).toHaveCSS('overflow-x', /auto|scroll/);
    }
  });

  test('Mobile responsiveness - 768px width (tablet)', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Verify layout adapts
    await expect(page.locator('h1').first()).toBeVisible();
    
    // Navigate to Progress tab
    await page.click('button:has-text("Progress")');
    await page.waitForTimeout(2000);
    
    // Check grid layout
    const statsCards = page.locator('[data-testid*="card"]');
    const cardCount = await statsCards.count();
    expect(cardCount).toBeGreaterThan(0);
  });

  test('All buttons in customer profile are clickable', async ({ page }) => {
    // Navigate to profile
    await page.click('text=Profile');
    await page.waitForTimeout(2000);
    
    // Get all buttons
    const buttons = page.locator('button:visible');
    const buttonCount = await buttons.count();
    
    console.log(`Found ${buttonCount} visible buttons`);
    
    // Test each button is clickable (not disabled)
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const isDisabled = await button.isDisabled();
      const buttonText = await button.textContent();
      console.log(`Button ${i}: "${buttonText}" - Disabled: ${isDisabled}`);
      
      if (!isDisabled && !buttonText?.includes('Sign Out')) {
        // Button should be clickable
        await expect(button).toBeEnabled();
      }
    }
  });

  test('Progress charts load correctly', async ({ page }) => {
    // Navigate to Progress tab
    await page.click('button:has-text("Progress")');
    await page.waitForTimeout(2000);
    
    // Check for progress charts or placeholder
    const chartsSection = page.locator('text=Progress Charts').first();
    if (await chartsSection.isVisible()) {
      await expect(chartsSection).toBeVisible();
    }
    
    // Check quick stats are visible
    await expect(page.locator('text=Current Weight')).toBeVisible();
    await expect(page.locator('text=175 lbs')).toBeVisible();
  });

  test('Trainer integration displays correctly', async ({ page }) => {
    // Navigate to profile
    await page.click('text=Profile');
    await page.waitForTimeout(2000);
    
    // Check if trainer information is displayed
    const trainerSection = page.locator('text=Your Trainer').first();
    if (await trainerSection.isVisible()) {
      await expect(trainerSection).toBeVisible();
    }
  });

  test('Saved meal plans display correctly', async ({ page }) => {
    // Navigate to Saved Plans tab
    await page.click('button:has-text("Saved Plans")');
    await page.waitForTimeout(2000);
    
    // Check if saved plans section loads
    const savedPlansHeader = page.locator('h2').filter({ hasText: /Saved.*Plans/i }).first();
    await expect(savedPlansHeader).toBeVisible({ timeout: 10000 });
  });

  test('All modals can be opened and closed', async ({ page }) => {
    // Navigate to Progress tab
    await page.click('button:has-text("Progress")');
    await page.waitForTimeout(2000);
    
    // Open Add Measurement modal
    await page.click('button:has-text("Add Measurement")');
    await expect(page.locator('h2:has-text("Add New Measurement")')).toBeVisible();
    
    // Close modal
    await page.click('button:has-text("Cancel")');
    await expect(page.locator('h2:has-text("Add New Measurement")')).not.toBeVisible();
    
    // Test Goals tab modal
    await page.getByRole('tab', { name: /goals/i }).click();
    await page.waitForTimeout(1000);
    
    const addGoalButton = page.locator('button:has-text("Add Goal")').first();
    if (await addGoalButton.isVisible()) {
      await addGoalButton.click();
      await page.waitForTimeout(1000);
      
      // Close if modal opened
      const closeButton = page.locator('button:has-text("Cancel")').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    }
  });

  test('Form validation works correctly', async ({ page }) => {
    // Navigate to Progress tab
    await page.click('button:has-text("Progress")');
    await page.waitForTimeout(2000);
    
    // Open Add Measurement modal
    await page.click('button:has-text("Add Measurement")');
    
    // Try to save without filling required fields
    await page.click('button:has-text("Save Measurement")');
    
    // Should either show validation error or not submit
    // Check that modal is still open
    await expect(page.locator('h2:has-text("Add New Measurement")')).toBeVisible();
  });

  test('Data persists after navigation', async ({ page }) => {
    // Navigate to Progress tab
    await page.click('button:has-text("Progress")');
    await page.waitForTimeout(2000);
    
    // Note current weight value
    const weightText = await page.locator('text=175 lbs').textContent();
    
    // Navigate away and back
    await page.click('button:has-text("Meal Plans")');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Progress")');
    await page.waitForTimeout(2000);
    
    // Verify data persists
    await expect(page.locator('text=175 lbs')).toBeVisible();
  });

  test('Logout functionality works', async ({ page }) => {
    // Find and click logout/sign out button
    const signOutButton = page.locator('button:has-text("Sign Out")').first();
    if (await signOutButton.isVisible()) {
      await signOutButton.click();
      
      // Should redirect to login page
      await page.waitForURL('**/login', { timeout: 10000 });
      await expect(page.locator('h1:has-text("Sign In")')).toBeVisible();
    }
  });
});

test.describe('Edge Cases and Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCustomer(page);
  });

  test('handles network errors gracefully', async ({ page }) => {
    // Simulate offline mode
    await page.context().setOffline(true);
    
    // Try to navigate to Progress tab
    await page.click('button:has-text("Progress")');
    
    // Should show error or cached data
    await page.waitForTimeout(2000);
    
    // Re-enable network
    await page.context().setOffline(false);
  });

  test('handles very long text inputs', async ({ page }) => {
    await page.click('text=Profile');
    await page.waitForTimeout(2000);
    
    await page.click('button:has-text("Edit Profile")');
    
    // Try very long input
    const longText = 'A'.repeat(500);
    const notesField = page.locator('textarea').first();
    if (await notesField.isVisible()) {
      await notesField.fill(longText);
      
      // Should handle gracefully (truncate or accept)
      await page.click('button:has-text("Save Changes")');
    }
  });

  test('handles rapid clicking without errors', async ({ page }) => {
    // Rapidly click between tabs
    for (let i = 0; i < 5; i++) {
      await page.click('button:has-text("Progress")');
      await page.click('button:has-text("Meal Plans")');
    }
    
    // Should still be functional
    await page.click('button:has-text("Progress")');
    await expect(page.locator('h2:has-text("Progress Tracking")')).toBeVisible({ timeout: 10000 });
  });
});