/**
 * Recommendation Engine Schema
 * 
 * AI/ML-powered recommendation system for personalized content delivery.
 * Supports collaborative filtering, content-based filtering, and hybrid approaches.
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

// Enum for recommendation algorithms
export const recommendationAlgorithmEnum = pgEnum("recommendation_algorithm", [
  "collaborative_filtering",    // Based on similar users' preferences
  "content_based",             // Based on recipe content similarity
  "popularity_based",          // Based on trending/popular content
  "hybrid",                    // Combination of multiple algorithms
  "dietary_preference",        // Based on user's dietary restrictions/preferences
  "seasonal",                  // Based on seasonal ingredients/trends
  "time_based",               // Based on time of day/meal type
  "social",                   // Based on social connections' activity
  "ai_generated",             // ML model predictions
]);

// Enum for recommendation reasons
export const recommendationReasonEnum = pgEnum("recommendation_reason", [
  "similar_users_liked",       // Other users with similar taste liked this
  "ingredients_you_like",      // Contains ingredients you frequently use
  "matches_diet",             // Matches your dietary preferences
  "trending_now",             // Currently trending content
  "friends_favorite",         // Your friends favorited this
  "seasonal_ingredient",      // Features seasonal ingredients
  "quick_meal",              // Matches your time preferences
  "similar_cuisine",         // Similar to cuisines you enjoy
  "nutritional_goal",        // Matches your nutritional goals
  "recently_viewed",         // Similar to recently viewed recipes
]);

// Enum for feedback types
export const feedbackTypeEnum = pgEnum("feedback_type", [
  "positive",    // User liked the recommendation
  "negative",    // User didn't like the recommendation
  "clicked",     // User clicked on recommendation
  "favorited",   // User favorited the recommended item
  "shared",      // User shared the recommended item
  "dismissed",   // User explicitly dismissed recommendation
  "hidden",      // User hid this type of recommendation
]);

/**
 * User Similarity Matrix Table
 * 
 * Precomputed similarity scores between users for collaborative filtering.
 * Updated periodically using machine learning algorithms.
 */
export const userSimilarity = pgTable("user_similarity", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId1: uuid("user_id_1")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  userId2: uuid("user_id_2")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  
  // Similarity metrics (0.0 to 1.0)
  overallSimilarity: decimal("overall_similarity", { precision: 5, scale: 4 }).notNull(),
  tasteSimilarity: decimal("taste_similarity", { precision: 5, scale: 4 }), // based on ratings/favorites
  dietarySimilarity: decimal("dietary_similarity", { precision: 5, scale: 4 }), // dietary preferences
  behaviorSimilarity: decimal("behavior_similarity", { precision: 5, scale: 4 }), // interaction patterns
  demographicSimilarity: decimal("demographic_similarity", { precision: 5, scale: 4 }), // age, location, etc.
  
  // Confidence metrics
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 4 }), // reliability of similarity score
  dataPoints: integer("data_points"), // number of common interactions used for calculation
  
  // Temporal aspects
  calculatedAt: timestamp("calculated_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // when this similarity should be recalculated
  
}, (table) => ({
  user1Idx: index("user_similarity_user1_idx").on(table.userId1),
  user2Idx: index("user_similarity_user2_idx").on(table.userId2),
  
  // Unique constraint to prevent duplicate pairs (bidirectional)
  uniquePairIdx: index("user_similarity_unique_pair_idx").on(table.userId1, table.userId2),
  
  // Similarity lookup indexes
  overallSimilarityIdx: index("user_similarity_overall_idx").on(table.overallSimilarity),
  confidenceIdx: index("user_similarity_confidence_idx").on(table.confidenceScore),
  calculatedAtIdx: index("user_similarity_calculated_at_idx").on(table.calculatedAt),
  expiresAtIdx: index("user_similarity_expires_at_idx").on(table.expiresAt),
  
  // High similarity users index
  highSimilarityIdx: index("user_similarity_high_idx").on(table.userId1, table.overallSimilarity),
}));

/**
 * Recipe Recommendations Table
 * 
 * Generated recommendations for users with scoring and reasoning.
 * Supports A/B testing of different recommendation strategies.
 */
export const recipeRecommendations = pgTable("recipe_recommendations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  recipeId: uuid("recipe_id")
    .references(() => recipes.id, { onDelete: "cascade" })
    .notNull(),
  
  // Recommendation metadata
  algorithm: recommendationAlgorithmEnum("algorithm").notNull(),
  reason: recommendationReasonEnum("reason").notNull(),
  recommendationScore: decimal("recommendation_score", { precision: 8, scale: 4 }).notNull(), // 0-1000
  confidenceLevel: decimal("confidence_level", { precision: 5, scale: 4 }), // 0.0-1.0
  
  // Personalization factors
  personalizedFactors: jsonb("personalized_factors").$type<{
    dietaryMatch?: number;          // how well it matches dietary preferences
    timePreferenceMatch?: number;   // matches preferred cooking/prep time
    cuisinePreferenceMatch?: number; // matches preferred cuisines
    nutritionalGoalMatch?: number;  // matches nutritional goals
    difficultyMatch?: number;       // matches preferred difficulty level
    seasonalRelevance?: number;     // seasonal ingredient relevance
    socialInfluence?: number;       // influence from social connections
    trendingBoost?: number;         // boost from trending status
  }>(),
  
  // Context and targeting
  recommendationContext: varchar("recommendation_context", { length: 100 }), // homepage, search, meal_planning, etc.
  targetMealType: varchar("target_meal_type", { length: 50 }), // if recommendation is for specific meal
  seasonality: varchar("seasonality", { length: 20 }), // spring, summer, fall, winter
  
  // A/B Testing
  experimentGroup: varchar("experiment_group", { length: 50 }), // for A/B testing different algorithms
  testVariant: varchar("test_variant", { length: 50 }), // specific variant being tested
  
  // Recommendation lifecycle
  generatedAt: timestamp("generated_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // when recommendation becomes stale
  presentedAt: timestamp("presented_at"), // when shown to user
  interactedAt: timestamp("interacted_at"), // when user clicked/engaged
  
  // Performance tracking
  position: integer("position"), // position in recommendation list
  batchId: uuid("batch_id"), // group recommendations generated together
  
}, (table) => ({
  userIdx: index("recipe_recommendations_user_idx").on(table.userId),
  recipeIdx: index("recipe_recommendations_recipe_idx").on(table.recipeId),
  algorithmIdx: index("recipe_recommendations_algorithm_idx").on(table.algorithm),
  scoreIdx: index("recipe_recommendations_score_idx").on(table.recommendationScore),
  
  // User recommendation lookup
  userScoreIdx: index("recipe_recommendations_user_score_idx").on(table.userId, table.recommendationScore),
  contextIdx: index("recipe_recommendations_context_idx").on(table.recommendationContext),
  
  // A/B testing indexes
  experimentIdx: index("recipe_recommendations_experiment_idx").on(table.experimentGroup),
  variantIdx: index("recipe_recommendations_variant_idx").on(table.testVariant),
  
  // Lifecycle indexes
  generatedAtIdx: index("recipe_recommendations_generated_at_idx").on(table.generatedAt),
  expiresAtIdx: index("recipe_recommendations_expires_at_idx").on(table.expiresAt),
  presentedAtIdx: index("recipe_recommendations_presented_at_idx").on(table.presentedAt),
  
  // Batch processing
  batchIdx: index("recipe_recommendations_batch_idx").on(table.batchId),
  
  // Active recommendations
  activeRecommendationsIdx: index("recipe_recommendations_active_idx").on(table.userId, table.expiresAt),
}));

/**
 * Recommendation Feedback Table
 * 
 * User feedback on recommendations for model improvement.
 * Critical for learning and improving recommendation quality.
 */
export const recommendationFeedback = pgTable("recommendation_feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  recommendationId: uuid("recommendation_id")
    .references(() => recipeRecommendations.id, { onDelete: "cascade" })
    .notNull(),
  recipeId: uuid("recipe_id")
    .references(() => recipes.id, { onDelete: "cascade" })
    .notNull(),
  
  // Feedback details
  feedbackType: feedbackTypeEnum("feedback_type").notNull(),
  implicitFeedback: boolean("implicit_feedback").default(true), // inferred vs explicit
  
  // Interaction metrics
  timeToClick: integer("time_to_click"), // milliseconds from presentation to click
  timeSpentViewing: integer("time_spent_viewing"), // milliseconds spent viewing recipe
  scrollDepth: decimal("scroll_depth", { precision: 5, scale: 2 }), // percentage scrolled
  
  // Explicit feedback (if provided)
  explicitRating: integer("explicit_rating"), // 1-5 if user provides rating
  feedbackReason: varchar("feedback_reason", { length: 100 }), // why they liked/disliked
  
  // Context
  feedbackContext: varchar("feedback_context", { length: 100 }), // where feedback was given
  deviceType: varchar("device_type", { length: 20 }),
  sessionDuration: integer("session_duration"), // total session time when feedback given
  
  // Processing status
  processedForTraining: boolean("processed_for_training").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdx: index("recommendation_feedback_user_idx").on(table.userId),
  recommendationIdx: index("recommendation_feedback_recommendation_idx").on(table.recommendationId),
  recipeIdx: index("recommendation_feedback_recipe_idx").on(table.recipeId),
  feedbackTypeIdx: index("recommendation_feedback_type_idx").on(table.feedbackType),
  
  // Training data indexes
  trainingIdx: index("recommendation_feedback_training_idx").on(table.processedForTraining),
  explicitRatingIdx: index("recommendation_feedback_explicit_rating_idx").on(table.explicitRating),
  
  // Performance analysis indexes
  timeToClickIdx: index("recommendation_feedback_time_to_click_idx").on(table.timeToClick),
  implicitIdx: index("recommendation_feedback_implicit_idx").on(table.implicitFeedback),
  createdAtIdx: index("recommendation_feedback_created_at_idx").on(table.createdAt),
  
  // Context analysis
  contextIdx: index("recommendation_feedback_context_idx").on(table.feedbackContext),
  deviceIdx: index("recommendation_feedback_device_idx").on(table.deviceType),
}));

/**
 * ML Model Performance Table
 * 
 * Tracks performance of different recommendation models and algorithms.
 * Enables monitoring and comparison of model effectiveness.
 */
export const mlModelPerformance = pgTable("ml_model_performance", {
  id: uuid("id").primaryKey().defaultRandom(),
  modelName: varchar("model_name", { length: 100 }).notNull(),
  modelVersion: varchar("model_version", { length: 50 }).notNull(),
  algorithm: recommendationAlgorithmEnum("algorithm").notNull(),
  
  // Performance metrics
  precision: decimal("precision", { precision: 6, scale: 4 }), // precision at k
  recall: decimal("recall", { precision: 6, scale: 4 }), // recall at k
  f1Score: decimal("f1_score", { precision: 6, scale: 4 }),
  mapScore: decimal("map_score", { precision: 6, scale: 4 }), // mean average precision
  ndcgScore: decimal("ndcg_score", { precision: 6, scale: 4 }), // normalized discounted cumulative gain
  
  // Business metrics
  clickThroughRate: decimal("click_through_rate", { precision: 6, scale: 4 }),
  conversionRate: decimal("conversion_rate", { precision: 6, scale: 4 }), // favorites/shares from recommendations
  userSatisfactionScore: decimal("user_satisfaction_score", { precision: 6, scale: 4 }),
  diversityScore: decimal("diversity_score", { precision: 6, scale: 4 }), // recommendation diversity
  
  // Testing configuration
  testDataSize: integer("test_data_size"),
  trainingDataSize: integer("training_data_size"),
  testPeriodStart: timestamp("test_period_start"),
  testPeriodEnd: timestamp("test_period_end"),
  
  // Model configuration
  hyperparameters: jsonb("hyperparameters").$type<Record<string, any>>(),
  featureSet: jsonb("feature_set").$type<string[]>(), // features used in model
  
  // Deployment info
  isProduction: boolean("is_production").default(false),
  trafficPercentage: decimal("traffic_percentage", { precision: 5, scale: 2 }), // % of users seeing this model
  
  createdAt: timestamp("created_at").defaultNow(),
  deployedAt: timestamp("deployed_at"),
  retiredAt: timestamp("retired_at"),
}, (table) => ({
  modelNameIdx: index("ml_model_performance_model_name_idx").on(table.modelName),
  algorithmIdx: index("ml_model_performance_algorithm_idx").on(table.algorithm),
  productionIdx: index("ml_model_performance_production_idx").on(table.isProduction),
  
  // Performance comparison indexes
  precisionIdx: index("ml_model_performance_precision_idx").on(table.precision),
  clickThroughRateIdx: index("ml_model_performance_ctr_idx").on(table.clickThroughRate),
  conversionRateIdx: index("ml_model_performance_conversion_idx").on(table.conversionRate),
  
  // Time-based indexes
  createdAtIdx: index("ml_model_performance_created_at_idx").on(table.createdAt),
  testPeriodIdx: index("ml_model_performance_test_period_idx").on(table.testPeriodStart, table.testPeriodEnd),
  deployedAtIdx: index("ml_model_performance_deployed_at_idx").on(table.deployedAt),
}));

/**
 * Feature Store Table
 * 
 * Stores computed features for ML models to avoid real-time computation.
 * Enables fast recommendation generation with precomputed user and recipe features.
 */
export const featureStore = pgTable("feature_store", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: varchar("entity_type", { length: 20 }).notNull(), // user, recipe, user_recipe
  entityId: varchar("entity_id", { length: 100 }).notNull(), // user_id, recipe_id, or combination
  
  // Feature categories
  demographicFeatures: jsonb("demographic_features").$type<{
    age_group?: string;
    location?: string;
    device_preference?: string;
    signup_date?: string;
    user_type?: string;
  }>(),
  
  behavioralFeatures: jsonb("behavioral_features").$type<{
    avg_session_duration?: number;
    recipes_viewed_per_session?: number;
    favorite_meal_types?: string[];
    preferred_cooking_time?: number;
    preferred_difficulty?: string;
    most_active_time?: string;
    browse_pattern?: string;
  }>(),
  
  preferenceFeatures: jsonb("preference_features").$type<{
    dietary_restrictions?: string[];
    cuisine_preferences?: string[];
    ingredient_preferences?: string[];
    nutrition_goals?: Record<string, number>;
    rating_patterns?: Record<string, number>;
  }>(),
  
  socialFeatures: jsonb("social_features").$type<{
    follower_count?: number;
    following_count?: number;
    social_activity_level?: number;
    influence_score?: number;
    network_diversity?: number;
  }>(),
  
  contentFeatures: jsonb("content_features").$type<{
    recipe_complexity?: number;
    ingredient_count?: number;
    nutrition_density?: Record<string, number>;
    popularity_score?: number;
    trending_score?: number;
    seasonal_relevance?: number;
    cuisine_category?: string;
    meal_type_distribution?: Record<string, number>;
  }>(),
  
  // Feature metadata
  featureVersion: varchar("feature_version", { length: 20 }).notNull(),
  computedAt: timestamp("computed_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // when features should be recomputed
  computationTime: integer("computation_time"), // milliseconds to compute
  
}, (table) => ({
  entityTypeIdx: index("feature_store_entity_type_idx").on(table.entityType),
  entityIdIdx: index("feature_store_entity_id_idx").on(table.entityId),
  
  // Unique constraint for entity features
  uniqueEntityIdx: index("feature_store_unique_entity_idx").on(table.entityType, table.entityId, table.featureVersion),
  
  // Feature lookup indexes
  versionIdx: index("feature_store_version_idx").on(table.featureVersion),
  computedAtIdx: index("feature_store_computed_at_idx").on(table.computedAt),
  expiresAtIdx: index("feature_store_expires_at_idx").on(table.expiresAt),
  
  // Fresh features index
  freshFeaturesIdx: index("feature_store_fresh_idx").on(table.entityType, table.expiresAt),
}));

// Type exports for recommendation system
export type InsertUserSimilarity = typeof userSimilarity.$inferInsert;
export type UserSimilarity = typeof userSimilarity.$inferSelect;

export type InsertRecipeRecommendation = typeof recipeRecommendations.$inferInsert;
export type RecipeRecommendation = typeof recipeRecommendations.$inferSelect;

export type InsertRecommendationFeedback = typeof recommendationFeedback.$inferInsert;
export type RecommendationFeedback = typeof recommendationFeedback.$inferSelect;

export type InsertMlModelPerformance = typeof mlModelPerformance.$inferInsert;
export type MlModelPerformance = typeof mlModelPerformance.$inferSelect;

export type InsertFeatureStore = typeof featureStore.$inferInsert;
export type FeatureStore = typeof featureStore.$inferSelect;

// Validation schemas for API endpoints
export const generateRecommendationsSchema = z.object({
  userId: z.string().uuid(),
  count: z.number().min(1).max(100).default(20),
  algorithm: z.enum([
    "collaborative_filtering", "content_based", "popularity_based", "hybrid",
    "dietary_preference", "seasonal", "time_based", "social", "ai_generated"
  ]).optional(),
  context: z.string().max(100).optional(),
  targetMealType: z.string().max(50).optional(),
  excludeRecentlyViewed: z.boolean().default(true),
  includeDiversityBoost: z.boolean().default(true),
});

export const submitFeedbackSchema = z.object({
  recommendationId: z.string().uuid(),
  feedbackType: z.enum(["positive", "negative", "clicked", "favorited", "shared", "dismissed", "hidden"]),
  implicitFeedback: z.boolean().default(true),
  timeToClick: z.number().optional(),
  timeSpentViewing: z.number().optional(),
  scrollDepth: z.number().min(0).max(100).optional(),
  explicitRating: z.number().min(1).max(5).optional(),
  feedbackReason: z.string().max(100).optional(),
  feedbackContext: z.string().max(100).optional(),
});

export const updatePreferencesSchema = z.object({
  dietaryRestrictions: z.array(z.string()).optional(),
  cuisinePreferences: z.array(z.string()).optional(),
  dislikedIngredients: z.array(z.string()).optional(),
  nutritionGoals: z.object({
    calories: z.number().optional(),
    protein: z.number().optional(),
    carbs: z.number().optional(),
    fat: z.number().optional(),
  }).optional(),
  cookingPreferences: z.object({
    maxPrepTime: z.number().optional(),
    maxCookTime: z.number().optional(),
    difficultyLevel: z.string().optional(),
  }).optional(),
});

export const modelPerformanceQuerySchema = z.object({
  modelName: z.string().optional(),
  algorithm: z.string().optional(),
  isProduction: z.boolean().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z.enum(["precision", "recall", "f1_score", "click_through_rate", "conversion_rate"]).default("f1_score"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type GenerateRecommendations = z.infer<typeof generateRecommendationsSchema>;
export type SubmitFeedback = z.infer<typeof submitFeedbackSchema>;
export type UpdatePreferences = z.infer<typeof updatePreferencesSchema>;
export type ModelPerformanceQuery = z.infer<typeof modelPerformanceQuerySchema>;

// Extended types for API responses
export type RecommendationWithDetails = RecipeRecommendation & {
  recipe: {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    caloriesKcal: number;
    prepTimeMinutes: number;
    cookTimeMinutes: number;
    averageRating: number;
    mealTypes: string[];
    dietaryTags: string[];
  };
  reasoning: {
    primary_reason: string;
    confidence: number;
    personalization_factors: Record<string, number>;
    similar_users?: number;
    social_influence?: string[];
  };
};

export type UserRecommendationProfile = {
  userId: string;
  totalRecommendationsGenerated: number;
  totalRecommendationsClicked: number;
  totalRecommendationsFavorited: number;
  averageClickThroughRate: number;
  averageConversionRate: number;
  preferredAlgorithms: Array<{
    algorithm: string;
    successRate: number;
    usage: number;
  }>;
  topRecommendationReasons: Array<{
    reason: string;
    count: number;
    successRate: number;
  }>;
  recentFeedback: RecommendationFeedback[];
};

export type RecommendationInsights = {
  overallPerformance: {
    totalRecommendations: number;
    clickThroughRate: number;
    conversionRate: number;
    userSatisfactionScore: number;
  };
  algorithmComparison: Array<{
    algorithm: string;
    performance: MlModelPerformance;
    usage: number;
    trend: "improving" | "declining" | "stable";
  }>;
  topPerformingFeatures: Array<{
    feature: string;
    importance: number;
    category: string;
  }>;
  recommendations: Array<{
    area: string;
    suggestion: string;
    potentialImpact: number;
  }>;
};