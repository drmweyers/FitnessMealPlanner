-- Production Test Accounts Setup Script
-- Run this in production to create the test accounts with proper relationships
-- Date: 2025-09-04

-- Note: These are the bcrypt hashed passwords for the test accounts
-- trainer.test@evofitmeals.com: SecurePass123!
-- customer.test@evofitmeals.com: SecurePass123!
-- admin@fitmeal.pro: AdminPass123

BEGIN;

-- 1. Create Admin Test Account (if not exists)
INSERT INTO users (id, email, password, name, role, created_at, updated_at)
VALUES (
  'f6163be0-19f8-4b2b-900e-7d49815ab8b0',
  'admin@fitmeal.pro',
  '$2b$10$K9IG5tvIpQr5VHfXE7Qe7.0o9wJZs8kNxW0sOeOQk7JbJjE/slLtC', -- AdminPass123
  'Test Admin',
  'admin',
  NOW(),
  NOW()
)
ON CONFLICT (email) 
DO UPDATE SET 
  password = EXCLUDED.password,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = NOW();

-- 2. Create Trainer Test Account (if not exists)
INSERT INTO users (id, email, password, name, role, created_at, updated_at)
VALUES (
  'e4ae14a6-fa78-4146-be61-c8fa9a4472f5',
  'trainer.test@evofitmeals.com',
  '$2b$10$xIGdkCo0pYMGd5K/IQhm5eJoN2JzmfF.Y1kNKiQKghQcQrqQXq1rW', -- SecurePass123!
  'Test Trainer',
  'trainer',
  NOW(),
  NOW()
)
ON CONFLICT (email) 
DO UPDATE SET 
  password = EXCLUDED.password,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = NOW();

-- 3. Create Customer Test Account (if not exists)
INSERT INTO users (id, email, password, name, role, created_at, updated_at)
VALUES (
  'f32890cc-af72-40dc-b92e-beef32118ca0',
  'customer.test@evofitmeals.com',
  '$2b$10$xIGdkCo0pYMGd5K/IQhm5eJoN2JzmfF.Y1kNKiQKghQcQrqQXq1rW', -- SecurePass123!
  'Test Customer',
  'customer',
  NOW(),
  NOW()
)
ON CONFLICT (email) 
DO UPDATE SET 
  password = EXCLUDED.password,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = NOW();

-- 4. Create customer invitation to link trainer and customer (if not exists)
INSERT INTO customer_invitations (
  id,
  trainer_id,
  customer_email,
  token,
  expires_at,
  used_at,
  created_at
)
VALUES (
  'f0b0efea-a3c7-4cc4-8812-91ae942fd86a',
  'e4ae14a6-fa78-4146-be61-c8fa9a4472f5', -- trainer ID
  'customer.test@evofitmeals.com',
  'test-token-production',
  NOW() + INTERVAL '7 days',
  NOW(), -- Mark as already used
  NOW()
)
ON CONFLICT (trainer_id, customer_email) 
DO UPDATE SET 
  used_at = NOW(),
  updated_at = NOW();

-- 5. Verify the accounts were created
SELECT 'Test Accounts Created:' as status;
SELECT id, email, role, name FROM users 
WHERE email IN (
  'admin@fitmeal.pro',
  'trainer.test@evofitmeals.com',
  'customer.test@evofitmeals.com'
)
ORDER BY role;

-- 6. Verify the relationship
SELECT 'Trainer-Customer Relationship:' as status;
SELECT 
  t.email as trainer_email,
  ci.customer_email,
  ci.used_at,
  CASE 
    WHEN ci.used_at IS NOT NULL THEN 'Connected'
    ELSE 'Invitation Pending'
  END as status
FROM customer_invitations ci
JOIN users t ON ci.trainer_id = t.id
WHERE t.email = 'trainer.test@evofitmeals.com';

COMMIT;

-- Test Account Credentials Summary:
-- ================================
-- Admin:
--   Email: admin@fitmeal.pro
--   Password: AdminPass123
--
-- Trainer:
--   Email: trainer.test@evofitmeals.com
--   Password: SecurePass123!
--
-- Customer:
--   Email: customer.test@evofitmeals.com
--   Password: SecurePass123!
--
-- The Trainer and Customer are connected via invitation.
-- The Customer can see meal plans assigned by the Trainer.
-- The Trainer can manage and assign meal plans to the Customer.