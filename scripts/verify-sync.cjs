/**
 * Environment Sync Verification Script
 * 
 * This script verifies that development and production environments
 * are properly synchronized with all features working correctly.
 */

const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

// Test endpoints
const tests = [
  {
    name: 'API Health Check',
    dev: 'http://localhost:4000/api/health',
    prod: 'https://evofitmeals.com/api/health',
    expected: 200
  },
  {
    name: 'Landing Page',
    dev: 'http://localhost:4000/landing/index.html',
    prod: 'https://evofitmeals.com/',
    expected: 200
  },
  {
    name: 'Features Page',
    dev: 'http://localhost:4000/features',
    prod: 'https://evofitmeals.com/features',
    expected: 200
  },
  {
    name: 'Login Page',
    dev: 'http://localhost:4000/login',
    prod: 'https://evofitmeals.com/login',
    expected: 200
  },
  {
    name: 'React Assets',
    dev: 'http://localhost:4000/assets/',
    prod: 'https://evofitmeals.com/assets/',
    expected: [200, 301, 404] // Could be directory listing or redirect
  }
];

// Feature checks
const featureChecks = [
  {
    name: 'CDN Images on Features Page',
    check: async () => {
      const content = await fetchContent('https://evofitmeals.com/features');
      const cdnCount = (content.match(/pti\.tor1\.digitaloceanspaces\.com/g) || []).length;
      return {
        success: cdnCount > 0,
        message: `Found ${cdnCount} CDN image references`
      };
    }
  },
  {
    name: 'Docker Containers Running',
    check: async () => {
      try {
        const output = execSync('docker ps --format "{{.Names}}" | grep fitnessmealplanner', { encoding: 'utf8' });
        const containers = output.trim().split('\n').filter(Boolean);
        return {
          success: containers.length >= 3,
          message: `${containers.length} containers running: ${containers.join(', ')}`
        };
      } catch (e) {
        return {
          success: false,
          message: 'Docker check failed'
        };
      }
    }
  },
  {
    name: 'Git Sync Status',
    check: async () => {
      try {
        const status = execSync('git status --porcelain', { encoding: 'utf8' });
        const behind = execSync('git rev-list HEAD..origin/main --count', { encoding: 'utf8' }).trim();
        const ahead = execSync('git rev-list origin/main..HEAD --count', { encoding: 'utf8' }).trim();
        
        return {
          success: status === '' && behind === '0' && ahead === '0',
          message: `Clean: ${status === ''}, Behind: ${behind}, Ahead: ${ahead}`
        };
      } catch (e) {
        return {
          success: false,
          message: 'Git check failed'
        };
      }
    }
  }
];

// Helper function to make HTTP requests
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const options = {
      rejectUnauthorized: false // For self-signed certs
    };
    
    client.get(url, options, (res) => {
      resolve({
        statusCode: res.statusCode,
        headers: res.headers
      });
    }).on('error', reject);
  });
}

// Helper to fetch content
function fetchContent(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const options = {
      rejectUnauthorized: false
    };
    
    client.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Run all tests
async function runTests() {
  console.log('🔍 ENVIRONMENT SYNC VERIFICATION\n');
  console.log('='.repeat(60));
  
  let allPassed = true;
  
  // Run endpoint tests
  console.log('\n📡 ENDPOINT TESTS:\n');
  for (const test of tests) {
    console.log(`Testing: ${test.name}`);
    
    try {
      // Test dev
      const devResult = await fetchUrl(test.dev);
      const devExpected = Array.isArray(test.expected) 
        ? test.expected.includes(devResult.statusCode)
        : devResult.statusCode === test.expected;
      
      console.log(`  DEV:  ${test.dev}`);
      console.log(`        Status: ${devResult.statusCode} ${devExpected ? '✅' : '❌'}`);
      
      // Test prod
      const prodResult = await fetchUrl(test.prod);
      const prodExpected = Array.isArray(test.expected)
        ? test.expected.includes(prodResult.statusCode)
        : prodResult.statusCode === test.expected;
      
      console.log(`  PROD: ${test.prod}`);
      console.log(`        Status: ${prodResult.statusCode} ${prodExpected ? '✅' : '❌'}`);
      
      if (!devExpected || !prodExpected) {
        allPassed = false;
      }
    } catch (error) {
      console.log(`  ERROR: ${error.message} ❌`);
      allPassed = false;
    }
    
    console.log();
  }
  
  // Run feature checks
  console.log('\n🎯 FEATURE CHECKS:\n');
  for (const check of featureChecks) {
    console.log(`Checking: ${check.name}`);
    
    try {
      const result = await check.check();
      console.log(`  ${result.success ? '✅' : '❌'} ${result.message}`);
      
      if (!result.success) {
        allPassed = false;
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      allPassed = false;
    }
    
    console.log();
  }
  
  // Summary
  console.log('='.repeat(60));
  console.log('\n📊 SUMMARY:\n');
  
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED - Environments are synchronized!');
  } else {
    console.log('❌ SOME TESTS FAILED - Environments may not be fully synchronized.');
    console.log('\n🔧 Recommended Actions:');
    console.log('1. Check failed endpoints for configuration issues');
    console.log('2. Ensure Docker containers are running properly');
    console.log('3. Verify latest code is deployed to production');
    console.log('4. Check production logs for errors');
  }
  
  // Get deployment info
  console.log('\n📦 DEPLOYMENT INFO:\n');
  try {
    const lastCommit = execSync('git log -1 --oneline', { encoding: 'utf8' }).trim();
    console.log(`Last Commit: ${lastCommit}`);
    
    const deployments = execSync('doctl apps list-deployments 600abc04-b784-426c-8799-0c09f8b9a958 2>/dev/null | head -2', { encoding: 'utf8', shell: true });
    console.log('\nRecent Deployments:');
    console.log(deployments);
  } catch (e) {
    console.log('Could not fetch deployment info');
  }
  
  process.exit(allPassed ? 0 : 1);
}

// Run the tests
runTests().catch(console.error);