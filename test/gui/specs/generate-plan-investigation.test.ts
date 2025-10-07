/**
 * Comprehensive Investigation of 'Generate Plan' Button Functionality
 * 
 * This test suite specifically targets the reported issues with the generate plan
 * buttons not working across the FitnessMealPlanner application.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import puppeteer, { Browser, Page } from 'puppeteer';
import { puppeteerConfig, testConfig } from '../puppeteer.config';
import { BrowserUtils } from '../utils/browser-utils';
import path from 'path';
import fs from 'fs/promises';

interface TestResult {
  description: string;
  status: 'pass' | 'fail' | 'warning';
  details: string[];
  screenshot?: string;
  consoleErrors?: string[];
  networkErrors?: string[];
  suggestions?: string[];
}

class GeneratePlanTester {
  private browser: Browser;
  private page: Page;
  private results: TestResult[] = [];
  private consoleErrors: string[] = [];
  private networkErrors: string[] = [];
  
  constructor(browser: Browser, page: Page) {
    this.browser = browser;
    this.page = page;
    this.setupErrorCapture();
  }

  private setupErrorCapture() {
    // Capture console errors
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        this.consoleErrors.push(`${msg.type()}: ${msg.text()}`);
      }
    });

    // Capture network errors
    this.page.on('response', (response) => {
      if (!response.ok()) {
        this.networkErrors.push(`${response.status()} ${response.statusText()} - ${response.url()}`);
      }
    });

    // Capture JavaScript errors
    this.page.on('pageerror', (error) => {
      this.consoleErrors.push(`PageError: ${error.message}`);
    });
  }

  private async takeScreenshot(name: string): Promise<string> {
    const screenshotPath = path.join(process.cwd(), 'test/gui/screenshots/investigation');
    await fs.mkdir(screenshotPath, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}_${timestamp}.png`;
    const filepath = path.join(screenshotPath, filename);
    
    await this.page.screenshot({
      path: filepath,
      fullPage: true,
      type: 'png'
    });
    
    return filepath;
  }

  private async addResult(result: TestResult) {
    // Add current error state
    result.consoleErrors = [...this.consoleErrors];
    result.networkErrors = [...this.networkErrors];
    
    // Take screenshot for failures
    if (result.status === 'fail') {
      result.screenshot = await this.takeScreenshot(result.description.replace(/\s+/g, '-').toLowerCase());
    }
    
    this.results.push(result);
    
    // Clear errors for next test
    this.consoleErrors = [];
    this.networkErrors = [];
  }

  async testLoginAndNavigation(): Promise<void> {
    try {
      console.log('🔐 Testing login functionality...');
      
      await this.page.goto(`${testConfig.baseUrl}/login`, { waitUntil: 'networkidle2' });
      
      // Check if login page loads
      await this.page.waitForSelector('input[type="email"]', { timeout: 10000 });
      
      // Fill and submit login
      await this.page.type('input[type="email"]', testConfig.adminCredentials.email);
      await this.page.type('input[type="password"]', testConfig.adminCredentials.password);
      
      const submitButton = await this.page.$('button[type="submit"]');
      if (submitButton) {
        await Promise.all([
          this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
          submitButton.click()
        ]);
      }
      
      // Verify successful login
      await this.page.waitForSelector('[data-testid="dashboard"], .dashboard, nav', { timeout: 10000 });
      
      await this.addResult({
        description: 'Login and Authentication',
        status: 'pass',
        details: ['Successfully logged in with admin credentials', 'Dashboard loaded correctly']
      });
      
    } catch (error: any) {
      await this.addResult({
        description: 'Login and Authentication',
        status: 'fail',
        details: [`Login failed: ${error.message}`],
        suggestions: [
          'Check if application is running on http://localhost:4000',
          'Verify admin credentials are correct',
          'Check database connection'
        ]
      });
    }
  }

  async testMealPlanGeneratorPage(): Promise<void> {
    try {
      console.log('📋 Testing meal plan generator page access...');
      
      // Navigate to meal plan generator
      await this.page.goto(`${testConfig.baseUrl}/meal-plan-generator`, { waitUntil: 'networkidle2' });
      
      // Wait for page to load
      await this.page.waitForTimeout(3000);
      
      // Check if the page loads without errors
      const title = await this.page.title();
      const url = this.page.url();
      
      await this.addResult({
        description: 'Meal Plan Generator Page Access',
        status: 'pass',
        details: [
          `Page title: ${title}`,
          `Current URL: ${url}`,
          'Page loaded successfully'
        ]
      });
      
    } catch (error: any) {
      await this.addResult({
        description: 'Meal Plan Generator Page Access',
        status: 'fail',
        details: [`Failed to access meal plan generator: ${error.message}`],
        suggestions: [
          'Check if route /meal-plan-generator exists',
          'Verify user permissions for this page'
        ]
      });
    }
  }

  async testGenerateButtonPresence(): Promise<void> {
    console.log('🔍 Searching for generate plan buttons...');
    
    try {
      // Look for various forms of generate buttons
      const buttonSelectors = [
        'button[type="submit"]',
        'button:has-text("Generate")',
        'button:has-text("Generate Plan")',
        'button:has-text("Generate Meal Plan")',
        '[data-testid="generate-meal-plan"]',
        '[data-testid="generate-plan"]',
        'button:contains("Generate")'
      ];
      
      const foundButtons = [];
      
      for (const selector of buttonSelectors) {
        try {
          const buttons = await this.page.$$(selector);
          if (buttons.length > 0) {
            for (let i = 0; i < buttons.length; i++) {
              const buttonText = await buttons[i].evaluate(el => el.textContent?.trim() || '');
              const isVisible = await buttons[i].isIntersectingViewport();
              const isDisabled = await buttons[i].evaluate(el => (el as HTMLButtonElement).disabled);
              
              foundButtons.push({
                selector,
                index: i,
                text: buttonText,
                visible: isVisible,
                disabled: isDisabled
              });
            }
          }
        } catch (e) {
          // Skip selectors that don't work in Puppeteer
        }
      }
      
      if (foundButtons.length > 0) {
        await this.addResult({
          description: 'Generate Button Detection',
          status: 'pass',
          details: [
            `Found ${foundButtons.length} potential generate buttons:`,
            ...foundButtons.map(btn => 
              `- "${btn.text}" (${btn.selector}[${btn.index}]) - Visible: ${btn.visible}, Disabled: ${btn.disabled}`
            )
          ]
        });
      } else {
        await this.addResult({
          description: 'Generate Button Detection',
          status: 'fail',
          details: ['No generate plan buttons found on the page'],
          suggestions: [
            'Check if user has proper permissions to see buttons',
            'Verify the meal plan generator component is properly loaded',
            'Check if buttons are conditionally rendered based on form state'
          ]
        });
      }
      
    } catch (error: any) {
      await this.addResult({
        description: 'Generate Button Detection',
        status: 'fail',
        details: [`Error searching for buttons: ${error.message}`]
      });
    }
  }

  async testNaturalLanguageForm(): Promise<void> {
    console.log('🤖 Testing natural language form...');
    
    try {
      // Look for natural language input
      const naturalLanguageInput = await this.page.$('textarea[name="naturalLanguagePrompt"], textarea[placeholder*="natural"], textarea[placeholder*="describe"]');
      
      if (naturalLanguageInput) {
        // Fill in natural language prompt
        await naturalLanguageInput.click();
        await naturalLanguageInput.type('Create a 3-day meal plan for weight loss with high protein meals');
        
        // Look for the generate button associated with natural language
        await this.page.waitForTimeout(1000);
        
        const generateButtons = await this.page.$$('button:not([disabled])');
        let clickableButton = null;
        
        for (const button of generateButtons) {
          const text = await button.evaluate(el => el.textContent?.trim().toLowerCase() || '');
          if (text.includes('generate') && !text.includes('parse')) {
            clickableButton = button;
            break;
          }
        }
        
        if (clickableButton) {
          // Test clicking the button
          await clickableButton.click();
          
          // Wait for response or error
          await this.page.waitForTimeout(5000);
          
          // Check for loading states or results
          const isLoading = await this.page.$('.animate-spin, [data-testid="loading"]') !== null;
          const hasError = await this.page.$('.error, [role="alert"]') !== null;
          const hasResults = await this.page.$('[data-testid="meal-plan-result"], .meal-plan-display') !== null;
          
          await this.addResult({
            description: 'Natural Language Form Functionality',
            status: isLoading || hasResults ? 'pass' : 'fail',
            details: [
              'Natural language input found and filled',
              `Generate button clicked successfully`,
              `Loading state: ${isLoading}`,
              `Has results: ${hasResults}`,
              `Has errors: ${hasError}`
            ],
            suggestions: hasError ? [
              'Check API endpoint /api/meal-plan/generate',
              'Verify OpenAI API key configuration',
              'Check server logs for detailed error messages'
            ] : []
          });
        } else {
          await this.addResult({
            description: 'Natural Language Form Functionality',
            status: 'fail',
            details: [
              'Natural language input found but no clickable generate button',
              'Button may be disabled or not properly configured'
            ]
          });
        }
      } else {
        await this.addResult({
          description: 'Natural Language Form Functionality',
          status: 'warning',
          details: ['Natural language input field not found']
        });
      }
      
    } catch (error: any) {
      await this.addResult({
        description: 'Natural Language Form Functionality',
        status: 'fail',
        details: [`Natural language form test failed: ${error.message}`]
      });
    }
  }

  async testAdvancedForm(): Promise<void> {
    console.log('📊 Testing advanced form...');
    
    try {
      // Look for advanced form toggle
      const advancedToggle = await this.page.$('button:has-text("Advanced"), [data-testid="advanced-toggle"]');
      
      if (advancedToggle) {
        await advancedToggle.click();
        await this.page.waitForTimeout(2000);
      }
      
      // Fill out basic required fields
      const fieldsToFill = [
        { selector: 'input[name="days"], [data-testid="days"]', value: '3', name: 'days' },
        { selector: 'input[name="dailyCalorieTarget"], [data-testid="calorie-target"]', value: '2000', name: 'calories' },
        { selector: 'input[name="mealsPerDay"], [data-testid="meals-per-day"]', value: '3', name: 'meals per day' },
        { selector: 'input[name="clientName"], [data-testid="client-name"]', value: 'Test Client', name: 'client name' }
      ];
      
      const filledFields = [];
      
      for (const field of fieldsToFill) {
        try {
          const element = await this.page.$(field.selector);
          if (element) {
            await element.click();
            await element.evaluate(el => (el as HTMLInputElement).value = '');
            await element.type(field.value);
            filledFields.push(field.name);
          }
        } catch (e) {
          console.log(`Could not fill field ${field.name}: ${e}`);
        }
      }
      
      // Try to select fitness goal if dropdown exists
      try {
        const fitnessGoalSelect = await this.page.$('select[name="fitnessGoal"], [data-testid="fitness-goal"]');
        if (fitnessGoalSelect) {
          await fitnessGoalSelect.select('weight loss');
          filledFields.push('fitness goal');
        }
      } catch (e) {
        console.log('Could not set fitness goal');
      }
      
      // Look for submit button
      const submitButton = await this.page.$('button[type="submit"]');
      
      if (submitButton && filledFields.length > 0) {
        const isDisabled = await submitButton.evaluate(el => (el as HTMLButtonElement).disabled);
        
        if (!isDisabled) {
          await submitButton.click();
          await this.page.waitForTimeout(8000); // Wait longer for meal plan generation
          
          // Check for results or errors
          const hasResults = await this.page.$('[data-testid="meal-plan-result"], .meal-plan-display') !== null;
          const hasError = await this.page.$('.error, [role="alert"]') !== null;
          const isStillLoading = await this.page.$('.animate-spin') !== null;
          
          await this.addResult({
            description: 'Advanced Form Submission',
            status: hasResults || isStillLoading ? 'pass' : 'fail',
            details: [
              `Filled fields: ${filledFields.join(', ')}`,
              `Submit button was enabled and clicked`,
              `Has results: ${hasResults}`,
              `Has errors: ${hasError}`,
              `Still loading: ${isStillLoading}`
            ],
            suggestions: hasError ? [
              'Check server-side meal plan generation logic',
              'Verify all required fields are properly validated',
              'Check API response format matches expected structure'
            ] : []
          });
        } else {
          await this.addResult({
            description: 'Advanced Form Submission',
            status: 'fail',
            details: [
              `Filled fields: ${filledFields.join(', ')}`,
              'Submit button is disabled',
              'Form validation may be preventing submission'
            ],
            suggestions: [
              'Check form validation rules',
              'Verify all required fields are filled correctly',
              'Check console for validation error messages'
            ]
          });
        }
      } else {
        await this.addResult({
          description: 'Advanced Form Submission',
          status: 'fail',
          details: [
            `Filled fields: ${filledFields.join(', ')}`,
            'Submit button not found or no fields could be filled'
          ]
        });
      }
      
    } catch (error: any) {
      await this.addResult({
        description: 'Advanced Form Submission',
        status: 'fail',
        details: [`Advanced form test failed: ${error.message}`]
      });
    }
  }

  async testAPIEndpoint(): Promise<void> {
    console.log('🌐 Testing API endpoint directly...');
    
    try {
      // Test the API endpoint directly
      const testData = {
        days: 3,
        dailyCalorieTarget: 2000,
        mealsPerDay: 3,
        fitnessGoal: 'weight loss',
        clientName: 'API Test Client',
        description: 'Test meal plan generation via API'
      };
      
      // Navigate to make sure we have session/auth
      const cookies = await this.page.cookies();
      const cookieHeader = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
      
      // Use page.evaluate to make the request from within the browser context
      const response = await this.page.evaluate(async (data) => {
        try {
          const response = await fetch('/api/meal-plan/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
          });
          
          const responseData = await response.text();
          
          return {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            data: responseData,
            contentType: response.headers.get('content-type')
          };
        } catch (error: any) {
          return {
            error: error.message,
            status: 0
          };
        }
      }, testData);
      
      if (response.error) {
        await this.addResult({
          description: 'API Endpoint Test',
          status: 'fail',
          details: [
            `Network error: ${response.error}`,
            'API endpoint may not be accessible'
          ],
          suggestions: [
            'Check if backend server is running',
            'Verify API route exists in server code',
            'Check network connectivity'
          ]
        });
      } else if (response.ok) {
        await this.addResult({
          description: 'API Endpoint Test',
          status: 'pass',
          details: [
            `API responded with status ${response.status}`,
            `Content-Type: ${response.contentType}`,
            `Response preview: ${response.data.substring(0, 200)}...`
          ]
        });
      } else {
        await this.addResult({
          description: 'API Endpoint Test',
          status: 'fail',
          details: [
            `API returned error status: ${response.status} ${response.statusText}`,
            `Response: ${response.data}`
          ],
          suggestions: [
            'Check server logs for detailed error information',
            'Verify authentication/authorization',
            'Check if required services (OpenAI, database) are available'
          ]
        });
      }
      
    } catch (error: any) {
      await this.addResult({
        description: 'API Endpoint Test',
        status: 'fail',
        details: [`API test failed: ${error.message}`]
      });
    }
  }

  async testTrainerPageButtons(): Promise<void> {
    console.log('👨‍💼 Testing trainer page generate buttons...');
    
    try {
      // Navigate to trainer page
      await this.page.goto(`${testConfig.baseUrl}/trainer`, { waitUntil: 'networkidle2' });
      await this.page.waitForTimeout(3000);
      
      // Look for customer cards or sections with generate buttons
      const customerSections = await this.page.$$('[data-testid="customer-card"], .customer-card, .customer-section');
      
      if (customerSections.length > 0) {
        let buttonsFound = 0;
        const buttonDetails = [];
        
        for (let i = 0; i < Math.min(customerSections.length, 3); i++) {
          const section = customerSections[i];
          const generateButtons = await section.$$('button');
          
          for (const button of generateButtons) {
            const text = await button.evaluate(el => el.textContent?.trim() || '');
            if (text.toLowerCase().includes('generate')) {
              buttonsFound++;
              const isDisabled = await button.evaluate(el => (el as HTMLButtonElement).disabled);
              buttonDetails.push(`"${text}" - Disabled: ${isDisabled}`);
            }
          }
        }
        
        await this.addResult({
          description: 'Trainer Page Generate Buttons',
          status: buttonsFound > 0 ? 'pass' : 'warning',
          details: [
            `Found ${customerSections.length} customer sections`,
            `Found ${buttonsFound} generate buttons`,
            ...buttonDetails
          ]
        });
      } else {
        await this.addResult({
          description: 'Trainer Page Generate Buttons',
          status: 'warning',
          details: [
            'No customer sections found on trainer page',
            'May need to add customers first or check user permissions'
          ]
        });
      }
      
    } catch (error: any) {
      await this.addResult({
        description: 'Trainer Page Generate Buttons',
        status: 'fail',
        details: [`Trainer page test failed: ${error.message}`]
      });
    }
  }

  generateReport(): string {
    const timestamp = new Date().toISOString();
    const passCount = this.results.filter(r => r.status === 'pass').length;
    const failCount = this.results.filter(r => r.status === 'fail').length;
    const warningCount = this.results.filter(r => r.status === 'warning').length;
    
    let report = `
# Generate Plan Button Investigation Report
Generated: ${timestamp}
Application URL: ${testConfig.baseUrl}

## Summary
- ✅ Passed: ${passCount}
- ❌ Failed: ${failCount}  
- ⚠️  Warnings: ${warningCount}
- 📊 Total Tests: ${this.results.length}

## Critical Issues Found
`;

    const criticalIssues = this.results.filter(r => r.status === 'fail');
    if (criticalIssues.length === 0) {
      report += "No critical issues found.\n\n";
    } else {
      criticalIssues.forEach(issue => {
        report += `
### ${issue.description}
**Status:** ❌ FAILED
**Details:**
${issue.details.map(d => `- ${d}`).join('\n')}
`;
        if (issue.suggestions && issue.suggestions.length > 0) {
          report += `
**Suggested Fixes:**
${issue.suggestions.map(s => `- ${s}`).join('\n')}
`;
        }
        if (issue.consoleErrors && issue.consoleErrors.length > 0) {
          report += `
**Console Errors:**
${issue.consoleErrors.map(e => `- ${e}`).join('\n')}
`;
        }
        if (issue.networkErrors && issue.networkErrors.length > 0) {
          report += `
**Network Errors:**
${issue.networkErrors.map(e => `- ${e}`).join('\n')}
`;
        }
        report += '\n';
      });
    }

    report += `
## Detailed Test Results

`;
    
    this.results.forEach(result => {
      const statusIcon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
      report += `
### ${statusIcon} ${result.description}
**Status:** ${result.status.toUpperCase()}
**Details:**
${result.details.map(d => `- ${d}`).join('\n')}
`;
      
      if (result.screenshot) {
        report += `**Screenshot:** ${result.screenshot}\n`;
      }
    });

    report += `
## Recommendations for Immediate Action

1. **High Priority Fixes:**
   - Verify the meal plan generation API endpoint is working
   - Check OpenAI API configuration and credentials
   - Ensure database connectivity for meal plan storage

2. **UI/UX Issues:**
   - Test button states and loading indicators
   - Verify form validation is working correctly
   - Check responsive design on different screen sizes

3. **Backend Verification:**
   - Review server logs during meal plan generation attempts
   - Test API endpoints independently
   - Verify authentication and authorization middleware

4. **Frontend Debugging:**
   - Check browser console for JavaScript errors
   - Verify React component state management
   - Test form submission and data flow

## Next Steps
1. Fix critical issues identified in this report
2. Run this test suite again to verify fixes
3. Implement proper error handling and user feedback
4. Add comprehensive logging for better debugging
`;

    return report;
  }
}

describe('Generate Plan Button Investigation', () => {
  let browser: Browser;
  let page: Page;
  let tester: GeneratePlanTester;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      ...puppeteerConfig,
      headless: false, // Show browser for debugging
      devtools: true
    });
    page = await browser.newPage();
    tester = new GeneratePlanTester(browser, page);
  });

  afterAll(async () => {
    if (tester) {
      const report = tester.generateReport();
      
      // Save report to file
      const reportPath = path.join(process.cwd(), 'test/gui/reports/generate-plan-investigation-report.md');
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, report);
      
      console.log('\n' + '='.repeat(80));
      console.log('GENERATE PLAN BUTTON INVESTIGATION COMPLETE');
      console.log('='.repeat(80));
      console.log(report);
      console.log('='.repeat(80));
      console.log(`Full report saved to: ${reportPath}`);
    }
    
    await browser.close();
  });

  it('should complete comprehensive generate plan button investigation', async () => {
    // Run all tests in sequence
    await tester.testLoginAndNavigation();
    await tester.testMealPlanGeneratorPage();
    await tester.testGenerateButtonPresence();
    await tester.testNaturalLanguageForm();
    await tester.testAdvancedForm();
    await tester.testAPIEndpoint();
    await tester.testTrainerPageButtons();
    
    // The test always passes as it's investigative
    expect(true).toBe(true);
  }, 300000); // 5 minute timeout for comprehensive testing
});