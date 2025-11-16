# 3-Tier System Comprehensive Test Strategy

**Created by:** QA Agent (BMAD Workflow)
**Date:** November 15, 2025
**Target:** 100% test coverage for Stories 2.12, 2.14, 2.15

---

## Test Scope

### Story 2.14: Recipe Tier Filtering
**Risk Level:** HIGH (core business logic, affects 4,000 recipes)

**Unit Tests Required:**
- EntitlementsService.getRecipeAccess()
- Recipe tier filtering middleware
- Recipe search with tier constraints
- Progressive access validation (Starter → Professional → Enterprise)

**Integration Tests Required:**
- GET /api/recipes with tier filtering
- Recipe count by tier validation
- Tier upgrade recipe access expansion

**E2E Tests Required:**
- Login as Starter → See 1,000 recipes
- Login as Professional → See 2,500 recipes
- Login as Enterprise → See 4,000 recipes
- Recipe detail page tier access validation

---

### Story 2.15: Meal Type Enforcement
**Risk Level:** HIGH (17 meal types with progressive access)

**Unit Tests Required:**
- MealTypeService.getAccessibleMealTypes()
- MealTypeService.getAllMealTypesWithStatus()
- MealTypeService.isMealTypeAccessible()
- Tier hierarchy validation (Starter: 5, Professional: 10, Enterprise: 17)

**Integration Tests Required:**
- GET /api/meal-types (accessible only)
- GET /api/meal-types/all (with lock status)
- GET /api/meal-types/check/:name (access validation)

**E2E Tests Required:**
- MealTypeDropdown shows correct accessible types per tier
- Lock icons display on inaccessible types
- Tooltip shows upgrade requirement
- Meal plan generator respects tier meal type limits

---

### Story 2.12: Branding & Customization
**Risk Level:** MEDIUM (Professional/Enterprise feature)

**Unit Tests Required:**
- BrandingService.getBrandingSettings()
- BrandingService.updateBrandingSettings()
- BrandingService.uploadLogo()
- BrandingService.enableWhiteLabel()
- BrandingService.setCustomDomain()
- Audit log creation for all changes

**Integration Tests Required:**
- GET /api/branding (settings retrieval)
- PUT /api/branding (color updates - Professional+)
- POST /api/branding/logo (logo upload - Professional+)
- POST /api/branding/white-label (Enterprise only)
- Tier access enforcement on branding endpoints

**E2E Tests Required:**
- Starter: Branding settings locked
- Professional: Logo upload + color customization works
- Enterprise: White-label toggle + custom domain works
- Branding changes reflected in UI

---

## Test Coverage Goals

### Unit Tests
- **Target:** 95% code coverage
- **Focus:** All service methods, edge cases, error handling
- **Tools:** Vitest, TypeScript

### Integration Tests
- **Target:** 100% API endpoint coverage
- **Focus:** Request/response validation, tier enforcement, database integration
- **Tools:** Supertest, Vitest

### E2E Tests
- **Target:** 100% user flow coverage
- **Focus:** Complete user journeys for all 3 tiers
- **Tools:** Playwright, 3 browsers (Chromium, Firefox, WebKit)

---

## Test Execution Strategy

### Phase 1: Unit Tests (1-2 hours)
1. Create comprehensive unit tests for:
   - EntitlementsService (recipe access, meal type access, tier limits)
   - MealTypeService (all 8 methods)
   - BrandingService (all 7 methods + audit logging)
   - StripePaymentService (checkout, webhooks, tier assignment)

2. Run unit tests: `npm test`
3. Achieve 95%+ coverage

### Phase 2: Integration Tests (1-2 hours)
1. Create API integration tests for:
   - Recipe tier filtering endpoints
   - Meal type endpoints (5 endpoints)
   - Branding endpoints (7 endpoints)
   - Tier enforcement middleware

2. Run integration tests
3. Achieve 100% endpoint coverage

### Phase 3: E2E Tests (2-3 hours)
1. Create Playwright tests for:
   - Recipe tier filtering user flows
   - Meal type dropdown tier filtering
   - Branding settings UI (all 3 tiers)
   - Tier upgrade flows

2. Run E2E tests: `npx playwright test`
3. Achieve 100% pass rate across all browsers

### Phase 4: Regression Testing (1 hour)
1. Run full test suite
2. Verify no regressions in existing features
3. Document test results

---

## Success Criteria

✅ **Unit Tests:** 95%+ coverage, all passing
✅ **Integration Tests:** 100% endpoint coverage, all passing
✅ **E2E Tests:** 100% user flows passing across 3 browsers
✅ **Total Test Count:** 150+ tests
✅ **Execution Time:** < 5 minutes for unit+integration, < 10 minutes for E2E
✅ **Zero regressions** in existing features

---

## Test Data Requirements

### Test Trainers (Already Created)
- `trainer.starter@test.com` (Password: TestPro123!) - Starter tier
- `trainer.professional@test.com` (Password: TestPro123!) - Professional tier
- `trainer.enterprise@test.com` (Password: TestPro123!) - Enterprise tier

### Database State
- 17 meal types seeded (5 + 5 + 7)
- 4,000 recipes distributed (1,000 + 1,500 + 1,500)
- Active subscriptions for all 3 test trainers

---

## Risk Assessment

### High Risks
1. **Recipe Filtering Bypass:** User could access higher tier recipes
   - Mitigation: Comprehensive middleware testing

2. **Meal Type Access Violation:** User could select inaccessible meal types
   - Mitigation: Frontend + backend validation testing

3. **Branding Access Bypass:** Starter could access Professional/Enterprise features
   - Mitigation: Tier enforcement testing on all branding endpoints

### Medium Risks
1. **Tier Upgrade Recipe Count:** Recipes not expanded after upgrade
   - Mitigation: Integration tests for tier transitions

2. **Audit Logging Gaps:** Branding changes not logged
   - Mitigation: Audit log verification in all branding tests

### Low Risks
1. **UI Lock Icons Missing:** Inaccessible meal types not showing locks
   - Mitigation: E2E visual validation tests

---

## Test Automation

All tests will be automated and integrated into CI/CD:
- **Pre-commit:** Run unit tests (fast feedback)
- **Pre-push:** Run unit + integration tests
- **CI Pipeline:** Run full suite (unit + integration + E2E)

---

## Next Steps

1. **Create Unit Tests** - Comprehensive service layer testing
2. **Create Integration Tests** - API endpoint validation
3. **Create E2E Tests** - User flow validation
4. **Run Tests** - Iterate until 100% pass rate
5. **Document Results** - Test report with coverage metrics

**QA Agent Approval:** Ready to proceed with test implementation ✅
