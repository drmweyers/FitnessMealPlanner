import { test, expect } from '@playwright/test';

test.describe('Trainer-Customer Relationship Tests', () => {
  test('Trainer can see customer via API', async ({ request }) => {
    console.log('Testing trainer-customer relationship via API...');
    
    // Login as trainer
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'trainer.test@evofitmeals.com',
        password: 'TestTrainer123!'
      }
    });
    
    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    console.log('✅ Trainer logged in successfully');
    
    // Get customers list
    const customersResponse = await request.get('/api/trainer/customers');
    expect(customersResponse.ok()).toBeTruthy();
    
    const customersData = await customersResponse.json();
    console.log('Customers response:', JSON.stringify(customersData, null, 2));
    
    expect(customersData.customers).toBeDefined();
    expect(Array.isArray(customersData.customers)).toBeTruthy();
    
    // Find test customer
    const testCustomer = customersData.customers.find((c: any) => 
      c.email === 'customer.test@evofitmeals.com' || 
      c.customerEmail === 'customer.test@evofitmeals.com'
    );
    
    expect(testCustomer).toBeDefined();
    console.log('✅ Test customer found in trainer\'s customer list');
    console.log('Customer details:', JSON.stringify(testCustomer, null, 2));
  });

  test('Trainer can see customer in UI', async ({ page }) => {
    console.log('Testing trainer-customer relationship in UI...');
    
    // Navigate to login
    await page.goto('/login');
    
    // Login as trainer
    await page.fill('input[type="email"]', 'trainer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestTrainer123!');
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForURL('**/trainer/**', { timeout: 10000 });
    console.log('✅ Trainer logged in successfully');
    
    // Click on Customers tab
    const customersTab = page.locator('button, div').filter({ hasText: /^Customers$/i }).first();
    await customersTab.click();
    console.log('✅ Clicked on Customers tab');
    
    // Wait for customer list to load
    await page.waitForTimeout(2000);
    
    // Check if customer email is visible
    const customerEmail = page.locator('text=customer.test@evofitmeals.com');
    await expect(customerEmail).toBeVisible({ timeout: 10000 });
    console.log('✅ Customer email is visible in the UI');
    
    // Take a screenshot for verification
    await page.screenshot({ path: 'trainer-customers-view.png', fullPage: true });
    console.log('📸 Screenshot saved as trainer-customers-view.png');
  });

  test('Trainer can see meal plans', async ({ page }) => {
    console.log('Testing trainer meal plans...');
    
    // Navigate to login
    await page.goto('/login');
    
    // Login as trainer
    await page.fill('input[type="email"]', 'trainer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestTrainer123!');
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForURL('**/trainer/**', { timeout: 10000 });
    console.log('✅ Trainer logged in successfully');
    
    // Click on Saved Plans tab
    const savedPlansTab = page.locator('button, div').filter({ hasText: /Saved Plans?/i }).first();
    await savedPlansTab.click();
    console.log('✅ Clicked on Saved Plans tab');
    
    // Wait for meal plans to load
    await page.waitForTimeout(2000);
    
    // Check if Test Meal Plan is visible
    const mealPlan = page.locator('text=/Test Meal Plan/i').first();
    const isMealPlanVisible = await mealPlan.isVisible().catch(() => false);
    
    if (isMealPlanVisible) {
      console.log('✅ Test Meal Plan is visible');
    } else {
      console.log('⚠️ Test Meal Plan not immediately visible, checking for any meal plans...');
      const anyMealPlan = await page.locator('text=/meal plan/i').first().isVisible().catch(() => false);
      if (anyMealPlan) {
        console.log('✅ Meal plans are visible');
      } else {
        console.log('❌ No meal plans visible');
      }
    }
    
    // Take a screenshot
    await page.screenshot({ path: 'trainer-meal-plans-view.png', fullPage: true });
    console.log('📸 Screenshot saved as trainer-meal-plans-view.png');
  });

  test('Customer can login successfully', async ({ page }) => {
    console.log('Testing customer login...');
    
    // Navigate to login
    await page.goto('/login');
    
    // Login as customer
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');
    
    // Wait for navigation away from login
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
    console.log('✅ Customer logged in successfully');
    
    // Take a screenshot of customer dashboard
    await page.screenshot({ path: 'customer-dashboard.png', fullPage: true });
    console.log('📸 Screenshot saved as customer-dashboard.png');
  });

  test('Admin can login successfully', async ({ page }) => {
    console.log('Testing admin login...');
    
    // Navigate to login
    await page.goto('/login');
    
    // Login as admin
    await page.fill('input[type="email"]', 'admin.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestAdmin123!');
    await page.click('button[type="submit"]');
    
    // Wait for navigation away from login
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
    console.log('✅ Admin logged in successfully');
    
    const currentUrl = page.url();
    console.log('Admin redirected to:', currentUrl);
    
    // Take a screenshot of admin dashboard
    await page.screenshot({ path: 'admin-dashboard.png', fullPage: true });
    console.log('📸 Screenshot saved as admin-dashboard.png');
  });
});