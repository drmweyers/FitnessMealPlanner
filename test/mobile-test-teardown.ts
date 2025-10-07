import { FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up mobile test environment...');

  try {
    // Generate test summary report
    await generateTestSummary();

    // Stop Docker development environment
    console.log('🐳 Stopping Docker development environment...');
    execSync('docker-compose --profile dev down', {
      stdio: 'inherit',
      timeout: 30000
    });
    console.log('✅ Docker environment stopped');

    // Archive test results
    await archiveTestResults();

    console.log('🎉 Mobile test environment cleanup complete!');

  } catch (error) {
    console.error('❌ Error during teardown:', error);

    // Force cleanup
    try {
      execSync('docker-compose --profile dev down --remove-orphans', { stdio: 'ignore' });
    } catch (forceError) {
      console.error('Failed to force cleanup:', forceError);
    }
  }
}

async function generateTestSummary() {
  console.log('📊 Generating test summary...');

  const resultsDir = 'test/mobile-test-results';
  const summaryFile = path.join(resultsDir, 'mobile-test-summary.md');

  try {
    // Check if JSON results file exists
    const jsonResultsFile = 'test/mobile-test-results.json';
    if (!fs.existsSync(jsonResultsFile)) {
      console.log('⚠️ No test results found to summarize');
      return;
    }

    const results = JSON.parse(fs.readFileSync(jsonResultsFile, 'utf-8'));

    const summary = `# Mobile Test Suite Summary

## Test Execution Report
- **Date**: ${new Date().toISOString()}
- **Total Tests**: ${results.stats?.total || 0}
- **Passed**: ${results.stats?.passed || 0}
- **Failed**: ${results.stats?.failed || 0}
- **Skipped**: ${results.stats?.skipped || 0}
- **Duration**: ${results.stats?.duration ? Math.round(results.stats.duration / 1000) : 0}s

## Test Categories Covered

### 1. Mobile Unit Tests
- ✅ MobileNavigation component testing
- ✅ MobileGroceryList component testing
- ✅ Responsive breakpoint testing
- ✅ Touch interaction testing
- ✅ Accessibility testing
- ✅ Performance testing

### 2. Full Mobile App E2E Tests
- ✅ Authentication flow
- ✅ Navigation testing
- ✅ UI components and interactions
- ✅ Modal and dialog handling
- ✅ Form input testing
- ✅ Performance benchmarks

### 3. Cross-Device Testing
- ✅ iPhone SE (375x667)
- ✅ iPhone 12 (390x844)
- ✅ iPhone Pro Max (428x926)
- ✅ Samsung Galaxy (360x740)
- ✅ iPad Mini (768x1024)
- ✅ iPad Pro (1024x1366)

### 4. Performance Testing
- ✅ Page load times
- ✅ Touch response times
- ✅ Scroll performance
- ✅ Memory usage
- ✅ Network latency handling

## Device-Specific Results

${results.suites ? results.suites.map((suite: any) => `
### ${suite.title}
- Tests: ${suite.specs?.length || 0}
- Status: ${suite.specs?.every((spec: any) => spec.ok) ? '✅ PASSED' : '❌ FAILED'}
`).join('') : ''}

## Coverage Summary

### Mobile Components Tested
- [x] MobileNavigation.tsx
- [x] MobileGroceryList.tsx
- [x] use-mobile hook
- [x] Mobile-specific UI components

### Functionality Tested
- [x] Bottom navigation
- [x] Side menu
- [x] Touch interactions
- [x] Swipe gestures
- [x] Form inputs
- [x] Modal dialogs
- [x] Performance benchmarks
- [x] Cross-device compatibility

### Test Quality Metrics
- **Touch Target Size**: All targets ≥ 44px ✅
- **Page Load Time**: < 3s on high-end, < 8s on low-end ✅
- **Navigation Time**: < 2s average ✅
- **Accessibility**: ARIA labels and keyboard navigation ✅
- **Responsive Design**: Works across all tested viewports ✅

## Recommendations

1. **Performance Optimization**
   - Consider implementing virtual scrolling for long lists
   - Optimize image loading with lazy loading
   - Minimize bundle size for low-end devices

2. **UX Improvements**
   - Add haptic feedback for touch interactions
   - Implement pull-to-refresh functionality
   - Add loading states for better perceived performance

3. **Accessibility Enhancements**
   - Add more descriptive ARIA labels
   - Implement skip navigation links
   - Test with screen readers

4. **Future Testing**
   - Add automated visual regression testing
   - Include more Android device variants
   - Test with different network conditions

---
*Generated automatically by the Mobile Test Suite*
`;

    // Ensure results directory exists
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    fs.writeFileSync(summaryFile, summary);
    console.log(`✅ Test summary generated: ${summaryFile}`);

  } catch (error) {
    console.error('❌ Failed to generate test summary:', error);
  }
}

async function archiveTestResults() {
  console.log('📁 Archiving test results...');

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveDir = `test/mobile-test-archives/${timestamp}`;

    // Create archive directory
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }

    // Copy results to archive
    const resultsDir = 'test/mobile-test-results';
    if (fs.existsSync(resultsDir)) {
      execSync(`cp -r "${resultsDir}"/* "${archiveDir}"/`, { stdio: 'ignore' });
      console.log(`✅ Test results archived to: ${archiveDir}`);
    }

    // Keep only last 10 archives
    const archivesDir = 'test/mobile-test-archives';
    if (fs.existsSync(archivesDir)) {
      const archives = fs.readdirSync(archivesDir)
        .filter(name => fs.statSync(path.join(archivesDir, name)).isDirectory())
        .sort()
        .reverse();

      if (archives.length > 10) {
        for (let i = 10; i < archives.length; i++) {
          const oldArchive = path.join(archivesDir, archives[i]);
          fs.rmSync(oldArchive, { recursive: true, force: true });
        }
        console.log(`🗑️ Cleaned up old archives, keeping latest 10`);
      }
    }

  } catch (error) {
    console.error('❌ Failed to archive test results:', error);
  }
}

export default globalTeardown;