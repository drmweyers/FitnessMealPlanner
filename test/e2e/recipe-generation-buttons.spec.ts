/**
 * RECIPE GENERATION BUTTONS COMPREHENSIVE TEST SUITE
 * 
 * This test suite focuses specifically on testing ALL recipe generation GUI elements:
 * - Generate New Batch button
 * - Review Recipe Queue button  
 * - Export Recipe Data button
 * - Recipe Generation Modal interactions
 * - Recipe approval workflows
 * - All form elements in recipe generation
 * - Progress indicators and loading states
 * - Error handling and validation
 * - Modal close behaviors
 * - Button state changes
 */

import { test, expect, Page } from '@playwright/test';

// Test account credentials
const ADMIN_CREDENTIALS = { 
  email: 'admin@fitmeal.pro', 
  password: 'AdminPass123' 
};

// Helper function to login as admin
async function loginAsAdmin(page: Page) {
  console.log('🔐 Logging in as admin...');
  
  await page.goto('/login');
  await expect(page).toHaveTitle(/FitnessMealPlanner/);
  
  await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
  await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
  await page.click('button[type="submit"]');
  
  await page.waitForNavigation({ waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/\/admin/);
  await expect(page.locator('h1')).toContainText('Admin Dashboard');
  
  console.log('✅ Successfully logged in as admin');
}

// Helper function to navigate to admin tab
async function navigateToAdminTab(page: Page) {
  console.log('🗂️ Navigating to Admin tab...');
  
  await page.click('[data-testid="admin-tab-admin"]');
  await page.waitForTimeout(1000);
  
  // Verify we're on admin tab
  await expect(page.locator('[data-testid="admin-generate-recipes"]')).toBeVisible();
  await expect(page.locator('[data-testid="admin-view-pending"]')).toBeVisible();
  await expect(page.locator('[data-testid="admin-export-data"]')).toBeVisible();
  
  console.log('✅ Successfully navigated to Admin tab');
}

// Helper function to test button states
async function testButtonStates(page: Page, buttonSelector: string, buttonName: string) {
  console.log(`🔘 Testing ${buttonName} button states...`);
  
  const button = page.locator(buttonSelector);
  
  // Check if button exists and is visible
  await expect(button).toBeVisible();
  console.log(`  ✅ ${buttonName} is visible`);
  
  // Check if button is enabled
  const isEnabled = await button.isEnabled();
  console.log(`  ✅ ${buttonName} enabled: ${isEnabled}`);
  
  // Check button text content
  const buttonText = await button.textContent();
  console.log(`  📝 ${buttonName} text: "${buttonText?.trim()}"`);
  
  // Test hover state
  await button.hover();
  await page.waitForTimeout(300);
  console.log(`  🖱️  ${buttonName} hover state tested`);
  
  // Check for any tooltips that appear on hover
  const tooltip = page.locator('[role="tooltip"], .tooltip');
  const hasTooltip = await tooltip.count() > 0;
  if (hasTooltip) {
    const tooltipText = await tooltip.textContent();
    console.log(`  💡 ${buttonName} tooltip: "${tooltipText}"`);
  }
  
  return { isEnabled, buttonText, hasTooltip };
}

// Helper function to test modal opening and closing
async function testModalBehavior(page: Page, triggerSelector: string, modalName: string) {
  console.log(`🪟 Testing ${modalName} modal behavior...`);
  
  // Click trigger button
  await page.click(triggerSelector);
  await page.waitForTimeout(2000);
  
  // Check if modal opened
  const modal = page.locator('[role="dialog"], .modal, .fixed.inset-0');
  const modalCount = await modal.count();
  
  if (modalCount > 0) {
    console.log(`  ✅ ${modalName} modal opened successfully`);
    
    // Test modal visibility and content
    await expect(modal).toBeVisible();
    
    // Check for modal header
    const modalHeader = modal.locator('h1, h2, h3, .modal-header');
    if (await modalHeader.count() > 0) {
      const headerText = await modalHeader.textContent();
      console.log(`  📋 Modal header: "${headerText}"`);
    }
    
    // Test multiple ways to close modal
    console.log(`  🔄 Testing modal close methods...`);
    
    // Method 1: Close button
    const closeButton = modal.locator('button:has-text("×"), button:has-text("Close"), [aria-label*="close"]');
    if (await closeButton.count() > 0) {
      console.log(`    ✅ Close button found`);
    }
    
    // Method 2: ESC key
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Check if modal closed
    const modalStillVisible = await modal.isVisible().catch(() => false);
    if (modalStillVisible) {
      // Try clicking close button if ESC didn't work
      if (await closeButton.count() > 0) {
        await closeButton.first().click();
        await page.waitForTimeout(500);
      } else {
        // Click outside modal to close
        await page.click('body', { position: { x: 50, y: 50 } });
        await page.waitForTimeout(500);
      }
    }
    
    console.log(`  ✅ ${modalName} modal close behavior tested`);
    return true;
  } else {
    console.log(`  ❌ ${modalName} modal did not open`);
    return false;
  }
}

test.describe('Recipe Generation Buttons Comprehensive Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAsAdmin(page);
    await navigateToAdminTab(page);
  });

  test('Generate New Batch Button - All Interactions', async ({ page }) => {
    console.log('🧪 Testing Generate New Batch Button - All Interactions');
    
    const generateButton = '[data-testid="admin-generate-recipes"]';
    
    // Test button states
    const buttonInfo = await testButtonStates(page, generateButton, 'Generate New Batch');
    
    // Test button click and modal opening
    const modalOpened = await testModalBehavior(page, generateButton, 'Recipe Generation');
    
    if (modalOpened) {
      // Reopen modal to test internal elements
      await page.click(generateButton);
      await page.waitForTimeout(2000);
      
      const modal = page.locator('[role="dialog"], .modal, .fixed.inset-0');
      await expect(modal).toBeVisible();
      
      console.log('🔍 Testing Recipe Generation Modal internal elements...');
      
      // Test recipe count selector
      console.log('  📊 Testing recipe count selector...');
      const countSelector = modal.locator('select').first();
      if (await countSelector.count() > 0) {
        await countSelector.click();
        
        // Get all options
        const options = await page.locator('option').all();
        console.log(`    Found ${options.length} count options:`);
        
        for (let i = 0; i < Math.min(options.length, 10); i++) {
          const optionValue = await options[i].getAttribute('value');
          const optionText = await options[i].textContent();
          console.log(`      ${i + 1}: ${optionText} (value: ${optionValue})`);
        }
        
        // Test selecting different values
        const testValues = ['5', '10', '20'];
        for (const value of testValues) {
          try {
            await countSelector.selectOption(value);
            await page.waitForTimeout(300);
            console.log(`    ✅ Selected recipe count: ${value}`);
          } catch (error) {
            console.log(`    ⚠️ Could not select value ${value}: ${error}`);
          }
        }
      }
      
      // Test Quick Generation button
      console.log('  ⚡ Testing Quick Generation button...');
      const quickGenButton = modal.locator('button:has-text("Generate Random"), button:has-text("Quick")');
      if (await quickGenButton.count() > 0) {
        await testButtonStates(page, 'button:has-text("Generate Random")', 'Quick Generation');
        
        // Test click (but don't actually trigger generation)
        const isEnabled = await quickGenButton.isEnabled();
        if (isEnabled) {
          console.log(`    ⚡ Quick Generation button is ready to use`);
        }
      }
      
      // Test Natural Language input
      console.log('  💬 Testing Natural Language input...');
      const nlTextarea = modal.locator('textarea');
      if (await nlTextarea.count() > 0) {
        const placeholder = await nlTextarea.getAttribute('placeholder');
        console.log(`    📝 Natural Language placeholder: "${placeholder}"`);
        
        // Test typing
        const testPrompt = 'High protein breakfast recipes for muscle gain, around 400 calories';
        await nlTextarea.fill(testPrompt);
        await page.waitForTimeout(500);
        
        const inputValue = await nlTextarea.inputValue();
        console.log(`    ✅ Natural language input works: "${inputValue.substring(0, 50)}..."`);
        
        // Clear input
        await nlTextarea.clear();
      }
      
      // Test all dropdown selectors in the form
      console.log('  📋 Testing all form dropdowns...');
      const dropdowns = await modal.locator('select, [role="combobox"]').all();
      console.log(`    Found ${dropdowns.length} dropdown elements`);
      
      const dropdownLabels = [
        'Fitness Goal',
        'Meal Type', 
        'Dietary',
        'Max Prep Time',
        'Max Calories'
      ];
      
      for (let i = 0; i < Math.min(dropdowns.length, dropdownLabels.length); i++) {
        try {
          const dropdown = dropdowns[i];
          const label = dropdownLabels[i] || `Dropdown ${i + 1}`;
          
          console.log(`    🔽 Testing ${label} dropdown...`);
          
          await dropdown.click();
          await page.waitForTimeout(500);
          
          // Get options
          const options = await page.locator('option, [role="option"]').all();
          console.log(`      Found ${options.length} options for ${label}`);
          
          if (options.length > 1) {
            // Select second option (first is usually "All" or default)
            await options[1].click();
            await page.waitForTimeout(300);
            console.log(`      ✅ Selected option in ${label}`);
          }
        } catch (error) {
          console.log(`    ⚠️ Error testing dropdown ${i + 1}: ${error}`);
        }
      }
      
      // Test numeric inputs (macro nutrients)
      console.log('  🔢 Testing numeric inputs...');
      const numberInputs = await modal.locator('input[type="number"]').all();
      console.log(`    Found ${numberInputs.length} number inputs`);
      
      const testValues = ['25', '50', '15', '30', '10', '20'];
      for (let i = 0; i < Math.min(numberInputs.length, testValues.length); i++) {
        try {
          const input = numberInputs[i];
          const testValue = testValues[i];
          
          if (await input.isVisible() && await input.isEnabled()) {
            await input.fill(testValue);
            await page.waitForTimeout(200);
            
            const inputValue = await input.inputValue();
            console.log(`      ✅ Numeric input ${i + 1}: ${inputValue}`);
            
            // Clear for next test
            await input.clear();
          }
        } catch (error) {
          console.log(`    ⚠️ Error testing numeric input ${i + 1}: ${error}`);
        }
      }
      
      // Test main ingredient input
      console.log('  🥄 Testing main ingredient input...');
      const ingredientInput = modal.locator('input[placeholder*="ingredient" i]');
      if (await ingredientInput.count() > 0) {
        const testIngredients = ['chicken', 'salmon', 'quinoa', 'tofu'];
        
        for (const ingredient of testIngredients) {
          await ingredientInput.fill(ingredient);
          await page.waitForTimeout(300);
          
          const value = await ingredientInput.inputValue();
          console.log(`    🥄 Tested ingredient: ${value}`);
          
          await ingredientInput.clear();
        }
      }
      
      // Test main generation button
      console.log('  🎯 Testing main generation button...');
      const mainGenButton = modal.locator('button:has-text("Generate Targeted"), button:has-text("Generate Context")');
      if (await mainGenButton.count() > 0) {
        await testButtonStates(page, 'button:has-text("Generate Targeted")', 'Generate Targeted');
        
        // Check if button becomes disabled when clicked
        const wasEnabled = await mainGenButton.isEnabled();
        if (wasEnabled) {
          console.log(`    🎯 Main generation button is ready for testing`);
          // Note: We don't actually click to avoid triggering real generation
        }
      }
      
      // Close modal
      const closeButton = modal.locator('button:has-text("×"), button:has-text("Close")');
      if (await closeButton.count() > 0) {
        await closeButton.click();
      } else {
        await page.keyboard.press('Escape');
      }
      
      await page.waitForTimeout(500);
    }
    
    console.log('✅ Generate New Batch Button testing completed');
  });

  test('Review Recipe Queue Button - All Interactions', async ({ page }) => {
    console.log('🧪 Testing Review Recipe Queue Button - All Interactions');
    
    const pendingButton = '[data-testid="admin-view-pending"]';
    
    // Test button states
    const buttonInfo = await testButtonStates(page, pendingButton, 'Review Recipe Queue');
    
    // Check if button shows pending count
    const buttonText = buttonInfo.buttonText || '';
    const countMatch = buttonText.match(/\((\d+)\)/);
    if (countMatch) {
      const pendingCount = countMatch[1];
      console.log(`  📊 Pending recipes count: ${pendingCount}`);
    }
    
    // Test button click and modal opening
    const modalOpened = await testModalBehavior(page, pendingButton, 'Pending Recipes');
    
    if (modalOpened) {
      // Reopen modal to test internal elements
      await page.click(pendingButton);
      await page.waitForTimeout(2000);
      
      const modal = page.locator('[role="dialog"], .modal, .fixed.inset-0');
      if (await modal.count() > 0) {
        console.log('🔍 Testing Pending Recipes Modal internal elements...');
        
        // Test table/list display
        const table = modal.locator('table, .recipe-list, [data-testid*="pending"]');
        if (await table.count() > 0) {
          console.log('  📋 Pending recipes table/list found');
          
          // Test table headers
          const headers = await modal.locator('th, .header, [data-testid*="header"]').all();
          console.log(`    Found ${headers.length} table headers`);
          
          for (let i = 0; i < Math.min(headers.length, 6); i++) {
            const headerText = await headers[i].textContent();
            console.log(`      Header ${i + 1}: "${headerText?.trim()}"`);
          }
          
          // Test recipe rows
          const rows = await modal.locator('tr, .recipe-row, [data-testid*="recipe"]').all();
          console.log(`    Found ${rows.length} recipe rows`);
          
          if (rows.length > 0) {
            // Test approval buttons in first row
            const firstRow = rows[0];
            const approveButton = firstRow.locator('button:has-text("Approve"), button[title*="approve" i]');
            const rejectButton = firstRow.locator('button:has-text("Reject"), button[title*="reject" i]');
            
            if (await approveButton.count() > 0) {
              console.log('    ✅ Approve button found in recipe row');
              await testButtonStates(page, 'button:has-text("Approve")', 'Recipe Approve');
            }
            
            if (await rejectButton.count() > 0) {
              console.log('    ❌ Reject button found in recipe row');
              await testButtonStates(page, 'button:has-text("Reject")', 'Recipe Reject');
            }
            
            // Test recipe details link/button
            const detailsButton = firstRow.locator('button:has-text("View"), a:has-text("Details")');
            if (await detailsButton.count() > 0) {
              console.log('    👁️ View details button found');
              await testButtonStates(page, 'button:has-text("View")', 'Recipe Details');
            }
          }
        } else {
          console.log('  📭 No pending recipes table found (may be empty)');
        }
        
        // Test bulk actions if present
        const bulkActions = modal.locator('[data-testid*="bulk"], .bulk-actions');
        if (await bulkActions.count() > 0) {
          console.log('  📦 Testing bulk actions...');
          
          const selectAllButton = modal.locator('button:has-text("Select All"), input[type="checkbox"][data-testid*="all"]');
          if (await selectAllButton.count() > 0) {
            console.log('    ☑️ Select All functionality found');
          }
          
          const bulkApproveButton = modal.locator('button:has-text("Approve Selected"), button:has-text("Bulk Approve")');
          if (await bulkApproveButton.count() > 0) {
            console.log('    ✅ Bulk Approve functionality found');
          }
        }
        
        // Close modal
        const closeButton = modal.locator('button:has-text("×"), button:has-text("Close")');
        if (await closeButton.count() > 0) {
          await closeButton.click();
        } else {
          await page.keyboard.press('Escape');
        }
      }
    }
    
    console.log('✅ Review Recipe Queue Button testing completed');
  });

  test('Export Recipe Data Button - All Interactions', async ({ page }) => {
    console.log('🧪 Testing Export Recipe Data Button - All Interactions');
    
    const exportButton = '[data-testid="admin-export-data"]';
    
    // Test button states
    const buttonInfo = await testButtonStates(page, exportButton, 'Export Recipe Data');
    
    // Test button click and modal opening
    const modalOpened = await testModalBehavior(page, exportButton, 'Export Data');
    
    if (modalOpened) {
      // Reopen modal to test internal elements
      await page.click(exportButton);
      await page.waitForTimeout(2000);
      
      const modal = page.locator('[role="dialog"], .modal, .fixed.inset-0');
      if (await modal.count() > 0) {
        console.log('🔍 Testing Export Data Modal internal elements...');
        
        // Test export options
        const exportOptions = await modal.locator('input[type="checkbox"], input[type="radio"]').all();
        console.log(`  Found ${exportOptions.length} export options`);
        
        for (let i = 0; i < Math.min(exportOptions.length, 8); i++) {
          const option = exportOptions[i];
          const label = await page.locator(`label[for="${await option.getAttribute('id')}"]`).textContent();
          const type = await option.getAttribute('type');
          
          console.log(`    ${type === 'checkbox' ? '☑️' : '⚪'} Option ${i + 1}: "${label}"`);
          
          // Test clicking option
          if (await option.isVisible() && await option.isEnabled()) {
            await option.click();
            await page.waitForTimeout(200);
            
            const isChecked = await option.isChecked();
            console.log(`      State after click: ${isChecked ? 'checked' : 'unchecked'}`);
            
            // Click again to test toggle
            await option.click();
            await page.waitForTimeout(200);
          }
        }
        
        // Test export format options
        const formatSelector = modal.locator('select, [role="combobox"]');
        if (await formatSelector.count() > 0) {
          console.log('  📁 Testing export format selector...');
          
          await formatSelector.click();
          const formatOptions = await page.locator('option, [role="option"]').all();
          
          for (let i = 0; i < Math.min(formatOptions.length, 5); i++) {
            const optionText = await formatOptions[i].textContent();
            console.log(`    Format option ${i + 1}: "${optionText}"`);
          }
          
          // Select JSON format if available
          const jsonOption = page.locator('option:has-text("JSON"), [role="option"]:has-text("JSON")');
          if (await jsonOption.count() > 0) {
            await jsonOption.click();
            console.log('    ✅ Selected JSON format');
          }
        }
        
        // Test date range picker if present
        const dateInputs = await modal.locator('input[type="date"], input[type="datetime-local"]').all();
        if (dateInputs.length > 0) {
          console.log('  📅 Testing date range inputs...');
          
          const startDate = '2024-01-01';
          const endDate = '2024-12-31';
          
          if (dateInputs.length >= 1) {
            await dateInputs[0].fill(startDate);
            console.log(`    📅 Start date set: ${startDate}`);
          }
          
          if (dateInputs.length >= 2) {
            await dateInputs[1].fill(endDate);
            console.log(`    📅 End date set: ${endDate}`);
          }
        }
        
        // Test main export button
        const mainExportButton = modal.locator('button:has-text("Export"), button:has-text("Download")');
        if (await mainExportButton.count() > 0) {
          console.log('  📤 Testing main export button...');
          await testButtonStates(page, 'button:has-text("Export")', 'Main Export');
          
          // Note: We don't actually click to avoid triggering real download
          const isEnabled = await mainExportButton.isEnabled();
          if (isEnabled) {
            console.log('    📤 Export button is ready for download');
          }
        }
        
        // Test preview functionality if present
        const previewButton = modal.locator('button:has-text("Preview"), button:has-text("Show Preview")');
        if (await previewButton.count() > 0) {
          console.log('  👁️ Testing preview functionality...');
          await previewButton.click();
          await page.waitForTimeout(1000);
          
          // Check for preview content
          const previewArea = modal.locator('.preview, [data-testid*="preview"], pre, code');
          if (await previewArea.count() > 0) {
            console.log('    ✅ Preview content displayed');
            
            const previewText = await previewArea.textContent();
            console.log(`    📝 Preview length: ${previewText?.length || 0} characters`);
          }
        }
        
        // Close modal
        const closeButton = modal.locator('button:has-text("×"), button:has-text("Close"), button:has-text("Cancel")');
        if (await closeButton.count() > 0) {
          await closeButton.click();
        } else {
          await page.keyboard.press('Escape');
        }
      }
    }
    
    console.log('✅ Export Recipe Data Button testing completed');
  });

  test('Recipe Generation Progress and Loading States', async ({ page }) => {
    console.log('🧪 Testing Recipe Generation Progress and Loading States');
    
    // Navigate to admin tab and open generation modal
    await page.click('[data-testid="admin-generate-recipes"]');
    await page.waitForTimeout(2000);
    
    const modal = page.locator('[role="dialog"], .modal, .fixed.inset-0');
    await expect(modal).toBeVisible();
    
    // Set up minimal form data
    const countSelector = modal.locator('select').first();
    if (await countSelector.count() > 0) {
      await countSelector.selectOption('2'); // Small number for testing
    }
    
    console.log('⏳ Testing loading states and button behavior...');
    
    // Test button states before generation
    const quickGenButton = modal.locator('button:has-text("Generate Random")');
    const mainGenButton = modal.locator('button:has-text("Generate Targeted")');
    
    if (await quickGenButton.count() > 0) {
      console.log('  ⚡ Quick Generation button states:');
      console.log(`    Enabled: ${await quickGenButton.isEnabled()}`);
      console.log(`    Text: "${await quickGenButton.textContent()}"`);
      
      // Test hover state
      await quickGenButton.hover();
      await page.waitForTimeout(300);
    }
    
    if (await mainGenButton.count() > 0) {
      console.log('  🎯 Main Generation button states:');
      console.log(`    Enabled: ${await mainGenButton.isEnabled()}`);
      console.log(`    Text: "${await mainGenButton.textContent()}"`);
      
      // Test hover state
      await mainGenButton.hover();
      await page.waitForTimeout(300);
    }
    
    // Test form validation before submission
    console.log('  📝 Testing form validation states...');
    
    // Clear required fields and check validation
    const textInputs = await modal.locator('input[type="text"], textarea').all();
    for (const input of textInputs) {
      if (await input.isVisible()) {
        await input.clear();
        await input.blur(); // Trigger validation
        await page.waitForTimeout(200);
      }
    }
    
    // Check for validation messages
    const validationMessages = await modal.locator('.error, [role="alert"], .text-red-500, .text-destructive').count();
    console.log(`    Found ${validationMessages} validation messages`);
    
    // Test progress indicators (if any exist)
    console.log('  📊 Looking for progress indicators...');
    
    const progressBars = await modal.locator('[role="progressbar"], .progress, .progress-bar').count();
    const loadingSpinners = await modal.locator('.spinner, .animate-spin, [data-testid*="loading"]').count();
    const stepIndicators = await modal.locator('.step, .stepper, [data-testid*="step"]').count();
    
    console.log(`    Progress bars: ${progressBars}`);
    console.log(`    Loading spinners: ${loadingSpinners}`);  
    console.log(`    Step indicators: ${stepIndicators}`);
    
    // Test modal responsiveness to viewport changes
    console.log('  📱 Testing modal responsiveness...');
    
    const originalViewport = page.viewportSize();
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    const modalVisibleMobile = await modal.isVisible();
    console.log(`    Modal visible on mobile: ${modalVisibleMobile}`);
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    
    const modalVisibleTablet = await modal.isVisible();
    console.log(`    Modal visible on tablet: ${modalVisibleTablet}`);
    
    // Restore original viewport
    if (originalViewport) {
      await page.setViewportSize(originalViewport);
      await page.waitForTimeout(500);
    }
    
    // Test keyboard navigation within modal
    console.log('  ⌨️ Testing keyboard navigation...');
    
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
    
    for (let i = 0; i < 10; i++) {
      const activeElement = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? `${el.tagName}${el.type ? `[${el.type}]` : ''}` : 'none';
      });
      
      console.log(`    Tab ${i + 1}: ${activeElement}`);
      
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);
    }
    
    // Test Escape key to close
    console.log('  🔐 Testing Escape key close...');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    const modalClosedByEscape = !await modal.isVisible().catch(() => true);
    console.log(`    Modal closed by Escape: ${modalClosedByEscape}`);
    
    console.log('✅ Recipe Generation Progress and Loading States testing completed');
  });

  test('Edge Cases and Error Handling', async ({ page }) => {
    console.log('🧪 Testing Edge Cases and Error Handling');
    
    // Test rapid clicking on generation buttons
    console.log('🔄 Testing rapid clicking behavior...');
    
    const generateButton = '[data-testid="admin-generate-recipes"]';
    
    for (let i = 0; i < 5; i++) {
      await page.click(generateButton, { force: true });
      await page.waitForTimeout(100);
    }
    
    // Check if multiple modals opened (should not happen)
    const modalCount = await page.locator('[role="dialog"], .modal, .fixed.inset-0').count();
    console.log(`  Modals open after rapid clicking: ${modalCount}`);
    
    // Close any open modals
    for (let i = 0; i < modalCount; i++) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
    
    // Test button interaction while page is loading
    console.log('⏳ Testing interaction during page load...');
    
    // Navigate away and back quickly
    await page.goto('/admin/analytics');
    await page.waitForTimeout(500);
    
    // Try to click button before page fully loads
    await page.goto('/admin');
    await page.click('[data-testid="admin-tab-admin"]', { timeout: 1000 });
    
    // Immediately try to click generate button
    try {
      await page.click(generateButton, { timeout: 2000 });
      console.log('  ✅ Button clickable during page load');
    } catch (error) {
      console.log(`  ⚠️ Button not immediately clickable: ${error}`);
    }
    
    // Close any modals
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Test browser navigation while modal is open
    console.log('🔄 Testing browser navigation with open modal...');
    
    await page.click(generateButton);
    await page.waitForTimeout(1000);
    
    const modal = page.locator('[role="dialog"], .modal, .fixed.inset-0');
    const modalOpened = await modal.count() > 0;
    
    if (modalOpened) {
      console.log('  📱 Modal opened, testing navigation...');
      
      // Try browser back button
      await page.goBack();
      await page.waitForTimeout(1000);
      
      // Check if modal handled navigation properly
      const currentUrl = page.url();
      console.log(`  Current URL after back: ${currentUrl}`);
      
      // Go forward again
      await page.goForward();
      await page.waitForTimeout(1000);
    }
    
    // Test network interruption simulation
    console.log('🌐 Testing network interruption handling...');
    
    // Navigate to admin tab fresh
    await navigateToAdminTab(page);
    
    // Open modal
    await page.click(generateButton);
    await page.waitForTimeout(1000);
    
    // Simulate slow network
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 2000);
    });
    
    // Try to interact with modal elements
    const modalAfterDelay = page.locator('[role="dialog"], .modal, .fixed.inset-0');
    if (await modalAfterDelay.count() > 0) {
      const quickButton = modalAfterDelay.locator('button:has-text("Generate Random")');
      if (await quickButton.count() > 0) {
        await quickButton.click();
        console.log('  ⚠️ Tested button click with network delay');
      }
    }
    
    // Remove network delay
    await page.unroute('**/*');
    
    // Close modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    console.log('✅ Edge Cases and Error Handling testing completed');
  });

  test.afterEach(async ({ page }) => {
    // Take screenshot for debugging
    const testName = test.info().title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    await page.screenshot({ 
      path: `test-results/recipe-generation-${testName}.png`, 
      fullPage: true 
    });
    
    // Close any open modals
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  });
});