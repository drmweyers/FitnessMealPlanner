/**
 * COMPREHENSIVE BUG FIX TEST RUNNER
 * 
 * This script orchestrates the execution of all bug fix validation tests
 * across multiple browsers and generates comprehensive reports.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface TestResults {
  browser: string;
  testSuite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  errors: string[];
}

class BugFixTestRunner {
  private results: TestResults[] = [];
  private reportDir = 'test-results/bug-fix-validation';

  constructor() {
    // Ensure report directory exists
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Comprehensive Bug Fix Validation Tests');
    console.log('===============================================');
    
    // Test configurations
    const testConfigs = [
      {
        name: 'Bug Fix Validation Suite',
        file: 'trainer-bug-fixes-validation.spec.ts',
        browsers: ['chromium', 'firefox', 'webkit']
      },
      {
        name: 'Bug Fix Edge Cases',
        file: 'trainer-bug-fixes-edge-cases.spec.ts',
        browsers: ['chromium', 'firefox'] // Edge cases primarily on major browsers
      }
    ];

    // Run tests for each configuration
    for (const config of testConfigs) {
      await this.runTestSuite(config);
    }

    // Generate comprehensive report
    await this.generateReport();
  }

  private async runTestSuite(config: { name: string; file: string; browsers: string[] }): Promise<void> {
    console.log(`\n📋 Running ${config.name}`);
    console.log(`📁 Test file: ${config.file}`);
    
    for (const browser of config.browsers) {
      console.log(`\n🌐 Testing on ${browser}...`);
      
      try {
        const startTime = Date.now();
        
        // Run Playwright test for specific browser
        const command = `npx playwright test ${config.file} --project=${browser} --reporter=json`;
        const output = execSync(command, { 
          cwd: process.cwd(),
          encoding: 'utf8',
          timeout: 300000 // 5 minute timeout per browser
        });
        
        const duration = Date.now() - startTime;
        
        // Parse results
        const result = this.parseTestResults(output, browser, config.name, duration);
        this.results.push(result);
        
        console.log(`✅ ${browser}: ${result.passed} passed, ${result.failed} failed, ${result.skipped} skipped (${duration}ms)`);
        
      } catch (error: any) {
        console.error(`❌ ${browser} failed:`, error.message);
        
        this.results.push({
          browser,
          testSuite: config.name,
          passed: 0,
          failed: 1,
          skipped: 0,
          duration: 0,
          errors: [error.message]
        });
      }
    }
  }

  private parseTestResults(output: string, browser: string, testSuite: string, duration: number): TestResults {
    try {
      // Try to parse JSON output
      const jsonMatch = output.match(/\{.*"stats".*\}/s);
      if (jsonMatch) {
        const results = JSON.parse(jsonMatch[0]);
        return {
          browser,
          testSuite,
          passed: results.stats.passed || 0,
          failed: results.stats.failed || 0,
          skipped: results.stats.skipped || 0,
          duration,
          errors: results.errors || []
        };
      }
    } catch (e) {
      console.warn('Could not parse JSON results, using text parsing');
    }

    // Fallback to text parsing
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);
    const skippedMatch = output.match(/(\d+) skipped/);

    return {
      browser,
      testSuite,
      passed: passedMatch ? parseInt(passedMatch[1]) : 0,
      failed: failedMatch ? parseInt(failedMatch[1]) : 0,
      skipped: skippedMatch ? parseInt(skippedMatch[1]) : 0,
      duration,
      errors: []
    };
  }

  private async generateReport(): Promise<void> {
    console.log('\n📊 Generating Comprehensive Test Report');
    console.log('=====================================');

    const timestamp = new Date().toISOString();
    const reportData = {
      timestamp,
      summary: this.generateSummary(),
      browserResults: this.generateBrowserSummary(),
      detailedResults: this.results,
      recommendations: this.generateRecommendations()
    };

    // Generate HTML report
    const htmlReport = this.generateHTMLReport(reportData);
    const htmlPath = path.join(this.reportDir, 'bug-fix-validation-report.html');
    fs.writeFileSync(htmlPath, htmlReport);

    // Generate JSON report
    const jsonPath = path.join(this.reportDir, 'bug-fix-validation-results.json');
    fs.writeFileSync(jsonPath, JSON.stringify(reportData, null, 2));

    // Generate markdown summary
    const markdownReport = this.generateMarkdownReport(reportData);
    const mdPath = path.join(this.reportDir, 'BUG_FIX_VALIDATION_SUMMARY.md');
    fs.writeFileSync(mdPath, markdownReport);

    console.log(`\n📄 Reports generated:`);
    console.log(`   HTML Report: ${htmlPath}`);
    console.log(`   JSON Data: ${jsonPath}`);
    console.log(`   Summary: ${mdPath}`);

    // Print summary to console
    this.printConsoleSummary(reportData);
  }

  private generateSummary() {
    const totalTests = this.results.reduce((sum, result) => sum + result.passed + result.failed + result.skipped, 0);
    const totalPassed = this.results.reduce((sum, result) => sum + result.passed, 0);
    const totalFailed = this.results.reduce((sum, result) => sum + result.failed, 0);
    const totalSkipped = this.results.reduce((sum, result) => sum + result.skipped, 0);
    const averageDuration = this.results.reduce((sum, result) => sum + result.duration, 0) / this.results.length;

    return {
      totalTests,
      totalPassed,
      totalFailed,
      totalSkipped,
      passRate: totalTests > 0 ? (totalPassed / totalTests * 100).toFixed(1) : 0,
      averageDuration: Math.round(averageDuration)
    };
  }

  private generateBrowserSummary() {
    const browsers = [...new Set(this.results.map(r => r.browser))];
    return browsers.map(browser => {
      const browserResults = this.results.filter(r => r.browser === browser);
      const passed = browserResults.reduce((sum, r) => sum + r.passed, 0);
      const failed = browserResults.reduce((sum, r) => sum + r.failed, 0);
      const skipped = browserResults.reduce((sum, r) => sum + r.skipped, 0);
      const total = passed + failed + skipped;

      return {
        browser,
        total,
        passed,
        failed,
        skipped,
        passRate: total > 0 ? (passed / total * 100).toFixed(1) : 0
      };
    });
  }

  private generateRecommendations(): string[] {
    const recommendations = [];
    const summary = this.generateSummary();

    if (parseInt(summary.passRate.toString()) < 95) {
      recommendations.push('Some tests are failing. Review failed tests and address issues before production deployment.');
    }

    if (summary.totalFailed > 0) {
      recommendations.push('Failed tests indicate potential regressions. Investigate and fix failing scenarios.');
    }

    const browserSummary = this.generateBrowserSummary();
    const inconsistentBrowsers = browserSummary.filter(b => parseInt(b.passRate.toString()) < 90);
    if (inconsistentBrowsers.length > 0) {
      recommendations.push(`Browser compatibility issues detected in: ${inconsistentBrowsers.map(b => b.browser).join(', ')}`);
    }

    if (summary.averageDuration > 30000) { // More than 30 seconds
      recommendations.push('Test execution time is high. Consider optimizing test performance.');
    }

    if (recommendations.length === 0) {
      recommendations.push('All bug fixes are working correctly across all tested browsers. Ready for production deployment.');
    }

    return recommendations;
  }

  private generateHTMLReport(reportData: any): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bug Fix Validation Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 40px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #007bff; }
        .metric-label { color: #6c757d; margin-top: 10px; }
        .browser-results { margin: 30px 0; }
        .browser-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
        .browser-card { border: 1px solid #dee2e6; border-radius: 6px; padding: 15px; }
        .browser-name { font-weight: bold; margin-bottom: 10px; }
        .test-results { margin-top: 20px; }
        .result-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .recommendations { background: #e3f2fd; padding: 20px; border-radius: 6px; margin: 30px 0; }
        .recommendations h3 { margin-top: 0; color: #1976d2; }
        .recommendations ul { margin: 0; padding-left: 20px; }
        .timestamp { text-align: center; color: #6c757d; margin-top: 30px; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Bug Fix Validation Report</h1>
            <p>Comprehensive testing results for trainer bug fixes</p>
        </div>

        <div class="summary">
            <div class="metric">
                <div class="metric-value">${reportData.summary.totalTests}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric">
                <div class="metric-value passed">${reportData.summary.totalPassed}</div>
                <div class="metric-label">Passed</div>
            </div>
            <div class="metric">
                <div class="metric-value failed">${reportData.summary.totalFailed}</div>
                <div class="metric-label">Failed</div>
            </div>
            <div class="metric">
                <div class="metric-value">${reportData.summary.passRate}%</div>
                <div class="metric-label">Pass Rate</div>
            </div>
        </div>

        <div class="browser-results">
            <h2>Browser Results</h2>
            <div class="browser-grid">
                ${reportData.browserResults.map((browser: any) => `
                    <div class="browser-card">
                        <div class="browser-name">🌐 ${browser.browser}</div>
                        <div class="result-row">
                            <span>Total Tests:</span>
                            <span>${browser.total}</span>
                        </div>
                        <div class="result-row">
                            <span>Passed:</span>
                            <span class="passed">${browser.passed}</span>
                        </div>
                        <div class="result-row">
                            <span>Failed:</span>
                            <span class="failed">${browser.failed}</span>
                        </div>
                        <div class="result-row">
                            <span>Pass Rate:</span>
                            <span>${browser.passRate}%</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="recommendations">
            <h3>🎯 Recommendations</h3>
            <ul>
                ${reportData.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
            </ul>
        </div>

        <div class="timestamp">
            Generated on: ${new Date(reportData.timestamp).toLocaleString()}
        </div>
    </div>
</body>
</html>`;
  }

  private generateMarkdownReport(reportData: any): string {
    return `# Bug Fix Validation Report

## 📊 Test Summary

- **Total Tests:** ${reportData.summary.totalTests}
- **Passed:** ${reportData.summary.totalPassed}
- **Failed:** ${reportData.summary.totalFailed}
- **Skipped:** ${reportData.summary.totalSkipped}
- **Pass Rate:** ${reportData.summary.passRate}%
- **Average Duration:** ${reportData.summary.averageDuration}ms

## 🌐 Browser Results

${reportData.browserResults.map((browser: any) => `
### ${browser.browser}
- Total: ${browser.total}
- Passed: ${browser.passed}
- Failed: ${browser.failed}
- Pass Rate: ${browser.passRate}%
`).join('')}

## 🎯 Recommendations

${reportData.recommendations.map((rec: string) => `- ${rec}`).join('\n')}

## 📝 Detailed Results

${reportData.detailedResults.map((result: TestResults) => `
### ${result.browser} - ${result.testSuite}
- Passed: ${result.passed}
- Failed: ${result.failed}
- Skipped: ${result.skipped}
- Duration: ${result.duration}ms
${result.errors.length > 0 ? `- Errors: ${result.errors.join(', ')}` : ''}
`).join('')}

---
*Generated on: ${new Date(reportData.timestamp).toLocaleString()}*`;
  }

  private printConsoleSummary(reportData: any): void {
    console.log('\n🎉 BUG FIX VALIDATION COMPLETE!');
    console.log('================================');
    console.log(`📊 Total Tests: ${reportData.summary.totalTests}`);
    console.log(`✅ Passed: ${reportData.summary.totalPassed}`);
    console.log(`❌ Failed: ${reportData.summary.totalFailed}`);
    console.log(`⏭️  Skipped: ${reportData.summary.totalSkipped}`);
    console.log(`📈 Pass Rate: ${reportData.summary.passRate}%`);
    console.log(`⏱️  Average Duration: ${reportData.summary.averageDuration}ms`);

    console.log('\n🌐 Browser Summary:');
    reportData.browserResults.forEach((browser: any) => {
      const status = browser.passRate === '100.0' ? '✅' : browser.failed > 0 ? '❌' : '⚠️';
      console.log(`   ${status} ${browser.browser}: ${browser.passRate}% (${browser.passed}/${browser.total})`);
    });

    console.log('\n🎯 Key Recommendations:');
    reportData.recommendations.slice(0, 3).forEach((rec: string) => {
      console.log(`   • ${rec}`);
    });

    if (reportData.summary.totalFailed === 0) {
      console.log('\n🎉 ALL BUG FIXES VALIDATED SUCCESSFULLY!');
      console.log('   Both recipe card and customer list bugs are fixed.');
      console.log('   Application is ready for production deployment.');
    } else {
      console.log('\n⚠️  SOME TESTS FAILED - REVIEW NEEDED');
      console.log('   Please address failing tests before deployment.');
    }
  }
}

// Run the test suite if this file is executed directly
if (require.main === module) {
  const runner = new BugFixTestRunner();
  runner.runAllTests().catch(console.error);
}

export { BugFixTestRunner };