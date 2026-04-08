/**
 * PDF-01: PDF Export
 *
 * Actor: Trainer (as-trainer storageState)
 * Runs in: 'as-trainer' project
 *
 * Hard assertions only — every test FAILS when the feature breaks.
 */

import { test, expect } from "@playwright/test";
import { ROUTES, API, TIMEOUTS } from "../../helpers/constants.js";
import { ForgeApiClient } from "../../helpers/api-client.js";
import { loadSeedState } from "../../helpers/auth-helpers.js";

test.describe("PDF-01 — PDF Export", () => {
  // ---------------------------------------------------------------------------
  // API: basic export
  // ---------------------------------------------------------------------------

  test("API POST /api/pdf/export returns content-type application/pdf", async () => {
    const trainerApi = await ForgeApiClient.loginAs("trainer");
    const res = await trainerApi.raw("POST", API.pdf.export, {
      mealPlanData: { planName: "Test Export", meals: [] },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/pdf");
  });

  test("API POST /api/pdf/export response has content-length > 5000 bytes", async () => {
    const trainerApi = await ForgeApiClient.loginAs("trainer");
    const res = await trainerApi.raw("POST", API.pdf.export, {
      mealPlanData: { planName: "Size Check Export", meals: [] },
    });

    expect(res.status).toBe(200);
    const contentLength = res.headers.get("content-length");
    if (contentLength) {
      expect(parseInt(contentLength, 10)).toBeGreaterThan(5_000);
    } else {
      // content-length may be absent if chunked — verify body is a non-empty ArrayBuffer
      expect(res.body).toBeInstanceOf(ArrayBuffer);
      expect((res.body as ArrayBuffer).byteLength).toBeGreaterThan(5_000);
    }
  });

  // ---------------------------------------------------------------------------
  // API: plan-specific export
  // ---------------------------------------------------------------------------

  test("API POST /api/pdf/export/meal-plan/:planId with seeded plan returns 200", async () => {
    const trainerApi = await ForgeApiClient.loginAs("trainer");
    const seedState = loadSeedState();
    const planId = seedState.planIds.weightLoss;

    const res = await trainerApi.raw("POST", API.pdf.exportPlan(planId), {});

    expect(res.status).toBe(200);
  });

  // ---------------------------------------------------------------------------
  // API: role enforcement
  // ---------------------------------------------------------------------------

  test("API POST /api/pdf/export called by customer returns 403", async () => {
    const customerApi = await ForgeApiClient.loginAs("customer");
    const res = await customerApi.raw("POST", API.pdf.export, {
      mealPlanData: { planName: "Forbidden Export", meals: [] },
    });

    expect([403, 401]).toContain(res.status);
  });

  // ---------------------------------------------------------------------------
  // UI: export button
  // ---------------------------------------------------------------------------

  test("/trainer/meal-plans page has an export or download button", async ({
    page,
  }) => {
    await page.goto(ROUTES.trainerMealPlans, { waitUntil: "domcontentloaded" });

    const exportBtn = page.locator(
      'button:has-text("Export"), button:has-text("Download"), button:has-text("PDF"), a:has-text("Export"), a:has-text("PDF"), [aria-label*="export" i], [aria-label*="pdf" i]',
    );
    await expect(exportBtn.first()).toBeVisible({
      timeout: TIMEOUTS.navigation,
    });
  });

  // ---------------------------------------------------------------------------
  // API: customerName parameter
  // ---------------------------------------------------------------------------

  test("API POST /api/pdf/export with customerName parameter succeeds", async () => {
    const trainerApi = await ForgeApiClient.loginAs("trainer");
    const res = await trainerApi.raw("POST", API.pdf.export, {
      mealPlanData: { planName: "Named Export", meals: [] },
      customerName: "Jane Doe",
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/pdf");
  });
});
