# Manual Meal Plan Generator - Test Suite Documentation

## Overview

This directory contains comprehensive integration tests for the Manual Meal Plan Generator feature, which allows trainers to create custom meal plans without AI using structured text input.

## Test Files

### Primary Test Suite
- **`manualMealPlanGenerator.comprehensive.test.ts`** - Main comprehensive test suite
  - 16 tests covering all aspects of manual meal plan creation
  - Includes all workflow steps and input format variations
  - **Use this file for regular testing**

### Legacy Test Files (Archived)
- `manualMealPlanFlow.test.ts` - Original 12 workflow tests (now part of comprehensive suite)
- `manualMealPlan4Variations.test.ts` - Original 4 variation tests (now part of comprehensive suite)

**Note:** The two legacy files have been consolidated into the comprehensive suite but are kept for reference.

---

## Test Coverage

### Total Tests: 16
- ✅ Parse API endpoint tests: 4
- ✅ Save meal plan tests: 3
- ✅ Retrieve meal plans tests: 4
- ✅ Complete workflow test: 1
- ✅ Input format variations: 4

### What's Tested

#### 1. **Parse Manual Meals API** (4 tests)
- Simple format parsing (`Breakfast: Oatmeal`)
- Structured format with ingredients (`Meal 1\n-175g rice`)
- Error handling (empty text)
- Authentication requirements

#### 2. **Save Manual Meal Plan** (3 tests)
- Save with ingredients preserved
- Validation (requires plan name)
- Validation (requires meals)

#### 3. **Retrieve Saved Meal Plans** (4 tests)
- Retrieve all trainer plans
- Include assignment count
- Empty array for new trainer
- Authentication requirements

#### 4. **Complete Workflow** (1 test)
- Full end-to-end: Parse → Save → Retrieve

#### 5. **Input Format Variations** (4 tests)
- **Variation 1:** Simple format with category prefixes
- **Variation 2:** Mixed units (cups, tbsp, oz, lb, ml)
- **Variation 3:** Minimal format (no units)
- **Variation 4:** Complex with decimals and mixed bullet styles

---

## Running Tests

### Run All Manual Meal Plan Tests
```bash
npm run test -- --config vitest.integration.config.ts test/integration/manualMealPlanGenerator.comprehensive.test.ts --run
```

### Run Specific Test Sections
```bash
# Parse API tests only
npm run test -- --config vitest.integration.config.ts test/integration/manualMealPlanGenerator.comprehensive.test.ts --run -t "Parse Manual Meals"

# Save tests only
npm run test -- --config vitest.integration.config.ts test/integration/manualMealPlanGenerator.comprehensive.test.ts --run -t "Save Manual Meal Plan"

# Format variations only
npm run test -- --config vitest.integration.config.ts test/integration/manualMealPlanGenerator.comprehensive.test.ts --run -t "Input Format Variations"

# Complete workflow only
npm run test -- --config vitest.integration.config.ts test/integration/manualMealPlanGenerator.comprehensive.test.ts --run -t "Complete Flow"
```

### Run with Verbose Output
```bash
npm run test -- --config vitest.integration.config.ts test/integration/manualMealPlanGenerator.comprehensive.test.ts --run --reporter=verbose
```

---

## Test Structure

```
Manual Meal Plan Generator - Comprehensive Suite
│
├── Section 1: Parse Manual Meals API
│   ├── should parse simple format meals
│   ├── should parse structured format with ingredients
│   ├── should return error for empty text
│   └── should require authentication
│
├── Section 2: Save Manual Meal Plan
│   ├── should save meal plan with parsed meals and ingredients
│   ├── should return error without plan name
│   └── should return error without meals
│
├── Section 3: Retrieve Saved Meal Plans
│   ├── should retrieve all trainer meal plans
│   ├── should include assignment count
│   ├── should return empty array for trainer with no plans
│   └── should require authentication
│
├── Section 4: Complete Flow
│   └── should complete full workflow successfully
│
└── Section 5: Input Format Variations
    ├── Variation 1: Simple format with category prefixes
    ├── Variation 2: Mixed units (cups, tbsp, oz, lb, ml)
    ├── Variation 3: Minimal format (no units, simple items)
    └── Variation 4: Complex format with decimals and bullet styles
```

---

## Input Format Examples

### Variation 1: Simple Format
```
Breakfast: Oatmeal with berries
Lunch: Grilled chicken salad
Dinner: Baked salmon with quinoa
Snack: Greek yogurt with honey
```

### Variation 2: Mixed Units
```
Meal 1

-2 cups of oats
-6 oz of chicken breast
-2 tbsp of olive oil
-1 lb of vegetables
-250ml of protein shake
```

### Variation 3: Minimal Format
```
Meal 1
-2 eggs
-2 toast
-chicken wrap
-apple
```

### Variation 4: Complex Format
```
Meal 1

-175.5g of jasmine rice
-150.25g of lean ground beef
•4 eggs
•1.5 banana (150g)
-100.75g turkey breast
```

---

## Expected Results

### Parse Response
```json
{
  "status": "success",
  "data": {
    "meals": [
      {
        "mealName": "Jasmine Rice, Lean ground beef, and cooked broccoli",
        "category": "dinner",
        "ingredients": [
          {
            "ingredient": "Jasmine Rice",
            "amount": "175",
            "unit": "g"
          }
        ]
      }
    ],
    "count": 3
  }
}
```

### Save Response
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "trainerId": "uuid",
    "mealPlanData": {
      "planName": "Test Plan",
      "days": 1,
      "mealsPerDay": 3,
      "fitnessGoal": "general",
      "meals": [
        {
          "mealName": "...",
          "category": "dinner",
          "ingredients": [...],
          "imageUrl": "https://...",
          "nutrition": {...}
        }
      ]
    }
  }
}
```

---

## Database Schema

### Tables Used
- `users` - Trainer authentication
- `trainer_meal_plans` - Saved meal plans

### Meal Plan Data Structure
```typescript
{
  planName: string;
  days: number;
  mealsPerDay: number;
  dailyCalorieTarget: number;
  fitnessGoal: string;
  meals: Array<{
    mealName: string;
    category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    ingredients?: Array<{
      ingredient: string;
      amount: string;
      unit: string;
    }>;
    imageUrl: string;
    nutrition: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber: number;
    };
  }>;
  creationMethod: 'manual';
  isManual: true;
}
```

---

## Prerequisites

### Required Environment
- Docker containers running (database on port 5433)
- Test accounts seeded in database
- Server running on port 4000

### Test Account
```
Email: trainer.test@evofitmeals.com
Password: TestTrainer123!
```

### Start Environment
```bash
# Start Docker
docker-compose --profile dev up -d

# Verify database
docker ps | grep postgres

# Seed test accounts (if needed)
npm run seed:test-accounts
```

---

## Debugging Failed Tests

### Common Issues

#### 1. Database Connection Failed
**Error:** `getaddrinfo ENOTFOUND postgres`
**Solution:** Check `test/integration-setup.ts` uses `localhost:5433` not `postgres:5432`

#### 2. 401 Unauthorized
**Error:** `expected 401 to be 200`
**Solution:** Check test account exists and password is correct

#### 3. Empty Meals Array
**Error:** `expected [] to have length 2`
**Solution:** Check Zod schema accepts structured ingredients (fixed in this suite)

#### 4. Test Timeout
**Error:** `Test timed out in 5000ms`
**Solution:** Increase timeout in vitest.integration.config.ts

---

## Performance Benchmarks

| Operation | Expected Time | Actual (Avg) |
|-----------|---------------|--------------|
| Parse API call | < 500ms | ~135ms |
| Save to DB | < 500ms | ~162ms |
| Retrieve plans | < 500ms | ~150ms |
| Complete workflow | < 2000ms | ~590ms |

---

## Related Files

### Source Code
- `server/services/manualMealPlanService.ts` - Parser and service logic
- `server/routes/trainerRoutes.ts` - API endpoints
- `client/src/components/ManualMealPlanCreator.tsx` - UI component

### Configuration
- `test/integration-setup.ts` - Test environment setup
- `vitest.integration.config.ts` - Vitest configuration

### Documentation
- `MANUAL_MEAL_PLAN_FIX_SUMMARY.md` - Bug fix documentation
- `MANUAL_MEAL_PLAN_4_VARIATIONS_TEST_RESULTS.md` - Variation test results

---

## Maintenance

### Adding New Tests
1. Add test case to appropriate section in comprehensive suite
2. Follow existing naming convention
3. Include descriptive comments
4. Verify test passes before committing

### Updating After API Changes
1. Update test expectations in comprehensive suite
2. Run full suite to verify all tests pass
3. Update this README if structure changes
4. Document breaking changes in commit message

---

## Success Criteria

✅ **All 16 tests passing (100%)**
✅ **No database errors**
✅ **All ingredients preserved**
✅ **Meal plan structure compatible**
✅ **Performance within benchmarks**

---

## Contact

For questions or issues with these tests:
1. Check this README first
2. Review test file comments
3. Check related documentation files
4. Review git commit history for context

---

**Last Updated:** October 15, 2025
**Test Suite Version:** 1.0.0
**Status:** ✅ Production Ready
