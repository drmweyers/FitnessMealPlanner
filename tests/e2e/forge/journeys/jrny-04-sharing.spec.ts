/**
 * FORGE QA — JRNY-04: Meal Plan Sharing Journey
 * Tests: trainer creates plan → generates share link → public views plan → deactivate
 */
import { test, expect } from "@playwright/test";
import { ForgeApiClient } from "../../helpers/api-client.js";
import { loginAsTrainer, loadSeedState } from "../../helpers/auth-helpers.js";
import { API, BASE_URL, ROUTES } from "../../helpers/constants.js";

test.describe("JRNY-04 — Meal Plan Sharing Journey", () => {
  test.describe.configure({ mode: "serial" });

  let trainerApi: ForgeApiClient;
  let testPlanId: string | null = null;
  let testShareToken: string | null = null;

  test.beforeAll(async () => {
    trainerApi = await ForgeApiClient.loginAs("trainer", BASE_URL);
  });

  test.afterAll(async () => {
    if (testPlanId) {
      await trainerApi
        .raw("DELETE", API.trainer.mealPlan(testPlanId))
        .catch(() => {});
    }
  });

  test("step 1: trainer creates a meal plan for sharing", async () => {
    const res = await trainerApi.post<any>(API.trainer.mealPlans, {
      mealPlanData: {
        planName: `FORGE-SHARE-${Date.now()}`,
        duration: 7,
        dailyCalories: 1800,
        meals: [
          {
            day: 1,
            mealType: "breakfast",
            name: "Eggs & Toast",
            calories: 400,
            protein: 20,
            carbs: 30,
            fat: 20,
          },
          {
            day: 1,
            mealType: "lunch",
            name: "Turkey Wrap",
            calories: 500,
            protein: 30,
            carbs: 40,
            fat: 15,
          },
        ],
      },
      notes: "FORGE share journey test",
      tags: ["forge-qa", "share-test"],
    });
    // Response is { mealPlan: { id, ... }, message: "..." }
    const planId = res.id || res.mealPlan?.id || res.plan?.id;
    expect(planId).toBeTruthy();
    testPlanId = planId;
  });

  test("step 2: trainer generates a share link", async () => {
    expect(testPlanId).toBeTruthy();
    // Share endpoint expects mealPlanId in body
    const res = await trainerApi.post<any>(API.mealPlans.share(testPlanId!), {
      mealPlanId: testPlanId!,
    });
    // Server may redact shareToken — extract UUID from shareUrl instead
    let token = "";
    const shareUrl = res.shareUrl as string;
    if (shareUrl) {
      const urlToken = shareUrl.split("/shared/").pop() || "";
      if (urlToken && urlToken !== "[REDACTED]") {
        token = urlToken;
      }
    }
    if (!token) {
      const rawToken = res.shareToken || res.token || "";
      if (rawToken && rawToken !== "[REDACTED]") {
        token = rawToken;
      }
    }
    expect(token.length).toBeGreaterThan(0);
    testShareToken = token;
  });

  test("step 3: shared plan is accessible via API without auth", async () => {
    test.skip(!testShareToken, "No share token available — skipping");
    // Use unauthenticated client
    const publicApi = new ForgeApiClient(BASE_URL);
    const res = await publicApi.raw(
      "GET",
      API.mealPlans.shared(testShareToken!),
    );
    expect(res.status).toBe(200);
  });

  test("step 4: shared plan has meal data", async () => {
    test.skip(!testShareToken, "No share token available — skipping");
    const publicApi = new ForgeApiClient(BASE_URL);
    const plan = await publicApi.get<any>(
      API.mealPlans.shared(testShareToken!),
    );
    const hasPlanData = plan.mealPlan || plan.mealPlanData || plan.planName;
    expect(hasPlanData).toBeTruthy();
    const planData = plan.mealPlan || plan.mealPlanData || plan;
    expect(planData.planName || planData.name || planData.meals).toBeTruthy();
  });

  test("step 5: public share page renders in browser", async ({ page }) => {
    test.skip(!testShareToken, "No share token available — skipping");
    await page.goto(ROUTES.shared(testShareToken!), {
      waitUntil: "domcontentloaded",
    });
    // Wait for SPA to render
    await page.waitForTimeout(3_000);
    // Should NOT redirect to login
    await expect(page).not.toHaveURL(/\/login/);
    // Should show plan content
    const body = await page.textContent("body");
    expect(body!.length).toBeGreaterThan(50);
  });

  test("step 6: shared page does not show edit controls", async ({ page }) => {
    test.skip(!testShareToken, "No share token available — skipping");
    await page.goto(ROUTES.shared(testShareToken!), {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2_000);
    const editButtons = page.locator(
      'button:has-text("Edit"), button:has-text("Delete"), button:has-text("Assign")',
    );
    expect(await editButtons.count()).toBe(0);
  });

  test("step 7: non-existent share token returns 400 or 404", async () => {
    const publicApi = new ForgeApiClient(BASE_URL);
    const res = await publicApi.raw(
      "GET",
      API.mealPlans.shared("nonexistent-token-12345"),
    );
    // Accept both 400 (bad request) and 404 (not found)
    expect([400, 404]).toContain(res.status);
  });

  test("step 8: seeded share token or test share token works", async () => {
    const seedState = loadSeedState();
    // Use the token we created in step 2, or skip if none available
    // (seed-state shareToken is [REDACTED] and won't work)
    const token =
      testShareToken ||
      (seedState.shareToken && seedState.shareToken !== "[REDACTED]"
        ? seedState.shareToken
        : null);
    test.skip(!token, "No valid share token available — skipping");

    const publicApi = new ForgeApiClient(BASE_URL);
    const res = await publicApi.raw("GET", API.mealPlans.shared(token!));
    expect(res.status).toBe(200);
  });
});
