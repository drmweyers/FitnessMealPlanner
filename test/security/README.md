# Security Test Orchestrator

A comprehensive security testing framework that executes 700+ security tests across multiple categories and generates detailed security compliance reports.

## Overview

The Security Test Orchestrator is a production-ready testing framework designed to validate the security posture of the FitnessMealPlanner application. It provides:

- **Comprehensive Coverage**: 700+ security tests across 8 major categories
- **OWASP Top 10 Compliance**: Full validation against OWASP 2021 standards
- **Multi-Format Reporting**: JSON, HTML, CSV, and text reports
- **Risk Assessment**: Automated vulnerability scoring and categorization
- **Compliance Metrics**: PCI-DSS, GDPR, and ISO 27001 compliance estimation
- **Executive Reporting**: Business-ready summaries and recommendations

## Security Test Categories

### Backend Security Tests (500+ tests)

1. **SQL Injection Tests** (85 tests)
   - Parameterized query validation
   - Input sanitization testing
   - Database access control verification
   - **OWASP Mapping**: A03:2021 (Injection)

2. **XSS Attack Tests** (105 tests)
   - Input validation and output encoding
   - Content Security Policy (CSP) testing
   - DOM-based XSS prevention
   - **OWASP Mapping**: A03:2021 (Injection), A05:2021 (Security Misconfiguration)

3. **Authentication Security** (120 tests)
   - Multi-factor authentication validation
   - Session management security
   - Password policy enforcement
   - **OWASP Mapping**: A01:2021 (Broken Access Control), A07:2021 (Identification and Authentication Failures)

4. **CSRF Protection Tests** (95 tests)
   - CSRF token validation
   - SameSite cookie attributes
   - State-changing operation protection
   - **OWASP Mapping**: A01:2021 (Broken Access Control), A08:2021 (Software and Data Integrity Failures)

5. **API Security Tests** (150 tests)
   - REST API authentication and authorization
   - Rate limiting and throttling
   - Input validation and error handling
   - **OWASP Mapping**: A01:2021, A03:2021, A05:2021

6. **File Upload Security** (75 tests)
   - File type validation
   - Malware scanning simulation
   - Path traversal prevention
   - **OWASP Mapping**: A03:2021 (Injection), A05:2021 (Security Misconfiguration)

### GUI Security Tests (200+ tests)

7. **Comprehensive GUI Security** (200+ tests)
   - Browser-based XSS testing
   - Authentication flow validation
   - Authorization UI component testing
   - Input validation through forms
   - **OWASP Mapping**: A01:2021, A03:2021, A07:2021

8. **Security Penetration Edge Cases** (150+ tests)
   - Advanced attack simulation
   - Edge case exploitation testing
   - Multi-vector attack scenarios
   - **OWASP Mapping**: A01:2021, A03:2021, A05:2021, A07:2021

## Usage

### Quick Start

```bash
# Run all security tests
npm run test:security

# Run with verbose output
npm run test:security:verbose

# Specify custom output directory
npm run test:security:output
```

### Advanced Usage

```bash
# Direct execution with options
tsx test/security/run-security-tests.ts --verbose --output /custom/path
```

### Command Line Options

- `--verbose` or `-v`: Enable detailed progress reporting
- `--output <directory>`: Specify custom output directory for reports

## Output Reports

The orchestrator generates multiple report formats:

### 1. JSON Report (`security-report-[timestamp].json`)
- Complete test results and metadata
- Machine-readable format for CI/CD integration
- Detailed vulnerability information

### 2. HTML Report (`security-report-[timestamp].html`)
- Interactive web-based dashboard
- Visual charts and graphs
- Executive summary with recommendations

### 3. CSV Report (`vulnerabilities-[timestamp].csv`)
- Vulnerability data in spreadsheet format
- Risk scoring and categorization
- Remediation tracking

### 4. Executive Summary (`executive-summary-[timestamp].txt`)
- Business-focused summary
- Key findings and recommendations
- Compliance status overview

## Security Metrics

### Security Score Calculation
```
Base Score = (Passed Tests / Total Tests) × 100
Final Score = Base Score - Vulnerability Deductions

Deductions:
- Critical Vulnerability: -20 points
- High Vulnerability: -10 points
- Medium Vulnerability: -5 points
```

### Risk Level Assessment
- **CRITICAL**: One or more critical vulnerabilities
- **HIGH**: 5+ high-severity vulnerabilities
- **MEDIUM**: 1+ high or 10+ medium vulnerabilities
- **LOW**: 1+ medium vulnerabilities
- **INFO**: No significant vulnerabilities

### Compliance Metrics

#### OWASP Top 10 2021 Coverage
- **A01:2021**: Broken Access Control
- **A02:2021**: Cryptographic Failures
- **A03:2021**: Injection
- **A04:2021**: Insecure Design
- **A05:2021**: Security Misconfiguration
- **A06:2021**: Vulnerable and Outdated Components
- **A07:2021**: Identification and Authentication Failures
- **A08:2021**: Software and Data Integrity Failures
- **A09:2021**: Security Logging and Monitoring Failures
- **A10:2021**: Server-Side Request Forgery (SSRF)

#### Additional Compliance Standards
- **PCI-DSS**: Payment Card Industry Data Security Standard
- **GDPR**: General Data Protection Regulation
- **ISO 27001**: Information Security Management

## Test Execution Flow

1. **Initialization**
   - Load test configurations
   - Validate dependencies
   - Create output directories

2. **Parallel Execution** (Backend Tests)
   - SQL Injection Tests
   - XSS Attack Tests
   - Authentication Security
   - CSRF Protection Tests
   - API Security Tests
   - File Upload Security

3. **Sequential Execution** (GUI Tests)
   - Comprehensive GUI Security
   - Security Penetration Edge Cases

4. **Analysis & Reporting**
   - Vulnerability extraction and categorization
   - Risk scoring and assessment
   - Compliance validation
   - Report generation

## Integration

### CI/CD Pipeline Integration

```yaml
# Example GitHub Actions workflow
- name: Security Testing
  run: |
    npm run test:security
    if [ $? -eq 2 ]; then
      echo "Critical vulnerabilities found!"
      exit 1
    fi
```

### Exit Codes
- `0`: All tests passed, no critical vulnerabilities
- `1`: Some tests failed, review required
- `2`: Critical vulnerabilities detected, immediate action required
- `3`: Test execution failed

## Configuration

### Test Categories Configuration

Each test category includes:
- **Estimated Test Count**: Expected number of tests
- **Timeout Settings**: Maximum execution time
- **Parallel Execution**: Whether tests can run concurrently
- **OWASP Mapping**: Related OWASP Top 10 categories
- **Dependencies**: Required frameworks (e.g., Playwright)

### Environment Variables

```bash
NODE_ENV=test          # Test environment
TEST_TIMEOUT=300000    # Default timeout (5 minutes)
SECURITY_OUTPUT_DIR=   # Custom output directory
```

## Troubleshooting

### Common Issues

1. **Test Timeouts**
   - Increase timeout values in configuration
   - Check system resources and network connectivity

2. **Missing Dependencies**
   - Ensure Playwright is installed: `npx playwright install`
   - Verify all test files exist

3. **Permission Issues**
   - Check write permissions for output directory
   - Verify test file access permissions

4. **High Memory Usage**
   - Run tests sequentially instead of parallel
   - Increase Node.js memory limit: `--max-old-space-size=4096`

### Debug Mode

Enable verbose logging for detailed execution information:

```bash
npm run test:security:verbose
```

## Security Best Practices

### Regular Testing Schedule
- **Daily**: Quick security smoke tests
- **Weekly**: Full security test suite
- **Monthly**: Comprehensive penetration testing
- **Quarterly**: Security compliance audit

### Vulnerability Management
1. **Critical**: Fix within 24 hours
2. **High**: Fix within 48 hours
3. **Medium**: Fix within 1 week
4. **Low**: Fix within 1 month

### Continuous Improvement
- Monitor security metrics trends
- Update test cases based on new threats
- Regular security training for development team
- Implement security-focused code reviews

## Architecture

### Core Components

1. **SecurityTestOrchestrator**: Main orchestration class
2. **TestResult**: Individual test execution results
3. **Vulnerability**: Security vulnerability data model
4. **SecurityReport**: Comprehensive report structure

### Dependencies

- **Vitest**: Backend test execution
- **Playwright**: GUI and E2E testing
- **Node.js**: Runtime environment
- **TypeScript**: Type safety and development

## Contributing

### Adding New Security Tests

1. Create test file in appropriate category directory
2. Update configuration in `run-security-tests.ts`
3. Add OWASP mapping and estimated test count
4. Document test coverage and methodology

### Extending Reports

1. Implement new report format in `generateReport` methods
2. Add CLI option for new format
3. Update documentation and examples

## Support

For issues and questions:
- Check troubleshooting section
- Review test logs for detailed error information
- Consult OWASP security testing guidelines
- Contact security team for critical vulnerabilities

---

**Security Testing Excellence**: Protecting your application through comprehensive, automated security validation.