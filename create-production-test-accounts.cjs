#!/usr/bin/env node

/**
 * Production Test Account Creation Script
 * 
 * This script creates test accounts in the production environment
 * after deployment is complete and database is accessible.
 * 
 * Usage: node create-production-test-accounts.js
 */

const https = require('https');
const fs = require('fs');

const PRODUCTION_URL = 'https://evofitmeals.com';
const MAX_RETRIES = 5;
const RETRY_DELAY = 10000; // 10 seconds

// Test account configurations
const TEST_ACCOUNTS = [
  {
    email: 'trainer.test@evofitmeals.com',
    password: 'TestTrainer123!',
    role: 'trainer',
    name: 'Test Trainer Account'
  },
  {
    email: 'customer.test@evofitmeals.com', 
    password: 'TestCustomer123!',
    role: 'customer',
    name: 'Test Customer Account'
  }
];

/**
 * Make HTTPS request with retry logic
 */
function makeRequest(options, data, retries = 0) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const responseData = JSON.parse(body);
          resolve({ statusCode: res.statusCode, data: responseData });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: { body } });
        }
      });
    });

    req.on('error', (err) => {
      if (retries < MAX_RETRIES) {
        console.log(`🔄 Request failed, retrying in ${RETRY_DELAY/1000}s... (${retries + 1}/${MAX_RETRIES})`);
        setTimeout(() => {
          makeRequest(options, data, retries + 1).then(resolve).catch(reject);
        }, RETRY_DELAY);
      } else {
        reject(err);
      }
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

/**
 * Create a test account via API
 */
async function createTestAccount(account) {
  const options = {
    hostname: 'evofitmeals.com',
    port: 443,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Production-Test-Account-Creator/1.0'
    },
    rejectUnauthorized: false // Skip SSL verification for now
  };

  try {
    console.log(`🚀 Creating ${account.name} (${account.email})...`);
    
    const response = await makeRequest(options, {
      email: account.email,
      password: account.password,
      role: account.role
    });

    if (response.statusCode === 201 || response.statusCode === 200) {
      console.log(`✅ ${account.name} created successfully!`);
      return { success: true, account, response: response.data };
    } else if (response.statusCode === 409 || (response.data.message && response.data.message.includes('already exists'))) {
      console.log(`ℹ️  ${account.name} already exists - this is expected for test accounts`);
      return { success: true, account, existing: true };
    } else {
      console.log(`❌ Failed to create ${account.name}:`);
      console.log(`   Status: ${response.statusCode}`);
      console.log(`   Response:`, response.data);
      return { success: false, account, error: response.data };
    }
  } catch (error) {
    console.log(`❌ Error creating ${account.name}:`, error.message);
    return { success: false, account, error: error.message };
  }
}

/**
 * Verify account can login
 */
async function verifyAccountLogin(account) {
  const options = {
    hostname: 'evofitmeals.com',
    port: 443,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Production-Test-Account-Creator/1.0'
    },
    rejectUnauthorized: false
  };

  try {
    console.log(`🔐 Verifying login for ${account.email}...`);
    
    const response = await makeRequest(options, {
      email: account.email,
      password: account.password
    });

    if (response.statusCode === 200 && response.data.token) {
      console.log(`✅ Login verification successful for ${account.email}`);
      return { success: true, account, token: response.data.token };
    } else {
      console.log(`❌ Login verification failed for ${account.email}:`);
      console.log(`   Status: ${response.statusCode}`);
      console.log(`   Response:`, response.data);
      return { success: false, account, error: response.data };
    }
  } catch (error) {
    console.log(`❌ Error verifying login for ${account.email}:`, error.message);
    return { success: false, account, error: error.message };
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🎯 Production Test Account Creation Script');
  console.log('=' .repeat(50));
  console.log(`📍 Target Environment: ${PRODUCTION_URL}`);
  console.log(`📊 Accounts to create: ${TEST_ACCOUNTS.length}`);
  console.log('');

  // Wait for deployment to stabilize
  console.log('⏳ Waiting for production deployment to stabilize...');
  await new Promise(resolve => setTimeout(resolve, 30000)); // 30 second delay

  const results = {
    created: [],
    existing: [],
    failed: [],
    verified: []
  };

  // Create test accounts
  console.log('🚀 Creating test accounts...');
  for (const account of TEST_ACCOUNTS) {
    const result = await createTestAccount(account);
    
    if (result.success) {
      if (result.existing) {
        results.existing.push(result);
      } else {
        results.created.push(result);
      }
    } else {
      results.failed.push(result);
    }
    
    // Small delay between account creations
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Verify account logins
  console.log('\n🔐 Verifying account logins...');
  for (const account of TEST_ACCOUNTS) {
    const loginResult = await verifyAccountLogin(account);
    
    if (loginResult.success) {
      results.verified.push(loginResult);
    }
    
    // Small delay between login attempts
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Generate report
  console.log('\n' + '='.repeat(50));
  console.log('📋 PRODUCTION TEST ACCOUNT SETUP REPORT');
  console.log('='.repeat(50));
  
  console.log(`✅ Accounts Created: ${results.created.length}`);
  results.created.forEach(r => console.log(`   - ${r.account.name} (${r.account.email})`));
  
  console.log(`ℹ️  Accounts Already Existing: ${results.existing.length}`);
  results.existing.forEach(r => console.log(`   - ${r.account.name} (${r.account.email})`));
  
  console.log(`❌ Failed Account Creations: ${results.failed.length}`);
  results.failed.forEach(r => console.log(`   - ${r.account.name} (${r.account.email}) - ${r.error.message || 'Unknown error'}`));
  
  console.log(`🔐 Login Verifications Successful: ${results.verified.length}`);
  results.verified.forEach(r => console.log(`   - ${r.account.email} ✅`));

  // Save detailed results
  const reportData = {
    timestamp: new Date().toISOString(),
    productionUrl: PRODUCTION_URL,
    results: results,
    summary: {
      totalAccounts: TEST_ACCOUNTS.length,
      created: results.created.length,
      existing: results.existing.length, 
      failed: results.failed.length,
      verified: results.verified.length,
      overallSuccess: (results.created.length + results.existing.length) === TEST_ACCOUNTS.length
    }
  };

  fs.writeFileSync('production-test-accounts-report.json', JSON.stringify(reportData, null, 2));
  console.log('\n📄 Detailed report saved to: production-test-accounts-report.json');

  // Final status
  const totalSuccessful = results.created.length + results.existing.length;
  if (totalSuccessful === TEST_ACCOUNTS.length && results.verified.length === TEST_ACCOUNTS.length) {
    console.log('\n🎉 SUCCESS: All test accounts are ready for use in production!');
    console.log('\n🔑 PRODUCTION TEST CREDENTIALS:');
    TEST_ACCOUNTS.forEach(account => {
      console.log(`   ${account.role.toUpperCase()}: ${account.email} / ${account.password}`);
    });
    console.log('\n🌐 Production URL: https://evofitmeals.com');
  } else {
    console.log('\n⚠️  PARTIAL SUCCESS: Some accounts may need manual creation');
    console.log('   Check the detailed report and try manual registration if needed.');
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Script execution failed:', error);
    process.exit(1);
  });
}

module.exports = { createTestAccount, verifyAccountLogin };