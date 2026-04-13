import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../../server/db";
import { storage } from "../../server/storage";
import {
  trainerMealPlans,
  mealPlanAssignments,
  users,
} from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

// Regression: Hotfix B8 — Sprint 3 SEC-004
// Without the unique(mealPlanId, customerId) index, a trainer who clicked
// "assign" twice (or two browser tabs racing) created duplicate assignment
// rows silently, and the customer saw the same plan twice. Migration 0028
// adds the unique index; storage.assignMealPlanToCustomer is now idempotent
// via onConflictDoNothing.
describe("Meal plan assignment unique constraint (Hotfix B8)", () => {
  let trainerId: string;
  let customerId: string;
  let mealPlanId: string;

  beforeAll(async () => {
    // Seed a throwaway trainer + customer + plan
    const [trainer] = await db
      .insert(users)
      .values({
        email: `b8-trainer-${Date.now()}@warfare.test`,
        password: "unused",
        role: "trainer",
      })
      .returning({ id: users.id });
    trainerId = trainer.id;

    const [customer] = await db
      .insert(users)
      .values({
        email: `b8-customer-${Date.now()}@warfare.test`,
        password: "unused",
        role: "customer",
      })
      .returning({ id: users.id });
    customerId = customer.id;

    const [plan] = await db
      .insert(trainerMealPlans)
      .values({
        trainerId,
        mealPlanData: { planName: "B8 test", meals: [] } as any,
      })
      .returning({ id: trainerMealPlans.id });
    mealPlanId = plan.id;
  });

  afterAll(async () => {
    await db
      .delete(mealPlanAssignments)
      .where(eq(mealPlanAssignments.mealPlanId, mealPlanId));
    await db
      .delete(trainerMealPlans)
      .where(eq(trainerMealPlans.id, mealPlanId));
    await db.delete(users).where(eq(users.id, trainerId));
    await db.delete(users).where(eq(users.id, customerId));
  });

  it("first assign creates one row", async () => {
    const result = await storage.assignMealPlanToCustomer(
      mealPlanId,
      customerId,
      trainerId,
      "first assign",
    );
    expect(result.mealPlanId).toBe(mealPlanId);
    expect(result.customerId).toBe(customerId);

    const rows = await db
      .select()
      .from(mealPlanAssignments)
      .where(
        and(
          eq(mealPlanAssignments.mealPlanId, mealPlanId),
          eq(mealPlanAssignments.customerId, customerId),
        ),
      );
    expect(rows).toHaveLength(1);
  });

  it("second sequential assign is idempotent — still 1 row", async () => {
    const result = await storage.assignMealPlanToCustomer(
      mealPlanId,
      customerId,
      trainerId,
      "second assign",
    );
    expect(result.mealPlanId).toBe(mealPlanId);

    const rows = await db
      .select()
      .from(mealPlanAssignments)
      .where(
        and(
          eq(mealPlanAssignments.mealPlanId, mealPlanId),
          eq(mealPlanAssignments.customerId, customerId),
        ),
      );
    expect(rows).toHaveLength(1);
  });

  it("5 concurrent assigns produce exactly 1 row", async () => {
    // Clean slate
    await db
      .delete(mealPlanAssignments)
      .where(
        and(
          eq(mealPlanAssignments.mealPlanId, mealPlanId),
          eq(mealPlanAssignments.customerId, customerId),
        ),
      );

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        storage.assignMealPlanToCustomer(
          mealPlanId,
          customerId,
          trainerId,
          "race",
        ),
      ),
    );

    // All 5 calls return the same assignment row
    expect(results).toHaveLength(5);
    const ids = new Set(results.map((r) => r.id));
    expect(ids.size).toBe(1);

    const rows = await db
      .select()
      .from(mealPlanAssignments)
      .where(
        and(
          eq(mealPlanAssignments.mealPlanId, mealPlanId),
          eq(mealPlanAssignments.customerId, customerId),
        ),
      );
    expect(rows).toHaveLength(1);
  });
});
