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
  password: text("password").notNull(),
  role: userRoleEnum("role").default("customer").notNull(),
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
