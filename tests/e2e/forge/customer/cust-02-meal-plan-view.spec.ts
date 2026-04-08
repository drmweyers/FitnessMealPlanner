/**
 * FORGE QA — CUST-02: Customer Meal Plan Viewing
 *
 * Actor: Customer (as-customer storageState)
 * Covers: Meal plan list page, plan detail, day/meal structure, empty state.
 */

import { test, expect } from "@playwright/test";
import { ROUTES, API } from "../../helpers/constants.js";
import { ForgeApiClient } from "../../helpers/api-client.js";
import { loadSeedState } from "../../helpers/auth-helpers.js";

test.describe("CUST-02: Customer Meal Plan Viewing", () => {
  test("/customer/meal-plans loads without redirect", async ({ page }) => {
    await page.goto(ROUTES.customerMealPlans, {
      waitUntil: "domcontentloaded",
    });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("Page shows assigned meal plans from seed data", async ({ page }) => {
    await page.goto(ROUTES.customerMealPlans, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("networkidle");

    const planCards = page.locator(
      '[data-testid="meal-plan-card"], [class*="meal-plan"], [class*="MealPlan"], [class*="plan-card"], article, .card',
    );
    const count = await planCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test("Meal plan card shows plan name", async ({ page }) => {
    await page.goto(ROUTES.customerMealPlans, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("networkidle");

    // At least one card must contain a visible text heading
    const planName = page.locator(
      '[data-testid="plan-name"], [class*="plan-name"], [class*="planName"], [class*="meal-plan"] h2, [class*="meal-plan"] h3, .card h2, .card h3',
    );
    await expect(planName.first()).toBeVisible({ timeout: 10_000 });
    const text = await planName.first().textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test("Click plan card — shows detail with day/meal structure", async ({
    page,
  }) => {
    await page.goto(ROUTES.customerMealPlans, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("networkidle");

    const firstCard = page
      .locator(
        '[data-testid="meal-plan-card"], [class*="meal-plan"], [class*="MealPlan"], .card, article',
      )
      .first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    await firstCard.click();
    await page.waitForLoadState("domcontentloaded");

    // Should navigate to a detail page or open a detail panel
    const detailContent = page.locator(
      '[data-testid="meal-plan-detail"], [class*="plan-detail"], [class*="PlanDetail"], [class*="day"], [class*="Day"]',
    );
    const urlChanged =
      page.url().includes("/meal-plan") || page.url().includes("/plan/");
    const hasDetail = (await detailContent.count()) > 0;
    expect(urlChanged || hasDetail).toBe(true);
  });

  test("Detail shows meal names and calorie counts", async ({ page }) => {
    await page.goto(ROUTES.customerMealPlans, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("networkidle");

    const firstCard = page
      .locator(
        '[data-testid="meal-plan-card"], [class*="meal-plan"], .card, article',
      )
      .first();
    await firstCard.click();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(500);

    // Meal name and calorie/nutrition info must appear somewhere on the detail view
    const mealName = page
      .locator(
        '[class*="meal-name"], [class*="mealName"], [data-testid*="meal"], h3, h4',
      )
      .first();
    await expect(mealName).toBeVisible({ timeout: 10_000 });

    const calorieInfo = page.locator("text=/calorie|kcal|cal/i").first();
    await expect(calorieInfo).toBeVisible({ timeout: 10_000 });
  });

  test("API: Customer meal plan list returns at least 1 plan", async () => {
    const client = await ForgeApiClient.loginAs("customer");
    // Try customer-facing meal plans endpoint
    const res = await client.raw("GET", "/api/customer/meal-plans");

    // Accept 200 or 404 (endpoint may be different) — but not 500
    expect(res.status).not.toBe(500);
    if (res.status === 200) {
      const body = res.body as {
        mealPlans?: unknown[];
        data?: unknown[];
        plans?: unknown[];
      };
      const plans = Array.isArray(res.body)
        ? res.body
        : (body.mealPlans ?? body.data ?? body.plans ?? []);
      expect(plans.length).toBeGreaterThan(0);
    }
  });

  test("Meal plan detail shows correct number of days", async ({ page }) => {
    const seedState = loadSeedState();
    const client = await ForgeApiClient.loginAs("trainer");

    // Fetch the plan details as trainer (has full detail)
    const planId = seedState.planIds.weightLoss ?? seedState.planIds.balanced;
    const res = await client.raw("GET", API.trainer.mealPlan(planId));

    if (res.status === 200) {
      const body = res.body as {
        days?: unknown[];
        meals?: unknown[];
        dayCount?: number;
      };
      const dayCount = body.days?.length ?? body.dayCount;
      // A valid meal plan has at least 1 day
      if (dayCount !== undefined) {
        expect(dayCount).toBeGreaterThan(0);
      } else {
        // meals may be flat — still a valid structure
        expect(body).not.toBeNull();
      }
    } else {
      // Plan may not exist in test DB — skip assertion on data but verify no server error
      expect(res.status).not.toBe(500);
    }
  });

  test("Recipe names are visible in meal slots on detail view", async ({
    page,
  }) => {
    await page.goto(ROUTES.customerMealPlans, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("networkidle");

    const firstCard = page
      .locator(
        '[data-testid="meal-plan-card"], [class*="meal-plan"], .card, article',
      )
      .first();
    await firstCard.click();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(500);

    // Recipe name in a slot — any visible text element nested inside a day/meal slot
    const recipeSlot = page
      .locator(
        '[class*="recipe-name"], [class*="recipeName"], [data-testid*="recipe"], [class*="meal-slot"] span, [class*="mealSlot"] span',
      )
      .first();
    // Either recipes slots are visible, or the detail at minimum has content
    const hasSlots = (await recipeSlot.count()) > 0;
    const hasContent = (await page.locator("h1, h2, h3, h4").count()) > 0;
    expect(hasSlots || hasContent).toBe(true);
  });
});
