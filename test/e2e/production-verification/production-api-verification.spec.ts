/**
 * Direct API verification for production deployment
 * Tests the customer visibility fix at the API level
 */

import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://evofitmeals.com';
const TRAINER_CREDENTIALS = {
  email: 'trainer.test@evofitmeals.com',
  password: 'TestTrainer123!'
};

test('🔍 Production API: Trainer customers endpoint includes invited customers', async ({ page, request }) => {
  console.log('\n🔍 Testing production API directly...\n');
  
  // Step 1: Login to get session cookie
  await page.goto(`${PRODUCTION_URL}/login`);
  await page.fill('input[type="email"]', TRAINER_CREDENTIALS.email);
  await page.fill('input[type="password"]', TRAINER_CREDENTIALS.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/trainer', { timeout: 10000 });
  
  console.log('✅ Authenticated as trainer');
  
  // Step 2: Get session cookie
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find(c => c.name === 'connect.sid');
  
  if (sessionCookie) {
    // Step 3: Call the customers API
    const response = await request.get(`${PRODUCTION_URL}/api/trainer/customers`, {
      headers: {
        'Cookie': `${sessionCookie.name}=${sessionCookie.value}`
      }
    });
    
    expect(response.status()).toBe(200);
    console.log('✅ API responded successfully (200)');
    
    const data = await response.json();
    console.log(`📊 API returned ${data.total || 0} customer(s)`);
    
    // Step 4: Verify test customer is included
    const testCustomerEmail = 'customer.test@evofitmeals.com';
    const hasTestCustomer = data.customers?.some((c: any) => c.email === testCustomerEmail);
    
    if (hasTestCustomer) {
      console.log(`✅ SUCCESS: Customer ${testCustomerEmail} is returned by production API`);
      
      // Get customer details
      const testCustomer = data.customers.find((c: any) => c.email === testCustomerEmail);
      console.log(`📋 Customer details:`, {
        email: testCustomer.email,
        id: testCustomer.id,
        role: testCustomer.role,
        hasMealPlan: testCustomer.hasMealPlan
      });
      
      expect(hasTestCustomer).toBeTruthy();
    } else {
      console.log(`❌ Customer ${testCustomerEmail} NOT found in API response`);
      console.log('Available customers:');
      data.customers?.forEach((c: any) => {
        console.log(`  - ${c.email} (${c.id})`);
      });
      
      throw new Error(`Customer ${testCustomerEmail} not found in API response`);
    }
  } else {
    throw new Error('No session cookie found - authentication failed');
  }
  
  console.log('\n🎉 PRODUCTION API VERIFICATION SUCCESSFUL');
});