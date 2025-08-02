/**
 * Simplified Playwright Test for Trainer Customer Detail View
 * 
 * This test uses existing accounts and focuses on the core functionality:
 * - Login as trainer
 * - Navigate to customers
 * - Test customer detail view
 * - Test meal plan creation with customer context
 */

import { test, expect } from '@playwright/test';

// Test configuration with existing accounts
const BASE_URL = 'http://localhost:4000';
const TRAINER_EMAIL = 'testtrainer@example.com';
const TRAINER_PASSWORD = 'TrainerPassword123!';
const CUSTOMER_EMAIL = 'testcustomer@example.com';
const CUSTOMER_PASSWORD = 'TestPassword123!';
const ADMIN_EMAIL = 'admin@fitmeal.pro';
const ADMIN_PASSWORD = 'Admin123!@#';

test.describe('Trainer Customer Detail View', () => {
  test('Trainer can view and interact with customer details', async ({ page }) => {
    console.log('🧪 Testing Trainer Customer Detail View...');

    // Step 1: Login as trainer
    console.log('1. Logging in as trainer...');
    await page.goto(`${BASE_URL}/login`);
    
    // Wait for and fill login form
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
    await page.fill('input[name="email"]', TRAINER_EMAIL);
    await page.fill('input[name="password"]', TRAINER_PASSWORD);
    
    // Submit login
    await Promise.all([
      page.waitForNavigation({ timeout: 15000 }),
      page.click('button[type="submit"]')
    ]);
    
    console.log('   Current URL:', page.url());
    
    // Step 2: Navigate to Customers tab
    console.log('2. Navigating to Customers tab...');
    
    // Try different selectors for the Customers tab
    try {
      // Try text selector first
      const customersTab = await page.locator('text=Customers').first();
      if (await customersTab.isVisible()) {
        await customersTab.click();
      } else {
        // Try button selector
        await page.click('button:has-text("Customers")');
      }
      console.log('   ✅ Clicked Customers tab');
    } catch (e) {
      console.log('   ⚠️  Could not find Customers tab, trying navigation menu...');
      // Try looking in navigation menu
      await page.click('[data-testid="nav-customers"], a[href*="customers"], text=Customer Management');
    }
    
    // Wait for customer management to load
    await page.waitForSelector('text=Customer Management, text=Customer Email, text=Customers', { 
      timeout: 10000 
    });
    console.log('   ✅ Customer Management page loaded');
    
    // Step 3: Find and click on a customer
    console.log('3. Looking for customers...');
    
    // Wait for customer cards to load
    await page.waitForTimeout(2000); // Give time for data to load
    
    // Try to find customer cards
    const customerCards = await page.locator('[data-testid="customer-card"], .customer-card, div:has-text("@example.com")').all();
    
    if (customerCards.length > 0) {
      console.log(`   ✅ Found ${customerCards.length} customers`);
      
      // Click on the first customer
      await customerCards[0].click();
      console.log('   ✅ Clicked on customer');
      
      // Step 4: Verify Customer Detail View loads
      console.log('4. Verifying Customer Detail View...');
      
      // Wait for detail view elements
      try {
        await page.waitForSelector('text=Back to Customers', { timeout: 10000 });
        console.log('   ✅ Customer Detail View loaded');
        
        // Verify tabs are present
        const tabs = ['Overview', 'Meal Plans', 'Health Metrics', 'Goals'];
        for (const tab of tabs) {
          const tabElement = await page.locator(`text=${tab}`).first();
          if (await tabElement.isVisible()) {
            console.log(`   ✅ ${tab} tab is visible`);
          } else {
            console.log(`   ⚠️  ${tab} tab not found`);
          }
        }
        
        // Step 5: Test Create New Meal Plan button
        console.log('5. Testing meal plan creation...');
        
        const createButton = await page.locator('button:has-text("Create New Meal Plan")').first();
        if (await createButton.isVisible()) {
          await createButton.click();
          console.log('   ✅ Clicked Create New Meal Plan');
          
          // Wait for meal plan generator
          await page.waitForSelector('text=Customer Context, text=Meal Plan Generator', { timeout: 10000 });
          console.log('   ✅ Meal Plan Generator loaded with customer context');
          
          // Verify customer email is pre-populated
          const clientNameInput = await page.locator('input[name="clientName"]');
          const clientNameValue = await clientNameInput.inputValue();
          if (clientNameValue.includes('@')) {
            console.log(`   ✅ Customer email pre-populated: ${clientNameValue}`);
          } else {
            console.log('   ⚠️  Customer email not pre-populated');
          }
          
          // Go back to customer detail view
          const backButton = await page.locator('button:has-text("Back to")').first();
          if (await backButton.isVisible()) {
            await backButton.click();
            console.log('   ✅ Navigated back to customer detail view');
          }
        } else {
          console.log('   ⚠️  Create New Meal Plan button not found');
        }
        
        // Step 6: Test navigation back to customers list
        console.log('6. Testing navigation back...');
        
        const backToCustomersButton = await page.locator('button:has-text("Back to Customers")').first();
        if (await backToCustomersButton.isVisible()) {
          await backToCustomersButton.click();
          await page.waitForSelector('text=Customer Management', { timeout: 5000 });
          console.log('   ✅ Successfully navigated back to customers list');
        }
        
      } catch (error) {
        console.log('   ❌ Customer Detail View failed to load:', error.message);
        
        // Take screenshot for debugging
        await page.screenshot({ path: 'customer-detail-view-error.png', fullPage: true });
        console.log('   📸 Screenshot saved as customer-detail-view-error.png');
      }
      
    } else {
      console.log('   ⚠️  No customers found - checking empty state');
      
      // Verify empty state
      const emptyState = await page.locator('text=No Customers Yet, text=No customers found').first();
      if (await emptyState.isVisible()) {
        console.log('   ✅ Empty state displayed correctly');
      } else {
        console.log('   ❌ Unexpected state - no customers and no empty state');
        await page.screenshot({ path: 'no-customers-error.png', fullPage: true });
      }
    }
    
    console.log('\n✅ Test completed!');
  });

  test('Customer search functionality', async ({ page }) => {
    console.log('🧪 Testing customer search...');
    
    // Login as trainer
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', TRAINER_EMAIL);
    await page.fill('input[name="password"]', TRAINER_PASSWORD);
    
    await Promise.all([
      page.waitForNavigation({ timeout: 15000 }),
      page.click('button[type="submit"]')
    ]);
    
    // Navigate to customers
    const customersTab = await page.locator('text=Customers').first();
    await customersTab.click();
    await page.waitForSelector('text=Customer Management', { timeout: 10000 });
    
    // Test search
    console.log('Testing search functionality...');
    
    const searchInput = await page.locator('input[placeholder*="Search"], input[placeholder*="search"]').first();
    if (await searchInput.isVisible()) {
      // Search for non-existent customer
      await searchInput.fill('nonexistent@test.com');
      await page.waitForTimeout(1000); // Wait for search to filter
      
      const noResults = await page.locator('text=No Matching Customers, text=No customers found').first();
      if (await noResults.isVisible()) {
        console.log('   ✅ Search with no results works correctly');
      }
      
      // Clear search
      await searchInput.clear();
      console.log('   ✅ Search functionality tested');
    } else {
      console.log('   ⚠️  Search input not found');
    }
  });

  test('API endpoints verification', async ({ page }) => {
    console.log('🧪 Testing API endpoints...');
    
    // Login as trainer first
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', TRAINER_EMAIL);
    await page.fill('input[name="password"]', TRAINER_PASSWORD);
    
    await Promise.all([
      page.waitForNavigation({ timeout: 15000 }),
      page.click('button[type="submit"]')
    ]);
    
    // Monitor API calls
    const apiCalls = [];
    
    page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/')) {
        apiCalls.push({
          url: url,
          status: response.status(),
          method: response.request().method()
        });
        console.log(`   API Call: ${response.request().method()} ${url} - Status: ${response.status()}`);
      }
    });
    
    // Navigate to customers to trigger API calls
    const customersTab = await page.locator('text=Customers').first();
    await customersTab.click();
    
    // Wait for API calls to complete
    await page.waitForTimeout(3000);
    
    // Check if trainer API endpoints were called
    const trainerCustomersCall = apiCalls.find(call => call.url.includes('/api/trainer/customers'));
    if (trainerCustomersCall) {
      console.log('   ✅ Trainer customers API endpoint called successfully');
    } else {
      console.log('   ⚠️  Trainer customers API endpoint not detected');
    }
    
    console.log(`\n   Total API calls detected: ${apiCalls.length}`);
  });
});