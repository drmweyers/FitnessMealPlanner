/**
 * FORGE QA Global Setup — EvoFitMeals
 *
 * Two-phase Playwright globalSetup:
 *   Phase 1: Save auth storageState for each role (reuses existing auth.setup.ts pattern)
 *   Phase 2: Run forge-seed.ts to create simulation data
 */

import { chromium, type FullConfig } from "@playwright/test";
import path from "path";
import fs from "fs";
import { CREDENTIALS, BASE_URL } from "../helpers/constants.js";
import { seed } from "./forge-seed.js";

const AUTH_DIR = path.join(process.cwd(), "tests/e2e/auth-state");

const ACCOUNTS = [
  {
    role: "admin" as const,
    email: CREDENTIALS.admin.email,
    password: CREDENTIALS.admin.password,
    file: path.join(AUTH_DIR, "admin.json"),
    expectUrl: /dashboard|admin/i,
  },
  {
    role: "trainer" as const,
    email: CREDENTIALS.trainer.email,
    password: CREDENTIALS.trainer.password,
    file: path.join(AUTH_DIR, "trainer.json"),
    expectUrl: /trainer|dashboard/i,
  },
  {
    role: "customer" as const,
    email: CREDENTIALS.customer.email,
    password: CREDENTIALS.customer.password,
    file: path.join(AUTH_DIR, "client.json"),
    expectUrl: /customer|dashboard|meal|home/i,
  },
];

async function forgeGlobalSetup(config: FullConfig) {
  const baseUrl = process.env.BASE_URL || BASE_URL;
  const headed = process.env.HEADED === "1";

  console.log("\n========================================");
  console.log("  FORGE QA Global Setup");
  console.log(`  Target: ${baseUrl}`);
  console.log("========================================\n");

  // -----------------------------------------------------------------------
  // Phase 1: Auth state
  // -----------------------------------------------------------------------
  console.log("[forge-setup] Phase 1: Saving auth state...\n");

  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: !headed });

  for (const account of ACCOUNTS) {
    // Reuse if fresh (< 8 minutes old)
    if (fs.existsSync(account.file)) {
      const stat = fs.statSync(account.file);
      const ageMs = Date.now() - stat.mtimeMs;
      if (ageMs < 8 * 60 * 1000) {
        console.log(
          `  ✓ ${account.role} — reusing saved state (${Math.round(ageMs / 60000)}m old)`,
        );
        continue;
      }
    }

    console.log(`  Logging in as ${account.role} (${account.email})...`);
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(`${baseUrl}/login`, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });

      await page.fill(
        'input[type="email"], input[name="email"]',
        account.email,
      );
      await page.fill(
        'input[type="password"], input[name="password"]',
        account.password,
      );
      await page.click('button[type="submit"]');

      await page.waitForURL(account.expectUrl, { timeout: 15_000 });

      await context.storageState({ path: account.file });
      console.log(`  ✓ ${account.role} — state saved`);
    } catch (err) {
      console.error(`  ✗ ${account.role} login failed:`, err);
      // Don't abort — continue with other roles
    }

    await context.close();
  }

  await browser.close();

  // -----------------------------------------------------------------------
  // Phase 2: Seed data
  // -----------------------------------------------------------------------
  console.log("\n[forge-setup] Phase 2: Seeding simulation data...\n");

  try {
    await seed();
  } catch (err) {
    console.error("[forge-setup] Seed failed:", err);
    // Don't abort — some tests can still run without full seed
  }

  console.log("\n========================================");
  console.log("  FORGE QA Setup Complete");
  console.log("========================================\n");
}

export default forgeGlobalSetup;
