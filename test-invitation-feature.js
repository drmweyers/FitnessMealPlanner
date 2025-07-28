#!/usr/bin/env node

/**
 * Simple test script to verify the customer invitation feature is working
 * 
 * This script tests the fix for the "unexpected token Doc Type is not a valid JSON" error
 * by directly calling the APIs and verifying they return proper JSON responses.
 */

const testInvitationFeature = async () => {
  console.log('🧪 Testing Customer Invitation Feature...\n');
  
  const baseUrl = 'http://localhost:4000';
  const testEmail = `testcustomer${Date.now()}@test.com`;
  const trainerEmail = `testtrainer${Date.now()}@test.com`;
  
  try {
    // Step 1: Check application health
    console.log('🔍 Step 1: Checking application health...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    if (!healthResponse.ok) {
      throw new Error(`Health check failed: ${healthResponse.status}`);
    }
    console.log('✅ Application is healthy\n');

    // Step 2: Register a trainer account
    console.log('👤 Step 2: Registering trainer account...');
    const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: trainerEmail,
        password: 'TestPass123@',
        role: 'trainer'
      })
    });

    if (!registerResponse.ok) {
      const errorText = await registerResponse.text();
      throw new Error(`Registration failed: ${registerResponse.status} - ${errorText}`);
    }

    const registerData = await registerResponse.json();
    if (registerData.status !== 'success') {
      throw new Error(`Registration failed: ${registerData.message}`);
    }

    const token = registerData.data.accessToken;
    console.log('✅ Trainer account registered successfully\n');

    // Step 3: Test sending invitation (this was the broken functionality)
    console.log('📧 Step 3: Testing invitation send API...');
    const inviteResponse = await fetch(`${baseUrl}/api/invitations/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        customerEmail: testEmail,
        message: 'Welcome to FitMeal Pro!'
      })
    });

    // Check the content-type header (the main fix verification)
    const contentType = inviteResponse.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Expected JSON response, got: ${contentType}`);
    }

    const inviteResponseText = await inviteResponse.text();
    
    // Verify we're not getting HTML (the original bug)
    if (inviteResponseText.includes('<!DOCTYPE html>') || inviteResponseText.includes('<html')) {
      throw new Error('❌ CRITICAL: Still receiving HTML instead of JSON! The fix did not work.');
    }

    if (!inviteResponse.ok) {
      throw new Error(`Invitation send failed: ${inviteResponse.status} - ${inviteResponseText}`);
    }

    const inviteData = JSON.parse(inviteResponseText);
    if (inviteData.status !== 'success') {
      throw new Error(`Invitation send failed: ${inviteData.message}`);
    }

    console.log('✅ Invitation sent successfully');
    console.log(`   Customer Email: ${inviteData.data.invitation.customerEmail}`);
    console.log(`   Invitation ID: ${inviteData.data.invitation.id}`);
    console.log(`   Expires At: ${inviteData.data.invitation.expiresAt}\n`);

    // Step 4: Test getting invitations list
    console.log('📋 Step 4: Testing invitations list API...');
    const listResponse = await fetch(`${baseUrl}/api/invitations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const listContentType = listResponse.headers.get('content-type');
    if (!listContentType || !listContentType.includes('application/json')) {
      throw new Error(`Expected JSON response, got: ${listContentType}`);
    }

    const listResponseText = await listResponse.text();
    
    // Verify we're not getting HTML
    if (listResponseText.includes('<!DOCTYPE html>') || listResponseText.includes('<html')) {
      throw new Error('❌ CRITICAL: Still receiving HTML instead of JSON! The fix did not work.');
    }

    if (!listResponse.ok) {
      throw new Error(`Invitations list failed: ${listResponse.status} - ${listResponseText}`);
    }

    const listData = JSON.parse(listResponseText);
    if (listData.status !== 'success') {
      throw new Error(`Invitations list failed: ${listData.message}`);
    }

    const invitations = listData.data.invitations;
    const sentInvitation = invitations.find(inv => inv.customerEmail === testEmail);
    
    if (!sentInvitation) {
      throw new Error('Sent invitation not found in invitations list');
    }

    console.log('✅ Invitations list retrieved successfully');
    console.log(`   Found ${invitations.length} invitation(s)`);
    console.log(`   Test invitation status: ${sentInvitation.status}\n`);

    // Step 5: Test duplicate invitation handling
    console.log('🔄 Step 5: Testing duplicate invitation handling...');
    const duplicateResponse = await fetch(`${baseUrl}/api/invitations/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        customerEmail: testEmail
      })
    });

    const duplicateResponseText = await duplicateResponse.text();
    const duplicateData = JSON.parse(duplicateResponseText);

    if (duplicateResponse.status !== 409) {
      throw new Error(`Expected 409 status for duplicate invitation, got: ${duplicateResponse.status}`);
    }

    if (duplicateData.code !== 'INVITATION_PENDING') {
      throw new Error(`Expected INVITATION_PENDING error code, got: ${duplicateData.code}`);
    }

    console.log('✅ Duplicate invitation handling works correctly\n');

    // Step 6: Test authentication requirement
    console.log('🔒 Step 6: Testing authentication requirements...');
    const unauthorizedResponse = await fetch(`${baseUrl}/api/invitations/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerEmail: 'test@test.com' })
    });

    if (unauthorizedResponse.status !== 401) {
      throw new Error(`Expected 401 status for unauthorized request, got: ${unauthorizedResponse.status}`);
    }

    console.log('✅ Authentication requirements working correctly\n');

    // Summary
    console.log('🎉 ALL TESTS PASSED! 🎉\n');
    console.log('✅ Key Verifications:');
    console.log('   • API endpoints return proper JSON (not HTML)');
    console.log('   • Customer invitation sending works');
    console.log('   • Invitation listing works');
    console.log('   • Duplicate invitation prevention works');
    console.log('   • Authentication requirements enforced');
    console.log('   • "unexpected token Doc Type is not a valid JSON" error FIXED');
    console.log('\n🔧 The invitation feature is working correctly!');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\n🔍 Possible Issues:');
    console.error('   • Make sure the application is running: docker-compose --profile dev up');
    console.error('   • Check if the invitation routes are properly registered');
    console.error('   • Verify the server is accessible at http://localhost:4000');
    process.exit(1);
  }
};

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testInvitationFeature();
}