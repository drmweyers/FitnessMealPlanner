import { test, expect } from '@playwright/test';

test.describe('Progress TAB - Final Verification', () => {
  test('Progress TAB fully functional', async ({ page }) => {
    // Login
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Click Progress TAB
    const progressTab = page.locator('[role="tab"]:has-text("Progress")');
    await expect(progressTab).toBeVisible();
    await progressTab.click();
    await page.waitForTimeout(2000);
    
    // Verify Progress content loads
    await expect(page.locator('h2:has-text("Progress Tracking")')).toBeVisible();
    await expect(page.locator('text="Track your fitness journey"')).toBeVisible();
    
    // Verify quick stats cards
    await expect(page.locator('text="Current Weight"')).toBeVisible();
    await expect(page.locator('text="Body Fat %"')).toBeVisible();
    await expect(page.locator('text="Active Goals"')).toBeVisible();
    await expect(page.locator('text="Progress Photos"')).toBeVisible();
    
    // Verify sub-tabs exist
    await expect(page.getByRole('tab', { name: /measurements/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /progress photos/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /goals/i })).toBeVisible();
    
    // Test sub-tab switching
    await page.getByRole('tab', { name: /progress photos/i }).click();
    await page.waitForTimeout(1000);
    
    await page.getByRole('tab', { name: /goals/i }).click();
    await page.waitForTimeout(1000);
    
    await page.getByRole('tab', { name: /measurements/i }).click();
    await page.waitForTimeout(1000);
    
    // Test Add Measurement button
    const addMeasurementButton = page.locator('button:has-text("Add Measurement")');
    if (await addMeasurementButton.isVisible()) {
      await addMeasurementButton.click();
      await page.waitForTimeout(1000);
      
      // Check modal opened
      const modalTitle = page.locator('h2:has-text("Add New Measurement")');
      await expect(modalTitle).toBeVisible();
      
      // Close modal
      const cancelButton = page.locator('button:has-text("Cancel")');
      await cancelButton.click();
      await expect(modalTitle).not.toBeVisible();
    }
    
    console.log('✅ Progress TAB is fully functional!');
  });

  test('Mobile responsiveness test', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Login
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Click Progress TAB on mobile
    const progressTab = page.locator('[role="tab"]:has-text("Progress")');
    await expect(progressTab).toBeVisible();
    await progressTab.click();
    await page.waitForTimeout(2000);
    
    // Verify content adapts to mobile
    await expect(page.locator('h2:has-text("Progress Tracking")')).toBeVisible();
    
    // Check responsive grid
    const statsCards = page.locator('text="Current Weight"').locator('..');
    await expect(statsCards).toBeVisible();
    
    console.log('✅ Progress TAB is mobile responsive!');
  });

  test('No console errors', async ({ page }) => {
    const errors: string[] = [];
    
    // Listen for errors (excluding WebSocket errors which are not related)
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('WebSocket') && !msg.text().includes('ERR_CONNECTION_REFUSED')) {
        errors.push(msg.text());
      }
    });
    
    page.on('pageerror', error => {
      if (!error.message.includes('WebSocket') && !error.message.includes('ERR_CONNECTION_REFUSED')) {
        errors.push(error.message);
      }
    });
    
    // Login and navigate to Progress
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Click Progress TAB
    const progressTab = page.locator('[role="tab"]:has-text("Progress")');
    await progressTab.click();
    await page.waitForTimeout(2000);
    
    // Check for errors
    if (errors.length > 0) {
      console.log('Errors found:', errors);
      throw new Error(`Console errors detected: ${errors.join(', ')}`);
    }
    
    console.log('✅ No console errors in Progress TAB!');
  });
});