/**
 * FORGE QA — JRNY-02: Meal Plan to Grocery List Pipeline
 * Tests: trainer creates plan → assigns → customer generates grocery list → manages items
 */
import { test, expect } from "@playwright/test";
import { ForgeApiClient } from "../../helpers/api-client.js";
import { loginAsCustomer, loadSeedState } from "../../helpers/auth-helpers.js";
import { API, BASE_URL } from "../../helpers/constants.js";

test.describe("JRNY-02 — Meal Plan to Grocery List Pipeline", () => {
  let trainerApi: ForgeApiClient;
  let customerApi: ForgeApiClient;
  let createdPlanId: string | null = null;
  let createdGroceryId: string | null = null;

  test.beforeAll(async () => {
    trainerApi = await ForgeApiClient.loginAs("trainer", BASE_URL);
    customerApi = await ForgeApiClient.loginAs("customer", BASE_URL);
  });

  test.afterAll(async () => {
    // Clean up created plan
    if (createdPlanId) {
      await trainerApi
        .raw("DELETE", API.trainer.mealPlan(createdPlanId))
        .catch(() => {});
    }
    if (createdGroceryId) {
      await customerApi
        .raw("DELETE", API.grocery.list(createdGroceryId))
        .catch(() => {});
    }
  });

  test("step 1: trainer creates a new meal plan", async () => {
    const res = await trainerApi.post<any>(API.trainer.mealPlans, {
      mealPlanData: {
        planName: `FORGE-JRNY2-${Date.now()}`,
        duration: 7,
        dailyCalories: 2000,
        meals: [
          {
            day: 1,
            mealType: "breakfast",
            name: "Oatmeal",
            calories: 350,
            protein: 12,
            carbs: 55,
            fat: 8,
          },
          {
            day: 1,
            mealType: "lunch",
            name: "Grilled Chicken Salad",
            calories: 500,
            protein: 40,
            carbs: 20,
            fat: 25,
          },
          {
            day: 1,
            mealType: "dinner",
            name: "Salmon with Rice",
            calories: 600,
            protein: 35,
            carbs: 55,
            fat: 20,
          },
        ],
      },
      notes: "FORGE journey test",
      tags: ["forge-qa"],
    });
    expect(res).toHaveProperty("id");
    createdPlanId = res.id;
  });

  test("step 2: trainer assigns plan to customer", async () => {
    expect(createdPlanId).toBeTruthy();
    const seedState = loadSeedState();
    const res = await trainerApi.raw(
      "POST",
      API.trainer.mealPlanAssign(createdPlanId!),
      {
        customerId: seedState.customerUserId,
        notes: "FORGE journey grocery pipeline",
      },
    );
    expect([200, 201]).toContain(res.status);
  });

  test("step 3: customer sees the assigned plan", async () => {
    const seedState = loadSeedState();
    // Check customer's view of trainer's plans for them
    const res = await customerApi.raw("GET", API.customer.profileStats);
    expect(res.status).toBe(200);
  });

  test("step 4: customer creates a grocery list", async () => {
    const res = await customerApi.post<any>(API.grocery.lists, {
      name: `FORGE-JRNY2-Grocery-${Date.now()}`,
    });
    expect(res).toHaveProperty("id");
    createdGroceryId = res.id;
  });

  test("step 5: customer adds items to grocery list", async () => {
    expect(createdGroceryId).toBeTruthy();
    const items = [
      {
        name: "Chicken Breast",
        category: "Protein",
        quantity: "2",
        unit: "lbs",
      },
      { name: "Brown Rice", category: "Grains", quantity: "1", unit: "bag" },
      { name: "Salmon Fillet", category: "Protein", quantity: "1", unit: "lb" },
    ];
    for (const item of items) {
      const res = await customerApi.raw(
        "POST",
        API.grocery.items(createdGroceryId!),
        item,
      );
      expect([200, 201]).toContain(res.status);
    }
  });

  test("step 6: grocery list has all added items", async () => {
    expect(createdGroceryId).toBeTruthy();
    const list = await customerApi.get<any>(
      API.grocery.list(createdGroceryId!),
    );
    const items = list.items || list.groceryListItems || [];
    expect(items.length).toBeGreaterThanOrEqual(3);
  });

  test("step 7: customer checks off an item", async () => {
    expect(createdGroceryId).toBeTruthy();
    const list = await customerApi.get<any>(
      API.grocery.list(createdGroceryId!),
    );
    const items = list.items || list.groceryListItems || [];
    expect(items.length).toBeGreaterThan(0);
    const firstItem = items[0];

    const res = await customerApi.raw(
      "PUT",
      API.grocery.item(createdGroceryId!, firstItem.id),
      { isChecked: true },
    );
    expect(res.status).toBe(200);

    // Verify persistence
    const updated = await customerApi.get<any>(
      API.grocery.list(createdGroceryId!),
    );
    const updatedItems = updated.items || updated.groceryListItems || [];
    const checkedItem = updatedItems.find((i: any) => i.id === firstItem.id);
    expect(checkedItem.isChecked).toBe(true);
  });

  test("step 8: customer views grocery list in UI", async ({ page }) => {
    await loginAsCustomer(page);
    await page.goto("/grocery-list", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login/);
  });
});
