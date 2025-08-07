import { test, expect } from '@playwright/test';

/**
 * UI Content Verification Test
 * This test captures what text is actually displayed on the pages
 * to help debug the comprehensive test failures
 */

const BASE_URL = 'http://localhost:4000';

const TEST_ACCOUNTS = {
  trainer: {
    email: 'trainer.test@evofitmeals.com',
    password: 'TestTrainer123!',
  },
  customer: {
    email: 'customer.test@evofitmeals.com', 
    password: 'TestCustomer123!',
  }
};

test.describe('UI Content Verification', () => {
  test('Capture trainer dashboard content', async ({ page }) => {
    console.log('🔍 Capturing trainer dashboard content...');
    
    // Login as trainer
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', TEST_ACCOUNTS.trainer.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_ACCOUNTS.trainer.password);
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await page.waitForLoadState('networkidle');
    console.log('Current URL after trainer login:', page.url());
    
    // Capture all text content
    const allText = await page.textContent('body');
    console.log('=== TRAINER DASHBOARD CONTENT ===');
    console.log('Full page text:', allText);
    
    // Capture all headings
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    console.log('=== TRAINER DASHBOARD HEADINGS ===');
    headings.forEach((heading, index) => {
      console.log(`H${index + 1}: "${heading}"`);
    });
    
    // Capture all buttons
    const buttons = await page.locator('button').allTextContents();
    console.log('=== TRAINER DASHBOARD BUTTONS ===');
    buttons.forEach((button, index) => {
      console.log(`Button ${index + 1}: "${button}"`);
    });
    
    // Capture navigation elements
    const navElements = await page.locator('nav a, .nav a, .navigation a').allTextContents();
    console.log('=== TRAINER DASHBOARD NAVIGATION ===');
    navElements.forEach((nav, index) => {
      console.log(`Nav ${index + 1}: "${nav}"`);
    });
    
    // Take screenshot
    await page.screenshot({ path: 'test/screenshots/trainer-content-verification.png', fullPage: true });
  });

  test('Capture customer dashboard content', async ({ page }) => {
    console.log('🔍 Capturing customer dashboard content...');
    
    // Login as customer
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', TEST_ACCOUNTS.customer.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_ACCOUNTS.customer.password);
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await page.waitForLoadState('networkidle');
    console.log('Current URL after customer login:', page.url());
    
    // Capture all text content
    const allText = await page.textContent('body');
    console.log('=== CUSTOMER DASHBOARD CONTENT ===');
    console.log('Full page text:', allText);
    
    // Capture all headings
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    console.log('=== CUSTOMER DASHBOARD HEADINGS ===');
    headings.forEach((heading, index) => {
      console.log(`H${index + 1}: "${heading}"`);
    });
    
    // Look for meal plan specific elements
    const mealPlanElements = await page.locator('[class*="meal"], [class*="plan"], [id*="meal"], [id*="plan"]').allTextContents();
    console.log('=== CUSTOMER MEAL PLAN ELEMENTS ===');
    mealPlanElements.forEach((element, index) => {
      console.log(`Element ${index + 1}: "${element}"`);
    });
    
    // Take screenshot
    await page.screenshot({ path: 'test/screenshots/customer-content-verification.png', fullPage: true });
  });

  test('Test PDF export button existence', async ({ page }) => {
    console.log('🔍 Looking for PDF export functionality...');
    
    // Login as customer
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', TEST_ACCOUNTS.customer.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_ACCOUNTS.customer.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    // Look for any elements that might be PDF-related
    const allElements = await page.locator('*').all();
    const pdfRelatedElements = [];
    
    for (const element of allElements) {
      const text = await element.textContent();
      const attrs = await element.evaluate(el => {
        const attributes = {};
        for (const attr of el.attributes) {
          attributes[attr.name] = attr.value;
        }
        return attributes;
      });
      
      // Check if element contains PDF-related terms
      if (text && (text.toLowerCase().includes('pdf') || 
                   text.toLowerCase().includes('export') || 
                   text.toLowerCase().includes('download'))) {
        pdfRelatedElements.push({
          text: text.trim(),
          tag: await element.evaluate(el => el.tagName),
          attributes: attrs
        });
      }
    }
    
    console.log('=== PDF-RELATED ELEMENTS FOUND ===');
    pdfRelatedElements.forEach((element, index) => {
      console.log(`PDF Element ${index + 1}:`, JSON.stringify(element, null, 2));
    });
    
    // Also check for buttons with specific patterns
    const actionButtons = await page.locator('button, a, [role="button"]').all();
    const potentialActionButtons = [];
    
    for (const button of actionButtons) {
      const text = await button.textContent();
      if (text && text.trim()) {
        potentialActionButtons.push(text.trim());
      }
    }
    
    console.log('=== ALL ACTION BUTTONS ===');
    potentialActionButtons.forEach((button, index) => {
      console.log(`Action Button ${index + 1}: "${button}"`);
    });
  });
});