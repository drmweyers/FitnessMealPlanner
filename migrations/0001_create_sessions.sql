-- Create sessions table for Replit Auth
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);

-- Create users table for Replit Auth
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY,
  email VARCHAR UNIQUE,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  meal_types JSONB DEFAULT '[]',
  dietary_tags JSONB DEFAULT '[]',
  main_ingredient_tags JSONB DEFAULT '[]',
  ingredients_json JSONB NOT NULL,
  instructions_text TEXT NOT NULL,
  prep_time_minutes INTEGER NOT NULL,
  cook_time_minutes INTEGER NOT NULL,
  servings INTEGER NOT NULL,
  calories_kcal INTEGER NOT NULL,
  protein_grams DECIMAL(5,2) NOT NULL,
  carbs_grams DECIMAL(5,2) NOT NULL,
  fat_grams DECIMAL(5,2) NOT NULL,
  image_url VARCHAR(500),
  source_reference VARCHAR(255),
  creation_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_approved BOOLEAN DEFAULT FALSE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_recipes_approved ON recipes (is_approved);
CREATE INDEX IF NOT EXISTS idx_recipes_meal_types ON recipes USING GIN (meal_types);
CREATE INDEX IF NOT EXISTS idx_recipes_dietary_tags ON recipes USING GIN (dietary_tags);
CREATE INDEX IF NOT EXISTS idx_recipes_name ON recipes (name);
CREATE INDEX IF NOT EXISTS idx_recipes_calories ON recipes (calories_kcal);
CREATE INDEX IF NOT EXISTS idx_recipes_prep_time ON recipes (prep_time_minutes);
