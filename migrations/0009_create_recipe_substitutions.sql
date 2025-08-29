-- Migration: Create Recipe Substitutions System
-- Description: Enables intelligent ingredient substitutions for dietary restrictions and preferences
-- Author: CTO Agent
-- Date: 2025-08-28

-- Create substitution categories enum
CREATE TYPE substitution_category AS ENUM ('dietary', 'allergy', 'preference', 'availability', 'cost', 'nutritional');

-- Create recipe_substitutions table for storing ingredient alternatives
CREATE TABLE IF NOT EXISTS recipe_substitutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    original_ingredient TEXT NOT NULL,
    substitute_ingredient TEXT NOT NULL,
    category substitution_category NOT NULL,
    reason TEXT,
    nutritional_impact JSONB DEFAULT '{}',
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    is_ai_generated BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create substitution_ratings table for user feedback
CREATE TABLE IF NOT EXISTS substitution_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    substitution_id UUID REFERENCES recipe_substitutions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(substitution_id, user_id)
);

-- Create global_substitutions table for common substitutions across all recipes
CREATE TABLE IF NOT EXISTS global_substitutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_ingredient TEXT NOT NULL,
    substitute_ingredient TEXT NOT NULL,
    category substitution_category NOT NULL,
    dietary_tags TEXT[] DEFAULT '{}',
    nutritional_difference JSONB DEFAULT '{}',
    usage_notes TEXT,
    popularity_score INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user_substitution_preferences table for personalized substitutions
CREATE TABLE IF NOT EXISTS user_substitution_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    avoid_ingredients TEXT[] DEFAULT '{}',
    preferred_substitutes JSONB DEFAULT '{}',
    dietary_restrictions TEXT[] DEFAULT '{}',
    auto_apply_substitutions BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX idx_recipe_substitutions_recipe_id ON recipe_substitutions(recipe_id);
CREATE INDEX idx_recipe_substitutions_original ON recipe_substitutions(original_ingredient);
CREATE INDEX idx_recipe_substitutions_category ON recipe_substitutions(category);
CREATE INDEX idx_substitution_ratings_substitution ON substitution_ratings(substitution_id);
CREATE INDEX idx_global_substitutions_original ON global_substitutions(original_ingredient);
CREATE INDEX idx_global_substitutions_dietary ON global_substitutions USING GIN(dietary_tags);
CREATE INDEX idx_user_preferences_user ON user_substitution_preferences(user_id);

-- Insert common global substitutions
INSERT INTO global_substitutions (original_ingredient, substitute_ingredient, category, dietary_tags, usage_notes) VALUES
('Butter', 'Coconut Oil', 'dietary', ARRAY['vegan', 'dairy-free'], '1:1 ratio for baking'),
('Milk', 'Almond Milk', 'dietary', ARRAY['vegan', 'dairy-free', 'lactose-free'], 'Use unsweetened for savory dishes'),
('Eggs', 'Flax Eggs', 'dietary', ARRAY['vegan'], '1 tbsp flaxseed + 3 tbsp water per egg'),
('All-Purpose Flour', 'Almond Flour', 'dietary', ARRAY['gluten-free', 'low-carb'], 'Use 1.25 cups almond flour per 1 cup regular flour'),
('White Sugar', 'Honey', 'preference', ARRAY['natural'], 'Use 3/4 cup honey per 1 cup sugar, reduce liquids'),
('Soy Sauce', 'Coconut Aminos', 'allergy', ARRAY['soy-free', 'gluten-free'], 'Similar umami flavor, less sodium'),
('Peanut Butter', 'Almond Butter', 'allergy', ARRAY['peanut-free'], '1:1 substitution'),
('Heavy Cream', 'Coconut Cream', 'dietary', ARRAY['vegan', 'dairy-free'], 'Refrigerate can overnight and use thick part'),
('Ground Beef', 'Ground Turkey', 'preference', ARRAY['lean'], 'Lower fat alternative'),
('Pasta', 'Zucchini Noodles', 'dietary', ARRAY['low-carb', 'gluten-free', 'paleo'], 'Spiralize fresh zucchini')
ON CONFLICT DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE recipe_substitutions IS 'Stores ingredient substitution suggestions for recipes';
COMMENT ON TABLE substitution_ratings IS 'User feedback and ratings for substitution suggestions';
COMMENT ON TABLE global_substitutions IS 'Common ingredient substitutions applicable across recipes';
COMMENT ON TABLE user_substitution_preferences IS 'User-specific substitution preferences and restrictions';