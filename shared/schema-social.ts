/**
 * Social Features & Popular Content Schema
 * 
 * Social networking features, trending content tracking, and community engagement.
 * Supports user following, content sharing, and viral content identification.
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

// Enum for share types
export const shareTypeEnum = pgEnum("share_type", [
  "link",           // Shared as link
  "social_media",   // Shared to social media
  "email",          // Shared via email
  "message",        // Shared via messaging
  "copy_link",      // Copied link to clipboard
  "qr_code",        // Generated QR code
  "print",          // Printed recipe
  "screenshot",     // Screenshot taken
]);

// Enum for content types for popularity tracking
export const contentTypeEnum = pgEnum("content_type", [
  "recipe",
  "collection",
  "user_profile",
  "meal_plan",
]);

/**
 * Recipe Popularity Metrics Table
 * 
 * Centralized tracking of recipe popularity across all metrics.
 * Optimized for fast retrieval of trending and popular content.
 */
export const recipePopularity = pgTable("recipe_popularity", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipeId: uuid("recipe_id")
    .references(() => recipes.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  
  // Core engagement metrics
  viewCount: integer("view_count").default(0),
  uniqueViewCount: integer("unique_view_count").default(0),
  favoriteCount: integer("favorite_count").default(0),
  shareCount: integer("share_count").default(0),
  ratingCount: integer("rating_count").default(0),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default("0"),
  
  // Time-based metrics for trending
  dailyViews: integer("daily_views").default(0),
  weeklyViews: integer("weekly_views").default(0),
  monthlyViews: integer("monthly_views").default(0),
  dailyFavorites: integer("daily_favorites").default(0),
  weeklyFavorites: integer("weekly_favorites").default(0),
  monthlyFavorites: integer("monthly_favorites").default(0),
  
  // Engagement quality metrics
  avgSessionTime: decimal("avg_session_time", { precision: 8, scale: 2 }).default("0"), // seconds
  bounceRate: decimal("bounce_rate", { precision: 5, scale: 2 }).default("0"), // percentage
  completionRate: decimal("completion_rate", { precision: 5, scale: 2 }).default("0"), // how many finish reading
  
  // Viral potential indicators
  shareToViewRatio: decimal("share_to_view_ratio", { precision: 5, scale: 4 }).default("0"),
  favoriteToViewRatio: decimal("favorite_to_view_ratio", { precision: 5, scale: 4 }).default("0"),
  viralityScore: decimal("virality_score", { precision: 8, scale: 2 }).default("0"),
  
  // Overall trending score (algorithm calculated)
  trendingScore: decimal("trending_score", { precision: 10, scale: 2 }).default("0"),
  popularityRank: integer("popularity_rank"),
  
  // Demographic insights
  primaryAgeGroup: varchar("primary_age_group", { length: 20 }),
  primaryDeviceType: varchar("primary_device_type", { length: 20 }),
  primaryCountry: varchar("primary_country", { length: 2 }),
  
  // Freshness and momentum
  momentumScore: decimal("momentum_score", { precision: 8, scale: 2 }).default("0"), // rate of growth
  peakDay: timestamp("peak_day"), // When recipe hit peak popularity
  isCurrentlyTrending: boolean("is_currently_trending").default(false),
  
  lastCalculated: timestamp("last_calculated").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  recipeIdx: index("recipe_popularity_recipe_idx").on(table.recipeId),
  trendingScoreIdx: index("recipe_popularity_trending_score_idx").on(table.trendingScore),
  popularityRankIdx: index("recipe_popularity_rank_idx").on(table.popularityRank),
  currentlyTrendingIdx: index("recipe_popularity_currently_trending_idx").on(table.isCurrentlyTrending),
  viewCountIdx: index("recipe_popularity_view_count_idx").on(table.viewCount),
  favoriteCountIdx: index("recipe_popularity_favorite_count_idx").on(table.favoriteCount),
  ratingIdx: index("recipe_popularity_rating_idx").on(table.averageRating),
  
  // Time-based indexes for trending queries
  dailyViewsIdx: index("recipe_popularity_daily_views_idx").on(table.dailyViews),
  weeklyViewsIdx: index("recipe_popularity_weekly_views_idx").on(table.weeklyViews),
  monthlyViewsIdx: index("recipe_popularity_monthly_views_idx").on(table.monthlyViews),
  momentumIdx: index("recipe_popularity_momentum_idx").on(table.momentumScore),
  lastCalculatedIdx: index("recipe_popularity_last_calculated_idx").on(table.lastCalculated),
}));

/**
 * Weekly Trending Snapshots Table
 * 
 * Historical snapshots of weekly trending recipes for analysis and reporting.
 * Enables tracking of trends over time and seasonal patterns.
 */
export const weeklyTrending = pgTable("weekly_trending", {
  id: uuid("id").primaryKey().defaultRandom(),
  weekStart: timestamp("week_start").notNull(), // Monday of the week
  recipeId: uuid("recipe_id")
    .references(() => recipes.id, { onDelete: "cascade" })
    .notNull(),
  
  rank: integer("rank").notNull(), // 1-50 trending rank for that week
  trendScore: decimal("trend_score", { precision: 10, scale: 2 }).notNull(),
  
  // Week's metrics
  weeklyViews: integer("weekly_views").notNull(),
  weeklyFavorites: integer("weekly_favorites").notNull(),
  weeklyShares: integer("weekly_shares").notNull(),
  weeklyRatings: integer("weekly_ratings").notNull(),
  
  // Growth metrics
  viewGrowthRate: decimal("view_growth_rate", { precision: 6, scale: 2 }), // % growth from previous week
  favoriteGrowthRate: decimal("favorite_growth_rate", { precision: 6, scale: 2 }),
  
  // Category information
  primaryMealType: varchar("primary_meal_type", { length: 50 }),
  primaryDietaryTag: varchar("primary_dietary_tag", { length: 50 }),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  weekStartIdx: index("weekly_trending_week_start_idx").on(table.weekStart),
  recipeIdx: index("weekly_trending_recipe_idx").on(table.recipeId),
  rankIdx: index("weekly_trending_rank_idx").on(table.weekStart, table.rank),
  
  // Composite indexes for trending queries
  weekRankIdx: index("weekly_trending_week_rank_idx").on(table.weekStart, table.rank),
  recipeWeekIdx: index("weekly_trending_recipe_week_idx").on(table.recipeId, table.weekStart),
  trendScoreIdx: index("weekly_trending_trend_score_idx").on(table.trendScore),
}));

/**
 * User Followers Table
 * 
 * Social following system allowing users to follow each other.
 * Supports notifications and feed generation for followed users' activities.
 */
export const userFollowers = pgTable("user_followers", {
  id: uuid("id").primaryKey().defaultRandom(),
  followerId: uuid("follower_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  followingId: uuid("following_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  
  // Follow metadata
  followedAt: timestamp("followed_at").defaultNow(),
  notificationsEnabled: boolean("notifications_enabled").default(true),
  
  // Interaction tracking
  lastSeenActivity: timestamp("last_seen_activity"), // Last time follower saw following's activity
  interactionCount: integer("interaction_count").default(0), // Times follower interacted with following's content
  
  // Follow source tracking
  followSource: varchar("follow_source", { length: 50 }), // how they found this user (search, suggestion, etc.)
  
}, (table) => ({
  followerIdx: index("user_followers_follower_idx").on(table.followerId),
  followingIdx: index("user_followers_following_idx").on(table.followingId),
  
  // Unique constraint to prevent duplicate follows
  uniqueFollowIdx: index("user_followers_unique_idx").on(table.followerId, table.followingId),
  
  // Activity feed indexes
  followerActivityIdx: index("user_followers_follower_activity_idx").on(table.followerId, table.lastSeenActivity),
  notificationsIdx: index("user_followers_notifications_idx").on(table.notificationsEnabled),
  followedAtIdx: index("user_followers_followed_at_idx").on(table.followedAt),
}));

/**
 * Shared Recipes Table
 * 
 * Tracks recipe sharing across different platforms and methods.
 * Enables viral tracking and attribution of recipe discovery.
 */
export const sharedRecipes = pgTable("shared_recipes", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipeId: uuid("recipe_id")
    .references(() => recipes.id, { onDelete: "cascade" })
    .notNull(),
  sharedBy: uuid("shared_by")
    .references(() => users.id, { onDelete: "set null" }), // null if anonymous sharing
  
  shareType: shareTypeEnum("share_type").notNull(),
  
  // Share context
  platform: varchar("platform", { length: 50 }), // facebook, twitter, instagram, etc.
  shareText: text("share_text"), // Custom message with the share
  recipientEmail: varchar("recipient_email", { length: 255 }), // for email shares
  
  // Tracking data
  shareToken: varchar("share_token", { length: 128 }), // Unique token for tracking clicks
  clickCount: integer("click_count").default(0),
  conversionCount: integer("conversion_count").default(0), // clicks that led to favorites/accounts
  
  // Geographic and device context
  sharedFromCountry: varchar("shared_from_country", { length: 2 }),
  sharedFromDevice: varchar("shared_from_device", { length: 20 }),
  
  // Attribution tracking
  originalShareId: uuid("original_share_id"), // if this is a re-share
  shareDepth: integer("share_depth").default(1), // how many times this has been re-shared
  
  createdAt: timestamp("created_at").defaultNow(),
  lastClickedAt: timestamp("last_clicked_at"),
}, (table) => ({
  recipeIdx: index("shared_recipes_recipe_idx").on(table.recipeId),
  sharedByIdx: index("shared_recipes_shared_by_idx").on(table.sharedBy),
  shareTypeIdx: index("shared_recipes_share_type_idx").on(table.shareType),
  shareTokenIdx: index("shared_recipes_share_token_idx").on(table.shareToken),
  platformIdx: index("shared_recipes_platform_idx").on(table.platform),
  
  // Analytics indexes
  createdAtIdx: index("shared_recipes_created_at_idx").on(table.createdAt),
  clickCountIdx: index("shared_recipes_click_count_idx").on(table.clickCount),
  conversionIdx: index("shared_recipes_conversion_idx").on(table.conversionCount),
  
  // Viral tracking indexes
  originalShareIdx: index("shared_recipes_original_share_idx").on(table.originalShareId),
  shareDepthIdx: index("shared_recipes_share_depth_idx").on(table.shareDepth),
}));

/**
 * User Social Stats Table
 * 
 * Aggregated social statistics for users to avoid expensive calculations.
 * Updated periodically to maintain fast profile loading.
 */
export const userSocialStats = pgTable("user_social_stats", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  
  // Follower metrics
  followerCount: integer("follower_count").default(0),
  followingCount: integer("following_count").default(0),
  mutualFollowCount: integer("mutual_follow_count").default(0), // followers who follow back
  
  // Content metrics
  recipesShared: integer("recipes_shared").default(0),
  totalRecipesViewed: integer("total_recipes_viewed").default(0),
  favoriteRecipesCount: integer("favorite_recipes_count").default(0),
  collectionsCount: integer("collections_count").default(0),
  publicCollectionsCount: integer("public_collections_count").default(0),
  
  // Engagement metrics
  totalRatingsGiven: integer("total_ratings_given").default(0),
  averageRatingGiven: decimal("average_rating_given", { precision: 3, scale: 2 }),
  recipesRatedByOthers: integer("recipes_rated_by_others").default(0), // if user creates recipes
  averageRatingReceived: decimal("average_rating_received", { precision: 3, scale: 2 }),
  
  // Influence metrics
  influenceScore: decimal("influence_score", { precision: 8, scale: 2 }).default("0"),
  viralSharesCreated: integer("viral_shares_created").default(0), // shares that went viral
  contentViewsGenerated: integer("content_views_generated").default(0), // views from their shares
  
  // Activity metrics
  loginStreak: integer("login_streak").default(0), // current consecutive days logged in
  maxLoginStreak: integer("max_login_streak").default(0),
  lastActiveDate: timestamp("last_active_date"),
  
  // Achievement tracking
  badgesEarned: jsonb("badges_earned").$type<string[]>().default([]),
  achievementLevel: integer("achievement_level").default(1), // 1-10 user level
  
  lastCalculated: timestamp("last_calculated").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("user_social_stats_user_idx").on(table.userId),
  followerCountIdx: index("user_social_stats_follower_count_idx").on(table.followerCount),
  influenceScoreIdx: index("user_social_stats_influence_score_idx").on(table.influenceScore),
  achievementLevelIdx: index("user_social_stats_achievement_level_idx").on(table.achievementLevel),
  lastActiveIdx: index("user_social_stats_last_active_idx").on(table.lastActiveDate),
  lastCalculatedIdx: index("user_social_stats_last_calculated_idx").on(table.lastCalculated),
}));

/**
 * Content Discovery Sources Table
 * 
 * Tracks how users discover content for recommendation optimization.
 * Helps understand most effective discovery channels.
 */
export const contentDiscoverySources = pgTable("content_discovery_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  contentId: uuid("content_id").notNull(), // recipe, collection, etc.
  contentType: contentTypeEnum("content_type").notNull(),
  
  // Discovery method
  discoverySource: varchar("discovery_source", { length: 50 }).notNull(), // search, trending, recommendation, social, etc.
  discoveryContext: jsonb("discovery_context").$type<{
    searchQuery?: string;
    recommendationAlgorithm?: string;
    socialReferrer?: string;
    trendingCategory?: string;
    filterContext?: string[];
    pageContext?: string;
  }>(),
  
  // Discovery outcome
  engaged: boolean("engaged").default(false), // did they interact beyond viewing
  converted: boolean("converted").default(false), // did they favorite, share, or save
  timeToConversion: integer("time_to_conversion"), // seconds from discovery to conversion
  
  discoveredAt: timestamp("discovered_at").defaultNow(),
}, (table) => ({
  userIdx: index("content_discovery_sources_user_idx").on(table.userId),
  contentIdx: index("content_discovery_sources_content_idx").on(table.contentId),
  sourceIdx: index("content_discovery_sources_source_idx").on(table.discoverySource),
  engagedIdx: index("content_discovery_sources_engaged_idx").on(table.engaged),
  convertedIdx: index("content_discovery_sources_converted_idx").on(table.converted),
  
  // Analytics indexes
  discoveredAtIdx: index("content_discovery_sources_discovered_at_idx").on(table.discoveredAt),
  contentTypeIdx: index("content_discovery_sources_content_type_idx").on(table.contentType),
  
  // Conversion analysis indexes
  conversionTimeIdx: index("content_discovery_sources_conversion_time_idx").on(table.timeToConversion),
  sourceConversionIdx: index("content_discovery_sources_source_conversion_idx").on(table.discoverySource, table.converted),
}));

// Type exports for social system
export type InsertRecipePopularity = typeof recipePopularity.$inferInsert;
export type RecipePopularity = typeof recipePopularity.$inferSelect;

export type InsertWeeklyTrending = typeof weeklyTrending.$inferInsert;
export type WeeklyTrending = typeof weeklyTrending.$inferSelect;

export type InsertUserFollower = typeof userFollowers.$inferInsert;
export type UserFollower = typeof userFollowers.$inferSelect;

export type InsertSharedRecipe = typeof sharedRecipes.$inferInsert;
export type SharedRecipe = typeof sharedRecipes.$inferSelect;

export type InsertUserSocialStats = typeof userSocialStats.$inferInsert;
export type UserSocialStats = typeof userSocialStats.$inferSelect;

export type InsertContentDiscoverySource = typeof contentDiscoverySources.$inferInsert;
export type ContentDiscoverySource = typeof contentDiscoverySources.$inferSelect;

// Validation schemas for API endpoints
export const shareRecipeSchema = z.object({
  recipeId: z.string().uuid(),
  shareType: z.enum(["link", "social_media", "email", "message", "copy_link", "qr_code", "print", "screenshot"]),
  platform: z.string().max(50).optional(),
  shareText: z.string().max(500).optional(),
  recipientEmail: z.string().email().optional(),
});

export const followUserSchema = z.object({
  followingId: z.string().uuid(),
  notificationsEnabled: z.boolean().default(true),
  followSource: z.string().max(50).optional(),
});

export const trackDiscoverySchema = z.object({
  contentId: z.string().uuid(),
  contentType: z.enum(["recipe", "collection", "user_profile", "meal_plan"]),
  discoverySource: z.string().max(50),
  discoveryContext: z.object({
    searchQuery: z.string().optional(),
    recommendationAlgorithm: z.string().optional(),
    socialReferrer: z.string().optional(),
    trendingCategory: z.string().optional(),
    filterContext: z.array(z.string()).optional(),
    pageContext: z.string().optional(),
  }).optional(),
});

export const trendingFilterSchema = z.object({
  timeframe: z.enum(["daily", "weekly", "monthly", "all_time"]).default("weekly"),
  category: z.string().optional(), // meal type or dietary tag
  limit: z.number().max(100).default(20),
  offset: z.number().default(0),
  minViews: z.number().optional(),
  minRating: z.number().min(1).max(5).optional(),
});

export const socialFeedSchema = z.object({
  page: z.number().default(1),
  limit: z.number().max(50).default(20),
  includeFollowing: z.boolean().default(true),
  includeRecommended: z.boolean().default(true),
  contentTypes: z.array(z.enum(["recipe", "collection", "rating", "favorite"])).optional(),
});

export type ShareRecipe = z.infer<typeof shareRecipeSchema>;
export type FollowUser = z.infer<typeof followUserSchema>;
export type TrackDiscovery = z.infer<typeof trackDiscoverySchema>;
export type TrendingFilter = z.infer<typeof trendingFilterSchema>;
export type SocialFeed = z.infer<typeof socialFeedSchema>;

// Extended types for API responses
export type TrendingRecipe = {
  recipeId: string;
  rank: number;
  trendScore: number;
  viewGrowth: number;
  recipe: {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    averageRating: number;
    ratingCount: number;
    mealTypes: string[];
    dietaryTags: string[];
  };
  metrics: {
    weeklyViews: number;
    weeklyFavorites: number;
    weeklyShares: number;
    momentumScore: number;
  };
};

export type UserProfileWithSocial = {
  userId: string;
  name: string;
  profilePicture?: string;
  role: string;
  socialStats: UserSocialStats;
  isFollowing?: boolean;
  mutualFollowers?: number;
  recentActivity: Array<{
    type: string;
    contentId: string;
    contentName: string;
    timestamp: Date;
  }>;
};

export type SocialFeedItem = {
  id: string;
  type: "favorite" | "rating" | "collection_created" | "followed_user";
  userId: string;
  userName: string;
  userProfilePicture?: string;
  contentId: string;
  contentName: string;
  contentImageUrl?: string;
  action: string;
  timestamp: Date;
  metadata?: Record<string, any>;
};

export type ViralContent = {
  contentId: string;
  contentType: "recipe" | "collection";
  viralityScore: number;
  totalShares: number;
  shareVelocity: number; // shares per hour
  peakDay: Date;
  shareBreakdown: Record<string, number>; // by platform
  geographicSpread: Array<{
    country: string;
    shareCount: number;
  }>;
};