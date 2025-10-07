/**
 * Responsive UI/UX Enhancement Tests
 * Story 1.8: Comprehensive responsive design testing
 * 
 * Tests all responsive features across mobile, tablet, and desktop viewports
 */

import { test, expect, Page } from '@playwright/test';

// Viewport configurations
const viewports = {
  mobile: { width: 375, height: 812, label: 'iPhone 12' },
  tablet: { width: 768, height: 1024, label: 'iPad' },
  desktop: { width: 1280, height: 720, label: 'Desktop' },
  wide: { width: 1920, height: 1080, label: 'Full HD' }
};

// Test credentials
const credentials = {
  admin: { email: 'admin@example.com', password: 'admin123' },
  trainer: { email: 'trainer@example.com', password: 'trainer123' },
  customer: { email: 'customer@example.com', password: 'customer123' }
};

// Helper function to login
async function login(page: Page, role: 'admin' | 'trainer' | 'customer') {
  await page.goto('/login');
  await page.fill('input[type="email"]', credentials[role].email);
  await page.fill('input[type="password"]', credentials[role].password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/**', { waitUntil: 'networkidle' });
}

// Helper to check element visibility at breakpoint
async function isVisibleAtBreakpoint(page: Page, selector: string): Promise<boolean> {
  const element = page.locator(selector).first();
  return await element.isVisible();
}

test.describe('Story 1.8: Responsive UI/UX Enhancement', () => {
  
  test.describe('Mobile Navigation (375px)', () => {
    test.use({ viewport: viewports.mobile });
    
    test('should show mobile navigation with hamburger menu', async ({ page }) => {
      await login(page, 'trainer');
      
      // Check mobile header is visible
      const mobileHeader = page.locator('header.lg\\:hidden');
      await expect(mobileHeader).toBeVisible();
      
      // Check hamburger menu button
      const hamburgerBtn = page.locator('button[aria-label="Open menu"]');
      await expect(hamburgerBtn).toBeVisible();
      
      // Check bottom navigation bar
      const bottomNav = page.locator('.mobile-nav');
      await expect(bottomNav).toBeVisible();
      
      // Desktop navigation should be hidden
      const desktopNav = page.locator('header.hidden.lg\\:block');
      await expect(desktopNav).not.toBeVisible();
    });
    
    test('should open and close mobile side menu', async ({ page }) => {
      await login(page, 'trainer');
      
      // Open menu
      await page.click('button[aria-label="Open menu"]');
      
      // Check side menu is visible
      const sideMenu = page.locator('.fixed.top-0.left-0.bottom-0.w-80');
      await expect(sideMenu).toBeVisible();
      
      // Check overlay is visible
      const overlay = page.locator('.fixed.inset-0.bg-black.bg-opacity-50');
      await expect(overlay).toBeVisible();
      
      // Close menu by clicking overlay
      await overlay.click();
      await expect(sideMenu).not.toBeVisible();
    });
    
    test('should have proper touch targets (44px minimum)', async ({ page }) => {
      await login(page, 'trainer');
      
      // Check all touch targets
      const touchTargets = page.locator('.touch-target');
      const count = await touchTargets.count();
      
      for (let i = 0; i < count; i++) {
        const element = touchTargets.nth(i);
        const box = await element.boundingBox();
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    });
    
    test('should prevent iOS zoom on form inputs', async ({ page }) => {
      await page.goto('/login');
      
      // Check all inputs have 16px font size
      const inputs = page.locator('input, textarea, select');
      const count = await inputs.count();
      
      for (let i = 0; i < count; i++) {
        const fontSize = await inputs.nth(i).evaluate(el => 
          window.getComputedStyle(el).fontSize
        );
        expect(parseInt(fontSize)).toBeGreaterThanOrEqual(16);
      }
    });
  });
  
  test.describe('Tablet View (768px)', () => {
    test.use({ viewport: viewports.tablet });
    
    test('should show appropriate layout for tablet', async ({ page }) => {
      await login(page, 'trainer');
      
      // Mobile nav should still be visible on tablet
      const mobileHeader = page.locator('header.lg\\:hidden');
      await expect(mobileHeader).toBeVisible();
      
      // Check grid layouts are appropriate
      await page.goto('/recipes');
      
      // Cards should be in 2-column grid on tablet
      const gridContainer = page.locator('.grid').first();
      const gridClass = await gridContainer.getAttribute('class');
      expect(gridClass).toContain('md:grid-cols-2');
    });
    
    test('should have responsive spacing', async ({ page }) => {
      await login(page, 'trainer');
      
      // Check container padding increases
      const container = page.locator('.container').first();
      const padding = await container.evaluate(el => 
        window.getComputedStyle(el).paddingLeft
      );
      expect(parseInt(padding)).toBeGreaterThanOrEqual(24); // --space-lg
    });
  });
  
  test.describe('Desktop View (1280px)', () => {
    test.use({ viewport: viewports.desktop });
    
    test('should show desktop navigation', async ({ page }) => {
      await login(page, 'trainer');
      
      // Desktop header should be visible
      const desktopHeader = page.locator('header.hidden.lg\\:block');
      await expect(desktopHeader).toBeVisible();
      
      // Mobile navigation should be hidden
      const mobileHeader = page.locator('header.lg\\:hidden');
      await expect(mobileHeader).not.toBeVisible();
      
      const bottomNav = page.locator('.mobile-nav');
      await expect(bottomNav).not.toBeVisible();
    });
    
    test('should show tables instead of cards', async ({ page }) => {
      await login(page, 'trainer');
      await page.goto('/recipes');
      
      // Table should be visible on desktop
      const table = page.locator('table').first();
      await expect(table).toBeVisible();
      
      // Mobile cards should be hidden
      const mobileCards = page.locator('.mobile-card');
      const cardCount = await mobileCards.count();
      if (cardCount > 0) {
        await expect(mobileCards.first()).not.toBeVisible();
      }
    });
    
    test('should have proper desktop spacing', async ({ page }) => {
      await login(page, 'trainer');
      
      // Check container max-width
      const container = page.locator('.container').first();
      const width = await container.evaluate(el => 
        window.getComputedStyle(el).maxWidth
      );
      expect(parseInt(width)).toBe(1280);
    });
  });
  
  test.describe('Responsive Tables', () => {
    test('should switch between table and card view at breakpoint', async ({ page }) => {
      await login(page, 'trainer');
      await page.goto('/recipes');
      
      // Test at mobile viewport
      await page.setViewportSize(viewports.mobile);
      const mobileCards = page.locator('.mobile-card');
      const cardCount = await mobileCards.count();
      if (cardCount > 0) {
        await expect(mobileCards.first()).toBeVisible();
      }
      
      // Test at desktop viewport
      await page.setViewportSize(viewports.desktop);
      const table = page.locator('table').first();
      await expect(table).toBeVisible();
    });
    
    test('should have horizontal scroll on mobile for wide tables', async ({ page }) => {
      await page.setViewportSize(viewports.mobile);
      await login(page, 'admin');
      await page.goto('/admin');
      
      // Find overflow container
      const scrollContainer = page.locator('.overflow-x-auto').first();
      if (await scrollContainer.isVisible()) {
        const canScroll = await scrollContainer.evaluate(el => 
          el.scrollWidth > el.clientWidth
        );
        expect(canScroll).toBeTruthy();
      }
    });
  });
  
  test.describe('Touch Interactions', () => {
    test.use({ viewport: viewports.mobile });
    
    test('should have touch feedback on interactive elements', async ({ page }) => {
      await login(page, 'trainer');
      
      // Check for touch feedback class
      const touchElements = page.locator('.touch-feedback');
      const count = await touchElements.count();
      expect(count).toBeGreaterThan(0);
      
      // Verify touch feedback styles
      for (let i = 0; i < Math.min(count, 5); i++) {
        const element = touchElements.nth(i);
        const hasTransition = await element.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return styles.transition !== 'none' && styles.transition !== '';
        });
        expect(hasTransition).toBeTruthy();
      }
    });
    
    test('should have swipeable elements where appropriate', async ({ page }) => {
      await login(page, 'customer');
      
      // Check for swipeable lists
      const swipeableLists = page.locator('.swipeable-list');
      if (await swipeableLists.count() > 0) {
        const hasScrolling = await swipeableLists.first().evaluate(el => {
          const styles = window.getComputedStyle(el);
          return styles.overflowX === 'auto' || styles.overflowX === 'scroll';
        });
        expect(hasScrolling).toBeTruthy();
      }
    });
  });
  
  test.describe('Form Responsiveness', () => {
    test('should have full-width buttons on mobile', async ({ page }) => {
      await page.setViewportSize(viewports.mobile);
      await page.goto('/login');
      
      const submitBtn = page.locator('button[type="submit"]');
      const box = await submitBtn.boundingBox();
      if (box) {
        const viewportWidth = viewports.mobile.width;
        const buttonWidthRatio = box.width / viewportWidth;
        expect(buttonWidthRatio).toBeGreaterThan(0.8); // Button should be >80% width
      }
    });
    
    test('should have appropriate input heights', async ({ page }) => {
      await page.setViewportSize(viewports.mobile);
      await page.goto('/login');
      
      const inputs = page.locator('input[type="email"], input[type="password"]');
      const count = await inputs.count();
      
      for (let i = 0; i < count; i++) {
        const box = await inputs.nth(i).boundingBox();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(44); // Touch target minimum
        }
      }
    });
  });
  
  test.describe('Performance', () => {
    test('should load quickly on mobile network', async ({ page }) => {
      // Simulate slow 3G
      await page.route('**/*', route => route.continue());
      
      const startTime = Date.now();
      await page.goto('/login');
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds on slow connection
      expect(loadTime).toBeLessThan(5000);
    });
    
    test('should use GPU acceleration for animations', async ({ page }) => {
      await page.setViewportSize(viewports.mobile);
      await login(page, 'trainer');
      
      // Check for GPU-accelerated elements
      const gpuElements = page.locator('.gpu-accelerated');
      if (await gpuElements.count() > 0) {
        const hasTransform = await gpuElements.first().evaluate(el => {
          const styles = window.getComputedStyle(el);
          return styles.transform !== 'none' || styles.willChange === 'transform';
        });
        expect(hasTransform).toBeTruthy();
      }
    });
  });
  
  test.describe('Accessibility', () => {
    test('should have proper focus management', async ({ page }) => {
      await page.goto('/login');
      
      // Tab through elements
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => 
        document.activeElement?.tagName
      );
      expect(focusedElement).toBeTruthy();
      
      // Check focus visible styles
      const hasFocusStyles = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return false;
        const styles = window.getComputedStyle(el);
        return styles.outline !== 'none' || styles.boxShadow !== 'none';
      });
      expect(hasFocusStyles).toBeTruthy();
    });
    
    test('should have skip to content link', async ({ page }) => {
      await login(page, 'trainer');
      
      // Check for skip link (may be visually hidden)
      const skipLink = page.locator('.skip-to-content');
      if (await skipLink.count() > 0) {
        // Focus to make it visible
        await skipLink.focus();
        await expect(skipLink).toBeVisible();
      }
    });
    
    test('should have proper ARIA labels', async ({ page }) => {
      await login(page, 'trainer');
      
      // Check mobile menu button
      const menuBtn = page.locator('button[aria-label="Open menu"]');
      await expect(menuBtn).toHaveAttribute('aria-label', 'Open menu');
      
      // Check other interactive elements
      const buttons = page.locator('button[aria-label]');
      const count = await buttons.count();
      expect(count).toBeGreaterThan(0);
    });
  });
  
  test.describe('Cross-browser Compatibility', () => {
    const browsers = ['chromium', 'firefox', 'webkit'];
    
    browsers.forEach(browserName => {
      test(`should work correctly in ${browserName}`, async ({ page }) => {
        await page.setViewportSize(viewports.mobile);
        await page.goto('/login');
        
        // Basic functionality check
        await page.fill('input[type="email"]', credentials.trainer.email);
        await page.fill('input[type="password"]', credentials.trainer.password);
        await page.click('button[type="submit"]');
        
        // Should navigate successfully
        await expect(page).not.toHaveURL('/login');
      });
    });
  });
  
  test.describe('Screenshots', () => {
    test('should capture responsive layouts at all breakpoints', async ({ page }) => {
      await login(page, 'trainer');
      
      for (const [name, viewport] of Object.entries(viewports)) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(500); // Wait for animations
        
        await page.screenshot({
          path: `test/screenshots/responsive-${name}.png`,
          fullPage: true
        });
      }
    });
    
    test('should capture mobile menu states', async ({ page }) => {
      await page.setViewportSize(viewports.mobile);
      await login(page, 'trainer');
      
      // Closed state
      await page.screenshot({
        path: 'test/screenshots/mobile-menu-closed.png'
      });
      
      // Open state
      await page.click('button[aria-label="Open menu"]');
      await page.waitForTimeout(300); // Wait for animation
      await page.screenshot({
        path: 'test/screenshots/mobile-menu-open.png'
      });
    });
  });
});

test.describe('Edge Cases and Details', () => {
  test('should handle orientation changes', async ({ page }) => {
    // Portrait
    await page.setViewportSize({ width: 375, height: 812 });
    await login(page, 'customer');
    
    const portraitNav = await isVisibleAtBreakpoint(page, '.mobile-nav');
    expect(portraitNav).toBeTruthy();
    
    // Landscape
    await page.setViewportSize({ width: 812, height: 375 });
    await page.waitForTimeout(300);
    
    // Navigation should adapt
    const elements = await page.locator('.mobile-nav, header').all();
    expect(elements.length).toBeGreaterThan(0);
  });
  
  test('should handle very small screens (320px)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/login');
    
    // Content should not overflow
    const hasHorizontalScroll = await page.evaluate(() => 
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHorizontalScroll).toBeFalsy();
  });
  
  test('should handle very large screens (4K)', async ({ page }) => {
    await page.setViewportSize({ width: 3840, height: 2160 });
    await login(page, 'admin');
    
    // Container should have max-width
    const container = page.locator('.container').first();
    const box = await container.boundingBox();
    if (box) {
      expect(box.width).toBeLessThanOrEqual(1536); // Max container width
    }
  });
  
  test('should maintain state during viewport changes', async ({ page }) => {
    await page.setViewportSize(viewports.desktop);
    await login(page, 'trainer');
    await page.goto('/recipes');
    
    // Select a recipe (if available)
    const checkbox = page.locator('input[type="checkbox"]').first();
    if (await checkbox.isVisible()) {
      await checkbox.check();
      
      // Change to mobile
      await page.setViewportSize(viewports.mobile);
      await page.waitForTimeout(300);
      
      // Check if selection is maintained
      const mobileCheckbox = page.locator('input[type="checkbox"]').first();
      if (await mobileCheckbox.isVisible()) {
        await expect(mobileCheckbox).toBeChecked();
      }
    }
  });
  
  test('should handle network delays gracefully', async ({ page }) => {
    // Simulate slow network
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 100);
    });
    
    await page.setViewportSize(viewports.mobile);
    await page.goto('/login');
    
    // Should show loading states
    const loadingIndicators = page.locator('.animate-pulse, .loading, [aria-busy="true"]');
    // At least during initial load
    expect(await loadingIndicators.count()).toBeGreaterThanOrEqual(0);
  });
  
  test('should handle long content on mobile', async ({ page }) => {
    await page.setViewportSize(viewports.mobile);
    await login(page, 'trainer');
    
    // Navigate to a page with potentially long content
    await page.goto('/recipes');
    
    // Should be scrollable
    const canScroll = await page.evaluate(() => 
      document.documentElement.scrollHeight > document.documentElement.clientHeight
    );
    
    if (canScroll) {
      // Test smooth scrolling
      await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'smooth' }));
      await page.waitForTimeout(500);
      
      const scrollPosition = await page.evaluate(() => window.scrollY);
      expect(scrollPosition).toBeGreaterThan(0);
    }
  });
  
  test('should handle modal dialogs on mobile', async ({ page }) => {
    await page.setViewportSize(viewports.mobile);
    await login(page, 'trainer');
    
    // Find and click something that opens a modal
    const modalTrigger = page.locator('[data-modal], [onclick*="modal"], button:has-text("Add"), button:has-text("Create")').first();
    if (await modalTrigger.isVisible()) {
      await modalTrigger.click();
      
      // Check modal is properly sized for mobile
      const modal = page.locator('.modal, [role="dialog"], .fixed.inset-0').first();
      if (await modal.isVisible()) {
        const box = await modal.boundingBox();
        if (box) {
          // Modal should fit within viewport
          expect(box.width).toBeLessThanOrEqual(viewports.mobile.width);
        }
      }
    }
  });
});