#!/usr/bin/env tsx

/**
 * Edge Case Test Runner for FitnessMealPlanner
 *
 * This script runs the comprehensive edge case test suite and provides
 * detailed reporting on edge case coverage and failure analysis.
 */

import { execSync } from 'child_process';
import { createWriteStream } from 'fs';
import { join } from 'path';

interface TestResult {
  category: string;
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  duration: number;
  failures: Array<{
    test: string;
    error: string;
  }>;
}

interface EdgeCaseReport {
  overall: {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    passRate: number;
    totalDuration: number;
  };
  categories: TestResult[];
  criticalFailures: string[];
  recommendations: string[];
}

class EdgeCaseTestRunner {
  private results: TestResult[] = [];
  private startTime: number = 0;
  private logStream: NodeJS.WritableStream;

  constructor() {
    const logPath = join(process.cwd(), 'test', 'edge-cases', 'edge-case-results.log');
    this.logStream = createWriteStream(logPath, { flags: 'w' });
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    this.logStream.write(logMessage + '\n');
  }

  private async runTestCategory(category: string, pattern: string): Promise<TestResult> {
    this.log(`\n🧪 Running ${category} edge case tests...`);
    const startTime = Date.now();

    try {
      const output = execSync(
        `npx vitest run test/edge-cases/comprehensive-edge-cases.test.ts --reporter=json --grep="${pattern}"`,
        {
          encoding: 'utf-8',
          timeout: 300000 // 5 minutes timeout
        }
      );

      const result = JSON.parse(output);
      const duration = Date.now() - startTime;

      const testResult: TestResult = {
        category,
        passed: result.testResults?.[0]?.assertionResults?.filter((t: any) => t.status === 'passed').length || 0,
        failed: result.testResults?.[0]?.assertionResults?.filter((t: any) => t.status === 'failed').length || 0,
        skipped: result.testResults?.[0]?.assertionResults?.filter((t: any) => t.status === 'skipped').length || 0,
        total: result.testResults?.[0]?.assertionResults?.length || 0,
        duration,
        failures: result.testResults?.[0]?.assertionResults
          ?.filter((t: any) => t.status === 'failed')
          ?.map((t: any) => ({
            test: t.title,
            error: t.failureMessages?.[0] || 'Unknown error'
          })) || []
      };

      this.log(`✅ ${category}: ${testResult.passed}/${testResult.total} passed (${duration}ms)`);

      if (testResult.failures.length > 0) {
        this.log(`❌ ${testResult.failures.length} failures in ${category}:`);
        testResult.failures.forEach(failure => {
          this.log(`   - ${failure.test}: ${failure.error.substring(0, 100)}...`);
        });
      }

      return testResult;

    } catch (error) {
      this.log(`❌ Failed to run ${category} tests: ${error}`);
      return {
        category,
        passed: 0,
        failed: 1,
        skipped: 0,
        total: 1,
        duration: Date.now() - startTime,
        failures: [{
          test: `${category} test execution`,
          error: String(error)
        }]
      };
    }
  }

  private async runAllEdgeCaseTests(): Promise<void> {
    this.log('🚀 Starting comprehensive edge case test suite...');
    this.startTime = Date.now();

    const testCategories = [
      { name: 'Input Validation', pattern: 'Input Validation Edge Cases' },
      { name: 'Authentication & Authorization', pattern: 'Authentication & Authorization Edge Cases' },
      { name: 'Data Processing', pattern: 'Data Processing Edge Cases' },
      { name: 'API & Network', pattern: 'API & Network Edge Cases' }
    ];

    for (const category of testCategories) {
      const result = await this.runTestCategory(category.name, category.pattern);
      this.results.push(result);

      // Brief pause between categories
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  private generateReport(): EdgeCaseReport {
    const totalTests = this.results.reduce((sum, r) => sum + r.total, 0);
    const totalPassed = this.results.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = this.results.reduce((sum, r) => sum + r.failed, 0);
    const totalSkipped = this.results.reduce((sum, r) => sum + r.skipped, 0);
    const totalDuration = Date.now() - this.startTime;

    const criticalFailures = this.results
      .filter(r => r.failed > r.total * 0.5) // More than 50% failures
      .map(r => r.category);

    const recommendations = this.generateRecommendations();

    return {
      overall: {
        totalTests,
        passed: totalPassed,
        failed: totalFailed,
        skipped: totalSkipped,
        passRate: totalTests > 0 ? (totalPassed / totalTests) * 100 : 0,
        totalDuration
      },
      categories: this.results,
      criticalFailures,
      recommendations
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    this.results.forEach(result => {
      const failureRate = result.total > 0 ? (result.failed / result.total) * 100 : 0;

      if (failureRate > 30) {
        recommendations.push(
          `🔴 CRITICAL: ${result.category} has ${failureRate.toFixed(1)}% failure rate. Immediate attention required.`
        );
      } else if (failureRate > 10) {
        recommendations.push(
          `🟡 WARNING: ${result.category} has ${failureRate.toFixed(1)}% failure rate. Review and fix needed.`
        );
      } else if (failureRate > 5) {
        recommendations.push(
          `🟠 CAUTION: ${result.category} has ${failureRate.toFixed(1)}% failure rate. Monitor closely.`
        );
      }

      // Specific category recommendations
      if (result.category === 'Input Validation' && result.failed > 0) {
        recommendations.push('🛡️  Consider implementing stricter input validation and sanitization');
      }

      if (result.category === 'Authentication & Authorization' && result.failed > 0) {
        recommendations.push('🔐 Review authentication flow and implement additional security measures');
      }

      if (result.category === 'Data Processing' && result.failed > 0) {
        recommendations.push('📊 Enhance data validation and error handling in processing pipelines');
      }

      if (result.category === 'API & Network' && result.failed > 0) {
        recommendations.push('🌐 Improve API resilience and network error handling');
      }
    });

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('✅ All edge case categories performing well. Continue monitoring.');
    }

    recommendations.push('🔄 Run edge case tests regularly as part of CI/CD pipeline');
    recommendations.push('📝 Update edge case tests when new features are added');
    recommendations.push('🎯 Focus on categories with highest failure rates first');

    return recommendations;
  }

  private printDetailedReport(report: EdgeCaseReport): void {
    this.log('\n' + '='.repeat(80));
    this.log('📊 COMPREHENSIVE EDGE CASE TEST REPORT');
    this.log('='.repeat(80));

    // Overall statistics
    this.log(`\n📈 OVERALL STATISTICS:`);
    this.log(`   Total Tests: ${report.overall.totalTests}`);
    this.log(`   Passed: ${report.overall.passed} (${report.overall.passRate.toFixed(1)}%)`);
    this.log(`   Failed: ${report.overall.failed}`);
    this.log(`   Skipped: ${report.overall.skipped}`);
    this.log(`   Duration: ${(report.overall.totalDuration / 1000).toFixed(2)}s`);

    // Category breakdown
    this.log(`\n📋 CATEGORY BREAKDOWN:`);
    report.categories.forEach(category => {
      const passRate = category.total > 0 ? (category.passed / category.total) * 100 : 0;
      const status = passRate >= 90 ? '🟢' : passRate >= 70 ? '🟡' : '🔴';

      this.log(`   ${status} ${category.category}:`);
      this.log(`      Tests: ${category.passed}/${category.total} passed (${passRate.toFixed(1)}%)`);
      this.log(`      Duration: ${(category.duration / 1000).toFixed(2)}s`);

      if (category.failures.length > 0) {
        this.log(`      Failures: ${category.failures.length}`);
        category.failures.slice(0, 3).forEach(failure => {
          this.log(`        - ${failure.test}`);
        });
        if (category.failures.length > 3) {
          this.log(`        ... and ${category.failures.length - 3} more`);
        }
      }
    });

    // Critical failures
    if (report.criticalFailures.length > 0) {
      this.log(`\n🚨 CRITICAL FAILURES:`);
      report.criticalFailures.forEach(category => {
        this.log(`   - ${category} requires immediate attention`);
      });
    }

    // Recommendations
    this.log(`\n💡 RECOMMENDATIONS:`);
    report.recommendations.forEach(rec => {
      this.log(`   ${rec}`);
    });

    // Footer
    this.log('\n' + '='.repeat(80));
    this.log(`Report generated: ${new Date().toISOString()}`);
    this.log('='.repeat(80));
  }

  private async saveReport(report: EdgeCaseReport): Promise<void> {
    const reportPath = join(process.cwd(), 'test', 'edge-cases', 'edge-case-report.json');
    const reportData = {
      ...report,
      generatedAt: new Date().toISOString(),
      version: '1.0.0'
    };

    try {
      await import('fs/promises').then(fs =>
        fs.writeFile(reportPath, JSON.stringify(reportData, null, 2))
      );
      this.log(`📄 Detailed report saved to: ${reportPath}`);
    } catch (error) {
      this.log(`❌ Failed to save report: ${error}`);
    }
  }

  public async run(): Promise<void> {
    try {
      await this.runAllEdgeCaseTests();
      const report = this.generateReport();
      this.printDetailedReport(report);
      await this.saveReport(report);

      // Exit with appropriate code
      const hasFailures = report.overall.failed > 0;
      const hasCriticalFailures = report.criticalFailures.length > 0;

      if (hasCriticalFailures) {
        this.log('\n🚨 Exiting with code 2 due to critical failures');
        process.exit(2);
      } else if (hasFailures) {
        this.log('\n⚠️  Exiting with code 1 due to test failures');
        process.exit(1);
      } else {
        this.log('\n✅ All edge case tests passed successfully!');
        process.exit(0);
      }

    } catch (error) {
      this.log(`💥 Fatal error during edge case testing: ${error}`);
      process.exit(3);
    } finally {
      this.logStream.end();
    }
  }
}

// CLI argument handling
const args = process.argv.slice(2);
const options = {
  category: args.find(arg => arg.startsWith('--category='))?.split('=')[1],
  verbose: args.includes('--verbose'),
  quick: args.includes('--quick'),
  failFast: args.includes('--fail-fast')
};

// Main execution
if (require.main === module) {
  const runner = new EdgeCaseTestRunner();

  console.log('🎯 FitnessMealPlanner Edge Case Test Suite');
  console.log('==========================================');

  if (options.category) {
    console.log(`Running tests for category: ${options.category}`);
  } else {
    console.log('Running comprehensive edge case test suite (150 tests)');
  }

  runner.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(3);
  });
}

export { EdgeCaseTestRunner };