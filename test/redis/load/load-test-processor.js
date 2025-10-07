// Artillery.js processor for Redis load testing
// Provides custom functions and hooks for load testing

const fs = require('fs');
const path = require('path');

let testResults = {
  startTime: Date.now(),
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  responseTimeSum: 0,
  cacheHitEstimate: 0,
  cacheMetrics: {
    hits: 0,
    misses: 0,
    hitRatio: 0
  }
};

// Before the test starts
function beforeScenario(context, events, done) {
  // Add timestamp to context for measuring response times
  context.vars.startTime = Date.now();
  return done();
}

// After each request
function afterResponse(requestParams, response, context, events, done) {
  const responseTime = Date.now() - context.vars.startTime;
  
  testResults.totalRequests++;
  testResults.responseTimeSum += responseTime;

  if (response.statusCode >= 200 && response.statusCode < 300) {
    testResults.successfulRequests++;
    
    // Estimate cache hits based on response time
    // Fast responses (< 50ms) are likely cache hits
    if (responseTime < 50) {
      testResults.cacheHitEstimate++;
    }
  } else {
    testResults.failedRequests++;
  }

  // Custom metrics for Artillery
  events.emit('customStat', 'response_time', responseTime);
  events.emit('customStat', 'cache_hit_estimate', responseTime < 50 ? 1 : 0);

  return done();
}

// Custom function to generate realistic test data
function generateRealisticRecipeSearch(context, events, done) {
  const commonSearchTerms = [
    'chicken breast', 'salmon fillet', 'ground turkey', 'quinoa bowl',
    'greek salad', 'protein smoothie', 'cauliflower rice', 'sweet potato',
    'avocado toast', 'egg white omelet', 'lean beef', 'tuna salad'
  ];
  
  const dietaryFilters = [
    ['high-protein'], ['low-carb'], ['keto'], ['vegetarian'], 
    ['gluten-free'], ['dairy-free'], ['paleo'], []
  ];
  
  const calorieRanges = [
    { min: 200, max: 400 },   // Snacks
    { min: 400, max: 600 },   // Light meals
    { min: 600, max: 800 },   // Regular meals
    { min: 800, max: 1200 }   // Large meals
  ];

  context.vars.searchTerm = commonSearchTerms[Math.floor(Math.random() * commonSearchTerms.length)];
  context.vars.dietaryFilter = dietaryFilters[Math.floor(Math.random() * dietaryFilters.length)];
  
  const calorieRange = calorieRanges[Math.floor(Math.random() * calorieRanges.length)];
  context.vars.minCalories = calorieRange.min;
  context.vars.maxCalories = calorieRange.max;
  
  return done();
}

// Generate realistic meal plan parameters
function generateMealPlanParams(context, events, done) {
  const mealPlansConfig = [
    { calories: 1200, meals: 3, name: 'Weight Loss Plan' },
    { calories: 1500, meals: 4, name: 'Lean Muscle Plan' },
    { calories: 1800, meals: 3, name: 'Maintenance Plan' },
    { calories: 2000, meals: 4, name: 'Muscle Gain Plan' },
    { calories: 2200, meals: 5, name: 'Bulk Plan' },
    { calories: 2500, meals: 5, name: 'High Performance Plan' }
  ];

  const config = mealPlansConfig[Math.floor(Math.random() * mealPlansConfig.length)];
  
  context.vars.planCalories = config.calories;
  context.vars.planMeals = config.meals;
  context.vars.planName = `${config.name} - Load Test ${Date.now()}`;
  context.vars.planDuration = Math.floor(Math.random() * 5) + 3; // 3-7 days
  
  return done();
}

// Simulate different user types with realistic behavior patterns
function simulateUserType(context, events, done) {
  const userTypes = [
    {
      type: 'power_user',
      probability: 0.2,
      behavior: {
        searchFrequency: 'high',
        mealPlanGeneration: 'frequent',
        detailViewing: 'extensive'
      }
    },
    {
      type: 'regular_user',
      probability: 0.6,
      behavior: {
        searchFrequency: 'medium',
        mealPlanGeneration: 'occasional',
        detailViewing: 'moderate'
      }
    },
    {
      type: 'light_user',
      probability: 0.2,
      behavior: {
        searchFrequency: 'low',
        mealPlanGeneration: 'rare',
        detailViewing: 'minimal'
      }
    }
  ];

  let selectedType;
  const random = Math.random();
  let cumulativeProbability = 0;

  for (const userType of userTypes) {
    cumulativeProbability += userType.probability;
    if (random <= cumulativeProbability) {
      selectedType = userType;
      break;
    }
  }

  context.vars.userType = selectedType.type;
  context.vars.userBehavior = selectedType.behavior;
  
  return done();
}

// Hook to track cache performance during the test
function trackCachePerformance(context, events, done) {
  // This would integrate with Redis monitoring if available
  // For now, we estimate based on response patterns
  
  const responseTime = context.vars.responseTime || 0;
  
  if (responseTime < 50) {
    testResults.cacheMetrics.hits++;
  } else if (responseTime > 200) {
    testResults.cacheMetrics.misses++;
  }

  testResults.cacheMetrics.hitRatio = 
    testResults.cacheMetrics.hits / 
    (testResults.cacheMetrics.hits + testResults.cacheMetrics.misses);

  return done();
}

// Final report generation
function generateTestReport(summary, done) {
  const endTime = Date.now();
  const testDuration = endTime - testResults.startTime;
  
  const report = {
    testMetadata: {
      duration: testDuration,
      startTime: new Date(testResults.startTime).toISOString(),
      endTime: new Date(endTime).toISOString()
    },
    performance: {
      totalRequests: testResults.totalRequests,
      successfulRequests: testResults.successfulRequests,
      failedRequests: testResults.failedRequests,
      successRate: (testResults.successfulRequests / testResults.totalRequests * 100).toFixed(2) + '%',
      averageResponseTime: (testResults.responseTimeSum / testResults.totalRequests).toFixed(2) + 'ms',
      requestsPerSecond: (testResults.totalRequests / (testDuration / 1000)).toFixed(2)
    },
    cachePerformance: {
      estimatedHitRatio: (testResults.cacheHitEstimate / testResults.totalRequests * 100).toFixed(2) + '%',
      fastResponses: testResults.cacheHitEstimate,
      totalResponses: testResults.totalRequests,
      cacheMetrics: testResults.cacheMetrics
    },
    recommendations: generateRecommendations()
  };

  // Write detailed report
  const reportPath = path.join(__dirname, 'results', `redis-load-test-${Date.now()}.json`);
  
  // Ensure results directory exists
  const resultsDir = path.dirname(reportPath);
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log('\n=== Redis Load Test Report ===');
  console.log(`Test Duration: ${(testDuration / 1000).toFixed(1)} seconds`);
  console.log(`Total Requests: ${testResults.totalRequests}`);
  console.log(`Success Rate: ${report.performance.successRate}`);
  console.log(`Average Response Time: ${report.performance.averageResponseTime}`);
  console.log(`Requests/Second: ${report.performance.requestsPerSecond}`);
  console.log(`Estimated Cache Hit Ratio: ${report.cachePerformance.estimatedHitRatio}`);
  console.log(`Report saved to: ${reportPath}`);
  
  return done();
}

function generateRecommendations() {
  const recommendations = [];
  
  const avgResponseTime = testResults.responseTimeSum / testResults.totalRequests;
  const hitRatio = testResults.cacheHitEstimate / testResults.totalRequests;
  const errorRate = testResults.failedRequests / testResults.totalRequests;

  if (avgResponseTime > 200) {
    recommendations.push({
      type: 'performance',
      priority: 'high',
      issue: 'High average response time',
      suggestion: 'Consider increasing cache TTL and implementing cache warming strategies'
    });
  }

  if (hitRatio < 0.7) {
    recommendations.push({
      type: 'caching',
      priority: 'high',
      issue: 'Low cache hit ratio',
      suggestion: 'Review cache invalidation strategy and implement predictive caching'
    });
  }

  if (errorRate > 0.05) {
    recommendations.push({
      type: 'reliability',
      priority: 'critical',
      issue: 'High error rate',
      suggestion: 'Implement better fallback mechanisms and circuit breakers'
    });
  }

  if (hitRatio > 0.9 && avgResponseTime < 100) {
    recommendations.push({
      type: 'optimization',
      priority: 'low',
      issue: 'Excellent performance',
      suggestion: 'Consider reducing cache memory allocation to optimize resource usage'
    });
  }

  return recommendations;
}

// Export functions for Artillery
module.exports = {
  beforeScenario,
  afterResponse,
  generateRealisticRecipeSearch,
  generateMealPlanParams,
  simulateUserType,
  trackCachePerformance,
  generateTestReport
};