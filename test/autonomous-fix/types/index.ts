/**
 * Type definitions for Autonomous Bug Fixer System
 *
 * This file contains all interfaces and types used throughout the autonomous fix system.
 */

import { TestResult } from '@playwright/test';

/**
 * Detected issue from test results
 */
export interface DetectedIssue {
  id: string;
  type: 'test-failure' | 'console-error' | 'visual-regression' | 'performance' | 'accessibility' | 'network-error';
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  testName: string;
  testFile: string;
  errorMessage: string;
  stackTrace: string;
  affectedFiles: string[];
  timestamp: Date;
  context?: {
    url?: string;
    screenshot?: string;
    video?: string;
    trace?: string;
  };
}

/**
 * Issue classification result
 */
export interface IssueClassification {
  level: 1 | 2 | 3 | 4;
  fixable: boolean;
  category: string;
  confidence: number;
  estimatedComplexity: 'low' | 'medium' | 'high';
  suggestedApproach: string;
  environment: 'development' | 'staging' | 'production';
  reasoning: string;
}

/**
 * Root cause analysis result
 */
export interface RootCauseAnalysis {
  explanation: string;
  rootCause: string;
  whyOccurred: string;
  whatNeedsToChange: string;
  potentialSideEffects: string[];
  relatedCode: string[];
  confidence: number;
}

/**
 * Code change specification
 */
export interface CodeChange {
  lineStart: number;
  lineEnd: number;
  oldCode: string;
  newCode: string;
  explanation: string;
}

/**
 * File fix specification
 */
export interface FileFix {
  file: string;
  changes: CodeChange[];
}

/**
 * Generated fix from AI
 */
export interface GeneratedFix {
  issue: DetectedIssue;
  rootCause: RootCauseAnalysis;
  fixes: FileFix[];
  testCases: string[];
  risks: string[];
  rollbackPlan: string;
  estimatedImpact: 'low' | 'medium' | 'high';
}

/**
 * Fix implementation result
 */
export interface ImplementationResult {
  success: boolean;
  branch?: string;
  commit?: string;
  filesModified?: string[];
  error?: string;
  implementationTime?: number;
}

/**
 * Fix verification result
 */
export interface VerificationResult {
  passed: boolean;
  reason?: string;
  testResult?: any;
  regressionResults?: any[];
  fullSuiteResults?: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  verificationTime?: number;
}

/**
 * Complete fix result
 */
export interface FixResult {
  issue: DetectedIssue;
  classification?: IssueClassification;
  implemented: boolean;
  verified?: boolean;
  deployed?: boolean;
  generatedFix?: GeneratedFix;
  implementation?: ImplementationResult;
  verification?: VerificationResult;
  reason?: string;
  requiresHuman?: boolean;
  totalTime?: number;
}

/**
 * Fix implementation report
 */
export interface FixImplementationReport {
  timestamp: Date;
  totalIssues: number;
  fixedIssues: number;
  failedFixes: number;
  requiresHumanReview: number;
  fixResults: FixResult[];
  metrics: {
    averageFixTime: number;
    successRate: number;
    level1Fixes: number;
    level2Fixes: number;
    level3Fixes: number;
    autoDeployedFixes: number;
  };
}

/**
 * Code context for analysis
 */
export interface CodeContext {
  file: string;
  code: string;
  startLine: number;
  endLine: number;
  language: string;
}

/**
 * Fix configuration
 */
export interface FixConfig {
  // AI Provider Configuration
  aiProvider: 'anthropic' | 'openai';
  anthropicApiKey: string;
  anthropicModel: string;
  openaiApiKey: string;
  openaiModel: string;

  // Fix Limits
  maxFixesPerRun: number;

  // Deployment Settings
  autoDeployLevel1: boolean;
  autoDeployLevel2: boolean;
  requireApprovalLevel3: boolean;

  // Retry Configuration
  maxRetries: number;
  verificationTimeout: number;

  // Git Configuration
  gitBranchPrefix: string;
}

/**
 * Git operation result
 */
export interface GitResult {
  success: boolean;
  output?: string;
  error?: string;
}

/**
 * Deployment result
 */
export interface DeploymentResult {
  success: boolean;
  environment: 'development' | 'staging' | 'production';
  deploymentId?: string;
  url?: string;
  error?: string;
  deploymentTime?: number;
}

/**
 * Test execution result (extended from Playwright)
 */
export interface ExtendedTestResult {
  testFile: string;
  testName: string;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut';
  duration: number;
  error?: {
    message: string;
    stack: string;
  };
  retry: number;
  attachments?: {
    name: string;
    path: string;
    contentType: string;
  }[];
}

/**
 * Continuous monitoring event
 */
export interface MonitoringEvent {
  type: 'test-failure' | 'console-error' | 'performance-degradation' | 'visual-regression';
  severity: 'critical' | 'high' | 'medium' | 'low';
  data: any;
  timestamp: Date;
}

/**
 * Fix queue item
 */
export interface FixQueueItem {
  issue: DetectedIssue;
  priority: number;
  addedAt: Date;
  attempts: number;
  lastAttempt?: Date;
}
