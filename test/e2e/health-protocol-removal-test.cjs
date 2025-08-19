/**
 * E2E Test: Health Protocol Tab Removal Verification (Puppeteer/CommonJS)
 * 
 * This comprehensive test suite uses Puppeteer to verify that the Health Protocol tab 
 * has been completely removed from both Admin and Trainer dashboards as requested.
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Test configuration
const BASE_URL = 'http://localhost:4000';
const TEST_ACCOUNTS = {
  admin: { email: 'admin@fitmeal.pro', password: 'Admin123!@#' },
  trainer: { email: 'testtrainer@example.com', password: 'TrainerPassword123!' }
};

const EXPECTED_TABS = {
  admin: {
    count: 3,
    tabs: ['Dashboard', 'Users', 'Recipes']
  },
  trainer: {
    count: 4,
    tabs: ['Dashboard', 'Customers', 'Meal Plans', 'Recipes']
  }
};

// Create results directory
const RESULTS_DIR = path.join(process.cwd(), 'test-results', 'health-protocol-removal');
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

class HealthProtocolRemovalTester {
  constructor() {
    this.browser = null;
    this.results = [];
  }

  async setup() {
    console.log('🚀 Starting Health Protocol Tab Removal E2E Tests...');
    
    this.browser = await puppeteer.launch({
      headless: 'new', // Use headless mode for CI
      defaultViewport: { width: 1280, height: 720 },
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
    this.generateReport();
  }

  async loginAs(page, role) {
    const account = TEST_ACCOUNTS[role];
    
    console.log(`🔑 Logging in as ${role}...`);
    await page.goto(BASE_URL);
    
    try {
      await page.waitForSelector('input[type="email"]', { timeout: 10000 });
      
      // Clear existing values and type new ones
      await page.evaluate(() => {
        const emailInput = document.querySelector('input[type="email"]');
        const passwordInput = document.querySelector('input[type="password"]');
        if (emailInput) emailInput.value = '';
        if (passwordInput) passwordInput.value = '';
      });
      
      await page.type('input[type="email"]', account.email);
      await page.type('input[type="password"]', account.password);
      
      // Click login button
      await page.click('button[type="submit"]');
      
      // Wait for navigation or dashboard to appear
      try {
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
      } catch (navError) {
        // If navigation doesn't work, wait for dashboard elements
        await page.waitForTimeout(3000);
      }
      
      // Verify we're logged in by checking for dashboard elements
      const isDashboard = await page.$('nav, .dashboard, [data-testid*="dashboard"]');
      if (!isDashboard) {
        throw new Error('Login may have failed - no dashboard elements found');
      }
      
      console.log(`✅ Successfully logged in as ${role}`);
    } catch (error) {
      console.error(`❌ Login failed for ${role}:`, error.message);
      await this.takeScreenshot(page, `login-error-${role}`);
      throw error;
    }
  }

  async takeScreenshot(page, name) {
    const screenshotPath = path.join(RESULTS_DIR, `${name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot saved: ${name}.png`);
    return screenshotPath;
  }

  async getVisibleTabs(page) {
    console.log('🔍 Searching for navigation tabs...');
    
    // Take screenshot of current state
    await this.takeScreenshot(page, 'tab-search-state');
    
    // Wait for page to stabilize
    await page.waitForTimeout(2000);
    
    // Try multiple strategies to find navigation tabs
    const tabs = await page.evaluate(() => {
      console.log('🔍 Evaluating page for tabs...');
      
      // Strategy 1: Look for common navigation patterns
      const selectors = [
        'nav button',
        'nav a',
        '.nav button',
        '.nav a',
        '.tabs button',
        '.tabs a',
        '.nav-tabs button',
        '.nav-tabs a',
        '[role="tablist"] button',
        '[role="tablist"] a',
        'button[role="tab"]',
        'a[role="tab"]',
        '.tab-navigation button',
        '.tab-navigation a'
      ];
      
      let foundTabs = [];
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        console.log(`Checking selector "${selector}": found ${elements.length} elements`);
        
        for (const element of elements) {
          // Check if element is visible
          const style = window.getComputedStyle(element);
          const isVisible = style.display !== 'none' && 
                           style.visibility !== 'hidden' && 
                           element.offsetParent !== null;
          
          if (isVisible) {
            const text = element.textContent?.trim();
            if (text && text.length > 0) {
              foundTabs.push(text);
              console.log(`Found visible tab: "${text}" using selector "${selector}"`);
            }
          }
        }
        
        if (foundTabs.length > 0) {
          console.log(`✅ Found tabs with selector "${selector}"`);
          break;
        }
      }
      
      // Strategy 2: If no tabs found, look for any clickable elements with relevant text
      if (foundTabs.length === 0) {
        console.log('🔍 No tabs found with standard selectors, trying broader search...');
        
        const allClickable = document.querySelectorAll('button, a, [role="tab"], [role="button"]');
        console.log(`Found ${allClickable.length} clickable elements`);
        
        for (const element of allClickable) {
          const style = window.getComputedStyle(element);
          const isVisible = style.display !== 'none' && 
                           style.visibility !== 'hidden' && 
                           element.offsetParent !== null;
          
          if (isVisible) {
            const text = element.textContent?.trim();
            if (text && ['dashboard', 'users', 'recipes', 'customers', 'meal plans', 'health protocol'].some(keyword => 
                text.toLowerCase().includes(keyword))) {
              foundTabs.push(text);
              console.log(`Found relevant clickable element: "${text}"`);
            }
          }
        }
      }
      
      // Remove duplicates and return
      const uniqueTabs = [...new Set(foundTabs)];
      console.log(`Final tabs found: [${uniqueTabs.join(', ')}]`);
      return uniqueTabs;
    });

    console.log(`📋 Tabs discovered: [${tabs.join(', ')}]`);
    return tabs;
  }

  async testAdminDashboard() {
    const page = await this.browser.newPage();
    
    try {
      console.log('\n🔍 Testing Admin Dashboard for Health Protocol tab removal...');
      
      await this.loginAs(page, 'admin');
      await this.takeScreenshot(page, 'admin-dashboard-after-login');
      
      const tabs = await this.getVisibleTabs(page);
      console.log(`📋 Admin tabs found: [${tabs.join(', ')}]`);
      
      // Check for Health Protocol tab
      const hasHealthProtocolTab = tabs.some(tab => 
        tab.toLowerCase().includes('health') && tab.toLowerCase().includes('protocol')
      );
      
      // Check for expected tabs
      const hasExpectedTabs = EXPECTED_TABS.admin.tabs.every(expectedTab =>
        tabs.some(tab => tab.toLowerCase().includes(expectedTab.toLowerCase()))
      );
      
      const result = {
        role: 'admin',
        tabs: tabs,
        tabCount: tabs.length,
        expectedCount: EXPECTED_TABS.admin.count,
        hasHealthProtocolTab: hasHealthProtocolTab,
        hasExpectedTabs: hasExpectedTabs,
        expectedTabs: EXPECTED_TABS.admin.tabs,
        screenshot: 'admin-dashboard-after-login.png',
        passed: !hasHealthProtocolTab && tabs.length > 0 // At least some tabs should be found
      };

      console.log(`✅ Admin test result: ${result.passed ? 'PASSED' : 'FAILED'}`);
      console.log(`   - Health Protocol tab present: ${hasHealthProtocolTab ? 'YES (❌ FAIL)' : 'NO (✅ PASS)'}`);
      console.log(`   - Has expected tabs: ${hasExpectedTabs ? 'YES (✅ PASS)' : 'NO (⚠️  REVIEW)'}`);
      console.log(`   - Tab count: ${tabs.length}`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Admin dashboard test failed:', error);
      await this.takeScreenshot(page, 'admin-dashboard-error');
      return {
        role: 'admin',
        error: error.message,
        passed: false
      };
    } finally {
      await page.close();
    }
  }

  async testTrainerDashboard() {
    const page = await this.browser.newPage();
    
    try {
      console.log('\n🔍 Testing Trainer Dashboard for Health Protocol tab removal...');
      
      await this.loginAs(page, 'trainer');
      await this.takeScreenshot(page, 'trainer-dashboard-after-login');
      
      const tabs = await this.getVisibleTabs(page);
      console.log(`📋 Trainer tabs found: [${tabs.join(', ')}]`);
      
      // Check for Health Protocol tab
      const hasHealthProtocolTab = tabs.some(tab => 
        tab.toLowerCase().includes('health') && tab.toLowerCase().includes('protocol')
      );
      
      // Check for expected tabs
      const hasExpectedTabs = EXPECTED_TABS.trainer.tabs.every(expectedTab =>
        tabs.some(tab => tab.toLowerCase().includes(expectedTab.toLowerCase()))
      );
      
      const result = {
        role: 'trainer',
        tabs: tabs,
        tabCount: tabs.length,
        expectedCount: EXPECTED_TABS.trainer.count,
        hasHealthProtocolTab: hasHealthProtocolTab,
        hasExpectedTabs: hasExpectedTabs,
        expectedTabs: EXPECTED_TABS.trainer.tabs,
        screenshot: 'trainer-dashboard-after-login.png',
        passed: !hasHealthProtocolTab && tabs.length > 0 // At least some tabs should be found
      };

      console.log(`✅ Trainer test result: ${result.passed ? 'PASSED' : 'FAILED'}`);
      console.log(`   - Health Protocol tab present: ${hasHealthProtocolTab ? 'YES (❌ FAIL)' : 'NO (✅ PASS)'}`);
      console.log(`   - Has expected tabs: ${hasExpectedTabs ? 'YES (✅ PASS)' : 'NO (⚠️  REVIEW)'}`);
      console.log(`   - Tab count: ${tabs.length}`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Trainer dashboard test failed:', error);
      await this.takeScreenshot(page, 'trainer-dashboard-error');
      return {
        role: 'trainer',
        error: error.message,
        passed: false
      };
    } finally {
      await page.close();
    }
  }

  async testPageContent() {
    const page = await this.browser.newPage();
    
    try {
      console.log('\n🔍 Testing page content for Health Protocol references...');
      
      await this.loginAs(page, 'trainer');
      await this.takeScreenshot(page, 'content-analysis');
      
      // Search for any Health Protocol text content
      const hasHealthProtocolContent = await page.evaluate(() => {
        const bodyText = document.body.textContent || '';
        const hasHealthText = bodyText.toLowerCase().includes('health protocol');
        const hasHealthSection = bodyText.toLowerCase().includes('health') && 
                                bodyText.toLowerCase().includes('protocol');
        return {
          fullText: hasHealthText,
          partialText: hasHealthSection,
          bodyTextLength: bodyText.length
        };
      });
      
      const result = {
        type: 'content',
        hasHealthProtocolText: hasHealthProtocolContent.fullText,
        hasHealthAndProtocolText: hasHealthProtocolContent.partialText,
        bodyTextLength: hasHealthProtocolContent.bodyTextLength,
        screenshot: 'content-analysis.png',
        passed: !hasHealthProtocolContent.fullText // Should not have "health protocol" text
      };

      console.log(`✅ Content analysis result: ${result.passed ? 'PASSED' : 'FAILED'}`);
      console.log(`   - "Health Protocol" text present: ${hasHealthProtocolContent.fullText ? 'YES (❌ FAIL)' : 'NO (✅ PASS)'}`);
      console.log(`   - Body text length: ${hasHealthProtocolContent.bodyTextLength} characters`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Content analysis test failed:', error);
      return {
        type: 'content',
        error: error.message,
        passed: false
      };
    } finally {
      await page.close();
    }
  }

  generateReport() {
    const reportPath = path.join(RESULTS_DIR, 'test-report.json');
    const summaryPath = path.join(RESULTS_DIR, 'test-summary.txt');
    
    // Generate JSON report
    const report = {
      timestamp: new Date().toISOString(),
      testSuite: 'Health Protocol Tab Removal Verification',
      baseUrl: BASE_URL,
      results: this.results,
      summary: {
        totalTests: this.results.length,
        passed: this.results.filter(r => r.passed).length,
        failed: this.results.filter(r => !r.passed).length,
        overall: this.results.length > 0 && this.results.every(r => r.passed) ? 'PASSED' : 'FAILED'
      }
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Generate text summary
    let summary = '🔬 HEALTH PROTOCOL TAB REMOVAL - E2E TEST RESULTS\n';
    summary += '=' .repeat(60) + '\n\n';
    summary += `📅 Test Date: ${new Date().toLocaleString()}\n`;
    summary += `🎯 Objective: Verify Health Protocol tab has been removed from GUI\n`;
    summary += `🌐 Base URL: ${BASE_URL}\n\n`;
    
    summary += `📊 OVERALL RESULT: ${report.summary.overall}\n`;
    summary += `   ✅ Tests Passed: ${report.summary.passed}/${report.summary.totalTests}\n`;
    summary += `   ❌ Tests Failed: ${report.summary.failed}/${report.summary.totalTests}\n\n`;
    
    summary += 'DETAILED RESULTS:\n';
    summary += '-' .repeat(30) + '\n';
    
    this.results.forEach((result, index) => {
      summary += `\n${index + 1}. ${(result.role || result.type || 'TEST').toUpperCase()}:\n`;
      summary += `   Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
      
      if (result.tabs) {
        summary += `   Tabs Found: [${result.tabs.join(', ')}]\n`;
        summary += `   Health Protocol Tab: ${result.hasHealthProtocolTab ? 'PRESENT (❌)' : 'NOT FOUND (✅)'}\n`;
        summary += `   Expected Tabs Present: ${result.hasExpectedTabs ? 'YES (✅)' : 'NO/PARTIAL (⚠️)'}\n`;
        summary += `   Tab Count: ${result.tabCount}\n`;
      }
      
      if (result.hasHealthProtocolText !== undefined) {
        summary += `   Health Protocol Text: ${result.hasHealthProtocolText ? 'FOUND (❌)' : 'NOT FOUND (✅)'}\n`;
      }
      
      if (result.error) {
        summary += `   Error: ${result.error}\n`;
      }
      
      if (result.screenshot) {
        summary += `   Screenshot: ${result.screenshot}\n`;
      }
    });
    
    summary += '\n' + '=' .repeat(60) + '\n';
    summary += `📸 Screenshots saved to: ${RESULTS_DIR}\n`;
    summary += `📋 Full report saved to: ${reportPath}\n`;
    
    // Key findings
    const healthProtocolFound = this.results.some(r => r.hasHealthProtocolTab || r.hasHealthProtocolText);
    summary += '\n🔍 KEY FINDINGS:\n';
    summary += healthProtocolFound ? 
      '❌ Health Protocol references still found in the application!\n' :
      '✅ Health Protocol tab and text successfully removed from GUI!\n';
    
    fs.writeFileSync(summaryPath, summary);
    
    console.log('\n📋 TEST COMPLETE - Summary:');
    console.log(summary);
    
    return report;
  }

  async runAllTests() {
    await this.setup();
    
    try {
      // Run all tests
      this.results.push(await this.testAdminDashboard());
      this.results.push(await this.testTrainerDashboard());
      this.results.push(await this.testPageContent());
      
      return this.generateReport();
      
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      return { error: error.message, passed: false };
    } finally {
      await this.cleanup();
    }
  }
}

// Main execution function
async function main() {
  console.log('🎯 Health Protocol Tab Removal E2E Test Suite');
  console.log('=' .repeat(50));
  console.log('🎯 Objective: Verify Health Protocol tab removal from GUI');
  console.log('🌐 Target: ' + BASE_URL);
  console.log('');
  
  const tester = new HealthProtocolRemovalTester();
  const results = await tester.runAllTests();
  
  if (results && results.summary && results.summary.overall === 'PASSED') {
    console.log('\n🎉 ALL TESTS PASSED! Health Protocol tab has been successfully removed.');
    console.log('✅ The GUI no longer contains Health Protocol tab or references.');
    process.exit(0);
  } else {
    console.log('\n❌ TESTS COMPLETED WITH ISSUES! Please review the results and screenshots.');
    if (results && results.summary) {
      console.log(`📊 Summary: ${results.summary.passed}/${results.summary.totalTests} tests passed`);
    }
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { HealthProtocolRemovalTester };