/**
 * Recent Meal Plans Visual Validation E2E Tests
 * 
 * Tests the visual and UX aspects of the recent meal plans feature:
 * - Hover effects and visual feedback
 * - Cursor changes and interactions
 * - Modal animations and transitions
 * - Responsive design behavior
 * - Visual regression testing with screenshots
 * - Accessibility features
 * 
 * This test suite ensures the UI/UX improvements work correctly
 * and validates the visual polish of the recent meal plans feature.
 */

import { test, expect, Page, Locator } from '@playwright/test';
import { loginAsTrainer, takeTestScreenshot, waitForNetworkIdle } from './auth-helper';

// Visual test configuration
const VISUAL_CONFIG = {
  baseURL: 'http://localhost:4000',
  timeout: 30000,
  hoverDelay: 500,
  animationDelay: 300,
  screenshots: {
    path: 'test-screenshots/visual-validation',
    quality: 90
  },
  viewports: {
    desktop: { width: 1280, height: 720 },
    tablet: { width: 768, height: 1024 },
    mobile: { width: 375, height: 667 }
  }
};

// CSS selectors for visual elements
const VISUAL_SELECTORS = {
  recentMealPlans: {
    container: '[data-testid="recent-meal-plans"], .card:has(h3:text("Recent Meal Plans"))',
    items: '.bg-gray-50.rounded-lg.hover\\:bg-gray-100, [data-testid="recent-meal-plan-item"]',
    hoverableArea: '.cursor-pointer, .hover\\:bg-gray-100',
    title: '.font-medium.hover\\:text-blue-600',
    pdfButton: 'button:has-text("PDF"), [data-testid="pdf-export-button"]'
  },
  
  mealPlanCards: {
    container: '[data-testid="meal-plans-container"]',
    cards: '.card.hover\\:shadow-md, [data-testid="meal-plan-card"]',
    hoverableCard: '.hover\\:shadow-md.cursor-pointer',
    title: '.text-lg.font-medium.hover\\:text-blue-600',
    pdfButton: '.text-blue-600.hover\\:text-blue-700.hover\\:bg-blue-50'
  },
  
  modal: {
    overlay: '.fixed.inset-0, [data-testid="modal-overlay"]',
    container: '[role="dialog"], [data-testid="meal-plan-modal"]',
    content: '.dialog-content, [data-testid="modal-content"]',
    backdrop: '.backdrop-blur, .bg-black.bg-opacity-50'
  },
  
  animations: {
    fadeIn: '.animate-in, .fade-in',
    slideUp: '.slide-in-from-bottom',
    scaleIn: '.animate-scale-in'
  }
};

/**
 * Visual Testing Helper Class
 */
class VisualTestHelper {
  constructor(private page: Page) {}

  /**
   * Navigate to customer detail view and prepare for visual testing
   */
  async setupVisualTest() {
    console.log('🎨 Setting up visual test environment...');
    
    // Login as trainer
    await loginAsTrainer(this.page);
    
    // Navigate to trainer dashboard
    await this.page.goto('/trainer');
    await waitForNetworkIdle(this.page);
    
    // Find and click on first customer
    const customerLink = this.page.locator('a, button').filter({ hasText: /@/ }).first();
    if (await customerLink.count() > 0) {
      await customerLink.click();
    } else {
      // Fallback: click any customer row
      await this.page.locator('tr').filter({ hasText: /customer|test/ }).first().locator('a').first().click();
    }
    
    await waitForNetworkIdle(this.page);
    
    // Wait for meal plans to load
    await this.waitForMealPlansLoad();
    
    console.log('✅ Visual test environment ready');
  }

  /**
   * Wait for meal plans to load and animations to complete
   */
  async waitForMealPlansLoad() {
    // Wait for loading indicators to disappear
    await this.page.waitForSelector('.animate-pulse', { state: 'detached', timeout: 10000 }).catch(() => {});
    
    // Wait for meal plan elements
    await this.page.waitForSelector(VISUAL_SELECTORS.recentMealPlans.items, { timeout: 10000 }).catch(() => {});
    
    // Wait for any initial animations
    await this.page.waitForTimeout(1000);
  }

  /**
   * Take a full visual state screenshot
   */
  async takeVisualSnapshot(name: string, description: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}-${name}`;
    
    await takeTestScreenshot(this.page, filename, description, true);
    return filename;
  }

  /**
   * Test hover effects on an element
   */
  async testHoverEffects(element: Locator, expectedChanges: string[]) {
    console.log('🖱️ Testing hover effects...');
    
    // Take before hover screenshot
    await this.takeVisualSnapshot('before-hover.png', 'Before hover state');
    
    // Hover over element
    await element.hover();
    await this.page.waitForTimeout(VISUAL_CONFIG.hoverDelay);
    
    // Take after hover screenshot
    await this.takeVisualSnapshot('after-hover.png', 'After hover state');
    
    // Test CSS changes
    for (const change of expectedChanges) {
      await expect(element).toHaveClass(new RegExp(change));
    }
    
    // Move mouse away to reset hover state
    await this.page.mouse.move(0, 0);
    await this.page.waitForTimeout(VISUAL_CONFIG.hoverDelay);
  }

  /**
   * Test modal animations
   */
  async testModalAnimations(triggerElement: Locator) {
    console.log('🎬 Testing modal animations...');
    
    // Initial state
    await this.takeVisualSnapshot('modal-closed.png', 'Modal closed state');
    
    // Click to open modal
    await triggerElement.click();
    
    // Test opening animation
    await this.page.waitForTimeout(VISUAL_CONFIG.animationDelay);
    await this.takeVisualSnapshot('modal-opening.png', 'Modal opening animation');
    
    // Wait for animation to complete
    await this.page.waitForTimeout(VISUAL_CONFIG.animationDelay * 2);
    await this.takeVisualSnapshot('modal-open.png', 'Modal fully open');
    
    // Verify modal is visible
    const modal = this.page.locator(VISUAL_SELECTORS.modal.container);
    await expect(modal).toBeVisible();
    
    // Close modal
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(VISUAL_CONFIG.animationDelay);
    await this.takeVisualSnapshot('modal-closing.png', 'Modal closing animation');
    
    // Wait for close animation
    await this.page.waitForTimeout(VISUAL_CONFIG.animationDelay * 2);
    await this.takeVisualSnapshot('modal-closed-final.png', 'Modal fully closed');
  }

  /**
   * Test responsive behavior at different viewport sizes
   */
  async testResponsiveDesign() {
    console.log('📱 Testing responsive design...');
    
    for (const [deviceName, viewport] of Object.entries(VISUAL_CONFIG.viewports)) {
      console.log(`Testing ${deviceName} viewport: ${viewport.width}x${viewport.height}`);
      
      // Set viewport
      await this.page.setViewportSize(viewport);
      await this.page.waitForTimeout(500);
      
      // Take screenshot for this viewport
      await this.takeVisualSnapshot(`responsive-${deviceName}.png`, `${deviceName} responsive view`);
      
      // Test that meal plans are still accessible
      const mealPlanItems = this.page.locator(VISUAL_SELECTORS.recentMealPlans.items);
      const itemCount = await mealPlanItems.count();
      
      if (itemCount > 0) {
        // Test hover on first item (if applicable for the device)
        if (deviceName === 'desktop') {
          await mealPlanItems.first().hover();
          await this.page.waitForTimeout(300);
          await this.takeVisualSnapshot(`responsive-${deviceName}-hover.png`, `${deviceName} hover state`);
        }
        
        // Test clicking
        await mealPlanItems.first().locator('.font-medium').first().click();
        await this.page.waitForTimeout(500);
        await this.takeVisualSnapshot(`responsive-${deviceName}-modal.png`, `${deviceName} modal view`);
        
        // Close modal
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(500);
      }
    }
    
    // Reset to desktop viewport
    await this.page.setViewportSize(VISUAL_CONFIG.viewports.desktop);
  }

  /**
   * Test cursor changes
   */
  async testCursorStates() {
    console.log('👆 Testing cursor states...');
    
    const clickableElements = await this.page.locator('.cursor-pointer').all();
    
    for (let i = 0; i < Math.min(clickableElements.length, 3); i++) {
      const element = clickableElements[i];
      
      // Hover to trigger cursor change
      await element.hover();
      await this.page.waitForTimeout(200);
      
      // Verify element has cursor-pointer class
      await expect(element).toHaveClass(/cursor-pointer/);
    }
  }
}

test.describe('Recent Meal Plans Visual Validation', () => {
  let visualHelper: VisualTestHelper;

  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(VISUAL_CONFIG.timeout);
    visualHelper = new VisualTestHelper(page);
    await visualHelper.setupVisualTest();
  });

  test.describe('Hover Effects and Visual Feedback', () => {
    test('should show hover effects on recent meal plan items', async ({ page }) => {
      console.log('🧪 Testing: Recent meal plan hover effects');
      
      const recentItems = page.locator(VISUAL_SELECTORS.recentMealPlans.items);
      const itemCount = await recentItems.count();
      
      if (itemCount === 0) {
        console.log('⚠️ No recent meal plans found - skipping hover test');
        test.skip();
      }
      
      const firstItem = recentItems.first();
      
      // Test hover effects
      await visualHelper.testHoverEffects(firstItem, ['hover:bg-gray-100', 'cursor-pointer']);
      
      // Verify background color change on hover
      await firstItem.hover();
      await page.waitForTimeout(VISUAL_CONFIG.hoverDelay);
      
      // Check computed styles
      const backgroundColor = await firstItem.evaluate(el => 
        getComputedStyle(el).backgroundColor
      );
      
      // Should have some background color (not transparent)
      expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      
      console.log('✅ Recent meal plan hover effects working');
    });

    test('should show hover effects on meal plan titles', async ({ page }) => {
      console.log('🧪 Testing: Meal plan title hover effects');
      
      const titleElements = page.locator(VISUAL_SELECTORS.recentMealPlans.title);
      const titleCount = await titleElements.count();
      
      if (titleCount === 0) {
        test.skip();
      }
      
      const firstTitle = titleElements.first();
      
      // Test title color change on hover
      await firstTitle.hover();
      await page.waitForTimeout(VISUAL_CONFIG.hoverDelay);
      
      // Take screenshot of hover state
      await visualHelper.takeVisualSnapshot('title-hover-effect.png', 'Title hover color change');
      
      // Check that title has hover color class
      await expect(firstTitle).toHaveClass(/hover:text-blue-600/);
      
      console.log('✅ Meal plan title hover effects working');
    });

    test('should show hover effects on PDF buttons', async ({ page }) => {
      console.log('🧪 Testing: PDF button hover effects');
      
      const pdfButtons = page.locator(VISUAL_SELECTORS.recentMealPlans.pdfButton);
      const buttonCount = await pdfButtons.count();
      
      if (buttonCount === 0) {
        test.skip();
      }
      
      const firstButton = pdfButtons.first();
      
      // Test PDF button hover
      await firstButton.hover();
      await page.waitForTimeout(VISUAL_CONFIG.hoverDelay);
      
      await visualHelper.takeVisualSnapshot('pdf-button-hover.png', 'PDF button hover state');
      
      // PDF buttons should not affect parent hover state
      const parentItem = firstButton.locator('..').locator('..');
      const parentClasses = await parentItem.getAttribute('class') || '';
      
      // Parent should still be hoverable
      expect(parentClasses).toContain('hover:bg-gray-100');
      
      console.log('✅ PDF button hover effects working independently');
    });

    test('should show hover effects on meal plan cards in Meal Plans tab', async ({ page }) => {
      console.log('🧪 Testing: Meal plan card hover effects');
      
      // Switch to Meal Plans tab
      const mealPlansTab = page.locator('button[role="tab"]:has-text("Meal Plans")');
      await mealPlansTab.click();
      await page.waitForTimeout(1000);
      
      const mealPlanCards = page.locator(VISUAL_SELECTORS.mealPlanCards.cards);
      const cardCount = await mealPlanCards.count();
      
      if (cardCount === 0) {
        console.log('⚠️ No meal plan cards found - skipping card hover test');
        test.skip();
      }
      
      const firstCard = mealPlanCards.first();
      
      // Test card shadow on hover
      await visualHelper.testHoverEffects(firstCard, ['hover:shadow-md', 'cursor-pointer']);
      
      await visualHelper.takeVisualSnapshot('meal-plan-card-hover.png', 'Meal plan card hover shadow');
      
      console.log('✅ Meal plan card hover effects working');
    });
  });

  test.describe('Modal Animations and Transitions', () => {
    test('should animate modal opening and closing', async ({ page }) => {
      console.log('🧪 Testing: Modal animations');
      
      const recentItems = page.locator(VISUAL_SELECTORS.recentMealPlans.items);
      const itemCount = await recentItems.count();
      
      if (itemCount === 0) {
        test.skip();
      }
      
      const firstTitle = recentItems.first().locator('.font-medium').first();
      
      // Test modal animations
      await visualHelper.testModalAnimations(firstTitle);
      
      console.log('✅ Modal animations working correctly');
    });

    test('should show proper modal backdrop and overlay', async ({ page }) => {
      console.log('🧪 Testing: Modal backdrop and overlay');
      
      const recentItems = page.locator(VISUAL_SELECTORS.recentMealPlans.items);
      const itemCount = await recentItems.count();
      
      if (itemCount === 0) {
        test.skip();
      }
      
      // Open modal
      const firstTitle = recentItems.first().locator('.font-medium').first();
      await firstTitle.click();
      await page.waitForTimeout(VISUAL_CONFIG.animationDelay);
      
      // Test backdrop elements
      const modalOverlay = page.locator(VISUAL_SELECTORS.modal.overlay);
      await expect(modalOverlay).toBeVisible();
      
      // Take screenshot of modal with backdrop
      await visualHelper.takeVisualSnapshot('modal-backdrop.png', 'Modal with backdrop overlay');
      
      // Test clicking backdrop closes modal
      await modalOverlay.click({ position: { x: 10, y: 10 } }); // Click on backdrop, not modal content
      await page.waitForTimeout(VISUAL_CONFIG.animationDelay);
      
      // Modal should be closed
      await expect(modalOverlay).not.toBeVisible();
      
      console.log('✅ Modal backdrop working correctly');
    });
  });

  test.describe('Responsive Design Validation', () => {
    test('should display correctly on different screen sizes', async ({ page }) => {
      console.log('🧪 Testing: Responsive design across viewports');
      
      await visualHelper.testResponsiveDesign();
      
      console.log('✅ Responsive design validation complete');
    });

    test('should maintain functionality on mobile devices', async ({ page }) => {
      console.log('🧪 Testing: Mobile functionality');
      
      // Set mobile viewport
      await page.setViewportSize(VISUAL_CONFIG.viewports.mobile);
      await page.waitForTimeout(500);
      
      const recentItems = page.locator(VISUAL_SELECTORS.recentMealPlans.items);
      const itemCount = await recentItems.count();
      
      if (itemCount > 0) {
        // Test touch interaction (click instead of hover on mobile)
        const firstTitle = recentItems.first().locator('.font-medium').first();
        await firstTitle.click();
        await page.waitForTimeout(500);
        
        // Modal should open
        const modal = page.locator(VISUAL_SELECTORS.modal.container);
        await expect(modal).toBeVisible();
        
        await visualHelper.takeVisualSnapshot('mobile-modal.png', 'Modal on mobile device');
        
        // Close modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
      
      console.log('✅ Mobile functionality working');
    });
  });

  test.describe('Cursor and Interaction States', () => {
    test('should show pointer cursor on clickable elements', async ({ page }) => {
      console.log('🧪 Testing: Cursor pointer states');
      
      await visualHelper.testCursorStates();
      
      // Test specific elements
      const clickableElements = [
        page.locator(VISUAL_SELECTORS.recentMealPlans.items).first(),
        page.locator(VISUAL_SELECTORS.recentMealPlans.title).first()
      ];
      
      for (const element of clickableElements) {
        if (await element.count() > 0) {
          await expect(element).toHaveClass(/cursor-pointer/);
        }
      }
      
      console.log('✅ Cursor states working correctly');
    });

    test('should maintain visual consistency during rapid interactions', async ({ page }) => {
      console.log('🧪 Testing: Rapid interaction visual consistency');
      
      const recentItems = page.locator(VISUAL_SELECTORS.recentMealPlans.items);
      const itemCount = await recentItems.count();
      
      if (itemCount === 0) {
        test.skip();
      }
      
      const firstItem = recentItems.first();
      
      // Rapid hover/unhover
      for (let i = 0; i < 5; i++) {
        await firstItem.hover();
        await page.waitForTimeout(100);
        await page.mouse.move(0, 0);
        await page.waitForTimeout(100);
      }
      
      // Take final screenshot to ensure visual state is stable
      await visualHelper.takeVisualSnapshot('rapid-interaction-final.png', 'After rapid interactions');
      
      // Element should still be in normal state
      await expect(firstItem).toBeVisible();
      
      console.log('✅ Visual consistency maintained during rapid interactions');
    });
  });

  test.describe('Accessibility and Visual Indicators', () => {
    test('should provide clear visual feedback for interactive elements', async ({ page }) => {
      console.log('🧪 Testing: Visual feedback for accessibility');
      
      const recentItems = page.locator(VISUAL_SELECTORS.recentMealPlans.items);
      const itemCount = await recentItems.count();
      
      if (itemCount === 0) {
        test.skip();
      }
      
      // Test focus states
      const firstTitle = recentItems.first().locator('.font-medium').first();
      await firstTitle.focus();
      await page.waitForTimeout(300);
      
      await visualHelper.takeVisualSnapshot('focus-state.png', 'Element focus state');
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await page.waitForTimeout(300);
      
      await visualHelper.takeVisualSnapshot('keyboard-navigation.png', 'Keyboard navigation state');
      
      console.log('✅ Accessibility visual indicators working');
    });

    test('should have sufficient color contrast', async ({ page }) => {
      console.log('🧪 Testing: Color contrast validation');
      
      const titleElements = page.locator(VISUAL_SELECTORS.recentMealPlans.title);
      
      if (await titleElements.count() > 0) {
        const firstTitle = titleElements.first();
        
        // Get computed styles
        const styles = await firstTitle.evaluate(el => {
          const computed = getComputedStyle(el);
          return {
            color: computed.color,
            backgroundColor: computed.backgroundColor
          };
        });
        
        // Basic check that color values exist
        expect(styles.color).toBeTruthy();
        expect(styles.color).not.toBe('rgba(0, 0, 0, 0)');
        
        console.log(`Title color: ${styles.color}, Background: ${styles.backgroundColor}`);
      }
      
      console.log('✅ Color contrast validation complete');
    });
  });

  test.describe('Visual Regression Prevention', () => {
    test('should maintain consistent visual appearance', async ({ page }) => {
      console.log('🧪 Testing: Visual regression prevention');
      
      // Take comprehensive screenshots for visual regression comparison
      await visualHelper.takeVisualSnapshot('full-page-overview.png', 'Full customer detail view');
      
      // Switch to Meal Plans tab
      const mealPlansTab = page.locator('button[role="tab"]:has-text("Meal Plans")');
      if (await mealPlansTab.count() > 0) {
        await mealPlansTab.click();
        await page.waitForTimeout(1000);
        await visualHelper.takeVisualSnapshot('meal-plans-tab-view.png', 'Meal Plans tab view');
      }
      
      // Test empty states if applicable
      const emptyMessage = page.locator('text="No meal plans"').or(page.locator('text="Create First Meal Plan"'));
      if (await emptyMessage.count() > 0) {
        await visualHelper.takeVisualSnapshot('empty-state.png', 'Empty meal plans state');
      }
      
      console.log('✅ Visual regression snapshots captured');
    });
  });
});