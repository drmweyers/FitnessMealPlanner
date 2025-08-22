/**
 * Favorites Test Runner
 * 
 * Comprehensive test execution framework for the Recipe Favoriting System + User Engagement features.
 * Provides orchestrated test execution, reporting, and result aggregation.
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

interface TestSuite {
  name: string;
  pattern: string;
  timeout: number;
  retries: number;
  browsers: string[];
  devices?: string[];
}

interface TestResult {
  suite: string;
  browser: string;
  device?: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  errors: string[];
  coverage?: number;
}

interface TestReport {
  timestamp: string;
  totalSuites: number;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  results: TestResult[];
  summary: {
    customer: TestResult[];
    trainer: TestResult[];
    admin: TestResult[];
    mobile: TestResult[];
    tablet: TestResult[];
    performance: TestResult[];
    accessibility: TestResult[];
    browsers: TestResult[];
    errorHandling: TestResult[];
  };
}

export class FavoritesTestRunner {
  private readonly testSuites: TestSuite[] = [
    {
      name: 'Customer Favorites Journey',
      pattern: 'test/e2e/favorites/customer/*.spec.ts',
      timeout: 60000,
      retries: 2,
      browsers: ['chromium', 'firefox', 'webkit']
    },
    {
      name: 'Trainer Favorites Management',
      pattern: 'test/e2e/favorites/trainer/*.spec.ts',
      timeout: 90000,
      retries: 2,
      browsers: ['chromium', 'firefox']
    },
    {
      name: 'Admin Platform Analytics',
      pattern: 'test/e2e/favorites/admin/*.spec.ts',
      timeout: 120000,
      retries: 1,
      browsers: ['chromium']
    },
    {
      name: 'Mobile Favorites Experience',
      pattern: 'test/e2e/favorites/mobile/*.spec.ts',
      timeout: 90000,
      retries: 2,
      browsers: ['chromium', 'webkit'],
      devices: ['iPhone 12', 'Pixel 5']
    },
    {
      name: 'Tablet Favorites Experience',
      pattern: 'test/e2e/favorites/tablet/*.spec.ts',
      timeout: 90000,
      retries: 2,
      browsers: ['chromium', 'webkit'],
      devices: ['iPad Pro', 'Galaxy Tab S7']
    },
    {
      name: 'Performance Testing',
      pattern: 'test/e2e/favorites/performance/*.spec.ts',
      timeout: 180000,
      retries: 1,
      browsers: ['chromium']
    },
    {
      name: 'Error Handling and Edge Cases',
      pattern: 'test/e2e/favorites/error-handling/*.spec.ts',
      timeout: 120000,
      retries: 3,
      browsers: ['chromium', 'firefox']
    },
    {
      name: 'Accessibility Testing',
      pattern: 'test/e2e/favorites/accessibility/*.spec.ts',
      timeout: 90000,
      retries: 1,
      browsers: ['chromium', 'firefox', 'webkit']
    },
    {
      name: 'Cross-Browser Compatibility',
      pattern: 'test/e2e/favorites/browsers/*.spec.ts',
      timeout: 120000,
      retries: 2,
      browsers: ['chromium', 'firefox', 'webkit']
    }
  ];

  private readonly reportDir = 'test-results/favorites';
  private readonly configDir = 'test/e2e/favorites/configs';

  constructor() {
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    [this.reportDir, this.configDir].forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Run all favorites test suites
   */
  async runAllTests(): Promise<TestReport> {
    console.log('🚀 Starting Comprehensive Favorites Test Suite Execution');
    console.log('=' .repeat(80));

    const startTime = Date.now();
    const results: TestResult[] = [];

    for (const suite of this.testSuites) {
      console.log(`\n📋 Executing: ${suite.name}`);
      console.log('-'.repeat(50));

      const suiteResults = await this.runTestSuite(suite);
      results.push(...suiteResults);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    const report = this.generateTestReport(results, duration);
    await this.saveTestReport(report);
    this.printSummary(report);

    return report;
  }

  /**
   * Run specific test suite
   */
  async runTestSuite(suite: TestSuite): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const browser of suite.browsers) {
      if (suite.devices) {
        // Run on specific devices
        for (const device of suite.devices) {
          const result = await this.executeTest(suite, browser, device);
          results.push(result);
        }
      } else {
        // Run on desktop browser
        const result = await this.executeTest(suite, browser);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Execute individual test
   */
  private async executeTest(
    suite: TestSuite, 
    browser: string, 
    device?: string
  ): Promise<TestResult> {
    const testName = device ? `${suite.name} (${browser} - ${device})` : `${suite.name} (${browser})`;
    
    console.log(`  🔧 Running: ${testName}`);

    const startTime = Date.now();
    
    try {
      // Generate Playwright config for this specific test
      const configPath = await this.generatePlaywrightConfig(suite, browser, device);
      
      // Execute Playwright test
      const command = [
        'npx playwright test',
        `--config=${configPath}`,
        `"${suite.pattern}"`,
        `--retries=${suite.retries}`,
        `--timeout=${suite.timeout}`,
        '--reporter=json'
      ].join(' ');

      console.log(`    Command: ${command}`);

      const output = execSync(command, { 
        encoding: 'utf8',
        timeout: suite.timeout + 30000 // Add buffer time
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Parse test results
      const testOutput = this.parseTestOutput(output);

      const result: TestResult = {
        suite: suite.name,
        browser,
        device,
        passed: testOutput.passed,
        failed: testOutput.failed,
        skipped: testOutput.skipped,
        duration,
        errors: testOutput.errors
      };

      console.log(`    ✅ Completed: ${result.passed} passed, ${result.failed} failed, ${result.skipped} skipped`);

      return result;

    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`    ❌ Failed: ${error}`);

      return {
        suite: suite.name,
        browser,
        device,
        passed: 0,
        failed: 1,
        skipped: 0,
        duration,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Generate Playwright configuration for specific test run
   */
  private async generatePlaywrightConfig(
    suite: TestSuite, 
    browser: string, 
    device?: string
  ): Promise<string> {
    const configName = device 
      ? `playwright.${suite.name.toLowerCase().replace(/\s+/g, '-')}.${browser}.${device.toLowerCase().replace(/\s+/g, '-')}.config.ts`
      : `playwright.${suite.name.toLowerCase().replace(/\s+/g, '-')}.${browser}.config.ts`;

    const configPath = join(this.configDir, configName);

    const config = this.generateConfigContent(suite, browser, device);
    writeFileSync(configPath, config);

    return configPath;
  }

  /**
   * Generate Playwright configuration content
   */
  private generateConfigContent(suite: TestSuite, browser: string, device?: string): string {
    const deviceConfig = device ? `
    use: { 
      ...devices['${device}'],
      browserName: '${browser === 'chromium' ? 'chromium' : browser === 'webkit' ? 'webkit' : 'firefox'}'
    },` : `
    use: { 
      browserName: '${browser === 'chromium' ? 'chromium' : browser === 'webkit' ? 'webkit' : 'firefox'}'
    },`;

    return `
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '../../../',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: ${suite.retries},
  workers: 1,
  timeout: ${suite.timeout},
  reporter: [
    ['json', { outputFile: '${this.reportDir}/${suite.name.toLowerCase().replace(/\s+/g, '-')}-${browser}${device ? '-' + device.toLowerCase().replace(/\s+/g, '-') : ''}-results.json' }],
    ['html', { outputFolder: '${this.reportDir}/${suite.name.toLowerCase().replace(/\s+/g, '-')}-${browser}${device ? '-' + device.toLowerCase().replace(/\s+/g, '-') : ''}-report' }]
  ],
  use: {
    baseURL: 'http://localhost:4000',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure'${deviceConfig}
  },
  projects: [
    {
      name: '${suite.name}',${deviceConfig}
    }
  ],
  webServer: {
    command: 'echo "Ensure development server is running: docker-compose --profile dev up -d"',
    url: 'http://localhost:4000',
    reuseExistingServer: true
  }
});
`;
  }

  /**
   * Parse test output to extract results
   */
  private parseTestOutput(output: string): {
    passed: number;
    failed: number;
    skipped: number;
    errors: string[];
  } {
    try {
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const results = JSON.parse(jsonMatch[0]);
        return {
          passed: results.stats?.passed || 0,
          failed: results.stats?.failed || 0,
          skipped: results.stats?.skipped || 0,
          errors: results.errors || []
        };
      }
    } catch (error) {
      console.warn('Failed to parse test output as JSON, using fallback parsing');
    }

    // Fallback parsing
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);
    const skippedMatch = output.match(/(\d+) skipped/);

    return {
      passed: passedMatch ? parseInt(passedMatch[1]) : 0,
      failed: failedMatch ? parseInt(failedMatch[1]) : 0,
      skipped: skippedMatch ? parseInt(skippedMatch[1]) : 0,
      errors: []
    };
  }

  /**
   * Generate comprehensive test report
   */
  private generateTestReport(results: TestResult[], duration: number): TestReport {
    const totalTests = results.reduce((sum, r) => sum + r.passed + r.failed + r.skipped, 0);
    const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
    const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);

    return {
      timestamp: new Date().toISOString(),
      totalSuites: this.testSuites.length,
      totalTests,
      passed: totalPassed,
      failed: totalFailed,
      skipped: totalSkipped,
      duration,
      results,
      summary: {
        customer: results.filter(r => r.suite.includes('Customer')),
        trainer: results.filter(r => r.suite.includes('Trainer')),
        admin: results.filter(r => r.suite.includes('Admin')),
        mobile: results.filter(r => r.suite.includes('Mobile')),
        tablet: results.filter(r => r.suite.includes('Tablet')),
        performance: results.filter(r => r.suite.includes('Performance')),
        accessibility: results.filter(r => r.suite.includes('Accessibility')),
        browsers: results.filter(r => r.suite.includes('Browser')),
        errorHandling: results.filter(r => r.suite.includes('Error'))
      }
    };
  }

  /**
   * Save test report to file
   */
  private async saveTestReport(report: TestReport): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Save JSON report
    const jsonPath = join(this.reportDir, `favorites-test-report-${timestamp}.json`);
    writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    // Save HTML report
    const htmlPath = join(this.reportDir, `favorites-test-report-${timestamp}.html`);
    const htmlContent = this.generateHTMLReport(report);
    writeFileSync(htmlPath, htmlContent);

    // Save latest report (overwrite)
    const latestJsonPath = join(this.reportDir, 'latest-favorites-test-report.json');
    writeFileSync(latestJsonPath, JSON.stringify(report, null, 2));

    const latestHtmlPath = join(this.reportDir, 'latest-favorites-test-report.html');
    writeFileSync(latestHtmlPath, htmlContent);

    console.log(`\n📊 Test reports saved:`);
    console.log(`   JSON: ${jsonPath}`);
    console.log(`   HTML: ${htmlPath}`);
  }

  /**
   * Generate HTML report
   */
  private generateHTMLReport(report: TestReport): string {
    const successRate = ((report.passed / (report.passed + report.failed)) * 100).toFixed(1);
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Favorites Test Report - ${report.timestamp}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 4px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .suite-results { margin-bottom: 30px; }
        .suite-title { font-size: 1.2em; font-weight: bold; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; }
        .status-passed { color: #28a745; font-weight: bold; }
        .status-failed { color: #dc3545; font-weight: bold; }
        .errors { background: #f8d7da; padding: 10px; border-radius: 4px; margin-top: 10px; }
        .chart { margin: 20px 0; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🍽️ Recipe Favoriting System - E2E Test Report</h1>
            <p><strong>Execution Time:</strong> ${report.timestamp}</p>
            <p><strong>Duration:</strong> ${Math.round(report.duration / 1000 / 60)} minutes</p>
        </div>

        <div class="summary">
            <div class="metric">
                <div class="metric-value">${report.totalSuites}</div>
                <div>Test Suites</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.totalTests}</div>
                <div>Total Tests</div>
            </div>
            <div class="metric">
                <div class="metric-value passed">${report.passed}</div>
                <div>Passed</div>
            </div>
            <div class="metric">
                <div class="metric-value failed">${report.failed}</div>
                <div>Failed</div>
            </div>
            <div class="metric">
                <div class="metric-value skipped">${report.skipped}</div>
                <div>Skipped</div>
            </div>
            <div class="metric">
                <div class="metric-value">${successRate}%</div>
                <div>Success Rate</div>
            </div>
        </div>

        ${Object.entries(report.summary).map(([category, results]) => `
            <div class="suite-results">
                <div class="suite-title">📋 ${category.charAt(0).toUpperCase() + category.slice(1)} Tests</div>
                <table>
                    <thead>
                        <tr>
                            <th>Suite</th>
                            <th>Browser</th>
                            <th>Device</th>
                            <th>Passed</th>
                            <th>Failed</th>
                            <th>Duration</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${results.map(result => `
                            <tr>
                                <td>${result.suite}</td>
                                <td>${result.browser}</td>
                                <td>${result.device || 'Desktop'}</td>
                                <td class="passed">${result.passed}</td>
                                <td class="failed">${result.failed}</td>
                                <td>${Math.round(result.duration / 1000)}s</td>
                                <td class="${result.failed > 0 ? 'status-failed' : 'status-passed'}">
                                    ${result.failed > 0 ? '❌ FAILED' : '✅ PASSED'}
                                </td>
                            </tr>
                            ${result.errors.length > 0 ? `
                                <tr>
                                    <td colspan="7">
                                        <div class="errors">
                                            <strong>Errors:</strong><br>
                                            ${result.errors.map(error => `• ${error}`).join('<br>')}
                                        </div>
                                    </td>
                                </tr>
                            ` : ''}
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `).join('')}

        <div class="footer">
            <p><em>Generated by Favorites Test Runner at ${new Date().toLocaleString()}</em></p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Print test summary to console
   */
  private printSummary(report: TestReport): void {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 FAVORITES TEST EXECUTION SUMMARY');
    console.log('='.repeat(80));
    
    console.log(`📊 Overall Results:`);
    console.log(`   Total Suites: ${report.totalSuites}`);
    console.log(`   Total Tests:  ${report.totalTests}`);
    console.log(`   ✅ Passed:   ${report.passed}`);
    console.log(`   ❌ Failed:   ${report.failed}`);
    console.log(`   ⏭️  Skipped:  ${report.skipped}`);
    console.log(`   ⏱️  Duration: ${Math.round(report.duration / 1000 / 60)} minutes`);
    console.log(`   📈 Success Rate: ${((report.passed / (report.passed + report.failed)) * 100).toFixed(1)}%`);

    console.log(`\n📋 Suite Breakdown:`);
    Object.entries(report.summary).forEach(([category, results]) => {
      const categoryPassed = results.reduce((sum, r) => sum + r.passed, 0);
      const categoryFailed = results.reduce((sum, r) => sum + r.failed, 0);
      const categoryTotal = categoryPassed + categoryFailed;
      const categorySuccess = categoryTotal > 0 ? ((categoryPassed / categoryTotal) * 100).toFixed(1) : '0';
      
      console.log(`   ${category.padEnd(15)}: ${categoryPassed}/${categoryTotal} (${categorySuccess}%)`);
    });

    if (report.failed > 0) {
      console.log(`\n❌ Failed Tests:`);
      report.results
        .filter(r => r.failed > 0)
        .forEach(result => {
          console.log(`   • ${result.suite} (${result.browser}${result.device ? ` - ${result.device}` : ''})`);
          result.errors.forEach(error => {
            console.log(`     └─ ${error}`);
          });
        });
    }

    console.log('\n' + '='.repeat(80));
    
    if (report.failed === 0) {
      console.log('🎉 ALL TESTS PASSED! Favorites system is ready for production!');
    } else {
      console.log('⚠️  Some tests failed. Please review the failures above.');
    }
    
    console.log('='.repeat(80));
  }
}

/**
 * CLI execution
 */
if (require.main === module) {
  const runner = new FavoritesTestRunner();
  
  runner.runAllTests()
    .then(report => {
      process.exit(report.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}

export default FavoritesTestRunner;