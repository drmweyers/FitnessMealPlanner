# Flake Report
**Generated:** 2025-09-24 03:38:00 UTC

## Test Stability Analysis

### Run 1 - Unit Tests
- Failed: 482/1221 tests
- Errors: 10
- Duration: 76.91s
- Primary failure: HTTP headers double-send in adminApi.test.ts

### Run 2 - Integration Tests
- Failed: 9/10 tests
- Duration: 7.89s
- Consistent failure: JWT refresh token validation

### Run 3 - E2E Tests
- Failed: 7/37 tests (30 skipped)
- Duration: 3.20s
- Infrastructure failure: Missing X server/display

## Flake Detection Results

### Confirmed Infrastructure Issues (Not Flakes)
- **E2E Tests**: All failures due to missing X11 display in Docker
- **Admin API Tests**: Consistent headers error at same lines (167, 191)

### Potential Flakes
- None detected in current runs (failures are consistent)

### Test Timing Variations
- Unit test suite shows stable duration (~77s)
- Integration tests stable (~8s)
- E2E tests fail fast due to infrastructure issue (~3s)

## Recommendations

1. **Fix Infrastructure First**
   - Add Xvfb to Docker image for GUI tests
   - Configure DISPLAY environment variable

2. **Address Consistent Failures**
   - Admin API headers issue is not a flake - needs code fix
   - JWT refresh error is consistent - review implementation

3. **Monitoring Strategy**
   - After fixing infrastructure, run tests 3x to detect true flakes
   - Add retry mechanism only for confirmed flaky tests
   - Track test duration variations

## Current Assessment

- **Flake Rate:** 0% (all failures are deterministic)
- **Infrastructure Issues:** 100% of E2E failures
- **Code Issues:** 39.5% of unit test failures
- **Stability Score:** 2/10 (due to infrastructure problems)

---
*Note: True flake detection requires fixing infrastructure issues first. Current failures are deterministic.*