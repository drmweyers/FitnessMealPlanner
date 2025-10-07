import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4000';
const ADMIN_CREDENTIALS = {
  email: 'admin@fitmeal.pro',
  password: 'AdminPass123'
};

test.describe('Recipe Generation - Debug Console Errors', () => {
  
  test('Debug console errors when clicking Generate button', async ({ page }) => {
    console.log('🔍 Debugging console errors for recipe generation...');
    
    // Capture console messages
    const consoleMessages: Array<{type: string, text: string}> = [];
    page.on('console', (msg) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });
    
    // Capture page errors
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });
    
    // Capture failed requests
    const failedRequests: Array<{url: string, status: number}> = [];
    page.on('response', (response) => {
      if (!response.ok()) {
        failedRequests.push({
          url: response.url(),
          status: response.status()
        });
      }
    });
    
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(3000);
    
    // Navigate to admin if not already there
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
    console.log('🔍 Console messages so far:', consoleMessages.length);
    console.log('🔍 Page errors so far:', pageErrors.length);
    
    // Clear previous messages to focus on button click
    consoleMessages.length = 0;
    pageErrors.length = 0;
    
    // Click the Generate New Batch button
    const generateButton = page.locator('[data-testid="admin-generate-recipes"]');
    console.log('🔍 Clicking Generate New Batch button...');
    
    await generateButton.click();
    await page.waitForTimeout(3000);
    
    // Check for modal
    const modalTitle = page.locator('text="Generate Targeted Recipes"');
    const modalTitleExists = await modalTitle.count();
    console.log(`🔍 Modal title found: ${modalTitleExists > 0}`);
    
    // Check for any modal-like elements
    const anyModal = page.locator('.fixed.inset-0, [role="dialog"], .modal');
    const anyModalCount = await anyModal.count();
    console.log(`🔍 Any modal elements found: ${anyModalCount}`);
    
    // Check for RecipeGenerationModal component in DOM
    const generationModalElements = page.locator('[class*="Recipe"], [data-testid*="recipe"], text="Recipe Generation"');
    const generationModalCount = await generationModalElements.count();
    console.log(`🔍 Recipe generation related elements: ${generationModalCount}`);
    
    console.log('\n📊 DIAGNOSTIC REPORT:');
    console.log('====================');
    
    console.log('\n❌ Console Errors after button click:');
    const errors = consoleMessages.filter(msg => msg.type === 'error');
    if (errors.length === 0) {
      console.log('   No console errors found');
    } else {
      errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error.text}`);
      });
    }
    
    console.log('\n⚠️ Console Warnings after button click:');
    const warnings = consoleMessages.filter(msg => msg.type === 'warning');
    if (warnings.length === 0) {
      console.log('   No console warnings found');
    } else {
      warnings.forEach((warning, i) => {
        console.log(`   ${i + 1}. ${warning.text}`);
      });
    }
    
    console.log('\n💥 Page Errors:');
    if (pageErrors.length === 0) {
      console.log('   No page errors found');
    } else {
      pageErrors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }
    
    console.log('\n🌐 Failed Requests:');
    if (failedRequests.length === 0) {
      console.log('   No failed requests found');
    } else {
      failedRequests.forEach((req, i) => {
        console.log(`   ${i + 1}. ${req.status} - ${req.url}`);
      });
    }
    
    console.log('\n📋 All Console Messages:');
    consoleMessages.forEach((msg, i) => {
      console.log(`   ${i + 1}. [${msg.type.toUpperCase()}] ${msg.text}`);
    });
    
    // Check if showRecipeGenerationModal state is being set
    console.log('\n🔍 Checking page state...');
    
    // Try to trigger the modal manually via JavaScript
    const manualTriggerResult = await page.evaluate(() => {
      // Check if React DevTools or window.__REACT_DEVTOOLS_GLOBAL_HOOK__ exists
      const react = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
      return {
        reactDevTools: !!react,
        windowKeys: Object.keys(window).filter(key => key.includes('react') || key.includes('React')).slice(0, 5)
      };
    });
    
    console.log('🔍 React DevTools available:', manualTriggerResult.reactDevTools);
    console.log('🔍 React-related window keys:', manualTriggerResult.windowKeys);
    
    console.log('\n🎯 CONCLUSION:');
    if (modalTitleExists === 0 && errors.length === 0 && pageErrors.length === 0) {
      console.log('   Modal not opening, but no obvious errors detected.');
      console.log('   This suggests a React state or component rendering issue.');
    } else if (errors.length > 0 || pageErrors.length > 0) {
      console.log('   Errors detected - these are likely preventing modal from opening.');
    } else {
      console.log('   Modal appears to be working normally.');
    }
  });
});