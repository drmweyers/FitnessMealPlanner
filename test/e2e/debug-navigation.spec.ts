import { test, expect } from '@playwright/test';

test.describe('Debug Navigation Rendering', () => {
  test.beforeEach(async ({ page }) => {
    // Login as trainer to access dashboard
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', 'trainer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestTrainer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/trainer', { waitUntil: 'domcontentloaded' });
  });

  test('Check what elements exist on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    console.log('=== MOBILE VIEWPORT (375px) ===');

    // Check for ANY header element
    const headers = await page.locator('header').count();
    console.log(`Headers found: ${headers}`);

    // Check for mobile header specifically
    const mobileHeader = await page.locator('[data-testid="mobile-header"]').count();
    console.log(`Mobile header found: ${mobileHeader}`);
    const mobileHeaderVisible = await page.locator('[data-testid="mobile-header"]').isVisible().catch(() => false);
    console.log(`Mobile header visible: ${mobileHeaderVisible}`);

    // Check for desktop header
    const desktopHeader = await page.locator('[data-testid="desktop-header"]').count();
    console.log(`Desktop header found: ${desktopHeader}`);
    const desktopHeaderVisible = await page.locator('[data-testid="desktop-header"]').isVisible().catch(() => false);
    console.log(`Desktop header visible: ${desktopHeaderVisible}`);

    // Check for mobile navigation
    const mobileNav = await page.locator('[data-testid="mobile-navigation"]').count();
    console.log(`Mobile navigation found: ${mobileNav}`);
    const mobileNavVisible = await page.locator('[data-testid="mobile-navigation"]').isVisible().catch(() => false);
    console.log(`Mobile navigation visible: ${mobileNavVisible}`);

    // Check MobileNavigation component
    const mobileNavComponent = await page.locator('.mobile-nav').count();
    console.log(`Mobile nav with class found: ${mobileNavComponent}`);

    // Check lg:hidden elements
    const lgHiddenElements = await page.locator('.lg\\:hidden').count();
    console.log(`Elements with lg:hidden class: ${lgHiddenElements}`);

    // Get all headers and their classes
    const allHeaders = await page.locator('header').all();
    for (let i = 0; i < allHeaders.length; i++) {
      const classes = await allHeaders[i].getAttribute('class');
      console.log(`Header ${i} classes: ${classes}`);
      const isVisible = await allHeaders[i].isVisible();
      console.log(`Header ${i} visible: ${isVisible}`);
    }
  });

  test('Check what elements exist on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    console.log('\n=== DESKTOP VIEWPORT (1440px) ===');

    // Check for ANY header element
    const headers = await page.locator('header').count();
    console.log(`Headers found: ${headers}`);

    // Check for mobile header specifically
    const mobileHeader = await page.locator('[data-testid="mobile-header"]').count();
    console.log(`Mobile header found: ${mobileHeader}`);
    const mobileHeaderVisible = await page.locator('[data-testid="mobile-header"]').isVisible().catch(() => false);
    console.log(`Mobile header visible: ${mobileHeaderVisible}`);

    // Check for desktop header
    const desktopHeader = await page.locator('[data-testid="desktop-header"]').count();
    console.log(`Desktop header found: ${desktopHeader}`);
    const desktopHeaderVisible = await page.locator('[data-testid="desktop-header"]').isVisible().catch(() => false);
    console.log(`Desktop header visible: ${desktopHeaderVisible}`);

    // Check for mobile navigation
    const mobileNav = await page.locator('[data-testid="mobile-navigation"]').count();
    console.log(`Mobile navigation found: ${mobileNav}`);
    const mobileNavVisible = await page.locator('[data-testid="mobile-navigation"]').isVisible().catch(() => false);
    console.log(`Mobile navigation visible: ${mobileNavVisible}`);

    // Check hidden lg:block elements
    const hiddenLgBlock = await page.locator('.hidden.lg\\:block').count();
    console.log(`Elements with hidden lg:block: ${hiddenLgBlock}`);

    // Get all headers and their classes
    const allHeaders = await page.locator('header').all();
    for (let i = 0; i < allHeaders.length; i++) {
      const classes = await allHeaders[i].getAttribute('class');
      console.log(`Header ${i} classes: ${classes}`);
      const isVisible = await allHeaders[i].isVisible();
      console.log(`Header ${i} visible: ${isVisible}`);
    }
  });

  test('Check HTML output on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    // Wait a moment for any rendering
    await page.waitForTimeout(1000);

    // Get the HTML of the header area
    const html = await page.locator('body > div').first().innerHTML();

    // Check if MobileNavigation elements exist in HTML
    console.log('\n=== HTML STRUCTURE CHECK ===');
    console.log('Contains mobile-header class:', html.includes('mobile-header'));
    console.log('Contains data-testid="mobile-header":', html.includes('data-testid="mobile-header"'));
    console.log('Contains data-testid="mobile-navigation":', html.includes('data-testid="mobile-navigation"'));
    console.log('Contains lg:hidden class:', html.includes('lg:hidden'));
    console.log('Contains hidden lg:block:', html.includes('hidden lg:block'));
  });
});