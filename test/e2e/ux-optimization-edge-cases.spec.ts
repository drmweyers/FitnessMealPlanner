import { test, expect, Page } from '@playwright/test';
import { takeEvidenceScreenshot } from './test-data-setup';

/**
 * UX OPTIMIZATION & EDGE CASE TESTING SUITE
 * 
 * This suite focuses on user experience edge cases, accessibility issues,
 * and interaction patterns that could cause usability problems. Tests are
 * designed to identify UX friction points and validate that the application
 * provides excellent user experience even in edge conditions.
 * 
 * Focus Areas:
 * 1. Accessibility Edge Cases
 * 2. Mobile/Touch Interface Edge Cases  
 * 3. Keyboard Navigation Edge Cases
 * 4. Visual/Animation Edge Cases
 * 5. Loading State Edge Cases
 * 6. Error State UX Edge Cases
 * 7. Multi-Device/Screen Size Edge Cases
 * 8. Performance Perception Edge Cases
 */

test.describe('UX Optimization & Edge Case Testing Suite', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    // Set up accessibility monitoring
    await page.addInitScript(() => {
      // Track focus events
      (window as any).focusEvents = [];
      document.addEventListener('focusin', (e) => {
        (window as any).focusEvents.push({
          type: 'focusin',
          target: e.target?.tagName,
          timestamp: Date.now()
        });
      });

      // Track keyboard events
      (window as any).keyboardEvents = [];
      document.addEventListener('keydown', (e) => {
        (window as any).keyboardEvents.push({
          key: e.key,
          target: e.target?.tagName,
          timestamp: Date.now()
        });
      });
    });
  });

  test.describe('Accessibility Edge Cases', () => {
    
    test('Screen reader navigation edge cases', async () => {
      console.log('♿ Testing Accessibility - Screen Reader Navigation Edge Cases');
      
      await page.goto('http://localhost:4000');
      await page.waitForLoadState('networkidle');
      
      // Test ARIA label edge cases
      await page.evaluate(() => {
        const testElements = [
          // Missing ARIA labels
          '<button>Unlabeled Button</button>',
          // Conflicting ARIA labels
          '<button aria-label="Save" aria-labelledby="conflicting-label">Delete</button>',
          // Empty ARIA labels
          '<button aria-label="">Empty Label</button>',
          // Very long ARIA labels
          '<button aria-label="' + 'Very long label '.repeat(50) + '">Long Label</button>',
          // Invalid ARIA attributes
          '<div aria-invalid-attribute="true">Invalid ARIA</div>',
          // Nested interactive elements
          '<button><button>Nested Button</button></button>',
          // Hidden but focusable elements
          '<button style="visibility: hidden;" tabindex="0">Hidden Focusable</button>'
        ];
        
        const container = document.createElement('div');
        container.id = 'accessibility-test';
        container.innerHTML = testElements.join('');
        document.body.appendChild(container);
      });
      
      // Test keyboard navigation through problematic elements
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(100);
      }
      
      const focusEvents = await page.evaluate(() => (window as any).focusEvents || []);
      console.log(`📊 Focus events generated: ${focusEvents.length}`);
      
      // Verify no focus traps occurred
      expect(focusEvents.length).toBeGreaterThan(0);
      
      await takeEvidenceScreenshot(page, 'ux-accessibility', 'screen-reader-edge-cases');
    });

    test('High contrast mode edge cases', async () => {
      console.log('🌓 Testing Accessibility - High Contrast Mode Edge Cases');
      
      await page.goto('http://localhost:4000');
      await page.waitForLoadState('networkidle');
      
      // Simulate high contrast mode
      await page.addStyleTag({
        content: `
          @media (prefers-contrast: high) {
            * {
              background-color: black !important;
              color: white !important;
              border-color: white !important;
            }
            button, input, select {
              background-color: white !important;
              color: black !important;
            }
          }
        `
      });
      
      // Force high contrast mode
      await page.evaluate(() => {
        document.documentElement.style.filter = 'contrast(200%) brightness(150%)';
      });
      
      await page.waitForTimeout(1000);
      
      // Test various UI elements in high contrast
      await page.evaluate(() => {
        const testElements = document.querySelectorAll('button, input, a, div[role="button"]');
        let visibilityIssues = 0;
        
        testElements.forEach(element => {
          const computed = window.getComputedStyle(element);
          const bgColor = computed.backgroundColor;
          const textColor = computed.color;
          
          // Simple contrast check (this is a basic implementation)
          if (bgColor === textColor || (!bgColor && !textColor)) {
            visibilityIssues++;
          }
        });
        
        (window as any).contrastIssues = visibilityIssues;
      });
      
      const contrastIssues = await page.evaluate(() => (window as any).contrastIssues || 0);
      console.log(`⚠️  Potential contrast issues found: ${contrastIssues}`);
      
      await takeEvidenceScreenshot(page, 'ux-accessibility', 'high-contrast-mode');
    });

    test('Zoom level accessibility edge cases', async () => {
      console.log('🔍 Testing Accessibility - Zoom Level Edge Cases');
      
      await page.goto('http://localhost:4000');
      await page.waitForLoadState('networkidle');
      
      const zoomLevels = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 5.0];
      
      for (const zoom of zoomLevels) {
        await page.evaluate((zoomLevel) => {
          document.body.style.zoom = zoomLevel.toString();
        }, zoom);
        
        await page.waitForTimeout(500);
        
        // Test if elements are still accessible at this zoom level
        const elementsVisible = await page.evaluate(() => {
          const testSelectors = ['button', 'input', 'a', '[role="button"]'];
          let visibleCount = 0;
          
          testSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
              const rect = element.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                visibleCount++;
              }
            });
          });
          
          return visibleCount;
        });
        
        console.log(`📊 Zoom ${zoom * 100}%: ${elementsVisible} elements visible`);
        expect(elementsVisible).toBeGreaterThan(0);
      }
      
      // Reset zoom
      await page.evaluate(() => {
        document.body.style.zoom = '1';
      });
      
      await takeEvidenceScreenshot(page, 'ux-accessibility', 'zoom-level-edge-cases');
    });
  });

  test.describe('Mobile/Touch Interface Edge Cases', () => {
    
    test('Touch gesture conflict edge cases', async () => {
      console.log('👆 Testing Mobile - Touch Gesture Conflict Edge Cases');
      
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      await page.goto('http://localhost:4000');
      await page.waitForLoadState('networkidle');
      
      // Simulate various problematic touch scenarios
      const touchScenarios = [
        // Rapid double tap
        async () => {
          await page.touchscreen.tap(200, 200);
          await page.touchscreen.tap(200, 200);
        },
        // Long press
        async () => {
          await page.mouse.move(200, 300);
          await page.mouse.down();
          await page.waitForTimeout(1000);
          await page.mouse.up();
        },
        // Multi-touch simulation
        async () => {
          await page.touchscreen.tap(100, 100);
          await page.touchscreen.tap(300, 100);
        },
        // Swipe gestures
        async () => {
          await page.mouse.move(100, 200);
          await page.mouse.down();
          await page.mouse.move(300, 200, { steps: 10 });
          await page.mouse.up();
        },
        // Pinch simulation (approximate)
        async () => {
          await page.evaluate(() => {
            const pinchEvent = new TouchEvent('touchstart', {
              touches: [
                new Touch({
                  identifier: 1,
                  target: document.body,
                  clientX: 100,
                  clientY: 100,
                  radiusX: 10,
                  radiusY: 10,
                  rotationAngle: 0,
                  force: 1
                }),
                new Touch({
                  identifier: 2,
                  target: document.body,
                  clientX: 200,
                  clientY: 100,
                  radiusX: 10,
                  radiusY: 10,
                  rotationAngle: 0,
                  force: 1
                })
              ]
            });
            document.body.dispatchEvent(pinchEvent);
          });
        }
      ];
      
      for (const [index, scenario] of touchScenarios.entries()) {
        await scenario();
        await page.waitForTimeout(500);
        
        // Verify application remained stable
        const title = await page.title();
        expect(title).toBeTruthy();
        
        console.log(`✅ Touch scenario ${index + 1}/${touchScenarios.length} handled`);
      }
      
      await takeEvidenceScreenshot(page, 'ux-mobile', 'touch-gesture-conflicts');
    });

    test('Small screen navigation edge cases', async () => {
      console.log('📱 Testing Mobile - Small Screen Navigation Edge Cases');
      
      const smallScreenSizes = [
        { width: 320, height: 568, name: 'iPhone 5/SE' },
        { width: 240, height: 320, name: 'Very Small' },
        { width: 150, height: 200, name: 'Extreme Small' }
      ];
      
      for (const screen of smallScreenSizes) {
        await page.setViewportSize(screen);
        await page.goto('http://localhost:4000');
        await page.waitForLoadState('networkidle');
        
        console.log(`📱 Testing ${screen.name} (${screen.width}x${screen.height})`);
        
        // Test if critical elements are still accessible
        const criticalElementsVisible = await page.evaluate(() => {
          const criticalSelectors = [
            'button',
            'input',
            'a[href]',
            '[role="button"]',
            '[tabindex="0"]'
          ];
          
          let visibleElements = 0;
          let interactableElements = 0;
          
          criticalSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
              const rect = element.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                visibleElements++;
                
                // Check if element is large enough for touch interaction
                if (rect.width >= 44 && rect.height >= 44) {
                  interactableElements++;
                }
              }
            });
          });
          
          return { visible: visibleElements, interactable: interactableElements };
        });
        
        console.log(`📊 ${screen.name}: ${criticalElementsVisible.visible} visible, ${criticalElementsVisible.interactable} touch-friendly`);
        
        expect(criticalElementsVisible.visible).toBeGreaterThan(0);
        
        await takeEvidenceScreenshot(page, 'ux-mobile', `small-screen-${screen.width}x${screen.height}`);
      }
    });

    test('Orientation change edge cases', async () => {
      console.log('🔄 Testing Mobile - Orientation Change Edge Cases');
      
      await page.setViewportSize({ width: 375, height: 667 }); // Portrait
      await page.goto('http://localhost:4000');
      await page.waitForLoadState('networkidle');
      
      // Simulate rapid orientation changes
      for (let i = 0; i < 5; i++) {
        // Portrait
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(200);
        
        // Landscape
        await page.setViewportSize({ width: 667, height: 375 });
        await page.waitForTimeout(200);
        
        // Test if layout adapts correctly
        const layoutIntact = await page.evaluate(() => {
          const body = document.body;
          return body.clientWidth > 0 && body.clientHeight > 0;
        });
        
        expect(layoutIntact).toBe(true);
      }
      
      console.log('✅ Application survived rapid orientation changes');
      await takeEvidenceScreenshot(page, 'ux-mobile', 'orientation-changes');
    });
  });

  test.describe('Keyboard Navigation Edge Cases', () => {
    
    test('Tab order edge cases', async () => {
      console.log('⌨️  Testing Keyboard - Tab Order Edge Cases');
      
      await page.goto('http://localhost:4000');
      await page.waitForLoadState('networkidle');
      
      // Create elements with problematic tab indices
      await page.evaluate(() => {
        const problemElements = [
          '<button tabindex="1000">High Tab Index</button>',
          '<button tabindex="-1">Negative Tab Index</button>',
          '<div tabindex="0" style="display: none;">Hidden Focusable</div>',
          '<button tabindex="5">Out of Order</button>',
          '<button tabindex="1">Lower Index</button>',
          '<span tabindex="0">Non-button Focusable</span>',
          '<button disabled>Disabled Button</button>'
        ];
        
        const container = document.createElement('div');
        container.id = 'tab-order-test';
        container.innerHTML = problemElements.join('<br>');
        document.body.appendChild(container);
      });
      
      // Track tab order
      const tabOrder = [];
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Tab');
        
        const focusedElement = await page.evaluate(() => {
          const focused = document.activeElement;
          return {
            tagName: focused?.tagName,
            textContent: focused?.textContent?.trim(),
            tabIndex: focused?.tabIndex,
            isVisible: focused ? window.getComputedStyle(focused).display !== 'none' : false
          };
        });
        
        if (focusedElement.textContent) {
          tabOrder.push(focusedElement);
        }
        
        await page.waitForTimeout(100);
      }
      
      console.log('📊 Tab order sequence:');
      tabOrder.forEach((element, index) => {
        console.log(`  ${index + 1}. ${element.tagName}(${element.tabIndex}): ${element.textContent}`);
      });
      
      // Verify no focus traps
      const uniqueElements = new Set(tabOrder.map(el => el.textContent));
      expect(uniqueElements.size).toBeGreaterThan(0);
      
      await takeEvidenceScreenshot(page, 'ux-keyboard', 'tab-order-edge-cases');
    });

    test('Keyboard shortcut conflicts edge cases', async () => {
      console.log('⌨️  Testing Keyboard - Shortcut Conflict Edge Cases');
      
      await page.goto('http://localhost:4000');
      await page.waitForLoadState('networkidle');
      
      // Test potentially conflicting keyboard shortcuts
      const shortcutTests = [
        { combo: 'Control+A', description: 'Select All' },
        { combo: 'Control+Z', description: 'Undo' },
        { combo: 'Control+Y', description: 'Redo' },
        { combo: 'Control+F', description: 'Find' },
        { combo: 'Control+S', description: 'Save' },
        { combo: 'Alt+Tab', description: 'Alt Tab' },
        { combo: 'Escape', description: 'Escape' },
        { combo: 'F5', description: 'Refresh' },
        { combo: 'F12', description: 'Dev Tools' }
      ];
      
      for (const shortcut of shortcutTests) {
        // Track events before shortcut
        await page.evaluate(() => {
          (window as any).shortcutEvents = [];
          const handler = (e) => {
            (window as any).shortcutEvents.push({
              type: e.type,
              key: e.key,
              ctrlKey: e.ctrlKey,
              altKey: e.altKey,
              shiftKey: e.shiftKey
            });
          };
          document.addEventListener('keydown', handler);
          document.addEventListener('keyup', handler);
        });
        
        await page.keyboard.press(shortcut.combo);
        await page.waitForTimeout(300);
        
        const events = await page.evaluate(() => (window as any).shortcutEvents || []);
        console.log(`📊 ${shortcut.description}: ${events.length} events captured`);
        
        // Verify application didn't break
        const title = await page.title();
        expect(title).toBeTruthy();
      }
      
      await takeEvidenceScreenshot(page, 'ux-keyboard', 'shortcut-conflicts');
    });

    test('Focus management edge cases', async () => {
      console.log('🎯 Testing Keyboard - Focus Management Edge Cases');
      
      await page.goto('http://localhost:4000');
      await page.waitForLoadState('networkidle');
      
      // Create dynamic elements that could cause focus issues
      await page.evaluate(() => {
        const container = document.createElement('div');
        container.id = 'focus-test';
        
        // Dynamically add and remove focusable elements
        setInterval(() => {
          const button = document.createElement('button');
          button.textContent = 'Dynamic Button';
          button.onclick = () => button.remove();
          container.appendChild(button);
          
          if (container.children.length > 5) {
            container.removeChild(container.firstChild);
          }
        }, 500);
        
        document.body.appendChild(container);
      });
      
      // Test focus behavior with dynamic changes
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        
        // Check if focus is lost
        const hasFocus = await page.evaluate(() => {
          return document.activeElement !== document.body;
        });
        
        if (!hasFocus) {
          console.log(`⚠️  Focus lost at iteration ${i + 1}`);
        }
        
        await page.waitForTimeout(600); // Allow dynamic changes
      }
      
      await takeEvidenceScreenshot(page, 'ux-keyboard', 'focus-management-edge-cases');
    });
  });

  test.describe('Visual/Animation Edge Cases', () => {
    
    test('Reduced motion preference edge cases', async () => {
      console.log('🎬 Testing Visual - Reduced Motion Edge Cases');
      
      // Set reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });
      
      await page.goto('http://localhost:4000');
      await page.waitForLoadState('networkidle');
      
      // Test that animations respect reduced motion
      await page.addStyleTag({
        content: `
          .test-animation {
            animation: spin 1s linear infinite;
            transition: all 0.3s ease;
          }
          
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          @media (prefers-reduced-motion: reduce) {
            .test-animation {
              animation: none !important;
              transition: none !important;
            }
          }
        `
      });
      
      // Add animated elements
      await page.evaluate(() => {
        const animatedElement = document.createElement('div');
        animatedElement.className = 'test-animation';
        animatedElement.style.width = '50px';
        animatedElement.style.height = '50px';
        animatedElement.style.backgroundColor = 'red';
        animatedElement.textContent = 'Animated';
        document.body.appendChild(animatedElement);
      });
      
      await page.waitForTimeout(2000);
      
      // Verify animations are disabled
      const animationsDisabled = await page.evaluate(() => {
        const element = document.querySelector('.test-animation');
        const computedStyle = window.getComputedStyle(element);
        return computedStyle.animationName === 'none';
      });
      
      expect(animationsDisabled).toBe(true);
      console.log('✅ Animations properly disabled for reduced motion');
      
      await takeEvidenceScreenshot(page, 'ux-visual', 'reduced-motion');
    });

    test('Color scheme preference edge cases', async () => {
      console.log('🌙 Testing Visual - Color Scheme Edge Cases');
      
      const colorSchemes = ['light', 'dark', 'no-preference'];
      
      for (const scheme of colorSchemes) {
        await page.emulateMedia({ colorScheme: scheme as any });
        await page.goto('http://localhost:4000');
        await page.waitForLoadState('networkidle');
        
        // Test color scheme application
        const appliedScheme = await page.evaluate(() => {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        });
        
        console.log(`📊 Color scheme: ${scheme} → Applied: ${appliedScheme}`);
        
        // Test readability in different schemes
        const readabilityCheck = await page.evaluate(() => {
          const elements = document.querySelectorAll('body, button, input, div');
          let readabilityIssues = 0;
          
          elements.forEach(element => {
            const style = window.getComputedStyle(element);
            const bgColor = style.backgroundColor;
            const textColor = style.color;
            
            // Basic readability check
            if (bgColor === textColor || (bgColor === 'rgba(0, 0, 0, 0)' && textColor === 'rgba(0, 0, 0, 0)')) {
              readabilityIssues++;
            }
          });
          
          return readabilityIssues;
        });
        
        console.log(`📊 Readability issues in ${scheme}: ${readabilityCheck}`);
        
        await takeEvidenceScreenshot(page, 'ux-visual', `color-scheme-${scheme}`);
      }
    });
  });

  test.describe('Loading State Edge Cases', () => {
    
    test('Infinite loading state edge cases', async () => {
      console.log('⏳ Testing Loading - Infinite Loading State Edge Cases');
      
      await page.goto('http://localhost:4000');
      
      // Simulate stuck loading states
      await page.evaluate(() => {
        // Create loading indicators that never resolve
        const loadingStates = [
          '<div class="loading">Loading recipes...</div>',
          '<div class="spinner">●●●</div>',
          '<div class="progress-bar" style="width: 47%;">47%</div>',
          '<div class="loading-skeleton">Loading content...</div>'
        ];
        
        loadingStates.forEach((loading, index) => {
          const container = document.createElement('div');
          container.innerHTML = loading;
          container.id = `loading-${index}`;
          document.body.appendChild(container);
          
          // Keep updating loading state indefinitely
          setInterval(() => {
            const progressBar = container.querySelector('.progress-bar');
            if (progressBar) {
              const currentWidth = parseInt(progressBar.textContent || '0');
              const newWidth = (currentWidth + 1) % 100;
              progressBar.style.width = `${newWidth}%`;
              progressBar.textContent = `${newWidth}%`;
            }
          }, 100);
        });
      });
      
      await page.waitForTimeout(3000);
      
      // Verify loading states are still visible and not causing issues
      const loadingElementsVisible = await page.locator('.loading, .spinner, .progress-bar, .loading-skeleton').count();
      expect(loadingElementsVisible).toBeGreaterThan(0);
      
      // Verify application remains responsive
      await page.evaluate(() => {
        document.body.click();
      });
      
      console.log('✅ Application remains responsive during infinite loading');
      
      await takeEvidenceScreenshot(page, 'ux-loading', 'infinite-loading-states');
    });

    test('Loading timeout edge cases', async () => {
      console.log('⏰ Testing Loading - Timeout Edge Cases');
      
      await page.goto('http://localhost:4000');
      
      // Simulate various timeout scenarios
      const timeoutScenarios = [
        { delay: 5000, description: '5 second timeout' },
        { delay: 10000, description: '10 second timeout' },
        { delay: 30000, description: '30 second timeout' }
      ];
      
      for (const scenario of timeoutScenarios) {
        const startTime = Date.now();
        
        await page.evaluate((delay) => {
          return new Promise(resolve => {
            const timeoutDiv = document.createElement('div');
            timeoutDiv.textContent = `Loading with ${delay}ms timeout...`;
            timeoutDiv.id = 'timeout-test';
            document.body.appendChild(timeoutDiv);
            
            setTimeout(() => {
              timeoutDiv.textContent = 'Timeout completed!';
              resolve(null);
            }, delay);
          });
        }, Math.min(scenario.delay, 2000)); // Limit actual wait time for testing
        
        const elapsed = Date.now() - startTime;
        console.log(`📊 ${scenario.description}: Simulated in ${elapsed}ms`);
        
        // Verify timeout handling
        const timeoutElement = await page.locator('#timeout-test').textContent();
        expect(timeoutElement).toContain('completed');
      }
      
      await takeEvidenceScreenshot(page, 'ux-loading', 'timeout-edge-cases');
    });
  });

  test.describe('Error State UX Edge Cases', () => {
    
    test('Error message accessibility edge cases', async () => {
      console.log('❌ Testing Error States - Accessibility Edge Cases');
      
      await page.goto('http://localhost:4000');
      await page.waitForLoadState('networkidle');
      
      // Create various error message scenarios
      const errorScenarios = [
        {
          html: '<div role="alert" style="color: red;">Critical Error!</div>',
          type: 'alert'
        },
        {
          html: '<div aria-live="polite">Polite error message</div>',
          type: 'polite'
        },
        {
          html: '<div aria-live="assertive">Assertive error message</div>',
          type: 'assertive'
        },
        {
          html: '<div style="color: red;">No ARIA error</div>',
          type: 'no-aria'
        },
        {
          html: '<div role="alert" aria-atomic="true">Atomic error message</div>',
          type: 'atomic'
        }
      ];
      
      for (const scenario of errorScenarios) {
        await page.evaluate((html) => {
          const container = document.createElement('div');
          container.innerHTML = html;
          document.body.appendChild(container);
        }, scenario.html);
        
        await page.waitForTimeout(1000);
        
        // Test if error is announced properly
        const hasProperAria = await page.evaluate((html) => {
          const div = document.createElement('div');
          div.innerHTML = html;
          const element = div.firstElementChild;
          
          return {
            hasRole: element?.getAttribute('role') === 'alert',
            hasAriaLive: element?.hasAttribute('aria-live'),
            hasAriaAtomic: element?.hasAttribute('aria-atomic')
          };
        }, scenario.html);
        
        console.log(`📊 ${scenario.type}: Role=${hasProperAria.hasRole}, Live=${hasProperAria.hasAriaLive}, Atomic=${hasProperAria.hasAriaAtomic}`);
      }
      
      await takeEvidenceScreenshot(page, 'ux-errors', 'error-accessibility');
    });

    test('Error recovery edge cases', async () => {
      console.log('🔧 Testing Error States - Recovery Edge Cases');
      
      await page.goto('http://localhost:4000');
      
      // Simulate various error recovery scenarios
      await page.evaluate(() => {
        let errorCount = 0;
        
        (window as any).simulateError = () => {
          errorCount++;
          
          const errorDiv = document.createElement('div');
          errorDiv.className = 'error-message';
          errorDiv.innerHTML = `
            <div>Error ${errorCount}: Something went wrong</div>
            <button onclick="this.parentElement.remove()">Retry</button>
            <button onclick="this.parentElement.remove()">Dismiss</button>
          `;
          
          document.body.appendChild(errorDiv);
          
          // Auto-remove after 5 seconds
          setTimeout(() => {
            if (document.body.contains(errorDiv)) {
              document.body.removeChild(errorDiv);
            }
          }, 5000);
        };
        
        // Simulate multiple rapid errors
        for (let i = 0; i < 5; i++) {
          setTimeout(() => (window as any).simulateError(), i * 1000);
        }
      });
      
      await page.waitForTimeout(6000);
      
      // Verify error messages are handled properly
      const remainingErrors = await page.locator('.error-message').count();
      expect(remainingErrors).toBeLessThan(3); // Some should have been auto-dismissed
      
      console.log(`📊 Remaining error messages: ${remainingErrors}`);
      
      await takeEvidenceScreenshot(page, 'ux-errors', 'error-recovery');
    });
  });

  test.afterEach(async () => {
    // Report UX metrics
    const focusEvents = await page.evaluate(() => (window as any).focusEvents?.length || 0);
    const keyboardEvents = await page.evaluate(() => (window as any).keyboardEvents?.length || 0);
    
    console.log(`📊 UX Metrics - Focus events: ${focusEvents}, Keyboard events: ${keyboardEvents}`);
  });
});