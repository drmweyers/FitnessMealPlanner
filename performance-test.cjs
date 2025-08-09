#!/usr/bin/env node

// Simple performance testing script for FitnessMealPlanner
const { performance } = require('perf_hooks');

async function performanceTest() {
  console.log('🚀 Starting FitnessMealPlanner Performance Tests');
  console.log('═══════════════════════════════════════════════');
  
  const baseUrl = 'http://localhost:4000';
  const tests = [];

  // Test 1: Health Check Response Time
  console.log('\n📊 Test 1: API Health Check Performance');
  const healthStart = performance.now();
  try {
    const response = await fetch(`${baseUrl}/api/health`);
    const healthEnd = performance.now();
    const healthTime = Math.round(healthEnd - healthStart);
    
    if (response.ok) {
      console.log(`✅ Health check: ${healthTime}ms`);
      tests.push({ name: 'Health Check', time: healthTime, status: 'PASS' });
    } else {
      console.log(`❌ Health check failed: ${response.status}`);
      tests.push({ name: 'Health Check', time: healthTime, status: 'FAIL' });
    }
  } catch (error) {
    console.log(`❌ Health check error: ${error.message}`);
    tests.push({ name: 'Health Check', time: 0, status: 'ERROR' });
  }

  // Test 2: Frontend Load Time
  console.log('\n📊 Test 2: Frontend Load Performance');
  const frontendStart = performance.now();
  try {
    const response = await fetch(baseUrl);
    const frontendEnd = performance.now();
    const frontendTime = Math.round(frontendEnd - frontendStart);
    
    if (response.ok) {
      console.log(`✅ Frontend load: ${frontendTime}ms`);
      tests.push({ name: 'Frontend Load', time: frontendTime, status: 'PASS' });
    } else {
      console.log(`❌ Frontend load failed: ${response.status}`);
      tests.push({ name: 'Frontend Load', time: frontendTime, status: 'FAIL' });
    }
  } catch (error) {
    console.log(`❌ Frontend load error: ${error.message}`);
    tests.push({ name: 'Frontend Load', time: 0, status: 'ERROR' });
  }

  // Test 3: Multiple Health Check Load Test
  console.log('\n📊 Test 3: Load Test (10 concurrent requests)');
  const loadTestStart = performance.now();
  try {
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(fetch(`${baseUrl}/api/health`));
    }
    
    const results = await Promise.all(promises);
    const loadTestEnd = performance.now();
    const loadTestTime = Math.round(loadTestEnd - loadTestStart);
    
    const successCount = results.filter(r => r.ok).length;
    console.log(`✅ Load test completed: ${loadTestTime}ms (${successCount}/10 successful)`);
    tests.push({ name: 'Load Test (10 requests)', time: loadTestTime, status: successCount === 10 ? 'PASS' : 'PARTIAL' });
  } catch (error) {
    console.log(`❌ Load test error: ${error.message}`);
    tests.push({ name: 'Load Test', time: 0, status: 'ERROR' });
  }

  // Summary
  console.log('\n📋 Performance Test Summary');
  console.log('═══════════════════════════════════════════════');
  
  let totalTests = tests.length;
  let passedTests = tests.filter(t => t.status === 'PASS').length;
  let averageTime = Math.round(tests.reduce((sum, t) => sum + t.time, 0) / tests.filter(t => t.time > 0).length);
  
  tests.forEach(test => {
    const statusIcon = test.status === 'PASS' ? '✅' : test.status === 'PARTIAL' ? '⚠️' : '❌';
    const timeDisplay = test.time > 0 ? `${test.time}ms` : 'N/A';
    console.log(`${statusIcon} ${test.name}: ${timeDisplay} (${test.status})`);
  });
  
  console.log(`\n🏆 Overall Results:`);
  console.log(`   Tests Passed: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);
  console.log(`   Average Response Time: ${averageTime}ms`);
  
  // Performance Rating
  if (averageTime < 100) {
    console.log(`   Performance Rating: ⭐⭐⭐⭐⭐ Excellent`);
  } else if (averageTime < 300) {
    console.log(`   Performance Rating: ⭐⭐⭐⭐ Good`);
  } else if (averageTime < 1000) {
    console.log(`   Performance Rating: ⭐⭐⭐ Average`);
  } else {
    console.log(`   Performance Rating: ⭐⭐ Needs Improvement`);
  }

  return {
    totalTests,
    passedTests,
    averageTime,
    tests
  };
}

// Run the tests
performanceTest()
  .then(results => {
    console.log('\n✨ Performance testing completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Performance testing failed:', error.message);
    process.exit(1);
  });