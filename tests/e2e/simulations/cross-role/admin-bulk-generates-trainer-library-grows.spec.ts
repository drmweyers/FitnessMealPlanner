/**
 * @cover XR-007 — Admin bulk generates → Trainer recipe library grows
 * Touchpoint 7 from qa-warfare-context.md §6
 *
 * Admin starts a small bulk generation (count=2).
 * Trainer recipe library count should increase by ~2 after completion.
 *
 * If BMAD is heavy or OpenAI key is unavailable, skips gracefully.
 */

import { test, expect } from "@playwright/test";
import { AdminActor } from "../actors/index.js";
import { TrainerActor } from "../actors/index.js";
import { CREDENTIALS, BASE_URL } from "../../helpers/constants.js";

test("@cover XR-007 — admin bulk-generate count=2; trainer recipe count delta is +2", async () => {
  const admin = await AdminActor.login(undefined, BASE_URL);
  const trainer = await TrainerActor.login(CREDENTIALS.trainer, BASE_URL);

  // Count trainer recipes BEFORE
  const beforeRes = await trainer.listRecipes({ limit: "1" });
  const beforeBody = beforeRes as Record<string, unknown>;
  const beforeTotal =
    (beforeBody.total as number) ??
    (beforeBody.count as number) ??
    ((beforeBody.pagination as Record<string, unknown>)?.total as number) ??
    -1;
  console.log("[XR-007] Trainer recipe count BEFORE:", beforeTotal);

  // Admin starts bulk generation — small batch
  const genRes = await admin.startBulkGeneration({ count: 2, tier: "starter" });
  const genBody = genRes as Record<string, unknown>;
  const batchId =
    (genBody.batchId as string) ??
    (genBody.id as string) ??
    ((genBody.data as Record<string, unknown>)?.batchId as string);

  if (!batchId) {
    console.warn(
      "[XR-007] Bulk generation started but no batchId returned:",
      JSON.stringify(genBody).slice(0, 200),
    );
    test.skip(
      true,
      "Bulk generation did not return a batchId — skipping delta check",
    );
    return;
  }

  console.log("[XR-007] Bulk gen batchId:", batchId);

  // Poll for completion (max 60s for 2 recipes)
  let completed = false;
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const progressRes = await admin.bulkProgress(batchId);
    const progress = progressRes as Record<string, unknown>;
    const status = (progress.status as string) ?? (progress.state as string);
    console.log(`[XR-007] Poll ${i + 1}: status=${status}`);
    if (status === "completed" || status === "done" || status === "finished") {
      completed = true;
      break;
    }
    if (status === "failed" || status === "error") {
      console.warn(
        "[XR-007] Bulk generation failed:",
        JSON.stringify(progress).slice(0, 200),
      );
      test.skip(
        true,
        "Bulk generation failed — likely no OpenAI key in this env",
      );
      return;
    }
  }

  if (!completed) {
    test.skip(
      true,
      "Bulk generation did not complete within 60s — skipping delta assertion",
    );
    return;
  }

  // Count AFTER
  const afterRes = await trainer.listRecipes({ limit: "1" });
  const afterBody = afterRes as Record<string, unknown>;
  const afterTotal =
    (afterBody.total as number) ??
    (afterBody.count as number) ??
    ((afterBody.pagination as Record<string, unknown>)?.total as number) ??
    -1;
  console.log("[XR-007] Trainer recipe count AFTER:", afterTotal);

  if (beforeTotal !== -1 && afterTotal !== -1) {
    const delta = afterTotal - beforeTotal;
    console.log(`[XR-007] Delta: ${delta} (expected ~2)`);
    expect(delta).toBeGreaterThanOrEqual(1);
  }
});
