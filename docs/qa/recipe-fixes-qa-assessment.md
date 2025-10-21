# QA Risk Assessment & Test Strategy

**BMAD Phases 3 & 4**: Quality Assurance Review
**Date**: January 19, 2025
**QA Agent**: Quality Assurance Specialist

---

## Risk Assessment Matrix

| Issue | Severity | Complexity | Regression Risk | Test Priority | Risk Level |
|-------|----------|------------|-----------------|---------------|------------|
| #1: Delete | HIGH | LOW | LOW | P0 | **LOW** |
| #2: Background Gen | MEDIUM | MEDIUM | MEDIUM | P1 | **MEDIUM** |
| #3: Auto-Refresh | MEDIUM | LOW | LOW | P1 | **LOW** |
| #4: Validation | HIGH | HIGH | HIGH | P0 | **HIGH** |
| #5: Quick Bulk | MEDIUM | LOW | LOW | P2 | **LOW** |
| #6: Natural Language | HIGH | MEDIUM | MEDIUM | P1 | **MEDIUM** |

---

## Detailed Risk Analysis

### Issue #1: Recipe Delete (Risk Level: LOW ⚠️)
**Impact**: Data loss if delete works incorrectly
**Regression Risk**: LOW - Simple parameter fix
**Test Coverage Required**: 85%

**Risks**:
- ✅ Accidentally delete wrong recipes
- ✅ Foreign key constraints block deletion
- ✅ UI doesn't refresh after delete

**Mitigation**:
- Add confirmation dialog (already exists)
- Test with related data (meal plans using recipes)
- Comprehensive E2E test with verification

---

### Issue #2: Background Generation (Risk Level: MEDIUM ⚠️⚠️)
**Impact**: Poor UX if generation blocks UI
**Regression Risk**: MEDIUM - New SSE infrastructure
**Test Coverage Required**: 90%

**Risks**:
- ⚠️ SSE connection drops during generation
- ⚠️ Multiple tabs cause duplicate SSE connections
- ⚠️ Browser refresh loses progress tracking
- ⚠️ Memory leaks from EventSource not closing

**Mitigation**:
- Implement reconnection logic with localStorage
- Close EventSource on component unmount
- Test connection stability
- E2E tests with tab switching

---

### Issue #3: Query Auto-Refresh (Risk Level: LOW ⚠️)
**Impact**: Stale data in UI
**Regression Risk**: LOW - Query invalidation is safe
**Test Coverage Required**: 80%

**Risks**:
- ✅ Over-invalidation causes performance issues
- ✅ Race conditions with multiple generations

**Mitigation**:
- Invalidate only necessary query keys
- Test with concurrent generations
- Monitor network tab for excessive requests

---

### Issue #4: Recipe Validation (Risk Level: HIGH ⚠️⚠️⚠️)
**Impact**: Invalid recipes in database
**Regression Risk**: HIGH - New service with complex logic
**Test Coverage Required**: 95%+

**Risks**:
- ⚠️⚠️ Validation logic has bugs
- ⚠️⚠️ Edge cases not covered (null, negative, undefined)
- ⚠️ Performance degradation with validation overhead
- ⚠️ Validation too strict (rejects valid recipes)
- ⚠️ Validation too lenient (allows invalid recipes)

**Mitigation**:
- Comprehensive unit tests (15+ test cases)
- Property-based testing for edge cases
- Performance benchmarks
- Manual testing with real constraints

---

### Issue #5: Quick Bulk Generator (Risk Level: LOW ⚠️)
**Impact**: Feature non-functional
**Regression Risk**: LOW - UI change only
**Test Coverage Required**: 80%

**Risks**:
- ✅ Wrong parameters sent to backend
- ✅ Progress bar doesn't appear

**Mitigation**:
- E2E test verifying generated recipes
- Verify default parameters applied
- Test all 4 buttons (10, 20, 30, 50)

---

### Issue #6: Natural Language Generator (Risk Level: MEDIUM ⚠️⚠️)
**Impact**: Advanced feature non-functional
**Regression Risk**: MEDIUM - New endpoint + parsing
**Test Coverage Required**: 90%

**Risks**:
- ⚠️ Parsing fails for valid prompts
- ⚠️ Parsing extracts wrong parameters
- ⚠️ OpenAI API failures
- ⚠️ API cost from parsing

**Mitigation**:
- Unit tests with variety of prompts
- Error handling for API failures
- Cost monitoring
- Fallback to hardcoded examples

---

## Test Strategy

### Unit Test Plan (38 tests)

**RecipeValidator.test.ts** (15 tests)
```typescript
describe('RecipeValidator', () => {
  describe('Calorie Validation', () => {
    test('should pass when calories below maxCalories');
    test('should fail when calories exceed maxCalories');
    test('should pass when calories above minCalories');
    test('should fail when calories below minCalories');
    test('should handle null calories gracefully');
  });

  describe('Protein Validation', () => {
    test('should pass when protein in range');
    test('should fail when protein exceeds max');
    test('should fail when protein below min');
  });

  describe('Carbs Validation', () => {
    test('should pass when carbs in range');
    test('should fail when carbs exceed max');
    test('should fail when carbs below min');
  });

  describe('Fat Validation', () => {
    test('should pass when fat in range');
    test('should fail when fat exceed max');
    test('should fail when fat below min');
  });

  describe('Prep Time Validation', () => {
    test('should pass when prep time below max');
  });

  describe('Batch Validation', () => {
    test('should validate multiple recipes and separate valid/invalid');
    test('should return correct stats');
  });
});
```

**adminRoutes.test.ts** (8 tests)
```typescript
describe('Admin Routes - Recipe Delete', () => {
  test('DELETE /recipes - should delete recipes with valid ids');
  test('DELETE /recipes - should reject invalid ids array');
  test('DELETE /recipes - should handle database errors');
  test('DELETE /recipes/:id - should delete single recipe');
});

describe('Admin Routes - Natural Language', () => {
  test('POST /generate-recipes-from-prompt - should parse and generate');
  test('POST /generate-recipes-from-prompt - should handle invalid prompts');
  test('POST /generate-recipes-from-prompt - should return jobId');
  test('POST /generate-recipes-from-prompt - should validate parameters');
});
```

**recipeGenerator.test.ts** (10 tests)
```typescript
describe('Recipe Generator with Validation', () => {
  test('should validate recipes before saving');
  test('should reject recipes exceeding maxCalories');
  test('should retry generation for invalid recipes');
  test('should report validation statistics');
  test('should handle all constraint combinations');
  test('should not validate when constraints not provided');
  test('should log invalid recipes');
  test('should save only valid recipes');
  test('should handle validation errors gracefully');
  test('should track validation metrics');
});
```

**naturalLanguageParsing.test.ts** (5 tests)
```typescript
describe('Natural Language Parsing', () => {
  test('should extract count from prompt');
  test('should extract meal types from prompt');
  test('should extract calorie limits from prompt');
  test('should extract dietary restrictions from prompt');
  test('should handle incomplete prompts with defaults');
});
```

---

### Integration Test Plan (6 tests)

**deleteWithConstraints.integration.test.ts**
```typescript
test('should delete recipe with meal plan associations');
test('should cascade delete or handle orphans correctly');
```

**backgroundGenerationSSE.integration.test.ts**
```typescript
test('should emit progress events via SSE');
test('should handle SSE reconnection after disconnect');
```

**queryInvalidation.integration.test.ts**
```typescript
test('should invalidate queries after generation complete');
test('should refetch pending recipes automatically');
```

---

### E2E Test Plan (12 tests)

**recipe-delete.e2e.spec.ts**
```typescript
test('should delete selected recipes from UI');
test('should refresh list after delete');
test('should show confirmation toast');
```

**background-generation.e2e.spec.ts**
```typescript
test('should allow tab switching during generation');
test('should show portable progress widget');
test('should reconnect after page refresh');
test('should complete generation even if tab closed');
```

**recipe-validation.e2e.spec.ts**
```typescript
test('should generate recipes meeting maxCalories constraint');
test('should generate recipes meeting protein range');
test('should show validation statistics in UI');
```

**quick-bulk-generator.e2e.spec.ts**
```typescript
test('should start generation on button click');
test('should use default fitness-focused parameters');
test('should show progress bar');
```

**natural-language-generator.e2e.spec.ts**
```typescript
test('Parse with AI populates form fields');
test('Generate Directly creates recipes');
test('should handle various prompt formats');
```

---

## Test Execution Order

### Phase 1: Unit Tests First (8 hours)
1. RecipeValidator.test.ts (15 tests) - 3 hours
2. adminRoutes.test.ts (8 tests) - 2 hours
3. recipeGenerator.test.ts (10 tests) - 2 hours
4. naturalLanguageParsing.test.ts (5 tests) - 1 hour

**Goal**: 95%+ code coverage on new services

### Phase 2: Integration Tests (3 hours)
5. All integration tests (6 tests) - 3 hours

**Goal**: Verify component interactions

### Phase 3: E2E Tests (4 hours)
6. All E2E tests (12 tests) - 4 hours

**Goal**: Verify user flows work end-to-end

**Total Test Development Time**: 15 hours

---

## Quality Gates

### Gate 1: Unit Tests
- ✅ All 38 unit tests passing
- ✅ Code coverage ≥ 95% for new code
- ✅ No critical bugs in validation logic

**Action if FAIL**: Fix unit tests before integration

### Gate 2: Integration Tests
- ✅ All 6 integration tests passing
- ✅ SSE connections stable
- ✅ Query invalidation working

**Action if FAIL**: Debug integration issues

### Gate 3: E2E Tests
- ✅ All 12 E2E tests passing
- ✅ Manual QA on all 6 fixes
- ✅ No regression in existing features

**Action if FAIL**: Fix E2E failures, repeat manual QA

### Gate 4: Production Readiness
- ✅ All quality gates passed
- ✅ Performance benchmarks met
- ✅ Documentation complete

**Action if PASS**: Approve for production deployment

---

## Performance Benchmarks

### Recipe Validation
- **Target**: <50ms per recipe
- **Test**: Validate 100 recipes, measure time
- **Threshold**: <5 seconds for 100 recipes

### SSE Connection
- **Target**: <200ms to establish connection
- **Test**: Connect 10 times, measure average
- **Threshold**: <2 seconds for 10 connections

### Query Invalidation
- **Target**: <100ms to refetch queries
- **Test**: Invalidate and measure refetch time
- **Threshold**: <1 second to UI update

### Delete Operation
- **Target**: <200ms for bulk delete
- **Test**: Delete 50 recipes, measure time
- **Threshold**: <500ms for 50 recipes

---

## Test Data Requirements

### Test Recipes
- **Quantity**: 100 test recipes
- **Variety**: All meal types, dietary tags
- **Nutrition**: Range of calorie/protein/carb/fat values
- **Edge Cases**: Very low/high calories, prep times

### Test Users
- **Admin**: admin@fitmeal.pro
- **Trainer**: trainer.test@evofitmeals.com
- **Customer**: customer.test@evofitmeals.com

### Test Constraints
```json
{
  "maxCalories": [200, 300, 500, 800],
  "minCalories": [100, 200, 400],
  "maxProtein": [20, 30, 50],
  "minProtein": [10, 15, 25],
  "maxPrepTime": [15, 30, 60],
  "mealTypes": ["breakfast", "lunch", "dinner", "snack"],
  "dietaryTags": ["keto", "vegan", "paleo", "gluten-free"]
}
```

---

## BMAD Phases 3 & 4 Complete ✅

**Deliverables**:
- ✅ Risk assessment for all 6 issues
- ✅ Test strategy with 56 total tests
- ✅ Quality gates defined
- ✅ Performance benchmarks set
- ✅ Test data requirements specified

**QA Sign-Off**: Ready for implementation with comprehensive test coverage

**Next Phase**: Begin implementation starting with LOW-RISK quick wins

---

**Status**: APPROVED FOR DEVELOPMENT
**Total Test Coverage**: 56 tests (38 unit + 6 integration + 12 E2E)
**Estimated Test Development**: 15 hours
**Risk Mitigation**: Comprehensive for HIGH-RISK items
