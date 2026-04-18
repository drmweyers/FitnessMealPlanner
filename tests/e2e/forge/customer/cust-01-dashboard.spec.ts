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
    await page.waitForTimeout(2_000);

    const url = page.url();
    // Customer must NOT be redirected to login
    expect(url).not.toMatch(/\/login/);
    // Customer should be on /customer or /dashboard
    const isCustomerArea =
      url.includes("/customer") ||
      url.includes("/dashboard") ||
      url.includes("/meal");
    expect(isCustomerArea).toBe(true);
  });

  test("Dashboard shows welcome or overview content", async ({ page }) => {
    await page.goto(ROUTES.customerDashboard, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("networkidle");

    // Wait for SPA to render — customer dashboard loads content asynchronously
    await page.waitForTimeout(3_000);

    // Use :visible pseudo-class or text matching to avoid hidden mobile headers
    const pageText = await page.textContent("body");
    // Dashboard must have meaningful text content
    expect(pageText!.length).toBeGreaterThan(100);

    // Check for dashboard-related text
    const hasDashboardContent =
      pageText!.includes("Dashboard") ||
      pageText!.includes("Meal") ||
      pageText!.includes("Plan") ||
      pageText!.includes("Progress") ||
      pageText!.includes("Welcome");
    expect(hasDashboardContent).toBe(true);
  });

  test("API: GET /api/customer/profile/stats returns stats object", async () => {
    const client = await ForgeApiClient.loginAs("customer");
    const res = await client.raw("GET", API.customer.profileStats);

    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(typeof body).toBe("object");
    expect(body).not.toBeNull();
  });

  test("Stats include relevant customer fields", async () => {
    const client = await ForgeApiClient.loginAs("customer");
    const res = await client.raw("GET", API.customer.profileStats);

    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;

    // Production returns: totalMealPlans, completedDays, favoriteRecipes, avgCaloriesPerDay, currentStreak
    const hasMealPlans =
      "totalMealPlans" in body ||
      "mealPlansAssigned" in body ||
      "mealPlans" in body ||
      "assignedMealPlans" in body;
    const hasProgress =
      "completedDays" in body ||
      "completed" in body ||
      "daysCompleted" in body ||
      "avgCaloriesPerDay" in body ||
      "averageCalories" in body ||
      "calories" in body ||
      "currentStreak" in body;

    expect(hasMealPlans || hasProgress).toBe(true);
  });

  test("Customer cannot access /trainer — access denied or redirected", async ({
    page,
  }) => {
    await page.goto(ROUTES.trainerDashboard, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2_000);

    const url = page.url();
    const pageText = await page.textContent("body");

    // Customer must either be redirected away OR shown an access denied page
    const isRedirected =
      url.includes("/customer") ||
      url.includes("/login") ||
      url.includes("/unauthorized");
    const isAccessDenied =
      pageText!.includes("Access Denied") ||
      pageText!.includes("403") ||
      pageText!.includes("Forbidden") ||
      pageText!.includes("permission");

    expect(isRedirected || isAccessDenied).toBe(true);
  });

  test("Customer cannot access /admin — redirects away from /admin", async ({
    page,
  }) => {
    await page.goto(ROUTES.admin, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2_000);

    const url = page.url();
    // Customer must be redirected away from /admin
    const isRedirected =
      !url.endsWith("/admin") ||
      url.includes("/customer") ||
      url.includes("/login") ||
      url.includes("/unauthorized") ||
      url.includes("/403");
    expect(isRedirected).toBe(true);
  });
});
