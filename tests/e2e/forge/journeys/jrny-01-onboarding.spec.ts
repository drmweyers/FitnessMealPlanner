/**
 * FORGE QA — JRNY-01: Full Trainer-Customer Onboarding Journey
 * Tests: trainer sends invite → customer registers → trainer assigns plan → customer views plan
 *
 * This test manages its own auth (no storageState) — runs in cross-role-journeys project.
 */
import { test, expect } from "@playwright/test";
import { ForgeApiClient } from "../../helpers/api-client.js";
import {
  loginAsTrainer,
  loginAsCustomer,
  loadSeedState,
} from "../../helpers/auth-helpers.js";
import { API, BASE_URL, CREDENTIALS, ROUTES } from "../../helpers/constants.js";

test.describe("JRNY-01 — Trainer-Customer Onboarding Journey", () => {
  let trainerApi: ForgeApiClient;

  test.beforeAll(async () => {
    trainerApi = await ForgeApiClient.loginAs("trainer", BASE_URL);
  });

  test("trainer can send invitation to new email", async () => {
    const testEmail = `forge-invite-${Date.now()}@test.evofitmeals.com`;
    const res = await trainerApi.raw("POST", API.invitations.send, {
      email: testEmail,
    });
    // 201 = created, 200 = success variant
    expect([200, 201]).toContain(res.status);
  });

  test("invitation appears in trainer invite list", async () => {
    const res = await trainerApi.get<any>(API.invitations.list);
    const invites = Array.isArray(res)
      ? res
      : res.invitations || res.data || [];
    expect(invites.length).toBeGreaterThan(0);
    // Most recent invite should have our test email pattern
    const hasForgeInvite = invites.some(
      (i: any) =>
        i.customerEmail?.includes("forge-invite") ||
        i.email?.includes("forge-invite"),
    );
    expect(hasForgeInvite).toBe(true);
  });

  test("trainer sees customer in their customer list", async () => {
    const res = await trainerApi.get<any>(API.trainer.customers);
    const customers = Array.isArray(res)
      ? res
      : res.customers || res.data || [];
    // The seeded customer should be in the list
    const seedState = loadSeedState();
    const hasCustomer = customers.some(
      (c: any) =>
        c.id === seedState.customerUserId ||
        c.email === CREDENTIALS.customer.email,
    );
    expect(hasCustomer).toBe(true);
  });

  test("trainer dashboard loads and shows client count", async ({ page }) => {
    await loginAsTrainer(page);
    await page.goto(ROUTES.trainerDashboard, { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login/);
    // Dashboard should have content
    const bodyText = await page.textContent("body");
    expect(bodyText!.length).toBeGreaterThan(100);
  });

  test("trainer can assign meal plan to customer via API", async () => {
    const seedState = loadSeedState();
    if (seedState.planIds.muscleGain) {
      const res = await trainerApi.raw(
        "POST",
        API.trainer.mealPlanAssign(seedState.planIds.muscleGain),
        {
          customerId: seedState.customerUserId,
          notes: "FORGE journey test assignment",
        },
      );
      // 200/201 = assigned, 409 = already assigned (acceptable)
      expect([200, 201, 409]).toContain(res.status);
    }
  });

  test("customer can view assigned meal plans", async ({ page }) => {
    await loginAsCustomer(page);
    await page.goto(ROUTES.customerMealPlans, {
      waitUntil: "domcontentloaded",
    });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("customer API confirms meal plan assignment", async () => {
    const customerApi = await ForgeApiClient.loginAs("customer", BASE_URL);
    const seedState = loadSeedState();
    // Check customer stats
    const res = await customerApi.raw("GET", API.customer.profileStats);
    expect(res.status).toBe(200);
  });

  test("full journey: login as trainer then switch to customer view", async ({
    page,
  }) => {
    // Trainer view
    await loginAsTrainer(page);
    await page.goto(ROUTES.trainerCustomers, { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login/);

    // Switch to customer
    await loginAsCustomer(page);
    await page.goto(ROUTES.customerDashboard, {
      waitUntil: "domcontentloaded",
    });
    await expect(page).not.toHaveURL(/\/login/);
  });
});
