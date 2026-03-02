-- Customer Goals and Goal Milestones Tables
-- Created: 2025-12-15
-- Purpose: Re-enable customer goals functionality for progress tracking and weekly summaries

BEGIN;

-- ============================================================================
-- CUSTOMER GOALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    customer_id UUID NOT NULL,
    goal_type VARCHAR(50) NOT NULL,
    goal_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Goal targets (flexible based on goal type)
    target_value NUMERIC(10, 2),
    target_unit VARCHAR(20),
    current_value NUMERIC(10, 2),
    starting_value NUMERIC(10, 2),
    
    -- Timeline
    start_date TIMESTAMP NOT NULL,
    target_date TIMESTAMP,
    achieved_date TIMESTAMP,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'active',
    progress_percentage INTEGER DEFAULT 0,
    
    -- Additional fields
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign key constraint
    CONSTRAINT customer_goals_customer_id_users_id_fk 
        FOREIGN KEY (customer_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE 
        ON UPDATE NO ACTION
);

-- Indexes for customer_goals
CREATE INDEX IF NOT EXISTS customer_goals_customer_id_idx 
    ON customer_goals(customer_id);
CREATE INDEX IF NOT EXISTS customer_goals_status_idx 
    ON customer_goals(status);

-- ============================================================================
-- GOAL MILESTONES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS goal_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    goal_id UUID NOT NULL,
    milestone_name VARCHAR(255) NOT NULL,
    target_value NUMERIC(10, 2) NOT NULL,
    achieved_value NUMERIC(10, 2),
    achieved_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign key constraint
    CONSTRAINT goal_milestones_goal_id_customer_goals_id_fk 
        FOREIGN KEY (goal_id) 
        REFERENCES customer_goals(id) 
        ON DELETE CASCADE 
        ON UPDATE NO ACTION
);

-- Index for goal_milestones
CREATE INDEX IF NOT EXISTS goal_milestones_goal_id_idx 
    ON goal_milestones(goal_id);

-- Comments
COMMENT ON TABLE customer_goals IS 'Stores fitness and health goals set by customers';
COMMENT ON TABLE goal_milestones IS 'Tracks milestone achievements within larger goals';

COMMIT;




