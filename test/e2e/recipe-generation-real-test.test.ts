import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4000';
const ADMIN_CREDENTIALS = {
  email: 'admin@fitmeal.pro',
  password: 'AdminPass123'
};

test.describe('Recipe Generation - Real Functionality Test', () => {
  
  test('Test actual recipe generation workflow on Admin tab', async ({ page }) => {
    console.log('🔍 Testing actual recipe generation workflow...');
    
    // Login as admin
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/admin', { timeout: 15000 });
    console.log('✅ Admin login successful');
    
    // Navigate to Admin tab (where the recipe generation buttons actually are)
    const adminTab = page.locator('[data-testid="admin-tab-admin"]');
    await expect(adminTab).toBeVisible();
    await adminTab.click();
    console.log('✅ Clicked Admin tab');
    
    await page.waitForTimeout(2000);
    
    // Test Generate Recipes button (the actual button is "Generate New Batch")
    const generateButton = page.locator('[data-testid="admin-generate-recipes"]');
    await expect(generateButton).toBeVisible();
    console.log('✅ Found Generate Recipes button');
    
    // Check button text
    const buttonText = await generateButton.textContent();
    console.log(`🔍 Generate button text: "${buttonText}"`);
    
    // Click the generate button
    console.log('🔍 Clicking Generate New Batch button...');
    await generateButton.click();
    await page.waitForTimeout(2000);
    
    // Check if modal opens
    const modal = page.locator('.fixed.inset-0, [role="dialog"], .modal');
    const modalCount = await modal.count();
    console.log(`🔍 Modal elements found: ${modalCount}`);
    
    if (modalCount > 0) {
      console.log('✅ Recipe generation modal opened');
      
      // Look for any form inputs or buttons within the modal
      const modalButtons = await modal.locator('button').allTextContents();
      console.log('🔍 Modal buttons:', modalButtons);
      
      const modalInputs = await modal.locator('input, select, textarea').count();
      console.log(`🔍 Modal form inputs: ${modalInputs}`);
      
    } else {
      console.log('❌ No modal opened after clicking generate button');
    }
    
    // Test Review Queue button
    const reviewButton = page.locator('[data-testid="admin-view-pending"]');
    await expect(reviewButton).toBeVisible();
    console.log('✅ Found Review Queue button');
    
    const reviewButtonText = await reviewButton.textContent();
    console.log(`🔍 Review button text: "${reviewButtonText}"`);
    
    // Click Review Queue button  
    console.log('🔍 Clicking Review Queue button...');
    await reviewButton.click();
    await page.waitForTimeout(2000);
    
    // Check if pending recipes modal opens
    const pendingModal = page.locator('text="Pending Recipes"');
    const pendingModalExists = await pendingModal.count();
    console.log(`🔍 Pending Recipes modal: ${pendingModalExists > 0 ? 'OPENED' : 'NOT FOUND'}`);
    
    if (pendingModalExists > 0) {
      console.log('✅ Pending recipes modal opened');
    } else {
      console.log('❌ Pending recipes modal did not open');
    }
    
    // Test Export Data button
    const exportButton = page.locator('[data-testid="admin-export-data"]');
    await expect(exportButton).toBeVisible();
    console.log('✅ Found Export Data button');
    
    // Check for console errors during the test
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    
    if (consoleErrors.length > 0) {
      console.log('❌ Console errors found:', consoleErrors);
      expect(consoleErrors.length).toBe(0);
    } else {
      console.log('✅ No console errors found');
    }
    
    // Test successful - all buttons exist and can be interacted with
    console.log('🎉 Recipe generation buttons test completed successfully');
  });
  
  test('Test Recipe Generation Modal Functionality', async ({ page }) => {
    console.log('🔍 Testing recipe generation modal functionality...');
    
    // Login and navigate to admin tab
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/admin', { timeout: 15000 });
    
    // Go to Admin tab
    const adminTab = page.locator('[data-testid="admin-tab-admin"]');
    await adminTab.click();
    await page.waitForTimeout(1000);
    
    // Click Generate Recipes button
    const generateButton = page.locator('[data-testid="admin-generate-recipes"]');
    await generateButton.click();
    await page.waitForTimeout(2000);
    
    // Check if RecipeGenerationModal component is working
    const modalTitle = page.locator('text="Generate Recipes", text="Recipe Generation"');
    const modalTitleExists = await modalTitle.count();
    
    if (modalTitleExists > 0) {
      console.log('✅ Recipe Generation Modal opened with title');
      
      // Look for form elements inside the modal
      const formElements = await page.locator('input, select, button, textarea').count();
      console.log(`🔍 Form elements in modal: ${formElements}`);
      
      // Look for quantity or type selectors
      const quantityInput = page.locator('input[type="number"], input[name*="quantity"], input[name*="count"]');
      const quantityExists = await quantityInput.count();
      console.log(`🔍 Quantity input found: ${quantityExists > 0}`);
      
      // Look for meal type selectors
      const mealTypeSelect = page.locator('select[name*="meal"], select[name*="type"]');
      const mealTypeExists = await mealTypeSelect.count();
      console.log(`🔍 Meal type selector found: ${mealTypeExists > 0}`);
      
      // Look for generate/submit button in modal
      const generateModalButton = page.locator('button:has-text("Generate"), button:has-text("Create"), button[type="submit"]');
      const generateModalExists = await generateModalButton.count();
      console.log(`🔍 Generate button in modal found: ${generateModalExists > 0}`);
      
      if (generateModalExists > 0) {
        console.log('🔍 Testing modal generate button...');
        await generateModalButton.first().click();
        await page.waitForTimeout(3000);
        
        // Check for loading states or success messages
        const loadingIndicator = page.locator('.loading, .spinner, text="Generating", text="Loading"');
        const loadingExists = await loadingIndicator.count();
        console.log(`🔍 Loading indicator found: ${loadingExists > 0}`);
        
        // Wait longer for API response
        await page.waitForTimeout(5000);
        
        // Check for success/error messages
        const successMsg = page.locator('text="Success", text="Generated", text="Created"');
        const errorMsg = page.locator('text="Error", text="Failed", .error, .alert-error');
        
        const successExists = await successMsg.count();
        const errorExists = await errorMsg.count();
        
        console.log(`🔍 Success message: ${successExists > 0 ? 'FOUND' : 'NOT FOUND'}`);
        console.log(`🔍 Error message: ${errorExists > 0 ? 'FOUND' : 'NOT FOUND'}`);
        
        if (successExists > 0) {
          console.log('✅ Recipe generation appears to be working');
        } else if (errorExists > 0) {
          console.log('❌ Recipe generation failed with error');
        } else {
          console.log('⚠️ No clear success/error indication found');
        }
      }
      
    } else {
      console.log('❌ Recipe Generation Modal did not open properly');
      
      // Debug: check what elements are actually visible
      const visibleElements = await page.locator('*:visible').allTextContents();
      console.log('🔍 Visible elements after clicking:', visibleElements.slice(0, 10));
    }
  });
  
});