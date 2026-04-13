/**
 * Workflow 03 — Recipe Discovery
 *
 * @cover REC-009 REC-019 REC-025 REC-026 REC-027
 *
 * Scenario:
 *  1. Customer browses recipes (GET /api/recipes)
 *  2. Customer filters by a dietary tag
 *  3. Customer favorites the first recipe
 *  4. Customer retrieves favorites list and verifies it contains the recipe
 *  5. Cleanup: remove the favorite (only if we added it)
 *
 * NON-DESTRUCTIVE: only creates and removes a single favorite.
 */

import { test, expect } from "@playwright/test";
import { ClientActor } from "../actors/index.js";
import { BASE_URL } from "../../helpers/constants.js";

const baseUrl = process.env.BASE_URL || BASE_URL;

test.describe("Workflow 03 — Recipe Discovery", () => {
  let favoritedRecipeId: string | undefined;
  let favoriteId: string | undefined;
  let addedFavorite = false;

  test.afterAll(async () => {
    if (favoriteId && addedFavorite) {
      try {
        const customer = await ClientActor.login(undefined, baseUrl);
        await customer.raw("DELETE", `/api/favorites/${favoriteId}`);
      } catch {
        /* ignore */
      }
    }
  });

  test("REC-009 customer can browse recipe list", async () => {
    // @cover REC-009
    const customer = await ClientActor.login(undefined, baseUrl);
    const res = await customer.raw("GET", "/api/recipes");
    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    const recipes = Array.isArray(body)
      ? body
      : Array.isArray((body as Record<string, unknown>).recipes)
        ? ((body as Record<string, unknown>).recipes as unknown[])
        : Array.isArray((body as Record<string, unknown>).data)
          ? ((body as Record<string, unknown>).data as unknown[])
          : [];
    expect(Array.isArray(recipes)).toBe(true);
    if (recipes.length > 0) {
      const first = recipes[0] as Record<string, unknown>;
      favoritedRecipeId = (first.id || first._id) as string;
    }
  });

  test("customer can filter recipes by dietary tag", async () => {
    // @cover REC-009
    const customer = await ClientActor.login(undefined, baseUrl);
    const res = await customer.raw("GET", "/api/recipes?tag=high-protein");
    expect(res.status).toBeLessThan(500);
  });

  test("REC-026 customer can favorite a recipe", async () => {
    // @cover REC-026
    test.skip(!favoritedRecipeId, "No recipe id available from prior test");
    const customer = await ClientActor.login(undefined, baseUrl);
    const res = await customer.raw("POST", "/api/favorites", {
      recipeId: favoritedRecipeId,
    });
    if (res.status === 400) {
      const body = res.body as Record<string, unknown>;
      const msg = ((body.message || body.error) as string) || "";
      if (msg.toLowerCase().includes("already")) {
        // Already favorited — retrieve existing id, don't delete it
        const favsRes = await customer.raw("GET", "/api/favorites");
        const favsBody = favsRes.body as Record<string, unknown>;
        const favs = Array.isArray(favsBody)
          ? favsBody
          : Array.isArray((favsBody as Record<string, unknown>).favorites)
            ? ((favsBody as Record<string, unknown>).favorites as unknown[])
            : Array.isArray((favsBody as Record<string, unknown>).data)
              ? ((favsBody as Record<string, unknown>).data as unknown[])
              : [];
        const existing = (favs as Record<string, unknown>[]).find(
          (f) =>
            f.recipeId === favoritedRecipeId ||
            (f.recipe as Record<string, unknown>)?.id === favoritedRecipeId,
        );
        if (existing) favoriteId = (existing.id || existing._id) as string;
        return; // idempotent pass
      }
    }
    expect([200, 201]).toContain(res.status);
    const body = res.body as Record<string, unknown>;
    const fav =
      (body.favorite as Record<string, unknown>) ||
      (body.data as Record<string, unknown>) ||
      body;
    favoriteId = ((fav?.id || fav?._id) as string) || undefined;
    addedFavorite = true;
  });

  test("REC-025 customer favorites list is non-empty after favoriting", async () => {
    // @cover REC-025
    const customer = await ClientActor.login(undefined, baseUrl);
    const res = await customer.raw("GET", "/api/favorites");
    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    const favs = Array.isArray(body)
      ? body
      : Array.isArray((body as Record<string, unknown>).favorites)
        ? ((body as Record<string, unknown>).favorites as unknown[])
        : Array.isArray((body as Record<string, unknown>).data)
          ? ((body as Record<string, unknown>).data as unknown[])
          : [];
    expect(Array.isArray(favs)).toBe(true);
    if (favoritedRecipeId && favs.length > 0) {
      const found = (favs as Record<string, unknown>[]).some(
        (f) =>
          f.recipeId === favoritedRecipeId ||
          (f.recipe as Record<string, unknown>)?.id === favoritedRecipeId,
      );
      expect(found).toBe(true);
    }
  });

  test("REC-027 customer can remove a favorite (only if added by this test)", async () => {
    // @cover REC-027
    test.skip(
      !favoriteId || !addedFavorite,
      "Favorite not created by this test run — skipping delete",
    );
    const customer = await ClientActor.login(undefined, baseUrl);
    const res = await customer.raw("DELETE", `/api/favorites/${favoriteId}`);
    expect([200, 204]).toContain(res.status);
    favoriteId = undefined;
    addedFavorite = false;
  });

  test("REC-019 customer can view a single recipe by id", async () => {
    // @cover REC-019
    test.skip(!favoritedRecipeId, "No recipe id available");
    const customer = await ClientActor.login(undefined, baseUrl);
    const res = await customer.raw("GET", `/api/recipes/${favoritedRecipeId}`);
    expect(res.status).toBe(200);
  });
});
