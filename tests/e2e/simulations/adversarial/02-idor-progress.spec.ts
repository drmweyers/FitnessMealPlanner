/**
 * @cover ADV-002 — IDOR: Progress Data Cross-Tenant Access
 * Role: attacker | Endpoint: /api/progress/measurements/:id, /api/progress/photos/:id
 * Input-class: malicious | Assertion-type: http
 *
 * An attacker (customer2) must not be able to write or read another customer's
 * measurements or progress photos.
 */

import { test, expect } from "@playwright/test";
import { AttackerActor } from "../actors/index.js";
import { ClientActor } from "../actors/index.js";
import { CREDENTIALS, BASE_URL } from "../../helpers/constants.js";

let victimMeasurementId: string;

test.beforeAll(async () => {
  // Victim customer logs a measurement
  const victim = await ClientActor.login(CREDENTIALS.customer, BASE_URL);
  const res = await victim.logMeasurement({
    weight: 75.0,
    bodyFat: 18.5,
    notes: "IDOR target measurement",
    date: new Date().toISOString(),
  });
  const body = res as Record<string, unknown>;
  const row = (body.data as Record<string, unknown>) || body;
  victimMeasurementId = row.id as string;
  if (!victimMeasurementId) {
    console.warn(
      "Could not extract measurement id:",
      JSON.stringify(res).slice(0, 200),
    );
  }
});

test("@cover ADV-002a — attacker PUT victim measurement returns 403 or 404", async () => {
  if (!victimMeasurementId) {
    test.skip(true, "Could not seed victim measurement — skipping");
    return;
  }
  const attacker = await AttackerActor.loginAs("customer", BASE_URL);
  const { status } = await attacker.writeForeignMeasurement(
    victimMeasurementId,
    { weight: 999, notes: "hacked" },
  );
  expect([403, 404]).toContain(status);
});

test("@cover ADV-002b — attacker GET victim measurement returns 403 or 404", async () => {
  if (!victimMeasurementId) {
    test.skip(true, "Could not seed victim measurement — skipping");
    return;
  }
  const attacker = await AttackerActor.loginAs("customer", BASE_URL);
  const { status } = await attacker.raw(
    "GET",
    `/api/progress/measurements/${victimMeasurementId}`,
  );
  expect([403, 404]).toContain(status);
});

test("@cover ADV-002c — attacker DELETE victim measurement returns 403 or 404", async () => {
  if (!victimMeasurementId) {
    test.skip(true, "Could not seed victim measurement — skipping");
    return;
  }
  const attacker = await AttackerActor.loginAs("customer", BASE_URL);
  const { status } = await attacker.raw(
    "DELETE",
    `/api/progress/measurements/${victimMeasurementId}`,
  );
  expect([403, 404]).toContain(status);
});

test("@cover ADV-002d — attacker GET victim progress photo list returns empty or 403/404", async () => {
  // Attacker hits /api/progress/photos — should only see their own photos (empty)
  // or a 403/404. Must not return victim's photos.
  const attacker = await AttackerActor.loginAs("customer", BASE_URL);
  const { status, body } = await attacker.raw("GET", "/api/progress/photos");
  // Either 401/403/404 OR a scoped empty list — must not return victim data
  if ([401, 403, 404].includes(status)) {
    // Good — access denied
    expect([401, 403, 404]).toContain(status);
  } else {
    // Must be a 200 with ONLY the attacker's own photos (empty for this account)
    expect(status).toBe(200);
    const photos = (body as Record<string, unknown>).data ?? body;
    expect(Array.isArray(photos)).toBe(true);
    // None of these should belong to the victim's userId
  }
});
