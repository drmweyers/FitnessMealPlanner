import { test, expect } from '@playwright/test';

test('Console Error Debug', async ({ page }) => {
  const trainerEmail = 'trainer.test@evofitmeals.com';
  const trainerPassword = 'TestTrainer123!';
  const baseURL = 'http://localhost:4000';

  // Capture all console messages
  const consoleMessages: string[] = [];
  page.on('console', msg => {
    consoleMessages.push(`[${msg.type().toUpperCase()}] ${msg.text()}`);
  });

  // Capture page errors
  const pageErrors: string[] = [];
  page.on('pageerror', error => {
    pageErrors.push(`[PAGE ERROR] ${error.message}`);
  });

  // Login
  await page.goto(baseURL);
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', trainerEmail);
  await page.fill('input[type="password"]', trainerPassword);
  await page.click('button:has-text("Sign In"), button:has-text("Login"), button[type="submit"]');
  
  // Wait for login
  await page.waitForURL((url) => {
    return url.pathname.includes('/trainer') || url.pathname === '/';
  }, { timeout: 10000 });
  
  console.log('=== AFTER LOGIN ===');
  console.log('Console messages:', consoleMessages);
  console.log('Page errors:', pageErrors);
  
  // Clear arrays for next phase
  consoleMessages.length = 0;
  pageErrors.length = 0;
  
  // Navigate to health protocols URL directly
  await page.goto(`${baseURL}/trainer/health-protocols`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000); // Wait for any async errors
  
  console.log('=== HEALTH PROTOCOLS PAGE ===');
  console.log('Console messages:', consoleMessages);
  console.log('Page errors:', pageErrors);
  
  // Check page content
  const bodyText = await page.locator('body').textContent();
  console.log('Page content (first 500 chars):', bodyText?.substring(0, 500));
  
  // Check if specific elements exist
  const hasHealthProtocolHeader = bodyText?.includes('Specialized Health Protocols');
  const hasCreateProtocols = bodyText?.includes('Create Protocols');
  
  console.log('Has Health Protocol header:', hasHealthProtocolHeader);
  console.log('Has Create Protocols text:', hasCreateProtocols);
});