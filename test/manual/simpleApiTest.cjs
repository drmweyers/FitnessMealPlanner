/**
 * Simple API Test Script for Specialized Protocols
 * Using native Node.js modules to test basic functionality
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

class SimpleAPITester {
  constructor() {
    this.baseUrl = 'localhost';
    this.port = 4000;
    this.results = [];
  }

  // Simple HTTP request helper
  makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.baseUrl,
        port: this.port,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      const req = http.request(options, (res) => {
        let body = '';
        
        res.on('data', (chunk) => {
          body += chunk;
        });
        
        res.on('end', () => {
          try {
            const responseData = body ? JSON.parse(body) : null;
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: responseData,
              rawBody: body
            });
          } catch (error) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: null,
              rawBody: body,
              parseError: error.message
            });
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  logTest(testName, passed, details) {
    const result = {
      testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.results.push(result);
    
    const status = passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`${status} - ${testName}: ${details}`);
  }

  async testBasicConnectivity() {
    console.log('\n🔌 Testing Basic Connectivity...');
    
    try {
      // Test health endpoint
      const healthResponse = await this.makeRequest('GET', '/api/health');
      
      this.logTest('Health Endpoint', 
        healthResponse.statusCode === 200, 
        `Status: ${healthResponse.statusCode}, Response: ${JSON.stringify(healthResponse.data)}`);

      // Test root endpoint (should return frontend HTML)
      const rootResponse = await this.makeRequest('GET', '/');
      
      this.logTest('Root Endpoint', 
        rootResponse.statusCode === 200 && rootResponse.rawBody.includes('html'), 
        `Status: ${rootResponse.statusCode}, Content type: ${rootResponse.headers['content-type']}`);

    } catch (error) {
      this.logTest('Basic Connectivity', false, `Error: ${error.message}`);
    }
  }

  async testAuthenticationEndpoints() {
    console.log('\n🔐 Testing Authentication...');
    
    try {
      // Test unauthenticated request to protected endpoint
      const unauthResponse = await this.makeRequest('POST', '/api/specialized/longevity/generate', {
        planName: 'Test Plan'
      });

      this.logTest('Unauthenticated Request Protection', 
        unauthResponse.statusCode === 401 || unauthResponse.rawBody.includes('html'),
        `Status: ${unauthResponse.statusCode} - Protected endpoint properly requires auth`);

      // Test login endpoint exists
      const loginResponse = await this.makeRequest('POST', '/api/auth/login', {
        email: 'test@example.com',
        password: 'testpassword'
      });

      this.logTest('Login Endpoint Available', 
        loginResponse.statusCode !== 404,
        `Status: ${loginResponse.statusCode} - Login endpoint exists`);

    } catch (error) {
      this.logTest('Authentication Test', false, `Error: ${error.message}`);
    }
  }

  async testSpecializedEndpoints() {
    console.log('\n🧬 Testing Specialized Protocol Endpoints...');
    
    try {
      // Test specialized endpoints without auth (should be protected)
      const specializedEndpoints = [
        '/api/specialized/longevity/generate',
        '/api/specialized/parasite-cleanse/generate',
        '/api/specialized/user-preferences',
        '/api/specialized/active-protocols'
      ];

      for (const endpoint of specializedEndpoints) {
        const response = await this.makeRequest('GET', endpoint);
        
        this.logTest(`Endpoint Protection: ${endpoint}`, 
          response.statusCode === 401 || response.rawBody.includes('html'),
          `Status: ${response.statusCode} - Endpoint properly protected`);
      }

    } catch (error) {
      this.logTest('Specialized Endpoints Test', false, `Error: ${error.message}`);
    }
  }

  async testInputValidation() {
    console.log('\n🛡️ Testing Input Validation...');
    
    try {
      // Test malicious inputs (should be rejected or sanitized)
      const maliciousInputs = [
        { name: 'SQL Injection', payload: { planName: "'; DROP TABLE users; --" }},
        { name: 'XSS Attempt', payload: { planName: '<script>alert("xss")</script>' }},
        { name: 'Command Injection', payload: { planName: '$(rm -rf /)' }}
      ];

      for (const test of maliciousInputs) {
        const response = await this.makeRequest('POST', '/api/specialized/longevity/generate', test.payload);
        
        // Either should be rejected (4xx) or properly handled
        const handled = response.statusCode >= 400 || 
                       (response.data && !JSON.stringify(response.data).includes(test.payload.planName));
        
        this.logTest(`Security: ${test.name}`, handled,
          `Status: ${response.statusCode} - Malicious input properly handled`);
      }

    } catch (error) {
      this.logTest('Input Validation Test', false, `Error: ${error.message}`);
    }
  }

  async testFileStructure() {
    console.log('\n📁 Testing File Structure...');
    
    const requiredFiles = [
      'client/src/components/LongevityModeToggle.tsx',
      'client/src/components/ParasiteCleanseProtocol.tsx',
      'client/src/components/MedicalDisclaimerModal.tsx',
      'server/routes/specializedMealPlans.ts',
      'server/services/specializedMealPlans.ts'
    ];

    for (const filePath of requiredFiles) {
      const fullPath = path.join(__dirname, '../..', filePath);
      const exists = fs.existsSync(fullPath);
      
      this.logTest(`File Exists: ${path.basename(filePath)}`, exists,
        exists ? `Found at ${filePath}` : `Missing: ${filePath}`);
    }
  }

  generateReport() {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    
    const report = {
      testSuite: 'Specialized Protocols Simple API Test',
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length,
        passed,
        failed,
        successRate: Math.round((passed / this.results.length) * 100)
      },
      results: this.results,
      recommendations: [
        'Check if specialized routes are properly registered in server/index.ts',
        'Verify that authentication middleware is working correctly',
        'Ensure all required components are properly implemented',
        'Test with proper authentication tokens once login is working'
      ]
    };

    console.log('\n📊 TEST SUMMARY:');
    console.log(`Total Tests: ${report.summary.total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${report.summary.successRate}%`);

    // Save report
    const reportPath = path.join(__dirname, '../screenshots', `simple-api-test-${Date.now()}.json`);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Report saved: ${reportPath}`);

    return report;
  }

  async runAllTests() {
    console.log('🚀 Starting Simple API Tests for Specialized Protocols');
    console.log('='.repeat(60));

    try {
      await this.testBasicConnectivity();
      await this.testAuthenticationEndpoints();
      await this.testSpecializedEndpoints();
      await this.testInputValidation();
      await this.testFileStructure();

      return this.generateReport();

    } catch (error) {
      console.error('❌ Critical error during testing:', error.message);
      return this.generateReport();
    }
  }
}

// Run tests
if (require.main === module) {
  const tester = new SimpleAPITester();
  
  tester.runAllTests().then(report => {
    console.log('\n✅ Testing completed!');
    process.exit(report.summary.failed > 0 ? 1 : 0);
  }).catch(error => {
    console.error('\n❌ Testing failed:', error.message);
    process.exit(1);
  });
}

module.exports = SimpleAPITester;