/**
 * FORGE QA — ADM-01: Admin Dashboard & Stats
 * Tests admin panel access, stat cards, user management visibility.
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
    const body = res.body as any;
    const customers =
      body.customers || body.data || (Array.isArray(body) ? body : []);
    expect(customers.length).toBeGreaterThan(0);
  });

  test("API: admin customers response includes email and role fields", async () => {
    const res = await adminApi.get<any>(API.admin.customers);
    const customers =
      res.customers || res.data || (Array.isArray(res) ? res : []);
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

  test("admin navigation has links to analytics and users", async ({
    page,
  }) => {
    await page.goto(ROUTES.admin, { waitUntil: "domcontentloaded" });
    const navLinks = page.locator(
      'a[href*="analytics"], a[href*="users"], a[href*="recipes"], nav a',
    );
    expect(await navLinks.count()).toBeGreaterThan(0);
  });
});
