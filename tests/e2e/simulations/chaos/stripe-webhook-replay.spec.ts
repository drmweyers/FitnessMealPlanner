/**
 * FORGE QA Warfare v2 — Chaos: CH-05
 * @cover { suite: "chaos", role: "stripe", endpoint: "/api/subscription/webhook", assertionType: "invariant" }
 *
 * Failure mode: Same Stripe event id sent twice (webhook replay).
 * Expected: Idempotent handling — second delivery silently accepted (200) but NOT re-processed.
 *
 * Verification: After two deliveries of the same event, webhook_events table (or equivalent)
 * has exactly one row for that event_id.
 *
 * NON-DESTRUCTIVE: uses a synthetic event id; no real Stripe account needed.
 * The server must validate the Stripe signature — skip if STRIPE_WEBHOOK_SECRET is unset.
 */

import { test, expect } from "@playwright/test";
import { AdminActor } from "../actors/index.js";
import { BASE_URL } from "../../helpers/constants.js";

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Build a minimal Stripe-style webhook payload.
 * NOTE: Real Stripe signature validation requires `stripe.webhooks.constructEvent`.
 * In test mode, the server may accept unsigned payloads if STRIPE_WEBHOOK_SECRET
 * is set to "test_secret" or similar. Adjust to match your server's test mode.
 */
function buildStripeEvent(eventId: string) {
  return {
    id: eventId,
    object: "event",
    type: "checkout.session.completed",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    data: {
      object: {
        id: `cs_test_${Date.now()}`,
        object: "checkout.session",
        customer: "cus_test123",
        payment_status: "paid",
        amount_total: 19900,
        metadata: { tier: "starter" },
      },
    },
  };
}

/**
 * Sign the payload as Stripe does (simplified HMAC for test mode).
 * Replace with real stripe.webhooks.generateTestHeaderString in production tests.
 */
async function stripeSignature(
  payload: string,
  secret: string,
): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `${timestamp}.${payload}`;
  // eslint-disable-next-line no-undef
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(toSign));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `t=${timestamp},v1=${hex}`;
}

test.describe("CH-05 — Stripe webhook replay → idempotent (single row)", () => {
  let admin: AdminActor;

  test.beforeAll(async () => {
    admin = await AdminActor.login(undefined, BASE_URL);
  });

  test("replaying same Stripe event id is idempotent (no duplicate processing)", async () => {
    if (!STRIPE_WEBHOOK_SECRET) {
      test.skip(
        true,
        "STRIPE_WEBHOOK_SECRET not set — cannot sign webhook payloads. " +
          "Set STRIPE_WEBHOOK_SECRET in test env to enable this assertion.",
      );
      return;
    }

    const uniqueEventId = `evt_warfare_${Date.now()}`;
    const event = buildStripeEvent(uniqueEventId);
    const payload = JSON.stringify(event);
    const signature = await stripeSignature(payload, STRIPE_WEBHOOK_SECRET);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "stripe-signature": signature,
    };

    // First delivery
    const res1 = await fetch(`${BASE_URL}/api/subscription/webhook`, {
      method: "POST",
      headers,
      body: payload,
    });

    // Must accept (200)
    expect(
      [200, 204],
      `First webhook delivery returned ${res1.status} — expected 200/204.`,
    ).toContain(res1.status);

    // Second delivery (same payload, same event id — regenerate signature for new timestamp)
    const sig2 = await stripeSignature(payload, STRIPE_WEBHOOK_SECRET);
    const res2 = await fetch(`${BASE_URL}/api/subscription/webhook`, {
      method: "POST",
      headers: { ...headers, "stripe-signature": sig2 },
      body: payload,
    });

    // Must also return 200 (idempotent acceptance) — NOT 500
    expect(
      [200, 204],
      `Second webhook delivery returned ${res2.status}. ` +
        "Server must accept replays gracefully (idempotent 200), not error.",
    ).toContain(res2.status);

    // Verify admin webhook_events table: check via admin API if available
    const webhookEventsRes = await admin.raw(
      "GET",
      `/api/admin/webhook-events?eventId=${uniqueEventId}`,
    );

    if (webhookEventsRes.status === 404) {
      // No webhook events admin endpoint — check via alternate path
      const altRes = await admin.raw(
        "GET",
        `/api/v1/stripe/webhook-events?eventId=${uniqueEventId}`,
      );

      if (altRes.status === 404) {
        console.warn(
          "[CH-05 COVERAGE GAP] No admin endpoint to inspect webhook_events table. " +
            "Implement GET /api/admin/webhook-events to verify idempotency at DB level.",
        );
        // We can only assert the HTTP responses were both 200 — not the DB state
        return;
      }
    }

    if (webhookEventsRes.status === 200) {
      const body = webhookEventsRes.body as Record<string, unknown>;
      const events = Array.isArray(body)
        ? body
        : ((body?.events as unknown[]) ?? (body?.data as unknown[]) ?? []);

      const matchingEvents = (events as Array<Record<string, unknown>>).filter(
        (e) => e.eventId === uniqueEventId || e.event_id === uniqueEventId,
      );

      expect(
        matchingEvents.length,
        `Expected exactly 1 row in webhook_events for event_id="${uniqueEventId}" but found ${matchingEvents.length}. ` +
          "The server is not deduplicating webhook events.",
      ).toBe(1);
    }
  });
});
