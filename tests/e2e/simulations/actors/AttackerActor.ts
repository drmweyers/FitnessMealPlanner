import { ForgeApiClient } from "../../helpers/api-client.js";
import { CREDENTIALS } from "../../helpers/constants.js";
import { BaseActor, RoleName } from "./BaseActor.js";

/**
 * AttackerActor — an authenticated user (typically a low-tier trainer or
 * second customer) who tries to access OTHER tenants' data.
 * Used for IDOR, role escalation, mass assignment, XSS, SQL wildcard,
 * and authorization-bypass tests.
 *
 * The attacker is "authorized to be a user", "not authorized to be this user".
 */
export class AttackerActor extends BaseActor {
  readonly role: RoleName = "attacker";

  static async loginAs(
    persona: "trainer" | "customer" = "trainer",
    baseUrl?: string,
  ): Promise<AttackerActor> {
    const cred =
      persona === "trainer" ? CREDENTIALS.trainerStarter : CREDENTIALS.customer;
    const client = await ForgeApiClient.loginWith(
      cred.email,
      cred.password,
      baseUrl,
    );
    return new AttackerActor(client);
  }

  // ---------- IDOR probes ----------
  /** Try to read another trainer's meal plan by id. */
  readForeignMealPlan(planId: string) {
    return this.client.raw("GET", `/api/trainer/meal-plans/${planId}`);
  }
  /** Try to update someone else's measurement. */
  writeForeignMeasurement(measurementId: string, body: unknown) {
    return this.client.raw(
      "PUT",
      `/api/progress/measurements/${measurementId}`,
      body,
    );
  }
  /** Try to assign a meal plan you don't own. */
  assignForeignPlan(planId: string, customerId: string) {
    return this.client.raw("POST", `/api/trainer/meal-plans/${planId}/assign`, {
      customerId,
    });
  }
  /** Try to read someone else's customer roster. */
  readForeignCustomer(customerId: string) {
    return this.client.raw(
      "GET",
      `/api/trainer/customers/${customerId}/meal-plans`,
    );
  }

  // ---------- Role escalation ----------
  /** Try to call an admin-only endpoint as a non-admin. */
  callAdminEndpoint(method: string, path: string, body?: unknown) {
    return this.client.raw(method, path, body);
  }

  // ---------- Mass assignment ----------
  /** Try to elevate your own role via PUT /api/profile. */
  selfElevate() {
    return this.client.raw("PUT", "/api/profile", { role: "admin" });
  }
  /** Try to set someone else's userId on creation. */
  createWithForeignOwner(path: string, foreignUserId: string, payload: object) {
    return this.client.raw("POST", path, { ...payload, userId: foreignUserId });
  }

  // ---------- XSS / SQL wildcard probes ----------
  static readonly xssPayloads = [
    `<script>alert(1)</script>`,
    `"><img src=x onerror=alert(1)>`,
    `javascript:alert(1)`,
    `<svg/onload=alert(1)>`,
  ];
  static readonly sqlWildcards = [
    `' OR 1=1 --`,
    `'; DROP TABLE users; --`,
    `%`,
    `\\`,
  ];

  // ---------- Idempotency / replay ----------
  async replay(method: string, path: string, body: unknown, times = 5) {
    const results = [];
    for (let i = 0; i < times; i++) {
      results.push(await this.client.raw(method, path, body));
    }
    return results;
  }
}
