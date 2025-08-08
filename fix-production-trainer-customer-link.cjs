#!/usr/bin/env node

/**
 * Fix Production Trainer-Customer Link Script
 * 
 * This script establishes the proper trainer-customer relationship
 * in the production environment by creating meal plans and assignments.
 */

const https = require('https');

const PRODUCTION_URL = 'https://evofitmeals.com';

// Account details from production
const TRAINER_ACCOUNT = {
  email: 'trainer.test@evofitmeals.com',
  password: 'TestTrainer123!',
  userId: '26589ba9-eea6-4db3-ac30-775206e4c9cb'
};

const CUSTOMER_ACCOUNT = {
  email: 'customer.test@evofitmeals.com', 
  password: 'TestCustomer123!',
  userId: '0267d066-6f76-42c1-8189-5b9cd6f70809'
};

/**
 * Make HTTPS request
 */
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const responseData = body ? JSON.parse(body) : {};
          resolve({ statusCode: res.statusCode, data: responseData, headers: res.headers });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: { body }, headers: res.headers });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

/**
 * Login to get JWT token
 */
async function login(email, password) {
  const options = {
    hostname: 'evofitmeals.com',
    port: 443,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Production-Link-Fixer/1.0'
    },
    rejectUnauthorized: false
  };

  try {
    console.log(`🔐 Logging in as ${email}...`);
    const response = await makeRequest(options, { email, password });
    
    if (response.statusCode === 200 && response.data.data && response.data.data.accessToken) {
      console.log(`✅ Login successful for ${email}`);
      return {
        success: true,
        token: response.data.data.accessToken,
        user: response.data.data.user
      };
    } else {
      console.log(`❌ Login failed for ${email}:`, response.data);
      return { success: false, error: response.data };
    }
  } catch (error) {
    console.log(`❌ Login error for ${email}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Create meal plan for customer
 */
async function createMealPlanForCustomer(trainerToken, customerId) {
  const mealPlanData = {
    name: 'QA Test Meal Plan - 7 Day Program',
    description: 'Comprehensive test meal plan linking trainer to customer in production',
    customerId: customerId,
    meals: [
      {
        day: 'Monday',
        breakfast: {
          name: 'Protein Overnight Oats',
          ingredients: ['Oats', 'Greek yogurt', 'Protein powder', 'Berries', 'Honey'],
          calories: 350,
          protein: 25,
          carbs: 45,
          fat: 8
        },
        lunch: {
          name: 'Grilled Chicken Salad',
          ingredients: ['Chicken breast', 'Mixed greens', 'Avocado', 'Cherry tomatoes', 'Olive oil'],
          calories: 420,
          protein: 35,
          carbs: 12,
          fat: 28
        },
        dinner: {
          name: 'Baked Salmon with Quinoa',
          ingredients: ['Salmon fillet', 'Quinoa', 'Broccoli', 'Lemon', 'Herbs'],
          calories: 480,
          protein: 40,
          carbs: 35,
          fat: 22
        }
      }
    ]
  };

  const options = {
    hostname: 'evofitmeals.com',
    port: 443,
    path: '/api/meal-plans',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${trainerToken}`,
      'User-Agent': 'Production-Link-Fixer/1.0'
    },
    rejectUnauthorized: false
  };

  try {
    console.log(`📋 Creating meal plan for customer ${customerId}...`);
    const response = await makeRequest(options, mealPlanData);
    
    if (response.statusCode === 201 || response.statusCode === 200) {
      console.log(`✅ Meal plan created successfully`);
      return { success: true, mealPlan: response.data };
    } else {
      console.log(`❌ Failed to create meal plan:`, response.data);
      return { success: false, error: response.data };
    }
  } catch (error) {
    console.log(`❌ Error creating meal plan:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Try alternative approach - use invitation system
 */
async function createInvitation(trainerToken, customerEmail) {
  const invitationData = {
    customerEmail: customerEmail,
    message: 'Test customer link for QA purposes'
  };

  const options = {
    hostname: 'evofitmeals.com',
    port: 443,
    path: '/api/invitations',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${trainerToken}`,
      'User-Agent': 'Production-Link-Fixer/1.0'
    },
    rejectUnauthorized: false
  };

  try {
    console.log(`📧 Creating invitation for ${customerEmail}...`);
    const response = await makeRequest(options, invitationData);
    
    if (response.statusCode === 201 || response.statusCode === 200) {
      console.log(`✅ Invitation created successfully`);
      return { success: true, invitation: response.data };
    } else {
      console.log(`❌ Failed to create invitation:`, response.data);
      return { success: false, error: response.data };
    }
  } catch (error) {
    console.log(`❌ Error creating invitation:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Check trainer's customers
 */
async function checkTrainerCustomers(trainerToken) {
  const options = {
    hostname: 'evofitmeals.com',
    port: 443,
    path: '/api/customers', // or /api/trainer/customers
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${trainerToken}`,
      'User-Agent': 'Production-Link-Fixer/1.0'
    },
    rejectUnauthorized: false
  };

  try {
    console.log(`👥 Checking trainer's customers...`);
    const response = await makeRequest(options);
    
    console.log(`📊 Customer check response (${response.statusCode}):`, response.data);
    return { success: true, customers: response.data };
  } catch (error) {
    console.log(`❌ Error checking customers:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🔧 Production Trainer-Customer Link Fixer');
  console.log('=' .repeat(50));
  console.log(`🎯 Target: Link trainer ${TRAINER_ACCOUNT.email} to customer ${CUSTOMER_ACCOUNT.email}`);
  console.log('');

  // Step 1: Login as trainer
  const trainerLogin = await login(TRAINER_ACCOUNT.email, TRAINER_ACCOUNT.password);
  if (!trainerLogin.success) {
    console.log('💥 Failed to login as trainer. Cannot proceed.');
    return;
  }

  // Step 2: Login as customer (for verification)
  const customerLogin = await login(CUSTOMER_ACCOUNT.email, CUSTOMER_ACCOUNT.password);
  if (!customerLogin.success) {
    console.log('⚠️  Customer login failed, but continuing...');
  }

  // Step 3: Check current customers
  await checkTrainerCustomers(trainerLogin.token);

  // Step 4: Try creating invitation
  console.log('\n🔄 Attempting to establish trainer-customer relationship...');
  const invitationResult = await createInvitation(trainerLogin.token, CUSTOMER_ACCOUNT.email);
  
  // Step 5: Try creating meal plan
  const mealPlanResult = await createMealPlanForCustomer(trainerLogin.token, CUSTOMER_ACCOUNT.userId);

  // Step 6: Final verification
  console.log('\n🔍 Final verification...');
  await checkTrainerCustomers(trainerLogin.token);

  // Report results
  console.log('\n' + '='.repeat(50));
  console.log('📋 TRAINER-CUSTOMER LINK REPORT');
  console.log('='.repeat(50));
  
  console.log(`✅ Trainer Login: ${trainerLogin.success ? 'SUCCESS' : 'FAILED'}`);
  console.log(`${customerLogin.success ? '✅' : '⚠️ '} Customer Login: ${customerLogin.success ? 'SUCCESS' : 'FAILED'}`);
  console.log(`${invitationResult.success ? '✅' : '❌'} Invitation Creation: ${invitationResult.success ? 'SUCCESS' : 'FAILED'}`);
  console.log(`${mealPlanResult.success ? '✅' : '❌'} Meal Plan Creation: ${mealPlanResult.success ? 'SUCCESS' : 'FAILED'}`);

  if (invitationResult.success || mealPlanResult.success) {
    console.log('\n🎉 SUCCESS: Trainer-customer relationship should now be established!');
    console.log('\n🧪 VERIFICATION STEPS:');
    console.log('1. Login as trainer: trainer.test@evofitmeals.com');
    console.log('2. Check customers/clients section');
    console.log('3. Verify customer.test@evofitmeals.com appears in the list');
    console.log('4. Login as customer and verify trainer connection');
  } else {
    console.log('\n⚠️  PARTIAL SUCCESS: Some operations failed');
    console.log('   Manual verification may be needed in the production interface');
  }

  console.log('\n🌐 Production URL: https://evofitmeals.com');
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Script execution failed:', error);
    process.exit(1);
  });
}