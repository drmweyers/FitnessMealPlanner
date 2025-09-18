import { test, expect } from '@playwright/test';

test.describe('Debug Grocery List Rendering', () => {
  test('diagnose blank render issue', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console error:', msg.text());
      }
    });

    page.on('pageerror', error => {
      console.log('❌ Page error:', error.message);
    });

    // Login
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/customer');

    // Click grocery tab
    console.log('Clicking Grocery tab...');
    await page.click('text=Grocery');
    await page.waitForTimeout(3000);

    // Get the entire body text
    const bodyText = await page.textContent('body');
    console.log('Body text length:', bodyText?.length);
    console.log('Body text:', bodyText);

    // Check for error messages
    const errors = await page.locator('.text-destructive, [class*="error"]').allTextContents();
    if (errors.length > 0) {
      console.log('Error messages found:', errors);
    }

    // Check if GroceryListWrapper is rendering
    const wrapperExists = await page.locator('[data-testid="grocery-wrapper"], .grocery-wrapper').count();
    console.log('GroceryListWrapper elements:', wrapperExists);

    // Check for any grocery-related elements
    const groceryElements = await page.locator('[class*="grocery"], [class*="Grocery"]').count();
    console.log('Grocery-related elements:', groceryElements);

    // Get all visible text elements
    const visibleText = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const texts = [];
      elements.forEach(el => {
        if (el.textContent && el.textContent.trim() &&
            el.childElementCount === 0 &&
            window.getComputedStyle(el).display !== 'none') {
          texts.push(el.textContent.trim());
        }
      });
      return texts;
    });
    console.log('All visible text elements:', visibleText);

    // Check React component tree
    const reactInfo = await page.evaluate(() => {
      // Try to find React Fiber
      const findReactFiber = (element: Element): any => {
        for (const key in element) {
          if (key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance')) {
            return (element as any)[key];
          }
        }
        return null;
      };

      const mainElement = document.querySelector('#root') || document.querySelector('body');
      if (!mainElement) return null;

      const fiber = findReactFiber(mainElement);
      if (!fiber) return { error: 'No React Fiber found' };

      // Traverse to find GroceryListWrapper
      let current = fiber;
      let depth = 0;
      const components = [];

      while (current && depth < 20) {
        if (current.elementType && typeof current.elementType === 'function') {
          components.push(current.elementType.name || 'Anonymous');
        }
        current = current.child;
        depth++;
      }

      return { components };
    });
    console.log('React component tree:', reactInfo);

    // Check localStorage for auth token
    const token = await page.evaluate(() => localStorage.getItem('token'));
    console.log('Auth token exists:', !!token);

    // Try to manually fetch grocery lists
    const apiTest = await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      if (!token) return { error: 'No token' };

      try {
        const response = await fetch('/api/grocery-lists', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await response.json();
        return {
          status: response.status,
          data
        };
      } catch (error: any) {
        return { error: error.message };
      }
    });
    console.log('Direct API test:', JSON.stringify(apiTest, null, 2));

    // Take screenshot
    await page.screenshot({ path: 'grocery-debug-render.png', fullPage: true });
    console.log('Screenshot saved to grocery-debug-render.png');

    // Check if components are properly imported
    const scriptsLoaded = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      return scripts.map(s => s.src).filter(src => src.includes('chunk') || src.includes('index'));
    });
    console.log('Loaded scripts:', scriptsLoaded.length);

    expect(bodyText?.length).toBeGreaterThan(100);
  });
});