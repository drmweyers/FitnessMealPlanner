/**
 * Public tier checkout — the real purchase action for the marketing funnel.
 *
 * Wraps POST /api/create-checkout-session (server/routes/funnelCheckout.ts),
 * which requires NO authentication: Stripe collects the buyer's email and the
 * webhook provisions the matching account after payment.
 */

export type CheckoutTier = "starter" | "professional" | "enterprise";

/** Create a Stripe Checkout session for a tier and return its URL. Throws on failure. */
export async function createTierCheckoutSession(
  tier: CheckoutTier,
): Promise<string> {
  const response = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tier }),
  });

  const data = await response.json();

  if (!response.ok || !data.url) {
    throw new Error(data.message || data.error || "No checkout URL returned");
  }

  return data.url;
}

/** Start checkout for a tier: create the session and redirect to Stripe. */
export async function startTierCheckout(tier: CheckoutTier): Promise<void> {
  try {
    const url = await createTierCheckoutSession(tier);
    window.location.href = url;
  } catch (error) {
    console.error("[Checkout] Failed to start checkout:", error);
    alert("Something went wrong starting your checkout. Please try again.");
  }
}
