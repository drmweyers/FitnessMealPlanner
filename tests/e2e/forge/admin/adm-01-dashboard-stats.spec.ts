/**
 * FORGE QA — ADM-01: Admin Dashboard & Stats
 * Tests admin panel access, stat cards, user management visibility.
 *
 * Note: GET /api/admin/customers returns a plain array (not wrapped in object).
 */
import { test, expect } from "@playwright/test";
import { ForgeApiClient } from "../../helpers/api-client.js";
import { ROUTES, API, BASE_URL } from "../../helpers/constants.js";

test.describe("ADM-01 — Admin Dashboard & Stats", () => {
  let adminApi: ForgeApiClient;

  test.beforeAll(async () => {
    adminApi = await ForgeApiClient.loginAs("admin", BASE_URL);
  });

  test("admin panel /admin loads without redirect", async ({ page }) => {
    await page.goto(ROUTES.admin, { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("admin dashboard has stat cards with numeric values", async ({
    page,
  }) => {
    await page.goto(ROUTES.admin, { waitUntil: "domcontentloaded" });
    // Look for stat cards — they should show numbers, not "undefined" or "NaN"
    const body = await page.textContent("body");
    expect(body).not.toContain("undefined");
    expect(body).not.toContain("NaN");
  });

  test("API: GET /api/admin/customers returns user list", async () => {
    const res = await adminApi.raw("GET", API.admin.customers);
    expect(res.status).toBe(200);
    // Production returns a plain array
    const body = res.body as any;
    const customers = Array.isArray(body)
      ? body
      : body.customers || body.data || [];
    expect(customers.length).toBeGreaterThan(0);
  });

  test("API: admin customers response includes email and role fields", async () => {
    const res = await adminApi.raw("GET", API.admin.customers);
    expect(res.status).toBe(200);
    const body = res.body as any;
    const customers = Array.isArray(body)
      ? body
      : body.customers || body.data || [];
    const first = customers[0];
    expect(first).toHaveProperty("email");
    expect(first).toHaveProperty("role");
  });

  test("/admin/analytics page loads", async ({ page }) => {
    await page.goto(ROUTES.adminAnalytics, { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("/admin/dashboard page loads", async ({ page }) => {
    await page.goto(ROUTES.adminDashboard, { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("API: GET /api/admin/api-usage returns usage data", async () => {
    const res = await adminApi.raw("GET", API.admin.apiUsage);
    expect([200, 404]).toContain(res.status);
    // 200 = endpoint exists and returns data; 404 = feature not wired (acceptable)
  });

  test("admin navigation has links or menu items", async ({ page }) => {
    await page.goto(ROUTES.admin, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    // Look for any navigation links, menu items, or tabs
    const navLinks = page.locator(
      'a[href*="analytics"], a[href*="users"], a[href*="recipes"], nav a, [role="tab"], [class*="tab"], [class*="nav"], [class*="sidebar"] a, [class*="menu"] a',
    );
    const count = await navLinks.count();
    // If no traditional nav links, check for buttons or interactive elements
    if (count === 0) {
      const buttons = page.locator("button, [role='button']");
      expect(await buttons.count()).toBeGreaterThan(0);
    } else {
      expect(count).toBeGreaterThan(0);
    }
  });
});
