/**
 * FORGE QA Warfare v2 — Regression: R006
 * @cover { suite: "regression", role: "hal", endpoint: "/api/bugs/:id/assign", assertionType: "invariant" }
 *
 * Bug: Hal claim race — two parallel claim attempts on the same bug must be
 *      handled atomically. Only one claim wins (200); the other gets 409.
 *
 * Playwright e2e variant: submits a fresh bug, then calls HalActor.raceClaims()
 * with n=4 concurrent requests. Asserts exactly one 200 and n-1 409s.
 *
 * Relates to: test/integration/bugReportClaimRace.test.ts (unit variant).
 * NON-DESTRUCTIVE: uses a freshly seeded bug; claim is not destructive.
 */

import { test, expect } from "@playwright/test";
import { ClientActor, HalActor } from "../actors/index.js";
import { BASE_URL } from "../../helpers/constants.js";

const HAL_API_KEY = process.env.HAL_API_KEY || "test-hal-key";
const RACE_CONCURRENCY = 4;

test.describe("R006 — Hal claim race: exactly one winner, rest get 409", () => {
  let customer: ClientActor;
  let hal: HalActor;

  test.beforeAll(async () => {
    customer = await ClientActor.login(undefined, BASE_URL);
    hal = HalActor.create(HAL_API_KEY, BASE_URL);
  });

  test(`${RACE_CONCURRENCY}-way concurrent claim on same bug → exactly 1 win, ${RACE_CONCURRENCY - 1} conflicts`, async () => {
    // Seed a fresh bug to claim
    const bugTitle = `[R006] Hal race regression test ${Date.now()}`;
    const submitRes = await customer.raw("POST", "/api/bugs", {
      description: `${bugTitle}. R006 regression: concurrent claim test.`,
      category: "other",
      context: {
        url: "https://evofitmeals.com/test/r006",
        browser: "Playwright",
        userAgent: "warfare-v2",
        userRole: "customer",
        userId: "test-user",
      },
    });

    expect([200, 201]).toContain(submitRes.status);

    const bugBody = submitRes.body as Record<string, unknown>;
    const bugId: string =
      (bugBody?.id as string) ||
      ((bugBody as Record<string, Record<string, string>>)?.data?.id as string);

    expect(bugId, "Bug submission must return an id").toBeTruthy();

    // Fire n concurrent claims
    const results = await hal.raceClaims(bugId, RACE_CONCURRENCY);

    const statuses = results.map((r) => r.status);
    const wins = statuses.filter((s) => s === 200);
    const conflicts = statuses.filter((s) => s === 409);

    // If HAL_API_KEY is rejected, skip gracefully
    if (statuses.every((s) => s === 401 || s === 403)) {
      test.skip(
        true,
        "HAL_API_KEY not accepted by server — configure HAL_API_KEY to run claim race test.",
      );
      return;
    }

    expect(
      wins.length,
      `R006 REGRESSION: Expected exactly 1 win (200) but got ${wins.length}. ` +
        "Race condition: multiple concurrent claims are being accepted. " +
        "The claim endpoint is not atomic.",
    ).toBe(1);

    expect(
      conflicts.length,
      `R006 REGRESSION: Expected ${RACE_CONCURRENCY - 1} conflicts (409) but got ${conflicts.length}. ` +
        "Some concurrent claims did not return 409.",
    ).toBe(RACE_CONCURRENCY - 1);

    console.log(
      `[R006] Race results: ${wins.length} win(s), ${conflicts.length} conflict(s) — as expected.`,
    );
  });

  test("claiming an already-claimed bug returns 409", async () => {
    // Seed a bug, claim it once successfully, then try to claim again
    const bugTitle = `[R006b] Sequential claim test ${Date.now()}`;
    const submitRes = await customer.raw("POST", "/api/bugs", {
      description: `${bugTitle}. R006b: sequential claim double-check.`,
      category: "other",
      context: {
        url: "https://evofitmeals.com/test/r006b",
        browser: "Playwright",
        userAgent: "warfare-v2",
        userRole: "customer",
        userId: "test-user",
      },
    });

    expect([200, 201]).toContain(submitRes.status);
    const bugBody = submitRes.body as Record<string, unknown>;
    const bugId: string =
      (bugBody?.id as string) ||
      ((bugBody as Record<string, Record<string, string>>)?.data?.id as string);

    // First claim
    const claim1 = await hal.claim(bugId);
    if (claim1.status === 401 || claim1.status === 403) {
      test.skip(true, "HAL_API_KEY not accepted.");
      return;
    }
    expect(claim1.status).toBe(200);

    // Second claim — must be rejected
    const claim2 = await hal.claim(bugId);
    expect(
      claim2.status,
      `Second claim on already-claimed bug returned ${claim2.status}. ` +
        "Expected 409 (Conflict) — bug is already claimed.",
    ).toBe(409);
  });
});
