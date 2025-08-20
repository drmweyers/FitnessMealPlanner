/**
 * Quick Admin Button Test - Focused test to check View Pending button
 */

import { test, expect } from '@playwright/test';

const ADMIN_CREDENTIALS = {
  email: 'admin@fitmeal.pro',
  password: 'AdminPass123'
};

test('Quick Admin Button Check', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
  await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/admin');
  
  // Navigate to admin section
  await page.click('button[data-value="admin"]');
  await page.waitForTimeout(2000);
  
  // Screenshot admin section
  await page.screenshot({ path: 'test-screenshots/quick-admin-section.png' });
  
  // Test View Pending button
  console.log('🔍 Looking for View Pending button...');
  const viewPendingBtn = page.locator('button:has-text("View Pending")');
  const isVisible = await viewPendingBtn.isVisible();
  console.log(`View Pending button visible: ${isVisible}`);
  
  if (isVisible) {
    await page.screenshot({ path: 'test-screenshots/before-pending-click.png' });
    
    // Click the View Pending button
    await viewPendingBtn.click();
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'test-screenshots/after-pending-click.png' });
    
    // Check for modal or content
    const modal = page.locator('.modal, [role="dialog"]');
    const modalVisible = await modal.isVisible();
    console.log(`Modal appeared after View Pending click: ${modalVisible}`);
    
    if (modalVisible) {
      console.log('✅ View Pending button works - modal appeared');
    } else {
      console.log('❌ No modal appeared after View Pending click');
    }
  }
});