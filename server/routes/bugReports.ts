// @ts-nocheck - Type errors suppressed
import { Router, Request, Response } from "express";
import express from "express";
import { db } from "../db";
import { bugReports, createBugReportSchema } from "../../shared/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { createGitHubIssue } from "../services/githubIssueService";
import { appendBugToDevUpdates } from "../services/halBridgeService";
import { logger } from "../utils/logger";

const bugReportsRouter = Router();

// API key middleware for Hal integration
function requireApiKey(req: Request, res: Response, next: Function) {
  const key = req.headers["x-api-key"];
  if (!key || key !== process.env.HAL_API_KEY) {
    return res.status(401).json({ error: "Invalid API key" });
  }
  next();
}

// POST /api/bugs — Submit a bug report (any authenticated user)
bugReportsRouter.post(
  "/",
  requireAuth,
  express.json({ limit: "2mb" }),
  async (req: Request, res: Response) => {
    try {
      const parsed = createBugReportSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const { category, description, screenshotBase64, context } = parsed.data;
      const title = description.slice(0, 80).replace(/\n/g, " ");

      const [report] = await db
        .insert(bugReports)
        .values({
          reporterId: (req as any).user?.id ?? null,
          category,
          title,
          description,
          screenshotBase64: screenshotBase64 ?? null,
          context,
        })
        .returning();

      // Fire-and-forget side effects
      createGitHubIssue(report)
        .then(async (result) => {
          if (result) {
            await db
              .update(bugReports)
              .set({
                githubIssueUrl: result.url,
                githubIssueNumber: result.number,
              })
              .where(eq(bugReports.id, report.id));
          }
        })
        .catch((err) =>
          logger.warn(`GitHub side-effect failed: ${err.message}`),
        );

      appendBugToDevUpdates(report).catch((err) =>
        logger.warn(`Hal bridge side-effect failed: ${err.message}`),
      );

      return res.status(201).json({
        id: report.id,
        status: report.status,
        message: "Bug report submitted successfully",
      });
    } catch (err) {
      logger.error(`Bug report submission failed: ${(err as Error).message}`);
      return res.status(500).json({ error: "Failed to submit bug report" });
    }
  },
);

// GET /api/bugs — List all bug reports (admin only)
bugReportsRouter.get("/", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status, category, page = "1", limit = "50" } = req.query;
    const offset =
      (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10);

    const conditions = [];
    if (status && status !== "all")
      conditions.push(eq(bugReports.status, status as any));
    if (category && category !== "all")
      conditions.push(eq(bugReports.category, category as any));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, [{ total }]] = await Promise.all([
      db
        .select()
        .from(bugReports)
        .where(where)
        .orderBy(desc(bugReports.createdAt))
        .limit(parseInt(limit as string, 10))
        .offset(offset),
      db.select({ total: count() }).from(bugReports).where(where),
    ]);

    return res.json({ data, total, page: parseInt(page as string, 10) });
  } catch (err) {
    logger.error(`Bug report listing failed: ${(err as Error).message}`);
    return res.status(500).json({ error: "Failed to fetch bug reports" });
  }
});

// GET /api/bugs/pending — Untriaged bugs for Hal polling
bugReportsRouter.get(
  "/pending",
  requireApiKey,
  async (_req: Request, res: Response) => {
    try {
      const data = await db
        .select()
        .from(bugReports)
        .where(
          and(
            eq(bugReports.status, "open"),
            eq(bugReports.assignedToHal, false),
          ),
        )
        .orderBy(desc(bugReports.createdAt))
        .limit(50);

      return res.json({ data, count: data.length });
    } catch (err) {
      logger.error(`Pending bugs fetch failed: ${(err as Error).message}`);
      return res.status(500).json({ error: "Failed to fetch pending bugs" });
    }
  },
);

// GET /api/bugs/:id — Single bug report detail (admin only)
bugReportsRouter.get(
  "/:id",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const [report] = await db
        .select()
        .from(bugReports)
        .where(eq(bugReports.id, req.params.id));

      if (!report)
        return res.status(404).json({ error: "Bug report not found" });
      return res.json(report);
    } catch (err) {
      return res.status(500).json({ error: "Failed to fetch bug report" });
    }
  },
);

// PATCH /api/bugs/:id/status — Update status (admin only)
bugReportsRouter.patch(
  "/:id/status",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { status, adminNotes } = req.body;
      const validStatuses = [
        "open",
        "triaged",
        "in_progress",
        "resolved",
        "closed",
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const updates: Record<string, any> = {
        status,
        updatedAt: new Date(),
      };
      if (adminNotes !== undefined) updates.adminNotes = adminNotes;
      if (status === "resolved") updates.resolvedAt = new Date();

      const [updated] = await db
        .update(bugReports)
        .set(updates)
        .where(eq(bugReports.id, req.params.id))
        .returning();

      if (!updated)
        return res.status(404).json({ error: "Bug report not found" });
      return res.json(updated);
    } catch (err) {
      return res
        .status(500)
        .json({ error: "Failed to update bug report status" });
    }
  },
);

// PATCH /api/bugs/:id/priority — Change priority (admin only)
bugReportsRouter.patch(
  "/:id/priority",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { priority } = req.body;
      const validPriorities = ["low", "medium", "high", "critical"];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({ error: "Invalid priority" });
      }

      const [updated] = await db
        .update(bugReports)
        .set({ priority, updatedAt: new Date() })
        .where(eq(bugReports.id, req.params.id))
        .returning();

      if (!updated)
        return res.status(404).json({ error: "Bug report not found" });
      return res.json(updated);
    } catch (err) {
      return res
        .status(500)
        .json({ error: "Failed to update bug report priority" });
    }
  },
);

// PATCH /api/bugs/:id/assign — Hal claims a bug
bugReportsRouter.patch(
  "/:id/assign",
  requireApiKey,
  async (req: Request, res: Response) => {
    try {
      const [updated] = await db
        .update(bugReports)
        .set({
          assignedToHal: true,
          assignedAt: new Date(),
          status: "triaged",
          updatedAt: new Date(),
        })
        .where(eq(bugReports.id, req.params.id))
        .returning();

      if (!updated)
        return res.status(404).json({ error: "Bug report not found" });
      return res.json(updated);
    } catch (err) {
      return res.status(500).json({ error: "Failed to assign bug report" });
    }
  },
);

export { bugReportsRouter };
