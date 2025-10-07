import { test, expect } from '@playwright/test';

/**
 * Responsive UI Components Test Suite
 *
 * Tests specific UI components for responsive behavior including:
 * - Card layouts
 * - Form elements
 * - Navigation components
 * - Data tables
 * - Buttons and interactive elements
 */

const TEST_ACCOUNT = {
  email: 'customer.test@evofitmeals.com',
  password: 'TestCustomer123!'
};

async function login(page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', TEST_ACCOUNT.email);
  await page.fill('input[type="password"]', TEST_ACCOUNT.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/customer**', { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

test.describe('Responsive UI Components', () => {

  test('Card components responsive layout', async ({ page }) => {
    // Test mobile layout
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page);

    // Find meal cards or similar card components
    const cards = page.locator('.card, .meal-card, .meal-plan, [data-testid*="card"]');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      // Mobile: cards should stack vertically and take full width
      for (let i = 0; i < Math.min(cardCount, 3); i++) {
        const card = cards.nth(i);
        if (await card.isVisible()) {
          const cardBox = await card.boundingBox();
          if (cardBox) {
            // Cards should be wide on mobile (near full width)
            expect(cardBox.width).toBeGreaterThan(300);
            expect(cardBox.width).toBeLessThan(375);
          }
        }
      }

      await page.screenshot({
        path: 'test/screenshots/responsive-cards-mobile.png',
        fullPage: true
      });

      // Switch to desktop layout
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(1000);

      // Desktop: cards should be narrower and potentially side-by-side
      const firstCard = cards.first();
      if (await firstCard.isVisible()) {
        const cardBox = await firstCard.boundingBox();
        if (cardBox) {
          // Cards should be narrower on desktop
          expect(cardBox.width).toBeLessThan(600);
        }
      }

      await page.screenshot({
        path: 'test/screenshots/responsive-cards-desktop.png',
        fullPage: true
      });
    }
  });

  test('Form elements responsive behavior', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page);

    // Look for forms or form elements
    const forms = page.locator('form');
    const inputs = page.locator('input, textarea, select');

    const inputCount = await inputs.count();

    if (inputCount > 0) {
      // Check first few inputs
      for (let i = 0; i < Math.min(inputCount, 5); i++) {
        const input = inputs.nth(i);
        if (await input.isVisible()) {
          const inputBox = await input.boundingBox();
          if (inputBox) {
            // Inputs should be appropriately sized for mobile
            expect(inputBox.height).toBeGreaterThanOrEqual(40); // Minimum touch target
            expect(inputBox.width).toBeGreaterThan(100);
            expect(inputBox.width).toBeLessThan(375);
          }
        }
      }

      await page.screenshot({
        path: 'test/screenshots/responsive-forms-mobile.png',
        fullPage: true
      });
    }
  });

  test('Navigation responsive behavior', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page);

    // Check for mobile navigation patterns
    const mobileNavElements = page.locator(
      'button[aria-label*="menu"], .hamburger, .mobile-menu-trigger, [data-testid*="mobile"]'
    );

    if (await mobileNavElements.count() > 0) {
      const mobileNav = mobileNavElements.first();
      await expect(mobileNav).toBeVisible();

      // Check touch target size
      const navBox = await mobileNav.boundingBox();
      if (navBox) {
        expect(Math.min(navBox.width, navBox.height)).toBeGreaterThanOrEqual(44);
      }
    }

    await page.screenshot({
      path: 'test/screenshots/responsive-navigation-mobile.png',
      fullPage: true
    });

    // Switch to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(1000);

    // Check for desktop navigation
    const desktopNav = page.locator('nav, .desktop-nav, .navigation');
    if (await desktopNav.count() > 0) {
      await expect(desktopNav.first()).toBeVisible();
    }

    await page.screenshot({
      path: 'test/screenshots/responsive-navigation-desktop.png',
      fullPage: true
    });
  });

  test('Button sizes and spacing responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page);

    // Find buttons
    const buttons = page.locator('button:visible');
    const buttonCount = await buttons.count();

    let validMobileButtons = 0;

    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const button = buttons.nth(i);
      const buttonBox = await button.boundingBox();

      if (buttonBox) {
        const minDimension = Math.min(buttonBox.width, buttonBox.height);
        if (minDimension >= 40) { // Good mobile touch target
          validMobileButtons++;
        }
      }
    }

    // At least some buttons should meet mobile touch target requirements
    expect(validMobileButtons).toBeGreaterThan(0);

    await page.screenshot({
      path: 'test/screenshots/responsive-buttons-mobile.png',
      fullPage: true
    });
  });

  test('Data display responsive (tables/lists)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page);

    // Look for data display elements
    const dataElements = page.locator('table, .table, ul, ol, .list, .data-list');
    const elementCount = await dataElements.count();

    if (elementCount > 0) {
      for (let i = 0; i < Math.min(elementCount, 3); i++) {
        const element = dataElements.nth(i);
        if (await element.isVisible()) {
          const elementBox = await element.boundingBox();
          if (elementBox) {
            // Data elements should fit within mobile viewport or be scrollable
            expect(elementBox.width).toBeLessThanOrEqual(375);
          }
        }
      }

      await page.screenshot({
        path: 'test/screenshots/responsive-data-mobile.png',
        fullPage: true
      });
    }
  });

  test('Content density responsive adjustment', async ({ page }) => {
    // Test how content density changes between mobile and desktop

    // Mobile first
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page);

    const mobileContent = await page.evaluate(() => {
      const visibleElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetHeight > 0;
      });
      return visibleElements.length;
    });

    await page.screenshot({
      path: 'test/screenshots/responsive-density-mobile.png',
      fullPage: true
    });

    // Desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(1000);

    const desktopContent = await page.evaluate(() => {
      const visibleElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetHeight > 0;
      });
      return visibleElements.length;
    });

    await page.screenshot({
      path: 'test/screenshots/responsive-density-desktop.png',
      fullPage: true
    });

    console.log(`Content elements - Mobile: ${mobileContent}, Desktop: ${desktopContent}`);

    // Desktop might show more content due to layout changes
    expect(desktopContent).toBeGreaterThanOrEqual(mobileContent * 0.8);
  });

  test('Responsive breakpoint verification', async ({ page }) => {
    await login(page);

    // Test key breakpoints
    const breakpoints = [
      { name: 'Small Mobile', width: 320 },
      { name: 'Mobile', width: 375 },
      { name: 'Large Mobile', width: 414 },
      { name: 'Tablet Portrait', width: 768 },
      { name: 'Tablet Landscape', width: 1024 },
      { name: 'Desktop', width: 1280 },
      { name: 'Large Desktop', width: 1920 }
    ];

    const results = [];

    for (const breakpoint of breakpoints) {
      await page.setViewportSize({ width: breakpoint.width, height: 720 });
      await page.waitForTimeout(500);

      // Check if page adapts properly
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      // Check if main content is visible
      const mainContent = page.locator('main, .main-content, .dashboard');
      const hasMainContent = await mainContent.count() > 0 && await mainContent.first().isVisible();

      results.push({
        breakpoint: breakpoint.name,
        width: breakpoint.width,
        noHorizontalScroll: !hasHorizontalScroll,
        hasMainContent: hasMainContent
      });

      await page.screenshot({
        path: `test/screenshots/responsive-breakpoint-${breakpoint.name.toLowerCase().replace(/\s+/g, '-')}.png`,
        fullPage: true
      });
    }

    // Verify all breakpoints work properly
    results.forEach(result => {
      expect(result.noHorizontalScroll).toBe(true);
      expect(result.hasMainContent).toBe(true);
    });

    console.log('Breakpoint test results:', JSON.stringify(results, null, 2));
  });

  test('Progressive enhancement validation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page);

    // Check that core functionality is accessible without JavaScript enhancements
    const coreElements = {
      forms: await page.locator('form').count(),
      links: await page.locator('a').count(),
      buttons: await page.locator('button').count(),
      images: await page.locator('img').count()
    };

    // Core interactive elements should be present
    expect(coreElements.forms + coreElements.links + coreElements.buttons).toBeGreaterThan(0);

    await page.screenshot({
      path: 'test/screenshots/responsive-progressive-enhancement.png',
      fullPage: true
    });

    console.log('Core elements count:', coreElements);
  });
});