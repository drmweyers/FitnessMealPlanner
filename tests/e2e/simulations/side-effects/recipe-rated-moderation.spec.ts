/**
 * FORGE QA Warfare v2 — Side-Effect: SE-04
 * @cover { suite: "side-effect", role: "client", endpoint: "/api/ratings", assertionType: "side-effect" }
 *
 * Trigger: Customer rates a recipe with a low score or submits a flag.
 * Side effect: The flag appears in the admin moderation queue.
 *
 * SKIP if the moderation-queue endpoint does not exist (404).
 * NON-DESTRUCTIVE: rating a recipe is non-destructive; ratings can be updated/overwritten.
 */

import { test, expect } from "@playwright/test";
import { ClientActor, AdminActor } from "../actors/index.js";
import { BASE_URL } from "../../helpers/constants.js";

test.describe("SE-04 — Recipe rated/flagged → admin moderation queue updated", () => {
  let customer: ClientActor;
  let admin: AdminActor;
  let targetRecipeId: string;

  test.beforeAll(async () => {
    customer = await ClientActor.login(undefined, BASE_URL);
    admin = await AdminActor.login(undefined, BASE_URL);

    // Find a recipe to rate
    const recipesRes = await customer.raw("GET", "/api/recipes?limit=5");
    expect([200]).toContain(recipesRes.status);

    const recipes = Array.isArray(recipesRes.body)
      ? (recipesRes.body as Array<Record<string, unknown>>)
      : (((recipesRes.body as Record<string, unknown>)?.recipes ??
          (recipesRes.body as Record<string, unknown>)?.data ??
          []) as Array<Record<string, unknown>>);

    if (recipes.length === 0) {
      targetRecipeId = "";
    } else {
      targetRecipeId = recipes[0].id as string;
    }
  });

  test("flagging a recipe creates a moderation queue entry", async () => {
    if (!targetRecipeId) {
      test.skip(true, "No recipes found to rate — seed the DB first.");
      return;
    }

    // Submit a low rating with a flag / report
    // Try /api/ratings first; fall back to /api/recipes/:id/rate
    let rateRes = await customer.raw("POST", "/api/ratings", {
      recipeId: targetRecipeId,
      score: 1,
      flag: true,
      flagReason: "Automated SE-04 warfare test flag",
    });

    if (rateRes.status === 404) {
      rateRes = await customer.raw(
        "POST",
        `/api/recipes/${targetRecipeId}/rate`,
        {
          score: 1,
          flag: true,
          flagReason: "Automated SE-04 warfare test flag",
        },
      );
    }

    // If neither endpoint exists, skip with documented gap
    if (rateRes.status === 404) {
      test.skip(
        true,
        "COVERAGE GAP: Rating/flagging endpoint not found (404). " +
          "Implement POST /api/ratings or POST /api/recipes/:id/rate to enable this test.",
      );
      return;
    }

    expect([200, 201]).toContain(rateRes.status);

    // Now check admin moderation queue
    const modRes = await admin.raw("GET", "/api/admin/moderation");

    if (modRes.status === 404) {
      test.skip(
        true,
        "COVERAGE GAP: Admin moderation queue endpoint (GET /api/admin/moderation) does not exist. " +
          "Implement the endpoint and verify that flagged recipe ratings appear here.",
      );
      return;
    }

    expect(modRes.status).toBe(200);

    const flags = Array.isArray(modRes.body)
      ? (modRes.body as Array<Record<string, unknown>>)
      : (((modRes.body as Record<string, unknown>)?.flags ??
          (modRes.body as Record<string, unknown>)?.items ??
          (modRes.body as Record<string, unknown>)?.data ??
          []) as Array<Record<string, unknown>>);

    const matchingFlag = flags.find(
      (f) =>
        f.recipeId === targetRecipeId ||
        (f.recipe as Record<string, unknown>)?.id === targetRecipeId,
    );

    expect(
      matchingFlag,
      `Recipe id=${targetRecipeId} was flagged but NOT found in admin moderation queue. ` +
        "The side-effect from rating/flagging to moderation queue is broken.",
    ).toBeDefined();
  });
});
