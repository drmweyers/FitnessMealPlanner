# CHAOS-02: DALL-E Image Generation Timeout

**Suite:** chaos  
**Target:** `api.openai.com`  
**Failure mode:** Response delayed 30s (beyond server-side image timeout)

---

## Design Notes

DALL-E calls during bulk generation have a server-side timeout budget (typically 30-60s).
If DALL-E hangs, the server must:

1. Cancel/abort the request.
2. NOT insert a recipe row with a null imageUrl (orphan prevention).
3. Mark the batch item as failed.
4. Surface a clear timeout error to the admin.

---

## MockAgent Setup

```typescript
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher } from "undici";

function setupDalleTimeout(delayMs = 35_000) {
  const agent = new MockAgent();
  agent.disableNetConnect();
  setGlobalDispatcher(agent);

  const pool = agent.get("https://api.openai.com");

  // Let GPT-4 chat succeed (recipe concept)
  pool.intercept({ path: /\/v1\/chat\/completions/, method: "POST" }).reply(
    200,
    JSON.stringify({
      choices: [
        {
          message: {
            content: '{"name":"Test Recipe","ingredients":[],"steps":[]}',
          },
        },
      ],
    }),
    { headers: { "content-type": "application/json" } },
  );

  // Hang DALL-E for 35 seconds — beyond the 30s budget
  pool
    .intercept({ path: /\/v1\/images\/generations/, method: "POST" })
    .reply(200, "{}")
    .delay(delayMs);

  return agent;
}
```

---

## Tests

### CH-02-A: DALL-E timeout → no orphan recipe row

```typescript
test("DALL-E timeout does NOT insert orphan recipe row", async () => {
  const BASE = process.env.BASE_URL ?? "http://localhost:4000";
  const agent = setupDalleTimeout(35_000);

  try {
    const beforeCount = await getRecipeCount(BASE);

    const genRes = await fetch(`${BASE}/api/admin/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ADMIN_TEST_TOKEN}`,
      },
      body: JSON.stringify({ count: 1, tier: "starter" }),
    });

    // Wait for timeout to be hit (recipe budget = 90s; image timeout ~30s)
    await new Promise((r) => setTimeout(r, 40_000));

    // Assert zero orphan recipes
    const afterCount = await getRecipeCount(BASE);
    expect(afterCount).toBe(beforeCount);
  } finally {
    setGlobalDispatcher(getGlobalDispatcher()); // restore
    await agent.close();
  }
});
```

### CH-02-B: DALL-E timeout → admin sees "timeout" error, not generic 500

```typescript
test("DALL-E timeout surfaces actionable timeout error to admin", async () => {
  // ... setup agent as above
  // ... trigger generation
  // ... wait for job to settle
  // Assert error message contains "timeout" or "image" or "generation"
  expect(errorText).toMatch(/timeout|image|dall.e|generation/i);
});
```

---

## Expected Behaviors

| Scenario            | Expected                                           |
| ------------------- | -------------------------------------------------- |
| DALL-E hangs 35s    | Request aborted on server side                     |
| Recipe row          | Not inserted (no null imageUrl)                    |
| Batch item status   | "failed" with error = "image generation timed out" |
| Admin visible error | Contains "timeout" — actionable                    |

---

## To Activate

```bash
mkdir -p test/integration/chaos
# Write test/integration/chaos/dalle-timeout.test.ts with the code above
npx vitest run test/integration/chaos/dalle-timeout.test.ts --timeout 120000
```
