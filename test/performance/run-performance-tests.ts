#!/usr/bin/env tsx
/**
 * Performance Test Runner for FitnessMealPlanner
 *
 * This script runs the comprehensive performance test suite and generates
 * detailed reports with performance metrics and recommendations.
 *
 * Usage:
 *   npm run test:performance
 *   tsx test/performance/run-performance-tests.ts
 *   tsx test/performance/run-performance-tests.ts --suite=api
 *   tsx test/performance/run-performance-tests.ts --baseline
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

interface TestSuite {
  name: string;
  description: string;
  pattern: string;
  estimatedDuration: string;
}

interface PerformanceReport {
  timestamp: string;
  environment: string;
  duration: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  suites: Array<{
    name: string;
    tests: number;
    passed: number;
    failed: number;
    avgDuration: number;
  }>;
  metrics: {
    apiPerformance: any;
    frontendPerformance: any;
    databasePerformance: any;
    scalabilityMetrics: any;
  };
  recommendations: string[];
}

class PerformanceTestRunner {
  private testSuites: TestSuite[] = [
    {
      name: 'api',
      description: 'API Performance Tests (60 tests)',
      pattern: 'API Performance Tests',
      estimatedDuration: '5-8 minutes'
    },
    {
      name: 'frontend',
      description: 'Frontend Performance Tests (50 tests)',
      pattern: 'Frontend Performance Tests',
      estimatedDuration: '8-12 minutes'
    },
    {
      name: 'database',
      description: 'Database Performance Tests (50 tests)',
      pattern: 'Database Performance Tests',
      estimatedDuration: '3-5 minutes'
    },
    {
      name: 'scalability',
      description: 'Scalability Tests (40 tests)',
      pattern: 'Scalability Tests',
      estimatedDuration: '10-15 minutes'
    },
    {
      name: 'baseline',
      description: 'Performance Baseline and Reporting',
      pattern: 'Performance Baseline and Reporting',
      estimatedDuration: '2-3 minutes'
    }
  ];

  private options = {
    suite: '',
    baseline: false,
    verbose: false,
    generateReport: true,
    outputDir: './test-results/performance'
  };

  constructor() {
    this.parseArguments();
  }

  private parseArguments() {
    const args = process.argv.slice(2);

    for (const arg of args) {
      if (arg.startsWith('--suite=')) {
        this.options.suite = arg.split('=')[1];
      } else if (arg === '--baseline') {
        this.options.baseline = true;
      } else if (arg === '--verbose') {
        this.options.verbose = true;
      } else if (arg === '--no-report') {
        this.options.generateReport = false;
      }
    }
  }

  async run() {
    console.log('🚀 FitnessMealPlanner Performance Test Suite');
    console.log('=' .repeat(50));

    await this.ensureOutputDirectory();
    await this.checkPrerequisites();

    const startTime = Date.now();

    try {
      if (this.options.baseline) {
        await this.runBaselineTests();
      } else if (this.options.suite) {
        await this.runSpecificSuite();
      } else {
        await this.runAllSuites();
      }

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      console.log(`\n✅ Performance tests completed in ${duration.toFixed(2)}s`);

      if (this.options.generateReport) {
        await this.generateReport(duration);
      }

    } catch (error) {
      console.error('❌ Performance tests failed:', error);
      process.exit(1);
    }
  }

  private async ensureOutputDirectory() {
    try {
      await fs.mkdir(this.options.outputDir, { recursive: true });
    } catch (error) {
      console.warn('Warning: Could not create output directory:', error);
    }
  }

  private async checkPrerequisites() {
    console.log('🔍 Checking prerequisites...');

    // Check if Docker is running
    try {
      execSync('docker ps', { stdio: 'pipe' });
      console.log('✅ Docker is running');
    } catch (error) {
      console.log('⚠️  Docker not detected - some tests may fail');
    }

    // Check if development server is running
    try {
      const response = await fetch('http://localhost:4000/api/health');
      if (response.ok) {
        console.log('✅ Development server is running');
      } else {
        console.log('⚠️  Development server not responding properly');
      }
    } catch (error) {
      console.log('⚠️  Development server not detected - starting tests anyway');
    }

    // Check database connectivity
    const dbUrl = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;
    if (dbUrl) {
      console.log('✅ Database URL configured');
    } else {
      console.log('⚠️  Database URL not configured - database tests may fail');
    }

    console.log('');
  }

  private async runBaselineTests() {
    console.log('📊 Running baseline performance tests...');

    const suite = this.testSuites.find(s => s.name === 'baseline');
    if (suite) {
      await this.executeSuite(suite);
    }
  }

  private async runSpecificSuite() {
    const suite = this.testSuites.find(s => s.name === this.options.suite);

    if (!suite) {
      console.error(`❌ Unknown test suite: ${this.options.suite}`);
      console.log('Available suites:', this.testSuites.map(s => s.name).join(', '));
      process.exit(1);
    }

    console.log(`🎯 Running ${suite.description}...`);
    console.log(`📅 Estimated duration: ${suite.estimatedDuration}`);
    console.log('');

    await this.executeSuite(suite);
  }

  private async runAllSuites() {
    console.log('🎯 Running all performance test suites...');

    const totalEstimatedTime = '25-40 minutes';
    console.log(`📅 Total estimated duration: ${totalEstimatedTime}`);
    console.log('');

    for (const suite of this.testSuites) {
      console.log(`\n🔄 Starting ${suite.description}...`);
      console.log(`📅 Estimated duration: ${suite.estimatedDuration}`);

      await this.executeSuite(suite);
    }
  }

  private async executeSuite(suite: TestSuite) {
    const startTime = Date.now();

    try {
      const command = this.buildTestCommand(suite);

      if (this.options.verbose) {
        console.log(`Executing: ${command}`);
      }

      execSync(command, {
        stdio: 'inherit',
        env: {
          ...process.env,
          NODE_ENV: 'test',
          TEST_SUITE: suite.name
        }
      });

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      console.log(`✅ ${suite.name} tests completed in ${duration.toFixed(2)}s`);

    } catch (error) {
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      console.error(`❌ ${suite.name} tests failed after ${duration.toFixed(2)}s`);

      if (this.options.verbose) {
        console.error('Error details:', error);
      }

      throw error;
    }
  }

  private buildTestCommand(suite: TestSuite): string {
    const testFile = 'test/performance/comprehensive-performance.test.ts';

    let command = `vitest run ${testFile}`;

    // Add pattern matching if not running all tests
    if (suite.pattern && suite.name !== 'all') {
      command += ` --grep="${suite.pattern}"`;
    }

    // Add reporter options
    command += ' --reporter=verbose';

    // Add output options if report generation is enabled
    if (this.options.generateReport) {
      command += ` --reporter=json --outputFile=${this.options.outputDir}/${suite.name}-results.json`;
    }

    return command;
  }

  private async generateReport(totalDuration: number) {
    console.log('\n📊 Generating performance report...');

    try {
      const report: PerformanceReport = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'test',
        duration: totalDuration,
        totalTests: 200,
        passedTests: 0,
        failedTests: 0,
        suites: [],
        metrics: {
          apiPerformance: {},
          frontendPerformance: {},
          databasePerformance: {},
          scalabilityMetrics: {}
        },
        recommendations: []
      };

      // Collect results from individual suite reports
      for (const suite of this.testSuites) {
        await this.collectSuiteResults(suite, report);
      }

      // Generate recommendations
      this.generateRecommendations(report);

      // Save report
      const reportPath = path.join(this.options.outputDir, 'performance-report.json');
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

      // Generate HTML report
      await this.generateHtmlReport(report);

      console.log(`✅ Performance report generated: ${reportPath}`);
      console.log(`📄 HTML report: ${this.options.outputDir}/performance-report.html`);

    } catch (error) {
      console.warn('⚠️  Could not generate performance report:', error);
    }
  }

  private async collectSuiteResults(suite: TestSuite, report: PerformanceReport) {
    try {
      const resultsPath = path.join(this.options.outputDir, `${suite.name}-results.json`);
      const resultsData = await fs.readFile(resultsPath, 'utf8');
      const results = JSON.parse(resultsData);

      report.suites.push({
        name: suite.name,
        tests: results.numTotalTests || 0,
        passed: results.numPassedTests || 0,
        failed: results.numFailedTests || 0,
        avgDuration: results.avgDuration || 0
      });

      report.passedTests += results.numPassedTests || 0;
      report.failedTests += results.numFailedTests || 0;

    } catch (error) {
      console.warn(`Could not collect results for ${suite.name}:`, error);
    }
  }

  private generateRecommendations(report: PerformanceReport): void {
    const recommendations: string[] = [];

    // Analyze failure rate
    const failureRate = (report.failedTests / report.totalTests) * 100;

    if (failureRate > 20) {
      recommendations.push('High failure rate detected. Consider investigating infrastructure issues.');
    } else if (failureRate > 10) {
      recommendations.push('Moderate failure rate. Review failed tests for optimization opportunities.');
    } else if (failureRate < 5) {
      recommendations.push('Excellent test pass rate. System performance is within acceptable limits.');
    }

    // Analyze duration
    if (report.duration > 2400) { // 40 minutes
      recommendations.push('Test suite duration is high. Consider optimizing test execution or running tests in parallel.');
    }

    // General recommendations
    recommendations.push('Monitor API response times regularly to catch performance regressions early.');
    recommendations.push('Consider implementing performance budgets in CI/CD pipeline.');
    recommendations.push('Review database query performance and indexing strategies regularly.');
    recommendations.push('Monitor frontend bundle sizes and optimize when necessary.');

    report.recommendations = recommendations;
  }

  private async generateHtmlReport(report: PerformanceReport) {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FitnessMealPlanner Performance Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 40px; }
        .header h1 { color: #2c3e50; margin-bottom: 10px; }
        .header .timestamp { color: #7f8c8d; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .metric-card { background: #ecf0f1; padding: 20px; border-radius: 6px; text-align: center; }
        .metric-card h3 { margin: 0 0 10px 0; color: #2c3e50; }
        .metric-card .value { font-size: 2em; font-weight: bold; color: #3498db; }
        .suites { margin-bottom: 40px; }
        .suite { background: #f8f9fa; padding: 20px; margin-bottom: 15px; border-radius: 6px; border-left: 4px solid #3498db; }
        .suite h3 { margin: 0 0 10px 0; color: #2c3e50; }
        .suite-stats { display: flex; gap: 20px; }
        .suite-stats span { padding: 5px 10px; border-radius: 4px; font-size: 0.9em; }
        .passed { background: #d4edda; color: #155724; }
        .failed { background: #f8d7da; color: #721c24; }
        .recommendations { background: #fff3cd; padding: 20px; border-radius: 6px; border-left: 4px solid #ffc107; }
        .recommendations h3 { margin: 0 0 15px 0; color: #856404; }
        .recommendations ul { margin: 0; padding-left: 20px; }
        .recommendations li { margin-bottom: 8px; color: #856404; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 FitnessMealPlanner Performance Report</h1>
            <div class="timestamp">Generated: ${new Date(report.timestamp).toLocaleString()}</div>
        </div>

        <div class="metrics">
            <div class="metric-card">
                <h3>Total Tests</h3>
                <div class="value">${report.totalTests}</div>
            </div>
            <div class="metric-card">
                <h3>Passed</h3>
                <div class="value" style="color: #27ae60;">${report.passedTests}</div>
            </div>
            <div class="metric-card">
                <h3>Failed</h3>
                <div class="value" style="color: #e74c3c;">${report.failedTests}</div>
            </div>
            <div class="metric-card">
                <h3>Duration</h3>
                <div class="value">${(report.duration / 60).toFixed(1)}m</div>
            </div>
        </div>

        <div class="suites">
            <h2>Test Suite Results</h2>
            ${report.suites.map(suite => `
                <div class="suite">
                    <h3>${suite.name.charAt(0).toUpperCase() + suite.name.slice(1)} Tests</h3>
                    <div class="suite-stats">
                        <span class="passed">Passed: ${suite.passed}</span>
                        <span class="failed">Failed: ${suite.failed}</span>
                        <span>Total: ${suite.tests}</span>
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="recommendations">
            <h3>💡 Recommendations</h3>
            <ul>
                ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
    </div>
</body>
</html>`;

    const htmlPath = path.join(this.options.outputDir, 'performance-report.html');
    await fs.writeFile(htmlPath, htmlContent);
  }

  static showHelp() {
    console.log(`
🚀 FitnessMealPlanner Performance Test Runner

Usage:
  tsx test/performance/run-performance-tests.ts [options]

Options:
  --suite=<name>    Run specific test suite (api, frontend, database, scalability, baseline)
  --baseline        Run only baseline performance tests
  --verbose         Show detailed output
  --no-report       Skip report generation

Examples:
  tsx test/performance/run-performance-tests.ts                    # Run all tests
  tsx test/performance/run-performance-tests.ts --suite=api        # Run API tests only
  tsx test/performance/run-performance-tests.ts --baseline         # Run baseline tests
  tsx test/performance/run-performance-tests.ts --verbose          # Verbose output

Available Test Suites:
  • api          - API Performance Tests (60 tests, ~5-8 minutes)
  • frontend     - Frontend Performance Tests (50 tests, ~8-12 minutes)
  • database     - Database Performance Tests (50 tests, ~3-5 minutes)
  • scalability  - Scalability Tests (40 tests, ~10-15 minutes)
  • baseline     - Performance Baseline and Reporting (~2-3 minutes)

Prerequisites:
  • Docker running (for development environment)
  • Development server running on localhost:4000
  • Database connection configured
  • Playwright browsers installed
`);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    PerformanceTestRunner.showHelp();
    process.exit(0);
  }

  const runner = new PerformanceTestRunner();
  await runner.run();
}

if (import.meta.main) {
  main().catch(error => {
    console.error('Failed to run performance tests:', error);
    process.exit(1);
  });
}

export { PerformanceTestRunner };