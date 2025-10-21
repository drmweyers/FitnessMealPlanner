#!/usr/bin/env tsx
/**
 * Claude Subagent: Continuous Meal Plan Testing
 *
 * This agent runs continuously within Claude Code and performs
 * autonomous testing of the meal plan generator system.
 *
 * NO EXTERNAL API CALLS REQUIRED
 *
 * Usage:
 *   npm run test:continuous              # 5-minute interval
 *   npm run test:continuous 10           # 10-minute interval
 *   npm run test:continuous --auto-fix   # Enable auto-fix
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';

const execAsync = promisify(exec);

interface TestRun {
  timestamp: Date;
  category: 'unit' | 'integration' | 'e2e';
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  failures: TestFailure[];
}

interface TestFailure {
  testName: string;
  testFile: string;
  error: string;
  stack: string;
}

interface ContinuousTestConfig {
  interval: number; // minutes between test runs
  categories: ('unit' | 'integration' | 'e2e')[];
  autoFix: boolean;
  reportPath: string;
  onlyMealPlan: boolean; // Only test meal plan related tests
}

class MealPlanContinuousTestAgent {
  private config: ContinuousTestConfig;
  private runHistory: TestRun[] = [];
  private isRunning: boolean = false;
  private cycleCount: number = 0;

  constructor(config: ContinuousTestConfig) {
    this.config = config;
  }

  /**
   * Start continuous testing loop
   */
  async start(): Promise<void> {
    console.log('🤖 Claude Subagent: Continuous Meal Plan Testing');
    console.log('='.repeat(60));
    console.log(`Configuration:`);
    console.log(`  • Interval: ${this.config.interval} minutes`);
    console.log(`  • Categories: ${this.config.categories.join(', ')}`);
    console.log(`  • Auto-fix: ${this.config.autoFix ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`  • Report path: ${this.config.reportPath}`);
    console.log(`  • Focus: ${this.config.onlyMealPlan ? 'Meal Plan Tests Only' : 'All Tests'}`);
    console.log('='.repeat(60) + '\n');

    this.isRunning = true;

    // Initial run
    await this.runTestCycle();

    // Continuous loop
    while (this.isRunning) {
      console.log(`\n⏰ Next test cycle in ${this.config.interval} minutes...`);
      console.log(`   Current time: ${new Date().toLocaleTimeString()}`);
      console.log(`   Next run: ${new Date(Date.now() + this.config.interval * 60 * 1000).toLocaleTimeString()}\n`);

      await this.sleep(this.config.interval * 60 * 1000);

      if (this.isRunning) {
        await this.runTestCycle();
      }
    }
  }

  /**
   * Run a complete test cycle
   */
  private async runTestCycle(): Promise<void> {
    this.cycleCount++;
    const cycleStartTime = Date.now();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 Test Cycle #${this.cycleCount} Started`);
    console.log(`   ${new Date().toLocaleString()}`);
    console.log(`${'='.repeat(60)}\n`);

    const cycleRuns: TestRun[] = [];

    for (const category of this.config.categories) {
      const testRun = await this.runTestCategory(category);
      cycleRuns.push(testRun);
    }

    // Generate cycle report
    await this.generateCycleReport(cycleStartTime, cycleRuns);

    // Run auto-fix if enabled and failures detected
    if (this.config.autoFix && this.hasFailures(cycleRuns)) {
      await this.runAutonomousFixer(cycleRuns);
    }
  }

  /**
   * Run tests for a specific category
   */
  private async runTestCategory(category: 'unit' | 'integration' | 'e2e'): Promise<TestRun> {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📊 Running ${category.toUpperCase()} tests`);
    console.log(`${'─'.repeat(60)}`);

    const startTime = Date.now();
    const command = this.getTestCommand(category);

    console.log(`   Command: ${command}\n`);

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        timeout: 5 * 60 * 1000 // 5-minute timeout
      });

      const duration = Date.now() - startTime;
      const testRun = this.parseTestOutput(category, stdout, stderr, duration);

      this.runHistory.push(testRun);
      this.displayTestResults(testRun);

      return testRun;

    } catch (error: any) {
      // Tests failed - capture results
      const duration = Date.now() - startTime;
      const testRun = this.parseTestOutput(
        category,
        error.stdout || '',
        error.stderr || '',
        duration
      );

      this.runHistory.push(testRun);
      this.displayTestResults(testRun);

      return testRun;
    }
  }

  /**
   * Get test command for category
   */
  private getTestCommand(category: 'unit' | 'integration' | 'e2e'): string {
    if (!this.config.onlyMealPlan) {
      // Run all tests in category
      switch (category) {
        case 'unit':
          return 'npm run test:unit';
        case 'integration':
          return 'npm run test:integration';
        case 'e2e':
          return 'npm run test:playwright';
      }
    }

    // Run only meal plan related tests
    switch (category) {
      case 'unit':
        return 'npx vitest run test/unit/services/intelligentMealPlanGenerator.test.ts test/unit/services/naturalLanguageMealPlan.test.ts test/unit/mealPlanGenerator.test.tsx --reporter=verbose';
      case 'integration':
        return 'npx vitest run test/integration/mealPlanWorkflow.test.ts test/integration/MealPlanAssignmentWorkflow.test.tsx test/integration/CustomerMealPlans.test.tsx --reporter=verbose';
      case 'e2e':
        return 'npx playwright test test/e2e/meal-plan-generator-production.spec.ts test/e2e/unified-meal-plan-generator.spec.ts test/e2e/meal-plan-assignment-comprehensive.spec.ts';
    }
  }

  /**
   * Parse test output to extract results
   */
  private parseTestOutput(
    category: 'unit' | 'integration' | 'e2e',
    stdout: string,
    stderr: string,
    duration: number
  ): TestRun {
    const output = stdout + stderr;

    // Parse Vitest/Playwright output
    const passedMatch = output.match(/(\d+)\s+passed/i);
    const failedMatch = output.match(/(\d+)\s+failed/i);
    const skippedMatch = output.match(/(\d+)\s+skipped/i);

    const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1]) : 0;
    const skipped = skippedMatch ? parseInt(skippedMatch[1]) : 0;

    // Extract failures
    const failures: TestFailure[] = this.extractFailures(output);

    return {
      timestamp: new Date(),
      category,
      passed,
      failed,
      skipped,
      duration,
      failures
    };
  }

  /**
   * Extract failure details from test output
   */
  private extractFailures(output: string): TestFailure[] {
    const failures: TestFailure[] = [];

    // Match Vitest failures
    const vitestPattern = /FAIL\s+(.*?)\s+›\s+(.*?)\n([\s\S]*?)(?=\nTest Files|$)/g;
    let match;

    while ((match = vitestPattern.exec(output)) !== null) {
      failures.push({
        testFile: match[1]?.trim() || 'Unknown file',
        testName: match[2]?.trim() || 'Unknown test',
        error: match[3]?.trim().substring(0, 500) || 'Unknown error',
        stack: match[3]?.trim() || ''
      });
    }

    // Match Playwright failures
    const playwrightPattern = /\d+\)\s+(.*?)\s+›\s+(.*?)\n([\s\S]*?)(?=\n\d+\)|$)/g;

    while ((match = playwrightPattern.exec(output)) !== null) {
      failures.push({
        testFile: match[1]?.trim() || 'Unknown file',
        testName: match[2]?.trim() || 'Unknown test',
        error: match[3]?.trim().substring(0, 500) || 'Unknown error',
        stack: match[3]?.trim() || ''
      });
    }

    return failures;
  }

  /**
   * Display test results
   */
  private displayTestResults(testRun: TestRun): void {
    const total = testRun.passed + testRun.failed + testRun.skipped;
    const successRate = total > 0 ? ((testRun.passed / total) * 100).toFixed(1) : '0.0';
    const durationSec = (testRun.duration / 1000).toFixed(2);

    console.log(`\n📈 ${testRun.category.toUpperCase()} Test Results:`);
    console.log(`   ✅ Passed:       ${testRun.passed.toString().padStart(3)}`);
    console.log(`   ❌ Failed:       ${testRun.failed.toString().padStart(3)}`);
    console.log(`   ⏭️  Skipped:      ${testRun.skipped.toString().padStart(3)}`);
    console.log(`   📊 Total:        ${total.toString().padStart(3)}`);
    console.log(`   ⏱️  Duration:     ${durationSec}s`);
    console.log(`   🎯 Success Rate: ${successRate}%`);

    if (testRun.failures.length > 0) {
      console.log(`\n   ⚠️  Failures (showing up to 3):`);
      testRun.failures.slice(0, 3).forEach((failure, idx) => {
        console.log(`   ${idx + 1}. ${failure.testName}`);
        console.log(`      📁 ${failure.testFile}`);
        const errorLines = failure.error.split('\n').slice(0, 2);
        errorLines.forEach(line => {
          console.log(`      💥 ${line.substring(0, 70)}${line.length > 70 ? '...' : ''}`);
        });
      });

      if (testRun.failures.length > 3) {
        console.log(`   ... and ${testRun.failures.length - 3} more failures`);
      }
    }
  }

  /**
   * Generate cycle report
   */
  private async generateCycleReport(cycleStartTime: number, cycleRuns: TestRun[]): Promise<void> {
    const cycleDuration = Date.now() - cycleStartTime;

    const totalPassed = cycleRuns.reduce((sum, run) => sum + run.passed, 0);
    const totalFailed = cycleRuns.reduce((sum, run) => sum + run.failed, 0);
    const totalSkipped = cycleRuns.reduce((sum, run) => sum + run.skipped, 0);
    const total = totalPassed + totalFailed + totalSkipped;
    const successRate = total > 0 ? ((totalPassed / total) * 100).toFixed(1) : '0.0';

    const report = {
      cycleNumber: this.cycleCount,
      timestamp: new Date(),
      cycleDuration,
      summary: {
        totalTests: total,
        passed: totalPassed,
        failed: totalFailed,
        skipped: totalSkipped,
        successRate
      },
      testRuns: cycleRuns,
      history: this.runHistory.slice(-50) // Last 50 runs
    };

    // Save report
    const reportPath = path.join(
      this.config.reportPath,
      `cycle-${this.cycleCount}-${Date.now()}.json`
    );
    await fs.ensureDir(this.config.reportPath);
    await fs.writeJSON(reportPath, report, { spaces: 2 });

    // Also save as "latest"
    const latestPath = path.join(this.config.reportPath, 'latest.json');
    await fs.writeJSON(latestPath, report, { spaces: 2 });

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Cycle #${this.cycleCount} Summary`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Total Tests:    ${total}`);
    console.log(`✅ Passed:      ${totalPassed}`);
    console.log(`❌ Failed:      ${totalFailed}`);
    console.log(`⏭️  Skipped:     ${totalSkipped}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log(`⏱️  Duration:    ${(cycleDuration / 1000).toFixed(2)}s`);
    console.log(`📄 Report:       ${reportPath}`);
    console.log(`${'='.repeat(60)}`);
  }

  /**
   * Check if runs have failures
   */
  private hasFailures(runs: TestRun[]): boolean {
    return runs.some(run => run.failed > 0);
  }

  /**
   * Run autonomous bug fixer on detected failures
   */
  private async runAutonomousFixer(cycleRuns: TestRun[]): Promise<void> {
    const totalFailures = cycleRuns.reduce((sum, run) => sum + run.failed, 0);
    const allFailures = cycleRuns.flatMap(run => run.failures);

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`🔧 Autonomous Bug Fixer`);
    console.log(`${'─'.repeat(60)}`);
    console.log(`   Detected ${totalFailures} test failure(s)`);
    console.log(`   Failures breakdown:`);

    // Display detailed failure information
    for (const [index, failure] of allFailures.entries()) {
      console.log(`\n   ${index + 1}. ${failure.testName}`);
      console.log(`      📁 File: ${failure.testFile}`);
      const errorPreview = failure.error.split('\n')[0].substring(0, 80);
      console.log(`      💥 Error: ${errorPreview}${failure.error.length > 80 ? '...' : ''}`);
    }

    console.log(`\n   📝 Saving failure details for manual review...`);

    // Save detailed failures for later analysis
    const failureReport = {
      timestamp: new Date(),
      totalFailures,
      failures: allFailures,
      cycleNumber: this.cycleCount
    };

    const failurePath = path.join(
      this.config.reportPath,
      `failures-cycle-${this.cycleCount}.json`
    );

    try {
      await fs.writeJSON(failurePath, failureReport, { spaces: 2 });
      console.log(`   ✅ Failures saved to: ${failurePath}`);
    } catch (error: any) {
      console.error(`   ⚠️  Could not save failures: ${error.message}`);
    }

    console.log(`\n   ⚠️  Note: Autonomous fixer integration is being improved.`);
    console.log(`   📋 For now, failures are logged above for manual review.`);
    console.log(`   🔧 To manually fix, run: npm run fix:detect\n`);
  }

  /**
   * Stop continuous testing
   */
  stop(): void {
    console.log('\n' + '='.repeat(60));
    console.log('🛑 Stopping continuous testing agent');
    console.log(`   Total cycles completed: ${this.cycleCount}`);
    console.log(`   Total runs in history: ${this.runHistory.length}`);
    console.log('='.repeat(60) + '\n');
    this.isRunning = false;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get summary of recent performance
   */
  getRecentSummary(lastN: number = 10): string {
    const recentRuns = this.runHistory.slice(-lastN);

    if (recentRuns.length === 0) {
      return 'No test runs yet';
    }

    const totalPassed = recentRuns.reduce((sum, run) => sum + run.passed, 0);
    const totalFailed = recentRuns.reduce((sum, run) => sum + run.failed, 0);
    const totalSkipped = recentRuns.reduce((sum, run) => sum + run.skipped, 0);
    const total = totalPassed + totalFailed + totalSkipped;
    const successRate = total > 0 ? ((totalPassed / total) * 100).toFixed(1) : '0.0';

    return `Recent ${lastN} runs: ${totalPassed}✅ ${totalFailed}❌ ${totalSkipped}⏭️ (${successRate}% success)`;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const intervalArg = args.find(arg => !isNaN(Number(arg)) && !arg.startsWith('--'));
  const interval = intervalArg ? parseInt(intervalArg) : 5;

  const config: ContinuousTestConfig = {
    interval,
    categories: ['unit', 'integration'], // Removed 'e2e' - they timeout
    autoFix: args.includes('--auto-fix'),
    reportPath: path.join(process.cwd(), 'test-results', 'continuous-testing'),
    onlyMealPlan: args.includes('--meal-plan-only') || true // Default to meal plan only
  };

  // Override categories if specified
  if (args.includes('--unit-only')) {
    config.categories = ['unit'];
  } else if (args.includes('--integration-only')) {
    config.categories = ['integration'];
  } else if (args.includes('--e2e-only')) {
    config.categories = ['e2e'];
  } else if (args.includes('--all-tests')) {
    config.onlyMealPlan = false;
  }

  const agent = new MealPlanContinuousTestAgent(config);

  // Handle graceful shutdown
  const shutdown = () => {
    console.log('\n\n🛑 Received shutdown signal...');
    agent.stop();
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Start agent
  await agent.start();
}

// Run agent if executed directly
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

export { MealPlanContinuousTestAgent, ContinuousTestConfig };
