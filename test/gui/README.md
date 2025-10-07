# FitMeal Pro GUI Testing Suite

Comprehensive end-to-end testing for FitMeal Pro using Puppeteer and visual regression testing.

## 🎯 Features

- **Complete GUI Coverage**: Tests authentication, recipe management, meal plan generation
- **Visual Regression Testing**: Pixel-perfect UI consistency checking
- **Cross-Device Testing**: Desktop, tablet, and mobile viewport testing
- **Real Browser Testing**: Uses Puppeteer for authentic user interactions
- **Automated Screenshots**: Captures failures and visual baselines
- **Comprehensive Reporting**: HTML and JSON test reports

## 🚀 Quick Start

### Prerequisites

1. **Application Running**: Ensure FitMeal Pro is running:
   ```bash
   docker compose --profile dev up
   ```

2. **Verify Health**: Check application is accessible at http://localhost:4000

### Run Tests

```bash
# Run all GUI tests
npm run test:gui

# Run tests with detailed runner
npm run test:gui:runner

# Run tests in watch mode (development)
npm run test:gui:watch

# Create new visual baselines
npm run test:baseline

# Run all tests (unit + GUI)
npm run test:all
```

## 📁 Test Structure

```
test/gui/
├── specs/                          # Test specifications
│   ├── auth.test.ts                # Authentication tests
│   ├── recipe-management.test.ts   # Recipe CRUD operations
│   └── meal-plan-generation.test.ts# Meal plan generation
├── utils/                          # Testing utilities
│   ├── browser-utils.ts            # Browser interaction helpers
│   └── visual-testing.ts           # Visual regression tools
├── data/                           # Test data and fixtures
├── screenshots/                    # Visual test artifacts
│   ├── baseline/                   # Reference screenshots
│   ├── actual/                     # Current test screenshots
│   └── diff/                       # Visual difference images
├── reports/                        # Test execution reports
├── puppeteer.config.ts            # Puppeteer configuration
├── vitest.gui.config.ts           # Vitest GUI test config
├── test-runner.ts                 # Custom test runner
└── setup.ts                       # Global test setup
```

## 🧪 Test Categories

### Authentication Tests (`auth.test.ts`)
- Login form validation
- Successful authentication
- Registration process
- Logout functionality
- Protected route access
- Error handling

### Recipe Management Tests (`recipe-management.test.ts`)
- Recipe generation interface
- AI-powered recipe creation
- Recipe approval/disapproval
- Bulk operations
- Recipe filtering and search
- Recipe detail modals

### Meal Plan Generation Tests (`meal-plan-generation.test.ts`)
- Meal plan form validation
- Basic meal plan generation
- Advanced parameters
- Dietary restrictions
- Natural language input
- PDF export
- Customer assignment
- Responsive design

## 🎨 Visual Regression Testing

### How It Works

1. **Baseline Creation**: First run creates reference screenshots
2. **Comparison**: Subsequent runs compare against baselines
3. **Diff Generation**: Visual differences are highlighted
4. **Threshold Control**: Configurable sensitivity (default: 0.2%)

### Managing Baselines

```bash
# Create new baselines (run when UI intentionally changes)
npm run test:baseline

# Review visual differences
open test/gui/screenshots/diff/
```

### Visual Test Configuration

```typescript
// testConfig in puppeteer.config.ts
export const testConfig = {
  visualDiffThreshold: 0.2,  // 0.2% pixel difference tolerance
  screenshotsPath: './test/gui/screenshots'
};
```

## 🛠️ Utilities

### BrowserUtils

Essential browser interaction helpers:

```typescript
// Login with admin credentials
await BrowserUtils.login(page);

// Navigate to specific route
await BrowserUtils.navigateToPage(page, '/admin');

// Wait for elements
await BrowserUtils.waitForElement(page, '[data-testid="button"]');

// Take screenshots
await BrowserUtils.takeScreenshot(page, 'test-name');

// Check for errors
const errors = await BrowserUtils.checkForErrors(page);
```

### VisualTesting

Visual regression testing tools:

```typescript
// Capture baseline
await VisualTesting.captureBaseline(page, 'test-name');

// Compare with baseline
const result = await VisualTesting.compareScreenshot(page, 'test-name');

// Prepare for visual testing
await VisualTesting.hideVolatileElements(page);
await VisualTesting.waitForAnimations(page);
```

## 📊 Test Reports

### HTML Report

- Visual dashboard with pass/fail metrics
- Detailed failure information
- Screenshots and error messages
- Located at: `test/gui/reports/latest-report.html`

### JSON Report

- Machine-readable test results
- Integration with CI/CD systems
- Located at: `test/gui/reports/vitest-results.json`

## 🔧 Configuration

### Puppeteer Settings

```typescript
// puppeteer.config.ts
export const puppeteerConfig: Configuration = {
  headless: process.env.CI ? true : false,  // Visual mode in development
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  defaultViewport: { width: 1920, height: 1080 },
  slowMo: process.env.CI ? 0 : 50  // Slow motion for debugging
};
```

### Test Environment

```typescript
// Test configuration
export const testConfig = {
  baseUrl: 'http://localhost:4000',
  timeout: 30000,
  adminCredentials: {
    email: 'admin@fitmeal.pro',
    password: 'Admin123!@#'
  }
};
```

## 🚨 Troubleshooting

### Common Issues

1. **Application Not Running**
   ```
   Error: Health check failed
   Solution: Start app with `docker compose --profile dev up`
   ```

2. **Visual Tests Failing**
   ```
   Issue: UI changes causing visual diff failures
   Solution: Update baselines with `npm run test:baseline`
   ```

3. **Timeout Errors**
   ```
   Issue: Elements taking too long to load
   Solution: Increase timeout in testConfig or add explicit waits
   ```

4. **Browser Launch Issues**
   ```
   Issue: Puppeteer can't launch browser
   Solution: Install Chrome/Chromium or set PUPPETEER_EXECUTABLE_PATH
   ```

### Debug Mode

```bash
# Run with debug output
DEBUG=true npm run test:gui

# Run in headed mode (see browser)
CI=false npm run test:gui
```

## 🎯 Best Practices

### Writing Tests

1. **Use Data Test IDs**: Add `data-testid` attributes for reliable element selection
2. **Wait for Elements**: Always wait for elements before interacting
3. **Handle Async Operations**: Use proper waits for API calls and animations
4. **Clean State**: Start each test with a known state
5. **Visual Stability**: Hide volatile elements before visual tests

### Example Test Structure

```typescript
describe('Feature Tests', () => {
  beforeEach(async () => {
    await BrowserUtils.navigateToPage(page, '/feature');
    await BrowserUtils.waitForElement(page, '[data-testid="feature-container"]');
  });

  it('should perform action', async () => {
    // Arrange
    await BrowserUtils.typeInField(page, '[data-testid="input"]', 'test data');
    
    // Act
    await BrowserUtils.clickElement(page, '[data-testid="submit"]');
    
    // Assert
    await BrowserUtils.waitForToast(page, 'Success');
    
    // Visual Assert
    await VisualTesting.hideVolatileElements(page);
    const result = await VisualTesting.compareScreenshot(page, 'action-result');
    expect(result.match).toBe(true);
  });
});
```

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run GUI Tests
  run: |
    docker compose --profile dev up -d
    npm run test:gui
    docker compose down
  env:
    CI: true
```

### Test Data Management

- Use fixtures for consistent test data
- Clean up test data after runs
- Mock external services when needed

## 📈 Metrics

The test suite tracks:
- **Test Coverage**: UI functionality coverage
- **Visual Coverage**: UI component visual testing
- **Performance**: Test execution times
- **Reliability**: Test flakiness metrics

## 🤝 Contributing

1. Add tests for new features
2. Update baselines when UI changes
3. Follow naming conventions
4. Add descriptive test descriptions
5. Keep tests isolated and independent