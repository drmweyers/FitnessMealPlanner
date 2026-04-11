#!/usr/bin/env tsx
/**
 * Special migration runner for 0022_upgrade_bug_report_categories.sql
 *
 * ALTER TYPE ... ADD VALUE cannot run inside a transaction in PostgreSQL.
 * This script runs enum additions outside a transaction, then runs
 * the UPDATE/ALTER statements inside a transaction.
 *
 * Usage: DATABASE_URL=<prod-url> npx tsx scripts/run-0022-migration.ts
 */
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const NEW_ENUM_VALUES = [
  "ui_issue",
  "data_accuracy",
  "feature_request",
  "performance",
  "sync_issue",
  "auth_access",
  "notification",
  "integration",
  "crash",
  "other",
];

async function run() {
  const client = await pool.connect();

  try {
    // Step 1: Add enum values OUTSIDE a transaction
    console.log("Adding new enum values...");
    for (const val of NEW_ENUM_VALUES) {
      try {
        await client.query(
          `ALTER TYPE bug_report_category ADD VALUE IF NOT EXISTS '${val}'`,
        );
        console.log(`  + ${val}`);
      } catch (err: any) {
        if (err.code === "42710") {
          console.log(`  = ${val} (already exists)`);
        } else {
          throw err;
        }
      }
    }

    // Step 2: Remap old values + update defaults IN a transaction
    console.log("Remapping old category values...");
    await client.query("BEGIN");
    await client.query(
      `UPDATE bug_reports SET category = 'ui_issue' WHERE category = 'bug'`,
    );
    await client.query(
      `UPDATE bug_reports SET category = 'feature_request' WHERE category = 'feature'`,
    );
    await client.query(
      `UPDATE bug_reports SET category = 'other' WHERE category = 'feedback'`,
    );
    await client.query(
      `ALTER TABLE bug_reports ALTER COLUMN category SET DEFAULT 'other'`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_bug_reports_priority ON bug_reports(priority)`,
    );
    await client.query("COMMIT");

    console.log("Migration 0022 complete.");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
