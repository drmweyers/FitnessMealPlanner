/**
 * FORGE QA Warfare v2 — Side-Effect: SE-01
 * @cover { suite: "side-effect", role: "admin", endpoint: "/api/bugs", assertionType: "side-effect" }
 *
 * Trigger: Admin/trainer submits a recipe suggestion via the bug pipeline.
 * Side effect: A GitHub issue must be created (verified via GitHub API).
 *
 * SKIP if GITHUB_TOKEN is unset — records a coverage gap instead.
 * NON-DESTRUCTIVE: creates a GitHub issue in a test label; does not modify DB records.
 */

import { test, expect } from "@playwright/test";
import { AdminActor } from "../actors/index.js";
import { BASE_URL } from "../../helpers/constants.js";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || "owner/repo"; // override in CI

test.describe("SE-01 — Recipe submitted → GitHub issue created", () => {
  let admin: AdminActor;

  test.beforeAll(async () => {
    admin = await AdminActor.login(undefined, BASE_URL);
  });

  test("submitting a bug report creates a GitHub issue (skip if GITHUB_TOKEN unset)", async () => {
    if (!GITHUB_TOKEN) {
      test.skip(
        true,
        "COVERAGE GAP: GITHUB_TOKEN not set — GitHub issue side-effect not verified. " +
          "Set GITHUB_TOKEN + GITHUB_REPO in CI to enable this assertion.",
      );
      return;
    }

    const uniqueTitle = `[SE-01] Warfare test recipe suggestion ${Date.now()}`;

    // Submit via bug pipeline with a recipe category
    const submitRes = await admin.raw("POST", "/api/bugs", {
      title: uniqueTitle,
      description:
        "Automated side-effect verification: recipe submission test.",
      category: "feature_request",
      priority: "low",
    });

    // Accept 201 (created) or 200
    expect([200, 201]).toContain(submitRes.status);
    const body = submitRes.body as Record<string, unknown>;
    const bugId: string =
      (body?.id as string) ||
      ((body as Record<string, Record<string, string>>)?.data?.id as string);
    expect(bugId).toBeTruthy();

    // Wait up to 10s for the GitHub issue to be created (async side-effect)
    let githubIssueNumber: number | undefined;
    const deadline = Date.now() + 10_000;

    while (Date.now() < deadline) {
      const searchRes = await fetch(
        `https://api.github.com/search/issues?q=${encodeURIComponent(uniqueTitle)}+repo:${GITHUB_REPO}+in:title`,
        {
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github+json",
          },
        },
      );

      if (searchRes.ok) {
        const data = (await searchRes.json()) as {
          total_count: number;
          items: Array<{ number: number; title: string }>;
        };
        if (data.total_count > 0) {
          githubIssueNumber = data.items[0].number;
          break;
        }
      }
      await new Promise((r) => setTimeout(r, 1500));
    }

    expect(
      githubIssueNumber,
      `GitHub issue was NOT created for bug report "${uniqueTitle}". ` +
        "The side-effect pipe from bug submission to GitHub is broken.",
    ).toBeDefined();
  });
});
