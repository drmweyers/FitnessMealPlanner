/**
 * FORGE QA Warfare v2 — Regression: R007
 * @cover { suite: "regression", role: "client", endpoint: "/api/bugs", assertionType: "http" }
 *
 * Bug: Bug category enum drift — old stale values ("bug", "feature") were replaced
 *      with proper enum values. Any regression would accept stale values (201 instead of 400).
 *
 * Regression:
 *   - POST with each valid category → expect 201.
 *   - POST with stale/invalid categories ("bug", "feature", "invalid_cat") → expect 400.
 *
 * NON-DESTRUCTIVE: valid submissions create real rows, invalid ones are rejected.
 */

import { test, expect } from "@playwright/test";
import { ClientActor } from "../actors/index.js";
import { BASE_URL } from "../../helpers/constants.js";

// Valid categories from shared/schema.ts bugReportCategoryEnum
const VALID_CATEGORIES = [
  "ui_issue",
  "data_accuracy",
  "feature_request",
  "performance",
  "sync_issue",
  "auth_access",
  "notification",
  "integration",
  "crash",
  "other",
] as const;

// The schema requires a context object with these fields
const TEST_CONTEXT = {
  url: "https://evofitmeals.com/test/r007",
  browser: "Playwright",
  userAgent: "warfare-v2-r007",
  userRole: "customer",
  userId: "test-user",
};

// Stale / invalid categories that must be REJECTED.
// "bug", "feature", "feedback" were the OLD pg-enum values before
// migration 0027 brought the database in sync with shared/schema.ts.
const INVALID_CATEGORIES = [
  "bug",
  "feature",
  "feedback",
  "invalid_cat",
  "",
  "BUG",
  "Feature Request",
] as const;

test.describe("R007 — Bug category enum drift: valid categories accepted, stale ones rejected", () => {
  let customer: ClientActor;
  let counter = 0;

  test.beforeAll(async () => {
    customer = await ClientActor.login(undefined, BASE_URL);
  });

  for (const category of VALID_CATEGORIES) {
    test(`valid category "${category}" → 201 Created`, async () => {
      const res = await customer.raw("POST", "/api/bugs", {
        description: `[R007] Valid category test: ${category} (${Date.now()}-${++counter}). R007 regression: valid enum value must be accepted.`,
        category,
        context: TEST_CONTEXT,
      });

      expect(
        res.status,
        `Category "${category}" returned ${res.status} — expected 201. ` +
          `Response: ${JSON.stringify(res.body)}`,
      ).toBe(201);
    });
  }

  for (const category of INVALID_CATEGORIES) {
    test(`invalid/stale category "${category || "(empty)"}" → 400 Bad Request`, async () => {
      const res = await customer.raw("POST", "/api/bugs", {
        description: `[R007] Invalid category test: ${category || "empty"} (${Date.now()}-${++counter}). R007 regression: stale/invalid enum value must be rejected.`,
        category: category || undefined,
        context: TEST_CONTEXT,
      });

      expect(
        res.status,
        `R007 REGRESSION: Category "${category || "(empty)"}" returned ${res.status} — expected 400. ` +
          "Stale enum values are being accepted. The schema validation is not enforcing the current enum.",
      ).toBe(400);
    });
  }

  test("missing category field returns 400, never 500", async () => {
    const res = await customer.raw("POST", "/api/bugs", {
      description: `[R007] Missing category (${Date.now()}). Required field omitted.`,
      context: TEST_CONTEXT,
      // category intentionally omitted
    });

    expect(
      res.status,
      `R007: Missing category returned ${res.status}. Must be 400, never 500.`,
    ).not.toBe(500);
    expect([400, 422]).toContain(res.status);
  });

  test("null category value returns 400, never 500", async () => {
    const res = await customer.raw("POST", "/api/bugs", {
      description: `[R007] Null category (${Date.now()}). Null value test.`,
      category: null,
      context: TEST_CONTEXT,
    });

    expect(
      [400, 422],
      `R007: null category returned ${res.status}. Expected 400/422, never 500.`,
    ).toContain(res.status);
  });
});
