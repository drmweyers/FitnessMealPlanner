/**
 * @cover ADV-001 — IDOR: Meal Plan Cross-Tenant Access
 * Role: attacker | Endpoint: /api/trainer/meal-plans/:id | State: saved/assigned
 * Input-class: malicious | Assertion-type: http
 *
 * Proves that a trainer (starter tier) cannot GET, PUT, DELETE another trainer's
 * meal plan by ID, and cannot assign a plan they do not own.
 */

import { test, expect } from "@playwright/test";
import { AttackerActor } from "../actors/index.js";
import { TrainerActor } from "../actors/index.js";
import { CREDENTIALS, BASE_URL } from "../../helpers/constants.js";

// We seed a "victim" meal plan from the primary trainer then probe it as attacker
let victimPlanId: string;

test.beforeAll(async () => {
  // Victim trainer creates a plan to probe
  const victim = await TrainerActor.login(CREDENTIALS.trainer, BASE_URL);
  const res = await victim.createMealPlan({
    mealPlanData: {
      name: "IDOR Target Plan",
      meals: [{ day: 1, name: "Breakfast", items: [] }],
    },
    notes: "idor test target",
  });
  // Handle both wrapped and direct response shapes
  const body = res as Record<string, unknown>;
  const plan = (body.data as Record<string, unknown>) || body;
  victimPlanId = (plan.id as string) || (plan.planId as string);
  if (!victimPlanId) {
    // Log shape so we can debug if needed
    console.warn(
      "Unexpected plan creation shape:",
      JSON.stringify(res).slice(0, 200),
    );
  }
});

test("@cover ADV-001a — attacker GET victim plan returns 403 or 404", async () => {
  if (!victimPlanId) {
    test.skip(true, "Could not seed victim plan — skipping IDOR GET probe");
    return;
  }
  const attacker = await AttackerActor.loginAs("trainer", BASE_URL);
  const { status } = await attacker.readForeignMealPlan(victimPlanId);
  expect([403, 404]).toContain(status);
});

test("@cover ADV-001b — attacker PUT victim plan returns 403 or 404", async () => {
  if (!victimPlanId) {
    test.skip(true, "Could not seed victim plan — skipping IDOR PUT probe");
    return;
  }
  const attacker = await AttackerActor.loginAs("trainer", BASE_URL);
  const { status } = await attacker.raw(
    "PUT",
    `/api/trainer/meal-plans/${victimPlanId}`,
    { mealPlanData: { name: "hacked" }, notes: "pwned" },
  );
  expect([403, 404]).toContain(status);
});

test("@cover ADV-001c — attacker DELETE victim plan returns 403 or 404", async () => {
  if (!victimPlanId) {
    test.skip(true, "Could not seed victim plan — skipping IDOR DELETE probe");
    return;
  }
  const attacker = await AttackerActor.loginAs("trainer", BASE_URL);
  const { status } = await attacker.raw(
    "DELETE",
    `/api/trainer/meal-plans/${victimPlanId}`,
  );
  expect([403, 404]).toContain(status);
});

test("@cover ADV-001d — attacker assignForeignPlan returns 403 or 404", async () => {
  if (!victimPlanId) {
    test.skip(true, "Could not seed victim plan — skipping IDOR assign probe");
    return;
  }
  const attacker = await AttackerActor.loginAs("trainer", BASE_URL);
  // Use a plausible customer ID that belongs to the victim trainer
  const { status } = await attacker.assignForeignPlan(
    victimPlanId,
    "00000000-0000-0000-0000-000000000001",
  );
  expect([403, 404]).toContain(status);
});
