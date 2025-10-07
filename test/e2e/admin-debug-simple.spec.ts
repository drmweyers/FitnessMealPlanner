/**
 * Simple Admin Debug Test - Just login and take screenshots
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin, takeTestScreenshot } from './auth-helper';

test('Debug Admin Interface', async ({ page }) => {
  // Login as admin
  await loginAsAdmin(page);
  
  // Take initial screenshot
  await takeTestScreenshot(page, 'admin-dashboard-full.png', 'Full admin dashboard');
  
  // Check what tabs/buttons are available
  const allButtons = await page.locator('button').all();
  console.log(`Found ${allButtons.length} buttons on page`);
  
  for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
    const button = allButtons[i];
    const text = await button.textContent();
    const value = await button.getAttribute('value');
    const dataValue = await button.getAttribute('data-value');
    console.log(`Button ${i}: text="${text}", value="${value}", data-value="${dataValue}"`);
  }
  
  // Check for any elements that might be tab containers
  const tabElements = [
    '[role="tablist"]',
    '.tabs',
    '[data-testid="tabs"]',
    '.tab-container'
  ];
  
  for (const selector of tabElements) {
    const elements = await page.locator(selector).all();
    if (elements.length > 0) {
      console.log(`Found ${elements.length} tab elements with selector: ${selector}`);
      for (let i = 0; i < elements.length; i++) {
        const text = await elements[i].textContent();
        console.log(`  Tab element ${i}: ${text?.substring(0, 100)}`);
      }
    }
  }
  
  // Look for recipe-related content
  const recipeElements = await page.locator('text*="recipe", text*="Recipe"').all();
  console.log(`Found ${recipeElements.length} recipe-related elements`);
  
  for (let i = 0; i < Math.min(recipeElements.length, 5); i++) {
    const text = await recipeElements[i].textContent();
    console.log(`Recipe element ${i}: ${text}`);
  }
  
  console.log('✅ Debug complete - check screenshots for visual inspection');
});