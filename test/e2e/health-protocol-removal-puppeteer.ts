/**
 * E2E Test: Health Protocol Tab Removal Verification (Puppeteer)
 * 
 * This comprehensive test suite uses Puppeteer to verify that the Health Protocol tab 
 * has been completely removed from both Admin and Trainer dashboards as requested.
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import path from 'path';
import fs from 'fs';

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
  private browser: Browser | null = null;
  private results: any[] = [];

  async setup() {
    console.log('🚀 Starting Health Protocol Tab Removal E2E Tests...');
    
    this.browser = await puppeteer.launch({
      headless: false, // Show browser for visual verification
      defaultViewport: { width: 1280, height: 720 },
      slowMo: 100, // Slow down for visibility
      args: ['--start-maximized']
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
    this.generateReport();
  }

  async loginAs(page: Page, role: 'admin' | 'trainer') {
    const account = TEST_ACCOUNTS[role];
    
    console.log(`🔑 Logging in as ${role}...`);
    await page.goto(BASE_URL);
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    await page.type('input[type="email"]', account.email);
    await page.type('input[type="password"]', account.password);
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
    await page.waitForTimeout(2000); // Allow UI to stabilize
  }

  async takeScreenshot(page: Page, name: string) {
    const screenshotPath = path.join(RESULTS_DIR, `${name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot saved: ${name}.png`);
    return screenshotPath;
  }

  async getVisibleTabs(page: Page): Promise<string[]> {
    // Try multiple strategies to find navigation tabs
    const selectors = [
      'nav button',
      '.tabs button',
      '.nav-tabs button',
      '[role="tablist"] button',
      'nav a',
      '.tab-navigation button',
      '[data-testid*="tab"]',
      'button[role="tab"]'
    ];

    let tabs: string[] = [];

    for (const selector of selectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          tabs = await Promise.all(
            elements.map(async (element) => {
              const text = await page.evaluate(el => el.textContent?.trim() || '', element);
              return text;
            })
          );
          tabs = tabs.filter(tab => tab.length > 0);
          if (tabs.length > 0) {
            console.log(`✅ Found tabs using selector "${selector}": ${tabs.join(', ')}`);
            break;
          }
        }
      } catch (error) {
        // Continue with next selector
      }
    }

    return tabs;
  }

  async testAdminDashboard(): Promise<any> {
    const page = await this.browser!.newPage();
    
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
      
      const result = {
        role: 'admin',
        tabs: tabs,
        tabCount: tabs.length,
        expectedCount: EXPECTED_TABS.admin.count,
        hasHealthProtocolTab: hasHealthProtocolTab,
        expectedTabs: EXPECTED_TABS.admin.tabs,
        screenshot: 'admin-dashboard.png',
        passed: !hasHealthProtocolTab && tabs.length >= EXPECTED_TABS.admin.count
      };

      console.log(`✅ Admin test result: ${result.passed ? 'PASSED' : 'FAILED'}`);
      console.log(`   - Health Protocol tab present: ${hasHealthProtocolTab ? 'YES (❌ FAIL)' : 'NO (✅ PASS)'}`);
      console.log(`   - Tab count: ${tabs.length} (expected >= ${EXPECTED_TABS.admin.count})`);
      
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

  async testTrainerDashboard(): Promise<any> {
    const page = await this.browser!.newPage();
    
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
      
      const result = {
        role: 'trainer',
        tabs: tabs,
        tabCount: tabs.length,
        expectedCount: EXPECTED_TABS.trainer.count,
        hasHealthProtocolTab: hasHealthProtocolTab,
        expectedTabs: EXPECTED_TABS.trainer.tabs,
        screenshot: 'trainer-dashboard.png',
        passed: !hasHealthProtocolTab && tabs.length >= EXPECTED_TABS.trainer.count
      };

      console.log(`✅ Trainer test result: ${result.passed ? 'PASSED' : 'FAILED'}`);
      console.log(`   - Health Protocol tab present: ${hasHealthProtocolTab ? 'YES (❌ FAIL)' : 'NO (✅ PASS)'}`);
      console.log(`   - Tab count: ${tabs.length} (expected >= ${EXPECTED_TABS.trainer.count})`);
      
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

  async testNavigationFlow(): Promise<any> {
    const page = await this.browser!.newPage();
    
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
          await page.click(`text=${tab}`, { timeout: 5000 });
          await page.waitForTimeout(2000);
          
          // Check for errors
          const hasError = await page.$('text=/error/i, text=/404/i, text=/not found/i');
          
          await this.takeScreenshot(page, `navigation-${tab.toLowerCase().replace(/\s+/g, '-')}`);
          
          navigationResults.push({
            tab: tab,
            success: !hasError,
            screenshot: `navigation-${tab.toLowerCase().replace(/\s+/g, '-')}.png`
          });
          
          console.log(`✅ Navigation to ${tab}: ${!hasError ? 'SUCCESS' : 'FAILED'}`);
          
        } catch (error) {
          console.warn(`⚠️  Navigation to ${tab} failed:`, error);
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
    summary += `🎯 Objective: Verify Health Protocol tab has been removed from GUI\n\n`;
    
    summary += `📊 OVERALL RESULT: ${report.summary.overall}\n`;
    summary += `   ✅ Tests Passed: ${report.summary.passed}\n`;
    summary += `   ❌ Tests Failed: ${report.summary.failed}\n`;
    summary += `   📋 Total Tests: ${report.summary.totalTests}\n\n`;
    
    summary += 'DETAILED RESULTS:\n';
    summary += '-' .repeat(30) + '\n';
    
    this.results.forEach((result, index) => {
      summary += `\n${index + 1}. ${result.role?.toUpperCase() || result.type?.toUpperCase()} TEST:\n`;
      summary += `   Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
      
      if (result.tabs) {
        summary += `   Tabs Found: [${result.tabs.join(', ')}]\n`;
        summary += `   Health Protocol Present: ${result.hasHealthProtocolTab ? 'YES (❌)' : 'NO (✅)'}\n`;
        summary += `   Tab Count: ${result.tabCount} (expected >= ${result.expectedCount})\n`;
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
    
    fs.writeFileSync(summaryPath, summary);
    
    console.log('\n📋 TEST COMPLETE - Summary:');
    console.log(summary);
  }

  async runAllTests() {
    await this.setup();
    
    try {
      // Run all tests
      this.results.push(await this.testAdminDashboard());
      this.results.push(await this.testTrainerDashboard());
      this.results.push(await this.testNavigationFlow());
      
    } catch (error) {
      console.error('❌ Test execution failed:', error);
    } finally {
      await this.cleanup();
    }
  }
}

// Run the tests
async function main() {
  const tester = new HealthProtocolRemovalTester();
  await tester.runAllTests();
}

// Execute if run directly
if (require.main === module) {
  main().catch(console.error);
}

export { HealthProtocolRemovalTester };