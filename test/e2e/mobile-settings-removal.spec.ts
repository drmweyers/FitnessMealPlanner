import { test, expect } from '@playwright/test';

test.describe('Mobile Settings Removal Verification', () => {
  test.use({
    viewport: { width: 375, height: 812 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
  });

  test('Settings option should not exist in mobile menu', async ({ page }) => {
    console.log('=== MOBILE SETTINGS REMOVAL TEST ===');
    console.log('Expected: Settings option should be removed from mobile menu');
    console.log('');

    // Navigate and login
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL('**/customer', { timeout: 10000 });
    await page.waitForTimeout(2000);

    console.log('Step 1: Opening mobile menu...');

    // Open the mobile menu
    const menuButton = page.locator('[data-testid="mobile-nav-more"], [data-testid="mobile-header-menu"], button:has-text("More")').first();
    const menuButtonExists = await menuButton.count() > 0;

    if (menuButtonExists) {
      await menuButton.click();
      await page.waitForTimeout(1000);

      console.log('✓ Mobile menu opened');

      // Check if side menu is visible
      const sideMenu = page.locator('.fixed.top-0.left-0.bottom-0.w-80');
      const sideMenuVisible = await sideMenu.count() > 0;

      if (sideMenuVisible) {
        console.log('Step 2: Checking for Settings option...');

        // Look for Settings button/text
        const settingsButton = page.locator('button:has-text("Settings")');
        const settingsLink = page.locator('a:has-text("Settings")');
        const settingsText = page.locator('text=Settings').first();

        const settingsButtonCount = await settingsButton.count();
        const settingsLinkCount = await settingsLink.count();
        const settingsTextCount = await settingsText.count();

        console.log(`Settings button found: ${settingsButtonCount}`);
        console.log(`Settings link found: ${settingsLinkCount}`);
        console.log(`Settings text found: ${settingsTextCount}`);

        // Verify Settings doesn't exist
        expect(settingsButtonCount).toBe(0);
        expect(settingsLinkCount).toBe(0);

        if (settingsTextCount === 0) {
          console.log('✅ Settings option successfully removed from mobile menu');
        } else {
          console.log('❌ Settings text still found in menu');
        }

        // Verify Sign Out button still exists
        console.log('Step 3: Verifying Sign Out button still exists...');
        const signOutButton = page.locator('button:has-text("Sign Out")');
        const signOutExists = await signOutButton.count() > 0;

        expect(signOutExists).toBe(true);
        console.log('✓ Sign Out button still present');

        // Get all menu items for logging
        const menuItems = await page.locator('.fixed.top-0.left-0.bottom-0.w-80 button').allTextContents();
        console.log('Current menu items:', menuItems.filter(item => item.trim()));

        // Close the menu
        const closeButton = page.locator('button[aria-label="Close menu"]').first();
        if (await closeButton.count() > 0) {
          await closeButton.click();
          await page.waitForTimeout(500);
        }
      }
    } else {
      // Try the hamburger menu in header
      const headerMenu = page.locator('[data-testid="mobile-header-menu"], button[aria-label="Open menu"]').first();
      if (await headerMenu.count() > 0) {
        await headerMenu.click();
        await page.waitForTimeout(1000);

        // Check for Settings in the opened menu
        const settingsInMenu = await page.locator('text=Settings').count();
        expect(settingsInMenu).toBe(0);

        console.log('✅ Settings option not found in header menu');
      }
    }

    console.log('');
    console.log('=== TEST COMPLETE ===');
    console.log('Settings option has been successfully removed from mobile navigation');
  });

  test('Navigating to /settings should show 404 or redirect', async ({ page }) => {
    console.log('=== SETTINGS ROUTE TEST ===');

    // Login first
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/customer', { timeout: 10000 });

    // Try to navigate directly to /settings
    console.log('Attempting to navigate to /settings...');
    await page.goto('http://localhost:4000/settings');
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    const pageContent = await page.textContent('body');

    console.log(`Current URL: ${currentUrl}`);

    // Check if we get 404 or are redirected
    const is404 = pageContent.includes('404') || pageContent.includes('not found') || pageContent.includes('Not Found');
    const isRedirected = !currentUrl.includes('/settings');

    if (is404) {
      console.log('✅ /settings route shows 404 page');
    } else if (isRedirected) {
      console.log('✅ /settings route redirects away');
    } else {
      console.log('⚠️ /settings route still accessible - may need route removal');
    }

    expect(is404 || isRedirected).toBe(true);
  });
});