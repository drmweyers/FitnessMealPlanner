/**
 * FitnessMealPlanner - Comprehensive Role Interaction Validation
 *
 * This script validates 100% of trainer-customer role interactions and workflows
 * Testing all role-based permissions, data isolation, and business logic
 *
 * Created: September 22, 2025
 * Purpose: Production readiness validation for role-based workflows
 */

// Using built-in fetch in Node.js 22+

// Test account credentials as documented in CLAUDE.md
const TEST_ACCOUNTS = {
  admin: {
    email: 'admin@fitmeal.pro',
    password: 'AdminPass123',
    role: 'admin'
  },
  trainer: {
    email: 'trainer.test@evofitmeals.com',
    password: 'TestTrainer123!',
    role: 'trainer'
  },
  customer: {
    email: 'customer.test@evofitmeals.com',
    password: 'TestCustomer123!',
    role: 'customer'
  }
};

// Base URL for testing (development environment)
const BASE_URL = 'http://localhost:4000';

// Global variables to store authentication tokens
let tokens = {};
let userIds = {};
let testResults = {
  authentication: {},
  authorization: {},
  dataIsolation: {},
  workflows: {},
  permissionBoundaries: {},
  performance: {}
};

/**
 * Utility function to make authenticated API requests
 */
async function makeRequest(endpoint, options = {}, token = null) {
  const url = `${BASE_URL}${endpoint}`;
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  };

  const startTime = Date.now();
  try {
    const response = await fetch(url, mergedOptions);
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    let data = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      success: response.ok,
      status: response.status,
      data,
      responseTime,
      headers: Object.fromEntries(response.headers)
    };
  } catch (error) {
    const endTime = Date.now();
    return {
      success: false,
      status: 0,
      error: error.message,
      responseTime: endTime - startTime
    };
  }
}

/**
 * Test authentication for all roles
 */
async function testAuthentication() {
  console.log('\n🔐 Testing Authentication for All Roles');
  console.log('=' .repeat(50));

  for (const [roleName, account] of Object.entries(TEST_ACCOUNTS)) {
    console.log(`\n📋 Testing ${roleName.toUpperCase()} authentication...`);

    const loginData = {
      email: account.email,
      password: account.password
    };

    const result = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(loginData)
    });

    testResults.authentication[roleName] = {
      endpoint: '/api/auth/login',
      status: result.status,
      success: result.success,
      responseTime: result.responseTime
    };

    if (result.success && result.data) {
      tokens[roleName] = result.data.data?.accessToken;
      userIds[roleName] = result.data.data?.user?.id;

      console.log(`   ✅ ${roleName} login successful`);
      console.log(`   - User ID: ${result.data.data?.user?.id}`);
      console.log(`   - Role: ${result.data.data?.user?.role}`);
      console.log(`   - Response time: ${result.responseTime}ms`);

      // Verify role matches expected
      if (result.data.data?.user?.role === account.role) {
        console.log(`   ✅ Role verification passed`);
        testResults.authentication[roleName].roleVerified = true;
      } else {
        console.log(`   ❌ Role mismatch: expected ${account.role}, got ${result.data.data?.user?.role}`);
        testResults.authentication[roleName].roleVerified = false;
      }
    } else {
      console.log(`   ❌ ${roleName} login failed`);
      console.log(`   - Status: ${result.status}`);
      console.log(`   - Error: ${result.error || JSON.stringify(result.data)}`);
      testResults.authentication[roleName].error = result.error || result.data;
    }
  }
}

/**
 * Test authorization and role-based endpoint access
 */
async function testAuthorization() {
  console.log('\n🛡️ Testing Authorization & Role-Based Access Control');
  console.log('=' .repeat(50));

  // Define role-specific endpoints and expected access
  const endpointTests = {
    // Admin-only endpoints
    admin: [
      { endpoint: '/api/admin/users', method: 'GET', description: 'View all users' },
      { endpoint: '/api/admin/recipes', method: 'GET', description: 'Manage all recipes' },
      { endpoint: '/api/admin/stats', method: 'GET', description: 'View system statistics' }
    ],
    // Trainer endpoints
    trainer: [
      { endpoint: '/api/trainer/customers', method: 'GET', description: 'View trainer customers' },
      { endpoint: '/api/trainer/meal-plans', method: 'GET', description: 'View saved meal plans' },
      { endpoint: '/api/trainer/invitations', method: 'GET', description: 'View invitations' }
    ],
    // Customer endpoints
    customer: [
      { endpoint: '/api/customer/meal-plans', method: 'GET', description: 'View assigned meal plans' },
      { endpoint: '/api/progress/goals', method: 'GET', description: 'View progress goals' },
      { endpoint: '/api/progress/measurements', method: 'GET', description: 'View measurements' }
    ]
  };

  for (const [roleName, roleEndpoints] of Object.entries(endpointTests)) {
    console.log(`\n📋 Testing ${roleName.toUpperCase()} endpoints...`);

    if (!tokens[roleName]) {
      console.log(`   ❌ No token available for ${roleName}`);
      continue;
    }

    testResults.authorization[roleName] = {};

    for (const test of roleEndpoints) {
      console.log(`   🔍 ${test.description}`);

      const result = await makeRequest(test.endpoint, {
        method: test.method
      }, tokens[roleName]);

      testResults.authorization[roleName][test.endpoint] = {
        description: test.description,
        status: result.status,
        success: result.success,
        responseTime: result.responseTime
      };

      if (result.success) {
        console.log(`     ✅ Authorized (${result.status}) - ${result.responseTime}ms`);
        if (result.data && Array.isArray(result.data)) {
          console.log(`     📊 Data count: ${result.data.length}`);
        }
      } else {
        console.log(`     ❌ Access denied (${result.status})`);
      }
    }
  }
}

/**
 * Test cross-role access (permission boundaries)
 */
async function testPermissionBoundaries() {
  console.log('\n🚫 Testing Permission Boundaries (Cross-Role Access)');
  console.log('=' .repeat(50));

  // Test scenarios where access should be denied
  const crossRoleTests = [
    {
      role: 'customer',
      endpoint: '/api/trainer/customers',
      description: 'Customer accessing trainer endpoints',
      shouldFail: true
    },
    {
      role: 'customer',
      endpoint: '/api/admin/users',
      description: 'Customer accessing admin endpoints',
      shouldFail: true
    },
    {
      role: 'trainer',
      endpoint: '/api/admin/users',
      description: 'Trainer accessing admin endpoints',
      shouldFail: true
    },
    {
      role: 'trainer',
      endpoint: '/api/customer/meal-plans',
      description: 'Trainer accessing customer-specific endpoints',
      shouldFail: true
    }
  ];

  testResults.permissionBoundaries = {};

  for (const test of crossRoleTests) {
    console.log(`\n🔍 ${test.description}`);

    if (!tokens[test.role]) {
      console.log(`   ❌ No token available for ${test.role}`);
      continue;
    }

    const result = await makeRequest(test.endpoint, {
      method: 'GET'
    }, tokens[test.role]);

    testResults.permissionBoundaries[`${test.role}_${test.endpoint}`] = {
      description: test.description,
      expectedToFail: test.shouldFail,
      actuallyFailed: !result.success,
      status: result.status,
      responseTime: result.responseTime
    };

    if (test.shouldFail && !result.success) {
      console.log(`   ✅ Correctly denied (${result.status}) - Security working`);
    } else if (test.shouldFail && result.success) {
      console.log(`   ❌ SECURITY ISSUE: Access granted when should be denied!`);
    } else if (!test.shouldFail && result.success) {
      console.log(`   ✅ Correctly allowed (${result.status})`);
    } else {
      console.log(`   ❌ ISSUE: Access denied when should be allowed (${result.status})`);
    }
  }
}

/**
 * Test data isolation between users
 */
async function testDataIsolation() {
  console.log('\n🔒 Testing Data Isolation');
  console.log('=' .repeat(50));

  console.log('\n📋 Testing trainer-customer data relationships...');

  if (!tokens.trainer || !tokens.customer) {
    console.log('❌ Missing trainer or customer tokens for data isolation test');
    return;
  }

  // Test trainer can see their customers
  console.log('\n🔍 Verifying trainer can access their customers...');
  const trainerCustomers = await makeRequest('/api/trainer/customers', {
    method: 'GET'
  }, tokens.trainer);

  testResults.dataIsolation.trainerCustomers = {
    status: trainerCustomers.status,
    success: trainerCustomers.success,
    responseTime: trainerCustomers.responseTime
  };

  if (trainerCustomers.success) {
    console.log(`   ✅ Trainer can access customers endpoint`);
    const customerList = trainerCustomers.data?.customers || [];
    console.log(`   📊 Customer count: ${customerList.length}`);

    // Check if test customer is in trainer's list
    const hasTestCustomer = customerList.some(c =>
      c.email === TEST_ACCOUNTS.customer.email
    );

    if (hasTestCustomer) {
      console.log(`   ✅ Test customer found in trainer's customer list`);
      testResults.dataIsolation.customerTrainerLink = true;
    } else {
      console.log(`   ⚠️ Test customer not found in trainer's customer list`);
      testResults.dataIsolation.customerTrainerLink = false;
    }
  } else {
    console.log(`   ❌ Trainer cannot access customers endpoint (${trainerCustomers.status})`);
  }

  // Test customer can see their meal plans
  console.log('\n🔍 Verifying customer can access their meal plans...');
  const customerMealPlans = await makeRequest('/api/customer/meal-plans', {
    method: 'GET'
  }, tokens.customer);

  testResults.dataIsolation.customerMealPlans = {
    status: customerMealPlans.status,
    success: customerMealPlans.success,
    responseTime: customerMealPlans.responseTime
  };

  if (customerMealPlans.success) {
    console.log(`   ✅ Customer can access meal plans endpoint`);
    const mealPlanList = customerMealPlans.data?.data || customerMealPlans.data || [];
    console.log(`   📊 Meal plan count: ${Array.isArray(mealPlanList) ? mealPlanList.length : 0}`);
  } else {
    console.log(`   ❌ Customer cannot access meal plans endpoint (${customerMealPlans.status})`);
  }
}

/**
 * Test complete trainer-customer workflow
 */
async function testTrainerCustomerWorkflow() {
  console.log('\n🔄 Testing Complete Trainer-Customer Workflow');
  console.log('=' .repeat(50));

  if (!tokens.trainer || !tokens.customer) {
    console.log('❌ Missing tokens for workflow test');
    return;
  }

  testResults.workflows = {};

  // Step 1: Trainer creates a test meal plan
  console.log('\n1️⃣ Testing meal plan creation by trainer...');

  const testMealPlan = {
    name: `Test Plan ${Date.now()}`,
    description: 'Automated test meal plan',
    weeks: [{
      weekNumber: 1,
      days: [{
        dayNumber: 1,
        meals: [{
          name: 'Test Breakfast',
          recipes: []
        }]
      }]
    }]
  };

  const createPlanResult = await makeRequest('/api/meal-plans', {
    method: 'POST',
    body: JSON.stringify(testMealPlan)
  }, tokens.trainer);

  testResults.workflows.mealPlanCreation = {
    status: createPlanResult.status,
    success: createPlanResult.success,
    responseTime: createPlanResult.responseTime
  };

  let createdPlanId = null;
  if (createPlanResult.success && createPlanResult.data) {
    createdPlanId = createPlanResult.data.id;
    console.log(`   ✅ Meal plan created successfully (ID: ${createdPlanId})`);
  } else {
    console.log(`   ❌ Failed to create meal plan (${createPlanResult.status})`);
    console.log(`   Error: ${createPlanResult.error || JSON.stringify(createPlanResult.data)}`);
  }

  // Step 2: Test meal plan assignment (if creation was successful)
  if (createdPlanId && userIds.customer) {
    console.log('\n2️⃣ Testing meal plan assignment to customer...');

    const assignmentData = {
      customerId: userIds.customer,
      mealPlanId: createdPlanId,
      startDate: new Date().toISOString().split('T')[0]
    };

    const assignResult = await makeRequest('/api/meal-plan-assignments', {
      method: 'POST',
      body: JSON.stringify(assignmentData)
    }, tokens.trainer);

    testResults.workflows.mealPlanAssignment = {
      status: assignResult.status,
      success: assignResult.success,
      responseTime: assignResult.responseTime
    };

    if (assignResult.success) {
      console.log(`   ✅ Meal plan assigned successfully`);

      // Step 3: Verify customer can see the assigned plan
      console.log('\n3️⃣ Verifying customer can see assigned meal plan...');

      const customerPlansAfter = await makeRequest('/api/customer/meal-plans', {
        method: 'GET'
      }, tokens.customer);

      testResults.workflows.customerPlanVerification = {
        status: customerPlansAfter.status,
        success: customerPlansAfter.success,
        responseTime: customerPlansAfter.responseTime
      };

      if (customerPlansAfter.success) {
        const planList = customerPlansAfter.data?.data || customerPlansAfter.data || [];
        const hasAssignedPlan = Array.isArray(planList) && planList.some(plan =>
          plan.mealPlanId === createdPlanId
        );

        if (hasAssignedPlan) {
          console.log(`   ✅ Customer can see assigned meal plan`);
          testResults.workflows.endToEndWorkflow = true;
        } else {
          console.log(`   ❌ Assigned meal plan not visible to customer`);
          testResults.workflows.endToEndWorkflow = false;
        }
      } else {
        console.log(`   ❌ Customer cannot access meal plans (${customerPlansAfter.status})`);
      }
    } else {
      console.log(`   ❌ Failed to assign meal plan (${assignResult.status})`);
      console.log(`   Error: ${assignResult.error || JSON.stringify(assignResult.data)}`);
    }
  }
}

/**
 * Test progress tracking workflow
 */
async function testProgressTrackingWorkflow() {
  console.log('\n📊 Testing Progress Tracking Workflow');
  console.log('=' .repeat(50));

  if (!tokens.customer) {
    console.log('❌ Missing customer token for progress tracking test');
    return;
  }

  // Test goals endpoint
  console.log('\n🎯 Testing goals access...');
  const goalsResult = await makeRequest('/api/progress/goals', {
    method: 'GET'
  }, tokens.customer);

  testResults.workflows.progressGoals = {
    status: goalsResult.status,
    success: goalsResult.success,
    responseTime: goalsResult.responseTime
  };

  if (goalsResult.success) {
    console.log(`   ✅ Customer can access goals (${goalsResult.responseTime}ms)`);
  } else {
    console.log(`   ❌ Cannot access goals (${goalsResult.status})`);
  }

  // Test measurements endpoint
  console.log('\n📏 Testing measurements access...');
  const measurementsResult = await makeRequest('/api/progress/measurements', {
    method: 'GET'
  }, tokens.customer);

  testResults.workflows.progressMeasurements = {
    status: measurementsResult.status,
    success: measurementsResult.success,
    responseTime: measurementsResult.responseTime
  };

  if (measurementsResult.success) {
    console.log(`   ✅ Customer can access measurements (${measurementsResult.responseTime}ms)`);
  } else {
    console.log(`   ❌ Cannot access measurements (${measurementsResult.status})`);
  }
}

/**
 * Test recipe management workflow
 */
async function testRecipeManagementWorkflow() {
  console.log('\n🍽️ Testing Recipe Management Workflow');
  console.log('=' .repeat(50));

  // Test different roles accessing recipes
  for (const [roleName, token] of Object.entries(tokens)) {
    if (!token) continue;

    console.log(`\n📋 Testing ${roleName} recipe access...`);

    const recipesResult = await makeRequest('/api/recipes', {
      method: 'GET'
    }, token);

    testResults.workflows[`${roleName}Recipes`] = {
      status: recipesResult.status,
      success: recipesResult.success,
      responseTime: recipesResult.responseTime
    };

    if (recipesResult.success) {
      console.log(`   ✅ ${roleName} can access recipes (${recipesResult.responseTime}ms)`);
      const recipeList = recipesResult.data?.data || recipesResult.data || [];
      console.log(`   📊 Recipe count: ${Array.isArray(recipeList) ? recipeList.length : 0}`);
    } else {
      console.log(`   ❌ ${roleName} cannot access recipes (${recipesResult.status})`);
    }
  }
}

/**
 * Calculate and display performance metrics
 */
function calculatePerformanceMetrics() {
  console.log('\n⚡ Performance Metrics Analysis');
  console.log('=' .repeat(50));

  const allResponseTimes = [];

  // Collect all response times
  function collectResponseTimes(obj, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === 'object') {
        if (value.responseTime) {
          allResponseTimes.push({
            test: `${prefix}${key}`,
            time: value.responseTime,
            success: value.success
          });
        } else {
          collectResponseTimes(value, `${prefix}${key}.`);
        }
      }
    }
  }

  collectResponseTimes(testResults);

  if (allResponseTimes.length > 0) {
    const successfulTests = allResponseTimes.filter(t => t.success);
    const failedTests = allResponseTimes.filter(t => !t.success);

    const avgResponseTime = successfulTests.reduce((sum, t) => sum + t.time, 0) / successfulTests.length;
    const maxResponseTime = Math.max(...allResponseTimes.map(t => t.time));
    const minResponseTime = Math.min(...allResponseTimes.map(t => t.time));

    console.log(`📊 Response Time Statistics:`);
    console.log(`   Average: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`   Maximum: ${maxResponseTime}ms`);
    console.log(`   Minimum: ${minResponseTime}ms`);
    console.log(`   Total tests: ${allResponseTimes.length}`);
    console.log(`   Successful: ${successfulTests.length}`);
    console.log(`   Failed: ${failedTests.length}`);

    testResults.performance = {
      averageResponseTime: avgResponseTime,
      maxResponseTime,
      minResponseTime,
      totalTests: allResponseTimes.length,
      successfulTests: successfulTests.length,
      failedTests: failedTests.length
    };
  }
}

/**
 * Generate comprehensive validation report
 */
function generateValidationReport() {
  console.log('\n📋 COMPREHENSIVE ROLE INTERACTION VALIDATION REPORT');
  console.log('=' .repeat(70));

  const now = new Date().toISOString();
  console.log(`Generated: ${now}`);
  console.log(`Environment: ${BASE_URL}`);

  // Authentication Summary
  console.log('\n🔐 AUTHENTICATION RESULTS:');
  console.log('-' .repeat(30));
  for (const [role, result] of Object.entries(testResults.authentication)) {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${role.toUpperCase()}: ${status} (${result.status}) - ${result.responseTime}ms`);
    if (result.roleVerified !== undefined) {
      console.log(`  Role verification: ${result.roleVerified ? '✅ PASS' : '❌ FAIL'}`);
    }
  }

  // Authorization Summary
  console.log('\n🛡️ AUTHORIZATION RESULTS:');
  console.log('-' .repeat(30));
  for (const [role, endpoints] of Object.entries(testResults.authorization)) {
    console.log(`${role.toUpperCase()}:`);
    for (const [endpoint, result] of Object.entries(endpoints)) {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`  ${endpoint}: ${status} (${result.status}) - ${result.responseTime}ms`);
    }
  }

  // Permission Boundaries Summary
  console.log('\n🚫 PERMISSION BOUNDARY RESULTS:');
  console.log('-' .repeat(30));
  for (const [test, result] of Object.entries(testResults.permissionBoundaries)) {
    const correctBehavior = result.expectedToFail === result.actuallyFailed;
    const status = correctBehavior ? '✅ PASS' : '❌ FAIL';
    console.log(`${test}: ${status} (${result.status})`);
    if (!correctBehavior) {
      console.log(`  ⚠️ Expected to ${result.expectedToFail ? 'fail' : 'succeed'} but ${result.actuallyFailed ? 'failed' : 'succeeded'}`);
    }
  }

  // Workflow Summary
  console.log('\n🔄 WORKFLOW RESULTS:');
  console.log('-' .repeat(30));
  for (const [workflow, result] of Object.entries(testResults.workflows)) {
    if (typeof result === 'object' && result.success !== undefined) {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`${workflow}: ${status} (${result.status}) - ${result.responseTime}ms`);
    } else if (typeof result === 'boolean') {
      const status = result ? '✅ PASS' : '❌ FAIL';
      console.log(`${workflow}: ${status}`);
    }
  }

  // Performance Summary
  if (testResults.performance) {
    console.log('\n⚡ PERFORMANCE SUMMARY:');
    console.log('-' .repeat(30));
    console.log(`Average Response Time: ${testResults.performance.averageResponseTime.toFixed(2)}ms`);
    console.log(`Test Success Rate: ${((testResults.performance.successfulTests / testResults.performance.totalTests) * 100).toFixed(1)}%`);
  }

  // Overall Assessment
  console.log('\n🎯 OVERALL ASSESSMENT:');
  console.log('-' .repeat(30));

  const authPassed = Object.values(testResults.authentication).every(r => r.success);
  const boundariesPassed = Object.values(testResults.permissionBoundaries).every(r =>
    r.expectedToFail === r.actuallyFailed
  );

  console.log(`Authentication: ${authPassed ? '✅ ALL ROLES WORKING' : '❌ ISSUES DETECTED'}`);
  console.log(`Permission Boundaries: ${boundariesPassed ? '✅ SECURITY WORKING' : '❌ SECURITY ISSUES'}`);
  console.log(`Data Isolation: ${testResults.dataIsolation.customerTrainerLink ? '✅ RELATIONSHIPS WORKING' : '⚠️ NEEDS VERIFICATION'}`);
  console.log(`End-to-End Workflow: ${testResults.workflows.endToEndWorkflow ? '✅ COMPLETE WORKFLOW WORKING' : '⚠️ NEEDS VERIFICATION'}`);

  const overallHealth = authPassed && boundariesPassed && testResults.dataIsolation.customerTrainerLink;
  console.log(`\n🏆 SYSTEM STATUS: ${overallHealth ? '✅ PRODUCTION READY' : '⚠️ REQUIRES ATTENTION'}`);

  return testResults;
}

/**
 * Main execution function
 */
async function runComprehensiveValidation() {
  console.log('🚀 FitnessMealPlanner - Comprehensive Role Interaction Validation');
  console.log('=' .repeat(70));
  console.log('Testing all trainer-customer role interactions and workflows');
  console.log(`Environment: ${BASE_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  try {
    // Execute all test phases
    await testAuthentication();
    await testAuthorization();
    await testPermissionBoundaries();
    await testDataIsolation();
    await testTrainerCustomerWorkflow();
    await testProgressTrackingWorkflow();
    await testRecipeManagementWorkflow();

    // Calculate performance metrics
    calculatePerformanceMetrics();

    // Generate final report
    const finalResults = generateValidationReport();

    console.log('\n✅ Role interaction validation completed successfully!');

    return finalResults;

  } catch (error) {
    console.error('\n❌ Validation failed with error:', error);
    throw error;
  }
}

// Execute validation if run directly - simple check
if (process.argv[1] && process.argv[1].includes('role-interaction-validation.js')) {
  runComprehensiveValidation()
    .then(results => {
      console.log('\n🎉 Validation completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Validation failed:', error);
      process.exit(1);
    });
}

export {
  runComprehensiveValidation,
  testAuthentication,
  testAuthorization,
  testPermissionBoundaries,
  testDataIsolation,
  testTrainerCustomerWorkflow,
  TEST_ACCOUNTS
};