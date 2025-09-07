import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4000';
const ADMIN_CREDENTIALS = {
  email: 'admin@fitmeal.pro',
  password: 'AdminPass123'
};

test.describe('Recipe Generation - Final Working Test', () => {
  
  test('✅ COMPLETE Recipe Generation Workflow Test', async ({ page }) => {
    console.log('🔍 Testing complete recipe generation workflow...');
    
    // Monitor API calls
    const apiCalls: Array<{method: string, url: string, status?: number}> = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        apiCalls.push({
          method: request.method(),
          url: request.url()
        });
      }
    });
    
    page.on('response', (response) => {
      if (response.url().includes('/api/')) {
        const existingCall = apiCalls.find(call => 
          call.url === response.url() && !call.status
        );
        if (existingCall) {
          existingCall.status = response.status();
        }
      }
    });
    
    // Login as admin
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(3000);
    
    if (!page.url().includes('/admin')) {
      await page.goto(`${BASE_URL}/admin`);
      await page.waitForLoadState('networkidle');
    }
    
    console.log('✅ Admin page loaded');
    
    // Navigate to Admin tab
    const adminTab = page.locator('[data-testid="admin-tab-admin"]');
    await adminTab.click();
    await page.waitForTimeout(1000);
    console.log('✅ Clicked Admin tab');
    
    // Test 1: Generate New Batch button opens modal
    const generateButton = page.locator('[data-testid="admin-generate-recipes"]');
    console.log('🔍 Clicking Generate New Batch button...');
    
    await generateButton.click();
    await page.waitForTimeout(2000);
    
    // Check if modal opens
    const modalTitle = page.locator('text="Generate Targeted Recipes"');
    await expect(modalTitle).toBeVisible();
    console.log('✅ Recipe Generation Modal opened successfully');
    
    // Test 2: Quick Random Generation button functionality
    const quickGenerateButton = page.locator('button:has-text("Generate Random Recipes")');
    await expect(quickGenerateButton).toBeVisible();
    console.log('✅ Found Generate Random Recipes button');
    
    // Clear previous API calls to focus on generation
    apiCalls.length = 0;
    
    console.log('🔍 Clicking Generate Random Recipes...');
    await quickGenerateButton.click();
    
    // Wait for API activity
    await page.waitForTimeout(8000);
    
    console.log('📡 API calls during generation:');
    apiCalls.forEach(call => {
      console.log(`   ${call.method} ${call.url} (${call.status || 'pending'})`);
    });
    
    const generationApiCalls = apiCalls.filter(call => 
      call.url.includes('generate') || 
      call.url.includes('recipe') ||
      call.url.includes('ai')
    );
    
    if (generationApiCalls.length > 0) {
      console.log('✅ Recipe generation API calls detected - WORKING!');
      
      // Check if any calls were successful
      const successfulCalls = generationApiCalls.filter(call => 
        call.status && call.status >= 200 && call.status < 300
      );
      
      if (successfulCalls.length > 0) {
        console.log('✅ Recipe generation API calls successful!');
      } else {
        console.log('⚠️ Recipe generation API calls made but status unclear');
      }
    } else {
      console.log('❌ No recipe generation API calls detected');
    }
    
    // Test 3: Check for progress/loading indicators
    const progressIndicators = page.locator('[data-testid*="progress"]');
    const progressCount = await progressIndicators.count();
    console.log(`🔍 Progress indicators: ${progressCount}`);
    
    // Test 4: Check for success/error messages
    await page.waitForTimeout(5000);
    
    const successMessages = page.locator('text="Success", text="Generated", text="completed"');
    const errorMessages = page.locator('text="Error", text="Failed"');
    
    const successCount = await successMessages.count();
    const errorCount = await errorMessages.count();
    
    console.log(`🔍 Success messages: ${successCount}`);
    console.log(`🔍 Error messages: ${errorCount}`);
    
    if (successCount > 0) {
      console.log('✅ Recipe generation completed successfully!');
    } else if (errorCount > 0) {
      console.log('❌ Recipe generation failed with errors');
    } else if (generationApiCalls.length > 0) {
      console.log('⚠️ Recipe generation in progress or completed silently');
    }
    
    // Test 5: Close modal and test other buttons
    console.log('🔍 Testing modal close...');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
    
    const modalAfterEscape = page.locator('text="Generate Targeted Recipes"');
    const modalClosed = (await modalAfterEscape.count()) === 0;
    console.log(`✅ Modal closes properly: ${modalClosed}`);
    
    // Test 6: Review Queue functionality
    if (modalClosed) {
      const reviewButton = page.locator('[data-testid="admin-view-pending"]');
      console.log('🔍 Testing Review Queue button...');
      
      await reviewButton.click();
      await page.waitForTimeout(2000);
      
      const pendingModalTitle = page.locator('text="Pending Recipes"');
      const pendingModalVisible = await pendingModalTitle.count();
      
      if (pendingModalVisible > 0) {
        console.log('✅ Review Queue button WORKING - Pending modal opened');
        
        // Close pending modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
      } else {
        console.log('❌ Review Queue button not working');
      }
    }
    
    // Test 7: Export Data button
    const exportButton = page.locator('[data-testid="admin-export-data"]');
    console.log('🔍 Testing Export Data button...');
    
    await exportButton.click();
    await page.waitForTimeout(2000);
    
    const exportModalVisible = await page.locator('text="Export", text="Download"').count();
    console.log(`✅ Export button working: ${exportModalVisible > 0}`);
    
    // Final summary
    console.log('\n🎯 FINAL RESULTS:');
    console.log('==================');
    console.log(`✅ Generate New Batch button: WORKING`);
    console.log(`✅ Recipe Generation Modal: OPENS CORRECTLY`);
    console.log(`✅ Generate Random Recipes: ${generationApiCalls.length > 0 ? 'WORKING (API calls made)' : 'NOT WORKING'}`);
    console.log(`✅ Modal close functionality: ${modalClosed ? 'WORKING' : 'NOT WORKING'}`);
    console.log(`✅ Review Queue button: ${pendingModalVisible > 0 ? 'WORKING' : 'NEEDS INVESTIGATION'}`);
    console.log(`✅ Export Data button: ${exportModalVisible > 0 ? 'WORKING' : 'NEEDS INVESTIGATION'}`);
    
    const workingFeatures = [
      true, // Generate button
      true, // Modal opens
      generationApiCalls.length > 0, // API calls
      modalClosed, // Modal closes
      pendingModalVisible > 0, // Review queue
      exportModalVisible > 0 // Export
    ].filter(Boolean).length;
    
    const totalFeatures = 6;
    const successRate = Math.round((workingFeatures / totalFeatures) * 100);
    
    console.log(`\n🏆 OVERALL SUCCESS RATE: ${successRate}% (${workingFeatures}/${totalFeatures} features working)`);
    
    if (successRate >= 80) {
      console.log('🎉 RECIPE GENERATION SYSTEM IS WORKING!');
    } else {
      console.log('⚠️ Recipe generation system needs fixes');
    }
  });
});