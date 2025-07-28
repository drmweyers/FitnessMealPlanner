import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import puppeteer, { Browser, Page } from 'puppeteer';

describe('Customer Invitation Feature - API Test', () => {
  let browser: Browser;
  let page: Page;
  const testEmail = `testcustomer${Date.now()}@test.com`;

  beforeEach(async () => {
    browser = await puppeteer.launch({
      headless: process.env.CI === 'true',
      slowMo: 50,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
  });

  afterEach(async () => {
    await browser.close();
  });

  it('should verify invitation API endpoints are working (regression test)', async () => {
    console.log('🧪 Testing invitation API endpoints...');

    // Step 1: Create a trainer account via API
    console.log('📝 Step 1: Creating trainer account via API...');
    
    const trainerData = {
      email: `testtrainer${Date.now()}@test.com`,
      password: 'TestPass123@',
      role: 'trainer'
    };

    // Register trainer
    const registerResponse = await page.evaluate(async (data) => {
      const response = await fetch('http://localhost:4000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: await response.text()
      };
    }, trainerData);

    expect(registerResponse.status).toBe(201);
    
    // Parse response to get token
    const registerResult = JSON.parse(registerResponse.body);
    expect(registerResult.status).toBe('success');
    expect(registerResult.data.accessToken).toBeDefined();
    
    const token = registerResult.data.accessToken;
    console.log('✅ Trainer account created successfully');

    // Step 2: Test sending invitation
    console.log('📧 Step 2: Testing invitation send API...');
    
    const invitationData = { customerEmail: testEmail };
    
    const inviteResponse = await page.evaluate(async (data) => {
      const token = data.token;
      const invitationPayload = data.invitationData;
      
      const response = await fetch('http://localhost:4000/api/invitations/send', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(invitationPayload)
      });
      
      return {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: await response.text()
      };
    }, { token, invitationData });

    // Verify invitation was sent successfully
    expect(inviteResponse.status).toBe(201);
    
    const inviteResult = JSON.parse(inviteResponse.body);
    expect(inviteResult.status).toBe('success');
    expect(inviteResult.data.invitation.customerEmail).toBe(testEmail);
    expect(inviteResult.data.invitation.invitationLink).toContain('register?invitation=');
    
    console.log('✅ Invitation sent successfully');

    // Step 3: Test getting invitations list
    console.log('📋 Step 3: Testing invitations list API...');
    
    const listResponse = await page.evaluate(async (token) => {
      const response = await fetch('http://localhost:4000/api/invitations', {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      
      return {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: await response.text()
      };
    }, token);

    expect(listResponse.status).toBe(200);
    
    const listResult = JSON.parse(listResponse.body);
    expect(listResult.status).toBe('success');
    expect(listResult.data.invitations).toHaveLength(1);
    expect(listResult.data.invitations[0].customerEmail).toBe(testEmail);
    expect(listResult.data.invitations[0].status).toBe('pending');
    
    console.log('✅ Invitations list retrieved successfully');

    // Step 4: Verify we're getting JSON, not HTML (the original bug)
    console.log('🔍 Step 4: Verifying JSON response format...');
    
    // All responses should have JSON content-type
    expect(inviteResponse.headers['content-type']).toContain('application/json');
    expect(listResponse.headers['content-type']).toContain('application/json');
    
    // Responses should not contain HTML
    expect(inviteResponse.body).not.toContain('<!DOCTYPE html>');
    expect(listResponse.body).not.toContain('<!DOCTYPE html>');
    expect(inviteResponse.body).not.toContain('<html');
    expect(listResponse.body).not.toContain('<html');
    
    console.log('✅ All responses are proper JSON (no HTML returned)');
    console.log('🎉 Customer invitation API test completed successfully!');
  });

  it('should handle duplicate invitation correctly', async () => {
    console.log('🧪 Testing duplicate invitation handling...');

    const duplicateEmail = `duplicate${Date.now()}@test.com`;
    
    // Create trainer
    const trainerData = {
      email: `trainer${Date.now()}@test.com`,
      password: 'TestPass123@',
      role: 'trainer'
    };

    const registerResponse = await page.evaluate(async (data) => {
      const response = await fetch('http://localhost:4000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return response.json();
    }, trainerData);

    const token = registerResponse.data.accessToken;

    // Send first invitation
    const firstInvite = await page.evaluate(async (data) => {
      const response = await fetch('http://localhost:4000/api/invitations/send', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${data.token}`
        },
        body: JSON.stringify({ customerEmail: data.email })
      });
      return { status: response.status, body: await response.json() };
    }, { token, email: duplicateEmail });

    expect(firstInvite.status).toBe(201);
    expect(firstInvite.body.status).toBe('success');

    // Try to send duplicate invitation
    const duplicateInvite = await page.evaluate(async (data) => {
      const response = await fetch('http://localhost:4000/api/invitations/send', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${data.token}`
        },
        body: JSON.stringify({ customerEmail: data.email })
      });
      return { status: response.status, body: await response.json() };
    }, { token, email: duplicateEmail });

    expect(duplicateInvite.status).toBe(409);
    expect(duplicateInvite.body.status).toBe('error');
    expect(duplicateInvite.body.code).toBe('INVITATION_PENDING');

    console.log('✅ Duplicate invitation handling works correctly');
  });

  it('should require authentication for invitation endpoints', async () => {
    console.log('🧪 Testing authentication requirements...');

    // Try to send invitation without token
    const unauthorizedResponse = await page.evaluate(async () => {
      const response = await fetch('http://localhost:4000/api/invitations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerEmail: 'test@test.com' })
      });
      return { status: response.status, body: await response.text() };
    });

    expect(unauthorizedResponse.status).toBe(401);
    
    // Try to list invitations without token
    const unauthorizedListResponse = await page.evaluate(async () => {
      const response = await fetch('http://localhost:4000/api/invitations', {
        method: 'GET'
      });
      return { status: response.status, body: await response.text() };
    });

    expect(unauthorizedListResponse.status).toBe(401);

    console.log('✅ Authentication requirements working correctly');
  });
});