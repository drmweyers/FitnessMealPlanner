/**
 * API Endpoint Tests for FitMeal Pro
 * Comprehensive testing of all API routes and functionality
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api`;

class APITestSuite {
  constructor() {
    this.results = [];
  }

  async makeRequest(url, options = {}) {
    const fetch = (await import('node-fetch')).default;
    
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
      headers: response.headers
    };
  }

  async testRecipeEndpoints() {
    const tests = [];

    // Test recipe search endpoint
    tests.push({
      name: 'Recipe search with no filters',
      test: async () => {
        const response = await this.makeRequest(`${API_BASE}/recipes`);
        return {
          success: response.status === 200 && response.data.recipes && Array.isArray(response.data.recipes),
          details: { status: response.status, recipeCount: response.data?.recipes?.length || 0 }
        };
      }
    });

    // Test recipe search with filters
    tests.push({
      name: 'Recipe search with filters',
      test: async () => {
        const response = await this.makeRequest(`${API_BASE}/recipes?mealType=breakfast&limit=5`);
        return {
          success: response.status === 200 && response.data.recipes,
          details: { status: response.status, filteredCount: response.data?.recipes?.length || 0 }
        };
      }
    });

    // Test recipe search with text search
    tests.push({
      name: 'Recipe text search',
      test: async () => {
        const response = await this.makeRequest(`${API_BASE}/recipes?search=chicken&limit=10`);
        return {
          success: response.status === 200 && response.data.recipes,
          details: { status: response.status, searchResults: response.data?.recipes?.length || 0 }
        };
      }
    });

    // Test pagination
    tests.push({
      name: 'Recipe pagination',
      test: async () => {
        const page1 = await this.makeRequest(`${API_BASE}/recipes?page=1&limit=5`);
        const page2 = await this.makeRequest(`${API_BASE}/recipes?page=2&limit=5`);
        
        return {
          success: page1.status === 200 && page2.status === 200,
          details: { 
            page1Count: page1.data?.recipes?.length || 0,
            page2Count: page2.data?.recipes?.length || 0,
            page1Total: page1.data?.total || 0,
            page2Total: page2.data?.total || 0
          }
        };
      }
    });

    // Test recipe by ID (first get a recipe, then fetch by ID)
    tests.push({
      name: 'Recipe by ID',
      test: async () => {
        const searchResponse = await this.makeRequest(`${API_BASE}/recipes?limit=1`);
        if (searchResponse.status === 200 && searchResponse.data.recipes.length > 0) {
          const recipeId = searchResponse.data.recipes[0].id;
          const response = await this.makeRequest(`${API_BASE}/recipes/${recipeId}`);
          
          return {
            success: response.status === 200 && response.data.id === recipeId,
            details: { recipeId, recipeName: response.data?.name }
          };
        }
        return { success: false, details: { error: 'No recipes available for ID test' } };
      }
    });

    return await this.runTestGroup('Recipe API Endpoints', tests);
  }

  async testAuthEndpoints() {
    const tests = [];

    // Test user authentication status
    tests.push({
      name: 'User authentication check',
      test: async () => {
        const response = await this.makeRequest(`${API_BASE}/auth/user`);
        return {
          success: response.status === 401, // Should be unauthorized for test
          details: { status: response.status }
        };
      }
    });

    // Test login redirect
    tests.push({
      name: 'Login endpoint',
      test: async () => {
        const response = await this.makeRequest(`${API_BASE}/login`);
        return {
          success: response.status === 302, // Should redirect
          details: { status: response.status }
        };
      }
    });

    return await this.runTestGroup('Authentication Endpoints', tests);
  }

  async testMealPlanEndpoints() {
    const tests = [];

    // Test meal plan generation (should require auth)
    tests.push({
      name: 'Meal plan generation',
      test: async () => {
        const testData = {
          days: 3,
          targetCalories: 2000,
          targetProtein: 150,
          mealTypes: ['breakfast', 'lunch', 'dinner']
        };
        
        const response = await this.makeRequest(`${API_BASE}/generate-meal-plan`, {
          method: 'POST',
          body: JSON.stringify(testData)
        });
        
        return {
          success: response.status === 401, // Should require authentication
          details: { status: response.status }
        };
      }
    });

    // Test client meal plans (should require auth)
    tests.push({
      name: 'Client meal plans',
      test: async () => {
        const response = await this.makeRequest(`${API_BASE}/client/meal-plans`);
        return {
          success: response.status === 401, // Should require authentication
          details: { status: response.status }
        };
      }
    });

    return await this.runTestGroup('Meal Plan Endpoints', tests);
  }

  async testAdminEndpoints() {
    const tests = [];

    // Test admin recipe stats (should require auth)
    tests.push({
      name: 'Admin recipe stats',
      test: async () => {
        const response = await this.makeRequest(`${API_BASE}/admin/stats`);
        return {
          success: response.status === 401, // Should require authentication
          details: { status: response.status }
        };
      }
    });

    // Test admin recipe list (should require auth)
    tests.push({
      name: 'Admin recipe list',
      test: async () => {
        const response = await this.makeRequest(`${API_BASE}/admin/recipes`);
        return {
          success: response.status === 401, // Should require authentication
          details: { status: response.status }
        };
      }
    });

    // Test admin recipe generation (should require auth)
    tests.push({
      name: 'Admin recipe generation',
      test: async () => {
        const response = await this.makeRequest(`${API_BASE}/admin/generate`, {
          method: 'POST',
          body: JSON.stringify({ count: 5 })
        });
        return {
          success: response.status === 401, // Should require authentication
          details: { status: response.status }
        };
      }
    });

    return await this.runTestGroup('Admin Endpoints', tests);
  }

  async testErrorHandling() {
    const tests = [];

    // Test 404 for non-existent recipe
    tests.push({
      name: 'Non-existent recipe 404',
      test: async () => {
        const response = await this.makeRequest(`${API_BASE}/recipes/non-existent-id-12345`);
        return {
          success: response.status === 404,
          details: { status: response.status }
        };
      }
    });

    // Test 404 for non-existent endpoint
    tests.push({
      name: 'Non-existent endpoint 404',
      test: async () => {
        const response = await this.makeRequest(`${API_BASE}/non-existent-endpoint`);
        return {
          success: response.status === 404,
          details: { status: response.status }
        };
      }
    });

    // Test invalid JSON handling
    tests.push({
      name: 'Invalid JSON handling',
      test: async () => {
        const response = await this.makeRequest(`${API_BASE}/generate-meal-plan`, {
          method: 'POST',
          body: 'invalid json'
        });
        return {
          success: response.status === 400 || response.status === 401,
          details: { status: response.status }
        };
      }
    });

    return await this.runTestGroup('Error Handling', tests);
  }

  async testDataValidation() {
    const tests = [];

    // Test recipe search with invalid parameters
    tests.push({
      name: 'Invalid search parameters',
      test: async () => {
        const response = await this.makeRequest(`${API_BASE}/recipes?limit=invalid&page=abc`);
        return {
          success: response.status === 200 || response.status === 400, // Should handle gracefully
          details: { status: response.status }
        };
      }
    });

    // Test recipe search with negative values
    tests.push({
      name: 'Negative parameter values',
      test: async () => {
        const response = await this.makeRequest(`${API_BASE}/recipes?limit=-1&page=-5`);
        return {
          success: response.status === 200 || response.status === 400, // Should handle gracefully
          details: { status: response.status }
        };
      }
    });

    return await this.runTestGroup('Data Validation', tests);
  }

  async testPerformance() {
    const tests = [];

    // Test concurrent requests
    tests.push({
      name: 'Concurrent recipe requests',
      test: async () => {
        const startTime = Date.now();
        const requests = [];
        
        for (let i = 0; i < 10; i++) {
          requests.push(this.makeRequest(`${API_BASE}/recipes?limit=5&page=${i + 1}`));
        }
        
        const responses = await Promise.all(requests);
        const duration = Date.now() - startTime;
        const successCount = responses.filter(r => r.status === 200).length;
        
        return {
          success: successCount >= 8 && duration < 10000, // At least 8/10 successful, under 10s
          details: { 
            duration,
            successCount,
            totalRequests: 10,
            avgResponseTime: duration / 10
          }
        };
      }
    });

    // Test large result set handling
    tests.push({
      name: 'Large result set',
      test: async () => {
        const startTime = Date.now();
        const response = await this.makeRequest(`${API_BASE}/recipes?limit=100`);
        const duration = Date.now() - startTime;
        
        return {
          success: response.status === 200 && duration < 5000, // Under 5 seconds
          details: { 
            duration,
            status: response.status,
            recipeCount: response.data?.recipes?.length || 0
          }
        };
      }
    });

    return await this.runTestGroup('Performance Tests', tests);
  }

  async runTestGroup(groupName, tests) {
    console.log(`\nRunning: ${groupName}`);
    console.log('-'.repeat(40));
    
    const results = [];
    
    for (const test of tests) {
      const startTime = Date.now();
      
      try {
        const result = await test.test();
        const duration = Date.now() - startTime;
        
        const testResult = {
          name: test.name,
          success: result.success,
          duration,
          details: result.details
        };
        
        if (result.success) {
          console.log(`✓ ${test.name} (${duration}ms)`);
        } else {
          console.log(`✗ ${test.name} (${duration}ms)`);
          console.log(`  Details: ${JSON.stringify(result.details)}`);
        }
        
        results.push(testResult);
      } catch (error) {
        const duration = Date.now() - startTime;
        console.log(`✗ ${test.name} (${duration}ms)`);
        console.log(`  Error: ${error.message}`);
        
        results.push({
          name: test.name,
          success: false,
          duration,
          error: error.message
        });
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }

  async runAllTests() {
    console.log('Starting API Test Suite');
    console.log('='.repeat(50));
    console.log(`Testing against: ${BASE_URL}`);
    
    const allResults = [];
    
    // Run all test groups
    const recipeResults = await this.testRecipeEndpoints();
    const authResults = await this.testAuthEndpoints();
    const mealPlanResults = await this.testMealPlanEndpoints();
    const adminResults = await this.testAdminEndpoints();
    const errorResults = await this.testErrorHandling();
    const validationResults = await this.testDataValidation();
    const performanceResults = await this.testPerformance();
    
    allResults.push(...recipeResults, ...authResults, ...mealPlanResults, 
                   ...adminResults, ...errorResults, ...validationResults, ...performanceResults);
    
    // Calculate summary
    const passed = allResults.filter(r => r.success).length;
    const failed = allResults.length - passed;
    const totalTime = allResults.reduce((sum, r) => sum + r.duration, 0);
    
    console.log('\nAPI Test Summary:');
    console.log('='.repeat(30));
    console.log(`Total Tests: ${allResults.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total Time: ${totalTime}ms`);
    console.log(`Success Rate: ${((passed / allResults.length) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\nFailed Tests:');
      allResults.filter(r => !r.success).forEach(result => {
        console.log(`  - ${result.name}: ${result.error || 'Test failed'}`);
      });
    }
    
    return {
      success: failed === 0,
      results: allResults,
      summary: { passed, failed, totalTime }
    };
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testSuite = new APITestSuite();
  testSuite.runAllTests()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('API test execution failed:', error);
      process.exit(1);
    });
}

export { APITestSuite };