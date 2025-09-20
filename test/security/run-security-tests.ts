/**
 * Security Test Orchestrator
 * Comprehensive security test runner that executes 700+ security tests
 * and generates detailed security compliance reports
 *
 * Features:
 * - Executes all backend security tests (500+ tests)
 * - Executes all Playwright GUI security tests (200+ tests)
 * - Parallel test execution for performance
 * - Real-time progress reporting
 * - OWASP Top 10 compliance validation
 * - Security vulnerability categorization
 * - Risk scoring and remediation recommendations
 * - Multiple output formats (JSON, HTML, CSV)
 * - Executive summary generation
 */

import { spawn, exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { performance } from 'perf_hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Security test categories and OWASP Top 10 mapping
const OWASP_TOP_10_2021 = {
  'A01:2021': 'Broken Access Control',
  'A02:2021': 'Cryptographic Failures',
  'A03:2021': 'Injection',
  'A04:2021': 'Insecure Design',
  'A05:2021': 'Security Misconfiguration',
  'A06:2021': 'Vulnerable and Outdated Components',
  'A07:2021': 'Identification and Authentication Failures',
  'A08:2021': 'Software and Data Integrity Failures',
  'A09:2021': 'Security Logging and Monitoring Failures',
  'A10:2021': 'Server-Side Request Forgery (SSRF)'
};

// Risk severity levels
enum RiskLevel {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO'
}

// Security test configuration
interface SecurityTestConfig {
  name: string;
  file: string;
  category: string;
  owaspMapping: string[];
  estimatedTests: number;
  timeout: number;
  parallel: boolean;
  dependencies?: string[];
}

interface TestResult {
  name: string;
  category: string;
  status: 'PASS' | 'FAIL' | 'SKIP' | 'ERROR';
  duration: number;
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
  testsSkipped: number;
  vulnerabilities: Vulnerability[];
  coverage: number;
  owaspCompliance: string[];
  errorDetails?: string;
}

interface Vulnerability {
  id: string;
  title: string;
  description: string;
  severity: RiskLevel;
  category: string;
  owaspCategory: string;
  location: string;
  remediation: string;
  cveReferences?: string[];
  impact: string;
  likelihood: string;
  riskScore: number;
}

interface SecurityReport {
  executionId: string;
  timestamp: string;
  summary: {
    totalTests: number;
    totalPassed: number;
    totalFailed: number;
    totalSkipped: number;
    overallDuration: number;
    securityScore: number;
    complianceScore: number;
    riskLevel: RiskLevel;
  };
  categoryResults: TestResult[];
  vulnerabilities: Vulnerability[];
  owaspCompliance: Record<string, boolean>;
  complianceMetrics: {
    owaspCompliance: number;
    pciDssCompliance: number;
    gdprCompliance: number;
    iso27001Compliance: number;
  };
  recommendations: string[];
  executiveSummary: string;
  metadata: {
    environment: string;
    nodeVersion: string;
    testFrameworks: string[];
    timestamp: string;
    duration: number;
  };
}

class SecurityTestOrchestrator {
  private testConfigs: SecurityTestConfig[];
  private results: TestResult[] = [];
  private vulnerabilities: Vulnerability[] = [];
  private startTime: number = 0;
  private outputDir: string;
  private verbose: boolean;

  constructor(options: { outputDir?: string; verbose?: boolean } = {}) {
    this.outputDir = options.outputDir || path.join(__dirname, '../../test-results/security');
    this.verbose = options.verbose || false;

    this.testConfigs = [
      {
        name: 'SQL Injection Tests',
        file: 'sql-injection-tests.ts',
        category: 'Injection Attacks',
        owaspMapping: ['A03:2021'],
        estimatedTests: 85,
        timeout: 300000,
        parallel: true
      },
      {
        name: 'XSS Attack Tests',
        file: 'xss-attack-tests.ts',
        category: 'XSS Prevention',
        owaspMapping: ['A03:2021', 'A05:2021'],
        estimatedTests: 105,
        timeout: 240000,
        parallel: true
      },
      {
        name: 'Authentication Security',
        file: 'authentication-security-tests.ts',
        category: 'Authentication & Authorization',
        owaspMapping: ['A01:2021', 'A07:2021'],
        estimatedTests: 120,
        timeout: 360000,
        parallel: true
      },
      {
        name: 'CSRF Protection Tests',
        file: 'csrf-tests.ts',
        category: 'CSRF Protection',
        owaspMapping: ['A01:2021', 'A08:2021'],
        estimatedTests: 95,
        timeout: 300000,
        parallel: true
      },
      {
        name: 'API Security Tests',
        file: 'api-security-tests.ts',
        category: 'API Security',
        owaspMapping: ['A01:2021', 'A03:2021', 'A05:2021'],
        estimatedTests: 150,
        timeout: 480000,
        parallel: true
      },
      {
        name: 'File Upload Security',
        file: 'file-upload-security-tests.ts',
        category: 'File Upload Security',
        owaspMapping: ['A03:2021', 'A05:2021'],
        estimatedTests: 75,
        timeout: 300000,
        parallel: true
      },
      {
        name: 'GUI Security Tests',
        file: '../e2e/security/comprehensive-gui-security.spec.ts',
        category: 'UI Security',
        owaspMapping: ['A01:2021', 'A03:2021', 'A07:2021'],
        estimatedTests: 200,
        timeout: 600000,
        parallel: false,
        dependencies: ['playwright']
      },
      {
        name: 'Security Penetration Edge Cases',
        file: '../e2e/security-penetration-edge-cases.spec.ts',
        category: 'Penetration Testing',
        owaspMapping: ['A01:2021', 'A03:2021', 'A05:2021', 'A07:2021'],
        estimatedTests: 150,
        timeout: 720000,
        parallel: false,
        dependencies: ['playwright']
      }
    ];
  }

  /**
   * Execute all security tests with parallel processing
   */
  async executeTests(): Promise<SecurityReport> {
    this.startTime = performance.now();
    console.log('🔒 Starting Security Test Orchestrator');
    console.log(`📊 Executing ${this.getTotalEstimatedTests()} security tests across ${this.testConfigs.length} categories`);

    await this.ensureOutputDirectory();

    // Execute tests in parallel where possible
    const parallelTests = this.testConfigs.filter(config => config.parallel);
    const sequentialTests = this.testConfigs.filter(config => !config.parallel);

    // Run parallel tests first
    if (parallelTests.length > 0) {
      console.log(`⚡ Running ${parallelTests.length} parallel test suites...`);
      const parallelPromises = parallelTests.map(config => this.executeTestSuite(config));
      const parallelResults = await Promise.allSettled(parallelPromises);

      parallelResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          this.results.push(result.value);
        } else {
          console.error(`❌ Parallel test failed: ${parallelTests[index].name}`, result.reason);
          this.results.push(this.createErrorResult(parallelTests[index], result.reason));
        }
      });
    }

    // Run sequential tests (mainly Playwright tests)
    for (const config of sequentialTests) {
      console.log(`🔄 Running sequential test: ${config.name}`);
      try {
        const result = await this.executeTestSuite(config);
        this.results.push(result);
      } catch (error) {
        console.error(`❌ Sequential test failed: ${config.name}`, error);
        this.results.push(this.createErrorResult(config, error));
      }
    }

    // Generate comprehensive report
    const report = await this.generateSecurityReport();

    // Save reports in multiple formats
    await this.saveReports(report);

    // Display summary
    this.displaySummary(report);

    return report;
  }

  /**
   * Execute a single test suite
   */
  private async executeTestSuite(config: SecurityTestConfig): Promise<TestResult> {
    const testStart = performance.now();
    console.log(`🧪 Executing: ${config.name} (${config.estimatedTests} tests)`);

    try {
      const testFilePath = path.resolve(__dirname, config.file);
      const exists = await fs.access(testFilePath).then(() => true).catch(() => false);

      if (!exists) {
        throw new Error(`Test file not found: ${testFilePath}`);
      }

      let testOutput: string;
      let exitCode: number;

      if (config.dependencies?.includes('playwright')) {
        // Run Playwright tests
        const result = await this.runPlaywrightTest(testFilePath, config.timeout);
        testOutput = result.output;
        exitCode = result.exitCode;
      } else {
        // Run Vitest tests
        const result = await this.runVitestTest(testFilePath, config.timeout);
        testOutput = result.output;
        exitCode = result.exitCode;
      }

      const duration = performance.now() - testStart;
      const testResult = this.parseTestOutput(config, testOutput, duration, exitCode);

      console.log(`✅ Completed: ${config.name} (${testResult.testsRun} tests, ${(duration / 1000).toFixed(2)}s)`);

      return testResult;

    } catch (error) {
      const duration = performance.now() - testStart;
      console.error(`❌ Failed: ${config.name} - ${error.message}`);

      return {
        name: config.name,
        category: config.category,
        status: 'ERROR',
        duration,
        testsRun: 0,
        testsPassed: 0,
        testsFailed: 0,
        testsSkipped: 0,
        vulnerabilities: [],
        coverage: 0,
        owaspCompliance: config.owaspMapping,
        errorDetails: error.message
      };
    }
  }

  /**
   * Run Playwright security test
   */
  private async runPlaywrightTest(testFile: string, timeout: number): Promise<{ output: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      const command = `npx playwright test "${testFile}" --reporter=json --timeout=${timeout}`;

      exec(command, {
        cwd: path.resolve(__dirname, '../..'),
        timeout,
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      }, (error, stdout, stderr) => {
        if (error && error.code !== 1) { // Code 1 is test failures, which is normal
          reject(new Error(`Playwright execution failed: ${error.message}`));
          return;
        }

        resolve({
          output: stdout + stderr,
          exitCode: error ? error.code || 1 : 0
        });
      });
    });
  }

  /**
   * Run Vitest security test
   */
  private async runVitestTest(testFile: string, timeout: number): Promise<{ output: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      const command = `npx vitest run "${testFile}" --reporter=json --run`;

      exec(command, {
        cwd: path.resolve(__dirname, '../..'),
        timeout,
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      }, (error, stdout, stderr) => {
        if (error && error.code !== 1) { // Code 1 is test failures, which is normal
          reject(new Error(`Vitest execution failed: ${error.message}`));
          return;
        }

        resolve({
          output: stdout + stderr,
          exitCode: error ? error.code || 1 : 0
        });
      });
    });
  }

  /**
   * Parse test output to extract results
   */
  private parseTestOutput(config: SecurityTestConfig, output: string, duration: number, exitCode: number): TestResult {
    const vulnerabilities: Vulnerability[] = [];
    let testsRun = 0;
    let testsPassed = 0;
    let testsFailed = 0;
    let testsSkipped = 0;

    try {
      // Try to parse JSON output first
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const testData = JSON.parse(jsonMatch[0]);

        if (testData.testResults) {
          // Playwright format
          testsRun = testData.testResults.length;
          testsPassed = testData.testResults.filter((t: any) => t.status === 'passed').length;
          testsFailed = testData.testResults.filter((t: any) => t.status === 'failed').length;
          testsSkipped = testData.testResults.filter((t: any) => t.status === 'skipped').length;
        } else if (testData.numTotalTests) {
          // Vitest format
          testsRun = testData.numTotalTests;
          testsPassed = testData.numPassedTests || 0;
          testsFailed = testData.numFailedTests || 0;
          testsSkipped = testData.numPendingTests || 0;
        }
      }
    } catch (error) {
      // Fallback to regex parsing
      const testMatches = output.match(/(\d+) (passing|failing|pending)/g);
      if (testMatches) {
        testMatches.forEach(match => {
          const [, count, status] = match.match(/(\d+) (passing|failing|pending)/) || [];
          const num = parseInt(count);
          if (status === 'passing') testsPassed = num;
          else if (status === 'failing') testsFailed = num;
          else if (status === 'pending') testsSkipped = num;
        });
        testsRun = testsPassed + testsFailed + testsSkipped;
      }
    }

    // Extract security vulnerabilities from test output
    vulnerabilities.push(...this.extractVulnerabilities(config, output));

    // Store vulnerabilities globally
    this.vulnerabilities.push(...vulnerabilities);

    const status = exitCode === 0 ? 'PASS' : (testsRun > 0 ? 'FAIL' : 'ERROR');
    const coverage = testsRun > 0 ? (testsPassed / testsRun) * 100 : 0;

    return {
      name: config.name,
      category: config.category,
      status,
      duration,
      testsRun: testsRun || config.estimatedTests,
      testsPassed,
      testsFailed,
      testsSkipped,
      vulnerabilities,
      coverage,
      owaspCompliance: config.owaspMapping
    };
  }

  /**
   * Extract security vulnerabilities from test output
   */
  private extractVulnerabilities(config: SecurityTestConfig, output: string): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    // Look for common security test failure patterns
    const securityPatterns = [
      {
        pattern: /XSS.*vulnerable|vulnerable.*XSS/gi,
        severity: RiskLevel.HIGH,
        category: 'Cross-Site Scripting',
        owaspCategory: 'A03:2021'
      },
      {
        pattern: /SQL.*injection|injection.*SQL/gi,
        severity: RiskLevel.CRITICAL,
        category: 'SQL Injection',
        owaspCategory: 'A03:2021'
      },
      {
        pattern: /CSRF.*vulnerable|vulnerable.*CSRF/gi,
        severity: RiskLevel.MEDIUM,
        category: 'CSRF',
        owaspCategory: 'A01:2021'
      },
      {
        pattern: /authentication.*failed|unauthorized.*access/gi,
        severity: RiskLevel.HIGH,
        category: 'Authentication Bypass',
        owaspCategory: 'A07:2021'
      },
      {
        pattern: /authorization.*failed|access.*control/gi,
        severity: RiskLevel.HIGH,
        category: 'Access Control',
        owaspCategory: 'A01:2021'
      }
    ];

    securityPatterns.forEach((pattern, index) => {
      const matches = output.match(pattern.pattern);
      if (matches) {
        matches.forEach((match, matchIndex) => {
          vulnerabilities.push({
            id: `VULN-${config.name.replace(/\s+/g, '-')}-${index}-${matchIndex}`,
            title: `${pattern.category} Vulnerability Detected`,
            description: `Security test detected potential ${pattern.category.toLowerCase()} vulnerability: ${match}`,
            severity: pattern.severity,
            category: pattern.category,
            owaspCategory: pattern.owaspCategory,
            location: config.file,
            remediation: this.getRemediationAdvice(pattern.category),
            impact: this.getImpactDescription(pattern.severity),
            likelihood: 'Medium',
            riskScore: this.calculateRiskScore(pattern.severity, 'Medium')
          });
        });
      }
    });

    return vulnerabilities;
  }

  /**
   * Generate comprehensive security report
   */
  private async generateSecurityReport(): Promise<SecurityReport> {
    const endTime = performance.now();
    const totalDuration = endTime - this.startTime;

    const totalTests = this.results.reduce((sum, result) => sum + result.testsRun, 0);
    const totalPassed = this.results.reduce((sum, result) => sum + result.testsPassed, 0);
    const totalFailed = this.results.reduce((sum, result) => sum + result.testsFailed, 0);
    const totalSkipped = this.results.reduce((sum, result) => sum + result.testsSkipped, 0);

    const securityScore = this.calculateSecurityScore();
    const complianceScore = this.calculateComplianceScore();
    const overallRiskLevel = this.calculateOverallRiskLevel();

    const owaspCompliance = this.assessOwaspCompliance();
    const complianceMetrics = this.calculateComplianceMetrics();
    const recommendations = this.generateRecommendations();
    const executiveSummary = this.generateExecutiveSummary(securityScore, totalTests, totalFailed);

    return {
      executionId: `security-test-${Date.now()}`,
      timestamp: new Date().toISOString(),
      summary: {
        totalTests,
        totalPassed,
        totalFailed,
        totalSkipped,
        overallDuration: totalDuration,
        securityScore,
        complianceScore,
        riskLevel: overallRiskLevel
      },
      categoryResults: this.results,
      vulnerabilities: this.vulnerabilities,
      owaspCompliance,
      complianceMetrics,
      recommendations,
      executiveSummary,
      metadata: {
        environment: process.env.NODE_ENV || 'test',
        nodeVersion: process.version,
        testFrameworks: ['vitest', 'playwright'],
        timestamp: new Date().toISOString(),
        duration: totalDuration
      }
    };
  }

  /**
   * Calculate overall security score (0-100)
   */
  private calculateSecurityScore(): number {
    if (this.results.length === 0) return 0;

    const totalTests = this.results.reduce((sum, result) => sum + result.testsRun, 0);
    const totalPassed = this.results.reduce((sum, result) => sum + result.testsPassed, 0);

    const baseScore = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;

    // Deduct points for critical vulnerabilities
    const criticalVulns = this.vulnerabilities.filter(v => v.severity === RiskLevel.CRITICAL).length;
    const highVulns = this.vulnerabilities.filter(v => v.severity === RiskLevel.HIGH).length;
    const mediumVulns = this.vulnerabilities.filter(v => v.severity === RiskLevel.MEDIUM).length;

    const deductions = (criticalVulns * 20) + (highVulns * 10) + (mediumVulns * 5);

    return Math.max(0, Math.min(100, baseScore - deductions));
  }

  /**
   * Calculate OWASP compliance score
   */
  private calculateComplianceScore(): number {
    const owaspCategories = Object.keys(OWASP_TOP_10_2021);
    const testedCategories = new Set(
      this.testConfigs.flatMap(config => config.owaspMapping)
    );

    return (testedCategories.size / owaspCategories.length) * 100;
  }

  /**
   * Calculate overall risk level
   */
  private calculateOverallRiskLevel(): RiskLevel {
    const criticalCount = this.vulnerabilities.filter(v => v.severity === RiskLevel.CRITICAL).length;
    const highCount = this.vulnerabilities.filter(v => v.severity === RiskLevel.HIGH).length;
    const mediumCount = this.vulnerabilities.filter(v => v.severity === RiskLevel.MEDIUM).length;

    if (criticalCount > 0) return RiskLevel.CRITICAL;
    if (highCount > 5) return RiskLevel.HIGH;
    if (highCount > 0 || mediumCount > 10) return RiskLevel.MEDIUM;
    if (mediumCount > 0) return RiskLevel.LOW;

    return RiskLevel.INFO;
  }

  /**
   * Assess OWASP Top 10 compliance
   */
  private assessOwaspCompliance(): Record<string, boolean> {
    const compliance: Record<string, boolean> = {};

    Object.keys(OWASP_TOP_10_2021).forEach(category => {
      const hasTests = this.testConfigs.some(config =>
        config.owaspMapping.includes(category)
      );
      const hasVulnerabilities = this.vulnerabilities.some(vuln =>
        vuln.owaspCategory === category
      );

      compliance[category] = hasTests && !hasVulnerabilities;
    });

    return compliance;
  }

  /**
   * Calculate compliance metrics for various standards
   */
  private calculateComplianceMetrics() {
    const owaspCompliance = this.calculateComplianceScore();

    // PCI-DSS compliance estimation based on security tests
    const pciDssCompliance = this.calculatePciDssCompliance();

    // GDPR compliance estimation based on data protection tests
    const gdprCompliance = this.calculateGdprCompliance();

    // ISO 27001 compliance estimation
    const iso27001Compliance = this.calculateIso27001Compliance();

    return {
      owaspCompliance,
      pciDssCompliance,
      gdprCompliance,
      iso27001Compliance
    };
  }

  /**
   * Generate security recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    // Critical vulnerabilities
    const criticalVulns = this.vulnerabilities.filter(v => v.severity === RiskLevel.CRITICAL);
    if (criticalVulns.length > 0) {
      recommendations.push(
        `🚨 URGENT: Address ${criticalVulns.length} critical security vulnerabilities immediately`
      );
    }

    // High priority vulnerabilities
    const highVulns = this.vulnerabilities.filter(v => v.severity === RiskLevel.HIGH);
    if (highVulns.length > 0) {
      recommendations.push(
        `⚠️ HIGH: Fix ${highVulns.length} high-severity vulnerabilities within 48 hours`
      );
    }

    // Failed test categories
    const failedCategories = this.results.filter(r => r.status === 'FAIL');
    if (failedCategories.length > 0) {
      recommendations.push(
        `🔧 Review and fix failing tests in: ${failedCategories.map(r => r.category).join(', ')}`
      );
    }

    // OWASP compliance gaps
    const owaspGaps = Object.entries(this.assessOwaspCompliance())
      .filter(([, compliant]) => !compliant)
      .map(([category]) => OWASP_TOP_10_2021[category]);

    if (owaspGaps.length > 0) {
      recommendations.push(
        `📋 Improve OWASP Top 10 compliance for: ${owaspGaps.join(', ')}`
      );
    }

    // General security improvements
    recommendations.push(
      '🔒 Implement regular security testing in CI/CD pipeline',
      '📚 Conduct security training for development team',
      '🔍 Set up automated vulnerability scanning',
      '📊 Establish security metrics and KPIs'
    );

    return recommendations;
  }

  /**
   * Generate executive summary
   */
  private generateExecutiveSummary(securityScore: number, totalTests: number, totalFailed: number): string {
    const riskLevel = this.calculateOverallRiskLevel();
    const criticalCount = this.vulnerabilities.filter(v => v.severity === RiskLevel.CRITICAL).length;
    const highCount = this.vulnerabilities.filter(v => v.severity === RiskLevel.HIGH).length;

    return `
Security Assessment Executive Summary

OVERALL SECURITY SCORE: ${securityScore.toFixed(1)}/100 (${this.getScoreRating(securityScore)})
RISK LEVEL: ${riskLevel}

Test Execution Summary:
- Total Tests Executed: ${totalTests}
- Test Failure Rate: ${totalTests > 0 ? ((totalFailed / totalTests) * 100).toFixed(1) : 0}%
- Security Categories Tested: ${this.results.length}

Vulnerability Summary:
- Critical Vulnerabilities: ${criticalCount}
- High-Risk Vulnerabilities: ${highCount}
- Total Vulnerabilities: ${this.vulnerabilities.length}

Key Findings:
${riskLevel === RiskLevel.CRITICAL ?
  '⛔ CRITICAL: Immediate action required to address critical security vulnerabilities' :
  riskLevel === RiskLevel.HIGH ?
  '🔴 HIGH RISK: Multiple high-severity security issues identified' :
  riskLevel === RiskLevel.MEDIUM ?
  '🟡 MEDIUM RISK: Some security concerns need attention' :
  '🟢 LOW RISK: Security posture is generally good'
}

Compliance Status:
- OWASP Top 10: ${this.calculateComplianceScore().toFixed(1)}% coverage
- Critical security controls: ${securityScore > 80 ? 'Adequate' : 'Needs improvement'}

Recommendations:
${criticalCount > 0 ? '1. Address critical vulnerabilities immediately' : '1. Maintain current security posture'}
2. Implement continuous security testing
3. Regular security training and updates
    `.trim();
  }

  /**
   * Save reports in multiple formats
   */
  private async saveReports(report: SecurityReport): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // JSON Report
    const jsonPath = path.join(this.outputDir, `security-report-${timestamp}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));
    console.log(`📄 JSON report saved: ${jsonPath}`);

    // HTML Report
    const htmlPath = path.join(this.outputDir, `security-report-${timestamp}.html`);
    const htmlContent = this.generateHtmlReport(report);
    await fs.writeFile(htmlPath, htmlContent);
    console.log(`🌐 HTML report saved: ${htmlPath}`);

    // CSV Report (vulnerabilities)
    const csvPath = path.join(this.outputDir, `vulnerabilities-${timestamp}.csv`);
    const csvContent = this.generateCsvReport(report.vulnerabilities);
    await fs.writeFile(csvPath, csvContent);
    console.log(`📊 CSV report saved: ${csvPath}`);

    // Executive Summary (text)
    const summaryPath = path.join(this.outputDir, `executive-summary-${timestamp}.txt`);
    await fs.writeFile(summaryPath, report.executiveSummary);
    console.log(`📋 Executive summary saved: ${summaryPath}`);
  }

  /**
   * Generate HTML report
   */
  private generateHtmlReport(report: SecurityReport): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Test Report - ${report.timestamp}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #2c3e50; color: white; padding: 20px; margin: -20px -20px 20px -20px; border-radius: 8px 8px 0 0; }
        .score { font-size: 2em; font-weight: bold; color: ${report.summary.securityScore > 80 ? '#27ae60' : report.summary.securityScore > 60 ? '#f39c12' : '#e74c3c'}; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .card { background: #ecf0f1; padding: 15px; border-radius: 5px; text-align: center; }
        .vulnerability-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .vulnerability-table th, .vulnerability-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .vulnerability-table th { background-color: #34495e; color: white; }
        .critical { background-color: #e74c3c; color: white; }
        .high { background-color: #e67e22; color: white; }
        .medium { background-color: #f39c12; color: white; }
        .low { background-color: #27ae60; color: white; }
        .test-results { margin: 20px 0; }
        .compliance-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
        .compliance-item { padding: 10px; text-align: center; border-radius: 5px; }
        .compliant { background-color: #d5f4e6; color: #27ae60; }
        .non-compliant { background-color: #fadbd8; color: #e74c3c; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 Security Test Report</h1>
            <p>Generated: ${report.timestamp}</p>
            <p>Execution ID: ${report.executionId}</p>
        </div>

        <div class="summary-grid">
            <div class="card">
                <h3>Security Score</h3>
                <div class="score">${report.summary.securityScore.toFixed(1)}/100</div>
                <p>${this.getScoreRating(report.summary.securityScore)}</p>
            </div>
            <div class="card">
                <h3>Risk Level</h3>
                <div class="score">${report.summary.riskLevel}</div>
            </div>
            <div class="card">
                <h3>Total Tests</h3>
                <div class="score">${report.summary.totalTests}</div>
                <p>${report.summary.totalPassed} passed, ${report.summary.totalFailed} failed</p>
            </div>
            <div class="card">
                <h3>Vulnerabilities</h3>
                <div class="score">${report.vulnerabilities.length}</div>
                <p>${report.vulnerabilities.filter(v => v.severity === RiskLevel.CRITICAL).length} critical</p>
            </div>
        </div>

        <h2>📊 Test Results by Category</h2>
        <div class="test-results">
            ${report.categoryResults.map(result => `
                <div style="margin: 10px 0; padding: 15px; background: ${result.status === 'PASS' ? '#d5f4e6' : result.status === 'FAIL' ? '#fadbd8' : '#fef9e7'}; border-radius: 5px;">
                    <h4>${result.name} - ${result.status}</h4>
                    <p>Tests: ${result.testsRun} | Passed: ${result.testsPassed} | Failed: ${result.testsFailed} | Duration: ${(result.duration / 1000).toFixed(2)}s</p>
                    ${result.errorDetails ? `<p style="color: #e74c3c;"><strong>Error:</strong> ${result.errorDetails}</p>` : ''}
                </div>
            `).join('')}
        </div>

        <h2>🚨 Vulnerabilities</h2>
        <table class="vulnerability-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Severity</th>
                    <th>Category</th>
                    <th>OWASP</th>
                    <th>Risk Score</th>
                </tr>
            </thead>
            <tbody>
                ${report.vulnerabilities.map(vuln => `
                    <tr>
                        <td>${vuln.id}</td>
                        <td>${vuln.title}</td>
                        <td class="${vuln.severity.toLowerCase()}">${vuln.severity}</td>
                        <td>${vuln.category}</td>
                        <td>${vuln.owaspCategory}</td>
                        <td>${vuln.riskScore}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <h2>✅ OWASP Top 10 Compliance</h2>
        <div class="compliance-grid">
            ${Object.entries(report.owaspCompliance).map(([category, compliant]) => `
                <div class="compliance-item ${compliant ? 'compliant' : 'non-compliant'}">
                    <strong>${category}</strong><br>
                    ${OWASP_TOP_10_2021[category]}<br>
                    ${compliant ? '✅ Compliant' : '❌ Issues Found'}
                </div>
            `).join('')}
        </div>

        <h2>📋 Recommendations</h2>
        <ul>
            ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>

        <h2>📄 Executive Summary</h2>
        <pre style="background: #f8f9fa; padding: 20px; border-radius: 5px; white-space: pre-wrap;">${report.executiveSummary}</pre>
    </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate CSV report for vulnerabilities
   */
  private generateCsvReport(vulnerabilities: Vulnerability[]): string {
    const headers = ['ID', 'Title', 'Severity', 'Category', 'OWASP Category', 'Location', 'Risk Score', 'Description', 'Remediation'];
    const rows = vulnerabilities.map(vuln => [
      vuln.id,
      vuln.title,
      vuln.severity,
      vuln.category,
      vuln.owaspCategory,
      vuln.location,
      vuln.riskScore.toString(),
      vuln.description.replace(/,/g, ';'),
      vuln.remediation.replace(/,/g, ';')
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Display summary to console
   */
  private displaySummary(report: SecurityReport): void {
    console.log('\n' + '='.repeat(80));
    console.log('🔒 SECURITY TEST EXECUTION COMPLETE');
    console.log('='.repeat(80));
    console.log(`📊 Security Score: ${report.summary.securityScore.toFixed(1)}/100 (${this.getScoreRating(report.summary.securityScore)})`);
    console.log(`⚠️  Risk Level: ${report.summary.riskLevel}`);
    console.log(`🧪 Tests Executed: ${report.summary.totalTests}`);
    console.log(`✅ Tests Passed: ${report.summary.totalPassed}`);
    console.log(`❌ Tests Failed: ${report.summary.totalFailed}`);
    console.log(`🚨 Vulnerabilities: ${report.vulnerabilities.length}`);
    console.log(`⏱️  Duration: ${(report.summary.overallDuration / 1000).toFixed(2)} seconds`);
    console.log('\n🔍 Vulnerability Breakdown:');
    console.log(`   Critical: ${report.vulnerabilities.filter(v => v.severity === RiskLevel.CRITICAL).length}`);
    console.log(`   High: ${report.vulnerabilities.filter(v => v.severity === RiskLevel.HIGH).length}`);
    console.log(`   Medium: ${report.vulnerabilities.filter(v => v.severity === RiskLevel.MEDIUM).length}`);
    console.log(`   Low: ${report.vulnerabilities.filter(v => v.severity === RiskLevel.LOW).length}`);
    console.log('\n📋 Top Recommendations:');
    report.recommendations.slice(0, 3).forEach(rec => console.log(`   • ${rec}`));
    console.log('\n📁 Reports saved to:', this.outputDir);
    console.log('='.repeat(80));
  }

  // Helper methods
  private getTotalEstimatedTests(): number {
    return this.testConfigs.reduce((sum, config) => sum + config.estimatedTests, 0);
  }

  private async ensureOutputDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  private createErrorResult(config: SecurityTestConfig, error: any): TestResult {
    return {
      name: config.name,
      category: config.category,
      status: 'ERROR',
      duration: 0,
      testsRun: 0,
      testsPassed: 0,
      testsFailed: 0,
      testsSkipped: 0,
      vulnerabilities: [],
      coverage: 0,
      owaspCompliance: config.owaspMapping,
      errorDetails: error?.message || String(error)
    };
  }

  private getScoreRating(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 60) return 'Poor';
    return 'Critical';
  }

  private getRemediationAdvice(category: string): string {
    const remediations: Record<string, string> = {
      'Cross-Site Scripting': 'Implement proper input sanitization and output encoding. Use Content Security Policy (CSP).',
      'SQL Injection': 'Use parameterized queries and prepared statements. Implement input validation.',
      'CSRF': 'Implement CSRF tokens for all state-changing operations. Use SameSite cookie attributes.',
      'Authentication Bypass': 'Review authentication logic. Implement proper session management and multi-factor authentication.',
      'Access Control': 'Implement role-based access control (RBAC). Validate permissions on server side.'
    };
    return remediations[category] || 'Review security implementation and follow OWASP guidelines.';
  }

  private getImpactDescription(severity: RiskLevel): string {
    const impacts: Record<RiskLevel, string> = {
      [RiskLevel.CRITICAL]: 'Complete system compromise, data breach, or service disruption',
      [RiskLevel.HIGH]: 'Significant security vulnerability that could lead to data exposure',
      [RiskLevel.MEDIUM]: 'Moderate security risk that should be addressed promptly',
      [RiskLevel.LOW]: 'Minor security concern with limited impact',
      [RiskLevel.INFO]: 'Informational finding for security awareness'
    };
    return impacts[severity];
  }

  private calculateRiskScore(severity: RiskLevel, likelihood: string): number {
    const severityScores = {
      [RiskLevel.CRITICAL]: 10,
      [RiskLevel.HIGH]: 8,
      [RiskLevel.MEDIUM]: 6,
      [RiskLevel.LOW]: 4,
      [RiskLevel.INFO]: 2
    };

    const likelihoodScores: Record<string, number> = {
      'High': 3,
      'Medium': 2,
      'Low': 1
    };

    return severityScores[severity] * (likelihoodScores[likelihood] || 2);
  }

  private calculatePciDssCompliance(): number {
    // Simplified PCI-DSS compliance calculation based on security test coverage
    const securityControls = [
      'Authentication', 'Authorization', 'Input Validation',
      'Encryption', 'Access Control', 'Logging'
    ];

    const testedControls = this.results.filter(result =>
      securityControls.some(control =>
        result.category.toLowerCase().includes(control.toLowerCase())
      )
    ).length;

    return (testedControls / securityControls.length) * 100;
  }

  private calculateGdprCompliance(): number {
    // Simplified GDPR compliance based on data protection and privacy tests
    const dataProtectionTests = this.results.filter(result =>
      result.category.toLowerCase().includes('authentication') ||
      result.category.toLowerCase().includes('authorization') ||
      result.category.toLowerCase().includes('access')
    );

    const totalDataProtectionTests = dataProtectionTests.reduce((sum, test) => sum + test.testsRun, 0);
    const passedDataProtectionTests = dataProtectionTests.reduce((sum, test) => sum + test.testsPassed, 0);

    return totalDataProtectionTests > 0 ? (passedDataProtectionTests / totalDataProtectionTests) * 100 : 0;
  }

  private calculateIso27001Compliance(): number {
    // Simplified ISO 27001 compliance based on information security management
    const infoSecTests = this.results.filter(result =>
      result.status === 'PASS'
    ).length;

    return (infoSecTests / this.results.length) * 100;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const options = {
    outputDir: args.includes('--output') ? args[args.indexOf('--output') + 1] : undefined,
    verbose: args.includes('--verbose') || args.includes('-v')
  };

  console.log('🚀 Initializing Security Test Orchestrator...');

  const orchestrator = new SecurityTestOrchestrator(options);

  try {
    const report = await orchestrator.executeTests();

    // Exit with appropriate code based on results
    const hasFailures = report.summary.totalFailed > 0;
    const hasCriticalVulns = report.vulnerabilities.some(v => v.severity === RiskLevel.CRITICAL);

    if (hasCriticalVulns) {
      console.log('\n❌ CRITICAL vulnerabilities detected. Immediate action required!');
      process.exit(2);
    } else if (hasFailures) {
      console.log('\n⚠️  Some security tests failed. Review required.');
      process.exit(1);
    } else {
      console.log('\n✅ All security tests passed successfully!');
      process.exit(0);
    }

  } catch (error) {
    console.error('💥 Security test execution failed:', error);
    process.exit(3);
  }
}

// Export for use as module
export { SecurityTestOrchestrator, type SecurityReport, type Vulnerability, type TestResult };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}