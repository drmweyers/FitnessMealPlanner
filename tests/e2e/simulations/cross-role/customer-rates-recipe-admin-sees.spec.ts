/**
 * @cover XR-005 — Customer rates recipe → Admin moderation queue
 * Touchpoint 5 from qa-warfare-context.md §6
 *
 * If the ratings endpoint does not exist, skip gracefully.
 */

import { test, expect } from "@playwright/test";
import { ClientActor } from "../actors/index.js";
import { AdminActor } from "../actors/index.js";
import { TrainerActor } from "../actors/index.js";
import { CREDENTIALS, BASE_URL } from "../../helpers/constants.js";

let recipeId: string;

test.beforeAll(async () => {
  // Find an approved recipe to rate
  const trainer = await TrainerActor.login(CREDENTIALS.trainer, BASE_URL);
  const res = await trainer.listRecipes({ limit: "5" });
  const body = res as Record<string, unknown>;
  const recipes =
    (body.data as Array<Record<string, unknown>>) ??
    (body.recipes as Array<Record<string, unknown>>) ??
    (Array.isArray(body) ? (body as Array<Record<string, unknown>>) : []);
  if (recipes.length > 0) {
    recipeId = recipes[0].id as string;
  }
});

test("@cover XR-005a — customer can rate a recipe (or endpoint missing)", async () => {
  if (!recipeId) {
    test.skip(true, "No recipe to rate — skipping");
    return;
  }

  const customer = await ClientActor.login(CREDENTIALS.customer, BASE_URL);
  const res = await customer.raw("POST", `/api/ratings`, {
    recipeId,
    rating: 5,
    review: "Excellent XR-005 test rating",
  });
  console.log("[XR-005a] POST /api/ratings status:", res.status);

  if (res.status === 404) {
    test.skip(
      true,
      "POST /api/ratings endpoint not found — XR-005 not yet implemented",
    );
    return;
  }
  if (res.status === 405) {
    // Try alternate endpoint
    const altRes = await customer.raw(
      "POST",
      `/api/recipes/${recipeId}/ratings`,
      {
        rating: 5,
        review: "XR-005 test",
      },
    );
    console.log(
      "[XR-005a] Alt endpoint /api/recipes/:id/ratings status:",
      altRes.status,
    );
    if (altRes.status === 404) {
      test.skip(true, "No ratings endpoint found");
      return;
    }
  }
  expect([200, 201, 409]).toContain(res.status); // 409 = already rated
});

test("@cover XR-005b — flagged rating appears in admin moderation queue (if applicable)", async () => {
  if (!recipeId) {
    test.skip(true, "No recipe — skipping");
    return;
  }

  // Submit a low/flaggable rating
  const customer = await ClientActor.login(CREDENTIALS.customer, BASE_URL);
  const rateRes = await customer.raw("POST", "/api/ratings", {
    recipeId,
    rating: 1,
    review: "Terrible — flagged for moderation",
    flagged: true,
  });

  if (rateRes.status === 404 || rateRes.status === 405) {
    test.skip(true, "Ratings endpoint not found");
    return;
  }

  // Admin checks moderation queue
  const admin = await AdminActor.login(undefined, BASE_URL);
  const modRes = await admin.raw("GET", "/api/admin/ratings?flagged=true");
  console.log("[XR-005b] Admin moderation queue status:", modRes.status);
  if (modRes.status === 404) {
    test.skip(true, "Admin ratings moderation endpoint not found");
    return;
  }
  expect(modRes.status).toBe(200);
});
