# API Contract Testing - Phase 3

**Status:** 🚀 Framework Created - Ready for Implementation
**Date:** [Current Session]

---

## Overview

API Contract Testing validates that the backend API endpoints adhere to their defined contracts, ensuring:
- Correct HTTP status codes
- Expected response schemas
- Proper error handling
- Authentication/authorization checks
- Request validation

---

## Test Structure

```
test/api-contracts/
├── README.md (this file)
├── auth/
│   ├── login.contract.test.ts
│   ├── logout.contract.test.ts
│   └── refresh-token.contract.test.ts
├── recipes/
│   ├── get-recipes.contract.test.ts
│   ├── create-recipe.contract.test.ts
│   ├── update-recipe.contract.test.ts
│   └── delete-recipe.contract.test.ts
├── meal-plans/
│   ├── get-meal-plans.contract.test.ts
│   ├── create-meal-plan.contract.test.ts
│   ├── update-meal-plan.contract.test.ts
│   └── delete-meal-plan.contract.test.ts
├── users/
│   ├── get-users.contract.test.ts
│   ├── create-user.contract.test.ts
│   ├── update-user.contract.test.ts
│   └── delete-user.contract.test.ts
└── helpers/
    ├── api-client.ts
    ├── schema-validators.ts
    └── contract-helpers.ts
```

---

## Implementation Pattern

### Example: Recipe API Contract Test

```typescript
import { test, expect } from '@playwright/test';
import { APIClient } from '../helpers/api-client';
import { validateRecipeSchema } from '../helpers/schema-validators';

test.describe('Recipe API Contracts', () => {
  let apiClient: APIClient;

  test.beforeAll(async () => {
    apiClient = new APIClient('http://localhost:4000');
    await apiClient.loginAsAdmin();
  });

  test('GET /api/recipes - returns 200 with valid schema', async () => {
    const response = await apiClient.get('/api/recipes');

    // Validate status code
    expect(response.status()).toBe(200);

    // Validate content type
    expect(response.headers()['content-type']).toContain('application/json');

    // Validate response schema
    const body = await response.json();
    expect(body).toHaveProperty('recipes');
    expect(Array.isArray(body.recipes)).toBe(true);

    if (body.recipes.length > 0) {
      validateRecipeSchema(body.recipes[0]);
    }
  });

  test('GET /api/recipes/:id - returns 200 for valid recipe', async () => {
    // Create a test recipe
    const recipe = await apiClient.createRecipe({
      title: 'Test Recipe',
      ingredients: ['ingredient1'],
      instructions: 'Test instructions'
    });

    // Get the recipe
    const response = await apiClient.get(`/api/recipes/${recipe.id}`);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.id).toBe(recipe.id);
    validateRecipeSchema(body);
  });

  test('GET /api/recipes/:id - returns 404 for non-existent recipe', async () => {
    const response = await apiClient.get('/api/recipes/99999999');

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('POST /api/recipes - returns 401 without authentication', async () => {
    const unauthClient = new APIClient('http://localhost:4000');

    const response = await unauthClient.post('/api/recipes', {
      title: 'Unauthorized Recipe'
    });

    expect(response.status()).toBe(401);
  });

  test('POST /api/recipes - returns 400 with invalid data', async () => {
    const response = await apiClient.post('/api/recipes', {
      // Missing required fields
      title: ''
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('errors');
  });
});
```

---

## Key Test Categories

### 1. Success Path Tests ✅
- Valid requests return 200/201
- Response schema matches contract
- Data is properly formatted

### 2. Error Path Tests ❌
- Invalid requests return 400
- Missing authentication returns 401
- Insufficient permissions return 403
- Not found returns 404
- Server errors return 500

### 3. Schema Validation Tests 📋
- All response fields present
- Correct data types
- Required fields not null
- Enum values valid

### 4. RBAC Tests 🔐
- Admin can access admin endpoints
- Trainer can access trainer endpoints
- Customer can access customer endpoints
- Users cannot access unauthorized endpoints

---

## Test Credentials

```typescript
export const API_TEST_CREDENTIALS = {
  admin: {
    email: 'admin@fitmeal.pro',
    password: 'AdminPass123'
  },
  trainer: {
    email: 'trainer.test@evofitmeals.com',
    password: 'TestTrainer123!'
  },
  customer: {
    email: 'customer.test@evofitmeals.com',
    password: 'TestCustomer123!'
  }
};
```

---

## Running API Contract Tests

```bash
# Run all API contract tests
npm run test:api-contracts

# Run specific category
npm run test:api-contracts:auth
npm run test:api-contracts:recipes
npm run test:api-contracts:meal-plans
npm run test:api-contracts:users

# Run with coverage
npm run test:api-contracts:coverage
```

---

## Expected Coverage

**Target: 80+ API endpoints tested**

### Endpoints by Category

**Authentication (5 endpoints):**
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/refresh
- POST /api/auth/register
- GET /api/auth/me

**Recipes (10 endpoints):**
- GET /api/recipes
- GET /api/recipes/:id
- POST /api/admin/recipes
- PUT /api/admin/recipes/:id
- DELETE /api/admin/recipes/:id
- POST /api/admin/recipes/generate (BMAD)
- GET /api/recipes/search
- GET /api/recipes/filter
- POST /api/admin/recipes/approve/:id
- POST /api/admin/recipes/reject/:id

**Meal Plans (15 endpoints):**
- GET /api/meal-plans
- GET /api/meal-plans/:id
- POST /api/meal-plans
- PUT /api/meal-plans/:id
- DELETE /api/meal-plans/:id
- POST /api/meal-plans/generate
- GET /api/trainer/meal-plans
- POST /api/trainer/meal-plans/assign
- GET /api/customer/meal-plans
- POST /api/customer/meal-plans/favorite
- POST /api/meal-plans/:id/export/pdf
- GET /api/meal-plans/:id/recipes
- POST /api/meal-plans/:id/recipes/substitute
- GET /api/meal-plans/stats
- POST /api/meal-plans/:id/share

**Users (10 endpoints):**
- GET /api/admin/users
- GET /api/admin/users/:id
- POST /api/admin/users
- PUT /api/admin/users/:id
- DELETE /api/admin/users/:id
- GET /api/trainer/customers
- POST /api/trainer/customers/invite
- GET /api/customer/profile
- PUT /api/customer/profile
- POST /api/customer/profile/avatar

**Grocery Lists (10 endpoints):**
- GET /api/grocery-lists
- GET /api/grocery-lists/:id
- POST /api/grocery-lists
- PUT /api/grocery-lists/:id
- DELETE /api/grocery-lists/:id
- POST /api/grocery-lists/generate-from-meal-plan
- PUT /api/grocery-lists/:id/items/:itemId/check
- POST /api/grocery-lists/:id/items
- DELETE /api/grocery-lists/:id/items/:itemId
- POST /api/grocery-lists/:id/export

**Progress Tracking (10 endpoints):**
- GET /api/customer/measurements
- POST /api/customer/measurements
- GET /api/customer/photos
- POST /api/customer/photos
- DELETE /api/customer/photos/:id
- GET /api/customer/goals
- POST /api/customer/goals
- PUT /api/customer/goals/:id
- GET /api/trainer/customers/:id/progress
- GET /api/customer/progress/summary

**Analytics (10 endpoints):**
- GET /api/admin/analytics/overview
- GET /api/admin/analytics/users
- GET /api/admin/analytics/recipes
- GET /api/admin/analytics/meal-plans
- GET /api/trainer/analytics/customers
- GET /api/trainer/analytics/meal-plans
- GET /api/customer/analytics/nutrition
- GET /api/customer/analytics/progress
- GET /api/admin/analytics/system
- GET /api/admin/analytics/export

**Health (5 endpoints):**
- GET /api/health
- GET /api/health/db
- GET /api/health/storage
- GET /api/admin/health/metrics
- GET /api/admin/health/logs

---

## Schema Validation Helpers

```typescript
// helpers/schema-validators.ts
export function validateRecipeSchema(recipe: any) {
  expect(recipe).toHaveProperty('id');
  expect(recipe).toHaveProperty('title');
  expect(recipe).toHaveProperty('ingredients');
  expect(recipe).toHaveProperty('instructions');
  expect(recipe).toHaveProperty('nutrition');
  expect(recipe).toHaveProperty('mealType');
  expect(recipe).toHaveProperty('prepTime');
  expect(recipe).toHaveProperty('imageUrl');

  expect(typeof recipe.id).toBe('string');
  expect(typeof recipe.title).toBe('string');
  expect(Array.isArray(recipe.ingredients)).toBe(true);
  expect(typeof recipe.instructions).toBe('string');
  expect(typeof recipe.nutrition).toBe('object');
}

export function validateMealPlanSchema(mealPlan: any) {
  expect(mealPlan).toHaveProperty('id');
  expect(mealPlan).toHaveProperty('name');
  expect(mealPlan).toHaveProperty('customerId');
  expect(mealPlan).toHaveProperty('days');
  expect(mealPlan).toHaveProperty('dailyCalories');
  expect(mealPlan).toHaveProperty('recipes');

  expect(Array.isArray(mealPlan.recipes)).toBe(true);
}

export function validateUserSchema(user: any) {
  expect(user).toHaveProperty('id');
  expect(user).toHaveProperty('email');
  expect(user).toHaveProperty('name');
  expect(user).toHaveProperty('role');
  expect(['admin', 'trainer', 'customer']).toContain(user.role);

  // Should NOT expose password
  expect(user).not.toHaveProperty('password');
}
```

---

## API Client Helper

```typescript
// helpers/api-client.ts
import { request, APIRequestContext } from '@playwright/test';

export class APIClient {
  private context?: APIRequestContext;
  private baseURL: string;
  private authToken?: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async init() {
    this.context = await request.newContext({
      baseURL: this.baseURL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json'
      }
    });
  }

  async loginAsAdmin() {
    await this.login('admin@fitmeal.pro', 'AdminPass123');
  }

  async loginAsTrainer() {
    await this.login('trainer.test@evofitmeals.com', 'TestTrainer123!');
  }

  async loginAsCustomer() {
    await this.login('customer.test@evofitmeals.com', 'TestCustomer123!');
  }

  private async login(email: string, password: string) {
    const response = await this.post('/api/auth/login', { email, password });
    const body = await response.json();
    this.authToken = body.token;
  }

  async get(url: string) {
    return this.context!.get(url, {
      headers: this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {}
    });
  }

  async post(url: string, data: any) {
    return this.context!.post(url, {
      data,
      headers: this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {}
    });
  }

  async put(url: string, data: any) {
    return this.context!.put(url, {
      data,
      headers: this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {}
    });
  }

  async delete(url: string) {
    return this.context!.delete(url, {
      headers: this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {}
    });
  }
}
```

---

## Success Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Endpoints Tested | 80+ | ⚠️ Pending |
| Test Coverage | 90%+ | ⚠️ Pending |
| Schema Validation | 100% | ⚠️ Pending |
| RBAC Tests | All roles | ⚠️ Pending |
| Error Handling | All codes | ⚠️ Pending |

---

## Next Steps

1. **Create API Client Helper** (helpers/api-client.ts)
2. **Create Schema Validators** (helpers/schema-validators.ts)
3. **Implement Auth Contract Tests** (auth/*.contract.test.ts)
4. **Implement Recipe Contract Tests** (recipes/*.contract.test.ts)
5. **Implement Meal Plan Contract Tests** (meal-plans/*.contract.test.ts)
6. **Implement User Contract Tests** (users/*.contract.test.ts)
7. **Run Full Test Suite**
8. **Generate Coverage Report**

---

**Phase 3 Status:** ✅ Framework Complete - Ready for Test Implementation
**Estimated Implementation Time:** 4-6 hours for 80+ endpoint tests
**Priority:** High - Ensures API reliability and contract adherence

---

**Last Updated:** [Current Session]
**Maintained By:** Testing Team
