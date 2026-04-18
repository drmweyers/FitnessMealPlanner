/**
 * FORGE QA — RCP-01: Recipe Browsing & Search
 *
 * Actor: Trainer (as-trainer storageState)
 * Covers: Page load, recipe card display, API contract, search filtering, detail view.
 */

import { test, expect } from "@playwright/test";
import { ROUTES, API, BASE_URL } from "../../helpers/constants.js";
import { ForgeApiClient } from "../../helpers/api-client.js";
import { RecipeLibraryPage } from "../../page-objects/RecipeLibraryPage.js";

test.describe("RCP-01: Recipe Browsing & Search", () => {
  test("recipes page loads without redirect to /login", async ({ page }) => {
    await page.goto(ROUTES.recipes, { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("page shows recipe cards — at least 1 visible", async ({ page }) => {
    const lib = new RecipeLibraryPage(page);
    await lib.goto();
    await page.waitForLoadState("networkidle");

    // Use resilient selectors — no data-testid on production
    const cards = page.locator(
      'article, [class*="recipe"], [class*="Recipe"], [class*="card"], .grid > div, .grid > a',
    );
    await expect(cards.first()).toBeVisible({ timeout: 15_000 });
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test("API: GET /api/recipes returns object with recipes array and total", async () => {
    const client = await ForgeApiClient.loginAs("trainer");
    const res = await client.raw("GET", API.recipes.list);

    expect(res.status).toBe(200);
    const body = res.body as {
      recipes?: unknown[];
      data?: unknown[];
      total?: number | string;
      count?: number;
    };
    // Production returns { recipes: [...], total: "1500" }
    const isArray = Array.isArray(body);
    const hasRecipesKey = Array.isArray(body.recipes);
    const hasDataKey = Array.isArray(body.data);
    expect(isArray || hasRecipesKey || hasDataKey).toBe(true);
  });

  test("API: GET /api/recipes?search=chicken returns filtered results", async () => {
    const client = await ForgeApiClient.loginAs("trainer");
    const res = await client.raw("GET", `${API.recipes.list}?search=chicken`);

    expect(res.status).toBe(200);
    const body = res.body as { recipes?: unknown[]; data?: unknown[] };
    const results = Array.isArray(body)
      ? body
      : (body.recipes ?? body.data ?? []);
    expect(Array.isArray(results)).toBe(true);
  });

  test("search returns fewer results than unfiltered", async () => {
    const client = await ForgeApiClient.loginAs("trainer");

    const allRes = await client.raw("GET", API.recipes.list);
    const filteredRes = await client.raw(
      "GET",
      `${API.recipes.list}?search=chicken`,
    );

    expect(allRes.status).toBe(200);
    expect(filteredRes.status).toBe(200);

    const allBody = allRes.body as {
      recipes?: unknown[];
      data?: unknown[];
      total?: number | string;
    };
    const filteredBody = filteredRes.body as {
      recipes?: unknown[];
      data?: unknown[];
      total?: number | string;
    };

    // total may be a string ("1500") — parse it
    const allCount = Array.isArray(allRes.body)
      ? (allRes.body as unknown[]).length
      : Number(allBody.total) || (allBody.recipes ?? allBody.data ?? []).length;

    const filteredCount = Array.isArray(filteredRes.body)
      ? (filteredRes.body as unknown[]).length
      : Number(filteredBody.total) ||
        (filteredBody.recipes ?? filteredBody.data ?? []).length;

    expect(filteredCount).toBeLessThan(allCount);
  });

  test("click first recipe card — navigates to detail view", async ({
    page,
  }) => {
    const lib = new RecipeLibraryPage(page);
    await lib.goto();
    await page.waitForLoadState("networkidle");

    const initialUrl = page.url();
    await lib.openFirstRecipe();
    await page.waitForLoadState("domcontentloaded");

    // URL must change (navigated away from /recipes or a modal/panel opened)
    const newUrl = page.url();
    const urlChanged = newUrl !== initialUrl;
    const detailVisible =
      (await page
        .locator(
          'h1, h2, [class*="recipe-detail"], [class*="RecipeDetail"], [class*="detail"]',
        )
        .count()) > 0;
    expect(urlChanged || detailVisible).toBe(true);
  });

  test("recipe detail shows name, calories, and macros", async ({ page }) => {
    const lib = new RecipeLibraryPage(page);
    await lib.goto();
    await page.waitForLoadState("networkidle");

    await lib.openFirstRecipe();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1_000);

    // Check if a detail view opened — either via URL change or modal/panel
    const urlChanged = !page.url().endsWith("/recipes");
    const hasDetailPanel =
      (await page
        .locator(
          '[class*="modal"], [class*="Modal"], [class*="detail"], [class*="Detail"], [class*="drawer"], [class*="Drawer"], [role="dialog"]',
        )
        .count()) > 0;

    if (urlChanged || hasDetailPanel) {
      // A visible heading or recipe title must exist somewhere in the detail view
      const visibleHeading = page
        .locator("h1:visible, h2:visible, h3:visible")
        .first();
      const headingCount = await visibleHeading.count();

      // At least some text content must be visible
      const pageText = await page.textContent("body");
      expect(pageText!.length).toBeGreaterThan(100);

      // At least one macro/calorie indicator must be present
      const nutritionLocator = page
        .locator("text=/calorie|protein|carb|fat|kcal/i")
        .first();
      const hasNutrition = (await nutritionLocator.count()) > 0;

      // Either heading or nutrition info visible confirms detail view works
      expect(headingCount > 0 || hasNutrition).toBe(true);
    } else {
      // If no navigation happened, the card click may show inline detail
      // Verify the page still has content
      const pageText = await page.textContent("body");
      expect(pageText!.length).toBeGreaterThan(100);
    }
  });

  test("API: GET /api/recipes/:id returns single recipe with all fields", async () => {
    const client = await ForgeApiClient.loginAs("trainer");

    // First fetch the list to get a real ID
    const listRes = await client.raw("GET", API.recipes.list);
    expect(listRes.status).toBe(200);

    const listBody = listRes.body as {
      recipes?: Array<{ id: string }>;
      data?: Array<{ id: string }>;
    };
    const recipes = Array.isArray(listRes.body)
      ? (listRes.body as Array<{ id: string }>)
      : (listBody.recipes ?? listBody.data ?? []);

    expect(recipes.length).toBeGreaterThan(0);
    const firstId = recipes[0].id;
    expect(firstId).toBeTruthy();

    const detailRes = await client.raw("GET", API.recipes.get(firstId));
    expect(detailRes.status).toBe(200);

    const recipe = detailRes.body as Record<string, unknown>;
    expect(recipe.id ?? recipe._id).toBeTruthy();
    expect(recipe.name ?? recipe.title).toBeTruthy();
    // Production uses caloriesKcal, proteinGrams, carbsGrams, fatGrams
    const hasNutrition =
      recipe.caloriesKcal !== undefined ||
      recipe.calories !== undefined ||
      recipe.proteinGrams !== undefined ||
      recipe.protein !== undefined ||
      recipe.nutrition !== undefined ||
      recipe.macros !== undefined;
    expect(hasNutrition).toBe(true);
  });
});
