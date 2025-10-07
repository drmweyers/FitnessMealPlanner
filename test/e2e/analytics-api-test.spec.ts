/**
 * Analytics API Direct Test
 * Test the analytics API directly without UI
 */

import { test, expect } from '@playwright/test';

test('analytics API endpoints work correctly', async ({ request }) => {
  // Wait to avoid rate limiting
  await new Promise(resolve => setTimeout(resolve, 15000));
  
  // First, get a login token
  const loginResponse = await request.post('http://localhost:4000/api/auth/login', {
    data: {
      email: 'admin@fitmeal.pro',
      password: 'AdminPass123'
    }
  });
  
  const loginData = await loginResponse.json();
  console.log('Login response status:', loginResponse.status());
  console.log('Login response data:', JSON.stringify(loginData, null, 2));
  
  if (!loginResponse.ok()) {
    console.log('Login failed:', loginData);
    // If rate limited, skip test
    if (loginData.code === 'RATE_LIMIT_EXCEEDED') {
      test.skip();
      return;
    }
    throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
  }
  
  // Check for token in different possible locations
  const token = loginData.data?.accessToken || loginData.token || loginData.accessToken;
  expect(token).toBeTruthy();
  console.log('✅ Successfully logged in as admin');
  
  // Test metrics endpoint
  const metricsResponse = await request.get('http://localhost:4000/api/analytics/metrics', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  expect(metricsResponse.ok()).toBeTruthy();
  const metricsData = await metricsResponse.json();
  
  // Verify metrics structure
  expect(metricsData).toHaveProperty('success', true);
  expect(metricsData).toHaveProperty('data');
  expect(metricsData.data).toHaveProperty('users');
  expect(metricsData.data).toHaveProperty('content');
  expect(metricsData.data).toHaveProperty('engagement');
  expect(metricsData.data).toHaveProperty('performance');
  expect(metricsData.data).toHaveProperty('business');
  
  console.log('✅ Metrics endpoint working');
  console.log('Total users:', metricsData.data.users.total);
  console.log('Total recipes:', metricsData.data.content.totalRecipes);
  
  // Test user activity endpoint
  const activityResponse = await request.get('http://localhost:4000/api/analytics/users?limit=5', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  expect(activityResponse.ok()).toBeTruthy();
  const activityData = await activityResponse.json();
  expect(activityData).toHaveProperty('success', true);
  expect(activityData).toHaveProperty('data');
  expect(Array.isArray(activityData.data)).toBeTruthy();
  
  console.log('✅ User activity endpoint working');
  console.log('Recent users count:', activityData.data.length);
  
  // Test content metrics endpoint
  const contentResponse = await request.get('http://localhost:4000/api/analytics/content', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  expect(contentResponse.ok()).toBeTruthy();
  const contentData = await contentResponse.json();
  expect(contentData).toHaveProperty('success', true);
  expect(contentData).toHaveProperty('data');
  expect(contentData.data).toHaveProperty('recipeTrends');
  expect(contentData.data).toHaveProperty('popularRecipes');
  expect(contentData.data).toHaveProperty('mealPlanUsage');
  
  console.log('✅ Content metrics endpoint working');
  console.log('Recipe trends days:', contentData.data.recipeTrends.length);
  
  // Test security metrics endpoint
  const securityResponse = await request.get('http://localhost:4000/api/analytics/security', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  expect(securityResponse.ok()).toBeTruthy();
  const securityData = await securityResponse.json();
  expect(securityData).toHaveProperty('success', true);
  expect(securityData).toHaveProperty('data');
  expect(securityData.data).toHaveProperty('failedLogins');
  expect(securityData.data).toHaveProperty('suspiciousActivities');
  expect(securityData.data).toHaveProperty('securityScore');
  
  console.log('✅ Security metrics endpoint working');
  console.log('Security score:', securityData.data.securityScore);
  
  // Test health endpoint
  const healthResponse = await request.get('http://localhost:4000/api/analytics/health', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  expect(healthResponse.ok()).toBeTruthy();
  const healthData = await healthResponse.json();
  expect(healthData).toHaveProperty('success', true);
  expect(healthData).toHaveProperty('data');
  expect(healthData.data).toHaveProperty('status');
  expect(healthData.data).toHaveProperty('components');
  expect(healthData.data).toHaveProperty('uptime');
  
  console.log('✅ Health endpoint working');
  console.log('System status:', healthData.data.status);
  console.log('Uptime:', Math.floor(healthData.data.uptime / 60), 'minutes');
  
  // Test export endpoint (JSON)
  const exportResponse = await request.get('http://localhost:4000/api/analytics/export?format=json', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  expect(exportResponse.ok()).toBeTruthy();
  const exportData = await exportResponse.json();
  expect(exportData).toHaveProperty('users');
  expect(exportData).toHaveProperty('content');
  
  console.log('✅ Export endpoint working');
  
  console.log('\n📊 Analytics API Summary:');
  console.log('==========================');
  console.log('✅ All analytics endpoints are functioning correctly');
  console.log('✅ Data structure validation passed');
  console.log('✅ Authentication and authorization working');
  console.log('✅ Export functionality operational');
});