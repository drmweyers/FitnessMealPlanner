/**
 * FORGE QA Warfare v2 — Regression: R003
 * @cover { suite: "regression", role: "trainer", endpoint: "/api/pdf/export/meal-plan/:id", assertionType: "invariant" }
 *
 * Bug: PDF SPA trap — `page.goto()` was used for HTML→PDF rendering inside the server.
 *      When the SPA router is active, page.goto() loads the full app shell instead
 *      of the meal plan content, producing PDFs with React bundle noise instead of data.
 *
 * Regression: POST /api/pdf/export/meal-plan/:id
 *   1. Assert content-type is application/pdf.
 *   2. Download the bytes — verify it's a valid PDF (starts with %PDF-).
 *   3. Assert the SPA shell is NOT in the PDF (no React/Vite bundle strings).
 *
 * NON-DESTRUCTIVE: read-only PDF generation.
 */

import { test, expect } from "@playwright/test";
import { TrainerActor } from "../actors/index.js";
import { BASE_URL } from "../../helpers/constants.js";

// Strings that would appear in an SPA shell PDF (from page.goto bug)
const SPA_SHELL_SIGNATURES = [
  "vite",
  "__vite_preload",
  "react-dom",
  "TanStackQuery",
  "import.meta",
  "_interopRequireDefault",
];

test.describe("R003 — PDF export uses page.setContent() not page.goto() (no SPA shell)", () => {
  let trainer: TrainerActor;
  let testPlanId: string | undefined;

  test.beforeAll(async () => {
    trainer = await TrainerActor.login(undefined, BASE_URL);

    // Find an existing meal plan to export
    const plansRes = await trainer.raw(
      "GET",
      "/api/trainer/meal-plans?limit=5",
    );
    const body = plansRes.body as Record<string, unknown>;
    const plans = Array.isArray(body)
      ? (body as Array<Record<string, unknown>>)
      : ((body?.mealPlans as Array<Record<string, unknown>>) ??
        (body?.data as Array<Record<string, unknown>>) ??
        []);

    if (plans.length > 0) {
      testPlanId = plans[0].id as string;
    }
  });

  test("PDF export returns application/pdf content-type", async () => {
    if (!testPlanId) {
      test.skip(true, "No meal plans available — seed the DB first.");
      return;
    }

    const res = await trainer.exportMealPlanPdf(testPlanId);

    if (res.status === 404) {
      test.skip(
        true,
        "PDF export endpoint not found — may need seeded meal plan.",
      );
      return;
    }

    expect(res.status).toBe(200);

    const contentType = res.headers.get("content-type") ?? "";
    expect(
      contentType,
      "PDF export must return application/pdf content-type. " +
        "If it returns text/html, the SPA trap may still be present.",
    ).toContain("application/pdf");
  });

  test("PDF bytes start with %PDF- signature (valid PDF)", async () => {
    if (!testPlanId) {
      test.skip(true, "No meal plans available.");
      return;
    }

    const res = await trainer.exportMealPlanPdf(testPlanId);

    if (res.status !== 200) {
      test.skip(
        true,
        `PDF export returned ${res.status} — skipping content check.`,
      );
      return;
    }

    const body = res.body;
    let pdfStart: string;

    if (body instanceof ArrayBuffer) {
      // eslint-disable-next-line no-undef
      pdfStart = new TextDecoder().decode(new Uint8Array(body).slice(0, 10));
    } else if (typeof body === "string") {
      pdfStart = body.slice(0, 10);
    } else {
      pdfStart = String(body).slice(0, 10);
    }

    expect(
      pdfStart,
      `PDF does not start with "%PDF-" — got "${pdfStart}". ` +
        "The response may be HTML (SPA shell) instead of a real PDF.",
    ).toContain("%PDF-");
  });

  test("PDF content does NOT contain SPA shell artifacts", async () => {
    if (!testPlanId) {
      test.skip(true, "No meal plans available.");
      return;
    }

    const res = await trainer.exportMealPlanPdf(testPlanId);

    if (res.status !== 200) {
      test.skip(true, `PDF export returned ${res.status}.`);
      return;
    }

    // Convert body to string for content inspection
    let content: string;
    if (res.body instanceof ArrayBuffer) {
      // PDF binary — decode as latin1 to find any embedded text
      // eslint-disable-next-line no-undef
      content = new TextDecoder("latin1").decode(new Uint8Array(res.body));
    } else {
      content = String(res.body);
    }

    for (const sig of SPA_SHELL_SIGNATURES) {
      expect(
        content,
        `PDF contains "${sig}" — SPA shell artifact detected. ` +
          "R003 regression: the PDF generator is using page.goto() instead of page.setContent().",
      ).not.toContain(sig);
    }
  });
});
