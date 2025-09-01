import { test, expect } from '@playwright/test';

/**
 * Debug Login Form Structure
 * 
 * This test investigates the actual login form structure
 * to understand why the email field is not being found
 */

test('Debug login form structure', async ({ page }) => {
  console.log('🔍 Investigating login form structure...');
  
  // Navigate to root
  await page.goto('/');
  await page.waitForTimeout(3000);
  
  console.log(`Current URL: ${page.url()}`);
  console.log(`Page title: ${await page.title()}`);
  
  // Get the full page HTML to understand structure
  const pageHTML = await page.content();
  console.log(`Page HTML length: ${pageHTML.length} characters`);
  
  // Look for any form elements
  const forms = await page.locator('form').count();
  console.log(`Forms found: ${forms}`);
  
  // Look for input fields with various selectors
  const inputSelectors = [
    'input[type="email"]',
    'input[type="text"]', 
    'input[name="email"]',
    'input[placeholder*="email" i]',
    '#email',
    '.email-input',
    '[data-testid="email"]',
    'input'
  ];
  
  for (const selector of inputSelectors) {
    const count = await page.locator(selector).count();
    if (count > 0) {
      console.log(`✓ Found ${count} elements with selector: ${selector}`);
      
      // Get the first element's details
      const element = page.locator(selector).first();
      const isVisible = await element.isVisible({ timeout: 1000 }).catch(() => false);
      console.log(`  - Visible: ${isVisible}`);
      
      if (isVisible) {
        const placeholder = await element.getAttribute('placeholder').catch(() => 'N/A');
        const name = await element.getAttribute('name').catch(() => 'N/A');
        const id = await element.getAttribute('id').catch(() => 'N/A');
        const type = await element.getAttribute('type').catch(() => 'N/A');
        
        console.log(`  - Placeholder: ${placeholder}`);
        console.log(`  - Name: ${name}`);  
        console.log(`  - ID: ${id}`);
        console.log(`  - Type: ${type}`);
      }
    }
  }
  
  // Look for password fields
  console.log('\n🔐 Checking for password fields...');
  const passwordSelectors = [
    'input[type="password"]',
    'input[name="password"]', 
    '#password',
    '[data-testid="password"]'
  ];
  
  for (const selector of passwordSelectors) {
    const count = await page.locator(selector).count();
    if (count > 0) {
      console.log(`✓ Found ${count} password fields with selector: ${selector}`);
    }
  }
  
  // Look for buttons
  console.log('\n🔘 Checking for buttons...');
  const buttonSelectors = [
    'button',
    'input[type="submit"]',
    'button[type="submit"]',
    'a:has-text("Login")',
    'a:has-text("Sign In")'
  ];
  
  for (const selector of buttonSelectors) {
    const count = await page.locator(selector).count();
    if (count > 0) {
      console.log(`✓ Found ${count} buttons with selector: ${selector}`);
      
      // Get text content of first button
      try {
        const firstButton = page.locator(selector).first();
        const text = await firstButton.textContent();
        const isVisible = await firstButton.isVisible({ timeout: 1000 });
        console.log(`  - First button text: "${text}", Visible: ${isVisible}`);
      } catch (e) {
        console.log(`  - Could not get button details`);
      }
    }
  }
  
  // Look for navigation elements that might lead to login
  console.log('\n🧭 Checking for navigation to login...');
  const navElements = [
    'a:has-text("Login")',
    'a:has-text("Sign In")',
    'a:has-text("Log In")',
    'button:has-text("Login")',
    'nav a',
    '.nav-link'
  ];
  
  for (const selector of navElements) {
    const count = await page.locator(selector).count();
    if (count > 0) {
      console.log(`✓ Found ${count} nav elements with selector: ${selector}`);
      
      try {
        const firstElement = page.locator(selector).first();
        const text = await firstElement.textContent();
        const href = await firstElement.getAttribute('href').catch(() => 'N/A');
        console.log(`  - Text: "${text}", Href: ${href}`);
      } catch (e) {
        console.log(`  - Could not get element details`);
      }
    }
  }
  
  // Check if this is a single-page app that needs navigation
  console.log('\n🔄 Checking if navigation changes content...');
  
  // Look for React/Vue/Angular app indicators
  const spaIndicators = [
    '#root',
    '#app', 
    '[data-reactroot]',
    '.app',
    'script[src*="react"]',
    'script[src*="vue"]',
    'script[src*="angular"]'
  ];
  
  let isSPA = false;
  for (const indicator of spaIndicators) {
    const count = await page.locator(indicator).count();
    if (count > 0) {
      console.log(`✓ SPA indicator found: ${indicator}`);
      isSPA = true;
    }
  }
  
  if (isSPA) {
    console.log('This appears to be a Single Page Application');
    
    // Try clicking on potential navigation links
    const potentialLoginLinks = ['a:has-text("Login")', 'a:has-text("Sign")', 'button:has-text("Login")'];
    
    for (const linkSelector of potentialLoginLinks) {
      try {
        const link = page.locator(linkSelector).first();
        if (await link.isVisible({ timeout: 2000 })) {
          console.log(`Trying to click: ${linkSelector}`);
          await link.click();
          await page.waitForTimeout(2000);
          
          // Check if login form appeared
          const emailInputs = await page.locator('input[type="email"], input[name="email"], #email').count();
          if (emailInputs > 0) {
            console.log(`✅ Login form appeared after clicking ${linkSelector}!`);
            
            // Get current URL after navigation
            console.log(`New URL: ${page.url()}`);
            break;
          }
        }
      } catch (e) {
        console.log(`Could not click ${linkSelector}: ${e}`);
      }
    }
  }
  
  // Final check for any text that might indicate what's on the page
  const bodyText = await page.textContent('body');
  console.log(`\n📝 Page contains text about: ${bodyText?.substring(0, 200)}...`);
  
  // Look for any error messages or loading states
  const errorSelectors = ['.error', '.alert', '[role="alert"]', '.loading', '.spinner'];
  
  for (const selector of errorSelectors) {
    const count = await page.locator(selector).count();
    if (count > 0) {
      console.log(`⚠️ Found ${count} error/loading elements: ${selector}`);
    }
  }
});