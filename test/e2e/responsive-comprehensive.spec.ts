import { test, expect, Page } from '@playwright/test';

/**
 * Comprehensive Responsive Design Tests
 * 
 * Tests responsive behavior across different viewports:
 * - Desktop (1280x720)
 * - Tablet (768x1024) 
 * - Mobile (375x667)
 * - Large Desktop (1920x1080)
 * - Small Mobile (320x568)
 */

const CREDENTIALS = {
  trainer: { email: 'trainer.test@evofitmeals.com', password: 'TestTrainer123!' }
};

const VIEWPORTS = [
  { name: 'Large Desktop', width: 1920, height: 1080, device: 'desktop' },
  { name: 'Desktop', width: 1280, height: 720, device: 'desktop' },
  { name: 'Tablet Portrait', width: 768, height: 1024, device: 'tablet' },
  { name: 'Tablet Landscape', width: 1024, height: 768, device: 'tablet' },
  { name: 'Mobile Portrait', width: 375, height: 667, device: 'mobile' },
  { name: 'Mobile Landscape', width: 667, height: 375, device: 'mobile' },
  { name: 'Small Mobile', width: 320, height: 568, device: 'mobile' }
];

async function loginAs(page: Page) {
  await page.goto('/login');
  await page.fill('#email', CREDENTIALS.trainer.email);
  await page.fill('#password', CREDENTIALS.trainer.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
}

// Helper to check if element is properly visible (not clipped)
async function isElementFullyVisible(page: Page, selector: string): Promise<boolean> {
  try {
    const element = page.locator(selector).first();
    if (!await element.isVisible({ timeout: 2000 })) return false;
    
    const boundingBox = await element.boundingBox();
    if (!boundingBox) return false;
    
    const viewport = page.viewportSize();
    if (!viewport) return false;
    
    // Check if element is within viewport bounds
    return boundingBox.x >= 0 && 
           boundingBox.y >= 0 && 
           boundingBox.x + boundingBox.width <= viewport.width &&
           boundingBox.y + boundingBox.height <= viewport.height;
  } catch (e) {
    return false;
  }
}

// Helper to check if text is readable (not too small)
async function isTextReadable(page: Page, selector: string): Promise<boolean> {
  try {
    const element = page.locator(selector).first();
    if (!await element.isVisible({ timeout: 2000 })) return false;
    
    const fontSize = await element.evaluate((el) => {
      return window.getComputedStyle(el).fontSize;
    });
    
    const fontSizeNum = parseFloat(fontSize);
    return fontSizeNum >= 12; // Minimum readable font size
  } catch (e) {
    return false;
  }
}

test.describe('Responsive Design Comprehensive Tests', () => {
  
  VIEWPORTS.forEach(viewport => {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
      });
      
      test('Layout responsiveness and navigation', async ({ page }) => {
        await loginAs(page);
        
        // Core layout elements that should be responsive
        const coreElements = [
          { selector: 'nav, .navigation, .navbar', name: 'Navigation' },
          { selector: 'main, .main-content, #main', name: 'Main Content' },
          { selector: '.sidebar, .side-nav', name: 'Sidebar', optional: true },
          { selector: 'header, .header', name: 'Header' },
          { selector: 'footer, .footer', name: 'Footer', optional: true }
        ];
        
        for (const element of coreElements) {
          try {
            const isVisible = await page.locator(element.selector).first().isVisible({ timeout: 2000 });
            const isFullyVisible = await isElementFullyVisible(page, element.selector);
            
            if (isVisible) {
              console.log(`${viewport.name}: ${element.name} is visible${isFullyVisible ? ' and fully contained' : ' but may be clipped'}`);
            } else if (!element.optional) {
              console.log(`${viewport.name}: WARNING - ${element.name} not visible`);
            }
          } catch (e) {
            if (!element.optional) {
              console.log(`${viewport.name}: ${element.name} not found`);
            }
          }
        }
        
        // Test mobile-specific navigation (hamburger menu)
        if (viewport.device === 'mobile') {
          const mobileNavSelectors = [
            'button[aria-label*="menu" i]',
            '.hamburger',
            '.menu-toggle',
            'button[aria-expanded]',
            '[data-testid="mobile-menu"]'
          ];
          
          let mobileNavFound = false;
          for (const selector of mobileNavSelectors) {
            try {
              const menuToggle = page.locator(selector).first();
              if (await menuToggle.isVisible({ timeout: 2000 })) {
                await menuToggle.click();
                await page.waitForTimeout(1000);
                
                // Check if menu opens
                const menuSelectors = [
                  '.mobile-menu',
                  '.nav-menu.open',
                  '[role="menu"]',
                  '.navigation.expanded'
                ];
                
                for (const menuSelector of menuSelectors) {
                  try {
                    const menu = page.locator(menuSelector).first();
                    if (await menu.isVisible({ timeout: 2000 })) {
                      console.log(`${viewport.name}: Mobile menu opened successfully`);
                      mobileNavFound = true;
                      
                      // Close menu
                      await menuToggle.click();
                      await page.waitForTimeout(500);
                      break;
                    }
                  } catch (e) {
                    continue;
                  }
                }
                
                if (mobileNavFound) break;
              }
            } catch (e) {
              continue;
            }
          }
          
          if (!mobileNavFound) {
            console.log(`${viewport.name}: Mobile navigation toggle not found or not working`);
          }
        }
      });
      
      test('Content readability and accessibility', async ({ page }) => {
        await loginAs(page);
        
        // Test text readability
        const textSelectors = [
          'h1, .h1',
          'h2, .h2', 
          'h3, .h3',
          'p',
          'button',
          'a',
          'label',
          '.card-title',
          '.recipe-title'
        ];
        
        for (const selector of textSelectors) {
          try {
            const elements = page.locator(selector);
            const count = await elements.count();
            
            if (count > 0) {
              const firstElement = elements.first();
              const isReadable = await isTextReadable(page, selector);
              console.log(`${viewport.name}: ${selector} (${count} elements) - ${isReadable ? 'Readable' : 'May be too small'}`);
            }
          } catch (e) {
            // Element type not present
          }
        }
        
        // Test button and interactive element sizes
        const interactiveSelectors = [
          'button',
          'a',
          'input[type="submit"]',
          '.btn'
        ];
        
        for (const selector of interactiveSelectors) {
          try {
            const elements = page.locator(selector);
            const count = await elements.count();
            
            if (count > 0) {
              const firstElement = elements.first();
              const boundingBox = await firstElement.boundingBox();
              
              if (boundingBox) {
                const isAccessible = boundingBox.width >= 44 && boundingBox.height >= 44; // WCAG guideline
                console.log(`${viewport.name}: ${selector} touch target - ${isAccessible ? 'Accessible' : 'Too small'} (${boundingBox.width}x${boundingBox.height})`);
              }
            }
          } catch (e) {
            // Element not present
          }
        }
      });
      
      test('Form responsiveness', async ({ page }) => {
        await loginAs(page);
        
        // Navigate to a page with forms (try recipe creation)
        const formPages = ['/recipes/create', '/profile', '/settings'];
        
        let formFound = false;
        for (const formPage of formPages) {
          try {
            await page.goto(formPage);
            await page.waitForTimeout(2000);
            
            const form = page.locator('form').first();
            if (await form.isVisible({ timeout: 2000 })) {
              formFound = true;
              console.log(`${viewport.name}: Form found at ${formPage}`);
              
              // Test form elements
              const formElements = [
                'input[type="text"]',
                'input[type="email"]',
                'textarea',
                'select',
                'button[type="submit"]'
              ];
              
              for (const elementSelector of formElements) {
                try {
                  const elements = page.locator(elementSelector);
                  const count = await elements.count();
                  
                  if (count > 0) {
                    const firstElement = elements.first();
                    const isFullyVisible = await isElementFullyVisible(page, elementSelector);
                    const boundingBox = await firstElement.boundingBox();
                    
                    console.log(`${viewport.name}: ${elementSelector} (${count} elements) - ${isFullyVisible ? 'Properly positioned' : 'May be clipped'}`);
                    
                    if (boundingBox && viewport.device === 'mobile') {
                      const isTouchFriendly = boundingBox.height >= 44;
                      console.log(`${viewport.name}: ${elementSelector} touch-friendly: ${isTouchFriendly}`);
                    }
                  }
                } catch (e) {
                  continue;
                }
              }
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (!formFound) {
          console.log(`${viewport.name}: No forms found to test`);
        }
      });
      
      test('Table and data display responsiveness', async ({ page }) => {
        await loginAs(page);
        
        // Look for data tables/lists
        const dataPages = ['/recipes', '/customers', '/meal-plans'];
        
        for (const dataPage of dataPages) {
          try {
            await page.goto(dataPage);
            await page.waitForTimeout(3000);
            
            // Check for tables
            const tableSelectors = [
              'table',
              '.data-table',
              '.table-responsive',
              'tbody tr'
            ];
            
            for (const tableSelector of tableSelectors) {
              try {
                const table = page.locator(tableSelector).first();
                if (await table.isVisible({ timeout: 2000 })) {
                  const boundingBox = await table.boundingBox();
                  
                  if (boundingBox) {
                    const fitsInViewport = boundingBox.width <= viewport.width;
                    console.log(`${viewport.name}: Table at ${dataPage} - ${fitsInViewport ? 'Fits in viewport' : 'May require horizontal scroll'}`);
                    
                    // Check if horizontal scroll is available when needed
                    if (!fitsInViewport) {
                      const hasScroll = await table.evaluate((el) => {
                        return el.scrollWidth > el.clientWidth || 
                               el.parentElement?.scrollWidth > el.parentElement?.clientWidth;
                      });
                      
                      console.log(`${viewport.name}: Table horizontal scroll available: ${hasScroll}`);
                    }
                  }
                  break;
                }
              } catch (e) {
                continue;
              }
            }
            
            // Check for card-based layouts (alternative to tables on mobile)
            const cardSelectors = [
              '.card',
              '.recipe-card',
              '.meal-plan-card',
              '.item-card'
            ];
            
            for (const cardSelector of cardSelectors) {
              try {
                const cards = page.locator(cardSelector);
                const count = await cards.count();
                
                if (count > 0) {
                  const firstCard = cards.first();
                  const isFullyVisible = await isElementFullyVisible(page, cardSelector);
                  
                  console.log(`${viewport.name}: Cards at ${dataPage} (${count} found) - ${isFullyVisible ? 'Properly displayed' : 'May have layout issues'}`);
                  break;
                }
              } catch (e) {
                continue;
              }
            }
            
            break; // If we found content on this page, don't try others
          } catch (e) {
            continue;
          }
        }
      });
      
      test('Image and media responsiveness', async ({ page }) => {
        await loginAs(page);
        
        // Look for images across different pages
        const imagePages = ['/dashboard', '/recipes', '/profile'];
        
        for (const imagePage of imagePages) {
          try {
            await page.goto(imagePage);
            await page.waitForTimeout(2000);
            
            const images = page.locator('img');
            const imageCount = await images.count();
            
            if (imageCount > 0) {
              console.log(`${viewport.name}: Found ${imageCount} images at ${imagePage}`);
              
              // Test first few images
              const testCount = Math.min(imageCount, 5);
              for (let i = 0; i < testCount; i++) {
                try {
                  const image = images.nth(i);
                  const boundingBox = await image.boundingBox();
                  
                  if (boundingBox) {
                    const fitsWidth = boundingBox.width <= viewport.width;
                    const hasMaxWidth = await image.evaluate((img) => {
                      const style = window.getComputedStyle(img);
                      return style.maxWidth !== 'none' || style.width.includes('%');
                    });
                    
                    console.log(`${viewport.name}: Image ${i+1} - Fits: ${fitsWidth}, Has responsive styling: ${hasMaxWidth}`);
                  }
                } catch (e) {
                  continue;
                }
              }
              break;
            }
          } catch (e) {
            continue;
          }
        }
      });
      
      test('Scroll behavior and overflow handling', async ({ page }) => {
        await loginAs(page);
        
        // Test page scrolling
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(1000);
        
        const scrollY = await page.evaluate(() => window.scrollY);
        console.log(`${viewport.name}: Page scroll test - Scrolled to: ${scrollY}px`);
        
        // Test horizontal overflow
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.body.scrollWidth > window.innerWidth;
        });
        
        if (hasHorizontalScroll) {
          console.log(`${viewport.name}: WARNING - Horizontal scroll detected (may indicate layout issues)`);
        } else {
          console.log(`${viewport.name}: No horizontal overflow - Good`);
        }
        
        // Test fixed elements behavior during scroll
        const fixedElements = page.locator('[style*="fixed"], .fixed, .navbar-fixed');
        const fixedCount = await fixedElements.count();
        
        if (fixedCount > 0) {
          console.log(`${viewport.name}: Found ${fixedCount} fixed elements - testing scroll behavior`);
          
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.waitForTimeout(500);
          
          for (let i = 0; i < Math.min(fixedCount, 3); i++) {
            try {
              const element = fixedElements.nth(i);
              const initialPosition = await element.boundingBox();
              
              await page.evaluate(() => window.scrollTo(0, 500));
              await page.waitForTimeout(500);
              
              const scrolledPosition = await element.boundingBox();
              
              if (initialPosition && scrolledPosition) {
                const stayedFixed = Math.abs(initialPosition.y - scrolledPosition.y) < 5;
                console.log(`${viewport.name}: Fixed element ${i+1} - Stayed fixed during scroll: ${stayedFixed}`);
              }
            } catch (e) {
              continue;
            }
          }
        }
      });
      
      test('Responsive breakpoint behavior', async ({ page }) => {
        await loginAs(page);
        
        // Test CSS classes that might indicate responsive behavior
        const responsiveIndicators = await page.evaluate(() => {
          const body = document.body;
          const classes = body.className;
          const responsiveClasses = [];
          
          // Common responsive framework classes
          const responsivePatterns = [
            /col-/, /row/, /container/, /grid/, /flex/,
            /sm-/, /md-/, /lg-/, /xl-/, 
            /mobile/, /tablet/, /desktop/,
            /hidden/, /visible/, /show/, /hide/
          ];
          
          responsivePatterns.forEach(pattern => {
            if (pattern.test(classes)) {
              responsiveClasses.push(pattern.toString());
            }
          });
          
          return {
            hasResponsiveClasses: responsiveClasses.length > 0,
            classes: responsiveClasses,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight
          };
        });
        
        console.log(`${viewport.name}: Responsive framework detected: ${responsiveIndicators.hasResponsiveClasses}`);
        
        // Test media queries by checking computed styles
        const testElement = page.locator('body').first();
        const computedStyle = await testElement.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return {
            display: style.display,
            flexDirection: style.flexDirection,
            fontSize: style.fontSize
          };
        });
        
        console.log(`${viewport.name}: Body computed style:`, computedStyle);
      });
    });
  });
  
  test.describe('Cross-Viewport Consistency Tests', () => {
    
    test('Content availability across viewports', async ({ page }) => {
      const contentPages = ['/dashboard', '/recipes', '/profile'];
      const criticalSelectors = [
        'h1', 'nav', 'main', '.content', 
        'button:has-text("Create")', 'button:has-text("Save")'
      ];
      
      for (const contentPage of contentPages) {
        console.log(`\nTesting content consistency for ${contentPage}:`);
        
        const viewportResults: Record<string, number> = {};
        
        for (const viewport of VIEWPORTS) {
          await page.setViewportSize({ width: viewport.width, height: viewport.height });
          await page.goto(contentPage);
          await page.waitForTimeout(2000);
          
          let visibleCount = 0;
          for (const selector of criticalSelectors) {
            try {
              const elements = page.locator(selector);
              const count = await elements.count();
              if (count > 0) {
                const firstVisible = await elements.first().isVisible({ timeout: 1000 });
                if (firstVisible) visibleCount++;
              }
            } catch (e) {
              // Element not found
            }
          }
          
          viewportResults[viewport.name] = visibleCount;
        }
        
        // Check for consistency
        const values = Object.values(viewportResults);
        const maxVisible = Math.max(...values);
        const minVisible = Math.min(...values);
        
        if (maxVisible === minVisible) {
          console.log(`${contentPage}: Content consistent across all viewports (${maxVisible}/${criticalSelectors.length})`);
        } else {
          console.log(`${contentPage}: Content varies across viewports (${minVisible}-${maxVisible}/${criticalSelectors.length})`);
          Object.entries(viewportResults).forEach(([viewport, count]) => {
            console.log(`  ${viewport}: ${count}/${criticalSelectors.length}`);
          });
        }
      }
    });
  });
});