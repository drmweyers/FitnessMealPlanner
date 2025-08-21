# Trainer-Customer Unit Tests - Running Instructions

## Quick Start Guide

### Prerequisites
Ensure you have the following installed and configured:
- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- Docker and Docker Compose (recommended)

### Environment Setup

#### 1. Database Configuration
```bash
# Option A: Using Docker (Recommended)
docker-compose --profile dev up -d

# Option B: Local PostgreSQL
# Create test database
createdb fitness_meal_planner_test

# Set environment variables
export TEST_DATABASE_URL="postgresql://username:password@localhost:5432/fitness_meal_planner_test"
export DATABASE_URL="postgresql://username:password@localhost:5432/fitness_meal_planner_test"
export JWT_SECRET="test-jwt-secret-key"
```

#### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..

# Install server dependencies
cd server && npm install && cd ..
```

## Running Tests

### Method 1: Complete Test Suite (Recommended)
Run the comprehensive test suite with the custom test runner:

```bash
# Navigate to test directory
cd test/unit

# Run complete trainer-customer test suite
npm run test:trainer-customer

# Alternative: Direct execution
node runTrainerCustomerTests.ts

# Alternative: Using TypeScript directly
npx ts-node runTrainerCustomerTests.ts
```

**Expected Output:**
```
🚀 Starting Trainer-Customer Relationship Test Suite
============================================================
🔍 Running pre-flight checks...
✅ Pre-flight checks passed
🔧 Setting up test environment...
✅ Test environment ready
📋 Executing 6 test files...

[1/6] Running trainerCustomerRelationships.test.ts...
✅ trainerCustomerRelationships.test.ts (2847ms) - 15 passed, 0 failed, 0 skipped

[2/6] Running customerInvitationSystem.test.ts...
✅ customerInvitationSystem.test.ts (3124ms) - 25 passed, 0 failed, 0 skipped

[3/6] Running mealPlanAssignmentWorkflows.test.ts...
✅ mealPlanAssignmentWorkflows.test.ts (2956ms) - 45 passed, 0 failed, 0 skipped

[4/6] Running profileManagementCRUD.test.ts...
✅ profileManagementCRUD.test.ts (3001ms) - 30 passed, 0 failed, 0 skipped

[5/6] Running authenticationAuthorizationFlows.test.ts...
✅ authenticationAuthorizationFlows.test.ts (3456ms) - 55 passed, 0 failed, 0 skipped

[6/6] Running dataValidation.test.ts...
✅ dataValidation.test.ts (2234ms) - 50 passed, 0 failed, 0 skipped

============================================================
📊 TEST SUITE SUMMARY
============================================================
Total Files: 6
Successful: 6
Failed: 0
Success Rate: 100%

Total Tests: 220
Passed: 220
Failed: 0
Skipped: 0
Test Success Rate: 100%

Total Duration: 18s

💾 Test report saved to: test/reports/trainer-customer-test-report.json
✅ Test suite completed successfully
🎉 Test suite execution completed
✅ All test files passed successfully
```

### Method 2: Individual Test Files
Run specific test files for focused testing:

```bash
# Core relationship functionality
npx vitest trainerCustomerRelationships.test.ts

# Customer invitation system
npx vitest customerInvitationSystem.test.ts

# Meal plan assignments
npx vitest mealPlanAssignmentWorkflows.test.ts

# Profile management
npx vitest profileManagementCRUD.test.ts

# Authentication flows
npx vitest authenticationAuthorizationFlows.test.ts

# Data validation
npx vitest dataValidation.test.ts
```

### Method 3: Standard Vitest Commands
Use standard Vitest commands for additional options:

```bash
# Run all unit tests
npx vitest

# Run with coverage
npx vitest --coverage

# Watch mode for development
npx vitest --watch

# Run specific test pattern
npx vitest --run trainer

# Verbose output
npx vitest --reporter=verbose
```

## Test Configuration Options

### Environment Variables
```bash
# Test database configuration
export TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/test_db"
export DATABASE_URL="postgresql://user:pass@localhost:5432/test_db"

# Authentication configuration
export JWT_SECRET="test-jwt-secret-key"

# Test environment settings
export NODE_ENV="test"

# Optional: Test timeouts (in milliseconds)
export TEST_TIMEOUT="30000"
export TEST_RETRY_COUNT="2"
```

### Vitest Configuration Options
The tests use the following Vitest configuration:

```typescript
// vitest.config.ts (project root)
export default defineConfig({
  test: {
    timeout: 30000,
    setupFiles: ['./test/unit/testSetup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 30000,
  }
});
```

## Troubleshooting Common Issues

### Database Connection Issues

**Problem:** `Test database is not accessible`
```bash
# Solution 1: Check PostgreSQL service
sudo systemctl status postgresql

# Solution 2: Check Docker containers
docker ps
docker logs fitnessmealplanner-dev

# Solution 3: Verify database URL
echo $DATABASE_URL
```

**Problem:** `relation "users" does not exist`
```bash
# Solution: Run database migrations
cd server
npm run db:migrate

# Alternative: Reset database
npm run db:reset
```

### Permission Issues

**Problem:** `permission denied` errors
```bash
# Solution: Check file permissions
chmod +x test/unit/runTrainerCustomerTests.ts

# Alternative: Run with Node directly
node test/unit/runTrainerCustomerTests.js
```

### Memory Issues

**Problem:** `JavaScript heap out of memory`
```bash
# Solution: Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Run tests with increased memory
NODE_OPTIONS="--max-old-space-size=4096" npm run test:trainer-customer
```

### Timeout Issues

**Problem:** Tests timeout frequently
```bash
# Solution 1: Increase timeout in individual tests
# Add to specific test files:
// describe.configure({ timeout: 60000 });

# Solution 2: Increase global timeout
export TEST_TIMEOUT="60000"

# Solution 3: Run tests sequentially
npx vitest --run --threads=false
```

### Port Conflicts

**Problem:** `Port already in use`
```bash
# Check what's using the port
lsof -i :5432  # PostgreSQL
lsof -i :4000  # Application

# Kill process if necessary
kill -9 <PID>

# Alternative: Use different port
export DATABASE_URL="postgresql://user:pass@localhost:5433/test_db"
```

## Development Workflow

### Adding New Tests

1. **Identify the test file** based on functionality area
2. **Follow existing patterns** in the test file
3. **Use TestUtils** for generating test data
4. **Mock external dependencies** appropriately
5. **Update test documentation** if needed

Example of adding a new test:
```typescript
// In trainerCustomerRelationships.test.ts
describe('New Feature', () => {
  it('should handle new functionality correctly', async () => {
    // Arrange
    const testData = TestUtils.createTestUser({ role: 'trainer' });
    
    // Act
    const result = await newFeatureFunction(testData);
    
    // Assert
    expect(result).toBeDefined();
    expect(result.id).toBe(testData.id);
  });
});
```

### Test Data Management

**Creating Test Users:**
```typescript
// Use TestUtils for consistent test data
const trainer = TestUtils.createTestUser({ 
  role: 'trainer',
  email: 'trainer@test.com' 
});

const customer = TestUtils.createTestUser({ 
  role: 'customer',
  email: 'customer@test.com' 
});
```

**Creating Test Meal Plans:**
```typescript
const mealPlan = TestUtils.createTestMealPlan({
  fitnessGoal: 'weight_loss',
  dailyCalorieTarget: 1800
});
```

### Mock Management

**Database Mocks:**
```typescript
// Use MockFactory for consistent database mocks
const mockQuery = MockFactory.createMockDbQuery([expectedResult]);
vi.mocked(db.select).mockReturnValue(mockQuery);
```

**Service Mocks:**
```typescript
// Mock external services
vi.mock('../../server/services/emailService', () => ({
  sendInvitationEmail: vi.fn().mockResolvedValue({ success: true }),
}));
```

## Performance Optimization

### Running Tests in Parallel
```bash
# Run tests in parallel (default)
npx vitest --run

# Force sequential execution for debugging
npx vitest --run --threads=false

# Limit concurrent tests
npx vitest --run --threads=2
```

### Memory Optimization
```bash
# Run with memory profiling
npx vitest --run --reporter=verbose --logHeapUsage

# Clear module cache between tests (if needed)
# Add to test setup:
afterEach(() => {
  vi.clearAllMocks();
});
```

### Selective Test Running
```bash
# Run only changed tests
npx vitest --changed

# Run tests matching pattern
npx vitest --run trainer

# Run tests in specific directory
npx vitest test/unit/

# Skip specific tests temporarily
npx vitest --run --exclude="**/slow.test.ts"
```

## Continuous Integration

### GitHub Actions Configuration
```yaml
# .github/workflows/test.yml
name: Unit Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: fitness_meal_planner_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:trainer-customer
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/fitness_meal_planner_test
          JWT_SECRET: test-jwt-secret-key
```

### Pre-commit Hooks
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:trainer-customer:quick"
    }
  }
}
```

## Reporting and Analysis

### Test Reports
Test execution generates comprehensive reports:

- **JSON Report**: `test/reports/trainer-customer-test-report.json`
- **Console Output**: Detailed terminal output with statistics
- **Coverage Report**: `coverage/lcov-report/index.html` (when run with --coverage)

### Accessing Reports
```bash
# View latest test report
cat test/reports/trainer-customer-test-report.json | jq '.'

# Open coverage report
open coverage/lcov-report/index.html

# Generate and view coverage
npx vitest --coverage
```

### Report Analysis
The test reports include:
- Test execution summary
- Individual test results
- Performance metrics
- Environment information
- Error details (if any)

## Best Practices

### Test Writing Guidelines
1. **Use descriptive test names** that explain the expected behavior
2. **Follow AAA pattern**: Arrange, Act, Assert
3. **Mock external dependencies** to ensure test isolation
4. **Use TestUtils** for consistent test data generation
5. **Clean up resources** in afterEach hooks
6. **Test both positive and negative scenarios**

### Test Organization
1. **Group related tests** in describe blocks
2. **Use beforeEach/afterEach** for common setup/cleanup
3. **Keep tests focused** on single functionality
4. **Use meaningful variable names** in tests
5. **Add comments** for complex test scenarios

### Debugging Tests
1. **Use console.log** sparingly for debugging
2. **Run single tests** when debugging specific issues
3. **Use debugger statements** with Node.js inspector
4. **Check database state** during test failures
5. **Verify mock configurations** are correct

## Support and Resources

### Getting Help
- **Documentation**: Review this guide and `TEST_COVERAGE_DOCUMENTATION.md`
- **Code Examples**: Check existing test files for patterns
- **Error Messages**: Test runner provides detailed error information
- **Debugging**: Use Node.js debugger with `--inspect` flag

### Useful Commands Summary
```bash
# Quick test run
npm run test:trainer-customer

# Individual file
npx vitest trainerCustomerRelationships.test.ts

# With coverage
npx vitest --coverage

# Debug mode
npx vitest --inspect-brk trainerCustomerRelationships.test.ts

# Watch mode
npx vitest --watch

# Verbose output
npx vitest --reporter=verbose
```

This comprehensive testing suite ensures the reliability and security of all trainer-customer relationship functionality. Regular execution of these tests helps maintain code quality and prevents regressions.