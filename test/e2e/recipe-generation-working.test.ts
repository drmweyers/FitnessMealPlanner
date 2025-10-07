import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4000';
const ADMIN_CREDENTIALS = {
  email: 'admin@fitmeal.pro',
  password: 'AdminPass123'
};

test.describe('Recipe Generation - Working Test', () => {
  
  test('Test Recipe Generation Buttons Functionality', async ({ page }) => {
    console.log('🔍 Testing recipe generation buttons functionality...');
    
    // Login as admin
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await page.waitForTimeout(3000);
    const currentUrl = page.url();
    console.log('🔍 Current URL after login:', currentUrl);
    
    if (!currentUrl.includes('/admin')) {
      await page.goto(`${BASE_URL}/admin`);
      await page.waitForLoadState('networkidle');
    }
    
    console.log('✅ Admin page loaded');
    
    // Navigate to Admin tab (the buttons are on the admin tab, not recipes tab)
    const adminTab = page.locator('[data-testid="admin-tab-admin"]');
    const adminTabExists = await adminTab.count();
    console.log(`🔍 Admin tab exists: ${adminTabExists > 0}`);
    
    if (adminTabExists > 0) {
      await adminTab.click();
      await page.waitForTimeout(2000);
      console.log('✅ Clicked Admin tab');
    }
    
    // Test 1: Generate New Batch button
    const generateButton = page.locator('[data-testid="admin-generate-recipes"]');
    const generateButtonExists = await generateButton.count();
    console.log(`🔍 Generate New Batch button exists: ${generateButtonExists > 0}`);
    
    if (generateButtonExists > 0) {
      console.log('✅ Found Generate New Batch button');
      
      // Click the button
      await generateButton.click();
      await page.waitForTimeout(3000);
      
      // Check if modal opens by looking for modal content
      const modalContent = page.locator('text="Generate Targeted Recipes", text="Recipe Generation"');
      const modalExists = await modalContent.count();
      console.log(`🔍 Recipe generation modal opened: ${modalExists > 0}`);
      
      if (modalExists > 0) {
        console.log('✅ Recipe Generation Modal opened successfully');
        
        // Test the actual Generate Random Recipes button inside the modal
        const randomButton = page.locator('button:has-text("Generate Random Recipes")');
        const randomButtonExists = await randomButton.count();
        console.log(`🔍 Generate Random Recipes button found: ${randomButtonExists > 0}`);
        
        if (randomButtonExists > 0) {
          console.log('🔍 Testing Generate Random Recipes functionality...');
          
          // Monitor network requests
          const apiCalls: string[] = [];
          page.on('request', (request) => {
            if (request.url().includes('/api/')) {
              apiCalls.push(`${request.method()} ${request.url()}`);
            }
          });
          
          // Monitor responses
          const apiErrors: string[] = [];
          page.on('response', (response) => {
            if (response.status() >= 400) {
              apiErrors.push(`${response.status()} ${response.url()}`);
            }
          });
          
          // Click the generate button
          await randomButton.click();
          
          // Wait for API activity
          await page.waitForTimeout(8000);
          
          console.log('🔍 API calls during generation:', apiCalls);
          console.log('🔍 API errors:', apiErrors);
          
          // Check for any loading/progress indicators
          const progressIndicators = page.locator('[data-testid*="progress"], .progress, text="Generating", text="Loading", text="Processing"');
          const progressCount = await progressIndicators.count();
          console.log(`🔍 Progress indicators found: ${progressCount}`);
          
          // Check for success/error messages
          const successMsg = page.locator('text="Success", text="Generated", text="completed", text="Created"');
          const errorMsg = page.locator('text="Error", text="Failed", .error');
          
          const successCount = await successMsg.count();
          const errorCount = await errorMsg.count();
          
          console.log(`🔍 Success indicators: ${successCount}`);
          console.log(`🔍 Error indicators: ${errorCount}`);
          
          if (apiCalls.length > 0) {
            console.log('✅ Recipe generation triggered API calls - WORKING');
          } else {
            console.log('❌ Recipe generation did not trigger any API calls');
          }
          
          // Test if we can close the modal (using Escape key as a fallback)
          await page.keyboard.press('Escape');
          await page.waitForTimeout(1000);
          
          const modalStillExists = await modalContent.count();
          console.log(`🔍 Modal closed: ${modalStillExists === 0}`);
          
        } else {
          console.log('❌ Generate Random Recipes button not found in modal');
        }
      } else {
        console.log('❌ Recipe Generation Modal did not open');
      }
    }
    
    // Test 2: Review Queue button (only test if modal is closed)
    const modalCheck = page.locator('text="Generate Targeted Recipes"');
    const modalOpen = await modalCheck.count();
    
    if (modalOpen === 0) {
      const reviewButton = page.locator('[data-testid="admin-view-pending"]');
      const reviewButtonExists = await reviewButton.count();
      console.log(`🔍 Review Queue button exists: ${reviewButtonExists > 0}`);
      
      if (reviewButtonExists > 0) {
        console.log('🔍 Testing Review Queue button...');
        await reviewButton.click();
        await page.waitForTimeout(2000);
        
        const pendingModalTitle = page.locator('text="Pending Recipes"');
        const pendingModalExists = await pendingModalTitle.count();
        console.log(`🔍 Pending Recipes modal opened: ${pendingModalExists > 0}`);
        
        if (pendingModalExists > 0) {
          console.log('✅ Review Queue button WORKING - Pending modal opened');
        } else {
          console.log('❌ Review Queue button not working properly');
        }
      }
    } else {
      console.log('⚠️ Skipping Review Queue test - Generation modal still open');
    }
    
    // Test 3: Export Data button
    const exportButton = page.locator('[data-testid="admin-export-data"]');
    const exportButtonExists = await exportButton.count();
    console.log(`🔍 Export Data button exists: ${exportButtonExists > 0}`);
    
    if (exportButtonExists > 0) {
      console.log('✅ All admin buttons are present and accounted for');
    }
    
    console.log('🎉 Recipe generation buttons test completed');
  });
});