# Test Debt Register
**Generated:** 2025-09-24 03:37:00 UTC
**Repository:** FitnessMealPlanner

## Current Test Suite Status

### Unit Tests
- **Total Tests:** 1221
- **Passing:** 739 (60.5%)
- **Failing:** 482 (39.5%)
- **Error Count:** 10
- **Duration:** 76.91s

### Integration Tests
- **Total Tests:** 10
- **Passing:** 1 (10%)
- **Failing:** 9 (90%)
- **Duration:** 7.89s

### E2E Tests (GUI)
- **Total Tests:** 37
- **Failing:** 7
- **Skipped:** 30
- **Blocked by:** Missing X server/display (Docker environment issue)

## Critical Issues

### 1. HTTP Headers Double-Send Issue
- **Files Affected:**
  - [ ] test/unit/api/adminApi.test.ts (HIGH RISK)
- **Error:** "Cannot set headers after they are sent to the client"
- **Lines:** 167, 191
- **Impact:** Response handling in admin API tests causing test failures
- **Owner:** Backend Team
- **Suggested Fix:** Add proper response guards and async handling

### 2. JWT Refresh Token Security
- **Files Affected:**
  - [ ] test/integration/auth/jwt-refresh-integration.test.ts (CRITICAL)
- **Error:** Expected 'SESSION_EXPIRED' but got 'INVALID_TOKEN'
- **Line:** 423
- **Impact:** Security token validation not working as expected
- **Owner:** Security Team
- **Suggested Fix:** Review token expiration logic and error codes

### 3. Browser Launch Failures (E2E)
- **Files Affected:**
  - [ ] test/gui/specs/* (MEDIUM)
- **Error:** "Failed to connect to the bus" / "Missing X server or $DISPLAY"
- **Impact:** All GUI tests failing in Docker environment
- **Owner:** DevOps Team
- **Suggested Fix:** Configure headless Chrome properly or install Xvfb

## Coverage Gaps (Estimated)

Based on test failures, these areas likely have coverage gaps:

### Backend APIs
- [ ] Admin endpoints error handling - PARTIAL coverage
- [ ] Authentication refresh flow - PARTIAL coverage
- [ ] Recipe management APIs - Status unknown
- [ ] Meal plan generation - Status unknown
- [ ] Customer invitation flow - Status unknown

### Frontend Components
- [ ] Customer invitation UI - BLOCKED by E2E failures
- [ ] Admin dashboard - BLOCKED by E2E failures
- [ ] Trainer workflows - BLOCKED by E2E failures

## Test Infrastructure Issues

### Docker Environment
- [ ] Missing X11/Display server for GUI tests
- [ ] Puppeteer/Chrome configuration needs adjustment
- [ ] Consider adding Xvfb to Docker image

### Test Isolation
- [ ] Admin API tests have side effects (headers issue)
- [ ] Tests may not be properly isolated
- [ ] Mock/stub usage needs review

## Recommended Actions

1. **Immediate (S)**
   - Fix HTTP headers issue in admin API tests
   - Configure headless Chrome for Docker

2. **Short-term (M)**
   - Fix JWT refresh token validation
   - Add proper test isolation
   - Setup Xvfb in Docker for GUI tests

3. **Long-term (L)**
   - Implement mutation testing
   - Achieve 100% coverage goal
   - Add visual regression testing

## Metrics Summary

- **Overall Test Health:** 45% (based on passing rate)
- **Test Stability:** LOW (multiple infrastructure issues)
- **Coverage:** Unable to determine (coverage report generation failed)
- **Mutation Score:** Not available (Stryker not configured)

## Next Steps

1. Fix Docker environment for E2E tests
2. Resolve admin API test failures
3. Fix JWT refresh integration tests
4. Setup proper coverage reporting
5. Configure mutation testing with Stryker

---
*Note: This report is based on current test execution results. Coverage percentages are estimates based on test failures.*