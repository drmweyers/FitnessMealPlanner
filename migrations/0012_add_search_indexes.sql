-- Advanced Recipe Search Optimization Migration
-- Adds indexes for full-text search and filtering performance

BEGIN;

-- Add full-text search index for recipe names and descriptions
CREATE INDEX IF NOT EXISTS idx_recipes_name_fulltext ON recipes USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_recipes_description_fulltext ON recipes USING gin(to_tsvector('english', description));

-- Add composite index for nutritional filtering
CREATE INDEX IF NOT EXISTS idx_recipes_nutrition_values ON recipes USING btree (
  calories_kcal,
  protein_grams,
  carbs_grams,
  fat_grams
) WHERE is_approved = true;

-- Add preparation and cooking time indexes
CREATE INDEX IF NOT EXISTS idx_recipes_prep_time ON recipes (prep_time_minutes) WHERE is_approved = true;
CREATE INDEX IF NOT EXISTS idx_recipes_cook_time ON recipes (cook_time_minutes) WHERE is_approved = true;
CREATE INDEX IF NOT EXISTS idx_recipes_total_time ON recipes ((COALESCE(prep_time_minutes, 0) + COALESCE(cook_time_minutes, 0))) WHERE is_approved = true;

-- Add dietary tags GIN index for array operations
CREATE INDEX IF NOT EXISTS idx_recipes_dietary_tags_gin ON recipes USING gin(dietary_tags) WHERE is_approved = true;

-- Add meal types GIN index for array operations  
CREATE INDEX IF NOT EXISTS idx_recipes_meal_types_gin ON recipes USING gin(meal_types) WHERE is_approved = true;

-- Add compound index for common search patterns
CREATE INDEX IF NOT EXISTS idx_recipes_search_compound ON recipes (is_approved, creation_timestamp) 
WHERE is_approved = true;

-- Add index for ingredient search (JSONB path operations)
CREATE INDEX IF NOT EXISTS idx_recipes_ingredients_gin ON recipes USING gin(ingredients_json) WHERE is_approved = true;

-- Add comments for documentation
COMMENT ON INDEX idx_recipes_name_fulltext IS 'Full-text search index for recipe names';
COMMENT ON INDEX idx_recipes_description_fulltext IS 'Full-text search index for recipe descriptions';
COMMENT ON INDEX idx_recipes_nutrition_values IS 'Composite index for nutritional filtering';
COMMENT ON INDEX idx_recipes_dietary_tags_gin IS 'GIN index for dietary tag array operations';

COMMIT;