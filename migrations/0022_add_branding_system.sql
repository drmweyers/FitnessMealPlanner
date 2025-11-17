-- Migration: Add Branding & Customization System
-- Date: 2025-01-12
-- Story: 2.12 - Branding & Customization System
-- Purpose: Enable Professional+ trainers to customize branding, Enterprise white-label

-- ===================================================================
-- STEP 1: Create trainer_branding_settings table
-- ===================================================================

CREATE TABLE IF NOT EXISTS trainer_branding_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Logo (Professional+)
  logo_url TEXT,
  logo_file_size BIGINT DEFAULT 0, -- Bytes (max 2MB)
  logo_uploaded_at TIMESTAMP,

  -- Color customization (Professional+)
  primary_color VARCHAR(7), -- Hex color (e.g., #FF5733)
  secondary_color VARCHAR(7),
  accent_color VARCHAR(7),

  -- White-label settings (Enterprise only)
  white_label_enabled BOOLEAN DEFAULT FALSE,
  custom_domain VARCHAR(255),
  custom_domain_verified BOOLEAN DEFAULT FALSE,
  domain_verification_token VARCHAR(64), -- For DNS verification
  domain_verified_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT unique_trainer_branding UNIQUE(trainer_id),
  CONSTRAINT valid_logo_size CHECK (logo_file_size <= 2097152), -- 2MB max
  CONSTRAINT valid_hex_colors CHECK (
    (primary_color IS NULL OR primary_color ~ '^#[0-9A-Fa-f]{6}$') AND
    (secondary_color IS NULL OR secondary_color ~ '^#[0-9A-Fa-f]{6}$') AND
    (accent_color IS NULL OR accent_color ~ '^#[0-9A-Fa-f]{6}$')
  )
);

-- ===================================================================
-- STEP 2: Create indexes for performance
-- ===================================================================

-- Lookup branding by trainer ID (most common query)
CREATE INDEX IF NOT EXISTS idx_branding_trainer_id
  ON trainer_branding_settings(trainer_id);

-- Find trainers with white-label enabled (admin analytics)
CREATE INDEX IF NOT EXISTS idx_branding_white_label
  ON trainer_branding_settings(white_label_enabled)
  WHERE white_label_enabled = TRUE;

-- Find trainers with custom domains (DNS verification cron job)
CREATE INDEX IF NOT EXISTS idx_branding_custom_domain
  ON trainer_branding_settings(custom_domain)
  WHERE custom_domain IS NOT NULL;

-- Find unverified domains (verification queue)
CREATE INDEX IF NOT EXISTS idx_branding_unverified_domains
  ON trainer_branding_settings(custom_domain_verified)
  WHERE custom_domain IS NOT NULL AND custom_domain_verified = FALSE;

-- ===================================================================
-- STEP 3: Create branding_audit_log table
-- Track branding changes for compliance and support
-- ===================================================================

CREATE TABLE IF NOT EXISTS branding_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'logo_uploaded', 'colors_updated', 'white_label_enabled', etc.
  field_changed VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMP DEFAULT NOW() NOT NULL,
  ip_address INET,
  user_agent TEXT
);

-- Index for audit log queries
CREATE INDEX IF NOT EXISTS idx_branding_audit_trainer
  ON branding_audit_log(trainer_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_branding_audit_action
  ON branding_audit_log(action, changed_at DESC);

-- ===================================================================
-- STEP 4: Create function to auto-update updated_at timestamp
-- ===================================================================

CREATE OR REPLACE FUNCTION update_branding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_branding_timestamp
  BEFORE UPDATE ON trainer_branding_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_branding_updated_at();

-- ===================================================================
-- STEP 5: Seed default branding for existing Professional+ trainers
-- ===================================================================

-- Insert default branding settings for Professional+ trainers who don't have settings yet
INSERT INTO trainer_branding_settings (trainer_id, created_at, updated_at)
SELECT
  ts.trainer_id,
  NOW(),
  NOW()
FROM trainer_subscriptions ts
WHERE ts.tier IN ('professional', 'enterprise')
  AND ts.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM trainer_branding_settings tbs
    WHERE tbs.trainer_id = ts.trainer_id
  )
ON CONFLICT (trainer_id) DO NOTHING;

-- ===================================================================
-- VERIFICATION QUERIES
-- ===================================================================

-- Verify table created
SELECT
  table_name,
  column_name,
  data_type,
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'trainer_branding_settings'
ORDER BY ordinal_position;

-- Verify indexes created
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'trainer_branding_settings'
ORDER BY indexname;

-- Verify trigger created
SELECT
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'trainer_branding_settings';

-- Count branding settings by tier
SELECT
  ts.tier,
  COUNT(tbs.id) as branding_settings_count
FROM trainer_subscriptions ts
LEFT JOIN trainer_branding_settings tbs ON ts.trainer_id = tbs.trainer_id
WHERE ts.status = 'active'
GROUP BY ts.tier
ORDER BY
  CASE ts.tier
    WHEN 'starter' THEN 1
    WHEN 'professional' THEN 2
    WHEN 'enterprise' THEN 3
  END;

-- Show branding settings summary
SELECT
  COUNT(*) FILTER (WHERE logo_url IS NOT NULL) as trainers_with_logo,
  COUNT(*) FILTER (WHERE primary_color IS NOT NULL) as trainers_with_colors,
  COUNT(*) FILTER (WHERE white_label_enabled = TRUE) as trainers_with_white_label,
  COUNT(*) FILTER (WHERE custom_domain IS NOT NULL) as trainers_with_custom_domain,
  COUNT(*) FILTER (WHERE custom_domain_verified = TRUE) as verified_custom_domains,
  COUNT(*) as total_branding_settings
FROM trainer_branding_settings;
