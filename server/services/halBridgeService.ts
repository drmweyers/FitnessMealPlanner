import * as fs from "fs/promises";
import * as path from "path";
import { logger } from "../utils/logger";
import type { BugReport } from "../../shared/schema";

const DEFAULT_DEV_UPDATES_PATH = path.join(
  process.env.HOME || process.env.USERPROFILE || "",
  "Claude/second-brain/dev-updates/fitnessmealplanner.md",
);

export async function appendBugToDevUpdates(report: BugReport): Promise<void> {
  const filePath = process.env.HAL_DEV_UPDATES_PATH || DEFAULT_DEV_UPDATES_PATH;
  const context = report.context as Record<string, string> | null;

  const entry = [
    "",
    `## BUG QUEUE ENTRY — ${new Date().toISOString()}`,
    `- **ID:** ${report.id}`,
    `- **Category:** ${report.category} | **Priority:** ${report.priority}`,
    `- **Title:** ${report.title}`,
    `- **Reporter:** ${context?.userId ?? "unknown"} (${context?.userRole ?? "unknown"})`,
    `- **URL:** ${context?.url ?? "unknown"}`,
    `- **Status:** open (unassigned)`,
    `- **GitHub:** ${report.githubIssueUrl || "pending"}`,
    "",
  ].join("\n");

  try {
    await fs.appendFile(filePath, entry, "utf-8");
    logger.info(`Bug ${report.id} appended to Hal dev-updates`);
  } catch (err) {
    logger.warn(
      `Failed to append bug to dev-updates: ${(err as Error).message}`,
    );
  }
}
