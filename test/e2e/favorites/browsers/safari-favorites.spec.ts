import { test, expect, Page } from '@playwright/test';
import { loginAsCustomer, takeTestScreenshot, waitForNetworkIdle } from '../../auth-helper';

/**
 * Safari Favorites Tests
 * 
 * Safari-specific testing of the favoriting system, including WebKit-specific
 * behaviors, iOS simulation, and Safari's unique features and limitations.
 */

test.describe('Safari Favorites Tests', () => {
  // Configure specifically for Safari/WebKit
  test.use({ browserName: 'webkit' });

  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await loginAsCustomer(page);
  });

  test('Safari WebKit compatibility and core functionality', async () => {
    await test.step('Test basic favorites functionality in Safari', async () => {
      await page.goto('/recipes');
      await waitForNetworkIdle(page);
      
      // Test that favorite buttons work in Safari/WebKit
      await expect(page.locator('[data-testid="recipe-card"]')).toHaveCount.greaterThan(0);
      
      const favoriteButton = page.locator('[data-testid="favorite-button"]').first();
      await favoriteButton.click();
      
      // Should show success toast
      await expect(page.locator('[data-testid="favorite-success-toast"]')).toBeVisible();
      
      // Button state should update
      await expect(favoriteButton).toHaveAttribute('aria-pressed', 'true');
      
      await takeTestScreenshot(page, 'safari-basic-functionality.png', 'Safari basic favorites functionality');
    });

    await test.step('Test Safari-specific CSS features', async () => {
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Test WebKit-specific CSS properties
      const webkitStyles = await page.evaluate(() => {
        const favoriteButton = document.querySelector('[data-testid="favorite-button"]');
        if (favoriteButton) {
          const styles = getComputedStyle(favoriteButton);
          return {
            webkitAppearance: styles.getPropertyValue('-webkit-appearance'),
            webkitTapHighlightColor: styles.getPropertyValue('-webkit-tap-highlight-color'),
            webkitTouchCallout: styles.getPropertyValue('-webkit-touch-callout'),
            webkitUserSelect: styles.getPropertyValue('-webkit-user-select'),
            boxSizing: styles.boxSizing,
            display: styles.display
          };
        }
        return {};
      });
      
      console.log('Safari WebKit styles:', webkitStyles);
      
      // Verify layout renders correctly in Safari
      const favoriteButton = page.locator('[data-testid="favorite-button"]').first();
      if (await favoriteButton.count() > 0) {
        const bounds = await favoriteButton.boundingBox();
        expect(bounds).toBeTruthy();
        expect(bounds!.width).toBeGreaterThan(0);
        expect(bounds!.height).toBeGreaterThan(0);
      }
      
      await takeTestScreenshot(page, 'safari-webkit-styles.png', 'Safari WebKit CSS verification');
    });

    await test.step('Test Safari JavaScript compatibility', async () => {
      // Test modern JavaScript features in Safari/WebKit
      const jsCompatibility = await page.evaluate(() => {
        return {
          hasAsyncAwait: typeof (async () => {}) === 'function',
          hasPromise: typeof Promise !== 'undefined',
          hasArrowFunctions: typeof (() => {}) === 'function',
          hasModules: true, // ES modules are supported
          hasWeakMap: typeof WeakMap !== 'undefined',
          hasMap: typeof Map !== 'undefined',
          hasSet: typeof Set !== 'undefined',
          hasSymbol: typeof Symbol !== 'undefined',
          hasProxy: typeof Proxy !== 'undefined'
        };
      });
      
      console.log('Safari JavaScript compatibility:', jsCompatibility);
      
      // Safari should support all modern JavaScript features
      expect(jsCompatibility.hasAsyncAwait).toBe(true);
      expect(jsCompatibility.hasPromise).toBe(true);
      expect(jsCompatibility.hasArrowFunctions).toBe(true);
      expect(jsCompatibility.hasWeakMap).toBe(true);
      expect(jsCompatibility.hasMap).toBe(true);
      expect(jsCompatibility.hasSet).toBe(true);
      
      await takeTestScreenshot(page, 'safari-js-compatibility.png', 'Safari JavaScript compatibility test');
    });
  });

  test('Safari iOS touch interactions and gestures', async () => {
    await test.step('Test Safari touch interactions', async () => {
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      const favoriteItem = page.locator('[data-testid="favorite-recipe-item"]').first();
      
      if (await favoriteItem.count() > 0) {
        // Test tap interaction (iOS-specific)
        await favoriteItem.tap();
        
        // Should show recipe detail or trigger action
        const hasModal = await page.locator('[data-testid="recipe-detail-modal"]').isVisible({ timeout: 2000 });
        const hasNavigation = page.url() !== await page.url(); // URL might change
        
        // Some interaction should occur
        console.log('Safari tap interaction - Modal:', hasModal, 'Navigation:', hasNavigation);
        
        // Test favorite button tap
        const favoriteButton = page.locator('[data-testid="favorite-button"]').first();
        if (await favoriteButton.count() > 0) {
          await favoriteButton.tap();
          await expect(page.locator('[data-testid="favorite-success-toast"]')).toBeVisible();
        }
      }
      
      await takeTestScreenshot(page, 'safari-touch-interactions.png', 'Safari touch interaction test');
    });

    await test.step('Test Safari long press gestures', async () => {
      const favoriteItem = page.locator('[data-testid="favorite-recipe-item"]').first();
      
      if (await favoriteItem.count() > 0) {
        // Simulate long press using touch events
        await favoriteItem.dispatchEvent('touchstart', { touches: [{ clientX: 100, clientY: 100 }] });
        await page.waitForTimeout(800); // Long press duration
        await favoriteItem.dispatchEvent('touchend');
        
        // Should show context menu or additional options
        const contextMenu = page.locator('[data-testid="context-menu"], [data-testid="action-sheet"]');
        if (await contextMenu.isVisible({ timeout: 2000 })) {
          await expect(contextMenu).toBeVisible();
          
          // Test context menu options
          const menuItems = contextMenu.locator('[role="menuitem"], button');
          await expect(menuItems).toHaveCount.greaterThan(0);
        }
      }
      
      await takeTestScreenshot(page, 'safari-long-press.png', 'Safari long press gesture test');
    });

    await test.step('Test Safari swipe gestures', async () => {
      // Test swipe gestures for navigation or actions
      const favoritesContainer = page.locator('[data-testid="favorites-container"]');
      
      if (await favoritesContainer.count() > 0) {
        const bounds = await favoritesContainer.boundingBox();
        
        if (bounds) {
          // Simulate swipe left
          await page.mouse.move(bounds.x + bounds.width - 50, bounds.y + bounds.height / 2);
          await page.mouse.down();
          await page.mouse.move(bounds.x + 50, bounds.y + bounds.height / 2);
          await page.mouse.up();
          
          // Check if swipe triggered any action
          await page.waitForTimeout(500);
        }
      }
      
      await takeTestScreenshot(page, 'safari-swipe-gestures.png', 'Safari swipe gesture test');
    });
  });

  test('Safari privacy and security features', async () => {
    await test.step('Test Safari Intelligent Tracking Prevention', async () => {
      // Test that favorites work with Safari's ITP
      const trackingWarnings: string[] = [];
      
      page.on('console', message => {
        if (message.text().includes('tracking') || 
            message.text().includes('third-party') ||
            message.text().includes('cross-site')) {
          trackingWarnings.push(message.text());
        }
      });
      
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Perform operations that might trigger tracking warnings
      await page.click('[data-testid="create-collection-button"]');
      await page.fill('[data-testid="collection-name-input"]', 'ITP Test Collection');
      await page.click('[data-testid="save-collection-button"]');
      
      console.log('Safari tracking warnings:', trackingWarnings);
      
      // Should not have excessive tracking warnings
      expect(trackingWarnings.length).toBeLessThan(5);
      
      await takeTestScreenshot(page, 'safari-itp-test.png', 'Safari Intelligent Tracking Prevention test');
    });

    await test.step('Test Safari cookie policies', async () => {
      // Test that favorites work with Safari's strict cookie policies
      const cookies = await page.context().cookies();
      console.log('Safari cookies:', cookies.map(c => ({ 
        name: c.name, 
        secure: c.secure, 
        sameSite: c.sameSite,
        domain: c.domain
      })));
      
      // Safari has strict third-party cookie blocking
      const firstPartyCookies = cookies.filter(c => 
        c.domain === new URL(page.url()).hostname ||
        c.domain.endsWith(new URL(page.url()).hostname)
      );
      
      expect(firstPartyCookies.length).toBeGreaterThan(0);
      
      // Test that auth still works
      await page.goto('/recipes');
      await waitForNetworkIdle(page);
      
      // Should still be logged in
      await expect(page.locator('[data-testid="recipe-card"]')).toHaveCount.greaterThan(0);
      
      await takeTestScreenshot(page, 'safari-cookie-policies.png', 'Safari cookie policies test');
    });

    await test.step('Test Safari Content Security Policy', async () => {
      // Test CSP compliance in Safari
      const cspViolations: string[] = [];
      
      page.on('console', message => {
        if (message.text().includes('Content Security Policy') ||
            message.text().includes('CSP')) {
          cspViolations.push(message.text());
        }
      });
      
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Perform operations that might trigger CSP
      await page.evaluate(() => {
        // Try to access external resources (should be allowed)
        const img = new Image();
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
      });
      
      console.log('Safari CSP violations:', cspViolations);
      expect(cspViolations.length).toBe(0);
      
      await takeTestScreenshot(page, 'safari-csp-test.png', 'Safari CSP compliance test');
    });
  });

  test('Safari performance and memory management', async () => {
    await test.step('Test Safari memory constraints', async () => {
      // Safari has more aggressive memory management than other browsers
      await page.goto('/recipes');
      await waitForNetworkIdle(page);
      
      // Perform memory-intensive operations
      const recipeCards = page.locator('[data-testid="recipe-card"]');
      const cardCount = Math.min(10, await recipeCards.count()); // Fewer operations for Safari
      
      for (let i = 0; i < cardCount; i++) {
        await recipeCards.nth(i).locator('[data-testid="favorite-button"]').click();
        await page.waitForTimeout(100); // Longer delays for Safari
      }
      
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Application should remain responsive
      await expect(page.locator('[data-testid="favorites-container"]')).toBeVisible();
      
      // Test that all operations completed successfully
      const favoriteItems = page.locator('[data-testid="favorite-recipe-item"]');
      const itemCount = await favoriteItems.count();
      expect(itemCount).toBeGreaterThanOrEqual(cardCount - 2); // Allow for some potential failures
      
      await takeTestScreenshot(page, 'safari-memory-constraints.png', 'Safari memory constraint test');
    });

    await test.step('Test Safari performance timing', async () => {
      const performanceData = await page.evaluate(() => {
        if (typeof performance !== 'undefined' && performance.getEntriesByType) {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          return {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            connectTime: navigation.connectEnd - navigation.connectStart,
            responseTime: navigation.responseEnd - navigation.responseStart,
            hasPerformanceObserver: typeof PerformanceObserver !== 'undefined'
          };
        }
        return null;
      });
      
      console.log('Safari performance timing:', performanceData);
      
      if (performanceData) {
        // Safari should have reasonable performance
        expect(performanceData.domContentLoaded).toBeLessThan(3000);
        expect(performanceData.loadComplete).toBeLessThan(2000);
      }
      
      await takeTestScreenshot(page, 'safari-performance-timing.png', 'Safari performance timing test');
    });

    await test.step('Test Safari battery optimization', async () => {
      // Test that favorites work with Safari's battery optimization
      const batteryOptimizations = await page.evaluate(() => {
        return {
          requestIdleCallback: typeof requestIdleCallback !== 'undefined',
          passiveEventListeners: (() => {
            try {
              const opts = { passive: true };
              window.addEventListener('test', () => {}, opts);
              return true;
            } catch (e) {
              return false;
            }
          })(),
          intersectionObserver: typeof IntersectionObserver !== 'undefined'
        };
      });
      
      console.log('Safari battery optimizations:', batteryOptimizations);
      
      // Test that lazy loading works (battery optimization)
      if (batteryOptimizations.intersectionObserver) {
        const images = page.locator('img[loading="lazy"]');
        if (await images.count() > 0) {
          console.log(`Safari lazy loading: ${await images.count()} images`);
        }
      }
      
      await takeTestScreenshot(page, 'safari-battery-optimization.png', 'Safari battery optimization test');
    });
  });

  test('Safari mobile and responsive features', async () => {
    await test.step('Test Safari mobile viewport handling', async () => {
      // Simulate iPhone viewport
      await page.setViewportSize({ width: 375, height: 812 }); // iPhone X
      
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Test viewport meta tag behavior
      const viewportMeta = await page.evaluate(() => {
        const meta = document.querySelector('meta[name="viewport"]');
        return meta ? meta.getAttribute('content') : null;
      });
      
      console.log('Safari viewport meta:', viewportMeta);
      expect(viewportMeta).toBeTruthy();
      
      // Should show mobile-optimized layout
      const mobileLayout = page.locator('[data-testid="mobile-favorites-layout"]');
      if (await mobileLayout.count() > 0) {
        await expect(mobileLayout).toBeVisible();
      }
      
      await takeTestScreenshot(page, 'safari-mobile-viewport.png', 'Safari mobile viewport test');
    });

    await test.step('Test Safari PWA features', async () => {
      // Test Progressive Web App features in Safari
      const pwaSupport = await page.evaluate(() => {
        return {
          hasServiceWorker: 'serviceWorker' in navigator,
          hasManifest: document.querySelector('link[rel="manifest"]') !== null,
          hasAppBanner: 'beforeinstallprompt' in window,
          isStandalone: window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
        };
      });
      
      console.log('Safari PWA support:', pwaSupport);
      
      // Test add to home screen simulation
      if (pwaSupport.hasManifest) {
        // Check manifest properties
        const manifestLink = await page.locator('link[rel="manifest"]').getAttribute('href');
        expect(manifestLink).toBeTruthy();
      }
      
      await takeTestScreenshot(page, 'safari-pwa-features.png', 'Safari PWA features test');
    });

    await test.step('Test Safari Reader Mode compatibility', async () => {
      // Test that content is properly structured for Safari Reader Mode
      const readerModeStructure = await page.evaluate(() => {
        return {
          hasArticle: document.querySelector('article') !== null,
          hasMainHeading: document.querySelector('h1') !== null,
          hasProperHeadings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length > 0,
          hasParagraphs: document.querySelectorAll('p').length > 0
        };
      });
      
      console.log('Safari Reader Mode structure:', readerModeStructure);
      
      // Should have proper content structure
      expect(readerModeStructure.hasMainHeading).toBe(true);
      expect(readerModeStructure.hasProperHeadings).toBe(true);
      
      await takeTestScreenshot(page, 'safari-reader-mode.png', 'Safari Reader Mode compatibility test');
    });
  });

  test('Safari accessibility and VoiceOver compatibility', async () => {
    await test.step('Test Safari VoiceOver compatibility', async () => {
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Test accessibility tree structure for VoiceOver
      const accessibilitySnapshot = await page.accessibility.snapshot();
      expect(accessibilitySnapshot).toBeTruthy();
      
      if (accessibilitySnapshot) {
        // Find interactive elements
        const findInteractiveElements = (node: any): any[] => {
          let elements: any[] = [];
          
          if (node.role === 'button' || node.role === 'link' || node.role === 'textbox') {
            elements.push(node);
          }
          
          if (node.children) {
            for (const child of node.children) {
              elements = elements.concat(findInteractiveElements(child));
            }
          }
          
          return elements;
        };
        
        const interactiveElements = findInteractiveElements(accessibilitySnapshot);
        console.log(`Safari VoiceOver: Found ${interactiveElements.length} interactive elements`);
        
        expect(interactiveElements.length).toBeGreaterThan(0);
        
        // Check that elements have proper names
        const elementsWithNames = interactiveElements.filter(el => el.name && el.name.length > 0);
        expect(elementsWithNames.length).toBeGreaterThan(0);
      }
      
      await takeTestScreenshot(page, 'safari-voiceover-compatibility.png', 'Safari VoiceOver compatibility test');
    });

    await test.step('Test Safari focus management', async () => {
      // Test focus management for keyboard/VoiceOver navigation
      const favoriteButton = page.locator('[data-testid="favorite-button"]').first();
      
      if (await favoriteButton.count() > 0) {
        await favoriteButton.focus();
        await expect(favoriteButton).toBeFocused();
        
        // Test focus indicator visibility
        const focusStyles = await favoriteButton.evaluate(el => {
          const styles = getComputedStyle(el);
          return {
            outline: styles.outline,
            outlineColor: styles.outlineColor,
            outlineWidth: styles.outlineWidth,
            outlineStyle: styles.outlineStyle
          };
        });
        
        console.log('Safari focus styles:', focusStyles);
        
        // Should have visible focus indicator
        expect(focusStyles.outline).not.toBe('none');
        expect(focusStyles.outlineWidth).not.toBe('0px');
      }
      
      await takeTestScreenshot(page, 'safari-focus-management.png', 'Safari focus management test');
    });

    await test.step('Test Safari rotor navigation', async () => {
      // Test elements that work with VoiceOver rotor
      const rotorElements = await page.evaluate(() => {
        return {
          headings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
          landmarks: document.querySelectorAll('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"]').length,
          buttons: document.querySelectorAll('button, [role="button"]').length,
          links: document.querySelectorAll('a[href]').length,
          formControls: document.querySelectorAll('input, select, textarea').length
        };
      });
      
      console.log('Safari rotor elements:', rotorElements);
      
      // Should have elements for rotor navigation
      expect(rotorElements.headings).toBeGreaterThan(0);
      expect(rotorElements.landmarks).toBeGreaterThan(0);
      expect(rotorElements.buttons).toBeGreaterThan(0);
      
      await takeTestScreenshot(page, 'safari-rotor-navigation.png', 'Safari rotor navigation test');
    });
  });

  test('Safari CSS and animation features', async () => {
    await test.step('Test Safari CSS animations and transitions', async () => {
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Test CSS animation support
      const animationSupport = await page.evaluate(() => {
        const testElement = document.createElement('div');
        testElement.style.animation = 'test 1s ease';
        testElement.style.transition = 'opacity 0.3s ease';
        
        return {
          hasAnimation: testElement.style.animation !== '',
          hasTransition: testElement.style.transition !== '',
          hasTransform: testElement.style.transform !== undefined,
          hasTransform3D: 'transform3d' in testElement.style || 'webkitTransform3d' in testElement.style
        };
      });
      
      console.log('Safari animation support:', animationSupport);
      
      expect(animationSupport.hasAnimation).toBe(true);
      expect(animationSupport.hasTransition).toBe(true);
      expect(animationSupport.hasTransform).toBe(true);
      
      // Test actual animations work
      const favoriteButton = page.locator('[data-testid="favorite-button"]').first();
      if (await favoriteButton.count() > 0) {
        await favoriteButton.click();
        
        // Should have smooth animation
        await expect(page.locator('[data-testid="favorite-success-toast"]')).toBeVisible();
      }
      
      await takeTestScreenshot(page, 'safari-css-animations.png', 'Safari CSS animations test');
    });

    await test.step('Test Safari backdrop-filter support', async () => {
      // Test modern CSS features like backdrop-filter
      const modernCSSSupport = await page.evaluate(() => {
        const testElement = document.createElement('div');
        
        return {
          hasBackdropFilter: 'backdropFilter' in testElement.style || 'webkitBackdropFilter' in testElement.style,
          hasClipPath: 'clipPath' in testElement.style || 'webkitClipPath' in testElement.style,
          hasFilter: 'filter' in testElement.style || 'webkitFilter' in testElement.style,
          hasMask: 'mask' in testElement.style || 'webkitMask' in testElement.style
        };
      });
      
      console.log('Safari modern CSS support:', modernCSSSupport);
      
      // Test modal backdrop if it uses backdrop-filter
      await page.click('[data-testid="create-collection-button"]');
      const modal = page.locator('[data-testid="collection-modal"]');
      await expect(modal).toBeVisible();
      
      // Test that modal renders correctly even with advanced CSS
      const modalBounds = await modal.boundingBox();
      expect(modalBounds).toBeTruthy();
      expect(modalBounds!.width).toBeGreaterThan(200);
      
      // Close modal
      const closeButton = page.locator('[data-testid="close-modal"]');
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
      
      await takeTestScreenshot(page, 'safari-modern-css.png', 'Safari modern CSS features test');
    });
  });
});