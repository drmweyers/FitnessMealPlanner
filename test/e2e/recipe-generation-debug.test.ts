import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4000';
const ADMIN_CREDENTIALS = {
  email: 'admin@fitmeal.pro',
  password: 'AdminPass123'
};

test.describe('Recipe Generation - Debug Real Issues', () => {
  
  test('Debug: Test actual recipe generation buttons and workflow', async ({ page }) => {
    console.log('🔍 Starting recipe generation debug test...');
    
    // Login as admin
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/admin', { timeout: 15000 });
    console.log('✅ Admin login successful');
    
    // Look for recipe generation buttons
    const recipeButtons = await page.locator('button').allTextContents();
    console.log('🔍 Found buttons:', recipeButtons.filter(text => text.toLowerCase().includes('recipe')));
    
    // Test Quick Random Generation button
    const quickGenerationButton = page.locator('button:has-text("Quick Random Generation")');
    const quickButtonExists = await quickGenerationButton.count();
    console.log(`🔍 Quick Random Generation button exists: ${quickButtonExists > 0}`);
    
    if (quickButtonExists > 0) {
      console.log('🔍 Testing Quick Random Generation button...');
      await quickGenerationButton.click();
      await page.waitForTimeout(2000);
      
      // Check for any error messages or modals
      const errorMessages = await page.locator('.error, .alert-error, [role="alert"]').allTextContents();
      if (errorMessages.length > 0) {
        console.log('❌ Errors found after clicking Quick Generation:', errorMessages);
      }
    }
    
    // Test Generate Random Recipes button
    const generateRandomButton = page.locator('button:has-text("Generate Random Recipes")');
    const generateButtonExists = await generateRandomButton.count();
    console.log(`🔍 Generate Random Recipes button exists: ${generateButtonExists > 0}`);
    
    if (generateButtonExists > 0) {
      console.log('🔍 Testing Generate Random Recipes button...');
      await generateRandomButton.click();
      await page.waitForTimeout(2000);
      
      // Check for any error messages or modals
      const errorMessages = await page.locator('.error, .alert-error, [role="alert"]').allTextContents();
      if (errorMessages.length > 0) {
        console.log('❌ Errors found after clicking Generate Random:', errorMessages);
      }
    }
    
    // Test Review Queue functionality
    const reviewQueueButton = page.locator('button:has-text("Review Queue")');
    const reviewButtonExists = await reviewQueueButton.count();
    console.log(`🔍 Review Queue button exists: ${reviewButtonExists > 0}`);
    
    if (reviewButtonExists > 0) {
      console.log('🔍 Testing Review Queue button...');
      await reviewQueueButton.click();
      await page.waitForTimeout(2000);
      
      // Check if we get 404 or any error
      const pageTitle = await page.title();
      const pageContent = await page.content();
      
      if (pageContent.includes('404') || pageContent.includes('Page Not Found')) {
        console.log('❌ Review Queue leads to 404 error');
      }
    }
    
    // Check console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(3000);
    
    if (consoleErrors.length > 0) {
      console.log('❌ Console errors found:', consoleErrors);
    }
    
    // Check network errors
    const networkErrors: string[] = [];
    page.on('response', (response) => {
      if (response.status() >= 400) {
        networkErrors.push(`${response.status()} ${response.url()}`);
      }
    });
    
    await page.waitForTimeout(2000);
    
    if (networkErrors.length > 0) {
      console.log('❌ Network errors found:', networkErrors);
    }
    
    console.log('🔍 Recipe generation debug test completed');
  });
  
  test('Debug: Check navigation from recipe generation', async ({ page }) => {
    console.log('🔍 Testing navigation and back button issues...');
    
    // Login as admin
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/admin', { timeout: 15000 });
    
    // Try to navigate to recipe generation page
    const currentUrl = page.url();
    console.log('🔍 Current URL:', currentUrl);
    
    // Look for any "Generate" or "Recipe" links/buttons
    const allButtons = await page.locator('button, a').allTextContents();
    const recipeRelated = allButtons.filter(text => 
      text.toLowerCase().includes('recipe') || 
      text.toLowerCase().includes('generate')
    );
    console.log('🔍 Recipe-related buttons/links found:', recipeRelated);
    
    // Try clicking on recipe-related buttons and check for navigation issues
    for (const buttonText of recipeRelated.slice(0, 3)) { // Test first 3 buttons
      try {
        const button = page.locator(`button:has-text("${buttonText}"), a:has-text("${buttonText}")`).first();
        if (await button.count() > 0) {
          console.log(`🔍 Testing button: "${buttonText}"`);
          await button.click();
          await page.waitForTimeout(2000);
          
          const newUrl = page.url();
          const pageTitle = await page.title();
          
          console.log(`🔍 After clicking "${buttonText}":`);
          console.log(`   URL: ${newUrl}`);
          console.log(`   Title: ${pageTitle}`);
          
          if (newUrl.includes('404') || pageTitle.includes('404') || pageTitle.includes('Not Found')) {
            console.log(`❌ Button "${buttonText}" leads to 404!`);
          }
          
          // Try to go back
          await page.goBack();
          await page.waitForTimeout(1000);
        }
      } catch (error) {
        console.log(`❌ Error testing button "${buttonText}":`, error);
      }
    }
  });
});