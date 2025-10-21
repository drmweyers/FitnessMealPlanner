/**
 * Basic Usage Example - Autonomous Bug Fixer
 *
 * This file demonstrates how to use the Autonomous Bug Fixer system
 * in different scenarios.
 */

import { AutonomousBugFixer } from '../core/AutonomousBugFixer';
import { TestRunner } from '../infrastructure/TestRunner';
import { ExtendedTestResult } from '../types';

/**
 * Example 1: Run full autonomous fix cycle
 */
async function example1_fullAutonomousCycle() {
  console.log('Example 1: Full Autonomous Fix Cycle\n');

  // 1. Run all tests
  const testRunner = new TestRunner();
  console.log('Running all Playwright tests...');
  const testResults = await testRunner.runAllTests();

  console.log(`Tests completed: ${testResults.summary.passed} passed, ${testResults.summary.failed} failed\n`);

  if (testResults.summary.failed === 0) {
    console.log('✅ All tests passed! No fixes needed.\n');
    return;
  }

  // 2. Run autonomous fixer
  console.log('Starting autonomous bug fixer...\n');
  const fixer = new AutonomousBugFixer();
  const report = await fixer.detectAndFixAll(testResults.results);

  // 3. Display results
  console.log('\n📊 Results:');
  console.log(`Fixed: ${report.fixedIssues}/${report.totalIssues}`);
  console.log(`Success Rate: ${report.metrics.successRate.toFixed(1)}%`);
  console.log(`Average Fix Time: ${(report.metrics.averageFixTime / 1000).toFixed(1)}s`);
}

/**
 * Example 2: Fix specific test file only
 */
async function example2_specificTestFile() {
  console.log('Example 2: Fix Specific Test File\n');

  // 1. Run specific test file
  const testRunner = new TestRunner();
  const testFile = 'test/e2e/admin-recipe-generation.spec.ts';

  console.log(`Running test file: ${testFile}...`);
  const testResults = await testRunner.runTestFile(testFile);

  if (testResults.success) {
    console.log('✅ Test passed! No fixes needed.\n');
    return;
  }

  // 2. Fix only this test's failures
  console.log('Starting autonomous fixer for this test...\n');
  const fixer = new AutonomousBugFixer();
  const report = await fixer.detectAndFixAll(testResults.results);

  console.log(`\n✅ Fixed ${report.fixedIssues} issue(s) in ${testFile}\n`);
}

/**
 * Example 3: Detect issues without fixing (analysis mode)
 */
async function example3_detectOnly() {
  console.log('Example 3: Detect Issues Only (No Fixes)\n');

  // 1. Run tests
  const testRunner = new TestRunner();
  const testResults = await testRunner.runAllTests();

  // 2. Filter failed tests
  const failedTests = testResults.results.filter((r) => r.status === 'failed');

  console.log(`Found ${failedTests.length} failing tests:\n`);

  // 3. Display issues (no fixes)
  for (const [index, test] of failedTests.entries()) {
    console.log(`${index + 1}. ${test.testName}`);
    console.log(`   File: ${test.testFile}`);
    console.log(`   Error: ${test.error?.message || 'Unknown'}`);
    console.log('');
  }
}

/**
 * Example 4: Custom configuration
 */
async function example4_customConfiguration() {
  console.log('Example 4: Custom Configuration\n');

  // Set environment variables for custom config
  process.env.MAX_FIXES_PER_RUN = '5'; // Only fix 5 issues
  process.env.AUTO_DEPLOY_LEVEL1 = 'true'; // Auto-deploy Level 1
  process.env.AUTO_DEPLOY_LEVEL2 = 'false'; // Don't auto-deploy Level 2

  // Run fixer with custom config
  const testRunner = new TestRunner();
  const testResults = await testRunner.runAllTests();

  if (testResults.summary.failed === 0) {
    console.log('✅ All tests passed!\n');
    return;
  }

  const fixer = new AutonomousBugFixer();
  const report = await fixer.detectAndFixAll(testResults.results);

  console.log(`\n✅ Fixed up to 5 issues (configured limit)`);
  console.log(`Fixed: ${report.fixedIssues}`);
  console.log(`Remaining: ${report.totalIssues - report.fixedIssues}\n`);
}

/**
 * Example 5: Integrate with custom test suite
 */
async function example5_customTestSuite() {
  console.log('Example 5: Custom Test Suite Integration\n');

  // Create mock test results (in real scenario, these would come from your test runner)
  const customTestResults: ExtendedTestResult[] = [
    {
      testFile: 'test/custom/my-test.spec.ts',
      testName: 'should display user profile',
      status: 'failed',
      duration: 1500,
      error: {
        message: "locator.click: Timeout 30000ms exceeded.",
        stack: `Error: locator.click: Timeout 30000ms exceeded.
    at test/custom/my-test.spec.ts:25:18`,
      },
      retry: 0,
    },
  ];

  // Run fixer on custom results
  const fixer = new AutonomousBugFixer();
  const report = await fixer.detectAndFixAll(customTestResults);

  console.log(`\n✅ Processed ${report.totalIssues} custom test failure(s)\n`);
}

/**
 * Example 6: Verify fixes after manual changes
 */
async function example6_verifyFixes() {
  console.log('Example 6: Verify Fixes\n');

  console.log('Running tests to verify all fixes...\n');

  const testRunner = new TestRunner();
  const testResults = await testRunner.runAllTests();

  if (testResults.summary.failed === 0) {
    console.log('✅ All tests passed! All fixes verified.\n');
  } else {
    console.log(`❌ ${testResults.summary.failed} tests still failing.\n`);
    console.log('Run npm run fix:auto to attempt automatic fixes.\n');
  }
}

/**
 * Example 7: CI/CD Integration
 */
async function example7_cicdIntegration() {
  console.log('Example 7: CI/CD Integration\n');

  // This would typically run in your CI/CD pipeline
  // Exit codes: 0 = success, 1 = failure

  const testRunner = new TestRunner();
  const testResults = await testRunner.runAllTests();

  if (testResults.summary.failed === 0) {
    console.log('✅ All tests passed in CI!\n');
    process.exit(0);
  }

  console.log('⚠️  Tests failed, attempting autonomous fixes...\n');

  const fixer = new AutonomousBugFixer();
  const report = await fixer.detectAndFixAll(testResults.results);

  if (report.fixedIssues > 0) {
    console.log(`✅ Fixed ${report.fixedIssues} issues automatically!\n`);

    // Re-run tests to verify
    const verifyResults = await testRunner.runAllTests();

    if (verifyResults.summary.failed === 0) {
      console.log('✅ All tests now passing! CI success.\n');
      process.exit(0);
    }
  }

  console.log('❌ Some issues could not be fixed automatically.\n');
  console.log(`Requires human review: ${report.requiresHumanReview} issues\n`);
  process.exit(1);
}

// Run examples (uncomment to run)
// example1_fullAutonomousCycle();
// example2_specificTestFile();
// example3_detectOnly();
// example4_customConfiguration();
// example5_customTestSuite();
// example6_verifyFixes();
// example7_cicdIntegration();

export {
  example1_fullAutonomousCycle,
  example2_specificTestFile,
  example3_detectOnly,
  example4_customConfiguration,
  example5_customTestSuite,
  example6_verifyFixes,
  example7_cicdIntegration,
};
