---
name: chaos-failure-injection
description: Inject failures in external dependencies (OpenAI, S3, Stripe, Mailgun, Hal, DB) and assert the app degrades gracefully. Use when a workflow crosses a network boundary. Trigger phrases - "chaos", "failure injection", "what if OpenAI fails", "resilience test".
---

# Chaos & Failure Injection

## Purpose

FMP depends on OpenAI, DALL-E, DigitalOcean Spaces, Mailgun, Stripe, and the Hal bridge. Each is a production outage waiting to happen. **Warfare v1 never tests what the app does when they fail.** This skill does.

## The 6 Failure Modes per Dependency

For each external service:

| Mode             | Simulation                              | Expected behavior                                                      |
| ---------------- | --------------------------------------- | ---------------------------------------------------------------------- |
| Timeout          | Delay response beyond client timeout    | User sees "try again" message, job marked `failed`, no orphaned state  |
| HTTP 429         | Return 429 with Retry-After             | App respects backoff, retries, eventually succeeds or fails cleanly    |
| HTTP 500         | Return 500                              | User sees error, job marked `failed`, error logged with correlation id |
| Partial response | Return 200 but truncated/malformed body | App validates schema, rejects, no corrupt data written                 |
| Slow response    | 10s delay on 30s budget                 | UI shows loading, eventually resolves                                  |
| Hard disconnect  | ECONNRESET mid-stream                   | App reconnects OR fails cleanly — no hang                              |

## The Interceptor Harness

Use `undici` MockAgent or Playwright's `page.route` to rewrite responses:

```typescript
import { MockAgent, setGlobalDispatcher } from "undici";

export function chaos(target: string) {
  const agent = new MockAgent();
  setGlobalDispatcher(agent);
  const pool = agent.get(target);
  return {
    timeout: (path: string) => pool.intercept({ path }).reply(408, ""),
    rateLimit: (path: string) =>
      pool
        .intercept({ path })
        .reply(429, "", { headers: { "retry-after": "1" } }),
    serverError: (path: string) =>
      pool.intercept({ path }).reply(500, "kaboom"),
    partial: (path: string, body: any) =>
      pool.intercept({ path }).reply(200, JSON.stringify(body).slice(0, 10)),
    slow: (path: string, ms: number) =>
      pool.intercept({ path }).reply(200, "{}").delay(ms),
    disconnect: (path: string) =>
      pool.intercept({ path }).replyWithError(new Error("ECONNRESET")),
  };
}
```

## The 6 FMP Chaos Suites

### 1. OpenAI GPT failures (meal plan generation)

```typescript
test("OpenAI 429 during plan generation → retry → success", async () => {
  chaos("https://api.openai.com").rateLimit("/v1/chat/completions");
  // ...only rate-limit first call; second succeeds
  const plan = await trainer.generatePlan({ calories: 2000 });
  expect(plan.status).toBe("ready");
  expect(logs.warnings).toContainEqual(
    expect.objectContaining({ msg: /openai rate limit/i }),
  );
});

test("OpenAI 500 → user-visible error, no half-written plan", async () => {
  chaos("https://api.openai.com").serverError("/v1/chat/completions");
  const res = await trainer.generatePlan({ calories: 2000 });
  expect(res.status).toBe("failed");
  expect(
    await db.mealPlans.count({ status: "draft", trainerId: trainer.id }),
  ).toBe(0);
});
```

### 2. DALL-E failures (bulk recipe gen)

Assert no orphaned S3 objects, no orphaned DB rows, the bulk job reports partial success accurately.

### 3. S3 / Spaces failures (uploads)

- Upload fails after signed URL issued → DB row rolled back
- Upload succeeds but DB insert fails → background cleanup sweeps orphan within N minutes

### 4. Stripe webhook failures & replays

- Invalid signature → 400, event NOT processed
- Duplicate event (same id) → processed once (idempotency via event id)
- Out-of-order events (plan canceled → plan created) → reconciled or flagged

### 5. Mailgun failures

- 5xx on send → queued for retry, user not blocked
- Bounce webhook → user email marked `bounced`, future sends suppressed

### 6. DB failures

- Connection drop mid-transaction → transaction aborts cleanly
- Deadlock → one of two concurrent writers wins, other retries

## The orphan sweeper test

After each chaos test, assert no orphans:

```typescript
async function assertNoOrphans() {
  const danglingAssignments = await db.query(`
    SELECT a.* FROM meal_plan_assignments a
    LEFT JOIN meal_plans p ON a.plan_id = p.id
    WHERE p.id IS NULL`);
  expect(danglingAssignments).toHaveLength(0);

  const s3Objects = await s3.listObjects({ Prefix: "recipes/" });
  const dbRecipeImages = await db.recipes.pluck("imageUrl");
  const orphans = s3Objects.filter((o) => !dbRecipeImages.includes(o.url));
  expect(orphans).toHaveLength(0);
}
```

## Done when

- Every external dependency in FMP has ≥1 suite here
- Every chaos test asserts: (a) user-visible behavior, (b) DB consistency, (c) no orphans
- Orphan sweeper runs after every chaos suite
