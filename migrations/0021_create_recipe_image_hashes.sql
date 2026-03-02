-- Recipe Image Hashes Table
-- Created: 2025-12-15
-- Purpose: Store perceptual hashes for recipe images to enable duplicate detection
--          and prevent generating similar images for different recipes

BEGIN;

-- ============================================================================
-- RECIPE IMAGE HAShes TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS recipe_image_hashes (
    id SERIAL PRIMARY KEY,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    perceptual_hash VARCHAR(64) NOT NULL,
    similarity_hash VARCHAR(16) NOT NULL, -- First 16 chars of perceptual_hash for quick lookup
    image_url TEXT NOT NULL,
    dalle_prompt TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index for fast recipe lookups
CREATE INDEX IF NOT EXISTS idx_recipe_image_hashes_recipe_id
ON recipe_image_hashes(recipe_id);

-- Index for similarity hash lookups (used in duplicate detection)
CREATE INDEX IF NOT EXISTS idx_recipe_image_hashes_similarity_hash
ON recipe_image_hashes(similarity_hash);

-- Index for perceptual hash lookups
CREATE INDEX IF NOT EXISTS idx_recipe_image_hashes_perceptual_hash
ON recipe_image_hashes(perceptual_hash);

-- Index for chronological queries
CREATE INDEX IF NOT EXISTS idx_recipe_image_hashes_created_at
ON recipe_image_hashes(created_at DESC);

-- Composite index for common query pattern (recipe + hash lookup)
CREATE INDEX IF NOT EXISTS idx_recipe_image_hashes_recipe_hash
ON recipe_image_hashes(recipe_id, perceptual_hash);

COMMENT ON TABLE recipe_image_hashes IS 'Stores perceptual hashes of recipe images for duplicate detection';
COMMENT ON COLUMN recipe_image_hashes.perceptual_hash IS 'Full perceptual hash (pHash) of the image for similarity comparison';
COMMENT ON COLUMN recipe_image_hashes.similarity_hash IS 'First 16 characters of perceptual_hash for quick filtering before full comparison';
COMMENT ON COLUMN recipe_image_hashes.image_url IS 'URL of the generated image (temporary or permanent)';
COMMENT ON COLUMN recipe_image_hashes.dalle_prompt IS 'DALL-E prompt used to generate the image';

COMMIT;

