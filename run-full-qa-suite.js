#!/usr/bin/env node

/**
 * Master QA Test Suite Orchestrator for FitnessMealPlanner
 * 
 * This script coordinates the execution of all test suites and generates
 * a comprehensive report for production readiness assessment.
 * 
 * Usage: node run-full-qa-suite.js
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:4000',
  timeout: 300000, // 5 minutes total timeout
  reportPath: './test-results/COMPREHENSIVE_QA_REPORT.md',
  screenshotDir: './test-screenshots/qa-comprehensive'
};

// Test suite results tracking
let masterResults = {
  testSuite: 'FitnessMealPlanner Comprehensive QA',
  branch: 'qa-ready',
  timestamp: new Date().toISOString(),
  environment: CONFIG.baseUrl,
  executionTime: 0,
  suites: {
    apiTests: { status: 'PENDING', passed: 0, failed: 0, total: 0, duration: 0 },
    databaseTests: { status: 'PENDING', passed: 0, failed: 0, total: 0, duration: 0 },
    e2eTests: { status: 'PENDING', passed: 0, failed: 0, total: 0, duration: 0 },
    unitTests: { status: 'PENDING', passed: 0, failed: 0, total: 0, duration: 0 }
  },
  summary: {
    totalTests: 0,
    totalPassed: 0,
    totalFailed: 0,
    overallPassRate: '0%',
    readyForProduction: false
  }
};

// Utility functions
const log = (message, level = 'INFO') => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
};

const createDirectories = () => {
  const dirs = [
    './test-results',
    './test-screenshots',
    CONFIG.screenshotDir
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

const checkPrerequisites = async () => {
  log('🔍 Checking prerequisites for full QA suite...');
  
  // Check Docker
  try {
    execSync('docker ps', { stdio: 'pipe' });
    log('✅ Docker is running');
  } catch (error) {
    log('❌ Docker is not running. Please start Docker and run: docker-compose --profile dev up -d', 'ERROR');
    return false;
  }
  
  // Check application accessibility
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(CONFIG.baseUrl);
    if (response.ok) {
      log('✅ Application is accessible at ' + CONFIG.baseUrl);
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    log('❌ Application is not accessible. Please ensure dev server is running', 'ERROR');
    return false;
  }
  
  // Check required dependencies
  const dependencies = ['node-fetch', 'pg'];
  try {
    dependencies.forEach(dep => {
      require.resolve(dep);
    });
    log('✅ All required dependencies available');
  } catch (error) {
    log('❌ Missing dependencies. Please run: npm install', 'ERROR');
    return false;
  }
  
  return true;
};

const runTestSuite = async (suiteName, command, description) => {
  log(`🧪 Running ${description}...`);
  const startTime = Date.now();
  
  try {
    const result = execSync(command, { 
      encoding: 'utf-8', 
      timeout: 120000, // 2 minutes per suite
      stdio: 'pipe'
    });
    
    const duration = Date.now() - startTime;
    log(`✅ ${description} completed in ${duration}ms`);
    
    // Try to parse results from the output or result files
    const suiteResults = await parseTestResults(suiteName);
    
    masterResults.suites[suiteName] = {
      status: 'COMPLETED',
      ...suiteResults,
      duration
    };
    
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    log(`❌ ${description} failed after ${duration}ms: ${error.message}`, 'ERROR');
    
    masterResults.suites[suiteName] = {
      status: 'FAILED',
      passed: 0,
      failed: 1,
      total: 1,
      duration,
      error: error.message
    };
    
    return false;
  }
};

const parseTestResults = async (suiteName) => {
  // Default results structure
  let results = { passed: 0, failed: 0, total: 0 };
  
  try {
    switch (suiteName) {
      case 'apiTests':
        if (fs.existsSync('./test-results/api-comprehensive-results.json')) {
          const apiResults = JSON.parse(fs.readFileSync('./test-results/api-comprehensive-results.json', 'utf8'));
          results.passed = apiResults.summary.passed;
          results.failed = apiResults.summary.failed;
          results.total = apiResults.summary.totalEndpoints;
        }
        break;
        
      case 'databaseTests':
        if (fs.existsSync('./test-results/database-integrity-results.json')) {
          const dbResults = JSON.parse(fs.readFileSync('./test-results/database-integrity-results.json', 'utf8'));
          results.passed = dbResults.summary.passed;
          results.failed = dbResults.summary.failed;
          results.total = dbResults.summary.totalTests;
        }
        break;
        
      case 'e2eTests':
        // Parse Playwright results if available
        if (fs.existsSync('./test-results.json')) {
          const e2eResults = JSON.parse(fs.readFileSync('./test-results.json', 'utf8'));
          if (e2eResults.suites) {
            results.total = e2eResults.suites.reduce((sum, suite) => sum + suite.specs.length, 0);
            results.passed = e2eResults.suites.reduce((sum, suite) => 
              sum + suite.specs.filter(spec => spec.ok).length, 0);
            results.failed = results.total - results.passed;
          }
        }
        break;
        
      case 'unitTests':
        // Parse Vitest results if available
        try {
          const vitestOutput = execSync('npm test -- --reporter=json', { encoding: 'utf-8', stdio: 'pipe' });
          const vitestResults = JSON.parse(vitestOutput.split('\\n').find(line => line.startsWith('{')));
          results.total = vitestResults.numTotalTests || 0;
          results.passed = vitestResults.numPassedTests || 0;
          results.failed = vitestResults.numFailedTests || 0;
        } catch (error) {
          // Fallback parsing
          results = { passed: 0, failed: 0, total: 0 };
        }
        break;
    }
  } catch (error) {
    log(`Warning: Could not parse results for ${suiteName}: ${error.message}`, 'WARN');
  }
  
  return results;
};

const runApiTests = async () => {
  return await runTestSuite('apiTests', 'node test-api-comprehensive.js', 'API Comprehensive Tests');
};

const runDatabaseTests = async () => {
  return await runTestSuite('databaseTests', 'node test-database-integrity.js', 'Database Integrity Tests');
};

const runE2ETests = async () => {
  // Run the comprehensive E2E test suite
  try {
    log('🧪 Running E2E Comprehensive Tests...');
    const startTime = Date.now();
    
    // Run Playwright tests
    execSync('npx playwright test test/e2e/qa-comprehensive-e2e.spec.ts --reporter=json', { 
      encoding: 'utf-8',
      timeout: 180000, // 3 minutes
      stdio: 'inherit'
    });
    
    const duration = Date.now() - startTime;
    
    // Parse results
    const results = await parseTestResults('e2eTests');
    
    masterResults.suites.e2eTests = {
      status: 'COMPLETED',
      ...results,
      duration
    };
    
    log(`✅ E2E Tests completed in ${duration}ms`);
    return true;
    
  } catch (error) {
    log(`❌ E2E Tests failed: ${error.message}`, 'ERROR');
    
    masterResults.suites.e2eTests = {
      status: 'FAILED',
      passed: 0,
      failed: 1,
      total: 1,
      duration: 0,
      error: error.message
    };
    
    return false;
  }
};

const runUnitTests = async () => {
  return await runTestSuite('unitTests', 'npm test', 'Unit Tests');
};

const calculateSummary = () => {
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  
  Object.values(masterResults.suites).forEach(suite => {
    totalTests += suite.total || 0;
    totalPassed += suite.passed || 0;
    totalFailed += suite.failed || 0;
  });
  
  masterResults.summary = {
    totalTests,
    totalPassed,
    totalFailed,
    overallPassRate: totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) + '%' : '0%',
    readyForProduction: totalFailed === 0 && totalTests > 0
  };
};

const generateComprehensiveReport = () => {
  calculateSummary();
  
  const report = `# 🧪 Comprehensive QA Test Report - FitnessMealPlanner

## 📋 Executive Summary

**Branch:** ${masterResults.branch}  
**Environment:** ${masterResults.environment}  
**Execution Date:** ${new Date(masterResults.timestamp).toLocaleString()}  
**Total Execution Time:** ${masterResults.executionTime}ms  

### 🎯 Overall Results
- **Total Tests:** ${masterResults.summary.totalTests}
- **Passed:** ${masterResults.summary.totalPassed} ✅
- **Failed:** ${masterResults.summary.totalFailed} ❌
- **Pass Rate:** ${masterResults.summary.overallPassRate}
- **Production Ready:** ${masterResults.summary.readyForProduction ? '✅ YES' : '❌ NO'}

---

## 📊 Test Suite Breakdown

### 🔌 API Tests
- **Status:** ${masterResults.suites.apiTests.status}
- **Results:** ${masterResults.suites.apiTests.passed}/${masterResults.suites.apiTests.total} passed
- **Duration:** ${masterResults.suites.apiTests.duration}ms
${masterResults.suites.apiTests.error ? `- **Error:** ${masterResults.suites.apiTests.error}` : ''}

### 🗄️ Database Integrity Tests
- **Status:** ${masterResults.suites.databaseTests.status}
- **Results:** ${masterResults.suites.databaseTests.passed}/${masterResults.suites.databaseTests.total} passed
- **Duration:** ${masterResults.suites.databaseTests.duration}ms
${masterResults.suites.databaseTests.error ? `- **Error:** ${masterResults.suites.databaseTests.error}` : ''}

### 🌐 End-to-End Tests
- **Status:** ${masterResults.suites.e2eTests.status}
- **Results:** ${masterResults.suites.e2eTests.passed}/${masterResults.suites.e2eTests.total} passed
- **Duration:** ${masterResults.suites.e2eTests.duration}ms
${masterResults.suites.e2eTests.error ? `- **Error:** ${masterResults.suites.e2eTests.error}` : ''}

### 🔧 Unit Tests
- **Status:** ${masterResults.suites.unitTests.status}
- **Results:** ${masterResults.suites.unitTests.passed}/${masterResults.suites.unitTests.total} passed
- **Duration:** ${masterResults.suites.unitTests.duration}ms
${masterResults.suites.unitTests.error ? `- **Error:** ${masterResults.suites.unitTests.error}` : ''}

---

## 📋 Production Readiness Checklist

${masterResults.summary.readyForProduction ? '### ✅ READY FOR PRODUCTION' : '### ❌ NOT READY FOR PRODUCTION'}

### Critical Requirements:
- ${masterResults.suites.apiTests.passed > 0 ? '✅' : '❌'} API endpoints functional
- ${masterResults.suites.databaseTests.passed > 0 ? '✅' : '❌'} Database integrity verified
- ${masterResults.suites.e2eTests.passed > 0 ? '✅' : '❌'} User journeys working
- ${masterResults.suites.unitTests.passed > 0 ? '✅' : '❌'} Unit tests passing

### Additional Considerations:
- Authentication & authorization working
- Recipe management system functional
- Meal plan generation operational
- PDF export capabilities verified
- Mobile responsiveness confirmed
- Health Protocol removal confirmed

---

## 📄 Detailed Test Reports

### Available Reports:
- **API Results:** \`./test-results/api-comprehensive-results.json\`
- **Database Results:** \`./test-results/database-integrity-results.json\`
- **E2E Results:** \`./test-results.json\` (Playwright)
- **Screenshots:** \`./test-screenshots/qa-comprehensive/\`

---

## 🔧 Recommendations

${masterResults.summary.readyForProduction ? 
  `### ✅ Deployment Approved
  
All critical tests are passing. The qa-ready branch is ready for merge to main and production deployment.

**Next Steps:**
1. Merge qa-ready → main
2. Deploy to production
3. Monitor application performance
4. Continue regular testing cycles` :
  `### ⚠️ Issues Requiring Attention

Before deploying to production, please address the following:

${Object.entries(masterResults.suites).map(([suite, results]) => 
  results.failed > 0 ? `- **${suite}:** ${results.failed} failed tests` : ''
).filter(Boolean).join('\\n')}

**Next Steps:**
1. Fix failing tests
2. Re-run QA suite
3. Verify all tests pass
4. Then proceed with deployment`
}

---

## 📞 Contact & Support

For questions about this QA report or test failures, please contact the development team.

**Generated by:** FitnessMealPlanner QA Test Suite  
**Report Date:** ${new Date().toISOString()}
`;

  // Save the comprehensive report
  createDirectories();
  fs.writeFileSync(CONFIG.reportPath, report);
  log(`📊 Comprehensive QA report saved to ${CONFIG.reportPath}`);
  
  // Also save JSON results
  const jsonPath = './test-results/master-qa-results.json';
  fs.writeFileSync(jsonPath, JSON.stringify(masterResults, null, 2));
  log(`💾 Master results saved to ${jsonPath}`);
};

const printFinalSummary = () => {
  log('');
  log('🎯 COMPREHENSIVE QA RESULTS SUMMARY');
  log('═══════════════════════════════════════');
  log(`📊 Total Tests: ${masterResults.summary.totalTests}`);
  log(`✅ Passed: ${masterResults.summary.totalPassed}`);
  log(`❌ Failed: ${masterResults.summary.totalFailed}`);
  log(`📈 Pass Rate: ${masterResults.summary.overallPassRate}`);
  log('');
  
  // Suite breakdown
  Object.entries(masterResults.suites).forEach(([suite, results]) => {
    const icon = results.status === 'COMPLETED' && results.failed === 0 ? '✅' : 
                 results.status === 'COMPLETED' ? '⚠️' : '❌';
    log(`${icon} ${suite}: ${results.passed}/${results.total} passed (${results.duration}ms)`);
  });
  
  log('');
  if (masterResults.summary.readyForProduction) {
    log('🎉 ALL TESTS PASSED! qa-ready branch is READY FOR PRODUCTION DEPLOYMENT.');
    log('🚀 Recommended actions:');
    log('   1. Merge qa-ready → main');
    log('   2. Deploy to production');
    log('   3. Monitor application performance');
  } else {
    log('⚠️  DEPLOYMENT NOT RECOMMENDED. Some tests failed.');
    log('🔧 Required actions:');
    log('   1. Review detailed test reports');
    log('   2. Fix failing tests');
    log('   3. Re-run QA suite');
    log('   4. Verify all tests pass before deployment');
  }
  
  log('');
  log(`📋 Detailed report: ${CONFIG.reportPath}`);
};

// Main execution
const main = async () => {
  const overallStartTime = Date.now();
  
  log('🚀 Starting Comprehensive QA Test Suite for FitnessMealPlanner');
  log('Branch: qa-ready → main (Production Readiness Assessment)');
  log('Environment: ' + CONFIG.baseUrl);
  log('');
  
  try {
    // Prerequisites check
    const prereqsOk = await checkPrerequisites();
    if (!prereqsOk) {
      throw new Error('Prerequisites not met');
    }
    
    // Create output directories
    createDirectories();
    
    // Run all test suites in sequence
    log('📋 Executing test suites in sequence...');
    
    // 1. Database integrity (foundational)
    await runDatabaseTests();
    
    // 2. API functionality (core backend)
    await runApiTests();
    
    // 3. Unit tests (component level)
    await runUnitTests();
    
    // 4. E2E tests (full user journeys)
    await runE2ETests();
    
    // Calculate execution time
    masterResults.executionTime = Date.now() - overallStartTime;
    
    // Generate comprehensive report
    generateComprehensiveReport();
    
    // Print final summary
    printFinalSummary();
    
    log('');
    log('🏁 Comprehensive QA Test Suite Completed');
    log(`⏱️  Total execution time: ${masterResults.executionTime}ms`);
    
    // Exit with appropriate code
    process.exit(masterResults.summary.readyForProduction ? 0 : 1);
    
  } catch (error) {
    log(`💥 QA test suite failed: ${error.message}`, 'ERROR');
    
    masterResults.executionTime = Date.now() - overallStartTime;
    generateComprehensiveReport();
    
    process.exit(1);
  }
};

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    log(`💥 Fatal error: ${error.message}`, 'ERROR');
    process.exit(1);
  });
}

export { main, CONFIG, masterResults };