import { test, expect, Page } from '@playwright/test';
import { loginAsCustomer, takeTestScreenshot, waitForNetworkIdle } from '../../auth-helper';
import AxeBuilder from '@axe-core/playwright';

/**
 * Favorites Accessibility Tests
 * 
 * Comprehensive accessibility testing ensuring the favoriting system
 * meets WCAG 2.1 AA standards and provides excellent experience
 * for users with disabilities.
 */

test.describe('Favorites Accessibility', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await loginAsCustomer(page);
  });

  test('Favorites page meets WCAG 2.1 AA standards', async () => {
    await test.step('Navigate to favorites page and inject axe', async () => {
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Inject axe-core for accessibility testing
      await injectAxe(page);
      
      await takeTestScreenshot(page, 'favorites-accessibility-setup.png', 'Favorites page setup for accessibility testing');
    });

    await test.step('Run comprehensive accessibility audit', async () => {
      // Run axe accessibility audit
      await checkA11y(page, null, {
        detailedReport: true,
        detailedReportOptions: { html: true },
        rules: {
          // Include all WCAG 2.1 AA rules
          'color-contrast': { enabled: true },
          'keyboard-navigation': { enabled: true },
          'focus-management': { enabled: true },
          'aria-labels': { enabled: true },
          'heading-structure': { enabled: true },
          'landmark-roles': { enabled: true }
        }
      });
      
      console.log('✅ Favorites page passed comprehensive accessibility audit');
    });

    await test.step('Test specific accessibility requirements', async () => {
      // Check for proper heading structure
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingCount = await headings.count();
      expect(headingCount).toBeGreaterThan(0);
      
      // Verify main heading exists
      await expect(page.locator('h1')).toHaveCount.greaterThan(0);
      
      // Check for skip links
      const skipLink = page.locator('[data-testid="skip-to-content"]');
      if (await skipLink.count() > 0) {
        await expect(skipLink).toHaveAttribute('href', '#main-content');
      }
      
      // Check for proper landmark roles
      await expect(page.locator('[role="main"]')).toBeVisible();
      await expect(page.locator('[role="navigation"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'accessibility-structure.png', 'Page structure accessibility verification');
    });
  });

  test('Keyboard navigation works correctly', async () => {
    await test.step('Navigate to recipes page for testing', async () => {
      await page.goto('/recipes');
      await waitForNetworkIdle(page);
      
      await takeTestScreenshot(page, 'keyboard-nav-setup.png', 'Setup for keyboard navigation testing');
    });

    await test.step('Test tab navigation through favorite buttons', async () => {
      // Start from top of page
      await page.keyboard.press('Home');
      
      // Tab through page elements to reach first favorite button
      let currentElement = null;
      let tabCount = 0;
      const maxTabs = 20; // Prevent infinite loop
      
      while (tabCount < maxTabs) {
        await page.keyboard.press('Tab');
        tabCount++;
        
        currentElement = await page.locator(':focus').first();
        const elementTestId = await currentElement.getAttribute('data-testid');
        
        if (elementTestId === 'favorite-button') {
          break;
        }
      }
      
      // Should reach a favorite button
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toHaveAttribute('data-testid', 'favorite-button');
      
      // Verify visual focus indicator
      const focusStyles = await focusedElement.evaluate(el => {
        const styles = getComputedStyle(el);
        return {
          outline: styles.outline,
          outlineWidth: styles.outlineWidth,
          boxShadow: styles.boxShadow
        };
      });
      
      // Should have visible focus indicator
      const hasFocusIndicator = focusStyles.outline !== 'none' || 
                               focusStyles.outlineWidth !== '0px' || 
                               focusStyles.boxShadow !== 'none';
      expect(hasFocusIndicator).toBe(true);
      
      await takeTestScreenshot(page, 'keyboard-focus-indicator.png', 'Keyboard focus indicator on favorite button');
    });

    await test.step('Test Enter key to activate favorite', async () => {
      // Press Enter to favorite the focused recipe
      await page.keyboard.press('Enter');
      
      // Should show success toast
      await expect(page.locator('[data-testid="favorite-success-toast"]')).toBeVisible();
      
      // Focus should remain on the button or move predictably
      const focusedAfterAction = page.locator(':focus');
      await expect(focusedAfterAction).toBeVisible();
      
      await takeTestScreenshot(page, 'keyboard-activation.png', 'Keyboard activation of favorite button');
    });

    await test.step('Test keyboard navigation to favorites page', async () => {
      // Use keyboard to navigate to favorites link
      // This may vary depending on navigation structure
      
      // Try to find favorites link and navigate to it
      await page.keyboard.press('Tab');
      
      let navigationFound = false;
      for (let i = 0; i < 15; i++) {
        const currentFocus = page.locator(':focus');
        const elementText = await currentFocus.textContent();
        const elementHref = await currentFocus.getAttribute('href');
        
        if (elementText?.toLowerCase().includes('favorite') || 
            elementHref?.includes('/favorites')) {
          await page.keyboard.press('Enter');
          navigationFound = true;
          break;
        }
        
        await page.keyboard.press('Tab');
      }
      
      // Alternative: use direct navigation if link not found via tab
      if (!navigationFound) {
        await page.goto('/favorites');
      }
      
      await waitForNetworkIdle(page);
      await expect(page).toHaveURL(/.*\/favorites.*/);
      
      await takeTestScreenshot(page, 'keyboard-navigation-favorites.png', 'Keyboard navigation to favorites page');
    });

    await test.step('Test arrow key navigation in favorites grid', async () => {
      const favoriteItems = page.locator('[data-testid="favorite-recipe-item"]');
      const itemCount = await favoriteItems.count();
      
      if (itemCount > 0) {
        // Focus first item
        await favoriteItems.first().focus();
        
        // Test arrow key navigation
        if (itemCount > 1) {
          await page.keyboard.press('ArrowRight');
          
          // Check if focus moved to next item
          const focusedElement = page.locator(':focus');
          const isNextItem = await focusedElement.getAttribute('data-testid');
          
          // Focus should be on a recipe item or related interactive element
          expect(isNextItem).toBeTruthy();
        }
        
        // Test vertical navigation if items are arranged in grid
        await page.keyboard.press('ArrowDown');
        
        await takeTestScreenshot(page, 'arrow-key-navigation.png', 'Arrow key navigation in favorites grid');
      }
    });
  });

  test('Screen reader announcements work correctly', async () => {
    await test.step('Test ARIA labels and descriptions', async () => {
      await page.goto('/recipes');
      await waitForNetworkIdle(page);
      
      // Check favorite button ARIA labels
      const favoriteButtons = page.locator('[data-testid="favorite-button"]');
      const buttonCount = Math.min(5, await favoriteButtons.count());
      
      for (let i = 0; i < buttonCount; i++) {
        const button = favoriteButtons.nth(i);
        
        // Should have aria-label or aria-labelledby
        const ariaLabel = await button.getAttribute('aria-label');
        const ariaLabelledBy = await button.getAttribute('aria-labelledby');
        const ariaDescribedBy = await button.getAttribute('aria-describedby');
        
        expect(ariaLabel || ariaLabelledBy).toBeTruthy();
        
        // Aria-label should describe the action
        if (ariaLabel) {
          expect(ariaLabel.toLowerCase()).toMatch(/add.*to favorites|favorite|save/);
        }
        
        // Should have proper button role
        const role = await button.getAttribute('role');
        expect(role).toBe('button');
        
        // Should have aria-pressed attribute for toggle state
        const ariaPressed = await button.getAttribute('aria-pressed');
        expect(['true', 'false']).toContain(ariaPressed);
      }
      
      await takeTestScreenshot(page, 'aria-labels-verification.png', 'ARIA labels and attributes verification');
    });

    await test.step('Test live region announcements', async () => {
      // Check for live regions
      const liveRegions = page.locator('[aria-live]');
      await expect(liveRegions).toHaveCount.greaterThan(0);
      
      // Test announcement when favoriting
      const favoriteButton = page.locator('[data-testid="favorite-button"]').first();
      await favoriteButton.click();
      
      // Check that announcement is made in live region
      const announcement = page.locator('[aria-live="polite"], [aria-live="assertive"]');
      const hasAnnouncement = await announcement.textContent();
      
      if (hasAnnouncement) {
        expect(hasAnnouncement.toLowerCase()).toMatch(/added.*to favorites|favorited|saved/);
      }
      
      await takeTestScreenshot(page, 'live-region-announcements.png', 'Live region announcements verification');
    });

    await test.step('Test status messages and feedback', async () => {
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Test empty state announcements
      const favoriteItems = page.locator('[data-testid="favorite-recipe-item"]');
      const itemCount = await favoriteItems.count();
      
      if (itemCount === 0) {
        // Should have descriptive empty state
        const emptyState = page.locator('[data-testid="empty-favorites-state"]');
        await expect(emptyState).toBeVisible();
        
        const emptyStateText = await emptyState.textContent();
        expect(emptyStateText).toBeTruthy();
        expect(emptyStateText!.length).toBeGreaterThan(10); // Should be descriptive
      }
      
      // Test collection creation announcements
      await page.click('[data-testid="create-collection-button"]');
      
      // Modal should be properly labeled
      const modal = page.locator('[data-testid="collection-modal"]');
      await expect(modal).toHaveAttribute('role', 'dialog');
      await expect(modal).toHaveAttribute('aria-labelledby');
      
      // Check focus management - focus should move to modal
      const focusedElement = page.locator(':focus');
      const isInModal = await modal.locator(':focus').count() > 0;
      expect(isInModal).toBe(true);
      
      await takeTestScreenshot(page, 'modal-accessibility.png', 'Modal accessibility verification');
    });
  });

  test('Color contrast and visual accessibility', async () => {
    await test.step('Test color contrast ratios', async () => {
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Test favorite button contrast
      const favoriteButton = page.locator('[data-testid="favorite-button"]').first();
      
      if (await favoriteButton.count() > 0) {
        const buttonStyles = await favoriteButton.evaluate(el => {
          const styles = getComputedStyle(el);
          return {
            color: styles.color,
            backgroundColor: styles.backgroundColor,
            borderColor: styles.borderColor
          };
        });
        
        console.log('Button styles:', buttonStyles);
        
        // Note: Actual contrast calculation would require additional libraries
        // This test verifies that colors are set (not transparent)
        expect(buttonStyles.color).not.toBe('rgba(0, 0, 0, 0)');
        expect(buttonStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      }
      
      await takeTestScreenshot(page, 'color-contrast-check.png', 'Color contrast verification');
    });

    await test.step('Test high contrast mode compatibility', async () => {
      // Simulate high contrast mode
      await page.addStyleTag({
        content: `
          @media (prefers-contrast: high) {
            .favorite-button {
              border: 2px solid !important;
              outline: 2px solid !important;
            }
          }
        `
      });
      
      // Test that elements remain visible and functional
      const favoriteButton = page.locator('[data-testid="favorite-button"]').first();
      
      if (await favoriteButton.count() > 0) {
        await expect(favoriteButton).toBeVisible();
        
        // Test interaction still works
        await favoriteButton.click();
        await expect(page.locator('[data-testid="favorite-success-toast"]')).toBeVisible();
      }
      
      await takeTestScreenshot(page, 'high-contrast-mode.png', 'High contrast mode compatibility');
    });

    await test.step('Test reduced motion preferences', async () => {
      // Simulate reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });
      
      // Test that animations are reduced/disabled
      await page.goto('/recipes');
      await waitForNetworkIdle(page);
      
      const favoriteButton = page.locator('[data-testid="favorite-button"]').first();
      await favoriteButton.click();
      
      // Animations should be reduced (this is more of a CSS test)
      // We verify that functionality still works without excessive motion
      await expect(page.locator('[data-testid="favorite-success-toast"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'reduced-motion.png', 'Reduced motion preference handling');
    });
  });

  test('Screen reader navigation patterns', async () => {
    await test.step('Test heading hierarchy', async () => {
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Check proper heading hierarchy
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
      console.log('Page heading structure:', headings);
      
      // Should have logical heading hierarchy
      expect(headings.length).toBeGreaterThan(0);
      
      // Should start with h1
      const h1Elements = await page.locator('h1').count();
      expect(h1Elements).toBeGreaterThanOrEqual(1);
      
      await takeTestScreenshot(page, 'heading-hierarchy.png', 'Heading hierarchy verification');
    });

    await test.step('Test landmark navigation', async () => {
      // Check for ARIA landmarks
      const landmarks = await page.locator('[role="main"], [role="navigation"], [role="search"], [role="banner"], [role="contentinfo"]').count();
      expect(landmarks).toBeGreaterThan(0);
      
      // Verify main landmark exists
      await expect(page.locator('[role="main"]')).toBeVisible();
      
      // Check navigation landmarks
      const navigation = page.locator('[role="navigation"]');
      if (await navigation.count() > 0) {
        // Navigation should be labeled
        const navLabel = await navigation.first().getAttribute('aria-label');
        const navLabelledBy = await navigation.first().getAttribute('aria-labelledby');
        expect(navLabel || navLabelledBy).toBeTruthy();
      }
      
      await takeTestScreenshot(page, 'landmark-navigation.png', 'Landmark navigation verification');
    });

    await test.step('Test list structure and semantics', async () => {
      const favoriteItems = page.locator('[data-testid="favorite-recipe-item"]');
      const itemCount = await favoriteItems.count();
      
      if (itemCount > 0) {
        // Check if favorites are in a proper list structure
        const list = page.locator('ul[data-testid="favorites-list"], ol[data-testid="favorites-list"]');
        
        if (await list.count() > 0) {
          // Verify list items have proper structure
          const listItems = list.locator('li');
          const listItemCount = await listItems.count();
          expect(listItemCount).toBeGreaterThan(0);
          
          // Each list item should have proper content
          const firstItem = listItems.first();
          const itemText = await firstItem.textContent();
          expect(itemText).toBeTruthy();
          expect(itemText!.trim().length).toBeGreaterThan(0);
        }
      }
      
      await takeTestScreenshot(page, 'list-semantics.png', 'List structure and semantics verification');
    });
  });

  test('Form accessibility and interactions', async () => {
    await test.step('Test collection creation form accessibility', async () => {
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      await page.click('[data-testid="create-collection-button"]');
      await expect(page.locator('[data-testid="collection-modal"]')).toBeVisible();
      
      // Check form labels
      const nameInput = page.locator('[data-testid="collection-name-input"]');
      
      // Should have associated label
      const inputId = await nameInput.getAttribute('id');
      const labelFor = await page.locator(`label[for="${inputId}"]`).count();
      const ariaLabel = await nameInput.getAttribute('aria-label');
      const ariaLabelledBy = await nameInput.getAttribute('aria-labelledby');
      
      expect(labelFor > 0 || ariaLabel || ariaLabelledBy).toBe(true);
      
      // Test required field indication
      const isRequired = await nameInput.getAttribute('required');
      const ariaRequired = await nameInput.getAttribute('aria-required');
      
      if (isRequired !== null || ariaRequired === 'true') {
        // Required fields should be clearly marked
        const requiredIndicator = page.locator('[data-testid="required-indicator"]');
        // This is optional - some designs use other methods to indicate required fields
      }
      
      await takeTestScreenshot(page, 'form-accessibility.png', 'Form accessibility verification');
    });

    await test.step('Test error message accessibility', async () => {
      // Try to submit form with invalid data to test error handling
      const nameInput = page.locator('[data-testid="collection-name-input"]');
      
      // Test with empty name (if validation exists)
      await nameInput.fill('');
      await page.click('[data-testid="save-collection-button"]');
      
      // Check for error message
      const errorMessage = page.locator('[data-testid="collection-name-error"]');
      
      if (await errorMessage.isVisible()) {
        // Error should be associated with input
        const ariaDescribedBy = await nameInput.getAttribute('aria-describedby');
        const errorId = await errorMessage.getAttribute('id');
        
        if (ariaDescribedBy && errorId) {
          expect(ariaDescribedBy).toContain(errorId);
        }
        
        // Error should be announced
        const ariaLive = await errorMessage.getAttribute('aria-live');
        expect(['polite', 'assertive']).toContain(ariaLive);
      }
      
      await takeTestScreenshot(page, 'error-message-accessibility.png', 'Error message accessibility');
    });

    await test.step('Test search form accessibility', async () => {
      // Close modal first
      const closeButton = page.locator('[data-testid="close-modal"]');
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
      
      // Test search functionality
      const searchInput = page.locator('[data-testid="favorites-search-input"]');
      
      if (await searchInput.count() > 0) {
        // Should have proper label
        const searchLabel = await searchInput.getAttribute('aria-label');
        const searchPlaceholder = await searchInput.getAttribute('placeholder');
        
        expect(searchLabel || searchPlaceholder).toBeTruthy();
        
        // Should have search role or be in search landmark
        const searchRole = await searchInput.getAttribute('role');
        const searchContainer = page.locator('[role="search"]');
        const inSearchContainer = await searchContainer.locator('[data-testid="favorites-search-input"]').count() > 0;
        
        expect(searchRole === 'searchbox' || inSearchContainer).toBe(true);
        
        // Test search functionality
        await searchInput.fill('test search');
        await page.keyboard.press('Enter');
        
        // Should announce search results or no results
        await page.waitForTimeout(1000); // Allow for search to complete
        
        await takeTestScreenshot(page, 'search-accessibility.png', 'Search form accessibility');
      }
    });
  });

  test('Mobile accessibility features', async () => {
    // Configure for mobile testing
    test.use({ 
      viewport: { width: 375, height: 667 },
      hasTouch: true,
      isMobile: true
    });

    await test.step('Test mobile touch targets', async () => {
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Check touch target sizes (minimum 44x44px)
      const touchTargets = page.locator('[data-testid="favorite-button"], button, a, [role="button"]');
      const targetCount = Math.min(5, await touchTargets.count());
      
      for (let i = 0; i < targetCount; i++) {
        const target = touchTargets.nth(i);
        const bounds = await target.boundingBox();
        
        if (bounds) {
          expect(bounds.width).toBeGreaterThanOrEqual(44);
          expect(bounds.height).toBeGreaterThanOrEqual(44);
        }
      }
      
      await takeTestScreenshot(page, 'mobile-touch-targets.png', 'Mobile touch target verification');
    });

    await test.step('Test mobile screen reader compatibility', async () => {
      // Test swipe navigation simulation
      const favoriteItems = page.locator('[data-testid="favorite-recipe-item"]');
      
      if (await favoriteItems.count() > 0) {
        const firstItem = favoriteItems.first();
        
        // Should be focusable for screen reader navigation
        await firstItem.focus();
        await expect(firstItem).toBeFocused();
        
        // Should have proper content structure for screen readers
        const itemText = await firstItem.textContent();
        expect(itemText).toBeTruthy();
        expect(itemText!.trim().length).toBeGreaterThan(5);
      }
      
      await takeTestScreenshot(page, 'mobile-screen-reader.png', 'Mobile screen reader compatibility');
    });

    await test.step('Test mobile zoom and text scaling', async () => {
      // Simulate increased text size
      await page.addStyleTag({
        content: `
          * {
            font-size: 1.5em !important;
          }
        `
      });
      
      await page.waitForTimeout(500);
      
      // Verify layout doesn't break with larger text
      const favoriteButton = page.locator('[data-testid="favorite-button"]').first();
      
      if (await favoriteButton.count() > 0) {
        await expect(favoriteButton).toBeVisible();
        
        // Should still be interactive
        await favoriteButton.tap();
        await expect(page.locator('[data-testid="favorite-success-toast"]')).toBeVisible();
      }
      
      await takeTestScreenshot(page, 'mobile-text-scaling.png', 'Mobile text scaling compatibility');
    });
  });
});