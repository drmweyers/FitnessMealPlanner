-- Migration: Enable Row-Level Security for Subscription Tables
-- Date: 2025-01-25
-- Purpose: Ensure trainers can only access their own subscription data

-- Enable RLS on all subscription tables
ALTER TABLE trainer_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Trainer Subscriptions RLS Policies
CREATE POLICY trainer_subscriptions_select_own
  ON trainer_subscriptions
  FOR SELECT
  USING (trainer_id = current_setting('app.current_user_id')::UUID);

CREATE POLICY trainer_subscriptions_insert_own
  ON trainer_subscriptions
  FOR INSERT
  WITH CHECK (trainer_id = current_setting('app.current_user_id')::UUID);

CREATE POLICY trainer_subscriptions_update_own
  ON trainer_subscriptions
  FOR UPDATE
  USING (trainer_id = current_setting('app.current_user_id')::UUID);

-- Subscription Items RLS Policies (via trainer_subscriptions join)
CREATE POLICY subscription_items_select_own
  ON subscription_items
  FOR SELECT
  USING (
    subscription_id IN (
      SELECT id FROM trainer_subscriptions
      WHERE trainer_id = current_setting('app.current_user_id')::UUID
    )
  );

CREATE POLICY subscription_items_insert_own
  ON subscription_items
  FOR INSERT
  WITH CHECK (
    subscription_id IN (
      SELECT id FROM trainer_subscriptions
      WHERE trainer_id = current_setting('app.current_user_id')::UUID
    )
  );

CREATE POLICY subscription_items_update_own
  ON subscription_items
  FOR UPDATE
  USING (
    subscription_id IN (
      SELECT id FROM trainer_subscriptions
      WHERE trainer_id = current_setting('app.current_user_id')::UUID
    )
  );

-- Tier Usage Tracking RLS Policies
CREATE POLICY tier_usage_tracking_select_own
  ON tier_usage_tracking
  FOR SELECT
  USING (trainer_id = current_setting('app.current_user_id')::UUID);

CREATE POLICY tier_usage_tracking_insert_own
  ON tier_usage_tracking
  FOR INSERT
  WITH CHECK (trainer_id = current_setting('app.current_user_id')::UUID);

CREATE POLICY tier_usage_tracking_update_own
  ON tier_usage_tracking
  FOR UPDATE
  USING (trainer_id = current_setting('app.current_user_id')::UUID);

-- Payment Logs RLS Policies (read-only for trainers)
CREATE POLICY payment_logs_select_own
  ON payment_logs
  FOR SELECT
  USING (trainer_id = current_setting('app.current_user_id')::UUID);

-- Webhook Events RLS Policies (admin/system only, trainers cannot access)
-- No trainer policies - webhook processing bypasses RLS using elevated privileges

-- Admin Override Policies (for admin role)
CREATE POLICY trainer_subscriptions_admin_all
  ON trainer_subscriptions
  FOR ALL
  USING (current_setting('app.current_user_role', true) = 'admin');

CREATE POLICY subscription_items_admin_all
  ON subscription_items
  FOR ALL
  USING (current_setting('app.current_user_role', true) = 'admin');

CREATE POLICY tier_usage_tracking_admin_all
  ON tier_usage_tracking
  FOR ALL
  USING (current_setting('app.current_user_role', true) = 'admin');

CREATE POLICY payment_logs_admin_all
  ON payment_logs
  FOR ALL
  USING (current_setting('app.current_user_role', true) = 'admin');

CREATE POLICY webhook_events_admin_all
  ON webhook_events
  FOR ALL
  USING (current_setting('app.current_user_role', true) = 'admin');

-- Comments for documentation
COMMENT ON POLICY trainer_subscriptions_select_own ON trainer_subscriptions IS 'Trainers can view their own subscriptions';
COMMENT ON POLICY trainer_subscriptions_insert_own ON trainer_subscriptions IS 'Trainers can create their own subscriptions';
COMMENT ON POLICY trainer_subscriptions_update_own ON trainer_subscriptions IS 'Trainers can update their own subscriptions';
COMMENT ON POLICY subscription_items_select_own ON subscription_items IS 'Trainers can view subscription items for their subscriptions';
COMMENT ON POLICY tier_usage_tracking_select_own ON tier_usage_tracking IS 'Trainers can view their own usage tracking';
COMMENT ON POLICY payment_logs_select_own ON payment_logs IS 'Trainers can view their own payment logs (read-only)';
COMMENT ON POLICY trainer_subscriptions_admin_all ON trainer_subscriptions IS 'Admins have full access to all trainer subscriptions';
