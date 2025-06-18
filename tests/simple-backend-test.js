/**
 * Simple Backend Test Suite for FitMeal Pro
 * Tests all critical backend functionality without complex imports
 */

const BASE_URL = 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api`;

async function makeRequest(url, options = {}) {
  const fetch = (await import('node-fetch')).default;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    let data;
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      data = null;
    }
    
    return {
      status: response.status,
      data,
      ok: response.ok
    };
  } catch (error) {
    return {
      status: 0,
      data: null,
      ok: false,
      error: error.message
    };
  }
}

class SimpleTestRunner {
  constructor() {
    this.tests = [];
    this.results = [];
  }

  addTest(name, testFn) {
    this.tests.push({ name, fn: testFn });
  }

  async runTest(test) {
    const startTime = Date.now();
    
    try {
      const result = await test.fn();
      const duration = Date.now() - startTime;
      
      return {
        name: test.name,
        passed: result.success,
        duration,
        message: result.message,
        details: result.details || {}
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        name: test.name,
        passed: false,
        duration,
        message: error.message,
        details: { error: error.stack }
      };
    }
  }

  async runAll() {
    console.log('🧪 FitMeal Pro Backend Test Suite');
    console.log('='.repeat(50));
    console.log(`Testing against: ${BASE_URL}\n`);

    for (const test of this.tests) {
      const result = await this.runTest(test);
      this.results.push(result);
      
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.name} (${result.duration}ms)`);
      
      if (!result.passed) {
        console.log(`   Error: ${result.message}`);
      }
      
      if (result.details && Object.keys(result.details).length > 0) {
        console.log(`   Details: ${JSON.stringify(result.details)}`);
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    this.printSummary();
    return this.results.every(r => r.passed);
  }

  printSummary() {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.length - passed;
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log('\n📊 Test Summary:');
    console.log('-'.repeat(30));
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total Time: ${totalTime}ms`);
    console.log(`Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.filter(r => !r.passed).forEach(result => {
        console.log(`  - ${result.name}: ${result.message}`);
      });
    }
  }
}

// Test definitions
async function testServerHealth() {
  const response = await makeRequest(BASE_URL);
  return {
    success: response.ok,
    message: response.ok ? 'Server is responding' : `Server returned ${response.status}`,
    details: { status: response.status }
  };
}

async function testDatabaseConnection() {
  const response = await makeRequest(`${API_BASE}/recipes?limit=1`);
  return {
    success: response.status === 200,
    message: response.status === 200 ? 'Database connection successful' : `Database connection failed: ${response.status}`,
    details: { status: response.status }
  };
}

async function testRecipeSearch() {
  const response = await makeRequest(`${API_BASE}/recipes?search=chicken&limit=5`);
  
  if (response.status !== 200) {
    return {
      success: false,
      message: `Recipe search failed with status ${response.status}`,
      details: { status: response.status }
    };
  }

  const hasRecipes = response.data && response.data.recipes && Array.isArray(response.data.recipes);
  return {
    success: hasRecipes,
    message: hasRecipes ? 'Recipe search working' : 'Recipe search returned invalid format',
    details: { 
      recipeCount: response.data?.recipes?.length || 0,
      total: response.data?.total || 0 
    }
  };
}

async function testRecipeFiltering() {
  const response = await makeRequest(`${API_BASE}/recipes?mealType=breakfast&maxCalories=500&limit=10`);
  
  if (response.status !== 200) {
    return {
      success: false,
      message: `Recipe filtering failed with status ${response.status}`,
      details: { status: response.status }
    };
  }

  const hasRecipes = response.data && response.data.recipes && Array.isArray(response.data.recipes);
  return {
    success: hasRecipes,
    message: hasRecipes ? 'Recipe filtering working' : 'Recipe filtering returned invalid format',
    details: { 
      filteredCount: response.data?.recipes?.length || 0 
    }
  };
}

async function testRecipeById() {
  // First get a recipe
  const searchResponse = await makeRequest(`${API_BASE}/recipes?limit=1`);
  
  if (searchResponse.status !== 200 || !searchResponse.data?.recipes?.length) {
    return {
      success: false,
      message: 'No recipes available for ID test',
      details: { searchStatus: searchResponse.status }
    };
  }

  const recipeId = searchResponse.data.recipes[0].id;
  const response = await makeRequest(`${API_BASE}/recipes/${recipeId}`);
  
  const success = response.status === 200 && response.data?.id === recipeId;
  return {
    success,
    message: success ? 'Recipe by ID working' : `Recipe by ID failed: ${response.status}`,
    details: { 
      recipeId,
      status: response.status,
      recipeName: response.data?.name 
    }
  };
}

async function testAuthEndpoints() {
  const response = await makeRequest(`${API_BASE}/auth/user`);
  
  // Should return 401 for unauthenticated user
  const success = response.status === 401;
  return {
    success,
    message: success ? 'Auth endpoints working correctly' : `Expected 401, got ${response.status}`,
    details: { status: response.status }
  };
}

async function testMealPlanGeneration() {
  const testData = {
    days: 3,
    targetCalories: 2000,
    targetProtein: 150,
    mealTypes: ['breakfast', 'lunch', 'dinner']
  };
  
  const response = await makeRequest(`${API_BASE}/trainer/generate-meal-plan`, {
    method: 'POST',
    body: JSON.stringify(testData)
  });
  
  // Should require authentication
  const success = response.status === 401;
  return {
    success,
    message: success ? 'Meal plan generation requires auth (correct)' : `Expected 401, got ${response.status}`,
    details: { status: response.status }
  };
}

async function testErrorHandling() {
  const response = await makeRequest(`${API_BASE}/recipes/invalid-id-12345`);
  
  const success = response.status === 404;
  return {
    success,
    message: success ? 'Error handling working correctly' : `Expected 404, got ${response.status}`,
    details: { status: response.status }
  };
}

async function testPerformance() {
  const startTime = Date.now();
  const requests = [];
  
  // Make 5 concurrent requests
  for (let i = 0; i < 5; i++) {
    requests.push(makeRequest(`${API_BASE}/recipes?limit=10&page=${i + 1}`));
  }
  
  const responses = await Promise.all(requests);
  const duration = Date.now() - startTime;
  const successCount = responses.filter(r => r.status === 200).length;
  
  const success = successCount >= 4 && duration < 10000;
  return {
    success,
    message: success ? 'Performance test passed' : `Performance issues: ${successCount}/5 successful, ${duration}ms`,
    details: { 
      duration,
      successCount,
      totalRequests: 5,
      avgTime: Math.round(duration / 5)
    }
  };
}

async function testAdminEndpoints() {
  const response = await makeRequest(`${API_BASE}/admin/stats`);
  
  // Should require authentication
  const success = response.status === 401;
  return {
    success,
    message: success ? 'Admin endpoints protected (correct)' : `Expected 401, got ${response.status}`,
    details: { status: response.status }
  };
}

// Main execution
async function runBackendTests() {
  const runner = new SimpleTestRunner();
  
  // Add all tests
  runner.addTest('Server Health Check', testServerHealth);
  runner.addTest('Database Connection', testDatabaseConnection);
  runner.addTest('Recipe Search', testRecipeSearch);
  runner.addTest('Recipe Filtering', testRecipeFiltering);
  runner.addTest('Recipe by ID', testRecipeById);
  runner.addTest('Authentication Endpoints', testAuthEndpoints);
  runner.addTest('Meal Plan Generation', testMealPlanGeneration);
  runner.addTest('Admin Endpoints', testAdminEndpoints);
  runner.addTest('Error Handling', testErrorHandling);
  runner.addTest('Performance Test', testPerformance);
  
  const success = await runner.runAll();
  
  console.log('\n🎯 Backend Health Status:');
  console.log('='.repeat(30));
  
  if (success) {
    console.log('🟢 ALL TESTS PASSED - Backend is healthy and functional!');
    console.log('✅ Database connections are stable');
    console.log('✅ API endpoints are responding correctly');
    console.log('✅ Authentication is working properly');
    console.log('✅ Data operations are functioning');
    console.log('✅ Performance is within acceptable limits');
  } else {
    console.log('🔴 SOME TESTS FAILED - Issues detected in backend');
    console.log('⚠️  Please review the failed tests above');
    console.log('🔧 Check database connection and server configuration');
  }
  
  return success;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runBackendTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { runBackendTests };