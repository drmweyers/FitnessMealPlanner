-- FitnessMealPlanner Database Extensions for Longevity & Parasite Cleanse Features
-- These additions extend the existing schema to support specialized meal plan modes

-- Add new enum values for specialized meal plan types
ALTER TYPE user_role ADD VALUE 'holistic_practitioner' AFTER 'trainer';

-- User Preferences Table for Specialized Protocols
CREATE TABLE user_health_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Longevity preferences
  longevity_goals TEXT[], -- ['cellular_health', 'anti_aging', 'cognitive_function']
  fasting_protocol VARCHAR(50), -- '16:8', '18:6', 'OMAD', 'ADF'
  fasting_experience_level VARCHAR(20) DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
  
  -- Parasite cleanse preferences  
  cleanse_experience_level VARCHAR(20) DEFAULT 'beginner',
  preferred_cleanse_duration INTEGER, -- 7, 14, 30, 90 days
  cleanse_intensity VARCHAR(20) DEFAULT 'gentle', -- 'gentle', 'moderate', 'intensive'
  
  -- Cultural and dietary preferences
  cultural_food_preferences TEXT[], -- ['mediterranean', 'asian', 'latin_american']
  supplement_tolerance VARCHAR(20) DEFAULT 'moderate', -- 'minimal', 'moderate', 'high'
  
  -- Medical considerations
  current_medications TEXT[],
  health_conditions TEXT[],
  pregnancy_breastfeeding BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Specialized Recipe Tags Table
CREATE TABLE specialized_recipe_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  
  -- Longevity-specific tags
  longevity_benefits TEXT[], -- ['anti_inflammatory', 'antioxidant_rich', 'autophagy_supporting']
  fasting_compatibility VARCHAR(30), -- 'fasting_friendly', 'break_fast_optimal', 'eating_window_only'
  
  -- Parasite cleanse specific tags
  anti_parasitic_compounds TEXT[], -- ['allicin', 'cucurbitin', 'artemisinin', 'eugenol']
  cleanse_phase VARCHAR(20), -- 'preparation', 'active_cleanse', 'restoration'
  elimination_support BOOLEAN DEFAULT false,
  
  -- Bioactive compounds
  polyphenol_content VARCHAR(20), -- 'low', 'medium', 'high'
  fiber_content_grams DECIMAL(5,2),
  
  created_at TIMESTAMP DEFAULT now()
);

-- Meal Plan Protocols Table
CREATE TABLE meal_plan_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  protocol_type VARCHAR(30) NOT NULL, -- 'longevity', 'parasite_cleanse'
  
  -- Protocol metadata
  protocol_name VARCHAR(255) NOT NULL,
  description TEXT,
  duration_days INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  
  -- Protocol-specific configuration (JSONB for flexibility)
  configuration JSONB NOT NULL,
  
  -- Progress tracking
  current_day INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'paused', 'discontinued'
  compliance_percentage DECIMAL(5,2),
  
  -- Medical disclaimers and consent
  medical_disclaimer_accepted BOOLEAN NOT NULL DEFAULT false,
  healthcare_provider_consulted BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Daily Protocol Logs
CREATE TABLE protocol_daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id UUID REFERENCES meal_plan_protocols(id) ON DELETE CASCADE NOT NULL,
  day_number INTEGER NOT NULL,
  log_date DATE NOT NULL,
  
  -- Compliance tracking
  meals_completed INTEGER DEFAULT 0,
  supplements_taken BOOLEAN DEFAULT false,
  fasting_window_adhered BOOLEAN DEFAULT true,
  
  -- Symptom tracking (especially for parasite cleanse)
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
  digestive_comfort INTEGER CHECK (digestive_comfort >= 1 AND digestive_comfort <= 10),
  sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 10),
  
  -- Notes and observations
  symptoms_notes TEXT,
  side_effects TEXT,
  general_notes TEXT,
  
  created_at TIMESTAMP DEFAULT now()
);

-- Specialized Ingredients Database
CREATE TABLE specialized_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL, -- 'anti_parasitic', 'longevity_supporting', 'both'
  
  -- Bioactive compounds
  active_compounds JSONB, -- {'allicin': 'high', 'artemisinin': 'moderate'}
  
  -- Usage information
  recommended_dosage TEXT,
  preparation_methods TEXT[],
  contraindications TEXT[],
  drug_interactions TEXT[],
  
  -- Sourcing and quality
  optimal_sourcing TEXT,
  quality_markers TEXT[],
  
  -- Safety information
  safety_rating VARCHAR(20), -- 'generally_safe', 'caution_advised', 'professional_guidance'
  pregnancy_safe BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Cleanse Protocols Template
CREATE TABLE cleanse_protocol_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(30) NOT NULL, -- 'parasite_cleanse', 'longevity'
  duration_days INTEGER NOT NULL,
  difficulty_level VARCHAR(20) NOT NULL, -- 'beginner', 'intermediate', 'advanced'
  
  -- Template structure
  daily_structure JSONB NOT NULL, -- Structured day-by-day protocol
  required_ingredients TEXT[],
  optional_supplements TEXT[],
  
  -- Safety and efficacy
  scientific_references TEXT[],
  practitioner_notes TEXT,
  contraindications TEXT[],
  
  -- User experience
  expected_outcomes TEXT[],
  potential_side_effects TEXT[],
  success_tips TEXT[],
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_user_health_preferences_user_id ON user_health_preferences(user_id);
CREATE INDEX idx_specialized_recipe_tags_recipe_id ON specialized_recipe_tags(recipe_id);
CREATE INDEX idx_meal_plan_protocols_user_id ON meal_plan_protocols(user_id);
CREATE INDEX idx_meal_plan_protocols_type ON meal_plan_protocols(protocol_type);
CREATE INDEX idx_protocol_daily_logs_protocol_id ON protocol_daily_logs(protocol_id);
CREATE INDEX idx_specialized_ingredients_category ON specialized_ingredients(category);