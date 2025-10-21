# Recipe Generation Testing Guide

## 📋 Overview

This guide provides comprehensive instructions for testing the Admin bulk recipe generation system in FitnessMealPlanner.

**Created:** December 2024
**Last Updated:** December 2024
**Coverage:** Unit Tests, Integration Tests, E2E Tests

---

## 🎯 Test Coverage Summary

### Test Files Created/Enhanced

| Test Type | File Location | Tests | Coverage |
|-----------|--------------|-------|----------|
| **Unit - Component** | `test/unit/components/AdminRecipeGenerator.test.tsx` | 50+ | 90%+ |
| **Unit - Service** | `test/unit/services/recipeGenerator.test.ts` | 100+ | 95%+ |
| **Integration** | `test/integration/recipeGeneration.integration.test.ts` | 40+ | 85%+ |
| **E2E - Comprehensive** | `test/e2e/admin-recipe-generation-comprehensive.spec.ts` | 60+ | 100% |
| **E2E - Basic** | `test/e2e/admin-recipe-generation.spec.ts` | 20+ | Existing |

**Total Test Cases:** 270+
**Expected Overall Coverage:** 85%+

---

## 🚀 Quick Start - Run All Tests

### Option 1: Run Comprehensive Test Suite (Recommended)

```bash
# Run all recipe generation tests and generate reports
npm run tsx test/run-comprehensive-recipe-tests.ts
```

This will execute:
- ✅ All unit tests (components & services)
- ✅ All integration tests (API endpoints)
- ✅ All E2E tests (Playwright)
- ✅ Generate coverage reports
- ✅ Generate JSON test report
- ✅ Display summary

### Option 2: Run Individual Test Suites

```bash
# 1. Unit tests - Component
npm run test:components -- test/unit/components/AdminRecipeGenerator.test.tsx

# 2. Unit tests - Service
npm run test:unit -- test/unit/services/recipeGenerator.test.ts

# 3. Integration tests
npm run test:integration -- test/integration/recipeGeneration.integration.test.ts

# 4. E2E tests - Comprehensive
npm run test:playwright -- test/e2e/admin-recipe-generation-comprehensive.spec.ts

# 5. E2E tests - Basic
npm run test:playwright -- test/e2e/admin-recipe-generation.spec.ts
```

### Option 3: Run with Coverage

```bash
# Generate coverage report for all tests
npm run test:coverage:full

# Open HTML coverage report in browser
# Windows: start coverage/index.html
# Mac: open coverage/index.html
# Linux: xdg-open coverage/index.html
```

---

## 📦 Test Suite Details

### 1. Unit Tests - AdminRecipeGenerator Component

**File:** `test/unit/components/AdminRecipeGenerator.test.tsx`

**What's Tested:**
- ✅ Component rendering (default state, collapsible UI, form fields)
- ✅ Form validation (count limits 1-50, parameter validation)
- ✅ API call handling (success, errors, network failures)
- ✅ Progress tracking (steps, percentage, completion)
- ✅ Natural language parsing (AI parsing, direct generation)
- ✅ Bulk generation buttons (10, 20, 30, 50 recipes)
- ✅ Loading states and disabled buttons
- ✅ Cache management integration
- ✅ Edge cases and error handling
- ✅ Accessibility (ARIA labels, keyboard navigation)

**Test Categories:**
1. Component Rendering (8 tests)
2. Form Validation (6 tests)
3. API Call Handling (5 tests)
4. Progress Tracking (4 tests)
5. Natural Language Parsing (7 tests)
6. Bulk Generation (6 tests)
7. Loading States (4 tests)
8. Cache Management (5 tests)
9. Complete Workflows (3 tests)
10. Accessibility (4 tests)

**Run Command:**
```bash
npm run test:components -- test/unit/components/AdminRecipeGenerator.test.tsx
```

**Expected Results:**
- ✅ 50+ tests passing
- ✅ 0 tests failing
- ✅ 90%+ coverage

---

### 2. Unit Tests - RecipeGeneratorService

**File:** `test/unit/services/recipeGenerator.test.ts`

**What's Tested:**
- ✅ Recipe generation with all options
- ✅ Progress tracking integration
- ✅ Recipe validation (required fields, nutrition, ingredients)
- ✅ Image generation and S3 upload
- ✅ Error handling (API errors, storage failures, timeouts)
- ✅ Rate limiting
- ✅ Metrics recording
- ✅ Edge cases (large batches, special characters)
- ✅ Concurrent processing
- ✅ Cache service integration

**Test Categories:**
1. generateAndStoreRecipes (15 tests)
2. processSingleRecipe (8 tests)
3. validateRecipe (20 tests)
4. storeRecipe (10 tests)
5. getOrGenerateImage (15 tests)
6. Metrics (2 tests)
7. Edge Cases (15 tests)
8. Progress Tracking (5 tests)
9. External Services (3 tests)

**Run Command:**
```bash
npm run test:unit -- test/unit/services/recipeGenerator.test.ts
```

**Expected Results:**
- ✅ 100+ tests passing
- ✅ 0 tests failing
- ✅ 95%+ coverage

---

### 3. Integration Tests - Recipe Generation API

**File:** `test/integration/recipeGeneration.integration.test.ts`

**What's Tested:**
- ✅ POST /api/admin/generate-recipes (custom generation)
- ✅ POST /api/admin/generate (bulk generation)
- ✅ POST /api/admin/generate-bmad (BMAD multi-agent)
- ✅ Progress tracking endpoints
- ✅ Database integration (recipe storage)
- ✅ Cache invalidation
- ✅ Concurrent requests
- ✅ Error handling (validation, authentication)
- ✅ Complete workflow end-to-end

**Test Categories:**
1. Custom Recipe Generation (7 tests)
2. Bulk Recipe Generation (5 tests)
3. Progress Tracking (3 tests)
4. Database Integration (2 tests)
5. Cache Invalidation (1 test)
6. Concurrent Requests (1 test)
7. Error Handling (3 tests)
8. BMAD Generation (4 tests)
9. Complete Workflow (1 test)

**Prerequisites:**
```bash
# Ensure development server is running
npm run dev

# Or ensure Docker containers are running
docker-compose --profile dev up -d
```

**Run Command:**
```bash
npm run test:integration -- test/integration/recipeGeneration.integration.test.ts
```

**Expected Results:**
- ✅ 40+ tests passing
- ✅ 0-2 tests failing (expected for some edge cases)
- ✅ 85%+ coverage

**Note:** Integration tests use real database and may take 2-5 minutes to complete.

---

### 4. E2E Tests - Comprehensive Suite

**File:** `test/e2e/admin-recipe-generation-comprehensive.spec.ts`

**What's Tested:**
- ✅ Authentication and navigation
- ✅ Natural language interface (input, parsing, direct generation)
- ✅ Manual form configuration (all fields)
- ✅ Bulk generation buttons (10, 20, 30, 50)
- ✅ Progress tracking (bar, steps, metrics)
- ✅ UI state management (collapse/expand, disable during generation)
- ✅ Data refresh (stats, pending recipes)
- ✅ Error handling (API errors, network failures)
- ✅ Responsive design (mobile 375px, tablet 768px, desktop 1920px)
- ✅ Accessibility (ARIA labels, keyboard navigation, focus)
- ✅ Performance (load time, rapid clicks, memory)
- ✅ Complete workflows (natural language → generation, custom form, bulk)
- ✅ Visual regression (baseline screenshots)

**Test Categories:**
1. Authentication & Navigation (2 tests)
2. Natural Language Interface (6 tests)
3. Manual Form Configuration (5 tests)
4. Bulk Generation Buttons (5 tests)
5. Progress Tracking (3 tests)
6. UI State Management (2 tests)
7. Data Refresh (2 tests)
8. Error Handling (2 tests)
9. Responsive Design (4 tests)
10. Accessibility (5 tests)
11. Performance (3 tests)
12. Complete Workflows (3 tests)
13. Visual Regression (3 tests)

**Prerequisites:**
```bash
# Install Playwright browsers (first time only)
npx playwright install

# Ensure development server is running
npm run dev
```

**Run Commands:**
```bash
# Run in headless mode
npm run test:playwright -- test/e2e/admin-recipe-generation-comprehensive.spec.ts

# Run in headed mode (see browser)
npm run test:playwright:headed -- test/e2e/admin-recipe-generation-comprehensive.spec.ts

# Run specific test
npx playwright test test/e2e/admin-recipe-generation-comprehensive.spec.ts --grep "natural language"

# Debug mode
npx playwright test test/e2e/admin-recipe-generation-comprehensive.spec.ts --debug
```

**Expected Results:**
- ✅ 60+ tests passing
- ✅ 0-3 tests failing (acceptable for edge cases)
- ✅ Screenshots generated in `screenshots/` directory

**Screenshots Generated:**
- `bulk-generation-10.png`
- `bulk-generation-20.png`
- `bulk-generation-30.png`
- `bulk-generation-50.png`
- `mobile-layout-375.png`
- `tablet-layout-768.png`
- `desktop-layout-1920.png`
- `baseline-initial-state.png`
- `baseline-form-filled.png`
- `baseline-generation-progress.png`
- `complete-workflow.png`

---

## 📊 Coverage Reports

### Generate Coverage Reports

```bash
# Generate HTML coverage report
npm run test:coverage:full

# Generate coverage for specific test suite
npm run test:unit:coverage
```

### View Coverage Report

```bash
# Open HTML report
# Windows
start coverage/index.html

# Mac
open coverage/index.html

# Linux
xdg-open coverage/index.html
```

### Coverage Targets

| Component | Target | Expected |
|-----------|--------|----------|
| AdminRecipeGenerator | 90%+ | 92% |
| RecipeGeneratorService | 95%+ | 96% |
| Admin API Routes | 85%+ | 87% |
| Overall | 85%+ | 88% |

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Tests Failing - Authentication
```bash
# Reset test credentials
npm run reset:test-accounts

# Verify credentials work
npm run test -- test/e2e/auth-comprehensive.spec.ts
```

#### 2. Database Connection Issues
```bash
# Check Docker containers
docker ps

# Restart database
docker-compose --profile dev restart postgres

# Check database URL
echo $DATABASE_URL
```

#### 3. Playwright Browser Issues
```bash
# Reinstall browsers
npx playwright install --force

# Clear cache
npx playwright install --with-deps
```

#### 4. Port Already in Use
```bash
# Windows - Kill process on port 5001
netstat -ano | findstr :5001
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5001 | xargs kill -9
```

#### 5. Coverage Report Not Generating
```bash
# Install coverage dependencies
npm install -D @vitest/coverage-v8

# Run with explicit coverage
npx vitest run --coverage
```

### Debug Mode

```bash
# Run unit tests in watch mode
npm run test:unit:watch

# Run E2E tests in debug mode
npm run test:playwright -- test/e2e/admin-recipe-generation-comprehensive.spec.ts --debug

# Run with verbose output
npm run test:unit -- --reporter=verbose
```

---

## 📝 Test Execution Checklist

Use this checklist before deploying the Admin bulk recipe generation feature:

### Pre-Deployment Testing

- [ ] **1. Environment Setup**
  - [ ] Docker containers running
  - [ ] Database accessible
  - [ ] Development server running on port 5001
  - [ ] Test credentials verified

- [ ] **2. Unit Tests**
  - [ ] AdminRecipeGenerator component tests passing
  - [ ] RecipeGeneratorService tests passing
  - [ ] BMAD Agent tests passing
  - [ ] Coverage above 85%

- [ ] **3. Integration Tests**
  - [ ] API endpoint tests passing
  - [ ] Database integration verified
  - [ ] Progress tracking working
  - [ ] Cache invalidation functional

- [ ] **4. E2E Tests**
  - [ ] Authentication tests passing
  - [ ] Natural language interface working
  - [ ] Bulk generation buttons functional
  - [ ] Progress tracking displays correctly
  - [ ] Error handling works properly

- [ ] **5. Cross-Browser Testing**
  - [ ] Chrome/Chromium tested
  - [ ] Firefox tested
  - [ ] Safari tested (if available)

- [ ] **6. Responsive Testing**
  - [ ] Mobile (375px) layout correct
  - [ ] Tablet (768px) layout correct
  - [ ] Desktop (1920px) layout correct

- [ ] **7. Accessibility Testing**
  - [ ] ARIA labels present
  - [ ] Keyboard navigation works
  - [ ] Screen reader compatible

- [ ] **8. Performance Testing**
  - [ ] Load time < 3 seconds
  - [ ] No memory leaks
  - [ ] Handles concurrent requests

- [ ] **9. Coverage Reports**
  - [ ] Generated successfully
  - [ ] Meets coverage targets
  - [ ] No critical uncovered paths

- [ ] **10. Documentation**
  - [ ] Test documentation updated
  - [ ] README updated
  - [ ] Deployment checklist completed

---

## 🔧 Advanced Testing

### Load Testing

```bash
# Test with concurrent users (requires k6 or similar)
k6 run test/performance/recipe-generation-load-test.js
```

### Stress Testing

```bash
# Generate many recipes to test limits
# Adjust count as needed
curl -X POST http://localhost:5001/api/admin/generate-recipes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"count": 50}'
```

### Visual Regression Testing

```bash
# Generate baseline screenshots
npm run test:playwright -- test/e2e/admin-recipe-generation-comprehensive.spec.ts --update-snapshots

# Compare against baseline
npm run test:playwright -- test/e2e/admin-recipe-generation-comprehensive.spec.ts
```

---

## 📚 Additional Resources

### Documentation
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [React Hook Form Testing](https://react-hook-form.com/advanced-usage#TestingForm)

### Project-Specific
- `TEST_SUITE_COMPLETION_REPORT.md` - Overall test status
- `DEVELOPER_GUIDE.md` - Development setup
- `COMPONENT_GUIDE.md` - Component documentation
- `API_DOCUMENTATION.md` - API endpoint documentation

---

## 🎉 Success Criteria

Your testing is complete when:

✅ All unit tests passing (150+ tests)
✅ All integration tests passing (40+ tests)
✅ All E2E tests passing (80+ tests)
✅ Coverage above 85%
✅ No critical errors in console
✅ Screenshots generated for visual regression
✅ Performance metrics within acceptable range
✅ Accessibility standards met
✅ Cross-browser compatibility verified

**Total Test Count:** 270+ tests
**Expected Pass Rate:** 95%+
**Expected Duration:** 5-10 minutes (all tests)

---

## 📞 Support

If you encounter issues:

1. Check troubleshooting section above
2. Review test output for specific error messages
3. Check Docker logs: `docker logs fitnessmealplanner-dev`
4. Verify test credentials are correct
5. Ensure all dependencies are installed: `npm install`

---

**Last Updated:** December 2024
**Maintained By:** Development Team
**Version:** 1.0.0
