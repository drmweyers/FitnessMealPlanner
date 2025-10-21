/**
 * Test Runner - Handles test execution for the autonomous fix system
 *
 * This class provides utilities for running Playwright tests and collecting results.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { ExtendedTestResult } from '../types';
import fs from 'fs-extra';
import path from 'path';

const execPromise = promisify(exec);

export class TestRunner {
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Run all Playwright tests
   */
  async runAllTests(): Promise<{
    success: boolean;
    results: ExtendedTestResult[];
    summary: {
      total: number;
      passed: number;
      failed: number;
      skipped: number;
    };
  }> {
    try {
      const { stdout, stderr } = await execPromise('npm run test:playwright -- --reporter=json', {
        cwd: this.projectRoot,
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large test output
      });

      return await this.parseTestResults();
    } catch (error) {
      // Tests may fail, but we still need to parse results
      return await this.parseTestResults();
    }
  }

  /**
   * Run specific test file
   */
  async runTestFile(testFile: string): Promise<{
    success: boolean;
    results: ExtendedTestResult[];
  }> {
    try {
      const { stdout, stderr } = await execPromise(
        `npm run test:playwright -- ${testFile} --reporter=json`,
        {
          cwd: this.projectRoot,
          maxBuffer: 10 * 1024 * 1024,
        }
      );

      const results = await this.parseTestResults();
      return {
        success: results.results.every((r) => r.status === 'passed'),
        results: results.results,
      };
    } catch (error) {
      const results = await this.parseTestResults();
      return {
        success: false,
        results: results.results,
      };
    }
  }

  /**
   * Run specific test
   */
  async runSingleTest(testFile: string, testName?: string): Promise<ExtendedTestResult> {
    const grepFlag = testName ? `--grep "${testName}"` : '';
    try {
      await execPromise(`npm run test:playwright -- ${testFile} ${grepFlag} --reporter=json`, {
        cwd: this.projectRoot,
        maxBuffer: 10 * 1024 * 1024,
      });

      const results = await this.parseTestResults();
      return results.results[0] || {
        testFile,
        testName: testName || 'unknown',
        status: 'skipped',
        duration: 0,
        retry: 0,
      };
    } catch (error) {
      const results = await this.parseTestResults();
      return results.results[0] || {
        testFile,
        testName: testName || 'unknown',
        status: 'failed',
        duration: 0,
        error: {
          message: error.message,
          stack: error.stack,
        },
        retry: 0,
      };
    }
  }

  /**
   * Run tests matching pattern
   */
  async runTestsMatchingPattern(pattern: string): Promise<{
    success: boolean;
    results: ExtendedTestResult[];
  }> {
    try {
      await execPromise(`npm run test:playwright -- --grep "${pattern}" --reporter=json`, {
        cwd: this.projectRoot,
        maxBuffer: 20 * 1024 * 1024,
      });

      const results = await this.parseTestResults();
      return {
        success: results.results.every((r) => r.status === 'passed'),
        results: results.results,
      };
    } catch (error) {
      const results = await this.parseTestResults();
      return {
        success: false,
        results: results.results,
      };
    }
  }

  /**
   * Parse test results from JSON output
   */
  private async parseTestResults(): Promise<{
    success: boolean;
    results: ExtendedTestResult[];
    summary: {
      total: number;
      passed: number;
      failed: number;
      skipped: number;
    };
  }> {
    const resultsPath = path.join(this.projectRoot, 'test-results.json');

    if (!(await fs.pathExists(resultsPath))) {
      return {
        success: false,
        results: [],
        summary: { total: 0, passed: 0, failed: 0, skipped: 0 },
      };
    }

    try {
      const resultsData = await fs.readJSON(resultsPath);
      const results: ExtendedTestResult[] = [];

      // Parse Playwright JSON format
      for (const suite of resultsData.suites || []) {
        for (const spec of suite.specs || []) {
          for (const test of spec.tests || []) {
            const result: ExtendedTestResult = {
              testFile: spec.file || 'unknown',
              testName: spec.title || 'unknown',
              status: this.mapStatus(test.status),
              duration: test.duration || 0,
              retry: test.retry || 0,
            };

            if (test.error) {
              result.error = {
                message: test.error.message || '',
                stack: test.error.stack || '',
              };
            }

            if (test.attachments) {
              result.attachments = test.attachments.map((att: any) => ({
                name: att.name,
                path: att.path,
                contentType: att.contentType,
              }));
            }

            results.push(result);
          }
        }
      }

      const passed = results.filter((r) => r.status === 'passed').length;
      const failed = results.filter((r) => r.status === 'failed').length;
      const skipped = results.filter((r) => r.status === 'skipped').length;

      return {
        success: failed === 0,
        results,
        summary: {
          total: results.length,
          passed,
          failed,
          skipped,
        },
      };
    } catch (error) {
      console.error('Failed to parse test results:', error);
      return {
        success: false,
        results: [],
        summary: { total: 0, passed: 0, failed: 0, skipped: 0 },
      };
    }
  }

  /**
   * Map Playwright status to our status
   */
  private mapStatus(playwrightStatus: string): 'passed' | 'failed' | 'skipped' | 'timedOut' {
    switch (playwrightStatus) {
      case 'passed':
        return 'passed';
      case 'failed':
        return 'failed';
      case 'skipped':
        return 'skipped';
      case 'timedOut':
        return 'timedOut';
      default:
        return 'failed';
    }
  }

  /**
   * Find related tests based on modified files
   */
  async findRelatedTests(modifiedFiles: string[]): Promise<string[]> {
    const relatedTests: Set<string> = new Set();

    for (const file of modifiedFiles) {
      // Find test files that might be related
      const baseName = path.basename(file, path.extname(file));

      // Look for direct test files
      const testFiles = [
        `test/unit/**/${baseName}.test.ts`,
        `test/unit/**/${baseName}.test.tsx`,
        `test/e2e/**/${baseName}.spec.ts`,
        `test/integration/**/${baseName}.test.ts`,
      ];

      for (const pattern of testFiles) {
        const { glob } = await import('glob');
        const matches = await glob(pattern, { cwd: this.projectRoot });
        matches.forEach((match) => relatedTests.add(match));
      }

      // If it's a component, find all tests that might use it
      if (file.includes('client/src/components')) {
        const { glob } = await import('glob');
        const matches = await glob('test/unit/components/**/*.test.{ts,tsx}', {
          cwd: this.projectRoot,
        });
        matches.forEach((match) => relatedTests.add(match));
      }

      // If it's a server file, find API tests
      if (file.includes('server/')) {
        const { glob } = await import('glob');
        const matches = await glob('test/unit/services/**/*.test.ts', {
          cwd: this.projectRoot,
        });
        matches.forEach((match) => relatedTests.add(match));
      }
    }

    return Array.from(relatedTests);
  }

  /**
   * Get test count
   */
  async getTestCount(): Promise<number> {
    const { glob } = await import('glob');
    const testFiles = await glob('test/**/*.{spec,test}.{ts,tsx}', {
      cwd: this.projectRoot,
    });
    return testFiles.length;
  }

  /**
   * Check if tests are currently running
   */
  async areTestsRunning(): Promise<boolean> {
    try {
      // Check for playwright process
      const { exec } = await import('child_process');
      const util = await import('util');
      const execPromise = util.promisify(exec);

      const { stdout } = await execPromise(
        process.platform === 'win32'
          ? 'tasklist | findstr playwright'
          : 'ps aux | grep playwright'
      );

      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }
}
