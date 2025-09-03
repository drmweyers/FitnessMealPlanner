-- Create Test Accounts and Relationships
-- This script creates three test accounts (admin, trainer, customer) with proper relationships

-- First, delete existing test accounts if they exist
DELETE FROM users WHERE email IN ('admin.test@evofitmeals.com', 'trainer.test@evofitmeals.com', 'customer.test@evofitmeals.com');

-- Create Admin account
INSERT INTO users (id, email, password, name, role, created_at, updated_at)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'admin.test@evofitmeals.com',
  '$2b$10$YHxPxe8N2j7tQHSvLhpAGu.dQqxc0r3S7lXQ1yzRkvCQ4iWnxyUDa', -- TestAdmin123!
  'Test Admin',
  'admin',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = NOW();

-- Create Trainer account
INSERT INTO users (id, email, password, name, role, created_at, updated_at)
VALUES (
  'e4ae14a6-fa78-4146-be61-c8fa9a4472f5',
  'trainer.test@evofitmeals.com',
  '$2b$10$dJ5FU3BW5p/vP5eWzp1cDOFD5WV7t1M0H.KHFsLzNjxp4jQNc.A7e', -- TestTrainer123!
  'Test Trainer',
  'trainer',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = NOW();

-- Create Customer account
INSERT INTO users (id, email, password, name, role, created_at, updated_at)
VALUES (
  'f32890cc-af72-40dc-b92e-beef32118ca0',
  'customer.test@evofitmeals.com',
  '$2b$10$MRKJr9R5UZhqf0HNElj5nu5.2eMg1Sx3fXYnl1fH1qBfzPHwGZYGu', -- TestCustomer123!
  'Test Customer',
  'customer',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = NOW();

-- Create or update customer invitation (mark as used)
INSERT INTO customer_invitations (id, trainer_id, customer_email, token, expires_at, used_at, created_at)
VALUES (
  'f0b0efea-a3c7-4cc4-8812-91ae942fd86a',
  'e4ae14a6-fa78-4146-be61-c8fa9a4472f5',
  'customer.test@evofitmeals.com',
  'test-token-' || extract(epoch from now())::text,
  NOW() + INTERVAL '7 days',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  used_at = NOW(),
  expires_at = NOW() + INTERVAL '7 days';

-- Create sample meal plan for trainer if not exists
INSERT INTO trainer_meal_plans (id, trainer_id, meal_plan_data, notes, tags, is_template, created_at, updated_at)
VALUES (
  '49704827-6ca3-420b-85fa-eac57a6b0d41',
  'e4ae14a6-fa78-4146-be61-c8fa9a4472f5',
  '{"planName": "Test Meal Plan", "description": "A sample meal plan for testing", "days": 7, "mealsPerDay": 3, "dailyCalorieTarget": 2000, "fitnessGoal": "muscle_building", "meals": []}'::jsonb,
  'This is a test meal plan for development and testing purposes',
  '["test", "sample"]'::jsonb,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create meal plan assignment from trainer to customer
INSERT INTO meal_plan_assignments (id, meal_plan_id, customer_id, assigned_by, assigned_at, notes)
VALUES (
  '21a0a51c-024f-473e-ac38-78e90214b08e',
  '49704827-6ca3-420b-85fa-eac57a6b0d41',
  'f32890cc-af72-40dc-b92e-beef32118ca0',
  'e4ae14a6-fa78-4146-be61-c8fa9a4472f5',
  NOW(),
  'Test assignment for development purposes'
) ON CONFLICT (id) DO UPDATE SET
  assigned_at = NOW(),
  notes = EXCLUDED.notes;

-- Output confirmation
SELECT 'Test accounts created successfully!' as status;
SELECT email, role FROM users WHERE email LIKE '%test@evofitmeals.com' ORDER BY role;