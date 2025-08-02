/**
 * Simple trainer login test with correct credentials
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4000';

test('Trainer login with correct credentials', async ({ page }) => {
  console.log('🔐 Testing trainer login with correct credentials...');
  
  // Go to login page
  await page.goto(`${BASE_URL}/login`);
  
  // Fill form with correct credentials
  await page.fill('input[name="email"]', 'testtrainer@example.com');
  await page.fill('input[name="password"]', 'TrainerPassword123!');
  
  // Take screenshot before login
  await page.screenshot({ path: 'trainer-login-before.png' });
  
  // Click login button
  await page.click('button[type="submit"]');
  
  // Wait for navigation or error
  await page.waitForTimeout(3000);
  
  // Check result
  const currentUrl = page.url();
  console.log('URL after login:', currentUrl);
  
  // Take screenshot after login
  await page.screenshot({ path: 'trainer-login-after.png', fullPage: true });
  
  if (!currentUrl.includes('/login')) {
    console.log('✅ Login successful! Navigated to:', currentUrl);
    
    // Now test the customer detail view
    console.log('\n🔍 Testing Customer Management...');
    
    // Look for Customers tab/button
    const customersLink = await page.locator('text=Customers, a:has-text("Customers"), button:has-text("Customers")').first();
    
    if (await customersLink.isVisible()) {
      console.log('✅ Found Customers link');
      await customersLink.click();
      
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'trainer-customers-page.png', fullPage: true });
      
      // Check for customer management content
      const customerContent = await page.locator('text=Customer Management, text=Customer Email, h1:has-text("Customers")').first();
      if (await customerContent.isVisible()) {
        console.log('✅ Customer Management page loaded');
        
        // Look for customer cards
        const customerEmails = await page.locator('text=@example.com').all();
        console.log(`Found ${customerEmails.length} customer email references`);
        
        if (customerEmails.length > 0) {
          console.log('✅ Customers are displayed');
          
          // Try clicking on first customer
          await customerEmails[0].click();
          await page.waitForTimeout(2000);
          
          // Check if detail view opened
          const backButton = await page.locator('text=Back to Customers').first();
          if (await backButton.isVisible()) {
            console.log('✅ Customer Detail View opened successfully!');
            await page.screenshot({ path: 'customer-detail-view.png', fullPage: true });
            
            // Check for tabs
            const tabs = ['Overview', 'Meal Plans', 'Health Metrics', 'Goals'];
            for (const tab of tabs) {
              if (await page.locator(`text=${tab}`).first().isVisible()) {
                console.log(`✅ ${tab} tab is visible`);
              }
            }
          } else {
            console.log('❌ Customer Detail View did not open');
          }
        }
      }
    } else {
      console.log('❌ Could not find Customers link');
    }
  } else {
    console.log('❌ Login failed - still on login page');
    
    // Check for error messages
    const pageContent = await page.content();
    if (pageContent.includes('rate limit') || pageContent.includes('Too many')) {
      console.log('⚠️  Rate limiting is active - wait a few minutes before retrying');
    }
  }
  
  // Final status
  console.log('\n📊 Test Summary:');
  console.log('- Login URL:', `${BASE_URL}/login`);
  console.log('- Trainer Email:', 'testtrainer@example.com');
  console.log('- Final URL:', currentUrl);
});