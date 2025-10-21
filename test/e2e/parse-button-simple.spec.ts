import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@fitmeal.pro';
const ADMIN_PASSWORD = 'AdminPass123';
const BASE_URL = 'http://localhost:4000';

test.describe('Parse Button Test - Simplified', () => {

  test('Parse AI Button - Direct Network Test', async ({ page }) => {
    console.log('\n=== PARSE BUTTON NETWORK TEST ===\n');

    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*\/admin/, { timeout: 10000 });
    console.log('✅ Logged in as admin');

    // Go to Meal Plan Builder tab
    await page.click('[data-testid="admin-tab-meal-plans"]');
    await page.waitForTimeout(1000);
    console.log('✅ Navigated to Meal Plan Builder tab');

    // Track network requests
    const requests: any[] = [];
    const responses: any[] = [];

    page.on('request', request => {
      if (request.url().includes('parse-natural-language')) {
        requests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
          body: request.postData()
        });
        console.log('\n📤 REQUEST SENT:');
        console.log('   URL:', request.url());
        console.log('   Method:', request.method());
        console.log('   Body:', request.postData());
      }
    });

    page.on('response', async response => {
      if (response.url().includes('parse-natural-language')) {
        const status = response.status();
        let body: any;
        try {
          body = await response.json();
        } catch {
          body = await response.text();
        }
        responses.push({ status, body });
        console.log('\n📥 RESPONSE RECEIVED:');
        console.log('   Status:', status);
        console.log('   Body:', JSON.stringify(body, null, 2));
      }
    });

    // Listen for console logs
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Parse') || text.includes('parse') || text.includes('error') || text.includes('Error')) {
        console.log('🖥️ Browser Console:', text);
      }
    });

    // Find and fill the textarea
    const textarea = page.locator('#natural-language');
    await expect(textarea).toBeVisible({ timeout: 5000 });
    console.log('✅ Natural language textarea found');

    const testInput = 'Create a 7-day weight loss plan with 3 meals per day and 2000 calories';
    await textarea.fill(testInput);
    console.log('✅ Filled textarea with:', testInput);

    // Find the Parse AI button
    const parseButton = page.locator('button:has-text("Parse with AI")');
    await expect(parseButton).toBeVisible();
    console.log('✅ Parse AI button found');

    // Check if button is enabled
    const isDisabled = await parseButton.isDisabled();
    console.log('   Button disabled?', isDisabled);

    // Click Parse AI button
    await parseButton.click();
    console.log('🖱️ Clicked Parse AI button');

    // Wait for response
    await page.waitForTimeout(5000);

    // Report results
    console.log('\n📊 RESULTS:');
    console.log(`   Requests sent: ${requests.length}`);
    console.log(`   Responses received: ${responses.length}`);

    if (requests.length === 0) {
      console.log('\n❌ FAILURE: No API request was made!');
      console.log('   This means the button click did NOT trigger the mutation');
    } else {
      console.log('\n✅ API request was made');
      console.log('   Request details:', JSON.stringify(requests[0], null, 2));
    }

    if (responses.length === 0) {
      console.log('\n⚠️ WARNING: No response received (check backend logs)');
    } else {
      const response = responses[0];
      console.log('\n📨 Response details:');
      console.log(`   Status: ${response.status}`);
      console.log(`   Body:`, JSON.stringify(response.body, null, 2));

      if (response.status === 200) {
        console.log('\n✅ SUCCESS: Parse API returned 200 OK');

        // Check if form was populated
        const planNameValue = await page.locator('input[name="planName"]').inputValue();
        const daysValue = await page.locator('input[name="days"]').inputValue();

        console.log('\n📋 Form Values After Parse:');
        console.log(`   Plan Name: "${planNameValue}"`);
        console.log(`   Days: "${daysValue}"`);

        if (planNameValue || daysValue) {
          console.log('\n✅ SUCCESS: Form was populated!');
        } else {
          console.log('\n⚠️ WARNING: Form was NOT populated (check onSuccess handler)');
        }
      } else {
        console.log('\n❌ FAILURE: Parse API returned error');
      }
    }

    // Assertions
    expect(requests.length, 'Parse API should be called').toBeGreaterThan(0);
    expect(responses.length, 'Parse API should respond').toBeGreaterThan(0);
    expect(responses[0]?.status, 'Parse API should return 200').toBe(200);
  });
});
