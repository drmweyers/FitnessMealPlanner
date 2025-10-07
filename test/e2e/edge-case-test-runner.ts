/**
 * Edge Case Test Runner
 * Comprehensive test orchestration for Health Protocol elimination validation
 */

import { test, expect, Page, Browser, BrowserContext } from '@playwright/test';
import { loginAsTrainer } from './helpers/auth';

interface TestResult {
  testName: string;
  category: string;
  passed: boolean;
  duration: number;
  errorMessage?: string;
  details?: any;
}

interface EdgeCaseTestReport {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  categories: string[];
  results: TestResult[];
  summary: {
    healthProtocolDetected: boolean;
    tabCountConsistent: boolean;
    performanceWithinLimits: boolean;
    securityTestsPassed: boolean;
    uxValidationPassed: boolean;
  };
}

class EdgeCaseTestOrchestrator {
  private browser: Browser;
  private context: BrowserContext;
  private page: Page;
  private results: TestResult[] = [];

  constructor(browser: Browser) {
    this.browser = browser;
  }

  async initialize(): Promise<void> {
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
    await loginAsTrainer(this.page);
    
    console.log('🚀 Edge Case Test Orchestrator Initialized');
    console.log('📊 Health Protocol Elimination Comprehensive Testing Started');
  }

  async cleanup(): Promise<void> {
    if (this.page) await this.page.close();
    if (this.context) await this.context.close();
  }

  private async runTest(
    testName: string, 
    category: string, 
    testFunction: () => Promise<any>
  ): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🧪 Running: ${category} > ${testName}`);
      
      const result = await testFunction();
      const duration = Date.now() - startTime;
      
      console.log(`✅ Passed: ${testName} (${duration}ms)`);
      
      return {
        testName,
        category,
        passed: true,
        duration,
        details: result
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.log(`❌ Failed: ${testName} (${duration}ms) - ${error.message}`);
      
      return {
        testName,
        category,
        passed: false,
        duration,
        errorMessage: error.message
      };
    }
  }

  async runNavigationEdgeCases(): Promise<void> {
    console.log('\n🧭 Navigation Edge Cases');
    console.log('================================');

    // URL Manipulation Tests
    const urlManipulationTest = await this.runTest(
      'URL Manipulation Resistance',
      'Navigation',
      async () => {
        const maliciousUrls = [
          '/trainer#health-protocol',
          '/trainer?tab=health-protocol',
          '/trainer/health-protocol',
          '/health-protocol',
          '/trainer?health=true',
        ];

        for (const url of maliciousUrls) {
          await this.page.goto(`http://localhost:4000${url}`, { waitUntil: 'networkidle' });
          
          const healthCount = await this.page.locator('text=Health Protocol').count();
          if (healthCount > 0) {
            throw new Error(`Health Protocol found at URL: ${url}`);
          }
          
          const tabCount = await this.page.locator('[role="tab"]').count();
          if (tabCount !== 4) {
            throw new Error(`Tab count incorrect at URL: ${url}. Expected 4, got ${tabCount}`);
          }
        }
        
        return { testedUrls: maliciousUrls.length };
      }
    );
    this.results.push(urlManipulationTest);

    // Deep Linking Test
    const deepLinkingTest = await this.runTest(
      'Deep Linking Functionality',
      'Navigation',
      async () => {
        const validLinks = [
          { url: '/trainer', expectedContent: 'Browse Recipes' },
          { url: '/meal-plan-generator', expectedContent: 'Generate Plans' },
          { url: '/trainer/customers', expectedContent: 'Customers' },
          { url: '/trainer/meal-plans', expectedContent: 'Saved Plans' },
        ];

        for (const link of validLinks) {
          await this.page.goto(`http://localhost:4000${link.url}`, { waitUntil: 'networkidle' });
          
          const activeTab = await this.page.locator('[data-state="active"]').textContent();
          if (!activeTab?.includes(link.expectedContent)) {
            throw new Error(`Deep link failed: ${link.url}. Expected ${link.expectedContent}`);
          }
        }
        
        return { testedLinks: validLinks.length };
      }
    );
    this.results.push(deepLinkingTest);

    // Browser Navigation Test
    const browserNavigationTest = await this.runTest(
      'Browser Back/Forward Navigation',
      'Navigation',
      async () => {
        const tabs = ['Generate Plans', 'Customers', 'Saved Plans', 'Browse Recipes'];
        
        // Navigate through tabs
        for (const tab of tabs) {
          await this.page.click(`text=${tab}`);
          await this.page.waitForTimeout(100);
        }
        
        // Test back navigation
        for (let i = 0; i < tabs.length; i++) {
          await this.page.goBack();
          await this.page.waitForTimeout(200);
          
          const healthCount = await this.page.locator('text=Health Protocol').count();
          if (healthCount > 0) {
            throw new Error(`Health Protocol appeared during back navigation at step ${i}`);
          }
        }
        
        // Test forward navigation
        for (let i = 0; i < tabs.length; i++) {
          await this.page.goForward();
          await this.page.waitForTimeout(200);
          
          const healthCount = await this.page.locator('text=Health Protocol').count();
          if (healthCount > 0) {
            throw new Error(`Health Protocol appeared during forward navigation at step ${i}`);
          }
        }
        
        return { navigationCycles: tabs.length * 2 };
      }
    );
    this.results.push(browserNavigationTest);
  }

  async runPerformanceEdgeCases(): Promise<void> {
    console.log('\n⚡ Performance Edge Cases');
    console.log('================================');

    // Rapid Tab Switching Stress Test
    const rapidTabSwitchingTest = await this.runTest(
      'Rapid Tab Switching Stress Test',
      'Performance',
      async () => {
        const startTime = Date.now();
        let healthProtocolSeen = false;
        
        for (let i = 0; i < 50; i++) {
          await this.page.click('text=Browse Recipes');
          await this.page.click('text=Generate Plans');
          await this.page.click('text=Customers');
          await this.page.click('text=Saved Plans');
          
          if (i % 10 === 0) {
            const healthCount = await this.page.locator('text=Health Protocol').count();
            if (healthCount > 0) {
              healthProtocolSeen = true;
              break;
            }
          }
        }
        
        const duration = Date.now() - startTime;
        
        if (healthProtocolSeen) {
          throw new Error('Health Protocol appeared during rapid switching');
        }
        
        if (duration > 30000) {
          throw new Error(`Rapid switching too slow: ${duration}ms`);
        }
        
        return { cycles: 50, duration };
      }
    );
    this.results.push(rapidTabSwitchingTest);

    // Memory Leak Detection
    const memoryLeakTest = await this.runTest(
      'Memory Leak Detection',
      'Performance',
      async () => {
        const initialElements = await this.page.evaluate(() => 
          document.querySelectorAll('*').length
        );
        
        // Extended session simulation
        for (let i = 0; i < 100; i++) {
          await this.page.click('text=Browse Recipes');
          await this.page.waitForTimeout(25);
          await this.page.click('text=Generate Plans');
          await this.page.waitForTimeout(25);
          
          if (i % 25 === 0) {
            const currentElements = await this.page.evaluate(() => 
              document.querySelectorAll('*').length
            );
            const growth = currentElements - initialElements;
            
            if (growth > 500) {
              throw new Error(`Excessive DOM growth detected: +${growth} elements`);
            }
          }
        }
        
        const finalElements = await this.page.evaluate(() => 
          document.querySelectorAll('*').length
        );
        const totalGrowth = finalElements - initialElements;
        
        return { 
          initialElements, 
          finalElements, 
          growth: totalGrowth,
          cycles: 100 
        };
      }
    );
    this.results.push(memoryLeakTest);

    // Network Interruption Recovery
    const networkRecoveryTest = await this.runTest(
      'Network Interruption Recovery',
      'Performance',
      async () => {
        let recoveredSuccessfully = 0;
        
        for (let cycle = 0; cycle < 5; cycle++) {
          // Simulate network interruption
          await this.page.route('**/*', (route) => {
            if (Math.random() < 0.4) {
              route.abort();
            } else {
              route.continue();
            }
          });
          
          try {
            await this.page.click('text=Browse Recipes');
            await this.page.waitForTimeout(200);
          } catch (e) {
            // Expected during network issues
          }
          
          // Remove network interruption
          await this.page.unroute('**/*');
          
          try {
            await this.page.reload({ waitUntil: 'networkidle', timeout: 10000 });
            
            const healthCount = await this.page.locator('text=Health Protocol').count();
            if (healthCount > 0) {
              throw new Error(`Health Protocol appeared after network recovery in cycle ${cycle}`);
            }
            
            const tabCount = await this.page.locator('[role="tab"]').count();
            if (tabCount === 4) {
              recoveredSuccessfully++;
            }
          } catch (e) {
            console.log(`Recovery failed for cycle ${cycle}: ${e.message}`);
          }
        }
        
        if (recoveredSuccessfully < 3) {
          throw new Error(`Poor recovery rate: ${recoveredSuccessfully}/5`);
        }
        
        return { 
          totalCycles: 5, 
          successfulRecoveries: recoveredSuccessfully 
        };
      }
    );
    this.results.push(networkRecoveryTest);
  }

  async runSecurityEdgeCases(): Promise<void> {
    console.log('\n🛡️ Security Edge Cases');
    console.log('================================');

    // XSS Prevention Test
    const xssPreventionTest = await this.runTest(
      'XSS Prevention',
      'Security',
      async () => {
        const xssPayloads = [
          '<script>window.healthProtocol = true;</script>',
          '<img src="x" onerror="document.body.innerHTML+=\'Health Protocol\'">',
          'javascript:void(document.body.innerHTML+=`Health Protocol`)',
          '<svg onload="alert(\'Health Protocol\')">',
        ];

        for (const payload of xssPayloads) {
          try {
            // Try various injection points
            await this.page.goto(`http://localhost:4000/trainer?search=${encodeURIComponent(payload)}`);
            await this.page.waitForTimeout(500);
            
            const healthCount = await this.page.locator('text=Health Protocol').count();
            if (healthCount > 0) {
              throw new Error(`XSS payload succeeded: ${payload}`);
            }
          } catch (e) {
            if (e.message.includes('XSS payload succeeded')) {
              throw e;
            }
            // Other errors expected (payload blocked)
          }
        }
        
        return { testedPayloads: xssPayloads.length };
      }
    );
    this.results.push(xssPreventionTest);

    // DOM Manipulation Resistance
    const domManipulationTest = await this.runTest(
      'DOM Manipulation Resistance',
      'Security',
      async () => {
        const manipulationAttempts = [
          `
            const tab = document.createElement('button');
            tab.textContent = 'Health Protocol';
            tab.setAttribute('role', 'tab');
            document.querySelector('[role="tablist"]').appendChild(tab);
          `,
          `
            Object.prototype.healthProtocol = true;
            document.body.innerHTML += '<div>Health Protocol</div>';
          `,
          `
            const observer = new MutationObserver(() => {
              document.body.innerHTML += 'Health Protocol';
            });
            observer.observe(document.body, { childList: true });
          `,
        ];

        for (const attempt of manipulationAttempts) {
          try {
            await this.page.evaluate(attempt);
            await this.page.waitForTimeout(1000);
            
            const healthCount = await this.page.locator('text=Health Protocol').count();
            if (healthCount > 0) {
              throw new Error('DOM manipulation succeeded');
            }
          } catch (e) {
            if (e.message === 'DOM manipulation succeeded') {
              throw e;
            }
            // Other errors expected (manipulation blocked)
          }
        }
        
        return { testedAttempts: manipulationAttempts.length };
      }
    );
    this.results.push(domManipulationTest);

    // Storage Manipulation Resistance
    const storageManipulationTest = await this.runTest(
      'Storage Manipulation Resistance',
      'Security',
      async () => {
        await this.page.evaluate(() => {
          localStorage.setItem('health-protocol-enabled', 'true');
          localStorage.setItem('trainer-tabs', JSON.stringify([
            'recipes', 'meal-plan', 'customers', 'saved-plans', 'health-protocol'
          ]));
          sessionStorage.setItem('health-protocol-active', 'true');
        });
        
        await this.page.reload({ waitUntil: 'networkidle' });
        
        const healthCount = await this.page.locator('text=Health Protocol').count();
        if (healthCount > 0) {
          throw new Error('Storage manipulation succeeded in restoring Health Protocol');
        }
        
        const tabCount = await this.page.locator('[role="tab"]').count();
        if (tabCount !== 4) {
          throw new Error(`Storage manipulation affected tab count: ${tabCount}`);
        }
        
        return { manipulationBlocked: true };
      }
    );
    this.results.push(storageManipulationTest);
  }

  async runUXValidationEdgeCases(): Promise<void> {
    console.log('\n🎨 UX Validation Edge Cases');
    console.log('================================');

    // Visual Consistency Test
    const visualConsistencyTest = await this.runTest(
      'Visual Design Consistency',
      'UX',
      async () => {
        const tabMetrics = await this.page.evaluate(() => {
          const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
          return tabs.map(tab => {
            const rect = tab.getBoundingClientRect();
            const styles = window.getComputedStyle(tab);
            return {
              width: rect.width,
              height: rect.height,
              fontSize: styles.fontSize,
              fontFamily: styles.fontFamily,
              padding: styles.padding
            };
          });
        });
        
        if (tabMetrics.length !== 4) {
          throw new Error(`Expected 4 tabs, found ${tabMetrics.length}`);
        }
        
        // Check consistency
        const firstTab = tabMetrics[0];
        for (let i = 1; i < tabMetrics.length; i++) {
          if (tabMetrics[i].height !== firstTab.height) {
            throw new Error(`Tab ${i + 1} height inconsistent`);
          }
          if (tabMetrics[i].fontSize !== firstTab.fontSize) {
            throw new Error(`Tab ${i + 1} font size inconsistent`);
          }
        }
        
        return { tabCount: tabMetrics.length, consistent: true };
      }
    );
    this.results.push(visualConsistencyTest);

    // Responsiveness Test
    const responsivenessTest = await this.runTest(
      'Responsive Design Validation',
      'UX',
      async () => {
        const viewports = [
          { width: 320, height: 568 },
          { width: 768, height: 1024 },
          { width: 1920, height: 1080 }
        ];
        
        for (const viewport of viewports) {
          await this.page.setViewportSize(viewport);
          await this.page.waitForTimeout(500);
          
          const tabCount = await this.page.locator('[role="tab"]').count();
          if (tabCount !== 4) {
            throw new Error(`Tab count incorrect at ${viewport.width}x${viewport.height}: ${tabCount}`);
          }
          
          const healthCount = await this.page.locator('text=Health Protocol').count();
          if (healthCount > 0) {
            throw new Error(`Health Protocol visible at ${viewport.width}x${viewport.height}`);
          }
        }
        
        return { testedViewports: viewports.length };
      }
    );
    this.results.push(responsivenessTest);

    // Accessibility Test
    const accessibilityTest = await this.runTest(
      'Accessibility Validation',
      'UX',
      async () => {
        // Test keyboard navigation
        await this.page.keyboard.press('Tab');
        
        let focusedHealthProtocol = false;
        
        for (let i = 0; i < 20; i++) {
          await this.page.keyboard.press('Tab');
          
          const focusedElement = await this.page.locator(':focus');
          const focusedText = await focusedElement.textContent();
          
          if (focusedText && focusedText.includes('Health Protocol')) {
            focusedHealthProtocol = true;
            break;
          }
        }
        
        if (focusedHealthProtocol) {
          throw new Error('Health Protocol found in focus chain');
        }
        
        return { keyboardNavigationClean: true };
      }
    );
    this.results.push(accessibilityTest);
  }

  async generateReport(): Promise<EdgeCaseTestReport> {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const categories = [...new Set(this.results.map(r => r.category))];
    
    // Analyze results for summary
    const healthProtocolDetected = this.results.some(r => 
      r.errorMessage?.toLowerCase().includes('health protocol')
    );
    
    const tabCountConsistent = this.results.every(r => 
      !r.errorMessage?.toLowerCase().includes('tab count') || r.passed
    );
    
    const performanceWithinLimits = this.results
      .filter(r => r.category === 'Performance')
      .every(r => r.passed);
    
    const securityTestsPassed = this.results
      .filter(r => r.category === 'Security')
      .every(r => r.passed);
    
    const uxValidationPassed = this.results
      .filter(r => r.category === 'UX')
      .every(r => r.passed);

    return {
      totalTests,
      passedTests,
      failedTests,
      categories,
      results: this.results,
      summary: {
        healthProtocolDetected,
        tabCountConsistent,
        performanceWithinLimits,
        securityTestsPassed,
        uxValidationPassed
      }
    };
  }

  async runAllEdgeCases(): Promise<EdgeCaseTestReport> {
    console.log('🎯 COMPREHENSIVE EDGE CASE TESTING INITIATED');
    console.log('==============================================');
    console.log('Target: Health Protocol Elimination Validation');
    console.log('Scope: Navigation, Performance, Security, UX');
    console.log('==============================================\n');

    const startTime = Date.now();

    try {
      await this.runNavigationEdgeCases();
      await this.runPerformanceEdgeCases();
      await this.runSecurityEdgeCases();
      await this.runUXValidationEdgeCases();

      const report = await this.generateReport();
      const duration = Date.now() - startTime;

      console.log('\n🏁 EDGE CASE TESTING COMPLETED');
      console.log('==============================');
      console.log(`⏱️  Total Duration: ${duration}ms`);
      console.log(`📊 Total Tests: ${report.totalTests}`);
      console.log(`✅ Passed: ${report.passedTests}`);
      console.log(`❌ Failed: ${report.failedTests}`);
      console.log(`📈 Success Rate: ${((report.passedTests / report.totalTests) * 100).toFixed(1)}%`);
      console.log('\n🎯 SUMMARY:');
      console.log(`🚫 Health Protocol Detected: ${report.summary.healthProtocolDetected ? '❌ YES' : '✅ NO'}`);
      console.log(`🎛️  Tab Count Consistent: ${report.summary.tabCountConsistent ? '✅ YES' : '❌ NO'}`);
      console.log(`⚡ Performance Within Limits: ${report.summary.performanceWithinLimits ? '✅ YES' : '❌ NO'}`);
      console.log(`🛡️  Security Tests Passed: ${report.summary.securityTestsPassed ? '✅ YES' : '❌ NO'}`);
      console.log(`🎨 UX Validation Passed: ${report.summary.uxValidationPassed ? '✅ YES' : '❌ NO'}`);

      if (report.failedTests > 0) {
        console.log('\n❌ FAILED TESTS:');
        report.results.filter(r => !r.passed).forEach(result => {
          console.log(`   • ${result.category} > ${result.testName}: ${result.errorMessage}`);
        });
      }

      return report;
    } catch (error) {
      console.error('🔥 CRITICAL ERROR in edge case testing:', error);
      throw error;
    }
  }
}

// Export for use in Playwright tests
export { EdgeCaseTestOrchestrator, TestResult, EdgeCaseTestReport };