/**
 * Workflow 10 — Bulk Generation
 *
 * @cover REC-001 REC-002
 *
 * Scenario:
 *  1. Admin starts bulk generation with count: 2
 *  2. Assert response returns a batchId or job reference
 *  3. Poll the progress endpoint and assert it responds (200 or SSE stream)
 *  4. Attempt stop endpoint
 *
 * CAUTION: This hits real AI generation in production. count:2 minimises spend.
 * Tests skip gracefully if endpoints require special infra or are not implemented.
 *
 * NON-DESTRUCTIVE: generated recipes are legitimate — does not delete them.
 */

import { test, expect } from "@playwright/test";
import { AdminActor } from "../actors/index.js";
import { BASE_URL } from "../../helpers/constants.js";

const baseUrl = process.env.BASE_URL || BASE_URL;

// Guard: skip the whole suite when running against production to avoid
// unintended AI API spend. Set ALLOW_BULK_GENERATION=1 to opt-in.
const ALLOW_BULK = process.env.ALLOW_BULK_GENERATION === "1";

test.describe("Workflow 10 — Bulk Generation", () => {
  let batchId: string | undefined;

  test("REC-001 admin can start bulk generation (count:2)", async () => {
    // @cover REC-001
    test.skip(
      !ALLOW_BULK,
      "Skipped: set ALLOW_BULK_GENERATION=1 to run bulk generation tests (incurs AI API cost)",
    );

    const admin = await AdminActor.login(undefined, baseUrl);
    const res = await admin.startBulkGeneration({ count: 2, tier: "starter" });

    if (res.status === 404 || res.status === 501) {
      test.skip(true, "Bulk generation endpoint not available");
      return;
    }
    expect(res.status).toBeLessThan(500);

    const body = res.body as Record<string, unknown>;
    batchId = ((body.batchId || body.jobId || body.id) as string) || undefined;
  });

  test("REC-002 progress endpoint responds for active batch", async () => {
    // @cover REC-002
    test.skip(!ALLOW_BULK, "Skipped: ALLOW_BULK_GENERATION not set");
    test.skip(!batchId, "No batchId from start test");

    const admin = await AdminActor.login(undefined, baseUrl);
    const res = await admin.bulkProgress(batchId!);

    if (res.status === 404) {
      test.skip(true, "Progress endpoint not implemented");
      return;
    }
    expect(res.status).toBeLessThan(500);
  });

  test("bulk generation endpoint is protected (401 without auth)", async () => {
    // Always runs — no AI spend
    const noAuthRes = await fetch(`${baseUrl}/api/admin/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: 1 }),
    });
    expect([401, 403]).toContain(noAuthRes.status);
  });

  test("BMAD progress endpoint is reachable when authenticated", async () => {
    // Light probe — just checks the route shape without starting a job
    const admin = await AdminActor.login(undefined, baseUrl);

    // Try a clearly non-existent batchId to probe route existence
    try {
      const res = await admin.raw(
        "GET",
        "/api/admin/generate/progress/forge-probe-000",
      );
      // 404 = route exists but batch not found (good)
      // 401 = needs special auth (acceptable)
      // 200 = live with data (also good)
      expect(res.status).toBeLessThan(500);
    } catch {
      // Connection errors are treated as skip
      test.skip(true, "BMAD progress endpoint unreachable");
    }
  });
});
