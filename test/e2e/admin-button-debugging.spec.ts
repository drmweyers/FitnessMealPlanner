/**
 * Admin Button Debugging E2E Tests
 * 
 * This test suite is specifically designed to debug the reported issue where
 * admin buttons appear to work in code but don't work from the user's perspective.
 * 
 * TESTING CREDENTIALS (IMPORTANT - Use only these):
 * - Admin: admin@fitmeal.pro / AdminPass123
 * - Trainer: trainer.test@evofitmeals.com / TestTrainer123!  
 * - Customer: customer.test@evofitmeals.com / TestCustomer123!
 * 
 * Test Focus:
 * - Exact user workflow reproduction
 * - Button click event verification
 * - Modal and API response debugging
 * - Visual state capture at each step
 * - Network request monitoring
 * - JavaScript error detection
 */

import { test, expect, Page } from '@playwright/test';

// CORRECT Testing credentials
const ADMIN_CREDENTIALS = {
  email: 'admin@fitmeal.pro',
  password: 'AdminPass123'
};

const BASE_URL = 'http://localhost:4000';

// Helper function to wait and log
async function waitAndLog(page: Page, message: string, timeout = 1000) {
  console.log(`⏳ ${message}`);
  await page.waitForTimeout(timeout);
}

// Enhanced login with detailed logging
async function loginAsAdmin(page: Page) {
  console.log('🔐 Starting admin login process...');
  
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  
  // Take screenshot of login page
  await page.screenshot({ 
    path: 'test-screenshots/debug-login-page.png',
    fullPage: true 
  });
  
  console.log(`📧 Filling email: ${ADMIN_CREDENTIALS.email}`);
  await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
  
  console.log(`🔑 Filling password: ${ADMIN_CREDENTIALS.password}`);
  await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
  
  // Screenshot before login
  await page.screenshot({ 
    path: 'test-screenshots/debug-before-login-submit.png',
    fullPage: true 
  });
  
  console.log('🚀 Submitting login form...');
  await page.click('button[type="submit"]');
  
  // Wait for redirect
  try {
    await page.waitForURL('/admin', { timeout: 15000 });
    console.log('✅ Successfully redirected to /admin');
  } catch (error) {
    console.error('❌ Login redirect failed:', error);
    await page.screenshot({ 
      path: 'test-screenshots/debug-login-failed.png',
      fullPage: true 
    });
    throw error;
  }
  
  // Screenshot after successful login
  await page.screenshot({ 
    path: 'test-screenshots/debug-admin-dashboard.png',
    fullPage: true 
  });
  
  // Verify we're on admin page
  await expect(page).toHaveURL('/admin');
  console.log('✅ Admin login completed successfully');
}

// Enhanced admin tab navigation with debugging
async function navigateToAdminSection(page: Page) {
  console.log('📋 Navigating to Admin section...');
  
  // Take screenshot of current state
  await page.screenshot({ 
    path: 'test-screenshots/debug-before-admin-nav.png',
    fullPage: true 
  });
  
  // Look for admin tab/button (multiple possible selectors)
  const adminSelectors = [
    'button[data-value="admin"]',
    'button[value="admin"]', 
    'button:has-text("Admin")',
    '[role="tab"]:has-text("Admin")',
    '.tab-admin',
    '#admin-tab'
  ];
  
  let adminButton = null;
  for (const selector of adminSelectors) {
    const element = page.locator(selector).first();
    if (await element.isVisible()) {
      console.log(`✅ Found admin button with selector: ${selector}`);
      adminButton = element;
      break;
    }
  }
  
  if (!adminButton) {
    console.error('❌ Admin button not found! Available buttons:');
    const allButtons = page.locator('button');
    const buttonCount = await allButtons.count();
    for (let i = 0; i < buttonCount; i++) {
      const btn = allButtons.nth(i);
      const text = await btn.textContent();
      const value = await btn.getAttribute('value');
      const dataValue = await btn.getAttribute('data-value');
      console.log(`  Button ${i}: "${text}" value="${value}" data-value="${dataValue}"`);
    }
    throw new Error('Admin button not found');
  }
  
  // Click the admin button
  console.log('🖱️ Clicking admin button...');
  await adminButton.click();
  await waitAndLog(page, 'Waiting for admin section to load', 2000);
  
  // Screenshot after clicking admin
  await page.screenshot({ 
    path: 'test-screenshots/debug-after-admin-click.png',
    fullPage: true 
  });
  
  console.log('✅ Admin section navigation completed');
}

test.describe('Admin Button Debugging Suite', () => {
  
  let networkRequests: string[] = [];
  let consoleMessages: string[] = [];
  let jsErrors: string[] = [];
  
  test.beforeEach(async ({ page }) => {
    // Reset tracking arrays
    networkRequests = [];
    consoleMessages = [];
    jsErrors = [];
    
    // Set viewport for consistent testing
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Monitor all network requests
    page.on('request', request => {
      const requestInfo = `${request.method()} ${request.url()}`;
      networkRequests.push(requestInfo);
      console.log(`📡 Request: ${requestInfo}`);
    });
    
    // Monitor network responses
    page.on('response', response => {
      const responseInfo = `${response.status()} ${response.url()}`;
      if (!response.ok()) {
        console.error(`🚨 Failed Response: ${responseInfo}`);
      }
    });
    
    // Monitor console messages
    page.on('console', msg => {
      const message = `${msg.type()}: ${msg.text()}`;
      consoleMessages.push(message);
      
      if (msg.type() === 'error') {
        jsErrors.push(message);
        console.error(`🚨 JS Error: ${msg.text()}`);
      } else if (msg.type() === 'warning') {
        console.warn(`⚠️ JS Warning: ${msg.text()}`);
      } else {
        console.log(`💬 Console: ${msg.text()}`);
      }
    });
    
    // Monitor page errors
    page.on('pageerror', error => {
      const errorMsg = `Page Error: ${error.message}`;
      jsErrors.push(errorMsg);
      console.error(`🚨 ${errorMsg}`);
    });
  });

  test('1. Complete Admin Login Flow with Detailed Monitoring', async ({ page }) => {
    console.log('🧪 Test 1: Admin Login Flow with Detailed Monitoring');
    
    await loginAsAdmin(page);
    
    // Verify admin dashboard elements
    await waitAndLog(page, 'Checking dashboard elements', 1000);
    
    const expectedElements = [
      'h1',
      'button',
      '.dashboard',
      '[role="tab"]'
    ];
    
    for (const selector of expectedElements) {
      const elements = page.locator(selector);
      const count = await elements.count();
      console.log(`📊 Found ${count} elements matching "${selector}"`);
    }
    
    // List all visible buttons for debugging
    console.log('📋 All visible buttons on admin dashboard:');
    const buttons = page.locator('button:visible');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const classes = await button.getAttribute('class');
      const value = await button.getAttribute('value');
      const dataValue = await button.getAttribute('data-value');
      const disabled = await button.isDisabled();
      const visible = await button.isVisible();
      
      console.log(`  Button ${i+1}: "${text}" class="${classes}" value="${value}" data-value="${dataValue}" disabled=${disabled} visible=${visible}`);
    }
    
    // Final screenshot
    await page.screenshot({ 
      path: 'test-screenshots/debug-admin-dashboard-complete.png',
      fullPage: true 
    });
  });

  test('2. Admin Tab Navigation and Button Discovery', async ({ page }) => {
    console.log('🧪 Test 2: Admin Tab Navigation and Button Discovery');
    
    await loginAsAdmin(page);
    await navigateToAdminSection(page);
    
    // Search for the "Generate Recipes" and "Review Queue" buttons
    console.log('🔍 Searching for admin action buttons...');
    
    const searchQueries = [
      'Generate Recipes',
      'Generate New Batch', 
      'Review Queue',
      'View Pending',
      'Generate',
      'Review'
    ];
    
    const foundButtons = [];
    
    for (const query of searchQueries) {
      const buttons = page.locator(`button:has-text("${query}")`);
      const count = await buttons.count();
      
      if (count > 0) {
        console.log(`✅ Found ${count} button(s) with text "${query}"`);
        foundButtons.push({ query, count, buttons });
        
        // Get details about each button
        for (let i = 0; i < count; i++) {
          const button = buttons.nth(i);
          const fullText = await button.textContent();
          const classes = await button.getAttribute('class');
          const id = await button.getAttribute('id');
          const disabled = await button.isDisabled();
          const visible = await button.isVisible();
          const clickable = await button.isEnabled();
          
          console.log(`  "${query}" Button ${i+1}:`);
          console.log(`    Text: "${fullText}"`);
          console.log(`    Classes: ${classes}`);
          console.log(`    ID: ${id}`);
          console.log(`    Disabled: ${disabled}`);
          console.log(`    Visible: ${visible}`);
          console.log(`    Clickable: ${clickable}`);
        }
      } else {
        console.log(`❌ No buttons found with text "${query}"`);
      }
    }
    
    // Screenshot showing admin section
    await page.screenshot({ 
      path: 'test-screenshots/debug-admin-section-buttons.png',
      fullPage: true 
    });
    
    // Return found buttons for next test
    return foundButtons;
  });

  test('3. Generate Recipes Button Click Testing', async ({ page }) => {
    console.log('🧪 Test 3: Generate Recipes Button Click Testing');
    
    await loginAsAdmin(page);
    await navigateToAdminSection(page);
    
    // Find Generate Recipes button with various approaches
    const generateButtonSelectors = [
      'button:has-text("Generate Recipes")',
      'button:has-text("Generate New Batch")', 
      'button:has-text("Generate")',
      'button[data-testid*="generate"]',
      '.generate-button',
      '#generate-recipes-btn'
    ];
    
    let generateButton = null;
    let usedSelector = '';
    
    for (const selector of generateButtonSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        generateButton = element;
        usedSelector = selector;
        console.log(`✅ Found Generate button with: ${selector}`);
        break;
      }
    }
    
    if (!generateButton) {
      console.error('❌ Generate button not found!');
      await page.screenshot({ 
        path: 'test-screenshots/debug-no-generate-button.png',
        fullPage: true 
      });
      throw new Error('Generate button not found');
    }
    
    // Take screenshot before clicking
    await page.screenshot({ 
      path: 'test-screenshots/debug-before-generate-click.png',
      fullPage: true 
    });
    
    // Test button properties before clicking
    const beforeClick = {
      text: await generateButton.textContent(),
      disabled: await generateButton.isDisabled(),
      visible: await generateButton.isVisible(),
      enabled: await generateButton.isEnabled()
    };
    
    console.log('📊 Generate button state before click:', beforeClick);
    
    // Clear network and console logs before clicking
    networkRequests = [];
    consoleMessages = [];
    jsErrors = [];
    
    // Click the button
    console.log('🖱️ Clicking Generate button...');
    await generateButton.click();
    
    // Wait and monitor for changes
    await waitAndLog(page, 'Waiting for response after Generate button click', 3000);
    
    // Check for modal appearance
    const modalSelectors = [
      '.modal',
      '[role="dialog"]', 
      '.fixed.inset-0',
      '.recipe-generation-modal',
      'div:has-text("Recipe Generation")',
      'div:has-text("Generate")'
    ];
    
    let modalFound = false;
    for (const selector of modalSelectors) {
      const modal = page.locator(selector);
      const count = await modal.count();
      if (count > 0) {
        modalFound = true;
        console.log(`✅ Modal found with selector: ${selector} (${count} elements)`);
        
        // Screenshot of modal
        await page.screenshot({ 
          path: 'test-screenshots/debug-modal-appeared.png',
          fullPage: true 
        });
        break;
      }
    }
    
    if (!modalFound) {
      console.error('❌ No modal appeared after Generate button click');
      await page.screenshot({ 
        path: 'test-screenshots/debug-no-modal-after-click.png',
        fullPage: true 
      });
    }
    
    // Log network activity after click
    console.log('📡 Network requests after Generate button click:');
    networkRequests.forEach(req => console.log(`  ${req}`));
    
    // Log console messages after click
    console.log('💬 Console messages after Generate button click:');
    consoleMessages.forEach(msg => console.log(`  ${msg}`));
    
    // Log JavaScript errors
    if (jsErrors.length > 0) {
      console.error('🚨 JavaScript errors detected:');
      jsErrors.forEach(error => console.error(`  ${error}`));
    }
    
    // Final screenshot
    await page.screenshot({ 
      path: 'test-screenshots/debug-after-generate-click-final.png',
      fullPage: true 
    });
  });

  test('4. Review Queue Button Click Testing', async ({ page }) => {
    console.log('🧪 Test 4: Review Queue Button Click Testing');
    
    await loginAsAdmin(page);
    await navigateToAdminSection(page);
    
    // Find Review Queue button
    const reviewButtonSelectors = [
      'button:has-text("Review Queue")',
      'button:has-text("View Pending")', 
      'button:has-text("Pending")',
      'button[data-testid*="review"]',
      '.review-button',
      '#review-queue-btn'
    ];
    
    let reviewButton = null;
    
    for (const selector of reviewButtonSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        reviewButton = element;
        console.log(`✅ Found Review button with: ${selector}`);
        break;
      }
    }
    
    if (!reviewButton) {
      console.error('❌ Review button not found!');
      await page.screenshot({ 
        path: 'test-screenshots/debug-no-review-button.png',
        fullPage: true 
      });
      throw new Error('Review button not found');
    }
    
    // Take screenshot before clicking
    await page.screenshot({ 
      path: 'test-screenshots/debug-before-review-click.png',
      fullPage: true 
    });
    
    // Clear logs before clicking
    networkRequests = [];
    consoleMessages = [];
    jsErrors = [];
    
    // Click the button
    console.log('🖱️ Clicking Review button...');
    await reviewButton.click();
    
    // Wait and monitor for changes
    await waitAndLog(page, 'Waiting for response after Review button click', 3000);
    
    // Check for pending recipes interface
    const pendingInterfaceSelectors = [
      'table',
      '.pending-recipes',
      'text="Pending"',
      '.recipe-queue',
      '[data-testid*="pending"]'
    ];
    
    let pendingInterfaceFound = false;
    for (const selector of pendingInterfaceSelectors) {
      const element = page.locator(selector);
      const count = await element.count();
      if (count > 0) {
        pendingInterfaceFound = true;
        console.log(`✅ Pending interface found with selector: ${selector} (${count} elements)`);
        break;
      }
    }
    
    if (!pendingInterfaceFound) {
      console.error('❌ No pending recipes interface appeared after Review button click');
    }
    
    // Take screenshot after click
    await page.screenshot({ 
      path: 'test-screenshots/debug-after-review-click.png',
      fullPage: true 
    });
    
    // Log activity
    console.log('📡 Network requests after Review button click:');
    networkRequests.forEach(req => console.log(`  ${req}`));
    
    if (jsErrors.length > 0) {
      console.error('🚨 JavaScript errors detected:');
      jsErrors.forEach(error => console.error(`  ${error}`));
    }
  });

  test('5. Button Event Listener and JavaScript Analysis', async ({ page }) => {
    console.log('🧪 Test 5: Button Event Listener and JavaScript Analysis');
    
    await loginAsAdmin(page);
    await navigateToAdminSection(page);
    
    // Inject JavaScript to analyze button event listeners
    const buttonAnalysisResult = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const analysis = [];
      
      buttons.forEach((button, index) => {
        const rect = button.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(button);
        
        // Get event listeners (this is limited due to security)
        const hasClickListener = button.onclick !== null;
        
        analysis.push({
          index,
          text: button.textContent?.trim() || '',
          classes: button.className,
          id: button.id,
          disabled: button.disabled,
          visible: rect.width > 0 && rect.height > 0,
          clickable: !button.disabled && computedStyle.pointerEvents !== 'none',
          hasClickListener,
          position: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
          }
        });
      });
      
      return analysis;
    });
    
    console.log('📊 Button Analysis Results:');
    buttonAnalysisResult.forEach(btn => {
      if (btn.text.toLowerCase().includes('generate') || btn.text.toLowerCase().includes('review')) {
        console.log(`🎯 Target Button Found:`);
        console.log(`  Text: "${btn.text}"`);
        console.log(`  Classes: ${btn.classes}`);
        console.log(`  ID: ${btn.id}`);
        console.log(`  Disabled: ${btn.disabled}`);
        console.log(`  Visible: ${btn.visible}`);
        console.log(`  Clickable: ${btn.clickable}`);
        console.log(`  Has Click Listener: ${btn.hasClickListener}`);
        console.log(`  Position: ${JSON.stringify(btn.position)}`);
        console.log('');
      }
    });
    
    // Test manual JavaScript click on Generate button
    const generateClicked = await page.evaluate(() => {
      const generateBtn = document.querySelector('button:contains("Generate"), button[class*="generate"]');
      if (generateBtn) {
        // Trigger click event
        generateBtn.click();
        return true;
      }
      return false;
    });
    
    if (generateClicked) {
      console.log('✅ Manual JavaScript click on Generate button executed');
      await waitAndLog(page, 'Waiting after manual JS click', 2000);
      await page.screenshot({ 
        path: 'test-screenshots/debug-after-js-click.png',
        fullPage: true 
      });
    }
  });

  test('6. Complete User Journey with Screenshots', async ({ page }) => {
    console.log('🧪 Test 6: Complete User Journey with Screenshots');
    
    // Step 1: Initial page load
    await page.goto('/');
    await page.screenshot({ 
      path: 'test-screenshots/journey-01-homepage.png',
      fullPage: true 
    });
    
    // Step 2: Navigate to login
    await page.goto('/login');
    await page.screenshot({ 
      path: 'test-screenshots/journey-02-login-page.png',
      fullPage: true 
    });
    
    // Step 3: Complete login
    await loginAsAdmin(page);
    await page.screenshot({ 
      path: 'test-screenshots/journey-03-post-login.png',
      fullPage: true 
    });
    
    // Step 4: Navigate to admin section
    await navigateToAdminSection(page);
    await page.screenshot({ 
      path: 'test-screenshots/journey-04-admin-section.png',
      fullPage: true 
    });
    
    // Step 5: Attempt to click Generate button
    const generateBtn = page.locator('button:has-text("Generate")').first();
    if (await generateBtn.isVisible()) {
      await generateBtn.click();
      await waitAndLog(page, 'After Generate click', 2000);
      await page.screenshot({ 
        path: 'test-screenshots/journey-05-generate-clicked.png',
        fullPage: true 
      });
    }
    
    // Step 6: Attempt to click Review button
    const reviewBtn = page.locator('button:has-text("Review"), button:has-text("Pending")').first();
    if (await reviewBtn.isVisible()) {
      await reviewBtn.click();
      await waitAndLog(page, 'After Review click', 2000);
      await page.screenshot({ 
        path: 'test-screenshots/journey-06-review-clicked.png',
        fullPage: true 
      });
    }
    
    // Step 7: Final state
    await page.screenshot({ 
      path: 'test-screenshots/journey-07-final-state.png',
      fullPage: true 
    });
    
    console.log('✅ Complete user journey documented with screenshots');
  });

  test.afterEach(async ({ page }) => {
    // Log summary of what was captured
    console.log('\n📊 Test Summary:');
    console.log(`📡 Total Network Requests: ${networkRequests.length}`);
    console.log(`💬 Total Console Messages: ${consoleMessages.length}`);
    console.log(`🚨 JavaScript Errors: ${jsErrors.length}`);
    
    if (jsErrors.length > 0) {
      console.log('\n🚨 JavaScript Errors Summary:');
      jsErrors.forEach(error => console.log(`  - ${error}`));
    }
    
    // Take final diagnostic screenshot
    await page.screenshot({ 
      path: `test-screenshots/final-diagnostic-${Date.now()}.png`,
      fullPage: true 
    });
  });
});