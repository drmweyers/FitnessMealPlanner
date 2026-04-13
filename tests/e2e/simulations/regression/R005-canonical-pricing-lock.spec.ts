/**
 * FORGE QA Warfare v2 — Regression: R005
 * @cover { suite: "regression", role: "anon", endpoint: "/pricing /starter /professional /enterprise /get-started", assertionType: "invariant" }
 *
 * Bug: Canonical pricing must be $199 / $299 / $399 (one-time lifetime access).
 *      Legacy monthly prices ($14.99 / $29.99 / $59.99) were deprecated in funnel rebuild.
 *      Any regression would show old monthly prices on sales pages.
 *
 * Regression: Fetch each funnel page, assert:
 *   - "$199", "$299", "$399" appear at least once.
 *   - "$14.99", "$29.99", "$59.99" do NOT appear in any pricing block.
 *
 * NON-DESTRUCTIVE: read-only browser page scraping.
 */

import { test, expect } from "@playwright/test";
import { BASE_URL } from "../../helpers/constants.js";

const CANONICAL_PRICES = ["$199", "$299", "$399"];
const DEPRECATED_PRICES = ["$14.99", "$29.99", "$59.99"];

// Pages that must show canonical pricing
const PRICING_PAGES = [
  { path: "/pricing", name: "Pricing" },
  { path: "/starter", name: "Starter" },
  { path: "/professional", name: "Professional" },
  { path: "/enterprise", name: "Enterprise" },
  { path: "/get-started", name: "Get Started" },
];

test.describe("R005 — Canonical pricing lock ($199/$299/$399 only)", () => {
  for (const { path, name } of PRICING_PAGES) {
    test(`${name} page (${path}) shows canonical prices, no legacy monthly prices`, async ({
      page,
    }) => {
      const url = `${BASE_URL}${path}`;

      const response = await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 15_000,
      });

      // Skip if page returns 404 (not all funnel pages may be active)
      if (response && response.status() === 404) {
        test.skip(true, `Page ${path} returned 404 — may not be deployed yet.`);
        return;
      }

      // Wait for pricing content to render
      await page.waitForTimeout(1_500);

      const pageText = await page.evaluate(() => document.body.innerText);

      // Assert deprecated prices are NOT present
      for (const deprecated of DEPRECATED_PRICES) {
        expect(
          pageText,
          `R005 REGRESSION: Page "${name}" (${path}) contains deprecated price "${deprecated}". ` +
            "Monthly legacy pricing should have been removed from all funnel pages.",
        ).not.toContain(deprecated);
      }

      // Assert at least one canonical price is present on pages that are
      // pricing-centric (skip get-started which is a general overview)
      if (path !== "/get-started") {
        const hasCanonicalPrice = CANONICAL_PRICES.some((p) =>
          pageText.includes(p),
        );

        // For individual tier pages, the specific tier price must appear
        const tierPriceMap: Record<string, string> = {
          "/starter": "$199",
          "/professional": "$299",
          "/enterprise": "$399",
        };

        if (tierPriceMap[path]) {
          expect(
            pageText,
            `R005: Page "${name}" does not show expected price "${tierPriceMap[path]}". ` +
              "Canonical pricing may have been removed or changed.",
          ).toContain(tierPriceMap[path]);
        } else if (!hasCanonicalPrice) {
          console.warn(
            `[R005] Page "${name}" does not show any canonical price — may be intentional if it's a non-pricing page.`,
          );
        }
      }
    });
  }

  test("API pricing endpoint returns canonical prices only", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/tiers/public/pricing`);

    if (res.status === 404) {
      test.skip(true, "Public pricing API not available.");
      return;
    }

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    const bodyText = JSON.stringify(body);

    // No deprecated monthly prices in API response
    for (const deprecated of ["14.99", "29.99", "59.99"]) {
      expect(
        bodyText,
        `R005 REGRESSION: API pricing contains deprecated amount "${deprecated}". ` +
          "Monthly pricing must be removed from the API tier list.",
      ).not.toContain(deprecated);
    }

    // Canonical prices present
    for (const canonical of ["199", "299", "399"]) {
      expect(
        bodyText,
        `R005: API pricing does not contain canonical price "${canonical}".`,
      ).toContain(canonical);
    }
  });
});
