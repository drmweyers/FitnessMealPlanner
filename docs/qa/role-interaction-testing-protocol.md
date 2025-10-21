# Role Interaction Testing Protocol
**Version**: 1.0
**Created**: January 14, 2025
**Status**: Implementation Required
**BMAD Methodology**: QA Test Architecture

---

## 🎯 Executive Summary

This document defines a comprehensive testing protocol for validating **all interactions between the three user roles** in FitnessMealPlanner: Admin, Trainer, and Customer. While individual role functionality has been validated by the Awesome Testing Protocol, **role collaborations** (the core business value) require dedicated testing.

### Current State Analysis

**Existing Coverage** ✅:
- Individual role authentication and authorization (Awesome Testing Protocol)
- Permission boundaries (RBAC enforcement)
- Individual role features (dashboards, navigation)
- **100 integration tests planned** in `role-interactions-complete.test.ts`

**Critical Gaps** ❌:
- **E2E multi-role workflow testing** (currently skipped in `complete-user-journeys.spec.ts:91`)
- **Real-time role collaboration validation**
- **Data flow verification** across roles
- **Complete business workflows** from start to finish

---

## 🔍 Risk Assessment

### High-Risk Interaction Workflows

| Workflow | Risk Level | Impact | Reason |
|----------|-----------|--------|--------|
| **Trainer → Customer Meal Plan Assignment** | 🔴 **High** | Critical business function | Core revenue-generating workflow |
| **Admin → Recipe Approval → Trainer Usage** | 🟡 **Medium** | Content quality control | Affects all downstream users |
| **Customer → Progress Update → Trainer Review** | 🟡 **Medium** | Customer engagement | Key feedback loop |
| **Trainer → Invitation → Customer Acceptance** | 🔴 **High** | User onboarding | First user experience |
| **Multi-Plan Management** | 🟡 **Medium** | Data integrity | Complex state management |

### Technical Risks

1. **Data Isolation Failures**: Trainer A seeing Trainer B's customers
2. **Permission Escalation**: Customer gaining trainer/admin privileges
3. **State Synchronization**: Real-time updates not reflecting across roles
4. **Cascade Failures**: Recipe deletion breaking existing meal plans
5. **Race Conditions**: Concurrent role actions causing conflicts

---

## 📋 Test Architecture

### Test Pyramid Structure

```
                    ┌─────────────────────────┐
                    │   E2E GUI Tests (8)     │ ← Playwright, full workflows
                    │   Complete Journeys     │
                    └─────────────────────────┘
                            ▲
                            │
                    ┌───────────────────────┐
                    │ Integration Tests(50) │ ← API-level, multi-role
                    │ Role Interactions     │
                    └───────────────────────┘
                            ▲
                            │
                ┌───────────────────────────────┐
                │    Unit Tests (30)            │ ← Service/utility level
                │  Interaction Logic            │
                └───────────────────────────────┘
```

**Total Tests**: 88 tests (30 unit + 50 integration + 8 E2E)

---

## 🧪 Detailed Test Specifications

### 1. Admin ↔ Trainer Interactions

#### 1.1 Recipe Management Workflow
**Test**: Admin creates recipe → Approves → Trainer uses in meal plan

**Unit Tests** (5):
- `admin.canCreateRecipe()` - Verify admin recipe creation logic
- `admin.canApproveRecipe()` - Recipe approval workflow
- `trainer.canAccessApprovedRecipes()` - Trainer recipe access logic
- `recipeVisibility.validateRoleFiltering()` - Recipe visibility rules
- `recipePermissions.validateCRUD()` - CRUD permission validation

**Integration Tests** (8):
- Admin creates recipe via API
- Admin approves recipe via API
- Trainer retrieves approved recipes via API
- Trainer uses recipe in meal plan creation
- Customer sees recipe in assigned meal plan
- Admin deactivates recipe (cascades properly)
- Trainer cannot access unapproved recipes
- Recipe statistics update correctly

**E2E Tests** (1):
```typescript
test('Complete Recipe Workflow: Admin → Trainer → Customer', async ({ browser }) => {
  // Admin: Login → Create Recipe → Approve
  // Trainer: Login → View Recipe → Add to Meal Plan → Assign to Customer
  // Customer: Login → View Meal Plan → See Recipe
});
```

#### 1.2 User Management Workflow
**Test**: Admin manages trainer accounts

**Unit Tests** (3):
- `admin.canCreateTrainerAccount()` - Trainer account creation
- `admin.canModifyTrainerPermissions()` - Permission management
- `admin.canViewTrainerMetrics()` - Analytics access

**Integration Tests** (6):
- Admin creates trainer account via API
- Admin updates trainer permissions
- Admin deactivates trainer (cascades to customers)
- Admin views trainer performance metrics
- Admin sends notification to trainer
- Trainer receives system notifications

**E2E Tests** (1):
```typescript
test('Admin Trainer Management: Create → Configure → Monitor', async ({ browser }) => {
  // Admin: Create Trainer → Set Permissions → View Metrics
  // Verify trainer receives welcome notification
});
```

---

### 2. Trainer ↔ Customer Interactions

#### 2.1 Customer Invitation Workflow
**Test**: Trainer invites → Customer accepts → Relationship established

**Unit Tests** (4):
- `trainer.canInviteCustomer()` - Invitation creation logic
- `customer.canAcceptInvitation()` - Acceptance logic
- `trainerCustomerRelationship.validateLink()` - Relationship validation
- `invitation.validateExpiration()` - Expiration logic

**Integration Tests** (10):
- Trainer creates invitation via API
- Customer receives invitation email
- Customer accepts invitation via API
- Trainer-customer relationship established in DB
- Trainer can see customer in list
- Customer can see trainer info
- Invitation expires after 7 days
- Cannot accept invitation twice
- Trainer can resend invitation
- Customer can decline invitation

**E2E Tests** (1):
```typescript
test('Complete Invitation Workflow: Trainer → Customer → Relationship', async ({ browser }) => {
  // Trainer: Login → Invite Customer (email)
  // Customer: Login → Accept Invitation
  // Trainer: Verify customer appears in list
  // Customer: Verify trainer info visible
});
```

#### 2.2 Meal Plan Assignment Workflow
**Test**: Trainer creates → Assigns → Customer receives → Customer views

**Unit Tests** (5):
- `trainer.canCreateMealPlan()` - Meal plan creation logic
- `trainer.canAssignMealPlan()` - Assignment logic
- `customer.canViewAssignedPlans()` - Customer access logic
- `mealPlan.validateNutrition()` - Nutrition calculation
- `mealPlan.validateMultiPlanSupport()` - Multiple plans per customer

**Integration Tests** (12):
- Trainer creates meal plan via API
- Trainer assigns meal plan to customer via API
- Customer retrieves assigned plans via API
- Customer can view meal plan details
- Trainer can update meal plan (customer sees updates)
- Customer receives notification on assignment
- Customer can provide feedback
- Trainer can view customer feedback
- Trainer can duplicate plan for another customer
- Multiple plans per customer supported
- Meal plan deletion handled properly
- Historical meal plans preserved

**E2E Tests** (2):
```typescript
test('Complete Meal Plan Workflow: Create → Assign → View → Update', async ({ browser }) => {
  // Trainer: Login → Create Meal Plan → Assign to Customer
  // Customer: Login → View Meal Plan → Verify Details
  // Trainer: Update Meal Plan → Customer sees changes
});

test('Multi-Plan Workflow: Multiple meal plans per customer', async ({ browser }) => {
  // Trainer: Create Plan 1 → Assign → Create Plan 2 → Assign
  // Customer: View both plans → Switch between plans
  // Verify data isolation between plans
});
```

#### 2.3 Progress Tracking Workflow
**Test**: Customer updates progress → Trainer reviews → Trainer adjusts plan

**Unit Tests** (4):
- `customer.canUpdateProgress()` - Progress update logic
- `trainer.canViewCustomerProgress()` - Progress access logic
- `progressTracking.validateDataTypes()` - Data validation
- `progressTracking.calculateTrends()` - Trend calculation

**Integration Tests** (8):
- Customer creates progress entry via API
- Trainer retrieves customer progress via API
- Trainer can view progress trends
- Trainer can add progress notes
- Customer can view trainer notes
- Progress photos upload properly
- Measurements saved correctly
- Goals tracked accurately

**E2E Tests** (1):
```typescript
test('Complete Progress Workflow: Customer Update → Trainer Review → Adjust Plan', async ({ browser }) => {
  // Customer: Login → Update Weight → Upload Photo → Set Goal
  // Trainer: Login → View Customer Progress → Review Trends
  // Trainer: Adjust Meal Plan based on progress
  // Customer: Verify adjusted meal plan
});
```

---

### 3. Admin ↔ Customer Interactions

#### 3.1 Customer Support Workflow
**Test**: Admin views customer data for support

**Unit Tests** (2):
- `admin.canViewCustomerDetails()` - Customer data access
- `admin.canViewCustomerHistory()` - Historical data access

**Integration Tests** (4):
- Admin retrieves customer profile via API
- Admin views customer meal plan history
- Admin views customer progress data
- Admin can impersonate customer (read-only)

**E2E Tests** (1):
```typescript
test('Admin Customer Support: View Details → Review History', async ({ browser }) => {
  // Admin: Login → Search Customer → View Profile
  // Admin: View Meal Plans → View Progress
  // Verify read-only access (no modifications)
});
```

---

### 4. Multi-Role Collaborative Workflows

#### 4.1 Complete System Workflow
**Test**: Full lifecycle from admin to customer

**E2E Tests** (1):
```typescript
test('Complete System Workflow: Admin → Trainer → Customer (Full Cycle)', async ({ browser }) => {
  // Admin: Login → Create Recipe → Approve Recipe
  // Trainer: Login → View Recipe → Create Meal Plan → Assign to Customer
  // Customer: Login → View Meal Plan → Update Progress
  // Trainer: Review Progress → Adjust Meal Plan
  // Customer: View Updated Plan
  // Verify data consistency across all roles
});
```

---

## 🚀 Implementation Plan

### Phase 1: Unit Tests (Week 1)
**File**: `test/unit/services/roleInteractions.test.ts`

- [ ] Admin-Trainer interaction logic (11 tests)
- [ ] Trainer-Customer interaction logic (13 tests)
- [ ] Admin-Customer interaction logic (2 tests)
- [ ] Cross-role permission validation (4 tests)

**Total**: 30 unit tests

### Phase 2: Integration Tests (Week 2)
**File**: `test/integration/role-interactions-api.test.ts`

- [ ] Complete `role-interactions-complete.test.ts` implementation
- [ ] Verify all 100 planned tests are implemented
- [ ] Add missing API interaction tests
- [ ] Add data isolation validation tests

**Total**: 50 integration tests (additional to existing 100)

### Phase 3: E2E Tests (Week 3)
**File**: `test/e2e/role-collaboration-workflows.spec.ts`

- [ ] **Un-skip** the existing test in `complete-user-journeys.spec.ts:91`
- [ ] Implement 8 comprehensive E2E workflows
- [ ] Test with multiple concurrent users
- [ ] Test with real-time updates
- [ ] Cross-browser validation (Chromium, Firefox, WebKit)

**Total**: 8 E2E tests

---

## ✅ Success Criteria

### Pass Criteria
- ✅ All 30 unit tests pass
- ✅ All 50 integration tests pass
- ✅ All 8 E2E tests pass across 3 browsers (24 executions)
- ✅ No data leakage between roles
- ✅ No permission escalation vulnerabilities
- ✅ All workflows complete in < 10 seconds
- ✅ 100% test coverage for role interaction logic

### Quality Gates
- **PASS**: All tests pass, no data integrity issues
- **CONCERNS**: < 5% test failures, minor UI issues
- **FAIL**: Any security vulnerability or data leakage
- **WAIVED**: N/A (security-critical area)

---

## 📊 Coverage Matrix

| Interaction Type | Unit | Integration | E2E | Total |
|------------------|------|-------------|-----|-------|
| Admin → Trainer | 8 | 14 | 2 | 24 |
| Trainer → Customer | 13 | 30 | 4 | 47 |
| Admin → Customer | 2 | 4 | 1 | 7 |
| Multi-Role | 7 | 2 | 1 | 10 |
| **TOTAL** | **30** | **50** | **8** | **88** |

---

## 🔧 Technical Requirements

### Test Infrastructure
- **Framework**: Vitest (unit/integration), Playwright (E2E)
- **Database**: Test database with isolated test data
- **Authentication**: Real JWT tokens (not mocked)
- **Concurrency**: Support parallel test execution
- **Cleanup**: Automatic test data cleanup after runs

### Test Data Requirements
- 3 admin accounts
- 5 trainer accounts
- 10 customer accounts
- 50 recipes (approved/pending)
- 20 meal plans (assigned/unassigned)
- Progress data for 5 customers

### Environment Setup
```bash
# Setup test database
npm run db:test:setup

# Seed test data
npm run seed:role-interactions

# Run all role interaction tests
npm run test:role-interactions

# Run specific test suite
npm run test:role-interactions:unit
npm run test:role-interactions:integration
npm run test:role-interactions:e2e
```

---

## 📚 Related Documentation

- [Awesome Testing Protocol](../test/AWESOME_TESTING_PROTOCOL.md) - Individual role testing
- [Role Interaction Validation Report](../test/ROLE_INTERACTION_VALIDATION_REPORT.md) - Validation results
- [BMAD QA Agent Guide](../.bmad-core/agents/qa.md) - BMAD QA methodology
- [Test Suite Overview](../test/TEST_SUITE_OVERVIEW.md) - Complete test architecture

---

## 🎯 Next Steps

1. ✅ **Review this protocol** with stakeholders
2. ⏳ **Implement Phase 1** (Unit Tests) - Week 1
3. ⏳ **Implement Phase 2** (Integration Tests) - Week 2
4. ⏳ **Implement Phase 3** (E2E Tests) - Week 3
5. ⏳ **QA Review** - Quality gate validation
6. ⏳ **Production Deployment** - After 100% pass rate

---

**Created by**: BMAD QA Agent
**Reviewed by**: Pending
**Approved by**: Pending
**Status**: Ready for Implementation
