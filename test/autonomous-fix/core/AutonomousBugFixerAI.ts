/**
 * Autonomous Bug Fixer - AI Integration (Part 2)
 *
 * This file contains all the AI-powered methods for the AutonomousBugFixer.
 * These methods support both Anthropic Claude and OpenAI GPT-4 for analyzing issues, generating fixes, and making decisions.
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import {
  DetectedIssue,
  IssueClassification,
  RootCauseAnalysis,
  GeneratedFix,
  ImplementationResult,
  VerificationResult,
  CodeContext,
  FixConfig,
} from '../types';
import { CodebaseManager } from '../infrastructure/CodebaseManager';
import { GitManager } from '../infrastructure/GitManager';
import { TestRunner } from '../infrastructure/TestRunner';

export class AutonomousBugFixerAI {
  private anthropic?: Anthropic;
  private openai?: OpenAI;
  private config: FixConfig;

  constructor(
    config: FixConfig,
    private codebase: CodebaseManager,
    private git: GitManager,
    private testRunner: TestRunner
  ) {
    this.config = config;

    // Initialize the appropriate AI provider
    if (config.aiProvider === 'anthropic') {
      this.anthropic = new Anthropic({ apiKey: config.anthropicApiKey });
      console.log(`🤖 Using Claude (${config.anthropicModel}) for AI-powered fixes`);
    } else {
      this.openai = new OpenAI({ apiKey: config.openaiApiKey });
      console.log(`🤖 Using OpenAI (${config.openaiModel}) for AI-powered fixes`);
    }
  }

  /**
   * Classify issue to determine fix level and approach
   */
  async classifyIssue(issue: DetectedIssue): Promise<IssueClassification> {
    const prompt = `
Classify this detected issue and determine if it can be automatically fixed:

Issue Type: ${issue.type}
Description: ${issue.description}
Severity: ${issue.severity}
Test Name: ${issue.testName}
Error Message: ${issue.errorMessage}
Stack Trace (first 500 chars): ${issue.stackTrace.substring(0, 500)}
Affected Files: ${issue.affectedFiles.join(', ')}

Classify into one of these categories:

LEVEL 1 - Auto-fix without approval (trivial fixes):
- Selector updates (e.g., data-testid changed)
- Import path corrections (moved files)
- TypeScript type fixes (type mismatches)
- Linting/formatting issues
- Console errors (warnings, logs)
- Test data cleanup issues

LEVEL 2 - Auto-fix with verification (requires full test suite):
- UI component bugs (rendering issues)
- API endpoint bugs (response errors)
- Database query issues
- Performance problems
- Accessibility issues

LEVEL 3 - Requires human approval (critical changes):
- Authentication/authorization logic
- Business logic modifications
- Database schema changes
- Security vulnerability patches
- API contract changes

LEVEL 4 - Not auto-fixable (complex issues):
- Architecture changes needed
- Complex business logic
- Multi-system integration issues
- Requires product decisions

Output JSON:
{
  "level": 1-4,
  "fixable": boolean,
  "category": "string (e.g., 'Selector Issue', 'Type Error', 'API Bug')",
  "confidence": 0-100,
  "estimatedComplexity": "low|medium|high",
  "suggestedApproach": "string (detailed approach to fix)",
  "environment": "development|staging|production",
  "reasoning": "string (why this classification)"
}
    `.trim();

    const systemPrompt = 'You are an expert bug classifier and fix strategist. Analyze issues and determine the best fix approach.';

    try {
      if (this.config.aiProvider === 'anthropic') {
        // Use Claude
        const response = await this.anthropic!.messages.create({
          model: this.config.anthropicModel,
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{
            role: 'user',
            content: prompt
          }],
          temperature: 0.3,
        });

        const content = response.content[0];
        if (content.type === 'text') {
          const result = JSON.parse(content.text);
          return result as IssueClassification;
        }
        throw new Error('Unexpected response format from Claude');
      } else {
        // Use OpenAI
        const response = await this.openai!.chat.completions.create({
          model: this.config.openaiModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        });

        const result = JSON.parse(response.choices[0].message.content!);
        return result as IssueClassification;
      }
    } catch (error) {
      console.error('Failed to classify issue:', error);
      // Default to Level 4 (not fixable) if classification fails
      return {
        level: 4,
        fixable: false,
        category: 'Classification Failed',
        confidence: 0,
        estimatedComplexity: 'high',
        suggestedApproach: 'Manual review required',
        environment: 'development',
        reasoning: `Classification failed: ${error.message}`,
      };
    }
  }

  /**
   * Analyze root cause of issue with AI
   */
  async analyzeRootCause(issue: DetectedIssue): Promise<RootCauseAnalysis> {
    // Gather relevant code context
    const codeContext = await this.gatherCodeContext(issue);

    const prompt = `
Analyze the root cause of this bug:

Issue: ${issue.description}
Test: ${issue.testName}
Error Message: ${issue.errorMessage}
Stack Trace:
${issue.stackTrace}

Relevant Code Context:
${codeContext.map((c) => `
File: ${c.file}
Lines ${c.startLine}-${c.endLine}:
${c.code}
`).join('\n---\n')}

Provide a comprehensive root cause analysis with:
1. Root cause explanation (what is actually broken)
2. Why the bug occurred (what changed or what assumption broke)
3. What needs to change to fix it
4. Potential side effects of the fix
5. Related code that might be affected

Output as JSON:
{
  "explanation": "string (comprehensive explanation)",
  "rootCause": "string (specific root cause)",
  "whyOccurred": "string (why it happened)",
  "whatNeedsToChange": "string (what to fix)",
  "potentialSideEffects": ["string", "string"],
  "relatedCode": ["string", "string"],
  "confidence": 0-100
}
    `.trim();

    const systemPrompt = 'You are an expert software debugger and root cause analyst. Analyze bugs deeply and identify the true root cause.';

    try {
      if (this.config.aiProvider === 'anthropic') {
        // Use Claude
        const response = await this.anthropic!.messages.create({
          model: this.config.anthropicModel,
          max_tokens: 2048,
          system: systemPrompt,
          messages: [{
            role: 'user',
            content: prompt
          }],
          temperature: 0.2,
        });

        const content = response.content[0];
        if (content.type === 'text') {
          return JSON.parse(content.text) as RootCauseAnalysis;
        }
        throw new Error('Unexpected response format from Claude');
      } else {
        // Use OpenAI
        const response = await this.openai!.chat.completions.create({
          model: this.config.openaiModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        });

        return JSON.parse(response.choices[0].message.content!) as RootCauseAnalysis;
      }
    } catch (error) {
      console.error('Failed to analyze root cause:', error);
      throw new Error(`Root cause analysis failed: ${error.message}`);
    }
  }

  /**
   * Generate fix code using AI
   */
  async generateFix(issue: DetectedIssue, rootCause: RootCauseAnalysis): Promise<GeneratedFix> {
    const codeContext = await this.gatherCodeContext(issue);

    const prompt = `
Generate a complete fix for this bug:

Root Cause Analysis:
${JSON.stringify(rootCause, null, 2)}

Issue: ${issue.description}
Error: ${issue.errorMessage}
Files Affected: ${issue.affectedFiles.join(', ')}

Current Code:
${codeContext.map((c) => `
File: ${c.file}
${c.code}
`).join('\n---\n')}

Generate a complete, production-ready fix with:
1. Exact code changes for each file (line-by-line)
2. Explanation of each change
3. Test cases to verify the fix
4. Potential risks
5. Rollback plan

IMPORTANT Requirements:
- Maintain exact code style and patterns from the codebase
- Follow TypeScript best practices
- Preserve all existing functionality
- Add necessary error handling
- Ensure type safety
- Keep changes minimal and focused
- Use the exact same indentation (spaces/tabs)

Output as JSON:
{
  "fixes": [
    {
      "file": "path/to/file.ts",
      "changes": [
        {
          "lineStart": number,
          "lineEnd": number,
          "oldCode": "exact old code to replace",
          "newCode": "exact new code to use",
          "explanation": "why this change is needed"
        }
      ]
    }
  ],
  "testCases": ["test case 1", "test case 2"],
  "risks": ["potential risk 1", "potential risk 2"],
  "rollbackPlan": "how to rollback if fix fails",
  "estimatedImpact": "low|medium|high"
}
    `.trim();

    const systemPrompt = 'You are an expert TypeScript/React developer who writes production-quality code. Generate precise, minimal fixes that solve the problem without introducing new issues.';

    try {
      if (this.config.aiProvider === 'anthropic') {
        // Use Claude
        const response = await this.anthropic!.messages.create({
          model: this.config.anthropicModel,
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{
            role: 'user',
            content: prompt
          }],
          temperature: 0.2, // Lower temperature for consistent code generation
        });

        const content = response.content[0];
        if (content.type === 'text') {
          const generatedFix = JSON.parse(content.text);
          return {
            issue,
            rootCause,
            ...generatedFix,
          } as GeneratedFix;
        }
        throw new Error('Unexpected response format from Claude');
      } else {
        // Use OpenAI
        const response = await this.openai!.chat.completions.create({
          model: this.config.openaiModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
          max_tokens: 4000,
        });

        const generatedFix = JSON.parse(response.choices[0].message.content!);
        return {
          issue,
          rootCause,
          ...generatedFix,
        } as GeneratedFix;
      }
    } catch (error) {
      console.error('Failed to generate fix:', error);
      throw new Error(`Fix generation failed: ${error.message}`);
    }
  }

  /**
   * Implement the fix in the codebase
   */
  async implementFix(
    fix: GeneratedFix,
    issue: DetectedIssue
  ): Promise<ImplementationResult> {
    const startTime = Date.now();

    try {
      // 1. Create a new git branch for this fix
      const branchName = await this.git.createFixBranch(issue.id);
      console.log(`     Created branch: ${branchName}`);

      // 2. Apply each file change
      for (const fileFix of fix.fixes) {
        console.log(`     Modifying ${fileFix.file}...`);

        // Backup file before modification
        await this.codebase.backupFile(fileFix.file);

        try {
          const fileContent = await this.codebase.readFile(fileFix.file);
          let modifiedContent = fileContent;

          // Apply changes in reverse order (to preserve line numbers)
          const sortedChanges = [...fileFix.changes].sort((a, b) => b.lineStart - a.lineStart);

          for (const change of sortedChanges) {
            modifiedContent = await this.codebase.replaceLines(
              modifiedContent,
              change.lineStart,
              change.lineEnd,
              change.newCode
            );
          }

          await this.codebase.writeFile(fileFix.file, modifiedContent);
        } catch (error) {
          console.error(`     Failed to modify ${fileFix.file}:`, error);
          throw error;
        }
      }

      // 3. Run linting (optional, may fail for some files)
      try {
        await this.codebase.runLinter();
      } catch (error) {
        console.warn('     Linting warnings (non-blocking):', error);
      }

      // 4. Commit the changes
      const filesModified = fix.fixes.map((f) => f.file);
      const commitSha = await this.git.commitFix(issue.description, filesModified);
      console.log(`     Committed: ${commitSha}`);

      return {
        success: true,
        branch: branchName,
        commit: commitSha,
        filesModified,
        implementationTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error('     Implementation failed:', error);

      // Rollback - return to main branch
      try {
        await this.git.checkout('main');
      } catch {
        // Ignore checkout errors
      }

      return {
        success: false,
        error: error.message,
        implementationTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Verify the fix by running tests
   */
  async verifyFix(
    issue: DetectedIssue,
    implementation: ImplementationResult
  ): Promise<VerificationResult> {
    const startTime = Date.now();

    try {
      // 1. Run the specific test that was failing
      console.log('     Running original test...');
      const testResult = await this.testRunner.runTestFile(issue.testFile);

      if (!testResult.success) {
        return {
          passed: false,
          reason: 'Original test still failing',
          testResult,
          verificationTime: Date.now() - startTime,
        };
      }

      console.log('     ✅ Original test passed');

      // 2. Run related tests to check for regressions
      console.log('     Checking for regressions...');
      const relatedTests = await this.testRunner.findRelatedTests(
        implementation.filesModified || []
      );

      if (relatedTests.length > 0) {
        const regressionResults = await Promise.all(
          relatedTests.map((test) => this.testRunner.runTestFile(test))
        );

        const regressionFailures = regressionResults.filter((r) => !r.success);

        if (regressionFailures.length > 0) {
          return {
            passed: false,
            reason: `Fix introduced ${regressionFailures.length} regression(s)`,
            testResult,
            regressionResults: regressionFailures.flatMap((r) => r.results),
            verificationTime: Date.now() - startTime,
          };
        }

        console.log(`     ✅ No regressions (checked ${relatedTests.length} related tests)`);
      }

      return {
        passed: true,
        testResult,
        verificationTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        passed: false,
        reason: `Verification error: ${error.message}`,
        verificationTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Rollback a failed fix
   */
  async rollbackFix(implementation: ImplementationResult): Promise<void> {
    try {
      await this.git.checkout('main');
      if (implementation.branch) {
        await this.git.deleteBranch(implementation.branch, true);
      }
      console.log('     ✅ Rollback complete');
    } catch (error) {
      console.error('     ⚠️  Rollback error:', error.message);
    }
  }

  /**
   * Gather code context around the issue
   */
  private async gatherCodeContext(issue: DetectedIssue): Promise<CodeContext[]> {
    const contexts: CodeContext[] = [];

    for (const file of issue.affectedFiles) {
      try {
        // Try to find the specific line from stack trace
        const lineMatch = issue.stackTrace.match(new RegExp(`${file}:(\\d+):`));
        const centerLine = lineMatch ? parseInt(lineMatch[1]) : 10;

        const context = await this.codebase.getCodeContext(file, centerLine, 15);
        contexts.push(context);
      } catch (error) {
        console.warn(`Could not get context for ${file}:`, error.message);
      }
    }

    return contexts;
  }
}
