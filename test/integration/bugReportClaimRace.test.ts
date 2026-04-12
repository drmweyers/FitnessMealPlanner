import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import express from "express";
import { db } from "../../server/db";
import { bugReports } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { bugReportsRouter } from "../../server/routes/bugReports";

// Regression: Hal dual-claim race on PATCH /api/bugs/:id/assign.
// Before the fix, two concurrent claims both set assignedToHal=true.
// After the fix, exactly one wins with 200 and the loser gets 409.
describe("Bug report claim race (Hotfix A1)", () => {
  const apiKey = "test-hal-key-claim-race";
  let app: express.Express;

  beforeAll(() => {
    process.env.HAL_API_KEY = apiKey;
    app = express();
    app.use(express.json());
    app.use("/api/bugs", bugReportsRouter);
  });

  afterAll(async () => {
    await db.delete(bugReports).where(eq(bugReports.title, "race test bug"));
  });

  async function seedOpenBug(): Promise<string> {
    const [row] = await db
      .insert(bugReports)
      .values({
        title: "race test bug",
        description: "seeded for claim race",
        category: "other",
        priority: "medium",
        status: "open",
        assignedToHal: false,
      })
      .returning({ id: bugReports.id });
    return row.id;
  }

  it("serializes two concurrent claims: one 200, one 409", async () => {
    const bugId = await seedOpenBug();

    const [a, b] = await Promise.all([
      request(app).patch(`/api/bugs/${bugId}/assign`).set("x-api-key", apiKey),
      request(app).patch(`/api/bugs/${bugId}/assign`).set("x-api-key", apiKey),
    ]);

    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([200, 409]);

    const [row] = await db
      .select()
      .from(bugReports)
      .where(eq(bugReports.id, bugId));
    expect(row.assignedToHal).toBe(true);
    expect(row.status).toBe("triaged");
    expect(row.assignedAt).not.toBeNull();
  });

  it("returns 404 when bug does not exist", async () => {
    const res = await request(app)
      .patch(`/api/bugs/${randomUUID()}/assign`)
      .set("x-api-key", apiKey);
    expect(res.status).toBe(404);
  });

  it("returns 409 when a second actor claims an already-claimed bug", async () => {
    const bugId = await seedOpenBug();

    const first = await request(app)
      .patch(`/api/bugs/${bugId}/assign`)
      .set("x-api-key", apiKey);
    expect(first.status).toBe(200);

    const second = await request(app)
      .patch(`/api/bugs/${bugId}/assign`)
      .set("x-api-key", apiKey);
    expect(second.status).toBe(409);
    expect(second.body.error).toMatch(/already claimed/i);
  });
});
