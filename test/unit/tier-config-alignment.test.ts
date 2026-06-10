import { describe, it, expect } from "vitest";

// stripeService instantiates the Stripe SDK at module load — give it a dummy
// key before importing so the config constants can be tested in isolation.
process.env.STRIPE_SECRET_KEY =
  process.env.STRIPE_SECRET_KEY || "sk_test_dummy";
const { ONETIME_TIERS } = await import("../../server/services/stripeService");

// Marketing/display tier config must never contradict what EntitlementsService
// actually enforces (Starter 9/50, Professional 20/200, Enterprise unlimited).
// Found drifted on 2026-06-10: Enterprise claimed 50 clients / 500 plans while
// enforcement was unlimited (-1).
describe("ONETIME_TIERS alignment with enforced entitlements", () => {
  it("Starter: 9 clients, 50 meal plans/month", () => {
    expect(ONETIME_TIERS.STARTER.maxClients).toBe(9);
    expect(ONETIME_TIERS.STARTER.usageLimit).toBe(50);
  });

  it("Professional: 20 clients, 200 meal plans/month", () => {
    expect(ONETIME_TIERS.PROFESSIONAL.maxClients).toBe(20);
    expect(ONETIME_TIERS.PROFESSIONAL.usageLimit).toBe(200);
  });

  it("Enterprise: unlimited (-1) clients and meal plans", () => {
    expect(ONETIME_TIERS.ENTERPRISE.maxClients).toBe(-1);
    expect(ONETIME_TIERS.ENTERPRISE.usageLimit).toBe(-1);
    expect(ONETIME_TIERS.ENTERPRISE.features).toContain("Unlimited clients");
    expect(ONETIME_TIERS.ENTERPRISE.features).not.toContain("Up to 50 clients");
  });
});
