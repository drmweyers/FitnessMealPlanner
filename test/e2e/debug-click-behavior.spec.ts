import { test, expect } from '@playwright/test';
import { loginAsTrainer } from './auth-helper';

test('debug click behavior', async ({ page }) => {
  // Login as trainer first
  await loginAsTrainer(page);
  
  // Navigate to customers tab
  await page.click('text=Customers');
  await page.waitForTimeout(1000);
  
  // Click on test customer  
  await page.click('text=customer.test@evofitmeals.com');
  await page.waitForTimeout(2000);
  
  // Take screenshot before interaction
  await page.screenshot({ path: 'debug-before-click.png' });
  
  // Find meal plan items
  const mealPlanItems = page.locator('.bg-gray-50.rounded-lg.hover\\:bg-gray-100');
  const count = await mealPlanItems.count();
  console.log(`Found ${count} meal plan items`);
  
  if (count > 0) {
    const firstItem = mealPlanItems.first();
    
    // Get text content of first item
    const itemText = await firstItem.textContent();
    console.log('First meal plan item text:', itemText);
    
    // Look for PDF button within this item
    const pdfButtonSelectors = [
      'button:has-text("PDF")',
      'button[title*="PDF"]', 
      'button:has(svg)',
      '.download, .export',
      'button'
    ];
    
    for (const selector of pdfButtonSelectors) {
      const pdfButtons = await firstItem.locator(selector).count();
      console.log(`PDF buttons in item with selector '${selector}': ${pdfButtons}`);
    }
    
    // Check all buttons in the first item
    const allButtons = await firstItem.locator('button').count();
    console.log(`Total buttons in first item: ${allButtons}`);
    
    if (allButtons > 0) {
      // Get info about each button
      const buttons = await firstItem.locator('button').all();
      for (let i = 0; i < buttons.length; i++) {
        const buttonText = await buttons[i].textContent();
        const buttonClass = await buttons[i].getAttribute('class');
        console.log(`Button ${i + 1}: text="${buttonText}", class="${buttonClass}"`);
      }
    }
    
    // Try clicking the meal plan item itself (should open modal)
    console.log('Clicking meal plan item...');
    await firstItem.click();
    await page.waitForTimeout(1000);
    
    // Check if modal opened
    const modalSelectors = [
      '[role="dialog"]',
      '.modal',
      '.fixed.inset-0',
      '[data-testid="meal-plan-modal"]'
    ];
    
    for (const selector of modalSelectors) {
      const modalExists = await page.locator(selector).isVisible();
      console.log(`Modal with selector '${selector}': ${modalExists}`);
    }
    
    await page.screenshot({ path: 'debug-after-click.png' });
  }
});