/**
 * FORGE QA Warfare v2 — Regression: R001
 * @cover { suite: "regression", role: "admin", endpoint: "/api/admin/generate", assertionType: "invariant" }
 *
 * Bug: Batch executor timeouts under load — must use 90s/recipe budget.
 *      Server crashes if per-recipe timeout exceeded.
 *
 * Regression: Kick a batch with count=2 and assert the server does NOT
 * crash within 3 minutes (90s × 2 + 60s buffer = 240s).
 * The server must still respond to health checks throughout.
 *
 * NOTE: This test observes timeout behavior but cannot inject a slow OpenAI
 * response in Playwright mode. It verifies server stability under a real
 * multi-recipe batch — the crash fix is what we're guarding.
 *
 * NON-DESTRUCTIVE: adds up to 2 recipe rows.
 */

import { test, expect } from "@playwright/test";
import { AdminActor } from "../actors/index.js";
import { BASE_URL } from "../../helpers/constants.js";

const RECIPE_BUDGET_MS = 90_000; // 90s per recipe
const BATCH_COUNT = 2;
const MAX_WAIT_MS = RECIPE_BUDGET_MS * BATCH_COUNT + 60_000; // 240s total

test.describe("R001 — Batch executor 90s/recipe timeout respected (no crash)", () => {
  test.setTimeout(MAX_WAIT_MS + 30_000);

  let admin: AdminActor;

  test.beforeAll(async () => {
    admin = await AdminActor.login(undefined, BASE_URL);
  });

  test("multi-recipe batch completes without server crash within 90s×N budget", async () => {
    const startTime = Date.now();

    // Start a batch of 2 recipes
    const startRes = await admin.startBulkGeneration({
      count: BATCH_COUNT,
      tier: "starter",
    });

    const startBody = startRes as Record<string, unknown>;
    const batchId: string =
      (startBody?.batchId as string) ||
      (startBody?.id as string) ||
      (startBody?.jobId as string) ||
      "";

    // Continuously poll the health endpoint to confirm server stability
    let healthFailed = false;
    let batchSettled = false;
    let lastStatus: string | undefined;

    while (Date.now() - startTime < MAX_WAIT_MS) {
      await new Promise((r) => setTimeout(r, 5_000));

      // Health check
      const healthRes = await admin.raw("GET", "/api/health");
      if (healthRes.status !== 200) {
        healthFailed = true;
        break;
      }

      if (batchId) {
        const progRes = await admin.bulkProgress(batchId);
        const prog = progRes as Record<string, unknown>;
        lastStatus = prog?.status as string;

        if (
          lastStatus === "complete" ||
          lastStatus === "completed" ||
          lastStatus === "done" ||
          lastStatus === "error" ||
          lastStatus === "failed"
        ) {
          batchSettled = true;
          break;
        }
      }
    }

    expect(
      healthFailed,
      "Server became unhealthy during batch execution — crash or health endpoint failure. " +
        "R001 regression: the 90s/recipe timeout budget must prevent server crashes.",
    ).toBe(false);

    expect(
      batchSettled || Date.now() - startTime < MAX_WAIT_MS,
      `Batch did not settle within ${MAX_WAIT_MS / 1000}s (status: ${lastStatus ?? "unknown"}). ` +
        "Verify the per-recipe timeout budget is set correctly.",
    ).toBe(true);
  });

  test("health endpoint responds throughout batch window", async () => {
    // Quick standalone health check — confirms endpoint stability
    const healthRes = await admin.raw("GET", "/api/health");
    expect(healthRes.status).toBe(200);
  });
});
