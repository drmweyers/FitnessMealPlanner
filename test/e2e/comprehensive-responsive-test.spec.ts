import { test, expect } from '@playwright/test';

/**
 * Comprehensive Responsive Design Test Suite
 *
 * This test suite validates FitnessMealPlanner responsive design implementation
 * across multiple device categories and viewport sizes.
 *
 * Test Coverage:
 * - Mobile: 320px, 375px, 414px
 * - Tablet: 768px, 820px, 1024px
 * - Desktop: 1280px, 1920px, 2560px, 3840px (4K)
 * - Touch targets, navigation, modals, forms, tables
 */

// Test credentials
const TEST_ACCOUNTS = {
  customer: {
    email: 'customer.test@evofitmeals.com',
    password: 'TestCustomer123!'
  },
  trainer: {
    email: 'trainer.test@evofitmeals.com',
    password: 'TestTrainer123!'
  },
  admin: {
    email: 'admin@fitmeal.pro',
    password: 'AdminPass123'
  }
};

// Viewport configurations
const VIEWPORTS = {
  mobile: [
    { name: 'Mobile XS', width: 320, height: 568 },
    { name: 'Mobile iPhone SE', width: 375, height: 667 },
    { name: 'Mobile iPhone XR', width: 414, height: 896 }
  ],
  tablet: [
    { name: 'Tablet Portrait', width: 768, height: 1024 },
    { name: 'Tablet iPad Air', width: 820, height: 1180 },
    { name: 'Tablet Landscape', width: 1024, height: 768 }
  ],
  desktop: [
    { name: 'Desktop Small', width: 1280, height: 720 },
    { name: 'Desktop FHD', width: 1920, height: 1080 },
    { name: 'Desktop QHD', width: 2560, height: 1440 },
    { name: 'Desktop 4K', width: 3840, height: 2160 }
  ]
};

// Helper function to login
async function login(page, role: 'customer' | 'trainer' | 'admin') {
  const account = TEST_ACCOUNTS[role];

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Fill login form
  await page.fill('input[type="email"]', account.email);
  await page.fill('input[type="password"]', account.password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for navigation
  await page.waitForURL(/\/dashboard|\/admin/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

// Helper function to check no horizontal scroll
async function checkNoHorizontalScroll(page) {
  const hasHorizontalScroll = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  expect(hasHorizontalScroll).toBe(false);
}

// Helper function to check element is visible and clickable
async function checkTouchTarget(page, selector: string, minSize = 44) {
  const element = page.locator(selector).first();
  await expect(element).toBeVisible();

  const box = await element.boundingBox();
  if (box) {
    expect(box.width).toBeGreaterThanOrEqual(minSize);
    expect(box.height).toBeGreaterThanOrEqual(minSize);
  }
}

// Helper function to take viewport screenshot
async function takeViewportScreenshot(page, testName: string, viewportName: string) {
  await page.screenshot({
    path: `test/screenshots/responsive-${testName}-${viewportName.replace(/\s+/g, '-').toLowerCase()}.png`,
    fullPage: true
  });
}

test.describe('Comprehensive Responsive Design Tests', () => {

  test.describe('Login Page Responsiveness', () => {
    VIEWPORTS.mobile.concat(VIEWPORTS.tablet, VIEWPORTS.desktop).forEach(viewport => {
      test(`Login page responsive at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Check no horizontal scroll
        await checkNoHorizontalScroll(page);

        // Check login form elements are visible
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();

        // Check touch targets on mobile
        if (viewport.width <= 414) {
          await checkTouchTarget(page, 'button[type="submit"]', 44);
        }

        // Check form takes appropriate width
        const formWidth = await page.locator('form').first().boundingBox();
        if (formWidth) {
          const expectedWidth = viewport.width <= 768 ? viewport.width * 0.9 : Math.min(400, viewport.width * 0.3);
          expect(formWidth.width).toBeLessThanOrEqual(expectedWidth + 50); // Allow some margin
        }

        await takeViewportScreenshot(page, 'login', viewport.name);
      });
    });
  });

  test.describe('Customer Dashboard Responsiveness', () => {
    VIEWPORTS.mobile.concat(VIEWPORTS.tablet, VIEWPORTS.desktop).forEach(viewport => {
      test(`Customer dashboard responsive at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        await login(page, 'customer');

        // Check no horizontal scroll
        await checkNoHorizontalScroll(page);

        // Check navigation is appropriate for viewport
        if (viewport.width <= 768) {
          // Mobile: hamburger menu should be visible
          const mobileMenu = page.locator('[data-testid="mobile-menu"], button[aria-label*="menu"], .mobile-menu-button');
          if (await mobileMenu.count() > 0) {
            await expect(mobileMenu.first()).toBeVisible();
          }
        } else {
          // Desktop: full navigation should be visible
          const desktopNav = page.locator('nav, .desktop-nav, .main-navigation');
          if (await desktopNav.count() > 0) {
            await expect(desktopNav.first()).toBeVisible();
          }
        }

        // Check main content area
        const mainContent = page.locator('main, .main-content, .dashboard-content').first();
        if (await mainContent.count() > 0) {
          await expect(mainContent).toBeVisible();

          const contentBox = await mainContent.boundingBox();
          if (contentBox) {
            // Content should use full width on mobile, constrained on desktop
            if (viewport.width <= 768) {
              expect(contentBox.width).toBeGreaterThan(viewport.width * 0.85);
            } else {
              expect(contentBox.width).toBeLessThan(viewport.width);
            }
          }
        }

        await takeViewportScreenshot(page, 'customer-dashboard', viewport.name);
      });
    });
  });

  test.describe('Meal Plan Cards Layout', () => {
    VIEWPORTS.mobile.concat(VIEWPORTS.tablet, VIEWPORTS.desktop).forEach(viewport => {
      test(`Meal plan cards layout at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        await login(page, 'customer');

        // Navigate to meal plans if not already there
        const mealPlanSection = page.locator('.meal-plan-card, .meal-card, [data-testid*="meal"]').first();
        if (await mealPlanSection.count() > 0) {
          await expect(mealPlanSection).toBeVisible();

          // Check card layout adapts to viewport
          const cards = page.locator('.meal-plan-card, .meal-card, [data-testid*="meal"]');
          const cardCount = await cards.count();

          if (cardCount > 0) {
            // Get first card dimensions
            const cardBox = await cards.first().boundingBox();
            if (cardBox) {
              // Cards should stack on mobile, side-by-side on larger screens
              if (viewport.width <= 768) {
                expect(cardBox.width).toBeGreaterThan(viewport.width * 0.8);
              } else {
                expect(cardBox.width).toBeLessThan(viewport.width * 0.6);
              }
            }
          }
        }

        await checkNoHorizontalScroll(page);
        await takeViewportScreenshot(page, 'meal-plan-cards', viewport.name);
      });
    });
  });

  test.describe('Modal Dialog Behavior', () => {
    VIEWPORTS.mobile.concat(VIEWPORTS.tablet, VIEWPORTS.desktop).forEach(viewport => {
      test(`Modal behavior at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        await login(page, 'customer');

        // Try to find and click a modal trigger
        const modalTriggers = [
          'button:has-text("Add")',
          'button:has-text("View")',
          'button:has-text("Edit")',
          '.meal-card button',
          '[data-testid*="modal-trigger"]'
        ];

        let modalOpened = false;
        for (const trigger of modalTriggers) {
          const triggerElement = page.locator(trigger).first();
          if (await triggerElement.count() > 0 && await triggerElement.isVisible()) {
            await triggerElement.click();
            await page.waitForTimeout(1000);

            // Check if modal opened
            const modal = page.locator('.modal, [role="dialog"], .dialog').first();
            if (await modal.count() > 0 && await modal.isVisible()) {
              modalOpened = true;

              const modalBox = await modal.boundingBox();
              if (modalBox) {
                // Mobile: modal should be full-screen or near full-screen
                if (viewport.width <= 768) {
                  expect(modalBox.width).toBeGreaterThan(viewport.width * 0.85);
                } else {
                  // Desktop: modal should be centered and not full-screen
                  expect(modalBox.width).toBeLessThan(viewport.width * 0.8);
                }
              }

              // Try to close modal
              const closeButton = page.locator('[aria-label="Close"], .close-button, button:has-text("Close")').first();
              if (await closeButton.count() > 0) {
                await closeButton.click();
              } else {
                await page.keyboard.press('Escape');
              }
              break;
            }
          }
        }

        await checkNoHorizontalScroll(page);
        await takeViewportScreenshot(page, 'modal-behavior', viewport.name);
      });
    });
  });

  test.describe('Progress Tracking Tables', () => {
    VIEWPORTS.mobile.concat(VIEWPORTS.tablet, VIEWPORTS.desktop).forEach(viewport => {
      test(`Progress tracking tables at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        await login(page, 'customer');

        // Navigate to Progress section
        const progressLink = page.locator('a:has-text("Progress"), button:has-text("Progress"), [href*="progress"]').first();
        if (await progressLink.count() > 0) {
          await progressLink.click();
          await page.waitForLoadState('networkidle');

          // Check for tables or table-like content
          const tables = page.locator('table, .table, .data-table');
          const tableCount = await tables.count();

          if (tableCount > 0) {
            for (let i = 0; i < Math.min(tableCount, 3); i++) {
              const table = tables.nth(i);
              if (await table.isVisible()) {
                const tableBox = await table.boundingBox();
                if (tableBox) {
                  // Mobile: tables should transform to cards or have horizontal scroll
                  if (viewport.width <= 768) {
                    // Check if table transforms to card layout or has scroll
                    const hasScroll = await page.evaluate((element) => {
                      return element.scrollWidth > element.clientWidth;
                    }, await table.elementHandle());

                    // Either table should fit or be in a scrollable container
                    expect(tableBox.width <= viewport.width || hasScroll).toBe(true);
                  }
                }
              }
            }
          }
        }

        await checkNoHorizontalScroll(page);
        await takeViewportScreenshot(page, 'progress-tables', viewport.name);
      });
    });
  });

  test.describe('Form Usability Across Devices', () => {
    VIEWPORTS.mobile.concat(VIEWPORTS.tablet, VIEWPORTS.desktop).forEach(viewport => {
      test(`Form usability at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        await login(page, 'customer');

        // Look for forms on the page
        const forms = page.locator('form');
        const formCount = await forms.count();

        if (formCount > 0) {
          const form = forms.first();
          await expect(form).toBeVisible();

          // Check form inputs
          const inputs = form.locator('input, textarea, select');
          const inputCount = await inputs.count();

          for (let i = 0; i < Math.min(inputCount, 5); i++) {
            const input = inputs.nth(i);
            if (await input.isVisible()) {
              const inputBox = await input.boundingBox();
              if (inputBox) {
                // Touch targets should be at least 44px on mobile
                if (viewport.width <= 414) {
                  expect(inputBox.height).toBeGreaterThanOrEqual(40);
                }

                // Inputs should be appropriately sized
                expect(inputBox.width).toBeGreaterThan(100);
                expect(inputBox.width).toBeLessThan(viewport.width);
              }
            }
          }

          // Check form buttons
          const buttons = form.locator('button');
          const buttonCount = await buttons.count();

          for (let i = 0; i < Math.min(buttonCount, 3); i++) {
            const button = buttons.nth(i);
            if (await button.isVisible()) {
              await checkTouchTarget(page, `form button >> nth=${i}`, viewport.width <= 414 ? 44 : 32);
            }
          }
        }

        await checkNoHorizontalScroll(page);
        await takeViewportScreenshot(page, 'form-usability', viewport.name);
      });
    });
  });

  test.describe('Navigation Menu Behavior', () => {
    VIEWPORTS.mobile.concat(VIEWPORTS.tablet, VIEWPORTS.desktop).forEach(viewport => {
      test(`Navigation behavior at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        await login(page, 'customer');

        if (viewport.width <= 768) {
          // Mobile: Check for hamburger menu
          const mobileMenuTrigger = page.locator('button[aria-label*="menu"], .mobile-menu-button, [data-testid="mobile-menu"]').first();

          if (await mobileMenuTrigger.count() > 0) {
            await expect(mobileMenuTrigger).toBeVisible();
            await checkTouchTarget(page, 'button[aria-label*="menu"], .mobile-menu-button, [data-testid="mobile-menu"]', 44);

            // Test menu toggle
            await mobileMenuTrigger.click();
            await page.waitForTimeout(500);

            const mobileMenu = page.locator('.mobile-menu, .menu-open, [role="navigation"]').first();
            if (await mobileMenu.count() > 0) {
              await expect(mobileMenu).toBeVisible();

              // Menu should cover significant portion of screen on mobile
              const menuBox = await mobileMenu.boundingBox();
              if (menuBox) {
                expect(menuBox.width).toBeGreaterThan(viewport.width * 0.7);
              }

              // Close menu
              await mobileMenuTrigger.click();
            }
          }
        } else {
          // Desktop: Check for full navigation
          const desktopNav = page.locator('nav, .desktop-nav, .main-navigation').first();
          if (await desktopNav.count() > 0) {
            await expect(desktopNav).toBeVisible();

            // Check navigation links are properly sized
            const navLinks = desktopNav.locator('a, button');
            const linkCount = await navLinks.count();

            for (let i = 0; i < Math.min(linkCount, 5); i++) {
              const link = navLinks.nth(i);
              if (await link.isVisible()) {
                const linkBox = await link.boundingBox();
                if (linkBox) {
                  expect(linkBox.height).toBeGreaterThanOrEqual(32);
                }
              }
            }
          }
        }

        await checkNoHorizontalScroll(page);
        await takeViewportScreenshot(page, 'navigation', viewport.name);
      });
    });
  });

  test.describe('Width Utilization Tests', () => {
    VIEWPORTS.mobile.concat(VIEWPORTS.tablet, VIEWPORTS.desktop).forEach(viewport => {
      test(`Width utilization at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        await login(page, 'customer');

        // Check main container width utilization
        const mainContainer = page.locator('main, .main-content, .container, .dashboard').first();
        if (await mainContainer.count() > 0) {
          const containerBox = await mainContainer.boundingBox();
          if (containerBox) {
            if (viewport.width <= 768) {
              // Mobile: should use close to 100% width
              expect(containerBox.width).toBeGreaterThan(viewport.width * 0.85);
            } else {
              // Desktop: should use around 90% or have max-width constraint
              const utilizationRatio = containerBox.width / viewport.width;
              expect(utilizationRatio).toBeGreaterThan(0.6);
              expect(utilizationRatio).toBeLessThan(1.0);
            }
          }
        }

        await checkNoHorizontalScroll(page);
        await takeViewportScreenshot(page, 'width-utilization', viewport.name);
      });
    });
  });

  test.describe('Edge Case Testing', () => {
    test('Very small screen (320px) handles all content', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });

      await login(page, 'customer');

      // All interactive elements should be accessible
      await checkNoHorizontalScroll(page);

      // Check critical UI elements are still usable
      const criticalElements = [
        'button, a, input',
        '.meal-card, .meal-plan-card',
        'nav, .navigation'
      ];

      for (const selector of criticalElements) {
        const elements = page.locator(selector);
        const count = await elements.count();

        for (let i = 0; i < Math.min(count, 3); i++) {
          const element = elements.nth(i);
          if (await element.isVisible()) {
            const box = await element.boundingBox();
            if (box) {
              expect(box.width).toBeLessThanOrEqual(320);
            }
          }
        }
      }

      await takeViewportScreenshot(page, 'edge-case-320px', 'very-small');
    });

    test('4K display (3840px) properly utilizes space', async ({ page }) => {
      await page.setViewportSize({ width: 3840, height: 2160 });

      await login(page, 'customer');

      // Content should not stretch to full width on very large screens
      const mainContent = page.locator('main, .main-content, .container').first();
      if (await mainContent.count() > 0) {
        const contentBox = await mainContent.boundingBox();
        if (contentBox) {
          // Content should have reasonable max-width on 4K
          expect(contentBox.width).toBeLessThan(3840 * 0.8);
          expect(contentBox.width).toBeGreaterThan(1200);
        }
      }

      await checkNoHorizontalScroll(page);
      await takeViewportScreenshot(page, 'edge-case-4k', 'ultra-wide');
    });

    test('Orientation change simulation', async ({ page }) => {
      // Start in portrait mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await login(page, 'customer');

      await checkNoHorizontalScroll(page);

      // Switch to landscape
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(1000);

      await checkNoHorizontalScroll(page);

      // Check that layout adapts
      const content = page.locator('main, .main-content').first();
      if (await content.count() > 0) {
        await expect(content).toBeVisible();
      }

      await takeViewportScreenshot(page, 'orientation-change', 'landscape');
    });
  });

  test.describe('Multi-Role Responsive Testing', () => {
    ['customer', 'trainer', 'admin'].forEach(role => {
      test(`${role} dashboard responsive across viewports`, async ({ page }) => {
        const testViewports = [
          { width: 375, height: 667 },  // Mobile
          { width: 768, height: 1024 }, // Tablet
          { width: 1280, height: 720 }  // Desktop
        ];

        for (const viewport of testViewports) {
          await page.setViewportSize(viewport);
          await login(page, role as 'customer' | 'trainer' | 'admin');

          await checkNoHorizontalScroll(page);

          // Check role-specific content is accessible
          const roleContent = page.locator('main, .dashboard, .admin-panel').first();
          if (await roleContent.count() > 0) {
            await expect(roleContent).toBeVisible();
          }

          await takeViewportScreenshot(page, `${role}-multi-viewport`, `${viewport.width}x${viewport.height}`);

          // Logout for next iteration
          const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout"), [href*="logout"]').first();
          if (await logoutButton.count() > 0) {
            await logoutButton.click();
            await page.waitForURL('/', { timeout: 5000 });
          }
        }
      });
    });
  });
});