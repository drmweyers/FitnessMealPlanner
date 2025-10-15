# Role Interaction Testing Execution Guide
**Version**: 1.0
**Created**: January 14, 2025
**Status**: Ready for Execution

---

## 🎯 Quick Start

To run all role interaction tests:

```bash
# Run all role interaction tests (unit + integration + E2E)
npm run test:role-interactions

# Run specific test suites
npm run test:role-interactions:unit      # Unit tests only (30 tests)
npm run test:role-interactions:e2e       # E2E tests only (8 tests)
npm run test:role-interactions:integration  # Integration tests (existing 100 tests)
```

---

## 📊 Test Suite Overview

### What Was Created

**1. Comprehensive Testing Protocol** ✅
- **File**: `docs/qa/role-interaction-testing-protocol.md`
- **Content**: Complete test architecture, risk assessment, and implementation plan
- **BMAD Methodology**: QA Agent test design approach

**2. Unit Tests** ✅
- **File**: `test/unit/services/roleInteractions.test.ts`
- **Tests**: 30 unit tests
- **Coverage**:
  - Admin-Trainer interactions (11 tests)
  - Trainer-Customer interactions (13 tests)
  - Admin-Customer interactions (2 tests)
  - Cross-role permissions (4 tests)

**3. E2E Tests** ✅
- **File**: `test/e2e/role-collaboration-workflows.spec.ts`
- **Tests**: 8 comprehensive E2E workflows
- **Coverage**:
  1. Recipe Workflow (Admin → Trainer → Customer)
  2. Admin Trainer Management
  3. Trainer-Customer Invitation Workflow
  4. Meal Plan Assignment Workflow
  5. Multi-Plan Management
  6. Progress Tracking Workflow
  7. Admin Customer Support
  8. Complete System Workflow (Full Lifecycle)

**4. Un-skipped Existing Test** ✅
- **File**: `test/e2e/workflows/complete-user-journeys.spec.ts`
- **Change**: Removed `.skip` from multi-role workflow test (line 91)
- **Now Runs**: Multi-role workflow test executes automatically

---

## 🚀 Running the Tests

### Prerequisites

```bash
# Ensure Docker is running
docker ps

# Start development environment
docker-compose --profile dev up -d

# Verify database is ready
docker logs fitnessmealplanner-dev --tail 20
```

### Unit Tests

```bash
# Run all role interaction unit tests
npm run test -- test/unit/services/roleInteractions.test.ts

# Run with coverage
npm run test:coverage -- test/unit/services/roleInteractions.test.ts

# Run specific test suite
npm run test -- test/unit/services/roleInteractions.test.ts -t "Admin-Trainer"
npm run test -- test/unit/services/roleInteractions.test.ts -t "Trainer-Customer"
npm run test -- test/unit/services/roleInteractions.test.ts -t "Cross-Role"
```

**Expected Output**:
```
✓ Role Interaction Logic - Unit Tests (30 tests)
  ✓ Admin-Trainer Interactions (11 tests)
    ✓ Recipe Management (5 tests)
    ✓ User Account Management (4 tests)
    ✓ System Management (2 tests)
  ✓ Trainer-Customer Interactions (13 tests)
    ✓ Customer Invitations (4 tests)
    ✓ Meal Plan Management (5 tests)
    ✓ Progress Tracking (4 tests)
  ✓ Admin-Customer Interactions (2 tests)
  ✓ Cross-Role Permission Validation (4 tests)

Test Files  1 passed (1)
Tests      30 passed (30)
```

### E2E Tests

```bash
# Run all role collaboration E2E tests
npx playwright test test/e2e/role-collaboration-workflows.spec.ts

# Run with UI mode (recommended for debugging)
npx playwright test test/e2e/role-collaboration-workflows.spec.ts --ui

# Run specific test
npx playwright test test/e2e/role-collaboration-workflows.spec.ts -g "Complete Recipe Workflow"

# Run in headed mode (see browser)
npx playwright test test/e2e/role-collaboration-workflows.spec.ts --headed

# Run across all browsers
npx playwright test test/e2e/role-collaboration-workflows.spec.ts --project=chromium --project=firefox --project=webkit
```

**Expected Output**:
```
Running 8 tests using 1 worker

✓ [chromium] › role-collaboration-workflows.spec.ts:1 Complete Recipe Workflow
✓ [chromium] › role-collaboration-workflows.spec.ts:2 Admin Trainer Management
✓ [chromium] › role-collaboration-workflows.spec.ts:3 Complete Invitation Workflow
✓ [chromium] › role-collaboration-workflows.spec.ts:4 Complete Meal Plan Workflow
✓ [chromium] › role-collaboration-workflows.spec.ts:5 Multi-Plan Workflow
✓ [chromium] › role-collaboration-workflows.spec.ts:6 Complete Progress Workflow
✓ [chromium] › role-collaboration-workflows.spec.ts:7 Admin Customer Support
✓ [chromium] › role-collaboration-workflows.spec.ts:8 Complete System Workflow

8 passed (8)
```

### Integration Tests

```bash
# Run existing role interaction integration tests
npm run test -- test/integration/role-interactions-complete.test.ts

# Run all integration tests
npm run test:integration
```

### Un-skipped Test

```bash
# Run the previously skipped multi-role workflow test
npx playwright test test/e2e/workflows/complete-user-journeys.spec.ts -g "Multi-Role Workflow"
```

---

## 📋 Test Execution Checklist

### Pre-Test Checklist
- [ ] Docker is running: `docker ps`
- [ ] Development server is running: `http://localhost:4000`
- [ ] Database is accessible: `docker logs fitnessmealplanner-dev`
- [ ] Test accounts exist and are functional:
  - Admin: `admin@fitmeal.pro` / `AdminPass123`
  - Trainer: `trainer.test@evofitmeals.com` / `TestTrainer123!`
  - Customer: `customer.test@evofitmeals.com` / `TestCustomer123!`

### Test Execution Order
1. **Unit Tests First** (fastest, no dependencies)
   ```bash
   npm run test -- test/unit/services/roleInteractions.test.ts
   ```

2. **Integration Tests Second** (API-level validation)
   ```bash
   npm run test -- test/integration/role-interactions-complete.test.ts
   ```

3. **E2E Tests Last** (full browser workflows)
   ```bash
   npx playwright test test/e2e/role-collaboration-workflows.spec.ts
   ```

### Post-Test Validation
- [ ] All 30 unit tests pass ✅
- [ ] All 8 E2E tests pass ✅
- [ ] No console errors in browser tests
- [ ] All role interactions validated
- [ ] Data isolation confirmed
- [ ] Permission boundaries enforced

---

## 🔍 Test Coverage Analysis

### Coverage Breakdown

| Test Type | File | Tests | Focus |
|-----------|------|-------|-------|
| **Unit Tests** | `roleInteractions.test.ts` | 30 | Business logic validation |
| **E2E Tests** | `role-collaboration-workflows.spec.ts` | 8 | Complete GUI workflows |
| **Un-skipped Test** | `complete-user-journeys.spec.ts` | 1 | Multi-role workflow |
| **Existing Integration** | `role-interactions-complete.test.ts` | 100 | API-level interactions |
| **TOTAL** | Multiple files | **139** | **Complete coverage** |

### Role Interaction Matrix

| Interaction | Unit Tests | Integration Tests | E2E Tests | Total Coverage |
|-------------|------------|-------------------|-----------|----------------|
| Admin → Trainer | 11 | 25 | 2 | ✅ 38 tests |
| Trainer → Customer | 13 | 35 | 4 | ✅ 52 tests |
| Admin → Customer | 2 | 20 | 1 | ✅ 23 tests |
| Multi-Role Workflows | 4 | 20 | 2 | ✅ 26 tests |
| **TOTAL** | **30** | **100** | **9** | **139 tests** |

---

## 🎯 Success Criteria

### ✅ PASS Criteria
- All 30 unit tests pass (100%)
- All 8 E2E tests pass across all browsers (100%)
- All 100 integration tests pass (100%)
- No data leakage between roles
- No permission escalation vulnerabilities
- All workflows complete in < 10 seconds
- No console errors during E2E tests

### ⚠️ CONCERNS Criteria
- < 5% test failures (temporary issues, can be fixed)
- Minor UI inconsistencies (non-blocking)
- Slow performance (> 10 seconds but < 30 seconds)

### ❌ FAIL Criteria
- Any security vulnerability detected
- Data leakage between roles
- Permission escalation possible
- Critical business workflow broken
- > 10% test failures

---

## 🐛 Troubleshooting

### Common Issues

#### Issue 1: Tests Fail to Start
**Symptom**: Tests don't run, immediate errors

**Solution**:
```bash
# Check Docker
docker ps

# Restart development server
docker-compose --profile dev restart

# Verify database
docker logs fitnessmealplanner-dev --tail 50
```

#### Issue 2: Login Failures in E2E Tests
**Symptom**: Cannot login as test users

**Solution**:
```bash
# Reset test account credentials
npm run reset:test-accounts

# Verify accounts work manually
# Login at http://localhost:4000/login with test credentials
```

#### Issue 3: Playwright Browser Issues
**Symptom**: Browser tests fail to start

**Solution**:
```bash
# Install Playwright browsers
npx playwright install

# Install dependencies
npx playwright install-deps
```

#### Issue 4: Port Conflicts
**Symptom**: "Port already in use" errors

**Solution**:
```bash
# Kill process on port 4000
npm run cleanup-port

# Restart Docker containers
docker-compose --profile dev down
docker-compose --profile dev up -d
```

---

## 📊 Test Execution Results Template

Use this template to document test execution results:

```markdown
# Role Interaction Testing Execution Report
**Date**: [Date]
**Executed By**: [Name]
**Environment**: [Development/Staging/Production]

## Unit Tests
- **Total**: 30
- **Passed**: [#]
- **Failed**: [#]
- **Skipped**: [#]
- **Duration**: [time]

## E2E Tests
- **Total**: 8
- **Passed**: [#]
- **Failed**: [#]
- **Skipped**: [#]
- **Duration**: [time]
- **Browsers**: Chromium, Firefox, WebKit

## Integration Tests
- **Total**: 100
- **Passed**: [#]
- **Failed**: [#]
- **Skipped**: [#]
- **Duration**: [time]

## Overall Status
- **Overall Result**: [PASS/CONCERNS/FAIL]
- **Issues Found**: [List any issues]
- **Next Steps**: [Actions to take]
```

---

## 🚀 Next Steps After Testing

### If All Tests Pass (PASS) ✅
1. Document results in execution report
2. Commit changes to version control
3. Create pull request for review
4. Deploy to staging environment
5. Run tests again in staging
6. Deploy to production

### If Tests Have Concerns (CONCERNS) ⚠️
1. Document all warnings and concerns
2. Create issues for non-critical problems
3. Decide if concerns are acceptable
4. If acceptable: Proceed with deployment
5. If not acceptable: Fix issues and re-test

### If Tests Fail (FAIL) ❌
1. Document all failures
2. Investigate root causes
3. Fix critical issues
4. Re-run failed tests
5. Do NOT deploy until all critical issues resolved

---

## 📚 Related Documentation

- [Role Interaction Testing Protocol](../docs/qa/role-interaction-testing-protocol.md) - Complete protocol document
- [Awesome Testing Protocol](AWESOME_TESTING_PROTOCOL.md) - Individual role testing
- [Test Suite Overview](TEST_SUITE_OVERVIEW.md) - Complete test architecture
- [Role Interaction Validation Report](ROLE_INTERACTION_VALIDATION_REPORT.md) - Validation results

---

## 🎉 Summary

**Created**: Complete role interaction testing suite with BMAD multi-agent workflow

**Deliverables**:
1. ✅ Comprehensive testing protocol document
2. ✅ 30 unit tests for role interaction logic
3. ✅ 8 comprehensive E2E Playwright tests
4. ✅ Un-skipped existing multi-role workflow test
5. ✅ Test execution guide (this document)

**Total Test Coverage**: 139 tests covering all role interactions

**Status**: ✅ **Ready for Execution**

**Next Action**: Run the test suite using commands in this guide!

---

*Created by BMAD QA Agent*
*Ready for Production Validation*
