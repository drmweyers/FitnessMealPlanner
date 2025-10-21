# Test Maintenance Procedures

## Quick Start Guide for Test Maintenance

### Daily Maintenance Tasks

#### 1. Test Health Check (5 minutes)
```bash
# Run full test suite
docker exec fitnessmealplanner-dev npm test

# Check for any failing tests
docker exec fitnessmealplanner-dev npm run test:coverage
```

**Expected Results:**
- All tests passing (155+ tests)
- Coverage > 80%
- No console errors or warnings

#### 2. Performance Baseline Verification (3 minutes)
```bash
# Run performance tests specifically
docker exec fitnessmealplanner-dev npm test -- performance.test.ts
```

**Monitor for:**
- Recipe validation < 1000ms
- Meal plan generation < 2000ms
- Authentication < 100ms

### Weekly Maintenance Tasks

#### 1. Factory Data Refresh (10 minutes)
Update test factories with realistic production data:

```typescript
// Update in testFactories.ts
export const RecipeFactory = {
  build: (overrides = {}) => ({
    // Ensure data matches current production patterns
    name: faker.food.dish(),
    ingredients: generateRealisticIngredients(), // Update ingredient lists
    nutrition: getCurrentNutritionStandards(), // Update nutritional values
    ...overrides
  })
};
```

#### 2. Schema Validation Sync (15 minutes)
Verify test schemas match actual application schemas:

```bash
# Compare test expectations with actual schemas
grep -r "calorieTarget\|dailyCalorieTarget" test/
grep -r "planName\|mealPlanName" test/
```

Update any mismatches found.

#### 3. Mock API Response Updates (10 minutes)
Ensure mock responses match actual API responses:

```typescript
// Update mock responses to match production
const mockRecipeResponse = {
  id: '123',
  name: 'Test Recipe',
  // Ensure all fields match production API response
  nutritionalInfo: { /* current production format */ }
};
```

### Monthly Maintenance Tasks

#### 1. Performance Threshold Review (30 minutes)
Analyze performance trends and update thresholds:

```bash
# Run performance tests multiple times
for i in {1..5}; do
  docker exec fitnessmealplanner-dev npm test -- performance.test.ts
done
```

**Process:**
1. Collect 5 runs of performance data
2. Calculate average response times
3. Update thresholds in `performance.test.ts` if needed
4. Document any significant changes

#### 2. Test Coverage Analysis (20 minutes)
```bash
# Generate detailed coverage report
docker exec fitnessmealplanner-dev npm run test:coverage
```

**Review:**
- Identify files with < 80% coverage
- Prioritize critical business logic for additional tests
- Create issues for coverage gaps

#### 3. Accessibility Test Updates (25 minutes)
Ensure accessibility tests cover new components:

```typescript
// Add accessibility tests for new components
describe('New Component Accessibility', () => {
  it('should meet WCAG guidelines', async () => {
    const { container } = render(<NewComponent />);
    const accessibilityReport = await DOMHelpers.checkAccessibility(container);
    expect(accessibilityReport.hasAccessibilityIssues).toBe(false);
  });
});
```

### Quarterly Maintenance Tasks

#### 1. Dependency Updates (45 minutes)
Update testing dependencies and verify compatibility:

```bash
# Update test-related dependencies
npm update @testing-library/react @testing-library/jest-dom vitest jsdom
```

**Test after updates:**
```bash
# Verify all tests still pass
docker exec fitnessmealplanner-dev npm test
```

#### 2. Test Infrastructure Optimization (60 minutes)
Review and optimize test execution:

**Parallel Test Execution:**
```javascript
// vitest.config.ts
export default defineConfig({
  test: {
    pool: 'threads',
    maxThreads: 4, // Optimize based on CI environment
    minThreads: 2,
  }
});
```

**Test File Organization:**
- Group related tests into suites
- Split large test files (>1000 lines)
- Optimize slow tests

#### 3. CI/CD Pipeline Review (30 minutes)
Evaluate test execution in CI environment:

```yaml
# Update GitHub Actions if needed
- name: Run Tests with Timeout
  run: |
    timeout 10m docker exec fitnessmealplanner-dev npm test
  timeout-minutes: 15
```

## Emergency Procedures

### When All Tests Are Failing

#### 1. Docker Environment Reset (5 minutes)
```bash
# Reset Docker environment
docker-compose --profile dev down
docker-compose --profile dev up -d --build

# Wait for services to start
sleep 30

# Retry tests
docker exec fitnessmealplanner-dev npm test
```

#### 2. Dependency Resolution (10 minutes)
```bash
# Clear node modules and reinstall
docker exec fitnessmealplanner-dev rm -rf node_modules
docker exec fitnessmealplanner-dev npm install

# Clear test cache
docker exec fitnessmealplanner-dev npm test -- --run --clearCache
```

#### 3. Schema Mismatch Emergency Fix (15 minutes)
When schema changes break many tests:

```bash
# Identify failing validation tests
docker exec fitnessmealplanner-dev npm test -- dataValidation.test.ts

# Quick fix common issues:
sed -i 's/calorieTarget/dailyCalorieTarget/g' test/unit/dataValidation.test.ts
sed -i 's/new Date(/'"'"'2024-01-15T10:30:00Z'"'"'/g' test/unit/dataValidation.test.ts
```

### When Performance Tests Are Failing

#### 1. Resource Allocation Check (5 minutes)
```bash
# Check Docker container resources
docker stats fitnessmealplanner-dev

# Check system resources
free -h
df -h
```

#### 2. Performance Threshold Adjustment (10 minutes)
```typescript
// Temporarily increase thresholds in performance.test.ts
const EMERGENCY_THRESHOLDS = {
  RECIPE_VALIDATION: 2000,    // Doubled from 1000ms
  MEAL_PLAN_GENERATION: 4000, // Doubled from 2000ms
  USER_AUTHENTICATION: 200,   // Doubled from 100ms
};
```

#### 3. Performance Isolation (15 minutes)
Run performance tests individually to identify bottlenecks:

```bash
# Test each performance scenario individually
docker exec fitnessmealplanner-dev npm test -- --grep "Recipe validation performance"
docker exec fitnessmealplanner-dev npm test -- --grep "Meal plan generation performance"
```

## Rollback Procedures

### Test Infrastructure Rollback

#### 1. Git-based Rollback (2 minutes)
```bash
# Rollback test files to last known good state
git checkout HEAD~1 -- test/

# Run tests to verify
docker exec fitnessmealplanner-dev npm test
```

#### 2. Factory Data Rollback (5 minutes)
```bash
# Restore factory to previous version
git checkout HEAD~1 -- test/utils/testFactories.ts

# Update any dependent tests
docker exec fitnessmealplanner-dev npm test -- --grep "Factory"
```

#### 3. Schema Test Rollback (10 minutes)
```bash
# Restore validation tests
git checkout HEAD~1 -- test/unit/dataValidation.test.ts

# Check for any new schema fields that need tests
git diff HEAD~1..HEAD -- shared/schema.ts
```

## Monitoring & Alerts

### Test Health Monitoring

#### 1. Automated Test Execution
Set up automated test runs:

```bash
# Create cron job for daily test health check
echo "0 6 * * * cd /path/to/project && docker exec fitnessmealplanner-dev npm test > /tmp/test-results.log 2>&1" | crontab -
```

#### 2. Performance Trend Monitoring
Track performance over time:

```bash
# Log performance results
echo "$(date): $(docker exec fitnessmealplanner-dev npm test -- performance.test.ts | grep 'ms')" >> performance-history.log
```

#### 3. Coverage Tracking
Monitor coverage trends:

```bash
# Extract coverage percentage
COVERAGE=$(docker exec fitnessmealplanner-dev npm run test:coverage 2>&1 | grep "All files" | awk '{print $4}')
echo "$(date): Coverage $COVERAGE" >> coverage-history.log
```

### Alert Thresholds

#### Critical Alerts (Immediate Action Required)
- Test pass rate < 95%
- Coverage drops below 75%
- Performance degrades > 50%
- Any test takes > 10 seconds

#### Warning Alerts (Review Within 24 Hours)
- Test pass rate < 98%
- Coverage drops below 80%
- Performance degrades > 25%
- New tests without documentation

## Best Practices Checklist

### Before Adding New Tests
- [ ] Check if similar test already exists
- [ ] Use appropriate factory for test data
- [ ] Include edge cases and error scenarios
- [ ] Add performance validation if applicable
- [ ] Document test purpose and expectations
- [ ] Verify test passes in clean environment

### Before Modifying Existing Tests
- [ ] Understand why change is needed
- [ ] Check impact on related tests
- [ ] Preserve test coverage levels
- [ ] Update documentation if behavior changes
- [ ] Run full test suite after changes
- [ ] Verify CI/CD pipeline still passes

### Before Deploying Test Changes
- [ ] All tests pass locally
- [ ] Coverage targets maintained
- [ ] Performance thresholds met
- [ ] No new accessibility violations
- [ ] Documentation updated
- [ ] Team notified of significant changes

## Documentation Standards

### Test File Documentation
Each test file should include:

```typescript
/**
 * [Feature Name] Test Suite
 *
 * Purpose: Test [specific functionality]
 * Coverage: [list of test scenarios]
 * Dependencies: [required factories/helpers]
 * Performance: [any performance requirements]
 * Maintenance: [special maintenance notes]
 *
 * Last Updated: [date]
 * Last Review: [date]
 */
```

### Maintenance Log
Keep a maintenance log for significant changes:

```markdown
## Test Maintenance Log

### 2024-01-15 - Schema Update
- Updated dataValidation.test.ts for new meal plan fields
- Fixed 14 failing tests
- Coverage maintained at 85%

### 2024-01-10 - Performance Optimization
- Adjusted performance thresholds based on production data
- Recipe validation: 800ms → 1000ms
- Meal plan generation: 1500ms → 2000ms
```

---

*This maintenance guide should be reviewed monthly and updated as the test infrastructure evolves.*