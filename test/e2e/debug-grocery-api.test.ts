import { test, expect } from '@playwright/test';

test.describe('Grocery List API Debug Tests', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    // Login to get auth token
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'customer.test@evofitmeals.com',
        password: 'TestCustomer123!'
      }
    });

    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);

    if (loginData.token) {
      authToken = loginData.token;
      console.log('Got auth token:', authToken.substring(0, 20) + '...');
    } else {
      console.error('Failed to get auth token:', loginData);
    }
  });

  test('Check database for grocery lists', async ({ page }) => {
    // First login via UI to set up session
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/customer');

    // Now check the API directly from the browser context
    const apiResponse = await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      console.log('Token from localStorage:', token);

      if (!token) {
        return { error: 'No token in localStorage' };
      }

      try {
        const response = await fetch('/api/grocery-lists', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const text = await response.text();
        console.log('Raw API response:', text);

        try {
          const data = JSON.parse(text);
          return {
            status: response.status,
            data,
            headers: Object.fromEntries(response.headers.entries())
          };
        } catch (e) {
          return {
            status: response.status,
            error: 'Failed to parse JSON',
            rawText: text,
            headers: Object.fromEntries(response.headers.entries())
          };
        }
      } catch (error) {
        return {
          error: error.message || 'Network error',
          details: error
        };
      }
    });

    console.log('API Response:', JSON.stringify(apiResponse, null, 2));

    // Check if we got an error
    if (apiResponse.error) {
      console.error('API Error:', apiResponse);
    }

    // Log specific error details
    if (apiResponse.status && apiResponse.status !== 200) {
      console.error(`API returned status ${apiResponse.status}`);
      if (apiResponse.data) {
        console.error('Error data:', apiResponse.data);
      }
      if (apiResponse.rawText) {
        console.error('Raw response text:', apiResponse.rawText);
      }
    }
  });

  test('Test grocery list creation', async ({ page }) => {
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/customer');

    // Try to create a grocery list via API
    const createResponse = await page.evaluate(async () => {
      const token = localStorage.getItem('token');

      try {
        const response = await fetch('/api/grocery-lists', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: 'Test Grocery List',
            isActive: true
          })
        });

        const text = await response.text();
        try {
          return {
            status: response.status,
            data: JSON.parse(text)
          };
        } catch {
          return {
            status: response.status,
            rawText: text
          };
        }
      } catch (error) {
        return { error: error.message };
      }
    });

    console.log('Create grocery list response:', JSON.stringify(createResponse, null, 2));
  });

  test('Check backend routes', async ({ request }) => {
    // Test if the route exists
    const response = await request.get('/api/grocery-lists', {
      headers: authToken ? {
        'Authorization': `Bearer ${authToken}`
      } : {}
    });

    console.log('Route check status:', response.status());
    console.log('Route check statusText:', response.statusText());

    const responseText = await response.text();
    console.log('Route response text:', responseText);

    try {
      const data = JSON.parse(responseText);
      console.log('Parsed response:', JSON.stringify(data, null, 2));
    } catch (e) {
      console.log('Could not parse as JSON');
    }
  });

  test('Direct database check', async ({ page }) => {
    // Check if database tables exist
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/customer');

    // Navigate to grocery tab to trigger any initialization
    await page.click('text=Grocery');
    await page.waitForTimeout(3000);

    // Take screenshot for debugging
    await page.screenshot({ path: 'grocery-tab-debug.png', fullPage: true });

    // Check console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text());
      }
    });

    // Check network errors
    page.on('requestfailed', request => {
      console.error('Request failed:', request.url(), request.failure()?.errorText);
    });

    // Wait and check for any error messages on the page
    const errorText = await page.locator('.text-destructive, [class*="error"], [class*="Error"]').textContent().catch(() => null);
    if (errorText) {
      console.error('Error displayed on page:', errorText);
    }

    // Get the actual component state
    const componentState = await page.evaluate(() => {
      // Try to find React Fiber to get component state
      const groceryElements = document.querySelectorAll('[class*="grocery"], [class*="Grocery"]');
      return {
        elementCount: groceryElements.length,
        visibleText: document.body.innerText.substring(0, 500)
      };
    });

    console.log('Component state:', componentState);
  });
});