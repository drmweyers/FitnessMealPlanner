-- ===============================================
-- FITNESSMEALPLANNER 3-TIER ANALYTICS SYSTEM
-- Database Schema Extensions
-- ===============================================

-- **********************
-- SUBSCRIPTION TIER MANAGEMENT
-- **********************

CREATE TYPE "subscription_tier" AS ENUM('tier1_basic', 'tier2_analytics', 'tier3_advanced');
CREATE TYPE "analytics_feature" AS ENUM(
  'basic_dashboard', 'client_metrics', 'business_reports',
  'predictive_insights', 'custom_dashboards', 'bi_features',
  'revenue_analytics', 'customer_segmentation', 'competitive_intelligence'
);

-- Trainer subscription tiers with analytics permissions
CREATE TABLE "trainer_subscriptions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "trainer_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "subscription_tier" subscription_tier NOT NULL DEFAULT 'tier1_basic',
  "stripe_subscription_id" TEXT UNIQUE,
  "stripe_customer_id" TEXT,
  "subscription_status" TEXT DEFAULT 'active', -- active, canceled, past_due, unpaid
  "current_period_start" TIMESTAMP NOT NULL,
  "current_period_end" TIMESTAMP NOT NULL,
  "analytics_enabled" BOOLEAN DEFAULT FALSE,
  "monthly_revenue" DECIMAL(10,2) DEFAULT 0.00,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feature access control per subscription tier
CREATE TABLE "subscription_feature_access" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "subscription_tier" subscription_tier NOT NULL,
  "feature" analytics_feature NOT NULL,
  "is_enabled" BOOLEAN DEFAULT TRUE,
  "usage_limit" INTEGER, -- NULL for unlimited
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("subscription_tier", "feature")
);

-- **********************
-- ANALYTICS DATA AGGREGATION TABLES
-- **********************

-- Daily analytics aggregations for performance
CREATE TABLE "daily_analytics_summary" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "trainer_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "date" DATE NOT NULL,

  -- Client metrics
  "total_active_clients" INTEGER DEFAULT 0,
  "new_clients_count" INTEGER DEFAULT 0,
  "churned_clients_count" INTEGER DEFAULT 0,
  "client_engagement_score" DECIMAL(5,2) DEFAULT 0.00, -- 0-100 score

  -- Meal plan metrics
  "meal_plans_created" INTEGER DEFAULT 0,
  "meal_plans_assigned" INTEGER DEFAULT 0,
  "meal_plan_completion_rate" DECIMAL(5,2) DEFAULT 0.00,

  -- Recipe metrics
  "recipes_created" INTEGER DEFAULT 0,
  "recipe_favorites_added" INTEGER DEFAULT 0,
  "recipe_ratings_received" INTEGER DEFAULT 0,
  "avg_recipe_rating" DECIMAL(3,2) DEFAULT 0.00,

  -- Business metrics
  "revenue_generated" DECIMAL(10,2) DEFAULT 0.00,
  "pdf_exports_count" INTEGER DEFAULT 0,
  "client_session_duration_avg" INTEGER DEFAULT 0, -- minutes

  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("trainer_id", "date")
);

-- Weekly analytics aggregations
CREATE TABLE "weekly_analytics_summary" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "trainer_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "week_start_date" DATE NOT NULL,
  "week_end_date" DATE NOT NULL,

  -- Advanced metrics for Tier 3
  "client_retention_rate" DECIMAL(5,2) DEFAULT 0.00,
  "avg_client_lifetime_value" DECIMAL(10,2) DEFAULT 0.00,
  "meal_plan_satisfaction_score" DECIMAL(5,2) DEFAULT 0.00,
  "recipe_diversity_index" DECIMAL(5,2) DEFAULT 0.00,
  "client_progress_velocity" DECIMAL(5,2) DEFAULT 0.00,

  -- Business intelligence metrics
  "market_share_indicator" DECIMAL(5,2) DEFAULT 0.00,
  "competitive_recipe_gap_score" DECIMAL(5,2) DEFAULT 0.00,
  "seasonal_trend_factor" DECIMAL(5,2) DEFAULT 0.00,

  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("trainer_id", "week_start_date")
);

-- **********************
-- CLIENT ENGAGEMENT ANALYTICS
-- **********************

-- Detailed client engagement tracking
CREATE TABLE "client_engagement_analytics" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "customer_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "trainer_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "date" DATE NOT NULL,

  -- Engagement metrics
  "login_count" INTEGER DEFAULT 0,
  "session_duration_minutes" INTEGER DEFAULT 0,
  "meal_plans_viewed" INTEGER DEFAULT 0,
  "recipes_viewed" INTEGER DEFAULT 0,
  "progress_updates_made" INTEGER DEFAULT 0,
  "grocery_lists_created" INTEGER DEFAULT 0,
  "pdfs_exported" INTEGER DEFAULT 0,

  -- Interaction quality
  "recipe_ratings_given" INTEGER DEFAULT 0,
  "favorites_added" INTEGER DEFAULT 0,
  "collections_created" INTEGER DEFAULT 0,
  "goal_milestones_achieved" INTEGER DEFAULT 0,

  -- Computed engagement score (0-100)
  "daily_engagement_score" DECIMAL(5,2) DEFAULT 0.00,

  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("customer_id", "date")
);

-- **********************
-- BUSINESS INTELLIGENCE TABLES
-- **********************

-- Revenue analytics and forecasting
CREATE TABLE "revenue_analytics" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "trainer_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "period_type" TEXT NOT NULL, -- daily, weekly, monthly, quarterly
  "period_start" TIMESTAMP NOT NULL,
  "period_end" TIMESTAMP NOT NULL,

  -- Revenue metrics
  "subscription_revenue" DECIMAL(10,2) DEFAULT 0.00,
  "additional_services_revenue" DECIMAL(10,2) DEFAULT 0.00,
  "total_revenue" DECIMAL(10,2) DEFAULT 0.00,

  -- Client metrics
  "active_clients" INTEGER DEFAULT 0,
  "new_clients" INTEGER DEFAULT 0,
  "churned_clients" INTEGER DEFAULT 0,
  "client_ltv" DECIMAL(10,2) DEFAULT 0.00,

  -- Forecasting (Tier 3 only)
  "predicted_revenue_next_period" DECIMAL(10,2),
  "predicted_client_count_next_period" INTEGER,
  "confidence_score" DECIMAL(5,2), -- 0-100 confidence in prediction

  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer segmentation analytics
CREATE TABLE "customer_segmentation" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "customer_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "trainer_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,

  -- Segmentation categories
  "engagement_segment" TEXT, -- high, medium, low, at_risk
  "value_segment" TEXT, -- premium, standard, budget
  "lifecycle_stage" TEXT, -- new, active, declining, churned
  "dietary_preference_cluster" TEXT, -- keto_enthusiast, vegan_focused, etc.

  -- Behavioral scores
  "engagement_score" DECIMAL(5,2) DEFAULT 0.00,
  "satisfaction_score" DECIMAL(5,2) DEFAULT 0.00,
  "retention_risk_score" DECIMAL(5,2) DEFAULT 0.00,
  "upsell_propensity_score" DECIMAL(5,2) DEFAULT 0.00,

  -- Predictive analytics (Tier 3)
  "predicted_churn_probability" DECIMAL(5,2),
  "predicted_ltv" DECIMAL(10,2),
  "next_best_action" TEXT,

  "last_calculated" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("customer_id", "trainer_id")
);

-- **********************
-- COMPETITIVE INTELLIGENCE (TIER 3 ONLY)
-- **********************

-- Market benchmarking data
CREATE TABLE "market_benchmarks" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "benchmark_category" TEXT NOT NULL, -- recipe_trends, pricing, engagement
  "benchmark_metric" TEXT NOT NULL,
  "industry_average" DECIMAL(10,2),
  "top_quartile" DECIMAL(10,2),
  "bottom_quartile" DECIMAL(10,2),
  "data_source" TEXT,
  "collection_date" DATE NOT NULL,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recipe trend analysis
CREATE TABLE "recipe_trend_analytics" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "recipe_category" TEXT NOT NULL,
  "dietary_tag" TEXT,
  "main_ingredient" TEXT,

  -- Trend metrics
  "popularity_trend" TEXT, -- rising, stable, declining
  "search_volume_change" DECIMAL(5,2), -- percentage change
  "seasonal_factor" DECIMAL(5,2),
  "competitive_gap_score" DECIMAL(5,2), -- opportunity score

  -- Time period
  "analysis_period_start" DATE NOT NULL,
  "analysis_period_end" DATE NOT NULL,

  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- **********************
-- CUSTOM DASHBOARD CONFIGURATIONS (TIER 3)
-- **********************

-- User-defined dashboard layouts
CREATE TABLE "custom_dashboards" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "trainer_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "dashboard_name" TEXT NOT NULL,
  "dashboard_config" JSONB NOT NULL, -- Widget configuration
  "is_default" BOOLEAN DEFAULT FALSE,
  "layout_data" JSONB, -- Grid layout positions
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dashboard widget configurations
CREATE TABLE "dashboard_widgets" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "dashboard_id" UUID NOT NULL REFERENCES "custom_dashboards"("id") ON DELETE CASCADE,
  "widget_type" TEXT NOT NULL, -- chart, metric, table, etc.
  "widget_config" JSONB NOT NULL, -- Widget-specific configuration
  "position_x" INTEGER NOT NULL DEFAULT 0,
  "position_y" INTEGER NOT NULL DEFAULT 0,
  "width" INTEGER NOT NULL DEFAULT 1,
  "height" INTEGER NOT NULL DEFAULT 1,
  "is_visible" BOOLEAN DEFAULT TRUE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- **********************
-- AUDIT AND COMPLIANCE
-- **********************

-- Analytics access audit log
CREATE TABLE "analytics_access_log" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "action" TEXT NOT NULL, -- view_dashboard, export_report, access_feature
  "resource" TEXT NOT NULL, -- dashboard_name, report_type, feature_name
  "analytics_tier" subscription_tier NOT NULL,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "success" BOOLEAN DEFAULT TRUE,
  "error_message" TEXT,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Data privacy preferences
CREATE TABLE "analytics_privacy_preferences" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "allow_usage_analytics" BOOLEAN DEFAULT TRUE,
  "allow_performance_tracking" BOOLEAN DEFAULT TRUE,
  "allow_behavioral_analysis" BOOLEAN DEFAULT FALSE,
  "allow_predictive_modeling" BOOLEAN DEFAULT FALSE,
  "data_retention_days" INTEGER DEFAULT 365,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("user_id")
);

-- **********************
-- INDEXES FOR PERFORMANCE
-- **********************

-- Subscription management indexes
CREATE INDEX idx_trainer_subscriptions_trainer_id ON trainer_subscriptions(trainer_id);
CREATE INDEX idx_trainer_subscriptions_tier ON trainer_subscriptions(subscription_tier);
CREATE INDEX idx_trainer_subscriptions_status ON trainer_subscriptions(subscription_status);

-- Analytics summary indexes
CREATE INDEX idx_daily_analytics_trainer_date ON daily_analytics_summary(trainer_id, date);
CREATE INDEX idx_weekly_analytics_trainer_week ON weekly_analytics_summary(trainer_id, week_start_date);
CREATE INDEX idx_client_engagement_customer_date ON client_engagement_analytics(customer_id, date);
CREATE INDEX idx_client_engagement_trainer_date ON client_engagement_analytics(trainer_id, date);

-- Revenue analytics indexes
CREATE INDEX idx_revenue_analytics_trainer_period ON revenue_analytics(trainer_id, period_start, period_end);
CREATE INDEX idx_customer_segmentation_trainer ON customer_segmentation(trainer_id);
CREATE INDEX idx_customer_segmentation_engagement ON customer_segmentation(engagement_segment);

-- Dashboard and audit indexes
CREATE INDEX idx_custom_dashboards_trainer ON custom_dashboards(trainer_id);
CREATE INDEX idx_analytics_access_log_user_date ON analytics_access_log(user_id, created_at);
CREATE INDEX idx_analytics_privacy_user ON analytics_privacy_preferences(user_id);

-- **********************
-- INSERT DEFAULT DATA
-- **********************

-- Default subscription feature access
INSERT INTO subscription_feature_access (subscription_tier, feature, is_enabled, usage_limit) VALUES
-- Tier 1: NO analytics
('tier1_basic', 'basic_dashboard', FALSE, 0),
('tier1_basic', 'client_metrics', FALSE, 0),
('tier1_basic', 'business_reports', FALSE, 0),

-- Tier 2: Basic analytics
('tier2_analytics', 'basic_dashboard', TRUE, NULL),
('tier2_analytics', 'client_metrics', TRUE, NULL),
('tier2_analytics', 'business_reports', TRUE, 10), -- 10 reports per month

-- Tier 3: Advanced analytics
('tier3_advanced', 'basic_dashboard', TRUE, NULL),
('tier3_advanced', 'client_metrics', TRUE, NULL),
('tier3_advanced', 'business_reports', TRUE, NULL),
('tier3_advanced', 'predictive_insights', TRUE, NULL),
('tier3_advanced', 'custom_dashboards', TRUE, 5), -- 5 custom dashboards
('tier3_advanced', 'bi_features', TRUE, NULL),
('tier3_advanced', 'revenue_analytics', TRUE, NULL),
('tier3_advanced', 'customer_segmentation', TRUE, NULL),
('tier3_advanced', 'competitive_intelligence', TRUE, NULL);

-- **********************
-- VIEWS FOR EASY ACCESS
-- **********************

-- Tier-aware analytics access view
CREATE VIEW trainer_analytics_access AS
SELECT
  u.id as trainer_id,
  u.email,
  ts.subscription_tier,
  ts.subscription_status,
  ts.analytics_enabled,
  COALESCE(
    json_object_agg(
      sfa.feature,
      json_build_object(
        'enabled', sfa.is_enabled,
        'usage_limit', sfa.usage_limit
      )
    ) FILTER (WHERE sfa.feature IS NOT NULL),
    '{}'::json
  ) as available_features
FROM users u
LEFT JOIN trainer_subscriptions ts ON u.id = ts.trainer_id
LEFT JOIN subscription_feature_access sfa ON ts.subscription_tier = sfa.subscription_tier
WHERE u.role = 'trainer'
GROUP BY u.id, u.email, ts.subscription_tier, ts.subscription_status, ts.analytics_enabled;

-- Client engagement overview
CREATE VIEW client_engagement_overview AS
SELECT
  cea.customer_id,
  cea.trainer_id,
  u.email as customer_email,
  AVG(cea.daily_engagement_score) as avg_engagement_score,
  SUM(cea.session_duration_minutes) as total_session_minutes,
  COUNT(*) as active_days,
  MAX(cea.date) as last_active_date
FROM client_engagement_analytics cea
JOIN users u ON cea.customer_id = u.id
WHERE cea.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY cea.customer_id, cea.trainer_id, u.email;

COMMENT ON TABLE trainer_subscriptions IS 'Manages trainer subscription tiers and analytics access';
COMMENT ON TABLE daily_analytics_summary IS 'Daily aggregated analytics for trainer dashboards';
COMMENT ON TABLE client_engagement_analytics IS 'Detailed client engagement tracking for Tier 2+';
COMMENT ON TABLE revenue_analytics IS 'Business intelligence and revenue forecasting for Tier 3';
COMMENT ON TABLE customer_segmentation IS 'AI-powered customer segmentation for Tier 3';
COMMENT ON TABLE custom_dashboards IS 'User-defined dashboard configurations for Tier 3';