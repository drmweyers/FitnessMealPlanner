# Test Database & Maintenance Documentation

## Overview
This document provides comprehensive guidance for maintaining and extending the FitnessMealPlanner test infrastructure. The test database includes all test files, utilities, factories, and procedures necessary for comprehensive testing coverage.

## Test Infrastructure Architecture

### Directory Structure
```
test/
├── unit/                           # Unit tests (core business logic)
│   ├── components/                 # React component tests
│   │   ├── AuthenticationFlow.test.tsx
│   │   └── RecipeManagement.test.tsx
│   ├── business/                   # Business logic tests
│   │   └── MealPlanGeneration.test.ts
│   ├── dataValidation.test.ts      # Schema validation tests
│   ├── edgeCases.test.ts          # Boundary condition tests
│   └── performance.test.ts         # Performance validation tests
├── utils/                          # Test utilities and helpers
│   ├── testFactories.ts           # Data generation factories
│   └── testHelpers.ts             # Common testing utilities
├── setup.ts                       # Global test configuration
└── TEST_DATABASE_DOCUMENTATION.md # This file
```

## Test Categories & Coverage

### 1. Unit Tests (155+ tests)
- **dataValidation.test.ts**: 50 tests for schema validation
- **AuthenticationFlow.test.tsx**: 30+ tests for authentication components
- **RecipeManagement.test.tsx**: 40+ tests for recipe CRUD operations
- **MealPlanGeneration.test.ts**: 25+ tests for meal plan business logic
- **edgeCases.test.ts**: 25 tests for boundary conditions
- **performance.test.ts**: 13 tests for performance validation

### 2. Test Coverage Goals
- **Target**: 80%+ unit test coverage
- **Current Status**: Enhanced from 35% to 80%+ (estimated)
- **Critical Paths**: 100% coverage of authentication, recipe management, meal planning
- **Edge Cases**: Comprehensive boundary value testing
- **Performance**: Response time validation for all major operations

## Test Factories & Data Generation

### UserFactory
```typescript
UserFactory.admin()           // Creates admin user with permissions
UserFactory.trainer()         // Creates trainer with customer relationships
UserFactory.customer()        // Creates customer with meal plans
UserFactory.build(overrides)  // Custom user with specific properties
```

### RecipeFactory
```typescript
RecipeFactory.basic()         // Simple recipe with minimal requirements
RecipeFactory.complex()       // Recipe with multiple ingredients and steps
RecipeFactory.approved()      // Pre-approved recipe for meal plans
RecipeFactory.withNutrition() // Recipe with complete nutritional data
```

### MealPlanFactory
```typescript
MealPlanFactory.weightLoss()  // Weight loss focused meal plan
MealPlanFactory.muscleGain()  // Muscle building meal plan
MealPlanFactory.maintenance() // Maintenance calorie meal plan
MealPlanFactory.withDietary() // Meal plan with dietary restrictions
```

## Test Helpers & Utilities

### MockHelpers
- **API Response Mocking**: `createMockApiResponse(data, status)`
- **Fetch Implementation**: `createMockFetch(responses)`
- **LocalStorage**: `mockLocalStorage()`
- **Location**: `mockLocation(url)`

### AsyncHelpers
- **Condition Waiting**: `waitForCondition(condition, timeout)`
- **Element Waiting**: `waitForElements(selectors)`
- **API Call Waiting**: `waitForApiCalls(mockFn, expectedCalls)`
- **Network Simulation**: `networkDelay(ms)`

### DOMHelpers
- **Form Utilities**: `fillForm(formData)`, `submitForm()`
- **Element Queries**: `getAllByTestIdPattern(pattern)`
- **Accessibility**: `checkAccessibility(container)`
- **CSS Classes**: `hasClass(element, className)`

### PerformanceHelpers
- **Timing**: `measureTime(fn)`
- **Benchmarking**: `benchmark(fn, iterations)`
- **Memory**: `checkMemoryUsage()`
- **Render Profiling**: `profileRender(renderFn)`

## Maintenance Procedures

### 1. Adding New Tests

#### For Component Tests
1. Create test file in `test/unit/components/`
2. Import required factories and helpers:
   ```typescript
   import { UserFactory, RecipeFactory } from '../../utils/testFactories';
   import { MockHelpers, DOMHelpers } from '../../utils/testHelpers';
   ```
3. Follow naming convention: `ComponentName.test.tsx`
4. Include tests for:
   - Component rendering
   - User interactions
   - Error states
   - Loading states
   - Accessibility

#### For Business Logic Tests
1. Create test file in `test/unit/business/`
2. Focus on pure functions and algorithms
3. Test all input/output combinations
4. Include edge cases and error scenarios
5. Validate performance requirements

### 2. Updating Existing Tests

#### When Schema Changes
1. Update `testFactories.ts` with new field requirements
2. Update validation tests in `dataValidation.test.ts`
3. Update component tests that use affected schemas
4. Run full test suite to catch cascading issues

#### When Components Change
1. Update component tests for new props/behavior
2. Update factories if data structures change
3. Update mock implementations if API changes
4. Verify accessibility tests still pass

### 3. Test Data Management

#### Factory Pattern Usage
```typescript
// Good: Use factories for consistent test data
const user = UserFactory.trainer({ customerId: customer.id });
const recipe = RecipeFactory.approved({ createdBy: user.id });

// Avoid: Manual object creation
const user = { id: '123', email: 'test@test.com', ... }; // Brittle
```

#### Mock Data Guidelines
- Use realistic data that matches production patterns
- Include edge cases (empty strings, null values, large datasets)
- Maintain consistency across test files
- Update mocks when real APIs change

### 4. Performance Test Maintenance

#### Threshold Management
```typescript
// Update thresholds based on actual performance measurements
const PERFORMANCE_THRESHOLDS = {
  RECIPE_VALIDATION: 1000,    // ms - complex recipe validation
  MEAL_PLAN_GENERATION: 2000, // ms - full meal plan creation
  USER_AUTHENTICATION: 100,   // ms - login validation
  DATABASE_QUERY: 50,         // ms - simple queries
};
```

#### Performance Regression Detection
- Run performance tests on every major change
- Compare results to baseline measurements
- Investigate any >20% performance degradation
- Update thresholds when performance improves

### 5. Test Environment Configuration

#### Docker Test Execution
```bash
# Run all tests
docker exec fitnessmealplanner-dev npm test

# Run specific test file
docker exec fitnessmealplanner-dev npm test -- dataValidation.test.ts

# Run tests with coverage
docker exec fitnessmealplanner-dev npm run test:coverage

# Run tests in watch mode
docker exec fitnessmealplanner-dev npm run test:watch
```

#### Environment Variables for Testing
```env
NODE_ENV=test
VITE_API_URL=http://localhost:4000/api
VITE_ENABLE_TEST_HELPERS=true
VITE_BYPASS_RATE_LIMITS=true
```

### 6. Debugging Failed Tests

#### Common Issues & Solutions

**Lucide React Icon Mocking**
```typescript
// Ensure proper mocking in setup.ts
vi.mock('lucide-react', () => ({
  ChefHat: () => <div data-testid="chef-hat-icon">ChefHat</div>,
  // Add other icons as needed
}));
```

**Date Formatting Issues**
```typescript
// Use ISO strings for date inputs
const validDate = '2024-01-15T10:30:00Z';
// Avoid Date objects in validation tests
```

**Async Test Failures**
```typescript
// Always use waitFor for async operations
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument();
});
```

**Mock Function Reset**
```typescript
// Clear mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
```

### 7. Test Coverage Analysis

#### Running Coverage Reports
```bash
# Generate coverage report
docker exec fitnessmealplanner-dev npm run test:coverage

# View coverage in browser
open coverage/index.html
```

#### Coverage Targets by File Type
- **Components**: 85%+ statement coverage
- **Business Logic**: 95%+ statement coverage
- **Utilities**: 90%+ statement coverage
- **API Routes**: 80%+ statement coverage

#### Coverage Exclusions
```javascript
// vitest.config.ts coverage exclusions
coverage: {
  exclude: [
    'test/**',
    '**/*.test.{ts,tsx}',
    '**/node_modules/**',
    '**/*.config.{ts,js}',
    '**/types/**',
  ]
}
```

### 8. Continuous Integration

#### Pre-commit Hooks
```bash
# Install husky for git hooks
npm install --save-dev husky

# Add pre-commit test hook
npx husky add .husky/pre-commit "npm test"
```

#### CI/CD Pipeline Integration
```yaml
# Example GitHub Actions workflow
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3
    - name: Run Tests
      run: |
        docker-compose --profile dev up -d
        docker exec fitnessmealplanner-dev npm test
        docker exec fitnessmealplanner-dev npm run test:coverage
```

### 9. Test Documentation Standards

#### Test File Headers
```typescript
/**
 * Component/Feature Name Tests
 *
 * Test Coverage:
 * - Core functionality
 * - Error scenarios
 * - Edge cases
 * - Performance requirements
 * - Accessibility compliance
 */
```

#### Test Case Documentation
```typescript
describe('Feature Name', () => {
  it('should handle specific scenario with expected outcome', () => {
    // Arrange: Set up test data and mocks
    // Act: Execute the functionality
    // Assert: Verify expected results
  });
});
```

### 10. Future Enhancements

#### Planned Improvements
1. **E2E Test Integration**: Playwright tests for critical user journeys
2. **Visual Regression Testing**: Screenshot comparison for UI components
3. **API Contract Testing**: Schema validation for all endpoints
4. **Performance Monitoring**: Automated performance baseline tracking
5. **Accessibility Automation**: Automated a11y testing integration

#### Test Infrastructure Scaling
- Parallel test execution for faster CI/CD
- Test data seeding for integration tests
- Mock service worker for API testing
- Shared test utilities across projects

## Quick Reference Commands

### Essential Test Commands
```bash
# Run all tests
npm test

# Run specific test pattern
npm test -- --grep "Authentication"

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Debug specific test
npm test -- --reporter=verbose AuthenticationFlow.test.tsx
```

### Test Utility Examples
```typescript
// Create test user with meal plan
const { user, mealPlan } = await TestPatterns.createUserWithMealPlan();

// Test CRUD operations
const crudTests = TestPatterns.testCrudOperations(
  'Recipe',
  createRecipe,
  getRecipe,
  updateRecipe,
  deleteRecipe,
  RecipeFactory.build()
);

// Test form flow
await TestPatterns.testFormFlow({
  email: 'test@example.com',
  password: 'TestPassword123!'
});
```

## Troubleshooting Guide

### Common Test Failures

1. **"Cannot find module" errors**
   - Check import paths use correct aliases (@/)
   - Verify vitest.config.ts has proper path resolution

2. **"ReferenceError: fetch is not defined"**
   - Ensure global fetch mock is set up in setup.ts
   - Use MockHelpers.createMockFetch() for test-specific mocks

3. **"TestingLibraryElementError: Unable to find element"**
   - Use waitFor() for async elements
   - Check data-testid attributes are present
   - Verify component is actually rendering

4. **"TypeError: Cannot read property of undefined"**
   - Check factory data matches component expectations
   - Verify all required props are provided
   - Use optional chaining in components

5. **Performance test timeouts**
   - Check Docker container has sufficient resources
   - Adjust performance thresholds based on environment
   - Use smaller datasets for performance tests

### Getting Help

1. **Check existing test patterns** in similar components
2. **Consult test utilities** in `testHelpers.ts`
3. **Review factory examples** in `testFactories.ts`
4. **Run tests with verbose output** for debugging
5. **Check vitest documentation** for advanced features

---

*This documentation should be updated whenever test infrastructure changes. Last updated: [Current Date]*