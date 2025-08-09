// Direct API validation test for Health Protocol endpoints
const https = require('https');
const http = require('http');

// Test configuration
const BASE_URL = 'http://localhost:4000';
const TEST_TRAINER_EMAIL = 'trainer.test@evofitmeals.com';
const TEST_TRAINER_PASSWORD = 'TestTrainer123!';

console.log('🚀 Starting API validation tests...\n');

// Helper function to make HTTP requests
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            headers: res.headers,
            data: data ? JSON.parse(data) : null
          };
          resolve(response);
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
            parseError: e.message
          });
        }
      });
    });

    req.on('error', reject);
    
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

// Test 1: Health check
async function testHealthCheck() {
  console.log('📍 Test 1: API Health Check');
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 4000,
      path: '/api/health',
      method: 'GET'
    });
    
    if (response.status === 200) {
      console.log('✅ API Health Check passed');
      return true;
    } else {
      console.log(`❌ API Health Check failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ API Health Check error: ${error.message}`);
    return false;
  }
}

// Test 2: Login and get session cookie
async function testLogin() {
  console.log('\n📍 Test 2: User Login');
  try {
    const loginData = {
      email: TEST_TRAINER_EMAIL,
      password: TEST_TRAINER_PASSWORD
    };

    const response = await makeRequest({
      hostname: 'localhost',
      port: 4000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, loginData);

    if (response.status === 200 && response.data.status === 'success') {
      console.log('✅ Login successful');
      
      // Extract JWT token
      const accessToken = response.data.data?.accessToken;
      if (accessToken) {
        console.log('✅ JWT token obtained');
        return accessToken;
      }
    }
    
    console.log(`❌ Login failed: ${response.status} - ${JSON.stringify(response.data)}`);
    return null;
  } catch (error) {
    console.log(`❌ Login error: ${error.message}`);
    return null;
  }
}

// Test 3: Generate Health Protocol
async function testProtocolGeneration(accessToken) {
  console.log('\n📍 Test 3: Health Protocol Generation');
  
  const protocolData = {
    name: 'Validation Test Longevity Protocol',
    description: 'Test longevity protocol for system validation',
    type: 'longevity',
    duration: 90,
    intensity: 'moderate',
    config: {
      protocolType: 'longevity',
      customerEmail: 'validation.test@example.com',
      age: 45,
      gender: 'male',
      weight: 180,
      height: '5\'10"',
      activityLevel: 'moderate',
      healthConcerns: ['cardiovascular', 'cognitive', 'metabolic']
    },
    tags: ['validation', 'test']
  };

  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 4000,
      path: '/api/trainer/health-protocols',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    }, protocolData);

    console.log(`Response Status: ${response.status}`);
    
    if (response.status === 201 && response.data) {
      if (response.data.protocol) {
        console.log('✅ Health Protocol created successfully');
        console.log(`📊 Protocol ID: ${response.data.protocol.id}`);
        console.log(`📊 Protocol Type: ${response.data.protocol.type}`);
        console.log(`📊 Protocol Name: ${response.data.protocol.name}`);
        return response.data.protocol;
      } else {
        console.log(`❌ Protocol creation failed: ${response.data.message || 'Unknown error'}`);
      }
    } else {
      console.log(`❌ Protocol creation failed: ${response.status}`);
      if (response.data) {
        console.log(`Error details: ${JSON.stringify(response.data)}`);
      }
    }
    
    return null;
  } catch (error) {
    console.log(`❌ Protocol generation error: ${error.message}`);
    return null;
  }
}

// Test 4: Test Parasite Cleanse Protocol
async function testParasiteProtocol(accessToken) {
  console.log('\n📍 Test 4: Parasite Cleanse Protocol Generation');
  
  const protocolData = {
    name: 'Validation Test Parasite Cleanse Protocol',
    description: 'Test parasite cleanse protocol for system validation',
    type: 'parasite_cleanse',
    duration: 30,
    intensity: 'intensive',
    config: {
      protocolType: 'parasite_cleanse',
      customerEmail: 'parasite.test@example.com',
      age: 35,
      gender: 'female',
      weight: 140,
      height: '5\'6"',
      activityLevel: 'moderate'
    },
    tags: ['validation', 'test', 'cleanse']
  };

  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 4000,
      path: '/api/trainer/health-protocols',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    }, protocolData);

    if (response.status === 201 && response.data?.protocol) {
      console.log('✅ Parasite Cleanse Protocol created successfully');
      return response.data.protocol;
    } else {
      console.log(`❌ Parasite Protocol creation failed: ${response.status}`);
      console.log(`Error: ${JSON.stringify(response.data)}`);
      return null;
    }
  } catch (error) {
    console.log(`❌ Parasite Protocol error: ${error.message}`);
    return null;
  }
}

// Test 5: Test Second Longevity Protocol (Different Parameters)
async function testAilmentsProtocol(accessToken) {
  console.log('\n📍 Test 5: Second Longevity Protocol Generation');
  
  const protocolData = {
    name: 'Validation Test Second Longevity Protocol',
    description: 'Test second longevity protocol with different parameters',
    type: 'longevity',
    duration: 60,
    intensity: 'gentle',
    config: {
      protocolType: 'longevity',
      customerEmail: 'second.longevity@example.com',
      age: 50,
      gender: 'male',
      weight: 200,
      height: '6\'0"',
      activityLevel: 'low',
      healthConcerns: ['joint_health', 'energy', 'sleep']
    },
    tags: ['validation', 'test', 'second']
  };

  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 4000,
      path: '/api/trainer/health-protocols',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    }, protocolData);

    if (response.status === 201 && response.data?.protocol) {
      console.log('✅ Second Longevity Protocol created successfully');
      return response.data.protocol;
    } else {
      console.log(`❌ Second Longevity Protocol creation failed: ${response.status}`);
      console.log(`Error: ${JSON.stringify(response.data)}`);
      return null;
    }
  } catch (error) {
    console.log(`❌ Second Longevity Protocol error: ${error.message}`);
    return null;
  }
}

// Test 6: List User Protocols
async function testListProtocols(accessToken) {
  console.log('\n📍 Test 6: List User Protocols');
  
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 4000,
      path: '/api/trainer/health-protocols',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (response.status === 200 && response.data) {
      const protocols = Array.isArray(response.data) ? response.data : (response.data.data || []);
      console.log(`✅ Found ${protocols.length} protocols`);
      
      protocols.forEach((protocol, index) => {
        console.log(`  ${index + 1}. ID: ${protocol.id}, Name: ${protocol.name}, Type: ${protocol.type}`);
      });
      
      return protocols;
    } else {
      console.log(`❌ List protocols failed: ${response.status}`);
      return [];
    }
  } catch (error) {
    console.log(`❌ List protocols error: ${error.message}`);
    return [];
  }
}

// Run all tests
async function runValidation() {
  console.log('🔍 API Validation Test Suite\n');
  
  const results = {
    healthCheck: false,
    login: false,
    longevityProtocol: false,
    parasiteProtocol: false,
    secondLongevityProtocol: false,
    listProtocols: false,
    totalProtocols: 0
  };

  // Test 1: Health Check
  results.healthCheck = await testHealthCheck();
  
  if (!results.healthCheck) {
    console.log('\n❌ API not available. Stopping tests.');
    return results;
  }

  // Test 2: Login
  const accessToken = await testLogin();
  results.login = !!accessToken;
  
  if (!accessToken) {
    console.log('\n❌ Login failed. Stopping tests.');
    return results;
  }

  // Test 3-5: Protocol Generation
  const longevityResult = await testProtocolGeneration(accessToken);
  results.longevityProtocol = !!longevityResult;
  
  const parasiteResult = await testParasiteProtocol(accessToken);
  results.parasiteProtocol = !!parasiteResult;
  
  const secondLongevityResult = await testAilmentsProtocol(accessToken);
  results.secondLongevityProtocol = !!secondLongevityResult;
  
  // Test 6: List Protocols
  const protocols = await testListProtocols(accessToken);
  results.listProtocols = protocols.length > 0;
  results.totalProtocols = protocols.length;

  // Summary
  console.log('\n📊 VALIDATION SUMMARY:');
  console.log('========================');
  Object.entries(results).forEach(([key, value]) => {
    const emoji = typeof value === 'boolean' ? (value ? '✅' : '❌') : '📊';
    console.log(`${emoji} ${key}: ${value}`);
  });

  const successCount = Object.values(results).filter(v => typeof v === 'boolean' && v).length;
  const totalTests = Object.values(results).filter(v => typeof v === 'boolean').length;
  
  console.log(`\n🎯 Overall Success Rate: ${successCount}/${totalTests} tests passed`);
  
  if (successCount === totalTests && results.totalProtocols > 0) {
    console.log('🎉 ALL TESTS PASSED! Health Protocol system is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Review the details above.');
  }

  return results;
}

// Execute the validation
runValidation().catch(error => {
  console.error('❌ Validation failed with error:', error);
});