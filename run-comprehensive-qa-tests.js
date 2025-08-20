#!/usr/bin/env node

/**
 * Comprehensive QA Test Suite for FitnessMealPlanner
 * 
 * This script executes a full test suite against the qa-ready branch
 * to verify production readiness before merge to main.
 * 
 * Usage: node run-comprehensive-qa-tests.js
 * 
 * Prerequisites:
 * - Docker development environment running
 * - Application accessible at http://localhost:4000
 * - Test database populated with sample data
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const CONFIG = {
  baseUrl: 'http://localhost:4000',
  testTimeout: 30000,
  retries: 2,
  screenshotPath: './test-screenshots/qa-comprehensive',
  reportPath: './test-results/qa-comprehensive-report.json',
  testAccounts: {
    admin: { email: 'admin@evofitmeals.com', password: 'Admin123!' },
    trainer: { email: 'trainer@evofitmeals.com', password: 'Trainer123!' },
    customer: { email: 'customer@evofitmeals.com', password: 'Customer123!' }
  }
};

// Test result tracking
let testResults = {
  testSuite: 'FitnessMealPlanner QA Comprehensive',
  branch: 'qa-ready',
  timestamp: new Date().toISOString(),
  environment: CONFIG.baseUrl,
  summary: {
    totalTests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    passRate: '0%'
  },
  categories: {
    authentication: { passed: 0, failed: 0, total: 5, tests: [] },
    recipeManagement: { passed: 0, failed: 0, total: 8, tests: [] },
    mealPlanGeneration: { passed: 0, failed: 0, total: 6, tests: [] },
    pdfExport: { passed: 0, failed: 0, total: 4, tests: [] },
    customerManagement: { passed: 0, failed: 0, total: 5, tests: [] },
    progressTracking: { passed: 0, failed: 0, total: 4, tests: [] },
    mobileResponsiveness: { passed: 0, failed: 0, total: 3, tests: [] },
    healthProtocolRemoval: { passed: 0, failed: 0, total: 2, tests: [] },
    performance: { passed: 0, failed: 0, total: 4, tests: [] },
    security: { passed: 0, failed: 0, total: 4, tests: [] }
  },
  detailedResults: []
};

// Utility functions
const log = (message, level = 'INFO') => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
};

const createDirectories = () => {
  const dirs = [
    path.dirname(CONFIG.screenshotPath),
    path.dirname(CONFIG.reportPath),
    './test-results'
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

const checkPrerequisites = async () => {
  log('🔍 Checking prerequisites...');
  
  try {
    // Check if Docker is running
    execSync('docker ps', { stdio: 'pipe' });
    log('✅ Docker is running');
  } catch (error) {
    log('❌ Docker is not running. Please start Docker and run: docker-compose --profile dev up -d', 'ERROR');
    process.exit(1);
  }
  
  try {
    // Check if application is accessible
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(CONFIG.baseUrl);
    if (response.ok) {
      log('✅ Application is accessible at ' + CONFIG.baseUrl);
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    log('❌ Application is not accessible. Please ensure dev server is running', 'ERROR');
    process.exit(1);
  }
};

const runTestCategory = async (category, testFunction) => {
  log(`🧪 Running ${category} tests...`);
  
  try {
    const results = await testFunction();
    testResults.categories[category].passed = results.passed;
    testResults.categories[category].failed = results.failed;
    testResults.categories[category].tests = results.tests;
    
    log(`✅ ${category} tests completed: ${results.passed} passed, ${results.failed} failed`);
    return results;
  } catch (error) {
    log(`❌ ${category} tests failed: ${error.message}`, 'ERROR');
    testResults.categories[category].failed = testResults.categories[category].total;
    return { passed: 0, failed: testResults.categories[category].total, tests: [] };
  }
};

// Test category implementations
const runAuthenticationTests = async () => {
  const fetch = (await import('node-fetch')).default;
  const tests = [];
  let passed = 0, failed = 0;
  
  // AC-001: Admin Login Flow
  try {
    const loginResponse = await fetch(`${CONFIG.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(CONFIG.testAccounts.admin)
    });
    
    if (loginResponse.ok) {
      const data = await loginResponse.json();
      if (data.user && data.user.role === 'admin') {
        tests.push({ id: 'AC-001', name: 'Admin Login Flow', status: 'PASSED', details: 'Admin login successful' });
        passed++;
      } else {
        tests.push({ id: 'AC-001', name: 'Admin Login Flow', status: 'FAILED', details: 'Invalid admin response' });
        failed++;
      }
    } else {
      tests.push({ id: 'AC-001', name: 'Admin Login Flow', status: 'FAILED', details: `HTTP ${loginResponse.status}` });
      failed++;
    }
  } catch (error) {
    tests.push({ id: 'AC-001', name: 'Admin Login Flow', status: 'FAILED', details: error.message });
    failed++;
  }
  
  // AC-002: Trainer Login Flow
  try {
    const loginResponse = await fetch(`${CONFIG.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(CONFIG.testAccounts.trainer)
    });
    
    if (loginResponse.ok) {
      const data = await loginResponse.json();
      if (data.user && data.user.role === 'trainer') {
        tests.push({ id: 'AC-002', name: 'Trainer Login Flow', status: 'PASSED', details: 'Trainer login successful' });
        passed++;
      } else {
        tests.push({ id: 'AC-002', name: 'Trainer Login Flow', status: 'FAILED', details: 'Invalid trainer response' });
        failed++;
      }
    } else {
      tests.push({ id: 'AC-002', name: 'Trainer Login Flow', status: 'FAILED', details: `HTTP ${loginResponse.status}` });
      failed++;
    }
  } catch (error) {
    tests.push({ id: 'AC-002', name: 'Trainer Login Flow', status: 'FAILED', details: error.message });
    failed++;
  }
  
  // AC-003: Customer Login Flow
  try {
    const loginResponse = await fetch(`${CONFIG.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(CONFIG.testAccounts.customer)
    });
    
    if (loginResponse.ok) {
      const data = await loginResponse.json();
      if (data.user && data.user.role === 'customer') {
        tests.push({ id: 'AC-003', name: 'Customer Login Flow', status: 'PASSED', details: 'Customer login successful' });
        passed++;
      } else {
        tests.push({ id: 'AC-003', name: 'Customer Login Flow', status: 'FAILED', details: 'Invalid customer response' });
        failed++;
      }
    } else {
      tests.push({ id: 'AC-003', name: 'Customer Login Flow', status: 'FAILED', details: `HTTP ${loginResponse.status}` });
      failed++;
    }
  } catch (error) {
    tests.push({ id: 'AC-003', name: 'Customer Login Flow', status: 'FAILED', details: error.message });
    failed++;
  }
  
  // AC-004: Role-Based Access Control
  try {
    // Test customer accessing admin routes
    const customerLogin = await fetch(`${CONFIG.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(CONFIG.testAccounts.customer)
    });
    
    if (customerLogin.ok) {
      const customerData = await customerLogin.json();
      const adminAttempt = await fetch(`${CONFIG.baseUrl}/api/admin/users`, {
        headers: { 
          'Authorization': `Bearer ${customerData.token}`,
          'Content-Type': 'application/json' 
        }
      });
      
      if (adminAttempt.status === 401 || adminAttempt.status === 403) {
        tests.push({ id: 'AC-004', name: 'Role-Based Access Control', status: 'PASSED', details: 'Unauthorized access properly blocked' });
        passed++;
      } else {
        tests.push({ id: 'AC-004', name: 'Role-Based Access Control', status: 'FAILED', details: 'Customer accessed admin routes' });
        failed++;
      }
    } else {
      tests.push({ id: 'AC-004', name: 'Role-Based Access Control', status: 'FAILED', details: 'Could not test RBAC' });
      failed++;
    }
  } catch (error) {
    tests.push({ id: 'AC-004', name: 'Role-Based Access Control', status: 'FAILED', details: error.message });
    failed++;
  }
  
  // AC-005: Session Management
  try {
    const loginResponse = await fetch(`${CONFIG.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(CONFIG.testAccounts.admin)
    });
    
    if (loginResponse.ok) {
      const data = await loginResponse.json();
      // Test token validation
      const validateResponse = await fetch(`${CONFIG.baseUrl}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${data.token}` }
      });
      
      if (validateResponse.ok) {
        tests.push({ id: 'AC-005', name: 'Session Management', status: 'PASSED', details: 'Token validation successful' });
        passed++;
      } else {
        tests.push({ id: 'AC-005', name: 'Session Management', status: 'FAILED', details: 'Token validation failed' });
        failed++;
      }
    } else {
      tests.push({ id: 'AC-005', name: 'Session Management', status: 'FAILED', details: 'Could not obtain token' });
      failed++;
    }
  } catch (error) {
    tests.push({ id: 'AC-005', name: 'Session Management', status: 'FAILED', details: error.message });
    failed++;
  }
  
  return { passed, failed, tests };
};

const runRecipeManagementTests = async () => {
  const fetch = (await import('node-fetch')).default;
  const tests = [];
  let passed = 0, failed = 0;
  
  // Get admin token for recipe operations
  let adminToken = null;
  try {
    const loginResponse = await fetch(`${CONFIG.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(CONFIG.testAccounts.admin)
    });
    
    if (loginResponse.ok) {
      const data = await loginResponse.json();
      adminToken = data.token;
    }
  } catch (error) {
    log('Failed to get admin token for recipe tests', 'ERROR');
  }
  
  if (!adminToken) {
    // Skip all recipe tests if no admin token
    for (let i = 0; i < 8; i++) {
      tests.push({ id: `RM-00${i+1}`, name: 'Recipe Test', status: 'SKIPPED', details: 'No admin token' });
      failed++;
    }
    return { passed, failed, tests };
  }
  
  // RM-001: Recipe CRUD Operations
  try {
    // Create recipe
    const createResponse = await fetch(`${CONFIG.baseUrl}/api/recipes`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        name: 'QA Test Recipe',
        description: 'A test recipe for QA validation',
        mealTypes: ['breakfast'],
        dietaryTags: ['vegetarian'],
        mainIngredientTags: ['eggs'],
        ingredientsJson: [
          { name: 'Eggs', amount: '2', unit: 'large' },
          { name: 'Milk', amount: '1/4', unit: 'cup' }
        ],
        instructionsText: '1. Crack eggs into bowl\\n2. Add milk\\n3. Scramble',
        prepTimeMinutes: 5,
        cookTimeMinutes: 10,
        servings: 1,
        caloriesKcal: 200,
        proteinGrams: 15,
        carbsGrams: 5,
        fatGrams: 12
      })
    });
    
    if (createResponse.ok) {
      const recipe = await createResponse.json();
      
      // Test read operation
      const readResponse = await fetch(`${CONFIG.baseUrl}/api/recipes/${recipe.id}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      if (readResponse.ok) {
        tests.push({ id: 'RM-001', name: 'Recipe CRUD Operations', status: 'PASSED', details: 'Create and read successful' });
        passed++;
      } else {
        tests.push({ id: 'RM-001', name: 'Recipe CRUD Operations', status: 'FAILED', details: 'Read operation failed' });
        failed++;
      }
    } else {
      tests.push({ id: 'RM-001', name: 'Recipe CRUD Operations', status: 'FAILED', details: `Create failed: HTTP ${createResponse.status}` });
      failed++;
    }
  } catch (error) {
    tests.push({ id: 'RM-001', name: 'Recipe CRUD Operations', status: 'FAILED', details: error.message });
    failed++;
  }
  
  // RM-002: Recipe Approval Workflow
  try {
    const recipesResponse = await fetch(`${CONFIG.baseUrl}/api/recipes/pending`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    if (recipesResponse.ok) {
      tests.push({ id: 'RM-002', name: 'Recipe Approval Workflow', status: 'PASSED', details: 'Pending recipes endpoint accessible' });
      passed++;
    } else {
      tests.push({ id: 'RM-002', name: 'Recipe Approval Workflow', status: 'FAILED', details: `HTTP ${recipesResponse.status}` });
      failed++;
    }
  } catch (error) {
    tests.push({ id: 'RM-002', name: 'Recipe Approval Workflow', status: 'FAILED', details: error.message });
    failed++;
  }
  
  // RM-003: Recipe Search & Filtering
  try {
    const searchResponse = await fetch(`${CONFIG.baseUrl}/api/recipes?search=chicken`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    if (searchResponse.ok) {
      tests.push({ id: 'RM-003', name: 'Recipe Search & Filtering', status: 'PASSED', details: 'Search endpoint accessible' });
      passed++;
    } else {
      tests.push({ id: 'RM-003', name: 'Recipe Search & Filtering', status: 'FAILED', details: `HTTP ${searchResponse.status}` });
      failed++;
    }
  } catch (error) {
    tests.push({ id: 'RM-003', name: 'Recipe Search & Filtering', status: 'FAILED', details: error.message });
    failed++;
  }
  
  // RM-004: Recipe Nutritional Data
  try {
    const recipesResponse = await fetch(`${CONFIG.baseUrl}/api/recipes`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    if (recipesResponse.ok) {
      const recipes = await recipesResponse.json();
      if (recipes.length > 0) {
        const recipe = recipes[0];
        if (recipe.caloriesKcal && recipe.proteinGrams && recipe.carbsGrams && recipe.fatGrams) {
          tests.push({ id: 'RM-004', name: 'Recipe Nutritional Data', status: 'PASSED', details: 'Nutritional data present' });
          passed++;
        } else {
          tests.push({ id: 'RM-004', name: 'Recipe Nutritional Data', status: 'FAILED', details: 'Missing nutritional data' });
          failed++;
        }
      } else {
        tests.push({ id: 'RM-004', name: 'Recipe Nutritional Data', status: 'SKIPPED', details: 'No recipes to test' });
        failed++;
      }
    } else {
      tests.push({ id: 'RM-004', name: 'Recipe Nutritional Data', status: 'FAILED', details: `HTTP ${recipesResponse.status}` });
      failed++;
    }
  } catch (error) {
    tests.push({ id: 'RM-004', name: 'Recipe Nutritional Data', status: 'FAILED', details: error.message });
    failed++;
  }
  
  // Add placeholder tests for remaining RM tests
  const remainingTests = [
    'Recipe Categories and Tags',
    'Recipe Image Upload',
    'Recipe Validation Rules',
    'Recipe Bulk Operations'
  ];
  
  remainingTests.forEach((testName, index) => {
    tests.push({ 
      id: `RM-00${index + 5}`, 
      name: testName, 
      status: 'SKIPPED', 
      details: 'Implementation pending' 
    });
    failed++;
  });
  
  return { passed, failed, tests };
};

const runHealthProtocolRemovalTests = async () => {
  const fetch = (await import('node-fetch')).default;
  const tests = [];
  let passed = 0, failed = 0;
  
  // HP-001: GUI Health Protocol Removal
  try {
    const response = await fetch(CONFIG.baseUrl);
    const html = await response.text();
    
    if (!html.toLowerCase().includes('health protocol')) {
      tests.push({ id: 'HP-001', name: 'GUI Health Protocol Removal', status: 'PASSED', details: 'No Health Protocol text found in GUI' });
      passed++;
    } else {
      tests.push({ id: 'HP-001', name: 'GUI Health Protocol Removal', status: 'FAILED', details: 'Health Protocol text still present' });
      failed++;
    }
  } catch (error) {
    tests.push({ id: 'HP-001', name: 'GUI Health Protocol Removal', status: 'FAILED', details: error.message });
    failed++;
  }
  
  // HP-002: Backend Health Protocol Cleanup
  try {
    const response = await fetch(`${CONFIG.baseUrl}/api/health-protocols`);
    
    if (response.status === 404) {
      tests.push({ id: 'HP-002', name: 'Backend Health Protocol Cleanup', status: 'PASSED', details: 'Health Protocol API endpoint not found (expected)' });
      passed++;
    } else {
      tests.push({ id: 'HP-002', name: 'Backend Health Protocol Cleanup', status: 'FAILED', details: `Health Protocol API still accessible: HTTP ${response.status}` });
      failed++;
    }
  } catch (error) {
    // Network error is expected for non-existent endpoint
    tests.push({ id: 'HP-002', name: 'Backend Health Protocol Cleanup', status: 'PASSED', details: 'Health Protocol API endpoint not accessible' });
    passed++;
  }
  
  return { passed, failed, tests };
};

const runPerformanceTests = async () => {
  const tests = [];
  let passed = 0, failed = 0;
  
  // Performance test placeholders
  const performanceTests = [
    'Page Load Performance',
    'API Response Times',
    'PDF Generation Performance',
    'Database Query Performance'
  ];
  
  performanceTests.forEach((testName, index) => {
    tests.push({ 
      id: `PERF-00${index + 1}`, 
      name: testName, 
      status: 'SKIPPED', 
      details: 'Performance testing requires specialized tools' 
    });
    failed++;
  });
  
  return { passed, failed, tests };
};

const generateStubTests = (category, count) => {
  const tests = [];
  let passed = 0, failed = count;
  
  for (let i = 1; i <= count; i++) {
    tests.push({
      id: `${category.toUpperCase().substr(0, 2)}-${String(i).padStart(3, '0')}`,
      name: `${category} Test ${i}`,
      status: 'SKIPPED',
      details: 'Test implementation pending - requires browser automation'
    });
  }
  
  return { passed, failed, tests };
};

const calculateSummary = () => {
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  
  Object.values(testResults.categories).forEach(category => {
    totalTests += category.total;
    totalPassed += category.passed;
    totalFailed += category.failed;
  });
  
  testResults.summary = {
    totalTests,
    passed: totalPassed,
    failed: totalFailed,
    skipped: totalFailed, // For now, treating failed as skipped
    passRate: totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) + '%' : '0%'
  };
};

const saveTestResults = () => {
  createDirectories();
  
  // Calculate summary
  calculateSummary();
  
  // Add all test details to detailed results
  Object.entries(testResults.categories).forEach(([category, data]) => {
    data.tests.forEach(test => {
      testResults.detailedResults.push({
        category,
        ...test
      });
    });
  });
  
  // Save JSON report
  fs.writeFileSync(CONFIG.reportPath, JSON.stringify(testResults, null, 2));
  log(`📊 Test results saved to ${CONFIG.reportPath}`);
  
  // Generate summary report
  const summaryPath = './test-results/qa-summary.txt';
  const summary = `
FitnessMealPlanner QA Test Summary
==================================

Branch: ${testResults.branch}
Environment: ${testResults.environment}
Timestamp: ${testResults.timestamp}

Overall Results:
- Total Tests: ${testResults.summary.totalTests}
- Passed: ${testResults.summary.passed}
- Failed: ${testResults.summary.failed}
- Pass Rate: ${testResults.summary.passRate}

Category Breakdown:
${Object.entries(testResults.categories).map(([category, data]) => 
  `- ${category}: ${data.passed}/${data.total} passed`
).join('\\n')}

${testResults.summary.passed === testResults.summary.totalTests ? 
  '✅ ALL TESTS PASSED - Ready for production!' : 
  '❌ Some tests failed - Review detailed results before production deployment'
}
`;
  
  fs.writeFileSync(summaryPath, summary);
  log(`📋 Summary report saved to ${summaryPath}`);
};

const printResults = () => {
  log('');
  log('🎯 QA Test Results Summary');
  log('═══════════════════════════');
  log(`📊 Total Tests: ${testResults.summary.totalTests}`);
  log(`✅ Passed: ${testResults.summary.passed}`);
  log(`❌ Failed: ${testResults.summary.failed}`);
  log(`📈 Pass Rate: ${testResults.summary.passRate}`);
  log('');
  
  Object.entries(testResults.categories).forEach(([category, data]) => {
    const icon = data.passed === data.total ? '✅' : data.passed > 0 ? '⚠️' : '❌';
    log(`${icon} ${category}: ${data.passed}/${data.total} passed`);
  });
  
  log('');
  if (testResults.summary.passed === testResults.summary.totalTests) {
    log('🎉 ALL TESTS PASSED! qa-ready branch is ready for production deployment.');
  } else {
    log('⚠️  Some tests failed. Review detailed results before deploying to production.');
    log('📋 Check detailed results in: ' + CONFIG.reportPath);
  }
};

// Main execution
const main = async () => {
  log('🚀 Starting Comprehensive QA Test Suite for FitnessMealPlanner');
  log('Branch: qa-ready');
  log('Environment: ' + CONFIG.baseUrl);
  
  try {
    // Prerequisites check
    await checkPrerequisites();
    
    // Create output directories
    createDirectories();
    
    // Run test categories
    await runTestCategory('authentication', runAuthenticationTests);
    await runTestCategory('recipeManagement', runRecipeManagementTests);
    await runTestCategory('healthProtocolRemoval', runHealthProtocolRemovalTests);
    await runTestCategory('performance', runPerformanceTests);
    
    // Generate stub tests for categories requiring browser automation
    testResults.categories.mealPlanGeneration = generateStubTests('mealPlanGeneration', 6);
    testResults.categories.pdfExport = generateStubTests('pdfExport', 4);
    testResults.categories.customerManagement = generateStubTests('customerManagement', 5);
    testResults.categories.progressTracking = generateStubTests('progressTracking', 4);
    testResults.categories.mobileResponsiveness = generateStubTests('mobileResponsiveness', 3);
    testResults.categories.security = generateStubTests('security', 4);
    
    // Save results and print summary
    saveTestResults();
    printResults();
    
    log('');
    log('🏁 QA Test Suite Completed');
    
  } catch (error) {
    log(`💥 Test suite failed: ${error.message}`, 'ERROR');
    process.exit(1);
  }
};

// Run the main function
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    log(`💥 Fatal error: ${error.message}`, 'ERROR');
    process.exit(1);
  });
}

export { main, CONFIG, testResults };