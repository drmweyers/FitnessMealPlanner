import { test, expect } from '@playwright/test';
import { loginAsTrainer } from './auth-helper';

test('debug PDF button behavior', async ({ page }) => {
  // Login as trainer first
  await loginAsTrainer(page);
  
  // Navigate to customers tab
  await page.click('text=Customers');
  await page.waitForTimeout(1000);
  
  // Click on test customer  
  await page.click('text=customer.test@evofitmeals.com');
  await page.waitForTimeout(2000);
  
  // Find meal plan items
  const mealPlanItems = page.locator('.bg-gray-50.rounded-lg.hover\\:bg-gray-100');
  const firstItem = mealPlanItems.first();
  
  // Find the PDF button (button with SVG)
  const pdfButton = firstItem.locator('button:has(svg)');
  await expect(pdfButton).toBeVisible();
  
  console.log('PDF button found and visible');
  await page.screenshot({ path: 'debug-before-pdf-click.png' });
  
  // Click ONLY the PDF button (not the whole item)
  console.log('Clicking PDF button...');
  await pdfButton.click();
  await page.waitForTimeout(2000);
  
  // Check if modal opened (it shouldn't if PDF button works correctly)
  const modal = page.locator('[role="dialog"]');
  const isModalVisible = await modal.isVisible();
  console.log('Modal visible after PDF button click:', isModalVisible);
  
  await page.screenshot({ path: 'debug-after-pdf-click.png' });
  
  // If modal is visible, close it first
  if (isModalVisible) {
    console.log('Modal opened when it should not have - this indicates the bug!');
    const closeButton = page.locator('[role="dialog"] button', { hasText: /close|×|✕/i }).first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
      await page.waitForTimeout(1000);
    } else {
      // Try clicking outside modal
      await page.click('body');
    }
  }
  
  // Now test clicking the meal plan item itself (should open modal)
  console.log('Now clicking meal plan item itself...');
  await firstItem.click();
  await page.waitForTimeout(1000);
  
  const modalAfterItemClick = await page.locator('[role="dialog"]').isVisible();
  console.log('Modal visible after meal plan item click:', modalAfterItemClick);
  
  await page.screenshot({ path: 'debug-after-item-click.png' });
});