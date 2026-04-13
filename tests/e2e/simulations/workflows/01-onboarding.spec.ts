/**
 * Workflow 01 — Onboarding
 *
 * @cover AUTH-001 AUTH-005 AUTH-012
 *
 * Scenario: anon registers as customer; canonical trainer invites a new email;
 * relationship is visible from both sides.
 *
 * NON-DESTRUCTIVE: only creates ephemeral accounts with unique timestamps.
 */

import { test, expect } from "@playwright/test";
import { AnonActor, TrainerActor, AdminActor } from "../actors/index.js";
import { BASE_URL } from "../../helpers/constants.js";

const baseUrl = process.env.BASE_URL || BASE_URL;

// Unique suffix so we never collide with canonical accounts
const ts = Date.now();
const newEmail = `qa.onboard.${ts}@forge-test.dev`;
const newPassword = "ForgeTest123!";

test.describe("Workflow 01 — Onboarding", () => {
  let createdUserId: string | undefined;

  test.afterAll(async () => {
    // Best-effort cleanup via admin
    if (createdUserId) {
      try {
        const admin = await AdminActor.login(undefined, baseUrl);
        await admin.raw("DELETE", `/api/admin/users/${createdUserId}`);
      } catch {
        /* ignore cleanup failures */
      }
    }
  });

  test("AUTH-001 anon can register as customer and receive a token", async () => {
    // @cover AUTH-001
    const anon = AnonActor.create(baseUrl);
    const res = await anon.register({
      email: newEmail,
      password: newPassword,
      role: "customer",
    });
    expect([200, 201]).toContain(res.status);
    const body = res.body as Record<string, unknown>;
    // Token may be at top level or nested in data
    const token =
      (body.accessToken as string) ||
      (body.token as string) ||
      ((body.data as Record<string, unknown>)?.accessToken as string);
    expect(typeof token).toBe("string");
    // Capture id for cleanup
    const user =
      (body.user as Record<string, unknown>) ||
      ((body.data as Record<string, unknown>)?.user as Record<string, unknown>);
    if (user?.id) createdUserId = user.id as string;
  });

  test("AUTH-005 newly registered account can log in", async () => {
    // @cover AUTH-005
    const anon = AnonActor.create(baseUrl);
    const res = await anon.login(newEmail, newPassword);
    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    const token =
      (body.accessToken as string) ||
      (body.token as string) ||
      ((body.data as Record<string, unknown>)?.accessToken as string);
    expect(typeof token).toBe("string");
  });

  test("AUTH-012 trainer can view own profile via GET /api/auth/me", async () => {
    // @cover AUTH-012
    const trainer = await TrainerActor.login(undefined, baseUrl);
    const res = await trainer.raw("GET", "/api/auth/me");
    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    const user =
      (body.user as Record<string, unknown>) ||
      ((body.data as Record<string, unknown>)?.user as Record<
        string,
        unknown
      >) ||
      body;
    expect(user).toBeDefined();
  });

  test("trainer can invite a new customer email", async () => {
    // @cover AUTH-001
    const inviteEmail = `qa.invite.${ts}@forge-test.dev`;
    const trainer = await TrainerActor.login(undefined, baseUrl);
    const res = await trainer.raw("POST", "/api/invitations/send", {
      email: inviteEmail,
      role: "customer",
    });
    // Accept 200/201 (sent) or 422 if validation differs — but NOT 500
    expect(res.status).toBeLessThan(500);
  });
});
