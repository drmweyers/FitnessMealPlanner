#!/usr/bin/env node

/**
 * Admin E2E Test Runner
 * 
 * Runs comprehensive end-to-end tests for admin interface features
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Admin E2E Test Suite...\n');

// Check if Docker is running
function checkDockerStatus() {
  return new Promise((resolve, reject) => {
    exec('docker ps', (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Docker is not running or accessible');
        console.error('Please start Docker and run: docker-compose --profile dev up -d');
        reject(error);
        return;
      }
      
      const lines = stdout.split('\n');
      const appContainer = lines.find(line => line.includes('fitnessmealplanner-dev'));
      
      if (appContainer) {
        console.log('✅ Docker dev environment is running');
        console.log(`Container: ${appContainer.split(/\s+/)[0]}`);
        resolve(true);
      } else {
        console.error('❌ FitnessMealPlanner dev container not running');
        console.error('Please run: docker-compose --profile dev up -d');
        reject(new Error('Dev container not running'));
      }
    });
  });
}

// Test application accessibility
function testAppAccessibility() {
  return new Promise((resolve, reject) => {
    const http = require('http');
    
    const req = http.request({
      hostname: 'localhost',
      port: 4000,
      path: '/',
      method: 'GET',
      timeout: 5000
    }, (res) => {
      if (res.statusCode === 200) {
        console.log('✅ Application is accessible at http://localhost:4000');
        resolve(true);
      } else {
        console.error(`❌ Application returned status: ${res.statusCode}`);
        reject(new Error(`HTTP ${res.statusCode}`));
      }
    });
    
    req.on('error', (err) => {
      console.error('❌ Cannot connect to application');
      console.error('Please ensure the dev server is running');
      reject(err);
    });
    
    req.on('timeout', () => {
      console.error('❌ Connection timeout to application');
      req.destroy();
      reject(new Error('Connection timeout'));
    });
    
    req.end();
  });
}

// Create test directories
function createTestDirectories() {
  const dirs = ['test-screenshots', 'playwright-report'];
  
  dirs.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
}

// Run Playwright tests
function runPlaywrightTests(testPattern = '') {
  return new Promise((resolve, reject) => {
    const testCmd = testPattern 
      ? `npx playwright test ${testPattern}` 
      : 'npx playwright test test/e2e/admin-interface-comprehensive.spec.ts test/e2e/admin-pagination-detailed.spec.ts test/e2e/admin-bulk-operations.spec.ts';
    
    console.log(`\n🧪 Running tests: ${testCmd}\n`);
    
    const child = exec(testCmd, { maxBuffer: 1024 * 1024 * 10 }); // 10MB buffer
    
    child.stdout.on('data', (data) => {
      process.stdout.write(data);
    });
    
    child.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
    
    child.on('close', (code) => {
      console.log(`\n📊 Test process finished with code: ${code}`);
      
      if (code === 0) {
        console.log('✅ All tests passed!');
        resolve(code);
      } else {
        console.log('⚠️ Some tests failed or had issues');
        resolve(code); // Still resolve to continue with report generation
      }
    });
    
    child.on('error', (error) => {
      console.error('❌ Error running tests:', error);
      reject(error);
    });
  });
}

// Generate test report summary
function generateTestSummary() {
  console.log('\n📋 Test Summary:');
  console.log('================');
  
  const testFiles = [
    'admin-interface-comprehensive.spec.ts - Main admin interface features',
    'admin-pagination-detailed.spec.ts - Detailed pagination testing', 
    'admin-bulk-operations.spec.ts - Bulk selection and deletion'
  ];
  
  testFiles.forEach((file, index) => {
    console.log(`${index + 1}. ${file}`);
  });
  
  console.log('\n📸 Screenshots saved to: test-screenshots/');
  console.log('📊 Detailed report: playwright-report/index.html');
  console.log('🎯 JSON results: test-results.json');
  
  // Check if report exists
  const reportPath = path.join(__dirname, 'playwright-report', 'index.html');
  if (fs.existsSync(reportPath)) {
    console.log('\n🌐 Open report in browser:');
    console.log(`file://${reportPath}`);
  }
}

// Main execution
async function main() {
  try {
    // Pre-flight checks
    console.log('🔍 Pre-flight checks...');
    await checkDockerStatus();
    await testAppAccessibility();
    
    // Setup
    console.log('\n📋 Setting up test environment...');
    createTestDirectories();
    
    // Get test pattern from command line
    const testPattern = process.argv[2] || '';
    if (testPattern) {
      console.log(`🎯 Running specific test pattern: ${testPattern}`);
    }
    
    // Run tests
    console.log('\n🚀 Starting test execution...');
    const exitCode = await runPlaywrightTests(testPattern);
    
    // Summary
    generateTestSummary();
    
    console.log('\n🏁 Test execution completed!');
    console.log('Check the outputs above for detailed results.\n');
    
    process.exit(exitCode);
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    console.error('Please resolve the issues and try again.\n');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️ Test execution interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️ Test execution terminated');
  process.exit(1);
});

// Execute if run directly
if (require.main === module) {
  main();
}

module.exports = { checkDockerStatus, testAppAccessibility, runPlaywrightTests };