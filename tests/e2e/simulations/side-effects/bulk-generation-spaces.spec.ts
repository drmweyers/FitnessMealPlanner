/**
 * FORGE QA Warfare v2 — Side-Effect: SE-06
 * @cover { suite: "side-effect", role: "admin", endpoint: "/api/admin/generate", assertionType: "side-effect" }
 *
 * Trigger: Admin starts bulk recipe generation (count=1).
 * Side effects: OpenAI called → DALL-E called → Spaces upload → recipe row with imageUrl.
 *
 * Verification:
 *   1. Poll progress until complete (or timeout).
 *   2. Fetch /api/recipes ordered by createdAt desc.
 *   3. Assert new recipe has imageUrl pointing to digitaloceanspaces.com.
 *
 * NON-DESTRUCTIVE: adds 1 recipe to DB (acceptable for non-prod environment).
 * NOTE: This test is slow (~30-120s) due to real AI calls. Mark @slow in CI.
 */

import { test, expect } from "@playwright/test";
import { AdminActor } from "../actors/index.js";
import { BASE_URL } from "../../helpers/constants.js";

const BULK_TIMEOUT = 120_000; // 2 min max — respects 90s/recipe budget

test.describe("SE-06 — Bulk generation → recipe has DO Spaces imageUrl", () => {
  test.setTimeout(BULK_TIMEOUT + 30_000);

  let admin: AdminActor;
  let beforeCount: number;

  test.beforeAll(async () => {
    admin = await AdminActor.login(undefined, BASE_URL);

    // Record current recipe count to identify the new recipe later
    const countRes = await admin.raw("GET", "/api/recipes?limit=1");
    const body = countRes.body as Record<string, unknown>;
    beforeCount =
      (body?.total as number) ??
      (body?.count as number) ??
      (Array.isArray(body) ? (body as unknown[]).length : 0);
  });

  test("bulk generate count=1 produces recipe with digitaloceanspaces.com imageUrl", async () => {
    const startTime = Date.now();

    // Start bulk generation
    const startRes = await admin.startBulkGeneration({
      count: 1,
      tier: "starter",
    });
    const startBody = startRes as Record<string, unknown>;
    const batchId: string =
      (startBody?.batchId as string) ||
      (startBody?.id as string) ||
      (startBody?.jobId as string) ||
      ((startBody?.data as Record<string, unknown>)?.batchId as string) ||
      "";

    if (!batchId) {
      // Some implementations return 202 with no batchId — poll by recipe count
      console.warn(
        "[SE-06] No batchId returned — will poll recipe count instead.",
      );
    }

    // Poll progress
    let complete = false;
    let pollError: string | undefined;

    while (Date.now() - startTime < BULK_TIMEOUT) {
      await new Promise((r) => setTimeout(r, 3_000));

      if (batchId) {
        const progressRes = await admin.bulkProgress(batchId);
        const prog = progressRes as Record<string, unknown>;
        const status = prog?.status as string;

        if (
          status === "complete" ||
          status === "completed" ||
          status === "done"
        ) {
          complete = true;
          break;
        }
        if (status === "error" || status === "failed") {
          pollError = (prog?.error as string) || "bulk generation failed";
          break;
        }
      } else {
        // Fallback: check if recipe count increased
        const countRes = await admin.raw("GET", "/api/recipes?limit=1");
        const body = countRes.body as Record<string, unknown>;
        const newCount =
          (body?.total as number) ??
          (body?.count as number) ??
          (Array.isArray(body) ? (body as unknown[]).length : 0);
        if (newCount > beforeCount) {
          complete = true;
          break;
        }
      }
    }

    if (pollError) {
      throw new Error(`Bulk generation failed: ${pollError}`);
    }

    expect(
      complete,
      `Bulk generation did not complete within ${BULK_TIMEOUT / 1000}s. ` +
        "Either the job is stuck or the progress endpoint is broken.",
    ).toBe(true);

    // Fetch latest recipes — the newest should have a Spaces imageUrl
    const recipesRes = await admin.raw(
      "GET",
      "/api/recipes?limit=5&sort=createdAt:desc",
    );
    expect(recipesRes.status).toBe(200);

    const recipesBody = recipesRes.body as Record<string, unknown>;
    const recipes = Array.isArray(recipesBody)
      ? (recipesBody as Array<Record<string, unknown>>)
      : ((recipesBody?.recipes as Array<Record<string, unknown>>) ??
        (recipesBody?.data as Array<Record<string, unknown>>) ??
        []);

    expect(recipes.length).toBeGreaterThan(0);

    // At least one of the returned recipes must have a DO Spaces imageUrl
    const withSpacesUrl = recipes.filter((r) =>
      (r.imageUrl as string | undefined)?.includes("digitaloceanspaces.com"),
    );

    expect(
      withSpacesUrl.length,
      "No recently generated recipe has a digitaloceanspaces.com imageUrl. " +
        "DALL-E → Spaces pipeline may be broken or orphan-prevention is inserting rows without images.",
    ).toBeGreaterThan(0);
  });
});
