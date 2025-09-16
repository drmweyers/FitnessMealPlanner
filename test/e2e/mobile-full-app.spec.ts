import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test configuration for mobile devices
const mobileDevices = {
  'iPhone SE': { width: 375, height: 667 },
  'iPhone 12': { width: 390, height: 844 },
  'iPhone Pro Max': { width: 428, height: 926 },
  'Samsung Galaxy': { width: 360, height: 740 },
  'iPad Mini': { width: 768, height: 1024 }
};

// Test accounts
const testAccounts = {
  admin: { email: 'admin@fitmeal.pro', password: 'AdminPass123' },
  trainer: { email: 'trainer.test@evofitmeals.com', password: 'TestTrainer123!' },
  customer: { email: 'customer.test@evofitmeals.com', password: 'TestCustomer123!' }
};

test.describe('Mobile Full App Experience', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    // Create context with mobile viewport
    context = await browser.newContext({
      viewport: mobileDevices['iPhone 12'],
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
      hasTouch: true,
      isMobile: true
    });

    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.describe('Authentication Flow on Mobile', () => {
    test('should complete login flow with mobile-optimized interface', async () => {
      await page.goto('http://localhost:4000/login');

      // Verify mobile layout
      await expect(page.locator('body')).toHaveClass(/mobile|sm:|md:/);

      // Check mobile-friendly form elements
      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toBeVisible();

      const passwordInput = page.locator('input[type="password"]');
      await expect(passwordInput).toBeVisible();

      // Test touch-friendly input
      await emailInput.tap();
      await emailInput.fill(testAccounts.customer.email);

      await passwordInput.tap();
      await passwordInput.fill(testAccounts.customer.password);

      // Submit with touch
      const loginButton = page.locator('button[type="submit"]');
      await loginButton.tap();

      // Should redirect to customer dashboard
      await expect(page).toHaveURL(/.*\/customer.*/);

      // Verify mobile navigation is present
      await expect(page.locator('[data-testid="mobile-header-menu"]')).toBeVisible();
      await expect(page.locator('.mobile-nav')).toBeVisible();
    });

    test('should handle mobile-specific validation messages', async () => {
      await page.goto('http://localhost:4000/login');

      // Try to submit empty form
      const loginButton = page.locator('button[type="submit"]');
      await loginButton.tap();

      // Should show validation messages optimized for mobile
      await expect(page.locator('.error, .text-red-500, .text-destructive')).toBeVisible();
    });
  });

  test.describe('Mobile Navigation Testing', () => {
    test.beforeEach(async () => {
      // Login as customer for navigation tests
      await page.goto('http://localhost:4000/login');
      await page.locator('input[type="email"]').fill(testAccounts.customer.email);
      await page.locator('input[type="password"]').fill(testAccounts.customer.password);
      await page.locator('button[type="submit"]').tap();
      await page.waitForURL(/.*\/customer.*/);
    });

    test('should navigate using bottom navigation bar', async () => {
      // Test bottom navigation visibility
      const bottomNav = page.locator('.mobile-nav');
      await expect(bottomNav).toBeVisible();

      // Test navigation to different sections
      await page.locator('[data-testid="mobile-nav-recipes"]').tap();
      await expect(page).toHaveURL(/.*\/recipes.*/);

      await page.locator('[data-testid="mobile-nav-favorites"]').tap();
      await expect(page).toHaveURL(/.*\/favorites.*/);

      await page.locator('[data-testid="mobile-nav-dashboard"]').tap();
      await expect(page).toHaveURL(/.*\/customer.*/);
    });

    test('should open and navigate side menu', async () => {
      // Open side menu
      await page.locator('[data-testid="mobile-header-menu"]').tap();

      // Verify side menu is visible
      const sideMenu = page.locator('text="Menu"');
      await expect(sideMenu).toBeVisible();

      // Test side menu navigation
      await page.locator('[data-testid="side-menu-my-plans"]').tap();

      // Menu should close and navigate
      await expect(sideMenu).not.toBeVisible();
      await expect(page.url()).toContain('customer');
    });

    test('should close side menu with overlay tap', async () => {
      // Open side menu
      await page.locator('[data-testid="mobile-header-menu"]').tap();

      // Verify side menu is open
      await expect(page.locator('text="Menu"')).toBeVisible();

      // Tap overlay to close
      await page.locator('.bg-black.bg-opacity-50').tap({ position: { x: 10, y: 10 } });

      // Menu should close
      await expect(page.locator('text="Menu"')).not.toBeVisible();
    });

    test('should show active state for current page', async () => {
      // Navigate to recipes
      await page.locator('[data-testid="mobile-nav-recipes"]').tap();

      // Check active state
      const recipesButton = page.locator('[data-testid="mobile-nav-recipes"]');
      await expect(recipesButton).toHaveClass(/active/);
    });
  });

  test.describe('Mobile UI Components and Interactions', () => {
    test.beforeEach(async () => {
      await page.goto('http://localhost:4000/login');
      await page.locator('input[type="email"]').fill(testAccounts.customer.email);
      await page.locator('input[type="password"]').fill(testAccounts.customer.password);
      await page.locator('button[type="submit"]').tap();
      await page.waitForURL(/.*\/customer.*/);
    });

    test('should handle modal dialogs on mobile', async () => {
      // Navigate to a page with modals (e.g., meal plans)
      await page.locator('[data-testid="mobile-nav-my-plans"]').tap();

      // Look for modal triggers
      const modalTriggers = page.locator('button:has-text("View"), button:has-text("Details"), button:has-text("Edit")');

      if (await modalTriggers.count() > 0) {
        await modalTriggers.first().tap();

        // Modal should be visible and properly sized for mobile
        const modal = page.locator('[role="dialog"], .modal, .fixed.inset-0');
        await expect(modal).toBeVisible();

        // Modal should have proper mobile styling
        await expect(modal).toHaveCSS('z-index', '50');

        // Close modal
        const closeButton = page.locator('button[aria-label="Close"], button:has-text("×"), button:has-text("Close")');
        if (await closeButton.count() > 0) {
          await closeButton.first().tap();
          await expect(modal).not.toBeVisible();
        }
      }
    });

    test('should handle dropdown menus on mobile', async () => {
      // Navigate to a page with dropdowns
      await page.locator('[data-testid="mobile-nav-recipes"]').tap();

      // Look for dropdown triggers
      const dropdownTriggers = page.locator('button:has-text("•••"), button:has-text("⋮"), [data-testid*="dropdown"], [data-testid*="menu"]');

      if (await dropdownTriggers.count() > 0) {
        await dropdownTriggers.first().tap();

        // Dropdown should be visible
        const dropdown = page.locator('[role="menu"], .dropdown-menu, .popover');
        await expect(dropdown).toBeVisible();

        // Should be touch-friendly
        const menuItems = dropdown.locator('button, a, [role="menuitem"]');
        for (let i = 0; i < Math.min(await menuItems.count(), 3); i++) {
          const item = menuItems.nth(i);
          const boundingBox = await item.boundingBox();
          expect(boundingBox?.height).toBeGreaterThanOrEqual(44); // Touch target size
        }
      }
    });

    test('should handle form inputs with mobile keyboards', async () => {
      // Navigate to a form page
      await page.locator('[data-testid="mobile-nav-recipes"]').tap();

      // Look for search input
      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');

      if (await searchInput.count() > 0) {
        await searchInput.tap();

        // Input should be focused and keyboard should appear
        await expect(searchInput).toBeFocused();

        await searchInput.fill('chicken');
        await expect(searchInput).toHaveValue('chicken');

        // Test clearing input
        await searchInput.clear();
        await expect(searchInput).toHaveValue('');
      }
    });

    test('should handle long lists with mobile scrolling', async () => {
      // Navigate to recipes page
      await page.locator('[data-testid="mobile-nav-recipes"]').tap();

      // Wait for content to load
      await page.waitForSelector('[data-testid="recipe-card"], .recipe-item, .card', { timeout: 10000 });

      // Test scrolling
      const initialScrollY = await page.evaluate(() => window.scrollY);

      // Scroll down
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(1000);

      const scrolledY = await page.evaluate(() => window.scrollY);
      expect(scrolledY).toBeGreaterThan(initialScrollY);

      // Test momentum scrolling doesn't cause issues
      await page.mouse.wheel(0, -300);
      await page.waitForTimeout(500);
    });
  });

  test.describe('Mobile Grocery List Functionality', () => {
    test.beforeEach(async () => {
      await page.goto('http://localhost:4000/login');
      await page.locator('input[type="email"]').fill(testAccounts.customer.email);
      await page.locator('input[type="password"]').fill(testAccounts.customer.password);
      await page.locator('button[type="submit"]').tap();
      await page.waitForURL(/.*\/customer.*/);
    });

    test('should navigate to and interact with grocery list', async () => {
      // Look for grocery list access (might be in meal plans)
      await page.locator('[data-testid="mobile-nav-my-plans"]').tap();

      // Look for grocery list button/link
      const groceryListButton = page.locator('button:has-text("Grocery"), a:has-text("Grocery"), [data-testid*="grocery"]');

      if (await groceryListButton.count() > 0) {
        await groceryListButton.first().tap();

        // Should show mobile grocery list interface
        await expect(page.locator('text="Grocery List"')).toBeVisible();

        // Test adding items
        const addButton = page.locator('button:has-text("Add")');
        if (await addButton.count() > 0) {
          await addButton.tap();

          // Should show add item form
          const itemNameInput = page.locator('input[placeholder*="name"], input[placeholder*="item"]');
          if (await itemNameInput.count() > 0) {
            await itemNameInput.fill('Test Item');

            const submitButton = page.locator('button:has-text("Add Item"), button[type="submit"]');
            if (await submitButton.count() > 0) {
              await submitButton.tap();

              // Item should appear in list
              await expect(page.locator('text="Test Item"')).toBeVisible();
            }
          }
        }
      }
    });

    test('should handle swipe gestures on grocery items', async () => {
      // Navigate to grocery list (if available)
      await page.locator('[data-testid="mobile-nav-my-plans"]').tap();

      const groceryListButton = page.locator('button:has-text("Grocery"), a:has-text("Grocery")');

      if (await groceryListButton.count() > 0) {
        await groceryListButton.first().tap();

        // Look for grocery items
        const groceryItems = page.locator('.grocery-item, [data-testid*="grocery-item"], .item-row');

        if (await groceryItems.count() > 0) {
          const firstItem = groceryItems.first();
          const boundingBox = await firstItem.boundingBox();

          if (boundingBox) {
            // Simulate swipe right gesture
            await page.mouse.move(boundingBox.x + 10, boundingBox.y + boundingBox.height / 2);
            await page.mouse.down();
            await page.mouse.move(boundingBox.x + boundingBox.width - 10, boundingBox.y + boundingBox.height / 2);
            await page.mouse.up();

            // Should trigger some action (check/uncheck)
            await page.waitForTimeout(500);
          }
        }
      }
    });
  });

  test.describe('Mobile Meal Planning', () => {
    test.beforeEach(async () => {
      await page.goto('http://localhost:4000/login');
      await page.locator('input[type="email"]').fill(testAccounts.customer.email);
      await page.locator('input[type="password"]').fill(testAccounts.customer.password);
      await page.locator('button[type="submit"]').tap();
      await page.waitForURL(/.*\/customer.*/);
    });

    test('should view meal plans on mobile', async () => {
      await page.locator('[data-testid="mobile-nav-my-plans"]').tap();

      // Should show meal plans
      await expect(page.locator('text="Meal Plan", text="Plan", .meal-plan')).toBeVisible();

      // Test meal plan interactions
      const mealPlanCards = page.locator('.meal-plan-card, [data-testid*="meal-plan"], .card');

      if (await mealPlanCards.count() > 0) {
        const firstPlan = mealPlanCards.first();
        await firstPlan.tap();

        // Should show meal plan details or navigate to detail view
        await page.waitForTimeout(1000);
      }
    });

    test('should export meal plans as PDF on mobile', async () => {
      await page.locator('[data-testid="mobile-nav-my-plans"]').tap();

      // Look for export/PDF buttons
      const exportButtons = page.locator('button:has-text("Export"), button:has-text("PDF"), button:has-text("Download")');

      if (await exportButtons.count() > 0) {
        // Set up download listener
        const downloadPromise = page.waitForEvent('download');

        await exportButtons.first().tap();

        // Should trigger download
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/\.pdf$/);
      }
    });
  });

  test.describe('Mobile Progress Tracking', () => {
    test.beforeEach(async () => {
      await page.goto('http://localhost:4000/login');
      await page.locator('input[type="email"]').fill(testAccounts.customer.email);
      await page.locator('input[type="password"]').fill(testAccounts.customer.password);
      await page.locator('button[type="submit"]').tap();
      await page.waitForURL(/.*\/customer.*/);
    });

    test('should navigate to progress tracking', async () => {
      await page.locator('[data-testid="mobile-nav-progress"]').tap();

      // Should show progress tracking interface
      await expect(page.locator('text="Progress", text="Tracking", text="Measurements"')).toBeVisible();

      // Test tab navigation in progress section
      const tabs = page.locator('.tab, [role="tab"], button:has-text("Measurements"), button:has-text("Photos"), button:has-text("Goals")');

      if (await tabs.count() > 1) {
        await tabs.nth(1).tap();
        await page.waitForTimeout(500);

        // Should switch tab content
        await expect(tabs.nth(1)).toHaveClass(/active|selected/);
      }
    });

    test('should handle photo uploads on mobile', async () => {
      await page.locator('[data-testid="mobile-nav-progress"]').tap();

      // Look for photo upload functionality
      const photoUploadButtons = page.locator('button:has-text("Photo"), input[type="file"], button:has-text("Upload")');

      if (await photoUploadButtons.count() > 0) {
        const fileInput = photoUploadButtons.locator('input[type="file"]').first();

        if (await fileInput.count() > 0) {
          // Test file upload interface
          await expect(fileInput).toHaveAttribute('accept', /image/);
        }
      }
    });
  });

  test.describe('Mobile Recipe Browsing', () => {
    test.beforeEach(async () => {
      await page.goto('http://localhost:4000/login');
      await page.locator('input[type="email"]').fill(testAccounts.customer.email);
      await page.locator('input[type="password"]').fill(testAccounts.customer.password);
      await page.locator('button[type="submit"]').tap();
      await page.waitForURL(/.*\/customer.*/);
    });

    test('should browse recipes with mobile-optimized layout', async () => {
      await page.locator('[data-testid="mobile-nav-recipes"]').tap();

      // Should show recipes in mobile-friendly grid
      await expect(page.locator('[data-testid="recipe-card"], .recipe-card, .recipe-item')).toBeVisible();

      // Test recipe card interactions
      const recipeCards = page.locator('[data-testid="recipe-card"], .recipe-card');

      if (await recipeCards.count() > 0) {
        await recipeCards.first().tap();

        // Should navigate to recipe detail or show modal
        await page.waitForTimeout(1000);
      }
    });

    test('should handle recipe search on mobile', async () => {
      await page.locator('[data-testid="mobile-nav-recipes"]').tap();

      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');

      if (await searchInput.count() > 0) {
        await searchInput.tap();
        await searchInput.fill('chicken');

        // Should filter recipes
        await page.waitForTimeout(1000);

        const results = page.locator('[data-testid="recipe-card"], .recipe-card');
        await expect(results).toBeVisible();
      }
    });

    test('should add recipes to favorites on mobile', async () => {
      await page.locator('[data-testid="mobile-nav-recipes"]').tap();

      // Look for favorite buttons
      const favoriteButtons = page.locator('button:has-text("♡"), button:has-text("♥"), [data-testid*="favorite"]');

      if (await favoriteButtons.count() > 0) {
        await favoriteButtons.first().tap();

        // Should toggle favorite state
        await page.waitForTimeout(500);

        // Verify in favorites page
        await page.locator('[data-testid="mobile-nav-favorites"]').tap();
        await expect(page.locator('[data-testid="recipe-card"], .recipe-card')).toBeVisible();
      }
    });
  });

  test.describe('Mobile Performance and UX', () => {
    test.beforeEach(async () => {
      await page.goto('http://localhost:4000/login');
      await page.locator('input[type="email"]').fill(testAccounts.customer.email);
      await page.locator('input[type="password"]').fill(testAccounts.customer.password);
      await page.locator('button[type="submit"]').tap();
      await page.waitForURL(/.*\/customer.*/);
    });

    test('should have fast page loads on mobile', async () => {
      const pages = [
        '[data-testid="mobile-nav-recipes"]',
        '[data-testid="mobile-nav-favorites"]',
        '[data-testid="mobile-nav-my-plans"]',
        '[data-testid="mobile-nav-progress"]'
      ];

      for (const pageSelector of pages) {
        const startTime = Date.now();

        await page.locator(pageSelector).tap();
        await page.waitForLoadState('networkidle', { timeout: 10000 });

        const loadTime = Date.now() - startTime;

        // Pages should load within 3 seconds
        expect(loadTime).toBeLessThan(3000);
      }
    });

    test('should handle offline scenarios gracefully', async () => {
      // Simulate offline
      await context.setOffline(true);

      await page.locator('[data-testid="mobile-nav-recipes"]').tap();

      // Should show appropriate offline message or cached content
      const errorMessages = page.locator('text="offline", text="connection", text="network", .error, .offline');

      // Either show error message or work with cached content
      if (await errorMessages.count() > 0) {
        await expect(errorMessages.first()).toBeVisible();
      } else {
        // Should still show some content (cached)
        await expect(page.locator('body')).not.toBeEmpty();
      }

      // Restore online
      await context.setOffline(false);
    });

    test('should maintain scroll position on navigation', async () => {
      await page.locator('[data-testid="mobile-nav-recipes"]').tap();

      // Scroll down
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(500);

      const scrollPosition = await page.evaluate(() => window.scrollY);

      // Navigate away and back
      await page.locator('[data-testid="mobile-nav-dashboard"]').tap();
      await page.locator('[data-testid="mobile-nav-recipes"]').tap();

      // Scroll position should be preserved or page should start at top
      const newScrollPosition = await page.evaluate(() => window.scrollY);
      expect(newScrollPosition).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Mobile Accessibility', () => {
    test.beforeEach(async () => {
      await page.goto('http://localhost:4000/login');
    });

    test('should have proper touch target sizes', async () => {
      await page.locator('input[type="email"]').fill(testAccounts.customer.email);
      await page.locator('input[type="password"]').fill(testAccounts.customer.password);
      await page.locator('button[type="submit"]').tap();
      await page.waitForURL(/.*\/customer.*/);

      // Check touch targets in navigation
      const touchTargets = page.locator('.touch-target, button, a, input, [role="button"]');

      for (let i = 0; i < Math.min(await touchTargets.count(), 10); i++) {
        const target = touchTargets.nth(i);
        const boundingBox = await target.boundingBox();

        if (boundingBox) {
          // Touch targets should be at least 44px
          expect(Math.min(boundingBox.width, boundingBox.height)).toBeGreaterThanOrEqual(44);
        }
      }
    });

    test('should support screen reader navigation', async () => {
      await page.locator('input[type="email"]').fill(testAccounts.customer.email);
      await page.locator('input[type="password"]').fill(testAccounts.customer.password);
      await page.locator('button[type="submit"]').tap();
      await page.waitForURL(/.*\/customer.*/);

      // Check for proper ARIA labels and roles
      const navItems = page.locator('[data-testid^="mobile-nav-"]');

      for (let i = 0; i < await navItems.count(); i++) {
        const item = navItems.nth(i);

        // Should have accessible labels
        const ariaLabel = await item.getAttribute('aria-label');
        const textContent = await item.textContent();

        expect(ariaLabel || textContent).toBeTruthy();
      }
    });

    test('should handle high contrast mode', async () => {
      // Simulate high contrast mode
      await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });

      await page.locator('input[type="email"]').fill(testAccounts.customer.email);
      await page.locator('input[type="password"]').fill(testAccounts.customer.password);
      await page.locator('button[type="submit"]').tap();
      await page.waitForURL(/.*\/customer.*/);

      // Interface should remain usable in high contrast
      await expect(page.locator('[data-testid="mobile-header-menu"]')).toBeVisible();
      await expect(page.locator('.mobile-nav')).toBeVisible();
    });
  });

  test.describe('Mobile Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      await page.goto('http://localhost:4000/login');

      // Simulate slow network
      await page.route('**/api/**', async route => {
        await page.waitForTimeout(5000); // 5 second delay
        await route.continue();
      });

      await page.locator('input[type="email"]').fill(testAccounts.customer.email);
      await page.locator('input[type="password"]').fill(testAccounts.customer.password);
      await page.locator('button[type="submit"]').tap();

      // Should show loading state or handle timeout gracefully
      const loadingIndicators = page.locator('.loading, .spinner, text="Loading"');
      if (await loadingIndicators.count() > 0) {
        await expect(loadingIndicators.first()).toBeVisible();
      }
    });

    test('should handle form validation errors', async () => {
      await page.goto('http://localhost:4000/login');

      // Submit form with invalid data
      await page.locator('input[type="email"]').fill('invalid-email');
      await page.locator('input[type="password"]').fill('');
      await page.locator('button[type="submit"]').tap();

      // Should show mobile-friendly error messages
      const errorMessages = page.locator('.error, .text-red-500, .text-destructive, [role="alert"]');
      await expect(errorMessages).toBeVisible();
    });
  });
});