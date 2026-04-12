---
name: cross-role-integrity
description: Verify that when role X mutates a resource, role Y sees the correct change — in both directions, with real-time or polling expectations. Use when a feature spans multiple roles. Trigger phrases - "cross-role", "trainer to customer", "data propagation", "multi-actor test".
---

# Cross-Role Integrity

## Purpose

Most user-visible bugs are **perspective mismatches**: trainer sees X, customer sees Y, and they're supposed to be the same. This skill writes tests that assert the SAME data from TWO or more role perspectives.

## The 3 Patterns

### Pattern 1 — Dual-perspective assertion

After the writer mutates, the reader must see the change.

```typescript
test("trainer edits plan → customer sees new macro total", async () => {
  // Arrange: trainer has assigned plan to customer
  const plan = await seed.assignedPlan();

  // Act: trainer edits
  await trainer.login();
  await trainer.editPlanMacros(plan.id, { protein: 180 });

  // Assert from trainer side
  await trainer.openPlan(plan.id);
  expect(await trainer.page.getByTestId("protein-total").textContent()).toBe(
    "180g",
  );

  // Assert from customer side (same data, different auth)
  await customer.login();
  await customer.openAssignedPlan();
  expect(await customer.page.getByTestId("protein-total").textContent()).toBe(
    "180g",
  );
});
```

Write this for **every cross-role touchpoint** in the surface map.

### Pattern 2 — Propagation timing

How fast must the change appear to the other role? Pick the right strategy:

| Mechanism                             | Latency         | Test strategy                    |
| ------------------------------------- | --------------- | -------------------------------- |
| Synchronous (customer refreshes page) | any             | reload + assert                  |
| Polling (e.g. every 10s)              | ≤ poll interval | wait up to 2× interval           |
| SSE / WebSocket push                  | ≤ 1s            | listen for event, assert payload |
| Email / out-of-band                   | ≤ queue flush   | inspect mail queue fixture       |

```typescript
test("assigning plan pushes SSE to customer within 1s", async () => {
  await customer.login();
  const sseEvents = customer.listenSse("/api/events");
  await trainer.assignPlan(plan.id, customer.id);
  const event = await sseEvents.waitFor((e) => e.type === "plan.assigned", {
    timeout: 1000,
  });
  expect(event.payload.planId).toBe(plan.id);
});
```

### Pattern 3 — Chain integrity

Multi-hop flows where role A → role B → role C must all stay consistent.

**FMP-specific chains:**

| Chain               | Steps                                                                                |
| ------------------- | ------------------------------------------------------------------------------------ |
| Bug pipeline        | customer reports → admin triages → Hal claims → Hal commits fix → customer notified  |
| Funnel → tier       | anon buys on /professional → Stripe webhook → trainer tier=pro → new seats available |
| Bulk gen → library  | admin starts gen → SSE progress → recipes appear in library → trainers can assign    |
| Meal plan lifecycle | trainer creates → assigns → customer views → checks off grocery → logs progress      |
| Recipe moderation   | trainer submits → admin approves → appears in library → assigned in plan             |

For each chain, write one test that walks every step and asserts state at every hop — using a different actor per hop.

```typescript
test("bug pipeline end-to-end", async () => {
  // Step 1 — customer reports
  const bug = await customer.submitBug({
    category: "ui",
    description: "login broken on safari",
  });
  expect(await db.bugs.find(bug.id).status).toBe("open");

  // Step 2 — admin triages (admin sees it)
  await admin.login();
  await admin.openBugQueue();
  expect(await admin.page.getByText("login broken on safari")).toBeVisible();

  // Step 3 — Hal claims
  await halActor.claim(bug.id);
  expect(await db.bugs.find(bug.id).status).toBe("claimed");
  expect(await db.bugs.find(bug.id).claimedBy).toBe("hal");

  // Step 4 — Hal posts fix
  await halActor.postFix(bug.id, { commit: "abc123", pr: 456 });
  expect(await db.bugs.find(bug.id).status).toBe("resolved");

  // Step 5 — customer sees resolved notification
  await customer.login();
  expect(
    await customer.page.getByText("Bug #" + bug.id + " resolved"),
  ).toBeVisible();
});
```

## The `chain` test harness

```typescript
async function chain(name: string, hops: ChainHop[]) {
  test(name, async () => {
    let ctx = {};
    for (const hop of hops) {
      const actor = getActor(hop.role);
      await actor.login();
      ctx = await hop.action(actor, ctx);
      for (const assertion of hop.assertions) {
        await assertion(ctx);
      }
    }
  });
}
```

## Done when

- Every cross-role touchpoint in `recon-surface.md` has a dual-perspective test
- Every multi-hop chain in FMP (5+ identified) has a full-chain test
- Every propagation mechanism has its latency budget asserted
