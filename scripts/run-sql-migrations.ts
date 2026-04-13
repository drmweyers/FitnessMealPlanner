#!/usr/bin/env tsx
/**
 * run-sql-migrations.ts
 *
 * Runs the raw .sql migration files under migrations/ that drizzle-kit push
 * doesn't know about. These are hand-written migrations with DO blocks,
 * IF NOT EXISTS guards, and dedupe logic — all idempotent and safe to
 * re-run on every startup.
 *
 * Why this exists:
 * drizzle-kit push auto-generates SQL from the schema diff, which works for
 * straight column/index adds but silently fails when it would violate a new
 * unique constraint on pre-existing duplicate rows. Migration 0028 for
 * meal_plan_assignments is an example: it has to dedupe existing rows
 * BEFORE creating the unique index, and drizzle-kit can't do that.
 *
 * This script runs each .sql file via pg.query, logging success/failure
 * without crashing startup. It is invoked from the Dockerfile start.sh
 * BEFORE drizzle-kit push so the manual migrations apply first.
 *
 * All migrations here must be idempotent. Re-running any of them must be
 * safe.
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  console.error("[sql-migrate] DATABASE_URL not set; skipping");
  process.exit(0);
}

const MIGRATIONS_DIR = join(process.cwd(), "migrations");

// Only the hand-written SQL files that drizzle-kit push cannot handle.
// Add new files here as they are created. Order matters — run in
// numerical order.
const HAND_WRITTEN_MIGRATIONS = [
  "0027_fix_bug_report_category_enum.sql",
  "0028_meal_plan_assignment_unique.sql",
];

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  });

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of HAND_WRITTEN_MIGRATIONS) {
    const path = join(MIGRATIONS_DIR, file);
    let sql: string;
    try {
      sql = readFileSync(path, "utf8");
    } catch {
      console.log(`[sql-migrate] ${file} not found, skipping`);
      skipped++;
      continue;
    }

    const client = await pool.connect();
    try {
      console.log(`[sql-migrate] applying ${file}`);
      await client.query(sql);
      console.log(`[sql-migrate] ✅ ${file} ok`);
      success++;
    } catch (err: any) {
      console.error(`[sql-migrate] ❌ ${file}: ${err?.message || err}`);
      failed++;
      // Continue to the next migration — do not crash startup.
    } finally {
      client.release();
    }
  }

  await pool.end();
  console.log(
    `[sql-migrate] done: ${success} applied, ${skipped} skipped, ${failed} failed`,
  );
  // Exit 0 regardless — start.sh handles failures gracefully with
  // `|| echo "⚠️ Manual migration failed"`.
  process.exit(0);
}

main().catch((err) => {
  console.error("[sql-migrate] FATAL:", err);
  process.exit(0); // still zero — do not block startup
});
