-- Migration: Add Subscription and Payment Model Fields
-- Date: November 5, 2025
-- Purpose: Add fields to support hybrid pricing model (one-time + subscription)

-- Create payment type enum
CREATE TYPE payment_type AS ENUM ('onetime', 'subscription', 'grandfather');

-- Create subscription status enum
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid');

-- Add subscription and payment fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status subscription_status;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier tier_level;
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_type payment_type DEFAULT 'onetime';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_period_start TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_cancel_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_canceled_at TIMESTAMP;

-- Add usage tracking fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS meal_plans_generated_this_month INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS usage_reset_date TIMESTAMP DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS usage_limit INTEGER DEFAULT 20; -- Default to Starter limit

-- Add one-time payment tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS onetime_purchase_date TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onetime_amount INTEGER; -- Amount in cents
ALTER TABLE users ADD COLUMN IF NOT EXISTS onetime_tier tier_level;

-- Add grandfather policy flag
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_grandfathered BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS grandfathered_features JSONB;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription_id ON users(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_payment_type ON users(payment_type);
CREATE INDEX IF NOT EXISTS idx_users_usage_reset_date ON users(usage_reset_date);

-- Create subscription history table for audit trail
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- created, updated, canceled, renewed, etc.
  stripe_event_id VARCHAR(255),
  subscription_id VARCHAR(255),
  old_status subscription_status,
  new_status subscription_status,
  old_tier tier_level,
  new_tier tier_level,
  amount INTEGER, -- Amount in cents
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_event_type ON subscription_history(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_history_created_at ON subscription_history(created_at);

-- Create usage tracking table for detailed analytics
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- meal_plan_generated, recipe_created, pdf_exported, etc.
  resource_id UUID, -- ID of the meal plan, recipe, etc.
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_action ON usage_tracking(action);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_created_at ON usage_tracking(created_at);

-- Create payment transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  amount INTEGER NOT NULL, -- Amount in cents
  currency VARCHAR(3) DEFAULT 'usd',
  status VARCHAR(50), -- succeeded, pending, failed, refunded
  payment_method VARCHAR(50), -- card, bank_transfer, etc.
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_stripe_payment_intent_id ON payment_transactions(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at);

-- Add comments for documentation
COMMENT ON COLUMN users.stripe_customer_id IS 'Stripe customer ID for billing';
COMMENT ON COLUMN users.stripe_subscription_id IS 'Active Stripe subscription ID (null for one-time)';
COMMENT ON COLUMN users.subscription_status IS 'Current subscription status from Stripe';
COMMENT ON COLUMN users.subscription_tier IS 'Current tier (starter, professional, enterprise)';
COMMENT ON COLUMN users.payment_type IS 'Payment model: onetime, subscription, or grandfather';
COMMENT ON COLUMN users.meal_plans_generated_this_month IS 'Usage counter for current billing period';
COMMENT ON COLUMN users.usage_limit IS 'Monthly meal plan generation limit (null = unlimited for subscriptions)';
COMMENT ON COLUMN users.is_grandfathered IS 'True if user has legacy unlimited plan';
COMMENT ON TABLE subscription_history IS 'Audit trail for all subscription changes';
COMMENT ON TABLE usage_tracking IS 'Detailed usage analytics for cost analysis';
COMMENT ON TABLE payment_transactions IS 'All payment transactions for financial reporting';
