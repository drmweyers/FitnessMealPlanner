/**
 * FORGE QA Warfare v2 — Regression: R004
 * @cover { suite: "regression", role: "trainer", endpoint: "/api/recipes", assertionType: "db-row" }
 *
 * Bug: Image orphan prevention — every recipe must have a DO Spaces imageUrl.
 *      Before the fix, bulk generation inserted recipe rows with null imageUrl
 *      when DALL-E succeeded but Spaces upload failed.
 *
 * Regression: Sample first 50 recipes from /api/recipes.
 *             Assert every row has imageUrl matching /digitaloceanspaces/.
 *
 * NON-DESTRUCTIVE: read-only.
 */

import { test, expect } from "@playwright/test";
import { TrainerActor } from "../actors/index.js";
import { BASE_URL } from "../../helpers/constants.js";

test.describe("R004 — No orphan recipes (all have DO Spaces imageUrl)", () => {
  let trainer: TrainerActor;

  test.beforeAll(async () => {
    trainer = await TrainerActor.login(undefined, BASE_URL);
  });

  test("first 50 recipes all have digitaloceanspaces.com imageUrl", async () => {
    const res = await trainer.listRecipes({ limit: "50", page: "1" });

    const body = res as Record<string, unknown>;
    const recipes = Array.isArray(body)
      ? (body as Array<Record<string, unknown>>)
      : ((body?.recipes as Array<Record<string, unknown>>) ??
        (body?.data as Array<Record<string, unknown>>) ??
        []);

    if (recipes.length === 0) {
      test.skip(true, "No recipes found — seed the DB first.");
      return;
    }

    const orphans = recipes.filter((r) => {
      const imageUrl = r.imageUrl as string | null | undefined;
      return !imageUrl || !imageUrl.includes("digitaloceanspaces.com");
    });

    const orphanIds = orphans.map((r) => r.id).join(", ");

    expect(
      orphans.length,
      `Found ${orphans.length} orphan recipe(s) with missing or non-Spaces imageUrl. ` +
        `IDs: [${orphanIds}]. ` +
        "R004 regression: orphan-prevention fix not working — recipes inserted without DO Spaces URL.",
    ).toBe(0);
  });

  test("second page of recipes (page 2) also has no orphans", async () => {
    const res = await trainer.listRecipes({ limit: "50", page: "2" });

    const body = res as Record<string, unknown>;
    const recipes = Array.isArray(body)
      ? (body as Array<Record<string, unknown>>)
      : ((body?.recipes as Array<Record<string, unknown>>) ??
        (body?.data as Array<Record<string, unknown>>) ??
        []);

    if (recipes.length === 0) {
      // Fewer than 51 recipes — page 2 is empty, test trivially passes
      return;
    }

    const orphans = recipes.filter((r) => {
      const imageUrl = r.imageUrl as string | null | undefined;
      return !imageUrl || !imageUrl.includes("digitaloceanspaces.com");
    });

    expect(
      orphans.length,
      `Found ${orphans.length} orphan recipe(s) on page 2. R004 regression still active.`,
    ).toBe(0);
  });
});
