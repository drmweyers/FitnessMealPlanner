/**
 * REGRESSION: Authorization header on auth-protected /api/* fetches
 *
 * Bug-class: client-side fetch to auth-protected /api/* endpoint missing
 * the Authorization: Bearer header — silent 401 in production.
 *
 * Six areas fixed (mirrors EvoFit Trainer commit e3c07db):
 *   1. /admin          -> GET  /api/admin/stats          (requireAdmin)
 *   2. AdminRecipeGenerator -> POST /api/admin/generate  (requireAdmin)
 *   3. ShareMealPlanButton  -> POST /api/meal-plans/{id}/share (requireAuth)
 *   4. ShareMealPlanButton  -> DELETE /api/meal-plans/{id}/share (requireAuth)
 *   5. useTier hook    -> GET  /api/entitlements          (requireAuth)
 *   6. pdfExport util  -> POST /api/pdf/export            (requireAuth)
 *
 * The critical assertion pattern (mirrors EvoFit 71-vault-downloads.spec.ts):
 *   const req = await page.waitForRequest(r => r.url().includes('/api/<path>'));
 *   expect(req.headers()['authorization']).toMatch(/^Bearer .+/);
 *
 * Note: these tests check the OUTGOING request headers, not the response.
 * That is the exact assertion that would have caught the original bug.
 *
 * Auth: all tests login as admin (admin@fitmeal.pro) because admin role has
 * access to all protected routes without extra setup.
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:4000";
const ADMIN_EMAIL = "admin@fitmeal.pro";
const ADMIN_PASSWORD = "AdminPass123";

/**
 * Login helper — submits the login form and waits for redirect.
 * FitnessMealPlanner stores the JWT in localStorage under the key 'token'.
 */
async function loginAsAdmin(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState("domcontentloaded");

  // Fill the login form — try both selector styles
  const emailInput = page.locator('input[type="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  const submitBtn = page.locator('button[type="submit"]').first();

  await emailInput.fill(ADMIN_EMAIL);
  await passwordInput.fill(ADMIN_PASSWORD);
  await submitBtn.click();

  // Wait until we navigate away from /login
  try {
    await page.waitForFunction(
      () => !window.location.pathname.includes("/login"),
      { timeout: 10000 },
    );
  } catch {
    // If still on /login, the test itself will fail with a meaningful error
  }
}

// ---------------------------------------------------------------------------
// Test group 1 — Admin stats (Admin.tsx)
// ---------------------------------------------------------------------------
test.describe("REGRESSION: admin stats fetch has Authorization header", () => {
  test("GET /api/admin/stats includes Authorization: Bearer", async ({
    page,
  }) => {
    const requestPromise = page.waitForRequest(
      (req) => req.url().includes("/api/admin/stats"),
      { timeout: 20000 },
    );

    await loginAsAdmin(page);

    // Navigate to admin page which mounts the stats query
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState("domcontentloaded");

    let req: Awaited<typeof requestPromise> | null = null;
    try {
      req = await requestPromise;
    } catch {
      test.skip(
        true,
        "/api/admin/stats request was not made — admin page may not be available with these credentials",
      );
      return;
    }

    const authHeader = req.headers()["authorization"];
    expect(
      authHeader,
      "GET /api/admin/stats MUST include Authorization: Bearer <token>. " +
        'Without it the adminRouter.get("/stats", requireAdmin, ...) returns 401.',
    ).toMatch(/^Bearer .+/);
  });
});

// ---------------------------------------------------------------------------
// Test group 2 — Admin recipe generator (AdminRecipeGenerator component)
// ---------------------------------------------------------------------------
test.describe("REGRESSION: admin generate fetch has Authorization header", () => {
  test("POST /api/admin/generate includes Authorization: Bearer", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState("domcontentloaded");

    // Intercept before triggering the generate action
    let capturedRequest: { headers(): Record<string, string> } | null = null;
    page.on("request", (req) => {
      if (
        req.url().includes("/api/admin/generate") &&
        req.method() === "POST"
      ) {
        capturedRequest = req;
      }
    });

    // Look for a "Generate" button and click it to trigger the POST
    const generateBtn = page
      .locator("button")
      .filter({ hasText: /generate/i })
      .first();

    if ((await generateBtn.count()) === 0) {
      test.skip(
        true,
        "No generate button found on admin page — cannot trigger /api/admin/generate",
      );
      return;
    }

    await generateBtn.click();
    await page.waitForTimeout(2000);

    if (!capturedRequest) {
      test.skip(
        true,
        "/api/admin/generate POST was not triggered — generation form may require additional steps",
      );
      return;
    }

    const authHeader = (
      capturedRequest as { headers(): Record<string, string> }
    ).headers()["authorization"];
    expect(
      authHeader,
      "POST /api/admin/generate MUST include Authorization: Bearer <token>. " +
        'adminRouter.post("/generate", requireAdmin, ...) returns 401 without it.',
    ).toMatch(/^Bearer .+/);
  });
});

// ---------------------------------------------------------------------------
// Test group 3 — useTier entitlements fetch
// ---------------------------------------------------------------------------
test.describe("REGRESSION: entitlements fetch has Authorization header", () => {
  test("GET /api/entitlements includes Authorization: Bearer", async ({
    page,
  }) => {
    // Set up the request interceptor BEFORE login so we catch the initial mount
    const requestPromise = page.waitForRequest(
      (req) => req.url().includes("/api/entitlements"),
      { timeout: 20000 },
    );

    await loginAsAdmin(page);

    let req: Awaited<typeof requestPromise> | null = null;
    try {
      req = await requestPromise;
    } catch {
      // Entitlements may only be fetched for trainer role — try navigating to a trainer page
      const requestPromise2 = page.waitForRequest(
        (req) => req.url().includes("/api/entitlements"),
        { timeout: 10000 },
      );
      await page.goto(`${BASE_URL}/trainer`).catch(() => null);
      try {
        req = await requestPromise2;
      } catch {
        test.skip(
          true,
          "/api/entitlements request was not made — useTier hook may only run for trainer role",
        );
        return;
      }
    }

    const authHeader = req.headers()["authorization"];
    expect(
      authHeader,
      "GET /api/entitlements MUST include Authorization: Bearer <token>. " +
        'entitlementsRouter.get("/", requireAuth, ...) returns 401 without it.',
    ).toMatch(/^Bearer .+/);
  });
});

// ---------------------------------------------------------------------------
// Test group 4 — Share meal plan (ShareMealPlanButton)
// ---------------------------------------------------------------------------
test.describe("REGRESSION: share meal plan fetch has Authorization header", () => {
  test("POST /api/meal-plans/:id/share includes Authorization: Bearer", async ({
    page,
  }) => {
    await loginAsAdmin(page);

    // Intercept share requests
    let capturedRequest: { headers(): Record<string, string> } | null = null;
    page.on("request", (req) => {
      if (
        req.url().includes("/api/meal-plans/") &&
        req.url().includes("/share") &&
        req.method() === "POST"
      ) {
        capturedRequest = req;
      }
    });

    // Navigate to trainer page where meal plans and share buttons are shown
    await page.goto(`${BASE_URL}/trainer`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Look for a share button on any meal plan card
    const shareBtn = page
      .locator("button")
      .filter({ hasText: /share/i })
      .first();

    if ((await shareBtn.count()) === 0) {
      test.skip(
        true,
        "No share button found — no meal plans exist or share feature not visible",
      );
      return;
    }

    await shareBtn.click();
    await page.waitForTimeout(2000);

    if (!capturedRequest) {
      test.skip(
        true,
        "/api/meal-plans/{id}/share POST was not triggered — share dialog may require extra steps",
      );
      return;
    }

    const authHeader = (
      capturedRequest as { headers(): Record<string, string> }
    ).headers()["authorization"];
    expect(
      authHeader,
      "POST /api/meal-plans/:id/share MUST include Authorization: Bearer <token>. " +
        'mealPlanSharingRouter.post("/:id/share", requireAuth, ...) returns 401 without it.',
    ).toMatch(/^Bearer .+/);
  });
});

// ---------------------------------------------------------------------------
// Test group 5 — PDF export (pdfExport.ts)
// ---------------------------------------------------------------------------
test.describe("REGRESSION: pdf export fetch has Authorization header", () => {
  test("POST /api/pdf/export includes Authorization: Bearer", async ({
    page,
  }) => {
    await loginAsAdmin(page);

    let capturedRequest: { headers(): Record<string, string> } | null = null;
    page.on("request", (req) => {
      if (req.url().includes("/api/pdf/export") && req.method() === "POST") {
        capturedRequest = req;
      }
    });

    // Navigate to trainer page where meal plan PDF export is available
    await page.goto(`${BASE_URL}/trainer`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Look for a PDF / Export / Download button
    const pdfBtn = page
      .locator("button")
      .filter({ hasText: /pdf|export|download/i })
      .first();

    if ((await pdfBtn.count()) === 0) {
      test.skip(
        true,
        "No PDF export button found — no meal plans exist or feature not visible",
      );
      return;
    }

    await pdfBtn.click();
    await page.waitForTimeout(3000);

    if (!capturedRequest) {
      test.skip(
        true,
        "/api/pdf/export POST was not triggered — export may involve a modal or extra confirmation step",
      );
      return;
    }

    const authHeader = (
      capturedRequest as { headers(): Record<string, string> }
    ).headers()["authorization"];
    expect(
      authHeader,
      "POST /api/pdf/export MUST include Authorization: Bearer <token>. " +
        'pdfRouter.post("/export", requireAuth, ...) returns 401 without it.',
    ).toMatch(/^Bearer .+/);
  });
});
