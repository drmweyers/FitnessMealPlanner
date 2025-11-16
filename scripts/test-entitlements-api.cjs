#!/usr/bin/env node
/**
 * Test Entitlements API Response
 *
 * Verifies that /api/entitlements returns the complete data structure
 * required by the frontend SubscriptionOverview component.
 */

const http = require('http');

const requiredFields = [
  'tier',
  'status',
  'currentPeriodEnd',
  'cancelAtPeriodEnd',
  'limits.customers.max',
  'limits.customers.used',
  'limits.customers.percentage',
  'limits.mealPlans.max',
  'limits.mealPlans.used',
  'limits.mealPlans.percentage'
];

console.log('🧪 Testing /api/entitlements endpoint...\n');

// Note: This will fail with 401 if no session cookie is provided
// This test just verifies the API is reachable
const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/entitlements',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`📡 Response Status: ${res.statusCode}\n`);

    if (res.statusCode === 401) {
      console.log('⚠️  Expected 401: Authentication required (this is correct behavior)');
      console.log('✅ API endpoint is reachable and responding');
      console.log('\n💡 To test with authentication:');
      console.log('   1. Login as trainer at http://localhost:4000/login');
      console.log('   2. Open DevTools → Network → Copy request headers');
      console.log('   3. Use the Cookie header in curl or Postman');
      return;
    }

    try {
      const response = JSON.parse(data);
      console.log('📦 Response Data:');
      console.log(JSON.stringify(response, null, 2));
      console.log('\n🔍 Checking required fields...\n');

      let allFieldsPresent = true;

      requiredFields.forEach(field => {
        const fieldParts = field.split('.');
        let value = response;
        let exists = true;

        for (const part of fieldParts) {
          if (value && typeof value === 'object' && part in value) {
            value = value[part];
          } else {
            exists = false;
            break;
          }
        }

        const status = exists ? '✅' : '❌';
        console.log(`${status} ${field}: ${exists ? value : 'MISSING'}`);

        if (!exists) allFieldsPresent = false;
      });

      console.log('\n' + '='.repeat(50));
      if (allFieldsPresent) {
        console.log('✅ ALL REQUIRED FIELDS PRESENT');
        console.log('🎉 Billing page should now render correctly!');
      } else {
        console.log('❌ MISSING REQUIRED FIELDS');
        console.log('⚠️  Billing page may not render correctly');
      }
      console.log('='.repeat(50) + '\n');

    } catch (error) {
      console.error('❌ Failed to parse response:', error);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  console.log('\n💡 Make sure the dev server is running:');
  console.log('   docker-compose --profile dev up -d');
});

req.end();
