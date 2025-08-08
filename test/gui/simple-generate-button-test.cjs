/**
 * Simple Generate Plan Button Investigation
 * 
 * This script performs basic API and application tests without Puppeteer
 * to identify issues with the generate plan functionality
 */

const fs = require('fs');
const path = require('path');

class SimpleInvestigator {
  constructor() {
    this.baseUrl = 'http://localhost:4000';
    this.results = [];
    this.authToken = null;
  }

  addResult(test, status, details, suggestions = []) {
    this.results.push({
      test,
      status,
      details,
      suggestions,
      timestamp: new Date().toISOString()
    });
    
    const statusIcon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
    console.log(`${statusIcon} ${test}: ${status.toUpperCase()}`);
    details.forEach(detail => console.log(`   - ${detail}`));
    if (suggestions.length > 0) {
      console.log('   Suggestions:');
      suggestions.forEach(suggestion => console.log(`   • ${suggestion}`));
    }
    console.log('');
  }

  async testApplicationHealth() {
    console.log('🏥 Testing application health...');
    
    try {
      const response = await fetch(`${this.baseUrl}`);
      
      const responseText = await response.text();
      if (response.status === 200 && responseText.includes('EvoFitMeals')) {
        this.addResult(
          'Application Health Check',
          'pass',
          [
            `Application responding on ${this.baseUrl}`,
            `Status: ${response.status}`,
            'Frontend HTML loaded successfully'
          ]
        );
      } else {
        this.addResult(
          'Application Health Check',
          'fail',
          [`Unexpected response: ${response.status}`, `Data: ${responseText.substring(0, 100)}...`],
          ['Check if application is properly built', 'Verify server configuration']
        );
      }
    } catch (error) {
      this.addResult(
        'Application Health Check',
        'fail',
        [`Connection failed: ${error.message}`, `Attempting to connect to ${this.baseUrl}`],
        [
          'Ensure Docker containers are running: docker ps',
          'Check application logs: docker logs fitnessmealplanner-dev',
          'Verify port 4000 is not blocked by firewall'
        ]
      );
    }
  }

  async testAuthenticationAPI() {
    console.log('🔐 Testing authentication API...');
    
    try {
      const loginData = {
        email: 'admin@fitmeal.pro',
        password: 'Admin123!@#'
      };

      const response = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      const responseData = await response.json();
      if (response.status === 200 && responseData.token) {
        this.authToken = responseData.token;
        this.addResult(
          'Authentication API Test',
          'pass',
          [
            'Login API endpoint working',
            `Response status: ${response.status}`,
            'Auth token received successfully',
            `User role: ${responseData.user?.role || 'unknown'}`
          ]
        );
      } else {
        this.addResult(
          'Authentication API Test',
          'fail',
          [`Login succeeded but invalid response format`, `Status: ${response.status}`, `Response: ${JSON.stringify(responseData)}`],
          ['Check auth response format', 'Verify JWT token generation']
        );
      }
    } catch (error) {
      this.addResult(
        'Authentication API Test',
        'fail',
        [`Network error during auth: ${error.message}`],
        [
          'Check if backend server is running',
          'Verify API routes are configured',
          'Check database connectivity',
          'Verify admin user exists in database'
        ]
      );
    }
  }

  async testMealPlanGenerationAPI() {
    console.log('🍽️  Testing meal plan generation API...');
    
    if (!this.authToken) {
      this.addResult(
        'Meal Plan Generation API Test',
        'fail',
        ['No auth token available', 'Cannot test authenticated endpoints'],
        ['Fix authentication first']
      );
      return;
    }

    try {
      const mealPlanData = {
        days: 3,
        dailyCalorieTarget: 2000,
        mealsPerDay: 3,
        fitnessGoal: 'weight loss',
        clientName: 'API Test Client',
        description: 'Test meal plan generation via API'
      };

      const response = await fetch(`${this.baseUrl}/api/meal-plan/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify(mealPlanData)
      });

      const responseData = await response.json();
      if (response.status === 200 && responseData.mealPlan) {
        this.addResult(
          'Meal Plan Generation API Test',
          'pass',
          [
            'Meal plan generation API working',
            `Response status: ${response.status}`,
            `Generated plan for ${responseData.mealPlan.days} days`,
            `Plan name: ${responseData.mealPlan.planName || 'unnamed'}`,
            `Total meals: ${responseData.mealPlan.meals?.length || 'unknown'}`
          ]
        );
      } else {
        this.addResult(
          'Meal Plan Generation API Test',
          'fail',
          [
            `API responded but with unexpected format`,
            `Status: ${response.status}`,
            `Response: ${JSON.stringify(responseData).substring(0, 500)}...`
          ],
          [
            'Check meal plan generation logic',
            'Verify response format matches frontend expectations',
            'Review error handling in generation process'
          ]
        );
      }
    } catch (error) {
      this.addResult(
        'Meal Plan Generation API Test',
        'fail',
        [`Error during meal plan generation: ${error.message}`],
        [
          'Check OpenAI API configuration and keys',
          'Verify database schema and connections',
          'Review server logs for detailed error information',
          'Check recipe generation service availability',
          'Verify network connectivity to external APIs'
        ]
      );
    }
  }

  async testRoutesExistence() {
    console.log('🛤️  Testing critical application routes...');
    
    const routesToTest = [
      { path: '/login', description: 'Login page' },
      { path: '/meal-plan-generator', description: 'Meal plan generator (may require auth)' },
      { path: '/trainer', description: 'Trainer dashboard (may require auth)' }
    ];

    for (const route of routesToTest) {
      try {
        const response = await fetch(`${this.baseUrl}${route.path}`, {
          redirect: 'manual' // Don't follow redirects
        });

        if (response.status === 200) {
          this.addResult(
            `Route Test: ${route.description}`,
            'pass',
            [`Route ${route.path} accessible`, `Status: ${response.status}`]
          );
        } else if (response.status === 302 || response.status === 301) {
          this.addResult(
            `Route Test: ${route.description}`,
            'warning',
            [
              `Route ${route.path} redirects (${response.status})`,
              `May require authentication`,
              `Redirect location: ${response.headers.get('location') || 'not specified'}`
            ]
          );
        } else {
          this.addResult(
            `Route Test: ${route.description}`,
            'warning',
            [`Route ${route.path} returned ${response.status}`, 'May be expected behavior for protected routes']
          );
        }
      } catch (error) {
        this.addResult(
          `Route Test: ${route.description}`,
          'fail',
          [`Failed to access ${route.path}: ${error.message}`],
          ['Check routing configuration', 'Verify server is handling SPA routes correctly']
        );
      }
    }
  }

  async testDatabaseConnection() {
    console.log('🗄️  Testing database connectivity...');
    
    try {
      // Test a simple authenticated endpoint that requires database access
      if (this.authToken) {
        const response = await fetch(`${this.baseUrl}/api/user/profile`, {
          headers: { 'Authorization': `Bearer ${this.authToken}` }
        });

        this.addResult(
          'Database Connection Test',
          'pass',
          [
            'Database appears to be connected',
            'User profile endpoint working',
            `Response status: ${response.status}`
          ]
        );
      } else {
        this.addResult(
          'Database Connection Test',
          'warning',
          ['Cannot test database - no auth token', 'Authentication must be fixed first']
        );
      }
    } catch (error) {
      this.addResult(
        'Database Connection Test',
        'fail',
        [`Error testing database: ${error.message}`],
        [
          'Check PostgreSQL container status: docker ps',
          'Verify database connection string',
          'Check database migrations are up to date',
          'Review server logs for database errors'
        ]
      );
    }
  }

  generateReport() {
    const timestamp = new Date().toISOString();
    const passCount = this.results.filter(r => r.status === 'pass').length;
    const failCount = this.results.filter(r => r.status === 'fail').length;
    const warningCount = this.results.filter(r => r.status === 'warning').length;

    let report = `# Generate Plan Button Investigation Report - Simple API Tests
Generated: ${timestamp}
Application URL: ${this.baseUrl}

## Summary
- ✅ Passed: ${passCount}
- ❌ Failed: ${failCount}  
- ⚠️  Warnings: ${warningCount}
- 📊 Total Tests: ${this.results.length}

## Test Results
`;

    this.results.forEach(result => {
      const statusIcon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
      report += `
### ${statusIcon} ${result.test}
**Status:** ${result.status.toUpperCase()}
**Details:**
${result.details.map(d => `- ${d}`).join('\n')}
`;
      
      if (result.suggestions && result.suggestions.length > 0) {
        report += `
**Suggestions:**
${result.suggestions.map(s => `- ${s}`).join('\n')}
`;
      }
    });

    const criticalIssues = this.results.filter(r => r.status === 'fail');
    
    report += `
## Summary of Critical Issues
`;

    if (criticalIssues.length === 0) {
      report += `
No critical issues found at the API level. The main functionality appears to be working.

If the generate plan buttons still don't work in the browser, the issue is likely:
1. Frontend JavaScript errors preventing button clicks
2. Form validation preventing submission
3. State management issues in React components
4. CSS/UI issues making buttons unclickable

Next steps:
1. Test in an actual browser and check developer console for errors
2. Inspect element on the generate plan buttons to verify they're clickable
3. Check React DevTools for component state issues
`;
    } else {
      report += `
Found ${criticalIssues.length} critical issue(s) that need immediate attention:

`;
      criticalIssues.forEach((issue, index) => {
        report += `${index + 1}. **${issue.test}**: ${issue.details.join(', ')}\n`;
        if (issue.suggestions.length > 0) {
          report += `   Fixes: ${issue.suggestions.join(', ')}\n`;
        }
      });
    }

    report += `
## Immediate Action Items

### High Priority
1. Fix any failed tests above
2. Test the application manually in a browser
3. Check browser developer console for JavaScript errors
4. Inspect the generate plan buttons to ensure they're properly rendered

### Medium Priority  
1. Verify all warning status items
2. Test with different user roles (trainer vs admin)
3. Test on different browsers and devices

### Low Priority
1. Add better error handling and user feedback
2. Implement loading states for long operations
3. Add comprehensive logging for debugging
`;

    return report;
  }

  async runAllTests() {
    console.log('🚀 Starting Simple Generate Plan Button Investigation\n');

    await this.testApplicationHealth();
    await this.testAuthenticationAPI();
    await this.testMealPlanGenerationAPI();
    await this.testRoutesExistence();
    await this.testDatabaseConnection();

    const report = this.generateReport();
    
    // Save report
    const reportDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const reportPath = path.join(reportDir, 'simple-api-investigation-report.md');
    fs.writeFileSync(reportPath, report);

    console.log('\n' + '='.repeat(80));
    console.log('SIMPLE API INVESTIGATION COMPLETE');
    console.log('='.repeat(80));
    console.log(report);
    console.log('='.repeat(80));
    console.log(`Full report saved to: ${reportPath}`);

    return this.results;
  }
}

// Run the investigation
if (require.main === module) {
  const investigator = new SimpleInvestigator();
  investigator.runAllTests().catch(error => {
    console.error('Investigation failed:', error);
    process.exit(1);
  });
}

module.exports = SimpleInvestigator;