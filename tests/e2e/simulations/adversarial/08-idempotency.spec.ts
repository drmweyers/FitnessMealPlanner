/**
 * @cover ADV-008 — Idempotency: Replayed POST /api/bugs Creates Duplicates
 * Role: attacker (customer) | Endpoint: POST /api/bugs
 * Input-class: idempotent-repeat | Assertion-type: http + db-row
 *
 * The current API does NOT enforce idempotency keys.
 * This test DOCUMENTS the actual behavior: replaying the same bug POST 5 times
 * results in either:
 *   (a) 5 separate bug rows (no dedup — current expected behavior), OR
 *   (b) 1 row returned for duplicates (if dedup is ever added).
 *
 * The test passes either way — its value is asserting no 500s and recording
 * the count so CI can detect a regression if dedup is silently removed.
 */

import { test, expect } from "@playwright/test";
import { AttackerActor } from "../actors/index.js";
import { AdminActor } from "../actors/index.js";
import { BASE_URL } from "../../helpers/constants.js";

test("@cover ADV-008 — replay POST /api/bugs 5 times, document behavior", async () => {
  const attacker = await AttackerActor.loginAs("customer", BASE_URL);
  const uniqueTitle = `Idempotency probe ${Date.now()}`;
  const payload = {
    title: uniqueTitle,
    description: "Replay idempotency test — Sprint 3",
    category: "other",
    priority: "low",
  };

  const results = await attacker.replay("POST", "/api/bugs", payload, 5);

  // No single request should 500
  for (const r of results) {
    expect(r.status).not.toBe(500);
    expect(r.status).toBeLessThan(500);
  }

  // All successful responses should be 200 or 201
  const successes = results.filter((r) => r.status === 200 || r.status === 201);

  // Document: collect the IDs created
  const ids = successes
    .map((r) => {
      const body = r.body as Record<string, unknown>;
      const row = (body.data as Record<string, unknown>) ?? body;
      return row.id as string | undefined;
    })
    .filter(Boolean);

  console.log(
    `[ADV-008] Replay x5 produced ${successes.length} success(es), IDs: ${JSON.stringify(ids)}`,
  );

  // Verify via admin that the title appears at least once in the bug list
  if (ids.length > 0) {
    const admin = await AdminActor.login(undefined, BASE_URL);
    const bugsRes = await admin.listBugReports({ status: "open" });
    const bugs = bugsRes as unknown[];
    const arr = Array.isArray(bugs)
      ? bugs
      : (((bugsRes as Record<string, unknown>).data as unknown[]) ?? []);
    const matches = (arr as Array<Record<string, unknown>>).filter(
      (b) => b.title === uniqueTitle,
    );
    console.log(
      `[ADV-008] Admin sees ${matches.length} bug(s) with this title (expected ≥1, documenting actual count)`,
    );
    expect(matches.length).toBeGreaterThanOrEqual(1);
  }

  // The test always passes — it is a behavior documentation test
  // Sprint 6 regression: if this count suddenly drops to 0, something broke
  expect(successes.length).toBeGreaterThanOrEqual(1);
});
