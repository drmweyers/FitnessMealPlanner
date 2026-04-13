/**
 * @cover ADV-005 — Mass Assignment: Cannot Elevate Own Role via PUT /api/profile
 * Role: attacker | Endpoint: /api/profile (PUT), /api/auth/me (GET verify)
 * Input-class: malicious | Assertion-type: http + invariant
 *
 * Attempts to set forbidden fields via profile update. After the attempt,
 * GET /api/auth/me must still return the original role, not "admin".
 */

import { test, expect } from "@playwright/test";
import { AttackerActor } from "../actors/index.js";
import { BASE_URL } from "../../helpers/constants.js";

test("@cover ADV-005a — PUT /api/profile {role:'admin'} does not elevate role", async () => {
  const attacker = await AttackerActor.loginAs("trainer", BASE_URL);

  // Attempt to set role to admin
  const putRes = await attacker.selfElevate();
  // Accept 200 (field ignored) or 400/403 (field rejected) — not a 500
  expect(putRes.status).not.toBe(500);
  expect(putRes.status).toBeLessThan(500);

  // Verify me endpoint still shows trainer
  const meRes = await attacker.raw("GET", "/api/auth/me");
  expect(meRes.status).toBe(200);
  const me = meRes.body as Record<string, unknown>;
  const user = (me.user as Record<string, unknown>) ?? me;
  const role = user.role as string;
  expect(role).not.toBe("admin");
  expect(["trainer", "customer"]).toContain(role);
});

test("@cover ADV-005b — PUT /api/profile {isAdmin:true} does not elevate privileges", async () => {
  const attacker = await AttackerActor.loginAs("trainer", BASE_URL);
  const { status } = await attacker.raw("PUT", "/api/profile", {
    isAdmin: true,
    isSuperUser: true,
    tierLevel: "enterprise",
    subscriptionStatus: "active",
  });
  expect(status).not.toBe(500);

  // Tier must not jump to enterprise without payment
  const tierRes = await attacker.raw("GET", "/api/v1/tiers/current");
  if (tierRes.status === 200) {
    const tierBody = tierRes.body as Record<string, unknown>;
    const tier =
      (tierBody.tier as string) ||
      ((tierBody.data as Record<string, unknown>)?.tier as string);
    // Should be starter (the seeded tier for attacker account), not enterprise
    if (tier) {
      expect(tier).not.toBe("enterprise");
    }
  }
});

test("@cover ADV-005c — PUT /api/profile {userId:'foreign-id'} does not reassign ownership", async () => {
  const attacker = await AttackerActor.loginAs("trainer", BASE_URL);
  const foreignId = "00000000-0000-0000-0000-000000000001";
  const { status } = await attacker.raw("PUT", "/api/profile", {
    userId: foreignId,
    id: foreignId,
  });
  // Must not 500 and must not silently adopt the foreign user id
  expect(status).not.toBe(500);

  const meRes = await attacker.raw("GET", "/api/auth/me");
  expect(meRes.status).toBe(200);
  const me = meRes.body as Record<string, unknown>;
  const user = (me.user as Record<string, unknown>) ?? me;
  expect(user.id).not.toBe(foreignId);
});
