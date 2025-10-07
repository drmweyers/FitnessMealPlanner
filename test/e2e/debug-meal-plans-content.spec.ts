import { test, expect } from '@playwright/test';
import { loginAsTrainer } from './auth-helper';

test('debug meal plans content', async ({ page }) => {
  // Login as trainer first
  await loginAsTrainer(page);
  
  // Navigate to customers tab
  await page.click('text=Customers');
  await page.waitForTimeout(1000);
  
  // Click on test customer  
  await page.click('text=customer.test@evofitmeals.com');
  await page.waitForTimeout(2000);
  
  // Look for Recent Meal Plans section
  const recentMealPlansSection = page.locator('text=Recent Meal Plans').first();
  await expect(recentMealPlansSection).toBeVisible();
  
  // Take screenshot of customer detail page
  await page.screenshot({ path: 'debug-customer-detail-full.png' });
  
  // Look for meal plan items using various selectors
  const mealPlanSelectors = [
    '.bg-gray-50.rounded-lg.hover\\:bg-gray-100',
    '.bg-gray-50.rounded-lg',
    '.bg-gray-50',
    '[data-testid="recent-meal-plan-item"]',
    '.font-medium',
    'h5.font-medium'
  ];
  
  for (const selector of mealPlanSelectors) {
    const elements = await page.locator(selector).count();
    console.log(`Elements found for '${selector}': ${elements}`);
  }
  
  // Look for any clickable elements in the recent meal plans area
  const clickableElements = await page.locator('.cursor-pointer').count();
  console.log('Clickable elements found:', clickableElements);
  
  // Look for PDF buttons
  const pdfButtons = await page.locator('button:has-text("PDF"), [data-testid="pdf-export-button"]').count();
  console.log('PDF buttons found:', pdfButtons);
  
  // Check if there's a "No meal plans" message
  const noMealPlansMessage = page.locator('text=No meal plans, text=no meal plans assigned');
  const hasNoMealPlansMessage = await noMealPlansMessage.isVisible();
  console.log('Has no meal plans message:', hasNoMealPlansMessage);
  
  // Get all text content from the Recent Meal Plans area
  const recentMealPlansCard = page.locator('.card:has(h3:text("Recent Meal Plans"), h2:text("Recent Meal Plans"), [title*="Recent Meal Plans"])').first();
  const cardText = await recentMealPlansCard.textContent();
  console.log('Recent Meal Plans card content:', cardText);
});