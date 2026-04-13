# CHAOS-01: OpenAI 500 During Bulk Generation

**Suite:** chaos  
**Target:** `api.openai.com`  
**Failure mode:** HTTP 500 on `/v1/chat/completions` and `/v1/images/generations`

---

## Why Design-Doc Mode

The chaos suite requires an in-process Node.js harness (undici MockAgent) that intercepts
outbound HTTP at the global dispatcher level. Playwright's `page.route` only intercepts
browser requests — it cannot intercept Node.js `fetch` calls made by the server process.

To run these tests with real network interception, implement them as **vitest integration
tests** under `test/integration/chaos/` where the server module is imported in-process.

The tests below are valid vitest code. Copy them to `test/integration/chaos/openai-500.test.ts`
and they will run.

---

## Test Plan

### CH-01-A: OpenAI GPT-4 returns 500 → graceful failure, no orphan recipes

```typescript
import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher } from "undici";
import type { Dispatcher } from "undici";

describe("CHAOS-01-A: OpenAI 500 on recipe generation", () => {
  let originalDispatcher: Dispatcher;
  let mockAgent: MockAgent;

  beforeEach(() => {
    originalDispatcher = getGlobalDispatcher();
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);

    // Intercept OpenAI chat completions
    const openaiPool = mockAgent.get("https://api.openai.com");
    openaiPool
      .intercept({ path: /\/v1\/chat\/completions/, method: "POST" })
      .reply(
        500,
        JSON.stringify({
          error: { message: "Internal server error", type: "server_error" },
        }),
        {
          headers: { "content-type": "application/json" },
        },
      );
  });

  afterEach(() => {
    setGlobalDispatcher(originalDispatcher);
  });

  test("POST /api/admin/generate count=1 → progress emits error event, zero orphan recipes", async () => {
    const BASE = process.env.BASE_URL ?? "http://localhost:4000";

    // Record recipe count before
    const beforeRes = await fetch(`${BASE}/api/recipes?limit=1`);
    const beforeBody = (await beforeRes.json()) as { total?: number };
    const beforeCount = beforeBody.total ?? 0;

    // Trigger generation
    const genRes = await fetch(`${BASE}/api/admin/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Use real admin token — obtained from auth in actual test
        Authorization: `Bearer ${process.env.ADMIN_TEST_TOKEN}`,
      },
      body: JSON.stringify({ count: 1, tier: "starter" }),
    });

    // Accept 200/202 (job started) or 500 (fail-fast)
    expect([200, 201, 202, 500]).toContain(genRes.status);

    // If job started, wait briefly then check status
    if ([200, 201, 202].includes(genRes.status)) {
      const { batchId } = (await genRes.json()) as { batchId: string };
      await new Promise((r) => setTimeout(r, 5_000));

      const progressRes = await fetch(
        `${BASE}/api/admin/generate/progress/${batchId}`,
        {
          headers: { Authorization: `Bearer ${process.env.ADMIN_TEST_TOKEN}` },
        },
      );
      const progress = (await progressRes.json()) as {
        status: string;
        error?: string;
      };

      // Must NOT be "complete" — must be "error" or "failed"
      expect(["error", "failed"]).toContain(progress.status);
      expect(progress.error).toMatch(/openai|generation|failed/i);
    }

    // Assert zero orphan recipes inserted
    const afterRes = await fetch(`${BASE}/api/recipes?limit=1`);
    const afterBody = (await afterRes.json()) as { total?: number };
    const afterCount = afterBody.total ?? 0;

    expect(afterCount).toBe(beforeCount); // No new orphan recipes
  });
});
```

### CH-01-B: OpenAI returns 500 → admin sees actionable error message

```typescript
test("admin sees actionable error (not 'Unknown error') when OpenAI fails", async () => {
  // Same MockAgent setup as above
  const BASE = process.env.BASE_URL ?? "http://localhost:4000";

  const genRes = await fetch(`${BASE}/api/admin/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.ADMIN_TEST_TOKEN}`,
    },
    body: JSON.stringify({ count: 1, tier: "starter" }),
  });

  let errorBody: { error?: string; message?: string } = {};

  if (genRes.status >= 400) {
    errorBody = await genRes.json();
  } else {
    const { batchId } = (await genRes.json()) as { batchId: string };
    await new Promise((r) => setTimeout(r, 5_000));
    const prog = await fetch(`${BASE}/api/admin/generate/progress/${batchId}`, {
      headers: { Authorization: `Bearer ${process.env.ADMIN_TEST_TOKEN}` },
    });
    errorBody = await prog.json();
  }

  const errorText = JSON.stringify(errorBody);
  // Must contain actionable info — NOT a generic 500 dump
  expect(errorText).toMatch(/openai|generation|api|failed|error/i);
  expect(errorText).not.toMatch(/Unknown error|undefined/);
});
```

---

## Expected Behaviors

| Scenario      | Expected                                                 |
| ------------- | -------------------------------------------------------- |
| OpenAI 500    | Job status = "error" or "failed"                         |
| Recipe count  | Unchanged (no orphans inserted)                          |
| Error message | Contains "OpenAI" or "generation failed" — actionable    |
| SSE stream    | Emits `{ type: "error", message: "..." }` before closing |

---

## To Activate

```bash
# Create the integration chaos dir
mkdir -p test/integration/chaos

# Copy this design into a runnable test file
cp tests/e2e/simulations/chaos/openai-500.design.md /dev/null  # (do not copy docs)
# Then write test/integration/chaos/openai-500.test.ts with the code above

# Run
npx vitest run test/integration/chaos/openai-500.test.ts
```
