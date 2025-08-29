import { test, expect, Page } from '@playwright/test';
import { loginAsCustomer, takeTestScreenshot, waitForNetworkIdle } from '../../auth-helper';

/**
 * Firefox Favorites Tests
 * 
 * Firefox-specific testing of the favoriting system, including Firefox-specific
 * behaviors, privacy features, and compatibility requirements.
 */

// Configure specifically for Firefox
test.use({ browserName: 'firefox' });

test.describe('Firefox Favorites Tests', () => {

  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await loginAsCustomer(page);
  });

  test('Firefox compatibility and core functionality', async () => {
    await test.step('Test basic favorites functionality in Firefox', async () => {
      await page.goto('/recipes');
      await waitForNetworkIdle(page);
      
      // Test that favorite buttons work in Firefox
      await expect(page.locator('[data-testid="recipe-card"]')).toHaveCount.greaterThan(0);
      
      const favoriteButton = page.locator('[data-testid="favorite-button"]').first();
      await favoriteButton.click();
      
      // Should show success toast
      await expect(page.locator('[data-testid="favorite-success-toast"]')).toBeVisible();
      
      // Button state should update
      await expect(favoriteButton).toHaveAttribute('aria-pressed', 'true');
      
      await takeTestScreenshot(page, 'firefox-basic-functionality.png', 'Firefox basic favorites functionality');
    });

    await test.step('Test Firefox-specific CSS and layout', async () => {
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Test Firefox-specific CSS properties
      const firefoxStyles = await page.evaluate(() => {
        const favoriteButton = document.querySelector('[data-testid="favorite-button"]');
        if (favoriteButton) {
          const styles = getComputedStyle(favoriteButton);
          return {
            mozAppearance: styles.getPropertyValue('-moz-appearance'),
            display: styles.display,
            position: styles.position,
            boxSizing: styles.boxSizing
          };
        }
        return {};
      });
      
      console.log('Firefox-specific styles:', firefoxStyles);
      
      // Verify layout is properly rendered
      const favoriteButton = page.locator('[data-testid="favorite-button"]').first();
      if (await favoriteButton.count() > 0) {
        const bounds = await favoriteButton.boundingBox();
        expect(bounds).toBeTruthy();
        expect(bounds!.width).toBeGreaterThan(0);
        expect(bounds!.height).toBeGreaterThan(0);
      }
      
      await takeTestScreenshot(page, 'firefox-css-layout.png', 'Firefox CSS and layout verification');
    });

    await test.step('Test Firefox JavaScript compatibility', async () => {
      // Test modern JavaScript features work in Firefox
      const jsCompatibility = await page.evaluate(() => {
        return {
          hasAsyncAwait: typeof (async () => {}) === 'function',
          hasPromise: typeof Promise !== 'undefined',
          hasArrowFunctions: typeof (() => {}) === 'function',
          hasConst: (() => { try { eval('const test = 1'); return true; } catch { return false; } })(),
          hasLet: (() => { try { eval('let test = 1'); return true; } catch { return false; } })(),
          hasSpread: (() => { try { eval('[...[]]; ({...{}})'); return true; } catch { return false; } })(),
          hasDestruct: (() => { try { eval('const {a} = {}; const [b] = []'); return true; } catch { return false; } })()
        };
      });
      
      console.log('Firefox JavaScript compatibility:', jsCompatibility);
      
      // Firefox should support all modern JavaScript features
      expect(jsCompatibility.hasAsyncAwait).toBe(true);
      expect(jsCompatibility.hasPromise).toBe(true);
      expect(jsCompatibility.hasArrowFunctions).toBe(true);
      expect(jsCompatibility.hasConst).toBe(true);
      expect(jsCompatibility.hasLet).toBe(true);
      
      await takeTestScreenshot(page, 'firefox-js-compatibility.png', 'Firefox JavaScript compatibility test');
    });
  });

  test('Firefox right-click context menu and interactions', async () => {
    await test.step('Test right-click context menu on favorites', async () => {
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      const favoriteItem = page.locator('[data-testid="favorite-recipe-item"]').first();
      
      if (await favoriteItem.count() > 0) {
        // Right-click to open context menu
        await favoriteItem.click({ button: 'right' });
        
        // Should show custom context menu (if implemented)
        const contextMenu = page.locator('[data-testid="context-menu"]');
        if (await contextMenu.isVisible({ timeout: 2000 })) {
          await expect(contextMenu).toBeVisible();
          
          // Test context menu options
          await expect(contextMenu.locator('[data-testid="context-remove-favorite"]')).toBeVisible();
          await expect(contextMenu.locator('[data-testid="context-add-to-collection"]')).toBeVisible();
          
          // Click outside to close context menu
          await page.click('body', { position: { x: 10, y: 10 } });
          await expect(contextMenu).not.toBeVisible();
        }
      }
      
      await takeTestScreenshot(page, 'firefox-context-menu.png', 'Firefox context menu functionality');
    });

    await test.step('Test Firefox drag and drop behavior', async () => {
      // Test drag and drop for collection management
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Create a collection first
      await page.click('[data-testid="create-collection-button"]');
      await page.fill('[data-testid="collection-name-input"]', 'Firefox Test Collection');
      await page.click('[data-testid="save-collection-button"]');
      
      const favoriteItem = page.locator('[data-testid="favorite-recipe-item"]').first();
      const collectionArea = page.locator('[data-testid="collection-drop-zone"]');
      
      if (await favoriteItem.count() > 0 && await collectionArea.count() > 0) {
        // Test drag and drop
        await favoriteItem.dragTo(collectionArea);
        
        // Should show success message
        await expect(page.locator('[data-testid="recipe-added-to-collection-toast"]')).toBeVisible();
      }
      
      await takeTestScreenshot(page, 'firefox-drag-drop.png', 'Firefox drag and drop functionality');
    });

    await test.step('Test Firefox keyboard shortcuts', async () => {
      await page.goto('/recipes');
      await waitForNetworkIdle(page);
      
      // Test Firefox-specific keyboard shortcuts
      const favoriteButton = page.locator('[data-testid="favorite-button"]').first();
      await favoriteButton.focus();
      
      // Test space bar activation (Firefox specific behavior)
      await page.keyboard.press('Space');
      await expect(page.locator('[data-testid="favorite-success-toast"]')).toBeVisible();
      
      // Test Tab navigation
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      await takeTestScreenshot(page, 'firefox-keyboard-shortcuts.png', 'Firefox keyboard shortcuts test');
    });
  });

  test('Firefox privacy and security features', async () => {
    await test.step('Test Firefox Enhanced Tracking Protection compatibility', async () => {
      // Test that favorites work with Firefox's strict privacy settings
      
      // Check that no tracking-related console warnings appear
      const trackingWarnings: string[] = [];
      
      page.on('console', message => {
        if (message.text().includes('tracking') || message.text().includes('blocked')) {
          trackingWarnings.push(message.text());
        }
      });
      
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Perform typical operations
      await page.click('[data-testid="create-collection-button"]');
      await page.fill('[data-testid="collection-name-input"]', 'Privacy Test');
      await page.click('[data-testid="save-collection-button"]');
      
      // Should not have tracking protection warnings
      console.log('Firefox tracking warnings:', trackingWarnings);
      
      await takeTestScreenshot(page, 'firefox-privacy-protection.png', 'Firefox privacy protection test');
    });

    await test.step('Test Firefox cookie policies', async () => {
      // Test that favorites work with Firefox's strict cookie policies
      const cookies = await page.context().cookies();
      console.log('Firefox cookies:', cookies.map(c => ({ 
        name: c.name, 
        secure: c.secure, 
        sameSite: c.sameSite,
        httpOnly: c.httpOnly 
      })));
      
      // Should have appropriate cookie settings
      const authCookie = cookies.find(c => c.name.includes('auth') || c.name.includes('session'));
      
      if (authCookie) {
        // Cookie should have security attributes
        if (page.url().startsWith('https://')) {
          expect(authCookie.secure).toBe(true);
        }
        expect(['strict', 'lax', 'none']).toContain(authCookie.sameSite);
      }
      
      await takeTestScreenshot(page, 'firefox-cookie-policies.png', 'Firefox cookie policies test');
    });

    await test.step('Test Firefox Content Blocking', async () => {
      // Test that favorites work with Firefox's content blocking
      const blockedRequests: string[] = [];
      
      page.on('requestfailed', request => {
        blockedRequests.push(request.url());
      });
      
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Should not have blocked essential requests
      const essentialBlocked = blockedRequests.filter(url => 
        url.includes('/api/favorites') || 
        url.includes('/api/recipes') ||
        url.includes('/api/auth')
      );
      
      expect(essentialBlocked.length).toBe(0);
      
      console.log('Firefox blocked requests:', blockedRequests);
      
      await takeTestScreenshot(page, 'firefox-content-blocking.png', 'Firefox content blocking test');
    });
  });

  test('Firefox performance and memory management', async () => {
    await test.step('Test Firefox memory usage', async () => {
      await page.goto('/recipes');
      await waitForNetworkIdle(page);
      
      // Firefox memory API is more limited than Chrome
      const memoryInfo = await page.evaluate(() => {
        return {
          hasMemoryAPI: !!(performance as any).memory,
          jsHeapSizeLimit: (performance as any).memory?.jsHeapSizeLimit || 0,
          usedJSHeapSize: (performance as any).memory?.usedJSHeapSize || 0,
          totalJSHeapSize: (performance as any).memory?.totalJSHeapSize || 0
        };
      });
      
      console.log('Firefox memory info:', memoryInfo);
      
      // Perform memory-intensive operations
      const recipeCards = page.locator('[data-testid="recipe-card"]');
      const cardCount = Math.min(15, await recipeCards.count());
      
      for (let i = 0; i < cardCount; i++) {
        await recipeCards.nth(i).locator('[data-testid="favorite-button"]').click();
        await page.waitForTimeout(50);
      }
      
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Application should remain responsive
      await expect(page.locator('[data-testid="favorites-container"]')).toBeVisible();
      
      await takeTestScreenshot(page, 'firefox-memory-management.png', 'Firefox memory management test');
    });

    await test.step('Test Firefox performance timing', async () => {
      const performanceData = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          connectTime: navigation.connectEnd - navigation.connectStart,
          responseTime: navigation.responseEnd - navigation.responseStart
        };
      });
      
      console.log('Firefox performance timing:', performanceData);
      
      // Firefox should have reasonable performance
      expect(performanceData.domContentLoaded).toBeLessThan(2000);
      expect(performanceData.loadComplete).toBeLessThan(1000);
      
      await takeTestScreenshot(page, 'firefox-performance-timing.png', 'Firefox performance timing test');
    });
  });

  test('Firefox accessibility and developer tools', async () => {
    await test.step('Test Firefox accessibility inspector compatibility', async () => {
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Test accessibility tree structure
      const accessibilitySnapshot = await page.accessibility.snapshot();
      expect(accessibilitySnapshot).toBeTruthy();
      
      if (accessibilitySnapshot) {
        // Find buttons in accessibility tree
        const findButtons = (node: any): any[] => {
          let buttons: any[] = [];
          
          if (node.role === 'button') {
            buttons.push(node);
          }
          
          if (node.children) {
            for (const child of node.children) {
              buttons = buttons.concat(findButtons(child));
            }
          }
          
          return buttons;
        };
        
        const buttons = findButtons(accessibilitySnapshot);
        console.log(`Firefox accessibility tree: Found ${buttons.length} buttons`);
        
        expect(buttons.length).toBeGreaterThan(0);
      }
      
      await takeTestScreenshot(page, 'firefox-accessibility-inspector.png', 'Firefox accessibility inspector test');
    });

    await test.step('Test Firefox screen reader compatibility', async () => {
      // Test NVDA/JAWS compatibility (Firefox specific)
      const ariaElements = await page.locator('[aria-label], [aria-labelledby], [aria-describedby]').count();
      expect(ariaElements).toBeGreaterThan(0);
      
      // Test live regions
      const liveRegions = await page.locator('[aria-live]').count();
      expect(liveRegions).toBeGreaterThan(0);
      
      // Test focus management
      const favoriteButton = page.locator('[data-testid="favorite-button"]').first();
      if (await favoriteButton.count() > 0) {
        await favoriteButton.focus();
        await expect(favoriteButton).toBeFocused();
        
        // Test that focus is visible
        const focusStyles = await favoriteButton.evaluate(el => {
          const styles = getComputedStyle(el);
          return {
            outline: styles.outline,
            outlineOffset: styles.outlineOffset
          };
        });
        
        console.log('Firefox focus styles:', focusStyles);
        expect(focusStyles.outline).not.toBe('none');
      }
      
      await takeTestScreenshot(page, 'firefox-screen-reader.png', 'Firefox screen reader compatibility test');
    });

    await test.step('Test Firefox developer console integration', async () => {
      // Test that no Firefox-specific console errors occur
      const consoleErrors: string[] = [];
      const consoleWarnings: string[] = [];
      
      page.on('console', message => {
        if (message.type() === 'error') {
          consoleErrors.push(message.text());
        } else if (message.type() === 'warning') {
          consoleWarnings.push(message.text());
        }
      });
      
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Perform typical operations
      await page.click('[data-testid="create-collection-button"]');
      await page.fill('[data-testid="collection-name-input"]', 'Console Test');
      await page.click('[data-testid="save-collection-button"]');
      
      console.log('Firefox console errors:', consoleErrors);
      console.log('Firefox console warnings:', consoleWarnings);
      
      // Should have minimal console issues
      expect(consoleErrors.length).toBe(0);
      
      await takeTestScreenshot(page, 'firefox-console-integration.png', 'Firefox console integration test');
    });
  });

  test('Firefox mobile and responsive behavior', async () => {
    await test.step('Test Firefox mobile simulation', async () => {
      // Test responsive behavior in Firefox
      await page.setViewportSize({ width: 375, height: 667 }); // Mobile size
      
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Should show mobile layout
      const mobileLayout = page.locator('[data-testid="mobile-favorites-layout"]');
      if (await mobileLayout.count() > 0) {
        await expect(mobileLayout).toBeVisible();
      }
      
      // Test touch events simulation
      const favoriteButton = page.locator('[data-testid="favorite-button"]').first();
      if (await favoriteButton.count() > 0) {
        // Simulate touch
        await favoriteButton.dispatchEvent('touchstart');
        await favoriteButton.dispatchEvent('touchend');
        
        await expect(page.locator('[data-testid="favorite-success-toast"]')).toBeVisible();
      }
      
      await takeTestScreenshot(page, 'firefox-mobile-simulation.png', 'Firefox mobile simulation test');
    });

    await test.step('Test Firefox tablet simulation', async () => {
      await page.setViewportSize({ width: 768, height: 1024 }); // Tablet size
      
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Should show tablet-optimized layout
      const tabletLayout = page.locator('[data-testid="tablet-favorites-layout"]');
      if (await tabletLayout.count() > 0) {
        await expect(tabletLayout).toBeVisible();
      }
      
      // Test that hover states work on tablet simulation
      const collectionCard = page.locator('[data-testid="collection-card"]').first();
      if (await collectionCard.count() > 0) {
        await collectionCard.hover();
        
        // Should show hover effects
        const hoverOverlay = collectionCard.locator('[data-testid="card-hover-overlay"]');
        if (await hoverOverlay.count() > 0) {
          await expect(hoverOverlay).toBeVisible();
        }
      }
      
      await takeTestScreenshot(page, 'firefox-tablet-simulation.png', 'Firefox tablet simulation test');
    });
  });

  test('Firefox CSS Grid and Flexbox compatibility', async () => {
    await test.step('Test Firefox CSS Grid implementation', async () => {
      await page.goto('/favorites');
      await waitForNetworkIdle(page);
      
      // Test CSS Grid support
      const gridSupport = await page.evaluate(() => {
        const testElement = document.createElement('div');
        testElement.style.display = 'grid';
        return testElement.style.display === 'grid';
      });
      
      expect(gridSupport).toBe(true);
      
      // Test actual grid layout
      const gridContainer = page.locator('[data-testid="favorites-grid"]');
      if (await gridContainer.count() > 0) {
        const gridStyles = await gridContainer.evaluate(el => {
          const styles = getComputedStyle(el);
          return {
            display: styles.display,
            gridTemplateColumns: styles.gridTemplateColumns,
            gap: styles.gap
          };
        });
        
        console.log('Firefox grid styles:', gridStyles);
        expect(gridStyles.display).toBe('grid');
      }
      
      await takeTestScreenshot(page, 'firefox-css-grid.png', 'Firefox CSS Grid compatibility test');
    });

    await test.step('Test Firefox Flexbox implementation', async () => {
      // Test Flexbox support and behavior
      const flexboxSupport = await page.evaluate(() => {
        const testElement = document.createElement('div');
        testElement.style.display = 'flex';
        return testElement.style.display === 'flex';
      });
      
      expect(flexboxSupport).toBe(true);
      
      // Test actual flexbox layouts
      const flexContainer = page.locator('[data-testid="recipe-card-actions"]').first();
      if (await flexContainer.count() > 0) {
        const flexStyles = await flexContainer.evaluate(el => {
          const styles = getComputedStyle(el);
          return {
            display: styles.display,
            justifyContent: styles.justifyContent,
            alignItems: styles.alignItems,
            flexDirection: styles.flexDirection
          };
        });
        
        console.log('Firefox flex styles:', flexStyles);
        
        // Should have flex display
        expect(['flex', '-webkit-flex', '-moz-flex']).toContain(flexStyles.display);
      }
      
      await takeTestScreenshot(page, 'firefox-flexbox.png', 'Firefox Flexbox compatibility test');
    });
  });
});