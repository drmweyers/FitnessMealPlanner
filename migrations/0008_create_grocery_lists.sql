-- Create Grocery Lists Feature Tables
-- Created: 2025-01-16
-- Purpose: Support grocery list functionality for customers
-- Features: Customer grocery lists, list items, meal plan integration

BEGIN;

-- ============================================================================
-- GROCERY LISTS TABLE
-- ============================================================================
-- Main table for grocery lists owned by customers
CREATE TABLE "grocery_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL DEFAULT 'My Grocery List',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- ============================================================================
-- GROCERY LIST ITEMS TABLE
-- ============================================================================
-- Individual items within grocery lists
CREATE TABLE "grocery_list_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grocery_list_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(50) NOT NULL DEFAULT 'produce',
	"quantity" integer NOT NULL DEFAULT 1,
	"unit" varchar(20) NOT NULL DEFAULT 'pcs',
	"is_checked" boolean DEFAULT false NOT NULL,
	"priority" varchar(10) DEFAULT 'medium' NOT NULL,
	"notes" text,
	"estimated_price" numeric(6, 2),
	"brand" varchar(100),
	"recipe_id" uuid,
	"recipe_name" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "grocery_list_items_priority_check" CHECK ("priority" IN ('low', 'medium', 'high')),
	CONSTRAINT "grocery_list_items_category_check" CHECK ("category" IN ('produce', 'meat', 'dairy', 'pantry', 'beverages', 'snacks', 'other'))
);

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Grocery lists belong to customers
ALTER TABLE "grocery_lists" ADD CONSTRAINT "grocery_lists_customer_id_users_id_fk"
FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

-- Grocery list items belong to grocery lists
ALTER TABLE "grocery_list_items" ADD CONSTRAINT "grocery_list_items_grocery_list_id_grocery_lists_id_fk"
FOREIGN KEY ("grocery_list_id") REFERENCES "public"."grocery_lists"("id") ON DELETE cascade ON UPDATE no action;

-- Optional recipe reference for items generated from meal plans
ALTER TABLE "grocery_list_items" ADD CONSTRAINT "grocery_list_items_recipe_id_recipes_id_fk"
FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE set null ON UPDATE no action;

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Primary customer queries (most common operations)
CREATE INDEX "idx_grocery_lists_customer_id" ON "grocery_lists" USING btree ("customer_id");
CREATE INDEX "idx_grocery_lists_customer_updated" ON "grocery_lists" USING btree ("customer_id", "updated_at" DESC);

-- Grocery list item queries
CREATE INDEX "idx_grocery_list_items_list_id" ON "grocery_list_items" USING btree ("grocery_list_id");
CREATE INDEX "idx_grocery_list_items_list_category" ON "grocery_list_items" USING btree ("grocery_list_id", "category");
CREATE INDEX "idx_grocery_list_items_list_checked" ON "grocery_list_items" USING btree ("grocery_list_id", "is_checked");

-- Recipe-based item lookups (for meal plan integration)
CREATE INDEX "idx_grocery_list_items_recipe_id" ON "grocery_list_items" USING btree ("recipe_id")
WHERE "recipe_id" IS NOT NULL;

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================================================

-- Update updated_at timestamp when grocery list is modified
CREATE OR REPLACE FUNCTION update_grocery_lists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_grocery_lists_updated_at
    BEFORE UPDATE ON grocery_lists
    FOR EACH ROW
    EXECUTE FUNCTION update_grocery_lists_updated_at();

-- Update updated_at timestamp when grocery list item is modified
CREATE OR REPLACE FUNCTION update_grocery_list_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_grocery_list_items_updated_at
    BEFORE UPDATE ON grocery_list_items
    FOR EACH ROW
    EXECUTE FUNCTION update_grocery_list_items_updated_at();

-- Update parent grocery list when items are modified
CREATE OR REPLACE FUNCTION update_parent_grocery_list()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the parent grocery list's updated_at timestamp
    UPDATE grocery_lists
    SET updated_at = NOW()
    WHERE id = COALESCE(NEW.grocery_list_id, OLD.grocery_list_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_parent_grocery_list
    AFTER INSERT OR UPDATE OR DELETE ON grocery_list_items
    FOR EACH ROW
    EXECUTE FUNCTION update_parent_grocery_list();

-- ============================================================================
-- SAMPLE DATA FOR TESTING (Optional)
-- ============================================================================

-- Insert sample grocery list for customer.test@evofitmeals.com (if exists)
DO $$
DECLARE
    customer_user_id uuid;
    sample_list_id uuid;
BEGIN
    -- Get customer test user ID
    SELECT id INTO customer_user_id
    FROM users
    WHERE email = 'customer.test@evofitmeals.com' AND role = 'customer'
    LIMIT 1;

    -- Only create sample data if customer exists
    IF customer_user_id IS NOT NULL THEN
        -- Create sample grocery list
        INSERT INTO grocery_lists (customer_id, name)
        VALUES (customer_user_id, 'Weekly Shopping List')
        RETURNING id INTO sample_list_id;

        -- Add sample items
        INSERT INTO grocery_list_items
        (grocery_list_id, name, category, quantity, unit, priority, estimated_price)
        VALUES
        (sample_list_id, 'Chicken Breast', 'meat', 2, 'lbs', 'high', 12.99),
        (sample_list_id, 'Broccoli', 'produce', 2, 'bunches', 'medium', 3.99),
        (sample_list_id, 'Brown Rice', 'pantry', 1, 'packages', 'medium', 4.49),
        (sample_list_id, 'Greek Yogurt', 'dairy', 2, 'cups', 'medium', 5.99),
        (sample_list_id, 'Olive Oil', 'pantry', 1, 'bottles', 'low', 8.99);

        RAISE NOTICE 'Sample grocery list created for customer test user';
    ELSE
        RAISE NOTICE 'No customer test user found - skipping sample data';
    END IF;
END $$;

-- ============================================================================
-- MAINTENANCE OPERATIONS
-- ============================================================================

-- Update table statistics for better query planning
ANALYZE grocery_lists;
ANALYZE grocery_list_items;

COMMIT;

-- ============================================================================
-- EXPECTED USAGE PATTERNS
-- ============================================================================
--
-- Common Queries:
-- 1. Get all lists for customer: SELECT * FROM grocery_lists WHERE customer_id = ?
-- 2. Get list with items: SELECT gl.*, gli.* FROM grocery_lists gl LEFT JOIN grocery_list_items gli ON gl.id = gli.grocery_list_id WHERE gl.id = ?
-- 3. Get items by category: SELECT * FROM grocery_list_items WHERE grocery_list_id = ? ORDER BY category, name
-- 4. Mark item as checked: UPDATE grocery_list_items SET is_checked = true WHERE id = ?
-- 5. Generate from meal plan: INSERT INTO grocery_list_items (grocery_list_id, name, recipe_id, ...) SELECT ...
--
-- Performance Notes:
-- - All customer queries are optimized with btree indexes
-- - Recipe integration supports meal plan ingredient extraction
-- - Cascading deletes ensure data consistency
-- - Timestamps automatically maintained via triggers
-- ============================================================================