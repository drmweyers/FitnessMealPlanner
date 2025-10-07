#!/usr/bin/env node

/**
 * Fix Production Trainer-Customer Link Script (Corrected)
 * 
 * This script establishes the proper trainer-customer relationship
 * by creating meal plan assignments using the correct API endpoints.
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
      'User-Agent': 'Production-Link-Fixer-v2/1.0'
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
 * Create meal plan assignment to establish trainer-customer relationship
 */
async function assignMealPlanToCustomer(trainerToken, customerId) {
  const mealPlanData = {
    planName: 'QA Test Meal Plan - Production Link',
    description: 'Test meal plan to establish trainer-customer relationship in production',
    fitnessGoal: 'weight_loss',
    days: 7,
    dailyCalorieTarget: 1800,
    meals: [
      {
        day: 1,
        dayName: 'Monday',
        meals: [
          {
            mealType: 'breakfast',
            name: 'Protein Overnight Oats',
            description: 'High-protein breakfast to start the day',
            ingredients: ['Rolled oats', 'Greek yogurt', 'Protein powder', 'Berries', 'Honey'],
            instructions: [
              'Mix oats with Greek yogurt',
              'Add protein powder and mix well', 
              'Top with berries and drizzle honey',
              'Refrigerate overnight'
            ],
            nutrition: {
              calories: 350,
              protein: 25,
              carbs: 45,
              fat: 8,
              fiber: 6
            }
          },
          {
            mealType: 'lunch',
            name: 'Grilled Chicken Salad',
            description: 'Fresh salad with lean protein',
            ingredients: ['Chicken breast', 'Mixed greens', 'Avocado', 'Cherry tomatoes', 'Olive oil'],
            instructions: [
              'Grill chicken breast until cooked through',
              'Mix greens with cherry tomatoes',
              'Slice avocado and add to salad',
              'Top with grilled chicken',
              'Drizzle with olive oil'
            ],
            nutrition: {
              calories: 420,
              protein: 35,
              carbs: 12,
              fat: 28,
              fiber: 8
            }
          },
          {
            mealType: 'dinner',
            name: 'Baked Salmon with Quinoa',
            description: 'Omega-3 rich dinner with complete protein',
            ingredients: ['Salmon fillet', 'Quinoa', 'Broccoli', 'Lemon', 'Herbs'],
            instructions: [
              'Cook quinoa according to package directions',
              'Season salmon with herbs and lemon',
              'Bake salmon at 400°F for 12-15 minutes',
              'Steam broccoli until tender',
              'Serve salmon over quinoa with broccoli'
            ],
            nutrition: {
              calories: 480,
              protein: 40,
              carbs: 35,
              fat: 22,
              fiber: 5
            }
          }
        ],
        totalNutrition: {
          calories: 1250,
          protein: 100,
          carbs: 92,
          fat: 58,
          fiber: 19
        }
      }
    ],
    totalNutrition: {
      calories: 1250,
      protein: 100,
      carbs: 92,
      fat: 58,
      fiber: 19
    }
  };

  const options = {
    hostname: 'evofitmeals.com',
    port: 443,
    path: `/api/trainer/customers/${customerId}/meal-plans`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${trainerToken}`,
      'User-Agent': 'Production-Link-Fixer-v2/1.0'
    },
    rejectUnauthorized: false
  };

  try {
    console.log(`📋 Creating meal plan assignment for customer ${customerId}...`);
    const response = await makeRequest(options, { mealPlanData });
    
    if (response.statusCode === 201 || response.statusCode === 200) {
      console.log(`✅ Meal plan assigned successfully`);
      return { success: true, assignment: response.data };
    } else {
      console.log(`❌ Failed to assign meal plan:`, response.data);
      return { success: false, error: response.data };
    }
  } catch (error) {
    console.log(`❌ Error assigning meal plan:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Check trainer's customers using correct endpoint
 */
async function checkTrainerCustomers(trainerToken) {
  const options = {
    hostname: 'evofitmeals.com',
    port: 443,
    path: '/api/trainer/customers',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${trainerToken}`,
      'User-Agent': 'Production-Link-Fixer-v2/1.0'
    },
    rejectUnauthorized: false
  };

  try {
    console.log(`👥 Checking trainer's customers...`);
    const response = await makeRequest(options);
    
    if (response.statusCode === 200 && response.data.customers) {
      console.log(`📊 Found ${response.data.customers.length} customers`);
      response.data.customers.forEach(customer => {
        console.log(`   - ${customer.email} (ID: ${customer.id})`);
      });
      return { success: true, customers: response.data.customers };
    } else {
      console.log(`📊 Customer check response (${response.statusCode}):`, response.data.body || response.data);
      return { success: false, customers: [] };
    }
  } catch (error) {
    console.log(`❌ Error checking customers:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send invitation using correct endpoint
 */
async function sendInvitation(trainerToken, customerEmail) {
  const invitationData = {
    customerEmail: customerEmail,
    message: 'Test invitation to link customer to trainer in production'
  };

  const options = {
    hostname: 'evofitmeals.com',
    port: 443,
    path: '/api/invitations/send',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${trainerToken}`,
      'User-Agent': 'Production-Link-Fixer-v2/1.0'
    },
    rejectUnauthorized: false
  };

  try {
    console.log(`📧 Sending invitation to ${customerEmail}...`);
    const response = await makeRequest(options, invitationData);
    
    if (response.statusCode === 201 || response.statusCode === 207) {
      console.log(`✅ Invitation sent successfully`);
      return { success: true, invitation: response.data };
    } else if (response.statusCode === 409 && response.data.code === 'USER_EXISTS') {
      console.log(`ℹ️  User already exists - this is expected for existing test accounts`);
      return { success: true, existing: true };
    } else {
      console.log(`❌ Failed to send invitation:`, response.data);
      return { success: false, error: response.data };
    }
  } catch (error) {
    console.log(`❌ Error sending invitation:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🔧 Production Trainer-Customer Link Fixer v2.0');
  console.log('=' .repeat(50));
  console.log(`🎯 Target: Link trainer ${TRAINER_ACCOUNT.email} to customer ${CUSTOMER_ACCOUNT.email}`);
  console.log(`📋 Using proper API endpoints: /api/trainer/customers and /api/invitations/send`);
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

  // Step 3: Check current customers (before)
  console.log('\n🔍 Checking trainer customers BEFORE establishing relationship...');
  const customersBefore = await checkTrainerCustomers(trainerLogin.token);

  // Step 4: Assign meal plan to establish relationship
  console.log('\n🔄 Establishing trainer-customer relationship via meal plan assignment...');
  const assignmentResult = await assignMealPlanToCustomer(trainerLogin.token, CUSTOMER_ACCOUNT.userId);

  // Step 5: Send invitation (alternative method)
  console.log('\n📧 Also sending invitation (alternative method)...');
  const invitationResult = await sendInvitation(trainerLogin.token, CUSTOMER_ACCOUNT.email);

  // Step 6: Check customers after (final verification)
  console.log('\n🔍 Checking trainer customers AFTER establishing relationship...');
  const customersAfter = await checkTrainerCustomers(trainerLogin.token);

  // Report results
  console.log('\n' + '='.repeat(50));
  console.log('📋 TRAINER-CUSTOMER RELATIONSHIP ESTABLISHMENT REPORT');
  console.log('='.repeat(50));
  
  console.log(`✅ Trainer Login: SUCCESS`);
  console.log(`${customerLogin.success ? '✅' : '⚠️ '} Customer Login: ${customerLogin.success ? 'SUCCESS' : 'FAILED'}`);
  console.log(`${assignmentResult.success ? '✅' : '❌'} Meal Plan Assignment: ${assignmentResult.success ? 'SUCCESS' : 'FAILED'}`);
  console.log(`${invitationResult.success ? '✅' : '❌'} Invitation Sending: ${invitationResult.success ? 'SUCCESS' : 'FAILED'}`);
  
  console.log(`\n📊 Customers Before: ${customersBefore.customers ? customersBefore.customers.length : 0}`);
  console.log(`📊 Customers After: ${customersAfter.customers ? customersAfter.customers.length : 0}`);

  const relationshipEstablished = assignmentResult.success || 
    (customersAfter.customers && customersAfter.customers.some(c => c.id === CUSTOMER_ACCOUNT.userId));

  if (relationshipEstablished) {
    console.log('\n🎉 SUCCESS: Trainer-customer relationship established!');
    console.log('\n🧪 VERIFICATION INSTRUCTIONS:');
    console.log('1. Login as trainer: trainer.test@evofitmeals.com');
    console.log('2. Check "My Customers" or "Clients" section');
    console.log('3. Verify customer.test@evofitmeals.com appears in the list');
    console.log('4. Login as customer and verify meal plan is visible');
    
    if (customersAfter.customers) {
      console.log('\n👥 Current Customer List:');
      customersAfter.customers.forEach(customer => {
        const isTestCustomer = customer.id === CUSTOMER_ACCOUNT.userId ? '🎯' : '  ';
        console.log(`${isTestCustomer} ${customer.email} (ID: ${customer.id})`);
      });
    }
  } else {
    console.log('\n⚠️  RELATIONSHIP NOT CONFIRMED');
    console.log('   The API operations completed, but relationship verification is inconclusive');
    console.log('   Please check the trainer dashboard manually');
  }

  console.log('\n🌐 Production URL: https://evofitmeals.com');
  console.log('\n✅ Script execution completed');
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Script execution failed:', error);
    process.exit(1);
  });
}