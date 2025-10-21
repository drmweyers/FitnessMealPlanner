#!/usr/bin/env node
/**
 * CLI for Autonomous Bug Fixer System
 *
 * Usage:
 *   npm run fix:auto                   # Run tests and auto-fix all detected issues
 *   npm run fix:detect                 # Detect issues without implementing fixes
 *   npm run fix:verify                 # Verify all implemented fixes
 */

import { AutonomousBugFixer } from './core/AutonomousBugFixer';
import { TestRunner } from './infrastructure/TestRunner';
import fs from 'fs-extra';
import path from 'path';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'auto';

  console.log('🤖 Autonomous Bug Fixer System');
  console.log('================================\n');

  try {
    switch (command) {
      case 'auto':
        await runAutoFix();
        break;
      case 'detect':
        await detectOnly();
        break;
      case 'verify':
        await verifyFixes();
        break;
      case 'help':
        showHelp();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

/**
 * Run tests and auto-fix all detected issues
 */
async function runAutoFix() {
  console.log('Running tests to detect issues...\n');

  // 1. Run all tests
  const testRunner = new TestRunner();
  const testResults = await testRunner.runAllTests();

  console.log(`\nTest Results: ${testResults.summary.passed} passed, ${testResults.summary.failed} failed\n`);

  if (testResults.summary.failed === 0) {
    console.log('✅ All tests passed! No issues to fix.\n');
    return;
  }

  // 2. Run autonomous fixer
  const fixer = new AutonomousBugFixer();
  const report = await fixer.detectAndFixAll(testResults.results);

  // 3. Save report
  await saveReport(report);

  // 4. Display summary
  displaySummary(report);

  // Exit with code 0 if any fixes were implemented
  process.exit(report.fixedIssues > 0 ? 0 : 1);
}

/**
 * Detect issues without implementing fixes
 */
async function detectOnly() {
  console.log('Detecting issues (no fixes will be implemented)...\n');

  const testRunner = new TestRunner();
  const testResults = await testRunner.runAllTests();

  console.log(`\nTest Results: ${testResults.summary.passed} passed, ${testResults.summary.failed} failed\n`);

  if (testResults.summary.failed === 0) {
    console.log('✅ All tests passed! No issues detected.\n');
    return;
  }

  // Just display the issues
  console.log(`\n📋 Detected Issues:\n`);
  const failedTests = testResults.results.filter(r => r.status === 'failed');

  for (const [index, test] of failedTests.entries()) {
    console.log(`${index + 1}. ${test.testName}`);
    console.log(`   File: ${test.testFile}`);
    console.log(`   Error: ${test.error?.message || 'Unknown error'}`);
    console.log('');
  }

  console.log(`Total Issues: ${failedTests.length}\n`);
}

/**
 * Verify that implemented fixes are working
 */
async function verifyFixes() {
  console.log('Verifying implemented fixes...\n');

  const testRunner = new TestRunner();
  const testResults = await testRunner.runAllTests();

  console.log(`\nTest Results: ${testResults.summary.passed} passed, ${testResults.summary.failed} failed\n`);

  if (testResults.summary.failed === 0) {
    console.log('✅ All tests passed! All fixes are verified.\n');
    process.exit(0);
  } else {
    console.log(`❌ ${testResults.summary.failed} tests still failing.\n`);
    process.exit(1);
  }
}

/**
 * Save report to file
 */
async function saveReport(report: any) {
  const reportDir = path.join(process.cwd(), 'test-results', 'autonomous-fixes');
  await fs.ensureDir(reportDir);

  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const reportPath = path.join(reportDir, `fix-report-${timestamp}.json`);

  await fs.writeJSON(reportPath, report, { spaces: 2 });
  console.log(`\n📄 Report saved to: ${reportPath}\n`);
}

/**
 * Display summary
 */
function displaySummary(report: any) {
  console.log('\n' + '='.repeat(60));
  console.log('AUTONOMOUS FIX SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Issues Analyzed:    ${report.totalIssues}`);
  console.log(`✅ Successfully Fixed:    ${report.fixedIssues}`);
  console.log(`❌ Failed to Fix:         ${report.failedFixes}`);
  console.log(`👤 Requires Human Review: ${report.requiresHumanReview}`);
  console.log(`⚡ Success Rate:          ${report.metrics.successRate.toFixed(1)}%`);
  console.log(`⏱️  Average Fix Time:      ${(report.metrics.averageFixTime / 1000).toFixed(1)}s`);
  console.log(`🚀 Auto-Deployed Fixes:   ${report.metrics.autoDeployedFixes}`);
  console.log('='.repeat(60) + '\n');

  if (report.fixedIssues > 0) {
    console.log('✅ SUCCESS: Issues have been automatically fixed and verified!\n');
  } else if (report.requiresHumanReview > 0) {
    console.log('👤 Some issues require human review. Check the report for details.\n');
  } else {
    console.log('❌ No issues could be automatically fixed. Manual intervention required.\n');
  }
}

/**
 * Show help
 */
function showHelp() {
  console.log(`
Autonomous Bug Fixer CLI

Usage:
  npm run fix:auto       Run tests and auto-fix all detected issues
  npm run fix:detect     Detect issues without implementing fixes
  npm run fix:verify     Verify all implemented fixes
  npm run fix:help       Show this help message

Commands:
  auto         Run full autonomous fix cycle (default)
  detect       Only detect and report issues
  verify       Verify that fixes are working
  help         Show this help message

Environment Variables:
  OPENAI_API_KEY           Your OpenAI API key (required)
  MAX_FIXES_PER_RUN        Maximum number of fixes to attempt (default: 10)
  AUTO_DEPLOY_LEVEL1       Auto-deploy Level 1 fixes (default: true)
  AUTO_DEPLOY_LEVEL2       Auto-deploy Level 2 fixes (default: false)

Examples:
  # Run full autonomous fix cycle
  npm run fix:auto

  # Only detect issues
  npm run fix:detect

  # Verify fixes after manual changes
  npm run fix:verify

For more information, see test/autonomous-fix/README.md
  `);
}

// Run CLI
main();
