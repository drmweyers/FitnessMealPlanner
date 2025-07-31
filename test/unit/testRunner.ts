#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { existsSync } from 'fs';

// Create chalk-like functions for colored output
const chalk = {
  blue: { bold: (text: string) => `\x1b[1m\x1b[34m${text}\x1b[0m` },
  green: { bold: (text: string) => `\x1b[1m\x1b[32m${text}\x1b[0m` },
  red: { bold: (text: string) => `\x1b[1m\x1b[31m${text}\x1b[0m` },
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  white: (text: string) => `\x1b[37m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`
};

interface TestResults {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  duration: number;
  coverage?: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
}

class UnitTestRunner {
  private testFiles: string[] = [
    'test/unit/emailService.test.ts',
    'test/unit/invitationRoutes.test.ts', 
    'test/unit/emailUtils.test.ts',
    'test/email-service.test.ts' // Keep existing basic tests
  ];

  async runAllTests(): Promise<TestResults> {
    console.log(chalk.blue.bold('\n🧪 Running Comprehensive Unit Test Suite\n'));
    
    // Check if all test files exist
    const missingFiles = this.testFiles.filter(file => !existsSync(file));
    if (missingFiles.length > 0) {
      console.log(chalk.yellow('⚠️  Missing test files:'));
      missingFiles.forEach(file => console.log(chalk.yellow(`   - ${file}`)));
      console.log('');
    }

    const existingFiles = this.testFiles.filter(file => existsSync(file));
    console.log(chalk.green('✓ Found test files:'));
    existingFiles.forEach(file => console.log(chalk.green(`  • ${file}`)));
    console.log('');

    try {
      // Run tests with coverage
      console.log(chalk.blue('Running tests with coverage...\n'));
      
      const testCommand = `npm test -- ${existingFiles.join(' ')} --coverage`;
      const startTime = Date.now();
      
      const output = execSync(testCommand, { 
        encoding: 'utf-8',
        stdio: 'pipe' 
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Parse test results from output
      const results = this.parseTestResults(output, duration);
      
      // Display results
      this.displayResults(results);
      
      return results;
      
    } catch (error: any) {
      console.error(chalk.red.bold('\n❌ Test execution failed\n'));
      
      if (error.stdout) {
        console.log(chalk.yellow('Test output:'));
        console.log(error.stdout);
      }
      
      if (error.stderr) {
        console.log(chalk.red('Error output:'));
        console.log(error.stderr);
      }
      
      // Try to parse partial results
      const output = error.stdout || '';
      const duration = 0;
      const results = this.parseTestResults(output, duration);
      
      this.displayResults(results, true);
      
      throw error;
    }
  }

  private parseTestResults(output: string, duration: number): TestResults {
    const results: TestResults = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      duration
    };

    // Parse Vitest output format
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);
    const skippedMatch = output.match(/(\d+) skipped/);
    
    if (passedMatch) results.passed = parseInt(passedMatch[1]);
    if (failedMatch) results.failed = parseInt(failedMatch[1]);
    if (skippedMatch) results.skipped = parseInt(skippedMatch[1]);
    
    results.total = results.passed + results.failed + results.skipped;

    // Parse coverage if available
    const coverageMatch = output.match(/All files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/);
    if (coverageMatch) {
      results.coverage = {
        statements: parseFloat(coverageMatch[1]),
        branches: parseFloat(coverageMatch[2]),
        functions: parseFloat(coverageMatch[3]),
        lines: parseFloat(coverageMatch[4])
      };
    }

    return results;
  }

  private displayResults(results: TestResults, hasErrors: boolean = false): void {
    console.log(chalk.blue.bold('\n📊 Test Results Summary'));
    console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    
    // Test counts
    if (results.passed > 0) {
      console.log(chalk.green(`✅ Passed: ${results.passed}`));
    }
    if (results.failed > 0) {
      console.log(chalk.red(`❌ Failed: ${results.failed}`));
    }
    if (results.skipped > 0) {
      console.log(chalk.yellow(`⏭️  Skipped: ${results.skipped}`));
    }
    
    console.log(chalk.white(`📝 Total: ${results.total} tests`));
    console.log(chalk.white(`⏱️  Duration: ${results.duration}ms`));

    // Coverage summary
    if (results.coverage) {
      console.log('\n' + chalk.blue.bold('📈 Coverage Summary'));
      console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
      
      const coverage = results.coverage;
      console.log(chalk.white(`Statements: ${this.formatCoverage(coverage.statements)}`));
      console.log(chalk.white(`Branches:   ${this.formatCoverage(coverage.branches)}`));
      console.log(chalk.white(`Functions:  ${this.formatCoverage(coverage.functions)}`));
      console.log(chalk.white(`Lines:      ${this.formatCoverage(coverage.lines)}`));
    }

    // Overall status
    console.log('\n' + chalk.blue.bold('🎯 Overall Status'));
    console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    
    if (hasErrors || results.failed > 0) {
      console.log(chalk.red.bold('❌ TESTS FAILED'));
      if (results.failed > 0) {
        console.log(chalk.red(`   ${results.failed} test(s) failed`));
      }
    } else {
      console.log(chalk.green.bold('✅ ALL TESTS PASSED'));
      if (results.coverage) {
        const avgCoverage = (results.coverage.statements + results.coverage.branches + 
                           results.coverage.functions + results.coverage.lines) / 4;
        console.log(chalk.green(`   Average coverage: ${avgCoverage.toFixed(1)}%`));
      }
    }
    
    console.log('');
  }

  private formatCoverage(percentage: number): string {
    const rounded = percentage.toFixed(1);
    if (percentage >= 80) {
      return chalk.green(`${rounded}%`);
    } else if (percentage >= 60) {
      return chalk.yellow(`${rounded}%`);
    } else {
      return chalk.red(`${rounded}%`);
    }
  }

  async runSpecificTests(pattern: string): Promise<TestResults> {
    console.log(chalk.blue.bold(`\n🧪 Running tests matching: ${pattern}\n`));
    
    try {
      const testCommand = `npm test -- --run "${pattern}"`;
      const startTime = Date.now();
      
      const output = execSync(testCommand, { 
        encoding: 'utf-8',
        stdio: 'pipe' 
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const results = this.parseTestResults(output, duration);
      this.displayResults(results);
      
      return results;
      
    } catch (error: any) {
      console.error(chalk.red.bold('\n❌ Test execution failed\n'));
      console.log(error.stdout);
      throw error;
    }
  }

  generateTestReport(results: TestResults): string {
    const timestamp = new Date().toISOString();
    const successRate = results.total > 0 ? (results.passed / results.total * 100).toFixed(1) : '0';
    
    return `
# Unit Test Report
Generated: ${timestamp}

## Summary
- **Total Tests**: ${results.total}
- **Passed**: ${results.passed}
- **Failed**: ${results.failed}  
- **Skipped**: ${results.skipped}
- **Success Rate**: ${successRate}%
- **Duration**: ${results.duration}ms

## Coverage
${results.coverage ? `
- **Statements**: ${results.coverage.statements.toFixed(1)}%
- **Branches**: ${results.coverage.branches.toFixed(1)}%
- **Functions**: ${results.coverage.functions.toFixed(1)}%
- **Lines**: ${results.coverage.lines.toFixed(1)}%
` : 'Coverage data not available'}

## Test Categories
- **Email Service**: Core email functionality and Resend integration
- **Invitation Routes**: API endpoints for customer invitations
- **Email Utils**: Utility functions for email processing
- **Integration**: End-to-end email workflow testing

## Recommendations
${results.failed > 0 ? `
⚠️ **Action Required**: ${results.failed} test(s) failed. Review and fix before deployment.
` : ''}
${results.coverage && results.coverage.statements < 80 ? `
📈 **Coverage**: Consider adding more tests to improve coverage above 80%.
` : ''}
${results.coverage && results.coverage.statements >= 80 ? `
✅ **Coverage**: Good test coverage achieved (${results.coverage.statements.toFixed(1)}%).
` : ''}
`;
  }
}

// CLI interface
async function main() {
  const runner = new UnitTestRunner();
  
  try {
    const args = process.argv.slice(2);
    
    if (args.includes('--help')) {
      console.log(chalk.blue.bold('Unit Test Runner'));
      console.log('');
      console.log('Usage:');
      console.log('  npm run test:unit                 # Run all unit tests');
      console.log('  npm run test:unit -- --pattern    # Run tests matching pattern'); 
      console.log('  npm run test:unit -- --help       # Show this help');
      console.log('');
      return;
    }
    
    if (args.includes('--pattern')) {
      const patternIndex = args.indexOf('--pattern');
      const pattern = args[patternIndex + 1];
      if (!pattern) {
        console.error(chalk.red('Error: --pattern requires a value'));
        process.exit(1);
      }
      await runner.runSpecificTests(pattern);
    } else {
      const results = await runner.runAllTests();
      
      // Generate report
      const report = runner.generateTestReport(results);
      console.log(chalk.blue('\n📄 Generating test report...'));
      
      // Optionally save report to file
      if (args.includes('--save-report')) {
        const fs = await import('fs');
        const reportPath = `test-report-${Date.now()}.md`;
        fs.writeFileSync(reportPath, report);
        console.log(chalk.green(`Report saved to: ${reportPath}`));
      }
      
      // Exit with error code if tests failed
      if (results.failed > 0) {
        process.exit(1);
      }
    }
    
  } catch (error) {
    console.error(chalk.red.bold('\n💥 Test runner error:'));
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { UnitTestRunner };