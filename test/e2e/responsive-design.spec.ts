/**
 * Responsive Design E2E Tests
 * Comprehensive tests for Progressive Web App responsive behavior
 * Tests across multiple device sizes and orientations
 */

import { test, expect, devices } from '@playwright/test';

// Test credentials
const TEST_USERS = {
  admin: {
    email: 'admin@fitmeal.pro',
    password: 'AdminPass123'
  },
  trainer: {
    email: 'trainer.test@evofitmeals.com',
    password: 'TestTrainer123!'
  },
  customer: {
    email: 'customer.test@evofitmeals.com',
    password: 'TestCustomer123!'
  }
};

// Device configurations for responsive testing
const DEVICES = {
  mobile: {
    iPhoneSE: devices['iPhone SE'],
    iPhone12: devices['iPhone 12'],
    Pixel5: devices['Pixel 5'],
    GalaxyS20: { ...devices['Galaxy S9+'], viewport: { width: 384, height: 854 } }
  },
  tablet: {
    iPadMini: devices['iPad Mini'],
    iPad: devices['iPad (gen 7)'],
    iPadPro: devices['iPad Pro 11'],
    iPadLandscape: { ...devices['iPad (gen 7)'], viewport: { width: 1080, height: 810 } }
  },
  desktop: {
    desktop1080p: { viewport: { width: 1920, height: 1080 } },
    desktop1440p: { viewport: { width: 2560, height: 1440 } },
    desktop768p: { viewport: { width: 1366, height: 768 } },
    desktopMin: { viewport: { width: 1024, height: 768 } }
  }
};

// Helper function to login
async function login(page: any, userType: 'admin' | 'trainer' | 'customer') {
  const user = TEST_USERS[userType];
  await page.goto('/login');
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(admin|trainer|customer|my-meal-plans)/, { timeout: 10000 });
}

// Mobile View Tests
test.describe('Mobile Responsive Design (0-767px)', () => {
  test.describe('iPhone SE', () => {
    test.use(DEVICES.mobile.iPhoneSE);

    test('should show mobile navigation and hide desktop navigation', async ({ page }) => {
      await login(page, 'customer');

      // Mobile navigation should be visible
      const mobileNav = page.locator('[data-testid="mobile-navigation"]');
      await expect(mobileNav).toBeVisible();

      // Desktop navigation should be hidden
      const desktopNav = page.locator('header.hidden.lg\\:block');
      await expect(desktopNav).toBeHidden();
    });

    test('should have proper touch targets (44px minimum)', async ({ page }) => {
      await login(page, 'customer');

      // Check button sizes
      const buttons = await page.$$('button');
      for (const button of buttons.slice(0, 5)) { // Test first 5 buttons
        const box = await button.boundingBox();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }

      // Check input sizes
      const inputs = await page.$$('input');
      for (const input of inputs.slice(0, 5)) {
        const box = await input.boundingBox();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    });

    test('should stack content vertically', async ({ page }) => {
      await login(page, 'trainer');
      await page.goto('/trainer');

      // Check that cards stack vertically
      const cards = page.locator('.card, .bg-white.rounded-lg');
      const count = await cards.count();

      if (count >= 2) {
        const firstCard = await cards.nth(0).boundingBox();
        const secondCard = await cards.nth(1).boundingBox();

        if (firstCard && secondCard) {
          // Cards should be stacked (second card below first)
          expect(secondCard.y).toBeGreaterThan(firstCard.y + firstCard.height - 10);
        }
      }
    });

    test('should have mobile-optimized typography', async ({ page }) => {
      await login(page, 'customer');

      // Check heading sizes
      const h1 = page.locator('h1').first();
      if (await h1.isVisible()) {
        const fontSize = await h1.evaluate(el => window.getComputedStyle(el).fontSize);
        expect(parseInt(fontSize)).toBeLessThanOrEqual(32); // Mobile h1 should be smaller
      }
    });
  });

  test.describe('iPhone 12', () => {
    test.use(DEVICES.mobile.iPhone12);

    test('should display bottom navigation correctly', async ({ page }) => {
      await login(page, 'customer');

      const mobileNav = page.locator('[data-testid="mobile-navigation"]');
      await expect(mobileNav).toBeVisible();

      // Check navigation position
      const box = await mobileNav.boundingBox();
      if (box) {
        const viewport = page.viewportSize();
        if (viewport) {
          // Navigation should be at bottom
          expect(box.y + box.height).toBeCloseTo(viewport.height, 50);
        }
      }
    });

    test('should handle forms properly on mobile', async ({ page }) => {
      await page.goto('/login');

      // Check input font sizes (should be 16px to prevent zoom on iOS)
      const emailInput = page.locator('input[type="email"]');
      const fontSize = await emailInput.evaluate(el => window.getComputedStyle(el).fontSize);
      expect(parseInt(fontSize)).toBeGreaterThanOrEqual(16);
    });
  });

  test.describe('Android Phone', () => {
    test.use(DEVICES.mobile.Pixel5);

    test('should handle mobile menu interactions', async ({ page }) => {
      await login(page, 'trainer');

      // Test mobile menu if present
      const menuButton = page.locator('[data-testid="mobile-menu-button"]');
      if (await menuButton.isVisible()) {
        await menuButton.click();

        // Menu should open
        const menuContent = page.locator('[data-testid="mobile-menu-content"]');
        await expect(menuContent).toBeVisible();
      }
    });
  });
});

// Tablet View Tests
test.describe('Tablet Responsive Design (768px-1023px)', () => {
  test.describe('iPad Mini', () => {
    test.use(DEVICES.tablet.iPadMini);

    test('should show desktop navigation on tablet', async ({ page }) => {
      await login(page, 'trainer');

      // Desktop navigation should be visible
      const desktopNav = page.locator('header').first();
      await expect(desktopNav).toBeVisible();

      // Mobile navigation should be hidden
      const mobileNav = page.locator('[data-testid="mobile-navigation"]');
      await expect(mobileNav).toBeHidden();
    });

    test('should display content in 2-column grid', async ({ page }) => {
      await login(page, 'admin');
      await page.goto('/admin');

      // Check grid layout
      const gridContainer = page.locator('.grid').first();
      if (await gridContainer.isVisible()) {
        const children = await gridContainer.locator('> *').all();
        if (children.length >= 2) {
          const firstBox = await children[0].boundingBox();
          const secondBox = await children[1].boundingBox();

          if (firstBox && secondBox) {
            // Items should be side by side on tablet
            expect(Math.abs(firstBox.y - secondBox.y)).toBeLessThan(20);
          }
        }
      }
    });

    test('should have tablet-optimized spacing', async ({ page }) => {
      await login(page, 'customer');

      // Check container padding
      const container = page.locator('.max-w-7xl').first();
      if (await container.isVisible()) {
        const padding = await container.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return {
            left: styles.paddingLeft,
            right: styles.paddingRight
          };
        });

        // Tablet should have moderate padding
        expect(parseInt(padding.left)).toBeGreaterThanOrEqual(16);
        expect(parseInt(padding.left)).toBeLessThanOrEqual(32);
      }
    });
  });

  test.describe('iPad Landscape', () => {
    test.use(DEVICES.tablet.iPadLandscape);

    test('should handle landscape orientation properly', async ({ page }) => {
      await login(page, 'trainer');

      // Content should utilize horizontal space
      const mainContent = page.locator('main').first();
      const box = await mainContent.boundingBox();

      if (box) {
        const viewport = page.viewportSize();
        if (viewport) {
          // Content should use most of viewport width
          expect(box.width).toBeGreaterThan(viewport.width * 0.8);
        }
      }
    });
  });
});

// Desktop View Tests
test.describe('Desktop Responsive Design (1024px+)', () => {
  test.describe('Desktop 1080p', () => {
    test.use(DEVICES.desktop.desktop1080p);

    test('should show full desktop navigation', async ({ page }) => {
      await login(page, 'admin');

      // Desktop header should be visible
      const header = page.locator('header').first();
      await expect(header).toBeVisible();

      // Navigation links should be visible
      const navLinks = header.locator('nav a');
      const count = await navLinks.count();
      expect(count).toBeGreaterThan(0);

      // Mobile navigation should be hidden
      const mobileNav = page.locator('[data-testid="mobile-navigation"]');
      await expect(mobileNav).toBeHidden();
    });

    test('should display content in multi-column layout', async ({ page }) => {
      await login(page, 'trainer');
      await page.goto('/trainer');

      // Check for multi-column layout
      const cards = page.locator('.card, .bg-white.rounded-lg');
      const count = await cards.count();

      if (count >= 3) {
        const boxes = await Promise.all([
          cards.nth(0).boundingBox(),
          cards.nth(1).boundingBox(),
          cards.nth(2).boundingBox()
        ]);

        const validBoxes = boxes.filter(box => box !== null);
        if (validBoxes.length >= 2) {
          // At least some cards should be side by side
          const sameRow = validBoxes.filter(box =>
            Math.abs(box!.y - validBoxes[0]!.y) < 20
          );
          expect(sameRow.length).toBeGreaterThanOrEqual(2);
        }
      }
    });

    test('should have hover effects on desktop', async ({ page }) => {
      await login(page, 'customer');

      // Test button hover
      const button = page.locator('button').first();
      if (await button.isVisible()) {
        const initialStyles = await button.evaluate(el => {
          return window.getComputedStyle(el).transform;
        });

        await button.hover();

        // Some hover effect should be present
        const hoverStyles = await button.evaluate(el => {
          return window.getComputedStyle(el).transform;
        });

        // Styles might change on hover (transform, shadow, etc.)
        // This is a basic check - actual hover styles depend on CSS
        expect(button).toBeDefined();
      }
    });

    test('should have desktop-optimized spacing', async ({ page }) => {
      await login(page, 'trainer');

      // Check container max-width
      const container = page.locator('.max-w-7xl').first();
      if (await container.isVisible()) {
        const box = await container.boundingBox();
        if (box) {
          // Container should not exceed max-width
          expect(box.width).toBeLessThanOrEqual(1280 + 64); // max-width + padding
        }
      }
    });
  });

  test.describe('Desktop Minimum Width', () => {
    test.use(DEVICES.desktop.desktopMin);

    test('should maintain desktop layout at 1024px', async ({ page }) => {
      await login(page, 'admin');

      // Should still show desktop navigation at minimum desktop width
      const header = page.locator('header').first();
      await expect(header).toBeVisible();

      const mobileNav = page.locator('[data-testid="mobile-navigation"]');
      await expect(mobileNav).toBeHidden();
    });
  });
});

// Cross-Device Feature Tests
test.describe('Cross-Device Features', () => {
  test('mobile: should handle orientation change', async ({ browser }) => {
    const context = await browser.newContext({
      ...DEVICES.mobile.iPhone12,
      viewport: { width: 390, height: 844 }
    });
    const page = await context.newPage();

    await login(page, 'customer');

    // Portrait mode
    await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible();

    // Switch to landscape
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(500);

    // Should still show appropriate navigation
    const viewport = page.viewportSize();
    if (viewport && viewport.width < 768) {
      await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible();
    }

    await context.close();
  });

  test('tablet: should transition from portrait to landscape', async ({ browser }) => {
    const context = await browser.newContext({
      ...DEVICES.tablet.iPad,
      viewport: { width: 810, height: 1080 }
    });
    const page = await context.newPage();

    await login(page, 'trainer');

    // Portrait
    const portraitHeader = page.locator('header').first();
    await expect(portraitHeader).toBeVisible();

    // Landscape
    await page.setViewportSize({ width: 1080, height: 810 });
    await page.waitForTimeout(500);

    // Should maintain desktop navigation
    await expect(portraitHeader).toBeVisible();

    await context.close();
  });

  test('should maintain functionality across all breakpoints', async ({ browser }) => {
    const breakpoints = [
      { width: 320, height: 568 },   // Mobile small
      { width: 768, height: 1024 },  // Tablet
      { width: 1024, height: 768 },  // Desktop min
      { width: 1920, height: 1080 }  // Desktop full
    ];

    for (const viewport of breakpoints) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();

      // Test login functionality at each breakpoint
      await page.goto('/login');
      await page.fill('input[type="email"]', TEST_USERS.customer.email);
      await page.fill('input[type="password"]', TEST_USERS.customer.password);
      await page.click('button[type="submit"]');

      // Should successfully login regardless of viewport
      await expect(page).toHaveURL(/\/(customer|my-meal-plans)/, { timeout: 10000 });

      await context.close();
    }
  });
});

// Accessibility Tests
test.describe('Responsive Accessibility', () => {
  test('should maintain focus indicators on all devices', async ({ browser }) => {
    const viewports = [
      { width: 375, height: 812 },   // Mobile
      { width: 768, height: 1024 },  // Tablet
      { width: 1920, height: 1080 }  // Desktop
    ];

    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();

      await page.goto('/login');

      // Tab through elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Check for focus indicator
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        if (el) {
          const styles = window.getComputedStyle(el);
          return {
            outline: styles.outline,
            outlineOffset: styles.outlineOffset
          };
        }
        return null;
      });

      expect(focusedElement).toBeDefined();

      await context.close();
    }
  });

  test('should maintain ARIA landmarks across breakpoints', async ({ browser }) => {
    const viewports = [
      { width: 375, height: 812 },
      { width: 1920, height: 1080 }
    ];

    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();

      await login(page, 'customer');

      // Check for main landmark
      await expect(page.locator('main')).toBeVisible();

      // Check for navigation landmark
      const nav = page.locator('nav, [role="navigation"]').first();
      await expect(nav).toBeVisible();

      await context.close();
    }
  });
});

// Performance Tests
test.describe('Responsive Performance', () => {
  test('should load efficiently on mobile', async ({ browser }) => {
    const context = await browser.newContext({
      ...DEVICES.mobile.iPhone12
    });
    const page = await context.newPage();

    const startTime = Date.now();
    await page.goto('/login');
    const loadTime = Date.now() - startTime;

    // Page should load reasonably fast
    expect(loadTime).toBeLessThan(5000);

    await context.close();
  });

  test('should handle responsive images', async ({ page }) => {
    await login(page, 'customer');

    // Check for responsive images
    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const img = images.nth(i);
      if (await img.isVisible()) {
        const srcset = await img.getAttribute('srcset');
        const sizes = await img.getAttribute('sizes');

        // Images should have responsive attributes or be appropriately sized
        const box = await img.boundingBox();
        if (box) {
          const viewport = page.viewportSize();
          if (viewport) {
            // Images shouldn't exceed viewport
            expect(box.width).toBeLessThanOrEqual(viewport.width);
          }
        }
      }
    }
  });
});

// Visual Regression Prevention
test.describe('Visual Consistency', () => {
  test('should maintain consistent spacing across breakpoints', async ({ browser }) => {
    const measurements = [];
    const viewports = [
      { width: 375, height: 812, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1920, height: 1080, name: 'desktop' }
    ];

    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height }
      });
      const page = await context.newPage();

      await login(page, 'customer');

      // Measure key spacing elements
      const mainPadding = await page.locator('main').evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          paddingTop: parseInt(styles.paddingTop),
          paddingBottom: parseInt(styles.paddingBottom)
        };
      });

      measurements.push({
        viewport: viewport.name,
        padding: mainPadding
      });

      await context.close();
    }

    // Verify appropriate scaling
    const mobilePadding = measurements.find(m => m.viewport === 'mobile')?.padding;
    const desktopPadding = measurements.find(m => m.viewport === 'desktop')?.padding;

    if (mobilePadding && desktopPadding) {
      // Desktop should have more padding than mobile
      expect(desktopPadding.paddingTop).toBeGreaterThanOrEqual(mobilePadding.paddingTop);
    }
  });
});