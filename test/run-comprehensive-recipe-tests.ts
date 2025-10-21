/**
 * Comprehensive Recipe Generation Test Runner
 *
 * Executes all recipe generation tests and generates reports:
 * - Unit tests (components and services)
 * - Integration tests (API endpoints)
 * - E2E tests (Playwright)
 * - Coverage reports
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  errors: string[];
}

interface TestReport {
  timestamp: string;
  totalDuration: number;
  results: TestResult[];
  summary: {
    totalTests: number;
    totalPassed: number;
    totalFailed: number;
    totalSkipped: number;
    overallCoverage: {
      statements: number;
      branches: number;
      functions: number;
      lines: number;
    };
  };
}

class TestRunner {
  private results: TestResult[] = [];
  private startTime: number = Date.now();

  constructor() {
    console.log('🚀 Starting Comprehensive Recipe Generation Test Suite\n');
    console.log('=' .repeat(80));
  }

  private execute(command: string, suite: string): TestResult {
    const result: TestResult = {
      suite,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      errors: []
    };

    const suitStartTime = Date.now();

    try {
      console.log(`\n📦 Running ${suite}...`);
      console.log('-'.repeat(80));

      const output = execSync(command, {
        encoding: 'utf-8',
        stdio: 'pipe',
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      console.log(output);

      // Parse output for test results
      const passedMatch = output.match(/(\d+) passed/);
      const failedMatch = output.match(/(\d+) failed/);
      const skippedMatch = output.match(/(\d+) skipped/);

      if (passedMatch) result.passed = parseInt(passedMatch[1]);
      if (failedMatch) result.failed = parseInt(failedMatch[1]);
      if (skippedMatch) result.skipped = parseInt(skippedMatch[1]);

      // Parse coverage if present
      const coverageMatch = output.match(/Statements\s+:\s+([\d.]+)%.*Branches\s+:\s+([\d.]+)%.*Functions\s+:\s+([\d.]+)%.*Lines\s+:\s+([\d.]+)%/s);
      if (coverageMatch) {
        result.coverage = {
          statements: parseFloat(coverageMatch[1]),
          branches: parseFloat(coverageMatch[2]),
          functions: parseFloat(coverageMatch[3]),
          lines: parseFloat(coverageMatch[4])
        };
      }

      console.log(`✅ ${suite} completed successfully`);
      console.log(`   Passed: ${result.passed}, Failed: ${result.failed}, Skipped: ${result.skipped}`);

    } catch (error: any) {
      console.error(`❌ ${suite} failed with errors`);

      const output = error.stdout?.toString() || error.stderr?.toString() || error.message;
      console.error(output);

      // Try to parse results from error output
      const passedMatch = output.match(/(\d+) passed/);
      const failedMatch = output.match(/(\d+) failed/);
      const skippedMatch = output.match(/(\d+) skipped/);

      if (passedMatch) result.passed = parseInt(passedMatch[1]);
      if (failedMatch) result.failed = parseInt(failedMatch[1]);
      if (skippedMatch) result.skipped = parseInt(skippedMatch[1]);

      result.errors.push(error.message);
    }

    result.duration = Date.now() - suitStartTime;
    this.results.push(result);

    return result;
  }

  runUnitTests() {
    console.log('\n\n📋 UNIT TESTS');
    console.log('=' .repeat(80));

    // Component tests
    this.execute(
      'npx vitest run test/unit/components/AdminRecipeGenerator.test.tsx --reporter=verbose',
      'Unit Tests: AdminRecipeGenerator Component'
    );

    // Service tests
    this.execute(
      'npx vitest run test/unit/services/recipeGenerator.test.ts --reporter=verbose',
      'Unit Tests: RecipeGeneratorService'
    );

    // Additional component tests
    this.execute(
      'npx vitest run test/unit/components/BMADRecipeGenerator.test.tsx --reporter=verbose',
      'Unit Tests: BMADRecipeGenerator Component'
    );

    // Agent tests
    this.execute(
      'npx vitest run test/unit/services/agents/**/*.test.ts --reporter=verbose',
      'Unit Tests: BMAD Agents'
    );
  }

  runIntegrationTests() {
    console.log('\n\n🔗 INTEGRATION TESTS');
    console.log('=' .repeat(80));

    this.execute(
      'npx vitest run test/integration/recipeGeneration.integration.test.ts --reporter=verbose',
      'Integration Tests: Recipe Generation API'
    );
  }

  runE2ETests() {
    console.log('\n\n🌐 E2E TESTS (PLAYWRIGHT)');
    console.log('=' .repeat(80));

    this.execute(
      'npx playwright test test/e2e/admin-recipe-generation-comprehensive.spec.ts',
      'E2E Tests: Admin Recipe Generation Comprehensive'
    );

    this.execute(
      'npx playwright test test/e2e/admin-recipe-generation.spec.ts',
      'E2E Tests: Admin Recipe Generation Basic'
    );

    this.execute(
      'npx playwright test test/e2e/admin-recipe-generation-standalone.spec.ts',
      'E2E Tests: Admin Recipe Generation Standalone'
    );
  }

  generateCoverageReport() {
    console.log('\n\n📊 GENERATING COVERAGE REPORT');
    console.log('=' .repeat(80));

    try {
      const output = execSync('npx vitest run --coverage --reporter=verbose', {
        encoding: 'utf-8',
        stdio: 'pipe',
        maxBuffer: 10 * 1024 * 1024
      });

      console.log(output);
      console.log('\n✅ Coverage report generated');
      console.log('   View HTML report at: coverage/index.html');

    } catch (error: any) {
      console.error('❌ Coverage report generation failed');
      console.error(error.message);
    }
  }

  generateReport(): TestReport {
    const totalDuration = Date.now() - this.startTime;

    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    let totalStatements = 0;
    let totalBranches = 0;
    let totalFunctions = 0;
    let totalLines = 0;
    let coverageCount = 0;

    this.results.forEach(result => {
      totalTests += result.passed + result.failed + result.skipped;
      totalPassed += result.passed;
      totalFailed += result.failed;
      totalSkipped += result.skipped;

      if (result.coverage) {
        totalStatements += result.coverage.statements;
        totalBranches += result.coverage.branches;
        totalFunctions += result.coverage.functions;
        totalLines += result.coverage.lines;
        coverageCount++;
      }
    });

    const report: TestReport = {
      timestamp: new Date().toISOString(),
      totalDuration,
      results: this.results,
      summary: {
        totalTests,
        totalPassed,
        totalFailed,
        totalSkipped,
        overallCoverage: {
          statements: coverageCount > 0 ? totalStatements / coverageCount : 0,
          branches: coverageCount > 0 ? totalBranches / coverageCount : 0,
          functions: coverageCount > 0 ? totalFunctions / coverageCount : 0,
          lines: coverageCount > 0 ? totalLines / coverageCount : 0
        }
      }
    };

    return report;
  }

  printSummary(report: TestReport) {
    console.log('\n\n');
    console.log('=' .repeat(80));
    console.log('📊 TEST EXECUTION SUMMARY');
    console.log('=' .repeat(80));

    console.log(`\n⏱️  Total Duration: ${(report.totalDuration / 1000).toFixed(2)}s`);
    console.log(`📅 Timestamp: ${report.timestamp}\n`);

    console.log('Test Results:');
    console.log(`  ✅ Passed:  ${report.summary.totalPassed}`);
    console.log(`  ❌ Failed:  ${report.summary.totalFailed}`);
    console.log(`  ⏭️  Skipped: ${report.summary.totalSkipped}`);
    console.log(`  📊 Total:   ${report.summary.totalTests}\n`);

    if (report.summary.overallCoverage.lines > 0) {
      console.log('Code Coverage:');
      console.log(`  Statements: ${report.summary.overallCoverage.statements.toFixed(2)}%`);
      console.log(`  Branches:   ${report.summary.overallCoverage.branches.toFixed(2)}%`);
      console.log(`  Functions:  ${report.summary.overallCoverage.functions.toFixed(2)}%`);
      console.log(`  Lines:      ${report.summary.overallCoverage.lines.toFixed(2)}%\n`);
    }

    console.log('Test Suites:');
    report.results.forEach((result, index) => {
      const status = result.failed === 0 ? '✅' : '❌';
      const passRate = result.passed + result.failed > 0
        ? ((result.passed / (result.passed + result.failed)) * 100).toFixed(1)
        : '0.0';

      console.log(`  ${status} ${result.suite}`);
      console.log(`     Passed: ${result.passed}/${result.passed + result.failed} (${passRate}%)`);
      console.log(`     Duration: ${(result.duration / 1000).toFixed(2)}s`);

      if (result.errors.length > 0) {
        console.log(`     Errors: ${result.errors.length}`);
      }

      if (result.coverage) {
        console.log(`     Coverage: ${result.coverage.lines.toFixed(1)}% lines`);
      }

      console.log();
    });

    console.log('=' .repeat(80));

    // Overall status
    if (report.summary.totalFailed === 0) {
      console.log('🎉 ALL TESTS PASSED! 🎉');
    } else {
      console.log(`⚠️  ${report.summary.totalFailed} TEST(S) FAILED`);
    }

    console.log('=' .repeat(80));
  }

  saveReport(report: TestReport) {
    const reportsDir = path.join(process.cwd(), 'test-reports');

    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(reportsDir, `recipe-generation-test-report-${Date.now()}.json`);

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n📄 Report saved to: ${reportPath}`);

    // Also save as latest
    const latestPath = path.join(reportsDir, 'recipe-generation-test-report-latest.json');
    fs.writeFileSync(latestPath, JSON.stringify(report, null, 2));

    console.log(`📄 Latest report: ${latestPath}`);
  }

  async run() {
    try {
      // Run all test suites
      this.runUnitTests();
      this.runIntegrationTests();
      this.runE2ETests();

      // Generate coverage report
      this.generateCoverageReport();

      // Generate and print summary
      const report = this.generateReport();
      this.printSummary(report);
      this.saveReport(report);

      // Exit with appropriate code
      process.exit(report.summary.totalFailed > 0 ? 1 : 0);

    } catch (error: any) {
      console.error('\n❌ Test execution failed with critical error:');
      console.error(error.message);
      process.exit(1);
    }
  }
}

// Run tests
const runner = new TestRunner();
runner.run();
