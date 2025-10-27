-- Production Test Accounts Seed Script
-- This script safely creates/updates the three official test accounts
-- Safe to run multiple times (idempotent)
--
-- Test Credentials:
-- Admin:    admin@fitmeal.pro             / AdminPass123
-- Trainer:  trainer.test@evofitmeals.com  / TestTrainer123!
-- Customer: customer.test@evofitmeals.com / TestCustomer123!

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Pre-computed bcrypt hashes (cost 10):
-- AdminPass123:      $2b$10$Y84J1JYTx0yeozHw1ZXsqezi4L1RjqBtI06DRc2pKTJDlds8qaRxu
-- TestTrainer123!:   $2b$10$7sh6W8wrOgGRM5zh9H1DHO4aNLHw3YLhc/1Zi30VL40Xr3tU4OnDy
-- TestCustomer123!:  $2b$10$ntpn4fEKnGz/Gnbi4eoUv.RzfbskycPl5Ln8jJjdHfuScg0W./s2m

-- Insert or update Admin account
INSERT INTO users (
    email,
    password,
    name,
    role,
    created_at,
    updated_at
)
VALUES (
    'admin@fitmeal.pro',
    '$2b$10$Y84J1JYTx0yeozHw1ZXsqezi4L1RjqBtI06DRc2pKTJDlds8qaRxu',
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

-- Insert or update Trainer account
INSERT INTO users (
    email,
    password,
    name,
    role,
    created_at,
    updated_at
)
VALUES (
    'trainer.test@evofitmeals.com',
    '$2b$10$7sh6W8wrOgGRM5zh9H1DHO4aNLHw3YLhc/1Zi30VL40Xr3tU4OnDy',
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

-- Insert or update Customer account
INSERT INTO users (
    email,
    password,
    name,
    role,
    created_at,
    updated_at
)
VALUES (
    'customer.test@evofitmeals.com',
    '$2b$10$ntpn4fEKnGz/Gnbi4eoUv.RzfbskycPl5Ln8jJjdHfuScg0W./s2m',
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

-- Output confirmation
DO $$
DECLARE
    account_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO account_count
    FROM users
    WHERE email IN ('admin@fitmeal.pro', 'trainer.test@evofitmeals.com', 'customer.test@evofitmeals.com');

    RAISE NOTICE 'Production test accounts seeded successfully! Created/Updated % accounts.', account_count;
END $$;

-- Display seeded accounts for verification
SELECT
    email,
    role,
    name,
    created_at
FROM users
WHERE email IN (
    'admin@fitmeal.pro',
    'trainer.test@evofitmeals.com',
    'customer.test@evofitmeals.com'
)
ORDER BY role;
