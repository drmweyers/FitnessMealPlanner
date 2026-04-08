/**
 * FORGE QA — RCP-03: Recipe Favorites & Collections
 *
 * Actor: Trainer (as-trainer storageState)
 * Covers: Add/remove favorites via API, favorites page UI, re-favorite.
 */

import { test, expect } from "@playwright/test";
import { ROUTES, API } from "../../helpers/constants.js";
import { ForgeApiClient } from "../../helpers/api-client.js";
import { loadSeedState } from "../../helpers/auth-helpers.js";

test.describe("RCP-03: Recipe Favorites & Collections", () => {
  let client: ForgeApiClient;
  let recipeIdToFavorite: string;

  test.beforeAll(async () => {
    client = await ForgeApiClient.loginAs("trainer");

    // Pick a recipe ID from seed state or from the live API
    const seedState = loadSeedState();
    if (seedState.recipeIds && seedState.recipeIds.length > 0) {
      // Use the second recipe (first may already be favorited in seed)
      recipeIdToFavorite =
        seedState.recipeIds[seedState.recipeIds.length > 1 ? 1 : 0];
    } else {
      // Fall back to fetching from API
      const listRes = await client.raw("GET", API.recipes.list);
      const body = listRes.body as {
        recipes?: Array<{ id: string }>;
        data?: Array<{ id: string }>;
      };
      const recipes = Array.isArray(listRes.body)
        ? (listRes.body as Array<{ id: string }>)
        : (body.recipes ?? body.data ?? []);
      expect(recipes.length).toBeGreaterThan(0);
      recipeIdToFavorite = recipes[recipes.length > 1 ? 1 : 0].id;
    }

    // Ensure the recipe is NOT already favorited before tests run (clean state)
    await client
      .raw("DELETE", `${API.favorites}/${recipeIdToFavorite}`)
      .catch(() => {
        // Ignore — may not be favorited
      });
  });

  test.afterAll(async () => {
    // Remove any favorite created during this suite
    if (recipeIdToFavorite) {
      await client
        .raw("DELETE", `${API.favorites}/${recipeIdToFavorite}`)
        .catch(() => {});
    }
  });

  test("API: POST /api/favorites with recipeId returns 201 or 200", async () => {
    const res = await client.raw("POST", API.favorites, {
      recipeId: recipeIdToFavorite,
    });
    expect([200, 201]).toContain(res.status);
  });

  test("API: GET /api/favorites returns favorited recipes list", async () => {
    const res = await client.raw("GET", API.favorites);
    expect(res.status).toBe(200);

    const body = res.body as { favorites?: unknown[]; data?: unknown[] };
    const list = Array.isArray(res.body)
      ? res.body
      : (body.favorites ?? body.data ?? []);
    expect(Array.isArray(list)).toBe(true);
  });

  test("Favorited recipe ID is in the GET /api/favorites response", async () => {
    const res = await client.raw("GET", API.favorites);
    expect(res.status).toBe(200);

    const body = res.body as {
      favorites?: Array<{
        id: string;
        recipeId?: string;
        recipe?: { id: string };
      }>;
      data?: Array<{ id: string; recipeId?: string; recipe?: { id: string } }>;
    };
    const list = Array.isArray(res.body)
      ? (res.body as Array<{
          id: string;
          recipeId?: string;
          recipe?: { id: string };
        }>)
      : (body.favorites ?? body.data ?? []);

    const found = list.some(
      (item) =>
        item.id === recipeIdToFavorite ||
        item.recipeId === recipeIdToFavorite ||
        item.recipe?.id === recipeIdToFavorite,
    );
    expect(found).toBe(true);
  });

  test("/favorites page loads and shows at least 1 recipe", async ({
    page,
  }) => {
    await page.goto(ROUTES.favorites, { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login/);
    await page.waitForLoadState("networkidle");

    const cards = page.locator(
      '[data-testid="recipe-card"], .recipe-card, [class*="RecipeCard"], [class*="recipe-card"], [class*="recipe-item"], [class*="favorite"]',
    );
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test("API: DELETE /api/favorites/:recipeId removes favorite", async () => {
    const res = await client.raw(
      "DELETE",
      `${API.favorites}/${recipeIdToFavorite}`,
    );
    expect([200, 204]).toContain(res.status);
  });

  test("After delete, recipe is absent from GET /api/favorites", async () => {
    const res = await client.raw("GET", API.favorites);
    expect(res.status).toBe(200);

    const body = res.body as {
      favorites?: Array<{
        id: string;
        recipeId?: string;
        recipe?: { id: string };
      }>;
      data?: Array<{ id: string; recipeId?: string; recipe?: { id: string } }>;
    };
    const list = Array.isArray(res.body)
      ? (res.body as Array<{
          id: string;
          recipeId?: string;
          recipe?: { id: string };
        }>)
      : (body.favorites ?? body.data ?? []);

    const found = list.some(
      (item) =>
        item.id === recipeIdToFavorite ||
        item.recipeId === recipeIdToFavorite ||
        item.recipe?.id === recipeIdToFavorite,
    );
    expect(found).toBe(false);
  });

  test("Re-favorite same recipe succeeds — not permanently blocked", async () => {
    const res = await client.raw("POST", API.favorites, {
      recipeId: recipeIdToFavorite,
    });
    expect([200, 201]).toContain(res.status);

    // Confirm it's back
    const listRes = await client.raw("GET", API.favorites);
    expect(listRes.status).toBe(200);

    const body = listRes.body as {
      favorites?: Array<{
        id: string;
        recipeId?: string;
        recipe?: { id: string };
      }>;
      data?: Array<{ id: string; recipeId?: string; recipe?: { id: string } }>;
    };
    const list = Array.isArray(listRes.body)
      ? (listRes.body as Array<{
          id: string;
          recipeId?: string;
          recipe?: { id: string };
        }>)
      : (body.favorites ?? body.data ?? []);

    const found = list.some(
      (item) =>
        item.id === recipeIdToFavorite ||
        item.recipeId === recipeIdToFavorite ||
        item.recipe?.id === recipeIdToFavorite,
    );
    expect(found).toBe(true);
  });

  test("/favorites page after adding shows updated list", async ({ page }) => {
    await page.goto(ROUTES.favorites, { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login/);
    await page.waitForLoadState("networkidle");

    const cards = page.locator(
      '[data-testid="recipe-card"], .recipe-card, [class*="RecipeCard"], [class*="recipe-card"], [class*="recipe-item"]',
    );
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });
});
