---
name: state-machine-coverage
description: Prove every state transition of every resource — legal transitions work, illegal transitions are rejected, concurrent transitions don't corrupt state. Use when a resource has a status/lifecycle enum. Trigger phrases - "state transitions", "lifecycle tests", "status tests", "FSM coverage".
---

# State Machine Coverage

## Purpose

Most production data-corruption bugs are illegal state transitions that the app accidentally allows. This skill produces a **transition matrix** for every stateful resource and tests every cell.

## Input

A resource with a status/type enum. For FMP:

| Resource        | States                                                 |
| --------------- | ------------------------------------------------------ |
| meal_plan       | draft, assigned, active, completed, archived           |
| recipe          | pending, approved, rejected, archived                  |
| bug_report      | open, claimed, in_progress, resolved, closed, wont_fix |
| subscription    | trial, active, paused, canceled, expired               |
| invitation      | sent, accepted, expired, revoked                       |
| bulk_generation | queued, running, succeeded, failed, canceled           |

## The Transition Matrix

For each resource, build an N×N table where N = number of states:

```
         draft  assigned  active  completed  archived
draft     -     ✓         ✗       ✗          ✓
assigned  ✗     -         ✓       ✗          ✓
active    ✗     ✗         -       ✓          ✓
completed ✗     ✗         ✗       -          ✓
archived  ✗     ✗         ✗       ✗          -
```

- `✓` = legal transition → test it works + has correct side effects
- `✗` = illegal transition → test the API rejects it (expect 409 or 400, never 200)

## The 5 Test Classes per Resource

### Class A — Legal transitions succeed

For each `✓` cell: set up the resource in state X, fire the trigger, assert state is Y and expected side effects fired.

```typescript
test("meal plan draft → assigned sends customer email", async () => {
  const plan = await seed.mealPlan({ status: "draft" });
  await trainer.assignPlan(plan.id, customerId);
  expect(await db.mealPlan(plan.id).status).toBe("assigned");
  expect(mailgun.sent).toContainEqual(
    expect.objectContaining({
      to: customer.email,
      template: "plan-assigned",
    }),
  );
});
```

### Class B — Illegal transitions fail

For each `✗` cell: try to trigger it via the API, assert rejection.

```typescript
test("meal plan archived → assigned is rejected", async () => {
  const plan = await seed.mealPlan({ status: "archived" });
  const res = await api
    .as("trainer")
    .post(`/api/meal-plans/${plan.id}/assign`, {
      customerId,
    });
  expect(res.status).toBe(409);
  expect(await db.mealPlan(plan.id).status).toBe("archived");
});
```

### Class C — Concurrent transition safety

Two actors attempt transitions simultaneously:

```typescript
test("two trainers cannot both assign the same plan", async () => {
  const plan = await seed.mealPlan({ status: "draft" });
  const [r1, r2] = await Promise.all([
    trainerA.assignPlan(plan.id, customerA),
    trainerB.assignPlan(plan.id, customerB),
  ]);
  const successes = [r1, r2].filter((r) => r.status === 200);
  expect(successes.length).toBe(1);
  // DB must reflect exactly one assignment
  expect(await db.mealPlanAssignments.count({ planId: plan.id })).toBe(1);
});
```

### Class D — Cascade integrity

Terminal state transitions must clean up dependents:

```typescript
test("archiving trainer cascades to meal plans, recipes, assignments", async () => {
  const trainer = await seed.trainer({ withPlans: 3, withRecipes: 5 });
  await admin.archiveTrainer(trainer.id);
  expect(
    await db.mealPlans.count({ trainerId: trainer.id, archived: false }),
  ).toBe(0);
  expect(
    await db.recipes.count({ trainerId: trainer.id, archived: false }),
  ).toBe(0);
  // no orphaned s3 objects (check via list)
});
```

### Class E — State persistence across failure

Pull the plug mid-transition; state must be consistent:

```typescript
test("SIGKILL during bulk generation commits completed items only", async () => {
  const job = await admin.startBulkGen({ count: 50 });
  await sleep(3000);
  await killProcess("worker");
  const row = await db.bulkJobs.find(job.id);
  expect(["queued", "running", "failed"]).toContain(row.status);
  // completed items before kill must still exist
  const done = await db.recipes.count({ bulkJobId: job.id });
  expect(done).toBeGreaterThanOrEqual(0);
  // no half-written recipes (all rows are either fully written or not at all)
});
```

## Output

1. `docs/plans/state-machines/<resource>.md` — FSM diagram (mermaid) + transition matrix
2. `tests/e2e/state-machines/<resource>.spec.ts` — all 5 classes

## Done when

- Every resource in the FMP schema with an enum status has a transition matrix
- Every cell is exercised (legal or illegal)
- Every terminal transition has a cascade test
- Every concurrent-mutation endpoint has a Class C test
