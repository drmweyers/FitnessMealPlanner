# Automatic Grocery List Generation - Comprehensive Test Suite

## Overview

This document provides a complete overview of the test suite created for the automatic grocery list generation feature. The test suite includes E2E tests, integration tests, manual testing scripts, and performance tests to ensure comprehensive coverage of all scenarios.

## Test Suite Components

### 1. E2E Test Suite (`test/e2e/autoGroceryGeneration.test.ts`)

**Purpose**: End-to-end validation of the complete user journey

**Test Coverage:**
- ✅ Happy Path: Trainer assigns meal plan → Grocery list auto-generates
- ✅ Duplicate Prevention: Same meal plan assigned twice
- ✅ Feature Toggle: Auto-generation disabled/enabled
- ✅ Cleanup: Meal plan deletion removes grocery list
- ✅ Ingredient Aggregation: Multiple recipes with shared ingredients
- ✅ Error Handling: Invalid meal plan data
- ✅ Performance: Large meal plan with many recipes
- ✅ Concurrent Operations: Multiple trainers assigning plans
- ✅ Runtime Feature Toggle Changes

**Key Features:**
- Uses Playwright for browser automation
- Tests actual UI interactions
- Validates complete user workflows
- Includes helper class for reusable test actions
- Supports multiple test accounts

### 2. Integration Test Suite (`test/integration/mealPlanEvents.test.ts`)

**Purpose**: Unit/integration testing of the event system and business logic

**Test Coverage:**
- ✅ onMealPlanAssigned event processing
- ✅ Grocery list creation and update logic
- ✅ Feature flag behavior validation
- ✅ Error handling and edge cases
- ✅ Database transaction integrity
- ✅ Ingredient processing pipeline
- ✅ Event metadata handling
- ✅ Concurrent event processing
- ✅ Malformed data handling

**Key Features:**
- Mocked database and external dependencies
- Focused on business logic validation
- Comprehensive error scenario testing
- Feature flag configuration testing
- Performance monitoring integration

### 3. Manual Test Script (`test/manual/test-auto-generation.js`)

**Purpose**: Human-driven testing and validation workflows

**Test Coverage:**
- ✅ Interactive test execution
- ✅ Real API endpoint testing
- ✅ Authentication workflows
- ✅ Feature flag manipulation
- ✅ Performance measurement
- ✅ Data verification
- ✅ Error scenario simulation

**Key Features:**
- Node.js script for easy execution
- Interactive mode for selective testing
- Real HTTP API calls
- Performance timing and monitoring
- Detailed result reporting
- Test data cleanup procedures

**Usage:**
```bash
# Run all tests
node test/manual/test-auto-generation.js

# Interactive mode
node test/manual/test-auto-generation.js --interactive
```

### 4. Performance Test Suite (`test/performance/autoGroceryGeneration.performance.test.ts`)

**Purpose**: Performance validation and regression detection

**Test Coverage:**
- ✅ Small meal plan performance (7 days)
- ✅ Large meal plan performance (30 days)
- ✅ Extreme scale testing (60 days, 3000+ ingredients)
- ✅ Concurrent processing performance
- ✅ Memory leak detection
- ✅ Database query performance
- ✅ Resource cleanup performance
- ✅ Performance regression detection

**Performance Targets:**
- Single meal plan generation: < 5 seconds
- Large meal plan (30 days): < 15 seconds
- Concurrent generations (5 plans): < 30 seconds
- Memory usage: < 500MB per generation
- Database queries: < 100ms per query

**Key Features:**
- Memory usage monitoring
- Query performance tracking
- Concurrent load testing
- Regression detection algorithms
- Resource cleanup validation

## Test Scenarios Covered

### Core Functionality
1. **Meal Plan Assignment → Grocery List Creation**
   - Trainer creates meal plan
   - Trainer assigns meal plan to customer
   - System auto-generates grocery list
   - Customer sees grocery list immediately

2. **Ingredient Aggregation**
   - Multiple recipes with shared ingredients
   - Quantity aggregation (2 tbsp + 1 tbsp = 3 tbsp)
   - Unit compatibility handling
   - Ingredient categorization

3. **Duplicate Prevention**
   - Same meal plan assigned multiple times
   - System updates existing list vs creating new
   - Configurable via UPDATE_EXISTING_LISTS flag

### Feature Flags
1. **AUTO_GENERATE_GROCERY_LISTS**
   - Enabled: Lists are auto-generated
   - Disabled: No lists created on assignment

2. **UPDATE_EXISTING_LISTS**
   - Enabled: Updates existing lists when reassigning
   - Disabled: Skips creation if list already exists

3. **DELETE_ORPHANED_LISTS**
   - Enabled: Deletes grocery lists when meal plan deleted
   - Disabled: Orphaned lists remain

### Error Handling
1. **Database Errors**
   - Connection failures
   - Transaction rollbacks
   - Query timeouts

2. **Invalid Data**
   - Malformed meal plans
   - Missing ingredients
   - Empty recipe lists

3. **Concurrent Access**
   - Multiple trainers assigning simultaneously
   - Race condition handling
   - Transaction isolation

### Performance Scenarios
1. **Scale Testing**
   - Small plans (7 days, 105 ingredients)
   - Large plans (30 days, 960 ingredients)
   - Extreme plans (60 days, 3000+ ingredients)

2. **Load Testing**
   - Concurrent generations
   - Memory usage under load
   - Query performance degradation

3. **Regression Testing**
   - Performance baseline comparison
   - Memory leak detection
   - Resource cleanup efficiency

## Test Execution Guide

### Prerequisites
1. **Development Server Running**
   ```bash
   docker-compose --profile dev up -d
   ```

2. **Test Accounts Available**
   - Trainer: `trainer.test@evofitmeals.com` / `TestTrainer123!`
   - Customer: `customer.test@evofitmeals.com` / `TestCustomer123!`

3. **Feature Flags Enabled**
   - AUTO_GENERATE_GROCERY_LISTS: true
   - UPDATE_EXISTING_LISTS: true

### Running Tests

#### 1. E2E Tests (Playwright)
```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test test/e2e/autoGroceryGeneration.test.ts

# Run with UI (headed mode)
npx playwright test test/e2e/autoGroceryGeneration.test.ts --headed
```

#### 2. Integration Tests (Vitest)
```bash
# Run integration tests
npm run test:integration

# Run specific integration test
npx vitest test/integration/mealPlanEvents.test.ts

# Run with coverage
npx vitest test/integration/mealPlanEvents.test.ts --coverage
```

#### 3. Manual Tests
```bash
# Run all manual tests
node test/manual/test-auto-generation.js

# Interactive mode
node test/manual/test-auto-generation.js --interactive

# Run specific test
node test/manual/test-auto-generation.js --test=happy-path
```

#### 4. Performance Tests
```bash
# Run performance tests
npx vitest test/performance/autoGroceryGeneration.performance.test.ts

# Run with detailed reporting
npx vitest test/performance/autoGroceryGeneration.performance.test.ts --reporter=verbose
```

## Test Data and Fixtures

### Test Accounts
The test suite uses standardized test accounts:

```javascript
const TEST_ACCOUNTS = {
  trainer: {
    email: 'trainer.test@evofitmeals.com',
    password: 'TestTrainer123!'
  },
  customer: {
    email: 'customer.test@evofitmeals.com',
    password: 'TestCustomer123!'
  }
};
```

### Sample Meal Plan Data
```javascript
const testMealPlanData = {
  planName: 'Test Meal Plan',
  days: [
    {
      day: 1,
      meals: [
        {
          type: 'breakfast',
          recipe: {
            name: 'Scrambled Eggs',
            ingredients: [
              { name: 'eggs', amount: '3', unit: 'pcs' },
              { name: 'butter', amount: '1', unit: 'tbsp' }
            ]
          }
        }
      ]
    }
  ]
};
```

### Expected Grocery List Structure
```javascript
const expectedGroceryList = {
  id: 'list-123',
  customerId: 'customer-123',
  mealPlanId: 'plan-123',
  name: 'Grocery List - Test Meal Plan - 2 Days',
  items: [
    {
      name: 'eggs',
      category: 'dairy',
      quantity: 3,
      unit: 'pcs',
      isChecked: false,
      priority: 'medium',
      notes: 'Used in: Scrambled Eggs'
    }
  ]
};
```

## Success Criteria

### Functional Requirements
- ✅ Grocery lists are automatically created when meal plans are assigned
- ✅ Ingredients are properly extracted and aggregated
- ✅ Duplicate assignments are handled according to feature flags
- ✅ Feature flags control behavior correctly
- ✅ Error scenarios are handled gracefully

### Performance Requirements
- ✅ Small meal plans (7 days): < 5 seconds
- ✅ Large meal plans (30 days): < 15 seconds
- ✅ Memory usage: < 500MB per generation
- ✅ Database queries: < 100ms average
- ✅ No memory leaks detected

### Quality Requirements
- ✅ 100% test coverage for critical paths
- ✅ All edge cases handled
- ✅ Comprehensive error handling
- ✅ Performance regression detection
- ✅ Concurrent access safety

## Troubleshooting Guide

### Common Issues

#### 1. Test Account Login Failures
**Symptom**: Authentication errors in tests
**Solution**: Verify test accounts exist in database
```sql
SELECT email FROM users WHERE email LIKE '%test%';
```

#### 2. Feature Flag Not Working
**Symptom**: Auto-generation not respecting flags
**Solution**: Check feature flag configuration
```javascript
// In test setup
updateFeatureConfig({ AUTO_GENERATE_GROCERY_LISTS: true });
```

#### 3. Performance Test Timeouts
**Symptom**: Tests failing due to timeouts
**Solution**: Adjust timeout values or check system resources
```javascript
// Increase timeout in test
expect(metrics.duration).toBeLessThan(30000); // 30 seconds
```

#### 4. Docker Environment Issues
**Symptom**: API not responding during tests
**Solution**: Ensure development server is running
```bash
docker ps
docker-compose --profile dev up -d
```

### Debug Commands

#### Check Feature Flags
```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/admin/features
```

#### Verify Grocery Lists
```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/grocery-lists
```

#### Check Meal Plans
```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/meal-plans
```

## Future Enhancements

### Test Coverage Improvements
1. **Additional Browser Testing**
   - Safari/WebKit support
   - Mobile device testing
   - Cross-browser compatibility

2. **Advanced Performance Testing**
   - Load testing with realistic user patterns
   - Database connection pool testing
   - CDN and caching validation

3. **Security Testing**
   - Authentication boundary testing
   - Authorization validation
   - Input sanitization verification

### Automation Improvements
1. **CI/CD Integration**
   - Automated test execution on PRs
   - Performance regression alerts
   - Test result reporting

2. **Test Data Management**
   - Automated test data setup/teardown
   - Randomized test data generation
   - Test environment isolation

## Conclusion

This comprehensive test suite provides thorough coverage of the automatic grocery list generation feature across multiple testing dimensions:

- **Functional Testing**: E2E and integration tests ensure all user workflows work correctly
- **Performance Testing**: Validates system performance under various load conditions
- **Manual Testing**: Provides human validation and ad-hoc testing capabilities
- **Regression Testing**: Detects performance and functional regressions

The test suite is designed to be maintainable, extensible, and provides clear feedback on system health and performance. Regular execution of these tests will ensure the reliability and performance of the automatic grocery list generation feature.