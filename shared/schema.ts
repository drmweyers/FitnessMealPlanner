/**
 * FitMeal Pro Database Schema
 *
 * This file defines the complete database schema for the FitMeal Pro application
 * using Drizzle ORM with PostgreSQL. It includes tables for user management,
 * recipe storage, and validation schemas for API endpoints.
 *
 * Key Components:
 * - Authentication tables (users, password_reset_tokens)
 * - Recipe management (recipes table with nutritional data)
 * - Type definitions and validation schemas
 * - Meal plan generation schemas
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
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "trainer",
  "customer",
]);

// Story 2.14: Tier level enum for progressive recipe access
export const tierLevelEnum = pgEnum("tier_level", [
  "starter",
  "professional",
  "enterprise",
]);

/**
 * Users Table
 *
 * Stores user profile information for authentication.
 *
 * Fields:
 * - id: Unique user identifier (UUID)
 * - email: User's email address (unique, not null)
 * - password: Hashed password
 * - role: User's role (admin, trainer, customer)
 * - createdAt/updatedAt: Automatic timestamps
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email").unique().notNull(),
  password: text("password"), // Now optional for Google OAuth users
  role: userRoleEnum("role").default("customer").notNull(),
  googleId: varchar("google_id").unique(),
  name: varchar("name"),
  profilePicture: text("profile_picture"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Email Preferences Table
 *
 * Stores user preferences for email communications.
 *
 * Fields:
 * - id: Unique preference identifier (UUID)
 * - user_id: Foreign key to the users table
 * - weekly_progress_summaries: Enable/disable weekly progress summary emails
 * - meal_plan_updates: Enable/disable meal plan update notifications
 * - recipe_recommendations: Enable/disable recipe recommendation emails
 * - system_notifications: Enable/disable system notification emails
 * - marketing_emails: Enable/disable marketing emails
 * - frequency: Email frequency preference (daily, weekly, monthly)
 */
export const emailPreferences = pgTable("email_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  weeklyProgressSummaries: boolean("weekly_progress_summaries").default(true).notNull(),
  mealPlanUpdates: boolean("meal_plan_updates").default(true).notNull(),
  recipeRecommendations: boolean("recipe_recommendations").default(true).notNull(),
  systemNotifications: boolean("system_notifications").default(true).notNull(),
  marketingEmails: boolean("marketing_emails").default(false).notNull(),
  frequency: text("frequency").default("weekly").notNull(), // daily, weekly, monthly
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Email Send Log Table
 *
 * Tracks all emails sent to users for analytics and debugging.
 *
 * Fields:
 * - id: Unique log entry identifier (UUID)
 * - user_id: Foreign key to the users table (nullable for system emails)
 * - email_type: Type of email sent (progress_summary, invitation, notification, etc.)
 * - subject: Email subject line
 * - recipient_email: Email address where the email was sent
 * - status: Delivery status (sent, failed, delivered, bounced)
 * - message_id: External email service message ID
 * - error_message: Error details if sending failed
 */
export const emailSendLog = pgTable("email_send_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  emailType: varchar("email_type", { length: 100 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).default("sent").notNull(),
  messageId: varchar("message_id", { length: 255 }),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

/**
 * Password Reset Tokens Table
 *
 * Stores tokens for the "forgot password" feature.
 *
 * Fields:
 * - id: Unique token identifier (UUID)
 * - user_id: Foreign key to the users table
 * - token: The reset token
 * - expires_at: Token expiration timestamp
 */
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

/**
 * Refresh Tokens Table
 *
 * Stores refresh tokens for persistent user sessions.
 *
 * Fields:
 * - id: Unique token identifier (UUID)
 * - user_id: Foreign key to the users table
 * - token: The refresh token
 * - expires_at: Token expiration timestamp
 */
export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

/**
 * Customer Invitation Tokens Table
 *
 * Stores invitation tokens that trainers send to customers.
 * Customers can use these tokens to register and automatically
 * be linked to the trainer who invited them.
 *
 * Fields:
 * - id: Unique token identifier (UUID)
 * - trainer_id: Foreign key to the trainer who sent the invitation
 * - customer_email: Email address of the invited customer
 * - token: Secure invitation token
 * - expires_at: Token expiration timestamp (typically 7 days)
 * - used_at: Timestamp when the invitation was used (null if unused)
 * - created_at: When the invitation was created
 */
export const customerInvitations = pgTable("customer_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  trainerId: uuid("trainer_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  customerEmail: varchar("customer_email", { length: 255 }).notNull(),
  token: text("token").unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Type definitions for user operations
export type InsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

/**
 * Recipes Table
 *
 * Core table storing all recipe data including nutritional information,
 * cooking instructions, and metadata. Supports advanced filtering and
 * search capabilities for meal plan generation.
 *
 * Key Features:
 * - UUID primary keys for global uniqueness
 * - JSONB arrays for flexible tagging (meal types, dietary restrictions)
 * - Structured ingredient storage with amounts and units
 * - Comprehensive nutritional data (calories, macros)
 * - Approval workflow for content moderation
 * - Automatic timestamp management
 */
export const recipes = pgTable("recipes", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),

  // Flexible categorization using JSONB arrays
  mealTypes: jsonb("meal_types").$type<string[]>().default([]), // breakfast, lunch, dinner, snack
  dietaryTags: jsonb("dietary_tags").$type<string[]>().default([]), // vegan, keto, gluten-free, etc.
  mainIngredientTags: jsonb("main_ingredient_tags")
    .$type<string[]>()
    .default([]), // chicken, rice, etc.

  // Structured ingredient data with flexible units
  ingredientsJson: jsonb("ingredients_json")
    .$type<{ name: string; amount: string; unit?: string }[]>()
    .notNull(),

  // Cooking instructions as plain text (newline-separated steps)
  instructionsText: text("instructions_text").notNull(),

  // Time and serving information
  prepTimeMinutes: integer("prep_time_minutes").notNull(),
  cookTimeMinutes: integer("cook_time_minutes").notNull(),
  servings: integer("servings").notNull(),

  // Nutritional data (precision 5, scale 2 allows up to 999.99g)
  caloriesKcal: integer("calories_kcal").notNull(),
  proteinGrams: decimal("protein_grams", { precision: 5, scale: 2 }).notNull(),
  carbsGrams: decimal("carbs_grams", { precision: 5, scale: 2 }).notNull(),
  fatGrams: decimal("fat_grams", { precision: 5, scale: 2 }).notNull(),

  // Optional fields
  imageUrl: varchar("image_url", { length: 500 }), // Generated or uploaded images
  sourceReference: varchar("source_reference", { length: 255 }), // Attribution for imported recipes

  // Tier system fields (Story 2.14)
  tierLevel: tierLevelEnum("tier_level").default("starter").notNull(), // Progressive access by tier
  isSeasonal: boolean("is_seasonal").default(false).notNull(), // Seasonal recipes (Professional+)
  allocatedMonth: varchar("allocated_month", { length: 7 }), // Monthly allocation tracking (YYYY-MM)

  // Metadata and workflow
  creationTimestamp: timestamp("creation_timestamp").defaultNow(),
  lastUpdatedTimestamp: timestamp("last_updated_timestamp").defaultNow(),
  isApproved: boolean("is_approved").default(false), // Content moderation flag
}, (table) => ({
  tierLevelIdx: index("idx_recipes_tier_level").on(table.tierLevel),
  tierApprovedIdx: index("idx_recipes_tier_approved").on(table.tierLevel, table.isApproved),
  seasonalIdx: index("idx_recipes_seasonal").on(table.isSeasonal),
  allocatedMonthIdx: index("idx_recipes_allocated_month").on(table.allocatedMonth),
}));

export const personalizedRecipes = pgTable("personalized_recipes", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  trainerId: uuid("trainer_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  recipeId: uuid("recipe_id")
    .references(() => recipes.id, { onDelete: "cascade" })
    .notNull(),
  assignedAt: timestamp("assigned_at").defaultNow(),
});

/**
 * Personalized Meal Plans Table
 *
 * Stores meal plan assignments from trainers to customers.
 * Unlike recipes, meal plans are stored with their complete structure
 * as JSONB to preserve the exact meal plan generated at assignment time.
 */
export const personalizedMealPlans = pgTable("personalized_meal_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  trainerId: uuid("trainer_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  mealPlanData: jsonb("meal_plan_data").$type<MealPlan>().notNull(),
  assignedAt: timestamp("assigned_at").defaultNow(),
});

/**
 * Trainer Meal Plans Table
 *
 * Stores all meal plans generated by trainers, whether assigned or not.
 * This allows trainers to save, manage, and reuse meal plans.
 */
export const trainerMealPlans = pgTable("trainer_meal_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  trainerId: uuid("trainer_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  mealPlanData: jsonb("meal_plan_data").$type<MealPlan>().notNull(),
  isTemplate: boolean("is_template").default(false), // Mark as reusable template
  tags: jsonb("tags").$type<string[]>().default([]), // For categorization
  notes: text("notes"), // Trainer's notes about the plan
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => ({
  trainerIdIdx: index("trainer_meal_plans_trainer_id_idx").on(table.trainerId),
}));

/**
 * Meal Plan Customer Assignments Table
 *
 * Tracks which saved meal plans have been assigned to which customers.
 * Allows reusing the same meal plan for multiple customers.
 */
export const mealPlanAssignments = pgTable("meal_plan_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  mealPlanId: uuid("meal_plan_id")
    .references(() => trainerMealPlans.id, { onDelete: "cascade" })
    .notNull(),
  customerId: uuid("customer_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  assignedBy: uuid("assigned_by")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  assignedAt: timestamp("assigned_at").defaultNow(),
  notes: text("notes"), // Assignment-specific notes
}, (table) => ({
  mealPlanIdx: index("meal_plan_assignments_meal_plan_id_idx").on(table.mealPlanId),
  customerIdx: index("meal_plan_assignments_customer_id_idx").on(table.customerId),
}));

/**
 * Recipe Validation Schemas
 *
 * These schemas provide runtime validation for recipe data coming from
 * API endpoints, ensuring data integrity and proper typing.
 */

// Schema for creating new recipes (excludes auto-generated fields)
export const insertRecipeSchema = createInsertSchema(recipes).omit({
  id: true,
  creationTimestamp: true,
  lastUpdatedTimestamp: true,
});

// Schema for updating existing recipes (all fields optional)
export const updateRecipeSchema = insertRecipeSchema.partial();

/**
 * Recipe Filter Schema
 *
 * Comprehensive filtering system for recipe search and meal plan generation.
 * Supports text search, categorical filters, nutritional ranges, and pagination.
 */
export const recipeFilterSchema = z.object({
  // Text-based search
  search: z.string().optional(), // Searches name and description

  // Categorical filters
  mealType: z.string().optional(), // Single meal type filter
  dietaryTag: z.string().optional(), // Single dietary restriction filter

  // Time-based filters
  maxPrepTime: z.number().optional(), // Maximum preparation time in minutes

  // Nutritional range filters
  maxCalories: z.number().optional(),
  minCalories: z.number().optional(),
  minProtein: z.number().optional(),
  maxProtein: z.number().optional(),
  minCarbs: z.number().optional(),
  maxCarbs: z.number().optional(),
  minFat: z.number().optional(),
  maxFat: z.number().optional(),

  // Ingredient-based filters
  includeIngredients: z.array(z.string()).optional(), // Must contain these ingredients
  excludeIngredients: z.array(z.string()).optional(), // Must not contain these ingredients

  // Story 2.14: Tier-based filtering (progressive access model)
  tierLevel: z.enum(['starter', 'professional', 'enterprise']).optional(), // Filter by max tier level

  // Pagination and admin controls
  page: z.number().default(1),
  limit: z.number().default(12),
  approved: z.boolean().optional(), // Filter by approval status (admin only)
});

// Type exports for use throughout the application
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type UpdateRecipe = z.infer<typeof updateRecipeSchema>;
export type Recipe = typeof recipes.$inferSelect;
export type RecipeFilter = z.infer<typeof recipeFilterSchema>;

/**
 * Meal Plan Generation Schema
 *
 * Defines the input parameters for generating personalized meal plans.
 * Supports both basic requirements (calories, duration) and advanced
 * filtering for specific dietary needs and preferences.
 *
 * Used by the AI-powered meal plan generator and natural language parser.
 */
export const mealPlanGenerationSchema = z.object({
  // Basic meal plan information
  planName: z.string().min(1, "Plan name is required"),
  fitnessGoal: z.string().min(1, "Fitness goal is required"), // weight_loss, muscle_gain, etc.
  description: z.string().optional(),

  // Core parameters
  dailyCalorieTarget: z.number().min(800).max(5001), // Reasonable calorie range
  days: z.number().min(1).max(30), // Plan duration (1-30 days)
  mealsPerDay: z.number().min(1).max(6).default(3), // Typically 3-6 meals

  // Optional client information
  clientName: z.string().optional(), // For personal trainers/nutritionists

  // NEW FEATURES
  maxIngredients: z.number().min(5).max(50).optional(), // Limit ingredient variety across the entire plan
  generateMealPrep: z.boolean().default(true), // Whether to generate meal prep instructions

  // Recipe filtering constraints (inherited from recipeFilterSchema)
  mealType: z.string().optional(),
  dietaryTag: z.string().optional(),
  maxPrepTime: z.number().optional(),
  maxCalories: z.number().optional(),
  minCalories: z.number().optional(),
  minProtein: z.number().optional(),
  maxProtein: z.number().optional(),
  minCarbs: z.number().optional(),
  maxCarbs: z.number().optional(),
  minFat: z.number().optional(),
  maxFat: z.number().optional(),
});

export type MealPlanGeneration = z.infer<typeof mealPlanGenerationSchema>;

/**
 * Meal Plan Output Schema
 *
 * Defines the structure of generated meal plans returned by the API.
 * Includes complete meal scheduling with recipe assignments and
 * metadata for tracking and personalization.
 *
 * Note: This schema represents the generated output, not stored data.
 * Meal plans are generated on-demand and not persisted to the database.
 */
export const mealPlanSchema = z.object({
  // Plan metadata
  id: z.string(), // Temporary ID for the session
  planName: z.string(),
  fitnessGoal: z.string(),
  description: z.string().optional(),
  dailyCalorieTarget: z.number(),
  clientName: z.string().optional(),

  // Plan structure
  days: z.number(),
  mealsPerDay: z.number(),
  generatedBy: z.string(), // User ID who generated the plan
  createdAt: z.date(),

  // NEW FEATURE: Start of week meal prep instructions
  startOfWeekMealPrep: z.object({
    totalPrepTime: z.number(), // Estimated total prep time in minutes
    shoppingList: z.array(
      z.object({
        ingredient: z.string(),
        totalAmount: z.string(),
        unit: z.string(),
        usedInRecipes: z.array(z.string()), // Recipe names that use this ingredient
      })
    ),
    prepInstructions: z.array(
      z.object({
        step: z.number(),
        instruction: z.string(),
        estimatedTime: z.number(), // Time in minutes
        ingredients: z.array(z.string()), // Ingredients involved in this step
      })
    ),
    storageInstructions: z.array(
      z.object({
        ingredient: z.string(),
        method: z.string(), // How to store (refrigerate, freeze, pantry, etc.)
        duration: z.string(), // How long it will last
      })
    ),
  }).optional(),

  // Meal schedule with assigned recipes
  meals: z.array(
    z.object({
      day: z.number(), // Day 1, 2, 3, etc.
      mealNumber: z.number(), // Meal 1, 2, 3 within the day
      mealType: z.string(), // breakfast, lunch, dinner, snack

      // Complete recipe data for meal plan display
      recipe: z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        caloriesKcal: z.number(),
        proteinGrams: z.string(), // Stored as string in database
        carbsGrams: z.string(),
        fatGrams: z.string(),
        prepTimeMinutes: z.number(),
        cookTimeMinutes: z.number().optional(),
        servings: z.number(),
        mealTypes: z.array(z.string()),
        dietaryTags: z.array(z.string()).optional(),
        mainIngredientTags: z.array(z.string()).optional(),
        ingredientsJson: z
          .array(
            z.object({
              name: z.string(),
              amount: z.string(),
              unit: z.string().optional(),
            }),
          )
          .optional(),
        instructionsText: z.string().optional(),
        imageUrl: z.string().optional(),
      }).optional(), // Made optional to support manual meals

      // Manual meal support (alternative to recipe)
      manual: z.string().optional(), // Raw text for manual meal entry
      manualNutrition: z.object({
        calories: z.number(),
        protein: z.number(),
        carbs: z.number(),
        fat: z.number(),
      }).optional(), // Optional nutrition data for manual meals

      // Ingredient details for manual meals
      ingredients: z.array(
        z.object({
          ingredient: z.string(),
          amount: z.string(),
          unit: z.string(),
        })
      ).optional(), // Parsed ingredient list with quantities
    }),
  ),
});

export type MealPlan = z.infer<typeof mealPlanSchema>;

// Type definitions for meal plan assignment operations
export type InsertPersonalizedMealPlan = typeof personalizedMealPlans.$inferInsert;
export type PersonalizedMealPlan = typeof personalizedMealPlans.$inferSelect;

// Frontend-specific type that combines database record with nested meal plan data
export type CustomerMealPlan = PersonalizedMealPlan & {
  // Add flattened access to commonly used meal plan properties
  planName?: string;
  fitnessGoal?: string;
  dailyCalorieTarget?: number;
  totalDays?: number;
  mealsPerDay?: number;
  isActive?: boolean;
  description?: string;
};

// Type definitions for trainer meal plans
export type InsertTrainerMealPlan = typeof trainerMealPlans.$inferInsert;
export type TrainerMealPlan = typeof trainerMealPlans.$inferSelect;

// Type definitions for meal plan assignments
export type InsertMealPlanAssignment = typeof mealPlanAssignments.$inferInsert;
export type MealPlanAssignment = typeof mealPlanAssignments.$inferSelect;

// Extended type for trainer meal plans with assignment info
export type TrainerMealPlanWithAssignments = TrainerMealPlan & {
  assignments?: Array<{
    customerId: string;
    customerEmail: string;
    assignedAt: Date;
  }>;
  assignmentCount?: number;
};

// Type definitions for customer invitation operations
export type InsertCustomerInvitation = typeof customerInvitations.$inferInsert;
export type CustomerInvitation = typeof customerInvitations.$inferSelect;

/**
 * Customer Invitation Schema
 *
 * Validation schema for creating customer invitations.
 * Used when trainers send invitations to customers.
 */
export const createInvitationSchema = z.object({
  customerEmail: z.string().email('Invalid email format'),
  message: z.string().max(500).optional(), // Optional personal message from trainer
});

/**
 * Accept Invitation Schema
 *
 * Validation schema for customers accepting invitations.
 * Used during customer registration with invitation token.
 */
export const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
});

export type CreateInvitation = z.infer<typeof createInvitationSchema>;
export type AcceptInvitation = z.infer<typeof acceptInvitationSchema>;

/**
 * Progress Measurements Table
 * 
 * Stores customer body measurements and weight tracking over time.
 * Allows customers to track their physical changes and progress.
 */
export const progressMeasurements = pgTable("progress_measurements", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  measurementDate: timestamp("measurement_date").notNull(),
  
  // Weight tracking
  weightKg: decimal("weight_kg", { precision: 5, scale: 2 }), // Up to 999.99 kg
  weightLbs: decimal("weight_lbs", { precision: 6, scale: 2 }), // Up to 9999.99 lbs
  
  // Body measurements in centimeters
  neckCm: decimal("neck_cm", { precision: 4, scale: 1 }),
  shouldersCm: decimal("shoulders_cm", { precision: 5, scale: 1 }),
  chestCm: decimal("chest_cm", { precision: 5, scale: 1 }),
  waistCm: decimal("waist_cm", { precision: 5, scale: 1 }),
  hipsCm: decimal("hips_cm", { precision: 5, scale: 1 }),
  bicepLeftCm: decimal("bicep_left_cm", { precision: 4, scale: 1 }),
  bicepRightCm: decimal("bicep_right_cm", { precision: 4, scale: 1 }),
  thighLeftCm: decimal("thigh_left_cm", { precision: 4, scale: 1 }),
  thighRightCm: decimal("thigh_right_cm", { precision: 4, scale: 1 }),
  calfLeftCm: decimal("calf_left_cm", { precision: 4, scale: 1 }),
  calfRightCm: decimal("calf_right_cm", { precision: 4, scale: 1 }),
  
  // Body composition
  bodyFatPercentage: decimal("body_fat_percentage", { precision: 4, scale: 1 }),
  muscleMassKg: decimal("muscle_mass_kg", { precision: 5, scale: 2 }),
  
  // Additional metrics
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  customerIdIdx: index("progress_measurements_customer_id_idx").on(table.customerId),
  measurementDateIdx: index("progress_measurements_date_idx").on(table.measurementDate),
}));

/**
 * Progress Photos Table
 * 
 * Stores progress photo metadata for visual tracking.
 * Actual images are stored in S3 or similar service.
 */
export const progressPhotos = pgTable("progress_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  photoDate: timestamp("photo_date").notNull(),
  photoUrl: text("photo_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  photoType: varchar("photo_type", { length: 50 }).notNull(), // front, side, back, other
  caption: text("caption"),
  isPrivate: boolean("is_private").default(true), // Customer privacy control
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  customerIdIdx: index("progress_photos_customer_id_idx").on(table.customerId),
  photoDateIdx: index("progress_photos_date_idx").on(table.photoDate),
}));

// GOALS FEATURE REMOVED - Commented out for future reference
/*
/**
 * Customer Goals Table
 * 
 * Stores fitness and health goals set by customers.
 * Supports various goal types with target dates and achievement tracking.
 */
/*
export const customerGoals = pgTable("customer_goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  goalType: varchar("goal_type", { length: 50 }).notNull(), // weight_loss, muscle_gain, body_fat, performance
  goalName: varchar("goal_name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Goal targets (flexible based on goal type)
  targetValue: decimal("target_value", { precision: 10, scale: 2 }),
  targetUnit: varchar("target_unit", { length: 20 }), // kg, lbs, %, reps, minutes, etc.
  currentValue: decimal("current_value", { precision: 10, scale: 2 }),
  startingValue: decimal("starting_value", { precision: 10, scale: 2 }),
  
  // Timeline
  startDate: timestamp("start_date").notNull(),
  targetDate: timestamp("target_date"),
  achievedDate: timestamp("achieved_date"),
  
  // Status tracking
  status: varchar("status", { length: 20 }).default("active"), // active, achieved, paused, abandoned
  progressPercentage: integer("progress_percentage").default(0),
  
  // Additional fields
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  customerIdIdx: index("customer_goals_customer_id_idx").on(table.customerId),
  statusIdx: index("customer_goals_status_idx").on(table.status),
}));
*/

/**
 * Goal Milestones Table
 * 
 * Tracks milestone achievements within larger goals.
 * Allows breaking down big goals into smaller, achievable steps.
 */
/*
export const goalMilestones = pgTable("goal_milestones", {
  id: uuid("id").primaryKey().defaultRandom(),
  goalId: uuid("goal_id")
    .references(() => customerGoals.id, { onDelete: "cascade" })
    .notNull(),
  milestoneName: varchar("milestone_name", { length: 255 }).notNull(),
  targetValue: decimal("target_value", { precision: 10, scale: 2 }).notNull(),
  achievedValue: decimal("achieved_value", { precision: 10, scale: 2 }),
  achievedDate: timestamp("achieved_date"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  goalIdIdx: index("goal_milestones_goal_id_idx").on(table.goalId),
}));
*/

// Type exports for progress tracking
export type InsertProgressMeasurement = typeof progressMeasurements.$inferInsert;
export type ProgressMeasurement = typeof progressMeasurements.$inferSelect;

export type InsertProgressPhoto = typeof progressPhotos.$inferInsert;
export type ProgressPhoto = typeof progressPhotos.$inferSelect;

// GOALS TYPES REMOVED - Stub exports to prevent import errors
export type InsertCustomerGoal = any;
export type CustomerGoal = any;
export type InsertGoalMilestone = any;
export type GoalMilestone = any;
// Stub table exports (will cause runtime errors if used)
export const customerGoals = {} as any;
export const goalMilestones = {} as any;

// Validation schemas for progress tracking
export const createMeasurementSchema = z.object({
  measurementDate: z.string().datetime(),
  weightKg: z.number().optional(),
  weightLbs: z.number().optional(),
  neckCm: z.number().optional(),
  shouldersCm: z.number().optional(),
  chestCm: z.number().optional(),
  waistCm: z.number().optional(),
  hipsCm: z.number().optional(),
  bicepLeftCm: z.number().optional(),
  bicepRightCm: z.number().optional(),
  thighLeftCm: z.number().optional(),
  thighRightCm: z.number().optional(),
  calfLeftCm: z.number().optional(),
  calfRightCm: z.number().optional(),
  bodyFatPercentage: z.number().optional(),
  muscleMassKg: z.number().optional(),
  notes: z.string().optional(),
});

// GOALS SCHEMA REMOVED - Stub export to prevent import errors
export const createGoalSchema = z.object({});

export const uploadProgressPhotoSchema = z.object({
  photoDate: z.string().datetime(),
  photoType: z.enum(['front', 'side', 'back', 'other']),
  caption: z.string().optional(),
  isPrivate: z.boolean().default(true),
});

export type CreateMeasurement = z.infer<typeof createMeasurementSchema>;
export type CreateGoal = z.infer<typeof createGoalSchema>;
export type UploadProgressPhoto = z.infer<typeof uploadProgressPhotoSchema>;

/**
 * Grocery Lists Table
 *
 * Stores grocery lists that are automatically generated from meal plans.
 * Each meal plan has exactly one grocery list that is created automatically.
 * When a meal plan is deleted, its grocery list is automatically deleted (CASCADE).
 */
export const groceryLists = pgTable("grocery_lists", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  mealPlanId: uuid("meal_plan_id")
    .references(() => personalizedMealPlans.id, { onDelete: "set null" }),
    // Optional - NULL for standalone lists, UUID for meal plan-linked lists
  name: varchar("name", { length: 255 }).notNull().default("My Grocery List"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  customerIdIdx: index("idx_grocery_lists_customer_id").on(table.customerId),
  customerUpdatedIdx: index("idx_grocery_lists_customer_updated").on(table.customerId, table.updatedAt),
  mealPlanIdIdx: index("idx_grocery_lists_meal_plan_id").on(table.mealPlanId),
}));

/**
 * Grocery List Items Table
 *
 * Individual items within grocery lists with categorization,
 * quantities, and shopping metadata.
 */
export const groceryListItems = pgTable("grocery_list_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  groceryListId: uuid("grocery_list_id")
    .references(() => groceryLists.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 50 }).notNull().default("produce"),
  quantity: integer("quantity").notNull().default(1),
  unit: varchar("unit", { length: 20 }).notNull().default("pcs"),
  isChecked: boolean("is_checked").default(false).notNull(),
  priority: varchar("priority", { length: 10 }).default("medium").notNull(),
  notes: text("notes"),
  estimatedPrice: decimal("estimated_price", { precision: 6, scale: 2 }),
  brand: varchar("brand", { length: 100 }),
  recipeId: uuid("recipe_id").references(() => recipes.id, { onDelete: "set null" }),
  recipeName: varchar("recipe_name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  listIdIdx: index("idx_grocery_list_items_list_id").on(table.groceryListId),
  listCategoryIdx: index("idx_grocery_list_items_list_category").on(table.groceryListId, table.category),
  listCheckedIdx: index("idx_grocery_list_items_list_checked").on(table.groceryListId, table.isChecked),
  recipeIdIdx: index("idx_grocery_list_items_recipe_id").on(table.recipeId),
}));

/**
 * Recipe Favorites Table
 * 
 * Stores individual recipe favorites for each user.
 * Allows users to quickly access their preferred recipes.
 */
export const recipeFavorites = pgTable("recipe_favorites", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  recipeId: uuid("recipe_id")
    .references(() => recipes.id, { onDelete: "cascade" })
    .notNull(),
  favoriteDate: timestamp("favorite_date").defaultNow(),
  notes: text("notes"), // Personal notes about why they like this recipe
}, (table) => ({
  userIdIdx: index("recipe_favorites_user_id_idx").on(table.userId),
  recipeIdIdx: index("recipe_favorites_recipe_id_idx").on(table.recipeId),
  // Ensure users can't favorite the same recipe twice
  uniqueFavorite: index("recipe_favorites_user_recipe_unique").on(table.userId, table.recipeId),
}));

/**
 * Recipe Collections Table
 * 
 * Stores user-created collections for organizing favorite recipes.
 * Similar to playlists for recipes (e.g., "Quick Breakfasts", "Post-Workout Meals").
 */
export const recipeCollections = pgTable("recipe_collections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  coverImageUrl: varchar("cover_image_url", { length: 500 }),
  isPublic: boolean("is_public").default(false), // Allow sharing collections
  tags: jsonb("tags").$type<string[]>().default([]), // For categorization
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("recipe_collections_user_id_idx").on(table.userId),
  publicIdx: index("recipe_collections_public_idx").on(table.isPublic),
}));

/**
 * Collection Recipes Table
 * 
 * Many-to-many relationship between collections and recipes.
 * Tracks recipes within each collection with ordering.
 */
export const collectionRecipes = pgTable("collection_recipes", {
  id: uuid("id").primaryKey().defaultRandom(),
  collectionId: uuid("collection_id")
    .references(() => recipeCollections.id, { onDelete: "cascade" })
    .notNull(),
  recipeId: uuid("recipe_id")
    .references(() => recipes.id, { onDelete: "cascade" })
    .notNull(),
  addedDate: timestamp("added_date").defaultNow(),
  orderIndex: integer("order_index").default(0), // For custom ordering within collection
  notes: text("notes"), // Collection-specific notes about the recipe
}, (table) => ({
  collectionIdIdx: index("collection_recipes_collection_id_idx").on(table.collectionId),
  recipeIdIdx: index("collection_recipes_recipe_id_idx").on(table.recipeId),
  // Ensure recipes aren't duplicated in the same collection
  uniqueCollectionRecipe: index("collection_recipes_unique").on(table.collectionId, table.recipeId),
}));

/**
 * Recipe Interactions Table
 * 
 * Tracks user interactions with recipes for analytics and recommendations.
 * Includes views, ratings, cooking attempts, etc.
 */
export const recipeInteractions = pgTable("recipe_interactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  recipeId: uuid("recipe_id")
    .references(() => recipes.id, { onDelete: "cascade" })
    .notNull(),
  interactionType: varchar("interaction_type", { length: 50 }).notNull(), // view, rate, cook, share
  interactionValue: integer("interaction_value"), // Rating value (1-5), or null for other types
  sessionId: varchar("session_id", { length: 255 }), // For tracking user sessions
  interactionDate: timestamp("interaction_date").defaultNow(),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}), // Additional interaction data
}, (table) => ({
  userIdIdx: index("recipe_interactions_user_id_idx").on(table.userId),
  recipeIdIdx: index("recipe_interactions_recipe_id_idx").on(table.recipeId),
  typeIdx: index("recipe_interactions_type_idx").on(table.interactionType),
  dateIdx: index("recipe_interactions_date_idx").on(table.interactionDate),
}));

/**
 * Recipe Recommendations Table
 * 
 * Stores AI-generated recipe recommendations for users.
 * Pre-computed for performance, refreshed periodically.
 */
export const recipeRecommendations = pgTable("recipe_recommendations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  recipeId: uuid("recipe_id")
    .references(() => recipes.id, { onDelete: "cascade" })
    .notNull(),
  recommendationType: varchar("recommendation_type", { length: 50 }).notNull(), // similar, trending, personalized, new
  score: decimal("score", { precision: 5, scale: 4 }).notNull(), // Recommendation strength (0.0000-1.0000)
  reason: text("reason"), // Why this recipe was recommended
  generatedAt: timestamp("generated_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(), // When to refresh this recommendation
}, (table) => ({
  userIdIdx: index("recipe_recommendations_user_id_idx").on(table.userId),
  typeIdx: index("recipe_recommendations_type_idx").on(table.recommendationType),
  scoreIdx: index("recipe_recommendations_score_idx").on(table.score),
  expiresIdx: index("recipe_recommendations_expires_idx").on(table.expiresAt),
}));

/**
 * User Activity Sessions Table
 * 
 * Tracks user browsing sessions for analytics and engagement insights.
 * Helps understand user behavior patterns.
 */
export const userActivitySessions = pgTable("user_activity_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  sessionId: varchar("session_id", { length: 255 }).notNull(),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  pagesViewed: integer("pages_viewed").default(0),
  recipesViewed: integer("recipes_viewed").default(0),
  favoritesAdded: integer("favorites_added").default(0),
  collectionsCreated: integer("collections_created").default(0),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 45 }), // IPv6 support
}, (table) => ({
  userIdIdx: index("user_activity_sessions_user_id_idx").on(table.userId),
  sessionIdIdx: index("user_activity_sessions_session_id_idx").on(table.sessionId),
  startTimeIdx: index("user_activity_sessions_start_time_idx").on(table.startTime),
}));

// Type exports for favorites and user engagement
export type InsertRecipeFavorite = typeof recipeFavorites.$inferInsert;
export type RecipeFavorite = typeof recipeFavorites.$inferSelect;

export type InsertRecipeCollection = typeof recipeCollections.$inferInsert;
export type RecipeCollection = typeof recipeCollections.$inferSelect;

export type InsertCollectionRecipe = typeof collectionRecipes.$inferInsert;
export type CollectionRecipe = typeof collectionRecipes.$inferSelect;

export type InsertRecipeInteraction = typeof recipeInteractions.$inferInsert;
export type RecipeInteraction = typeof recipeInteractions.$inferSelect;

export type InsertRecipeRecommendation = typeof recipeRecommendations.$inferInsert;
export type RecipeRecommendation = typeof recipeRecommendations.$inferSelect;

export type InsertUserActivitySession = typeof userActivitySessions.$inferInsert;
export type UserActivitySession = typeof userActivitySessions.$inferSelect;

// Extended types for frontend use
export type RecipeWithFavoriteStatus = Recipe & {
  isFavorited?: boolean;
  favoriteDate?: Date;
  favoriteCount?: number;
  userRating?: number;
  avgRating?: number;
  viewCount?: number;
  isRecommended?: boolean;
  recommendationReason?: string;
};

export type CollectionWithRecipeCount = RecipeCollection & {
  recipeCount?: number;
  recentRecipes?: Recipe[];
  isFollowing?: boolean;
};

export type RecipeEngagementStats = {
  recipeId: string;
  totalViews: number;
  totalFavorites: number;
  avgRating: number;
  totalRatings: number;
  recentViews: number; // Last 7 days
  trendingScore: number;
};

// Validation schemas for favorites and collections
export const createFavoriteSchema = z.object({
  recipeId: z.string().uuid(),
  notes: z.string().optional(),
});

export const createCollectionSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});

export const addToCollectionSchema = z.object({
  recipeId: z.string().uuid(),
  notes: z.string().optional(),
});

export const rateRecipeSchema = z.object({
  recipeId: z.string().uuid(),
  rating: z.number().min(1).max(5),
});

export const trackInteractionSchema = z.object({
  recipeId: z.string().uuid(),
  interactionType: z.enum(['view', 'rate', 'cook', 'share', 'search']),
  interactionValue: z.number().optional(),
  sessionId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type CreateFavorite = z.infer<typeof createFavoriteSchema>;
export type CreateCollection = z.infer<typeof createCollectionSchema>;
export type AddToCollection = z.infer<typeof addToCollectionSchema>;
export type RateRecipe = z.infer<typeof rateRecipeSchema>;
export type TrackInteraction = z.infer<typeof trackInteractionSchema>;

// Type exports for recipe ratings
export type InsertRecipeRating = typeof recipeRatings.$inferInsert;
export type RecipeRating = typeof recipeRatings.$inferSelect;

export type InsertRecipeRatingSummary = typeof recipeRatingSummary.$inferInsert;
export type RecipeRatingSummary = typeof recipeRatingSummary.$inferSelect;

export type InsertRatingHelpfulness = typeof ratingHelpfulness.$inferInsert;
export type RatingHelpfulness = typeof ratingHelpfulness.$inferSelect;

// Extended types for frontend use
export type RecipeRatingWithUser = RecipeRating & {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  helpfulnessStats: {
    helpfulCount: number;
    notHelpfulCount: number;
    userVote?: boolean; // Whether current user voted helpful/not helpful
  };
};

export type RecipeWithRatingData = Recipe & {
  ratingData?: RecipeRatingSummary;
  userRating?: RecipeRating;
  isFavorited?: boolean;
  favoriteCount?: number;
};

// Validation schemas for rating system
export const createRatingSchema = z.object({
  recipeId: z.string().uuid(),
  rating: z.number().min(1).max(5),
  reviewText: z.string().max(1000).optional(),
  cookingDifficulty: z.number().min(1).max(5).optional(),
  wouldCookAgain: z.boolean().optional(),
  isHelpful: z.boolean().optional(),
});

export const updateRatingSchema = createRatingSchema.partial().omit({ recipeId: true });

export const ratingFilterSchema = z.object({
  minRating: z.number().min(1).max(5).optional(),
  maxRating: z.number().min(1).max(5).optional(),
  hasReviews: z.boolean().optional(), // Only show recipes with text reviews
  sortBy: z.enum(['rating_desc', 'rating_asc', 'reviews_desc', 'recent']).optional(),
});

export const voteHelpfulnessSchema = z.object({
  ratingId: z.string().uuid(),
  isHelpful: z.boolean(),
});

export type CreateRating = z.infer<typeof createRatingSchema>;
export type UpdateRating = z.infer<typeof updateRatingSchema>;
export type RatingFilter = z.infer<typeof ratingFilterSchema>;
export type VoteHelpfulness = z.infer<typeof voteHelpfulnessSchema>;

/**
 * Recipe Ratings Table
 * 
 * Stores individual recipe ratings and reviews from users.
 * Each user can only rate a recipe once, but can update their rating.
 */
export const recipeRatings = pgTable("recipe_ratings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  recipeId: uuid("recipe_id")
    .references(() => recipes.id, { onDelete: "cascade" })
    .notNull(),
  rating: integer("rating").notNull(), // 1-5 stars
  reviewText: text("review_text"), // Optional review text
  isHelpful: boolean("is_helpful").default(false), // Whether the user found the recipe helpful
  cookingDifficulty: integer("cooking_difficulty"), // Optional 1-5 difficulty rating
  wouldCookAgain: boolean("would_cook_again"), // Would user cook this again?
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("recipe_ratings_user_id_idx").on(table.userId),
  recipeIdIdx: index("recipe_ratings_recipe_id_idx").on(table.recipeId),
  ratingIdx: index("recipe_ratings_rating_idx").on(table.rating),
  // Ensure users can only rate each recipe once
  uniqueUserRecipeRating: index("recipe_ratings_user_recipe_unique").on(table.userId, table.recipeId),
}));

/**
 * Recipe Rating Summary Table
 * 
 * Stores aggregated rating statistics for each recipe.
 * Updated whenever ratings change for performance optimization.
 */
export const recipeRatingSummary = pgTable("recipe_rating_summary", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipeId: uuid("recipe_id")
    .references(() => recipes.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).notNull(), // e.g., 4.25
  totalRatings: integer("total_ratings").default(0).notNull(),
  totalReviews: integer("total_reviews").default(0).notNull(), // Ratings with review text
  ratingDistribution: jsonb("rating_distribution")
    .$type<{ 1: number; 2: number; 3: number; 4: number; 5: number }>()
    .default({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }), // Count of each star rating
  helpfulCount: integer("helpful_count").default(0), // How many found it helpful
  wouldCookAgainCount: integer("would_cook_again_count").default(0),
  averageDifficulty: decimal("average_difficulty", { precision: 3, scale: 2 }), // Average cooking difficulty
  lastUpdated: timestamp("last_updated").defaultNow(),
}, (table) => ({
  recipeIdIdx: index("recipe_rating_summary_recipe_id_idx").on(table.recipeId),
  averageRatingIdx: index("recipe_rating_summary_avg_rating_idx").on(table.averageRating),
  totalRatingsIdx: index("recipe_rating_summary_total_ratings_idx").on(table.totalRatings),
}));

/**
 * Rating Helpfulness Table
 * 
 * Tracks which users found specific ratings/reviews helpful.
 * Enables community moderation of review quality.
 */
export const ratingHelpfulness = pgTable("rating_helpfulness", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  ratingId: uuid("rating_id")
    .references(() => recipeRatings.id, { onDelete: "cascade" })
    .notNull(),
  isHelpful: boolean("is_helpful").notNull(), // true = helpful, false = not helpful
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("rating_helpfulness_user_id_idx").on(table.userId),
  ratingIdIdx: index("rating_helpfulness_rating_id_idx").on(table.ratingId),
  // Ensure users can only vote once per rating
  uniqueUserRatingVote: index("rating_helpfulness_user_rating_unique").on(table.userId, table.ratingId),
}));

/**
 * Shared Meal Plans Table
 * 
 * Stores shareable links for meal plans that allow public access without authentication.
 * Trainers can generate shareable links for their meal plans that clients can view.
 */
export const sharedMealPlans = pgTable("shared_meal_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  mealPlanId: uuid("meal_plan_id")
    .references(() => trainerMealPlans.id, { onDelete: "cascade" })
    .notNull(),
  shareToken: uuid("share_token").defaultRandom().notNull().unique(),
  expiresAt: timestamp("expires_at"), // Optional expiration
  createdBy: uuid("created_by")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  viewCount: integer("view_count").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  mealPlanIdIdx: index("shared_meal_plans_meal_plan_id_idx").on(table.mealPlanId),
  shareTokenIdx: index("shared_meal_plans_share_token_idx").on(table.shareToken),
  createdByIdx: index("shared_meal_plans_created_by_idx").on(table.createdBy),
  expiresAtIdx: index("shared_meal_plans_expires_at_idx").on(table.expiresAt),
  isActiveIdx: index("shared_meal_plans_is_active_idx").on(table.isActive),
  // Ensure only one active share per meal plan (partial index would be handled at DB level)
  oneActivePerPlan: index("shared_meal_plans_one_active_per_plan").on(table.mealPlanId),
}));

// Type exports for shared meal plans
export type InsertSharedMealPlan = typeof sharedMealPlans.$inferInsert;
export type SharedMealPlan = typeof sharedMealPlans.$inferSelect;

// Extended type for shared meal plans with meal plan data
export type SharedMealPlanWithData = SharedMealPlan & {
  mealPlan: TrainerMealPlan;
  createdByUser: {
    id: string;
    name: string | null;
    email: string;
  };
};

// Validation schemas for meal plan sharing
export const createShareSchema = z.object({
  mealPlanId: z.string().uuid(),
  expiresAt: z.string().datetime().optional(), // ISO datetime string
});

export const updateShareSchema = z.object({
  expiresAt: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});

export type CreateShare = z.infer<typeof createShareSchema>;
export type UpdateShare = z.infer<typeof updateShareSchema>;

// Email preferences type exports
export type InsertEmailPreferences = typeof emailPreferences.$inferInsert;
export type EmailPreferences = typeof emailPreferences.$inferSelect;

export type InsertEmailSendLog = typeof emailSendLog.$inferInsert;
export type EmailSendLog = typeof emailSendLog.$inferSelect;

// Email preferences validation schemas
export const emailPreferencesSchema = z.object({
  weeklyProgressSummaries: z.boolean().default(true),
  mealPlanUpdates: z.boolean().default(true),
  recipeRecommendations: z.boolean().default(true),
  systemNotifications: z.boolean().default(true),
  marketingEmails: z.boolean().default(false),
  frequency: z.enum(['daily', 'weekly', 'monthly']).default('weekly'),
});

export const updateEmailPreferencesSchema = emailPreferencesSchema.partial();

export type EmailPreferencesInput = z.infer<typeof emailPreferencesSchema>;
export type UpdateEmailPreferencesInput = z.infer<typeof updateEmailPreferencesSchema>;

// Type exports for grocery lists
export type InsertGroceryList = typeof groceryLists.$inferInsert;
export type GroceryList = typeof groceryLists.$inferSelect;

export type InsertGroceryListItem = typeof groceryListItems.$inferInsert;
export type GroceryListItem = typeof groceryListItems.$inferSelect;

// Extended type for grocery list with items
export type GroceryListWithItems = GroceryList & {
  items: GroceryListItem[];
};

// Validation schemas for grocery lists
export const groceryListSchema = z.object({
  name: z.string().min(1, "List name is required").max(255),
});

export const updateGroceryListSchema = groceryListSchema.partial();

export const groceryListItemSchema = z.object({
  name: z.string().min(1, "Item name is required").max(255),
  category: z.enum(['produce', 'meat', 'dairy', 'pantry', 'beverages', 'snacks', 'other']).default('produce'),
  quantity: z.number().int().min(1).default(1),
  unit: z.string().max(20).default('pcs'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  notes: z.string().optional(),
  estimatedPrice: z.number().positive().optional(),
  brand: z.string().max(100).optional(),
  recipeId: z.string().uuid().optional(),
  recipeName: z.string().max(255).optional(),
});

export const updateGroceryListItemSchema = groceryListItemSchema.partial().extend({
  isChecked: z.boolean().optional(),
});

// Validation schema for generating grocery list from meal plan
export const generateGroceryListFromMealPlanSchema = z.object({
  mealPlanId: z.string().uuid("Invalid meal plan ID format"),
  listName: z.string().min(1, "List name is required").max(255).optional().default("Meal Plan Grocery List"),
  includeAllIngredients: z.boolean().default(true),
  aggregateQuantities: z.boolean().default(true),
  roundUpQuantities: z.boolean().default(true),
});

export type GroceryListInput = z.infer<typeof groceryListSchema>;
export type UpdateGroceryListInput = z.infer<typeof updateGroceryListSchema>;
export type GroceryListItemInput = z.infer<typeof groceryListItemSchema>;
export type UpdateGroceryListItemInput = z.infer<typeof updateGroceryListItemSchema>;
export type GenerateGroceryListFromMealPlanInput = z.infer<typeof generateGroceryListFromMealPlanSchema>;

/**
 * ========================================
 * RECIPE TIER SYSTEM TABLES (Story 2.14)
 * ========================================
 */

/**
 * Recipe Tier Access Table
 *
 * Tracks monthly recipe allocations to each tier.
 * Used for implementing the +25/+50/+100 monthly recipe additions.
 */
export const recipeTierAccess = pgTable("recipe_tier_access", {
  id: uuid("id").primaryKey().defaultRandom(),
  tier: tierLevelEnum("tier").notNull(),
  allocationMonth: varchar("allocation_month", { length: 7 }).notNull(), // Format: 'YYYY-MM'
  recipeCount: integer("recipe_count").default(0).notNull(),
  allocationDate: timestamp("allocation_date").defaultNow().notNull(),
}, (table) => ({
  tierIdx: index("idx_recipe_tier_access_tier").on(table.tier),
  monthIdx: index("idx_recipe_tier_access_month").on(table.allocationMonth),
  tierMonthIdx: index("idx_recipe_tier_access_tier_month").on(table.tier, table.allocationMonth),
  // Ensure one record per tier per month
  uniqueTierMonth: index("recipe_tier_access_tier_month_unique").on(table.tier, table.allocationMonth),
}));

/**
 * Recipe Type Categories Table
 *
 * Defines meal types available to each tier (5/10/17 types).
 * Maps meal type names to minimum tier level required.
 */
export const recipeTypeCategories = pgTable("recipe_type_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).unique().notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  tierLevel: tierLevelEnum("tier_level").notNull(),
  isSeasonal: boolean("is_seasonal").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  tierIdx: index("idx_recipe_type_categories_tier").on(table.tierLevel),
  seasonalIdx: index("idx_recipe_type_categories_seasonal").on(table.isSeasonal),
}));

// Type exports for tier system tables
export type InsertRecipeTierAccess = typeof recipeTierAccess.$inferInsert;
export type RecipeTierAccess = typeof recipeTierAccess.$inferSelect;

export type InsertRecipeTypeCategory = typeof recipeTypeCategories.$inferInsert;
export type RecipeTypeCategory = typeof recipeTypeCategories.$inferSelect;

/**
 * ========================================
 * 3-TIER SUBSCRIPTION SYSTEM SCHEMA
 * ========================================
 *
 * Monthly Stripe Subscriptions for trainer tiers + separate AI add-on subscriptions.
 * Canonical Source: docs/TIER_SOURCE_OF_TRUTH.md v2.0
 */

// Subscription status enum
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "unpaid",
  "canceled",
]);

// Subscription item kind enum
export const subscriptionItemKindEnum = pgEnum("subscription_item_kind", [
  "tier",
  "ai",
]);

// Payment event type enum
export const paymentEventTypeEnum = pgEnum("payment_event_type", [
  "purchase",
  "upgrade",
  "downgrade",
  "refund",
  "chargeback",
  "failed",
]);

// Payment status enum
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "completed",
  "failed",
  "refunded",
]);

// Webhook event status enum
export const webhookEventStatusEnum = pgEnum("webhook_event_status", [
  "pending",
  "processed",
  "failed",
]);

/**
 * Trainer Subscriptions Table
 *
 * Primary subscription record for each trainer.
 * Stores Stripe subscription details and current tier status.
 */
export const trainerSubscriptions = pgTable("trainer_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  trainerId: uuid("trainer_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }).notNull(),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }).notNull(),
  tier: tierLevelEnum("tier").notNull(),
  status: subscriptionStatusEnum("status").default("trialing").notNull(),
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
  trialEnd: timestamp("trial_end"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  trainerIdIdx: index("idx_trainer_subscriptions_trainer_id").on(table.trainerId),
  trainerPeriodIdx: index("idx_trainer_subscriptions_trainer_period").on(table.trainerId, table.currentPeriodEnd),
  statusIdx: index("idx_trainer_subscriptions_status").on(table.status),
}));

/**
 * Subscription Items Table
 *
 * Tracks tier and AI subscriptions as separate items.
 * Allows independent management of tier vs AI add-on.
 */
export const subscriptionItems = pgTable("subscription_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  subscriptionId: uuid("subscription_id")
    .references(() => trainerSubscriptions.id, { onDelete: "cascade" })
    .notNull(),
  kind: subscriptionItemKindEnum("kind").notNull(),
  stripePriceId: varchar("stripe_price_id", { length: 255 }).notNull(),
  stripeSubscriptionItemId: varchar("stripe_subscription_item_id", { length: 255 }).notNull(),
  status: subscriptionStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  subscriptionIdIdx: index("idx_subscription_items_subscription_id").on(table.subscriptionId),
  kindIdx: index("idx_subscription_items_kind").on(table.kind),
}));

/**
 * Tier Usage Tracking Table
 *
 * Usage counters per billing period for quota enforcement.
 */
export const tierUsageTracking = pgTable("tier_usage_tracking", {
  id: uuid("id").primaryKey().defaultRandom(),
  trainerId: uuid("trainer_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  customersCount: integer("customers_count").default(0).notNull(),
  mealPlansCount: integer("meal_plans_count").default(0).notNull(),
  aiGenerationsCount: integer("ai_generations_count").default(0).notNull(),
  exportsCsvCount: integer("exports_csv_count").default(0).notNull(),
  exportsExcelCount: integer("exports_excel_count").default(0).notNull(),
  exportsPdfCount: integer("exports_pdf_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  trainerIdIdx: index("idx_tier_usage_tracking_trainer_id").on(table.trainerId),
  trainerPeriodIdx: index("idx_tier_usage_tracking_trainer_period").on(table.trainerId, table.periodStart, table.periodEnd),
  periodEndIdx: index("idx_tier_usage_tracking_period_end").on(table.trainerId, table.periodEnd),
}));

/**
 * Payment Logs Table
 *
 * Immutable audit trail for all payment events.
 */
export const paymentLogs = pgTable("payment_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  trainerId: uuid("trainer_id")
    .references(() => users.id, { onDelete: "set null" }),
  eventType: paymentEventTypeEnum("event_type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("usd").notNull(),
  stripeInvoiceId: varchar("stripe_invoice_id", { length: 255 }),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  stripeChargeId: varchar("stripe_charge_id", { length: 255 }),
  status: paymentStatusEnum("status").notNull(),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  occurredAt: timestamp("occurred_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  trainerIdIdx: index("idx_payment_logs_trainer_id").on(table.trainerId),
  occurredAtIdx: index("idx_payment_logs_occurred_at").on(table.trainerId, table.occurredAt),
  invoiceIdIdx: index("idx_payment_logs_invoice_id").on(table.stripeInvoiceId),
}));

/**
 * Webhook Events Table
 *
 * Idempotent webhook processing store.
 * Prevents duplicate processing of Stripe webhook events.
 */
export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: varchar("event_id", { length: 255 }).unique().notNull(), // Stripe event ID
  eventType: varchar("event_type", { length: 100 }).notNull(),
  processedAt: timestamp("processed_at"),
  status: webhookEventStatusEnum("status").default("pending").notNull(),
  retryCount: integer("retry_count").default(0).notNull(),
  errorMessage: text("error_message"),
  payloadMetadata: jsonb("payload_metadata").$type<Record<string, any>>().default({}), // No PII
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  eventIdIdx: index("idx_webhook_events_event_id").on(table.eventId),
  statusCreatedIdx: index("idx_webhook_events_status_created").on(table.status, table.createdAt),
}));

// Type exports for subscription system
export type InsertTrainerSubscription = typeof trainerSubscriptions.$inferInsert;
export type TrainerSubscription = typeof trainerSubscriptions.$inferSelect;

export type InsertSubscriptionItem = typeof subscriptionItems.$inferInsert;
export type SubscriptionItem = typeof subscriptionItems.$inferSelect;

export type InsertTierUsageTracking = typeof tierUsageTracking.$inferInsert;
export type TierUsageTracking = typeof tierUsageTracking.$inferSelect;

export type InsertPaymentLog = typeof paymentLogs.$inferInsert;
export type PaymentLog = typeof paymentLogs.$inferSelect;

export type InsertWebhookEvent = typeof webhookEvents.$inferInsert;
export type WebhookEvent = typeof webhookEvents.$inferSelect;

// Extended types for frontend use
export type TrainerSubscriptionWithUsage = TrainerSubscription & {
  usage?: TierUsageTracking;
  items?: SubscriptionItem[];
};

export type TierEntitlements = {
  tier: "starter" | "professional" | "enterprise";
  status: "trialing" | "active" | "past_due" | "unpaid" | "canceled";
  features: {
    analytics: boolean;
    apiAccess: boolean;
    bulkOperations: boolean;
    customBranding: boolean;
    exportFormats: ("pdf" | "csv" | "excel")[];
  };
  limits: {
    customers: { max: number; used: number; percentage: number };
    mealPlans: { max: number; used: number; percentage: number };
  };
  ai?: {
    plan: "starter" | "professional" | "enterprise";
    generationsRemaining: number;
    resetDate: string;
  };
  billing: {
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  };
};

// Validation schemas for subscription system
export const createSubscriptionSchema = z.object({
  tier: z.enum(["starter", "professional", "enterprise"]),
});

export const upgradeSubscriptionSchema = z.object({
  tier: z.enum(["professional", "enterprise"]),
});

export const subscribeAiSchema = z.object({
  plan: z.enum(["starter", "professional", "enterprise"]),
});

export type CreateSubscription = z.infer<typeof createSubscriptionSchema>;
export type UpgradeSubscription = z.infer<typeof upgradeSubscriptionSchema>;
export type SubscribeAi = z.infer<typeof subscribeAiSchema>;

