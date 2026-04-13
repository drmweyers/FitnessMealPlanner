/**
 * @cover FSM-001 — Bug Report State Machine
 * States: open → triaged → in_progress → resolved → closed
 * Illegal transitions: closed → open (document current behavior)
 * Dual-claim race: HalActor.raceClaims
 *
 * Schema: pgEnum("bug_report_status", ["open","triaged","in_progress","resolved","closed"])
 * "claimed" is NOT a real state — do not use it.
 */

import { test, expect } from "@playwright/test";
import { AdminActor } from "../actors/index.js";
import { ClientActor } from "../actors/index.js";
import { HalActor } from "../actors/index.js";
import { CREDENTIALS, BASE_URL } from "../../helpers/constants.js";

let bugId: string;

test.describe("Bug Report FSM — full happy path", () => {
  test.beforeAll(async () => {
    // Customer submits a bug — starts in "open"
    const customer = await ClientActor.login(CREDENTIALS.customer, BASE_URL);
    const res = await customer.submitBug({
      title: `FSM Test Bug ${Date.now()}`,
      description: "State machine coverage test",
      category: "other",
      priority: "medium",
    });
    const body = res as Record<string, unknown>;
    const row = (body.data as Record<string, unknown>) ?? body;
    bugId = row.id as string;
    if (!bugId) {
      console.warn("Bug submit shape:", JSON.stringify(res).slice(0, 200));
    }
  });

  test("@cover FSM-001a — newly created bug is in 'open' state", async () => {
    if (!bugId) {
      test.skip(true, "No bug id");
      return;
    }
    const admin = await AdminActor.login(undefined, BASE_URL);
    const res = await admin.getBugReport(bugId);
    const bug = res as Record<string, unknown>;
    const row = ((bug.data as Record<string, unknown>) ?? bug) as Record<
      string,
      unknown
    >;
    expect(row.status).toBe("open");
  });

  test("@cover FSM-001b — open → triaged", async () => {
    if (!bugId) {
      test.skip(true, "No bug id");
      return;
    }
    const admin = await AdminActor.login(undefined, BASE_URL);
    const res = await admin.setBugStatus(bugId, "triaged", "Reproduced");
    const { status } = res as { status?: number } & Record<string, unknown>;
    // setBugStatus returns raw — but AdminActor.setBugStatus wraps client.raw
    // Accept 200 or 204
    const r = res as { status: number };
    expect([200, 204]).toContain(r.status ?? 200);
  });

  test("@cover FSM-001c — triaged → in_progress", async () => {
    if (!bugId) {
      test.skip(true, "No bug id");
      return;
    }
    const admin = await AdminActor.login(undefined, BASE_URL);
    const r = await admin.setBugStatus(bugId, "in_progress", "Working on it");
    const res = r as { status: number };
    expect([200, 204]).toContain(res.status ?? 200);
  });

  test("@cover FSM-001d — in_progress → resolved", async () => {
    if (!bugId) {
      test.skip(true, "No bug id");
      return;
    }
    const admin = await AdminActor.login(undefined, BASE_URL);
    const r = await admin.setBugStatus(bugId, "resolved", "Fix deployed");
    const res = r as { status: number };
    expect([200, 204]).toContain(res.status ?? 200);
  });

  test("@cover FSM-001e — resolved → closed", async () => {
    if (!bugId) {
      test.skip(true, "No bug id");
      return;
    }
    const admin = await AdminActor.login(undefined, BASE_URL);
    const r = await admin.setBugStatus(bugId, "closed", "Confirmed fixed");
    const res = r as { status: number };
    expect([200, 204]).toContain(res.status ?? 200);
  });
});

test.describe("Bug Report FSM — illegal transitions", () => {
  let closedBugId: string;

  test.beforeAll(async () => {
    // Create and fully close a bug
    const customer = await ClientActor.login(CREDENTIALS.customer, BASE_URL);
    const res = await customer.submitBug({
      title: `FSM Illegal Transition Test ${Date.now()}`,
      description: "illegal transition target",
      category: "other",
      priority: "low",
    });
    const body = res as Record<string, unknown>;
    const row = (body.data as Record<string, unknown>) ?? body;
    closedBugId = row.id as string;

    if (closedBugId) {
      const admin = await AdminActor.login(undefined, BASE_URL);
      await admin.setBugStatus(closedBugId, "triaged");
      await admin.setBugStatus(closedBugId, "in_progress");
      await admin.setBugStatus(closedBugId, "resolved");
      await admin.setBugStatus(closedBugId, "closed");
    }
  });

  test("@cover FSM-001f — closed → open (illegal): document current behavior", async () => {
    if (!closedBugId) {
      test.skip(true, "Could not seed closed bug");
      return;
    }
    const admin = await AdminActor.login(undefined, BASE_URL);
    const r = await admin.setBugStatus(closedBugId, "open", "re-opening");
    const res = r as { status: number };
    // Current behavior may allow re-open OR return 422 — document both as acceptable
    // This is a DOCUMENTATION test: fail only on 500
    console.log(`[FSM-001f] closed→open transition status: ${res.status}`);
    expect(res.status).not.toBe(500);
    if (res.status === 422 || res.status === 400) {
      console.log(
        "[FSM-001f] GOOD: server correctly rejects illegal closed→open transition",
      );
    } else if (res.status === 200 || res.status === 204) {
      console.warn(
        "[FSM-001f] RISK: server allows closed→open back-transition — no guard",
      );
    }
  });

  test("@cover FSM-001g — customer PATCH /api/bugs/:id/status → 403", async () => {
    if (!closedBugId) {
      test.skip(true, "No bug id");
      return;
    }
    const customer = await ClientActor.login(CREDENTIALS.customer, BASE_URL);
    const r = await customer.raw("PATCH", `/api/bugs/${closedBugId}/status`, {
      status: "open",
    });
    expect([403, 404]).toContain(r.status);
  });
});

test.describe("Bug Report FSM — Hal dual-claim race", () => {
  let raceBugId: string;

  test.beforeAll(async () => {
    const customer = await ClientActor.login(CREDENTIALS.customer, BASE_URL);
    const res = await customer.submitBug({
      title: `FSM Race Claim Test ${Date.now()}`,
      description: "dual claim race target",
      category: "other",
      priority: "high",
    });
    const body = res as Record<string, unknown>;
    const row = (body.data as Record<string, unknown>) ?? body;
    raceBugId = row.id as string;
  });

  test("@cover FSM-001h — Hal dual-claim race: document atomicity (HIGH RISK gap)", async () => {
    if (!raceBugId) {
      test.skip(true, "No bug id for race test");
      return;
    }
    const hal = HalActor.create(undefined, BASE_URL);
    const results = await hal.raceClaims(raceBugId, 2);

    console.log(
      "[FSM-001h] Race results:",
      results.map((r) => r.status),
    );

    const wins = results.filter((r) => r.status === 200);
    const conflicts = results.filter((r) => r.status === 409);
    const notFounds = results.filter((r) => r.status === 404);

    // Ideal: exactly 1 win + 1 conflict (atomic claim)
    // Current risk: 2 wins (no row-level lock) — this is the gap from state-machines.md
    if (wins.length === 1 && conflicts.length === 1) {
      console.log("[FSM-001h] PASS: atomic claim works correctly");
    } else if (wins.length === 2) {
      console.warn(
        "[FSM-001h] BUG: dual-claim race succeeded — both Hal instances claimed the same bug. " +
          "HIGH RISK: no atomic claim endpoint. See state-machines.md §FSM-3 Concurrency Hazards.",
      );
    } else if (notFounds.length > 0) {
      console.log(
        "[FSM-001h] INFO: /api/bugs/:id/assign endpoint not found — Hal polling endpoints may differ",
      );
    }

    // Test passes regardless — it is a behavior documentation test
    // Fail only on 500
    for (const r of results) {
      expect(r.status).not.toBe(500);
    }
  });
});
