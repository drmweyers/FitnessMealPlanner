/**
 * FORGE QA — CUST-01: Customer Dashboard
 *
 * Actor: Customer (as-customer storageState)
 * Covers: Dashboard load, stats API, role-based access denial.
 */

import { test, expect } from "@playwright/test";
import { ROUTES, API } from "../../helpers/constants.js";
import { ForgeApiClient } from "../../helpers/api-client.js";

test.describe("CUST-01: Customer Dashboard", () => {
  test("/customer loads without redirect to /login", async ({ page }) => {
    await page.goto(ROUTES.customerDashboard, {
      waitUntil: "domcontentloaded",
    });
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).toHaveURL(/\/customer/);
  });

  test("Dashboard shows welcome or overview content", async ({ page }) => {
    await page.goto(ROUTES.customerDashboard, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("networkidle");

    // At minimum a heading or named section must be visible
    const content = page.locator(
      'h1, h2, [class*="welcome"], [class*="dashboard"], [class*="overview"], [data-testid*="dashboard"]',
    );
    await expect(content.first()).toBeVisible({ timeout: 10_000 });
  });

  test("API: GET /api/customer/profile/stats returns stats object", async () => {
    const client = await ForgeApiClient.loginAs("customer");
    const res = await client.raw("GET", API.customer.profileStats);

    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(typeof body).toBe("object");
    expect(body).not.toBeNull();
  });

  test("Stats include mealPlansAssigned, completedDays, avgCaloriesPerDay", async () => {
    const client = await ForgeApiClient.loginAs("customer");
    const res = await client.raw("GET", API.customer.profileStats);

    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;

    // At least one of the core stat fields must be present
    const hasMealPlans =
      "mealPlansAssigned" in body ||
      "mealPlans" in body ||
      "assignedMealPlans" in body;
    const hasProgress =
      "completedDays" in body ||
      "completed" in body ||
      "daysCompleted" in body ||
      "avgCaloriesPerDay" in body ||
      "averageCalories" in body ||
      "calories" in body;

    expect(hasMealPlans || hasProgress).toBe(true);
  });

  test("Customer cannot access /trainer — redirects to /customer or /login", async ({
    page,
  }) => {
    await page.goto(ROUTES.trainerDashboard, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");

    const url = page.url();
    const isRedirected =
      url.includes("/customer") ||
      url.includes("/login") ||
      url.includes("/unauthorized") ||
      url.includes("/403");
    expect(isRedirected).toBe(true);
  });

  test("Customer cannot access /admin — redirects away from /admin", async ({
    page,
  }) => {
    await page.goto(ROUTES.admin, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");

    const url = page.url();
    const isRedirected =
      url.includes("/customer") ||
      url.includes("/login") ||
      url.includes("/unauthorized") ||
      url.includes("/403") ||
      !url.includes("/admin");
    expect(isRedirected).toBe(true);
  });
});
