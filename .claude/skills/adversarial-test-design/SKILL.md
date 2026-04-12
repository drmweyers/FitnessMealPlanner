---
name: adversarial-test-design
description: Design negative, security, and boundary tests that try to break the app. Covers IDOR, auth bypass, role escalation, XSS, SQL wildcards, malformed input, mass-assignment, idempotency, and the full role×endpoint permission matrix. Use when building warfare QA adversarial suites. Trigger phrases - "adversarial tests", "security tests", "IDOR", "break the app".
---

# Adversarial Test Design

## Purpose

Happy-path tests prove the app works when used correctly. **Adversarial tests prove the app cannot be misused.** They catch the bugs that ship to production and become CVEs, data leaks, and support tickets.

## The 9 Adversarial Patterns

### 1. Permission Matrix (4×N)

For every endpoint, test with every role:

```typescript
const roles = ["anon", "customer", "trainer", "admin"];
const endpoints = loadCoverageMatrix().endpoints;

for (const endpoint of endpoints) {
  for (const role of roles) {
    test(`${role} ${endpoint.method} ${endpoint.path}`, async () => {
      const res = await callAs(role, endpoint);
      const expected = endpoint.allowedRoles.includes(role) ? 200 : [401, 403];
      expect(res.status).toEqualOneOf(expected);
    });
  }
}
```

**Catches:** Privilege escalation, missing auth middleware, wrong role guard.

### 2. IDOR (Insecure Direct Object Reference)

Trainer A must not be able to read/write Trainer B's resources:

```typescript
test("trainer A cannot read trainer B client", async () => {
  const trainerA = await seedTrainer();
  const trainerB = await seedTrainer();
  const clientB = await createClientFor(trainerB);
  const res = await api.as(trainerA).get(`/api/clients/${clientB.id}`);
  expect(res.status).toBe(404); // not 200, not 500
});
```

Repeat for: meal plans, recipes, grocery lists, progress, PDFs, bug reports.

### 3. XSS (stored + reflected)

Every user-writable string field gets these payloads:

```typescript
const XSS_PAYLOADS = [
  `<script>window.__pwned=1</script>`,
  `<img src=x onerror=window.__pwned=1>`,
  `"><svg onload=window.__pwned=1>`,
  `javascript:window.__pwned=1`,
];
```

Submit as the writer role, render as the reader role (cross-role XSS), assert `window.__pwned` is undefined.

### 4. SQL / LIKE wildcard injection

Search/filter params must escape `%`, `_`, `\`:

```typescript
const SQL_PAYLOADS = [`%`, `_`, `\\`, `' OR 1=1 --`, `'; DROP TABLE users; --`];
for (const p of SQL_PAYLOADS) {
  const res = await api.get(`/api/recipes?search=${encodeURIComponent(p)}`);
  expect(res.status).toBe(200);
  // result set should be literal match, not wildcard match
}
```

### 5. Mass-assignment

POST extra fields the client shouldn't control:

```typescript
test("customer cannot promote self to admin via profile update", async () => {
  const res = await api.as("customer").patch("/api/profile", {
    name: "hacker",
    role: "admin", // attempted mass-assignment
    tier: "enterprise",
  });
  const user = await db.users.find(customerId);
  expect(user.role).toBe("customer");
  expect(user.tier).not.toBe("enterprise");
});
```

### 6. Idempotency

Double-submit everything:

```typescript
test("POST meal plan twice with same idempotency key = one row", async () => {
  const body = validMealPlan();
  const headers = { "Idempotency-Key": "abc-123" };
  const r1 = await api.post("/api/meal-plans", body, { headers });
  const r2 = await api.post("/api/meal-plans", body, { headers });
  expect(r1.body.id).toBe(r2.body.id);
  const count = await db.mealPlans.count({ name: body.name });
  expect(count).toBe(1);
});
```

### 7. Malformed / boundary inputs

For every schema:

- Missing required field → 400 + schema error (not 500)
- Wrong type (string where number) → 400
- Boundary values (0, -1, MAX_INT, empty string, 10MB string)
- Unicode (emoji, RTL, zero-width)
- NULL bytes (`\x00`)

### 8. Auth bypass

- Expired JWT → 401
- JWT with alg=none → 401
- JWT signed with wrong key → 401
- Missing token where required → 401
- Token for deleted user → 401
- Token for deactivated user → 403

### 9. Rate limit / DoS guards

- 100 rapid requests → expect 429 after threshold
- Large body (>1 MB) → 413
- Slowloris (partial body) → timeout, not hang

## The `AttackerActor`

```typescript
class AttackerActor {
  constructor(private api: ApiClient) {}
  async tryIdor(
    role: Role,
    endpoint: Endpoint,
    otherOwnerId: string,
  ): Promise<Response>;
  async tryXss(field: string, payload: string): Promise<Response>;
  async trySqlWildcard(endpoint: string, param: string): Promise<Response>;
  async tryMassAssignment(
    endpoint: string,
    body: object,
    forbiddenField: string,
  ): Promise<Response>;
  async tryDoubleSubmit(
    endpoint: string,
    body: object,
  ): Promise<[Response, Response]>;
  async tryExpiredToken(endpoint: string): Promise<Response>;
  async tryRoleEscalation(from: Role, to: Role): Promise<Response>;
}
```

## Done when

- Every endpoint has a permission-matrix row (4 roles × 1 endpoint = 4 tests)
- Every user-writable string has an XSS test
- Every search/filter param has a wildcard test
- Every POST has an idempotency test
- Every PATCH has a mass-assignment test
- Zero regressions from past security incidents (check `buglog.json`)
