/**
 * Master Test Runner for FitMeal Pro Backend
 * Runs all test suites and provides comprehensive reporting
 */

import { runAllTests as runBasicTests } from './backend.test.js';
import { DatabaseTestSuite } from './database.test.js';
import { APITestSuite } from './api.test.js';

class MasterTestRunner {
  constructor() {
    this.startTime = Date.now();
    this.results = {
      basic: null,
      database: null,
      api: null
    };
  }

  async runBasicTests() {
    console.log('\n🚀 PHASE 1: Running Basic Backend Tests');
    console.log('='.repeat(60));
    
    try {
      const success = await runBasicTests();
      this.results.basic = { success, error: null };
      return success;
    } catch (error) {
      console.error('Basic tests failed:', error.message);
      this.results.basic = { success: false, error: error.message };
      return false;
    }
  }

  async runDatabaseTests() {
    console.log('\n🗄️  PHASE 2: Running Database Tests');
    console.log('='.repeat(60));
    
    try {
      const dbTestSuite = new DatabaseTestSuite();
      const result = await dbTestSuite.runAllTests();
      this.results.database = result;
      return result.success;
    } catch (error) {
      console.error('Database tests failed:', error.message);
      this.results.database = { success: false, error: error.message };
      return false;
    }
  }

  async runAPITests() {
    console.log('\n🌐 PHASE 3: Running API Tests');
    console.log('='.repeat(60));
    
    try {
      const apiTestSuite = new APITestSuite();
      const result = await apiTestSuite.runAllTests();
      this.results.api = result;
      return result.success;
    } catch (error) {
      console.error('API tests failed:', error.message);
      this.results.api = { success: false, error: error.message };
      return false;
    }
  }

  generateReport() {
    const totalDuration = Date.now() - this.startTime;
    
    console.log('\n📊 COMPREHENSIVE TEST REPORT');
    console.log('='.repeat(60));
    console.log(`Total Execution Time: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
    console.log(`Test Run Completed: ${new Date().toISOString()}`);
    
    // Basic Tests Summary
    if (this.results.basic) {
      console.log('\n📋 Basic Tests:');
      console.log(`  Status: ${this.results.basic.success ? '✅ PASSED' : '❌ FAILED'}`);
      if (this.results.basic.error) {
        console.log(`  Error: ${this.results.basic.error}`);
      }
    }
    
    // Database Tests Summary
    if (this.results.database) {
      console.log('\n🗄️  Database Tests:');
      console.log(`  Status: ${this.results.database.success ? '✅ PASSED' : '❌ FAILED'}`);
      if (this.results.database.summary) {
        console.log(`  Passed: ${this.results.database.summary.passed}`);
        console.log(`  Failed: ${this.results.database.summary.failed}`);
        console.log(`  Duration: ${this.results.database.summary.totalTime}ms`);
      }
      if (this.results.database.error) {
        console.log(`  Error: ${this.results.database.error}`);
      }
    }
    
    // API Tests Summary
    if (this.results.api) {
      console.log('\n🌐 API Tests:');
      console.log(`  Status: ${this.results.api.success ? '✅ PASSED' : '❌ FAILED'}`);
      if (this.results.api.summary) {
        console.log(`  Passed: ${this.results.api.summary.passed}`);
        console.log(`  Failed: ${this.results.api.summary.failed}`);
        console.log(`  Duration: ${this.results.api.summary.totalTime}ms`);
      }
      if (this.results.api.error) {
        console.log(`  Error: ${this.results.api.error}`);
      }
    }
    
    // Overall Summary
    const allPassed = this.results.basic?.success && 
                     this.results.database?.success && 
                     this.results.api?.success;
    
    console.log('\n🎯 OVERALL RESULTS:');
    console.log('='.repeat(30));
    console.log(`Backend Health: ${allPassed ? '🟢 HEALTHY' : '🔴 ISSUES DETECTED'}`);
    
    if (allPassed) {
      console.log('\n🎉 All test suites passed successfully!');
      console.log('✅ Database connections are stable');
      console.log('✅ API endpoints are responding correctly');
      console.log('✅ Authentication is working properly');
      console.log('✅ Data operations are functioning');
      console.log('✅ Performance is within acceptable limits');
    } else {
      console.log('\n⚠️  Some tests failed. Issues detected:');
      
      if (!this.results.basic?.success) {
        console.log('❌ Basic backend functionality issues');
      }
      if (!this.results.database?.success) {
        console.log('❌ Database operation issues');
      }
      if (!this.results.api?.success) {
        console.log('❌ API endpoint issues');
      }
      
      console.log('\n🔧 Recommended Actions:');
      console.log('1. Check database connection and configuration');
      console.log('2. Verify all required environment variables are set');
      console.log('3. Ensure the server is running on the correct port');
      console.log('4. Review server logs for detailed error information');
    }
    
    return allPassed;
  }

  async runAll() {
    console.log('🧪 FitMeal Pro Backend - Comprehensive Test Suite');
    console.log('='.repeat(60));
    console.log('Running all backend tests to ensure system health...\n');
    
    // Run tests in sequence
    const basicSuccess = await this.runBasicTests();
    const databaseSuccess = await this.runDatabaseTests();
    const apiSuccess = await this.runAPITests();
    
    // Generate comprehensive report
    const overallSuccess = this.generateReport();
    
    return {
      success: overallSuccess,
      results: this.results,
      duration: Date.now() - this.startTime
    };
  }
}

// Health check function for quick validation
async function quickHealthCheck() {
  console.log('🏥 Quick Backend Health Check');
  console.log('='.repeat(40));
  
  const fetch = (await import('node-fetch')).default;
  const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';
  
  const checks = [
    {
      name: 'Server Response',
      test: async () => {
        const response = await fetch(BASE_URL);
        return response.status < 500;
      }
    },
    {
      name: 'Recipe API',
      test: async () => {
        const response = await fetch(`${BASE_URL}/api/recipes?limit=1`);
        return response.status === 200;
      }
    },
    {
      name: 'Auth API',
      test: async () => {
        const response = await fetch(`${BASE_URL}/api/auth/user`);
        return response.status === 401; // Should be unauthorized
      }
    }
  ];
  
  for (const check of checks) {
    try {
      const result = await check.test();
      console.log(`${result ? '✅' : '❌'} ${check.name}`);
    } catch (error) {
      console.log(`❌ ${check.name} - Error: ${error.message}`);
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.includes('--quick') || args.includes('-q')) {
    // Quick health check
    quickHealthCheck()
      .then(() => process.exit(0))
      .catch(error => {
        console.error('Health check failed:', error);
        process.exit(1);
      });
  } else {
    // Full test suite
    const runner = new MasterTestRunner();
    runner.runAll()
      .then(result => {
        process.exit(result.success ? 0 : 1);
      })
      .catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
      });
  }
}

export { MasterTestRunner, quickHealthCheck };