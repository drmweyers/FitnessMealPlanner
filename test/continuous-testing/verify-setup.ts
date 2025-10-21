#!/usr/bin/env tsx
/**
 * Verify Continuous Testing Setup
 *
 * This script checks that all prerequisites are met for running
 * the continuous testing agent.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';

const execAsync = promisify(exec);

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
}

class SetupVerifier {
  private results: CheckResult[] = [];

  async verify(): Promise<boolean> {
    console.log('🔍 Verifying Continuous Testing Setup\n');
    console.log('='.repeat(60) + '\n');

    await this.checkNodeVersion();
    await this.checkTsx();
    await this.checkProjectRoot();
    await this.checkTestFiles();
    await this.checkAutonomousFixer();
    await this.checkReportDirectory();

    this.displayResults();

    const allPassed = this.results.every(r => r.passed);

    if (allPassed) {
      console.log('\n✅ All checks passed! Ready to start continuous testing.\n');
      console.log('Start the agent with:');
      console.log('  npm run test:continuous\n');
    } else {
      console.log('\n❌ Some checks failed. Please fix the issues above.\n');
    }

    return allPassed;
  }

  private async checkNodeVersion(): Promise<void> {
    try {
      const { stdout } = await execAsync('node --version');
      const version = stdout.trim();
      const major = parseInt(version.substring(1).split('.')[0]);

      if (major >= 18) {
        this.addResult('Node.js version', true, `${version} ✓`);
      } else {
        this.addResult('Node.js version', false, `${version} (requires v18+)`);
      }
    } catch (error) {
      this.addResult('Node.js version', false, 'Node.js not found');
    }
  }

  private async checkTsx(): Promise<void> {
    try {
      await execAsync('npx tsx --version');
      this.addResult('TypeScript executor (tsx)', true, 'Available ✓');
    } catch (error) {
      this.addResult('TypeScript executor (tsx)', false, 'Not installed (run: npm install -D tsx)');
    }
  }

  private async checkProjectRoot(): Promise<void> {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const exists = await fs.pathExists(packageJsonPath);

    if (exists) {
      try {
        const pkg = await fs.readJSON(packageJsonPath);
        if (pkg.name === 'rest-express') {
          this.addResult('Project root', true, 'FitnessMealPlanner ✓');
        } else {
          this.addResult('Project root', false, 'Not in FitnessMealPlanner directory');
        }
      } catch {
        this.addResult('Project root', false, 'package.json unreadable');
      }
    } else {
      this.addResult('Project root', false, 'package.json not found');
    }
  }

  private async checkTestFiles(): Promise<void> {
    const testPaths = [
      'test/unit/services/intelligentMealPlanGenerator.test.ts',
      'test/unit/services/naturalLanguageMealPlan.test.ts',
      'test/integration/mealPlanWorkflow.test.ts',
      'test/e2e/meal-plan-generator-production.spec.ts'
    ];

    let foundCount = 0;
    for (const testPath of testPaths) {
      const exists = await fs.pathExists(path.join(process.cwd(), testPath));
      if (exists) foundCount++;
    }

    if (foundCount === testPaths.length) {
      this.addResult('Meal plan test files', true, `All ${testPaths.length} files found ✓`);
    } else if (foundCount > 0) {
      this.addResult('Meal plan test files', true, `${foundCount}/${testPaths.length} files found ⚠️`);
    } else {
      this.addResult('Meal plan test files', false, 'No test files found');
    }
  }

  private async checkAutonomousFixer(): Promise<void> {
    const fixerPath = path.join(process.cwd(), 'test/autonomous-fix/cli.ts');
    const exists = await fs.pathExists(fixerPath);

    if (exists) {
      this.addResult('Autonomous Bug Fixer', true, 'Available ✓');
    } else {
      this.addResult('Autonomous Bug Fixer', false, 'Not found (auto-fix will be disabled)');
    }
  }

  private async checkReportDirectory(): Promise<void> {
    const reportPath = path.join(process.cwd(), 'test-results', 'continuous-testing');

    try {
      await fs.ensureDir(reportPath);
      this.addResult('Report directory', true, reportPath + ' ✓');
    } catch (error) {
      this.addResult('Report directory', false, 'Cannot create directory');
    }
  }

  private addResult(name: string, passed: boolean, message: string): void {
    this.results.push({ name, passed, message });
  }

  private displayResults(): void {
    const maxNameLength = Math.max(...this.results.map(r => r.name.length));

    for (const result of this.results) {
      const icon = result.passed ? '✅' : '❌';
      const name = result.name.padEnd(maxNameLength);
      console.log(`${icon} ${name}  ${result.message}`);
    }

    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    console.log('\n' + '='.repeat(60));
    console.log(`Checks: ${passed}/${total} passed`);
    console.log('='.repeat(60));
  }
}

// Run verification
async function main() {
  const verifier = new SetupVerifier();
  const success = await verifier.verify();
  process.exit(success ? 0 : 1);
}

// Run if this is the main module
main().catch(error => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});

export { SetupVerifier };
