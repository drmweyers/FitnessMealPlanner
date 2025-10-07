-- Recipe Generation Enhancement Migration
-- Adds quality scoring and API cost tracking

BEGIN;

-- Add quality scoring and metadata to recipes
ALTER TABLE recipes 
  ADD COLUMN IF NOT EXISTS quality_score JSONB,
  ADD COLUMN IF NOT EXISTS generation_attempts INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS api_cost DECIMAL(10,4),
  ADD COLUMN IF NOT EXISTS generation_metadata JSONB,
  ADD COLUMN IF NOT EXISTS model_used VARCHAR(50);

-- Create API usage tracking table
CREATE TABLE IF NOT EXISTS api_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service VARCHAR(50) NOT NULL,
  model VARCHAR(100),
  tokens INTEGER,
  cost DECIMAL(10,4),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  metadata JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON api_usage_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_user ON api_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_cost ON api_usage_log(cost);
CREATE INDEX IF NOT EXISTS idx_recipes_quality_score ON recipes((quality_score->>'overall')::int);

-- Add comments for documentation
COMMENT ON COLUMN recipes.quality_score IS 'Quality scoring metrics for the recipe';
COMMENT ON COLUMN recipes.generation_attempts IS 'Number of generation attempts before success';
COMMENT ON COLUMN recipes.api_cost IS 'Cost in USD for generating this recipe';
COMMENT ON TABLE api_usage_log IS 'Tracks API usage and costs for monitoring';

COMMIT;