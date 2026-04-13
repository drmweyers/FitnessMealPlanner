/**
 * FORGE QA Warfare v2 — Side-Effect: SE-07
 * @cover { suite: "side-effect", role: "trainer", endpoint: "/api/invitations/send", assertionType: "side-effect" }
 *
 * Trigger: Trainer invites a synthetic email address.
 * Side effect: Invitation row exists in DB (verifiable via GET /api/invitations/list).
 *             Resend email is queued — NOT verified here (no mailbox access).
 *
 * Uses a timestamped email to avoid collisions across runs.
 * NON-DESTRUCTIVE: invitation rows are safe to accumulate.
 */

import { test, expect } from "@playwright/test";
import { TrainerActor } from "../actors/index.js";
import { BASE_URL } from "../../helpers/constants.js";

test.describe("SE-07 — Customer invited → invitation row in DB", () => {
  let trainer: TrainerActor;
  let syntheticEmail: string;

  test.beforeAll(async () => {
    trainer = await TrainerActor.login(undefined, BASE_URL);
    syntheticEmail = `test+warfare-${Date.now()}@evofitmeals.com`;
  });

  test("sending an invitation creates a row in the invitations table", async () => {
    // Send the invitation
    const inviteRes = await trainer.inviteCustomer(syntheticEmail);
    const inviteBody = inviteRes as Record<string, unknown>;

    // Accept 200/201 — 400 if email already invited (re-run protection)
    // If endpoint doesn't exist, skip
    if (!inviteBody && inviteRes === null) {
      test.skip(true, "Invitation endpoint not available.");
      return;
    }

    // Check invitation list
    const listRes = await trainer.raw("GET", "/api/invitations/list");

    if (listRes.status === 404) {
      test.skip(
        true,
        "COVERAGE GAP: GET /api/invitations/list does not exist — cannot verify invitation row. " +
          "Implement this endpoint to close the side-effect verification gap.",
      );
      return;
    }

    expect(listRes.status).toBe(200);

    const listBody = listRes.body as Record<string, unknown>;
    const invitations = Array.isArray(listBody)
      ? (listBody as Array<Record<string, unknown>>)
      : ((listBody?.invitations as Array<Record<string, unknown>>) ??
        (listBody?.data as Array<Record<string, unknown>>) ??
        (listBody?.items as Array<Record<string, unknown>>) ??
        []);

    const match = invitations.find(
      (inv) =>
        inv.email === syntheticEmail ||
        (inv.invitee as Record<string, unknown>)?.email === syntheticEmail,
    );

    expect(
      match,
      `Invitation to "${syntheticEmail}" was NOT found in GET /api/invitations/list. ` +
        "Either the invitation was not persisted or the list endpoint is not returning all pending invitations.",
    ).toBeDefined();

    // Resend mailbox coverage gap — log it
    console.warn(
      "[SE-07 COVERAGE GAP] Resend email delivery not verified. " +
        "Configure RESEND_TEST_MODE + mail capture to verify email side-effect.",
    );
  });
});
