/**
 * Debug Frontend Errors
 * Captures console errors to diagnose why React isn't rendering
 */

import { test } from '@playwright/test';

test('Capture frontend console errors', async ({ page }) => {
  const consoleMessages: string[] = [];
  const errors: string[] = [];

  // Listen to console messages
  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    consoleMessages.push(text);
    console.log(text);
  });

  // Listen to page errors
  page.on('pageerror', error => {
    const errorText = `[PAGE ERROR] ${error.message}\n${error.stack}`;
    errors.push(errorText);
    console.log(errorText);
  });

  // Listen to request failures
  page.on('requestfailed', request => {
    const failText = `[REQUEST FAILED] ${request.url()} - ${request.failure()?.errorText}`;
    errors.push(failText);
    console.log(failText);
  });

  console.log('🔍 Loading page and capturing errors...');
  console.log('');

  try {
    await page.goto('http://localhost:4000', { waitUntil: 'networkidle', timeout: 60000 });
    console.log('✅ Page loaded');
  } catch (e) {
    console.log('⚠️ Page load error:', e);
  }

  // Wait a bit for React to try to mount
  await page.waitForTimeout(5000);

  console.log('');
  console.log('📊 Summary:');
  console.log(`Console messages: ${consoleMessages.length}`);
  console.log(`Errors: ${errors.length}`);
  console.log('');

  if (errors.length > 0) {
    console.log('❌ ERRORS FOUND:');
    errors.forEach((err, i) => {
      console.log(`${i + 1}. ${err}`);
      console.log('');
    });
  }

  if (consoleMessages.length > 0) {
    console.log('📝 ALL CONSOLE MESSAGES:');
    consoleMessages.forEach((msg, i) => {
      console.log(`${i + 1}. ${msg}`);
    });
  }

  // Take screenshot
  await page.screenshot({ path: 'test-results/debug-frontend.png', fullPage: true });
  console.log('');
  console.log('📸 Screenshot saved to test-results/debug-frontend.png');
});
