import { test, expect, Page, BrowserContext, devices } from '@playwright/test';

// Extended device configurations with real device specifications
const deviceMatrix = {
  'iPhone SE (1st gen)': {
    viewport: { width: 320, height: 568 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15A372 Safari/604.1',
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  },
  'iPhone SE (2nd gen)': {
    viewport: { width: 375, height: 667 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15A372 Safari/604.1',
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  },
  'iPhone 12 Mini': {
    viewport: { width: 375, height: 812 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15A372 Safari/604.1',
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true
  },
  'iPhone 12/13/14': {
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15A372 Safari/604.1',
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true
  },
  'iPhone 12/13/14 Pro Max': {
    viewport: { width: 428, height: 926 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15A372 Safari/604.1',
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true
  },
  'Samsung Galaxy S8': {
    viewport: { width: 360, height: 740 },
    userAgent: 'Mozilla/5.0 (Linux; Android 8.0.0; SM-G950F Build/R16NW) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true
  },
  'Samsung Galaxy S20': {
    viewport: { width: 360, height: 800 },
    userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true
  },
  'Samsung Galaxy Note 20': {
    viewport: { width: 412, height: 915 },
    userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-N981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true
  },
  'Google Pixel 5': {
    viewport: { width: 393, height: 851 },
    userAgent: 'Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
    deviceScaleFactor: 2.75,
    isMobile: true,
    hasTouch: true
  },
  'iPad Mini (6th gen)': {
    viewport: { width: 768, height: 1024 },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15A372 Safari/604.1',
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  },
  'iPad (9th gen)': {
    viewport: { width: 810, height: 1080 },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15A372 Safari/604.1',
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  },
  'iPad Pro 11"': {
    viewport: { width: 834, height: 1194 },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15A372 Safari/604.1',
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  },
  'iPad Pro 12.9"': {
    viewport: { width: 1024, height: 1366 },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15A372 Safari/604.1',
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  }
};

// Test accounts
const testAccounts = {
  admin: { email: 'admin@fitmeal.pro', password: 'AdminPass123' },
  trainer: { email: 'trainer.test@evofitmeals.com', password: 'TestTrainer123!' },
  customer: { email: 'customer.test@evofitmeals.com', password: 'TestCustomer123!' }
};

// Helper function to determine if device is mobile vs tablet
const isMobileDevice = (deviceName: string) => {
  return !deviceName.includes('iPad') && deviceMatrix[deviceName as keyof typeof deviceMatrix].viewport.width < 768;
};

// Helper function to determine expected navigation layout
const getExpectedLayout = (deviceName: string) => {
  const device = deviceMatrix[deviceName as keyof typeof deviceMatrix];
  const isTablet = deviceName.includes('iPad');
  const isMobile = device.viewport.width < 768;

  return {
    shouldShowMobileNav: isMobile,
    shouldShowDesktopNav: !isMobile,
    shouldShowBottomNav: isMobile,
    shouldShowSideMenu: true, // All mobile devices should support side menu
    expectedColumns: isTablet ? 'grid-cols-2' : isMobile ? 'grid-cols-1' : 'grid-cols-3',
    minTouchTargetSize: 44
  };
};

test.describe('Cross-Device Mobile Testing Matrix', () => {
  // Test core functionality across all devices
  Object.entries(deviceMatrix).forEach(([deviceName, deviceConfig]) => {
    test.describe(`Device: ${deviceName} (${deviceConfig.viewport.width}x${deviceConfig.viewport.height})`, () => {
      let context: BrowserContext;
      let page: Page;

      test.beforeAll(async ({ browser }) => {
        context = await browser.newContext(deviceConfig);
        page = await context.newPage();
      });

      test.afterAll(async () => {
        await context.close();
      });

      test(`should render login page correctly on ${deviceName}`, async () => {
        await page.goto('http://localhost:4000/login');

        // Page should load without horizontal scrolling
        const bodyOverflow = await page.locator('body').evaluate(el => window.getComputedStyle(el).overflowX);
        expect(bodyOverflow).not.toBe('scroll');

        // Form elements should be visible and appropriately sized
        const emailInput = page.locator('input[type="email"]');
        const passwordInput = page.locator('input[type="password"]');
        const loginButton = page.locator('button[type="submit"]');

        await expect(emailInput).toBeVisible();
        await expect(passwordInput).toBeVisible();
        await expect(loginButton).toBeVisible();

        // Touch targets should be appropriately sized
        const loginButtonBox = await loginButton.boundingBox();
        expect(loginButtonBox?.height).toBeGreaterThanOrEqual(44);
      });

      test(`should complete authentication flow on ${deviceName}`, async () => {
        await page.goto('http://localhost:4000/login');

        await page.locator('input[type="email"]').fill(testAccounts.customer.email);
        await page.locator('input[type="password"]').fill(testAccounts.customer.password);
        await page.locator('button[type="submit"]').tap();

        // Should redirect successfully
        await expect(page).toHaveURL(/.*\/customer.*/);

        const layout = getExpectedLayout(deviceName);

        if (layout.shouldShowMobileNav) {
          // Mobile navigation should be present
          await expect(page.locator('[data-testid="mobile-header-menu"]')).toBeVisible();
          await expect(page.locator('.mobile-nav')).toBeVisible();
        }

        if (layout.shouldShowBottomNav) {
          // Bottom navigation should be at the bottom
          const bottomNav = page.locator('.mobile-nav');
          const bottomNavBox = await bottomNav.boundingBox();
          const viewportHeight = deviceConfig.viewport.height;

          expect(bottomNavBox?.y).toBeGreaterThan(viewportHeight * 0.8);
        }
      });

      test(`should handle navigation correctly on ${deviceName}`, async () => {
        await page.goto('http://localhost:4000/login');
        await page.locator('input[type="email"]').fill(testAccounts.customer.email);
        await page.locator('input[type="password"]').fill(testAccounts.customer.password);
        await page.locator('button[type="submit"]').tap();
        await page.waitForURL(/.*\/customer.*/);

        const layout = getExpectedLayout(deviceName);

        if (layout.shouldShowBottomNav) {
          // Test bottom navigation
          const navItems = ['dashboard', 'recipes', 'favorites'];

          for (const item of navItems) {
            const navButton = page.locator(`[data-testid="mobile-nav-${item}"]`);
            if (await navButton.count() > 0) {
              await navButton.tap();
              await page.waitForTimeout(500);

              // Should navigate successfully
              expect(page.url()).toBeTruthy();
            }
          }
        }

        if (layout.shouldShowSideMenu) {
          // Test side menu
          const menuButton = page.locator('[data-testid="mobile-header-menu"]');
          if (await menuButton.count() > 0) {
            await menuButton.tap();

            // Side menu should appear
            await expect(page.locator('text="Menu"')).toBeVisible();

            // Menu should not exceed viewport width
            const sideMenu = page.locator('text="Menu"').locator('..').locator('..');
            const menuBox = await sideMenu.boundingBox();
            expect(menuBox?.width).toBeLessThanOrEqual(deviceConfig.viewport.width * 0.9);
          }
        }
      });

      test(`should display content appropriately on ${deviceName}`, async () => {
        await page.goto('http://localhost:4000/login');
        await page.locator('input[type="email"]').fill(testAccounts.customer.email);
        await page.locator('input[type="password"]').fill(testAccounts.customer.password);
        await page.locator('button[type="submit"]').tap();
        await page.waitForURL(/.*\/customer.*/);

        // Navigate to recipes to test content layout
        const recipesNav = page.locator('[data-testid="mobile-nav-recipes"]');
        if (await recipesNav.count() > 0) {
          await recipesNav.tap();

          // Content should fit viewport without horizontal scroll
          const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
          expect(pageWidth).toBeLessThanOrEqual(deviceConfig.viewport.width + 10); // Allow for minor variations

          // Recipe cards should be appropriately sized
          const recipeCards = page.locator('[data-testid="recipe-card"], .recipe-card');
          if (await recipeCards.count() > 0) {
            const cardBox = await recipeCards.first().boundingBox();

            if (isMobileDevice(deviceName)) {
              // Mobile devices should show single column or small grid
              expect(cardBox?.width).toBeGreaterThan(deviceConfig.viewport.width * 0.3);
            } else {
              // Tablets can show multiple columns
              expect(cardBox?.width).toBeGreaterThan(100);
            }
          }
        }
      });

      test(`should handle touch interactions on ${deviceName}`, async () => {
        await page.goto('http://localhost:4000/login');
        await page.locator('input[type="email"]').fill(testAccounts.customer.email);
        await page.locator('input[type="password"]').fill(testAccounts.customer.password);
        await page.locator('button[type="submit"]').tap();
        await page.waitForURL(/.*\/customer.*/);

        // Test touch targets meet minimum size requirements
        const touchTargets = page.locator('button, a, input, [role="button"], .touch-target');
        const targetCount = Math.min(await touchTargets.count(), 10); // Test first 10 elements

        for (let i = 0; i < targetCount; i++) {
          const target = touchTargets.nth(i);
          const targetBox = await target.boundingBox();

          if (targetBox) {
            const minDimension = Math.min(targetBox.width, targetBox.height);
            expect(minDimension).toBeGreaterThanOrEqual(getExpectedLayout(deviceName).minTouchTargetSize);
          }
        }

        // Test tap interactions
        const menuButton = page.locator('[data-testid="mobile-header-menu"]');
        if (await menuButton.count() > 0) {
          await menuButton.tap();
          await expect(page.locator('text="Menu"')).toBeVisible();

          // Close menu with overlay tap
          const overlay = page.locator('.bg-black.bg-opacity-50');
          await overlay.tap({ position: { x: 50, y: 50 } });
          await expect(page.locator('text="Menu"')).not.toBeVisible();
        }
      });

      test(`should handle text input and virtual keyboards on ${deviceName}`, async () => {
        await page.goto('http://localhost:4000/login');
        await page.locator('input[type="email"]').fill(testAccounts.customer.email);
        await page.locator('input[type="password"]').fill(testAccounts.customer.password);
        await page.locator('button[type="submit"]').tap();
        await page.waitForURL(/.*\/customer.*/);

        // Navigate to a page with search functionality
        const recipesNav = page.locator('[data-testid="mobile-nav-recipes"]');
        if (await recipesNav.count() > 0) {
          await recipesNav.tap();

          const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
          if (await searchInput.count() > 0) {
            // Focus should work properly
            await searchInput.tap();
            await expect(searchInput).toBeFocused();

            // Text input should work
            await searchInput.fill('chicken');
            await expect(searchInput).toHaveValue('chicken');

            // Input should have appropriate attributes for mobile
            const inputType = await searchInput.getAttribute('type');
            const inputMode = await searchInput.getAttribute('inputmode');

            // Should optimize keyboard for text input
            expect(inputType === 'search' || inputType === 'text' || inputMode === 'search').toBe(true);
          }
        }
      });

      test(`should handle scrolling and gestures on ${deviceName}`, async () => {
        await page.goto('http://localhost:4000/login');
        await page.locator('input[type="email"]').fill(testAccounts.customer.email);
        await page.locator('input[type="password"]').fill(testAccounts.customer.password);
        await page.locator('button[type="submit"]').tap();
        await page.waitForURL(/.*\/customer.*/);

        // Test vertical scrolling
        const initialScrollY = await page.evaluate(() => window.scrollY);

        // Scroll down
        await page.mouse.wheel(0, 300);
        await page.waitForTimeout(500);

        const scrolledY = await page.evaluate(() => window.scrollY);
        expect(scrolledY).toBeGreaterThanOrEqual(initialScrollY);

        // Test horizontal scroll prevention on main content
        const bodyOverflowX = await page.evaluate(() => window.getComputedStyle(document.body).overflowX);
        expect(bodyOverflowX).not.toBe('scroll');

        // Test pull-to-refresh behavior (should not interfere with navigation)
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(200);

        // Simulate pull gesture
        await page.mouse.move(deviceConfig.viewport.width / 2, 100);
        await page.mouse.down();
        await page.mouse.move(deviceConfig.viewport.width / 2, 200);
        await page.mouse.up();

        // Page should not reload or navigate away
        await expect(page).toHaveURL(/.*\/customer.*/);
      });

      test(`should handle orientation changes on ${deviceName}`, async () => {
        // Skip orientation test for devices that don't support it
        if (deviceName.includes('iPad') || isMobileDevice(deviceName)) {
          await page.goto('http://localhost:4000/login');
          await page.locator('input[type="email"]').fill(testAccounts.customer.email);
          await page.locator('input[type="password"]').fill(testAccounts.customer.password);
          await page.locator('button[type="submit"]').tap();
          await page.waitForURL(/.*\/customer.*/);

          // Store original navigation state
          const mobileNavVisible = await page.locator('.mobile-nav').isVisible();

          // Simulate landscape orientation (swap width/height)
          await page.setViewportSize({
            width: deviceConfig.viewport.height,
            height: deviceConfig.viewport.width
          });

          await page.waitForTimeout(500);

          // Navigation should still be functional
          if (mobileNavVisible) {
            await expect(page.locator('.mobile-nav')).toBeVisible();
          }

          // Content should adapt to new orientation
          const bodyWidth = await page.evaluate(() => document.body.offsetWidth);
          expect(bodyWidth).toBeLessThanOrEqual(deviceConfig.viewport.height + 50);

          // Restore original orientation
          await page.setViewportSize(deviceConfig.viewport);
          await page.waitForTimeout(500);
        }
      });

      test(`should handle performance requirements on ${deviceName}`, async () => {
        const performanceMarks: number[] = [];

        // Navigate and measure performance
        performanceMarks.push(Date.now());
        await page.goto('http://localhost:4000/login');

        performanceMarks.push(Date.now());
        await page.locator('input[type="email"]').fill(testAccounts.customer.email);
        await page.locator('input[type="password"]').fill(testAccounts.customer.password);
        await page.locator('button[type="submit"]').tap();

        performanceMarks.push(Date.now());
        await page.waitForURL(/.*\/customer.*/);

        performanceMarks.push(Date.now());

        // Calculate performance metrics
        const loginPageLoad = performanceMarks[1] - performanceMarks[0];
        const authSubmission = performanceMarks[2] - performanceMarks[1];
        const dashboardLoad = performanceMarks[3] - performanceMarks[2];

        // Performance expectations (adjust based on device capabilities)
        const isLowPowerDevice = deviceConfig.viewport.width <= 375;
        const maxLoginLoad = isLowPowerDevice ? 5000 : 3000;
        const maxAuthTime = isLowPowerDevice ? 3000 : 2000;
        const maxDashboardLoad = isLowPowerDevice ? 4000 : 2500;

        expect(loginPageLoad).toBeLessThan(maxLoginLoad);
        expect(authSubmission).toBeLessThan(maxAuthTime);
        expect(dashboardLoad).toBeLessThan(maxDashboardLoad);

        // Test navigation performance
        const navStart = Date.now();
        const recipesNav = page.locator('[data-testid="mobile-nav-recipes"]');
        if (await recipesNav.count() > 0) {
          await recipesNav.tap();
          await page.waitForLoadState('networkidle');
        }
        const navTime = Date.now() - navStart;

        const maxNavTime = isLowPowerDevice ? 2000 : 1000;
        expect(navTime).toBeLessThan(maxNavTime);
      });
    });
  });

  // Cross-device consistency tests
  test.describe('Cross-Device Consistency', () => {
    test('should maintain consistent feature availability across devices', async ({ browser }) => {
      const testDevices = ['iPhone SE (2nd gen)', 'Samsung Galaxy S20', 'iPad Mini (6th gen)'];
      const featureResults: Record<string, any> = {};

      for (const deviceName of testDevices) {
        const context = await browser.newContext(deviceMatrix[deviceName as keyof typeof deviceMatrix]);
        const page = await context.newPage();

        await page.goto('http://localhost:4000/login');
        await page.locator('input[type="email"]').fill(testAccounts.customer.email);
        await page.locator('input[type="password"]').fill(testAccounts.customer.password);
        await page.locator('button[type="submit"]').tap();
        await page.waitForURL(/.*\/customer.*/);

        // Test feature availability
        featureResults[deviceName] = {
          mobileNav: await page.locator('[data-testid="mobile-header-menu"]').count() > 0,
          bottomNav: await page.locator('.mobile-nav').count() > 0,
          recipesPage: await page.locator('[data-testid="mobile-nav-recipes"]').count() > 0,
          favoritesPage: await page.locator('[data-testid="mobile-nav-favorites"]').count() > 0,
          profilePage: await page.locator('button[aria-label="Profile"]').count() > 0
        };

        await context.close();
      }

      // Verify consistent features across mobile devices
      const mobileDevices = testDevices.filter(name => !name.includes('iPad'));
      for (let i = 1; i < mobileDevices.length; i++) {
        const current = featureResults[mobileDevices[i]];
        const previous = featureResults[mobileDevices[i - 1]];

        expect(current.mobileNav).toBe(previous.mobileNav);
        expect(current.bottomNav).toBe(previous.bottomNav);
        expect(current.recipesPage).toBe(previous.recipesPage);
        expect(current.favoritesPage).toBe(previous.favoritesPage);
      }
    });

    test('should handle edge cases across device sizes', async ({ browser }) => {
      const edgeCaseDevices = [
        'iPhone SE (1st gen)', // Very small
        'iPad Pro 12.9"',      // Very large
        'Samsung Galaxy Note 20' // Tall aspect ratio
      ];

      for (const deviceName of edgeCaseDevices) {
        const context = await browser.newContext(deviceMatrix[deviceName as keyof typeof deviceMatrix]);
        const page = await context.newPage();

        await page.goto('http://localhost:4000/login');

        // Should not have horizontal scrolling
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        expect(hasHorizontalScroll).toBe(false);

        // Content should be readable
        const bodyText = await page.locator('body').textContent();
        expect(bodyText?.length).toBeGreaterThan(10);

        // Critical UI elements should be visible
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();

        await context.close();
      }
    });
  });

  // Device-specific behavior tests
  test.describe('Device-Specific Optimizations', () => {
    test('should optimize for iPhone notch and safe areas', async ({ browser }) => {
      const iPhoneWithNotch = ['iPhone 12 Mini', 'iPhone 12/13/14', 'iPhone 12/13/14 Pro Max'];

      for (const deviceName of iPhoneWithNotch) {
        const context = await browser.newContext(deviceMatrix[deviceName as keyof typeof deviceMatrix]);
        const page = await context.newPage();

        await page.goto('http://localhost:4000/login');
        await page.locator('input[type="email"]').fill(testAccounts.customer.email);
        await page.locator('input[type="password"]').fill(testAccounts.customer.password);
        await page.locator('button[type="submit"]').tap();
        await page.waitForURL(/.*\/customer.*/);

        // Header should account for safe area
        const header = page.locator('header, .header, [data-testid="mobile-header-menu"]').first();
        if (await header.count() > 0) {
          const headerBox = await header.boundingBox();
          expect(headerBox?.y).toBeGreaterThanOrEqual(0);
        }

        // Bottom navigation should account for safe area
        const bottomNav = page.locator('.mobile-nav');
        if (await bottomNav.count() > 0) {
          const navBox = await bottomNav.boundingBox();
          const viewportHeight = deviceMatrix[deviceName as keyof typeof deviceMatrix].viewport.height;

          // Should not be at the very bottom (accounting for safe area)
          expect(navBox?.y).toBeLessThan(viewportHeight);
        }

        await context.close();
      }
    });

    test('should handle Samsung Galaxy edge screens', async ({ browser }) => {
      const samsungDevices = ['Samsung Galaxy S8', 'Samsung Galaxy S20', 'Samsung Galaxy Note 20'];

      for (const deviceName of samsungDevices) {
        const context = await browser.newContext(deviceMatrix[deviceName as keyof typeof deviceMatrix]);
        const page = await context.newPage();

        await page.goto('http://localhost:4000/login');

        // Touch targets should not be too close to edges
        const touchTargets = page.locator('button, a, input[type="submit"]');
        const targetCount = Math.min(await touchTargets.count(), 5);

        for (let i = 0; i < targetCount; i++) {
          const target = touchTargets.nth(i);
          const targetBox = await target.boundingBox();

          if (targetBox) {
            // Should have some margin from edges
            expect(targetBox.x).toBeGreaterThan(10);
            expect(targetBox.x + targetBox.width).toBeLessThan(deviceMatrix[deviceName as keyof typeof deviceMatrix].viewport.width - 10);
          }
        }

        await context.close();
      }
    });

    test('should optimize for iPad multitasking', async ({ browser }) => {
      const iPadDevices = ['iPad Mini (6th gen)', 'iPad (9th gen)', 'iPad Pro 11"', 'iPad Pro 12.9"'];

      for (const deviceName of iPadDevices) {
        const context = await browser.newContext(deviceMatrix[deviceName as keyof typeof deviceMatrix]);
        const page = await context.newPage();

        await page.goto('http://localhost:4000/login');
        await page.locator('input[type="email"]').fill(testAccounts.customer.email);
        await page.locator('input[type="password"]').fill(testAccounts.customer.password);
        await page.locator('button[type="submit"]').tap();
        await page.waitForURL(/.*\/customer.*/);

        // Test multitasking viewport (1/3 width)
        const originalWidth = deviceMatrix[deviceName as keyof typeof deviceMatrix].viewport.width;
        const multitaskWidth = Math.floor(originalWidth / 3);

        await page.setViewportSize({
          width: multitaskWidth,
          height: deviceMatrix[deviceName as keyof typeof deviceMatrix].viewport.height
        });

        await page.waitForTimeout(500);

        // Interface should remain functional
        await expect(page.locator('body')).toBeVisible();

        // Should not have horizontal overflow
        const hasOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        expect(hasOverflow).toBe(false);

        await context.close();
      }
    });
  });
});