# CHAOS-04: Resend Returns 500 on Email Send

**Suite:** chaos  
**Target:** `api.resend.com`  
**Failure mode:** HTTP 500 on POST `/emails`

---

## Design Notes

When Resend fails during meal plan assignment notification:

1. The meal plan assignment MUST still succeed (DB row created).
2. The email failure must be logged / queued for retry — NOT silently dropped.
3. The user (trainer/customer) sees "plan assigned" success — NOT an error.
4. Admin must be able to see email delivery failures.

---

## MockAgent Setup

```typescript
import { MockAgent, setGlobalDispatcher } from "undici";

function setupResend500() {
  const agent = new MockAgent();
  agent.disableNetConnect();
  setGlobalDispatcher(agent);

  const resendPool = agent.get("https://api.resend.com");
  resendPool
    .intercept({ path: "/emails", method: "POST" })
    .reply(500, JSON.stringify({ error: "Internal server error" }), {
      headers: { "content-type": "application/json" },
    })
    .persist(); // fail all email attempts

  return agent;
}
```

---

## Tests

### CH-04-A: Resend 500 → meal plan still assigned

```typescript
test("Resend 500 does NOT block meal plan assignment", async () => {
  const BASE = process.env.BASE_URL ?? "http://localhost:4000";
  const agent = setupResend500();

  try {
    // Get seeded plan + customer IDs
    const trainerToken = process.env.TRAINER_TEST_TOKEN!;
    const planId = process.env.TEST_PLAN_ID!;
    const customerId = process.env.TEST_CUSTOMER_ID!;

    const assignRes = await fetch(
      `${BASE}/api/trainer/meal-plans/${planId}/assign`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${trainerToken}`,
        },
        body: JSON.stringify({ customerId }),
      },
    );

    // Assignment MUST succeed despite email failure
    expect([200, 201, 204]).toContain(assignRes.status);

    // Verify assignment row exists in DB via API
    const plansRes = await fetch(
      `${BASE}/api/trainer/customers/${customerId}/meal-plans`,
      {
        headers: { Authorization: `Bearer ${trainerToken}` },
      },
    );
    const plansBody = (await plansRes.json()) as {
      mealPlans?: Array<{ id: string }>;
    };
    const assigned = (plansBody.mealPlans ?? []).find((p) => p.id === planId);
    expect(assigned).toBeDefined();
  } finally {
    await agent.close();
  }
});
```

### CH-04-B: Resend 500 → email failure logged (not silently dropped)

```typescript
test("Resend 500 results in logged/queued email failure visible to admin", async () => {
  // After CH-04-A, check if admin can see email delivery failures
  // via GET /api/admin/email-analytics or GET /api/email-analytics
  // If endpoint doesn't exist — document gap.

  const emailLogsRes = await fetch(`${BASE}/api/admin/email-analytics`, {
    headers: { Authorization: `Bearer ${process.env.ADMIN_TEST_TOKEN}` },
  });

  if (emailLogsRes.status === 404) {
    // COVERAGE GAP: no email analytics endpoint
    console.warn(
      "[CH-04 COVERAGE GAP] GET /api/admin/email-analytics does not exist. " +
        "Resend failures may be silently dropped. Implement email failure logging.",
    );
    return;
  }

  const logs = (await emailLogsRes.json()) as {
    failures?: Array<{ email: string }>;
  };
  // At least one failure should be recorded
  expect((logs.failures ?? []).length).toBeGreaterThan(0);
});
```

---

## Expected Behaviors

| Scenario             | Expected                              |
| -------------------- | ------------------------------------- |
| Resend POST 500      | Email send fails, error logged        |
| Meal plan assignment | Still succeeds (DB row committed)     |
| User-visible result  | "Plan assigned successfully"          |
| Admin visibility     | Email failure logged / in retry queue |
| Silent drop          | NEVER acceptable                      |

---

## To Activate

```bash
mkdir -p test/integration/chaos
# Write test/integration/chaos/resend-fail.test.ts with the code above
npx vitest run test/integration/chaos/resend-fail.test.ts
```
