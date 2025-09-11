import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:4000';
const CUSTOMER_EMAIL = 'customer.test@evofitmeals.com';
const CUSTOMER_PASSWORD = 'TestCustomer123!';
const ADMIN_EMAIL = 'admin@fitmeal.pro';
const ADMIN_PASSWORD = 'AdminPass123';
const TRAINER_EMAIL = 'trainer.test@evofitmeals.com';
const TRAINER_PASSWORD = 'TestTrainer123!';

// Helper function to login
async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
}

test.describe('Complete Feature Removal Verification', () => {
  test.describe('Frontend - Goals Feature Removal', () => {
    test('Goals tab should not exist in Progress Tracking', async ({ page }) => {
      // Login as customer
      await login(page, CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
      
      // Navigate to profile
      await page.click('a[href="/profile"]');
      await page.waitForURL('**/profile');
      
      // Click on Progress section
      await page.click('text=Progress');
      await page.waitForTimeout(1000);
      
      // Verify Progress Tracking header is visible
      await expect(page.locator('h2:has-text("Progress Tracking")')).toBeVisible();
      
      // Verify NO Goals tab exists
      const goalsTabs = page.locator('button[role="tab"]:has-text("Goals")');
      await expect(goalsTabs).toHaveCount(0);
      
      // Verify NO tabs at all (since we removed tabs completely)
      const allTabs = page.locator('[role="tablist"]');
      await expect(allTabs).toHaveCount(0);
      
      // Verify Measurements section is directly visible
      await expect(page.locator('text=Body Measurements')).toBeVisible();
    });

    test('Goals stats card should not exist', async ({ page }) => {
      // Login as customer
      await login(page, CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
      
      // Navigate to profile progress
      await page.click('a[href="/profile"]');
      await page.waitForURL('**/profile');
      await page.click('text=Progress');
      
      // Verify only 2 stats cards exist (Weight and Body Fat)
      const statsCards = page.locator('.grid > .card').first().locator('> .card');
      const cardCount = await statsCards.count();
      expect(cardCount).toBeLessThanOrEqual(2);
      
      // Verify Active Goals card doesn't exist
      await expect(page.locator('.card:has-text("Active Goals")')).not.toBeVisible();
      
      // Verify Weight and Body Fat cards DO exist
      await expect(page.locator('.card:has-text("Current Weight")')).toBeVisible();
      await expect(page.locator('.card:has-text("Body Fat")')).toBeVisible();
    });

    test('GoalsTab component should not be imported anywhere', async ({ page }) => {
      // This is verified by the app loading without errors
      await login(page, CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
      
      // Check browser console for any import errors
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      // Navigate through the app
      await page.goto(`${BASE_URL}/profile`);
      await page.waitForTimeout(2000);
      
      // Check that no errors mention GoalsTab
      const goalsTabErrors = consoleErrors.filter(err => 
        err.toLowerCase().includes('goalstab') || 
        err.toLowerCase().includes('goals tab')
      );
      expect(goalsTabErrors).toHaveLength(0);
    });
  });

  test.describe('Frontend - Progress Photos Removal', () => {
    test('Progress Photos tab should not exist', async ({ page }) => {
      // Login as customer
      await login(page, CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
      
      // Navigate to profile progress
      await page.click('a[href="/profile"]');
      await page.waitForURL('**/profile');
      await page.click('text=Progress');
      
      // Verify NO Photos tab exists
      const photosTab = page.locator('button[role="tab"]:has-text("Photos")');
      await expect(photosTab).toHaveCount(0);
      
      const progressPhotosTab = page.locator('button[role="tab"]:has-text("Progress Photos")');
      await expect(progressPhotosTab).toHaveCount(0);
    });

    test('Progress Photos stats card should not exist', async ({ page }) => {
      // Login as customer
      await login(page, CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
      
      // Navigate to profile progress
      await page.click('a[href="/profile"]');
      await page.waitForURL('**/profile');
      await page.click('text=Progress');
      
      // Verify Progress Photos card doesn't exist
      await expect(page.locator('.card:has-text("Progress Photos")')).not.toBeVisible();
    });
  });

  test.describe('Frontend - Meal Prep Calendar Removal', () => {
    test('Meal Prep Calendar should not be accessible', async ({ page }) => {
      // Login as customer
      await login(page, CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
      
      // Try to navigate directly to meal-prep routes
      await page.goto(`${BASE_URL}/meal-prep`);
      await page.waitForTimeout(1000);
      
      // Should not be on meal-prep route
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/meal-prep');
      
      // Try alternate route
      await page.goto(`${BASE_URL}/meal-prep-calendar`);
      await page.waitForTimeout(1000);
      
      // Should not be on meal-prep-calendar route
      const currentUrl2 = page.url();
      expect(currentUrl2).not.toContain('/meal-prep-calendar');
    });

    test('Meal Prep Calendar card should not exist on dashboard', async ({ page }) => {
      // Login as customer
      await login(page, CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
      
      // Should be on customer dashboard
      await page.waitForURL('**/my-meal-plans');
      
      // Verify Meal Prep Calendar card doesn't exist
      await expect(page.locator('h3:has-text("Meal Prep Calendar")')).not.toBeVisible();
      await expect(page.locator('text=Schedule and organize your meal prep')).not.toBeVisible();
      
      // Verify no links to meal-prep exist
      const mealPrepLinks = page.locator('a[href*="meal-prep"]');
      await expect(mealPrepLinks).toHaveCount(0);
    });
  });

  test.describe('Backend - Goals API Removal', () => {
    test('Goals API endpoints should return 404', async ({ request }) => {
      // First, get auth token
      const loginResponse = await request.post(`${BASE_URL}/api/auth/login`, {
        data: {
          email: CUSTOMER_EMAIL,
          password: CUSTOMER_PASSWORD
        }
      });
      
      const loginData = await loginResponse.json();
      const token = loginData.data?.accessToken || loginData.accessToken;
      
      // Test GET /api/progress/goals
      const getGoalsResponse = await request.get(`${BASE_URL}/api/progress/goals`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      expect(getGoalsResponse.status()).toBe(404);
      
      // Test POST /api/progress/goals
      const createGoalResponse = await request.post(`${BASE_URL}/api/progress/goals`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: {
          goalType: 'weight_loss',
          goalName: 'Test Goal',
          targetValue: 70,
          targetUnit: 'kg',
          startDate: new Date().toISOString()
        }
      });
      expect(createGoalResponse.status()).toBe(404);
      
      // Test PATCH /api/progress/goals/:id/progress
      const updateGoalResponse = await request.patch(`${BASE_URL}/api/progress/goals/123/progress`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: {
          currentValue: 75
        }
      });
      expect(updateGoalResponse.status()).toBe(404);
    });

    test('Server should be running without errors', async ({ request }) => {
      // Test health endpoint
      const healthResponse = await request.get(`${BASE_URL}/api/health`);
      expect(healthResponse.status()).toBe(200);
      
      const healthData = await healthResponse.json();
      expect(healthData.status).toBe('ok');
    });
  });

  test.describe('Overall Progress Page Verification', () => {
    test('Progress page should only show Measurements functionality', async ({ page }) => {
      // Login as customer
      await login(page, CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
      
      // Navigate to profile progress
      await page.click('a[href="/profile"]');
      await page.waitForURL('**/profile');
      await page.click('text=Progress');
      
      // Wait for page to load
      await page.waitForTimeout(1000);
      
      // Verify page structure
      await expect(page.locator('h2:has-text("Progress Tracking")')).toBeVisible();
      await expect(page.locator('text=Track your fitness journey and celebrate your achievements')).toBeVisible();
      
      // Verify stats cards (only 2)
      await expect(page.locator('.card:has-text("Current Weight")')).toBeVisible();
      await expect(page.locator('.card:has-text("Body Fat")')).toBeVisible();
      
      // Verify Progress Charts section
      await expect(page.locator('text=Progress Over Time')).toBeVisible();
      
      // Verify Measurements section
      await expect(page.locator('text=Body Measurements')).toBeVisible();
      await expect(page.locator('button:has-text("Add Measurement")')).toBeVisible();
      
      // Verify NO tabs exist
      const tabsList = page.locator('[role="tablist"]');
      await expect(tabsList).toHaveCount(0);
      
      // Verify NO Goals-related content
      await expect(page.locator('text=Goals')).not.toBeVisible();
      await expect(page.locator('text=Add Goal')).not.toBeVisible();
      await expect(page.locator('text=Active Goals')).not.toBeVisible();
      
      // Verify NO Photos-related content
      await expect(page.locator('text=Progress Photos')).not.toBeVisible();
      await expect(page.locator('text=Upload Photo')).not.toBeVisible();
    });

    test('Measurements functionality should work correctly', async ({ page }) => {
      // Login as customer
      await login(page, CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
      
      // Navigate to profile progress
      await page.click('a[href="/profile"]');
      await page.waitForURL('**/profile');
      await page.click('text=Progress');
      
      // Wait for page to load
      await page.waitForTimeout(1000);
      
      // Click Add Measurement button
      await page.click('button:has-text("Add Measurement")');
      
      // Verify measurement form appears
      await expect(page.locator('text=Add New Measurement')).toBeVisible();
      
      // Check form fields exist
      await expect(page.locator('input[name="weight"]')).toBeVisible();
      await expect(page.locator('input[name="bodyFat"]')).toBeVisible();
      
      // Cancel the form
      const cancelButton = page.locator('button:has-text("Cancel")');
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
      }
    });
  });

  test.describe('Cross-Role Verification', () => {
    test('Admin should not see Goals features', async ({ page }) => {
      // Login as admin
      await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
      
      // Admin doesn't have progress tracking, but verify no Goals in navigation
      const goalsLinks = page.locator('a:has-text("Goals")');
      await expect(goalsLinks).toHaveCount(0);
    });

    test('Trainer should not see Goals features', async ({ page }) => {
      // Login as trainer
      await login(page, TRAINER_EMAIL, TRAINER_PASSWORD);
      
      // Trainer doesn't have progress tracking, but verify no Goals in navigation
      const goalsLinks = page.locator('a:has-text("Goals")');
      await expect(goalsLinks).toHaveCount(0);
    });
  });
});

test.describe('Performance and Error Checks', () => {
  test('Application should load without JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    
    // Collect console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Login and navigate through the app
    await login(page, CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
    await page.goto(`${BASE_URL}/profile`);
    await page.click('text=Progress');
    await page.waitForTimeout(2000);
    
    // Filter out expected errors (if any)
    const criticalErrors = errors.filter(err => 
      !err.includes('Failed to load resource') && // Ignore missing resources
      !err.includes('favicon') // Ignore favicon errors
    );
    
    // No critical errors should exist
    expect(criticalErrors).toHaveLength(0);
  });

  test('All removed routes should redirect properly', async ({ page }) => {
    await login(page, CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
    
    // Test removed routes
    const removedRoutes = [
      '/meal-prep',
      '/meal-prep-calendar',
      '/goals',
      '/progress/goals',
      '/progress/photos'
    ];
    
    for (const route of removedRoutes) {
      await page.goto(`${BASE_URL}${route}`);
      await page.waitForTimeout(500);
      
      // Should not stay on the removed route
      const currentUrl = page.url();
      expect(currentUrl).not.toContain(route);
    }
  });
});