/**
 * Subdomain Verification Suite — meals.evofit.io
 *
 * Run AFTER DNS propagates and Digital Ocean custom domain is confirmed.
 * Command: npx playwright test --config=playwright.subdomain.config.ts
 *
 * These tests verify the new subdomain works end-to-end without breaking
 * any existing functionality.
 */

import { test, expect } from "@playwright/test";

const SUBDOMAIN = "https://meals.evofit.io";
const LEGACY_DOMAIN = "https://evofitmeals.com";

// ─── 1. DNS & TLS ───────────────────────────────────────────────────────────

test.describe("DNS & TLS", () => {
  test("meals.evofit.io resolves and loads with HTTPS", async ({ page }) => {
    const response = await page.goto(SUBDOMAIN, {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBeLessThan(400);
    expect(page.url()).toContain("meals.evofit.io");
  });

  test("SSL certificate is valid (no HTTPS errors)", async ({ page }) => {
    // If SSL were invalid, Playwright would throw here with ignoreHTTPSErrors: false
    await page.goto(SUBDOMAIN);
    const url = new URL(page.url());
    expect(url.protocol).toBe("https:");
  });
});

// ─── 2. Home Page Renders ────────────────────────────────────────────────────

test.describe("Landing page", () => {
  test("homepage loads and shows brand content", async ({ page }) => {
    await page.goto(SUBDOMAIN);
    // The app should render something — not a blank page or error
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(100);
  });

  test("login page is accessible", async ({ page }) => {
    const response = await page.goto(`${SUBDOMAIN}/login`);
    expect(response?.status()).toBeLessThan(400);
  });

  test("register page is accessible", async ({ page }) => {
    const response = await page.goto(`${SUBDOMAIN}/register`);
    expect(response?.status()).toBeLessThan(400);
  });

  test("get-started page is accessible", async ({ page }) => {
    const response = await page.goto(`${SUBDOMAIN}/get-started`);
    expect(response?.status()).toBeLessThan(400);
  });
});

// ─── 3. API Responds ─────────────────────────────────────────────────────────

test.describe("API health", () => {
  test("health endpoint returns 200", async ({ request }) => {
    const response = await request.get(`${SUBDOMAIN}/api/health`);
    expect(response.status()).toBe(200);
  });

  test("API returns JSON (not HTML error page)", async ({ request }) => {
    const response = await request.get(`${SUBDOMAIN}/api/health`);
    const contentType = response.headers()["content-type"] || "";
    expect(contentType).toContain("application/json");
  });
});

// ─── 4. CORS Headers ─────────────────────────────────────────────────────────

test.describe("CORS", () => {
  test("API accepts requests from meals.evofit.io origin", async ({
    request,
  }) => {
    const response = await request.get(`${SUBDOMAIN}/api/health`, {
      headers: { Origin: SUBDOMAIN },
    });
    // Should not return 403 or CORS error
    expect(response.status()).not.toBe(403);
    const corsHeader = response.headers()["access-control-allow-origin"];
    // Either exact match or wildcard
    expect(corsHeader === SUBDOMAIN || corsHeader === "*").toBeTruthy();
  });

  test("legacy evofitmeals.com origin is still accepted by API", async ({
    request,
  }) => {
    // Critical: existing sessions on evofitmeals.com must not break
    const response = await request.get(`${SUBDOMAIN}/api/health`, {
      headers: { Origin: LEGACY_DOMAIN },
    });
    expect(response.status()).not.toBe(403);
  });
});

// ─── 5. Static Assets Load ───────────────────────────────────────────────────

test.describe("Static assets", () => {
  test("page has no broken JS/CSS resources", async ({ page }) => {
    const failedRequests: string[] = [];
    page.on("requestfailed", (req) => {
      const url = req.url();
      // Only track same-origin JS/CSS failures
      if (
        url.includes("meals.evofit.io") &&
        (url.endsWith(".js") || url.endsWith(".css"))
      ) {
        failedRequests.push(url);
      }
    });

    await page.goto(SUBDOMAIN, { waitUntil: "load" });
    expect(failedRequests).toHaveLength(0);
  });
});

// ─── 6. PWA Manifest ─────────────────────────────────────────────────────────

test.describe("PWA", () => {
  test("manifest.json is accessible", async ({ request }) => {
    const response = await request.get(`${SUBDOMAIN}/manifest.json`);
    expect(response.status()).toBe(200);
  });

  test("service worker is accessible", async ({ request }) => {
    const response = await request.get(`${SUBDOMAIN}/sw.js`);
    expect(response.status()).toBe(200);
  });
});

// ─── 7. Legacy Domain Still Works ────────────────────────────────────────────

test.describe("Legacy domain parity", () => {
  test("evofitmeals.com health endpoint still responds", async ({
    request,
  }) => {
    const response = await request.get(`${LEGACY_DOMAIN}/api/health`);
    // Must still be alive — we never broke the old domain
    expect(response.status()).toBe(200);
  });
});
