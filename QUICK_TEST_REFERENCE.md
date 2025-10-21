# Quick Test Reference Card
## Admin Recipe Generation Testing

**🚀 Quick Start:** Run all tests in 1 command
```bash
npm run tsx test/run-comprehensive-recipe-tests.ts
```

---

## 📦 Test Suites (Individual)

### 1. Component Tests (50+ tests, ~2min)
```bash
npm run test:components -- test/unit/components/AdminRecipeGenerator.test.tsx
```

### 2. Service Tests (100+ tests, ~3min)
```bash
npm run test:unit -- test/unit/services/recipeGenerator.test.ts
```

### 3. Integration Tests (40+ tests, ~5min)
**Requires:** Dev server running
```bash
npm run test:integration -- test/integration/recipeGeneration.integration.test.ts
```

### 4. E2E Tests - Comprehensive (60+ tests, ~10min)
**Requires:** Dev server + Playwright installed
```bash
# Headless
npm run test:playwright -- test/e2e/admin-recipe-generation-comprehensive.spec.ts

# See browser (headed mode)
npm run test:playwright:headed -- test/e2e/admin-recipe-generation-comprehensive.spec.ts
```

---

## 📊 Coverage Reports

```bash
# Generate HTML coverage report
npm run test:coverage:full

# Open report
start coverage/index.html  # Windows
open coverage/index.html   # Mac
```

---

## 🛠️ Prerequisites

```bash
# 1. Start Docker (if not running)
docker-compose --profile dev up -d

# 2. Start dev server
npm run dev

# 3. Install Playwright (first time only)
npx playwright install
```

---

## ✅ Expected Results

| Suite | Tests | Expected Pass | Coverage |
|-------|-------|---------------|----------|
| Components | 50+ | 50 | 90%+ |
| Services | 100+ | 100 | 95%+ |
| Integration | 40+ | 38-40 | 85%+ |
| E2E | 60+ | 57-60 | 100% |
| **TOTAL** | **270+** | **265+** | **88%** |

---

## 🔧 Quick Fixes

### Test Failing - "Cannot find module"
```bash
npm install
```

### Integration Tests - "Connection Refused"
```bash
npm run dev
# Or: docker-compose --profile dev up -d
```

### E2E Tests - "Timeout"
```bash
npx playwright install
```

### Coverage Not Generated
```bash
npm install -D @vitest/coverage-v8
```

---

## 📁 Key Files

- **Test Guide:** `RECIPE_GENERATION_TEST_GUIDE.md` (600+ lines)
- **Full Report:** `COMPREHENSIVE_TEST_IMPLEMENTATION_REPORT.md`
- **Integration Tests:** `test/integration/recipeGeneration.integration.test.ts`
- **E2E Comprehensive:** `test/e2e/admin-recipe-generation-comprehensive.spec.ts`
- **Test Runner:** `test/run-comprehensive-recipe-tests.ts`

---

## 🎯 Test Credentials

**Admin:**
- Email: `admin@fitmeal.pro`
- Password: `AdminPass123`

**Trainer:**
- Email: `trainer.test@evofitmeals.com`
- Password: `TestTrainer123!`

**Customer:**
- Email: `customer.test@evofitmeals.com`
- Password: `TestCustomer123!`

---

## 🐛 Debug Mode

```bash
# Run specific E2E test with debug
npx playwright test test/e2e/admin-recipe-generation-comprehensive.spec.ts --grep "natural language" --debug

# Run with verbose output
npm run test:unit -- --reporter=verbose

# Watch mode for development
npm run test:unit:watch
```

---

## 📸 Screenshots Location

After E2E tests run, screenshots saved to:
```
screenshots/
├── bulk-generation-10.png
├── bulk-generation-20.png
├── bulk-generation-30.png
├── bulk-generation-50.png
├── mobile-layout-375.png
├── tablet-layout-768.png
├── desktop-layout-1920.png
├── baseline-initial-state.png
├── baseline-form-filled.png
├── baseline-generation-progress.png
└── complete-workflow.png
```

---

## 🎉 Success Criteria

✅ 270+ tests created
✅ 85%+ coverage
✅ All critical workflows tested
✅ Accessibility verified
✅ Responsive design tested
✅ Error handling comprehensive
✅ Performance benchmarks met

---

**Quick Help:** See `RECIPE_GENERATION_TEST_GUIDE.md` for detailed instructions
**Full Report:** See `COMPREHENSIVE_TEST_IMPLEMENTATION_REPORT.md`
**Status:** ✅ **PRODUCTION READY**
