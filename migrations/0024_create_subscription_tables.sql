-- Migration: Create 3-Tier Subscription System Tables
-- Date: 2025-01-25
-- Canonical Source: docs/TIER_SOURCE_OF_TRUTH.md v2.0

BEGIN;

-- Create enums for subscription system (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
        CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'unpaid', 'canceled');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tier_level') THEN
        CREATE TYPE tier_level AS ENUM ('starter', 'professional', 'enterprise');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_item_kind') THEN
        CREATE TYPE subscription_item_kind AS ENUM ('tier', 'ai');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_event_type') THEN
        CREATE TYPE payment_event_type AS ENUM ('purchase', 'upgrade', 'downgrade', 'refund', 'chargeback', 'failed');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'webhook_event_status') THEN
        CREATE TYPE webhook_event_status AS ENUM ('pending', 'processed', 'failed');
    END IF;
END $$;

-- Trainer Subscriptions Table
CREATE TABLE IF NOT EXISTS trainer_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(255) NOT NULL,
  stripe_subscription_id VARCHAR(255) NOT NULL,
  tier tier_level NOT NULL,
  status subscription_status NOT NULL DEFAULT 'trialing',
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  trial_end TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trainer_subscriptions_trainer_id ON trainer_subscriptions(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_subscriptions_trainer_period ON trainer_subscriptions(trainer_id, current_period_end);
CREATE INDEX IF NOT EXISTS idx_trainer_subscriptions_status ON trainer_subscriptions(status);
-- Stripe integration indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_trainer_subscriptions_stripe_customer_id ON trainer_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_subscriptions_stripe_subscription_id ON trainer_subscriptions(stripe_subscription_id);

-- Subscription Items Table
CREATE TABLE IF NOT EXISTS subscription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES trainer_subscriptions(id) ON DELETE CASCADE,
  kind subscription_item_kind NOT NULL,
  stripe_price_id VARCHAR(255) NOT NULL,
  stripe_subscription_item_id VARCHAR(255) NOT NULL,
  status subscription_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_items_subscription_id ON subscription_items(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_items_kind ON subscription_items(kind);

-- Tier Usage Tracking Table
CREATE TABLE IF NOT EXISTS tier_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  customers_count INTEGER NOT NULL DEFAULT 0,
  meal_plans_count INTEGER NOT NULL DEFAULT 0,
  ai_generations_count INTEGER NOT NULL DEFAULT 0,
  exports_csv_count INTEGER NOT NULL DEFAULT 0,
  exports_excel_count INTEGER NOT NULL DEFAULT 0,
  exports_pdf_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tier_usage_tracking_trainer_id ON tier_usage_tracking(trainer_id);
CREATE INDEX IF NOT EXISTS idx_tier_usage_tracking_trainer_period ON tier_usage_tracking(trainer_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_tier_usage_tracking_period_end ON tier_usage_tracking(trainer_id, period_end);

-- Payment Logs Table
CREATE TABLE IF NOT EXISTS payment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  stripe_customer_id VARCHAR(255), -- Added for Stripe integration (used in code)
  event_type payment_event_type NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'usd',
  stripe_invoice_id VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  status payment_status NOT NULL,
  metadata JSONB DEFAULT '{}',
  occurred_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_logs_trainer_id ON payment_logs(trainer_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_occurred_at ON payment_logs(trainer_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_payment_logs_invoice_id ON payment_logs(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_customer_id ON payment_logs(stripe_customer_id);

-- Webhook Events Table
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  processed_at TIMESTAMP,
  status webhook_event_status NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  payload_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status_created ON webhook_events(status, created_at);

-- Comments for documentation
COMMENT ON TABLE trainer_subscriptions IS 'Primary subscription record for each trainer with Stripe subscription details';
COMMENT ON TABLE subscription_items IS 'Tracks tier and AI subscriptions as separate items for independent management';
COMMENT ON TABLE tier_usage_tracking IS 'Usage counters per billing period for quota enforcement';
COMMENT ON TABLE payment_logs IS 'Immutable audit trail for all payment events';
COMMENT ON TABLE webhook_events IS 'Idempotent webhook processing store to prevent duplicate event processing';

COMMIT;

