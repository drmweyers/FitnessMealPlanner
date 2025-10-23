# Unit Test to E2E Test Comparison Matrix
**Date:** October 21, 2025
**Purpose:** 1-to-1 mapping between unit tests and Playwright E2E tests
**Status:** Comprehensive mapping complete

---

## Overview

This matrix provides a 1-to-1 comparison between:
- **Unit Tests** (test business logic in isolation)
- **E2E Tests** (test complete user workflows in browser)

**Coverage Summary:**
- ✅ **Fully Covered**: Feature has both unit tests AND E2E tests
- ⚠️ **Partial Coverage**: Feature has either unit OR E2E tests (not both)
- ❌ **No Coverage**: Feature has neither unit nor E2E tests

---

## Section 1: Role-Based Authorization

### Feature: Customer Access Control

| Functionality | Unit Test | E2E Test | Status |
|---------------|-----------|----------|--------|
| Customer cannot access trainer endpoints | ✅ `authorizationEnforcement.test.ts:29` | ✅ `role-collaboration-workflows.spec.ts:*` | ✅ Fully Covered |
| Customer cannot access admin endpoints | ✅ `authorizationEnforcement.test.ts:34` | ✅ `awesome-testing-protocol.spec.ts:*` | ✅ Fully Covered |
| Customer can access own meal plans | ✅ `authorizationEnforcement.test.ts:49` | ✅ `role-collaboration-workflows.spec.ts:279` | ✅ Fully Covered |
| Customer can access own progress data | ✅ `authorizationEnforcement.test.ts:54` | ✅ `role-collaboration-workflows.spec.ts:388` | ✅ Fully Covered |
| Customer cannot view other customer's data | ✅ `authorizationEnforcement.test.ts:170` | ❌ Missing E2E test | ⚠️ Partial Coverage |

**Recommendation:** Add E2E test for customer data isolation

---

### Feature: Trainer Access Control

| Functionality | Unit Test | E2E Test | Status |
|---------------|-----------|----------|--------|
| Trainer cannot access admin endpoints | ✅ `authorizationEnforcement.test.ts:65` | ✅ `awesome-testing-protocol.spec.ts:*` | ✅ Fully Covered |
| Trainer can access assigned customers | ✅ `authorizationEnforcement.test.ts:85` | ✅ `role-collaboration-workflows.spec.ts:214` | ✅ Fully Covered |
| Trainer cannot access unassigned customers | ✅ `authorizationEnforcement.test.ts:91` | ❌ Missing E2E test | ⚠️ Partial Coverage |
| Trainer can create meal plans | ❌ Missing unit test | ✅ `role-collaboration-workflows.spec.ts:279` | ⚠️ Partial Coverage |
| Trainer can assign meal plans | ❌ Missing unit test | ✅ `role-collaboration-workflows.spec.ts:279` | ⚠️ Partial Coverage |

**Recommendation:** Add unit tests for trainer meal plan operations

---

### Feature: Admin Access Control

| Functionality | Unit Test | E2E Test | Status |
|---------------|-----------|----------|--------|
| Admin can access all endpoints | ✅ `authorizationEnforcement.test.ts:103` | ✅ `awesome-testing-protocol.spec.ts:*` | ✅ Fully Covered |
| Admin can view all customer data | ✅ `authorizationEnforcement.test.ts:112` | ✅ `role-collaboration-workflows.spec.ts:456` | ✅ Fully Covered |
| Admin can manage trainers | ✅ `authorizationEnforcement.test.ts:121` | ✅ `role-collaboration-workflows.spec.ts:161` | ✅ Fully Covered |
| Admin can generate recipes | ❌ Missing unit test | ✅ `admin-*.spec.ts` (multiple files) | ⚠️ Partial Coverage |
| Admin can approve recipes | ❌ Missing unit test | ✅ `role-collaboration-workflows.spec.ts:73` | ⚠️ Partial Coverage |

**Recommendation:** Add unit tests for admin recipe management logic

---

## Section 2: Data Integrity & Cascading Deletes

### Feature: User Deletion Cascades

| Functionality | Unit Test | E2E Test | Status |
|---------------|-----------|----------|--------|
| Delete all meal plans | ✅ `cascadeDeletes.test.ts:109` | ❌ Missing E2E test | ⚠️ Partial Coverage |
| Delete all grocery lists | ✅ `cascadeDeletes.test.ts:126` | ❌ Missing E2E test | ⚠️ Partial Coverage |
| Delete all measurements | ✅ `cascadeDeletes.test.ts:143` | ❌ Missing E2E test | ⚠️ Partial Coverage |
| Delete all progress photos | ✅ `cascadeDeletes.test.ts:160` | ❌ Missing E2E test | ⚠️ Partial Coverage |
| Delete all assignments | ✅ `cascadeDeletes.test.ts:176` | ❌ Missing E2E test | ⚠️ Partial Coverage |
| Comprehensive cascade validation | ✅ `cascadeDeletes.test.ts:186` | ❌ Missing E2E test | ⚠️ Partial Coverage |

**Recommendation:** **P0 CRITICAL** - Add E2E tests for user deletion cascades

---

### Feature: Meal Plan Deletion Cascades

| Functionality | Unit Test | E2E Test | Status |
|---------------|-----------|----------|--------|
| Delete linked grocery lists | ✅ `cascadeDeletes.test.ts:210` | ❌ Missing E2E test | ⚠️ Partial Coverage |
| Delete meal plan assignments | ✅ `cascadeDeletes.test.ts:228` | ❌ Missing E2E test | ⚠️ Partial Coverage |
| Preserve standalone grocery lists | ✅ `cascadeDeletes.test.ts:261` | ❌ Missing E2E test | ⚠️ Partial Coverage |
| Customer can delete meal plan | ❌ Missing unit test | ✅ `customer-meal-plan-delete.spec.ts` | ⚠️ Partial Coverage |

**Recommendation:** **P0 CRITICAL** - Add E2E tests for meal plan cascades + unit test for customer delete

---

### Feature: Trainer Deletion Cascades

| Functionality | Unit Test | E2E Test | Status |
|---------------|-----------|----------|--------|
| Delete customer relationships | ✅ `cascadeDeletes.test.ts:282` | ❌ Missing E2E test | ⚠️ Partial Coverage |
| Delete trainer assignments | ✅ `cascadeDeletes.test.ts:299` | ❌ Missing E2E test | ⚠️ Partial Coverage |
| Delete trainer account | ✅ `cascadeDeletes.test.ts:318` | ❌ Missing E2E test | ⚠️ Partial Coverage |

**Recommendation:** **P1 HIGH** - Add E2E tests for trainer deletion

---

## Section 3: Role Collaboration Workflows

### Feature: Complete Recipe Workflow

| Functionality | Unit Test | E2E Test | Status |
|---------------|-----------|----------|--------|
| Admin creates recipe | ✅ `roleInteractions.test.ts:*` | ✅ `role-collaboration-workflows.spec.ts:73` | ✅ Fully Covered |
| Trainer views recipes | ✅ `roleInteractions.test.ts:*` | ✅ `role-collaboration-workflows.spec.ts:73` | ✅ Fully Covered |
| Customer views recipes in meal plans | ✅ `roleInteractions.test.ts:*` | ✅ `role-collaboration-workflows.spec.ts:73` | ✅ Fully Covered |

**Status:** ✅ Complete coverage

---

### Feature: Trainer-Customer Invitation

| Functionality | Unit Test | E2E Test | Status |
|---------------|-----------|----------|--------|
| Trainer sends invitation | ✅ `roleInteractions.test.ts:*` | ✅ `role-collaboration-workflows.spec.ts:214` | ✅ Fully Covered |
| Customer accepts invitation | ✅ `roleInteractions.test.ts:*` | ✅ `customer-invitation-workflow.spec.ts` | ✅ Fully Covered |
| Relationship established | ✅ `roleInteractions.test.ts:*` | ✅ `role-collaboration-workflows.spec.ts:214` | ✅ Fully Covered |

**Status:** ✅ Complete coverage

---

### Feature: Meal Plan Assignment

| Functionality | Unit Test | E2E Test | Status |
|---------------|-----------|----------|--------|
| Trainer creates meal plan | ✅ `roleInteractions.test.ts:*` | ✅ `role-collaboration-workflows.spec.ts:279` | ✅ Fully Covered |
| Trainer assigns to customer | ✅ `roleInteractions.test.ts:*` | ✅ `role-collaboration-workflows.spec.ts:279` | ✅ Fully Covered |
| Customer views meal plan | ✅ `roleInteractions.test.ts:*` | ✅ `role-collaboration-workflows.spec.ts:279` | ✅ Fully Covered |
| Multiple meal plans per customer | ✅ `roleInteractions.test.ts:*` | ✅ `role-collaboration-workflows.spec.ts:347` | ✅ Fully Covered |

**Status:** ✅ Complete coverage

---

### Feature: Progress Tracking

| Functionality | Unit Test | E2E Test | Status |
|---------------|-----------|----------|--------|
| Customer updates measurements | ✅ `progressTracking.test.ts` | ✅ `role-collaboration-workflows.spec.ts:388` | ✅ Fully Covered |
| Customer uploads photos | ✅ `progressTracking.test.ts` | ✅ `debug-progress-tab.test.ts` | ✅ Fully Covered |
| Trainer reviews progress | ✅ `roleInteractions.test.ts:*` | ✅ `role-collaboration-workflows.spec.ts:388` | ✅ Fully Covered |
| Progress charts render | ❌ Missing unit test | ✅ `body-measurement-charts.spec.ts` | ⚠️ Partial Coverage |

**Recommendation:** Add unit tests for chart data calculation

---

## Section 4: BMAD Recipe Generation

### Feature: BMAD Multi-Agent Generation

| Functionality | Unit Test | E2E Test | Status |
|---------------|-----------|----------|--------|
| RecipeConceptAgent | ✅ `RecipeConceptAgent.test.ts` (279 lines) | ❌ Missing E2E test | ⚠️ Partial Coverage |
| ProgressMonitorAgent | ✅ `ProgressMonitorAgent.test.ts` (349 lines) | ❌ Missing E2E test | ⚠️ Partial Coverage |
| NutritionalValidatorAgent | ✅ `NutritionalValidatorAgent.test.ts` (428 lines) | ❌ Missing E2E test | ⚠️ Partial Coverage |
| DatabaseOrchestratorAgent | ✅ `DatabaseOrchestratorAgent.test.ts` (465 lines) | ❌ Missing E2E test | ⚠️ Partial Coverage |
| ImageGenerationAgent | ✅ `ImageGenerationAgent.test.ts` (471 lines) | ❌ Missing E2E test | ⚠️ Partial Coverage |
| ImageStorageAgent | ✅ `ImageStorageAgent.test.ts` (437 lines) | ❌ Missing E2E test | ⚠️ Partial Coverage |
| BMADCoordinator | ✅ `BMADCoordinator.test.ts` (403 lines) | ❌ Missing E2E test | ⚠️ Partial Coverage |
| SSE Progress Tracking | ❌ Missing unit test | ❌ Missing E2E test | ❌ No Coverage |
| Complete 8-agent workflow | ❌ Missing integration test | ❌ Missing E2E test | ❌ No Coverage |

**Recommendation:** **P0 CRITICAL** - Add E2E tests for complete BMAD workflow with SSE

---

## Section 5: Meal Plan Generation

### Feature: Intelligent Meal Plan Generation

| Functionality | Unit Test | E2E Test | Status |
|---------------|-----------|----------|--------|
| Basic generation | ✅ `mealPlanGeneration.test.ts` | ✅ `meal-plan-generator-*.spec.ts` | ✅ Fully Covered |
| AI optimization | ✅ `intelligentMealPlanGenerator.test.ts` | ❌ Missing E2E test | ⚠️ Partial Coverage |
| Natural language parsing | ❌ Missing unit test | ✅ `manual-meal-plan.spec.ts` | ⚠️ Partial Coverage |
| Progressive generation | ❌ Missing unit test | ❌ Missing E2E test | ❌ No Coverage |
| Meal plan variations | ❌ Missing unit test | ❌ Missing E2E test | ❌ No Coverage |
| Nutrition optimization | ❌ Missing unit test | ❌ Missing E2E test | ❌ No Coverage |

**Recommendation:** **P1 HIGH** - Add missing unit and E2E tests for advanced meal plan features

---

### Feature: Manual Meal Plan Creation

| Functionality | Unit Test | E2E Test | Status |
|---------------|-----------|----------|--------|
| Manual meal parsing | ✅ `manualMealPlanParser.test.ts` | ✅ `manual-meal-plan.spec.ts` | ✅ Fully Covered |
| Manual meal plan service | ✅ `manualMealPlanService.test.ts` | ✅ `manual-meal-plan.spec.ts` | ✅ Fully Covered |
| 4 meal plan variations | ✅ `manualMealPlan4Variations.test.ts` | ❌ Missing E2E test | ⚠️ Partial Coverage |

**Recommendation:** Add E2E test for 4-variation workflow

---

## Section 6: Grocery List Management

### Feature: Grocery List Auto-Generation

| Functionality | Unit Test | E2E Test | Status |
|---------------|-----------|----------|--------|
| Basic generation | ✅ `groceryGeneration.test.ts` | ✅ `grocery-*.spec.ts` (8 files) | ✅ Fully Covered |
| Ingredient aggregation | ✅ `ingredientAggregation.test.ts` | ✅ `grocery-*.spec.ts` | ✅ Fully Covered |
| Unit conversion | ✅ `unitConverter.test.ts` | ❌ Missing E2E test | ⚠️ Partial Coverage |
| Enhanced generation | ❌ Missing unit test | ✅ `grocery-*.spec.ts` | ⚠️ Partial Coverage |
| Race condition handling | ✅ `groceryListRaceCondition.test.ts` | ❌ Missing E2E test | ⚠️ Partial Coverage |

**Recommendation:** Add E2E test for unit conversion accuracy, Add unit test for enhanced generation

---

### Feature: Grocery List CRUD

| Functionality | Unit Test | E2E Test | Status |
|---------------|-----------|----------|--------|
| Create list | ✅ `groceryListComprehensive.test.ts` | ✅ `grocery-*.spec.ts` | ✅ Fully Covered |
| Update list | ✅ `groceryListComprehensive.test.ts` | ✅ `grocery-*.spec.ts` | ✅ Fully Covered |
| Delete list | ✅ `groceryListComprehensive.test.ts` | ✅ `grocery-*.spec.ts` | ✅ Fully Covered |
| Add/remove items | ✅ `groceryListComprehensive.test.ts` | ✅ `grocery-*.spec.ts` | ✅ Fully Covered |

**Status:** ✅ Complete coverage

---

## Section 7: S3 File Upload & Storage

### Feature: Progress Photo Upload

| Functionality | Unit Test | E2E Test | Status |
|---------------|-----------|----------|--------|
| Upload flow | ✅ `s3Upload.test.ts` | ❌ Missing E2E test | ⚠️ Partial Coverage |
| S3 integration | ✅ `recipe-generation-s3.test.ts` (13 tests) | ❌ Missing E2E test | ⚠️ Partial Coverage |
| Image validation | ✅ `profileImageValidation.test.ts` | ❌ Missing E2E test | ⚠️ Partial Coverage |
| Photo orientation | ✅ `progressPhotoOrientation.test.ts` | ❌ Missing E2E test | ⚠️ Partial Coverage |
| S3 cleanup on delete | ❌ Missing unit test | ❌ Missing E2E test | ❌ No Coverage |
| S3 orphan detection | ❌ Missing unit test | ❌ Missing E2E test | ❌ No Coverage |

**Recommendation:** **P0 CRITICAL** - Add E2E tests for complete S3 upload flow + unit tests for cleanup

---

## Section 8: Email & PDF Generation

### Feature: Email Delivery

| Functionality | Unit Test | E2E Test | Status |
|---------------|-----------|----------|--------|
| Email service | ✅ `emailService.test.ts` | ❌ Missing E2E test | ⚠️ Partial Coverage |
| Email utilities | ✅ `emailUtils.test.ts` | ❌ Missing E2E test | ⚠️ Partial Coverage |
| Template rendering | ❌ Missing unit test | ❌ Missing E2E test | ❌ No Coverage |
| Preferences enforcement | ❌ Missing unit test | ❌ Missing E2E test | ❌ No Coverage |

**Recommendation:** **P1 HIGH** - Add tests for email templates and preferences

---

### Feature: PDF Generation

| Functionality | Unit Test | E2E Test | Status |
|---------------|-----------|----------|--------|
| PDF export core | ✅ `pdfExportCore.test.ts` | ✅ `export-json-*.spec.ts` | ✅ Fully Covered |
| Meal prep PDF | ✅ `mealPrepPdfExport.test.ts` | ❌ Missing E2E test | ⚠️ Partial Coverage |
| PDF with images | ❌ Missing unit test | ❌ Missing E2E test | ❌ No Coverage |
| PDF concurrency | ❌ Missing unit test | ❌ Missing E2E test | ❌ No Coverage |

**Recommendation:** **P1 HIGH** - Add E2E test for PDF with images

---

## Summary Statistics

### Coverage by Category

| Category | Fully Covered | Partial Coverage | No Coverage | Total |
|----------|---------------|------------------|-------------|-------|
| **Authorization** | 8 | 5 | 0 | 13 |
| **Data Integrity** | 0 | 10 | 0 | 10 |
| **Role Workflows** | 11 | 1 | 0 | 12 |
| **BMAD Generation** | 0 | 7 | 2 | 9 |
| **Meal Plans** | 2 | 4 | 3 | 9 |
| **Grocery Lists** | 5 | 3 | 0 | 8 |
| **S3 Upload** | 0 | 4 | 2 | 6 |
| **Email/PDF** | 1 | 3 | 4 | 8 |
| **TOTAL** | **27** (36%) | **37** (49%) | **11** (15%) | **75** |

### Priority Recommendations

#### P0 - CRITICAL (Immediate Action)
1. ❌ Add E2E tests for user deletion cascades (data integrity)
2. ❌ Add E2E tests for BMAD complete workflow with SSE
3. ❌ Add E2E tests for S3 upload complete flow
4. ❌ Add unit tests for S3 cleanup and orphan detection

#### P1 - HIGH (Next Sprint)
1. ⚠️ Add E2E tests for meal plan deletion cascades
2. ⚠️ Add unit and E2E tests for progressive meal generation
3. ⚠️ Add unit and E2E tests for nutrition optimization
4. ⚠️ Add E2E test for PDF generation with images

#### P2 - MEDIUM (Future Sprint)
1. ⚠️ Add E2E test for customer data isolation
2. ⚠️ Add E2E test for trainer unassigned customer access
3. ⚠️ Add unit tests for chart data calculation
4. ⚠️ Add unit tests for admin recipe management

---

## Conclusion

**Overall Assessment:**
- **Good Foundation:** 36% of features have full test coverage (unit + E2E)
- **Gaps Identified:** 49% have partial coverage, 15% have no coverage
- **Critical Gaps:** Data integrity cascades, BMAD E2E, S3 complete flow

**Next Steps:**
1. Implement P0 critical tests (user cascades, BMAD E2E, S3 flow)
2. Review and implement P1 tests (meal plans, grocery lists)
3. Continuous monitoring of test coverage metrics

---

**Document Status:** ✅ Complete
**Last Updated:** October 21, 2025
**Next Review:** After P0 tests implemented
