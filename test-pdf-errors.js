/**
 * Test PDF export error handling
 */

// Test error scenarios
const errorTests = [
  {
    name: "missing-meal-plan-data",
    data: {
      customerName: "Test User",
      options: {}
    },
    expectedError: "Meal plan data is required"
  },
  {
    name: "invalid-meal-plan",
    data: {
      mealPlanData: {
        // Missing required fields
        planName: ""
      },
      customerName: "Test User"
    },
    expectedError: "validation failed"
  },
  {
    name: "empty-request",
    data: {},
    expectedError: "Meal plan data is required"
  }
];

async function testErrorScenario(test) {
  try {
    console.log(`Testing error scenario: ${test.name}`);
    
    const response = await fetch('http://localhost:5000/api/pdf/test-export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(test.data)
    });

    if (response.ok) {
      console.log(`❌ ${test.name}: Expected error but got success`);
      return false;
    }

    const error = await response.json();
    console.log(`✅ ${test.name}: Got expected error (${response.status}): ${error.message}`);
    
    // Check if error message contains expected text
    if (error.message.toLowerCase().includes(test.expectedError.toLowerCase())) {
      console.log(`✅ ${test.name}: Error message matches expectation`);
      return true;
    } else {
      console.log(`⚠️  ${test.name}: Error message doesn't match. Expected: "${test.expectedError}", Got: "${error.message}"`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ ${test.name}: Unexpected error: ${error.message}`);
    return false;
  }
}

async function runErrorTests() {
  console.log('Testing PDF export error handling...\n');
  
  let passed = 0;
  let total = errorTests.length;
  
  for (const test of errorTests) {
    const success = await testErrorScenario(test);
    if (success) passed++;
    console.log(''); // Empty line for readability
  }
  
  console.log(`\n📊 Error Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All error handling tests passed!');
  } else {
    console.log('⚠️  Some error handling tests failed');
  }
}

runErrorTests();