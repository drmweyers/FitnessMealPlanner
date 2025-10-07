-- Auto-Seed Test Accounts
-- This script is idempotent and can be run multiple times safely
-- It ensures the required test accounts exist with correct credentials

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ensure user_role enum exists
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM('admin', 'trainer', 'customer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Function to generate bcrypt hash (cost 10)
-- These are pre-computed bcrypt hashes:
-- AdminPass123: $2b$10$Y84J1JYTx0yeozHw1ZXsqezi4L1RjqBtI06DRc2pKTJDlds8qaRxu
-- TestTrainer123!: $2b$10$7sh6W8wrOgGRM5zh9H1DHO4aNLHw3YLhc/1Zi30VL40Xr3tU4OnDy
-- TestCustomer123!: $2b$10$ntpn4fEKnGz/Gnbi4eoUv.RzfbskycPl5Ln8jJjdHfuScg0W./s2m

-- Insert or update Admin account
INSERT INTO users (
    id,
    email,
    password,
    name,
    role,
    created_at,
    updated_at
)
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
    'admin@fitmeal.pro',
    '$2b$10$Y84J1JYTx0yeozHw1ZXsqezi4L1RjqBtI06DRc2pKTJDlds8qaRxu',
    'Test Admin',
    'admin'::user_role,
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
    id,
    email,
    password,
    name,
    role,
    created_at,
    updated_at
)
VALUES (
    'e4ae14a6-fa78-4146-be61-c8fa9a4472f5'::uuid,
    'trainer.test@evofitmeals.com',
    '$2b$10$7sh6W8wrOgGRM5zh9H1DHO4aNLHw3YLhc/1Zi30VL40Xr3tU4OnDy',
    'Test Trainer',
    'trainer'::user_role,
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
    id,
    email,
    password,
    name,
    role,
    created_at,
    updated_at
)
VALUES (
    'f32890cc-af72-40dc-b92e-beef32118ca0'::uuid,
    'customer.test@evofitmeals.com',
    '$2b$10$ntpn4fEKnGz/Gnbi4eoUv.RzfbskycPl5Ln8jJjdHfuScg0W./s2m',
    'Test Customer',
    'customer'::user_role,
    NOW(),
    NOW()
)
ON CONFLICT (email)
DO UPDATE SET
    password = EXCLUDED.password,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    updated_at = NOW();

-- Create relationship between trainer and customer (if tables exist)
DO $$
BEGIN
    -- Check if customer_invitations table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customer_invitations') THEN
        -- Insert or update customer invitation
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
            'f0b0efea-a3c7-4cc4-8812-91ae942fd86a'::uuid,
            'e4ae14a6-fa78-4146-be61-c8fa9a4472f5'::uuid,
            'customer.test@evofitmeals.com',
            'test-token-' || extract(epoch from now())::text,
            NOW() + INTERVAL '7 days',
            NOW(),
            NOW()
        )
        ON CONFLICT (id)
        DO UPDATE SET
            used_at = NOW(),
            expires_at = NOW() + INTERVAL '7 days';
    END IF;

    -- Check if trainer_meal_plans table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'trainer_meal_plans') THEN
        -- Create sample meal plan for trainer if not exists
        INSERT INTO trainer_meal_plans (
            id,
            trainer_id,
            meal_plan_data,
            notes,
            tags,
            is_template,
            created_at,
            updated_at
        )
        VALUES (
            '49704827-6ca3-420b-85fa-eac57a6b0d41'::uuid,
            'e4ae14a6-fa78-4146-be61-c8fa9a4472f5'::uuid,
            '{"planName": "Test Meal Plan", "description": "A sample meal plan for testing", "days": 7, "mealsPerDay": 3, "dailyCalorieTarget": 2000, "fitnessGoal": "muscle_building", "meals": []}'::jsonb,
            'This is a test meal plan for development and testing purposes',
            '["test", "sample"]'::jsonb,
            true,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- Check if meal_plan_assignments table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'meal_plan_assignments') THEN
        -- Create meal plan assignment from trainer to customer
        INSERT INTO meal_plan_assignments (
            id,
            meal_plan_id,
            customer_id,
            assigned_by,
            assigned_at,
            notes
        )
        VALUES (
            '21a0a51c-024f-473e-ac38-78e90214b08e'::uuid,
            '49704827-6ca3-420b-85fa-eac57a6b0d41'::uuid,
            'f32890cc-af72-40dc-b92e-beef32118ca0'::uuid,
            'e4ae14a6-fa78-4146-be61-c8fa9a4472f5'::uuid,
            NOW(),
            'Test assignment for development purposes'
        )
        ON CONFLICT (id)
        DO UPDATE SET
            assigned_at = NOW(),
            notes = EXCLUDED.notes;
    END IF;
END $$;

-- Output confirmation
DO $$
DECLARE
    account_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO account_count
    FROM users
    WHERE email IN ('admin@fitmeal.pro', 'trainer.test@evofitmeals.com', 'customer.test@evofitmeals.com');

    RAISE NOTICE 'Test accounts seeded successfully! Created/Updated % accounts.', account_count;
END $$;

-- Display seeded accounts
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
