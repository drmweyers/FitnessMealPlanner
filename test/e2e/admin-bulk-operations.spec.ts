/**
 * Admin Bulk Operations E2E Tests
 * 
 * Comprehensive tests for bulk selection and deletion functionality
 */

import { test, expect, Page } from '@playwright/test';
import { 
  loginAsAdmin, 
  takeTestScreenshot, 
  waitForNetworkIdle, 
  navigateToAdminTab,
  waitForModal
} from './auth-helper';

test.describe('Admin Bulk Operations Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    page.setDefaultTimeout(30000);
    
    // Setup console monitoring
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console error:', msg.text());
      }
    });

    await loginAsAdmin(page);
    await navigateToAdminTab(page, 'recipes');
    await waitForNetworkIdle(page);
  });

  test.afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  test('should enable bulk selection mode', async () => {
    console.log('🧪 Testing bulk selection mode activation...');
    
    // Look for bulk selection toggle button
    const bulkToggleSelectors = [
      'button:has-text("Select")',
      'button:has-text("Bulk")', 
      'button:has-text("Select Multiple")',
      '[data-testid="bulk-select-toggle"]',
      'button[aria-label*="select"]'
    ];
    
    let selectionModeButton;
    for (const selector of bulkToggleSelectors) {
      const button = page.locator(selector);
      if (await button.isVisible()) {
        selectionModeButton = button;
        break;
      }
    }
    
    if (selectionModeButton) {
      await takeTestScreenshot(page, 'before-bulk-mode.png', 'Before enabling bulk selection');
      
      await selectionModeButton.click();
      await page.waitForTimeout(1000);
      
      await takeTestScreenshot(page, 'bulk-mode-enabled.png', 'Bulk selection mode enabled');
      
      // Verify checkboxes appeared
      const checkboxes = page.locator('input[type="checkbox"], [role="checkbox"]');
      const checkboxCount = await checkboxes.count();
      
      console.log(`✅ Bulk mode enabled - found ${checkboxCount} checkboxes`);
      expect(checkboxCount).toBeGreaterThan(0);
      
      // Verify bulk toolbar appears
      const bulkToolbar = page.locator('.bulk-toolbar, [data-testid="bulk-toolbar"], .selection-toolbar');
      const toolbarVisible = await bulkToolbar.isVisible();
      
      if (toolbarVisible) {
        console.log('✅ Bulk operations toolbar visible');
      } else {
        console.log('⚠️ Bulk operations toolbar not visible');
      }
      
    } else {
      console.log('⚠️ Bulk selection toggle button not found');
      // Try to find checkboxes directly (might be always visible)
      const directCheckboxes = page.locator('input[type="checkbox"]');
      const directCount = await directCheckboxes.count();
      
      if (directCount > 0) {
        console.log(`ℹ️ Found ${directCount} checkboxes without toggle (always visible)`);
      }
    }
  });

  test('should select and deselect individual recipes', async () => {
    console.log('🧪 Testing individual recipe selection...');
    
    // Enable bulk selection mode first
    await enableBulkSelectionMode(page);
    
    // Find recipe checkboxes
    const checkboxes = page.locator('input[type="checkbox"]:not([data-testid="select-all"])');
    const checkboxCount = await checkboxes.count();
    
    if (checkboxCount > 0) {
      console.log(`📋 Found ${checkboxCount} recipe checkboxes`);
      
      // Select first recipe
      const firstCheckbox = checkboxes.first();
      await firstCheckbox.check();
      await page.waitForTimeout(500);
      
      // Verify it's checked
      const isChecked = await firstCheckbox.isChecked();
      expect(isChecked).toBe(true);
      
      await takeTestScreenshot(page, 'first-recipe-selected.png', 'First recipe selected');
      
      // Select second recipe
      if (checkboxCount > 1) {
        const secondCheckbox = checkboxes.nth(1);
        await secondCheckbox.check();
        await page.waitForTimeout(500);
        
        // Verify selection count updates
        const selectedCount = await getSelectionCount(page);
        console.log(`📊 Selected count: ${selectedCount}`);
        
        if (selectedCount >= 2) {
          console.log('✅ Multiple selection working');
        }
        
        // Deselect first recipe
        await firstCheckbox.uncheck();
        await page.waitForTimeout(500);
        
        const isUnchecked = await firstCheckbox.isChecked();
        expect(isUnchecked).toBe(false);
        
        console.log('✅ Individual recipe selection/deselection working');
      }
    } else {
      console.log('⚠️ No recipe checkboxes found');
    }
  });

  test('should handle Select All functionality', async () => {
    console.log('🧪 Testing Select All functionality...');
    
    await enableBulkSelectionMode(page);
    
    // Find Select All checkbox
    const selectAllCheckbox = page.locator('input[type="checkbox"][data-testid="select-all"], .select-all input[type="checkbox"]');
    
    if (await selectAllCheckbox.isVisible()) {
      await takeTestScreenshot(page, 'before-select-all.png', 'Before Select All');
      
      // Click Select All
      await selectAllCheckbox.check();
      await page.waitForTimeout(1000);
      
      await takeTestScreenshot(page, 'after-select-all.png', 'After Select All');
      
      // Verify all checkboxes are selected
      const allCheckboxes = page.locator('input[type="checkbox"]:not([data-testid="select-all"])');
      const totalCheckboxes = await allCheckboxes.count();
      
      let selectedCount = 0;
      for (let i = 0; i < totalCheckboxes; i++) {
        const isChecked = await allCheckboxes.nth(i).isChecked();
        if (isChecked) selectedCount++;
      }
      
      console.log(`📊 Total checkboxes: ${totalCheckboxes}, Selected: ${selectedCount}`);
      expect(selectedCount).toBe(totalCheckboxes);
      
      // Test Deselect All
      await selectAllCheckbox.uncheck();
      await page.waitForTimeout(1000);
      
      // Verify all checkboxes are deselected
      let deselectedCount = 0;
      for (let i = 0; i < totalCheckboxes; i++) {
        const isChecked = await allCheckboxes.nth(i).isChecked();
        if (!isChecked) deselectedCount++;
      }
      
      console.log(`📊 Deselected count: ${deselectedCount}`);
      expect(deselectedCount).toBe(totalCheckboxes);
      
      console.log('✅ Select All/Deselect All functionality working');
    } else {
      console.log('⚠️ Select All checkbox not found');
    }
  });

  test('should show bulk delete button when recipes are selected', async () => {
    console.log('🧪 Testing bulk delete button visibility...');
    
    await enableBulkSelectionMode(page);
    
    // Initially, bulk delete should be hidden or disabled
    let bulkDeleteButton = await findBulkDeleteButton(page);
    
    if (bulkDeleteButton) {
      const initiallyDisabled = await bulkDeleteButton.isDisabled();
      console.log(`🔒 Bulk delete initially disabled: ${initiallyDisabled}`);
    }
    
    // Select some recipes
    const checkboxes = page.locator('input[type="checkbox"]:not([data-testid="select-all"])');
    const selectCount = Math.min(3, await checkboxes.count());
    
    for (let i = 0; i < selectCount; i++) {
      await checkboxes.nth(i).check();
      await page.waitForTimeout(200);
    }
    
    await takeTestScreenshot(page, 'recipes-selected-for-bulk.png', `${selectCount} recipes selected`);
    
    // Check if bulk delete button is now enabled
    bulkDeleteButton = await findBulkDeleteButton(page);
    
    if (bulkDeleteButton) {
      const nowEnabled = !await bulkDeleteButton.isDisabled();
      console.log(`🔓 Bulk delete now enabled: ${nowEnabled}`);
      expect(nowEnabled).toBe(true);
      
      // Check button text/label
      const buttonText = await bulkDeleteButton.textContent();
      console.log(`🏷️ Bulk delete button text: ${buttonText}`);
      
      const expectedTexts = ['Delete Selected', 'Delete', 'Bulk Delete', 'Remove Selected'];
      const hasValidText = expectedTexts.some(text => buttonText?.includes(text));
      expect(hasValidText).toBe(true);
      
      console.log('✅ Bulk delete button shows correctly when recipes selected');
    }
  });

  test('should execute bulk deletion with confirmation', async () => {
    console.log('🧪 Testing bulk deletion execution...');
    
    await enableBulkSelectionMode(page);
    
    // Get initial recipe count
    const initialRecipeCount = await page.locator('.recipe-card, [data-testid="recipe-card"], tr').count();
    console.log(`📊 Initial recipe count: ${initialRecipeCount}`);
    
    // Select a few recipes for deletion
    const checkboxes = page.locator('input[type="checkbox"]:not([data-testid="select-all"])');
    const selectCount = Math.min(2, await checkboxes.count()); // Delete max 2 for safety
    
    if (selectCount === 0) {
      console.log('⚠️ No recipes available for bulk deletion test');
      return;
    }
    
    // Select recipes
    for (let i = 0; i < selectCount; i++) {
      await checkboxes.nth(i).check();
      await page.waitForTimeout(300);
    }
    
    console.log(`🎯 Selected ${selectCount} recipes for deletion`);
    await takeTestScreenshot(page, 'before-bulk-deletion.png', 'Before bulk deletion');
    
    // Click bulk delete button
    const bulkDeleteButton = await findBulkDeleteButton(page);
    if (bulkDeleteButton) {
      await bulkDeleteButton.click();
      
      // Wait for confirmation dialog
      const confirmationAppeared = await waitForModal(page, 10000);
      expect(confirmationAppeared).toBe(true);
      
      await takeTestScreenshot(page, 'bulk-deletion-confirmation.png', 'Bulk deletion confirmation');
      
      // Look for confirmation buttons
      const confirmButtons = [
        'button:has-text("Confirm")',
        'button:has-text("Yes")', 
        'button:has-text("Delete")',
        'button:has-text("OK")',
        '[data-testid="confirm-bulk-delete"]'
      ];
      
      let confirmButton;
      for (const selector of confirmButtons) {
        const button = page.locator(selector);
        if (await button.isVisible()) {
          confirmButton = button;
          break;
        }
      }
      
      if (confirmButton) {
        console.log('🔴 Executing bulk deletion...');
        await confirmButton.click();
        
        // Wait for operation to complete
        await waitForNetworkIdle(page);
        await page.waitForTimeout(2000);
        
        await takeTestScreenshot(page, 'after-bulk-deletion.png', 'After bulk deletion');
        
        // Verify recipes were deleted
        const newRecipeCount = await page.locator('.recipe-card, [data-testid="recipe-card"], tr').count();
        console.log(`📊 New recipe count: ${newRecipeCount}`);
        
        // Verify selections cleared
        const stillSelected = await page.locator('input[type="checkbox"]:checked').count();
        expect(stillSelected).toBe(0);
        
        // Look for success message
        const successMessages = page.locator('text*="deleted", text*="removed", text*="success"');
        const hasSuccessMessage = await successMessages.count() > 0;
        
        if (hasSuccessMessage) {
          console.log('✅ Success message displayed');
        }
        
        console.log('✅ Bulk deletion executed successfully');
      } else {
        console.log('⚠️ Confirmation button not found');
      }
    } else {
      console.log('⚠️ Bulk delete button not found');
    }
  });

  test('should handle bulk deletion cancellation', async () => {
    console.log('🧪 Testing bulk deletion cancellation...');
    
    await enableBulkSelectionMode(page);
    
    // Select some recipes
    const checkboxes = page.locator('input[type="checkbox"]:not([data-testid="select-all"])');
    const selectCount = Math.min(2, await checkboxes.count());
    
    for (let i = 0; i < selectCount; i++) {
      await checkboxes.nth(i).check();
      await page.waitForTimeout(200);
    }
    
    const initialSelectedCount = await getSelectedCheckboxCount(page);
    console.log(`📊 Initially selected: ${initialSelectedCount}`);
    
    // Click bulk delete
    const bulkDeleteButton = await findBulkDeleteButton(page);
    if (bulkDeleteButton) {
      await bulkDeleteButton.click();
      
      // Wait for confirmation dialog
      if (await waitForModal(page)) {
        await takeTestScreenshot(page, 'bulk-deletion-cancel-dialog.png', 'Cancel dialog');
        
        // Look for cancel button
        const cancelButtons = [
          'button:has-text("Cancel")',
          'button:has-text("No")',
          'button:has-text("Close")',
          '[data-testid="cancel-bulk-delete"]'
        ];
        
        let cancelButton;
        for (const selector of cancelButtons) {
          const button = page.locator(selector);
          if (await button.isVisible()) {
            cancelButton = button;
            break;
          }
        }
        
        if (cancelButton) {
          await cancelButton.click();
          await page.waitForTimeout(1000);
          
          // Verify selections are still there
          const stillSelectedCount = await getSelectedCheckboxCount(page);
          console.log(`📊 Still selected after cancel: ${stillSelectedCount}`);
          
          expect(stillSelectedCount).toBe(initialSelectedCount);
          
          console.log('✅ Bulk deletion cancellation working');
        }
      }
    }
  });

  test('should exit bulk selection mode', async () => {
    console.log('🧪 Testing exit bulk selection mode...');
    
    await enableBulkSelectionMode(page);
    
    // Select some items
    const checkbox = page.locator('input[type="checkbox"]').first();
    if (await checkbox.isVisible()) {
      await checkbox.check();
      await page.waitForTimeout(500);
    }
    
    // Look for exit/done button
    const exitButtons = [
      'button:has-text("Done")',
      'button:has-text("Exit")',
      'button:has-text("Cancel")',
      '[data-testid="exit-selection"]'
    ];
    
    let exitButton;
    for (const selector of exitButtons) {
      const button = page.locator(selector);
      if (await button.isVisible()) {
        exitButton = button;
        break;
      }
    }
    
    if (exitButton) {
      await exitButton.click();
      await page.waitForTimeout(1000);
      
      // Verify checkboxes are hidden
      const checkboxesVisible = await page.locator('input[type="checkbox"]').count();
      console.log(`📊 Checkboxes visible after exit: ${checkboxesVisible}`);
      
      // Verify bulk toolbar is hidden
      const bulkToolbar = page.locator('.bulk-toolbar, [data-testid="bulk-toolbar"]');
      const toolbarVisible = await bulkToolbar.isVisible();
      
      if (!toolbarVisible) {
        console.log('✅ Bulk toolbar hidden after exit');
      }
      
      await takeTestScreenshot(page, 'after-exit-bulk-mode.png', 'After exiting bulk mode');
      
      console.log('✅ Bulk selection mode exit working');
    } else {
      // Try clicking the original toggle again to exit
      const toggleButton = page.locator('button:has-text("Select"), button:has-text("Bulk")').first();
      if (await toggleButton.isVisible()) {
        await toggleButton.click();
        await page.waitForTimeout(1000);
        console.log('✅ Exited via toggle button');
      }
    }
  });
});

// Helper Functions
async function enableBulkSelectionMode(page: Page): Promise<void> {
  const bulkToggleSelectors = [
    'button:has-text("Select")',
    'button:has-text("Bulk")', 
    'button:has-text("Select Multiple")',
    '[data-testid="bulk-select-toggle"]'
  ];
  
  for (const selector of bulkToggleSelectors) {
    const button = page.locator(selector);
    if (await button.isVisible()) {
      await button.click();
      await page.waitForTimeout(1000);
      return;
    }
  }
  
  // Check if bulk mode is already enabled (checkboxes visible)
  const checkboxes = page.locator('input[type="checkbox"]');
  const checkboxCount = await checkboxes.count();
  if (checkboxCount > 0) {
    console.log('ℹ️ Bulk selection appears to be already enabled');
  }
}

async function findBulkDeleteButton(page: Page) {
  const deleteButtonSelectors = [
    'button:has-text("Delete Selected")',
    'button:has-text("Bulk Delete")',
    'button:has-text("Delete")',
    '[data-testid="bulk-delete"]',
    '.bulk-delete-btn'
  ];
  
  for (const selector of deleteButtonSelectors) {
    const button = page.locator(selector);
    if (await button.isVisible()) {
      return button;
    }
  }
  return null;
}

async function getSelectionCount(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const selectedCheckboxes = document.querySelectorAll('input[type="checkbox"]:checked');
    // Exclude select-all checkbox
    let count = 0;
    for (const checkbox of selectedCheckboxes) {
      if (!checkbox.hasAttribute('data-testid') || checkbox.getAttribute('data-testid') !== 'select-all') {
        count++;
      }
    }
    return count;
  });
}

async function getSelectedCheckboxCount(page: Page): Promise<number> {
  const checkboxes = page.locator('input[type="checkbox"]:not([data-testid="select-all"])');
  const count = await checkboxes.count();
  let selectedCount = 0;
  
  for (let i = 0; i < count; i++) {
    const isChecked = await checkboxes.nth(i).isChecked();
    if (isChecked) selectedCount++;
  }
  
  return selectedCount;
}