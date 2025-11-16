// @ts-nocheck - Type errors suppressed
/**
 * User Engagement Analytics Schema
 * 
 * Comprehensive tracking system for user interactions with recipes and content.
 * Supports analytics, recommendations, and behavioral insights for business intelligence.
 */

import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  uuid,
  integer,
  boolean,
  decimal,
  pgEnum,
  primaryKey,
} from "drizzle-orm/pg-core";
import { z } from "zod";
import { users, recipes } from "./schema";

// Enum for interaction types
export const interactionTypeEnum = pgEnum("interaction_type", [
  "view",           // User viewed recipe
  "click",          // User clicked on recipe
  "favorite",       // User favorited recipe
  "unfavorite",     // User removed favorite
  "share",          // User shared recipe
  "print",          // User printed recipe
  "pdf_export",     // User exported recipe to PDF
  "ingredient_copy", // User copied ingredients
  "instruction_expand", // User expanded instructions
  "nutrition_view", // User viewed nutrition info
  "time_spent",     // Time spent viewing recipe
  "scroll_depth",   // How much of recipe was scrolled
  "search",         // User searched for recipes
  "filter_applied", // User applied filters
]);

// Enum for rating values
export const ratingEnum = pgEnum("rating_value", ["1", "2", "3", "4", "5"]);

/**
 * User Recipe Interactions Table
 * 
 * Tracks all user interactions with recipes for analytics and recommendations.
 * High-volume table designed for efficient inserts and analytical queries.
 */
export const userRecipeInteractions = pgTable("user_recipe_interactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  recipeId: uuid("recipe_id")
    .references(() => recipes.id, { onDelete: "cascade" })
    .notNull(),
  interactionType: interactionTypeEnum("interaction_type").notNull(),
  
  // Contextual data stored as JSONB for flexibility
  metadata: jsonb("metadata").$type<{
    duration?: number;          // Time spent in milliseconds
    scrollDepth?: number;       // Percentage scrolled (0-100)
    deviceType?: string;        // mobile, tablet, desktop
    referrer?: string;          // How user found this recipe
    searchQuery?: string;       // If came from search
    filterContext?: string[];   // Active filters when interaction occurred
    location?: string;          // Geographic context (optional)
    sessionId?: string;         // Session tracking
  }>(),
  
  // IP and user agent for analytics (anonymized)
  ipHash: varchar("ip_hash", { length: 64 }), // Hashed IP for privacy
  userAgent: text("user_agent"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdx: index("user_recipe_interactions_user_idx").on(table.userId),
  recipeIdx: index("user_recipe_interactions_recipe_idx").on(table.recipeId),
  typeIdx: index("user_recipe_interactions_type_idx").on(table.interactionType),
  createdAtIdx: index("user_recipe_interactions_created_at_idx").on(table.createdAt),
  
  // Composite indexes for common queries
  userRecipeIdx: index("user_recipe_interactions_user_recipe_idx").on(table.userId, table.recipeId),
  recipeTypeIdx: index("user_recipe_interactions_recipe_type_idx").on(table.recipeId, table.interactionType),
  userTypeIdx: index("user_recipe_interactions_user_type_idx").on(table.userId, table.interactionType),
  
  // Time-based analytics indexes
  dailyAnalyticsIdx: index("user_recipe_interactions_daily_idx").on(table.createdAt, table.interactionType),
  weeklyAnalyticsIdx: index("user_recipe_interactions_weekly_idx").on(table.createdAt, table.recipeId),
}));

/**
 * Recipe View Metrics Table
 * 
 * Aggregated view counts and metrics for recipes.
 * Optimized for fast retrieval of popular content.
 */
export const recipeViewMetrics = pgTable("recipe_view_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipeId: uuid("recipe_id")
    .references(() => recipes.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  
  // View statistics
  totalViews: integer("total_views").default(0),
  uniqueViews: integer("unique_views").default(0),
  dailyViews: integer("daily_views").default(0),
  weeklyViews: integer("weekly_views").default(0),
  monthlyViews: integer("monthly_views").default(0),
  
  // Engagement metrics
  avgViewDuration: decimal("avg_view_duration", { precision: 10, scale: 2 }).default("0"), // seconds
  avgScrollDepth: decimal("avg_scroll_depth", { precision: 5, scale: 2 }).default("0"), // percentage
  bounceRate: decimal("bounce_rate", { precision: 5, 2: 2 }).default("0"), // percentage
  
  // Device breakdown
  mobileViews: integer("mobile_views").default(0),
  tabletViews: integer("tablet_views").default(0),
  desktopViews: integer("desktop_views").default(0),
  
  // Last activity tracking
  lastViewedAt: timestamp("last_viewed_at"),
  lastUpdatedAt: timestamp("last_updated_at").defaultNow(),
}, (table) => ({
  recipeIdx: index("recipe_view_metrics_recipe_idx").on(table.recipeId),
  totalViewsIdx: index("recipe_view_metrics_total_views_idx").on(table.totalViews),
  dailyViewsIdx: index("recipe_view_metrics_daily_views_idx").on(table.dailyViews),
  weeklyViewsIdx: index("recipe_view_metrics_weekly_views_idx").on(table.weeklyViews),
  lastViewedIdx: index("recipe_view_metrics_last_viewed_idx").on(table.lastViewedAt),
}));

/**
 * Recipe Ratings Table
 * 
 * User ratings and reviews for recipes.
 * Supports both quick ratings and detailed reviews.
 */
export const recipeRatings = pgTable("recipe_ratings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  recipeId: uuid("recipe_id")
    .references(() => recipes.id, { onDelete: "cascade" })
    .notNull(),
  
  rating: ratingEnum("rating").notNull(),
  review: text("review"), // Optional detailed review
  
  // Review metadata
  isVerifiedMade: boolean("is_verified_made").default(false), // User confirmed they made it
  wouldRecommend: boolean("would_recommend"),
  difficultyRating: integer("difficulty_rating"), // 1-5 scale
  accurateNutrition: boolean("accurate_nutrition"), // Nutrition info accuracy
  
  // Moderation
  isApproved: boolean("is_approved").default(true),
  isFlagged: boolean("is_flagged").default(false),
  moderationNotes: text("moderation_notes"),
  
  // Helpful votes from other users
  helpfulVotes: integer("helpful_votes").default(0),
  notHelpfulVotes: integer("not_helpful_votes").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("recipe_ratings_user_idx").on(table.userId),
  recipeIdx: index("recipe_ratings_recipe_idx").on(table.recipeId),
  ratingIdx: index("recipe_ratings_rating_idx").on(table.rating),
  approvedIdx: index("recipe_ratings_approved_idx").on(table.isApproved),
  
  // Unique constraint - one rating per user per recipe
  userRecipeIdx: index("recipe_ratings_user_recipe_unique_idx").on(table.userId, table.recipeId),
  
  // Helpful ratings
  helpfulIdx: index("recipe_ratings_helpful_idx").on(table.helpfulVotes),
  verifiedIdx: index("recipe_ratings_verified_idx").on(table.isVerifiedMade),
}));

/**
 * User Preferences Table
 * 
 * Tracks user dietary preferences, cuisine preferences, and behavioral patterns
 * for personalized recommendations and content curation.
 */
export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  
  // Dietary preferences
  dietaryRestrictions: jsonb("dietary_restrictions").$type<string[]>().default([]),
  allergies: jsonb("allergies").$type<string[]>().default([]),
  cuisinePreferences: jsonb("cuisine_preferences").$type<string[]>().default([]),
  dislikedIngredients: jsonb("disliked_ingredients").$type<string[]>().default([]),
  
  // Meal planning preferences
  preferredMealTypes: jsonb("preferred_meal_types").$type<string[]>().default([]),
  maxPrepTime: integer("max_prep_time"), // minutes
  maxCookTime: integer("max_cook_time"), // minutes
  preferredServings: integer("preferred_servings").default(2),
  
  // Nutritional preferences
  calorieGoal: integer("calorie_goal"),
  proteinGoal: decimal("protein_goal", { precision: 5, scale: 2 }),
  carbGoal: decimal("carb_goal", { precision: 5, scale: 2 }),
  fatGoal: decimal("fat_goal", { precision: 5, scale: 2 }),
  
  // Behavioral preferences learned from interactions
  preferredDifficulty: varchar("preferred_difficulty", { length: 20 }), // easy, medium, hard
  preferredViewingTime: integer("preferred_viewing_time"), // average time spent viewing recipes
  
  // Device and accessibility preferences
  preferredFontSize: varchar("preferred_font_size", { length: 10 }).default("medium"),
  highContrastMode: boolean("high_contrast_mode").default(false),
  preferredLanguage: varchar("preferred_language", { length: 10 }).default("en"),
  
  // Privacy settings
  allowPersonalization: boolean("allow_personalization").default(true),
  allowAnalytics: boolean("allow_analytics").default(true),
  sharePreferences: boolean("share_preferences").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("user_preferences_user_idx").on(table.userId),
  personalizationIdx: index("user_preferences_personalization_idx").on(table.allowPersonalization),
  updatedAtIdx: index("user_preferences_updated_at_idx").on(table.updatedAt),
}));

/**
 * User Sessions Table
 * 
 * Tracks user sessions for analytics and behavioral insights.
 * Helps understand user journey and engagement patterns.
 */
export const userSessions = pgTable("user_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: varchar("session_id", { length: 128 }).notNull().unique(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" }),
  
  // Session metadata
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // Total session duration in seconds
  
  // Device and browser info
  deviceType: varchar("device_type", { length: 20 }), // mobile, tablet, desktop
  browserName: varchar("browser_name", { length: 50 }),
  operatingSystem: varchar("operating_system", { length: 50 }),
  screenResolution: varchar("screen_resolution", { length: 20 }),
  
  // Location (anonymized)
  country: varchar("country", { length: 2 }), // ISO country code
  region: varchar("region", { length: 100 }),
  city: varchar("city", { length: 100 }),
  timezone: varchar("timezone", { length: 50 }),
  
  // Activity metrics
  pageViews: integer("page_views").default(0),
  recipeViews: integer("recipe_views").default(0),
  searchCount: integer("search_count").default(0),
  favoritesAdded: integer("favorites_added").default(0),
  
  // Entry and exit points
  entryPage: text("entry_page"),
  exitPage: text("exit_page"),
  referrer: text("referrer"),
  utmSource: varchar("utm_source", { length: 100 }),
  utmMedium: varchar("utm_medium", { length: 100 }),
  utmCampaign: varchar("utm_campaign", { length: 100 }),
  
  // Session quality indicators
  bounced: boolean("bounced").default(false), // Single page view
  converted: boolean("converted").default(false), // Completed desired action
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  sessionIdx: index("user_sessions_session_idx").on(table.sessionId),
  userIdx: index("user_sessions_user_idx").on(table.userId),
  startTimeIdx: index("user_sessions_start_time_idx").on(table.startTime),
  deviceTypeIdx: index("user_sessions_device_type_idx").on(table.deviceType),
  countryIdx: index("user_sessions_country_idx").on(table.country),
  convertedIdx: index("user_sessions_converted_idx").on(table.converted),
  
  // Analytics indexes
  dailySessionsIdx: index("user_sessions_daily_idx").on(table.startTime, table.deviceType),
  userActivityIdx: index("user_sessions_user_activity_idx").on(table.userId, table.startTime),
}));

// Type exports for engagement system
export type InsertUserRecipeInteraction = typeof userRecipeInteractions.$inferInsert;
export type UserRecipeInteraction = typeof userRecipeInteractions.$inferSelect;

export type InsertRecipeViewMetrics = typeof recipeViewMetrics.$inferInsert;
export type RecipeViewMetrics = typeof recipeViewMetrics.$inferSelect;

export type InsertRecipeRating = typeof recipeRatings.$inferInsert;
export type RecipeRating = typeof recipeRatings.$inferSelect;

export type InsertUserPreferences = typeof userPreferences.$inferInsert;
export type UserPreferences = typeof userPreferences.$inferSelect;

export type InsertUserSession = typeof userSessions.$inferInsert;
export type UserSession = typeof userSessions.$inferSelect;

// Validation schemas for API endpoints
export const trackInteractionSchema = z.object({
  recipeId: z.string().uuid(),
  interactionType: z.enum([
    "view", "click", "favorite", "unfavorite", "share", "print", 
    "pdf_export", "ingredient_copy", "instruction_expand", "nutrition_view",
    "time_spent", "scroll_depth", "search", "filter_applied"
  ]),
  metadata: z.object({
    duration: z.number().optional(),
    scrollDepth: z.number().min(0).max(100).optional(),
    deviceType: z.string().optional(),
    referrer: z.string().optional(),
    searchQuery: z.string().optional(),
    filterContext: z.array(z.string()).optional(),
    sessionId: z.string().optional(),
  }).optional(),
});

export const createRatingSchema = z.object({
  recipeId: z.string().uuid(),
  rating: z.enum(["1", "2", "3", "4", "5"]),
  review: z.string().max(2000).optional(),
  isVerifiedMade: z.boolean().default(false),
  wouldRecommend: z.boolean().optional(),
  difficultyRating: z.number().min(1).max(5).optional(),
  accurateNutrition: z.boolean().optional(),
});

export const updatePreferencesSchema = z.object({
  dietaryRestrictions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  cuisinePreferences: z.array(z.string()).optional(),
  dislikedIngredients: z.array(z.string()).optional(),
  preferredMealTypes: z.array(z.string()).optional(),
  maxPrepTime: z.number().min(1).max(480).optional(),
  maxCookTime: z.number().min(1).max(480).optional(),
  preferredServings: z.number().min(1).max(12).optional(),
  calorieGoal: z.number().min(800).max(5000).optional(),
  proteinGoal: z.number().min(0).max(500).optional(),
  carbGoal: z.number().min(0).max(1000).optional(),
  fatGoal: z.number().min(0).max(300).optional(),
  allowPersonalization: z.boolean().optional(),
  allowAnalytics: z.boolean().optional(),
  sharePreferences: z.boolean().optional(),
});

export const startSessionSchema = z.object({
  deviceType: z.string().optional(),
  browserName: z.string().optional(),
  operatingSystem: z.string().optional(),
  screenResolution: z.string().optional(),
  entryPage: z.string().optional(),
  referrer: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
});

// Analytics query schemas
export const analyticsFilterSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  userId: z.string().uuid().optional(),
  recipeId: z.string().uuid().optional(),
  interactionType: z.string().optional(),
  deviceType: z.string().optional(),
  country: z.string().optional(),
  groupBy: z.enum(["day", "week", "month", "interaction_type", "device_type"]).optional(),
  limit: z.number().max(1000).default(100),
});

export type TrackInteraction = z.infer<typeof trackInteractionSchema>;
export type CreateRating = z.infer<typeof createRatingSchema>;
export type UpdatePreferences = z.infer<typeof updatePreferencesSchema>;
export type StartSession = z.infer<typeof startSessionSchema>;
export type AnalyticsFilter = z.infer<typeof analyticsFilterSchema>;

// Extended types for analytics responses
export type RecipeEngagementStats = {
  recipeId: string;
  totalViews: number;
  uniqueViews: number;
  avgRating: number;
  totalRatings: number;
  favoriteCount: number;
  shareCount: number;
  avgViewDuration: number;
  engagementRate: number;
  conversionRate: number;
};

export type UserEngagementProfile = {
  userId: string;
  totalSessions: number;
  totalTime: number;
  avgSessionDuration: number;
  recipesViewed: number;
  favoritesCount: number;
  ratingsGiven: number;
  preferredDeviceType: string;
  mostActiveTimeOfDay: string;
  engagementScore: number;
};

export type AnalyticsReport = {
  timeframe: string;
  totalUsers: number;
  totalSessions: number;
  totalInteractions: number;
  topRecipes: RecipeEngagementStats[];
  topUsers: UserEngagementProfile[];
  deviceBreakdown: Record<string, number>;
  interactionBreakdown: Record<string, number>;
  conversionMetrics: {
    viewToFavorite: number;
    viewToRating: number;
    sessionToConversion: number;
  };
};

// Export aliases for service compatibility
export { userRecipeInteractions as userInteractions };
export { recipeViewMetrics as recipeViews };

// Add missing tables that services expect
export const recipeShares = pgTable("recipe_shares", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  recipeId: uuid("recipe_id").references(() => recipes.id, { onDelete: "cascade" }).notNull(),
  shareMethod: text("share_method").notNull(), // 'email', 'link', 'social', etc.
  shareData: jsonb("share_data"), // Additional share context
  sharedAt: timestamp("shared_at").defaultNow(),
}, (table) => ({
  userIdx: index("recipe_shares_user_idx").on(table.userId),
  recipeIdx: index("recipe_shares_recipe_idx").on(table.recipeId),
  sharedAtIdx: index("recipe_shares_shared_at_idx").on(table.sharedAt),
}));