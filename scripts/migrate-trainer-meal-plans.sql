-- Migration: Add trainer meal plans feature
-- This migration adds tables to support trainers saving and managing meal plans

-- Create trainer_meal_plans table
CREATE TABLE IF NOT EXISTS trainer_meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meal_plan_data JSONB NOT NULL,
  is_template BOOLEAN DEFAULT FALSE,
  tags JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for trainer_id for faster queries
CREATE INDEX IF NOT EXISTS trainer_meal_plans_trainer_id_idx ON trainer_meal_plans(trainer_id);

-- Create meal_plan_assignments table
CREATE TABLE IF NOT EXISTS meal_plan_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id UUID NOT NULL REFERENCES trainer_meal_plans(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS meal_plan_assignments_meal_plan_id_idx ON meal_plan_assignments(meal_plan_id);
CREATE INDEX IF NOT EXISTS meal_plan_assignments_customer_id_idx ON meal_plan_assignments(customer_id);

-- Add unique constraint to prevent duplicate assignments
CREATE UNIQUE INDEX IF NOT EXISTS meal_plan_assignments_unique_idx ON meal_plan_assignments(meal_plan_id, customer_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_trainer_meal_plans_updated_at 
  BEFORE UPDATE ON trainer_meal_plans 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();