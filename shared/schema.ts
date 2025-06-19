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

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Recipes table
export const recipes = pgTable("recipes", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  mealTypes: jsonb("meal_types").$type<string[]>().default([]),
  dietaryTags: jsonb("dietary_tags").$type<string[]>().default([]),
  mainIngredientTags: jsonb("main_ingredient_tags").$type<string[]>().default([]),
  ingredientsJson: jsonb("ingredients_json").$type<{ name: string; amount: string; unit?: string }[]>().notNull(),
  instructionsText: text("instructions_text").notNull(),
  prepTimeMinutes: integer("prep_time_minutes").notNull(),
  cookTimeMinutes: integer("cook_time_minutes").notNull(),
  servings: integer("servings").notNull(),
  caloriesKcal: integer("calories_kcal").notNull(),
  proteinGrams: decimal("protein_grams", { precision: 5, scale: 2 }).notNull(),
  carbsGrams: decimal("carbs_grams", { precision: 5, scale: 2 }).notNull(),
  fatGrams: decimal("fat_grams", { precision: 5, scale: 2 }).notNull(),
  imageUrl: varchar("image_url", { length: 500 }),
  sourceReference: varchar("source_reference", { length: 255 }),
  creationTimestamp: timestamp("creation_timestamp").defaultNow(),
  lastUpdatedTimestamp: timestamp("last_updated_timestamp").defaultNow(),
  isApproved: boolean("is_approved").default(false),
});

export const insertRecipeSchema = createInsertSchema(recipes).omit({
  id: true,
  creationTimestamp: true,
  lastUpdatedTimestamp: true,
});

export const updateRecipeSchema = insertRecipeSchema.partial();

export const recipeFilterSchema = z.object({
  search: z.string().optional(),
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
  includeIngredients: z.array(z.string()).optional(),
  excludeIngredients: z.array(z.string()).optional(),
  page: z.number().default(1),
  limit: z.number().default(12),
  approved: z.boolean().optional(),
});

export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type UpdateRecipe = z.infer<typeof updateRecipeSchema>;
export type Recipe = typeof recipes.$inferSelect;
export type RecipeFilter = z.infer<typeof recipeFilterSchema>;

// Meal Plan Generation Schema
export const mealPlanGenerationSchema = z.object({
  planName: z.string().min(1, "Plan name is required"),
  fitnessGoal: z.string().min(1, "Fitness goal is required"),
  description: z.string().optional(),
  dailyCalorieTarget: z.number().min(800).max(5000),
  days: z.number().min(1).max(30),
  mealsPerDay: z.number().min(1).max(6).default(3),
  clientName: z.string().optional(),
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

// Meal Plan Schema
export const mealPlanSchema = z.object({
  id: z.string(),
  planName: z.string(),
  fitnessGoal: z.string(),
  description: z.string().optional(),
  dailyCalorieTarget: z.number(),
  clientName: z.string().optional(),
  days: z.number(),
  mealsPerDay: z.number(),
  generatedBy: z.string(), // User ID
  createdAt: z.date(),
  meals: z.array(z.object({
    day: z.number(),
    mealNumber: z.number(),
    mealType: z.string(),
    recipe: z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      caloriesKcal: z.number(),
      proteinGrams: z.string(),
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
