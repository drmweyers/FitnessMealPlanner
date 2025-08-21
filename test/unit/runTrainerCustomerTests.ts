/**
 * Test Runner for Trainer-Customer Relationship Unit Tests
 * 
 * Executes the comprehensive unit test suite for trainer-customer functionality
 * with proper setup, teardown, and reporting.
 */

import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';
import { setupTestEnvironment, TestDatabase, checkTestDatabaseHealth, testConfig } from './testSetup';
import path from 'path';
import fs from 'fs';

// Test suite configuration
const TEST_SUITE_CONFIG = {
  testFiles: [
    'trainerCustomerRelationships.test.ts',
    'customerInvitationSystem.test.ts', 
    'mealPlanAssignmentWorkflows.test.ts',
    'profileManagementCRUD.test.ts',
    'authenticationAuthorizationFlows.test.ts',
    'dataValidation.test.ts',
  ],
  testDirectory: path.join(__dirname),
  timeout: 30000, // 30 seconds per test file
  retries: 2,
  parallel: false, // Run sequentially to avoid database conflicts
};

/**
 * Test Suite Results Interface
 */
interface TestResult {
  file: string;
  success: boolean;
  duration: number;
  passed: number;
  failed: number;
  skipped: number;
  errors: string[];
}

interface TestSuiteResults {
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalSkipped: number;
  duration: number;
  results: TestResult[];
}

/**
 * Test Runner Class
 */
class TrainerCustomerTestRunner {
  private results: TestSuiteResults = {
    totalFiles: 0,
    successfulFiles: 0,
    failedFiles: 0,
    totalTests: 0,
    totalPassed: 0,
    totalFailed: 0,
    totalSkipped: 0,
    duration: 0,
    results: [],
  };

  /**
   * Run the complete test suite
   */
  async runTests(): Promise<TestSuiteResults> {
    const startTime = Date.now();

    try {
      console.log('🚀 Starting Trainer-Customer Relationship Test Suite');
      console.log('=' .repeat(60));

      // Pre-flight checks
      await this.preFlightChecks();

      // Setup test environment
      await this.setupEnvironment();

      // Run all test files
      await this.executeTestFiles();

      // Generate report
      this.results.duration = Date.now() - startTime;
      await this.generateReport();

      console.log('✅ Test suite completed successfully');
      return this.results;

    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.results.duration = Date.now() - startTime;
      throw error;
    }
  }

  /**
   * Pre-flight checks before running tests
   */
  private async preFlightChecks(): Promise<void> {
    console.log('🔍 Running pre-flight checks...');

    // Check if test files exist
    for (const file of TEST_SUITE_CONFIG.testFiles) {
      const filePath = path.join(TEST_SUITE_CONFIG.testDirectory, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Test file not found: ${file}`);
      }
    }

    // Check database health
    const dbHealthy = await checkTestDatabaseHealth();
    if (!dbHealthy) {
      throw new Error('Test database is not accessible');
    }

    // Check required environment variables
    const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar] && !testConfig.auth.jwtSecret) {
        console.warn(`⚠️  Environment variable ${envVar} not set`);
      }
    }

    console.log('✅ Pre-flight checks passed');
  }

  /**
   * Setup test environment
   */
  private async setupEnvironment(): Promise<void> {
    console.log('🔧 Setting up test environment...');

    // Initialize test database
    const testDb = TestDatabase.getInstance();
    await testDb.setup();

    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = testConfig.auth.jwtSecret;

    console.log('✅ Test environment ready');
  }

  /**
   * Execute all test files
   */
  private async executeTestFiles(): Promise<void> {
    this.results.totalFiles = TEST_SUITE_CONFIG.testFiles.length;

    console.log(`📋 Executing ${this.results.totalFiles} test files...\n`);

    for (const [index, file] of TEST_SUITE_CONFIG.testFiles.entries()) {
      console.log(`[${index + 1}/${this.results.totalFiles}] Running ${file}...`);

      const result = await this.runTestFile(file);
      this.results.results.push(result);

      // Update aggregate results
      if (result.success) {
        this.results.successfulFiles++;
      } else {
        this.results.failedFiles++;
      }
      
      this.results.totalTests += result.passed + result.failed + result.skipped;
      this.results.totalPassed += result.passed;
      this.results.totalFailed += result.failed;
      this.results.totalSkipped += result.skipped;

      // Log result summary
      this.logTestFileResult(result);
    }
  }

  /**
   * Run a single test file
   */
  private async runTestFile(filename: string): Promise<TestResult> {
    const startTime = Date.now();
    const filePath = path.join(TEST_SUITE_CONFIG.testDirectory, filename);

    const result: TestResult = {
      file: filename,
      success: false,
      duration: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };

    try {
      // Run vitest on specific file
      const testOutput = await this.runVitest(filePath);
      
      // Parse test output
      this.parseTestOutput(testOutput, result);
      
      result.success = result.failed === 0;
      result.duration = Date.now() - startTime;

    } catch (error) {
      result.success = false;
      result.duration = Date.now() - startTime;
      result.errors.push(error.message || 'Unknown error');
    }

    return result;
  }

  /**
   * Run vitest command for a specific file
   */
  private async runVitest(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        'run',
        filePath,
        '--reporter=json',
        '--no-coverage',
        `--timeout=${TEST_SUITE_CONFIG.timeout}`,
      ];

      if (TEST_SUITE_CONFIG.retries > 0) {
        args.push(`--retry=${TEST_SUITE_CONFIG.retries}`);
      }

      const child = spawn('npx', ['vitest', ...args], {
        cwd: path.resolve(__dirname, '../..'),
        stdio: 'pipe',
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Test failed with exit code ${code}\nStdout: ${stdout}\nStderr: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });

      // Set timeout
      setTimeout(() => {
        child.kill();
        reject(new Error(`Test timed out after ${TEST_SUITE_CONFIG.timeout}ms`));
      }, TEST_SUITE_CONFIG.timeout);
    });
  }

  /**
   * Parse vitest JSON output
   */
  private parseTestOutput(output: string, result: TestResult): void {
    try {
      // Look for JSON output in the stdout
      const lines = output.split('\n');
      let jsonOutput = null;

      for (const line of lines) {
        if (line.trim().startsWith('{')) {
          try {
            jsonOutput = JSON.parse(line);
            break;
          } catch (e) {
            // Not valid JSON, continue
          }
        }
      }

      if (jsonOutput && jsonOutput.testResults) {
        const testResults = jsonOutput.testResults[0];
        if (testResults) {
          result.passed = testResults.assertionResults.filter(r => r.status === 'passed').length;
          result.failed = testResults.assertionResults.filter(r => r.status === 'failed').length;
          result.skipped = testResults.assertionResults.filter(r => r.status === 'skipped').length;
          
          // Extract error messages
          testResults.assertionResults
            .filter(r => r.status === 'failed')
            .forEach(failedTest => {
              result.errors.push(`${failedTest.title}: ${failedTest.failureMessages.join(', ')}`);
            });
        }
      } else {
        // Fallback: parse text output
        this.parseTextOutput(output, result);
      }
    } catch (error) {
      console.warn('Could not parse test output, using fallback parsing');
      this.parseTextOutput(output, result);
    }
  }

  /**
   * Fallback text parsing for test output
   */
  private parseTextOutput(output: string, result: TestResult): void {
    // Simple regex patterns to extract test results
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);
    const skippedMatch = output.match(/(\d+) skipped/);

    result.passed = passedMatch ? parseInt(passedMatch[1]) : 0;
    result.failed = failedMatch ? parseInt(failedMatch[1]) : 0;
    result.skipped = skippedMatch ? parseInt(skippedMatch[1]) : 0;

    // Extract error information
    if (output.includes('FAIL')) {
      const errorLines = output.split('\n').filter(line => 
        line.includes('✗') || line.includes('Error:') || line.includes('AssertionError')
      );
      result.errors.push(...errorLines);
    }
  }

  /**
   * Log test file result
   */
  private logTestFileResult(result: TestResult): void {
    const statusIcon = result.success ? '✅' : '❌';
    const duration = `${result.duration}ms`;
    const stats = `${result.passed} passed, ${result.failed} failed, ${result.skipped} skipped`;

    console.log(`${statusIcon} ${result.file} (${duration}) - ${stats}`);

    if (!result.success && result.errors.length > 0) {
      console.log('   Errors:');
      result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.substring(0, 100)}...`);
      });
    }

    console.log(''); // Empty line for readability
  }

  /**
   * Generate comprehensive test report
   */
  private async generateReport(): Promise<void> {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUITE SUMMARY');
    console.log('='.repeat(60));

    // Overall statistics
    console.log(`Total Files: ${this.results.totalFiles}`);
    console.log(`Successful: ${this.results.successfulFiles}`);
    console.log(`Failed: ${this.results.failedFiles}`);
    console.log(`Success Rate: ${Math.round((this.results.successfulFiles / this.results.totalFiles) * 100)}%`);
    console.log('');

    console.log(`Total Tests: ${this.results.totalTests}`);
    console.log(`Passed: ${this.results.totalPassed}`);
    console.log(`Failed: ${this.results.totalFailed}`);
    console.log(`Skipped: ${this.results.totalSkipped}`);
    console.log(`Test Success Rate: ${Math.round((this.results.totalPassed / this.results.totalTests) * 100)}%`);
    console.log('');

    console.log(`Total Duration: ${Math.round(this.results.duration / 1000)}s`);
    console.log('');

    // Detailed results
    console.log('📋 DETAILED RESULTS');
    console.log('-'.repeat(60));

    this.results.results.forEach((result, index) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`${index + 1}. ${result.file} - ${status}`);
      console.log(`   Duration: ${result.duration}ms`);
      console.log(`   Tests: ${result.passed + result.failed + result.skipped} (${result.passed} passed, ${result.failed} failed, ${result.skipped} skipped)`);
      
      if (result.errors.length > 0) {
        console.log(`   Errors: ${result.errors.length}`);
      }
      console.log('');
    });

    // Coverage areas
    console.log('🎯 TEST COVERAGE AREAS');
    console.log('-'.repeat(60));
    console.log('✅ Trainer-Customer Relationships & Database Models');
    console.log('✅ Customer Invitation System & Email Integration');
    console.log('✅ Meal Plan Assignment Workflows & Management');
    console.log('✅ Profile Management CRUD Operations');
    console.log('✅ Authentication & Authorization Flows');
    console.log('✅ Data Validation & Input Sanitization');
    console.log('');

    // Save report to file
    await this.saveReportToFile();
  }

  /**
   * Save test report to file
   */
  private async saveReportToFile(): Promise<void> {
    const reportPath = path.join(__dirname, '../reports/trainer-customer-test-report.json');
    const reportDir = path.dirname(reportPath);

    // Ensure reports directory exists
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: this.results.totalFiles,
        successfulFiles: this.results.successfulFiles,
        failedFiles: this.results.failedFiles,
        totalTests: this.results.totalTests,
        totalPassed: this.results.totalPassed,
        totalFailed: this.results.totalFailed,
        totalSkipped: this.results.totalSkipped,
        duration: this.results.duration,
        successRate: Math.round((this.results.successfulFiles / this.results.totalFiles) * 100),
        testSuccessRate: Math.round((this.results.totalPassed / this.results.totalTests) * 100),
      },
      results: this.results.results,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        testConfig: testConfig,
      },
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`💾 Test report saved to: ${reportPath}`);
  }
}

/**
 * Main execution function
 */
export async function runTrainerCustomerTests(): Promise<TestSuiteResults> {
  const runner = new TrainerCustomerTestRunner();
  return await runner.runTests();
}

/**
 * CLI execution
 */
if (require.main === module) {
  runTrainerCustomerTests()
    .then((results) => {
      console.log('\n🎉 Test suite execution completed');
      
      if (results.failedFiles > 0) {
        console.log(`❌ ${results.failedFiles} test files failed`);
        process.exit(1);
      } else {
        console.log('✅ All test files passed successfully');
        process.exit(0);
      }
    })
    .catch((error) => {
      console.error('💥 Test suite execution failed:', error);
      process.exit(1);
    });
}

// Export for use in other modules
export { TrainerCustomerTestRunner, TEST_SUITE_CONFIG };
export type { TestResult, TestSuiteResults };