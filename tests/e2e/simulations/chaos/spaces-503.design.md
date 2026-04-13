# CHAOS-03: DigitalOcean Spaces Returns 503

**Suite:** chaos  
**Target:** `*.digitaloceanspaces.com` (S3-compatible PUT)  
**Failure mode:** HTTP 503 on PUT (upload)

---

## Design Notes

When Spaces returns 503 during image upload, the server must:

1. Retry the upload (at least once).
2. If retries exhausted: mark the recipe item as "failed" — do NOT insert with null imageUrl.
3. Clean up any partial state.
4. Bulk gen marks that recipe failed; continues with remaining items.

---

## MockAgent Setup

```typescript
import { MockAgent, setGlobalDispatcher } from "undici";

function setupSpaces503() {
  const agent = new MockAgent();
  agent.disableNetConnect();
  setGlobalDispatcher(agent);

  // Allow OpenAI (chat + images) to succeed
  const openaiPool = agent.get("https://api.openai.com");
  openaiPool
    .intercept({ path: /\/v1\/chat\/completions/, method: "POST" })
    .reply(
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

  openaiPool
    .intercept({ path: /\/v1\/images\/generations/, method: "POST" })
    .reply(
      200,
      JSON.stringify({
        data: [
          {
            url: "https://oaidalleapiprodscus.blob.core.windows.net/private/test.png",
          },
        ],
      }),
      { headers: { "content-type": "application/json" } },
    );

  // Block all Spaces buckets
  // S3-compatible: match PUT to any .digitaloceanspaces.com host
  const spacesPool = agent.get(/\.digitaloceanspaces\.com$/);
  spacesPool
    .intercept({ path: /.*/, method: "PUT" })
    .reply(503, "Service Unavailable", {
      headers: { "content-type": "text/plain" },
    })
    .times(10); // fail all retries

  return agent;
}
```

---

## Tests

### CH-03-A: Spaces 503 → no half-uploaded image, no orphan recipe

```typescript
test("Spaces 503 → recipe marked failed, no null-imageUrl row inserted", async () => {
  const BASE = process.env.BASE_URL ?? "http://localhost:4000";
  const agent = setupSpaces503();

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

    await new Promise((r) => setTimeout(r, 30_000));

    // Recipe count must not have grown (no orphan)
    const afterCount = await getRecipeCount(BASE);
    expect(afterCount).toBe(beforeCount);

    // Batch status = failed (not stuck in "processing")
    if ([200, 201, 202].includes(genRes.status)) {
      const { batchId } = (await genRes.json()) as { batchId: string };
      const prog = await fetch(
        `${BASE}/api/admin/generate/progress/${batchId}`,
        {
          headers: { Authorization: `Bearer ${process.env.ADMIN_TEST_TOKEN}` },
        },
      );
      const { status, error } = (await prog.json()) as {
        status: string;
        error?: string;
      };
      expect(["error", "failed"]).toContain(status);
      expect(error).toMatch(/spaces|upload|storage|s3/i);
    }
  } finally {
    await agent.close();
  }
});
```

### CH-03-B: Spaces 503 → bulk gen continues to next item (resilience)

```typescript
test("Spaces 503 on one recipe does not crash the entire batch", async () => {
  // Run count=2: first item fails on Spaces, second succeeds (agent allows second PUT)
  // Assert: batch status = "partial", at least 0 recipes inserted (not a total crash)
  // ...
});
```

---

## Expected Behaviors

| Scenario                | Expected                                   |
| ----------------------- | ------------------------------------------ |
| Spaces PUT 503          | Upload retried (≥1 retry)                  |
| After retries exhausted | Recipe item marked "failed"                |
| Recipe row              | NOT inserted with null imageUrl            |
| Batch continues         | Next items in batch still attempted        |
| Admin error             | Contains "upload" or "Spaces" — actionable |

---

## To Activate

```bash
mkdir -p test/integration/chaos
# Write test/integration/chaos/spaces-503.test.ts with the code above
npx vitest run test/integration/chaos/spaces-503.test.ts --timeout 120000
```
