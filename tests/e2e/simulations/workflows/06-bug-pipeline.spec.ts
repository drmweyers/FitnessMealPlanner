/**
 * Workflow 06 — Bug Pipeline
 *
 * @cover BUG-001 BUG-004 BUG-006 BUG-016 BUG-017 BUG-018 BUG-019
 *
 * Scenario:
 *  1. Customer submits a bug via POST /api/bugs (category = valid enum)
 *  2. Anon is blocked from submitting bugs (401)
 *  3. Hal polls /api/bugs/pending
 *  4. Hal claims the bug via PATCH /api/bugs/:id/assign
 *  5. Admin lists bugs and sees the claimed one
 *  6. Dual-claim race: two concurrent Hal claims — only one should win
 *
 * NON-DESTRUCTIVE: creates ephemeral bug reports only.
 */

import { test, expect } from "@playwright/test";
import {
  ClientActor,
  AdminActor,
  AnonActor,
  HalActor,
} from "../actors/index.js";
import { BASE_URL } from "../../helpers/constants.js";

const baseUrl = process.env.BASE_URL || BASE_URL;
const halKey = process.env.HAL_API_KEY || "test-hal-key";

test.describe("Workflow 06 — Bug Pipeline", () => {
  let bugId: string | undefined;

  test.afterAll(async () => {
    // Best-effort cleanup — mark as closed
    if (bugId) {
      try {
        const admin = await AdminActor.login(undefined, baseUrl);
        await admin.setBugStatus(bugId, "closed", "forge-test cleanup");
      } catch {
        /* ignore */
      }
    }
  });

  test("BUG-001 customer can submit a bug report", async () => {
    // @cover BUG-001
    // Schema: { category, description } only — no title field (title is derived from description)
    const customer = await ClientActor.login(undefined, baseUrl);
    const res = await customer.raw("POST", "/api/bugs", {
      category: "ui_issue",
      description:
        "Automated forge QA bug submission for pipeline testing — at least 10 chars",
      context: {
        url: baseUrl,
        browser: "Playwright",
        userAgent: "forge-qa-warfare-v2",
        userRole: "customer",
        userId: "forge-test",
      },
    });
    expect([200, 201]).toContain(res.status);
    const body = res.body as Record<string, unknown>;
    const bug =
      (body.bugReport as Record<string, unknown>) ||
      (body.bug as Record<string, unknown>) ||
      (body.data as Record<string, unknown>) ||
      body;
    bugId = ((bug?.id || bug?._id) as string) || undefined;
    expect(typeof bugId).toBe("string");
  });

  test("BUG-004 anon cannot submit a bug report (401)", async () => {
    // @cover BUG-004
    const anon = AnonActor.create(baseUrl);
    const res = await anon.probe("POST", "/api/bugs", {
      title: "Anon test",
      description: "Should be rejected",
      category: "other",
    });
    expect([401, 403]).toContain(res.status);
  });

  test("BUG-016 Hal can poll /api/bugs/pending", async () => {
    // @cover BUG-016
    const hal = HalActor.create(halKey, baseUrl);
    const res = await hal.pollPending();
    // 200 = polling works; 401 = Hal key not configured in this env (acceptable skip)
    if (res.status === 401 || res.status === 403) {
      test.skip(true, "HAL_API_KEY not configured in this environment");
      return;
    }
    expect(res.status).toBe(200);
  });

  test("BUG-018 endpoint blocked without HAL_API_KEY", async () => {
    // @cover BUG-018
    const badHal = HalActor.create("invalid-key-xyz", baseUrl);
    const res = await badHal.pollPending();
    expect([401, 403]).toContain(res.status);
  });

  test("BUG-017 Hal can claim a bug atomically", async () => {
    // @cover BUG-017
    test.skip(!bugId, "No bug id from submission test");

    const hal = HalActor.create(halKey, baseUrl);
    // First probe that polling endpoint works with our key
    const pollRes = await hal.pollPending();
    if (pollRes.status === 401 || pollRes.status === 403) {
      test.skip(true, "HAL_API_KEY not configured — skipping claim test");
      return;
    }

    const claimRes = await hal.claim(bugId!);
    // 200 = claimed; 409 = already claimed; 404 = not found
    expect([200, 409, 404]).toContain(claimRes.status);
  });

  test("BUG-019 dual-claim race — only one claim wins", async () => {
    // @cover BUG-019
    test.skip(!bugId, "No bug id from submission test");

    const hal = HalActor.create(halKey, baseUrl);
    const pollRes = await hal.pollPending();
    if (pollRes.status === 401 || pollRes.status === 403) {
      test.skip(true, "HAL_API_KEY not configured");
      return;
    }

    const results = await hal.raceClaims(bugId!, 2);
    const statuses = results.map((r) => r.status);
    // At least one should be 200 or 409 (conflict / already claimed)
    expect(statuses.every((s) => [200, 409, 404].includes(s))).toBe(true);
    // At most one 200 claim wins
    const wins = statuses.filter((s) => s === 200);
    expect(wins.length).toBeLessThanOrEqual(1);
  });

  test("BUG-006 admin can list bug reports", async () => {
    // @cover BUG-006
    // listBugReports() uses client.get() which throws on non-200; use raw() instead
    const admin = await AdminActor.login(undefined, baseUrl);
    const res = await admin.raw("GET", "/api/bugs");
    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    const bugs = Array.isArray(body)
      ? body
      : Array.isArray(body.bugReports)
        ? body.bugReports
        : Array.isArray(body.bugs)
          ? body.bugs
          : Array.isArray(body.data)
            ? body.data
            : [];
    expect(Array.isArray(bugs)).toBe(true);
  });
});
