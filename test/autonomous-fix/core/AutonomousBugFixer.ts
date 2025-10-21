/**
 * Autonomous Bug Fixer - The Brain of Fix Implementation
 *
 * This system detects bugs, analyzes root causes, generates fixes,
 * implements them, verifies them, and deploys them autonomously.
 *
 * This is the revolutionary core that transforms testing from detection to implementation.
 */

import {
  DetectedIssue,
  IssueClassification,
  RootCauseAnalysis,
  GeneratedFix,
  ImplementationResult,
  VerificationResult,
  FixResult,
  FixImplementationReport,
  ExtendedTestResult,
  CodeContext,
  FixConfig,
} from '../types';
import { CodebaseManager } from '../infrastructure/CodebaseManager';
import { GitManager } from '../infrastructure/GitManager';
import { TestRunner } from '../infrastructure/TestRunner';
import { DeploymentManager } from '../infrastructure/DeploymentManager';
import { getFixConfig, validateConfig } from '../config/fix-config';
import { AutonomousBugFixerAI } from './AutonomousBugFixerAI';

export class AutonomousBugFixer {
  private codebase: CodebaseManager;
  private git: GitManager;
  private testRunner: TestRunner;
  private deployment: DeploymentManager;
  private ai: AutonomousBugFixerAI;
  private config: FixConfig;

  constructor(projectRoot?: string) {
    const root = projectRoot || process.cwd();

    // Get and validate configuration
    this.config = getFixConfig();
    const validation = validateConfig(this.config);

    if (!validation.valid) {
      throw new Error(`Configuration errors:\n${validation.errors.join('\n')}`);
    }

    // Initialize infrastructure
    this.codebase = new CodebaseManager(root);
    this.git = new GitManager(root);
    this.testRunner = new TestRunner(root);
    this.deployment = new DeploymentManager(root);

    // Initialize AI with config
    this.ai = new AutonomousBugFixerAI(
      this.config,
      this.codebase,
      this.git,
      this.testRunner
    );
  }

  /**
   * 🚀 MAIN ENTRY POINT: Detect and fix all issues found in test results
   */
  async detectAndFixAll(testResults: ExtendedTestResult[]): Promise<FixImplementationReport> {
    console.log('\n🔍 ========================================');
    console.log('🔍 AUTONOMOUS BUG FIXER - STARTING');
    console.log('🔍 ========================================\n');

    const startTime = Date.now();

    // 1. Detect issues from test results
    console.log('📊 Analyzing test results for issues...');
    const issues = await this.detectIssues(testResults);
    console.log(`📊 Found ${issues.length} issues\n`);

    if (issues.length === 0) {
      return this.generateReport([], startTime);
    }

    // 2. Limit issues to process
    const issuesToProcess = issues.slice(0, this.config.maxFixesPerRun);
    if (issues.length > issuesToProcess.length) {
      console.log(
        `⚠️  Processing ${issuesToProcess.length} of ${issues.length} issues (configured limit)\n`
      );
    }

    // 3. Process each issue
    const fixResults: FixResult[] = [];

    for (const [index, issue] of issuesToProcess.entries()) {
      console.log(
        `\n🔧 [${index + 1}/${issuesToProcess.length}] Processing: ${issue.description}`
      );
      console.log(`   Test: ${issue.testName}`);
      console.log(`   Severity: ${issue.severity}`);

      const fixResult = await this.analyzeAndFix(issue);
      fixResults.push(fixResult);

      if (fixResult.implemented && fixResult.verified) {
        console.log(`✅ Successfully fixed: ${issue.description}`);
      } else if (fixResult.requiresHuman) {
        console.log(`👤 Requires human review: ${issue.description}`);
      } else {
        console.log(`❌ Failed to fix: ${issue.description}`);
        if (fixResult.reason) {
          console.log(`   Reason: ${fixResult.reason}`);
        }
      }
    }

    return this.generateReport(fixResults, startTime);
  }

  /**
   * Analyze issue and implement fix
   */
  private async analyzeAndFix(issue: DetectedIssue): Promise<FixResult> {
    const startTime = Date.now();

    try {
      // 1. Classify issue and determine fix level
      console.log('  🔍 Classifying issue...');
      const classification = await this.ai.classifyIssue(issue);
      console.log(`  📋 Classification: Level ${classification.level} - ${classification.category}`);
      console.log(`     Confidence: ${classification.confidence}%`);

      if (!classification.fixable) {
        return {
          issue,
          classification,
          implemented: false,
          reason: 'Issue classified as not auto-fixable',
          requiresHuman: true,
          totalTime: Date.now() - startTime,
        };
      }

      // 2. Analyze root cause with AI
      console.log('  🧠 Analyzing root cause...');
      const rootCause = await this.ai.analyzeRootCause(issue);
      console.log(`     Root Cause: ${rootCause.rootCause}`);

      // 3. Generate fix using AI
      console.log('  💡 Generating fix...');
      const generatedFix = await this.ai.generateFix(issue, rootCause);
      console.log(`     Generated fix for ${generatedFix.fixes.length} file(s)`);

      // 4. Determine if approval is needed
      const needsApproval = classification.level === 3;
      if (needsApproval) {
        console.log('  ⏸️  Fix requires human approval (Level 3)');
        return {
          issue,
          classification,
          implemented: false,
          reason: 'Waiting for human approval',
          generatedFix,
          requiresHuman: true,
          totalTime: Date.now() - startTime,
        };
      }

      // 5. Implement the fix
      console.log('  📝 Implementing fix...');
      const implementation = await this.ai.implementFix(generatedFix, issue);

      if (!implementation.success) {
        return {
          issue,
          classification,
          implemented: false,
          reason: implementation.error,
          generatedFix,
          totalTime: Date.now() - startTime,
        };
      }

      console.log(`     ✅ Implemented in branch: ${implementation.branch}`);

      // 6. Verify the fix
      console.log('  🧪 Verifying fix...');
      const verification = await this.ai.verifyFix(issue, implementation);

      if (!verification.passed) {
        console.log('     ❌ Verification failed, rolling back...');
        await this.ai.rollbackFix(implementation);
        return {
          issue,
          classification,
          implemented: false,
          verified: false,
          reason: verification.reason || 'Fix verification failed, rolled back',
          generatedFix,
          implementation,
          verification,
          totalTime: Date.now() - startTime,
        };
      }

      console.log('     ✅ Verification passed');

      // 7. Deploy the fix (if appropriate level)
      let deployed = false;
      if (
        (classification.level === 1 && this.config.autoDeployLevel1) ||
        (classification.level === 2 && this.config.autoDeployLevel2)
      ) {
        console.log('  🚀 Deploying fix...');
        const deployResult = await this.deployment.deployByLevel(
          implementation.branch!,
          classification.level
        );
        deployed = deployResult.success;

        if (deployed) {
          console.log(`     ✅ Deployed to ${deployResult.environment}`);
        } else {
          console.log(`     ⚠️  Deployment failed: ${deployResult.error}`);
        }
      }

      return {
        issue,
        classification,
        implemented: true,
        verified: true,
        deployed,
        generatedFix,
        implementation,
        verification,
        totalTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error('  ❌ Unexpected error:', error.message);
      return {
        issue,
        implemented: false,
        reason: `Unexpected error: ${error.message}`,
        totalTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Detect issues from test results
   */
  private async detectIssues(testResults: ExtendedTestResult[]): Promise<DetectedIssue[]> {
    const issues: DetectedIssue[] = [];

    for (const result of testResults) {
      if (result.status === 'failed') {
        const issue: DetectedIssue = {
          id: `${result.testFile}-${Date.now()}`,
          type: 'test-failure',
          description: `Test failure: ${result.testName}`,
          severity: this.determineSeverity(result),
          testName: result.testName,
          testFile: result.testFile,
          errorMessage: result.error?.message || 'Unknown error',
          stackTrace: result.error?.stack || '',
          affectedFiles: await this.extractAffectedFiles(result),
          timestamp: new Date(),
          context: {
            screenshot: result.attachments?.find((a) => a.contentType.includes('image'))?.path,
            video: result.attachments?.find((a) => a.contentType.includes('video'))?.path,
            trace: result.attachments?.find((a) => a.name.includes('trace'))?.path,
          },
        };

        issues.push(issue);
      }
    }

    return issues;
  }

  /**
   * Determine severity from test result
   */
  private determineSeverity(
    result: ExtendedTestResult
  ): 'critical' | 'high' | 'medium' | 'low' {
    // Critical: Authentication, payment, data loss
    if (
      result.testName.toLowerCase().includes('auth') ||
      result.testName.toLowerCase().includes('payment') ||
      result.testName.toLowerCase().includes('login')
    ) {
      return 'critical';
    }

    // High: Core functionality
    if (
      result.testName.toLowerCase().includes('recipe') ||
      result.testName.toLowerCase().includes('meal plan') ||
      result.testName.toLowerCase().includes('user')
    ) {
      return 'high';
    }

    // Medium: Secondary features
    if (
      result.testName.toLowerCase().includes('export') ||
      result.testName.toLowerCase().includes('search')
    ) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Extract affected files from test result
   */
  private async extractAffectedFiles(result: ExtendedTestResult): Promise<string[]> {
    const files: string[] = [result.testFile];

    // Parse stack trace for file names
    if (result.error?.stack) {
      const stackFileRegex = /at\s+(?:.*?)\s+\((.*?):\d+:\d+\)/g;
      let match;
      while ((match = stackFileRegex.exec(result.error.stack)) !== null) {
        const file = match[1];
        if (file && !file.includes('node_modules')) {
          files.push(file);
        }
      }
    }

    return [...new Set(files)]; // Remove duplicates
  }

  // Continued in part 2...

  /**
   * Generate report
   */
  private generateReport(fixResults: FixResult[], startTime: number): FixImplementationReport {
    const totalTime = Date.now() - startTime;

    const fixedIssues = fixResults.filter((r) => r.implemented && r.verified).length;
    const failedFixes = fixResults.filter((r) => !r.implemented && !r.requiresHuman).length;
    const requiresHumanReview = fixResults.filter((r) => r.requiresHuman).length;

    const level1Fixes = fixResults.filter((r) => r.classification?.level === 1).length;
    const level2Fixes = fixResults.filter((r) => r.classification?.level === 2).length;
    const level3Fixes = fixResults.filter((r) => r.classification?.level === 3).length;
    const autoDeployedFixes = fixResults.filter((r) => r.deployed).length;

    const averageFixTime = fixResults.length > 0
      ? fixResults.reduce((sum, r) => sum + (r.totalTime || 0), 0) / fixResults.length
      : 0;

    const successRate = fixResults.length > 0
      ? (fixedIssues / fixResults.length) * 100
      : 0;

    console.log('\n📊 ========================================');
    console.log('📊 FIX IMPLEMENTATION REPORT');
    console.log('📊 ========================================');
    console.log(`Total Issues: ${fixResults.length}`);
    console.log(`✅ Fixed: ${fixedIssues}`);
    console.log(`❌ Failed: ${failedFixes}`);
    console.log(`👤 Requires Human: ${requiresHumanReview}`);
    console.log(`⚡ Success Rate: ${successRate.toFixed(1)}%`);
    console.log(`⏱️  Average Fix Time: ${(averageFixTime / 1000).toFixed(1)}s`);
    console.log(`🚀 Auto-Deployed: ${autoDeployedFixes}`);
    console.log(`📊 Level 1 Fixes: ${level1Fixes}`);
    console.log(`📊 Level 2 Fixes: ${level2Fixes}`);
    console.log(`📊 Level 3 Fixes: ${level3Fixes}`);
    console.log(`⏱️  Total Time: ${(totalTime / 1000).toFixed(1)}s`);
    console.log('========================================\n');

    return {
      timestamp: new Date(),
      totalIssues: fixResults.length,
      fixedIssues,
      failedFixes,
      requiresHumanReview,
      fixResults,
      metrics: {
        averageFixTime,
        successRate,
        level1Fixes,
        level2Fixes,
        level3Fixes,
        autoDeployedFixes,
      },
    };
  }
}
