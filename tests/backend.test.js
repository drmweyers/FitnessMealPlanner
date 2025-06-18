/**
 * Comprehensive Backend Test Suite for FitMeal Pro
 * Tests all critical API endpoints and database operations
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api`;

// Test configuration
const TEST_CONFIG = {
  timeout: 30000,
  retries: 3,
  delay: 1000
};

// Utility functions
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(url, options = {}) {
  const fetch = (await import('node-fetch')).default;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  
  const data = await response.text();
  let jsonData;
  try {
    jsonData = JSON.parse(data);
  } catch (e) {
    jsonData = data;
  }
  
  return {
    status: response.status,
    data: jsonData,
    headers: response.headers
  };
}

// Test classes
class TestResult {
  constructor(name) {
    this.name = name;
    this.passed = false;
    this.error = null;
    this.duration = 0;
    this.details = {};
  }
  
  pass(details = {}) {
    this.passed = true;
    this.details = details;
  }
  
  fail(error, details = {}) {
    this.passed = false;
    this.error = error;
    this.details = details;
  }
}

class TestSuite {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.results = [];
  }
  
  addTest(testFn, name) {
    this.tests.push({ fn: testFn, name });
  }
  
  async run() {
    console.log(`\nRunning test suite: ${this.name}`);
    console.log('=' .repeat(50));
    
    for (const test of this.tests) {
      const result = new TestResult(test.name);
      const startTime = Date.now();
      
      try {
        await test.fn(result);
        result.duration = Date.now() - startTime;
        
        if (result.passed) {
          console.log(`✓ ${test.name} (${result.duration}ms)`);
        } else {
          console.log(`✗ ${test.name} - ${result.error} (${result.duration}ms)`);
        }
      } catch (error) {
        result.duration = Date.now() - startTime;
        result.fail(error.message);
        console.log(`✗ ${test.name} - ${error.message} (${result.duration}ms)`);
      }
      
      this.results.push(result);
      await sleep(TEST_CONFIG.delay);
    }
    
    this.printSummary();
  }
  
  printSummary() {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.length - passed;
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);
    
    console.log('\nTest Summary:');
    console.log('-'.repeat(30));
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total Time: ${totalTime}ms`);
    console.log(`Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\nFailed Tests:');
      this.results.filter(r => !r.passed).forEach(result => {
        console.log(`  - ${result.name}: ${result.error}`);
      });
    }
  }
}

// Individual test functions
async function testDatabaseConnection(result) {
  try {
    const response = await makeRequest(`${API_BASE}/recipes?limit=1`);
    
    if (response.status === 200 || response.status === 401) {
      result.pass({ status: response.status });
    } else {
      result.fail(`Database connection failed with status ${response.status}`);
    }
  } catch (error) {
    result.fail(`Database connection error: ${error.message}`);
  }
}

async function testRecipeSearch(result) {
  try {
    const response = await makeRequest(`${API_BASE}/recipes?search=chicken&limit=5`);
    
    if (response.status === 200) {
      const data = response.data;
      if (data.recipes && Array.isArray(data.recipes)) {
        result.pass({ 
          recipeCount: data.recipes.length,
          totalRecipes: data.total 
        });
      } else {
        result.fail('Invalid recipe search response format');
      }
    } else {
      result.fail(`Recipe search failed with status ${response.status}`);
    }
  } catch (error) {
    result.fail(`Recipe search error: ${error.message}`);
  }
}

async function testRecipeFiltering(result) {
  try {
    const filters = [
      'mealType=breakfast',
      'dietaryTag=vegetarian',
      'maxCalories=500',
      'minProtein=20'
    ];
    
    const response = await makeRequest(`${API_BASE}/recipes?${filters.join('&')}&limit=10`);
    
    if (response.status === 200) {
      const data = response.data;
      if (data.recipes && Array.isArray(data.recipes)) {
        result.pass({ 
          filteredCount: data.recipes.length,
          filters: filters.length 
        });
      } else {
        result.fail('Invalid filtered recipe response format');
      }
    } else {
      result.fail(`Recipe filtering failed with status ${response.status}`);
    }
  } catch (error) {
    result.fail(`Recipe filtering error: ${error.message}`);
  }
}

async function testRecipeById(result) {
  try {
    const searchResponse = await makeRequest(`${API_BASE}/recipes?limit=1`);
    
    if (searchResponse.status === 200 && searchResponse.data.recipes && searchResponse.data.recipes.length > 0) {
      const recipeId = searchResponse.data.recipes[0].id;
      
      const response = await makeRequest(`${API_BASE}/recipes/${recipeId}`);
      
      if (response.status === 200) {
        const recipe = response.data;
        if (recipe.id === recipeId) {
          result.pass({ recipeId, recipeName: recipe.name });
        } else {
          result.fail('Recipe ID mismatch in response');
        }
      } else {
        result.fail(`Recipe by ID failed with status ${response.status}`);
      }
    } else {
      result.fail('No recipes available for ID test');
    }
  } catch (error) {
    result.fail(`Recipe by ID error: ${error.message}`);
  }
}

async function testAuthEndpoints(result) {
  try {
    const userResponse = await makeRequest(`${API_BASE}/auth/user`);
    
    if (userResponse.status === 401) {
      result.pass({ authStatus: 'correctly_unauthorized' });
    } else {
      result.fail(`Expected 401 for unauthenticated user, got ${userResponse.status}`);
    }
  } catch (error) {
    result.fail(`Auth endpoint error: ${error.message}`);
  }
}

async function testMealPlanGeneration(result) {
  try {
    const testData = {
      days: 3,
      targetCalories: 2000,
      targetProtein: 150,
      mealTypes: ['breakfast', 'lunch', 'dinner'],
      dietaryTags: ['high-protein']
    };
    
    const response = await makeRequest(`${API_BASE}/generate-meal-plan`, {
      method: 'POST',
      body: JSON.stringify(testData)
    });
    
    if (response.status === 401) {
      result.pass({ 
        authRequired: true,
        endpoint: 'meal-plan-generation' 
      });
    } else if (response.status === 200) {
      result.pass({ 
        authenticated: true,
        mealPlanGenerated: true 
      });
    } else {
      result.fail(`Meal plan generation failed with status ${response.status}`);
    }
  } catch (error) {
    result.fail(`Meal plan generation error: ${error.message}`);
  }
}

async function testServerHealth(result) {
  try {
    const response = await makeRequest(BASE_URL);
    
    if (response.status >= 200 && response.status < 400) {
      result.pass({ serverStatus: 'healthy', status: response.status });
    } else {
      result.fail(`Server health check failed with status ${response.status}`);
    }
  } catch (error) {
    result.fail(`Server health error: ${error.message}`);
  }
}

async function testErrorHandling(result) {
  try {
    const response = await makeRequest(`${API_BASE}/recipes/invalid-id-12345`);
    
    if (response.status === 404) {
      result.pass({ errorHandling: 'correct_404_for_invalid_id' });
    } else {
      result.fail(`Expected 404 for invalid recipe ID, got ${response.status}`);
    }
  } catch (error) {
    result.fail(`Error handling test error: ${error.message}`);
  }
}

async function testDataValidation(result) {
  try {
    const response = await makeRequest(`${API_BASE}/recipes?limit=invalid&page=abc`);
    
    if (response.status === 200) {
      result.pass({ validation: 'handles_invalid_params_gracefully' });
    } else if (response.status === 400) {
      result.pass({ validation: 'correctly_validates_params' });
    } else {
      result.fail(`Unexpected validation response: ${response.status}`);
    }
  } catch (error) {
    result.fail(`Data validation error: ${error.message}`);
  }
}

async function testPerformance(result) {
  try {
    const startTime = Date.now();
    const requests = [];
    
    for (let i = 0; i < 5; i++) {
      requests.push(makeRequest(`${API_BASE}/recipes?limit=10&page=${i + 1}`));
    }
    
    const responses = await Promise.all(requests);
    const duration = Date.now() - startTime;
    
    const successCount = responses.filter(r => r.status === 200).length;
    
    if (successCount >= 4 && duration < 10000) {
      result.pass({ 
        concurrentRequests: 5,
        successfulRequests: successCount,
        totalTime: duration,
        avgTime: duration / 5
      });
    } else {
      result.fail(`Performance test failed: ${successCount}/5 successful, ${duration}ms total`);
    }
  } catch (error) {
    result.fail(`Performance test error: ${error.message}`);
  }
}

// Main test execution
async function runAllTests() {
  console.log('Starting FitMeal Pro Backend Test Suite');
  console.log(`Testing against: ${BASE_URL}`);
  
  // Core functionality tests
  const coreTests = new TestSuite('Core Functionality');
  coreTests.addTest(testDatabaseConnection, 'Database Connection');
  coreTests.addTest(testServerHealth, 'Server Health Check');
  coreTests.addTest(testAuthEndpoints, 'Authentication Endpoints');
  
  // Recipe API tests
  const recipeTests = new TestSuite('Recipe API');
  recipeTests.addTest(testRecipeSearch, 'Recipe Search');
  recipeTests.addTest(testRecipeFiltering, 'Recipe Filtering');
  recipeTests.addTest(testRecipeById, 'Recipe by ID');
  
  // Advanced features tests
  const advancedTests = new TestSuite('Advanced Features');
  advancedTests.addTest(testMealPlanGeneration, 'Meal Plan Generation');
  advancedTests.addTest(testErrorHandling, 'Error Handling');
  advancedTests.addTest(testDataValidation, 'Data Validation');
  
  // Performance tests
  const performanceTests = new TestSuite('Performance');
  performanceTests.addTest(testPerformance, 'Concurrent Request Performance');
  
  // Run all test suites
  await coreTests.run();
  await recipeTests.run();
  await advancedTests.run();
  await performanceTests.run();
  
  // Final summary
  const allResults = [
    ...coreTests.results,
    ...recipeTests.results,
    ...advancedTests.results,
    ...performanceTests.results
  ];
  
  const totalPassed = allResults.filter(r => r.passed).length;
  const totalTests = allResults.length;
  
  console.log('\nOverall Test Results:');
  console.log('='.repeat(50));
  console.log(`Total Tests Executed: ${totalTests}`);
  console.log(`Total Passed: ${totalPassed}`);
  console.log(`Total Failed: ${totalTests - totalPassed}`);
  console.log(`Overall Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
  
  if (totalPassed === totalTests) {
    console.log('\nAll tests passed! Backend is healthy and functional.');
  } else {
    console.log('\nSome tests failed. Please review the failures above.');
  }
  
  return totalPassed === totalTests;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { runAllTests, TestSuite, TestResult };