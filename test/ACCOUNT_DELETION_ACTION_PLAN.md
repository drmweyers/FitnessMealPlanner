# Account Deletion E2E Tests - Action Plan

**Date Created**: October 25, 2025
**Status**: ❌ REQUIRES COMPLETE REWRITE
**Current Pass Rate**: 1/30 browsers (3.3%) - Firefox only, inconsistent
**Priority**: HIGH - Critical user flow untested

---

## Executive Summary

The account-deletion.spec.ts E2E test suite is experiencing severe timing and flakiness issues across browsers. Initial investigation revealed that the tests make assumptions about implementation that don't match reality. **Manual testing is required before any automated test fixes can proceed.**

---

## Problem Statement

### Current Issues:
1. **Cross-Browser Inconsistency**: Same test passes on Firefox, fails on Chromium, times out on WebKit
2. **Timing Issues**: Tests timeout after 30+ seconds waiting for elements
3. **Flaky Selectors**: Elements not consistently visible or clickable
4. **Test Assumptions**: Tests expect behaviors that may not exist in implementation

### Test Status Breakdown:
- **E2E-1** (Delete workflow): ❌ Dialog not appearing
- **E2E-2** (Re-auth): ❌ Error messages don't match
- **E2E-3** (Cancellation): ⚠️ Firefox only (1/3)
- **E2E-4** (Unauthorized): ⚠️ Unknown status
- **E2E-5** (Cascade): ❌ Schema fixed but test fails
- **E2E-6** (Post-deletion): ❌ Needs verification
- **E2E-7** (Checkbox): ⚠️ Unknown status
- **E2E-8** (Empty password): ⚠️ Unknown status
- **E2E-9** (Navigation): ❌ Additional selectors needed
- **E2E-10** (Loading): ❌ Needs investigation

---

## Phase 1: Manual Testing & Documentation ⏳

**Goal**: Understand actual implementation behavior before writing tests

### Manual Testing Procedure:

#### Test Environment Setup:
```bash
# Start dev server
docker-compose --profile dev up -d

# Access application
http://localhost:4000

# Test credentials
Email: customer.test@evofitmeals.com
Password: TestCustomer123!
```

#### Test Scenarios:

**Scenario 1: Basic Delete Flow**
- [ ] Login as customer
- [ ] Navigate to Profile tab
- [ ] Locate "Danger Zone" section
- [ ] Click "Delete My Account" button
- [ ] **DOCUMENT**: Does dialog appear? What's the exact structure?
- [ ] **DOCUMENT**: What elements are inside the dialog?
- [ ] **DOCUMENT**: Selectors for each interactive element

**Scenario 2: Confirmation Checkbox**
- [ ] Open delete dialog
- [ ] **DOCUMENT**: Is there a confirmation checkbox?
- [ ] **DOCUMENT**: What's the exact text/label?
- [ ] Try submitting without checkbox
- [ ] **DOCUMENT**: What happens? Error message?

**Scenario 3: Password Validation**
- [ ] Try empty password
- [ ] **DOCUMENT**: Error message shown
- [ ] Try wrong password
- [ ] **DOCUMENT**: Error message and behavior
- [ ] Try correct password
- [ ] **DOCUMENT**: Success flow

**Scenario 4: Cascade Deletion**
- [ ] Create test data:
  - Add measurements
  - Add photos
  - Create meal plan assignments
  - Create grocery lists
- [ ] Delete account
- [ ] Check database:
  ```sql
  SELECT * FROM users WHERE email = 'customer.test@evofitmeals.com';
  SELECT * FROM customer_measurements WHERE customer_id = '[deleted-user-id]';
  SELECT * FROM customer_photos WHERE customer_id = '[deleted-user-id]';
  -- etc for all related tables
  ```
- [ ] **DOCUMENT**: What gets deleted? What doesn't?

**Scenario 5: Post-Deletion Behavior**
- [ ] Complete deletion
- [ ] **DOCUMENT**: Where does user get redirected?
- [ ] Try logging in with deleted account
- [ ] **DOCUMENT**: What error message appears?
- [ ] **DOCUMENT**: URL after failed login attempt

#### Documentation Template:

For each scenario, capture:
```markdown
### Scenario: [Name]

**Expected Behavior** (from test):
[What the test expects to happen]

**Actual Behavior** (from manual test):
[What actually happens]

**Selectors Observed**:
- Primary button: `[exact selector]`
- Dialog: `[exact selector]`
- Checkbox: `[exact selector]`
- Error message: `[exact selector]`

**Timing Notes**:
- Dialog appears after: [X]ms
- API response time: [X]ms
- Redirect delay: [X]ms

**Screenshots**:
[Save screenshots of each step]
```

---

## Phase 2: Test Rewrite 📝

**Prerequisites**: Phase 1 complete, actual behavior documented

### Rewrite Strategy:

#### 1. Update Test Configuration
```typescript
// Add to playwright.config.ts
use: {
  actionTimeout: 10000,  // Increase from default 0
  navigationTimeout: 30000,  // Increase from default 30000
  trace: 'retain-on-failure',  // Keep traces for debugging
}
```

#### 2. Robust Wait Strategies
```typescript
// BEFORE (flaky)
await page.click('button:has-text("Delete")');

// AFTER (robust)
const deleteButton = page.locator('[data-testid="delete-account-button"]');
await deleteButton.waitFor({ state: 'visible', timeout: 10000 });
await deleteButton.click();
```

#### 3. Data Attributes for Testability
Add to components:
```tsx
// DeleteAccountSection.tsx
<Button
  data-testid="delete-account-button"
  variant="destructive"
>
  Delete My Account
</Button>

<AlertDialog data-testid="delete-account-dialog">
  {/* ... */}
</AlertDialog>
```

#### 4. Test Isolation
```typescript
// Each test should:
beforeEach(async () => {
  // 1. Create fresh test user
  // 2. Login
  // 3. Navigate to Profile
});

afterEach(async () => {
  // 1. Clean up test data
  // 2. Close browser context
});
```

---

## Phase 3: Cross-Browser Testing ✅

**Goal**: Ensure consistent behavior across all browsers

### Testing Matrix:

| Test | Chromium | Firefox | WebKit | Notes |
|------|----------|---------|--------|-------|
| E2E-1 | ⏳ | ⏳ | ⏳ | |
| E2E-2 | ⏳ | ⏳ | ⏳ | |
| E2E-3 | ⏳ | ⏳ | ⏳ | |
| E2E-4 | ⏳ | ⏳ | ⏳ | |
| E2E-5 | ⏳ | ⏳ | ⏳ | |
| E2E-6 | ⏳ | ⏳ | ⏳ | |
| E2E-7 | ⏳ | ⏳ | ⏳ | |
| E2E-8 | ⏳ | ⏳ | ⏳ | |
| E2E-9 | ⏳ | ⏳ | ⏳ | |
| E2E-10 | ⏳ | ⏳ | ⏳ | |

**Success Criteria**: All browsers passing for all tests

---

## Phase 4: Documentation & Handoff 📚

**Deliverables**:
1. ✅ Updated test suite with 100% pass rate
2. ✅ Manual testing documentation
3. ✅ Test maintenance guide
4. ✅ Known issues log (if any)

---

## BMAD Story Template

For future story creation:

```yaml
Story: Fix Account Deletion E2E Tests
Epic: E2E Test Stability
Priority: HIGH

Acceptance Criteria:
  - All 10 E2E tests passing across 3 browsers (30/30 total)
  - No test timeouts or flakiness
  - Test execution time < 2 minutes total
  - Cross-browser consistency verified

Tasks:
  1. Manual Testing
     - Complete manual testing checklist
     - Document actual behavior
     - Capture screenshots and selectors
     - Time: 2 hours

  2. Component Updates (if needed)
     - Add data-testid attributes
     - Ensure consistent element visibility
     - Time: 1 hour

  3. Test Rewrite
     - Update selectors based on manual testing
     - Add robust wait strategies
     - Fix timing assumptions
     - Time: 4 hours

  4. Cross-Browser Verification
     - Run on Chromium, Firefox, WebKit
     - Fix browser-specific issues
     - Time: 2 hours

  5. Documentation
     - Update test documentation
     - Create maintenance guide
     - Time: 1 hour

Estimated Total: 10 hours

Risk Assessment:
  - HIGH: Tests may reveal implementation bugs
  - MEDIUM: Component changes may affect other features
  - LOW: Test infrastructure is stable

Dependencies:
  - Docker development environment running
  - Test database accessible
  - Customer test account available
```

---

## Success Metrics

**Before Fix**:
- ❌ 1/30 browsers passing (3.3%)
- ❌ Tests timing out frequently
- ❌ Inconsistent cross-browser behavior

**After Fix (Target)**:
- ✅ 30/30 browsers passing (100%)
- ✅ All tests complete in < 2 minutes
- ✅ No flakiness across 10 consecutive runs
- ✅ Comprehensive manual test documentation exists

---

## References

- **Test File**: `test/e2e/account-deletion.spec.ts`
- **Component**: `client/src/components/DeleteAccountSection.tsx`
- **Page**: `client/src/pages/Customer.tsx`
- **Schema**: `shared/schema.ts` (users, customer_measurements, etc.)
- **Fix Documentation**: `test/ACCOUNT_DELETION_TEST_FIXES.md`
- **Session Summary**: `test/TEST_SUITE_FIX_SUMMARY.md`

---

**Document Version**: 1.0
**Next Review**: After Phase 1 manual testing complete
