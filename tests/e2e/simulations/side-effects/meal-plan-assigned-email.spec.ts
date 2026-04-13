/**
 * FORGE QA Warfare v2 — Side-Effect: SE-03
 * @cover { suite: "side-effect", role: "trainer", endpoint: "/api/trainer/meal-plans/:id/assign", assertionType: "side-effect" }
 *
 * Trigger: Trainer assigns a meal plan to a customer.
 * Side effect: Resend email queued for the customer.
 *
 * COVERAGE GAP (documented):
 *   We cannot read the Resend mailbox programmatically without Resend test mode
 *   or a mail capture service (Mailtrap, etc.) configured in the test env.
 *   Instead we verify that the assign endpoint returns a response that
 *   includes an "emailQueued" or "notified" flag, OR we check that the HTTP
 *   response is a success (plan was assigned) and log the coverage gap.
 *
 * To close this gap: configure RESEND_TEST_MODE=1 and a capture endpoint,
 * then poll that endpoint for the expected email.
 *
 * NON-DESTRUCTIVE: uses existing seeded plan + customer.
 */

import { test, expect } from "@playwright/test";
import { TrainerActor } from "../actors/index.js";
import { BASE_URL } from "../../helpers/constants.js";

test.describe("SE-03 — Meal plan assigned → email queued (partial coverage)", () => {
  let trainer: TrainerActor;

  test.beforeAll(async () => {
    trainer = await TrainerActor.login(undefined, BASE_URL);
  });

  test("assigning a meal plan succeeds and response indicates email action", async () => {
    // First, get an existing plan to assign
    const plansRes = await trainer.raw("GET", "/api/trainer/meal-plans");
    expect([200]).toContain(plansRes.status);

    const plans = Array.isArray(plansRes.body)
      ? (plansRes.body as Array<Record<string, unknown>>)
      : (((plansRes.body as Record<string, unknown>)?.mealPlans ??
          (plansRes.body as Record<string, unknown>)?.data ??
          []) as Array<Record<string, unknown>>);

    if (!plans || plans.length === 0) {
      test.skip(true, "No meal plans available to assign — seed the DB first.");
      return;
    }

    const plan = plans[0];
    const planId = plan.id as string;

    // Get trainer's customer list
    const customersRes = await trainer.raw("GET", "/api/trainer/customers");
    expect([200]).toContain(customersRes.status);

    const customers = Array.isArray(customersRes.body)
      ? (customersRes.body as Array<Record<string, unknown>>)
      : (((customersRes.body as Record<string, unknown>)?.customers ??
          (customersRes.body as Record<string, unknown>)?.data ??
          []) as Array<Record<string, unknown>>);

    if (!customers || customers.length === 0) {
      test.skip(
        true,
        "No customers available — trainer has no assigned customers. Seed the DB.",
      );
      return;
    }

    const customerId = customers[0].id as string;

    // Perform assignment
    const assignRes = await trainer.raw(
      "POST",
      `/api/trainer/meal-plans/${planId}/assign`,
      { customerId },
    );

    // Assignment must succeed
    expect([200, 201, 204]).toContain(assignRes.status);

    // PARTIAL COVERAGE: we can only verify success here, not the email itself.
    // Full email assertion requires Resend test mode or mail capture.
    console.warn(
      "[SE-03 COVERAGE GAP] Email side-effect not verified. " +
        "Configure RESEND_TEST_MODE + mail capture endpoint to close this gap.",
    );

    // If the response includes an emailQueued or notified signal, assert it
    const body = assignRes.body as Record<string, unknown> | null;
    if (body && typeof body === "object") {
      // Optional assertion: if API explicitly signals email was queued
      if ("emailQueued" in body) {
        expect(body.emailQueued).toBe(true);
      }
      if ("notified" in body) {
        expect(body.notified).toBe(true);
      }
    }
  });
});
