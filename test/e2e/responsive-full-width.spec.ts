import { test, expect } from '@playwright/test';

test.describe('Responsive Design - Full Width & Mobile', () => {
  test.beforeEach(async ({ page }) => {
    // Login as customer
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/customer', { timeout: 10000 });
  });

  test('Desktop uses 90% of screen width', async ({ page }) => {
    // Set viewport to full HD desktop
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Get main content container width
    const mainContent = await page.locator('main > div').first();
    const mainBox = await mainContent.boundingBox();

    // Check that content uses ~90% of viewport width
    expect(mainBox?.width).toBeGreaterThan(1700); // Should be around 1728px (90% of 1920)
    expect(mainBox?.width).toBeLessThan(1750);

    // Verify no max-width constraints limiting to 1280px or 1536px
    const computedStyle = await mainContent.evaluate(el => {
      return window.getComputedStyle(el).maxWidth;
    });

    // Should be 90% not a fixed pixel value
    expect(computedStyle).toBe('90%');
  });

  test('Large desktop (2560px) uses 90% of screen width', async ({ page }) => {
    // Set viewport to 2K desktop
    await page.setViewportSize({ width: 2560, height: 1440 });

    const mainContent = await page.locator('main > div').first();
    const mainBox = await mainContent.boundingBox();

    // Check that content uses ~90% of viewport width
    expect(mainBox?.width).toBeGreaterThan(2250); // Should be around 2304px (90% of 2560)
    expect(mainBox?.width).toBeLessThan(2350);
  });

  test('Mobile view (375px) - proper responsive layout', async ({ page }) => {
    // Set viewport to iPhone SE size
    await page.setViewportSize({ width: 375, height: 667 });

    // Check mobile navigation is visible
    const mobileNav = page.locator('[data-testid="mobile-navigation"]');
    await expect(mobileNav).toBeVisible();

    // Check desktop header is hidden
    const desktopHeader = page.locator('header.hidden.lg\\:block');
    await expect(desktopHeader).toBeHidden();

    // Check content uses full width with padding
    const mainContent = await page.locator('main > div').first();
    const mainBox = await mainContent.boundingBox();

    // Should use most of the width with small padding
    expect(mainBox?.width).toBeGreaterThan(340); // 375px - padding
    expect(mainBox?.width).toBeLessThan(376);

    // Check touch targets are proper size
    const buttons = await page.locator('button').all();
    for (const button of buttons.slice(0, 3)) { // Check first 3 buttons
      const box = await button.boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44); // Minimum touch target
      }
    }
  });

  test('Tablet view (768px) - proper responsive layout', async ({ page }) => {
    // Set viewport to iPad size
    await page.setViewportSize({ width: 768, height: 1024 });

    // Check desktop header is visible on tablet
    const desktopHeader = page.locator('header');
    await expect(desktopHeader.first()).toBeVisible();

    // Check mobile navigation is hidden
    const mobileNav = page.locator('[data-testid="mobile-navigation"]');
    await expect(mobileNav).toBeHidden();

    // Check content width
    const mainContent = await page.locator('main > div').first();
    const mainBox = await mainContent.boundingBox();

    // Should use most of the width with medium padding
    expect(mainBox?.width).toBeGreaterThan(680); // With padding
    expect(mainBox?.width).toBeLessThan(770);
  });

  test('Mobile typography scales properly', async ({ page }) => {
    // Set viewport to mobile
    await page.setViewportSize({ width: 375, height: 667 });

    // Check h1 font size
    const h1 = await page.locator('h1').first();
    const h1FontSize = await h1.evaluate(el =>
      window.getComputedStyle(el).fontSize
    );

    // Mobile h1 should be smaller (1.5rem = 24px)
    expect(parseFloat(h1FontSize)).toBeLessThanOrEqual(30);

    // Check body text
    const bodyText = await page.locator('p').first();
    if (await bodyText.count() > 0) {
      const bodyFontSize = await bodyText.evaluate(el =>
        window.getComputedStyle(el).fontSize
      );

      // Mobile body text should be readable (14px minimum)
      expect(parseFloat(bodyFontSize)).toBeGreaterThanOrEqual(14);
    }
  });

  test('Content stacks properly on mobile', async ({ page }) => {
    // Set viewport to mobile
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to a page with cards
    await page.goto('http://localhost:4000/customer');

    // Check if grid items stack vertically
    const cards = await page.locator('.card, [class*="card"]').all();
    if (cards.length >= 2) {
      const firstCard = await cards[0].boundingBox();
      const secondCard = await cards[1].boundingBox();

      if (firstCard && secondCard) {
        // Cards should stack vertically (second card below first)
        expect(secondCard.y).toBeGreaterThan(firstCard.y + firstCard.height);

        // Cards should have similar widths (full width)
        expect(Math.abs(firstCard.width - secondCard.width)).toBeLessThan(10);
      }
    }
  });

  test('Forms are usable on mobile', async ({ page }) => {
    // Set viewport to mobile
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to login page to test form
    await page.goto('http://localhost:4000/login');

    // Check input fields are proper size
    const emailInput = page.locator('input[type="email"]');
    const inputBox = await emailInput.boundingBox();

    if (inputBox) {
      // Input should be at least 44px tall for touch
      expect(inputBox.height).toBeGreaterThanOrEqual(44);

      // Input should use most of the width
      expect(inputBox.width).toBeGreaterThan(300);
    }

    // Check font size prevents zoom on iOS
    const fontSize = await emailInput.evaluate(el =>
      window.getComputedStyle(el).fontSize
    );
    expect(parseFloat(fontSize)).toBeGreaterThanOrEqual(16);
  });
});

test.describe('Edge Cases', () => {
  test('Very small mobile (320px)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('http://localhost:4000/login');

    // Content should still be accessible
    const mainContent = await page.locator('main');
    await expect(mainContent).toBeVisible();

    // No horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });

  test('4K desktop (3840px)', async ({ page }) => {
    await page.setViewportSize({ width: 3840, height: 2160 });
    await page.goto('http://localhost:4000/login');

    const mainContent = await page.locator('main > div').first();
    const mainBox = await mainContent.boundingBox();

    // Should still use 90% even on 4K
    if (mainBox) {
      expect(mainBox.width).toBeGreaterThan(3400); // ~90% of 3840
      expect(mainBox.width).toBeLessThan(3500);
    }
  });
});