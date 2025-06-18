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
import { relations } from "drizzle-orm";
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

// User roles enum
export const userRoles = ["admin", "trainer", "client"] as const;
export type UserRole = typeof userRoles[number];

// User storage table for Replit Auth with role-based access
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { enum: userRoles }).notNull().default("client"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Fitness trainers table for additional trainer-specific data
export const trainers = pgTable("trainers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  businessName: varchar("business_name"),
  certifications: jsonb("certifications").$type<string[]>().default([]),
  specializations: jsonb("specializations").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

// Clients table for client-specific data
export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  trainerId: uuid("trainer_id").references(() => trainers.id, { onDelete: "set null" }),
  fitnessGoals: jsonb("fitness_goals").$type<string[]>().default([]),
  dietaryRestrictions: jsonb("dietary_restrictions").$type<string[]>().default([]),
  currentWeight: decimal("current_weight", { precision: 5, scale: 2 }),
  targetWeight: decimal("target_weight", { precision: 5, scale: 2 }),
  activityLevel: varchar("activity_level"), // sedentary, lightly_active, moderately_active, very_active, extremely_active
  createdAt: timestamp("created_at").defaultNow(),
});

// Meal plans table to store generated meal plans
export const mealPlans = pgTable("meal_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  planName: varchar("plan_name", { length: 255 }).notNull(),
  fitnessGoal: varchar("fitness_goal", { length: 255 }).notNull(),
  description: text("description"),
  dailyCalorieTarget: integer("daily_calorie_target").notNull(),
  days: integer("days").notNull(),
  mealsPerDay: integer("meals_per_day").notNull(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),
  trainerId: uuid("trainer_id").references(() => trainers.id, { onDelete: "cascade" }),
  generatedBy: varchar("generated_by").notNull(), // User ID
  isActive: boolean("is_active").default(true),
  mealsData: jsonb("meals_data").$type<any[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  trainer: one(trainers, {
    fields: [users.id],
    references: [trainers.userId],
  }),
  client: one(clients, {
    fields: [users.id],
    references: [clients.userId],
  }),
}));

export const trainersRelations = relations(trainers, ({ one, many }) => ({
  user: one(users, {
    fields: [trainers.userId],
    references: [users.id],
  }),
  clients: many(clients),
  mealPlans: many(mealPlans),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, {
    fields: [clients.userId],
    references: [users.id],
  }),
  trainer: one(trainers, {
    fields: [clients.trainerId],
    references: [trainers.id],
  }),
  mealPlans: many(mealPlans),
}));

export const mealPlansRelations = relations(mealPlans, ({ one }) => ({
  client: one(clients, {
    fields: [mealPlans.clientId],
    references: [clients.id],
  }),
  trainer: one(trainers, {
    fields: [mealPlans.trainerId],
    references: [trainers.id],
  }),
}));

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertTrainer = typeof trainers.$inferInsert;
export type Trainer = typeof trainers.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type InsertMealPlan = typeof mealPlans.$inferInsert;
export type StoredMealPlan = typeof mealPlans.$inferSelect;

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

// Meal Plan Schema for API responses (includes meals array)
export const mealPlanSchema = z.object({
  id: z.string(),
  planName: z.string(),
  fitnessGoal: z.string(),
  description: z.string().optional(),
  dailyCalorieTarget: z.number(),
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
