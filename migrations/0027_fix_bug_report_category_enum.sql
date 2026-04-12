-- Migration 0027: Fix bug_report_category enum drift
--
-- The bug_reports table was added when the bug pipeline shipped (commit:
-- "Bug Pipeline + Hal + Command Centre", 2026-04-07) but no migration was
-- created. Existing dev/prod databases have a stale `bug_report_category`
-- enum with values {bug, feature, feedback} from an unrelated earlier table,
-- while the drizzle schema declares 10 entirely different values and defaults
-- the column to "other". As a result every bug report submitted via the UI
-- crashes with "invalid input value for enum bug_report_category" before it
-- can be inserted.
--
-- This migration aligns the database enum with the drizzle schema. Existing
-- bug_reports rows are preserved by mapping any old value to "other".

DO $$
BEGIN
  -- 1. Drop the column default so we can change the type.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bug_reports' AND column_name = 'category'
  ) THEN
    EXECUTE 'ALTER TABLE bug_reports ALTER COLUMN category DROP DEFAULT';
    EXECUTE 'ALTER TABLE bug_reports ALTER COLUMN category TYPE text USING category::text';
  END IF;

  -- 2. Drop the stale enum type if it exists.
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bug_report_category') THEN
    EXECUTE 'DROP TYPE bug_report_category';
  END IF;

  -- 3. Recreate enum with the canonical values from shared/schema.ts.
  EXECUTE $sql$
    CREATE TYPE bug_report_category AS ENUM (
      'ui_issue',
      'data_accuracy',
      'feature_request',
      'performance',
      'sync_issue',
      'auth_access',
      'notification',
      'integration',
      'crash',
      'other'
    )
  $sql$;

  -- 4. Convert any pre-existing rows: anything not in the new set becomes 'other'.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bug_reports' AND column_name = 'category'
  ) THEN
    EXECUTE $sql$
      UPDATE bug_reports
      SET category = 'other'
      WHERE category NOT IN (
        'ui_issue','data_accuracy','feature_request','performance',
        'sync_issue','auth_access','notification','integration','crash','other'
      )
    $sql$;

    -- 5. Restore the typed column + default.
    EXECUTE 'ALTER TABLE bug_reports ALTER COLUMN category TYPE bug_report_category USING category::bug_report_category';
    EXECUTE 'ALTER TABLE bug_reports ALTER COLUMN category SET DEFAULT ''other''';
    EXECUTE 'ALTER TABLE bug_reports ALTER COLUMN category SET NOT NULL';
  END IF;
END $$;
