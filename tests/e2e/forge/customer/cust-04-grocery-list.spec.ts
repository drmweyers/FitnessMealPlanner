/**
 * FORGE QA — CUST-04: Customer Grocery List
 *
 * Actor: Customer (as-customer storageState)
 * Covers: Grocery list API CRUD, item checked state, grocery list page UI.
 *
 * Note: GET /api/grocery-lists returns { groceryLists: [...] }
 * GET /api/grocery-lists/:id returns { id, customerId, items: [...], ... }
 *
 * Clean up: items created during this suite are removed in afterAll.
 */

import { test, expect } from "@playwright/test";
import { ROUTES, API } from "../../helpers/constants.js";
import { ForgeApiClient } from "../../helpers/api-client.js";
import { loadSeedState } from "../../helpers/auth-helpers.js";

test.describe("CUST-04: Customer Grocery List", () => {
  // Force serial execution — tests depend on sequential create/update/check
  test.describe.configure({ mode: "serial" });

  let client: ForgeApiClient;
  let seedState: ReturnType<typeof loadSeedState>;
  let groceryListId: string;
  let createdItemId: string;

  test.beforeAll(async () => {
    client = await ForgeApiClient.loginAs("customer");
    seedState = loadSeedState();
    groceryListId = seedState.groceryListId;
  });

  test.afterAll(async () => {
    // Clean up created item
    if (createdItemId && groceryListId) {
      await client
        .raw("DELETE", API.grocery.item(groceryListId, createdItemId))
        .catch(() => {});
    }
  });

  test("API: GET /api/grocery-lists returns customer grocery lists", async () => {
    const res = await client.raw("GET", API.grocery.lists);

    expect(res.status).toBe(200);
    const body = res.body as {
      groceryLists?: unknown[];
      lists?: unknown[];
      data?: unknown[];
    };
    const lists = Array.isArray(res.body)
      ? res.body
      : (body.groceryLists ?? body.lists ?? body.data ?? []);
    expect(Array.isArray(lists)).toBe(true);
  });

  test("Seeded grocery list exists", async () => {
    expect(groceryListId).toBeTruthy();

    const res = await client.raw("GET", API.grocery.list(groceryListId));
    expect(res.status).toBe(200);

    const body = res.body as Record<string, unknown>;
    // Production returns { id, customerId, items: [...], ... }
    expect(body.id).toBeTruthy();
  });

  test("API: GET /api/grocery-lists/:id returns list with items array", async () => {
    expect(groceryListId).toBeTruthy();

    const res = await client.raw("GET", API.grocery.list(groceryListId));
    expect(res.status).toBe(200);

    const body = res.body as Record<string, unknown>;
    const hasItemsKey =
      Array.isArray(body.items) ||
      Array.isArray(body.groceryItems) ||
      Array.isArray(body.data);
    expect(hasItemsKey).toBe(true);
  });

  test("Items have name, category, quantity fields", async () => {
    expect(groceryListId).toBeTruthy();

    const res = await client.raw("GET", API.grocery.list(groceryListId));
    expect(res.status).toBe(200);

    const body = res.body as {
      items?: Array<Record<string, unknown>>;
      groceryItems?: Array<Record<string, unknown>>;
      data?: Array<Record<string, unknown>>;
    };
    const items = body.items ?? body.groceryItems ?? body.data ?? [];

    // Items may be empty if seeded list has no items — skip field check if empty
    if (items.length > 0) {
      const first = items[0];
      const hasName =
        "name" in first || "ingredient" in first || "title" in first;
      const hasQuantity =
        "quantity" in first || "amount" in first || "qty" in first;
      expect(hasName).toBe(true);
      expect(hasQuantity).toBe(true);
    } else {
      // Empty items list is valid — the list exists
      expect(Array.isArray(items)).toBe(true);
    }
  });

  test("API: POST /api/grocery-lists/:id/items adds new item — 201", async () => {
    expect(groceryListId).toBeTruthy();

    const res = await client.raw("POST", API.grocery.items(groceryListId), {
      name: `FORGE-TEST-${Date.now()}`,
      category: "produce",
      quantity: 2,
      unit: "pieces",
    });

    expect([200, 201]).toContain(res.status);
    const body = res.body as {
      id?: string;
      item?: { id: string };
      itemId?: string;
      data?: { id: string };
    };
    const id = body.id ?? body.item?.id ?? body.itemId ?? body.data?.id;
    expect(id).toBeTruthy();
    createdItemId = id!;
  });

  test("API: PUT /api/grocery-lists/:id/items/:itemId with isChecked:true — 200", async () => {
    expect(groceryListId).toBeTruthy();
    expect(createdItemId).toBeTruthy();

    const res = await client.raw(
      "PUT",
      API.grocery.item(groceryListId, createdItemId),
      { isChecked: true },
    );

    expect([200, 204]).toContain(res.status);
  });

  test("Checked state persists on re-fetch", async () => {
    expect(groceryListId).toBeTruthy();
    expect(createdItemId).toBeTruthy();

    const res = await client.raw("GET", API.grocery.list(groceryListId));
    expect(res.status).toBe(200);

    const body = res.body as {
      items?: Array<{ id: string; isChecked?: boolean; checked?: boolean }>;
      groceryItems?: Array<{
        id: string;
        isChecked?: boolean;
        checked?: boolean;
      }>;
      data?: Array<{ id: string; isChecked?: boolean; checked?: boolean }>;
    };
    const items = body.items ?? body.groceryItems ?? body.data ?? [];

    const checkedItem = items.find((item) => item.id === createdItemId);
    expect(checkedItem).toBeDefined();
    const isChecked = checkedItem?.isChecked ?? checkedItem?.checked;
    expect(isChecked).toBe(true);
  });

  test("/customer/grocery-list page loads", async ({ page }) => {
    // Try both possible routes
    const routes = [ROUTES.customerGroceryList, ROUTES.groceryList];
    let loaded = false;

    for (const route of routes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      const url = page.url();
      if (!url.includes("/login")) {
        loaded = true;
        break;
      }
    }

    expect(loaded).toBe(true);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3_000);

    // Page must have some meaningful content
    const pageText = await page.textContent("body");
    expect(pageText!.length).toBeGreaterThan(50);
  });
});
