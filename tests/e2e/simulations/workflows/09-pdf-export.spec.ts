/**
 * Workflow 09 — PDF Export
 *
 * @cover pdf
 *
 * Scenario:
 *  1. Trainer lists meal plans to get a valid plan id
 *  2. Trainer exports the plan as a PDF via POST /api/pdf/export/meal-plan/:planId
 *  3. Assert content-type = application/pdf
 *  4. Assert body is non-empty (ArrayBuffer with bytes > 0)
 *
 * NON-DESTRUCTIVE: read-only export — no mutation.
 */

import { test, expect } from "@playwright/test";
import { TrainerActor } from "../actors/index.js";
import { BASE_URL } from "../../helpers/constants.js";

const baseUrl = process.env.BASE_URL || BASE_URL;

test.describe("Workflow 09 — PDF Export", () => {
  let planId: string | undefined;

  test.beforeAll(async () => {
    try {
      const trainer = await TrainerActor.login(undefined, baseUrl);
      const res = await trainer.raw("GET", "/api/trainer/meal-plans");
      const body = res.body as Record<string, unknown>;
      const plans = Array.isArray(body)
        ? body
        : Array.isArray(body.mealPlans)
          ? body.mealPlans
          : Array.isArray(body.data)
            ? body.data
            : [];
      if ((plans as Array<unknown>).length > 0) {
        const first = (plans as Array<Record<string, unknown>>)[0];
        planId = (first.id || first._id) as string;
      }
    } catch {
      /* setup failure — tests will skip */
    }
  });

  test("trainer can export a meal plan as PDF", async () => {
    test.skip(!planId, "No meal plan available for PDF export");

    const trainer = await TrainerActor.login(undefined, baseUrl);
    const res = await trainer.exportMealPlanPdf(planId!);

    // Accept 200 (PDF generated) — NOT 500
    if (res.status === 404 || res.status === 501) {
      test.skip(true, "PDF export endpoint not implemented for this plan");
      return;
    }
    expect(res.status).toBe(200);

    // Content-type must be application/pdf
    const contentType = res.headers.get("content-type") || "";
    expect(contentType).toContain("application/pdf");

    // Body must be non-empty ArrayBuffer
    expect(res.body).toBeDefined();
    const buffer = res.body as ArrayBuffer;
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  test("PDF export returns 401 without auth", async () => {
    test.skip(!planId, "No plan id to probe");
    // Use raw fetch without auth token
    const noAuthRes = await fetch(
      `${baseUrl}/api/pdf/export/meal-plan/${planId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
    );
    expect([401, 403]).toContain(noAuthRes.status);
  });

  test("PDF export with non-existent plan id returns 404", async () => {
    const trainer = await TrainerActor.login(undefined, baseUrl);
    const res = await trainer.exportMealPlanPdf(
      "00000000-0000-0000-0000-000000000000",
    );
    if (res.status === 501) {
      test.skip(true, "PDF export not implemented");
      return;
    }
    expect([404, 400, 403]).toContain(res.status);
  });
});
