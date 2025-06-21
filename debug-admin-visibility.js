/**
 * Debug Script: Admin Page Visibility Test
 * 
 * This script tests why the Recipe Database Management section is not visible
 * by checking component structure, API responses, and rendering conditions.
 */

const puppeteer = require('puppeteer');

async function debugAdminPageVisibility() {
  console.log('🔍 Starting Admin Page Visibility Debug...\n');
  
  try {
    // Test 1: Check if the admin page loads
    console.log('Test 1: Checking admin page load...');
    const response = await fetch('http://localhost:5000/admin');
    console.log(`Admin page status: ${response.status}`);
    
    // Test 2: Check API endpoints
    console.log('\nTest 2: Checking API endpoints...');
    
    // Check stats endpoint
    const statsResponse = await fetch('http://localhost:5000/api/admin/stats');
    const statsData = await statsResponse.json();
    console.log('Stats API response:', statsData);
    
    // Check recipes endpoint
    const recipesResponse = await fetch('http://localhost:5000/api/admin/recipes?page=1&limit=10');
    const recipesData = await recipesResponse.json();
    console.log('Admin recipes API response:', recipesData);
    
    // Test 3: Check auth status
    const authResponse = await fetch('http://localhost:5000/api/auth/user');
    if (authResponse.ok) {
      const authData = await authResponse.json();
      console.log('Auth status: Authenticated as', authData.email);
    } else {
      console.log('Auth status: Not authenticated');
    }
    
    console.log('\n✅ Debug tests completed');
    
  } catch (error) {
    console.error('❌ Debug test failed:', error.message);
  }
}

// Run the debug tests
debugAdminPageVisibility();