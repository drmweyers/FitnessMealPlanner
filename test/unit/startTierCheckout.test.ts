/**
 * startTierCheckout helper — contract tests
 *
 * The public funnel checkout (POST /api/create-checkout-session, no auth)
 * is the real purchase action for the marketing pages. This helper wraps it.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTierCheckoutSession } from "../../client/src/lib/startTierCheckout";

describe("createTierCheckoutSession", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("POSTs the tier to the public no-auth checkout endpoint and returns the Stripe URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi
        .fn()
        .mockResolvedValue({
          url: "https://checkout.stripe.com/c/pay/cs_test_123",
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const url = await createTierCheckoutSession("professional");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/create-checkout-session",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "professional" }),
      }),
    );
    expect(url).toBe("https://checkout.stripe.com/c/pay/cs_test_123");
  });

  it("throws when the server responds with an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({ error: "Invalid tier" }),
      }),
    );

    await expect(createTierCheckoutSession("starter")).rejects.toThrow();
  });

  it("throws when no checkout URL is returned", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({}),
      }),
    );

    await expect(createTierCheckoutSession("enterprise")).rejects.toThrow();
  });
});
