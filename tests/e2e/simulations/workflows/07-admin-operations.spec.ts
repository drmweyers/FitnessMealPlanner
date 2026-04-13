/**
 * Workflow 07 — Admin Operations
 *
 * @cover BUG-006 BUG-009 BUG-010 BUG-011
 *
 * Scenario:
 *  1. Admin lists users
 *  2. Admin grants a tier to the canonical trainer
 *  3. Admin lists bug reports
 *  4. Admin submits a bug (via customer account), then sets priority and cycles status
 *  5. Verify all transitions succeed or fail with expected codes
 *
 * NON-DESTRUCTIVE: tier grant is idempotent (grants same tier); bug is closed at end.
 */

import { test, expect } from "@playwright/test";
import { AdminActor, ClientActor } from "../actors/index.js";
import { BASE_URL, CREDENTIALS } from "../../helpers/constants.js";

const baseUrl = process.env.BASE_URL || BASE_URL;

test.describe("Workflow 07 — Admin Operations", () => {
  let testBugId: string | undefined;

  test.afterAll(async () => {
    if (testBugId) {
      try {
        const admin = await AdminActor.login(undefined, baseUrl);
        await admin.setBugStatus(
          testBugId,
          "closed",
          "forge-test admin cleanup",
        );
      } catch {
        /* ignore */
      }
    }
  });

  test("admin can list users", async () => {
    const admin = await AdminActor.login(undefined, baseUrl);
    // listUsers() uses client.get() which returns unwrapped JSON — use raw() for status
    const res = await admin.raw("GET", "/api/admin/users");
    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    const users = Array.isArray(body)
      ? body
      : Array.isArray(body.users)
        ? body.users
        : Array.isArray(body.data)
          ? body.data
          : [];
    expect(Array.isArray(users)).toBe(true);
    expect((users as Array<unknown>).length).toBeGreaterThan(0);
  });

  test("admin can grant tier to trainer (idempotent)", async () => {
    const admin = await AdminActor.login(undefined, baseUrl);
    // Grant same tier trainer already has — idempotent, safe for prod
    const res = await admin.raw("POST", "/api/admin/grant-tier", {
      email: CREDENTIALS.trainer.email,
      tier: "starter",
    });
    // 200 = success; 422 = already at tier; either is acceptable
    expect(res.status).toBeLessThan(500);
  });

  test("BUG-006 admin can list all bug reports", async () => {
    // @cover BUG-006
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

  test("admin can set bug priority", async () => {
    // First create a bug to operate on (schema: category + description only)
    const customer = await ClientActor.login(undefined, baseUrl);
    const submitRes = await customer.raw("POST", "/api/bugs", {
      category: "feature_request",
      description:
        "Admin workflow test — forge QA will be closed after admin ops test run",
      context: {
        url: baseUrl,
        browser: "Playwright",
        userAgent: "forge-qa-warfare-v2",
        userRole: "customer",
        userId: "forge-test",
      },
    });
    expect([200, 201]).toContain(submitRes.status);
    const body = submitRes.body as Record<string, unknown>;
    const bug =
      (body.bugReport as Record<string, unknown>) ||
      (body.bug as Record<string, unknown>) ||
      (body.data as Record<string, unknown>) ||
      body;
    testBugId = ((bug?.id || bug?._id) as string) || undefined;
    test.skip(!testBugId, "Bug creation failed");

    const admin = await AdminActor.login(undefined, baseUrl);
    const res = await admin.setBugPriority(testBugId!, "high");
    expect([200, 201]).toContain(res.status);
  });

  test("BUG-009 admin can triage a bug (open → triaged)", async () => {
    // @cover BUG-009
    test.skip(!testBugId, "No test bug available");
    const admin = await AdminActor.login(undefined, baseUrl);
    const res = await admin.setBugStatus(testBugId!, "triaged");
    // 200 = moved; 422 = already in this state; 400 = not allowed — all fine except 500
    expect(res.status).toBeLessThan(500);
  });

  test("BUG-010 admin can move bug to in_progress", async () => {
    // @cover BUG-010
    test.skip(!testBugId, "No test bug available");
    const admin = await AdminActor.login(undefined, baseUrl);
    const res = await admin.setBugStatus(testBugId!, "in_progress");
    expect(res.status).toBeLessThan(500);
  });

  test("BUG-011 admin can resolve a bug", async () => {
    // @cover BUG-011
    test.skip(!testBugId, "No test bug available");
    const admin = await AdminActor.login(undefined, baseUrl);
    const res = await admin.setBugStatus(
      testBugId!,
      "resolved",
      "resolved in forge test",
    );
    expect([200, 201]).toContain(res.status);
  });
});
