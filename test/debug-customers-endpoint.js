/**
 * Debug Customers Endpoint Response
 */

const BASE_URL = 'http://localhost:4000';

async function debugCustomersEndpoint() {
  console.log('🔍 Debugging Trainer Customers Endpoint');
  console.log('=' .repeat(40));

  try {
    // Step 1: Authenticate trainer
    console.log('\n1️⃣ Authenticating trainer...');
    const trainerAuth = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'trainer.test@evofitmeals.com',
        password: 'TestTrainer123!'
      })
    });

    if (!trainerAuth.ok) {
      const error = await trainerAuth.text();
      throw new Error(`Authentication failed: ${trainerAuth.status} - ${error}`);
    }

    const authData = await trainerAuth.json();
    const token = authData.data.accessToken;
    console.log(`   ✅ Authenticated successfully`);

    // Step 2: Call customers endpoint
    console.log('\n2️⃣ Calling customers endpoint...');
    const customersResponse = await fetch(`${BASE_URL}/api/trainer/customers`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const customersData = await customersResponse.json();
    console.log(`   Status: ${customersResponse.status}`);
    console.log(`   Response:`, JSON.stringify(customersData, null, 2));

    if (customersResponse.ok) {
      // Analyze the response structure
      if (customersData.customers) {
        console.log(`\n📊 Analysis:`);
        console.log(`   - Response has 'customers' property`);
        console.log(`   - Customer count: ${customersData.customers.length}`);

        if (customersData.customers.length > 0) {
          console.log(`   - First customer:`, JSON.stringify(customersData.customers[0], null, 2));
        }
      } else if (Array.isArray(customersData)) {
        console.log(`\n📊 Analysis:`);
        console.log(`   - Response is direct array`);
        console.log(`   - Customer count: ${customersData.length}`);
      } else {
        console.log(`\n📊 Analysis:`);
        console.log(`   - Unexpected response structure`);
        console.log(`   - Keys:`, Object.keys(customersData));
      }
    }

  } catch (error) {
    console.error('\n❌ Debug failed:', error.message);
  }
}

debugCustomersEndpoint();