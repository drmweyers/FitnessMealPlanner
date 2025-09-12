#!/usr/bin/env tsx

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

// Test suite configuration
interface TestSuiteConfig {
  name: string;
  description: string;
  pattern: string;
  priority: 'high' | 'medium' | 'low';
  timeout: number;
  categories: string[];
}

const TEST_SUITES: TestSuiteConfig[] = [
  {
    name: 'Authentication Tests',
    description: 'Tests for login, registration, and auth context',
    pattern: 'test/unit/comprehensive-test-suite/auth/**/*.test.{ts,tsx}',
    priority: 'high',
    timeout: 30000,
    categories: ['auth', 'security', 'critical'],
  },
  {
    name: 'Customer Profile Tests',
    description: 'Tests for customer profile management components',
    pattern: 'test/unit/comprehensive-test-suite/components/CustomerProfile.test.tsx',
    priority: 'high',
    timeout: 20000,
    categories: ['components', 'profile', 'customer'],
  },
  {
    name: 'Progress Tracking Tests',
    description: 'Tests for progress tracking components and functionality',
    pattern: 'test/unit/comprehensive-test-suite/components/ProgressTracking.test.tsx',
    priority: 'high',
    timeout: 25000,
    categories: ['components', 'progress', 'measurements'],
  },
  {
    name: 'Meal Plan Tests',
    description: 'Tests for meal plan generation and management',
    pattern: 'test/unit/comprehensive-test-suite/components/MealPlanGenerator.test.tsx',
    priority: 'high',
    timeout: 30000,
    categories: ['components', 'meal-plans', 'generation'],
  },
  {
    name: 'Recipe Component Tests',
    description: 'Tests for recipe cards and recipe-related components',
    pattern: 'test/unit/comprehensive-test-suite/components/RecipeCard.test.tsx',
    priority: 'medium',
    timeout: 20000,
    categories: ['components', 'recipes', 'ui'],
  },
  {
    name: 'Layout and Navigation Tests',
    description: 'Tests for layout components and navigation functionality',
    pattern: 'test/unit/comprehensive-test-suite/components/Layout.test.tsx',
    priority: 'medium',
    timeout: 25000,
    categories: ['components', 'layout', 'navigation'],
  },
  {
    name: 'Utility Function Tests',
    description: 'Tests for utility functions including date formatting',
    pattern: 'test/unit/comprehensive-test-suite/utils/**/*.test.ts',
    priority: 'medium',
    timeout: 15000,
    categories: ['utils', 'helpers', 'formatting'],
  },
  {
    name: 'API Integration Tests',
    description: 'Tests for API client and query integration',
    pattern: 'test/unit/comprehensive-test-suite/api/**/*.test.ts',
    priority: 'high',
    timeout: 20000,
    categories: ['api', 'integration', 'network'],
  },
  {
    name: 'Form Validation Tests',
    description: 'Tests for form validation schemas and utilities',
    pattern: 'test/unit/comprehensive-test-suite/forms/**/*.test.ts',
    priority: 'high',
    timeout: 15000,
    categories: ['forms', 'validation', 'security'],
  },
];

// Test execution results
interface TestResult {
  suiteName: string;
  passed: boolean;
  duration: number;
  testCount: number;
  passedTests: number;
  failedTests: number;
  errors: string[];
  coverage?: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
}

interface TestRunSummary {
  totalSuites: number;
  passedSuites: number;
  failedSuites: number;
  totalTests: number;
  totalDuration: number;
  results: TestResult[];
  overallCoverage?: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
}

class ComprehensiveTestRunner {
  private results: TestResult[] = [];
  private startTime: number = 0;

  constructor(private config: {
    parallel?: boolean;
    failFast?: boolean;
    coverage?: boolean;
    categories?: string[];
    verbose?: boolean;
    timeout?: number;
  } = {}) {}

  async runAllTests(): Promise<TestRunSummary> {
    console.log('🚀 Starting Comprehensive Test Suite for FitnessMealPlanner\n');
    console.log('='.repeat(60));
    
    this.startTime = Date.now();
    
    // Filter test suites by categories if specified
    const suitesToRun = this.filterSuitesByCategories(TEST_SUITES);
    
    console.log(`Running ${suitesToRun.length} test suites...\n`);
    
    if (this.config.parallel) {
      await this.runSuitesInParallel(suitesToRun);
    } else {
      await this.runSuitesSequentially(suitesToRun);
    }
    
    const summary = this.generateSummary();
    this.printSummary(summary);
    
    if (this.config.coverage) {
      await this.generateCoverageReport();
    }
    
    return summary;
  }

  private filterSuitesByCategories(suites: TestSuiteConfig[]): TestSuiteConfig[] {
    if (!this.config.categories || this.config.categories.length === 0) {
      return suites;
    }
    
    return suites.filter(suite => 
      suite.categories.some(category => 
        this.config.categories!.includes(category)
      )
    );
  }

  private async runSuitesSequentially(suites: TestSuiteConfig[]): Promise<void> {
    for (const suite of suites) {
      console.log(`\n📋 Running: ${suite.name}`);
      console.log(`📝 ${suite.description}`);
      console.log('-'.repeat(40));
      
      const result = await this.runSingleSuite(suite);
      this.results.push(result);
      
      this.printSuiteResult(result);
      
      if (this.config.failFast && !result.passed) {
        console.log('\n❌ Failing fast due to test failure');
        break;
      }
    }
  }

  private async runSuitesInParallel(suites: TestSuiteConfig[]): Promise<void> {
    console.log('🔄 Running test suites in parallel...\n');
    
    const promises = suites.map(suite => this.runSingleSuite(suite));
    const results = await Promise.allSettled(promises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        this.results.push(result.value);
        this.printSuiteResult(result.value);
      } else {
        console.error(`❌ Suite ${suites[index].name} failed to run:`, result.reason);
        this.results.push({
          suiteName: suites[index].name,
          passed: false,
          duration: 0,
          testCount: 0,
          passedTests: 0,
          failedTests: 0,
          errors: [result.reason.toString()],
        });
      }
    });
  }

  private async runSingleSuite(suite: TestSuiteConfig): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const command = this.buildVitestCommand(suite);
      const { stdout, stderr } = await execAsync(command, {
        timeout: suite.timeout,
        cwd: process.cwd(),
      });
      
      const duration = Date.now() - startTime;
      const result = this.parseTestOutput(stdout, stderr, suite.name, duration);
      
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      return {
        suiteName: suite.name,
        passed: false,
        duration,
        testCount: 0,
        passedTests: 0,
        failedTests: 0,
        errors: [error.message || error.toString()],
      };
    }
  }

  private buildVitestCommand(suite: TestSuiteConfig): string {
    const baseCommand = 'npx vitest run';
    const options = [
      `"${suite.pattern}"`,
      '--reporter=verbose',
      '--no-watch',
    ];
    
    if (this.config.coverage) {
      options.push('--coverage');
    }
    
    if (this.config.timeout) {
      options.push(`--testTimeout=${this.config.timeout}`);
    }
    
    return `${baseCommand} ${options.join(' ')}`;
  }

  private parseTestOutput(stdout: string, stderr: string, suiteName: string, duration: number): TestResult {
    // Parse vitest output to extract test results
    const lines = stdout.split('\n');
    
    let testCount = 0;
    let passedTests = 0;
    let failedTests = 0;
    const errors: string[] = [];
    
    // Look for test summary in output
    const summaryRegex = /Test Files\s+(\d+)\s+passed.*?Tests\s+(\d+)\s+passed.*?(\d+)\s+failed/;
    const match = stdout.match(summaryRegex);
    
    if (match) {
      testCount = parseInt(match[2]) + parseInt(match[3] || '0');
      passedTests = parseInt(match[2]);
      failedTests = parseInt(match[3] || '0');
    } else {
      // Fallback parsing
      const testLines = lines.filter(line => line.includes('✓') || line.includes('✗'));
      testCount = testLines.length;
      passedTests = testLines.filter(line => line.includes('✓')).length;
      failedTests = testLines.filter(line => line.includes('✗')).length;
    }
    
    // Extract error messages
    if (stderr) {
      errors.push(stderr);
    }
    
    const failureLines = lines.filter(line => 
      line.includes('FAIL') || 
      line.includes('Error:') || 
      line.includes('AssertionError')
    );
    errors.push(...failureLines);
    
    const passed = failedTests === 0 && testCount > 0;
    
    return {
      suiteName,
      passed,
      duration,
      testCount,
      passedTests,
      failedTests,
      errors,
    };
  }

  private printSuiteResult(result: TestResult): void {
    const status = result.passed ? '✅ PASSED' : '❌ FAILED';
    const duration = (result.duration / 1000).toFixed(2);
    
    console.log(`${status} ${result.suiteName}`);
    console.log(`   Tests: ${result.passedTests}/${result.testCount} passed`);
    console.log(`   Duration: ${duration}s`);
    
    if (result.errors.length > 0 && this.config.verbose) {
      console.log('   Errors:');
      result.errors.forEach(error => {
        console.log(`     ${error}`);
      });
    }
  }

  private generateSummary(): TestRunSummary {
    const totalDuration = Date.now() - this.startTime;
    const passedSuites = this.results.filter(r => r.passed).length;
    const failedSuites = this.results.filter(r => !r.passed).length;
    const totalTests = this.results.reduce((sum, r) => sum + r.testCount, 0);
    
    return {
      totalSuites: this.results.length,
      passedSuites,
      failedSuites,
      totalTests,
      totalDuration,
      results: this.results,
    };
  }

  private printSummary(summary: TestRunSummary): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    
    const duration = (summary.totalDuration / 1000).toFixed(2);
    
    console.log(`Total Test Suites: ${summary.totalSuites}`);
    console.log(`Passed: ${summary.passedSuites} ✅`);
    console.log(`Failed: ${summary.failedSuites} ❌`);
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`Total Duration: ${duration}s`);
    
    if (summary.failedSuites > 0) {
      console.log('\n❌ FAILED SUITES:');
      summary.results
        .filter(r => !r.passed)
        .forEach(result => {
          console.log(`  - ${result.suiteName}`);
          if (result.errors.length > 0) {
            result.errors.slice(0, 3).forEach(error => {
              console.log(`    ${error.substring(0, 100)}...`);
            });
          }
        });
    }
    
    // Overall status
    if (summary.failedSuites === 0) {
      console.log('\n🎉 ALL TESTS PASSED!');
    } else {
      console.log(`\n💥 ${summary.failedSuites} TEST SUITE(S) FAILED`);
    }
    
    console.log('\n' + '='.repeat(60));
  }

  private async generateCoverageReport(): Promise<void> {
    console.log('\n📈 Generating coverage report...');
    
    try {
      const { stdout } = await execAsync('npx vitest run --coverage --reporter=json', {
        timeout: 60000,
      });
      
      // Parse coverage data and save to file
      const coverageData = JSON.parse(stdout);
      const reportPath = path.join(process.cwd(), 'coverage', 'comprehensive-test-coverage.json');
      
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify(coverageData, null, 2));
      
      console.log(`✅ Coverage report saved to: ${reportPath}`);
    } catch (error) {
      console.error('❌ Failed to generate coverage report:', error);
    }
  }

  async generateTestReport(): Promise<void> {
    const reportData = {
      timestamp: new Date().toISOString(),
      project: 'FitnessMealPlanner',
      testSuite: 'Comprehensive Unit Tests',
      summary: this.generateSummary(),
      testSuites: TEST_SUITES,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };
    
    const reportPath = path.join(process.cwd(), 'test-results', 'comprehensive-test-report.json');
    
    try {
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));
      
      console.log(`📄 Test report saved to: ${reportPath}`);
    } catch (error) {
      console.error('❌ Failed to save test report:', error);
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  const config = {
    parallel: args.includes('--parallel'),
    failFast: args.includes('--fail-fast'),
    coverage: args.includes('--coverage'),
    verbose: args.includes('--verbose'),
    categories: [],
    timeout: 30000,
  };
  
  // Parse categories
  const categoriesIndex = args.findIndex(arg => arg === '--categories');
  if (categoriesIndex !== -1 && args[categoriesIndex + 1]) {
    config.categories = args[categoriesIndex + 1].split(',');
  }
  
  // Parse timeout
  const timeoutIndex = args.findIndex(arg => arg === '--timeout');
  if (timeoutIndex !== -1 && args[timeoutIndex + 1]) {
    config.timeout = parseInt(args[timeoutIndex + 1]) * 1000;
  }
  
  const runner = new ComprehensiveTestRunner(config);
  
  try {
    const summary = await runner.runAllTests();
    await runner.generateTestReport();
    
    // Exit with appropriate code
    process.exit(summary.failedSuites > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  }
}

// Export for programmatic use
export { ComprehensiveTestRunner, TEST_SUITES };
export type { TestSuiteConfig, TestResult, TestRunSummary };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}