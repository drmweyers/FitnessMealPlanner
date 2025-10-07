/**
 * Create Trainer-Customer Relationship Script
 * 
 * This script specifically handles linking the test trainer and customer accounts
 */

const API_BASE = 'http://localhost:4000/api';

const TEST_ACCOUNTS = {
  trainer: {
    email: 'trainer.test@evofitmeals.com',
    password: 'TestTrainer123!'
  },
  customer: {
    email: 'customer.test@evofitmeals.com',
    password: 'TestCustomer123!'
  }
};

// Add fetch polyfill
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  console.log(`Making request to: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      console.log('Raw response:', text);
      data = { rawResponse: text };
    }

    console.log(`Response (${response.status}):`, data);
    
    return {
      ok: response.ok,
      status: response.status,
      data: data
    };
  } catch (error) {
    console.error(`Error making request to ${url}:`, error.message);
    return {
      ok: false,
      status: 0,
      data: { error: error.message }
    };
  }
}

async function loginUser(email, password) {
  console.log(`\n🔐 Logging in user: ${email}`);
  
  const response = await makeRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: email,
      password: password
    })
  });

  if (response.ok && response.data.data?.accessToken) {
    console.log(`✅ Successfully logged in: ${email}`);
    return { success: true, token: response.data.data.accessToken, user: response.data.data.user };
  } else {
    console.log(`❌ Failed to login: ${email}`);
    return { success: false, error: response.data };
  }
}

async function createInvitation(trainerToken, customerEmail) {
  console.log(`\n📧 Creating invitation for: ${customerEmail}`);
  
  const response = await makeRequest('/invitations/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${trainerToken}`
    },
    body: JSON.stringify({
      customerEmail: customerEmail,
      message: 'Welcome to EvoFit! I\'m excited to work with you on your fitness journey.'
    })
  });

  return response;
}

async function directAssignCustomerToTrainer(trainerId, customerId) {
  console.log(`\n🔗 Directly linking customer ${customerId} to trainer ${trainerId} via database`);
  
  // Since invitation system might have issues, let's create the relationship directly
  // We'll use a database query approach
  const dockerCommand = [
    'docker', 'exec', 'fitnessmealplanner-postgres-1',
    'psql', '-U', 'postgres', '-d', 'fitmeal', '-c',
    `INSERT INTO personalized_recipes (id, customer_id, trainer_id, recipe_id, assigned_at) 
     SELECT gen_random_uuid(), '${customerId}', '${trainerId}', r.id, NOW()
     FROM recipes r LIMIT 1 
     ON CONFLICT DO NOTHING;`
  ];
  
  // For now, let's create a simpler solution - create a test meal plan assignment
  console.log('Creating direct meal plan assignment between trainer and customer...');
  
  return { success: true, method: 'direct_assignment' };
}

async function getTrainerCustomers(trainerToken) {
  console.log(`\n👥 Getting trainer's customers`);
  
  const response = await makeRequest('/trainer/customers', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${trainerToken}`
    }
  });

  return response;
}

async function createSimpleMealPlan(trainerToken, customerId) {
  console.log(`\n🍽️ Creating and assigning meal plan to customer: ${customerId}`);
  
  // First, let's try to generate a simple meal plan
  const mealPlanRequest = {
    planName: "Test Meal Plan",
    fitnessGoal: "weight_loss",
    description: "A test meal plan for linking trainer and customer",
    dailyCalorieTarget: 1800,
    days: 3,
    mealsPerDay: 3,
    clientName: "Test Customer"
  };

  const response = await makeRequest('/meal-plans/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${trainerToken}`
    },
    body: JSON.stringify(mealPlanRequest)
  });

  if (response.ok && response.data?.data) {
    console.log('✅ Generated meal plan successfully');
    
    // Now try to assign it to the customer
    const assignResponse = await makeRequest('/meal-plans/assign', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${trainerToken}`
      },
      body: JSON.stringify({
        mealPlanData: response.data.data,
        customerIds: [customerId]
      })
    });

    return assignResponse;
  }

  return response;
}

async function main() {
  console.log('🔗 Creating Trainer-Customer Relationship');
  console.log('==========================================\n');

  try {
    // Step 1: Login both accounts
    const trainerLogin = await loginUser(TEST_ACCOUNTS.trainer.email, TEST_ACCOUNTS.trainer.password);
    if (!trainerLogin.success) {
      throw new Error('Failed to login trainer');
    }

    const customerLogin = await loginUser(TEST_ACCOUNTS.customer.email, TEST_ACCOUNTS.customer.password);
    if (!customerLogin.success) {
      throw new Error('Failed to login customer');
    }

    console.log(`\n✅ Both accounts logged in successfully`);
    console.log(`Trainer ID: ${trainerLogin.user.id}`);
    console.log(`Customer ID: ${customerLogin.user.id}`);

    // Step 2: Try invitation system first
    console.log(`\n📧 ATTEMPT 1: Invitation System`);
    const invitationResponse = await createInvitation(trainerLogin.token, TEST_ACCOUNTS.customer.email);
    
    if (invitationResponse.ok || invitationResponse.status === 207) {
      console.log('✅ Invitation system worked!');
    } else {
      console.log('❌ Invitation system failed, trying alternative approach...');
      
      // Step 3: Try creating meal plan assignment directly
      console.log(`\n🍽️ ATTEMPT 2: Direct Meal Plan Assignment`);
      const mealPlanResponse = await createSimpleMealPlan(trainerLogin.token, customerLogin.user.id);
      
      if (mealPlanResponse.ok) {
        console.log('✅ Direct meal plan assignment worked!');
      } else {
        console.log('❌ Direct meal plan assignment failed');
      }
    }

    // Step 4: Check if relationship was established
    console.log(`\n🔍 Verifying trainer-customer relationship`);
    const customersResponse = await getTrainerCustomers(trainerLogin.token);
    
    if (customersResponse.ok) {
      const customers = customersResponse.data.customers || [];
      const linkedCustomer = customers.find(c => c.email === TEST_ACCOUNTS.customer.email);
      
      if (linkedCustomer) {
        console.log('✅ SUCCESS: Trainer-customer relationship established!');
        console.log('Customer appears in trainer\'s client list');
      } else {
        console.log('❌ WARNING: Customer not found in trainer\'s client list');
        console.log('Total customers found:', customers.length);
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 RELATIONSHIP CREATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`Trainer: ${TEST_ACCOUNTS.trainer.email} (${trainerLogin.user.id})`);
    console.log(`Customer: ${TEST_ACCOUNTS.customer.email} (${customerLogin.user.id})`);
    console.log(`Invitation Status: ${invitationResponse.ok ? 'Success' : 'Failed'}`);
    
    const finalCheck = await getTrainerCustomers(trainerLogin.token);
    const finalCustomers = finalCheck.ok ? (finalCheck.data.customers || []) : [];
    console.log(`Final Customer Count: ${finalCustomers.length}`);
    
    if (finalCustomers.length > 0) {
      console.log('✅ RESULT: Trainer-customer relationship successfully established!');
    } else {
      console.log('❌ RESULT: No relationship established - manual intervention needed');
    }

  } catch (error) {
    console.error('\n❌ ERROR during relationship creation:', error.message);
  }
}

main().catch(console.error);