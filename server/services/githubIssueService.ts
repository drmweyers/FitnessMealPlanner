import { logger } from "../utils/logger";
import type { BugReport } from "../../shared/schema";

const GITHUB_API = "https://api.github.com";

const CATEGORY_LABELS: Record<string, string> = {
  bug: "bug",
  feature: "feature-request",
  feedback: "feedback",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "priority: low",
  medium: "priority: medium",
  high: "priority: high",
  critical: "priority: critical",
};

export async function createGitHubIssue(
  report: BugReport,
): Promise<{ url: string; number: number } | null> {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;

  if (!token || !owner || !repo) {
    logger.warn(
      "GitHub issue creation skipped — missing GITHUB_TOKEN, GITHUB_REPO_OWNER, or GITHUB_REPO_NAME",
    );
    return null;
  }

  const CATEGORY_LABELS: Record<string, string> = {
    ui_issue: "BUG",
    data_accuracy: "BUG",
    performance: "BUG",
    sync_issue: "BUG",
    auth_access: "BUG",
    notification: "BUG",
    integration: "BUG",
    crash: "BUG",
    feature_request: "FEATURE",
    other: "FEEDBACK",
  };
  const prefix = CATEGORY_LABELS[report.category] ?? "BUG";
  const context = report.context as Record<string, string> | null;

  const body = [
    `**Category:** ${report.category} | **Priority:** ${report.priority}`,
    `**Reporter:** ${context?.userId ?? "unknown"} (${context?.userRole ?? "unknown"})`,
    `**Page:** ${context?.url ?? "unknown"}`,
    `**Browser:** ${context?.userAgent ?? "unknown"}`,
    "",
    "---",
    "",
    report.description,
    "",
    report.screenshotBase64 ? "_Screenshot attached in admin dashboard_" : "",
    "",
    `_Auto-created by EvoFit Meals bug pipeline — Report ID: ${report.id}_`,
  ].join("\n");

  const labels = [
    CATEGORY_LABELS[report.category] ?? report.category,
    PRIORITY_LABELS[report.priority] ?? report.priority,
  ];

  try {
    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        title: `[${prefix}] ${report.title}`,
        body,
        labels,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      logger.warn(`GitHub issue creation failed (${res.status}): ${text}`);
      return null;
    }

    const data = (await res.json()) as { html_url: string; number: number };
    logger.info(`GitHub issue created: ${data.html_url}`);
    return { url: data.html_url, number: data.number };
  } catch (err) {
    logger.warn(`GitHub issue creation error: ${(err as Error).message}`);
    return null;
  }
}
