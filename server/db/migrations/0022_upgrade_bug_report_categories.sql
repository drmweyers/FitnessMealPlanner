-- Upgrade bug_report_category enum from 3 values (bug, feature, feedback)
-- to 10 values for better triage by Hal
--
-- PostgreSQL ALTER TYPE ... ADD VALUE is non-transactional, so each runs separately.
-- Existing rows with 'bug'/'feature'/'feedback' are remapped after new values exist.

-- Add new enum values
ALTER TYPE bug_report_category ADD VALUE IF NOT EXISTS 'ui_issue';
ALTER TYPE bug_report_category ADD VALUE IF NOT EXISTS 'data_accuracy';
ALTER TYPE bug_report_category ADD VALUE IF NOT EXISTS 'feature_request';
ALTER TYPE bug_report_category ADD VALUE IF NOT EXISTS 'performance';
ALTER TYPE bug_report_category ADD VALUE IF NOT EXISTS 'sync_issue';
ALTER TYPE bug_report_category ADD VALUE IF NOT EXISTS 'auth_access';
ALTER TYPE bug_report_category ADD VALUE IF NOT EXISTS 'notification';
ALTER TYPE bug_report_category ADD VALUE IF NOT EXISTS 'integration';
ALTER TYPE bug_report_category ADD VALUE IF NOT EXISTS 'crash';
ALTER TYPE bug_report_category ADD VALUE IF NOT EXISTS 'other';

-- Remap old values to new ones
-- 'bug' → 'ui_issue' (most generic bug category)
-- 'feature' → 'feature_request'
-- 'feedback' → 'other'
UPDATE bug_reports SET category = 'ui_issue' WHERE category = 'bug';
UPDATE bug_reports SET category = 'feature_request' WHERE category = 'feature';
UPDATE bug_reports SET category = 'other' WHERE category = 'feedback';

-- Update default column value
ALTER TABLE bug_reports ALTER COLUMN category SET DEFAULT 'other';

-- Add priority index if not exists (helps Hal auto-triage)
CREATE INDEX IF NOT EXISTS idx_bug_reports_priority ON bug_reports(priority);
