/**
 * FORGE QA Warfare v2 — Side-Effect: SE-02
 * @cover { suite: "side-effect", role: "client", endpoint: "/api/bugs", assertionType: "side-effect" }
 *
 * Trigger: Customer submits a bug.
 * Side effect: Bug appears in Hal's pending poll list within 5s.
 *
 * Verification method: GET /api/bugs/pending with HAL_API_KEY.
 * NON-DESTRUCTIVE: seeds a real bug row; non-critical test data.
 */

import { test, expect } from "@playwright/test";
import { ClientActor, HalActor } from "../actors/index.js";
import { BASE_URL } from "../../helpers/constants.js";

const HAL_API_KEY = process.env.HAL_API_KEY || "test-hal-key";

test.describe("SE-02 — Bug submitted → Hal pending list updated", () => {
  let customer: ClientActor;
  let hal: HalActor;

  test.beforeAll(async () => {
    customer = await ClientActor.login(undefined, BASE_URL);
    hal = HalActor.create(HAL_API_KEY, BASE_URL);
  });

  test("newly submitted bug appears in Hal pending poll within 5s", async () => {
    const uniqueTitle = `[SE-02] Hal bridge test ${Date.now()}`;

    // Submit the bug
    const submitRes = await customer.raw("POST", "/api/bugs", {
      title: uniqueTitle,
      description: "Automated side-effect test for Hal bridge polling.",
      category: "bug",
      priority: "low",
    });

    expect([200, 201]).toContain(submitRes.status);
    const body = submitRes.body as Record<string, unknown>;
    const bugId: string =
      (body?.id as string) ||
      ((body as Record<string, Record<string, string>>)?.data?.id as string);
    expect(bugId, "Bug submission must return an id").toBeTruthy();

    // Poll Hal's pending endpoint for up to 5s
    let found = false;
    const deadline = Date.now() + 5_000;

    while (Date.now() < deadline) {
      const poll = await hal.pollPending();

      // Accept 401/403 if HAL_API_KEY is not configured in this env
      if (poll.status === 401 || poll.status === 403) {
        test.skip(
          true,
          "COVERAGE GAP: HAL_API_KEY not accepted by server — Hal bridge side-effect not verifiable. " +
            "Configure HAL_API_KEY in server env to enable this assertion.",
        );
        return;
      }

      expect(poll.status).toBe(200);

      const bugs = Array.isArray(poll.body)
        ? poll.body
        : (((poll.body as Record<string, unknown>)?.bugs as unknown[]) ??
          ((poll.body as Record<string, unknown>)?.data as unknown[]) ??
          []);

      const match = (bugs as Array<Record<string, unknown>>).find(
        (b) => b.id === bugId || b.title === uniqueTitle,
      );

      if (match) {
        found = true;
        break;
      }

      await new Promise((r) => setTimeout(r, 500));
    }

    expect(
      found,
      `Bug id=${bugId} ("${uniqueTitle}") was NOT found in Hal pending list within 5s. ` +
        "The side-effect bridge from bug submission to Hal polling is broken.",
    ).toBe(true);
  });
});
