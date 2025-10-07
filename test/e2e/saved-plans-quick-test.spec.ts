import { test, expect } from '@playwright/test';

test('Trainer Saved Meal Plans - Quick Test', async ({ page }) => {
  console.log('🚀 Starting Saved Meal Plans Quick Test');
  let foundSection = false;
  
  // Go to the app
  await page.goto('http://localhost:4000');
  await page.waitForLoadState('networkidle');
  
  // Click login link if on home page
  const loginLink = page.locator('a[href="/login"], button:has-text("Login")').first();
  if (await loginLink.isVisible({ timeout: 2000 })) {
    await loginLink.click();
  } else {
    await page.goto('http://localhost:4000/login');
  }
  
  // Fill login form
  console.log('📝 Logging in as trainer...');
  await page.fill('input[type="email"]', 'trainer.test@evofitmeals.com');
  await page.fill('input[type="password"]', 'TestTrainer123!');
  
  // Take screenshot before submit
  await page.screenshot({ path: 'test-results/before-login.png' });
  
  // Submit login
  await page.click('button[type="submit"]');
  
  // Wait for navigation or error
  await page.waitForTimeout(3000);
  
  // Take screenshot after submit
  await page.screenshot({ path: 'test-results/after-login.png' });
  
  // Check current URL
  const currentUrl = page.url();
  console.log('📍 Current URL:', currentUrl);
  
  // Check if we're on trainer page
  if (currentUrl.includes('/trainer')) {
    console.log('✅ Successfully logged in to trainer dashboard');
    
    // Look for saved meal plans section
    console.log('🔍 Looking for saved meal plans section...');
    
    // Try multiple selectors
    const selectors = [
      'text="Saved Meal Plans"',
      'text="My Saved Plans"',
      'h2:has-text("Saved")',
      'h3:has-text("Saved")',
      '.saved-meal-plans',
      '[data-testid="saved-meal-plans"]',
      'div:has-text("Saved Plans")'
    ];
    
    foundSection = false;
    for (const selector of selectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log(`✅ Found saved plans section with selector: ${selector}`);
        foundSection = true;
        
        // Check for meal plan cards
        const cards = page.locator('.meal-plan-card, [data-testid="meal-plan-card"], .saved-plan-item, .plan-card');
        const count = await cards.count();
        console.log(`📊 Found ${count} saved meal plan(s)`);
        
        if (count > 0) {
          console.log('✅ Saved meal plans are displaying correctly!');
          
          // Check first card for details
          const firstCard = cards.first();
          const cardText = await firstCard.textContent();
          console.log('📝 First plan preview:', cardText?.substring(0, 100) + '...');
          
          // Check for action buttons
          const viewBtn = firstCard.locator('button:has-text("View")').first();
          const assignBtn = firstCard.locator('button:has-text("Assign")').first();
          
          if (await viewBtn.isVisible()) console.log('  ✓ View button present');
          if (await assignBtn.isVisible()) console.log('  ✓ Assign button present');
        } else {
          console.log('⚠️ No saved plans found - section is empty');
          
          // Look for empty state message
          const emptyMessage = page.locator('text=/no.*saved.*plans/i, text=/create.*first.*plan/i').first();
          if (await emptyMessage.isVisible({ timeout: 1000 })) {
            console.log('✅ Empty state message is displaying correctly');
          }
        }
        break;
      }
    }
    
    if (!foundSection) {
      console.log('❌ Could not find saved meal plans section');
      console.log('Page content preview:');
      const pageText = await page.locator('body').innerText();
      console.log(pageText.substring(0, 500));
    }
    
  } else if (currentUrl.includes('/login')) {
    console.log('❌ Still on login page - authentication failed');
    
    // Check for error messages
    const errorMsg = page.locator('.error, .alert, [role="alert"]').first();
    if (await errorMsg.isVisible({ timeout: 1000 }).catch(() => false)) {
      const errorText = await errorMsg.textContent();
      console.log('Error message:', errorText);
    }
  } else {
    console.log('❓ Unexpected page:', currentUrl);
  }
  
  // Final screenshot
  await page.screenshot({ path: 'test-results/final-state.png', fullPage: true });
  
  console.log('\n📊 TEST SUMMARY:');
  console.log('================');
  if (currentUrl.includes('/trainer')) {
    console.log('✅ Authentication: Working');
    if (foundSection) {
      console.log('✅ Saved Plans Section: Visible');
    } else {
      console.log('❌ Saved Plans Section: Not found');
    }
  } else {
    console.log('❌ Authentication: Failed');
    console.log('❌ Saved Plans Section: N/A');
  }
});