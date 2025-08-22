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

  // Metadata and workflow
  creationTimestamp: timestamp("creation_timestamp").defaultNow(),
  lastUpdatedTimestamp: timestamp("last_updated_timestamp").defaultNow(),
  isApproved: boolean("is_approved").default(false), // Content moderation flag
});

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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
      }),
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

/**
 * Customer Goals Table
 * 
 * Stores fitness and health goals set by customers.
 * Supports various goal types with target dates and achievement tracking.
 */
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

/**
 * Goal Milestones Table
 * 
 * Tracks milestone achievements within larger goals.
 * Allows breaking down big goals into smaller, achievable steps.
 */
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

// Type exports for progress tracking
export type InsertProgressMeasurement = typeof progressMeasurements.$inferInsert;
export type ProgressMeasurement = typeof progressMeasurements.$inferSelect;

export type InsertProgressPhoto = typeof progressPhotos.$inferInsert;
export type ProgressPhoto = typeof progressPhotos.$inferSelect;

export type InsertCustomerGoal = typeof customerGoals.$inferInsert;
export type CustomerGoal = typeof customerGoals.$inferSelect;

export type InsertGoalMilestone = typeof goalMilestones.$inferInsert;
export type GoalMilestone = typeof goalMilestones.$inferSelect;

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

export const createGoalSchema = z.object({
  goalType: z.enum(['weight_loss', 'weight_gain', 'muscle_gain', 'body_fat', 'performance', 'other']),
  goalName: z.string().min(1).max(255),
  description: z.string().optional(),
  targetValue: z.number(),
  targetUnit: z.string(),
  currentValue: z.number().optional(),
  startingValue: z.number().optional(),
  startDate: z.string().datetime(),
  targetDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

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

