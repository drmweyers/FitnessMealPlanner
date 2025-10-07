#!/usr/bin/env tsx

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { testConfig } from './puppeteer.config';

interface TestReport {
  passed: number;
  failed: number;
  total: number;
  duration: number;
  failures: Array<{
    test: string;
    error: string;
    screenshot?: string;
  }>;
}

class GUITestRunner {
  private testDir = path.join(process.cwd(), 'test/gui/specs');
  private reportDir = path.join(process.cwd(), 'test/gui/reports');

  async run(): Promise<void> {
    console.log('🚀 Starting FitMeal Pro GUI Test Suite...\n');
    
    // Ensure application is running
    await this.checkApplicationHealth();
    
    // Setup test environment
    await this.setupTestEnvironment();
    
    // Run tests
    const report = await this.runTests();
    
    // Generate report
    await this.generateReport(report);
    
    // Print summary
    this.printSummary(report);
    
    // Exit with proper code
    process.exit(report.failed > 0 ? 1 : 0);
  }

  private async checkApplicationHealth(): Promise<void> {
    console.log('🔍 Checking application health...');
    
    try {
      const response = await fetch(`${testConfig.baseUrl}/health`);
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      console.log('✅ Application is running and healthy\n');
    } catch (error) {
      console.error('❌ Application health check failed:');
      console.error(`   Make sure the application is running at ${testConfig.baseUrl}`);
      console.error('   Run: docker compose --profile dev up\n');
      throw error;
    }
  }

  private async setupTestEnvironment(): Promise<void> {
    console.log('🛠️  Setting up test environment...');
    
    // Create necessary directories
    await fs.mkdir(this.reportDir, { recursive: true });
    await fs.mkdir(path.join(process.cwd(), testConfig.screenshotsPath), { recursive: true });
    
    // Set environment variables
    process.env.TEST_BASE_URL = testConfig.baseUrl;
    process.env.CI = process.env.CI || 'false';
    
    console.log('✅ Test environment ready\n');
  }

  private async runTests(): Promise<TestReport> {
    console.log('🧪 Running GUI tests...\n');
    
    const startTime = Date.now();
    const testFiles = await this.getTestFiles();
    
    let passed = 0;
    let failed = 0;
    const failures: TestReport['failures'] = [];
    
    for (const testFile of testFiles) {
      console.log(`   📝 Running ${path.basename(testFile)}...`);
      
      try {
        await this.runTestFile(testFile);
        passed++;
        console.log(`   ✅ ${path.basename(testFile)} passed`);
      } catch (error) {
        failed++;
        console.log(`   ❌ ${path.basename(testFile)} failed`);
        
        failures.push({
          test: path.basename(testFile),
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    const duration = Date.now() - startTime;
    
    return {
      passed,
      failed,
      total: passed + failed,
      duration,
      failures
    };
  }

  private async getTestFiles(): Promise<string[]> {
    const files = await fs.readdir(this.testDir);
    return files
      .filter(file => file.endsWith('.test.ts'))
      .map(file => path.join(this.testDir, file));
  }

  private async runTestFile(testFile: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn('npx', ['vitest', 'run', testFile], {
        stdio: 'pipe',
        shell: true
      });
      
      let output = '';
      let errorOutput = '';
      
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(errorOutput || output));
        }
      });
    });
  }

  private async generateReport(report: TestReport): Promise<void> {
    const reportPath = path.join(this.reportDir, `gui-test-report-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Generate HTML report
    const htmlReport = this.generateHTMLReport(report);
    const htmlPath = path.join(this.reportDir, 'latest-report.html');
    await fs.writeFile(htmlPath, htmlReport);
    
    console.log(`📊 Report generated: ${htmlPath}`);
  }

  private generateHTMLReport(report: TestReport): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>FitMeal Pro GUI Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: white; padding: 15px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .failure { background: #fff5f5; padding: 15px; margin: 10px 0; border-left: 4px solid #dc3545; }
    </style>
</head>
<body>
    <div class="header">
        <h1>FitMeal Pro GUI Test Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <p>Duration: ${(report.duration / 1000).toFixed(2)}s</p>
    </div>
    
    <div class="summary">
        <div class="metric">
            <h3>Total Tests</h3>
            <p style="font-size: 24px; margin: 0;">${report.total}</p>
        </div>
        <div class="metric">
            <h3 class="passed">Passed</h3>
            <p style="font-size: 24px; margin: 0; color: #28a745;">${report.passed}</p>
        </div>
        <div class="metric">
            <h3 class="failed">Failed</h3>
            <p style="font-size: 24px; margin: 0; color: #dc3545;">${report.failed}</p>
        </div>
        <div class="metric">
            <h3>Success Rate</h3>
            <p style="font-size: 24px; margin: 0;">${((report.passed / report.total) * 100).toFixed(1)}%</p>
        </div>
    </div>
    
    ${report.failures.length > 0 ? `
        <h2>Test Failures</h2>
        ${report.failures.map(failure => `
            <div class="failure">
                <h4>${failure.test}</h4>
                <pre>${failure.error}</pre>
                ${failure.screenshot ? `<p>Screenshot: ${failure.screenshot}</p>` : ''}
            </div>
        `).join('')}
    ` : '<h2 style="color: #28a745;">All tests passed! 🎉</h2>'}
</body>
</html>`;
  }

  private printSummary(report: TestReport): void {
    console.log('\n📊 Test Summary:');
    console.log('═'.repeat(50));
    console.log(`   Total Tests:   ${report.total}`);
    console.log(`   ✅ Passed:      ${report.passed}`);
    console.log(`   ❌ Failed:      ${report.failed}`);
    console.log(`   🕐 Duration:    ${(report.duration / 1000).toFixed(2)}s`);
    console.log(`   📈 Success:     ${((report.passed / report.total) * 100).toFixed(1)}%`);
    console.log('═'.repeat(50));
    
    if (report.failed > 0) {
      console.log('\n❌ Failed Tests:');
      report.failures.forEach(failure => {
        console.log(`   • ${failure.test}`);
      });
    } else {
      console.log('\n🎉 All tests passed!');
    }
    
    console.log(`\n📊 Full report: test/gui/reports/latest-report.html`);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new GUITestRunner();
  runner.run().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

export { GUITestRunner };