#!/bin/bash
# ============================================================================
# Setup Test Account Relationships
# ============================================================================
# This script establishes relationships between test accounts for development
# and testing purposes. Run this after seeding test accounts.
#
# Usage: npm run setup:test-relationships
#   OR:  bash scripts/setup-test-relationships.sh
# ============================================================================

echo "🔧 Setting up test account relationships..."

# Execute SQL via docker
docker exec fitnessmealplanner-postgres psql -U postgres -d fitmeal << 'EOF'
-- Create customer_invitations table if it doesn't exist
CREATE TABLE IF NOT EXISTS customer_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  trainer_id uuid NOT NULL,
  customer_email varchar(255) NOT NULL,
  token text NOT NULL,
  expires_at timestamp NOT NULL,
  used_at timestamp,
  created_at timestamp DEFAULT now(),
  CONSTRAINT customer_invitations_token_unique UNIQUE(token)
);

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'customer_invitations_trainer_id_users_id_fk'
  ) THEN
    ALTER TABLE customer_invitations
    ADD CONSTRAINT customer_invitations_trainer_id_users_id_fk
    FOREIGN KEY (trainer_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_invitations_trainer_id ON customer_invitations (trainer_id);
CREATE INDEX IF NOT EXISTS idx_customer_invitations_token ON customer_invitations (token);
CREATE INDEX IF NOT EXISTS idx_customer_invitations_expires_at ON customer_invitations (expires_at);
CREATE INDEX IF NOT EXISTS idx_customer_invitations_customer_email ON customer_invitations (customer_email);

-- Establish Trainer-Customer Relationship
DO $$
DECLARE
  trainer_uuid uuid;
  customer_uuid uuid;
BEGIN
  SELECT id INTO trainer_uuid FROM users WHERE email = 'trainer.test@evofitmeals.com';
  SELECT id INTO customer_uuid FROM users WHERE email = 'customer.test@evofitmeals.com';

  IF trainer_uuid IS NOT NULL AND customer_uuid IS NOT NULL THEN
    INSERT INTO customer_invitations (
      trainer_id,
      customer_email,
      token,
      expires_at,
      used_at,
      created_at
    )
    VALUES (
      trainer_uuid,
      'customer.test@evofitmeals.com',
      'test-invitation-token-' || gen_random_uuid()::text,
      NOW() + INTERVAL '365 days',
      NOW() - INTERVAL '1 day',
      NOW() - INTERVAL '7 days'
    )
    ON CONFLICT (token) DO NOTHING;

    RAISE NOTICE '✅ Test relationship created: trainer.test@evofitmeals.com -> customer.test@evofitmeals.com';
  ELSE
    RAISE WARNING '⚠️  Test accounts not found. Please run: npm run seed:test-accounts';
  END IF;
END $$;

-- Verification
SELECT
  u_trainer.email AS trainer_email,
  ci.customer_email,
  ci.used_at AS invitation_accepted_at
FROM customer_invitations ci
JOIN users u_trainer ON u_trainer.id = ci.trainer_id
WHERE u_trainer.email = 'trainer.test@evofitmeals.com'
  AND ci.customer_email = 'customer.test@evofitmeals.com';
EOF

echo ""
echo "✅ Setup complete! The trainer should now see the customer in their Customers tab."
echo ""
echo "Test the relationship:"
echo "  1. Login as trainer: trainer.test@evofitmeals.com / TestTrainer123!"
echo "  2. Navigate to Customers tab"
echo "  3. Customer (customer.test@evofitmeals.com) should be visible"
