# Comprehensive Role Interaction Unit Test Generation Prompt

**Context:** You are creating comprehensive unit tests for the FitnessMealPlanner role interaction system. This system implements a three-tier architecture with Admin, Trainer, and Customer roles, each with specific permissions and interactions.

**Current Status:** 30 basic tests exist covering fundamental interactions. You need to generate **200+ comprehensive unit tests** covering all edge cases, complex workflows, and business logic.

---

## System Overview

### Role Hierarchy
```
Admin (superuser)
  ├─ Full system access
  ├─ Content moderation (recipes, users)
  ├─ System-wide analytics
  └─ User management (create, modify, delete)

Trainer (service provider)
  ├─ Customer management (invite, assign, monitor)
  ├─ Meal plan creation and assignment
  ├─ Progress tracking (customer data read-only)
  ├─ Recipe library access (approved recipes)
  └─ Analytics (own customers only)

Customer (end user)
  ├─ View assigned meal plans
  ├─ Track personal progress (measurements, photos, goals)
  ├─ Recipe browsing (approved only)
  ├─ Communication with assigned trainer
  └─ Personal data management
```

### Key Business Rules

1. **Data Isolation**
   - Trainers can ONLY access their own customers' data
   - Customers can ONLY access their own data
   - Admin can access ALL data

2. **Assignment Ownership**
   - Meal plans are owned by the creating trainer
   - Assignments link trainers to customers
   - Orphaned data must be handled gracefully

3. **Content Approval**
   - Admin creates recipes → auto-approved
   - Trainer creates recipes → requires admin approval
   - Only approved recipes visible to customers

4. **Privacy Controls**
   - Progress photos: private by default
   - Measurements: shared with assigned trainer only
   - Meal plans: visible only to assigned customer

---

## Test Generation Guidelines

### Test Structure Template
```typescript
describe('[Category] - [Subcategory]', () => {
  it('[Test ID] - [Action] should [expected result] when [condition]', () => {
    // Arrange: Set up test data
    const mockUser = createMock[Role]();
    const mockData = createMockData();

    // Act: Execute the business logic function
    const result = businessLogicFunction(mockUser, mockData);

    // Assert: Verify expected behavior
    expect(result).toBe(expectedValue);
    expect(() => errorFunction()).toThrow(expectedError);
  });
});
```

### Naming Convention
- Test IDs: `[Category].[Subcategory].[Number]`
- Example: `AUTH.ADMIN.001`, `DATA.TRAINER.045`, `WORKFLOW.CUSTOMER.023`

---

## Comprehensive Test Categories

## CATEGORY 1: Authentication & Authorization (50 tests)

### AUTH.ADMIN - Admin Authorization (15 tests)
**001-005: Recipe Management**
- Admin can approve recipes without restrictions
- Admin can bulk approve multiple recipes
- Admin cannot approve already-approved recipes (idempotency)
- Admin can unapprove recipes (change approval status)
- Admin bulk operations maintain transactional integrity

**006-010: User Management**
- Admin can create accounts for any role (admin, trainer, customer)
- Admin can modify user roles
- Admin can deactivate user accounts
- Admin can reactivate deactivated accounts
- Admin cannot delete accounts with active assignments

**011-015: System Access**
- Admin can access all endpoints without restrictions
- Admin can view all users' data across roles
- Admin can export all system data
- Admin can access BMAD recipe generator
- Admin can view system-wide analytics

### AUTH.TRAINER - Trainer Authorization (15 tests)
**016-020: Meal Plan Operations**
- Trainer can create meal plans
- Trainer can assign meal plans to their customers only
- Trainer cannot assign meal plans to other trainers' customers
- Trainer can view only their own meal plan library
- Trainer can delete only their own meal plans

**021-025: Customer Data Access**
- Trainer can view customers' progress only if assigned
- Trainer cannot access unassigned customers' data
- Trainer can view meal plan history for their customers
- Trainer cannot modify customers' progress data
- Trainer can view customer engagement metrics (own customers)

**026-030: Recipe Operations**
- Trainer can create recipes (pending approval)
- Trainer cannot approve their own recipes
- Trainer can view approved recipes
- Trainer cannot access unapproved recipes
- Trainer cannot delete admin-created recipes

### AUTH.CUSTOMER - Customer Authorization (20 tests)
**031-035: Meal Plan Access**
- Customer can view only assigned meal plans
- Customer cannot view other customers' meal plans
- Customer cannot modify meal plan content
- Customer can delete their own meal plan assignments
- Customer cannot create new meal plans

**036-040: Progress Tracking**
- Customer can create progress measurements
- Customer can upload progress photos
- Customer can set personal goals
- Customer can modify their own progress data
- Customer cannot view other customers' progress

**041-045: Recipe Access**
- Customer can browse approved recipes
- Customer cannot access unapproved recipes
- Customer cannot create recipes
- Customer can favorite recipes
- Customer can view recipe details (approved only)

**046-050: Profile Management**
- Customer can update profile information
- Customer can upload profile picture
- Customer cannot change their assigned trainer
- Customer can view their statistics
- Customer cannot access admin/trainer-only features

---

## CATEGORY 2: Data Isolation & Privacy (40 tests)

### DATA.ISOLATION - Cross-Trainer Boundaries (15 tests)
**051-055: Meal Plan Isolation**
- Trainer A cannot view Trainer B's meal plans
- Trainer A cannot assign Trainer B's meal plans
- Trainer A cannot modify Trainer B's meal plan templates
- Trainer A cannot delete Trainer B's assignments
- Shared customers must be handled with proper isolation

**056-060: Customer Data Isolation**
- Trainer A cannot view Trainer B's customer measurements
- Trainer A cannot access Trainer B's customer goals
- Trainer A cannot view Trainer B's customer progress photos
- Trainer A cannot see Trainer B's customer engagement metrics
- Trainer A cannot export Trainer B's customer data

**061-065: Analytics Isolation**
- Trainer dashboard shows only own customers
- Trainer assignment history filters by trainer ID
- Trainer statistics exclude other trainers' data
- Trainer trends calculate from own data only
- Trainer exports include only authorized data

### DATA.PRIVACY - Customer Privacy Controls (15 tests)
**066-070: Progress Data Privacy**
- Progress photos default to private visibility
- Measurements visible only to customer and assigned trainer
- Goals shared with assigned trainer automatically
- Customer can change photo visibility settings
- Unassigned progress data hidden from all trainers

**071-075: Meal Plan Privacy**
- Meal plans visible only to assigned customer
- Unassigned meal plans not visible to customers
- Deleted meal plans removed from customer view
- Meal plan details (recipes) require assignment
- Grocery lists linked to assigned meal plans only

**076-080: Profile Privacy**
- Customer profile visible to assigned trainer only
- Admin can view all customer profiles
- Profile updates notify assigned trainer
- Email preferences are customer-controlled
- Profile deletion requires admin authorization

### DATA.OWNERSHIP - Resource Ownership (10 tests)
**081-085: Creation Ownership**
- Recipes track creator (admin vs trainer)
- Meal plans track creating trainer
- Assignments track assigning trainer
- Progress entries track customer owner
- Recipe approval history tracks admin approver

**086-090: Modification Rights**
- Only creator can delete meal plans
- Only admin can approve recipes
- Only customer can modify their progress
- Trainer can modify only their meal plan templates
- Admin can modify any resource

---

## CATEGORY 3: Complex Workflows (50 tests)

### WORKFLOW.INVITATION - Customer Invitation System (15 tests)
**091-095: Invitation Creation**
- Trainer can create customer invitation
- Invitation generates unique token
- Invitation has expiration date
- Multiple invitations to same email allowed
- Invitation includes trainer information

**096-100: Invitation Acceptance**
- Customer can accept valid invitation
- Expired invitation throws error
- Already-used invitation throws error
- Accepting invitation creates trainer-customer relationship
- Accepting invitation auto-assigns customer

**101-105: Invitation Management**
- Trainer can view invitation status
- Trainer can resend expired invitations
- Trainer can revoke pending invitations
- Trainer can track invitation acceptance rate
- Admin can view all system invitations

**106-110: Edge Cases**
- Accepting invitation when already assigned to another trainer
- Inviting customer who is already in system
- Invitation to invalid email format
- Token collision handling
- Invitation cleanup after expiration

### WORKFLOW.ASSIGNMENT - Meal Plan Assignment (20 tests)
**111-115: Single Assignment**
- Trainer assigns meal plan to customer
- Assignment creates assignment history record
- Customer receives notification (mock)
- Assignment appears in customer meal plans
- Assignment tracks assignment date

**116-120: Bulk Assignment**
- Trainer assigns meal plan to multiple customers
- Partial failures handled gracefully
- Assignment history records for each customer
- Notifications sent to all customers
- Statistics updated for all assignments

**121-125: Unassignment**
- Trainer can unassign meal plan from customer
- Unassignment removes from customer view
- Unassignment history recorded
- Customer receives unassignment notification
- Progress data linked to meal plan preserved

**126-130: Reassignment**
- Trainer can reassign different meal plan to customer
- Old assignment is replaced, not duplicated
- Assignment history shows reassignment
- Customer sees updated meal plan
- Grocery list updated with new meal plan

**131-135: Assignment Validation**
- Cannot assign to non-existent customer
- Cannot assign deleted meal plan
- Cannot assign to customer of another trainer (without permission)
- Cannot assign expired meal plan
- Assignment validates meal plan data integrity

### WORKFLOW.PROGRESS - Progress Tracking (15 tests)
**136-140: Measurement Entry**
- Customer creates measurement entry
- Measurements include weight and body metrics
- Measurement date defaults to current date
- Measurement can include notes
- Measurement updates statistics

**141-145: Photo Upload**
- Customer uploads progress photo
- Photo stored with privacy settings
- Photo categorized by type (front/side/back)
- Photo includes timestamp
- Photo URL generated and stored

**146-150: Trainer Review**
- Trainer views customer progress timeline
- Trainer sees measurement trends
- Trainer cannot modify customer progress
- Trainer can add notes to customer progress
- Trainer receives notifications for milestones

---

## CATEGORY 4: Advanced Business Logic (40 tests)

### LOGIC.RECIPES - Recipe Management (15 tests)
**151-155: Recipe Creation**
- Admin recipe auto-approved
- Trainer recipe requires approval
- Recipe includes complete nutrition data
- Recipe generation tracks AI cost
- Recipe validation enforces required fields

**156-160: Recipe Approval Workflow**
- Unapproved recipe not visible to customers
- Trainer notified when recipe approved
- Bulk approval maintains order
- Approval failure rolls back all
- Approval history tracked

**161-165: Recipe Search & Filtering**
- Customers see only approved recipes
- Trainers see approved + pending (own)
- Admin sees all recipes
- Search respects role permissions
- Filtering maintains authorization

### LOGIC.MEALPLANS - Meal Plan Logic (15 tests)
**166-170: Manual Meal Plan Creation**
- Trainer parses free-form meal text
- Meal categories auto-detected
- Category images assigned without AI
- Meal plan saved to trainer library
- Zero AI cost for manual plans

**171-175: AI Meal Plan Generation**
- Trainer generates meal plan with AI
- Natural language prompt parsed
- Recipes selected based on preferences
- Nutritional targets met
- Meal variety maintained (no repetition)

**176-180: Meal Plan Templates**
- Trainer marks meal plan as template
- Templates reusable for multiple customers
- Template modifications don't affect assignments
- Templates can be duplicated
- Templates filterable by tags

### LOGIC.ANALYTICS - Role-Specific Analytics (10 tests)
**181-185: Trainer Analytics**
- Dashboard shows trainer-specific stats
- Customer engagement metrics calculated
- Assignment trends show trainer activity
- Export includes only trainer data
- Statistics update in real-time

**186-190: Admin Analytics**
- System-wide statistics accessible
- User counts by role
- Recipe approval queue size
- API usage tracking
- Cost monitoring

---

## CATEGORY 5: Edge Cases & Error Handling (20 tests)

### EDGE.ORPHANED - Orphaned Data Handling (10 tests)
**191-195: Trainer Deletion**
- Orphaned meal plans handled gracefully
- Customer assignments preserved
- Assignment history maintained
- Recipes remain if approved
- Admin can reassign orphaned customers

**196-200: Customer Deletion**
- Customer progress data deleted
- Meal plan assignments removed
- Assignment history preserved (anonymized)
- Trainer statistics updated
- Orphaned invitations invalidated

### EDGE.CONCURRENT - Concurrent Operations (10 tests)
**201-205: Simultaneous Assignments**
- Multiple trainers assigning to same customer
- Bulk operations don't conflict
- Assignment history maintains order
- Last-write-wins for conflicting updates
- Transactional integrity maintained

**206-210: Race Conditions**
- Recipe approval during assignment
- Customer deletion during assignment
- Meal plan deletion during view
- Invitation acceptance during expiration
- Simultaneous progress updates

---

## Implementation Instructions

### Step 1: Test File Structure
```typescript
/**
 * Comprehensive Role Interaction Logic Unit Tests - Phase 2
 *
 * This file contains 200+ unit tests covering all role interactions,
 * edge cases, and complex business logic for the FitnessMealPlanner system.
 *
 * Coverage:
 * - Authentication & Authorization (50 tests)
 * - Data Isolation & Privacy (40 tests)
 * - Complex Workflows (50 tests)
 * - Advanced Business Logic (40 tests)
 * - Edge Cases & Error Handling (20 tests)
 *
 * Total: 200+ unit tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { User, Recipe, PersonalizedMealPlan, TrainerCustomerRelationship } from '@shared/types';

// Mock factories (expand from existing)
const createMockAdmin = (): User => ({ /* ... */ });
const createMockTrainer = (id: number = 2): User => ({ /* ... */ });
const createMockCustomer = (id: number = 3): User => ({ /* ... */ });
const createMockRecipe = (createdBy: number, approved: boolean = false): Recipe => ({ /* ... */ });
const createMockMealPlan = (trainerId: number, customerId: number | null = null): PersonalizedMealPlan => ({ /* ... */ });
const createMockInvitation = (trainerId: number, customerEmail: string) => ({ /* ... */ });
const createMockAssignment = (trainerId: number, customerId: number, mealPlanId: string) => ({ /* ... */ });
const createMockProgressEntry = (customerId: number, type: string) => ({ /* ... */ });

describe('Comprehensive Role Interaction Logic - Phase 2', () => {

  // CATEGORY 1: Authentication & Authorization (50 tests)
  describe('AUTH.ADMIN - Admin Authorization', () => {
    describe('Recipe Management', () => {
      it('AUTH.ADMIN.001 - Admin can approve recipes without restrictions', () => {
        // Test implementation
      });

      it('AUTH.ADMIN.002 - Admin can bulk approve multiple recipes', () => {
        // Test implementation
      });

      // ... continue for all 15 AUTH.ADMIN tests
    });
  });

  describe('AUTH.TRAINER - Trainer Authorization', () => {
    describe('Meal Plan Operations', () => {
      it('AUTH.TRAINER.016 - Trainer can create meal plans', () => {
        // Test implementation
      });

      // ... continue for all 15 AUTH.TRAINER tests
    });
  });

  describe('AUTH.CUSTOMER - Customer Authorization', () => {
    describe('Meal Plan Access', () => {
      it('AUTH.CUSTOMER.031 - Customer can view only assigned meal plans', () => {
        // Test implementation
      });

      // ... continue for all 20 AUTH.CUSTOMER tests
    });
  });

  // CATEGORY 2: Data Isolation & Privacy (40 tests)
  describe('DATA.ISOLATION - Cross-Trainer Boundaries', () => {
    describe('Meal Plan Isolation', () => {
      it('DATA.ISOLATION.051 - Trainer A cannot view Trainer B\'s meal plans', () => {
        // Test implementation
      });

      // ... continue for all 15 DATA.ISOLATION tests
    });
  });

  describe('DATA.PRIVACY - Customer Privacy Controls', () => {
    describe('Progress Data Privacy', () => {
      it('DATA.PRIVACY.066 - Progress photos default to private visibility', () => {
        // Test implementation
      });

      // ... continue for all 15 DATA.PRIVACY tests
    });
  });

  describe('DATA.OWNERSHIP - Resource Ownership', () => {
    it('DATA.OWNERSHIP.081 - Recipes track creator (admin vs trainer)', () => {
      // Test implementation
    });

    // ... continue for all 10 DATA.OWNERSHIP tests
  });

  // CATEGORY 3: Complex Workflows (50 tests)
  describe('WORKFLOW.INVITATION - Customer Invitation System', () => {
    describe('Invitation Creation', () => {
      it('WORKFLOW.INVITATION.091 - Trainer can create customer invitation', () => {
        // Test implementation
      });

      // ... continue for all 15 WORKFLOW.INVITATION tests
    });
  });

  describe('WORKFLOW.ASSIGNMENT - Meal Plan Assignment', () => {
    describe('Single Assignment', () => {
      it('WORKFLOW.ASSIGNMENT.111 - Trainer assigns meal plan to customer', () => {
        // Test implementation
      });

      // ... continue for all 20 WORKFLOW.ASSIGNMENT tests
    });
  });

  describe('WORKFLOW.PROGRESS - Progress Tracking', () => {
    describe('Measurement Entry', () => {
      it('WORKFLOW.PROGRESS.136 - Customer creates measurement entry', () => {
        // Test implementation
      });

      // ... continue for all 15 WORKFLOW.PROGRESS tests
    });
  });

  // CATEGORY 4: Advanced Business Logic (40 tests)
  describe('LOGIC.RECIPES - Recipe Management', () => {
    describe('Recipe Creation', () => {
      it('LOGIC.RECIPES.151 - Admin recipe auto-approved', () => {
        // Test implementation
      });

      // ... continue for all 15 LOGIC.RECIPES tests
    });
  });

  describe('LOGIC.MEALPLANS - Meal Plan Logic', () => {
    describe('Manual Meal Plan Creation', () => {
      it('LOGIC.MEALPLANS.166 - Trainer parses free-form meal text', () => {
        // Test implementation
      });

      // ... continue for all 15 LOGIC.MEALPLANS tests
    });
  });

  describe('LOGIC.ANALYTICS - Role-Specific Analytics', () => {
    it('LOGIC.ANALYTICS.181 - Dashboard shows trainer-specific stats', () => {
      // Test implementation
    });

    // ... continue for all 10 LOGIC.ANALYTICS tests
  });

  // CATEGORY 5: Edge Cases & Error Handling (20 tests)
  describe('EDGE.ORPHANED - Orphaned Data Handling', () => {
    it('EDGE.ORPHANED.191 - Orphaned meal plans handled gracefully', () => {
      // Test implementation
    });

    // ... continue for all 10 EDGE.ORPHANED tests
  });

  describe('EDGE.CONCURRENT - Concurrent Operations', () => {
    it('EDGE.CONCURRENT.201 - Multiple trainers assigning to same customer', () => {
      // Test implementation
    });

    // ... continue for all 10 EDGE.CONCURRENT tests
  });
});
```

### Step 2: Business Logic Functions to Test

Create mock implementations of key business logic functions:

```typescript
// Authorization Functions
const canAccessCustomerData = (viewer: User, customerId: string): boolean => {
  if (viewer.role === 'admin') return true;
  if (viewer.role === 'trainer') {
    // Check if customer is assigned to this trainer
    return hasTrainerCustomerRelationship(viewer.id, customerId);
  }
  return viewer.id === customerId;
};

const canModifyMealPlan = (user: User, mealPlan: MealPlan): boolean => {
  if (user.role === 'admin') return true;
  if (user.role === 'trainer') {
    return mealPlan.createdBy === user.id;
  }
  return false;
};

const canApproveRecipe = (user: User): boolean => {
  return user.role === 'admin';
};

// Data Isolation Functions
const filterMealPlansByRole = (user: User, allPlans: MealPlan[]): MealPlan[] => {
  if (user.role === 'admin') return allPlans;
  if (user.role === 'trainer') {
    return allPlans.filter(plan => plan.createdBy === user.id);
  }
  return allPlans.filter(plan => plan.assignedTo === user.id);
};

const getAuthorizedCustomers = (trainer: User): Customer[] => {
  if (trainer.role !== 'trainer') throw new Error('Only trainers can access customers');
  return getCustomersForTrainer(trainer.id);
};

// Workflow Functions
const createInvitation = (trainer: User, customerEmail: string): Invitation => {
  if (trainer.role !== 'trainer') throw new Error('Only trainers can invite customers');
  return {
    trainerId: trainer.id,
    customerEmail,
    token: generateUniqueToken(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status: 'pending'
  };
};

const assignMealPlan = (trainer: User, mealPlan: MealPlan, customerId: string): Assignment => {
  if (trainer.role !== 'trainer') throw new Error('Only trainers can assign meal plans');
  if (!canAccessCustomerData(trainer, customerId)) {
    throw new Error('Customer not assigned to this trainer');
  }
  return {
    mealPlanId: mealPlan.id,
    customerId,
    trainerId: trainer.id,
    assignedAt: new Date()
  };
};

// Progress Tracking Functions
const createProgressEntry = (customer: User, data: ProgressData): ProgressEntry => {
  if (customer.role !== 'customer') throw new Error('Only customers can create progress entries');
  return {
    customerId: customer.id,
    data,
    createdAt: new Date(),
    visibility: 'private'
  };
};

const viewCustomerProgress = (viewer: User, customerId: string): ProgressEntry[] => {
  if (!canAccessCustomerData(viewer, customerId)) {
    throw new Error('Not authorized to view customer progress');
  }
  return getProgressEntriesForCustomer(customerId);
};
```

### Step 3: Test Data Setup

```typescript
// Test data builders
const setupTrainerCustomerScenario = () => {
  const trainer1 = createMockTrainer(2);
  const trainer2 = createMockTrainer(3);
  const customer1 = createMockCustomer(4);
  const customer2 = createMockCustomer(5);
  const mealPlan1 = createMockMealPlan(trainer1.id, customer1.id);
  const mealPlan2 = createMockMealPlan(trainer2.id, customer2.id);

  return { trainer1, trainer2, customer1, customer2, mealPlan1, mealPlan2 };
};

const setupMultipleAssignmentsScenario = () => {
  const trainer = createMockTrainer();
  const customers = [
    createMockCustomer(10),
    createMockCustomer(11),
    createMockCustomer(12)
  ];
  const mealPlan = createMockMealPlan(trainer.id, null);

  return { trainer, customers, mealPlan };
};

const setupOrphanedDataScenario = () => {
  const deletedTrainer = createMockTrainer(99);
  const orphanedCustomer = createMockCustomer(100);
  const orphanedMealPlan = createMockMealPlan(deletedTrainer.id, orphanedCustomer.id);

  return { deletedTrainer, orphanedCustomer, orphanedMealPlan };
};
```

---

## Quality Requirements

### Code Coverage Target
- **Unit Test Coverage:** 95%+ for role interaction logic
- **Branch Coverage:** 90%+ for all authorization paths
- **Statement Coverage:** 98%+ for business logic functions

### Test Quality Standards
1. **Clarity:** Each test has clear arrange-act-assert structure
2. **Independence:** Tests don't depend on each other
3. **Fast Execution:** All 200+ tests complete in <5 seconds
4. **Descriptive Names:** Test names clearly state what is tested
5. **Error Messages:** Assertions include helpful failure messages

### Documentation Requirements
1. Each test category has descriptive header comment
2. Complex business logic has inline explanations
3. Edge cases documented with rationale
4. Mock data builders have usage examples

---

## Success Criteria

**When complete, the test suite should:**
✅ Cover all 200+ test scenarios listed above
✅ Execute in under 5 seconds total runtime
✅ Have zero test flakes (deterministic results)
✅ Provide clear failure messages for debugging
✅ Be maintainable by junior developers
✅ Serve as documentation for role interaction rules
✅ Catch authorization bugs before production

---

## Example: Complete Test Implementation

```typescript
describe('AUTH.ADMIN - Admin Authorization', () => {
  describe('Recipe Management', () => {
    it('AUTH.ADMIN.001 - Admin can approve recipes without restrictions', () => {
      // Arrange: Create admin user and unapproved recipe
      const admin = createMockAdmin();
      const trainerRecipe = createMockRecipe(2, false); // Trainer-created, unapproved

      // Act: Admin approves the recipe
      const approveRecipe = (user: User, recipe: Recipe): Recipe => {
        if (user.role !== 'admin') {
          throw new Error('Only admins can approve recipes');
        }
        return { ...recipe, isApproved: true };
      };

      const approvedRecipe = approveRecipe(admin, trainerRecipe);

      // Assert: Recipe is approved
      expect(approvedRecipe.isApproved).toBe(true);
      expect(approvedRecipe.id).toBe(trainerRecipe.id);
    });

    it('AUTH.ADMIN.002 - Admin can bulk approve multiple recipes', () => {
      // Arrange: Create admin and multiple unapproved recipes
      const admin = createMockAdmin();
      const recipes = [
        createMockRecipe(2, false),
        createMockRecipe(2, false),
        createMockRecipe(3, false)
      ];

      // Act: Bulk approve all recipes
      const bulkApprove = (user: User, recipeIds: string[]): { succeeded: number, failed: number } => {
        if (user.role !== 'admin') {
          throw new Error('Only admins can bulk approve recipes');
        }
        // Simulate successful bulk operation
        return { succeeded: recipeIds.length, failed: 0 };
      };

      const result = bulkApprove(admin, recipes.map(r => r.id));

      // Assert: All recipes approved
      expect(result.succeeded).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('AUTH.ADMIN.003 - Admin cannot approve already-approved recipes (idempotency)', () => {
      // Arrange: Create admin and already-approved recipe
      const admin = createMockAdmin();
      const approvedRecipe = createMockRecipe(1, true);

      // Act: Attempt to approve already-approved recipe
      const approveRecipe = (user: User, recipe: Recipe): Recipe => {
        if (user.role !== 'admin') {
          throw new Error('Only admins can approve recipes');
        }
        if (recipe.isApproved) {
          // Idempotent operation - no change needed
          return recipe;
        }
        return { ...recipe, isApproved: true };
      };

      const result = approveRecipe(admin, approvedRecipe);

      // Assert: Recipe remains approved, no error thrown
      expect(result.isApproved).toBe(true);
      expect(result).toEqual(approvedRecipe);
    });

    // ... continue with remaining tests
  });
});
```

---

## Execution Plan

### Phase 1: Foundation (Tests 001-050)
- Implement all Authentication & Authorization tests
- Verify role-based access control
- Test permission boundaries

### Phase 2: Data Isolation (Tests 051-090)
- Implement all Data Isolation & Privacy tests
- Verify cross-trainer boundaries
- Test privacy controls

### Phase 3: Workflows (Tests 091-140)
- Implement all Complex Workflow tests
- Verify invitation system
- Test assignment workflows

### Phase 4: Business Logic (Tests 141-180)
- Implement all Advanced Business Logic tests
- Verify recipe management
- Test analytics functions

### Phase 5: Edge Cases (Tests 181-210)
- Implement all Edge Case tests
- Verify orphaned data handling
- Test concurrent operations

### Phase 6: Integration & Validation
- Run all 200+ tests
- Verify code coverage metrics
- Review and refine tests

---

**Final Deliverable:** A comprehensive test suite with 200+ unit tests covering all role interactions, authorization logic, data isolation rules, complex workflows, and edge cases for the FitnessMealPlanner system.
