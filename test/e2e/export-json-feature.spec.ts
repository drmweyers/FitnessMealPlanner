import { test, expect } from '@playwright/test';

test.describe('Export JSON Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app and login as admin
    await page.goto('http://localhost:4000');
    
    // Login as admin
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', 'admin@fitmeal.pro');
    await page.fill('[data-testid="password-input"]', 'Admin123!@#');
    await page.click('[data-testid="login-button"]');
    
    // Wait for navigation to complete
    await page.waitForURL('**/admin');
  });

  test('should display Export JSON card in Admin tab', async ({ page }) => {
    // Navigate to Admin tab
    await page.click('[role="tab"][data-value="admin"]');
    
    // Check that Export JSON card is visible
    await expect(page.locator('text=Export JSON')).toBeVisible();
    await expect(page.locator('text=Export data as JSON files for backup or analysis')).toBeVisible();
    await expect(page.locator('button:has-text("Export Data")')).toBeVisible();
  });

  test('should open Export JSON modal when button is clicked', async ({ page }) => {
    // Navigate to Admin tab
    await page.click('[role="tab"][data-value="admin"]');
    
    // Click Export Data button
    await page.click('button:has-text("Export Data")');
    
    // Check that modal is open
    await expect(page.locator('text=Export Data as JSON')).toBeVisible();
    await expect(page.locator('text=Select the data you want to export')).toBeVisible();
    
    // Check that all export options are visible
    await expect(page.locator('text=Recipes')).toBeVisible();
    await expect(page.locator('text=Users')).toBeVisible();
    await expect(page.locator('text=Meal Plans')).toBeVisible();
    await expect(page.locator('text=Export All')).toBeVisible();
  });

  test('should close Export JSON modal when close button is clicked', async ({ page }) => {
    // Navigate to Admin tab and open modal
    await page.click('[role="tab"][data-value="admin"]');
    await page.click('button:has-text("Export Data")');
    
    // Verify modal is open
    await expect(page.locator('text=Export Data as JSON')).toBeVisible();
    
    // Click close button
    await page.click('button:has-text("Close")');
    
    // Verify modal is closed
    await expect(page.locator('text=Export Data as JSON')).not.toBeVisible();
  });

  test('should show other admin cards alongside Export JSON', async ({ page }) => {
    // Navigate to Admin tab
    await page.click('[role="tab"][data-value="admin"]');
    
    // Check that all admin cards are visible
    await expect(page.locator('text=Generate Recipes')).toBeVisible();
    await expect(page.locator('text=Review Queue')).toBeVisible();
    await expect(page.locator('text=Export JSON')).toBeVisible();
    
    // Check that buttons are clickable
    await expect(page.locator('button:has-text("Generate New Batch")')).toBeVisible();
    await expect(page.locator('button:has-text("View Pending")')).toBeVisible();
    await expect(page.locator('button:has-text("Export Data")')).toBeVisible();
  });

  test('should handle export functionality with mock data', async ({ page }) => {
    // Mock the export API endpoint
    await page.route('/api/admin/export*', async route => {
      const url = new URL(route.request().url());
      const type = url.searchParams.get('type');
      
      const mockData = {
        [`${type}`]: [{ id: '1', name: `Test ${type}` }],
        [`${type}Count`]: 1,
        exportDate: new Date().toISOString(),
        exportType: type,
        version: '1.0',
      };
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockData),
      });
    });

    // Navigate to Admin tab and open modal
    await page.click('[role="tab"][data-value="admin"]');
    await page.click('button:has-text("Export Data")');
    
    // Start download promise before clicking
    const downloadPromise = page.waitForEvent('download');
    
    // Click on Recipes export
    await page.click('text=Recipes >> xpath=ancestor::div[contains(@class, "cursor-pointer")]');
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify download filename
    expect(download.suggestedFilename()).toMatch(/fitnessmealplanner-recipes-\d{4}-\d{2}-\d{2}\.json/);
  });

  test('should handle different export types', async ({ page }) => {
    // Mock the export API
    await page.route('/api/admin/export*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: 'mock' }),
      });
    });

    // Navigate to Admin tab and open modal
    await page.click('[role="tab"][data-value="admin"]');
    await page.click('button:has-text("Export Data")');
    
    const exportTypes = [
      { name: 'Recipes', filename: 'recipes' },
      { name: 'Users', filename: 'users' },
      { name: 'Meal Plans', filename: 'mealPlans' },
      { name: 'Export All', filename: 'all' },
    ];

    for (const exportType of exportTypes) {
      // Reopen modal if needed
      const modalVisible = await page.locator('text=Export Data as JSON').isVisible();
      if (!modalVisible) {
        await page.click('button:has-text("Export Data")');
      }
      
      // Start download promise
      const downloadPromise = page.waitForEvent('download');
      
      // Click export type
      await page.click(`text=${exportType.name} >> xpath=ancestor::div[contains(@class, "cursor-pointer")]`);
      
      // Wait for download
      const download = await downloadPromise;
      
      // Verify filename pattern
      expect(download.suggestedFilename()).toMatch(
        new RegExp(`fitnessmealplanner-${exportType.filename}-\\d{4}-\\d{2}-\\d{2}\\.json`)
      );
      
      // Wait a bit before next iteration
      await page.waitForTimeout(500);
    }
  });

  test('should show success notification after export', async ({ page }) => {
    // Mock successful export
    await page.route('/api/admin/export*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          recipes: [{ id: '1', name: 'Test Recipe' }],
          recipesCount: 1,
          exportDate: new Date().toISOString(),
          exportType: 'recipes',
          version: '1.0',
        }),
      });
    });

    // Navigate to Admin tab and open modal
    await page.click('[role="tab"][data-value="admin"]');
    await page.click('button:has-text("Export Data")');
    
    // Start download promise
    const downloadPromise = page.waitForEvent('download');
    
    // Click on Recipes export
    await page.click('text=Recipes >> xpath=ancestor::div[contains(@class, "cursor-pointer")]');
    
    // Wait for download
    await downloadPromise;
    
    // Check for success notification (toast)
    await expect(page.locator('text=Export successful')).toBeVisible({ timeout: 5000 });
  });

  test('should handle export errors gracefully', async ({ page }) => {
    // Mock failed export
    await page.route('/api/admin/export*', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Export failed' }),
      });
    });

    // Navigate to Admin tab and open modal
    await page.click('[role="tab"][data-value="admin"]');
    await page.click('button:has-text("Export Data")');
    
    // Click on Recipes export
    await page.click('text=Recipes >> xpath=ancestor::div[contains(@class, "cursor-pointer")]');
    
    // Check for error notification
    await expect(page.locator('text=Export failed')).toBeVisible({ timeout: 5000 });
  });

  test('should maintain modal state during loading', async ({ page }) => {
    // Mock slow export response
    await page.route('/api/admin/export*', async route => {
      // Delay response to test loading state
      await page.waitForTimeout(1000);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: 'mock' }),
      });
    });

    // Navigate to Admin tab and open modal
    await page.click('[role="tab"][data-value="admin"]');
    await page.click('button:has-text("Export Data")');
    
    // Click on Recipes export
    await page.click('text=Recipes >> xpath=ancestor::div[contains(@class, "cursor-pointer")]');
    
    // During loading, modal should still be visible but buttons disabled
    await expect(page.locator('text=Export Data as JSON')).toBeVisible();
    
    // Check that close button is disabled during export
    const closeButton = page.locator('button:has-text("Close")');
    await expect(closeButton).toBeDisabled();
  });

  test('should verify admin access only', async ({ page }) => {
    // Logout and login as non-admin user
    await page.click('button:has-text("Logout")');
    
    // Login as customer
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', 'customer.test@evofitmeals.com');
    await page.fill('[data-testid="password-input"]', 'TestCustomer123!');
    await page.click('[data-testid="login-button"]');
    
    // Try to navigate to admin page
    await page.goto('http://localhost:4000/admin');
    
    // Should see access denied message
    await expect(page.locator('text=Access Denied')).toBeVisible();
    await expect(page.locator('text=You must be logged in as an admin')).toBeVisible();
  });

  test('should integrate with existing admin functionality', async ({ page }) => {
    // Verify that Export JSON doesn't interfere with other admin features
    await page.click('[role="tab"][data-value="admin"]');
    
    // Test Generate Recipes button
    await page.click('button:has-text("Generate New Batch")');
    await expect(page.locator('text=Generate Recipes')).toBeVisible();
    
    // Close modal and test Review Queue
    await page.click('button:has-text("Close")');
    await page.click('button:has-text("View Pending")');
    await expect(page.locator('text=Pending Recipes')).toBeVisible();
    
    // Close modal and test Export JSON
    await page.click('button:has-text("Close")');
    await page.click('button:has-text("Export Data")');
    await expect(page.locator('text=Export Data as JSON')).toBeVisible();
  });
});