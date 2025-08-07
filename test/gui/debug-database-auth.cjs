/**
 * Database Authentication Debug Script
 * 
 * This script directly tests the database and password hashing
 */

console.log('🔍 Starting database authentication debug...');

// Test if we can create a test user and login
async function testDirectAuth() {
  const baseUrl = 'http://localhost:4000';
  
  console.log('\n1. Attempting to create a test user via API...');
  
  // Try to register a new test user
  const testUser = {
    email: 'test@example.com',
    password: 'Test123!@#',
    role: 'customer'
  };
  
  try {
    const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    
    const registerResult = await registerResponse.text();
    console.log(`Register response status: ${registerResponse.status}`);
    console.log(`Register response: ${registerResult}`);
    
    if (registerResponse.status === 201 || registerResponse.status === 200) {
      console.log('✅ Test user created successfully');
      
      // Now try to login with the test user
      console.log('\n2. Testing login with newly created user...');
      
      const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password
        })
      });
      
      const loginResult = await loginResponse.text();
      console.log(`Login response status: ${loginResponse.status}`);
      console.log(`Login response: ${loginResult}`);
      
      if (loginResponse.status === 200) {
        console.log('✅ Login with test user successful!');
        console.log('🔍 This suggests the auth system works, but admin password may be wrong');
        
        const loginData = JSON.parse(loginResult);
        if (loginData.token) {
          console.log('✅ Token received for test user');
          
          // Test the meal plan generation with test user
          console.log('\n3. Testing meal plan generation with test user...');
          
          const mealPlanData = {
            days: 1,
            dailyCalorieTarget: 1500,
            mealsPerDay: 3,
            fitnessGoal: 'weight loss',
            clientName: 'Test Client'
          };
          
          const mealPlanResponse = await fetch(`${baseUrl}/api/meal-plan/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${loginData.token}`
            },
            body: JSON.stringify(mealPlanData)
          });
          
          console.log(`Meal plan generation status: ${mealPlanResponse.status}`);
          const mealPlanResult = await mealPlanResponse.text();
          console.log(`Meal plan response: ${mealPlanResult.substring(0, 300)}...`);
          
          if (mealPlanResponse.status === 200) {
            console.log('🎉 MEAL PLAN GENERATION WORKS!');
            console.log('🔍 The issue is likely authentication, not the generate plan buttons');
          }
        }
      } else {
        console.log('❌ Login with test user failed');
        console.log('🔍 This suggests a broader auth system issue');
      }
    } else {
      console.log('❌ Test user creation failed');
      console.log('🔍 Checking if registration is disabled or has issues');
    }
    
  } catch (error) {
    console.error('🚨 Error during test:', error.message);
  }
  
  // Additional debugging: check if we can create users with different roles
  console.log('\n4. Testing trainer user creation...');
  
  const trainerUser = {
    email: 'trainer-test@example.com',
    password: 'Trainer123!@#',
    role: 'trainer'
  };
  
  try {
    const trainerResponse = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trainerUser)
    });
    
    console.log(`Trainer register status: ${trainerResponse.status}`);
    
    if (trainerResponse.ok) {
      console.log('✅ Trainer registration works');
      
      // Try to login as trainer
      const trainerLogin = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trainerUser.email,
          password: trainerUser.password
        })
      });
      
      console.log(`Trainer login status: ${trainerLogin.status}`);
      
      if (trainerLogin.ok) {
        console.log('✅ Trainer login works');
        console.log('🔍 CONCLUSION: Auth system works fine, admin password is wrong');
      }
    }
    
  } catch (error) {
    console.log('❌ Trainer test failed:', error.message);
  }
  
  console.log('\n🏁 Database authentication debug complete');
  
  console.log('\n📋 SUMMARY:');
  console.log('- If test user login worked: Auth system is fine, admin password issue');
  console.log('- If test user login failed: Broader auth system problem');
  console.log('- If meal plan generation worked: Generate buttons should work once auth is fixed');
}

testDirectAuth();