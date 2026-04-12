---
name: side-effect-verification
description: Prove that the "invisible" side effects of an action actually happened — emails queued, PDFs generated, SSE messages streamed, webhooks called, S3 objects uploaded, GitHub issues filed, Hal messages posted. Use when an action is supposed to trigger something beyond the HTTP response. Trigger phrases - "side effects", "email fired", "webhook called", "verify PDF".
---

# Side-Effect Verification

## Purpose

A test that checks only `res.status === 200` proves the app didn't crash. It does not prove the email was sent, the PDF was generated, or the webhook fired. **Production bugs hide in these invisible hops.** This skill makes them visible.

## The 6 Side-Effect Classes

### 1. Email

Use a queue fixture (not real SMTP). In FMP: Mailgun.

```typescript
beforeEach(() => mailgun.reset());

test("assigning plan sends customer email", async () => {
  await trainer.assignPlan(plan.id, customer.id);
  await waitFor(() => mailgun.sent.length === 1);
  const email = mailgun.sent[0];
  expect(email.to).toBe(customer.email);
  expect(email.template).toBe("plan-assigned");
  expect(email.variables.planName).toBe(plan.name);
  expect(email.variables.trainerName).toBe(trainer.name);
});
```

**Assert on:** recipient, template, variables, attachments, scheduled-send timestamp.

### 2. PDF generation

Don't check HTTP 200 — download the bytes and parse them.

```typescript
test("plan PDF contains correct macros and branding", async () => {
  const res = await customer.downloadPlanPdf(plan.id);
  expect(res.status).toBe(200);
  expect(res.headers["content-type"]).toBe("application/pdf");

  const pdf = await parsePdf(res.body);
  expect(pdf.numpages).toBeGreaterThan(0);
  expect(pdf.text).toContain(plan.name);
  expect(pdf.text).toContain("Protein: 180g");
  expect(pdf.text).toContain("EvoFit Meals"); // branding
  // purple brand color present
  expect(pdf.colors).toContain("#9333EA");
});
```

### 3. SSE / WebSocket streams

Connect a test client and assert on the event stream.

```typescript
test("bulk generation streams progress events", async () => {
  const events: any[] = [];
  const stream = new EventSource(`${BASE}/api/bulk/progress?jobId=${jobId}`);
  stream.onmessage = (e) => events.push(JSON.parse(e.data));

  await admin.startBulkGen({ count: 3 });
  await waitFor(() => events.some((e) => e.type === "complete"), {
    timeout: 60_000,
  });

  expect(
    events.filter((e) => e.type === "progress").length,
  ).toBeGreaterThanOrEqual(3);
  expect(events.find((e) => e.type === "complete").total).toBe(3);
});
```

**Assert on:** event order, event count, payload shape, final state.

### 4. Outbound webhooks (Stripe, Hal bridge, GitHub)

Capture with a test sink (e.g. local HTTP server) and assert.

```typescript
test("tier upgrade posts to Hal bridge", async () => {
  const sink = await startHttpSink("/hal/tier-change");
  await admin.grantTier(trainer.id, "enterprise");
  const hit = await sink.waitForRequest({ timeout: 5000 });
  expect(hit.body).toMatchObject({
    event: "tier.changed",
    trainerId: trainer.id,
    tier: "enterprise",
  });
  expect(hit.headers["x-hal-signature"]).toBeDefined();
});
```

### 5. S3 / object storage

Assert the object exists with the right content-type and size.

```typescript
test("progress photo upload stores in S3 with correct ACL", async () => {
  const up = await customer.uploadProgressPhoto(fixturePhoto);
  expect(up.url).toMatch(/digitaloceanspaces\.com/);
  const head = await s3.headObject(parseKey(up.url));
  expect(head.ContentType).toBe("image/jpeg");
  expect(head.ContentLength).toBeGreaterThan(1000);
  expect(head.ACL).not.toBe("public-read"); // progress photos must be private
});
```

### 6. Database cascades & audit log

Every mutation should log. Every delete should cascade or soft-delete.

```typescript
test("deleting customer writes audit log and cascades assignments", async () => {
  const customerId = (await seed.customer()).id;
  await seed.assignedPlan({ customerId });

  await admin.deleteCustomer(customerId);

  // cascade
  expect(await db.assignments.count({ customerId })).toBe(0);

  // audit
  const audit = await db.auditLog.findFirst({
    where: { targetId: customerId },
  });
  expect(audit.action).toBe("customer.delete");
  expect(audit.actorRole).toBe("admin");
});
```

## The side-effect test wrapper

```typescript
function withSideEffectTracking<T>(fn: () => Promise<T>) {
  const captured = {
    emails: [] as any[],
    webhooks: [] as any[],
    s3Writes: [] as any[],
    sseEvents: [] as any[],
    auditWrites: [] as any[],
  };
  // install spies
  const restore = installSpies(captured);
  return fn()
    .then((result) => ({ result, captured }))
    .finally(restore);
}
```

Every warfare test that performs a mutation should wrap in this and assert on `captured`.

## Done when

- Every row in `side-effects-inventory.md` has at least one assertion test
- No test relies on HTTP 200 alone to "prove" a side effect
- PDFs are parsed, not just downloaded
- Webhooks are captured with a sink, not mocked away
