import { test, expect, Page } from '@playwright/test';
import { loginAsTrainer } from './helpers/auth';

test.describe('UX Validation & Design Consistency Edge Cases', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await loginAsTrainer(page);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Visual Design Consistency', () => {
    test('Tab layout remains consistent after Health Protocol removal', async () => {
      console.log('Starting tab layout consistency validation...');
      
      // Get tab layout metrics
      const tabMetrics = await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
        return tabs.map(tab => {
          const rect = tab.getBoundingClientRect();
          const styles = window.getComputedStyle(tab);
          return {
            width: rect.width,
            height: rect.height,
            padding: styles.padding,
            margin: styles.margin,
            fontSize: styles.fontSize,
            fontFamily: styles.fontFamily,
            backgroundColor: styles.backgroundColor,
            borderRadius: styles.borderRadius,
            textAlign: styles.textAlign,
            display: styles.display,
            flexGrow: styles.flexGrow,
            flexBasis: styles.flexBasis,
            text: tab.textContent?.trim()
          };
        });
      });
      
      console.log('Tab metrics:', tabMetrics);
      
      // Validate tab count
      expect(tabMetrics.length).toBe(4);
      
      // Validate consistent styling across all tabs
      const firstTab = tabMetrics[0];
      tabMetrics.forEach((tab, index) => {
        expect(tab.height).toBe(firstTab.height);
        expect(tab.padding).toBe(firstTab.padding);
        expect(tab.fontSize).toBe(firstTab.fontSize);
        expect(tab.fontFamily).toBe(firstTab.fontFamily);
        expect(tab.borderRadius).toBe(firstTab.borderRadius);
        
        console.log(`✓ Tab ${index + 1} (${tab.text}) styling consistent`);
      });
      
      // Validate proper tab spacing
      const tabContainer = await page.locator('[role="tablist"]').boundingBox();
      expect(tabContainer).not.toBeNull();
      
      if (tabContainer) {
        const expectedTabWidth = tabContainer.width / 4; // 4 tabs should fill container
        tabMetrics.forEach((tab, index) => {
          expect(tab.width).toBeGreaterThan(expectedTabWidth * 0.8); // Allow some variance
          expect(tab.width).toBeLessThan(expectedTabWidth * 1.2);
        });
      }
      
      // Verify no health protocol references in tab text
      tabMetrics.forEach(tab => {
        expect(tab.text).not.toContain('Health');
        expect(tab.text).not.toContain('Protocol');
      });
      
      console.log('Tab layout consistency validation completed');
    });

    test('Color scheme consistency across all viewport sizes', async () => {
      console.log('Starting color scheme consistency testing...');
      
      const viewports = [
        { width: 320, height: 568, name: 'mobile' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 1024, height: 768, name: 'desktop-small' },
        { width: 1920, height: 1080, name: 'desktop-large' },
      ];

      let colorSchemes: any[] = [];
      
      for (const viewport of viewports) {
        console.log(`Testing color scheme at ${viewport.name}`);
        
        await page.setViewportSize(viewport);
        await page.waitForTimeout(500);
        
        const colors = await page.evaluate(() => {
          const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
          const tabsContainer = document.querySelector('[role="tablist"]');
          
          return {
            tabsBackground: window.getComputedStyle(tabsContainer!).backgroundColor,
            tabsBorder: window.getComputedStyle(tabsContainer!).borderColor,
            activeTabBackground: window.getComputedStyle(tabs.find(tab => 
              tab.getAttribute('data-state') === 'active') || tabs[0]).backgroundColor,
            activeTabColor: window.getComputedStyle(tabs.find(tab => 
              tab.getAttribute('data-state') === 'active') || tabs[0]).color,
            inactiveTabBackground: window.getComputedStyle(tabs.find(tab => 
              tab.getAttribute('data-state') !== 'active') || tabs[1]).backgroundColor,
            inactiveTabColor: window.getComputedStyle(tabs.find(tab => 
              tab.getAttribute('data-state') !== 'active') || tabs[1]).color,
          };
        });
        
        colorSchemes.push({ ...colors, viewport: viewport.name });
      }
      
      // Validate consistent color scheme across viewports
      const baseScheme = colorSchemes[0];
      colorSchemes.forEach((scheme, index) => {
        if (index > 0) {
          expect(scheme.tabsBackground).toBe(baseScheme.tabsBackground);
          expect(scheme.activeTabBackground).toBe(baseScheme.activeTabBackground);
          expect(scheme.activeTabColor).toBe(baseScheme.activeTabColor);
          expect(scheme.inactiveTabBackground).toBe(baseScheme.inactiveTabBackground);
          expect(scheme.inactiveTabColor).toBe(baseScheme.inactiveTabColor);
          
          console.log(`✓ Color scheme consistent for ${scheme.viewport}`);
        }
      });
      
      console.log('Color scheme consistency testing completed');
    });

    test('Typography consistency after Health Protocol removal', async () => {
      console.log('Starting typography consistency validation...');
      
      const typographyElements = [
        { selector: '[role="tab"]', name: 'tab text' },
        { selector: 'h1', name: 'main heading' },
        { selector: 'p', name: 'paragraph text' },
        { selector: 'button', name: 'button text' },
      ];
      
      for (const element of typographyElements) {
        const typography = await page.evaluate((sel) => {
          const elements = Array.from(document.querySelectorAll(sel));
          return elements.map(el => {
            const styles = window.getComputedStyle(el);
            return {
              fontFamily: styles.fontFamily,
              fontSize: styles.fontSize,
              fontWeight: styles.fontWeight,
              lineHeight: styles.lineHeight,
              letterSpacing: styles.letterSpacing,
              textAlign: styles.textAlign,
              text: el.textContent?.trim()
            };
          }).filter(t => t.text && t.text.length > 0);
        }, element.selector);
        
        if (typography.length > 0) {
          console.log(`Validating ${element.name} typography:`, typography.length, 'elements');
          
          // Check for consistent font families within element type
          const uniqueFonts = [...new Set(typography.map(t => t.fontFamily))];
          expect(uniqueFonts.length).toBeLessThanOrEqual(2); // Allow max 2 font families per element type
          
          // Verify no health protocol text in any typography
          typography.forEach(t => {
            expect(t.text).not.toContain('Health Protocol');
            expect(t.text).not.toMatch(/health.*protocol/i);
          });
          
          console.log(`✓ ${element.name} typography consistent`);
        }
      }
      
      console.log('Typography consistency validation completed');
    });

    test('Icon and button styling consistency', async () => {
      console.log('Starting icon and button styling validation...');
      
      const iconElements = await page.evaluate(() => {
        const icons = Array.from(document.querySelectorAll('i, svg, [class*="icon"]'));
        return icons.map(icon => {
          const rect = icon.getBoundingClientRect();
          const styles = window.getComputedStyle(icon);
          return {
            width: rect.width,
            height: rect.height,
            fontSize: styles.fontSize,
            color: styles.color,
            className: icon.className,
            tagName: icon.tagName
          };
        });
      });
      
      console.log('Found icons:', iconElements.length);
      
      // Validate icon consistency
      if (iconElements.length > 0) {
        const tabIcons = iconElements.filter(icon => 
          icon.className.includes('fa-') || icon.className.includes('icon')
        );
        
        tabIcons.forEach((icon, index) => {
          expect(icon.fontSize).not.toBe('0px'); // Icons should be visible
          expect(icon.color).not.toBe('rgba(0, 0, 0, 0)'); // Icons should have color
          
          console.log(`✓ Icon ${index + 1} properly styled`);
        });
      }
      
      // Validate button consistency
      const buttonStyles = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.map(button => {
          const styles = window.getComputedStyle(button);
          const rect = button.getBoundingClientRect();
          return {
            borderRadius: styles.borderRadius,
            padding: styles.padding,
            fontSize: styles.fontSize,
            minHeight: rect.height,
            backgroundColor: styles.backgroundColor,
            color: styles.color,
            text: button.textContent?.trim(),
            disabled: button.disabled
          };
        }).filter(b => b.text && b.text.length > 0);
      });
      
      console.log('Found buttons:', buttonStyles.length);
      
      // Validate button consistency
      buttonStyles.forEach((button, index) => {
        expect(button.minHeight).toBeGreaterThan(30); // Buttons should be minimum height
        expect(button.text).not.toContain('Health Protocol');
        
        console.log(`✓ Button ${index + 1} (${button.text}) properly styled`);
      });
      
      console.log('Icon and button styling validation completed');
    });
  });

  test.describe('Interaction Design', () => {
    test('Tab click responsiveness without Health Protocol', async () => {
      console.log('Starting tab click responsiveness testing...');
      
      const tabs = ['Browse Recipes', 'Generate Plans', 'Saved Plans', 'Customers'];
      
      for (const tabText of tabs) {
        console.log(`Testing click responsiveness for: ${tabText}`);
        
        const startTime = Date.now();
        
        // Click tab
        await page.click(`text=${tabText}`);
        
        // Wait for tab to become active
        await expect(page.locator('[data-state="active"]')).toContainText(tabText);
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        // Verify quick response time (under 500ms)
        expect(responseTime).toBeLessThan(500);
        
        // Verify visual feedback
        const activeTab = page.locator(`text=${tabText}`);
        await expect(activeTab).toHaveAttribute('data-state', 'active');
        
        console.log(`✓ ${tabText} click response time: ${responseTime}ms`);
      }
      
      console.log('Tab click responsiveness testing completed');
    });

    test('Hover states and visual feedback', async () => {
      console.log('Starting hover states validation...');
      
      const interactiveElements = [
        { selector: '[role="tab"]', name: 'tabs' },
        { selector: 'button:not([disabled])', name: 'buttons' },
        { selector: '[data-testid="recipe-card"]', name: 'recipe cards' }
      ];
      
      for (const element of interactiveElements) {
        console.log(`Testing hover states for: ${element.name}`);
        
        const elements = await page.locator(element.selector).all();
        
        for (let i = 0; i < Math.min(elements.length, 3); i++) {
          const el = elements[i];
          
          // Get initial styles
          const initialStyles = await el.evaluate(node => {
            const styles = window.getComputedStyle(node);
            return {
              backgroundColor: styles.backgroundColor,
              color: styles.color,
              transform: styles.transform,
              opacity: styles.opacity,
              cursor: styles.cursor
            };
          });
          
          // Hover over element
          await el.hover();
          await page.waitForTimeout(200);
          
          // Get hover styles
          const hoverStyles = await el.evaluate(node => {
            const styles = window.getComputedStyle(node);
            return {
              backgroundColor: styles.backgroundColor,
              color: styles.color,
              transform: styles.transform,
              opacity: styles.opacity,
              cursor: styles.cursor
            };
          });
          
          // Verify cursor indicates interactivity
          expect(hoverStyles.cursor).toBe('pointer');
          
          console.log(`✓ ${element.name} ${i + 1} hover state validated`);
        }
      }
      
      console.log('Hover states validation completed');
    });

    test('Focus management for accessibility', async () => {
      console.log('Starting focus management validation...');
      
      // Test tab navigation through trainer interface
      await page.keyboard.press('Tab');
      
      let focusedElement = await page.locator(':focus');
      let focusedText = await focusedElement.textContent();
      
      console.log('Initial focus:', focusedText);
      
      let focusedElements = [];
      
      // Navigate through all focusable elements
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Tab');
        
        focusedElement = await page.locator(':focus');
        focusedText = await focusedElement.textContent();
        
        if (focusedText) {
          focusedElements.push(focusedText.trim());
          
          // Verify no health protocol in focus chain
          expect(focusedText).not.toContain('Health Protocol');
          expect(focusedText).not.toMatch(/health.*protocol/i);
        }
        
        // Check if focus is visible
        const focusedBox = await focusedElement.boundingBox();
        if (focusedBox) {
          expect(focusedBox.width).toBeGreaterThan(0);
          expect(focusedBox.height).toBeGreaterThan(0);
        }
      }
      
      console.log('Focus chain elements:', focusedElements);
      
      // Verify focus returns to beginning of cycle
      await page.keyboard.press('Tab');
      const finalFocusedElement = await page.locator(':focus');
      const finalFocusedText = await finalFocusedElement.textContent();
      
      expect(focusedElements).toContain(finalFocusedText?.trim());
      
      console.log('Focus management validation completed');
    });

    test('Keyboard navigation support', async () => {
      console.log('Starting keyboard navigation validation...');
      
      // Test arrow key navigation on tabs
      await page.click('text=Browse Recipes');
      await page.keyboard.press('Tab'); // Focus on first tab
      
      // Use arrow keys to navigate tabs
      const tabNavigationSequence = [
        { key: 'ArrowRight', expectedActive: 'Generate Plans' },
        { key: 'ArrowRight', expectedActive: 'Saved Plans' },
        { key: 'ArrowRight', expectedActive: 'Customers' },
        { key: 'ArrowRight', expectedActive: 'Browse Recipes' }, // Should wrap around
        { key: 'ArrowLeft', expectedActive: 'Customers' },
        { key: 'ArrowLeft', expectedActive: 'Saved Plans' },
      ];
      
      for (const nav of tabNavigationSequence) {
        console.log(`Testing ${nav.key} -> ${nav.expectedActive}`);
        
        await page.keyboard.press(nav.key);
        await page.waitForTimeout(200);
        
        const activeTab = await page.locator('[data-state="active"]').textContent();
        expect(activeTab).toContain(nav.expectedActive);
        
        console.log(`✓ Arrow navigation to ${nav.expectedActive} successful`);
      }
      
      // Test Enter key activation
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);
      
      // Verify tab content changes
      const activeContent = await page.locator('[role="tabpanel"]');
      await expect(activeContent).toBeVisible();
      
      console.log('Keyboard navigation validation completed');
    });
  });

  test.describe('Content Organization', () => {
    test('Logical tab ordering after Health Protocol removal', async () => {
      console.log('Starting tab ordering validation...');
      
      const tabOrder = await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
        return tabs.map(tab => ({
          text: tab.textContent?.trim(),
          order: tabs.indexOf(tab),
          tabIndex: tab.getAttribute('tabindex'),
          dataValue: tab.getAttribute('data-value') || tab.getAttribute('value')
        }));
      });
      
      console.log('Tab order:', tabOrder);
      
      // Verify expected tab sequence
      const expectedOrder = ['Browse Recipes', 'Generate Plans', 'Saved Plans', 'Customers'];
      
      tabOrder.forEach((tab, index) => {
        expect(tab.text).toContain(expectedOrder[index].split(' ')[0]); // Match first word
        expect(tab.order).toBe(index);
        
        console.log(`✓ Tab ${index + 1}: ${tab.text} in correct position`);
      });
      
      // Verify no health protocol in tab sequence
      tabOrder.forEach(tab => {
        expect(tab.text).not.toContain('Health');
        expect(tab.text).not.toContain('Protocol');
        expect(tab.dataValue).not.toContain('health');
      });
      
      console.log('Tab ordering validation completed');
    });

    test('Clear content labeling without Health Protocol references', async () => {
      console.log('Starting content labeling validation...');
      
      // Check all text content for health protocol references
      const allTextContent = await page.evaluate(() => {
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );
        
        const textNodes = [];
        let node;
        
        while (node = walker.nextNode()) {
          const text = node.textContent?.trim();
          if (text && text.length > 2) {
            textNodes.push(text);
          }
        }
        
        return textNodes;
      });
      
      console.log('Found text content pieces:', allTextContent.length);
      
      // Verify no health protocol references
      const healthReferences = allTextContent.filter(text =>
        text.toLowerCase().includes('health') || text.toLowerCase().includes('protocol')
      );
      
      expect(healthReferences.length).toBe(0);
      
      if (healthReferences.length > 0) {
        console.log('Found health protocol references:', healthReferences);
      }
      
      // Check specific labeling elements
      const labelElements = await page.evaluate(() => {
        const labels = Array.from(document.querySelectorAll('label, [aria-label], [title]'));
        return labels.map(el => ({
          tagName: el.tagName,
          text: el.textContent?.trim(),
          ariaLabel: el.getAttribute('aria-label'),
          title: el.getAttribute('title')
        }));
      });
      
      labelElements.forEach((label, index) => {
        if (label.text) expect(label.text).not.toMatch(/health.*protocol/i);
        if (label.ariaLabel) expect(label.ariaLabel).not.toMatch(/health.*protocol/i);
        if (label.title) expect(label.title).not.toMatch(/health.*protocol/i);
        
        console.log(`✓ Label ${index + 1} clean`);
      });
      
      console.log('Content labeling validation completed');
    });

    test('Appropriate content grouping', async () => {
      console.log('Starting content grouping validation...');
      
      // Validate semantic HTML structure
      const semanticStructure = await page.evaluate(() => {
        return {
          sections: document.querySelectorAll('section').length,
          articles: document.querySelectorAll('article').length,
          headers: document.querySelectorAll('header').length,
          navs: document.querySelectorAll('nav').length,
          mains: document.querySelectorAll('main').length,
          asides: document.querySelectorAll('aside').length,
          footers: document.querySelectorAll('footer').length
        };
      });
      
      console.log('Semantic structure:', semanticStructure);
      
      // Validate ARIA structure
      const ariaStructure = await page.evaluate(() => {
        return {
          tabs: document.querySelectorAll('[role="tab"]').length,
          tabpanels: document.querySelectorAll('[role="tabpanel"]').length,
          tablists: document.querySelectorAll('[role="tablist"]').length,
          buttons: document.querySelectorAll('[role="button"]').length,
          navigation: document.querySelectorAll('[role="navigation"]').length
        };
      });
      
      console.log('ARIA structure:', ariaStructure);
      
      // Validate tab structure
      expect(ariaStructure.tabs).toBe(4);
      expect(ariaStructure.tablists).toBeGreaterThanOrEqual(1);
      expect(ariaStructure.tabpanels).toBeGreaterThanOrEqual(1);
      
      // Validate content hierarchy
      const headingStructure = await page.evaluate(() => {
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        return headings.map(h => ({
          level: parseInt(h.tagName.charAt(1)),
          text: h.textContent?.trim()
        }));
      });
      
      headingStructure.forEach((heading, index) => {
        expect(heading.text).not.toMatch(/health.*protocol/i);
        console.log(`✓ Heading ${index + 1} (h${heading.level}) clean`);
      });
      
      console.log('Content grouping validation completed');
    });
  });

  test.describe('Performance Experience', () => {
    test('Fast initial load times', async () => {
      console.log('Starting load time validation...');
      
      const startTime = Date.now();
      
      await page.goto('/trainer', { waitUntil: 'networkidle' });
      
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      
      console.log(`Initial load time: ${loadTime}ms`);
      
      // Verify fast load time (under 3 seconds)
      expect(loadTime).toBeLessThan(3000);
      
      // Verify all critical elements loaded
      await expect(page.locator('[role="tablist"]')).toBeVisible();
      await expect(page.locator('[role="tab"]')).toHaveCount(4);
      await expect(page.locator('text=Browse Recipes')).toBeVisible();
      
      // Verify no health protocol elements loaded
      await expect(page.locator('text=Health Protocol')).not.toBeVisible();
      
      console.log('Load time validation completed');
    });

    test('Smooth tab transitions', async () => {
      console.log('Starting tab transition performance validation...');
      
      const tabs = ['Browse Recipes', 'Generate Plans', 'Saved Plans', 'Customers'];
      const transitionTimes: number[] = [];
      
      for (const tabText of tabs) {
        console.log(`Testing transition to: ${tabText}`);
        
        const startTime = performance.now();
        
        await page.click(`text=${tabText}`);
        
        // Wait for transition to complete
        await expect(page.locator('[data-state="active"]')).toContainText(tabText);
        await page.waitForTimeout(100); // Allow for animations
        
        const endTime = performance.now();
        const transitionTime = endTime - startTime;
        
        transitionTimes.push(transitionTime);
        
        // Verify smooth transition (under 300ms)
        expect(transitionTime).toBeLessThan(300);
        
        console.log(`✓ ${tabText} transition: ${transitionTime.toFixed(2)}ms`);
      }
      
      const avgTransitionTime = transitionTimes.reduce((a, b) => a + b) / transitionTimes.length;
      console.log(`Average transition time: ${avgTransitionTime.toFixed(2)}ms`);
      
      // Verify consistent performance
      expect(avgTransitionTime).toBeLessThan(200);
      
      console.log('Tab transition performance validation completed');
    });

    test('No memory leaks during extended usage', async () => {
      console.log('Starting memory leak validation...');
      
      const initialMemory = await page.evaluate(() => {
        return {
          elements: document.querySelectorAll('*').length,
          jsHeapSizeUsed: (performance as any).memory?.usedJSHeapSize || 0,
          jsHeapSizeTotal: (performance as any).memory?.totalJSHeapSize || 0
        };
      });
      
      console.log('Initial memory:', initialMemory);
      
      // Extended usage simulation
      for (let i = 0; i < 50; i++) {
        await page.click('text=Browse Recipes');
        await page.waitForTimeout(50);
        await page.click('text=Generate Plans');
        await page.waitForTimeout(50);
        await page.click('text=Customers');
        await page.waitForTimeout(50);
        await page.click('text=Saved Plans');
        await page.waitForTimeout(50);
      }
      
      // Force garbage collection if possible
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });
      
      const finalMemory = await page.evaluate(() => {
        return {
          elements: document.querySelectorAll('*').length,
          jsHeapSizeUsed: (performance as any).memory?.usedJSHeapSize || 0,
          jsHeapSizeTotal: (performance as any).memory?.totalJSHeapSize || 0
        };
      });
      
      console.log('Final memory:', finalMemory);
      
      // Validate no significant memory growth
      const elementGrowth = finalMemory.elements - initialMemory.elements;
      expect(elementGrowth).toBeLessThan(100); // Allow some growth but not excessive
      
      if (initialMemory.jsHeapSizeUsed > 0 && finalMemory.jsHeapSizeUsed > 0) {
        const memoryGrowthPercent = 
          ((finalMemory.jsHeapSizeUsed - initialMemory.jsHeapSizeUsed) / initialMemory.jsHeapSizeUsed) * 100;
        expect(memoryGrowthPercent).toBeLessThan(50); // Less than 50% memory growth
        
        console.log(`Memory growth: ${memoryGrowthPercent.toFixed(2)}%`);
      }
      
      console.log('Memory leak validation completed');
    });

    test('Responsive performance across device sizes', async () => {
      console.log('Starting responsive performance validation...');
      
      const devices = [
        { width: 320, height: 568, name: 'iPhone SE' },
        { width: 375, height: 667, name: 'iPhone 8' },
        { width: 768, height: 1024, name: 'iPad' },
        { width: 1024, height: 768, name: 'iPad Landscape' },
        { width: 1920, height: 1080, name: 'Desktop' }
      ];
      
      for (const device of devices) {
        console.log(`Testing performance on ${device.name}`);
        
        await page.setViewportSize(device);
        
        const startTime = performance.now();
        
        // Reload to test initial render performance
        await page.reload({ waitUntil: 'networkidle' });
        
        const loadTime = performance.now() - startTime;
        
        // Test tab switching performance
        const tabStartTime = performance.now();
        await page.click('text=Generate Plans');
        await expect(page.locator('[data-state="active"]')).toContainText('Generate');
        const tabTime = performance.now() - tabStartTime;
        
        console.log(`${device.name} - Load: ${loadTime.toFixed(2)}ms, Tab: ${tabTime.toFixed(2)}ms`);
        
        // Verify good performance on all devices
        expect(loadTime).toBeLessThan(5000);
        expect(tabTime).toBeLessThan(500);
        
        // Verify no health protocol at any size
        await expect(page.locator('text=Health Protocol')).not.toBeVisible();
      }
      
      console.log('Responsive performance validation completed');
    });
  });
});