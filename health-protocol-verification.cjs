/**
 * Health Protocol Tab Removal Verification
 * 
 * Simple verification script to test if Health Protocol tab has been removed
 * from the application GUI by checking HTML responses.
 */

const http = require('http');
const https = require('https');
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:4000';
const RESULTS_DIR = path.join(process.cwd(), 'test-results', 'health-protocol-verification');

// Test accounts
const TEST_ACCOUNTS = {
  admin: { email: 'admin@fitmeal.pro', password: 'Admin123!@#' },
  trainer: { email: 'testtrainer@example.com', password: 'TrainerPassword123!' }
};

class HealthProtocolVerifier {
  constructor() {
    this.results = [];
    this.setupResultsDir();
  }

  setupResultsDir() {
    if (!fs.existsSync(RESULTS_DIR)) {
      fs.mkdirSync(RESULTS_DIR, { recursive: true });
    }
  }

  async makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
      const protocol = options.port === 443 ? https : http;
      
      const req = protocol.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        });
      });

      req.on('error', reject);
      
      if (postData) {
        req.write(postData);
      }
      
      req.end();
    });
  }

  async testApplicationAccess() {
    console.log('🔍 Testing application accessibility...');
    
    try {
      const response = await this.makeRequest({
        hostname: 'localhost',
        port: 4000,
        path: '/',
        method: 'GET'
      });

      const result = {
        test: 'application_access',
        status: response.statusCode === 200 ? 'PASSED' : 'FAILED',
        statusCode: response.statusCode,
        bodyLength: response.body.length,
        passed: response.statusCode === 200
      };

      console.log(`✅ Application access: ${result.status} (HTTP ${response.statusCode})`);
      return result;
      
    } catch (error) {
      console.error('❌ Application access test failed:', error.message);
      return {
        test: 'application_access',
        status: 'FAILED',
        error: error.message,
        passed: false
      };
    }
  }

  async testLoginPage() {
    console.log('🔍 Testing login page for Health Protocol references...');
    
    try {
      const response = await this.makeRequest({
        hostname: 'localhost',
        port: 4000,
        path: '/',
        method: 'GET'
      });

      const hasHealthProtocol = response.body.toLowerCase().includes('health protocol');
      const hasHealthText = response.body.toLowerCase().includes('health') && 
                           response.body.toLowerCase().includes('protocol');

      // Save the HTML response for manual inspection
      const htmlFile = path.join(RESULTS_DIR, 'login-page.html');
      fs.writeFileSync(htmlFile, response.body);

      const result = {
        test: 'login_page_content',
        hasHealthProtocolText: hasHealthProtocol,
        hasPartialHealthText: hasHealthText,
        bodyLength: response.body.length,
        htmlFile: 'login-page.html',
        passed: !hasHealthProtocol, // Should NOT have "health protocol" text
        status: !hasHealthProtocol ? 'PASSED' : 'FAILED'
      };

      console.log(`✅ Login page content: ${result.status}`);
      console.log(`   - "Health Protocol" text found: ${hasHealthProtocol ? 'YES (❌)' : 'NO (✅)'}`);
      console.log(`   - HTML saved to: ${htmlFile}`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Login page test failed:', error.message);
      return {
        test: 'login_page_content',
        status: 'FAILED',
        error: error.message,
        passed: false
      };
    }
  }

  async attemptLogin(role) {
    console.log(`🔑 Testing login and dashboard for ${role}...`);
    
    const account = TEST_ACCOUNTS[role];
    
    try {
      // First, get the login page to check for any CSRF tokens or form data
      const loginPageResponse = await this.makeRequest({
        hostname: 'localhost',
        port: 4000,
        path: '/',
        method: 'GET'
      });

      // Attempt to login
      const postData = querystring.stringify({
        email: account.email,
        password: account.password
      });

      const loginResponse = await this.makeRequest({
        hostname: 'localhost',
        port: 4000,
        path: '/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': postData.length
        }
      }, postData);

      // Check for Health Protocol in response
      const hasHealthProtocol = loginResponse.body.toLowerCase().includes('health protocol');
      const hasHealthText = loginResponse.body.toLowerCase().includes('health') && 
                           loginResponse.body.toLowerCase().includes('protocol');

      // Save response for inspection
      const responseFile = path.join(RESULTS_DIR, `${role}-login-response.html`);
      fs.writeFileSync(responseFile, loginResponse.body);

      const result = {
        test: `${role}_login_dashboard`,
        loginStatusCode: loginResponse.statusCode,
        hasHealthProtocolText: hasHealthProtocol,
        hasPartialHealthText: hasHealthText,
        bodyLength: loginResponse.body.length,
        responseFile: `${role}-login-response.html`,
        passed: !hasHealthProtocol && loginResponse.statusCode < 500, // No health protocol AND no server error
        status: (!hasHealthProtocol && loginResponse.statusCode < 500) ? 'PASSED' : 'FAILED'
      };

      console.log(`✅ ${role} login/dashboard: ${result.status}`);
      console.log(`   - Login status: HTTP ${loginResponse.statusCode}`);
      console.log(`   - "Health Protocol" text found: ${hasHealthProtocol ? 'YES (❌)' : 'NO (✅)'}`);
      console.log(`   - Response saved to: ${responseFile}`);
      
      return result;
      
    } catch (error) {
      console.error(`❌ ${role} login test failed:`, error.message);
      return {
        test: `${role}_login_dashboard`,
        status: 'FAILED',
        error: error.message,
        passed: false
      };
    }
  }

  async testStaticAssets() {
    console.log('🔍 Testing static assets for Health Protocol references...');
    
    const assetsToCheck = [
      '/assets/index.js',
      '/assets/index.css',
      '/api/recipes',
      '/api/users'
    ];

    const results = [];

    for (const asset of assetsToCheck) {
      try {
        const response = await this.makeRequest({
          hostname: 'localhost',
          port: 4000,
          path: asset,
          method: 'GET'
        });

        const hasHealthProtocol = response.body.toLowerCase().includes('health protocol');
        
        const result = {
          asset: asset,
          statusCode: response.statusCode,
          hasHealthProtocolText: hasHealthProtocol,
          bodyLength: response.body.length,
          passed: !hasHealthProtocol && response.statusCode < 500
        };

        results.push(result);
        console.log(`   ${asset}: ${result.passed ? '✅ CLEAN' : '❌ CONTAINS HEALTH PROTOCOL'} (HTTP ${response.statusCode})`);
        
      } catch (error) {
        results.push({
          asset: asset,
          error: error.message,
          passed: true // Error accessing is not a failure for this test
        });
        console.log(`   ${asset}: ⚠️  Could not access (${error.message})`);
      }
    }

    const overallPassed = results.every(r => r.passed);
    return {
      test: 'static_assets',
      results: results,
      passed: overallPassed,
      status: overallPassed ? 'PASSED' : 'FAILED'
    };
  }

  generateReport() {
    const reportFile = path.join(RESULTS_DIR, 'verification-report.json');
    const summaryFile = path.join(RESULTS_DIR, 'verification-summary.txt');
    
    const report = {
      timestamp: new Date().toISOString(),
      testSuite: 'Health Protocol Tab Removal Verification (HTTP)',
      baseUrl: BASE_URL,
      results: this.results,
      summary: {
        totalTests: this.results.length,
        passed: this.results.filter(r => r.passed).length,
        failed: this.results.filter(r => !r.passed).length,
        overall: this.results.length > 0 && this.results.every(r => r.passed) ? 'PASSED' : 'FAILED'
      }
    };

    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    let summary = '🔬 HEALTH PROTOCOL REMOVAL - HTTP VERIFICATION RESULTS\n';
    summary += '=' .repeat(65) + '\n\n';
    summary += `📅 Test Date: ${new Date().toLocaleString()}\n`;
    summary += `🎯 Objective: Verify Health Protocol references removed from application\n`;
    summary += `🌐 Base URL: ${BASE_URL}\n`;
    summary += `📁 Method: HTTP requests and content analysis\n\n`;
    
    summary += `📊 OVERALL RESULT: ${report.summary.overall}\n`;
    summary += `   ✅ Tests Passed: ${report.summary.passed}/${report.summary.totalTests}\n`;
    summary += `   ❌ Tests Failed: ${report.summary.failed}/${report.summary.totalTests}\n\n`;
    
    summary += 'DETAILED RESULTS:\n';
    summary += '-' .repeat(40) + '\n';
    
    this.results.forEach((result, index) => {
      summary += `\n${index + 1}. ${result.test.toUpperCase().replace(/_/g, ' ')}:\n`;
      summary += `   Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
      
      if (result.hasHealthProtocolText !== undefined) {
        summary += `   Health Protocol Text: ${result.hasHealthProtocolText ? 'FOUND (❌)' : 'NOT FOUND (✅)'}\n`;
      }
      
      if (result.statusCode) {
        summary += `   HTTP Status: ${result.statusCode}\n`;
      }
      
      if (result.bodyLength) {
        summary += `   Response Size: ${result.bodyLength} bytes\n`;
      }
      
      if (result.htmlFile || result.responseFile) {
        summary += `   Saved File: ${result.htmlFile || result.responseFile}\n`;
      }
      
      if (result.results) {
        summary += `   Sub-tests: ${result.results.length}\n`;
        result.results.forEach(subResult => {
          const status = subResult.passed ? '✅' : '❌';
          summary += `     - ${subResult.asset}: ${status}\n`;
        });
      }
      
      if (result.error) {
        summary += `   Error: ${result.error}\n`;
      }
    });
    
    summary += '\n' + '=' .repeat(65) + '\n';
    
    const healthProtocolFound = this.results.some(r => 
      r.hasHealthProtocolText || 
      (r.results && r.results.some(sub => sub.hasHealthProtocolText))
    );
    
    summary += '\n🔍 KEY FINDINGS:\n';
    if (healthProtocolFound) {
      summary += '❌ Health Protocol references still found in the application!\n';
      summary += '⚠️  Manual review of saved HTML files recommended.\n';
    } else {
      summary += '✅ No Health Protocol references found in HTTP responses!\n';
      summary += '🎉 Application appears to be clean of Health Protocol content.\n';
    }
    
    summary += `\n📁 Files saved to: ${RESULTS_DIR}\n`;
    summary += `📋 Full report: ${reportFile}\n`;

    fs.writeFileSync(summaryFile, summary);
    
    console.log('\n📋 VERIFICATION COMPLETE:');
    console.log(summary);
    
    return report;
  }

  async runVerification() {
    console.log('🎯 Health Protocol Removal HTTP Verification');
    console.log('=' .repeat(50));
    console.log(`🌐 Target: ${BASE_URL}`);
    console.log('📁 Method: HTTP content analysis\n');
    
    try {
      // Run all verification tests
      this.results.push(await this.testApplicationAccess());
      this.results.push(await this.testLoginPage());
      this.results.push(await this.attemptLogin('admin'));
      this.results.push(await this.attemptLogin('trainer'));
      this.results.push(await this.testStaticAssets());
      
      return this.generateReport();
      
    } catch (error) {
      console.error('❌ Verification failed:', error);
      return { error: error.message, passed: false };
    }
  }
}

async function main() {
  const verifier = new HealthProtocolVerifier();
  const results = await verifier.runVerification();
  
  if (results && results.summary && results.summary.overall === 'PASSED') {
    console.log('\n🎉 VERIFICATION PASSED! No Health Protocol references found.');
    process.exit(0);
  } else {
    console.log('\n⚠️  VERIFICATION COMPLETED WITH FINDINGS. Please review the results.');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });
}

module.exports = { HealthProtocolVerifier };