import { test, expect } from '@playwright/test';

test.describe('Create Grocery Lists via API and Test Race Condition', () => {
  test('should create grocery lists via API then test race condition', async ({ page }) => {
    // Login as customer
    await page.goto('http://localhost:4000/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);

    // Extract the auth token from localStorage or cookies
    const authToken = await page.evaluate(() => {
      return localStorage.getItem('access_token') ||
             localStorage.getItem('token') ||
             sessionStorage.getItem('access_token') ||
             sessionStorage.getItem('token');
    });

    console.log('Auth token found:', !!authToken);

    if (authToken) {
      // Create grocery lists via API
      console.log('Creating grocery lists via API...');

      const response1 = await page.evaluate(async (token) => {
        const response = await fetch('/api/grocery-lists', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: 'Meal Plan Grocery List 1',
            mealPlanId: null
          })
        });
        return {
          status: response.status,
          data: response.ok ? await response.json() : await response.text()
        };
      }, authToken);

      console.log('First grocery list creation response:', response1);

      const response2 = await page.evaluate(async (token) => {
        const response = await fetch('/api/grocery-lists', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: 'Meal Plan Grocery List 2',
            mealPlanId: null
          })
        });
        return {
          status: response.status,
          data: response.ok ? await response.json() : await response.text()
        };
      }, authToken);

      console.log('Second grocery list creation response:', response2);

      // Add some items to the first list to make it more realistic
      if (response1.status === 201 && response1.data.id) {
        const addItemResponse = await page.evaluate(async (token, listId) => {
          const response = await fetch(`/api/grocery-lists/${listId}/items`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              items: [
                { name: 'Chicken Breast', quantity: '2 lbs', category: 'Protein' },
                { name: 'Brown Rice', quantity: '1 bag', category: 'Grains' },
                { name: 'Broccoli', quantity: '2 heads', category: 'Vegetables' },
                { name: 'Olive Oil', quantity: '1 bottle', category: 'Oils' },
                { name: 'Greek Yogurt', quantity: '2 containers', category: 'Dairy' }
              ]
            })
          });
          return {
            status: response.status,
            data: response.ok ? await response.json() : await response.text()
          };
        }, authToken, response1.data.id);

        console.log('Add items response:', addItemResponse);
      }
    }

    // Now test for race condition with existing grocery lists
    console.log('\n🧪 Testing for race condition with newly created grocery lists...');

    // Method 1: Navigate to grocery list page and check immediately
    await page.goto('http://localhost:4000/grocery-list');
    await page.waitForLoadState('domcontentloaded');

    // Check immediately after navigation (before API might complete)
    const emptyStateImmediate = await page.locator('text=Create your first grocery list').isVisible();
    const buttonsImmediate = await page.locator('button.w-full.justify-between.h-12').count();

    console.log('Immediate check - Empty state visible:', emptyStateImmediate);
    console.log('Immediate check - Button count:', buttonsImmediate);

    await page.screenshot({
      path: 'test-results/grocery-api-immediate.png',
      fullPage: true
    });

    // Wait for potential API response
    await page.waitForTimeout(4000);

    const emptyStateAfterWait = await page.locator('text=Create your first grocery list').isVisible();
    const buttonsAfterWait = await page.locator('button.w-full.justify-between.h-12').count();

    console.log('After wait - Empty state visible:', emptyStateAfterWait);
    console.log('After wait - Button count:', buttonsAfterWait);

    await page.screenshot({
      path: 'test-results/grocery-api-after-wait.png',
      fullPage: true
    });

    // Race condition detection
    if (emptyStateImmediate && !emptyStateAfterWait && buttonsAfterWait > 0) {
      console.log('🚨 RACE CONDITION DETECTED!');
      console.log('❌ BUG: Empty state was shown initially but grocery lists exist');
      console.log('This is the race condition bug in GroceryListWrapper.tsx line 214');

      // Log additional details
      const pageContent = await page.textContent('body');
      console.log('Final page contains grocery lists:', pageContent?.includes('Meal Plan Grocery List'));

      // This confirms the race condition bug
      expect(false, 'Race condition detected: Empty state shown initially but grocery lists exist').toBeTruthy();
    } else if (!emptyStateImmediate && buttonsImmediate > 0) {
      console.log('✅ No race condition - grocery lists loaded immediately');
    } else if (emptyStateAfterWait && buttonsAfterWait === 0) {
      console.log('ℹ️  No grocery lists exist - empty state is correct');
    } else {
      console.log('🤔 Unclear state - might be partial race condition');
      console.log(`States: immediate(${emptyStateImmediate}, ${buttonsImmediate}) -> wait(${emptyStateAfterWait}, ${buttonsAfterWait})`);
    }

    // Method 2: Rapid navigation test
    console.log('\n🔄 Testing rapid navigation...');

    for (let i = 0; i < 2; i++) {
      await page.goto('http://localhost:4000/customer');
      await page.waitForTimeout(100);
      await page.goto('http://localhost:4000/grocery-list');

      // Check immediately after navigation
      const rapidEmptyState = await page.locator('text=Create your first grocery list').isVisible();
      const rapidButtons = await page.locator('button.w-full.justify-between.h-12').count();

      console.log(`Rapid nav ${i + 1} - Immediate: empty=${rapidEmptyState}, buttons=${rapidButtons}`);

      await page.waitForTimeout(2000);

      const rapidEmptyStateAfter = await page.locator('text=Create your first grocery list').isVisible();
      const rapidButtonsAfter = await page.locator('button.w-full.justify-between.h-12').count();

      console.log(`Rapid nav ${i + 1} - After wait: empty=${rapidEmptyStateAfter}, buttons=${rapidButtonsAfter}`);

      if (rapidEmptyState && !rapidEmptyStateAfter && rapidButtonsAfter > 0) {
        console.log(`🚨 RACE CONDITION in rapid navigation ${i + 1}!`);
      }
    }
  });
});