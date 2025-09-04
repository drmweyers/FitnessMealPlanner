import { test, expect } from '@playwright/test';

test('Navigate to Saved Plans Tab', async ({ page }) => {
  console.log('🚀 Starting Saved Plans Navigation Test');
  
  // Go to the app
  await page.goto('http://localhost:4000');
  await page.waitForLoadState('networkidle');
  
  // Login as trainer
  console.log('📝 Logging in as trainer...');
  await page.goto('http://localhost:4000/login');
  await page.fill('input[type="email"]', 'trainer.test@evofitmeals.com');
  await page.fill('input[type="password"]', 'TestTrainer123!');
  await page.click('button[type="submit"]');
  
  // Wait for navigation to trainer dashboard
  await page.waitForURL('**/trainer', { timeout: 10000 });
  console.log('✅ Logged in successfully to trainer dashboard');
  
  // Take screenshot of initial state
  await page.screenshot({ path: 'test-results/trainer-dashboard.png' });
  
  // Look for the Saved Plans tab
  console.log('🔍 Looking for Saved Plans tab...');
  
  // Try multiple selectors for the tab
  const tabSelectors = [
    'button:has-text("Saved Plans")',
    '[role="tab"]:has-text("Saved Plans")',
    '.MuiTab-root:has-text("Saved Plans")',
    '[value="saved-plans"]',
    'text="Saved Plans"'
  ];
  
  let savedPlansTab = null;
  for (const selector of tabSelectors) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 1000 })) {
        savedPlansTab = element;
        console.log(`✅ Found Saved Plans tab with selector: ${selector}`);
        break;
      }
    } catch (error) {
      // Continue trying other selectors
    }
  }
  
  if (savedPlansTab) {
    // Click on the Saved Plans tab
    await savedPlansTab.click();
    console.log('📍 Clicked on Saved Plans tab');
    
    // Wait for navigation or content change
    await page.waitForTimeout(2000);
    
    // Check current URL
    const currentUrl = page.url();
    console.log('📍 Current URL after clicking tab:', currentUrl);
    
    // Take screenshot after clicking tab
    await page.screenshot({ path: 'test-results/saved-plans-tab.png' });
    
    // Look for saved meal plans content
    console.log('🔍 Looking for saved meal plans content...');
    
    // Check for meal plan cards or content
    const contentSelectors = [
      '.meal-plan-card',
      '[data-testid="meal-plan-card"]',
      '.saved-plan-item',
      '.plan-card',
      'text="Personalized Plan"',
      'h3:has-text("Saved Meal Plans")',
      'h2:has-text("Saved Plans")'
    ];
    
    let foundContent = false;
    for (const selector of contentSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          console.log(`✅ Found saved plans content with selector: ${selector}`);
          foundContent = true;
          
          // Count how many plans are visible
          const count = await page.locator(selector).count();
          console.log(`📊 Found ${count} saved meal plan(s)`);
          break;
        }
      } catch (error) {
        // Continue trying other selectors
      }
    }
    
    if (!foundContent) {
      console.log('⚠️ No saved plans content found after clicking tab');
      
      // Get page content for debugging
      const pageText = await page.locator('body').innerText();
      console.log('Page content preview:', pageText.substring(0, 500));
    }
    
  } else {
    console.log('❌ Could not find Saved Plans tab');
    
    // List all visible tabs for debugging
    const visibleTabs = await page.locator('[role="tab"], button').evaluateAll(elements => {
      return elements.map(el => el.textContent?.trim()).filter(text => text);
    });
    console.log('Visible tabs/buttons:', visibleTabs);
  }
  
  // Final screenshot
  await page.screenshot({ path: 'test-results/final-navigation-state.png', fullPage: true });
  
  console.log('\n📊 TEST SUMMARY:');
  console.log('================');
  console.log(savedPlansTab ? '✅ Saved Plans Tab: Found and clicked' : '❌ Saved Plans Tab: Not found');
  console.log(foundContent ? '✅ Saved Plans Content: Visible' : '❌ Saved Plans Content: Not visible');
});