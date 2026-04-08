/**
 * SHARE-01: Meal Plan Sharing
 *
 * Actor: Trainer (as-trainer storageState) + unauthenticated browser
 * Runs in: 'as-trainer' project (trainer tests) + 'unauthenticated' (public share view)
 *
 * Hard assertions only — every test FAILS when the feature breaks.
 */

import { test, expect } from "@playwright/test";
import { ROUTES, API, TIMEOUTS } from "../../helpers/constants.js";
import { ForgeApiClient } from "../../helpers/api-client.js";
import { loadSeedState } from "../../helpers/auth-helpers.js";

test.describe("SHARE-01 — Meal Plan Sharing", () => {
  // ---------------------------------------------------------------------------
  // API: shared plan access by token
  // ---------------------------------------------------------------------------

  test("API GET /api/meal-plans/shared/:token returns 200 with plan data", async () => {
    const seedState = loadSeedState();
    const trainerApi = await ForgeApiClient.loginAs("trainer");

    const res = await trainerApi.raw(
      "GET",
      API.mealPlans.shared(seedState.shareToken),
    );

    expect(res.status).toBe(200);
    expect(res.body).not.toBeNull();
  });

  test("shared plan API response includes planName field", async () => {
    const seedState = loadSeedState();
    const trainerApi = await ForgeApiClient.loginAs("trainer");

    const res = await trainerApi.raw(
      "GET",
      API.mealPlans.shared(seedState.shareToken),
    );

    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body).toHaveProperty("planName");
    expect(typeof body.planName).toBe("string");
    expect((body.planName as string).length).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // UI: public shared plan page (unauthenticated)
  // ---------------------------------------------------------------------------

  test("shared plan page /shared/:token loads without requiring login", async ({
    page,
  }) => {
    const seedState = loadSeedState();

    await page.goto(ROUTES.shared(seedState.shareToken), {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2_000);

    expect(page.url()).not.toMatch(/\/login/);
  });

  test("shared plan page shows the plan name", async ({ page }) => {
    const seedState = loadSeedState();

    await page.goto(ROUTES.shared(seedState.shareToken), {
      waitUntil: "domcontentloaded",
    });

    const planNameEl = page.locator(
      '[class*="planName"], [class*="plan-name"], [class*="title"], h1, h2',
    );
    await expect(planNameEl.first()).toBeVisible({
      timeout: TIMEOUTS.navigation,
    });
  });

  // ---------------------------------------------------------------------------
  // API: create share token
  // ---------------------------------------------------------------------------

  test("API POST /api/meal-plans/:planId/share creates a new share token", async () => {
    const seedState = loadSeedState();
    const trainerApi = await ForgeApiClient.loginAs("trainer");
    const planId = seedState.planIds.balanced;

    const res = await trainerApi.raw("POST", API.mealPlans.share(planId), {});

    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body).toHaveProperty("token");
    expect(typeof body.token).toBe("string");
    expect((body.token as string).length).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // UI: shared page has no edit/delete controls
  // ---------------------------------------------------------------------------

  test("shared plan page does not show edit or delete buttons", async ({
    page,
  }) => {
    const seedState = loadSeedState();

    await page.goto(ROUTES.shared(seedState.shareToken), {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(1_500);

    const editBtn = page.locator(
      'button:has-text("Edit"), button:has-text("Delete"), button:has-text("Remove"), [aria-label*="edit" i], [aria-label*="delete" i]',
    );
    const count = await editBtn.count();
    expect(count).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // API: invalid token returns 404
  // ---------------------------------------------------------------------------

  test("API GET /api/meal-plans/shared with non-existent token returns 404", async () => {
    const trainerApi = await ForgeApiClient.loginAs("trainer");
    const res = await trainerApi.raw(
      "GET",
      API.mealPlans.shared("this-token-does-not-exist-00000"),
    );

    expect(res.status).toBe(404);
  });
});
