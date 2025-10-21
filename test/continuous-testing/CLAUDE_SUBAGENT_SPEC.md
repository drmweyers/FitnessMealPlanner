# Claude Subagent: Meal Plan Generator Continuous Testing Framework

**Version:** 1.0.0
**Created:** January 2025
**Type:** Autonomous Testing Agent
**Runtime:** Claude Code (No API calls required)

---

## 🎯 Mission Statement

Create a **self-contained Claude subagent** that continuously tests the Meal Plan Generator system, automatically detects issues, and reports findings without requiring external API calls.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  Claude Subagent (Main Loop)                │
│  • Runs continuously via Claude Code                        │
│  • No external API dependencies                             │
│  • Self-healing and autonomous                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Test Orchestration Engine                       │
│  • Schedules test runs                                      │
│  • Manages test execution order                             │
│  • Handles parallel/sequential execution                    │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │ Unit Tests │  │ Integration│  │  E2E Tests │
    │   Runner   │  │   Runner   │  │   Runner   │
    └────────────┘  └────────────┘  └────────────┘
            │               │               │
            └───────────────┼───────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Issue Detection Engine                      │
│  • Analyzes test failures                                   │
│  • Categorizes issues                                       │
│  • Extracts error patterns                                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Autonomous Bug Fixer Integration               │
│  • Sends detected issues to existing AutonomousBugFixer    │
│  • Receives fix implementations                             │
│  • Verifies fixes automatically                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Reporting & Monitoring                     │
│  • Real-time status dashboard                               │
│  • Issue history tracking                                   │
│  • Success metrics                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Test Suite Specification

### 1. **Unit Tests** (Focus: Meal Plan Services)

**Target Files:**
- `test/unit/services/intelligentMealPlanGenerator.test.ts` ⚠️ SKIPPED
- `test/unit/services/naturalLanguageMealPlan.test.ts` ⚠️ SKIPPED
- `test/unit/services/mealPlanGenerator.test.ts`
- `test/unit/services/mealPlanVariation.test.ts`
- `test/unit/services/mealPlanScheduler.test.ts`

**Coverage Goals:**
- ✅ IntelligentMealPlanGeneratorService - 95%+
- ✅ Natural language parsing - 90%+
- ✅ Nutritional optimization - 90%+
- ✅ Recipe selection algorithms - 95%+
- ✅ Macro distribution - 95%+

**Test Categories:**
1. **Basic Generation** (15 tests)
   - Generate meal plan with valid inputs
   - Handle different fitness goals
   - Apply calorie targets correctly
   - Generate correct number of days/meals

2. **Natural Language Processing** (12 tests)
   - Parse simple meal plan requests
   - Extract dietary requirements
   - Handle complex requests
   - Validate parsed parameters

3. **Nutritional Optimization** (10 tests)
   - Calculate macro distributions
   - Apply fitness goal profiles
   - Balance meal nutrition
   - Handle edge cases (extreme goals)

4. **Recipe Selection** (8 tests)
   - Select appropriate recipes
   - Apply dietary filters
   - Ensure variety/diversity
   - Handle limited recipe pools

5. **Error Handling** (10 tests)
   - Invalid inputs
   - Missing required fields
   - Database errors
   - OpenAI failures

**Total Unit Tests:** 55 tests

---

### 2. **Integration Tests** (Focus: End-to-End Workflows)

**Target Files:**
- `test/integration/mealPlanWorkflow.test.ts`
- `test/integration/MealPlanAssignmentWorkflow.test.tsx`
- `test/integration/CustomerMealPlans.test.tsx`
- `test/integration/trainerMealPlanManagement.test.ts`

**Coverage Goals:**
- ✅ Trainer creates meal plan - 100%
- ✅ Trainer assigns to customer - 100%
- ✅ Customer views meal plan - 100%
- ✅ PDF export - 90%+

**Test Categories:**
1. **Trainer Workflows** (10 tests)
   - Create meal plan
   - Edit meal plan
   - Save meal plan template
   - Assign to customer
   - Generate variations

2. **Customer Workflows** (8 tests)
   - View assigned meal plans
   - Export to PDF
   - Mark meals as complete
   - Request modifications
   - Share meal plan

3. **Admin Workflows** (5 tests)
   - Approve meal plans
   - Review meal plan quality
   - Manage meal plan templates
   - Generate reports
   - System-wide meal plan analytics

4. **API Endpoints** (15 tests)
   - POST /api/meal-plan/generate
   - POST /api/meal-plan/generate-natural
   - GET /api/meal-plan/:id
   - PUT /api/meal-plan/:id
   - DELETE /api/meal-plan/:id
   - POST /api/meal-plan/:id/assign
   - GET /api/meal-plan/trainer/:trainerId
   - GET /api/meal-plan/customer/:customerId
   - POST /api/meal-plan/:id/export/pdf

**Total Integration Tests:** 38 tests

---

### 3. **E2E Tests** (Focus: User Interactions)

**Target Files:**
- `test/e2e/meal-plan-generator-production.spec.ts`
- `test/e2e/unified-meal-plan-generator.spec.ts`
- `test/e2e/meal-plan-assignment-comprehensive.spec.ts`
- `test/e2e/manual-meal-plan.spec.ts`

**Coverage Goals:**
- ✅ Complete meal plan generation flow - 100%
- ✅ Assignment workflow - 100%
- ✅ Customer viewing experience - 100%
- ✅ PDF export functionality - 95%+

**Test Categories:**
1. **Basic UI Interactions** (12 tests)
   - Load meal plan generator page
   - Fill form fields
   - Submit generation request
   - View generated meal plan
   - Navigate meal plan details

2. **Advanced Generation** (8 tests)
   - Natural language input
   - Multiple dietary requirements
   - Custom calorie targets
   - Advanced filters

3. **Assignment & Sharing** (10 tests)
   - Assign meal plan to customer
   - Customer receives notification
   - Customer views meal plan
   - Share meal plan link
   - Export to PDF

4. **Error States** (8 tests)
   - Invalid form inputs
   - API failures
   - Loading states
   - Empty states
   - Network errors

5. **Visual Regression** (6 tests)
   - Desktop layout
   - Mobile layout
   - Tablet layout
   - Dark mode
   - Print view
   - PDF preview

**Total E2E Tests:** 44 tests

---

## 🤖 Claude Subagent Implementation

### Subagent Script: `continuous-test-agent.ts`

```typescript
#!/usr/bin/env tsx
/**
 * Claude Subagent: Continuous Meal Plan Testing
 *
 * This agent runs continuously within Claude Code and performs
 * autonomous testing of the meal plan generator system.
 *
 * NO EXTERNAL API CALLS REQUIRED
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
}

class MealPlanContinuousTestAgent {
  private config: ContinuousTestConfig;
  private runHistory: TestRun[] = [];
  private isRunning: boolean = false;

  constructor(config: ContinuousTestConfig) {
    this.config = config;
  }

  /**
   * Start continuous testing loop
   */
  async start(): Promise<void> {
    console.log('🤖 Claude Subagent: Continuous Meal Plan Testing');
    console.log('================================================\n');
    console.log(`Configuration:`);
    console.log(`  - Interval: ${this.config.interval} minutes`);
    console.log(`  - Categories: ${this.config.categories.join(', ')}`);
    console.log(`  - Auto-fix: ${this.config.autoFix ? 'Enabled' : 'Disabled'}`);
    console.log(`  - Report path: ${this.config.reportPath}\n`);

    this.isRunning = true;

    while (this.isRunning) {
      await this.runTestCycle();

      if (this.isRunning) {
        console.log(`\n⏰ Next test cycle in ${this.config.interval} minutes...\n`);
        await this.sleep(this.config.interval * 60 * 1000);
      }
    }
  }

  /**
   * Run a complete test cycle
   */
  private async runTestCycle(): Promise<void> {
    const cycleStartTime = Date.now();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 Test Cycle Started: ${new Date().toLocaleString()}`);
    console.log(`${'='.repeat(60)}\n`);

    for (const category of this.config.categories) {
      await this.runTestCategory(category);
    }

    // Generate cycle report
    await this.generateCycleReport(cycleStartTime);

    // Run auto-fix if enabled and failures detected
    if (this.config.autoFix && this.hasRecentFailures()) {
      await this.runAutonomousFixer();
    }
  }

  /**
   * Run tests for a specific category
   */
  private async runTestCategory(category: 'unit' | 'integration' | 'e2e'): Promise<void> {
    console.log(`\n📊 Running ${category.toUpperCase()} tests...\n`);

    const startTime = Date.now();
    let command: string;

    switch (category) {
      case 'unit':
        command = 'npm run test:unit -- test/unit/services/intelligentMealPlanGenerator.test.ts test/unit/services/naturalLanguageMealPlan.test.ts';
        break;
      case 'integration':
        command = 'npm run test:integration -- test/integration/mealPlanWorkflow.test.ts test/integration/MealPlanAssignmentWorkflow.test.tsx';
        break;
      case 'e2e':
        command = 'npm run test:playwright -- test/e2e/meal-plan-generator-production.spec.ts test/e2e/unified-meal-plan-generator.spec.ts';
        break;
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      const duration = Date.now() - startTime;
      const testRun = this.parseTestOutput(category, stdout, stderr, duration);

      this.runHistory.push(testRun);
      this.displayTestResults(testRun);

    } catch (error: any) {
      // Tests failed - capture results
      const duration = Date.now() - startTime;
      const testRun = this.parseTestOutput(category, error.stdout || '', error.stderr || '', duration);

      this.runHistory.push(testRun);
      this.displayTestResults(testRun);
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
    // Parse test results from output
    // This is a simplified parser - adapt based on actual test output format

    const passedMatch = stdout.match(/(\d+) passed/);
    const failedMatch = stdout.match(/(\d+) failed/);
    const skippedMatch = stdout.match(/(\d+) skipped/);

    const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1]) : 0;
    const skipped = skippedMatch ? parseInt(skippedMatch[1]) : 0;

    // Extract failures
    const failures: TestFailure[] = this.extractFailures(stdout + stderr);

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

    // Regex to match test failures
    // Adapt this based on your test runner output format
    const failurePattern = /FAIL (.*?)\n(.*?)\n(.*?)(?=\n\n|$)/gs;
    const matches = output.matchAll(failurePattern);

    for (const match of matches) {
      failures.push({
        testName: match[2] || 'Unknown test',
        testFile: match[1] || 'Unknown file',
        error: match[3] || 'Unknown error',
        stack: match[3] || ''
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

    console.log(`\n${testRun.category.toUpperCase()} Test Results:`);
    console.log(`  ✅ Passed:  ${testRun.passed}`);
    console.log(`  ❌ Failed:  ${testRun.failed}`);
    console.log(`  ⏭️  Skipped: ${testRun.skipped}`);
    console.log(`  ⏱️  Duration: ${(testRun.duration / 1000).toFixed(2)}s`);
    console.log(`  📊 Success Rate: ${successRate}%`);

    if (testRun.failures.length > 0) {
      console.log(`\n  📋 Failures:`);
      testRun.failures.slice(0, 5).forEach((failure, idx) => {
        console.log(`    ${idx + 1}. ${failure.testName}`);
        console.log(`       File: ${failure.testFile}`);
        console.log(`       Error: ${failure.error.substring(0, 100)}...`);
      });

      if (testRun.failures.length > 5) {
        console.log(`    ... and ${testRun.failures.length - 5} more`);
      }
    }
  }

  /**
   * Generate cycle report
   */
  private async generateCycleReport(cycleStartTime: number): Promise<void> {
    const cycleDuration = Date.now() - cycleStartTime;
    const recentRuns = this.runHistory.slice(-this.config.categories.length);

    const totalPassed = recentRuns.reduce((sum, run) => sum + run.passed, 0);
    const totalFailed = recentRuns.reduce((sum, run) => sum + run.failed, 0);
    const totalSkipped = recentRuns.reduce((sum, run) => sum + run.skipped, 0);
    const total = totalPassed + totalFailed + totalSkipped;

    const report = {
      timestamp: new Date(),
      cycleDuration,
      summary: {
        totalTests: total,
        passed: totalPassed,
        failed: totalFailed,
        skipped: totalSkipped,
        successRate: total > 0 ? ((totalPassed / total) * 100).toFixed(1) : '0.0'
      },
      testRuns: recentRuns,
      history: this.runHistory.slice(-20) // Last 20 runs
    };

    // Save report
    const reportPath = path.join(this.config.reportPath, `cycle-report-${Date.now()}.json`);
    await fs.ensureDir(this.config.reportPath);
    await fs.writeJSON(reportPath, report, { spaces: 2 });

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Cycle Summary`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed:  ${totalPassed}`);
    console.log(`❌ Failed:  ${totalFailed}`);
    console.log(`⏭️  Skipped: ${totalSkipped}`);
    console.log(`📈 Success Rate: ${report.summary.successRate}%`);
    console.log(`⏱️  Cycle Duration: ${(cycleDuration / 1000).toFixed(2)}s`);
    console.log(`📄 Report saved: ${reportPath}`);
    console.log(`${'='.repeat(60)}\n`);
  }

  /**
   * Check if recent runs have failures
   */
  private hasRecentFailures(): boolean {
    const recentRuns = this.runHistory.slice(-this.config.categories.length);
    return recentRuns.some(run => run.failed > 0);
  }

  /**
   * Run autonomous bug fixer on detected failures
   */
  private async runAutonomousFixer(): Promise<void> {
    console.log(`\n🔧 Running Autonomous Bug Fixer...\n`);

    try {
      const { stdout } = await execAsync('npm run fix:auto', {
        cwd: process.cwd(),
        maxBuffer: 10 * 1024 * 1024
      });

      console.log(stdout);
      console.log(`\n✅ Autonomous fixer completed\n`);

    } catch (error: any) {
      console.error(`\n❌ Autonomous fixer failed: ${error.message}\n`);
    }
  }

  /**
   * Stop continuous testing
   */
  stop(): void {
    console.log('\n🛑 Stopping continuous testing agent...\n');
    this.isRunning = false;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);

  const config: ContinuousTestConfig = {
    interval: parseInt(args[0]) || 5, // Default: 5 minutes
    categories: ['unit', 'integration', 'e2e'],
    autoFix: args.includes('--auto-fix'),
    reportPath: path.join(process.cwd(), 'test-results', 'continuous-testing')
  };

  const agent = new MealPlanContinuousTestAgent(config);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    agent.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    agent.stop();
    process.exit(0);
  });

  await agent.start();
}

// Run agent if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { MealPlanContinuousTestAgent };
```

---

## 📝 Usage Instructions

### Starting the Continuous Testing Agent

```bash
# Run with default settings (5-minute interval)
npm run test:continuous

# Run with custom interval (e.g., 10 minutes)
npm run test:continuous 10

# Run with auto-fix enabled
npm run test:continuous --auto-fix

# Run with custom interval and auto-fix
npm run test:continuous 10 --auto-fix
```

### Stopping the Agent

Press `Ctrl+C` or send `SIGTERM` signal

### Viewing Reports

Reports are saved to: `test-results/continuous-testing/`

```bash
# View latest report
cat test-results/continuous-testing/cycle-report-*.json | tail -1 | jq .

# View report summary
cat test-results/continuous-testing/cycle-report-*.json | tail -1 | jq '.summary'
```

---

## 🎯 Success Metrics

**Target Metrics:**
- ✅ **Test Coverage**: 95%+ for meal plan services
- ✅ **Success Rate**: 98%+ tests passing
- ✅ **Auto-Fix Rate**: 70%+ of failures fixed automatically
- ✅ **Detection Time**: <5 minutes to detect new failures
- ✅ **Fix Time**: <10 minutes from detection to verified fix

**Current Metrics (Baseline):**
- ⚠️ **Test Coverage**: ~60% (many tests skipped)
- ⚠️ **Success Rate**: Unknown (tests need fixing)
- ⚠️ **Auto-Fix Rate**: 0% (not yet integrated)

---

## 🚀 Implementation Roadmap

### Phase 1: Fix Existing Tests (2-3 hours)
- [ ] Unskip intelligentMealPlanGenerator tests
- [ ] Unskip naturalLanguageMealPlan tests
- [ ] Fix OpenAI mocking issues
- [ ] Update test expectations
- [ ] Verify all tests pass

### Phase 2: Implement Continuous Test Agent (2-3 hours)
- [ ] Create continuous-test-agent.ts
- [ ] Add npm scripts
- [ ] Test agent locally
- [ ] Add report generation
- [ ] Document usage

### Phase 3: Integration with Autonomous Fixer (1-2 hours)
- [ ] Connect agent to AutonomousBugFixer
- [ ] Test auto-fix workflow
- [ ] Verify fix verification
- [ ] Add rollback on failure

### Phase 4: Monitoring & Reporting (1-2 hours)
- [ ] Add metrics dashboard
- [ ] Create history tracking
- [ ] Add alert notifications
- [ ] Generate daily/weekly reports

**Total Estimated Time: 6-10 hours**

---

## 📚 Documentation

- **Main Documentation**: This file
- **Test Reports**: `test-results/continuous-testing/`
- **Agent Logs**: Console output (pipe to file if needed)
- **Integration Guide**: `test/autonomous-fix/README.md`

---

**Status**: ✅ SPECIFICATION COMPLETE - Ready for Implementation
