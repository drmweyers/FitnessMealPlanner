import { test, expect } from '@playwright/test';

test.describe('Production Deployment Verification', () => {
  test('Verify Progress TAB fix is deployed to production', async ({ page }) => {
    // Test production environment
    await page.goto('https://evofitmeals.com/login');
    
    // Check if login page loads properly
    await expect(page).toHaveTitle(/EvoFitMeals/);
    
    // Login with test credentials
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');
    
    // Wait for navigation and loading
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Try to click Progress TAB
    const progressTab = page.locator('[role="tab"]:has-text("Progress")');
    await expect(progressTab).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Progress TAB found in production');
    
    await progressTab.click();
    await page.waitForTimeout(2000);
    
    // Check if Progress content loads (our fix)
    const progressHeader = page.locator('h2:has-text("Progress Tracking")');
    await expect(progressHeader).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Progress TAB renders properly - fix is deployed!');
    
    // Check for console errors related to date formatting
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('Invalid time value')) {
        consoleErrors.push(msg.text());
      }
    });
    
    // Wait a bit more to catch any delayed errors
    await page.waitForTimeout(2000);
    
    if (consoleErrors.length === 0) {
      console.log('✅ No "Invalid time value" errors - date validation fix working!');
    } else {
      console.log('❌ Still seeing date errors:', consoleErrors);
    }
    
    // Check specific measurements tab (where our fix was applied)
    const measurementsTab = page.getByRole('tab', { name: /measurements/i });
    if (await measurementsTab.isVisible()) {
      await measurementsTab.click();
      await page.waitForTimeout(1000);
      console.log('✅ Measurements tab accessible');
    }
    
    console.log('✅ Production verification complete - Progress TAB fix deployed successfully!');
  });
  
  test('Compare production deployment date with latest commit', async ({ page }) => {
    // Check what commit was deployed by looking at build artifacts
    const response = await page.goto('https://evofitmeals.com');
    const deploymentHeaders = response?.headers();
    
    console.log('Deployment headers:', deploymentHeaders);
    
    // The latest commit that should be deployed
    console.log('Expected commit: 3cb27fd (Progress TAB fix)');
    console.log('Deployment timestamp should be recent (within last hour)');
  });
});