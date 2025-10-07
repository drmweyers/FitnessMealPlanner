import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4000';

test('Check delete button visibility', async ({ page }) => {
  // Go directly to login
  await page.goto(`${BASE_URL}/login`);
  
  // Login as customer
  await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
  await page.fill('input[type="password"]', 'TestCustomer123!');
  await page.click('button[type="submit"]');
  
  // Wait for redirect
  await page.waitForTimeout(3000);
  
  // Take screenshot to see what's on the page
  await page.screenshot({ path: 'customer-dashboard.png', fullPage: true });
  
  // Log the URL we're on
  console.log('Current URL:', page.url());
  
  // Try different selectors to find delete buttons
  const deleteButton1 = await page.locator('button[aria-label="Delete meal plan"]').count();
  console.log('Delete buttons with aria-label:', deleteButton1);
  
  const deleteButton2 = await page.locator('button:has(svg.lucide-trash-2)').count();
  console.log('Delete buttons with trash icon (lucide-trash-2):', deleteButton2);
  
  const deleteButton3 = await page.locator('button:has(svg[class*="Trash"])').count();
  console.log('Delete buttons with Trash in class:', deleteButton3);
  
  // Check for any buttons in the cards
  const allButtons = await page.locator('.group.hover\\:shadow-lg button').count();
  console.log('All buttons in meal plan cards:', allButtons);
  
  // Get all button texts/aria-labels
  const buttons = await page.locator('.group.hover\\:shadow-lg button').all();
  for (let i = 0; i < buttons.length; i++) {
    const ariaLabel = await buttons[i].getAttribute('aria-label');
    const text = await buttons[i].textContent();
    console.log(`Button ${i}: aria-label="${ariaLabel}", text="${text}"`);
  }
  
  // Check the HTML of the first card
  const firstCard = await page.locator('.group.hover\\:shadow-lg').first();
  const cardHtml = await firstCard.innerHTML();
  console.log('First card HTML (first 500 chars):', cardHtml.substring(0, 500));
});