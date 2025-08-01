#!/usr/bin/env tsx

/**
 * Business Logic Test Runner
 * 
 * This script runs comprehensive Puppeteer tests to validate all business logic
 * and role interactions as specified in BUSINESS_LOGIC_SPECIFICATION.md
 * 
 * Prerequisites:
 * 1. Development server running on http://localhost:4000
 * 2. Database with test accounts created
 * 3. Puppeteer dependencies installed
 * 
 * Usage:
 * npm run test:business-logic
 * or
 * npx tsx test/e2e/run-business-logic-tests.ts
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

console.log('🧪 FitnessMealPlanner Business Logic Test Suite');
console.log('='.repeat(50));

// Check if server is running
async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:4000/api/health');
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Verify test accounts exist
async function verifyTestAccounts(): Promise<boolean> {
  try {
    console.log('📋 Verifying test accounts...');
    
    const accounts = [
      { email: 'admin@fitmeal.pro', password: 'Admin123!@#' },
      { email: 'testtrainer@example.com', password: 'TrainerPassword123!' },
      { email: 'testcustomer@example.com', password: 'TestPassword123!' }
    ];
    
    for (const account of accounts) {
      const response = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account)
      });
      
      if (!response.ok) {
        console.error(`❌ Test account ${account.email} login failed`);
        return false;
      }
    }
    
    console.log('✅ All test accounts verified');
    return true;
  } catch (error) {
    console.error('❌ Error verifying test accounts:', error);
    return false;
  }
}

// Run the test suite
async function runTests(): Promise<void> {
  console.log('🚀 Starting business logic validation tests...');
  console.log('');
  
  // Check prerequisites
  console.log('🔍 Checking prerequisites...');
  
  const serverHealthy = await checkServerHealth();
  if (!serverHealthy) {
    console.error('❌ Server is not running on http://localhost:4000');
    console.error('Please start the development server first:');
    console.error('  docker-compose --profile dev up -d');
    process.exit(1);
  }
  console.log('✅ Server is running');
  
  const accountsValid = await verifyTestAccounts();
  if (!accountsValid) {
    console.error('❌ Test accounts are not properly configured');
    console.error('Please ensure test accounts exist with correct credentials');
    process.exit(1);
  }
  
  console.log('');
  console.log('🧪 Running comprehensive business logic tests...');
  console.log('This may take several minutes to complete.');
  console.log('');
  
  // Run vitest with the business logic test file
  const vitestProcess = spawn('npx', [
    'vitest',
    'run',
    'test/e2e/business-logic-validation.test.ts',
    '--reporter=verbose',
    '--run'
  ], {
    cwd: projectRoot,
    stdio: 'inherit'
  });
  
  vitestProcess.on('close', (code) => {
    console.log('');
    console.log('='.repeat(50));
    
    if (code === 0) {
      console.log('✅ All business logic tests passed!');
      console.log('📊 System is functioning according to specification');
      console.log('');
      console.log('📋 Test Coverage Completed:');
      console.log('  ✓ Admin role capabilities and limitations');
      console.log('  ✓ Trainer role capabilities and limitations');
      console.log('  ✓ Customer role capabilities and limitations');
      console.log('  ✓ Inter-role workflow processes');
      console.log('  ✓ Security and permission boundaries');
      console.log('  ✓ Data isolation rules');
      console.log('  ✓ Business rules validation');
      console.log('  ✓ Critical user journeys');
    } else {
      console.log('❌ Some business logic tests failed');
      console.log('🔍 Review the test output above for details');
      console.log('📋 Check BUSINESS_LOGIC_SPECIFICATION.md for expected behavior');
    }
    
    process.exit(code || 0);
  });
  
  vitestProcess.on('error', (error) => {
    console.error('❌ Error running tests:', error);
    process.exit(1);
  });
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n🛑 Test execution interrupted');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test execution terminated');
  process.exit(1);
});

// Start the test suite
runTests().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});