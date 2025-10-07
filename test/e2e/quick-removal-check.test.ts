import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4000';
const CUSTOMER_EMAIL = 'customer.test@evofitmeals.com';
const CUSTOMER_PASSWORD = 'TestCustomer123!';

test.describe('Quick Feature Removal Check', () => {
  test('Check removed features are gone', async ({ page }) => {
    // Set longer timeout for login
    test.setTimeout(60000);
    
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', CUSTOMER_EMAIL);
    await page.fill('input[type="password"]', CUSTOMER_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForURL('**/my-meal-plans', { timeout: 15000 });
    
    // Check 1: Meal Prep Calendar card should not exist
    const mealPrepCard = page.locator('h3:has-text("Meal Prep Calendar")');
    await expect(mealPrepCard).toHaveCount(0);
    console.log('✅ Meal Prep Calendar removed from dashboard');
    
    // Navigate to profile
    await page.click('a[href="/profile"]');
    await page.waitForURL('**/profile', { timeout: 10000 });
    
    // Click Progress tab
    await page.click('text=Progress');
    await page.waitForTimeout(2000);
    
    // Check 2: Progress page should show
    const progressHeader = page.locator('h2:has-text("Progress Tracking")');
    await expect(progressHeader).toBeVisible();
    console.log('✅ Progress Tracking page loads');
    
    // Check 3: No Goals tab
    const goalsTab = page.locator('button[role="tab"]:has-text("Goals")');
    await expect(goalsTab).toHaveCount(0);
    console.log('✅ Goals tab removed');
    
    // Check 4: No Photos tab
    const photosTab = page.locator('button[role="tab"]:has-text("Photos")');
    await expect(photosTab).toHaveCount(0);
    console.log('✅ Photos tab removed');
    
    // Check 5: No Active Goals card
    const goalsCard = page.locator('.card:has-text("Active Goals")');
    await expect(goalsCard).toHaveCount(0);
    console.log('✅ Active Goals card removed');
    
    // Check 6: Measurements section visible
    const measurementsSection = page.locator('text=Body Measurements');
    await expect(measurementsSection).toBeVisible();
    console.log('✅ Measurements section visible');
    
    // Check 7: Only 2 stats cards (Weight and Body Fat)
    const weightCard = page.locator('.card:has-text("Current Weight")');
    const bodyFatCard = page.locator('.card:has-text("Body Fat")');
    await expect(weightCard).toBeVisible();
    await expect(bodyFatCard).toBeVisible();
    console.log('✅ Weight and Body Fat cards visible');
  });
  
  test('Check backend Goals API returns 404', async ({ request }) => {
    // Login first
    const loginResponse = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        email: CUSTOMER_EMAIL,
        password: CUSTOMER_PASSWORD
      }
    });
    
    const loginData = await loginResponse.json();
    const token = loginData.data?.accessToken || loginData.accessToken || loginData.token;
    
    if (!token) {
      console.log('Login response:', loginData);
      throw new Error('Failed to get auth token');
    }
    
    // Test Goals API endpoints
    const goalsResponse = await request.get(`${BASE_URL}/api/progress/goals`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    expect(goalsResponse.status()).toBe(404);
    console.log('✅ Goals API returns 404');
  });
  
  test('Check server health', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.status).toBe('ok');
    console.log('✅ Server is healthy');
  });
});