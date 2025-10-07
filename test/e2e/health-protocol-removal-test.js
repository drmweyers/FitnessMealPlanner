/**
 * E2E Test: Health Protocol Tab Removal Verification (Puppeteer/JavaScript)
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
      headless: false, // Show browser for visual verification
      defaultViewport: { width: 1280, height: 720 },
      slowMo: 100, // Slow down for visibility
      args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
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
      
      await page.type('input[type="email"]', account.email);
      await page.type('input[type="password"]', account.password);
      await page.click('button[type="submit"]');
      
      // Wait for navigation
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
      await page.waitForTimeout(3000); // Allow UI to stabilize
      
      console.log(`✅ Successfully logged in as ${role}`);
    } catch (error) {
      console.error(`❌ Login failed for ${role}:`, error.message);
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
    // Try multiple strategies to find navigation tabs
    const selectors = [
      'nav button:visible',
      '.tabs button:visible',
      '.nav-tabs button:visible',
      '[role="tablist"] button:visible',
      'nav a:visible',
      '.tab-navigation button:visible',
      '[data-testid*="tab"]:visible',
      'button[role="tab"]:visible'
    ];

    let tabs = [];

    for (const selector of selectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          const tabTexts = [];
          for (const element of elements) {
            const isVisible = await page.evaluate(el => {
              const style = window.getComputedStyle(el);
              return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
            }, element);
            
            if (isVisible) {
              const text = await page.evaluate(el => el.textContent?.trim() || '', element);
              if (text) {
                tabTexts.push(text);
              }
            }
          }
          
          if (tabTexts.length > 0) {
            tabs = tabTexts;
            console.log(`✅ Found tabs using selector "${selector}": ${tabs.join(', ')}`);
            break;
          }
        }
      } catch (error) {
        // Continue with next selector
      }
    }

    // If no tabs found, try a more general approach
    if (tabs.length === 0) {
      try {
        const allClickableElements = await page.evaluate(() => {
          const elements = Array.from(document.querySelectorAll('button, a, [role="tab"]'));
          return elements
            .filter(el => {
              const style = window.getComputedStyle(el);
              const text = el.textContent?.trim() || '';
              return style.display !== 'none' && 
                     style.visibility !== 'hidden' && 
                     el.offsetParent !== null &&
                     text &&
                     ['dashboard', 'users', 'recipes', 'customers', 'meal plans', 'health protocol'].some(keyword => 
                       text.toLowerCase().includes(keyword)
                     );
            })
            .map(el => el.textContent?.trim())
            .filter(text => text);
        });
        
        tabs = [...new Set(allClickableElements)]; // Remove duplicates
        if (tabs.length > 0) {
          console.log(`✅ Found tabs using general search: ${tabs.join(', ')}`);
        }
      } catch (error) {
        console.warn('Could not find tabs with general search:', error.message);
      }
    }

    return tabs;
  }

  async testAdminDashboard() {
    const page = await this.browser.newPage();
    
    try {
      console.log('\n🔍 Testing Admin Dashboard for Health Protocol tab removal...');
      
      await this.loginAs(page, 'admin');
      await this.takeScreenshot(page, 'admin-dashboard');
      
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
        screenshot: 'admin-dashboard.png',
        passed: !hasHealthProtocolTab && hasExpectedTabs
      };

      console.log(`✅ Admin test result: ${result.passed ? 'PASSED' : 'FAILED'}`);
      console.log(`   - Health Protocol tab present: ${hasHealthProtocolTab ? 'YES (❌ FAIL)' : 'NO (✅ PASS)'}`);
      console.log(`   - Has expected tabs: ${hasExpectedTabs ? 'YES (✅ PASS)' : 'NO (❌ FAIL)'}`);
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
      await this.takeScreenshot(page, 'trainer-dashboard');
      
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
        screenshot: 'trainer-dashboard.png',
        passed: !hasHealthProtocolTab && hasExpectedTabs
      };

      console.log(`✅ Trainer test result: ${result.passed ? 'PASSED' : 'FAILED'}`);
      console.log(`   - Health Protocol tab present: ${hasHealthProtocolTab ? 'YES (❌ FAIL)' : 'NO (✅ PASS)'}`);
      console.log(`   - Has expected tabs: ${hasExpectedTabs ? 'YES (✅ PASS)' : 'NO (❌ FAIL)'}`);
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

  async testNavigationFlow() {
    const page = await this.browser.newPage();
    
    try {
      console.log('\n🔄 Testing navigation flow after Health Protocol tab removal...');
      
      await this.loginAs(page, 'trainer'); // Test trainer as it has more tabs
      const tabs = await this.getVisibleTabs(page);
      
      const navigationResults = [];
      
      for (let i = 0; i < Math.min(tabs.length, 4); i++) {
        const tab = tabs[i];
        console.log(`🔍 Testing navigation to: ${tab}`);
        
        try {
          // Try to click the tab
          await page.click(`button:has-text("${tab}"), a:has-text("${tab}")`, { timeout: 3000 });
          await page.waitForTimeout(2000);
          
          // Check for errors
          const hasError = await page.$('text=/error/i, text=/404/i, text=/not found/i') !== null;
          
          await this.takeScreenshot(page, `navigation-${tab.toLowerCase().replace(/\s+/g, '-')}`);
          
          navigationResults.push({
            tab: tab,
            success: !hasError,
            screenshot: `navigation-${tab.toLowerCase().replace(/\s+/g, '-')}.png`
          });
          
          console.log(`✅ Navigation to ${tab}: ${!hasError ? 'SUCCESS' : 'FAILED'}`);
          
        } catch (error) {
          console.warn(`⚠️  Navigation to ${tab} failed:`, error.message);
          navigationResults.push({
            tab: tab,
            success: false,
            error: error.message
          });
        }
      }
      
      return {
        type: 'navigation',
        results: navigationResults,
        passed: navigationResults.every(r => r.success)
      };
      
    } catch (error) {
      console.error('❌ Navigation test failed:', error);
      return {
        type: 'navigation',
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
        overall: this.results.every(r => r.passed) ? 'PASSED' : 'FAILED'
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
    summary += `   ✅ Tests Passed: ${report.summary.passed}\n`;
    summary += `   ❌ Tests Failed: ${report.summary.failed}\n`;
    summary += `   📋 Total Tests: ${report.summary.totalTests}\n\n`;
    
    summary += 'DETAILED RESULTS:\n';
    summary += '-' .repeat(30) + '\n';
    
    this.results.forEach((result, index) => {
      summary += `\n${index + 1}. ${(result.role || result.type || 'TEST').toUpperCase()}:\n`;
      summary += `   Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
      
      if (result.tabs) {
        summary += `   Tabs Found: [${result.tabs.join(', ')}]\n`;
        summary += `   Health Protocol Present: ${result.hasHealthProtocolTab ? 'YES (❌)' : 'NO (✅)'}\n`;
        summary += `   Expected Tabs Present: ${result.hasExpectedTabs ? 'YES (✅)' : 'NO (❌)'}\n`;
        summary += `   Tab Count: ${result.tabCount}\n`;
      }
      
      if (result.error) {
        summary += `   Error: ${result.error}\n`;
      }
      
      if (result.screenshot) {
        summary += `   Screenshot: ${result.screenshot}\n`;
      }
      
      if (result.results) {
        summary += `   Navigation Tests:\n`;
        result.results.forEach(navResult => {
          summary += `     - ${navResult.tab}: ${navResult.success ? '✅' : '❌'}\n`;
        });
      }
    });
    
    summary += '\n' + '=' .repeat(60) + '\n';
    summary += `📸 Screenshots saved to: ${RESULTS_DIR}\n`;
    summary += `📋 Full report saved to: ${reportPath}\n`;
    
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
      this.results.push(await this.testNavigationFlow());
      
      return this.generateReport();
      
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      return { error: error.message, passed: false };
    } finally {
      await this.cleanup();
    }
  }
}

// Run the tests
async function main() {
  console.log('🎯 Health Protocol Tab Removal E2E Test Suite');
  console.log('=' .repeat(50));
  
  const tester = new HealthProtocolRemovalTester();
  const results = await tester.runAllTests();
  
  if (results.summary && results.summary.overall === 'PASSED') {
    console.log('\n🎉 ALL TESTS PASSED! Health Protocol tab has been successfully removed.');
    process.exit(0);
  } else {
    console.log('\n❌ SOME TESTS FAILED! Please review the results and screenshots.');
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