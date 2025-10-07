#!/usr/bin/env tsx

import { spawn } from 'child_process';
import path from 'path';

/**
 * Dedicated test runner for Customer Invitation Feature
 * 
 * This script runs only the customer invitation tests to verify
 * the fix for the JSON parsing error is working correctly.
 */
async function runInvitationTests(): Promise<void> {
  console.log('🧪 Running Customer Invitation Feature Tests...\n');
  
  // Check if application is running
  console.log('🔍 Checking if application is running...');
  try {
    const response = await fetch('http://localhost:4000/health');
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    console.log('✅ Application is running and healthy\n');
  } catch (error) {
    console.error('❌ Application health check failed:');
    console.error('   Make sure the application is running at http://localhost:4000');
    console.error('   Run: cd FitnessMealPlanner && docker-compose --profile dev up\n');
    process.exit(1);
  }

  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.TEST_BASE_URL = 'http://localhost:4000';

  const testFile = path.join(process.cwd(), 'test/gui/specs/customer-invitation.test.ts');
  
  console.log('🚀 Starting customer invitation tests...\n');
  
  return new Promise((resolve, reject) => {
    const child = spawn('npx', [
      'vitest', 
      'run', 
      testFile,
      '--config=test/gui/vitest.gui.config.ts',
      '--reporter=verbose'
    ], {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd()
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log('\n🎉 Customer invitation tests completed successfully!');
        console.log('\n✅ Key Features Verified:');
        console.log('   • Trainer can send customer invitations');
        console.log('   • JSON parsing error has been fixed');
        console.log('   • API endpoints are working correctly');
        console.log('   • Success notifications are displayed');
        console.log('   • Invitations appear in recent list');
        console.log('   • Form validation works properly');
        console.log('   • Duplicate invitation handling works');
        resolve();
      } else {
        console.error(`\n❌ Tests failed with exit code ${code}`);
        reject(new Error(`Tests failed with code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      console.error('\n❌ Failed to run tests:', error);
      reject(error);
    });
  });
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runInvitationTests().catch(error => {
    console.error('❌ Invitation test runner failed:', error);
    process.exit(1);
  });
}

export { runInvitationTests };