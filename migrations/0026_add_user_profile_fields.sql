-- 0026_add_user_profile_fields.sql
-- Adds profile fields to users table to back the Edit Profile UI.
-- Created: 2026-04-12
-- Purpose: Wire up Edit Profile (Trainer / Customer) which previously
--          posted to a non-existent endpoint and had no schema storage.

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS specializations JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS certifications JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS years_experience INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS fitness_goals JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dietary_restrictions JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_cuisines JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS activity_level VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS weight NUMERIC(6,2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS height NUMERIC(6,2);

COMMIT;
