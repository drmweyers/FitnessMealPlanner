# Story: Critical Unit Test Coverage for P0 Gaps
**BMAD SM Agent:** Story creation
**Story ID:** TEST-COVERAGE-001
**Epic:** Test Coverage Enhancement
**Priority:** P0 - CRITICAL
**Estimate:** 40 hours (Week 1)
**Status:** Ready for Development

---

## Story Overview

**As a:** Development Team
**I want to:** Implement critical unit tests for identified coverage gaps
**So that:** We prevent data loss, security vulnerabilities, and business logic errors

**Acceptance Criteria:**
- ✅ 100% pass rate on all new tests
- ✅ 90%+ code coverage on critical paths
- ✅ All P0 scenarios from risk assessment covered
- ✅ Tests executable in CI/CD pipeline

---

## Tasks Breakdown

### Task 1: Cascade Delete Unit Tests
**File:** `test/unit/cascadeDeletes.test.ts`
**Estimated:** 8 hours
**Priority:** P0 - CRITICAL

**Scenarios to Test:**
1. User deletion cascades to all related tables
2. Meal plan deletion cascades to grocery lists
3. Trainer deletion cascades to customer relationships
4. Recipe deletion with active assignments
5. Foreign key constraint enforcement
6. Transaction rollback on cascade failure

**Example Test Structure:**
```typescript
describe('Cascade Deletes', () => {
  describe('User Deletion', () => {
    it('should delete all meal plans when user deleted');
    it('should delete all measurements when user deleted');
    it('should delete all progress photos when user deleted');
    it('should delete all grocery lists when user deleted');
    it('should delete all assignments when user deleted');
  });

  describe('Meal Plan Deletion', () => {
    it('should delete all grocery lists when meal plan deleted');
    it('should delete all assignments when meal plan deleted');
  });

  describe('Trainer Deletion', () => {
    it('should delete all customer relationships when trainer deleted');
    it('should reassign or delete meal plans when trainer deleted');
  });
});
```

---

### Task 2: Authorization Enforcement Unit Tests
**File:** `test/unit/authorizationEnforcement.test.ts`
**Estimated:** 10 hours
**Priority:** P0 - CRITICAL (Security)

**Scenarios to Test:**
1. Customer cannot access trainer endpoints
2. Trainer cannot access admin endpoints
3. Customer cannot view other customer's data
4. Role-based permission boundaries enforced
5. JWT token validation
6. Session authorization

**Example Test Structure:**
```typescript
describe('Authorization Enforcement', () => {
  describe('Customer Access Control', () => {
    it('should reject customer accessing trainer endpoints', async () => {
      const customer = await createTestCustomer();
      const result = await tryAccess('/api/trainer/customers', customer.token);
      expect(result.status).toBe(403);
      expect(result.body.error).toContain('Forbidden');
    });

    it('should prevent customer from viewing other customer data', async () => {
      const customer1 = await createTestCustomer();
      const customer2 = await createTestCustomer();

      const result = await getMeasurements(customer2.id, customer1.token);
      expect(result.data).toHaveLength(0); // No data from customer2
    });
  });

  describe('Trainer Access Control', () => {
    it('should reject trainer accessing admin endpoints');
    it('should allow trainer accessing assigned customer data');
    it('should reject trainer accessing unassigned customer data');
  });

  describe('Admin Access Control', () => {
    it('should allow admin accessing all endpoints');
    it('should allow admin viewing all customer data');
  });
});
```

---

### Task 3: S3 Orphan Detection Unit Tests
**File:** `test/unit/s3OrphanDetection.test.ts`
**Estimated:** 6 hours
**Priority:** P0 - CRITICAL (Data integrity)

**Scenarios to Test:**
1. S3 file uploaded but database insert fails → file deleted
2. Database record deleted → S3 file deleted
3. Orphaned S3 file detection algorithm
4. S3 cleanup on transaction rollback

**Example Test Structure:**
```typescript
describe('S3 Orphan Detection', () => {
  describe('Upload Failure Cleanup', () => {
    it('should delete S3 file if database insert fails', async () => {
      const mockS3 = mockS3Client();
      const mockDB = mockDatabaseFailure();

      await expect(uploadProgressPhoto(photo)).rejects.toThrow();

      // Verify S3 file was uploaded then deleted
      expect(mockS3.putObject).toHaveBeenCalled();
      expect(mockS3.deleteObject).toHaveBeenCalledWith({ Key: photo.s3Key });
    });
  });

  describe('Delete Cascade Cleanup', () => {
    it('should delete S3 file when database record deleted', async () => {
      const photo = await uploadProgressPhoto(testPhoto);

      await deleteProgressPhoto(photo.id);

      // Verify S3 file deleted
      await expect(s3Client.headObject({ Key: photo.s3Key })).rejects.toThrow();
    });
  });

  describe('Orphan Detection Algorithm', () => {
    it('should detect S3 files without database records');
    it('should detect database records without S3 files');
  });
});
```

---

### Task 4: Grocery List Cascade Unit Tests
**File:** `test/unit/groceryListCascade.test.ts`
**Estimated:** 5 hours
**Priority:** P0 - CRITICAL

**Scenarios to Test:**
1. Meal plan deleted → grocery lists deleted
2. User deleted → grocery lists deleted
3. Grocery list items cascade deleted
4. Race condition handling (concurrent deletes)

**Example Test Structure:**
```typescript
describe('Grocery List Cascade', () => {
  describe('Meal Plan Deletion', () => {
    it('should delete all grocery lists when meal plan deleted', async () => {
      const mealPlan = await createMealPlan();
      const groceryLists = await createGroceryLists(mealPlan.id, 3);

      await deleteMealPlan(mealPlan.id);

      const remaining = await getGroceryLists({ mealPlanId: mealPlan.id });
      expect(remaining).toHaveLength(0);
    });
  });

  describe('User Deletion', () => {
    it('should delete all grocery lists when user deleted', async () => {
      const user = await createUser();
      const groceryLists = await createGroceryLists(user.id, 5);

      await deleteUser(user.id);

      const remaining = await getGroceryLists({ customerId: user.id });
      expect(remaining).toHaveLength(0);
    });
  });

  describe('Concurrent Delete Handling', () => {
    it('should handle concurrent meal plan and grocery list deletes', async () => {
      const mealPlan = await createMealPlan();
      const groceryList = await createGroceryList(mealPlan.id);

      await Promise.all([
        deleteMealPlan(mealPlan.id),
        deleteGroceryList(groceryList.id)
      ]);

      // Should not error, one operation should succeed
      const remaining = await getGroceryLists({ mealPlanId: mealPlan.id });
      expect(remaining).toHaveLength(0);
    });
  });
});
```

---

### Task 5: Business Logic Unit Tests
**File:** `test/unit/businessLogicGaps.test.ts`
**Estimated:** 11 hours
**Priority:** P1 - HIGH

**Untested Services to Cover:**
1. `nutritionalOptimizer.ts` - Nutrition optimization
2. `customerPreferenceService.ts` - Preference learning
3. `assignmentHistoryTracker.ts` - Assignment tracking
4. `progressAnalyticsService.ts` - Progress analytics
5. `mealPlanScheduler.ts` - Meal prep scheduling

**Example Test Structure:**
```typescript
describe('Business Logic Gaps', () => {
  describe('Nutritional Optimizer', () => {
    it('should optimize macros to target ranges', async () => {
      const mealPlan = createUnoptimizedMealPlan();
      const targets = { protein: 150, carbs: 200, fat: 60 };

      const optimized = await nutritionalOptimizer.optimize(mealPlan, targets);

      expect(optimized.macros.protein).toBeCloseTo(150, -1);
      expect(optimized.macros.carbs).toBeCloseTo(200, -1);
      expect(optimized.macros.fat).toBeCloseTo(60, -1);
    });

    it('should respect dietary restrictions during optimization');
    it('should handle impossible optimization targets gracefully');
  });

  describe('Customer Preference Learning', () => {
    it('should update preference scores based on engagement');
    it('should recommend recipes based on learned preferences');
    it('should track engagement metrics accurately');
  });

  describe('Assignment History Tracker', () => {
    it('should calculate assignment statistics accurately');
    it('should track assignment trends over time');
    it('should export assignment history to CSV');
  });

  describe('Progress Analytics Service', () => {
    it('should calculate progress trends accurately');
    it('should detect milestone achievements');
    it('should generate progress summaries');
  });

  describe('Meal Plan Scheduler', () => {
    it('should create intelligent meal prep schedules');
    it('should calculate meal prep time accurately');
    it('should schedule notifications appropriately');
  });
});
```

---

## Implementation Guidelines

### Setup Requirements
```typescript
// Test database setup
import { setupTestDatabase, cleanupTestDatabase } from '@/test/helpers/database';

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await cleanupTestDatabase();
});

beforeEach(async () => {
  await cleanupAllTables();
});
```

### Mock Strategy
- **Database:** Use test database (not mocks) for integration accuracy
- **S3 Client:** Mock AWS SDK calls
- **OpenAI API:** Mock API calls (use fixtures)
- **External Services:** Mock email, PDF generation

### Test Data Strategy
- Use test data factories for consistency
- Isolated test data (no shared state)
- Cleanup after each test
- Realistic data (not edge cases only)

---

## Acceptance Criteria Checklist

### Code Quality
- [ ] All tests follow existing test patterns
- [ ] Test names are descriptive (BDD style)
- [ ] Test code is well-commented
- [ ] No code duplication in tests

### Coverage
- [ ] All P0 scenarios from risk assessment covered
- [ ] 90%+ code coverage on critical paths
- [ ] All edge cases tested
- [ ] Error paths tested

### Performance
- [ ] Unit tests complete in < 100ms each
- [ ] Total test suite < 30 seconds
- [ ] No flaky tests (100% reliable)

### Documentation
- [ ] README updated with new test instructions
- [ ] Test file headers explain purpose
- [ ] Complex test logic commented
- [ ] Test data factories documented

---

## Definition of Done

1. ✅ All 5 test files created and implemented
2. ✅ 100% pass rate on all new tests
3. ✅ Code coverage report shows 90%+ on critical paths
4. ✅ No flaky tests detected (3 consecutive runs pass)
5. ✅ Tests executable in CI/CD
6. ✅ README documentation updated
7. ✅ QA review completed and approved
8. ✅ All acceptance criteria met

---

## Testing the Tests

### Manual Validation
```bash
# Run new tests
npm run test -- test/unit/cascadeDeletes.test.ts
npm run test -- test/unit/authorizationEnforcement.test.ts
npm run test -- test/unit/s3OrphanDetection.test.ts
npm run test -- test/unit/groceryListCascade.test.ts
npm run test -- test/unit/businessLogicGaps.test.ts

# Run all unit tests
npm run test:unit

# Check coverage
npm run test:coverage
```

### Automated Validation
- CI/CD pipeline runs all tests
- Coverage report generated
- Test results logged

---

## Dependencies

**Required:**
- Test database setup (PostgreSQL)
- Test S3 bucket (DigitalOcean Spaces)
- Test data factories
- Mocking libraries (vitest, msw)

**Blocked By:** None (ready to start)

---

## Risk Mitigation

**If tests fail:**
1. P0 failures → BLOCK deployment
2. P1 failures → Fix before next sprint
3. Flaky tests → Investigate and fix immediately

**Rollback Plan:**
- All tests are new (no existing tests modified)
- Can disable new tests if blocking deployment
- Test database isolated (no production impact)

---

**Story Status:** ✅ Ready for Development
**Next Step:** Assign to developer for implementation (BMAD Dev agent)

**Created By:** BMAD SM Agent
**Date:** October 21, 2025
