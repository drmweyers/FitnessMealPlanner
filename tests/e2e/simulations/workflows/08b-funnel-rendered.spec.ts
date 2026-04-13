/**
 * Workflow 08b — Funnel Rendered (true SPA test)
 *
 * @cover funnel rendered
 *
 * 08-funnel-conversion.spec.ts asserts the funnel pages return 200 and the
 * SPA shell ships. This spec uses Playwright's page.goto so React renders,
 * then asserts the canonical pricing IS visible to a real user.
 *
 * NON-DESTRUCTIVE: pure read-only navigation against production.
 */

import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "https://evofitmeals.com";

test.describe("Workflow 08b — Funnel Rendered (page.goto)", () => {
  test("starter page renders $199 in DOM @cover FUN-101", async ({ page }) => {
    await page.goto(`${BASE}/starter`, { waitUntil: "networkidle" });
    const body = await page.locator("body").innerText();
    expect(body, "Rendered starter page must contain '199'").toContain("199");
  });

  test("professional page renders $299 in DOM @cover FUN-102", async ({
    page,
  }) => {
    await page.goto(`${BASE}/professional`, { waitUntil: "networkidle" });
    const body = await page.locator("body").innerText();
    expect(body, "Rendered professional page must contain '299'").toContain(
      "299",
    );
  });

  test("enterprise page renders $399 in DOM @cover FUN-103", async ({
    page,
  }) => {
    await page.goto(`${BASE}/enterprise`, { waitUntil: "networkidle" });
    const body = await page.locator("body").innerText();
    expect(body, "Rendered enterprise page must contain '399'").toContain(
      "399",
    );
  });

  test("pricing page renders all 3 canonical prices @cover FUN-104", async ({
    page,
  }) => {
    await page.goto(`${BASE}/pricing`, { waitUntil: "networkidle" });
    const body = await page.locator("body").innerText();
    expect(body).toContain("199");
    expect(body).toContain("299");
    expect(body).toContain("399");
  });

  test("legacy monthly pricing $14.99/$29.99/$59.99 must NOT be visible @cover FUN-105", async ({
    page,
  }) => {
    await page.goto(`${BASE}/pricing`, { waitUntil: "networkidle" });
    const body = await page.locator("body").innerText();
    // Canonical lock: legacy monthly tiers are deprecated and must not appear
    expect(body).not.toContain("$14.99");
    expect(body).not.toContain("$29.99");
    expect(body).not.toContain("$59.99");
  });

  test("get-started page is the entry funnel (no auth redirect) @cover FUN-106", async ({
    page,
  }) => {
    const res = await page.goto(`${BASE}/get-started`);
    expect(res?.status()).toBe(200);
    expect(page.url()).not.toContain("/login");
  });

  test("API returns canonical pricing JSON @cover FUN-107", async ({
    request,
  }) => {
    const res = await request.get(`${BASE}/api/v1/public/pricing`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.tiers.starter.amount).toBe(19900);
    expect(data.tiers.professional.amount).toBe(29900);
    expect(data.tiers.enterprise.amount).toBe(39900);
  });
});
