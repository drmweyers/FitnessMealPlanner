/**
 * Authentication Debug Script
 * 
 * This script checks the auth system more thoroughly
 */

async function debugAuthentication() {
  console.log('🔍 Starting authentication debug...');
  
  const baseUrl = 'http://localhost:4000';
  
  try {
    // Test 1: Check if auth endpoint exists and returns proper error format
    console.log('\n1. Testing auth endpoint response format...');
    
    const testData = {
      email: 'nonexistent@example.com',
      password: 'wrongpassword'
    };
    
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    
    const responseText = await response.text();
    console.log(`Response status: ${response.status}`);
    console.log(`Response body: ${responseText}`);
    
    // Test 2: Try with the admin credentials
    console.log('\n2. Testing admin credentials...');
    
    const adminData = {
      email: 'admin@fitmeal.pro',
      password: 'Admin123!@#'
    };
    
    const adminResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adminData)
    });
    
    const adminResponseText = await adminResponse.text();
    console.log(`Admin response status: ${adminResponse.status}`);
    console.log(`Admin response body: ${adminResponseText}`);
    
    // Test 3: Check if it's a JSON parsing issue
    console.log('\n3. Checking JSON parsing...');
    
    try {
      const parsedResponse = JSON.parse(adminResponseText);
      console.log('✅ Response is valid JSON');
      console.log('Response object:', parsedResponse);
      
      if (parsedResponse.token) {
        console.log('✅ Token found in response');
        console.log('Token preview:', parsedResponse.token.substring(0, 50) + '...');
        
        // Test the token
        console.log('\n4. Testing token with protected endpoint...');
        
        const protectedResponse = await fetch(`${baseUrl}/api/user/profile`, {
          headers: { 'Authorization': `Bearer ${parsedResponse.token}` }
        });
        
        console.log(`Protected endpoint status: ${protectedResponse.status}`);
        const protectedText = await protectedResponse.text();
        console.log(`Protected response: ${protectedText.substring(0, 200)}...`);
        
      } else {
        console.log('❌ No token in successful response');
      }
      
    } catch (jsonError) {
      console.log('❌ Response is not valid JSON:', jsonError.message);
    }
    
    // Test 4: Check different endpoints
    console.log('\n5. Testing different auth endpoints...');
    
    const endpoints = [
      '/api/auth/login',
      '/auth/login',
      '/login'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const testResponse = await fetch(`${baseUrl}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(adminData)
        });
        
        console.log(`${endpoint}: ${testResponse.status}`);
        
      } catch (e) {
        console.log(`${endpoint}: ERROR - ${e.message}`);
      }
    }
    
    // Test 5: Check server health
    console.log('\n6. Server health check...');
    
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    console.log(`Health check status: ${healthResponse.status}`);
    
    if (healthResponse.ok) {
      const healthText = await healthResponse.text();
      console.log(`Health response: ${healthText}`);
    }
    
  } catch (error) {
    console.error('🚨 Debug failed:', error.message);
  }
  
  console.log('\n🏁 Authentication debug complete');
}

// Run the debug
debugAuthentication();