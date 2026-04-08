// @ts-nocheck - Type errors suppressed
import { Router, Request, Response } from "express";
import { db } from "../db";
import { bugReports } from "../../shared/schema";
import { eq, count } from "drizzle-orm";
import { logger } from "../utils/logger";

const commandCentreRouter = Router();

function requireCommandCentreKey(req: Request, res: Response, next: Function) {
  const key = req.headers["x-api-key"];
  if (!key || key !== process.env.COMMAND_CENTRE_API_KEY) {
    return res.status(401).json({ error: "Invalid API key" });
  }
  next();
}

// GET /api/command-centre/status — Cross-project health endpoint
commandCentreRouter.get(
  "/status",
  requireCommandCentreKey,
  async (_req: Request, res: Response) => {
    try {
      const startTime = Date.now();

      // Bug counts by status
      const bugCounts = await db
        .select({
          status: bugReports.status,
          count: count(),
        })
        .from(bugReports)
        .groupBy(bugReports.status);

      const bugMap: Record<string, number> = {};
      for (const row of bugCounts) {
        bugMap[row.status] = Number(row.count);
      }

      // Critical bug count
      const [criticalResult] = await db
        .select({ count: count() })
        .from(bugReports)
        .where(eq(bugReports.priority, "critical"));

      const mem = process.memoryUsage();
      const uptimeSeconds = process.uptime();

      return res.json({
        project: "fitnessmealplanner",
        displayName: "EvoFit Meals",
        timestamp: new Date().toISOString(),
        health: {
          status: "healthy",
          uptimeSeconds: Math.floor(uptimeSeconds),
          memoryUsageMb: Math.round(mem.heapUsed / 1024 / 1024),
          responseTimeMs: Date.now() - startTime,
        },
        bugs: {
          open: bugMap["open"] ?? 0,
          triaged: bugMap["triaged"] ?? 0,
          inProgress: bugMap["in_progress"] ?? 0,
          resolved: bugMap["resolved"] ?? 0,
          closed: bugMap["closed"] ?? 0,
          critical: Number(criticalResult?.count ?? 0),
        },
        deploy: {
          lastCommit: process.env.DEPLOY_COMMIT_SHA || "unknown",
          environment: process.env.NODE_ENV || "development",
          url: process.env.APP_URL || "https://evofitmeals.com",
        },
      });
    } catch (err) {
      logger.error(`Command centre status failed: ${(err as Error).message}`);
      return res.status(500).json({ error: "Failed to get status" });
    }
  },
);

export default commandCentreRouter;
