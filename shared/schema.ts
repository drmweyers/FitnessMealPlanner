/**
 * FitMeal Pro Database Schema
 * 
 * This file defines the complete database schema for the FitMeal Pro application
 * using Drizzle ORM with PostgreSQL. It includes tables for user management,
 * recipe storage, and validation schemas for API endpoints.
 * 
 * Key Components:
 * - Authentication tables (sessions, users)
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
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Sessions Table
 * 
 * Stores user session data for Replit authentication.
 * This table is managed by express-session with connect-pg-simple.
 * 
 * Fields:
 * - sid: Session identifier (primary key)
 * - sess: Session data stored as JSONB
 * - expire: Session expiration timestamp
 */
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [
    // Index on expire for efficient session cleanup
    index("IDX_session_expire").on(table.expire)
  ],
);

/**
 * Users Table
 * 
 * Stores user profile information from Replit authentication.
 * User data is automatically synced from Replit's OIDC provider.
 * 
 * Fields:
 * - id: Unique user identifier from Replit
 * - email: User's email address (unique constraint)
 * - firstName/lastName: User's display name components
 * - profileImageUrl: Avatar URL from Replit
 * - role: User role for authorization (admin, trainer, client)
 * - createdAt/updatedAt: Automatic timestamps
 */
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { length: 16 }).$type<"admin" | "trainer" | "client">().default("client").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Type definitions for user operations
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

/**
 * Trainer-Client Relationship Table
 * 
 * Maps trainers to their assigned clients for meal plan management.
 * Supports many-to-many relationships (trainers can have multiple clients,
 * clients can work with multiple trainers).
 */
export const trainerClients = pgTable("trainer_clients", {
  trainerId: varchar("trainer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").defaultNow(),
}, (table) => ({
  // Composite primary key to prevent duplicate assignments
  pk: { primaryKey: [table.trainerId, table.clientId] },
}));

export type TrainerClient = typeof trainerClients.$inferSelect;
export type InsertTrainerClient = typeof trainerClients.$inferInsert;

/**
 * Meal Plans Table
 * 
 * Stores generated meal plans with assignment information.
 * Meal plans are persistent records that can be shared between
 * trainers and clients, with full audit trail.
 */
export const mealPlans = pgTable("meal_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Meal plan data stored as JSONB for flexibility
  data: jsonb("data").$type<MealPlan>().notNull(),
  
  // Assignment and ownership
  assignedTo: varchar("assigned_to").notNull().references(() => users.id, { onDelete: "cascade" }),
  assignedBy: varchar("assigned_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Index for efficient queries by assignee
  index("IDX_meal_plans_assigned_to").on(table.assignedTo),
  // Index for efficient queries by creator
  index("IDX_meal_plans_assigned_by").on(table.assignedBy),
]);

export type StoredMealPlan = typeof mealPlans.$inferSelect;
export type InsertMealPlan = typeof mealPlans.$inferInsert;

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
  mainIngredientTags: jsonb("main_ingredient_tags").$type<string[]>().default([]), // chicken, rice, etc.
  
  // Structured ingredient data with flexible units
  ingredientsJson: jsonb("ingredients_json").$type<{ name: string; amount: string; unit?: string }[]>().notNull(),
  
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
  dailyCalorieTarget: z.number().min(800).max(5000), // Reasonable calorie range
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
  meals: z.array(z.object({
    day: z.number(), // Day 1, 2, 3, etc.
    mealNumber: z.number(), // Meal 1, 2, 3 within the day
    mealType: z.string(), // breakfast, lunch, dinner, snack
    
    // Simplified recipe data for meal plan display
    recipe: z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      caloriesKcal: z.number(),
      proteinGrams: z.string(), // Stored as string in database
      carbsGrams: z.string(),
      fatGrams: z.string(),
      prepTimeMinutes: z.number(),
      servings: z.number(),
      mealTypes: z.array(z.string()),
      imageUrl: z.string().optional(),
    }),
  })),
});

export type MealPlan = z.infer<typeof mealPlanSchema>;
