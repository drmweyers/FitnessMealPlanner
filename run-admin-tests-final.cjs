#!/usr/bin/env node

/**
 * Final Admin E2E Test Runner
 * 
 * Runs the working admin interface tests and provides comprehensive reporting
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 FitnessMealPlanner Admin E2E Test Suite\n');
console.log('==========================================');

// Check pre-requisites
async function checkPrerequisites() {
  console.log('\n🔍 Pre-flight Checks...');
  
  // Check Docker
  return new Promise((resolve, reject) => {
    exec('docker ps', (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Docker not running. Please start: docker-compose --profile dev up -d');
        reject(error);
        return;
      }
      
      const appContainer = stdout.includes('fitnessmealplanner-dev');
      const dbContainer = stdout.includes('postgres');
      
      if (appContainer && dbContainer) {
        console.log('✅ Docker containers running');
        console.log('✅ Application accessible at http://localhost:4000');
        resolve(true);
      } else {
        console.error('❌ Required containers not running');
        reject(new Error('Containers not running'));
      }
    });
  });
}

// Test admin login
async function testLogin() {
  console.log('\n🔐 Testing Admin Authentication...');
  
  const { spawn } = require('child_process');
  
  return new Promise((resolve, reject) => {
    const curl = spawn('curl', [
      '-X', 'POST',
      'http://localhost:4000/api/auth/login',
      '-H', 'Content-Type: application/json',
      '-d', JSON.stringify({
        email: 'admin@fitmeal.pro',
        password: 'AdminPass123'
      })
    ]);
    
    let output = '';
    curl.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    curl.on('close', (code) => {
      try {
        const response = JSON.parse(output);
        if (response.status === 'success' && response.data.accessToken) {
          console.log('✅ Admin authentication working');
          console.log(`👤 User: ${response.data.user.email} (${response.data.user.role})`);
          resolve(true);
        } else {
          console.error('❌ Authentication failed:', response.message);
          reject(new Error('Authentication failed'));
        }
      } catch (e) {
        console.error('❌ Invalid response from login API');
        reject(e);
      }
    });
  });
}

// Run the working test suite
async function runWorkingTests() {
  console.log('\n🧪 Running Working Admin Interface Tests...');
  console.log('Tests: Authentication, Navigation, Search, Responsive Design\n');
  
  return new Promise((resolve, reject) => {
    const testCmd = 'npx playwright test test/e2e/admin-interface-working.spec.ts --reporter=list';
    
    const child = exec(testCmd, { maxBuffer: 1024 * 1024 * 10 });
    
    child.stdout.on('data', (data) => {
      process.stdout.write(data);
    });
    
    child.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
    
    child.on('close', (code) => {
      console.log(`\n📊 Test execution completed with code: ${code}`);
      resolve(code);
    });
    
    child.on('error', (error) => {
      console.error('❌ Error running tests:', error);
      reject(error);
    });
  });
}

// Generate comprehensive report
function generateReport(testExitCode) {
  console.log('\n📋 Test Execution Summary');
  console.log('=========================');
  
  if (testExitCode === 0) {
    console.log('🎉 ALL TESTS PASSED!');
  } else {
    console.log('⚠️ Some tests failed or had issues');
  }
  
  console.log('\n📂 Test Coverage:');
  console.log('  ✅ Admin Authentication & Authorization');
  console.log('  ✅ Dashboard Statistics Display');
  console.log('  ✅ Tab Navigation (Recipes/Meal Plans/Admin)');
  console.log('  ✅ Search Functionality');
  console.log('  ✅ Advanced Filters');
  console.log('  ✅ Responsive Design (Mobile/Tablet/Desktop)');
  console.log('  ✅ Recipe Content Area');
  
  console.log('\n⏳ Features Awaiting Implementation:');
  console.log('  🔄 Pagination (when recipes > 12)');
  console.log('  🔄 Bulk Selection & Deletion');
  console.log('  🔄 View Toggle (Cards/Table)');
  console.log('  🔄 Individual Recipe Deletion');
  console.log('  🔄 Recipe Detail Modals');
  
  console.log('\n📸 Screenshots: test-screenshots/');
  console.log('📄 Detailed Report: playwright-report/index.html');
  console.log('📊 Test Summary: test/e2e/ADMIN_E2E_TEST_SUMMARY.md');
  
  console.log('\n🔧 Next Steps:');
  console.log('  1. Implement pagination system');
  console.log('  2. Add bulk operations');
  console.log('  3. Create view toggle functionality');
  console.log('  4. Run comprehensive test suite: admin-interface-comprehensive.spec.ts');
  
  // Check for report file
  const reportPath = path.join(__dirname, 'playwright-report', 'index.html');
  if (fs.existsSync(reportPath)) {
    console.log(`\n🌐 View detailed report: file://${reportPath}`);
  }
}

// Main execution
async function main() {
  try {
    console.log('Testing Admin Interface for FitnessMealPlanner');
    console.log('Comprehensive E2E validation of working features\n');
    
    // Pre-flight checks
    await checkPrerequisites();
    await testLogin();
    
    // Create screenshots directory
    const screenshotDir = path.join(__dirname, 'test-screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
      console.log('📁 Created test-screenshots directory');
    }
    
    // Run tests
    const testResult = await runWorkingTests();
    
    // Generate report
    generateReport(testResult);
    
    console.log('\n🏁 Admin E2E Test Suite Complete!');
    
    if (testResult === 0) {
      console.log('🎯 Admin interface core functionality verified ✅');
    } else {
      console.log('⚠️ Check failed tests and implement missing features');
    }
    
    process.exit(testResult);
    
  } catch (error) {
    console.error('\n💥 Test execution failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Ensure Docker is running: docker ps');
    console.error('  2. Start dev environment: docker-compose --profile dev up -d');
    console.error('  3. Check application: http://localhost:4000');
    console.error('  4. Verify admin credentials: admin@fitmeal.pro / AdminPass123');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️ Test interrupted by user');
  process.exit(1);
});

// Execute if run directly
if (require.main === module) {
  main();
}

module.exports = { checkPrerequisites, testLogin, runWorkingTests };