# Recipe Generation Testing - Claude Prompt

**Copy and paste this entire prompt to Claude to run the comprehensive recipe generation tests:**

---

## Task: Run Admin Recipe Generation Test Suite

I have a comprehensive test suite for the Admin Recipe Generation system in FitnessMealPlanner. Please execute the tests and provide me with a detailed report of the results.

### Project Context:
- **Location**: `C:\Users\drmwe\Claude\FitnessMealPlanner`
- **Tech Stack**: React, TypeScript, Node.js, Express, PostgreSQL, Vitest, Playwright
- **Dev Server**: Running on port 5000 (local)
- **Database**: PostgreSQL on port 5433

### Test Files Created:
1. **Integration Tests**: `test/integration/recipeGeneration.integration.test.ts` (40+ tests)
2. **E2E Tests**: `test/e2e/admin-recipe-generation-comprehensive.spec.ts` (60+ tests)
3. **Test Runner**: `test/run-comprehensive-recipe-tests.ts` (automated execution)

### Prerequisites Check:

```bash
# 1. Navigate to project
cd C:\Users\drmwe\Claude\FitnessMealPlanner

# 2. Check if dev server is running (should show port 5000)
curl http://localhost:5000/health

# 3. If server not running, start it:
npm run dev

# 4. Check if Playwright is installed
npx playwright --version

# 5. If not installed:
npx playwright install
```

### Test Execution Options:

#### Option 1: Run Integration Tests (Recommended First)
```bash
cd C:\Users\drmwe\Claude\FitnessMealPlanner
npm run test:integration -- test/integration/recipeGeneration.integration.test.ts --testTimeout=300000
```

**Expected Results:**
- 40+ integration tests covering API endpoints
- Tests authentication, recipe generation, progress tracking
- Duration: ~5 minutes
- Output: Pass/fail status for each test

#### Option 2: Run E2E Tests (Visual Browser Tests)
```bash
cd C:\Users\drmwe\Claude\FitnessMealPlanner
npm run test:playwright:headed -- test/e2e/admin-recipe-generation-comprehensive.spec.ts
```

**Expected Results:**
- 60+ E2E tests with browser automation
- Tests UI workflows, accessibility, responsive design
- Duration: ~10 minutes
- Output: 11 screenshots in `screenshots/` directory

#### Option 3: Run All Tests with Automation (Most Comprehensive)
```bash
cd C:\Users\drmwe\Claude\FitnessMealPlanner
npm run tsx test/run-comprehensive-recipe-tests.ts
```

**Expected Results:**
- Runs all test suites automatically
- Generates coverage report
- Creates JSON report in `test-reports/`
- Duration: ~20 minutes

### Test Credentials:
```
Admin:    admin@fitmeal.pro / AdminPass123
Trainer:  trainer.test@evofitmeals.com / TestTrainer123!
Customer: customer.test@evofitmeals.com / TestCustomer123!
```

### What I Need From You:

1. **Execute one of the test options above** (recommend Option 1 first)
2. **Capture and analyze the results**:
   - How many tests passed?
   - How many tests failed?
   - What were the failure reasons (if any)?
   - What was the total execution time?
3. **Generate a test report** with:
   - Summary statistics
   - Pass/fail breakdown by test category
   - Any errors or issues found
   - Recommendations for fixes (if failures occur)

### Additional Commands (if needed):

```bash
# Generate coverage report
npm run test:coverage:full

# View coverage report (opens in browser)
start coverage/index.html

# View screenshots from E2E tests
dir screenshots\

# Check test reports
dir test-reports\
```

### Documentation Available:
- `QUICK_TEST_REFERENCE.md` - One-page command reference
- `RECIPE_GENERATION_TEST_GUIDE.md` - Complete testing guide (600+ lines)
- `TEST_EXECUTION_REPORT.md` - Detailed execution instructions
- `TEST_IMPLEMENTATION_SUMMARY.md` - High-level overview
- `COMPREHENSIVE_TEST_IMPLEMENTATION_REPORT.md` - Full implementation details

### Troubleshooting:

**If tests timeout:**
- Increase timeout: `--testTimeout=300000`
- Run tests individually with `-t "test name"`

**If login fails:**
- Verify dev server is running: `curl http://localhost:5000/health`
- Check test credentials are correct
- Run: `npm run reset:test-accounts`

**If database connection fails:**
- Check PostgreSQL container: `docker ps | grep postgres`
- Restart database: `docker restart fitnessmealplanner-postgres`

**If Playwright fails:**
- Reinstall browsers: `npx playwright install --with-deps`
- Try headless mode instead: `npm run test:playwright` (without `:headed`)

---

## Expected Output Format:

Please provide your response in this format:

### 1. Test Execution Summary
- Total tests run: X
- Tests passed: X
- Tests failed: X
- Tests skipped: X
- Total duration: X minutes

### 2. Results by Category
- **Integration Tests**: X/40 passed
- **E2E Tests**: X/60 passed
- **Coverage**: X% (if generated)

### 3. Failed Tests (if any)
List each failed test with:
- Test name
- Error message
- Suggested fix

### 4. Screenshots Generated (for E2E tests)
- List of screenshots created in `screenshots/` directory

### 5. Overall Assessment
- System health status
- Production readiness
- Recommendations for improvements

---

**Start by running Option 1 (Integration Tests) and provide me with the detailed results. Then we can proceed to E2E tests if needed.**
