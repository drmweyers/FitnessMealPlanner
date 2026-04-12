# FORGE QA Warfare — Adversarial Research Brief

**Version:** 1.0.0  
**Date:** 2026-04-12  
**Author:** Agent B — Adversarial QA Research Specialist  
**Purpose:** Enhance FORGE QA Warfare from happy-path actor coverage to full adversarial behavioral coverage

---

## Gap Analysis vs. Current FORGE Suite

The existing 33-spec, 124-test FORGE suite achieves solid actor happy-path coverage and basic 401/403 enforcement. It does NOT cover:

1. **State-machine invalid transitions** — no tests for illegal state moves (e.g., assigning a deleted plan)
2. **IDOR / cross-resource access** — trainer A accessing trainer B's clients or plans
3. **Race conditions** — concurrent mutation of the same resource
4. **Side-effect verification** — no assertions that emails queue, SSE events fire, PDFs generate
5. **Idempotency** — no double-POST / double-PUT tests
6. **Time-based behaviors** — no fake-clock tests for plan expirations, cron jobs
7. **Pagination edge cases** — no empty/single/boundary/unicode filter tests
8. **Property-based / invariant testing** — no fast-check coverage
9. **Chaos / failure injection** — no DB drop / LLM timeout / S3 failure tests
10. **Mutation testing** — no Stryker validation that tests actually catch real bugs

---

## 1. State-Machine Testing

### What It Catches

Invalid state transitions silently accepted by the server — e.g., activating an already-active plan, deleting a plan already assigned to a client, assigning a recipe from a higher tier than the trainer's subscription.

### Canonical Technique

Model-based testing using Kripke structures: enumerate all states S and transitions T, then generate test cases for every (s, t) pair including illegal ones. For stateful property testing, use `fast-check` with `fc.stateMachine()` to drive arbitrary valid + invalid sequences and verify invariants hold after each step.

**State model for MealPlan:**

```
DRAFT → PUBLISHED → ASSIGNED → COMPLETED
                ↓
             ARCHIVED
```

Invalid transitions to test: COMPLETED → PUBLISHED, ARCHIVED → ASSIGNED, DRAFT → COMPLETED (skipping PUBLISHED).

### Playwright/Node Pattern

```typescript
// state-machine.spec.ts
import fc from "fast-check";
import { ForgeApiClient } from "../helpers/api-client.js";

test.describe("STATE — MealPlan illegal transitions", () => {
  let client: ForgeApiClient;
  let planId: string;

  test.beforeAll(async () => {
    client = await ForgeApiClient.loginAs("trainer");
    const r = await client.post("/api/trainer/meal-plans", {
      name: "SM-TEST",
      status: "draft",
    });
    planId = r.body.id;
  });

  test("DRAFT → COMPLETED (skip PUBLISHED) is rejected", async () => {
    const r = await client.raw("PATCH", `/api/trainer/meal-plans/${planId}`, {
      status: "completed",
    });
    expect(r.status).toBe(422); // Unprocessable Entity — invalid transition
  });

  test("ARCHIVED → ASSIGNED is rejected", async () => {
    await client.patch(`/api/trainer/meal-plans/${planId}`, {
      status: "archived",
    });
    const r = await client.raw("PATCH", `/api/trainer/meal-plans/${planId}`, {
      status: "assigned",
    });
    expect(r.status).toBe(422);
  });

  // Property-based: arbitrary transition sequences never corrupt state
  test("fast-check: no sequence of transitions causes 500", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.constantFrom(
            "draft",
            "published",
            "assigned",
            "archived",
            "completed",
          ),
          { minLength: 1, maxLength: 10 },
        ),
        async (transitions) => {
          for (const status of transitions) {
            const r = await client.raw(
              "PATCH",
              `/api/trainer/meal-plans/${planId}`,
              { status },
            );
            expect(r.status).not.toBe(500);
          }
        },
      ),
      { numRuns: 50 },
    );
  });
});
```

### When to Apply

Every resource with a lifecycle field (status, state, active flag). Run in CI on every PR that touches controllers or schema.

---

## 2. Adversarial / Negative Testing

### What It Catches

XSS stored in meal plan names rendered unescaped; SQLi in search/filter params; auth bypass via JWT algorithm confusion; role escalation via mass-assignment (sending `role: 'admin'` in a profile update body); IDOR (accessing another user's resource by guessing/incrementing IDs); CSRF on state-changing endpoints.

### Canonical Technique

OWASP Top 10 checklist mapped to every input surface. For each input field: test null, empty string, max-length+1, HTML tags, script tags, SQL metacharacters, unicode, path traversal sequences. For every ID parameter: substitute a valid ID from a different role's resource.

### Playwright/Node Pattern

```typescript
// adversarial.spec.ts
const XSS_VECTORS = [
  "<script>alert(1)</script>",
  '"><img src=x onerror=alert(1)>',
  "javascript:alert(1)",
  "<svg onload=alert(1)>",
];
const SQLI_VECTORS = [
  "' OR '1'='1",
  "'; DROP TABLE meal_plans; --",
  "1 UNION SELECT * FROM users--",
  "\\x00",
];

test.describe("ADV — Input sanitization", () => {
  let client: ForgeApiClient;

  test.beforeAll(async () => {
    client = await ForgeApiClient.loginAs("trainer");
  });

  for (const vector of XSS_VECTORS) {
    test(`XSS in plan name: ${vector.slice(0, 30)}`, async () => {
      const r = await client.raw("POST", "/api/trainer/meal-plans", {
        name: vector,
      });
      // Must either reject (400) or store escaped — never echo raw
      if (r.status === 201) {
        expect(r.body.name).not.toContain("<script>");
        expect(r.body.name).not.toContain("onerror=");
      } else {
        expect([400, 422]).toContain(r.status);
      }
    });
  }

  for (const vector of SQLI_VECTORS) {
    test(`SQLi in search param: ${vector.slice(0, 30)}`, async () => {
      const r = await client.raw(
        "GET",
        `/api/trainer/recipes?search=${encodeURIComponent(vector)}`,
      );
      // Must not return 500 (error leak) or unexpected data
      expect(r.status).not.toBe(500);
    });
  }
});

// IDOR — trainer A accesses trainer B's client
test("IDOR — trainer cannot read another trainer's client", async ({}) => {
  const trainerA = await ForgeApiClient.loginAs("trainer");
  const trainerB = await ForgeApiClient.loginAs("trainerB"); // second fixture account
  const clientsB = await trainerB.get("/api/trainer/customers");
  const victimId = clientsB.body[0]?.id;

  if (victimId) {
    const r = await trainerA.raw("GET", `/api/trainer/customers/${victimId}`);
    expect([403, 404]).toContain(r.status); // must NOT be 200
  }
});

// Mass-assignment — cannot elevate own role
test("mass-assignment — user cannot self-promote to admin", async () => {
  const client = await ForgeApiClient.loginAs("trainer");
  const r = await client.raw("PATCH", "/api/auth/profile", {
    role: "admin",
    isAdmin: true,
  });
  // Verify role was not changed
  const profile = await client.get("/api/auth/profile");
  expect(profile.body.role).toBe("trainer");
});
```

### When to Apply

Every endpoint that accepts user-controlled string input. Part of the security gate in CI — block merges on failures.

---

## 3. Permission Boundary Testing (4×N Matrix)

### What It Catches

Privilege escalation — a customer calling a trainer-only endpoint and receiving data; a trainer calling an admin endpoint; an unauthenticated request hitting an authenticated route that happens to have a missing middleware guard.

### Canonical Technique

Build a complete **Role × Endpoint** matrix. For every API route, test all four actor contexts: `unauthenticated`, `customer`, `trainer`, `admin`. Assert the exact expected HTTP status for each combination. This is the "permission matrix" pattern used by Stripe's internal API testing.

### Playwright/Node Pattern

```typescript
// permission-matrix.spec.ts
type Role = "unauthenticated" | "customer" | "trainer" | "admin";

interface EndpointSpec {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  body?: Record<string, unknown>;
  expected: Record<Role, number>;
}

const MATRIX: EndpointSpec[] = [
  {
    method: "GET",
    path: "/api/admin/users",
    expected: { unauthenticated: 401, customer: 403, trainer: 403, admin: 200 },
  },
  {
    method: "GET",
    path: "/api/trainer/customers",
    expected: { unauthenticated: 401, customer: 403, trainer: 200, admin: 200 },
  },
  {
    method: "GET",
    path: "/api/customer/meal-plan",
    expected: { unauthenticated: 401, customer: 200, trainer: 403, admin: 200 },
  },
  {
    method: "POST",
    path: "/api/trainer/meal-plans",
    body: { name: "MATRIX-TEST" },
    expected: { unauthenticated: 401, customer: 403, trainer: 201, admin: 201 },
  },
  // ... add every route in the API surface
];

const clients: Record<Role, () => Promise<ForgeApiClient | null>> = {
  unauthenticated: async () => new ForgeApiClient(), // no token
  customer: async () => ForgeApiClient.loginAs("customer"),
  trainer: async () => ForgeApiClient.loginAs("trainer"),
  admin: async () => ForgeApiClient.loginAs("admin"),
};

for (const spec of MATRIX) {
  for (const [role, expectedStatus] of Object.entries(spec.expected)) {
    test(`[${role}] ${spec.method} ${spec.path} → ${expectedStatus}`, async () => {
      const client = await clients[role as Role]();
      const r = await client!.raw(spec.method, spec.path, spec.body);
      expect(r.status).toBe(expectedStatus);
    });
  }
}
```

### When to Apply

Run on every PR. Re-run whenever any route or middleware is added/changed. Keep the matrix in a JSON fixture file so non-engineers can audit it.

---

## 4. Race Conditions / Concurrency

### What It Catches

Double-spend bugs (two concurrent requests each decrement the same counter), phantom reads (trainer assigns plan while customer is reading it), duplicate record creation from double-submit, optimistic lock violations causing lost updates.

### Canonical Technique

Fire N simultaneous requests using `Promise.all()`. Assert that exactly one succeeds and the rest receive the appropriate conflict status (409) or idempotency behavior. For counter-based limits (tier client limits), verify the final count never exceeds the cap.

### Playwright/Node Pattern

```typescript
// concurrency.spec.ts
test("race — double-submit plan creation produces one plan", async () => {
  const client = await ForgeApiClient.loginAs("trainer");
  const planName = `RACE-${Date.now()}`;

  // Fire 5 simultaneous identical POSTs
  const results = await Promise.all(
    Array.from({ length: 5 }, () =>
      client.raw("POST", "/api/trainer/meal-plans", { name: planName }),
    ),
  );

  const created = results.filter((r) => r.status === 201);
  const plans = await client.get(`/api/trainer/meal-plans?search=${planName}`);

  // Exactly 1 plan should exist regardless of how many 201s were returned
  expect(plans.body.filter((p: any) => p.name === planName).length).toBe(1);
});

test("race — concurrent tier limit exhaustion never exceeds cap", async () => {
  const client = await ForgeApiClient.loginAs("trainer"); // Starter: 9 clients
  const STARTER_LIMIT = 9;

  // Attempt to add 15 clients simultaneously
  const results = await Promise.all(
    Array.from({ length: 15 }, (_, i) =>
      client.raw("POST", "/api/trainer/clients/invite", {
        email: `race-client-${i}-${Date.now()}@test.com`,
        name: `Race Client ${i}`,
      }),
    ),
  );

  const succeeded = results.filter((r) => r.status === 201 || r.status === 200);
  expect(succeeded.length).toBeLessThanOrEqual(STARTER_LIMIT);
});

test("race — concurrent plan assignment does not corrupt assignment state", async () => {
  const trainerClient = await ForgeApiClient.loginAs("trainer");
  // Create a plan and two clients
  const plan = await trainerClient.post("/api/trainer/meal-plans", {
    name: "RACE-ASSIGN",
  });
  const clients = await trainerClient.get("/api/trainer/customers");
  const [c1, c2] = clients.body.slice(0, 2);

  // Simultaneously assign the same plan to two different customers
  await Promise.all([
    trainerClient.raw(
      "POST",
      `/api/trainer/meal-plans/${plan.body.id}/assign`,
      { customerId: c1.id },
    ),
    trainerClient.raw(
      "POST",
      `/api/trainer/meal-plans/${plan.body.id}/assign`,
      { customerId: c2.id },
    ),
  ]);

  // Both assignments must be independently retrievable and consistent
  const finalPlan = await trainerClient.get(
    `/api/trainer/meal-plans/${plan.body.id}`,
  );
  expect(finalPlan.status).not.toBe(500);
});
```

### When to Apply

Run nightly (not every PR — flaky by nature). Mark as `@concurrency` tag. Use retry-once with a deterministic seed to distinguish real failures from timing noise.

---

## 5. Idempotency Testing

### What It Catches

Duplicate records from network retries, double charges (if payment endpoints exist), duplicated email sends, double-assignment of a plan to the same client, two meal logs for the same entry.

### Canonical Technique

Send the same POST twice (same body, same auth token). Assert the second request either returns the original resource (200/idempotency key behavior) or a clear conflict (409). Send the same PUT/PATCH twice — verify the resource state is identical after both calls (convergence).

### Playwright/Node Pattern

```typescript
// idempotency.spec.ts
test("POST /api/trainer/meal-plans twice produces one plan", async () => {
  const client = await ForgeApiClient.loginAs("trainer");
  const body = { name: `IDEM-${Date.now()}`, calories: 2000 };

  const r1 = await client.raw("POST", "/api/trainer/meal-plans", body);
  const r2 = await client.raw("POST", "/api/trainer/meal-plans", body);

  expect(r1.status).toBe(201);
  // Second must be idempotent: 200 with same ID, or 409 conflict — NOT another 201 creating a duplicate
  expect([200, 409]).toContain(r2.status);
  if (r2.status === 200) {
    expect(r2.body.id).toBe(r1.body.id);
  }
});

test("PUT /api/trainer/meal-plans/:id twice converges to same state", async () => {
  const client = await ForgeApiClient.loginAs("trainer");
  const plan = await client.post("/api/trainer/meal-plans", {
    name: "IDEM-PUT",
  });
  const id = plan.body.id;
  const update = { name: "IDEM-PUT-UPDATED", calories: 2500 };

  await client.put(`/api/trainer/meal-plans/${id}`, update);
  const r2 = await client.put(`/api/trainer/meal-plans/${id}`, update);

  expect(r2.status).toBe(200);
  expect(r2.body.name).toBe(update.name);
  expect(r2.body.calories).toBe(update.calories);
});

test("POST nutrition log twice does not create duplicate entry", async () => {
  const client = await ForgeApiClient.loginAs("customer");
  const entry = {
    date: "2026-01-01",
    meal: "breakfast",
    calories: 400,
    protein: 30,
  };

  await client.post("/api/customer/nutrition-log", entry);
  await client.post("/api/customer/nutrition-log", entry);

  const logs = await client.get("/api/customer/nutrition-log?date=2026-01-01");
  const duplicates = logs.body.filter(
    (l: any) => l.meal === "breakfast" && l.date === "2026-01-01",
  );
  expect(duplicates.length).toBe(1); // must not be 2
});
```

### When to Apply

Every POST endpoint. Every endpoint that triggers side effects (email, PDF, webhook). Run on every PR.

---

## 6. Side-Effect Verification

### What It Catches

Silent failures where the API returns 200 but the email was never queued, the PDF was never generated, the SSE event was never streamed, or the webhook was never sent. These are "invisible" bugs that only appear in production.

### Canonical Technique

Mock the side-effect boundary (email queue, S3 SDK, SSE emitter, webhook HTTP call) using Jest spies or test-double stubs. Assert the mock was called with the correct payload. For SSE, use Playwright's `page.on('response')` or an `EventSource` listener in Node.

### Playwright/Node Pattern

```typescript
// side-effects.spec.ts

// --- Email side effect ---
// Intercept the nodemailer/sendgrid call via a test email server (mailhog/smtp4dev)
// or by reading the app's email queue table after the action.

test("invite customer → email queued with correct recipient", async () => {
  const trainer = await ForgeApiClient.loginAs("trainer");
  const inviteEmail = `sideeffect-${Date.now()}@test.com`;

  await trainer.post("/api/trainer/clients/invite", {
    email: inviteEmail,
    name: "SideEffect User",
  });

  // Query the email_queue table (or mailhog API) to verify
  const emailQueue = await trainer.get(
    `/api/admin/email-queue?recipient=${inviteEmail}`,
  );
  expect(emailQueue.body.length).toBeGreaterThan(0);
  expect(emailQueue.body[0].subject).toMatch(/invitation/i);
});

// --- SSE side effect ---
test("meal plan published → SSE event fires to assigned customer", async ({
  page,
}) => {
  const trainer = await ForgeApiClient.loginAs("trainer");
  const customer = await ForgeApiClient.loginAs("customer");

  // Subscribe customer to SSE stream
  const sseEvents: string[] = [];
  await page.goto("http://localhost:4000/customer");
  await page.evaluate(() => {
    const es = new EventSource("/api/customer/sse");
    es.onmessage = (e) =>
      ((window as any).__sseLog = [
        ...((window as any).__sseLog || []),
        e.data,
      ]);
  });

  // Trainer publishes a plan assigned to this customer
  const plan = await trainer.post("/api/trainer/meal-plans", {
    name: "SSE-TEST",
    status: "published",
  });
  await trainer.post(`/api/trainer/meal-plans/${plan.body.id}/assign`, {
    customerId: "customer-fixture-id",
  });

  await page.waitForTimeout(2000); // allow SSE to propagate
  const events = await page.evaluate(() => (window as any).__sseLog || []);
  expect(events.some((e: string) => e.includes("meal-plan-updated"))).toBe(
    true,
  );
});

// --- PDF generation side effect ---
test("export meal plan → PDF file exists in storage", async () => {
  const trainer = await ForgeApiClient.loginAs("trainer");
  const plan = await trainer.post("/api/trainer/meal-plans", {
    name: "PDF-TEST",
    status: "published",
  });

  const exportResult = await trainer.post(
    `/api/trainer/meal-plans/${plan.body.id}/export-pdf`,
  );
  expect(exportResult.status).toBe(200);
  expect(exportResult.body.url).toMatch(/\.pdf$/);

  // Verify the URL is actually accessible (not a fake URL)
  const pdfResponse = await fetch(exportResult.body.url);
  expect(pdfResponse.status).toBe(200);
  expect(pdfResponse.headers.get("content-type")).toMatch(/pdf/);
});
```

### When to Apply

Every action that has documented side effects. Build a "side-effect manifest" listing every action → expected side effect. Run on every PR.

---

## 7. Cross-Role Data Integrity

### What It Catches

Trainer creates/updates a meal plan, but the customer sees stale data, partial data, or data from the wrong trainer. Works both directions: customer logs nutrition → trainer's macro dashboard shows correct aggregate.

### Canonical Technique

Two-actor test sequences: Actor A mutates, then Actor B reads, with an explicit synchronization boundary (either wait for polling interval or trigger SSE). Use separate authenticated contexts in Playwright's `browser.newContext()`.

### Playwright/Node Pattern

```typescript
// cross-role-integrity.spec.ts
test("trainer updates plan name → customer sees updated name", async ({
  browser,
}) => {
  const trainerCtx = await browser.newContext({
    storageState: "tests/e2e/auth-state/trainer.json",
  });
  const customerCtx = await browser.newContext({
    storageState: "tests/e2e/auth-state/customer.json",
  });
  const trainerPage = await trainerCtx.newPage();
  const customerPage = await customerCtx.newPage();

  const trainer = await ForgeApiClient.loginAs("trainer");
  const newName = `CROSS-ROLE-${Date.now()}`;

  // Trainer updates via API
  const plan = await trainer.patch("/api/trainer/meal-plans/fixture-plan-id", {
    name: newName,
  });
  expect(plan.status).toBe(200);

  // Customer reads via UI — wait for poll/refresh
  await customerPage.goto("http://localhost:4000/customer/meal-plan");
  await customerPage.waitForTimeout(3000); // allow polling to pick up change
  await expect(customerPage.locator(`text=${newName}`)).toBeVisible({
    timeout: 10000,
  });

  await trainerCtx.close();
  await customerCtx.close();
});

test("customer logs nutrition → trainer macro dashboard reflects total", async () => {
  const customer = await ForgeApiClient.loginAs("customer");
  const trainer = await ForgeApiClient.loginAs("trainer");

  const today = new Date().toISOString().split("T")[0];
  await customer.post("/api/customer/nutrition-log", {
    date: today,
    meal: "lunch",
    calories: 550,
    protein: 40,
    carbs: 60,
    fat: 15,
  });

  // Allow aggregation (might be async)
  await new Promise((r) => setTimeout(r, 1000));

  const dashboard = await trainer.get(
    `/api/trainer/clients/customer-fixture-id/progress?date=${today}`,
  );
  expect(dashboard.body.totalCalories).toBeGreaterThanOrEqual(550);
  expect(dashboard.body.protein).toBeGreaterThanOrEqual(40);
});
```

### When to Apply

Any feature with cross-actor visibility: meal plan assignment, nutrition logging, progress tracking, shopping lists shared between trainer and customer.

---

## 8. Time-Based / Scheduled Behaviors

### What It Catches

Subscription expirations not enforced, recurring meal plans not cycling on schedule, cron jobs that fire at wrong intervals or with stale data, plan "active" flags not expiring correctly.

### Canonical Technique

Use `sinon.useFakeTimers()` or `jest.useFakeTimers()` in unit tests to advance time. In integration tests, manipulate the database timestamp directly (set `expires_at` to past) and trigger the scheduled job, then assert the expected state change.

### Playwright/Node Pattern

```typescript
// time-based.spec.ts (Node integration test, not browser)
import { db } from "../../server/db/index.js";
import { mealPlans } from "../../server/db/schema.js";
import { runExpirationJob } from "../../server/jobs/expiration.job.js";
import { eq } from "drizzle-orm";

test("expiration job deactivates plans past their end date", async () => {
  // Insert a plan with an end date in the past
  const [plan] = await db
    .insert(mealPlans)
    .values({
      name: "TIME-TEST-EXPIRED",
      trainerId: "fixture-trainer-id",
      status: "active",
      endDate: new Date("2020-01-01"), // clearly expired
    })
    .returning();

  // Run the job
  await runExpirationJob();

  // Verify status changed
  const [updated] = await db
    .select()
    .from(mealPlans)
    .where(eq(mealPlans.id, plan.id));
  expect(updated.status).toBe("expired");
});

test("recurring plan cycles to next week on schedule", async () => {
  const client = await ForgeApiClient.loginAs("trainer");

  // Create a weekly recurring plan starting "last week"
  await db
    .update(mealPlans)
    .set({ cycleStartDate: new Date("2026-04-05") })
    .where(eq(mealPlans.id, "fixture-recurring-plan-id"));

  await runExpirationJob(); // should trigger cycle

  const plan = await client.get(
    "/api/trainer/meal-plans/fixture-recurring-plan-id",
  );
  expect(new Date(plan.body.cycleStartDate).toISOString()).toContain(
    "2026-04-12",
  );
});
```

### When to Apply

Any feature with `expires_at`, `starts_at`, `recurring`, or scheduled job. Run in the integration test suite (not browser E2E — too slow for time travel).

---

## 9. Pagination / Filter / Search Edge Cases

### What It Catches

Crashes on empty result sets, off-by-one errors on page boundaries, SQL errors on special characters in search queries, unicode normalization bugs, SQL LIKE wildcard injection (`%` and `_` in user search terms).

### Canonical Technique

Parameterized tests across: empty collection, 1 result, exactly-page-size results, page-size+1 results, last page (partial), page-beyond-end. For search: empty string, single char, unicode (emoji, CJK, RTL), SQL wildcard chars (`%`, `_`, `\`).

### Playwright/Node Pattern

```typescript
// pagination-edge.spec.ts
const SEARCH_EDGE_CASES = [
  { label: "empty", term: "" },
  { label: "single char", term: "a" },
  { label: "SQL wildcard %", term: "%chicken%" },
  { label: "SQL wildcard _", term: "c_icken" },
  { label: "SQL backslash", term: "chicken\\breast" },
  { label: "unicode emoji", term: "🍗" },
  { label: "CJK characters", term: "鸡肉" },
  { label: "RTL text", term: "دجاج" },
  { label: "null bytes", term: "chicken\x00breast" },
  { label: "max length", term: "a".repeat(1000) },
];

for (const { label, term } of SEARCH_EDGE_CASES) {
  test(`recipe search: ${label}`, async () => {
    const client = await ForgeApiClient.loginAs("trainer");
    const r = await client.raw(
      "GET",
      `/api/trainer/recipes?search=${encodeURIComponent(term)}&page=1&limit=20`,
    );
    expect(r.status).not.toBe(500);
    expect(Array.isArray(r.body.data ?? r.body)).toBe(true);
  });
}

test("pagination: page beyond last returns empty array, not error", async () => {
  const client = await ForgeApiClient.loginAs("trainer");
  const r = await client.raw("GET", "/api/trainer/recipes?page=99999&limit=20");
  expect(r.status).toBe(200);
  const data = r.body.data ?? r.body;
  expect(Array.isArray(data)).toBe(true);
  expect(data.length).toBe(0);
});

test("pagination: page=0 or page=-1 is handled gracefully", async () => {
  const client = await ForgeApiClient.loginAs("trainer");
  for (const page of [0, -1, "abc", null]) {
    const r = await client.raw(
      "GET",
      `/api/trainer/recipes?page=${page}&limit=20`,
    );
    expect([200, 400]).toContain(r.status);
    expect(r.status).not.toBe(500);
  }
});
```

### When to Apply

Every list/search endpoint. Run on every PR. Add to the regression suite any time a search bug is reported.

---

## 10. Data-Volume Stress Testing

### What It Catches

UI rendering freezes on large datasets, API timeouts on heavy queries, N+1 query problems that only appear at scale, pagination that works at N=10 but breaks at N=1000.

### Canonical Technique

Seed known data volumes into the test database for each scenario. Use Playwright's `performance.measure()` or `page.metrics()` to assert page render time stays under budget. Use the API client to assert response times under load.

### Playwright/Node Pattern

```typescript
// volume-stress.spec.ts
test("recipe library renders 1000 recipes without timeout", async ({
  page,
}) => {
  // Assumes test DB seeded with 1000+ recipes
  await page.goto("http://localhost:4000/trainer/recipes");

  const startTime = Date.now();
  await page.waitForSelector('[data-testid="recipe-card"]', { timeout: 10000 });
  const renderTime = Date.now() - startTime;

  expect(renderTime).toBeLessThan(5000); // must render first page in under 5s
});

test("meal plan with 21 days of recipes does not cause API timeout", async () => {
  const client = await ForgeApiClient.loginAs("trainer");
  const plan = await client.post("/api/trainer/meal-plans", {
    name: "VOLUME-TEST",
    days: Array.from({ length: 21 }, (_, i) => ({
      day: i + 1,
      breakfast: "recipe-id-1",
      lunch: "recipe-id-2",
      dinner: "recipe-id-3",
    })),
  });
  expect(plan.status).toBe(201);

  const start = Date.now();
  const fetched = await client.get(`/api/trainer/meal-plans/${plan.body.id}`);
  const elapsed = Date.now() - start;

  expect(fetched.status).toBe(200);
  expect(elapsed).toBeLessThan(3000);
});

test("nutrition log with 365 entries returns within time budget", async () => {
  const client = await ForgeApiClient.loginAs("customer");
  const start = Date.now();
  const r = await client.get("/api/customer/nutrition-log?limit=365");
  const elapsed = Date.now() - start;

  expect(r.status).toBe(200);
  expect(elapsed).toBeLessThan(2000);
});
```

### When to Apply

Run nightly in a seeded volume environment. Not on every PR (too slow). Track response time trends — alert if P95 increases by >20%.

---

## 11. Chaos / Failure Injection

### What It Catches

Unhandled promise rejections when the DB drops mid-transaction, missing error boundaries when LLM (OpenAI) returns a 429 or 500, silent data corruption when S3 times out during image upload, infinite loading spinners when SSE connection drops.

### Canonical Technique

Use `nock` or `msw` (Mock Service Worker) to intercept outbound HTTP calls and return error responses. Use a Proxy (like `toxiproxy`) to inject network latency/drops on the PostgreSQL connection. Assert the app returns a user-friendly error, not a 500 or a hang.

### Playwright/Node Pattern

```typescript
// chaos.spec.ts
import nock from "nock";

test("LLM failure returns user-friendly error, not 500", async () => {
  // Intercept the OpenAI call
  nock("https://api.openai.com")
    .post("/v1/chat/completions")
    .reply(500, { error: { message: "Internal server error" } });

  const client = await ForgeApiClient.loginAs("trainer");
  const r = await client.raw("POST", "/api/trainer/meal-plans/generate-ai", {
    goal: "weight-loss",
    calories: 2000,
  });

  // App must return structured error, not leak the OpenAI error
  expect(r.status).toBe(503); // or 500 with a clean message
  expect(r.body.message).toMatch(/try again|unavailable|failed/i);
  expect(r.body.message).not.toContain("openai");
  expect(r.body.message).not.toContain("api.openai.com");
});

test("S3 timeout on image upload returns graceful error", async () => {
  nock("https://s3.amazonaws.com")
    .put(/.*/)
    .delayConnection(30000) // simulate 30s timeout
    .reply(200);

  const client = await ForgeApiClient.loginAs("admin");
  const r = await client.raw("POST", "/api/admin/recipes/bulk-generate", {
    count: 1,
  });

  // Should fail fast with a timeout error, not hang
  expect([500, 503, 408]).toContain(r.status);
});

// Browser-level chaos: SSE disconnect shows reconnect indicator
test("SSE connection drop shows reconnecting indicator in UI", async ({
  page,
}) => {
  await page.goto("http://localhost:4000/customer");
  await page.waitForLoadState("networkidle");

  // Simulate network offline
  await page.context().setOffline(true);
  await page.waitForTimeout(3000);

  // App should show a reconnecting/offline indicator, not freeze
  const offlineIndicator = page.locator(
    '[data-testid="offline-indicator"], text=/reconnecting/i, text=/offline/i',
  );
  await expect(offlineIndicator).toBeVisible({ timeout: 10000 });

  // Restore and verify recovery
  await page.context().setOffline(false);
  await page.waitForTimeout(3000);
  await expect(offlineIndicator).not.toBeVisible({ timeout: 10000 });
});
```

### When to Apply

Run in a dedicated chaos suite nightly. For each external dependency (OpenAI, S3/DO Spaces, email provider, Stripe), create at least: timeout, 500 error, and 429 rate-limit scenarios.

---

## 12. Property-Based Testing

### What It Catches

Subtle invariant violations that only appear for unusual combinations of valid inputs — e.g., macro totals don't add up, calorie calculations are inconsistent, tier enforcement breaks for users with exactly the limit number of clients.

### Canonical Technique

Use `fast-check` to generate arbitrary valid inputs and assert that invariants hold for all of them. Classic invariants: total calories = sum of meal calories; total macros in grams × calorie-per-gram ≈ total calories; Starter tier never allows >9 clients regardless of creation order.

### Playwright/Node Pattern

```typescript
// property-based.spec.ts
import fc from "fast-check";

test("invariant: meal plan total calories = sum of meal calories", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.array(
        fc.record({
          calories: fc.integer({ min: 50, max: 800 }),
          protein: fc.float({ min: 0, max: 60 }),
          carbs: fc.float({ min: 0, max: 100 }),
          fat: fc.float({ min: 0, max: 50 }),
        }),
        { minLength: 1, maxLength: 6 },
      ),
      async (meals) => {
        const client = await ForgeApiClient.loginAs("trainer");
        const plan = await client.post("/api/trainer/meal-plans", {
          name: `PROP-${Date.now()}`,
          meals,
        });

        if (plan.status !== 201) return; // skip invalid combinations

        const expectedTotal = meals.reduce((sum, m) => sum + m.calories, 0);
        expect(Math.abs(plan.body.totalCalories - expectedTotal)).toBeLessThan(
          1,
        ); // floating-point tolerance
      },
    ),
    { numRuns: 100 },
  );
});

test("invariant: starter tier always rejects client #10+", async () => {
  await fc.assert(
    fc.asyncProperty(fc.integer({ min: 10, max: 20 }), async (clientCount) => {
      // This is conceptual — in practice, use a pre-seeded DB with exactly N clients
      const client = await ForgeApiClient.loginAs("trainer");
      const current = await client.get("/api/trainer/customers");
      if (current.body.length >= 9) {
        const r = await client.raw("POST", "/api/trainer/clients/invite", {
          email: `prop-${Date.now()}@test.com`,
          name: "Prop Test",
        });
        expect([403, 422, 429]).toContain(r.status); // never 201 when at/over limit
      }
    }),
    { numRuns: 20 },
  );
});
```

### When to Apply

Core business rules with numeric invariants (calorie math, macro calculations, tier limits, pagination totals). Run as part of the unit test suite in CI. Start with the 3-5 most critical invariants.

---

## 13. Mutation Testing

### What It Catches

Tests that pass even when the implementation is wrong — i.e., tests that are present but don't actually assert meaningful behavior. Stryker mutates the production code (flips conditionals, removes return statements, changes operators) and verifies that at least one test fails per mutation.

### Canonical Technique

Run Stryker on the server-side business logic (controllers, services, validation). A "survived mutant" means the test suite didn't catch a real code change — this is a gap in test effectiveness, not code coverage.

### Setup Pattern

```bash
# Install Stryker
npm install --save-dev @stryker-mutator/core @stryker-mutator/jest-runner

# stryker.config.json
{
  "mutate": [
    "server/controllers/**/*.ts",
    "server/services/**/*.ts",
    "server/middleware/auth.ts"
  ],
  "testRunner": "jest",
  "coverageAnalysis": "perTest",
  "thresholds": { "high": 80, "low": 60, "break": 50 },
  "reporters": ["html", "progress"]
}
```

```bash
# Run (monthly, not per PR — very slow)
npx stryker run
```

**What to look for:** Any mutation in auth middleware, tier-limit enforcement, or calorie calculation that survives = critical gap. Fix by adding a targeted assertion, not more test code.

### When to Apply

Monthly or after any major refactor of core business logic. Not in CI — Stryker runs take 10-60 minutes. Use the HTML report to find the highest-risk surviving mutants.

---

## 14. Accessibility Testing

### What It Catches

Missing ARIA labels, insufficient color contrast, keyboard navigation traps, missing alt text on images, form fields without labels — all of which affect users with disabilities and also affect SEO.

### Canonical Technique

Run `axe-core` via `@axe-core/playwright` on every page after every workflow. Assert zero violations at the "critical" and "serious" levels. Run at the end of each actor's user journey, not just on page load.

### Playwright/Node Pattern

```typescript
// accessibility.spec.ts
import AxeBuilder from "@axe-core/playwright";

async function assertNoAxeViolations(page: Page, context?: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();

  const critical = results.violations.filter((v) =>
    ["critical", "serious"].includes(v.impact!),
  );
  if (critical.length > 0) {
    console.error(
      `Axe violations on ${context}:`,
      JSON.stringify(
        critical.map((v) => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodes: v.nodes.map((n) => n.html).slice(0, 2),
        })),
        null,
        2,
      ),
    );
  }
  expect(critical.length).toBe(0);
}

test.describe("A11Y — Trainer workflow", () => {
  test("trainer dashboard has no critical a11y violations", async ({
    page,
  }) => {
    await page.goto("http://localhost:4000/trainer");
    await page.waitForLoadState("networkidle");
    await assertNoAxeViolations(page, "/trainer");
  });

  test("meal plan creation form has no critical a11y violations", async ({
    page,
  }) => {
    await page.goto("http://localhost:4000/trainer/manual-meal-plan");
    await page.waitForLoadState("networkidle");
    await assertNoAxeViolations(page, "/trainer/manual-meal-plan");
  });

  test("recipe library has no critical a11y violations", async ({ page }) => {
    await page.goto("http://localhost:4000/trainer/recipes");
    await page.waitForLoadState("networkidle");
    await assertNoAxeViolations(page, "/trainer/recipes");
  });
});

// Run a11y checks after every major workflow
test("a11y: after completing meal plan creation workflow", async ({ page }) => {
  // ... complete the workflow ...
  await assertNoAxeViolations(page, "post-meal-plan-creation");
});
```

### When to Apply

Every page, every workflow. Add `assertNoAxeViolations` as a fixture that runs automatically in `test.afterEach` for the E2E suite.

---

## 15. Mobile / Responsive Testing

### What It Catches

Layout overflow, hidden interactive elements, touch targets too small (< 44px), forms broken on mobile keyboard, navigation menu inaccessible on 375px viewport.

### Canonical Technique

Repeat every actor workflow at three viewport sizes: 375×667 (iPhone SE), 768×1024 (iPad), 1024×768 (small laptop). Use Playwright's `page.setViewportSize()`. Assert no horizontal scroll, all interactive elements visible and clickable.

### Playwright/Node Pattern

```typescript
// responsive.spec.ts
const VIEWPORTS = [
  { name: "mobile", width: 375, height: 667 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1024, height: 768 },
];

for (const viewport of VIEWPORTS) {
  test.describe(`RESPONSIVE — ${viewport.name} (${viewport.width}px)`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("trainer dashboard renders without horizontal scroll", async ({
      page,
    }) => {
      await page.goto("http://localhost:4000/trainer");
      await page.waitForLoadState("networkidle");

      const hasHorizontalScroll = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
      expect(hasHorizontalScroll).toBe(false);
    });

    test("navigation menu is accessible", async ({ page }) => {
      await page.goto("http://localhost:4000/trainer");
      // On mobile: hamburger menu should be clickable
      if (viewport.width <= 768) {
        const hamburger = page.locator(
          '[data-testid="mobile-menu-toggle"], [aria-label*="menu"]',
        );
        if ((await hamburger.count()) > 0) {
          await hamburger.click();
          await expect(page.locator("nav")).toBeVisible();
        }
      } else {
        await expect(page.locator("nav")).toBeVisible();
      }
    });

    test("meal plan creation form is usable", async ({ page }) => {
      await page.goto("http://localhost:4000/trainer/manual-meal-plan");
      await page.waitForLoadState("networkidle");

      const submitBtn = page.locator(
        'button[type="submit"], button:has-text("Create"), button:has-text("Save")',
      );
      await expect(submitBtn.first()).toBeVisible();
      await expect(submitBtn.first()).toBeInViewport();
    });
  });
}
```

### When to Apply

Repeat the full FORGE actor journey suite at all three viewports. Run mobile viewport suite nightly; run desktop suite on every PR.

---

## 16. Realistic Persona Simulation

### What It Catches

Bugs in form state management (partial fill → back button → re-submit), race conditions from rapid navigation, browser-refresh mid-form losing state, tab-switching causing duplicate submissions, double-clicking submit buttons.

### Canonical Technique

Simulate real human behavior patterns: slow typing (using `page.type()` with delay), wrong input then correction, clicking back/forward, refreshing mid-workflow, leaving page open for >10 min (session expiry), double-clicking CTAs, tabbing through forms in wrong order.

### Playwright/Node Pattern

```typescript
// persona-simulation.spec.ts
test("persona: hesitant trainer — starts form, goes back, resubmits", async ({
  page,
}) => {
  await page.goto("http://localhost:4000/trainer/manual-meal-plan");
  await page.waitForLoadState("networkidle");

  // Fill half the form with slow typing
  const nameInput = page.locator('input[name="planName"]').first();
  await nameInput.click();
  await page.keyboard.type("My Meal ", { delay: 80 }); // human-speed typing

  // Second-guess — go back
  await page.goBack();
  await page.waitForTimeout(500);
  await page.goForward();
  await page.waitForLoadState("networkidle");

  // Form should be in a valid state (either empty or preserved, not broken)
  await expect(page.locator("body")).not.toContainText("Error");
  await expect(page.locator("body")).not.toContainText("Something went wrong");
});

test("persona: impatient customer — double-clicks submit", async ({ page }) => {
  await page.goto("http://localhost:4000/customer/nutrition-log");
  await page.waitForLoadState("networkidle");

  // Fill the log form
  // ... fill fields ...

  const submitBtn = page.locator('button[type="submit"]').first();
  // Double-click the submit button rapidly
  await submitBtn.dblclick();
  await page.waitForTimeout(2000);

  // Should not create two entries
  const logs = await (
    await ForgeApiClient.loginAs("customer")
  ).get(
    "/api/customer/nutrition-log?date=" +
      new Date().toISOString().split("T")[0],
  );
  const todayLogs = logs.body.filter(
    (l: any) => l.date === new Date().toISOString().split("T")[0],
  );
  expect(todayLogs.length).toBeLessThanOrEqual(1);
});

test("persona: confused trainer — refreshes mid-AI-generation", async ({
  page,
}) => {
  await page.goto("http://localhost:4000/trainer/generate-meal-plan");
  await page.waitForLoadState("networkidle");

  // Start AI generation
  const generateBtn = page.locator(
    'button:has-text("Generate"), button:has-text("Create with AI")',
  );
  if ((await generateBtn.count()) > 0) {
    await generateBtn.first().click();
    await page.waitForTimeout(1000); // while loading

    // Refresh mid-generation
    await page.reload();
    await page.waitForLoadState("networkidle");

    // App should not be in a broken state
    await expect(page.locator("body")).not.toContainText("undefined");
    await expect(page.locator("body")).not.toContainText("[object Object]");
  }
});
```

### When to Apply

Incorporate into the FORGE actor journey suite as "chaos persona" variants. Run nightly. Focus on forms with multi-step flows and async operations.

---

## Industry Patterns: How Top SaaS Teams Achieve Near-100% Behavioral Coverage

### Stripe's Approach

1. **Contract-first API testing:** Every endpoint has a machine-readable spec (OpenAPI). Tests are generated from the spec — ensuring spec and implementation never diverge.
2. **Permission matrix as code:** Role × endpoint × expected-status is maintained in a centralized fixture file. A script auto-generates tests from this matrix.
3. **Shadow testing in production:** New code paths run in parallel with old code paths; results are compared. Discrepancies trigger alerts.
4. **Chaos engineering via Failure Friday:** Intentional production failures to verify resilience.

### Linear's Approach

1. **Behavioral test pyramid:** Heavy unit tests for pure logic, integration tests for API contracts, minimal E2E for critical user journeys. E2E are treated as "smoke" not "coverage."
2. **Optimistic UI testing:** Every UI action is tested both when the network is fast (happy path) and when it's slow/fails (error handling).
3. **Real-time collaboration testing:** Two browser contexts mutating the same document simultaneously, asserting eventual consistency.

### GitHub's Approach

1. **Feature flag testing:** Every new feature is tested behind a flag in both on and off states.
2. **Partition testing at scale:** Tests run against production-scale data snapshots to catch N+1 queries and slow queries.
3. **Accessibility as a gate:** No PR merges with critical axe violations.

---

## Coverage Matrix Pattern

```
Matrix Dimensions: Role × Action × State × Input-Class

Role:         [unauthenticated, customer, trainer, admin]
Action:       [create, read, update, delete, assign, export, share]
State:        [draft, published, assigned, completed, archived, expired]
Input-Class:  [valid, empty, max-boundary, overflow, xss, sqli, unicode]

Total cells: 4 × 7 × 6 × 7 = 1,176 test cases
```

**Implementation:** Represent the matrix as a JSON fixture. Write a generator that produces parameterized test cases from it. This is how Stripe achieves comprehensive API coverage without writing 1,176 individual tests by hand.

```json
// coverage-matrix.json (partial)
{
  "endpoint": "POST /api/trainer/meal-plans",
  "permissions": {
    "unauthenticated": 401,
    "customer": 403,
    "trainer": 201,
    "admin": 201
  },
  "states": {
    "draft": { "valid": 201, "empty_name": 422, "xss_name": 400 },
    "published": { "valid": 200, "already_published": 409 }
  }
}
```

---

## Contract Testing with Pact

### What It Catches

Breaking API changes that were not caught by the consumer because the consumer's tests mock the provider directly. When the provider changes an API, Pact detects that the consumer's recorded contract is no longer satisfied.

### How It Fits

In FitnessMealPlanner's architecture, the "consumer" is the React frontend and the "provider" is the Express API. Pact sits between them:

1. **Consumer tests** (React) record HTTP interactions as "pacts" (JSON contract files).
2. **Provider verification** (Express) replays those recorded interactions against the real server and verifies the responses match.
3. **Pact Broker** stores contracts and tracks compatibility across versions.

### Pattern

```typescript
// consumer: client/src/api/__tests__/meal-plans.pact.spec.ts
import { PactV3, MatchersV3 } from "@pact-foundation/pact";

const provider = new PactV3({
  consumer: "FMPFrontend",
  provider: "FMPApi",
  dir: "./pacts",
});

test("GET /api/trainer/meal-plans returns plan array", async () => {
  await provider
    .given("trainer has meal plans")
    .uponReceiving("a request for meal plans")
    .withRequest({ method: "GET", path: "/api/trainer/meal-plans" })
    .willRespondWith({
      status: 200,
      body: MatchersV3.eachLike({
        id: MatchersV3.string("plan-id"),
        name: MatchersV3.string("Test Plan"),
        status: MatchersV3.string("draft"),
      }),
    })
    .executeTest(async (mockServer) => {
      const plans = await fetchMealPlans(mockServer.url);
      expect(plans.length).toBeGreaterThan(0);
    });
});
```

### When to Apply

Start with the 5-10 most critical API endpoints used by the frontend. Run Pact consumer tests on every PR. Run provider verification on every API change. Integrate Pact Broker with CI to block deploys when contracts break.

---

## Top 10 Gaps in Current FORGE Warfare Methodology

Ranked by bug-catching value (highest first):

| Rank | Gap                                   | Why It's High Value                                                                   |
| ---- | ------------------------------------- | ------------------------------------------------------------------------------------- |
| 1    | **IDOR / Cross-trainer data access**  | Trainer A can read Trainer B's clients — privacy breach, zero current coverage        |
| 2    | **Permission matrix completeness**    | Current tests check 2-3 combos; need all 4×N combinations across every endpoint       |
| 3    | **Race conditions on tier limits**    | Concurrent invites can exceed Starter's 9-client cap — financial/feature boundary bug |
| 4    | **Side-effect verification**          | No test verifies emails queue, SSEs fire, or PDFs actually generate                   |
| 5    | **State-machine illegal transitions** | No test tries invalid status transitions (ARCHIVED → ASSIGNED, etc.)                  |
| 6    | **Idempotency**                       | Double-submit on meal log, plan creation, or nutrition entry creates duplicates       |
| 7    | **XSS in stored fields**              | Plan names, recipe titles, client names — none tested for XSS storage/rendering       |
| 8    | **Chaos / LLM failure handling**      | OpenAI 500/429 → app behavior completely untested                                     |
| 9    | **Pagination edge cases**             | SQL wildcard injection in search (`%`, `_`) not tested                                |
| 10   | **Cross-role data integrity timing**  | Trainer updates → customer sees change — no test verifies SSE/polling delivers it     |
