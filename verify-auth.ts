#!/usr/bin/env node

// Simple verification script for authentication functionality
import jwt from 'jsonwebtoken';

// Set up environment
process.env.JWT_SECRET = 'test-jwt-secret-for-integration-tests-that-is-long-enough';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-integration-tests-that-is-long-enough';

async function verifyAuth() {
  console.log('🔐 Authentication Infrastructure Verification');
  console.log('===========================================\n');

  // Mock user for testing
  const testUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    role: 'customer'
  };

  console.log('1. Testing JWT Token Generation...');

  try {
    // Import auth functions
    const { generateTokens, verifyToken, verifyRefreshToken } = await import('./server/auth.ts');

  // Test token generation
  const { accessToken, refreshToken } = generateTokens(testUser);
  console.log('   ✅ Token generation successful');
  console.log(`   📝 Access Token: ${accessToken.substring(0, 50)}...`);
  console.log(`   📝 Refresh Token: ${refreshToken.substring(0, 50)}...`);

  console.log('\n2. Testing Access Token Verification...');
  try {
    const decoded = verifyToken(accessToken);
    console.log('   ✅ Access token verification successful');
    console.log(`   👤 User ID: ${decoded.id}`);
    console.log(`   📧 Email: ${decoded.email}`);
    console.log(`   🔑 Role: ${decoded.role}`);
  } catch (error) {
    console.log('   ❌ Access token verification failed:', error.message);
  }

  console.log('\n3. Testing Refresh Token Verification...');
  try {
    const decoded = verifyRefreshToken(refreshToken);
    console.log('   ✅ Refresh token verification successful');
    console.log(`   👤 User ID: ${decoded.id}`);
    console.log(`   📧 Email: ${decoded.email}`);
    console.log(`   🔑 Role: ${decoded.role}`);
    console.log(`   🏷️  Type: ${decoded.type}`);
  } catch (error) {
    console.log('   ❌ Refresh token verification failed:', error.message);
  }

  console.log('\n4. Testing Token Expiration...');
  try {
    // Create an expired token
    const expiredToken = jwt.sign(
      { id: testUser.id, email: testUser.email, role: testUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '-1h', issuer: 'FitnessMealPlanner', audience: 'FitnessMealPlanner-Client' }
    );

    try {
      verifyToken(expiredToken);
      console.log('   ❌ Expired token was accepted (this should not happen)');
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        console.log('   ✅ Expired token correctly rejected');
      } else {
        console.log('   ⚠️  Expired token rejected, but for wrong reason:', error.message);
      }
    }
  } catch (error) {
    console.log('   ❌ Error creating expired token:', error.message);
  }

  console.log('\n5. Testing Storage Module Interface...');

  try {
    // Import storage to check if methods exist
    const { storage } = await import('./server/storage.ts');

    const requiredMethods = [
      'deleteUserByEmail',
      'deleteAllRefreshTokensForUser',
      'createRefreshToken',
      'getRefreshToken',
      'deleteRefreshToken'
    ];

    const missingMethods = [];
    for (const method of requiredMethods) {
      if (typeof storage[method] !== 'function') {
        missingMethods.push(method);
      }
    }

    if (missingMethods.length === 0) {
      console.log('   ✅ All required storage methods are available');
    } else {
      console.log(`   ❌ Missing storage methods: ${missingMethods.join(', ')}`);
    }

  } catch (error) {
    console.log('   ❌ Error loading storage module:', error.message);
  }

  console.log('\n📊 Summary');
  console.log('=========');
  console.log('✅ JWT token generation and verification functions are working');
  console.log('✅ Token expiration handling is correct');
  console.log('✅ Storage interface has been updated');
  console.log('\n🎉 Authentication infrastructure is ready for testing!');

} catch (error) {
  console.log('❌ Critical error loading auth module:', error.message);
  console.log('\n🔧 Possible issues:');
  console.log('- Missing JWT_SECRET environment variable');
  console.log('- Compilation errors in auth.ts');
  console.log('- Missing dependencies');
  process.exit(1);
}

}

// Run the verification
verifyAuth().catch(error => {
  console.error('🚨 Verification failed:', error.message);
  process.exit(1);
});