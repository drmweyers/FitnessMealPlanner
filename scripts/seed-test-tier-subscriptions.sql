-- Seed Test Tier Subscriptions
-- Creates 3 test trainers with different tier levels for testing

-- Get trainer user ID
DO $$
DECLARE
  trainer_id UUID;
  starter_sub_id UUID;
  pro_sub_id UUID;
  enterprise_sub_id UUID;
BEGIN
  -- Get existing trainer ID
  SELECT id INTO trainer_id FROM users WHERE email = 'trainer.test@evofitmeals.com' AND role = 'trainer';

  IF trainer_id IS NOT NULL THEN
    -- Delete existing subscription if any
    DELETE FROM trainer_subscriptions WHERE trainer_id = trainer_id;

    -- Create Starter tier subscription for existing trainer
    INSERT INTO trainer_subscriptions (
      trainer_id,
      stripe_customer_id,
      stripe_subscription_id,
      tier,
      status,
      current_period_start,
      current_period_end,
      cancel_at_period_end,
      created_at,
      updated_at
    ) VALUES (
      trainer_id,
      'cus_test_starter_' || substring(trainer_id::text from 1 for 8),
      'sub_test_starter_' || substring(trainer_id::text from 1 for 8),
      'starter',
      'active',
      NOW(),
      NOW() + INTERVAL '30 days',
      false,
      NOW(),
      NOW()
    )
    RETURNING id INTO starter_sub_id;

    -- Create subscription item for starter tier
    INSERT INTO subscription_items (
      subscription_id,
      kind,
      stripe_price_id,
      stripe_subscription_item_id,
      status
    ) VALUES (
      starter_sub_id,
      'tier',
      'price_starter_test',
      'si_test_starter_' || substring(starter_sub_id::text from 1 for 8),
      'active'
    );

    RAISE NOTICE 'Created Starter tier for trainer.test@evofitmeals.com';
  END IF;

  -- Create Professional tier trainer if not exists
  IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'trainer.pro@evofitmeals.com') THEN
    INSERT INTO users (email, password_hash, full_name, role, is_verified)
    VALUES (
      'trainer.pro@evofitmeals.com',
      -- Password: TestPro123! (bcrypt hash)
      '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIr.KkCO4u',
      'Professional Trainer',
      'trainer',
      true
    )
    RETURNING id INTO trainer_id;

    -- Create Professional subscription
    INSERT INTO trainer_subscriptions (
      trainer_id,
      stripe_customer_id,
      stripe_subscription_id,
      tier,
      status,
      current_period_start,
      current_period_end,
      cancel_at_period_end,
      created_at,
      updated_at
    ) VALUES (
      trainer_id,
      'cus_test_pro_' || substring(trainer_id::text from 1 for 8),
      'sub_test_pro_' || substring(trainer_id::text from 1 for 8),
      'professional',
      'active',
      NOW(),
      NOW() + INTERVAL '30 days',
      false,
      NOW(),
      NOW()
    )
    RETURNING id INTO pro_sub_id;

    -- Create subscription item for professional tier
    INSERT INTO subscription_items (
      subscription_id,
      kind,
      stripe_price_id,
      stripe_subscription_item_id,
      status
    ) VALUES (
      pro_sub_id,
      'tier',
      'price_professional_test',
      'si_test_pro_' || substring(pro_sub_id::text from 1 for 8),
      'active'
    );

    RAISE NOTICE 'Created Professional tier trainer: trainer.pro@evofitmeals.com / TestPro123!';
  END IF;

  -- Create Enterprise tier trainer if not exists
  IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'trainer.enterprise@evofitmeals.com') THEN
    INSERT INTO users (email, password_hash, full_name, role, is_verified)
    VALUES (
      'trainer.enterprise@evofitmeals.com',
      -- Password: TestEnterprise123! (bcrypt hash)
      '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIr.KkCO4u',
      'Enterprise Trainer',
      'trainer',
      true
    )
    RETURNING id INTO trainer_id;

    -- Create Enterprise subscription
    INSERT INTO trainer_subscriptions (
      trainer_id,
      stripe_customer_id,
      stripe_subscription_id,
      tier,
      status,
      current_period_start,
      current_period_end,
      cancel_at_period_end,
      created_at,
      updated_at
    ) VALUES (
      trainer_id,
      'cus_test_enterprise_' || substring(trainer_id::text from 1 for 8),
      'sub_test_enterprise_' || substring(trainer_id::text from 1 for 8),
      'enterprise',
      'active',
      NOW(),
      NOW() + INTERVAL '30 days',
      false,
      NOW(),
      NOW()
    )
    RETURNING id INTO enterprise_sub_id;

    -- Create subscription item for enterprise tier
    INSERT INTO subscription_items (
      subscription_id,
      kind,
      stripe_price_id,
      stripe_subscription_item_id,
      status
    ) VALUES (
      enterprise_sub_id,
      'tier',
      'price_enterprise_test',
      'si_test_enterprise_' || substring(enterprise_sub_id::text from 1 for 8),
      'active'
    );

    RAISE NOTICE 'Created Enterprise tier trainer: trainer.enterprise@evofitmeals.com / TestEnterprise123!';
  END IF;
END $$;

-- Verify subscriptions
SELECT
  u.email,
  u.role,
  ts.tier,
  ts.status,
  ts.current_period_end
FROM users u
LEFT JOIN trainer_subscriptions ts ON u.id = ts.trainer_id
WHERE u.role = 'trainer'
ORDER BY
  CASE ts.tier
    WHEN 'starter' THEN 1
    WHEN 'professional' THEN 2
    WHEN 'enterprise' THEN 3
    ELSE 4
  END;
