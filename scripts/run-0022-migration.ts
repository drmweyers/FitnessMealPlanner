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

async function run() {
  const client = await pool.connect();

  try {
    // Check if table already exists
    const tableCheck = await client.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = 'bug_reports'`,
    );

    if (tableCheck.rows.length > 0) {
      console.log("bug_reports table already exists — running enum upgrade...");
      // Add new enum values outside transaction
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
      for (const val of NEW_ENUM_VALUES) {
        try {
          await client.query(
            `ALTER TYPE bug_report_category ADD VALUE IF NOT EXISTS '${val}'`,
          );
          console.log(`  + ${val}`);
        } catch (err: any) {
          if (err.code === "42710") console.log(`  = ${val} (exists)`);
          else throw err;
        }
      }
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
    } else {
      console.log(
        "bug_reports table does not exist — creating from scratch...",
      );
      await client.query("BEGIN");

      // Create enums
      await client.query(`
        DO $$ BEGIN
          CREATE TYPE bug_report_category AS ENUM (
            'ui_issue', 'data_accuracy', 'feature_request', 'performance',
            'sync_issue', 'auth_access', 'notification', 'integration', 'crash', 'other'
          );
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
      `);
      await client.query(`
        DO $$ BEGIN
          CREATE TYPE bug_report_status AS ENUM ('open', 'triaged', 'in_progress', 'resolved', 'closed');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
      `);
      await client.query(`
        DO $$ BEGIN
          CREATE TYPE bug_report_priority AS ENUM ('low', 'medium', 'high', 'critical');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
      `);

      // Create table
      await client.query(`
        CREATE TABLE bug_reports (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
          category bug_report_category NOT NULL DEFAULT 'other',
          priority bug_report_priority NOT NULL DEFAULT 'medium',
          status bug_report_status NOT NULL DEFAULT 'open',
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          screenshot_base64 TEXT,
          context JSONB,
          github_issue_url VARCHAR(500),
          github_issue_number INTEGER,
          assigned_to_hal BOOLEAN NOT NULL DEFAULT FALSE,
          assigned_at TIMESTAMPTZ,
          resolved_at TIMESTAMPTZ,
          admin_notes TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      // Create indexes
      await client.query(
        `CREATE INDEX idx_bug_reports_status ON bug_reports(status)`,
      );
      await client.query(
        `CREATE INDEX idx_bug_reports_category ON bug_reports(category)`,
      );
      await client.query(
        `CREATE INDEX idx_bug_reports_reporter ON bug_reports(reporter_id)`,
      );
      await client.query(
        `CREATE INDEX idx_bug_reports_created_at ON bug_reports(created_at)`,
      );
      await client.query(
        `CREATE INDEX idx_bug_reports_priority ON bug_reports(priority)`,
      );

      await client.query("COMMIT");
    }

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
