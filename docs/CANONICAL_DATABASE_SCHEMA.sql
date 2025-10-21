-- CANONICAL DATABASE SCHEMA (PostgreSQL)
-- This schema consolidates tier management, AI subscriptions, usage tracking,
-- payment logging, RLS, and security indexes. All prior duplicates are superseded.
-- Notes:
-- - Use a connection pooler (e.g., pgbouncer) and app-level pooling.
-- - Set RLS session context per request: SET LOCAL app.current_user_id = '<uuid>';
-- - All application API routes are versioned under /api/v1.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users table is assumed to exist
-- CREATE TABLE users (...);

-- 1) Tier ownership (one-time purchase)
CREATE TABLE IF NOT EXISTS trainer_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier_level INTEGER NOT NULL CHECK (tier_level IN (1,2,3)),
  purchase_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  status VARCHAR(16) NOT NULL CHECK (status IN ('active','inactive')) DEFAULT 'active',
  stripe_payment_intent_id VARCHAR(255),
  amount_paid_cents INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2) AI subscriptions (recurring)
CREATE TABLE IF NOT EXISTS ai_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  tier_level INTEGER NOT NULL CHECK (tier_level IN (1,2,3)),
  monthly_price_cents INTEGER NOT NULL,
  usage_limit INTEGER,            -- null = unlimited
  current_usage INTEGER DEFAULT 0,
  status VARCHAR(32) NOT NULL CHECK (status IN ('active','trialing','past_due','canceled','incomplete','incomplete_expired','unpaid')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3) Feature usage logs (for gating/analytics)
CREATE TABLE IF NOT EXISTS feature_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature_name VARCHAR(255) NOT NULL,
  tier_level INTEGER NOT NULL CHECK (tier_level IN (1,2,3)),
  usage_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_id VARCHAR(255),
  blocked BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_feature_usage_trainer_feature ON feature_usage_logs(trainer_id, feature_name);
CREATE INDEX IF NOT EXISTS idx_feature_usage_time ON feature_usage_logs(usage_timestamp);

-- 4) Payment transactions (tokenized IDs; no card data)
CREATE TABLE IF NOT EXISTS payment_transactions_secure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  encrypted_stripe_id BYTEA,  -- encrypted payment ID (see app crypto)
  payment_hash TEXT NOT NULL, -- sha256 hash of Stripe ID for lookups
  amount_cents INTEGER NOT NULL,
  currency CHAR(3) DEFAULT 'USD',
  status VARCHAR(32) NOT NULL CHECK (status IN ('pending','completed','failed')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_trainer_status_time ON payment_transactions_secure(trainer_id, status, created_at DESC);

-- 5) Customer grouping (Tier 2+)
CREATE TABLE IF NOT EXISTS customer_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_name VARCHAR(255) NOT NULL,
  description TEXT,
  color_code VARCHAR(7),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trainer_id, group_name)
);

CREATE TABLE IF NOT EXISTS customer_group_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES customer_groups(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(customer_id, group_id)
);

-- 6) Security audit logging
CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,  -- login, payment, tier_change, data_access
  user_id UUID REFERENCES users(id),
  session_id VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  request_path VARCHAR(500),
  request_method VARCHAR(10),
  response_status INTEGER,
  event_data JSONB,
  risk_score INTEGER, -- 1-100
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_security_audit_user_time ON security_audit_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_security_audit_type_time ON security_audit_log(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_security_audit_high_risk ON security_audit_log(risk_score) WHERE risk_score > 70;

-- 7) Row-Level Security (RLS)
ALTER TABLE trainer_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions_secure ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_group_memberships ENABLE ROW LEVEL SECURITY;

-- RLS policies
grant usage on schema public to public; -- adjust as needed

CREATE POLICY trainer_owns_subscription ON trainer_subscriptions
  FOR ALL USING (trainer_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY trainer_owns_ai_subscription ON ai_subscriptions
  FOR ALL USING (trainer_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY trainer_owns_feature_usage ON feature_usage_logs
  FOR ALL USING (trainer_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY trainer_owns_payments ON payment_transactions_secure
  FOR ALL USING (trainer_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY trainer_owns_groups ON customer_groups
  FOR ALL USING (trainer_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY trainer_owns_group_memberships ON customer_group_memberships
  FOR ALL USING (
    group_id IN (
      SELECT id FROM customer_groups WHERE trainer_id = current_setting('app.current_user_id', true)::uuid
    )
  );

-- 8) Refreshable analytics (optional example placeholder)
-- CREATE MATERIALIZED VIEW ... (omitted for brevity)
-- Schedule background refresh via job runner (e.g., cron, queue)

-- End of canonical schema
